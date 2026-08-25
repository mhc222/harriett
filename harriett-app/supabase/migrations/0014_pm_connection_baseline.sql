-- 0014: register the current Pritchett-Moore integration baseline.

insert into connections (office_id, agent_id, provider, status, capabilities) values
  ('00000000-0000-0000-0000-000000000001', null, 'twilio', 'connected',
   '{"sms":false,"whatsapp":true,"media":true}'::jsonb),
  ('00000000-0000-0000-0000-000000000001', null, 'rentcast', 'connected',
   '{"property_search":true,"valuation":true,"monthly_call_limit":50}'::jsonb),
  ('00000000-0000-0000-0000-000000000001', null, 'microsoft', 'pending_admin',
   '{"mail":false,"calendar":false,"contacts":false}'::jsonb),
  ('00000000-0000-0000-0000-000000000001', null, 'meta', 'disconnected',
   '{"facebook_publish":false,"instagram_publish":false}'::jsonb)
on conflict (office_id, agent_id, provider) do nothing;
