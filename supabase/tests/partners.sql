-- Partners session (master plan 30.15 section 5, 30.17 section 1): Founding 25 and Kabsi Partners.
-- Founding 25: the application is closed to browsers; one open application per WhatsApp number; the mix of 10, 5, 5
-- and 5; the real count of places; only staff decide; a linked place makes the trial 90 days from its start; the day-60
-- message is queued once. Kabsi Partners: the tables are closed to browsers; approval gives a handle and a code; the
-- via code attributes the business once and gives the 30-day trial; a self referral earns nothing; a payment makes a
-- 25 percent line held 30 days; a refund inside the hold cancels it; a refund after a payout comes off the next one;
-- the payout run pays 25 US dollars or more in live mode only, and the statement never names the business.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

\ir _fixtures.psql

insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
select '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email, now(), '{}', '{}', now(), now()
from (values ('00000000-0000-4000-8000-0000000020a1'::uuid, 'founding-owner@example.test'),
             ('00000000-0000-4000-8000-0000000020a2'::uuid, 'referred-owner@example.test'),
             ('00000000-0000-4000-8000-0000000020a3'::uuid, 'self-partner@example.test')) as u(id, email);
insert into public.locations (id, name, place_id, created_by, time_zone, signup_source)
values ('00000000-0000-4000-8000-0000000020c1', 'Founding Salon', 'founding-place-1', '00000000-0000-4000-8000-0000000020a1', 'UTC', 'self'),
       ('00000000-0000-4000-8000-0000000020c2', 'Referred Barber', 'referred-place-1', '00000000-0000-4000-8000-0000000020a2', 'UTC', 'self'),
       ('00000000-0000-4000-8000-0000000020c3', 'Self Cafe', 'self-place-1', '00000000-0000-4000-8000-0000000020a3', 'UTC', 'self');
insert into public.location_members (location_id, user_id, role)
values ('00000000-0000-4000-8000-0000000020c1', '00000000-0000-4000-8000-0000000020a1', 'owner'),
       ('00000000-0000-4000-8000-0000000020c2', '00000000-0000-4000-8000-0000000020a2', 'owner'),
       ('00000000-0000-4000-8000-0000000020c3', '00000000-0000-4000-8000-0000000020a3', 'owner');
create function pg_temp.org(p uuid) returns uuid language sql as $$ select organization_id from public.locations where id = p $$;
create function pg_temp.app(p_phone text, p_trade text default 'beauty_hair') returns uuid language sql as $$
  select public.founding_apply(jsonb_build_object('business_name', 'Shop ' || p_phone, 'country', 'AE', 'trade', p_trade,
    'business_kind', 'Hair salon', 'whatsapp', p_phone, 'why_now', 'We have no time for Google.', 'case_study', 'anonymous',
    'checkin_consent', true, 'consent_text', 'I agree to a 2-minute check-in every two weeks.')) $$;

-- Ids read as the table owner, so the staff persona calls the functions without reading the closed tables.
create function pg_temp.fid(p_phone text) returns uuid language sql security definer as $$
  select id from public.founding_applications where whatsapp = p_phone $$;
create function pg_temp.pid(p_email text) returns uuid language sql security definer as $$
  select id from public.partner_accounts where email = p_email $$;
create function pg_temp.payout() returns uuid language sql security definer as $$
  select id from public.partner_payouts limit 1 $$;

-- ─── closed to browsers ──────────────────────────────────────────────────────────────────────────────────────────
select ok(not has_table_privilege('anon', t, 'select') and not has_table_privilege('authenticated', t, 'select')
  and not has_table_privilege('authenticated', t, 'insert'), t || ' is closed to browsers')
from unnest(array['public.founding_applications', 'public.partner_accounts', 'public.partner_referrals',
  'public.partner_commissions', 'public.partner_payouts']) t;
select ok(not has_function_privilege('anon', 'public.founding_apply(jsonb)', 'execute')
  and not has_function_privilege('authenticated', 'public.founding_apply(jsonb)', 'execute')
  and not has_function_privilege('anon', 'public.partner_apply(jsonb)', 'execute')
  and not has_function_privilege('anon', 'public.founding_places()', 'execute'),
  'applications and counts go only through the programs function (service role)');

-- ─── Founding 25 ─────────────────────────────────────────────────────────────────────────────────────────────────
select ok(pg_temp.app('+971500000001') is not null, 'an application is stored');
select throws_ok($$ select pg_temp.app('+971500000001') $$, 'P0001', 'already_applied', 'one open application per WhatsApp number');
select throws_ok($$ select public.founding_apply('{"business_name": "No consent", "country": "AE", "trade": "food", "business_kind": "Cafe",
  "whatsapp": "+971500000099", "why_now": "Busy all the time.", "case_study": "named", "checkin_consent": false, "consent_text": "I agree to the check-in."}') $$,
  '23514', null, 'the check-in consent is required');
