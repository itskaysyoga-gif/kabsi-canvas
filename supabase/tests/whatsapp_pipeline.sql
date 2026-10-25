-- Session 19 rest (master plan 30.10 point 7): the pipeline side of approving an hours change and a typed post from
-- WhatsApp. A typed post and a special-hours request become drafts; the WhatsApp channel approves them like the
-- dashboard does (10 second undo, one publication); a stranger, a bad text or bad dates are refused.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

\ir _fixtures.psql

update public.locations set consent_at = now(), access_granted_at = now(), google_account_id = 'accounts/test',
  google_location_id = 'locations/mock-victim', status = 'active'
 where id = '00000000-0000-4000-8000-0000000000c1';

-- A typed post.
create temp table tp as select public.owner_post_prepare('00000000-0000-4000-8000-0000000000c1',
  '00000000-0000-4000-8000-0000000000a1', 'Fresh sourdough every Saturday morning.', 'whatsapp') as id;
select is((select state from public.gbp_posts where id = (select id from tp)), 'draft', 'the typed post is a draft');
select is((select body from public.gbp_posts where id = (select id from tp)), 'Fresh sourdough every Saturday morning.', 'with the owner''s words');
select is((public.approve_publication('local_post', (select id from tp), '{"summary": "Fresh sourdough every Saturday morning."}'::jsonb,
  '00000000-0000-4000-8000-0000000000a1', 'whatsapp') ->> 'created')::boolean, true, 'approved on WhatsApp');
select ok((select publish_after > now() from public.publications where target_id = (select id from tp)), 'inside the 10 second undo');
select throws_ok($$ select public.owner_post_prepare('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000b1', 'Fresh sourdough every Saturday.', 'whatsapp') $$,
  'not_member', 'a stranger cannot prepare a post');
select throws_ok($$ select public.owner_post_prepare('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000a1', 'Hi', 'whatsapp') $$,
  'bad_post_text', 'too short');
select throws_ok($$ select public.owner_post_prepare('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000a1', 'Big news today!', 'whatsapp') $$,
  'house_style', 'an exclamation mark reaches the database only if the caller skipped the clean-up');
select throws_ok($$ select public.owner_post_prepare('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000a1', 'Fresh sourdough every Saturday.', 'email_link') $$,
  'bad_channel', 'only the dashboard and WhatsApp');

-- Special hours: closed next Friday.
create temp table sh as select public.special_hours_prepare('00000000-0000-4000-8000-0000000000c1',
  '00000000-0000-4000-8000-0000000000a1', current_date + 6, current_date + 6, true, null, null, 'Family event') as id;
select is((select state from public.special_hours where id = (select id from sh)), 'draft', 'the special hours are a draft');
select is((public.approve_publication('special_hours', (select id from sh), '{}'::jsonb, '00000000-0000-4000-8000-0000000000a1', 'whatsapp') ->> 'created')::boolean,
  true, 'special hours approved on WhatsApp');
select throws_ok($$ select public.special_hours_prepare('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000a1', current_date + 5, current_date + 2, true, null, null, null) $$,
  'bad_dates', 'the end before the start');
select throws_ok($$ select public.special_hours_prepare('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000a1', current_date + 3, current_date + 3, false, null, null, null) $$,
  'bad_hours', 'open needs its times');

-- Regular hours take the whatsapp channel; an unknown channel is still refused.
select throws_ok($$ select public.apply_regular_hours('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000a1', 'sms', 'Mon 08:00 to 17:00', '{"periods": []}') $$,
  'bad_channel', 'only the known channels');
select ok(pg_get_functiondef('public.apply_regular_hours(uuid, uuid, text, text, jsonb)'::regprocedure) ~ $x$'dashboard', 'email_link', 'whatsapp'$x$,
  'the whatsapp channel is accepted for regular hours');

-- A high-risk reply and an identity field stay off WhatsApp.
select ok(pg_get_functiondef('public.approve_publication(text, uuid, jsonb, uuid, text, integer)'::regprocedure) ~ 'whatsapp_identity_field',
  'identity fields still refused on WhatsApp');

select ok(not has_function_privilege('authenticated', 'public.owner_post_prepare(uuid, uuid, text, text)', 'execute'), 'service only');
select ok(not has_function_privilege('authenticated', 'public.special_hours_prepare(uuid, uuid, date, date, boolean, time, time, text)', 'execute'), 'service only');

select * from finish();
rollback;
