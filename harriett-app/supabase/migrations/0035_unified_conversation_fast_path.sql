-- 0035: Direct, audited PWA fast turns and a unified cross-channel transcript.
-- Greetings and the agent's own current-deal portfolio do not need a model,
-- a queue, or a service-role client. This security-definer function validates
-- the authenticated agent and the inbound message, creates the exact allowed
-- response, and writes the full conversation and audit trail atomically.

create or replace function public.complete_pwa_fast_turn(
  p_inbound_message_id uuid,
  p_displayed_at timestamptz default now()
)
returns table (
  response text,
  outbound_message_id uuid,
  turn_id uuid,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, app, pg_temp
as $$
declare
  v_inbound messages%rowtype;
  v_normalized text;
  v_response text;
  v_lane text;
  v_intent text;
  v_reason_code text;
  v_outcome text;
  v_outbound_id uuid;
  v_turn_id uuid;
  v_created_at timestamptz;
  v_active_count integer;
  v_pending_count integer;
  v_deal_count integer;
  v_deal_lines text;
  v_opening text;
  v_displayed_at timestamptz;
begin
  if auth.uid() is null or app.office_id() is null or app.agent_id() is null then
    raise exception 'authenticated agent context required';
  end if;

  select m.* into v_inbound
  from public.messages m
  where m.id = p_inbound_message_id
  for update;

  if v_inbound.id is null
    or v_inbound.office_id <> app.office_id()
    or v_inbound.agent_id <> app.agent_id()
    or v_inbound.channel <> 'pwa'
    or v_inbound.direction <> 'inbound'
    or v_inbound.consumer_facing then
    raise exception 'eligible inbound PWA message not found';
  end if;

  select m.id, m.body, m.created_at, ct.id
    into v_outbound_id, v_response, v_created_at, v_turn_id
  from public.messages m
  left join public.conversation_turns ct
    on ct.outbound_message_id = m.id
  where m.in_reply_to_id = v_inbound.id
    and m.direction = 'outbound'
    and m.channel = 'pwa'
  order by m.created_at asc
  limit 1;

  if v_outbound_id is not null then
    return query select v_response, v_outbound_id, v_turn_id, v_created_at;
    return;
  end if;

  v_normalized := lower(
    regexp_replace(
      regexp_replace(btrim(v_inbound.body), '[.!?]+$', ''),
      '[[:space:]]+',
      ' ',
      'g'
    )
  );

  if v_normalized in (
    'hi', 'hello', 'hey', 'hi there', 'hello there', 'hey there',
    'hi harriett', 'hello harriett', 'hey harriett',
    'hi there harriett', 'hello there harriett', 'hey there harriett',
    'howdy', 'howdy harriett',
    'morning', 'afternoon', 'evening',
    'morning harriett', 'afternoon harriett', 'evening harriett',
    'good morning', 'good afternoon', 'good evening',
    'good morning harriett', 'good afternoon harriett', 'good evening harriett'
  ) then
    v_response := case
      when v_normalized in ('hey there', 'hey there harriett', 'howdy', 'howdy harriett')
        then 'Hey there. What can I help you with?'
      else 'Hi. What can I help you with?'
    end;
    v_lane := 'reflex';
    v_intent := 'conversation_reflex';
    v_reason_code := 'deterministic_conversation_reflex';
    v_outcome := 'deterministic_reflex';
  elsif v_normalized in ('thanks', 'thank you', 'appreciate it', 'got it') then
    v_response := 'You’re welcome.';
    v_lane := 'reflex';
    v_intent := 'conversation_reflex';
    v_reason_code := 'deterministic_conversation_reflex';
    v_outcome := 'deterministic_reflex';
  elsif v_normalized in ('are you there', 'you there', 'still there') then
    v_response := 'I’m here. What do you need?';
    v_lane := 'reflex';
    v_intent := 'conversation_reflex';
    v_reason_code := 'deterministic_conversation_reflex';
    v_outcome := 'deterministic_reflex';
  elsif v_normalized in ('help', 'what can you do') then
    v_response := 'I can help with your listings, transactions, deadlines, documents, calendar, email, tasks, research, and social posts. What do you need?';
    v_lane := 'reflex';
    v_intent := 'conversation_reflex';
    v_reason_code := 'deterministic_conversation_reflex';
    v_outcome := 'deterministic_reflex';
  elsif v_normalized ~ '(what|which) (active |current |pending |closed )?(listings?|deals?|transactions?) do i have'
    or v_normalized ~ '(show|list|pull|give)( me)? my (active |current |pending |closed )?(listings?|deals?|transactions?)'
    or v_normalized ~ '(what|which|show|list|pull)( are)? my pending files?' then
    with current_deals as (
      select d.*
      from public.deals d
      where d.office_id = app.office_id()
        and d.agent_id = app.agent_id()
        and d.status not in ('closed', 'cancelled')
      order by d.updated_at desc
      limit 20
    )
    select
      count(*)::integer,
      count(*) filter (where status = 'listing_active')::integer,
      count(*) filter (where status in ('under_contract', 'closing'))::integer
      into v_deal_count, v_active_count, v_pending_count
    from current_deals;

    with current_deals as (
      select d.*
      from public.deals d
      where d.office_id = app.office_id()
        and d.agent_id = app.agent_id()
        and d.status not in ('closed', 'cancelled')
      order by d.updated_at desc
      limit 20
    )
    select string_agg(
      '- ' || d.address ||
      case when d.city is not null and btrim(d.city) <> '' then ', ' || d.city else '' end ||
      ', ' || case d.status
        when 'pre_listing' then 'Pre-listing'
        when 'listing_active' then 'Active listing'
        when 'under_contract' then 'Under contract'
        when 'closing' then 'Closing'
        when 'closed' then 'Closed'
        when 'cancelled' then 'Cancelled'
        else replace(d.status, '_', ' ')
      end ||
      case
        when coalesce(case when d.status = 'listing_active' then d.list_price else coalesce(d.sale_price, d.list_price) end, 0) > 0
          then ', ' || to_char(case when d.status = 'listing_active' then d.list_price else coalesce(d.sale_price, d.list_price) end, 'FM$999,999,999,990')
        else ''
      end ||
      case
        when d.closing_date is null then ''
        when d.closing_date < current_date and d.status not in ('closed', 'cancelled')
          then ', recorded closing ' || to_char(d.closing_date, 'Mon FMDD, YYYY') || ', status needs review'
        else ', closing ' || to_char(d.closing_date, 'Mon FMDD, YYYY')
      end,
      E'\n' order by d.updated_at desc
    ) into v_deal_lines
    from current_deals d;

    if v_deal_count = 0 then
      v_response := 'I don’t see any current transaction records assigned to you.';
    else
      v_opening := case
        when v_active_count > 0 and v_pending_count > 0 then
          'I found ' || v_active_count || ' active ' || case when v_active_count = 1 then 'listing' else 'listings' end ||
          ' and ' || v_pending_count || ' ' || case when v_pending_count = 1 then 'file' else 'files' end || ' under contract assigned to you:'
        when v_active_count > 0 then
          'I found ' || v_active_count || ' active ' || case when v_active_count = 1 then 'listing' else 'listings' end || ' assigned to you:'
        when v_pending_count > 0 then
          'I found ' || v_pending_count || ' ' || case when v_pending_count = 1 then 'file' else 'files' end || ' under contract assigned to you:'
        else
          'I found ' || v_deal_count || ' current ' || case when v_deal_count = 1 then 'transaction' else 'transactions' end || ' assigned to you:'
      end;
      v_response := v_opening || E'\n\n' || v_deal_lines;
    end if;
    v_lane := 'fast';
    v_intent := 'deal_lookup';
    v_reason_code := 'deterministic_agent_deal_portfolio';
    v_outcome := 'deterministic_deal_portfolio';
  else
    raise exception 'message is not eligible for the direct PWA fast path';
  end if;

  v_displayed_at := least(
    now(),
    greatest(coalesce(p_displayed_at, now()), v_inbound.created_at)
  );

  insert into public.conversation_turns (
    office_id,
    agent_id,
    thread_id,
    inbound_message_id,
    channel,
    lane,
    intent,
    status,
    idempotency_key,
    received_at,
    first_feedback_at,
    first_token_at,
    reply_created_at,
    completed_at,
    updated_at
  ) values (
    v_inbound.office_id,
    v_inbound.agent_id,
    v_inbound.thread_id,
    v_inbound.id,
    'pwa',
    v_lane,
    v_intent,
    'completed',
    'pwa-message:' || v_inbound.id,
    v_inbound.created_at,
    v_displayed_at,
    v_displayed_at,
    now(),
    now(),
    now()
  )
  returning id into v_turn_id;

  insert into public.messages (
    office_id,
    thread_id,
    deal_id,
    agent_id,
    direction,
    channel,
    body,
    consumer_facing,
    status,
    in_reply_to_id,
    sent_at
  ) values (
    v_inbound.office_id,
    v_inbound.thread_id,
    v_inbound.deal_id,
    v_inbound.agent_id,
    'outbound',
    'pwa',
    v_response,
    false,
    'delivered',
    v_inbound.id,
    now()
  )
  returning id, messages.created_at into v_outbound_id, v_created_at;

  update public.conversation_turns
  set outbound_message_id = v_outbound_id
  where id = v_turn_id;

  insert into public.conversation_events (office_id, turn_id, event, payload, occurred_at)
  values
    (v_inbound.office_id, v_turn_id, 'message.received', jsonb_build_object('channel', 'pwa'), v_inbound.created_at),
    (v_inbound.office_id, v_turn_id, 'message.persisted', jsonb_build_object('inboundMessageId', v_inbound.id), v_inbound.created_at),
    (v_inbound.office_id, v_turn_id, 'turn.routed', jsonb_build_object('lane', v_lane, 'intent', v_intent, 'reasonCode', v_reason_code, 'modelTier', 'none'), now()),
    (v_inbound.office_id, v_turn_id, 'reply.displayed', jsonb_build_object('channel', 'pwa', 'delivery', 'direct_web_response'), v_displayed_at),
    (v_inbound.office_id, v_turn_id, 'reply.created', jsonb_build_object('outboundMessageId', v_outbound_id, 'channel', 'pwa'), now()),
    (v_inbound.office_id, v_turn_id, 'turn.completed', jsonb_build_object('outcome', v_outcome), now());

  insert into public.audit_log (office_id, actor, agent_id, action, payload)
  values (
    v_inbound.office_id,
    'harriett',
    v_inbound.agent_id,
    'pwa.fast_reply_completed',
    jsonb_build_object(
      'inboundMessageId', v_inbound.id,
      'outboundMessageId', v_outbound_id,
      'conversationTurnId', v_turn_id,
      'lane', v_lane,
      'intent', v_intent,
      'reasonCode', v_reason_code,
      'outcome', v_outcome,
      'execution', 'direct_database_transaction'
    )
  );

  return query select v_response, v_outbound_id, v_turn_id, v_created_at;
end;
$$;

revoke all on function public.complete_pwa_fast_turn(uuid, timestamptz) from public;
grant execute on function public.complete_pwa_fast_turn(uuid, timestamptz) to authenticated;
