-- P0.2-06: Places cost guard (K-100). The daily counter and its kill switch, the Slack alerts at 80 percent and at the
-- cap, the 24 hour cache and its purge, and who may call what. now() is fixed inside this transaction.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

\ir _fixtures.psql

-- Shape and privileges.
select ok((select bool_and(relrowsecurity) from pg_class where oid in ('public.places_usage'::regclass, 'public.places_cache'::regclass)),
  'RLS is on for places_usage and places_cache');
select is(
  (select coalesce(array_agg(t || ':' || r || ':' || p order by t, r, p), '{}')
     from unnest(array['public.places_usage', 'public.places_cache']) t, unnest(array['anon', 'authenticated', 'service_role']) r,
          unnest(array['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE']) p
    where has_table_privilege(r, t, p)
       or (r <> 'service_role' and has_table_privilege(r, t, 'SELECT'))),
  '{}'::text[], 'nobody writes the Places tables directly; only the service role reads them');
select ok(
  (select bool_and(not has_function_privilege('anon', f, 'execute') and not has_function_privilege('authenticated', f, 'execute')
                   and has_function_privilege('service_role', f, 'execute'))
     from unnest(array['public.places_take(text)', 'public.places_cache_get(text,text)',
                       'public.places_cache_put(text,text,jsonb)']) f),
  'places_take and the cache functions run for the service role only');
select ok(
  (select bool_and(not has_function_privilege(r, f, 'execute'))
     from unnest(array['private.places_cap()', 'private.purge_places_cache()']) f,
          unnest(array['anon', 'authenticated', 'service_role']) r),
  'the cap reader and the purge are out of reach of the API roles');

-- The cap: 100 by default; a bad setting falls back to 100, never to no cap.
select is(private.places_cap(), 100, 'the daily cap is 100');
update public.app_settings set value = 'lots' where key = 'places_daily_cap';
select is(private.places_cap(), 100, 'a setting that is not a number falls back to 100');
update public.app_settings set value = '10' where key = 'places_daily_cap';
select is(private.places_cap(), 10, 'the cap follows app_settings.places_daily_cap');

-- The kill switch trips at the configured cap (10 here).
create temp table takes (n integer primary key, g jsonb);
insert into takes select n, public.places_take('details') from generate_series(1, 10) n order by n;
select is((select count(*) from takes where g ->> 'allowed' = 'true'), 10::bigint, 'ten requests are allowed up to the cap of ten');
select is(public.places_take('details') ->> 'allowed', 'false', 'the eleventh is refused: the tool shows Back soon');
select is((select calls from public.places_usage where kind = 'details' and day = (now() at time zone 'UTC')::date), 10,
  'a refused request is not counted');
select is(public.places_take('search') ->> 'allowed', 'true', 'search has its own count: details at the cap does not stop it');
select throws_ok($$ select public.places_take('reviews') $$, 'P0001', 'places_take: unknown kind reviews', 'only the three kinds are counted');

-- Slack: one alert at 80 percent (the 8th request), one when the cap is reached (the 10th).
select is((select count(*) from public.ops_events where kind = 'places_80'), 1::bigint, 'one alert at 80 percent of the cap');
select is((select count(*) from public.ops_events where kind = 'places_cap'), 1::bigint, 'one alert when the cap is reached');
select is((select channel from public.ops_events where kind = 'places_80'), 'alerts', 'the alerts go to #kabsi-alerts');
select public.places_take('details');
select is((select count(*) from public.ops_events where kind in ('places_80', 'places_cap')), 2::bigint,
  'refused requests raise no further alerts');

-- A new day starts a new count.
update public.places_usage set day = day - 1;
select is(public.places_take('details') ->> 'used', '1', 'the next day starts again at zero');

-- The cache: a hit for 24 hours, then a miss; one row per place and mask.
select public.places_cache_put('p1', 'rating,userRatingCount', '{"rating": 4.5}');
select is(public.places_cache_get('p1', 'rating,userRatingCount'), '{"rating": 4.5}'::jsonb, 'a cached answer is returned');
select is(public.places_cache_get('p1', 'primaryType'), null::jsonb, 'another field mask is a miss');
select is(public.places_cache_get('p2', 'rating,userRatingCount'), null::jsonb, 'another place is a miss');
select public.places_cache_put('p1', 'rating,userRatingCount', '{"rating": 4.6}');
select is((select count(*) from public.places_cache where place_id = 'p1'), 1::bigint, 'putting again replaces the row');
update public.places_cache set fetched_at = now() - interval '23 hours 59 minutes';
select is(public.places_cache_get('p1', 'rating,userRatingCount'), '{"rating": 4.6}'::jsonb, 'still a hit just inside 24 hours');
update public.places_cache set fetched_at = now() - interval '24 hours 1 minute';
select is(public.places_cache_get('p1', 'rating,userRatingCount'), null::jsonb, 'a miss after 24 hours');
select is(private.purge_places_cache(), 1, 'the hourly purge blanks the expired answer');
select is((select data from public.places_cache where place_id = 'p1'), null::jsonb, 'only the place ID stays');
select is(private.purge_places_cache(), 0, 'a second purge finds nothing');

select * from finish();
rollback;
