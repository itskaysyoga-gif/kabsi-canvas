-- Partners session (master plan 30.15 section 5, 30.17 section 1, 29; R-95, R-97): Founding 25 and Kabsi Partners.
--
-- Founding 25
-- 1. founding_applications: the application (business, country, kind of business, WhatsApp number, why now, the case
--    study consent and the check-in consent). Written only by the programs function (service role); staff read and
--    decide through the staff_ functions below. Browsers hold no grant on the table.
-- 2. The mix of 25 places: 10 beauty and hair, 5 food and drink, 5 health, 5 other. A trade's unused place opens to any
--    trade 30 days after the first application. The real number of places left is a public read through the function.
-- 3. The founding flag: an accepted application linked to a business gives that business Pro for 90 days from the day
--    Google access works, without Creem (private.start_trial reads private.founding_days). A trial already running is
--    set to 90 days from its own start. private.entitlements and private.trial_take drop the trial's caps for it.
-- 4. The day-60, day-85 and day-90 WhatsApp messages: a daily tick queues one job each (founding_message); nothing is
--    charged at day 90, the owner chooses a plan through Creem at the founding price (subscriptions.founding).
-- 5. The day-45 kill gate numbers (weekly approvers) for the staff page.
--
-- Kabsi Partners
-- 6. partners, partner_referrals, partner_commissions (the ledger) and partner_payouts.
-- 7. Attribution: the via code saved on the business at sign-up, or the WhatsApp partner code of an owner's phone
--    within 60 days; last referral wins before sign-up, never changed after. Self referrals earn nothing.
-- 8. The ledger reads billing_events (session 10's payment ledger) as each event is applied: 25 percent of the amount
--    collected before tax, for every subscription.paid while the referral is active; a refund or chargeback inside the
--    30-day hold cancels the line, after a payout it comes off the next one.
-- 9. The monthly payout run on the 5th: lines past their hold clear, partners with 25 US dollars or more cleared get a
--    payout with a statement, below that it rolls over. Staff approve the month's list and mark each payout sent.
-- No row is removed by this file.

-- ─── 1. Founding 25: applications ─────────────────────────────────────────────────────────────────────────────────
create table if not exists public.founding_applications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  business_name text not null check (char_length(btrim(business_name)) between 2 and 120),
  country text not null check (country in ('AE', 'GB', 'US')),
  trade text not null check (trade in ('beauty_hair', 'food', 'health', 'other')),
  business_kind text not null check (char_length(btrim(business_kind)) between 2 and 80),
  whatsapp text not null check (whatsapp ~ '^\+[1-9][0-9]{6,14}$'),
  why_now text not null check (char_length(btrim(why_now)) between 10 and 1000),
  case_study text not null check (case_study in ('named', 'anonymous')),
  checkin_consent boolean not null check (checkin_consent),
  consent_text text not null check (char_length(consent_text) between 10 and 1000),
  status text not null default 'new' check (status in ('new', 'accepted', 'waitlisted', 'declined')),
  decided_at timestamptz,
  decided_by uuid,
  decision_note text check (char_length(decision_note) <= 500),
  organization_id uuid references public.organizations(id) on delete set null,
  linked_at timestamptz,
  day60_sent_at timestamptz,
  day85_sent_at timestamptz,
  day90_sent_at timestamptz
);
comment on table public.founding_applications is 'Founding 25 (master plan 30.17 section 1): applications, staff decisions, and the business an accepted place is linked to.';
-- One open application per WhatsApp number, and one founding place per business.
create unique index if not exists founding_applications_open_phone on public.founding_applications (whatsapp)
  where status in ('new', 'accepted', 'waitlisted');
create unique index if not exists founding_applications_org on public.founding_applications (organization_id)
  where organization_id is not null and status = 'accepted';
create index if not exists founding_applications_status on public.founding_applications (status, created_at);
alter table public.founding_applications enable row level security;
revoke all on public.founding_applications from anon, authenticated;

-- ─── 2. the mix and the places left ───────────────────────────────────────────────────────────────────────────────
create or replace function private.founding_caps() returns jsonb
language sql immutable set search_path = '' as $$
  select '{"beauty_hair": 10, "food": 5, "health": 5, "other": 5}'::jsonb
$$;

