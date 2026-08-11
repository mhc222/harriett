# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Source of truth for the full project context is the scope doc imported below. Keep this file lean: only things Claude would not infer from the codebase on its own, plus hard guardrails.

@docs/scope.md

---

## Repository layout

```
harriett-demo/          Next.js 15 web app (the demo + coordinator dashboard)
harriett-agent/         Expo React Native app (mobile agent PWA, Phase 2)
harriett-demo/cloudflare-worker/   Cloudflare Worker for Twilio WhatsApp webhook (Phase 1 demo)
harriett-demo/trigger/  Trigger.dev task for async SMS processing
harriett-demo/supabase/ SQL migrations (run numbered files in order via Supabase SQL editor)
```

All active development is in `harriett-demo/`. The other sub-apps are stubs or Phase 2 scaffolding.

## Development commands

All commands run from `harriett-demo/`:

```bash
npm run dev      # start local dev server on :3000
npm run build    # production build (runs type check)
npm run lint     # eslint
```

No test suite yet in Phase 1.

## Supabase schema setup

Schema is not managed via Supabase CLI migrations yet. To set up a fresh project, paste the SQL files in order into the Supabase SQL editor:

```
supabase/run1-schema.sql          core tables + seed agents/offices
supabase/run2-policies.sql        RLS policies
supabase/run3-calendar-events.sql calendar_events table
supabase/run4-checklist-items.sql checklist_items table
supabase/run5-checklist-due-date.sql add due_date column to checklist_items
supabase/seed-vendors.sql         optional vendor seed data
```

See `supabase/run-in-sql-editor.md` for the exact SQL if the files above are out of sync.

## Key architecture: how a deal flows

1. **PDF upload** (`/api/upload-url` or direct multipart) sends listing agreement to `/api/parse`
2. **Parse route** calls `callClaudeWithPdf()` with `PARSE_SYSTEM` prompt, returns `DealFields` JSON
3. Parse route writes: `deals` row in Supabase, Mem0 memory seed (`seedDealMemory`), calendar events (`writeCalendarEvents`), checklist items (`generateAndSaveChecklist`)
4. **Dashboard** (`/dashboard`) polls `/api/deals/latest` for the current deal, renders checklist and calendar
5. **Chat** (`/api/chat`) fetches live deal context from Supabase + vendor table, injects into Harriett's system prompt alongside Mem0 search results

## Phase 1 hardcoded constants

These UUIDs are seeded by `run1-schema.sql` and hardcoded in several files. Do not change them without updating the DB seed:

```
OFFICE_ID = "00000000-0000-0000-0000-000000000001"  // Pritchett-Moore
AGENT_ID  = "00000000-0000-0000-0001-000000000002"  // Jerrod Hastings
```

`DEFAULT_USER_ID = "jerrod-hastings"` is the Mem0 user ID (string, not UUID).

## Required env vars

```
ANTHROPIC_API_KEY
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
MEM0_API_KEY
TWILIO_ACCOUNT_SID          (Phase 1 WhatsApp sandbox)
TWILIO_AUTH_TOKEN
TWILIO_WHATSAPP_FROM
```

Set in `.env.local` locally and in Vercel env vars for production.

---

## What we are building

Harriett is an AI transaction assistant for **Pritchett-Moore Real Estate, LLC** in Tuscaloosa, Alabama. She helps real estate agents with transaction coordination (inspections, closings, marketing, document drafting, photographer coordination) and general assistance. The product will eventually be productized for other brokerages.

We are currently in **Phase 1 (proof of concept)**, then **Phase 2 (pilot, 5 opted-in agents)**, then **Phase 3 (full office plus voice plus dotloop)**, then **Phase 4 (multi-tenant SaaS)**. See the scope doc for the full phase plan.

## Tech stack (decided 2026-08-11, clean-slate review)

Evidence and rationale live in the strategy report (claude.ai artifact 62d16cd8-329a-4017-96b0-ebfefbf606ef, Section 7). Two deliberate changes from the earlier list: LangGraph.js was dropped, and Mem0 moved from cloud to self-hosted.

