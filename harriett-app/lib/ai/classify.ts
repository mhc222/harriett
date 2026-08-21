import { generateStructured } from "@/lib/ai/generate";
import { AgentIntentSchema, type AgentIntent } from "@/lib/contracts/agent";

const CLASSIFIER_SYSTEM = `Classify one request sent by a real estate agent to Harriett.

Use deal_lookup or checklist for operational transaction facts. Use property_research for public listing, valuation, or comparable-property questions. Use knowledge_lookup for office procedures, forms, regulations, compliance, or MLS rules. Use memory only when the agent explicitly asks what Harriett remembers, asks her to remember or forget something, or discusses a durable personal preference. Use writing for drafting or rewriting. Use calendar, contact, or email for Microsoft 365 requests. Use approval for yes, edit, cancel, approve, or reject responses to a pending action.

needsMemory means personal context would materially improve the response. It does not mean memory can prove a deal, policy, email, calendar, contact, or property fact. needsKnowledge means published office or regulatory evidence is needed. requestedMutation is true for any request to create, update, delete, send, save, remember, forget, approve, reject, assign, or complete something.`;

export async function classifyAgentIntent(message: string): Promise<AgentIntent> {
  return generateStructured({
    schema: AgentIntentSchema,
    system: CLASSIFIER_SYSTEM,
    content: message,
    tier: "fast",
    maxOutputTokens: 300,
  });
}
