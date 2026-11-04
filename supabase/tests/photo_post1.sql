-- Photo Post 1 (master plan 30.23 item 2): a photo sent on WhatsApp with words becomes a post draft with that photo, for
-- the owner's yes. The draft, the people asked, staff never asked to approve, a stranger refused, the house style, the plan's
-- posts, Skip under the post, the owner's own choice for a held photo, and the tick never offering a held photo on its own.
-- Every value the code writes (gbp_posts state 'draft' and 'skipped', source 'owner', topic_type 'STANDARD'; photos state
-- 'skipped') goes through the existing check constraints here.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

\ir _fixtures.psql

update public.locations set consent_at = now(), access_granted_at = now(), google_account_id = 'accounts/test',
  google_location_id = 'locations/mock-victim', status = 'active'
 where id = '00000000-0000-4000-8000-0000000000c1';
insert into public.location_members (location_id, user_id, role)
values ('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000a3', 'staff');
insert into public.whatsapp_optins (user_id, phone, state, consent_text)
values ('00000000-0000-4000-8000-0000000000a1', '+12125550101', 'active', 'test'),
       ('00000000-0000-4000-8000-0000000000a3', '+12125550105', 'active', 'test');

insert into public.photos (id, location_id, storage_path, source, uploaded_by, state, kind) values
  ('00000000-0000-4000-8000-0000000005a1', '00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000c1/pp1.jpg', 'whatsapp', '00000000-0000-4000-8000-0000000000a1', 'checking', 'photo'),
  ('00000000-0000-4000-8000-0000000005a2', '00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000c1/pp2.jpg', 'whatsapp', '00000000-0000-4000-8000-0000000000a3', 'checking', 'photo'),
  ('00000000-0000-4000-8000-0000000005a3', '00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000c1/pp3.jpg', 'whatsapp', '00000000-0000-4000-8000-0000000000a1', 'checking', 'photo'),
  ('00000000-0000-4000-8000-0000000005a4', '00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000c1/pp4.jpg', 'whatsapp', '00000000-0000-4000-8000-0000000000a1', 'checking', 'photo');

-- Hold: only the sender.
select is(public.whatsapp_photo_hold('00000000-0000-4000-8000-0000000005a1', '00000000-0000-4000-8000-0000000000b1'), false, 'a stranger cannot hold a photo');
select is(public.whatsapp_photo_hold('00000000-0000-4000-8000-0000000005a1', '00000000-0000-4000-8000-0000000000a1'), true, 'the sender holds it');
select is((select post_hold from public.photos where id = '00000000-0000-4000-8000-0000000005a1'), true, 'held');

-- The owner's photo post: a draft with the photo, the owner asked.
create temp table pp as select public.whatsapp_photo_post_prepare('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000a1',
  '00000000-0000-4000-8000-0000000005a1', 'Late appointments every Thursday this month', 'Late appointments every Thursday this month') as r;
select is((select (r ->> 'ok')::boolean from pp), true, 'the owner''s photo post is prepared');
select is((select (r ->> 'self')::boolean from pp), true, 'the owner may approve it');
select is((select state || ':' || source || ':' || topic_type || ':' || photo_id::text from public.gbp_posts where id = (select (r ->> 'post_id')::uuid from pp)),
  'draft:owner:STANDARD:00000000-0000-4000-8000-0000000005a1', 'a draft Update with that photo');

-- Staff: the draft is for the owner's yes; staff are never asked.
create temp table ps as select public.whatsapp_photo_post_prepare('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000a3',
  '00000000-0000-4000-8000-0000000005a2', 'New autumn menu', 'Our new autumn menu starts on Monday.') as r;
select is((select (r ->> 'self')::boolean from ps), false, 'staff may not approve');
select is((select r -> 'to' from ps), '[{"phone": "+12125550101", "user_id": "00000000-0000-4000-8000-0000000000a1"}]'::jsonb, 'the owner is asked, not staff');

-- Refusals.
select is(public.whatsapp_photo_post_prepare('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000b1',
  '00000000-0000-4000-8000-0000000005a3', 'x', 'A stranger post text.') ->> 'reason', 'not_member', 'a stranger is refused');
select is(public.whatsapp_photo_post_prepare('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000a3',
  '00000000-0000-4000-8000-0000000005a3', 'x', 'Someone else''s photo here.') ->> 'reason', 'photo_not_usable', 'only the sender''s own photo');
select is(public.whatsapp_photo_post_prepare('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000a1',
  '00000000-0000-4000-8000-0000000005a3', 'x', 'Big news today!') ->> 'reason', 'house_style', 'house style checked again');
select is(public.whatsapp_photo_post_prepare('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000a1',
  '00000000-0000-4000-8000-0000000005a3', 'x', 'Hi') ->> 'reason', 'bad_post_text', 'too short');

