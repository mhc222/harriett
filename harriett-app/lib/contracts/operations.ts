import { z } from "zod";

const OptionalIsoDateTime = z.string().datetime({ offset: true }).nullable();

export const MeetingNextStepSchema = z.object({
  title: z.string().trim().min(1).max(240),
  detail: z.string().trim().max(1_500).nullable(),
  owner: z.string().trim().max(120).nullable(),
  dueAt: OptionalIsoDateTime,
  priority: z.enum(["low", "normal", "high", "urgent"]),
});

export const MeetingSummarySchema = z.object({
  title: z.string().trim().min(1).max(160),
  summary: z.string().trim().min(1).max(4_000),
  attendees: z.array(z.string().trim().min(1).max(160)).max(30),
  topics: z.array(z.string().trim().min(1).max(300)).max(30),
  decisions: z.array(z.string().trim().min(1).max(500)).max(30),
  nextSteps: z.array(MeetingNextStepSchema).max(30),
  followUpQuestions: z.array(z.string().trim().min(1).max(500)).max(20),
  contactFacts: z.array(z.object({
    fact: z.string().trim().min(1).max(500),
    confidence: z.enum(["stated", "inferred"]),
  })).max(30),
});

export const DealWorkflowSchema = z.enum([
  "marketing_materials",
  "photo_coordination",
  "document_drafting",
]);

export const WorkflowWorkItemSchema = z.object({
  title: z.string().trim().min(1).max(240),
  detail: z.string().trim().max(1_500).nullable(),
  dueAt: OptionalIsoDateTime,
  priority: z.enum(["low", "normal", "high", "urgent"]),
});

export const DealWorkflowOutputSchema = z.object({
  title: z.string().trim().min(1).max(160),
  plainText: z.string().trim().min(1).max(12_000),
  sections: z.array(z.object({
    heading: z.string().trim().min(1).max(160),
    body: z.string().trim().min(1).max(4_000),
  })).min(1).max(16),
  factsUsed: z.array(z.string().trim().min(1).max(500)).max(30),
  factsToVerify: z.array(z.string().trim().min(1).max(500)).max(30),
  workItems: z.array(WorkflowWorkItemSchema).max(20),
});

export type MeetingSummary = z.infer<typeof MeetingSummarySchema>;
export type DealWorkflow = z.infer<typeof DealWorkflowSchema>;
export type DealWorkflowOutput = z.infer<typeof DealWorkflowOutputSchema>;
