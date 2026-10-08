-- P0.1-13a: one publication pipeline (K-38, K-70, K-116.1, R-05, D266): the approval returns one publication however
-- many times it is pressed, undo inside 10 seconds, one claim, what Google answered, the reconcile schedule, the
-- producers and the mock reviews API. The two-session approval race is in publication_concurrency.sh; the publish
-- and reconcile jobs' Google calls are tested in supabase/functions/_shared/publish.test.ts.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

\ir _fixtures.psql

-- The victim business, active on the mock, with six drafted reviews; the other business in concierge mode.
update public.locations set consent_at = now(), access_granted_at = now(), google_account_id = 'accounts/test',
  google_location_id = 'locations/mock-victim', status = 'active'
 where id = '00000000-0000-4000-8000-0000000000c1';
update public.locations set consent_at = now(), access_granted_at = now(), google_account_id = 'accounts/test',
  google_location_id = 'locations/concierge-other', status = 'active', concierge = true
 where id = '00000000-0000-4000-8000-0000000000c2';
insert into public.reviews (id, location_id, google_review_id, star_rating, review_created_at, state)
select ('00000000-0000-4000-8000-0000000001' || lpad(g::text, 2, '0'))::uuid, '00000000-0000-4000-8000-0000000000c1',
  'pipe-review-' || g, 5, now(), 'drafted'
  from generate_series(1, 6) g;
insert into public.reviews (id, location_id, google_review_id, star_rating, review_created_at, state)
values ('00000000-0000-4000-8000-000000000199', '00000000-0000-4000-8000-0000000000c2', 'concierge-review', 4, now(), 'drafted');

create temp table pub (name text primary key, id uuid, r jsonb);
create function pg_temp.approve(p_name text, p_review text, p_user text, p_channel text, p_text text default 'Thank you for coming.')
returns jsonb language sql as $$
  select public.approve_publication('review_reply', p_review::uuid, p_text, p_user::uuid, p_channel)
$$;
create function pg_temp.due(p_id uuid) returns void language sql as $$
  update public.publications set publish_after = now() - interval '1 second' where id = p_id
$$;

-- Shape and privileges.
select has_column('public', 'publications', c, 'publications.' || c || ' exists')
  from unnest(array['state', 'idempotency_key', 'publish_after', 'attempts', 'google_ref', 'moderation_state',
                    'last_checked_at', 'next_check_at', 'approved_by', 'approved_at', 'channel']) c;
select col_not_null('public', 'publications', 'state', 'every publication has a state');
select ok(
  (select bool_and(not has_function_privilege('anon', f, 'execute') and not has_function_privilege('authenticated', f, 'execute')
                   and has_function_privilege('service_role', f, 'execute'))
     from unnest(array['public.approve_publication(text,uuid,text,uuid,text,integer)', 'public.undo_publication(uuid,uuid)',
                       'public.claim_publication(uuid)', 'public.record_publication(uuid,text,text,text,text,text,jsonb,boolean)',
                       'public.claim_publication_check(uuid)', 'public.mock_google_reply(text,text)']) f),
  'the pipeline functions run for the service role only (the browser goes through api/approve and api/action)');

-- P0.1-13b part B: state is the only state column; status, its sync trigger and the old concierge path are gone.
select hasnt_column('public', 'publications', 'status', 'publications.status is dropped');
select hasnt_trigger('public', 'publications', 'publications_state', 'the state and status sync trigger is dropped');
select hasnt_function('public', 'concierge_queue_reply', 'concierge_queue_reply is dropped');
select hasnt_function('private', 'publication_state_of', 'publication_state_of is dropped');
select has_column('private', 'publications_status_backup_20261008', 'status', 'the backup of status is kept in private');
select ok(not has_table_privilege('authenticated', 'private.publications_status_backup_20261008', 'select')
          and not has_table_privilege('anon', 'private.publications_status_backup_20261008', 'select'),
  'the browser cannot read the backup');
select is((select state from public.publications where target_id = '00000000-0000-4000-8000-0000000000e1'), 'approved',
  'a row inserted without a state reads as approved');

