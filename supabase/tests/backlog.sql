-- P0.3-10: clear the backlog on day one (K-66, K-101, K-36). One backlog card, and "Approve all" for the low-risk replies
-- the owner was shown: only those, through the one publication pipeline, at most 5 a minute, with the list in the audit log.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

\ir _fixtures.psql

update public.locations set status = 'active', consent_at = now(), access_granted_at = now(),
  google_location_id = 'locations/mock-victim', is_demo = false
 where id = '00000000-0000-4000-8000-0000000000c1';
-- The fixture's own review is not part of this backlog.
update public.reviews set state = 'posted' where id = '00000000-0000-4000-8000-0000000000e1';

-- A manager (..a4) and a staff member (..a5) of the business, as in roles.sql.
insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
select '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email, now(), '{}', '{}', now(), now()
from (values ('00000000-0000-4000-8000-0000000000a4'::uuid, 'victim-manager@example.test'),
             ('00000000-0000-4000-8000-0000000000a5'::uuid, 'victim-staff-member@example.test')) as u(id, email);
insert into public.location_members (location_id, user_id, role) values
  ('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000a4', 'manager'),
  ('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000a5', 'staff');

create function tests.rid(n integer) returns uuid language sql immutable as $$
  select ('00000000-0000-4000-8000-0000000b00' || lpad(n::text, 2, '0'))::uuid $$;

-- A free trial, and 12 backlog reviews: 6 low risk with a safe draft (the sixth gets a newer draft later), 1 medium, 1 high
-- (no draft), 1 still being drafted, and 3 older ones that wait for a plan.
delete from public.plans where location_id = '00000000-0000-4000-8000-0000000000c1';
-- P0.4-06: the trial is the organisation's entitlement, so the victim is neither partner-covered nor paying here.
update public.partners set billing_track = 'commission' where id = '00000000-0000-4000-8000-0000000000d1';
update public.subscriptions set state = 'cancelled'
 where organization_id = (select organization_id from public.locations where id = '00000000-0000-4000-8000-0000000000c1');
insert into public.plans (location_id, kind, status, starts_at, ends_at)
values ('00000000-0000-4000-8000-0000000000c1', 'trial', 'active', now() - interval '1 day', now() + interval '13 days');
insert into public.reviews (id, location_id, google_review_id, reviewer_name, star_rating, comment, review_created_at, state, risk, is_backlog)
select tests.rid(n), '00000000-0000-4000-8000-0000000000c1', 'bl-' || n, 'Reviewer ' || n,
       case when n <= 6 then 5 when n = 7 then 3 else 1 end, 'Backlog text ' || n, now() - make_interval(days => n),
       case when n <= 7 then 'drafted' when n = 8 then 'blocked' when n = 9 then 'new' else 'archived' end,
       case when n <= 6 then 'low' when n = 7 then 'medium' when n = 8 then 'high' else 'low' end, true
  from generate_series(1, 12) n;
insert into public.reply_drafts (review_id, version, body, source, safety_ok)
select tests.rid(n), 1, 'Thank you for review ' || n || '.', 'ai', true from generate_series(1, 7) n;

select is((select value from public.app_settings where key = 'full_backlog'), 'off', 'the full backlog stays off until the live switch');
-- The drafts arrive after the reviews here; in the product the review changes state when its draft is saved, which runs the
-- detector (the review trigger). Run it once so the card counts the drafts.
select private.detect_review_tasks('00000000-0000-4000-8000-0000000000c1');

-- The card ------------------------------------------------------------------------------------------------------------
create function pg_temp.card() returns public.tasks language sql as $$
  select * from public.tasks where location_id = '00000000-0000-4000-8000-0000000000c1'
     and dedupe_key = 'review_reply:backlog' and state in ('open', 'snoozed', 'approved', 'publishing') $$;
select is((select count(*) from public.tasks where location_id = '00000000-0000-4000-8000-0000000000c1'
            and dedupe_key = 'review_reply:backlog' and state = 'open'), 1::bigint,
  'the backlog is one task');
select is((pg_temp.card()).title, 'We found 8 unanswered reviews. Replies are ready.',
  'its title counts the replies that are ready (6 low, 1 medium, 1 high)');
select is((pg_temp.card()).evidence - 'trial', '{"backlog_summary": true, "total": 8, "low": 6, "other": 1, "high": 1, "drafting": 1, "more_waiting": 3}'::jsonb,
  'it counts low risk, needs a look, needs care, still being prepared and waiting for a plan');
