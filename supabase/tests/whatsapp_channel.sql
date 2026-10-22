-- P0.8-03 WhatsApp owner channel (K-129, K-70, K-17): the opt-in by code, STOP, the 24-hour window, a replayed message,
-- who may press a button, what WhatsApp may approve (never high risk, never identity fields), the approval through
-- the one pipeline with channel whatsapp and a 10 second undo, a second press, an undo, a changed draft and the
-- publish-time re-check. The Edge Function side (signature, replay window, routing) is in
-- supabase/functions/_shared/whatsapp/whatsapp.test.ts.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

\ir _fixtures.psql

update public.locations set consent_at = now(), access_granted_at = now(), google_account_id = 'accounts/test',
  google_location_id = 'locations/mock-victim', status = 'active'
 where id = '00000000-0000-4000-8000-0000000000c1';
-- Reviews: two low risk with a safe draft, one high risk, one with a blocked draft.
insert into public.reviews (id, location_id, google_review_id, star_rating, review_created_at, state, risk)
values ('00000000-0000-4000-8000-000000000301', '00000000-0000-4000-8000-0000000000c1', 'wa-1', 5, now(), 'drafted', 'low'),
       ('00000000-0000-4000-8000-000000000302', '00000000-0000-4000-8000-0000000000c1', 'wa-2', 4, now(), 'drafted', 'medium'),
       ('00000000-0000-4000-8000-000000000303', '00000000-0000-4000-8000-0000000000c1', 'wa-3', 1, now(), 'drafted', 'high'),
       ('00000000-0000-4000-8000-000000000304', '00000000-0000-4000-8000-0000000000c1', 'wa-4', 5, now(), 'drafted', 'low');
insert into public.reply_drafts (review_id, version, body, source, safety_ok)
values ('00000000-0000-4000-8000-000000000301', 1, 'Thank you for coming, see you soon.', 'ai', true),
       ('00000000-0000-4000-8000-000000000302', 1, 'Thank you for the kind words.', 'ai', true),
       ('00000000-0000-4000-8000-000000000303', 1, 'We are sorry.', 'ai', true),
       ('00000000-0000-4000-8000-000000000304', 1, 'Thank you.', 'ai', false);
insert into public.gbp_posts (id, location_id, owner_input, body, state)
values ('00000000-0000-4000-8000-000000000311', '00000000-0000-4000-8000-0000000000c1', 'x', 'Fresh bread every morning from 7.', 'draft');
insert into public.profile_changes (id, location_id, field, source, severity, status)
values ('00000000-0000-4000-8000-000000000321', '00000000-0000-4000-8000-0000000000c1', 'name', 'scheduled_check', 'urgent', 'awaiting_review'),
       ('00000000-0000-4000-8000-000000000323', '00000000-0000-4000-8000-0000000000c1', 'open_status', 'scheduled_check', 'urgent', 'awaiting_review'),
       ('00000000-0000-4000-8000-000000000324', '00000000-0000-4000-8000-0000000000c1', 'map_pin', 'scheduled_check', 'urgent', 'awaiting_review'),
       ('00000000-0000-4000-8000-000000000325', '00000000-0000-4000-8000-0000000000c1', 'address', 'scheduled_check', 'urgent', 'awaiting_review'),
       ('00000000-0000-4000-8000-000000000326', '00000000-0000-4000-8000-0000000000c1', 'main_category', 'scheduled_check', 'urgent', 'awaiting_review');
-- The fixtures already hold an open phone change for the victim (one open change per field); it stays open.
update public.profile_changes set status = 'awaiting_review'
 where location_id = '00000000-0000-4000-8000-0000000000c1' and field = 'phone' and status in ('detected', 'awaiting_review');
select is((select count(*) from public.profile_changes where location_id = '00000000-0000-4000-8000-0000000000c1'
            and field in ('name', 'phone', 'open_status', 'map_pin', 'address', 'main_category') and status = 'awaiting_review'),
  6::bigint, 'one open change for each of the six identity fields');

create temp table t (k text primary key, v jsonb);
grant all on t to authenticated;

-- Privileges -------------------------------------------------------------------------------------------------------
select ok(
  (select bool_and(not has_function_privilege('anon', f, 'execute') and not has_function_privilege('authenticated', f, 'execute')
                   and has_function_privilege('service_role', f, 'execute'))
     from unnest(array['public.whatsapp_inbound(text,text,text)', 'public.whatsapp_verify(text,text)', 'public.whatsapp_stop(text)',
                       'public.whatsapp_may_send(uuid)', 'public.whatsapp_action_create(uuid,text,uuid)',
                       'public.whatsapp_approve(text,text)', 'public.whatsapp_undo(text,text)',
                       'public.whatsapp_record(uuid,uuid,text,text,text,text,text,text)',
                       'public.whatsapp_status_update(text,text,text)']) f),
  'the webhook side runs for the service role only');
