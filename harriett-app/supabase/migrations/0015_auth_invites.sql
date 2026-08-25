-- 0015: invite-only password account setup.

create table auth_invites (
  id          uuid primary key default gen_random_uuid(),
  office_id   uuid not null references offices(id),
  agent_id    uuid not null references agents(id),
  email       text not null,
  token_hash  text not null unique,
  expires_at  timestamptz not null,
  used_at     timestamptz,
  created_by  uuid references agents(id),
  created_at  timestamptz not null default now(),
  check (email = lower(email))
);

create index auth_invites_agent_created
  on auth_invites (agent_id, created_at desc);

create index auth_invites_active
  on auth_invites (token_hash, expires_at)
  where used_at is null;

alter table auth_invites enable row level security;

-- Invitations contain authentication secrets. Only audited service-role code
-- may create, inspect, or consume them.
revoke all on auth_invites from anon, authenticated;
