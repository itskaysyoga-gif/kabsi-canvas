-- Price 1 (master plan 30.20 section 6): the price family is chosen when a checkout starts, under one lock. The first places
-- go to the founding price, then the list price; the same request and an open checkout keep the price the owner was shown;
-- a Founding 25 business gets the founding price whatever the count says and takes no place; the check constraint takes
-- every value the code writes; the functions are closed to browsers.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

\ir _fixtures.psql

insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
select '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email, now(), '{}', '{}', now(), now()
from (values ('00000000-0000-4000-8000-0000000030a1'::uuid, 'price1-a@example.test'),
             ('00000000-0000-4000-8000-0000000030a2'::uuid, 'price1-b@example.test'),
             ('00000000-0000-4000-8000-0000000030a3'::uuid, 'price1-c@example.test'),
             ('00000000-0000-4000-8000-0000000030a4'::uuid, 'price1-f25@example.test')) as u(id, email);
insert into public.locations (id, name, place_id, created_by, time_zone, signup_source)
values ('00000000-0000-4000-8000-0000000030c1', 'Price A', 'price1-place-a', '00000000-0000-4000-8000-0000000030a1', 'UTC', 'self'),
       ('00000000-0000-4000-8000-0000000030c2', 'Price B', 'price1-place-b', '00000000-0000-4000-8000-0000000030a2', 'UTC', 'self'),
       ('00000000-0000-4000-8000-0000000030c3', 'Price C', 'price1-place-c', '00000000-0000-4000-8000-0000000030a3', 'UTC', 'self'),
       ('00000000-0000-4000-8000-0000000030c4', 'Price F25', 'price1-place-d', '00000000-0000-4000-8000-0000000030a4', 'UTC', 'self');
create function pg_temp.org(p text) returns uuid language sql as $$
  select organization_id from public.locations where id = ('00000000-0000-4000-8000-0000000030c' || p)::uuid $$;
create function pg_temp.pick(p_org text, p_req text, p_plan text default 'pro', p_mode text default 'test') returns text language sql as $$
  select public.billing_checkout_family(pg_temp.org(p_org), p_req, p_mode, p_plan, 'month', null) ->> 'family' $$;

-- The check constraint takes every value the code writes, and nothing else.
insert into public.billing_checkouts (request_id, organization_id, product_key, mode, price_family)
values ('c-founding', pg_temp.org('1'), 'pro_month', 'test', 'founding'), ('c-list', pg_temp.org('1'), 'pro_month_list', 'test', 'list'),
       ('c-old', pg_temp.org('1'), 'pro_month', 'test', null);
select is((select count(*)::int from public.billing_checkouts where request_id in ('c-founding', 'c-list', 'c-old')), 3,
  'price_family takes founding, list and null');
select throws_ok($$ insert into public.billing_checkouts (request_id, organization_id, product_key, mode, price_family)
  values ('c-bad', pg_temp.org('1'), 'pro_month', 'test', 'cheap') $$, '23514', null, 'and refuses any other value');
delete from public.billing_checkouts where request_id in ('c-founding', 'c-list', 'c-old');

-- Two founding places in test mode (the setting), so the list price is reached.
update public.app_settings set value = '2' where key = 'founding_places_test';
select is(private.founding_places_left_in('test'), 2, 'two test places before any checkout');
select is(pg_temp.pick('1', 'req-a'), 'founding', 'the first business checks out at the founding price');
select is((select product_key from public.billing_checkouts where request_id = 'req-a'), 'pro_month', 'on the founding product');
select is(private.founding_places_left_in('test'), 1, 'an open founding checkout holds its place');
select is(pg_temp.pick('1', 'req-a2', 'essentials'), 'founding', 'the same business choosing another plan keeps the price it was shown');
select is(private.founding_places_left_in('test'), 1, 'and takes no second place');
select is(pg_temp.pick('2', 'req-b'), 'founding', 'the second business takes the last place');
select is(private.founding_places_left_in('test'), 0, 'no place left');
select is(pg_temp.pick('3', 'req-c'), 'list', 'the third business gets the list price');
select is((select product_key from public.billing_checkouts where request_id = 'req-c'), 'pro_month_list', 'on the list product');
select is(pg_temp.pick('3', 'req-c'), 'list', 'a repeated tap keeps the list price');
select is(pg_temp.pick('1', 'req-a'), 'founding', 'a repeated tap keeps the founding price after the places are gone');
select is(private.founding_places_left_in('live'), 30, 'test checkouts take no live place');

-- An open checkout older than 24 hours frees its place; a completed one keeps it.
update public.billing_checkouts set created_at = now() - interval '25 hours' where request_id in ('req-a', 'req-a2');
select is(private.founding_places_left_in('test'), 1, 'an open founding checkout older than 24 hours frees its place');
update public.billing_checkouts set completed_at = now() where request_id = 'req-a';
select is(private.founding_places_left_in('test'), 0, 'a completed founding checkout keeps its place');

-- Founding 25: the founding price whatever the count says, and no place taken.
insert into public.founding_applications (business_name, country, trade, business_kind, whatsapp, why_now, case_study,
  checkin_consent, consent_text, status, organization_id)
values ('Price F25', 'AE', 'beauty_hair', 'Hair salon', '+15550003004', 'We have no time for Google.', 'anonymous', true,
  'I agree to a check-in call.', 'accepted', pg_temp.org('4'));
select is(pg_temp.pick('4', 'req-f25'), 'founding', 'a Founding 25 business gets the founding price with no place left');
select is(private.founding_places_left_in('test'), 0, 'and takes no place');

-- Live mode: a founding subscription takes a place; the public count reads live mode.
insert into public.subscriptions (organization_id, plan, state, period, provider, provider_subscription_id, mode, founding)
values (pg_temp.org('2'), 'pro', 'active', 'month', 'creem', 'sub_price1_live', 'live', true);
select is(public.founding_places_left(), 29, 'a live founding subscription takes one of the 30');
select is(pg_temp.pick('3', 'req-live', 'pro', 'live'), 'founding', 'a live checkout still gets the founding price');
select is(public.founding_places_left(), 28, 'and holds its place');

select throws_ok($$ select public.billing_checkout_family(pg_temp.org('1'), 'x', 'live', 'gold', 'month', null) $$, 'P0001', 'bad_input',
  'an unknown plan is refused');

-- Closed to browsers.
select tests.act_as('00000000-0000-4000-8000-0000000030a1');
select throws_ok($$ select public.billing_checkout_family(null::uuid, 'y', 'test', 'pro', 'month', null) $$, '42501', null,
  'an owner cannot choose a price family');
reset role;
set local role anon;
select throws_ok($$ select public.billing_checkout_family(null::uuid, 'y', 'test', 'pro', 'month', null) $$, '42501', null, 'nor can anon');
reset role;

select * from finish();
rollback;