select throws_ok($$ select pg_temp.app('+447700900001', 'barbers') $$, '23514', null, 'the trade is one of the four');
select is((public.founding_places() ->> 'left')::int, 25, '25 places left before a decision');

select tests.act_as('00000000-0000-4000-8000-0000000000b1');
select throws_ok($$ select public.staff_founding_overview() $$, '42501', null, 'a non-staff user cannot read the applications');
select throws_ok($$ select public.staff_founding_decide(pg_temp.fid('+971500000001'), 'accepted') $$, '42501', null, 'or decide');
reset role;

select tests.act_as('00000000-0000-4000-8000-0000000000a3');
select is((public.staff_founding_decide(pg_temp.fid('+971500000001'), 'accepted') ->> 'left')::int,
  24, 'staff accept: 24 places left');
reset role;
-- Five food places, then the sixth food applicant waits (the trade is full until 30 days after the first application).
select pg_temp.app('+97150000010' || n, 'food') from generate_series(1, 6) n;
select tests.act_as('00000000-0000-4000-8000-0000000000a3');
select public.staff_founding_decide(pg_temp.fid('+97150000010' || n), 'accepted') from generate_series(1, 5) n;
select throws_ok($$ select public.staff_founding_decide(pg_temp.fid('+971500000106'), 'accepted') $$,
  'P0001', 'trade_full', 'the sixth food place is refused');
select is((public.staff_founding_decide(pg_temp.fid('+971500000106'), 'waitlisted')
  -> 'by_trade' -> 'food' ->> 'taken')::int, 5, 'and can be waitlisted');
select is((public.staff_founding_overview() -> 'places' ->> 'left')::int, 19, 'the real count: 19 left');
reset role;
-- After 30 days an unused place goes to any trade.
update public.founding_applications set created_at = created_at - interval '31 days' where whatsapp = '+971500000001';
select tests.act_as('00000000-0000-4000-8000-0000000000a3');
select is((public.staff_founding_decide(pg_temp.fid('+971500000106'), 'accepted') ->> 'left')::int,
  18, 'after 30 days the sixth food applicant takes an open place');
reset role;

-- Linking: a running trial becomes 90 days from its start; the trial length reads the founding flag.
insert into public.subscriptions (organization_id, plan, state, provider, trial_started_at, trial_ends_at, grace_ends_at)
values (pg_temp.org('00000000-0000-4000-8000-0000000020c1'), 'pro', 'trialing', 'manual', now() - interval '61 days',
  now() - interval '47 days', now() - interval '40 days');
select tests.act_as('00000000-0000-4000-8000-0000000000a3');
select ok((public.staff_founding_link(pg_temp.fid('+971500000001'),
  '00000000-0000-4000-8000-0000000020c1') ->> 'linked')::boolean, 'staff link the place to the business');
select throws_ok($$ select public.staff_founding_decide(pg_temp.fid('+971500000001'), 'declined') $$,
  'P0001', 'linked', 'a linked place cannot be declined');
reset role;
select is(private.founding_days(pg_temp.org('00000000-0000-4000-8000-0000000020c1')), 90, 'the founding flag gives 90 days');
select ok((select trial_ends_at::date - trial_started_at::date from public.subscriptions
           where organization_id = pg_temp.org('00000000-0000-4000-8000-0000000020c1') and provider = 'manual') between 90 and 91,
  'the running trial now ends 90 days after it started');
select is(private.entitlements(pg_temp.org('00000000-0000-4000-8000-0000000020c1'), null) ->> 'state', 'trial', 'and the business is on Pro again');
select is(private.founding_days(pg_temp.org('00000000-0000-4000-8000-0000000020c2')), null, 'another business has no founding flag');
select is(jsonb_typeof(private.entitlements(pg_temp.org('00000000-0000-4000-8000-0000000020c1'), null) -> 'caps'), 'null', 'a founding business has no trial caps');

-- Day 60: one message queued, once.
select is(private.founding_tick(), 1, 'day 60 queues the message');
select is((select count(*)::int from public.jobs where kind = 'founding_message'), 1, 'one founding_message job');
select is(private.founding_tick(), 1, 'a second tick offers it again while it is pending');
select is((select count(*)::int from public.jobs where kind = 'founding_message'), 1, 'and the queue keeps one');
update public.founding_applications set day60_sent_at = now() where whatsapp = '+971500000001';
select is(private.founding_tick(), 0, 'nothing once the day-60 message is sent');
select tests.act_as('00000000-0000-4000-8000-0000000000a3');
select is((public.staff_founding_overview() -> 'kill_gate' ->> 'weekly_approvers')::int, 0, 'the kill gate counts weekly approvers');
reset role;

