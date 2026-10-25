-- Growth 1 (master plan 20.1, 20.3, 20.4, 26.5): the event names of docs/EVENTS.md, the Conversions API queue, the
-- privacy panel's records, and the click ids saved at sign-up. Additive: new functions, new triggers, new columns,
-- widened checks. Nothing is dropped but two triggers that are created again at once with the new names.
--
-- 1. Renamed server events (20.1: "renamed in one place"): registration_completed is signup_completed,
--    trial_converted is paid, subscription_cancelled is cancel_scheduled (the owner asked to stop at the period end)
--    or churned (the plan ended). Rows already in product_events keep their old names.
-- 2. New server events: whatsapp_connected, first_alert_sent (with minutes since WhatsApp was connected, 26.5),
--    first_yes, trial_started, checkout_started (from billing-creem through public.record_product_event), paid,
--    plan_changed.
-- 3. signup_completed, trial_started and paid also offer a meta_capi job (only while product_events is 'on'): the `api` dispatcher sends the event to
--    Meta's Conversions API (supabase/functions/_shared/meta-capi.ts) when META_PIXEL_ID and META_CAPI_TOKEN are set
--    and the person allowed ad measurement; otherwise the job ends as skipped. Nothing about the person is stored here.
-- 4. consent_records takes the panel ("Your privacy choices", method panel, action switch).
-- 5. signup_attribution keeps gclid and whether ad measurement was allowed when the browser saved it (ads_ok).

-- 20.1 names two events with a single word, paid and churned: the outbox takes them.
alter table public.product_events drop constraint product_events_event_check;
alter table public.product_events add constraint product_events_event_check check (event ~ '^[a-z]+(_[a-z]+)*$');

-- 1 and 3: the outbox writer, now also offering the Conversions API job ---------------------------------------------

