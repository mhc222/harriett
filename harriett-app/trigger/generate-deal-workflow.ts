import { schemaTask } from "@trigger.dev/sdk";
import { z } from "zod";
import { generateStructured } from "@/lib/ai/generate";
import { writeAudit } from "@/lib/audit";
import {
  DealWorkflowOutputSchema,
  DealWorkflowSchema,
  type DealWorkflow,
} from "@/lib/contracts/operations";
import { createServiceClient } from "@/lib/db/server";
import {
  completeWorkflowTrace,
  failWorkflowTrace,
  recordWorkflowEvent,
} from "@/lib/execution-trace";

const WORKFLOW_CONFIG: Record<DealWorkflow, {
  artifactKind: "marketing_copy" | "photo_coordination_plan" | "document_draft";
  workKind: "marketing" | "photo_coordination" | "document_drafting";
  instructions: string;
}> = {
  marketing_materials: {
    artifactKind: "marketing_copy",
    workKind: "marketing",
    instructions: `Create a review-ready real-estate marketing package from verified public property facts only.
Include a concise headline, short listing description, longer description, feature bullets, and suggested calls to action.
Never include consumer names, private contract terms, lockbox information, or unverified claims.
Only assert a recorded public fact when matching support appears in verifiedEvidence. Treat every other recorded value as a candidate that belongs in factsToVerify.
Put every missing or uncertain fact in factsToVerify. Do not invent superlatives, school claims, measurements, or neighborhood claims.
The result is a draft. It must not claim to be published or approved.`,
  },
  photo_coordination: {
    artifactKind: "photo_coordination_plan",
    workKind: "photo_coordination",
    instructions: `Create a practical photography coordination plan for a real-estate listing.
Include property-readiness checks, access details that still need confirmation, suggested shot priorities, vendor selection, scheduling questions, and delivery handoff.
Use provided preferred vendors as candidates, but do not claim anyone was contacted or booked.
Create concrete work items for the steps a person must complete. Never expose lockbox codes or private consumer details.`,
  },
  document_drafting: {
    artifactKind: "document_draft",
    workKind: "document_drafting",
    instructions: `Create the requested internal real-estate operations document from verified transaction facts.
This is an internal draft for human and broker review. Do not create or impersonate a signed legal form, give legal advice, or say the document is compliant.
Clearly label missing facts and review points. Preserve exact dates and amounts when supplied. Create work items for unresolved facts or required review.`,
  },
};

function publicMarketingFacts(
  deal: Record<string, unknown>,
  evidence: Array<Record<string, unknown>>
): Record<string, unknown> {
  const parsed = z.record(z.string(), z.unknown()).safeParse(deal.parsed_fields);
  const allowed = [
    "propertyType", "bedBath", "sqft", "yearBuilt", "mlsNumber", "parcelId",
    "subdivision", "appurtenances",
  ];
  const allowedEvidence = new Set([
    "address", "city", "state", "zip", "county", "listPrice", "listingDate",
    ...allowed,
  ]);
  return {
    verifiedEvidence: evidence.filter((item) => typeof item.field_name === "string" && allowedEvidence.has(item.field_name)),
    recordedPublicFacts: {
      address: deal.address,
      city: deal.city,
      state: deal.state,
      zip: deal.zip,
      county: deal.county,
      status: deal.status,
      listPrice: deal.list_price,
      listingDate: deal.listing_date,
      property: parsed.success
        ? Object.fromEntries(allowed.flatMap((key) => parsed.data[key] == null ? [] : [[key, parsed.data[key]]]))
        : {},
    },
  };
}

