-- 0020: Expose narrow Google connection RPC wrappers through PostgREST.
-- The underlying app functions remain the security boundary and derive the
-- office and agent from the authenticated Supabase session.

create or replace function public.upsert_google_connection(
  p_external_user_id text,
  p_scopes text[],
  p_capabilities jsonb,
  p_token_ciphertext text,
  p_token_iv text,
  p_token_tag text,
  p_expires_at timestamptz
)
returns uuid
language sql
security invoker
set search_path = public, app
as $$
  select app.upsert_google_connection(
    p_external_user_id,
    p_scopes,
    p_capabilities,
    p_token_ciphertext,
    p_token_iv,
    p_token_tag,
    p_expires_at
  );
$$;

create or replace function public.get_google_connection_secret()
returns table (
  connection_id uuid,
  token_ciphertext text,
  token_iv text,
  token_tag text,
  expires_at timestamptz
)
language sql
security invoker
set search_path = public, app
stable
as $$
  select * from app.get_google_connection_secret();
$$;

create or replace function public.disconnect_google_connection()
returns uuid
language sql
security invoker
set search_path = public, app
as $$
  select app.disconnect_google_connection();
$$;

revoke all on function public.upsert_google_connection(text, text[], jsonb, text, text, text, timestamptz) from public;
revoke all on function public.get_google_connection_secret() from public;
revoke all on function public.disconnect_google_connection() from public;

grant execute on function public.upsert_google_connection(text, text[], jsonb, text, text, text, timestamptz) to authenticated;
grant execute on function public.get_google_connection_secret() to authenticated;
grant execute on function public.disconnect_google_connection() to authenticated;
