-- R-123 part E. UTC project timezone was confirmed before this migration.
-- The scheduled action is idempotent and requires the fixed expiry to have arrived.
create or replace function private.expire_audit_access()
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_auditor uuid;
begin
  if clock_timestamp() < timestamptz '2026-11-14 23:59:00+00' then
    return;
  end if;

  select a.user_id into v_auditor
  from private.audit_access a
  join auth.users u on u.id = a.user_id
  where u.email = 'chatgpt-audit@kabsi.co'
    and a.expires_at <= clock_timestamp();

  if v_auditor is null then
    return;
  end if;

  -- The one user only, and only demo workspace ownership.
  delete from public.location_members m
  using public.locations l
  where m.location_id = l.id
    and l.is_demo
    and m.user_id = v_auditor;

  delete from public.staff
  where user_id = v_auditor and role = 'auditor';

  -- Prevent a new Auth session after expiry. Existing JWTs remain subject
  -- to the expiring database permission guard.
  update auth.users
  set banned_until = timestamptz '2126-11-15 00:00:00+00'
  where id = v_auditor;
end;
$$;

revoke all on function private.expire_audit_access() from public, anon, authenticated;

-- pg_cron follows the database timezone, which is UTC in the Kabsi project.
-- Annual syntax is used for the single target day. The function is harmless
-- on subsequent years. The account deletion itself is left to the owner.
select cron.schedule(
  'kabsi_audit_expiry',
  '59 23 14 11 *',
  'select private.expire_audit_access()'
);
