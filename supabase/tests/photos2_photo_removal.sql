-- Photos 2: removing a photo Kabsi put on Google goes through the one publication pipeline (K-38, guardrail 6): the
-- approval of the owner, or of a manager the owner lets approve photos, on the dashboard only; the 10 second undo; one
-- claim; and the photo is removed only once Google no longer has it. Only the media name of Kabsi's own upload, under
-- this business, is ever in the payload. The DELETE itself is tested in supabase/functions/_shared/google.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

\ir _fixtures.psql

update public.locations set consent_at = now(), access_granted_at = now(), google_account_id = 'accounts/test',
  google_location_id = 'locations/mock-victim', status = 'active'
 where id = '00000000-0000-4000-8000-0000000000c1';
insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-0000000000b4', 'authenticated', 'authenticated',
        'photos2-manager@example.test', now(), '{}', '{}', now(), now());
insert into public.location_members (location_id, user_id, role)
values ('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000b4', 'manager');
delete from public.approval_policies where location_id = '00000000-0000-4000-8000-0000000000c1' and kind = 'photo';

-- 601: on Google (a verified upload with the name Google gave it). 602: a draft never sent. 603: on Google under the
-- name of another business's location (never Kabsi's upload for this business).
insert into public.photos (id, location_id, storage_path, state, category)
values ('00000000-0000-4000-8000-000000000601', '00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000c1/601.jpg', 'posted', 'ADDITIONAL'),
       ('00000000-0000-4000-8000-000000000602', '00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000c1/602.jpg', 'draft', null),
       ('00000000-0000-4000-8000-000000000603', '00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000c1/603.jpg', 'posted', 'ADDITIONAL');
insert into public.publications (location_id, target_type, target_id, payload, approved_by, channel, state, route,
  idempotency_key, publish_after, google_ref)
values ('00000000-0000-4000-8000-0000000000c1', 'photo', '00000000-0000-4000-8000-000000000601',
  '{"category": "ADDITIONAL"}', '00000000-0000-4000-8000-0000000000a1', 'dashboard', 'verified', 'api',
  'photo:00000000-0000-4000-8000-000000000601:1', now() - interval '1 hour', 'accounts/test/locations/mock-victim/media/AF1'),
       ('00000000-0000-4000-8000-0000000000c1', 'photo', '00000000-0000-4000-8000-000000000603',
  '{"category": "ADDITIONAL"}', '00000000-0000-4000-8000-0000000000a1', 'dashboard', 'verified', 'api',
  'photo:00000000-0000-4000-8000-000000000603:1', now() - interval '1 hour', 'accounts/test/locations/someone-else/media/AF3');

create function pg_temp.remove(p_photo text, p_user text default '00000000-0000-4000-8000-0000000000a1',
  p_channel text default 'dashboard') returns jsonb language sql as $$
  select public.approve_publication('photo_removal', p_photo::uuid, '{"media_ref": "accounts/x/locations/y/media/z"}'::jsonb, p_user::uuid, p_channel)
$$;
create function pg_temp.photo_state(p_photo text) returns text language sql as $$
  select state from public.photos where id = p_photo::uuid
$$;

-- Every new value of the two widened check constraints is accepted.
select lives_ok($$ update public.photos set state = 'removing' where id = '00000000-0000-4000-8000-000000000602' $$, 'photos accept removing');
select lives_ok($$ update public.photos set state = 'removed' where id = '00000000-0000-4000-8000-000000000602' $$, 'photos accept removed');
select lives_ok($$ update public.photos set state = 'draft', thumb_path = '00000000-0000-4000-8000-0000000000c1/602_s.jpg'
  where id = '00000000-0000-4000-8000-000000000602' $$, 'photos take a small copy path');
select lives_ok($$ insert into public.publications (location_id, target_type, target_id, payload, approved_by, channel, state, route, idempotency_key, publish_after)
  values ('00000000-0000-4000-8000-0000000000c1', 'photo_removal', '00000000-0000-4000-8000-000000000602', '{}', '00000000-0000-4000-8000-0000000000a1',
  'dashboard', 'cancelled', 'api', 'photo_removal:check', now()) $$, 'publications accept photo_removal');
select is(private.approval_kind('photo_removal'), 'photo', 'a photo removal is approved like a photo');
select is(private.publication_noun('photo_removal'), 'photo removal', 'and named as a photo removal');

-- Refused: never on Google, another business's media name, another channel, a stranger, a manager not allowed.
select throws_ok($$ select pg_temp.remove('00000000-0000-4000-8000-000000000602') $$, 'photo_not_on_google',
  'a photo that never reached Google cannot be removed');
select throws_ok($$ select pg_temp.remove('00000000-0000-4000-8000-000000000603') $$, 'photo_not_on_google',
  'a media name under another location is never sent');
