-- KABSI — migration 002: onboarding, cards, payments, internal plumbing (25 Sep 2026)
-- Every RPC below checks the caller itself. Browser-callable ones are granted to `authenticated`;
-- internal ones only to `service_role` (Edge Functions) and run by pg_cron as postgres.

-- ───────────────────────────── publications: allow listing edits (services / categories)
alter table public.publications drop constraint publications_target_type_check;
alter table public.publications add constraint publications_target_type_check
  check (target_type in ('review_reply','local_post','photo','special_hours','listing_revert','listing_edit'));

-- ───────────────────────────── internal secret (never leaves the server)
select vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'cron_secret',
  'Shared secret: pg_cron / DB triggers -> Edge Functions (header x-cron-secret)');

create or replace function public.internal_secret(p_name text) returns text
language sql stable security definer set search_path = '' as $$
  select decrypted_secret from vault.decrypted_secrets where name = p_name
$$;

-- Fire-and-forget call from the database to one of our Edge Functions.
create or replace function public.call_internal(p_fn text, p_body jsonb default '{}'::jsonb) returns bigint
language sql security definer set search_path = '' as $$
  select net.http_post(
    url := 'https://ynjdqjlmdwjgbfezevxy.supabase.co/functions/v1/' || p_fn,
    headers := jsonb_build_object('content-type', 'application/json', 'x-cron-secret', public.internal_secret('cron_secret')),
    body := p_body,
    timeout_milliseconds := 20000)
$$;

-- ───────────────────────────── rate limiting for public functions (keys are hashes, never raw IPs)
create table public.rate_limits (
  key text primary key,
  window_start timestamptz not null default now(),
  hits int not null default 0
);
alter table public.rate_limits enable row level security;
revoke all on public.rate_limits from anon, authenticated;

create or replace function public.hit_rate_limit(p_key text, p_max int, p_window_seconds int) returns boolean
language plpgsql security definer set search_path = '' as $$
declare v_hits int;
begin
  insert into public.rate_limits as r (key, window_start, hits) values (p_key, now(), 1)
  on conflict (key) do update set
    hits = case when r.window_start < now() - make_interval(secs => p_window_seconds) then 1 else r.hits + 1 end,
    window_start = case when r.window_start < now() - make_interval(secs => p_window_seconds) then now() else r.window_start end
  returning hits into v_hits;
  return v_hits <= p_max;
end $$;

