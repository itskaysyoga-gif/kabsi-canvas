-- P0.2-01: the K-40 retention table and the daily job that reads it (K-40, K-113.3, D257, D266). Every limit is tested
-- with one row just past it and one just inside it; the job must clear exactly the past ones and keep ids, ratings,
-- dates and the owner's own values.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

\ir _fixtures.psql

-- The table matches K-40 row for row --------------------------------------------------------------------------------

select results_eq(
  $$ select data_class, keep_days, kept, basis from public.retention_policies order by data_class $$,
  $$ values
    ('audit_log', 731, '24 months, content fields redacted per the rows above', 'Proof of approvals'),
    ('drafts_and_payloads', null::int, 'Redacted with their review (exists)', 'Linked to Google content'),
    ('email_log', 366, '12 months (exists)', 'Delivery disputes'),
    ('google_data_after_access_lost', 30, 'Deleted after 30 days (exists)', 'Google API policy'),
    ('google_performance', 30, '30 days, re-fetched on demand', 'Google API policy'),
    ('google_profile_values', 30, '30 days', 'Google API policy'),
    ('nora_chats', 366, '12 months (exists)', 'Support'),
    ('owner_values', null::int, 'Life of account, deleted on account deletion', 'Owner''s own data'),
    ('review_content', 30, '30 days after Google last returned it', 'Google API policy'),
    ('review_metadata', null::int, 'Life of account', 'Ids and numbers needed for workflow'),
    ('uploaded_photos', 30, '30 days after publishing, or on skip', 'Not needed after Google has it')
  $$,
  'retention_policies holds the eleven K-40 rows');

select ok((select relrowsecurity from pg_class where oid = 'public.retention_policies'::regclass), 'RLS is on for retention_policies');
select is(
  (select coalesce(array_agg(r || ':' || p order by r, p), '{}') from unnest(array['anon', 'authenticated']) r,
     unnest(array['SELECT', 'INSERT', 'UPDATE', 'DELETE']) p
   where has_table_privilege(r, 'public.retention_policies', p)),
  '{}'::text[], 'anon and authenticated cannot read or write retention_policies');
select throws_ok($$ update public.retention_policies set keep_days = 31 where data_class = 'review_content' $$,
  '23514', null, 'a Google class cannot be kept longer than 30 days');
select throws_ok($$ select private.retention_days('no_such_class') $$, 'P0001', 'retention_policies: no row for no_such_class',
  'a missing class stops the job instead of keeping data');
select ok(not has_function_privilege('authenticated', 'private.run_retention()', 'execute')
  and not has_function_privilege('anon', 'private.retention_days(text)', 'execute'),
  'the retention functions are closed to the browser');

-- Seed rows on both sides of every limit -----------------------------------------------------------------------------
-- LA (..c1) is the victim business; a second business ..c3 lost Google access 31 days ago, ..c4 only 29 days ago.

insert into public.locations (id, name, place_id, access_lost_at, access_granted_at) values
  ('00000000-0000-4000-8000-0000000000c3', 'Lost 31', 'lost-31', now() - interval '31 days', null),
  ('00000000-0000-4000-8000-0000000000c4', 'Lost 29', 'lost-29', now() - interval '29 days', null);
insert into public.reviews (id, location_id, google_review_id, star_rating, review_created_at, comment, reviewer_name, fetched_at) values
  ('00000000-0000-4000-8000-000000000e31', '00000000-0000-4000-8000-0000000000c3', 'lost-31-review', 4, now() - interval '40 days', 'Kept?', 'Lost A', now()),
  ('00000000-0000-4000-8000-000000000e29', '00000000-0000-4000-8000-0000000000c4', 'lost-29-review', 4, now() - interval '40 days', 'Kept', 'Lost B', now()),
  ('00000000-0000-4000-8000-0000000000e2', '00000000-0000-4000-8000-0000000000c1', 'old-review', 2, now() - interval '60 days', 'Slow service', 'Old Reviewer', now() - interval '31 days'),
  ('00000000-0000-4000-8000-0000000000e3', '00000000-0000-4000-8000-0000000000c1', 'new-review', 5, now() - interval '60 days', 'Lovely', 'New Reviewer', now() - interval '29 days');
