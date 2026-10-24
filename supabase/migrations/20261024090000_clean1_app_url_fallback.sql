-- Clean 1 (master plan 25.10, 28.9): Kabsi does not use Lovable. ops_app_url() fell back to the old Lovable address
-- when app_settings has no app_url row; the fallback is now kabsi.co. The row itself already says https://kabsi.co,
-- so nothing changes today. Same signature, owner, security definer and grants.
create or replace function public.ops_app_url()
returns text
language sql
stable
security definer
set search_path to ''
as $$
  select coalesce((select value from public.app_settings where key = 'app_url'), 'https://kabsi.co')
$$;
