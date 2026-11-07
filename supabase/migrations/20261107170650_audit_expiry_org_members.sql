-- R-123 E: clear both levels of demo ownership on expiry.
-- This new migration updates the scheduled routine without changing its clock.
create or replace function private.expire_audit_access()
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_auditor uuid;
begin
  if clock_timestamp() < timestamptz '2026-11-14 23:59:00+00' then
    return;
  end if;
  select a.user_id into v_auditor
  from private.audit_access a join auth.users u on u.id = a.user_id
  where u.email = 'chatgpt-audit@kabsi.co'
    and a.expires_at <= clock_timestamp();
  if v_auditor is null then return; end if;

  delete from public.location_members m
  using public.locations l
  where m.location_id = l.id
    and l.is_demo
    and m.user_id = v_auditor;

  delete from public.organization_members m
  using public.organizations o
  where m.organization_id = o.id
    and o.is_demo
    and m.user_id = v_auditor;

  delete from public.staff
  where user_id = v_auditor and role = 'auditor';

  update auth.users
  set banned_until = timestamptz '2126-11-15 00:00:00+00'
  where id = v_auditor;
end;
$$;
revoke all on function private.expire_audit_access() from public, anon, authenticated;
