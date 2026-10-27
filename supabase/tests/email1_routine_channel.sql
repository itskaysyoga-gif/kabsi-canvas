-- Email 1: one routine channel per owner (email or WhatsApp), set only by the person, WhatsApp only while connected, and
-- read back as email when WhatsApp stops. Every value the code writes into the channel check is written here.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

\ir _fixtures.psql

select ok(not has_table_privilege('anon', 'public.routine_channels', 'select'), 'anon cannot read routine channels');
select ok(not has_table_privilege('authenticated', 'public.routine_channels', 'insert')
  and not has_table_privilege('authenticated', 'public.routine_channels', 'update'), 'browsers write only through set_routine_channel');
select ok(not has_function_privilege('authenticated', 'public.routine_channel_of(uuid)', 'execute'), 'only the server reads another person''s channel');
select is(public.routine_channel_of('00000000-0000-4000-8000-0000000000a1'), 'email', 'no choice yet: email');

-- The owner picks email (every value of the check constraint is written below).
select tests.act_as('00000000-0000-4000-8000-0000000000a1');
select is(public.set_routine_channel('email'), 'email', 'the owner can choose email');
select throws_ok($$ select public.set_routine_channel('whatsapp') $$, 'P0001', 'whatsapp_not_connected', 'WhatsApp needs a connected WhatsApp');
select throws_ok($$ select public.set_routine_channel('sms') $$, '22023', 'unknown channel', 'only email or whatsapp');
reset role;

insert into public.whatsapp_optins (user_id, phone, state, consent_text) values ('00000000-0000-4000-8000-0000000000a1', '+15550000001', 'active', 'test')
on conflict (user_id) do update set state = 'active';

select tests.act_as('00000000-0000-4000-8000-0000000000a1');
select is(public.set_routine_channel('whatsapp'), 'whatsapp', 'with WhatsApp connected the owner can choose it');
select is((select channel from public.routine_channels where user_id = '00000000-0000-4000-8000-0000000000a1'), 'whatsapp', 'the owner reads their own choice');
reset role;
select is(public.routine_channel_of('00000000-0000-4000-8000-0000000000a1'), 'whatsapp', 'the engine reads WhatsApp');

-- Another person never sees it.
select tests.act_as('00000000-0000-4000-8000-0000000000b1');
select is((select count(*)::int from public.routine_channels), 0, 'another user sees no one else''s channel');
reset role;

-- WhatsApp stopped: routine messages fall back to email, never lost.
update public.whatsapp_optins set state = 'stopped' where user_id = '00000000-0000-4000-8000-0000000000a1';
select is(public.routine_channel_of('00000000-0000-4000-8000-0000000000a1'), 'email', 'a stopped WhatsApp reads as email');

-- Anon cannot set anything.
select tests.act_as('anon');
select throws_ok($$ select public.set_routine_channel('email') $$, '42501', null, 'anon cannot set a channel');
reset role;

-- The onboarding line "Kabsi also sent it to your email." reads only the person's own sent setup email.
select tests.act_as('00000000-0000-4000-8000-0000000000a1');
select is(public.my_setup_link_emailed('00000000-0000-4000-8000-0000000000c1'), false, 'no setup email sent yet: the line stays hidden');
reset role;
insert into public.notifications (location_id, user_id, to_address, category, kind, dedupe_key, title, email_state)
values ('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000a1', 'victim-owner@example.test', 'trial', 'life_no_access_24h',
  'life:no_access_24h:00000000-0000-4000-8000-0000000000c1', 'Setup is waiting for one step.', 'sent');
select tests.act_as('00000000-0000-4000-8000-0000000000a1');
select is(public.my_setup_link_emailed('00000000-0000-4000-8000-0000000000c1'), true, 'after the setup email went: the line shows');
reset role;
select tests.act_as('00000000-0000-4000-8000-0000000000b1');
select is(public.my_setup_link_emailed('00000000-0000-4000-8000-0000000000c1'), false, 'another business''s person learns nothing');
reset role;

select * from finish();
rollback;
