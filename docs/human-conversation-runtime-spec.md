# Harriett Human Conversation Runtime Specification

Status: Approved for implementation  
Owner: Harriett product and engineering  
Date: 2026-08-26  
Approved by: Matt Cronin  
Applies to: PWA chat, SMS, WhatsApp pilot, future RCS, and agent-facing email events

Deployment dependency update: The Pritchett-Moore A2P 10DLC registration was approved on 2026-08-26. Production sender assignment, Messaging Service configuration, webhook verification, and controlled enablement remain deployment checks rather than architecture blockers.

## Decision summary

There are good existing building blocks for conversational chat, but there is no safe drop-in product that should own Harriett's conversation state, tools, approvals, compliance rules, and audit trail.

Harriett should adopt the following pieces:

1. Use Vercel AI SDK UI and `@ai-sdk/react` for streaming, message state, tool-call state, errors, cancellation, and reconnection in the PWA.
2. Use selected Vercel AI Elements components as source-owned UI building blocks. Restyle them to match Harriett instead of adopting a generic chatbot appearance.
3. Keep the existing Vercel AI SDK v7 tool runtime, Supabase source of truth, Trigger.dev durable jobs, and direct Twilio integration.
4. Add one internal Conversation Gateway that all agent-facing channels call. This is the shared behavior layer that makes web, SMS, WhatsApp, and later RCS feel like the same Harriett.
5. Do not adopt Vercel Chat SDK as the production channel layer yet. Its official Twilio adapter currently documents SMS and MMS, while its WhatsApp adapter uses the Meta Cloud API. Harriett needs direct Twilio controls for signature validation, consent, opt-out, delivery callbacks, WhatsApp, and future RCS. Run a bounded adapter spike later, but do not block the human-conversation work on it.
6. Do not adopt Assistant Cloud, Twilio Conversations, Botpress, Voiceflow, n8n, or another hosted conversation store. Supabase must remain the canonical record, and Harriett's approval and audit rules cannot become best-effort integrations around another platform.

This is an enhancement of the current architecture, not a rewrite.

## Why this work is needed

The current conversation path is reliable but treats every inbound message like a durable workflow:

```text
Twilio webhook
  -> validate and store
  -> Trigger.dev queue
  -> model-based intent classification
  -> memory and context retrieval
  -> standard model and tool loop
  -> Twilio outbound API
  -> delivery callback
```

That is appropriate for publishing a Facebook post, parsing a contract, or waiting for approval. It is not appropriate for "Hi Harriett" or "What listings do I have?"

A measured production greeting took approximately:

- 7.6 seconds waiting for the Trigger.dev task to begin
- 8.2 seconds in the AI turn
- 17.7 seconds before the outbound message existed
- 20.5 seconds before the channel reported the message read or delivered
- 7,874 input tokens to produce a 16-token greeting

The goal is not simply to make the spinner faster. The goal is for the exchange to feel attentive, continuous, honest, and human.

## Product goal

An agent should feel as if Harriett is present in the conversation, understands the immediate context, responds at a pace appropriate to the request, and never loses track of work that continues after the chat reply.

Harriett must:

- respond quickly to greetings and simple questions
- show immediate, truthful signs of activity when work will take longer
- preserve context across PWA, SMS, WhatsApp, and later RCS
- use tools rather than inventing operational facts
- distinguish "I am working on it" from "I completed it"
- never claim a side effect until the provider confirms it
- record every meaningful transition with a timestamp and correlation ID
- preserve all existing consent, opt-out, approval, RLS, and audit requirements

## Non-goals

This project does not:

- replace Supabase with a vendor conversation database
- replace Trigger.dev for durable workflows and human approval waits
- add LangGraph, Temporal, n8n, or Zapier
- move SMS or WhatsApp traffic away from Twilio during the pilot
- create a consumer-facing chat or text channel
- introduce autonomous consumer communication
- add fake delays to imitate a person
- expose private model reasoning or chain-of-thought to agents
- rebuild every existing tool before PWA streaming can ship

## Existing solutions evaluated

