-- P0.6-11 (K-44 staff part, K-36): the staff System health read. A forced dead job, a stuck `checking` publication and an
-- open circuit breaker each appear; retry moves a dead job back to pending and cancel closes it; only staff can run any
-- of it; nothing it returns names a credential. Staff is user ..a3 in the fixtures, the victim owner is ..a1.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();
create temp table ids as select 0::bigint as dead_job, 0::bigint as cancel_job, 0::bigint as dup_job;
grant select on ids to authenticated;

\ir _fixtures.psql

-- Closed to anon, open to authenticated (the function itself refuses anyone who is not staff).
select ok(
  (select bool_and(not has_function_privilege('anon', f, 'execute') and has_function_privilege('authenticated', f, 'execute'))
     from unnest(array['public.staff_system_health()', 'public.staff_job_retry(bigint)', 'public.staff_job_cancel(bigint)',
                       'public.staff_business_diagnostics(uuid)']) f),
  'the four staff functions are closed to anon');

-- The error types (plain names for what Google said).
select is(private.google_error_type('google 429 quota'), 'rate_limited', '429 is rate limited');
select is(private.google_error_type('google 503: backend unavailable'), 'google_server_error', '503 is a Google server error');
select is(private.google_error_type('google 403 PERMISSION_DENIED'), 'access_denied', '403 is access denied');
select is(private.google_error_type('google 404'), 'not_found', '404 is not found');
select is(private.google_error_type('fetch failed: timeout'), 'no_answer', 'a timeout is no answer');
select is(private.google_error_type(null), 'other', 'no message is other');

-- Staff only.
select tests.act_as('00000000-0000-4000-8000-0000000000b1');
select throws_ok($$ select public.staff_system_health() $$, '42501', null, 'a stranger cannot read System health');
select throws_ok($$ select public.staff_job_retry(1) $$, '42501', null, 'a stranger cannot retry a job');
select throws_ok($$ select public.staff_job_cancel(1) $$, '42501', null, 'a stranger cannot cancel a job');
select throws_ok($$ select public.staff_business_diagnostics('00000000-0000-4000-8000-0000000000c1') $$, '42501', null, 'a stranger cannot read a business diagnostics view');
reset role;
select tests.act_as('00000000-0000-4000-8000-0000000000a1');
select throws_ok($$ select public.staff_system_health() $$, '42501', null, 'the owner of a business cannot read System health');
reset role;

-- The forced failures: a dead job, a stuck checking publication, an open breaker, a failed photo, a dead email.
insert into public.jobs (kind, state, attempts, max_attempts, last_error, finished_at, location_id, dedupe_key)
values ('test_dead_job', 'dead', 5, 5, 'google 503: backend unavailable', now(), '00000000-0000-4000-8000-0000000000c1', 'test:dead');
insert into public.jobs (kind, state, attempts, max_attempts, last_error, finished_at, location_id, dedupe_key)
values ('test_cancel_job', 'dead', 5, 5, 'boom', now(), '00000000-0000-4000-8000-0000000000c1', 'test:cancel');
update ids set dead_job = (select id from public.jobs where dedupe_key = 'test:dead'),
               cancel_job = (select id from public.jobs where dedupe_key = 'test:cancel');
insert into public.publications (id, location_id, target_type, target_id, payload, approved_by, channel, state, approved_at, claimed_at, route)
values ('00000000-0000-4000-8000-0000000000d1', '00000000-0000-4000-8000-0000000000c1', 'review_reply',
        '00000000-0000-4000-8000-0000000000e1', '{}', '00000000-0000-4000-8000-0000000000a1', 'dashboard', 'checking',
        now() - interval '3 hours', now() - interval '3 hours', 'api');
insert into public.publications (id, location_id, target_type, target_id, payload, approved_by, channel, state, approved_at, claimed_at, route)
values ('00000000-0000-4000-8000-0000000000d2', '00000000-0000-4000-8000-0000000000c1', 'review_reply',
        '00000000-0000-4000-8000-0000000000e1', '{}', '00000000-0000-4000-8000-0000000000a1', 'dashboard', 'checking',
        now() - interval '10 minutes', now() - interval '10 minutes', 'api');
update public.circuit_breaker set state = 'open', opened_at = now(), open_until = now() + interval '5 minutes' where name = 'google';
insert into public.photos (id, location_id, storage_path, state, suitability_note, processed_at)
values ('00000000-0000-4000-8000-0000000000d3', '00000000-0000-4000-8000-0000000000c1', 'x/refused.jpg', 'refused', 'This file is not a photo.', now());
insert into public.emails (location_id, kind, to_address, subject, status, error)
values ('00000000-0000-4000-8000-0000000000c1', 'test', 'owner@example.test', 'S', 'failed', 'resend 500');

select tests.act_as('00000000-0000-4000-8000-0000000000a3');
create temp table health as select public.staff_system_health() h;
grant select on health to authenticated;

select ok((select h ->> 'checked_at' is not null from health), 'staff read System health');
select is((select count(*) from health, jsonb_array_elements(h -> 'dead_jobs') d where d ->> 'kind' = 'test_dead_job'), 1::bigint,
  'the forced dead job is listed');
select is((select d ->> 'last_error' from health, jsonb_array_elements(h -> 'dead_jobs') d where d ->> 'kind' = 'test_dead_job'),
  'google 503: backend unavailable', 'with its error');
