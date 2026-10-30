-- Scope 1 part 2 (30 Oct 2026, master plan 30.19 section 3 items 2 to 4): the three activation measures, the slow start alert,
-- the staff evidence log, its retention and the validation figures.
--   A is never zero or negative because of a free check finished before sign-up; a finding never counts as B or C; C counts only
--   an action the owner approved (not auto_fix); the slow start alert is claimed once; the evidence log is staff only and goes
--   after 24 months; a money figure that does not reconcile is no_data.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

\ir _fixtures.psql

update public.staff set role = 'admin' where user_id = '00000000-0000-4000-8000-0000000000a3';

-- Five businesses that signed up 10 days ago.
insert into public.locations (id, name, place_id) values
  ('00000000-0000-4000-8000-000000003101', 'Measure One', 'm-one'),
  ('00000000-0000-4000-8000-000000003102', 'Measure Two', 'm-two'),
  ('00000000-0000-4000-8000-000000003103', 'Measure Three', 'm-three'),
  ('00000000-0000-4000-8000-000000003104', 'Measure Four', 'm-four'),
  ('00000000-0000-4000-8000-000000003105', 'Measure Five', 'm-five');
update public.locations set created_at = now() - interval '10 days'
 where id::text like '00000000-0000-4000-8000-00000000310%';

-- 1. A, and the free check before sign-up stored apart ------------------------------------------------------------------------
insert into public.free_checks (code, business, term, country, self, center, radius_km, fast, source, state, done_at, location_id, created_at) values
  ('PRECHKAB', 'Measure One', 'barber', 'AE', '{}', '{}', 3, '{}', 'mock', 'done', now() - interval '12 days', '00000000-0000-4000-8000-000000003101', now() - interval '12 days'),
  ('PRECHKBC', 'Measure Two', 'barber', 'AE', '{}', '{}', 3, '{}', 'mock', 'done', now() - interval '11 days', '00000000-0000-4000-8000-000000003102', now() - interval '11 days'),
  ('POSTCHK3', 'Measure Three', 'barber', 'AE', '{}', '{}', 3, '{}', 'mock', 'done', now() - interval '9 days', '00000000-0000-4000-8000-000000003103', now() - interval '9 days');
select is((select free_check_before_signup_at::date from public.locations where id = '00000000-0000-4000-8000-000000003101'),
  (now() - interval '12 days')::date, 'a check finished before sign-up is stored apart on the business');
select is((select free_check_before_signup_at from public.locations where id = '00000000-0000-4000-8000-000000003103'), null,
  'a check finished after sign-up is not a check before sign-up');
select is((select a_at from private.activation_rows() where location_id = '00000000-0000-4000-8000-000000003102'), null,
  'a business with only a check before sign-up has no A yet: the check is never the end of A');
select is((select a_at from private.activation_rows() where location_id = '00000000-0000-4000-8000-000000003101'), null,
  'and A is not zero or negative because of it');
select ok((select a_at - signup_at from private.activation_rows() where location_id = '00000000-0000-4000-8000-000000003103') = interval '1 day',
  'a check finished after sign-up ends A (24 hours after sign-up)');

-- A review Kabsi read 5 days ago ends A for business one, 120 hours after sign-up.
insert into public.reviews (id, location_id, google_review_id, star_rating, review_created_at) values
  ('00000000-0000-4000-8000-000000003191', '00000000-0000-4000-8000-000000003101', 'm-one-review', 4, now() - interval '6 days');
update public.reviews set created_at = now() - interval '5 days' where id = '00000000-0000-4000-8000-000000003191';
select is((select private.hours_between(signup_at, a_at) from private.activation_rows() where location_id = '00000000-0000-4000-8000-000000003101'),
  120.0, 'A is the hours from sign-up to the first finding after it');
select ok((select free_check_before_signup_at is not null and a_at > signup_at from private.activation_rows()
            where location_id = '00000000-0000-4000-8000-000000003101'), 'the check before sign-up is still recorded, apart from A');

-- 2. B and C -----------------------------------------------------------------------------------------------------------------
update public.locations set access_granted_at = now() - interval '9 days'
 where id in ('00000000-0000-4000-8000-000000003101', '00000000-0000-4000-8000-000000003104', '00000000-0000-4000-8000-000000003105');
