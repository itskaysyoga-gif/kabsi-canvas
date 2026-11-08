-- Request book, PR B (Build decisions B1 to B17): one shared workflow for every kind of request. All data is fictional.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
select '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email, now(), '{}', '{}', now(), now()
from (values ('00000000-0000-4000-8000-00000000e0a1'::uuid, 'rw-owner@example.test'),
             ('00000000-0000-4000-8000-00000000e0a2'::uuid, 'rw-staff@example.test'),
             ('00000000-0000-4000-8000-00000000e0b1'::uuid, 'rw-other@example.test')) as u(id, email);
insert into public.locations (id, name, place_id) values
  ('00000000-0000-4000-8000-00000000e0c1', 'Fictional Salon', 'rw-place-a'),
  ('00000000-0000-4000-8000-00000000e0c2', 'Fictional Gym', 'rw-place-b');
insert into public.location_members (location_id, user_id, role) values
  ('00000000-0000-4000-8000-00000000e0c1', '00000000-0000-4000-8000-00000000e0a1', 'owner'),
  ('00000000-0000-4000-8000-00000000e0c1', '00000000-0000-4000-8000-00000000e0a2', 'staff'),
  ('00000000-0000-4000-8000-00000000e0c2', '00000000-0000-4000-8000-00000000e0b1', 'owner');
insert into public.location_packs (location_id, pack, state) values
  ('00000000-0000-4000-8000-00000000e0c1', 'salon', 'test'), ('00000000-0000-4000-8000-00000000e0c2', 'gym', 'test');
delete from public.app_settings where key = 'request_book';

\set L '''00000000-0000-4000-8000-00000000e0c1'''
\set O '''00000000-0000-4000-8000-00000000e0a1'''

create function pg_temp.L() returns uuid language sql as $$ select '00000000-0000-4000-8000-00000000e0c1'::uuid $$;
create function pg_temp.O() returns uuid language sql as $$ select '00000000-0000-4000-8000-00000000e0a1'::uuid $$;
create function pg_temp.S() returns uuid language sql as $$ select '00000000-0000-4000-8000-00000000e0a2'::uuid $$;
create function pg_temp.K() returns text language sql as $$ select gen_random_uuid()::text $$;
create function pg_temp.reason(j jsonb) returns text language sql as $$ select j ->> 'reason' $$;
create function pg_temp.rid(j jsonb) returns uuid language sql as $$ select (j ->> 'request_id')::uuid $$;
create function pg_temp.mk(p_kind text, p_extra jsonb default '{}') returns jsonb language sql as $$
  select public.request_create(pg_temp.L(), pg_temp.O(), pg_temp.K(),
    jsonb_build_object('kind', p_kind, 'customer_name', 'Sarah Fictional', 'summary', 'Highlights please', 'entry_method', 'typed') || p_extra) $$;
create function pg_temp.ver(p uuid) returns integer language sql as $$ select row_version from public.customer_requests where id = p $$;
create function pg_temp.st(p uuid, p_to text, p_out text default null, p_ack boolean default false, p_actor uuid default null) returns jsonb language sql as $$
  select public.request_set_status(pg_temp.L(), coalesce(p_actor, pg_temp.O()), pg_temp.K(), p, pg_temp.ver(p), p_to, p_out, p_ack) $$;
create function pg_temp.conf(p uuid, p_party text, p_val boolean default true) returns jsonb language sql as $$
  select public.request_set_confirmation(pg_temp.L(), pg_temp.O(), pg_temp.K(), p, pg_temp.ver(p), p_party, p_val) $$;
create function pg_temp.fix(p uuid, c jsonb, p_actor uuid default null) returns jsonb language sql as $$
  select public.request_correct(pg_temp.L(), coalesce(p_actor, pg_temp.O()), pg_temp.K(), p, pg_temp.ver(p), c) $$;
create function pg_temp.undo(a uuid, p_actor uuid default null) returns jsonb language sql as $$
  select public.request_undo(pg_temp.L(), coalesce(p_actor, pg_temp.O()), pg_temp.K(), a) $$;
create function pg_temp.acts() returns integer language sql as $$ select count(*)::int from public.request_activities $$;
create function pg_temp.status(p uuid) returns text language sql as $$ select status || coalesce(':' || outcome, '') from public.customer_requests where id = p $$;

