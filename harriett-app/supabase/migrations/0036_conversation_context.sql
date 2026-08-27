-- 0036: Minimal, tenant-scoped conversational focus.
--
-- This table stores references to authoritative records. Deal facts, artifact
-- URLs, action status, and workflow status remain in their domain tables.

create table conversation_contexts (
  id                     uuid primary key default gen_random_uuid(),
  office_id              uuid not null references offices(id),
  agent_id               uuid not null references agents(id),
  thread_id              uuid not null references threads(id) on delete cascade,
  active_deal_id         uuid references deals(id) on delete set null,
  active_artifact_id     uuid references artifacts(id) on delete set null,
  pending_action_id      uuid references action_requests(id) on delete set null,
  active_workflow_run_id uuid references workflow_runs(id) on delete set null,
  context_version        bigint not null default 1 check (context_version > 0),
  expires_at             timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  unique (office_id, thread_id)
);

create index conversation_contexts_agent_recent
  on conversation_contexts (office_id, agent_id, updated_at desc);
create index conversation_contexts_expiry
  on conversation_contexts (office_id, agent_id, expires_at);

alter table conversation_contexts enable row level security;

create policy "agent reads own conversation context" on conversation_contexts
  for select using (
    office_id = app.office_id()
    and (agent_id = app.agent_id() or app.user_role() in ('broker','coordinator'))
  );

create policy "agent creates own conversation context" on conversation_contexts
  for insert with check (
    office_id = app.office_id()
    and agent_id = app.agent_id()
    and exists (
      select 1 from threads thread_record
      where thread_record.id = conversation_contexts.thread_id
        and thread_record.office_id = app.office_id()
        and thread_record.agent_id = app.agent_id()
    )
  );

create policy "agent updates own conversation context" on conversation_contexts
  for update using (
    office_id = app.office_id()
    and agent_id = app.agent_id()
  ) with check (
    office_id = app.office_id()
    and agent_id = app.agent_id()
  );
