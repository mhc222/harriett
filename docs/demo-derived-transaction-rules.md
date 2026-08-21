# Demo-Derived Transaction Timing Rules

Prepared 2026-08-21.

This captures the useful operational rules hiding in the Phase 1 demo. These should become structured Phase 2 transaction rules and policy knowledge, not per-agent Mem0 memories.

## Best Sources In The Demo

| Source | What to keep | Notes |
| --- | --- | --- |
| `harriett-demo/app/api/memory/seed-timeline/route.ts` | Pritchett-Moore timing rules, Gordo deal example, Excel Monday cadence, lead paint window, TRID reminders, earnest money handling | Strongest source for days and sequencing. Port content, not the Mem0 seeding pattern. |
| `harriett-demo/app/api/memory/seed-law/route.ts` | Alabama buyer-beware, attorney closing, written contract rule, RECAD and Act 2025-59 summary, lead paint, earnest money dispute handling | Needs citation review against official sources before it becomes compliance-grade. |
| `harriett-demo/app/lib/prompts.ts` | Deal extraction fields, checklist categories, PM form requirements, urgent flags for outreach | Port into zod schemas and policy-backed prompts. Do not keep raw JSON parsing. |
| `harriett-demo/app/lib/deal-events.ts` | Calendar and checklist generation shape | Keep the concept, but correct the date math. |
| `docs/workflow-map.md` | Alyssa's real coordinator workflow and "what Harriett does not do" boundaries | Good office-policy source. |
| `docs/workflow-system-map.md` | Phase 2 workflow mapping and overwatch layer | Good product behavior source. |
| `docs/a2p-10dlc-checklist.md` | SMS registration timing, message examples, agent-only texting rules | Keep in compliance corpus, separate from transaction deadlines. |

## Timing Rules To Carry Forward

### Contract Acceptance Anchor

Most under-contract timing starts at `contract_acceptance_date`, not listing date.

| Rule | Trigger | Due timing | Applies when |
| --- | --- | --- | --- |
| MLS Active to Pending task | Contract accepted | Same day | PM listing |
| White folder label | Contract accepted | Same day | PM listing, place over blue label |
| Hold earnest money pending confirmation | Offer received or contract received | Immediate | Any sale with earnest money |
| Final contract into Instanet | Contract accepted | Same day | All sales |
| Excel Master Sales update | Contract accepted | Next Monday report | Current PM office workflow |
| Loan pre-approval letter check | Contract accepted | Within 5 days unless contract says otherwise | Financed buyer |
| Earnest money deposit confirmation with Chanda | Contract accepted and agent approves | Within 5 days unless contract says otherwise | PM-held earnest money |
| Lead-based paint inspection window | Contract accepted | 10 calendar days unless waived in writing | Pre-1978 property or lead-paint language present |
| Inspection contingency reminder | Contract accepted | Contract controls, fallback reminder at 14 to 21 days | Buyer inspection contingency |
| Financing contingency reminder | Contract accepted | Contract controls, fallback reminder at 14 to 21 days | Financed transaction |
| Appraisal and loan commitment reminder | Contract accepted | Typical 21 to 30 days | Financed transaction |

### Closing Anchor

| Rule | Trigger | Due timing | Applies when |
| --- | --- | --- | --- |
| Closing Disclosure check | Closing date | At least 3 business days before closing | Most residential mortgage transactions under TRID |
| Final walkthrough reminder | Closing date | 1 to 2 days before closing | Buyer side, or listing-side visibility |
| Title search clear check | Closing date | Before closing | Attorney or title workflow |
| MLS Pending to Sold task | Closing/disbursement | Same day | PM listing |
| HUD or settlement statement into Instanet | Closing/disbursement | Same day | All closed files |
| Earnest money applied to closing costs | Closing/disbursement | Closing day | Earnest money present |
| Closed date recorded, Wilson notified | Closing/disbursement | Next Monday report, or same-day draft if office wants tighter workflow | Current PM office workflow |
| Just Sold postcard and confirmation | Closing/disbursement | Within a few days | PM listing |
| Commission check or direct deposit notice | Commission ready or deposit posted | Same day noticed | PM-side commission |

### Listing Anchor

| Rule | Trigger | Due timing | Applies when |
| --- | --- | --- | --- |
| Verify folder complete | New listing packet received | Same day or as soon as possible | All PM listings |
| Missing-item email to agent | Folder incomplete | Immediately | Any missing listing packet item |
| Receive and upload photos | Photos received | Same day or as soon as possible | All PM listings |
| MLS listing entry | Photos and packet ready | Same day or as soon as possible | All PM listings |
| MLS link email to agent, Wilson, Gail | MLS listing active | Same day | All PM listings |
| Agent News listing entry | MLS listing active | Same day or next office bulletin cycle | All PM listings |
| Excel Master Listings update | Listing active | Next Monday report | Current PM office workflow |
| Blue folder label | Listing active | Same day or as soon as possible | Physical file workflow |
| Just Listed postcard and confirmation | MLS listing active | Shortly after MLS entry | PM listing |
| Broker letter to seller | Listing active | Shortly after MLS entry | Executive admin workflow |

