import { z } from "zod";
import type { PropertyValueEstimate } from "@/lib/integrations/rentcast";

export const CmaDecisionSchema = z.enum(["include", "review", "exclude"]);
export const CmaConfidenceGradeSchema = z.enum(["very_low", "low", "guarded"]);

const NullableNumberSchema = z.number().finite().nullable();

export const CmaCandidateSchema = z.object({
  id: z.string(),
  rank: z.number().int().positive(),
  source: z.enum(["rentcast", "brightdata"]),
  sourceUrl: z.string().url().nullable(),
  address: z.string(),
  decision: CmaDecisionSchema,
  score: z.number().int().min(0).max(100),
  observedStatus: z.string().nullable(),
  saleEvidence: z.enum(["provider_observed_sale", "not_available"]),
  observedSaleDate: z.string().nullable(),
  price: z.number().nonnegative(),
  pricePerSquareFoot: NullableNumberSchema,
  distanceMiles: NullableNumberSchema,
  ageDays: NullableNumberSchema,
  squareFootDifferencePercent: NullableNumberSchema,
  bedroomDifference: NullableNumberSchema,
  bathroomDifference: NullableNumberSchema,
  yearBuiltDifference: NullableNumberSchema,
  reasons: z.array(z.string()),
  concerns: z.array(z.string()),
});

export const CmaPrepSchema = z.object({
  methodologyVersion: z.literal("1.0.0"),
  classification: z.literal("preliminary_cma_prep"),
  assignment: z.object({
    subjectAddress: z.string(),
    effectiveDate: z.string(),
    purpose: z.literal("seller_listing_preparation"),
    intendedUser: z.literal("pritchett_moore_agent"),
    valueDefinition: z.literal("probable_listing_price_range"),
    exteriorInspection: z.literal("not_confirmed"),
    interiorInspection: z.literal("not_confirmed"),
    conflictStatus: z.literal("agent_confirmation_required"),
  }),
  reconciliation: z.object({
    providerEstimate: z.number().nonnegative(),
    providerRangeLow: z.number().nonnegative(),
    providerRangeHigh: z.number().nonnegative(),
    selectedRawPriceLow: NullableNumberSchema,
    selectedRawPriceHigh: NullableNumberSchema,
    selectedMedianPrice: NullableNumberSchema,
    selectedMedianPricePerSquareFoot: NullableNumberSchema,
    subjectIndicationFromPricePerSquareFoot: NullableNumberSchema,
  }),
  confidence: z.object({
    score: z.number().int().min(0).max(65),
    grade: CmaConfidenceGradeSchema,
    rationale: z.array(z.string()),
  }),
  candidates: z.array(CmaCandidateSchema),
  counts: z.object({
    total: z.number().int().nonnegative(),
    included: z.number().int().nonnegative(),
    review: z.number().int().nonnegative(),
    excluded: z.number().int().nonnegative(),
  }),
  evidenceGaps: z.array(z.string()),
  adjustmentPolicy: z.array(z.string()),
  conclusion: z.string(),
  disclaimer: z.string(),
});

export type CmaCandidate = z.infer<typeof CmaCandidateSchema>;
export type CmaPrep = z.infer<typeof CmaPrepSchema>;

export interface CmaSupplementalComparable {
  id: string;
  source: "rentcast" | "brightdata";
  sourceUrl?: string | null;
  formattedAddress: string;
  propertyType?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  squareFootage?: number | null;
  yearBuilt?: number | null;
  status?: string | null;
  lastSaleDate?: string | null;
  price: number;
  distance?: number | null;
  daysOld?: number | null;
}

type ScorableComparable = Omit<CmaSupplementalComparable, "source"> & {
  source: "rentcast" | "brightdata";
};

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const midpoint = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[midpoint - 1] + sorted[midpoint]) / 2
    : sorted[midpoint];
}