-- Skip under the post: the post and its held photo are skipped; a second Skip changes nothing.
create temp table tk as select public.whatsapp_action_create('00000000-0000-4000-8000-0000000000a1', 'local_post', (select (r ->> 'post_id')::uuid from pp)) ->> 'token' as t;
select is(public.whatsapp_post_skip((select t from tk), '+12125550199') ->> 'result', 'unknown', 'another phone cannot skip');
select is(public.whatsapp_post_skip((select t from tk), '+12125550101') ->> 'result', 'skipped', 'Skip');
select is((select state from public.gbp_posts where id = (select (r ->> 'post_id')::uuid from pp)), 'skipped', 'the post is skipped');
select is((select state from public.photos where id = '00000000-0000-4000-8000-0000000005a1'), 'skipped', 'its photo is skipped');
select is(public.whatsapp_post_skip((select t from tk), '+12125550101') ->> 'result', 'already', 'a second Skip changes nothing');

-- A held photo: Add as a photo (the plain photo way) skips its waiting post; Skip skips the photo.
select public.whatsapp_photo_hold('00000000-0000-4000-8000-0000000005a3', '00000000-0000-4000-8000-0000000000a1');
select is(public.whatsapp_held_photo('+12125550199', '00000000-0000-4000-8000-0000000005a3', 'photo') ->> 'result', 'unknown', 'a phone with no opt-in');
select is(public.whatsapp_held_photo('+12125550101', '00000000-0000-4000-8000-0000000005a3', 'photo') ->> 'result', 'photo', 'Add as a photo');
select is((select post_hold from public.photos where id = '00000000-0000-4000-8000-0000000005a3'), false, 'no longer held');
select is(public.whatsapp_held_photo('+12125550101', '00000000-0000-4000-8000-0000000005a3', 'skip') ->> 'result', 'already', 'not held any more');
select is(public.whatsapp_held_photo('+12125550101', '00000000-0000-4000-8000-0000000005a2', 'skip') ->> 'result', 'skipped', 'the owner skips staff''s held photo');
select is((select state from public.gbp_posts where id = (select (r ->> 'post_id')::uuid from ps)), 'skipped', 'and the post waiting with it');

-- The tick: a held, checked photo is never offered as a plain photo; a held photo the engine refused goes back to its sender
-- and the post waiting with it is skipped.
select public.whatsapp_photo_hold('00000000-0000-4000-8000-0000000005a4', '00000000-0000-4000-8000-0000000000a1');
update public.photos set state = 'draft', processed_at = now() where id = '00000000-0000-4000-8000-0000000005a4';
select ok(not exists (select 1 from jsonb_array_elements(public.whatsapp_photos_due(50)) e where e ->> 'photo_id' = '00000000-0000-4000-8000-0000000005a4'),
  'a held photo is not offered on its own');
select is((select wa_asked_at from public.photos where id = '00000000-0000-4000-8000-0000000005a4'), null, 'nor claimed');
create temp table pr as select public.whatsapp_photo_post_prepare('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000a1',
  '00000000-0000-4000-8000-0000000005a4', 'Fresh bread', 'Fresh bread from the oven every morning.') as r;
update public.photos set state = 'refused', processed_at = now() where id = '00000000-0000-4000-8000-0000000005a4';
select ok(exists (select 1 from jsonb_array_elements(public.whatsapp_photos_due(50)) e where e ->> 'photo_id' = '00000000-0000-4000-8000-0000000005a4'),
  'a refused held photo is told to its sender');
select is((select state from public.gbp_posts where id = (select (r ->> 'post_id')::uuid from pr)), 'skipped', 'and its post is skipped');

-- The plan's posts: once none is left, no post is made.
insert into public.photos (id, location_id, storage_path, source, uploaded_by, state, kind) values
  ('00000000-0000-4000-8000-0000000005a5', '00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000c1/pp5.jpg', 'whatsapp', '00000000-0000-4000-8000-0000000000a1', 'checking', 'photo');
do $$
begin
  for i in 1..12 loop
    exit when coalesce(private.photo_posts_left('00000000-0000-4000-8000-0000000000c1'), 0) = 0;
    insert into public.gbp_posts (location_id, owner_input, body, state) values ('00000000-0000-4000-8000-0000000000c1', 'x', 'Posted earlier this month.', 'posted');
  end loop;
end $$;
select ok(private.photo_posts_left('00000000-0000-4000-8000-0000000000c1') is null
  or public.whatsapp_photo_post_prepare('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000a1',
       '00000000-0000-4000-8000-0000000005a5', 'x', 'One more post this month.') ->> 'reason' = 'posts_used_up',
  'no posts left: no post is made');

select ok(not has_function_privilege('authenticated', 'public.whatsapp_photo_post_prepare(uuid, uuid, uuid, text, text)', 'execute'), 'service only');
select ok(not has_function_privilege('authenticated', 'public.whatsapp_post_skip(text, text)', 'execute'), 'service only');
select ok(not has_function_privilege('authenticated', 'public.whatsapp_held_photo(text, uuid, text)', 'execute'), 'service only');
select ok(not has_function_privilege('anon', 'public.whatsapp_photo_hold(uuid, uuid)', 'execute'), 'service only');

select * from finish();
rollback;
