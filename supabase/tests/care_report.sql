-- P0.5-04: the Weekly Care Report's counts (K-28, K-72, K-40). Kabsi's own counts are made from the audit log in one function:
-- real actions only, each publication once, only the window asked for, only the business asked for. What needs the owner and
-- the Coach's plan are three lines at most. Google's numbers leave a report copy after 30 days and Kabsi's counts stay.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

\ir _fixtures.psql

-- LA (..c1): active, Pro. The window is one hour either side of now.
update public.locations set consent_at = now(), access_granted_at = now(), google_account_id = 'accounts/test',
  google_location_id = 'locations/mock-care', status = 'active', time_zone = 'Europe/London', concierge = false
 where id = '00000000-0000-4000-8000-0000000000c1';
delete from public.tasks where location_id = '00000000-0000-4000-8000-0000000000c1';

create function pg_temp.counts() returns jsonb language sql as $$
  select public.care_report_inputs('00000000-0000-4000-8000-0000000000c1', now() - interval '1 hour', now() + interval '1 hour', 'Europe/London') -> 'counts'
$$;
create function pg_temp.audit(p_action text, p_object text, p_object_id text, p_result text, p_pub text default null) returns void language sql as $$
  select private.audit('system', null, p_action, '00000000-0000-4000-8000-0000000000c1', p_object, p_object_id, null,
    case when p_pub is not null then jsonb_build_object('publication_id', p_pub) end, 'system', p_result)
$$;

-- Who can run what ----------------------------------------------------------------------------------------------------------------------------

select ok((select bool_and(not has_function_privilege('anon', f, 'execute') and not has_function_privilege('authenticated', f, 'execute')
                           and has_function_privilege('service_role', f, 'execute'))
             from unnest(array['public.care_report_inputs(uuid,timestamptz,timestamptz,text)', 'public.clear_old_report_numbers()']) f),
  'the report builder runs for the service role only');
select throws_ok($$ select public.care_report_inputs('00000000-0000-4000-8000-0000000000ff', now(), now(), 'UTC') $$, 'P0001', 'unknown_location', 'an unknown business is refused');

-- The counts ------------------------------------------------------------------------------------------------------------------------------------

select is(pg_temp.counts(), '{"changes_found": 0, "changes_kept": 0, "hours_updates": 0, "photo_batches": 0, "profile_checks": 0, "posts_published": 0, "profile_updates": 0, "changes_put_back": 0, "photos_published": 0, "replies_prepared": 0, "replies_published": 0}'::jsonb,
  'a business with no events has every count at zero');

select pg_temp.audit('reply_drafted', 'review', 'r1', 'drafted'), pg_temp.audit('reply_drafted', 'review', 'r2', 'drafted'), pg_temp.audit('reply_drafted', 'review', 'r3', 'drafted');
select pg_temp.audit('publication', 'review_reply', 'r1', 'in_review', 'pub-a'), pg_temp.audit('publication', 'review_reply', 'r1', 'live', 'pub-a'), pg_temp.audit('publication', 'review_reply', 'r2', 'live', 'pub-b');
select pg_temp.audit('publication', 'review_reply', 'r3', 'failed', 'pub-c');
select pg_temp.audit('publication', 'local_post', 'p1', 'live', 'pub-d');
select pg_temp.audit('publication', 'photo', 'ph1', 'live', 'pub-e'), pg_temp.audit('publication', 'photo', 'ph2', 'live', 'pub-f');
select pg_temp.audit('publication', 'special_hours', 's1', 'live', 'pub-g');
select pg_temp.audit('publication', 'listing_revert', 'l1', 'live', 'pub-h');
select pg_temp.audit('approval', 'local_post', 'p9', 'approved', 'pub-z');
select pg_temp.audit('google_check', 'location', 'c1', 'checked'), pg_temp.audit('google_check', 'location', 'c1', 'checked'), pg_temp.audit('google_check', 'location', 'c1', 'checked'),
       pg_temp.audit('google_check', 'location', 'c1', 'checked'), pg_temp.audit('google_check', 'location', 'c1', 'checked');
select pg_temp.audit('protection_change', 'profile_change', 'ch1', 'awaiting_review'), pg_temp.audit('protection_change', 'profile_change', 'ch1', 'awaiting_review'),
       pg_temp.audit('protection_change', 'profile_change', 'ch2', 'awaiting_review');
select pg_temp.audit('protection_change', 'profile_change', 'ch1', 'accepted'), pg_temp.audit('protection_change', 'profile_change', 'ch2', 'corrected');
-- Outside the window, and another business's: neither counts.
insert into public.audit_events (actor_type, action, location_id, object_type, object_id, result, channel, created_at)
values ('system', 'reply_drafted', '00000000-0000-4000-8000-0000000000c1', 'review', 'old', 'drafted', 'system', now() - interval '10 days');
insert into public.audit_events (actor_type, action, location_id, object_type, object_id, result, channel)
values ('system', 'reply_drafted', '00000000-0000-4000-8000-0000000000c2', 'review', 'other', 'drafted', 'system');

select is(pg_temp.counts(), '{"changes_found": 2, "changes_kept": 1, "hours_updates": 1, "photo_batches": 1, "profile_checks": 5, "posts_published": 1, "profile_updates": 1, "changes_put_back": 1, "photos_published": 2, "replies_prepared": 3, "replies_published": 2}'::jsonb,
  'real actions only: drafts, each publication once, one batch of photos for the day, changes found and how they ended');
