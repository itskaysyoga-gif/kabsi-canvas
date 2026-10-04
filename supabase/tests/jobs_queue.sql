-- P0.1-12a: job queue (K-35, R-06): who can touch it, dedupe, claim once, retries with backoff, dead after 5 tries,
-- a worker that stopped, the review producers, per-business sync status and the staff view. The two-session claim
-- race is in jobs_claim_concurrency.sh (run by scripts/db-test.sh).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

\ir _fixtures.psql

-- Shape and privileges.
select has_table('public', 'jobs', 'jobs exists');
select ok((select relrowsecurity from pg_class where oid = 'public.jobs'::regclass), 'RLS is on for jobs');
select is(
  (select coalesce(array_agg(r || ':' || p order by r, p), '{}') from unnest(array['anon', 'authenticated']) r,
     unnest(array['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE']) p
   where has_table_privilege(r, 'public.jobs', p)),
  '{}'::text[], 'anon and authenticated have no privilege on jobs');
select is(
  (select coalesce(array_agg(p order by p), '{}') from unnest(array['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE']) p
   where has_table_privilege('service_role', 'public.jobs', p)),
  '{}'::text[], 'the service role writes jobs only through the functions');
select ok(
  (select bool_and(not has_function_privilege('anon', f, 'execute') and not has_function_privilege('authenticated', f, 'execute')
                   and has_function_privilege('service_role', f, 'execute'))
     from unnest(array['public.enqueue_job(text,uuid,text,jsonb,timestamp with time zone)', 'public.claim_jobs(integer,text)',
                       'public.finish_job(bigint,text,boolean,text,boolean)', 'public.record_sync_result(uuid,boolean,text)']) f),
  'enqueue_job, claim_jobs, finish_job and record_sync_result run for the service role only');
select ok(
  (select bool_and(not has_function_privilege(r, f, 'execute'))
     from unnest(array['private.produce_jobs()', 'private.dispatch_tick()']) f,
          unnest(array['anon', 'authenticated', 'service_role']) r),
  'the producers run from pg_cron only');

-- Dedupe while open.
create temp table ids (name text primary key, id bigint);
insert into ids values ('a', public.enqueue_job('test_job', null, 'test:a'));
select is(public.enqueue_job('test_job', null, 'test:a'), null, 'the same dedupe key is refused while the job is pending');
insert into ids values ('later', public.enqueue_job('test_job', null, 'test:later', '{}', now() + interval '1 hour'));
select is((select count(*) from public.jobs where dedupe_key = 'test:a'), 1::bigint, 'one job for the key');

-- Claimed once.
select is((select array_agg(id) from public.claim_jobs(10, 'worker-1')), (select array[id] from ids where name = 'a'),
  'a dispatcher claims the due job and not the one scheduled later');
select is((select count(*) from public.claim_jobs(10, 'worker-2')), 0::bigint, 'a second dispatcher gets nothing: claimed once');
select is((select row(state, attempts, locked_by)::text from public.jobs where id = (select id from ids where name = 'a')),
  row('running', 1, 'worker-1')::text, 'the claim marks the job running, counts the try and names the worker');
select is(public.enqueue_job('test_job', null, 'test:a'), null, 'the dedupe key is still taken while the job runs');
select is(public.finish_job((select id from ids where name = 'a'), 'worker-2', true), null,
  'another worker cannot finish a job it does not hold');

-- Retries with backoff, then dead after 5 tries with an alert.
select is(public.finish_job((select id from ids where name = 'a'), 'worker-1', false, 'google 500'), 'retrying',
  'a failed try is retried');
select ok((select next_run_at between now() + interval '24 seconds' and now() + interval '36 seconds'
             from public.jobs where id = (select id from ids where name = 'a')),
  'the first retry waits about 30 seconds');
select is(public.enqueue_job('test_job', null, 'test:a'), null, 'the dedupe key is still taken while the job waits to retry');
create function pg_temp.fail_again(p_id bigint) returns interval language plpgsql as $$
begin
  update public.jobs set next_run_at = now() - interval '1 second' where id = p_id;
  perform public.claim_jobs(1, 'worker-1');
  perform public.finish_job(p_id, 'worker-1', false, 'google 500 again');
  return (select next_run_at - now() from public.jobs where id = p_id);
