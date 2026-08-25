-- 0016: validate invite-only signups inside the auth user transaction.

create or replace function app.prepare_invited_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  invitation public.auth_invites%rowtype;
  invited_agent public.agents%rowtype;
  supplied_token text;
  supplied_hash text;
begin
  supplied_token := new.raw_user_meta_data ->> 'invite_token';
  if supplied_token is null or length(supplied_token) < 32 then
    if
      new.raw_app_meta_data ->> 'office_id' is null or
      new.raw_app_meta_data ->> 'agent_id' is null or
      new.raw_app_meta_data ->> 'role' is null
    then
      raise exception 'A valid Harriett invitation is required';
    end if;

    select * into invited_agent
    from public.agents
    where id = (new.raw_app_meta_data ->> 'agent_id')::uuid
      and office_id = (new.raw_app_meta_data ->> 'office_id')::uuid
      and role = new.raw_app_meta_data ->> 'role'
      and active = true
      and lower(email) = lower(new.email);

    if not found then
      raise exception 'The provisioned Harriett agent is unavailable';
    end if;

    return new;
  end if;

  supplied_hash := encode(extensions.digest(supplied_token, 'sha256'), 'hex');

  select * into invitation
  from public.auth_invites
  where token_hash = supplied_hash
    and used_at is null
    and expires_at > now()
  for update;

  if not found or invitation.email <> lower(new.email) then
    raise exception 'The Harriett invitation is invalid or expired';
  end if;

  select * into invited_agent
  from public.agents
  where id = invitation.agent_id
    and office_id = invitation.office_id
    and active = true
    and lower(email) = lower(new.email);

  if not found then
    raise exception 'The invited Harriett agent is unavailable';
  end if;

  new.raw_app_meta_data := coalesce(new.raw_app_meta_data, '{}'::jsonb) ||
    jsonb_build_object(
      'office_id', invited_agent.office_id,
      'agent_id', invited_agent.id,
      'role', invited_agent.role
    );
  new.raw_user_meta_data := coalesce(new.raw_user_meta_data, '{}'::jsonb) - 'invite_token';

  update public.auth_invites
  set used_at = now()
  where id = invitation.id;

  return new;
end;
$$;

create or replace function app.finish_invited_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  linked_agent_id uuid;
  linked_office_id uuid;
begin
  linked_agent_id := (new.raw_app_meta_data ->> 'agent_id')::uuid;
  linked_office_id := (new.raw_app_meta_data ->> 'office_id')::uuid;

  update public.agents
  set user_id = new.id
  where id = linked_agent_id
    and office_id = linked_office_id;

  insert into public.audit_log (
    office_id,
    actor,
    actor_id,
    agent_id,
    action,
    payload
  ) values (
    linked_office_id,
    'system',
    new.id,
    linked_agent_id,
    'agent.password_account_claimed',
    jsonb_build_object('email', lower(new.email))
  );

  return new;
end;
$$;

create trigger harriett_prepare_invited_auth_user
  before insert on auth.users
  for each row execute function app.prepare_invited_auth_user();

create trigger harriett_finish_invited_auth_user
  after insert on auth.users
  for each row execute function app.finish_invited_auth_user();
