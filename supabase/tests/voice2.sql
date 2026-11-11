-- Voice 2 (R-158 item 3): the cost and health record of voice notes. The seconds and notes of a day, a failure that is not a note,
-- the streak of failures and its alert after 3 in a row (and not before), the 60 minute alert once a day, yesterday's numbers in the
-- staff summary, and that only the service role can write the record.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

delete from public.voice_usage;
update public.voice_health set fail_streak = 0;
delete from public.ops_events where kind in ('voice_failed', 'voice_minutes_high');

select public.voice_record(120, 'ok');
select public.voice_record(30, 'empty');
select is((select notes::text || '/' || seconds::text || '/' || failures::text from public.voice_usage where day = (now() at time zone 'Asia/Beirut')::date),
  '2/150/0', 'an answered note and a silent one both count, with their seconds');

select public.voice_record(0, 'failed');
select public.voice_record(0, 'failed');
select is((select count(*)::int from public.ops_events where kind = 'voice_failed'), 0, 'two failures in a row are not a staff alert');
select is((select notes::text || '/' || seconds::text || '/' || failures::text from public.voice_usage where day = (now() at time zone 'Asia/Beirut')::date),
  '2/150/2', 'a failure is counted as a failure, not as a note, and adds no seconds');
select public.voice_record(0, 'failed');
select is((select count(*)::int from public.ops_events where kind = 'voice_failed'), 1, 'the third failure in a row is a staff alert');
select public.voice_record(0, 'failed');
select is((select count(*)::int from public.ops_events where kind = 'voice_failed'), 1, 'a fourth in the same hour is not a second alert');
select public.voice_record(5, 'ok');
select is((select fail_streak from public.voice_health), 0, 'one answered note ends the streak');
select public.voice_record(0, 'failed');
select public.voice_record(0, 'failed');
select is((select count(*)::int from public.ops_events where kind = 'voice_failed'), 1, 'two more failures after a success are not an alert');

select is((select count(*)::int from public.ops_events where kind = 'voice_minutes_high'), 0, 'under 60 minutes is no alert');
select public.voice_record(3500, 'ok');
select is((select count(*)::int from public.ops_events where kind = 'voice_minutes_high'), 1, 'passing 60 minutes in a day is a staff alert');
select public.voice_record(300, 'ok');
select is((select count(*)::int from public.ops_events where kind = 'voice_minutes_high'), 1, 'and only one a day');

select throws_ok($$select public.voice_record(1, 'bogus')$$, 'P0001', null, 'an unknown outcome is refused');

update public.voice_usage set day = day - 1;
select is((public.whatsapp_staff_summary() ->> 'voice_seconds_yesterday')::int, 3955, 'the staff summary carries yesterday''s seconds');
select is((public.whatsapp_staff_summary() ->> 'voice_notes_yesterday')::int, 5, 'and yesterday''s notes');
select ok(public.whatsapp_staff_summary() ? 'first_action_cohort', 'the summary keeps the Growth 1 keys');

select is(has_function_privilege('anon', 'public.voice_record(integer,text)', 'execute'), false, 'anon cannot write the voice record');
select is(has_function_privilege('authenticated', 'public.voice_record(integer,text)', 'execute'), false, 'a signed-in user cannot write the voice record');
select is(has_function_privilege('service_role', 'public.voice_record(integer,text)', 'execute'), true, 'the service role can');
select is(has_table_privilege('authenticated', 'public.voice_usage', 'select'), false, 'no browser role can read the day counts');

select * from finish();
rollback;
