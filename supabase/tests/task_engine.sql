-- P0.3-05: one task engine (K-08, K-07, R-05). tasks is the one owner queue; rows are made and closed only by the
-- detectors, one function each, and running a detector twice makes one task. Home and Nora read list_tasks only.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

\ir _fixtures.psql

-- The victim business is a live one for these tests (the gap and plan detectors look at active businesses only).
update public.locations set status = 'active', consent_at = now(), access_granted_at = now(),
  google_location_id = 'locations/mock-victim', is_demo = false
 where id = '00000000-0000-4000-8000-0000000000c1';
create temp table live_count as select 0 as n;
create function pg_temp.live(p_dedupe text) returns bigint language sql as $$
  select count(*) from public.tasks where location_id = '00000000-0000-4000-8000-0000000000c1' and dedupe_key = p_dedupe
     and state in ('open', 'snoozed', 'approved', 'publishing') $$;
create function pg_temp.task(p_dedupe text) returns public.tasks language sql as $$
  select * from public.tasks where location_id = '00000000-0000-4000-8000-0000000000c1' and dedupe_key = p_dedupe
   order by (state in ('open', 'snoozed', 'approved', 'publishing')) desc, resolved_at desc nulls first limit 1 $$;

-- Shape ---------------------------------------------------------------------------------------------------------------
select has_table('public', 'tasks', 'tasks exists');
select ok((select relrowsecurity from pg_class where oid = 'public.tasks'::regclass), 'RLS is on for tasks');
select columns_are('public', 'tasks', array['id', 'location_id', 'kind', 'source_type', 'source_id', 'priority', 'title',
  'why', 'recommendation', 'evidence', 'proposed_action', 'approval_policy', 'state', 'due_at', 'snooze_until',
  'created_at', 'updated_at', 'resolved_at', 'resolved_by', 'dedupe_key', 'publication_id'], 'tasks has the K-08 fields and the publication');
select is((select confdeltype::text from pg_constraint where conname = 'tasks_location_id_fkey'), 'c', 'a business''s tasks go with it');
select is((select confdeltype::text from pg_constraint where conname = 'tasks_publication_id_fkey'), 'n', 'a cleared publication leaves the task');
select throws_ok($$ insert into public.tasks (location_id, kind, source_type, source_id, priority, title, why, dedupe_key)
  values ('00000000-0000-4000-8000-0000000000c1', 'profile_gap', 'x_y', 'a', 'high', 'T', 'W', 'zz:a') $$, '23514', null,
  'priority is urgent, recommended or nice (no points, K-07)');
select throws_ok($$ insert into public.tasks (location_id, kind, source_type, source_id, priority, title, why, dedupe_key)
  values ('00000000-0000-4000-8000-0000000000c1', 'listing_task', 'x_y', 'a', 'nice', 'T', 'W', 'zz:b') $$, '23514', null,
  'kind is one of the nine K-08 kinds');
select throws_ok($$ insert into public.tasks (location_id, kind, source_type, source_id, priority, title, why, dedupe_key)
  values ('00000000-0000-4000-8000-0000000000c1', 'profile_gap', 'profile_gap', 'victim', 'nice', 'T', 'W', 'profile_gap:victim') $$,
  '23505', null, 'the dedupe key is unique per business while the task is live');
update public.tasks set state = 'done', resolved_at = now() where id = '00000000-0000-4000-8000-0000000000f8';
select lives_ok($$ insert into public.tasks (location_id, kind, source_type, source_id, priority, title, why, dedupe_key)
  values ('00000000-0000-4000-8000-0000000000c1', 'profile_gap', 'profile_gap', 'victim', 'nice', 'T', 'W', 'profile_gap:victim') $$,
  'once closed, the same key can open again');
delete from public.tasks where dedupe_key = 'profile_gap:victim' and state = 'open';
update public.tasks set state = 'open', resolved_at = null where id = '00000000-0000-4000-8000-0000000000f8';

-- Nobody writes tasks from the browser (K-08: server-side detectors only).
select tests.act_as('00000000-0000-4000-8000-0000000000a1');
select throws_ok($$ insert into public.tasks (location_id, kind, source_type, source_id, priority, title, why, dedupe_key)
  values ('00000000-0000-4000-8000-0000000000c1', 'billing', 'location', 'x', 'urgent', 'T', 'W', 'billing:x') $$,
  '42501', null, 'the owner cannot insert a task');