select is((pg_temp.counts() ->> 'replies_prepared')::int, (select count(*)::int from public.audit_events where location_id = '00000000-0000-4000-8000-0000000000c1'
            and action = 'reply_drafted' and created_at >= now() - interval '1 hour' and created_at < now() + interval '1 hour'),
  'the count is the same as counting the audit log by hand');
select is((pg_temp.counts() ->> 'profile_checks')::int, (select count(*)::int from public.audit_events where location_id = '00000000-0000-4000-8000-0000000000c1' and action = 'google_check'),
  'and so are the profile checks');

-- What needs the owner and the Coach's plan ---------------------------------------------------------------------------------------------------------
select private.task_put('00000000-0000-4000-8000-0000000000c1', 'billing', 'billing', 'b1', 'urgent', 'Your plan needs attention', 'x', null, null, null, 'billing:b1');
select private.task_put('00000000-0000-4000-8000-0000000000c1', 'reconnect', 'reconnect', 'r1', 'recommended', 'Reconnect your Google profile', 'x', null, null, null, 'reconnect:r1');
select private.task_put('00000000-0000-4000-8000-0000000000c1', 'profile_gap', 'profile_gap', 'photos', 'nice', 'Add photos of your business', 'x', null, null, null, 'profile_gap:photos');
select private.task_put('00000000-0000-4000-8000-0000000000c1', 'profile_gap', 'profile_gap', 'basics', 'recommended', 'Complete your profile basics', 'x', null, null, null, 'profile_gap:basics');
select private.task_put('00000000-0000-4000-8000-0000000000c1', 'profile_gap', 'profile_gap', 'coach_description', 'recommended', 'Make your profile description longer', 'x', null, null, null, 'profile_gap:coach_description');
select private.task_put('00000000-0000-4000-8000-0000000000c1', 'profile_gap', 'profile_gap', 'coach_categories', 'nice', 'Add more categories', 'x', null, null, null, 'profile_gap:coach_categories');

-- Tasks made in one transaction share a time; give each its own so the order within a priority is the order they came.
update public.tasks set created_at = now() - interval '5 minutes' where dedupe_key = 'billing:b1';
update public.tasks set created_at = now() - interval '4 minutes' where dedupe_key = 'reconnect:r1';
update public.tasks set created_at = now() - interval '3 minutes' where dedupe_key = 'profile_gap:basics';
update public.tasks set created_at = now() - interval '2 minutes' where dedupe_key = 'profile_gap:coach_description';
update public.tasks set created_at = now() - interval '1 minute' where dedupe_key = 'profile_gap:coach_categories';
create function pg_temp.inputs() returns jsonb language sql as $$
  select public.care_report_inputs('00000000-0000-4000-8000-0000000000c1', now() - interval '1 hour', now() + interval '1 hour', 'Europe/London')
$$;
select is(jsonb_array_length(pg_temp.inputs() -> 'needs'), 3, 'at most three lines need the owner');
select is((select jsonb_agg(l ->> 'title') from jsonb_array_elements(pg_temp.inputs() -> 'needs') l),
  '["Your plan needs attention", "Reconnect your Google profile", "Complete your profile basics"]'::jsonb, 'urgent first, then recommended, the Coach''s gaps not among them');
select is((pg_temp.inputs() ->> 'needs_total')::int, 4, 'and the total says there is one more');
select is((select jsonb_agg(l ->> 'path') from jsonb_array_elements(pg_temp.inputs() -> 'needs') l), '["/app/plan", "/app/settings", "/app/shield"]'::jsonb, 'each with the page it opens');
select is((select jsonb_agg(l ->> 'title') from jsonb_array_elements(pg_temp.inputs() -> 'plan') l),
  '["Make your profile description longer", "Add more categories"]'::jsonb, 'the Growth agent''s plan is the Coach''s open gaps');
update public.subscriptions s set state = 'cancelled', current_period_end = now() - interval '30 days', trial_ends_at = now() - interval '40 days',
  grace_ends_at = now() - interval '20 days' from public.locations l
 where l.id = '00000000-0000-4000-8000-0000000000c1' and s.organization_id = l.organization_id;
select is(pg_temp.inputs() -> 'plan', '[]'::jsonb, 'a business without a plan has no Coach plan in its report');

-- Google's numbers leave a copy after 30 days ---------------------------------------------------------------------------------------------------------------
insert into public.weekly_reports (location_id, week_of, data, created_at) values
  ('00000000-0000-4000-8000-0000000000c1', current_date - 40, '{"care": {"things": 3}, "activity": {"calls": {"this": 4}}, "terms": {"items": []}, "rating": 4.5}', now() - interval '40 days'),
  ('00000000-0000-4000-8000-0000000000c1', current_date - 3, '{"care": {"things": 5}, "activity": {"calls": {"this": 7}}, "terms": {"items": []}}', now() - interval '3 days');
select is(public.clear_old_report_numbers(), 1, 'one old copy is cleaned');
select is((select data from public.weekly_reports where location_id = '00000000-0000-4000-8000-0000000000c1' and week_of = current_date - 40),
  '{"care": {"things": 3}, "rating": 4.5}'::jsonb, 'it keeps Kabsi''s counts and drops Google''s numbers');
select is((select data ? 'activity' and data ? 'terms' from public.weekly_reports where location_id = '00000000-0000-4000-8000-0000000000c1' and week_of = current_date - 3), true,
  'a recent copy keeps them');
select is(public.clear_old_report_numbers(), 0, 'and cleaning again changes nothing');

select * from finish();
rollback;