select is((select b_at from private.activation_rows() where location_id = '00000000-0000-4000-8000-000000003101'), null,
  'a finding is not B');
select is((select c_at from private.activation_rows() where location_id = '00000000-0000-4000-8000-000000003101'), null,
  'and not C');
-- An auto-fix seen on Google 8 days ago is B (24 hours after access) and not C; an approved reply seen 7 days ago is C (48 hours).
insert into public.publications (id, location_id, target_type, target_id, payload, approved_by, channel) values
  ('00000000-0000-4000-8000-000000003181', '00000000-0000-4000-8000-000000003101', 'listing_edit', '00000000-0000-4000-8000-000000003171', '{}', '00000000-0000-4000-8000-0000000000a1', 'auto_fix'),
  ('00000000-0000-4000-8000-000000003182', '00000000-0000-4000-8000-000000003101', 'review_reply', '00000000-0000-4000-8000-000000003172', '{}', '00000000-0000-4000-8000-0000000000a1', 'whatsapp');
select is((select verified_at from public.publications where id = '00000000-0000-4000-8000-000000003181'), null, 'a change not yet seen on Google has no verified time');
update public.publications set state = 'verified' where id in ('00000000-0000-4000-8000-000000003181', '00000000-0000-4000-8000-000000003182');
select ok((select verified_at is not null from public.publications where id = '00000000-0000-4000-8000-000000003181'), 'the trigger stamps it when Kabsi sees it live');
update public.publications set verified_at = now() - interval '8 days' where id = '00000000-0000-4000-8000-000000003181';
update public.publications set verified_at = now() - interval '7 days' where id = '00000000-0000-4000-8000-000000003182';
update public.publications set state = 'verified', error = null where id = '00000000-0000-4000-8000-000000003182';
select is((select verified_at::date from public.publications where id = '00000000-0000-4000-8000-000000003182'), (now() - interval '7 days')::date,
  'it is set once and never moved by a later update');
select is((select private.hours_between(access_at, b_at) from private.activation_rows() where location_id = '00000000-0000-4000-8000-000000003101'), 24.0,
  'B is the hours from access to the first verified value (the auto-fix counts)');
select is((select private.hours_between(access_at, c_at) from private.activation_rows() where location_id = '00000000-0000-4000-8000-000000003101'), 48.0,
  'C is the hours to the first owner-approved action seen live (the auto-fix does not count)');
-- Business four: a task the owner closed as done where Google cannot show it is B; nothing is C.
insert into public.location_members (location_id, user_id, role) values ('00000000-0000-4000-8000-000000003104', '00000000-0000-4000-8000-0000000000a1', 'owner');
insert into public.tasks (id, location_id, kind, source_type, source_id, priority, title, why, dedupe_key, state, resolved_at, resolved_by) values
  ('00000000-0000-4000-8000-000000003161', '00000000-0000-4000-8000-000000003104', 'profile_gap', 'profile_gap', 'm4', 'nice', 'Add a description', 'Because', 'profile_gap:m4', 'done', now() - interval '8 days', '00000000-0000-4000-8000-0000000000a1');
select is((select private.hours_between(access_at, b_at) from private.activation_rows() where location_id = '00000000-0000-4000-8000-000000003104'), 24.0,
  'B counts a task the owner closed as done where Google cannot show it');
select is((select c_at from private.activation_rows() where location_id = '00000000-0000-4000-8000-000000003104'), null, 'and it is not C');

-- A change verified before verified_at existed (no stamp, a check time) still ends B, so it cannot cause a false alert.
update public.locations set access_granted_at = now() - interval '4 days' where id = '00000000-0000-4000-8000-000000003102';
insert into public.publications (id, location_id, target_type, target_id, payload, approved_by, channel, state, last_checked_at) values
  ('00000000-0000-4000-8000-000000003183', '00000000-0000-4000-8000-000000003102', 'review_reply', '00000000-0000-4000-8000-000000003173', '{}', '00000000-0000-4000-8000-0000000000a1', 'whatsapp', 'verified', now() - interval '3 days');
update public.publications set verified_at = null where id = '00000000-0000-4000-8000-000000003183';
select is((select private.hours_between(access_at, b_at) from private.activation_rows() where location_id = '00000000-0000-4000-8000-000000003102'), 24.0,
  'a change verified before the column existed ends B at the time of the check that saw it');
