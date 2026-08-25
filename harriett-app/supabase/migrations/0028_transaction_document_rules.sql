-- 0028: durable transaction-document catalog and office routing instruction.

begin;

create table transaction_document_rules (
  office_id             uuid not null references offices(id),
  rule_key              text not null,
  title                 text not null,
  aliases               text[] not null default '{}',
  family                text not null check (family in (
    'brokerage_disclosure','brokerage_agreement','transaction_contract',
    'contract_addendum','property_disclosure','financial_estimate',
    'settlement','property_record','internal_workflow'
  )),
  coarse_document_type  text not null check (coarse_document_type in (
    'listing_agreement','purchase_agreement','net_sheet','disclosure','settlement','other'
  )),
  lifecycle_stages      text[] not null,
  requirement_level     text not null check (requirement_level in (
    'required_when_applicable','conditional','supporting','internal','third_party'
  )),
  missing_severity      text not null check (missing_severity in ('block','flag','inform')),
  applicability_key     text not null,
  applies_when          text not null,
  authority_source_ids  text[] not null default '{}',
  version               integer not null default 1 check (version > 0),
  status                text not null default 'approved' check (status in ('draft','approved','retired')),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  primary key (office_id, rule_key)
);

alter table transaction_document_rules enable row level security;

create policy "office reads approved transaction document rules"
  on transaction_document_rules for select
  using (office_id = app.office_id() and (status = 'approved' or app.user_role() = 'broker'));

create policy "broker manages transaction document rules"
  on transaction_document_rules for all
  using (office_id = app.office_id() and app.user_role() = 'broker')
  with check (office_id = app.office_id() and app.user_role() = 'broker');

