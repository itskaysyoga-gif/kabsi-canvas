-- Session 19 rest (master plan 25.3): the plan ends, or the business disconnects, while an approved item waits for
-- its job. The claim checks again right before the write: nothing is sent, the item is failed with the reason, and the
-- owner sees why. (The approver removed while the job waits is in google_state.sql; the undo window, double approvals,
-- double claims, timeouts, moderation and a different result on Google are in publication_pipeline.sql,
-- publication_concurrency.sh and _shared/publish.test.ts.)
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

\ir _fixtures.psql

update public.locations set consent_at = now(), access_granted_at = now(), google_account_id = 'accounts/test',
  google_location_id = 'locations/mock-victim', status = 'active'
 where id = '00000000-0000-4000-8000-0000000000c1';

insert into public.gbp_posts (id, location_id, owner_input, body, state)
values ('00000000-0000-4000-8000-000000000701', '00000000-0000-4000-8000-0000000000c1', 'Fresh bread every morning.', 'Fresh bread every morning.', 'draft'),
       ('00000000-0000-4000-8000-000000000702', '00000000-0000-4000-8000-0000000000c1', 'New cakes this weekend.', 'New cakes this weekend.', 'draft');

create function pg_temp.approve(p_post text) returns uuid language sql as $$
  select (public.approve_publication('local_post', p_post::uuid, jsonb_build_object('summary', (select body from public.gbp_posts where id = p_post::uuid)),
    '00000000-0000-4000-8000-0000000000a1'::uuid, 'dashboard') ->> 'publication_id')::uuid
$$;
create function pg_temp.due(p uuid) returns void language sql as $$
  update public.publications set publish_after = now() - interval '1 second' where id = p
$$;

-- Approved while the plan is active; the plan ends before the job runs.
create temp table pub as select 'plan'::text as name, pg_temp.approve('00000000-0000-4000-8000-000000000701') as id;
select pg_temp.due((select id from pub where name = 'plan'));
select ok(private.entitled('00000000-0000-4000-8000-0000000000c1', 'publish'), 'the plan allowed publishing at approval');
update public.subscriptions set current_period_end = now() - interval '1 day'
 where organization_id = (select organization_id from public.locations where id = '00000000-0000-4000-8000-0000000000c1');
update public.plans set ends_at = now() - interval '1 day' where location_id = '00000000-0000-4000-8000-0000000000c1';
select ok(not private.entitled('00000000-0000-4000-8000-0000000000c1', 'publish'), 'the plan has ended');
select is(public.claim_publication((select id from pub where name = 'plan')) ->> 'result', 'stopped', 'a plan that ended stops the write');
select is((select state || '/' || error from public.publications where id = (select id from pub where name = 'plan')),
  'failed/plan_ended', 'failed with the reason');
select is((select attempts from public.publications where id = (select id from pub where name = 'plan')), 0, 'never sent');

-- The plan is back; then the owner disconnects while the next item waits.
update public.subscriptions set current_period_end = now() + interval '30 days'
 where organization_id = (select organization_id from public.locations where id = '00000000-0000-4000-8000-0000000000c1');
insert into pub select 'disconnect', pg_temp.approve('00000000-0000-4000-8000-000000000702');
select pg_temp.due((select id from pub where name = 'disconnect'));
update public.locations set disconnect_requested_at = now() where id = '00000000-0000-4000-8000-0000000000c1';
select is(public.claim_publication((select id from pub where name = 'disconnect')) ->> 'result', 'stopped',
  'a disconnect while the job waits stops the write');
select is((select state || '/' || error from public.publications where id = (select id from pub where name = 'disconnect')),
  'failed/location_not_active', 'failed with the reason');
select is((select attempts from public.publications where id = (select id from pub where name = 'disconnect')), 0, 'never sent');
select is(public.claim_publication((select id from pub where name = 'disconnect')) ->> 'result', 'not_approved',
  'asking again changes nothing');

select * from finish();
rollback;
