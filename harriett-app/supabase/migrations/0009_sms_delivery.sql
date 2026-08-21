-- 0009: make inbound SMS and Harriett replies idempotent.

alter table messages
  add column if not exists in_reply_to_id uuid references messages(id) on delete set null;

create unique index if not exists messages_provider_message_id_unique
  on messages(provider_message_id)
  where provider_message_id is not null;

create unique index if not exists messages_one_reply_per_inbound
  on messages(in_reply_to_id)
  where direction = 'outbound' and in_reply_to_id is not null;

