-- Outbound test part G: the test-only setting (30.39 item 12) cannot be set by the functions, lasts at most 4 hours,
-- never survives sending opening or test mode ending, and the 20-minute floor holds whenever it is not live.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

select is((select test_fast_until from public.outbound_settings), null, 'the setting starts off');

-- Off: the 20-minute floor holds even when a shorter gap is asked for.
update public.outbound_settings set next_send_at = null;
select ok(public.outbound_reserve_slot(60), 'a slot is taken');
select ok((select next_send_at from public.outbound_settings) >= now() + interval '19 minutes', 'off: at least 20 minutes');

-- The service role (the functions) cannot set it.
set local role service_role;
select throws_ok($$update public.outbound_settings set test_fast_until = now() + interval '1 hour'$$, '42501', null,
  'the functions cannot set the test setting');
reset role;

-- Lane R (postgres) can, at most 4 hours ahead.
select throws_ok($$update public.outbound_settings set test_fast_until = now() + interval '5 hours'$$, '22023', null,
  'at most 4 hours');
update public.outbound_settings set test_fast_until = now() + interval '1 hour', next_send_at = null;
select ok(public.outbound_reserve_slot(60), 'a slot is taken while the setting is live');
select ok((select next_send_at from public.outbound_settings) < now() + interval '2 minutes', 'live: 1 minute apart');

-- Past its time it is off again.
update public.outbound_settings set test_fast_until = now() - interval '1 second', next_send_at = null;
select ok(public.outbound_reserve_slot(60), 'a slot is taken after the setting ended');
select ok((select next_send_at from public.outbound_settings) >= now() + interval '19 minutes', 'ended: 20 minutes again');

-- Leaving test mode clears it.
update public.outbound_settings set test_fast_until = now() + interval '1 hour';
update public.outbound_settings set test_mode = false;
select is((select test_fast_until from public.outbound_settings), null, 'leaving test mode clears the setting');
update public.outbound_settings set test_mode = true, test_fast_until = now() + interval '1 hour';
update public.outbound_settings set sending_open = true;
select is((select test_fast_until from public.outbound_settings), null, 'opening sending clears the setting');

select * from finish();
rollback;
