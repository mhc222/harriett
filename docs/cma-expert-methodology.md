# Harriett CMA Expert Methodology

Status: Phase 2 beta baseline
Methodology version: 1.0.0
Effective: 2026-08-24

## Product Classification

Harriett currently produces **CMA Expert Prep**, not an appraisal and not a
broker-reviewed CMA. The workflow is agent-facing. A final pricing opinion requires
agent review, MLS verification, documented local-market support for adjustments, and the
brokerage's review process.

## Standards Baseline

The workflow implements the reporting elements in [NAR Standard of Practice
11-1](https://www.nar.realtor/about-nar/governing-documents/code-of-ethics/2026-code-of-ethics-standards-of-practice):

- subject property and preparation date;
- defined value or price and intended use;
- limiting conditions and source limitations;
- present or contemplated interest;
- market-data basis for the opinion;
- statement that the work is not an appraisal;
- exterior and interior inspection status;
- conflict-of-interest status.

The comp workflow borrows conservative sales-comparison controls from Fannie Mae's
[comparable sales](https://selling-guide.fanniemae.com/sel/b4-1.3-08/comparable-sales)
and [adjustment](https://selling-guide.fanniemae.com/sel/b4-1.3-09/adjustments-comparable-sales)
guidance. These appraisal requirements do not turn Harriett's work into an appraisal.
They provide useful quality controls:

- use at least three verified closed sales as the primary evidence baseline;
- prefer properties competing for the same market participants;
- explain every selected comp and every market-area exception;
- prefer the best comparable over the merely closest or newest sale;
- use active and pending listings as market context, not closed-sale substitutes;
- support time, feature, condition, and concession adjustments with market evidence;
- never apply arbitrary percentage or price-per-square-foot adjustment rules.

Alabama permits a licensed broker or salesperson, in the ordinary course of listing and
selling real estate, to recommend a listing or purchase price. The workflow must not be
presented as a lender appraisal. See the Alabama Real Estate Commission's [CMA, BPO or
Appraisal guidance](https://arec.alabama.gov/docs/newsletter/update/update_spring2006.pdf).

## Evidence Workflow

1. Define the assignment, intended user, purpose, effective date, and inspection status.
2. Normalize subject facts and retain source, observed date, and verification state per fact.
3. Build a candidate pool without silently removing weak candidates.
4. Score each candidate on property type, market proximity, recency, living area, bed and
   bath count, age, and evidence of a closed sale.
5. Label each candidate `include`, `review`, or `exclude`, with reasons and unresolved issues.
6. Calculate visible raw-price and price-per-square-foot cross-checks.
7. Record adjustment factors as unresolved until a market-supported method is documented.
8. Reconcile the evidence, calculate a confidence score, and cap public-data confidence.
9. Save the complete workfile as a versioned artifact with an audit event.
10. Require MLS verification and human review before seller presentation.

## Provider Roles

### RentCast

RentCast is the fast baseline. One request per subject returns subject facts, an AVM range,
and candidate comparables. The AVM is an independent cross-check, not Harriett's conclusion.

### Bright Data Closed Beta

Bright Data is an asynchronous, portal-observed enrichment source. It can expand the
candidate pool and add observed status, sale history, property fields, source URLs, and
conflict signals. It is never labeled MLS. Every retained field must carry `provider`,
`source_url`, `observed_at`, and `verification_state`.

The beta connector must run behind a feature flag and a durable job. It must not ingest or
display third-party listing photos unless written reuse rights are documented. Bright Data's
[service agreement](https://brightdata.com/license) makes the client responsible for use,
disclaims non-infringement, and assigns third-party defense and indemnity obligations to the
client. Zillow, Redfin, and Realtor.com separately prohibit automated extraction in their
published terms. Before this becomes a production dependency, obtain source-specific written
permission covering commercial use, storage, display, AI grounding, and indemnity.

### Authorized MLS Feed

MLS becomes the authoritative source for listing status, complete closed-sale inventory,
sale terms, concessions, days on market, private remarks where permitted, and licensed media.
It enters through the same normalized evidence interface, so the CMA engine does not need a
provider-specific rewrite.

## Media Rights

The property workspace may display:

- agent or brokerage-owned uploads;
- properly attributed Google Street View imagery used under Google's terms;
- MLS media where the feed license grants display rights;
- generated collateral based only on licensed inputs.

Portal listing photos are not copied, cached, or displayed merely because a scraping provider
can return their URLs. A source link may be retained for human verification when permitted.

## Confidence Ceiling

Public-data CMA prep is capped at 65 points. It cannot receive a high-confidence label.
Confidence rises with qualified closed candidates, complete subject facts, and a coherent
provider range. It falls with missing sale evidence, stale or distant candidates, property-type
mismatches, incomplete facts, wide dispersion, and unresolved source conflicts.
