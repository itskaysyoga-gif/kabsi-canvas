-- P0.1-07: every SECURITY DEFINER function in public that authenticated can execute refuses a non-member (K-42, G-17).
-- One test per function, run as a signed-in stranger against the victim's business, partner and rows. The coverage
-- test reads pg_proc, so a new browser-callable function fails the suite until it has a line here.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

\ir _fixtures.psql

create temp table tested (sig text primary key);
grant select on tested to authenticated;
insert into tested values
  ('activate_card(text,uuid,text)'), ('activity_feed(uuid,integer)'), ('add_photo(uuid,text)'), ('billing_invoice_status(uuid)'),
  ('billing_prepare_invoice(uuid,text,text,boolean)'), ('cancel_location_deletion(uuid)'), ('choose_plan(uuid,text)'),
  ('claim_partner_membership()'), ('confirm_business_details(uuid,jsonb)'), ('create_review_link(uuid,text)'), ('generate_card_codes(integer,uuid)'),
  ('google_mode()'), ('handle_review_offline(uuid)'),
  ('has_location_role(uuid,text[])'), ('is_member(uuid)'), ('is_org_member(uuid,text[])'), ('is_partner_member(uuid)'), ('is_staff()'), ('owner_submit_claim(uuid,text,text,text)'),
  ('partner_create_invite(uuid,text,text)'), ('partner_invoice_calc(uuid,date)'), ('partner_locations(uuid)'),
  ('partner_submit_claim(uuid,text,text)'), ('plan_summary(uuid)'),
  ('profile_task_action(uuid,text)'), ('profile_tasks_list(uuid)'), ('rename_card(text,text)'),
  ('request_disconnect(uuid)'), ('request_location_deletion(uuid)'), ('save_consent(uuid,text)'), ('set_auto_posts(uuid,boolean)'),
  ('set_card_active(text,boolean)'), ('set_onboarding_step(uuid,text)'), ('skip_review(uuid)'),
  ('staff_chat_stats(integer)'), ('staff_complete_followup(uuid,text)'), ('staff_chats(text,text,text,text,integer,integer)'),
  ('staff_concierge_add_review(uuid,integer,text,text,date,boolean)'), ('staff_concierge_cancel_task(uuid,text,text)'),
  ('staff_concierge_claim_task(uuid)'), ('staff_concierge_convert(uuid)'),
  ('staff_concierge_mark_posted(uuid)'),
  ('staff_concierge_queue()'), ('staff_concierge_task_done(uuid,text)'), ('staff_contacts(integer)'),
  ('staff_create_card_order(uuid,uuid,integer,text)'), ('staff_create_partner(text,text,text,text,text)'),
  ('staff_decide_claim(uuid,boolean,text)'), ('staff_grant_trial(uuid,integer)'), ('staff_job_health()'),
  ('staff_mock_listing_edit(uuid,text,text)'), ('staff_mock_review(uuid,integer,text,text)'),
  ('staff_record_payment(uuid,text,numeric,text,text)'), ('staff_set_card_order_status(uuid,text)'),
  ('staff_set_concierge(uuid,boolean)'), ('staff_update_partner_contact(uuid,text,text)'),
  ('start_location(text,text,text,text,text,text,uuid)'), ('update_knowledge_card(uuid,jsonb)'),
  ('update_notification_settings(uuid,text[],smallint,text,integer)');

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
select ok(not has_function_privilege('authenticated', 'public.profile_score(uuid)', 'execute'), 'authenticated cannot run profile_score()');
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
  select (select organization_id from public.locations where id = '00000000-0000-4000-8000-0000000000c1') as owner_org,
         (select id from public.organizations where partner_id = '00000000-0000-4000-8000-0000000000d1') as partner_org;
grant select on victim_orgs to authenticated;
select ok((select owner_org is not null and partner_org is not null from victim_orgs), 'the victim has an owner and a partner organisation');

-- As a signed-in stranger: S has no business, no partner and no staff row.
select tests.act_as('00000000-0000-4000-8000-0000000000b1');

