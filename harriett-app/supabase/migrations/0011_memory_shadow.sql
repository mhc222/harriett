-- 0011: Governed memory shadow pipeline and isolated Mem0 OSS storage.
-- Mem0 proposes personal-context candidates. Public memories remains the
-- governed source that Harriett may retrieve after approval or activation.

begin;

create table mem0_vectors (
  id          text primary key,
  embedding   vector(1536),
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index mem0_vectors_embedding_hnsw
  on mem0_vectors using hnsw (embedding vector_cosine_ops);
create index mem0_vectors_metadata_gin
  on mem0_vectors using gin (metadata);

create table memory_migrations (
  user_id     text primary key,
  created_at  timestamptz not null default now()
);

-- This function name is part of Mem0's Supabase vector-store contract.
create or replace function public.match_vectors(
  query_embedding vector(1536),
  match_count integer,
  filter jsonb default '{}'::jsonb
)
returns table (
  id text,
  similarity double precision,
  metadata jsonb
)
language sql stable security invoker set search_path = '' as $$
  select
    vectors.id,
    (1 - (vectors.embedding operator(public.<=>) query_embedding))::double precision,
    vectors.metadata
  from public.mem0_vectors vectors
  where vectors.embedding is not null
    and (filter = '{}'::jsonb or vectors.metadata @> filter)
  order by vectors.embedding operator(public.<=>) query_embedding
  limit least(greatest(match_count, 1), 100)
$$;

alter table mem0_vectors enable row level security;
alter table memory_migrations enable row level security;

-- No browser policies are created. Mem0 runs only in audited service-role
-- Trigger tasks and the service role bypasses RLS.
revoke all on mem0_vectors from anon, authenticated;
revoke all on memory_migrations from anon, authenticated;
revoke execute on function public.match_vectors(vector, integer, jsonb)
  from public, anon, authenticated;
grant execute on function public.match_vectors(vector, integer, jsonb)
  to service_role;

alter table memories
  add column processor text not null default 'structured'
    check (processor in ('mem0_oss','structured','manual')),
  add column processor_memory_id text,
  add column governance_reason text,
  add column reviewed_at timestamptz,
  add column reviewed_by uuid references agents(id);

create unique index memories_processor_identity
  on memories(office_id, agent_id, processor, processor_memory_id)
  where processor_memory_id is not null;

create table memory_blocks (
  id                 uuid primary key default gen_random_uuid(),
  office_id          uuid not null references offices(id),
  agent_id           uuid not null references agents(id) on delete cascade,
  normalized_content text not null,
  reason             text,
  source_memory_id   uuid references memories(id) on delete set null,
  created_at         timestamptz not null default now(),
  unique (agent_id, normalized_content)
);

create table memory_processing_runs (
  id               uuid primary key default gen_random_uuid(),
  office_id        uuid not null references offices(id),
  agent_id         uuid not null references agents(id) on delete cascade,
  message_id       uuid not null references messages(id) on delete cascade,
  ai_run_id        uuid references ai_runs(id) on delete set null,
  mode             text not null check (mode in ('disabled','shadow','governed')),
  processor        text check (processor in ('mem0_oss','structured')),
  status           text not null default 'running'
                   check (status in ('running','completed','failed','skipped')),
  candidates_found integer not null default 0,
  candidates_saved integer not null default 0,
  candidates_blocked integer not null default 0,
  error_code       text,
  error_message    text,
  started_at       timestamptz not null default now(),
  completed_at     timestamptz,
  unique (message_id)
);

alter table messages
  add column if not exists memory_processed_at timestamptz;

alter table memory_blocks enable row level security;
alter table memory_processing_runs enable row level security;

create policy "agent manages own memory blocks" on memory_blocks for all
  using (office_id = app.office_id() and agent_id = app.agent_id())
  with check (office_id = app.office_id() and agent_id = app.agent_id());

create policy "agent reads own memory processing" on memory_processing_runs for select
  using (office_id = app.office_id() and agent_id = app.agent_id());

-- Add the explicit block event while preserving the existing event contract.
alter table memory_events drop constraint memory_events_event_check;
alter table memory_events add constraint memory_events_event_check
  check (event in (
    'proposed','activated','edited','rejected','forgotten','superseded',
    'retrieved','blocked'
  ));

commit;
