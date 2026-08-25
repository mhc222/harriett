-- 0024: Event-driven Gmail and Google Calendar monitoring.
-- Google remains the source of truth. Harriett stores a compact operational
-- index so Today, search, and durable jobs do not need to copy whole mailboxes.

begin;

create table provider_subscriptions (
  id                       uuid primary key default gen_random_uuid(),
  office_id                uuid not null references offices(id),
  agent_id                 uuid not null references agents(id) on delete cascade,
  connection_id            uuid not null references connections(id) on delete cascade,
  provider                 text not null check (provider in ('google')),
  resource_type            text not null check (resource_type in ('gmail_inbox','calendar_events')),
  external_resource_id     text not null,
  provider_subscription_id text,
  provider_resource_id     text,
  verification_token_hash  text,
  cursor                   text,
  expires_at               timestamptz,
  status                   text not null default 'pending'
                           check (status in ('pending','active','renewing','expired','removed','error')),
  last_notification_at     timestamptz,
  error_code               text,
  error_message            text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  unique (connection_id, resource_type, external_resource_id)
);

create unique index provider_subscriptions_channel
  on provider_subscriptions(provider, provider_subscription_id)
  where provider_subscription_id is not null;
create index provider_subscriptions_renewal
  on provider_subscriptions(status, expires_at);

create table google_mail_index (
  id                  uuid primary key default gen_random_uuid(),
  office_id           uuid not null references offices(id),
  agent_id            uuid not null references agents(id) on delete cascade,
  connection_id       uuid not null references connections(id) on delete cascade,
  gmail_message_id    text not null,
  gmail_thread_id     text,
  gmail_history_id    text,
  internet_message_id text,
  sender              text,
  recipients          text[] not null default '{}',
  cc                   text[] not null default '{}',
  subject             text,
  snippet             text,
  label_ids           text[] not null default '{}',
  category            text not null default 'other'
                      check (category in ('transaction','lead','vendor','office','calendar','personal','marketing','receipt','other')),
  priority            text not null default 'normal'
                      check (priority in ('low','normal','high','urgent')),
  needs_attention     boolean not null default false,
  received_at         timestamptz,
  source_url          text,
  last_observed_at    timestamptz not null default now(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (connection_id, gmail_message_id)
);

create index google_mail_attention
  on google_mail_index(agent_id, needs_attention, priority, received_at desc);
create index google_mail_thread
  on google_mail_index(connection_id, gmail_thread_id, received_at desc);
create index google_mail_subject_search
  on google_mail_index using gin(to_tsvector('english', coalesce(subject, '') || ' ' || coalesce(sender, '') || ' ' || coalesce(snippet, '')));

create table google_calendar_event_index (
  id                  uuid primary key default gen_random_uuid(),
  office_id           uuid not null references offices(id),
  agent_id            uuid not null references agents(id) on delete cascade,
  connection_id       uuid not null references connections(id) on delete cascade,
  calendar_id         text not null,
  google_event_id     text not null,
  status              text,
  summary             text,
  location            text,
  starts_at           timestamptz,
  ends_at             timestamptz,
  all_day_start       date,
  all_day_end         date,
  source_url          text,
  organizer_email     text,
  attendee_emails     text[] not null default '{}',
  google_updated_at   timestamptz,
  last_observed_at    timestamptz not null default now(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (connection_id, calendar_id, google_event_id)
);

create index google_calendar_today
  on google_calendar_event_index(agent_id, starts_at, ends_at)
  where status is distinct from 'cancelled';
create index google_calendar_all_day
  on google_calendar_event_index(agent_id, all_day_start, all_day_end)
  where status is distinct from 'cancelled';

alter table provider_subscriptions enable row level security;
alter table google_mail_index enable row level security;
alter table google_calendar_event_index enable row level security;

create policy "agents read own provider subscriptions"
  on provider_subscriptions for select
  using (office_id = app.office_id() and (agent_id = app.agent_id() or app.user_role() = 'broker'));

create policy "agents read own google mail index"
  on google_mail_index for select
  using (office_id = app.office_id() and (agent_id = app.agent_id() or app.user_role() = 'broker'));

create policy "agents read own google calendar index"
  on google_calendar_event_index for select
  using (office_id = app.office_id() and (agent_id = app.agent_id() or app.user_role() = 'broker'));

create or replace function app.disconnect_google_connection()
returns uuid
language plpgsql
security definer
set search_path = public, app
as $$
declare
  v_connection_id uuid;
begin
  if auth.uid() is null or app.office_id() is null or app.agent_id() is null then
    raise exception 'authenticated agent context required';
  end if;

  select id into v_connection_id
  from connections
  where office_id = app.office_id()
    and agent_id = app.agent_id()
    and provider = 'google'
  limit 1;

  if v_connection_id is null then
    return null;
  end if;

  delete from provider_subscriptions where connection_id = v_connection_id;
  delete from google_mail_index where connection_id = v_connection_id;
  delete from google_calendar_event_index where connection_id = v_connection_id;
  delete from connection_secrets where connection_id = v_connection_id;

  update connections set
    status = 'revoked',
    scopes = '{}',
    capabilities = '{}'::jsonb,
    external_user_id = null,
    last_synced_at = null,
    error_code = null,
    error_message = null,
    updated_at = now()
  where id = v_connection_id;

  return v_connection_id;
end;
$$;

commit;
