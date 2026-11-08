-- Request book, RB-C1: reads, proposals and the name search key. All data is fictional.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
select '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email, now(), '{}', '{}', now(), now()
from (values ('00000000-0000-4000-8000-00000000f0a1'::uuid, 'rr-owner@example.test'),
             ('00000000-0000-4000-8000-00000000f0a2'::uuid, 'rr-staff@example.test'),
             ('00000000-0000-4000-8000-00000000f0b1'::uuid, 'rr-other@example.test'),
             ('00000000-0000-4000-8000-00000000f0d1'::uuid, 'rr-outsider@example.test')) as u(id, email);
insert into public.locations (id, name, place_id) values
  ('00000000-0000-4000-8000-00000000f0c1', 'Fictional Studio', 'rr-place-a'),
  ('00000000-0000-4000-8000-00000000f0c2', 'Fictional Workshop', 'rr-place-b');
insert into public.location_members (location_id, user_id, role) values
  ('00000000-0000-4000-8000-00000000f0c1', '00000000-0000-4000-8000-00000000f0a1', 'owner'),
  ('00000000-0000-4000-8000-00000000f0c1', '00000000-0000-4000-8000-00000000f0a2', 'staff'),
  ('00000000-0000-4000-8000-00000000f0c2', '00000000-0000-4000-8000-00000000f0b1', 'owner');
insert into public.location_packs (location_id, pack, state) values
  ('00000000-0000-4000-8000-00000000f0c1', 'pack_a', 'test'), ('00000000-0000-4000-8000-00000000f0c2', 'pack_b', 'test');
delete from public.app_settings where key = 'request_book';

create function pg_temp.L() returns uuid language sql as $$ select '00000000-0000-4000-8000-00000000f0c1'::uuid $$;
create function pg_temp.L2() returns uuid language sql as $$ select '00000000-0000-4000-8000-00000000f0c2'::uuid $$;
create function pg_temp.O() returns uuid language sql as $$ select '00000000-0000-4000-8000-00000000f0a1'::uuid $$;
create function pg_temp.S() returns uuid language sql as $$ select '00000000-0000-4000-8000-00000000f0a2'::uuid $$;
create function pg_temp.X() returns uuid language sql as $$ select '00000000-0000-4000-8000-00000000f0b1'::uuid $$;
create function pg_temp.U() returns uuid language sql as $$ select '00000000-0000-4000-8000-00000000f0d1'::uuid $$;
create function pg_temp.K() returns text language sql as $$ select gen_random_uuid()::text $$;
create function pg_temp.reason(j jsonb) returns text language sql as $$ select j ->> 'reason' $$;
create function pg_temp.rid(j jsonb) returns uuid language sql as $$ select (j ->> 'request_id')::uuid $$;
create function pg_temp.mk(p_loc uuid, p_actor uuid, p_input jsonb) returns uuid language sql as $$
  select pg_temp.rid(public.request_create(p_loc, p_actor, pg_temp.K(), jsonb_build_object('kind', 'job', 'entry_method', 'typed') || p_input)) $$;
-- Every function, called as one actor at one location; a row id that exists, so that only the gate can refuse.
create function pg_temp.all_reasons(p_loc uuid, p_actor uuid, p_intake uuid default gen_random_uuid()) returns text[] language sql as $$
  select array[
    pg_temp.reason(public.request_intake_propose(p_loc, p_actor, pg_temp.K(), 'typed', 'Fictional words', '{}')),
    pg_temp.reason(public.request_intake_revise(p_loc, p_actor, pg_temp.K(), p_intake, 'Other words', null)),
    pg_temp.reason(public.request_intake_discard(p_loc, p_actor, pg_temp.K(), p_intake)),
    pg_temp.reason(public.request_intake_get(p_loc, p_actor, p_intake)),
    pg_temp.reason(public.request_get(p_loc, p_actor, '1')),
    pg_temp.reason(public.request_find(p_loc, p_actor, '{"text":"fictional"}')),
    pg_temp.reason(public.request_list_open(p_loc, p_actor, '{}')),
    pg_temp.reason(public.customer_suggest(p_loc, p_actor, 'Fictional', null))] $$;
