-- P0.4-04: the situation an owner reports while adding Kabsi (K-94 to K-98, K-61, K-95, K-97). Members read it, only an
-- owner or manager writes it (set, "I've done it", clear), a stranger and staff cannot; working access resolves every
-- situation but not_eligible by itself; a business that is not eligible never starts a trial and a stuck owner's other
-- situations lose no trial day (the trial still starts at working access); the lifecycle job reads the open situation;
-- the 72 hour WhatsApp nudge is made once, for an owner who gave a phone number, and never carries the number.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

\ir _fixtures.psql

insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
select '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email, now(), '{}', '{}', now(), now()
from (values ('00000000-0000-4000-8000-0000000009a1'::uuid, 'scenario-owner@example.test'),
             ('00000000-0000-4000-8000-0000000009a2'::uuid, 'scenario-manager@example.test'),
             ('00000000-0000-4000-8000-0000000009a3'::uuid, 'scenario-staff@example.test'),
             ('00000000-0000-4000-8000-0000000009a4'::uuid, 'scenario-two@example.test')) as u(id, email);
create function pg_temp.biz(p_n int, p_owner uuid, p_place text) returns uuid language plpgsql as $$
declare v uuid := ('00000000-0000-4000-8000-0000000009c' || p_n)::uuid;
begin
  insert into public.locations (id, name, place_id, created_by, time_zone, signup_source)
  values (v, 'Scenario Shop ' || p_n, p_place, p_owner, 'UTC', 'self');
  insert into public.location_members (location_id, user_id, role) values (v, p_owner, 'owner');
  return v;
end $$;
create function pg_temp.grant_access(p_loc uuid) returns void language plpgsql as $$
begin
  update public.locations set consent_at = coalesce(consent_at, now()), access_granted_at = now(),
    google_account_id = 'accounts/mock', google_location_id = 'locations/mock-' || left(p_loc::text, 8) || right(p_loc::text, 4)
   where id = p_loc;
  update public.google_connections set voice_of_merchant = true where location_id = p_loc;
end $$;

select pg_temp.biz(1, '00000000-0000-4000-8000-0000000009a1', 'scenario-place-1');
select pg_temp.biz(2, '00000000-0000-4000-8000-0000000009a4', 'scenario-place-2');
insert into public.location_members (location_id, user_id, role) values
  ('00000000-0000-4000-8000-0000000009c1', '00000000-0000-4000-8000-0000000009a2', 'manager'),
  ('00000000-0000-4000-8000-0000000009c1', '00000000-0000-4000-8000-0000000009a3', 'staff');

-- 1. Privileges ------------------------------------------------------------------------------------------------------
select ok(not has_function_privilege('anon', 'public.set_onboarding_scenario(uuid, text, text)', 'execute'), 'anon cannot report a situation');
select ok(has_function_privilege('authenticated', 'public.set_onboarding_scenario(uuid, text, text)', 'execute'), 'a signed-in user can');
select ok(not has_function_privilege('authenticated', 'private.onboarding_nudges()', 'execute'), 'nobody signed in can run the nudge job');
select ok(not has_function_privilege('authenticated', 'private.trial_blocked(uuid)', 'execute'), 'nor read the trial block');

-- 2. Who may write ---------------------------------------------------------------------------------------------------
select tests.act_as('00000000-0000-4000-8000-0000000000b1');
select throws_ok($$ select public.set_onboarding_scenario('00000000-0000-4000-8000-0000000009c1', 'needs_verifying') $$, '42501', null, 'a stranger cannot report one');
select throws_ok($$ select public.scenario_done('00000000-0000-4000-8000-0000000009c1') $$, '42501', null, 'nor say it is done');
select throws_ok($$ select public.clear_onboarding_scenario('00000000-0000-4000-8000-0000000009c1') $$, '42501', null, 'nor clear it');
reset role;
select tests.act_as('00000000-0000-4000-8000-0000000009a3');
select throws_ok($$ select public.set_onboarding_scenario('00000000-0000-4000-8000-0000000009c1', 'needs_verifying') $$, '42501', null, 'staff of the business cannot');
reset role;
select tests.act_as('00000000-0000-4000-8000-0000000009a4');
select throws_ok($$ select public.set_onboarding_scenario('00000000-0000-4000-8000-0000000009c1', 'needs_verifying') $$, '42501', null, 'the owner of another business cannot');
reset role;
select is((select count(*) from public.onboarding_scenarios where location_id = '00000000-0000-4000-8000-0000000009c1'), 0::bigint, 'nothing was stored');

