-- Fix 2 part B (master plan 30.27 item 2): a post's approval is bound to its text and its photo (the photo's id and the
-- content hash of its stored file). On WhatsApp, a token made before either changed is refused ('changed', the existing
-- changed-draft answer); on the website, an approval that names another photo, or no photo at all, is refused
-- ('post_changed'). Cases: text changed, photo changed (another photo, or the same photo with another file), both
-- unchanged; and who may read a post's photo signature.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

\ir _fixtures.psql

update public.locations set consent_at = now(), access_granted_at = now(), google_account_id = 'accounts/test',
  google_location_id = 'locations/mock-victim', status = 'active'
 where id = '00000000-0000-4000-8000-0000000000c1';
insert into public.whatsapp_optins (user_id, phone, state, consent_text)
values ('00000000-0000-4000-8000-0000000000a1', '+12125550101', 'active', 'test');

-- Two checked photos, each with its file as sent (original_path) and its processed JPEG.
insert into storage.objects (bucket_id, name, metadata) values
  ('owner-photos', '00000000-0000-4000-8000-0000000000c1/f2a.orig', '{"eTag": "\"aaaa\"", "size": 10}'),
  ('owner-photos', '00000000-0000-4000-8000-0000000000c1/f2a.jpg', '{"eTag": "\"a1a1\"", "size": 9}'),
  ('owner-photos', '00000000-0000-4000-8000-0000000000c1/f2b.orig', '{"eTag": "\"bbbb\"", "size": 11}'),
  ('owner-photos', '00000000-0000-4000-8000-0000000000c1/f2b.jpg', '{"eTag": "\"b1b1\"", "size": 8}');
insert into public.photos (id, location_id, storage_path, original_path, source, uploaded_by, state, kind) values
  ('00000000-0000-4000-8000-0000000006a1', '00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000c1/f2a.jpg',
   '00000000-0000-4000-8000-0000000000c1/f2a.orig', 'app', '00000000-0000-4000-8000-0000000000a1', 'draft', 'photo'),
  ('00000000-0000-4000-8000-0000000006a2', '00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000c1/f2b.jpg',
   '00000000-0000-4000-8000-0000000000c1/f2b.orig', 'app', '00000000-0000-4000-8000-0000000000a1', 'draft', 'photo');

-- Six post drafts with photo a, one for each case (state 'draft', source 'owner', topic_type 'STANDARD').
insert into public.gbp_posts (id, location_id, owner_input, body, state, source, topic_type, photo_id)
select ('00000000-0000-4000-8000-0000000006b' || n)::uuid, '00000000-0000-4000-8000-0000000000c1', 'x',
       'Fresh bread every morning from seven.', 'draft', 'owner', 'STANDARD', '00000000-0000-4000-8000-0000000006a1'
  from generate_series(1, 6) n;

-- The signature names the photo and its file as sent.
select is(private.post_photo_sig('00000000-0000-4000-8000-0000000006a1'),
  '00000000-0000-4000-8000-0000000006a1:00000000-0000-4000-8000-0000000000c1/f2a.orig:"aaaa"', 'the photo id, its file and the file''s hash');
select is(private.post_photo_sig(null), null, 'no photo, no signature');

-- WhatsApp: tokens made while the drafts were shown.
create temp table tk (k text primary key, t text);
insert into tk select 'p' || n, public.whatsapp_action_create('00000000-0000-4000-8000-0000000000a1', 'local_post',
  ('00000000-0000-4000-8000-0000000006b' || n)::uuid) ->> 'token' from generate_series(1, 4) n;
select is((select count(*)::int from tk where t is not null), 4, 'four Approve buttons made');

-- Both unchanged: approved, with the photo it was shown for.
select is(public.whatsapp_approve((select t from tk where k = 'p1'), '+12125550101') ->> 'result', 'approved', 'unchanged: approved');
select is((select payload ->> 'photo_path' from public.publications where target_id = '00000000-0000-4000-8000-0000000006b1'),
  '00000000-0000-4000-8000-0000000000c1/f2a.jpg', 'the approved post carries its photo');
-- Pressing the same Approve again changes nothing (a replayed button).
select is(public.whatsapp_approve((select t from tk where k = 'p1'), '+12125550101') ->> 'repeat', 'true', 'a replayed Approve is the same yes');
select is((select count(*)::int from public.publications where target_id = '00000000-0000-4000-8000-0000000006b1'), 1, 'one publication');