-- Owner RPCs on the victim's business.
select throws_ok($$ select public.activate_card('VCTM22', '00000000-0000-4000-8000-0000000000c1', 'x') $$, '42501', null, 'activate_card refuses a non-member');
select throws_ok($$ select * from public.activity_feed('00000000-0000-4000-8000-0000000000c1', 7) $$, '42501', null, 'activity_feed refuses a non-member');
select throws_ok($$ select public.add_photo('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000c1/victim.jpg') $$, '42501', null, 'add_photo refuses a non-member');
select throws_ok($$ select public.billing_invoice_status('00000000-0000-4000-8000-0000000000f6') $$, '42501', null, 'billing_invoice_status refuses a non-member');
select throws_ok($$ select * from public.billing_prepare_invoice('00000000-0000-4000-8000-0000000000c1', 'pro_monthly', 'usdttrc20', false) $$, '42501', null, 'billing_prepare_invoice refuses a non-member');
select throws_ok($$ select public.cancel_location_deletion('00000000-0000-4000-8000-0000000000c1') $$, '42501', null, 'cancel_location_deletion refuses a non-member');
select throws_ok($$ select public.choose_plan('00000000-0000-4000-8000-0000000000c1', 'trial') $$, '42501', null, 'choose_plan refuses a non-member');
select throws_ok($$ select public.create_review_link('00000000-0000-4000-8000-0000000000c1', 'x') $$, '42501', null, 'create_review_link refuses a non-member');
select throws_ok($$ select public.handle_review_offline('00000000-0000-4000-8000-0000000000e1') $$, '42501', null, 'handle_review_offline refuses a non-member');
select throws_ok($$ select public.owner_submit_claim('00000000-0000-4000-8000-0000000000c1', 'pro_monthly', 'trc20', 'strangertx1') $$, '42501', null, 'owner_submit_claim refuses a non-member');
select throws_ok($$ select public.plan_summary('00000000-0000-4000-8000-0000000000c1') $$, '42501', null, 'plan_summary refuses a non-member');
select throws_ok($$ select public.profile_task_action('00000000-0000-4000-8000-0000000000f4', 'later') $$, '42501', null, 'profile_task_action refuses a non-member');
select throws_ok($$ select public.profile_tasks_list('00000000-0000-4000-8000-0000000000c1') $$, '42501', null, 'profile_tasks_list refuses a non-member');
select throws_ok($$ select public.rename_card('VCTM22', 'x') $$, '42501', null, 'rename_card refuses a non-member');
select throws_ok($$ select public.request_disconnect('00000000-0000-4000-8000-0000000000c1') $$, '42501', null, 'request_disconnect refuses a non-member');
select throws_ok($$ select public.confirm_business_details('00000000-0000-4000-8000-0000000000c1', '{"phone": {"display": "+961 1 000 000"}}') $$, '42501', null,
  'confirm_business_details refuses a non-member');
select throws_ok($$ select public.request_location_deletion('00000000-0000-4000-8000-0000000000c1') $$, '42501', null, 'request_location_deletion refuses a non-member');
select throws_ok($$ select public.save_consent('00000000-0000-4000-8000-0000000000c1', 'yes') $$, '42501', null, 'save_consent refuses a non-member');
select throws_ok($$ select public.set_auto_posts('00000000-0000-4000-8000-0000000000c1', false) $$, '42501', null, 'set_auto_posts refuses a non-member');
select throws_ok($$ select public.set_card_active('VCTM22', false) $$, '42501', null, 'set_card_active refuses a non-member');
select throws_ok($$ select public.set_onboarding_step('00000000-0000-4000-8000-0000000000c1', 'done') $$, '42501', null, 'set_onboarding_step refuses a non-member');
select throws_ok($$ select public.skip_review('00000000-0000-4000-8000-0000000000e1') $$, '42501', null, 'skip_review refuses a non-member');
select throws_ok($$ select public.update_knowledge_card('00000000-0000-4000-8000-0000000000c1', '{}') $$, '42501', null, 'update_knowledge_card refuses a non-member');
select throws_ok($$ select public.update_notification_settings('00000000-0000-4000-8000-0000000000c1', null, null, null, null) $$, '42501', null, 'update_notification_settings refuses a non-member');
select throws_ok($$ select public.start_location('victim-place', 'Hijack', 'x', 'US', 'UTC', null, null) $$, 'P0001', 'already_on_kabsi', 'start_location refuses a business that is already on Kabsi for someone else');

