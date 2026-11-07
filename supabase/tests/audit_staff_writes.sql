-- R-123 A: every volatile SECURITY DEFINER function depending on is_staff
-- refuses a fake auditor before it can affect real or demo data.
-- The function list is catalog-driven, not a manually maintained allowlist.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();
\ir _fixtures.psql

insert into auth.users
  (instance_id, id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values ('00000000-0000-0000-0000-000000000000',
        '00000000-0000-4000-8000-0000000000c7',
        'authenticated', 'authenticated', 'audit-write-test@example.test',
        now(), '{}', '{}', now(), now());
insert into public.staff (user_id, name, role)
values ('00000000-0000-4000-8000-0000000000c7', 'Audit write test', 'auditor');
insert into private.audit_access (user_id, expires_at, created_by)
values ('00000000-0000-4000-8000-0000000000c7', now() + interval '1 day',
        '00000000-0000-4000-8000-0000000000a3');

create temp table audit_write_results (
  signature text primary key, was_refused boolean not null, error_code text, error_message text
);
grant insert, select on audit_write_results to authenticated;

select tests.act_as('00000000-0000-4000-8000-0000000000c7');
do $audit_write_checks$
declare
  f record;
  v_args text;
begin
  for f in
    select p.oid::regprocedure::text as signature, p.proname,
           p.proargtypes, p.pronargs
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosecdef
      and p.provolatile = 'v'
      and p.prosrc ilike '%is_staff%'
    order by p.oid::regprocedure::text
  loop
    select coalesce(string_agg(
      'null::' || pg_catalog.format_type(f.proargtypes[i], null),
      ', ' order by i
    ), '') into v_args
    from generate_series(0, f.pronargs - 1) i;

    begin
      execute 'select public.' || quote_ident(f.proname) || '(' || v_args || ')';
      insert into audit_write_results(signature, was_refused, error_code, error_message)
      values (f.signature, false, 'returned', 'The function returned without refusal');
    exception when others then
      insert into audit_write_results(signature, was_refused, error_code, error_message)
      values (f.signature,
              sqlstate in ('42501', 'P0001') and
                (sqlerrm ilike '%forbidden%' or sqlerrm ilike '%audit%' or
                 sqlerrm ilike '%permission denied%'),
              sqlstate, sqlerrm);
    end;
  end loop;
end;
$audit_write_checks$;
reset role;

select cmp_ok((select count(*) from audit_write_results), '>=', 30,
  'the catalog found at least thirty writable or outbound-capable staff functions');
select is(
  (select count(*) from audit_write_results where not was_refused),
  0::bigint,
  'every catalog-listed SECURITY DEFINER staff write refuses an auditor');
select is(
  (select count(*) from audit_write_results
   where was_refused and (error_message is null or error_message = '')),
  0::bigint,
  'every refusal has a server message');

select * from finish();
rollback;
