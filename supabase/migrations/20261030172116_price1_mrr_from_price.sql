-- Price 1 (master plan 30.20 sections 1 and 6): MRR in the staff validation figures comes from the plan's own price, read by
-- the Creem product id the subscription is on (both price families: founding 19, 39, 190, 390 and list 29, 59, 290, 590;
-- a yearly plan divided by 12), plus each extra location (15 a month or 150 a year, times its units), never from a payment
-- amount. Margin stays "before tax and Creem fees". Only private.money_figures changes; the rest of it is as Scope 1 wrote it.

-- The price of a Creem product Kabsi sells, in cents, and its period, by the ids the setup action stored for a mode
-- (app_settings creem_products_<mode>). Keep equal to CATALOGUE in supabase/functions/_shared/creem.ts.
create or replace function private.creem_plan_price(p_mode text, p_product_id text)
returns table (cents integer, period text)
language sql stable security definer set search_path = '' as $$
  select (case j.key
            when 'essentials_month' then 1900 when 'essentials_year' then 19000
            when 'pro_month' then 3900 when 'pro_year' then 39000
            when 'essentials_month_list' then 2900 when 'essentials_year_list' then 29000
            when 'pro_month_list' then 5900 when 'pro_year_list' then 59000
            when 'extra_month' then 1500 when 'extra_year' then 15000 end)::integer,
         case when j.key like '%\_year%' then 'year' else 'month' end
    from public.app_settings s, jsonb_each_text(case when s.value ~ '^\s*\{' then s.value::jsonb else '{}'::jsonb end) j
   where s.key = 'creem_products_' || p_mode and p_product_id is not null and j.value = p_product_id
     and j.key in ('essentials_month', 'essentials_year', 'pro_month', 'pro_year', 'essentials_month_list',
                   'essentials_year_list', 'pro_month_list', 'pro_year_list', 'extra_month', 'extra_year')
   limit 1
$$;
revoke all on function private.creem_plan_price(text, text) from public, anon, authenticated;

-- Money. USD only; test mode and demo accounts left out.
create or replace function private.money_figures() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_mrr jsonb; v_cash jsonb; v_margin jsonb;
  v_subs integer; v_unmatched integer; v_other_currency integer; v_mrr_cents numeric;
