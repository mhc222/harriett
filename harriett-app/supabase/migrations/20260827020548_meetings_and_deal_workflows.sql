-- Meeting capture and explicit Phase 2 deal workflow outputs.

begin;

alter table artifacts drop constraint if exists artifacts_kind_check;
alter table artifacts add constraint artifacts_kind_check check (kind in (
  'research_note','seller_brief','cma_draft','mls_remarks',
  'marketing_copy','email_draft','social_post','meeting_summary','report',
  'photo_coordination_plan','document_draft'
));
alter table artifacts
  add column if not exists workflow_run_id uuid references workflow_runs(id) on delete set null;
create index if not exists artifacts_workflow_run on artifacts (workflow_run_id);
create unique index if not exists artifacts_primary_workflow_output
  on artifacts (workflow_run_id);

alter table work_items
  add column if not exists kind text not null default 'general',
  add column if not exists workflow_run_id uuid references workflow_runs(id) on delete set null,
  add column if not exists workflow_step_key text;
alter table work_items drop constraint if exists work_items_kind_check;
alter table work_items add constraint work_items_kind_check check (kind in (
  'general','meeting_follow_up','marketing','photo_coordination','document_drafting'
));
create index if not exists work_items_workflow_run on work_items (workflow_run_id);
create unique index if not exists work_items_workflow_step
  on work_items (workflow_run_id, workflow_step_key);

create table meeting_captures (
  id                         uuid primary key default gen_random_uuid(),
  office_id                  uuid not null references offices(id),
  agent_id                   uuid not null references agents(id),
  deal_id                    uuid references deals(id) on delete set null,
  property_id                uuid references properties(id) on delete set null,
  contact_id                 uuid references contacts(id) on delete set null,
  workflow_run_id            uuid references workflow_runs(id) on delete set null,
  summary_artifact_id        uuid references artifacts(id) on delete set null,
  source_type                text not null check (source_type in ('recording','dictated_memo','written_memo')),
  title                      text not null,
  occurred_at                timestamptz not null default now(),
  recording_consent_at       timestamptz,
  audio_storage_path         text,
  audio_mime_type            text,
  audio_size_bytes           bigint check (audio_size_bytes is null or audio_size_bytes >= 0),
  duration_seconds           numeric check (duration_seconds is null or duration_seconds >= 0),
  source_text                text,
  status                     text not null default 'uploaded'
                             check (status in ('uploaded','processing','completed','failed')),
  trigger_run_id             text,
  error_message              text,
  completed_at               timestamptz,
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now(),
  check (
    (source_type = 'recording' and recording_consent_at is not null and audio_storage_path is not null)
    or (source_type = 'dictated_memo' and audio_storage_path is not null)
    or (source_type = 'written_memo' and (source_text is not null or status = 'completed'))
  )
);

create index meeting_captures_agent_created on meeting_captures (agent_id, created_at desc);
create index meeting_captures_deal_created on meeting_captures (deal_id, created_at desc);

alter table meeting_captures enable row level security;

revoke all on meeting_captures from anon;
revoke truncate, delete on meeting_captures from authenticated;
grant select, insert, update on meeting_captures to authenticated;

create policy "members create own workflows" on workflow_runs for insert
  to authenticated
  with check (
    office_id = app.office_id()
    and agent_id = app.agent_id()
    and workflow in ('meeting_capture','marketing_materials','photo_coordination','document_drafting')
  );

revoke update on workflow_runs from authenticated;
grant update (status, updated_at) on workflow_runs to authenticated;
create policy "members fail own queued workflows" on workflow_runs for update
  to authenticated
  using (
    office_id = app.office_id()
    and agent_id = app.agent_id()
    and status = 'queued'
    and workflow in ('meeting_capture','marketing_materials','photo_coordination','document_drafting')
  )
  with check (
    office_id = app.office_id()
    and agent_id = app.agent_id()
    and status in ('failed','cancelled')
    and workflow in ('meeting_capture','marketing_materials','photo_coordination','document_drafting')
  );

create policy "members read permitted meetings" on meeting_captures for select
  to authenticated
  using (office_id = app.office_id()
    and (agent_id = app.agent_id() or app.user_role() in ('broker','coordinator')));
create policy "agents create own meetings" on meeting_captures for insert
  to authenticated
  with check (office_id = app.office_id() and agent_id = app.agent_id());
create policy "agents update own meetings" on meeting_captures for update
  to authenticated
  using (office_id = app.office_id() and agent_id = app.agent_id())
  with check (office_id = app.office_id() and agent_id = app.agent_id());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'meeting-media',
  'meeting-media',
  false,
  26214400,
  array['audio/webm','audio/mp4','audio/mpeg','audio/wav','audio/x-m4a','audio/ogg']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "office members upload meeting media" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'meeting-media'
    and (storage.foldername(name))[1] = app.office_id()::text
  );

create policy "office members read meeting media" on storage.objects
  for select to authenticated using (
    bucket_id = 'meeting-media'
    and (storage.foldername(name))[1] = app.office_id()::text
  );

create policy "office members remove meeting media" on storage.objects
  for delete to authenticated using (
    bucket_id = 'meeting-media'
    and (storage.foldername(name))[1] = app.office_id()::text
  );

commit;
