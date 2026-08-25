import { z } from "zod";
import { PostgresUuidSchema } from "@/lib/contracts/scalars";

export const AgentChannelSchema = z.enum(["sms", "whatsapp", "pwa", "email_event", "voice"]);
export type AgentChannel = z.infer<typeof AgentChannelSchema>;

export const AttachmentRefSchema = z.object({
  id: z.string().uuid(),
  filename: z.string().min(1),
  mimeType: z.string().min(1),
  storagePath: z.string().min(1).optional(),
});
export type AttachmentRef = z.infer<typeof AttachmentRefSchema>;

export const AgentTurnInputSchema = z.object({
  officeId: PostgresUuidSchema,
  agentId: PostgresUuidSchema,
  channel: AgentChannelSchema,
  message: z.string().trim().min(1).max(20_000),
  attachments: z.array(AttachmentRefSchema).max(20).optional(),
  conversationId: z.string().uuid().optional(),
});
export type AgentTurnInput = z.infer<typeof AgentTurnInputSchema>;

export const KnowledgeCitationSchema = z.object({
  sourceId: z.string().uuid(),
  title: z.string(),
  section: z.string().nullable().optional(),
  pageNumber: z.number().int().positive().nullable().optional(),
  effectiveDate: z.string().nullable().optional(),
  excerpt: z.string(),
});
export type KnowledgeCitation = z.infer<typeof KnowledgeCitationSchema>;

export const ActionStatusSchema = z.enum([
  "proposed",
  "approved",
  "rejected",
  "running",
  "completed",
  "failed",
  "expired",
  "cancelled",
]);

export const ActionRequestSchema = z.object({
  id: z.string().uuid(),
  skill: z.string().min(1),
  summary: z.string().min(1),
  exactPayload: z.unknown(),
  status: ActionStatusSchema,
  requiredApprover: z.enum(["agent", "broker", "none"]),
  expiresAt: z.string().datetime().nullable().optional(),
});
export type ActionRequest = z.infer<typeof ActionRequestSchema>;

export const AgentTurnResultSchema = z.object({
  response: z.string(),
  citations: z.array(KnowledgeCitationSchema),
  proposedActions: z.array(ActionRequestSchema),
  runId: z.string().uuid(),
});
export type AgentTurnResult = z.infer<typeof AgentTurnResultSchema>;

export const AgentIntentSchema = z.object({
  intent: z.enum([
    "answer",
    "deal_lookup",
    "property_research",
    "knowledge_lookup",
    "writing",
    "calendar",
    "contact",
    "email",
    "checklist",
    "task",
    "memory",
    "history",
    "approval",
    "other",
  ]),
  needsKnowledge: z.boolean(),
  needsMemory: z.boolean(),
  dealAddressHint: z.string().nullable(),
  requestedMutation: z.boolean(),
});
export type AgentIntent = z.infer<typeof AgentIntentSchema>;
