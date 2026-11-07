-- R-123. FINAL ACCOUNT DELETION FOR THE OPERATOR ONLY.
-- Review and run by Rashid after 14 Nov 2026, 23:59 UTC.
-- This file is never applied as an automated migration.
-- Before execution, verify no non-demo memberships or other staff role exist.

begin;

create temporary table audit_cleanup_target on commit drop as
select u.id from auth.users u
where u.email = 'chatgpt-audit@kabsi.co'
  and exists (select 1 from private.audit_access a where a.user_id = u.id);

do $$
declare
  v_id uuid;
begin
  if now() < timestamptz '2026-11-14 23:59:00+00' then
    raise exception 'audit_access_not_expired';
  end if;

  select id into v_id from audit_cleanup_target;
  if v_id is null then
    raise exception 'audit_account_not_found_or_grant_missing';
  end if;

  if exists (
    select 1 from public.location_members m
    join public.locations l on l.id = m.location_id
    where m.user_id = v_id and not l.is_demo
  ) then
    raise exception 'non_demo_membership_found';
  end if;

  if exists (
    select 1 from public.staff s
    where s.user_id = v_id and s.role <> 'auditor'
  ) then
    raise exception 'unexpected_staff_role';
  end if;

  delete from public.location_members m
  using public.locations l
  where m.user_id = v_id and m.location_id = l.id and l.is_demo;

  delete from public.organization_members m
  using public.organizations o
  where m.organization_id = o.id and o.is_demo and m.user_id = v_id;

  delete from public.staff where user_id = v_id and role = 'auditor';
  delete from private.audit_access where user_id = v_id;
  delete from auth.users where id = v_id;
end;
$$;

select
  (select count(*) from auth.users where id in (select id from audit_cleanup_target)) as auth_users_remaining,
  (select count(*) from public.staff where user_id in (select id from audit_cleanup_target)) as staff_rows_remaining,
  (select count(*) from private.audit_access where user_id in (select id from audit_cleanup_target)) as grants_remaining,
  (select count(*) from public.location_members where user_id in (select id from audit_cleanup_target)) as location_owner_rows_remaining,
  (select count(*) from public.organization_members where user_id in (select id from audit_cleanup_target)) as org_owner_rows_remaining;

-- Expected: all five counts are 0. If not, ROLLBACK instead of COMMIT.
commit;
