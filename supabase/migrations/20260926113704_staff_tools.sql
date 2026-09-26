-- KABSI: migration 016: staff tools (card orders, job health) and a configurable sender address (26 Sep 2026)
-- * Card orders: staff create an order for a business or partner and move it through its status.
-- * Job health: one staff-only read of the schedules, their last runs, failed calls, emails and publications.
-- * app_settings.email_from: the From address every Edge Function email uses, so moving from
--   hello@send.kabsi.co to hello@kabsi.co is one update, not a redeploy.

insert into public.app_settings (key, value) values ('email_from', 'Kabsi <hello@send.kabsi.co>')
on conflict (key) do nothing;

create or replace function public.staff_create_card_order(p_location uuid, p_partner uuid, p_quantity int, p_notes text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_location is null and p_partner is null then raise exception 'order_needs_a_business_or_partner'; end if;
  insert into public.card_orders (location_id, partner_id, quantity, notes, requested_by)
  values (p_location, p_partner, p_quantity, nullif(left(trim(p_notes), 500), ''), auth.uid())
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.staff_set_card_order_status(p_order uuid, p_status text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  update public.card_orders set status = p_status where id = p_order;
  if not found then raise exception 'unknown_order'; end if;
end $$;

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

revoke execute on function public.staff_create_card_order(uuid, uuid, int, text), public.staff_set_card_order_status(uuid, text),
  public.staff_job_health() from public, anon;
grant execute on function public.staff_create_card_order(uuid, uuid, int, text), public.staff_set_card_order_status(uuid, text),
  public.staff_job_health() to authenticated;