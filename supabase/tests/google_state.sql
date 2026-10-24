-- Session 19 rest (master plan 18.2 and 25.3): Google needs action on a profile pauses publishing for that business,
-- opens one urgent task and writes one ops event; Google clearing the state resumes publishing by itself. Right before
-- every write the claim checks again that the approver may still approve and that the plan still allows publishing.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

\ir _fixtures.psql

update public.locations set consent_at = now(), access_granted_at = now(), google_account_id = 'accounts/test',
  google_location_id = 'locations/mock-victim', status = 'active'
 where id = '00000000-0000-4000-8000-0000000000c1';

insert into public.gbp_posts (id, location_id, owner_input, body, state)
values ('00000000-0000-4000-8000-000000000601', '00000000-0000-4000-8000-0000000000c1', 'Fresh bread every morning.', 'Fresh bread every morning.', 'draft'),
       ('00000000-0000-4000-8000-000000000602', '00000000-0000-4000-8000-0000000000c1', 'New cakes this weekend.', 'New cakes this weekend.', 'draft');

create function pg_temp.approve(p_post text) returns uuid language sql as $$
  select (public.approve_publication('local_post', p_post::uuid, jsonb_build_object('summary', (select body from public.gbp_posts where id = p_post::uuid)),
    '00000000-0000-4000-8000-0000000000a1'::uuid, 'dashboard') ->> 'publication_id')::uuid
$$;
create function pg_temp.due(p uuid) returns void language sql as $$
  update public.publications set publish_after = now() - interval '1 second' where id = p
$$;
create temp table pub as select pg_temp.approve('00000000-0000-4000-8000-000000000601') as id;
select pg_temp.due((select id from pub));

-- Suspended: paused, one urgent task, one ops event.
select is(public.record_google_state('00000000-0000-4000-8000-0000000000c1',
  '{"hasVoiceOfMerchant": false, "actions": ["complyWithGuidelines"]}', 'suspended'), 'needs_action', 'Google needs action');
select is((select google_action from public.google_connections where location_id = '00000000-0000-4000-8000-0000000000c1'),
  'suspended', 'the business is marked');
select is((public.claim_publication((select id from pub)) ->> 'result'), 'paused', 'nothing is claimed while Google needs action');
select is((select state from public.publications where id = (select id from pub)), 'approved', 'the item waits, still approved');
select is((select count(*)::int from public.tasks where location_id = '00000000-0000-4000-8000-0000000000c1'
  and kind = 'google_needs_action' and state = 'open' and priority = 'urgent'), 1, 'one urgent task');
select ok((select why from public.tasks where kind = 'google_needs_action' and state = 'open') ~ 'suspended',
  'the task says what Google is asking');
select is((select count(*)::int from public.ops_events where kind = 'google_needs_action'), 1, 'one ops event');

-- The same state read again: no second task, no second event.
select is(public.record_google_state('00000000-0000-4000-8000-0000000000c1', '{"hasVoiceOfMerchant": false}', 'suspended'),
  'still_needs_action', 'read again');
select is((select count(*)::int from public.tasks where kind = 'google_needs_action' and state = 'open'), 1, 'still one task');
select is((select count(*)::int from public.ops_events where kind = 'google_needs_action'), 1, 'still one ops event');

-- Verification required instead: the same task, updated.
select is(public.record_google_state('00000000-0000-4000-8000-0000000000c1', '{"hasVoiceOfMerchant": false}', 'verify'),
  'needs_action', 'verification required');
select is((select count(*)::int from public.tasks where kind = 'google_needs_action' and state = 'open'), 1, 'one task, updated');
select ok((select why from public.tasks where kind = 'google_needs_action' and state = 'open') ~ 'verify', 'it now says verify');

-- Cleared again: the task closes, publishing resumes.
select is(public.record_google_state('00000000-0000-4000-8000-0000000000c1', '{"hasVoiceOfMerchant": true}', null), 'cleared', 'Google cleared it');
select is((select google_action from public.google_connections where location_id = '00000000-0000-4000-8000-0000000000c1'),
  null, 'no longer marked');
select is((select count(*)::int from public.tasks where kind = 'google_needs_action' and state = 'open'), 0, 'the task is closed');
select is((select count(*)::int from public.ops_events where kind = 'google_cleared'), 1, 'one ops event for the clear');
select is((public.claim_publication((select id from pub)) ->> 'result'), 'claimed', 'the waiting item goes out');
select is(public.record_google_state('00000000-0000-4000-8000-0000000000c1', '{"hasVoiceOfMerchant": true}', null), 'ok', 'nothing to do when clear');
select throws_ok($$ select public.record_google_state('00000000-0000-4000-8000-0000000000c1', '{}', 'appeal') $$, 'bad_google_action',
  'only the known actions');

-- 25.3: the approver is no longer allowed by the time the job runs (removed from the business). Nothing is sent.
insert into public.publications (id, location_id, target_type, target_id, payload, approved_by, channel, state, route,
  idempotency_key, publish_after)
values ('00000000-0000-4000-8000-000000000699', '00000000-0000-4000-8000-0000000000c1', 'local_post',
  '00000000-0000-4000-8000-000000000602', '{"summary": "New cakes this weekend."}', '00000000-0000-4000-8000-0000000000b1',
  'dashboard', 'approved', 'api', 'local_post:00000000-0000-4000-8000-000000000602:1', now() - interval '1 second');
select is((public.claim_publication('00000000-0000-4000-8000-000000000699') ->> 'result'), 'stopped', 'an approver who is no longer a member stops the write');
select is((select state from public.publications where id = '00000000-0000-4000-8000-000000000699'), 'failed', 'recorded as failed');
select is((select error from public.publications where id = '00000000-0000-4000-8000-000000000699'), 'approver_no_longer_allowed', 'with the reason');

-- No one but the service can record Google's state.
select ok(not has_function_privilege('authenticated', 'public.record_google_state(uuid, jsonb, text)', 'execute'), 'not for signed-in users');
select ok(not has_function_privilege('anon', 'public.record_google_state(uuid, jsonb, text)', 'execute'), 'not for anon');

select * from finish();
rollback;
