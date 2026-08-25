import { describe, expect, it } from "vitest";
import { enforceEvidenceRouting } from "@/lib/ai/classify";
import type { AgentIntent } from "@/lib/contracts/agent";

const base: AgentIntent = {
  intent: "knowledge_lookup",
  needsKnowledge: false,
  needsMemory: false,
  dealAddressHint: null,
  requestedMutation: false,
};

describe("contract evidence routing", () => {
  it("routes packet completeness through documents and knowledge", () => {
    expect(enforceEvidenceRouting("Which required forms are missing from this transaction packet?", base))
      .toMatchObject({ intent: "document_lookup", needsKnowledge: true });
  });

  it("routes signature and completeness checks the same way", () => {
    expect(enforceEvidenceRouting("Is the listing agreement complete and signed?", base))
      .toMatchObject({ intent: "document_lookup", needsKnowledge: true });
  });

  it("does not rewrite an unrelated general question", () => {
    expect(enforceEvidenceRouting("What is the weather tomorrow?", base)).toEqual(base);
  });
});