-- 3. The owner reports, finishes and clears ---------------------------------------------------------------------------
select tests.act_as('00000000-0000-4000-8000-0000000009a1');
select throws_ok($$ select public.set_onboarding_scenario('00000000-0000-4000-8000-0000000009c1', 'nonsense') $$, 'P0001', 'bad_scenario', 'an unknown situation is refused');
select throws_ok($$ select public.set_onboarding_scenario('00000000-0000-4000-8000-0000000009c1', 'suspended', 'lost_login') $$, 'P0001', 'bad_variant', 'a variant belongs only to someone else holds the profile');
select lives_ok($$ select public.set_onboarding_scenario('00000000-0000-4000-8000-0000000009c1', 'needs_verifying') $$, 'the owner reports that the profile needs verifying');
reset role;
select is((select scenario from public.onboarding_scenarios where location_id = '00000000-0000-4000-8000-0000000009c1' and resolved_at is null), 'needs_verifying', 'it is stored and open');
select is((select count(*) from public.audit_events where action = 'scenario_set' and location_id = '00000000-0000-4000-8000-0000000009c1'), 1::bigint, 'and in the audit log');
select tests.act_as('00000000-0000-4000-8000-0000000009a2');
select is((select count(*) from public.onboarding_scenarios where location_id = '00000000-0000-4000-8000-0000000009c1'), 1::bigint, 'a manager reads it');
select lives_ok($$ select public.scenario_done('00000000-0000-4000-8000-0000000009c1') $$, 'and can say it is done');
reset role;
select ok((select done_at is not null from public.onboarding_scenarios where location_id = '00000000-0000-4000-8000-0000000009c1'), 'done_at is set');
select tests.act_as('00000000-0000-4000-8000-0000000009a3');
select is((select count(*) from public.onboarding_scenarios where location_id = '00000000-0000-4000-8000-0000000009c1'), 0::bigint, 'staff of the business do not read it');
reset role;
select tests.act_as('00000000-0000-4000-8000-0000000009a1');
select lives_ok($$ select public.set_onboarding_scenario('00000000-0000-4000-8000-0000000009c1', 'needs_verifying') $$, 'saying the same again changes nothing');
reset role;
select ok((select done_at is not null from public.onboarding_scenarios where location_id = '00000000-0000-4000-8000-0000000009c1'), 'the same situation keeps its done time');
select is((select count(*) from public.audit_events where action = 'scenario_set' and location_id = '00000000-0000-4000-8000-0000000009c1'), 1::bigint, 'and is not logged twice');
select tests.act_as('00000000-0000-4000-8000-0000000009a1');
select lives_ok($$ select public.set_onboarding_scenario('00000000-0000-4000-8000-0000000009c1', 'someone_else_owns', 'dont_know') $$, 'a different situation replaces it');
reset role;
select ok((select done_at is null from public.onboarding_scenarios where location_id = '00000000-0000-4000-8000-0000000009c1'), 'and starts again: not done');
select is((select variant from public.onboarding_scenarios where location_id = '00000000-0000-4000-8000-0000000009c1'), 'dont_know', 'with its variant');

-- 4. The lifecycle job reads the open situation ----------------------------------------------------------------------
create function pg_temp.snap(p_loc uuid) returns jsonb language sql as $$
  select x from jsonb_array_elements(public.lifecycle_snapshots()) x where x ->> 'location_id' = p_loc::text
$$;
select is(pg_temp.snap('00000000-0000-4000-8000-0000000009c1') -> 'scenario' ->> 'id', 'someone_else_owns', 'the snapshot carries the open situation');
select is(pg_temp.snap('00000000-0000-4000-8000-0000000009c1') -> 'scenario' ->> 'variant', 'dont_know', 'with its variant');
select ok(pg_temp.snap('00000000-0000-4000-8000-0000000009c1') -> 'scenario' -> 'started_at' is not null, 'and when it began');
select is(pg_temp.snap('00000000-0000-4000-8000-0000000009c2') -> 'scenario', 'null'::jsonb, 'a business with none has null');
update public.locations set created_at = now() - interval '40 days' where id = '00000000-0000-4000-8000-0000000009c1';
select is(pg_temp.snap('00000000-0000-4000-8000-0000000009c1') ->> 'name', 'Scenario Shop 1', 'an old business with an open situation is still listed');
update public.onboarding_scenarios set started_at = now() - interval '50 days' where location_id = '00000000-0000-4000-8000-0000000009c1';
select is(pg_temp.snap('00000000-0000-4000-8000-0000000009c1'), null, 'but not one whose situation is older than 45 days');
update public.onboarding_scenarios set started_at = now() where location_id = '00000000-0000-4000-8000-0000000009c1';