| Solution | Useful capability | Fit for Harriett | Decision |
| --- | --- | --- | --- |
| Vercel AI SDK UI `useChat` | Streaming, submitted and streaming states, tool parts, approval responses, stop, retry, and resumable streams | Direct fit with the existing AI SDK v7 runtime and Next.js app | Adopt |
| Vercel AI Elements | Source-owned React components for conversations, messages, inputs, tools, and status | Direct fit with Next.js, React 19, and Tailwind 4. Harriett can fully restyle the copied components | Adopt selected components |
| assistant-ui | Mature thread UI, attachments, tool rendering, approvals, persistence adapters, dictation, and voice adapters | Strong alternative, but it adds a second runtime abstraction over capabilities already present in AI SDK UI. Its managed cloud would duplicate Supabase | Hold as an alternative, do not combine with AI Elements |
| Vercel Chat SDK | Normalized event and thread API across chat platforms, overlapping-message policies, web adapter, Twilio adapter, and WhatsApp adapter | Promising, but the documented Twilio adapter is SMS and MMS. WhatsApp uses a separate Meta adapter. Harriett needs direct Twilio WhatsApp, SMS, RCS, consent, status, and audit controls | Bounded spike only |
| Twilio Conversations | Hosted multi-channel threads, client SDKs, typing, read state, and media | Adds another canonical thread and message store, token system, and routing layer. It does not provide Harriett's tool intelligence or compliance model | Do not adopt now |
| Hosted bot builders | Visual flow building and managed bot runtimes | They would duplicate Harriett's tools, durable jobs, approvals, state, and audit controls. They make critical behavior harder to test and own | Do not adopt |

### Research references

- Vercel AI SDK `useChat`: <https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-chat>
- Vercel AI SDK tool approvals: <https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-tool-usage>
- Vercel AI Elements: <https://elements.ai-sdk.dev/docs>
- Vercel Chat SDK repository: <https://github.com/vercel/chat>
- Vercel Chat SDK Twilio adapter: <https://github.com/vercel/chat/tree/main/packages/adapter-twilio>
- assistant-ui documentation: <https://www.assistant-ui.com/docs/>
- Twilio WhatsApp typing indicators: <https://www.twilio.com/docs/whatsapp/api/typing-indicators-resource>
- Twilio Conversations overview: <https://www.twilio.com/docs/conversations-classic/overview>

## Architecture

### One conversation service, several channel adapters

```text
PWA useChat                 Twilio SMS / WhatsApp             Future channel
     |                               |                              |
     v                               v                              v
PWA transport                 Twilio adapter                 Channel adapter
     |                               |                              |
     +-------------------------------+------------------------------+
                                     |
                                     v
                         Harriett Conversation Gateway
                     authenticate, authorize, normalize, audit
                                     |
                    +----------------+----------------+
                    |                |                |
                    v                v                v
               Reflex lane       Fast lane       Durable lane
               no model          fast model      Trigger.dev
               no tools          read tools      writes, waits,
                                                  long workflows
                    |                |                |
                    +----------------+----------------+
                                     |
                                     v
                        Supabase canonical records
                messages, turns, events, runs, tools, actions
```

The Conversation Gateway is an internal TypeScript service, not a new hosted platform. The PWA route and Twilio webhook call the same service with different delivery adapters.

### Responsibilities

The channel adapter owns:

- provider signature or user-session verification
- translating the provider payload into a normalized inbound message
- channel formatting and length rules
- typing or progress signals supported by the provider
- delivery and read callbacks
- provider message IDs

The Conversation Gateway owns:

- tenant and agent authorization
- idempotency and correlation IDs
- thread continuity across agent-facing channels
- route selection
- context budget selection
- model tier selection
- tool availability and approval policy
- truthful progress events
- standardized result and error behavior
- audit writes

The domain tools own:

- querying live business data
- making internal changes
- proposing external actions
- executing approved actions
- returning typed, zod-validated results

Trigger.dev owns:

- work that can exceed a normal request budget
- external writes requiring retries
- human approval waits
- scheduled work
- work spanning multiple providers or webhooks

Supabase owns:

- canonical conversation history
- structured business facts
- authorization and RLS
- action state
- delivery state
- complete, append-only event history

## Conversation lanes

### Lane 0: deterministic reflex

Use no model and no queue when the answer is known and safe.

Examples:

- greeting and greeting return
- thanks and short acknowledgements
- HELP, STOP, START, and natural-language opt-out
- "Are you there?"
- an exact status request for a known running turn

