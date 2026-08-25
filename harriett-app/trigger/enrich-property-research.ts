import { schemaTask, wait } from "@trigger.dev/sdk";
import { z } from "zod";
import { writeAudit } from "@/lib/audit";
import { createServiceClient } from "@/lib/db/server";
import {
  brightDataRecordsToCmaComparables,
  downloadBrightDataSnapshot,
} from "@/lib/integrations/bright-data";
import { PropertyValueEstimateSchema } from "@/lib/integrations/rentcast";

export const enrichPropertyResearch = schemaTask({
  id: "enrich-property-research",
  schema: z.object({
    brightDataResearchId: z.string().uuid(),
    sourceResearchId: z.string().uuid(),
    snapshotId: z.string().min(1),
  }),
  run: async ({ brightDataResearchId, sourceResearchId, snapshotId }) => {
    const db = createServiceClient();
    const [{ data: enrichment }, { data: source }] = await Promise.all([
      db
        .from("property_research_runs")
        .select("id, office_id, agent_id, property_id")
        .eq("id", brightDataResearchId)
        .single(),
      db
        .from("property_research_runs")
        .select("id, result, source_observed_at")
        .eq("id", sourceResearchId)
        .single(),
    ]);
    if (!enrichment || !source) throw new Error("Bright Data or source research was not found");
    const estimate = PropertyValueEstimateSchema.parse(source.result);

    try {
      for (let attempt = 1; attempt <= 20; attempt += 1) {
        const snapshot = await downloadBrightDataSnapshot(snapshotId);
        if (snapshot.status === "pending") {
          if (attempt === 20) throw new Error("Bright Data snapshot did not complete within five minutes");
          await wait.for({ seconds: 15 });
          continue;
        }

        const comparables = brightDataRecordsToCmaComparables(
          snapshot.records,
          estimate.subjectProperty,
          source.source_observed_at
        );
        const { error: updateError } = await db
          .from("property_research_runs")
          .update({
            status: "completed",
            result: {
              snapshotId,
              sourceResearchId,
              observedRecordCount: snapshot.records.length,
              comparables,
            },
            summary: `Bright Data returned ${comparables.length} portal-observed sold candidates for CMA review.`,
            provider_call_count: attempt + 1,
            confidence_flags: ["portal_observed", "mls_verification_required", "photo_reuse_not_authorized"],
          })
          .eq("id", brightDataResearchId);
        if (updateError) throw new Error(`Bright Data research update failed: ${updateError.message}`);

        await writeAudit(db, {
          officeId: enrichment.office_id,
          actor: "system",
          agentId: enrichment.agent_id,
          action: "property.bright_data_enrichment_completed",
          payload: {
            researchId: brightDataResearchId,
            sourceResearchId,
            propertyId: enrichment.property_id,
            snapshotId,
            observedRecordCount: snapshot.records.length,
            comparableCount: comparables.length,
            pollCount: attempt,
          },
        });
        return { researchId: brightDataResearchId, comparableCount: comparables.length };
      }
      throw new Error("Bright Data snapshot polling ended unexpectedly");
    } catch (error) {
      await db
        .from("property_research_runs")
        .update({ status: "failed", summary: "Bright Data enrichment failed." })
        .eq("id", brightDataResearchId);
      await writeAudit(db, {
        officeId: enrichment.office_id,
        actor: "system",
        agentId: enrichment.agent_id,
        action: "property.bright_data_enrichment_failed",
        payload: {
          researchId: brightDataResearchId,
          sourceResearchId,
          propertyId: enrichment.property_id,
          errorCode: error instanceof Error ? error.name : "unknown",
        },
      });
      throw error;
    }
  },
});
