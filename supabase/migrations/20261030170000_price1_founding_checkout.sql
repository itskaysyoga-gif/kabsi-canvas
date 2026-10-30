-- Price 1 (master plan 30.20 section 6, Rashid's "yes 29/59" of 30 Oct 2026): two price families.
-- List prices for new businesses (Essentials 29 and Pro 59 a month, 290 and 590 a year); the founding price (19 and 39,
-- 190 and 390) for the first 30 paying businesses and for Founding 25, kept while the subscription stays paid.
-- The price is decided when the checkout starts, under one lock, so two checkouts can never both take place 30:
--   1. a checkout already started (the same request, or an open checkout of the business in the last 24 hours) keeps the
--      price the owner was shown;
--   2. a Founding 25 business (accepted application) gets the founding price whatever the count says, and takes no place;
--   3. otherwise the founding price while places are left, then the list price.
-- A place is taken by a founding subscription, a completed founding checkout, or an open founding checkout of the last 24
-- hours. Additive only: one column, its check, one setting, functions.

alter table public.billing_checkouts add column if not exists price_family text;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'billing_checkouts_price_family_check') then
    alter table public.billing_checkouts add constraint billing_checkouts_price_family_check
      check (price_family is null or price_family in ('founding', 'list'));
  end if;
end $$;
comment on column public.billing_checkouts.price_family is
  'Price 1: founding (19 and 39) or list (29 and 59), chosen under the founding lock when the checkout started. Null before Price 1 (founding products).';

-- How many founding places exist in test mode, so a test can reach the list price (live mode is always 30).
insert into public.app_settings (key, value) values ('founding_places_test', '30') on conflict (key) do nothing;

create or replace function private.founding_places_left_in(p_mode text) returns integer
language sql stable security definer set search_path = '' as $$
  with f25 as (
    select a.organization_id from public.founding_applications a where a.status = 'accepted' and a.organization_id is not null
  ), taken as (
    select s.organization_id from public.subscriptions s where s.founding and s.mode = p_mode
    union
    select c.organization_id from public.billing_checkouts c
     where c.price_family = 'founding' and c.mode = p_mode
       and (c.completed_at is not null or c.created_at > now() - interval '24 hours')
  )
  select greatest(0,
    (case when p_mode = 'live' then 30
          else coalesce((select case when s.value ~ '^[0-9]{1,4}$' then s.value::integer end
                           from public.app_settings s where s.key = 'founding_places_test'), 30) end)
    - (select count(*) from taken t where not exists (select 1 from f25 where f25.organization_id = t.organization_id)))::integer
$$;
revoke all on function private.founding_places_left_in(text) from public, anon, authenticated;

-- The public count (pricing page, through billing-creem): live mode, open founding checkouts included.
create or replace function public.founding_places_left() returns integer
language sql stable security definer set search_path = '' as $$
  select private.founding_places_left_in('live')
$$;
revoke all on function public.founding_places_left() from public, anon, authenticated;
grant execute on function public.founding_places_left() to service_role;

create or replace function public.billing_checkout_family(p_org uuid, p_request_id text, p_mode text, p_plan text,
  p_period text, p_user uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare r public.billing_checkouts; v_family text;
begin
  if p_org is null or coalesce(p_request_id, '') = '' or p_mode not in ('test', 'live')
     or p_plan not in ('essentials', 'pro') or p_period not in ('month', 'year') then
    raise exception 'bad_input';
  end if;
  -- One lock for every founding decision: the count and the new row are one step.
  perform pg_advisory_xact_lock(hashtext('kabsi_founding_places'));
  select * into r from public.billing_checkouts where request_id = p_request_id;
  if found then
    return jsonb_build_object('family', coalesce(r.price_family, case when r.product_key like '%\_list' then 'list' else 'founding' end),
      'checkout_url', r.checkout_url, 'completed', r.completed_at is not null);
  end if;
  select c.price_family into v_family from public.billing_checkouts c
   where c.organization_id = p_org and c.mode = p_mode and c.price_family is not null
     and c.completed_at is null and c.created_at > now() - interval '24 hours'
   order by c.created_at desc limit 1;
  if v_family is null then
    if exists (select 1 from public.founding_applications a where a.organization_id = p_org and a.status = 'accepted') then
      v_family := 'founding';
    elsif private.founding_places_left_in(p_mode) > 0 then
      v_family := 'founding';
    else
      v_family := 'list';
    end if;
  end if;
  insert into public.billing_checkouts (request_id, organization_id, product_key, units, mode, created_by, price_family)
  values (p_request_id, p_org, p_plan || '_' || p_period || case when v_family = 'list' then '_list' else '' end, 1, p_mode,
          p_user, v_family);
  return jsonb_build_object('family', v_family, 'checkout_url', null, 'completed', false);
end $$;
revoke all on function public.billing_checkout_family(uuid, text, text, text, text, uuid) from public, anon, authenticated;
grant execute on function public.billing_checkout_family(uuid, text, text, text, text, uuid) to service_role;
