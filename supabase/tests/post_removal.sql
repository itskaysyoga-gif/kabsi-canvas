-- P0.7-05: removing a post Kabsi published goes through the one publication pipeline (K-38, guardrail 6): the
-- owner's approval on the dashboard only, the 10 second undo, one claim, and the post is removed only once Google no
-- longer shows it. The DELETE itself is tested in supabase/functions/api (removal case) and the Google layer.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

\ir _fixtures.psql

update public.locations set consent_at = now(), access_granted_at = now(), google_account_id = 'accounts/test',
  google_location_id = 'locations/mock-victim', status = 'active'
 where id = '00000000-0000-4000-8000-0000000000c1';

-- One post that is on Google (published and verified, with the name Google gave it) and one draft never sent.
insert into public.gbp_posts (id, location_id, owner_input, body, state)
values ('00000000-0000-4000-8000-000000000501', '00000000-0000-4000-8000-0000000000c1', 'Wrong text', 'Wrong text', 'posted'),
       ('00000000-0000-4000-8000-000000000502', '00000000-0000-4000-8000-0000000000c1', 'Never sent', 'Never sent', 'draft');
insert into public.publications (location_id, target_type, target_id, payload, approved_by, channel, state, route,
  idempotency_key, publish_after, google_ref)
values ('00000000-0000-4000-8000-0000000000c1', 'local_post', '00000000-0000-4000-8000-000000000501',
  '{"summary": "Wrong text"}', '00000000-0000-4000-8000-0000000000a1', 'dashboard', 'verified', 'api',
  'local_post:00000000-0000-4000-8000-000000000501:1', now() - interval '1 hour',
  'accounts/test/locations/mock-victim/localPosts/123');

create function pg_temp.remove(p_post text, p_user text default '00000000-0000-4000-8000-0000000000a1',
  p_channel text default 'dashboard') returns jsonb language sql as $$
  select public.approve_publication('local_post_removal', p_post::uuid, '{}'::jsonb, p_user::uuid, p_channel)
$$;
create function pg_temp.post_state(p_post text) returns text language sql as $$
  select state from public.gbp_posts where id = p_post::uuid
$$;

-- Refused: a post that was never on Google, another channel, a stranger.
select throws_ok($$ select pg_temp.remove('00000000-0000-4000-8000-000000000502') $$, 'post_not_on_google',
  'a draft that never reached Google cannot be removed');
select throws_ok($$ select pg_temp.remove('00000000-0000-4000-8000-000000000501', p_channel => 'whatsapp') $$, 'not_on_whatsapp',
  'WhatsApp never approves a removal');
select throws_ok($$ select pg_temp.remove('00000000-0000-4000-8000-000000000501', p_channel => 'email_link') $$, 'not_on_this_channel',
  'an email link never approves a removal');
select throws_ok($$ select pg_temp.remove('00000000-0000-4000-8000-000000000501', '00000000-0000-4000-8000-0000000000b1') $$, 'approver_not_member',
  'someone outside the business cannot remove its post');
select is(pg_temp.post_state('00000000-0000-4000-8000-000000000501'), 'posted', 'nothing changed after the refusals');

-- Approved: one publication with the post's Google name, the post on its way off, the undo window.
create temp table r as select pg_temp.remove('00000000-0000-4000-8000-000000000501') as j;
select is((select (j ->> 'created')::boolean from r), true, 'the owner approves the removal');
select is(pg_temp.post_state('00000000-0000-4000-8000-000000000501'), 'removing', 'the post shows as being removed');
select is((select payload ->> 'post_ref' from public.publications where id = (select (j ->> 'publication_id')::uuid from r)),
  'accounts/test/locations/mock-victim/localPosts/123', 'the payload carries the name Google gave the post');
select ok((select publish_after > now() from public.publications where id = (select (j ->> 'publication_id')::uuid from r)),
  'nothing goes to Google inside the 10 second undo window');
select is((select (pg_temp.remove('00000000-0000-4000-8000-000000000501') ->> 'created')::boolean), false,
  'a second click gets the same publication back');
select is((select count(*)::int from public.publications where target_type = 'local_post_removal'), 1, 'one removal publication');

-- Undo inside the window: the post stays on Google, and it can be approved again.
select is((public.undo_publication((select (j ->> 'publication_id')::uuid from r), '00000000-0000-4000-8000-0000000000a1') ->> 'state'),
  'cancelled', 'undo inside 10 seconds cancels it');
select is(pg_temp.post_state('00000000-0000-4000-8000-000000000501'), 'posted', 'after undo the post is still on Google');

create temp table r2 as select pg_temp.remove('00000000-0000-4000-8000-000000000501') as j;
select is((select (j ->> 'created')::boolean from r2), true, 'approved again after the undo');
update public.publications set publish_after = now() - interval '1 second' where id = (select (j ->> 'publication_id')::uuid from r2);
select is((public.claim_publication((select (j ->> 'publication_id')::uuid from r2)) ->> 'result'), 'claimed', 'claimed once');
select is((public.claim_publication((select (j ->> 'publication_id')::uuid from r2)) ->> 'result'), 'not_approved', 'never claimed twice');

-- Google refused: the post is back as posted with the reason on the publication.
select is(public.record_publication((select (j ->> 'publication_id')::uuid from r2), 'rejected', 'Google did not accept this post removal.'),
  'rejected', 'a refusal is recorded');
select is(pg_temp.post_state('00000000-0000-4000-8000-000000000501'), 'posted', 'a refused removal leaves the post as posted');

-- A new approval that Google applies: removed only once verified.
create temp table r3 as select pg_temp.remove('00000000-0000-4000-8000-000000000501') as j;
update public.publications set publish_after = now() - interval '1 second' where id = (select (j ->> 'publication_id')::uuid from r3);
select is((public.claim_publication((select (j ->> 'publication_id')::uuid from r3)) ->> 'result'), 'claimed', 'the new approval is claimed');
select is(public.record_publication((select (j ->> 'publication_id')::uuid from r3), 'published'), 'published', 'sent');
select is(pg_temp.post_state('00000000-0000-4000-8000-000000000501'), 'removing', 'sent is not yet removed');
select is(public.record_publication((select (j ->> 'publication_id')::uuid from r3), 'verified'), 'verified', 'Google no longer shows it');
select is(pg_temp.post_state('00000000-0000-4000-8000-000000000501'), 'removed', 'removed once verified');
select is((select (pg_temp.remove('00000000-0000-4000-8000-000000000501') ->> 'created')::boolean), false,
  'approving the removal again returns the same verified removal, nothing new is sent');
select is((select count(*)::int from public.publications where target_type = 'local_post_removal' and state = 'verified'), 1,
  'one verified removal');

select * from finish();
rollback;
