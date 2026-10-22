-- P0.7-04 (session 18, 22 Oct 2026), second file: rows the mock re-created for Yawmiyati at 07:07 UTC, after the
-- first file ran and before Yawmiyati was pointed at its real Google location (the protection job read the old mock
-- id and seeded a new mock listing). Same kinds as the list Rashid approved. Run once in the SQL editor, only after
-- the session says Yawmiyati is repointed (otherwise the mock seeds them again). One transaction; stops if a count
-- differs.
begin;

do $$
declare
  yaw constant uuid := '9803ee99-fee8-4c6a-abb4-1a830fcbb438';
  n int;
begin
  -- The four profile_gap tasks the mock listing produced (07:07:05 UTC).
  delete from public.tasks where location_id = yaw and kind = 'profile_gap' and created_at >= '2026-10-22 07:00:00+00';
  get diagnostics n = row_count; if n <> 4 then raise exception 'tasks: % not 4', n; end if;
  -- The three profile facts read from the mock listing (made-up hours, the mock address).
  delete from public.knowledge_facts where location_id = yaw and source = 'google' and slot like 'profile.%' and created_at >= '2026-10-22 07:00:00+00';
  get diagnostics n = row_count; if n <> 3 then raise exception 'knowledge_facts: % not 3', n; end if;
  -- The mock listing for the old mock id.
  delete from public.mock_listings where google_location_id = 'locations/mock-9803ee99';
  get diagnostics n = row_count; if n <> 1 then raise exception 'mock_listings: % not 1', n; end if;
end $$;

-- Read-back: 0, then the demo's 26 mock rows.
select 'non-demo mock rows' what, (select count(*) from public.mock_listings where google_location_id not like 'locations/demo-%') + (select count(*) from public.mock_google_reviews where google_location_id not like 'locations/demo-%') n
union all select 'demo mock rows (26)', (select count(*) from public.mock_listings) + (select count(*) from public.mock_google_reviews);

commit;
