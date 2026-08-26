-- 0032: Allow authenticated RLS policies to read the caller's tenant claims.
-- These helpers only return values already present in the caller's JWT.

grant usage on schema app to authenticated;

revoke all on function app.office_id() from public;
revoke all on function app.agent_id() from public;
revoke all on function app.user_role() from public;

grant execute on function app.office_id() to authenticated;
grant execute on function app.agent_id() to authenticated;
grant execute on function app.user_role() to authenticated;
