-- P0.6-11 (K-44 staff part, K-36, K-35, guardrail 10): the staff System health page. One staff-only read for the whole
-- picture, a per-business technical view, and retry and cancel for dead-letter jobs. Technical detail only: no
-- credential, token, review text or reviewer name is read here, and none is returned (the pgTAP file checks the keys).
-- Additive: one private helper and four new functions in public. Nothing existing is changed or dropped.

-- 1. A plain name for the kind of Google error a message describes ----------------------------------------------------

create or replace function private.google_error_type(p_error text) returns text
language sql immutable set search_path = '' as $$
  select case
    when p_error is null then 'other'
    when p_error ~* '(^|[^0-9])429([^0-9]|$)|rate.?limit|quota|too many' then 'rate_limited'
    when p_error ~* '(^|[^0-9])(500|502|503|504)([^0-9]|$)|unavailable|internal error' then 'google_server_error'
    when p_error ~* '(^|[^0-9])(401|403)([^0-9]|$)|permission|unauthori[sz]ed|forbidden|access' then 'access_denied'
    when p_error ~* '(^|[^0-9])404([^0-9]|$)|not found' then 'not_found'
    when p_error ~* '(^|[^0-9])400([^0-9]|$)|invalid' then 'rejected_request'
    when p_error ~* 'timeout|timed out|network|fetch failed|no answer|econn' then 'no_answer'
    else 'other'
  end
$$;

-- 2. The System health read -------------------------------------------------------------------------------------------

