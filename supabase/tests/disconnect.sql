-- P0.2-02: disconnect Kabsi and access-change notices (K-41, K-113.1, K-113.2). The owner's request stops everything
-- for the business in one transaction and offers one disconnect job; no new job can start afterwards; a failed
-- removal opens one staff follow-up due 7 business days after the request; staff close it; the review link and cards
-- keep working; the Google data follows the K-40 rule for lost access.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

\ir _fixtures.psql

-- LA (..c1, owner A ..a1) is a live business on the mock: access, an approved reply inside its undo window, open
-- review tasks, an open concierge task, an email link and queued jobs. A manager M ..b4 of LA.
insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-0000000000b4', 'authenticated', 'authenticated',
        'victim-manager@example.test', now(), '{}', '{}', now(), now());
insert into public.location_members (location_id, user_id, role)
values ('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000b4', 'manager');
update public.locations set consent_at = now(), access_granted_at = now(), google_account_id = 'accounts/mock',
  google_location_id = 'locations/mock-victim', status = 'active'
 where id = '00000000-0000-4000-8000-0000000000c1';
insert into public.reviews (id, location_id, google_review_id, star_rating, review_created_at, state) values
  ('00000000-0000-4000-8000-000000000d01', '00000000-0000-4000-8000-0000000000c1', 'dc-drafted', 4, now(), 'drafted'),
  ('00000000-0000-4000-8000-000000000d02', '00000000-0000-4000-8000-0000000000c1', 'dc-publishing', 2, now(), 'publishing'),
  ('00000000-0000-4000-8000-000000000d03', '00000000-0000-4000-8000-0000000000c1', 'dc-posted', 5, now(), 'posted');
insert into public.publications (id, location_id, target_type, target_id, payload, approved_by, channel, state, publish_after) values
  ('00000000-0000-4000-8000-000000000d11', '00000000-0000-4000-8000-0000000000c1', 'review_reply',
   '00000000-0000-4000-8000-000000000d02', '{"text": "Sorry."}', '00000000-0000-4000-8000-0000000000a1', 'dashboard', 'approved',
   now() + interval '10 seconds');
select public.enqueue_job('sync_reviews', '00000000-0000-4000-8000-0000000000c1', 'sync_reviews:00000000-0000-4000-8000-0000000000c1');
select public.enqueue_job('draft_reply', '00000000-0000-4000-8000-0000000000c1', 'draft_reply:00000000-0000-4000-8000-000000000d01');
create temp table card_before as select code, status, destination, location_id from public.cards where code = 'VCTM22';

-- The function is not open to everyone -----------------------------------------------------------------------------

select ok(not has_function_privilege('anon', 'public.request_disconnect(uuid)', 'execute'), 'anon cannot run request_disconnect');
select ok(not has_function_privilege('authenticated', 'public.record_disconnect_result(uuid,boolean,text)', 'execute'),
  'the browser cannot record a removal result');
select ok(not has_function_privilege('authenticated', 'private.add_business_days(timestamptz,integer)', 'execute')
  and not has_function_privilege('authenticated', 'private.mark_access_removed(uuid,text,uuid,text)', 'execute'),
  'the disconnect helpers are closed to the browser');

-- Only the signed-in owner ----------------------------------------------------------------------------------------

select set_config('request.jwt.claims', '{"role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$ select public.request_disconnect('00000000-0000-4000-8000-0000000000c1') $$, '42501', 'sign_in_required',
  'without a signed-in user nothing happens');
reset role;
select tests.act_as('00000000-0000-4000-8000-0000000000b1');
select throws_ok($$ select public.request_disconnect('00000000-0000-4000-8000-0000000000c1') $$, '42501', null, 'a stranger cannot disconnect');
reset role;
select tests.act_as('00000000-0000-4000-8000-0000000000b2');
select throws_ok($$ select public.request_disconnect('00000000-0000-4000-8000-0000000000c1') $$, '42501', null,
  'the owner of another business cannot disconnect this one');
reset role;
select tests.act_as('00000000-0000-4000-8000-0000000000b4');
select throws_ok($$ select public.request_disconnect('00000000-0000-4000-8000-0000000000c1') $$, '42501', null, 'a manager cannot disconnect');
reset role;
select tests.act_as('00000000-0000-4000-8000-0000000000a2');
select throws_ok($$ select public.request_disconnect('00000000-0000-4000-8000-0000000000c1') $$, '42501', null, 'the partner cannot disconnect');
reset role;
select tests.act_as('00000000-0000-4000-8000-0000000000a3');
select throws_ok($$ select public.request_disconnect('00000000-0000-4000-8000-0000000000c1') $$, '42501', null,
  'staff cannot disconnect for the owner');
