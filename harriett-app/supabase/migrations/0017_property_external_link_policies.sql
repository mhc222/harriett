-- 0017: allow authenticated office members to maintain RentCast property links.

begin;

create policy "members create property external links"
  on external_record_links for insert
  to authenticated
  with check (
    office_id = app.office_id()
    and entity_type = 'property'
    and exists (
      select 1
      from properties property
      where property.id = entity_id
        and property.office_id = app.office_id()
    )
  );

create policy "members update property external links"
  on external_record_links for update
  to authenticated
  using (
    office_id = app.office_id()
    and entity_type = 'property'
    and exists (
      select 1
      from properties property
      where property.id = entity_id
        and property.office_id = app.office_id()
    )
  )
  with check (
    office_id = app.office_id()
    and entity_type = 'property'
    and exists (
      select 1
      from properties property
      where property.id = entity_id
        and property.office_id = app.office_id()
    )
  );

commit;