Target behavior:

- response created in under 400 ms at p50
- no memory retrieval
- no full system prompt
- no fake claim that work is complete

### Lane 1: fast read

Use a deterministic or fast-model intent route, a restricted set of read-only tools, and a small context envelope.

Examples:

- "What listings do I have?"
- "When is my next closing?"
- "What is still due on Woodbank?"
- "Did the Facebook post publish?"
- simple conversation that needs recent context

Rules:

- prefer direct typed queries when the requested view is unambiguous
- use the fast model only to select or summarize typed results
- load no compliance corpus unless the intent requires it
- load no personal memory unless it changes the response
- use at most the recent 6 to 10 relevant messages, not a raw conversation dump
- target fewer than 2,500 input tokens for a simple operational question

### Lane 2: standard reasoning

Use the standard model and tool loop for requests requiring ambiguity resolution, several sources, or substantive drafting.

Examples:

- document questions requiring page evidence
- CMA preparation
- drafting an agent-facing email from several deal facts
- researching a property and explaining evidence gaps
- resolving an ambiguous transaction reference

Rules:

- start immediately in the PWA with streaming status
- show a WhatsApp typing indicator when supported
- send a short processing acknowledgement only when the predicted work exceeds the acknowledgement threshold
- never repeat the same acknowledgement during a recent back-and-forth

### Lane 3: durable action

Use Trigger.dev when the operation performs an external write, needs retries, waits on a human, or can exceed 30 seconds.

Examples:

- publish or delete a Facebook post
- parse and index a contract
- create an approval request and wait for review
- send an approved consumer email through Microsoft Graph
- monitor Gmail or Calendar
- scheduled reminders

Rules:

- return a saved work receipt immediately
- include what Harriett is doing and what will happen next
- continue after the chat request ends
- notify the agent on completion or failure
- every transition must remain queryable from the PWA and conversational channels

## Human conversation behavior

### Immediate feedback

The PWA should optimistically render the agent message immediately. Within 150 ms, it should show a subtle activity state tied to the actual turn record.

WhatsApp should use Twilio's typing-indicator endpoint for any request expected to take more than approximately 1.5 seconds. The indicator is provider-native, marks the inbound message read, and remains visible until the reply is delivered or the provider timeout is reached.

SMS does not support a native typing indicator. It should remain silent for quick work. For long work, it may send one concise acknowledgement if no acknowledgement was sent in the recent exchange.

### Acknowledgement policy

Do not send "working on it" for every message.

Send an acknowledgement only when at least one condition is true:

- the request entered the durable lane
- an attachment must be downloaded or parsed
- more than one external system must be queried
- the estimated time to a useful answer exceeds 3.5 seconds
- the quick lane has exceeded its time budget and safely escalated

Suppress an acknowledgement when:

- the final answer is expected within 3.5 seconds
- the preceding acknowledgement was sent within 90 seconds
- the message is a greeting, thanks, correction, approval, rejection, or short follow-up
- a provider-native typing signal is enough

Acknowledgement wording comes from a small, reviewed set keyed by work category. Selection should avoid the last two messages used for that agent. It must describe real activity, not invented activity.

Examples:

- "I’m checking the transaction record now."
- "I’ve got it. I’m reviewing the listing details before I draft the post."
- "I’m opening the file and checking the signed dates. I’ll send you what I find."

### Progress without exposing reasoning

The PWA may show factual milestones such as:

- Opening the transaction record
- Checking the official listing
- Reviewing the signed document
- Drafting the Facebook copy
- Waiting for agent approval
- Sending to Facebook
- Facebook confirmed the live post

Do not expose hidden reasoning, internal chain-of-thought, raw prompts, or speculative steps.

### Truthful completion language

Use exact state language:

- `drafted`: Harriett created a saved draft, but nothing was sent or posted
- `proposed`: Harriett created an action requiring approval
- `approved`: a human approved the exact action, but the provider may not have completed it
- `sending` or `publishing`: the provider request is in progress
- `completed`: the provider confirmed the action
- `failed`: the action did not complete
- `unknown`: the provider response could not be verified

No user-facing response may say "sent," "posted," "deleted," or "scheduled" unless the corresponding provider result is recorded.

