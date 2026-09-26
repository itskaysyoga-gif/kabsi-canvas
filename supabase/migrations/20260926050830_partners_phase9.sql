-- KABSI — migration 011: partners and partner billing (Phase 9, 26 Sep 2026)
-- Partner v1 = small card sellers (D210): invite businesses, see status and tap counts, pay a monthly USDT invoice.
-- Partners never see review text. Every write is a membership-checked RPC (D226); the `partner` Edge Function
-- only sends the emails around them.
--
-- Billing rule (spec §1, D239): $8 per active location per month, billed on the 1st for the month before.
-- A location counts when it is active with REAL Google access (google_location_id not a mock id), activated before
-- the month ended. Founding partners (first 10) pay $6 until price_locked_until, and their first location is free
-- for any month that ends within 30 days of its activation. Nothing is billed while google_mode() = 'mock'.

-- ───────────────────────────── tables
create table public.partner_invites (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete cascade,
  business_email text not null check (business_email ~ '^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$'),
  business_name text check (length(business_name) <= 200),
  created_by uuid references auth.users(id) on delete set null,
  location_id uuid references public.locations(id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);
create index partner_invites_partner_idx on public.partner_invites(partner_id, created_at desc);
create index partner_invites_created_by_idx on public.partner_invites(created_by);
create index partner_invites_location_idx on public.partner_invites(location_id);

create table public.usdt_claims (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('partner_invoice','plan')),
  partner_id uuid references public.partners(id) on delete cascade,
  invoice_id uuid references public.partner_invoices(id) on delete cascade,
  location_id uuid references public.locations(id) on delete cascade,
  network text not null check (network in ('trc20','binance_pay')),
  tx_ref text not null check (tx_ref ~ '^[A-Za-z0-9_-]{6,128}$'),
  amount_usd numeric(10,2) check (amount_usd >= 0),
  status text not null default 'pending' check (status in ('pending','confirmed','rejected')),
  note text check (length(note) <= 300),
  submitted_by uuid references auth.users(id) on delete set null,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (network, tx_ref),
  constraint claim_target check (
    (kind = 'partner_invoice' and partner_id is not null and invoice_id is not null)
    or (kind = 'plan' and location_id is not null))
);
create index usdt_claims_status_idx on public.usdt_claims(status, created_at desc);
create index usdt_claims_partner_idx on public.usdt_claims(partner_id);
create index usdt_claims_invoice_idx on public.usdt_claims(invoice_id);
create index usdt_claims_location_idx on public.usdt_claims(location_id);
create index usdt_claims_submitted_by_idx on public.usdt_claims(submitted_by);
create index usdt_claims_reviewed_by_idx on public.usdt_claims(reviewed_by);

alter table public.partner_invites enable row level security;
alter table public.usdt_claims enable row level security;
revoke all on public.partner_invites, public.usdt_claims from anon;
create policy partners_read_invites on public.partner_invites for select to authenticated
  using (public.is_partner_member(partner_id) or (select public.is_staff()));
create policy read_own_claims on public.usdt_claims for select to authenticated
  using (public.is_partner_member(partner_id) or public.is_member(location_id) or (select public.is_staff()));

-- ───────────────────────────── billing
create or replace function public.partner_rate(p_partner uuid, p_month date) returns numeric
language sql stable security definer set search_path = '' as $$
  select case
    when p.founding and (p.price_locked_until is null or p_month < p.price_locked_until) then coalesce(p.rate_usd, 6)
    when p.founding then 8
    else coalesce(p.rate_usd, 8) end
  from public.partners p where p.id = p_partner
$$;

create or replace function public.partner_invoice_calc(p_partner uuid, p_month date)
returns table (active_count int, free_count int, rate_usd numeric, amount_usd numeric)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_start date := date_trunc('month', p_month)::date;
  v_end timestamptz := (date_trunc('month', p_month) + interval '1 month');
  v_active int; v_free int := 0; v_rate numeric; v_first public.locations;
begin
  if not (public.is_partner_member(p_partner) or public.is_staff() or auth.role() = 'service_role' or auth.uid() is null) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select count(*) into v_active from public.locations l
  where l.partner_id = p_partner and l.status = 'active' and l.activated_at < v_end
    and l.google_location_id is not null and l.google_location_id not like 'locations/mock-%';

  if exists (select 1 from public.partners p where p.id = p_partner and p.founding) then
    select * into v_first from public.locations l
    where l.partner_id = p_partner and l.activated_at is not null
      and l.google_location_id is not null and l.google_location_id not like 'locations/mock-%'
    order by l.activated_at limit 1;
    if found and v_first.status = 'active' and v_first.activated_at < v_end
       and v_end < v_first.activated_at + interval '30 days' then
      v_free := 1;
    end if;
  end if;

  v_rate := public.partner_rate(p_partner, v_start);
  return query select v_active, v_free, v_rate, round(greatest(v_active - v_free, 0) * v_rate, 2);
