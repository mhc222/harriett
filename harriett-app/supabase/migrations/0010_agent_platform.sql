-- 0010: Harriett agent platform foundation.
-- Adds actions, connections, memory, knowledge, AI observability, writing
-- profiles, deal evidence, and workflow state. All browser-visible tables are
-- office-scoped and RLS protected. Secret material has no authenticated policy.

begin;

create extension if not exists vector;

create or replace function app.is_broker() returns boolean
language sql stable as $$
  select app.user_role() = 'broker'
$$;

create table agent_profiles (
  agent_id                 uuid primary key references agents(id) on delete cascade,
  office_id                uuid not null references offices(id),
  signoff                  text,
  bio                      text,
  email_mode               text not null default 'draft_only'
                           check (email_mode in ('draft_only','agent_confirm_before_send','limited_enabled')),
  notification_preferences jsonb not null default '{"urgent":true,"daily_digest":true,"weekly_summary":false}'::jsonb,
  action_permissions       jsonb not null default '{"calendar_create":"confirm","calendar_edit":"confirm","calendar_delete":"confirm","contact_create":"confirm","contact_edit":"confirm","contact_delete":"confirm"}'::jsonb,
  updated_at               timestamptz not null default now()
);

create table writing_samples (
  id          uuid primary key default gen_random_uuid(),
  office_id   uuid not null references offices(id),
  agent_id    uuid not null references agents(id) on delete cascade,
  kind        text not null check (kind in ('email','mls','social','letter','other')),
  title       text,
  content     text not null,
  source      text not null default 'agent_selected' check (source in ('agent_selected','draft_correction')),
  selected    boolean not null default true,
  created_at  timestamptz not null default now()
);

create table writing_profiles (
  id          uuid primary key default gen_random_uuid(),
  office_id   uuid not null references offices(id),
  agent_id    uuid not null references agents(id) on delete cascade,
  version     integer not null,
  profile     jsonb not null,
  active      boolean not null default false,
  created_at  timestamptz not null default now(),
  unique (agent_id, version)
);

create unique index writing_profiles_one_active
  on writing_profiles(agent_id) where active;

create table connections (
  id                 uuid primary key default gen_random_uuid(),
  office_id          uuid not null references offices(id),
  agent_id           uuid references agents(id) on delete cascade,
  provider           text not null check (provider in ('microsoft','twilio','rentcast','trestle','dotloop','resend','deepgram','elevenlabs','meta','calcom')),
  status             text not null default 'disconnected'
                     check (status in ('disconnected','pending_admin','connected','degraded','revoked','error')),
  external_tenant_id text,
  external_user_id   text,
  scopes             text[] not null default '{}',
  capabilities       jsonb not null default '{}'::jsonb,
  last_synced_at     timestamptz,
  error_code         text,
  error_message      text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique nulls not distinct (office_id, agent_id, provider)
);

-- Encrypted provider tokens. No authenticated or anon policies are created.
-- Only the service-role client can access this table.
create table connection_secrets (
  connection_id     uuid primary key references connections(id) on delete cascade,
  token_ciphertext  text not null,
  token_iv          text not null,
  token_tag         text not null,
  expires_at        timestamptz,
  rotated_at        timestamptz not null default now()
);

create table graph_subscriptions (
  id                    uuid primary key default gen_random_uuid(),
  office_id             uuid not null references offices(id),
  agent_id              uuid not null references agents(id) on delete cascade,
  connection_id         uuid not null references connections(id) on delete cascade,
  provider_subscription_id text unique,
  resource              text not null,
  change_types          text[] not null,
  client_state_hash     text not null,
  expires_at            timestamptz,
  delta_link            text,
  status                text not null default 'pending'
                        check (status in ('pending','active','renewing','expired','removed','error')),
  last_notification_at  timestamptz,
  updated_at            timestamptz not null default now()
);