begin
  -- MRR (Price 1, master plan 30.20 section 1): each active live plan at its own price, read from the Creem product id it is on
  -- (a yearly plan divided by 12), plus each active live extra location at the extra location price times its units. Never a
  -- payment amount, so a prorated or discounted payment cannot become the price. A plan whose product Kabsi does not know is
  -- no_data. Trials, Founding 25, ended and unpaid subscriptions are not active paid ones.
  with plans as (
    select s.product_id, p.cents, p.period from public.subscriptions s
      join public.organizations o on o.id = s.organization_id
      left join lateral private.creem_plan_price('live', s.product_id) p on true
     where s.state = 'active' and s.mode = 'live' and s.plan <> 'free' and not coalesce(o.billing_test, false) and not o.is_demo
  ), extras as (
    select x.units, x.period from public.billing_extras x
      join public.organizations o on o.id = x.organization_id
     where x.state = 'active' and x.mode = 'live' and not coalesce(o.billing_test, false) and not o.is_demo
  )
  select (select count(*) from plans) + (select count(*) from extras),
         (select count(*) from plans where cents is null) + (select count(*) from extras where period is null),
         0,
         coalesce((select sum(cents / case period when 'year' then 12.0 else 1.0 end) from plans where cents is not null), 0)
         + coalesce((select sum(units * case period when 'year' then 15000 / 12.0 else 1500 end) from extras where period is not null), 0)
    into v_subs, v_unmatched, v_other_currency, v_mrr_cents;
  v_mrr := case when v_unmatched > 0 then jsonb_build_object('status', 'no_data', 'subscriptions', v_subs)
                else jsonb_build_object('status', 'ok', 'subscriptions', v_subs, 'usd_per_month', round(coalesce(v_mrr_cents, 0) / 100.0, 2),
                                        'basis', 'plan price by Creem product id') end;

  -- Cash by month (live): each payment once by its payment id; refunds and chargebacks from their own events. A payment
  -- with no payment id, an amount in another currency, or a refund or chargeback with no business makes the month no_data.
  with ev as (
    select date_trunc('month', e.event_created_at)::date as month, e.event_type, e.payment_id, e.amount, e.currency, e.organization_id
      from public.billing_events e
     where e.mode = 'live' and e.event_type in ('subscription.paid', 'checkout.completed', 'refund.created', 'dispute.created')
       and e.event_created_at > now() - interval '12 months'
  ), pay as (
    select distinct on (payment_id) month, amount, currency, organization_id from ev
     where event_type in ('subscription.paid', 'checkout.completed') and amount is not null and payment_id is not null
     order by payment_id, month
  ), months as (select distinct month from ev)
  select coalesce(jsonb_agg(jsonb_build_object('month', m.month,
        'status', case when exists (select 1 from ev where ev.month = m.month and (ev.amount is null or coalesce(ev.currency, '') <> 'USD'
                                      or (ev.event_type in ('subscription.paid', 'checkout.completed') and ev.payment_id is null)
                                      or (ev.event_type in ('refund.created', 'dispute.created') and ev.organization_id is null)))
                   then 'no_data' else 'ok' end,
        'payments_usd', (select round(sum(p.amount) / 100.0, 2) from pay p where p.month = m.month),
        'refunds_usd', (select round(coalesce(sum(ev.amount), 0) / 100.0, 2) from ev where ev.month = m.month and ev.event_type = 'refund.created'),
        'chargebacks_usd', (select round(coalesce(sum(ev.amount), 0) / 100.0, 2) from ev where ev.month = m.month and ev.event_type = 'dispute.created'))
      order by m.month), '[]'::jsonb)
    into v_cash from months m;
  -- A no_data month shows no amounts.
  v_cash := coalesce((select jsonb_agg(case when x ->> 'status' = 'no_data'
      then jsonb_build_object('month', x -> 'month', 'status', 'no_data') else x end) from jsonb_array_elements(v_cash) x), '[]'::jsonb);

  -- Contribution margin per paying account: cash collected, less refunds and chargebacks, less the cost per business already
  -- measured (AI use by agent, free check, Visibility Map and AI Visibility data cost). Tax and Creem's fees are not in the events, so they are not taken off,
  -- and the figure says so. An account with an unreconciled event shows no_data.
  select coalesce(jsonb_agg(row_to_json(q)::jsonb order by q.business), '[]'::jsonb) into v_margin from (
    select l.name as business, o.id as organization_id,
      case when bad.n > 0 then 'no_data' else 'ok' end as status,
      case when bad.n > 0 then null else round(coalesce(pay.cents, 0) / 100.0, 2) end as cash_usd,
      case when bad.n > 0 then null else round(coalesce(rf.cents, 0) / 100.0, 2) end as refunds_and_chargebacks_usd,
      case when bad.n > 0 then null else round(coalesce(cost.micros, 0) / 1000000.0, 2) end as cost_usd,
      case when bad.n > 0 then null else round((coalesce(pay.cents, 0) - coalesce(rf.cents, 0)) / 100.0 - coalesce(cost.micros, 0) / 1000000.0, 2) end as margin_usd,
      'before tax and Creem fees' as basis
    from public.organizations o
    join lateral (select l.* from public.locations l where l.organization_id = o.id order by l.created_at limit 1) l on true
    left join lateral (select sum(a.amount)::numeric as cents from (select distinct on (e.payment_id) e.amount from public.billing_events e
        where e.organization_id = o.id and e.mode = 'live' and e.event_type in ('subscription.paid', 'checkout.completed') and e.amount is not null and e.payment_id is not null
        order by e.payment_id, e.event_created_at) a) pay on true
    left join lateral (select sum(e.amount)::numeric as cents from public.billing_events e
        where e.organization_id = o.id and e.mode = 'live' and e.event_type in ('refund.created', 'dispute.created')) rf on true
    left join lateral (select coalesce((select sum(u.cost_micros) from public.ai_agent_usage u join public.locations x on x.id = u.location_id where x.organization_id = o.id), 0)
                              + coalesce((select sum(k.cost_micros) from public.free_checks k join public.locations x on x.id = k.location_id where x.organization_id = o.id), 0)
                              + coalesce((select sum(k.cost_micros) from public.visibility_scans k join public.locations x on x.id = k.location_id where x.organization_id = o.id), 0)
                              + coalesce((select sum(k.cost_micros) from public.ai_visibility_runs k join public.locations x on x.id = k.location_id where x.organization_id = o.id), 0) as micros) cost on true
    left join lateral (select count(*)::int as n from public.billing_events e where e.organization_id = o.id and e.mode = 'live'
        and ((e.event_type in ('subscription.paid', 'checkout.completed') and (e.amount is null or e.payment_id is null))
          or (e.amount is not null and coalesce(e.currency, '') <> 'USD')
          or (e.event_type in ('refund.created', 'dispute.created') and e.amount is null))) bad on true
    where not coalesce(o.billing_test, false) and not o.is_demo
      and exists (select 1 from public.billing_events e where e.organization_id = o.id and e.mode = 'live' and e.event_type in ('subscription.paid', 'checkout.completed'))
  ) q;
  return jsonb_build_object('mrr', v_mrr, 'cash_by_month', v_cash, 'margin_per_account', v_margin);
end $$;
revoke all on function private.money_figures() from public, anon, authenticated;