-- B1: off unless the setting and the pack are both on. Production has no setting.
select is(pg_temp.reason(pg_temp.mk('job')), 'disabled', 'B1 create is disabled');
select is(pg_temp.reason(public.request_set_status(pg_temp.L(), pg_temp.O(), 'k', gen_random_uuid(), 1, 'active')), 'disabled', 'B1 status is disabled');
select is(pg_temp.reason(public.request_set_confirmation(pg_temp.L(), pg_temp.O(), 'k', gen_random_uuid(), 1, 'staff', true)), 'disabled', 'B1 confirmation is disabled');
select is(pg_temp.reason(public.request_correct(pg_temp.L(), pg_temp.O(), 'k', gen_random_uuid(), 1, '{"summary":"x"}')), 'disabled', 'B1 correction is disabled');
select is(pg_temp.reason(public.request_convert_enquiry(pg_temp.L(), pg_temp.O(), 'k', gen_random_uuid(), 1)), 'disabled', 'B1 conversion is disabled');
select is(pg_temp.reason(public.request_undo(pg_temp.L(), pg_temp.O(), 'k', gen_random_uuid())), 'disabled', 'B1 undo is disabled');
select is((select count(*)::int from public.customer_requests) + (select count(*)::int from public.customers) + (select count(*)::int from public.tool_executions), 0, 'B1 nothing was written');
insert into public.app_settings (key, value) values ('request_book', 'on');
update public.location_packs set state = 'off' where location_id = pg_temp.L();
select is(pg_temp.reason(pg_temp.mk('job')), 'disabled', 'B1 a pack in off state stays disabled');
update public.location_packs set state = 'test' where location_id = pg_temp.L();

-- B3: browser roles cannot run anything.
select is((select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace, unnest(array['anon','authenticated']) r
            where ((n.nspname = 'public' and p.proname in ('request_create','request_set_status','request_set_confirmation','request_correct','request_convert_enquiry','request_undo'))
                or (n.nspname = 'private' and p.proname like 'rb\_%')) and has_function_privilege(r, p.oid, 'execute')), 0, 'B3 no browser role can run a request function');
select is((select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and p.proname in ('request_create','request_set_status','request_set_confirmation','request_correct','request_convert_enquiry','request_undo')
              and has_function_privilege('service_role', p.oid, 'execute') and p.prosecdef and p.proconfig @> array['search_path=""']), 6, 'B3 six service-only definer functions with an empty search path');

select pg_temp.mk('job', '{"summary":"Brakes"}') ->> 'request_id' as j1 \gset
select ok(:'j1' is not null, 'B4 a job can be created');
select is(pg_temp.status(:'j1'), 'waiting', 'B4 a job starts waiting');

-- B2: only members, only their own business.
select is(pg_temp.reason(public.request_create(pg_temp.L(), '00000000-0000-4000-8000-00000000e0b1', pg_temp.K(), '{"kind":"job","summary":"x","entry_method":"typed"}')), 'not_member', 'B2 another business''s owner cannot create here');
select is(pg_temp.reason(public.request_set_status(pg_temp.L(), '00000000-0000-4000-8000-00000000e0b1', pg_temp.K(), :'j1', 1, 'active')), 'not_member', 'B2 cannot change status');
select is(pg_temp.reason(public.request_set_status('00000000-0000-4000-8000-00000000e0c2', '00000000-0000-4000-8000-00000000e0b1', pg_temp.K(), :'j1', 1, 'active')), 'not_found', 'B2 through their own business the row does not exist');
select is(pg_temp.reason(public.request_correct('00000000-0000-4000-8000-00000000e0c2', '00000000-0000-4000-8000-00000000e0b1', pg_temp.K(), :'j1', 1, '{"summary":"x"}')), 'not_found', 'B2 correction cannot cross businesses');
select is(pg_temp.reason(public.request_set_confirmation('00000000-0000-4000-8000-00000000e0c2', '00000000-0000-4000-8000-00000000e0b1', pg_temp.K(), :'j1', 1, 'staff', true)), 'not_found', 'B2 confirmation cannot cross businesses');
select is(pg_temp.reason(public.request_convert_enquiry('00000000-0000-4000-8000-00000000e0c2', '00000000-0000-4000-8000-00000000e0b1', pg_temp.K(), :'j1', 1)), 'not_found', 'B2 conversion cannot cross businesses');
select is(pg_temp.reason(public.request_undo('00000000-0000-4000-8000-00000000e0c2', '00000000-0000-4000-8000-00000000e0b1', pg_temp.K(), (select id from public.request_activities where request_id = :'j1' limit 1))), 'not_found', 'B2 undo cannot cross businesses');
select is(pg_temp.reason(pg_temp.mk('job', jsonb_build_object('customer_id', (select customer_id from public.customer_requests where id = :'j1'), 'customer_name', 'x'))) is null, true, 'B2 a member can reuse their own customer');

