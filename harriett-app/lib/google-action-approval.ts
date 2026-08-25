import { tasks } from "@trigger.dev/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { canApproveAction } from "@/lib/ai/policy";
import { writeAudit } from "@/lib/audit";
import type { executeGoogleAction } from "@/trigger/google-actions";

export async function decideGoogleAction(input: {
  db: SupabaseClient;
  officeId: string;
  actorAgentId: string;
  actorUserId?: string;
  actorRole: "broker" | "agent" | "coordinator";
  actionRequestId: string;
  decision: "approve" | "reject";
  reason?: string;
}) {
  const actionRequestId = z.string().uuid().parse(input.actionRequestId);
  const { data: action, error } = await input.db
    .from("action_requests")
    .select("id, office_id, agent_id, skill_name, status, required_approver, expires_at")
    .eq("id", actionRequestId)
    .eq("office_id", input.officeId)
    .single();
  if (error || !action) throw new Error("action was not found");
  if (action.expires_at && Date.parse(action.expires_at) <= Date.now()) throw new Error("action approval has expired");
  if (action.status !== "proposed") throw new Error(`action is already ${action.status}`);

  let delegated = false;
  if (action.required_approver === "broker" && input.actorRole !== "broker") {
    const now = new Date().toISOString();
    const { data: delegation } = await input.db
      .from("approval_delegations")
      .select("id")
      .eq("office_id", input.officeId)
      .eq("delegate_agent_id", input.actorAgentId)
      .eq("capability", "consumer_email")
      .eq("active", true)
      .lte("starts_at", now)
      .or(`ends_at.is.null,ends_at.gt.${now}`)
      .limit(1)
      .maybeSingle();
    delegated = Boolean(delegation);
  }
  if (!canApproveAction({
    requiredApprover: action.required_approver,
    actionAgentId: action.agent_id,
    actorAgentId: input.actorAgentId,
    actorRole: input.actorRole,
    delegated,
  })) {
    throw new Error("you are not allowed to decide this action");
  }

  const now = new Date().toISOString();
  if (input.decision === "reject") {
    const { data: rejected, error: rejectError } = await input.db
      .from("action_requests")
      .update({ status: "rejected", rejection_reason: input.reason?.slice(0, 1_000) || null, updated_at: now })
      .eq("id", action.id)
      .eq("status", "proposed")
      .select("id")
      .maybeSingle();
    if (rejectError || !rejected) throw new Error(`action could not be rejected: ${rejectError?.message ?? "status changed"}`);
    await writeAudit(input.db, {
      officeId: input.officeId,
      actor: "user",
      actorId: input.actorUserId,
      agentId: input.actorAgentId,
      action: "google.action_rejected",
      payload: { actionRequestId: action.id, action: action.skill_name, reason: input.reason ?? null },
    });
    return { actionRequestId: action.id, status: "rejected" as const };
  }

  const { data: approved, error: approveError } = await input.db
    .from("action_requests")
    .update({ status: "approved", approved_by: input.actorAgentId, approved_at: now, updated_at: now })
    .eq("id", action.id)
    .eq("status", "proposed")
    .select("id")
    .maybeSingle();
  if (approveError || !approved) throw new Error(`action could not be approved: ${approveError?.message ?? "status changed"}`);
  await writeAudit(input.db, {
    officeId: input.officeId,
    actor: "user",
    actorId: input.actorUserId,
    agentId: input.actorAgentId,
    action: "google.action_approved",
    payload: { actionRequestId: action.id, action: action.skill_name },
  });
  const run = await tasks.trigger<typeof executeGoogleAction>(
    "execute-google-action",
    { actionRequestId: action.id },
    { idempotencyKey: ["google-action", action.id], idempotencyKeyTTL: "30d" }
  );
  return { actionRequestId: action.id, status: "approved" as const, runId: run.id };
}
