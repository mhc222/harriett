-- 0012: allow WhatsApp as a temporary agent-only Twilio testing channel.

alter table threads
  drop constraint if exists threads_channel_check,
  add constraint threads_channel_check
    check (channel in ('sms','whatsapp','email','internal'));

alter table messages
  drop constraint if exists messages_channel_check,
  add constraint messages_channel_check
    check (channel in ('sms','whatsapp','email','internal'));

alter table messages
  drop constraint if exists no_consumer_sms,
  add constraint no_consumer_agent_text
    check (not (consumer_facing and channel in ('sms','whatsapp')));

alter table consent_events
  drop constraint if exists consent_events_channel_check,
  add constraint consent_events_channel_check
    check (channel in ('sms','whatsapp'));

alter table ai_runs
  drop constraint if exists ai_runs_channel_check,
  add constraint ai_runs_channel_check
    check (channel in ('sms','whatsapp','pwa','email_event','voice','background'));