select throws_ok($$ update public.tasks set title = 'Hacked' where location_id = '00000000-0000-4000-8000-0000000000c1' $$,
  '42501', null, 'the owner cannot change a task');
select throws_ok($$ select public.run_task_detectors('00000000-0000-4000-8000-0000000000c1') $$, '42501', null,
  'the owner cannot run the detectors');
reset role;

-- Detector: new review (review_reply) ---------------------------------------------------------------------------------
update public.reviews set state = 'drafted', risk = 'low', star_rating = 5, comment = 'Secret review text',
  reviewer_name = 'Secret Reviewer' where id = '00000000-0000-4000-8000-0000000000e1';
select is(pg_temp.live('review_reply:00000000-0000-4000-8000-0000000000e1'), 1::bigint,
  'a drafted review makes a task at once (the trigger runs the detector)');
select is((pg_temp.task('review_reply:00000000-0000-4000-8000-0000000000e1')).title, 'Reply ready for a 5-star review', 'its title');
select is((pg_temp.task('review_reply:00000000-0000-4000-8000-0000000000e1')).priority, 'recommended', 'a low-risk review is recommended');
select is((pg_temp.task('review_reply:00000000-0000-4000-8000-0000000000e1')).source_type || ':' ||
          (pg_temp.task('review_reply:00000000-0000-4000-8000-0000000000e1')).source_id,
  'review:00000000-0000-4000-8000-0000000000e1', 'its source is the review');
select is(private.detect_review_tasks('00000000-0000-4000-8000-0000000000c1'), 0, 'running the detector again makes nothing new');
select is(private.detect_review_tasks('00000000-0000-4000-8000-0000000000c1'), 0, 'and a third time neither');
select is(pg_temp.live('review_reply:00000000-0000-4000-8000-0000000000e1'), 1::bigint, 'still one task for the review (dedupe)');
select is((select count(*) from public.tasks where row_to_json(tasks)::text ~ 'Secret'), 0::bigint,
  'no review text or reviewer name is copied into a task');
update public.reviews set state = 'blocked', risk = 'high' where id = '00000000-0000-4000-8000-0000000000e1';
select is((pg_temp.task('review_reply:00000000-0000-4000-8000-0000000000e1')).priority, 'urgent', 'a high-risk review is urgent (K-07)');
select is((pg_temp.task('review_reply:00000000-0000-4000-8000-0000000000e1')).title, 'A 5-star review needs a little more care',
  'the high-risk title');
select is(pg_temp.live('review_reply:00000000-0000-4000-8000-0000000000e1'), 1::bigint, 'the same task, not a second one');
update public.reviews set state = 'drafted', risk = 'low', reply_state = 'rejected' where id = '00000000-0000-4000-8000-0000000000e1';
select is((pg_temp.task('review_reply:00000000-0000-4000-8000-0000000000e1')).priority, 'urgent',
  'a reply Google refused comes back as an urgent task (K-14)');
update public.reviews set reply_state = null where id = '00000000-0000-4000-8000-0000000000e1';
-- Approved: the task follows the review's publication.
update public.publications set state = 'approved', publish_after = now() + interval '10 seconds'
 where target_id = '00000000-0000-4000-8000-0000000000e1';
update public.reviews set state = 'publishing' where id = '00000000-0000-4000-8000-0000000000e1';
select is((pg_temp.task('review_reply:00000000-0000-4000-8000-0000000000e1')).state, 'approved', 'an approved reply: the task is approved');
select is((pg_temp.task('review_reply:00000000-0000-4000-8000-0000000000e1')).publication_id,
  (select id from public.publications where target_id = '00000000-0000-4000-8000-0000000000e1'), 'and links the publication (R-05)');
