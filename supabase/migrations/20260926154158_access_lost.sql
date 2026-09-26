-- KABSI: migration 017: lost Google access (26 Sep 2026)
-- When Google refuses a business's reviews (403/404) for more than 30 minutes, Kabsi treats access as lost:
-- the business goes back to access_pending (so it isn't billed or drafted for), the owner is emailed how to
-- add hello@kabsi.co again, and the normal access job reconnects it once the invite is back.

alter table public.locations add column access_error_since timestamptz;

create or replace function public.mark_access_lost(p_location uuid) returns text
language plpgsql security definer set search_path = '' as $$
begin
  update public.locations set access_granted_at = null, access_error_since = null where id = p_location;
  return public.refresh_location_status(p_location);
end $$;
revoke execute on function public.mark_access_lost(uuid) from public, anon, authenticated;
grant execute on function public.mark_access_lost(uuid) to service_role;