-- KABSI: plans v2 and the free trial (Q05, D281, D241, D274).
-- Kinds: trial, pro_monthly, pro_yearly, lebanon_yearly (pro_6m stays as a legacy, read-only kind: nobody can buy it).
-- "Free" is never a row. It is a location with Google access and no entitlement (status awaiting_payment):
-- every paid job already runs only for status = 'active', so drafting, Shield, posts and the report stop, while
-- the review link and card (tap, kv-sync) do not depend on status and keep working.
-- The trial starts when Google access starts (plan_clock_ready), 14 days, or 30 for partner signups.
-- New offers stay behind app_settings.plans_v2 ('off' until billing ships, spec section 1).

-- ─── constraints and data
alter table public.plans drop constraint plans_kind_check;
alter table public.payments drop constraint payments_item_check;
alter table public.usdt_claims drop constraint usdt_claims_item_check;

-- pro_12m is the Lebanon bundle (spec section 1: "this is the existing pro_12m plan"): same $120, same 12 months.
update public.plans set kind = 'lebanon_yearly' where kind = 'pro_12m';
update public.payments set item = 'lebanon_yearly' where item = 'pro_12m';
update public.usdt_claims set item = 'lebanon_yearly' where item = 'pro_12m';

alter table public.plans add constraint plans_kind_check
  check (kind in ('trial','pro_monthly','pro_yearly','lebanon_yearly','pro_6m','partner'));
alter table public.payments add constraint payments_item_check
  check (item in ('card','cards_5','extra_card','pro_monthly','pro_yearly','lebanon_yearly','pro_6m'));
alter table public.usdt_claims add constraint usdt_claims_item_check
  check (item in ('pro_monthly','pro_yearly','lebanon_yearly','pro_6m'));

do $$ begin
  if exists (select 1 from public.plans where status = 'active' and ends_at is null and kind <> 'partner') then
    raise exception 'active plans without an end date exist; fix them before adding active_has_end';
  end if;
end $$;
alter table public.plans add constraint active_has_end check (status <> 'active' or kind = 'partner' or ends_at is not null);
create unique index plans_one_trial on public.plans (location_id) where kind = 'trial';

-- One trial per Google place, kept after a business is deleted so deleting and re-adding does not give a second one.
create table public.trial_grants (
  place_id text primary key,
  location_id uuid references public.locations(id) on delete set null,
  granted_at timestamptz not null default now()
);
alter table public.trial_grants enable row level security;
revoke all on public.trial_grants from anon, authenticated;

-- Commission-track partner clients get a trial and pay (D274); resell-track clients are covered by the partner (D239).
alter table public.partners add column billing_track text not null default 'resell' check (billing_track in ('resell','commission'));

insert into public.app_settings (key, value) values ('plans_v2', 'off') on conflict (key) do nothing;

-- ─── small pure helpers
create or replace function public.plans_v2_on() returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select value from public.app_settings where key = 'plans_v2'), 'off') = 'on'
$$;

create or replace function public.plan_months(p_kind text) returns int language sql immutable set search_path = '' as $$
  select case p_kind when 'pro_monthly' then 1 when 'pro_yearly' then 12 when 'lebanon_yearly' then 12 when 'pro_6m' then 6 end
$$;

create or replace function public.trial_days_for(p_signup_source text) returns int language sql immutable set search_path = '' as $$
  select case when p_signup_source in ('partner_link','partner_invite') then 30 else 14 end
$$;

-- The trial's last day is the local date of the start plus the days; it ends at local midnight after that day, so
-- it is never shorter than promised.
create or replace function public.trial_end_at(p_start timestamptz, p_tz text, p_days int) returns timestamptz
language sql immutable set search_path = '' as $$
  select (((p_start at time zone p_tz)::date + p_days + 1)::timestamp) at time zone p_tz
$$;

create or replace function public.plan_price(p_item text) returns numeric language sql immutable set search_path = '' as $$
  select case p_item when 'pro_monthly' then 19 when 'pro_yearly' then 190 when 'lebanon_yearly' then 120 when 'pro_6m' then 75 end::numeric
$$;

-- Hook points: Q07 (concierge) redefines plan_clock_ready and partner_covered's sibling entitlement.
create or replace function public.plan_clock_ready(p_location uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.locations where id = p_location and access_granted_at is not null)
$$;

