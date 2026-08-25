-- 0019: Per-agent Google OAuth connections for personal Gmail and Calendar.

alter table connections drop constraint if exists connections_provider_check;
alter table connections add constraint connections_provider_check
  check (provider in (
    'microsoft', 'google', 'twilio', 'rentcast', 'trestle', 'dotloop',
    'resend', 'deepgram', 'elevenlabs', 'meta', 'calcom'
  ));

create or replace function app.upsert_google_connection(
  p_external_user_id text,
  p_scopes text[],
  p_capabilities jsonb,
  p_token_ciphertext text,
  p_token_iv text,
  p_token_tag text,
  p_expires_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = public, app
as $$
declare
  v_office_id uuid := app.office_id();
  v_agent_id uuid := app.agent_id();
  v_connection_id uuid;
begin
  if auth.uid() is null or v_office_id is null or v_agent_id is null then
    raise exception 'authenticated agent context required';
  end if;

  insert into connections (
    office_id,
    agent_id,
    provider,
    status,
    external_user_id,
    scopes,
    capabilities,
    last_synced_at,
    error_code,
    error_message,
    updated_at
  ) values (
    v_office_id,
    v_agent_id,
    'google',
    'connected',
    p_external_user_id,
    p_scopes,
    p_capabilities,
    now(),
    null,
    null,
    now()
  )
  on conflict (office_id, agent_id, provider) do update set
    status = excluded.status,
    external_user_id = excluded.external_user_id,
    scopes = excluded.scopes,
    capabilities = excluded.capabilities,
    last_synced_at = excluded.last_synced_at,
    error_code = null,
    error_message = null,
    updated_at = now()
  returning id into v_connection_id;

  insert into connection_secrets (
    connection_id,
    token_ciphertext,
    token_iv,
    token_tag,
    expires_at,
    rotated_at
  ) values (
    v_connection_id,
    p_token_ciphertext,
    p_token_iv,
    p_token_tag,
    p_expires_at,
    now()
  )
  on conflict (connection_id) do update set
    token_ciphertext = excluded.token_ciphertext,
    token_iv = excluded.token_iv,
    token_tag = excluded.token_tag,
    expires_at = excluded.expires_at,
    rotated_at = now();

  return v_connection_id;
end;
$$;

create or replace function app.get_google_connection_secret()
returns table (
  connection_id uuid,
  token_ciphertext text,
  token_iv text,
  token_tag text,
  expires_at timestamptz
)
language sql
security definer
set search_path = public, app
stable
as $$
  select
    c.id,
    s.token_ciphertext,
    s.token_iv,
    s.token_tag,
    s.expires_at
  from connections c
  join connection_secrets s on s.connection_id = c.id
  where auth.uid() is not null
    and c.office_id = app.office_id()
    and c.agent_id = app.agent_id()
    and c.provider = 'google'
  limit 1;
$$;

create or replace function app.disconnect_google_connection()
returns uuid
language plpgsql
security definer
set search_path = public, app
as $$
declare
  v_connection_id uuid;
begin
  if auth.uid() is null or app.office_id() is null or app.agent_id() is null then
    raise exception 'authenticated agent context required';
  end if;

  select id into v_connection_id
  from connections
  where office_id = app.office_id()
    and agent_id = app.agent_id()
    and provider = 'google'
  limit 1;

  if v_connection_id is null then
    return null;
  end if;

  delete from connection_secrets where connection_id = v_connection_id;

  update connections set
    status = 'revoked',
    scopes = '{}',
    capabilities = '{}'::jsonb,
    external_user_id = null,
    last_synced_at = null,
    error_code = null,
    error_message = null,
    updated_at = now()
  where id = v_connection_id;

  return v_connection_id;
end;
$$;

revoke all on function app.upsert_google_connection(text, text[], jsonb, text, text, text, timestamptz) from public;
revoke all on function app.get_google_connection_secret() from public;
revoke all on function app.disconnect_google_connection() from public;

grant execute on function app.upsert_google_connection(text, text[], jsonb, text, text, text, timestamptz) to authenticated;
grant execute on function app.get_google_connection_secret() to authenticated;
grant execute on function app.disconnect_google_connection() to authenticated;
