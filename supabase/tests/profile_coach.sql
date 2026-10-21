-- P0.8-09 part A: the Profile Coach checklist and its tasks (K-136, K-143, K-126). The weekly read keeps three numbers; the
-- checklist is done / todo / unknown / later; a gap found twice is one task; a mock read makes no task; Essentials and Pro
-- see the checklist and a business without a plan does not; the database says when the profile is due to be read.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

\ir _fixtures.psql

-- LA (..c1): active, reachable, Pro. Owner A ..a1.
update public.locations set consent_at = now(), access_granted_at = now(), google_account_id = 'accounts/test',
  google_location_id = 'locations/mock-coach', status = 'active', country = 'GB', time_zone = 'Europe/London', concierge = false
 where id = '00000000-0000-4000-8000-0000000000c1';
delete from public.knowledge_facts where location_id = '00000000-0000-4000-8000-0000000000c1' and (key = 'service' or slot = 'profile.website');

create function pg_temp.items() returns jsonb language sql as $$
  select jsonb_object_agg(i ->> 'id', i ->> 'status') from jsonb_array_elements(public.coach_checklist('00000000-0000-4000-8000-0000000000c1') -> 'items') i
$$;
create function pg_temp.open_coach() returns integer language sql as $$
  select count(*)::int from public.tasks where location_id = '00000000-0000-4000-8000-0000000000c1' and dedupe_key like 'profile\_gap:coach\_%'
     and state in ('open', 'snoozed', 'approved', 'publishing')
$$;
create function pg_temp.put(p_desc int, p_cats int, p_attrs int, p_source text) returns void language sql as $$
  select public.coach_profile_put('00000000-0000-4000-8000-0000000000c1', p_desc, p_cats, p_attrs, p_source)
$$;

-- Who can run what -----------------------------------------------------------------------------------------------------------

select ok((select bool_and(not has_function_privilege('anon', f, 'execute') and not has_function_privilege('authenticated', f, 'execute')
                           and has_function_privilege('service_role', f, 'execute'))
             from unnest(array['public.coach_read_due(uuid)', 'public.coach_profile_put(uuid,integer,integer,integer,text)']) f),
  'the weekly read runs for the service role only');
select ok(has_function_privilege('authenticated', 'public.coach_checklist(uuid)', 'execute')
      and not has_function_privilege('anon', 'public.coach_checklist(uuid)', 'execute'), 'only signed-in members read the checklist');
select ok(not has_table_privilege('authenticated', 'public.coach_profile', 'select') and not has_table_privilege('anon', 'public.coach_profile', 'select'),
  'the numbers table is closed to the browser');
select ok(not has_function_privilege('authenticated', 'private.coach_status(uuid)', 'execute')
      and not has_function_privilege('authenticated', 'private.coach_tasks(uuid)', 'execute')
      and not has_function_privilege('authenticated', 'private.feature_plan(uuid)', 'execute'), 'the private functions are closed');

-- Before the first read ------------------------------------------------------------------------------------------------------------

select is(public.coach_read_due('00000000-0000-4000-8000-0000000000c1'), true, 'a reachable business on a plan is due its first read');
select is(pg_temp.items(),
  '{"description": "unknown", "categories": "unknown", "services": "todo", "attributes": "unknown", "photos": "later", "service_area": "unknown", "website_tracking": "later", "website_match": "later"}'::jsonb,
  'nothing is asserted about what Kabsi has not read; the services come from Business Knowledge');
select is(jsonb_array_length(public.coach_checklist('00000000-0000-4000-8000-0000000000c1') -> 'items'), 8, 'eight items, in a fixed order');
select is((select string_agg(i ->> 'id', ',') from jsonb_array_elements(public.coach_checklist('00000000-0000-4000-8000-0000000000c1') -> 'items') i),
  'description,categories,services,attributes,photos,service_area,website_tracking,website_match', 'the order');