create function pg_temp.snapshot() returns text language sql as $$
  select md5(concat_ws('|',
    (select string_agg(to_jsonb(x)::text, ',' order by x.location_id) from public.location_packs x),
    (select string_agg(to_jsonb(x)::text, ',' order by x.id) from public.customers x),
    (select string_agg(to_jsonb(x)::text, ',' order by x.id) from public.customer_identifiers x),
    (select string_agg(to_jsonb(x)::text, ',' order by x.id) from public.request_intakes x),
    (select string_agg(to_jsonb(x)::text, ',' order by x.id) from public.customer_requests x),
    (select count(*)::text from public.request_activities),
    (select count(*)::text from public.request_activity_values),
    (select count(*)::text from public.tool_executions),
    (select count(*)::text from public.audit_events))) $$;

-- R1: the switch off returns disabled everywhere and writes nothing.
select is(pg_temp.all_reasons(pg_temp.L(), pg_temp.O()), array_fill('disabled'::text, array[8]), 'R1 every function is disabled with the switch off');
select is((select count(*)::int from public.request_intakes) + (select count(*)::int from public.tool_executions)
          + (select count(*)::int from public.audit_events where object_type = 'request_intake'), 0, 'R1 nothing was written');
insert into public.app_settings (key, value) values ('request_book', 'on');
update public.location_packs set state = 'off' where location_id = pg_temp.L();
select is(pg_temp.all_reasons(pg_temp.L(), pg_temp.O()), array_fill('disabled'::text, array[8]), 'R1 a pack in off state stays disabled');
update public.location_packs set state = 'test' where location_id = pg_temp.L();

-- R2: outsiders are refused by every function, and a refusal writes nothing.
select public.request_intake_propose(pg_temp.L(), pg_temp.O(), pg_temp.K(), 'typed', 'Fictional proposal', '{}') ->> 'intake_id' as i0 \gset
select pg_temp.snapshot() as snap_r2 \gset
select is(pg_temp.all_reasons(pg_temp.L(), pg_temp.U(), :'i0'), array_fill('not_member'::text, array[8]), 'R2 a person with no membership is refused');
select is(pg_temp.all_reasons(pg_temp.L(), null, :'i0'), array_fill('not_member'::text, array[8]), 'R2 a null actor is refused');
select is(pg_temp.all_reasons(pg_temp.L(), pg_temp.X(), :'i0'), array_fill('not_member'::text, array[8]), 'R2 another location''s member is refused');
select is(pg_temp.snapshot(), :'snap_r2', 'R2 refusals wrote nothing');
select is(pg_temp.reason(public.request_intake_get(pg_temp.L2(), pg_temp.X(), :'i0')), 'not_found', 'R2 through their own location the proposal does not exist');
select is(pg_temp.reason(public.request_intake_revise(pg_temp.L2(), pg_temp.X(), pg_temp.K(), :'i0', 'x', null)), 'not_found', 'R2 nor can it be revised');
select is(pg_temp.reason(public.request_intake_discard(pg_temp.L2(), pg_temp.X(), pg_temp.K(), :'i0')), 'not_found', 'R2 nor discarded');

-- R3: service-only, definer, empty search path; reads are STABLE; helpers belong to no API role.
select is((select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace, unnest(array['anon','authenticated']) r
            where ((n.nspname = 'public' and p.proname in ('request_intake_propose','request_intake_revise','request_intake_discard','request_intake_get','request_get','request_find','request_list_open','customer_suggest'))
                or (n.nspname = 'private' and p.proname like 'rb\_%')) and has_function_privilege(r, p.oid, 'execute')), 0, 'R3 anon and authenticated cannot run any of them');
select is((select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and p.proname in ('request_intake_propose','request_intake_revise','request_intake_discard','request_intake_get','request_get','request_find','request_list_open','customer_suggest')
              and has_function_privilege('service_role', p.oid, 'execute') and p.prosecdef and p.proconfig @> array['search_path=""']), 8, 'R3 eight service-only definer functions with an empty search path');
select is((select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and p.proname in ('request_intake_get','request_get','request_find','request_list_open','customer_suggest') and p.provolatile = 's'), 5, 'R3 the five reads are STABLE and cannot write');
select is((select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace, unnest(array['anon','authenticated','service_role']) r
            where n.nspname = 'private' and p.proname like 'rb\_%' and has_function_privilege(r, p.oid, 'execute')), 0, 'R3 no API role can call a private helper');
