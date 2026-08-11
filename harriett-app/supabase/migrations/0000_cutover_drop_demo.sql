-- 0000: Phase 1 demo cutover. Drops the demo schema so the Phase 2 migrations
-- own the database. Matt approved going live on the existing project and
-- retiring the demo (2026-08-11). Demo data snapshot taken before this ran:
-- .backups/demo-data-snapshot-20260811.json (untracked).
-- No-op on fresh databases.

drop view if exists approval_queue;

drop table if exists demo_messages cascade;
drop table if exists checklist_items cascade;
drop table if exists calendar_events cascade;
drop table if exists harriett_audit cascade;
drop table if exists messages cascade;
drop table if exists vendors cascade;
drop table if exists deals cascade;
drop table if exists agents cascade;
drop table if exists offices cascade;