-- The real count: 25 minus accepted applications. by_trade shows each trade's cap and what is taken; open_to_any is
-- true once 30 days have passed since the first application (a trade's unused place goes to any good applicant).
create or replace function public.founding_places() returns jsonb
language sql stable security definer set search_path = '' as $$
  with taken as (
    select trade, count(*)::int n from public.founding_applications where status = 'accepted' group by trade
  ), opened as (select min(created_at) at from public.founding_applications)
  select jsonb_build_object(
    'total', 25,
    'left', greatest(0, 25 - coalesce((select sum(n) from taken), 0))::int,
    'open_to_any', coalesce((select at from opened) + interval '30 days' <= now(), false),
    'by_trade', (select jsonb_object_agg(c.key, jsonb_build_object('cap', c.value::int, 'taken', coalesce(t.n, 0)))
                   from jsonb_each_text(private.founding_caps()) c left join taken t on t.trade = c.key))
$$;
revoke all on function public.founding_places() from public, anon, authenticated;
grant execute on function public.founding_places() to service_role;

-- The application, from the programs function only.
create or replace function public.founding_apply(p jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  insert into public.founding_applications (business_name, country, trade, business_kind, whatsapp, why_now, case_study,
    checkin_consent, consent_text)
  values (btrim(p ->> 'business_name'), upper(p ->> 'country'), p ->> 'trade', btrim(p ->> 'business_kind'),
    p ->> 'whatsapp', btrim(p ->> 'why_now'), p ->> 'case_study', coalesce((p ->> 'checkin_consent')::boolean, false),
    p ->> 'consent_text')
  returning id into v_id;
  return v_id;
exception when unique_violation then
  raise exception 'already_applied' using errcode = 'P0001';
end $$;
revoke all on function public.founding_apply(jsonb) from public, anon, authenticated;
grant execute on function public.founding_apply(jsonb) to service_role;

-- ─── 3. the founding flag ─────────────────────────────────────────────────────────────────────────────────────────
create or replace function private.founding_days(p_org uuid) returns integer
language sql stable security definer set search_path = '' as $$
  select case when exists (select 1 from public.founding_applications a
                            where a.organization_id = p_org and a.status = 'accepted') then 90 end
$$;
revoke all on function private.founding_days(uuid) from public, anon, authenticated;

-- private.start_trial as it stands live (20261021180000), with one change: a Founding 25 business gets 90 days.
create or replace function private.start_trial(p_location uuid, p_days integer default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare l public.locations; g public.google_connections; v_keys text[]; v_id uuid; v_ends timestamptz;
begin
  select * into l from public.locations where id = p_location for update;
  if not found or l.is_demo or l.organization_id is null then return null; end if;
  if l.concierge or public.is_concierge_gid(l.google_location_id) then return null; end if;
  select * into g from public.google_connections where location_id = l.id;
  if not found or g.access_state <> 'granted' or g.voice_of_merchant is not true
     or l.access_granted_at is null or l.google_location_id is null then
    return null;
  end if;
  if exists (select 1 from public.organizations o where o.id = l.organization_id and o.is_demo) then return null; end if;
  if exists (select 1 from public.subscriptions s where s.organization_id = l.organization_id
              and (s.trial_started_at is not null or s.state in ('active', 'past_due'))) then
    return null;
  end if;
  if exists (select 1 from public.plans p where p.location_id = l.id
              and (p.kind = 'trial' or p.status in ('active', 'ended', 'refunded')
                   or exists (select 1 from public.payments pay where pay.plan_id = p.id))) then
    return null;
  end if;
  if l.place_id is not null and exists (select 1 from public.trial_grants where place_id = l.place_id) then return null; end if;
  v_keys := private.org_account_keys(l.organization_id);
  if exists (select 1 from public.trial_accounts where account_key = any (v_keys)) then return null; end if;

  v_ends := public.trial_end_at(now(), coalesce(l.time_zone, 'UTC'),
    coalesce(p_days, private.founding_days(l.organization_id), public.trial_days_for(l.signup_source)));
  insert into public.subscriptions (organization_id, plan, state, provider, trial_started_at, trial_ends_at, grace_ends_at,
    trial_place_id, trial_account_keys)
  values (l.organization_id, 'pro', 'trialing', 'manual', now(), v_ends,
    v_ends + make_interval(days => (private.trial_limits() ->> 'grace_days')::int), l.place_id, v_keys)
  returning id into v_id;
  if l.place_id is not null then
    insert into public.trial_grants (place_id, location_id) values (l.place_id, l.id) on conflict do nothing;
  end if;
  insert into public.trial_accounts (account_key, organization_id, place_id)
  select k, l.organization_id, l.place_id from unnest(v_keys) k on conflict do nothing;
  perform private.audit('system', null, 'trial_started', l.id, 'subscription', v_id::text, null,
    jsonb_build_object('ends_at', v_ends), null, 'trialing');
  return v_id;
end $$;

-- private.entitlements as it stands live (20261025173010), with one change: a Founding 25 business has no trial caps
-- (100 drafts, 10 backlog drafts).
create or replace function private.entitlements(p_org uuid, p_location uuid default null) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_lim jsonb := private.trial_limits();
  v_demo boolean; v_concierge boolean := false;
  v_paid_sub public.subscriptions; v_trial_sub public.subscriptions; v_creem public.subscriptions;
  v_legacy_paid timestamptz; v_legacy_trial timestamptz;
  v_state text; v_ends timestamptz; v_place text; v_used boolean; v_plan text; v_grace_ends timestamptz;
  v_fixes integer := 0; v_ai integer := 0; v_trial jsonb := null; v_caps jsonb := null; v_billing jsonb := null;
begin
  if p_org is null then
    select organization_id into p_org from public.locations where id = p_location;
  end if;
  select coalesce(o.is_demo, false) into v_demo from public.organizations o where o.id = p_org;
  if p_location is not null then
    select l.is_demo or v_demo, l.place_id into v_demo, v_place from public.locations l where l.id = p_location;
    v_concierge := public.concierge_unbilled(p_location);
  end if;

  -- Paid: active until the period end (a scheduled cancel stays paid until then), or a failed payment inside the
  -- 7 days from the first failure (10.2.9).
  select * into v_paid_sub from public.subscriptions s
   where s.organization_id = p_org and s.plan in ('essentials', 'pro')
     and ((s.state = 'active' and (s.current_period_end is null or s.current_period_end > now()))
       or (s.state = 'past_due' and coalesce(s.past_due_at, s.current_period_end, s.updated_at) + interval '7 days' > now()))
   order by s.current_period_end desc nulls first limit 1;
  -- The newest Creem subscription, whatever its state: for the paused state and the billing block.
  select * into v_creem from public.subscriptions s
   where s.organization_id = p_org and s.provider = 'creem'
   order by coalesce(s.last_event_at, s.updated_at) desc nulls last limit 1;
  select * into v_trial_sub from public.subscriptions s
   where s.organization_id = p_org and s.trial_started_at is not null
   order by s.trial_started_at desc limit 1;

  -- Plans paid before Creem (the earlier 6-month plans) still count until they end.
  select max(p.ends_at) filter (where p.kind <> 'trial'),
         max(p.ends_at) filter (where p.kind = 'trial')
    into v_legacy_paid, v_legacy_trial
    from public.plans p join public.locations l on l.id = p.location_id
   where l.organization_id = p_org and (p_location is null or l.id = p_location)
     and p.status = 'active' and p.ends_at > now();

  v_state := case
    when v_demo then 'demo'
    when v_concierge then 'concierge'
    when v_paid_sub.id is not null or v_legacy_paid is not null then 'paid'
    when v_trial_sub.id is not null and now() < v_trial_sub.trial_ends_at then 'trial'
    when v_legacy_trial is not null then 'trial'
    -- Paused, expired, or a failed payment past its grace: watching and drafting go on, nothing publishes.
    when v_creem.id is not null and v_creem.state in ('paused', 'expired', 'past_due') then 'paused'
    when v_trial_sub.id is not null and (v_creem.id is null or v_creem.state = 'incomplete')
         and now() < coalesce(v_trial_sub.grace_ends_at, v_trial_sub.trial_ends_at + interval '7 days') then 'grace'
    when v_trial_sub.id is not null or (v_creem.id is not null and v_creem.state <> 'incomplete') then 'ended'
    else 'none' end;

  v_plan := case v_state
    when 'paid' then case when v_paid_sub.kept_plan_until > now() then v_paid_sub.kept_plan else coalesce(v_paid_sub.plan, 'pro') end
    when 'trial' then 'pro' when 'grace' then 'pro'
    when 'demo' then 'pro' when 'concierge' then 'pro'
    else null end;

  v_ends := case v_state
    when 'paid' then greatest(v_paid_sub.current_period_end, v_legacy_paid)
    when 'trial' then coalesce(case when now() < v_trial_sub.trial_ends_at then v_trial_sub.trial_ends_at end, v_legacy_trial)
    when 'grace' then coalesce(v_trial_sub.grace_ends_at, v_trial_sub.trial_ends_at + interval '7 days')
    else null end;

  if v_paid_sub.state = 'past_due' then
    v_grace_ends := coalesce(v_paid_sub.past_due_at, v_paid_sub.current_period_end, v_paid_sub.updated_at) + interval '7 days';
  end if;

  if v_state in ('trial', 'grace') and v_trial_sub.id is not null then
    select count(*) into v_fixes from public.trial_usage u where u.organization_id = p_org and u.kind = 'profile_fix';
    select coalesce(sum(a.generations), 0) into v_ai
      from public.ai_usage a join public.locations l on l.id = a.location_id
     where l.organization_id = p_org and a.day >= (v_trial_sub.trial_started_at at time zone 'utc')::date;
    v_trial := jsonb_build_object('started_at', v_trial_sub.trial_started_at, 'ends_at', v_trial_sub.trial_ends_at,
      'grace_ends_at', coalesce(v_trial_sub.grace_ends_at, v_trial_sub.trial_ends_at + interval '7 days'),
      'day', greatest(1, ceil(extract(epoch from now() - v_trial_sub.trial_started_at) / 86400)::integer));
  end if;
  -- Founding 25 (30.17): Pro for 90 days without the trial's caps.
  if v_state in ('trial', 'grace') and private.founding_days(p_org) is null then
    v_caps := jsonb_build_object(
      'profile_fixes', jsonb_build_object('limit', (v_lim ->> 'profile_fixes')::int, 'used', v_fixes),
      'backlog_drafts', jsonb_build_object('limit', (v_lim ->> 'backlog_drafts')::int),
      'ai_generations', jsonb_build_object('limit', (v_lim ->> 'ai_generations')::int, 'used', v_ai));
  end if;

  if v_creem.id is not null then
    v_billing := jsonb_build_object(
      'state', v_creem.state, 'plan', v_creem.plan, 'period', v_creem.period, 'units', v_creem.units,
      'mode', v_creem.mode, 'founding', v_creem.founding, 'current_period_end', v_creem.current_period_end,
      'cancel_at_period_end', v_creem.cancel_at_period_end, 'payment_failed', v_creem.state = 'past_due',
      'grace_ends_at', v_grace_ends, 'ended_at', v_creem.ended_at,
      'data_kept_until', case when v_creem.state in ('cancelled', 'expired', 'paused')
        then coalesce(v_creem.ended_at, v_creem.updated_at) + interval '30 days' end);
  end if;

  v_used := v_trial_sub.id is not null
    or (v_place is not null and exists (select 1 from public.trial_grants g where g.place_id = v_place))
    or exists (select 1 from public.trial_accounts a where a.account_key = any (private.org_account_keys(p_org)));

  return jsonb_build_object(
    'organization_id', p_org,
    'state', v_state,
    'plan', v_plan,
    'limits', private.plan_limits(v_plan),
    'locations_allowed', case when v_state = 'paid' then 1 + coalesce(v_paid_sub.units, 0) when v_plan is not null then 1 else 0 end,
    'watch', v_state in ('demo', 'concierge', 'paid', 'trial', 'grace', 'paused'),
    'draft', v_state in ('demo', 'concierge', 'paid', 'trial', 'grace', 'paused'),
    'publish', v_state in ('demo', 'concierge', 'paid', 'trial'),
    'ends_at', v_ends,
    'trial', v_trial,
    'caps', v_caps,
    'billing', v_billing,
    'trial_used', v_used);
end $$;

-- private.trial_take as it stands live (20261020160000): a Founding 25 business is not held to the 3 profile fixes.
create or replace function private.trial_take(p_location uuid, p_kind text, p_ref text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare e jsonb := private.entitlements(null, p_location); v_org uuid := (e ->> 'organization_id')::uuid; v_used integer;
begin
  if e ->> 'state' not in ('trial', 'grace') then return true; end if;
  if private.founding_days(v_org) is not null then return true; end if;
  if p_kind <> 'profile_fix' then raise exception 'unknown_trial_cap'; end if;
  perform pg_advisory_xact_lock(hashtext('trial_take:' || v_org));
  if exists (select 1 from public.trial_usage where organization_id = v_org and kind = p_kind and ref = p_ref) then return true; end if;
  select count(*) into v_used from public.trial_usage where organization_id = v_org and kind = p_kind;
  if v_used >= (private.trial_limits() ->> 'profile_fixes')::int then return false; end if;
  insert into public.trial_usage (organization_id, kind, ref) values (v_org, p_kind, p_ref);
  return true;
end $$;

-- ─── staff: decide and link ───────────────────────────────────────────────────────────────────────────────────────
create or replace function public.staff_founding_decide(p_id uuid, p_status text, p_note text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare a public.founding_applications; v_places jsonb; v_cap int; v_taken int;
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_status not in ('accepted', 'waitlisted', 'declined') then raise exception 'bad_status'; end if;
  -- One decision at a time, so two staff taps never fill the 26th place.
  perform pg_advisory_xact_lock(hashtext('founding_25'));
  select * into a from public.founding_applications where id = p_id for update;
  if not found then raise exception 'not_found'; end if;
  if a.status = 'accepted' and p_status <> 'accepted' and a.organization_id is not null then
    raise exception 'linked' using hint = 'This place is linked to a business and its free Pro is running.';
  end if;
  if p_status = 'accepted' and a.status <> 'accepted' then
    v_places := public.founding_places();
    if (v_places ->> 'left')::int <= 0 then raise exception 'full' using hint = 'All 25 places are taken.'; end if;
    v_cap := (private.founding_caps() ->> a.trade)::int;
    v_taken := (v_places -> 'by_trade' -> a.trade ->> 'taken')::int;
    if v_taken >= v_cap and not (v_places ->> 'open_to_any')::boolean then
      raise exception 'trade_full' using hint = 'This trade''s places are taken. Unused places open to any trade 30 days after the first application.';
    end if;
  end if;
  update public.founding_applications set status = p_status, decided_at = now(), decided_by = auth.uid(),
    decision_note = nullif(btrim(coalesce(p_note, '')), '') where id = p_id;
  perform private.audit('staff', auth.uid(), 'founding_' || p_status, null, 'founding_application', p_id::text,
    jsonb_build_object('status', a.status), jsonb_build_object('status', p_status), 'staff', p_status);
  return public.founding_places();
end $$;

-- Links an accepted place to the business it belongs to. The 90 days start when Google access works: a trial already
-- running is set to 90 days from its start; otherwise the trial starts now if access works, or later when it does.
create or replace function public.staff_founding_link(p_id uuid, p_location uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare a public.founding_applications; l public.locations; s public.subscriptions; v_ends timestamptz; v_new uuid;
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into a from public.founding_applications where id = p_id for update;
  if not found then raise exception 'not_found'; end if;
  if a.status <> 'accepted' then raise exception 'not_accepted'; end if;
  select * into l from public.locations where id = p_location;
  if not found or l.organization_id is null or l.is_demo then raise exception 'bad_business'; end if;
  if exists (select 1 from public.subscriptions x where x.organization_id = l.organization_id and x.provider = 'creem'
              and x.state in ('active', 'past_due')) then
    raise exception 'already_paying' using hint = 'This business already pays; a founding place gives free months only before a plan.';
  end if;
  update public.founding_applications set organization_id = l.organization_id, linked_at = now() where id = p_id;
  select * into s from public.subscriptions x where x.organization_id = l.organization_id and x.trial_started_at is not null
   order by x.trial_started_at desc limit 1;
  if s.id is not null then
    v_ends := public.trial_end_at(s.trial_started_at, coalesce(l.time_zone, 'UTC'), 90);
    update public.subscriptions set trial_ends_at = v_ends,
      grace_ends_at = v_ends + make_interval(days => (private.trial_limits() ->> 'grace_days')::int), updated_at = now()
     where id = s.id;
  else
    v_new := private.start_trial(p_location, 90);
  end if;
  perform private.audit('staff', auth.uid(), 'founding_linked', l.id, 'founding_application', p_id::text, null,
    jsonb_build_object('trial', coalesce(s.id, v_new), 'ends_at', coalesce(v_ends, (select trial_ends_at from public.subscriptions where id = v_new))),
    'staff', 'linked', l.organization_id);
  return jsonb_build_object('linked', true, 'trial_started', s.id is not null or v_new is not null,
    'ends_at', coalesce(v_ends, (select trial_ends_at from public.subscriptions where id = v_new)));
end $$;

-- ─── 4 and 5. what staff see: applications, the mix, each linked business, the day-45 gate ───────────────────────────
create or replace function public.staff_founding_overview() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_members jsonb; v_start timestamptz; v_weekly int; v_linked int;
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  with m as (
    select a.id, a.business_name, a.trade, a.organization_id, t.trial_started_at, t.trial_ends_at,
      (select count(*) from public.audit_events e join public.locations x on x.id = e.location_id
        where x.organization_id = a.organization_id and e.action = 'approval' and e.created_at > now() - interval '7 days') approvals_7d,
      (select count(distinct date_trunc('week', e.created_at)) from public.audit_events e join public.locations x on x.id = e.location_id
        where x.organization_id = a.organization_id and e.action = 'approval' and e.created_at >= t.trial_started_at) weeks_with_approval,
      exists (select 1 from public.subscriptions p where p.organization_id = a.organization_id and p.provider = 'creem'
               and p.state in ('active', 'past_due')) paying
      from public.founding_applications a
      left join lateral (select s.trial_started_at, s.trial_ends_at from public.subscriptions s
                          where s.organization_id = a.organization_id and s.trial_started_at is not null
                          order by s.trial_started_at desc limit 1) t on true
     where a.status = 'accepted' and a.organization_id is not null
  )
  select coalesce(jsonb_agg(jsonb_build_object('application_id', id, 'business', business_name, 'trade', trade,
           'started_at', trial_started_at, 'ends_at', trial_ends_at,
           'day', case when trial_started_at is not null then floor(extract(epoch from now() - trial_started_at) / 86400)::int + 1 end,
           'approvals_7d', approvals_7d, 'weeks_with_approval', weeks_with_approval,
           'weeks', case when trial_started_at is not null then ceil(extract(epoch from now() - trial_started_at) / 604800)::int end,
           'paying', paying) order by trial_started_at nulls last), '[]'::jsonb),
         min(trial_started_at), count(*) filter (where approvals_7d > 0), count(*)
    into v_members, v_start, v_weekly, v_linked
    from m;
  return jsonb_build_object(
    'places', public.founding_places(),
    'applications', coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'created_at', a.created_at,
        'business_name', a.business_name, 'country', a.country, 'trade', a.trade, 'business_kind', a.business_kind,
        'whatsapp', a.whatsapp, 'why_now', a.why_now, 'case_study', a.case_study, 'status', a.status,
        'decided_at', a.decided_at, 'decision_note', a.decision_note, 'organization_id', a.organization_id,
        'linked_at', a.linked_at) order by (a.status = 'new') desc, a.created_at desc)
      from public.founding_applications a), '[]'::jsonb),
    'members', v_members,
    -- 30.17: at day 45, fewer than 10 of the 25 approving work at least once a week pauses new places.
    'kill_gate', jsonb_build_object('program_day', case when v_start is not null then floor(extract(epoch from now() - v_start) / 86400)::int + 1 end,
      'gate_day', 45, 'gate_on', case when v_start is not null then (v_start + interval '45 days')::date end,
      'weekly_approvers', v_weekly, 'linked', v_linked, 'needed', 10,
      'below', v_weekly < 10));
end $$;

-- ─── 4. the day-60, day-85 and day-90 messages ────────────────────────────────────────────────────────────────────
-- Each message once (the *_sent_at columns are set by the job after it sends), inside a short window so a late tick
-- never sends an old message. A business that already chose a plan gets none.
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

-- ─── 6. Kabsi Partners ────────────────────────────────────────────────────────────────────────────────────────────
create table if not exists public.partner_accounts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null check (char_length(btrim(name)) between 2 and 80),
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 254),
  phone text check (phone ~ '^\+[1-9][0-9]{6,14}$'),
  country text check (country ~ '^[A-Z]{2}$'),
  city text check (char_length(city) <= 80),
  kind text not null check (kind in ('creator', 'agency', 'accountant', 'reseller', 'business_group', 'other')),
  reach text check (char_length(reach) <= 300),
  pitch text check (char_length(pitch) <= 500),
  uae_permit text check (char_length(uae_permit) <= 60),
  source text not null default 'web' check (source in ('web', 'email', 'whatsapp', 'staff')),
  terms_version text not null,
  terms_accepted_at timestamptz not null,
  status text not null default 'applied' check (status in ('applied', 'approved', 'declined', 'paused', 'left')),
  decided_at timestamptz,
  decided_by uuid,
  decision_note text check (char_length(decision_note) <= 500),
  handle text unique check (handle ~ '^[a-z0-9]{3,20}$'),
  code text unique check (code ~ '^P-[A-Z0-9]{3,20}$'),
  founding_partner boolean not null default false,
  own_place_id text,
  payout_method text check (payout_method in ('usdt', 'usdc', 'paypal')),
  payout_last4 text check (char_length(payout_last4) <= 4),
  payout_secret_id uuid,
  left_at timestamptz
);
comment on table public.partner_accounts is 'Kabsi Partners, affiliates (master plan 29, 30.15 section 5): affiliates only. Payout details live in Vault (payout_secret_id); only the last 4 characters are kept here.';
create unique index if not exists partner_accounts_open_email on public.partner_accounts (lower(email)) where status in ('applied', 'approved', 'paused');
alter table public.partner_accounts enable row level security;
revoke all on public.partner_accounts from anon, authenticated;

