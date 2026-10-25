-- Session 10 (master plan section 10, R-67): the paid state Creem's webhook writes, read by the one entitlements
-- function. Paid while active (a scheduled cancel stays paid to the period end); a failed payment keeps working for
-- 7 days from the first failure, then pauses; paused and expired watch and draft but never publish; cancelled ends;
-- a checkout alone changes nothing; a downgrade keeps Pro until the renewal; extra locations add to the locations
-- allowed; each Creem event id is stored once; the founding count is live mode only; the ledger, the checkouts and
-- the owner contacts and the founding count (served by billing-creem) are closed to browsers; the paid buttons open only for test accounts until billing_open is on.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

\ir _fixtures.psql

insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
select '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email, now(), '{}', '{}', now(), now()
from (values ('00000000-0000-4000-8000-0000000010a1'::uuid, 'billing-owner-a@example.test'),
             ('00000000-0000-4000-8000-0000000010a2'::uuid, 'billing-owner-b@example.test')) as u(id, email);
insert into public.locations (id, name, place_id, created_by, time_zone, signup_source)
values ('00000000-0000-4000-8000-0000000010c1', 'Billing Shop', 'billing-place-1', '00000000-0000-4000-8000-0000000010a1', 'UTC', 'self'),
       ('00000000-0000-4000-8000-0000000010c2', 'Other Shop', 'billing-place-2', '00000000-0000-4000-8000-0000000010a2', 'UTC', 'partner_link');
insert into public.location_members (location_id, user_id, role)
values ('00000000-0000-4000-8000-0000000010c1', '00000000-0000-4000-8000-0000000010a1', 'owner'),
       ('00000000-0000-4000-8000-0000000010c2', '00000000-0000-4000-8000-0000000010a2', 'owner');
create function pg_temp.org() returns uuid language sql as $$
  select organization_id from public.locations where id = '00000000-0000-4000-8000-0000000010c1' $$;
create function pg_temp.ent() returns jsonb language sql as $$ select private.entitlements(pg_temp.org(), null) $$;
create function pg_temp.set_sub(p_state text, p_extra text default '') returns void language plpgsql as $$
begin
  execute format('update public.subscriptions set state = %L, updated_at = now() %s where provider_subscription_id = %L', p_state, p_extra, 'sub_test_1');
end $$;

select ok(pg_temp.org() is not null, 'the business has an organisation');
select is(pg_temp.ent() ->> 'state', 'none', 'no plan before anything');

-- A checkout alone (checkout.completed) changes no access.
insert into public.subscriptions (organization_id, plan, state, period, provider, provider_subscription_id, provider_customer_id, mode, last_event_at)
values (pg_temp.org(), 'essentials', 'incomplete', 'month', 'creem', 'sub_test_1', 'cust_test_1', 'test', now());
select is(pg_temp.ent() ->> 'state', 'none', 'a checkout without a payment is not paid');

-- subscription.paid: paid, the Essentials plan and its limits (27.4).
select pg_temp.set_sub('active', ', current_period_end = now() + interval ''30 days''');
select is(pg_temp.ent() ->> 'state', 'paid', 'paid after the payment');
select is(pg_temp.ent() ->> 'plan', 'essentials', 'on Essentials');
select is((pg_temp.ent() -> 'limits' ->> 'competitors')::int, 3, 'Essentials watches 3 competitors');
select is((pg_temp.ent() -> 'limits' ->> 'map_keywords')::int, 1, 'and 1 map keyword');
select is((pg_temp.ent() ->> 'publish')::boolean, true, 'paid publishes');
select is((pg_temp.ent() ->> 'locations_allowed')::int, 1, 'one location');

-- Extra locations (units) and the upgrade.
select pg_temp.set_sub('active', ', units = 2');
select is((pg_temp.ent() ->> 'locations_allowed')::int, 3, 'two extra locations make three');
select pg_temp.set_sub('active', ', plan = ''pro''');
select is(pg_temp.ent() ->> 'plan', 'pro', 'an upgrade changes the plan at once');
select is((pg_temp.ent() -> 'limits' ->> 'competitors')::int, 5, 'Pro watches 5 competitors');

-- A downgrade takes effect at renewal: Pro is kept until then.
select pg_temp.set_sub('active', ', plan = ''essentials'', kept_plan = ''pro'', kept_plan_until = now() + interval ''10 days''');
select is(pg_temp.ent() ->> 'plan', 'pro', 'a downgrade keeps Pro until the renewal');
select pg_temp.set_sub('active', ', kept_plan_until = now() - interval ''1 minute''');
select is(pg_temp.ent() ->> 'plan', 'essentials', 'then Essentials');

