-- Session 10, after the database suite (rls_functions.sql): no SECURITY DEFINER function in public is open to anon,
-- and nothing in private is executable by browsers. The founding count is served to the pricing page by billing-creem
-- (GET /billing-creem/founding) with the service key; private.plan_limits is read only inside entitlements.
revoke all on function public.founding_places_left() from public, anon, authenticated;
grant execute on function public.founding_places_left() to service_role;
revoke all on function private.plan_limits(text) from public, anon, authenticated;
