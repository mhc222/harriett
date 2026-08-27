-- Restrict the direct PWA runtime to signed-in, tenant-scoped callers.

begin;

revoke all on conversation_contexts from anon;
revoke truncate, delete on conversation_contexts from authenticated;
grant select, insert, update on conversation_contexts to authenticated;

alter policy "agent reads own conversation context" on conversation_contexts to authenticated;
alter policy "agent creates own conversation context" on conversation_contexts to authenticated;
alter policy "agent updates own conversation context" on conversation_contexts to authenticated;

alter policy "agent creates own pwa ai runs" on ai_runs to authenticated;
alter policy "agent updates own pwa ai runs" on ai_runs to authenticated;
alter policy "agent records own pwa retrievals" on retrieval_events to authenticated;
alter policy "agent creates own pwa skill runs" on skill_runs to authenticated;
alter policy "agent updates own pwa skill runs" on skill_runs to authenticated;
alter policy "agent proposes own pwa google actions" on action_requests to authenticated;
alter policy "agent creates own pwa conversation turns" on conversation_turns to authenticated;
alter policy "agent updates own pwa conversation turns" on conversation_turns to authenticated;
alter policy "agent records own pwa conversation events" on conversation_events to authenticated;
alter policy "agent saves streamed pwa replies" on messages to authenticated;

revoke execute on function public.complete_pwa_fast_turn(uuid, timestamptz) from public;
revoke execute on function public.complete_pwa_fast_turn(uuid, timestamptz) from anon;
grant execute on function public.complete_pwa_fast_turn(uuid, timestamptz) to authenticated;

commit;