select is((select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where ((n.nspname = 'public' and p.proname in ('request_intake_propose','request_intake_revise','request_intake_discard','request_intake_get','request_get','request_find','request_list_open','customer_suggest'))
                or (n.nspname = 'private' and p.proname in ('rb_fold','rb_digits','rb_row','rb_customers_name_key','rb_intake_result','rb_intake_audit')))
              and p.prosrc ~* '\mexecute\M'), 0, 'R3 no dynamic SQL');
select is((select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and p.proname in ('request_intake_propose','request_intake_revise','request_intake_discard','request_intake_get','request_get','request_find','request_list_open','customer_suggest')
              and p.prosrc !~ '^\s*declare[^$]*?begin\s+g := private\.rb_gate\(p_location, p_actor\);'), 0, 'R3 every function starts with the gate');

-- R10: the name key is filled on insert and update, and follows erasure.
select pg_temp.mk(pg_temp.L(), pg_temp.O(), '{"customer_name":"  Zoë   FICTIONAL ","summary":"Colour and trim","identifiers":[{"kind":"phone","value":"+12025550142"}]}') as q1 \gset
select is((select name_key from public.customers k join public.customer_requests q on q.customer_id = k.id where q.id = :'q1'), 'zoe fictional', 'R10 name_key is filled on insert, folded and trimmed');
select is(public.request_correct(pg_temp.L(), pg_temp.O(), pg_temp.K(), :'q1', 1, '{"customer_name":"Zoë Fictional-Smith"}') ->> 'ok', 'true', 'R10 a name correction works');
select is((select name_key from public.customers k join public.customer_requests q on q.customer_id = k.id where q.id = :'q1'), 'zoe fictional-smith', 'R10 name_key follows an update');
select is(private.rb_fold(U&'\0623\064E\062D\0652\0645\064E\062F \0661\0662'), U&'\0627\062D\0645\062F 12', 'R10 Arabic digits, short vowels and hamza forms are folded');
select is(private.rb_fold('   '), null, 'R10 a blank name has no key');

-- Data: two locations with the same words and the same fictional phone.
select pg_temp.mk(pg_temp.L(), pg_temp.O(), '{"customer_name":"Omar Fictional","summary":"Colour refresh","identifiers":[{"kind":"phone","value":"+12025550143"}]}') as q2 \gset
select pg_temp.mk(pg_temp.L(), pg_temp.O(), jsonb_build_object('customer_id', (select customer_id from public.customer_requests where id = :'q2'), 'summary', 'Second visit colour')) as q3 \gset
select pg_temp.mk(pg_temp.L2(), pg_temp.X(), '{"customer_name":"Zoe Fictional","summary":"Colour and trim","identifiers":[{"kind":"phone","value":"+12025550142"}]}') as b1 \gset
select public.request_set_status(pg_temp.L(), pg_temp.O(), pg_temp.K(), :'q3', 1, 'closed', 'cancelled', true) ->> 'ok' as closed_ok \gset
select pg_temp.snapshot() as snap_reads \gset

-- R4: get by id or number, with the customer's name; never another location's row.
select is((public.request_get(pg_temp.L(), pg_temp.O(), :'q1') -> 'request' ->> 'id')::uuid, :'q1'::uuid, 'R4 get by id');
select is((public.request_get(pg_temp.L(), pg_temp.S(), (select '#' || number from public.customer_requests where id = :'q2')) -> 'request' ->> 'id')::uuid, :'q2'::uuid, 'R4 get by number, as staff');
select is(public.request_get(pg_temp.L(), pg_temp.O(), :'q1') ->> 'customer_name', 'Zoë Fictional-Smith', 'R4 get returns the customer name');
select is(pg_temp.reason(public.request_get(pg_temp.L(), pg_temp.O(), :'b1')), 'not_found', 'R4 another location''s request id is not found');
select is((public.request_get(pg_temp.L2(), pg_temp.X(), '1') -> 'request' ->> 'id')::uuid, :'b1'::uuid, 'R4 number 1 at the other location is its own row');
select is(pg_temp.reason(public.request_get(pg_temp.L(), pg_temp.O(), 'drop table x')), 'invalid_input', 'R4 anything else is refused');