insert into transaction_document_rules (
  office_id, rule_key, title, aliases, family, coarse_document_type,
  lifecycle_stages, requirement_level, missing_severity, applicability_key,
  applies_when, authority_source_ids
) values
  ('00000000-0000-0000-0000-000000000001', 'al_recad_brokerage_services_disclosure',
   'Alabama Real Estate Brokerage Services Disclosure', array['RECAD','state RECAD','brokerage services disclosure'],
   'brokerage_disclosure', 'disclosure', array['relationship','pre_listing','offer'],
   'required_when_applicable', 'block', 'individual_brokerage_services',
   'Covered Alabama brokerage services for an individual consumer, subject to statutory exceptions and property-management treatment.',
   array['alabama-code-34-27-82-recad','alabama-admin-code-790-x-3-13']),
  ('00000000-0000-0000-0000-000000000001', 'pm_agency_brokerage_office_policy',
   'Pritchett-Moore Agency and Brokerage Office Policy', array['office policy','agency disclosure office policy','PMRE office policy'],
   'brokerage_disclosure', 'disclosure', array['relationship','pre_listing','offer'],
   'required_when_applicable', 'block', 'individual_brokerage_services',
   'The brokerage provides covered services to an individual consumer and the current office policy accompanies the RECAD workflow.',
   array['alabama-admin-code-790-x-3-14','arec-statutory-changes-2025-2026']),
  ('00000000-0000-0000-0000-000000000001', 'pm_exclusive_right_to_sell_listing_agreement',
   'Exclusive Right to Sell Property Listing Agreement', array['listing agreement','exclusive listing','PMRE listing form'],
   'brokerage_agreement', 'listing_agreement', array['pre_listing','listing_active'],
   'required_when_applicable', 'block', 'seller_listing',
   'Pritchett-Moore lists property on behalf of a seller for compensation.',
   array['alabama-code-34-27-82-recad','pm-transaction-packet-map']),
  ('00000000-0000-0000-0000-000000000001', 'pm_exclusive_buyer_agency_agreement',
   'Exclusive Buyer Agency Agreement', array['buyer agency agreement','buyer brokerage agreement','buyer representation agreement'],
   'brokerage_agreement', 'other', array['relationship','offer'],
   'required_when_applicable', 'block', 'buyer_offer_submission',
   'Pritchett-Moore submits an offer on behalf of a represented buyer for compensation.',
   array['alabama-code-34-27-82-recad','arec-statutory-changes-2025-2026']),
  ('00000000-0000-0000-0000-000000000001', 'al_general_financed_purchase_agreement',
   'General or Financed Purchase Agreement', array['purchase agreement','sales contract','offer to purchase','contract'],
   'transaction_contract', 'purchase_agreement', array['offer','under_contract','pre_closing','closed'],
   'required_when_applicable', 'block', 'written_offer_or_contract',
   'A written offer is being made or the property is treated as under contract.',
   array['pm-transaction-packet-map']),
  ('00000000-0000-0000-0000-000000000001', 'al_estimated_closing_statement',
   'Estimated Closing Statement', array['net sheet','buyer cost estimate','seller closing estimate','estimated net sheet'],
   'financial_estimate', 'net_sheet', array['offer','under_contract'],
   'required_when_applicable', 'block', 'single_family_offer_or_counteroffer',
   'A licensee prepares or presents a written offer or counteroffer in a single-family residential sale.',
   array['alabama-admin-code-790-x-3-04']),
  ('00000000-0000-0000-0000-000000000001', 'federal_lead_based_paint_disclosure',
   'Lead-Based Paint Disclosure', array['lead disclosure','lead paint form','LBP disclosure'],
   'property_disclosure', 'disclosure', array['pre_listing','offer','under_contract'],
   'conditional', 'block', 'pre_1978_residential',
   'Most residential housing built before 1978, subject to federal exemptions.',
   array['epa-lead-disclosure-rule']),
  ('00000000-0000-0000-0000-000000000001', 'federal_lead_hazard_pamphlet',
   'Protect Your Family From Lead in Your Home Pamphlet', array['lead pamphlet','EPA lead booklet','Protect Your Family'],
   'property_disclosure', 'disclosure', array['offer','under_contract'],
   'conditional', 'flag', 'pre_1978_residential',
   'The federal lead disclosure rule applies to the residential transaction.',
   array['epa-lead-disclosure-rule']),
  ('00000000-0000-0000-0000-000000000001', 'hud_fha_amendatory_clause_and_certification',
   'FHA Amendatory Clause and Real Estate Certification', array['FHA amendatory clause','FHA clause','real estate certification'],
   'contract_addendum', 'other', array['offer','under_contract','pre_closing'],
   'conditional', 'block', 'fha_financing',
   'FHA financing is used and no HUD exception applies.',
   array['hud-fha-sales-contract-guidance']),
  ('00000000-0000-0000-0000-000000000001', 'al_dual_agency_agreement',
   'Dual Agency Agreement', array['dual agency consent','limited consensual dual agency'],
   'brokerage_agreement', 'disclosure', array['offer','under_contract'],
   'conditional', 'block', 'dual_agency',
   'The permitted relationship is limited consensual dual agency for buyer and seller.',
   array['alabama-admin-code-790-x-3-14','alabama-code-34-27-82-recad']),
  ('00000000-0000-0000-0000-000000000001', 'al_designated_single_agency_agreement',
   'Designated Single Agency Agreement', array['designated agency','single agent designation'],
   'brokerage_agreement', 'disclosure', array['offer','under_contract'],
   'conditional', 'block', 'designated_single_agency',
   'Different licensees under the same qualifying broker represent opposing parties as designated single agents.',
   array['alabama-admin-code-790-x-3-14','arec-statutory-changes-2025-2026']),
  ('00000000-0000-0000-0000-000000000001', 'pm_office_exclusive_listing_addendum',
   'Pritchett-Moore Office Exclusive Listing Agreement Addendum', array['office exclusive addendum','listing addendum'],
   'contract_addendum', 'other', array['pre_listing','listing_active'],
   'conditional', 'flag', 'pm_listing',
   'The listing arrangement or current broker-approved office policy calls for the office-exclusive addendum.',
   array['pm-transaction-packet-map']),
  ('00000000-0000-0000-0000-000000000001', 'seller_property_information_sheet',
   'Seller Property Information Sheet', array['seller information sheet','property information sheet','seller property disclosure'],
   'property_disclosure', 'disclosure', array['pre_listing','listing_active','offer'],
   'supporting', 'flag', 'pm_listing',
   'The current office listing packet or signed contract calls for seller-provided property information.',
   array['pm-transaction-packet-map']),
  ('00000000-0000-0000-0000-000000000001', 'consumer_mortgage_closing_disclosure',
   'Closing Disclosure', array['CD','TRID closing disclosure'],
   'settlement', 'settlement', array['pre_closing','closed'],
   'third_party', 'block', 'consumer_mortgage_closing',
   'A covered consumer mortgage loan uses the Closing Disclosure, subject to TRID exceptions.',
   array['cfpb-closing-disclosure']),
  ('00000000-0000-0000-0000-000000000001', 'settlement_statement_or_alta',
   'Settlement Statement or ALTA Combined Settlement Statement', array['ALTA','settlement statement','HUD','closing statement'],
   'settlement', 'settlement', array['pre_closing','closed'],
   'third_party', 'flag', 'closed_transaction',
   'The title or settlement workflow produces final accounting for the closing.',
   array['pm-transaction-packet-map']),
  ('00000000-0000-0000-0000-000000000001', 'mls_property_record',
   'MLS Property Record', array['MLS sheet','MLS printout','listing sheet'],
   'property_record', 'other', array['listing_active','offer','under_contract','closed'],
   'supporting', 'inform', 'pm_listing',
   'Pritchett-Moore lists the property or needs a historical MLS snapshot.',
   array['pm-transaction-packet-map']),
  ('00000000-0000-0000-0000-000000000001', 'pm_listing_pending_closed_checklists',
   'PMRE Listing, Pending, and Closed File Checklists', array['listing checklist','pending checklist','closed checklist','coordinator checklist'],
   'internal_workflow', 'other', array['pre_listing','listing_active','under_contract','closed'],
   'internal', 'flag', 'pm_transaction',
   'A Pritchett-Moore transaction enters the corresponding lifecycle stage.',
   array['pm-transaction-packet-map']);

alter table documents add column document_type_key text;
alter table documents add constraint documents_transaction_document_rule_fkey
  foreign key (office_id, document_type_key)
  references transaction_document_rules (office_id, rule_key);
create index documents_document_type_key on documents (office_id, document_type_key);

insert into memories (
  id, office_id, agent_id, scope, category, content, provenance,
  confidence, status, sensitivity, processor, governance_reason
) values (
  '00000000-0000-0000-0002-000000000001',
  '00000000-0000-0000-0000-000000000001',
  null,
  'office',
  'instruction',
  'For transaction packet questions, combine the uploaded documents, approved transaction document rules, and published knowledge. Distinguish missing, incomplete, unreadable, not applicable, and needs more facts. Never infer a deadline or missing form from weak OCR.',
  '{"source":"manual","sourceId":"pm-transaction-packet-map","explicit":true,"observedAt":"2026-08-25T00:00:00.000Z"}'::jsonb,
  1,
  'active',
  'ordinary',
  'manual',
  'Office-scoped routing instruction. It is not transaction evidence or a legal conclusion.'
)
on conflict (id) do update set
  content = excluded.content,
  provenance = excluded.provenance,
  status = 'active',
  updated_at = now();

commit;