-- Approve: one publication, whatever channel or how many times.
insert into pub select 'a', (r ->> 'publication_id')::uuid, r from (select pg_temp.approve('a',
  '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-0000000000a1', 'dashboard') r) x;
select is((select r ->> 'created' from pub where name = 'a'), 'true', 'the first approval creates the publication');
select is((select state || '/' || route || '/' || channel from public.publications p join pub on pub.id = p.id where pub.name = 'a'),
  'approved/api/dashboard', 'it starts approved, with the channel');
select is((select publish_after - approved_at from public.publications p join pub on pub.id = p.id where pub.name = 'a'),
  interval '10 seconds', 'it goes to Google 10 seconds after the approval (K-70)');
select is((select idempotency_key from public.publications p join pub on pub.id = p.id where pub.name = 'a'),
  'review_reply:00000000-0000-4000-8000-000000000101:1', 'the idempotency key names the reply and the attempt');
select is((select state from public.reviews where id = '00000000-0000-4000-8000-000000000101'), 'publishing', 'the review is claimed');
select is((select count(*) from public.jobs j join pub on j.dedupe_key = 'publish:' || pub.id where pub.name = 'a'
            and j.next_run_at = (select publish_after from public.publications where id = pub.id)), 1::bigint,
  'one publish job, due when the undo window ends');
select is((select count(*) from public.audit_events e where e.action = 'approval' and e.channel = 'dashboard'
            and e.object_id = '00000000-0000-4000-8000-000000000101'), 1::bigint, 'the approval is in the audit log');

select is(pg_temp.approve('a2', '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-0000000000a1', 'email_link') ->> 'publication_id',
  (select id::text from pub where name = 'a'), 'an email approval of the same reply returns the same publication');
select is(pg_temp.approve('a3', '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-0000000000a1', 'dashboard') ->> 'created',
  'false', 'a second tap creates nothing');
select is((select count(*) from public.publications where target_id = '00000000-0000-4000-8000-000000000101'), 1::bigint,
  'still one publication for the reply');
select is((select count(*) from public.jobs where dedupe_key like 'publish:%' and payload ->> 'publication_id' = (select id::text from pub where name = 'a')),
  1::bigint, 'still one publish job');

select throws_ok($$ select pg_temp.approve('x', '00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-0000000000b2', 'dashboard') $$,
  'P0001', 'approver_not_member', 'someone outside the business cannot approve');
select throws_ok($$ select pg_temp.approve('x', '00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-0000000000a1', 'dashboard', '  ') $$,
  'P0001', 'bad_reply_text', 'an empty reply is refused');
select throws_ok($$ select pg_temp.approve('x', '00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-0000000000a1', 'whatsapp') $$,
  'P0001', 'bad_channel', 'an unknown channel is refused');

-- Claim: not before publish_after, once.
select is(public.claim_publication((select id from pub where name = 'a')) ->> 'result', 'not_due', 'no claim inside the undo window');
select pg_temp.due((select id from pub where name = 'a'));
select is(public.claim_publication((select id from pub where name = 'a')) ->> 'result', 'claimed', 'claimed once due');
select is(public.claim_publication((select id from pub where name = 'a')) ->> 'result', 'not_approved', 'a second claim gets nothing');
select is((select state || '/' || attempts from public.publications p join pub on pub.id = p.id where pub.name = 'a'),
  'publishing/1', 'publishing, one attempt');

-- Google answered: published, then verified.
select is(public.record_publication((select id from pub where name = 'a'), 'published', p_google_ref => 'accounts/test/locations/mock-victim/reviews/pipe-review-1'),
  'published', 'published');
select is((select state || '/' || reply_state || '/' || existing_reply from public.reviews where id = '00000000-0000-4000-8000-000000000101'),
  'posted/in_review/Thank you for coming.', 'the review shows the reply as sent');
select is(public.record_publication((select id from pub where name = 'a'), 'verified'), 'verified', 'verified');
select is((select state from public.publications p join pub on pub.id = p.id where pub.name = 'a'), 'verified', 'the publication is verified');
select is((select reply_state from public.reviews where id = '00000000-0000-4000-8000-000000000101'), 'live', 'the review shows it live');
select is((select count(*) from public.audit_events where action = 'publication' and result = 'live'
            and object_id = '00000000-0000-4000-8000-000000000101'), 1::bigint, 'the publication is in the audit log');
