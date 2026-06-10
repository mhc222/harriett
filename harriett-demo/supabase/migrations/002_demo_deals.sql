-- demo_deals: lightweight deal table for Phase 1 demo
-- Created directly in Supabase on 2026-06-09 by user, then extended here.

create table if not exists demo_deals (
  id            text primary key default gen_random_uuid()::text,
  address       text,
  city          text,
  state         text,
  agent         text default 'Jerrod Hastings',
  list_price    numeric,
  sale_price    numeric,
  loan_type     text,
  closing_date  text,
  stage         text default 'listing-active',
  urgent_flags  text[] default '{}',
  raw_deal      jsonb,
  source        text default 'email',
  status        text default 'pending_review'
                check (status in ('pending_review','approved','sent','failed')),
  parsed_at     timestamptz default now(),
  created_at    timestamptz default now()
);

alter table demo_deals enable row level security;

create policy "demo open" on demo_deals
  for all using (true) with check (true);

-- If table already exists (ran initial CREATE manually), just add the new columns:
-- alter table demo_deals
--   add column if not exists status text default 'pending_review'
--     check (status in ('pending_review','approved','sent','failed')),
--   add column if not exists parsed_at timestamptz default now();
