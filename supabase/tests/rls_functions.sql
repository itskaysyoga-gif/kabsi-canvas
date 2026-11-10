-- P0.1-07: every SECURITY DEFINER function in public that authenticated can execute refuses a non-member (K-42, G-17).
-- One test per function, run as a signed-in stranger against the victim's business and rows. The coverage
-- test reads pg_proc, so a new browser-callable function fails the suite until it has a line here.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

\ir _fixtures.psql

-- Definer review (R-126): the list is the reviewed allowlist in _definer_allowlist.psql (one place, with a reason and a
-- caller per line); every authenticated line needs a non-member test below.
\ir _definer_allowlist.psql
create temp table tested (sig text primary key);
grant select on tested to authenticated;
insert into tested select sig from definer_allowlist where role = 'authenticated';

select is(
  (select coalesce(array_agg(p.oid::regprocedure::text order by 1), '{}') from pg_proc p
   where p.pronamespace = 'public'::regnamespace and p.prosecdef
     and has_function_privilege('authenticated', p.oid, 'execute')
     and p.oid::regprocedure::text not in (select sig from tested)),
  '{}'::text[],
  'every SECURITY DEFINER function authenticated can run has a non-member test in rls_functions.sql');

-- P0.1-08: the list above is exactly what authenticated can run, nothing on it was revoked by mistake.
select is(
  (select coalesce(array_agg(sig order by 1), '{}') from tested
   where not has_function_privilege('authenticated', ('public.' || sig)::regprocedure, 'execute')),
  '{}'::text[],
  'every function on the browser list is still callable by authenticated');

-- Speed 2 part A (Rashid's yes, 6 Nov 2026): one exception, public.suggest_take, the database call of the kabsi.co route
-- /api/suggest. It is reached with the public key and refuses every call without the route key held in Vault (a login
-- role was ruled out: on this project any login role reaches pg_net's queue). supabase/tests/speed2_suggest_take.sql
-- proves the refusal. Any other function anon can run still fails here.
select is(
  (select coalesce(array_agg(p.oid::regprocedure::text order by 1), '{}') from pg_proc p
   where p.pronamespace = 'public'::regnamespace and p.prosecdef
     and has_function_privilege('anon', p.oid, 'execute')),
  array['suggest_take(text,text,integer,integer,integer,boolean)'],
  'anon can run no SECURITY DEFINER function in public but suggest_take, which needs the route key');

select ok(not has_function_privilege('anon', 'public.google_mode()', 'execute'), 'anon cannot run google_mode()');

-- P0.1-08: helpers that only triggers and other SECURITY DEFINER functions call are closed to the browser.
select ok(not has_function_privilege('authenticated', 'public.is_demo_location(uuid)', 'execute'), 'authenticated cannot run is_demo_location()');
select ok(not has_function_privilege('authenticated', 'public.is_demo_user(uuid)', 'execute'), 'authenticated cannot run is_demo_user()');
select ok(not has_function_privilege('authenticated', 'public.run_task_detectors(uuid)', 'execute'), 'authenticated cannot run run_task_detectors()');
select ok(not has_function_privilege('authenticated', 'public.team_invite_for_email(uuid)', 'execute'), 'authenticated cannot read invite emails');
select ok(not has_function_privilege('authenticated', 'public.staff_concierge_edit_review(uuid,integer,text,text)', 'execute'), 'authenticated cannot run staff_concierge_edit_review()');

-- P0.1-08: the private schema is out of reach of the API roles, and holds the cron-only functions.
select ok(not has_schema_privilege('anon', 'private', 'usage'), 'anon has no usage on schema private');
select ok(not has_schema_privilege('authenticated', 'private', 'usage'), 'authenticated has no usage on schema private');
select is(
  (select coalesce(array_agg(p.proname::text order by 1), '{}') from pg_proc p
   where p.pronamespace = 'private'::regnamespace
     and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))),
  '{}'::text[],
  'no function in private is executable by anon or authenticated');
