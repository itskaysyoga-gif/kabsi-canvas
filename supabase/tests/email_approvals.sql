-- P0.2-05: email approvals tightened (K-17, K-38, K-70, A16). Opening a link (GET) never changes anything; a link
-- does its one action once and a second POST gets the first result; links last 72 hours and are bound to one item
-- and one recipient; profile changes, hours and high-risk reviews need the recipient signed in, and another account's
-- session is refused; undo from the email page cancels; every use is in the audit log with the channel email_link,
-- the user, the IP country and the user agent; kabsi_cleanup_action_tokens keeps working.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

\ir _fixtures.psql

-- LA (..c1, owner A ..a1) active on the mock; B (..b2) owns LB and is the "other account".
update public.locations set consent_at = now(), access_granted_at = now(), google_account_id = 'accounts/test',
  google_location_id = 'locations/mock-victim', status = 'active'
 where id = '00000000-0000-4000-8000-0000000000c1';
update public.profile_changes set status = 'expired' where location_id = '00000000-0000-4000-8000-0000000000c1';
insert into public.reviews (id, location_id, google_review_id, star_rating, review_created_at, state, risk)
values ('00000000-0000-4000-8000-000000000501', '00000000-0000-4000-8000-0000000000c1', 'mail-review-1', 5, now(), 'drafted', 'low'),
       ('00000000-0000-4000-8000-000000000502', '00000000-0000-4000-8000-0000000000c1', 'mail-review-2', 4, now(), 'drafted', 'low'),
       ('00000000-0000-4000-8000-000000000503', '00000000-0000-4000-8000-0000000000c1', 'mail-review-3', 1, now(), 'drafted', 'high');

create function pg_temp.token(p_hash text, p_action text, p_type text, p_target text,
  p_expires interval default interval '72 hours', p_user text default '00000000-0000-4000-8000-0000000000a1') returns void
language sql as $$
  insert into public.action_tokens (token_hash, location_id, user_id, action, target_type, target_id, expires_at)
  values (p_hash, '00000000-0000-4000-8000-0000000000c1', p_user::uuid, p_action, p_type, p_target, now() + p_expires)
$$;
create function pg_temp.use(p_hash text, p_do text, p_session text default null, p_text text default 'Thank you for coming.',
  p_publication uuid default null) returns jsonb language sql as $$
  -- Sec 2: the page sends the draft version it showed; these cases show the newest one.
  select public.use_action_link(p_hash, p_do, p_text, p_session::uuid, p_publication,
    (select coalesce(max(d.version), 0) from public.reply_drafts d
      where d.review_id::text = (select t.target_id::text from public.action_tokens t where t.token_hash = p_hash)))
$$;
create function pg_temp.view(p_hash text, p_session text default null) returns jsonb language sql as $$
  select public.action_link_view(p_hash, p_session::uuid)
$$;
create function pg_temp.pubs(p_target text) returns bigint language sql as $$
  select count(*) from public.publications where target_id = p_target::uuid
$$;

-- Shape and privileges ---------------------------------------------------------------------------------------------------

select has_column('public', 'action_tokens', 'result', 'action_tokens.result keeps the first result of a link');
select ok((select bool_and(not has_function_privilege('anon', f, 'execute') and not has_function_privilege('authenticated', f, 'execute')
                           and has_function_privilege('service_role', f, 'execute'))
             from unnest(array['public.action_link_view(text,uuid)', 'public.use_action_link(text,text,text,uuid,uuid)',
                               'public.use_action_link(text,text,text,uuid,uuid,integer)']) f),
  'the email link functions run for the service role only (the page goes through api/action)');
select is((select provolatile from pg_proc where oid = 'public.action_link_view(text,uuid)'::regprocedure), 's',
  'the GET function is STABLE, so Postgres refuses any write inside it');
select ok(not has_function_privilege('authenticated', 'private.signed_in_as(uuid)', 'execute')
          and not has_function_privilege('anon', 'private.signed_in_as(uuid)', 'execute'), 'the sign-in flag is not for the browser');