select is((pg_temp.card()).evidence ->> 'trial', 'true', 'it knows this business is on a trial');
select matches((pg_temp.card()).why, 'wait for your plan', 'on a trial it says how many more wait for the plan');
select is((pg_temp.card()).priority, 'recommended', 'recommended, not urgent');
select is(private.detect_review_tasks('00000000-0000-4000-8000-0000000000c1'), 0, 'running the detector again makes nothing new');
select is((select count(*) from public.tasks where location_id = '00000000-0000-4000-8000-0000000000c1'
            and dedupe_key = 'review_reply:backlog' and state = 'open'), 1::bigint, 'still one backlog task (dedupe)');
select is((select count(*) from public.tasks where location_id = '00000000-0000-4000-8000-0000000000c1' and kind = 'review_reply'
            and source_type = 'review' and state = 'open' and (evidence ->> 'backlog')::boolean), 8::bigint,
  'the reviews keep their own tasks, marked backlog, so Home folds them into the card');
select is((select count(*) from public.tasks where location_id = '00000000-0000-4000-8000-0000000000c1'
            and source_id = tests.rid(9)::text), 0::bigint, 'a review still being drafted has no task yet');
select is((select count(*) from public.tasks where row_to_json(tasks)::text ~ 'Backlog text|Reviewer '), 0::bigint,
  'no review text or reviewer name is copied into a task');
update public.plans set kind = 'pro_monthly' where location_id = '00000000-0000-4000-8000-0000000000c1';
select private.detect_review_tasks('00000000-0000-4000-8000-0000000000c1');
select is((pg_temp.card()).evidence ->> 'trial', 'false', 'on a paid plan it is not a trial');
select doesnt_match((pg_temp.card()).why, 'wait for your plan', 'and no plan note is shown');

-- Approve all: access ------------------------------------------------------------------------------------------------
create function tests.items(p_from integer, p_to integer) returns jsonb language sql as $$
  select coalesce(jsonb_agg(jsonb_build_object('review_id', tests.rid(n), 'version', 1) order by n), '[]'::jsonb)
    from generate_series(p_from, p_to) n $$;
select tests.act_as('00000000-0000-4000-8000-0000000000b1');
select throws_ok($$ select public.approve_backlog('00000000-0000-4000-8000-0000000000c1', '[]') $$, '42501', null, 'a stranger cannot approve a backlog');
reset role;
select tests.act_as('anon');
select throws_ok($$ select public.approve_backlog('00000000-0000-4000-8000-0000000000c1', '[]') $$, '42501', null, 'anon cannot');
reset role;
select tests.act_as('00000000-0000-4000-8000-0000000000a5');
select throws_ok($$ select public.approve_backlog('00000000-0000-4000-8000-0000000000c1', '[]') $$, '42501', null, 'staff cannot');
reset role;
select tests.act_as('00000000-0000-4000-8000-0000000000a4');
select throws_ok(format($$ select public.approve_backlog('00000000-0000-4000-8000-0000000000c1', %L::jsonb) $$, tests.items(1, 2)),
  '42501', 'not_allowed_to_approve', 'a manager cannot approve replies in bulk unless the owner allows replies');
reset role;
select tests.act_as('00000000-0000-4000-8000-0000000000b2');
select throws_ok(format($$ select public.approve_backlog('00000000-0000-4000-8000-0000000000c1', %L::jsonb) $$, tests.items(1, 2)),
  '42501', null, 'the owner of another business cannot approve this business''s replies');
reset role;

-- Approve all: the owner approves exactly the list shown -------------------------------------------------------------
-- The sixth reply is rewritten after the list was shown (version 2), the seventh is medium risk, the eighth high risk.
insert into public.reply_drafts (review_id, version, body, source, safety_ok) values (tests.rid(6), 2, 'A newer reply.', 'ai_edit', true);
create table tests.result (r jsonb);
grant all on tests.result to authenticated;
select tests.act_as('00000000-0000-4000-8000-0000000000a1');
select throws_ok($$ select public.approve_backlog('00000000-0000-4000-8000-0000000000c1', '[]') $$, 'P0001', 'bad_items', 'an empty list is refused');
insert into tests.result select public.approve_backlog('00000000-0000-4000-8000-0000000000c1', tests.items(1, 8));
reset role;
select is(jsonb_array_length((select r -> 'approved' from tests.result)), 5, 'the five low-risk replies that were shown and unchanged are approved');
select is((select jsonb_agg(x ->> 'why' order by x ->> 'review_id') from tests.result, jsonb_array_elements(r -> 'left_out') x),
  '["changed", "not_ready", "not_ready"]'::jsonb, 'the changed reply, the medium and the high-risk review are left out and reported');
select is((select count(*) from public.reviews where id in (select tests.rid(n) from generate_series(1, 5) n) and state = 'publishing'), 5::bigint,
  'the five go through the pipeline');
