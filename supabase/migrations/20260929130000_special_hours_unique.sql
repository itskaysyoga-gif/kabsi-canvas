-- Wave 2: a double click on "Confirm and save to Google" must not write the same special hours twice.
-- One live row per business and date range. A row that failed does not count, so the owner can try again.
-- (No duplicates existed when this was written; checked on 29 Sep.)
create unique index special_hours_dates_unique
  on public.special_hours (location_id, start_date, end_date)
  where state in ('draft', 'posted');
