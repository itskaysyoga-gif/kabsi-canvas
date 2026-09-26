-- KABSI: migration 018: mark_access_lost fix (26 Sep 2026)
-- The active_needs_access check forbids an active business without access, so the status moves in the
-- same update; refresh_location_status then settles it (access_pending when consent exists).

create or replace function public.mark_access_lost(p_location uuid) returns text
language plpgsql security definer set search_path = '' as $$
begin
  update public.locations
     set access_granted_at = null, access_error_since = null,
         status = case when status = 'active' then 'access_pending' else status end
   where id = p_location;
  return public.refresh_location_status(p_location);
end $$;
revoke execute on function public.mark_access_lost(uuid) from public, anon, authenticated;
grant execute on function public.mark_access_lost(uuid) to service_role;