### Event-Based Compliance

| Rule | Trigger | Due timing | Applies when |
| --- | --- | --- | --- |
| FHA Amendatory Clause and Real Estate Certification | FHA loan detected | Before closing, preferably at contract execution | FHA transaction |
| FHA clause re-execution | Loan type changes to FHA | Same day or immediately after loan-type change | Mid-transaction loan change |
| RECAD disclosure check | Client relationship or agency discussion | Before substantive agency discussion | Every Alabama client relationship |
| Written brokerage agreement check | Buyer submits offer or seller lists property | Before offer submission or listing | Alabama Act 2025-59 workflow |
| Buyer-beware inspection posture | Inspection-related drafting | Always | Alabama residential transaction |
| Earnest money dispute hold | Conflicting claims to earnest money | Retain until written agreement or interplead | Broker holding earnest money |

## Things To Correct Before Porting

The demo computed some useful-looking dates the wrong way:

- `deal-events.ts` used `closing_date - 10 days` for the lead paint window. The correct anchor should be `contract_acceptance_date` unless the signed documents set a different inspection period.
- `deal-events.ts` also used `closing_date - 10 days` as a generic inspection deadline. That should not be treated as an Alabama rule. Contract terms control, with a fallback reminder only when no deadline is extracted.
- `generateAndSaveChecklist()` used `daysFromListing` and sometimes substituted today for listing date so the demo UI would show future dates. That was useful for the demo, but Phase 2 needs explicit anchors.
- The old memory routes seeded law and timing into one hardcoded user's Mem0 profile. These are brokerage and compliance knowledge, not Jerrod's stylistic memory.
- `JSON.parse(raw)` from model output should not come forward. Phase 2 should use zod-validated structured outputs through the AI SDK.

## Recommended Phase 2 Model

Use structured timing rules for calculations and pgvector knowledge for narrative policy.

Suggested fields for a `transaction_timing_rules` table or versioned JSON source:

```ts
type TransactionTimingRule = {
  id: string;
  jurisdiction: "US" | "AL" | "PM";
  sourceType: "federal_law" | "state_law" | "office_policy" | "contract_default" | "demo_example";
  title: string;
  trigger: string;
  anchor: "listing_date" | "contract_acceptance_date" | "closing_date" | "loan_application_date" | "loan_type_change_date" | "mls_active_date" | "commission_ready_at";
  offsetDays: number | null;
  offsetBusinessDays: number | null;
  dueTimingText: string;
  appliesWhen: string;
  contractOverrides: boolean;
  requiresHumanReview: boolean;
  authoritySourceId: string | null;
};
```

The important shift is from `daysFromListing` to `anchor + offset`, with business-day support and contract override flags.

## What Else We Can Take From The Demo

- The `DealFields` contract is still useful, but it needs `contractAcceptanceDate`, document provenance, and zod validation.
- The checklist categories are useful: `pre-listing`, `listing-active`, `under-contract`, `closing`.
- The office form list is valuable: PM RECAD, State RECAD, Dual Agency, Designated Single Agency, Lead-Based Paint, FHA Amendatory Clause, Net Sheet, HUD or ALTA statement.
- The overwatch idea is a keeper: Harriett should scan across deals for missing forms, approaching deadlines, stalled vendor confirmations, earnest-money ambiguity, loan-type changes, and post-close cleanup.
- The communication posture is a keeper: Harriett drafts and flags. Alyssa, Wilson, Gail, Chanda, agents, and attorneys retain their real-world responsibilities.
- The A2P checklist gives implementation deadlines for the SMS pilot: brand clears in 2 to 5 days, campaign review takes 10 to 15 business days, and rejections add 3 to 7 days.

## Recommended Next Step

Create a Phase 2 `dates.ts` and tests before wiring checklist generation:

1. `addCalendarDays(date, n)`
2. `addBusinessDays(date, n)`
3. `nextMondayAfter(date)`
4. `leadPaintWindow(contractAcceptanceDate)`
5. `closingDisclosureDeadline(closingDate)`
6. `deriveChecklistDueDates(deal, extractedContractTerms, timingRules)`

Then ingest this document as an internal `office_policy` knowledge source and mark the official law-backed rules with their source IDs from the compliance manifest.