update public.locations set access_granted_at = now() - interval '1 day' where id = '00000000-0000-4000-8000-000000003102';
delete from public.publications where id = '00000000-0000-4000-8000-000000003183';

-- 3. The slow start alert -----------------------------------------------------------------------------------------------------
update public.locations set access_granted_at = now() - interval '3 days' where id = '00000000-0000-4000-8000-000000003105';
delete from public.tasks where location_id = '00000000-0000-4000-8000-000000003105';
select is(jsonb_array_length(public.slow_start_due(10)), 0, 'no real work waiting, no alert: the business waits and nothing is counted as failed');
insert into public.tasks (id, location_id, kind, source_type, source_id, priority, title, why, dedupe_key) values
  ('00000000-0000-4000-8000-000000003162', '00000000-0000-4000-8000-000000003105', 'review_reply', 'review', 'm5', 'urgent', 'Reply to a review', 'Because', 'review_reply:m5');
select is(public.slow_start_due(10) -> 0 ->> 'business', 'Measure Five', 'real work waiting 48 hours after access: one alert names the business');
select is(public.slow_start_due(10) -> 0 ->> 'step', null, 'claimed once: the second call returns nothing');
select ok((select slow_start_alert_at is not null from public.locations where id = '00000000-0000-4000-8000-000000003105'), 'the claim is stored on the business');
update public.locations set access_granted_at = now() - interval '1 day' where id = '00000000-0000-4000-8000-000000003102';
select is(jsonb_array_length(public.slow_start_due(10)), 0, 'a business with access 1 day ago, or with B landed, is not alerted');
select ok(not has_function_privilege('authenticated', 'public.slow_start_due(integer)', 'execute')
  and not has_function_privilege('authenticated', 'public.slow_start_release(uuid)', 'execute'), 'the alert query and its release are for the service role only');
select is(public.slow_start_release('00000000-0000-4000-8000-000000003105'), true, 'a claim can be handed back');
select is(public.slow_start_due(10) -> 0 ->> 'business', 'Measure Five', 'and the alert comes back to be sent');

-- 4. The evidence log ----------------------------------------------------------------------------------------------------------
select tests.act_as('00000000-0000-4000-8000-0000000000a3');
select ok(public.staff_evidence_add('00000000-0000-4000-8000-000000003101', null, current_date, 'call', 'request', 'Can it answer my customers?') is not null,
  'staff add a row');
select throws_ok($$ select public.staff_evidence_add(null, null, current_date, 'call', 'request', 'x') $$, '23514', null, 'a row needs a business');
select throws_ok($$ select public.staff_evidence_add(null, 'Cafe', current_date, 'fax', 'request', 'x') $$, '23514', null, 'and a known source');
select throws_ok($$ select public.staff_evidence_add(null, 'Cafe', current_date, 'call', 'gossip', 'x') $$, '23514', null, 'and a known type');
select is((select count(*) from public.staff_evidence where source = 'call' and type = 'request' and words = 'Can it answer my customers?'), 1::bigint, 'staff read the log');
reset role;
select tests.act_as('00000000-0000-4000-8000-0000000000a1');
select throws_ok($$ select public.staff_evidence_add(null, 'Cafe', current_date, 'call', 'request', 'x') $$, '42501', null, 'an owner cannot add');
select is((select count(*) from public.staff_evidence), 0::bigint, 'an owner reads none of it, not even the victim row');
reset role;
select tests.act_as('00000000-0000-4000-8000-0000000000b1');
select throws_ok($$ select public.staff_validation() $$, '42501', null, 'a stranger cannot open the validation figures');
select throws_ok($$ select public.staff_activation() $$, '42501', null, 'nor the activation table');
reset role;
set local role anon;
select throws_ok($$ select public.staff_validation() $$, '42501', null, 'nor anon');
reset role;
insert into public.staff_evidence (business_name, source, type, created_at) values ('Old Cafe', 'call', 'support_given', now() - interval '25 months'),
  ('Young Cafe', 'call', 'support_given', now() - interval '23 months');
