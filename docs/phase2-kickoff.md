# Phase 2 Build Kickoff

Written 2026-08-11 at the end of the clean-slate strategy session. Paste the prompt below into Claude Code to start the build. Full rationale lives in the strategy report (claude.ai artifact 62d16cd8-329a-4017-96b0-ebfefbf606ef) and CLAUDE.md carries the decided stack and guardrails.

## The kickoff prompt

```
Start the Harriett Phase 2 build. This is day 1 of the 16-week plan in the
2026-08-11 strategy report. CLAUDE.md has the decided stack and hard guardrails;
memory has the full context (phase2-stack, clean-slate-review-20260811).

Ground rules: clean rebuild in a new harriett-app/ directory. harriett-demo/
stays untouched as reference material. Port, do not copy-paste: prompts,
DealFields contract (add contract acceptance date), memory corpora, ical.ts,
cloudflare-worker (add a shared secret), Supabase table shapes, design tokens.

Day 1 work, in order:
1. Draft the A2P 10DLC pre-registration checklist for Wilson: EIN legal
   name/address match, SMS opt-in page copy, privacy policy language, sample
   messages that match real Harriett output. This is the critical path.
2. Plan the migration set before writing code: ported tables plus users/roles,
   contacts, documents, consents/opt-outs, approval queue, message threads,
   audit trail. Show me the schema and repo structure for approval first.
3. Scaffold: Next.js App Router, Supabase Auth, RLS via user-scoped clients,
   zod contracts, Vercel AI SDK 6, Trigger.dev v4, CI with tests from commit one.
4. First feature: the parse pipeline as a durable Trigger.dev task with TESTED
   date math. The lead-paint 10-day window anchors on contract acceptance date.

Non-negotiables from CLAUDE.md apply from the first commit: every action writes
an audit row, no JSON.parse on raw model text, no consumer texting paths.
```

## Build order after day 1 (from the report, Section 10)

| Weeks | Focus |
| --- | --- |
| 1-3 | Foundation: identity, audit-writing data layer, parse pipeline, contacts/documents as first-class tables |
| 3-6 | Channels: Twilio SMS/RCS agents-only (signature validation, opt-outs, drift guardrail), Graph OAuth + inbox detection, Instanet parser |
| 6-9 | The broker approval queue + dashboard (hero feature; the week-9 demo no competitor can show) |
| 9-12 | Pre-listing suite, PWA recorder (AI Memo quality bar), per-agent memory and onboarding that persists |
| 12-16 | Pilot launch: 5 agents, Claude Projects for Wilson and Tanner, workshop, overwatch digest, hardening |

## Open items to chase in parallel

- Pilot agent names (2 to 3) from Wilson/Tanner; blocker by week 3 for Graph OAuth
- Tuscom / Nick Biscoe for M365 admin consent
- Rechat Lucy enterprise pricing (competitive intel before Phase 4 packaging)
- RCS per-message pricing confirmation before Phase 4 unit economics