create or replace function private.product_event(p_event text, p_user uuid, p_location uuid, p_props jsonb, p_key text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_user uuid := p_user; v_org uuid; v_id uuid;
begin
  if p_location is not null then
    if public.is_demo_location(p_location) then return; end if;
    select organization_id, coalesce(v_user, created_by) into v_org, v_user from public.locations where id = p_location;
  end if;
  if v_user is null or private.internal_user(v_user) then return; end if;
  insert into public.product_events (event, distinct_id, location_id, organization_id, properties, source_key)
  values (p_event, v_user::text, p_location, v_org,
    coalesce(p_props, '{}') || jsonb_strip_nulls(jsonb_build_object('location_id', p_location, 'organization_id', v_org,
      '$groups', case when p_location is not null then jsonb_build_object('business', p_location) end)),
    p_key)
  on conflict (source_key) do nothing
  returning id into v_id;
  -- Only where events are sent at all (app_settings.product_events 'on': production; off in local and CI databases).
  if v_id is not null and p_event in ('signup_completed', 'trial_started', 'paid')
     and coalesce((select value from public.app_settings where key = 'product_events'), 'off') = 'on' then
    perform public.enqueue_job('meta_capi', p_location, 'meta_capi:' || v_id, jsonb_build_object('event_id', v_id));
  end if;
exception when others then
  raise warning 'product_event % skipped: %', p_event, sqlerrm;
end $$;
revoke execute on function private.product_event(text, uuid, uuid, jsonb, text) from public;

-- A new account: signup_completed (was registration_completed). The source key is unchanged, so nothing doubles.
create or replace function private.user_product_event() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform private.product_event('signup_completed', new.id, null, jsonb_build_object(
    'method', case when coalesce(new.raw_app_meta_data ->> 'provider', '') = 'google' then 'google' else 'email' end),
    'user:' || new.id || ':registration');
  return null;
exception when others then
  return null;
end $$;

-- Payment changes, from the subscription row Creem's webhook and start_trial write. No browser input.
create or replace function private.subscription_product_event() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid; v_loc uuid;
  v_key text := 'sub:' || new.id || ':' || extract(epoch from clock_timestamp())::bigint;
  v_paying text[] := array['active', 'past_due'];
begin
  select m.user_id into v_user from public.organization_members m
    where m.organization_id = new.organization_id and m.role = 'owner' order by m.created_at limit 1;
  select l.id into v_loc from public.locations l where l.organization_id = new.organization_id order by l.created_at limit 1;
  if v_loc is not null and public.is_demo_location(v_loc) then return null; end if;
  if v_user is null or private.internal_user(v_user) then return null; end if;
  if new.state = 'active' and old.state is distinct from 'active' and old.state <> 'past_due' then
    perform private.product_event('paid', v_user, v_loc, jsonb_build_object('plan', new.plan, 'period', new.period,
      'currency', 'usd', 'from', old.state, 'founding', new.founding), v_key || ':paid');
  end if;
  if new.state = any (v_paying) and old.state = any (v_paying)
     and (new.plan is distinct from old.plan or new.period is distinct from old.period) then
    perform private.product_event('plan_changed', v_user, v_loc, jsonb_build_object('plan', new.plan, 'period', new.period,
      'from_plan', old.plan, 'from_period', old.period), v_key || ':plan');
  end if;
  if new.state = 'past_due' and old.state is distinct from 'past_due' then
    perform private.product_event('payment_failed', v_user, v_loc, jsonb_build_object('plan', new.plan), v_key || ':failed');
  end if;
  if new.cancel_at_period_end and not coalesce(old.cancel_at_period_end, false) then
    perform private.product_event('cancel_scheduled', v_user, v_loc, jsonb_build_object('plan', new.plan), v_key || ':cancel');
  end if;
  if new.state in ('cancelled', 'expired') and old.state = any (v_paying || array['paused']) then
    perform private.product_event('churned', v_user, v_loc, jsonb_build_object('plan', new.plan,
      'scheduled', coalesce(old.cancel_at_period_end, false)), v_key || ':churned');
  end if;
  return null;
exception when others then
  return null;
end $$;
drop trigger if exists subscriptions_product_event on public.subscriptions;
create trigger subscriptions_product_event after update of state, cancel_at_period_end, plan, period on public.subscriptions
  for each row execute function private.subscription_product_event();

-- A Creem subscription can arrive already active (its own row, beside the trial row start_trial wrote): paid.
create function private.subscription_insert_event() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_user uuid; v_loc uuid;
begin
  if new.state <> 'active' then return null; end if;
  select m.user_id into v_user from public.organization_members m
    where m.organization_id = new.organization_id and m.role = 'owner' order by m.created_at limit 1;
  select l.id into v_loc from public.locations l where l.organization_id = new.organization_id order by l.created_at limit 1;
  perform private.product_event('paid', v_user, v_loc, jsonb_build_object('plan', new.plan, 'period', new.period,
    'currency', 'usd', 'from', 'new', 'founding', new.founding), 'sub:' || new.id || ':paid_new');
  return null;
exception when others then
  return null;
end $$;
revoke execute on function private.subscription_insert_event() from public;
create trigger subscriptions_insert_event after insert on public.subscriptions
  for each row execute function private.subscription_insert_event();

-- 2: first_yes and trial_started, from the audit log ----------------------------------------------------------------

create function private.audit_growth_event() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.action = 'trial_started' then
    perform private.product_event('trial_started', null, new.location_id, jsonb_build_object('plan', 'pro'),
      'audit:' || new.id || ':trial');
  elsif new.action = 'approval' and new.actor_type = 'user' and new.location_id is not null then
    -- The first Yes of a business, whatever it approved and wherever (20.2: the funnel's "first Yes").
    perform private.product_event('first_yes', new.actor_id, new.location_id, jsonb_build_object(
      'object', new.object_type, 'channel', coalesce(new.channel, 'dashboard')), 'loc:' || new.location_id || ':first_yes');
  end if;
  return null;
exception when others then
  raise warning 'audit_growth_event skipped: %', sqlerrm;
  return null;
end $$;
revoke execute on function private.audit_growth_event() from public;
create trigger audit_events_growth after insert on public.audit_events
  for each row when (new.action in ('trial_started', 'approval'))
  execute function private.audit_growth_event();

-- 2: whatsapp_connected, once per person, when an owner or manager phone is bound -----------------------------------

create function private.phone_role_growth_event() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.role in ('owner', 'manager') and new.user_id is not null and new.revoked_at is null then
    perform private.product_event('whatsapp_connected', new.user_id, new.location_id,
      jsonb_build_object('role', new.role, 'source', new.source), 'user:' || new.user_id || ':whatsapp_connected');
  end if;
  return null;
exception when others then
  return null;
end $$;
revoke execute on function private.phone_role_growth_event() from public;
create trigger phone_roles_growth after insert on public.phone_roles
  for each row execute function private.phone_role_growth_event();

-- 2: first_alert_sent, once per business, with the minutes since its WhatsApp was connected (26.5) ------------------

create function private.outbox_growth_event() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_connected timestamptz;
begin
  if new.state = 'sent' and old.state is distinct from 'sent' and new.location_id is not null and new.user_id is not null
     and new.kind in ('review_alert', 'post_alert', 'protection_alert') then
    select min(created_at) into v_connected from public.phone_roles
      where location_id = new.location_id and role in ('owner', 'manager') and revoked_at is null;
    perform private.product_event('first_alert_sent', new.user_id, new.location_id, jsonb_build_object('kind', new.kind,
      'minutes_since_whatsapp_connected',
        case when v_connected is not null then floor(extract(epoch from (coalesce(new.sent_at, now()) - v_connected)) / 60)::int end),
      'loc:' || new.location_id || ':first_alert');
  end if;
  return null;
exception when others then
  return null;
end $$;
revoke execute on function private.outbox_growth_event() from public;
create trigger whatsapp_outbox_growth after update of state on public.whatsapp_outbox
  for each row execute function private.outbox_growth_event();

-- 2: events an Edge Function records (checkout_started from billing-creem). Service role only; only listed names.
create function public.record_product_event(p_event text, p_user uuid, p_location uuid, p_props jsonb, p_key text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_event not in ('checkout_started') then raise exception 'unknown_event' using errcode = '22023'; end if;
  perform private.product_event(p_event, p_user, p_location, p_props, p_key);
end $$;
revoke execute on function public.record_product_event(text, uuid, uuid, jsonb, text) from public, anon, authenticated;
grant execute on function public.record_product_event(text, uuid, uuid, jsonb, text) to service_role;

-- 4: the privacy panel ---------------------------------------------------------------------------------------------

alter table public.consent_records drop constraint consent_records_method_check;
alter table public.consent_records add constraint consent_records_method_check check (method in ('banner', 'panel'));
alter table public.consent_records drop constraint consent_records_action_check;
alter table public.consent_records add constraint consent_records_action_check
  check (action in ('accept', 'decline', 'switch', 'save', 'ok'));

-- 5: click ids and the ad choice at sign-up -------------------------------------------------------------------------

alter table public.signup_attribution add column gclid text, add column ads_ok boolean;

create or replace function public.save_signup_attribution(p jsonb) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid(); v_created timestamptz; v_via text; v_done boolean;
  v_fbclid text := p ->> 'fbclid'; v_fbp text := p ->> 'fbp'; v_fbc text := p ->> 'fbc'; v_gclid text := p ->> 'gclid';
begin
  if v_uid is null then raise exception 'not_signed_in' using errcode = '42501'; end if;
  select created_at into v_created from auth.users where id = v_uid;
  if v_created is null or v_created < now() - interval '1 day' then return false; end if;
  v_via := upper(substring(p ->> 'via' from '^[A-Za-z0-9_-]{2,40}$'));
  insert into public.signup_attribution (user_id, first_touch, last_touch, fbclid, fbp, fbc, gclid, ads_ok, via_code, via_at)
  values (v_uid, private.clean_touch(p -> 'first'), private.clean_touch(p -> 'last'),
    case when length(v_fbclid) <= 500 and v_fbclid ~ '^[A-Za-z0-9_-]+$' then v_fbclid end,
    case when length(v_fbp) <= 80 and v_fbp ~ '^fb\.[0-9]\.[0-9]{10,16}\.[0-9]{1,30}$' then v_fbp end,
    case when length(v_fbc) <= 540 and v_fbc ~ '^fb\.[0-9]\.[0-9]{10,16}\.[A-Za-z0-9_-]+$' then v_fbc end,
    case when length(v_gclid) <= 300 and v_gclid ~ '^[A-Za-z0-9_-]+$' then v_gclid end,
    case when jsonb_typeof(p -> 'ads') = 'boolean' then (p ->> 'ads')::boolean end,
    v_via, case when v_via is not null then now() end)
  on conflict (user_id) do nothing
  returning true into v_done;
  if v_via is not null then
    update public.locations set via_code = v_via where created_by = v_uid and via_code is null;
  end if;
  return coalesce(v_done, false);
end $$;
revoke execute on function public.save_signup_attribution(jsonb) from public, anon;
grant execute on function public.save_signup_attribution(jsonb) to authenticated;
