-- OUTBOUND-3: the US and the UK only, sending still locked, opening needs DNS and a mail-tester 10 of 10 even for lane R,
-- and the kill gate.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

select is((select row(sending_open, test_mode)::text from public.outbound_settings), row(false, true)::text, 'still locked, still test mode');
select lives_ok($$update public.outbound_settings set open_countries = array['US', 'GB']$$, 'US and GB may be opened');
select throws_ok($$update public.outbound_settings set open_countries = array['AE']$$, '23514', null, 'any other country is refused');
select throws_ok($$update public.outbound_settings set open_countries = array['US', 'CA']$$, '23514', null, 'Canada is refused');
update public.outbound_settings set open_countries = '{}';

-- Opening: lane R (postgres) too needs the DNS reading and 10 of 10.
select throws_ok($$update public.outbound_settings set sending_open = true$$, '42501', null, 'no DNS reading, no score: refused');
update public.outbound_settings set dns_ok = true, mail_tester_score = 9.9;
select throws_ok($$update public.outbound_settings set sending_open = true$$, '42501', null, '9.9 of 10 is refused');
update public.outbound_settings set dns_ok = false, mail_tester_score = 10;
select throws_ok($$update public.outbound_settings set sending_open = true$$, '42501', null, 'DNS not right is refused');
select throws_ok($$update public.outbound_settings set dns_ok = true, mail_tester_score = 10, sending_open = true$$, '42501', null,
  'the readings cannot be set in the same statement that opens');
update public.outbound_settings set dns_ok = true, mail_tester_score = 10;
set local role service_role;
select throws_ok($$update public.outbound_settings set sending_open = true$$, '42501', 'outbound: sending opens only by lane R',
  'the functions still can never open it');
reset role;
select throws_ok($$update public.outbound_settings set mail_tester_address = 'someone@example.com'$$, '23514', null,
  'only a mail-tester address is recorded');
update public.outbound_settings set dns_ok = null, mail_tester_score = null;

-- The kill gate: the first 300 Email 1s, then 14 days for replies; fewer than 3 that led to a check ends Outbound.
delete from public.outbound_days;
select is(public.outbound_check_kill_gate(), 'open', 'no emails yet');
insert into public.outbound_days (day, sent, first_emails, interested) values
  (current_date - 40, 150, 150, 1), (current_date - 10, 150, 150, 1);
select is(public.outbound_check_kill_gate(), 'waiting', 'the 300th went out 10 days ago: replies still have time');
update public.outbound_days set day = current_date - 20 where day = current_date - 10;
update public.outbound_days set interested = 2 where day = current_date - 40;
select is(public.outbound_check_kill_gate(), 'passed', '3 checks: Outbound carries on');
update public.outbound_days set interested = 1 where day = current_date - 40;
select is(public.outbound_check_kill_gate(), 'ended', '2 checks in the first 300: Outbound ends');
select matches((select stopped_reason from public.outbound_settings), '^Kill gate: 2 of the first 300', 'the stop says why');
select is((select sending_open from public.outbound_settings), false, 'sending is off');
select is(public.outbound_check_kill_gate(), 'ended', 'it stays ended');
select ok(not has_function_privilege('authenticated', 'public.outbound_check_kill_gate()', 'execute'), 'the browser cannot run it');

-- FIX-3: the kill gate counts a free check that was run or a trial that started from an outbound reply, once per business; a yes alone does not.
delete from public.outbound_days;
update public.outbound_settings set stopped_reason = null, sending_open = false;
insert into public.outbound_prospects (id, harvey_company_id, country, industry, city, business_name, email, email_domain, source_page,
  source_date, detail_kind, detail_used, status)
select ('00000000-0000-4000-8000-0000000fa' || lpad(i::text, 3, '0'))::uuid, 'fix3-' || i, 'US', 'auto repair', 'Exampleville', 'Oak Street Auto ' || i,
  'hello@oak' || i || '.example.com', 'oak' || i || '.example.com', 'https://oak' || i || '.example.com/contact', current_date, 'hours',
  'Your site lists your hours, and keeping Google''s hours the same saves wasted trips.', 'needs_you'
  from generate_series(1, 3) i;
