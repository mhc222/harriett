# Harriett Product Operating System Plan

Status: confirmed product direction, 2026-08-24

## 1. Feature Summary

Harriett will be the brokerage's operating layer across pre-listing work and active
transactions. Agents can start work through SMS, WhatsApp, or in-app chat; Harriett saves
the resulting research, drafts, decisions, tasks, and approvals in the dashboard so agents,
coordinators, and brokers can continue from the same record.

Harriett is a lightweight brokerage CRM, but CRM is one module rather than the whole
product. The defining capability is coordinated work across people, properties, deals,
communications, documents, deadlines, and connected systems.

Confirmed product decisions:

- Agents, coordinators, and brokers use one product with role-specific home views.
- Dotloop remains authoritative for signed documents and transaction files after adoption.
- Harriett keeps her existing Tuscaloosa identity and look, with Pritchett-Moore presented as
  the pilot brokerage rather than replacing Harriett's brand.

## 2. Primary User Action

The primary action is to understand what needs attention next and move it forward. Every
screen and every Harriett reply should answer three questions:

1. What changed or needs attention?
2. What does Harriett recommend?
3. What can I review, approve, edit, or complete now?

## 3. Product Boundary

Harriett owns the coordinated state of work. Connected systems retain authority over their
specialized records.

| System | Authoritative responsibility | Harriett responsibility |
| --- | --- | --- |
| Harriett / Supabase | Deals as worked by the office, relationships, tasks, approvals, generated work, memory, and audit history | Provide the unified operating view and canonical workflow state |
| Dotloop | Signed documents, loops, participants, and transaction-file state | Detect and link changes, mirror selected metadata, surface missing work, and write back only through explicit approved actions |
| MLS | Authoritative listing, status, and sold data | Read and normalize permitted data, cite its source and freshness, flag discrepancies, and support agent-reviewed CMA work |
| Microsoft 365 | Email, calendar, and mailbox contacts | Detect relevant events, link them to work, draft approved communications, and create or update calendar records according to permissions |
| RentCast | Third-party property facts, estimates, and preliminary comps | Use sparingly, preserve request provenance, label limitations, and save useful results as research runs |
| Twilio | Agent messaging transport | Authenticate inbound messages, send concise agent-only replies, track delivery, and link substantial results to the dashboard |
| Mem0 / pgvector | Stylistic memory and governed retrieval | Personalize Harriett without replacing structured records or office policy |

Harriett should never depend on one provider's field names inside the product UI or core
workflow logic. Each integration maps provider data into Harriett's canonical objects and
retains a link back to the source record.

## 4. Shared Work Model

### Existing foundation to keep

The Phase 2 schema already provides most of the operating spine:

- Identity: offices, agents, agent profiles, permissions, and RLS.
- CRM foundation: deals, contacts, deal contacts, vendors, and documents.
- Work: checklist items, calendar events, workflow runs, and workflow events.
- Communication: threads, messages, consent evidence, and delivery state.
- Governance: action requests, approval delegations, deal evidence, and audit log.
- Intelligence: AI runs, skill runs, retrieval events, knowledge, memory, and feedback.
- Integrations: connections, secrets, Microsoft subscriptions, and provider health.

### Objects to add or generalize

1. **Properties**
   A property exists before a deal and can have many research runs or transactions. Store a
   normalized address and stable identity. Deals retain their address snapshot and gain a
   property link.

2. **Property research runs**
   Save the subject, request, provider calls, normalized facts, valuation result, comp set,
   caveats, freshness, confidence flags, usage count, and originating conversation. A run is
   immutable evidence; a later refresh creates a new version.

3. **Artifacts**
   Store durable generated work such as research notes, seller appointment briefs, CMA
   drafts, MLS remarks, marketing copy, email drafts, meeting summaries, and reports. Each
   artifact has a type, status, version, author, source run, related property/deal/contact,
   and renderable content.

4. **Tasks outside transaction checklists**
   Keep deal checklists for procedural requirements. Add general work items for research
   follow-up, appointments, agent requests, coordinator handoffs, and broker review.

5. **External record links**
   Replace provider-specific assumptions with a mapping between a Harriett object and an
   external provider record. Preserve provider ID, external URL, synchronization timestamp,
   version/hash, and selected metadata.

6. **Synchronization runs and conflicts**
   Record each pull or push, counts, cursor, errors, and conflicts. A conflict must identify
   both values, their sources, their timestamps, and the rule or person that resolved it.

All new tables remain office-scoped, RLS protected, and audited. Provider payloads are
validated before normalization. Secrets remain service-role only.

## 5. Chat and Dashboard Contract

