import type { SupabaseClient } from "@supabase/supabase-js";
import { writeAudit } from "@/lib/audit";
import {
  getPropertyValueEstimate,
  getSaleListing,
  searchSaleListings,
  type PropertySearchInput,
  type PropertyValueInput,
} from "@/lib/integrations/rentcast";

export interface PropertyAccessContext {
  db: SupabaseClient;
  officeId: string;
  agentId: string;
  actor: "harriett" | "user";
  actorId?: string;
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
    const result = await searchSaleListings(input);
    await writeAudit(context.db, {
      officeId: context.officeId,
      actor: context.actor,
      actorId: context.actorId,
      agentId: context.agentId,
      action: "property.search",
      payload: {
        ...auditPayload,
        provider: "rentcast",
        resultCount: result.listings.length,
        totalCount: result.totalCount,
      },
    });
    return { ...result, source: "rentcast" as const, notice: SOURCE_NOTICE };
  } catch (error) {
    await auditFailure(context, "property.search", auditPayload, error);
    throw error;
  }
}

export async function lookupProperty(context: PropertyAccessContext, id: string) {
  try {
    const listing = await getSaleListing(id);
    await writeAudit(context.db, {
      officeId: context.officeId,
      actor: context.actor,
      actorId: context.actorId,
      agentId: context.agentId,
      action: "property.lookup",
      payload: { provider: "rentcast", listingId: id },
    });
    return { listing, source: "rentcast" as const, notice: SOURCE_NOTICE };
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
    const estimate = await getPropertyValueEstimate(input);
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
      },
    });
    return {
      estimate,
      source: "rentcast" as const,
      notice: `${SOURCE_NOTICE} This estimate is not an appraisal or a broker-approved CMA.`,
    };
  } catch (error) {
    await auditFailure(context, "property.value_estimated", { address: input.address }, error);
    throw error;
  }
}
