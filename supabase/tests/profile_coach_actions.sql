-- P0.8-09 part B: the Profile Coach's actions in the database (K-136, K-116, K-17, K-38). The website check keeps one answer per
-- business and makes a task for each thing the website says differently; the website link and the categories are the owner's
-- own edit through the one pipeline; the main category is a high-risk field (the owner, signed in, one a week); a change by
-- email link is refused; only the website and the categories can be changed from here.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

\ir _fixtures.psql

-- LA (..c1): active, reachable, Pro. Owner A ..a1, manager M ..b5 (owner approval policy only).
insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-0000000000b5', 'authenticated', 'authenticated',
        'coach-manager@example.test', now(), '{}', '{}', now(), now());
insert into public.location_members (location_id, user_id, role)
values ('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000b5', 'manager');
update public.locations set consent_at = now(), access_granted_at = now(), google_account_id = 'accounts/test',
  google_location_id = 'locations/mock-coach-b', status = 'active', country = 'GB', time_zone = 'Europe/London', concierge = false
 where id = '00000000-0000-4000-8000-0000000000c1';
update public.profile_changes set status = 'expired' where location_id = '00000000-0000-4000-8000-0000000000c1';
delete from public.knowledge_facts where location_id = '00000000-0000-4000-8000-0000000000c1' and (slot in ('profile.website', 'profile.main_category') or key = 'service');
delete from public.approval_policies where location_id = '00000000-0000-4000-8000-0000000000c1' and kind = 'profile_change';

create function pg_temp.status(p_item text) returns text language sql as $$
  select i ->> 'status' from jsonb_array_elements(private.coach_status('00000000-0000-4000-8000-0000000000c1')) i where i ->> 'id' = p_item
$$;
create function pg_temp.site_tasks() returns text language sql as $$
  select string_agg(source_id, ',' order by source_id) from public.tasks where location_id = '00000000-0000-4000-8000-0000000000c1'
     and dedupe_key like 'profile\_gap:coach\_site\_%' and state in ('open', 'snoozed', 'approved', 'publishing')
$$;
create function pg_temp.apply(p_field text, p_display text, p_raw jsonb default null, p_user text default '00000000-0000-4000-8000-0000000000a1',
  p_channel text default 'dashboard') returns jsonb language sql as $$
  select public.apply_profile_field('00000000-0000-4000-8000-0000000000c1', p_user::uuid, p_channel, p_field, p_display, p_raw)
$$;

-- Who can run what ------------------------------------------------------------------------------------------------------------

select ok((select bool_and(not has_function_privilege('anon', f, 'execute') and not has_function_privilege('authenticated', f, 'execute')
                           and has_function_privilege('service_role', f, 'execute'))
             from unnest(array['public.apply_profile_field(uuid,uuid,text,text,text,jsonb)', 'public.coach_site_check_put(uuid,text,integer,jsonb)']) f),
  'the owner edits and the website check run for the service role only');
select ok(not has_table_privilege('authenticated', 'public.coach_site_check', 'select') and not has_table_privilege('anon', 'public.coach_site_check', 'select'),
  'the website check table is closed to the browser');

-- The website match -------------------------------------------------------------------------------------------------------------------

select is(pg_temp.status('website_match'), 'later', 'no website: nothing to compare yet');
insert into public.knowledge_facts (location_id, slot, key, value, status, source, uses)
values ('00000000-0000-4000-8000-0000000000c1', 'profile.website', 'website', '{"display": "https://coach-shop.example/menu", "raw": "https://coach-shop.example/menu"}',
        'needs_confirmation', 'google', array['profile']);
select is(pg_temp.status('website_match'), 'unknown', 'a website that has not been checked says nothing');
select is(pg_temp.status('website_tracking'), 'todo', 'and has no tag');
select throws_ok($$ select public.coach_site_check_put('00000000-0000-4000-8000-0000000000c1', 'https://coach-shop.example/menu', 2, '{"name": "bogus"}') $$,
  'P0001', 'bad_result', 'an answer that is not match, mismatch or unknown is refused');