-- ─── Kabsi Partners ──────────────────────────────────────────────────────────────────────────────────────────────
select ok(public.partner_apply('{"name": "Sara K", "email": "sara@example.test", "kind": "creator", "terms_version": "2026-10-26"}') is not null, 'a partner applies');
select ok(public.partner_apply('{"name": "Self Partner", "email": "self-partner@example.test", "kind": "other", "terms_version": "2026-10-26"}') is not null, 'a second partner applies');
select throws_ok($$ select public.partner_apply('{"name": "Sara K", "email": "SARA@example.test", "kind": "creator", "terms_version": "2026-10-26"}') $$,
  'P0001', 'already_applied', 'one open application per email');
select tests.act_as('00000000-0000-4000-8000-0000000000a3');
select throws_ok($$ select public.staff_partner_decide(pg_temp.pid('sara@example.test'), 'approved', 'googlesara') $$,
  'P0001', 'bad_handle', 'a handle with a Google word is refused');
select is(public.staff_partner_decide(pg_temp.pid('sara@example.test'), 'approved', 'sara') ->> 'code', 'P-SARA', 'approval gives the code');
select is((public.staff_partner_decide(pg_temp.pid('self-partner@example.test'), 'approved', 'selfie')
  ->> 'founding_partner')::boolean, true, 'the first 20 are Founding Partners');
reset role;

-- The via code attributes the business once, with the 30-day trial.
update public.locations set via_code = 'SARA' where id = '00000000-0000-4000-8000-0000000020c2';
select is((select r.code from public.partner_referrals r where r.organization_id = pg_temp.org('00000000-0000-4000-8000-0000000020c2')), 'P-SARA', 'the via code makes the referral');
select is(private.partner_trial_days(pg_temp.org('00000000-0000-4000-8000-0000000020c2')), 30, 'and the 30-day trial when it starts');
update public.locations set via_code = 'P-SELFIE' where id = '00000000-0000-4000-8000-0000000020c2';
select is((select r.code from public.partner_referrals r where r.organization_id = pg_temp.org('00000000-0000-4000-8000-0000000020c2')), 'P-SARA', 'never changed after sign-up');
-- A partner referring their own business earns nothing.
update public.locations set via_code = 'P-SELFIE' where id = '00000000-0000-4000-8000-0000000020c3';
select is((select self_reason from public.partner_referrals r where r.organization_id = pg_temp.org('00000000-0000-4000-8000-0000000020c3')), 'owner_email', 'a self referral is marked');
select is(private.partner_trial_days(pg_temp.org('00000000-0000-4000-8000-0000000020c3')), null, 'and gets the 14-day trial, not 30');

-- The ledger: a live payment of Pro (39 US dollars before tax) makes a 9.75 line held 30 days.
create function pg_temp.event(p_key text, p_type text, p_org uuid, p_detail jsonb, p_at timestamptz, p_payment text default null) returns bigint
language plpgsql as $$
declare v_id bigint;
begin
  insert into public.billing_events (provider, event_key, event_type, event_created_at, mode, organization_id, provider_subscription_id,
    payment_id, amount, currency, payment_status, outcome, detail)
  values ('creem', p_key, p_type, p_at, 'live', p_org, 'sub_partner_1', p_payment, 3900, 'USD', p_type, 'queued', p_detail)
  returning id into v_id;
  update public.billing_events set processed_at = now() where id = v_id;
  return v_id;
end $$;
select pg_temp.event('evt_paid_1', 'subscription.paid', pg_temp.org('00000000-0000-4000-8000-0000000020c2'),
  '{"object": {"product": {"price": 3900}, "last_transaction": {"id": "tx_1", "amount": 3900, "amount_paid": 4719}}}', now() - interval '40 days', 'tx_1');
select is((select commission_cents from public.partner_commissions where payment_id = 'tx_1'), 975, '25 percent of the amount before tax');
select ok((select hold_until::date - earned_at::date from public.partner_commissions where payment_id = 'tx_1') = 30, 'held 30 days');
select pg_temp.event('evt_paid_self', 'subscription.paid', pg_temp.org('00000000-0000-4000-8000-0000000020c3'),
  '{"object": {"product": {"price": 3900}}}', now(), 'tx_self');
select is((select count(*)::int from public.partner_commissions where payment_id = 'tx_self'), 0, 'a self referral earns nothing');