update public.publications set state = 'publishing' where target_id = '00000000-0000-4000-8000-0000000000e1';
update public.reviews set state = 'publishing' where id = '00000000-0000-4000-8000-0000000000e1';
select is((pg_temp.task('review_reply:00000000-0000-4000-8000-0000000000e1')).state, 'publishing', 'then publishing');
update public.reviews set state = 'posted' where id = '00000000-0000-4000-8000-0000000000e1';
select is((pg_temp.task('review_reply:00000000-0000-4000-8000-0000000000e1')).state, 'done', 'a posted reply closes the task as done');
select isnt((pg_temp.task('review_reply:00000000-0000-4000-8000-0000000000e1')).resolved_at, null, 'with the time');
update public.reviews set state = 'drafted' where id = '00000000-0000-4000-8000-0000000000e1';
select is(pg_temp.live('review_reply:00000000-0000-4000-8000-0000000000e1'), 1::bigint, 'back with the owner (undo): a live task again');
update public.reviews set state = 'skipped' where id = '00000000-0000-4000-8000-0000000000e1';
select is((select count(*) from public.tasks where dedupe_key = 'review_reply:00000000-0000-4000-8000-0000000000e1' and state = 'rejected'),
  1::bigint, 'a skipped review closes the task as rejected');
update public.reviews set state = 'drafted' where id = '00000000-0000-4000-8000-0000000000e1';
update public.reviews set state = 'archived' where id = '00000000-0000-4000-8000-0000000000e1';
select is((select count(*) from public.tasks where dedupe_key = 'review_reply:00000000-0000-4000-8000-0000000000e1' and state = 'expired'),
  1::bigint, 'an archived review closes it as expired');

-- Detector: profile difference (profile_change) -----------------------------------------------------------------------
insert into public.profile_changes (id, location_id, field, google_value, source, severity, status)
values ('00000000-0000-4000-8000-0000000005a1', '00000000-0000-4000-8000-0000000000c1', 'regular_hours', '"Mon 9 to 18"',
        'google_update', 'urgent', 'awaiting_review');
select is(pg_temp.live('profile_change:00000000-0000-4000-8000-0000000005a1'), 1::bigint, 'a Protection difference makes a task');
select is((pg_temp.task('profile_change:00000000-0000-4000-8000-0000000005a1')).priority, 'urgent', 'with its severity as the priority');
select is((pg_temp.task('profile_change:00000000-0000-4000-8000-0000000005a1')).title, 'Your opening hours changed on Google', 'its title');
select is((select count(*) from public.tasks where row_to_json(tasks)::text ~ 'Mon 9 to 18'), 0::bigint, 'Google''s value is not copied');
select is(private.detect_profile_changes('00000000-0000-4000-8000-0000000000c1'), 0, 'run again: nothing new');
select is(pg_temp.live('profile_change:00000000-0000-4000-8000-0000000005a1'), 1::bigint, 'still one task');
update public.profile_changes set status = 'accepted', decided_at = now() where id = '00000000-0000-4000-8000-0000000005a1';
select is((pg_temp.task('profile_change:00000000-0000-4000-8000-0000000005a1')).state, 'done', 'decided: done');

-- Detector: two answers for one fact (knowledge_confirm, the P0.3-01 stub wired) ---------------------------------------
select is(pg_temp.live('knowledge_confirm:00000000-0000-4000-8000-0000000000fe'), 1::bigint,
  'an open knowledge question is a task');
select is((pg_temp.task('knowledge_confirm:00000000-0000-4000-8000-0000000000fe')).title, 'Which faq is right?', 'its title');
select is(private.detect_knowledge_confirms('00000000-0000-4000-8000-0000000000c1'), 0, 'run again: nothing new');
select tests.act_as('00000000-0000-4000-8000-0000000000a1');
select lives_ok($$ select public.answer_knowledge_confirm('00000000-0000-4000-8000-0000000000fe', 'proposed') $$, 'the owner answers it');
reset role;
select is((pg_temp.task('knowledge_confirm:00000000-0000-4000-8000-0000000000fe')).state, 'done', 'answered: the task is done at once');
select is((pg_temp.task('knowledge_confirm:00000000-0000-4000-8000-0000000000fe')).resolved_by,
  '00000000-0000-4000-8000-0000000000a1'::uuid, 'closed by the owner who answered');

-- Detector: post drafts (post) and photo drafts (photo_batch) ---------------------------------------------------------
select is((select count(*) from public.tasks where location_id = '00000000-0000-4000-8000-0000000000c1' and kind = 'post'
            and source_type = 'gbp_post' and state = 'open'), 1::bigint, 'the drafted post is a task');
update public.gbp_posts set state = 'posted' where location_id = '00000000-0000-4000-8000-0000000000c1';
select is((select count(*) from public.tasks where location_id = '00000000-0000-4000-8000-0000000000c1' and kind = 'post'
            and source_type = 'gbp_post' and state = 'done'), 1::bigint, 'posted: done');
