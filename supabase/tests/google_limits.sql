-- P0.1-12b: Google rate limiter and circuit breaker (K-36), postponed jobs, and the cron steps as jobs (K-35, A8).
-- now() is fixed inside this transaction, so every call below happens "at the same moment" unless a row is moved.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

\ir _fixtures.psql

-- Shape and privileges.
select ok((select bool_and(relrowsecurity) from pg_class where oid in ('public.google_rate'::regclass, 'public.circuit_breaker'::regclass)),
  'RLS is on for google_rate and circuit_breaker');
select is(
  (select coalesce(array_agg(t || ':' || r || ':' || p order by t, r, p), '{}')
     from unnest(array['public.google_rate', 'public.circuit_breaker']) t, unnest(array['anon', 'authenticated', 'service_role']) r,
          unnest(array['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE']) p
    where has_table_privilege(r, t, p)
       or (r <> 'service_role' and has_table_privilege(r, t, 'SELECT'))),
  '{}'::text[], 'nobody writes the limiter tables directly; only the service role reads them');
select ok(
  (select bool_and(not has_function_privilege('anon', f, 'execute') and not has_function_privilege('authenticated', f, 'execute')
                   and has_function_privilege('service_role', f, 'execute'))
     from unnest(array['public.google_gate(text)', 'public.google_failure()',
                       'public.postpone_job(bigint,text,timestamp with time zone,text)']) f),
  'google_gate, google_failure and postpone_job run for the service role only');
select ok(
  (select bool_and(not has_function_privilege(r, f, 'execute'))
     from unnest(array['private.google_circuit()', 'private.rate_take(text,integer,interval,boolean)',
                       'private.offer_every(text,interval,interval)']) f,
          unnest(array['anon', 'authenticated', 'service_role']) r),
  'the limiter internals and offer_every are out of reach of the API roles');

-- Project bucket: at most 4 Google requests a second.
create temp table gates (n integer primary key, g jsonb);
insert into gates select n, public.google_gate(null) from generate_series(1, 4) n order by n;
select is((select array_agg(g ->> 'wait_ms' order by n) from gates), array['0', '0', '0', '0'], 'four reads in one second go at once');
select is(public.google_gate(null) ->> 'wait_ms', '1000', 'the fifth in the same second waits one second');
select is((select cardinality(hits) from public.google_rate where bucket = 'project'), 4, 'a request that waits takes no place');

-- Profile bucket: at most 5 edits a minute to one profile. The project bucket is emptied between edits so only the
-- profile limit is under test.
create function pg_temp.edit(p_profile text) returns jsonb language plpgsql as $$
begin
  update public.google_rate set hits = '{}' where bucket = 'project';
  return public.google_gate(p_profile);
end $$;
delete from gates;
insert into gates select n, pg_temp.edit('locations/42') from generate_series(1, 5) n order by n;
select is((select array_agg(g ->> 'wait_ms' order by n) from gates), array['0', '0', '0', '0', '0'],
  'five edits to one profile in a minute go at once');
select is(pg_temp.edit('locations/42') ->> 'wait_ms', '60000', 'a sixth edit in the same minute waits a minute');
select is((select cardinality(hits) from public.google_rate where bucket = 'profile:locations/42'), 5,
  'the waiting edit takes no place for the profile');
select is((select cardinality(hits) from public.google_rate where bucket = 'project'), 0,
  'nor from the project: a wait never uses up a place');
select is(pg_temp.edit(null) ->> 'wait_ms', '0', 'a read of the same profile is not held by its edit limit');
select is(pg_temp.edit('locations/43') ->> 'wait_ms', '0', 'another profile has its own five edits');
update public.google_rate set hits = array(select h - interval '50 seconds' from unnest(hits) h) where bucket = 'profile:locations/42';
update public.google_rate set hits = hits[2:5] || (now() - interval '20 seconds') where bucket = 'profile:locations/42';
select is(pg_temp.edit('locations/42') ->> 'wait_ms', '10000',
  'the sixth edit waits only until the oldest of the five is a minute old');
