# Harriett: Internal Scope

Full phase detail and rationale. This file is the in-repo reference that `CLAUDE.md`
includes via `@docs/scope.md`. The authoritative, living version (discovery notes, client
briefs, workflow map, signed Phase 2 SOW) lives in Notion. Connect the Notion MCP and pull
the latest before treating any phase detail here as final.

> Status: reconciled against Notion on 2026-06-08. Updated 2026-06-08 with real transaction
> data from executed file (604 2nd St NW, Gordo, AL) and confirmed office checklists from
> kickoff follow-up docs. Workflow "today vs. Harriett" detail and final pilot agent names
> are still drafted in Notion after discovery; this file carries the locked structure,
> pricing, and deliverables.

## Thesis

The work is in the bridge, not the brain. LLMs already read contracts, draft emails, and
write listing copy. Real estate has almost no standardized systems, and every agent runs a
micro-business with their own tools, vendors, and habits. Build a per-agent assistant that
sits on top of whatever each agent already uses, not a generic AI dropped into a generic
system.

## Client

- Pritchett-Moore Real Estate, LLC. Tuscaloosa, AL. Independent brokerage.
- Roughly 10 to 20 agents. ~80/20 residential to commercial. Start residential.
- Wilson Moore: President/Broker, approval authority.
- Tanner Ashcraft: Associate Broker.
- Alyssa: real estate coordinator (uploads listing photos, manages MLS entry). Vicki: staff.
- Chanda: handles earnest money deposits.
- Gail: executive admin, cc'd on most coordinator communications.
- Paper-first today (paper files as primary records, Instanet for signed contracts only),
  moving to dotloop later this year. Microsoft 365 / Outlook, individual inboxes per agent.
  No shared CRM. Agents use their own e-sign tools. Agents range from AI-eager to
  AI-resistant.
- Current "CRM" substitute: two Excel Master lists (Listings, Sales), emailed to Wilson and
  Gail every Monday. Harriett should eventually generate or replace these.

## Where Harriett sits in the deal lifecycle

The June 8 discovery call pushed Harriett's scope upstream. She is not only a post-signing
transaction coordinator. The team's clearest priority ("marketing is the meat of Harriett")
is helping agents win listings in the first place, before any paperwork exists. So the
lifecycle has two stages:

1. **Pre-listing (win the listing).** Agent-initiated. The agent asks Harriett for help
   preparing for a listing appointment or marketing themselves. This is the front of the
   funnel and the lowest-compliance-risk surface, because everything Harriett produces here
   is agent-facing only. Nothing touches a consumer, so the approval queue, A2P 10DLC, and
   TCPA gates do not apply.
2. **Active transaction (coordinate the deal).** Inbox-detected (Phase 2) and dotloop-detected
   (Phase 3). Harriett notices the signed listing or contract and runs the five core
   coordination workflows below.

This means two trigger types, not one:

- **Agent request:** the agent explicitly asks ("Harriett, I'm presenting on Academy Drive,
  pull a CMA, send it to me to vet, then send to this email"). Drives pre-listing work.
- **Inbox / Instanet / dotloop detection:** Harriett notices a new listing or contract and
  reaches out. Drives active-transaction coordination. Phase 2 targets Microsoft Graph inbox
  and Instanet notification emails (current platform). dotloop detection adds in Phase 3.

## Pre-listing workflow (upstream)

Agent-initiated, agent-facing. The competitive-advantage and time-suck stage agents care
about most. Capabilities:

- **Listing presentation prep:** marketing flyer for the specific house, self-promotion
  material, more authentic social content, newsletter-style marketing.
- **CMA prep before the appointment:** pull comp data, assemble the analysis, send a draft
  for the agent to vet. Human-in-the-loop is mandatory here (pricing is substantive client
  advice). Comp data from MLS/CRS is dirty (foreclosures, $0 sales, wrong square footage)
  and has no clean API, so this is assistive draft plus manual cleanup, never autonomous
  pricing.
- **Property and agent research:** background on the property, neighborhood, and seller to
  support the pitch.
- **Voice-matched copy:** output in the agent's own voice (personas plus training on
  uploaded writing samples). Several agents already lean on the office ChatGPT for MLS
  descriptions; Harriett goes further by sounding like the individual agent.
- **MLS remarks / listing description drafting:** the listing copy itself. Vicki already
  does this through the office ChatGPT (address, highlights, ~10 photos, ~800-character MLS
  limit). Harriett drafts it voice-matched and respects the field limits.
- **Meeting listening:** capture a seller meeting (voice memo, Otter, recorder, or Notion
  today; a phone/watch capture later), summarize it, and turn spoken notes into follow-up
  tasks. Agent-facing capture, feeds Harriett's memory and the agent's to-do list.

