-- GATE-2 (master plan 30.54 item 3, blueprint 3.1): the founding price goes through the card checkout, and month 13 moves to 29.
--   1. The Founding 25 90-day trial with no card is retired. private.founding_days answers null for every business, so
--      private.start_trial gives no 90 days, and the trial caps and checks treat a Founding 25 business like any other.
--      A trial already running keeps its end date (nothing here changes a stored row).
--   2. public.staff_founding_link (same signature) only links the accepted application to the business. It starts no trial:
--      the owner starts the 14-day trial with a card at the checkout, and billing_checkout_family gives a linked business the
--      founding price of 19 (unchanged). The answer keeps its keys; trial_started is always false now.
--   3. subscriptions.founding_notice_at and founding_switched_at: the month-13 job records each step once.
--   4. private.offer_founding_switch(), offered daily by pg_cron kabsi_founding_switch: a founding_switch job for each running
--      monthly founding plan whose notice (14 days before founding_ends_at) or switch (3 days before) is due. The job decides
--      again with the row in hand (billing.ts foundingSwitch), so a late or repeated offer does nothing twice.
--   5. private.founding_tick: the day-60, 85 and 90 messages only for a place linked before this change (the old trial).
-- Additive: two columns, four function bodies, one cron job. Nothing is dropped or deleted.

alter table public.subscriptions add column if not exists founding_notice_at timestamptz;
alter table public.subscriptions add column if not exists founding_switched_at timestamptz;
comment on column public.subscriptions.founding_notice_at is
  'GATE-2: when the owner was told the founding price ends (14 days before founding_ends_at). Set once by the founding_switch job.';
comment on column public.subscriptions.founding_switched_at is
  'GATE-2: when the subscription moved to the 29 list product in Creem (3 days before founding_ends_at, no proration).';

-- 1. The 90-day founding trial is retired (30.54 item 3). A place linked before GATE-2 keeps its 90 days and no trial caps
--    (private.entitlements and private.trial_take read this), so a trial already running is not changed.
create or replace function private.founding_days(p_org uuid) returns integer
language sql stable security definer set search_path = '' as $$
  select case when exists (select 1 from public.founding_applications a
                            where a.organization_id = p_org and a.status = 'accepted'
                              and a.linked_at < timestamptz '2026-11-24 20:00:00+00') then 90 end
$$;
revoke all on function private.founding_days(uuid) from public, anon, authenticated;

-- 2. Link only. The checkout gives the founding price; no trial starts without a card.
create or replace function public.staff_founding_link(p_id uuid, p_location uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare a public.founding_applications; l public.locations;
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into a from public.founding_applications where id = p_id for update;
  if not found then raise exception 'not_found'; end if;
  if a.status <> 'accepted' then raise exception 'not_accepted'; end if;
  select * into l from public.locations where id = p_location;
  if not found or l.organization_id is null or l.is_demo then raise exception 'bad_business'; end if;
  if exists (select 1 from public.subscriptions x where x.organization_id = l.organization_id and x.provider = 'creem'
              and x.state in ('active', 'past_due')) then
    raise exception 'already_paying' using hint = 'This business already pays; the founding price is set at its first checkout.';
  end if;
  update public.founding_applications set organization_id = l.organization_id, linked_at = now() where id = p_id;
  perform private.audit('staff', auth.uid(), 'founding_linked', l.id, 'founding_application', p_id::text, null,
    jsonb_build_object('checkout', 'founding'), 'staff', 'linked', l.organization_id);
  return jsonb_build_object('linked', true, 'trial_started', false, 'ends_at', null, 'checkout', 'founding');
end $$;
revoke all on function public.staff_founding_link(uuid, uuid) from public, anon;
grant execute on function public.staff_founding_link(uuid, uuid) to authenticated, service_role;

-- The day-60, 85 and 90 messages belong to the retired 90-day trial: only a place linked before GATE-2 still gets them.
create or replace function private.founding_tick() returns integer
language plpgsql security definer set search_path = '' as $$
declare r record; v_day int; v_n int := 0;
begin
  for r in
    select a.id, a.day60_sent_at, a.day85_sent_at, a.day90_sent_at, t.trial_started_at
      from public.founding_applications a
      join lateral (select s.trial_started_at from public.subscriptions s
                     where s.organization_id = a.organization_id and s.trial_started_at is not null
                     order by s.trial_started_at desc limit 1) t on true
     where a.status = 'accepted' and a.organization_id is not null
       and a.linked_at < timestamptz '2026-11-24 20:00:00+00'
       and not exists (select 1 from public.subscriptions p where p.organization_id = a.organization_id
                        and p.provider = 'creem' and p.state in ('active', 'past_due'))
  loop
    v_day := floor(extract(epoch from now() - r.trial_started_at) / 86400)::int;
    if v_day between 60 and 64 and r.day60_sent_at is null then
      perform public.enqueue_job('founding_message', null, 'founding:' || r.id || ':60', jsonb_build_object('application_id', r.id, 'day', 60)); v_n := v_n + 1;
    elsif v_day between 85 and 88 and r.day85_sent_at is null then
      perform public.enqueue_job('founding_message', null, 'founding:' || r.id || ':85', jsonb_build_object('application_id', r.id, 'day', 85)); v_n := v_n + 1;
    elsif v_day between 90 and 92 and r.day90_sent_at is null then
      perform public.enqueue_job('founding_message', null, 'founding:' || r.id || ':90', jsonb_build_object('application_id', r.id, 'day', 90)); v_n := v_n + 1;
    end if;
  end loop;
  return v_n;
end $$;
revoke all on function private.founding_tick() from public, anon, authenticated;

-- 4. The daily offer of the month-13 job.
create or replace function private.offer_founding_switch() returns integer
language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  with due as (
    select s.id,
           case when s.founding_notice_at is null then 'notice' else 'switch' end as step
      from public.subscriptions s
     where s.provider = 'creem' and s.founding and s.founding_ends_at is not null and s.founding_switched_at is null
       and s.state in ('active', 'past_due') and not coalesce(s.cancel_at_period_end, false)
       and coalesce(s.period, 'month') = 'month'
       and ((s.founding_notice_at is null and now() >= s.founding_ends_at - interval '14 days')
         or (s.founding_notice_at is not null and now() >= s.founding_ends_at - interval '3 days'))
  ), added as (
    insert into public.jobs (kind, location_id, dedupe_key, payload)
    select 'founding_switch', null, 'founding_switch:' || d.id || ':' || d.step, jsonb_build_object('subscription_id', d.id)
      from due d
    on conflict (dedupe_key) where dedupe_key is not null and state in ('pending', 'running', 'retrying') do nothing
    returning 1
  )
  select count(*) into n from added;
  return n;
end $$;
revoke all on function private.offer_founding_switch() from public, anon, authenticated, service_role;

select cron.schedule('kabsi_founding_switch', '23 9 * * *', $$select private.offer_founding_switch()$$);