-- Text changed after the draft was shown: refused.
update public.gbp_posts set body = 'Fresh bread every morning from eight.' where id = '00000000-0000-4000-8000-0000000006b2';
select is(public.whatsapp_approve((select t from tk where k = 'p2'), '+12125550101') ->> 'reason', 'changed', 'text changed: refused');

-- Photo changed after the draft was shown: another photo, refused.
update public.gbp_posts set photo_id = '00000000-0000-4000-8000-0000000006a2' where id = '00000000-0000-4000-8000-0000000006b3';
select is(public.whatsapp_approve((select t from tk where k = 'p3'), '+12125550101') ->> 'reason', 'changed', 'photo changed: refused');

-- The same photo with another stored file: refused.
update storage.objects set metadata = '{"eTag": "\"cccc\"", "size": 10}'
 where bucket_id = 'owner-photos' and name = '00000000-0000-4000-8000-0000000000c1/f2a.orig';
select is(public.whatsapp_approve((select t from tk where k = 'p4'), '+12125550101') ->> 'reason', 'changed', 'photo file changed: refused');
select is((select count(*)::int from public.publications where target_id in ('00000000-0000-4000-8000-0000000006b2',
  '00000000-0000-4000-8000-0000000006b3', '00000000-0000-4000-8000-0000000006b4')), 0, 'nothing approved for the changed drafts');

-- The website: the page sends the photo it showed (read with the post as photo_sig).
create temp table seen as select id, photo_id, public.photo_sig(g) as sig from public.gbp_posts g
 where id in ('00000000-0000-4000-8000-0000000006b5', '00000000-0000-4000-8000-0000000006b6');
select throws_ok($$ select public.approve_publication('local_post', '00000000-0000-4000-8000-0000000006b5',
  '{"summary": "Fresh bread every morning from seven."}'::jsonb, '00000000-0000-4000-8000-0000000000a1', 'dashboard') $$,
  'P0001', 'post_changed', 'an approval that names no photo is refused');
select throws_ok($$ select public.approve_publication('local_post', '00000000-0000-4000-8000-0000000006b5',
  jsonb_build_object('summary', 'Fresh bread every morning from seven.', 'photo_id', '00000000-0000-4000-8000-0000000006a2',
    'photo_sig', private.post_photo_sig('00000000-0000-4000-8000-0000000006a2')),
  '00000000-0000-4000-8000-0000000000a1', 'dashboard') $$, 'P0001', 'post_changed', 'website: another photo is refused');
update storage.objects set metadata = '{"eTag": "\"dddd\"", "size": 10}'
 where bucket_id = 'owner-photos' and name = '00000000-0000-4000-8000-0000000000c1/f2a.orig';
select throws_ok($$ select public.approve_publication('local_post', s.id, jsonb_build_object('summary', 'Fresh bread every morning from seven.',
    'photo_id', s.photo_id, 'photo_sig', s.sig), '00000000-0000-4000-8000-0000000000a1', 'dashboard')
  from seen s where s.id = '00000000-0000-4000-8000-0000000006b5' $$, 'P0001', 'post_changed', 'website: the photo''s file changed, refused');
select is((select count(*)::int from public.publications where target_id = '00000000-0000-4000-8000-0000000006b5'), 0, 'nothing approved');
-- Unchanged since the page read it: approved.
select is((select (public.approve_publication('local_post', g.id, jsonb_build_object('summary', g.body, 'photo_id', g.photo_id,
    'photo_sig', public.photo_sig(g)), '00000000-0000-4000-8000-0000000000a1', 'dashboard') ->> 'created')::boolean
  from public.gbp_posts g where g.id = '00000000-0000-4000-8000-0000000006b6'), true, 'website: unchanged, approved');

-- Who may read a post's photo signature: members of its business, never a stranger or anon.
create temp table rowcopy as select g as r from public.gbp_posts g where g.id = '00000000-0000-4000-8000-0000000006b6';
grant select on rowcopy to authenticated;
select tests.act_as('00000000-0000-4000-8000-0000000000b1');
select is((select public.photo_sig(c.r) from rowcopy c), null, 'a stranger reads no signature, even with the post''s row');
reset role;
select tests.act_as('00000000-0000-4000-8000-0000000000a1');
select isnt((select public.photo_sig(c.r) from rowcopy c), null, 'the owner reads it');
reset role;
select ok(not has_function_privilege('anon', 'public.photo_sig(public.gbp_posts)', 'execute'), 'anon cannot read signatures');
select ok(not has_function_privilege('authenticated', 'private.post_photo_sig(uuid)', 'execute'), 'the private function is closed');

select * from finish();
rollback;
