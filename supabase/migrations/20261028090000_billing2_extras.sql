-- Billing 2 (master plan 10.2.3, 30.15 section 5, LATER rows of Session 10 follow-up): the extra-location fallback.
-- Creem refuses to add an item to a subscription (subscription_item_add_unsupported), so each extra location is its own
-- Creem subscription of the Extra location product, bought through a second checkout on the same Creem customer.
--   1. public.billing_extras: one row per extra-location subscription. Never a second plan row: the units of the running
--      extras are kept on the owner's plan row (subscriptions.units) by public.billing_extras_sync, which the webhook's
--      job calls after every Creem event.
--   2. private.entitlements: a business past the plan's locations (the newest first) stops its Kabsi work
--      ('location_on_plan' false; watch, draft and publish false). Nothing on Google changes.
--   3. private.creem_base_cents: the partner ledger's last fallback (no transaction, no order) is the product price
--      times its units, so a payment for extra locations is never undercounted.
-- Additive only (CREATE, ALTER ... ADD, CREATE OR REPLACE, COMMENT, GRANT, REVOKE).

-- 1. the extra-location subscriptions ----------------------------------------------------------------------------
create table if not exists public.billing_extras (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  provider text not null default 'creem' constraint billing_extras_provider_check check (provider = 'creem'),
  provider_subscription_id text not null constraint billing_extras_provider_subscription_key unique,
  provider_customer_id text,
  mode text constraint billing_extras_mode_check check (mode in ('test', 'live')),
  state text not null default 'incomplete'
    constraint billing_extras_state_check check (state in ('incomplete', 'active', 'past_due', 'paused', 'cancelled', 'expired')),
  period text constraint billing_extras_period_check check (period in ('month', 'year')),
  units integer not null default 1 constraint billing_extras_units_check check (units >= 0),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  ended_with_plan boolean not null default false,
  cancel_requested_at timestamptz,
  past_due_at timestamptz,
  last_event_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists billing_extras_organization_idx on public.billing_extras (organization_id);
create index if not exists billing_extras_subscription_idx on public.billing_extras (subscription_id);
alter table public.billing_extras enable row level security;
revoke all on table public.billing_extras from public, anon, authenticated;
grant select, insert, update, delete on table public.billing_extras to service_role;
comment on table public.billing_extras is 'Billing 2 (10.2.3): one row per Creem subscription of the Extra location product. Written only by the billing job; the running units are kept on the plan row.';
comment on column public.billing_extras.subscription_id is 'The owner''s plan row (subscriptions) these units are kept on.';
comment on column public.billing_extras.cancel_requested_at is 'The owner asked to remove this extra location; Creem''s scheduled_cancel event sets the paid state.';
comment on column public.billing_extras.ended_with_plan is 'Kabsi scheduled this cancel because the base plan was cancelled; Keep my plan resumes it.';

-- The units of the running extras, written on the owner's plan row (the newest running Creem plan). Returns the units.
create or replace function public.billing_extras_sync(p_org uuid) returns integer
language plpgsql security definer set search_path = '' as $$
declare v_units integer; v_sub uuid;
begin
  perform pg_advisory_xact_lock(hashtext('billing_extras:' || p_org::text));
  select coalesce(sum(x.units), 0)::integer into v_units from public.billing_extras x
   where x.organization_id = p_org
     and (x.state = 'active'
       or (x.state = 'past_due' and coalesce(x.past_due_at, x.updated_at) + interval '7 days' > now()));
  select s.id into v_sub from public.subscriptions s
   where s.organization_id = p_org and s.provider = 'creem' and s.plan in ('essentials', 'pro')
   order by (s.state in ('active', 'past_due')) desc, coalesce(s.last_event_at, s.updated_at) desc nulls last limit 1;
  if v_sub is null then return v_units; end if;
  update public.subscriptions set units = v_units, updated_at = now() where id = v_sub and units is distinct from v_units;
  update public.billing_extras set subscription_id = v_sub
   where organization_id = p_org and subscription_id is distinct from v_sub and state in ('incomplete', 'active', 'past_due');
  return v_units;
end $$;
revoke all on function public.billing_extras_sync(uuid) from public, anon, authenticated;
grant execute on function public.billing_extras_sync(uuid) to service_role;
comment on function public.billing_extras_sync(uuid) is 'Billing 2: subscriptions.units of the plan row = the units of the running extra-location subscriptions.';

-- 2. entitlements: as it stands live (20261026165709), plus the businesses on the plan -------------------------
create or replace function private.entitlements(p_org uuid, p_location uuid default null) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_lim jsonb := private.trial_limits();
  v_demo boolean; v_concierge boolean := false;
  v_paid_sub public.subscriptions; v_trial_sub public.subscriptions; v_creem public.subscriptions;
  v_legacy_paid timestamptz; v_legacy_trial timestamptz;
  v_state text; v_ends timestamptz; v_place text; v_used boolean; v_plan text; v_grace_ends timestamptz;
  v_fixes integer := 0; v_ai integer := 0; v_trial jsonb := null; v_caps jsonb := null; v_billing jsonb := null;
  v_allowed integer; v_rank integer; v_on_plan boolean := true;
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

  -- Billing 2 (10.2.3): a Creem plan covers 1 + its extra locations. The oldest businesses of the organisation are on
  -- the plan; a business past that number (an extra location cancelled) stops its Kabsi work, and nothing on Google
  -- changes. Plans paid before Creem are per business and are not counted here.
  -- The plan row's units, never more than the extras running now: a failed payment of an extra counts 7 days, like the plan.
  v_allowed := case when v_state = 'paid' then 1 + least(coalesce(v_paid_sub.units, 0), (
      select coalesce(sum(x.units), 0)::integer from public.billing_extras x
       where x.organization_id = p_org
         and (x.state = 'active' or (x.state = 'past_due' and coalesce(x.past_due_at, x.updated_at) + interval '7 days' > now()))))
    when v_plan is not null then 1 else 0 end;
  if p_location is not null and v_state = 'paid' and v_paid_sub.provider = 'creem' and v_legacy_paid is null then
    select r.n into v_rank from (
      select l.id, row_number() over (order by l.created_at, l.id) as n from public.locations l
       where l.organization_id = p_org and l.deletion_requested_at is null) r
     where r.id = p_location;
    v_on_plan := v_rank is null or v_rank <= v_allowed;
  end if;

  v_used := v_trial_sub.id is not null
    or (v_place is not null and exists (select 1 from public.trial_grants g where g.place_id = v_place))
    or exists (select 1 from public.trial_accounts a where a.account_key = any (private.org_account_keys(p_org)));

  return jsonb_build_object(
    'organization_id', p_org,
    'state', v_state,
    'plan', v_plan,
    'limits', private.plan_limits(v_plan),
    'locations_allowed', v_allowed,
    'location_on_plan', v_on_plan,
    'watch', v_on_plan and v_state in ('demo', 'concierge', 'paid', 'trial', 'grace', 'paused'),
    'draft', v_on_plan and v_state in ('demo', 'concierge', 'paid', 'trial', 'grace', 'paused'),
    'publish', v_on_plan and v_state in ('demo', 'concierge', 'paid', 'trial'),
    'ends_at', v_ends,
    'trial', v_trial,
    'caps', v_caps,
    'billing', v_billing,
    'trial_used', v_used);
end $$;


-- 3. the partner ledger's base: as it stands live (20261026165709), with the product price times its units last --
create or replace function private.creem_base_cents(d jsonb) returns integer
language sql immutable set search_path = '' as $$
  select coalesce(
    private.cents(d #>> '{object,transaction,amount}'),
    private.cents(d #>> '{object,last_transaction,amount}'),
    private.cents(d #>> '{object,order,sub_total}') - coalesce(private.cents(d #>> '{object,order,discount_amount}'), 0),
    private.cents(d #>> '{object,product,price}') * greatest(1, coalesce((
      select sum(private.cents(i ->> 'units'))::integer
        from jsonb_array_elements(case when jsonb_typeof(d #> '{object,items}') = 'array' then d #> '{object,items}' else '[]'::jsonb end) i
       where i ->> 'product_id' = d #>> '{object,product,id}'), 1)))
$$;
revoke all on function private.creem_base_cents(jsonb) from public, anon, authenticated;