-- B4: every allowed move, for all three kinds, through one workflow.
select is(pg_temp.st(:'j1', 'active') ->> 'status', 'active', 'B4 job waiting to active');
select is(pg_temp.st(:'j1', 'ready') ->> 'status', 'ready', 'B4 job active to ready');
select is(pg_temp.st(:'j1', 'active') ->> 'status', 'active', 'B4 job ready back to active');
select is(pg_temp.st(:'j1', 'closed', 'completed') ->> 'outcome', 'completed', 'B4 job active to completed, no Ready step needed');
select is((select count(*)::int from public.request_activities where request_id = :'j1' and to_status = 'ready'), 1, 'B4 only the stated Ready exists');
select pg_temp.rid(pg_temp.mk('job', '{"initial_status":"active"}')) as j2 \gset
select is(pg_temp.status(:'j2'), 'active', 'B4 a job can start as here');
select pg_temp.rid(pg_temp.mk('enquiry')) as e1 \gset
select is(pg_temp.status(:'e1'), 'new', 'B4 an enquiry starts new');
select is(pg_temp.st(:'e1', 'contacted') ->> 'status', 'contacted', 'B4 enquiry new to contacted');
select is(pg_temp.st(:'e1', 'closed', 'lost', true) ->> 'outcome', 'lost', 'B4 enquiry to lost when acknowledged');
select pg_temp.rid(pg_temp.mk('appointment', jsonb_build_object('starts_at', now() - interval '1 hour'))) as a1 \gset
select is(pg_temp.status(:'a1'), 'requested', 'B4 an appointment starts requested');
select is(pg_temp.st(:'a1', 'closed', 'attended') ->> 'outcome', 'attended', 'B4 attended after its time');
select pg_temp.rid(pg_temp.mk('appointment', jsonb_build_object('starts_at', now() - interval '1 hour'))) as a2 \gset
select is(pg_temp.st(:'a2', 'closed', 'no_show') ->> 'outcome', 'no_show', 'B4 no show after its time');
select pg_temp.rid(pg_temp.mk('appointment')) as a3 \gset
select is(pg_temp.st(:'a3', 'closed', 'cancelled', true) ->> 'outcome', 'cancelled', 'B4 appointment cancelled when acknowledged');
select is((pg_temp.st(:'a3', 'requested', null, true)) ->> 'status', 'requested', 'B4 an owner can reopen to the previous status');

-- B5: every refused move says why and writes nothing.
select pg_temp.acts() as before_acts \gset
select is(pg_temp.reason(pg_temp.st(:'j2', 'waiting')), 'not_allowed', 'B5 job active to waiting');
select pg_temp.rid(pg_temp.mk('enquiry')) as e2 \gset
select pg_temp.acts() as before_acts \gset
select is(pg_temp.reason(pg_temp.st(:'e2', 'waiting')), 'not_allowed', 'B5 enquiry cannot use a job status');
select is(pg_temp.reason(pg_temp.st(:'a1', 'waiting', null, true)), 'not_allowed', 'B5 a closed appointment cannot go to a job status');
select is(pg_temp.reason(pg_temp.st(:'e2', 'closed', 'converted', true)), 'use_convert', 'B5 converted only through conversion');
select is(pg_temp.reason(pg_temp.st(:'e2', 'closed', 'voided', true)), 'not_allowed', 'B5 voided only through undo');
select is(pg_temp.reason(pg_temp.st(:'e2', 'closed')), 'outcome_required', 'B5 closed needs an outcome');
select is(pg_temp.reason(pg_temp.st(:'e2', 'new')), 'no_change', 'B5 no change');
select is(pg_temp.reason(pg_temp.st(:'j2', 'closed', 'no_show', true)), 'not_allowed', 'B5 a job already here cannot be a no show');
select is(pg_temp.acts(), :before_acts, 'B5 refused moves wrote no activity');
select is(pg_temp.reason(pg_temp.mk('booking')), 'invalid_field', 'B5 an unknown kind is refused');
select is(pg_temp.reason(pg_temp.mk('job', '{"summary":null}')), 'invalid_field', 'B5 a request needs a summary');
select is(pg_temp.reason(pg_temp.mk('job', '{"starts_at":"not a date"}')), 'invalid_field', 'B5 a bad date is refused');
select is(pg_temp.reason(pg_temp.mk('job', jsonb_build_object('follow_up_user_id', '00000000-0000-4000-8000-00000000e0b1'))), 'invalid_field', 'B5 a follow-up owner from another business is refused');

