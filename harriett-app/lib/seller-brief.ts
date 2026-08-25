import type { SupabaseClient } from "@supabase/supabase-js";
import { buildCmaPrep } from "@/lib/cma";
import { writeAudit } from "@/lib/audit";
import { PropertyResearchResultSchema } from "@/lib/integrations/rentcast";
import { publicAppUrl } from "@/lib/property-research";

interface SellerBriefContext {
  db: SupabaseClient;
  officeId: string;
  agentId: string;
  actor: "harriett" | "user";
  actorId?: string;
}

function currency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export async function createSellerAppointmentBrief(
  context: SellerBriefContext,
  researchId: string
): Promise<{ artifactId: string; researchId: string; existing: boolean; dashboardUrl: string }> {
  const { data: research, error: researchError } = await context.db
    .from("property_research_runs")
    .select("id, agent_id, property_id, result, notice, source_observed_at, properties(formatted_address, bedrooms, bathrooms, square_feet, year_built)")
    .eq("id", researchId)
    .eq("office_id", context.officeId)
    .eq("agent_id", context.agentId)
    .single();
  if (researchError || !research) throw new Error("research was not found for this agent");

  const estimate = PropertyResearchResultSchema.safeParse(research.result);
  if (!estimate.success) throw new Error("this research does not contain a valuation");

  const { data: existing, error: existingError } = await context.db
    .from("artifacts")
    .select("id")
    .eq("source_research_run_id", researchId)
    .eq("kind", "seller_brief")
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existingError) throw new Error(`seller brief lookup failed: ${existingError.message}`);
  const dashboardUrl = `${publicAppUrl()}/research/${researchId}`;
  if (existing) return { artifactId: existing.id, researchId, existing: true, dashboardUrl };

  const property = Array.isArray(research.properties) ? research.properties[0] : research.properties;
  const address = property?.formatted_address ?? estimate.data.subjectProperty.formattedAddress;
  const cma = buildCmaPrep(estimate.data, research.source_observed_at, estimate.data.soldComparables);
  const selectedComps = cma.candidates
    .filter((candidate) => candidate.decision === "include")
    .slice(0, 3)
    .map((candidate) => ({
      address: candidate.address,
      price: candidate.price,
      saleDate: candidate.observedSaleDate,
      distanceMiles: candidate.distanceMiles,
      score: candidate.score,
    }));
  const plainText = [
    `Seller appointment brief: ${address}`,
    "",
    `Preliminary public-data range: ${currency(estimate.data.priceRangeLow)} to ${currency(estimate.data.priceRangeHigh)}.`,
    `Selected sold-comp median: ${cma.reconciliation.selectedMedianPrice == null ? "Not available" : currency(cma.reconciliation.selectedMedianPrice)}.`,
    `Property: ${property?.bedrooms ?? "Unknown"} beds, ${property?.bathrooms ?? "Unknown"} baths, ${property?.square_feet ?? "Unknown"} square feet, built ${property?.year_built ?? "unknown"}.`,
    "",
    "Appointment focus",
    "Confirm condition, improvements, seller timing, motivation, and any features missing from public records.",
    "Review the selected closed-sale candidates, then verify final price, concessions, financing, condition, and market-area fit in MLS.",
    "",
    research.notice ?? "This is preliminary agent-facing research, not an appraisal or broker-approved CMA.",
  ].join("\n");

  const { data: artifact, error: artifactError } = await context.db
    .from("artifacts")
    .insert({
      office_id: context.officeId,
      agent_id: research.agent_id,
      property_id: research.property_id,
      source_research_run_id: research.id,
      kind: "seller_brief",
      title: `${address} seller appointment brief`,
      plain_text: plainText,
      content: {
        valuation: {
          estimate: estimate.data.price,
          low: estimate.data.priceRangeLow,
          high: estimate.data.priceRangeHigh,
          selectedSoldMedian: cma.reconciliation.selectedMedianPrice,
        },
        selectedComps,
        checklist: [
          "Confirm condition and recent improvements",
          "Confirm seller timing and motivation",
          "Verify selected closed sales and concessions in MLS",
          "Prepare agent-reviewed pricing strategy",
        ],
      },
    })
    .select("id")
    .single();
  if (artifactError || !artifact) {
    throw new Error(`seller brief could not be created: ${artifactError?.message}`);
  }

  await writeAudit(context.db, {
    officeId: context.officeId,
    actor: context.actor,
    actorId: context.actorId,
    agentId: context.agentId,
    action: "artifact.seller_brief_created",
    payload: {
      artifactId: artifact.id,
      researchId: research.id,
      propertyId: research.property_id,
      selectedCompCount: selectedComps.length,
    },
  });
  return { artifactId: artifact.id, researchId, existing: false, dashboardUrl };
}