insert into public.outbound_events (prospect_id, kind, intent, inbound_id)
values ('00000000-0000-4000-8000-0000000fa001', 'reply', 'yes', '<fix3-yes-1@oak1.example.com>');
select is((select coalesce(sum(interested), 0) from public.outbound_days), 0::bigint, 'a yes reply alone is not counted');
select is((select coalesce(sum(replies), 0) from public.outbound_days), 1::bigint, 'the reply itself is still counted as a reply');
select is(public.outbound_note_led('00000000-0000-4000-8000-0000000fa001', 'check', 'ABCD2345'), true, 'the check that ran is counted');
select is(public.outbound_note_led('00000000-0000-4000-8000-0000000fa001', 'check', 'ABCD2345'), false, 'the same business is not counted twice');
select is((select coalesce(sum(interested), 0) from public.outbound_days), 1::bigint, 'one business, one count');
select is((select led_by || '/' || check_code from public.outbound_prospects where id = '00000000-0000-4000-8000-0000000fa001'), 'check/ABCD2345',
  'the prospect keeps how and which check');
select throws_ok($$ select public.outbound_note_led('00000000-0000-4000-8000-0000000fa002', 'reply') $$, '22023', null, 'only a check or a trial leads');
select ok(not has_function_privilege('authenticated', 'public.outbound_note_led(uuid,text,text)', 'execute')
      and not has_function_privilege('authenticated', 'public.outbound_note_trials()', 'execute'), 'the browser cannot run them');

-- A trial: the business signed up from its check (free_checks.location_id) and its organisation has a trial.
insert into public.locations (id, name, place_id) values ('00000000-0000-4000-8000-0000000fb001', 'Oak Street Auto 2', 'fix3-place-2');
insert into public.free_checks (code, business, term, country, self, center, radius_km, fast, source, state, location_id)
values ('FIXCHK22', 'Oak Street Auto 2', 'auto repair', 'US', '{}', '{}', 3, '{}', 'mock', 'done', '00000000-0000-4000-8000-0000000fb001');
update public.outbound_prospects set check_code = 'KAB-FIXCHK22' where id = '00000000-0000-4000-8000-0000000fa002';
select is(public.outbound_note_trials(), 0, 'a check with no trial yet adds nothing');
update public.subscriptions set plan = 'free', state = 'trialing', trial_started_at = now(), trial_ends_at = now() + interval '14 days'
 where organization_id = (select organization_id from public.locations where id = '00000000-0000-4000-8000-0000000fb001');
insert into public.subscriptions (organization_id, plan, state, trial_started_at, trial_ends_at)
select organization_id, 'free', 'trialing', now(), now() + interval '14 days' from public.locations
 where id = '00000000-0000-4000-8000-0000000fb001'
   and not exists (select 1 from public.subscriptions s where s.organization_id = public.locations.organization_id);
select is(public.outbound_note_trials(), 1, 'a trial started from a check the business ran is counted');
select is((select led_by from public.outbound_prospects where id = '00000000-0000-4000-8000-0000000fa002'), 'trial', 'led by the trial');
select is(public.outbound_note_trials(), 0, 'and only once');
select is((select coalesce(sum(interested), 0) from public.outbound_days), 2::bigint, 'two businesses so far');

-- The gate reads these: 300 first emails 20 days ago and 2 businesses led is below 3; a third passes it.
insert into public.outbound_days (day, sent, first_emails) values (current_date - 20, 300, 300) on conflict (day) do update set first_emails = 300, sent = 300;
update public.outbound_days set day = current_date - 19 where day = current_date;  -- the tallies were made today; the gate reads the 14 days after the 300th
select is(public.outbound_check_kill_gate(), 'ended', '2 businesses led to a check or a trial: Outbound ends, though many more said yes');
update public.outbound_settings set stopped_reason = null;
select is(public.outbound_note_led('00000000-0000-4000-8000-0000000fa003', 'check', 'ZYXW9876'), true, 'a third business');
update public.outbound_days set day = current_date - 18 where day = current_date;
select is(public.outbound_check_kill_gate(), 'passed', '3 businesses led to a check or a trial: Outbound carries on');

-- The jobs: scripts/db-test.sh unschedules every cron job after the migrations, so the schedules are checked on the
-- migration's text (tests/outbound3.test.ts) and read back live after applying.

select * from finish();
rollback;