### Cross-channel continuity

The same authenticated agent should be able to:

1. ask for a Facebook draft by SMS or WhatsApp
2. open the secure PWA review link
3. edit and approve it in the PWA
4. receive the provider-confirmed result in the originating channel
5. ask "did it post?" in either channel and receive the same state

Channel-specific formatting may differ, but the underlying turn, action, and artifact IDs must be the same.

## PWA experience

### Adopted UI pieces

Add `@ai-sdk/react` and selected AI Elements source components:

- conversation container and auto-scroll
- agent and Harriett message bubbles
- prompt input with attachment affordance
- tool or work-status card
- approval card
- error and retry state
- stop control for a streaming read-only response

Do not add a generic chat template wholesale. Use Harriett's existing typography, colors, spacing, navigation, and plain-language labels.

### Message parts

The PWA must render typed UI message parts rather than flattening everything into one text field:

- text
- citation
- work status
- tool result summary
- saved artifact link
- approval request
- completion receipt
- recoverable error

This lets a Facebook draft appear inline as a recognizable preview while still linking to its full review surface.

### Streaming

The PWA route should use `streamText()` and return the AI SDK UI message stream protocol. The browser should use `useChat()` with:

- authenticated custom transport
- stable thread ID
- `status` rendering for submitted, streaming, ready, and error
- `onData` for audited work milestones
- tool-approval handling for agent-authorized internal or external actions
- stop and regenerate only where safe
- resumable stream support after the base route is stable

## Twilio path

### Keep direct Twilio ownership

The existing webhook already performs critical work that a generic adapter cannot silently bypass:

- Twilio signature verification
- enrolled-agent lookup
- natural-language consent and opt-out handling
- unknown-sender silence
- inbound message and attachment persistence
- idempotency using the provider message SID
- audit logging
- delivery callbacks
- restricted agent-only communication

These checks remain in Harriett-owned code.

### Fast response strategy

The webhook should choose a lane after storing the inbound message:

1. Lane 0 returns a synchronous TwiML response.
2. Lane 1 may run inside a strict quick-response budget and return TwiML if it completes safely.
3. Lane 2 or Lane 3 returns an empty TwiML response or one policy-approved acknowledgement, then begins the appropriate asynchronous work.
4. Any transition from quick to durable must use the same turn ID and idempotency key so two replies cannot be created.

The exact quick-response budget must be tested under production conditions. Start at 6 seconds, abort and escalate before provider or Vercel request limits are approached.

### WhatsApp typing indicator

Add the Twilio typing indicator for WhatsApp requests routed to Lane 1, 2, or 3. Treat it as a best-effort experience signal, not a durable state transition. Audit both the attempt and result. If the beta endpoint fails, conversation processing must continue.

## Context and model policy

### Context envelope

Build context by intent instead of assembling the maximum context on every turn.

Every turn receives:

- agent and tenant identity
- current local time
- channel rules
- the immediate inbound message
- a compact continuity window

Only requested intents receive:

- structured deal records
- document chunks
- compliance knowledge
- public web research
- personal style memory
- full provider data

### Conversation summary

Maintain a compact thread summary asynchronously after meaningful turns. The summary contains:

- active subject or deal
- unresolved question
- pending action and exact status
- names and references needed for pronouns such as "it" or "that one"
- recent corrections from the agent

The summary is not authoritative proof of business facts. Tools still verify live state.

### Model routing

| Work | Default model policy |
| --- | --- |
| Greeting, thanks, HELP, STOP, status phrase | No model |
| Simple intent classification | Deterministic first, fast model only when needed |
| Simple read-only answer | Fast model with restricted tools |
| Drafting, document analysis, ambiguous multi-tool work | Standard model |
| Provider outage or configured primary failure | Fallback provider |

The current `fast` model configuration already exists and should be used. The current runtime records every ordinary turn as `standard`; this must change so the audit record reflects the actual lane and model.

## Data and audit specification

### New `conversation_turns` table

Create one row per agent request.

Required fields:

- `id`
- `office_id`
- `agent_id`
- `thread_id`
- `inbound_message_id`
- `outbound_message_id`
- `channel`
- `lane` (`reflex`, `fast`, `standard`, `durable`)
- `intent`
- `status` (`received`, `running`, `waiting`, `completed`, `failed`, `cancelled`)
- `ai_run_id`
- `workflow_run_id`
- `idempotency_key`
- `correlation_id`
- `received_at`
- `first_feedback_at`
- `first_token_at`
- `reply_created_at`
- `provider_accepted_at`
- `delivered_at`
- `completed_at`
- `error_code`

All rows require tenant RLS. The service-role path remains limited to audited webhook and background-job code.

### New `conversation_events` table

Append-only, no browser update or delete permissions.

Event examples:

- `message.received`
- `webhook.verified`
- `message.persisted`
- `turn.routed`
- `typing.requested`
- `typing.confirmed`
- `acknowledgement.sent`
- `context.started`
- `context.completed`
- `model.started`
- `model.first_token`
- `model.completed`
- `tool.started`
- `tool.completed`
- `tool.failed`
- `workflow.enqueued`
- `reply.created`
- `provider.accepted`
- `provider.delivered`
- `provider.read`
- `provider.failed`
- `turn.completed`
- `turn.failed`

Each event includes `office_id`, `turn_id`, `event`, `occurred_at`, `duration_ms` where relevant, and a redacted JSON payload. Never write secrets, access tokens, complete provider credentials, or hidden model reasoning.

### Existing records

Keep and link existing tables:

- `messages` remains the canonical visible message record
- `ai_runs` remains the model execution record
- `retrieval_events` remains the evidence-retrieval record
- `skill_runs` remains the tool execution record
- `action_requests` remains the approval and external-action record
- `workflow_runs` and `workflow_events` remain durable workflow records
- `audit_log` remains the append-only business audit

`conversation_turns` is the correlation spine across these records. It does not replace them.

## API contracts

### Normalized inbound message

```ts
const NormalizedInboundMessageSchema = z.object({
  providerMessageId: z.string().min(1),
  officeId: z.string().uuid(),
  agentId: z.string().uuid(),
  threadId: z.string().uuid().optional(),
  channel: z.enum(["pwa", "sms", "whatsapp", "rcs"]),
  body: z.string(),
  attachments: z.array(z.object({
    kind: z.enum(["image", "document", "audio", "video", "other"]),
    mimeType: z.string(),
    sourceUrl: z.string().url(),
  })).max(10),
  receivedAt: z.string().datetime(),
});
```

### Route decision

```ts
const ConversationRouteSchema = z.object({
  lane: z.enum(["reflex", "fast", "standard", "durable"]),
  intent: z.string(),
  reasonCode: z.string(),
  modelTier: z.enum(["none", "fast", "standard", "fallback"]),
  allowedToolNames: z.array(z.string()),
  acknowledgementPolicy: z.enum(["none", "typing_only", "message_if_slow"]),
  quickBudgetMs: z.number().int().positive().optional(),
});
```

### Turn receipt

```ts
const ConversationTurnReceiptSchema = z.object({
  turnId: z.string().uuid(),
  correlationId: z.string().uuid(),
  status: z.enum(["running", "waiting", "completed", "failed"]),
  lane: z.enum(["reflex", "fast", "standard", "durable"]),
  userMessage: z.string().optional(),
  artifactUrl: z.string().url().optional(),
  actionRequestId: z.string().uuid().optional(),
});
```

## Reliability rules

- One provider inbound ID creates at most one conversation turn.
- One inbound message creates at most one final outbound reply unless the workflow explicitly emits a later completion notification.
- Quick-lane timeout and durable escalation share the same idempotency key.
- Model cancellation cannot cancel an external action that has already been approved and accepted by its provider.
- A failed typing indicator cannot fail the turn.
- A failed acknowledgement cannot cause the final reply to be skipped.
- A provider timeout is recorded as unknown until a status callback or reconciliation job resolves it.
- Every external write has a reconciliation path.
- Every user-visible error includes a safe next action or retry path.
- No empty model response reaches the channel. Use a validated fallback response that accurately states the failure and preserves the turn for retry.

## Performance objectives

Measure from provider receipt or PWA submit, not only from model start.

