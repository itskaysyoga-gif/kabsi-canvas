-- P0.5-01 part A: the photo engine in the database (K-23, K-78, K-136). Intake offers one process_photo job; the
-- job's result moves the photo once; a refused file and a kept video are due for removal; videos never publish;
-- COVER and LOGO publish through the one pipeline; the staff upload link works until it is turned off; the freshness
-- and category-gap tasks; the Profile Coach's counts by type.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

\ir _fixtures.psql

update public.locations set consent_at = now(), access_granted_at = now(), google_account_id = 'accounts/test',
  google_location_id = 'locations/mock-victim', status = 'active'
 where id = '00000000-0000-4000-8000-0000000000c1';
insert into storage.objects (bucket_id, name) values
  ('owner-photos', '00000000-0000-4000-8000-0000000000c1/up1.jpg'),
  ('owner-photos', '00000000-0000-4000-8000-0000000000c1/up2.jpg'),
  ('owner-photos', '00000000-0000-4000-8000-0000000000c1/up3.mp4'),
  ('owner-photos', '00000000-0000-4000-8000-0000000000c1/up4.jpg');

select ok(not has_function_privilege('authenticated', 'public.photo_processed(uuid,jsonb)', 'execute')
      and not has_function_privilege('authenticated', 'public.photo_upload(uuid,text,text,uuid,text)', 'execute')
      and not has_function_privilege('anon', 'public.photo_link_location(text)', 'execute')
      and not has_function_privilege('authenticated', 'private.photo_intake(uuid,text,text,uuid)', 'execute'),
  'the job and link functions are service role only');
select is((select file_size_limit from storage.buckets where id = 'owner-photos'), 20971520::bigint, 'the bucket takes 20 MB');

-- Intake from the app ---------------------------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-4000-8000-0000000000a1", "role": "authenticated"}';
create temp table ids (k text primary key, id uuid);
grant all on ids to authenticated;
insert into ids select 'p1', public.add_photo('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000c1/up1.jpg');
insert into ids select 'p2', public.add_photo('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000c1/up2.jpg');
insert into ids select 'p3', public.add_photo('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000c1/up3.mp4');
select throws_ok($$ select public.add_photo('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000c1/up1.jpg') $$,
  'P0001', 'already_added', 'the same file twice is one photo');
select throws_ok($$ select public.add_photo('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000c1/none.jpg') $$,
  'P0001', 'not_uploaded', 'a file that is not in the bucket is refused');
reset role;
set local request.jwt.claims = '';

select is((select state || ':' || source || ':' || original_path from public.photos where id = (select id from ids where k = 'p1')),
  'checking:app:00000000-0000-4000-8000-0000000000c1/up1.jpg', 'an upload waits for the job, original kept');
select is((select count(*)::int from public.jobs where kind = 'process_photo' and location_id = '00000000-0000-4000-8000-0000000000c1'), 3,
  'one process_photo job per upload');

-- The job's results -----------------------------------------------------------------------------------------------
select is(public.photo_processed((select id from ids where k = 'p1'), jsonb_build_object('outcome', 'refused',
  'reason', 'This is not a photo Kabsi can use. Send a JPG, PNG, WebP or HEIC photo.', 'bytes', 77)), 'refused', 'a renamed PDF is refused');
select ok((select file_due_at is not null and suitable = false from public.photos where id = (select id from ids where k = 'p1')),
  'a refused file is due for removal at once');
select is(public.photo_processed((select id from ids where k = 'p2'), jsonb_build_object('outcome', 'ready',
  'path', '00000000-0000-4000-8000-0000000000c1/' || (select id from ids where k = 'p2') || '.jpg', 'width', 1600, 'height', 1200,
  'bytes', 300000, 'brightness', 31.5, 'sharpness', 220, 'phash', '0f0f0f6d1a83c1e0', 'issues', jsonb_build_array('dark'),
  'flags', '[]'::jsonb, 'category', null, 'note', 'This photo is dark.')), 'draft', 'a processed photo is ready for the owner');
select is((select suitability_note || ':' || suitable::text || ':' || (storage_path like '%.jpg')::text || ':' || original_path
             from public.photos where id = (select id from ids where k = 'p2')),
  'This photo is dark.:false:true:00000000-0000-4000-8000-0000000000c1/up2.jpg', 'the note, the processed file and the original');
select is(public.photo_processed((select id from ids where k = 'p2'), '{"outcome": "refused", "reason": "x"}'), 'draft',
  'a second result changes nothing');
select throws_ok(format($$ select public.photo_processed(%L, '{"outcome": "ready", "path": "other-business/x.jpg"}') $$, (select id from ids where k = 'p3')),
  'P0001', 'bad_path', 'a processed file outside the business folder is refused');
select is(public.photo_processed((select id from ids where k = 'p3'), '{"outcome": "video", "bytes": 5000000}'), 'held', 'a video is kept');
select ok((select kind = 'video' and file_due_at > now() + interval '29 days' from public.photos where id = (select id from ids where k = 'p3')),
  'a video is kept 30 days');

