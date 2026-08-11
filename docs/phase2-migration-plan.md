# Phase 2 Migration Set and Repo Structure

Day 1 plan for approval before scaffolding. 2026-08-11.

Ported table shapes come from harriett-demo/supabase (deals, checklist_items,
calendar_events, vendors, offices). New in Phase 2: real identity (Supabase Auth),
contacts, documents, consent, threads, and an append-only audit log. Managed with real
Supabase CLI migrations this time; the prod DB becomes reproducible from the repo.

## Design decisions

- **Users and agents are one table.** `agents` carries the role column
  (broker | agent | coordinator) and a nullable `user_id` to `auth.users`. A row is
  created at invite time and linked when the person first signs in, which handles the
  invite flow without a separate users table.
- **The approval queue is not a table.** It is `messages where status =
  'pending_review'`. One state machine, one source of truth, the dashboard filters it.
- **Consent is an event log plus a current flag.** `consent_events` is append-only
  evidence (what was said, how, when); `agents.sms_consent` is the current state the
  send path checks. Opt-out by any means writes an event and flips the flag globally.
- **Audit log is append-only.** UPDATE and DELETE revoked for all roles including
  authenticated. Service role writes happen only inside Trigger.dev tasks and webhook
  handlers, and every such write also writes an audit row.
- **RLS via JWT claims.** `office_id`, `agent_id`, and `role` live in
  `auth.users.app_metadata`, set at invite. Helper functions (`app.office_id()`,
  `app.agent_id()`, `app.role()`) read them; every policy starts from
  `office_id = app.office_id()`. Single-tenant today, multi-tenant for free later.
- **contract_acceptance_date** joins DealFields and the deals table. The lead-paint
  10-day window anchors here (the demo computed it wrong two ways).

## Tables (13 + 1 view)

```sql
offices          id, name, timezone, created_at

agents           id, office_id, user_id -> auth.users (nullable), name, email, phone,
                 role (broker|agent|coordinator),
                 outreach_mode (draft_only|review_before_send|auto_ack),
                 sms_consent (none|opted_in|opted_out), sms_consent_at,
                 mem0_user_id, active, created_at

deals            id, office_id, agent_id, address, city, state, zip, county,
                 status (pre_listing|listing_active|under_contract|closing|closed|cancelled),
                 list_price, sale_price, listing_date,
                 contract_acceptance_date,          -- NEW, anchors lead-paint window
                 closing_date, parsed_fields jsonb,
                 source (manual|email_parse|instanet|dotloop),
                 instanet_id, dotloop_id, created_at, updated_at

contacts         id, office_id, agent_id (owner), name, kind
                 (seller|buyer|buyer_agent|lender|title|attorney|other),
                 email, phone, notes, created_at

deal_contacts    deal_id, contact_id, role_on_deal, primary key (deal_id, contact_id)

vendors          id, office_id, agent_id, type, name, contact, phone, email, notes,
                 preferred, created_at              -- ported; strictly agent-gated

documents        id, office_id, deal_id, agent_id, storage_path (Supabase Storage),
                 filename, mime_type, doc_type (listing_agreement|purchase_agreement|
                 net_sheet|disclosure|settlement|other),
                 source (upload|email|instanet|dotloop), sha256,
                 parse_status (pending|parsed|failed), created_at

threads          id, office_id, agent_id, deal_id (nullable),
                 channel (sms|email|internal), subject, created_at

messages         id, office_id, thread_id, deal_id, agent_id, direction, channel, body,
                 consumer_facing boolean not null default false,
                 status (draft|pending_review|approved|rejected|queued|sent|delivered|failed),
                 approved_by, approved_at, rejection_reason,
                 waitpoint_token,                    -- Trigger.dev approval gate
                 provider_message_id,                -- Twilio SID / Graph id
                 sent_at, created_at
                 -- constraint: consumer_facing AND channel = 'sms' is impossible
                 -- constraint: consumer_facing messages cannot reach 'queued'
                 --             without approved_by + approved_at

consent_events   id, office_id, agent_id, phone, channel (sms),
                 event (opt_in|opt_out|help),
                 method (web_form|keyword|natural_language|verbal),
                 evidence jsonb, occurred_at        -- append-only

checklist_items  id, office_id, deal_id, agent_id, category, title, detail,
                 due_date, required, completed, completed_at, completed_by, created_at

calendar_events  id, office_id, deal_id, agent_id, title, date,
                 type (closing|inspection|deadline|appointment|listing),
                 address, note, created_at

audit_log        id, office_id, actor (harriett|user|system), actor_id,
                 agent_id, deal_id, action, payload jsonb, created_at
                 -- append-only: UPDATE/DELETE revoked

approval_queue   VIEW: messages where status = 'pending_review'
```

