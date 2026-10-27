-- Sec 2 (27 Oct 2026): the stale email yes, the redraft while publishing, card code guessing, the installer's reach,
-- retention per source, the deletion log a restore re-applies, rejected webhooks and the staff operations view.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

\ir _fixtures.psql

insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
select '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email, now(), '{}', '{}', now(), now()
from (values ('00000000-0000-4000-8000-0000000002b6'::uuid, 'sec2-installer@example.test')) as u(id, email);
insert into public.staff (user_id, name, role) values ('00000000-0000-4000-8000-0000000002b6', 'Sec2 Installer', 'installer');
update public.staff set role = 'admin' where user_id = '00000000-0000-4000-8000-0000000000a3';
update public.locations set status = 'active', consent_at = now(), access_granted_at = now(), google_account_id = 'accounts/v',
  google_location_id = 'locations/mock-victim' where id = '00000000-0000-4000-8000-0000000000c1';
insert into public.subscriptions (organization_id, plan, state, provider)
select organization_id, 'pro', 'active', 'manual' from public.locations where id = '00000000-0000-4000-8000-0000000000c1';

-- 1. The stale email yes ---------------------------------------------------------------------------------------------
insert into public.reviews (id, location_id, google_review_id, star_rating, review_created_at, state, risk)
values ('00000000-0000-4000-8000-0000000002e1', '00000000-0000-4000-8000-0000000000c1', 'sec2-review', 5, now(), 'drafted', 'low');
insert into public.reply_drafts (review_id, version, body, source, safety_ok)
values ('00000000-0000-4000-8000-0000000002e1', 1, 'Thank you, version 1.', 'ai', true);
insert into public.action_tokens (token_hash, location_id, user_id, action, target_type, target_id, expires_at) values
  ('sec2-page-a', '00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000a1', 'post', 'review',
   '00000000-0000-4000-8000-0000000002e1', now() + interval '72 hours'),
  ('sec2-page-b', '00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000a1', 'post', 'review',
   '00000000-0000-4000-8000-0000000002e1', now() + interval '72 hours');

-- The page opened on version 1; version 2 arrives (a redraft); the page posts version 1's words.
select is(public.save_reply_draft('00000000-0000-4000-8000-0000000002e1', 'Thank you, version 2.', 'ai_edit', 'shorter', true,
  '[]'::jsonb, 'stub', 'v-test', null, 'en', 'low', '{}', false) ->> 'version', '2', 'a redraft saves version 2');
select throws_ok($$ select public.use_action_link('sec2-page-a', 'post', 'Thank you, version 1.', null, null, 1) $$,
  'P0001', 'reply_changed', 'a page that showed version 1 cannot approve once version 2 exists');
select is((select count(*) from public.publications where target_id = '00000000-0000-4000-8000-0000000002e1'), 0::bigint,
  'nothing was approved');
select is((select used_at from public.action_tokens where token_hash = 'sec2-page-a'), null, 'the link stays unused');
select throws_ok($$ select public.use_action_link('sec2-page-a', 'post', 'Thank you, version 1.', null, null) $$,
  'P0001', 'reply_changed', 'the five-argument form (no version) is refused for a post');
select is(public.use_action_link('sec2-page-a', 'post', 'Thank you, version 2.', null, null, 2) ->> 'done', 'approved',
  'the page reloaded on version 2 approves');
select is((select payload ->> 'text' from public.publications where target_id = '00000000-0000-4000-8000-0000000002e1'
            and state = 'approved'), 'Thank you, version 2.', 'with version 2''s words');

-- 2. A redraft while the reply is publishing --------------------------------------------------------------------------
select throws_ok($$ select public.save_reply_draft('00000000-0000-4000-8000-0000000002e1', 'Thank you, version 3.', 'ai_edit',
  'warmer', true, '[]'::jsonb, 'stub', 'v-test', null, 'en', 'low', '{}', false) $$,
  'P0001', 'reply_publishing', 'a redraft is refused while a yes waits');
select is((select state from public.reviews where id = '00000000-0000-4000-8000-0000000002e1'), 'publishing',
  'the review stays publishing under its yes');
select is((select max(version) from public.reply_drafts where review_id = '00000000-0000-4000-8000-0000000002e1'), 2,
  'no version 3 was saved');
select is(public.block_reply_draft('00000000-0000-4000-8000-0000000002e1', 'en', 'high', '{x}'), false,
  'the no-draft path changes nothing under a waiting yes');
select throws_ok($$ select public.use_action_link('sec2-page-b', 'post', 'Other words.', null, null, 2) $$,
  'P0001', 'too_late', 'a second page does not claim the waiting yes as its own approval');
