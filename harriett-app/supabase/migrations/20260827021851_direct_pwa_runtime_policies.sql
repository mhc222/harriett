-- Narrow RLS write paths for authenticated, directly streamed PWA turns.
--
-- RLS constrains every record to the authenticated agent and the PWA channel.

create policy "agent creates own pwa ai runs" on ai_runs
  for insert with check (
    office_id = app.office_id()
    and agent_id = app.agent_id()
    and channel = 'pwa'
    and status = 'running'
  );

create policy "agent updates own pwa ai runs" on ai_runs
  for update using (
    office_id = app.office_id()
    and agent_id = app.agent_id()
    and channel = 'pwa'
  ) with check (
    office_id = app.office_id()
    and agent_id = app.agent_id()
    and channel = 'pwa'
  );

create policy "agent records own pwa retrievals" on retrieval_events
  for insert with check (
    office_id = app.office_id()
    and agent_id = app.agent_id()
    and exists (
      select 1 from ai_runs run_record
      where run_record.id = retrieval_events.ai_run_id
        and run_record.office_id = app.office_id()
        and run_record.agent_id = app.agent_id()
        and run_record.channel = 'pwa'
    )
  );

create policy "agent creates own pwa skill runs" on skill_runs
  for insert with check (
    office_id = app.office_id()
    and agent_id = app.agent_id()
    and exists (
      select 1 from ai_runs run_record
      where run_record.id = skill_runs.ai_run_id
        and run_record.office_id = app.office_id()
        and run_record.agent_id = app.agent_id()
        and run_record.channel = 'pwa'
    )
  );

create policy "agent updates own pwa skill runs" on skill_runs
  for update using (
    office_id = app.office_id()
    and agent_id = app.agent_id()
    and exists (
      select 1 from ai_runs run_record
      where run_record.id = skill_runs.ai_run_id
        and run_record.office_id = app.office_id()
        and run_record.agent_id = app.agent_id()
        and run_record.channel = 'pwa'
    )
  ) with check (
    office_id = app.office_id()
    and agent_id = app.agent_id()
  );

create policy "agent proposes own pwa google actions" on action_requests
  for insert with check (
    office_id = app.office_id()
    and agent_id = app.agent_id()
    and skill_name in (
      'calendar_create',
      'calendar_edit',
      'calendar_delete',
      'contact_create',
      'contact_edit',
      'contact_delete',
      'email_draft',
      'email_send'
    )
    and status in ('proposed','approved')
    and (
      (status = 'proposed' and required_approver in ('agent','broker'))
      or (status = 'approved' and required_approver = 'none')
    )
    and exists (
      select 1 from ai_runs run_record
      where run_record.id = action_requests.ai_run_id
        and run_record.office_id = app.office_id()
        and run_record.agent_id = app.agent_id()
        and run_record.channel = 'pwa'
    )
  );

create policy "agent creates own pwa conversation turns" on conversation_turns
  for insert with check (
    office_id = app.office_id()
    and agent_id = app.agent_id()
    and channel = 'pwa'
    and exists (
      select 1 from messages inbound_record
      where inbound_record.id = conversation_turns.inbound_message_id
        and inbound_record.office_id = app.office_id()
        and inbound_record.agent_id = app.agent_id()
        and inbound_record.channel = 'pwa'
        and inbound_record.direction = 'inbound'
    )
  );

create policy "agent updates own pwa conversation turns" on conversation_turns
  for update using (
    office_id = app.office_id()
    and agent_id = app.agent_id()
    and channel = 'pwa'
  ) with check (
    office_id = app.office_id()
    and agent_id = app.agent_id()
    and channel = 'pwa'
  );

create policy "agent records own pwa conversation events" on conversation_events
  for insert with check (
    office_id = app.office_id()
    and exists (
      select 1 from conversation_turns turn_record
      where turn_record.id = conversation_events.turn_id
        and turn_record.office_id = app.office_id()
        and turn_record.agent_id = app.agent_id()
        and turn_record.channel = 'pwa'
    )
  );

create policy "agent saves streamed pwa replies" on messages
  for insert with check (
    office_id = app.office_id()
    and agent_id = app.agent_id()
    and channel = 'pwa'
    and direction = 'outbound'
    and consumer_facing = false
    and status = 'delivered'
    and in_reply_to_id is not null
    and ai_run_id is not null
    and exists (
      select 1 from messages inbound_record
      where inbound_record.id = messages.in_reply_to_id
        and inbound_record.office_id = app.office_id()
        and inbound_record.agent_id = app.agent_id()
        and inbound_record.channel = 'pwa'
        and inbound_record.direction = 'inbound'
    )
    and exists (
      select 1 from ai_runs run_record
      where run_record.id = messages.ai_run_id
        and run_record.office_id = app.office_id()
        and run_record.agent_id = app.agent_id()
        and run_record.channel = 'pwa'
        and run_record.status = 'completed'
    )
  );