insert into public.photos (location_id, storage_path, state) values
  ('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000c1/a.jpg', 'draft');
select is((pg_temp.task('photo_batch:00000000-0000-4000-8000-0000000000c1')).title, '1 photo is checked and ready to post',
  'a photo ready makes one batch task');
insert into public.photos (location_id, storage_path, state) values
  ('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000c1/b.jpg', 'draft');
select is((pg_temp.task('photo_batch:00000000-0000-4000-8000-0000000000c1')).title, '2 photos are checked and ready to post',
  'a second photo updates the same task');
select is(pg_temp.live('photo_batch:00000000-0000-4000-8000-0000000000c1'), 1::bigint, 'one batch task per business');
update public.photos set state = 'posted' where location_id = '00000000-0000-4000-8000-0000000000c1' and state = 'draft';
select is((pg_temp.task('photo_batch:00000000-0000-4000-8000-0000000000c1')).state, 'done', 'all posted: done');

-- Detector: failed publish ---------------------------------------------------------------------------------------------
insert into public.gbp_posts (id, location_id, owner_input, state) values
  ('00000000-0000-4000-8000-0000000005b1', '00000000-0000-4000-8000-0000000000c1', 'Victim post two', 'failed');
insert into public.publications (id, location_id, target_type, target_id, payload, approved_by, channel, state)
values ('00000000-0000-4000-8000-0000000005b2', '00000000-0000-4000-8000-0000000000c1', 'local_post',
        '00000000-0000-4000-8000-0000000005b1', '{}', '00000000-0000-4000-8000-0000000000a1', 'dashboard', 'failed');
select is(pg_temp.live('publication:00000000-0000-4000-8000-0000000005b2'), 1::bigint, 'a failed publication makes a task');
select is((pg_temp.task('publication:00000000-0000-4000-8000-0000000005b2')).priority, 'urgent', 'urgent');
select is((pg_temp.task('publication:00000000-0000-4000-8000-0000000005b2')).kind, 'post', 'of the item''s kind');
select is((pg_temp.task('publication:00000000-0000-4000-8000-0000000005b2')).publication_id,
  '00000000-0000-4000-8000-0000000005b2'::uuid, 'linked to the publication');
select is(private.detect_failed_publishes('00000000-0000-4000-8000-0000000000c1'), 0, 'run again: nothing new');
select is(pg_temp.live('publication:00000000-0000-4000-8000-0000000005b2'), 1::bigint, 'still one task');
insert into public.publications (location_id, target_type, target_id, payload, approved_by, channel, state, created_at)
values ('00000000-0000-4000-8000-0000000000c1', 'local_post', '00000000-0000-4000-8000-0000000005b1', '{}',
        '00000000-0000-4000-8000-0000000000a1', 'dashboard', 'approved', now() + interval '1 second');
select is((pg_temp.task('publication:00000000-0000-4000-8000-0000000005b2')).state, 'done', 'approved again: the failure task is done');

-- Detector: missing field and missing knowledge (profile_gap) ---------------------------------------------------------
delete from public.knowledge_facts where location_id = '00000000-0000-4000-8000-0000000000c1';
select ok(private.detect_profile_gaps('00000000-0000-4000-8000-0000000000c1') >= 0, 'the gap detector runs');
select is((pg_temp.task('profile_gap:facts')).title, 'Tell Kabsi 6 more things about your business', 'six facts missing: one task');
select is(private.detect_profile_gaps('00000000-0000-4000-8000-0000000000c1'), 0, 'run again: nothing new');
select is(pg_temp.live('profile_gap:facts'), 1::bigint, 'still one task');
insert into public.knowledge_facts (location_id, slot, key, value, status, source, confirmed_by, confirmed_at)
select '00000000-0000-4000-8000-0000000000c1', 'card.' || k, k, '{"text": "x"}', 'verified', 'owner', '00000000-0000-4000-8000-0000000000a1', now()
  from unnest(array['description', 'service', 'hours_note', 'contact', 'signature']) k;
