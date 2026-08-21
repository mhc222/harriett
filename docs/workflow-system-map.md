# Harriett Workflow and System Map
## Pritchett-Moore Real Estate — Prepared June 2026

This document maps every workflow Harriett handles, what she does in each one, what accounts or connections are required to unlock each capability, and which phase each piece arrives. Use it as the reference for what to connect and when.

---

## What Is Live Today (Phase 1 Demo)

The following capabilities are working right now, on your actual transaction data (604 2nd St NW, Gordo), without any additional accounts needing to be connected:

**Contract reading and deal setup.** Upload a listing agreement or purchase contract as a PDF. Harriett reads it, extracts every material detail (parties, price, dates, loan type, compliance flags), writes the deal to the database, and generates the transaction checklist and calendar in one pass.

**Transaction checklist.** Harriett generates a categorized, dated checklist for every deal based on what is in the contract. It pulls from the database on return visits so it loads instantly. Compliance items (lead paint disclosure, RECAD, FHA Amendatory Clause) are flagged automatically based on property age and loan type.

**Calendar events.** Harriett creates dated entries for the listing date, closing date, inspection deadline (10 days before closing, per Alabama buyer-beware rules), and lead paint disclosure window. These are stored in the dashboard and can be emailed as .ics calendar invites to any address.

**Marketing copy.** Harriett drafts the MLS remarks (800-character limit enforced), a Facebook/Instagram post, and listing presentation talking points from the contract data. No manual entry needed.

**CMA slide builder.** The agent enters the subject property and comparable sales manually. Harriett analyzes the comps, adjusts for differences in size and condition, and produces a client-ready presentation with a suggested price range, per-square-foot analysis, and positioning notes. Pricing output is always flagged as a draft for agent review.

**Vendor outreach drafts.** Harriett drafts outreach emails to photographers, inspectors, title companies, appraisers, and deed prep vendors. Proposed dates and all deal context are included. The agent or coordinator reviews and sends.

**Harriett chat (Ask Harriett).** The agent can ask Harriett anything about the active deal. She answers from the contract data, her memory of office procedures and Alabama law, and the vendor list. She knows deadlines, compliance requirements, party names, and next steps without the agent having to look anything up.

**Approval queue.** Harriett-drafted messages queue for broker review before anything is sent. Wilson approves or edits in the dashboard. Nothing goes out without a human sign-off.

**WhatsApp (sandbox).** During Phase 1, the agent can text Harriett directly on WhatsApp using the Twilio sandbox number. She can receive contract PDFs by text and respond with the deal summary. This is a demo channel only, not a production phone number.

**Dashboard.** The coordinator dashboard shows the active deal, the checklist with completion status, the calendar strip, the approval queue, and deal activity. Designed for Alyssa and the coordinator role.

---

## Pre-Listing Workflows

These workflows happen before a listing agreement exists. They are agent-facing only. Because nothing touches a consumer at this stage, the broker approval queue, A2P 10DLC, and TCPA restrictions do not apply.

---

### 1. Listing Presentation Prep

**What Harriett does:** Drafts a property-specific marketing flyer (or the content for one), writes the listing presentation talking points, and compiles property highlights the agent can use in the seller appointment. Output is in the agent's own voice once per-agent memory is built in Phase 2.

**Phase 1 (now):** Working. Harriett generates presentation talking points from contract data or manually provided property details.

**Phase 2:** Voice-matched output using per-agent memory and writing samples. Harriett will draft these materials to sound like the individual agent.

**Requires:**
- Phase 1: nothing additional. Harriett uses the deal data already loaded.
- Phase 2: per-agent onboarding (writing samples uploaded once; Harriett learns tone and style from them).

**Manual step that remains:** The agent delivers the presentation. Harriett prepares the materials; the appointment itself is the agent's.

---

### 2. MLS Description Drafting

**What Harriett does:** Writes the listing remarks for MLS entry. The 800-character hard limit is enforced automatically. Harriett includes relevant property features, neighborhood context, and any highlights provided by the agent. Output respects the Alabama Tuscaloosa Association of REALTORS field format.

