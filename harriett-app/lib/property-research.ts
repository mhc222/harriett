import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  PropertyValueEstimate,
  PropertyValueInput,
  RentCastListing,
} from "@/lib/integrations/rentcast";
import { writeAudit } from "@/lib/audit";

interface ResearchContext {
  db: SupabaseClient;
  officeId: string;
  agentId: string;
  actor: "harriett" | "user";
  actorId?: string;
  aiRunId?: string;
}

interface PropertyIdentity {
  id: string;
  formattedAddress: string;
}

export interface SavedResearchReference {
  researchId: string;
  propertyId: string;
  artifactId: string;
  dashboardPath: string;
  dashboardUrl: string;
}

export interface ValuationRead {
  headline: string;
  evidence: string[];
  unknowns: string[];
  nextStep: string;
}

export function normalizePropertyAddress(address: string): string {
  return address
    .trim()
    .toLowerCase()
    .replace(/[.,#]/g, " ")
    .replace(/\s+/g, " ");
}

export function publicAppUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (configured) return configured;

  const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  if (vercelHost) return `https://${vercelHost.replace(/^https?:\/\//, "")}`;
  return "http://localhost:3000";
}

export function valuationConfidenceFlags(estimate: PropertyValueEstimate): string[] {
  const flags = ["public_data_only", "automated_estimate", "mls_verification_required"];
  if (!estimate.comparables.length) flags.push("no_comparables");
  if (estimate.price > 0) {
    const rangeWidth = (estimate.priceRangeHigh - estimate.priceRangeLow) / estimate.price;
    if (rangeWidth >= 0.2) flags.push("wide_valuation_range");
  }
  return flags;
}

export function googleMapsSearchUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address.trim())}`;
}

export function zillowSearchUrl(address: string): string {
  const slug = address
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `https://www.zillow.com/homes/${slug}_rb/`;
}

function currency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function valuationSummary(estimate: PropertyValueEstimate): string {
  return `Preliminary RentCast estimate ${currency(estimate.price)}, with a range of ${currency(
    estimate.priceRangeLow
  )} to ${currency(estimate.priceRangeHigh)} based on ${estimate.comparables.length} public-data comparables.`;
}

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

export function valuationRead(estimate: PropertyValueEstimate): ValuationRead {
  const comparables = estimate.comparables;
  const medianCompPrice = median(comparables.map((comp) => comp.price).filter((price) => price > 0));
  const relativeToMedian = medianCompPrice && medianCompPrice > 0
    ? (estimate.price - medianCompPrice) / medianCompPrice
    : null;
  const rangeSpread = estimate.price > 0
    ? (estimate.priceRangeHigh - estimate.priceRangeLow) / estimate.price
    : null;
  const strongestComp = [...comparables].sort((left, right) => {
    const correlationDifference = (right.correlation ?? -1) - (left.correlation ?? -1);
    if (correlationDifference !== 0) return correlationDifference;
    return (left.distance ?? Number.POSITIVE_INFINITY) - (right.distance ?? Number.POSITIVE_INFINITY);
  })[0];

  let headline = "There is not enough public data to form a useful pricing read yet.";
  if (relativeToMedian !== null) {
    const difference = Math.abs(relativeToMedian);
    if (difference < 0.08) {
      headline = "The automated estimate tracks fairly closely with the middle of the returned public-data comps.";
    } else if (relativeToMedian > 0) {
      headline = `The automated estimate sits about ${Math.round(difference * 100)}% above the median returned comp price.`;
    } else {
      headline = `The automated estimate sits about ${Math.round(difference * 100)}% below the median returned comp price.`;
    }
  }

  const evidence: string[] = [];
  if (medianCompPrice !== null) {
    evidence.push(
      `${comparables.length} public-data ${comparables.length === 1 ? "comp has" : "comps have"} a median price of ${currency(medianCompPrice)}.`
    );
  }
  if (strongestComp) {
    const proximity = strongestComp.distance == null
      ? ""
      : `, ${strongestComp.distance.toFixed(2)} miles from the subject`;
    evidence.push(
      `The strongest returned match is ${strongestComp.formattedAddress} at ${currency(strongestComp.price)}${proximity}.`
    );
  }
  if (rangeSpread !== null) {
    evidence.push(
      `RentCast's range runs from ${currency(estimate.priceRangeLow)} to ${currency(estimate.priceRangeHigh)}, an approximately ${Math.round(rangeSpread * 100)}% spread around the estimate.`
    );
  }

  const missingFacts = [
    [estimate.subjectProperty.bedrooms, "bedrooms"],
    [estimate.subjectProperty.bathrooms, "bathrooms"],
    [estimate.subjectProperty.squareFootage, "square footage"],
    [estimate.subjectProperty.yearBuilt, "year built"],
  ].filter(([value]) => value == null).map(([, label]) => label as string);
  const unknowns = [
    "MLS status, concessions, condition, and final sold terms have not been verified.",
    "Public data does not account for renovations, deferred maintenance, view, layout, or seller timing.",
  ];
  if (missingFacts.length) {
    unknowns.push(`The subject record is missing ${missingFacts.join(", ")}.`);
  }
  const staleCompCount = comparables.filter((comp) => (comp.daysOld ?? 0) > 180).length;
  if (staleCompCount) {
    unknowns.push(`${staleCompCount} returned ${staleCompCount === 1 ? "comp is" : "comps are"} more than 180 days old.`);
  }

  return {
    headline,
    evidence,
    unknowns,
    nextStep: "Confirm the subject's condition and improvements, then verify the best comps and their sold terms in MLS before recommending a list price.",
  };
}

