import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BedDouble,
  Building2,
  CalendarClock,
  ChartNoAxesCombined,
  ExternalLink,
  Home,
  MapPin,
  MapPinned,
  Ruler,
  ShieldAlert,
} from "lucide-react";
import { ResearchActions } from "@/components/research-actions";
import { buildCmaPrep } from "@/lib/cma";
import { createUserClient } from "@/lib/db/server";
import { BrightDataEnrichmentResultSchema } from "@/lib/integrations/bright-data";
import { PropertyValueEstimateSchema } from "@/lib/integrations/rentcast";
import {
  googleMapsSearchUrl,
  zillowSearchUrl,
} from "@/lib/property-research";

function currency(value: number | null | undefined): string {
  if (value == null) return "Not available";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function number(value: number | null | undefined): string {
  return value == null ? "Not available" : new Intl.NumberFormat("en-US").format(value);
}

function dateTime(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

const flagLabels: Record<string, string> = {
  public_data_only: "Public data only",
  automated_estimate: "Automated estimate",
  mls_verification_required: "MLS verification required",
  no_comparables: "No comparables returned",
  wide_valuation_range: "Wide valuation range",
};

export default async function ResearchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await createUserClient();
  const [{ data: research }, { data: artifacts }] = await Promise.all([
    db
      .from("property_research_runs")
      .select("*, properties(*)")
      .eq("id", id)
      .single(),
    db
      .from("artifacts")
      .select("id, kind, title, status, plain_text, content, created_at")
      .eq("source_research_run_id", id)
      .order("created_at", { ascending: false }),
  ]);
  if (!research) notFound();

  const property = Array.isArray(research.properties) ? research.properties[0] : research.properties;
  const { data: portalResearch } = await db
    .from("property_research_runs")
    .select("id, status, result, source_observed_at")
    .eq("property_id", research.property_id)
    .eq("provider", "brightdata")
    .contains("request", { sourceResearchId: id })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const estimate = PropertyValueEstimateSchema.safeParse(research.result);
  const portalResult = BrightDataEnrichmentResultSchema.safeParse(portalResearch?.result);
  const sellerBrief = artifacts?.find((artifact) => artifact.kind === "seller_brief");
  const cmaDraft = artifacts?.find((artifact) => artifact.kind === "cma_draft");
  const address = property?.formatted_address
    ?? (estimate.success ? estimate.data.subjectProperty.formattedAddress : "Property research");
  const cma = estimate.success
    ? buildCmaPrep(
        estimate.data,
        research.source_observed_at,
        portalResult.success ? portalResult.data.comparables : []
      )
    : null;

  return (
    <div className="page-stack">
      <header className="research-detail-header">
        <Link href="/research" className="back-link"><ArrowLeft size={16} /> Research</Link>
        <div className="research-detail-title">
          <div>
            <p className="eyebrow">Saved {dateTime(research.created_at)}</p>
            <h1>{address}</h1>
            <p className="research-location"><MapPin size={15} /> {[property?.city, property?.state, property?.zip].filter(Boolean).join(", ")}</p>
            <div className="property-reference-links">
              <a href={googleMapsSearchUrl(address)} target="_blank" rel="noopener noreferrer">
                <MapPinned size={15} /> Google Maps
              </a>
              <a href={zillowSearchUrl(address)} target="_blank" rel="noopener noreferrer">
                <ExternalLink size={15} /> Search Zillow
              </a>
            </div>
          </div>
          <ResearchActions
            researchId={id}
            hasSellerBrief={Boolean(sellerBrief)}
            hasCmaDraft={Boolean(cmaDraft)}
            portalStatus={(portalResearch?.status as "running" | "completed" | "failed" | undefined) ?? null}
          />
        </div>
      </header>

      {estimate.success && cma ? (
        <>
          <section className="valuation-band" aria-labelledby="valuation-heading">
            <div className="valuation-primary">
              <p className="section-kicker">Preliminary estimate</p>
              <h2 id="valuation-heading">{currency(estimate.data.price)}</h2>
              <p>Range {currency(estimate.data.priceRangeLow)} to {currency(estimate.data.priceRangeHigh)}</p>
            </div>
            <div className="property-facts">
              <span><Home size={17} /><strong>{property?.property_type ?? "Property"}</strong><small>Type</small></span>
              <span><BedDouble size={17} /><strong>{number(property?.bedrooms)} / {number(property?.bathrooms)}</strong><small>Beds / baths</small></span>
              <span><Ruler size={17} /><strong>{number(property?.square_feet)}</strong><small>Square feet</small></span>
              <span><CalendarClock size={17} /><strong>{property?.year_built ?? "Not available"}</strong><small>Year built</small></span>
            </div>
          </section>

          <section className="harriett-read" aria-labelledby="harriett-read-heading">
              <div className="section-heading">
                <div>
                  <p className="section-kicker">CMA methodology 1.0</p>
                  <h2 id="harriett-read-heading">Harriett&apos;s CMA expert prep</h2>
                </div>
                <span className="status-label">{cma.confidence.grade.replaceAll("_", " ")} confidence</span>
              </div>
              <p className="harriett-read-lead">{cma.conclusion}</p>
              <div className="cma-summary-grid">
                <span><strong>{cma.confidence.score}/65</strong><small>Public-data confidence</small></span>
                <span><strong>{cma.counts.included}</strong><small>Included candidates</small></span>
                <span><strong>{currency(cma.reconciliation.selectedMedianPrice)}</strong><small>Candidate median</small></span>
                <span><strong>{currency(cma.reconciliation.subjectIndicationFromPricePerSquareFoot)}</strong><small>Price-per-foot cross-check</small></span>
              </div>
              <div className="harriett-read-grid">
                <div>
                  <h3>Evidence still required</h3>
                  <ul>{cma.evidenceGaps.map((item) => <li key={item}>{item}</li>)}</ul>
                </div>
                <div>
                  <h3>Adjustment discipline</h3>
                  <ul>{cma.adjustmentPolicy.map((item) => <li key={item}>{item}</li>)}</ul>
                </div>
              </div>
              <p className="harriett-next-step"><ArrowRight size={17} /> <span><strong>Next step</strong>Verify the strongest candidates and sold terms in MLS, add market-supported adjustments, then send the draft through agent and broker review.</span></p>
          </section>

          <section aria-labelledby="comps-heading">
            <div className="section-heading">
              <div>
                <p className="section-kicker">RentCast baseline{portalResult.success ? " + portal-observed beta" : ""}</p>
                <h2 id="comps-heading">Comp selection workfile</h2>
              </div>
              <span className="section-count">{cma.candidates.length}</span>
            </div>
            <div className="comps-table" role="table" aria-label="Comparable properties">
              <div className="comps-head" role="row">
                <span role="columnheader">Property</span>
                <span role="columnheader">Decision</span>
                <span role="columnheader">Price</span>
                <span role="columnheader">Fit</span>
                <span role="columnheader">Distance</span>
                <span role="columnheader">Verify</span>
              </div>
              {cma.candidates.map((candidate) => (
                <div className="comp-row" role="row" key={candidate.id}>
                  <span role="cell" data-label="Property"><strong>{candidate.address}</strong><small>{candidate.source === "brightdata" ? "Portal observed" : "RentCast"} | {candidate.observedStatus ?? "Status unavailable"}</small></span>
                  <span role="cell" data-label="Decision"><strong className={`comp-decision ${candidate.decision}`}>{candidate.decision}</strong><small>Rank {candidate.rank}</small></span>
                  <span role="cell" data-label="Price"><strong>{currency(candidate.price)}</strong><small>{candidate.pricePerSquareFoot == null ? "Price per foot unavailable" : `${currency(candidate.pricePerSquareFoot)} / sq ft`}</small></span>
                  <span role="cell" data-label="Fit"><strong>{candidate.score}/100</strong><small>{candidate.saleEvidence === "provider_observed_sale" ? "Sale observed" : "Sale unverified"}</small></span>
                  <span role="cell" data-label="Distance"><strong>{candidate.distanceMiles == null ? "Not available" : `${candidate.distanceMiles.toFixed(2)} mi`}</strong><small>{candidate.ageDays == null ? "Date unavailable" : `${candidate.ageDays} days old`}</small></span>
                  <span role="cell" data-label="Verify" className="comp-reference-links">
                    <a href={googleMapsSearchUrl(candidate.address)} target="_blank" rel="noopener noreferrer" aria-label={`Open ${candidate.address} in Google Maps`} title="Google Maps">
                      <MapPinned size={16} />
                    </a>
                    <a href={zillowSearchUrl(candidate.address)} target="_blank" rel="noopener noreferrer" aria-label={`Search Zillow for ${candidate.address}`} title="Search Zillow">
                      <ExternalLink size={16} />
                    </a>
                  </span>
                  <div className="comp-rationale">
                    <p><strong>Why it ranks here</strong>{candidate.reasons.join(" ") || "No affirmative support was established from available fields."}</p>
                    <p><strong>Open issues</strong>{candidate.concerns.join(" ") || "No material concern was identified from available fields."}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      ) : (
        <section className="quiet-state"><ChartNoAxesCombined size={22} /><p>This research does not contain a valuation result.</p></section>
      )}

      <div className="research-lower-grid">
        <section aria-labelledby="source-heading">
          <div className="section-heading compact">
            <div>
              <p className="section-kicker">Evidence</p>
              <h2 id="source-heading">Source and confidence</h2>
            </div>
          </div>
          <dl className="source-list">
            <div><dt>Provider</dt><dd className="capitalize">{research.provider}</dd></div>
            <div><dt>Observed</dt><dd>{dateTime(research.source_observed_at)}</dd></div>
            <div><dt>Provider requests</dt><dd>{research.provider_call_count}</dd></div>
            <div><dt>Portal enrichment</dt><dd>{portalResearch?.status ?? "Not requested"}</dd></div>
            <div><dt>MLS status</dt><dd>Not verified</dd></div>
          </dl>
          <div className="confidence-flags">
            {(research.confidence_flags as string[]).map((flag) => (
              <span key={flag}><ShieldAlert size={14} />{flagLabels[flag] ?? flag.replaceAll("_", " ")}</span>
            ))}
          </div>
          <p className="source-notice">{research.notice}</p>
        </section>

        <section aria-labelledby="artifacts-heading">
          <div className="section-heading compact">
            <div>
              <p className="section-kicker">Built from this research</p>
              <h2 id="artifacts-heading">Saved work</h2>
            </div>
          </div>
          <div className="artifact-list">
            {(artifacts ?? []).map((artifact) => (
              <details key={artifact.id} className="artifact-item" open={artifact.kind === "seller_brief"}>
                <summary>
                  <span><Building2 size={17} /><strong>{artifact.title}</strong></span>
                  <span className="status-label">{artifact.status.replaceAll("_", " ")}</span>
                </summary>
                {artifact.plain_text && <pre>{artifact.plain_text}</pre>}
              </details>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
