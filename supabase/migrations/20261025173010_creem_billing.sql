-- Session 10 (master plan section 10, R-67): plans and payments with Creem.
--
-- 1. subscriptions holds one Creem subscription per organisation (provider 'creem'), beside the trial row (provider
--    'manual'). New: the Essentials plan, the states 'incomplete' (checkout done, no payment seen yet) and 'paused',
--    extra locations as units, the Creem product, the mode (test or live), when a payment first failed (the 7-day
--    grace), the founding price, and the time of the newest event applied (an older event never undoes a newer one).
-- 2. billing_events (already there, empty) becomes the ledger of every Creem event: the event id once, its type and
--    time, the business, the Creem ids, amount and currency. Kabsi Partners (PA1) writes commission lines from it.
--    The event body is kept without the customer's name or email.
-- 3. billing_checkouts: one checkout per request id, so a repeated tap returns the same Creem link.
-- 4. organizations.billing_test: a test account sees the paid buttons before plans open (app_settings.billing_open).
-- 5. private.entitlements adds the plan (essentials or pro), the plan's limits (27.4), the locations allowed, the
--    payment grace (7 days from the first failed payment) and the paused state. public.founding_places_left is the
--    live count for the pricing page (the first 30 paying businesses, live mode only).
-- 6. trial_days_for: 30 days for a business that came through a partner (signup_source partner_link or partner_invite, 29.1), 14 otherwise.
-- No row is removed by this file.

-- 1. subscriptions --------------------------------------------------------------------------------------------------
alter table public.subscriptions drop constraint if exists subscriptions_plan_check;
alter table public.subscriptions add constraint subscriptions_plan_check check (plan in ('free', 'essentials', 'pro'));
alter table public.subscriptions drop constraint if exists subscriptions_state_check;
alter table public.subscriptions add constraint subscriptions_state_check
  check (state in ('trialing', 'incomplete', 'active', 'past_due', 'paused', 'cancelled', 'expired'));

alter table public.subscriptions
  add column if not exists units integer not null default 0 check (units >= 0 and units <= 100),
  add column if not exists product_id text,
  add column if not exists mode text check (mode in ('test', 'live')),
  add column if not exists past_due_at timestamptz,
  add column if not exists founding boolean not null default false,
  add column if not exists ended_at timestamptz,
  add column if not exists last_event_at timestamptz,
  add column if not exists kept_plan text check (kept_plan in ('essentials', 'pro')),
  add column if not exists kept_plan_until timestamptz;
comment on column public.subscriptions.kept_plan is 'A downgrade takes effect at renewal (10.2.10): the plan the owner keeps until kept_plan_until.';
comment on column public.subscriptions.units is 'Extra locations on this plan (Creem units of the Extra location item).';
comment on column public.subscriptions.past_due_at is 'When Creem first reported the payment failed; approvals keep working for 7 days from here.';
comment on column public.subscriptions.founding is 'One of the first 30 paying businesses (live mode): keeps its price while subscribed.';
comment on column public.subscriptions.last_event_at is 'created_at of the newest Creem event applied; an older event never changes the state.';

-- 2. billing_events as the ledger -----------------------------------------------------------------------------------
alter table public.billing_events
  add column if not exists event_type text,
  add column if not exists event_created_at timestamptz,
  add column if not exists mode text,
  add column if not exists organization_id uuid,
  add column if not exists provider_subscription_id text,
  add column if not exists provider_customer_id text,
  add column if not exists amount integer,
  add column if not exists currency text,
  add column if not exists processed_at timestamptz;
create index if not exists billing_events_org_idx on public.billing_events (organization_id, event_created_at desc);
alter table public.billing_events enable row level security;
revoke all on public.billing_events from anon, authenticated;

-- 3. checkouts ------------------------------------------------------------------------------------------------------
-- The foreign key with on delete cascade is in the execute_sql block of the session record (R-44), repeated here so a
-- fresh database (CI) gets the same table.
create table if not exists public.billing_checkouts (
  request_id text primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  product_key text not null,
  units integer not null default 1,
  mode text not null check (mode in ('test', 'live')),
  checkout_id text,
  checkout_url text,
  created_by uuid,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists billing_checkouts_org_idx on public.billing_checkouts (organization_id, created_at desc);
alter table public.billing_checkouts enable row level security;
revoke all on public.billing_checkouts from anon, authenticated;

-- 4. test accounts and the switch -----------------------------------------------------------------------------------
alter table public.organizations add column if not exists billing_test boolean not null default false;
comment on column public.organizations.billing_test is 'Kabsi test account: sees the paid plan buttons before app_settings.billing_open is on.';
insert into public.app_settings (key, value) values ('billing_open', 'off') on conflict (key) do nothing;

-- 5. the plan in the one decision -----------------------------------------------------------------------------------
-- What each plan includes (27.4). Modules read their numbers from here, never from code.
create or replace function private.plan_limits(p_plan text) returns jsonb
language sql immutable set search_path = '' as $$
  select case p_plan
    when 'essentials' then '{"map_keywords": 1, "map_every": "month", "ai_prompts": 3, "ai_every": "month",
      "competitors": 3, "competitors_every": "month", "monthly_pdf": false, "posts_per_month": 2, "weekly_posts": false,
      "photos_from_whatsapp": false, "coach_actions": false, "team_roles": false}'::jsonb
    when 'pro' then '{"map_keywords": 5, "map_every": "week", "ai_prompts": 10, "ai_every": "2 weeks",
      "competitors": 5, "competitors_every": "week", "monthly_pdf": true, "posts_per_month": null, "weekly_posts": true,
      "photos_from_whatsapp": true, "coach_actions": true, "team_roles": true}'::jsonb
    else null end
