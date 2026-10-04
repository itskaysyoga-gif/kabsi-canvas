-- P0.1-12b part 2: the rest of kabsi_cron_tick as jobs, then retire it (K-35, audit finding A8).
--
-- 1. google_connections.next_protection_at: Google Protection (D218) runs as one job per business, like the review
--    sync: every 5 minutes in mock mode and for demo businesses (as the 5 minute cron did), at most once an hour on
--    live Google (as before, until Pub/Sub in P0.7-03). Each business starts at its own offset so the checks spread
--    through the hour.
-- 2. The steps that look at all businesses at once and decide from data what is due become one job each, offered
--    every 5 minutes at their own minute: access_check (Manager invitations, D270), ratings_snapshot, weekly_reports
--    (D222), deletions, trial_reminders (Q05), renewal_reminders (Q06). Each is the same code the cron ran.
-- 3. private.produce_jobs() offers them with the review work; private.dispatch_tick() also clears rate buckets
--    nobody used for a day.
-- 4. The ops watchdog's "Reviews job hasn't run" alarm watched kabsi_cron_tick; it now watches the job queue: no job
--    finished in 20 minutes (access_check alone finishes one every 5) raises the alert. The rest is unchanged.
-- 5. kabsi_cron_tick is unscheduled: the dispatcher (kabsi_dispatch, every minute) does all of its work.
--
-- Apply only after the code in the same pull request is deployed: the deployed dispatcher must know the new job
-- kinds before they are offered. Additive except steps 4 and 5. To undo: schedule kabsi_cron_tick again
-- (select cron.schedule('kabsi_cron_tick', '*/5 * * * *', $$select public.call_internal('api/cron-tick')$$)), and run
-- the previous produce_jobs and dispatch_tick (20261004190000_jobs_queue.sql) and ops_watchdog
-- (20260927210000_slack_ops.sql, now in schema private) again. No data is moved or deleted.

-- 1. Protection schedule per business --------------------------------------------------------------------------------

alter table public.google_connections add column next_protection_at timestamptz;

-- 2. Whole-system steps: one job each, every p_every, at its own offset. Offered while none is open; it runs at the
--    next slot, so a step runs once per slot however often the producer looks.
create function private.offer_every(p_kind text, p_every interval, p_offset interval) returns integer
language plpgsql security definer set search_path = '' as $$
declare v_slot timestamptz;
begin
  v_slot := date_bin(p_every, now() - p_offset, timestamptz '2026-01-01 00:00:00+00') + p_every + p_offset;
  insert into public.jobs (kind, location_id, dedupe_key, next_run_at)
  values (p_kind, null, p_kind, v_slot)
  on conflict (dedupe_key) where dedupe_key is not null and state in ('pending', 'running', 'retrying') do nothing;
  return case when found then 1 else 0 end;
end $$;

-- 3. Producers -------------------------------------------------------------------------------------------------------

create or replace function private.produce_jobs() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_sync integer; v_draft integer; v_notify integer; v_protect integer; v_steps integer := 0; v_live boolean;
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

  -- Google Protection (D218): the same businesses as the sync, every 5 minutes on the mock and for demo businesses,
  -- once an hour on live Google. A business seen for the first time starts at its own offset inside the 5 minutes.
  v_live := public.google_mode() = 'live';
  with due as (
    select g.location_id, g.next_protection_at is null as first_time,
           case when v_live and not l.is_demo then interval '1 hour' else interval '5 minutes' end as every
      from public.google_connections g join public.locations l on l.id = g.location_id
     where l.status = 'active' and l.google_location_id is not null and not l.concierge
       and l.google_location_id not like 'locations/concierge-%'
       and (g.next_protection_at is null or g.next_protection_at <= now())
     for update of g skip locked
  ), moved as (
    update public.google_connections g set
      next_protection_at = case when due.first_time
                                then now() + make_interval(secs => abs(hashtext('protection:' || g.location_id::text)) % 300)
                                else now() + due.every end
      from due where g.location_id = due.location_id
    returning g.location_id, due.first_time
  ), added as (
    insert into public.jobs (kind, location_id, dedupe_key)
    select 'protection_check', m.location_id, 'protection_check:' || m.location_id from moved m where not m.first_time
    on conflict (dedupe_key) where dedupe_key is not null and state in ('pending', 'running', 'retrying') do nothing
    returning 1
  )
  select count(*) into v_protect from added;

  -- The whole-system steps the 5 minute cron ran, each at its own minute.
  v_steps := private.offer_every('access_check', interval '5 minutes', interval '0 minutes')
           + private.offer_every('ratings_snapshot', interval '5 minutes', interval '1 minute')
           + private.offer_every('weekly_reports', interval '5 minutes', interval '2 minutes')
           + private.offer_every('deletions', interval '5 minutes', interval '3 minutes')
           + private.offer_every('trial_reminders', interval '5 minutes', interval '4 minutes')
           + private.offer_every('renewal_reminders', interval '5 minutes', interval '4 minutes');

  return jsonb_build_object('sync_reviews', v_sync, 'draft_reply', v_draft, 'notify_owner', v_notify,
    'protection_check', v_protect, 'steps', v_steps);
