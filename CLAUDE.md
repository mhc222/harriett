# Harriett — Claude Code Project Guide

This file tells Claude Code how to work in this repo. Source of truth for the full project context is the scope doc imported below. Keep this file lean: only things Claude would not infer from the codebase on its own, plus hard guardrails.

@docs/scope.md

---

## What we are building

Harriett is an AI transaction assistant for **Pritchett-Moore Real Estate, LLC** in Tuscaloosa, Alabama. She helps real estate agents with transaction coordination (inspections, closings, marketing, document drafting, photographer coordination) and general assistance. The product will eventually be productized for other brokerages.

We are currently in **Phase 1 (proof of concept)**, then **Phase 2 (pilot, 5 opted-in agents)**, then **Phase 3 (full office plus voice plus dotloop)**, then **Phase 4 (multi-tenant SaaS)**. See the scope doc for the full phase plan.

## Tech stack (locked)

- **Frontend / admin:** Next.js 15 (App Router) on Vercel
- **Agent app:** Installable PWA with web push notifications
- **Database, auth, storage:** Supabase (Postgres + RLS + pgvector). Single source of truth.
- **AI orchestration:** LangGraph.js (multi-step reasoning, HITL gates, branching)
- **Durable execution:** Trigger.dev (long-running tasks, waitpoints)
- **LLM:** Claude Sonnet 4.5 primary, GPT-5 fallback, Gemini 2.5 for multimodal
- **Per-agent memory:** Mem0 cloud
- **SMS:** Twilio Programmable Messaging, direct (not through any platform). A2P 10DLC registered and owned directly.
- **Voice (Phase 3):** Twilio Voice + Deepgram (STT) + ElevenLabs (TTS)
- **Email:** Microsoft Graph sendMail for agent-context email. Resend for transactional/system email.
- **Inbox / calendar / contacts:** Microsoft Graph SDK
- **Vendor booking pages:** Cal.com
- **Billing (Phase 4):** Stripe direct (Stripe Billing)

## What we are NOT using (do not suggest)

- **GoHighLevel / GHL.** Removed June 2026. Was originally the comms layer in a hybrid stack. All references should be gone.
- **Generic IMAP.** Office is on Microsoft 365; always use Microsoft Graph.
- **n8n / Zapier for core workflows.** All orchestration goes through LangGraph + Trigger.dev.
- **Graph databases (Neo4j, Graphiti).** Not needed at this scale. Knowledge layer is Postgres + pgvector + Mem0.
- **SendGrid.** Resend is the chosen transactional provider.
- **Form Simplicity.** That is Florida. Alabama uses the Alabama Realtors form library.
- **A separate vector DB.** pgvector inside Supabase is sufficient.

## Knowledge architecture (where things live)

Different kinds of knowledge live in different stores. Do not default to "throw it in a vector DB."

- **CRM data** (deals, contacts, vendors, agent profiles, opt-in status, approval rules) → Postgres tables
- **Vendor relationships** (agent ↔ inspector / photographer / title company) → Postgres foreign keys
- **Per-agent stylistic memory** (tone, signature, preferences, "T-Money") → Mem0
- **Compliance corpus** (RECAD, TCPA, A2P 10DLC, FCC, ARC, AL forms) → pgvector
- **Templates** (listing copy starters, vendor outreach scripts) → Postgres + pgvector for fuzzy retrieval
- **Conversation history** → Postgres (raw, for audit) + Mem0 (distilled facts)
- **Static long context** (brand voice doc, office policy, standing instructions) → Claude prompt caching

## Channel strategy

- **Text-first.** SMS via Twilio is the agent's primary channel.
- **App is the control panel,** not the front door. Build the in-app PWA chat as a true peer to SMS so Phase 4 has a cheaper channel at scale, but do not push agents into the app for things they should do over text.
- **Email** is for forwarding contracts to Harriett (Microsoft Graph read) and for Harriett sending on behalf of the agent (Graph sendMail).
- **Push notifications** via web push, designed to feel like texting.

## Compliance — non-negotiable

These are hard rules. Do not write code that bypasses them, even for tests or "internal" flows.

- **Broker approval queue gates every consumer-facing message** (text, email, or voice) before send. No exceptions.
- **A2P 10DLC** brand and campaign must be registered and owned directly via Twilio. Registration submitted on Day 1 of Phase 2 (critical path; approval takes 1+ weeks).
- **Consent capture, STOP, HELP, and opt-out** handled in-app and written to Supabase. Twilio webhook handlers must enforce opt-out state before any outbound send.
- **Complete audit trail** of every Harriett action stored in Supabase. No fire-and-forget; everything writes a row.
- **AI voice disclosure** at call start (Phase 3) per FCC February 2024 ruling.
- **No outbound voice to consumers.** Vendor outbound only. Inbound from agents is fine.
- **Alabama RECAD agency disclosure** must be considered for every consumer-facing draft.
- **Multi-tenant from day one:** every table has RLS policies, even in Phase 2 when there is only one tenant.

## Phase-aware behavior

- **Phase 1 (now):** WhatsApp Sandbox demo only via Twilio. No production phone number, no 10DLC, no multi-agent support. Single transaction. Email via Microsoft Graph read-only.
- **Phase 2:** Production build. Twilio SMS direct. 10DLC registration kicks off Day 1.
- **Phase 3:** Voice via Twilio Voice + Deepgram + ElevenLabs. Dotloop API integration. Full office rollout.
- **Phase 4:** Multi-tenant SaaS on the same stack. No migration step.

If unsure whether a feature belongs in the current phase, ask. Do not preemptively build Phase 3 voice plumbing inside Phase 1 demo code.

## Code conventions

- TypeScript everywhere. `strict: true`.
- Next.js App Router. Route handlers and server actions for API surfaces, not `/pages/api/`.
- Supabase RLS policies on every table from creation. Treat single-tenant as "tenant_id = 'pritchett-moore'."
- Use Trigger.dev for any operation that may sleep more than 30 seconds, wait on a human, or span webhooks.
- Use LangGraph for any multi-step AI reasoning with branching or HITL gates.
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
