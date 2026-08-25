-- 0026: durable agent reminders on the existing work item system.

begin;

alter table work_items
  add column if not exists source_ai_run_id uuid references ai_runs(id) on delete set null,
  add column if not exists reminder_at timestamptz,
  add column if not exists reminder_channel text
    check (reminder_channel is null or reminder_channel in ('sms','whatsapp')),
  add column if not exists reminder_sent_at timestamptz,
  add column if not exists reminder_run_id text;

create index if not exists work_items_pending_reminders
  on work_items (reminder_at)
  where reminder_at is not null
    and reminder_sent_at is null
    and status not in ('completed','cancelled');

commit;