Chat and dashboard are two interfaces to the same services and permissions. Business logic
must not live only in a webhook or UI component.

### Chat behavior

- Give the useful answer first in short, readable plain text.
- Save substantive work automatically as a research run, artifact, task, or action request.
- State what was saved and provide one dashboard deep link.
- Offer one relevant next action instead of a menu of possibilities.
- Never imply that preliminary property data is MLS-verified.
- Require the same approval gates as the dashboard for external or consequential actions.

Example:

> Bottom line: RentCast suggests a preliminary range of $205k to $225k. The strongest
> public-data comps are below the automated estimate, so I would verify the final set in MLS.
>
> I saved the full research note in Harriett: [Open research]
>
> Next step: turn this into a seller appointment brief.

### Dashboard behavior

- Show the complete result, sources, freshness, caveats, and history.
- Allow users to correct facts without rewriting the underlying source evidence.
- Turn approved results into the next work object, such as research to CMA draft.
- Show the originating conversation and return channel when useful.
- Use the same action request and workflow services that chat invokes.

## 6. Information Architecture

### Shared navigation

- **Today:** recommended work, due items, new events, stalled work, and approvals.
- **Pipeline:** pre-listings, active listings, under-contract deals, closings, and exceptions.
- **Contacts:** clients, prospects, cooperating agents, and vendors connected to activity.
- **Research:** property research, seller prep, and later CMA drafts.
- **Approvals:** agent and broker decisions with exact payloads and consequences.
- **Activity:** readable history across messages, systems, workflows, and human actions.
- **Connections:** provider status, last synchronization, capabilities, and errors.

Settings, office policy, knowledge publishing, and agent memory belong under administration,
not in the daily navigation.

### Role-specific home views

**Agent Today**

- Their next five meaningful actions.
- Active requests from Harriett and pending personal approvals.
- Upcoming appointments, deadlines, and recent saved work.
- A compact Ask Harriett entry point with contextual suggestions.

**Coordinator Today**

- Office-wide exceptions ordered by urgency.
- Missing documents, stale handoffs, unconfirmed dates, and work due today.
- Dense, filterable queues grouped by stage and responsible person.
- Bulk operational actions only where the same review standard applies to every item.

**Broker Today**

- Approval queue first.
- Compliance and data-quality exceptions.
- Pipeline health and stalled transactions.
- Agent activity and audit access without exposing private stylistic memory.

### Core detail views

**Property workspace:** identity, facts, research history, related contacts, related deals,
artifacts, and source discrepancies.

**Deal room:** overview, work, documents, people, communications, and activity. Compliance
flags and upcoming dates remain visible while moving between sections.

**Research detail:** bottom line, subject facts, valuation range, selected comps, map or
photos when available, caveats, source timestamps, confidence flags, and actions to refresh,
correct, create an artifact, or start a CMA draft.

## 7. Design Direction and Layout Strategy

The dashboard should feel like a calm, experienced office coordinator: compact, legible,
and specific. It should not look like a marketing site or a wall of generic metric cards.

- Use an application shell with stable navigation and a role-aware Today view.
- Lead with an ordered work queue, not vanity statistics.
- Use tables and compact rows for repeated operational records.
- Use cards only for individual artifacts, approvals, and genuinely framed tools.
- Use full-width detail bands and tabs inside property and deal workspaces.
- Keep source, freshness, confidence, and status near the fact they qualify.
- Adapt mobile layouts into focused task flows rather than shrinking desktop tables.
- Preserve Harriett's illustrated portrait, black ink, warm neutral, crimson houndstooth,
  and serif-wordmark character. Future brokerage branding should sit beside Harriett through
  tenant-level marks and supporting tokens rather than replacing her identity.

## 8. Key States

- **First use:** explain the next useful connection or action through the empty state.
- **Loading:** preserve the page structure and identify which source is being queried.
- **Working:** show durable background progress and allow the user to leave the page.
- **Success:** show what was created, where it was saved, and the next available action.
- **Partial data:** distinguish missing facts from provider errors and unverified values.
- **Conflict:** show competing values, source dates, and the resolution path.
- **Approval required:** show the exact action, recipient, content, reason, and consequences.
- **Provider degraded:** keep existing Harriett records available and explain which updates
  may be stale.
- **No permission:** explain who can perform or approve the action without leaking data.
- **Rate limited:** show cached results and when a refresh is sensible, especially for the
  50-call RentCast proof-of-concept plan.

## 9. Integration Contract

Every connector should implement the same conceptual lifecycle:

