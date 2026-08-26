-- 0033: canonical conversation turns and append-only micro-events.
-- These records correlate agent messages, AI runs, tools, workflows, and
-- provider delivery without replacing any of those source tables.

create table conversation_turns (
  id                    uuid primary key default gen_random_uuid(),
  office_id             uuid not null references offices(id),
  agent_id              uuid not null references agents(id),
  thread_id             uuid references threads(id) on delete set null,
  inbound_message_id    uuid references messages(id) on delete set null,
  outbound_message_id   uuid references messages(id) on delete set null,
  channel               text not null check (channel in ('pwa','sms','whatsapp','rcs','email_event','voice')),
  lane                  text not null check (lane in ('reflex','fast','standard','durable')),
  intent                text,
  status                text not null default 'received'
                        check (status in ('received','running','waiting','completed','failed','cancelled')),
  ai_run_id             uuid references ai_runs(id) on delete set null,
  workflow_run_id       uuid references workflow_runs(id) on delete set null,
  idempotency_key       text not null,
  correlation_id        uuid not null default gen_random_uuid(),
  received_at           timestamptz not null default now(),
  first_feedback_at     timestamptz,
  first_token_at        timestamptz,
  reply_created_at      timestamptz,
  provider_accepted_at  timestamptz,
  delivered_at          timestamptz,
  completed_at          timestamptz,
  error_code            text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (office_id, idempotency_key),
  unique (correlation_id)
);

create index conversation_turns_agent_recent
  on conversation_turns (office_id, agent_id, received_at desc);
create index conversation_turns_thread_recent
  on conversation_turns (thread_id, received_at desc)
  where thread_id is not null;
create index conversation_turns_status
  on conversation_turns (office_id, status, received_at desc);

create table conversation_events (
  id            uuid primary key default gen_random_uuid(),
  office_id     uuid not null references offices(id),
  turn_id       uuid not null references conversation_turns(id) on delete cascade,
  event         text not null,
  duration_ms   integer check (duration_ms is null or duration_ms >= 0),
  payload       jsonb,
  occurred_at   timestamptz not null default now(),
  created_at    timestamptz not null default now()
);

create index conversation_events_turn_time
  on conversation_events (turn_id, occurred_at asc);
create index conversation_events_office_recent
  on conversation_events (office_id, occurred_at desc);

revoke update, delete on conversation_events from authenticated, anon;

alter table conversation_turns enable row level security;
alter table conversation_events enable row level security;

create policy "agent reads own conversation turns" on conversation_turns
  for select using (
    office_id = app.office_id()
    and (agent_id = app.agent_id() or app.user_role() in ('broker','coordinator'))
  );

create policy "agent reads own conversation events" on conversation_events
  for select using (
    office_id = app.office_id()
    and exists (
      select 1
      from conversation_turns turn_record
      where turn_record.id = turn_id
        and (
          turn_record.agent_id = app.agent_id()
          or app.user_role() in ('broker','coordinator')
        )
    )
  );