**Phase 1 (now):** Working. Harriett drafts MLS remarks as part of the marketing package immediately after a contract is uploaded.

**Phase 2:** Voice-matched to the individual agent. Vicki currently runs the office ChatGPT for these. Harriett replaces that workflow with per-agent tone.

**Requires:**
- Nothing additional. MLS submission itself is done by the coordinator in the MLS system; Harriett drafts the copy.

**Manual step that remains:** Alyssa enters the copy into MLS. Harriett does not have MLS write access in Phase 1 or 2.

---

### 3. Social Media Content

**What Harriett does:** Drafts a Facebook post and Instagram-ready caption for the listing. Includes property details, price, agent and brokerage attribution, and a call to action. Harriett writes this at the same time as the MLS remarks.

**Phase 1 (now):** Working. Harriett drafts the post. The agent copies and posts manually.

**Phase 2:** Optional direct posting via Meta Pages API if the brokerage wants it. This requires a Meta Business Account setup (see Integration Map). The draft workflow works today regardless.

**Requires:**
- Phase 1: nothing. Copy-paste from Harriett's output.
- Phase 2 (optional): Meta Business Account, Facebook Page admin access, Meta Pages API authorization. One-time setup per brokerage.

**Manual step that remains:** The agent posts to their own social accounts. Harriett provides the copy. Direct posting via Meta API is optional.

---

### 4. CMA Draft Assembly

**What Harriett does:** Takes the subject property details and comparable sales the agent enters, then produces a multi-slide CMA presentation: price range recommendation, per-square-foot analysis, comp adjustments, and positioning language for the listing appointment. All output is clearly labeled as a draft for agent review.

**Phase 1 (now):** Working. The agent enters comps manually through the Pre-Listing CMA tool. Harriett analyzes and builds the slides.

**Phase 2:** Same flow. Possibly supplemented with MLS data pull if a clean integration path is available.

**Phase 3+:** Potential integration with MLS data feed. No clean public API exists today; comp data from MLS is inconsistent (foreclosures, $0 sales, mismatched square footage), so this will be assistive regardless of the source.

**Requires:**
- Phase 1: nothing. Agent enters comps.
- Phase 3+: MLS API access (to be evaluated; approach TBD).

**Important note on pricing:** Harriett is never autonomous on pricing. Every CMA output is a draft for agent review and human judgment. The agent presents and defends the number. This is a hard rule, not a feature toggle.

**Manual step that remains:** The agent reviews, adjusts as needed, and presents the CMA to the seller.

---

### 5. Seller Meeting Capture and Summarization

**What Harriett does:** Receives a recording or transcript from a seller meeting (voice memo, Otter export, or typed notes) and produces a summary, action items, and follow-up tasks. This feeds both the agent's to-do list and Harriett's memory for the deal.

**Phase 1 (now):** The agent can paste or type meeting notes; Harriett can summarize them in chat.

**Phase 2:** Structured intake for recordings or transcripts. Harriett turns them into formatted summaries and tasks.

**Phase 3:** Live phone or app-based voice capture via Twilio Voice plus Deepgram speech-to-text.

**Requires:**
- Phase 1: nothing. Manual note input via chat.
- Phase 2: file upload capability for transcripts.
- Phase 3: Twilio Voice, Deepgram, ElevenLabs (see Integration Map).

**Manual step that remains through Phase 2:** The agent records the meeting with their own device and shares it. Harriett handles the processing.

---

## Post-Signing Workflows (The 5 Core Workflows)

These workflows activate after a listing agreement or purchase contract is signed. They involve the full coordination chain: agent, coordinator, vendors, title company, and (in Phase 2 and beyond) some outbound to buyers and sellers. Every consumer-facing message routes through the broker approval queue before it goes out.

---

### 1. Marketing Materials

**What Harriett does:** On a new listing, Harriett produces the full marketing package:

- MLS remarks (800-character, enforced)
- Facebook and Instagram post copy
- Just Listed postcard copy (content for Alyssa or the coordinator to send)
- Agent News entry for the internal office bulletin
- Listing presentation talking points if needed post-signing

All output is available immediately after the contract is uploaded.

**Phase 1 (now):** Working. All marketing copy generated on upload.