-- B6: a skipped step needs an acknowledgement, records its flag, and invents nothing.
select pg_temp.rid(pg_temp.mk('job')) as j3 \gset
select is(pg_temp.reason(pg_temp.st(:'j3', 'ready')), 'needs_confirmation', 'B6 waiting to ready asks first');
select is(pg_temp.status(:'j3'), 'waiting', 'B6 nothing changed before the answer');
select is((pg_temp.st(:'j3', 'ready', null, true) -> 'flags') ->> 0, 'arrival_not_recorded', 'B6 the flag records what was never stated');
select is((select count(*)::int from public.request_activities where request_id = :'j3' and to_status = 'active'), 0, 'B6 no arrival event was invented');
select pg_temp.rid(pg_temp.mk('job')) as j4 \gset
select is(pg_temp.reason(pg_temp.st(:'j4', 'closed', 'completed')), 'needs_confirmation', 'B6 waiting to completed asks first');
select pg_temp.rid(pg_temp.mk('appointment', jsonb_build_object('starts_at', now() + interval '1 day'))) as a4 \gset
select is(pg_temp.reason(pg_temp.st(:'a4', 'closed', 'no_show')), 'needs_confirmation', 'B6 a no show before its time asks first');
select is(pg_temp.reason(pg_temp.st(:'a4', 'closed', 'attended')), 'needs_confirmation', 'B6 attended before its time asks first');
select pg_temp.rid(pg_temp.mk('appointment')) as a5 \gset
select is((pg_temp.st(:'a5', 'closed', 'attended', true) -> 'flags') ->> 0, 'attended_without_time', 'B6 attended with no time is flagged');

-- B7: idempotency.
select public.request_create(pg_temp.L(), pg_temp.O(), 'same-key', '{"kind":"job","summary":"Once","entry_method":"typed"}') as first_r \gset
select is(pg_temp.rid(public.request_create(pg_temp.L(), pg_temp.O(), 'same-key', '{"kind":"job","summary":"Once","entry_method":"typed"}')), pg_temp.rid(:'first_r'::jsonb), 'B7 a retry returns the first result');
select is((select count(*)::int from public.customer_requests where summary = 'Once'), 1, 'B7 only one row exists');
select is(pg_temp.reason(public.request_create(pg_temp.L(), pg_temp.O(), 'same-key', '{"kind":"job","summary":"Twice","entry_method":"typed"}')), 'key_reused', 'B7 the same key with other input is refused');
select is(pg_temp.reason(public.request_create(pg_temp.L(), pg_temp.O(), null, '{"kind":"job","summary":"x","entry_method":"typed"}')), 'invalid_key', 'B7 a key is required');

-- B8: stale versions.
select is(pg_temp.reason(public.request_set_status(pg_temp.L(), pg_temp.O(), pg_temp.K(), :'j2', 99, 'ready')), 'version_conflict', 'B8 a stale version is refused');
select is(pg_temp.reason(public.request_correct(pg_temp.L(), pg_temp.O(), pg_temp.K(), :'j2', 99, '{"summary":"x"}')), 'version_conflict', 'B8 also for corrections');

