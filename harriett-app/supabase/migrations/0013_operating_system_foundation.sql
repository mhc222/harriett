-- 0013: operating-system foundation for properties, durable work, and media.

begin;

create table properties (
  id                 uuid primary key default gen_random_uuid(),
  office_id          uuid not null references offices(id),
  created_by         uuid references agents(id),
  normalized_address text not null,
  formatted_address  text not null,
  address_line_1     text,
  city               text,
  state              text,
  zip                 text,
  county              text,
  latitude            numeric,
  longitude           numeric,
  property_type       text,
  bedrooms            numeric,
  bathrooms           numeric,
  square_feet         numeric,
  lot_size            numeric,
  year_built          integer,
  facts               jsonb not null default '{}'::jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (office_id, normalized_address)
);

alter table deals
  add column if not exists property_id uuid references properties(id) on delete set null;

create table property_research_runs (
  id                 uuid primary key default gen_random_uuid(),
  office_id          uuid not null references offices(id),
  agent_id           uuid not null references agents(id),
  property_id        uuid references properties(id) on delete set null,
  ai_run_id           uuid references ai_runs(id) on delete set null,
  research_type      text not null check (research_type in ('property_lookup','valuation','listing_search','cma_prep')),
  provider           text not null check (provider in ('rentcast','mls','manual','combined')),
  status             text not null default 'completed'
                     check (status in ('running','completed','partial','failed')),
  request             jsonb not null,
  result              jsonb not null default '{}'::jsonb,
  summary             text,
  notice              text,
  confidence_flags    text[] not null default '{}',
  provider_call_count integer not null default 1 check (provider_call_count >= 0),
  source_observed_at  timestamptz not null default now(),
  created_at          timestamptz not null default now()
);

create index property_research_office_created
  on property_research_runs (office_id, created_at desc);
create index property_research_agent_created
  on property_research_runs (agent_id, created_at desc);
create index property_research_property_created
  on property_research_runs (property_id, created_at desc);