function listingFacts(listing: RentCastListing): Record<string, unknown> {
  return {
    rentcastId: listing.id,
    status: listing.status,
    price: listing.price,
    propertyType: listing.propertyType,
    bedrooms: listing.bedrooms,
    bathrooms: listing.bathrooms,
    squareFootage: listing.squareFootage,
    lotSize: listing.lotSize,
    yearBuilt: listing.yearBuilt,
    mlsName: listing.mlsName,
    mlsNumber: listing.mlsNumber,
  };
}

async function findOrCreateProperty(
  context: ResearchContext,
  subject: PropertyValueEstimate["subjectProperty"] | RentCastListing
): Promise<PropertyIdentity> {
  const normalizedAddress = normalizePropertyAddress(subject.formattedAddress);
  const { data: existing, error: selectError } = await context.db
    .from("properties")
    .select("id, formatted_address")
    .eq("office_id", context.officeId)
    .eq("normalized_address", normalizedAddress)
    .maybeSingle();
  if (selectError) throw new Error(`property lookup failed: ${selectError.message}`);
  if (existing) {
    return { id: existing.id, formattedAddress: existing.formatted_address };
  }

  const facts = "status" in subject ? listingFacts(subject) : {
    rentcastId: subject.id,
    lastSaleDate: subject.lastSaleDate,
    lastSalePrice: subject.lastSalePrice,
  };
  const { data: created, error: insertError } = await context.db
    .from("properties")
    .insert({
      office_id: context.officeId,
      created_by: context.agentId,
      normalized_address: normalizedAddress,
      formatted_address: subject.formattedAddress,
      address_line_1: subject.addressLine1 ?? null,
      city: subject.city ?? null,
      state: subject.state ?? null,
      zip: subject.zipCode ?? null,
      county: subject.county ?? null,
      latitude: subject.latitude ?? null,
      longitude: subject.longitude ?? null,
      property_type: subject.propertyType ?? null,
      bedrooms: subject.bedrooms ?? null,
      bathrooms: subject.bathrooms ?? null,
      square_feet: subject.squareFootage ?? null,
      lot_size: subject.lotSize ?? null,
      year_built: subject.yearBuilt ?? null,
      facts,
    })
    .select("id, formatted_address")
    .single();

  if (insertError?.code === "23505") {
    const { data: raced, error: raceError } = await context.db
      .from("properties")
      .select("id, formatted_address")
      .eq("office_id", context.officeId)
      .eq("normalized_address", normalizedAddress)
      .single();
    if (raceError || !raced) throw new Error(`property race lookup failed: ${raceError?.message}`);
    return { id: raced.id, formattedAddress: raced.formatted_address };
  }
  if (insertError || !created) throw new Error(`property creation failed: ${insertError?.message}`);
  return { id: created.id, formattedAddress: created.formatted_address };
}

