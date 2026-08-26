import { z } from "zod";
import { PostgresUuidSchema } from "@/lib/contracts/scalars";

export const ConversationLaneSchema = z.enum(["reflex", "fast", "standard", "durable"]);
export type ConversationLane = z.infer<typeof ConversationLaneSchema>;

export const ConversationModelTierSchema = z.enum(["none", "fast", "standard", "fallback"]);
export type ConversationModelTier = z.infer<typeof ConversationModelTierSchema>;

export const ConversationAcknowledgementPolicySchema = z.enum([
  "none",
  "typing_only",
  "message_if_slow",
]);
export type ConversationAcknowledgementPolicy = z.infer<
  typeof ConversationAcknowledgementPolicySchema
>;

export const ConversationRouteSchema = z.object({
  lane: ConversationLaneSchema,
  intent: z.string().min(1),
  reasonCode: z.string().min(1),
  modelTier: ConversationModelTierSchema,
  allowedToolNames: z.array(z.string()),
  acknowledgementPolicy: ConversationAcknowledgementPolicySchema,
  quickBudgetMs: z.number().int().positive().optional(),
});
export type ConversationRoute = z.infer<typeof ConversationRouteSchema>;

export const ConversationTurnStatusSchema = z.enum([
  "received",
  "running",
  "waiting",
  "completed",
  "failed",
  "cancelled",
]);
export type ConversationTurnStatus = z.infer<typeof ConversationTurnStatusSchema>;

export const ConversationTurnReceiptSchema = z.object({
  turnId: PostgresUuidSchema,
  correlationId: PostgresUuidSchema,
  status: ConversationTurnStatusSchema,
  lane: ConversationLaneSchema,
  userMessage: z.string().optional(),
  artifactUrl: z.string().url().optional(),
  actionRequestId: PostgresUuidSchema.optional(),
});
export type ConversationTurnReceipt = z.infer<typeof ConversationTurnReceiptSchema>;

export const ConversationEventNameSchema = z.enum([
  "message.received",
  "webhook.verified",
  "message.persisted",
  "turn.routed",
  "typing.requested",
  "typing.confirmed",
  "typing.failed",
  "acknowledgement.sent",
  "context.started",
  "context.completed",
  "model.started",
  "model.first_token",
  "model.completed",
  "tool.started",
  "tool.completed",
  "tool.failed",
  "workflow.enqueued",
  "reply.created",
  "provider.accepted",
  "provider.delivered",
  "provider.read",
  "provider.failed",
  "turn.completed",
  "turn.failed",
]);
export type ConversationEventName = z.infer<typeof ConversationEventNameSchema>;