-- Publishing ------------------------------------------------------------------------------------------------------
select throws_ok(format($$ select public.approve_publication('photo', %L, '{}'::jsonb, '00000000-0000-4000-8000-0000000000a1', 'dashboard') $$,
  (select id from ids where k = 'p3')), 'P0001', 'video_later', 'a video never publishes yet');
select is((public.approve_publication('photo', (select id from ids where k = 'p2'), '{"category": "COVER"}'::jsonb,
  '00000000-0000-4000-8000-0000000000a1', 'dashboard')) ->> 'created', 'true', 'the preferred cover photo goes through the pipeline');
select is((select payload from public.publications where target_type = 'photo' and target_id = (select id from ids where k = 'p2')),
  jsonb_build_object('storage_path', '00000000-0000-4000-8000-0000000000c1/' || (select id from ids where k = 'p2') || '.jpg', 'category', 'COVER'),
  'the publication sends the processed file');
select is((public.approve_publication('photo', (select id from ids where k = 'p2'), '{"category": "COVER"}'::jsonb,
  '00000000-0000-4000-8000-0000000000a1', 'dashboard')) ->> 'created', 'false', 'approving twice is one publication');

-- The staff upload link -------------------------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-4000-8000-0000000000a1", "role": "authenticated"}';
create temp table tok (n int primary key, t text);
grant all on tok to authenticated;
insert into tok select 1, public.photo_link_create('00000000-0000-4000-8000-0000000000c1') ->> 'token';
select is((public.photo_link_status('00000000-0000-4000-8000-0000000000c1')) ->> 'active', 'true', 'the link is on');
reset role;
set local request.jwt.claims = '';
select is((public.photo_link_location(encode(extensions.digest((select t from tok where n = 1), 'sha256'), 'hex'))) ->> 'name',
  'Victim Bakery', 'the link opens the business');
select isnt(public.photo_upload('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000c1/up4.jpg', 'staff_link', null,
  encode(extensions.digest((select t from tok where n = 1), 'sha256'), 'hex')), null, 'an upload through the link, no account');
select is((select uploads from public.photo_upload_links where revoked_at is null), 1, 'the link counts its uploads');
select is((select source from public.photos where original_path like '%up4.jpg'), 'staff_link', 'marked as a staff upload');
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-4000-8000-0000000000a1", "role": "authenticated"}';
insert into tok select 2, public.photo_link_create('00000000-0000-4000-8000-0000000000c1') ->> 'token';
select is(public.photo_link_revoke('00000000-0000-4000-8000-0000000000c1'), 1, 'turned off');
reset role;
set local request.jwt.claims = '';
select is(public.photo_link_location(encode(extensions.digest((select t from tok where n = 1), 'sha256'), 'hex')), null,
  'a new link turns the old one off');
select is(public.photo_link_location(encode(extensions.digest((select t from tok where n = 2), 'sha256'), 'hex')), null,
  'a turned-off link opens nothing');
insert into storage.objects (bucket_id, name) values ('owner-photos', '00000000-0000-4000-8000-0000000000c1/up5.jpg');
select throws_ok($$ select public.photo_upload('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000c1/up5.jpg', 'staff_link', null,
  encode(extensions.digest((select t from tok where n = 2), 'sha256'), 'hex')) $$, 'P0001', 'link_revoked', 'a turned-off link uploads nothing');

-- Freshness and category gaps, and the Coach's counts --------------------------------------------------------------
-- On the other business, which has no photos.
select ok('profile_gap:photos' = any (private.photo_gap_tasks('00000000-0000-4000-8000-0000000000c2')), 'no photos yet: one task to add some');
insert into public.photos (location_id, storage_path, state, category) values
  ('00000000-0000-4000-8000-0000000000c2', '00000000-0000-4000-8000-0000000000c2/posted.jpg', 'posted', 'EXTERIOR');
select is(private.photo_gap_tasks('00000000-0000-4000-8000-0000000000c2'), array['profile_gap:photos_types'], 'one photo of the outside: the gaps');
select is((select title from public.tasks where dedupe_key = 'profile_gap:photos_types' and state = 'open'),
  'Add a photo of the inside, your team, your work and what you sell', 'the gaps by name');
update public.photos set settled_at = now() - interval '31 days' where storage_path like '%posted.jpg';
select is(private.photo_gap_tasks('00000000-0000-4000-8000-0000000000c2'), array['profile_gap:photos_types', 'profile_gap:photos_fresh'],
  'the newest photo is 31 days old: add a new one');
select is(private.task_path('profile_gap', 'photos_fresh'), '/app/photos', 'the task opens the photo screen');
select is((select i -> 'detail' from jsonb_array_elements(private.coach_status('00000000-0000-4000-8000-0000000000c2')) i where i ->> 'id' = 'photos'),
  '{"exterior": 1, "interior": 0, "team": 0, "work": 0, "products": 0, "total": 1}'::jsonb, 'the Coach counts photos by type');

select * from finish();
rollback;
