-- 0030: Per-agent Meta OAuth, Facebook Page selection, and secret access.

create or replace function public.upsert_meta_connection(
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
  v_connection_id uuid;
begin
  if auth.uid() is null or app.office_id() is null or app.agent_id() is null then
    raise exception 'authenticated agent context required';
  end if;

  insert into public.connections (
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
    app.office_id(),
    app.agent_id(),
    'meta',
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

  insert into public.connection_secrets (
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

create or replace function public.get_meta_connection_secret()
returns table (
  connection_id uuid,
  token_ciphertext text,
  token_iv text,
  token_tag text,
  expires_at timestamptz,
  capabilities jsonb
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
    s.expires_at,
    c.capabilities
  from public.connections c
  join public.connection_secrets s on s.connection_id = c.id
  where auth.uid() is not null
    and c.office_id = app.office_id()
    and c.agent_id = app.agent_id()
    and c.provider = 'meta'
    and c.status = 'connected'
  limit 1;
$$;

create or replace function public.select_meta_page(p_page_id text)
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

  update public.connections c set
    capabilities = jsonb_set(c.capabilities, '{selected_page_id}', to_jsonb(p_page_id), true),
    updated_at = now()
  where c.office_id = app.office_id()
    and c.agent_id = app.agent_id()
    and c.provider = 'meta'
    and c.status = 'connected'
    and exists (
      select 1
      from jsonb_array_elements(coalesce(c.capabilities -> 'pages', '[]'::jsonb)) page
      where page ->> 'id' = p_page_id
    )
  returning c.id into v_connection_id;

  if v_connection_id is null then
    raise exception 'Facebook Page is not available for this agent';
  end if;
  return v_connection_id;
end;
$$;

create or replace function public.disconnect_meta_connection()
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
  from public.connections
  where office_id = app.office_id()
    and agent_id = app.agent_id()
    and provider = 'meta'
  limit 1;

  if v_connection_id is null then
    return null;
  end if;

  delete from public.connection_secrets where connection_id = v_connection_id;
  update public.connections set
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

create or replace function public.get_connection_statuses()
returns table (
  id uuid,
  provider text,
  status text,
  capabilities jsonb,
  last_synced_at timestamptz,
  error_message text,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public, app
stable
as $$
begin
  if auth.uid() is null or app.office_id() is null or app.agent_id() is null then
    raise exception 'authenticated agent context required';
  end if;

  return query
  select c.id, c.provider, c.status, c.capabilities, c.last_synced_at, c.error_message, c.updated_at
  from public.connections c
  where c.office_id = app.office_id()
    and (
      c.agent_id = app.agent_id()
      or (
        c.agent_id is null
        and not exists (
          select 1 from public.connections own
          where own.office_id = c.office_id
            and own.agent_id = app.agent_id()
            and own.provider = c.provider
        )
      )
    )
  order by c.provider;
end;
$$;

revoke all on function public.upsert_meta_connection(text, text[], jsonb, text, text, text, timestamptz) from public;
revoke all on function public.get_meta_connection_secret() from public;
revoke all on function public.select_meta_page(text) from public;
revoke all on function public.disconnect_meta_connection() from public;
grant execute on function public.upsert_meta_connection(text, text[], jsonb, text, text, text, timestamptz) to authenticated;
grant execute on function public.get_meta_connection_secret() to authenticated;
grant execute on function public.select_meta_page(text) to authenticated;
grant execute on function public.disconnect_meta_connection() to authenticated;
