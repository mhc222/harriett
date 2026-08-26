import { tasks } from "@trigger.dev/sdk";
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  type UIMessage,
} from "ai";
import { z } from "zod";
import { routeConversationMessage } from "@/lib/ai/conversation-router";
import { writeAudit } from "@/lib/audit";
import { authenticatedContext } from "@/lib/auth-context";
import { createUserClient } from "@/lib/db/server";
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
  if (!immediateResponse) {
    await tasks.trigger<typeof processAgentPwa>(
      "process-agent-pwa",
      { messageId: inbound.id },
      {
        idempotencyKey: ["pwa-message", inbound.id],
        idempotencyKeyTTL: "7d",
        concurrencyKey: auth.agentId,
      },
    );
  }

  const stream = createUIMessageStream({
    originalMessages,
    execute: async ({ writer }) => {
      const textId = crypto.randomUUID();
      try {
        if (immediateResponse) {
          writer.write({ type: "text-start", id: textId });
          writer.write({ type: "text-delta", id: textId, delta: immediateResponse });
          writer.write({ type: "text-end", id: textId });
          return;
        }
        let response: string | null = null;
        for (let attempt = 0; attempt < 240; attempt += 1) {
          if (request.signal.aborted) return;
          const [{ data: reply, error: replyError }, { data: turn, error: turnError }] = await Promise.all([
            db.from("messages")
              .select("body")
              .eq("in_reply_to_id", inbound.id)
              .eq("channel", "pwa")
              .maybeSingle(),
            db.from("conversation_turns")
              .select("status")
              .eq("inbound_message_id", inbound.id)
              .maybeSingle(),
          ]);
          if (replyError) throw new Error(replyError.message);
          if (turnError) throw new Error(turnError.message);
          if (reply?.body) {
            response = reply.body;
            break;
          }
          if (turn?.status === "failed") {
            throw new Error("Harriett could not complete that request");
          }
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
        if (!response) throw new Error("Harriett is still working. Your request is saved, so you can come back to this conversation.");
        writer.write({ type: "text-start", id: textId });
        writer.write({ type: "text-delta", id: textId, delta: response });
        writer.write({ type: "text-end", id: textId });
      } catch (error) {
        writer.write({
          type: "error",
          errorText: error instanceof Error ? error.message : "Harriett could not complete that request",
        });
      }
    },
  });
  return createUIMessageStreamResponse({ stream });
}
