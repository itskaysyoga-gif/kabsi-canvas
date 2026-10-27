-- Sec 1 (master plan 30.15 section 8): Storage tenant isolation. Every bucket is checked: owner-photos is private and
-- folder-per-business, whatsapp-voice is service role only, site is public and written by the service role only.
-- Personas: owner of A, staff of A, owner of B (the outsider for A), a signed-in user with no business, anon, Kabsi staff.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
select '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email, now(), '{}', '{}', now(), now()
from (values ('5ec10000-0000-4000-8000-0000000000a1'::uuid, 'sec1-owner-a@example.test'),
             ('5ec10000-0000-4000-8000-0000000000a2'::uuid, 'sec1-staff-a@example.test'),
             ('5ec10000-0000-4000-8000-0000000000b1'::uuid, 'sec1-owner-b@example.test'),
             ('5ec10000-0000-4000-8000-0000000000c1'::uuid, 'sec1-nobody@example.test'),
             ('5ec10000-0000-4000-8000-0000000000d1'::uuid, 'sec1-kabsi-staff@example.test')) as u(id, email);
insert into public.locations (id, name, place_id) values
  ('5ec10000-0000-4000-8000-00000000a000', 'Sec1 A', 'sec1-place-a'),
  ('5ec10000-0000-4000-8000-00000000b000', 'Sec1 B', 'sec1-place-b');
insert into public.location_members (location_id, user_id, role) values
  ('5ec10000-0000-4000-8000-00000000a000', '5ec10000-0000-4000-8000-0000000000a1', 'owner'),
  ('5ec10000-0000-4000-8000-00000000a000', '5ec10000-0000-4000-8000-0000000000a2', 'staff'),
  ('5ec10000-0000-4000-8000-00000000b000', '5ec10000-0000-4000-8000-0000000000b1', 'owner');
insert into public.staff (user_id, name) values ('5ec10000-0000-4000-8000-0000000000d1', 'Sec1 Staff');

-- Objects already in both businesses' folders (written as the service role, as the functions do).
insert into storage.objects (bucket_id, name) values
  ('owner-photos', '5ec10000-0000-4000-8000-00000000a000/a.jpg'),
  ('owner-photos', '5ec10000-0000-4000-8000-00000000b000/b.jpg'),
  ('whatsapp-voice', '5ec10000-0000-4000-8000-00000000a000/v.ogg');

-- the buckets
select is((select public from storage.buckets where id = 'owner-photos'), false, 'owner-photos is private');
select is((select public from storage.buckets where id = 'whatsapp-voice'), false, 'whatsapp-voice is private');
select is((select public from storage.buckets where id = 'site'), true, 'site is public (marketing photos only)');
select is(
  (select coalesce(array_agg(policyname::text order by policyname), '{}') from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and cmd in ('UPDATE', 'DELETE', 'ALL')
      and (qual ilike '%owner-photos%' or qual ilike '%whatsapp-voice%' or qual ilike '%''site''%')),
  '{}'::text[], 'no browser policy updates or deletes an object in a Kabsi bucket');
select is(
  (select coalesce(array_agg(policyname::text order by policyname), '{}') from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and (coalesce(qual, '') ilike '%whatsapp-voice%' or coalesce(with_check, '') ilike '%whatsapp-voice%' or coalesce(with_check, '') ilike '%''site''%')),
  '{}'::text[], 'no browser policy reads whatsapp-voice or writes the site bucket');

-- owner of B (the outsider for A)
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "5ec10000-0000-4000-8000-0000000000b1", "role": "authenticated"}', true);
select is((select count(*)::int from storage.objects where bucket_id = 'owner-photos' and name like '5ec10000-0000-4000-8000-00000000a000/%'),
  0, 'the owner of B sees no object under A''s folder');
select is((select count(*)::int from storage.objects where bucket_id = 'owner-photos' and name like '5ec10000-0000-4000-8000-00000000b000/%'),
  1, 'and sees B''s own');
select throws_ok($$insert into storage.objects (bucket_id, name) values ('owner-photos', '5ec10000-0000-4000-8000-00000000a000/planted.jpg')$$,
  '42501', null, 'the owner of B cannot upload under A''s folder');
select throws_ok($$insert into storage.objects (bucket_id, name) values ('owner-photos', 'not-a-uuid/x.jpg')$$,
  null, null, 'a folder that is not a business id is refused');
select is((select count(*)::int from storage.objects where bucket_id = 'whatsapp-voice'), 0, 'no voice note is readable by a business owner');
select throws_ok($$select public.add_photo('5ec10000-0000-4000-8000-00000000a000', '5ec10000-0000-4000-8000-00000000a000/a.jpg')$$,
  '42501', null, 'the owner of B cannot register A''s object as a photo');
select throws_ok($$select public.add_photo('5ec10000-0000-4000-8000-00000000b000', '5ec10000-0000-4000-8000-00000000a000/a.jpg')$$,
  'P0001', 'bad_path', 'nor register A''s object under B');
-- Nothing changed, read back as B: update and delete reach no row (no policy), so A's object is untouched.
update storage.objects set name = '5ec10000-0000-4000-8000-00000000b000/stolen.jpg' where name = '5ec10000-0000-4000-8000-00000000a000/a.jpg';
select throws_ok($$delete from storage.objects where name = '5ec10000-0000-4000-8000-00000000a000/a.jpg'$$, null, null,
  'a direct delete of A''s object fails for the owner of B');
reset role;
select is((select count(*)::int from storage.objects where name = '5ec10000-0000-4000-8000-00000000a000/a.jpg'), 1, 'A''s object survives B''s update and delete');

-- staff of A (K-16: staff add photos)
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "5ec10000-0000-4000-8000-0000000000a2", "role": "authenticated"}', true);
select is((select count(*)::int from storage.objects where bucket_id = 'owner-photos'), 1, 'staff of A see A''s object only');
select lives_ok($$insert into storage.objects (bucket_id, name) values ('owner-photos', '5ec10000-0000-4000-8000-00000000a000/staff.jpg')$$,
  'staff of A may upload under A');
select throws_ok($$insert into storage.objects (bucket_id, name) values ('owner-photos', '5ec10000-0000-4000-8000-00000000b000/staff.jpg')$$,
  '42501', null, 'staff of A cannot upload under B');
reset role;

-- a signed-in person with no business, and anon
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "5ec10000-0000-4000-8000-0000000000c1", "role": "authenticated"}', true);
select is((select count(*)::int from storage.objects where bucket_id in ('owner-photos', 'whatsapp-voice')), 0, 'a person with no business sees nothing');
select throws_ok($$insert into storage.objects (bucket_id, name) values ('owner-photos', '5ec10000-0000-4000-8000-00000000a000/x.jpg')$$,
  '42501', null, 'and uploads nothing');
reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role": "anon"}', true);
select is((select count(*)::int from storage.objects where bucket_id in ('owner-photos', 'whatsapp-voice')), 0, 'anon sees no private object');
select throws_ok($$insert into storage.objects (bucket_id, name) values ('owner-photos', '5ec10000-0000-4000-8000-00000000a000/x.jpg')$$,
  '42501', null, 'anon uploads nothing');
reset role;

-- Kabsi staff read owner-photos (support), never whatsapp-voice
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "5ec10000-0000-4000-8000-0000000000d1", "role": "authenticated"}', true);
select is((select count(*)::int from storage.objects where bucket_id = 'owner-photos'), 3, 'Kabsi staff read every business photo');
select is((select count(*)::int from storage.objects where bucket_id = 'whatsapp-voice'), 0, 'but no voice note');
reset role;

select * from finish();
rollback;
