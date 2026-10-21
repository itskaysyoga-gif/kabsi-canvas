-- P0.8-01, removal file 1 of 3, run by Hussein in the Supabase SQL editor (plan section 2.3: the connector cannot run
-- drop statements). Run it after 20261021180000 and the P0.8-01 code are live. It removes the database functions of
-- the retired model, which 20261021180000 already made uncallable, and gives start_location its final arguments.
-- It removes no data.
--
-- Removes 26 functions:
--   payments:  owner_submit_claim, staff_decide_claim, staff_record_payment, record_plan_payment,
--              billing_prepare_invoice, billing_apply_ipn, billing_attach_invoice, billing_mark_create_failed,
--              billing_invoice_status, billing_enabled_for, owner_plan_kinds
--   partners:  partner_submit_claim, partner_create_invite, partner_invoice_calc, partner_locations, partner_rate,
--              partner_recipients, partner_billing_run, partner_covered, claim_partner_membership,
--              staff_create_partner, staff_update_partner_contact
--   cards:     staff_create_card_order, staff_set_card_order_status, generate_card_codes
--   sign-up:   start_location with the partner handle and invite arguments (replaced by the same function without them)
--
-- Read-back (expected: 0 and 1):
--   select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--    where n.nspname = 'public' and p.proname in ('owner_submit_claim', 'staff_decide_claim', 'staff_record_payment',
--      'record_plan_payment', 'billing_prepare_invoice', 'billing_apply_ipn', 'billing_attach_invoice',
--      'billing_mark_create_failed', 'billing_invoice_status', 'billing_enabled_for', 'owner_plan_kinds',
--      'partner_submit_claim', 'partner_create_invite', 'partner_invoice_calc', 'partner_locations', 'partner_rate',
--      'partner_recipients', 'partner_billing_run', 'partner_covered', 'claim_partner_membership', 'staff_create_partner',
--      'staff_update_partner_contact', 'staff_create_card_order', 'staff_set_card_order_status', 'generate_card_codes');
--   select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--    where n.nspname = 'public' and p.proname = 'start_location' and p.pronargs = 5;

drop function if exists public.owner_submit_claim(uuid, text, text, text);
drop function if exists public.staff_decide_claim(uuid, boolean, text);
drop function if exists public.staff_record_payment(uuid, text, numeric, text, text);
drop function if exists public.record_plan_payment(uuid, text, numeric, text, text, uuid);
drop function if exists public.billing_prepare_invoice(uuid, text, text, boolean);
drop function if exists public.billing_apply_ipn(text, text, text, text, numeric, text, text, numeric, boolean);
drop function if exists public.billing_attach_invoice(uuid, text, text);
drop function if exists public.billing_mark_create_failed(uuid);
drop function if exists public.billing_invoice_status(uuid);
drop function if exists public.billing_enabled_for(uuid);
drop function if exists public.owner_plan_kinds(uuid);
drop function if exists public.partner_submit_claim(uuid, text, text);
drop function if exists public.partner_create_invite(uuid, text, text);
drop function if exists public.partner_invoice_calc(uuid, date);
drop function if exists public.partner_locations(uuid);
drop function if exists public.partner_rate(uuid, date);
drop function if exists public.partner_recipients(uuid);
drop function if exists public.partner_billing_run(date);
drop function if exists public.partner_covered(uuid);
drop function if exists public.claim_partner_membership();
drop function if exists public.staff_create_partner(text, text, text, text, text);
drop function if exists public.staff_update_partner_contact(uuid, text, text);
drop function if exists public.staff_create_card_order(uuid, uuid, integer, text);
drop function if exists public.staff_set_card_order_status(uuid, text);
drop function if exists public.generate_card_codes(integer, uuid);

-- start_location without the partner arguments. The body is the one 20261021180000 set; only the arguments change.
drop function if exists public.start_location(text, text, text, text, text, text, uuid);
create function public.start_location(p_place_id text, p_name text, p_address text, p_country text, p_time_zone text)
returns uuid language plpgsql security definer set search_path = '' as $$
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
revoke execute on function public.start_location(text, text, text, text, text) from public, anon;
grant execute on function public.start_location(text, text, text, text, text) to authenticated;
