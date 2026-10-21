-- P0.4-08: the one suppression list for email (K-118). Nobody but the service role reads or writes it; an unsubscribe
-- stops one category for one address and, for a member of the business, also shows as their own choice in Settings;
-- what cannot be switched off cannot be unsubscribed.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

\ir _fixtures.psql

select has_table('public', 'email_suppressions', 'email_suppressions exists');
select ok((select relrowsecurity from pg_class where oid = 'public.email_suppressions'::regclass), 'RLS is on');
select is(
  (select coalesce(array_agg(r || ':' || p order by r, p), '{}') from unnest(array['anon', 'authenticated']) r,
     unnest(array['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE']) p
   where has_table_privilege(r, 'public.email_suppressions', p)),
  '{}'::text[], 'anon and authenticated have no privilege on the list');
select ok(not has_function_privilege('authenticated', 'public.apply_unsubscribe(text,uuid,text)', 'execute'), 'a signed-in user cannot unsubscribe someone else');
select ok(not has_function_privilege('anon', 'public.apply_unsubscribe(text,uuid,text)', 'execute'), 'nor can anon');
select ok(has_function_privilege('service_role', 'public.apply_unsubscribe(text,uuid,text)', 'execute'), 'the email function (service role) can');

-- An unsubscribe of the victim owner (a member): the suppression and the owner's own choice.
select lives_ok($$ select public.apply_unsubscribe('Victim-Owner@Example.test', '00000000-0000-4000-8000-0000000000c1', 'weekly_report') $$, 'an unsubscribe is accepted');
select is((select count(*) from public.email_suppressions where address = 'victim-owner@example.test' and scope = 'weekly_report' and reason = 'unsubscribe'), 1::bigint,
  'the address is suppressed for that category only, in lower case');
select is((select count(*) from public.email_suppressions where address = 'victim-owner@example.test' and scope = '*'), 0::bigint, 'not for every email');
select is((select frequency from public.notification_preferences where user_id = '00000000-0000-4000-8000-0000000000a1'
            and location_id = '00000000-0000-4000-8000-0000000000c1' and category = 'weekly_report' and channel = 'email'),
  'off', 'the member''s own choice in Settings is off too');
select lives_ok($$ select public.apply_unsubscribe('victim-owner@example.test', '00000000-0000-4000-8000-0000000000c1', 'weekly_report') $$, 'a second unsubscribe changes nothing');
select is((select count(*) from public.email_suppressions where address = 'victim-owner@example.test'), 1::bigint, 'still one row');

-- An address that is nobody's account: only the suppression.
select lives_ok($$ select public.apply_unsubscribe('someone@example.test', null, 'trial') $$, 'an address with no account can unsubscribe');
select is((select count(*) from public.email_suppressions where address = 'someone@example.test' and scope = 'trial'), 1::bigint, 'and is suppressed');

-- What cannot be switched off cannot be unsubscribed.
select throws_ok($$ select public.apply_unsubscribe('victim-owner@example.test', '00000000-0000-4000-8000-0000000000c1', 'access') $$, 'P0001', 'cannot_unsubscribe', 'Google access cannot');
select throws_ok($$ select public.apply_unsubscribe('victim-owner@example.test', '00000000-0000-4000-8000-0000000000c1', 'billing') $$, 'P0001', 'cannot_unsubscribe', 'nor billing');
select throws_ok($$ select public.apply_unsubscribe('victim-owner@example.test', '00000000-0000-4000-8000-0000000000c1', 'profile_urgent') $$, 'P0001', 'cannot_unsubscribe', 'nor urgent profile changes');

-- Rows must be lower case and scoped.
select throws_ok($$ insert into public.email_suppressions (address, scope, reason) values ('Upper@Example.test', '*', 'bounce') $$, '23514', null, 'an address is stored in lower case');
select throws_ok($$ insert into public.email_suppressions (address, scope, reason) values ('a@example.test', 'Bad Scope', 'bounce') $$, '23514', null, 'a scope is * or a category');
select throws_ok($$ insert into public.email_suppressions (address, scope, reason) values ('a@example.test', '*', 'because') $$, '23514', null, 'a reason is bounce, complaint or unsubscribe');

select * from finish();
rollback;