select throws_like($$ select public.record_publication((select id from pub where name = 'a'), 'published') $$,
  'bad_transition%', 'a finished publication cannot move back');

-- Undo (K-70).
insert into pub select 'u', (r ->> 'publication_id')::uuid, r from (select pg_temp.approve('u',
  '00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-0000000000a1', 'email_link') r) x;
select throws_ok(format('select public.undo_publication(%L, %L)', (select id from pub where name = 'u'), '00000000-0000-4000-8000-0000000000b2'),
  'P0001', 'not_member', 'someone outside the business cannot undo');
select is(public.undo_publication((select id from pub where name = 'u'), '00000000-0000-4000-8000-0000000000a1') ->> 'state', 'cancelled',
  'undo inside the 10 seconds cancels');
select is((select state from public.reviews where id = '00000000-0000-4000-8000-000000000102'), 'drafted', 'the review is back with the owner');
select pg_temp.due((select id from pub where name = 'u'));
select is(public.claim_publication((select id from pub where name = 'u')) ->> 'result', 'not_approved', 'an undone approval is never claimed');
select is((select count(*) from public.audit_events where action = 'publication' and result = 'cancelled'
            and object_id = '00000000-0000-4000-8000-000000000102'), 1::bigint, 'the undo is in the audit log');
insert into pub select 'u2', (r ->> 'publication_id')::uuid, r from (select pg_temp.approve('u2',
  '00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-0000000000a1', 'dashboard') r) x;
select is((select idempotency_key from public.publications p join pub on pub.id = p.id where pub.name = 'u2'),
  'review_reply:00000000-0000-4000-8000-000000000102:2', 'approving again after undo is a new attempt');
select pg_temp.due((select id from pub where name = 'u2'));
select throws_ok(format('select public.undo_publication(%L, %L)', (select id from pub where name = 'u2'), '00000000-0000-4000-8000-0000000000a1'),
  'P0001', 'too_late', 'no undo once the 10 seconds are over');

-- Rejected: back to the owner with the reason, and can be approved again.
insert into pub select 'r', (r ->> 'publication_id')::uuid, r from (select pg_temp.approve('r',
  '00000000-0000-4000-8000-000000000103', '00000000-0000-4000-8000-0000000000a1', 'dashboard') r) x;
select pg_temp.due((select id from pub where name = 'r'));
select public.claim_publication((select id from pub where name = 'r'));
select is(public.record_publication((select id from pub where name = 'r'), 'rejected', 'Google did not accept this reply. Edit it and approve again.',
  'google 400 mock'), 'rejected', 'rejected');
select is((select state || '/' || reply_state || '/' || reply_state_reason from public.reviews where id = '00000000-0000-4000-8000-000000000103'),
  'drafted/rejected/Google did not accept this reply. Edit it and approve again.', 'the owner gets the review back with the reason');
select is((select state from public.publications p join pub on pub.id = p.id where pub.name = 'r'), 'rejected', 'the publication is rejected');
insert into pub select 'r2', (r ->> 'publication_id')::uuid, r from (select pg_temp.approve('r2',
  '00000000-0000-4000-8000-000000000103', '00000000-0000-4000-8000-0000000000a1', 'dashboard') r) x;
select is((select r ->> 'created' from pub where name = 'r2'), 'true', 'a rejected reply can be approved again');

-- Checking (Google moderation or an ambiguous failure) and the reconcile schedule.
insert into pub select 'c', (r ->> 'publication_id')::uuid, r from (select pg_temp.approve('c',
  '00000000-0000-4000-8000-000000000104', '00000000-0000-4000-8000-0000000000a1', 'dashboard') r) x;
select pg_temp.due((select id from pub where name = 'c'));
select public.claim_publication((select id from pub where name = 'c'));
select is(public.record_publication((select id from pub where name = 'c'), 'checking', p_error => 'mock timeout', p_moderation => 'unknown'),
  'checking', 'an ambiguous failure goes to checking, not to a retry');
