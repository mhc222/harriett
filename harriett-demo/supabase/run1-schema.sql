create extension if not exists vector;

create table if not exists offices (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_at timestamptz default now()
);

insert into offices (id, name) values
  ('00000000-0000-0000-0000-000000000001', 'Pritchett-Moore Real Estate')
on conflict do nothing;

create table if not exists agents (
  id                 uuid primary key default gen_random_uuid(),
  office_id          uuid references offices(id) not null,
  name               text not null,
  email              text,
  phone              text,
  role               text check (role in ('broker','agent','coordinator')) not null,
  m365_user_id       text,
  m365_access_token  text,
  m365_refresh_token text,
  outreach_mode      text check (outreach_mode in ('draft_only','review_before_send','auto_ack')) default 'review_before_send',
  active             boolean default true,
  created_at         timestamptz default now()
);

insert into agents (id, office_id, name, email, phone, role) values
  ('00000000-0000-0000-0001-000000000001','00000000-0000-0000-0000-000000000001','Wilson Moore','wilson@pritchett-moore.com',null,'broker'),
  ('00000000-0000-0000-0001-000000000002','00000000-0000-0000-0000-000000000001','Jerrod Hastings','jerrod@pritchett-moore.com',null,'agent'),
  ('00000000-0000-0000-0001-000000000003','00000000-0000-0000-0000-000000000001','Alyssa Tanner','alyssa@pritchett-moore.com',null,'coordinator')
on conflict do nothing;

create table if not exists deals (
  id            uuid primary key default gen_random_uuid(),
  office_id     uuid references offices(id) not null,
  agent_id      uuid references agents(id) not null,
  address       text not null,
  city          text,
  state         text default 'AL',
  zip           text,
  county        text,
  status        text check (status in ('pre_listing','listing_active','under_contract','closing','closed','cancelled')) default 'listing_active',
  list_price    numeric,
  sale_price    numeric,
  listing_date  date,
  closing_date  date,
  parsed_fields jsonb,
  source        text check (source in ('manual','email_parse','instanet','dotloop')) default 'manual',
  instanet_id   text,
  dotloop_id    text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create table if not exists messages (
  id              uuid primary key default gen_random_uuid(),
  office_id       uuid references offices(id) not null,
  deal_id         uuid references deals(id),
  agent_id        uuid references agents(id),
  direction       text check (direction in ('inbound','outbound')) not null,
  channel         text check (channel in ('sms','email','internal')) not null,
  body            text not null,
  status          text check (status in ('pending_review','approved','sent','failed','draft')) default 'pending_review',
  approved_by     uuid references agents(id),
  approved_at     timestamptz,
  sent_at         timestamptz,
  harriett_action text,
  created_at      timestamptz default now()
);

create table if not exists harriett_audit (
  id         uuid primary key default gen_random_uuid(),
  office_id  uuid references offices(id) not null,
  agent_id   uuid references agents(id),
  deal_id    uuid references deals(id),
  action     text not null,
  payload    jsonb,
  created_at timestamptz default now()
);

alter table offices        enable row level security;
alter table agents         enable row level security;
alter table deals          enable row level security;
alter table messages       enable row level security;
alter table harriett_audit enable row level security;
