-- P0.5-01 part A: the staff upload links belong to their business and go with it (R-44: applied by the session with
-- execute_sql and read back in the same call).
alter table public.photo_upload_links
  add constraint photo_upload_links_location_id_fkey foreign key (location_id) references public.locations(id) on delete cascade;

-- Read-back: 1 row, delete rule CASCADE.
select tc.constraint_name, rc.delete_rule
  from information_schema.table_constraints tc
  join information_schema.referential_constraints rc on rc.constraint_name = tc.constraint_name
 where tc.table_name = 'photo_upload_links' and tc.constraint_type = 'FOREIGN KEY';
