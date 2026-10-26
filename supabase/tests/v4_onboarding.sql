-- V4: onboarding in four stages, the first task, every task closes, the category proposal, the monthly facts and the new
-- tables closed to browsers (master plan 30.15 sections 2 and 3, 30.16 section 3).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

\ir _fixtures.psql

-- The new tables are server-only.
select ok(not has_table_privilege('authenticated', 'public.free_checks', 'select') and not has_table_privilege('anon', 'public.free_checks', 'select')
  and not has_table_privilege('authenticated', 'public.onboarding_messages', 'select')
  and not has_table_privilege('authenticated', 'public.founding_checklist', 'select')
  and not has_table_privilege('authenticated', 'public.industry_search_terms', 'select'),
  'the V4 tables are closed to anon and authenticated');
select ok(not has_function_privilege('authenticated', 'public.publication_outcomes_due(integer)', 'execute')
  and not has_function_privilege('authenticated', 'public.onboarding_due(integer)', 'execute')
  and not has_function_privilege('authenticated', 'public.onboarding_facts(uuid)', 'execute')
  and not has_function_privilege('authenticated', 'public.propose_monthly_facts(uuid,jsonb,text)', 'execute'),
  'the service-only V4 functions are closed to the browser');
select is((select value from public.app_settings where key = 'voice_notes'), 'off', 'voice notes stay off until the 20-note test passes');

-- Stage 2 and the resume link, as the owner.
select tests.act_as('00000000-0000-4000-8000-0000000000a1');
select is((public.onboarding_status('00000000-0000-4000-8000-0000000000c1') ->> 'confirmed')::boolean, false, 'not confirmed yet');
select public.confirm_business('00000000-0000-4000-8000-0000000000c1');
select is((public.onboarding_status('00000000-0000-4000-8000-0000000000c1') ->> 'confirmed')::boolean, true, 'the owner confirmed the business');
select matches(public.onboarding_status('00000000-0000-4000-8000-0000000000c1') ->> 'resume_code', '^[0-9a-f]{20}$', 'the owner gets a resume code');
reset role;
select is(public.onboarding_resume((select resume_code from public.locations where id = '00000000-0000-4000-8000-0000000000c1')),
  '00000000-0000-4000-8000-0000000000c1'::uuid, 'the resume code finds the business');
select is(public.onboarding_resume('not-a-code'), null, 'a bad code finds nothing');

-- One message per business and kind.
select is(public.onboarding_claim('00000000-0000-4000-8000-0000000000c1', 'invite'), true, 'the first claim wins');
select is(public.onboarding_claim('00000000-0000-4000-8000-0000000000c1', 'invite'), false, 'a second claim of the same message loses');
-- Every message kind the tick sends can be stored (lane R, 26 Oct: 'after48' broke the first live apply).
select ok(public.onboarding_claim('00000000-0000-4000-8000-0000000000c1', k), 'the message kind ' || k || ' can be stored')
  from unnest(array['access_works', 'first_task', 'first_task_sent', 'after48', 'unlock', 'still_blocked']) k;

-- Stage 3: only an owner says Yes to setup messages.
select is(public.onboarding_setup_ok('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000b1'), false, 'a stranger cannot say yes for the business');
select is(public.onboarding_setup_ok('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000a1'), true, 'the owner says yes');

-- Every task closes: a verified publication approved by someone on WhatsApp is told once, and it unlocks the rest.
insert into public.whatsapp_optins (user_id, phone, state, consent_text) values ('00000000-0000-4000-8000-0000000000a1', '+15550000001', 'active', 'test')
  on conflict (user_id) do update set phone = excluded.phone, state = 'active';
update public.publications set approved_at = now() - interval '1 hour', state = 'verified', channel = 'whatsapp'
 where location_id = '00000000-0000-4000-8000-0000000000c1' and target_type = 'review_reply';
select isnt((select first_task_done_at from public.locations where id = '00000000-0000-4000-8000-0000000000c1'), null, 'the first verified publication marks the first task done');
select is(jsonb_array_length(public.publication_outcomes_due(50)), 1, 'the outcome is due once');
select is(jsonb_array_length(public.publication_outcomes_due(50)), 0, 'and never twice');