Time-saved estimates for this stage are not yet quantified; it was scoped on the June 8
call and the numbers below cover only the post-signing workflows.

## The five core workflows (post-signing)

Discovery maps the active-transaction side across five workflows. These are the units
Harriett is measured against, and the basis for the time-saved math in the Phase 1 workflow
map.

| Workflow | Est. time saved per deal | Annual value (full office) |
| --- | --- | --- |
| Marketing materials | 45 min | $18,000 |
| Photo coordination | 30 min | $11,250 |
| Document drafting | 45 min | $14,062 |
| Inspection coordination | 60 min | $18,750 |
| Closing coordination | 90 min | $28,125 |
| **Total** | **4.5 hrs/deal** | **$90,187/year** |

The "how it works today" and "how Harriett handles it" detail per workflow is written into
the Notion workflow map after both discovery sessions and after the demo is built. Do not
treat the office-side detail as final until pulled from there.

Cross-cutting theme from discovery: agents want an "overwatch" layer that catches missed
steps and disclosures (e.g. lead-based paint) across several pending deals at once. That
peace-of-mind framing spans all five workflows, not any single one.

### Office coordinator workflow (confirmed from actual checklists)

These are the exact steps Alyssa and the coordinator run today. Harriett's automation targets
are embedded here.

**New listing (coordinator):**
1. Verify folder complete: signed listing agreement, other forms, photos, owner contact
   numbers, lockbox number, shackle code, CBS code. If missing, email agent immediately.
2. Receive and upload photos to Alyssa's computer.
3. Enter listing in MLS with photos. Convert provisional to active if needed.
4. Email MLS link to listing agent, cc Wilson and Gail.
5. Put listing in Agent News (internal office bulletin).
6. Log in Excel Master "Listings" list (emailed Wilson and Gail every Monday).
7. Make blue label for physical file folder.
8. Send Just Listed postcard. Email agent confirmation, copy Gail.
9. Place initial checklist inside folder cover.

**New listing (executive admin):**
- Email broker letter to seller. Copy agent, cc Wilson and Gail.

**Agent checklist (must initial before file accepted):**
- Listing Agreement signed, Listing Estimated Net Sheet, PM RECAD Disclosure, State RECAD
  Notification, Dual Agency Agreement, Designated Single Agency (Wilson approved), Lead-Based
  Paint Form (required if pre-1978), PM Exclusive Listing Form.
- Lock Box number, shackle code, CBS code, owner name, contact info, email.

**Pending sale (coordinator):**
1. Hold earnest money check until agent confirms it is a contract.
2. Put sale in Agent News.
3. Make white label for file folder (if PM listing, place white label over blue).
4. Log in Excel Master "Sales" list (emailed Wilson and Gail every Monday).
5. If PM listing: enter MLS Active to Pending; log contract date; take earnest money to
   Chanda to deposit (if agent approves); load final contract into Instanet for agent.
6. If not PM listing: load final contract into Instanet for agent.

**Sale checklist (agent must initial per offer):**
- Contract signed, Net Sheet (required for every offer amount), Lead-Based Paint, PM RECAD
  Disclosure, State RECAD Notification, Buyer's Agency, Dual Agency, Designated Single
  Agency (Wilson approved), Signed HUD.
- Concessions amount (must be completed). Selling agent + PSF + permission to change.
  Listing agent + PSF + permission to change. Pending date, closing date, property type.

**Closed file (coordinator):**
1. Record closed date in Excel Master "Sales" list. Email Wilson.
2. Change MLS status from Pending to Sold.
3. Load HUD/settlement statement into Instanet.
4. Send Just Sold postcards. Email agent confirmation.

**Closed file (executive admin):**
1. If commission check: email agent when check is signed and ready. Copy statement. Give or
   scan to Gail.
2. If direct deposit: email deposit slip to agent, copy Gail.

## Phases (three, locked)

### Phase 1: Proof of concept (offline, then parallel)

- Commercials: $7,200, ~48 hours, two weeks. Signed.
- Goal: prove Harriett can read a real transaction and produce useful, accurate output
  without touching production or clients.
- Run offline on one executed transaction first (a recent listing agreement or purchase
  contract, closed is fine, real data is the point). Then run in parallel on a live deal,
  output reviewed by a human, nothing sent.
- Exercises the brain: contract read, deal-detail extraction, transaction-coordination
  to-do list, marketing and pre-listing drafts, agent text. No outbound comms.
- Deliverables:
  - Complete map of how the office handles the five core workflows today.
  - Vendor map for the pilot agents.
  - Working demo on the office's real data (reads the contract, extracts deal details,
    drafts the to-do list, texts the agent).
  - Light pre-listing demo: a taste of the upstream work (a listing presentation / marketing
    asset or a CMA draft) so the office can see the front-of-funnel value, not just
    post-signing coordination. Kept light in Phase 1; full build lands in Phase 2.
  - Recorded ~5-minute walkthrough the office can share.
  - Fixed-price Phase 2 quote.
