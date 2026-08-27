import { describe, expect, it } from "vitest";
import {
  DealWorkflowOutputSchema,
  DealWorkflowSchema,
  MeetingSummarySchema,
} from "@/lib/contracts/operations";

describe("meeting summary contract", () => {
  it("accepts structured follow-up work without a transcript field", () => {
    const summary = MeetingSummarySchema.parse({
      title: "Showing recap",
      summary: "The buyers liked the kitchen and want the roof age confirmed.",
      attendees: ["Taylor Buyer"],
      topics: ["Property condition"],
      decisions: ["Request the roof age"],
      nextSteps: [{
        title: "Confirm roof age",
        detail: "Ask the listing side for supporting records.",
        owner: "Jerrod",
        dueAt: null,
        priority: "normal",
      }],
      followUpQuestions: ["How old is the roof?"],
      contactFacts: [{ fact: "Taylor values a renovated kitchen.", confidence: "stated" }],
    });

    expect(summary.nextSteps).toHaveLength(1);
    expect("transcript" in summary).toBe(false);
  });

  it("rejects vague next steps with no title", () => {
    const result = MeetingSummarySchema.safeParse({
      title: "Call",
      summary: "A call happened.",
      attendees: [],
      topics: [],
      decisions: [],
      nextSteps: [{ title: "", detail: null, owner: null, dueAt: null, priority: "normal" }],
      followUpQuestions: [],
      contactFacts: [],
    });
    expect(result.success).toBe(false);
  });
});

describe("deal workflow contracts", () => {
  it.each(["marketing_materials", "photo_coordination", "document_drafting"])(
    "allows the Phase 2 workflow %s",
    (workflow) => expect(DealWorkflowSchema.parse(workflow)).toBe(workflow)
  );

  it("requires review facts and concrete sections", () => {
    const output = DealWorkflowOutputSchema.parse({
      title: "Listing marketing draft",
      plainText: "A review-ready draft.",
      sections: [{ heading: "Short description", body: "Three-bedroom home in Tuscaloosa." }],
      factsUsed: ["Three bedrooms"],
      factsToVerify: ["School zone"],
      workItems: [{
        title: "Verify school zone",
        detail: null,
        dueAt: null,
        priority: "normal",
      }],
    });
    expect(output.factsToVerify).toEqual(["School zone"]);
  });
});
