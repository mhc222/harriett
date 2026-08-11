-- 0005: checklist items and calendar events (ported shapes, RLS via claims)

create table checklist_items (
  id           uuid primary key default gen_random_uuid(),
  office_id    uuid not null references offices(id),
  deal_id      uuid not null references deals(id) on delete cascade,
  agent_id     uuid not null references agents(id),
  category     text not null check (category in ('pre-listing','listing-active','under-contract','closing')),
  title        text not null,
  detail       text,
  due_date     date,
  required     boolean not null default true,
  completed    boolean not null default false,
  completed_at timestamptz,
  completed_by uuid references agents(id),
  created_at   timestamptz not null default now()
);

create table calendar_events (
  id         uuid primary key default gen_random_uuid(),
  office_id  uuid not null references offices(id),
  deal_id    uuid references deals(id) on delete cascade,
  agent_id   uuid not null references agents(id),
  title      text not null,
  date       date not null,
  type       text not null check (type in ('closing','inspection','deadline','appointment','listing')),
  address    text,
  note       text,
  created_at timestamptz not null default now()
);

alter table checklist_items enable row level security;
alter table calendar_events enable row level security;

create policy "office reads checklist" on checklist_items
  for select using (office_id = app.office_id());
create policy "office members update checklist" on checklist_items
  for update using (office_id = app.office_id()
    and (agent_id = app.agent_id() or app.user_role() in ('broker','coordinator')))
  with check (office_id = app.office_id());

create policy "office reads calendar" on calendar_events
  for select using (office_id = app.office_id());
