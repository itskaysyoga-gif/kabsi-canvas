-- P0.8-01 International and partner cleanup (K-123, K-124, K-125, K-127, R-33 to R-35).
-- Stops every read and write of the retired model: the Lebanon offer, card sales, USDT, Binance Pay, Whish, OMT and
-- cash, NOWPayments, and the old partner model (resale, partner-covered plans and billing, partner invoices and
-- claims, partner workspaces, partner approval policies, partner invites). Additive and reversible: nothing is removed
-- here. The tables, columns and functions that are now unused are removed by Hussein with the three separate files
-- 20261021180100 to 20261021180300 (plan section 2.3), after this migration and the code that stopped using them are
-- live.

-- 1. The monthly partner invoice job stops.
select cron.unschedule('kabsi_partner_billing') where exists (select 1 from cron.job where jobname = 'kabsi_partner_billing');

-- 2. No business is partner-covered any more. Kept as a stub only so a caller deployed earlier cannot fail; nothing
-- below calls it, and 20261021180100 removes it.
create or replace function public.partner_covered(p_location uuid) returns boolean
language sql stable security definer set search_path = '' as $$ select false $$;

-- 3. Entitlements: demo, concierge, paid, trial, grace, ended or none. No partner state (K-126, K-127).
create or replace function private.entitlements(p_org uuid, p_location uuid default null) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_lim jsonb := private.trial_limits();
  v_demo boolean; v_concierge boolean := false;
  v_paid_sub public.subscriptions; v_trial_sub public.subscriptions;
  v_legacy_paid timestamptz; v_legacy_trial timestamptz;
  v_state text; v_ends timestamptz; v_place text; v_used boolean;
  v_fixes integer := 0; v_ai integer := 0; v_trial jsonb := null; v_caps jsonb := null;
begin
  if p_org is null then
    select organization_id into p_org from public.locations where id = p_location;
  end if;
  select coalesce(o.is_demo, false) into v_demo from public.organizations o where o.id = p_org;
  if p_location is not null then
    select l.is_demo or v_demo, l.place_id into v_demo, v_place from public.locations l where l.id = p_location;
    v_concierge := public.concierge_unbilled(p_location);
  end if;

  select * into v_paid_sub from public.subscriptions s
   where s.organization_id = p_org and s.plan <> 'free'
     and ((s.state = 'active' and (s.current_period_end is null or s.current_period_end > now()))
       or (s.state = 'past_due' and s.current_period_end + interval '7 days' > now()))
   order by s.current_period_end desc nulls first limit 1;
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
    when v_trial_sub.id is not null and now() < coalesce(v_trial_sub.grace_ends_at, v_trial_sub.trial_ends_at + interval '7 days') then 'grace'
    when v_trial_sub.id is not null then 'ended'
    else 'none' end;

  v_ends := case v_state
    when 'paid' then greatest(v_paid_sub.current_period_end, v_legacy_paid)
    when 'trial' then coalesce(case when now() < v_trial_sub.trial_ends_at then v_trial_sub.trial_ends_at end, v_legacy_trial)
    when 'grace' then coalesce(v_trial_sub.grace_ends_at, v_trial_sub.trial_ends_at + interval '7 days')
    else null end;

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

  v_used := v_trial_sub.id is not null
    or (v_place is not null and exists (select 1 from public.trial_grants g where g.place_id = v_place))
    or exists (select 1 from public.trial_accounts a where a.account_key = any (private.org_account_keys(p_org)));

  return jsonb_build_object(
    'organization_id', p_org,
    'state', v_state,
    'watch', v_state in ('demo', 'concierge', 'paid', 'trial', 'grace'),
    'draft', v_state in ('demo', 'concierge', 'paid', 'trial', 'grace'),
    'publish', v_state in ('demo', 'concierge', 'paid', 'trial'),
    'ends_at', v_ends,
    'trial', v_trial,
    'caps', v_caps,
    'trial_used', v_used);