select is((select next_check_at - now() from public.publications p join pub on pub.id = p.id where pub.name = 'c'), interval '10 minutes',
  'first check after 10 minutes');
select is((select state || '/' || reply_state || '/' || reply_state_reason from public.reviews where id = '00000000-0000-4000-8000-000000000104'),
  'posted/in_review/Google is checking your reply', 'the owner sees "Google is checking your reply" (K-116.1)');
select is(public.claim_publication_check((select id from pub where name = 'c')) ->> 'result', 'not_due', 'no check before it is due');
update public.publications set next_check_at = now() - interval '1 second' where id = (select id from pub where name = 'c');
select is(public.claim_publication_check((select id from pub where name = 'c')) ->> 'result', 'claimed', 'a due check is claimed');
select is(public.claim_publication_check((select id from pub where name = 'c')) ->> 'result', 'not_checking', 'and only once');
select is(public.record_publication((select id from pub where name = 'c'), 'checking', 'Google is checking your reply'), 'checking', 'still not shown');
select is((select checks || '/' || (next_check_at - now())::text from public.publications p join pub on pub.id = p.id where pub.name = 'c'),
  '1/00:30:00', 'the next check is 30 minutes later (widening)');
select is(private.publication_check_delay(n), d, 'check ' || n || ' waits ' || d)
  from (values (2, interval '1 hour'), (3, interval '3 hours'), (4, interval '6 hours'), (5, interval '12 hours'), (9, interval '24 hours')) v(n, d);
update public.publications set next_check_at = now() - interval '1 second' where id = (select id from pub where name = 'c');
select public.claim_publication_check((select id from pub where name = 'c'));
select is(public.record_publication((select id from pub where name = 'c'), 'verified'), 'verified', 'verified once Google shows the reply');
select is((select reply_state from public.reviews where id = '00000000-0000-4000-8000-000000000104'), 'live', 'the review shows it live');

-- Seven days without the reply on Google: failed, back to the owner, never posted again.
insert into pub select 'f', (r ->> 'publication_id')::uuid, r from (select pg_temp.approve('f',
  '00000000-0000-4000-8000-000000000105', '00000000-0000-4000-8000-0000000000a1', 'dashboard') r) x;
select pg_temp.due((select id from pub where name = 'f'));
select public.claim_publication((select id from pub where name = 'f'));
select public.record_publication((select id from pub where name = 'f'), 'checking', p_moderation => 'pending');
update public.publications set approved_at = now() - interval '8 days', next_check_at = now() - interval '1 second'
 where id = (select id from pub where name = 'f');
select public.claim_publication_check((select id from pub where name = 'f'));
select is(public.record_publication((select id from pub where name = 'f'), 'checking'), 'failed', 'after 7 days a missing reply is failed');
select is((select state || '/' || reply_state from public.reviews where id = '00000000-0000-4000-8000-000000000105'),
  'drafted/rejected', 'and the review goes back to the owner');

-- Producers: a write whose worker stopped goes to checking (never back to approved); due work is offered.
insert into pub select 's', (r ->> 'publication_id')::uuid, r from (select pg_temp.approve('s',
  '00000000-0000-4000-8000-000000000106', '00000000-0000-4000-8000-0000000000a1', 'dashboard') r) x;
select pg_temp.due((select id from pub where name = 's'));
select public.claim_publication((select id from pub where name = 's'));
update public.publications set claimed_at = now() - interval '11 minutes' where id = (select id from pub where name = 's');
update public.jobs set state = 'succeeded', finished_at = now() where dedupe_key like 'publish:%' or dedupe_key like 'reconcile_publication:%';
update public.publications set publish_after = now() - interval '1 second' where id = (select id from pub where name = 'r2');
select private.produce_jobs();
select is((select state || '/' || moderation_state from public.publications p join pub on pub.id = p.id where pub.name = 's'),
  'checking/unknown', 'a publication stuck in publishing goes to checking');