function difference(left: number | null | undefined, right: number | null | undefined): number | null {
  return left == null || right == null ? null : Math.abs(left - right);
}

function percentDifference(value: number | null | undefined, baseline: number | null | undefined): number | null {
  if (value == null || baseline == null || baseline <= 0) return null;
  return Math.abs(value - baseline) / baseline;
}

function includesSold(status: string | null | undefined): boolean {
  return Boolean(status && /sold|closed/i.test(status));
}

function pricePerSquareFoot(price: number, squareFeet: number | null | undefined): number | null {
  return squareFeet && squareFeet > 0 ? price / squareFeet : null;
}

function scoreCandidate(
  estimate: PropertyValueEstimate,
  comp: ScorableComparable
): Omit<CmaCandidate, "rank"> {
  const subject = estimate.subjectProperty;
  const reasons: string[] = [];
  const concerns: string[] = [];
  let score = 100;
  let hardMismatch = false;

  if (subject.propertyType && comp.propertyType) {
    if (subject.propertyType.toLowerCase() === comp.propertyType.toLowerCase()) {
      reasons.push("Same observed property type as the subject.");
    } else {
      score -= 35;
      hardMismatch = true;
      concerns.push(`Property type differs: subject ${subject.propertyType}, comp ${comp.propertyType}.`);
    }
  } else {
    score -= 8;
    concerns.push("Property-type match cannot be confirmed from the available data.");
  }

  const sqftDifference = percentDifference(comp.squareFootage, subject.squareFootage);
  if (sqftDifference == null) {
    score -= 10;
    concerns.push("Living-area similarity cannot be measured.");
  } else if (sqftDifference <= 0.15) {
    reasons.push(`Living area is within ${Math.round(sqftDifference * 100)}% of the subject.`);
  } else if (sqftDifference <= 0.25) {
    score -= 8;
    concerns.push(`Living area differs by ${Math.round(sqftDifference * 100)}%.`);
  } else {
    score -= 20;
    concerns.push(`Living area differs by ${Math.round(sqftDifference * 100)}%, outside the preferred range.`);
  }

  const bedroomDifference = difference(comp.bedrooms, subject.bedrooms);
  if (bedroomDifference == null) {
    score -= 5;
    concerns.push("Bedroom similarity cannot be confirmed.");
  } else if (bedroomDifference === 0) {
    reasons.push("Bedroom count matches the subject.");
  } else if (bedroomDifference > 1) {
    score -= 10;
    concerns.push(`Bedroom count differs by ${bedroomDifference}.`);
  } else {
    score -= 4;
    concerns.push("Bedroom count differs by one.");
  }

  const bathroomDifference = difference(comp.bathrooms, subject.bathrooms);
  if (bathroomDifference == null) {
    score -= 5;
    concerns.push("Bathroom similarity cannot be confirmed.");
  } else if (bathroomDifference === 0) {
    reasons.push("Bathroom count matches the subject.");
  } else if (bathroomDifference > 1) {
    score -= 8;
    concerns.push(`Bathroom count differs by ${bathroomDifference}.`);
  } else {
    score -= 3;
    concerns.push(`Bathroom count differs by ${bathroomDifference}.`);
  }

  const yearBuiltDifference = difference(comp.yearBuilt, subject.yearBuilt);
  if (yearBuiltDifference == null) {
    score -= 5;
    concerns.push("Age similarity cannot be confirmed.");
  } else if (yearBuiltDifference <= 10) {
    reasons.push(`Year built is within ${yearBuiltDifference} years of the subject.`);
  } else if (yearBuiltDifference <= 25) {
    score -= 5;
    concerns.push(`Year built differs by ${yearBuiltDifference} years.`);
  } else {
    score -= 10;
    concerns.push(`Year built differs by ${yearBuiltDifference} years.`);
  }

  if (comp.distance == null) {
    score -= 8;
    concerns.push("Distance from the subject is unavailable.");
  } else if (comp.distance <= 1) {
    reasons.push(`Located ${comp.distance.toFixed(2)} miles from the subject.`);
  } else if (comp.distance <= 3) {
    score -= 4;
    reasons.push(`Located ${comp.distance.toFixed(2)} miles from the subject.`);
  } else if (comp.distance <= 5) {
    score -= 10;
    concerns.push(`Located ${comp.distance.toFixed(2)} miles from the subject; market-area fit needs review.`);
  } else {
    score -= 20;
    concerns.push(`Located ${comp.distance.toFixed(2)} miles from the subject; competing-market rationale is required.`);
  }

  if (comp.daysOld == null) {
    score -= 8;
    concerns.push("Sale recency is unavailable.");
  } else if (comp.daysOld <= 180) {
    reasons.push(`${comp.daysOld} days old, within the preferred six-month window.`);
  } else if (comp.daysOld <= 365) {
    score -= 8;
    concerns.push(`${comp.daysOld} days old; market-condition review is required.`);
  } else {
    score -= 18;
    concerns.push(`${comp.daysOld} days old; an older-sale exception and market support are required.`);
  }

  const hasSaleEvidence = includesSold(comp.status) || Boolean(comp.lastSaleDate);
  if (!hasSaleEvidence) {
    score -= 12;
    concerns.push("A closed sale is not established by the provider response.");
  } else {
    reasons.push("The provider response contains an observed sold status or sale date.");
  }

  const outsidePlausibleRange = comp.price < estimate.priceRangeLow * 0.5
    || comp.price > estimate.priceRangeHigh * 1.5;
  if (outsidePlausibleRange) {
    score -= 35;
    concerns.push("Sale price is an extreme outlier relative to the provider range and requires separate verification.");
  }

  const boundedScore = Math.max(0, Math.min(100, Math.round(score)));
  const decision = hardMismatch || boundedScore < 50
    ? "exclude"
    : boundedScore >= 72 && hasSaleEvidence
      ? "include"
      : "review";

  return {
    id: comp.id,
    source: comp.source,
    sourceUrl: comp.sourceUrl ?? null,
    address: comp.formattedAddress,
    decision,
    score: boundedScore,
    observedStatus: comp.status ?? null,
    saleEvidence: hasSaleEvidence ? "provider_observed_sale" : "not_available",
    observedSaleDate: comp.lastSaleDate ?? null,
    price: comp.price,
    pricePerSquareFoot: pricePerSquareFoot(comp.price, comp.squareFootage),
    distanceMiles: comp.distance ?? null,
    ageDays: comp.daysOld ?? null,
    squareFootDifferencePercent: sqftDifference,
    bedroomDifference,
    bathroomDifference,
    yearBuiltDifference,
    reasons,
    concerns,
  };
}

