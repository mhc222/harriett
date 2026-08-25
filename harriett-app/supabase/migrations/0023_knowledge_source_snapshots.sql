-- Preserve the exact fetched source behind every normalized knowledge version.
-- This makes legal-corpus changes reviewable and keeps retrieval reproducible.
alter table public.knowledge_versions
  add column raw_content text,
  add column source_content_type text,
  add column retrieved_at timestamptz not null default now();

comment on column public.knowledge_versions.raw_content is
  'Immutable source payload as fetched, before chunking or normalization.';
comment on column public.knowledge_versions.source_content_type is
  'Content type of raw_content, such as text/markdown or application/pdf+markdown.';
comment on column public.knowledge_versions.retrieved_at is
  'Time this source version was fetched from the authoritative publisher.';
