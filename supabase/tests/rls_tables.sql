-- P0.1-07: no persona can read another business's or partner's rows, in any table in public (K-42, K-54, G-17).
-- Generated from the catalog: a new table is covered by default, and fails until it has a victim fixture or no grant.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

\ir _fixtures.psql

-- Catalog rules.
select is(
  (select coalesce(array_agg(c.relname::text order by c.relname), '{}') from pg_class c
   where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'p') and not c.relrowsecurity),
  '{}'::text[],
  'every table in public has row level security on');

select is(
  (select coalesce(array_agg(p.tablename || '.' || p.policyname order by 1), '{}') from pg_policies p
   where p.schemaname = 'public'
     and p.roles && array['public', 'anon', 'authenticated']::name[]
     and (p.qual is null and p.cmd in ('SELECT', 'ALL') or btrim(p.qual, '() ') = 'true'
          or btrim(coalesce(p.with_check, ''), '() ') = 'true')),
  '{}'::text[],
  'no policy for anon or authenticated lets every row through (using true)');

select is(
  (select coalesce(array_agg(c.relname::text order by c.relname), '{}') from pg_class c
   where c.relnamespace = 'public'::regnamespace and c.relkind in ('v', 'm')
     and (has_table_privilege('anon', c.oid, 'select') or has_table_privilege('authenticated', c.oid, 'select'))
     and not coalesce('security_invoker=true' = any (c.reloptions), false)),
  '{}'::text[],
  'no view in public that bypasses row level security is readable by anon or authenticated');

select is(
  (select coalesce(array_agg(v.tbl order by v.tbl), '{}') from tests.victim_rows v
   where cardinality(v.ctids) = 0
     and (has_table_privilege('anon', ('public.' || quote_ident(v.tbl))::regclass, 'select')
          or has_table_privilege('authenticated', ('public.' || quote_ident(v.tbl))::regclass, 'select'))),
  '{}'::text[],
  'every table anon or authenticated can read has a victim row in _fixtures.psql');

-- Per table, per persona: select count(*) of the victim's rows is 0.
select tests.act_as('anon');
select is(tests.visible_victim_rows(tbl), 0::bigint, 'anon sees no rows of ' || tbl) from tests.victim_rows order by tbl;
reset role;

select tests.act_as('00000000-0000-4000-8000-0000000000b1');
select is(tests.visible_victim_rows(tbl), 0::bigint, 'a stranger sees no rows of ' || tbl) from tests.victim_rows order by tbl;
reset role;

select tests.act_as('00000000-0000-4000-8000-0000000000b2');
select is(tests.visible_victim_rows(tbl), 0::bigint, 'the owner of another business sees no rows of ' || tbl) from tests.victim_rows order by tbl;
reset role;

select tests.act_as('00000000-0000-4000-8000-0000000000b3');
select is(tests.visible_victim_rows(tbl), 0::bigint, 'a member of another partner sees no rows of ' || tbl) from tests.victim_rows order by tbl;
reset role;

-- The fixtures are readable by their own side, so a zero above means the policy refused, not that the data is missing.
select tests.act_as('00000000-0000-4000-8000-0000000000a1');
select ok(tests.visible_victim_rows('locations') = 1 and tests.visible_victim_rows('reviews') = 1,
  'control: the victim owner sees their own business and review');
reset role;
select tests.act_as('00000000-0000-4000-8000-0000000000a1');
select ok(tests.visible_victim_rows('organizations') = 1 and tests.visible_victim_rows('organization_members') = 1
  and tests.visible_victim_rows('google_connections') = 1 and tests.visible_victim_rows('partner_clients') = 1
  and tests.visible_victim_rows('subscriptions') = 1,
  'control: the victim owner sees their organisation, membership, Google connection, partner link and subscription');
reset role;
select tests.act_as('00000000-0000-4000-8000-0000000000a2');
select ok(tests.visible_victim_rows('partners') = 1 and tests.visible_victim_rows('partner_invoices') = 1,
  'control: the victim partner member sees their own partner and invoice');
select ok(tests.visible_victim_rows('organizations') = 1 and tests.visible_victim_rows('partner_clients') = 1
  and tests.visible_victim_rows('subscriptions') = 0 and tests.visible_victim_rows('google_connections') = 0,
  'control: the victim partner member sees their partner organisation and client link, not the client''s billing or connection');
reset role;

select * from finish();
rollback;
