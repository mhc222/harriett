import { z } from "zod";
import { PostgresUuidSchema } from "@/lib/contracts/scalars";

export const MemoryProvenanceSchema = z.object({
  source: z.enum(["onboarding", "sms", "whatsapp", "pwa", "draft_correction", "manual"]),
  sourceId: z.string().optional(),
  explicit: z.boolean(),
  observedAt: z.string().datetime(),
});
export type MemoryProvenance = z.infer<typeof MemoryProvenanceSchema>;

export const MemoryRecordSchema = z.object({
  id: z.string().uuid().optional(),
  officeId: PostgresUuidSchema,
  agentId: PostgresUuidSchema.nullable(),
  scope: z.enum(["agent", "office"]),
  category: z.enum(["style", "preference", "relationship", "instruction"]),
  content: z.string().trim().min(1).max(2_000),
  provenance: MemoryProvenanceSchema,
  confidence: z.number().min(0).max(1),
  status: z.enum(["proposed", "active", "rejected", "superseded"]),
  sensitivity: z.enum(["ordinary", "sensitive", "consequential"]),
});
export type MemoryRecord = z.infer<typeof MemoryRecordSchema>;

export const MemoryCandidateSchema = MemoryRecordSchema.omit({
  id: true,
  officeId: true,
  agentId: true,
  status: true,
}).extend({
  shouldRemember: z.boolean(),
  reason: z.string(),
});