reset role;
select is((select status from public.locations where id = '00000000-0000-4000-8000-0000000000c1'), 'active', 'refused calls changed nothing');

-- A demo business stays connected (R-17).
insert into public.locations (id, name, place_id, is_demo) values ('00000000-0000-4000-8000-0000000000c9', 'Demo Cafe', 'demo-dc', true);
insert into public.location_members (location_id, user_id, role)
values ('00000000-0000-4000-8000-0000000000c9', '00000000-0000-4000-8000-0000000000a1', 'owner');
select tests.act_as('00000000-0000-4000-8000-0000000000a1');
select throws_ok($$ select public.request_disconnect('00000000-0000-4000-8000-0000000000c9') $$, 'P0001', 'demo_location',
  'a demo business cannot be disconnected');
reset role;

-- The owner's request: one transaction stops everything ----------------------------------------------------------

select tests.act_as('00000000-0000-4000-8000-0000000000a1');
select is(public.request_disconnect('00000000-0000-4000-8000-0000000000c1') ->> 'created', 'true', 'the owner disconnects');
select is(public.request_disconnect('00000000-0000-4000-8000-0000000000c1') ->> 'created', 'false', 'a second tap returns the first request');
reset role;

select is((select status from public.locations where id = '00000000-0000-4000-8000-0000000000c1'), 'paused', 'the business is paused');
select is((select disconnect_requested_by from public.locations where id = '00000000-0000-4000-8000-0000000000c1'),
  '00000000-0000-4000-8000-0000000000a1'::uuid, 'the request records who asked');
select is((select access_state from public.google_connections where location_id = '00000000-0000-4000-8000-0000000000c1'),
  'removing', 'google_connections shows removing');
select is((select state || ':' || error from public.publications where id = '00000000-0000-4000-8000-000000000d11'),
  'cancelled:disconnected', 'the approval waiting for its undo window is cancelled');
select is((select count(*)::int from public.publications where location_id = '00000000-0000-4000-8000-0000000000c1' and state = 'approved'),
  0, 'no approval is left waiting');
select is((select count(*)::int from public.reviews where location_id = '00000000-0000-4000-8000-0000000000c1'
            and state in ('new', 'drafted', 'blocked', 'publishing')), 0, 'no review task is left open');
select is((select state from public.reviews where id = '00000000-0000-4000-8000-000000000d02'), 'archived',
  'the review whose reply was cancelled is archived, not posted');
select is((select state from public.reviews where id = '00000000-0000-4000-8000-000000000d03'), 'posted', 'a posted review stays posted');
select is((select state from public.concierge_tasks where id = '00000000-0000-4000-8000-0000000000f2'), 'cancelled', 'the open concierge task is cancelled');
select ok((select expires_at <= now() from public.action_tokens where token_hash = 'victim-token'), 'the unused email link stops working');
select is((select count(*)::int from public.jobs where location_id = '00000000-0000-4000-8000-0000000000c1'
            and state in ('pending', 'retrying', 'running') and kind <> 'disconnect'), 0, 'the queued jobs are stopped');
select is((select count(*)::int from public.jobs where location_id = '00000000-0000-4000-8000-0000000000c1' and kind = 'disconnect'
            and state = 'pending'), 1, 'exactly one disconnect job is offered');
select results_eq(
  $$ select actor_type, actor_id, channel, result, (after ->> 'approvals_cancelled')::int, (after ->> 'reviews_archived')::int,
            (after ->> 'jobs_stopped')::int
       from public.audit_events where action = 'disconnect_requested' and location_id = '00000000-0000-4000-8000-0000000000c1' $$,
  $$ values ('user'::text, '00000000-0000-4000-8000-0000000000a1'::uuid, 'dashboard'::text, 'requested'::text, 2, 3, 2) $$,
  'one audit event records the request and what it stopped');
select is((select count(*)::int from public.ops_events where kind = 'disconnect_requested'), 1, 'staff see one Slack line for the request');
select is((select count(*)::int from public.ops_events where kind = 'business_paused'), 0, 'no generic paused line for a disconnect');

-- No further jobs ----------------------------------------------------------------------------------------------------

select is(public.enqueue_job('sync_reviews', '00000000-0000-4000-8000-0000000000c1', 'sync_reviews:again'), null,
  'a new sync job is refused');
