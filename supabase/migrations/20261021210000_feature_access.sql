-- P0.8-06: one question for the plan features of K-126, asked of the entitlements (P0.4-06): what may this business use?
--
-- public.feature_access(location) returns {state, plan, essentials, pro}:
--   plan 'pro'        demo, concierge (managed by the team), a trial (14 days of Pro), a paid plan that is not Essentials
--                     (today's paid plans are the old Pro, so they are Pro here until P0.4-07 sets the new plans)
--   plan 'essentials' a paid subscription whose plan is 'essentials' (the value arrives with P0.4-07; nothing writes it yet)
--   plan 'none'       grace, ended, or no plan: only the review link and QR code run (K-126, K-48)
--   essentials        plan is essentials or pro; pro  plan is pro
-- It reads private.entitlements and the subscription; it changes neither. Features call it (the browser shows the lock,
-- the Edge Function that does the work asks again). Answers a member of the business, staff or the service key.

create or replace function public.feature_access(p_location uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_org uuid; v_state text; v_plan text := 'none'; v_sub text;
begin
  select organization_id into v_org from public.locations where id = p_location;
  if v_org is null then raise exception 'unknown_location'; end if;
  if not (coalesce(auth.role(), 'service_role') = 'service_role' or public.is_staff() or public.is_member(p_location)) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  v_state := private.entitlements(v_org, p_location) ->> 'state';
  if v_state in ('demo', 'concierge', 'trial', 'partner') then
    v_plan := 'pro';
  elsif v_state = 'paid' then
    select s.plan into v_sub from public.subscriptions s
     where s.organization_id = v_org and s.plan <> 'free'
       and ((s.state = 'active' and (s.current_period_end is null or s.current_period_end > now()))
         or (s.state = 'past_due' and s.current_period_end + interval '7 days' > now()))
     order by s.current_period_end desc nulls first limit 1;
    v_plan := case when v_sub = 'essentials' then 'essentials' else 'pro' end;
  end if;
  return jsonb_build_object('state', v_state, 'plan', v_plan, 'essentials', v_plan in ('essentials', 'pro'), 'pro', v_plan = 'pro');
end $$;
revoke all on function public.feature_access(uuid) from public, anon;
grant execute on function public.feature_access(uuid) to authenticated, service_role;
