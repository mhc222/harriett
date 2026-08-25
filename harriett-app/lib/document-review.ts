import type { SupabaseClient } from "@supabase/supabase-js";
import { generateStructured } from "@/lib/ai/generate";
import {
  DocumentPacketReviewSchema,
  type DocumentPacketReview,
} from "@/lib/contracts/document-review";
import { TRANSACTION_DOCUMENT_RULES } from "@/lib/transaction-document-rules";

export interface PrimaryDocumentClassification {
  ruleKey: string;
  title: string;
  coarseDocumentType: "listing_agreement" | "purchase_agreement" | "net_sheet" | "disclosure" | "settlement" | "other";
  confidence: number;
}

const familyPriority: Record<string, number> = {
  transaction_contract: 100,
  brokerage_agreement: 90,
  settlement: 80,
  financial_estimate: 70,
  contract_addendum: 60,
  brokerage_disclosure: 50,
  property_disclosure: 40,
  property_record: 30,
  internal_workflow: 20,
};

export function classifyDocumentPacket(review: DocumentPacketReview): PrimaryDocumentClassification | null {
  const catalog = new Map(TRANSACTION_DOCUMENT_RULES.map((rule) => [rule.key, rule]));
  const candidates = review.documents.flatMap((item) => {
    const rule = catalog.get(item.ruleKey);
    return rule ? [{ item, rule }] : [];
  });
  candidates.sort((left, right) => {
    const priority = (familyPriority[right.rule.family] ?? 0) - (familyPriority[left.rule.family] ?? 0);
    return priority || right.item.confidence - left.item.confidence;
  });
  const primary = candidates[0];
  if (!primary || primary.item.confidence < 0.6) return null;
  return {
    ruleKey: primary.rule.key,
    title: primary.rule.title,
    coarseDocumentType: primary.rule.coarseDocumentType,
    confidence: primary.item.confidence,
  };
}

function ruleCatalog(): string {
  return TRANSACTION_DOCUMENT_RULES.map((rule) => [
    `KEY: ${rule.key}`,
    `TITLE: ${rule.title}`,
    `ALIASES: ${rule.aliases.join(", ")}`,
    `EXPECTED FIELDS: ${rule.expectedFields.join(", ")}`,
    `EXECUTION CHECKS: ${rule.executionChecks.join(", ")}`,
  ].join("\n")).join("\n\n");
}

const REVIEW_SYSTEM = `You review real estate transaction PDFs for Pritchett-Moore Real Estate in Alabama.

Identify only forms that are visibly present in the uploaded PDF. Do not report a form as missing. Missing-form decisions happen later from verified transaction facts and office rules.

For every recognized form:
- Use only a rule key from the supplied catalog.
- Record every page occupied by the form.
- Use appears_complete only when all expected fields and execution checks that can be verified from the document are visibly satisfied.
- Use incomplete when a required field, signature, date, selection, page, or incorporated addendum is visibly absent or blank.
- Use unreadable when image quality prevents a reliable review.
- Use needs_review when the form is present but handwriting, selections, signatures, amendments, or internal consistency cannot be resolved confidently.
- Include short verbatim evidence with one-based PDF page numbers.
- Include every response field. Use an empty array when there are no documents, notes, missing items, or evidence.
- Printed signature lines do not prove a signature. Printed boilerplate does not prove an optional election applies.
- Never infer facts from common practice, filenames, templates, or another transaction.
- An appears_complete result is an AI document review, not a legal conclusion.`;

export async function reviewTransactionDocument(pdf: Uint8Array): Promise<DocumentPacketReview> {
  return generateStructured({
    schema: DocumentPacketReviewSchema,
    system: REVIEW_SYSTEM,
    content: [
      { type: "file", data: pdf, mediaType: "application/pdf" },
      { type: "text", text: `Review the forms visibly present in this PDF against this catalog:\n\n${ruleCatalog()}` },
    ],
    maxOutputTokens: 8_192,
  });
}

export async function saveDocumentReview(
  db: SupabaseClient,
  input: {
    officeId: string;
    agentId: string;
    dealId: string;
    documentId: string;
    review: DocumentPacketReview;
  }
): Promise<{ count: number; primary: PrimaryDocumentClassification | null }> {
  const primary = classifyDocumentPacket(input.review);
  if (!input.review.documents.length) return { count: 0, primary };
  const rows = input.review.documents.map((item) => ({
    office_id: input.officeId,
    agent_id: input.agentId,
    deal_id: input.dealId,
    document_id: input.documentId,
    rule_key: item.ruleKey,
    status: item.status,
    pages: item.pages,
    missing_or_unclear_items: item.missingOrUnclearItems,
    evidence: item.evidence,
    confidence: item.confidence,
    reviewed_by: "harriett",
  }));
  const { error } = await db.from("document_rule_reviews").upsert(rows, {
    onConflict: "document_id,rule_key",
  });
  if (error) throw new Error(`document review write failed: ${error.message}`);
  if (primary) {
    const { error: classificationError } = await db
      .from("documents")
      .update({
        document_type_key: primary.ruleKey,
        doc_type: primary.coarseDocumentType,
      })
      .eq("id", input.documentId)
      .eq("office_id", input.officeId);
    if (classificationError) throw new Error(`document classification write failed: ${classificationError.message}`);
  }
  return { count: rows.length, primary };
}
