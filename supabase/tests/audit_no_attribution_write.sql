-- R-123 G. Automatic attribution is a write and must fail for every auditor.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();
\ir _fixtures.psql

insert into auth.users
 (instance_id, id, aud, role, email, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values (
 '00000000-0000-0000-0000-000000000000',
 '00000000-0000-4000-8000-0000000000c5',
 'authenticated', 'authenticated', 'audit-attribution-qa@example.test',
 now(), '{}', '{}', now(), now()
);
insert into public.staff (user_id, name, role)
values ('00000000-0000-4000-8000-0000000000c5', 'Audit attribution test', 'auditor');

select tests.act_as('00000000-0000-4000-8000-0000000000c5');
select throws_ok(
  $$ select public.save_signup_attribution('{"via":"QAT123"}'::jsonb) $$,
  '42501', 'This access is read-only.',
  'automatic signup attribution refuses the auditor before any insert');
reset role;

select is(
  (select count(*) from public.signup_attribution
   where user_id='00000000-0000-4000-8000-0000000000c5'), 0::bigint,
  'the auditor has no attribution rows');
select * from finish();
rollback;
