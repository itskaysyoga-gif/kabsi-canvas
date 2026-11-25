-- OUTBOUND-3: the US and the UK only, sending still locked, opening needs DNS and a mail-tester 10 of 10 even for lane R,
-- the kill gate, and the three jobs scheduled again.
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

-- The jobs.
select is((select schedule from cron.job where jobname = 'kabsi_outbound_prepare'), '15 */2 * * 0', 'prepare: Sundays, for the coming week');
select is((select schedule from cron.job where jobname = 'kabsi_outbound_send'), '*/10 * * * *', 'send every 10 minutes');
select is((select schedule from cron.job where jobname = 'kabsi_outbound_inbox'), '5-55/10 * * * *', 'inbox between the sends');

select * from finish();
rollback;