create table if not exists public.partner_referrals (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partner_accounts(id) on delete restrict,
  organization_id uuid not null unique references public.organizations(id) on delete cascade,
  location_id uuid references public.locations(id) on delete set null,
  source text not null check (source in ('via', 'whatsapp', 'staff')),
  code text not null,
  touched_at timestamptz not null,
  attributed_at timestamptz not null default now(),
  self_referral boolean not null default false,
  self_reason text,
  status text not null default 'active' check (status in ('active', 'void')),
  void_reason text
);
comment on table public.partner_referrals is 'One partner per business, saved at sign-up and never changed after (29.4). self_referral lines earn nothing.';
create index if not exists partner_referrals_partner on public.partner_referrals (partner_id);
alter table public.partner_referrals enable row level security;
revoke all on public.partner_referrals from anon, authenticated;

create table if not exists public.partner_payouts (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partner_accounts(id) on delete restrict,
  run_on date not null,
  currency text not null default 'USD',
  amount_cents integer not null check (amount_cents >= 2500),
  lines integer not null,
  state text not null default 'proposed' check (state in ('proposed', 'approved', 'sent')),
  statement jsonb not null,
  approved_at timestamptz,
  approved_by uuid,
  sent_at timestamptz,
  method text check (method in ('usdt', 'usdc', 'paypal')),
  reference text check (char_length(reference) <= 200),
  created_at timestamptz not null default now(),
  unique (partner_id, run_on, currency)
);
alter table public.partner_payouts enable row level security;
revoke all on public.partner_payouts from anon, authenticated;

