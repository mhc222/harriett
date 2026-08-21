import type { SupabaseClient } from "@supabase/supabase-js";
import type { z } from "zod";
import type { AgentChannel } from "./agent";

export type SkillRisk = "read" | "internal_write" | "external_write" | "restricted";
export type RequiredApprover = "agent" | "broker" | "none";
export type RecipientKind = "internal" | "agent" | "vendor" | "consumer";

export interface SkillContext {
  db: SupabaseClient;
  officeId: string;
  agentId: string;
  role: "broker" | "agent" | "coordinator";
  channel: AgentChannel;
  aiRunId: string;
  dealId?: string;
}

export interface ApprovalContext {
  recipientKind?: RecipientKind;
  emailMode?: "draft_only" | "agent_confirm_before_send" | "limited_enabled";
  actionPermission?: "auto" | "confirm";
}

export interface SkillDefinition<I, O> {
  name: string;
  version: string;
  description: string;
  inputSchema: z.ZodType<I>;
  outputSchema: z.ZodType<O>;
  risk: SkillRisk;
  approvalPolicy: (input: I, context: ApprovalContext) => RequiredApprover | "prohibited";
  execute: (input: I, context: SkillContext) => Promise<O>;
}

