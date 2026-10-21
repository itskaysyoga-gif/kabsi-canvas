-- P0.8-11: the foreign keys of public.review_reports, for Hussein to run in the SQL editor (they carry cascade
-- clauses, which the Supabase connector does not take). They remove no data: a report goes only when its business or
-- its review goes (the review text itself is cleared after 30 days, the review row stays).
--
-- Read-back (expected: 2 rows):
--   select conname from pg_constraint where conname in ('review_reports_location_id_fkey', 'review_reports_review_id_fkey') order by 1;

alter table public.review_reports
  add constraint review_reports_location_id_fkey foreign key (location_id) references public.locations (id) on delete cascade,
  add constraint review_reports_review_id_fkey foreign key (review_id) references public.reviews (id) on delete cascade;