-- 72 hours (K-17), whatever the code that makes the link asks for.
select pg_temp.token('mail-week', 'post', 'review', '00000000-0000-4000-8000-000000000501', interval '7 days');
select ok((select expires_at <= created_at + interval '72 hours' from public.action_tokens where token_hash = 'mail-week'),
  'a link asked for 7 days is stored with 72 hours');
update public.action_tokens set expires_at = now() + interval '30 days' where token_hash = 'mail-week';
select ok((select expires_at <= created_at + interval '72 hours' from public.action_tokens where token_hash = 'mail-week'),
  'and cannot be lengthened later');

-- GET never changes anything ---------------------------------------------------------------------------------------------

select pg_temp.token('mail-post', 'post', 'review', '00000000-0000-4000-8000-000000000501');
create temp table before_get as select (select count(*) from public.audit_events) audits, (select count(*) from public.publications) pubs,
  (select count(*) from public.jobs) jobs;
select is(pg_temp.view('mail-post') ->> 'status', 'ok', 'an open link reads as ok');
select is(pg_temp.view('mail-post') -> 'sign_in', 'false'::jsonb, 'a normal review reply needs no sign-in (K-17)');
select is(pg_temp.view('mail-post', '00000000-0000-4000-8000-0000000000a1') ->> 'status', 'ok', 'and the same with a session');
select is((select row(used_at, result)::text from public.action_tokens where token_hash = 'mail-post'), row(null::timestamptz, null::jsonb)::text,
  'opening the link twice did not use it');
select is((select state from public.reviews where id = '00000000-0000-4000-8000-000000000501'), 'drafted', 'the review is untouched');
select is((select row((select count(*) from public.audit_events), (select count(*) from public.publications), (select count(*) from public.jobs))::text),
  (select row(audits, pubs, jobs)::text from before_get), 'no audit event, no publication and no job from a GET');
select is(pg_temp.view('no-such-link') ->> 'status', 'invalid', 'an unknown link is invalid');

-- POST: the one action, with the channel, the user, the country and the browser -------------------------------------------

select set_config('request.jwt.claims', '{"role":"service_role"}', true);
select set_config('request.headers', '{"x-kabsi-ip-country":"LB","x-kabsi-user-agent":"Owner Phone Mail","x-kabsi-actor-id":"00000000-0000-4000-8000-0000000000a1"}', true);
create temp table first as select pg_temp.use('mail-post', 'post') r;
select is((select r ->> 'done' from first), 'approved', 'the first POST approves the reply');
select ok((select (r ->> 'publish_after')::timestamptz > now() from first), 'with the 10 second undo window (K-70)');
select is((select row(p.channel, p.approved_by, p.state)::text from public.publications p join first on p.id = (first.r ->> 'publication_id')::uuid),
  row('email_link', '00000000-0000-4000-8000-0000000000a1'::uuid, 'approved')::text, 'one publication, channel email_link, approved by the recipient');
select is((select state from public.reviews where id = '00000000-0000-4000-8000-000000000501'), 'publishing', 'the review is claimed');
select ok((select used_at is not null and result ->> 'publication_id' = (select r ->> 'publication_id' from first)
             from public.action_tokens where token_hash = 'mail-post'), 'the link is used and keeps its result');
select is((select row(actor_type, actor_id, channel, ip_country, user_agent, result)::text from public.audit_events
            where action = 'email_link_used' and object_id = '00000000-0000-4000-8000-000000000501'),
  row('user', '00000000-0000-4000-8000-0000000000a1'::uuid, 'email_link', 'LB', 'Owner Phone Mail', 'approved')::text,
  'the use is in the audit log with the channel email_link, the user, the IP country and the user agent');
select is((select count(*) from public.audit_events where action = 'approval' and channel = 'email_link'
            and object_id = '00000000-0000-4000-8000-000000000501' and ip_country = 'LB'), 1::bigint,
  'and the approval itself carries the channel email_link');
select is((select after -> 'signed_in' from public.audit_events where action = 'email_link_used'
            and object_id = '00000000-0000-4000-8000-000000000501'), 'false'::jsonb, 'recorded as not signed in');