-- A mock read shows the numbers as not checked yet and makes no task --------------------------------------------------------------
select pg_temp.put(120, 0, 0, 'mock');
select is(public.coach_read_due('00000000-0000-4000-8000-0000000000c1'), false, 'read this week: not due');
select is(pg_temp.items() ->> 'description', 'unknown', 'a mock number is an example, not a finding');
select private.detect_profile_gaps('00000000-0000-4000-8000-0000000000c1');
select is(pg_temp.open_coach(), 1, 'only the services gap, which Business Knowledge answers on its own, makes a task');

-- A live read: every gap is one task, found twice is still one -----------------------------------------------------------------------
select pg_temp.put(120, 0, 0, 'live');
select is(pg_temp.items() ->> 'description', 'todo', 'a short description is a gap');
select is(pg_temp.items() ->> 'categories', 'todo', 'no extra category is a gap');
select is(pg_temp.items() ->> 'attributes', 'todo', 'no profile detail is a gap');
select private.detect_profile_gaps('00000000-0000-4000-8000-0000000000c1');
select private.detect_profile_gaps('00000000-0000-4000-8000-0000000000c1');
select is(pg_temp.open_coach(), 4, 'description, categories, services and attributes: one task each, however often it is found');
select is((select row(kind, priority, title)::text from public.tasks where location_id = '00000000-0000-4000-8000-0000000000c1'
             and dedupe_key = 'profile_gap:coach_description'), row('profile_gap', 'recommended', 'Make your profile description longer')::text, 'the description task');
select is((select private.task_path(kind, source_id) from public.tasks where location_id = '00000000-0000-4000-8000-0000000000c1'
             and dedupe_key = 'profile_gap:coach_categories'), '/app/coach', 'a coach task opens the Coach');
select is((select private.task_path('profile_gap', 'basics')), '/app/shield', 'the older gaps open where they did');
select ok(not exists (select 1 from public.tasks where location_id = '00000000-0000-4000-8000-0000000000c1' and dedupe_key like 'profile\_gap:coach\_%'
                       and (title ~ '[!]' or why ~ '[!]' or title ~ E'[\u2013\u2014]' or why ~ E'[\u2013\u2014]' or lower(why) ~ 'keyword')),
  'no exclamation marks, dashes or keywords');
select lives_ok($$ select pg_temp.put(0, 0, 0, 'live') $$, 'a read replaces the last one');
select is((select count(*)::int from public.coach_profile where location_id = '00000000-0000-4000-8000-0000000000c1'), 1, 'one row per business');

-- Filling a gap closes its task -------------------------------------------------------------------------------------------------------------
select pg_temp.put(300, 2, 5, 'live');
insert into public.knowledge_facts (location_id, slot, key, value, status, source, confirmed_by, confirmed_at, uses)
values ('00000000-0000-4000-8000-0000000000c1', 'card.services', 'service', '{"display": "Coffee and pastries"}', 'verified', 'owner',
        '00000000-0000-4000-8000-0000000000a1', now(), array['replies']);
select is(pg_temp.items() ->> 'description', 'done', 'a long description is done');
select is(pg_temp.items() ->> 'services', 'done', 'a confirmed service is done');
select private.detect_profile_gaps('00000000-0000-4000-8000-0000000000c1');
select is(pg_temp.open_coach(), 0, 'every coach task closes');
select is((select count(*)::int from public.tasks where location_id = '00000000-0000-4000-8000-0000000000c1' and dedupe_key like 'profile\_gap:coach\_%' and state = 'done'),
  4, 'as done');

-- Service area and website tag --------------------------------------------------------------------------------------------------------------------
select is(pg_temp.items() ->> 'service_area', 'unknown', 'service area stays a question until the owner answers');
insert into public.knowledge_facts (location_id, slot, key, value, status, source, confirmed_by, confirmed_at, uses)
values ('00000000-0000-4000-8000-0000000000c1', 'profile.service_area', 'service_area', '{"display": "Beirut"}', 'verified', 'owner',
        '00000000-0000-4000-8000-0000000000a1', now(), array['profile']);
