-- P0.1-06 follow-up (security advisor): is_demo_login answers "is this address the demo login", so nobody outside
-- the signup trigger may call it. Only Supabase Auth (supabase_auth_admin) and postgres insert into auth.users.
-- is_demo_location and is_demo_user stay callable by signed-in users: they take an id, return only true or false, and
-- run inside trigger conditions on tables signed-in users have grants on. Neither is callable by anon.
revoke execute on function public.is_demo_login(text) from public, anon, authenticated;
grant execute on function public.is_demo_login(text) to supabase_auth_admin, service_role;
revoke execute on function public.is_demo_location(uuid) from public, anon;
revoke execute on function public.is_demo_user(uuid) from public, anon;
grant execute on function public.is_demo_location(uuid) to authenticated, service_role;
grant execute on function public.is_demo_user(uuid) to authenticated, service_role;