-- A second POST returns the existing result (K-38).
select is(pg_temp.use('mail-post', 'post') ->> 'publication_id', (select r ->> 'publication_id' from first),
  'a second POST returns the same publication');
select is(pg_temp.use('mail-post', 'post') ->> 'repeat', 'true', 'marked as the earlier result');
select is(pg_temp.use('mail-post', 'skip') ->> 'done', 'approved', 'another choice on a used link does nothing new');
select is(pg_temp.pubs('00000000-0000-4000-8000-000000000501'), 1::bigint, 'still one publication');
select is((select state from public.reviews where id = '00000000-0000-4000-8000-000000000501'), 'publishing', 'and the review was not skipped');
select is((select count(*) from public.audit_events where action = 'email_link_used' and object_id = '00000000-0000-4000-8000-000000000501'),
  1::bigint, 'a repeat writes no second use');

-- Undo from the email page (K-70).
select throws_ok($$ select pg_temp.use('mail-post', 'undo', p_publication => gen_random_uuid()) $$, 'P0001', 'not_allowed',
  'undo only for the publication this link made');
select is(pg_temp.use('mail-post', 'undo', p_publication => (select (r ->> 'publication_id')::uuid from first)) ->> 'done', 'undone',
  'undo inside the 10 seconds');
select is((select state from public.publications where id = (select (r ->> 'publication_id')::uuid from first)), 'cancelled',
  'the publication is cancelled');
select is((select state from public.reviews where id = '00000000-0000-4000-8000-000000000501'), 'drafted', 'the reply is back with the owner');
select is(pg_temp.use('mail-post', 'post') ->> 'done', 'undone', 'the link stays spent: a later POST gets "undone"');
select is(pg_temp.use('mail-post', 'undo', p_publication => (select (r ->> 'publication_id')::uuid from first)) ->> 'done', 'undone',
  'a second undo too');
select is((select count(*) from public.audit_events where action = 'email_link_used' and result = 'undone'
            and channel = 'email_link' and object_id = '00000000-0000-4000-8000-000000000501'), 1::bigint, 'the undo is in the audit log');

-- Expired, used and wrong links are refused --------------------------------------------------------------------------------

select pg_temp.token('mail-old', 'post', 'review', '00000000-0000-4000-8000-000000000502', interval '-1 minute');
select is(pg_temp.view('mail-old') ->> 'status', 'expired', 'an expired link reads as expired');
select throws_ok($$ select pg_temp.use('mail-old', 'post') $$, 'P0001', 'link_expired', 'and is refused');
select is(pg_temp.pubs('00000000-0000-4000-8000-000000000502'), 0::bigint, 'nothing was approved');
select pg_temp.token('mail-legacy', 'post', 'review', '00000000-0000-4000-8000-000000000502');
update public.action_tokens set used_at = now() where token_hash = 'mail-legacy';
select throws_ok($$ select pg_temp.use('mail-legacy', 'post') $$, 'P0001', 'link_used', 'a link used before this change is refused');
select throws_ok($$ select pg_temp.use('no-such-link', 'post') $$, 'P0001', 'invalid_link', 'an unknown link is refused');
select pg_temp.token('mail-skip', 'skip', 'review', '00000000-0000-4000-8000-000000000502');
select throws_ok($$ select pg_temp.use('mail-skip', 'post') $$, 'P0001', 'not_allowed', 'a Skip link cannot approve');
select pg_temp.token('mail-nobody', 'post', 'review', '00000000-0000-4000-8000-000000000502', p_user => null);
select throws_ok($$ select pg_temp.use('mail-nobody', 'post') $$, 'P0001', 'not_allowed', 'a link with no recipient does nothing');
select pg_temp.token('mail-stranger', 'post', 'review', '00000000-0000-4000-8000-000000000502', p_user => '00000000-0000-4000-8000-0000000000b2');
select throws_ok($$ select pg_temp.use('mail-stranger', 'post') $$, 'P0001', 'not_member', 'a recipient who is not a member does nothing');