- **Frontend / admin:** Next.js (App Router) on Vercel
- **Agent app:** Installable PWA with web push notifications. Meeting capture (record or dictate, structured summary out) is the app's killer feature, not chat.
- **Database, auth, storage:** Supabase (Postgres + RLS + pgvector + Supabase Auth). Single source of truth. RLS is enforced through user-scoped clients; the service-role key is allowed only inside audited background jobs.
- **Agent runtime:** Vercel AI SDK 6 (tool loops, structured outputs). No LangGraph; plain tool loops plus durable jobs cover every workflow with one less abstraction.
- **Durable execution + HITL:** Trigger.dev v4. Waitpoint tokens are the approval-gate primitive: draft, create token, pause free for days, webhook or dashboard completes it. Watch item: Vercel Workflows (GA April 2026), re-evaluate at Phase 4.
- **LLM:** Claude Sonnet primary, with prompt caching, tool use, and zod-validated structured outputs. Fallback provider wired from day one.
- **Per-agent memory:** Mem0 OSS self-hosted on Supabase pgvector. Structured facts (vendors, preferences) live in Postgres; only stylistic memory goes to Mem0. Exit path is plain pgvector.
- **SMS / RCS:** Twilio, direct, under the ISV model (one subaccount + brand + campaign per brokerage customer; never send tenant traffic under our own brand). RCS enabled with automatic SMS fallback. Outbound messaging goes to agents only; Harriett never texts consumers.
- **Voice (Phase 3):** Twilio Voice + Deepgram (STT) + ElevenLabs (TTS)
- **Email:** Microsoft Graph sendMail for agent-context email (including all consumer-facing sends, broker-approved, from the agent's own address). Resend for transactional/system email.
- **Inbox / calendar / contacts:** Microsoft Graph SDK. Cloudflare email-forwarding worker kept as the zero-OAuth ingestion fallback.
- **Vendor booking pages:** Cal.com
- **Billing (Phase 4):** Stripe direct (Stripe Billing)

## What we are NOT using (do not suggest)

- **GoHighLevel / GHL.** Removed June 2026. Was originally the comms layer in a hybrid stack. All references should be gone.
- **LangGraph / LangGraph.js.** Dropped August 2026 after the clean-slate review. Multi-step reasoning uses Vercel AI SDK tool loops; HITL gates use Trigger.dev waitpoints.
- **Temporal.** Evaluated and rejected for this team size (worker fleet, $100/mo floor, replay-versioning discipline). Do not reintroduce without a new decision.
- **Mem0 cloud.** Self-hosted Mem0 OSS on our own pgvector only (cloud deployment quality risk).
- **Postmark.** Phase 1 demo drift. Resend is the transactional provider.
- **Generic IMAP.** Office is on Microsoft 365; always use Microsoft Graph.
- **n8n / Zapier for core workflows.** All orchestration goes through the AI SDK + Trigger.dev.
- **Graph databases (Neo4j, Graphiti).** Not needed at this scale. Knowledge layer is Postgres + pgvector + Mem0.
- **SendGrid.** Resend is the chosen transactional provider.
- **Form Simplicity.** That is Florida. Alabama uses the Alabama Realtors form library.
- **A separate vector DB.** pgvector inside Supabase is sufficient.
- **Consumer-facing SMS.** Harriett texts agents, never consumers. Consumer-facing communication is broker-approved email via Graph. Do not build consumer texting paths without a new decision.

## Knowledge architecture (where things live)

Different kinds of knowledge live in different stores. Do not default to "throw it in a vector DB."

- **CRM data** (deals, contacts, vendors, agent profiles, opt-in status, approval rules) → Postgres tables
- **Vendor relationships** (agent ↔ inspector / photographer / title company) → Postgres foreign keys
- **Per-agent stylistic memory** (tone, signature, preferences, "T-Money") → Mem0 (self-hosted, backed by our pgvector)
- **Compliance corpus** (RECAD, TCPA, A2P 10DLC, FCC, ARC, AL forms) → pgvector
- **Templates** (listing copy starters, vendor outreach scripts) → Postgres + pgvector for fuzzy retrieval
- **Conversation history** → Postgres (raw, for audit) + Mem0 (distilled facts)
- **Static long context** (brand voice doc, office policy, standing instructions) → Claude prompt caching

## Channel strategy (decided 2026-08-11)

- **Text-first, agents only.** SMS/RCS via Twilio is the agent's conversational front door. RCS enabled (verified branded sender, suggested-reply buttons) with automatic SMS fallback for older devices. Harriett never texts consumers.
- **Cost is a non-issue at pilot scale** (about a penny per segment, under $50/month for the whole office); the reason for SMS is adoption, not price. In-app chat becomes the cheaper channel at Phase 4 scale.
- **The PWA is the control panel and the recorder.** Meeting capture (live recording with permission, or a short dictated memo after a showing; output is a structured summary with next steps, never a transcript, auto-linked to the right contact and deal) is the app's reason to exist on an agent's phone. Build in-app chat as a true peer to SMS, but do not push agents into the app for things they should do over text.
- **Consumer-facing communication is email**, drafted by Harriett, gated by the broker approval queue, sent via Graph from the agent's own address.
- **Email in** is for forwarding contracts to Harriett (Graph read, plus the Cloudflare forwarding worker fallback).
- **Push notifications** via web push, designed to feel like texting.
- **Every Harriett reply offers a next action.** No blank-box chatbot UX; she initiates and suggests, because agents do not prompt.

## Compliance — non-negotiable

These are hard rules. Do not write code that bypasses them, even for tests or "internal" flows.

- **Broker approval queue gates every consumer-facing message** (email, and voice in Phase 3) before send. No exceptions. Consumer-facing text does not exist as a channel.
- **A2P 10DLC** brand and campaign registered under the ISV model (Standard brand on the brokerage's EIN, Mixed or Low Volume Mixed use case). Submitted on Day 1 of Phase 2; plan 3 to 4 weeks end to end (brand clears in days, campaign review runs 10 to 15 days, rejections add 3 to 7 each). Pre-submission checklist first: legal name and address exactly matching IRS EIN records, public SMS opt-in language, privacy policy that does not permit sharing numbers for marketing, sample messages matching real Harriett output.
- **Consent capture and opt-out**: honor opt-outs expressed by any reasonable means (STOP, QUIT, natural language), not just keywords, within 10 business days; one confirmation text allowed. The opt-out flag is global across message types (the revoke-all rule lands January 2027). Twilio webhook handlers must enforce opt-out state before any outbound send, and validate Twilio signatures.
- **Use-case drift guardrail**: outbound SMS content must stay inside the registered campaign use case and sample-message style, with SHAFT filtering, enforced in the send path. Carrier post-approval audits are real; an LLM composing freely is the failure mode.
- **Complete audit trail** of every Harriett action stored in Supabase. No fire-and-forget; everything writes a row.
- **AI voice disclosure** at call start (Phase 3) per FCC February 2024 ruling.
- **No outbound voice to consumers.** Vendor outbound only. Inbound from agents is fine.
- **Alabama RECAD agency disclosure** must be considered for every consumer-facing draft.
- **Multi-tenant from day one:** every table has RLS policies, even in Phase 2 when there is only one tenant.

## Phase-aware behavior

- **Phase 1 (complete):** WhatsApp Sandbox demo via Twilio. Single transaction, single hardcoded agent, no auth. The demo repo is reference material; the Phase 2 build is a clean rebuild that ports the domain assets (prompts, DealFields contract, memory corpora, ical.ts, Cloudflare worker, table shapes, design tokens) and replaces the scaffolding. See the 2026-08-11 strategy report for the full keep/rebuild inventory and 16-week plan.
- **Phase 2 (now):** Production build. Twilio SMS/RCS direct, agents only. 10DLC registration kicks off Day 1 (3 to 4 week critical path).
- **Phase 3:** Voice via Twilio Voice + Deepgram + ElevenLabs. Dotloop API integration. Full office rollout.
- **Phase 4:** Multi-tenant SaaS on the same stack. No migration step.

If unsure whether a feature belongs in the current phase, ask. Do not preemptively build Phase 3 voice plumbing inside Phase 1 demo code.

## Code conventions

- TypeScript everywhere. `strict: true`.
- Next.js App Router. Route handlers and server actions for API surfaces, not `/pages/api/`.
- Supabase RLS policies on every table from creation. Treat single-tenant as "tenant_id = 'pritchett-moore'."
- Use Trigger.dev for any operation that may sleep more than 30 seconds, wait on a human, or span webhooks. Human approval gates are waitpoint tokens, always.
- Multi-step AI reasoning uses Vercel AI SDK tool loops with zod-validated structured outputs. Never `JSON.parse` raw model text; never scrape actions from reply text with regex.
- Audit-trail writes are non-optional for any agent-facing or consumer-facing action.
- Use `zod` for runtime validation on all external inputs (Twilio webhooks, Graph webhooks, dotloop webhooks).
- Do not commit `.env`; use `.env.local` and Vercel env vars.
- Do not include secrets in `CLAUDE.md` or any committed file.

## Style (matches project owner preferences)

- **No em dashes** anywhere in code comments, docs, copy, or user-facing strings. Use commas, semicolons, parentheses, or sentence breaks.
- **No emojis** unless explicitly requested.
- Plain English over jargon in any user-facing text.
- Harriett's voice is professional but folksy (Alabama). Not chirpy, not robotic.
- First-person "I" voice in client-facing materials.
- Do not produce content that sounds generically AI-polished.

## Key people

- **Wilson Moore** — President / Broker of Record. Approval authority.
- **Tanner Ashcraft** — Associate Broker. Co-buyer of the engagement.
- **Alyssa** — Real estate coordinator. Owns the back-office checklist. Heavy user of the coordinator dashboard.
- **Vicki** — On staff. Light AI user (ChatGPT for MLS descriptions).

## When in doubt

The work is in the bridge between unstandardized agent workflows and the AI brain, not in the LLM itself. If a design choice makes Harriett smarter but harder to adopt for a paper-first office, choose adoption.

Harriett does not have one brain. She composes per-decision from Postgres (structured) + Mem0 (memory) + pgvector (policy) + prompt cache (persistent context). Reference this mental model in any architectural code you write.
