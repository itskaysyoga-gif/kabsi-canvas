-- P0.1-10: append-only audit log (K-43), what records it (K-17 request context included), retention (K-40) and the
-- "What Kabsi did" feed (K-09).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

\ir _fixtures.psql

-- Shape and privileges: nobody can write the table directly, the service role included.
select has_table('public', 'audit_events', 'audit_events exists');
select ok((select relrowsecurity from pg_class where oid = 'public.audit_events'::regclass), 'RLS is on for audit_events');
select is(
  (select coalesce(array_agg(r || ':' || p order by r, p), '{}') from unnest(array['anon', 'authenticated', 'service_role']) r,
     unnest(array['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE']) p
   where has_table_privilege(r, 'public.audit_events', p)),
  '{}'::text[], 'anon, authenticated and service_role have no insert, update, delete or truncate on audit_events');
select ok(not has_function_privilege('service_role', 'private.audit(text,uuid,text,uuid,text,text,jsonb,jsonb,text,text,uuid)', 'execute')
  and not has_function_privilege('authenticated', 'private.audit(text,uuid,text,uuid,text,text,jsonb,jsonb,text,text,uuid)', 'execute'),
  'only definer code can call private.audit');

-- Insert through the function.
create temp table ids (name text primary key, id bigint);
insert into ids select 'manual', private.audit('system', null, 'test_event', '00000000-0000-4000-8000-0000000000c1',
  'location', '00000000-0000-4000-8000-0000000000c1', '{"a": 1}', '{"a": 2}', 'system', 'ok');
select is((select e.organization_id from public.audit_events e join ids on ids.id = e.id where ids.name = 'manual'),
  (select organization_id from public.locations where id = '00000000-0000-4000-8000-0000000000c1'),
  'private.audit inserts and fills the organisation from the business');
select throws_ok($$ select private.audit('robot', null, 'test_event', null, null, null) $$, '23514', null,
  'an unknown actor type is refused');

-- Immutable for the table owner too, outside retention.
select throws_ok($$ update public.audit_events set result = 'changed' where id = (select id from ids where name = 'manual') $$,
  '42501', 'audit_events is append-only', 'UPDATE fails for the table owner');
select throws_ok($$ delete from public.audit_events where id = (select id from ids where name = 'manual') $$,
  '42501', 'audit_events is append-only', 'DELETE fails for the table owner');
select throws_ok($$ truncate public.audit_events $$, '42501', 'audit_events is append-only', 'TRUNCATE fails for the table owner');

-- And for the service role (no grant, and the trigger behind it).
set local role service_role;
select throws_ok($$ insert into public.audit_events (actor_type, action) values ('system', 'forged') $$, '42501', null,
  'the service role cannot insert directly');
select throws_ok($$ update public.audit_events set result = 'changed' $$, '42501', null, 'UPDATE fails for the service role');
select throws_ok($$ delete from public.audit_events $$, '42501', null, 'DELETE fails for the service role');
reset role;

-- Even with the retention flag on, only redaction and only rows older than 24 months.
select set_config('kabsi.audit_retention', 'on', true);
select throws_ok($$ update public.audit_events set result = 'changed', redacted_at = now() where id = (select id from ids where name = 'manual') $$,
  '42501', 'audit_events: retention may only redact before and after', 'retention cannot rewrite who or what');
select throws_ok($$ delete from public.audit_events where id = (select id from ids where name = 'manual') $$,
  '42501', 'audit_events: only entries older than 24 months may be deleted', 'retention cannot delete a recent entry');
select set_config('kabsi.audit_retention', 'off', true);

-- An approval through an Edge Function (service role) records the owner's request context from the x-kabsi headers.
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
select set_config('request.headers', '{"x-kabsi-request-id":"req-1","x-kabsi-ip-country":"lb","x-kabsi-user-agent":"Owner Phone","user-agent":"Deno"}', true);
update public.reviews set state = 'drafted', reviewer_name = 'Sam Lee' where id = '00000000-0000-4000-8000-0000000000e1';
insert into public.publications (id, location_id, target_type, target_id, payload, approved_by, channel)
values ('00000000-0000-4000-8000-0000000000f8', '00000000-0000-4000-8000-0000000000c1', 'review_reply',
  '00000000-0000-4000-8000-0000000000e1', '{"text": "Thanks Sam"}', '00000000-0000-4000-8000-0000000000a1', 'email_link');
