-- P0.4-10: what the lifecycle job reads (G-25, K-101). lifecycle_snapshots is for the service role only; it lists new and
-- trial businesses with their owners (staff and managers are not told), the entitlements state, the consent flag, the
-- waiting items, and the recap counts, which come from the audit log and nothing else; a demo or concierge business and
-- an old business with no trial are not listed.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

\ir _fixtures.psql

insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
select '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email, now(), '{}', '{}', now(), now()
from (values ('00000000-0000-4000-8000-0000000008a1'::uuid, 'life-owner@example.test'),
             ('00000000-0000-4000-8000-0000000008a2'::uuid, 'life-manager@example.test'),
             ('00000000-0000-4000-8000-0000000008a3'::uuid, 'life-other@example.test')) as u(id, email);

insert into public.locations (id, name, place_id, country, time_zone, created_by)
values ('00000000-0000-4000-8000-0000000008c1', 'Life Shop', 'life-place-1', 'US', 'America/New_York', '00000000-0000-4000-8000-0000000008a1');
insert into public.location_members (location_id, user_id, role) values
  ('00000000-0000-4000-8000-0000000008c1', '00000000-0000-4000-8000-0000000008a1', 'owner'),
  ('00000000-0000-4000-8000-0000000008c1', '00000000-0000-4000-8000-0000000008a2', 'manager');

create function pg_temp.snap(p_loc uuid) returns jsonb language sql as $$
  select x from jsonb_array_elements(public.lifecycle_snapshots()) x where x ->> 'location_id' = p_loc::text
$$;

-- 1. Privileges ---------------------------------------------------------------------------------------------------------
select ok(not has_function_privilege('anon', 'public.lifecycle_snapshots(timestamptz)', 'execute'), 'anon cannot read the snapshots');
select ok(not has_function_privilege('authenticated', 'public.lifecycle_snapshots(timestamptz)', 'execute'), 'a signed-in user cannot either');
select ok(has_function_privilege('service_role', 'public.lifecycle_snapshots(timestamptz)', 'execute'), 'the job (service role) can');
select is((select value from public.app_settings where key = 'lifecycle_emails'), 'off', 'the lifecycle emails start switched off');

-- 2. A new business ---------------------------------------------------------------------------------------------------
select is(pg_temp.snap('00000000-0000-4000-8000-0000000008c1') ->> 'name', 'Life Shop', 'a new business is listed');
select is(pg_temp.snap('00000000-0000-4000-8000-0000000008c1') ->> 'country', 'US', 'with its country');
select is(pg_temp.snap('00000000-0000-4000-8000-0000000008c1') -> 'owners' -> 0 ->> 'email', 'life-owner@example.test', 'the owner is who is told');
select is(jsonb_array_length(pg_temp.snap('00000000-0000-4000-8000-0000000008c1') -> 'owners'), 1, 'and only the owner: not the manager');
select is(pg_temp.snap('00000000-0000-4000-8000-0000000008c1') -> 'marketing_consent', 'false'::jsonb, 'no marketing consent until the owner says yes');
insert into public.contacts (email, marketing_consent) values ('Life-Owner@Example.test', true);
select is(pg_temp.snap('00000000-0000-4000-8000-0000000008c1') -> 'marketing_consent', 'true'::jsonb, 'a yes on the address counts, whatever its case');

-- 3. The trial and the recap come from the right places ----------------------------------------------------------------
update public.subscriptions set plan = 'free', state = 'trialing', trial_started_at = now() - interval '7 days', trial_ends_at = now() + interval '7 days'
 where organization_id = (select organization_id from public.locations where id = '00000000-0000-4000-8000-0000000008c1');
insert into public.subscriptions (organization_id, plan, state, trial_started_at, trial_ends_at)
select organization_id, 'free', 'trialing', now() - interval '7 days', now() + interval '7 days' from public.locations
 where id = '00000000-0000-4000-8000-0000000008c1'
   and not exists (select 1 from public.subscriptions s where s.organization_id = public.locations.organization_id);