-- A refund inside the hold cancels the line.
select pg_temp.event('evt_paid_2', 'subscription.paid', pg_temp.org('00000000-0000-4000-8000-0000000020c2'),
  '{"object": {"last_transaction": {"id": "tx_2", "amount": 3900, "amount_paid": 4719}}}', now() - interval '5 days', 'tx_2');
select pg_temp.event('evt_refund_2', 'refund.created', pg_temp.org('00000000-0000-4000-8000-0000000020c2'),
  '{"object": {"refund_amount": 4719, "transaction": {"id": "tx_2", "amount": 3900, "amount_paid": 4719}}}', now() - interval '4 days');
select is((select state from public.partner_commissions where payment_id = 'tx_2' and kind = 'commission'), 'void', 'a refund inside the hold cancels the line');

-- The payout run: 9.75 is below 25 US dollars, so it rolls over.
select is((private.partner_payout_run(current_date) ->> 'payouts')::int, 0, 'below 25 US dollars nothing is paid');
select is((select state from public.partner_commissions where payment_id = 'tx_1'), 'cleared', 'the line cleared and rolls over');
-- Two more cleared payments make 29.25: one payout, with a statement that never names the business.
select pg_temp.event('evt_paid_3', 'subscription.paid', pg_temp.org('00000000-0000-4000-8000-0000000020c2'),
  '{"object": {"last_transaction": {"id": "tx_3", "amount": 3900}}}', now() - interval '35 days', 'tx_3');
select pg_temp.event('evt_paid_4', 'subscription.paid', pg_temp.org('00000000-0000-4000-8000-0000000020c2'),
  '{"object": {"last_transaction": {"id": "tx_4", "amount": 3900}}}', now() - interval '31 days', 'tx_4');
select is((private.partner_payout_run(current_date) ->> 'payouts')::int, 1, 'at 25 US dollars or more a payout is made');
select is((select amount_cents from public.partner_payouts), 2925, 'for 29.25');
select ok((select statement::text from public.partner_payouts) not like '%Referred Barber%', 'the statement never names the business');
select tests.act_as('00000000-0000-4000-8000-0000000000a3');
select is(public.staff_payouts_approve(current_date), 1, 'staff approve the month');
select throws_ok($$ select public.staff_payout_sent(pg_temp.payout(), 'tx-hash-1') $$, 'P0001', 'no_method', 'no payout without details');
select is(public.staff_partner_payout_details(pg_temp.pid('sara@example.test'), 'usdt', 'TXYZ1234abcd') ->> 'last4', 'abcd', 'details go to Vault, the last 4 shown');
select ok((public.staff_payout_sent(pg_temp.payout(), 'tx-hash-1') ->> 'sent')::boolean, 'marked sent');
reset role;
select is((select count(*)::int from public.partner_commissions where payout_id is not null and state = 'paid'), 3, 'its lines are paid');
select is((select payout_last4 from public.partner_accounts where code = 'P-SARA'), 'abcd', 'only the last 4 are on the partner row');

-- A refund after the payout comes off the next payout.
select pg_temp.event('evt_refund_3', 'refund.created', pg_temp.org('00000000-0000-4000-8000-0000000020c2'),
  '{"object": {"refund_amount": 3900, "transaction": {"id": "tx_3", "amount": 3900, "amount_paid": 3900}}}', now());
select is((select commission_cents from public.partner_commissions where kind = 'reversal'), -975, 'a reversal line');
select is((select state from public.partner_commissions where kind = 'reversal'), 'cleared', 'taken from the next payout');

-- A partial refund inside the hold, then a full chargeback: the line nets to zero, never below.
select pg_temp.event('evt_paid_5', 'subscription.paid', pg_temp.org('00000000-0000-4000-8000-0000000020c2'),
  '{"object": {"last_transaction": {"id": "tx_5", "amount": 3900, "amount_paid": 3900}}}', now() - interval '2 days', 'tx_5');
select pg_temp.event('evt_refund_5', 'refund.created', pg_temp.org('00000000-0000-4000-8000-0000000020c2'),
  '{"object": {"refund_amount": 1950, "transaction": {"id": "tx_5", "amount": 3900, "amount_paid": 3900}}}', now() - interval '1 day');
select pg_temp.event('evt_dispute_5', 'dispute.created', pg_temp.org('00000000-0000-4000-8000-0000000020c2'),
  '{"object": {"amount": 3900, "transaction": {"id": "tx_5", "amount": 3900, "amount_paid": 3900}}}', now());
select is((select sum(commission_cents)::int from public.partner_commissions where payment_id = 'tx_5' and state <> 'void'), 0,
  'a partial refund and a later chargeback take back the line once');
select throws_ok($$ select private.partner_payout_run(current_date + 31) $$, 'P0001', 'future_date', 'the run never clears lines ahead of time');

select * from finish();
rollback;
