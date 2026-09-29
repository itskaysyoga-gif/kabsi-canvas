-- KABSI: crypto billing through NOWPayments (Q06, D269, D281).
-- One invoice per payment, confirmed by webhook. Only a `finished` payment that matches the stored invoice starts
-- a plan, through the same record_plan_payment core as staff payments (Q05), so the D241 rules hold: a plan starts
-- only once the plan clock is ready, and a payment during a trial or another plan queues behind it.
-- Manual USDT claims, Whish, OMT and cash stay as fallbacks. Monthly plans get a fresh invoice each month.

alter table public.payments drop constraint payments_method_check;
alter table public.payments add constraint payments_method_check check (method in ('cash','whish','omt','usdt','nowpayments'));
create unique index payments_provider_ref on public.payments (method, reference) where method = 'nowpayments';

insert into public.app_settings (key, value) values ('nowpayments', 'off') on conflict (key) do nothing;  -- off | test | on

create table public.billing_invoices (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'nowpayments' check (provider = 'nowpayments'),
  location_id uuid not null references public.locations(id) on delete cascade,
  item text not null check (item in ('pro_monthly','pro_yearly','lebanon_yearly')),
  amount_usd numeric(8,2) not null check (amount_usd > 0),
  currency text not null default 'usd',
  pay_currency text not null check (pay_currency in ('usdttrc20','usdtbsc')),
  order_id text not null unique,
  provider_invoice_id text unique,
  invoice_url text,
  status text not null default 'creating' check (status in ('creating','open','paid','failed_create','expired','cancelled')),
  last_payment_status text,
  paid_payment_id text unique,
  payment_row uuid references public.payments(id) on delete set null,
  is_test boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index billing_invoices_open_idx on public.billing_invoices (location_id) where status in ('creating','open');
create index billing_invoices_created_by_idx on public.billing_invoices (created_by) where created_by is not null;
create index billing_invoices_payment_row_idx on public.billing_invoices (payment_row) where payment_row is not null;
create trigger billing_invoices_updated before update on public.billing_invoices for each row execute function public.set_updated_at();
alter table public.billing_invoices enable row level security;
revoke all on public.billing_invoices from anon, authenticated;

-- One payment sends several IPNs (waiting, confirming, finished), so the key includes the status. The payment
-- itself is made idempotent by billing_invoices.paid_payment_id and payments_provider_ref.
create table public.billing_events (
  id bigint generated always as identity primary key,
  provider text not null,
  event_key text not null,
  payment_id text,
  invoice_id text,
  payment_status text,
  outcome text,
  detail jsonb,
  received_at timestamptz not null default now(),
  unique (provider, event_key)
);
alter table public.billing_events enable row level security;
revoke all on public.billing_events from anon, authenticated;

-- ─── who may pay this way
create or replace function public.billing_enabled_for(p_location uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select case coalesce((select value from public.app_settings where key = 'nowpayments'), 'off')
    when 'on' then true
    when 'test' then public.is_staff() or exists (
      select 1 from public.location_members lm join auth.users u on u.id = lm.user_id
      where lm.location_id = p_location and u.email like '%@test.local')
    else false end
$$;

-- ─── the owner asks for an invoice (called as the signed-in owner)
create or replace function public.billing_prepare_invoice(p_location uuid, p_item text, p_pay_currency text, p_test boolean default false)
returns table (id uuid, order_id text, amount_usd numeric, invoice_url text, reused boolean)
language plpgsql security definer set search_path = '' as $$
declare v_open public.billing_invoices; v_amount numeric; v_id uuid; v_order text;
begin
  if not public.is_member(p_location) then raise exception 'forbidden' using errcode = '42501'; end if;
  if public.partner_covered(p_location) then raise exception 'plan_through_partner'; end if;
  if not (p_item = any (public.owner_plan_kinds(p_location))) then raise exception 'bad_plan'; end if;
  if p_pay_currency not in ('usdttrc20','usdtbsc') then raise exception 'bad_currency'; end if;
  if not public.billing_enabled_for(p_location) then raise exception 'not_available'; end if;
  if p_test and not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;

  select * into v_open from public.billing_invoices b
   where b.location_id = p_location and b.item = p_item and b.pay_currency = p_pay_currency and b.status = 'open'
     and b.is_test = coalesce(p_test, false) and b.created_at > now() - interval '60 minutes' and b.invoice_url is not null
   order by b.created_at desc limit 1;
  if found then
    return query select v_open.id, v_open.order_id, v_open.amount_usd, v_open.invoice_url, true;
    return;
  end if;
  if (select count(*) from public.billing_invoices b where b.location_id = p_location and b.status in ('creating','open')) >= 3 then
    raise exception 'too_many_invoices';
  end if;
  v_amount := case when p_test then 1.00 else public.plan_price(p_item) end;
  v_id := gen_random_uuid();
  v_order := 'kb1.' || p_item || '.' || p_location::text || '.' || encode(extensions.gen_random_bytes(6), 'hex');
  insert into public.billing_invoices (id, location_id, item, amount_usd, pay_currency, order_id, is_test, created_by)
  values (v_id, p_location, p_item, v_amount, p_pay_currency, v_order, coalesce(p_test, false), auth.uid());
  return query select v_id, v_order, v_amount, null::text, false;
end $$;

create or replace function public.billing_attach_invoice(p_id uuid, p_provider_invoice_id text, p_url text) returns void
language sql security definer set search_path = '' as $$
  update public.billing_invoices set provider_invoice_id = p_provider_invoice_id, invoice_url = p_url, status = 'open'
   where id = p_id and status = 'creating'
$$;
create or replace function public.billing_mark_create_failed(p_id uuid) returns void
language sql security definer set search_path = '' as $$
  update public.billing_invoices set status = 'failed_create' where id = p_id and status = 'creating'
$$;

-- ─── the webhook: one transaction, idempotent, never trusts the body's order id alone
create or replace function public.billing_apply_ipn(
  p_payment_id text, p_invoice_id text, p_order_id text, p_status text, p_price_amount numeric, p_price_currency text,
  p_pay_currency text, p_actually_paid numeric, p_verified boolean)
returns text language plpgsql security definer set search_path = '' as $$
declare
  ev bigint; inv public.billing_invoices; v_outcome text := 'ignored'; v_pay uuid; v_name text;
  v_rank constant jsonb := '{"waiting":1,"confirming":2,"confirmed":3,"sending":4,"partially_paid":5,"finished":6}';
  v_new int := coalesce((v_rank ->> p_status)::int, 0); v_old int;
begin
  insert into public.billing_events (provider, event_key, payment_id, invoice_id, payment_status, detail)
  values ('nowpayments', p_payment_id || ':' || p_status, p_payment_id, p_invoice_id, p_status,
          jsonb_build_object('price_amount', p_price_amount, 'actually_paid', p_actually_paid, 'pay_currency', p_pay_currency))
  on conflict (provider, event_key) do nothing returning id into ev;
  if ev is null then return 'duplicate'; end if;

  select * into inv from public.billing_invoices where provider_invoice_id = p_invoice_id for update;
  if not found then
    -- the attach step may have failed after the API call: fall back to the order id, and only for an invoice still 'creating'
    select * into inv from public.billing_invoices where order_id = p_order_id and provider_invoice_id is null and status = 'creating' for update;
    if found then
      update public.billing_invoices set provider_invoice_id = p_invoice_id, status = 'open' where id = inv.id returning * into inv;
    end if;
  end if;
  if not found or inv.order_id is distinct from p_order_id then
    -- forget the event so NOWPayments' retry is processed once the row exists, and tell the team
    delete from public.billing_events where id = ev;
    perform public.ops_emit('billing_alert', 'money', ':warning: Payment for an unknown invoice', 'NOWPayments sent a payment update we cannot match to an invoice. Check the NOWPayments dashboard.',
      public.ops_f('Payment', p_payment_id) || public.ops_f('Status', p_status), public.ops_staff_btn(), 'np_unknown:' || p_payment_id || ':' || p_status);
    return 'unknown_invoice';
  end if;

  select name into v_name from public.locations where id = inv.location_id;
  v_old := coalesce((v_rank ->> inv.last_payment_status)::int, 0);
  if v_new > v_old then update public.billing_invoices set last_payment_status = p_status where id = inv.id; end if;

  if p_status = 'finished' then
    if not p_verified then
      v_outcome := 'mismatch';
    elsif p_price_amount is distinct from inv.amount_usd or lower(coalesce(p_price_currency, '')) <> inv.currency
          or lower(coalesce(p_pay_currency, '')) <> inv.pay_currency then
      v_outcome := 'mismatch';
    elsif inv.paid_payment_id is not null and inv.paid_payment_id <> p_payment_id then
      v_outcome := 'extra_payment';
    elsif inv.paid_payment_id = p_payment_id then
      v_outcome := 'duplicate';
    else
      v_pay := public.record_plan_payment(inv.location_id, inv.item, inv.amount_usd, 'nowpayments', p_payment_id, null);
      update public.billing_invoices set status = 'paid', paid_payment_id = p_payment_id, payment_row = v_pay where id = inv.id;
      v_outcome := 'applied';
    end if;
  elsif p_status in ('expired', 'failed') and inv.status = 'open' then
    update public.billing_invoices set status = 'expired' where id = inv.id;
    v_outcome := 'closed';
  elsif p_status in ('partially_paid', 'refunded') then
    v_outcome := 'alerted';
  end if;

  if v_outcome in ('mismatch', 'extra_payment', 'alerted') or (p_status in ('failed', 'expired') and inv.paid_payment_id is not null) then
    perform public.ops_emit('billing_alert', 'money', ':warning: Crypto payment needs a look: ' || coalesce(v_name, 'a business'),
      case v_outcome when 'mismatch' then 'The payment does not match the invoice, so no plan was started.'
        when 'extra_payment' then 'A second payment arrived on an invoice that was already paid. Nothing was granted.'
        else 'NOWPayments reported: ' || p_status || '. Check the amount before doing anything.' end,
      public.ops_f('Payment', p_payment_id) || public.ops_f('Status', p_status) || public.ops_f('Expected USD', inv.amount_usd::text)
        || public.ops_f('Paid', p_actually_paid::text), public.ops_staff_btn(), 'np:' || p_payment_id || ':' || p_status);
  end if;
  update public.billing_events set outcome = v_outcome where id = ev;
  return v_outcome;
end $$;

-- What the return page shows.
create or replace function public.billing_invoice_status(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare inv public.billing_invoices;
begin
  select * into inv from public.billing_invoices where id = p_id;
  if not found or not public.is_member(inv.location_id) then raise exception 'forbidden' using errcode = '42501'; end if;
  return jsonb_build_object('status', inv.status, 'last_payment_status', inv.last_payment_status);
end $$;

-- Paid monthly and yearly plans ending soon with nothing lined up after them, for the renewal reminders.
create or replace function public.renewal_reminder_candidates()
returns table (plan_id uuid, location_id uuid, name text, time_zone text, kind text, ends_at timestamptz, last_day date, continues boolean)
language sql stable security definer set search_path = '' as $$
  select p.id, l.id, l.name, coalesce(l.time_zone, 'UTC'), p.kind, p.ends_at,
         ((p.ends_at - interval '1 second') at time zone coalesce(l.time_zone, 'UTC'))::date,
         (public.partner_covered(l.id)
          or exists (select 1 from public.plans q where q.location_id = l.id and q.id <> p.id and q.kind <> 'partner'
                       and ((q.status = 'active' and q.ends_at > p.ends_at)
                            or (q.status = 'pending' and exists (select 1 from public.payments pay where pay.plan_id = q.id)))))
  from public.plans p join public.locations l on l.id = p.location_id
  where p.kind in ('pro_monthly','pro_yearly') and p.status = 'active' and p.ends_at > now() and p.ends_at < now() + interval '8 days'
$$;

-- Same body as the concierge migration's plan_summary, plus a `nowpayments` key: true when "Pay with USDT" may show.
create or replace function public.plan_summary(p_location uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare l public.locations; cur public.plans; v_tier text; v_covered boolean; v_tz text; v_unbilled boolean;
begin
  if not (public.is_member(p_location) or public.is_staff()) then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into l from public.locations where id = p_location;
  if not found then return null; end if;
  v_tz := coalesce(l.time_zone, 'UTC');
  v_covered := public.partner_covered(l.id);
  v_unbilled := public.concierge_unbilled(l.id);
  select * into cur from public.plans where location_id = l.id and status = 'active' and kind <> 'partner'
    and starts_at <= now() and ends_at > now() order by (kind = 'trial') asc, ends_at desc limit 1;
  v_tier := case
    when v_unbilled then 'early_access'
    when not public.plan_clock_ready(l.id) then 'none'
    when v_covered then 'partner'
    when cur.id is not null and cur.kind = 'trial' then 'trial'
    when cur.id is not null then 'pro'
    else 'free' end;
  return jsonb_build_object(
    'tier', v_tier,
    'v2', public.plans_v2_on(),
    'nowpayments', public.billing_enabled_for(l.id) and not v_covered,
    'partner_covered', v_covered,
    'concierge', jsonb_build_object('on', l.concierge, 'since', l.concierge_since, 'first_post_at', l.concierge_first_post_at, 'unbilled', v_unbilled),
    'plan', case when cur.id is null then null else jsonb_build_object(
      'kind', cur.kind, 'starts_at', cur.starts_at, 'ends_at', cur.ends_at,
      'last_day', ((cur.ends_at - interval '1 second') at time zone v_tz)::date) end,
    'queued', coalesce((select jsonb_agg(jsonb_build_object('kind', q.kind, 'starts_at', q.starts_at, 'ends_at', q.ends_at,
        'last_day', ((q.ends_at - interval '1 second') at time zone v_tz)::date) order by q.starts_at)
      from public.plans q where q.location_id = l.id and q.status = 'active' and q.kind <> 'partner' and q.starts_at > now()), '[]'::jsonb),
    'paid_waiting', exists (select 1 from public.plans w where w.location_id = l.id and w.status = 'pending'
      and exists (select 1 from public.payments pay where pay.plan_id = w.id)),
    'unpaid_kind', (select w.kind from public.plans w where w.location_id = l.id and w.status = 'pending'
      and not exists (select 1 from public.payments pay where pay.plan_id = w.id) order by w.created_at desc limit 1),
    'trial_used', exists (select 1 from public.plans t where t.location_id = l.id and t.kind = 'trial')
      or (l.place_id is not null and exists (select 1 from public.trial_grants g where g.place_id = l.place_id)),
    'trial_days', public.trial_days_for(l.signup_source),
    'offer', to_jsonb(public.owner_plan_kinds(l.id))
  );
end $$;

-- ─── privileges
revoke execute on function public.billing_enabled_for(uuid), public.billing_attach_invoice(uuid, text, text),
  public.billing_mark_create_failed(uuid), public.billing_apply_ipn(text, text, text, text, numeric, text, text, numeric, boolean),
  public.renewal_reminder_candidates() from public, anon, authenticated;
grant execute on function public.billing_enabled_for(uuid), public.billing_attach_invoice(uuid, text, text),
  public.billing_mark_create_failed(uuid), public.billing_apply_ipn(text, text, text, text, numeric, text, text, numeric, boolean),
  public.renewal_reminder_candidates() to service_role;
revoke execute on function public.billing_prepare_invoice(uuid, text, text, boolean), public.billing_invoice_status(uuid) from public, anon;
grant execute on function public.billing_prepare_invoice(uuid, text, text, boolean), public.billing_invoice_status(uuid) to authenticated;
