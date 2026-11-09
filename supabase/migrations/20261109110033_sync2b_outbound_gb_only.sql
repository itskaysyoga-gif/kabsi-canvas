-- Sync 2b part A (lane R, R-142 decision 4b; master plan 30.45 item 5): Outbound writes only to UK registered companies
-- active on Companies House. The UAE and every other country stay off, so open_countries may hold only 'GB'.
-- Read before applying (9 Nov 2026): the one outbound_settings row holds open_countries '{}', sending_open false,
-- test_mode true; no row holds another country. Narrowing only: no data changes, and sending stays locked.
alter table public.outbound_settings drop constraint if exists outbound_settings_open_countries_check;
alter table public.outbound_settings add constraint outbound_settings_open_countries_check
  check (open_countries <@ array['GB']::text[]);
comment on column public.outbound_settings.open_countries is
  'Outbound (30.45 item 5, R-142): only GB may be opened, by lane R. The UAE and every other country stay off.';