select ok(not has_function_privilege('authenticated', 'public.save_reply_draft(uuid,text,text,text,boolean,jsonb,text,text,uuid[],text,text,text[],boolean)', 'execute')
  and not has_function_privilege('anon', 'public.block_reply_draft(uuid,text,text,text[])', 'execute'),
  'the draft functions are for the service role only');

-- 3. Card codes --------------------------------------------------------------------------------------------------------
select tests.act_as('00000000-0000-4000-8000-0000000000a1');
select is(public.activate_card('NOPE' || i::text, '00000000-0000-4000-8000-0000000000c1', null), 'unknown_card',
  'an unknown code is answered, not raised, so the try counts (' || i || ')') from generate_series(1, 10) i;
select is(public.activate_card('VCTM22', '00000000-0000-4000-8000-0000000000c1', null), 'rate_limited',
  'the eleventh try in an hour is refused, even for a real code');
reset role;
insert into public.cards (code, location_id) values ('XTHR22', '00000000-0000-4000-8000-0000000000c2');
delete from public.rate_limits where key like 'card_try:%';
select tests.act_as('00000000-0000-4000-8000-0000000000a1');
select is(public.activate_card('XTHR22', '00000000-0000-4000-8000-0000000000c1', null), 'card_in_use',
  'another business''s card is refused and counted');
select throws_ok($$ select public.set_card_active('XTHR22', false) $$, '42501', null,
  'set_card_active on another business''s card reads the same as an unknown code');
select throws_ok($$ select public.set_card_active('NOSUCH', false) $$, '42501', null, 'an unknown code is forbidden too');
select alike(public.activate_card('VCTM22', '00000000-0000-4000-8000-0000000000c1', 'Desk'), 'https://%', 'the owner''s own card works');
reset role;

-- 4. Installers --------------------------------------------------------------------------------------------------------
select tests.act_as('00000000-0000-4000-8000-0000000002b6');
select is(public.is_staff(), false, 'an installer is not Kabsi staff');
select is((select count(*) from public.locations), 0::bigint, 'an installer reads no business');
select is((select count(*) from public.reviews), 0::bigint, 'an installer reads no review');
select alike(public.activate_card('XTHR22', '00000000-0000-4000-8000-0000000000c2', 'Door'), 'https://%',
  'an installer can still activate a card for a business');
select lives_ok($$ select public.set_card_active('XTHR22', true) $$, 'and switch it');
select throws_ok($$ select public.staff_operations() $$, '42501', null, 'an installer cannot open the operations view');
reset role;
select tests.act_as('00000000-0000-4000-8000-0000000000a3');
select is(public.is_staff(), true, 'a Kabsi admin is staff');
reset role;

-- 5. Retention per source ----------------------------------------------------------------------------------------------
insert into public.founding_applications (id, business_name, country, trade, business_kind, whatsapp, why_now, case_study,
  checkin_consent, consent_text, status)
values
  ('00000000-0000-4000-8000-0000000002f1', 'Declined Salon', 'AE', 'beauty_hair', 'salon', '+15550002001', 'We want more reviews now.', 'named', true, 'I agree to the check-ins.', 'new'),
  ('00000000-0000-4000-8000-0000000002f2', 'Waiting Salon', 'AE', 'beauty_hair', 'salon', '+15550002002', 'We want more reviews now.', 'named', true, 'I agree to the check-ins.', 'new'),
  ('00000000-0000-4000-8000-0000000002f3', 'Old Decline', 'GB', 'food', 'cafe', '+15550002003', 'We want more reviews now.', 'anonymous', true, 'I agree to the check-ins.', 'new'),
  ('00000000-0000-4000-8000-0000000002f4', 'Accepted Salon', 'US', 'beauty_hair', 'barber', '+15550002004', 'We want more reviews now.', 'named', true, 'I agree to the check-ins.', 'new');
update public.founding_applications set status = 'declined', decided_at = now() where id = '00000000-0000-4000-8000-0000000002f1';
update public.founding_applications set status = 'waitlisted', decided_at = now() where id = '00000000-0000-4000-8000-0000000002f2';
update public.founding_applications set status = 'accepted', decided_at = now() where id = '00000000-0000-4000-8000-0000000002f4';
select ok((select delete_after::date = (now() + interval '90 days')::date from public.founding_applications where id = '00000000-0000-4000-8000-0000000002f1'),
  'a declined application gets a deletion date 90 days out');
select ok((select delete_after::date = (now() + interval '180 days')::date from public.founding_applications where id = '00000000-0000-4000-8000-0000000002f2'),
  'a waitlisted application gets a deletion date 180 days out');
select is((select delete_after from public.founding_applications where id = '00000000-0000-4000-8000-0000000002f4'), null,
  'an accepted application has no deletion date');
