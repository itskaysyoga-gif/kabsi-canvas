-- Request book, PR A (Build decisions A1 to A11): the core tables are service-only, refuse real customer data, keep one
-- business's rows apart from another's, and leave the existing deletion job working. All data is fictional.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
select '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email, now(), '{}', '{}', now(), now()
from (values ('00000000-0000-4000-8000-00000000d0a1'::uuid, 'rb-owner-a@example.test'),
             ('00000000-0000-4000-8000-00000000d0b1'::uuid, 'rb-owner-b@example.test')) as u(id, email);
insert into public.locations (id, name, place_id) values
  ('00000000-0000-4000-8000-00000000d0c1', 'Fictional Salon', 'rb-place-a'),
  ('00000000-0000-4000-8000-00000000d0c2', 'Fictional Gym', 'rb-place-b');
insert into public.location_members (location_id, user_id, role) values
  ('00000000-0000-4000-8000-00000000d0c1', '00000000-0000-4000-8000-00000000d0a1', 'owner'),
  ('00000000-0000-4000-8000-00000000d0c2', '00000000-0000-4000-8000-00000000d0b1', 'owner');
insert into public.location_packs (location_id, pack, state) values
  ('00000000-0000-4000-8000-00000000d0c1', 'salon', 'test'), ('00000000-0000-4000-8000-00000000d0c2', 'gym', 'test');
insert into public.customers (id, location_id, display_name) values
  ('00000000-0000-4000-8000-00000000d101', '00000000-0000-4000-8000-00000000d0c1', 'Sarah Fictional'),
  ('00000000-0000-4000-8000-00000000d102', '00000000-0000-4000-8000-00000000d0c2', 'Maya Fictional');
insert into public.request_intakes (id, location_id, source) values
  ('00000000-0000-4000-8000-00000000d151', '00000000-0000-4000-8000-00000000d0c2', 'typed');
insert into public.customer_requests (id, location_id, number, kind, status, customer_id, summary, entry_method, pack, pack_version) values
  ('00000000-0000-4000-8000-00000000d201', '00000000-0000-4000-8000-00000000d0c1', 1, 'appointment', 'requested', '00000000-0000-4000-8000-00000000d101', 'Highlights', 'typed', 'salon', 1),
  ('00000000-0000-4000-8000-00000000d202', '00000000-0000-4000-8000-00000000d0c2', 1, 'enquiry', 'new', '00000000-0000-4000-8000-00000000d102', 'Trial', 'typed', 'gym', 1);
insert into public.request_activities (id, location_id, request_id, type, actor_user_id, actor_role, tool) values
  ('00000000-0000-4000-8000-00000000d301', '00000000-0000-4000-8000-00000000d0c1', '00000000-0000-4000-8000-00000000d201', 'created', '00000000-0000-4000-8000-00000000d0a1', 'owner', 'request_create');
insert into public.request_activity_values (activity_id, location_id, field, before_value, after_value) values
  ('00000000-0000-4000-8000-00000000d301', '00000000-0000-4000-8000-00000000d0c1', 'summary', '"A"', '"B"');

create temp table rb_tables (t text);
insert into rb_tables values ('location_packs'), ('customers'), ('customer_identifiers'), ('request_intakes'),
  ('customer_requests'), ('request_activities'), ('request_activity_values'), ('tool_executions');
grant select on rb_tables to anon, authenticated, service_role;

-- A1, A2, A3: exist, RLS on, service-only.
select is((select count(*)::int from rb_tables r join pg_class c on c.oid = ('public.' || r.t)::regclass where c.relrowsecurity), 8, 'A1 all eight tables exist with RLS on');
select is((select count(*)::int from pg_policies where schemaname = 'public' and tablename in (select t from rb_tables)), 0, 'A2 no policies');
select is((select count(*)::int from rb_tables r, unnest(array['anon','authenticated']) role_name, unnest(array['select','insert','update','delete']) priv
           where has_table_privilege(role_name, 'public.' || r.t, priv)), 0, 'A2 browser roles have no table privileges');
select is((select count(*)::int from rb_tables r where has_table_privilege('service_role', 'public.' || r.t, 'select')), 8, 'A3 service_role can read');
select is((select count(*)::int from rb_tables r, unnest(array['insert','update','delete','truncate']) priv
           where has_table_privilege('service_role', 'public.' || r.t, priv)), 0, 'A3 service_role cannot write');

