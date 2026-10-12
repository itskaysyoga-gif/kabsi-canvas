-- P0.4-01: free snapshot and Google Profile Check. The email proof table, the limiter give-back, the kill switch at a cap
-- of 0 (Places paused), and the rule that no snapshot data outlives the 24 hour cache. now() is fixed inside this
-- transaction.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

\ir _fixtures.psql

-- Shape and privileges.
select ok((select relrowsecurity from pg_class where oid = 'public.profile_check_emails'::regclass), 'RLS is on for profile_check_emails');
select is(
  (select coalesce(array_agg(r || ':' || p order by r, p), '{}')
     from unnest(array['anon', 'authenticated', 'service_role']) r, unnest(array['UPDATE', 'DELETE', 'TRUNCATE']) p
    where has_table_privilege(r, 'public.profile_check_emails', p)),
  '{}'::text[], 'nobody updates or removes email proof rows through the API roles');
select is(
  (select coalesce(array_agg(r order by r), '{}')
     from unnest(array['anon', 'authenticated']) r
    where has_table_privilege(r, 'public.profile_check_emails', 'SELECT') or has_table_privilege(r, 'public.profile_check_emails', 'INSERT')),
  '{}'::text[], 'anon and signed-in users cannot read or write the email proof directly');
select ok(has_table_privilege('service_role', 'public.profile_check_emails', 'INSERT')
      and has_table_privilege('service_role', 'public.profile_check_emails', 'SELECT'), 'the service role writes and reads the proof');
select ok(not has_function_privilege('anon', 'public.give_back_rate_limit(text)', 'execute')
      and not has_function_privilege('authenticated', 'public.give_back_rate_limit(text)', 'execute')
      and has_function_privilege('service_role', 'public.give_back_rate_limit(text)', 'execute'),
  'give_back_rate_limit runs for the service role only');

-- No Google content: the table holds the Place ID and the consent facts, nothing else (so nothing to outlive the cache).
select is(
  (select array_agg(column_name::text order by column_name) from information_schema.columns
    where table_schema = 'public' and table_name = 'profile_check_emails'),
  array['consent_language', 'consent_text', 'created_at', 'email', 'id', 'page', 'place_id', 'tips_opt_in'],
  'the email proof keeps the address, the Place ID, the consent words, the choice, the page and the time');

-- The proof is stored with its time; the choice, words and page are required.
insert into public.profile_check_emails (email, place_id, tips_opt_in, consent_text, page)
values ('owner@example-cafe.com', 'ChIJaaaaaaaaaaaaaaaa', true, 'Send me tips on managing my Google profile', '/google-profile-check');
select is((select created_at from public.profile_check_emails where email = 'owner@example-cafe.com'), now(), 'the time is stored with the proof');
select is((select consent_language from public.profile_check_emails where email = 'owner@example-cafe.com'), 'en', 'the language of the words is stored (English first)');
select throws_ok($$insert into public.profile_check_emails (email, place_id, tips_opt_in, consent_text, page)
  values ('x@example-cafe.com', 'ChIJaaaaaaaaaaaaaaaa', null, 'words', '/google-profile-check')$$, '23502', null, 'the choice is required');
select throws_ok($$insert into public.profile_check_emails (email, place_id, tips_opt_in, consent_text, page)
  values ('x@example-cafe.com', 'ChIJaaaaaaaaaaaaaaaa', false, null, '/google-profile-check')$$, '23502', null, 'the consent words are required');
select throws_ok($$insert into public.profile_check_emails (email, place_id, tips_opt_in, consent_text, page)
  values ('x@example-cafe.com', 'ChIJaaaaaaaaaaaaaaaa', false, 'words', 'https://elsewhere.example/')$$, '23514', null, 'the page is a path on this site');
select throws_ok($$insert into public.profile_check_emails (email, place_id, tips_opt_in, consent_text, page)
  values ('Mixed@Example-Cafe.com', 'ChIJaaaaaaaaaaaaaaaa', false, 'words', '/google-profile-check')$$, '23514', null, 'the address is stored in lower case');

-- The limiter give-back: the fourth hit in a window is refused; handing one back lets the next through.
select ok(public.hit_rate_limit('snapshot:check:t1', 3, 86400), 'hit 1');
select ok(public.hit_rate_limit('snapshot:check:t1', 3, 86400), 'hit 2');
select ok(public.hit_rate_limit('snapshot:check:t1', 3, 86400), 'hit 3');
select ok(not public.hit_rate_limit('snapshot:check:t1', 3, 86400), 'the fourth check in a day is refused');
select public.give_back_rate_limit('snapshot:check:t1');
select public.give_back_rate_limit('snapshot:check:t1');
select ok(public.hit_rate_limit('snapshot:check:t1', 3, 86400), 'after a give-back the visitor can check again');
select public.give_back_rate_limit('snapshot:check:never-used');
select is((select count(*) from public.rate_limits where key = 'snapshot:check:never-used'), 0::bigint, 'handing back an unknown key creates nothing');
select ok(public.hit_rate_limit('snapshot:check:t2', 3, 86400), 'a hit...');
select public.give_back_rate_limit('snapshot:check:t2');
select public.give_back_rate_limit('snapshot:check:t2');
select is((select hits from public.rate_limits where key = 'snapshot:check:t2'), 0, 'the count never goes below zero');

-- The kill switch at a cap of 0 (Places paused on purpose): nothing is allowed, and no Slack alert fires.
update public.app_settings set value = '0' where key = 'places_daily_cap';
select is(private.places_cap(), 0, 'a cap of 0 is a cap of 0, not "no cap"');
select is((public.places_take('details') ->> 'allowed')::boolean, false, 'the first Places request is refused at a cap of 0');
select is((public.places_take('search') ->> 'allowed')::boolean, false, 'a search is refused too');
select is((select coalesce(sum(calls), 0) from public.places_usage), 0::bigint, 'a refused request is not counted as a call');

-- Nothing outlives the cache window: an answer older than 24 hours is a miss and the hourly purge blanks it.
select public.places_cache_put('ChIJaaaaaaaaaaaaaaaa',
  'id,displayName,formattedAddress,primaryTypeDisplayName,businessStatus,rating,userRatingCount,regularOpeningHours,currentOpeningHours,nationalPhoneNumber,websiteUri,photos',
  '{"rating": 4.6}');
update public.places_cache set fetched_at = now() - interval '24 hours 1 minute';
select is(private.purge_places_cache(), 1, 'the purge blanks the expired snapshot');
select is((select count(*) from public.places_cache where data is not null and fetched_at < now() - interval '24 hours'), 0::bigint,
  'no snapshot data is stored past the 24 hour cache window');

select * from finish();
rollback;
