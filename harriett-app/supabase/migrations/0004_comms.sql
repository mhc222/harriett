-- 0004: threads, messages, consent. The approval queue is a view over messages.

create table threads (
  id         uuid primary key default gen_random_uuid(),
  office_id  uuid not null references offices(id),
  agent_id   uuid not null references agents(id),
  deal_id    uuid references deals(id) on delete set null,
  channel    text not null check (channel in ('sms','email','internal')),
  subject    text,
  created_at timestamptz not null default now()
);

create table messages (
  id                  uuid primary key default gen_random_uuid(),
  office_id           uuid not null references offices(id),
  thread_id           uuid references threads(id) on delete set null,
  deal_id             uuid references deals(id) on delete set null,
  agent_id            uuid not null references agents(id),
  direction           text not null check (direction in ('inbound','outbound')),
  channel             text not null check (channel in ('sms','email','internal')),
  body                text not null,
  consumer_facing     boolean not null default false,
  status              text not null default 'draft'
                      check (status in ('draft','pending_review','approved','rejected','queued','sent','delivered','failed')),
  approved_by         uuid references agents(id),
  approved_at         timestamptz,
  rejection_reason    text,
  waitpoint_token     text,
  provider_message_id text,
  sent_at             timestamptz,
  created_at          timestamptz not null default now(),

  -- Consumer-facing SMS does not exist as a channel. Hard rule.
  constraint no_consumer_sms check (not (consumer_facing and channel = 'sms')),

  -- A consumer-facing message cannot move past review without broker approval.
  constraint consumer_needs_approval check (
    not consumer_facing
    or status in ('draft','pending_review','rejected')
    or (approved_by is not null and approved_at is not null)
  )
);

-- Append-only consent evidence. Current state lives on agents.sms_consent.
create table consent_events (
  id          uuid primary key default gen_random_uuid(),
  office_id   uuid not null references offices(id),
  agent_id    uuid not null references agents(id),
  phone       text not null,
  channel     text not null default 'sms' check (channel in ('sms')),
  event       text not null check (event in ('opt_in','opt_out','help')),
  method      text not null check (method in ('web_form','keyword','natural_language','verbal')),
  evidence    jsonb,
  occurred_at timestamptz not null default now()
);

revoke update, delete on consent_events from authenticated, anon;

create view approval_queue with (security_invoker = true) as
  select * from messages where status = 'pending_review';

alter table threads        enable row level security;
alter table messages       enable row level security;
alter table consent_events enable row level security;

create policy "agent reads own threads" on threads
  for select using (office_id = app.office_id()
    and (agent_id = app.agent_id() or app.user_role() = 'broker'));
create policy "agent writes own threads" on threads
  for insert with check (office_id = app.office_id() and agent_id = app.agent_id());

create policy "agent reads own messages" on messages
  for select using (office_id = app.office_id()
    and (agent_id = app.agent_id() or app.user_role() = 'broker'));
create policy "agent drafts own messages" on messages
  for insert with check (office_id = app.office_id() and agent_id = app.agent_id()
    and status in ('draft','pending_review'));
-- Only the broker moves a message through approval states.
create policy "broker reviews messages" on messages
  for update using (office_id = app.office_id() and app.user_role() = 'broker')
  with check (office_id = app.office_id());

create policy "broker reads consent" on consent_events
  for select using (office_id = app.office_id() and app.user_role() = 'broker');
create policy "agent reads own consent" on consent_events
  for select using (office_id = app.office_id() and agent_id = app.agent_id());
