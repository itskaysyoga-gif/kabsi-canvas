-- R-123 part A: the auditor role is inert until the masking boundary is installed.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();
\ir _fixtures.psql

insert into auth.users
  (instance_id, id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000',
   '00000000-0000-4000-8000-0000000000c9',
   'authenticated', 'authenticated', 'audit-test@example.test',
   now(), '{}', '{}', now(), now());

insert into public.staff (user_id, name, role)
values ('00000000-0000-4000-8000-0000000000c9', 'Audit test', 'auditor');

insert into private.audit_access (user_id, expires_at, created_by)
values ('00000000-0000-4000-8000-0000000000c9', now() + interval '1 day',
        '00000000-0000-4000-8000-0000000000a3');

select ok(
  not has_schema_privilege('authenticated', 'private', 'usage')
  and not has_table_privilege('authenticated', 'private.audit_access', 'select'),
  'the audit access table is inaccessible through the browser');

select ok(
  not has_function_privilege('authenticated', 'private.is_auditor()', 'execute'),
  'the private auditor guard is not browser callable');

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000c9', true);
select ok(private.is_auditor(), 'a current permitted auditor is recognized by trusted code');
select ok(not public.is_staff(), 'an auditor does not inherit raw admin access');

select tests.act_as('00000000-0000-4000-8000-0000000000c9');
select is((select count(*) from public.locations), 0::bigint,
  'an auditor cannot read customer tables before masking is in place');
select throws_ok($$ select public.staff_outbound_approve(null::uuid) $$,
  '42501', null, 'an auditor cannot approve outbound messages');
select throws_ok($$ select public.staff_job_retry(1) $$,
  '42501', null, 'an auditor cannot retry a real job');
reset role;

update private.audit_access
set expires_at = now() - interval '1 second'
where user_id = '00000000-0000-4000-8000-0000000000c9';
select ok(not private.is_auditor(), 'an expired auditor is denied immediately');

update private.audit_access
set expires_at = now() + interval '1 day'
where user_id = '00000000-0000-4000-8000-0000000000c9';
update auth.users set banned_until = now() + interval '1 year'
where id = '00000000-0000-4000-8000-0000000000c9';
select ok(not private.is_auditor(), 'a banned auditor is denied even before the expiry date');

select * from finish();
rollback;
