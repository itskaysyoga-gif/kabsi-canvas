-- P0.8-09 part A: the foreign key of public.coach_profile (20261021250000_profile_coach.sql). A business's Coach numbers go
-- with the business when it is removed (K-41 deletion). Applied by the session with execute_sql and a read-back (R-44)
-- because the file holds a cascade clause; it removes no data. Read-back (expected: 1 row):
--   select conname from pg_constraint where conname = 'coach_profile_location_id_fkey';
alter table public.coach_profile
  add constraint coach_profile_location_id_fkey foreign key (location_id) references public.locations (id) on delete cascade;