select is(public.enqueue_job('publish', '00000000-0000-4000-8000-0000000000c1', 'publish:again'), null, 'a new publish job is refused');
select private.produce_jobs();
select is((select count(*)::int from public.jobs where location_id = '00000000-0000-4000-8000-0000000000c1'
            and state in ('pending', 'retrying') and kind <> 'disconnect'), 0, 'the producer offers nothing for the business');
update public.locations set status = 'active' where id = '00000000-0000-4000-8000-0000000000c1';
select is(public.enqueue_job('protection_check', '00000000-0000-4000-8000-0000000000c1', 'protection_check:again'), null,
  'even with its status forced back, no job starts for a disconnected business');
update public.locations set status = 'paused' where id = '00000000-0000-4000-8000-0000000000c1';

-- The review link and cards keep working ---------------------------------------------------------------------------

select results_eq($$ select code, status, destination, location_id from public.cards where code = 'VCTM22' $$,
  $$ select * from card_before $$, 'the card and review link are untouched');

-- Business days (K-41: 7 business days) ----------------------------------------------------------------------------

select is(private.add_business_days('2026-10-09 10:00+00', 1), '2026-10-12 10:00+00'::timestamptz, 'Friday plus 1 is Monday');
select is(private.add_business_days('2026-10-10 10:00+00', 1), '2026-10-12 10:00+00'::timestamptz, 'Saturday plus 1 is Monday');
select is(private.add_business_days('2026-10-09 10:00+00', 7), '2026-10-20 10:00+00'::timestamptz, 'Friday plus 7 is Tuesday week');
select is(private.add_business_days('2026-10-07 10:00+00', 7), '2026-10-16 10:00+00'::timestamptz, 'Wednesday plus 7 is Friday week');

-- A failed removal: one follow-up, due 7 business days after the request --------------------------------------------