end $$;

create or replace function public.partner_billing_run(p_month date)
returns setof public.partner_invoices
language plpgsql security definer set search_path = '' as $$
declare v_month date := date_trunc('month', p_month)::date; p record; c record; v_row public.partner_invoices;
begin
  if v_month + interval '1 month' > now() then raise exception 'month_not_finished'; end if;
  if public.google_mode() <> 'live' then return; end if;
  for p in select id from public.partners where status <> 'ended' loop
    select * into c from public.partner_invoice_calc(p.id, v_month);
    if c.active_count = 0 then continue; end if;
    insert into public.partner_invoices (partner_id, month, active_count, free_count, rate_usd, amount_usd, status)
    values (p.id, v_month, c.active_count, c.free_count, c.rate_usd, c.amount_usd,
            case when c.amount_usd = 0 then 'waived' else 'unpaid' end)
    on conflict (partner_id, month) do nothing
    returning * into v_row;
    if v_row.id is not null then return next v_row; end if;
    v_row := null;
  end loop;
end $$;

create or replace function public.partner_recipients(p_partner uuid) returns setof text
language sql stable security definer set search_path = '' as $$
  select distinct lower(e) from (
    select contact_email as e from public.partners where id = p_partner and contact_email is not null
    union all
    select u.email from public.partner_members m join auth.users u on u.id = m.user_id where m.partner_id = p_partner
  ) x where e is not null
$$;

-- ───────────────────────────── partner actions
create or replace function public.claim_partner_membership() returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_email text; v_partner uuid;
begin
  if v_uid is null then return null; end if;
  select m.partner_id into v_partner from public.partner_members m where m.user_id = v_uid order by m.created_at limit 1;
  if v_partner is not null then return v_partner; end if;
  select lower(email) into v_email from auth.users where id = v_uid and email_confirmed_at is not null;
  if v_email is null then return null; end if;
  select id into v_partner from public.partners
    where lower(contact_email) = v_email and status in ('onboarding','active') order by created_at limit 1;
  if v_partner is null then return null; end if;
  insert into public.partner_members (partner_id, user_id, role) values (v_partner, v_uid, 'owner') on conflict do nothing;
  return v_partner;
end $$;

