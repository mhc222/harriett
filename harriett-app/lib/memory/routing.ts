import type { AgentIntent } from "@/lib/contracts/agent";

export type ContextSource =
  | "structured"
  | "memory"
  | "knowledge"
  | "microsoft_graph"
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
  writing: [],
  calendar: ["microsoft_graph"],
  contact: ["microsoft_graph"],
  email: ["microsoft_graph"],
  checklist: ["structured"],
  memory: ["memory"],
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
      return 100;
    case "microsoft_graph":
      return 95;
    case "knowledge":
      return 90;
    case "property_provider":
      return 80;
    case "memory":
      return 30;
  }
}