update public.reviews set existing_reply = 'Thank you', reply_state = 'live' where id in ('00000000-0000-4000-8000-0000000000e2', '00000000-0000-4000-8000-0000000000e3');
insert into public.reply_drafts (review_id, version, body, source, safety_ok) values
  ('00000000-0000-4000-8000-0000000000e2', 1, 'Sorry about the wait.', 'ai', true),
  ('00000000-0000-4000-8000-0000000000e3', 1, 'Thank you so much.', 'ai', true);
insert into public.publications (id, location_id, target_type, target_id, payload, approved_by, channel, google_response) values
  ('00000000-0000-4000-8000-0000000000a5', '00000000-0000-4000-8000-0000000000c1', 'review_reply', '00000000-0000-4000-8000-0000000000e2',
   '{"comment": "Sorry about the wait."}', '00000000-0000-4000-8000-0000000000a1', 'dashboard', '{"comment": "Sorry about the wait."}'),
  ('00000000-0000-4000-8000-0000000000a6', '00000000-0000-4000-8000-0000000000c1', 'review_reply', '00000000-0000-4000-8000-0000000000e3',
   '{"comment": "Thank you so much."}', '00000000-0000-4000-8000-0000000000a1', 'dashboard', '{"comment": "Thank you so much."}'),
  ('00000000-0000-4000-8000-0000000000a7', '00000000-0000-4000-8000-0000000000c1', 'special_hours', '00000000-0000-4000-8000-0000000000f8',
   '{"closed": true}', '00000000-0000-4000-8000-0000000000a1', 'dashboard', '{"specialHours": "old"}'),
  ('00000000-0000-4000-8000-0000000000a8', '00000000-0000-4000-8000-0000000000c1', 'special_hours', '00000000-0000-4000-8000-0000000000f9',
   '{"closed": true}', '00000000-0000-4000-8000-0000000000a1', 'dashboard', '{"specialHours": "new"}');
alter table public.publications disable trigger publications_updated;
update public.publications set updated_at = now() - interval '31 days' where id = '00000000-0000-4000-8000-0000000000a7';
update public.publications set updated_at = now() - interval '29 days' where id = '00000000-0000-4000-8000-0000000000a8';
alter table public.publications enable trigger publications_updated;

insert into public.weekly_reports (location_id, week_of, data, created_at) values
  ('00000000-0000-4000-8000-0000000000c1', '2026-08-31', '{"rating": 4.5, "quotes": ["Old quote"]}', now() - interval '31 days'),
  ('00000000-0000-4000-8000-0000000000c1', '2026-09-07', '{"rating": 4.6, "quotes": ["New quote"]}', now() - interval '29 days');
insert into public.rating_snapshots (location_id, taken_on, rating, review_count) values
  ('00000000-0000-4000-8000-0000000000c1', current_date - 31, 4.4, 10),
  ('00000000-0000-4000-8000-0000000000c1', current_date - 30, 4.5, 11);
insert into public.listing_changes (id, location_id, field, old_value, new_value, detected_by, state, created_at) values
  ('00000000-0000-4000-8000-0000000000b4', '00000000-0000-4000-8000-0000000000c1', 'phone', '"111"', '"222"', 'scheduled_check', 'kept', now() - interval '31 days'),
  ('00000000-0000-4000-8000-0000000000b5', '00000000-0000-4000-8000-0000000000c1', 'phone', '"111"', '"333"', 'scheduled_check', 'kept', now() - interval '29 days'),
  ('00000000-0000-4000-8000-0000000000b6', '00000000-0000-4000-8000-0000000000c1', 'phone', '"111"', '"444"', 'scheduled_check', 'open', now() - interval '31 days');
update public.listing_baselines set fields = '{"phone": "111"}', updated_by = 'owner', updated_at = now() - interval '200 days'
 where location_id = '00000000-0000-4000-8000-0000000000c1';
update public.locations set knowledge_card = '{"about": "Family bakery"}', category = 'bakery', category_label = 'Bakery', area = 'Hamra'
 where id = '00000000-0000-4000-8000-0000000000c1';
