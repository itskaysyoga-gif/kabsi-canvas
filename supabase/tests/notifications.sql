-- P0.4-09: the notification engine's tables and functions (K-46). A person reads only their own notices; a member of
-- one business never reads or changes another's; staff of a business are told nothing; the categories that stay on
-- refuse "off"; the browser never writes the tables; the engine finds its recipients without staff; the job that sends
-- held and digested email is offered only once the engine is switched on.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

\ir _fixtures.psql

-- Personas on top of the fixtures: manager MA ..a4 and staff SA ..a5 of the victim business LA (owner A ..a1).
insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
select '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email, now(), '{}', '{}', now(), now()
from (values ('00000000-0000-4000-8000-0000000000a4'::uuid, 'victim-manager@example.test'),
             ('00000000-0000-4000-8000-0000000000a5'::uuid, 'victim-staff-member@example.test')) as u(id, email);
insert into public.location_members (location_id, user_id, role) values
  ('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000a4', 'manager'),
  ('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000a5', 'staff');

-- 1. Shape and privileges ----------------------------------------------------------------------------------------------
select has_table('public', 'notifications', 'notifications exists');
select has_table('public', 'notification_preferences', 'notification_preferences exists');
select ok((select relrowsecurity from pg_class where oid = 'public.notifications'::regclass), 'RLS is on for notifications');
select ok((select relrowsecurity from pg_class where oid = 'public.notification_preferences'::regclass), 'RLS is on for notification_preferences');
select is(
  (select coalesce(array_agg(r || ':' || p order by r, p), '{}') from unnest(array['anon', 'authenticated']) r,
     unnest(array['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE']) p
   where has_table_privilege(r, 'public.notifications', p) or has_table_privilege(r, 'public.notification_preferences', p)),
  '{}'::text[], 'the browser cannot write either table');
select ok(not has_table_privilege('anon', 'public.notifications', 'select'), 'anon cannot read notifications');
select ok(not has_function_privilege('authenticated', 'public.notification_recipients(uuid,text[])', 'execute'), 'authenticated cannot ask who to tell');
select ok(has_function_privilege('service_role', 'public.notification_recipients(uuid,text[])', 'execute'), 'the service role can');

-- 2. A person reads only their own notices ------------------------------------------------------------------------------
select tests.act_as('00000000-0000-4000-8000-0000000000a1');
select is((select count(*) from public.notifications where location_id = '00000000-0000-4000-8000-0000000000c1'), 1::bigint, 'the owner reads their own notice');
select is(public.list_my_notifications('00000000-0000-4000-8000-0000000000c1') -> 'unread', '1'::jsonb, 'the bell counts one unread');
select is(public.list_my_notifications('00000000-0000-4000-8000-0000000000c1') -> 'items' -> 0 ->> 'title', 'Victim notice', 'and shows its title');
reset role;

select tests.act_as('00000000-0000-4000-8000-0000000000a4');
select is((select count(*) from public.notifications), 0::bigint, 'the manager of the same business reads none of the owner''s notices');
select is(public.list_my_notifications('00000000-0000-4000-8000-0000000000c1') -> 'unread', '0'::jsonb, 'the manager''s bell is empty');
select is(public.mark_notifications_read('00000000-0000-4000-8000-0000000000c1'), 0, 'the manager cannot mark the owner''s notice read');
reset role;

select tests.act_as('00000000-0000-4000-8000-0000000000b2');
select is((select count(*) from public.notifications), 0::bigint, 'the owner of another business reads none');
select throws_ok($$ select public.list_my_notifications('00000000-0000-4000-8000-0000000000c1') $$, '42501', null, 'and cannot open the victim''s bell');
select throws_ok($$ select public.set_notification_pref('00000000-0000-4000-8000-0000000000c1', 'review_new', 'email', 'off') $$, '42501', null, 'or change the victim''s choices');
select throws_ok($$ select public.my_notification_prefs('00000000-0000-4000-8000-0000000000c1') $$, '42501', null, 'or read them');
select is(public.list_my_notifications('00000000-0000-4000-8000-0000000000c2') -> 'unread', '0'::jsonb, 'their own bell works');
reset role;

select tests.act_as('00000000-0000-4000-8000-0000000000a5');
select throws_ok($$ select public.list_my_notifications('00000000-0000-4000-8000-0000000000c1') $$, '42501', null, 'staff of the business have no bell');
select throws_ok($$ select public.set_notification_pref('00000000-0000-4000-8000-0000000000c1', 'review_new', 'email', 'off') $$, '42501', null, 'and no choices');
reset role;

-- 3. Choices ------------------------------------------------------------------------------------------------------------
select tests.act_as('00000000-0000-4000-8000-0000000000a4');
select lives_ok($$ select public.set_notification_pref('00000000-0000-4000-8000-0000000000c1', 'review_new', 'email', 'daily_digest') $$, 'a manager sets their own choice');
select lives_ok($$ select public.set_notification_pref('00000000-0000-4000-8000-0000000000c1', 'review_new', 'email', 'instant') $$, 'and changes it');
select is(public.my_notification_prefs('00000000-0000-4000-8000-0000000000c1'),
  '[{"category": "review_new", "channel": "email", "frequency": "instant"}]'::jsonb, 'one row per category and channel');