update public.publications set status = 'live' where id = '00000000-0000-4000-8000-0000000000f8';

select is((select row(actor_type, actor_id, channel, result, request_id, ip_country, user_agent)::text from public.audit_events
  where action = 'approval' and after ->> 'publication_id' = '00000000-0000-4000-8000-0000000000f8'),
  row('user', '00000000-0000-4000-8000-0000000000a1'::uuid, 'email_link', 'approved', 'req-1', 'LB', 'Owner Phone')::text,
  'approving a reply writes an approval event with the approver, channel, request id, IP country and user agent');
select is((select row(actor_type, channel, result, before ->> 'status')::text from public.audit_events
  where action = 'publication' and after ->> 'publication_id' = '00000000-0000-4000-8000-0000000000f8'),
  row('system', 'email_link', 'live', 'queued')::text,
  'publishing it writes a publication event with the channel and the result');
select is((select count(*)::int from public.audit_events where action = 'reply_drafted'
  and object_id = '00000000-0000-4000-8000-0000000000e1'), 1, 'a ready draft writes reply_drafted');
select is((select count(*)::int from public.audit_events where audit_events::text ilike '%Sam%'), 0,
  'no reply text or reviewer name is copied into the log');

-- An Edge Function acting for a user (email link skip) records that user.
select set_config('request.headers', '{"x-kabsi-actor-id":"00000000-0000-4000-8000-0000000000a1"}', true);
update public.reviews set state = 'handled_offline' where id = '00000000-0000-4000-8000-0000000000e1';
select is((select row(actor_type, actor_id)::text from public.audit_events where action = 'review_handled_offline'),
  row('user', '00000000-0000-4000-8000-0000000000a1'::uuid)::text, 'the user an Edge Function acts for is the actor');

-- Routine checks: two syncs.
select set_config('request.headers', '', true);
update public.locations set reviews_synced_at = now() - interval '1 hour' where id = '00000000-0000-4000-8000-0000000000c1';
update public.locations set reviews_synced_at = now() where id = '00000000-0000-4000-8000-0000000000c1';

-- A browser call: its own user agent and CF-IPCountry count, x-kabsi headers from a browser are ignored.
select set_config('request.headers', '{"x-kabsi-ip-country":"FR","x-kabsi-user-agent":"Forged","cf-ipcountry":"AE","user-agent":"Safari"}', true);
select tests.act_as('00000000-0000-4000-8000-0000000000a1');
select public.update_knowledge_card('00000000-0000-4000-8000-0000000000c1', '{"tone": "warm", "about": "Fresh bread"}');
select public.update_knowledge_card('00000000-0000-4000-8000-0000000000c1', '{"tone": "formal", "about": "Fresh bread"}');
select public.set_onboarding_step('00000000-0000-4000-8000-0000000000c1', 'done');
reset role;
select is((select row(actor_type, actor_id, channel, ip_country, user_agent, before::text, after::text)::text
  from public.audit_events where action = 'knowledge_edit' and after ->> 'tone' = 'formal'),
  row('user', '00000000-0000-4000-8000-0000000000a1'::uuid, 'dashboard', 'AE', 'Safari', '{"tone": "warm"}', '{"tone": "formal"}')::text,
  'a knowledge edit records the owner, the browser''s own headers and only the fields that changed');
select is((select after ->> 'step' from public.audit_events where action = 'onboarding_step'
  and location_id = '00000000-0000-4000-8000-0000000000c1'), 'done', 'an onboarding step is recorded');

-- Role changes.
select set_config('request.headers', '', true);
select set_config('request.jwt.claims', '', true);
insert into public.location_members (location_id, user_id, role)
values ('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000b1', 'manager');
update public.location_members set role = 'staff'
 where location_id = '00000000-0000-4000-8000-0000000000c1' and user_id = '00000000-0000-4000-8000-0000000000b1';
delete from public.location_members
 where location_id = '00000000-0000-4000-8000-0000000000c1' and user_id = '00000000-0000-4000-8000-0000000000b1';