create table if not exists public.partner_commissions (
  id bigint generated always as identity primary key,
  partner_id uuid not null references public.partner_accounts(id) on delete restrict,
  referral_id uuid not null references public.partner_referrals(id) on delete restrict,
  organization_id uuid not null,
  billing_event_id bigint not null references public.billing_events(id) on delete restrict,
  kind text not null check (kind in ('commission', 'reversal')),
  mode text,
  payment_id text,
  provider_subscription_id text,
  currency text not null,
  base_cents integer not null,
  rate numeric(4, 3) not null default 0.25,
  commission_cents integer not null,
  earned_at timestamptz not null,
  hold_until timestamptz not null,
  state text not null default 'held' check (state in ('held', 'cleared', 'void', 'paid')),
  payout_id uuid references public.partner_payouts(id) on delete restrict,
  reverses_id bigint references public.partner_commissions(id) on delete restrict,
  void_reason text,
  created_at timestamptz not null default now(),
  unique (billing_event_id, kind)
);
comment on table public.partner_commissions is 'The partner ledger (29.1, 30.15 section 5), written only from billing_events: 25 percent of the amount collected before tax; reversals for refunds and chargebacks.';
create index if not exists partner_commissions_partner on public.partner_commissions (partner_id, state, hold_until);
create index if not exists partner_commissions_payment on public.partner_commissions (payment_id) where payment_id is not null;
alter table public.partner_commissions enable row level security;
revoke all on public.partner_commissions from anon, authenticated;

