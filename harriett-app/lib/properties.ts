import type { SupabaseClient } from "@supabase/supabase-js";
import { writeAudit } from "@/lib/audit";
import { buildCmaPrep } from "@/lib/cma";
import {
  getPropertyValueEstimate,
  getSoldPropertyComparables,
  getSaleListing,
  searchSaleListings,
  type PropertySearchInput,
  type PropertyValueInput,
} from "@/lib/integrations/rentcast";
import { saveListingResearch, saveValuationResearch } from "@/lib/property-research";
import { withProviderSyncTrace } from "@/lib/execution-trace";

export interface PropertyAccessContext {
  db: SupabaseClient;
  officeId: string;
  agentId: string;
  actor: "harriett" | "user";
  actorId?: string;
  aiRunId?: string;
}

const SOURCE_NOTICE =
  "Public listing data from RentCast. Verify price, status and material facts in the MLS before relying on them.";

function errorCode(error: unknown): string {
  if (error instanceof Error && "code" in error && typeof error.code === "string") {
    return error.code;
  }
  return "unknown";
}

async function auditFailure(
  context: PropertyAccessContext,
  action: string,
  payload: Record<string, unknown>,
  error: unknown
): Promise<void> {
  await writeAudit(context.db, {
    officeId: context.officeId,
    actor: context.actor,
    actorId: context.actorId,
    agentId: context.agentId,
    action: `${action}.failed`,
    payload: { ...payload, provider: "rentcast", errorCode: errorCode(error) },
  });
}

export async function searchProperties(context: PropertyAccessContext, input: PropertySearchInput) {
  const auditPayload = {
    address: input.address,
    city: input.city,
    state: input.state,
    zipCode: input.zipCode,
    maxResults: input.maxResults,
  };
  try {
    const result = await withProviderSyncTrace(
      { db: context.db, officeId: context.officeId, provider: "rentcast" },
      async () => {
        const response = await searchSaleListings(input);
        await writeAudit(context.db, {
          officeId: context.officeId,
          actor: context.actor,
          actorId: context.actorId,
          agentId: context.agentId,
          action: "property.search",
          payload: {
            ...auditPayload,
            provider: "rentcast",
            resultCount: response.listings.length,
            totalCount: response.totalCount,
          },
        });
        return response;
      },
      (response) => ({ receivedCount: response.listings.length, changedCount: 0 })
    );
    return { ...result, source: "rentcast" as const, notice: SOURCE_NOTICE };
  } catch (error) {
    await auditFailure(context, "property.search", auditPayload, error);
    throw error;
  }
}

export async function lookupProperty(context: PropertyAccessContext, id: string) {
  try {
    const result = await withProviderSyncTrace(
      { db: context.db, officeId: context.officeId, provider: "rentcast" },
      async () => {
        const listing = await getSaleListing(id);
        const savedResearch = await saveListingResearch(context, listing, SOURCE_NOTICE);
        await writeAudit(context.db, {
          officeId: context.officeId,
          actor: context.actor,
          actorId: context.actorId,
          agentId: context.agentId,
          action: "property.lookup",
          payload: { provider: "rentcast", listingId: id, researchId: savedResearch.researchId },
        });
        return { listing, savedResearch };
      },
      () => ({ receivedCount: 1, changedCount: 1 })
    );
    return {
      listing: result.listing,
      source: "rentcast" as const,
      notice: SOURCE_NOTICE,
      ...result.savedResearch,
    };
  } catch (error) {
    await auditFailure(context, "property.lookup", { listingId: id }, error);
    throw error;
  }
}

export async function estimatePropertyValue(
  context: PropertyAccessContext,
  input: PropertyValueInput
) {
  try {
    const result = await withProviderSyncTrace(
      { db: context.db, officeId: context.officeId, provider: "rentcast" },
      async () => {
        const estimate = await getPropertyValueEstimate(input);
        const notice = `${SOURCE_NOTICE} This estimate is not an appraisal or a broker-approved CMA.`;
        const savedResearch = await saveValuationResearch(context, input, estimate, notice);
        await writeAudit(context.db, {
          officeId: context.officeId,
          actor: context.actor,
          actorId: context.actorId,
          agentId: context.agentId,
          action: "property.value_estimated",
          payload: {
            provider: "rentcast",
            address: input.address,
            comparableCount: estimate.comparables.length,
            researchId: savedResearch.researchId,
          },
        });
        return { estimate, notice, savedResearch };
      },
      () => ({ receivedCount: 1, changedCount: 1 })
    );
    return {
      estimate: result.estimate,
      source: "rentcast" as const,
      notice: result.notice,
      ...result.savedResearch,
    };
  } catch (error) {
    await auditFailure(context, "property.value_estimated", { address: input.address }, error);
    throw error;
  }
}

export async function preparePropertyCma(
  context: PropertyAccessContext,
  input: PropertyValueInput
) {
  const result = await estimatePropertyValue(context, input);
  const soldComparables = await withProviderSyncTrace(
    { db: context.db, officeId: context.officeId, provider: "rentcast" },
    () => getSoldPropertyComparables(input, result.estimate.subjectProperty),
    (comparables) => ({ receivedCount: comparables.length, changedCount: 0 })
  );
  const cmaPrep = buildCmaPrep(result.estimate, new Date().toISOString(), soldComparables);
  const { error: researchUpdateError } = await context.db
    .from("property_research_runs")
    .update({
      research_type: "cma_prep",
      result: { ...result.estimate, soldComparables },
      provider_call_count: 2,
    })
    .eq("id", result.researchId);
  if (researchUpdateError) {
    throw new Error(`CMA research update failed: ${researchUpdateError.message}`);
  }
  await writeAudit(context.db, {
    officeId: context.officeId,
    actor: context.actor,
    actorId: context.actorId,
    agentId: context.agentId,
    action: "property.cma_prepared",
    payload: {
      researchId: result.researchId,
      propertyId: result.propertyId,
      methodologyVersion: cmaPrep.methodologyVersion,
      confidenceScore: cmaPrep.confidence.score,
      includedCount: cmaPrep.counts.included,
      soldComparableCount: soldComparables.length,
      reviewCount: cmaPrep.counts.review,
      excludedCount: cmaPrep.counts.excluded,
    },
  });
  return {
    ...result,
    cmaPrep,
  };
}