| Metric | Initial objective |
| --- | --- |
| PWA optimistic message visible | p95 under 150 ms |
| PWA activity state visible | p95 under 300 ms |
| PWA first text token for fast lane | p50 under 1.5 s, p95 under 3.5 s |
| Deterministic reflex reply created | p95 under 1 s |
| WhatsApp typing request | p95 under 1.5 s |
| Fast-lane reply submitted to Twilio | p50 under 4 s, p95 under 9 s |
| Durable-lane acknowledgement, when needed | p95 under 2 s |
| Duplicate final replies | fewer than 1 in 10,000 turns |
| False completion claims | zero |
| Fully correlated turn records | 100 percent |

These are rollout objectives, not promises about carrier delivery time.

## Implementation plan

### Phase 0: baseline and fixtures

Estimated engineering time: 1 to 2 days.

- Add a repeatable production-safe latency report across message, Trigger, AI, tool, Twilio accepted, delivered, and read timestamps.
- Capture at least 20 representative pilot prompts.
- Create expected lane, tool, and completion-language fixtures.
- Record current p50 and p95 performance.

Exit criteria:

- every sample turn can be reconstructed by one correlation ID
- current latency is visible by stage
- the benchmark prompts are checked into tests without personal secrets

### Phase 1: conversation core

Estimated engineering time: 2 to 4 days.

- Add `conversation_turns` and `conversation_events` with RLS.
- Extract the shared Conversation Gateway from `runAgentTurn()`.
- Implement deterministic reflex handling.
- Implement typed route selection and lane-specific context budgets.
- Record the actual model tier in `ai_runs`.
- Add empty-response and provider-fallback handling.

Exit criteria:

- greeting uses no model and no Trigger task
- "What listings do I have?" uses agent-scoped structured data
- standard and durable work still use existing tools and approvals
- all sample prompts route correctly

### Phase 2: PWA streaming chat

Estimated engineering time: 3 to 5 days.

- Add `@ai-sdk/react`.
- Add selected AI Elements source components.
- Create authenticated `/api/chat` and resumable stream route contracts.
- Render typed message parts, work status, artifacts, citations, approvals, and errors.
- Persist inbound and outbound messages through Supabase.
- Subscribe to durable completion events through Supabase Realtime.

Exit criteria:

- first response content streams instead of appearing all at once
- a durable Facebook action remains visible after navigation or reload
- the same draft and action IDs appear in PWA and WhatsApp history
- mobile layout passes keyboard, scroll, and screen-reader checks

### Phase 3: Twilio fast lane

Estimated engineering time: 3 to 5 days.

- Route deterministic reflex messages synchronously.
- Add a strict quick-response budget for safe read-only work.
- Add WhatsApp typing indicators.
- Preserve the acknowledgement cooldown and varied language policy.
- Add idempotent quick-to-durable escalation.
- Keep all consent and signature checks in the existing webhook.

Exit criteria:

- greetings no longer wait in the Trigger queue
- simple listing lookup normally returns without a progress message
- long work receives one truthful signal and later completion
- retries do not create duplicate replies

### Phase 4: context efficiency and human quality

Estimated engineering time: 2 to 4 days.

- Add asynchronous compact thread summaries.
- Retrieve memory and knowledge only by routed need.
- Build a reviewed acknowledgement phrase set by work category.
- Add conversation-quality tests for corrections, pronouns, interruptions, and short follow-ups.
- Add model and token dashboards by lane and intent.

Exit criteria:

- simple turns stay below the context budget in normal conditions
- corrections such as "No, I meant Gail's listing" are preserved
- progress language is not repeated unnaturally
- Harriett never confuses a saved draft with a completed action

### Phase 5: optional Vercel Chat SDK spike

Estimated engineering time: 1 to 2 days. This is not on the critical path.

Build a disposable adapter test and answer these questions:

- Can its Twilio adapter support Harriett's SMS and future RCS requirements?
- Can WhatsApp remain on the same Twilio sender and webhook path?
- Can Harriett enforce signature validation and natural-language opt-out before SDK dispatch?
- Can every provider callback carry Harriett's correlation and tenant IDs?
- Can Supabase remain canonical without duplicating or weakening idempotency?
- Does the adapter reduce maintained code after compliance wrappers are included?

Adopt it only if every answer is yes and production benchmarks show a real maintenance or performance benefit.

### Phase 6: controlled rollout