-- 5. Clearing, and working access ----------------------------------------------------------------------------------------
select tests.act_as('00000000-0000-4000-8000-0000000009a1');
select lives_ok($$ select public.clear_onboarding_scenario('00000000-0000-4000-8000-0000000009c1') $$, 'Back to the steps clears it');
reset role;
select ok((select resolved_at is not null from public.onboarding_scenarios where location_id = '00000000-0000-4000-8000-0000000009c1'), 'it is resolved, not deleted');
select is(pg_temp.snap('00000000-0000-4000-8000-0000000009c1'), null, 'and the reminders no longer see it: an old business with nothing open is not listed');
select tests.act_as('00000000-0000-4000-8000-0000000009a1');
select public.set_onboarding_scenario('00000000-0000-4000-8000-0000000009c1', 'google_reviewing');
reset role;
select pg_temp.grant_access('00000000-0000-4000-8000-0000000009c1');
select ok((select resolved_at is not null from public.onboarding_scenarios where location_id = '00000000-0000-4000-8000-0000000009c1'), 'working access resolves the situation by itself');
select is(public.refresh_location_status('00000000-0000-4000-8000-0000000009c1'), 'active', 'and the trial starts at that moment: no day was lost');
select tests.act_as('00000000-0000-4000-8000-0000000009a1');
select public.set_onboarding_scenario('00000000-0000-4000-8000-0000000009c1', 'suspended');
reset role;
select is((select count(*) from public.onboarding_scenarios where location_id = '00000000-0000-4000-8000-0000000009c1' and resolved_at is null), 0::bigint, 'with access working nothing new is stored');

-- 6. Not eligible never starts a trial -----------------------------------------------------------------------------------
select tests.act_as('00000000-0000-4000-8000-0000000009a4');
select lives_ok($$ select public.set_onboarding_scenario('00000000-0000-4000-8000-0000000009c2', 'not_eligible') $$, 'the owner is told the business is not eligible');
select lives_ok($$ select public.scenario_done('00000000-0000-4000-8000-0000000009c2') $$, 'there is nothing to do, so done changes nothing');
reset role;
select ok((select done_at is null from public.onboarding_scenarios where location_id = '00000000-0000-4000-8000-0000000009c2'), 'done is never set for a business that is not eligible');
select pg_temp.grant_access('00000000-0000-4000-8000-0000000009c2');
select ok((select resolved_at is null from public.onboarding_scenarios where location_id = '00000000-0000-4000-8000-0000000009c2'), 'access does not resolve an honest stop');
select is(public.grant_trial_if_eligible('00000000-0000-4000-8000-0000000009c2', true), null, 'no trial is granted');
select is(public.refresh_location_status('00000000-0000-4000-8000-0000000009c2'), 'awaiting_payment', 'the business has no trial');
select is(private.entitlements(null, '00000000-0000-4000-8000-0000000009c2') ->> 'state', 'none', 'and its state is none');
select is((select count(*)::int from public.subscriptions s join public.locations l on l.organization_id = s.organization_id
            where l.id = '00000000-0000-4000-8000-0000000009c2' and s.trial_started_at is not null), 0, 'no trial row exists');
select tests.act_as('00000000-0000-4000-8000-0000000009a4');
select public.clear_onboarding_scenario('00000000-0000-4000-8000-0000000009c2');
reset role;
select isnt(public.grant_trial_if_eligible('00000000-0000-4000-8000-0000000009c2', true), null, 'once the owner says it was a mistake the trial can start');

-- 7. The 72 hour WhatsApp nudge ---------------------------------------------------------------------------------------------
select pg_temp.biz(3, '00000000-0000-4000-8000-0000000009a2', 'scenario-place-3');
update public.locations set consent_at = now() - interval '80 hours', status = 'access_pending' where id = '00000000-0000-4000-8000-0000000009c3';
select is(private.onboarding_nudges(), 0, 'no phone number: no task');
insert into public.contacts (email, phone) values ('scenario-manager@example.test', '+15550100100');
select is(private.onboarding_nudges(), 1, 'an owner who gave a phone number and agreed 80 hours ago: one task');
select is((select count(*) from public.staff_followups where kind = 'whatsapp_nudge' and location_id = '00000000-0000-4000-8000-0000000009c3'), 1::bigint, 'for that business');
select ok((select detail not like '%5550100100%' and detail like '%scenario-manager@example.test%' from public.staff_followups where kind = 'whatsapp_nudge' and location_id = '00000000-0000-4000-8000-0000000009c3'),
  'it names where to find the number and never holds the number');
select is(private.onboarding_nudges(), 0, 'a second run makes nothing');
update public.staff_followups set done_at = now(), done_note = 'Sent' where kind = 'whatsapp_nudge' and location_id = '00000000-0000-4000-8000-0000000009c3';
select is(private.onboarding_nudges(), 0, 'and not again once it is done');
select pg_temp.biz(4, '00000000-0000-4000-8000-0000000009a4', 'scenario-place-4');
update public.locations set consent_at = now() - interval '10 hours', status = 'access_pending' where id = '00000000-0000-4000-8000-0000000009c4';
insert into public.contacts (email, phone) values ('scenario-two@example.test', '+15550100101');
select is(private.onboarding_nudges(), 0, 'before 72 hours: no task');
update public.locations set consent_at = now() - interval '80 hours' where id = '00000000-0000-4000-8000-0000000009c4';
update public.locations set access_granted_at = now() where id = '00000000-0000-4000-8000-0000000009c4';
select is(private.onboarding_nudges(), 0, 'with access working: no task');

select * from finish();
rollback;
