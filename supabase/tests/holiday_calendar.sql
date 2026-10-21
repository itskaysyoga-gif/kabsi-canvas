-- P0.5-03 part B: the holiday hours concierge (K-131, K-16, K-17, K-38, K-70). Five days before a verified public holiday of
-- the business's country Kabsi opens one question (a task); the answer is the approval: "closed" and "custom" make one
-- special hours period and approve it through the pipeline, "normal" sends nothing; a manager needs the owner's policy;
-- an answer is decided once; an email link is the credential for "normal" only; the undo gives the question back.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

\ir _fixtures.psql

-- LA (..c1) is a UK business, active on the mock; owner A ..a1, manager M ..b4 (not allowed to approve hours by default).
update public.profile_changes set status = 'expired' where location_id = '00000000-0000-4000-8000-0000000000c1';
insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-0000000000b4', 'authenticated', 'authenticated',
        'holiday-manager@example.test', now(), '{}', '{}', now(), now());
insert into public.location_members (location_id, user_id, role)
values ('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000b4', 'manager');
-- The fixtures let managers approve hours; the default is the owner only, so the test starts from the default (K-16).
delete from public.approval_policies where location_id = '00000000-0000-4000-8000-0000000000c1' and kind = 'hours';
update public.locations set consent_at = now(), access_granted_at = now(), google_account_id = 'accounts/test',
  google_location_id = 'locations/mock-holiday', status = 'active', country = 'GB', time_zone = 'Europe/London'
 where id = '00000000-0000-4000-8000-0000000000c1';

-- The calendar for the test: today is the business's local date.
create function pg_temp.today() returns date language sql as $$
  select (now() at time zone 'Europe/London')::date
$$;
insert into public.holidays (id, country, region, name, starts_on, ends_on, kind, estimated, source, verified_on) values
  ('00000000-0000-4000-8000-00000000d001', 'GB', 'england-and-wales', 'Test bank holiday', pg_temp.today() + 4, pg_temp.today() + 4, 'public', false, 'https://example.test/gb', pg_temp.today()),
  ('00000000-0000-4000-8000-00000000d002', 'GB', 'england-and-wales', 'Unchecked holiday', pg_temp.today() + 3, pg_temp.today() + 3, 'public', false, 'https://example.test/gb', null),
  ('00000000-0000-4000-8000-00000000d003', 'US', null, 'American holiday', pg_temp.today() + 3, pg_temp.today() + 3, 'public', false, 'https://example.test/us', pg_temp.today()),
  ('00000000-0000-4000-8000-00000000d004', 'GB', 'england-and-wales', 'Far holiday', pg_temp.today() + 30, pg_temp.today() + 30, 'public', false, 'https://example.test/gb', pg_temp.today()),
  ('00000000-0000-4000-8000-00000000d005', 'GB', 'england-and-wales', 'Test Ramadan', pg_temp.today() + 5, pg_temp.today() + 34, 'ramadan', true, 'https://example.test/gb', pg_temp.today()),
  ('00000000-0000-4000-8000-00000000d006', 'GB', 'england-and-wales', 'Test Eid', pg_temp.today() + 5, pg_temp.today() + 7, 'islamic', true, 'https://example.test/gb', pg_temp.today()),
  ('00000000-0000-4000-8000-00000000d007', 'GB', 'england-and-wales', 'Scottish holiday', pg_temp.today() + 3, pg_temp.today() + 3, 'public', false, 'https://example.test/gb', pg_temp.today());
update public.holidays set region = 'scotland' where id = '00000000-0000-4000-8000-00000000d007';

create function pg_temp.prompt(p_holiday text) returns uuid language sql as $$
  select id from public.holiday_prompts where location_id = '00000000-0000-4000-8000-0000000000c1'
     and holiday_id = p_holiday::uuid
$$;
create function pg_temp.ask(p_holiday text, p_answer text, p_open text default null, p_close text default null, p_from date default null,
  p_to date default null, p_user text default '00000000-0000-4000-8000-0000000000a1') returns jsonb language sql as $$
  select public.answer_holiday_as(pg_temp.prompt(p_holiday), p_user::uuid, p_answer, p_open, p_close, p_from, p_to)
