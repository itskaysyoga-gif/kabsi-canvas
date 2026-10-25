-- Session 13b part 1, the WhatsApp agent (master plan 9.2, 29.7, 25.5): every phone resolves to its own roles only; a
-- phone never sees a business it is not bound to; removing a member stops their phone at once; the staff code binds a
-- staff phone; messages are stored once; the sender's queue, the live allow-list and the Vault secret. The Edge
-- Function side (100 conversations) is in supabase/functions/_shared/whatsapp/conversations.test.ts.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

\ir _fixtures.psql

create temp table t (k text primary key, v jsonb);
grant all on t to authenticated;

-- Privileges ---------------------------------------------------------------------------------------------------------
select ok(
  (select bool_and(not has_function_privilege('anon', f, 'execute') and not has_function_privilege('authenticated', f, 'execute')
                   and has_function_privilege('service_role', f, 'execute'))
     from unnest(array['public.whatsapp_resolve(text)', 'public.whatsapp_bind(text,text)', 'public.whatsapp_set_webhook_secret(text)',
                       'public.whatsapp_inbound_store(text,text,text,jsonb,jsonb)', 'public.whatsapp_conversation_set(text,jsonb)',
                       'public.whatsapp_outbox_add(text,uuid,uuid,text,text,jsonb,jsonb,boolean,text,timestamptz,jsonb)', 'public.whatsapp_start(text)',
                       'public.whatsapp_ops_claim(integer)', 'public.whatsapp_staff_summary()', 'public.whatsapp_maps_due()', 'public.whatsapp_map_sent(uuid)',
                       'public.whatsapp_send_state(text)', 'public.whatsapp_open_items(text)', 'public.whatsapp_owner_draft(uuid,uuid,text)',
                       'public.whatsapp_staff_numbers()', 'public.whatsapp_staff_pause(text,boolean)', 'public.whatsapp_google_action_due()']) f),
  'the agent side runs for the service role only');
select ok(has_function_privilege('authenticated', 'public.whatsapp_staff_code()', 'execute')
          and not has_function_privilege('anon', 'public.whatsapp_staff_code()', 'execute'), 'the staff code needs a signed-in person');
select ok(not has_table_privilege('authenticated', x, 'select') and not has_table_privilege('anon', x, 'select'), x || ' is closed to the browser')
  from unnest(array['public.whatsapp_conversations', 'public.whatsapp_outbox', 'public.whatsapp_staff_codes', 'public.whatsapp_number_health']) x;

-- phone_roles: a person reads their own rows, nobody else's (RLS) ---------------------------------------------------
select tests.act_as('00000000-0000-4000-8000-0000000000a1');
select is((select count(*) from public.phone_roles), 1::bigint, 'the owner reads their own phone role');
reset role;
select tests.act_as('00000000-0000-4000-8000-0000000000b2');
select is((select count(*) from public.phone_roles), 0::bigint, 'another owner reads none');
reset role;
select tests.act_as('00000000-0000-4000-8000-0000000000a3');
select ok((select count(*) from public.phone_roles) >= 1, 'staff read them');
reset role;
set local request.jwt.claims = '';

-- Binding an owner phone by the one-time code ------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-4000-8000-0000000000a1", "role": "authenticated"}';
insert into t select 'code', public.whatsapp_connect_start(repeat('Consent text shown to the owner. ', 3));
reset role;
set local request.jwt.claims = '';
select is(public.whatsapp_bind('+12125550143', 'KABSI ' || (select v ->> 'code' from t where k = 'code')) ->> 'result', 'verified',
  'the code binds the phone');
select is((select jsonb_agg(x ->> 'business') from jsonb_array_elements(public.whatsapp_resolve('+12125550143') -> 'roles') x),
  '["Victim Bakery"]'::jsonb, 'the bound phone resolves to its own business only');
select is(jsonb_array_length(public.whatsapp_resolve('+12125559876') -> 'roles'), 0, 'an unknown phone has no roles');
select is(public.whatsapp_bind('+12125559876', 'KABSI ' || (select v ->> 'code' from t where k = 'code')) ->> 'result', 'unknown_code',
  'a code works once');

-- A manager removed from the business loses the phone's role at once -------------------------------------------------
insert into public.location_members (location_id, user_id, role)
values ('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000b3', 'manager');
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-4000-8000-0000000000b3", "role": "authenticated"}';
insert into t select 'code2', public.whatsapp_connect_start(repeat('Consent text shown to the manager. ', 3));
reset role;
set local request.jwt.claims = '';
select is(public.whatsapp_bind('+12125550144', (select v ->> 'code' from t where k = 'code2')) ->> 'result', 'verified', 'the manager binds');
select is(public.whatsapp_resolve('+12125550144') -> 'roles' -> 0 ->> 'role', 'manager', 'as manager');
delete from public.location_members where location_id = '00000000-0000-4000-8000-0000000000c1' and user_id = '00000000-0000-4000-8000-0000000000b3';
select is(jsonb_array_length(public.whatsapp_resolve('+12125550144') -> 'roles'), 0, 'removed: the phone sees the business no more');
select ok((select revoked_at is not null from public.phone_roles where phone = '+12125550144' and role = 'manager'), 'and the role row is revoked');

