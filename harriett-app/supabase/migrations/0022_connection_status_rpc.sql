-- 0022: Return non-secret connection health for the current signed-in agent.

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
  select
    c.id,
    c.provider,
    c.status,
    c.capabilities,
    c.last_synced_at,
    c.error_message,
    c.updated_at
  from public.connections c
  where c.office_id = app.office_id()
    and (c.agent_id = app.agent_id() or c.agent_id is null)
  order by c.provider;
end;
$$;

revoke all on function public.get_connection_statuses() from public;
grant execute on function public.get_connection_statuses() to authenticated;
