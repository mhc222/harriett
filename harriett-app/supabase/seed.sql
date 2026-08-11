-- Seed: Pritchett-Moore office, Wilson (broker), Alyssa (coordinator).
-- Pilot agents are added through the invite flow, not seeded.

insert into offices (id, name) values
  ('00000000-0000-0000-0000-000000000001', 'Pritchett-Moore Real Estate')
on conflict do nothing;

insert into agents (id, office_id, name, email, role) values
  ('00000000-0000-0000-0001-000000000001', '00000000-0000-0000-0000-000000000001',
   'Wilson Moore', 'wilson@pritchett-moore.com', 'broker'),
  ('00000000-0000-0000-0001-000000000003', '00000000-0000-0000-0000-000000000001',
   'Alyssa Tanner', 'alyssa@pritchett-moore.com', 'coordinator')
on conflict do nothing;