-- R5: find by number, name, phone or words; open first; never another location's row.
select is(jsonb_array_length(public.request_find(pg_temp.L(), pg_temp.O(), '{"text":"colour"}') -> 'rows'), 3, 'R5 words find this location''s three rows only');
select is((public.request_find(pg_temp.L(), pg_temp.O(), '{"text":"colour"}') -> 'rows' -> 2 ->> 'request_id')::uuid, :'q3'::uuid, 'R5 the closed request comes last');
select is((select count(*)::int from jsonb_array_elements(public.request_find(pg_temp.L(), pg_temp.O(), '{"text":"colour trim"}') -> 'rows') r where (r ->> 'request_id')::uuid = :'b1'), 0, 'R5 the other location''s matching row is never returned');
select is((public.request_find(pg_temp.L(), pg_temp.O(), '{"name":"zoe"}') -> 'rows' -> 0 ->> 'request_id')::uuid, :'q1'::uuid, 'R5 a name without its accent finds it');
select is(jsonb_array_length(public.request_find(pg_temp.L(), pg_temp.O(), '{"name":"omar"}') -> 'rows'), 2, 'R5 a name finds every request of that customer');
select is((public.request_find(pg_temp.L(), pg_temp.O(), '{"phone":"(202) 555 0142"}') -> 'rows' -> 0 ->> 'request_id')::uuid, :'q1'::uuid, 'R5 a phone typed another way finds it');
select is(jsonb_array_length(public.request_find(pg_temp.L(), pg_temp.O(), '{"phone":"202 555 0142"}') -> 'rows'), 1, 'R5 the phone search stays in this location');
select is((public.request_find(pg_temp.L(), pg_temp.O(), jsonb_build_object('number', (select number from public.customer_requests where id = :'q2'))) -> 'rows' -> 0 ->> 'request_id')::uuid, :'q2'::uuid, 'R5 by number');
select is(jsonb_array_length(public.request_find(pg_temp.L(), pg_temp.O(), '{"name":"omar","text":"trim"}') -> 'rows'), 0, 'R5 every key given must match');
select is(pg_temp.reason(public.request_find(pg_temp.L(), pg_temp.O(), '{"sql":"1"}')), 'unknown_field', 'R5 an unknown key is refused');
select is(pg_temp.reason(public.request_find(pg_temp.L(), pg_temp.O(), '{"phone":"123"}')), 'invalid_field', 'R5 a phone too short to match is refused');
select is(jsonb_array_length(public.request_find(pg_temp.L(), pg_temp.O(), jsonb_build_object('text', '%'' or 1=1 --')) -> 'rows'), 0, 'R5 search text is a value, never SQL');

-- R7: suggestions with a masked phone, a request count and the last time seen.
select public.customer_suggest(pg_temp.L(), pg_temp.O(), null, '+1 202 555 0142') as sg \gset
select is(jsonb_array_length(:'sg'::jsonb -> 'candidates'), 1, 'R7 one candidate at this location for the phone');
select is(:'sg'::jsonb -> 'candidates' -> 0 ->> 'phone_hint', '***0142', 'R7 the phone is masked');
select is(:'sg'::jsonb::text ~ '5550142', false, 'R7 the full phone is never returned');
select is((:'sg'::jsonb -> 'candidates' -> 0 ->> 'request_count')::int, 1, 'R7 with its request count');
select ok(:'sg'::jsonb -> 'candidates' -> 0 ->> 'last_seen_at' is not null, 'R7 and when it was last seen');
select is(:'sg'::jsonb ->> 'suggestion_only', 'true', 'R7 it suggests and never decides');
select is((public.customer_suggest(pg_temp.L(), pg_temp.O(), 'omar', null) -> 'candidates' -> 0 ->> 'request_count')::int, 2, 'R7 a name finds the customer and counts both requests');
select is(pg_temp.snapshot(), :'snap_reads', 'R9 get, find and suggest changed no row');
select pg_temp.mk(pg_temp.L(), pg_temp.O(), '{"customer_name":"Omar Fictional","summary":"Another person, same name"}') as q4 \gset
select is(jsonb_array_length(public.customer_suggest(pg_temp.L(), pg_temp.O(), 'Omar Fictional', null) -> 'candidates'), 2, 'R7 every customer with that name is listed');
update public.customers set erased_at = now(), display_name = null where id = (select customer_id from public.customer_requests where id = :'q4');
select is(jsonb_array_length(public.customer_suggest(pg_temp.L(), pg_temp.O(), 'Omar Fictional', null) -> 'candidates'), 1, 'R7 an erased customer is not returned');
select is((select name_key from public.customers k join public.customer_requests q on q.customer_id = k.id where q.id = :'q4'), null, 'R10 erasure clears the key');
select is(pg_temp.reason(public.customer_suggest(pg_temp.L(), pg_temp.O(), 'x', '12')), 'invalid_input', 'R7 nothing usable to match is refused');
select pg_temp.snapshot() as snap_reads \gset