## RLS summary

| Table | Policy |
| --- | --- |
| everything | `office_id = app.office_id()` baseline |
| vendors | own rows only (`agent_id = app.agent_id()`), no exceptions, not even broker |
| contacts | own rows, plus broker and coordinator read |
| messages | agents see own; broker sees all; only broker can set approved/rejected |
| audit_log | insert for authenticated, select for broker; no update/delete for anyone |
| agents | read own office; only broker updates roles and outreach_mode |

Service-role key: only inside Trigger.dev tasks and webhook handlers (Twilio, worker),
never in route handlers serving browsers. Those get user-scoped clients from the
session.

## Migration files

```
supabase/migrations/
  0001_identity.sql        offices, agents, app.* claim helpers, RLS
  0002_deals.sql           deals, documents, contacts, deal_contacts, RLS
  0003_vendors.sql         vendors, RLS (agent-gated)
  0004_comms.sql           threads, messages, consent_events, approval_queue view, RLS
  0005_work.sql            checklist_items, calendar_events, RLS
  0006_audit.sql           audit_log, revoke update/delete, RLS
  seed.sql                 PM office, Wilson (broker), Alyssa (coordinator)
```

## Repo structure

```
harriett-app/
  app/                        Next.js App Router
    (app)/                    authed surface: dashboard, deals, approvals, settings
    api/                      route handlers (webhooks, uploads); zod on every input
    login/
  lib/
    contracts/                zod schemas: DealFields (+contractAcceptanceDate),
                              checklist, marketing, outreach; single source of truth,
                              AI structured outputs and API inputs both validate here
    db/                       createUserClient() (RLS), createServiceClient()
                              (audited jobs only), generated types
    ai/                       prompts (ported from demo), model callers via AI SDK 6
                              with zod outputs and fallback provider
    audit.ts                  writeAudit(), the one required call
    dates.ts                  business-day and window math; lead-paint window
                              anchored on contract_acceptance_date; fully tested
    ical.ts                   ported
  trigger/                    Trigger.dev v4 tasks: parse-pipeline, send-sms
                              (consent + drift guardrail), approval waitpoints
  worker/                     Cloudflare email worker, ported + shared secret header
  supabase/migrations/        above
  tests/                      vitest; dates.test.ts lands with commit one
  .github/workflows/ci.yml    typecheck, lint, vitest on every push
```

## What ports from the demo (rewrite, not copy)

| Asset | Change |
| --- | --- |
| PARSE_SYSTEM + DealFields | becomes a zod schema; add contractAcceptanceDate; AI SDK structured output replaces JSON.parse |
| CHECKLIST/MARKETING/CMA/OUTREACH prompts | port content; all outputs zod-validated |
| lib/ical.ts | port as-is, add tests |
| cloudflare-worker | port + shared secret; zod-validate payload server-side |
| table shapes | as above, office_id from JWT instead of hardcoded UUID |
| design tokens (globals.css) | port palette and fonts when UI work starts |
| memory seed corpora | port when Mem0 self-hosted lands (weeks 9-12) |
```