create or replace function public.partner_covered(p_location uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.locations l join public.partners p on p.id = l.partner_id
    where l.id = p_location and p.billing_track = 'resell'
  )
$$;

create or replace function public.owner_plan_kinds(p_location uuid) returns text[] language sql stable security definer set search_path = '' as $$
  select case when not public.plans_v2_on() then array['lebanon_yearly']
    else array['pro_monthly','pro_yearly'] || case
      when exists (select 1 from public.locations where id = p_location and upper(coalesce(country, '')) = 'LB') then array['lebanon_yearly']
      else '{}'::text[] end
  end
$$;

-- ─── the trial
create or replace function public.grant_trial_if_eligible(p_location uuid, p_ignore_flag boolean default false, p_days int default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare l public.locations; v_id uuid; v_days int;
begin
  select * into l from public.locations where id = p_location for update;
  if not found or not public.plan_clock_ready(l.id) or public.partner_covered(l.id) then return null; end if;
  if exists (select 1 from public.plans where location_id = l.id and kind = 'trial') then return null; end if;
  if l.place_id is not null and exists (select 1 from public.trial_grants where place_id = l.place_id) then return null; end if;
  -- a business that has paid (or has a paid plan waiting) does not need a trial
  if exists (select 1 from public.plans p where p.location_id = l.id and p.kind in ('pro_monthly','pro_yearly','lebanon_yearly','pro_6m')
             and (p.status in ('active','ended','refunded') or exists (select 1 from public.payments pay where pay.plan_id = p.id))) then
    return null;
  end if;
  -- the public trial is off until billing ships; staff and @test.local owners can still get one (same rule as D235)
  if not p_ignore_flag and not public.plans_v2_on() and not exists (
    select 1 from public.location_members lm join auth.users u on u.id = lm.user_id
    where lm.location_id = l.id and (u.email like '%@test.local' or exists (select 1 from public.staff s where s.user_id = lm.user_id))
  ) then
    return null;
  end if;
  v_days := coalesce(p_days, public.trial_days_for(l.signup_source));
  insert into public.plans (location_id, kind, status, starts_at, ends_at)
  values (l.id, 'trial', 'active', now(), public.trial_end_at(now(), l.time_zone, v_days))
  returning id into v_id;
  if l.place_id is not null then
    insert into public.trial_grants (place_id, location_id) values (l.place_id, l.id) on conflict do nothing;
  end if;
  return v_id;
end $$;

create or replace function public.staff_grant_trial(p_location uuid, p_days int default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_days is not null and (p_days < 1 or p_days > 90) then raise exception 'bad_days'; end if;
  v_id := public.grant_trial_if_eligible(p_location, true, p_days);
  if v_id is null then raise exception 'not_eligible' using hint = 'Needs Google access, no earlier trial or payment, and not covered by a partner.'; end if;
  perform public.refresh_location_status(p_location);
  return v_id;
end $$;

-- ─── starting plans (D241): still only once the clock is ready; paid plans queue behind the trial and each other
create or replace function public.start_paid_plans(p_location uuid) returns int
language plpgsql security definer set search_path = '' as $$
declare p record; v_start timestamptz; v_n int := 0;
begin
  if not public.plan_clock_ready(p_location) then return 0; end if;
  perform public.grant_trial_if_eligible(p_location);
  for p in
    select pl.id, pl.kind from public.plans pl
    where pl.location_id = p_location and pl.status = 'pending' and pl.kind in ('pro_monthly','pro_yearly','lebanon_yearly','pro_6m')
      and exists (select 1 from public.payments pay where pay.plan_id = pl.id)
    order by pl.created_at
  loop
    select greatest(now(), coalesce(max(ends_at), now())) into v_start
      from public.plans where location_id = p_location and status = 'active' and ends_at > now();
    update public.plans set status = 'active', starts_at = v_start,
      ends_at = v_start + make_interval(months => public.plan_months(p.kind))
    where id = p.id;
    v_n := v_n + 1;
  end loop;
  return v_n;
end $$;

create or replace function public.refresh_location_status(p_location uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare l public.locations; v_paid boolean; v_new text;
begin
  perform public.start_paid_plans(p_location);
  select * into l from public.locations where id = p_location for update;
  if not found then return null; end if;
  if l.status in ('paused','disabled') then return l.status; end if;
  v_paid := public.partner_covered(l.id)
    or exists (select 1 from public.plans p where p.location_id = l.id and p.status = 'active'
               and ((p.ends_at is null and p.kind = 'partner') or p.ends_at > now()));
  v_new := case
    when l.consent_at is not null and l.access_granted_at is not null and l.google_location_id is not null and v_paid then 'active'
    when l.access_granted_at is not null then 'awaiting_payment'
    when l.consent_at is not null then 'access_pending'
    else 'onboarding' end;
  update public.locations set status = v_new,
    activated_at = case when v_new = 'active' then coalesce(activated_at, now()) else activated_at end
  where id = l.id and status is distinct from v_new;
  return v_new;
end $$;

-- ─── payments: one core function (Q06 reuses it), staff wrapper keeps the old signature
create or replace function public.record_plan_payment(
  p_location uuid, p_item text, p_amount numeric, p_method text, p_reference text default null, p_recorded_by uuid default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_plan uuid; v_payment uuid;
begin
  if p_item in ('pro_monthly','pro_yearly','lebanon_yearly','pro_6m') then
    -- a pending plan of this kind that isn't paid yet, or a new one
    select pl.id into v_plan from public.plans pl
      where pl.location_id = p_location and pl.kind = p_item and pl.status = 'pending'
        and not exists (select 1 from public.payments pay where pay.plan_id = pl.id)
      order by pl.created_at desc limit 1;
    if v_plan is null then
      insert into public.plans (location_id, kind, status) values (p_location, p_item, 'pending') returning id into v_plan;
    end if;
  end if;
  insert into public.payments (location_id, plan_id, item, amount_usd, method, reference, recorded_by)
  values (p_location, v_plan, p_item, p_amount, p_method, p_reference, p_recorded_by) returning id into v_payment;
  perform public.refresh_location_status(p_location);   -- starts the plan if access already works
  return v_payment;
end $$;

create or replace function public.staff_record_payment(
  p_location uuid, p_item text, p_amount numeric, p_method text, p_reference text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  return public.record_plan_payment(p_location, p_item, p_amount, p_method, p_reference, auth.uid());
end $$;

-- ─── owner choices
create or replace function public.choose_plan(p_location uuid, p_kind text) returns text
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_member(p_location) then raise exception 'forbidden' using errcode = '42501'; end if;
  -- 'trial' is only an intent: the trial row is created when Google access starts.
  if p_kind <> 'trial' and not public.partner_covered(p_location) then
    if not (p_kind = any (public.owner_plan_kinds(p_location))) then raise exception 'bad_plan'; end if;
    delete from public.plans pl where pl.location_id = p_location and pl.status = 'pending'
      and not exists (select 1 from public.payments pay where pay.plan_id = pl.id);
    insert into public.plans (location_id, kind, status) values (p_location, p_kind, 'pending');
  end if;
  update public.locations set onboarding_step = 'done' where id = p_location;
  return public.refresh_location_status(p_location);
end $$;

create or replace function public.owner_submit_claim(p_location uuid, p_item text, p_network text, p_tx_ref text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if not public.is_member(p_location) then raise exception 'forbidden' using errcode = '42501'; end if;
  if public.partner_covered(p_location) then raise exception 'plan_through_partner'; end if;
  if not (p_item = any (public.owner_plan_kinds(p_location))) then raise exception 'bad_plan'; end if;
  if p_network not in ('trc20','binance_pay') then raise exception 'bad_network'; end if;
  if exists (select 1 from public.usdt_claims where location_id = p_location and kind = 'plan' and status = 'pending') then
    raise exception 'claim_pending' using hint = 'A payment is already waiting for confirmation.';
  end if;
  -- the plan they paid for becomes the unpaid pending plan (paid plans waiting for access are kept)
  delete from public.plans pl where pl.location_id = p_location and pl.status = 'pending' and pl.kind <> p_item
    and not exists (select 1 from public.payments pay where pay.plan_id = pl.id);
  if not exists (select 1 from public.plans pl where pl.location_id = p_location and pl.status = 'pending' and pl.kind = p_item
                 and not exists (select 1 from public.payments pay where pay.plan_id = pl.id)) then
    insert into public.plans (location_id, kind, status) values (p_location, p_item, 'pending');
  end if;
  insert into public.usdt_claims (kind, location_id, item, network, tx_ref, amount_usd, submitted_by)
  values ('plan', p_location, p_item, p_network, trim(p_tx_ref), public.plan_price(p_item), auth.uid())
  returning id into v_id;
  return v_id;
exception when unique_violation then
  raise exception 'tx_already_used' using hint = 'This transaction ID was already submitted.';
end $$;

-- ─── what the app shows
create or replace function public.plan_summary(p_location uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare l public.locations; cur public.plans; v_tier text; v_covered boolean; v_tz text;
begin
  if not (public.is_member(p_location) or public.is_staff()) then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into l from public.locations where id = p_location;
  if not found then return null; end if;
  v_tz := coalesce(l.time_zone, 'UTC');
  v_covered := public.partner_covered(l.id);
  select * into cur from public.plans where location_id = l.id and status = 'active' and kind <> 'partner'
    and starts_at <= now() and ends_at > now() order by (kind = 'trial') asc, ends_at desc limit 1;
  v_tier := case
    when not public.plan_clock_ready(l.id) then 'none'
    when v_covered then 'partner'
    when cur.id is not null and cur.kind = 'trial' then 'trial'
    when cur.id is not null then 'pro'
    else 'free' end;
  return jsonb_build_object(
    'tier', v_tier,
    'v2', public.plans_v2_on(),
    'partner_covered', v_covered,
    'plan', case when cur.id is null then null else jsonb_build_object(
      'kind', cur.kind, 'starts_at', cur.starts_at, 'ends_at', cur.ends_at,
      'last_day', ((cur.ends_at - interval '1 second') at time zone v_tz)::date) end,
    'queued', coalesce((select jsonb_agg(jsonb_build_object('kind', q.kind, 'starts_at', q.starts_at, 'ends_at', q.ends_at,
        'last_day', ((q.ends_at - interval '1 second') at time zone v_tz)::date) order by q.starts_at)
      from public.plans q where q.location_id = l.id and q.status = 'active' and q.kind <> 'partner' and q.starts_at > now()), '[]'::jsonb),
    'paid_waiting', exists (select 1 from public.plans w where w.location_id = l.id and w.status = 'pending'
      and exists (select 1 from public.payments pay where pay.plan_id = w.id)),
    'unpaid_kind', (select w.kind from public.plans w where w.location_id = l.id and w.status = 'pending'
      and not exists (select 1 from public.payments pay where pay.plan_id = w.id) order by w.created_at desc limit 1),
    'trial_used', exists (select 1 from public.plans t where t.location_id = l.id and t.kind = 'trial')
      or (l.place_id is not null and exists (select 1 from public.trial_grants g where g.place_id = l.place_id)),
    'trial_days', public.trial_days_for(l.signup_source),
    'offer', to_jsonb(public.owner_plan_kinds(l.id))
  );
end $$;

-- Active trials near their end, for the reminder emails (the Edge Function picks the stage in the local time zone).
create or replace function public.trial_reminder_candidates()
returns table (plan_id uuid, location_id uuid, name text, time_zone text, ends_at timestamptz, last_day date, continues boolean)
language sql stable security definer set search_path = '' as $$
  select p.id, l.id, l.name, coalesce(l.time_zone, 'UTC'), p.ends_at,
         ((p.ends_at - interval '1 second') at time zone coalesce(l.time_zone, 'UTC'))::date,
         (public.partner_covered(l.id)
          or exists (select 1 from public.plans q where q.location_id = l.id and q.id <> p.id and q.kind <> 'partner'
                       and ((q.status = 'active' and q.ends_at > p.ends_at)
                            or (q.status = 'pending' and exists (select 1 from public.payments pay where pay.plan_id = q.id)))))
  from public.plans p join public.locations l on l.id = p.location_id
  where p.kind = 'trial' and p.status = 'active' and p.ends_at > now() and p.ends_at < now() + interval '9 days'
$$;

-- ─── partner billing: only resell-track partners are billed wholesale (commission clients pay Kabsi directly)
create or replace function public.partner_billing_run(p_month date)
returns setof public.partner_invoices
language plpgsql security definer set search_path = '' as $$
declare v_month date := date_trunc('month', p_month)::date; p record; c record; v_row public.partner_invoices;
begin
  if v_month + interval '1 month' > now() then raise exception 'month_not_finished'; end if;
  if public.google_mode() <> 'live' then return; end if;
  for p in select id from public.partners where status <> 'ended' and billing_track = 'resell' loop
    select * into c from public.partner_invoice_calc(p.id, v_month);
    if c.active_count = 0 then continue; end if;
    insert into public.partner_invoices (partner_id, month, active_count, free_count, rate_usd, amount_usd, status)
    values (p.id, v_month, c.active_count, c.free_count, c.rate_usd, c.amount_usd,
            case when c.amount_usd = 0 then 'waived' else 'unpaid' end)
    on conflict (partner_id, month) do nothing
    returning * into v_row;
    if v_row.id is not null then return next v_row; end if;
    v_row := null;
  end loop;
end $$;

-- ─── Slack labels: trials are not paid plans
create or replace function public.ops_plan_label(p text) returns text language sql immutable set search_path = '' as $$
  select case p when 'trial' then 'Free trial' when 'pro_monthly' then 'Kabsi Pro, monthly' when 'pro_yearly' then 'Kabsi Pro, yearly'
    when 'lebanon_yearly' then 'Lebanon bundle, 12 months' when 'pro_6m' then 'Kabsi Pro, 6 months' when 'partner' then 'Partner plan'
    when 'card' then 'Card' when 'cards_5' then '5 cards' when 'extra_card' then 'Extra card' else coalesce(p, '') end
$$;
create or replace function public.ops_on_plan() returns trigger language plpgsql security definer set search_path = '' as $$
declare v_name text;
begin
  select name into v_name from public.locations where id = new.location_id;
  if new.status = 'active' and (tg_op = 'INSERT' or old.status is distinct from 'active') and new.kind <> 'partner' then
    if new.kind = 'trial' then
      perform public.ops_emit('trial_started', 'customers', ':seedling: Free trial started: ' || coalesce(v_name, 'a business'),
        null, public.ops_f('Until', to_char(new.ends_at at time zone 'UTC', 'DD Mon YYYY')), public.ops_staff_btn(), 'trial_on:' || new.id);
    else
      perform public.ops_emit('plan_started', 'money', ':white_check_mark: Plan started: ' || coalesce(v_name, 'a business'),
        null, public.ops_f('Plan', public.ops_plan_label(new.kind)) || public.ops_f('Until', to_char(new.ends_at, 'DD Mon YYYY')),
        public.ops_staff_btn(), 'plan_on:' || new.id);
    end if;
  elsif tg_op = 'UPDATE' and new.status = 'ended' and old.status = 'active' and new.kind <> 'partner' then
    if new.kind = 'trial' then
      perform public.ops_emit('trial_ended', 'customers', ':hourglass: Free trial ended: ' || coalesce(v_name, 'a business'),
        'They are on Free now unless a paid plan is queued. The card and review link keep working; drafts, Shield and reports stopped. A good moment to check in.',
        '[]', public.ops_staff_btn(), 'trial_end:' || new.id);
    else
      perform public.ops_emit('plan_ended', 'customers', ':hourglass: Plan ended: ' || coalesce(v_name, 'a business'),
        'Their paid plan finished. The card keeps working; drafts, Shield and reports stopped. A good moment to check in.',
        public.ops_f('Plan', public.ops_plan_label(new.kind)), public.ops_staff_btn(), 'plan_end:' || new.id);
    end if;
  end if;
  return new;
end $$;

-- ─── expiry every 5 minutes (was hourly): the drop to Free happens promptly, and the run is idempotent
select cron.unschedule('kabsi_plans_expiry');
select cron.schedule('kabsi_plans_expiry', '*/5 * * * *', $$select public.end_expired_plans()$$);

-- ─── privileges
revoke execute on function public.plans_v2_on(), public.plan_clock_ready(uuid), public.partner_covered(uuid),
  public.owner_plan_kinds(uuid), public.grant_trial_if_eligible(uuid, boolean, int), public.start_paid_plans(uuid),
  public.record_plan_payment(uuid, text, numeric, text, text, uuid), public.trial_reminder_candidates(),
  public.partner_billing_run(date) from public, anon, authenticated;
grant execute on function public.plans_v2_on(), public.plan_clock_ready(uuid), public.partner_covered(uuid),
  public.owner_plan_kinds(uuid), public.grant_trial_if_eligible(uuid, boolean, int), public.start_paid_plans(uuid),
  public.record_plan_payment(uuid, text, numeric, text, text, uuid), public.trial_reminder_candidates(),
  public.partner_billing_run(date) to service_role;
revoke execute on function public.staff_grant_trial(uuid, int), public.plan_summary(uuid) from public, anon;
grant execute on function public.staff_grant_trial(uuid, int), public.plan_summary(uuid) to authenticated;