select ok(not has_function_privilege('anon', 'public.whatsapp_connect_start(text)', 'execute')
          and has_function_privilege('authenticated', 'public.whatsapp_connect_start(text)', 'execute'),
  'Connect WhatsApp needs a signed-in person');
select ok(not has_table_privilege('authenticated', t, 'select') and not has_table_privilege('anon', t, 'select'),
  t || ' is closed to the browser')
  from unnest(array['public.whatsapp_optins', 'public.whatsapp_window', 'public.whatsapp_messages', 'public.whatsapp_actions']) t;

-- Sending needs an opt-in --------------------------------------------------------------------------------------------
select is(public.whatsapp_may_send('00000000-0000-4000-8000-0000000000a1') ->> 'reason', 'no_optin', 'no opt-in: nothing is sent');

-- Connect: the stranger (no business) cannot; the owner gets a code ---------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-4000-8000-0000000000b1", "role": "authenticated"}';
select throws_ok($$ select public.whatsapp_connect_start(repeat('Consent text shown to the owner. ', 3)) $$, '42501', 'not_member',
  'someone with no business cannot connect');
set local request.jwt.claims = '{"sub": "00000000-0000-4000-8000-0000000000a1", "role": "authenticated"}';
select throws_ok($$ select public.whatsapp_connect_start('ok') $$, 'P0001', 'consent_text_required', 'the consent text is required');
insert into t select 'code', public.whatsapp_connect_start(repeat('Consent text shown to the owner. ', 3));
select matches((select v ->> 'code' from t where k = 'code'), '^[0-9]{6}$', 'a six digit code');
select is(public.whatsapp_status() ->> 'state', 'pending', 'the owner sees it pending until the code arrives');
reset role;
set local request.jwt.claims = '';
select is(public.whatsapp_may_send('00000000-0000-4000-8000-0000000000a1') ->> 'reason', 'not_verified', 'pending: nothing is sent');

-- The code arrives from the owner's phone: verified, the opt-in recorded, the window open ----------------------------
select is(public.whatsapp_inbound('+15550001111', 'wamid.code1', 'text') ->> 'known', 'false', 'an unknown sender is not known');
select is(public.whatsapp_verify('+15550001111', '000000x') ->> 'result', 'unknown_code', 'a wrong code verifies nothing');
select is(public.whatsapp_verify('+15550001111', (select v ->> 'code' from t where k = 'code')) ->> 'result', 'verified',
  'the right code verifies the number');
select is((select state || '/' || phone from public.whatsapp_optins where user_id = '00000000-0000-4000-8000-0000000000a1'),
  'active/+15550001111', 'the opt-in is active for that number');
select ok((select verified_at is not null and consent_text like 'Consent text shown%' from public.whatsapp_optins
            where user_id = '00000000-0000-4000-8000-0000000000a1'), 'the time and the wording shown are recorded');
select is((select count(*) from public.audit_events where action = 'whatsapp_optin' and channel = 'whatsapp' and result = 'active'),
  1::bigint, 'the opt-in is in the audit log');
select is(public.whatsapp_verify('+15550001111', (select v ->> 'code' from t where k = 'code')) ->> 'result', 'unknown_code',
  'a code works once');
select is(public.whatsapp_may_send('00000000-0000-4000-8000-0000000000a1') ->> 'in_window', 'true', 'inside the 24-hour window');
update public.whatsapp_window set last_inbound_at = now() - interval '25 hours';
select is(public.whatsapp_may_send('00000000-0000-4000-8000-0000000000a1') ->> 'in_window', 'false',
  'after 24 hours without a message from the owner, only a template may go');
select is(public.whatsapp_inbound('+15550001111', 'wamid.hello', 'text') ->> 'known', 'true', 'a message from the owner');
select is(public.whatsapp_may_send('00000000-0000-4000-8000-0000000000a1') ->> 'in_window', 'true', 'opens the window again');
select is(public.whatsapp_inbound('+15550001111', 'wamid.hello', 'text') ->> 'duplicate', 'true', 'the same message twice is a replay');

-- Buttons: never for a high-risk review, an unsafe draft or an identity field ---------------------------------------
select is(public.whatsapp_action_create('00000000-0000-4000-8000-0000000000a1', 'review_reply', '00000000-0000-4000-8000-000000000303') ->> 'reason',
  'high_risk', 'no Approve button for a high-risk review');