end $$;
-- One call per try, kept in a table (BETWEEN would evaluate the call twice).
create temp table waits (try integer primary key, wait interval);
insert into waits select t, pg_temp.fail_again((select id from ids where name = 'a')) from generate_series(2, 5) t order by t;
select ok((select wait between interval '48 seconds' and interval '72 seconds' from waits where try = 2),
  'the second retry waits about a minute');
select ok((select wait between interval '96 seconds' and interval '144 seconds' from waits where try = 3),
  'the third retry waits about two minutes');
select ok((select wait > interval '3 minutes' from waits where try = 4), 'the fourth retry waits longer still');
select is((select row(state, attempts, finished_at is not null)::text from public.jobs where id = (select id from ids where name = 'a')),
  row('dead', 5, true)::text, 'after 5 failed tries the job is dead');
select is((select count(*) from public.claim_jobs(10, 'worker-3') c where c.id = (select id from ids where name = 'a')), 0::bigint,
  'a dead job is never claimed again');
select is((select count(*) from public.ops_events where kind = 'job_dead' and dedupe_key = 'job_stopped:' || (select id from ids where name = 'a')),
  1::bigint, 'a dead job raises one alert');
select isnt(public.enqueue_job('test_job', null, 'test:a'), null, 'the same work can be offered again once the job is dead');
delete from public.jobs where dedupe_key = 'test:a' and state = 'pending';

-- A handler that rules out a retry, and a worker that stopped mid-job.
update public.jobs set next_run_at = now() where id = (select id from ids where name = 'later');
select is((select count(*) from public.claim_jobs(1, 'worker-4')), 1::bigint, 'the rescheduled job is claimed');
select is(public.finish_job((select id from ids where name = 'later'), 'worker-4', false, 'no handler', false), 'failed',
  'no retry when the handler rules it out');
insert into ids values ('stuck', public.enqueue_job('test_job', null, 'test:stuck'));
select public.claim_jobs(1, 'worker-5');
update public.jobs set locked_at = now() - interval '11 minutes' where id = (select id from ids where name = 'stuck');
select is((select row(c.attempts, c.locked_by)::text from public.claim_jobs(5, 'worker-6') c where c.id = (select id from ids where name = 'stuck')),
  row(2, 'worker-6')::text, 'a job left running for 10 minutes counts as a failed try and is claimed again');
select is(public.finish_job((select id from ids where name = 'stuck'), 'worker-5', true), null,
  'the stopped worker can no longer finish it');

-- The review producers. The victim business is active and reads reviews from Google; every other business (the
-- demo businesses the migrations seed included) is paused so the counts below are the victim's alone.
update public.locations set status = 'paused' where id <> '00000000-0000-4000-8000-0000000000c1';
update public.locations set status = 'active', consent_at = now(), access_granted_at = now(),
  google_account_id = 'accounts/mock', google_location_id = 'locations/mock-victim'
 where id = '00000000-0000-4000-8000-0000000000c1';
update public.reviews set state = 'posted' where id = '00000000-0000-4000-8000-0000000000e1';
delete from public.jobs;
select private.produce_jobs();
select is((select count(*) from public.jobs where kind = 'sync_reviews'), 0::bigint,
  'a business seen for the first time gets its own start time and no sync yet');
select ok((select next_sync_at between now() and now() + interval '5 minutes' from public.google_connections
            where location_id = '00000000-0000-4000-8000-0000000000c1'), 'its first sync is inside the next 5 minutes');
update public.google_connections set next_sync_at = now() - interval '1 second' where location_id = '00000000-0000-4000-8000-0000000000c1';
select is(private.produce_jobs() ->> 'sync_reviews', '1', 'a due business gets a sync job');
select is((select next_sync_at from public.google_connections where location_id = '00000000-0000-4000-8000-0000000000c1'),
  now() + interval '5 minutes', 'and its next sync is 5 minutes later');
update public.google_connections set next_sync_at = now() - interval '1 second' where location_id = '00000000-0000-4000-8000-0000000000c1';
select is(private.produce_jobs() ->> 'sync_reviews', '0', 'no second sync job while the first is pending');
update public.locations set concierge = true, google_location_id = 'locations/concierge-victim'
 where id = '00000000-0000-4000-8000-0000000000c1';
delete from public.jobs;
update public.google_connections set next_sync_at = now() - interval '1 second' where location_id = '00000000-0000-4000-8000-0000000000c1';
select is(private.produce_jobs() ->> 'sync_reviews', '0', 'a concierge business is not read from Google');
update public.locations set concierge = false, google_location_id = 'locations/mock-victim'
 where id = '00000000-0000-4000-8000-0000000000c1';

