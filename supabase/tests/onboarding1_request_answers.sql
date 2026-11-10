-- Onboarding 1 (10 Nov 2026, master plan 30.48, R-145): the two optional questions at signup.
--   Optional and skippable; saved and changed (the date of the first answer is kept, a cleared answer loses it); the app name
--   only goes with a booking app; another business cannot read or write them; the staff view gives counts only, leaves out
--   demo businesses, and gives Gate 3's rule (3 or more of the first 10 opens it, fewer than 2 keeps it off).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

\ir _fixtures.psql

-- The victim owner A owns LA ..c1. Another owner B (..b2) owns LB ..c2 (both from the fixtures). A manager M (..b3) of LA is added;
-- the stranger S is ..b1.
insert into public.location_members (location_id, user_id, role) values ('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000b3', 'manager');

create temp table before_counts as select
  (select count(*) from public.emails where location_id = '00000000-0000-4000-8000-0000000000c1') as emails,
  (select count(*) from public.jobs where location_id = '00000000-0000-4000-8000-0000000000c1') as jobs,
  (select count(*) from public.notifications where location_id = '00000000-0000-4000-8000-0000000000c1') as notices;

-- 1. Nothing is asked of the database until the owner answers: new businesses have no answers, and onboarding is not done.
select is((select count(*)::int from public.locations where request_tracking is not null or early_access_whatsapp is not null
            or onboarding_questions_at is not null), 0, 'a new business has no answers and has not been through the questions');

-- 2. Skip: nothing saved, the questions are marked done (so onboarding does not ask again) ---------------------------------------
select tests.act_as('00000000-0000-4000-8000-0000000000a1');
select is((public.onboarding_status('00000000-0000-4000-8000-0000000000c1') ->> 'questions_done')::boolean, false,
  'onboarding_status says the questions are not done yet');
select lives_ok($$ select public.save_request_answers('00000000-0000-4000-8000-0000000000c1', null, null, null) $$, 'Skip saves');
select is((select request_tracking is null and early_access_whatsapp is null and request_tracking_at is null and early_access_at is null
              and onboarding_questions_at is not null from public.locations where id = '00000000-0000-4000-8000-0000000000c1'),
  true, 'Skip saves no answer and marks the questions done');
select is((public.onboarding_status('00000000-0000-4000-8000-0000000000c1') ->> 'questions_done')::boolean, true, 'and onboarding_status now says done');

-- 3. Answer, with the app name ------------------------------------------------------------------------------------------------
select lives_ok($$ select public.save_request_answers('00000000-0000-4000-8000-0000000000c1', 'booking_app', '  Fresha  ', true) $$, 'an owner answers both');
select is((select request_tracking || '/' || request_tracking_app || '/' || early_access_whatsapp::text from public.locations where id = '00000000-0000-4000-8000-0000000000c1'),
  'booking_app/Fresha/true', 'the choice, the trimmed app name and the yes are saved');
select ok((select request_tracking_at is not null and early_access_at is not null from public.locations where id = '00000000-0000-4000-8000-0000000000c1'),
  'each answer has the date it was first answered');

-- 4. Change: the first date is kept, the app name goes with the booking app only -----------------------------------------------
reset role;
update public.locations set request_tracking_at = now() - interval '5 days', early_access_at = now() - interval '4 days'
 where id = '00000000-0000-4000-8000-0000000000c1';
select tests.act_as('00000000-0000-4000-8000-0000000000a1');
select lives_ok($$ select public.save_request_answers('00000000-0000-4000-8000-0000000000c1', 'chats', 'Fresha', false) $$, 'an owner changes both answers');
select is((select request_tracking || '/' || coalesce(request_tracking_app, 'none') || '/' || early_access_whatsapp::text from public.locations where id = '00000000-0000-4000-8000-0000000000c1'),
  'chats/none/false', 'the app name is dropped when the choice is not a booking app');
select ok((select request_tracking_at < now() - interval '4 days' and early_access_at < now() - interval '3 days' from public.locations where id = '00000000-0000-4000-8000-0000000000c1'),
  'a changed answer keeps the date it was first answered');

-- 5. Clear one answer: its date goes, the other stays ------------------------------------------------------------------------------
select lives_ok($$ select public.save_request_answers('00000000-0000-4000-8000-0000000000c1', null, null, false) $$, 'an owner clears the first answer');
select is((select request_tracking is null and request_tracking_at is null and early_access_whatsapp is false and early_access_at is not null
            from public.locations where id = '00000000-0000-4000-8000-0000000000c1'), true, 'a cleared answer loses its date; the other stays');