-- Skip through the email link: recorded as email_link, by the recipient.
select is(pg_temp.use('mail-skip', 'skip') ->> 'done', 'skipped', 'Skip from the email');
select is((select row(actor_type, actor_id, channel)::text from public.audit_events where action = 'review_skipped'
            and object_id = '00000000-0000-4000-8000-000000000502'),
  row('user', '00000000-0000-4000-8000-0000000000a1'::uuid, 'email_link')::text, 'the skip carries the channel email_link');
select is((select row(actor_type, channel)::text from public.audit_events where action = 'review_skipped' and channel = 'dashboard'
            and object_id = '00000000-0000-4000-8000-000000000502'), null, 'not dashboard');

-- Sign-in for high-risk reviews, hours and profile changes (K-17) -------------------------------------------------------------

select pg_temp.token('mail-urgent', 'see_draft', 'review', '00000000-0000-4000-8000-000000000503');
select is(pg_temp.view('mail-urgent') -> 'sign_in', 'true'::jsonb, 'a high-risk review asks to sign in');
select is((select row(v -> 'signed_in', v -> 'other_account')::text from (select pg_temp.view('mail-urgent', '00000000-0000-4000-8000-0000000000b2') v) x),
  row('false'::jsonb, 'true'::jsonb)::text, 'the page knows another account is signed in');
select throws_ok($$ select pg_temp.use('mail-urgent', 'post') $$, 'P0001', 'sign_in_required', 'approving it signed out is refused');
select throws_ok($$ select pg_temp.use('mail-urgent', 'post', '00000000-0000-4000-8000-0000000000b2') $$, 'P0001', 'wrong_account',
  'another recipient''s session is refused');
select is((select used_at from public.action_tokens where token_hash = 'mail-urgent'), null, 'a refused POST leaves the link unused');
select is(pg_temp.use('mail-urgent', 'post', '00000000-0000-4000-8000-0000000000a1') ->> 'done', 'approved', 'the recipient, signed in, approves');
select is((select after -> 'signed_in' from public.audit_events where action = 'email_link_used'
            and object_id = '00000000-0000-4000-8000-000000000503'), 'true'::jsonb, 'recorded as signed in');
select throws_ok($$ select pg_temp.use('mail-urgent', 'post', '00000000-0000-4000-8000-0000000000b2') $$, 'P0001', 'wrong_account',
  'another account cannot even read back the result');

-- Profile changes through Google Protection: hours (low risk) and the name (high risk).
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-4000-8000-0000000000a1", "role": "authenticated"}';
select public.confirm_business_details('00000000-0000-4000-8000-0000000000c1', jsonb_build_object(
  'name', jsonb_build_object('display', 'Yawmiyati.com', 'raw', 'Yawmiyati.com'),
  'regular_hours', jsonb_build_object('display', 'Mon to Sun 09:00 to 22:00')));
reset role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
select set_config('request.headers', '{"x-kabsi-ip-country":"LB","x-kabsi-user-agent":"Owner Phone Mail","x-kabsi-actor-id":"00000000-0000-4000-8000-0000000000a1"}', true);
select public.record_protection_check('00000000-0000-4000-8000-0000000000c1', jsonb_build_array(
  jsonb_build_object('field', 'regular_hours', 'value', jsonb_build_object('display', 'Mon to Sun 09:00 to 18:00', 'raw', 'x'),
    'google_updated', true, 'previous', 'Mon to Sun 09:00 to 22:00', 'explanation', 'Google shows closing at 18:00. You approved 22:00.'),
  jsonb_build_object('field', 'name', 'value', jsonb_build_object('display', 'Yawmiyati', 'raw', 'Yawmiyati'),
    'google_updated', true, 'previous', 'Yawmiyati.com', 'explanation', 'Google shows “Yawmiyati”. You approved “Yawmiyati.com”.')));
create temp table ch as select field, id from public.profile_changes
 where location_id = '00000000-0000-4000-8000-0000000000c1' and status in ('detected', 'awaiting_review');
select is((select count(*) from ch), 2::bigint, 'two open changes: hours and name');
select pg_temp.token('mail-hours', 'revert', 'listing_change', (select id::text from ch where field = 'regular_hours'));
select pg_temp.token('mail-name', 'keep', 'listing_change', (select id::text from ch where field = 'name'));

