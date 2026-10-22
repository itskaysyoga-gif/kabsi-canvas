-- P0.6-08 (K-118): the queue health check turns red when a job that was due has waited more than 10 minutes, and says
-- nothing about any business. Run inside a rolled-back transaction with the test jobs only.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

select has_function('public', 'queue_health', 'queue_health exists');
select ok(
  not has_function_privilege('anon', 'public.queue_health()', 'execute')
    and not has_function_privilege('authenticated', 'public.queue_health()', 'execute')
    and has_function_privilege('service_role', 'public.queue_health()', 'execute'),
  'queue_health runs for the service role only');

-- Start from an empty queue so nothing the database already holds changes the answer.
delete from public.jobs;

select is((public.queue_health() ->> 'ok')::boolean, true, 'an empty queue is green');
select is((public.queue_health() ->> 'oldest_due_seconds')::bigint, 0::bigint, 'an empty queue has no waiting job');

insert into public.jobs (kind, state, next_run_at) values ('test_job', 'pending', now() - interval '2 minutes');
select is((public.queue_health() ->> 'ok')::boolean, true, 'a job due 2 minutes ago is still green');

insert into public.jobs (kind, state, next_run_at) values ('test_job', 'pending', now() + interval '1 hour');
select is((public.queue_health() ->> 'due_jobs')::bigint, 1::bigint, 'a job due in the future is not counted');

insert into public.jobs (kind, state, next_run_at) values ('test_job', 'pending', now() - interval '20 minutes');
select is((public.queue_health() ->> 'ok')::boolean, false, 'a held job (due 20 minutes ago) turns the check red');
select cmp_ok((public.queue_health() ->> 'oldest_due_seconds')::bigint, '>=', 1200::bigint, 'it reports how long the oldest job waited');

delete from public.jobs;
insert into public.jobs (kind, state, next_run_at, attempts) values ('test_job', 'retrying', now() - interval '11 minutes', 2);
select is((public.queue_health() ->> 'ok')::boolean, false, 'a retrying job waiting 11 minutes is red too');

delete from public.jobs;
insert into public.jobs (kind, state, next_run_at, finished_at) values
  ('test_job', 'dead', now() - interval '3 hours', now() - interval '3 hours'),
  ('test_job', 'succeeded', now() - interval '3 hours', now() - interval '3 hours'),
  ('test_job', 'running', now() - interval '3 hours', null);
select is((public.queue_health() ->> 'ok')::boolean, true, 'dead, finished and running jobs are not waiting work');
select is(
  (select array_agg(k order by k) from jsonb_object_keys(public.queue_health()) k),
  array['checked_at', 'due_jobs', 'limit_seconds', 'ok', 'oldest_due_seconds'],
  'the answer holds only counts and times');

select * from finish();
rollback;