update public.google_rate set hits = array(select h - interval '61 seconds' from unnest(hits) h) where bucket = 'profile:locations/42';
select is(pg_temp.edit('locations/42') ->> 'wait_ms', '0', 'a minute later the profile can be edited again');

-- Circuit breaker: 20 failures inside a minute open it for 5 minutes, with one alert; it closes on its own.
update public.google_rate set hits = '{}';
select public.google_failure() from generate_series(1, 19);
select is((select row(state, failures)::text from public.circuit_breaker where name = 'google'), row('closed', 19)::text,
  '19 failures inside a minute leave the breaker closed');
update public.circuit_breaker set window_start = now() - interval '61 seconds' where name = 'google';
select public.google_failure();
select is((select row(state, failures)::text from public.circuit_breaker where name = 'google'), row('closed', 1)::text,
  'failures older than a minute do not count: a new minute starts at 1');
select public.google_failure() from generate_series(1, 19);
select is((select row(state, open_until)::text from public.circuit_breaker where name = 'google'),
  row('open', now() + interval '5 minutes')::text, 'the 20th failure inside a minute opens the breaker for 5 minutes');
select is((select count(*) from public.ops_events where kind = 'circuit_open' and channel = 'alerts'), 1::bigint,
  'opening raises one #kabsi-alerts message');