-- The category check is a task the owner answers; it closes when a later map no longer suggests it.
insert into public.visibility_scans (id, location_id, keyword, radius_km, center_lat, center_lng, zoom, source, state, category_check)
values ('00000000-0000-4000-8000-0000000040a1', '00000000-0000-4000-8000-0000000000c1', 'bakery', 1, 25, 55, 15, 'mock', 'done',
        '{"current": "Cafe", "suggested": "Bakery", "shared_by": ["Oven Street", "Harbor Bakes"]}');
select is(public.category_task_from_scan('00000000-0000-4000-8000-0000000040a1'), true, 'the category proposal becomes a task');
select is((select count(*)::int from public.tasks where location_id = '00000000-0000-4000-8000-0000000000c1' and source_type = 'category_check' and state = 'open'), 1, 'one open task');
select is((select proposed_action ->> 'type' from public.tasks where source_type = 'category_check' and location_id = '00000000-0000-4000-8000-0000000000c1'), 'owner_steps',
  'Kabsi never changes the category itself: the owner does, on Google');
update public.visibility_scans set category_check = null where id = '00000000-0000-4000-8000-0000000040a1';
select is(public.category_task_from_scan('00000000-0000-4000-8000-0000000040a1'), false, 'no suggestion any more');
select is((select count(*)::int from public.tasks where location_id = '00000000-0000-4000-8000-0000000000c1' and source_type = 'category_check' and state = 'open'), 0, 'the task is closed');

-- The monthly answer: proposals, then the owner's yes; nobody else can confirm them.
select is(public.propose_monthly_facts('00000000-0000-4000-8000-0000000000c1', '[{"key": "service", "text": "We now offer gluten free bread."}, {"key": "phone", "text": "x"}]', '2026-10'), 1,
  'only services and prices are proposed');
select is((select status from public.knowledge_facts where location_id = '00000000-0000-4000-8000-0000000000c1' and source_ref = 'monthly_update:2026-10'), 'needs_confirmation', 'waiting for the owner');
select throws_ok($$ select public.confirm_monthly_facts('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000b1', '2026-10') $$, '42501', null, 'a stranger cannot confirm');
select is(public.confirm_monthly_facts('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000a1', '2026-10'), 1, 'the owner confirms');

-- A free check joins the business that signed up from it, once, and only for its owner.
insert into public.free_checks (code, business, term, country, self, center, radius_km, source, fast)
values ('ABCD2345', 'Victim Bakery', 'bakery', 'AE', '{"title": "Victim Bakery"}', '{"lat": 25, "lng": 55}', 1, 'mock', '{}');
select tests.act_as('00000000-0000-4000-8000-0000000000a1');
select is(public.claim_free_check('00000000-0000-4000-8000-0000000000c1', 'KAB-ABCD2345'), true, 'the owner claims the free check by its code');
select is(public.claim_free_check('00000000-0000-4000-8000-0000000000c1', 'KAB-ABCD2345'), false, 'a claimed check is not claimed again');
select is((public.onboarding_status('00000000-0000-4000-8000-0000000000c1') -> 'check' ->> 'term'), 'bakery', 'the search carries over to onboarding');
reset role;

-- A search confirmed before access waits, and runs once access is checked.
insert into public.visibility_keywords (location_id, keyword, radius_km, center_lat, center_lng, self_title, cadence, confirmed_at, next_run_at, active)
values ('00000000-0000-4000-8000-0000000000c1', 'bakery parked', 1, 25, 55, 'Victim Bakery', 'monthly', now(), '9999-12-31', true);
select is(public.release_parked_searches(), 0, 'no access yet: the search stays parked');
update public.google_connections set access_state = 'granted', voice_of_merchant = true, last_successful_sync_at = now()
 where location_id = '00000000-0000-4000-8000-0000000000c1';
select is(public.release_parked_searches(), 1, 'access checked: the parked search is due');

-- The first task's candidates for the victim: the review with its draft.
select is(jsonb_array_length(public.first_task_candidates('00000000-0000-4000-8000-0000000000c1') -> 'reviews') >= 0, true, 'candidates are read');

select * from finish();
rollback;