-- Partner RPCs on the victim's partner.
select throws_ok($$ select public.partner_create_invite('00000000-0000-4000-8000-0000000000d1', 'someone@example.test', 'x') $$, '42501', null, 'partner_create_invite refuses a non-member');
select throws_ok($$ select * from public.partner_invoice_calc('00000000-0000-4000-8000-0000000000d1', '2026-09-01') $$, '42501', null, 'partner_invoice_calc refuses a non-member');
select throws_ok($$ select public.partner_submit_claim('00000000-0000-4000-8000-0000000000f3', 'trc20', 'strangertx1') $$, '42501', null, 'partner_submit_claim refuses a non-member');
select is_empty($$ select * from public.partner_locations('00000000-0000-4000-8000-0000000000d1') $$, 'partner_locations returns nothing to a non-member');
select is(public.claim_partner_membership(), null, 'claim_partner_membership gives a stranger no partner');

-- Helpers that answer only true or false about the caller.
select is(public.is_member('00000000-0000-4000-8000-0000000000c1'), false, 'is_member is false for a non-member');
select is(public.is_partner_member('00000000-0000-4000-8000-0000000000d1'), false, 'is_partner_member is false for a non-member');
select is(public.is_staff(), false, 'is_staff is false for a non-member');
select is(public.is_org_member((select owner_org from victim_orgs)), false, 'is_org_member is false for a non-member');
select is(public.is_org_member((select partner_org from victim_orgs), null), false, 'is_org_member is false for a non-member of a partner organisation');
select is(public.has_location_role('00000000-0000-4000-8000-0000000000c1', array['owner', 'manager', 'staff']), false, 'has_location_role is false for a non-member');
select is(public.google_mode(), 'mock', 'google_mode returns only the mode, no business data');

-- Staff RPCs: forbidden for anyone without a staff row.
select throws_ok($$ select * from public.generate_card_codes(1, '00000000-0000-4000-8000-0000000000d1') $$, '42501', null, 'generate_card_codes refuses a non-staff user');
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
select throws_ok($$ select public.staff_create_card_order('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000d1', 1, 'x') $$, '42501', null, 'staff_create_card_order refuses a non-staff user');
select throws_ok($$ select public.staff_create_partner('n', 'e@example.test', 'x', 'y', 'z') $$, '42501', null, 'staff_create_partner refuses a non-staff user');
select throws_ok($$ select public.staff_decide_claim('00000000-0000-4000-8000-0000000000f5', true, 'x') $$, '42501', null, 'staff_decide_claim refuses a non-staff user');
select throws_ok($$ select public.staff_grant_trial('00000000-0000-4000-8000-0000000000c1', 7) $$, '42501', null, 'staff_grant_trial refuses a non-staff user');
select throws_ok($$ select public.staff_job_health() $$, '42501', null, 'staff_job_health refuses a non-staff user');
select throws_ok($$ select public.staff_complete_followup(gen_random_uuid(), 'x') $$, '42501', null, 'staff_complete_followup refuses a non-staff user');
select throws_ok($$ select public.staff_mock_listing_edit('00000000-0000-4000-8000-0000000000c1', 'phone', '1') $$, '42501', null, 'staff_mock_listing_edit refuses a non-staff user');
select throws_ok($$ select public.staff_mock_review('00000000-0000-4000-8000-0000000000c1', 5, 'n', 'c') $$, '42501', null, 'staff_mock_review refuses a non-staff user');
select throws_ok($$ select public.staff_record_payment('00000000-0000-4000-8000-0000000000c1', 'pro_monthly', 10, 'cash', 'r') $$, '42501', null, 'staff_record_payment refuses a non-staff user');
select throws_ok($$ select public.staff_set_card_order_status('00000000-0000-4000-8000-0000000000f1', 'paid') $$, '42501', null, 'staff_set_card_order_status refuses a non-staff user');
select throws_ok($$ select public.staff_set_concierge('00000000-0000-4000-8000-0000000000c1', true) $$, '42501', null, 'staff_set_concierge refuses a non-staff user');
select throws_ok($$ select public.staff_update_partner_contact('00000000-0000-4000-8000-0000000000d1', null, 'email') $$, '42501', null, 'staff_update_partner_contact refuses a non-staff user');

reset role;

select is(
  (select row(
     (select md5(l::text) from public.locations l where l.id = '00000000-0000-4000-8000-0000000000c1'),
     (select md5(r::text) from public.reviews r where r.id = '00000000-0000-4000-8000-0000000000e1'),
     (select md5(c::text) from public.cards c where c.code = 'VCTM22'))::text),
  (select row(loc, review, card)::text from victim_before),
  'the victim business, review and card are unchanged after every call');

select * from finish();
rollback;