select is(public.google_gate(null) ->> 'open_until', (to_jsonb(now() + interval '5 minutes') #>> '{}'),
  'while open, the gate refuses every Google request and says until when');
select is(public.google_gate('locations/42') ->> 'open_until', (to_jsonb(now() + interval '5 minutes') #>> '{}'),
  'writes too');
select is((select coalesce(sum(cardinality(hits)), 0) from public.google_rate)::integer, 0, 'and nothing is counted while open');
select public.google_failure() from generate_series(1, 30);
select is((select count(*) from public.ops_events where kind = 'circuit_open'), 1::bigint,
  'failures while open neither reopen it nor alert again');
update public.circuit_breaker set open_until = now() - interval '1 second' where name = 'google';
select is(public.google_gate(null) ->> 'wait_ms', '0', 'after the 5 minutes the gate lets requests through again');
select is((select row(state, failures)::text from public.circuit_breaker where name = 'google'), row('closed', 0)::text,
  'the breaker is closed with a fresh count');
select is((select count(*) from public.ops_events where kind = 'circuit_closed' and channel = 'alerts'), 1::bigint,
  'closing raises one message');

-- A postponed job: back in the queue at the given time, the try not counted.
create temp table ids (name text primary key, id bigint);
insert into ids values ('busy', public.enqueue_job('test_job', null, 'test:busy'));
select public.claim_jobs(1, 'worker-1');
select is(public.postpone_job((select id from ids where name = 'busy'), 'worker-2', now() + interval '5 minutes', 'google paused'), null,
  'another worker cannot postpone a job it does not hold');
select is(public.postpone_job((select id from ids where name = 'busy'), 'worker-1', now() + interval '5 minutes', 'google paused'),
  'pending', 'the worker puts the job back');
select is((select row(state, attempts, next_run_at, locked_by, last_error)::text from public.jobs where id = (select id from ids where name = 'busy')),
  row('pending', 0, now() + interval '5 minutes', null::text, 'google paused')::text,
  'it waits until the breaker closes, with the try not counted');
select is((select count(*) from public.claim_jobs(10, 'worker-3') c where c.id = (select id from ids where name = 'busy')), 0::bigint,
  'it is not claimed before then');
select is(public.enqueue_job('test_job', null, 'test:busy'), null, 'its dedupe key stays taken');

-- Protection as one job per business, and the cron's whole-system steps as jobs.
update public.locations set status = 'paused' where id <> '00000000-0000-4000-8000-0000000000c1';
update public.locations set status = 'active', consent_at = now(), access_granted_at = now(),
  google_account_id = 'accounts/mock', google_location_id = 'locations/mock-victim'
 where id = '00000000-0000-4000-8000-0000000000c1';
delete from public.jobs;
create temp table made (n integer primary key, r jsonb);
insert into made values (1, private.produce_jobs());
select is((select count(*) from public.jobs where kind = 'protection_check'), 0::bigint,
  'a business seen for the first time gets its own Protection start time and no check yet');
select ok((select next_protection_at between now() and now() + interval '5 minutes' from public.google_connections
            where location_id = '00000000-0000-4000-8000-0000000000c1'), 'its first check is inside the next 5 minutes');
update public.google_connections set next_protection_at = now() - interval '1 second' where location_id = '00000000-0000-4000-8000-0000000000c1';
select is(private.produce_jobs() ->> 'protection_check', '1', 'a due business gets a Protection job');
select is((select next_protection_at from public.google_connections where location_id = '00000000-0000-4000-8000-0000000000c1'),
  now() + interval '5 minutes', 'on the mock its next check is 5 minutes later');
update public.google_connections set next_protection_at = now() - interval '1 second' where location_id = '00000000-0000-4000-8000-0000000000c1';
select is(private.produce_jobs() ->> 'protection_check', '0', 'no second Protection job while the first is pending');
delete from public.jobs where kind = 'protection_check';
update public.app_settings set value = 'live' where key = 'google_mode';
update public.google_connections set next_protection_at = now() - interval '1 second' where location_id = '00000000-0000-4000-8000-0000000000c1';
select is(private.produce_jobs() ->> 'protection_check', '1', 'on live Google the business still gets its check');
select is((select next_protection_at from public.google_connections where location_id = '00000000-0000-4000-8000-0000000000c1'),
  now() + interval '1 hour', 'but the next one only an hour later');
update public.app_settings set value = 'mock' where key = 'google_mode';
update public.locations set concierge = true, google_location_id = 'locations/concierge-victim'
 where id = '00000000-0000-4000-8000-0000000000c1';
delete from public.jobs where kind = 'protection_check';
update public.google_connections set next_protection_at = now() - interval '1 second' where location_id = '00000000-0000-4000-8000-0000000000c1';
select is(private.produce_jobs() ->> 'protection_check', '0', 'a concierge business gets no Protection job');

select is((select r ->> 'steps' from made where n = 1), '6', 'the first producer run offers the six whole-system steps');
select is((select array_agg(kind order by kind) from public.jobs where location_id is null and kind <> 'test_job'),
  array['access_check', 'deletions', 'ratings_snapshot', 'renewal_reminders', 'trial_reminders', 'weekly_reports'],
  'access, ratings, weekly reports, deletions, trial and renewal reminders');
select ok((select bool_and(next_run_at > now() and next_run_at <= now() + interval '5 minutes') from public.jobs where location_id is null and kind <> 'test_job'),
  'each runs at its next slot inside the next 5 minutes');
select is((select count(distinct extract(minute from next_run_at)::integer % 5) from public.jobs where location_id is null and kind <> 'test_job'), 5::bigint,
  'spread over the five minutes, not all at once');
select is(private.produce_jobs() ->> 'steps', '0', 'and not offered again while they wait');
update public.jobs set state = 'succeeded', finished_at = now() where kind = 'access_check';
select is(private.produce_jobs() ->> 'steps', '1', 'once a step has run, its next slot is offered');

-- The tick still wakes the dispatcher only when something is due, and clears rate buckets unused for a day.
delete from public.jobs where location_id is not null or kind = 'test_job';
update public.google_connections set next_sync_at = now() + interval '1 hour', next_protection_at = now() + interval '1 hour';
update public.locations set status = 'paused' where id = '00000000-0000-4000-8000-0000000000c1';
insert into public.google_rate (bucket, updated_at) values ('profile:locations/old', now() - interval '25 hours');
create temp table queued_before as select count(*) n from net.http_request_queue;
select private.dispatch_tick();
select is((select count(*) from net.http_request_queue) - (select n from queued_before), 0::bigint,
  'steps waiting for their slot do not wake the dispatcher');
select is((select count(*) from public.google_rate where bucket = 'profile:locations/old'), 0::bigint,
  'a rate bucket unused for a day is cleared');
update public.jobs set next_run_at = now() - interval '1 second' where kind = 'deletions';
select private.dispatch_tick();
select is((select count(*) from net.http_request_queue where url like '%/functions/v1/api/dispatch') , 1::bigint,
  'a step at its slot wakes the dispatcher');

select * from finish();
rollback;