-- B9: requested, staff-confirmed and customer-confirmed are independent, in either order.
select pg_temp.rid(pg_temp.mk('appointment', jsonb_build_object('starts_at', now() + interval '2 days'))) as c1 \gset
select is((select (staff_confirmed_at is null and customer_confirmed_at is null) from public.customer_requests where id = :'c1'), true, 'B9 a new appointment is only requested');
select is(pg_temp.conf(:'c1', 'staff') ->> 'ok', 'true', 'B9 staff can confirm first');
select is((select (staff_confirmed_at is not null and customer_confirmed_at is null) from public.customer_requests where id = :'c1'), true, 'B9 staff confirmation does not imply the customer');
select is((pg_temp.conf(:'c1', 'customer') -> 'flags') @> '["recorded_by_staff"]', true, 'B9 a customer confirmation is marked as recorded by staff');
select pg_temp.rid(pg_temp.mk('appointment', jsonb_build_object('starts_at', now() + interval '2 days'))) as c2 \gset
select is(pg_temp.conf(:'c2', 'customer') ->> 'ok', 'true', 'B9 the customer can confirm first');
select is((select (customer_confirmed_at is not null and staff_confirmed_at is null) from public.customer_requests where id = :'c2'), true, 'B9 a customer confirmation does not imply staff');
select is(pg_temp.reason(pg_temp.conf(:'c2', 'customer')), 'no_change', 'B9 confirming twice is refused');
select is(pg_temp.status(:'c1'), 'requested', 'B9 confirmation never moves the status');
select is(pg_temp.reason(pg_temp.conf(:'j2', 'staff')), 'not_appointment', 'B9 only appointments can be confirmed');

-- B10: confirmations cannot be invented, need a time, and do not survive a new time.
select is(pg_temp.reason(pg_temp.mk('appointment', jsonb_build_object('customer_confirmed_at', now()))), 'unknown_field', 'B10 creation cannot set a customer confirmation');
select is(pg_temp.reason(pg_temp.mk('appointment', jsonb_build_object('staff_confirmed_at', now()))), 'unknown_field', 'B10 creation cannot set a staff confirmation');
select is(pg_temp.reason(pg_temp.fix(:'c1', jsonb_build_object('customer_confirmed_at', now()))), 'unknown_field', 'B10 correction cannot set a confirmation');
select is(pg_temp.reason(pg_temp.conf(:'a5', 'staff')), 'closed', 'B10 a closed appointment cannot be confirmed');
select pg_temp.rid(pg_temp.mk('appointment')) as c3 \gset
select is(pg_temp.reason(pg_temp.conf(:'c3', 'staff')), 'time_required', 'B10 confirming needs a time');
select (pg_temp.fix(:'c1', jsonb_build_object('starts_at', now() + interval '3 days'))) as fixed \gset
select is((:'fixed'::jsonb -> 'flags') ->> 0, 'confirmations_cleared', 'B10 a new time clears both confirmations');
select is((select (staff_confirmed_at is null and customer_confirmed_at is null) from public.customer_requests where id = :'c1'), true, 'B10 both are cleared');
select is(pg_temp.undo((:'fixed'::jsonb ->> 'activity_id')::uuid) ->> 'ok', 'true', 'B10 undo of the time change works');
select is((select (staff_confirmed_at is not null and customer_confirmed_at is not null) from public.customer_requests where id = :'c1'), true, 'B10 undo restores both confirmations');

-- B11: conversion keeps the enquiry and invents nothing.
select pg_temp.mk('enquiry', '{"origin_channel":"instagram","summary":"Asked about a trial","requested_window_text":"next week"}') as cv \gset
select pg_temp.rid(:'cv'::jsonb) as e3 \gset
select public.request_convert_enquiry(pg_temp.L(), pg_temp.O(), pg_temp.K(), :'e3', pg_temp.ver(:'e3')) as conv \gset
select pg_temp.rid(:'conv'::jsonb) as ap3 \gset
select is(pg_temp.status(:'e3'), 'closed:converted', 'B11 the enquiry closes as converted');
select is((select summary from public.customer_requests where id = :'e3'), 'Asked about a trial', 'B11 the enquiry text is kept');
select is((select count(*)::int from public.request_activities where request_id = :'e3' and type = 'created'), 1, 'B11 the original history is still there');
select is((select count(*)::int from public.request_activities where request_id = :'e3' and to_status = 'contacted'), 0, 'B11 no contacted event was invented');
select is((select from_status from public.request_activities where request_id = :'e3' and type = 'converted_out'), 'new', 'B11 it records the true status it came from');
select is(pg_temp.status(:'ap3'), 'requested', 'B11 the appointment starts requested');
select is((select (staff_confirmed_at is null and customer_confirmed_at is null) from public.customer_requests where id = :'ap3'), true, 'B11 no confirmation was invented');
select is((select converted_from_request_id from public.customer_requests where id = :'ap3'), :'e3'::uuid, 'B11 the appointment links to the enquiry');
select is((select origin_channel from public.customer_requests where id = :'ap3'), 'instagram', 'B11 the source is carried over');
select is((select requested_window_text from public.customer_requests where id = :'ap3'), 'next week', 'B11 the customer''s words are carried over');
select is(pg_temp.reason(public.request_convert_enquiry(pg_temp.L(), pg_temp.O(), pg_temp.K(), :'j2', pg_temp.ver(:'j2'))), 'not_enquiry', 'B11 only an enquiry can convert');
select is(pg_temp.reason(pg_temp.st(:'e3', 'new', null, true)), 'not_reopenable', 'B11 a conversion is reversed only by Undo');