end $$;

-- pg_cron, every minute: offer work, clear old finished jobs and unused rate buckets, wake the dispatcher only when
-- something is due.
create or replace function private.dispatch_tick() returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.produce_jobs();
  delete from public.jobs where id in (
    select id from public.jobs
     where (state = 'succeeded' and finished_at < now() - interval '7 days')
        or (state in ('failed', 'dead') and finished_at < now() - interval '30 days')
     limit 1000);
  delete from public.google_rate where updated_at < now() - interval '1 day';
  if exists (select 1 from public.jobs
              where (state in ('pending', 'retrying') and next_run_at <= now())
                 or (state = 'running' and locked_at < now() - interval '10 minutes')) then
    perform public.call_internal('api/dispatch');
  end if;
end $$;

revoke all on function private.offer_every(text, interval, interval), private.produce_jobs(), private.dispatch_tick()
  from public, anon, authenticated, service_role;

-- 4. The watchdog watches the job queue -------------------------------------------------------------------------------

create or replace function private.ops_watchdog() returns void
language plpgsql security definer set search_path = '' as $$
declare r record; v_last timestamptz; v_5xx int; v_hour text := to_char(now() at time zone 'UTC', 'YYYYMMDDHH24');
begin
  for r in
    select j.jobname, count(*) n, max(d.return_message) msg
      from cron.job_run_details d join cron.job j on j.jobid = d.jobid
     where j.jobname like 'kabsi_%' and d.status = 'failed' and d.start_time > now() - interval '15 minutes'
     group by j.jobname
  loop
    perform public.ops_emit('cron_failed', 'alerts', ':red_circle: Scheduled job failing: ' || r.jobname, left(r.msg, 800),
      public.ops_f('Failures, 15 min', r.n::text), public.ops_staff_btn('Job health'), 'cron:' || r.jobname || ':' || v_hour);
  end loop;
  -- pg_cron reports success even when the dispatcher route answers 401 or 5xx (D295), so the proof is a finished job.
  select max(finished_at) into v_last from public.jobs where state = 'succeeded';
  if v_last is null or v_last < now() - interval '20 minutes' then
    perform public.ops_emit('tick_stalled', 'alerts', ':rotating_light: No job has finished for 20 minutes',
      'The job queue has no job finished since ' || coalesce(to_char(v_last at time zone 'UTC', 'DD Mon HH24:MI') || ' UTC', 'ever')
        || '. Review syncs, drafts, owner emails and Google Protection are not running. Check kabsi_dispatch and the api function logs.',
      '[]', public.ops_staff_btn('Job health'), 'tick:' || v_hour);
  end if;
  select count(*) into v_5xx from net._http_response where created > now() - interval '15 minutes' and (status_code >= 500 or error_msg is not null);
  if v_5xx >= 5 then
    perform public.ops_emit('http_errors', 'alerts', ':red_circle: ' || v_5xx || ' failed internal calls in 15 minutes',
      'Edge Functions returned errors or timed out. Check Sentry (kabsi-edge) and the function logs.', '[]', public.ops_staff_btn('Job health'), 'http5xx:' || v_hour);
  end if;
end $$;

-- 5. Retire the 5 minute cron ----------------------------------------------------------------------------------------

select cron.unschedule('kabsi_cron_tick') where exists (select 1 from cron.job where jobname = 'kabsi_cron_tick');