select is(public.whatsapp_action_create('00000000-0000-4000-8000-0000000000a1', 'review_reply', '00000000-0000-4000-8000-000000000304') ->> 'reason',
  'no_safe_draft', 'no Approve button for a draft that failed its checks');
select is(public.whatsapp_action_create('00000000-0000-4000-8000-0000000000a1', 'listing_revert', id) ->> 'reason', 'identity_field',
  'no Approve button for ' || field)
  from public.profile_changes where location_id = '00000000-0000-4000-8000-0000000000c1'
    and field in ('name', 'phone', 'open_status', 'map_pin', 'address', 'main_category') and status = 'awaiting_review';
select is(public.whatsapp_action_create('00000000-0000-4000-8000-0000000000b1', 'review_reply', '00000000-0000-4000-8000-000000000301') ->> 'reason',
  'not_member', 'no button for someone outside the business');
select is(public.whatsapp_action_create('00000000-0000-4000-8000-0000000000a1', 'photo', '00000000-0000-4000-8000-000000000301') ->> 'reason',
  'not_on_whatsapp', 'nothing but replies, posts and put-backs');
insert into t select 'r1', public.whatsapp_action_create('00000000-0000-4000-8000-0000000000a1', 'review_reply', '00000000-0000-4000-8000-000000000301');
insert into t select 'r2', public.whatsapp_action_create('00000000-0000-4000-8000-0000000000a1', 'review_reply', '00000000-0000-4000-8000-000000000302');
insert into t select 'p1', public.whatsapp_action_create('00000000-0000-4000-8000-0000000000a1', 'local_post', '00000000-0000-4000-8000-000000000311');
select ok((select bool_and((v ->> 'ok')::boolean) from t where k in ('r1', 'r2', 'p1')), 'low and medium risk replies and a post get a button');
select is((select count(*) from public.whatsapp_actions where token_hash = (select v ->> 'token' from t where k = 'r1')), 0::bigint,
  'the token itself is never stored');

-- Approve: only from the opted-in phone, through the pipeline, channel whatsapp, 10 seconds, once --------------------
select is(public.whatsapp_approve((select v ->> 'token' from t where k = 'r1'), '+15559999999') ->> 'result', 'unknown',
  'another phone cannot press the owner''s button');
insert into t select 'a1', public.whatsapp_approve((select v ->> 'token' from t where k = 'r1'), '+15550001111');
select is((select v ->> 'result' from t where k = 'a1'), 'approved', 'Approve on a low-risk draft');
select is((select channel || '/' || state || '/' || (payload ->> 'text') from public.publications
            where id = (select (v ->> 'publication_id')::uuid from t where k = 'a1')),
  'whatsapp/approved/Thank you for coming, see you soon.', 'one publication with the channel whatsapp and the draft the owner saw');
select is((select publish_after - approved_at from public.publications where id = (select (v ->> 'publication_id')::uuid from t where k = 'a1')),
  interval '10 seconds', 'it waits 10 seconds on the server (K-70)');
select is((select count(*) from public.jobs where dedupe_key = 'publish:' || (select v ->> 'publication_id' from t where k = 'a1')),
  1::bigint, 'one publish job, at the end of the undo window');
select is((select count(*) from public.audit_events where action = 'approval' and channel = 'whatsapp'
            and object_id = '00000000-0000-4000-8000-000000000301'), 1::bigint, 'the audit row carries the channel whatsapp');
select is(public.whatsapp_approve((select v ->> 'token' from t where k = 'r1'), '+15550001111') ->> 'publication_id',
  (select v ->> 'publication_id' from t where k = 'a1'), 'a second Approve returns the same publication');
select is((select count(*) from public.publications where target_id = '00000000-0000-4000-8000-000000000301'), 1::bigint,
  'and creates nothing');

-- Undo inside 10 seconds cancels; after it, too late --------------------------------------------------------------
insert into t select 'a2', public.whatsapp_approve((select v ->> 'token' from t where k = 'r2'), '+15550001111');
select is(public.whatsapp_undo((select v ->> 'token' from t where k = 'r2'), '+15559999999') ->> 'result', 'unknown',
  'another phone cannot undo');
select is(public.whatsapp_undo((select v ->> 'token' from t where k = 'r2'), '+15550001111') ->> 'result', 'cancelled',
  'Undo inside 10 seconds cancels');
select is((select state from public.publications where id = (select (v ->> 'publication_id')::uuid from t where k = 'a2')), 'cancelled',
  'the publication is cancelled');
