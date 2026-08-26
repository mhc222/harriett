import type { SupabaseClient } from "@supabase/supabase-js";
import { writeAudit } from "@/lib/audit";
import {
  deterministicReflexResponse,
  routeConversationMessage,
} from "@/lib/ai/conversation-router";
import {
  AgentDealSearchInputSchema,
  AgentDealSearchOutputSchema,
  formatAgentDealPortfolio,
  searchAgentDeals,
} from "@/lib/agent-deals";
import {
  recordConversationEvent,
  startConversationTrace,
  updateConversationTrace,
} from "@/lib/conversation-trace";
import { sendAgentMessage, type AgentMessagingChannel } from "@/lib/sms";
import { withSkillTrace } from "@/lib/execution-trace";

export function conversationFastLaneEnabled(agentId?: string): boolean {
  if (process.env.CONVERSATION_FAST_LANE_ENABLED !== "true" || !agentId) return false;
  const allowedAgentIds = (process.env.CONVERSATION_FAST_LANE_AGENT_IDS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return allowedAgentIds.includes(agentId);
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
  const reflexResponse = deterministicReflexResponse(input.body);
  const isReflex = decision.lane === "reflex"
    && decision.intent === "conversation_reflex"
    && Boolean(reflexResponse);
  const isDealPortfolio = decision.lane === "fast"
    && decision.reasonCode === "deterministic_agent_deal_portfolio";
  if (!isReflex && !isDealPortfolio) {
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

  let response = reflexResponse ?? "";
  let outcome = "deterministic_reflex";
  if (isDealPortfolio) {
    const toolStartedAt = Date.now();
    await recordConversationEvent(db, {
      officeId: input.officeId,
      turnId: trace.id,
      event: "tool.started",
      payload: { tool: "searchDeals" },
    });
    const searchInput = AgentDealSearchInputSchema.parse({ includeClosed: false, limit: 20 });
    const result = await withSkillTrace(
      { db, officeId: input.officeId, agentId: input.agentId },
      {
        name: "search_deals",
        version: "1.0.0",
        risk: "read",
        input: searchInput,
      },
      () => searchAgentDeals(db, {
        officeId: input.officeId,
        agentId: input.agentId,
      }, searchInput)
    );
    const parsed = AgentDealSearchOutputSchema.parse(result);
    response = formatAgentDealPortfolio(parsed.deals);
    outcome = "deterministic_deal_portfolio";
    await recordConversationEvent(db, {
      officeId: input.officeId,
      turnId: trace.id,
      event: "tool.completed",
      durationMs: Date.now() - toolStartedAt,
      payload: { tool: "searchDeals", resultCount: parsed.deals.length },
    });
  }

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
    payload: { outcome },
  });
  await writeAudit(db, {
    officeId: input.officeId,
    actor: "harriett",
    agentId: input.agentId,
    action: isDealPortfolio
      ? `${input.channel}.fast_deal_portfolio_completed`
      : `${input.channel}.deterministic_reply_completed`,
    payload: {
      turnId: trace.id,
      correlationId: trace.correlationId,
      inboundMessageId: input.inboundMessageId,
      outboundMessageId: sent.messageId,
      providerMessageId: sent.providerMessageId ?? null,
      replay: trace.replay,
      outcome,
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
