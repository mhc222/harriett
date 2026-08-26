import type { SupabaseClient } from "@supabase/supabase-js";
import { writeAudit } from "@/lib/audit";
import {
  deterministicReflexResponse,
  routeConversationMessage,
} from "@/lib/ai/conversation-router";
import {
  recordConversationEvent,
  startConversationTrace,
  updateConversationTrace,
} from "@/lib/conversation-trace";
import { sendAgentMessage, type AgentMessagingChannel } from "@/lib/sms";

export function conversationFastLaneEnabled(): boolean {
  return process.env.CONVERSATION_FAST_LANE_ENABLED === "true";
}

export async function tryDeterministicConversationTurn(
  db: SupabaseClient,
  input: {
    officeId: string;
    agentId: string;
    inboundMessageId: string;
    providerMessageId?: string;
    threadId?: string;
    channel: AgentMessagingChannel;
    body: string;
  }
): Promise<{
  handled: true;
  turnId: string;
  correlationId: string;
  outboundMessageId: string;
  providerMessageId?: string;
  dryRun?: boolean;
} | null> {
  const decision = routeConversationMessage(input.body);
  const response = deterministicReflexResponse(input.body);
  if (decision.lane !== "reflex" || decision.intent !== "conversation_reflex" || !response) {
    return null;
  }

  const trace = await startConversationTrace(db, {
    officeId: input.officeId,
    agentId: input.agentId,
    threadId: input.threadId,
    inboundMessageId: input.inboundMessageId,
    channel: input.channel,
    lane: decision.lane,
    intent: decision.intent,
    idempotencyKey: `agent-message:${input.providerMessageId ?? input.inboundMessageId}`,
  });

  await recordConversationEvent(db, {
    officeId: input.officeId,
    turnId: trace.id,
    event: "message.persisted",
    payload: { inboundMessageId: input.inboundMessageId },
  });
  await recordConversationEvent(db, {
    officeId: input.officeId,
    turnId: trace.id,
    event: "turn.routed",
    payload: {
      lane: decision.lane,
      intent: decision.intent,
      reasonCode: decision.reasonCode,
      modelTier: decision.modelTier,
    },
  });
  await updateConversationTrace(db, { turnId: trace.id, status: "running" });

  const sent = await sendAgentMessage(db, {
    agentId: input.agentId,
    channel: input.channel,
    inReplyToId: input.inboundMessageId,
    body: response,
  });

  await updateConversationTrace(db, {
    turnId: trace.id,
    status: "running",
    outboundMessageId: sent.messageId,
    timestampField: "reply_created_at",
  });
  await recordConversationEvent(db, {
    officeId: input.officeId,
    turnId: trace.id,
    event: "reply.created",
    payload: {
      outboundMessageId: sent.messageId,
      providerMessageId: sent.providerMessageId ?? null,
      dryRun: sent.dryRun ?? false,
    },
  });

  if (sent.providerMessageId) {
    await updateConversationTrace(db, {
      turnId: trace.id,
      status: "running",
      timestampField: "provider_accepted_at",
    });
    await recordConversationEvent(db, {
      officeId: input.officeId,
      turnId: trace.id,
      event: "provider.accepted",
      payload: { providerMessageId: sent.providerMessageId },
    });
  }

  await updateConversationTrace(db, {
    turnId: trace.id,
    status: "completed",
    timestampField: "completed_at",
  });
  await recordConversationEvent(db, {
    officeId: input.officeId,
    turnId: trace.id,
    event: "turn.completed",
    payload: { outcome: "deterministic_reflex" },
  });
  await writeAudit(db, {
    officeId: input.officeId,
    actor: "harriett",
    agentId: input.agentId,
    action: `${input.channel}.deterministic_reply_completed`,
    payload: {
      turnId: trace.id,
      correlationId: trace.correlationId,
      inboundMessageId: input.inboundMessageId,
      outboundMessageId: sent.messageId,
      providerMessageId: sent.providerMessageId ?? null,
      replay: trace.replay,
    },
  });

  return {
    handled: true,
    turnId: trace.id,
    correlationId: trace.correlationId,
    outboundMessageId: sent.messageId,
    providerMessageId: sent.providerMessageId,
    dryRun: sent.dryRun,
  };
}
