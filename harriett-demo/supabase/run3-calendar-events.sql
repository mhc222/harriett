-- Run this in the Supabase SQL editor

create table if not exists calendar_events (
  id         uuid primary key default gen_random_uuid(),
  office_id  uuid references offices(id) not null,
  deal_id    uuid references deals(id) on delete cascade,
  agent_id   uuid references agents(id),
  title      text not null,
  date       date not null,
  type       text check (type in ('closing','inspection','deadline','appointment','listing')) not null,
  address    text,
  note       text,
  created_at timestamptz default now()
);

alter table calendar_events enable row level security;

create policy "office members read own events"
  on calendar_events for select
  using (office_id = '00000000-0000-0000-0000-000000000001');

create policy "service role full access to calendar_events"
  on calendar_events for all
  using (true)
  with check (true);
