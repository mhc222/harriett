-- 0027: page-aware contract retrieval with private office-scoped evidence.

begin;

create table document_chunks (
  id              uuid primary key default gen_random_uuid(),
  office_id       uuid not null references offices(id),
  document_id     uuid not null references documents(id) on delete cascade,
  deal_id         uuid references deals(id) on delete cascade,
  agent_id        uuid not null references agents(id),
  page_number     integer not null check (page_number > 0),
  chunk_index     integer not null check (chunk_index >= 0),
  content         text not null,
  token_count     integer,
  fts             tsvector generated always as (to_tsvector('english', content)) stored,
  embedding       vector(1536),
  embedding_model text,
  created_at      timestamptz not null default now(),
  unique (document_id, chunk_index)
);

create index document_chunks_fts on document_chunks using gin(fts);
create index document_chunks_embedding_hnsw
  on document_chunks using hnsw (embedding vector_cosine_ops);
create index document_chunks_document_page
  on document_chunks (document_id, page_number, chunk_index);

alter table document_chunks enable row level security;

create policy "agents read own document chunks" on document_chunks for select
  using (office_id = app.office_id() and (
    agent_id = app.agent_id() or app.user_role() in ('broker','coordinator')
  ));

alter table retrieval_events drop constraint if exists retrieval_events_source_type_check;
alter table retrieval_events add constraint retrieval_events_source_type_check
  check (source_type in ('structured','memory','knowledge','provider','document','web'));

create or replace function public.hybrid_search_document_chunks(
  query_text text,
  query_embedding vector(1536),
  requested_office_id uuid,
  requested_agent_id uuid,
  requested_document_id uuid,
  match_count integer default 6,
  rrf_k integer default 50
)
returns table (
  chunk_id uuid,
  document_id uuid,
  page_number integer,
  content text,
  score real
)
language sql stable security invoker set search_path = '' as $$
  with permitted as (
    select dc.*
    from public.document_chunks dc
    where dc.office_id = requested_office_id
      and dc.document_id = requested_document_id
      and dc.agent_id = requested_agent_id
  ), full_text as (
    select p.id, row_number() over (
      order by ts_rank_cd(p.fts, websearch_to_tsquery('english', query_text)) desc
    ) as rank_ix
    from permitted p
    where p.fts @@ websearch_to_tsquery('english', query_text)
    limit greatest(match_count * 4, 20)
  ), semantic as (
    select p.id, row_number() over (
      order by p.embedding operator(public.<=>) query_embedding
    ) as rank_ix
    from permitted p
    where p.embedding is not null
    limit greatest(match_count * 4, 20)
  )
  select p.id, p.document_id, p.page_number, p.content,
    (coalesce(1.0 / (rrf_k + ft.rank_ix), 0) +
     coalesce(1.0 / (rrf_k + sem.rank_ix), 0))::real as score
  from full_text ft
  full outer join semantic sem on ft.id = sem.id
  join permitted p on p.id = coalesce(ft.id, sem.id)
  order by score desc, p.page_number
  limit least(match_count, 12)
$$;

commit;
