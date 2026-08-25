import type { AgentIntent } from "@/lib/contracts/agent";

export type ContextSource =
  | "structured"
  | "memory"
  | "history"
  | "tasks"
  | "documents"
  | "web"
  | "knowledge"
  | "microsoft_graph"
  | "google_workspace"
  | "property_provider";

export interface ContextRoute {
  sources: ContextSource[];
  useMemoryForPersonalization: boolean;
  memoryIsAuthoritative: false;
}

const INTENT_SOURCES: Record<AgentIntent["intent"], ContextSource[]> = {
  answer: [],
  deal_lookup: ["structured"],
  property_research: ["property_provider"],
  knowledge_lookup: ["knowledge"],
  document_lookup: ["documents"],
  web_research: ["web"],
  writing: [],
  calendar: ["google_workspace"],
  contact: ["google_workspace"],
  email: ["google_workspace"],
  checklist: ["structured"],
  task: ["tasks"],
  memory: ["memory"],
  history: ["history"],
  approval: ["structured"],
  other: [],
};

/**
 * Chooses evidence sources after intent classification. Mem0-style memory is
 * personal context, never proof of a deal, policy, email, calendar, contact,
 * or property fact.
 */
export function routeContext(intent: AgentIntent): ContextRoute {
  const sources = new Set<ContextSource>(INTENT_SOURCES[intent.intent]);

  if (intent.needsKnowledge) sources.add("knowledge");
  if (intent.needsMemory || intent.intent === "writing") sources.add("memory");

  return {
    sources: [...sources],
    useMemoryForPersonalization: sources.has("memory"),
    memoryIsAuthoritative: false,
  };
}

export function sourceAuthority(source: ContextSource): number {
  switch (source) {
    case "structured":
    case "tasks":
    case "documents":
      return 100;
    case "microsoft_graph":
    case "google_workspace":
      return 95;
    case "knowledge":
      return 90;
    case "property_provider":
      return 80;
    case "history":
      return 70;
    case "web":
      return 60;
    case "memory":
      return 30;
  }
}
