import { generateStructured } from "@/lib/ai/generate";
import { AgentIntentSchema, type AgentIntent } from "@/lib/contracts/agent";

const CLASSIFIER_SYSTEM = `Classify one request sent by a real estate agent to Harriett.

Use deal_lookup or checklist for operational transaction facts. Use document_lookup when the answer must come from an uploaded contract, listing agreement, addendum, disclosure, closing document, or a clause in a transaction document. A question asking which forms are present, missing, required, applicable, complete, signed, or consistent in a transaction packet is document_lookup with needsKnowledge true, because it requires both the uploaded packet and published rules. Use web_research only for current outside information, general internet research, news, rates, companies, products, or when the agent explicitly asks to search the web. Do not use web_research to determine what an uploaded contract says. Use task for personal to-dos, reminders, due work, completing a task, or cancelling a task. A request to create or change an appointment or calendar event is calendar, not task. Use property_research for public listing, valuation, or comparable-property questions. Use knowledge_lookup for office procedures, forms, regulations, compliance, or MLS rules. Use memory only when the agent explicitly asks what durable personal preferences or instructions Harriett remembers, asks her to remember or forget something, or discusses a durable personal preference. Use history when the agent asks what they discussed, researched, decided, or worked on previously, including yesterday, last week, or an older conversation. Use writing for drafting or rewriting. Use calendar, contact, or email for Google Workspace requests. Use approval for yes, edit, cancel, approve, or reject responses to a pending action.

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