select is((select count(*) from public.jobs where kind = 'reconcile_publication' and state = 'pending'
            and payload ->> 'publication_id' = (select id::text from pub where name = 's')), 1::bigint, 'and its check is offered');
select is((select count(*) from public.jobs where kind = 'publish' and state = 'pending'
            and payload ->> 'publication_id' = (select r ->> 'publication_id' from pub where name = 'r2')), 1::bigint,
  'a due approval without an open job is offered again (safety net)');
select is((select count(*) from public.jobs where kind = 'publish' and state = 'pending'
            and payload ->> 'publication_id' = (select id::text from pub where name = 'u')), 0::bigint, 'an undone approval is not offered');
select is((select count(*) from public.jobs where kind = 'publish' and state = 'pending'
            and payload ->> 'publication_id' = (select id::text from public.publications where target_id = '00000000-0000-4000-8000-0000000000e1')),
  0::bigint, 'an old-path row without publish_after is not offered');

-- Concierge (D267): the claim makes the concierge task, not a Google call; staff "Mark posted" still makes it live.
insert into pub select 'k', (r ->> 'publication_id')::uuid, r from (select pg_temp.approve('k',
  '00000000-0000-4000-8000-000000000199', '00000000-0000-4000-8000-0000000000b2', 'dashboard') r) x;
select is((select r ->> 'route' from pub where name = 'k'), 'concierge', 'a concierge business approves on the concierge route');
select pg_temp.due((select id from pub where name = 'k'));
select is(public.claim_publication((select id from pub where name = 'k')) ->> 'result', 'concierge', 'the claim hands it to a person');
select is((select count(*) from public.concierge_tasks where kind = 'post_reply' and publication_id = (select id from pub where name = 'k')),
  1::bigint, 'one concierge task');
select is((select state || '/' || route from public.publications p join pub on pub.id = p.id where pub.name = 'k'),
  'publishing/concierge', 'waiting for the person');
select throws_ok($$ update public.publications set state = 'verified' where id = (select id from pub where name = 'k') $$,
  '23514', null, 'a concierge reply cannot be verified without the person who posted it');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a3","role":"authenticated"}', true);
select is(public.staff_concierge_mark_posted((select id from public.concierge_tasks where publication_id = (select id from pub where name = 'k'))) ->> 'ok',
  'true', 'staff Mark posted');
select set_config('request.jwt.claims', '', true);
select is((select state || '/' || (posted_manually_by is not null)::text from public.publications p join pub on pub.id = p.id where pub.name = 'k'),
  'verified/true', 'posted by hand reads as verified, with the person');
select is((select row(actor_type, result, before ->> 'status', after ->> 'state')::text from public.audit_events
            where action = 'publication' and after ->> 'publication_id' = (select id::text from pub where name = 'k')),
  row('staff', 'live', 'queued', 'verified')::text, 'the audit line keeps its words, mapped from state');

-- The mock reviews API: counts calls and plays the test modes.
insert into public.mock_google_reviews (review_id, google_location_id, reviewer_name, star_rating, reply_mode)
values ('m-ok', 'locations/mock-victim', 'A', 5, null), ('m-pending', 'locations/mock-victim', 'B', 5, 'pending'),
       ('m-timeout', 'locations/mock-victim', 'C', 5, 'timeout'), ('m-reject', 'locations/mock-victim', 'D', 5, 'reject');
select is(public.mock_google_reply(id, 'Thanks.'), want, 'mock reply ' || id || ' answers ' || want)
  from (values ('m-ok', 'ok'), ('m-pending', 'pending'), ('m-timeout', 'timeout'), ('m-reject', 'reject'), ('m-none', 'not_found')) v(id, want);
select is((select array_agg(review_id || ':' || reply_calls || ':' || coalesce(reply_comment, '-') || ':' || coalesce(pending_reply_comment, '-') order by review_id)
             from public.mock_google_reviews where review_id like 'm-%'),
  array['m-ok:1:Thanks.:-', 'm-pending:1:-:Thanks.', 'm-reject:1:-:-', 'm-timeout:1:Thanks.:-'],
  'each call is counted; pending is held out of sight, timeout is stored, reject stores nothing');

select * from finish();
rollback;
