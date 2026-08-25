import { schemaTask } from "@trigger.dev/sdk";
import { z } from "zod";
import { writeAudit } from "@/lib/audit";
import { DealFieldsSchema } from "@/lib/contracts/deal";
import { createServiceClient } from "@/lib/db/server";
import { writeContractEvidence } from "@/lib/deal-crm";
import { buildChecklistRows, buildStandardChecklist } from "@/lib/deal-events";

// Repairs deterministic artifacts from already-saved deal facts. This task
// never calls a model and never creates a deal, so it is safe to retry.
export const repairDealArtifacts = schemaTask({
  id: "repair-deal-artifacts",
  schema: z.object({ documentId: z.string().uuid() }),
  run: async ({ documentId }) => {
    const db = createServiceClient();
    const { data: document, error: documentError } = await db
      .from("documents")
      .select("id, office_id, agent_id, deal_id")
      .eq("id", documentId)
      .single();
    if (documentError || !document?.deal_id) {
      throw new Error(`linked document not found: ${documentError?.message ?? "no deal"}`);
    }
    const { data: deal, error: dealError } = await db
      .from("deals")
      .select("id, parsed_fields")
      .eq("id", document.deal_id)
      .single();
    if (dealError || !deal) throw new Error(`deal not found: ${dealError?.message}`);

    const fields = DealFieldsSchema.parse(deal.parsed_fields);
    const context = {
      db,
      officeId: document.office_id as string,
      agentId: document.agent_id as string,
    };
    const evidenceCount = await writeContractEvidence(context, deal.id, document.id, fields);
    const { count: existingChecklistCount, error: checklistLookupError } = await db
      .from("checklist_items")
      .select("id", { count: "exact", head: true })
      .eq("deal_id", deal.id);
    if (checklistLookupError) throw new Error(`checklist lookup failed: ${checklistLookupError.message}`);
    const checklistRows = buildChecklistRows(
      buildStandardChecklist(fields),
      fields,
      { officeId: context.officeId, agentId: context.agentId, dealId: deal.id }
    );
    if (!existingChecklistCount && checklistRows.length) {
      const { error } = await db.from("checklist_items").insert(checklistRows);
      if (error) throw new Error(`checklist repair failed: ${error.message}`);
    }
    await writeAudit(db, {
      officeId: context.officeId,
      actor: "harriett",
      agentId: context.agentId,
      dealId: deal.id,
      action: "deal.artifacts_repaired",
      payload: {
        documentId,
        evidenceAdded: evidenceCount,
        checklistAdded: existingChecklistCount ? 0 : checklistRows.length,
      },
    });
    return {
      dealId: deal.id,
      evidenceAdded: evidenceCount,
      checklistAdded: existingChecklistCount ? 0 : checklistRows.length,
    };
  },
});