-- A4: real customer data is refused.
select throws_ok($$insert into public.customer_identifiers (location_id, customer_id, kind, value) values ('00000000-0000-4000-8000-00000000d0c1', '00000000-0000-4000-8000-00000000d101', 'phone', '+447700900123')$$, '23514', null, 'A4 a real-looking phone is refused');
select throws_ok($$insert into public.customer_identifiers (location_id, customer_id, kind, value) values ('00000000-0000-4000-8000-00000000d0c1', '00000000-0000-4000-8000-00000000d101', 'email', 'someone@gmail.com')$$, '23514', null, 'A4 a real-looking email is refused');
select throws_ok($$insert into public.customer_identifiers (location_id, customer_id, kind, value) values ('00000000-0000-4000-8000-00000000d0c1', '00000000-0000-4000-8000-00000000d101', 'external', 'abc123')$$, '23514', null, 'A4 an external id is refused in test mode');
select lives_ok($$insert into public.customer_identifiers (location_id, customer_id, kind, value) values ('00000000-0000-4000-8000-00000000d0c1', '00000000-0000-4000-8000-00000000d101', 'phone', '+12025550142')$$, 'A4 a reserved fictional phone is accepted');
select lives_ok($$insert into public.customer_identifiers (location_id, customer_id, kind, value) values ('00000000-0000-4000-8000-00000000d0c1', '00000000-0000-4000-8000-00000000d101', 'email', 'sarah@example.com')$$, 'A4 a reserved fictional email is accepted');
select throws_ok($$update public.customer_identifiers set value = '+447700900123' where kind = 'phone' and value = '+12025550142'$$, '23514', null, 'A4 a fictional phone cannot be updated to a real one');

-- A5: real data and live state are impossible for now.
select throws_ok($$update public.location_packs set real_data_allowed = true where pack = 'salon'$$, '23514', null, 'A5 real_data_allowed cannot be true');
select throws_ok($$update public.location_packs set state = 'on' where pack = 'salon'$$, '23514', null, 'A5 state cannot be on');

-- A6: no reference across businesses.
select throws_ok($$insert into public.customer_requests (location_id, number, kind, status, customer_id, summary, entry_method, pack, pack_version) values ('00000000-0000-4000-8000-00000000d0c1', 9, 'enquiry', 'new', '00000000-0000-4000-8000-00000000d102', 'x', 'typed', 'salon', 1)$$, '23503', null, 'A6 another business''s customer is refused');
select throws_ok($$insert into public.customer_requests (location_id, number, kind, status, customer_id, summary, entry_method, pack, pack_version, intake_id) values ('00000000-0000-4000-8000-00000000d0c1', 9, 'enquiry', 'new', '00000000-0000-4000-8000-00000000d101', 'x', 'typed', 'salon', 1, '00000000-0000-4000-8000-00000000d151')$$, '23503', null, 'A6 another business''s intake is refused');
select throws_ok($$insert into public.customer_requests (location_id, number, kind, status, customer_id, summary, entry_method, pack, pack_version, converted_from_request_id) values ('00000000-0000-4000-8000-00000000d0c1', 9, 'appointment', 'requested', '00000000-0000-4000-8000-00000000d101', 'x', 'typed', 'salon', 1, '00000000-0000-4000-8000-00000000d202')$$, '23503', null, 'A6 another business''s enquiry is refused');
select throws_ok($$insert into public.request_activities (location_id, request_id, type, actor_user_id, actor_role, tool) values ('00000000-0000-4000-8000-00000000d0c1', '00000000-0000-4000-8000-00000000d202', 'created', '00000000-0000-4000-8000-00000000d0a1', 'owner', 'x_tool')$$, '23503', null, 'A6 an activity cannot reach another business''s request');

-- A7: append only.
select throws_ok($$update public.request_activities set tool = 'other_tool' where id = '00000000-0000-4000-8000-00000000d301'$$, '42501', null, 'A7 an activity cannot be updated');
select throws_ok($$delete from public.request_activities where id = '00000000-0000-4000-8000-00000000d301'$$, '42501', null, 'A7 an activity cannot be deleted while its request exists');
select throws_ok($$update public.request_activity_values set after_value = '"C"' where activity_id = '00000000-0000-4000-8000-00000000d301'$$, '42501', null, 'A7 a value cannot be changed');
select throws_ok($$delete from public.request_activity_values where activity_id = '00000000-0000-4000-8000-00000000d301'$$, '42501', null, 'A7 a value cannot be deleted');
select lives_ok($$update public.request_activity_values set before_value = null, after_value = null, cleared_at = now() where activity_id = '00000000-0000-4000-8000-00000000d301'$$, 'A7 a value can be cleared');

