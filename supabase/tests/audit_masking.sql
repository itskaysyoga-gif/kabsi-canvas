-- R-123 B. The dedicated audit reader returns aggregates without PII.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();
\ir _fixtures.psql

select is(
  private.audit_mask_json('{"email":"alice@example.test","phone":"+44 7123 456789","name":"Alice Person","address":"12 Example Lane"}'::jsonb)->>'email',
  '[hidden]', 'the database masks an email before returning a staff read');

select is(
  private.audit_mask_json('{"name":"Alice Person","reviewer":{"name":"Bob Person","phone":"+44 7123 456789"}}'::jsonb)#>>'{reviewer,name}',
  '[hidden]', 'nested personal names are masked by the database');

select is(
  private.audit_mask_json('{"category":"Hair salon","count":12,"status":"active","address":"12 Example Lane"}'::jsonb)->>'category',
  'Hair salon', 'business categories remain readable');

select is(
  (private.audit_mask_json('{"category":"Hair salon","count":12,"status":"active"}'::jsonb)->>'count')::integer,
  12, 'counts stay real');

select is(
  private.audit_mask_json('{"count":12,"phone":447712345678,"account_id":12345}'::jsonb)->>'phone',
  '[hidden]', 'numeric phone numbers are not mistaken for safe counts');

select is(
  private.audit_mask_json('{"count":12,"phone":447712345678,"account_id":12345}'::jsonb)->>'account_id',
  '[hidden]', 'numeric account identifiers stay private');

select is(
  private.audit_mask_json('[447712345678]'::jsonb)->>0,
  '[hidden]', 'numeric scalars inside arrays are also masked');

select is(
  private.audit_mask_json('{"is_private":true}'::jsonb)->>'is_private',
  '[hidden]', 'unknown boolean flags are not revealed');

select ok(
  not has_function_privilege('anon','public.audit_staff_overview()','execute'),
  'unauthenticated callers cannot reach audit reads');

insert into auth.users
  (instance_id, id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values ('00000000-0000-0000-0000-000000000000',
        '00000000-0000-4000-8000-0000000000c6',
        'authenticated', 'authenticated', 'audit-read-test@example.test',
        now(), '{}', '{}', now(), now());

insert into public.staff (user_id, name, role)
values ('00000000-0000-4000-8000-0000000000c6', 'Audit read test', 'auditor');
insert into private.audit_access (user_id, expires_at, created_by)
values ('00000000-0000-4000-8000-0000000000c6', now()+interval '1 day',
        '00000000-0000-4000-8000-0000000000a3');

select tests.act_as('00000000-0000-4000-8000-0000000000c6');
select ok(
  coalesce((public.audit_staff_overview()->>'locations')::integer,0) >= 1,
  'a permitted auditor reads actual location counts through a masked RPC');
select ok(
  not public.is_staff(),
  'the masked read does not grant raw staff table permissions');
reset role;

select * from finish();
rollback;