update public.locations set disconnect_requested_at = '2026-10-09 10:00+00' where id = '00000000-0000-4000-8000-0000000000c1';
select is(public.record_disconnect_result('00000000-0000-4000-8000-0000000000c1', false, 'google 403 mock') ->> 'due_at',
  to_jsonb('2026-10-20 10:00+00'::timestamptz) #>> '{}', 'the result names the due date');
select public.record_disconnect_result('00000000-0000-4000-8000-0000000000c1', false, 'google 500 again');
select results_eq(
  $$ select kind, location_name, due_at, detail, done_at from public.staff_followups
      where location_id = '00000000-0000-4000-8000-0000000000c1' and done_note is distinct from 'Victim follow-up' $$,
  $$ values ('google_access_removal'::text, 'Victim Bakery'::text, '2026-10-20 10:00+00'::timestamptz, 'google 500 again'::text, null::timestamptz) $$,
  'one open follow-up, due 7 business days after the request, with the last error');
select is((select count(*)::int from public.audit_events where action = 'google_access_removal_failed'), 1, 'the failure is recorded once');
select is((select count(*)::int from public.ops_events where kind = 'access_removal_followup'), 1, 'staff are alerted once');
select is((select access_state from public.google_connections where location_id = '00000000-0000-4000-8000-0000000000c1'),
  'removing', 'access stays removing until it is gone');
select throws_ok($$ select public.record_disconnect_result('00000000-0000-4000-8000-0000000000c2', false, 'x') $$, 'P0001',
  'no_disconnect_request', 'a business that did not ask cannot get a follow-up');

-- Only staff see and close follow-ups ------------------------------------------------------------------------------

create temp table fid as select id from public.staff_followups where location_id = '00000000-0000-4000-8000-0000000000c1' and done_at is null;
grant select on fid to authenticated;
select tests.act_as('00000000-0000-4000-8000-0000000000a1');
select is((select count(*)::int from public.staff_followups), 0, 'the owner does not see staff follow-ups');
select throws_ok($$ select public.staff_complete_followup((select id from fid), 'done') $$, '42501', null,
  'the owner cannot close a follow-up');
reset role;
select tests.act_as('00000000-0000-4000-8000-0000000000a3');
select is((select count(*)::int from public.staff_followups where done_at is null), 1, 'staff see the open follow-up');
select throws_ok($$ select public.staff_complete_followup((select id from fid), '  ') $$, 'P0001', 'note_required',
  'closing a follow-up needs a note');
select is(public.staff_complete_followup((select id from fid), 'Removed Kabsi Clients under People and access') ->> 'created', 'true',
  'staff close the follow-up');
reset role;
select results_eq(
  $$ select l.access_removed_at is not null, l.access_granted_at is null, l.access_lost_at is not null, g.access_state
       from public.locations l join public.google_connections g on g.location_id = l.id
      where l.id = '00000000-0000-4000-8000-0000000000c1' $$,
  $$ values (true, true, true, 'removed'::text) $$, 'access is removed, and lost from now (the K-40 clock)');
select results_eq(
  $$ select actor_type, actor_id, channel from public.audit_events where action = 'google_access_removed' $$,
  $$ values ('staff'::text, '00000000-0000-4000-8000-0000000000a3'::uuid, 'staff'::text) $$, 'the removal is recorded as staff work');
select is((select done_by from public.staff_followups where id = (select id from fid)), '00000000-0000-4000-8000-0000000000a3'::uuid, 'the follow-up names who closed it');
select is((select count(*)::int from public.jobs where location_id = '00000000-0000-4000-8000-0000000000c1' and kind = 'disconnect'
            and state = 'pending'), 1, 'the disconnect job stays offered once, to send the owner the removed notice');
select is((select count(*)::int from public.ops_events where kind = 'access_lost'), 0, 'no generic access lost alert for a disconnect');
update public.locations set name = 'Victim Bakery Renamed' where id = '00000000-0000-4000-8000-0000000000c1';
select is((select access_state from public.google_connections where location_id = '00000000-0000-4000-8000-0000000000c1'),
  'removed', 'a later change to the business keeps access removed');

-- Success on the first try, and success after a failure ------------------------------------------------------------

insert into public.locations (id, name, place_id, consent_at, access_granted_at, google_account_id, google_location_id, status) values
  ('00000000-0000-4000-8000-0000000000c5', 'Quick Removal', 'quick-place', now(), now(), 'accounts/mock', 'locations/mock-quick', 'active'),
  ('00000000-0000-4000-8000-0000000000c6', 'Late Removal', 'late-place', now(), now(), 'accounts/mock', 'locations/mock-late', 'active');
insert into public.location_members (location_id, user_id, role) values
  ('00000000-0000-4000-8000-0000000000c5', '00000000-0000-4000-8000-0000000000a1', 'owner'),
  ('00000000-0000-4000-8000-0000000000c6', '00000000-0000-4000-8000-0000000000a1', 'owner');
select tests.act_as('00000000-0000-4000-8000-0000000000a1');
select public.request_disconnect('00000000-0000-4000-8000-0000000000c5');
select public.request_disconnect('00000000-0000-4000-8000-0000000000c6');
reset role;
select isnt(public.record_disconnect_result('00000000-0000-4000-8000-0000000000c5', true) ->> 'removed_at', null, 'a removal on the first try');
select results_eq(
  $$ select g.access_state, (select count(*)::int from public.staff_followups f where f.location_id = g.location_id)
       from public.google_connections g where g.location_id = '00000000-0000-4000-8000-0000000000c5' $$,
  $$ values ('removed'::text, 0) $$, 'removed with no follow-up');
select results_eq(
  $$ select actor_type, channel, result from public.audit_events where action = 'google_access_removed'
        and location_id = '00000000-0000-4000-8000-0000000000c5' $$,
  $$ values ('system'::text, 'google'::text, 'removed'::text) $$, 'the removal is recorded as done through Google');
select public.record_disconnect_result('00000000-0000-4000-8000-0000000000c6', false, 'google 500');
select public.record_disconnect_result('00000000-0000-4000-8000-0000000000c6', true);
select results_eq(
  $$ select done_at is not null, done_note from public.staff_followups where location_id = '00000000-0000-4000-8000-0000000000c6' $$,
  $$ values (true, 'Kabsi removed its access on a later try'::text) $$, 'a later success closes the follow-up');
select is((select count(*)::int from public.audit_events where action = 'google_access_removed'
            and location_id = '00000000-0000-4000-8000-0000000000c6'), 1, 'removed is recorded once');
select is(public.record_disconnect_result('00000000-0000-4000-8000-0000000000c6', false, 'late echo') ->> 'due_at', null,
  'a failure reported after the removal changes nothing');
select is((select count(*)::int from public.staff_followups where location_id = '00000000-0000-4000-8000-0000000000c6' and done_at is null),
  0, 'and opens no new follow-up');

-- Google data goes on the K-40 schedule for lost access; the card stays ----------------------------------------------

update public.locations set access_lost_at = now() - interval '31 days' where id = '00000000-0000-4000-8000-0000000000c1';
select private.run_retention();
select is((select count(*)::int from public.reviews where location_id = '00000000-0000-4000-8000-0000000000c1'), 0,
  'the reviews go 30 days after access was removed');
select results_eq($$ select code, status, destination, location_id from public.cards where code = 'VCTM22' $$,
  $$ select * from card_before $$, 'the card and review link still work');

select * from finish();
rollback;