1. Authenticate and report capabilities.
2. Receive a webhook or poll using a durable cursor.
3. Validate the provider payload with a versioned schema.
4. Store a payload hash and source metadata for idempotency and evidence.
5. Normalize into a Harriett event or canonical object.
6. Reconcile according to field ownership and freshness rules.
7. Start a durable workflow when the event requires work.
8. Push externally only through an explicit permission and approval policy.
9. Record the result in provider sync history and the audit log.

Each normalized fact should be able to answer: where did this come from, when was it true,
how confident are we, and has a human confirmed it?

## 10. Phased Build Plan

### Slice 1: Prove the chat-to-dashboard loop

Use the live RentCast and WhatsApp flow because it already works end to end.

- Add properties, property research runs, and artifacts with RLS and audit coverage.
- Save every successful property lookup and valuation as a research run.
- Build the Research list and Research detail views.
- Return a concise WhatsApp summary with a signed or authenticated dashboard deep link.
- Display call usage, source timestamps, caveats, and the raw-to-normalized evidence trail.
- Allow a research run to create a seller appointment brief artifact.

This slice proves the central product behavior: ask in chat, inspect and continue in the
dashboard.

### Slice 2: Establish the operating shell

- Build shared navigation and role-aware Today views.
- Add general work items and a unified attention query.
- Connect approvals, checklist deadlines, calendar events, workflows, and recent artifacts.
- Add notification preferences and deep-link routing from agent messages.

### Slice 3: Build property and deal workspaces

- Add the property workspace and link existing deals to properties.
- Expand the deal room around existing contacts, documents, checklists, messages, evidence,
  and activity.
- Add corrections with provenance instead of overwriting source facts.
- Generate office pipeline and weekly summary views from the same deal data.

### Slice 4: Connect Microsoft 365

- Complete per-agent Graph OAuth and connection health.
- Detect relevant inbox events and Instanet notifications.
- Link messages and attachments to contacts, properties, and deals.
- Create drafts and calendar actions through the existing approval framework.

### Slice 5: Add Dotloop without changing the product model

- Implement Dotloop as a provider adapter using external record links.
- Detect loop, participant, status, and document changes.
- Reconcile Dotloop facts against Harriett without silently overwriting confirmed values.
- Deep-link to the authoritative Dotloop record.
- Add carefully scoped write-back only after read synchronization is reliable.

### Slice 6: Add MLS-backed research and CMA preparation

- Connect the brokerage-authorized MLS Web API feed.
- Normalize listing, status, photos, and sold data into the property research layer.
- Add comp selection, exclusion reasons, adjustment notes, and MLS verification state.
- Generate a versioned CMA draft for agent review, never an autonomous price recommendation.
- Preserve RentCast as a secondary source and discrepancy signal.

### Slice 7: Overwatch and brokerage operations

- Detect missing steps, stale deals, disclosure risks, and conflicting system state.
- Produce role-specific daily alerts and the Monday pipeline summary.
- Measure completion time, missed-item reduction, approval turnaround, provider reliability,
  and adoption by channel.

## 11. Acceptance Criteria for the First Slice

The first slice is complete when an opted-in agent can:

1. Ask Harriett in WhatsApp for research on a Tuscaloosa property.
2. Receive a concise response without markdown artifacts.
3. Open one authenticated link to the saved research detail.
4. See the subject facts, preliminary value, comps, sources, timestamps, and caveats.
5. Start a seller appointment brief from that research without re-entering the address.
6. Return later and find the work in Research history.

The coordinator and broker must be able to see the run according to office permissions, and
the full path must be represented in AI, skill, workflow, provider, and audit records.

## 12. Success Measures

- Agents retrieve saved work instead of requesting the same research again.
- Coordinator time spent chasing status and missing items decreases.
- Broker approvals contain enough context to decide without opening multiple systems.
- Every displayed consequential fact includes source and freshness.
- Connected-system failures do not remove existing Harriett records.
- A new provider can be added without changing dashboard concepts or core workflow logic.
- Harriett catches meaningful missed work without creating a noisy alert queue.

## 13. Implementation References

Use the Impeccable interaction, spatial, responsive, typography, color, and UX-writing
references when implementing the application shell and role-specific queues. Prioritize
interaction and spatial guidance for the dense coordinator experience, and responsive and
UX-writing guidance for the agent phone experience.

## 14. Open Questions for Later Slices

These do not block the first slice:

- Exact Dotloop API access level and write-back permissions available to the brokerage.
- Final MLS provider, permitted retention period, display rules, and photo licensing.
- Whether brokerage contacts should synchronize bidirectionally with Microsoft 365 or remain
  linked read-through records during the pilot.
- Which agent and coordinator corrections should become office knowledge versus private
  agent preference.
- Tenant co-branding controls required before the first brokerage beyond Pritchett-Moore,
  with Harriett's core identity remaining fixed.
