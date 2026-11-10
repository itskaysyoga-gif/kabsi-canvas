-- Founding 1 (R-151, master plan 30.51 item 3): the private Founding 25 invite. The slug is one setting of 24 characters that no
-- browser role can read; one definer function, for staff only, reads and rotates it; after a rotation the old value is gone.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

\ir _fixtures.psql

-- 1. The setting exists, 24 characters, letters and digits only ------------------------------------------------------------------
select is((select count(*)::int from public.app_settings where key = 'founding_invite_slug'), 1, 'the invite slug setting exists');
select is((select length(value) from public.app_settings where key = 'founding_invite_slug'), 24, 'the slug has 24 characters');
select ok((select value ~ '^[A-Za-z0-9]{24}$' from public.app_settings where key = 'founding_invite_slug'), 'the slug is letters and digits only (safe in an address)');

-- 2. No browser role can read the table or run the function ----------------------------------------------------------------------
select ok(not has_table_privilege('anon', 'public.app_settings', 'select'), 'anon cannot read app_settings');
select ok(not has_table_privilege('authenticated', 'public.app_settings', 'select'), 'authenticated cannot read app_settings');
select ok(not has_function_privilege('anon', 'public.staff_founding_invite(boolean)', 'execute'), 'anon cannot run the invite function');
select ok(has_function_privilege('authenticated', 'public.staff_founding_invite(boolean)', 'execute'), 'authenticated can call it, and the function itself admits staff only (below)');
select ok((select p.prosecdef and p.proconfig @> array['search_path=""'] from pg_proc p where p.oid = 'public.staff_founding_invite(boolean)'::regprocedure),
  'the function is a definer function with an empty search_path');

-- 3. Not staff: refused, for reading and for rotating, and nothing changes -------------------------------------------------------
create temp table before_slug as select value from public.app_settings where key = 'founding_invite_slug';
grant select on before_slug to authenticated;
select tests.act_as('00000000-0000-4000-8000-0000000000a1');
select throws_ok($$ select public.staff_founding_invite() $$, '42501', null, 'an owner cannot read the slug');
select throws_ok($$ select public.staff_founding_invite(true) $$, '42501', null, 'an owner cannot rotate it');
reset role;
select tests.act_as('00000000-0000-4000-8000-0000000000b1');
select throws_ok($$ select public.staff_founding_invite(true) $$, '42501', null, 'nor a stranger');
reset role;
select is((select value from public.app_settings where key = 'founding_invite_slug'), (select value from before_slug), 'a refused call left the slug as it was');

-- 4. Staff read it, rotate it, and the old link stops at once ---------------------------------------------------------------------
select tests.act_as('00000000-0000-4000-8000-0000000000a3');
select is(public.staff_founding_invite(), (select value from before_slug), 'staff read the current slug');
create temp table after_slug (value text);
grant all on after_slug to authenticated;
insert into after_slug select public.staff_founding_invite(true);
reset role;
select isnt((select value from after_slug), (select value from before_slug), 'rotating makes a different slug');
select ok((select value ~ '^[A-Za-z0-9]{24}$' from after_slug), 'the new slug is 24 letters and digits');
select is((select value from public.app_settings where key = 'founding_invite_slug'), (select value from after_slug), 'the setting holds the new slug');
select is((select count(*)::int from public.app_settings where key = 'founding_invite_slug' and value = (select value from before_slug)), 0, 'the old slug is gone: a link made from it matches nothing');
select tests.act_as('00000000-0000-4000-8000-0000000000a3');
select is(public.staff_founding_invite(), (select value from after_slug), 'staff read the new slug');
select isnt(public.staff_founding_invite(true), (select value from after_slug), 'a second rotation changes it again');
reset role;

select * from finish();
rollback;
