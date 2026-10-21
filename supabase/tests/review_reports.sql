-- P0.8-11 (K-139): the "Report this review" helper. Pro only; owner or manager only; the states move in order; one
-- appeal; one report per review; a reminder is due a week after the last step; members read their own business only;
-- the table holds no review text.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

\ir _fixtures.psql

-- LA (..c1) is the victim business with the review ..e1 and, from the fixtures, a report on it. Take that one away so the
-- test starts clean, and make LA a demo business (a demo business has Pro) with a manager and a staff member.
delete from public.review_reports;
update public.locations set is_demo = true where id = '00000000-0000-4000-8000-0000000000c1';
insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-0000000009a4', 'authenticated', 'authenticated', 'rr-manager@example.test', now(), '{}', '{}', now(), now()),
       ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-0000000009a5', 'authenticated', 'authenticated', 'rr-staff@example.test', now(), '{}', '{}', now(), now());
insert into public.location_members (location_id, user_id, role) values
  ('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000009a4', 'manager'),
  ('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000009a5', 'staff');
-- LB (..c2) has no plan: no Pro. One review of its own.
insert into public.reviews (id, location_id, google_review_id, star_rating, review_created_at)
values ('00000000-0000-4000-8000-0000000009e2', '00000000-0000-4000-8000-0000000000c2', 'rr-other-review', 1, now());

create temp table r (id uuid);
grant all on r to authenticated;

select ok(not has_table_privilege('authenticated', 'public.review_reports', 'insert')
  and not has_table_privilege('authenticated', 'public.review_reports', 'update')
  and not has_table_privilege('authenticated', 'public.review_reports', 'delete')
  and not has_table_privilege('anon', 'public.review_reports', 'select'), 'the browser reads reports and writes none');
select ok(not has_function_privilege('anon', 'public.start_review_report(uuid,text,text[])', 'execute')
  and not has_function_privilege('anon', 'public.advance_review_report(uuid,text)', 'execute')
  and not has_function_privilege('anon', 'public.list_review_reports(uuid)', 'execute'), 'anon runs none of the report functions');

-- Who may start one --------------------------------------------------------------------------------------------------
select tests.act_as('00000000-0000-4000-8000-0000000009a5');
select throws_ok($$ select public.start_review_report('00000000-0000-4000-8000-0000000000e1', 'fake_content') $$, '42501', null, 'staff cannot report');
reset role;
select tests.act_as('00000000-0000-4000-8000-0000000000b1');
select throws_ok($$ select public.start_review_report('00000000-0000-4000-8000-0000000000e1', 'fake_content') $$, '42501', null, 'a stranger cannot report');
reset role;
select tests.act_as('00000000-0000-4000-8000-0000000000b2');
select throws_ok($$ select public.start_review_report('00000000-0000-4000-8000-0000000009e2', 'fake_content') $$, 'P0001', 'pro_required',
  'a business without Pro is told it is a Pro feature');
select throws_ok($$ select public.start_review_report('00000000-0000-4000-8000-0000000000e1', 'fake_content') $$, '42501', null,
  'and cannot report another business''s review');
reset role;

select tests.act_as('00000000-0000-4000-8000-0000000000a1');
select throws_ok($$ select public.start_review_report('00000000-0000-4000-8000-0000000000e1', 'Not A Key') $$, 'P0001', 'bad_category', 'the category is a short key');
select throws_ok($$ select public.start_review_report('00000000-0000-4000-8000-0000000000e1', 'fake_content', array['Bad Item']) $$, 'P0001', 'bad_evidence', 'evidence is a list of keys, never text');
insert into r select public.start_review_report('00000000-0000-4000-8000-0000000000e1', 'fake_content', array['own_words', 'dates']);
select ok((select id from r) is not null, 'a Pro owner reports a review');
select throws_ok($$ select public.start_review_report('00000000-0000-4000-8000-0000000000e1', 'off_topic') $$, 'P0001', 'already_reported', 'one report per review');
reset role;
select is((select state from public.review_reports where id = (select id from r)), 'reported', 'it starts as reported');
select is((select evidence from public.review_reports where id = (select id from r)), array['own_words', 'dates'], 'only the ticked keys are kept');

