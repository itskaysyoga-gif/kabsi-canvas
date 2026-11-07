-- R-123 D: the password-only gate returns one boolean and closes on expiry.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();
\ir _fixtures.psql

select ok(
  has_function_privilege('authenticated', 'public.audit_login_allowed()', 'execute')
  and not has_function_privilege('anon', 'public.audit_login_allowed()', 'execute'),
  'only a signed-in person may ask whether an audit grant exists');

insert into auth.users
  (instance_id, id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values ('00000000-0000-0000-0000-000000000000',
        '00000000-0000-4000-8000-0000000000c8',
        'authenticated', 'authenticated', 'audit-login-test@example.test',
        now(), '{}', '{}', now(), now());
insert into public.staff (user_id, name, role)
values ('00000000-0000-4000-8000-0000000000c8', 'Audit login test', 'auditor');
insert into private.audit_access (user_id, expires_at, created_by)
values ('00000000-0000-4000-8000-0000000000c8', now() + interval '1 day',
        '00000000-0000-4000-8000-0000000000a3');

select tests.act_as('00000000-0000-4000-8000-0000000000b1');
select is(public.audit_login_allowed(), false, 'a stranger has no audit grant');
reset role;

select tests.act_as('00000000-0000-4000-8000-0000000000c8');
select is(public.audit_login_allowed(), true, 'a currently authorized auditor may sign in');
reset role;
update private.audit_access set expires_at = now() - interval '1 minute'
  where user_id = '00000000-0000-4000-8000-0000000000c8';

select tests.act_as('00000000-0000-4000-8000-0000000000c8');
select is(public.audit_login_allowed(), false, 'an expired grant does not allow sign in');
reset role;

select * from finish();
rollback;
