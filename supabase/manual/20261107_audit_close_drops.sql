-- R-125 (7 Nov 2026): the ChatGPT audit account of R-123 is cancelled before use.
-- Run by Rashid in the Supabase SQL editor, once, as the whole file.
-- It removes every live object the R-123 audit work added, and clears one password.
--
-- Already done and not repeated here: migration audit_close_restore_attribution put
-- public.save_signup_attribution back to its definition on main (no auditor block).
--
-- Everything down to COMMIT is one transaction. If any step or check fails, nothing is
-- changed: read the error and tell lane R. The last statement is a read-back; its expected
-- values are written above it.
--
-- Left alone on purpose: the schema-wide "audit" functions of the audit log
-- (private.audit, private.audit_actor, private.audit_request, the private.audit_*
-- triggers) and the table public.audit_events. They belong to the audit log of P0.1-10,
-- not to R-123.

begin;

-- 1. The expiry job ---------------------------------------------------------------------
select cron.unschedule(jobid) from cron.job where jobname = 'kabsi_audit_expiry';

-- 2. The audit functions and the grant table --------------------------------------------
drop function if exists public.audit_login_allowed();
drop function if exists public.audit_staff_overview();
drop function if exists private.expire_audit_access();
drop function if exists private.audit_mask_json(jsonb);
drop function if exists private.is_auditor();
drop table if exists private.audit_access;

-- 3. The auditor staff role -------------------------------------------------------------
-- staff.role is a text column with a check constraint (staff_role_check), not an enum, so
-- 'auditor' is removed from the check. The row goes first or the constraint would refuse.
delete from public.staff where role = 'auditor';
alter table public.staff drop constraint if exists staff_role_check;
alter table public.staff
  add constraint staff_role_check check (role in ('admin', 'installer'));

-- 4. The Auth user of the audit account -------------------------------------------------
-- Found by its address. It was never a member of a real business (checked 7 Nov: no
-- location or organisation membership at all), so a membership found now stops the file.
do $$
declare
  v_id uuid;
begin
  select id into v_id from auth.users where email = 'chatgpt-audit@kabsi.co';
  if v_id is null then
    return; -- already gone
  end if;
  if exists (select 1 from public.location_members where user_id = v_id)
     or exists (select 1 from public.organization_members where user_id = v_id) then
    raise exception 'audit_account_has_memberships_review_before_deleting';
  end if;
  delete from auth.users where id = v_id; -- sessions, identities and staff rows go with it
end;
$$;

-- =========================================================================================
-- SEPARATE BLOCK: clear the operator account's password.
-- Kabsi has no password sign-in. The operator account signs in with Google or an emailed
-- code, so its password (set only so the audit login could be tested) has no use.
-- Found by role, not by address: the one account that is a staff admin AND an owner of a
-- real (not demo) business. It stops the file if that is not exactly one account.
-- To keep the password, delete from this banner to the next one before running.
--
-- The QA demo owner is NOT touched here. docs/testing.md has Playwright sign in with
-- one-time codes (KABSI_QA_CODE_DEMO and the others), not with a password, and no code in
-- the repository calls a password sign-in, so nothing needs that password. It was not on
-- the list for this task, so it stays as it is.
-- =========================================================================================
do $$
declare
  v_ids uuid[];
begin
  select array_agg(u.id) into v_ids
  from auth.users u
  where coalesce(u.encrypted_password, '') <> ''
    and exists (select 1 from public.staff s where s.user_id = u.id and s.role = 'admin')
    and exists (
      select 1 from public.location_members m
      join public.locations l on l.id = m.location_id
      where m.user_id = u.id and m.role = 'owner' and not l.is_demo
    );
  if coalesce(array_length(v_ids, 1), 0) <> 1 then
    raise exception 'operator_password_account_not_exactly_one_review_before_clearing';
  end if;
  update auth.users set encrypted_password = null, updated_at = now() where id = v_ids[1];
end;
$$;
-- =========================================================================================
-- END OF THE SEPARATE BLOCK
-- =========================================================================================

-- 5. Checks inside the transaction ----------------------------------------------------------
-- Any wrong value stops the file here and nothing is committed.
do $$
begin
  if (select count(*) from cron.job where jobname ilike '%audit%' or command ~* 'audit_access|is_auditor|expire_audit_access') <> 0
     or (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
         where p.prokind in ('f', 'p') and n.nspname in ('public', 'private')
           and (p.proname in ('audit_login_allowed', 'audit_staff_overview', 'expire_audit_access', 'audit_mask_json', 'is_auditor')
                or case when p.prokind in ('f', 'p') then pg_get_functiondef(p.oid) ~* 'audit_access|is_auditor|auditor' else false end)) <> 0
     or to_regclass('private.audit_access') is not null
     or (select count(*) from pg_policies where coalesce(qual, '') || coalesce(with_check, '') ~* 'audit_access|is_auditor|auditor') <> 0
     or (select count(*) from public.staff where role = 'auditor') <> 0
     or (select count(*) from auth.users where email = 'chatgpt-audit@kabsi.co') <> 0
  then
    raise exception 'audit_close_check_failed_nothing_committed';
  end if;
end;
$$;

commit;

-- 6. Read-back (one row, run after the commit) -----------------------------------------------
-- Expected, exactly: cron_jobs 0, functions 0, tables 0, policies 0, auditor_staff_rows 0,
-- staff_role_check CHECK ((role = ANY (ARRAY['admin'::text, 'installer'::text]))),
-- audit_auth_users 0, password_accounts 1 (the QA demo owner; 2 if you removed the
-- separate block). Paste this row back to lane R.
select
  (select count(*) from cron.job where jobname ilike '%audit%' or command ~* 'audit_access|is_auditor|expire_audit_access')
    as cron_jobs,
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where p.prokind in ('f', 'p') and n.nspname in ('public', 'private')
      and (p.proname in ('audit_login_allowed', 'audit_staff_overview', 'expire_audit_access', 'audit_mask_json', 'is_auditor')
           or case when p.prokind in ('f', 'p') then pg_get_functiondef(p.oid) ~* 'audit_access|is_auditor|auditor' else false end))
    as functions,
  (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'private' and c.relname = 'audit_access') as tables,
  (select count(*) from pg_policies where coalesce(qual, '') || coalesce(with_check, '') ~* 'audit_access|is_auditor|auditor')
    as policies,
  (select count(*) from public.staff where role = 'auditor') as auditor_staff_rows,
  (select pg_get_constraintdef(oid) from pg_constraint where conname = 'staff_role_check' and conrelid = 'public.staff'::regclass)
    as staff_role_check,
  (select count(*) from auth.users where email = 'chatgpt-audit@kabsi.co') as audit_auth_users,
  (select count(*) from auth.users where coalesce(encrypted_password, '') <> '') as password_accounts;
