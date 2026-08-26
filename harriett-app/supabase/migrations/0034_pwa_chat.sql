-- 0034: authenticated, agent-only PWA chat channel.

alter table threads
  drop constraint if exists threads_channel_check,
  add constraint threads_channel_check
    check (channel in ('sms','whatsapp','pwa','email','internal'));

alter table messages
  drop constraint if exists messages_channel_check,
  add constraint messages_channel_check
    check (channel in ('sms','whatsapp','pwa','email','internal'));

alter table messages
  drop constraint if exists no_consumer_agent_text,
  add constraint no_consumer_agent_messaging
    check (not (consumer_facing and channel in ('sms','whatsapp','pwa')));

-- An authenticated agent may submit only their own inbound PWA message.
-- Harriett's outbound messages are written by the audited Trigger task.
create policy "agent sends own pwa messages" on messages
  for insert with check (
    office_id = app.office_id()
    and agent_id = app.agent_id()
    and channel = 'pwa'
    and direction = 'inbound'
    and consumer_facing = false
    and status = 'delivered'
  );