- **Demo transaction in hand:** 604 2nd St NW, Gordo, AL 35466 (Pickens County). Listed
  11/16/2025, contract 4/30/2026, closed 6/5/2026. Agent: Jerrod Hastings (PM). Sale price
  $208,000. Sellers: Larry Chung, Xuan Vuong, Amy Rohrer. Buyers: Shaina and Kevin Fields.
  Buyer's agent: Damon Gann (KW Tuscaloosa). Title: North River Title (Brittany Newton).
  Lender: First Federal Bank ISAOA. Loan type switched USDA to FHA on 5/14/2026 (material
  compliance event). PM commission $4,160 (2% listing). KW commission $6,240 (3% selling).
  Seller credit $9,700 toward buyer closing costs. Pre-1978 property: lead-based paint
  disclosure required and executed. No HOA. On municipal sewer. Appliances included:
  refrigerator, washer, dryer.
- What we still need from the client: 2 to 3 pilot agent names; M365 admin contact for
  OAuth setup; rough dotloop migration date; two 60-minute discovery session slots
  (Wilson/Tanner plus 1 to 2 pilot agents).
- If the office declines Phase 2 after this, they keep everything. No further commitment.

### Phase 2: The Pilot + AI Enablement Kickstart (signed SOW)

- Commercials: $31,800 fixed. 12 weeks from signed SOW. Operating costs $750/month
  post-launch. Optional retainer $1,500/month starting month 4.
- Detect new listings and contracts from agent inboxes via Microsoft Graph (not generic
  IMAP). Email-first detection here, including Instanet notification emails (current platform).
  dotloop structured detection comes in Phase 3.
- Reach out to the agent, coordinate the transaction, draft marketing and pre-listing work.
- Technical build:
  - Microsoft 365 integration per opted-in agent.
  - Per-agent training interface and memory.
  - Three workflows live: marketing materials, photo coordination, document drafting.
  - Pre-listing support (agent-initiated): listing presentation prep, CMA draft assembly,
    research, voice-matched copy, MLS remarks/description drafting, and meeting listening
    (capture a seller conversation, summarize, turn it into follow-up tasks). Agent-facing
    only, so no approval queue or A2P gate applies. Scope addition from the June 8 call.
    Decision (Matt, 2026-06-08): folded into the Phase 2 build at the current $31,800 price,
    not a separate line item. A light version of it is demoed in Phase 1.
  - Text and email outbound via GoHighLevel with A2P 10DLC registration.
  - Broker approval queue for all consumer-facing messages.
  - Admin dashboard for Wilson and Tanner.
- AI Enablement Kickstart:
  - Custom Claude Projects for Wilson.
  - Custom Claude Projects for Tanner.
  - 90-minute pilot agent training workshop.
  - 15-prompt starter library for pilot agents.
- Outbound is per-agent configurable: draft-only, review-before-send, or limited
  auto-acknowledgments (receipts and scheduling only).
- Timeline:
  - Weeks 1-2: discovery, workflow mapping locked.
  - Weeks 2-3: Claude Projects for Wilson and Tanner.
  - Weeks 3-10: production build, agent onboarding.
  - Weeks 6-7: pilot agent training workshop.
  - Weeks 10-12: pilot launch, weekly reviews, iteration.
  - Post-launch: 30 days included support.
- Pilot agents: confirmed during Phase 1 (2 to 3 names). Pull final names from the SOW.

### Phase 3: dotloop integration

- Automatic deal detection from dotloop once the office migrates.
- dotloop API integration layered on top of the Phase 2 brain. The brain does not change;
  detection gains a second, structured source.
- Trigger: the office's dotloop migration (planned later this year, exact date to confirm).
- Note: as of kickoff (June 2026), office still uses Instanet as primary doc platform.
  Phase 3 does not remove Instanet detection; it adds dotloop as a second trigger.

## Architecture

Hybrid: custom AI brain plus GoHighLevel comms layer. Supabase is the source of truth; GHL
is a secondary, replicated store for comms only. The two layers talk through webhooks and
APIs. The brain decides what to do; GHL delivers the words.

- Frontend & admin: Next.js 15 (App Router).
- Database & auth: Supabase (Postgres, RLS for multi-tenant isolation, pgvector for memory).
- Orchestration: LangGraph.js (durable workflows, state machine, human-in-the-loop).
- Workflow engine: Trigger.dev (long-running tasks, no timeout, waitpoints).
- LLM: Claude Sonnet 4.5 primary, GPT-5 fallback, Gemini 2.5 for multimodal if needed.
- Per-agent memory: Mem0 cloud, or self-hosted pgvector for cost control.
- Integrations: Microsoft Graph SDK (inbox, calendar, contacts); dotloop API in Phase 3.
- Comms & ops: GoHighLevel.

