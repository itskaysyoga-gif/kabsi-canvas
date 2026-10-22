-- P0.8-04: the foreign keys of the auto-fix opt-ins and the revert log, with on delete; applied by the session with
-- execute_sql and read back in the same call (R-44). They go with their business.
alter table private.protection_autofix add constraint protection_autofix_location_id_fkey
  foreign key (location_id) references public.locations (id) on delete cascade;
alter table private.google_revert_log add constraint google_revert_log_location_id_fkey
  foreign key (location_id) references public.locations (id) on delete cascade;
