import { tasks } from "@trigger.dev/sdk";
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  type UIMessage,
} from "ai";
import { z } from "zod";
import { deterministicReflexResponse, routeConversationMessage } from "@/lib/ai/conversation-router";
import {
  AgentDealSearchInputSchema,
  AgentDealSearchOutputSchema,
  formatAgentDealPortfolio,
  searchAgentDeals,
} from "@/lib/agent-deals";
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

  let immediateResponse = deterministicReflexResponse(body);
  const route = routeConversationMessage(body);
  if (
    !immediateResponse
    && route.lane === "fast"
    && route.reasonCode === "deterministic_agent_deal_portfolio"
  ) {
    const searchInput = AgentDealSearchInputSchema.parse({ includeClosed: false, limit: 20 });
    const result = await searchAgentDeals(db, {
      officeId: auth.officeId,
      agentId: auth.agentId,
    }, searchInput);
    immediateResponse = formatAgentDealPortfolio(
      AgentDealSearchOutputSchema.parse(result).deals,
    );
  }
  const displayedAt = immediateResponse ? new Date().toISOString() : undefined;
  const originalMessages = parsed.data.messages as UIMessage[];
  await tasks.trigger<typeof processAgentPwa>(
    "process-agent-pwa",
    { messageId: inbound.id, displayedAt },
    {
      idempotencyKey: ["pwa-message", inbound.id],
      idempotencyKeyTTL: "7d",
      concurrencyKey: auth.agentId,
    },
  );

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
