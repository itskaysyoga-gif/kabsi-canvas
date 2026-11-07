-- R-123 part F. Manual credential retirement for Rashid.
-- Do not run automatically. Removes only unused password hashes, not users,
-- OTP access, Google sign-in or sessions. Do not print hashes or addresses.
-- The QA account signs in with a one-time code and the operator account uses
-- the normal Google or one-time code flow. Only the auditor uses a password.

begin;

create temporary table audit_password_candidates on commit drop as
select u.id,
  case
    when exists (
      select 1 from public.staff s where s.user_id=u.id and s.role='admin'
    ) and exists (
      select 1 from public.location_members m
      join public.locations l on l.id=m.location_id
      where m.user_id=u.id and m.role='owner' and not l.is_demo
    ) then 'admin_owner'
    when u.email like '%@test.local' and exists (
      select 1 from public.location_members m
      join public.locations l on l.id=m.location_id
      where m.user_id=u.id and m.role='owner' and l.is_demo
    ) then 'qa_demo_owner'
    else 'not_approved_for_retirement'
  end as account_class
from auth.users u
where coalesce(u.encrypted_password,'') <> ''
  and u.email <> 'chatgpt-audit@kabsi.co';

-- Read-back 1 (safe classifications only).
select account_class, count(*) as password_accounts
from audit_password_candidates group by account_class order by account_class;

do $$
begin
  if (select count(*) from audit_password_candidates) <> 2 or
     (select count(*) from audit_password_candidates
      where account_class='not_approved_for_retirement') <> 0 or
     (select count(*) from audit_password_candidates where account_class='admin_owner') <> 1 or
     (select count(*) from audit_password_candidates where account_class='qa_demo_owner') <> 1
  then
    raise exception 'password_inventory_changed_review_before_clearing';
  end if;

  update auth.users
  set encrypted_password=null, updated_at=now()
  where id in (select id from audit_password_candidates);
end;
$$;

-- Read-back 2. The first count must be zero, the second one.
select
  (select count(*) from auth.users u join audit_password_candidates c on c.id=u.id
   where coalesce(u.encrypted_password,'') <> '') as non_audit_passwords_remaining,
  (select count(*) from auth.users u where u.email='chatgpt-audit@kabsi.co'
   and coalesce(u.encrypted_password,'') <> '') as audit_passwords_remaining;

-- Expected: non_audit_passwords_remaining = 0, audit_passwords_remaining = 1.
-- If either result differs, ROLLBACK and investigate before doing anything else.
commit;
