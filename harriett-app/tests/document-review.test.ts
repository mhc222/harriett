import { describe, expect, it } from "vitest";
import { DocumentPacketReviewSchema } from "@/lib/contracts/document-review";
import { classifyDocumentPacket } from "@/lib/document-review";

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
        missingOrUnclearItems: [],
        evidence: [],
        confidence: 1,
      }],
      notes: [],
    });
    expect(parsed.success).toBe(false);
  });

  it("classifies a combined packet from its primary transaction form", () => {
    const review = DocumentPacketReviewSchema.parse({
      documents: [
        {
          ruleKey: "federal_lead_based_paint_disclosure",
          status: "appears_complete",
          pages: [9],
          missingOrUnclearItems: [],
          evidence: [],
          confidence: 0.98,
        },
        {
          ruleKey: "al_general_financed_purchase_agreement",
          status: "needs_review",
          pages: [1, 2, 3, 4, 5, 6, 7, 8],
          missingOrUnclearItems: [],
          evidence: [],
          confidence: 0.93,
        },
      ],
      notes: [],
    });
    expect(classifyDocumentPacket(review)).toMatchObject({
      ruleKey: "al_general_financed_purchase_agreement",
      coarseDocumentType: "purchase_agreement",
    });
  });

  it("keeps low-confidence identification unknown", () => {
    const review = DocumentPacketReviewSchema.parse({
      documents: [{
        ruleKey: "al_general_financed_purchase_agreement",
        status: "unreadable",
        pages: [1],
        missingOrUnclearItems: [],
        evidence: [],
        confidence: 0.41,
      }],
      notes: [],
    });
    expect(classifyDocumentPacket(review)).toBeNull();
  });
});
