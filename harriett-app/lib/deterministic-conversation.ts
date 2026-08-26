import type { SupabaseClient } from "@supabase/supabase-js";
import { deterministicReflexResponse, routeConversationMessage } from "@/lib/ai/conversation-router";
import {
  AgentDealSearchInputSchema,
  AgentDealSearchOutputSchema,
  formatAgentDealPortfolio,
  searchAgentDeals,
} from "@/lib/agent-deals";
import { withSkillTrace } from "@/lib/execution-trace";

export type DeterministicConversationResponse = {
  response: string;
  lane: "reflex" | "fast";
  intent: string;
  reasonCode: string;
  outcome: "deterministic_reflex" | "deterministic_deal_portfolio";
} | null;

export async function resolveDeterministicConversationResponse(
  db: SupabaseClient,
  input: { officeId: string; agentId: string; body: string },
): Promise<DeterministicConversationResponse> {
  const decision = routeConversationMessage(input.body);
  const reflex = deterministicReflexResponse(input.body);

  if (
    decision.lane === "reflex"
    && decision.intent === "conversation_reflex"
    && reflex
  ) {
    return {
      response: reflex,
      lane: "reflex",
      intent: decision.intent,
      reasonCode: decision.reasonCode,
      outcome: "deterministic_reflex",
    };
  }

  if (
    decision.lane === "fast"
    && decision.reasonCode === "deterministic_agent_deal_portfolio"
  ) {
    const searchInput = AgentDealSearchInputSchema.parse({ includeClosed: false, limit: 20 });
    const result = await withSkillTrace(
      { db, officeId: input.officeId, agentId: input.agentId },
      { name: "search_deals", version: "1.0.0", risk: "read", input: searchInput },
      () => searchAgentDeals(db, {
        officeId: input.officeId,
        agentId: input.agentId,
      }, searchInput),
    );
    const parsed = AgentDealSearchOutputSchema.parse(result);
    return {
      response: formatAgentDealPortfolio(parsed.deals),
      lane: "fast",
      intent: decision.intent,
      reasonCode: decision.reasonCode,
      outcome: "deterministic_deal_portfolio",
    };
  }

  return null;
}
