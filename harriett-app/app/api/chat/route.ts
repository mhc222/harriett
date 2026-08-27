import { tasks } from "@trigger.dev/sdk";
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  toUIMessageStream,
  type UIMessage,
} from "ai";
import { z } from "zod";
import { routeConversationMessage } from "@/lib/ai/conversation-router";
import { processingAcknowledgement } from "@/lib/ai/message-format";
import { startAgentTurnStream } from "@/lib/ai/runtime";
import { writeAudit } from "@/lib/audit";
import { authenticatedContext } from "@/lib/auth-context";
import { createUserClient } from "@/lib/db/server";
import {
  recordConversationEvent,
  startConversationTrace,
  updateConversationTrace,
} from "@/lib/conversation-trace";
import type { processAgentMemory } from "@/trigger/process-agent-memory";
import type { processAgentPwa } from "@/trigger/process-agent-pwa";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const RequestSchema = z.object({
  messages: z.array(z.object({
    id: z.string(),
    role: z.enum(["user", "assistant", "system"]),
    parts: z.array(z.unknown()),
  })).min(1),
});

const FastTurnResultSchema = z.object({
  response: z.string().min(1),
  outbound_message_id: z.string().uuid(),
  turn_id: z.string().uuid(),
  created_at: z.string(),
});

export async function GET() {
  const db = await createUserClient();
  const auth = await authenticatedContext(db);
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await db
    .from("messages")
    .select("id, direction, channel, body, created_at")
    .eq("office_id", auth.officeId)
    .eq("agent_id", auth.agentId)
    .in("channel", ["sms", "whatsapp", "pwa"])
    .order("created_at", { ascending: true })
    .limit(120);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({
    messages: (data ?? []).map((message) => ({
      id: message.id,
      role: message.direction === "inbound" ? "user" : "assistant",
      parts: [{ type: "text", text: message.body }],
      metadata: { createdAt: message.created_at, channel: message.channel },
    })),
  });
}

function textFromMessage(message: z.infer<typeof RequestSchema>["messages"][number]): string {
  return message.parts
    .flatMap((part) => {
      if (!part || typeof part !== "object") return [];
      const record = part as Record<string, unknown>;
      return record.type === "text" && typeof record.text === "string" ? [record.text] : [];
    })
    .join("\n")
    .trim();
}

function textStreamResponse(originalMessages: UIMessage[], response: string) {
  const stream = createUIMessageStream({
    originalMessages,
    execute: ({ writer }) => {
      const textId = crypto.randomUUID();
      writer.write({ type: "text-start", id: textId });
      writer.write({ type: "text-delta", id: textId, delta: response });
      writer.write({ type: "text-end", id: textId });
    },
  });
  return createUIMessageStreamResponse({ stream });
}

