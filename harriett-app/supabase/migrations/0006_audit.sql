-- 0006: append-only audit log. Every Harriett action writes a row. Non-optional.

create table audit_log (
  id         uuid primary key default gen_random_uuid(),
  office_id  uuid not null references offices(id),
  actor      text not null check (actor in ('harriett','user','system')),
  actor_id   uuid,
  agent_id   uuid references agents(id),
  deal_id    uuid references deals(id),
  action     text not null,
  payload    jsonb,
  created_at timestamptz not null default now()
);

create index audit_log_office_created on audit_log (office_id, created_at desc);
create index audit_log_deal on audit_log (deal_id) where deal_id is not null;

alter table audit_log enable row level security;

-- Append-only for everyone, including authenticated users.
revoke update, delete on audit_log from authenticated, anon;

create policy "broker reads audit" on audit_log
  for select using (office_id = app.office_id() and app.user_role() = 'broker');

create policy "members write audit" on audit_log
  for insert with check (office_id = app.office_id());
