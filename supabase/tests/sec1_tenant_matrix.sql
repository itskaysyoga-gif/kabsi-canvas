-- Sec 1 (master plan 25.7, 30.15 section 8): tenant isolation across roles. Two businesses with two accounts each:
-- LA (owner A ..a1, manager ..a4) and LB (owner B ..b2, manager ..b4, staff ..b5), plus Kabsi staff (admin ..a3 and an
-- installer ..b6) and the outsiders of _fixtures.psql. rls_tables.sql and rls_functions.sql prove the outsiders; this
-- file proves that a role in one business gives nothing in the other, and that Kabsi staff, who read every business for
-- support, still cannot act for an owner. The service role is out of reach of the browser roles.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

\ir _fixtures.psql

insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
select '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email, now(), '{}', '{}', now(), now()
from (values
  ('00000000-0000-4000-8000-0000000000a4'::uuid, 'victim-manager@example.test'),
  ('00000000-0000-4000-8000-0000000000b4'::uuid, 'other-manager@example.test'),
  ('00000000-0000-4000-8000-0000000000b5'::uuid, 'other-staff@example.test'),
  ('00000000-0000-4000-8000-0000000000b6'::uuid, 'kabsi-installer@example.test')
) as u(id, email);
insert into public.location_members (location_id, user_id, role) values
  ('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000a4', 'manager'),
  ('00000000-0000-4000-8000-0000000000c2', '00000000-0000-4000-8000-0000000000b4', 'manager'),
  ('00000000-0000-4000-8000-0000000000c2', '00000000-0000-4000-8000-0000000000b5', 'staff');
insert into public.staff (user_id, name, role) values ('00000000-0000-4000-8000-0000000000b6', 'Kabsi Installer', 'installer');
-- The victim fact that _victim_calls.psql acts on.
insert into public.knowledge_facts (id, location_id, slot, key, value, status, source)
values ('00000000-0000-4000-8000-0000000000fd', '00000000-0000-4000-8000-0000000000c1', 'card.parking', 'parking',
        '{"text": "Victim parking"}', 'needs_confirmation', 'website');

create temp table victim_orgs as
  select (select organization_id from public.locations where id = '00000000-0000-4000-8000-0000000000c1') as owner_org;
grant select on victim_orgs to authenticated;

create temp table victim_before as
  select (select md5(l::text) from public.locations l where l.id = '00000000-0000-4000-8000-0000000000c1') as loc,
         (select md5(r::text) from public.reviews r where r.id = '00000000-0000-4000-8000-0000000000e1') as review,
         (select md5(string_agg(m::text, ',' order by m.user_id)) from public.location_members m
           where m.location_id = '00000000-0000-4000-8000-0000000000c1') as members;