create table artifacts (
  id                     uuid primary key default gen_random_uuid(),
  office_id              uuid not null references offices(id),
  agent_id               uuid not null references agents(id),
  property_id            uuid references properties(id) on delete set null,
  deal_id                uuid references deals(id) on delete set null,
  contact_id             uuid references contacts(id) on delete set null,
  source_research_run_id uuid references property_research_runs(id) on delete set null,
  kind                   text not null check (kind in (
                           'research_note','seller_brief','cma_draft','mls_remarks',
                           'marketing_copy','email_draft','social_post','meeting_summary','report'
                         )),
  title                  text not null,
  status                 text not null default 'draft'
                         check (status in ('draft','ready_for_review','approved','published','archived')),
  version                integer not null default 1 check (version > 0),
  plain_text             text,
  content                jsonb not null default '{}'::jsonb,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create index artifacts_agent_created on artifacts (agent_id, created_at desc);
create index artifacts_property_created on artifacts (property_id, created_at desc);

create table work_items (
  id                     uuid primary key default gen_random_uuid(),
  office_id              uuid not null references offices(id),
  owner_agent_id         uuid not null references agents(id),
  assigned_agent_id      uuid references agents(id),
  property_id            uuid references properties(id) on delete set null,
  deal_id                uuid references deals(id) on delete cascade,
  contact_id             uuid references contacts(id) on delete set null,
  artifact_id            uuid references artifacts(id) on delete set null,
  source_research_run_id uuid references property_research_runs(id) on delete set null,
  title                  text not null,
  detail                 text,
  status                 text not null default 'open'
                         check (status in ('open','in_progress','waiting','completed','cancelled')),
  priority               text not null default 'normal'
                         check (priority in ('low','normal','high','urgent')),
  due_at                 timestamptz,
  completed_at           timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create index work_items_attention
  on work_items (office_id, status, priority, due_at);
create index work_items_assignee
  on work_items (assigned_agent_id, status, due_at);

create table external_record_links (
  id                  uuid primary key default gen_random_uuid(),
  office_id           uuid not null references offices(id),
  provider            text not null check (provider in (
                        'microsoft','twilio','rentcast','trestle','dotloop','meta','calcom','instanet'
                      )),
  entity_type         text not null check (entity_type in (
                        'property','deal','contact','document','message','artifact','work_item'
                      )),
  entity_id           uuid not null,
  external_id         text not null,
  external_url        text,
  external_updated_at timestamptz,
  payload_hash        text,
  metadata            jsonb not null default '{}'::jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (office_id, provider, entity_type, external_id)
);

create table provider_sync_runs (
  id              uuid primary key default gen_random_uuid(),
  office_id       uuid not null references offices(id),
  connection_id   uuid references connections(id) on delete set null,
  provider        text not null,
  direction       text not null check (direction in ('pull','push','webhook')),
  status          text not null check (status in ('running','completed','partial','failed')),
  cursor_before   text,
  cursor_after    text,
  received_count  integer not null default 0,
  changed_count   integer not null default 0,
  conflict_count  integer not null default 0,
  error_code      text,
  error_message   text,
  started_at      timestamptz not null default now(),
  completed_at    timestamptz
);

create table message_attachments (
  id                uuid primary key default gen_random_uuid(),
  office_id         uuid not null references offices(id),
  message_id        uuid not null references messages(id) on delete cascade,
  kind              text not null check (kind in ('image','document','audio','video','other')),
  source            text not null check (source in ('twilio','supabase','provider','generated','external')),
  url               text,
  storage_path      text,
  mime_type         text,
  filename          text,
  size_bytes        bigint check (size_bytes is null or size_bytes >= 0),
  provider_media_id text,
  created_at        timestamptz not null default now(),
  check (url is not null or storage_path is not null)
);

create index message_attachments_message on message_attachments (message_id, created_at);
create unique index message_attachments_message_url
  on message_attachments (message_id, url);

alter table properties enable row level security;
alter table property_research_runs enable row level security;
alter table artifacts enable row level security;
alter table work_items enable row level security;
alter table external_record_links enable row level security;
alter table provider_sync_runs enable row level security;
alter table message_attachments enable row level security;

create policy "office reads properties" on properties for select
  using (office_id = app.office_id());
create policy "members create properties" on properties for insert
  with check (office_id = app.office_id() and created_by = app.agent_id());
create policy "members update properties" on properties for update
  using (office_id = app.office_id() and app.user_role() in ('broker','coordinator'))
  with check (office_id = app.office_id());

create policy "members read permitted research" on property_research_runs for select
  using (office_id = app.office_id()
    and (agent_id = app.agent_id() or app.user_role() in ('broker','coordinator')));
create policy "agents create own research" on property_research_runs for insert
  with check (office_id = app.office_id() and agent_id = app.agent_id());

create policy "members read permitted artifacts" on artifacts for select
  using (office_id = app.office_id()
    and (agent_id = app.agent_id() or app.user_role() in ('broker','coordinator')));
create policy "agents create own artifacts" on artifacts for insert
  with check (office_id = app.office_id() and agent_id = app.agent_id());
create policy "broker and coordinator create artifacts" on artifacts for insert
  with check (office_id = app.office_id() and app.user_role() in ('broker','coordinator'));
create policy "agents update own artifacts" on artifacts for update
  using (office_id = app.office_id() and agent_id = app.agent_id())
  with check (office_id = app.office_id() and agent_id = app.agent_id());
create policy "broker and coordinator update artifacts" on artifacts for update
  using (office_id = app.office_id() and app.user_role() in ('broker','coordinator'))
  with check (office_id = app.office_id());

create policy "members read permitted work" on work_items for select
  using (office_id = app.office_id() and (
    owner_agent_id = app.agent_id()
    or assigned_agent_id = app.agent_id()
    or app.user_role() in ('broker','coordinator')
  ));
create policy "agents create own work" on work_items for insert
  with check (office_id = app.office_id() and owner_agent_id = app.agent_id());
create policy "members update permitted work" on work_items for update
  using (office_id = app.office_id() and (
    owner_agent_id = app.agent_id()
    or assigned_agent_id = app.agent_id()
    or app.user_role() in ('broker','coordinator')
  ))
  with check (office_id = app.office_id());

create policy "office reads external links" on external_record_links for select
  using (office_id = app.office_id());
create policy "broker reads provider sync" on provider_sync_runs for select
  using (office_id = app.office_id() and app.user_role() = 'broker');

create policy "members read permitted attachments" on message_attachments for select
  using (office_id = app.office_id() and exists (
    select 1 from messages m
    where m.id = message_id
      and m.office_id = app.office_id()
      and (m.agent_id = app.agent_id() or app.user_role() = 'broker')
  ));

commit;