update public.locations set place_details_at = now() - interval '31 days' where id = '00000000-0000-4000-8000-0000000000c1';
insert into public.locations (id, name, place_id, category, category_label, area) values
  ('00000000-0000-4000-8000-0000000000c5', 'Fresh places', 'fresh-places', 'cafe', 'Cafe', 'Achrafieh');
update public.locations set place_details_at = now() - interval '29 days' where id = '00000000-0000-4000-8000-0000000000c5';

-- Photos: posted 31 and 29 days ago, skipped today, still a draft, failed.
insert into public.photos (id, location_id, storage_path, state) values
  ('00000000-0000-4000-8000-0000000000d5', '00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000c1/posted31.jpg', 'draft'),
  ('00000000-0000-4000-8000-0000000000d6', '00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000c1/posted29.jpg', 'draft'),
  ('00000000-0000-4000-8000-0000000000d7', '00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000c1/skipped.jpg', 'draft'),
  ('00000000-0000-4000-8000-0000000000d8', '00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000c1/draft.jpg', 'draft'),
  ('00000000-0000-4000-8000-0000000000d9', '00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000c1/failed.jpg', 'draft');
update public.photos set state = 'posted' where id in ('00000000-0000-4000-8000-0000000000d5', '00000000-0000-4000-8000-0000000000d6');
update public.photos set state = 'skipped' where id = '00000000-0000-4000-8000-0000000000d7';
update public.photos set state = 'failed' where id = '00000000-0000-4000-8000-0000000000d9';
select is((select count(*)::int from public.photos where id::text like '%0d5' and settled_at is not null), 1,
  'posting a photo stamps settled_at');
select is((select settled_at from public.photos where id = '00000000-0000-4000-8000-0000000000d9'), null,
  'a failed photo is not settled');
update public.photos set settled_at = now() - interval '31 days' where id = '00000000-0000-4000-8000-0000000000d5';
update public.photos set settled_at = now() - interval '29 days' where id = '00000000-0000-4000-8000-0000000000d6';

insert into public.emails (location_id, kind, to_address, subject, created_at) values
  ('00000000-0000-4000-8000-0000000000c1', 'test', 'victim-owner@example.test', 'Email 367', now() - interval '367 days'),
  ('00000000-0000-4000-8000-0000000000c1', 'test', 'victim-owner@example.test', 'Email 365', now() - interval '365 days');
insert into public.chat_conversations (id, visitor_id, updated_at) values
  ('00000000-0000-4000-8000-0000000000fa', 'chat-367', now() - interval '367 days'),
  ('00000000-0000-4000-8000-0000000000fb', 'chat-365', now() - interval '365 days');

create temp table ids (name text primary key, id bigint);
alter table public.audit_events disable trigger audit_events_immutable;
insert into ids select 'audit_732', private.audit('system', null, 'test_event', null, null, null, '{"a": 1}', null, 'system', 'ok');
insert into ids select 'audit_729', private.audit('system', null, 'test_event', null, null, null, '{"a": 1}', null, 'system', 'ok');
insert into ids select 'change_31', private.audit('system', null, 'detected', '00000000-0000-4000-8000-0000000000c1',
  'listing_change', 'x31', '{"phone": "111"}', '{"phone": "222"}', 'system', 'ok');
insert into ids select 'change_29', private.audit('system', null, 'detected', '00000000-0000-4000-8000-0000000000c1',
  'listing_change', 'x29', '{"phone": "111"}', '{"phone": "333"}', 'system', 'ok');
insert into ids select 'owner_edit', private.audit('user', '00000000-0000-4000-8000-0000000000a1', 'knowledge_edit',
  '00000000-0000-4000-8000-0000000000c1', 'knowledge_card', 'about', '{"about": "old"}', '{"about": "new"}', 'dashboard', 'saved');
update public.audit_events set created_at = now() - interval '732 days' where id = (select id from ids where name = 'audit_732');
update public.audit_events set created_at = now() - interval '729 days' where id = (select id from ids where name = 'audit_729');
update public.audit_events set created_at = now() - interval '31 days' where id in (select id from ids where name in ('change_31', 'owner_edit'));
update public.audit_events set created_at = now() - interval '29 days' where id = (select id from ids where name = 'change_29');
alter table public.audit_events enable trigger audit_events_immutable;

