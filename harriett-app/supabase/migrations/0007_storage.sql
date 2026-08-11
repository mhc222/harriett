-- 0007: private documents bucket

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

create policy "office members upload documents" on storage.objects
  for insert with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = app.office_id()::text
  );

create policy "office members read documents" on storage.objects
  for select using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = app.office_id()::text
  );