$$;
create function pg_temp.task_state(p_holiday text) returns text language sql as $$
  select state from public.tasks where location_id = '00000000-0000-4000-8000-0000000000c1' and dedupe_key = 'holiday:' || pg_temp.prompt(p_holiday)
$$;

-- Who can run what -------------------------------------------------------------------------------------------------------

select ok((select bool_and(not has_function_privilege('anon', f, 'execute') and not has_function_privilege('authenticated', f, 'execute')
                           and has_function_privilege('service_role', f, 'execute'))
             from unnest(array['public.answer_holiday_as(uuid,uuid,text,text,text,date,date)', 'public.use_holiday_link(text,text,text,text,date,date,uuid)',
                               'public.holiday_link_view(text)', 'public.holiday_prompts_to_send(uuid)', 'public.mark_holiday_prompt_sent(uuid,text,timestamptz)',
                               'public.undo_holiday_link(text,uuid)']) f),
  'the answer paths, the email job and the link page run for the service role only');
select ok(has_function_privilege('authenticated', 'public.holiday_calendar(uuid,integer)', 'execute')
      and not has_function_privilege('anon', 'public.holiday_calendar(uuid,integer)', 'execute'), 'only signed-in members read the calendar function');
select ok(not has_table_privilege('authenticated', 'public.holidays', 'select') and not has_table_privilege('authenticated', 'public.holiday_prompts', 'select')
      and not has_table_privilege('anon', 'public.holiday_prompts', 'select'), 'the two tables are closed to the browser');

-- The detector: five days ahead, verified rows, the business's own country and region ------------------------------------------

select is(private.detect_holidays('00000000-0000-4000-8000-0000000000c1'), 3,
  'three questions open: the bank holiday in 4 days, Ramadan and Eid in 5 (not the unchecked one, the American one, the Scottish one, or the one in 30 days)');
select is((select array_agg(h.name order by lower(h.name)) from public.holiday_prompts p join public.holidays h on h.id = p.holiday_id
            where p.location_id = '00000000-0000-4000-8000-0000000000c1'), array['Test bank holiday', 'Test Eid', 'Test Ramadan'],
  'which questions');
select is((select row(kind, source_type, priority, state, title, approval_policy)::text from public.tasks
            where dedupe_key = 'holiday:' || pg_temp.prompt('00000000-0000-4000-8000-00000000d001')),
  row('hours_confirm', 'holiday', 'recommended', 'open', 'Your hours for Test bank holiday', 'owner')::text, 'the question is one task for the owner');
select is((select proposed_action -> 'answer' from public.tasks where dedupe_key = 'holiday:' || pg_temp.prompt('00000000-0000-4000-8000-00000000d005')),
  '["normal", "custom"]'::jsonb, 'Ramadan offers normal hours or different hours, not closed');
select is(private.detect_holidays('00000000-0000-4000-8000-0000000000c1'), 0, 'the same question is not opened twice');
select is(jsonb_array_length(public.holiday_prompts_to_send('00000000-0000-4000-8000-0000000000c1')), 3, 'three emails to send');

-- The answer is the approval ------------------------------------------------------------------------------------------------

select throws_ok($$ select pg_temp.ask('00000000-0000-4000-8000-00000000d001', 'closed', null, null, null, null, '00000000-0000-4000-8000-0000000000b4') $$,
  '42501', 'not_allowed_to_approve', 'a manager cannot answer until the owner lets managers approve hours (K-16)');
select throws_ok($$ select pg_temp.ask('00000000-0000-4000-8000-00000000d001', 'closed', null, null, null, null, '00000000-0000-4000-8000-0000000000b1') $$,
  'P0001', 'not_member', 'a stranger cannot');
select throws_ok($$ select public.answer_holiday_as(pg_temp.prompt('00000000-0000-4000-8000-00000000d001'), null, 'closed', null, null, null, null) $$,
  'P0001', 'sign_in_required', 'closed needs a person');