-- Decided long ago (before the column existed: no date stored).
update public.founding_applications set status = 'declined', decided_at = now() - interval '100 days' where id = '00000000-0000-4000-8000-0000000002f3';
alter table public.founding_applications disable trigger decision_delete_after;
update public.founding_applications set delete_after = null where id = '00000000-0000-4000-8000-0000000002f3';
alter table public.founding_applications enable trigger decision_delete_after;

insert into public.jobs (kind, state, created_at, finished_at) values
  ('sectwo_old', 'succeeded', now() - interval '40 days', now() - interval '40 days'),
  ('sectwo_new', 'succeeded', now() - interval '2 days', now() - interval '2 days'),
  ('sectwo_open', 'pending', now() - interval '40 days', null);
insert into public.google_events (message_id, type, received_at) values ('sec2-old', 'NEW_REVIEW', now() - interval '100 days');
insert into public.product_events (event, distinct_id, source_key, created_at, sent_at) values ('sectwo_old', 'x', 'sec2-old', now() - interval '40 days', now() - interval '40 days');
insert into public.whatsapp_number_health (checked_at, status) values (now() - interval '100 days', 'ok');
insert into public.staff_followups (kind, location_name, detail, due_at, done_at, done_note, created_at)
values ('whatsapp_nudge', 'Old Cafe', 'sec2', now() - interval '205 days', now() - interval '200 days', 'done', now() - interval '210 days');
insert into public.notifications (location_id, to_address, category, kind, dedupe_key, title, created_at)
values ('00000000-0000-4000-8000-0000000000c1', 'victim-owner@example.test', 'review_new', 'sec2_old', 'sec2-old-notice', 'Old notice', now() - interval '400 days');
insert into public.deletion_log (tbl, row_id, deleted_at) values ('contacts', 'old', now() - interval '61 days');

select ok((private.retention_sources() ->> 'founding_applications')::int = 1, 'the job deletes the application decided 100 days ago');
select is((select array_agg(business_name order by business_name) from public.founding_applications
            where id::text like '00000000-0000-4000-8000-0000000002f%'),
  array['Accepted Salon', 'Declined Salon', 'Waiting Salon'], 'the ones still inside their time and the accepted one stay');
select is((select array_agg(kind order by kind) from public.jobs where kind like 'sectwo_%'), array['sectwo_new', 'sectwo_open'],
  'finished jobs older than 30 days go; open and recent ones stay');
select is((select count(*) from public.google_events where message_id = 'sec2-old'), 0::bigint, 'Pub/Sub notices older than 90 days go');
select is((select count(*) from public.product_events where event = 'sectwo_old'), 0::bigint, 'sent product events older than 30 days go');
select is((select count(*) from public.whatsapp_number_health where checked_at < now() - interval '90 days'), 0::bigint, 'old number health rows go');
select is((select count(*) from public.staff_followups where detail = 'sec2'), 0::bigint, 'done follow-ups older than 180 days go');
select is((select count(*) from public.notifications where kind = 'sec2_old'), 0::bigint, 'notifications older than 12 months go');
select is((select count(*) from public.deletion_log where row_id = 'old'), 0::bigint, 'the deletion log keeps 60 days');
select is((select count(*) from cron.job where jobname = 'kabsi_retention_sources'), 1::bigint, 'the job runs every day')
  where exists (select 1 from cron.job where jobname = 'kabsi_retention_sources')
union all select pass('the cron job is unscheduled in the test database') where not exists (select 1 from cron.job where jobname = 'kabsi_retention_sources');

-- Photos of a business that left are due for removal.
insert into public.locations (id, name, place_id, access_lost_at) values ('00000000-0000-4000-8000-0000000002c9', 'Gone Cafe', 'gone-place', now() - interval '10 days');
insert into public.photos (id, location_id, storage_path) values ('00000000-0000-4000-8000-0000000002d1', '00000000-0000-4000-8000-0000000002c9', '00000000-0000-4000-8000-0000000002c9/a.jpg');
select ok((private.retention_sources() ->> 'photo_files_due')::int >= 1, 'a business that left has its photo files made due');
select isnt((select file_due_at from public.photos where id = '00000000-0000-4000-8000-0000000002d1'), null, 'the file is due now');
select is((select count(*) from public.jobs where kind = 'photo_files' and state = 'pending'), 1::bigint, 'and the removal job is queued');

-- 6. The deletion log, and a restore that repeats it -------------------------------------------------------------------
delete from public.contacts where email = 'victim-contact@example.test';
delete from public.locations where id = '00000000-0000-4000-8000-0000000002c9';
select is((select count(*) from public.deletion_log where tbl in ('contacts', 'locations') and deleted_at > now() - interval '1 minute'), 2::bigint,
  'deleting a contact and a business writes their ids to the deletion log');