create or replace function public.staff_system_health() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v jsonb;
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  with sync_rows as (
    select c.location_id, l.name, c.sync_status, c.last_error, c.last_successful_sync_at last_ok,
           floor(extract(epoch from now() - coalesce(c.last_successful_sync_at, c.access_granted_at)) / 60)::integer lag_minutes
      from public.google_connections c join public.locations l on l.id = c.location_id
     where c.access_state = 'granted' and not l.concierge and not public.is_demo_location(l.id)
  )
  select jsonb_build_object(
    'checked_at', now(),
    'google', jsonb_build_object(
      'mode', public.google_mode(),
      'breaker', (select jsonb_build_object('state', b.state, 'opened_at', b.opened_at, 'open_until', b.open_until,
                                            'failures_in_window', b.failures)
                    from public.circuit_breaker b where b.name = 'google'),
      'errors_24h', (select coalesce(jsonb_agg(jsonb_build_object('type', t, 'n', n) order by n desc, t), '[]'::jsonb)
        from (select private.google_error_type(e) t, count(*) n
                from (
                  select j.last_error e from public.jobs j
                   where j.last_error ~* 'google' and coalesce(j.finished_at, j.locked_at, j.created_at) > now() - interval '24 hours'
                  union all
                  select c.last_error from public.google_connections c
                   where c.last_error is not null and c.last_attempted_sync_at > now() - interval '24 hours'
                  union all
                  select p.error from public.publications p
                   where p.state = 'failed' and p.error is not null and p.updated_at > now() - interval '24 hours'
                ) x group by 1) s),
      'rate', (select coalesce(jsonb_agg(jsonb_build_object('bucket', r.bucket,
                  'calls_last_minute', (select count(*) from unnest(r.hits) h where h > now() - interval '1 minute')) order by r.bucket), '[]'::jsonb)
                 from public.google_rate r),
      'places', jsonb_build_object(
        'daily_cap', coalesce((select nullif(value, '')::integer from public.app_settings where key = 'places_daily_cap'), 0),
        'calls_today', coalesce((select sum(calls) from public.places_usage where day = current_date), 0))),
    'sync', (select jsonb_build_object(
        'connected', count(*),
        'late', count(*) filter (where lag_minutes > 30 or sync_status = 'error'),
        'worst', (select coalesce(jsonb_agg(jsonb_build_object('location_id', w.location_id, 'business', w.name,
              'sync_status', w.sync_status, 'last_ok', w.last_ok, 'lag_minutes', w.lag_minutes, 'error', left(w.last_error, 200))
              order by w.lag_minutes desc nulls first), '[]'::jsonb)
            from (select * from sync_rows order by lag_minutes desc nulls first limit 15) w))
      from sync_rows),
    'access_problems', (select coalesce(jsonb_agg(jsonb_build_object('location_id', a.location_id, 'business', a.name,
          'access_state', a.access_state, 'since', a.updated_at, 'error', left(a.last_error, 200)) order by a.updated_at desc), '[]'::jsonb)
        from (select c.location_id, l.name, c.access_state, c.updated_at, c.last_error
                from public.google_connections c join public.locations l on l.id = c.location_id
               where c.access_state in ('error', 'lost', 'removing') and not l.concierge and not public.is_demo_location(l.id)
               order by c.updated_at desc limit 20) a),
    'queue', (select jsonb_build_object(
        'pending', count(*) filter (where state = 'pending'),
        'running', count(*) filter (where state = 'running'),
        'retrying', count(*) filter (where state = 'retrying'),
        'due_late', count(*) filter (where state in ('pending', 'retrying') and next_run_at < now() - interval '5 minutes'),
        'oldest_due_seconds', coalesce(max(extract(epoch from now() - next_run_at)) filter (where state in ('pending', 'retrying') and next_run_at <= now()), 0)::bigint,
        'dead', count(*) filter (where state = 'dead'))
      from public.jobs),
    'dead_jobs', (select coalesce(jsonb_agg(jsonb_build_object('id', d.id, 'kind', d.kind, 'business', d.business,
          'location_id', d.location_id, 'attempts', d.attempts, 'max_attempts', d.max_attempts,
          'last_error', d.last_error, 'at', d.finished_at) order by d.finished_at desc nulls last), '[]'::jsonb)
        from (select j.id, j.kind, l.name business, j.location_id, j.attempts, j.max_attempts, left(j.last_error, 300) last_error, j.finished_at
                from public.jobs j left join public.locations l on l.id = j.location_id
               where j.state = 'dead' order by j.finished_at desc nulls last limit 50) d),
    'publications', jsonb_build_object(
      'failed_7d', (select count(*) from public.publications where state in ('failed', 'rejected') and updated_at > now() - interval '7 days'),
      'stuck', (select coalesce(jsonb_agg(jsonb_build_object('id', s.id, 'business', s.name, 'location_id', s.location_id,
            'kind', s.target_type, 'route', s.route, 'state', s.state, 'since', s.since, 'attempts', s.attempts,
            'checks', s.checks, 'error', left(s.error, 200)) order by s.since), '[]'::jsonb)
          from (select p.id, l.name, p.location_id, p.target_type, p.route, p.state, p.attempts, p.checks, p.error,
                       coalesce(p.claimed_at, p.publish_after, p.approved_at) since
                  from public.publications p join public.locations l on l.id = p.location_id
                 where (p.state in ('approved', 'publishing')
                        and coalesce(p.claimed_at, p.publish_after, p.approved_at) < now() - interval '15 minutes')
                    or (p.state in ('checking', 'verifying')
                        and coalesce(p.claimed_at, p.publish_after, p.approved_at) < now() - interval '1 hour')
                 order by since limit 30) s),
      'failed', (select coalesce(jsonb_agg(jsonb_build_object('id', f.id, 'business', f.name, 'location_id', f.location_id,
            'kind', f.target_type, 'state', f.state, 'at', f.updated_at, 'error', left(f.error, 200)) order by f.updated_at desc), '[]'::jsonb)
          from (select p.id, l.name, p.location_id, p.target_type, p.state, p.updated_at, p.error
                  from public.publications p join public.locations l on l.id = p.location_id
                 where p.state in ('failed', 'rejected') and p.updated_at > now() - interval '7 days'
                 order by p.updated_at desc limit 15) f)),
    'photos', jsonb_build_object(
      'failed_7d', (select count(*) from public.photos where state in ('failed', 'refused') and coalesce(processed_at, updated_at) > now() - interval '7 days'),
      'stuck_checking', (select count(*) from public.photos where state = 'checking' and created_at < now() - interval '15 minutes'),
      'recent', (select coalesce(jsonb_agg(jsonb_build_object('id', f.id, 'business', f.name, 'location_id', f.location_id,
            'state', f.state, 'reason', left(coalesce(f.suitability_note, array_to_string(f.issues, ', ')), 200), 'at', f.happened) order by f.happened desc), '[]'::jsonb)
          from (select ph.id, l.name, ph.location_id, ph.state, ph.suitability_note, ph.issues, coalesce(ph.processed_at, ph.updated_at) happened
                  from public.photos ph join public.locations l on l.id = ph.location_id
                 where ph.state in ('failed', 'refused') and coalesce(ph.processed_at, ph.updated_at) > now() - interval '7 days'
                 order by happened desc limit 10) f)),
    'delivery', jsonb_build_object(
      'emails_failed_24h', (select count(*) from public.emails where status in ('failed', 'bounced')
                              and created_at > now() - interval '24 hours' and coalesce(error, '') not like 'test address%'),
      'emails_sent_24h', (select count(*) from public.emails where status in ('sent', 'delivered') and created_at > now() - interval '24 hours'),
      'emails_queued_late', (select count(*) from public.emails where status = 'queued' and created_at < now() - interval '15 minutes'),
      'notices_failed_24h', (select count(*) from public.notifications where email_state = 'failed' and created_at > now() - interval '24 hours'),
      'notices_sending_late', (select count(*) from public.notifications where email_state = 'sending' and created_at < now() - interval '15 minutes'),
      'slack_unsent', (select count(*) from public.ops_events where sent_at is null),
      'slack_oldest_unsent_minutes', (select coalesce(floor(extract(epoch from now() - min(created_at)) / 60), 0)::integer from public.ops_events where sent_at is null),
      'recent_failures', (select coalesce(jsonb_agg(jsonb_build_object('kind', f.kind, 'status', f.status, 'at', f.created_at,
            'to_domain', split_part(f.to_address, '@', 2), 'error', left(f.error, 200)) order by f.created_at desc), '[]'::jsonb)
          from (select e.kind, e.status, e.created_at, e.to_address, e.error from public.emails e
                 where e.status in ('failed', 'bounced') and e.created_at > now() - interval '24 hours'
                   and coalesce(e.error, '') not like 'test address%' order by e.created_at desc limit 10) f))
  ) into v;
  return v;