select throws_ok($$ select pg_temp.ask('00000000-0000-4000-8000-00000000d005', 'closed') $$, 'P0001', 'bad_answer', 'Ramadan has no closed answer');
select throws_ok($$ select pg_temp.ask('00000000-0000-4000-8000-00000000d001', 'sometimes') $$, 'P0001', 'bad_answer', 'an unknown answer is refused');
select throws_ok($$ select pg_temp.ask('00000000-0000-4000-8000-00000000d001', 'custom', '12:00', '10:00') $$, 'P0001', 'bad_times', 'closing before opening is refused');
select throws_ok($$ select pg_temp.ask('00000000-0000-4000-8000-00000000d001', 'custom', 'noon', '17:00') $$, 'P0001', 'bad_times', 'a time that is not a time is refused');
select throws_ok($$ select pg_temp.ask('00000000-0000-4000-8000-00000000d001', 'closed', null, null, pg_temp.today() + 10, pg_temp.today() + 11) $$,
  'P0001', 'bad_dates', 'days moved more than three either way are refused');
select throws_ok($$ select pg_temp.ask('00000000-0000-4000-8000-00000000d001', 'closed', null, null, pg_temp.today() + 4, pg_temp.today() + 3) $$,
  'P0001', 'bad_dates', 'an end before the start is refused');
select is((select count(*)::int from public.special_hours where location_id = '00000000-0000-4000-8000-0000000000c1' and reason like 'Test%'), 0,
  'nothing was saved by a refusal');

-- "Closed": one special hours period, approved through the pipeline, the answer recorded as the approval.
select is(pg_temp.ask('00000000-0000-4000-8000-00000000d001', 'closed') ->> 'publication_state', 'approved', 'the owner answers Closed');
select is((select row(start_date = pg_temp.today() + 4, end_date = pg_temp.today() + 4, closed, open_time, close_time, reason, state)::text
             from public.special_hours where location_id = '00000000-0000-4000-8000-0000000000c1' and reason = 'Test bank holiday'),
  row(true, true, true, null::time, null::time, 'Test bank holiday', 'publishing')::text, 'one special hours period for the day, closed');
select is((select row(p.target_type, p.state, p.channel, p.approved_by)::text from public.publications p
             join public.special_hours s on s.id = p.target_id where s.reason = 'Test bank holiday'),
  row('special_hours', 'approved', 'dashboard', '00000000-0000-4000-8000-0000000000a1'::uuid)::text,
  'through the one pipeline: approved by the owner on the dashboard, waiting out the 10 seconds');
select is((select row(state, answer, channel, answered_by, special_hours_id is not null)::text from public.holiday_prompts where id = pg_temp.prompt('00000000-0000-4000-8000-00000000d001')),
  row('answered', 'closed', 'dashboard', '00000000-0000-4000-8000-0000000000a1'::uuid, true)::text, 'the question records the answer');
select is(pg_temp.ask('00000000-0000-4000-8000-00000000d001', 'closed') ->> 'repeat', 'true', 'a second answer gets the first result');
select is((select count(*)::int from public.publications where target_type = 'special_hours' and location_id = '00000000-0000-4000-8000-0000000000c1'), 1, 'and no second publication');
select is(private.detect_holidays('00000000-0000-4000-8000-0000000000c1'), 0, 'the next detector run opens nothing new');
select is(pg_temp.task_state('00000000-0000-4000-8000-00000000d001'), 'done', 'and closes the answered task');

-- "Custom", read back by the form first; the Islamic days can move three days either way.
select is(pg_temp.ask('00000000-0000-4000-8000-00000000d006', 'custom', '10:00', '16:00', pg_temp.today() + 6, pg_temp.today() + 9) ->> 'publication_state', 'approved',
  'custom hours for moved days');
select is((select row(start_date = pg_temp.today() + 6, end_date = pg_temp.today() + 9, closed, open_time, close_time)::text
             from public.special_hours where location_id = '00000000-0000-4000-8000-0000000000c1' and reason = 'Test Eid'),
  row(true, true, false, '10:00:00'::time, '16:00:00'::time)::text, 'the period holds the times and the moved days');

