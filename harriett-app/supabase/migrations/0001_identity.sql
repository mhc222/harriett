-- 0001: tenancy, identity, RLS claim helpers

create extension if not exists vector;

create schema if not exists app;

-- JWT claim helpers. office_id / agent_id / role are set in
-- auth.users.app_metadata at invite time.
create or replace function app.office_id() returns uuid
language sql stable as $$
  select nullif(auth.jwt() -> 'app_metadata' ->> 'office_id', '')::uuid
$$;

create or replace function app.agent_id() returns uuid
language sql stable as $$
  select nullif(auth.jwt() -> 'app_metadata' ->> 'agent_id', '')::uuid
$$;

create or replace function app.user_role() returns text
language sql stable as $$
  select auth.jwt() -> 'app_metadata' ->> 'role'
$$;

create table offices (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  timezone   text not null default 'America/Chicago',
  created_at timestamptz not null default now()
);

create table agents (
  id             uuid primary key default gen_random_uuid(),
  office_id      uuid not null references offices(id),
  user_id        uuid unique references auth.users(id),
  name           text not null,
  email          text unique,
  phone          text,
  role           text not null check (role in ('broker','agent','coordinator')),
  outreach_mode  text not null default 'review_before_send'
                 check (outreach_mode in ('draft_only','review_before_send','auto_ack')),
  sms_consent    text not null default 'none'
                 check (sms_consent in ('none','opted_in','opted_out')),
  sms_consent_at timestamptz,
  mem0_user_id   text,
  active         boolean not null default true,
  created_at     timestamptz not null default now()
);

alter table offices enable row level security;
alter table agents  enable row level security;

create policy "members read own office" on offices
  for select using (id = app.office_id());

create policy "members read office agents" on agents
  for select using (office_id = app.office_id());

create policy "agents update own row" on agents
  for update using (office_id = app.office_id() and id = app.agent_id())
  with check (office_id = app.office_id() and id = app.agent_id());

create policy "broker updates office agents" on agents
  for update using (office_id = app.office_id() and app.user_role() = 'broker')
  with check (office_id = app.office_id());
