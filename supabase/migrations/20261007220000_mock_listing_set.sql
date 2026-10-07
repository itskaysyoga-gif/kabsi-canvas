-- P0.1-13b part A fix: the mock Business Information API sets one field of a mock listing at a time.
-- The mock kept the whole listing in one jsonb row and wrote it back whole, so two publish jobs running side by side
-- (a special hours period and a Google Protection put-back for the same business) could overwrite each other's field.
-- Live Google patches each field on its own (updateMask), so this is a mock-only fix: mock_listing_set merges one key
-- under the row lock. Mock mode and demo businesses only (R-17). Additive: one function, service role only.

create function public.mock_listing_set(p_location text, p_key text, p_value jsonb) returns jsonb
language sql security definer set search_path = '' as $$
  update public.mock_listings set fields = fields || jsonb_build_object(p_key, p_value), updated_at = now()
   where google_location_id = p_location
  returning fields
$$;

revoke all on function public.mock_listing_set(text, text, jsonb) from public, anon, authenticated;
grant execute on function public.mock_listing_set(text, text, jsonb) to service_role;