-- "Normal hours": nothing is sent. A link is enough, no sign-in.
select is(pg_temp.ask('00000000-0000-4000-8000-00000000d005', 'normal') ->> 'answer', 'normal', 'Ramadan: normal hours');
select is((select count(*)::int from public.publications where target_type = 'special_hours' and location_id = '00000000-0000-4000-8000-0000000000c1'), 2, 'normal hours published nothing');

-- The email link ----------------------------------------------------------------------------------------------------------

insert into public.holidays (id, country, region, name, starts_on, ends_on, kind, estimated, source, verified_on)
values ('00000000-0000-4000-8000-00000000d008', 'GB', 'england-and-wales', 'Linked holiday', pg_temp.today() + 2, pg_temp.today() + 2, 'public', false, 'https://example.test/gb', pg_temp.today());
select is(private.detect_holidays('00000000-0000-4000-8000-0000000000c1'), 1, 'one more question');
select lives_ok($$ select public.mark_holiday_prompt_sent(pg_temp.prompt('00000000-0000-4000-8000-00000000d008'), 'hash-linked', now() + interval '2 days') $$, 'the email went out with a link');
select is(jsonb_array_length(public.holiday_prompts_to_send('00000000-0000-4000-8000-0000000000c1')), 0, 'nothing more to send');
select is(public.holiday_link_view('hash-linked') ->> 'status', 'ok', 'the page shows the question');
select is(public.holiday_link_view('hash-linked') -> 'holiday' ->> 'name', 'Linked holiday', 'with its holiday');
select is(public.holiday_link_view('no-such-hash') ->> 'status', 'invalid', 'an unknown link is invalid');
select throws_ok($$ select public.use_holiday_link('hash-linked', 'closed', null, null, null, null, null) $$, 'P0001', 'sign_in_required', 'the link alone cannot approve hours');
select throws_ok($$ select public.use_holiday_link('hash-linked', 'closed', null, null, null, null, '00000000-0000-4000-8000-0000000000b1') $$, 'P0001', 'not_member', 'another account cannot');
select throws_ok($$ select public.use_holiday_link('hash-linked', 'closed', null, null, null, null, '00000000-0000-4000-8000-0000000000b4') $$, '42501', 'not_allowed_to_approve', 'a manager cannot, by link either');
insert into public.approval_policies (location_id, kind, policy, set_by)
values ('00000000-0000-4000-8000-0000000000c1', 'hours', 'owner_and_managers', '00000000-0000-4000-8000-0000000000a1');
select is(public.use_holiday_link('hash-linked', 'closed', null, null, null, null, '00000000-0000-4000-8000-0000000000b4') ->> 'answer', 'closed',
  'once the owner lets managers approve hours, a manager can answer by link');
select is((select approved_by from public.publications p join public.special_hours s on s.id = p.target_id where s.reason = 'Linked holiday' and p.state <> 'cancelled'),
  '00000000-0000-4000-8000-0000000000b4'::uuid, 'and the approval is the manager''s');
select is(public.undo_holiday_link('hash-linked', '00000000-0000-4000-8000-0000000000b4') ->> 'state', 'cancelled', 'who can undo it');
delete from public.approval_policies where location_id = '00000000-0000-4000-8000-0000000000c1' and kind = 'hours';
select is(public.use_holiday_link('hash-linked', 'closed', null, null, null, null, '00000000-0000-4000-8000-0000000000a1') ->> 'answer', 'closed', 'the signed-in owner answers by link');
select is((select channel from public.holiday_prompts where token_hash = 'hash-linked'), 'email_link', 'recorded as the email link');
select is(public.holiday_link_view('hash-linked') ->> 'status', 'answered', 'the link is used');
select is(public.undo_holiday_link('hash-linked', '00000000-0000-4000-8000-0000000000a1') ->> 'state', 'cancelled', 'undo inside the 10 seconds cancels the approval');
select is((select row(state, answer, special_hours_id)::text from public.holiday_prompts where token_hash = 'hash-linked'), row('asked', null, null::uuid)::text,
  'and gives the question back');