end $$;

-- 3. Retry and cancel for dead-letter jobs ---------------------------------------------------------------------------

-- A dead job goes back to pending with a fresh set of tries. Refused when the same work is already open (the dedupe key).
create or replace function public.staff_job_retry(p_job bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare j public.jobs;
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into j from public.jobs where id = p_job for update;
  if not found then raise exception 'not_found'; end if;
  if j.state <> 'dead' then raise exception 'not_dead'; end if;
  if j.dedupe_key is not null and exists (
       select 1 from public.jobs o where o.dedupe_key = j.dedupe_key and o.id <> j.id and o.state in ('pending', 'running', 'retrying')) then
    raise exception 'already_open';
  end if;
  update public.jobs set state = 'pending', attempts = 0, next_run_at = now(), locked_at = null, locked_by = null,
         finished_at = null, last_error = null where id = p_job;
  perform private.audit('staff', auth.uid(), 'staff_job_retry', j.location_id, 'job', p_job::text,
    jsonb_build_object('state', 'dead', 'kind', j.kind, 'attempts', j.attempts), jsonb_build_object('state', 'pending'), 'staff', 'ok');
  return jsonb_build_object('id', p_job, 'state', 'pending');
end $$;

-- A dead job the team decides not to run is closed as failed, with the reason in its last error.
create or replace function public.staff_job_cancel(p_job bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare j public.jobs;
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into j from public.jobs where id = p_job for update;
  if not found then raise exception 'not_found'; end if;
  if j.state <> 'dead' then raise exception 'not_dead'; end if;
  update public.jobs set state = 'failed', finished_at = now(),
         last_error = left('cancelled by staff, was: ' || coalesce(j.last_error, 'no error recorded'), 500) where id = p_job;
  perform private.audit('staff', auth.uid(), 'staff_job_cancel', j.location_id, 'job', p_job::text,
    jsonb_build_object('state', 'dead', 'kind', j.kind, 'attempts', j.attempts), jsonb_build_object('state', 'failed'), 'staff', 'ok');
  return jsonb_build_object('id', p_job, 'state', 'failed');
end $$;

-- 4. One business, in technical terms ----------------------------------------------------------------------------------

create or replace function public.staff_business_diagnostics(p_location uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v jsonb;
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  select jsonb_build_object(
    'checked_at', now(),
    'business', (select jsonb_build_object('id', l.id, 'name', l.name, 'status', l.status, 'onboarding_step', l.onboarding_step,
                   'concierge', l.concierge, 'country', l.country, 'created_at', l.created_at)
                   from public.locations l where l.id = p_location),
    'google', (select jsonb_build_object('access_state', c.access_state, 'sync_status', c.sync_status,
                   'last_successful_sync_at', c.last_successful_sync_at, 'last_attempted_sync_at', c.last_attempted_sync_at,
                   'next_sync_at', c.next_sync_at, 'next_protection_at', c.next_protection_at,
                   'voice_of_merchant', c.voice_of_merchant, 'last_error', left(c.last_error, 300),
                   'has_google_location', c.google_location_id is not null)
                 from public.google_connections c where c.location_id = p_location),
    'jobs', (select coalesce(jsonb_agg(jsonb_build_object('id', j.id, 'kind', j.kind, 'state', j.state, 'attempts', j.attempts,
          'next_run_at', j.next_run_at, 'finished_at', j.finished_at, 'last_error', left(j.last_error, 300)) order by j.id desc), '[]'::jsonb)
        from (select * from public.jobs where location_id = p_location order by id desc limit 10) j),
    'publications', (select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'kind', p.target_type, 'route', p.route, 'state', p.state,
          'attempts', p.attempts, 'checks', p.checks, 'at', p.updated_at, 'error', left(p.error, 300)) order by p.updated_at desc), '[]'::jsonb)
        from (select * from public.publications where location_id = p_location order by updated_at desc limit 10) p),
    'reviews', (select coalesce(jsonb_object_agg(state, n), '{}'::jsonb)
        from (select state, count(*) n from public.reviews where location_id = p_location group by state) r),
    'photos', (select coalesce(jsonb_object_agg(state, n), '{}'::jsonb)
        from (select state, count(*) n from public.photos where location_id = p_location group by state) r),
    'emails', (select coalesce(jsonb_agg(jsonb_build_object('kind', e.kind, 'status', e.status, 'at', e.created_at,
          'error', left(e.error, 200)) order by e.created_at desc), '[]'::jsonb)
        from (select * from public.emails where location_id = p_location order by created_at desc limit 10) e),
    'audit', (select coalesce(jsonb_agg(jsonb_build_object('action', a.action, 'result', a.result, 'channel', a.channel, 'at', a.created_at)
          order by a.created_at desc), '[]'::jsonb)
        from (select * from public.audit_events where location_id = p_location order by id desc limit 10) a)
  ) into v;
  return v;
end $$;

-- 5. Who can run them ------------------------------------------------------------------------------------------------

revoke all on function public.staff_system_health() from public, anon;
revoke all on function public.staff_job_retry(bigint) from public, anon;
revoke all on function public.staff_job_cancel(bigint) from public, anon;
revoke all on function public.staff_business_diagnostics(uuid) from public, anon;
grant execute on function public.staff_system_health() to authenticated;
grant execute on function public.staff_job_retry(bigint) to authenticated;
grant execute on function public.staff_job_cancel(bigint) to authenticated;
grant execute on function public.staff_business_diagnostics(uuid) to authenticated;