select is((select state from public.reviews where id = '00000000-0000-4000-8000-000000000302'), 'drafted', 'the reply is a draft again');
update public.publications set publish_after = now() - interval '1 second' where id = (select (v ->> 'publication_id')::uuid from t where k = 'a1');
select is(public.whatsapp_undo((select v ->> 'token' from t where k = 'r1'), '+15550001111') ->> 'result', 'too_late',
  'after the 10 seconds it is too late');

-- The publish job re-checks the reply is still the one approved ------------------------------------------------------
update public.reviews set state = 'skipped' where id = '00000000-0000-4000-8000-000000000301';
select is(public.claim_publication((select (v ->> 'publication_id')::uuid from t where k = 'a1')) ->> 'result', 'stopped',
  'a reply discarded after the approval is not published');
select is((select state from public.publications where id = (select (v ->> 'publication_id')::uuid from t where k = 'a1')), 'failed',
  'its publication fails with the reason');
select is((select state from public.reviews where id = '00000000-0000-4000-8000-000000000301'), 'skipped', 'and the review stays skipped');

-- A draft that changed after the alert is not approved from the old button -------------------------------------------
insert into t select 'r2b', public.whatsapp_action_create('00000000-0000-4000-8000-0000000000a1', 'review_reply', '00000000-0000-4000-8000-000000000302');
insert into public.reply_drafts (review_id, version, body, source, safety_ok)
values ('00000000-0000-4000-8000-000000000302', 2, 'A new version the owner has not seen.', 'ai', true);
select is(public.whatsapp_approve((select v ->> 'token' from t where k = 'r2b'), '+15550001111') ->> 'reason', 'changed',
  'a changed draft is refused with the app link');
-- A draft approved in the app first: the WhatsApp button finds it already handled.
select public.approve_publication('local_post', '00000000-0000-4000-8000-000000000311', '{"summary": "Fresh bread every morning from 7."}'::jsonb,
  '00000000-0000-4000-8000-0000000000a1', 'dashboard');
select is(public.whatsapp_approve((select v ->> 'token' from t where k = 'p1'), '+15550001111') ->> 'reason', 'not_draft',
  'a post already approved in the app is not approved again');

-- approve_publication itself refuses the WhatsApp channel for high risk and identity fields --------------------------
select throws_ok($$ select public.approve_publication('review_reply', '00000000-0000-4000-8000-000000000303', '{"text": "Sorry."}'::jsonb,
  '00000000-0000-4000-8000-0000000000a1', 'whatsapp') $$, 'P0001', 'not_on_whatsapp', 'high risk never through the whatsapp channel');
select throws_ok(format($$ select public.approve_publication('listing_revert', %L, '{}'::jsonb, '00000000-0000-4000-8000-0000000000a1', 'whatsapp') $$, id),
  'P0001', 'not_on_whatsapp', field || ' never through the whatsapp channel')
  from public.profile_changes where location_id = '00000000-0000-4000-8000-0000000000c1'
    and field in ('name', 'phone', 'open_status', 'map_pin', 'address', 'main_category') and status = 'awaiting_review';
select throws_ok($$ select public.approve_publication('special_hours', gen_random_uuid(), '{}'::jsonb, '00000000-0000-4000-8000-0000000000a1', 'sms') $$,
  'P0001', 'bad_channel', 'an unknown channel is refused');

-- STOP stops every send at once, and is recorded --------------------------------------------------------------------
select is(public.whatsapp_stop('+15550001111') ->> 'result', 'stopped', 'STOP');
select is(public.whatsapp_may_send('00000000-0000-4000-8000-0000000000a1') ->> 'reason', 'stopped', 'nothing is sent after STOP');
insert into t select 'r4', public.whatsapp_action_create('00000000-0000-4000-8000-0000000000a1', 'review_reply', '00000000-0000-4000-8000-000000000302');
select is(public.whatsapp_approve((select v ->> 'token' from t where k = 'r4'), '+15550001111') ->> 'result', 'stopped',
  'a button pressed after STOP approves nothing');
select is((select count(*) from public.audit_events where action = 'whatsapp_optin' and result = 'stopped'), 1::bigint,
  'STOP is in the audit log');

-- Disconnect from the app is the same as STOP; the owner's own status only ------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-4000-8000-0000000000b2", "role": "authenticated"}';
select is(public.whatsapp_status() ->> 'state', 'none', 'another person sees only their own status');
reset role;
set local request.jwt.claims = '';

select * from finish();
rollback;
