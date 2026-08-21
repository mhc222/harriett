import { z } from "zod";
import { PostgresUuidSchema } from "@/lib/contracts/scalars";

export const WritingBriefSchema = z.object({
  agentId: PostgresUuidSchema,
  authorName: z.string().min(1),
  audience: z.enum(["agent", "internal", "vendor", "consumer", "public"]),
  channel: z.enum(["sms", "email", "mls", "social", "letter", "presentation", "cma"]),
  purpose: z.string().min(1),
  verifiedFacts: z.record(z.string(), z.unknown()),
  allowedClaims: z.array(z.string()),
  characterLimit: z.number().int().positive().optional(),
  writingProfileVersion: z.number().int().positive().nullable(),
  complianceRules: z.array(z.string()),
  requiredApprover: z.enum(["agent", "broker", "none"]),
});
export type WritingBrief = z.infer<typeof WritingBriefSchema>;

export const WritingProfileSchema = z.object({
  formality: z.enum(["casual", "balanced", "formal"]),
  warmth: z.enum(["reserved", "warm", "very_warm"]),
  sentenceLength: z.enum(["short", "mixed", "long"]),
  vocabulary: z.array(z.string()).max(50),
  callsToAction: z.array(z.string()).max(20),
  recurringPhrases: z.array(z.string()).max(30),
  prohibitedPhrases: z.array(z.string()).max(50),
  punctuationNotes: z.string().max(1_000),
  channelNotes: z.record(z.string(), z.string()),
});
export type WritingProfile = z.infer<typeof WritingProfileSchema>;