export async function POST(request: Request) {
  const db = await createUserClient();
  const auth = await authenticatedContext(db);
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = RequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Invalid chat request" }, { status: 400 });
  }
  const latest = parsed.data.messages.at(-1)!;
  if (latest.role !== "user") {
    return Response.json({ error: "The latest message must be from the agent" }, { status: 400 });
  }
  const body = textFromMessage(latest);
  if (!body || body.length > 20_000) {
    return Response.json({ error: "Enter a message between 1 and 20,000 characters" }, { status: 400 });
  }

  const { data: existingThread, error: threadError } = await db
    .from("threads")
    .select("id")
    .eq("office_id", auth.officeId)
    .eq("agent_id", auth.agentId)
    .eq("channel", "pwa")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (threadError) return Response.json({ error: threadError.message }, { status: 500 });
  let thread = existingThread;
  if (!thread) {
    const created = await db.from("threads").insert({
      office_id: auth.officeId,
      agent_id: auth.agentId,
      channel: "pwa",
      subject: "Harriett chat",
    }).select("id").single();
    if (created.error || !created.data) {
      return Response.json({ error: created.error?.message ?? "Could not start chat" }, { status: 500 });
    }
    thread = created.data;
  }

  const { data: inbound, error: inboundError } = await db.from("messages").insert({
    office_id: auth.officeId,
    thread_id: thread.id,
    agent_id: auth.agentId,
    direction: "inbound",
    channel: "pwa",
    body,
    consumer_facing: false,
    status: "delivered",
  }).select("id").single();
  if (inboundError || !inbound) {
    return Response.json({ error: inboundError?.message ?? "Could not save message" }, { status: 500 });
  }

  const route = routeConversationMessage(body);
  const directFastTurn = (
    route.lane === "reflex"
    && route.intent === "conversation_reflex"
  ) || (
    route.lane === "fast"
    && route.reasonCode === "deterministic_agent_deal_portfolio"
  );
  let immediateResponse: string | null = null;
  if (directFastTurn) {
    const displayedAt = new Date().toISOString();
    const fastResult = await db.rpc("complete_pwa_fast_turn", {
      p_inbound_message_id: inbound.id,
      p_displayed_at: displayedAt,
    });
    if (!fastResult.error) {
      const row = Array.isArray(fastResult.data) ? fastResult.data[0] : fastResult.data;
      immediateResponse = FastTurnResultSchema.parse(row).response;
    } else {
      await writeAudit(db, {
        officeId: auth.officeId,
        actor: "system",
        agentId: auth.agentId,
        action: "pwa.fast_path_fell_back",
        payload: {
          inboundMessageId: inbound.id,
          reasonCode: route.reasonCode,
          error: fastResult.error.message.slice(0, 500),
        },
      });
    }
  }
  const originalMessages = parsed.data.messages as UIMessage[];

  if (immediateResponse) {
    return textStreamResponse(originalMessages, immediateResponse);
  }

  if (route.lane === "durable") {
    const displayedAt = new Date().toISOString();
    const task = await tasks.trigger<typeof processAgentPwa>("process-agent-pwa", {
      messageId: inbound.id,
      displayedAt,
    }, {
      idempotencyKey: ["pwa-inbound", inbound.id],
      idempotencyKeyTTL: "7d",
      concurrencyKey: auth.agentId,
    });
    const acknowledgement = processingAcknowledgement({
      body,
      seed: inbound.id,
      deadlineExpired: true,
    });
    await writeAudit(db, {
      officeId: auth.officeId,
      actor: "harriett",
      agentId: auth.agentId,
      action: "pwa.durable_turn_queued",
      payload: {
        inboundMessageId: inbound.id,
        taskId: task.id,
        lane: route.lane,
        intent: route.intent,
        acknowledgement: acknowledgement.message,
      },
    });
    return textStreamResponse(
      originalMessages,
      acknowledgement.message ?? "I’m on it. I’ll bring the result back here.",
    );
  }

  const trace = await startConversationTrace(db, {
    officeId: auth.officeId,
    agentId: auth.agentId,
    threadId: thread.id,
    inboundMessageId: inbound.id,
    channel: "pwa",
    lane: route.lane,
    intent: route.intent,
    idempotencyKey: `pwa-message:${inbound.id}`,
  });
  await updateConversationTrace(db, {
    turnId: trace.id,
    status: "running",
    timestampField: "first_feedback_at",
  });
  await recordConversationEvent(db, {
    officeId: auth.officeId,
    turnId: trace.id,
    event: "turn.routed",
    payload: {
      lane: route.lane,
      intent: route.intent,
      reasonCode: route.reasonCode,
      modelTier: route.modelTier,
    },
  });
  await recordConversationEvent(db, {
    officeId: auth.officeId,
    turnId: trace.id,
    event: "reply.displayed",
    payload: { channel: "pwa", delivery: "optimistic_typing_indicator" },
  });

  try {
    const agentStream = await startAgentTurnStream({
      officeId: auth.officeId,
      agentId: auth.agentId,
      channel: "pwa",
      message: body,
      conversationId: thread.id,
    }, { db }, { abortSignal: request.signal });
    await updateConversationTrace(db, {
      turnId: trace.id,
      status: "running",
      aiRunId: agentStream.runId,
    });
    let firstTokenRecorded = false;
    const observedStream = agentStream.stream.pipeThrough(new TransformStream({
      async transform(part, controller) {
        controller.enqueue(part);
        if (firstTokenRecorded || part.type !== "text-delta") return;
        firstTokenRecorded = true;
        await updateConversationTrace(db, {
          turnId: trace.id,
          status: "running",
          timestampField: "first_token_at",
        });
        await recordConversationEvent(db, {
          officeId: auth.officeId,
          turnId: trace.id,
          event: "model.first_token",
          payload: { channel: "pwa" },
        });
      },
    }));
    const stream = toUIMessageStream({
      stream: observedStream,
      tools: agentStream.tools,
      originalMessages,
      onError: () => "Harriett could not complete that request.",
      onEnd: async ({ isAborted }) => {
        if (isAborted) {
          const abortError = new Error("PWA stream was stopped by the agent");
          await agentStream.fail(abortError);
          await updateConversationTrace(db, { turnId: trace.id, status: "cancelled" });
          await recordConversationEvent(db, {
            officeId: auth.officeId,
            turnId: trace.id,
            event: "turn.failed",
            payload: { reason: "agent_stopped_stream" },
          });
          return;
        }
        try {
          const completed = await agentStream.finalize();
          const { data: outbound, error: outboundError } = await db
            .from("messages")
            .insert({
              office_id: auth.officeId,
              thread_id: thread.id,
              agent_id: auth.agentId,
              direction: "outbound",
              channel: "pwa",
              body: completed.response,
              consumer_facing: false,
              status: "delivered",
              in_reply_to_id: inbound.id,
              ai_run_id: completed.runId,
              sent_at: new Date().toISOString(),
            })
            .select("id")
            .single();
          if (outboundError || !outbound) {
            throw new Error(`PWA streamed reply persistence failed: ${outboundError?.message}`);
          }
          await updateConversationTrace(db, {
            turnId: trace.id,
            status: "completed",
            outboundMessageId: outbound.id,
            aiRunId: completed.runId,
            timestampField: "completed_at",
          });
          await recordConversationEvent(db, {
            officeId: auth.officeId,
            turnId: trace.id,
            event: "reply.created",
            payload: { outboundMessageId: outbound.id, channel: "pwa", delivery: "direct_stream" },
          });
          await recordConversationEvent(db, {
            officeId: auth.officeId,
            turnId: trace.id,
            event: "turn.completed",
            payload: { outcome: "direct_stream", intent: agentStream.intent },
          });
          await writeAudit(db, {
            officeId: auth.officeId,
            actor: "harriett",
            agentId: auth.agentId,
            action: "pwa.streamed_reply_completed",
            payload: {
              inboundMessageId: inbound.id,
              outboundMessageId: outbound.id,
              conversationTurnId: trace.id,
              aiRunId: completed.runId,
              lane: route.lane,
            },
          });
          await tasks.trigger<typeof processAgentMemory>("process-agent-memory", {
            officeId: auth.officeId,
            agentId: auth.agentId,
            messageId: inbound.id,
            aiRunId: completed.runId,
            channel: "pwa",
            agentMessage: body,
            assistantResponse: completed.response,
          }, {
            idempotencyKey: ["agent-memory", inbound.id],
            idempotencyKeyTTL: "7d",
            concurrencyKey: auth.agentId,
          });
        } catch (error) {
          await agentStream.fail(error);
          await updateConversationTrace(db, {
            turnId: trace.id,
            status: "failed",
            errorCode: error instanceof Error ? error.name : "unknown",
          });
          await recordConversationEvent(db, {
            officeId: auth.officeId,
            turnId: trace.id,
            event: "turn.failed",
            payload: { error: error instanceof Error ? error.message.slice(0, 500) : String(error).slice(0, 500) },
          });
        }
      },
    });
    return createUIMessageStreamResponse({ stream });
  } catch (error) {
    await updateConversationTrace(db, {
      turnId: trace.id,
      status: "failed",
      errorCode: error instanceof Error ? error.name : "unknown",
    });
    await recordConversationEvent(db, {
      officeId: auth.officeId,
      turnId: trace.id,
      event: "turn.failed",
      payload: { error: error instanceof Error ? error.message.slice(0, 500) : String(error).slice(0, 500) },
    });
    return Response.json({ error: "Harriett could not start that request" }, { status: 500 });
  }
}
