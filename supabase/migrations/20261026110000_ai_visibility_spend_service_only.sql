-- V2: the AI Visibility cost-by-provider function is for the service role (the staff page reads it through the API
-- function), not for signed-in users, so the browser-callable function list (rls_functions.sql) stays as it was.
revoke execute on function public.ai_visibility_spend(int) from authenticated;