insert into public.app_settings (key, value) values ('retention_sources', 'on') on conflict (key) do update set value = 'on';
select ok((private.retention_sources() ->> 'staff_evidence')::int = 1, 'switched on, the job deletes the evidence row written 25 months ago');
select is((select array_agg(business_name order by business_name) from public.staff_evidence where business_name like '%Cafe'), array['Young Cafe'],
  'and keeps the one written 23 months ago');

-- A business with evidence rows can still be deleted: the row stays with no business (the table has no check that stops it).
insert into public.locations (id, name, place_id) values ('00000000-0000-4000-8000-000000003109', 'Deleted Soon', 'm-del');
insert into public.staff_evidence (location_id, source, type) values ('00000000-0000-4000-8000-000000003109', 'call', 'request');
select lives_ok($$ delete from public.locations where id = '00000000-0000-4000-8000-000000003109' $$, 'deleting a business with an evidence row works');

-- 5. The validation figures ----------------------------------------------------------------------------------------------------
select tests.act_as('00000000-0000-4000-8000-0000000000a3');
select ok((public.staff_validation() -> 'paying' ->> 'businesses')::int >= 5, 'the paying cohort counts the businesses');
select is(public.staff_validation() -> 'paying' -> 'a' ->> 'n', '2', 'A has two values (businesses one and three)');
select is(public.staff_validation() -> 'paying' -> 'a_after_a_free_check' ->> 'n', '1', 'A after a free check before sign-up is shown apart');
select is(public.staff_validation() -> 'paying' -> 'c' ->> 'n', '1', 'C has one value');
select is(public.staff_validation() -> 'founding' ->> 'businesses', '0', 'the Founding 25 cohort is kept apart');
select is(public.staff_validation() -> 'money' -> 'mrr' ->> 'status', 'ok', 'with no paying subscription MRR reconciles to zero');
select is(public.staff_validation() -> 'money' -> 'mrr' ->> 'usd_per_month', '0.00', 'MRR is zero');
reset role;

-- Money: an active live subscription, a paid event, a refund and a payment with no payment id.
update public.subscriptions set state = 'active', mode = 'live', plan = 'pro', period = 'year', provider_subscription_id = 'sub_scope1', trial_started_at = null
 where organization_id = (select organization_id from public.locations where id = '00000000-0000-4000-8000-0000000000c1');
select is(private.money_figures() -> 'mrr' ->> 'status', 'no_data', 'an active live subscription with no paid event is no_data, never an estimate');
insert into public.billing_events (provider, event_key, event_type, event_created_at, mode, organization_id, provider_subscription_id, payment_id, amount, currency)
select 'creem', 'scope1-paid', 'subscription.paid', now(), 'live', organization_id, 'sub_scope1', 'pay_1', 39000, 'USD'
  from public.locations where id = '00000000-0000-4000-8000-0000000000c1';
select is(private.money_figures() -> 'mrr' ->> 'usd_per_month', '32.50', 'a yearly plan counts at its yearly price divided by 12');
select is(private.money_figures() -> 'cash_by_month' -> 0 ->> 'payments_usd', '390.00', 'cash is the payment, apart from MRR');
insert into public.billing_events (provider, event_key, event_type, event_created_at, mode, organization_id, provider_subscription_id, payment_id, amount, currency)
select 'creem', 'scope1-refund', 'refund.created', now(), 'live', organization_id, 'sub_scope1', null, 5000, 'USD'
  from public.locations where id = '00000000-0000-4000-8000-0000000000c1';
select is(private.money_figures() -> 'cash_by_month' -> 0 ->> 'refunds_usd', '50.00', 'a refund is cash, shown apart');
select ok((private.money_figures() -> 'margin_per_account' -> 0 ->> 'margin_usd')::numeric <= 340.00, 'margin is cash net of the refund less the measured cost');
insert into public.billing_events (provider, event_key, event_type, event_created_at, mode, organization_id, provider_subscription_id, payment_id, amount, currency)
select 'creem', 'scope1-nopayid', 'subscription.paid', now(), 'live', organization_id, 'sub_scope1', null, 3900, 'USD'
  from public.locations where id = '00000000-0000-4000-8000-0000000000c1';
select is(private.money_figures() -> 'cash_by_month' -> 0 ->> 'status', 'no_data', 'a payment with no payment id makes the month no_data');
select is(private.money_figures() -> 'margin_per_account' -> 0 ->> 'status', 'no_data', 'and the account margin');

select * from finish();
rollback;