-- B13: undo of a conversion.
select is(pg_temp.undo((:'conv'::jsonb ->> 'enquiry_activity_id')::uuid) ->> 'ok', 'true', 'B13 undo of a conversion works');
select is(pg_temp.status(:'e3'), 'new', 'B13 the enquiry returns to where it was');
select is(pg_temp.status(:'ap3'), 'closed:voided', 'B13 the appointment is voided');
select is((select converted_from_request_id from public.customer_requests where id = :'ap3'), :'e3'::uuid, 'B13 the voided appointment keeps its link');
select is(public.request_convert_enquiry(pg_temp.L(), pg_temp.O(), pg_temp.K(), :'e3', pg_temp.ver(:'e3')) ->> 'ok', 'true', 'B13 the enquiry can be converted again');

-- B12: undo.
select pg_temp.rid(pg_temp.mk('job')) as u1 \gset
select pg_temp.st(:'u1', 'active') as ua \gset
select is(pg_temp.undo((:'ua'::jsonb ->> 'activity_id')::uuid) ->> 'status', 'waiting', 'B12 undo inside the window restores the status');
select is((select count(*)::int from public.request_activities where request_id = :'u1'), 3, 'B12 history is added to, never rewritten');
select is(pg_temp.reason(pg_temp.undo((:'ua'::jsonb ->> 'activity_id')::uuid)), 'already_undone', 'B12 an activity is undone once');
select is(pg_temp.reason(pg_temp.undo((select id from public.request_activities where request_id = :'u1' and type = 'undone'))), 'not_undoable', 'B12 an undo cannot be undone');
select pg_temp.st(:'u1', 'active') as ub \gset
select pg_temp.st(:'u1', 'ready') as uc \gset
select is(pg_temp.reason(pg_temp.undo((:'ub'::jsonb ->> 'activity_id')::uuid)), 'not_latest', 'B12 only the latest effective activity');
set constraints all immediate;
alter table public.request_activities disable trigger request_activities_guard;
update public.request_activities set created_at = created_at - interval '11 minutes' where request_id = :'u1';
alter table public.request_activities enable trigger request_activities_guard;
select is(pg_temp.reason(pg_temp.undo((:'uc'::jsonb ->> 'activity_id')::uuid)), 'window_passed', 'B12 not after 10 minutes');
select pg_temp.mk('job') as cr \gset
select is(pg_temp.undo((:'cr'::jsonb ->> 'activity_id')::uuid) ->> 'outcome', 'voided', 'B12 undo of a creation voids it and keeps the row');

