# Phase 2 Active Execution Plan

Updated: August 26, 2026

This is the active build plan. Contract, scope, and meeting documents remain historical records and are not the tonight execution queue.

## Active now

1. Make the conversational runtime merge-ready and restore healthy Vercel previews.
2. Complete the daily operating shell and transaction workspace.
3. Ship meeting capture for a permissioned recording, dictated voice memo, or written memo. The output is a structured summary and linked next steps, never a stored transcript.
4. Ship review-ready marketing materials generated from verified public property facts.
5. Ship photo coordination plans with readiness checks, preferred vendor candidates, scheduling questions, and linked work. No vendor is contacted or booked automatically.
6. Ship internal document drafts with missing facts and required human review called out. No legal form is signed or represented as compliant.
7. Keep every generated artifact, workflow event, task update, and failure in the audit trail.

## Deferred

- Cross-channel migration acceptance testing across existing conversations. This is the former item 3 and will be scheduled after the current product slice.
- Microsoft 365 setup, Graph email, Outlook calendar, mailbox contacts, and agent-context email delivery.
- Pilot participant selection, onboarding, training, consent collection, and controlled rollout.
- Dotloop, voice calling, office-wide rollout, and other Phase 3 work.

## Acceptance gates

- `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` pass in `harriett-app`.
- Vercel Git projects build from their actual monorepo roots.
- Meeting source audio is private, a live recording requires an explicit permission attestation, and no transcript is persisted.
- Meeting next steps become persistent work items linked to the selected transaction and contact.
- Each of the three deal workflows creates one retry-safe artifact plus retry-safe work items.
- Marketing generation excludes consumer names and private contract terms.
- Photo coordination performs no automatic external action.
- Document output stays an internal draft for human or broker review.
- Production schema migrations for conversation context, direct PWA policies, meetings, and deal workflows are applied before these routes are promoted.

## Deployment order

1. Merge the conversational runtime after migrations `20260827021843_conversation_context.sql` and `20260827021851_direct_pwa_runtime_policies.sql` are ready.
2. Apply migrations `20260827021858_meetings_and_deal_workflows.sql` and `20260827022031_harden_pwa_context_access.sql`.
3. Deploy the operating workflow branch to preview and complete a smoke test with a test transaction.
4. Merge and promote the verified preview.
5. Schedule the deferred cross-channel acceptance run separately.

## Completed August 26

- The Vercel Git projects now use the correct monorepo roots, and both the demo and Phase 2 app previews build successfully.
- The four production schema migrations above are applied and verified on the Harriett Supabase project.
- Trigger.dev production version `20260827.1` is deployed with all 16 project tasks detected.
- Anonymous access to the direct PWA completion function and conversation context is removed. The PWA function remains available only to signed-in callers and validates tenant ownership inside the transaction.
- PR 1 and PR 2 are merged into `main`. The merged release passed CI, both Vercel production deployments are ready, and the post-deploy error scans are empty.