select is(pg_temp.snapshot(), :'snap_reads', 'R9 suggestions changed no row');

-- R6 and the limit: fifteen rows at most and a count of the rest.
select count(pg_temp.mk(pg_temp.L(), pg_temp.O(), jsonb_build_object('customer_name', 'Batch Fictional', 'summary', 'Batch item ' || g,
  'next_action', 'Call', 'next_action_due_at', now() + make_interval(days => g)))) from generate_series(1, 20) g;
select pg_temp.snapshot() as snap_reads \gset
select public.request_find(pg_temp.L(), pg_temp.O(), '{"text":"batch item"}') as bf \gset
select is(jsonb_array_length(:'bf'::jsonb -> 'rows'), 15, 'R6 at most fifteen rows');
select is((:'bf'::jsonb ->> 'more')::int, 5, 'R6 and the count of the rest');
select is(:'bf'::jsonb -> 'rows' -> 0 ->> 'summary', 'Batch item 20', 'R6 most recent first');
select is((public.customer_suggest(pg_temp.L(), pg_temp.O(), 'batch', null) ->> 'more')::int, 5, 'R6 suggestions keep the same limit');
select public.request_list_open(pg_temp.L(), pg_temp.O(), '{"kind":"job"}') as lo \gset
select is(jsonb_array_length(:'lo'::jsonb -> 'rows') + (:'lo'::jsonb ->> 'more')::int, 23, 'R6 every open job is counted, the closed one is not');
select is(jsonb_array_length(public.request_list_open(pg_temp.L(), pg_temp.O(), '{"kind":"enquiry"}') -> 'rows'), 0, 'R6 by kind');
select is((public.request_list_open(pg_temp.L(), pg_temp.O(), jsonb_build_object('due', now() + interval '3 days 1 hour')) -> 'rows' -> 0 ->> 'summary'), 'Batch item 3', 'R6 due by a time, most recent first');
select is(jsonb_array_length(public.request_list_open(pg_temp.L(), pg_temp.O(), jsonb_build_object('due', now() + interval '3 days 1 hour')) -> 'rows'), 3, 'R6 only those due by then');
select is(jsonb_array_length(public.request_list_open(pg_temp.L(), pg_temp.O(), '{"status":"waiting","kind":"job"}') -> 'rows'), 15, 'R6 by status');
select is(pg_temp.reason(public.request_list_open(pg_temp.L(), pg_temp.O(), '{"status":"closed"}')), 'invalid_field', 'R6 closed is not an open status');
select is(pg_temp.reason(public.request_list_open(pg_temp.L(), pg_temp.O(), '{"due":"soon"}')), 'invalid_field', 'R6 a bad time is refused');
select pg_temp.rid(public.request_create(pg_temp.L(), pg_temp.O(), pg_temp.K(), jsonb_build_object('kind', 'appointment', 'entry_method', 'typed', 'summary', 'Fitting', 'starts_at', now() + interval '1 day'))) as ap1 \gset
select pg_temp.rid(public.request_create(pg_temp.L(), pg_temp.O(), pg_temp.K(), jsonb_build_object('kind', 'appointment', 'entry_method', 'typed', 'summary', 'Fitting two', 'starts_at', now() + interval '1 day'))) as ap2 \gset
select public.request_set_confirmation(pg_temp.L(), pg_temp.O(), pg_temp.K(), :'ap2', 1, 'staff', true) ->> 'ok' as c1 \gset
select public.request_set_confirmation(pg_temp.L(), pg_temp.O(), pg_temp.K(), :'ap2', 2, 'customer', true) ->> 'ok' as c2 \gset
select pg_temp.snapshot() as snap_reads \gset
select is((public.request_list_open(pg_temp.L(), pg_temp.O(), '{"unconfirmed":true}') -> 'rows' -> 0 ->> 'request_id')::uuid, :'ap1'::uuid, 'R6 unconfirmed appointments');
select is(jsonb_array_length(public.request_list_open(pg_temp.L(), pg_temp.O(), '{"unconfirmed":true}') -> 'rows'), 1, 'R6 only the one not confirmed by both');
select is((public.request_list_open(pg_temp.L(), pg_temp.O(), '{"unconfirmed":false}') -> 'rows' -> 0 ->> 'request_id')::uuid, :'ap2'::uuid, 'R6 confirmed appointments');
select is((select count(*)::int from jsonb_array_elements(public.request_list_open(pg_temp.L2(), pg_temp.X(), '{}') -> 'rows')), 1, 'R6 the other location sees only its own');

