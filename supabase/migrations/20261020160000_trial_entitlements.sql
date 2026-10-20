-- P0.4-06: the trial (K-101, K-94 clock, K-48 grace, R-24, R-16) and one entitlements function every feature checks.
--
-- 1. private.entitlements(org, location) decides what an organisation may do now: watch, draft, publish, and the
--    trial caps. States: demo, partner, concierge, paid, trial, grace, ended, none. public.entitlements is the same
--    answer for a member of the organisation, staff or the service key. Billing state lives on the organisation
--    (subscriptions, K-33); the NOWPayments `plans` rows are read here and only here until Creem (P0.4-07) moves them.
-- 2. The trial starts only at working access to a verified profile: google_connections.access_state 'granted' and
--    voice_of_merchant true. Never for a demo, concierge or partner-covered business, never twice for one place ID
--    (trial_grants) or one Google account (trial_accounts: the owner's Google sign-in and the owner's email, Gmail
--    dots and +tags folded). A returning listing goes straight to a plan; its location row and settings are the same
--    row as before, because a place can have only one location (start_location refuses a second).
-- 3. Caps during the trial: 3 profile fixes of the owner's choice (trial_usage), 10 backlog drafts (backlog.ts reads
--    the limit), 100 AI generations (ai_budget_take, silent, then the owner is asked to subscribe or book a call).
-- 4. Day 14 to 21 is grace: watching and drafting go on, nothing publishes, Home shows what is waiting (a billing
--    task). Day 21: private.trial_sweep marks the trial expired and removes Kabsi's Manager access through the
--    disconnect job, which tells the owner. Removal waits for app_settings.trial_removal = 'on' (shipped 'off', to be
--    switched on with Creem in P0.4-07, because until then an owner has no card path to pay); while off, staff get a
--    note for each business instead.
-- No row is removed by this file. app_settings.plans_v2 is no longer read by the trial.

-- 0. Columns and tables ----------------------------------------------------------------------------------------------
alter table public.google_connections add column if not exists voice_of_merchant boolean;
comment on column public.google_connections.voice_of_merchant is
  'Google verification of the profile (K-94): true once Google lists it as verified with Kabsi as Manager; null unknown.';

alter table public.subscriptions
  add column if not exists grace_ends_at timestamptz,
  add column if not exists trial_place_id text,
  add column if not exists trial_account_keys text[];

create table if not exists public.trial_accounts (
  account_key text primary key,
  organization_id uuid not null,
  place_id text,
  granted_at timestamptz not null default now()
);
alter table public.trial_accounts enable row level security;
revoke all on public.trial_accounts from anon, authenticated;

create table if not exists public.trial_usage (
  organization_id uuid not null,
  kind text not null check (kind in ('profile_fix')),
  ref text not null,
  used_at timestamptz not null default now(),
  primary key (organization_id, kind, ref)
);
alter table public.trial_usage enable row level security;
revoke all on public.trial_usage from anon, authenticated;

insert into public.app_settings (key, value) values ('trial_removal', 'off') on conflict (key) do nothing;

-- 1. Account keys: one Google account is one trial, whichever way the owner signs in -------------------------------
create or replace function private.email_account_key(p_email text) returns text
language sql immutable set search_path = '' as $$
  select case when p_email is null or position('@' in p_email) = 0 then null else
    'email:' || case
      when split_part(lower(p_email), '@', 2) in ('gmail.com', 'googlemail.com')
        then replace(split_part(split_part(lower(p_email), '@', 1), '+', 1), '.', '') || '@gmail.com'
      else split_part(split_part(lower(p_email), '@', 1), '+', 1) || '@' || split_part(lower(p_email), '@', 2)
    end end
$$;

create or replace function private.org_account_keys(p_org uuid) returns text[]
language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(distinct k) filter (where k is not null), '{}')
  from (
    select private.email_account_key(u.email) as k
      from public.organization_members m join auth.users u on u.id = m.user_id
     where m.organization_id = p_org and m.role = 'owner'
    union all
    select 'google:' || i.provider_id
      from public.organization_members m join auth.identities i on i.user_id = m.user_id and i.provider = 'google'
     where m.organization_id = p_org and m.role = 'owner'
  ) keys
$$;

-- 2. The one decision -------------------------------------------------------------------------------------------------
create or replace function private.trial_limits() returns jsonb
language sql immutable set search_path = '' as $$
  select '{"profile_fixes": 3, "backlog_drafts": 10, "ai_generations": 100, "days": 14, "grace_days": 7}'::jsonb
