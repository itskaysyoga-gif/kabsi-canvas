-- Definer review (R-126, 8 Nov 2026): no SECURITY DEFINER function is executable by anon or authenticated unless it is
-- on the reviewed allowlist in _definer_allowlist.psql. Covers every schema but the ones Supabase and Postgres ship
-- (listed below), so public, private, extensions, cron and any new schema are covered. A stale line (function gone or revoked) fails as well,
-- so the list never claims a grant that is not there.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

\ir _fixtures.psql
\ir _definer_allowlist.psql

create temp view definer_grants as
  select r.role, p.oid::regprocedure::text as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   cross join (values ('anon'), ('authenticated')) as r(role)
   where p.prosecdef
     -- Only the schemas Supabase itself ships and upgrades are skipped (net and supabase_functions hold Supabase's own
     -- http helpers, executable by the browser roles on the local stack). extensions, cron and pgmq stay covered.
     and n.nspname not in ('pg_catalog', 'information_schema', 'pg_toast', 'auth', 'storage', 'realtime', 'graphql',
                           'graphql_public', 'vault', 'pgbouncer', 'net', 'supabase_functions', 'supabase_migrations',
                           'pgsodium', 'pgsodium_masks', '_realtime', '_analytics')
     and n.nspname not like 'pg_temp%' and n.nspname not like 'pg_toast_temp%'
     and has_function_privilege(r.role, p.oid, 'execute');

select is(
  (select coalesce(array_agg(g.role || ' ' || g.sig order by 1), '{}') from definer_grants g
    where not exists (select 1 from definer_allowlist a where a.role = g.role and a.sig = g.sig)),
  '{}'::text[],
  'every SECURITY DEFINER function anon or authenticated can run is on the reviewed allowlist');

select is(
  (select coalesce(array_agg(a.role || ' ' || a.sig order by 1), '{}') from definer_allowlist a
    where not exists (select 1 from definer_grants g where g.role = a.role and g.sig = a.sig)),
  '{}'::text[],
  'every allowlist line is a definer function that role can still run');

select is((select array_agg(sig order by sig) from definer_allowlist where role = 'anon'),
  array['suggest_take(text,text,integer,integer,integer,boolean)'],
  'anon has one exception only, suggest_take with the route key (30.39 item 11)');

select ok((select bool_and(length(reason) > 10 and length(caller) > 3) from definer_allowlist),
  'every allowlist line names its reason and its caller');

-- The three closed on 8 Nov: no page calls them; the service role keeps them. (Their old refusal tests in
-- rls_functions.sql and _victim_calls.psql are replaced by these privilege checks.)
select ok(not has_function_privilege('authenticated', 'public.staff_contacts(integer)', 'execute'), 'authenticated cannot run staff_contacts');
select ok(not has_function_privilege('authenticated', 'public.staff_founding_matches(uuid)', 'execute'), 'authenticated cannot run staff_founding_matches');
select ok(not has_function_privilege('authenticated', 'public.set_protection_autofix(uuid,text,boolean,text)', 'execute'), 'authenticated cannot run set_protection_autofix');
select ok(has_function_privilege('service_role', 'public.staff_founding_matches(uuid)', 'execute'), 'the service role keeps staff_founding_matches');

-- The member of business A and business B check for the three that were tested only against a stranger before.
select tests.act_as('00000000-0000-4000-8000-0000000000b2');
select is(public.my_setup_link_emailed('00000000-0000-4000-8000-0000000000c1'), false, 'my_setup_link_emailed says nothing about another business to its owner');
select throws_ok($$ select public.set_routine_delivery('00000000-0000-4000-8000-0000000000c1', 'email') $$, '42501', null, 'set_routine_delivery refuses the owner of another business');
select is(public.set_routine_delivery('00000000-0000-4000-8000-0000000000c2', 'email') is not null, true, 'control: the same owner sets their own business');
reset role;

select * from finish();
rollback;