Portability is a hard constraint. Capabilities live in our code, not capped by what GHL can
do. If we migrate off GHL, the brain does not change. Keep every decision multi-tenant so
the build productizes for other brokerages without a single-tenant rewrite.

## Compliance guardrails

First-class concerns, enforced in code. Case law is real (Keller Williams $40M, Realogy
$20M, Lamb v. Mortgage One, Lowrey v. OpenAI).

- Human-in-the-loop for anything touching fiduciary duty or substantive client advice.
- Broker approval queue before any consumer-facing message goes out.
- Per-agent opt-in/opt-out. Outbound configurable per agent (see Phase 2).
- Vendor data is agent-gated. No cross-agent sharing, ever.
- A2P 10DLC registration for all SMS. AI disclosure at the start of every voice call.
- Voice scope: inbound from agents and outbound to vendors only. No consumer outbound voice
  (TCPA risk) until Phase 4+ with proper consent capture.
- RECAD agency disclosure reviewed on every draft. Reflect Alabama rules (buyer-beware:
  buyers arrange and pay for inspections), not a generic national flow.
- Full audit trail of every Harriett action stored in Supabase.

## Productization

- Serve Pritchett-Moore first, then productize for other brokerages.
- No NewCo. Revenue share stays an option, handled verbally.
- Every decision portable and multi-tenant from day one.

## Forms inventory (confirmed from actual transaction file)

PM uses these forms. Harriett must be able to parse all of them as input and reference them
for disclosure compliance checks.

| Form | When used | Notes |
| --- | --- | --- |
| PMRE Exclusive Right to Sell Listing Agreement | Listing intake | PM's own form, 7 pages |
| State Exclusive Right to Sell Listing Agreement | Listing intake | TAR template, 8 pages |
| PMRE Exclusive Buyer's Agency Agreement | Buyer representation | PM's own form, 4 pages |
| Alabama Purchase Agreement | Contract | Tuscaloosa Association of REALTORS, revised 2/6/26, 10 pages |
| Seller's Closing Estimate (Net Sheet) | Every offer | Generated for each offer price; Harriett should auto-draft |
| 2023 Purchasers Good Faith Estimate | Buyer cost estimates | Cash, Conventional, FHA 3.5, VA columns |
| Lead-Based Paint Disclosure | Pre-1978 properties | Required by federal law; 10-day inspection window |
| PMRE Agency Disclosure Office Policy | Every client | Updated 10/1/2025 |
| State RECAD Brokerage Services Disclosure | Every client | Alabama Real Estate Commission form |
| Alabama REALTORS Dual Agency Agreement | Dual agency situations | 2025 version |
| Alabama REALTORS Single Agent Designation Agreement | Two PM agents, one transaction | 2025 version; Wilson must approve |
| FHA Amendatory Clause and Real Estate Certification | FHA loans | Triggered when loan type is FHA |
| PMRE Office Exclusive Listing Agreement Addendum | Off-market listings | Optional; suppresses MLS for N days |
| ALTA Combined Settlement Statement / HUD | Closing | Loaded into Instanet after close |

## Known vendor relationships (from demo transaction)

These appear in the 604 2nd St NW file. Not universal to all agents, but real starting data
for vendor map work.

- Title: North River Title, Inc. / Brittany Newton — (205) 345-5310
- Lender: First Federal Bank ISAOA — 1300 McFarland Blvd NE, Tuscaloosa
- Appraiser: Randolph Appraisals, Inc.
- Deed prep: Robert S. Plott LLC
- Homeowner's insurance: Orion 180
- Recording: Pickens County Recording Office

## Open items / to reconcile from Notion

- Per-workflow "today vs. Harriett" detail in the workflow map (written after discovery +
  demo).
- Final pilot agent names (2 to 3). Sample transaction is now in hand (604 2nd St NW).
- Phase 2 SOW signature/date and any scope deltas locked at end of Phase 1.
- Per-agent persona and writing-sample onboarding flow (e.g. the agent who signs "T-Money").
- Exact dotloop migration date and API access plan.
- Vendor map contents per pilot agent (starter data exists from demo transaction above).
- Time-saved / value estimate for the pre-listing stage (not yet quantified).
- CMA data-access path: where comps can be pulled with least friction (MLS, CRS, or a
  third-party route), given no clean API and dirty source records.
- Confirm identity of Gail (executive admin cc'd on all coordinator comms) and whether
  she stays in workflows or Wilson/Tanner replace her post-Harriett.
- Instanet notification email patterns: need one example to build Phase 2 detection parser.