$$;

create or replace function private.entitlements(p_org uuid, p_location uuid default null) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_lim jsonb := private.trial_limits();
  v_demo boolean; v_partner boolean := false; v_concierge boolean := false;
  v_paid_sub public.subscriptions; v_trial_sub public.subscriptions;
  v_legacy_paid timestamptz; v_legacy_partner boolean; v_legacy_trial timestamptz;
  v_state text; v_ends timestamptz; v_place text; v_used boolean;
  v_fixes integer := 0; v_ai integer := 0; v_trial jsonb := null; v_caps jsonb := null;
begin
  if p_org is null then
    select organization_id into p_org from public.locations where id = p_location;
  end if;
  select coalesce(o.is_demo, false) into v_demo from public.organizations o where o.id = p_org;
  if p_location is not null then
    select l.is_demo or v_demo, l.place_id into v_demo, v_place from public.locations l where l.id = p_location;
    v_partner := public.partner_covered(p_location);
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

  -- NOWPayments plans (per business) until P0.4-07 moves them onto the organisation.
  select max(p.ends_at) filter (where p.kind not in ('trial', 'partner')),
         bool_or(p.kind = 'partner'),
         max(p.ends_at) filter (where p.kind = 'trial')
    into v_legacy_paid, v_legacy_partner, v_legacy_trial
    from public.plans p join public.locations l on l.id = p.location_id
   where l.organization_id = p_org and (p_location is null or l.id = p_location)
     and p.status = 'active' and (p.ends_at is null or p.ends_at > now());

  v_state := case
    when v_demo then 'demo'
    when v_partner or coalesce(v_legacy_partner, false) then 'partner'
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
    'watch', v_state in ('demo', 'partner', 'concierge', 'paid', 'trial', 'grace'),
    'draft', v_state in ('demo', 'partner', 'concierge', 'paid', 'trial', 'grace'),
    'publish', v_state in ('demo', 'partner', 'concierge', 'paid', 'trial'),
    'ends_at', v_ends,
    'trial', v_trial,
    'caps', v_caps,
    'trial_used', v_used);
end $$;

-- The same answer for the app and the Edge Functions: a member of the organisation, staff, or the service key.
create or replace function public.entitlements(p_org uuid, p_location uuid default null) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if p_org is null then
    select organization_id into p_org from public.locations where id = p_location;
  end if;
  if p_location is not null and not exists (select 1 from public.locations where id = p_location and organization_id = p_org) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if not (coalesce(auth.role(), 'service_role') = 'service_role' or public.is_staff()
          or exists (select 1 from public.organization_members m where m.organization_id = p_org and m.user_id = auth.uid())
          or exists (select 1 from public.location_members lm join public.locations l on l.id = lm.location_id
                      where l.organization_id = p_org and lm.user_id = auth.uid())) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return private.entitlements(p_org, p_location);
end $$;
revoke all on function public.entitlements(uuid, uuid) from public, anon;
grant execute on function public.entitlements(uuid, uuid) to authenticated, service_role;

-- A gated feature asks one question: may this business do this now?
create or replace function private.entitled(p_location uuid, p_right text) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((private.entitlements(null, p_location) ->> p_right)::boolean, false)
$$;

