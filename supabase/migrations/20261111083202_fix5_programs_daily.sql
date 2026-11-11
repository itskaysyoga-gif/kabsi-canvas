-- Fix 5 (lane R, R-158 item 2), the database part.
--
-- 1. kabsi_programs_daily failed on 11 Nov 2026 at 06:23 UTC with 'record "r" is not assigned yet'. In
--    private.programs_daily() the declared record variable r had the same name as the table alias r inside its two
--    "not exists" subqueries (partner_referrals r, owner_referrals r), so PL/pgSQL read r.organization_id as a field of
--    the unassigned record. The loop variable is renamed v_change; nothing else in the function changes (its live body
--    was read back first and matched md5 1d48bf482a46913c5b9b6515025463eb, the 20261111045557 version).
--    Every PL/pgSQL function in public and private was searched for a declared record or rowtype variable named like a
--    table alias in the same function: programs_daily was the only one (audit_review and detect_profile_changes matched
--    the search but use no such alias; read on 11 Nov 2026).
-- 2. A pgTAP test runs programs_daily with a referral row present (supabase/tests/fix5_programs_daily.sql).
-- Additive: one function replaced, nothing dropped, no data changed. The partner_notices job offer is its own file
-- (20261111090100_fix5_partner_notices_step.sql, renamed to its applied version), applied once the dispatcher that handles it is deployed.

create or replace function private.programs_daily() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_attr int := 0; v_loc uuid; v_ended int := 0; v_change record;
begin
  for v_loc in
    select distinct on (l.organization_id) l.id from public.locations l join public.organizations o on o.id = l.organization_id
     where o.created_at > now() - interval '14 days' and not l.is_demo
       and not exists (select 1 from public.partner_referrals r where r.organization_id = l.organization_id)
       and not exists (select 1 from public.owner_referrals r where r.organization_id = l.organization_id)
     order by l.organization_id, l.created_at
  loop
    if private.partner_attribute(v_loc) is not null then v_attr := v_attr + 1; end if;
  end loop;
  for v_change in select id from public.partner_payout_changes where state = 'asked' and expires_at <= now() loop
    perform private.partner_payout_end(v_change.id);
    v_ended := v_ended + 1;
  end loop;
  return jsonb_build_object('attributed', v_attr, 'payout_requests_ended', v_ended, 'founding_messages', private.founding_tick());
end $$;
revoke all on function private.programs_daily() from public, anon, authenticated;