select is((select array_agg(action || ':' || coalesce(before ->> 'role', '') || '>' || coalesce(after ->> 'role', '') order by id)
  from public.audit_events where object_type = 'user' and object_id = '00000000-0000-4000-8000-0000000000b1'
  and location_id = '00000000-0000-4000-8000-0000000000c1'),
  array['role_added:>manager', 'role_changed:manager>staff', 'role_removed:staff>'], 'role changes are recorded');
select ok(exists (select 1 from public.audit_events where action = 'concierge_task_opened'
  and object_id = '00000000-0000-4000-8000-0000000000f2'), 'a concierge task is recorded');

-- Who reads what: the victim owner reads their business's events; another owner and a stranger read none of them.
select tests.act_as('00000000-0000-4000-8000-0000000000a1');
select ok((select count(*) from public.audit_events where location_id = '00000000-0000-4000-8000-0000000000c1') > 5,
  'the owner reads their business''s events');
select is((select count(*)::int from public.audit_events where location_id is distinct from '00000000-0000-4000-8000-0000000000c1'
  and organization_id is distinct from (select organization_id from public.locations where id = '00000000-0000-4000-8000-0000000000c1')),
  0, 'the owner reads no other business''s events');
select tests.act_as('00000000-0000-4000-8000-0000000000b2');
select is((select count(*)::int from public.audit_events where location_id = '00000000-0000-4000-8000-0000000000c1'), 0,
  'another business''s owner reads none of them');
select tests.act_as('00000000-0000-4000-8000-0000000000b1');
select is((select count(*)::int from public.audit_events), 0, 'a stranger reads nothing');
select throws_ok($$ select * from public.activity_feed('00000000-0000-4000-8000-0000000000c1') $$, '42501', null,
  'a stranger cannot read the feed');

-- "What Kabsi did" for the owner: plain lines, checks collapsed into one a day.
select tests.act_as('00000000-0000-4000-8000-0000000000a1');
select set_eq($$ select line, times from public.activity_feed('00000000-0000-4000-8000-0000000000c1', 7) $$,
  $$ values ('Checked your Google profile', 2), ('Prepared a reply to Sam''s review', 1), ('Published your approved reply', 1) $$,
  'activity_feed returns plain lines, with routine checks collapsed into one line a day');
select is((select count(*)::int from public.activity_feed('00000000-0000-4000-8000-0000000000c1', 7)
  where line ~ ('[!' || chr(8212) || chr(8211) || ']')), 0, 'feed lines carry no exclamation marks or dashes');
reset role;

-- Retention (K-40): rows older than 24 months go, content of a deleted business's events is blanked, the rest stays,
-- and the flag is off again afterwards.
alter table public.audit_events disable trigger audit_events_immutable;
insert into ids select 'old', private.audit('system', null, 'test_event', null, null, null, null, null, 'system', 'ok');
update public.audit_events set created_at = now() - interval '25 months' where id = (select id from ids where name = 'old');
insert into ids select 'gone', private.audit('user', null, 'knowledge_edit', '00000000-0000-4000-8000-00000000dead',
  'knowledge_card', 'x', '{"about": "old"}', '{"about": "new"}', 'dashboard', 'saved');
alter table public.audit_events enable trigger audit_events_immutable;
select ok((select (private.run_retention() ->> 'audit_deleted')::int >= 1), 'run_retention deletes entries older than 24 months');
select is((select count(*)::int from public.audit_events where id = (select id from ids where name = 'old')), 0, 'the old entry is gone');
select is((select row(before, after, redacted_at is not null, action)::text from public.audit_events where id = (select id from ids where name = 'gone')),
  row(null::jsonb, null::jsonb, true, 'knowledge_edit')::text, 'a deleted business''s content is blanked and the event kept');
select is((select before::text from public.audit_events where id = (select id from ids where name = 'manual')), '{"a": 1}',
  'other entries keep their content');
select throws_ok($$ delete from public.audit_events where id = (select id from ids where name = 'manual') $$,
  '42501', 'audit_events is append-only', 'after retention the log is append-only again');

select * from finish();
rollback;