select is(pg_temp.view('mail-hours') -> 'sign_in', 'true'::jsonb, 'hours ask to sign in');
select throws_ok($$ select pg_temp.use('mail-hours', 'revert') $$, 'P0001', 'sign_in_required', 'hours are refused signed out');
select throws_ok($$ select pg_temp.use('mail-hours', 'keep') $$, 'P0001', 'sign_in_required', '"Google is right" too');
select throws_ok($$ select pg_temp.use('mail-hours', 'revert', '00000000-0000-4000-8000-0000000000b2') $$, 'P0001', 'wrong_account',
  'another recipient''s session is refused for hours');
select is((select status from public.profile_changes where id = (select id from ch where field = 'regular_hours')), 'awaiting_review',
  'the hours change still waits');
select is(pg_temp.use('mail-hours', 'revert', '00000000-0000-4000-8000-0000000000a1') ->> 'done', 'reverting',
  'the owner, signed in, keeps their hours');
select is((select row(channel, approved_by)::text from public.publications where target_id = (select id from ch where field = 'regular_hours')),
  row('email_link', '00000000-0000-4000-8000-0000000000a1'::uuid)::text, 'one put-back publication, channel email_link');
select is((select count(*) from public.audit_events where action = 'protection_change' and result = 'rejected' and channel = 'email_link'
            and object_id = (select id::text from ch where field = 'regular_hours')), 1::bigint, 'the decision carries the channel email_link');
select is(pg_temp.use('mail-hours', 'revert', '00000000-0000-4000-8000-0000000000a1') ->> 'repeat', 'true', 'a second POST repeats the result');
select is(pg_temp.use('mail-hours', 'undo', p_publication => (select id from public.publications
  where target_id = (select id from ch where field = 'regular_hours'))) ->> 'done', 'undone', 'undo of a put-back from the email page');
select is((select status from public.profile_changes where id = (select id from ch where field = 'regular_hours')), 'awaiting_review',
  'the change waits for the owner again');

select throws_ok($$ select pg_temp.use('mail-name', 'keep') $$, 'P0001', 'sign_in_required', 'the name is refused signed out');
select throws_ok($$ select public.decide_profile_change((select id from ch where field = 'name'), 'accept',
  '00000000-0000-4000-8000-0000000000a1', 'email_link') $$, 'P0001', 'sign_in_required', 'and straight from an email link');
select is(pg_temp.use('mail-name', 'keep', '00000000-0000-4000-8000-0000000000a1') ->> 'done', 'kept',
  'the owner, signed in on the email page, can say "Google is right" for the name');
select is((select status from public.profile_changes where id = (select id from ch where field = 'name')), 'accepted', 'the name change is accepted');
select ok(not private.signed_in_as('00000000-0000-4000-8000-0000000000a1'), 'the signed-in flag does not outlive the link''s own call');
select is(nullif(current_setting('kabsi.channel', true), ''), null, 'nor does the channel');

-- kabsi_cleanup_action_tokens keeps working ------------------------------------------------------------------------------------

select is((select command from cron.job where jobname = 'kabsi_cleanup_action_tokens'), null,
  'the test database has no cron jobs (scripts/db-test.sh); the live job is read back after the migration');
insert into public.action_tokens (token_hash, location_id, user_id, action, target_type, target_id, expires_at, created_at)
values ('mail-ancient', '00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000a1', 'post', 'review',
        '00000000-0000-4000-8000-000000000502', now() - interval '40 days', now() - interval '43 days');
-- The job's statement, word for word (schema v1).
delete from public.action_tokens where expires_at < now() - interval '30 days';
select is((select count(*) from public.action_tokens where token_hash = 'mail-ancient'), 0::bigint, 'the clean-up removes links expired 30 days ago');
select is((select count(*) from public.action_tokens where token_hash in ('mail-post', 'mail-old', 'mail-urgent', 'mail-hours')), 4::bigint,
  'and keeps the rest');

select * from finish();
rollback;