-- The order of the states -----------------------------------------------------------------------------------------------
select tests.act_as('00000000-0000-4000-8000-0000000009a4');
select throws_ok($$ select public.advance_review_report((select id from r), 'removed') $$, 'P0001', 'bad_step', 'cannot jump to removed');
select throws_ok($$ select public.advance_review_report((select id from r), 'appealed') $$, 'P0001', 'bad_step', 'cannot appeal before Google answered');
select lives_ok($$ select public.advance_review_report((select id from r), 'answered') $$, 'a manager records that Google answered');
select throws_ok($$ select public.advance_review_report((select id from r), 'appealed') $$, 'P0001', 'bad_step', 'cannot appeal before it is known to be still showing');
select lives_ok($$ select public.advance_review_report((select id from r), 'still_showing') $$, 'still showing');
select lives_ok($$ select public.advance_review_report((select id from r), 'appealed') $$, 'the appeal starts once');
select throws_ok($$ select public.advance_review_report((select id from r), 'appealed') $$, 'P0001', 'bad_step', 'and cannot start twice');
select lives_ok($$ select public.advance_review_report((select id from r), 'still_showing') $$, 'after the appeal it can still be showing');
select throws_ok($$ select public.advance_review_report((select id from r), 'appealed') $$, 'P0001', 'bad_step', 'and there is no second appeal');
reset role;
select ok((select appeal_started_at is not null and closed_at is not null from public.review_reports where id = (select id from r)),
  'the appeal and the close are dated');

-- Removed ends it ---------------------------------------------------------------------------------------------------------
update public.review_reports set state = 'answered', closed_at = null where id = (select id from r);
select tests.act_as('00000000-0000-4000-8000-0000000000a1');
select lives_ok($$ select public.advance_review_report((select id from r), 'removed') $$, 'removed');
select throws_ok($$ select public.advance_review_report((select id from r), 'still_showing') $$, 'P0001', 'bad_step', 'nothing follows removed');
reset role;

-- The one-week reminder -------------------------------------------------------------------------------------------------
update public.review_reports set state = 'reported', step_at = now() - interval '3 days', closed_at = null where id = (select id from r);
select is(((public.list_review_reports('00000000-0000-4000-8000-0000000000c1') -> 0) ->> 'reminder_due'), 'false', 'no reminder after 3 days');
update public.review_reports set step_at = now() - interval '8 days' where id = (select id from r);
select is(((public.list_review_reports('00000000-0000-4000-8000-0000000000c1') -> 0) ->> 'reminder_due'), 'true', 'a reminder is due after a week without an update');
update public.review_reports set state = 'removed' where id = (select id from r);
select is(((public.list_review_reports('00000000-0000-4000-8000-0000000000c1') -> 0) ->> 'reminder_due'), 'false', 'a finished report gets no reminder');

-- Reading -----------------------------------------------------------------------------------------------------------------
select tests.act_as('00000000-0000-4000-8000-0000000000b2');
select throws_ok($$ select public.list_review_reports('00000000-0000-4000-8000-0000000000c1') $$, '42501', null, 'another business cannot list reports');
select is((select count(*)::int from public.review_reports), 0, 'and cannot read the rows');
reset role;
select tests.act_as('00000000-0000-4000-8000-0000000000a1');
select is((select count(*)::int from public.review_reports), 1, 'the owner reads their own');
reset role;

-- No review text anywhere in the table --------------------------------------------------------------------------------------
select is(
  (select coalesce(array_agg(column_name::text order by column_name), '{}') from information_schema.columns
    where table_schema = 'public' and table_name = 'review_reports'
      and column_name in ('comment', 'text', 'body', 'reviewer_name', 'notes', 'note', 'evidence_text')),
  '{}'::text[], 'the table has no column for review text, a name or evidence text');

select * from finish();
rollback;
