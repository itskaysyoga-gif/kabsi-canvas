-- R-123 D: the dedicated password page checks a live audit grant on the server.
-- It never exposes the audit_access table or real user data.
create or replace function public.audit_login_allowed()
returns boolean language sql stable security definer set search_path = '' as $$
  select private.is_auditor();
$$;
revoke all on function public.audit_login_allowed() from public, anon;
grant execute on function public.audit_login_allowed() to authenticated;