-- The staff code ------------------------------------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-4000-8000-0000000000b1", "role": "authenticated"}';
select throws_ok($$ select public.whatsapp_staff_code() $$, '42501', 'forbidden', 'only staff make a staff code');
set local request.jwt.claims = '{"sub": "00000000-0000-4000-8000-0000000000a3", "role": "authenticated"}';
insert into t select 'staff', public.whatsapp_staff_code();
reset role;
set local request.jwt.claims = '';
select matches((select v ->> 'code' from t where k = 'staff'), '^STAFF [2-9A-HJKMNP-Z]{8}$', 'a staff code');
select is(public.whatsapp_bind('+12125550148', (select v ->> 'code' from t where k = 'staff')) ->> 'result', 'staff_admin', 'binds staff_admin');
select ok(public.whatsapp_resolve('+12125550148') -> 'roles' @> '[{"kind": "staff_admin"}]', 'the staff phone resolves as staff_admin');
select is(public.whatsapp_bind('+447700900124', (select v ->> 'code' from t where k = 'staff')) ->> 'result', 'unknown_code', 'once only');

-- Stored once; the scan and partner codes ------------------------------------------------------------------------------
select is(public.whatsapp_inbound_store('+12125559876', 'wamid.agent.1', 'text', '{"text": "hi"}', '{"ctwa_clid": "abc"}') ->> 'duplicate', 'false', 'stored');
select is(public.whatsapp_inbound_store('+12125559876', 'wamid.agent.1', 'text', '{"text": "hi"}', null) ->> 'duplicate', 'true', 'a repeat does nothing');
select is((select referral_first ->> 'ctwa_clid' from public.whatsapp_conversations where phone = '+12125559876'), 'abc', 'the referral is kept');
select lives_ok($$ select public.whatsapp_attach_code('+12125559876', 'KAB-7Q4M2X9P', null) $$, 'a scan code is kept');
select ok(public.whatsapp_resolve('+12125559876') -> 'roles' @> '[{"kind": "prospect"}]', 'the phone becomes a prospect');
select throws_ok($$ select public.whatsapp_attach_code('+12125559876', 'NOT-A-CODE', null) $$, '23514', null, 'a malformed code is refused');

-- The sender: dedupe, the claim, the allow-list until launch ----------------------------------------------------------
select ok(public.whatsapp_outbox_add('+12125550143', null, '00000000-0000-4000-8000-0000000000c1', 'review_alert', 'Victim Bakery: x', '[]', null, false, 'agent-test-1') is not null, 'queued');
select ok(public.whatsapp_outbox_add('+12125550143', null, '00000000-0000-4000-8000-0000000000c1', 'review_alert', 'Victim Bakery: x', '[]', null, false, 'agent-test-1') is null, 'queued once');
select is((select count(*) from public.whatsapp_outbox_claim(10) where dedupe_key = 'agent-test-1'), 1::bigint, 'claimed');
select is((select count(*) from public.whatsapp_outbox_claim(10) where dedupe_key = 'agent-test-1'), 0::bigint, 'never claimed twice');
select is(public.whatsapp_send_state('+12125550143') ->> 'live_ok', 'false', 'before launch an owner gets the mock');
select is(public.whatsapp_send_state('+12125550148') ->> 'live_ok', 'true', 'the staff phone may get a live message');
update public.app_settings set value = '["+12125550143"]' where key = 'whatsapp_live_phones';
select is(public.whatsapp_send_state('+12125550143') ->> 'live_ok', 'true', 'a test phone on the list may too');
select is(public.whatsapp_token_owner('nosuchtoken0000000000', '+12125550143'), 'unknown', 'a token Kabsi never made is unknown');

-- 13b part 2: START, the first message, the staff alert queue ---------------------------------------------------------
select is(public.whatsapp_inbound_store('+12125559876', 'wamid.agent.2', 'text', '{"text": "again"}', null) ->> 'first', 'false', 'a second message is not the first');
select is(public.whatsapp_inbound_store('+12125550177', 'wamid.agent.3', 'text', '{"text": "hi"}', null) ->> 'first', 'true', 'a new phone''s first message');
select lives_ok($$ select public.whatsapp_conversation_set('+12125550148', '{"stopped": true}') $$, 'the staff phone sends STOP');
select ok(public.whatsapp_start('+12125550148') >= 0, 'START runs');
select is((select stopped_at from public.whatsapp_conversations where phone = '+12125550148'), null, 'START clears STOP');
select lives_ok($$ select public.ops_emit('jobs_silent', 'alerts', 'No job finished in 30 minutes', null, '[]', '[]', 'agent-test-ops') $$, 'an alert is queued');
select is((select count(*) from public.whatsapp_ops_claim(50) x where x ->> 'kind' = 'jobs_silent'), 1::bigint, 'the tick takes it');
select is((select count(*) from public.whatsapp_ops_claim(50) x where x ->> 'kind' = 'jobs_silent'), 0::bigint, 'never twice');
select ok(public.whatsapp_staff_summary() ? 'places_cap', 'the morning numbers');
select ok(not exists (select 1 from cron.job where jobname like 'kabsi_slack%'), 'no Slack cron job is left');

-- The webhook secret goes to Vault --------------------------------------------------------------------------------------
select ok(public.whatsapp_set_webhook_secret(repeat('s', 40)), 'stored');
select is(public.internal_secret('kapso_webhook_secret'), repeat('s', 40), 'read back from Vault');
select throws_ok($$ select public.whatsapp_set_webhook_secret('short') $$, 'P0001', 'bad_secret', 'a short secret is refused');

select * from finish();
rollback;
