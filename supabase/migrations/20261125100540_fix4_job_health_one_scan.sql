-- FIX-4 item 4 (25 Nov 2026): the staff Today page said "Some figures did not load: job health". staff_job_health() read, for
-- each of the 40 kabsi_ cron jobs, its last run and its failures of the last 24 hours with two correlated reads of
-- cron.job_run_details. That table holds about 309,000 rows with no index on jobid (and it belongs to the cron extension, so
-- Kabsi cannot add one), so each read scanned all of it: 80 scans, about 6 seconds, and the app stops a staff read after
-- 2 seconds (src/lib/read-timeout.ts). Now one grouped scan gives both the failures and each job's last run id, and the last
-- run's fields come from the table's primary key. The answer has the same shape and the same values; nothing else changes.
create or replace function public.staff_job_health() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v jsonb;
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  select jsonb_build_object(
    'schedules', (select coalesce(jsonb_agg(jsonb_build_object(
        'name', j.jobname, 'schedule', j.schedule, 'active', j.active,
        'last_start', r.start_time, 'last_status', r.status, 'last_message', left(r.return_message, 200),
        'failed_24h', coalesce(a.failed_24h, 0))
        order by j.jobname), '[]'::jsonb)
      from cron.job j
      left join (select d.jobid, max(d.runid) as last_runid,
                        count(*) filter (where d.status = 'failed' and d.start_time > now() - interval '24 hours') as failed_24h
                   from cron.job_run_details d group by d.jobid) a on a.jobid = j.jobid
      left join cron.job_run_details r on r.runid = a.last_runid
      where j.jobname like 'kabsi_%'),
    'jobs', (select coalesce(jsonb_agg(jsonb_build_object('job', job, 'runs_7d', n, 'fails_7d', fails,
        'last_at', last_at, 'last_fail_at', last_fail_at) order by job), '[]'::jsonb)
      from (select job, count(*) n, count(*) filter (where not ok) fails, max(created_at) last_at,
                   max(created_at) filter (where not ok) last_fail_at
            from public.jobs_log where created_at > now() - interval '7 days' group by job) s),
    'recent_failures', (select coalesce(jsonb_agg(jsonb_build_object('job', job, 'at', created_at, 'detail', detail)
        order by created_at desc), '[]'::jsonb)
      from (select job, created_at, detail from public.jobs_log where not ok order by created_at desc limit 10) f),
    'queue', (select jsonb_build_object(
        'pending', count(*) filter (where state = 'pending'),
        'running', count(*) filter (where state = 'running'),
        'retrying', count(*) filter (where state = 'retrying'),
        'due_late', count(*) filter (where state in ('pending', 'retrying') and next_run_at < now() - interval '5 minutes'),
        'dead_7d', count(*) filter (where state = 'dead' and finished_at > now() - interval '7 days'),
        'failed_7d', count(*) filter (where state = 'failed' and finished_at > now() - interval '7 days'))
      from public.jobs),
    'stopped_jobs', (select coalesce(jsonb_agg(jsonb_build_object('id', s.id, 'kind', s.kind, 'state', s.state,
        'business', s.business, 'attempts', s.attempts, 'last_error', s.last_error, 'at', s.finished_at)
        order by s.finished_at desc), '[]'::jsonb)
      from (select j.id, j.kind, j.state, l.name business, j.attempts, left(j.last_error, 300) last_error, j.finished_at
              from public.jobs j left join public.locations l on l.id = j.location_id
             where j.state in ('dead', 'failed') and j.finished_at > now() - interval '7 days'
             order by j.finished_at desc limit 20) s),
    'http_errors_24h', (select count(*) from net._http_response
      where created > now() - interval '24 hours' and (status_code >= 400 or error_msg is not null)),
    'http_calls_24h', (select count(*) from net._http_response where created > now() - interval '24 hours'),
    'emails_failed_24h', (select count(*) from public.emails where status = 'failed'
      and created_at > now() - interval '24 hours' and coalesce(error, '') <> 'test address, not sent'),
    'emails_sent_24h', (select count(*) from public.emails where status = 'sent' and created_at > now() - interval '24 hours'),
    'publications_failed_7d', (select count(*) from public.publications where state in ('failed', 'rejected')
      and created_at > now() - interval '7 days'),
    'reviews_blocked', (select count(*) from public.reviews where state = 'blocked'),
    'google_mode', public.google_mode(),
    'email_from', (select value from public.app_settings where key = 'email_from'),
    'checked_at', now()
  ) into v;
  return v;
end $$;
