-- Speed 2 part A: suggest_take, the one database call of POST /api/suggest on kabsi.co. The limits and the Autocomplete
-- cap in one round trip, in profile-snapshot's order and keys; service role only.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

\ir _fixtures.psql

select ok(
  not has_function_privilege('authenticated', 'public.suggest_take(text,text,integer,integer,integer,boolean)', 'execute')
  and has_function_privilege('anon', 'public.suggest_take(text,text,integer,integer,integer,boolean)', 'execute'),
  'suggest_take is reached with the public key (the route key inside decides), not by a signed in user');
select ok((select prosecdef from pg_proc where oid = 'public.suggest_take(text,text,integer,integer,integer,boolean)'::regprocedure),
  'suggest_take is security definer');
select ok(public.internal_secret('suggest_route_key') ~ '^[0-9a-f]{64}$', 'the route key is 32 random bytes, in Vault');
select ok(not has_function_privilege('anon', 'public.internal_secret(text)', 'execute'), 'the public key cannot read Vault');

create temp table k as select public.internal_secret('suggest_route_key') as value;
create function pg_temp.st(v text, a integer, b integer, c integer, g boolean) returns jsonb language sql as
  $f$ select public.suggest_take((select value from k), v, a, b, c, g) $f$;

set local role anon;
select throws_ok($$ select public.suggest_take(repeat('0', 64), 'aaaaaaaaaaaaaaaaaaaaaaaa', 20, 120, 60, true) $$, 'P0001',
  'suggest_take: not allowed', 'a call without the route key is refused');
select throws_ok($$ select public.suggest_take(null, 'aaaaaaaaaaaaaaaaaaaaaaaa', 20, 120, 60, true) $$, 'P0001',
  'suggest_take: not allowed', 'a call with no key is refused');
reset role;
select ok(not exists (select 1 from public.rate_limits where key like 'snapshot:suggest-%:aaaaaaaaaaaaaaaaaaaaaaaa'),
  'a refused key counts nothing');

select throws_ok($$ select pg_temp.st('1.2.3.4', 20, 120, 60, false) $$, 'P0001', 'suggest_take: bad visitor',
  'a raw address is refused: the visitor is a hash');
select throws_ok($$ select pg_temp.st('aaaaaaaaaaaaaaaaaaaaaaaa', 0, 120, 60, false) $$, 'P0001',
  'suggest_take: limit out of range', 'a limit of 0 is refused');

-- The minute limit (2 here): the third call is refused and does not touch the hour or the day.
select is(pg_temp.st('aaaaaaaaaaaaaaaaaaaaaaaa', 2, 120, 60, false) ->> 'allowed', 'true', 'first call allowed');
select is(pg_temp.st('aaaaaaaaaaaaaaaaaaaaaaaa', 2, 120, 60, false) ->> 'allowed', 'true', 'second call allowed');
select is(pg_temp.st('aaaaaaaaaaaaaaaaaaaaaaaa', 2, 120, 60, false), '{"allowed": false, "reason": "rate_limited"}'::jsonb,
  'third call in the minute refused');
select is((select hits from public.rate_limits where key = 'snapshot:suggest-hour:aaaaaaaaaaaaaaaaaaaaaaaa'), 2,
  'the refused call did not use up the hour');
select is((select hits from public.rate_limits where key = 'snapshot:suggest-day:aaaaaaaaaaaaaaaaaaaaaaaa'), 2,
  'nor the day');

-- The pass: the minute only.
select is(pg_temp.st('bbbbbbbbbbbbbbbbbbbbbbbb', 20, null, null, false) ->> 'allowed', 'true', 'a pass counts the minute');
select ok(not exists (select 1 from public.rate_limits where key = 'snapshot:suggest-hour:bbbbbbbbbbbbbbbbbbbbbbbb'),
  'and not the hour');

-- The Autocomplete cap (2 here): asked only with p_places, counted in places_usage.
update public.app_settings set value = '2' where key = 'places_autocomplete_daily_cap';
select is(pg_temp.st('cccccccccccccccccccccccc', 20, 120, 60, false) ->> 'allowed', 'true', 'a cached answer');
select is(coalesce((select calls from public.places_usage where day = (now() at time zone 'UTC')::date and kind = 'autocomplete'), 0), 0,
  'a cached answer takes nothing from the cap');
select is(pg_temp.st('cccccccccccccccccccccccc', 20, 120, 60, true) ->> 'allowed', 'true', 'first Google call allowed');
select is(pg_temp.st('cccccccccccccccccccccccc', 20, 120, 60, true) ->> 'allowed', 'true', 'second Google call allowed');
select is(pg_temp.st('cccccccccccccccccccccccc', 20, 120, 60, true), '{"allowed": false, "reason": "back_soon"}'::jsonb,
  'at the cap the answer is back_soon');
select is((select calls from public.places_usage where day = (now() at time zone 'UTC')::date and kind = 'autocomplete'), 2,
  'the cap counter stops at the cap');
select is(pg_temp.st('dddddddddddddddddddddddd', 1, 120, 60, true) ->> 'allowed', 'false', 'still at the cap');
select is(pg_temp.st('dddddddddddddddddddddddd', 1, 120, 60, true) ->> 'reason', 'rate_limited',
  'a limit refuses before the cap is asked');

select * from finish();
rollback;
