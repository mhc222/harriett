create table if not exists checklist_items (
  id uuid primary key default gen_random_uuid(),
  office_id uuid not null references offices(id) on delete cascade,
  deal_id uuid references deals(id) on delete cascade,
  agent_id uuid not null references agents(id),
  category text not null,  -- pre-listing | listing-active | under-contract | closing
  title text not null,
  detail text,
  days_from_listing integer,
  required boolean default true,
  completed boolean default false,
  created_at timestamptz default now()
);

alter table checklist_items enable row level security;

create policy "office_isolation" on checklist_items
  for all using (office_id = '00000000-0000-0000-0000-000000000001'::uuid);
