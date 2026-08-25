-- 0029: reviewable transaction facts and document execution findings.

begin;

alter table deal_field_evidence
  add column source_type text not null default 'document'
    check (source_type in ('document','user_correction','provider')),
  add column supersedes_id uuid references deal_field_evidence(id) on delete set null,
  add column correction_reason text;

create table document_rule_reviews (
  id                       uuid primary key default gen_random_uuid(),
  office_id                uuid not null references offices(id),
  agent_id                 uuid not null references agents(id),
  deal_id                  uuid not null references deals(id) on delete cascade,
  document_id              uuid not null references documents(id) on delete cascade,
  rule_key                 text not null,
  status                   text not null check (status in ('appears_complete','incomplete','unreadable','needs_review')),
  pages                    integer[] not null default '{}',
  missing_or_unclear_items text[] not null default '{}',
  evidence                 jsonb not null default '[]'::jsonb,
  confidence               real not null check (confidence >= 0 and confidence <= 1),
  reviewed_by              text not null check (reviewed_by in ('harriett','user')),
  confirmed_by             uuid references agents(id),
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  unique (document_id, rule_key),
  foreign key (office_id, rule_key)
    references transaction_document_rules (office_id, rule_key)
);

create index document_rule_reviews_deal on document_rule_reviews (deal_id, status, rule_key);
alter table document_rule_reviews enable row level security;

create policy "office reads document reviews" on document_rule_reviews for select
  using (office_id = app.office_id() and (
    agent_id = app.agent_id() or app.user_role() in ('broker','coordinator')
  ));

create policy "members correct permitted deal evidence" on deal_field_evidence for insert
  with check (
    office_id = app.office_id()
    and confirmed_by = app.agent_id()
    and source_type = 'user_correction'
    and exists (
      select 1 from deals d where d.id = deal_id and d.office_id = app.office_id()
      and (d.agent_id = app.agent_id() or app.user_role() in ('broker','coordinator'))
    )
  );

create policy "members supersede permitted deal evidence" on deal_field_evidence for update
  using (
    office_id = app.office_id()
    and exists (
      select 1 from deals d where d.id = deal_id and d.office_id = app.office_id()
      and (d.agent_id = app.agent_id() or app.user_role() in ('broker','coordinator'))
    )
  )
  with check (office_id = app.office_id());

create policy "members record permitted deal events" on deal_events for insert
  with check (
    office_id = app.office_id()
    and agent_id = app.agent_id()
    and source = 'user'
    and exists (
      select 1 from deals d where d.id = deal_id and d.office_id = app.office_id()
      and (d.agent_id = app.agent_id() or app.user_role() in ('broker','coordinator'))
    )
  );

create or replace function public.correct_deal_fact(
  requested_deal_id uuid,
  requested_field_name text,
  corrected_value jsonb,
  correction_note text,
  superseded_evidence_id uuid default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  allowed_fields constant text[] := array[
    'address','city','state','zip','county','propertyType','yearBuilt',
    'listPrice','salePrice','earnestMoney','sellerConcessions','loanType',
    'listingDate','contractAcceptanceDate','closingDate','sellers','buyers',
    'listingAgent','buyerAgent'
  ];
  new_evidence_id uuid;
  office uuid := app.office_id();
  agent uuid := app.agent_id();
  safe_value jsonb := coalesce(corrected_value, 'null'::jsonb);
  prior_value jsonb;
begin
  if not (requested_field_name = any(allowed_fields)) then
    raise exception 'unsupported deal fact';
  end if;
  if correction_note is null or length(trim(correction_note)) < 3 then
    raise exception 'correction reason is required';
  end if;

  select d.parsed_fields -> requested_field_name
    into prior_value
    from public.deals d
    where d.id = requested_deal_id
      and d.office_id = office;
  if not found then raise exception 'deal not found or update not permitted'; end if;

  if superseded_evidence_id is not null then
    update public.deal_field_evidence
      set status = 'superseded'
      where id = superseded_evidence_id
        and deal_id = requested_deal_id
        and office_id = office
        and status in ('extracted','confirmed');
  end if;

  update public.deals
    set parsed_fields = jsonb_set(coalesce(parsed_fields, '{}'::jsonb), array[requested_field_name], safe_value, true),
        address = case when requested_field_name = 'address' then safe_value #>> '{}' else address end,
        city = case when requested_field_name = 'city' then safe_value #>> '{}' else city end,
        state = case when requested_field_name = 'state' then upper(safe_value #>> '{}') else state end,
        zip = case when requested_field_name = 'zip' then safe_value #>> '{}' else zip end,
        county = case when requested_field_name = 'county' then safe_value #>> '{}' else county end,
        list_price = case when requested_field_name = 'listPrice' then (safe_value #>> '{}')::numeric else list_price end,
        sale_price = case when requested_field_name = 'salePrice' then (safe_value #>> '{}')::numeric else sale_price end,
        listing_date = case when requested_field_name = 'listingDate' then (safe_value #>> '{}')::date else listing_date end,
        contract_acceptance_date = case when requested_field_name = 'contractAcceptanceDate' then (safe_value #>> '{}')::date else contract_acceptance_date end,
        closing_date = case when requested_field_name = 'closingDate' then (safe_value #>> '{}')::date else closing_date end,
        updated_at = now()
    where id = requested_deal_id
      and office_id = office;

  if not found then raise exception 'deal not found or update not permitted'; end if;

  insert into public.deal_field_evidence (
    office_id, deal_id, document_id, field_name, value, confidence, status,
    confirmed_by, source_type, supersedes_id, correction_reason
  ) values (
    office, requested_deal_id, null, requested_field_name, safe_value, 1, 'confirmed',
    agent, 'user_correction', superseded_evidence_id, trim(correction_note)
  ) returning id into new_evidence_id;

  insert into public.deal_events (office_id, deal_id, agent_id, event, source, payload)
  values (
    office, requested_deal_id, agent, 'deal.fact_corrected', 'user',
    jsonb_build_object(
      'fieldName', requested_field_name,
      'evidenceId', new_evidence_id,
      'supersededEvidenceId', superseded_evidence_id,
      'reason', trim(correction_note)
    )
  );

  insert into public.audit_log (
    office_id, actor, actor_id, agent_id, deal_id, action, payload
  ) values (
    office, 'user', auth.uid(), agent, requested_deal_id, 'deal.fact_corrected',
    jsonb_build_object(
      'fieldName', requested_field_name,
      'previousValue', prior_value,
      'correctedValue', safe_value,
      'evidenceId', new_evidence_id,
      'supersededEvidenceId', superseded_evidence_id,
      'reason', trim(correction_note)
    )
  );

  return new_evidence_id;
end;
$$;

grant execute on function public.correct_deal_fact(uuid, text, jsonb, text, uuid) to authenticated;

commit;
