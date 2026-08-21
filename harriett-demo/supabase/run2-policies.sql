drop policy if exists "office_isolation" on deals;
drop policy if exists "office_isolation" on messages;
drop policy if exists "office_isolation" on agents;
drop policy if exists "office_isolation" on harriett_audit;

create policy "office_isolation" on deals
  for all using (office_id = '00000000-0000-0000-0000-000000000001');
create policy "office_isolation" on messages
  for all using (office_id = '00000000-0000-0000-0000-000000000001');
create policy "office_isolation" on agents
  for all using (office_id = '00000000-0000-0000-0000-000000000001');
create policy "office_isolation" on harriett_audit
  for all using (office_id = '00000000-0000-0000-0000-000000000001');
