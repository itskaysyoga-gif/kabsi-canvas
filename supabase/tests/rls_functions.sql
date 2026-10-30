-- P0.1-07: every SECURITY DEFINER function in public that authenticated can execute refuses a non-member (K-42, G-17).
-- One test per function, run as a signed-in stranger against the victim's business and rows. The coverage
-- test reads pg_proc, so a new browser-callable function fails the suite until it has a line here.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

\ir _fixtures.psql

create temp table tested (sig text primary key);
grant select on tested to authenticated;
insert into tested values
  ('activate_card(text,uuid,text)'), ('activity_feed(uuid,integer)'), ('add_photo(uuid,text)'),
  ('cancel_location_deletion(uuid)'), ('choose_plan(uuid,text)'),
  ('confirm_business_details(uuid,jsonb)'), ('entitlements(uuid,uuid)'), ('create_review_link(uuid,text)'),
  ('google_mode()'), ('handle_review_offline(uuid)'),
  ('has_location_role(uuid,text[])'), ('is_member(uuid)'), ('is_org_member(uuid,text[])'), ('is_staff()'),
  ('plan_summary(uuid)'),
  ('rename_card(text,text)'), ('set_review_link_mode(text,text)'), ('feature_access(uuid)'), ('start_review_report(uuid,text,text[])'), ('advance_review_report(uuid,text)'), ('list_review_reports(uuid)'),
  ('list_tasks(uuid)'), ('task_action(uuid,text)'), ('approve_backlog(uuid,jsonb)'),
  ('can_see(uuid,text)'), ('my_access(uuid)'), ('set_approval_policy(uuid,text,text,text)'), ('invite_team_member(uuid,text,text)'),
  ('cancel_team_invite(uuid)'), ('claim_team_invites()'), ('set_member_role(uuid,uuid,text)'), ('list_team(uuid)'), ('remove_member(uuid,uuid)'),
  ('request_disconnect(uuid)'), ('request_location_deletion(uuid)'), ('save_consent(uuid,text)'), ('set_auto_posts(uuid,boolean)'),
  ('set_card_active(text,boolean)'), ('set_onboarding_step(uuid,text)'), ('skip_review(uuid)'),
  ('staff_chat_stats(integer)'), ('staff_complete_followup(uuid,text)'), ('staff_chats(text,text,text,text,integer,integer)'),
  ('staff_concierge_add_review(uuid,integer,text,text,date,boolean)'), ('staff_concierge_cancel_task(uuid,text,text)'),
  ('staff_concierge_claim_task(uuid)'), ('staff_concierge_convert(uuid)'),
  ('staff_concierge_mark_posted(uuid)'),
  ('staff_concierge_queue()'), ('staff_concierge_task_done(uuid,text)'), ('staff_contacts(integer)'),
  ('staff_grant_trial(uuid,integer)'), ('staff_job_health()'),
  ('staff_system_health()'), ('staff_job_retry(bigint)'), ('staff_job_cancel(bigint)'), ('staff_business_diagnostics(uuid)'),
  ('staff_mock_listing_edit(uuid,text,text)'), ('staff_mock_review(uuid,integer,text,text)'),
  ('staff_set_concierge(uuid,boolean)'),
  ('start_location(text,text,text,text,text)'),
  ('save_fact(uuid,text,jsonb,uuid)'), ('confirm_fact(uuid)'), ('reject_fact(uuid)'), ('remove_fact(uuid)'),
  ('answer_knowledge_confirm(uuid,text)'), ('answer_style_offer(uuid,boolean)'),
  ('update_notification_settings(uuid,text[],smallint,text,integer)'),
  ('my_notification_prefs(uuid)'), ('set_notification_pref(uuid,text,text,text)'), ('list_my_notifications(uuid,integer)'),
  ('mark_notifications_read(uuid,uuid[])'), ('save_signup_attribution(jsonb)'), ('holiday_calendar(uuid,integer)'), ('coach_checklist(uuid)'),
  ('photo_link_create(uuid)'), ('photo_link_revoke(uuid)'), ('photo_link_status(uuid)'), ('set_post_cadence(uuid,integer)'),
  ('whatsapp_connect_start(text)'), ('whatsapp_status()'), ('whatsapp_set_prefs(boolean,boolean)'), ('whatsapp_disconnect()'), ('whatsapp_staff_code()'),
  ('set_protection_autofix(uuid,text,boolean,text)'),
  ('send_manager_steps(uuid,integer)'),
  ('set_onboarding_scenario(uuid,text,text)'), ('scenario_done(uuid)'), ('clear_onboarding_scenario(uuid)'),
  ('staff_founding_decide(uuid,text,text)'), ('staff_founding_link(uuid,uuid)'), ('staff_founding_overview()'),
  ('staff_partner_decide(uuid,text,text,text)'), ('staff_partner_payout_details(uuid,text,text)'), ('staff_partners_overview()'),
  ('staff_payouts_approve(date)'), ('staff_payout_sent(uuid,text)'), ('staff_payout_run(date)'),
  ('onboarding_status(uuid)'), ('confirm_business(uuid)'), ('staff_founding_checklist(uuid)'), ('staff_founding_check(uuid,text,boolean,text)'), ('claim_free_check(uuid,text)'),
  ('save_ai_prompt(uuid,text,uuid)'), ('remove_ai_prompt(uuid)'),
  ('set_routine_channel(text)'), ('my_setup_link_emailed(uuid)'),
  ('staff_set_google_writes(boolean,text)'), ('staff_founding_matches(uuid)'), ('staff_operations()'),
  ('staff_evidence_add(uuid,text,date,text,text,text)'), ('staff_evidence_delete(uuid)'), ('staff_activation()'), ('staff_validation()');

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