-- Run ---------------------------------------------------------------------------------------------------------------

create temp table run as select private.run_retention() as r;
select ok((select (r ->> 'review_text')::int >= 1 and (r ->> 'photo_files_due')::int = 2 and (r ->> 'place_details')::int >= 1
                  and (r ->> 'google_responses')::int >= 1 and (r ->> 'audit_deleted')::int >= 1 from run),
  'run_retention reports what it cleared');
select is((select count(*)::int from public.jobs_log where job = 'retention'), 1, 'the run is logged once');

-- Access lost
select is((select count(*)::int from public.reviews where id = '00000000-0000-4000-8000-000000000e31'), 0,
  'access lost 31 days ago: the Google reviews are deleted');
select is((select count(*)::int from public.reviews where id = '00000000-0000-4000-8000-000000000e29'), 1,
  'access lost 29 days ago: the reviews stay');

-- Review content and what is kept with it
select is((select row(comment, reviewer_name, content_purged_at is not null, star_rating, google_review_id, review_created_at < now(), existing_reply)::text
             from public.reviews where id = '00000000-0000-4000-8000-0000000000e2'),
  row(null::text, null::text, true, 2, 'old-review', true, 'Thank you')::text,
  'review last returned 31 days ago: text and name cleared; id, rating, dates and reply kept');
select is((select row(comment, reviewer_name, content_purged_at)::text from public.reviews where id = '00000000-0000-4000-8000-0000000000e3'),
  row('Lovely', 'New Reviewer', null::timestamptz)::text, 'review last returned 29 days ago: untouched');
select is((select body from public.reply_drafts where review_id = '00000000-0000-4000-8000-0000000000e2'), '',
  'the draft about the purged review is redacted');
select is((select body from public.reply_drafts where review_id = '00000000-0000-4000-8000-0000000000e3'), 'Thank you so much.',
  'the draft about the kept review stays');
select is((select payload::text from public.publications where id = '00000000-0000-4000-8000-0000000000a5'), '{"redacted": true}',
  'the reply payload of the purged review is redacted');
select is((select payload ->> 'comment' from public.publications where id = '00000000-0000-4000-8000-0000000000a6'), 'Thank you so much.',
  'the reply payload of the kept review stays');
select is((select data::text from public.weekly_reports where week_of = '2026-08-31'), '{"quotes": [], "rating": 4.5}',
  'report quotes older than 30 days go, the numbers stay');
select is((select data -> 'quotes' ->> 0 from public.weekly_reports where week_of = '2026-09-07'), 'New quote',
  'report quotes inside 30 days stay');

-- Google performance figures
select is((select array_agg(taken_on - current_date order by taken_on) from public.rating_snapshots
            where location_id = '00000000-0000-4000-8000-0000000000c1' and taken_on < current_date),
  array[-30], 'rating snapshots older than 30 days are deleted, the 30 day one stays');

-- Google profile values
select is((select row(old_value, new_value, state, field)::text from public.listing_changes where id = '00000000-0000-4000-8000-0000000000b4'),
  row(null::jsonb, null::jsonb, 'kept', 'phone')::text, 'a decided Protection change older than 30 days loses its values, keeps its field and decision');
select is((select new_value::text from public.listing_changes where id = '00000000-0000-4000-8000-0000000000b5'), '"333"',
  'a decided change inside 30 days keeps its values');
select is((select new_value::text from public.listing_changes where id = '00000000-0000-4000-8000-0000000000b6'), '"444"',
  'an open change keeps its values until the owner decides');
select is((select row(category, category_label, area)::text from public.locations where id = '00000000-0000-4000-8000-0000000000c1'),
  row(null::text, null::text, null::text)::text, 'Places details older than 30 days are cleared');
select is((select row(name, place_id, knowledge_card ->> 'about')::text from public.locations where id = '00000000-0000-4000-8000-0000000000c1'),
  row('Victim Bakery', 'victim-place', 'Family bakery')::text, 'the business name, place id and the owner''s knowledge stay');
