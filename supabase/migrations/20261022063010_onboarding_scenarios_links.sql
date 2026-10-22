-- P0.4-04: the foreign key of onboarding_scenarios. The `on delete cascade` clause is additive; applied by the session with
-- execute_sql and read back in the same call (R-44). The reported situation goes with the business.
alter table public.onboarding_scenarios add constraint onboarding_scenarios_location_id_fkey
  foreign key (location_id) references public.locations (id) on delete cascade;