select throws_ok($$ select public.coach_site_check_put('00000000-0000-4000-8000-0000000000c1', 'https://coach-shop.example/menu', 2, '{"colour": "match"}') $$,
  'P0001', 'bad_result', 'so is a field that is not checked');
select lives_ok($$ select public.coach_site_check_put('00000000-0000-4000-8000-0000000000c1', 'https://coach-shop.example/menu', 2,
  '{"name": "match", "phone": "mismatch", "address": "unknown", "hours": "mismatch"}') $$, 'a check is kept');
select is(pg_temp.status('website_match'), 'todo', 'a mismatch is a gap');
select is((select i -> 'detail' -> 'mismatches' from jsonb_array_elements(private.coach_status('00000000-0000-4000-8000-0000000000c1')) i where i ->> 'id' = 'website_match'),
  '["hours", "phone"]'::jsonb, 'naming each one');
select private.detect_profile_gaps('00000000-0000-4000-8000-0000000000c1');
select private.detect_profile_gaps('00000000-0000-4000-8000-0000000000c1');
select is(pg_temp.site_tasks(), 'coach_site_hours,coach_site_phone', 'one task for each, however often it is found');
select is((select private.task_path(kind, source_id) from public.tasks where dedupe_key = 'profile_gap:coach_site_phone' and location_id = '00000000-0000-4000-8000-0000000000c1'),
  '/app/coach', 'opening the Coach');
select ok(not exists (select 1 from public.tasks where dedupe_key like 'profile\_gap:coach\_site\_%' and (title ~ '[!]' or why ~ '[!]' or title ~ E'[–—]' or why ~ E'[–—]')),
  'in plain words');
select is((select count(*)::int from public.coach_site_check where location_id = '00000000-0000-4000-8000-0000000000c1'), 1, 'one answer per business');
select public.coach_site_check_put('00000000-0000-4000-8000-0000000000c1', 'https://coach-shop.example/menu', 3, '{"name": "match", "phone": "match", "address": "unknown", "hours": "match"}');
select private.detect_profile_gaps('00000000-0000-4000-8000-0000000000c1');
select is(pg_temp.status('website_match'), 'done', 'once the website agrees it is done');
select is(pg_temp.site_tasks(), null, 'and the tasks close');

-- The website link --------------------------------------------------------------------------------------------------------------------------

select throws_ok($$ select pg_temp.apply('name', 'Keywords In The Name') $$, 'P0001', 'bad_field', 'a business name cannot be changed from here');
select throws_ok($$ select pg_temp.apply('phone', '+1 555 0100') $$, 'P0001', 'bad_field', 'nor a phone number');
select throws_ok($$ select pg_temp.apply('website', 'https://coach-shop.example/menu?utm_source=google', null, '00000000-0000-4000-8000-0000000000a1', 'email_link') $$,
  'P0001', 'bad_channel', 'a link in an email is never enough for a change to the profile');
select throws_ok($$ select pg_temp.apply('website', 'javascript:alert(1)') $$, 'P0001', 'bad_value', 'only a web address');
select throws_ok($$ select pg_temp.apply('website', 'https://coach-shop.example/menu?utm_source=google', null, '00000000-0000-4000-8000-0000000000b1') $$,
  'P0001', 'not_member', 'a stranger cannot');
select throws_ok($$ select pg_temp.apply('website', 'https://coach-shop.example/menu?utm_source=google', null, '00000000-0000-4000-8000-0000000000b5') $$,
  '42501', 'not_allowed_to_approve', 'a manager cannot until the owner lets managers approve profile changes (K-16)');
select is(pg_temp.apply('website', 'https://coach-shop.example/menu?utm_source=google&utm_medium=organic&utm_campaign=gbp') ->> 'publication_state', 'approved',
  'the owner approves the exact link');