select is((select category from public.locations where id = '00000000-0000-4000-8000-0000000000c5'), 'cafe',
  'Places details inside 30 days stay');
select is((select row(google_response, payload)::text from public.publications where id = '00000000-0000-4000-8000-0000000000a7'),
  row(null::jsonb, '{"closed": true}'::jsonb)::text, 'Google''s response older than 30 days is cleared, the owner''s approved payload stays');
select is((select google_response::text from public.publications where id = '00000000-0000-4000-8000-0000000000a8'), '{"specialHours": "new"}',
  'Google''s response inside 30 days stays');
select is((select fields::text from public.listing_baselines where location_id = '00000000-0000-4000-8000-0000000000c1'), '{"phone": "111"}',
  'the owner-approved baseline stays');

-- Uploaded photos
select is((select array_agg(split_part(storage_path, '/', 2) order by storage_path) from public.photos
            where file_due_at is not null and file_deleted_at is null),
  array['posted31.jpg', 'skipped.jpg'], 'a photo 31 days on Google and a skipped photo are due for removal, the others are not');
select is((select count(*)::int from public.jobs where kind = 'photo_files' and state = 'pending' and dedupe_key = 'photo_files'), 1,
  'one photo_files job is offered');
select is((select row(id, state, category)::text from public.photos where id = '00000000-0000-4000-8000-0000000000d5'),
  row('00000000-0000-4000-8000-0000000000d5'::uuid, 'posted', null::text)::text, 'the photo row itself stays');

-- What the photo_files handler does after removing the objects (supabase/functions/_shared/retention.ts).
update public.photos set file_deleted_at = now() where file_due_at is not null and file_deleted_at is null;
update public.jobs set state = 'succeeded', finished_at = now() where kind = 'photo_files';
select is((select (private.run_retention() ->> 'photo_files_due')::int), 0, 'a second run marks nothing again');
select is((select count(*)::int from public.jobs where kind = 'photo_files' and state = 'pending'), 0,
  'and offers no job when no file is waiting');

-- Email log and Nora chats
select is((select array_agg(subject order by subject) from public.emails where subject like 'Email 36%'), array['Email 365'],
  'emails older than 366 days are deleted, the 365 day one stays');
select is((select count(*)::int from public.emails where to_address = 'victim-owner@example.test' and subject = 'Victim email'), 1,
  'recent emails stay');
select is(private.purge_old_chats(), 1, 'purge_old_chats deletes one conversation');
select is((select array_agg(visitor_id) from public.chat_conversations where visitor_id like 'chat-36%'), array['chat-365'],
  'chats older than 366 days are deleted, the 365 day one stays');

-- Audit log
select is((select count(*)::int from public.audit_events where id = (select id from ids where name = 'audit_732')), 0,
  'audit entries older than 731 days are deleted');
select is((select before::text from public.audit_events where id = (select id from ids where name = 'audit_729')), '{"a": 1}',
  'an audit entry of 729 days stays with its content');
select is((select row(before, after, redacted_at is not null, action, object_id)::text from public.audit_events where id = (select id from ids where name = 'change_31')),
  row(null::jsonb, null::jsonb, true, 'detected', 'x31')::text, 'a Protection change event older than 30 days loses its Google values, keeps who, what and when');
select is((select after::text from public.audit_events where id = (select id from ids where name = 'change_29')), '{"phone": "333"}',
  'a Protection change event inside 30 days keeps its values');
select is((select after::text from public.audit_events where id = (select id from ids where name = 'owner_edit')), '{"about": "new"}',
  'the owner''s own knowledge edit keeps its content');

-- The limits come from the table: shorten one and the job follows.
update public.retention_policies set keep_days = 28 where data_class = 'review_content';
select is((select (private.run_retention() ->> 'review_text')::int), 1, 'with review_content at 28 days the 29 day review is cleared too');
update public.retention_policies set keep_days = 5 where data_class = 'owner_values';
select throws_ok($$ select private.run_retention() $$, 'P0001', null, 'a limit on a life-of-account class stops the job');

select * from finish();
rollback;