select is(pg_temp.snap('00000000-0000-4000-8000-0000000008c1') ->> 'entitlement', 'trial', 'the state is the entitlements function''s: trial');

insert into public.audit_events (actor_type, action, organization_id, location_id, object_type, object_id, after, result, created_at)
select 'system', a.action, l.organization_id, l.id, a.otype, a.oid, a.after::jsonb, a.result, now() - a.ago
from public.locations l, (values
  ('reply_drafted', 'review', 'r1', '{}', null, interval '3 days'),
  ('reply_drafted', 'review', 'r2', '{}', null, interval '2 days'),
  ('reply_drafted', 'review', 'r3', '{}', null, interval '1 day'),
  ('reply_drafted', 'review', 'old', '{}', null, interval '9 days'),
  ('publication', 'review_reply', 'p1', '{"publication_id": "pub1"}', 'in_review', interval '2 days'),
  ('publication', 'review_reply', 'p1', '{"publication_id": "pub1"}', 'live', interval '2 days'),
  ('publication', 'local_post', 'p2', '{"publication_id": "pub2"}', 'live', interval '1 day'),
  ('publication', 'photo', 'p3', '{"publication_id": "pub3"}', 'live', interval '1 day'),
  ('protection_change', 'profile_change', 'c1', '{}', 'awaiting_review', interval '2 days'),
  ('protection_change', 'profile_change', 'c1', '{}', 'awaiting_review', interval '1 day'),
  ('protection_change', 'profile_change', 'c2', '{}', 'awaiting_review', interval '1 day'),
  ('protection_change', 'profile_change', 'c3', '{}', 'rejected', interval '1 day'),
  ('approval', 'review_reply', 'p1', '{"publication_id": "pub1"}', 'approved', interval '2 days')
) as a(action, otype, oid, after, result, ago)
where l.id = '00000000-0000-4000-8000-0000000008c1';
select is(pg_temp.snap('00000000-0000-4000-8000-0000000008c1') -> 'recap',
  '{"posts_sent": 1, "replies_sent": 1, "changes_caught": 2, "replies_prepared": 3}'::jsonb,
  'the recap is counted from the audit log: a reply counts once, an old event before the trial and a photo do not count');
select is((pg_temp.snap('00000000-0000-4000-8000-0000000008c1') ->> 'first_approval_at')::timestamptz > now() - interval '3 days', true, 'the first approval is read from the audit log');
select is(pg_temp.snap('00000000-0000-4000-8000-0000000008c1') ->> 'waiting_reviews', '0', 'nothing waiting yet');

-- 4. Who is not listed ----------------------------------------------------------------------------------------------------
update public.locations set created_at = now() - interval '40 days' where id = '00000000-0000-4000-8000-0000000008c1';
select is(pg_temp.snap('00000000-0000-4000-8000-0000000008c1') is not null, true, 'an old business is still listed while it has a recent trial (the day-30 win-back)');
update public.subscriptions set trial_started_at = now() - interval '90 days', trial_ends_at = now() - interval '76 days'
 where organization_id = (select organization_id from public.locations where id = '00000000-0000-4000-8000-0000000008c1');
select is(pg_temp.snap('00000000-0000-4000-8000-0000000008c1') is null, true, 'an old business with an old trial is not listed');

insert into public.locations (id, name, place_id, is_demo, created_by) values ('00000000-0000-4000-8000-0000000008c2', 'Life Demo', 'life-place-2', true, '00000000-0000-4000-8000-0000000008a3');
insert into public.locations (id, name, place_id, concierge, created_by) values ('00000000-0000-4000-8000-0000000008c3', 'Life Concierge', 'life-place-3', true, '00000000-0000-4000-8000-0000000008a3');
select is(pg_temp.snap('00000000-0000-4000-8000-0000000008c2') is null, true, 'a demo business is never listed');
select is(pg_temp.snap('00000000-0000-4000-8000-0000000008c3') is null, true, 'a concierge business is never listed');

select * from finish();
rollback;