select private.detect_profile_gaps('00000000-0000-4000-8000-0000000000c1');
select is((pg_temp.task('profile_gap:facts')).title, 'Tell Kabsi 1 more thing about your business', 'five given: the same task, one left');
insert into public.knowledge_facts (location_id, slot, key, value, status, source)
values ('00000000-0000-4000-8000-0000000000c1', 'card.phrase_use', 'phrase_use', '{"text": "x"}', 'needs_confirmation', 'website');
select private.detect_profile_gaps('00000000-0000-4000-8000-0000000000c1');
select is(pg_temp.live('profile_gap:facts'), 1::bigint, 'an unconfirmed fact does not count');
update public.knowledge_facts set status = 'verified', source = 'owner', confirmed_by = '00000000-0000-4000-8000-0000000000a1',
  confirmed_at = now() where slot = 'card.phrase_use'
   and location_id = '00000000-0000-4000-8000-0000000000c1';
select private.detect_profile_gaps('00000000-0000-4000-8000-0000000000c1');
select is((pg_temp.task('profile_gap:facts')).state, 'done', 'all six confirmed: done');
insert into public.knowledge_facts (location_id, slot, key, value, status, source, confirmed_by, confirmed_at)
values ('00000000-0000-4000-8000-0000000000c1', 'profile.phone', 'phone', '{"display": "+1 555 0100"}', 'verified', 'owner',
        '00000000-0000-4000-8000-0000000000a1', now());
select private.detect_profile_gaps('00000000-0000-4000-8000-0000000000c1');
select is((pg_temp.task('profile_gap:basics')).why,
  'Missing on Google: website, main category, opening hours. Complete details help customers reach you.', 'missing profile basics named');

-- Detector: disconnected access (reconnect) ----------------------------------------------------------------------------
update public.google_connections set access_state = 'lost' where location_id = '00000000-0000-4000-8000-0000000000c1';
select is(pg_temp.live('reconnect:00000000-0000-4000-8000-0000000000c1'), 1::bigint, 'lost access makes a task');
select is((pg_temp.task('reconnect:00000000-0000-4000-8000-0000000000c1')).priority, 'urgent', 'urgent');
select is(private.detect_access_lost('00000000-0000-4000-8000-0000000000c1'), 0, 'run again: nothing new');
update public.google_connections set access_state = 'granted' where location_id = '00000000-0000-4000-8000-0000000000c1';
select is((pg_temp.task('reconnect:00000000-0000-4000-8000-0000000000c1')).state, 'done', 'access back: done');
update public.locations set disconnect_requested_at = now() where id = '00000000-0000-4000-8000-0000000000c1';
update public.google_connections set access_state = 'removed' where location_id = '00000000-0000-4000-8000-0000000000c1';
update public.google_connections set access_state = 'lost' where location_id = '00000000-0000-4000-8000-0000000000c1';
select is(pg_temp.live('reconnect:00000000-0000-4000-8000-0000000000c1'), 0::bigint,
  'no reconnect task when the owner disconnected Kabsi (their choice)');
update public.locations set disconnect_requested_at = null where id = '00000000-0000-4000-8000-0000000000c1';
update public.google_connections set access_state = 'granted' where location_id = '00000000-0000-4000-8000-0000000000c1';

-- Detector: expiring plan (billing) ------------------------------------------------------------------------------------
update public.plans set status = 'active', starts_at = now() - interval '25 days', ends_at = now() + interval '10 days'
 where location_id = '00000000-0000-4000-8000-0000000000c1';
select is(private.detect_expiring_plan('00000000-0000-4000-8000-0000000000c1'), 0, '10 days left: no task');
update public.plans set ends_at = now() + interval '5 days' - interval '1 hour' where location_id = '00000000-0000-4000-8000-0000000000c1';
select is(private.detect_expiring_plan('00000000-0000-4000-8000-0000000000c1'), 1, '5 days left: a task');
select is((pg_temp.task('billing:00000000-0000-4000-8000-0000000000c1')).title, 'Your plan ends in 5 days', 'its title');
select is((pg_temp.task('billing:00000000-0000-4000-8000-0000000000c1')).priority, 'recommended', 'recommended');
select is(private.detect_expiring_plan('00000000-0000-4000-8000-0000000000c1'), 0, 'run again: nothing new');
update public.plans set ends_at = now() + interval '1 day' - interval '1 hour' where location_id = '00000000-0000-4000-8000-0000000000c1';
select private.detect_expiring_plan('00000000-0000-4000-8000-0000000000c1');
select is((pg_temp.task('billing:00000000-0000-4000-8000-0000000000c1')).priority, 'urgent', '1 day left: urgent');
select is(pg_temp.live('billing:00000000-0000-4000-8000-0000000000c1'), 1::bigint, 'the same task');
insert into public.plans (location_id, kind, status, starts_at, ends_at)
values ('00000000-0000-4000-8000-0000000000c1', 'pro_monthly', 'active', now() + interval '1 day', now() + interval '31 days');
select private.detect_expiring_plan('00000000-0000-4000-8000-0000000000c1');
select is((pg_temp.task('billing:00000000-0000-4000-8000-0000000000c1')).state, 'done', 'renewed: done');