-- 3. The trial clock ---------------------------------------------------------------------------------------------------
create or replace function private.start_trial(p_location uuid, p_days integer default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare l public.locations; g public.google_connections; v_keys text[]; v_id uuid; v_ends timestamptz;
begin
  select * into l from public.locations where id = p_location for update;
  if not found or l.is_demo or l.organization_id is null then return null; end if;
  -- Concierge (early access) and partner-covered businesses never start a trial.
  if l.concierge or public.is_concierge_gid(l.google_location_id) or public.partner_covered(l.id) then return null; end if;
  -- Working access to a verified profile (K-94): Kabsi is Manager and Google says the profile is verified.
  select * into g from public.google_connections where location_id = l.id;
  if not found or g.access_state <> 'granted' or g.voice_of_merchant is not true
     or l.access_granted_at is null or l.google_location_id is null then
    return null;
  end if;
  if exists (select 1 from public.organizations o where o.id = l.organization_id and o.is_demo) then return null; end if;
  -- One trial per organisation; none after a paid plan.
  if exists (select 1 from public.subscriptions s where s.organization_id = l.organization_id
              and (s.trial_started_at is not null or s.state in ('active', 'past_due'))) then
    return null;
  end if;
  if exists (select 1 from public.plans p where p.location_id = l.id
              and (p.kind = 'trial' or p.status in ('active', 'ended', 'refunded')
                   or exists (select 1 from public.payments pay where pay.plan_id = p.id))) then
    return null;
  end if;
  -- One trial per place ID and per Google account (K-101, K-100).
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

-- The old entry point (start_paid_plans and staff_grant_trial call it) now starts the organisation's trial.
create or replace function public.grant_trial_if_eligible(p_location uuid, p_ignore_flag boolean default false, p_days integer default null)
returns uuid
language plpgsql security definer set search_path = '' as $$
begin
  return private.start_trial(p_location, p_days);
end $$;

-- A profile fix during the trial: true while the 3 are not used (the same fix asked twice counts once).
create or replace function private.trial_take(p_location uuid, p_kind text, p_ref text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare e jsonb := private.entitlements(null, p_location); v_org uuid := (e ->> 'organization_id')::uuid; v_used integer;
begin
  if e ->> 'state' not in ('trial', 'grace') then return true; end if;
  if p_kind <> 'profile_fix' then raise exception 'unknown_trial_cap'; end if;
  perform pg_advisory_xact_lock(hashtext('trial_take:' || v_org));
  if exists (select 1 from public.trial_usage where organization_id = v_org and kind = p_kind and ref = p_ref) then return true; end if;
  select count(*) into v_used from public.trial_usage where organization_id = v_org and kind = p_kind;
  if v_used >= (private.trial_limits() ->> 'profile_fixes')::int then return false; end if;
  insert into public.trial_usage (organization_id, kind, ref) values (v_org, p_kind, p_ref);
  return true;
end $$;

-- The publication kinds that are one-time profile fixes (K-101). Posts, photos, holiday hours, review replies and
-- Google Protection put-backs are the ongoing product and are never capped. The profile update kind arrives with the
-- profile editor; until then nothing in approve_publication matches it.
create or replace function private.profile_fix_kinds() returns text[]
language sql immutable set search_path = '' as $$ select array['profile_update'] $$;

-- 4. Features read entitlements ------------------------------------------------------------------------------------------
-- 4a. Location status (sync, drafting and the weekly report run only for 'active'): active while the organisation may watch.
create or replace function public.refresh_location_status(p_location uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare l public.locations; v_paid boolean; v_new text;
begin
  if public.is_demo_location(p_location) then
    return (select status from public.locations where id = p_location);
  end if;
  perform public.start_paid_plans(p_location);
  select * into l from public.locations where id = p_location for update;
  if not found then return null; end if;
  if l.status in ('paused','disabled') then return l.status; end if;
  v_paid := private.entitled(l.id, 'watch');
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

-- 4b. Publishing: nothing publishes in grace or after; profile fixes count against the trial's 3.
do $$
declare d text; v_old text := $o$  if l.status <> 'active' or l.google_location_id is null then raise exception 'location_not_active'; end if;$o$;
begin
  d := pg_get_functiondef('public.approve_publication(text, uuid, jsonb, uuid, text, integer)'::regprocedure);
  if position(v_old in d) = 0 then raise exception 'approve_publication: anchor not found'; end if;
  d := replace(d, v_old, v_old || $n$
  -- P0.4-06 (K-101, K-48): the organisation's entitlements decide whether anything may publish now.
  if not private.entitled(v_loc, 'publish') then
    raise exception 'plan_required' using hint = 'The free trial has ended. Subscribe to publish what is waiting.';
  end if;
  if p_target_type = any (private.profile_fix_kinds()) and not private.trial_take(v_loc, 'profile_fix', v_target::text) then
    raise exception 'trial_profile_fix_cap' using hint = 'The free trial applies 3 profile fixes. The rest apply when you subscribe.';
  end if;$n$);
  execute d;
end $$;

-- 4c. AI generations: the trial's silent cap of 100, then the owner is asked to subscribe or book a call.
create or replace function public.ai_budget_take(p_location uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_day date := (now() at time zone 'utc')::date;
  v_cap_business int := coalesce((select value::int from public.app_settings where key = 'ai_daily_cap_business'), 60);
  v_cap_global int := coalesce((select value::int from public.app_settings where key = 'ai_daily_cap_global'), 3000);
  v_global int;
  v_mine int;
  e jsonb := private.entitlements(null, p_location);
begin
  if not coalesce((e ->> 'draft')::boolean, false) then return 'plan'; end if;
  if e -> 'caps' ? 'ai_generations'
     and (e #>> '{caps,ai_generations,used}')::int >= (e #>> '{caps,ai_generations,limit}')::int then
    return 'trial';
  end if;
  perform pg_advisory_xact_lock(hashtext('ai_budget_take'));
  select coalesce(sum(generations), 0) into v_global from public.ai_usage where day = v_day;
  if v_global >= v_cap_global then
    perform public.ops_emit('ai_global_cap', 'alerts', ':warning: Daily AI budget reached',
      'Kabsi stopped new drafts for today: ' || v_global || ' drafting jobs (cap ' || v_cap_global || '). Drafts start again at 00:00 UTC. Raise ai_daily_cap_global in app_settings if this is real demand.',
      '[]', '[]', 'ai_global_cap:' || v_day);
    return 'global';
  end if;
  select generations into v_mine from public.ai_usage where location_id = p_location and day = v_day;
  if coalesce(v_mine, 0) >= v_cap_business then return 'business'; end if;
  insert into public.ai_usage (location_id, day, generations) values (p_location, v_day, 1)
  on conflict (location_id, day) do update set generations = public.ai_usage.generations + 1, updated_at = now();
  return 'ok';
end $$;

-- 4d. The backlog card says "Your free trial covers ..." from entitlements, not from plans.
do $$
declare d text;
begin
  d := pg_get_functiondef('private.detect_review_tasks(uuid)'::regprocedure);
  d := regexp_replace(d, 'v_trial := exists \(select 1 from public\.plans.*?p\.ends_at > now\(\)\);',
    $n$v_trial := coalesce(private.entitlements(null, p_location) ->> 'state', '') in ('trial', 'grace');$n$);
  if position('private.entitlements(null, p_location)' in d) = 0 then raise exception 'detect_review_tasks: anchor not found'; end if;
  execute d;
end $$;

-- 4e. The plan-ending card: the trial's last days, the grace week (what is waiting), and a paid plan's end.
create or replace function private.detect_expiring_plan(p_location uuid) returns integer
language plpgsql security definer set search_path = '' as $$
declare e jsonb := private.entitlements(null, p_location); v_state text := e ->> 'state';
  v_until timestamptz := (e ->> 'ends_at')::timestamptz; v_days integer; v_replies integer; v_changes integer; v_what text;
begin
  if v_state = 'grace' then
    select count(*) into v_replies from public.reviews where location_id = p_location and state in ('drafted', 'blocked');
    select count(*) into v_changes from public.profile_changes where location_id = p_location and status in ('detected', 'awaiting_review');
    v_what := concat_ws(', ',
      case when v_replies > 0 then v_replies || case when v_replies = 1 then ' reply ready' else ' replies ready' end end,
      case when v_changes > 0 then v_changes || case when v_changes = 1 then ' change caught' else ' changes caught' end end);
    v_days := greatest(ceil(extract(epoch from v_until - now()) / 86400)::integer, 0);
    return case when private.task_put(p_location, 'billing', 'location', p_location::text, 'urgent',
      'Your free trial has ended',
      coalesce(v_what || '. ', '') || 'Kabsi keeps watching and drafting for ' || v_days || case when v_days = 1 then ' more day' else ' more days' end
        || ', but nothing is published until you subscribe.',
      'Choose a plan.', jsonb_build_object('ends_at', v_until, 'grace', true, 'replies', v_replies, 'changes', v_changes),
      null, 'billing:' || p_location) then 1 else 0 end;
  end if;
  if v_state in ('trial', 'paid') and v_until is not null and v_until <= now() + interval '7 days'
     and exists (select 1 from public.locations where id = p_location and status = 'active') then
    v_days := greatest(ceil(extract(epoch from v_until - now()) / 86400)::integer, 0);
    return case when private.task_put(p_location, 'billing', 'location', p_location::text,
      case when v_days <= 2 then 'urgent' else 'recommended' end,
      case when v_state = 'trial' then 'Your free trial ends in ' else 'Your plan ends in ' end
        || v_days || case when v_days = 1 then ' day' else ' days' end,
      case when v_state = 'trial' then 'Choose a plan to keep replies and profile checks going.'
           else 'Renew to keep replies and profile checks going.' end,
      case when v_state = 'trial' then 'Choose a plan.' else 'Renew your plan.' end,
      jsonb_build_object('ends_at', v_until), null, 'billing:' || p_location) then 1 else 0 end;
  end if;
  perform private.task_close_except(p_location, 'billing', '{}', '{}',
    case when v_state in ('ended', 'none') then 'expired' else 'done' end);
  return 0;
end $$;

-- 4f. The plan screen's tier comes from entitlements; its payment rows stay billing's own until P0.4-07.
do $$
declare d text;
begin
  d := pg_get_functiondef('public.plan_summary(uuid)'::regprocedure);
  d := regexp_replace(d, 'v_tier := case.*?else ''free'' end;',
    $n$v_tier := case
    when v_unbilled then 'early_access'
    when not public.plan_clock_ready(l.id) then 'none'
    else case private.entitlements(l.organization_id, l.id) ->> 'state'
      when 'partner' then 'partner' when 'trial' then 'trial' when 'paid' then 'pro' when 'demo' then 'pro'
      when 'concierge' then 'early_access' else 'free' end end;$n$);
  d := regexp_replace(d, '''trial_used'', exists \(select 1 from public\.plans t.*?g\.place_id = l\.place_id\)\),',
    $n$'trial_used', coalesce((private.entitlements(l.organization_id, l.id) ->> 'trial_used')::boolean, false),
    'entitlements', private.entitlements(l.organization_id, l.id),$n$);
  if position('''entitlements'', private.entitlements' in d) = 0 or position('when ''paid'' then ''pro''' in d) = 0 then
    raise exception 'plan_summary: anchor not found';
  end if;
  execute d;
end $$;

-- 5. Day 21: the trial ends, Kabsi removes its access and tells the owner ------------------------------------------------
-- The disconnect steps of request_disconnect, shared with the trial sweep. The owner's request stays as it was.
create or replace function private.disconnect_location(p_location uuid, p_actor_type text, p_actor uuid, p_reason text)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare l public.locations; v_pubs integer; v_reviews integer; v_tasks integer; v_tokens integer; v_jobs integer; v_state text;
begin
  select * into l from public.locations where id = p_location for update;
  if not found then raise exception 'forbidden' using errcode = '42501'; end if;
  if l.is_demo then raise exception 'demo_location'; end if;
  if l.disconnect_requested_at is not null then
    select access_state into v_state from public.google_connections where location_id = p_location;
    return jsonb_build_object('state', v_state, 'requested_at', l.disconnect_requested_at, 'created', false);
  end if;

  update public.locations set disconnect_requested_at = now(), disconnect_requested_by = p_actor,
    status = case when status = 'disabled' then status else 'paused' end
   where id = p_location;

  -- Approvals still inside their undo window: cancelled, and their item goes back to where it was (as undo does).
  with c as (
    update public.publications set state = 'cancelled', error = 'disconnected'
     where location_id = p_location and state = 'approved'
    returning target_type, target_id
  ), r as (
    update public.reviews set state = 'drafted' where id in (select target_id from c where target_type = 'review_reply') and state = 'publishing'
  ), p as (
    update public.gbp_posts set state = 'draft' where id in (select target_id from c where target_type = 'local_post') and state = 'publishing'
  ), ph as (
    update public.photos set state = 'draft' where id in (select target_id from c where target_type = 'photo') and state = 'publishing'
  ), h as (
    update public.special_hours set state = 'draft' where id in (select target_id from c where target_type = 'special_hours') and state = 'publishing'
  ), pc as (
    update public.profile_changes set status = 'awaiting_review', decided_at = null, decided_by = null, publication_id = null
     where id in (select target_id from c where target_type = 'listing_revert') and status = 'rejected'
  )
  select count(*) into v_pubs from c;

  -- Open review tasks: archived (Kabsi does not act on them). The reviews and their drafts stay until K-40 removes them.
  update public.reviews set state = 'archived' where location_id = p_location and state in ('new', 'drafted', 'blocked');
  get diagnostics v_reviews = row_count;
  update public.concierge_tasks set state = 'cancelled', outcome = coalesce(outcome, 'disconnected'), updated_at = now()
   where location_id = p_location and state = 'open';
  get diagnostics v_tasks = row_count;
  -- Email links that would open or approve something: they stop working now.
  update public.action_tokens set expires_at = now()
   where location_id = p_location and used_at is null and expires_at > now();
  get diagnostics v_tokens = row_count;
  update public.jobs set state = 'failed', last_error = case when p_reason = 'trial_ended'
      then 'stopped: the free trial ended without a plan' else 'stopped: the owner disconnected Kabsi from Google' end,
    finished_at = now(), locked_at = null, locked_by = null
   where location_id = p_location and state in ('pending', 'retrying');
  get diagnostics v_jobs = row_count;

  perform private.audit(p_actor_type, p_actor, case when p_reason = 'trial_ended' then 'trial_access_removed' else 'disconnect_requested' end,
    p_location, 'location', p_location::text,
    jsonb_build_object('status', l.status),
    jsonb_build_object('status', 'paused', 'approvals_cancelled', v_pubs, 'reviews_archived', v_reviews,
      'concierge_tasks_cancelled', v_tasks, 'links_expired', v_tokens, 'jobs_stopped', v_jobs),
    case when p_reason = 'trial_ended' then 'system' else 'dashboard' end, 'requested');
  perform public.ops_emit('disconnect_requested', 'customers', ':electric_plug: Disconnect requested: ' || l.name,
    case when p_reason = 'trial_ended'
      then 'The free trial and its 7 days of grace ended without a plan. Kabsi removes its Manager access now; if Google refuses, a staff follow-up opens.'
      else 'The owner disconnected Kabsi in Settings. Kabsi removes its Manager access now; if Google refuses, a staff follow-up opens.' end,
    '[]', public.ops_staff_btn(), 'loc_disconnect:' || l.id);
  perform public.enqueue_job('disconnect', p_location, 'disconnect:' || p_location);
  return jsonb_build_object('state', 'removing', 'requested_at', now(), 'created', true);
end $$;

create or replace function public.request_disconnect(p_location uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'sign_in_required' using errcode = '42501'; end if;
  if not public.has_location_role(p_location, array['owner']) then raise exception 'forbidden' using errcode = '42501'; end if;
  return private.disconnect_location(p_location, 'user', v_uid, 'owner');
end $$;

create or replace function private.trial_sweep() returns integer
language plpgsql security definer set search_path = '' as $$
declare s public.subscriptions; l record; e jsonb; n integer := 0; v_remove boolean;
begin
  v_remove := coalesce((select value from public.app_settings where key = 'trial_removal'), 'off') = 'on';
  for s in select * from public.subscriptions
            where state = 'trialing' and coalesce(grace_ends_at, trial_ends_at + interval '7 days') <= now()
            for update skip locked loop
    update public.subscriptions set state = 'expired', updated_at = now() where id = s.id;
    perform private.audit('system', null, 'trial_ended', null, 'subscription', s.id::text, null,
      jsonb_build_object('removal', v_remove), 'system', 'expired', s.organization_id);
    n := n + 1;
    for l in select id, name from public.locations
              where organization_id = s.organization_id and not is_demo loop
      e := private.entitlements(s.organization_id, l.id);
      if (e ->> 'watch')::boolean then continue; end if;   -- paid, partner or concierge meanwhile: nothing to remove
      if exists (select 1 from public.locations x where x.id = l.id and x.access_granted_at is not null
                  and x.disconnect_requested_at is null) then
        if v_remove then
          perform private.disconnect_location(l.id, 'system', null, 'trial_ended');
        else
          perform public.ops_emit('trial_removal_held', 'customers', ':hourglass: Trial ended: ' || l.name,
            'The free trial and its grace week ended without a plan. Kabsi would remove its Manager access now; '
            || 'trial_removal is off until Creem is live, so nothing was removed. Nothing publishes for this business.',
            '[]', public.ops_staff_btn(), 'trial_removal_held:' || l.id);
        end if;
      end if;
      perform public.refresh_location_status(l.id);
    end loop;
  end loop;
  if n > 0 then insert into public.jobs_log (job, ok, detail) values ('trial_sweep', true, jsonb_build_object('ended', n)); end if;
  return n;
end $$;

select cron.schedule('kabsi_trial_sweep', '17 * * * *', $$select private.trial_sweep()$$);

-- 6. Privileges: the private helpers are never callable from the API ----------------------------------------------------
revoke all on function private.email_account_key(text), private.org_account_keys(uuid), private.trial_limits(),
  private.entitlements(uuid, uuid), private.entitled(uuid, text), private.start_trial(uuid, integer),
  private.trial_take(uuid, text, text), private.profile_fix_kinds(), private.detect_expiring_plan(uuid),
  private.disconnect_location(uuid, text, uuid, text), private.trial_sweep() from public, anon, authenticated;
