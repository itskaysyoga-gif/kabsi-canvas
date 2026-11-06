-- Speed 2 part A: suggest_take, the one database call of POST /api/suggest on kabsi.co. The limits and the Autocomplete
-- cap in one round trip, in profile-snapshot's order and keys. The route signs in as the role suggest_route, which runs
-- this one function and nothing else.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

\ir _fixtures.psql

select ok(
  not has_function_privilege('anon', 'public.suggest_take(text,integer,integer,integer,boolean)', 'execute')
  and not has_function_privilege('authenticated', 'public.suggest_take(text,integer,integer,integer,boolean)', 'execute')
  and has_function_privilege('suggest_route', 'public.suggest_take(text,integer,integer,integer,boolean)', 'execute')
  and has_function_privilege('service_role', 'public.suggest_take(text,integer,integer,integer,boolean)', 'execute'),
  'suggest_take runs for suggest_route and the service role only');
select ok((select prosecdef from pg_proc where oid = 'public.suggest_take(text,integer,integer,integer,boolean)'::regprocedure),
  'suggest_take is security definer');

-- The route's role: a login role that can run suggest_take and no other SECURITY DEFINER function, and touch no table.
select ok((select rolcanlogin and not rolsuper and not rolcreaterole and not rolcreatedb and not rolbypassrls
             from pg_roles where rolname = 'suggest_route'), 'suggest_route signs in and has no other power');
select is(
  (select coalesce(array_agg(p.oid::regprocedure::text order by 1), '{}') from pg_proc p
    where p.prosecdef and p.pronamespace in ('public'::regnamespace, 'private'::regnamespace)
      and has_function_privilege('suggest_route', p.oid, 'execute')),
  array['suggest_take(text,integer,integer,integer,boolean)'],
  'suggest_take is the only SECURITY DEFINER function suggest_route can run');
select is(
  (select count(*)::integer from pg_class c
    where c.relnamespace in ('public'::regnamespace, 'private'::regnamespace) and c.relkind in ('r', 'v', 'm', 'p')
      and (has_table_privilege('suggest_route', c.oid, 'select') or has_table_privilege('suggest_route', c.oid, 'insert')
           or has_table_privilege('suggest_route', c.oid, 'update') or has_table_privilege('suggest_route', c.oid, 'delete'))),
  0, 'suggest_route reads and writes no table');
select ok(not pg_has_role('suggest_route', 'anon', 'member') and not pg_has_role('suggest_route', 'authenticated', 'member')
          and not pg_has_role('suggest_route', 'service_role', 'member'), 'suggest_route is no other role');

select throws_ok($$ select public.suggest_take('1.2.3.4', 20, 120, 60, false) $$, 'P0001', 'suggest_take: bad visitor',
  'a raw address is refused: the visitor is a hash');
select throws_ok($$ select public.suggest_take('aaaaaaaaaaaaaaaaaaaaaaaa', 0, 120, 60, false) $$, 'P0001',
  'suggest_take: limit out of range', 'a limit of 0 is refused');

set local role anon;
select throws_ok($$ select public.suggest_take('aaaaaaaaaaaaaaaaaaaaaaaa', 20, 120, 60, true) $$, '42501', null,
  'the public key cannot run it');
reset role;

-- The minute limit (2 here): the third call is refused and does not touch the hour or the day.
select is(public.suggest_take('aaaaaaaaaaaaaaaaaaaaaaaa', 2, 120, 60, false) ->> 'allowed', 'true', 'first call allowed');
select is(public.suggest_take('aaaaaaaaaaaaaaaaaaaaaaaa', 2, 120, 60, false) ->> 'allowed', 'true', 'second call allowed');
select is(public.suggest_take('aaaaaaaaaaaaaaaaaaaaaaaa', 2, 120, 60, false), '{"allowed": false, "reason": "rate_limited"}'::jsonb,
  'third call in the minute refused');
select is((select hits from public.rate_limits where key = 'snapshot:suggest-hour:aaaaaaaaaaaaaaaaaaaaaaaa'), 2,
  'the refused call did not use up the hour');
select is((select hits from public.rate_limits where key = 'snapshot:suggest-day:aaaaaaaaaaaaaaaaaaaaaaaa'), 2,
  'nor the day');

-- The pass: the minute only.
select is(public.suggest_take('bbbbbbbbbbbbbbbbbbbbbbbb', 20, null, null, false) ->> 'allowed', 'true', 'a pass counts the minute');
select ok(not exists (select 1 from public.rate_limits where key = 'snapshot:suggest-hour:bbbbbbbbbbbbbbbbbbbbbbbb'),
  'and not the hour');

-- The Autocomplete cap (2 here): asked only with p_places, counted in places_usage.
update public.app_settings set value = '2' where key = 'places_autocomplete_daily_cap';
select is(public.suggest_take('cccccccccccccccccccccccc', 20, 120, 60, false) ->> 'allowed', 'true', 'a cached answer');
select is(coalesce((select calls from public.places_usage where day = (now() at time zone 'UTC')::date and kind = 'autocomplete'), 0), 0,
  'a cached answer takes nothing from the cap');
select is(public.suggest_take('cccccccccccccccccccccccc', 20, 120, 60, true) ->> 'allowed', 'true', 'first Google call allowed');
select is(public.suggest_take('cccccccccccccccccccccccc', 20, 120, 60, true) ->> 'allowed', 'true', 'second Google call allowed');
select is(public.suggest_take('cccccccccccccccccccccccc', 20, 120, 60, true), '{"allowed": false, "reason": "back_soon"}'::jsonb,
  'at the cap the answer is back_soon');
select is((select calls from public.places_usage where day = (now() at time zone 'UTC')::date and kind = 'autocomplete'), 2,
  'the cap counter stops at the cap');
select is(public.suggest_take('dddddddddddddddddddddddd', 1, 120, 60, true) ->> 'allowed', 'false', 'still at the cap');
select is(public.suggest_take('dddddddddddddddddddddddd', 1, 120, 60, true) ->> 'reason', 'rate_limited',
  'a limit refuses before the cap is asked');

select * from finish();
rollback;
