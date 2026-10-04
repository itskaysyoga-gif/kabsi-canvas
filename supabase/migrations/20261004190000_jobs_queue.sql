-- P0.1-12a: job queue and dispatcher, review jobs first (K-35, R-06, guardrail 10).
--
-- 1. public.jobs: one row per piece of work (one business, one task). A dedupe key is unique while the job is
--    pending, running or retrying, so a producer can offer the same work every minute without doubling it.
-- 2. claim_jobs(n, worker) takes up to n due jobs with FOR UPDATE SKIP LOCKED: two dispatchers running at the same
--    moment never get the same job. A job whose worker died (still running after 10 minutes) counts as a failed try.
--    finish_job(...) records the outcome: succeeded; retrying with backoff (30 s, 1, 2, 4 minutes, with jitter);
--    dead after 5 tries (a #kabsi-alerts message); failed when the handler says a retry cannot help.
-- 3. private.produce_jobs() offers the review work each minute: a review sync for every business Kabsi reads from
--    Google, every 5 minutes, each business at its own offset so the calls spread evenly through the hour; a draft
--    for every new review; an owner email run for every business with drafted reviews that are due by the
--    existing rules (3 stars or less, urgent and the day-one backlog at once, 4 and 5 stars at the digest hour).
-- 4. private.dispatch_tick(), run by pg_cron every minute (kabsi_dispatch), produces, clears old finished jobs and
--    calls the dispatcher route /api/dispatch only when a job is due.
-- 5. record_sync_result(...) writes each business's sync status to google_connections (last attempt, last success,
--    status, last error); Home reads the last successful check from there.
-- 6. staff_job_health() also returns the queue counts and the jobs that stopped (dead or failed) in the last 7 days.
--
-- The Edge Functions call claim_jobs, finish_job, enqueue_job and record_sync_result through the service role, so
-- they live in public with no execute for anon or authenticated (P0.1-08). kabsi_cron_tick keeps everything that is
-- not yet ported (access, ratings, weekly reports, Protection, deletions, trial and renewal reminders); its review
-- sync, drafting and owner emails move to the jobs in the same pull request.
-- Additive: a new table, new functions and one new pg_cron job. Nothing existing is dropped, moved or unscheduled.

-- 1. The table ------------------------------------------------------------------------------------------------------

create table public.jobs (
  id bigint generated always as identity primary key,
  kind text not null check (kind ~ '^[a-z][a-z_]*$'),
  location_id uuid references public.locations(id) on delete cascade,
  dedupe_key text,
  payload jsonb not null default '{}'::jsonb,
  state text not null default 'pending'
    check (state in ('pending', 'running', 'succeeded', 'failed', 'retrying', 'dead')),
  attempts integer not null default 0,
  max_attempts integer not null default 5 check (max_attempts between 1 and 20),
  next_run_at timestamptz not null default now(),
  locked_at timestamptz,
  locked_by text,
  last_error text,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);
create unique index jobs_dedupe_open on public.jobs (dedupe_key)
  where dedupe_key is not null and state in ('pending', 'running', 'retrying');
create index jobs_due on public.jobs (next_run_at) where state in ('pending', 'retrying');
create index jobs_running on public.jobs (locked_at) where state = 'running';
create index jobs_finished on public.jobs (finished_at) where finished_at is not null;
create index jobs_location on public.jobs (location_id);

alter table public.jobs enable row level security;
revoke all on public.jobs from public, anon, authenticated, service_role;
grant select on public.jobs to service_role;

-- 2. Enqueue, claim, finish -------------------------------------------------------------------------------------

-- Offer a job. Returns its id, or null when the same dedupe key is already pending, running or retrying.
create function public.enqueue_job(p_kind text, p_location uuid, p_dedupe_key text, p_payload jsonb default '{}'::jsonb,
  p_run_at timestamptz default null) returns bigint
language plpgsql security definer set search_path = '' as $$
declare v_id bigint;
begin
  insert into public.jobs (kind, location_id, dedupe_key, payload, next_run_at)
  values (p_kind, p_location, p_dedupe_key, coalesce(p_payload, '{}'::jsonb), coalesce(p_run_at, now()))
  on conflict (dedupe_key) where dedupe_key is not null and state in ('pending', 'running', 'retrying') do nothing
  returning id into v_id;
  return v_id;
end $$;

-- Wait before try n + 1 after n failed tries: 30 s doubled each time, at most an hour, plus or minus 20 percent.
create function private.job_backoff(p_attempts integer) returns interval
language sql volatile set search_path = '' as $$
  select make_interval(secs => least(30 * power(2, greatest(p_attempts, 1) - 1), 3600) * (0.8 + random() * 0.4))
$$;

