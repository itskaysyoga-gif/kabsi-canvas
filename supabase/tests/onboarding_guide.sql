-- P0.4-03: the Manager guide's server side (K-93, K-141). "Send these steps to my other device" goes only to the signed-in
-- person's own address, for an owner or a manager of the business, at most 3 times in 24 hours; a stranger and staff
-- cannot; the job target is for the service role only and holds only that person's own address. The new 'confirm' step is
-- accepted for an owner and refused for anyone else.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

\ir _fixtures.psql

insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
select '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email, now(), '{}', '{}', now(), now()
from (values ('00000000-0000-4000-8000-0000000000a4'::uuid, 'Guide-Manager@example.test'),
             ('00000000-0000-4000-8000-0000000000a5'::uuid, 'guide-staff@example.test')) as u(id, email);
insert into public.location_members (location_id, user_id, role) values
  ('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000a4', 'manager'),
  ('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000a5', 'staff');

-- 1. Privileges ------------------------------------------------------------------------------------------------------
select ok(not has_function_privilege('anon', 'public.send_manager_steps(uuid, integer)', 'execute'), 'anon cannot ask for the steps');
select ok(has_function_privilege('authenticated', 'public.send_manager_steps(uuid, integer)', 'execute'), 'a signed-in user can');
select ok(not has_function_privilege('authenticated', 'public.manager_steps_target(uuid, uuid)', 'execute'), 'a signed-in user cannot read the job target');
select ok(has_function_privilege('service_role', 'public.manager_steps_target(uuid, uuid)', 'execute'), 'the job can');

-- 2. Who may ask -----------------------------------------------------------------------------------------------------
select tests.act_as('00000000-0000-4000-8000-0000000000b1');
select throws_ok($$ select public.send_manager_steps('00000000-0000-4000-8000-0000000000c1', 3) $$, '42501', null, 'a stranger cannot');
reset role;
select tests.act_as('00000000-0000-4000-8000-0000000000a5');
select throws_ok($$ select public.send_manager_steps('00000000-0000-4000-8000-0000000000c1', 3) $$, '42501', null, 'staff cannot');
reset role;
select tests.act_as('00000000-0000-4000-8000-0000000000b2');
select throws_ok($$ select public.send_manager_steps('00000000-0000-4000-8000-0000000000c1', 3) $$, '42501', null, 'the owner of another business cannot');
reset role;
select is((select count(*) from public.jobs where kind = 'manager_steps_email'), 0::bigint, 'no email was queued by any of them');

-- 3. The owner and the manager ---------------------------------------------------------------------------------------
select tests.act_as('00000000-0000-4000-8000-0000000000a1');
select lives_ok($$ select public.send_manager_steps('00000000-0000-4000-8000-0000000000c1', 3) $$, 'the owner can');
reset role;
select is((select count(*) from public.jobs where kind = 'manager_steps_email' and location_id = '00000000-0000-4000-8000-0000000000c1'), 1::bigint, 'one email is queued');
select is((select payload ->> 'user_id' from public.jobs where kind = 'manager_steps_email'), '00000000-0000-4000-8000-0000000000a1', 'for the person who asked');
select is((select payload ->> 'step' from public.jobs where kind = 'manager_steps_email'), '3', 'with the card they were on');
select is((select count(*) from public.audit_events where action = 'manager_steps_requested' and location_id = '00000000-0000-4000-8000-0000000000c1'), 1::bigint, 'the request is in the audit log');
select tests.act_as('00000000-0000-4000-8000-0000000000a4');
select lives_ok($$ select public.send_manager_steps('00000000-0000-4000-8000-0000000000c1', 99) $$, 'a manager can too');
reset role;
select is((select max((payload ->> 'step')::int) from public.jobs where kind = 'manager_steps_email'), 5, 'a card number out of range is held to 1 to 5');

-- 4. At most 3 in 24 hours -------------------------------------------------------------------------------------------
select tests.act_as('00000000-0000-4000-8000-0000000000a1');
select lives_ok($$ select public.send_manager_steps('00000000-0000-4000-8000-0000000000c1', 1) $$, 'the second request');
select lives_ok($$ select public.send_manager_steps('00000000-0000-4000-8000-0000000000c1', 1) $$, 'the third request');
select throws_ok($$ select public.send_manager_steps('00000000-0000-4000-8000-0000000000c1', 1) $$, 'P0001', 'rate_limited', 'the fourth in a day is refused');
reset role;

-- 5. The job target is the person's own address ----------------------------------------------------------------------
select is(public.manager_steps_target('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000a4') ->> 'email',
  'guide-manager@example.test', 'the manager''s own address, lower case');
select is(public.manager_steps_target('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000a1') ->> 'name',
  'Victim Bakery', 'and the business name');
select is(public.manager_steps_target('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000a5'), null,
  'staff have no target: nothing is sent to them');
select is(public.manager_steps_target('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000b1'), null,
  'nor does a stranger');

-- 6. The confirm step ------------------------------------------------------------------------------------------------
select tests.act_as('00000000-0000-4000-8000-0000000000a1');
select lives_ok($$ select public.set_onboarding_step('00000000-0000-4000-8000-0000000000c1', 'confirm') $$, 'the owner can move to confirm');
select throws_ok($$ select public.set_onboarding_step('00000000-0000-4000-8000-0000000000c1', 'nonsense') $$, 'P0001', 'bad_step', 'an unknown step is refused');
reset role;
select is((select onboarding_step from public.locations where id = '00000000-0000-4000-8000-0000000000c1'), 'confirm', 'and it is stored');
select tests.act_as('00000000-0000-4000-8000-0000000000a4');
select throws_ok($$ select public.set_onboarding_step('00000000-0000-4000-8000-0000000000c1', 'done') $$, '42501', null, 'a manager cannot move the owner''s onboarding');
reset role;

select * from finish();
rollback;
