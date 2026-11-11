-- Fix 5 (lane R, R-158 item 2, item 7): the partner emails (first trial, first payment, payout sent) leave the retired
-- trial_reminders step for their own job step, partner_notices, offered every 5 minutes at minute 1 (Partners 3 LATER
-- row). private.produce_jobs() is the 20261109110934 version (its live body was read back first on 11 Nov 2026 and
-- matched md5 c063879157a554259a376063b7be91a8) with one offer more. Nothing else changes.
-- Applied only after the api function that handles the partner_notices kind is deployed: a job kind with no handler
-- fails at once (_shared/jobs.ts). Additive: one function replaced, nothing dropped, no data changed.

create or replace function private.produce_jobs() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_sync integer; v_draft integer; v_notify integer; v_protect integer; v_steps integer := 0; v_live boolean;
  v_publish integer; v_reconcile integer; v_stuck integer; v_tasks integer := 0; v_engine boolean;
begin
  -- P0.4-09: once the notification engine is deployed (app_settings.notify_due is 'on') every unnotified review is handed
  -- to it at once, and it decides the timing (instant, held for quiet hours, or the daily digest).
  v_engine := coalesce((select value from public.app_settings where key = 'notify_due'), 'off') = 'on';

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

  -- Owner emails: a business with drafted or blocked reviews not yet emailed, when one is due now (D220 adapted to K-13: medium and high right away, D221).
  with added as (
    insert into public.jobs (kind, location_id, dedupe_key)
    select 'notify_owner', l.id, 'notify_owner:' || l.id
      from public.locations l
     where l.status = 'active' and l.google_location_id is not null
       and (l.emails_paused_until is null or l.emails_paused_until <= now())
       and exists (select 1 from public.reviews r
                    where r.location_id = l.id and r.state in ('drafted', 'blocked') and r.notified_at is null
                      and (v_engine or r.is_backlog or r.star_rating <= 3 or r.risk <> 'low'
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
           -- Fix 5 (Partners 3 LATER row): the partner emails have their own step, offered every 5 minutes.
           + private.offer_every('partner_notices', interval '5 minutes', interval '1 minute');
  -- P0.4-09: held and digested emails come due (notify-engine.ts releaseDue).
  if v_engine then v_steps := v_steps + private.offer_every('notify_due', interval '5 minutes', interval '2 minutes'); end if;

  -- P0.1-13a: a write whose worker stopped (publishing or verifying for 10 minutes) may or may not have reached
  -- Google: it goes to checking and is read, never sent again (D266).
  with moved as (
    update public.publications set state = 'checking', moderation_state = coalesce(moderation_state, 'unknown'),
      error = coalesce(error, 'stopped before Google answered'), next_check_at = now()
     where publish_after is not null and route = 'api'
       and ((state = 'publishing' and claimed_at < now() - interval '10 minutes')
         or (state = 'verifying' and last_checked_at < now() - interval '10 minutes'))
    returning 1
  )
  select count(*) into v_stuck from moved;

  -- Due approvals (approve_publication offers each one already; this is the safety net) and due checks.
  with added as (
    insert into public.jobs (kind, location_id, dedupe_key, payload)
    select 'publish', p.location_id, 'publish:' || p.id, jsonb_build_object('publication_id', p.id)
      from public.publications p
     where p.state = 'approved' and p.publish_after <= now()
    on conflict (dedupe_key) where dedupe_key is not null and state in ('pending', 'running', 'retrying') do nothing
    returning 1
  )
  select count(*) into v_publish from added;
  with added as (
    insert into public.jobs (kind, location_id, dedupe_key, payload)
    select 'reconcile_publication', p.location_id, 'reconcile_publication:' || p.id, jsonb_build_object('publication_id', p.id)
      from public.publications p
     where p.state = 'checking' and p.next_check_at <= now()
    on conflict (dedupe_key) where dedupe_key is not null and state in ('pending', 'running', 'retrying') do nothing
    returning 1
  )
  select count(*) into v_reconcile from added;

  -- P0.3-05: the task detectors, once every 5 minutes per business that is not disconnected (the time-based ones:
  -- profile gaps, lost access, plan ending; and a safety net for the rest, which also run at once on change).
  if coalesce((select value from public.app_settings where key = 'task_detectors'), 'off') = 'on' then
    with added as (
      insert into public.jobs (kind, location_id, dedupe_key)
      select 'detect_tasks', l.id, 'detect_tasks:' || l.id
        from public.locations l
       where l.status in ('active', 'paused') and l.disconnect_requested_at is null
         and not exists (select 1 from public.jobs j where j.location_id = l.id and j.kind = 'detect_tasks'
                           and j.created_at > now() - interval '5 minutes')
      on conflict (dedupe_key) where dedupe_key is not null and state in ('pending', 'running', 'retrying') do nothing
      returning 1
    )
    select count(*) into v_tasks from added;
  end if;

  return jsonb_build_object('sync_reviews', v_sync, 'draft_reply', v_draft, 'notify_owner', v_notify,
    'protection_check', v_protect, 'steps', v_steps, 'publish', v_publish, 'reconcile_publication', v_reconcile,
    'stuck_publications', v_stuck, 'detect_tasks', v_tasks);
end $$;