select is((select count(*) from health, jsonb_array_elements(h -> 'publications' -> 'stuck') s where s ->> 'id' = '00000000-0000-4000-8000-0000000000d1'),
  1::bigint, 'a publication in checking for 3 hours is stuck');
select is((select count(*) from health, jsonb_array_elements(h -> 'publications' -> 'stuck') s where s ->> 'id' = '00000000-0000-4000-8000-0000000000d2'),
  0::bigint, 'a publication in checking for 10 minutes is not stuck yet');
select is((select h -> 'google' -> 'breaker' ->> 'state' from health), 'open', 'the open breaker shows');
select ok((select (h -> 'google' -> 'breaker' ->> 'open_until') is not null from health), 'with the time it closes');
select ok((select h -> 'google' -> 'errors_24h' @> '[{"type": "google_server_error"}]'::jsonb from health),
  'Google errors are counted by type');
select is((select count(*) from health, jsonb_array_elements(h -> 'photos' -> 'recent') p where p ->> 'id' = '00000000-0000-4000-8000-0000000000d3'),
  1::bigint, 'the refused photo is listed with its reason');
select cmp_ok((select (h -> 'delivery' ->> 'emails_failed_24h')::int from health), '>=', 1, 'the failed email is counted');
select ok((select h -> 'queue' ? 'oldest_due_seconds' from health), 'the queue shows how long the oldest due job has waited');
select ok((select h -> 'google' -> 'places' ? 'daily_cap' from health), 'the Places cap and use show');

-- Retry and cancel.
select is((select public.staff_job_retry(dead_job) ->> 'state' from ids), 'pending', 'retry answers pending');
select throws_ok($$ select public.staff_job_retry((select dead_job from ids)) $$, 'P0001', 'not_dead', 'a job that is not dead cannot be retried');
select is((select public.staff_job_cancel(cancel_job) ->> 'state' from ids), 'failed', 'cancel closes a dead job as failed');
select throws_ok($$ select public.staff_job_cancel(0) $$, 'P0001', 'not_found', 'an unknown job is refused');
reset role;
select is((select state || ':' || attempts::text || ':' || coalesce(last_error, 'none') from public.jobs where id = (select dead_job from ids)),
  'pending:0:none', 'retry moves the dead job back to pending with fresh tries');
select ok((select last_error like 'cancelled by staff%' from public.jobs where id = (select cancel_job from ids)), 'cancel leaves the reason');
-- The same work already open blocks a retry.
insert into public.jobs (kind, state, attempts, max_attempts, finished_at, dedupe_key) values ('test_dup', 'dead', 5, 5, now() - interval '1 hour', 'test:dup');
insert into public.jobs (kind, state, dedupe_key) values ('test_dup', 'pending', 'test:dup');
update ids set dup_job = (select id from public.jobs where dedupe_key = 'test:dup' and state = 'dead');
select tests.act_as('00000000-0000-4000-8000-0000000000a3');
select throws_ok($$ select public.staff_job_retry((select dup_job from ids)) $$,
  'P0001', 'already_open', 'a dead job whose work is already open is not retried twice');
reset role;
select ok(
  (select count(*) = 2 from public.audit_events where action in ('staff_job_retry', 'staff_job_cancel') and actor_type = 'staff'),
  'retry and cancel are recorded in the audit log');

-- One business, technical terms only.
select tests.act_as('00000000-0000-4000-8000-0000000000a3');
create temp table diag as select public.staff_business_diagnostics('00000000-0000-4000-8000-0000000000c1') d;
grant select on diag to authenticated;
select is((select d -> 'business' ->> 'name' from diag), 'Victim Bakery', 'diagnostics name the business');
select ok((select d -> 'google' ? 'access_state' from diag), 'with its Google access state');
select ok((select jsonb_array_length(d -> 'publications') >= 2 from diag), 'its recent publications');
reset role;

-- Never a credential, a token, review text or a reviewer name, in any key of either answer.
select is(
  (select count(*) from (
     with recursive walk(k, v) as (
       select null::text, h from health
       union all
       select e.k, e.v from walk, lateral (
         select key k, value v from jsonb_each(case when jsonb_typeof(walk.v) = 'object' then walk.v else '{}'::jsonb end)
         union all
         select null::text, elem from jsonb_array_elements(case when jsonb_typeof(walk.v) = 'array' then walk.v else '[]'::jsonb end) elem) e
     ) select k from walk where k ~* 'token|secret|password|refresh|credential|api_?key|comment|reviewer|body|payload'
   ) x), 0::bigint, 'System health holds no credential, review text or reviewer name key');
select is(
  (select count(*) from (
     with recursive walk(k, v) as (
       select null::text, d from diag
       union all
       select e.k, e.v from walk, lateral (
         select key k, value v from jsonb_each(case when jsonb_typeof(walk.v) = 'object' then walk.v else '{}'::jsonb end)
         union all
         select null::text, elem from jsonb_array_elements(case when jsonb_typeof(walk.v) = 'array' then walk.v else '[]'::jsonb end) elem) e
     ) select k from walk where k ~* 'token|secret|password|refresh|credential|api_?key|comment|reviewer|body|payload'
   ) x), 0::bigint, 'the business diagnostics hold none either');

select * from finish();
rollback;