Estimated engineering time: 2 to 3 days plus observation.

- Hide the new gateway behind tenant and agent feature flags.
- Start with Matt's PWA account.
- Enable WhatsApp for Matt after PWA acceptance.
- Add one pilot agent at a time.
- Compare latency, failure, duplicate, tool, and correction rates to baseline.
- Keep the existing durable path as a rollback until the pilot clears acceptance.

## Test plan

### Routing tests

- greeting routes to reflex
- thanks routes to reflex
- own-listings question routes to fast `searchDeals`
- deal deadline routes to fast read tools
- document clause question routes to standard document tools
- Facebook draft routes to standard or durable as appropriate
- publish and delete route to durable external actions
- STOP and natural-language opt-out bypass all AI work

### Conversation tests

- pronoun follow-up resolves the active property
- agent correction replaces the mistaken subject
- short back-and-forth does not repeat progress chatter
- new channel continues the same pending action
- a completed action can be queried by status
- an unavailable tool produces an accurate limitation and useful next step

### Reliability tests

- duplicate Twilio webhook
- quick-lane timeout during model generation
- Trigger enqueue failure
- model primary failure and fallback success
- model empty response
- tool failure after partial progress
- Twilio accepted but delivery callback delayed
- browser reload during PWA stream
- approval after the original browser session closes

### Security and compliance tests

- invalid Twilio signature rejected
- unknown sender remains silent
- opted-out sender remains suppressed
- cross-tenant thread access rejected by RLS
- agent cannot access another agent's deal unless role policy permits it
- consumer text path cannot be constructed
- external action cannot bypass its approval rule
- event payload redaction excludes secrets and hidden reasoning

## Acceptance criteria

This project is complete when:

1. PWA chat streams and shows accurate work state.
2. Greetings and simple operational questions no longer wait behind durable jobs.
3. Long work survives request boundaries and notifies the agent when complete.
4. Every agent-facing web capability calls the same underlying conversational skill.
5. Cross-channel conversation and action state is consistent.
6. No existing consent, approval, RLS, or audit rule is weakened.
7. Every sampled turn has a complete timestamped trail from inbound receipt through provider delivery or documented failure.
8. Production pilot metrics meet the initial objectives for two consecutive weeks.
9. Harriett never reports an external action as complete without provider confirmation.

## Rollback strategy

- Feature-flag each channel independently.
- Preserve the current Trigger-based message task until the new fast lane is proven.
- Route any failed or uncertain fast turn into the existing durable path using the same idempotency key.
- Keep schema additions backward compatible.
- Do not remove current audit or message fields during this project.
- If PWA streaming fails, retain persisted messages and render the completed response after reload.

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Fast path bypasses compliance | Consent, identity, RLS, and action policy execute before lane selection |
| Two lanes create duplicate replies | One turn ID, one idempotency key, unique outbound reply constraint |
| Human feel becomes fake chatter | Provider-native typing first, acknowledgements only when warranted, no fake delays |
| Context compression loses important facts | Structured tools remain authoritative; summary is continuity only |
| UI framework changes Harriett's design | Copy only selected AI Elements source components and restyle them |
| New vendor becomes canonical state | Supabase remains canonical; no Assistant Cloud or Twilio conversation store |
| Chat SDK adapter lacks required channel controls | Keep it out of the critical path and require a pass/fail spike |
| Fast model gives weak operational answers | Restrict its tools, validate outputs, and escalate ambiguity to standard |

## Open decisions before implementation

These do not block the architecture, but they should be locked during Phase 0:

1. Whether PWA chat appears as a dedicated primary navigation item or as a persistent Harriett drawer.
2. The exact six-second starting budget for synchronous Twilio fast reads after production timing tests.
3. Whether a single cross-channel thread is always used per agent or threads split by active transaction while retaining a global continuity summary.
4. How long detailed conversation events are retained before redacted aggregation.
5. Which durable completion events warrant an outbound SMS or WhatsApp notification versus a PWA push only.

## Recommended next action

Approve Phase 0 and Phase 1 as one implementation slice. They deliver the core latency improvement and trustworthy event spine without committing Harriett to a new hosted conversation platform. After that slice is benchmarked, build the PWA streaming surface and Twilio fast lane on the same gateway.