**Phase 2:** Voice-matched per agent. Optional: direct social posting via Meta API if brokerage opts in.

**Requires:**
- Phase 1: nothing additional.
- Phase 2 (optional direct social posting): Meta Business Account, Facebook Page admin access, Meta Pages API.

**Manual step that remains:** Postcard printing and mailing is done through your existing postcard vendor. Harriett writes the copy; the coordinator places the order. MLS entry is done by Alyssa. Social posting is copy-paste unless the Meta API option is enabled.

---

### 2. Photo Coordination

**What Harriett does:**

- Drafts an outreach email or text to the photographer with the property address, proposed shoot dates, and agent contact
- Includes all relevant context (property type, square footage, special features, lockbox information if available)
- In Phase 2: sends the outreach, tracks confirmation, and follows up if no response within a set window
- Reminds the agent and coordinator of the confirmed shoot date

**Phase 1 (now):** Harriett drafts the vendor outreach. The agent or coordinator sends it manually.

**Phase 2:** Harriett sends directly to the vendor, logs confirmation, and tracks follow-up.

**Requires:**
- Phase 1: nothing additional.
- Phase 2: Twilio SMS (for text outreach) or Microsoft Graph (for email outreach from the agent's Outlook). See Integration Map.
- Optional Phase 2: Cal.com booking pages per photographer for self-scheduling. One-time setup per vendor.

**Manual step that remains through Phase 1:** The agent or coordinator sends the outreach. Harriett drafts it.

---

### 3. Document Drafting

**What Harriett does:**

- Auto-drafts the Seller's Net Sheet for every offer received, populated from deal data
- Drafts the broker letter to the seller (currently Gail's responsibility on the executive admin side)
- Flags which forms are required based on the contract: RECAD, lead paint, FHA Amendatory Clause, Dual Agency Agreement, Single Agency Designation
- Assembles the compliance disclosure checklist for the agent to initial before the file is accepted
- Flags material changes mid-transaction (example: when the loan type changed from USDA to FHA on 604 2nd St NW, Harriett would have flagged the FHA Amendatory Clause requirement automatically)

**Phase 1 (now):** Compliance flags, checklist, and form requirements are generated automatically on upload. Net Sheet drafting and broker letter drafting are partially built; the flag layer is complete.

**Phase 2:** Full Net Sheet auto-draft. Document packet assembly integrated with file management.

**Phase 3:** dotloop integration for structured document management as the office migrates platforms.

**Requires:**
- Phase 1: nothing additional. Harriett uses the contract data already loaded.
- Phase 2: nothing additional for drafting. If the brokerage wants Harriett to upload documents to Instanet, that requires API access to Instanet or dotloop.
- Phase 3: dotloop API access (office must migrate to dotloop first; planned later 2026).

**Manual step that remains:** The agent still initials the physical or digital checklist. Harriett generates it; compliance sign-off stays with the agent and broker.

---

### 4. Inspection Coordination

**What Harriett does:**

- Drafts outreach to the inspector (or confirms via the buyer's agent, since Alabama is buyer-beware)
- Notes that in Alabama, buyers arrange and pay for inspections, and factors this into all communication drafts
- Tracks the 10-day inspection window for pre-1978 properties (lead paint)
- Reminds the agent of approaching inspection deadlines
- Flags earnest money: when to deposit, when Chanda needs to be notified
- Follows up on inspection scheduling if no confirmation is received

**Phase 1 (now):** Harriett flags inspection deadlines and lead paint windows from the contract. Vendor outreach drafts are generated. Harriett understands Alabama buyer-beware rules and does not generate seller-side inspection instructions.

**Phase 2:** Outreach sends and confirmation tracking are automated.

**Requires:**
- Phase 1: nothing additional.
- Phase 2: Twilio SMS and/or Microsoft Graph for outreach sends. Same setup used across all vendor coordination.

**Manual step that remains through Phase 1:** The agent or buyer's agent arranges the inspection. Harriett coordinates the communication, not the physical inspection itself.

---

### 5. Closing Coordination

**What Harriett does:**

- Outreach to the title company to confirm closing date, time, and location
- Closing reminders to the agent and relevant parties
- Tracks the HUD/ALTA settlement statement: flags when it needs to be loaded into Instanet post-close
- Manages the MLS status change sequence: Active to Pending on contract, Pending to Sold on close
- Drafts Just Sold postcard copy
- Drafts commission notification email for Wilson, Gail, and the agent
- Logs the closed date in the deal record (Phase 2 replacement of the Excel Master Sales list)

**Phase 1 (now):** Closing date is tracked on the calendar. Harriett knows North River Title (Brittany Newton, 205-345-5310) as Jerrod's preferred title company. The chat interface can draft the closing confirmation outreach.

**Phase 2:** Full closing coordination workflow: outreach sends, HUD tracking, MLS status change flag, post-close notifications.

**Requires:**
- Phase 1: nothing additional.
- Phase 2: Twilio SMS and Microsoft Graph (same setup as photo and inspection coordination). MLS status changes still go through the coordinator manually in the MLS system; Harriett flags and drafts, does not have MLS write access.

**Manual step that remains:** The actual MLS status changes (Active to Pending, Pending to Sold) are performed by Alyssa in the MLS. Harriett flags them and confirms they happened.

---

## Cross-Cutting Capabilities

### Overwatch Layer

**What Harriett does:** Monitors the full pipeline of active deals and flags:

- Required forms that are missing or not yet signed
- Deadlines that are approaching or have passed without confirmation
- Steps that appear stalled (no vendor confirmation after expected window, no earnest money deposit logged)
- Material compliance events (loan type change mid-transaction, pre-1978 property without lead paint disclosure recorded)

**Phase 1 (now):** Within a single deal, Harriett tracks overdue and upcoming checklist items. The chat interface surfaces these proactively.

**Phase 2:** Full multi-deal overwatch. Wilson and Tanner see a pipeline-level view. Harriett proactively alerts on anything that looks stalled or at risk.

**Requires:** No additional integrations. The data is already in the platform.

---

### Broker Approval Queue

This is a compliance control, not a feature option. Every message Harriett drafts for delivery to a consumer (buyer, seller, vendor, or third party) routes to Wilson's approval queue before it goes out. Wilson reviews, edits if needed, and approves. Nothing is sent automatically to anyone outside the office.

In Phase 1, the approval queue is visible in the dashboard. Approval logs every decision with a timestamp and the message text.

There is no setting to bypass this for consumer-facing messages. For agent-facing outputs (checklist, CMA, marketing drafts), no approval step is required since the agent decides whether to use them.

---

### Audit Trail

Every Harriett action writes a record to the database: what was done, when, for which deal, and what was sent or generated. This covers:

- Contract uploads and parse results
- Checklist generation
- Marketing copy generation
- Vendor outreach drafts and sends
- Messages sent through the approval queue
- Calendar events created
- Mem0 memory updates

This is built from the beginning and does not require any additional setup. It is the basis for any future compliance reporting or dispute resolution.

---

## Integration Dependency Map

The table below summarizes every account or service connection required, organized by when it is needed. Connections marked "Phase 1" are already in place. Connections marked "Phase 2" need to be established at the start of Phase 2 work.

---

### Already Connected (Phase 1)

| Service | What It Does for Harriett | Notes |
|---|---|---|
| Supabase | Database, file storage, authentication | All deal data, checklist, calendar, messages, vendors |
| Anthropic (Claude AI) | Reads contracts, generates copy, runs chat | Primary AI brain; Sonnet 4.5 model |
| Mem0 | Per-agent memory across conversations | Stores deal facts, preferences, office procedures |
| Postmark | Sends calendar invites via email (.ics) | harriett@meetharriett.xyz |
| Twilio (WhatsApp sandbox) | Demo messaging channel | Sandbox only; not a production phone number |
| Vercel | Hosts the application | harriett-demo.vercel.app |

---

### Required for Phase 2 Launch

| Service | What It Enables | Setup Required | Notes |
|---|---|---|---|
| Twilio (production SMS) | Agent text channel; vendor outreach via text | Twilio account upgrade; dedicated phone number purchase | $1/month per number; ~$0.008/message |
| A2P 10DLC registration | Legal requirement for business SMS in the US | Brand + campaign registration through Twilio; submit Day 1 of Phase 2 | Approval takes 2 to 4 weeks; this is on the critical path |
| Microsoft 365 OAuth (per opted-in agent) | Email monitoring for new contracts; send email on behalf of the agent | Admin consent grant from the M365 administrator; OAuth setup per agent | One-time per agent; the agent keeps their own Outlook inbox |
| Microsoft Graph API | Reads agent inbox for Instanet notification emails; sends email as the agent | Requires M365 OAuth above | Same credential; two uses |

**Note on A2P 10DLC:** This is the federal carrier registration required for any business sending text messages in the United States. It is not optional and cannot be retroactively applied. Registration must be submitted on Day 1 of Phase 2 because carrier approval takes 2 to 4 weeks. If this is not started immediately, text messaging will not be available at pilot launch. The brand registration and campaign registration are filed once; they are not per-agent.

---

### Optional in Phase 2 (can add later)

| Service | What It Enables | Setup Required |
|---|---|---|
| Meta Business Account + Pages API | Direct posting from Harriett to the brokerage Facebook Page | Meta Business Account, Page admin access, developer app with Pages API scope; one-time setup |
| Cal.com (per vendor) | Self-scheduling links in vendor outreach emails | Cal.com account per photographer or inspector; free tier available |
| Trigger.dev (already in stack) | Durable scheduled reminders and follow-ups | No new account; already part of the tech stack |

---

### Required for Phase 3

| Service | What It Enables | Timing |
|---|---|---|
| dotloop API | Structured deal detection from dotloop when the office migrates | Office must complete dotloop migration first; planned later 2026 |
| Twilio Voice | Live voice calls (inbound from agents, outbound to vendors only) | Phase 3; paired with Deepgram and ElevenLabs |
| Deepgram | Speech-to-text for call transcription | Phase 3; used with Twilio Voice |
| ElevenLabs | Text-to-speech for Harriett's voice | Phase 3 |

**Note on voice:** Harriett's voice capability in Phase 3 is agent-inbound and vendor-outbound only. Outbound voice to consumers (buyers or sellers) is not planned. This is a TCPA compliance boundary, not a technical limitation.

---

## Phase Summary by Capability

| Capability | Phase 1 (now) | Phase 2 | Phase 3 |
|---|---|---|---|
| Contract PDF read and parse | Live | Live | Live |
| Transaction checklist generation | Live | Live | Live |
| Compliance flag detection | Live | Live | Live |
| Calendar event generation | Live | Live | Live |
| MLS remarks drafting | Live | Voice-matched | Live |
| Social media post drafting | Live (copy-paste) | Optional: direct post | Live |
| CMA slide builder | Live (manual comps) | Live | Possible MLS data |
| Vendor outreach drafts | Live | Live + auto-send | Live |
| Broker approval queue | Live | Live | Live |
| Audit trail | Live | Live | Live |
| Harriett chat (dashboard) | Live | Live | Live |
| WhatsApp (demo) | Live (sandbox) | Production SMS | Production SMS |
| Agent email monitoring | Not yet | Live (Microsoft Graph) | Live |
| Agent email sending | Not yet | Live (Microsoft Graph) | Live |
| Multi-deal overwatch | Single deal | Full pipeline | Full pipeline |
| Per-agent voice-matched copy | Not yet | Live | Live |
| Seller meeting capture | Manual/chat | Structured upload | Live voice capture |
| dotloop integration | Not yet | Not yet | Live |
| Voice calls | Not yet | Not yet | Live |

---

## What the Office Needs to Do Before Phase 2

1. Designate which 2 to 3 agents are in the pilot.
2. Provide the Microsoft 365 admin contact so OAuth consent can be set up for those agents.
3. Start A2P 10DLC registration on Day 1 of Phase 2. Matt will handle the technical registration; the brokerage needs to provide legal business name, EIN, and use case description.
4. Confirm the dotloop migration timeline so Phase 3 sequencing can be planned.

---

*Prepared by PD Labs for Pritchett-Moore Real Estate. Questions: matt@pdlabs.xyz*
