-- Harriett Brain Schema
-- Run this in the Supabase SQL editor: https://supabase.com/dashboard/project/tmzedoeqnalekihvgplf/sql
-- Enable pgvector for agent memory embeddings
create extension if not exists vector;

-- ─── OFFICES ────────────────────────────────────────────────────────────────
-- Multi-tenant root. Every row scoped to an office_id.
create table if not exists offices (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_at  timestamptz default now()
);

-- Seed Pritchett-Moore
insert into offices (id, name) values
  ('00000000-0000-0000-0000-000000000001', 'Pritchett-Moore Real Estate')
on conflict do nothing;

-- ─── AGENTS ─────────────────────────────────────────────────────────────────
create table if not exists agents (
  id              uuid primary key default gen_random_uuid(),
  office_id       uuid references offices(id) not null,
  name            text not null,
  email           text,
  phone           text,                    -- E.164 format: +12055551234
  role            text check (role in ('broker','agent','coordinator')) not null,
  m365_user_id    text,                    -- Microsoft Graph user ID
  m365_access_token text,                  -- encrypted; refresh via Graph SDK
  m365_refresh_token text,
  outreach_mode   text check (outreach_mode in ('draft_only','review_before_send','auto_ack'))
                  default 'review_before_send',
  active          boolean default true,
  created_at      timestamptz default now()
);

-- Seed demo agents
insert into agents (id, office_id, name, email, phone, role) values
  ('00000000-0000-0000-0001-000000000001', '00000000-0000-0000-0000-000000000001', 'Wilson Moore',     'wilson@pritchett-moore.com',  null, 'broker'),
  ('00000000-0000-0000-0001-000000000002', '00000000-0000-0000-0000-000000000001', 'Jerrod Hastings',  'jerrod@pritchett-moore.com',  null, 'agent'),
  ('00000000-0000-0000-0001-000000000003', '00000000-0000-0000-0000-000000000001', 'Alyssa Tanner',    'alyssa@pritchett-moore.com',  null, 'coordinator')
on conflict do nothing;

-- ─── DEALS ──────────────────────────────────────────────────────────────────
create table if not exists deals (
  id              uuid primary key default gen_random_uuid(),
  office_id       uuid references offices(id) not null,
  agent_id        uuid references agents(id) not null,
  address         text not null,
  city            text,
  state           text default 'AL',
  zip             text,
  county          text,
  status          text check (status in ('pre_listing','listing_active','under_contract','closing','closed','cancelled'))
                  default 'listing_active',
  list_price      numeric,
  sale_price      numeric,
  listing_date    date,
  closing_date    date,
  parsed_fields   jsonb,                   -- full DealFields JSON from parse route
  source          text check (source in ('manual','email_parse','instanet','dotloop'))
                  default 'manual',
  instanet_id     text,
  dotloop_id      text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ─── CHECKLIST ITEMS ────────────────────────────────────────────────────────
create table if not exists checklist_items (
  id          uuid primary key default gen_random_uuid(),
  deal_id     uuid references deals(id) on delete cascade not null,
  category    text not null,
  title       text not null,
  detail      text,
  due_date    date,
  completed   boolean default false,
  completed_at timestamptz,
  completed_by uuid references agents(id),
  required    boolean default true,
  created_at  timestamptz default now()
);

-- ─── MESSAGES ───────────────────────────────────────────────────────────────
-- Every Harriett message (inbound and outbound) stored here for audit trail.
create table if not exists messages (
  id              uuid primary key default gen_random_uuid(),
  office_id       uuid references offices(id) not null,
  deal_id         uuid references deals(id),       -- null for deal-agnostic messages
  agent_id        uuid references agents(id),
  direction       text check (direction in ('inbound','outbound')) not null,
  channel         text check (channel in ('sms','email','internal')) not null,
  body            text not null,
  status          text check (status in ('pending_review','approved','sent','failed','draft'))
                  default 'pending_review',
  approved_by     uuid references agents(id),
  approved_at     timestamptz,
  sent_at         timestamptz,
  harriett_action text,                            -- intent tag: new_listing, new_contract, etc.
  created_at      timestamptz default now()
);

-- ─── AGENT MEMORY ───────────────────────────────────────────────────────────
-- Per-agent memory chunks with embeddings for RAG retrieval.
create table if not exists agent_memory (
  id          uuid primary key default gen_random_uuid(),
  agent_id    uuid references agents(id) on delete cascade not null,
  office_id   uuid references offices(id) not null,
  content     text not null,
  embedding   vector(1536),                        -- text-embedding-3-small
  source      text,                                -- 'email', 'sms', 'onboarding', 'vendor_map'
  deal_id     uuid references deals(id),
  created_at  timestamptz default now()
);

create index if not exists agent_memory_embedding_idx
  on agent_memory using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- ─── VENDOR MAP ─────────────────────────────────────────────────────────────
-- Per-agent vendor relationships (title, lender, inspector, etc.)
create table if not exists vendors (
  id          uuid primary key default gen_random_uuid(),
  agent_id    uuid references agents(id) on delete cascade not null,
  office_id   uuid references offices(id) not null,
  type        text not null,               -- 'title', 'lender', 'inspector', 'appraiser', 'insurance'
  name        text not null,
  contact     text,
  phone       text,
  email       text,
  notes       text,
  preferred   boolean default false,
  created_at  timestamptz default now()
);

-- ─── AUDIT LOG ──────────────────────────────────────────────────────────────
create table if not exists harriett_audit (
  id          uuid primary key default gen_random_uuid(),
  office_id   uuid references offices(id) not null,
  agent_id    uuid references agents(id),
  deal_id     uuid references deals(id),
  action      text not null,               -- 'parse_contract', 'send_sms', 'approve_message', etc.
  payload     jsonb,
  created_at  timestamptz default now()
);

-- ─── RLS POLICIES ───────────────────────────────────────────────────────────
-- All tables scoped to office_id. Service role bypasses RLS.
alter table offices         enable row level security;
alter table agents          enable row level security;
alter table deals           enable row level security;
alter table checklist_items enable row level security;
alter table messages        enable row level security;
alter table agent_memory    enable row level security;
alter table vendors         enable row level security;
alter table harriett_audit  enable row level security;

-- Simple policy: anon/authenticated can read their office only.
-- Production: replace current_setting with JWT claim.
create policy "office_isolation" on deals
  for all using (office_id = '00000000-0000-0000-0000-000000000001');

create policy "office_isolation" on messages
  for all using (office_id = '00000000-0000-0000-0000-000000000001');

create policy "office_isolation" on agents
  for all using (office_id = '00000000-0000-0000-0000-000000000001');

create policy "office_isolation" on agent_memory
  for all using (office_id = '00000000-0000-0000-0000-000000000001');

create policy "office_isolation" on vendors
  for all using (office_id = '00000000-0000-0000-0000-000000000001');

create policy "office_isolation" on harriett_audit
  for all using (office_id = '00000000-0000-0000-0000-000000000001');