select is(
  (select array_agg(p.proname::text order by 1) from pg_proc p where p.pronamespace = 'private'::regnamespace
     and p.proname in ('concierge_daily_tasks', 'concierge_overdue_alerts', 'end_expired_plans', 'ops_watchdog', 'purge_old_chats', 'run_retention')),
  array['concierge_daily_tasks', 'concierge_overdue_alerts', 'end_expired_plans', 'ops_watchdog', 'purge_old_chats', 'run_retention'],
  'the six cron-only functions live in private');
select is(
  (select count(*)::int from pg_proc p where p.pronamespace = 'public'::regnamespace
     and p.proname in ('concierge_daily_tasks', 'concierge_overdue_alerts', 'end_expired_plans', 'ops_watchdog', 'purge_old_chats', 'run_retention')),
  0,
  'no copy of them is left in public');

create temp table victim_before as
  select (select md5(l::text) from public.locations l where l.id = '00000000-0000-4000-8000-0000000000c1') as loc,
         (select md5(r::text) from public.reviews r where r.id = '00000000-0000-4000-8000-0000000000e1') as review,
         (select md5(c::text) from public.cards c where c.code = 'VCTM22') as card;

-- P0.1-09: the victim's organisation ids, read before switching persona (the stranger cannot read them).
create temp table victim_orgs as
  select (select organization_id from public.locations where id = '00000000-0000-4000-8000-0000000000c1') as owner_org;
grant select on victim_orgs to authenticated;
select ok((select owner_org is not null from victim_orgs), 'the victim has an owner organisation');

-- One About your business fact of the victim's (P0.3-01), for the fact RPCs below.
insert into public.knowledge_facts (id, location_id, slot, key, value, status, source)
values ('00000000-0000-4000-8000-0000000000fd', '00000000-0000-4000-8000-0000000000c1', 'card.parking', 'parking',
        '{"text": "Victim parking"}', 'needs_confirmation', 'website');

-- Fix 2: one photo of the victim's, and a post row naming it, for photo_sig below (a row can be forged over the API).
insert into public.photos (id, location_id, storage_path, source, state, kind)
values ('00000000-0000-4000-8000-0000000006f1', '00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000c1/rls.jpg', 'app', 'draft', 'photo');
create temp table victim_post_row as
  select jsonb_populate_record(null::public.gbp_posts, jsonb_build_object('id', '00000000-0000-4000-8000-0000000006f2',
    'location_id', '00000000-0000-4000-8000-0000000000c1', 'photo_id', '00000000-0000-4000-8000-0000000006f1')) as r;
grant select on victim_post_row to authenticated;

-- As a signed-in stranger: S has no business and no staff row.
select tests.act_as('00000000-0000-4000-8000-0000000000b1');
select is((select public.photo_sig(v.r) from victim_post_row v), null, 'photo_sig reads nothing for a non-member');

-- Owner RPCs on the victim's business.
\ir _victim_calls.psql
select is(public.claim_team_invites(), 0, 'claim_team_invites gives a stranger nothing');
-- P0.8-03: WhatsApp is per person; a stranger cannot connect and sees and changes only their own (empty) status.
select throws_ok($$ select public.whatsapp_connect_start(repeat('Consent text shown to the owner. ', 3)) $$, '42501', null, 'whatsapp_connect_start refuses a non-member');
select is(public.whatsapp_status() ->> 'state', 'none', 'whatsapp_status shows a stranger nothing of the owner''s');
select is(public.whatsapp_set_prefs(false, true) ->> 'state', 'none', 'whatsapp_set_prefs changes nothing of the owner''s');
select is(public.whatsapp_disconnect() ->> 'state', 'none', 'whatsapp_disconnect stops nothing of the owner''s');
select throws_ok($$ select public.whatsapp_staff_code() $$, '42501', 'forbidden', 'whatsapp_staff_code refuses anyone who is not staff');
-- A business already on Kabsi cannot be started again by someone else.
select throws_ok($$ select public.start_location('victim-place', 'Hijack', 'x', 'US', 'UTC') $$, 'P0001', 'already_on_kabsi', 'start_location refuses a business that is already on Kabsi for someone else');