create or replace function public.partner_create_invite(p_partner uuid, p_email text, p_name text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_email text := lower(trim(p_email));
begin
  if not public.is_partner_member(p_partner) then raise exception 'forbidden' using errcode = '42501'; end if;
  if not exists (select 1 from public.partners where id = p_partner and status in ('onboarding','active') and handle is not null) then
    raise exception 'partner_not_active';
  end if;
  if (select count(*) from public.partner_invites where partner_id = p_partner and created_at > now() - interval '1 day') >= 30 then
    raise exception 'too_many_invites' using hint = 'At most 30 invites a day.';
  end if;
  insert into public.partner_invites (partner_id, business_email, business_name, created_by)
  values (p_partner, v_email, nullif(left(trim(coalesce(p_name, '')), 200), ''), auth.uid())
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.partner_submit_claim(p_invoice uuid, p_network text, p_tx_ref text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare inv public.partner_invoices; v_id uuid;
begin
  select * into inv from public.partner_invoices where id = p_invoice;
  if not found or not public.is_partner_member(inv.partner_id) then raise exception 'forbidden' using errcode = '42501'; end if;
  if inv.status <> 'unpaid' then raise exception 'invoice_not_unpaid'; end if;
  if p_network not in ('trc20','binance_pay') then raise exception 'bad_network'; end if;
  if exists (select 1 from public.usdt_claims where invoice_id = p_invoice and status = 'pending') then
    raise exception 'claim_pending' using hint = 'A payment for this invoice is already waiting for confirmation.';
  end if;
  insert into public.usdt_claims (kind, partner_id, invoice_id, network, tx_ref, amount_usd, submitted_by)
  values ('partner_invoice', inv.partner_id, inv.id, p_network, trim(p_tx_ref), inv.amount_usd, auth.uid())
  returning id into v_id;
  return v_id;
exception when unique_violation then
  raise exception 'tx_already_used' using hint = 'This transaction ID was already submitted.';
end $$;

-- ───────────────────────────── staff
create or replace function public.staff_create_partner(
  p_name text, p_handle text, p_email text, p_instagram text default null, p_country text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_founding boolean; v_email text := lower(trim(p_email)); v_user uuid;
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  if coalesce(trim(p_name), '') = '' then raise exception 'name_required'; end if;
  if v_email !~ '^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$' then raise exception 'bad_email'; end if;
  v_founding := (select count(*) from public.partners where founding) < 10;
  insert into public.partners (name, handle, contact_email, instagram, country, status, billing_term, rate_usd, founding, price_locked_until)
  values (left(trim(p_name), 120), lower(trim(p_handle)), v_email, nullif(left(trim(coalesce(p_instagram, '')), 80), ''),
          nullif(upper(left(trim(coalesce(p_country, '')), 2)), ''), 'active', 'monthly',
          case when v_founding then 6 else 8 end, v_founding,
          case when v_founding then (current_date + interval '12 months')::date end)
  returning id into v_id;
  select id into v_user from auth.users where lower(email) = v_email;
  if v_user is not null then insert into public.partner_members (partner_id, user_id, role) values (v_id, v_user, 'owner'); end if;
  return v_id;
exception when unique_violation then
  raise exception 'handle_taken' using hint = 'Another partner already uses this handle.';
end $$;

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
  end if;
  return case when p_confirm then 'confirmed' else 'rejected' end;
end $$;

-- ───────────────────────────── onboarding: accept a partner invite (replaces the 6-argument version)
drop function public.start_location(text, text, text, text, text, text);
create or replace function public.start_location(
  p_place_id text, p_name text, p_address text, p_country text, p_time_zone text,
  p_partner_handle text default null, p_invite uuid default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_existing uuid; v_partner uuid; v_source text := 'self'; v_id uuid; v_tz text;
begin
  if v_uid is null then raise exception 'not_signed_in' using errcode = '42501'; end if;
  if coalesce(trim(p_place_id), '') = '' or coalesce(trim(p_name), '') = '' then raise exception 'missing_business'; end if;

  select id into v_existing from public.locations where place_id = p_place_id;
  if v_existing is not null then
    if public.is_member(v_existing) then return v_existing; end if;
    raise exception 'already_on_kabsi' using hint = 'This business is already on Kabsi. Contact hello@kabsi.co.';
  end if;

  if p_invite is not null then
    select i.partner_id into v_partner from public.partner_invites i join public.partners p on p.id = i.partner_id
      where i.id = p_invite and i.accepted_at is null and i.created_at > now() - interval '60 days'
        and p.status in ('onboarding','active');
    if v_partner is not null then v_source := 'partner_invite'; end if;
  end if;
  if v_partner is null and p_partner_handle is not null then
    select id into v_partner from public.partners
      where handle = lower(p_partner_handle) and status in ('onboarding','active');
    if v_partner is not null then v_source := 'partner_link'; end if;
  end if;

  v_tz := case when exists (select 1 from pg_catalog.pg_timezone_names where name = p_time_zone) then p_time_zone else 'UTC' end;

  insert into public.locations (name, place_id, address, country, time_zone, partner_id, signup_source, onboarding_step, created_by)
  values (left(trim(p_name), 200), p_place_id, left(p_address, 300), upper(left(p_country, 2)), v_tz, v_partner,
          v_source, 'access', v_uid)
  returning id into v_id;
  insert into public.location_members (location_id, user_id, role) values (v_id, v_uid, 'owner');

  if v_source = 'partner_invite' then
    update public.partner_invites set accepted_at = now(), location_id = v_id where id = p_invite and accepted_at is null;
  end if;
  return v_id;
end $$;

-- ───────────────────────────── privileges
revoke execute on function public.partner_rate(uuid, date), public.partner_invoice_calc(uuid, date),
  public.partner_billing_run(date), public.partner_recipients(uuid), public.claim_partner_membership(),
  public.partner_create_invite(uuid, text, text), public.partner_submit_claim(uuid, text, text),
  public.staff_create_partner(text, text, text, text, text), public.staff_decide_claim(uuid, boolean, text),
  public.start_location(text, text, text, text, text, text, uuid)
  from public, anon, authenticated;
grant execute on function public.partner_billing_run(date), public.partner_recipients(uuid),
  public.partner_invoice_calc(uuid, date), public.partner_rate(uuid, date) to service_role;
grant execute on function public.partner_invoice_calc(uuid, date), public.claim_partner_membership(),
  public.partner_create_invite(uuid, text, text), public.partner_submit_claim(uuid, text, text),
  public.staff_create_partner(text, text, text, text, text), public.staff_decide_claim(uuid, boolean, text),
  public.start_location(text, text, text, text, text, text, uuid) to authenticated;

select cron.schedule('kabsi_partner_billing', '10 6 * * *', $$select public.call_internal('partner/billing')$$);