select is((select count(*) from public.deletion_log where row_id like '%@%'), 0::bigint, 'the log holds ids, never an address');
-- A restored copy still has the rows: the log puts the deletions back.
insert into public.contacts (id, email) values ('00000000-0000-4000-8000-0000000002a9', 'restored@example.test');
select is(private.reapply_deletions(jsonb_build_array(
  jsonb_build_object('tbl', 'contacts', 'row_id', '00000000-0000-4000-8000-0000000002a9'),
  jsonb_build_object('tbl', 'reviews', 'row_id', '00000000-0000-4000-8000-0000000000e1'),
  jsonb_build_object('tbl', 'contacts; drop table x', 'row_id', '1'))), 1,
  'reapply_deletions deletes only listed tables by id');
select is((select count(*) from public.reviews where id = '00000000-0000-4000-8000-0000000000e1'), 1::bigint, 'a table not on the list is untouched');
select ok(not has_function_privilege('authenticated', 'private.reapply_deletions(jsonb)', 'execute'), 'reapply_deletions is not for the browser');
select ok(not has_table_privilege('authenticated', 'public.deletion_log', 'select') and not has_table_privilege('anon', 'public.deletion_log', 'select'),
  'the browser cannot read the deletion log');

-- 7. Webhooks refused, counted --------------------------------------------------------------------------------------
select public.record_webhook_rejection(s, r) from (values ('creem', 'unauthorized'), ('creem', 'unauthorized'), ('whatsapp', 'too_large'),
  ('google_events', 'unauthorized'), ('resend', 'bad signature')) v(s, r);
select is((select n from public.webhook_rejections where source = 'creem' and reason = 'unauthorized'), 2, 'two refusals in one hour count as two');
select is((select reason from public.webhook_rejections where source = 'resend'), 'bad_signature', 'reasons are plain codes');
select throws_ok($$ select public.record_webhook_rejection('slack', 'x') $$, '23514', null, 'only the four webhook sources');
select ok(not has_function_privilege('anon', 'public.record_webhook_rejection(text,text)', 'execute')
  and not has_function_privilege('authenticated', 'public.record_webhook_rejection(text,text)', 'execute'), 'only the service role records');

-- 8. The operations view ---------------------------------------------------------------------------------------------
insert into public.google_connections (location_id, access_state) values ('00000000-0000-4000-8000-0000000000c2', 'removed')
on conflict (location_id) do update set access_state = 'removed';
update public.publications set publish_after = now() - interval '20 minutes'
 where target_id = '00000000-0000-4000-8000-0000000002e1' and state = 'approved';
insert into public.jobs (kind, state, last_error, finished_at) values ('sectwo_dead', 'dead', 'mail to owner@example.test failed ?t=abc', now());
select tests.act_as('00000000-0000-4000-8000-0000000000a3');
select is(jsonb_array_length(public.staff_operations() -> 'stuck'), 1, 'staff see the approval stuck for 20 minutes');
select ok((public.staff_operations() -> 'stuck' -> 0 ->> 'todo') <> '', 'with what to do');
select ok(exists (select 1 from jsonb_array_elements(public.staff_operations() -> 'access_stopped') e
  where e ->> 'location_id' = '00000000-0000-4000-8000-0000000000c2'), 'and the business whose access was removed');
select is((select e ->> 'error' from jsonb_array_elements(public.staff_operations() -> 'jobs') e where e ->> 'kind' = 'sectwo_dead'),
  'mail to [email] failed ?t=[redacted]', 'job errors are scrubbed for staff');
select ok(jsonb_array_length(public.staff_operations() -> 'webhooks_rejected') >= 4, 'refused webhooks of the last 24 hours');
reset role;
select tests.act_as('00000000-0000-4000-8000-0000000000a1');
select throws_ok($$ select public.staff_operations() $$, '42501', null, 'an owner cannot open the operations view');
reset role;
select tests.act_as('00000000-0000-4000-8000-0000000000b1');
select throws_ok($$ select public.staff_operations() $$, '42501', null, 'a stranger cannot either');
reset role;
set local role anon;
select throws_ok($$ select public.staff_operations() $$, '42501', null, 'nor anon');
reset role;

-- New check constraints: every value the code writes passes (webhook_rejections.source and reason).
select lives_ok($$ select public.record_webhook_rejection(s, r) from unnest(array['creem', 'whatsapp', 'google_events', 'resend']) s,
  unnest(array['unauthorized', 'forbidden', 'too_large', 'bad_signature', 'refused', 'status_401', 'status_413']) r $$,
  'every source and reason the webhooks record fits the checks');

select * from finish();
rollback;
