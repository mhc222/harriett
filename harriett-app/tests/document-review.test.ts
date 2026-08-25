import { describe, expect, it } from "vitest";
import { DocumentPacketReviewSchema } from "@/lib/contracts/document-review";

describe("document packet review contract", () => {
  it("accepts a conservative incomplete review with page evidence", () => {
    const parsed = DocumentPacketReviewSchema.parse({
      documents: [{
        ruleKey: "al_general_financed_purchase_agreement",
        status: "incomplete",
        pages: [1, 2, 3],
        missingOrUnclearItems: ["Seller signature date is blank"],
        evidence: [{ pageNumber: 3, quote: "Seller signature / Date" }],
        confidence: 0.91,
      }],
      notes: ["One handwritten change needs human review."],
    });
    expect(parsed.documents[0].status).toBe("incomplete");
  });

  it("rejects unrecognized document rule keys", () => {
    const parsed = DocumentPacketReviewSchema.safeParse({
      documents: [{
        ruleKey: "made_up_form",
        status: "appears_complete",
        pages: [1],
        confidence: 1,
      }],
    });
    expect(parsed.success).toBe(false);
  });
});