-- Helpers that answer only true or false about the caller.
select is(public.is_member('00000000-0000-4000-8000-0000000000c1'), false, 'is_member is false for a non-member');
select is(public.is_staff(), false, 'is_staff is false for a non-member');
select is(public.is_org_member((select owner_org from victim_orgs)), false, 'is_org_member is false for a non-member');
select is(public.has_location_role('00000000-0000-4000-8000-0000000000c1', array['owner', 'manager', 'staff']), false, 'has_location_role is false for a non-member');
select is(public.google_mode(), 'mock', 'google_mode returns only the mode, no business data');
-- Launch 1: one boolean of app_settings, the same for everyone.
select is(pg_typeof(public.whatsapp_owners_on())::text, 'boolean', 'whatsapp_owners_on returns only a boolean, no business data');

-- Staff RPCs: forbidden for anyone without a staff row.
select throws_ok($$ select * from public.staff_chat_stats(7) $$, '42501', null, 'staff_chat_stats refuses a non-staff user');
select throws_ok($$ select * from public.staff_chats(null, null, null, null, 7, 10) $$, '42501', null, 'staff_chats refuses a non-staff user');
select throws_ok($$ select public.staff_concierge_add_review('00000000-0000-4000-8000-0000000000c1', 5, 'n', 'c', current_date, false) $$, '42501', null, 'staff_concierge_add_review refuses a non-staff user');
select throws_ok($$ select public.staff_concierge_cancel_task('00000000-0000-4000-8000-0000000000f2', 'redo', 'x') $$, '42501', null, 'staff_concierge_cancel_task refuses a non-staff user');
select throws_ok($$ select public.staff_concierge_claim_task('00000000-0000-4000-8000-0000000000f2') $$, '42501', null, 'staff_concierge_claim_task refuses a non-staff user');
select throws_ok($$ select public.staff_concierge_convert('00000000-0000-4000-8000-0000000000c1') $$, '42501', null, 'staff_concierge_convert refuses a non-staff user');
select throws_ok($$ select public.staff_concierge_mark_posted('00000000-0000-4000-8000-0000000000f2') $$, '42501', null, 'staff_concierge_mark_posted refuses a non-staff user');
select throws_ok($$ select public.staff_concierge_queue() $$, '42501', null, 'staff_concierge_queue refuses a non-staff user');
select throws_ok($$ select public.staff_concierge_task_done('00000000-0000-4000-8000-0000000000f2', 'x') $$, '42501', null, 'staff_concierge_task_done refuses a non-staff user');
select ok(not has_function_privilege('authenticated', 'public.staff_contacts(integer)', 'execute'), 'staff_contacts is closed to the browser (definer review, 8 Nov)');
select throws_ok($$ select public.staff_grant_trial('00000000-0000-4000-8000-0000000000c1', 7) $$, '42501', null, 'staff_grant_trial refuses a non-staff user');
-- Partners session: the Founding 25 and Kabsi Partners staff functions.
select throws_ok($$ select public.staff_founding_decide('00000000-0000-4000-8000-0000000000c1', 'accepted') $$, '42501', null, 'staff_founding_decide refuses a non-staff user');
select throws_ok($$ select public.staff_founding_link('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000c1') $$, '42501', null, 'staff_founding_link refuses a non-staff user');
select throws_ok($$ select public.staff_founding_overview() $$, '42501', null, 'staff_founding_overview refuses a non-staff user');
-- Sec 1: the Founding 25 owner match and the Google writes stop switch are for Kabsi staff admins only.
select ok(not has_function_privilege('authenticated', 'public.staff_founding_matches(uuid)', 'execute'), 'staff_founding_matches is closed to the browser (its staff admin check is tested in sec1_roles_approvals.sql)');
select throws_ok($$ select public.staff_set_google_writes(true, 'stranger tries') $$, '42501', null, 'staff_set_google_writes refuses a non-staff user');
-- V4: onboarding and the founder-assisted checklist.
select throws_ok($$ select public.staff_founding_checklist('00000000-0000-4000-8000-0000000000c1') $$, '42501', null, 'staff_founding_checklist refuses a non-staff user');
select throws_ok($$ select public.staff_founding_check('00000000-0000-4000-8000-0000000000c1', 'old_reviews', true) $$, '42501', null, 'staff_founding_check refuses a non-staff user');
-- UX 1: owners' AI questions.
-- Email 1: the routine channel is the caller's own; the setup-email check says nothing about another business.
select lives_ok($$ select public.set_routine_channel('email') $$, 'set_routine_channel touches only the caller''s own choice');
select is((select channel from public.routine_channels where user_id = '00000000-0000-4000-8000-0000000000a1'), null, 'the stranger cannot see the victim''s choice');
select is(public.my_setup_link_emailed('00000000-0000-4000-8000-0000000000c1'), false, 'my_setup_link_emailed says nothing about a non-member''s business');
-- App 6: the one-call routine delivery refuses a non-member of the business.
select throws_ok($$ select public.set_routine_delivery('00000000-0000-4000-8000-0000000000c1', 'email') $$, '42501', null, 'set_routine_delivery refuses a non-member');
select throws_ok($$ select public.staff_partner_decide('00000000-0000-4000-8000-0000000000c1', 'approved') $$, '42501', null, 'staff_partner_decide refuses a non-staff user');
select throws_ok($$ select public.staff_partner_payout_details('00000000-0000-4000-8000-0000000000c1', 'usdt', 'TXYZ123456') $$, '42501', null, 'staff_partner_payout_details refuses a non-staff user');
select throws_ok($$ select public.staff_partners_overview() $$, '42501', null, 'staff_partners_overview refuses a non-staff user');
select throws_ok($$ select public.staff_payouts_approve(current_date) $$, '42501', null, 'staff_payouts_approve refuses a non-staff user');
select throws_ok($$ select public.staff_payout_sent('00000000-0000-4000-8000-0000000000c1', 'ref') $$, '42501', null, 'staff_payout_sent refuses a non-staff user');
select throws_ok($$ select public.staff_payout_run(current_date) $$, '42501', null, 'staff_payout_run refuses a non-staff user');
select throws_ok($$ select public.staff_job_health() $$, '42501', null, 'staff_job_health refuses a non-staff user');
select throws_ok($$ select public.staff_operations() $$, '42501', null, 'staff_operations refuses a non-staff user');
select throws_ok($$ select public.staff_evidence_add('00000000-0000-4000-8000-0000000000c1', null, current_date, 'call', 'request', 'x') $$, '42501', null, 'staff_evidence_add refuses a non-staff user');
select throws_ok($$ select public.staff_evidence_delete(gen_random_uuid()) $$, '42501', null, 'staff_evidence_delete refuses a non-staff user');
select throws_ok($$ select public.staff_activation() $$, '42501', null, 'staff_activation refuses a non-staff user');
select throws_ok($$ select public.staff_validation() $$, '42501', null, 'staff_validation refuses a non-staff user');
select throws_ok($$ select public.staff_request_answers() $$, '42501', null, 'staff_request_answers refuses a non-staff user (Onboarding 1)');
select throws_ok($$ select public.staff_today() $$, '42501', null, 'staff_today refuses a non-staff user (App 5)');
select throws_ok($$ select public.staff_outbound_approve('00000000-0000-4000-8000-0000000000d8') $$, '42501', null, 'staff_outbound_approve refuses a non-staff user (Harvey 4A)');
select throws_ok($$ select public.staff_outbound_approve_all(array['00000000-0000-4000-8000-0000000000d8']::uuid[]) $$, '42501', null, 'staff_outbound_approve_all refuses a non-staff user');
select throws_ok($$ select public.staff_outbound_edit('00000000-0000-4000-8000-0000000000d8', 'A subject', 'A body long enough here') $$, '42501', null, 'staff_outbound_edit refuses a non-staff user');
select throws_ok($$ select public.staff_outbound_skip('00000000-0000-4000-8000-0000000000d8') $$, '42501', null, 'staff_outbound_skip refuses a non-staff user');
select throws_ok($$ select public.staff_outbound_reply_done(1) $$, '42501', null, 'staff_outbound_reply_done refuses a non-staff user');
select throws_ok($$ select public.staff_system_health() $$, '42501', null, 'staff_system_health refuses a non-staff user');
select throws_ok($$ select public.staff_job_retry(1) $$, '42501', null, 'staff_job_retry refuses a non-staff user');
select throws_ok($$ select public.staff_job_cancel(1) $$, '42501', null, 'staff_job_cancel refuses a non-staff user');
select throws_ok($$ select public.staff_business_diagnostics('00000000-0000-4000-8000-0000000000c1') $$, '42501', null, 'staff_business_diagnostics refuses a non-staff user');
select throws_ok($$ select public.staff_complete_followup(gen_random_uuid(), 'x') $$, '42501', null, 'staff_complete_followup refuses a non-staff user');
select throws_ok($$ select public.staff_mock_listing_edit('00000000-0000-4000-8000-0000000000c1', 'phone', '1') $$, '42501', null, 'staff_mock_listing_edit refuses a non-staff user');
select throws_ok($$ select public.staff_mock_review('00000000-0000-4000-8000-0000000000c1', 5, 'n', 'c') $$, '42501', null, 'staff_mock_review refuses a non-staff user');
select throws_ok($$ select public.staff_set_concierge('00000000-0000-4000-8000-0000000000c1', true) $$, '42501', null, 'staff_set_concierge refuses a non-staff user');
-- P0.6-02: a stranger's attribution and via code go only to the stranger's own record and businesses (the victim
-- business is checked unchanged at the end).
select lives_ok($$ select public.save_signup_attribution('{"via":"HIJACK","first":{"utm_source":"x"}}'::jsonb) $$,
  'save_signup_attribution touches only the caller''s own record');