update public.reviews set state = 'new', draft_attempts = 0 where id = '00000000-0000-4000-8000-0000000000e1';
select is(private.produce_jobs() ->> 'draft_reply', '1', 'a new review gets a draft job');
select is((select payload ->> 'review_id' from public.jobs where kind = 'draft_reply'), '00000000-0000-4000-8000-0000000000e1',
  'the draft job names the review');
select is(private.produce_jobs() ->> 'draft_reply', '0', 'and only one');
delete from public.jobs where kind = 'draft_reply';
update public.reviews set draft_attempts = 3 where id = '00000000-0000-4000-8000-0000000000e1';
select is(private.produce_jobs() ->> 'draft_reply', '0', 'a review that failed 3 drafts is left for the owner');

update public.reviews set state = 'drafted', notified_at = null, is_backlog = false, star_rating = 5, urgency = 'normal'
 where id = '00000000-0000-4000-8000-0000000000e1';
-- Digest at 23:00 in a zone where it is not yet 23:00.
update public.locations set digest_hour = 23,
  time_zone = case when extract(hour from now() at time zone 'UTC') = 23 then 'Etc/GMT+1' else 'UTC' end
 where id = '00000000-0000-4000-8000-0000000000c1';
select is(private.produce_jobs() ->> 'notify_owner', '0', 'a 5 star draft waits for the digest hour');
update public.reviews set star_rating = 2 where id = '00000000-0000-4000-8000-0000000000e1';
select is(private.produce_jobs() ->> 'notify_owner', '1', 'a 2 star draft is emailed at once');
delete from public.jobs where kind = 'notify_owner';
update public.locations set emails_paused_until = now() + interval '1 day' where id = '00000000-0000-4000-8000-0000000000c1';
select is(private.produce_jobs() ->> 'notify_owner', '0', 'no owner email run while emails are paused');

-- The tick wakes the dispatcher only when a job is due (the request stays in this rolled-back transaction).
delete from public.jobs;
update public.google_connections set next_sync_at = now() + interval '1 hour';
update public.locations set status = 'paused' where id = '00000000-0000-4000-8000-0000000000c1';
create temp table queued_before as select count(*) n from net.http_request_queue;
select private.dispatch_tick();
select is((select count(*) from net.http_request_queue) - (select n from queued_before), 0::bigint, 'nothing due: no call');
select public.enqueue_job('test_job', null, 'test:tick');
select private.dispatch_tick();
select is((select count(*) from net.http_request_queue where url like '%/functions/v1/api/dispatch'), 1::bigint,
  'a due job: one call to the dispatcher');

-- Per-business sync status.
set local role service_role;
select public.record_sync_result('00000000-0000-4000-8000-0000000000c1', false, 'google 503');
reset role;
select is((select row(sync_status, last_error, last_attempted_sync_at is not null)::text from public.google_connections
            where location_id = '00000000-0000-4000-8000-0000000000c1'), row('error', 'google 503', true)::text,
  'a failed sync is recorded on google_connections');
select public.record_sync_result('00000000-0000-4000-8000-0000000000c1', true);
select is((select row(sync_status, last_error, last_successful_sync_at)::text from public.google_connections
            where location_id = '00000000-0000-4000-8000-0000000000c1'), row('ok', null::text, now())::text,
  'a successful sync clears the error and sets the last successful check');
select tests.act_as('00000000-0000-4000-8000-0000000000a1');
select is((select last_successful_sync_at from public.google_connections where location_id = '00000000-0000-4000-8000-0000000000c1'),
  now(), 'the owner reads the last successful check for Home');
reset role;

-- Staff see the jobs that stopped.
select public.claim_jobs(5, 'worker-7');
select public.finish_job((select id from public.jobs where dedupe_key = 'test:tick'), 'worker-7', false, 'no handler', false);
select tests.act_as('00000000-0000-4000-8000-0000000000a3');
select is((public.staff_job_health() -> 'stopped_jobs' -> 0 ->> 'state'), 'failed', 'staff job health lists a stopped job');
select ok((public.staff_job_health() -> 'queue') ? 'dead_7d', 'staff job health counts dead jobs');
reset role;

select * from finish();
rollback;