export const generateDealWorkflow = schemaTask({
  id: "generate-deal-workflow",
  schema: z.object({ workflowRunId: z.string().uuid() }),
  run: async ({ workflowRunId }) => {
    const db = createServiceClient();
    const { data: run, error: runError } = await db.from("workflow_runs")
      .select("id,office_id,agent_id,deal_id,workflow,state,status")
      .eq("id", workflowRunId)
      .single();
    if (runError || !run) throw new Error(`workflow run not found: ${runError?.message}`);
    const workflow = DealWorkflowSchema.parse(run.workflow);
    if (!run.agent_id || !run.deal_id) throw new Error("deal workflow is missing its agent or deal");
    if (run.status === "completed") return { workflowRunId, replay: true };
    const config = WORKFLOW_CONFIG[workflow];

    const [{ data: deal, error: dealError }, { data: evidence }, { data: vendors }] = await Promise.all([
      db.from("deals")
        .select("id,property_id,address,city,state,zip,county,status,list_price,sale_price,listing_date,contract_acceptance_date,closing_date,parsed_fields")
        .eq("id", run.deal_id)
        .eq("office_id", run.office_id)
        .single(),
      db.from("deal_field_evidence")
        .select("field_name,value,confidence,status")
        .eq("deal_id", run.deal_id)
        .in("status", ["extracted", "confirmed"]),
      workflow === "photo_coordination"
        ? db.from("vendors").select("id,name,type,contact,phone,email,preferred,notes")
          .eq("agent_id", run.agent_id)
          .or("type.ilike.%photo%,type.ilike.%media%")
          .order("preferred", { ascending: false })
          .limit(10)
        : Promise.resolve({ data: [] as Record<string, unknown>[], error: null }),
    ]);
    if (dealError || !deal) throw new Error(`workflow deal not found: ${dealError?.message}`);

    try {
      const startedAt = new Date().toISOString();
      const { error: startError } = await db.from("workflow_runs").update({
        status: "running",
        started_at: startedAt,
        updated_at: startedAt,
      }).eq("id", workflowRunId);
      if (startError) throw new Error(`workflow start failed: ${startError.message}`);
      await recordWorkflowEvent(db, run.office_id, workflowRunId, "artifact.generation_started", { workflow });

      const state = z.record(z.string(), z.unknown()).parse(run.state ?? {});
      const facts = workflow === "marketing_materials"
        ? publicMarketingFacts(deal, (evidence ?? []) as Array<Record<string, unknown>>)
        : { deal, evidence: evidence ?? [] };
      const output = await generateStructured({
        schema: DealWorkflowOutputSchema,
        system: `${config.instructions}\n\nUse plain English. Do not use em dashes. Return useful work, not a description of what you would do.`,
        content: JSON.stringify({ request: state, verifiedFacts: facts, preferredVendorCandidates: vendors ?? [] }),
        tier: "standard",
        maxOutputTokens: 6_000,
      });

      const { data: artifact, error: artifactError } = await db.from("artifacts").upsert({
        office_id: run.office_id,
        agent_id: run.agent_id,
        property_id: deal.property_id,
        deal_id: deal.id,
        workflow_run_id: workflowRunId,
        kind: config.artifactKind,
        title: output.title,
        status: "ready_for_review",
        plain_text: output.plainText,
        content: {
          workflow,
          request: state,
          sections: output.sections,
          facts_used: output.factsUsed,
          facts_to_verify: output.factsToVerify,
          automatic_external_action: false,
        },
        updated_at: new Date().toISOString(),
      }, { onConflict: "workflow_run_id" }).select("id").single();
      if (artifactError || !artifact) throw new Error(`workflow artifact save failed: ${artifactError?.message}`);

      for (const [index, item] of output.workItems.entries()) {
        const { error } = await db.from("work_items").upsert({
          office_id: run.office_id,
          owner_agent_id: run.agent_id,
          assigned_agent_id: run.agent_id,
          property_id: deal.property_id,
          deal_id: deal.id,
          artifact_id: artifact.id,
          workflow_run_id: workflowRunId,
          workflow_step_key: `work-${index + 1}`,
          kind: config.workKind,
          title: item.title,
          detail: item.detail,
          priority: item.priority,
          due_at: item.dueAt,
          updated_at: new Date().toISOString(),
        }, { onConflict: "workflow_run_id,workflow_step_key" });
        if (error) throw new Error(`workflow work item save failed: ${error.message}`);
      }
      const expectedStepKeys = output.workItems.map((_, index) => `work-${index + 1}`);
      const { data: existingWork } = await db.from("work_items")
        .select("id,workflow_step_key")
        .eq("workflow_run_id", workflowRunId);
      const staleIds = (existingWork ?? [])
        .filter((item) => item.workflow_step_key && !expectedStepKeys.includes(item.workflow_step_key))
        .map((item) => item.id);
      if (staleIds.length) {
        const { error } = await db.from("work_items").delete().in("id", staleIds);
        if (error) throw new Error(`stale workflow work cleanup failed: ${error.message}`);
      }

      await completeWorkflowTrace(db, run.office_id, workflowRunId, {
        ...state,
        artifactId: artifact.id,
        workItemCount: output.workItems.length,
        factsToVerifyCount: output.factsToVerify.length,
      });
      await writeAudit(db, {
        officeId: run.office_id,
        actor: "harriett",
        agentId: run.agent_id,
        dealId: run.deal_id,
        action: `workflow.${workflow}.completed`,
        payload: {
          workflowRunId,
          artifactId: artifact.id,
          workItemCount: output.workItems.length,
          automaticExternalAction: false,
        },
      });
      return { workflowRunId, artifactId: artifact.id, workItemCount: output.workItems.length };
    } catch (error) {
      await failWorkflowTrace(db, run.office_id, workflowRunId, error, { workflow });
      await writeAudit(db, {
        officeId: run.office_id,
        actor: "harriett",
        agentId: run.agent_id,
        dealId: run.deal_id,
        action: `workflow.${workflow}.failed`,
        payload: { workflowRunId, error: error instanceof Error ? error.message.slice(0, 500) : "unknown" },
      });
      throw error;
    }
  },
});
