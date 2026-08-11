-- 0003: vendors. Agent-gated: no cross-agent sharing, ever. No broker exception.

create table vendors (
  id         uuid primary key default gen_random_uuid(),
  office_id  uuid not null references offices(id),
  agent_id   uuid not null references agents(id),
  type       text not null,
  name       text not null,
  contact    text,
  phone      text,
  email      text,
  notes      text,
  preferred  boolean not null default false,
  created_at timestamptz not null default now()
);

alter table vendors enable row level security;

create policy "vendors are agent gated" on vendors
  for all using (office_id = app.office_id() and agent_id = app.agent_id())
  with check (office_id = app.office_id() and agent_id = app.agent_id());
