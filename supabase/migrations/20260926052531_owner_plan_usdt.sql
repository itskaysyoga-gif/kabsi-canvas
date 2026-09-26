-- KABSI — migration 012: owner plan payments in USDT + renewals (Phase 9, 26 Sep 2026)
-- A self-serve owner pays Pro in USDT and pastes the transaction ID (usdt_claims kind 'plan'). Staff confirm after
-- checking the wallet; confirming records the payment through staff_record_payment, which starts the plan.
-- Renewals now start when the current paid period ends (a second payment extends, never overlaps).

alter table public.usdt_claims add column item text check (item in ('pro_6m','pro_12m'));
alter table public.usdt_claims drop constraint claim_target;
alter table public.usdt_claims add constraint claim_target check (
  (kind = 'partner_invoice' and partner_id is not null and invoice_id is not null)
  or (kind = 'plan' and location_id is not null and item is not null));

create or replace function public.plan_price(p_item text) returns numeric
language sql immutable set search_path = '' as $$
  select case p_item when 'pro_6m' then 75 when 'pro_12m' then 120 end::numeric
$$;

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
  -- the plan they paid for becomes the pending plan
  delete from public.plans where location_id = p_location and status = 'pending' and kind <> p_item;
  if not exists (select 1 from public.plans where location_id = p_location and status = 'pending' and kind = p_item) then
    insert into public.plans (location_id, kind, status) values (p_location, p_item, 'pending');
  end if;
  insert into public.usdt_claims (kind, location_id, item, network, tx_ref, amount_usd, submitted_by)
  values ('plan', p_location, p_item, p_network, trim(p_tx_ref), public.plan_price(p_item), auth.uid())
  returning id into v_id;
  return v_id;
exception when unique_violation then
  raise exception 'tx_already_used' using hint = 'This transaction ID was already submitted.';
end $$;

-- Payments: a Pro payment starts when the latest active plan ends (renewal), or now.
create or replace function public.staff_record_payment(
  p_location uuid, p_item text, p_amount numeric, p_method text, p_reference text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_plan uuid; v_payment uuid; v_months int; v_start timestamptz;
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  v_months := case p_item when 'pro_6m' then 6 when 'pro_12m' then 12 else null end;
  if v_months is not null then
    select greatest(now(), coalesce(max(ends_at), now())) into v_start
      from public.plans where location_id = p_location and status = 'active' and ends_at > now();
    select id into v_plan from public.plans where location_id = p_location and kind = p_item and status = 'pending'
      order by created_at desc limit 1;
    if v_plan is null then
      insert into public.plans (location_id, kind, status) values (p_location, p_item, 'pending') returning id into v_plan;
    end if;
    update public.plans set status = 'active', starts_at = v_start, ends_at = v_start + make_interval(months => v_months)
      where id = v_plan;
  end if;
  insert into public.payments (location_id, plan_id, item, amount_usd, method, reference, recorded_by)
  values (p_location, v_plan, p_item, p_amount, p_method, p_reference, auth.uid()) returning id into v_payment;
  perform public.refresh_location_status(p_location);
  return v_payment;
end $$;

-- Claims: confirming a plan claim records the USDT payment (and starts or extends the plan).
create or replace function public.staff_decide_claim(p_claim uuid, p_confirm boolean, p_note text default null)
returns text language plpgsql security definer set search_path = '' as $$
declare c public.usdt_claims;
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into c from public.usdt_claims where id = p_claim for update;
  if not found then raise exception 'unknown_claim'; end if;
  if c.status <> 'pending' then raise exception 'already_decided'; end if;
  update public.usdt_claims set status = case when p_confirm then 'confirmed' else 'rejected' end,
    note = nullif(left(trim(coalesce(p_note, '')), 300), ''), reviewed_by = auth.uid(), reviewed_at = now()
  where id = p_claim;
  if p_confirm and c.kind = 'partner_invoice' then
    update public.partner_invoices set status = 'paid', tx_ref = c.network || ':' || c.tx_ref, paid_at = now()
    where id = c.invoice_id and status = 'unpaid';
  elsif p_confirm and c.kind = 'plan' then
    perform public.staff_record_payment(c.location_id, c.item, c.amount_usd, 'usdt', c.network || ':' || c.tx_ref);
  end if;
  return case when p_confirm then 'confirmed' else 'rejected' end;
end $$;

-- Owners read their own claims already (read_own_claims: is_member(location_id)).

revoke execute on function public.plan_price(text), public.owner_submit_claim(uuid, text, text, text)
  from public, anon, authenticated;
grant execute on function public.owner_submit_claim(uuid, text, text, text) to authenticated;
grant execute on function public.plan_price(text) to service_role;