select throws_ok($$ select pg_temp.remove('00000000-0000-4000-8000-000000000601', p_channel => 'whatsapp') $$, 'not_on_whatsapp',
  'WhatsApp never approves a photo removal');
select throws_ok($$ select pg_temp.remove('00000000-0000-4000-8000-000000000601', p_channel => 'email_link') $$, 'not_on_this_channel',
  'an email link never approves a photo removal');
select throws_ok($$ select pg_temp.remove('00000000-0000-4000-8000-000000000601', '00000000-0000-4000-8000-0000000000b1') $$, 'approver_not_member',
  'someone outside the business cannot remove its photo');
select throws_ok($$ select pg_temp.remove('00000000-0000-4000-8000-000000000601', '00000000-0000-4000-8000-0000000000b4') $$, '42501', 'not_allowed_to_approve',
  'a manager the owner has not let approve photos cannot remove one');
select is(pg_temp.photo_state('00000000-0000-4000-8000-000000000601'), 'posted', 'nothing changed after the refusals');

-- A manager the owner lets approve photos may remove one; the payload is the stored media name, not the request's.
insert into public.approval_policies (location_id, kind, policy, set_by)
values ('00000000-0000-4000-8000-0000000000c1', 'photo', 'owner_and_managers', '00000000-0000-4000-8000-0000000000a1');
create temp table r as select pg_temp.remove('00000000-0000-4000-8000-000000000601', '00000000-0000-4000-8000-0000000000b4') as j;
select is((select (j ->> 'created')::boolean from r), true, 'an allowed manager approves the removal');
select is(pg_temp.photo_state('00000000-0000-4000-8000-000000000601'), 'removing', 'the photo shows as being removed');
select is((select payload ->> 'media_ref' from public.publications where id = (select (j ->> 'publication_id')::uuid from r)),
  'accounts/test/locations/mock-victim/media/AF1', 'the payload carries the name Google gave Kabsi''s upload');
select ok((select publish_after > now() from public.publications where id = (select (j ->> 'publication_id')::uuid from r)),
  'nothing goes to Google inside the 10 second undo window');
select is((select (pg_temp.remove('00000000-0000-4000-8000-000000000601') ->> 'created')::boolean), false,
  'a second click gets the same publication back');

-- Undo inside the window: the photo stays on Google.
select is((public.undo_publication((select (j ->> 'publication_id')::uuid from r), '00000000-0000-4000-8000-0000000000a1') ->> 'state'),
  'cancelled', 'undo inside 10 seconds cancels it');
select is(pg_temp.photo_state('00000000-0000-4000-8000-000000000601'), 'posted', 'after undo the photo is still on Google');

-- Google refused: the photo is back as posted.
create temp table r2 as select pg_temp.remove('00000000-0000-4000-8000-000000000601') as j;
update public.publications set publish_after = now() - interval '1 second' where id = (select (j ->> 'publication_id')::uuid from r2);
select is((public.claim_publication((select (j ->> 'publication_id')::uuid from r2)) ->> 'result'), 'claimed', 'claimed once');
select is((public.claim_publication((select (j ->> 'publication_id')::uuid from r2)) ->> 'result'), 'not_approved', 'never claimed twice');
select is(public.record_publication((select (j ->> 'publication_id')::uuid from r2), 'rejected', 'Google did not accept this photo removal.'),
  'rejected', 'a refusal is recorded');
select is(pg_temp.photo_state('00000000-0000-4000-8000-000000000601'), 'posted', 'a refused removal leaves the photo as posted');

-- Google applies it: removed only once verified, and its WhatsApp outcome line is never sent.
create temp table r3 as select pg_temp.remove('00000000-0000-4000-8000-000000000601') as j;
update public.publications set publish_after = now() - interval '1 second' where id = (select (j ->> 'publication_id')::uuid from r3);
select is((public.claim_publication((select (j ->> 'publication_id')::uuid from r3)) ->> 'result'), 'claimed', 'the new approval is claimed');
select is(public.record_publication((select (j ->> 'publication_id')::uuid from r3), 'published'), 'published', 'sent');
select is(pg_temp.photo_state('00000000-0000-4000-8000-000000000601'), 'removing', 'sent is not yet removed');
select is(public.record_publication((select (j ->> 'publication_id')::uuid from r3), 'verified'), 'verified', 'Google no longer has it');
select is(pg_temp.photo_state('00000000-0000-4000-8000-000000000601'), 'removed', 'removed once verified');
select ok(position('photo_removal' in pg_get_functiondef('public.publication_outcomes_due(integer)'::regprocedure)) > 0,
  'the WhatsApp outcome lines leave a photo removal out');
select is((select (pg_temp.remove('00000000-0000-4000-8000-000000000601') ->> 'created')::boolean), false,
  'approving the removal again returns the same verified removal, nothing new is sent');
select is((select count(*)::int from public.publications where target_type = 'photo_removal' and state = 'verified'), 1,
  'one verified removal');

select * from finish();
rollback;