select is((select state from public.reviews where id = tests.rid(6)), 'drafted', 'the changed reply waits for the owner to read the new text');
select is((select state from public.reviews where id = tests.rid(7)), 'drafted', 'the medium-risk review is untouched');
select is((select state from public.reviews where id = tests.rid(8)), 'blocked', 'the high-risk review is untouched');
select is((select count(*) from public.publications where target_type = 'review_reply' and target_id in (select tests.rid(n) from generate_series(6, 8) n)),
  0::bigint, 'nothing was published for the ones left out');
select is((select payload ->> 'text' from public.publications where target_id = tests.rid(3)), 'Thank you for review 3.',
  'each publication carries exactly the stored draft');
select is((select count(*) from public.publications where target_type = 'review_reply' and target_id in (select tests.rid(n) from generate_series(1, 5) n)
            and channel = 'dashboard' and approved_by = '00000000-0000-4000-8000-0000000000a1'), 5::bigint, 'each records the owner as the approver');

-- K-36: at most 5 replies a minute to one profile. The approvals are spaced 12 seconds apart, after the 10 second undo.
select is((select min(extract(epoch from publish_after - now()))::integer from public.publications
            where target_type = 'review_reply' and target_id in (select tests.rid(n) from generate_series(1, 5) n)), 10,
  'the first waits the 10 second undo window');
select is((select array_agg(d order by d) from (select (extract(epoch from p2.publish_after - p1.publish_after))::integer d
            from (select publish_after, row_number() over (order by publish_after) rn from public.publications
                   where target_type = 'review_reply' and target_id in (select tests.rid(n) from generate_series(1, 5) n)) p1
            join (select publish_after, row_number() over (order by publish_after) rn from public.publications
                   where target_type = 'review_reply' and target_id in (select tests.rid(n) from generate_series(1, 5) n)) p2
              on p2.rn = p1.rn + 1) s), array[12, 12, 12, 12], 'each is 12 seconds after the one before');
select ok((select max(c) <= 5 from (select (select count(*) from public.publications q
            where q.target_type = 'review_reply' and q.target_id in (select tests.rid(n) from generate_series(1, 5) n)
              and q.publish_after >= p.publish_after and q.publish_after < p.publish_after + interval '60 seconds') c
            from public.publications p where p.target_type = 'review_reply'
              and p.target_id in (select tests.rid(n) from generate_series(1, 5) n)) w), 'no 60 second window holds more than 5 publications');

-- The list is recorded with the approval (K-43, append-only).
select is((select (after ->> 'count')::integer from public.audit_events where action = 'backlog_approved'
            and location_id = '00000000-0000-4000-8000-0000000000c1'), 5, 'the audit log records the count of the approval');
select is((select jsonb_array_length(after -> 'reviews') from public.audit_events where action = 'backlog_approved'
            and location_id = '00000000-0000-4000-8000-0000000000c1'), 5, 'and the list of reviews the owner agreed to');
select is((select count(*) from public.audit_events where action = 'backlog_approved'
            and after::text ~ 'Thank you|Backlog text|Reviewer'), 0::bigint, 'with no review text or reviewer name');

-- A second tap on the same list does nothing new (the pipeline finds the first approval).
select tests.act_as('00000000-0000-4000-8000-0000000000a1');
delete from tests.result;
insert into tests.result select public.approve_backlog('00000000-0000-4000-8000-0000000000c1', tests.items(1, 5));
reset role;
select is(jsonb_array_length((select r -> 'approved' from tests.result)), 0, 'approving the same list again approves nothing');
select is((select count(*) from public.publications where target_type = 'review_reply'
            and target_id in (select tests.rid(n) from generate_series(1, 5) n)), 5::bigint, 'and makes no second publication');

-- The card follows: five fewer to read (the changed low-risk one, the medium and the high-risk review remain).
select private.detect_review_tasks('00000000-0000-4000-8000-0000000000c1');
select is((pg_temp.card()).title, 'We found 3 unanswered reviews. Replies are ready.', 'the card counts what is left');

-- A manager may approve in bulk once the owner allows review replies; never a high-risk review.
select tests.act_as('00000000-0000-4000-8000-0000000000a1');
select public.set_approval_policy('00000000-0000-4000-8000-0000000000c1', 'review_reply', 'owner_and_managers');
reset role;
select tests.act_as('00000000-0000-4000-8000-0000000000a4');
delete from tests.result;
insert into tests.result select public.approve_backlog('00000000-0000-4000-8000-0000000000c1',
  jsonb_build_array(jsonb_build_object('review_id', tests.rid(6), 'version', 2), jsonb_build_object('review_id', tests.rid(8), 'version', 1)));
reset role;
select is(jsonb_array_length((select r -> 'approved' from tests.result)), 1, 'a manager the owner allowed approves the low-risk one');
select is((select state from public.reviews where id = tests.rid(8)), 'blocked', 'and cannot approve the high-risk review');

select * from finish();
rollback;
