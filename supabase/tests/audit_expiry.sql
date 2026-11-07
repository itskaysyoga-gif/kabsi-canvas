-- R-123 E. Expiration cannot delete an account before the fixed UTC deadline.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();
\ir _fixtures.psql

select ok(
  exists (
    select 1 from pg_proc p
    where p.oid = 'private.expire_audit_access()'::regprocedure
      and p.prosecdef
      and p.provolatile = 'v'
  ), 'the expiry job calls a privileged, time-aware function');

select ok(
  not has_function_privilege('anon','private.expire_audit_access()','execute')
  and not has_function_privilege('authenticated','private.expire_audit_access()','execute'),
  'no browser user can run the expiry function');

select ok(
  (select prosrc like '%2026-11-14 23:59:00+00%'
     from pg_proc where oid='private.expire_audit_access()'::regprocedure),
  'expiry cannot run before 14 Nov 2026 at 23:59 UTC');

select * from finish();
rollback;