-- Detector: holiday ahead (stub until P0.5-03) -------------------------------------------------------------------------
select is(private.detect_holidays('00000000-0000-4000-8000-0000000000c1'), 0, 'the holiday detector is a stub for now');

-- All detectors twice: one task per key -------------------------------------------------------------------------------
select public.run_task_detectors('00000000-0000-4000-8000-0000000000c1');
create temp table before_run as select count(*) n from public.tasks;
select is((select sum(value::int) from jsonb_each_text(public.run_task_detectors('00000000-0000-4000-8000-0000000000c1'))), 0::bigint,
  'a second full run makes no new task');
select is((select count(*) from public.tasks), (select n from before_run), 'and the table has the same rows');
select is((select count(*) from (select dedupe_key from public.tasks where state in ('open', 'snoozed', 'approved', 'publishing')
                                  group by location_id, dedupe_key having count(*) > 1) d), 0::bigint, 'no key is live twice');

-- A detector error never stops the change that ran it (the job runs it again and reports) ------------------------------
select lives_ok($$ update public.reviews set state = 'drafted' where id = '00000000-0000-4000-8000-0000000000e1' $$,
  'a review update lives');

-- list_tasks and task_action -------------------------------------------------------------------------------------------
select tests.act_as('00000000-0000-4000-8000-0000000000a1');
select is((public.list_tasks('00000000-0000-4000-8000-0000000000c1') -> 'tasks' -> 0 ->> 'priority'), 'urgent',
  'list_tasks puts urgent first');
select ok((select bool_and(e ? 'path' and e ? 'title' and e ? 'why' and not (e ? 'points') and not (e ? 'score'))
             from jsonb_array_elements(public.list_tasks('00000000-0000-4000-8000-0000000000c1') -> 'tasks') e),
  'each task has a title, a reason and a page, and no points or score');
select is((select e ->> 'path' from jsonb_array_elements(public.list_tasks('00000000-0000-4000-8000-0000000000c1') -> 'tasks') e
            where e ->> 'kind' = 'review_reply'), '/app/inbox', 'a review task opens the review page');
select lives_ok($$ select public.task_action((select id from public.tasks where dedupe_key = 'profile_gap:basics'
                    and state = 'open' and location_id = '00000000-0000-4000-8000-0000000000c1'), 'later') $$, 'the owner puts a task off');
select ok(not exists (select 1 from jsonb_array_elements(public.list_tasks('00000000-0000-4000-8000-0000000000c1') -> 'tasks') e
                       where e ->> 'title' = 'Complete your profile basics'), 'a put-off task leaves the list');
select is((public.list_tasks('00000000-0000-4000-8000-0000000000c1') ->> 'snoozed')::int, 1, 'and is counted as put off');
select throws_ok($$ select public.task_action((select id from public.tasks where dedupe_key = 'profile_gap:basics'
                    and location_id = '00000000-0000-4000-8000-0000000000c1' order by created_at desc limit 1), 'delete') $$,
  'P0001', 'action: later or skip', 'only later and skip');
reset role;
select is((select count(*) from public.audit_events where action = 'task_snoozed' and location_id = '00000000-0000-4000-8000-0000000000c1'),
  1::bigint, 'putting off is audited');
select private.detect_profile_gaps('00000000-0000-4000-8000-0000000000c1');
select is((pg_temp.task('profile_gap:basics')).state, 'snoozed', 'the detector keeps it put off until its date');
update public.tasks set snooze_until = now() - interval '1 minute' where dedupe_key = 'profile_gap:basics' and state = 'snoozed';
select private.detect_profile_gaps('00000000-0000-4000-8000-0000000000c1');
select is((pg_temp.task('profile_gap:basics')).state, 'open', 'after its date it is open again');
-- A manager may put a task off; another business's owner may not.
insert into public.location_members (location_id, user_id, role)
values ('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000b1', 'manager');
select tests.act_as('00000000-0000-4000-8000-0000000000b1');
select lives_ok($$ select public.task_action((select id from public.tasks where dedupe_key = 'profile_gap:basics' and state = 'open'
                    and location_id = '00000000-0000-4000-8000-0000000000c1'), 'skip') $$, 'a manager puts a task off');