-- A job that ended without a retry: dead after the last try, failed when the handler ruled a retry out.
create function private.job_stopped(p_job public.jobs) returns void
language plpgsql security definer set search_path = '' as $$
declare v_name text;
begin
  select name into v_name from public.locations where id = p_job.location_id;
  perform public.ops_emit('job_' || p_job.state, 'alerts',
    ':red_circle: Job stopped (' || p_job.state || '): ' || replace(p_job.kind, '_', ' ') || coalesce(' for ' || v_name, ''),
    left(coalesce(p_job.last_error, ''), 500),
    public.ops_f('Tries', p_job.attempts::text || ' of ' || p_job.max_attempts::text), public.ops_staff_btn('Job health'),
    'job_stopped:' || p_job.id);
end $$;

-- Take up to p_n due jobs for one dispatcher run. Rows another dispatcher holds are skipped, never waited for.
create function public.claim_jobs(p_n integer, p_worker text) returns setof public.jobs
language plpgsql security definer set search_path = '' as $$
declare v_stopped public.jobs;
begin
  -- A worker that stopped mid-job (function timeout, deploy) leaves the job running: after 10 minutes it counts as
  -- a failed try and is offered again, or stops for good after the last try.
  for v_stopped in
    update public.jobs set
      state = case when attempts >= max_attempts then 'dead' else 'retrying' end,
      last_error = 'stopped before finishing (worker ' || coalesce(locked_by, 'unknown') || ')',
      next_run_at = now(),
      finished_at = case when attempts >= max_attempts then now() end,
      locked_at = null, locked_by = null
    where id in (select id from public.jobs where state = 'running' and locked_at < now() - interval '10 minutes'
                 for update skip locked)
    returning *
  loop
    if v_stopped.state = 'dead' then perform private.job_stopped(v_stopped); end if;
  end loop;

  return query
  with c as (
    select id from public.jobs
     where state in ('pending', 'retrying') and next_run_at <= now()
     order by next_run_at, id
     limit greatest(coalesce(p_n, 0), 0)
     for update skip locked
  )
  update public.jobs j set state = 'running', attempts = j.attempts + 1, locked_at = now(),
    locked_by = left(coalesce(p_worker, 'unknown'), 100)
  from c where j.id = c.id
  returning j.*;
end $$;

-- Record how a claimed job ended. Returns the new state, or null when the job is no longer this worker's (it was
-- given up as stopped and handed on).
create function public.finish_job(p_id bigint, p_worker text, p_ok boolean, p_error text default null,
  p_retry boolean default true) returns text
language plpgsql security definer set search_path = '' as $$
declare v_job public.jobs;
begin
  update public.jobs set
    state = case when p_ok then 'succeeded' when not p_retry then 'failed'
                 when attempts >= max_attempts then 'dead' else 'retrying' end,
    last_error = case when p_ok then last_error else left(coalesce(p_error, 'failed'), 1000) end,
    next_run_at = case when not p_ok and p_retry and attempts < max_attempts
                       then now() + private.job_backoff(attempts) else next_run_at end,
    finished_at = case when p_ok or not p_retry or attempts >= max_attempts then now() end,
    locked_at = null, locked_by = null
  where id = p_id and state = 'running' and locked_by = left(p_worker, 100)
  returning * into v_job;
  if v_job.id is null then return null; end if;
  if v_job.state in ('dead', 'failed') then perform private.job_stopped(v_job); end if;
  return v_job.state;
end $$;

-- 3. Per-business sync status (K-35, K-06) -----------------------------------------------------------------------

create function public.record_sync_result(p_location uuid, p_ok boolean, p_error text default null) returns void
language sql security definer set search_path = '' as $$
  update public.google_connections set
    last_attempted_sync_at = now(),
    last_successful_sync_at = case when p_ok then now() else last_successful_sync_at end,
    sync_status = case when p_ok then 'ok' else 'error' end,
    last_error = case when p_ok then null else left(coalesce(p_error, 'failed'), 500) end,
    updated_at = now()
  where location_id = p_location
$$;

-- 4. Producers ----------------------------------------------------------------------------------------------------

-- The local hour at a business, or the UTC hour when its time zone is not one Postgres knows.
create function private.local_hour(p_tz text) returns integer
language plpgsql stable set search_path = '' as $$
begin
  return extract(hour from now() at time zone coalesce(p_tz, 'UTC'))::integer;
exception when others then
  return extract(hour from now() at time zone 'UTC')::integer;
end $$;