async function createResearchArtifact(
  context: ResearchContext,
  property: PropertyIdentity,
  researchId: string,
  title: string,
  plainText: string
): Promise<string> {
  const { data, error } = await context.db
    .from("artifacts")
    .insert({
      office_id: context.officeId,
      agent_id: context.agentId,
      property_id: property.id,
      source_research_run_id: researchId,
      kind: "research_note",
      title,
      plain_text: plainText,
      content: { researchId },
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(`research artifact creation failed: ${error?.message}`);
  return data.id as string;
}

export async function saveValuationResearch(
  context: ResearchContext,
  input: PropertyValueInput,
  estimate: PropertyValueEstimate,
  notice: string
): Promise<SavedResearchReference> {
  const property = await findOrCreateProperty(context, estimate.subjectProperty);
  const summary = valuationSummary(estimate);
  const confidenceFlags = valuationConfidenceFlags(estimate);
  const { data: run, error: runError } = await context.db
    .from("property_research_runs")
    .insert({
      office_id: context.officeId,
      agent_id: context.agentId,
      property_id: property.id,
      ai_run_id: context.aiRunId ?? null,
      research_type: "valuation",
      provider: "rentcast",
      request: input,
      result: estimate,
      summary,
      notice,
      confidence_flags: confidenceFlags,
    })
    .select("id")
    .single();
  if (runError || !run) throw new Error(`research run creation failed: ${runError?.message}`);

  const researchId = run.id as string;
  const artifactId = await createResearchArtifact(
    context,
    property,
    researchId,
    `${property.formattedAddress} research note`,
    `${summary}\n\n${notice}`
  );

  const rentcastId = estimate.subjectProperty.id;
  if (rentcastId) {
    const { error: linkError } = await context.db.from("external_record_links").upsert(
      {
        office_id: context.officeId,
        provider: "rentcast",
        entity_type: "property",
        entity_id: property.id,
        external_id: rentcastId,
        metadata: { source: "valuation" },
      },
      { onConflict: "office_id,provider,entity_type,external_id" }
    );
    if (linkError) {
      await writeAudit(context.db, {
        officeId: context.officeId,
        actor: context.actor,
        actorId: context.actorId,
        agentId: context.agentId,
        action: "property.external_link.failed",
        payload: {
          researchId,
          propertyId: property.id,
          provider: "rentcast",
          errorCode: linkError.code ?? "database_error",
        },
      });
    }
  }

  await writeAudit(context.db, {
    officeId: context.officeId,
    actor: context.actor,
    actorId: context.actorId,
    agentId: context.agentId,
    action: "property.research_saved",
    payload: {
      researchId,
      propertyId: property.id,
      artifactId,
      provider: "rentcast",
      aiRunId: context.aiRunId,
      confidenceFlags,
    },
  });

  const dashboardPath = `/research/${researchId}`;
  return {
    researchId,
    propertyId: property.id,
    artifactId,
    dashboardPath,
    dashboardUrl: `${publicAppUrl()}${dashboardPath}`,
  };
}

export async function saveListingResearch(
  context: ResearchContext,
  listing: RentCastListing,
  notice: string
): Promise<SavedResearchReference> {
  const property = await findOrCreateProperty(context, listing);
  const summary = `${listing.formattedAddress} is listed as ${listing.status} at ${currency(listing.price)} in RentCast public data.`;
  const { data: run, error: runError } = await context.db
    .from("property_research_runs")
    .insert({
      office_id: context.officeId,
      agent_id: context.agentId,
      property_id: property.id,
      ai_run_id: context.aiRunId ?? null,
      research_type: "property_lookup",
      provider: "rentcast",
      request: { listingId: listing.id },
      result: listing,
      summary,
      notice,
      confidence_flags: ["public_data_only", "mls_verification_required"],
    })
    .select("id")
    .single();
  if (runError || !run) throw new Error(`research run creation failed: ${runError?.message}`);

  const researchId = run.id as string;
  const artifactId = await createResearchArtifact(
    context,
    property,
    researchId,
    `${property.formattedAddress} property note`,
    `${summary}\n\n${notice}`
  );
  await writeAudit(context.db, {
    officeId: context.officeId,
    actor: context.actor,
    actorId: context.actorId,
    agentId: context.agentId,
    action: "property.research_saved",
    payload: { researchId, propertyId: property.id, artifactId, provider: "rentcast" },
  });

  const dashboardPath = `/research/${researchId}`;
  return {
    researchId,
    propertyId: property.id,
    artifactId,
    dashboardPath,
    dashboardUrl: `${publicAppUrl()}${dashboardPath}`,
  };
}
