-- P0.5-03 part B: the foreign keys of public.holiday_prompts (20261021240000_holiday_calendar.sql). A business's holiday
-- questions go with the business when it is removed (K-41 deletion); the questions keep themselves when the special hours
-- they made are cleared. Applied by the session with execute_sql and a read-back (R-44) because the file holds cascade
-- clauses; it removes no data. Read-back (expected: 3 rows):
--   select conname from pg_constraint where conname in ('holiday_prompts_location_id_fkey', 'holiday_prompts_holiday_id_fkey',
--     'holiday_prompts_special_hours_id_fkey') order by 1;
alter table public.holiday_prompts
  add constraint holiday_prompts_location_id_fkey foreign key (location_id) references public.locations (id) on delete cascade,
  add constraint holiday_prompts_holiday_id_fkey foreign key (holiday_id) references public.holidays (id) on delete cascade,
  add constraint holiday_prompts_special_hours_id_fkey foreign key (special_hours_id) references public.special_hours (id) on delete set null;
