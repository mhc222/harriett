import { z } from "zod";
import { TRANSACTION_DOCUMENT_RULES } from "@/lib/transaction-document-rules";

const documentRuleKeys = TRANSACTION_DOCUMENT_RULES.map((rule) => rule.key) as [string, ...string[]];

export const DocumentReviewEvidenceSchema = z.object({
  pageNumber: z.number().int().positive(),
  quote: z.string().min(1).max(1_200),
});

export const DocumentRuleReviewSchema = z.object({
  ruleKey: z.enum(documentRuleKeys),
  status: z.enum(["appears_complete", "incomplete", "unreadable", "needs_review"]),
  pages: z.array(z.number().int().positive()).min(1),
  missingOrUnclearItems: z.array(z.string().min(1)).default([]),
  evidence: z.array(DocumentReviewEvidenceSchema).default([]),
  confidence: z.number().min(0).max(1),
});

export const DocumentPacketReviewSchema = z.object({
  documents: z.array(DocumentRuleReviewSchema).default([]),
  notes: z.array(z.string().min(1)).default([]),
});

export type DocumentPacketReview = z.infer<typeof DocumentPacketReviewSchema>;