-- 6. Bad input is refused ---------------------------------------------------------------------------------------------------------
select throws_ok($$ select public.save_request_answers('00000000-0000-4000-8000-0000000000c1', 'diary', null, null) $$, '22023', null, 'an unknown choice is refused');
select throws_ok($$ select public.save_request_answers('00000000-0000-4000-8000-0000000000c1', 'booking_app', repeat('x', 81), null) $$, '22023', null, 'an app name over 80 characters is refused');
select lives_ok($$ select public.save_request_answers('00000000-0000-4000-8000-0000000000c1', 'booking_app', '   ', null) $$, 'a blank app name is no name');
select is((select request_tracking_app is null from public.locations where id = '00000000-0000-4000-8000-0000000000c1'), true, 'and is stored as none');
reset role;

-- 7. A manager of the business can change them; staff role members of nothing else cannot ---------------------------------------------
select tests.act_as('00000000-0000-4000-8000-0000000000b3');
select lives_ok($$ select public.save_request_answers('00000000-0000-4000-8000-0000000000c1', 'memory', null, true) $$, 'a manager can change them');
reset role;

-- 8. Another business cannot read or write them (RLS and the function's check) --------------------------------------------------
select tests.act_as('00000000-0000-4000-8000-0000000000b2');
select throws_ok($$ select public.save_request_answers('00000000-0000-4000-8000-0000000000c1', 'chats', null, true) $$, '42501', null, 'the owner of another business cannot save them');
select is((select count(*)::int from public.locations where id = '00000000-0000-4000-8000-0000000000c1'), 0, 'the owner of another business cannot read the row, so not the answers');
select is((select count(*)::int from public.locations where request_tracking is not null), 0, 'and sees no answers from any other business');
reset role;
select tests.act_as('00000000-0000-4000-8000-0000000000b1');
select throws_ok($$ select public.save_request_answers('00000000-0000-4000-8000-0000000000c1', 'chats', null, true) $$, '42501', null, 'a stranger cannot save them');
select is((select count(*)::int from public.locations where request_tracking is not null), 0, 'and reads none');
reset role;
set local role anon;
select ok(not has_function_privilege('anon', 'public.save_request_answers(uuid,text,text,boolean)', 'execute'), 'anon cannot save them');
select ok(not has_function_privilege('anon', 'public.staff_request_answers()', 'execute'), 'anon cannot open the staff counts');
reset role;
select tests.act_as('00000000-0000-4000-8000-0000000000a1');
do $$ begin
  begin update public.locations set request_tracking = 'notebook' where id = '00000000-0000-4000-8000-0000000000c1';
  exception when others then null; end;
end $$;
reset role;
select is((select request_tracking from public.locations where id = '00000000-0000-4000-8000-0000000000c1'), 'memory',
  'the browser cannot write the column directly: only the function does');

-- 9. Nothing is sent because of an answer (counted before the first save and after the last) -----------------------------------------
select is((select (select count(*) from public.emails where location_id = '00000000-0000-4000-8000-0000000000c1') - emails from before_counts), 0::bigint, 'no email was made by an answer');
select is((select (select count(*) from public.jobs where location_id = '00000000-0000-4000-8000-0000000000c1') - jobs from before_counts), 0::bigint, 'no job (so no WhatsApp message) was queued by an answer');
select is((select (select count(*) from public.notifications where location_id = '00000000-0000-4000-8000-0000000000c1') - notices from before_counts), 0::bigint, 'and no notice was made');

-- 10. The staff counts --------------------------------------------------------------------------------------------------------------
-- Eleven real businesses answer in this order (the first answer, whichever question it was), and a demo business too.
insert into public.locations (id, name, place_id) select ('00000000-0000-4000-8000-00000000c1' || lpad(n::text, 2, '0'))::uuid, 'Answer ' || n, 'ans-' || n from generate_series(1, 12) n;
-- Businesses 1 to 11 answer on consecutive days; business 12 is a demo and never counts.
create temp table spec (n int, tracking text, early boolean, days int);
insert into spec values
  (1, 'chats', true, 20), (2, 'booking_app', true, 19), (3, 'notebook', false, 18), (4, 'memory', true, 17),
  (5, 'other', null, 16), (6, null, true, 15), (7, 'chats', true, 14), (8, 'chats', false, 13),
  (9, 'chats', false, 12), (10, 'chats', false, 11), (11, 'memory', true, 10);
update public.locations l set
  request_tracking = s.tracking, request_tracking_at = case when s.tracking is null then null else now() - make_interval(days => s.days) end,
  early_access_whatsapp = s.early, early_access_at = case when s.early is null then null else now() - make_interval(days => s.days) end
 from spec s where l.name = 'Answer ' || s.n;
update public.locations set is_demo = true, request_tracking = 'chats', request_tracking_at = now() - interval '30 days',
  early_access_whatsapp = true, early_access_at = now() - interval '30 days' where name = 'Answer 12';
update public.organizations set is_demo = true where id = (select organization_id from public.locations where name = 'Answer 12');
-- The victim business (A) has a booking... and its manager's memory answer from step 7 stays; set it aside so counts are exact.
update public.locations set request_tracking = null, request_tracking_at = null, early_access_whatsapp = null, early_access_at = null
 where id = '00000000-0000-4000-8000-0000000000c1';

select tests.act_as('00000000-0000-4000-8000-0000000000a3');
select is((select j #>> '{tracking,chats}' from (select public.staff_request_answers() as j) r1)::int, 5, 'staff: five keep requests in chats');
select is((select (j #>> '{tracking,booking_app}')::int || '/' || (j #>> '{tracking,notebook}') || '/' || (j #>> '{tracking,memory}') || '/' || (j #>> '{tracking,other}') || '/' || (j #>> '{tracking,answered}') from (select public.staff_request_answers() as j) r1),
  '1/1/2/1/10', 'staff: booking app, notebook, memory, something else, answered');
select is((select (j #>> '{early_access,yes}') || '/' || (j #>> '{early_access,no}') || '/' || (j #>> '{early_access,answered}') from (select public.staff_request_answers() as j) r1), '6/4/10', 'staff: yes, no, answered');
select is((select (j ->> 'answered_any')::int from (select public.staff_request_answers() as j) r1), 11, 'staff: eleven real businesses answered; the demo business is left out');
select is((select (j #>> '{gate3,first_ten_answered}') || '/' || (j #>> '{gate3,first_ten_qualifying}') || '/' || (j #>> '{gate3,verdict}') from (select public.staff_request_answers() as j) r1), '10/3/open', 'Gate 3: 3 of the first 10 qualify, so it opens');
select is((select string_agg((e ->> 'business') || ':' || (e ->> 'position') || ':' || (e ->> 'in_first_ten'), ', ' order by (e ->> 'position')::int) from (select public.staff_request_answers() as j) r1, jsonb_array_elements(r1.j -> 'qualifying') e),
  'Answer 1:1:true, Answer 4:4:true, Answer 7:7:true, Answer 11:11:false', 'the qualifying businesses, in order, with the pilot first; the eleventh is past the first ten');
select is((select count(*)::int from (select public.staff_request_answers() as j) r1 where j::text ~* '(email|phone|whatsapp number|@)'), 0, 'the counts carry no email or phone');
reset role;

-- Fewer than 2 of the first 10: it stays off. Exactly 2: neither. Fewer than 10 answered: still collecting.
update public.locations set early_access_whatsapp = false where name in ('Answer 1', 'Answer 7');
select tests.act_as('00000000-0000-4000-8000-0000000000a3');
select is((select public.staff_request_answers() #>> '{gate3,first_ten_qualifying}') || '/' || (public.staff_request_answers() #>> '{gate3,verdict}'), '1/off', 'Gate 3: 1 of 10 keeps it off');
reset role;
update public.locations set early_access_whatsapp = true where name = 'Answer 1';
select tests.act_as('00000000-0000-4000-8000-0000000000a3');
select is((select public.staff_request_answers() #>> '{gate3,verdict}'), 'between', 'Gate 3: exactly 2 of 10 is neither open nor off');
reset role;
update public.locations set request_tracking = null, request_tracking_at = null, early_access_whatsapp = null, early_access_at = null
 where name in ('Answer 6', 'Answer 7', 'Answer 8', 'Answer 9', 'Answer 10', 'Answer 11');
select tests.act_as('00000000-0000-4000-8000-0000000000a3');
select is((select public.staff_request_answers() #>> '{gate3,first_ten_answered}') || '/' || (public.staff_request_answers() #>> '{gate3,verdict}'), '5/collecting', 'fewer than 10 answered: still collecting');
reset role;

-- Only staff open it.
select tests.act_as('00000000-0000-4000-8000-0000000000a1');
select throws_ok($$ select public.staff_request_answers() $$, '42501', null, 'an owner cannot open the staff counts');
reset role;
select tests.act_as('00000000-0000-4000-8000-0000000000b1');
select throws_ok($$ select public.staff_request_answers() $$, '42501', null, 'nor a stranger');
reset role;

select * from finish();
rollback;