reset role;
select tests.act_as('00000000-0000-4000-8000-0000000000b2');
select throws_ok($$ select public.list_tasks('00000000-0000-4000-8000-0000000000c1') $$, '42501', null,
  'the owner of another business cannot list them');
select is((select count(*) from public.tasks where location_id = '00000000-0000-4000-8000-0000000000c1'), 0::bigint,
  'nor read them');
reset role;

-- The job: offered every 5 minutes per business, once turned on -------------------------------------------------------
update public.app_settings set value = 'off' where key = 'task_detectors';
select is((private.produce_jobs() ->> 'detect_tasks')::int, 0, 'off: no detect_tasks job is offered');
update public.app_settings set value = 'on' where key = 'task_detectors';
select ok((private.produce_jobs() ->> 'detect_tasks')::int >= 1, 'on: one job per business');
select is((select count(*) from public.jobs where kind = 'detect_tasks' and location_id = '00000000-0000-4000-8000-0000000000c1'),
  1::bigint, 'one for the victim business');
update public.jobs set state = 'succeeded', finished_at = now() where kind = 'detect_tasks';
select is((private.produce_jobs() ->> 'detect_tasks')::int, 0, 'not again inside 5 minutes');
update public.jobs set created_at = now() - interval '6 minutes' where kind = 'detect_tasks';
select ok((private.produce_jobs() ->> 'detect_tasks')::int >= 1, 'again after 5 minutes');
update public.locations set disconnect_requested_at = now() where id = '00000000-0000-4000-8000-0000000000c2';
update public.jobs set state = 'succeeded', finished_at = now(), created_at = now() - interval '6 minutes' where kind = 'detect_tasks';
select private.produce_jobs();
select is((select count(*) from public.jobs where kind = 'detect_tasks' and location_id = '00000000-0000-4000-8000-0000000000c2'
            and state = 'pending'), 0::bigint, 'none for a disconnected business');

-- Moving profile_tasks -------------------------------------------------------------------------------------------------
insert into public.profile_tasks (location_id, key, title, why, path, points, state, snooze_until) values
  ('00000000-0000-4000-8000-0000000000c2', 'photos', 'Add photos of your business', 'Photos help.', '/app/photos', 15, 'later', now() + interval '2 days'),
  ('00000000-0000-4000-8000-0000000000c2', 'review_link', 'Set up your review link', 'Links help.', '/app/cards', 10, 'open', null),
  ('00000000-0000-4000-8000-0000000000c2', 'replies', 'Answer 2 reviews waiting for you', 'Replying helps.', '/app/inbox', 25, 'open', null),
  ('00000000-0000-4000-8000-0000000000c2', 'posts', 'Publish this week''s post', 'Posts help.', '/app/posts', 15, 'done', null);
select is(private.migrate_profile_tasks(), 2, 'the live score tasks move (not replies, not done)');
select is((select state || ' ' || (snooze_until > now())::text from public.tasks
            where location_id = '00000000-0000-4000-8000-0000000000c2' and dedupe_key = 'profile_gap:photos'), 'snoozed true',
  'a put-off task stays put off until its date');
select is((select priority from public.tasks where location_id = '00000000-0000-4000-8000-0000000000c2'
            and dedupe_key = 'profile_gap:review_link'), 'nice', 'with a priority, no points');
select is(private.migrate_profile_tasks(), 0, 'running the move again moves nothing');

-- The score and the old queue's functions are gone (contract step); only the move still reads profile_tasks.
select hasnt_function('public', 'profile_score', 'profile_score is gone (K-07)');
select hasnt_function('public', 'profile_tasks_list', 'profile_tasks_list is gone');
select hasnt_function('public', 'profile_task_action', 'profile_task_action is gone');
select is(
  (select coalesce(array_agg(p.oid::regprocedure::text order by 1), '{}') from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('public', 'private') and (p.prosrc ~ '\mprofile_tasks\M' or p.prosrc ~ '\mprofile_score\M')
      and p.proname <> 'migrate_profile_tasks'),
  '{}'::text[], 'no function reads profile_tasks or the score');

select * from finish();
rollback;