-- subscription.scheduled_cancel: paid until the period end.
select pg_temp.set_sub('active', ', cancel_at_period_end = true');
select is(pg_temp.ent() ->> 'state', 'paid', 'a scheduled cancel stays paid');
select is((pg_temp.ent() -> 'billing' ->> 'cancel_at_period_end')::boolean, true, 'and says it ends');
select pg_temp.set_sub('active', ', cancel_at_period_end = false');

-- subscription.past_due: 7 days of grace from the first failure, then paused.
select pg_temp.set_sub('past_due', ', past_due_at = now() - interval ''6 days''');
select is(pg_temp.ent() ->> 'state', 'paid', 'a failed payment keeps working inside the 7 days');
select is((pg_temp.ent() -> 'billing' ->> 'payment_failed')::boolean, true, 'and says the card did not go through');
select ok((pg_temp.ent() -> 'billing' ->> 'grace_ends_at') is not null, 'with the grace end date');
select pg_temp.set_sub('past_due', ', past_due_at = now() - interval ''8 days''');
select is(pg_temp.ent() ->> 'state', 'paused', 'after the 7 days it pauses');
select is((pg_temp.ent() ->> 'publish')::boolean, false, 'paused publishes nothing');
select is((pg_temp.ent() ->> 'watch')::boolean, true, 'paused keeps watching');

-- subscription.paused and subscription.expired: paused, data kept 30 days. subscription.canceled: ended.
select pg_temp.set_sub('paused', ', past_due_at = null');
select is(pg_temp.ent() ->> 'state', 'paused', 'paused');
select ok((pg_temp.ent() -> 'billing' ->> 'data_kept_until') is not null, 'with the date data is kept until');
select pg_temp.set_sub('expired', ', ended_at = now()');
select is(pg_temp.ent() ->> 'state', 'paused', 'expired is paused too');
select pg_temp.set_sub('cancelled', ', ended_at = now()');
select is(pg_temp.ent() ->> 'state', 'ended', 'cancelled ends');
select is((pg_temp.ent() ->> 'draft')::boolean, false, 'and nothing is drafted');

-- One row per Creem event id: a repeat is refused by the database, so the webhook answers 200 and does nothing.
insert into public.billing_events (provider, event_key, event_type) values ('creem', 'evt_test_1', 'subscription.paid');
select throws_ok($$ insert into public.billing_events (provider, event_key, event_type) values ('creem', 'evt_test_1', 'subscription.paid') $$,
  '23505', null, 'the same event id is stored once');

-- The founding count: live mode only, the first 30.
select is(public.founding_places_left(), 30, '30 founding places before any live payment');
update public.subscriptions set founding = true where provider_subscription_id = 'sub_test_1';
select is(public.founding_places_left(), 30, 'a test-mode subscription takes no founding place');
update public.subscriptions set mode = 'live' where provider_subscription_id = 'sub_test_1';
select is(public.founding_places_left(), 29, 'a live founding business takes one');

-- The trial: 30 days through a partner (29.1), 14 otherwise.
select is(public.trial_days_for('partner_link'), 30, '30 days through a partner link');
select is(public.trial_days_for('partner_invite'), 30, 'and through a partner invite');
select is(public.trial_days_for('self'), 14, '14 days otherwise');

-- The paid buttons: closed until billing_open, except for a Kabsi test account.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000010a1", "role": "authenticated"}', true);
select is((public.plan_summary('00000000-0000-4000-8000-0000000010c1') ->> 'checkout_open')::boolean, false, 'plans are closed for an owner');
reset role;
update public.organizations set billing_test = true where id = pg_temp.org();
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000010a1", "role": "authenticated"}', true);
select is((public.plan_summary('00000000-0000-4000-8000-0000000010c1') ->> 'checkout_open')::boolean, true, 'and open for a test account');
select throws_ok($$ select public.founding_places_left() $$, '42501', null, 'browsers read the founding count only through billing-creem');

-- Browsers never read the ledger, the checkouts or the owner contacts, and one owner never reads another's plan.
select throws_ok($$ select count(*) from public.billing_events $$, '42501', null, 'the ledger is closed to owners');
select throws_ok($$ select count(*) from public.billing_checkouts $$, '42501', null, 'the checkouts are closed to owners');
select throws_ok($$ select * from public.billing_owner_contacts(pg_temp.org()) $$, '42501', null, 'the owner contacts are service only');
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-0000000010a2", "role": "authenticated"}', true);
select throws_ok($$ select public.entitlements(null, '00000000-0000-4000-8000-0000000010c1') $$, '42501', null,
  'another owner cannot read this plan');
reset role;
set local role anon;
select throws_ok($$ select public.founding_places_left() $$, '42501', null, 'anon cannot run it either');
reset role;

select * from finish();
rollback;