$$;

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
  if v_state in ('trial', 'grace') then
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

-- plan_summary: the tier names the plan the owner has (essentials or pro) and shows the paused state.
create or replace function public.plan_summary(p_location uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare l public.locations; cur public.plans; v_tier text; v_tz text; v_unbilled boolean; v_ent jsonb; v_test boolean;
begin
  if not (public.has_location_role(p_location, array['owner']) or public.is_staff()) then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into l from public.locations where id = p_location;
  if not found then return null; end if;
  v_tz := coalesce(l.time_zone, 'UTC');
  v_unbilled := public.concierge_unbilled(l.id);
  v_ent := private.entitlements(l.organization_id, l.id);
  select coalesce(o.billing_test, false) into v_test from public.organizations o where o.id = l.organization_id;
  select * into cur from public.plans where location_id = l.id and status = 'active'
    and starts_at <= now() and ends_at > now() order by (kind = 'trial') asc, ends_at desc limit 1;
  v_tier := case
    when v_unbilled then 'early_access'
    when v_ent ->> 'state' = 'paid' then coalesce(v_ent ->> 'plan', 'pro')
    when v_ent ->> 'state' = 'paused' then 'paused'
    when not public.plan_clock_ready(l.id) then 'none'
    else case v_ent ->> 'state'
      when 'trial' then 'trial' when 'demo' then 'pro'
      when 'concierge' then 'early_access' else 'free' end end;
  return jsonb_build_object(
    'tier', v_tier,
    'v2', public.plans_v2_on(),
    'concierge', jsonb_build_object('on', l.concierge, 'since', l.concierge_since, 'first_post_at', l.concierge_first_post_at, 'unbilled', v_unbilled),
    'plan', case when cur.id is null then null else jsonb_build_object(
      'kind', cur.kind, 'starts_at', cur.starts_at, 'ends_at', cur.ends_at,
      'last_day', ((cur.ends_at - interval '1 second') at time zone v_tz)::date) end,
    'queued', coalesce((select jsonb_agg(jsonb_build_object('kind', q.kind, 'starts_at', q.starts_at, 'ends_at', q.ends_at,
        'last_day', ((q.ends_at - interval '1 second') at time zone v_tz)::date) order by q.starts_at)
      from public.plans q where q.location_id = l.id and q.status = 'active' and q.starts_at > now()), '[]'::jsonb),
    'paid_waiting', exists (select 1 from public.plans w where w.location_id = l.id and w.status = 'pending'
      and exists (select 1 from public.payments pay where pay.plan_id = w.id)),
    'trial_used', coalesce((v_ent ->> 'trial_used')::boolean, false),
    'entitlements', v_ent,
    'trial_days', public.trial_days_for(l.signup_source),
    -- 10.2.13: the paid buttons show to everyone once plans open, and before that only to Kabsi's test accounts.
    'checkout_open', coalesce((select value = 'on' from public.app_settings where key = 'billing_open'), false) or v_test
  );
end $$;

-- The live count of founding places for the pricing page (10.2.4): live-mode businesses that took one.
create or replace function public.founding_places_left() returns integer
language sql stable security definer set search_path = '' as $$
  select greatest(0, 30 - (select count(distinct s.organization_id) from public.subscriptions s
                            where s.founding and s.mode = 'live'))::integer
$$;
revoke all on function public.founding_places_left() from public;
grant execute on function public.founding_places_left() to anon, authenticated, service_role;

-- 6. the trial length (29.1) --------------------------------------------------------------------------------------
create or replace function public.trial_days_for(p_signup_source text) returns integer
language sql immutable set search_path = '' as $$
  select case when coalesce(p_signup_source, '') ~* '^partner' then 30 else 14 end
$$;

-- 7. who to tell about billing: the owners of the business, with their WhatsApp number when they turned it on --------
create or replace function public.billing_owner_contacts(p_org uuid) returns table (user_id uuid, phone text, location_id uuid, business text)
language sql stable security definer set search_path = '' as $$
  select m.user_id, o.phone, l.id, l.name
    from public.organization_members m
    join lateral (select x.id, x.name from public.locations x where x.organization_id = m.organization_id
                   order by x.created_at limit 1) l on true
    left join public.whatsapp_optins o on o.user_id = m.user_id and o.state = 'active'
   where m.organization_id = p_org and m.role = 'owner'
$$;
revoke all on function public.billing_owner_contacts(uuid) from public, anon, authenticated;
grant execute on function public.billing_owner_contacts(uuid) to service_role;
