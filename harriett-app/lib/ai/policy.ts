import type {
  ApprovalContext,
  RecipientKind,
  RequiredApprover,
  SkillRisk,
} from "@/lib/contracts/skills";

export interface ActionPolicyInput extends ApprovalContext {
  risk: SkillRisk;
  channel?: "sms" | "whatsapp" | "email" | "calendar" | "contact" | "internal" | "voice";
  recipientKind?: RecipientKind;
}

export function requiredApproval(input: ActionPolicyInput): RequiredApprover | "prohibited" {
  if (input.recipientKind === "consumer" && input.channel === "sms") return "prohibited";
  if (input.recipientKind === "vendor" && input.channel === "sms") return "prohibited";
  if (input.recipientKind === "consumer" && input.channel === "whatsapp") return "prohibited";
  if (input.recipientKind === "vendor" && input.channel === "whatsapp") return "prohibited";
  if (input.recipientKind === "consumer" && input.channel === "voice") return "prohibited";

  if (input.recipientKind === "consumer") return "broker";
  if (input.risk === "restricted") return "prohibited";
  if (input.risk === "read") return "none";

  if (input.channel === "email") {
    if (input.emailMode === "limited_enabled") return "none";
    return "agent";
  }

  if (input.channel === "calendar" || input.channel === "contact") {
    return input.actionPermission === "auto" ? "none" : "agent";
  }

  return input.risk === "internal_write" ? "none" : "agent";
}

export function canApproveAction(opts: {
  requiredApprover: RequiredApprover;
  actionAgentId: string;
  actorAgentId: string;
  actorRole: "broker" | "agent" | "coordinator";
  delegated?: boolean;
}): boolean {
  if (opts.requiredApprover === "none") return true;
  if (opts.requiredApprover === "agent") return opts.actionAgentId === opts.actorAgentId;
  return opts.actorRole === "broker" || Boolean(opts.delegated);
}

export function assertChannelAllowed(input: ActionPolicyInput): void {
  const result = requiredApproval(input);
  if (result === "prohibited") {
    throw new Error("This communication or action is prohibited by Harriett policy");
  }
}