-- R9: reads change no row, not even tool_executions or the audit log.
select is(pg_temp.snapshot(), :'snap_reads', 'R9 the reads above changed no row');
select public.request_intake_get(pg_temp.L(), pg_temp.O(), :'i0') ->> 'ok' as g_ok \gset
select is(pg_temp.snapshot(), :'snap_reads', 'R9 reading a proposal changes no row');

-- R8: proposals.
select public.request_intake_propose(pg_temp.L(), pg_temp.S(), 'prop-1', 'typed', 'Fictional Lina wants a trim Friday', '{"summary":{"from":"raw_text"}}', 'wamid.fictional-1') as pr \gset
select :'pr'::jsonb ->> 'intake_id' as i1 \gset
select is((select state || '/' || created_by::text from public.request_intakes where id = :'i1'), 'pending/' || pg_temp.S()::text, 'R8 a pending proposal created by the checked actor');
select is(public.request_intake_propose(pg_temp.L(), pg_temp.S(), 'prop-1', 'typed', 'Fictional Lina wants a trim Friday', '{"summary":{"from":"raw_text"}}', 'wamid.fictional-1') ->> 'intake_id', :'i1', 'R8 a replayed key returns the first result');
select is((select count(*)::int from public.request_intakes where provider_message_id = 'wamid.fictional-1'), 1, 'R8 with one row');
select is(pg_temp.reason(public.request_intake_propose(pg_temp.L(), pg_temp.S(), 'prop-1', 'typed', 'Changed words', '{}', 'wamid.fictional-1')), 'key_reused', 'R8 the same key with changed input is refused');
select is(pg_temp.reason(public.request_intake_propose(pg_temp.L(), pg_temp.O(), pg_temp.K(), 'typed', 'Again', '{}', 'wamid.fictional-1')), 'duplicate_message', 'R8 one proposal per provider message');
select is(pg_temp.reason(public.request_intake_propose(pg_temp.L(), pg_temp.O(), pg_temp.K(), 'telepathy', 'x', '{}')), 'invalid_field', 'R8 an unknown source is refused');
select is(pg_temp.reason(public.request_intake_propose(pg_temp.L(), pg_temp.O(), pg_temp.K(), 'typed', repeat('x', 8001), '{}')), 'invalid_field', 'R8 text over the limit is refused');
select is(pg_temp.reason(public.request_intake_propose(pg_temp.L(), pg_temp.O(), pg_temp.K(), 'typed', ' ', '{}')), 'invalid_input', 'R8 an empty proposal is refused');
select is(pg_temp.reason(public.request_intake_propose(pg_temp.L(), pg_temp.O(), pg_temp.K(), 'typed', 'x', '[]')), 'invalid_field', 'R8 evidence must be an object');
select is((select count(*)::int from public.request_intakes where location_id = pg_temp.L()), 2, 'R8 refused proposals wrote nothing');
select is(public.request_intake_get(pg_temp.L(), pg_temp.O(), :'i1') ->> 'raw_text', 'Fictional Lina wants a trim Friday', 'R8 get returns the words for the owner to check');

select public.request_intake_revise(pg_temp.L(), pg_temp.S(), 'rev-1', :'i1', 'Fictional Lina wants a trim Saturday', null) as rv \gset
select is(:'rv'::jsonb ->> 'ok', 'true', 'R8 the proposer can revise');
select is((select raw_text from public.request_intakes where id = :'i1'), 'Fictional Lina wants a trim Saturday', 'R8 the text is revised');
select is((select field_evidence from public.request_intakes where id = :'i1'), '{"summary":{"from":"raw_text"}}'::jsonb, 'R8 evidence not given is kept');
select is(public.request_intake_revise(pg_temp.L(), pg_temp.S(), 'rev-1', :'i1', 'Fictional Lina wants a trim Saturday', null), :'rv'::jsonb || '{"replay": true}', 'R8 a replayed revision returns the first result');
select is(pg_temp.reason(public.request_intake_revise(pg_temp.L(), pg_temp.S(), 'rev-1', :'i1', 'Something else', null)), 'key_reused', 'R8 a changed revision under the same key is refused');
select is(pg_temp.reason(public.request_intake_revise(pg_temp.L(), pg_temp.S(), pg_temp.K(), :'i1', 'Fictional Lina wants a trim Saturday', null)), 'no_change', 'R8 no change is refused');
select is(pg_temp.reason(public.request_intake_revise(pg_temp.L(), pg_temp.S(), pg_temp.K(), :'i0', 'Staff edit', null)), 'forbidden', 'R8 staff cannot revise someone else''s proposal');
select is(public.request_intake_revise(pg_temp.L(), pg_temp.O(), pg_temp.K(), :'i1', null, '{"when":{"from":"raw_text"}}') ->> 'ok', 'true', 'R8 an owner can revise it');

