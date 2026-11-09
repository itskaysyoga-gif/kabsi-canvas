-- RB-E step 7, changed by RB-F (R-139, R-141, R-142): three fictional test businesses for the request book on Rashid's phone.
-- Additive only.
--
--   Kabsi Test Salon, Kabsi Test Gym and Kabsi Test Garage: no Google connection (no Google ids, no place id), packs salon,
--   gym and garage in state 'test', and app_settings.request_book 'on'. The request book's gate (private.rb_gate) needs both,
--   so every other business stays off.
--
-- Kept out of every job the same way the demo businesses are: is_demo on the location and on its organization, and status
-- 'onboarding' with no consent, so no Google sync, access check, weekly report, lifecycle email, trial, care post, nudge,
-- map, AI visibility run, partner attribution or product event touches them (the RB-E audit of every cron and job is in
-- docs/progress/archive/2026-11-09-rb-e.md). The one path that would have offered them a map search on connecting
-- (firstMap in whatsapp/db.ts) skips is_demo.
--
-- The test owner (R-141, for the RB-E and RB-F demo only): Rashid's existing verified user, selected here as the single
-- owner in location_members of the Yawmiyati location. The migration stops if there is not exactly one. No login is created,
-- and no phone number, email or user id is written in this file. His phone gets the three new businesses through the
-- existing membership trigger (private.whatsapp_membership_sync), the same way any new membership of a bound person does.
-- Customers are added only on the phone, fictional, with phones in 555-01xx (the database refuses any other while a pack
-- is in test).
--
-- Rollback without dropping anything: app_settings.request_book 'off', or a location's location_packs.state 'off'.
-- After Gate 2 the packs go to 'off' and these three memberships are removed (R-141).

do $$
declare v_owner uuid; v_n integer;
begin
  select count(*), min(m.user_id::text)::uuid into v_n, v_owner
    from public.location_members m join public.locations l on l.id = m.location_id
   where l.name = 'Yawmiyati' and l.is_demo = false and m.role = 'owner';
  if v_n <> 1 then
    raise exception 'rb_test_owner: expected exactly one owner of Yawmiyati, found %', v_n;
  end if;

  insert into public.organizations (id, name, type, is_demo)
  values ('e5e00000-0000-4000-8000-000000000010', 'Kabsi request book tests', 'owner', true)
  on conflict (id) do nothing;

  insert into public.locations (id, organization_id, name, country, time_zone, status, is_demo, signup_source, created_by)
  values
    ('e5e00000-0000-4000-8000-000000000001', 'e5e00000-0000-4000-8000-000000000010', 'Kabsi Test Salon', 'AE', 'Asia/Dubai', 'onboarding', true, 'staff', v_owner),
    ('e5e00000-0000-4000-8000-000000000002', 'e5e00000-0000-4000-8000-000000000010', 'Kabsi Test Gym', 'AE', 'Asia/Dubai', 'onboarding', true, 'staff', v_owner),
    ('e5e00000-0000-4000-8000-000000000003', 'e5e00000-0000-4000-8000-000000000010', 'Kabsi Test Garage', 'AE', 'Asia/Dubai', 'onboarding', true, 'staff', v_owner)
  on conflict (id) do nothing;

  insert into public.location_members (location_id, user_id, role)
  values
    ('e5e00000-0000-4000-8000-000000000001', v_owner, 'owner'),
    ('e5e00000-0000-4000-8000-000000000002', v_owner, 'owner'),
    ('e5e00000-0000-4000-8000-000000000003', v_owner, 'owner')
  on conflict do nothing;
end $$;

insert into public.location_packs (location_id, pack, pack_version, state)
values
  ('e5e00000-0000-4000-8000-000000000001', 'salon', 1, 'test'),
  ('e5e00000-0000-4000-8000-000000000002', 'gym', 1, 'test'),
  ('e5e00000-0000-4000-8000-000000000003', 'garage', 1, 'test')
on conflict (location_id) do nothing;

insert into public.app_settings (key, value) values ('request_book', 'on')
on conflict (key) do update set value = 'on', updated_at = now();

-- Read-back after applying (select only):
--   select l.name, l.status, l.is_demo, o.is_demo as org_demo, l.google_location_id, p.pack, p.state, p.real_data_allowed
--     from public.locations l join public.organizations o on o.id = l.organization_id
--     join public.location_packs p on p.location_id = l.id where l.id::text like 'e5e00000-%' order by l.name;
--   expect 3 rows: onboarding, true, true, null, garage/gym/salon, test, false.
--   select value from public.app_settings where key = 'request_book';   expect: on
--   three owner memberships for the Yawmiyati owner, created_by the same user, and Yawmiyati unchanged.
