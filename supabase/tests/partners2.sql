-- Partners 2 (master plan 30.50 items 4 to 7, 30.51 item 6): partners join at once with a code; a partner reads only
-- their own rows and columns; browsers run none of the new functions; every new definer function has an empty
-- search_path; attribution end to end in Creem test mode (visit, sign-up, 30-day trial, test payment, one 25 percent line
-- held 30 days, a refund cancels it); self referral by account, email, phone or Google place earns nothing; the last link
-- before sign-up wins and never changes; lines only when card payments are open; the payout method only after 50 US
-- dollars and only after a fresh confirm (WhatsApp tap from the partner's own number, or the email code); the first payout
-- waits for one staff tap and the first 20 reviewed are Founding Partners; the owner's link gives one free month per
-- referred business that pays, and a business never carries both an owner reward and a partner commission.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

\ir _fixtures.psql

update public.app_settings set value = 'off' where key = 'billing_open';

insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
select '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email, now(), '{}', '{}', now(), now()
from (values ('00000000-0000-4000-8000-0000000030a1'::uuid, 'pa@example.test'),
             ('00000000-0000-4000-8000-0000000030a2'::uuid, 'pb@example.test'),
             ('00000000-0000-4000-8000-0000000030a3'::uuid, 'r1@example.test'),
             ('00000000-0000-4000-8000-0000000030a4'::uuid, 'referrer@example.test'),
             ('00000000-0000-4000-8000-0000000030a5'::uuid, 'r2@example.test'),
             ('00000000-0000-4000-8000-0000000030a6'::uuid, 'r3@example.test'),
             ('00000000-0000-4000-8000-0000000030a8'::uuid, 'phone-owner@example.test'),
             ('00000000-0000-4000-8000-0000000030a9'::uuid, 'email-owner@example.test')) as u(id, email);
insert into public.whatsapp_optins (user_id, phone, state, consent_text, verified_at)
values ('00000000-0000-4000-8000-0000000030a1', '+971500000301', 'active', 'test consent', now()),
       ('00000000-0000-4000-8000-0000000030a8', '+971500000308', 'active', 'test consent', now()),
       ('00000000-0000-4000-8000-0000000030a4', '+971500000304', 'active', 'test consent', now());
insert into public.phone_roles (phone, role, user_id, source) values ('+971500000399', 'staff_admin', '00000000-0000-4000-8000-0000000000a3', 'staff_code');

create function pg_temp.biz(p_id uuid, p_user uuid, p_name text, p_place text) returns uuid language plpgsql as $$
begin
  insert into public.locations (id, name, place_id, created_by, time_zone, signup_source, category_label, area)
  values (p_id, p_name, p_place, p_user, 'UTC', 'self', 'Hair salon', 'Dubai Marina');
  insert into public.location_members (location_id, user_id, role) values (p_id, p_user, 'owner');
  return (select organization_id from public.locations where id = p_id);
end $$;
create function pg_temp.org(p uuid) returns uuid language sql as $$ select organization_id from public.locations where id = p $$;
create function pg_temp.pid(p_user uuid) returns uuid language sql security definer as $$ select id from public.partner_accounts where user_id = p_user $$;
create function pg_temp.code(p_user uuid) returns text language sql security definer as $$ select code from public.partner_accounts where user_id = p_user $$;
create function pg_temp.event(p_key text, p_type text, p_org uuid, p_detail jsonb, p_at timestamptz, p_payment text, p_mode text) returns bigint
language plpgsql as $$
declare v_id bigint;
begin
  insert into public.billing_events (provider, event_key, event_type, event_created_at, mode, organization_id, provider_subscription_id,
    payment_id, amount, currency, payment_status, outcome, detail)
  values ('creem', p_key, p_type, p_at, p_mode, p_org, 'sub_' || p_key, p_payment, 3900, 'USD', p_type, 'queued', p_detail)
  returning id into v_id;
  update public.billing_events set processed_at = now() where id = v_id;
  return v_id;
end $$;
create function pg_temp.join(p_user uuid, p_email text, p_kind text, p_country text, p_permit text default null) returns jsonb language sql as $$
  select public.partner_join(p_user, jsonb_build_object('name', 'Partner ' || p_email, 'email', p_email, 'kind', p_kind, 'country', p_country,
    'reach', 'My clients who buy review cards', 'uae_permit', p_permit, 'terms_version', '2026-11-10.2')) $$;

-- ─── access rules ─────────────────────────────────────────────────────────────────────────────────────────────────
select ok(not has_function_privilege(r, f, 'execute'), r || ' cannot run ' || f)
from unnest(array['anon', 'authenticated']) r,
     unnest(array['public.partner_join(uuid,jsonb)', 'public.partner_contact(uuid)', 'public.partner_home(uuid)', 'public.partner_visit(text)',
       'public.partner_payout_request(uuid,text,text,text,text)', 'public.partner_payout_confirm_whatsapp(uuid,text)',
       'public.partner_payout_confirm_code(uuid,uuid,text)', 'public.partner_first_payouts(text)',
       'public.partner_first_payout_review(uuid,text)', 'public.owner_referral_link(uuid,text)']) f;
select is((select coalesce(array_agg(p.oid::regprocedure::text order by 1), '{}') from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname in ('public', 'private') and p.prosecdef
              and p.proname in ('partner_join', 'partner_contact', 'partner_home', 'partner_visit', 'partner_payout_request',
                'partner_payout_confirm_whatsapp', 'partner_payout_confirm_code', 'partner_first_payouts', 'partner_first_payout_review',
                'owner_referral_link', 'card_payments_open', 'partner_payout_end', 'partner_payout_apply', 'owner_self_referral',
                'owner_referral_event', 'partner_self_reason', 'partner_attribute', 'partner_ledger_event', 'staff_payouts_approve',
                'staff_partner_decide', 'programs_daily')
              and not coalesce('search_path=""' = any (p.proconfig), false)), '{}'::text[],
  'every definer function of Partners 2 has an empty search_path');
select ok(not has_table_privilege('authenticated', t, 'insert') and not has_table_privilege('authenticated', t, 'update')
  and not has_table_privilege('authenticated', t, 'delete') and not has_table_privilege('anon', t, 'select'), t || ': browsers write nothing')
from unnest(array['public.partner_accounts', 'public.partner_referrals', 'public.partner_commissions', 'public.partner_payouts',
  'public.partner_visits', 'public.partner_payout_changes', 'public.owner_referral_codes', 'public.owner_referrals', 'public.owner_referral_rewards']) t;
select ok(not has_table_privilege('authenticated', t, 'select') and not has_any_column_privilege('authenticated', t, 'select'), t || ' is closed to browsers')
from unnest(array['public.partner_payout_changes', 'public.owner_referral_codes', 'public.owner_referrals', 'public.owner_referral_rewards']) t;

-- ─── join: at once, with a code ───────────────────────────────────────────────────────────────────────────────────
select throws_ok($$ select pg_temp.join('00000000-0000-4000-8000-0000000030a1', 'pa@example.test', 'card_seller', 'AE') $$,
  'P0001', 'uae_permit', 'a UAE partner gives a permit number or "only privately"');
select is(pg_temp.join('00000000-0000-4000-8000-0000000030a1', 'pa@example.test', 'card_seller', 'AE', 'private') ->> 'result', 'joined', 'a partner joins at once');
select ok(pg_temp.code('00000000-0000-4000-8000-0000000030a1') ~ '^P-[23456789A-HJKMNP-Z]{6}$', 'with a code of 6 card letters');
select is((select status || ':' || phone || ':' || uae_permit from public.partner_accounts where user_id = '00000000-0000-4000-8000-0000000030a1'),
  'approved:+971500000301:private', 'active at once, with the WhatsApp number the account confirmed');
select is(pg_temp.join('00000000-0000-4000-8000-0000000030a1', 'pa@example.test', 'card_seller', 'AE', 'private') ->> 'result', 'exists', 'one partner account per Kabsi account');
select is(pg_temp.join('00000000-0000-4000-8000-0000000030a2', 'pb@example.test', 'agency', 'GB') ->> 'result', 'joined', 'a second partner joins');
select throws_ok($$ select pg_temp.join('00000000-0000-4000-8000-0000000030a3', 'PA@example.test', 'creator', 'GB') $$,
  'P0001', 'email_taken', 'one open partner account per email');
select throws_ok($$ select pg_temp.join('00000000-0000-4000-8000-0000000030a3', 'x@example.test', 'reviewer', 'GB') $$,
  '23514', null, 'only the six kinds of 30.50 item 5');
select is((select reviewed_at from public.partner_accounts where user_id = '00000000-0000-4000-8000-0000000030a1'), null, 'not reviewed until the first payout');

-- ─── a visit, a sign-up and the 30-day trial ──────────────────────────────────────────────────────────────────────
select ok(public.partner_visit(pg_temp.code('00000000-0000-4000-8000-0000000030a1')), 'a visit through the link counts');
select ok(not public.partner_visit('P-NOPE22'), 'an unknown code counts nothing');
select pg_temp.biz('00000000-0000-4000-8000-0000000030c3', '00000000-0000-4000-8000-0000000030a3', 'Referred Salon', 'p2-place-3');
-- Last link wins: the browser keeps only the last via code (60-day cookie); a WhatsApp code sent earlier loses to it.
insert into public.whatsapp_optins (user_id, phone, state, consent_text, verified_at)
values ('00000000-0000-4000-8000-0000000030a3', '+971500000303', 'active', 'test consent', now());
insert into public.whatsapp_conversations (phone, partner_code, partner_code_at)
values ('+971500000303', pg_temp.code('00000000-0000-4000-8000-0000000030a2'), now() - interval '2 days')
on conflict (phone) do update set partner_code = excluded.partner_code, partner_code_at = excluded.partner_code_at;
insert into public.signup_attribution (user_id, via_code, via_at) values ('00000000-0000-4000-8000-0000000030a3', pg_temp.code('00000000-0000-4000-8000-0000000030a1'), now() - interval '1 day')
on conflict (user_id) do update set via_code = excluded.via_code, via_at = excluded.via_at;
update public.locations set via_code = pg_temp.code('00000000-0000-4000-8000-0000000030a1') where id = '00000000-0000-4000-8000-0000000030c3';
select is((select partner_id from public.partner_referrals where organization_id = pg_temp.org('00000000-0000-4000-8000-0000000030c3')),
  pg_temp.pid('00000000-0000-4000-8000-0000000030a1'), 'the last link before sign-up wins over an earlier WhatsApp code');
update public.locations set via_code = pg_temp.code('00000000-0000-4000-8000-0000000030a2') where id = '00000000-0000-4000-8000-0000000030c3';
select private.partner_attribute('00000000-0000-4000-8000-0000000030c3');
select is((select partner_id from public.partner_referrals where organization_id = pg_temp.org('00000000-0000-4000-8000-0000000030c3')),
  pg_temp.pid('00000000-0000-4000-8000-0000000030a1'), 'and never changes after sign-up');
select is(private.partner_trial_days(pg_temp.org('00000000-0000-4000-8000-0000000030c3')), 30, 'the business gets the 30-day Pro trial');

-- ─── payments: only when card payments are open; Creem test mode end to end ───────────────────────────────────────
select pg_temp.event('p2_test_1', 'subscription.paid', pg_temp.org('00000000-0000-4000-8000-0000000030c3'),
  '{"object": {"last_transaction": {"id": "p2_tx_t1", "amount": 3900, "amount_paid": 3900}}}', now(), 'p2_tx_t1', 'test');
select is((select count(*)::int from public.partner_commissions where payment_id = 'p2_tx_t1'), 0, 'no line while card payments are closed');
update public.organizations set billing_test = true where id = pg_temp.org('00000000-0000-4000-8000-0000000030c3');
select pg_temp.event('p2_test_2', 'subscription.paid', pg_temp.org('00000000-0000-4000-8000-0000000030c3'),
  '{"object": {"last_transaction": {"id": "p2_tx_t2", "amount": 3900, "amount_paid": 3900}}}', now(), 'p2_tx_t2', 'test');
select is((select commission_cents || ':' || mode || ':' || state || ':' || (hold_until::date - earned_at::date)
             from public.partner_commissions where payment_id = 'p2_tx_t2'), '975:test:held:30',
  'Creem test mode, a Kabsi test account: one line at 25 percent, held 30 days');
select pg_temp.event('p2_test_live', 'subscription.paid', pg_temp.org('00000000-0000-4000-8000-0000000030c3'),
  '{"object": {"last_transaction": {"id": "p2_tx_l0", "amount": 3900, "amount_paid": 3900}}}', now(), 'p2_tx_l0', 'live');
select is((select count(*)::int from public.partner_commissions where payment_id = 'p2_tx_l0'), 0, 'a live payment waits for card payments to open');
select pg_temp.event('p2_test_refund', 'refund.created', pg_temp.org('00000000-0000-4000-8000-0000000030c3'),
  '{"object": {"refund_amount": 3900, "transaction": {"id": "p2_tx_t2", "amount": 3900, "amount_paid": 3900}}}', now(), null, 'test');
select is((select state from public.partner_commissions where payment_id = 'p2_tx_t2'), 'void', 'a refund inside the hold cancels the line');
update public.app_settings set value = 'on' where key = 'billing_open';
select pg_temp.event('p2_live_1', 'subscription.paid', pg_temp.org('00000000-0000-4000-8000-0000000030c3'),
  '{"object": {"last_transaction": {"id": "p2_tx_l1", "amount": 3900, "amount_paid": 3900}}}', now() - interval '45 days', 'p2_tx_l1', 'live');
select is((select commission_cents from public.partner_commissions where payment_id = 'p2_tx_l1'), 975, 'once card payments open, a live payment makes its line');

-- ─── self referral earns nothing: the same account, email, phone or Google place ─────────────────────────────────
select pg_temp.biz('00000000-0000-4000-8000-0000000030c2', '00000000-0000-4000-8000-0000000030a2', 'Partner Own Shop', 'p2-place-2');
update public.locations set via_code = pg_temp.code('00000000-0000-4000-8000-0000000030a2') where id = '00000000-0000-4000-8000-0000000030c2';
select is((select self_reason from public.partner_referrals where organization_id = pg_temp.org('00000000-0000-4000-8000-0000000030c2')),
  'owner_account', 'the partner''s own account owns the business');
select ok(public.partner_apply('{"name": "Phone Partner", "email": "phone-partner@example.test", "phone": "+971500000308", "kind": "agency", "terms_version": "2026-11-10.2"}') is not null, 'a partner with a typed number');
select ok(public.partner_apply('{"name": "Email Partner", "email": "email-owner@example.test", "kind": "creator", "terms_version": "2026-11-10.2"}') is not null, 'a partner with a typed email');
update public.partner_accounts set status = 'approved', code = 'P-PHONE2' where email = 'phone-partner@example.test';
update public.partner_accounts set status = 'approved', code = 'P-EMAIL2' where email = 'email-owner@example.test';
select pg_temp.biz('00000000-0000-4000-8000-0000000030c8', '00000000-0000-4000-8000-0000000030a8', 'Phone Owner Cafe', 'p2-place-8');
update public.locations set via_code = 'P-PHONE2' where id = '00000000-0000-4000-8000-0000000030c8';
select is((select self_reason from public.partner_referrals where organization_id = pg_temp.org('00000000-0000-4000-8000-0000000030c8')), 'owner_phone', 'the same WhatsApp number');
select pg_temp.biz('00000000-0000-4000-8000-0000000030c9', '00000000-0000-4000-8000-0000000030a9', 'Email Owner Gym', 'p2-place-9');
update public.locations set via_code = 'P-EMAIL2' where id = '00000000-0000-4000-8000-0000000030c9';
select is((select self_reason from public.partner_referrals where organization_id = pg_temp.org('00000000-0000-4000-8000-0000000030c9')), 'owner_email', 'the same email');
select pg_temp.biz('00000000-0000-4000-8000-0000000030c6', '00000000-0000-4000-8000-0000000030a6', 'Place Garage', 'p2-place-own');
update public.partner_accounts set own_place_id = 'p2-place-own' where user_id = '00000000-0000-4000-8000-0000000030a1';
update public.locations set via_code = pg_temp.code('00000000-0000-4000-8000-0000000030a1') where id = '00000000-0000-4000-8000-0000000030c6';
select is((select self_reason from public.partner_referrals where organization_id = pg_temp.org('00000000-0000-4000-8000-0000000030c6')), 'google_place', 'the same Google place');
select pg_temp.event('p2_self_' || n, 'subscription.paid', pg_temp.org(l), '{"object": {"last_transaction": {"amount": 3900}}}', now(), 'p2_self_' || n, 'live')
from (values (1, '00000000-0000-4000-8000-0000000030c2'::uuid), (2, '00000000-0000-4000-8000-0000000030c8'::uuid),
             (3, '00000000-0000-4000-8000-0000000030c9'::uuid), (4, '00000000-0000-4000-8000-0000000030c6'::uuid)) v(n, l);
select is((select count(*)::int from public.partner_commissions where payment_id like 'p2_self_%'), 0, 'and every self referral earns nothing');

-- ─── a partner reads only their own rows and columns ──────────────────────────────────────────────────────────────
select tests.act_as('00000000-0000-4000-8000-0000000030a1');
select is((select array_agg(email) from public.partner_accounts), array['pa@example.test'], 'a partner sees only their own account');
select ok((select bool_and(partner_id = (select id from public.partner_accounts)) from public.partner_commissions), 'and only their own lines');
select ok((select count(*) from public.partner_referrals) >= 1, 'and their own referrals');
select throws_ok($$ select organization_id from public.partner_referrals $$, '42501', null, 'never the business behind a referral');
select throws_ok($$ select payment_id from public.partner_commissions $$, '42501', null, 'never a payment id');
select throws_ok($$ select payout_secret_id from public.partner_accounts $$, '42501', null, 'never the Vault id');
select throws_ok($$ update public.partner_accounts set payout_last4 = 'abcd' $$, '42501', null, 'and writes nothing');
reset role;
select tests.act_as('00000000-0000-4000-8000-0000000030a2');
select is((select count(*)::int from public.partner_commissions where partner_id = pg_temp.pid('00000000-0000-4000-8000-0000000030a1')), 0, 'another partner sees none of them');
select is((select count(*)::int from public.partner_visits where partner_id = pg_temp.pid('00000000-0000-4000-8000-0000000030a1')), 0, 'nor their visits');
reset role;
select tests.act_as('00000000-0000-4000-8000-0000000030a3');
select is((select count(*)::int from public.partner_accounts), 0, 'a referred owner sees no partner row');
reset role;

-- ─── the partner home ─────────────────────────────────────────────────────────────────────────────────────────────
select is((public.partner_home('00000000-0000-4000-8000-0000000030a1') -> 'numbers' ->> 'visits')::int, 1, 'home: visits');
select is((public.partner_home('00000000-0000-4000-8000-0000000030a1') -> 'numbers' ->> 'pending_cents')::int, 975, 'home: pending (live, held)');
select ok(public.partner_home('00000000-0000-4000-8000-0000000030a1')::text not like '%Referred Salon%', 'home: never the business name');
select is(public.partner_home('00000000-0000-4000-8000-0000000030a1') -> 'businesses' -> 0 ->> 'trade', 'Hair salon', 'home: the trade and area only');
select is((public.partner_home('00000000-0000-4000-8000-0000000030a1') ->> 'payout_ask')::boolean, false, 'the payout method is not asked before 50 US dollars');
select is(public.partner_payout_request('00000000-0000-4000-8000-0000000030a1', 'paypal', 'pa@example.test', 'whatsapp') ->> 'result', 'not_yet', 'and cannot be set before');

-- ─── 50 US dollars cleared, then the payout method behind a fresh confirm ─────────────────────────────────────────
select pg_temp.event('p2_m_' || n, 'subscription.paid', pg_temp.org('00000000-0000-4000-8000-0000000030c3'),
  jsonb_build_object('object', jsonb_build_object('last_transaction', jsonb_build_object('id', 'p2_tx_m' || n, 'amount', 5900))),
  now() - interval '40 days', 'p2_tx_m' || n, 'live')
from generate_series(1, 3) n;
select private.partner_payout_run(current_date);
select ok((public.partner_home('00000000-0000-4000-8000-0000000030a1') ->> 'payout_ask')::boolean, 'asked once 50 US dollars has cleared');
create temp table ask as select public.partner_payout_request('00000000-0000-4000-8000-0000000030a1', 'paypal', 'pa.pay@example.test', 'whatsapp') r;
select is((select r ->> 'result' || ':' || (r ->> 'phone') || ':' || (r ->> 'last4') from ask), 'asked:+971500000301:test', 'a WhatsApp confirm is asked of the partner''s own number');
select is((select payout_method from public.partner_accounts where user_id = '00000000-0000-4000-8000-0000000030a1'), null, 'nothing changes before the tap');
select is(public.partner_payout_confirm_whatsapp((select (r ->> 'id')::uuid from ask), '+971500000304') ->> 'result', 'unknown', 'a tap from another number is refused');
select is(public.partner_payout_confirm_whatsapp((select (r ->> 'id')::uuid from ask), '+971500000301') ->> 'result', 'confirmed', '"Yes, it''s me" from the partner''s number');
select is((select payout_method || ':' || payout_last4 from public.partner_accounts where user_id = '00000000-0000-4000-8000-0000000030a1'), 'paypal:test', 'the method is saved, the last 4 shown');
select ok((select s.decrypted_secret from vault.decrypted_secrets s join public.partner_accounts p on p.payout_secret_id = s.id
            where p.user_id = '00000000-0000-4000-8000-0000000030a1') = 'pa.pay@example.test', 'the detail lives in Vault');
select is(public.partner_payout_confirm_whatsapp((select (r ->> 'id')::uuid from ask), '+971500000301') ->> 'result', 'unknown', 'a tap works once');
-- With no WhatsApp on the account: a code by email.
update public.partner_accounts set payout_method = 'usdt', payout_last4 = 'zzzz' where user_id = '00000000-0000-4000-8000-0000000030a2';
select throws_ok($$ select public.partner_payout_request('00000000-0000-4000-8000-0000000030a2', 'usdc', 'TXabcdef123456', 'whatsapp') $$,
  'P0001', 'no_whatsapp', 'no WhatsApp on the account: no WhatsApp confirm');
create temp table ask2 as select public.partner_payout_request('00000000-0000-4000-8000-0000000030a2', 'usdc', 'TXabcdef123456', 'email',
  encode(extensions.digest('482913', 'sha256'), 'hex')) r;
select is((select r ->> 'result' || ':' || (r ->> 'channel') from ask2), 'asked:email', 'an email code instead');
select is(public.partner_payout_confirm_code('00000000-0000-4000-8000-0000000030a1', (select (r ->> 'id')::uuid from ask2),
  encode(extensions.digest('482913', 'sha256'), 'hex')) ->> 'result', 'ended', 'another partner cannot use the code');
select is(public.partner_payout_confirm_code('00000000-0000-4000-8000-0000000030a2', (select (r ->> 'id')::uuid from ask2),
  encode(extensions.digest('000000', 'sha256'), 'hex')) ->> 'result', 'wrong_code', 'a wrong code is refused');
select is((select payout_last4 from public.partner_accounts where user_id = '00000000-0000-4000-8000-0000000030a2'), 'zzzz', 'nothing changes before the right code');
select is(public.partner_payout_confirm_code('00000000-0000-4000-8000-0000000030a2', (select (r ->> 'id')::uuid from ask2),
  encode(extensions.digest('482913', 'sha256'), 'hex')) ->> 'result', 'confirmed', 'the right code changes the method');
select is((select payout_method || ':' || payout_last4 from public.partner_accounts where user_id = '00000000-0000-4000-8000-0000000030a2'), 'usdc:3456', 'the new method, last 4');

-- ─── review at the money ──────────────────────────────────────────────────────────────────────────────────────────
select is((select state from public.partner_payouts where partner_id = pg_temp.pid('00000000-0000-4000-8000-0000000030a1')), 'proposed', 'the first payout is proposed');
select tests.act_as('00000000-0000-4000-8000-0000000000a3');
select is(public.staff_payouts_approve(current_date), 0, 'the month''s approval skips a partner never reviewed');
reset role;
select is(public.partner_first_payouts('+971500000301'), null, 'only the staff phone sees the first payouts');
select is(jsonb_array_length(public.partner_first_payouts('+971500000399')), 1, 'the staff phone sees one first payout');
select is(public.partner_first_payout_review((select id from public.partner_payouts limit 1), '+971500000301') ->> 'result', 'forbidden', 'a partner cannot approve it');
select is(public.partner_first_payout_review((select id from public.partner_payouts limit 1), '+971500000399') ->> 'result', 'approved', 'one staff tap approves it');
select is((select state from public.partner_payouts limit 1), 'approved', 'the payout is approved');
select ok((select reviewed_at is not null and founding_partner from public.partner_accounts where user_id = '00000000-0000-4000-8000-0000000030a1'),
  'the partner is reviewed and is a Founding Partner');
select is(public.partner_first_payout_review((select id from public.partner_payouts limit 1), '+971500000399') ->> 'result', 'unknown', 'a second tap does nothing');
-- The first 20 reviewed are Founding Partners: the 21st is not.
insert into public.partner_accounts (name, email, kind, terms_version, terms_accepted_at, status, founding_partner, reviewed_at)
select 'Founding ' || n, 'founding' || n || '@example.test', 'creator', '2026-11-10.2', now(), 'approved', true, now() from generate_series(1, 19) n;
insert into public.partner_payouts (partner_id, run_on, amount_cents, lines, statement)
values (pg_temp.pid('00000000-0000-4000-8000-0000000030a2'), current_date, 5000, 1, '{}');
select is((select count(*)::int from public.partner_accounts where founding_partner), 20, 'twenty Founding Partners');
select is((public.partner_first_payout_review((select id from public.partner_payouts where partner_id = pg_temp.pid('00000000-0000-4000-8000-0000000030a2')), '+971500000399')
  ->> 'founding_partner')::boolean, false, 'the 21st reviewed partner is not a Founding Partner');

-- ─── the owner's link: one free month per referred business that pays; never with a partner commission ─────────────
select pg_temp.biz('00000000-0000-4000-8000-0000000030c4', '00000000-0000-4000-8000-0000000030a4', 'Referrer Bakery', 'p2-place-4');
select is(public.owner_referral_link('00000000-0000-4000-8000-0000000030c4', '+971500000399') ->> 'result', 'none', 'only an owner''s phone gets the link');
create temp table olink as select public.owner_referral_link('00000000-0000-4000-8000-0000000030c4', '+971500000304') r;
select ok((select r ->> 'result' = 'owner' and r ->> 'code' ~ '^R-[23456789A-HJKMNP-Z]{6}$' from olink), 'an owner gets an R- link');
select is(public.owner_referral_link('00000000-0000-4000-8000-0000000030c4', '+971500000304') ->> 'code', (select r ->> 'code' from olink), 'the same link every time');
select pg_temp.biz('00000000-0000-4000-8000-0000000030c5', '00000000-0000-4000-8000-0000000030a5', 'Friend Barber', 'p2-place-5');
update public.locations set via_code = (select r ->> 'code' from olink) where id = '00000000-0000-4000-8000-0000000030c5';
select is((select referrer_org from public.owner_referrals where organization_id = pg_temp.org('00000000-0000-4000-8000-0000000030c5')),
  pg_temp.org('00000000-0000-4000-8000-0000000030c4'), 'the owner''s link is saved on the new business');
-- A partner link later never adds a second source.
update public.locations set via_code = pg_temp.code('00000000-0000-4000-8000-0000000030a1') where id = '00000000-0000-4000-8000-0000000030c5';
select is((select count(*)::int from public.partner_referrals where organization_id = pg_temp.org('00000000-0000-4000-8000-0000000030c5')), 0, 'no partner referral on top');
select pg_temp.event('p2_owner_1', 'subscription.paid', pg_temp.org('00000000-0000-4000-8000-0000000030c5'), '{"object": {"last_transaction": {"id": "p2_tx_o1", "amount": 1900}}}', now(), 'p2_tx_o1', 'live');
select pg_temp.event('p2_owner_2', 'subscription.paid', pg_temp.org('00000000-0000-4000-8000-0000000030c5'), '{"object": {"last_transaction": {"id": "p2_tx_o2", "amount": 1900}}}', now(), 'p2_tx_o2', 'live');
select is((select count(*)::int from public.owner_referral_rewards where organization_id = pg_temp.org('00000000-0000-4000-8000-0000000030c5')), 1, 'one free month per referred business that pays');
select is((select count(*)::int from public.partner_commissions where organization_id = pg_temp.org('00000000-0000-4000-8000-0000000030c5')), 0, 'and no partner commission for it');
-- A business with a partner referral never gets an owner reward.
select is((select count(*)::int from public.owner_referral_rewards where organization_id = pg_temp.org('00000000-0000-4000-8000-0000000030c3')), 0, 'a partner business carries no owner reward');
-- An owner who is a partner: "my link" is the partner link (25 percent instead).
select pg_temp.biz('00000000-0000-4000-8000-0000000030ca', '00000000-0000-4000-8000-0000000030a1', 'Partner Owned Spa', 'p2-place-a');
select is(public.owner_referral_link('00000000-0000-4000-8000-0000000030ca', '+971500000301') ->> 'result', 'partner', 'a partner who owns a business shares the partner link');

-- Review findings (independent review, 10 Nov 2026).
-- A first payout with no payout method on file is not approved by the tap.
insert into public.partner_payouts (partner_id, run_on, amount_cents, lines, statement)
select id, current_date, 3000, 1, '{}' from public.partner_accounts where code = 'P-PHONE2';
select is(public.partner_first_payout_review((select o.id from public.partner_payouts o join public.partner_accounts p on p.id = o.partner_id where p.code = 'P-PHONE2'), '+971500000399') ->> 'result',
  'no_method', 'no tap approves a payout with nowhere to go');
select ok((public.partner_home('00000000-0000-4000-8000-0000000030a2') ->> 'payout_ask')::boolean, 'a payout on the way asks for the method');
-- Re-approving a joined partner on the staff page is not their review (the review is the WhatsApp tap).
insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-0000000030ab', 'authenticated', 'authenticated', 'pc@example.test', now(), '{}', '{}', now(), now());
select pg_temp.join('00000000-0000-4000-8000-0000000030ab', 'pc@example.test', 'creator', 'US');
select tests.act_as('00000000-0000-4000-8000-0000000000a3');
select public.staff_partner_decide(pg_temp.pid('00000000-0000-4000-8000-0000000030ab'), 'approved');
reset role;
select is((select reviewed_at from public.partner_accounts where user_id = '00000000-0000-4000-8000-0000000030ab'), null, 'staff re-approval does not review a joined partner');
-- The last link before sign-up wins between an owner's link and a partner's WhatsApp code, too.
insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-0000000030ac', 'authenticated', 'authenticated', 'r4@example.test', now(), '{}', '{}', now(), now());
insert into public.whatsapp_optins (user_id, phone, state, consent_text, verified_at)
values ('00000000-0000-4000-8000-0000000030ac', '+971500000312', 'active', 'test consent', now());
select pg_temp.biz('00000000-0000-4000-8000-0000000030cc', '00000000-0000-4000-8000-0000000030ac', 'Later Code Nails', 'p2-place-c');
insert into public.whatsapp_conversations (phone, partner_code, partner_code_at)
values ('+971500000312', pg_temp.code('00000000-0000-4000-8000-0000000030a2'), now() - interval '1 day');
insert into public.signup_attribution (user_id, via_code, via_at) values ('00000000-0000-4000-8000-0000000030ac', (select r ->> 'code' from olink), now() - interval '5 days');
update public.locations set via_code = (select r ->> 'code' from olink) where id = '00000000-0000-4000-8000-0000000030cc';
select is((select partner_id from public.partner_referrals where organization_id = pg_temp.org('00000000-0000-4000-8000-0000000030cc')),
  pg_temp.pid('00000000-0000-4000-8000-0000000030a2'), 'a partner code after an owner''s link wins');
select is((select count(*)::int from public.owner_referrals where organization_id = pg_temp.org('00000000-0000-4000-8000-0000000030cc')), 0, 'and no owner referral is saved');
-- A test payment never uses up the owner's one free month.
select is((select count(*)::int from public.owner_referral_rewards where mode <> 'live'), 0, 'owner rewards are live payments only');

select * from finish();
rollback;