create function private.produce_jobs() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_sync integer; v_draft integer; v_notify integer;
begin
  -- Review sync: every business whose reviews Kabsi reads from Google (concierge businesses are typed in by staff),
  -- every 5 minutes. A business seen for the first time starts at its own offset inside the 5 minutes.
  with due as (
    select g.location_id, g.next_sync_at is null as first_time
      from public.google_connections g join public.locations l on l.id = g.location_id
     where l.status = 'active' and l.google_location_id is not null and not l.concierge
       and l.google_location_id not like 'locations/concierge-%'
       and (g.next_sync_at is null or g.next_sync_at <= now())
     for update of g skip locked
  ), moved as (
    update public.google_connections g set
      next_sync_at = case when due.first_time
                          then now() + make_interval(secs => abs(hashtext(g.location_id::text)) % 300)
                          else now() + interval '5 minutes' end
      from due where g.location_id = due.location_id
    returning g.location_id, due.first_time
  ), added as (
    insert into public.jobs (kind, location_id, dedupe_key)
    select 'sync_reviews', m.location_id, 'sync_reviews:' || m.location_id from moved m where not m.first_time
    on conflict (dedupe_key) where dedupe_key is not null and state in ('pending', 'running', 'retrying') do nothing
    returning 1
  )
  select count(*) into v_sync from added;

  -- Drafts: new reviews of active businesses, newest first, at most 10 a minute (the old 10 per run, K-100 budget).
  with added as (
    insert into public.jobs (kind, location_id, dedupe_key, payload)
    select 'draft_reply', r.location_id, 'draft_reply:' || r.id, jsonb_build_object('review_id', r.id)
      from public.reviews r join public.locations l on l.id = r.location_id
     where r.state = 'new' and r.draft_attempts < 3 and l.status = 'active'
       and not exists (select 1 from public.jobs j where j.dedupe_key = 'draft_reply:' || r.id
                         and j.state in ('pending', 'running', 'retrying'))
     order by r.review_created_at desc nulls last
     limit 10
    on conflict (dedupe_key) where dedupe_key is not null and state in ('pending', 'running', 'retrying') do nothing
    returning 1
  )
  select count(*) into v_draft from added;

  -- Owner emails: a business with drafted or blocked reviews not yet emailed, when one is due now (D220, D221).
  with added as (
    insert into public.jobs (kind, location_id, dedupe_key)
    select 'notify_owner', l.id, 'notify_owner:' || l.id
      from public.locations l
     where l.status = 'active' and l.google_location_id is not null
       and (l.emails_paused_until is null or l.emails_paused_until <= now())
       and exists (select 1 from public.reviews r
                    where r.location_id = l.id and r.state in ('drafted', 'blocked') and r.notified_at is null
                      and (r.is_backlog or r.star_rating <= 3 or r.urgency = 'urgent'
                           or private.local_hour(l.time_zone) >= l.digest_hour))
    on conflict (dedupe_key) where dedupe_key is not null and state in ('pending', 'running', 'retrying') do nothing
    returning 1
  )
  select count(*) into v_notify from added;

  return jsonb_build_object('sync_reviews', v_sync, 'draft_reply', v_draft, 'notify_owner', v_notify);
end $$;

-- pg_cron, every minute: offer work, clear old finished jobs, wake the dispatcher only when something is due.
create function private.dispatch_tick() returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.produce_jobs();
  delete from public.jobs where id in (
    select id from public.jobs
     where (state = 'succeeded' and finished_at < now() - interval '7 days')
        or (state in ('failed', 'dead') and finished_at < now() - interval '30 days')
     limit 1000);
  if exists (select 1 from public.jobs
              where (state in ('pending', 'retrying') and next_run_at <= now())
                 or (state = 'running' and locked_at < now() - interval '10 minutes')) then
    perform public.call_internal('api/dispatch');
  end if;
end $$;

revoke all on function public.enqueue_job(text, uuid, text, jsonb, timestamptz), public.claim_jobs(integer, text),
  public.finish_job(bigint, text, boolean, text, boolean), public.record_sync_result(uuid, boolean, text)
  from public, anon, authenticated;
grant execute on function public.enqueue_job(text, uuid, text, jsonb, timestamptz), public.claim_jobs(integer, text),
  public.finish_job(bigint, text, boolean, text, boolean), public.record_sync_result(uuid, boolean, text)
  to service_role;
revoke all on function private.job_backoff(integer), private.job_stopped(public.jobs), private.local_hour(text),
  private.produce_jobs(), private.dispatch_tick() from public, anon, authenticated, service_role;

-- 5. Staff job health: queue counts and the jobs that stopped -------------------------------------------------------

create or replace function public.staff_job_health() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v jsonb;
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  select jsonb_build_object(
    'schedules', (select coalesce(jsonb_agg(jsonb_build_object(
        'name', j.jobname, 'schedule', j.schedule, 'active', j.active,
        'last_start', r.start_time, 'last_status', r.status, 'last_message', left(r.return_message, 200),
        'failed_24h', (select count(*) from cron.job_run_details d
                        where d.jobid = j.jobid and d.status = 'failed' and d.start_time > now() - interval '24 hours'))
        order by j.jobname), '[]'::jsonb)
      from cron.job j
      left join lateral (select start_time, status, return_message from cron.job_run_details d
                         where d.jobid = j.jobid order by start_time desc limit 1) r on true
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
    'publications_failed_7d', (select count(*) from public.publications where status in ('failed', 'rejected')
      and created_at > now() - interval '7 days'),
    'reviews_blocked', (select count(*) from public.reviews where state = 'blocked'),
    'google_mode', public.google_mode(),
    'email_from', (select value from public.app_settings where key = 'email_from'),
    'checked_at', now()
  ) into v;
  return v;
end $$;

-- 6. Schedule ------------------------------------------------------------------------------------------------------

select cron.schedule('kabsi_dispatch', '* * * * *', $$select private.dispatch_tick()$$);