create table memories (
  id               uuid primary key default gen_random_uuid(),
  office_id        uuid not null references offices(id),
  agent_id         uuid references agents(id) on delete cascade,
  scope            text not null check (scope in ('agent','office')),
  category         text not null check (category in ('style','preference','relationship','instruction')),
  content          text not null,
  provenance       jsonb not null,
  confidence       real not null default 1 check (confidence >= 0 and confidence <= 1),
  status           text not null default 'proposed'
                   check (status in ('proposed','active','rejected','superseded')),
  sensitivity      text not null default 'ordinary'
                   check (sensitivity in ('ordinary','sensitive','consequential')),
  embedding        vector(1536),
  embedding_model  text,
  superseded_by    uuid references memories(id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  check ((scope = 'agent' and agent_id is not null) or scope = 'office')
);

create index memories_agent_status on memories(agent_id, status, updated_at desc);
create index memories_embedding_hnsw on memories using hnsw (embedding vector_cosine_ops);

create table memory_events (
  id          uuid primary key default gen_random_uuid(),
  office_id   uuid not null references offices(id),
  agent_id    uuid references agents(id),
  memory_id   uuid not null references memories(id) on delete cascade,
  event       text not null check (event in ('proposed','activated','edited','rejected','forgotten','superseded','retrieved')),
  actor_id    uuid,
  payload     jsonb,
  created_at  timestamptz not null default now()
);

revoke update, delete on memory_events from authenticated, anon;

create table knowledge_sources (
  id             uuid primary key default gen_random_uuid(),
  office_id      uuid not null references offices(id),
  title          text not null,
  kind           text not null check (kind in ('office_policy','procedure','form','regulation','mls_rule','template','vendor','training')),
  authority      integer not null check (authority between 1 and 100),
  status         text not null default 'draft' check (status in ('draft','review','published','superseded','rejected')),
  source_url     text,
  effective_from date,
  effective_to   date,
  owner_agent_id uuid references agents(id),
  supersedes_id  uuid references knowledge_sources(id),
  metadata       jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table knowledge_versions (
  id          uuid primary key default gen_random_uuid(),
  office_id   uuid not null references offices(id),
  source_id   uuid not null references knowledge_sources(id) on delete cascade,
  version     integer not null,
  storage_path text,
  content_hash text not null,
  published_by uuid references agents(id),
  published_at timestamptz,
  created_at  timestamptz not null default now(),
  unique (source_id, version)
);

create table knowledge_chunks (
  id           uuid primary key default gen_random_uuid(),
  office_id    uuid not null references offices(id),
  source_id    uuid not null references knowledge_sources(id) on delete cascade,
  version_id   uuid not null references knowledge_versions(id) on delete cascade,
  chunk_index  integer not null,
  section      text,
  page_number  integer,
  content      text not null,
  token_count  integer,
  fts          tsvector generated always as (to_tsvector('english', content)) stored,
  embedding    vector(1536),
  embedding_model text,
  created_at   timestamptz not null default now(),
  unique (version_id, chunk_index)
);

create index knowledge_chunks_fts on knowledge_chunks using gin(fts);
create index knowledge_chunks_embedding_hnsw on knowledge_chunks using hnsw (embedding vector_cosine_ops);
create index knowledge_sources_lookup on knowledge_sources(office_id, status, kind, authority desc);

create table ai_runs (
  id                uuid primary key default gen_random_uuid(),
  office_id         uuid not null references offices(id),
  agent_id          uuid references agents(id),
  deal_id           uuid references deals(id),
  channel           text not null check (channel in ('sms','pwa','email_event','voice','background')),
  intent            text,
  status            text not null default 'running' check (status in ('running','completed','failed','blocked')),
  model_tier        text not null check (model_tier in ('fast','standard','fallback')),
  model_id          text not null,
  prompt_version    text not null,
  input_tokens      integer,
  output_tokens     integer,
  estimated_cost_usd numeric,
  latency_ms        integer,
  error_code        text,
  started_at        timestamptz not null default now(),
  completed_at      timestamptz
);

create table retrieval_events (
  id            uuid primary key default gen_random_uuid(),
  office_id     uuid not null references offices(id),
  agent_id      uuid references agents(id),
  ai_run_id     uuid not null references ai_runs(id) on delete cascade,
  source_type   text not null check (source_type in ('structured','memory','knowledge','provider')),
  source_id     text,
  rank          integer,
  score         real,
  metadata      jsonb,
  created_at    timestamptz not null default now()
);

create table skill_runs (
  id             uuid primary key default gen_random_uuid(),
  office_id      uuid not null references offices(id),
  agent_id       uuid references agents(id),
  deal_id        uuid references deals(id),
  ai_run_id      uuid references ai_runs(id),
  skill_name     text not null,
  skill_version  text not null,
  risk           text not null check (risk in ('read','internal_write','external_write','restricted')),
  status         text not null check (status in ('requested','approved','running','completed','failed','blocked')),
  input          jsonb not null,
  output         jsonb,
  error_code     text,
  started_at     timestamptz not null default now(),
  completed_at   timestamptz
);

create table action_requests (
  id                 uuid primary key default gen_random_uuid(),
  office_id          uuid not null references offices(id),
  agent_id           uuid not null references agents(id),
  deal_id            uuid references deals(id),
  ai_run_id          uuid references ai_runs(id),
  skill_run_id       uuid references skill_runs(id),
  skill_name         text not null,
  exact_payload      jsonb not null,
  summary            text not null,
  recipient_kind     text check (recipient_kind in ('internal','agent','vendor','consumer')),
  status             text not null default 'proposed'
                     check (status in ('proposed','approved','rejected','running','completed','failed','expired','cancelled')),
  required_approver  text not null check (required_approver in ('agent','broker','none')),
  approved_by        uuid references agents(id),
  approved_at        timestamptz,
  rejection_reason   text,
  idempotency_key    text not null unique,
  waitpoint_token    text,
  expires_at         timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint consumer_action_broker_approval check (
    recipient_kind is distinct from 'consumer' or required_approver = 'broker'
  )
);

create index action_requests_queue on action_requests(office_id, status, created_at desc);
create table approval_delegations (
  id                  uuid primary key default gen_random_uuid(),
  office_id           uuid not null references offices(id),
  delegator_agent_id  uuid not null references agents(id),
  delegate_agent_id   uuid not null references agents(id),
  capability          text not null check (capability in ('consumer_email','knowledge_publish','compliance_review')),
  starts_at           timestamptz not null default now(),
  ends_at             timestamptz,
  active              boolean not null default true,
  created_at          timestamptz not null default now()
);

create table workflow_runs (
  id             uuid primary key default gen_random_uuid(),
  office_id      uuid not null references offices(id),
  agent_id       uuid references agents(id),
  deal_id        uuid references deals(id),
  workflow       text not null,
  version        text not null,
  status         text not null check (status in ('queued','running','waiting','completed','failed','cancelled')),
  state          jsonb not null default '{}'::jsonb,
  idempotency_key text not null unique,
  started_at     timestamptz,
  completed_at   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table workflow_events (
  id              uuid primary key default gen_random_uuid(),
  office_id       uuid not null references offices(id),
  workflow_run_id uuid not null references workflow_runs(id) on delete cascade,
  event           text not null,
  payload         jsonb,
  created_at      timestamptz not null default now()
);

revoke update, delete on workflow_events from authenticated, anon;

create table deal_field_evidence (
  id          uuid primary key default gen_random_uuid(),
  office_id   uuid not null references offices(id),
  deal_id     uuid not null references deals(id) on delete cascade,
  document_id uuid references documents(id) on delete set null,
  field_name  text not null,
  value       jsonb,
  confidence  real not null check (confidence >= 0 and confidence <= 1),
  page_number integer,
  excerpt     text,
  status      text not null default 'extracted' check (status in ('extracted','confirmed','rejected','superseded')),
  confirmed_by uuid references agents(id),
  created_at  timestamptz not null default now()
);

create table deal_events (
  id          uuid primary key default gen_random_uuid(),
  office_id   uuid not null references offices(id),
  deal_id     uuid not null references deals(id) on delete cascade,
  agent_id    uuid references agents(id),
  event       text not null,
  source      text not null check (source in ('user','email','document','dotloop','mls','harriett','system')),
  payload     jsonb,
  occurred_at timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

create table feedback (
  id          uuid primary key default gen_random_uuid(),
  office_id   uuid not null references offices(id),
  agent_id    uuid not null references agents(id),
  ai_run_id   uuid references ai_runs(id),
  artifact_type text not null,
  artifact_id text,
  rating      integer check (rating between 1 and 5),
  original_text text,
  corrected_text text,
  notes       text,
  created_at  timestamptz not null default now()
);

alter table messages
  add column if not exists ai_run_id uuid references ai_runs(id),
  add column if not exists intent text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table agent_profiles enable row level security;
alter table writing_samples enable row level security;
alter table writing_profiles enable row level security;
alter table connections enable row level security;
alter table connection_secrets enable row level security;
alter table graph_subscriptions enable row level security;
alter table memories enable row level security;
alter table memory_events enable row level security;
alter table knowledge_sources enable row level security;
alter table knowledge_versions enable row level security;
alter table knowledge_chunks enable row level security;
alter table ai_runs enable row level security;
alter table retrieval_events enable row level security;
alter table skill_runs enable row level security;
alter table action_requests enable row level security;
alter table approval_delegations enable row level security;
alter table workflow_runs enable row level security;
alter table workflow_events enable row level security;
alter table deal_field_evidence enable row level security;
alter table deal_events enable row level security;
alter table feedback enable row level security;

create policy "agent manages own profile" on agent_profiles for all
  using (office_id = app.office_id() and agent_id = app.agent_id())
  with check (office_id = app.office_id() and agent_id = app.agent_id());
create policy "broker reads profiles" on agent_profiles for select
  using (office_id = app.office_id() and app.is_broker());

create policy "agent manages writing samples" on writing_samples for all
  using (office_id = app.office_id() and agent_id = app.agent_id())
  with check (office_id = app.office_id() and agent_id = app.agent_id());
create policy "agent reads writing profiles" on writing_profiles for select
  using (office_id = app.office_id() and agent_id = app.agent_id());

create policy "agent reads own connections" on connections for select
  using (office_id = app.office_id() and (agent_id = app.agent_id() or agent_id is null or app.is_broker()));

create policy "agent reads own memory" on memories for select
  using (office_id = app.office_id() and ((scope = 'agent' and agent_id = app.agent_id()) or scope = 'office'));
create policy "agent manages own memory" on memories for all
  using (office_id = app.office_id() and scope = 'agent' and agent_id = app.agent_id())
  with check (office_id = app.office_id() and scope = 'agent' and agent_id = app.agent_id());
create policy "agent reads own memory events" on memory_events for select
  using (office_id = app.office_id() and agent_id = app.agent_id());

create policy "office reads published knowledge" on knowledge_sources for select
  using (office_id = app.office_id() and (status = 'published' or app.is_broker() or owner_agent_id = app.agent_id()));
create policy "broker manages knowledge" on knowledge_sources for all
  using (office_id = app.office_id() and app.is_broker())
  with check (office_id = app.office_id() and app.is_broker());
create policy "office reads published knowledge versions" on knowledge_versions for select
  using (office_id = app.office_id() and exists (
    select 1 from knowledge_sources s where s.id = source_id
      and (s.status = 'published' or app.is_broker() or s.owner_agent_id = app.agent_id())
  ));
create policy "office reads published knowledge chunks" on knowledge_chunks for select
  using (office_id = app.office_id() and exists (
    select 1 from knowledge_sources s where s.id = source_id
      and s.status = 'published'
      and (s.effective_from is null or s.effective_from <= current_date)
      and (s.effective_to is null or s.effective_to >= current_date)
  ));

create policy "agent reads own ai runs" on ai_runs for select
  using (office_id = app.office_id() and (agent_id = app.agent_id() or app.is_broker()));
create policy "agent reads own retrieval events" on retrieval_events for select
  using (office_id = app.office_id() and (agent_id = app.agent_id() or app.is_broker()));
create policy "agent reads own skill runs" on skill_runs for select
  using (office_id = app.office_id() and (agent_id = app.agent_id() or app.is_broker()));

create policy "agent reads own actions" on action_requests for select
  using (office_id = app.office_id() and (agent_id = app.agent_id() or app.is_broker()));
create policy "agent updates own proposed actions" on action_requests for update
  using (office_id = app.office_id() and agent_id = app.agent_id()
    and required_approver = 'agent' and status = 'proposed')
  with check (office_id = app.office_id() and agent_id = app.agent_id());
create policy "broker reviews office actions" on action_requests for update
  using (office_id = app.office_id() and app.is_broker())
  with check (office_id = app.office_id());

create policy "broker manages delegations" on approval_delegations for all
  using (office_id = app.office_id() and app.is_broker())
  with check (office_id = app.office_id() and app.is_broker());

create policy "office reads workflows" on workflow_runs for select
  using (office_id = app.office_id() and (agent_id = app.agent_id() or app.user_role() in ('broker','coordinator')));
create policy "office reads workflow events" on workflow_events for select
  using (office_id = app.office_id() and exists (
    select 1 from workflow_runs w where w.id = workflow_run_id
      and (w.agent_id = app.agent_id() or app.user_role() in ('broker','coordinator'))
  ));

create policy "office reads deal evidence" on deal_field_evidence for select
  using (office_id = app.office_id());
create policy "office reads deal events" on deal_events for select
  using (office_id = app.office_id());

create policy "agent manages own feedback" on feedback for all
  using (office_id = app.office_id() and agent_id = app.agent_id())
  with check (office_id = app.office_id() and agent_id = app.agent_id());

-- Search published knowledge using reciprocal-rank fusion. SECURITY INVOKER
-- keeps RLS active for user-scoped callers.
create or replace function public.hybrid_search_knowledge(
  query_text text,
  query_embedding vector(1536),
  requested_office_id uuid default null,
  match_count integer default 6,
  full_text_weight real default 1,
  semantic_weight real default 1,
  rrf_k integer default 50
)
returns table (
  chunk_id uuid,
  source_id uuid,
  title text,
  section text,
  page_number integer,
  content text,
  authority integer,
  effective_from date,
  score real
)
language sql stable security invoker set search_path = '' as $$
  with full_text as (
    select kc.id, row_number() over (
      order by ts_rank_cd(kc.fts, websearch_to_tsquery('english', query_text)) desc
    ) as rank_ix
    from public.knowledge_chunks kc
    join public.knowledge_sources ks on ks.id = kc.source_id
    where kc.office_id = coalesce(app.office_id(), case when auth.role() = 'service_role' then requested_office_id end)
      and ks.status = 'published'
      and kc.fts @@ websearch_to_tsquery('english', query_text)
    limit greatest(match_count * 4, 20)
  ), semantic as (
    select kc.id, row_number() over (
      order by kc.embedding operator(public.<=>) query_embedding
    ) as rank_ix
    from public.knowledge_chunks kc
    join public.knowledge_sources ks on ks.id = kc.source_id
    where kc.office_id = coalesce(app.office_id(), case when auth.role() = 'service_role' then requested_office_id end)
      and ks.status = 'published'
      and kc.embedding is not null
    limit greatest(match_count * 4, 20)
  )
  select kc.id, kc.source_id, ks.title, kc.section, kc.page_number, kc.content,
    ks.authority, ks.effective_from,
    (coalesce(full_text_weight / (rrf_k + ft.rank_ix), 0) +
     coalesce(semantic_weight / (rrf_k + sem.rank_ix), 0))::real as score
  from full_text ft
  full outer join semantic sem on ft.id = sem.id
  join public.knowledge_chunks kc on kc.id = coalesce(ft.id, sem.id)
  join public.knowledge_sources ks on ks.id = kc.source_id
  where (ks.effective_from is null or ks.effective_from <= current_date)
    and (ks.effective_to is null or ks.effective_to >= current_date)
  order by score desc, ks.authority desc
  limit least(match_count, 20)
$$;

create or replace function public.search_agent_memories(
  query_embedding vector(1536),
  requested_office_id uuid default null,
  requested_agent_id uuid default null,
  match_count integer default 5
)
returns table (
  id uuid,
  category text,
  content text,
  confidence real,
  sensitivity text,
  score real
)
language sql stable security invoker set search_path = '' as $$
  select m.id, m.category, m.content, m.confidence, m.sensitivity,
    (1 - (m.embedding operator(public.<=>) query_embedding))::real as score
  from public.memories m
  where m.office_id = coalesce(app.office_id(), case when auth.role() = 'service_role' then requested_office_id end)
    and m.agent_id = coalesce(app.agent_id(), case when auth.role() = 'service_role' then requested_agent_id end)
    and m.scope = 'agent'
    and m.status = 'active'
    and m.embedding is not null
  order by m.embedding operator(public.<=>) query_embedding
  limit least(match_count, 10)
$$;

commit;
