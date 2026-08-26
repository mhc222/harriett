import {
  ConversationRouteSchema,
  type ConversationRoute,
} from "@/lib/contracts/conversation";

const GREETING = /^(?:hi|hello|hey|good\s+(?:morning|afternoon|evening))(?:\s+harriett)?[.!?]*$/i;
const THANKS = /^(?:thanks|thank\s+you|appreciate\s+it|got\s+it)[.!?]*$/i;
const PRESENCE_CHECK = /^(?:are\s+you\s+there|you\s+there|still\s+there)[.!?]*$/i;
const HELP = /^(?:help|what\s+can\s+you\s+do)[.!?]*$/i;
const OPT_IN = /^(?:start|unstop|resume\s+(?:messages|texts))[.!?]*$/i;
const OPT_OUT = /^(?:stop|quit|unsubscribe|cancel\s+(?:messages|texts))[.!?]*$/i;

const OWN_DEALS =
  /\b(?:what|which)\s+(?:(?:active|current|pending|closed)\s+)?(?:listings?|deals?|transactions?)\s+do\s+i\s+have\b|\b(?:show|list|pull|give)\s+(?:me\s+)?my\s+(?:(?:active|current|pending|closed)\s+)?(?:listings?|deals?|transactions?)\b|\b(?:what|which|show|list|pull)\s+(?:are\s+)?my\s+pending\s+files?\b/i;
const SIMPLE_DEAL_READ =
  /\b(?:when|what\s+time|where|what|which)\b[\s\S]{0,100}\b(?:closing|inspection|deadline|due|status|listing|transaction|deal)\b/i;
const ACTION_STATUS =
  /\b(?:did|has|is|was)\b[\s\S]{0,80}\b(?:post|posted|publish|published|delete|deleted|send|sent|schedule|scheduled|running|working)\b/i;
const DURABLE_ACTION =
  /\b(?:post|publish|delete|remove|send|schedule|upload|parse|index|monitor)\b[\s\S]{0,100}\b(?:facebook|social|email|contract|document|calendar|reminder)?\b/i;
const COMPLEX_RESEARCH =
  /\b(?:research|compare|analyze|analyse|cma|comps?|contract|document|clause|forms?|disclosures?)\b/i;

function route(value: ConversationRoute): ConversationRoute {
  return ConversationRouteSchema.parse(value);
}

export function deterministicReflexResponse(message: string): string | null {
  const trimmed = message.trim();
  if (GREETING.test(trimmed)) return "Hi. What can I help you with?";
  if (THANKS.test(trimmed)) return "You’re welcome.";
  if (PRESENCE_CHECK.test(trimmed)) return "I’m here. What do you need?";
  if (HELP.test(trimmed)) {
    return "I can help with your listings, transactions, deadlines, documents, calendar, email, tasks, research, and social posts. What do you need?";
  }
  return null;
}

export function routeConversationMessage(message: string): ConversationRoute {
  const trimmed = message.trim();

  if (OPT_OUT.test(trimmed)) {
    return route({
      lane: "reflex",
      intent: "consent_opt_out",
      reasonCode: "deterministic_consent_opt_out",
      modelTier: "none",
      allowedToolNames: [],
      acknowledgementPolicy: "none",
    });
  }
  if (OPT_IN.test(trimmed)) {
    return route({
      lane: "reflex",
      intent: "consent_opt_in",
      reasonCode: "deterministic_consent_opt_in",
      modelTier: "none",
      allowedToolNames: [],
      acknowledgementPolicy: "none",
    });
  }
  if (deterministicReflexResponse(trimmed)) {
    return route({
      lane: "reflex",
      intent: "conversation_reflex",
      reasonCode: "deterministic_conversation_reflex",
      modelTier: "none",
      allowedToolNames: [],
      acknowledgementPolicy: "none",
    });
  }
  if (OWN_DEALS.test(trimmed)) {
    return route({
      lane: "fast",
      intent: "deal_lookup",
      reasonCode: "deterministic_agent_deal_portfolio",
      modelTier: "none",
      allowedToolNames: ["searchDeals"],
      acknowledgementPolicy: "typing_only",
      quickBudgetMs: 6_000,
    });
  }
  if (ACTION_STATUS.test(trimmed)) {
    return route({
      lane: "fast",
      intent: "action_status",
      reasonCode: "deterministic_action_status",
      modelTier: "fast",
      allowedToolNames: ["searchAgentHistory", "listPendingActions"],
      acknowledgementPolicy: "typing_only",
      quickBudgetMs: 6_000,
    });
  }
  if (DURABLE_ACTION.test(trimmed)) {
    return route({
      lane: "durable",
      intent: "external_or_long_action",
      reasonCode: "deterministic_durable_action",
      modelTier: "standard",
      allowedToolNames: [],
      acknowledgementPolicy: "message_if_slow",
    });
  }
  if (SIMPLE_DEAL_READ.test(trimmed)) {
    return route({
      lane: "fast",
      intent: "deal_lookup",
      reasonCode: "deterministic_simple_deal_read",
      modelTier: "fast",
      allowedToolNames: ["searchDeals", "listAgentTasks"],
      acknowledgementPolicy: "typing_only",
      quickBudgetMs: 6_000,
    });
  }
  if (COMPLEX_RESEARCH.test(trimmed)) {
    return route({
      lane: "standard",
      intent: "standard_reasoning",
      reasonCode: "deterministic_complex_request",
      modelTier: "standard",
      allowedToolNames: [],
      acknowledgementPolicy: "message_if_slow",
    });
  }

  return route({
    lane: "standard",
    intent: "classify_with_context",
    reasonCode: "requires_contextual_classification",
    modelTier: "standard",
    allowedToolNames: [],
    acknowledgementPolicy: "typing_only",
  });
}