select is((select bool_and(state = 'skipped') from public.special_hours where location_id = '00000000-0000-4000-8000-0000000000c1' and reason = 'Linked holiday'), true, 'the saved days are free again');
select is(public.use_holiday_link('hash-linked', 'normal', null, null, null, null, null) ->> 'answer', 'normal', 'normal hours by link alone, signed out');
update public.holiday_prompts set state = 'asked', answer = null, answered_at = null, channel = null, token_expires_at = now() - interval '1 hour'
 where token_hash = 'hash-linked';
select throws_ok($$ select public.use_holiday_link('hash-linked', 'normal', null, null, null, null, null) $$, 'P0001', 'link_expired', 'an expired link refuses');
select is(public.holiday_link_view('hash-linked') ->> 'status', 'expired', 'and says so');
update public.holiday_prompts set token_expires_at = now() + interval '1 day' where token_hash = 'hash-linked';

-- The owner already set special hours in the editor: that is the answer ---------------------------------------------------------

insert into public.holidays (id, country, region, name, starts_on, ends_on, kind, estimated, source, verified_on)
values ('00000000-0000-4000-8000-00000000d009', 'GB', 'england-and-wales', 'Already set', pg_temp.today() + 3, pg_temp.today() + 3, 'public', false, 'https://example.test/gb', pg_temp.today());
insert into public.special_hours (location_id, start_date, end_date, closed, reason)
values ('00000000-0000-4000-8000-0000000000c1', pg_temp.today() + 2, pg_temp.today() + 4, true, 'Owner closure');
select is(private.detect_holidays('00000000-0000-4000-8000-0000000000c1'), 0, 'no question for a day the owner already covered');
select is((select row(state, answer, channel)::text from public.holiday_prompts where id = pg_temp.prompt('00000000-0000-4000-8000-00000000d009')),
  row('answered', 'closed', 'dashboard')::text, 'it counts as answered');

-- A holiday that is over is no longer asked ------------------------------------------------------------------------------------

insert into public.holidays (id, country, region, name, starts_on, ends_on, kind, estimated, source, verified_on)
values ('00000000-0000-4000-8000-00000000d010', 'GB', 'england-and-wales', 'Over holiday', pg_temp.today() - 3, pg_temp.today() - 2, 'public', false, 'https://example.test/gb', pg_temp.today());
insert into public.holiday_prompts (location_id, holiday_id) values ('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-00000000d010');
select is(private.detect_holidays('00000000-0000-4000-8000-0000000000c1'), 0, 'nothing new');
select is((select state from public.holiday_prompts where id = pg_temp.prompt('00000000-0000-4000-8000-00000000d010')), 'expired', 'once the holiday is over the question expires');
select throws_ok($$ select pg_temp.ask('00000000-0000-4000-8000-00000000d010', 'normal') $$, 'P0001', 'holiday_passed', 'and cannot be answered');

-- The Hours screen's read ----------------------------------------------------------------------------------------------------

select tests.act_as('00000000-0000-4000-8000-0000000000a1');
select is(jsonb_array_length(public.holiday_calendar('00000000-0000-4000-8000-0000000000c1', 60) -> 'upcoming') >= 5, true, 'the owner sees the next holidays of the country');
select is((select every(u ->> 'name' not in ('American holiday', 'Unchecked holiday', 'Scottish holiday'))
             from jsonb_array_elements(public.holiday_calendar('00000000-0000-4000-8000-0000000000c1', 60) -> 'upcoming') u), true,
  'never another country, another region or an unchecked row');
reset role;
select tests.act_as('00000000-0000-4000-8000-0000000000b1');
select throws_ok($$ select public.holiday_calendar('00000000-0000-4000-8000-0000000000c1', 60) $$, '42501', null, 'a stranger cannot');
reset role;

-- A business that cannot be asked (not active, disconnected, concierge, no country) closes the questions ------------------------------

update public.locations set status = 'paused' where id = '00000000-0000-4000-8000-0000000000c1';
select is(private.detect_holidays('00000000-0000-4000-8000-0000000000c1'), 0, 'a paused business is not asked');
select is((select count(*)::int from public.tasks where location_id = '00000000-0000-4000-8000-0000000000c1' and dedupe_key like 'holiday:%'
            and state in ('open', 'snoozed', 'approved', 'publishing')), 0, 'and its open holiday tasks are closed');

select * from finish();
rollback;
