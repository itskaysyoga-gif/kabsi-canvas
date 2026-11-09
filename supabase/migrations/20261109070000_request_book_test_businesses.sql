-- RB-E step 7 (R-139, Gate 1): three fictional test businesses for the request book on the real test phone.
-- NOT APPLIED until Rashid says in the RB-E chat (or a later session's) that the test phone is ready. Additive only.
--
--   Kabsi Test Salon, Kabsi Test Gym and Kabsi Test Garage: no Google connection (no Google ids, no place id), packs salon,
--   gym and garage in state 'test', and app_settings.request_book 'on'. The request book's gate (private.rb_gate) needs both,
--   so every other business stays off.
--
-- Kept out of every job the same way the demo businesses are: is_demo on the location and on its organization, and status
-- 'onboarding' with no consent, so no Google sync, access check, weekly report, lifecycle email, trial, care post, nudge,
-- map, AI visibility run, partner attribution or product event touches them (the RB-E audit of every cron and job is in
-- docs/progress/archive/2026-11-09-rb-e.md). The one path that would have offered them a map search on connecting
-- (firstMap in whatsapp/db.ts) now skips is_demo.
--
-- The test owner is a fictional login (rb-test-owner@test.local) with no other business, so the test phone gets no Kabsi
-- role but these three. It joins through the normal bind code: the owner signs in, takes the WhatsApp code, and Rashid
-- sends it from the test phone. The phone number is never written here. Customers are added only on the phone, fictional,
-- with phones in 555-01xx (the database refuses any other while a pack is in test).
--
-- Rollback without dropping anything: app_settings.request_book 'off', or a location's location_packs.state 'off'.

insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  is_anonymous, confirmation_token, recovery_token, email_change, email_change_token_new, email_change_token_current, phone_change,
  phone_change_token, reauthentication_token)
values ('e5e00000-0000-4000-8000-0000000000a0', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
  'rb-test-owner@test.local', now(), '{"provider":"email","providers":["email"]}', '{"qa":"rb-e"}', now(), now(), false,
  '', '', '', '', '', '', '', '')
on conflict (id) do nothing;

-- A new login emits a sign-up event (users_product_event). This one is a test login, not a person signing up: the event,
-- and the ad conversion job it may queue where events are on, are removed in the same transaction, before anything sends.
with e as (
  delete from public.product_events where source_key = 'user:e5e00000-0000-4000-8000-0000000000a0:registration' returning id
)
delete from public.jobs j using e where j.kind = 'meta_capi' and j.dedupe_key = 'meta_capi:' || e.id;

insert into public.organizations (id, name, type, is_demo)
values ('e5e00000-0000-4000-8000-000000000010', 'Kabsi request book tests', 'owner', true)
on conflict (id) do nothing;

insert into public.locations (id, organization_id, name, country, time_zone, status, is_demo, signup_source, created_by)
values
  ('e5e00000-0000-4000-8000-000000000001', 'e5e00000-0000-4000-8000-000000000010', 'Kabsi Test Salon', 'AE', 'Asia/Dubai', 'onboarding', true, 'staff', 'e5e00000-0000-4000-8000-0000000000a0'),
  ('e5e00000-0000-4000-8000-000000000002', 'e5e00000-0000-4000-8000-000000000010', 'Kabsi Test Gym', 'AE', 'Asia/Dubai', 'onboarding', true, 'staff', 'e5e00000-0000-4000-8000-0000000000a0'),
  ('e5e00000-0000-4000-8000-000000000003', 'e5e00000-0000-4000-8000-000000000010', 'Kabsi Test Garage', 'AE', 'Asia/Dubai', 'onboarding', true, 'staff', 'e5e00000-0000-4000-8000-0000000000a0')
on conflict (id) do nothing;

insert into public.location_members (location_id, user_id, role)
values
  ('e5e00000-0000-4000-8000-000000000001', 'e5e00000-0000-4000-8000-0000000000a0', 'owner'),
  ('e5e00000-0000-4000-8000-000000000002', 'e5e00000-0000-4000-8000-0000000000a0', 'owner'),
  ('e5e00000-0000-4000-8000-000000000003', 'e5e00000-0000-4000-8000-0000000000a0', 'owner')
on conflict do nothing;

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