export function buildCmaPrep(
  estimate: PropertyValueEstimate,
  effectiveDate = new Date().toISOString(),
  supplementalComparables: CmaSupplementalComparable[] = []
): CmaPrep {
  const rentCastComparables: ScorableComparable[] = estimate.comparables.map((comp) => ({
    ...comp,
    source: "rentcast",
    sourceUrl: null,
  }));
  const supplementalAddresses = new Set<string>();
  const uniqueSupplemental = supplementalComparables.filter((comp) => {
    const address = comp.formattedAddress.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (supplementalAddresses.has(address)) return false;
    supplementalAddresses.add(address);
    return true;
  });
  const uniqueListings = rentCastComparables.filter((comp) => !supplementalAddresses.has(
    comp.formattedAddress.toLowerCase().replace(/[^a-z0-9]/g, "")
  ));
  const ranked = [...uniqueSupplemental, ...uniqueListings]
    .map((comp) => scoreCandidate(estimate, comp))
    .sort((left, right) => right.score - left.score)
    .map((candidate, index) => ({ ...candidate, rank: index + 1 }));
  let selectedCount = 0;
  const selectedCandidates = ranked.map((candidate) => {
    if (candidate.decision !== "include") return candidate;
    selectedCount += 1;
    if (selectedCount <= 6) return candidate;
    return {
      ...candidate,
      decision: "review" as const,
      concerns: [
        ...candidate.concerns,
        "Qualified on available fields but was not selected because the workfile is capped at six primary comps.",
      ],
    };
  });
  const included = selectedCandidates.filter((candidate) => candidate.decision === "include");
  const considered = included.length >= 3
    ? included
    : selectedCandidates.filter((candidate) => candidate.decision !== "exclude").slice(0, 3);
  const rawPrices = considered.map((candidate) => candidate.price).filter((price) => price > 0);
  const pricePerSquareFeet = considered
    .map((candidate) => candidate.pricePerSquareFoot)
    .filter((value): value is number => value != null && value > 0);
  const medianPpsf = median(pricePerSquareFeet);
  const subjectSquareFeet = estimate.subjectProperty.squareFootage;
  const subjectPpsfIndication = medianPpsf && subjectSquareFeet
    ? medianPpsf * subjectSquareFeet
    : null;

  const subjectFacts = [
    estimate.subjectProperty.propertyType,
    estimate.subjectProperty.bedrooms,
    estimate.subjectProperty.bathrooms,
    estimate.subjectProperty.squareFootage,
    estimate.subjectProperty.yearBuilt,
  ];
  const subjectCompleteness = subjectFacts.filter((value) => value != null).length;
  const rangeSpread = estimate.price > 0
    ? (estimate.priceRangeHigh - estimate.priceRangeLow) / estimate.price
    : 1;
  const score = Math.min(65, Math.round(
    10
    + Math.min(24, included.length * 8)
    + subjectCompleteness * 4
    + (rangeSpread <= 0.15 ? 8 : rangeSpread <= 0.25 ? 4 : 0)
  ));
  const grade = score >= 50 ? "guarded" : score >= 35 ? "low" : "very_low";

  const confidenceRationale = [
    `${included.length} candidate ${included.length === 1 ? "comp meets" : "comps meet"} the current inclusion threshold.`,
    `${subjectCompleteness} of 5 core subject characteristics are available.`,
    `The provider range has a ${Math.round(rangeSpread * 100)}% spread relative to the point estimate.`,
    "Confidence is capped because sold terms, concessions, condition, and market-area fit are not MLS-verified.",
  ];

  const missingSubjectFacts = [
    [estimate.subjectProperty.propertyType, "property type"],
    [estimate.subjectProperty.bedrooms, "bedrooms"],
    [estimate.subjectProperty.bathrooms, "bathrooms"],
    [estimate.subjectProperty.squareFootage, "living area"],
    [estimate.subjectProperty.yearBuilt, "year built"],
  ].filter(([value]) => value == null).map(([, label]) => label as string);
  const evidenceGaps = [
    "Verify closed status, sale date, sale price, financing, and concessions in MLS.",
    "Confirm neighborhood or competing-market fit for every selected comp.",
    "Confirm subject and comp condition, quality, renovations, site utility, and adverse influences.",
    "Confirm whether the agent inspected the subject exterior and interior, and record the dates.",
    "Confirm the intended client, agency interest, and any conflict of interest before presentation.",
  ];
  if (missingSubjectFacts.length) {
    evidenceGaps.unshift(`Complete missing subject facts: ${missingSubjectFacts.join(", ")}.`);
  }
  if (included.length < 3) {
    evidenceGaps.unshift("Fewer than three candidate closed sales meet the inclusion threshold.");
  }

  const conclusion = included.length >= 3
    ? "The public-data evidence supports a preliminary pricing discussion, subject to MLS verification and market-supported adjustments."
    : "The current evidence is not sufficient for a defensible pricing recommendation; additional verified closed sales are required.";

  return CmaPrepSchema.parse({
    methodologyVersion: "1.0.0",
    classification: "preliminary_cma_prep",
    assignment: {
      subjectAddress: estimate.subjectProperty.formattedAddress,
      effectiveDate,
      purpose: "seller_listing_preparation",
      intendedUser: "pritchett_moore_agent",
      valueDefinition: "probable_listing_price_range",
      exteriorInspection: "not_confirmed",
      interiorInspection: "not_confirmed",
      conflictStatus: "agent_confirmation_required",
    },
    reconciliation: {
      providerEstimate: estimate.price,
      providerRangeLow: estimate.priceRangeLow,
      providerRangeHigh: estimate.priceRangeHigh,
      selectedRawPriceLow: rawPrices.length ? Math.min(...rawPrices) : null,
      selectedRawPriceHigh: rawPrices.length ? Math.max(...rawPrices) : null,
      selectedMedianPrice: median(rawPrices),
      selectedMedianPricePerSquareFoot: medianPpsf,
      subjectIndicationFromPricePerSquareFoot: subjectPpsfIndication,
    },
    confidence: { score, grade, rationale: confidenceRationale },
    candidates: selectedCandidates,
    counts: {
      total: selectedCandidates.length,
      included: included.length,
      review: selectedCandidates.filter((candidate) => candidate.decision === "review").length,
      excluded: selectedCandidates.filter((candidate) => candidate.decision === "exclude").length,
    },
    evidenceGaps,
    adjustmentPolicy: [
      "No dollar adjustment is applied from a rule of thumb.",
      "Every adjustment must be supported by paired sales, grouped market analysis, statistical analysis, or another documented local-market method.",
      "When support is missing, Harriett records the factor as unresolved instead of inventing a number.",
      "Active and pending listings may explain competition, but they do not replace verified closed sales in the value reconciliation.",
    ],
    conclusion,
    disclaimer: "This is agent-facing CMA preparation based on public provider data. It is not an appraisal or a broker-reviewed CMA.",
  });
}

