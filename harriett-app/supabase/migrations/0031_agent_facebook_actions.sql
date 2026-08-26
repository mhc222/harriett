-- 0031: Allow an authenticated agent to approve an exact Facebook action
-- from the post preview. Execution remains service-role-only in Trigger.dev.

create policy "agents approve own facebook actions" on action_requests for insert
  with check (
    office_id = app.office_id()
    and agent_id = app.agent_id()
    and skill_name in ('facebook_publish_post', 'facebook_delete_post')
    and recipient_kind = 'agent'
    and status = 'approved'
    and required_approver = 'agent'
    and approved_by = app.agent_id()
    and approved_at is not null
  );
