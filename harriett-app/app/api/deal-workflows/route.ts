import { tasks } from "@trigger.dev/sdk";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticatedContext } from "@/lib/auth-context";
import { writeAudit } from "@/lib/audit";
import { DealWorkflowSchema } from "@/lib/contracts/operations";
import { createUserClient } from "@/lib/db/server";
import type { generateDealWorkflow } from "@/trigger/generate-deal-workflow";

const WorkflowInputSchema = z.object({
  workflow: DealWorkflowSchema,
  dealId: z.string().uuid(),
  brief: z.string().trim().max(4_000).default(""),
  documentType: z.enum(["transaction_summary", "vendor_brief", "broker_review_memo", "custom"]).optional(),
});

export async function POST(request: Request) {
  const db = await createUserClient();
  const auth = await authenticatedContext(db);
  if (!auth) return NextResponse.json({ error: "Your session expired. Sign in and try again." }, { status: 401 });
  const body = await request.json().catch(() => null);
  const parsed = WorkflowInputSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Choose a transaction and valid workflow details." }, { status: 400 });
  const input = parsed.data;

  const { data: deal } = await db.from("deals").select("id").eq("id", input.dealId).single();
  if (!deal) return NextResponse.json({ error: "That transaction could not be found." }, { status: 404 });

  const { data: workflowRun, error: insertError } = await db.from("workflow_runs").insert({
    office_id: auth.officeId,
    agent_id: auth.agentId,
    deal_id: input.dealId,
    workflow: input.workflow,
    version: "1",
    status: "queued",
    state: { brief: input.brief || null, documentType: input.documentType ?? null },
    idempotency_key: `deal-workflow:${input.workflow}:${input.dealId}:${crypto.randomUUID()}`,
  }).select("id").single();
  if (insertError || !workflowRun) {
    return NextResponse.json({ error: "The workflow could not be started." }, { status: 500 });
  }
  await writeAudit(db, {
    officeId: auth.officeId,
    actor: "user",
    actorId: auth.user.id,
    agentId: auth.agentId,
    dealId: input.dealId,
    action: `workflow.${input.workflow}.requested`,
    payload: { workflowRunId: workflowRun.id, documentType: input.documentType ?? null },
  });
  try {
    const run = await tasks.trigger<typeof generateDealWorkflow>(
      "generate-deal-workflow",
      { workflowRunId: workflowRun.id },
      { idempotencyKey: `deal-workflow:${workflowRun.id}`, idempotencyKeyTTL: "30d", concurrencyKey: auth.agentId }
    );
    return NextResponse.json({ ok: true, workflowRunId: workflowRun.id, runId: run.id }, { status: 202 });
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 500) : "workflow dispatch failed";
    await db.from("workflow_runs").update({ status: "failed", updated_at: new Date().toISOString() }).eq("id", workflowRun.id);
    await writeAudit(db, {
      officeId: auth.officeId,
      actor: "system",
      agentId: auth.agentId,
      dealId: input.dealId,
      action: `workflow.${input.workflow}.dispatch_failed`,
      payload: { workflowRunId: workflowRun.id, error: message },
    });
    return NextResponse.json({ error: "The request was saved, but the workflow could not start. Try again shortly." }, { status: 503 });
  }
}