reset role;

-- P0.8-01 (K-123 to K-127): the payment, card-order and partner functions of the retired model are gone.
select is(
  (select count(*) from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname in (
     'owner_submit_claim', 'staff_decide_claim', 'staff_record_payment', 'record_plan_payment', 'billing_prepare_invoice',
     'billing_apply_ipn', 'billing_attach_invoice', 'billing_mark_create_failed', 'billing_invoice_status', 'billing_enabled_for',
     'owner_plan_kinds', 'partner_submit_claim', 'partner_create_invite', 'partner_invoice_calc', 'partner_locations',
     'partner_rate', 'partner_recipients', 'partner_billing_run', 'partner_covered', 'claim_partner_membership',
     'staff_create_partner', 'staff_update_partner_contact', 'staff_create_card_order', 'staff_set_card_order_status',
     'generate_card_codes', 'is_partner_member')),
  0::bigint, 'no retired payment, card-order or partner function is left');

select is(
  (select row(
     (select md5(l::text) from public.locations l where l.id = '00000000-0000-4000-8000-0000000000c1'),
     (select md5(r::text) from public.reviews r where r.id = '00000000-0000-4000-8000-0000000000e1'),
     (select md5(c::text) from public.cards c where c.code = 'VCTM22'))::text),
  (select row(loc, review, card)::text from victim_before),
  'the victim business, review and card are unchanged after every call');

select * from finish();
rollback;