select throws_ok($$ select public.set_notification_pref('00000000-0000-4000-8000-0000000000c1', 'access', 'email', 'off') $$, 'P0001', 'cannot_switch_off', 'Google access cannot be switched off');
select throws_ok($$ select public.set_notification_pref('00000000-0000-4000-8000-0000000000c1', 'profile_urgent', 'in_app', 'off') $$, 'P0001', 'cannot_switch_off', 'nor can urgent profile changes');
select throws_ok($$ select public.set_notification_pref('00000000-0000-4000-8000-0000000000c1', 'billing', 'email', 'off') $$, 'P0001', 'cannot_switch_off', 'nor billing');
select lives_ok($$ select public.set_notification_pref('00000000-0000-4000-8000-0000000000c1', 'weekly_report', 'email', 'off') $$, 'a category that can be switched off can');
select throws_ok($$ select public.set_notification_pref('00000000-0000-4000-8000-0000000000c1', 'review_new', 'in_app', 'daily_digest') $$, 'P0001', 'bad_frequency', 'the bell has no daily digest');
select throws_ok($$ select public.set_notification_pref('00000000-0000-4000-8000-0000000000c1', 'made_up', 'email', 'off') $$, 'P0001', 'bad_category', 'an unknown category is refused');
select throws_ok($$ select public.set_notification_pref('00000000-0000-4000-8000-0000000000c1', 'review_new', 'sms', 'off') $$, 'P0001', 'bad_channel', 'an unknown channel is refused');
reset role;
select is((select frequency from public.notification_preferences where user_id = '00000000-0000-4000-8000-0000000000a1' and category = 'review_new'),
  'off', 'the owner''s own choice was not touched by the manager''s');
select is((select frequency from public.notification_preferences where user_id = '00000000-0000-4000-8000-0000000000a4' and category = 'review_new'),
  'instant', 'and the manager''s own choice is kept');

-- 4. The bell ------------------------------------------------------------------------------------------------------------
select tests.act_as('00000000-0000-4000-8000-0000000000a1');
select is(public.mark_notifications_read('00000000-0000-4000-8000-0000000000c1'), 1, 'the owner marks their notice read');
select is(public.list_my_notifications('00000000-0000-4000-8000-0000000000c1') -> 'unread', '0'::jsonb, 'nothing unread');
select is(public.mark_notifications_read('00000000-0000-4000-8000-0000000000c1'), 0, 'and nothing changes the second time');
select throws_ok($$ insert into public.notifications (location_id, user_id, to_address, category, kind, dedupe_key, title)
  values ('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000a1', 'x@example.test', 'review_new', 'review_new', 'forged', 'Forged') $$,
  '42501', null, 'the browser cannot write a notice');
reset role;

-- 5. One record per event and address -----------------------------------------------------------------------------------
select throws_ok($$ insert into public.notifications (location_id, to_address, category, kind, dedupe_key, title)
  values ('00000000-0000-4000-8000-0000000000c1', 'victim-owner@example.test', 'review_new', 'review_new', 'victim-notice', 'Again') $$,
  '23505', null, 'the same event for the same address is recorded once');
select lives_ok($$ insert into public.notifications (location_id, to_address, category, kind, dedupe_key, title)
  values ('00000000-0000-4000-8000-0000000000c1', 'victim-manager@example.test', 'review_new', 'review_new', 'victim-notice', 'Other person') $$,
  'and once for each person');
select throws_ok($$ insert into public.notifications (location_id, to_address, category, kind, dedupe_key, title, link)
  values ('00000000-0000-4000-8000-0000000000c1', 'a@example.test', 'review_new', 'review_new', 'k1', 'T', 'https://evil.example') $$,
  '23514', null, 'a notice links only to a page in the app');

-- 6. Who the engine tells ------------------------------------------------------------------------------------------------
update public.locations set alert_emails = array['front-desk@example.test', 'victim-owner@example.test']
 where id = '00000000-0000-4000-8000-0000000000c1';
select is(
  (select array_agg(email || ':' || role order by email) from public.notification_recipients('00000000-0000-4000-8000-0000000000c1', array['owner', 'manager'])),
  array['front-desk@example.test:alert', 'victim-manager@example.test:manager', 'victim-owner@example.test:owner'],
  'owners, managers and the alert addresses; never staff; an alert address that is a member''s is not listed twice');
select is(
  (select array_agg(email order by email) from public.notification_recipients('00000000-0000-4000-8000-0000000000c1', array['owner'])),
  array['front-desk@example.test', 'victim-owner@example.test'], 'owners only: the owner and the alert address');

-- 7. The job ------------------------------------------------------------------------------------------------------------
select is((select value from public.app_settings where key = 'notify_due'), 'off', 'the engine job starts switched off');
select private.produce_jobs();
select is((select count(*) from public.jobs where kind = 'notify_due'), 0::bigint, 'with it off no notify_due job is offered');
update public.app_settings set value = 'on' where key = 'notify_due';
select private.produce_jobs();
select is((select count(*) from public.jobs where kind = 'notify_due'), 1::bigint, 'switched on, one notify_due job is offered');
select private.produce_jobs();
select is((select count(*) from public.jobs where kind = 'notify_due'), 1::bigint, 'and not a second while it waits');

update public.locations set status = 'active', consent_at = now(), access_granted_at = now(), google_location_id = 'locations/mock-victim',
  is_demo = false, emails_paused_until = null where id = '00000000-0000-4000-8000-0000000000c1';
update public.reviews set state = 'drafted', risk = 'low', star_rating = 5, notified_at = null, is_backlog = false
 where id = '00000000-0000-4000-8000-0000000000e1';
select private.produce_jobs();
select is((select count(*) from public.jobs where kind = 'notify_owner' and location_id = '00000000-0000-4000-8000-0000000000c1'), 1::bigint,
  'with the engine on, a drafted low-risk review is handed to it at once, whatever the hour');

select * from finish();
rollback;