-- The application, from the programs function only. A declined applicant may apply again after 90 days.
create or replace function public.partner_apply(p jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_email text := lower(btrim(p ->> 'email'));
begin
  if exists (select 1 from public.partner_accounts x where lower(x.email) = v_email and x.status = 'declined'
              and x.decided_at > now() - interval '90 days') then
    raise exception 'reapply_later' using errcode = 'P0001';
  end if;
  insert into public.partner_accounts (name, email, phone, country, city, kind, reach, pitch, uae_permit, source, terms_version, terms_accepted_at)
  values (btrim(p ->> 'name'), v_email, nullif(p ->> 'phone', ''), nullif(upper(p ->> 'country'), ''), nullif(btrim(p ->> 'city'), ''),
    p ->> 'kind', nullif(btrim(p ->> 'reach'), ''), nullif(btrim(p ->> 'pitch'), ''), nullif(btrim(p ->> 'uae_permit'), ''),
    coalesce(p ->> 'source', 'web'), p ->> 'terms_version', now())
  returning id into v_id;
  return v_id;
exception when unique_violation then
  raise exception 'already_applied' using errcode = 'P0001';
end $$;
revoke all on function public.partner_apply(jsonb) from public, anon, authenticated;
grant execute on function public.partner_apply(jsonb) to service_role;

-- Founding Partner places left (29.6: the first 20 approved), the real count.
create or replace function public.partner_places() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('founding_total', 20,
    'founding_left', greatest(0, 20 - (select count(*) from public.partner_accounts where founding_partner))::int)
$$;
revoke all on function public.partner_places() from public, anon, authenticated;
grant execute on function public.partner_places() to service_role;

-- A handle is 3 to 20 lowercase letters and numbers, never a brand or Google term (29.3).
create or replace function private.partner_handle_ok(p text) returns boolean
language sql immutable set search_path = '' as $$
  select p ~ '^[a-z0-9]{3,20}$' and p !~ '(google|gmb|gbp|maps|youtube|kabsi|meta|facebook|instagram|whatsapp|creem|official|admin|support)'
$$;

create or replace function public.staff_partner_decide(p_id uuid, p_status text, p_handle text default null, p_note text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare x public.partner_accounts; v_handle text; v_founding boolean;
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_status not in ('approved', 'declined', 'paused', 'left') then raise exception 'bad_status'; end if;
  perform pg_advisory_xact_lock(hashtext('partners_approve'));
  select * into x from public.partner_accounts where id = p_id for update;
  if not found then raise exception 'not_found'; end if;
  if p_status = 'approved' and x.handle is null then
    v_handle := lower(coalesce(nullif(btrim(p_handle), ''), regexp_replace(lower(x.name), '[^a-z0-9]', '', 'g')));
    v_handle := left(v_handle, 20);
    if not private.partner_handle_ok(v_handle) then raise exception 'bad_handle' using hint = '3 to 20 lowercase letters and numbers, no brand or Google words.'; end if;
    if exists (select 1 from public.partner_accounts where handle = v_handle) then raise exception 'handle_taken'; end if;
    v_founding := (select count(*) from public.partner_accounts where founding_partner) < 20;
    update public.partner_accounts set handle = v_handle, code = 'P-' || upper(v_handle), founding_partner = v_founding where id = p_id;
  end if;
  update public.partner_accounts set status = p_status, decided_at = now(), decided_by = auth.uid(), updated_at = now(),
    decision_note = coalesce(nullif(btrim(coalesce(p_note, '')), ''), decision_note),
    left_at = case when p_status = 'left' then now() else left_at end
   where id = p_id;
  perform private.audit('staff', auth.uid(), 'partner_' || p_status, null, 'partner', p_id::text,
    jsonb_build_object('status', x.status), jsonb_build_object('status', p_status), 'staff', p_status);
  return (select jsonb_build_object('id', id, 'status', status, 'handle', handle, 'code', code, 'founding_partner', founding_partner)
            from public.partner_accounts where id = p_id);
end $$;

-- Payout details go into Vault; the table keeps the method and the last 4 characters (29.1).
create or replace function public.staff_partner_payout_details(p_id uuid, p_method text, p_detail text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare x public.partner_accounts; v_secret uuid; v_detail text := btrim(coalesce(p_detail, ''));
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_method not in ('usdt', 'usdc', 'paypal') then raise exception 'bad_method'; end if;
  if char_length(v_detail) < 6 or char_length(v_detail) > 200 then raise exception 'bad_detail'; end if;
  select * into x from public.partner_accounts where id = p_id for update;
  if not found then raise exception 'not_found'; end if;
  if x.payout_secret_id is not null then
    perform vault.update_secret(x.payout_secret_id, v_detail, 'partner_payout_' || p_id::text, 'Kabsi partner payout details');
    v_secret := x.payout_secret_id;
  else
    v_secret := vault.create_secret(v_detail, 'partner_payout_' || p_id::text, 'Kabsi partner payout details');
  end if;
  update public.partner_accounts set payout_method = p_method, payout_last4 = right(v_detail, 4), payout_secret_id = v_secret, updated_at = now()
   where id = p_id;
  perform private.audit('staff', auth.uid(), 'partner_payout_details', null, 'partner', p_id::text, null,
    jsonb_build_object('method', p_method), 'staff', p_method);
  return jsonb_build_object('method', p_method, 'last4', right(v_detail, 4));
end $$;

-- A self referral (29.4): the partner's email or WhatsApp number is an owner's, or the partner's own Google place is
-- one of the business's. Checked at sign-up and again at each payment (owners can join after the business is made).
create or replace function private.partner_self_reason(p_partner uuid, p_org uuid) returns text
language sql stable security definer set search_path = '' as $$
  select case
    when exists (select 1 from public.organization_members m join auth.users u on u.id = m.user_id
                  where m.organization_id = p_org and m.role = 'owner' and lower(u.email) = lower(x.email)) then 'owner_email'
    when x.phone is not null and exists (select 1 from public.whatsapp_optins o join public.organization_members m on m.user_id = o.user_id
                  where m.organization_id = p_org and m.role = 'owner' and o.phone = x.phone) then 'owner_phone'
    when x.own_place_id is not null and exists (select 1 from public.locations y where y.organization_id = p_org
                  and y.place_id = x.own_place_id) then 'google_place'
    end
  from public.partner_accounts x where x.id = p_partner
$$;
revoke all on function private.partner_self_reason(uuid, uuid) from public, anon, authenticated;

-- ─── 7. attribution ───────────────────────────────────────────────────────────────────────────────────────────────
-- The via code saved on the business at sign-up (signup_attribution, Growth 1), or else the partner code an owner's
-- WhatsApp number sent in the 60 days before sign-up (the last one wins). Saved once, never changed. A business that
-- matches its partner by owner email, owner WhatsApp number or Google place is a self referral and earns nothing.
create or replace function private.partner_attribute(p_location uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare l public.locations; v_code text; v_touch timestamptz; v_src text; x public.partner_accounts; v_self text; v_id uuid; v_created timestamptz;
begin
  select * into l from public.locations where id = p_location;
  if not found or l.organization_id is null or l.is_demo then return null; end if;
  if exists (select 1 from public.partner_referrals r where r.organization_id = l.organization_id) then return null; end if;
  select o.created_at into v_created from public.organizations o where o.id = l.organization_id;
  v_code := upper(btrim(coalesce(l.via_code, '')));
  if v_code <> '' then
    v_code := case when v_code like 'P-%' then v_code else 'P-' || v_code end;
    v_src := 'via';
    v_touch := coalesce((select a.via_at from public.signup_attribution a where a.user_id = l.created_by), l.created_at);
  end if;
  if v_code is null or v_code = '' or not exists (select 1 from public.partner_accounts p where p.code = v_code and p.status in ('approved', 'paused')) then
    select c.partner_code, c.partner_code_at into v_code, v_touch
      from public.whatsapp_conversations c
     where c.partner_code is not null
       and c.partner_code_at between v_created - interval '60 days' and v_created + interval '1 day'
       and c.phone in (select o.phone from public.whatsapp_optins o join public.organization_members m on m.user_id = o.user_id
                        where m.organization_id = l.organization_id and m.role = 'owner')
     order by c.partner_code_at desc limit 1;
    v_src := 'whatsapp';
  end if;
  if v_code is null then return null; end if;
  select * into x from public.partner_accounts p where p.code = v_code and p.status in ('approved', 'paused');
  if not found then return null; end if;

  v_self := private.partner_self_reason(x.id, l.organization_id);
  insert into public.partner_referrals (partner_id, organization_id, location_id, source, code, touched_at, self_referral, self_reason)
  values (x.id, l.organization_id, l.id, v_src, v_code, coalesce(v_touch, now()), v_self is not null, v_self)
  on conflict (organization_id) do nothing
  returning id into v_id;
  -- 29.1: a business that came through a partner gets the 30-day trial, if its trial has not started yet.
  if v_id is not null and v_self is null and coalesce(l.signup_source, '') !~* '^partner'
     and not exists (select 1 from public.subscriptions s where s.organization_id = l.organization_id and s.trial_started_at is not null) then
    update public.locations set signup_source = 'partner_link' where id = l.id;
  end if;
  return v_id;
end $$;
revoke all on function private.partner_attribute(uuid) from public, anon, authenticated;

create or replace function private.locations_partner_attribute() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.via_code is not null and new.organization_id is not null then
    perform private.partner_attribute(new.id);
  end if;
  return null;
end $$;
drop trigger if exists locations_partner_attribute on public.locations;
create trigger locations_partner_attribute after insert or update of via_code, organization_id on public.locations
  for each row execute function private.locations_partner_attribute();

-- ─── 8. the ledger, from the payment ledger ───────────────────────────────────────────────────────────────────────
-- What Kabsi collected before tax for one payment. Creem's transaction.amount is before tax (amount_paid adds it);
-- an order gives sub_total less discount; else the product price (Kabsi's products are tax exclusive).
create or replace function private.creem_base_cents(d jsonb) returns integer
language sql immutable set search_path = '' as $$
  select coalesce(
    nullif(d #>> '{object,transaction,amount}', '')::int,
    nullif(d #>> '{object,last_transaction,amount}', '')::int,
    (nullif(d #>> '{object,order,sub_total}', '')::int - coalesce(nullif(d #>> '{object,order,discount_amount}', '')::int, 0)),
    nullif(d #>> '{object,product,price}', '')::int)
$$;

create or replace function private.partner_ledger_event(p_event bigint) returns text
language plpgsql security definer set search_path = '' as $$
declare e public.billing_events; r public.partner_referrals; x public.partner_accounts; c public.partner_commissions;
  v_base int; v_paid int; v_back int; v_pay text; v_at timestamptz; v_full boolean;
begin
  select * into e from public.billing_events where id = p_event;
  if not found or e.organization_id is null or e.provider <> 'creem' then return 'skip'; end if;
  select * into r from public.partner_referrals where organization_id = e.organization_id;
  if not found then return 'no_referral'; end if;
  v_at := coalesce(e.event_created_at, e.received_at);

  if e.event_type = 'subscription.paid' then
    if r.status <> 'active' or r.self_referral then return 'no_commission'; end if;
    if private.partner_self_reason(r.partner_id, r.organization_id) is not null then
      update public.partner_referrals set self_referral = true,
        self_reason = private.partner_self_reason(r.partner_id, r.organization_id) where id = r.id;
      return 'self_referral';
    end if;
    select * into x from public.partner_accounts where id = r.partner_id;
    if x.status not in ('approved', 'paused') then return 'partner_inactive'; end if;
    v_base := private.creem_base_cents(e.detail);
    if v_base is null then v_base := e.amount; end if;
    if v_base is null or v_base <= 0 then return 'no_amount'; end if;
    insert into public.partner_commissions (partner_id, referral_id, organization_id, billing_event_id, kind, mode, payment_id,
      provider_subscription_id, currency, base_cents, commission_cents, earned_at, hold_until)
    values (r.partner_id, r.id, e.organization_id, e.id, 'commission', e.mode, e.payment_id, e.provider_subscription_id,
      coalesce(e.currency, 'USD'), v_base, round(v_base * 0.25)::int, v_at, v_at + interval '30 days')
    on conflict (billing_event_id, kind) do nothing;
    return 'commission';
  end if;

  if e.event_type in ('refund.created', 'dispute.created') then
    v_pay := coalesce(e.detail #>> '{object,transaction,id}', e.payment_id);
    select * into c from public.partner_commissions k
     where k.organization_id = e.organization_id and k.kind = 'commission'
       and (k.payment_id = v_pay or (v_pay is null and k.provider_subscription_id = e.provider_subscription_id))
     order by (k.payment_id = v_pay) desc nulls last, k.earned_at desc limit 1;
    if not found then return 'no_line'; end if;
    -- The refunded share before tax: refund (or disputed) amount times amount / amount_paid of the transaction.
    v_paid := nullif(e.detail #>> '{object,transaction,amount_paid}', '')::int;
    v_back := case when e.event_type = 'refund.created' then nullif(e.detail #>> '{object,refund_amount}', '')::int
                   else nullif(e.detail #>> '{object,amount}', '')::int end;
    v_full := v_back is null or v_paid is null or v_back >= v_paid;
    v_base := case when v_full then c.base_cents else least(c.base_cents, round(v_back::numeric * c.base_cents / v_paid)::int) end;
    if c.state in ('held', 'cleared') and c.payout_id is null and v_full then
      -- Inside the hold (or cleared, not yet paid): the line is cancelled.
      update public.partner_commissions set state = 'void', void_reason = e.event_type where id = c.id;
      return 'voided';
    end if;
    -- Partly refunded, or already paid out: a reversal line that comes off the next payout.
    insert into public.partner_commissions (partner_id, referral_id, organization_id, billing_event_id, kind, mode, payment_id,
      provider_subscription_id, currency, base_cents, commission_cents, earned_at, hold_until, state, reverses_id)
    values (c.partner_id, c.referral_id, c.organization_id, e.id, 'reversal', c.mode, c.payment_id, c.provider_subscription_id,
      c.currency, -v_base, -round(v_base * c.rate)::int, v_at,
      case when c.payout_id is null then c.hold_until else v_at end,
      case when c.payout_id is null then c.state else 'cleared' end, c.id)
    on conflict (billing_event_id, kind) do nothing;
    return 'reversed';
  end if;
  return 'skip';
end $$;
revoke all on function private.partner_ledger_event(bigint) from public, anon, authenticated;

-- Runs when the job queue has applied a Creem event (processed_at set, organisation known).
create or replace function private.billing_events_partner_ledger() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform private.partner_ledger_event(new.id);
  return null;
end $$;
drop trigger if exists billing_events_partner_ledger on public.billing_events;
create trigger billing_events_partner_ledger after update of processed_at on public.billing_events
  for each row when (old.processed_at is null and new.processed_at is not null)
  execute function private.billing_events_partner_ledger();

-- ─── 9. the monthly payout run (the 5th) ──────────────────────────────────────────────────────────────────────────
-- Lines past their 30-day hold clear. Each approved partner with 25 US dollars or more cleared in live mode gets one
-- payout with its statement (trade and area of each business, never its name, 29.2); below that the balance rolls
-- over. A paused partner's commission is withheld until staff decide. Test-mode lines clear but are never paid.
create or replace function private.partner_payout_run(p_run date default current_date) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_cleared int; v_made int := 0; r record; v_id uuid;
begin
  update public.partner_commissions set state = 'cleared'
   where state = 'held' and hold_until <= (p_run::timestamp at time zone 'UTC');
  get diagnostics v_cleared = row_count;
  for r in
    select k.partner_id, k.currency, sum(k.commission_cents)::int total, count(*)::int n
      from public.partner_commissions k join public.partner_accounts p on p.id = k.partner_id
     where k.state = 'cleared' and k.payout_id is null and k.mode = 'live' and p.status = 'approved'
     group by k.partner_id, k.currency
    having sum(k.commission_cents) >= 2500
  loop
    insert into public.partner_payouts (partner_id, run_on, currency, amount_cents, lines, statement)
    values (r.partner_id, p_run, r.currency, r.total, r.n, jsonb_build_object(
      'month', to_char(p_run, 'YYYY-MM'), 'currency', r.currency, 'total_cents', r.total,
      'lines', (select jsonb_agg(jsonb_build_object('earned_at', k.earned_at, 'kind', k.kind,
                  'trade', l.category_label, 'area', l.area, 'base_cents', k.base_cents,
                  'commission_cents', k.commission_cents) order by k.earned_at)
                  from public.partner_commissions k left join public.partner_referrals f on f.id = k.referral_id
                  left join public.locations l on l.id = f.location_id
                 where k.partner_id = r.partner_id and k.currency = r.currency and k.state = 'cleared'
                   and k.payout_id is null and k.mode = 'live')))
    on conflict (partner_id, run_on, currency) do nothing
    returning id into v_id;
    if v_id is not null then
      update public.partner_commissions set payout_id = v_id
       where partner_id = r.partner_id and currency = r.currency and state = 'cleared' and payout_id is null and mode = 'live';
      v_made := v_made + 1;
    end if;
  end loop;
  if v_made > 0 then
    perform public.enqueue_job('partner_payouts_ready', null, 'partner_payouts_ready:' || p_run, jsonb_build_object('run_on', p_run));
  end if;
  return jsonb_build_object('cleared', v_cleared, 'payouts', v_made);
end $$;
revoke all on function private.partner_payout_run(date) from public, anon, authenticated;

-- The daily step: attribute businesses whose owner's WhatsApp carried a partner code (sign-ups of the last 14 days).
create or replace function private.programs_daily() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_attr int := 0; v_loc uuid;
begin
  for v_loc in
    select distinct on (l.organization_id) l.id from public.locations l join public.organizations o on o.id = l.organization_id
     where o.created_at > now() - interval '14 days' and not l.is_demo
       and not exists (select 1 from public.partner_referrals r where r.organization_id = l.organization_id)
     order by l.organization_id, l.created_at
  loop
    if private.partner_attribute(v_loc) is not null then v_attr := v_attr + 1; end if;
  end loop;
  return jsonb_build_object('attributed', v_attr, 'founding_messages', private.founding_tick());
end $$;
revoke all on function private.programs_daily() from public, anon, authenticated;

-- ─── staff: the partners page ─────────────────────────────────────────────────────────────────────────────────────
create or replace function public.staff_partners_overview() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  return jsonb_build_object(
    'places', public.partner_places(),
    'partners', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'created_at', p.created_at, 'name', p.name,
        'email', p.email, 'phone', p.phone, 'country', p.country, 'city', p.city, 'kind', p.kind, 'reach', p.reach,
        'pitch', p.pitch, 'uae_permit', p.uae_permit, 'status', p.status, 'handle', p.handle, 'code', p.code,
        'founding_partner', p.founding_partner, 'payout_method', p.payout_method, 'payout_last4', p.payout_last4,
        'referrals', (select count(*) from public.partner_referrals r where r.partner_id = p.id and not r.self_referral),
        'self_referrals', (select count(*) from public.partner_referrals r where r.partner_id = p.id and r.self_referral),
        'held_cents', (select coalesce(sum(k.commission_cents), 0) from public.partner_commissions k where k.partner_id = p.id and k.state = 'held' and k.mode = 'live'),
        'cleared_cents', (select coalesce(sum(k.commission_cents), 0) from public.partner_commissions k where k.partner_id = p.id and k.state = 'cleared' and k.payout_id is null and k.mode = 'live'),
        'paid_cents', (select coalesce(sum(k.commission_cents), 0) from public.partner_commissions k where k.partner_id = p.id and k.state = 'paid'),
        'test_cents', (select coalesce(sum(k.commission_cents), 0) from public.partner_commissions k where k.partner_id = p.id and k.mode is distinct from 'live' and k.state <> 'void'))
        order by (p.status = 'applied') desc, p.created_at desc) from public.partner_accounts p), '[]'::jsonb),
    'payouts', coalesce((select jsonb_agg(jsonb_build_object('id', o.id, 'partner_id', o.partner_id, 'partner', p.name,
        'run_on', o.run_on, 'currency', o.currency, 'amount_cents', o.amount_cents, 'lines', o.lines, 'state', o.state,
        'method', coalesce(o.method, p.payout_method), 'last4', p.payout_last4, 'reference', o.reference, 'sent_at', o.sent_at,
        'statement', o.statement) order by o.run_on desc, p.name)
      from public.partner_payouts o join public.partner_accounts p on p.id = o.partner_id where o.run_on > current_date - 400), '[]'::jsonb),
    'next_run_on', case when extract(day from current_date) <= 5 then date_trunc('month', current_date)::date + 4
                        else (date_trunc('month', current_date) + interval '1 month')::date + 4 end);
end $$;

create or replace function public.staff_payouts_approve(p_run date) returns integer
language plpgsql security definer set search_path = '' as $$
declare v_n int;
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  update public.partner_payouts set state = 'approved', approved_at = now(), approved_by = auth.uid()
   where run_on = p_run and state = 'proposed';
  get diagnostics v_n = row_count;
  perform private.audit('staff', auth.uid(), 'partner_payouts_approved', null, 'partner_payouts', p_run::text, null,
    jsonb_build_object('payouts', v_n), 'staff', v_n::text);
  return v_n;
end $$;

create or replace function public.staff_payout_sent(p_payout uuid, p_reference text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare o public.partner_payouts; x public.partner_accounts;
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into o from public.partner_payouts where id = p_payout for update;
  if not found then raise exception 'not_found'; end if;
  if o.state <> 'approved' then raise exception 'not_approved'; end if;
  select * into x from public.partner_accounts where id = o.partner_id;
  if x.payout_method is null then raise exception 'no_method' using hint = 'Add the partner''s payout details first.'; end if;
  if char_length(btrim(coalesce(p_reference, ''))) < 3 then raise exception 'bad_reference'; end if;
  update public.partner_payouts set state = 'sent', sent_at = now(), method = x.payout_method, reference = btrim(p_reference) where id = o.id;
  update public.partner_commissions set state = 'paid' where payout_id = o.id;
  perform private.audit('staff', auth.uid(), 'partner_payout_sent', null, 'partner_payout', o.id::text, null,
    jsonb_build_object('amount_cents', o.amount_cents, 'method', x.payout_method), 'staff', 'sent');
  return jsonb_build_object('sent', true, 'amount_cents', o.amount_cents);
end $$;

-- Staff can run the month by hand (the cron does it on the 5th).
create or replace function public.staff_payout_run(p_run date default current_date) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  return private.partner_payout_run(p_run);
end $$;

do $$
declare f text;
begin
  foreach f in array array['staff_founding_decide(uuid,text,text)', 'staff_founding_link(uuid,uuid)', 'staff_founding_overview()',
    'staff_partner_decide(uuid,text,text,text)', 'staff_partner_payout_details(uuid,text,text)', 'staff_partners_overview()',
    'staff_payouts_approve(date)', 'staff_payout_sent(uuid,text)', 'staff_payout_run(date)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated, service_role', f);
  end loop;
end $$;
revoke all on function private.founding_caps(), private.partner_handle_ok(text), private.creem_base_cents(jsonb),
  private.locations_partner_attribute(), private.billing_events_partner_ledger() from public, anon, authenticated;

-- Daily at 06:23 UTC (attribution sweep, founding messages); the payout run on the 5th at 06:17 UTC.
select cron.schedule('kabsi_programs_daily', '23 6 * * *', $$select private.programs_daily()$$);
select cron.schedule('kabsi_partner_payout_run', '17 6 5 * *', $$select private.partner_payout_run(current_date)$$);
