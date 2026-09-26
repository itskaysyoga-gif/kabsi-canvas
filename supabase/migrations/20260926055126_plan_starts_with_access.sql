-- KABSI — migration 013: a paid plan starts only once Google access works (D224, 26 Sep 2026)
-- Before: staff_record_payment started the plan at payment, so days spent waiting for access were lost.
-- Now: without access the paid plan stays 'pending' (the payment row points to it); refresh_location_status,
-- which the access job calls when access arrives, starts every paid pending plan, back to back.

-- Start paid pending plans for a location that has Google access. Returns how many started.
create or replace function public.start_paid_plans(p_location uuid) returns int
language plpgsql security definer set search_path = '' as $$
declare p record; v_start timestamptz; v_n int := 0;
begin
  if not exists (select 1 from public.locations where id = p_location and access_granted_at is not null) then
    return 0;
  end if;
  for p in
    select pl.id, pl.kind from public.plans pl
    where pl.location_id = p_location and pl.status = 'pending' and pl.kind in ('pro_6m','pro_12m')
      and exists (select 1 from public.payments pay where pay.plan_id = pl.id)
    order by pl.created_at
  loop
    select greatest(now(), coalesce(max(ends_at), now())) into v_start
      from public.plans where location_id = p_location and status = 'active' and ends_at > now();
    update public.plans set status = 'active', starts_at = v_start,
      ends_at = v_start + make_interval(months => case p.kind when 'pro_6m' then 6 else 12 end)
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

-- Payments: record it, link it to the plan; the plan starts now only if Google access already works.
create or replace function public.staff_record_payment(
  p_location uuid, p_item text, p_amount numeric, p_method text, p_reference text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_plan uuid; v_payment uuid;
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_item in ('pro_6m','pro_12m') then
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
  values (p_location, v_plan, p_item, p_amount, p_method, p_reference, auth.uid()) returning id into v_payment;
  perform public.refresh_location_status(p_location);   -- starts the plan if access already works
  return v_payment;
end $$;

-- A paid plan waiting for access must never be deleted when the owner picks or pays for another plan.
create or replace function public.choose_plan(p_location uuid, p_kind text) returns text
language plpgsql security definer set search_path = '' as $$
declare l public.locations;
begin
  if not public.is_member(p_location) then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into l from public.locations where id = p_location;
  if l.partner_id is null then
    if p_kind not in ('pro_6m','pro_12m') then raise exception 'bad_plan'; end if;
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
  if exists (select 1 from public.locations where id = p_location and partner_id is not null) then
    raise exception 'plan_through_partner';
  end if;
  if p_item not in ('pro_6m','pro_12m') then raise exception 'bad_plan'; end if;
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

revoke execute on function public.start_paid_plans(uuid) from public, anon, authenticated;
grant execute on function public.start_paid_plans(uuid) to service_role;
