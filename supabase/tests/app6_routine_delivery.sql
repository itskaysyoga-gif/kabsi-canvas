-- App 6: set_routine_delivery saves the whole "Where your routine messages go" choice in one call. Only an owner or manager
-- of the business; WhatsApp only while connected; Email puts the two routine emails back to default; a stranger changes nothing.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

\ir _fixtures.psql

select ok(has_function_privilege('authenticated', 'public.set_routine_delivery(uuid, text)', 'execute')
  and not has_function_privilege('anon', 'public.set_routine_delivery(uuid, text)', 'execute'), 'signed-in people call it, anon cannot');

-- Not connected: WhatsApp is refused and nothing is written; Email works.
select tests.act_as('00000000-0000-4000-8000-0000000000a1');
select throws_ok($$ select public.set_routine_delivery('00000000-0000-4000-8000-0000000000c1', 'whatsapp') $$, 'P0001', 'whatsapp_not_connected', 'WhatsApp needs a connected WhatsApp');
select throws_ok($$ select public.set_routine_delivery('00000000-0000-4000-8000-0000000000c1', 'sms') $$, '22023', 'unknown channel', 'only email or whatsapp');
select is(public.set_routine_delivery('00000000-0000-4000-8000-0000000000c1', 'email') ->> 'channel', 'email', 'the owner can choose email in one call');
reset role;
select is((select count(*)::int from public.routine_channels where user_id = '00000000-0000-4000-8000-0000000000a1' and channel = 'whatsapp'), 0, 'the refused WhatsApp choice wrote nothing');

-- Connected: one call stores the channel and turns both WhatsApp switches on.
insert into public.whatsapp_optins (user_id, phone, state, consent_text, review_alerts, digest_optin)
values ('00000000-0000-4000-8000-0000000000a1', '+15550000001', 'active', 'test', false, false)
on conflict (user_id) do update set state = 'active', review_alerts = false, digest_optin = false;
select tests.act_as('00000000-0000-4000-8000-0000000000a1');
select is(public.set_routine_delivery('00000000-0000-4000-8000-0000000000c1', 'whatsapp') ->> 'channel', 'whatsapp', 'with WhatsApp connected the owner chooses it');
select is((select channel from public.routine_channels where user_id = '00000000-0000-4000-8000-0000000000a1'), 'whatsapp', 'the channel is stored');
reset role;
select is((select review_alerts and digest_optin from public.whatsapp_optins where user_id = '00000000-0000-4000-8000-0000000000a1'), true, 'review alerts and the report are on WhatsApp');
select ok((select digest_consent_at is not null from public.whatsapp_optins where user_id = '00000000-0000-4000-8000-0000000000a1'), 'the report consent time is stamped');

-- Back to email: both switches off, the two routine emails back to default.
select tests.act_as('00000000-0000-4000-8000-0000000000a1');
select lives_ok($$ select public.set_notification_pref('00000000-0000-4000-8000-0000000000c1', 'review_new', 'email', 'off') $$, 'the earlier switch had turned a routine email off');
select is(public.set_routine_delivery('00000000-0000-4000-8000-0000000000c1', 'email') ->> 'channel', 'email', 'back to email in one call');
select is((select frequency from public.notification_preferences where user_id = '00000000-0000-4000-8000-0000000000a1' and location_id = '00000000-0000-4000-8000-0000000000c1' and category = 'review_new' and channel = 'email'), 'default', 'new reviews by email are back to default');
select is((select frequency from public.notification_preferences where user_id = '00000000-0000-4000-8000-0000000000a1' and location_id = '00000000-0000-4000-8000-0000000000c1' and category = 'weekly_report' and channel = 'email'), 'default', 'the weekly report by email is back to default');
reset role;
select is((select review_alerts or digest_optin from public.whatsapp_optins where user_id = '00000000-0000-4000-8000-0000000000a1'), false, 'both WhatsApp switches are off again');
select is(public.routine_channel_of('00000000-0000-4000-8000-0000000000a1'), 'email', 'the engine reads email');

-- A stranger changes nothing of the victim's business or choice.
select tests.act_as('00000000-0000-4000-8000-0000000000b1');
select throws_ok($$ select public.set_routine_delivery('00000000-0000-4000-8000-0000000000c1', 'email') $$, '42501', null, 'a non-member is refused');
reset role;
select tests.act_as('anon');
select throws_ok($$ select public.set_routine_delivery('00000000-0000-4000-8000-0000000000c1', 'email') $$, '42501', null, 'anon is refused');
reset role;

select * from finish();
rollback;
