-- APP-3 item 7 (R-169, 26 Nov 2026): Staff Today still said "Some figures did not load: job health" after FIX-4. The read
-- scans cron.job_run_details (about 105,000 rows, no index allowed: the table belongs to the cron extension), and the app stops
-- a staff read after 2 seconds. Now the figures are built every 5 minutes by cron into a one-row table, and
-- staff_job_health() returns that row: one primary key read. Same answer and shape; checked_at is when the row was built.
-- If the row is older than 15 minutes (cron stopped), the function builds the answer as before, so it is never stale silently.

create table if not exists public.staff_job_health_cache (
  id smallint primary key default 1 check (id = 1),
  body jsonb not null,
  refreshed_at timestamptz not null default now()
);
alter table public.staff_job_health_cache enable row level security;
-- No policies: only the security definer functions below read or write it.
revoke all on public.staff_job_health_cache from anon, authenticated;

create or replace function public.staff_job_health_build() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v jsonb;
begin
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
revoke execute on function public.staff_job_health_build() from public, anon, authenticated;

create or replace function public.staff_job_health_refresh() returns void
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.staff_job_health_cache (id, body, refreshed_at)
  values (1, public.staff_job_health_build(), now())
  on conflict (id) do update set body = excluded.body, refreshed_at = excluded.refreshed_at;
end $$;
revoke execute on function public.staff_job_health_refresh() from public, anon, authenticated;

create or replace function public.staff_job_health() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v jsonb;
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  select c.body into v from public.staff_job_health_cache c
   where c.id = 1 and c.refreshed_at > now() - interval '15 minutes';
  if v is null then v := public.staff_job_health_build(); end if;
  return v;
end $$;
revoke execute on function public.staff_job_health() from public, anon;
grant execute on function public.staff_job_health() to authenticated;

select cron.unschedule(jobid) from cron.job where jobname = 'kabsi_staff_job_health';
select cron.schedule('kabsi_staff_job_health', '*/5 * * * *', $job$select public.staff_job_health_refresh()$job$);
select public.staff_job_health_refresh();