export function renderCmaPrep(cma: CmaPrep): string {
  const currency = (value: number | null) => value == null
    ? "Not available"
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(value);
  const number = (value: number | null) => value == null
    ? "Not available"
    : new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);

  return [
    `CMA Expert Prep: ${cma.assignment.subjectAddress}`,
    `Effective date: ${cma.assignment.effectiveDate}`,
    `Confidence: ${cma.confidence.grade.replaceAll("_", " ")} (${cma.confidence.score}/65 public-data ceiling)`,
    "",
    "Reconciliation",
    `Provider estimate: ${currency(cma.reconciliation.providerEstimate)}`,
    `Provider range: ${currency(cma.reconciliation.providerRangeLow)} to ${currency(cma.reconciliation.providerRangeHigh)}`,
    `Selected candidate median: ${currency(cma.reconciliation.selectedMedianPrice)}`,
    `Selected candidate median price per square foot: ${currency(cma.reconciliation.selectedMedianPricePerSquareFoot)}`,
    `Subject indication from median price per square foot: ${currency(cma.reconciliation.subjectIndicationFromPricePerSquareFoot)}`,
    "",
    "Comp decisions",
    ...cma.candidates.map((candidate) => [
      `${candidate.rank}. ${candidate.address}`,
      `   ${candidate.decision.toUpperCase()} | fit ${candidate.score}/100 | ${currency(candidate.price)} | ${number(candidate.pricePerSquareFoot)} per square foot`,
      `   Support: ${candidate.reasons.join(" ") || "No affirmative support was established."}`,
      `   Concerns: ${candidate.concerns.join(" ") || "No material concern was identified from available fields."}`,
    ].join("\n")),
    "",
    "Evidence still required",
    ...cma.evidenceGaps.map((gap) => `- ${gap}`),
    "",
    "Adjustment policy",
    ...cma.adjustmentPolicy.map((policy) => `- ${policy}`),
    "",
    cma.conclusion,
    cma.disclaimer,
  ].join("\n");
}
