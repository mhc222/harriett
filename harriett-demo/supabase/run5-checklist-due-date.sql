-- Add due_date to checklist_items
-- Computed at write time: listing_date + days_from_listing
-- If listing_date is in the past, falls back to today + days_from_listing so demo shows future dates

alter table checklist_items add column if not exists due_date date;
