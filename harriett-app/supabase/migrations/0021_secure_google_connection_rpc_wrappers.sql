-- 0021: Allow the public RPC wrappers to enter the private app schema without
-- granting authenticated users general schema access. The underlying app
-- functions still require auth.uid(), office_id, and agent_id context.

alter function public.upsert_google_connection(text, text[], jsonb, text, text, text, timestamptz)
  security definer;

alter function public.get_google_connection_secret()
  security definer;

alter function public.disconnect_google_connection()
  security definer;