select is(
  (select coalesce(array_agg(p.oid::regprocedure::text order by 1), '{}') from pg_proc p
   where p.pronamespace = 'public'::regnamespace and p.prosecdef
     and has_function_privilege('anon', p.oid, 'execute')),
  '{}'::text[],
  'anon can run no SECURITY DEFINER function in public');

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

-- As a signed-in stranger: S has no business and no staff row.
select tests.act_as('00000000-0000-4000-8000-0000000000b1');

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
select throws_ok($$ select * from public.staff_contacts(10) $$, '42501', null, 'staff_contacts refuses a non-staff user');
select throws_ok($$ select public.staff_grant_trial('00000000-0000-4000-8000-0000000000c1', 7) $$, '42501', null, 'staff_grant_trial refuses a non-staff user');
-- Partners session: the Founding 25 and Kabsi Partners staff functions.
select throws_ok($$ select public.staff_founding_decide('00000000-0000-4000-8000-0000000000c1', 'accepted') $$, '42501', null, 'staff_founding_decide refuses a non-staff user');
select throws_ok($$ select public.staff_founding_link('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000c1') $$, '42501', null, 'staff_founding_link refuses a non-staff user');
select throws_ok($$ select public.staff_founding_overview() $$, '42501', null, 'staff_founding_overview refuses a non-staff user');
-- Sec 1: the Founding 25 owner match and the Google writes stop switch are for Kabsi staff admins only.
select throws_ok($$ select public.staff_founding_matches('00000000-0000-4000-8000-0000000000c1') $$, '42501', null, 'staff_founding_matches refuses a non-staff user');
select throws_ok($$ select public.staff_set_google_writes(true, 'stranger tries') $$, '42501', null, 'staff_set_google_writes refuses a non-staff user');
-- V4: onboarding and the founder-assisted checklist.
select throws_ok($$ select public.staff_founding_checklist('00000000-0000-4000-8000-0000000000c1') $$, '42501', null, 'staff_founding_checklist refuses a non-staff user');
select throws_ok($$ select public.staff_founding_check('00000000-0000-4000-8000-0000000000c1', 'old_reviews', true) $$, '42501', null, 'staff_founding_check refuses a non-staff user');
-- UX 1: owners' AI questions.
-- Email 1: the routine channel is the caller's own; the setup-email check says nothing about another business.
select lives_ok($$ select public.set_routine_channel('email') $$, 'set_routine_channel touches only the caller''s own choice');
select is((select channel from public.routine_channels where user_id = '00000000-0000-4000-8000-0000000000a1'), null, 'the stranger cannot see the victim''s choice');
select is(public.my_setup_link_emailed('00000000-0000-4000-8000-0000000000c1'), false, 'my_setup_link_emailed says nothing about a non-member''s business');
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
