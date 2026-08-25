-- 0025: Durable execution results for approved Google Workspace actions.

begin;

alter table action_requests
  add column execution_output jsonb,
  add column execution_error text,
  add column execution_started_at timestamptz,
  add column executed_at timestamptz;

create index action_requests_execution
  on action_requests(status, updated_at)
  where status in ('approved','running','failed');

commit;