-- 1. The browser roles write no table directly (D206): every write goes through an RPC or an Edge Function. RLS does
-- not cover TRUNCATE, so no API role may hold it either.
select is(
  (select coalesce(array_agg(distinct g.table_name::text || ':' || g.grantee || ':' || g.privilege_type), '{}')
     from information_schema.role_table_grants g
    where g.table_schema = 'public' and g.grantee in ('anon', 'authenticated')
      and g.privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE')),
  '{}'::text[], 'anon and authenticated hold no INSERT, UPDATE, DELETE or TRUNCATE on any table in public');
select is(
  (select coalesce(array_agg(p.tablename || '.' || p.policyname order by 1), '{}') from pg_policies p
    where p.schemaname = 'public' and p.cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
      and p.roles && array['public', 'anon', 'authenticated']::name[]),
  '{}'::text[], 'no write policy in public for anon or authenticated');

-- 2. Every SECURITY DEFINER function pins its search_path (a caller cannot plant a lookalike object).
select is(
  (select coalesce(array_agg(p.oid::regprocedure::text order by 1), '{}') from pg_proc p
    where p.prosecdef and p.pronamespace in ('public'::regnamespace, 'private'::regnamespace)
      and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%')),
  '{}'::text[], 'every SECURITY DEFINER function in public and private sets its search_path');

-- 3. The service role is out of reach: the API roles cannot become it, and nothing grants its rights to them.
select ok(not pg_has_role('anon', 'service_role', 'member') and not pg_has_role('authenticated', 'service_role', 'member'),
  'anon and authenticated are not members of service_role');
select ok(not pg_has_role('authenticated', 'postgres', 'member') and not pg_has_role('anon', 'postgres', 'member'),
  'anon and authenticated are not members of postgres');
select is(
  (select coalesce(array_agg(c.relname::text order by 1), '{}') from pg_class c
    where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'p')
      and pg_get_userbyid(c.relowner) in ('anon', 'authenticated')),
  '{}'::text[], 'no table in public is owned by a browser role');

-- 4. Tables: a manager and a staff member of the other business see no row of the victim's, in any table.
select tests.act_as('00000000-0000-4000-8000-0000000000b4');
select is(tests.visible_victim_rows(tbl), 0::bigint, 'the manager of another business sees no rows of ' || tbl) from tests.victim_rows order by tbl;
reset role;
select tests.act_as('00000000-0000-4000-8000-0000000000b5');
select is(tests.visible_victim_rows(tbl), 0::bigint, 'staff of another business see no rows of ' || tbl) from tests.victim_rows order by tbl;
reset role;
-- Control: the victim's own manager does see the business, so the zeros above are the policy refusing.
select tests.act_as('00000000-0000-4000-8000-0000000000a4');
select ok(tests.visible_victim_rows('locations') = 1 and tests.visible_victim_rows('reviews') = 1,
  'control: the victim''s manager sees their own business and review');
reset role;
-- The other way round: the victim's manager sees nothing of LB.
select tests.act_as('00000000-0000-4000-8000-0000000000a4');
select is((select count(*) from public.locations where id = '00000000-0000-4000-8000-0000000000c2'), 0::bigint,
  'the victim''s manager does not see the other business');
select is((select count(*) from public.location_members where location_id = '00000000-0000-4000-8000-0000000000c2'), 0::bigint,
  'the victim''s manager does not see the other business''s team');
reset role;

-- 5. Every owner RPC on the victim's business refuses each role of the other business.
select tests.act_as('00000000-0000-4000-8000-0000000000b2');
\ir _victim_calls.psql
reset role;
select tests.act_as('00000000-0000-4000-8000-0000000000b4');
\ir _victim_calls.psql
reset role;
select tests.act_as('00000000-0000-4000-8000-0000000000b5');
\ir _victim_calls.psql
reset role;

-- 6. Kabsi staff (admin and installer) are not members: they read for support and installers activate cards, but
-- they cannot act for the owner (approve, invite, change roles, save facts, disconnect, delete).
\set kabsi_staff 1
select tests.act_as('00000000-0000-4000-8000-0000000000a3');
\ir _victim_calls.psql
reset role;
select tests.act_as('00000000-0000-4000-8000-0000000000b6');
\ir _victim_calls.psql
reset role;
\unset kabsi_staff

-- 7. Membership answers about the caller only.
select tests.act_as('00000000-0000-4000-8000-0000000000b4');
select is(public.is_member('00000000-0000-4000-8000-0000000000c1'), false, 'is_member: the other business''s manager is not a member of LA');
select is(public.is_member('00000000-0000-4000-8000-0000000000c2'), true, 'control: is_member is true for their own business');
select is(public.has_location_role('00000000-0000-4000-8000-0000000000c1', array['owner', 'manager', 'staff']), false,
  'has_location_role: no role in LA for the other business''s manager');
reset role;

select is(
  (select row(
     (select md5(l::text) from public.locations l where l.id = '00000000-0000-4000-8000-0000000000c1'),
     (select md5(r::text) from public.reviews r where r.id = '00000000-0000-4000-8000-0000000000e1'),
     (select md5(string_agg(m::text, ',' order by m.user_id)) from public.location_members m
       where m.location_id = '00000000-0000-4000-8000-0000000000c1'))::text),
  (select row(loc, review, members)::text from victim_before),
  'the victim business, its review and its team are unchanged after every call');

select * from finish();
rollback;