select is((select row(key, status, source, confirmed_by)::text from public.knowledge_facts where location_id = '00000000-0000-4000-8000-0000000000c1'
             and slot = 'profile.website' and superseded_by is null),
  row('website', 'verified', 'owner', '00000000-0000-4000-8000-0000000000a1'::uuid)::text, 'it is the owner-approved value Protection keeps');
select is((select row(field, source, status)::text from public.profile_changes where location_id = '00000000-0000-4000-8000-0000000000c1' and field = 'website'),
  row('website', 'owner_edit', 'rejected')::text, 'and the history says the owner did it (the owner kept this value over Google''s)');
select is((select row(p.target_type, p.state, p.channel, p.approved_by)::text from public.publications p join public.profile_changes c on c.id = p.target_id
             where c.location_id = '00000000-0000-4000-8000-0000000000c1' and c.field = 'website'),
  row('listing_revert', 'approved', 'dashboard', '00000000-0000-4000-8000-0000000000a1'::uuid)::text, 'through the one pipeline, waiting out the 10 seconds');
select is(pg_temp.status('website_tracking'), 'done', 'the tag is done');
select is(pg_temp.apply('website', 'https://coach-shop.example/menu?utm_source=google&utm_medium=organic&utm_campaign=gbp') ->> 'state', 'unchanged', 'the same link again sends nothing');

-- The categories: only the owner, signed in, once a week -----------------------------------------------------------------------------------------

select throws_ok($$ select pg_temp.apply('main_category', 'Coffee shop', '{"additionalCategories": []}') $$, 'P0001', 'bad_value', 'a main category is needed');
select throws_ok($$ select pg_temp.apply('main_category', 'Coffee shop', '{"primaryCategory": {"displayName": "Coffee shop"}, "additionalCategories": [{"name": "x"}]}') $$,
  'P0001', 'bad_value', 'and each extra one has a name and a display name');
select throws_ok($$ select pg_temp.apply('main_category', 'Coffee shop', jsonb_build_object('primaryCategory', jsonb_build_object('displayName', 'Coffee shop'),
  'additionalCategories', (select jsonb_agg(jsonb_build_object('name', 'categories/gcid:c' || g, 'displayName', 'C' || g)) from generate_series(1, 10) g))) $$,
  'P0001', 'bad_value', 'at most nine');
select throws_ok($$ select pg_temp.apply('main_category', 'Coffee shop', '{"primaryCategory": {"displayName": "Coffee shop"}, "additionalCategories": [{"name": "categories/gcid:cafe", "displayName": "Cafe"}]}',
  '00000000-0000-4000-8000-0000000000b5') $$, 'P0001', 'owner_only', 'a manager never changes the categories, whatever the owner allows');
select is(pg_temp.apply('main_category', 'Coffee shop', '{"primaryCategory": {"displayName": "Coffee shop"}, "additionalCategories": [{"name": "categories/gcid:cafe", "displayName": "Cafe"}]}') ->> 'publication_state',
  'approved', 'the owner adds a category');
select is((select value -> 'raw' -> 'additionalCategories' -> 0 ->> 'displayName' from public.knowledge_facts where location_id = '00000000-0000-4000-8000-0000000000c1'
             and slot = 'profile.main_category' and superseded_by is null), 'Cafe', 'it is kept as the owner''s approved value');
select throws_like($$ select pg_temp.apply('main_category', 'Coffee shop', '{"primaryCategory": {"displayName": "Coffee shop"}, "additionalCategories": [{"name": "categories/gcid:bakery", "displayName": "Bakery"}]}') $$,
  'high_risk_wait%', 'Google gets one high-risk change a week (K-116.2)');
select is(pg_temp.apply('main_category', 'Coffee shop', '{"primaryCategory": {"displayName": "Coffee shop"}, "additionalCategories": [{"name": "categories/gcid:cafe", "displayName": "Cafe"}]}') ->> 'state',
  'unchanged', 'the same categories again send nothing');

select * from finish();
rollback;