end $$;

-- 4. The trial: 14 days for every signup (K-126). The 30-day trial through a Kabsi Partners link comes with P0.8-12.
create or replace function public.trial_days_for(p_signup_source text) returns integer
language sql immutable set search_path = '' as $$ select 14 $$;

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

  v_ends := public.trial_end_at(now(), coalesce(l.time_zone, 'UTC'), coalesce(p_days, public.trial_days_for(l.signup_source)));
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

create or replace function public.staff_grant_trial(p_location uuid, p_days integer default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_days is not null and (p_days < 1 or p_days > 90) then raise exception 'bad_days'; end if;
  v_id := public.grant_trial_if_eligible(p_location, true, p_days);
  if v_id is null then raise exception 'not_eligible' using hint = 'Needs Google access and no earlier trial or payment.'; end if;
  perform public.refresh_location_status(p_location);
  return v_id;
end $$;

-- 5. Choosing a plan. Card payments open with Creem (P0.4-07); until then the trial intent is the only choice, and
-- there is no other way to pay (K-124).
create or replace function public.choose_plan(p_location uuid, p_kind text) returns text
language plpgsql security definer set search_path = '' as $$
begin
  if not public.has_location_role(p_location, array['owner']) then raise exception 'forbidden' using errcode = '42501'; end if;
  -- 'trial' is only an intent: the trial row is created when Google access starts.
  if p_kind <> 'trial' then raise exception 'bad_plan' using hint = 'Card payments are coming.'; end if;
  update public.locations set onboarding_step = 'done' where id = p_location;
  return public.refresh_location_status(p_location);
end $$;

create or replace function public.owner_plan_kinds(p_location uuid) returns text[]
language sql stable security definer set search_path = '' as $$ select '{}'::text[] $$;

create or replace function public.plan_months(p_kind text) returns integer
language sql immutable set search_path = '' as $$
  select case p_kind when 'pro_monthly' then 1 when 'pro_yearly' then 12 when 'pro_6m' then 6 end
$$;

create or replace function public.plan_price(p_item text) returns numeric
language sql immutable set search_path = '' as $$
  select case p_item when 'pro_monthly' then 19 when 'pro_yearly' then 190 when 'pro_6m' then 75 end::numeric
$$;

create or replace function public.start_paid_plans(p_location uuid) returns integer
language plpgsql security definer set search_path = '' as $$
declare p record; v_start timestamptz; v_n int := 0;
begin
  if not public.plan_clock_ready(p_location) then return 0; end if;
  perform public.grant_trial_if_eligible(p_location);
  for p in
    select pl.id, pl.kind from public.plans pl
    where pl.location_id = p_location and pl.status = 'pending' and pl.kind in ('pro_monthly','pro_yearly','pro_6m')
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

-- The Plan page: what the owner has and until when. No partner cover, no crypto route, nothing to buy until Creem.
create or replace function public.plan_summary(p_location uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare l public.locations; cur public.plans; v_tier text; v_tz text; v_unbilled boolean; v_ent jsonb;
begin
  if not (public.has_location_role(p_location, array['owner']) or public.is_staff()) then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into l from public.locations where id = p_location;
  if not found then return null; end if;
  v_tz := coalesce(l.time_zone, 'UTC');
  v_unbilled := public.concierge_unbilled(l.id);
  v_ent := private.entitlements(l.organization_id, l.id);
  select * into cur from public.plans where location_id = l.id and status = 'active'
    and starts_at <= now() and ends_at > now() order by (kind = 'trial') asc, ends_at desc limit 1;
  v_tier := case
    when v_unbilled then 'early_access'
    when not public.plan_clock_ready(l.id) then 'none'
    else case v_ent ->> 'state'
      when 'trial' then 'trial' when 'paid' then 'pro' when 'demo' then 'pro'
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
    'trial_days', public.trial_days_for(l.signup_source)
  );
end $$;

create or replace function public.trial_reminder_candidates()
returns table(plan_id uuid, location_id uuid, name text, time_zone text, ends_at timestamptz, last_day date, continues boolean)
language sql stable security definer set search_path = '' as $$
  select p.id, l.id, l.name, coalesce(l.time_zone, 'UTC'), p.ends_at,
         ((p.ends_at - interval '1 second') at time zone coalesce(l.time_zone, 'UTC'))::date,
         exists (select 1 from public.plans q where q.location_id = l.id and q.id <> p.id
                   and ((q.status = 'active' and q.ends_at > p.ends_at)
                        or (q.status = 'pending' and exists (select 1 from public.payments pay where pay.plan_id = q.id))))
  from public.plans p join public.locations l on l.id = p.location_id
  where p.kind = 'trial' and p.status = 'active' and p.ends_at > now() and p.ends_at < now() + interval '9 days'
$$;

create or replace function public.renewal_reminder_candidates()
returns table(plan_id uuid, location_id uuid, name text, time_zone text, kind text, ends_at timestamptz, last_day date, continues boolean)
language sql stable security definer set search_path = '' as $$
  select p.id, l.id, l.name, coalesce(l.time_zone, 'UTC'), p.kind, p.ends_at,
         ((p.ends_at - interval '1 second') at time zone coalesce(l.time_zone, 'UTC'))::date,
         exists (select 1 from public.plans q where q.location_id = l.id and q.id <> p.id
                   and ((q.status = 'active' and q.ends_at > p.ends_at)
                        or (q.status = 'pending' and exists (select 1 from public.payments pay where pay.plan_id = q.id))))
  from public.plans p join public.locations l on l.id = p.location_id
  where p.kind in ('pro_monthly','pro_yearly') and p.status = 'active' and p.ends_at > now() and p.ends_at < now() + interval '8 days'
$$;

-- 6. Sign-up: every business starts on its own. The partner handle and invite arguments are accepted and ignored
-- (the app no longer sends them); 20261021180100 replaces this function with one that has no such arguments.
create or replace function public.start_location(p_place_id text, p_name text, p_address text, p_country text, p_time_zone text,
  p_partner_handle text default null, p_invite uuid default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_existing uuid; v_id uuid; v_tz text;
begin
  if v_uid is null then raise exception 'not_signed_in' using errcode = '42501'; end if;
  if coalesce(trim(p_place_id), '') = '' or coalesce(trim(p_name), '') = '' then raise exception 'missing_business'; end if;

  select id into v_existing from public.locations where place_id = p_place_id;
  if v_existing is not null then
    if public.is_member(v_existing) then return v_existing; end if;
    raise exception 'already_on_kabsi' using hint = 'This business is already on Kabsi. Contact hello@kabsi.co.';
  end if;

  v_tz := case when exists (select 1 from pg_catalog.pg_timezone_names where name = p_time_zone) then p_time_zone else 'UTC' end;

  insert into public.locations (name, place_id, address, country, time_zone, signup_source, onboarding_step, created_by)
  values (left(trim(p_name), 200), p_place_id, left(p_address, 300), upper(left(p_country, 2)), v_tz, 'self', 'access', v_uid)
  returning id into v_id;
  insert into public.location_members (location_id, user_id, role) values (v_id, v_uid, 'owner');
  return v_id;
end $$;

-- 7. Roles: owner, manager, staff. Approval is the owner's, or the owner's and managers' (K-16 as amended by K-127).
alter table public.approval_policies
  add constraint approval_policies_owner_or_managers check (policy in ('owner', 'owner_and_managers')) not valid;
alter table public.approval_policies validate constraint approval_policies_owner_or_managers;

create or replace function public.set_approval_policy(p_location uuid, p_kind text, p_policy text, p_consent_text text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_old text;
begin
  if v_uid is null then raise exception 'sign_in_required' using errcode = '42501'; end if;
  if not public.has_location_role(p_location, array['owner']) then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_kind not in ('review_reply', 'post', 'photo', 'profile_change', 'hours') then raise exception 'bad_kind'; end if;
  if p_policy not in ('owner', 'owner_and_managers') then raise exception 'bad_policy'; end if;
  v_old := private.approval_policy(p_location, p_kind);
  insert into public.approval_policies (location_id, kind, policy, set_by, set_at)
  values (p_location, p_kind, p_policy, v_uid, now())
  on conflict (location_id, kind) do update set policy = excluded.policy, set_by = excluded.set_by, set_at = excluded.set_at;
  perform private.audit('user', v_uid, 'approval_policy_set', p_location, 'approval_policies', p_kind,
    jsonb_build_object('policy', v_old), jsonb_build_object('policy', p_policy), 'dashboard', p_policy);
  return jsonb_build_object('kind', p_kind, 'policy', p_policy);
end $$;

create or replace function private.may_approve(p_location uuid, p_kind text, p_user uuid, p_owner_only boolean)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare v_role text;
begin
  if p_user is null or p_location is null then return false; end if;
  select role into v_role from public.location_members where location_id = p_location and user_id = p_user;
  if v_role = 'owner' then return true; end if;
  if coalesce(p_owner_only, false) then return false; end if;
  if v_role = 'manager' then return private.approval_policy(p_location, p_kind) = 'owner_and_managers'; end if;
  return false;
end $$;

-- 8. Tenancy: a business's Google connection row stays in step; no partner client rows are written any more.
create or replace function private.location_sync_tenancy() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.google_connections as g
    (location_id, google_account_id, google_location_id, access_state, access_granted_at, last_successful_sync_at)
  values (new.id, new.google_account_id, new.google_location_id,
    case when new.access_removed_at is not null and new.access_granted_at is null then 'removed'
         when new.disconnect_requested_at is not null and new.access_removed_at is null then 'removing'
         when new.access_lost_at is not null then 'lost'
         when new.access_error_since is not null then 'error'
         when new.access_granted_at is not null and new.google_location_id is not null then 'granted'
         when new.status = 'access_pending' or new.onboarding_step = 'access' then 'pending'
         else 'none' end,
    new.access_granted_at, new.reviews_synced_at)
  on conflict (location_id) do update set
    google_account_id = excluded.google_account_id,
    google_location_id = excluded.google_location_id,
    access_state = excluded.access_state,
    access_granted_at = excluded.access_granted_at,
    last_successful_sync_at = excluded.last_successful_sync_at,
    updated_at = now()
  where (g.google_account_id, g.google_location_id, g.access_state, g.access_granted_at, g.last_successful_sync_at)
    is distinct from (excluded.google_account_id, excluded.google_location_id, excluded.access_state,
                      excluded.access_granted_at, excluded.last_successful_sync_at);
  return null;
end $$;

-- 9. Business Knowledge: no partner source.
create or replace function private.fact_trust(p_status text, p_source text, p_confirmed_by uuid) returns integer
language sql immutable set search_path = '' as $$
  select case
    when p_status = 'verified' and (p_source in ('owner', 'staff') or p_confirmed_by is not null) then 1
    when p_source = 'google' then 2
    when p_source = 'website' then 3
    when p_source in ('staff', 'owner') then 4
    else 5 end
$$;

create or replace function public.propose_fact(p_location uuid, p_slot text, p_key text, p_value jsonb, p_source text,
  p_source_ref text default null, p_uses text[] default null) returns text
language plpgsql security definer set search_path = '' as $$
declare cur public.knowledge_facts; v_new uuid; v_had boolean;
begin
  if p_source not in ('google', 'website', 'ai_suggestion', 'staff') then
    raise exception 'propose_fact: source % (the owner saves with save_fact)', p_source;
  end if;
  if p_value is null or jsonb_typeof(p_value) <> 'object' then raise exception 'propose_fact: value must be an object'; end if;
  if not exists (select 1 from public.locations where id = p_location) then raise exception 'unknown_location'; end if;

  if exists (select 1 from public.knowledge_facts where location_id = p_location and slot = p_slot
               and status = 'rejected' and value = p_value) then
    return 'rejected_before';
  end if;

  select * into cur from public.knowledge_facts
   where location_id = p_location and slot = p_slot and superseded_by is null for update;
  v_had := found;

  if v_had and cur.value = p_value then
    return 'same';
  end if;

  if v_had and (cur.status = 'verified'
                or private.fact_trust(cur.status, cur.source, cur.confirmed_by) < private.fact_trust('needs_confirmation', p_source, null)) then
    -- More trust already: a lower source never overrides it (K-11). Something customers see is asked about.
    if cur.status in ('verified', 'needs_confirmation') and private.fact_customer_facing(cur.key) then
      insert into public.knowledge_confirms (location_id, slot, key, proposed_value, proposed_source, proposed_source_ref)
      values (p_location, p_slot, cur.key, p_value, p_source, left(p_source_ref, 200))
      on conflict (location_id, slot) where state = 'open'
      do update set proposed_value = excluded.proposed_value, proposed_source = excluded.proposed_source,
                    proposed_source_ref = excluded.proposed_source_ref;
      return 'asked';
    end if;
    return 'held';
  end if;

  -- Nothing yet, or an unconfirmed value with no more trust than this one: the newer reading waits for the owner.
  v_new := gen_random_uuid();
  if v_had then
    update public.knowledge_facts set superseded_by = v_new where id = cur.id;
  end if;
  insert into public.knowledge_facts (id, location_id, slot, key, value, status, source, source_ref, uses, version)
  values (v_new, p_location, p_slot, coalesce(cur.key, p_key), p_value, 'needs_confirmation', p_source, left(p_source_ref, 200),
    coalesce(p_uses, cur.uses, array['replies', 'posts']), coalesce(cur.version, 0) + 1);
  return case when v_had then 'replaced' else 'added' end;
end $$;

-- 10. Notification categories: no partner category (K-118 as amended by K-127).
create or replace function public.set_notification_pref(p_location uuid, p_category text, p_channel text, p_frequency text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.has_location_role(p_location, array['owner', 'manager']) then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_category <> all (array['review_high_risk', 'review_new', 'profile_urgent', 'profile_issue', 'approval_needed',
                              'weekly_report', 'access', 'billing', 'trial', 'account', 'help']) then
    raise exception 'bad_category';
  end if;
  if p_channel not in ('email', 'in_app') then raise exception 'bad_channel'; end if;
  if p_frequency not in ('default', 'instant', 'daily_digest', 'off') then raise exception 'bad_frequency'; end if;
  if p_channel = 'in_app' and p_frequency = 'daily_digest' then raise exception 'bad_frequency'; end if;
  if p_frequency = 'off' and p_category = any (array['profile_urgent', 'access', 'billing', 'account', 'help']) then
    raise exception 'cannot_switch_off';
  end if;
  insert into public.notification_preferences (user_id, location_id, category, channel, frequency)
  values (auth.uid(), p_location, p_category, p_channel, p_frequency)
  on conflict (user_id, location_id, category, channel) do update set frequency = excluded.frequency, updated_at = now();
end $$;

create or replace function public.apply_unsubscribe(p_address text, p_location uuid, p_category text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_user uuid;
begin
  if p_category <> all (array['review_high_risk', 'review_new', 'profile_issue', 'approval_needed', 'weekly_report', 'trial']) then
    raise exception 'cannot_unsubscribe';
  end if;
  insert into public.email_suppressions (address, scope, reason) values (lower(p_address), p_category, 'unsubscribe')
  on conflict (address, scope) do nothing;
  if p_location is not null then
    select m.user_id into v_user from public.location_members m join auth.users u on u.id = m.user_id
     where m.location_id = p_location and lower(u.email) = lower(p_address) limit 1;
    if v_user is not null then
      insert into public.notification_preferences (user_id, location_id, category, channel, frequency)
      values (v_user, p_location, p_category, 'email', 'off')
      on conflict (user_id, location_id, category, channel) do update set frequency = 'off', updated_at = now();
    end if;
  end if;
end $$;

-- 11. The Slack side: no partner, card-order or payment-claim lines.
create or replace function public.ops_plan_label(p text) returns text
language sql immutable set search_path = '' as $$
  select case p when 'trial' then 'Pro trial' when 'pro_monthly' then 'Kabsi Pro, monthly' when 'pro_yearly' then 'Kabsi Pro, yearly'
    when 'pro_6m' then 'Kabsi Pro, 6 months' else coalesce(p, '') end
$$;

create or replace function public.ops_on_plan() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_name text;
begin
  select name into v_name from public.locations where id = new.location_id;
  if new.status = 'active' and (tg_op = 'INSERT' or old.status is distinct from 'active') then
    if new.kind = 'trial' then
      perform public.ops_emit('trial_started', 'customers', ':seedling: Pro trial started: ' || coalesce(v_name, 'a business'),
        null, public.ops_f('Until', to_char(new.ends_at at time zone 'UTC', 'DD Mon YYYY')), public.ops_staff_btn(), 'trial_on:' || new.id);
    else
      perform public.ops_emit('plan_started', 'money', ':white_check_mark: Plan started: ' || coalesce(v_name, 'a business'),
        null, public.ops_f('Plan', public.ops_plan_label(new.kind)) || public.ops_f('Until', to_char(new.ends_at, 'DD Mon YYYY')),
        public.ops_staff_btn(), 'plan_on:' || new.id);
    end if;
  elsif tg_op = 'UPDATE' and new.status = 'ended' and old.status = 'active' then
    if new.kind = 'trial' then
      perform public.ops_emit('trial_ended', 'customers', ':hourglass: Pro trial ended: ' || coalesce(v_name, 'a business'),
        'They have no plan now unless a paid plan is queued. The review link and QR code keep working; drafts, Google Protection and reports stopped. A good moment to check in.',
        '[]', public.ops_staff_btn(), 'trial_end:' || new.id);
    else
      perform public.ops_emit('plan_ended', 'customers', ':hourglass: Plan ended: ' || coalesce(v_name, 'a business'),
        'Their paid plan finished. The review link and QR code keep working; drafts, Google Protection and reports stopped. A good moment to check in.',
        public.ops_f('Plan', public.ops_plan_label(new.kind)), public.ops_staff_btn(), 'plan_end:' || new.id);
    end if;
  end if;
  return new;
end $$;

create or replace function public.ops_on_location() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_owner text;
begin
  if tg_op = 'INSERT' then
    select email into v_owner from auth.users where id = new.created_by;
    if coalesce(v_owner, '') like '%@test.local' then return new; end if;
    perform public.ops_emit('business_new', 'customers', ':convenience_store: New business started setup: ' || new.name,
      new.address,
      public.ops_f('Country', new.country) || public.ops_f('Owner', v_owner) || public.ops_f('Came from', new.signup_source),
      public.ops_staff_btn(), 'loc_new:' || new.id);
    return new;
  end if;

  if new.status = 'active' and old.status is distinct from 'active' then
    perform public.ops_emit('business_live', 'customers', ':tada: ' || new.name || ' is live on Kabsi',
      'Google access works. Reviews are synced and drafted from now on.',
      public.ops_f('Country', new.country),
      public.ops_staff_btn(), 'loc_live:' || new.id || ':' || extract(epoch from now())::bigint);
  end if;
  if new.access_lost_at is not null and old.access_lost_at is null and new.disconnect_requested_at is null then
    perform public.ops_emit('access_lost', 'alerts', ':warning: Google access lost: ' || new.name,
      'Kabsi can''t reach this Google profile any more (hello@kabsi.co removed or access changed). The owner was emailed the steps to add it back.',
      public.ops_f('Country', new.country), public.ops_staff_btn(),
      'loc_lost:' || new.id || ':' || extract(epoch from new.access_lost_at)::bigint);
  end if;
  if new.deletion_requested_at is not null and old.deletion_requested_at is null then
    perform public.ops_emit('deletion_requested', 'customers', ':wastebasket: Deletion requested: ' || new.name,
      'The owner asked to remove this business from Kabsi. It goes in 7 days unless they cancel.', '[]', public.ops_staff_btn(),
      'loc_del:' || new.id || ':' || extract(epoch from new.deletion_requested_at)::bigint);
  elsif new.deletion_requested_at is null and old.deletion_requested_at is not null then
    perform public.ops_emit('deletion_cancelled', 'customers', ':relieved: Deletion cancelled: ' || new.name, null, '[]', '[]',
      'loc_undel:' || new.id || ':' || extract(epoch from now())::bigint);
  end if;
  if new.status in ('paused', 'disabled') and old.status is distinct from new.status
     and not (new.disconnect_requested_at is not null and old.disconnect_requested_at is null) then
    perform public.ops_emit('business_' || new.status, 'customers', ':pause_button: ' || new.name || ' is now ' || new.status, null,
      '[]', public.ops_staff_btn(), 'loc_' || new.status || ':' || new.id || ':' || extract(epoch from now())::bigint);
  end if;
  return new;
end $$;

create or replace function public.ops_on_lead() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform public.ops_emit('lead_' || new.kind, 'customers',
    ':incoming_envelope: New business enquiry: ' || coalesce(new.name, new.email),
    new.message,
    public.ops_f('Email', new.email) || public.ops_f('Instagram', new.instagram) || public.ops_f('Country', new.country) || public.ops_f('Volume', new.volume),
    public.ops_btn('Reply by email', 'mailto:' || new.email || '?subject=' || public.url_encode('Kabsi')) ||
      case when new.instagram is not null then public.ops_btn('Open Instagram', 'https://instagram.com/' || ltrim(new.instagram, '@')) else '[]'::jsonb end
      || public.ops_staff_btn(),
    'lead:' || new.id);
  return new;
end $$;

create or replace function public.ops_digest(p_hours integer default 24) returns jsonb
language sql stable security definer set search_path = '' as $$
  with w as (select now() - make_interval(hours => p_hours) as since),
  d as (select id from public.locations where is_demo)
  select jsonb_build_object(
    'hours', p_hours,
    'signups', (select count(*) from auth.users, w where created_at > since and email not like '%@test.local'
                  and lower(email) is distinct from public.demo_login_email()),
    'businesses_new', (select count(*) from public.locations, w where created_at > since and not is_demo),
    'businesses_live', (select count(*) from public.locations, w where activated_at > since and not is_demo),
    'businesses_active_total', (select count(*) from public.locations where status = 'active' and not is_demo),
    'waiting_for_access', (select count(*) from public.locations where status = 'access_pending' and not is_demo),
    'reviews_new', (select count(*) from public.reviews, w where created_at > since and location_id not in (select id from d)),
    'replies_posted', (select count(*) from public.publications, w where target_type = 'review_reply' and state in ('verified','verifying','checking') and created_at > since and (location_id is null or location_id not in (select id from d))),
    'drafts_waiting', (select count(*) from public.reviews where state in ('drafted','blocked') and location_id not in (select id from d)),
    'high_risk_waiting', (select count(*) from public.reviews where state in ('drafted','blocked') and risk = 'high' and location_id not in (select id from d)),
    'posts_published', (select count(*) from public.publications, w where target_type = 'local_post' and state in ('verified','verifying','checking') and created_at > since and (location_id is null or location_id not in (select id from d))),
    'shield_changes', (select count(*) from public.profile_changes, w where detected_at > since and location_id not in (select id from d)),
    'taps', (select count(*) from public.taps, w where created_at > since and not is_bot and (location_id is null or location_id not in (select id from d))),
    'chats', (select count(*) from public.chat_conversations, w where created_at > since and message_count > 0 and (location_id is null or location_id not in (select id from d))),
    'chats_hot', (select count(*) from public.chat_conversations, w where created_at > since and lead_temperature = 'hot' and (location_id is null or location_id not in (select id from d))),
    'handoffs', (select count(*) from public.chat_conversations, w where updated_at > since and status = 'handoff' and (location_id is null or location_id not in (select id from d))),
    'contacts', (select count(*) from public.contacts, w where created_at > since),
    'leads', (select count(*) from public.leads, w where created_at > since),
    'payments_usd', (select coalesce(sum(amount_usd), 0) from public.payments, w where created_at > since),
    'plans_ending_14d', (select count(*) from public.plans where status = 'active' and ends_at between now() and now() + interval '14 days'),
    'emails_sent', (select count(*) from public.emails, w where created_at > since and status in ('sent','delivered') and (location_id is null or location_id not in (select id from d))),
    'emails_failed', (select count(*) from public.emails, w where created_at > since and status in ('failed','bounced') and coalesce(error,'') not like 'test address%'),
    'jobs_failed', (select count(*) from public.jobs_log, w where created_at > since and not ok),
    'publications_failed', (select count(*) from public.publications, w where updated_at > since and state = 'failed' and (location_id is null or location_id not in (select id from d))),
    'google_mode', (select value from public.app_settings where key = 'google_mode'),
    'slack_queue', (select count(*) from public.ops_events where sent_at is null)
  )
$$;

-- 12. Review cards: existing codes keep working (K-125); members see their business's cards and staff see all. No
-- partner sees cards any more, and card orders are staff history only.
alter policy members_read_cards on public.cards
  using (public.can_see(location_id, 'review_link') or (select public.is_staff()));
alter policy members_read_card_orders on public.card_orders
  using ((select public.is_staff()));

-- 13. The NOWPayments switch reads off for everyone.
create or replace function public.billing_enabled_for(p_location uuid) returns boolean
language sql stable security definer set search_path = '' as $$ select false $$;

-- 14. Nobody can call the retired functions or read or write the retired tables any more, the Edge Functions'
-- service role included. The table owner (postgres) keeps its rights, so the removal files can still run.
revoke execute on function
  public.owner_submit_claim(uuid, text, text, text),
  public.partner_submit_claim(uuid, text, text),
  public.partner_create_invite(uuid, text, text),
  public.partner_invoice_calc(uuid, date),
  public.partner_locations(uuid),
  public.partner_rate(uuid, date),
  public.partner_recipients(uuid),
  public.partner_billing_run(date),
  public.partner_covered(uuid),
  public.claim_partner_membership(),
  public.is_partner_member(uuid),
  public.staff_create_partner(text, text, text, text, text),
  public.staff_update_partner_contact(uuid, text, text),
  public.staff_create_card_order(uuid, uuid, integer, text),
  public.staff_set_card_order_status(uuid, text),
  public.staff_decide_claim(uuid, boolean, text),
  public.staff_record_payment(uuid, text, numeric, text, text),
  public.record_plan_payment(uuid, text, numeric, text, text, uuid),
  public.generate_card_codes(integer, uuid),
  public.billing_prepare_invoice(uuid, text, text, boolean),
  public.billing_apply_ipn(text, text, text, text, numeric, text, text, numeric, boolean),
  public.billing_attach_invoice(uuid, text, text),
  public.billing_mark_create_failed(uuid),
  public.billing_invoice_status(uuid),
  public.billing_enabled_for(uuid),
  public.owner_plan_kinds(uuid)
from public, anon, authenticated, service_role;

revoke all on table
  public.partners, public.partner_members, public.partner_invites, public.partner_clients, public.partner_invoices,
  public.usdt_claims, public.card_orders, public.billing_invoices
from anon, authenticated, service_role;
