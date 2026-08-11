-- 0002: deals, documents, contacts

create table deals (
  id                       uuid primary key default gen_random_uuid(),
  office_id                uuid not null references offices(id),
  agent_id                 uuid not null references agents(id),
  address                  text not null,
  city                     text,
  state                    text not null default 'AL',
  zip                      text,
  county                   text,
  status                   text not null default 'listing_active'
                           check (status in ('pre_listing','listing_active','under_contract','closing','closed','cancelled')),
  list_price               numeric,
  sale_price               numeric,
  listing_date             date,
  contract_acceptance_date date,
  closing_date             date,
  parsed_fields            jsonb,
  source                   text not null default 'manual'
                           check (source in ('manual','email_parse','instanet','dotloop')),
  instanet_id              text,
  dotloop_id               text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create table contacts (
  id         uuid primary key default gen_random_uuid(),
  office_id  uuid not null references offices(id),
  agent_id   uuid not null references agents(id),
  name       text not null,
  kind       text not null check (kind in ('seller','buyer','buyer_agent','lender','title','attorney','other')),
  email      text,
  phone      text,
  notes      text,
  created_at timestamptz not null default now()
);

create table deal_contacts (
  deal_id      uuid not null references deals(id) on delete cascade,
  contact_id   uuid not null references contacts(id) on delete cascade,
  role_on_deal text,
  primary key (deal_id, contact_id)
);

create table documents (
  id           uuid primary key default gen_random_uuid(),
  office_id    uuid not null references offices(id),
  deal_id      uuid references deals(id) on delete set null,
  agent_id     uuid not null references agents(id),
  storage_path text not null,
  filename     text not null,
  mime_type    text not null,
  doc_type     text not null default 'other'
               check (doc_type in ('listing_agreement','purchase_agreement','net_sheet','disclosure','settlement','other')),
  source       text not null default 'upload'
               check (source in ('upload','email','instanet','dotloop')),
  sha256       text,
  parse_status text not null default 'pending'
               check (parse_status in ('pending','parsed','failed')),
  created_at   timestamptz not null default now()
);

alter table deals         enable row level security;
alter table contacts      enable row level security;
alter table deal_contacts enable row level security;
alter table documents     enable row level security;

create policy "office reads deals" on deals
  for select using (office_id = app.office_id());
create policy "agent writes own deals" on deals
  for insert with check (office_id = app.office_id() and agent_id = app.agent_id());
create policy "agent updates own deals" on deals
  for update using (office_id = app.office_id()
    and (agent_id = app.agent_id() or app.user_role() in ('broker','coordinator')));

-- contacts: owner plus broker and coordinator read
create policy "contact owner full access" on contacts
  for all using (office_id = app.office_id() and agent_id = app.agent_id())
  with check (office_id = app.office_id() and agent_id = app.agent_id());
create policy "broker and coordinator read contacts" on contacts
  for select using (office_id = app.office_id() and app.user_role() in ('broker','coordinator'));

create policy "office reads deal_contacts" on deal_contacts
  for select using (exists (select 1 from deals d where d.id = deal_id and d.office_id = app.office_id()));
create policy "deal owner writes deal_contacts" on deal_contacts
  for insert with check (exists (select 1 from deals d where d.id = deal_id
    and d.office_id = app.office_id() and d.agent_id = app.agent_id()));

create policy "office reads documents" on documents
  for select using (office_id = app.office_id());
create policy "agent writes own documents" on documents
  for insert with check (office_id = app.office_id() and agent_id = app.agent_id());
