import type { SupabaseClient } from "@supabase/supabase-js";
import type { SkillRisk } from "@/lib/contracts/skills";

function errorCode(error: unknown): string {
  if (error instanceof Error && "code" in error && typeof error.code === "string") {
    return error.code;
  }
  return error instanceof Error ? error.name : "unknown";
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message.slice(0, 500) : String(error).slice(0, 500);
}

export interface SkillTraceContext {
  db: SupabaseClient;
  officeId: string;
  agentId: string;
  aiRunId?: string;
  dealId?: string;
}

export async function withSkillTrace<T>(
  context: SkillTraceContext,
  definition: {
    name: string;
    version: string;
    risk: SkillRisk;
    input: unknown;
  },
  execute: () => Promise<T>
): Promise<T> {
  const { data: run, error: insertError } = await context.db
    .from("skill_runs")
    .insert({
      office_id: context.officeId,
      agent_id: context.agentId,
      deal_id: context.dealId ?? null,
      ai_run_id: context.aiRunId ?? null,
      skill_name: definition.name,
      skill_version: definition.version,
      risk: definition.risk,
      status: "running",
      input: definition.input,
    })
    .select("id")
    .single();
  if (insertError || !run) throw new Error(`skill trace start failed: ${insertError?.message}`);

  try {
    const output = await execute();
    const { error: updateError } = await context.db
      .from("skill_runs")
      .update({ status: "completed", output, completed_at: new Date().toISOString() })
      .eq("id", run.id);
    if (updateError) throw new Error(`skill trace completion failed: ${updateError.message}`);
    return output;
  } catch (error) {
    const { error: updateError } = await context.db
      .from("skill_runs")
      .update({
        status: "failed",
        error_code: errorCode(error),
        completed_at: new Date().toISOString(),
      })
      .eq("id", run.id);
    if (updateError) {
      throw new AggregateError(
        [error, new Error(`skill trace failure update failed: ${updateError.message}`)],
        "skill execution and trace update failed"
      );
    }
    throw error;
  }
}

export interface ProviderSyncContext {
  db: SupabaseClient;
  officeId: string;
  provider: string;
  direction?: "pull" | "push" | "webhook";
}

export async function withProviderSyncTrace<T>(
  context: ProviderSyncContext,
  execute: () => Promise<T>,
  counts: (result: T) => { receivedCount: number; changedCount: number; conflictCount?: number }
): Promise<T> {
  const { data: run, error: insertError } = await context.db
    .from("provider_sync_runs")
    .insert({
      office_id: context.officeId,
      provider: context.provider,
      direction: context.direction ?? "pull",
      status: "running",
    })
    .select("id")
    .single();
  if (insertError || !run) {
    throw new Error(`provider sync trace start failed: ${insertError?.message}`);
  }

  try {
    const result = await execute();
    const summary = counts(result);
    const { error: updateError } = await context.db
      .from("provider_sync_runs")
      .update({
        status: "completed",
        received_count: summary.receivedCount,
        changed_count: summary.changedCount,
        conflict_count: summary.conflictCount ?? 0,
        completed_at: new Date().toISOString(),
      })
      .eq("id", run.id);
    if (updateError) throw new Error(`provider sync trace completion failed: ${updateError.message}`);
    return result;
  } catch (error) {
    const { error: updateError } = await context.db
      .from("provider_sync_runs")
      .update({
        status: "failed",
        error_code: errorCode(error),
        error_message: errorMessage(error),
        completed_at: new Date().toISOString(),
      })
      .eq("id", run.id);
    if (updateError) {
      throw new AggregateError(
        [error, new Error(`provider sync trace failure update failed: ${updateError.message}`)],
        "provider synchronization and trace update failed"
      );
    }
    throw error;
  }
}

export interface WorkflowTrace {
  id: string;
  replay: boolean;
}

export async function startWorkflowTrace(
  db: SupabaseClient,
  input: {
    officeId: string;
    agentId?: string;
    dealId?: string;
    workflow: string;
    version: string;
    idempotencyKey: string;
    state?: Record<string, unknown>;
  }
): Promise<WorkflowTrace> {
  const { data: existing, error: selectError } = await db
    .from("workflow_runs")
    .select("id, status")
    .eq("idempotency_key", input.idempotencyKey)
    .maybeSingle();
  if (selectError) throw new Error(`workflow trace lookup failed: ${selectError.message}`);

  let runId: string;
  const replay = Boolean(existing);
  if (existing) {
    runId = existing.id;
    if (existing.status !== "completed") {
      const { error: updateError } = await db
        .from("workflow_runs")
        .update({
          status: "running",
          state: input.state ?? {},
          started_at: new Date().toISOString(),
          completed_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", runId);
      if (updateError) throw new Error(`workflow trace restart failed: ${updateError.message}`);
    }
  } else {
    const { data: created, error: insertError } = await db
      .from("workflow_runs")
      .insert({
        office_id: input.officeId,
        agent_id: input.agentId ?? null,
        deal_id: input.dealId ?? null,
        workflow: input.workflow,
        version: input.version,
        status: "running",
        state: input.state ?? {},
        idempotency_key: input.idempotencyKey,
        started_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (insertError || !created) {
      throw new Error(`workflow trace start failed: ${insertError?.message}`);
    }
    runId = created.id;
  }

  await recordWorkflowEvent(db, input.officeId, runId, replay ? "workflow.replayed" : "workflow.started", {
    idempotencyKey: input.idempotencyKey,
  });
  return { id: runId, replay };
}

export async function recordWorkflowEvent(
  db: SupabaseClient,
  officeId: string,
  workflowRunId: string,
  event: string,
  payload?: Record<string, unknown>
): Promise<void> {
  const { error } = await db.from("workflow_events").insert({
    office_id: officeId,
    workflow_run_id: workflowRunId,
    event,
    payload: payload ?? null,
  });
  if (error) throw new Error(`workflow event ${event} failed: ${error.message}`);
}

export async function completeWorkflowTrace(
  db: SupabaseClient,
  officeId: string,
  workflowRunId: string,
  state: Record<string, unknown>
): Promise<void> {
  const completedAt = new Date().toISOString();
  const { error } = await db
    .from("workflow_runs")
    .update({ status: "completed", state, completed_at: completedAt, updated_at: completedAt })
    .eq("id", workflowRunId);
  if (error) throw new Error(`workflow trace completion failed: ${error.message}`);
  await recordWorkflowEvent(db, officeId, workflowRunId, "workflow.completed", state);
}

export async function failWorkflowTrace(
  db: SupabaseClient,
  officeId: string,
  workflowRunId: string,
  error: unknown,
  state: Record<string, unknown>
): Promise<void> {
  const completedAt = new Date().toISOString();
  const failureState = { ...state, errorCode: errorCode(error), error: errorMessage(error) };
  const { error: updateError } = await db
    .from("workflow_runs")
    .update({
      status: "failed",
      state: failureState,
      completed_at: completedAt,
      updated_at: completedAt,
    })
    .eq("id", workflowRunId);
  if (updateError) throw new Error(`workflow trace failure update failed: ${updateError.message}`);
  await recordWorkflowEvent(db, officeId, workflowRunId, "workflow.failed", failureState);
}