-- ───────────────────────────── location status machine (one place decides)
-- onboarding → access_pending (consent) → awaiting_payment (access, unpaid) → active (access + paid or partner)
create or replace function public.refresh_location_status(p_location uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare l public.locations; v_paid boolean; v_new text;
begin
  select * into l from public.locations where id = p_location for update;
  if not found then return null; end if;
  if l.status in ('paused','disabled') then return l.status; end if;
  v_paid := l.partner_id is not null
    or exists (select 1 from public.plans p where p.location_id = l.id and p.status = 'active'
               and (p.ends_at is null or p.ends_at > now()));
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

-- ───────────────────────────── onboarding (/start)
create or replace function public.start_location(
  p_place_id text, p_name text, p_address text, p_country text, p_time_zone text, p_partner_handle text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_existing uuid; v_partner uuid; v_id uuid; v_tz text;
begin
  if v_uid is null then raise exception 'not_signed_in' using errcode = '42501'; end if;
  if coalesce(trim(p_place_id), '') = '' or coalesce(trim(p_name), '') = '' then raise exception 'missing_business'; end if;

  select id into v_existing from public.locations where place_id = p_place_id;
  if v_existing is not null then
    if public.is_member(v_existing) then return v_existing; end if;
    raise exception 'already_on_kabsi' using hint = 'This business is already on Kabsi. Contact hello@kabsi.co.';
  end if;

  if p_partner_handle is not null then
    select id into v_partner from public.partners
      where handle = lower(p_partner_handle) and status in ('onboarding','active');
  end if;

  v_tz := case when exists (select 1 from pg_catalog.pg_timezone_names where name = p_time_zone) then p_time_zone else 'UTC' end;

  insert into public.locations (name, place_id, address, country, time_zone, partner_id, signup_source, onboarding_step, created_by)
  values (left(trim(p_name), 200), p_place_id, left(p_address, 300), upper(left(p_country, 2)), v_tz, v_partner,
          case when v_partner is not null then 'partner_link' else 'self' end, 'access', v_uid)
  returning id into v_id;

  insert into public.location_members (location_id, user_id, role) values (v_id, v_uid, 'owner');
  return v_id;
end $$;

create or replace function public.save_consent(p_location uuid, p_text text) returns text
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_member(p_location) then raise exception 'forbidden' using errcode = '42501'; end if;
  if coalesce(trim(p_text), '') = '' then raise exception 'consent_text_required'; end if;
  update public.locations set consent_text = left(p_text, 1000), consent_at = now() where id = p_location;
  return public.refresh_location_status(p_location);
end $$;

create or replace function public.set_onboarding_step(p_location uuid, p_step text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_member(p_location) then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_step not in ('business','access','knowledge','plan','done') then raise exception 'bad_step'; end if;
  update public.locations set onboarding_step = p_step where id = p_location;
end $$;

-- Owner picks a plan. Partner-tagged locations never see a price (the partner pays Kabsi).
create or replace function public.choose_plan(p_location uuid, p_kind text) returns text
language plpgsql security definer set search_path = '' as $$
declare l public.locations;
begin
  if not public.is_member(p_location) then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into l from public.locations where id = p_location;
  if l.partner_id is null then
    if p_kind not in ('pro_6m','pro_12m') then raise exception 'bad_plan'; end if;
    delete from public.plans where location_id = p_location and status = 'pending';
    insert into public.plans (location_id, kind, status) values (p_location, p_kind, 'pending');
  end if;
  update public.locations set onboarding_step = 'done' where id = p_location;
  return public.refresh_location_status(p_location);
end $$;

-- ───────────────────────────── staff: payments (cash / Whish / OMT / USDT)
create or replace function public.staff_record_payment(
  p_location uuid, p_item text, p_amount numeric, p_method text, p_reference text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_plan uuid; v_payment uuid; v_months int;
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  v_months := case p_item when 'pro_6m' then 6 when 'pro_12m' then 12 else null end;
  if v_months is not null then
    select id into v_plan from public.plans where location_id = p_location and kind = p_item and status = 'pending'
      order by created_at desc limit 1;
    if v_plan is null then
      insert into public.plans (location_id, kind, status) values (p_location, p_item, 'pending') returning id into v_plan;
    end if;
    update public.plans set status = 'active', starts_at = now(), ends_at = now() + make_interval(months => v_months)
      where id = v_plan;
  end if;
  insert into public.payments (location_id, plan_id, item, amount_usd, method, reference, recorded_by)
  values (p_location, v_plan, p_item, p_amount, p_method, p_reference, auth.uid()) returning id into v_payment;
  perform public.refresh_location_status(p_location);
  return v_payment;
end $$;

-- ───────────────────────────── cards
create or replace function public.activate_card(p_code text, p_location uuid, p_label text default null) returns text
language plpgsql security definer set search_path = '' as $$
declare c public.cards; v_place text; v_code text := upper(trim(p_code)); v_dest text;
begin
  if not (public.is_member(p_location) or public.is_staff()) then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into c from public.cards where code = v_code for update;
  if not found then raise exception 'unknown_card'; end if;
  if c.status = 'disabled' and not public.is_staff() then raise exception 'card_disabled'; end if;
  if c.location_id is not null and c.location_id <> p_location and not public.is_staff() then raise exception 'card_in_use'; end if;
  select place_id into v_place from public.locations where id = p_location;
  if v_place is null then raise exception 'location_has_no_place_id'; end if;
  v_dest := 'https://search.google.com/local/writereview?placeid=' || v_place;
  update public.cards set location_id = p_location, destination = v_dest, status = 'active',
    activated_at = coalesce(activated_at, now()), label = coalesce(left(p_label, 60), label)
  where code = v_code;
  return v_dest;
end $$;

create or replace function public.set_card_active(p_code text, p_active boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare v_loc uuid; v_code text := upper(trim(p_code));
begin
  select location_id into v_loc from public.cards where code = v_code;
  if not found then raise exception 'unknown_card'; end if;
  if not (public.is_staff() or (v_loc is not null and public.is_member(v_loc))) then raise exception 'forbidden' using errcode = '42501'; end if;
  update public.cards set status = case
      when p_active and location_id is not null and destination is not null then 'active'
      when p_active then 'unassigned'
      else 'disabled' end
  where code = v_code;
end $$;

-- Any change to a card clears its cached copy at the edge (the Worker re-reads the database).
create or replace function public.cards_kv_sync() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'DELETE'
     or old.status is distinct from new.status
     or old.destination is distinct from new.destination
     or old.location_id is distinct from new.location_id then
    perform public.call_internal('kv-sync', jsonb_build_object('code', coalesce(new.code, old.code)));
  end if;
  return null;
end $$;
create trigger cards_kv_sync after update or delete on public.cards
  for each row execute function public.cards_kv_sync();

-- ───────────────────────────── privileges
revoke execute on function public.internal_secret(text), public.call_internal(text, jsonb),
  public.hit_rate_limit(text, int, int), public.refresh_location_status(uuid), public.cards_kv_sync(),
  public.start_location(text, text, text, text, text, text), public.save_consent(uuid, text),
  public.set_onboarding_step(uuid, text), public.choose_plan(uuid, text),
  public.staff_record_payment(uuid, text, numeric, text, text), public.activate_card(text, uuid, text),
  public.set_card_active(text, boolean)
  from public, anon, authenticated;

grant execute on function public.internal_secret(text), public.hit_rate_limit(text, int, int),
  public.refresh_location_status(uuid) to service_role;

grant execute on function public.start_location(text, text, text, text, text, text), public.save_consent(uuid, text),
  public.set_onboarding_step(uuid, text), public.choose_plan(uuid, text),
  public.staff_record_payment(uuid, text, numeric, text, text), public.activate_card(text, uuid, text),
  public.set_card_active(text, boolean) to authenticated;

-- ───────────────────────────── scheduled jobs
select cron.schedule('kabsi_cron_tick', '*/5 * * * *', $$select public.call_internal('cron-tick')$$);
select cron.schedule('kabsi_cleanup_rate_limits', '37 * * * *',
  $$delete from public.rate_limits where window_start < now() - interval '1 day'$$);
select cron.schedule('kabsi_cleanup_http_responses', '47 3 * * *',
  $$delete from net._http_response where created < now() - interval '2 days'$$);