update public.request_intakes set expires_at = now() - interval '1 minute' where id = :'i0';
select is(pg_temp.reason(public.request_intake_revise(pg_temp.L(), pg_temp.O(), pg_temp.K(), :'i0', 'Late edit', null)), 'intake_unavailable', 'R8 an expired proposal cannot be revised');
select is(public.request_intake_get(pg_temp.L(), pg_temp.O(), :'i0') ->> 'state', 'expired', 'R8 and reads as expired');
select is(pg_temp.reason(public.request_intake_discard(pg_temp.L(), pg_temp.S(), pg_temp.K(), :'i0')), 'forbidden', 'R8 staff cannot discard someone else''s proposal');
select public.request_intake_discard(pg_temp.L(), pg_temp.S(), 'disc-1', :'i1') as dc \gset
select is(:'dc'::jsonb ->> 'state', 'discarded', 'R8 the proposer can discard');
select is(public.request_intake_discard(pg_temp.L(), pg_temp.S(), 'disc-1', :'i1') ->> 'replay', 'true', 'R8 a replayed discard returns the first result');
select is(pg_temp.reason(public.request_intake_discard(pg_temp.L(), pg_temp.S(), pg_temp.K(), :'i1')), 'intake_unavailable', 'R8 a discarded proposal cannot be discarded again');
select is(pg_temp.reason(public.request_intake_revise(pg_temp.L(), pg_temp.O(), pg_temp.K(), :'i1', 'Too late', null)), 'intake_unavailable', 'R8 a discarded proposal cannot be revised');
select is(pg_temp.reason(public.request_create(pg_temp.L(), pg_temp.O(), pg_temp.K(), jsonb_build_object('kind', 'job', 'entry_method', 'typed', 'summary', 'x', 'intake_id', :'i1'))), 'intake_unavailable', 'R8 nor saved as a request');
select public.request_intake_propose(pg_temp.L(), pg_temp.O(), pg_temp.K(), 'forward', 'Fictional forwarded words', '{}') ->> 'intake_id' as i2 \gset
select pg_temp.rid(public.request_create(pg_temp.L(), pg_temp.O(), pg_temp.K(), jsonb_build_object('kind', 'enquiry', 'entry_method', 'forward', 'summary', 'From a proposal', 'intake_id', :'i2'))) as q5 \gset
select is(public.request_intake_get(pg_temp.L(), pg_temp.O(), :'i2') ->> 'request_id', :'q5', 'R8 a saved proposal reads with its request');
select is(pg_temp.reason(public.request_intake_revise(pg_temp.L(), pg_temp.O(), pg_temp.K(), :'i2', 'After saving', null)), 'intake_unavailable', 'R8 a saved proposal cannot be revised');

-- R11: audit rows and tool results hold no name, phone or customer words.
select ok((select count(*) >= 4 from public.audit_events where object_type = 'request_intake' and location_id = pg_temp.L()), 'R11 proposals are audited');
select is((select count(*)::int from public.audit_events a where a.object_type in ('customer_request', 'request_intake')
            and (coalesce(a.before::text, '') || coalesce(a.after::text, '') || coalesce(a.object_id, '')) ~* '(lina|trim|zo|omar|colour|fictional|555014|batch|fitting|forwarded)'), 0, 'R11 audit rows hold no name, phone or customer words');
select is((select count(*)::int from public.tool_executions t where t.tool like 'request_intake%' and t.result::text ~* '(lina|trim|friday|saturday|forwarded|wamid)'), 0, 'R11 proposal tool results hold no customer words');

select * from finish();
rollback;