select is(pg_temp.items() ->> 'service_area', 'done', 'and is done once they have');
select is(pg_temp.items() ->> 'website_tracking', 'later', 'no website: nothing to tag yet');
insert into public.knowledge_facts (location_id, slot, key, value, status, source, uses)
values ('00000000-0000-4000-8000-0000000000c1', 'profile.website', 'website', '{"display": "https://kabsi-coffee.example"}', 'needs_confirmation', 'google', array['profile']);
select is(pg_temp.items() ->> 'website_tracking', 'todo', 'a website link without the tag is a gap');
select private.detect_profile_gaps('00000000-0000-4000-8000-0000000000c1');
select is(pg_temp.open_coach(), 1, 'one task for it');
update public.knowledge_facts set value = '{"display": "https://kabsi-coffee.example/?utm_source=google&utm_medium=organic&utm_campaign=gbp"}'
 where location_id = '00000000-0000-4000-8000-0000000000c1' and slot = 'profile.website';
select is(pg_temp.items() ->> 'website_tracking', 'done', 'with the tag it is done');

-- When the profile is read -----------------------------------------------------------------------------------------------------------------------------
update public.coach_profile set read_at = now() - interval '8 days' where location_id = '00000000-0000-4000-8000-0000000000c1';
select is(public.coach_read_due('00000000-0000-4000-8000-0000000000c1'), true, 'a week later it is due again');
update public.locations set concierge = true, google_location_id = 'locations/concierge-coach' where id = '00000000-0000-4000-8000-0000000000c1';
select is(public.coach_read_due('00000000-0000-4000-8000-0000000000c1'), false, 'a concierge profile is never read');
select is(private.coach_tasks('00000000-0000-4000-8000-0000000000c1'), '{}'::text[], 'and has no coach tasks');
update public.locations set concierge = false, google_location_id = 'locations/mock-coach' where id = '00000000-0000-4000-8000-0000000000c1';

-- Plans: Pro sees the checklist (the Essentials value cannot be stored until P0.4-07); no plan sees nothing (K-126) ---------------------------------------------------------------------------------------
select is(public.coach_checklist('00000000-0000-4000-8000-0000000000c1') ->> 'locked', 'false', 'Pro sees the checklist');
select is(public.coach_checklist('00000000-0000-4000-8000-0000000000c1') ->> 'pro', 'true', 'and the Pro actions are on');
update public.subscriptions s set state = 'cancelled', current_period_end = now() - interval '30 days', trial_ends_at = now() - interval '40 days',
  grace_ends_at = now() - interval '20 days' from public.locations l
 where l.id = '00000000-0000-4000-8000-0000000000c1' and s.organization_id = l.organization_id;
select is(public.coach_checklist('00000000-0000-4000-8000-0000000000c1') ->> 'locked', 'true', 'a business without a plan sees no checklist');
select is(public.coach_checklist('00000000-0000-4000-8000-0000000000c1') -> 'items', '[]'::jsonb, 'and no items');
select is(public.coach_read_due('00000000-0000-4000-8000-0000000000c1'), false, 'and its profile is not read');
select is(private.coach_tasks('00000000-0000-4000-8000-0000000000c1'), '{}'::text[], 'and gets no coach tasks');

-- Who may read the checklist ---------------------------------------------------------------------------------------------------------------------------------------
update public.subscriptions s set plan = 'pro', state = 'active', current_period_end = null from public.locations l
 where l.id = '00000000-0000-4000-8000-0000000000c1' and s.organization_id = l.organization_id;
select tests.act_as('00000000-0000-4000-8000-0000000000a1');
select lives_ok($$ select public.coach_checklist('00000000-0000-4000-8000-0000000000c1') $$, 'the owner reads it');
reset role;
select tests.act_as('00000000-0000-4000-8000-0000000000b1');
select throws_ok($$ select public.coach_checklist('00000000-0000-4000-8000-0000000000c1') $$, '42501', null, 'a stranger cannot');
reset role;

select * from finish();
rollback;