-- A8: only valid combinations per kind.
create function pg_temp.bad(p_set text) returns text language sql as $f$
  select format('update public.customer_requests set %s where id = %L', p_set, '00000000-0000-4000-8000-00000000d201') $f$;
select throws_ok(pg_temp.bad($$status = 'waiting'$$), '23514', null, 'A8 an appointment cannot use a job status');
select throws_ok(pg_temp.bad($$status = 'closed'$$), '23514', null, 'A8 closed needs an outcome');
select throws_ok(pg_temp.bad($$status = 'closed', closed_at = now(), outcome = 'converted'$$), '23514', null, 'A8 an appointment cannot close as converted');
select throws_ok(pg_temp.bad($$staff_confirmed_at = now(), staff_confirmed_by = '00000000-0000-4000-8000-00000000d0a1'$$), '23514', null, 'A8 confirming needs a time');
select throws_ok(pg_temp.bad($$starts_at = now(), customer_confirmed_at = now()$$), '23514', null, 'A8 a customer confirmation records who entered it');
select throws_ok(pg_temp.bad($$starts_at = now(), ends_at = now() - interval '1 hour'$$), '23514', null, 'A8 the end cannot be before the start');
select throws_ok(pg_temp.bad($$external_system = 'booking_tool'$$), '23514', null, 'A8 an external reference needs both parts');
select throws_ok($$update public.customer_requests set starts_at = now(), staff_confirmed_at = now(), staff_confirmed_by = '00000000-0000-4000-8000-00000000d0a1' where id = '00000000-0000-4000-8000-00000000d202'$$, '23514', null, 'A8 only an appointment can be confirmed');

-- A10: nothing trade-specific in the shared columns. No column can claim an external booking or a checked diary.
select is((select count(*)::int from information_schema.columns c join rb_tables r on r.t = c.table_name
           where c.table_schema = 'public' and c.column_name ~* '(vehicle|plate|garage|mileage|salon|haircut|gym|membership)'), 0, 'A10 no trade-specific column');
select is((select count(*)::int from information_schema.columns c join rb_tables r on r.t = c.table_name
           where c.table_schema = 'public' and c.column_name ~* '(availab|verified|booked|calendar)'), 0, 'A10 no column can claim availability or an external booking');

-- A11: a follow-up owner must belong to the business, and losing membership only clears the field.
select throws_ok($$update public.customer_requests set follow_up_user_id = '00000000-0000-4000-8000-00000000d0b1' where id = '00000000-0000-4000-8000-00000000d201'$$, '23503', null, 'A11 a follow-up owner from another business is refused');
select lives_ok($$update public.customer_requests set follow_up_user_id = '00000000-0000-4000-8000-00000000d0a1' where id = '00000000-0000-4000-8000-00000000d201'$$, 'A11 a member can own the follow-up');

-- A9: deleting a business removes everything of its own, and only its own. Last, because it removes the fixtures.
select lives_ok($$delete from public.locations where id = '00000000-0000-4000-8000-00000000d0c1'$$, 'A9 deleting a business does not fail');
select is((select count(*)::int from public.customer_requests where location_id = '00000000-0000-4000-8000-00000000d0c1')
        + (select count(*)::int from public.customers where location_id = '00000000-0000-4000-8000-00000000d0c1')
        + (select count(*)::int from public.customer_identifiers where location_id = '00000000-0000-4000-8000-00000000d0c1')
        + (select count(*)::int from public.request_activities where location_id = '00000000-0000-4000-8000-00000000d0c1')
        + (select count(*)::int from public.request_activity_values where location_id = '00000000-0000-4000-8000-00000000d0c1')
        + (select count(*)::int from public.location_packs where location_id = '00000000-0000-4000-8000-00000000d0c1'), 0, 'A9 all of its rows are gone');
select is((select count(*)::int from public.customer_requests where location_id = '00000000-0000-4000-8000-00000000d0c2'), 1, 'A9 another business is untouched');

select * from finish();
rollback;