-- B14: staff limits.
select pg_temp.rid(pg_temp.mk('job')) as s1 \gset
select is(pg_temp.reason(pg_temp.st(:'s1', 'closed', 'cancelled', true, pg_temp.S())), 'forbidden', 'B14 staff cannot cancel');
select is(pg_temp.reason(pg_temp.fix(:'s1', '{"summary":"changed"}', pg_temp.S())), 'forbidden', 'B14 staff cannot correct core fields');
select is(pg_temp.fix(:'s1', jsonb_build_object('next_action', 'Call back', 'next_action_due_at', now() + interval '1 day', 'follow_up_user_id', pg_temp.S()), pg_temp.S()) ->> 'ok', 'true', 'B14 staff can set the follow-up');
select is((select follow_up_user_id from public.customer_requests where id = :'s1'), pg_temp.S(), 'B14 follow-up ownership is stored');
select is(pg_temp.st(:'s1', 'active', null, false, pg_temp.S()) ->> 'status', 'active', 'B14 staff can move a job');
select pg_temp.rid(pg_temp.mk('job')) as s2 \gset
select pg_temp.st(:'s2', 'closed', 'cancelled', true) as s2c \gset
select is(pg_temp.reason(pg_temp.st(:'s2', 'waiting', null, true, pg_temp.S())), 'forbidden', 'B14 staff cannot reopen');
select is(pg_temp.reason(pg_temp.undo((:'s2c'::jsonb ->> 'activity_id')::uuid, pg_temp.S())), 'forbidden', 'B14 staff cannot undo someone else''s change');

-- Attribution and external references stay as given.
select pg_temp.rid(pg_temp.mk('enquiry', '{"origin_channel":"phone","external_system":"booking_tool","external_id":"X1"}')) as x1 \gset
select is((select origin_channel || '/' || entry_method || '/' || external_system || '/' || external_id from public.customer_requests where id = :'x1'), 'phone/typed/booking_tool/X1', 'attribution and external reference are stored');
select is(pg_temp.reason(pg_temp.mk('enquiry', '{"external_system":"booking_tool","external_id":"X1"}')), 'invalid_field', 'an external reference is unique per business');

-- B16: a refused creation leaves nothing behind.
select count(*)::int as cust_before from public.customers \gset
select is(pg_temp.reason(pg_temp.mk('job', '{"customer_name":"Real Person","identifiers":[{"kind":"phone","value":"+447700900123"}]}')), 'real_data_refused', 'B16 a real number is refused');
select is((select count(*)::int from public.customers), :cust_before, 'B16 no customer was left behind');
select is((select count(*)::int from public.customers where display_name = 'Real Person'), 0, 'B16 the name was not kept');
select is(pg_temp.mk('job', '{"identifiers":[{"kind":"phone","value":"+12025550142"}]}') ->> 'ok', 'true', 'B16 a reserved fictional number is accepted');
insert into public.request_intakes (id, location_id, source, state) values ('00000000-0000-4000-8000-00000000e151', pg_temp.L(), 'typed', 'discarded');
select is(pg_temp.reason(pg_temp.mk('job', '{"customer_name":"Intake Case","intake_id":"00000000-0000-4000-8000-00000000e151"}')), 'intake_unavailable', 'B16 a used intake is refused');
select is((select count(*)::int from public.customers where display_name = 'Intake Case'), 0, 'B16 and leaves no customer');

-- B15: no personal values in audit rows, tool results or activities.
select is((select count(*)::int from public.audit_events a where a.object_type = 'customer_request' and (coalesce(a.before::text, '') || coalesce(a.after::text, '')) ~ '(Sarah|Highlights|Brakes|5550142|Asked about)'), 0, 'B15 audit rows hold no personal values');
select ok((select count(*) > 0 from public.audit_events a where a.object_type = 'customer_request' and a.location_id = pg_temp.L()), 'B15 audit rows are written');
select is((select count(*)::int from public.tool_executions t where t.result::text ~ '(Sarah|Highlights|Brakes|5550142|Asked about)'), 0, 'B15 tool results hold no personal values');
select is((select count(*)::int from public.request_activities a where to_jsonb(a)::text ~ '(Sarah|Highlights|Brakes|5550142|Asked about)'), 0, 'B15 activities hold no personal values');

-- B17: nothing trade-specific, and no dynamic SQL built from input.
select is((select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where ((n.nspname = 'public' and p.proname ~ '^request_(create|set_status|set_confirmation|correct|convert_enquiry|undo)$') or (n.nspname = 'private' and p.proname like 'rb\_%'))
              and p.prosrc ~* '(vehicle|plate|garage|mileage|salon|haircut|barber|gym)'), 0, 'B17 no trade-specific words in the workflow');
select is((select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where ((n.nspname = 'public' and p.proname ~ '^request_(create|set_status|set_confirmation|correct|convert_enquiry|undo)$') or (n.nspname = 'private' and p.proname like 'rb\_%'))
              and p.prosrc ~* '\mexecute\M'), 0, 'B17 no dynamic SQL');

select * from finish();
rollback;
