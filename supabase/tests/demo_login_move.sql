-- P0.1-06c: the demo login moves to hello+demo@kabsi.co by changing the address of the same user. Runs the move again
-- inside this transaction from an invented old address, so the path the live database took is covered here too.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

\ir _fixtures.psql

select is(public.demo_login_email(), 'hello+demo@kabsi.co', 'the migration set the demo login to hello+demo@kabsi.co');
select ok(not has_function_privilege(r, 'private.move_demo_login(text)', 'execute'), r || ' cannot run move_demo_login')
  from unnest(array['anon', 'authenticated', 'service_role']) r;

-- An invented old demo login with an email identity, a membership, one demo email and one Slack line.
update public.app_settings set value = 'old.demo+x@example.test' where key = 'demo_login_email';
insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-0000000000d9', 'authenticated', 'authenticated',
  'Old.Demo+x@example.test', now(), '{}', '{}', now(), now());
insert into auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at)
values ('00000000-0000-4000-8000-0000000000d9', '00000000-0000-4000-8000-0000000000d9',
  '{"sub": "00000000-0000-4000-8000-0000000000d9", "email": "old.demo+x@example.test"}', 'email', now(), now());
insert into public.locations (id, name, is_demo) values ('00000000-0000-4000-8000-0000000000c9', 'Invented Demo Cafe', true);
insert into public.location_members (location_id, user_id, role)
values ('00000000-0000-4000-8000-0000000000c9', '00000000-0000-4000-8000-0000000000d9', 'owner');
insert into public.emails (location_id, kind, to_address, subject, status, dedupe_key)
values ('00000000-0000-4000-8000-0000000000c9', 'weekly_report', 'old.demo+x@example.test', 'Your week', 'sent',
  'weekly:c9:OLD.DEMO+x@example.test');
insert into public.ops_events (kind, channel, title) values ('signup', 'customers', 'New account: old.demo+x@example.test');

select ok(public.is_demo_user('00000000-0000-4000-8000-0000000000d9'), 'before the move the invented user is the demo login');

select private.move_demo_login('hello+demo@kabsi.co');

select is(public.demo_login_email(), 'hello+demo@kabsi.co', 'the setting holds the new address');
select is((select email from auth.users where id = '00000000-0000-4000-8000-0000000000d9'), 'hello+demo@kabsi.co',
  'the same user now has the new address');
select is((select identity_data ->> 'email' from auth.identities where user_id = '00000000-0000-4000-8000-0000000000d9'),
  'hello+demo@kabsi.co', 'its email identity has the new address');
select ok(public.is_demo_user('00000000-0000-4000-8000-0000000000d9'), 'the same user is still the demo login');
select is((select count(*)::int from public.location_members where user_id = '00000000-0000-4000-8000-0000000000d9'), 1,
  'its membership is untouched');
select is((select count(*)::int from public.emails where location_id = '00000000-0000-4000-8000-0000000000c9'
             and lower(to_address) is distinct from public.demo_login_email()), 0,
  'no demo email row has a recipient other than the new address');
select is(
  (select count(*)::int from public.emails where to_address || subject || coalesce(dedupe_key, '') ilike '%old.demo+x%')
  + (select count(*)::int from public.ops_events where title ilike '%old.demo+x%')
  + (select count(*)::int from auth.users where email ilike '%old.demo+x%')
  + (select count(*)::int from auth.identities where identity_data::text ilike '%old.demo+x%'),
  0, 'no row keeps the old address');
select is((select count(*)::int from public.locations where id = '00000000-0000-4000-8000-0000000000c9'), 1,
  'the demo business is untouched');

-- A second run is a no-op, and the move refuses an address another account already has.
select lives_ok($$select private.move_demo_login('hello+demo@kabsi.co')$$, 'running the move again is a no-op');
select throws_ok($$select private.move_demo_login('not an address')$$, 'P0001', null, 'a malformed address is refused');
update public.app_settings set value = 'old.demo+y@example.test' where key = 'demo_login_email';
select throws_ok($$select private.move_demo_login('stranger@example.test')$$, 'P0001', null,
  'the move refuses an address another account already uses');

select * from finish();
rollback;
