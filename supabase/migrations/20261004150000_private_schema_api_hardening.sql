-- P0.1-08: security hardening of the database API (K-42, audit findings A10 to A12, G-17).
--
-- 1. A schema `private` that the API never exposes (PostgREST serves only public and graphql_public). Functions that
--    only pg_cron runs move there, and their cron commands follow in this migration. Every one of them has
--    search_path '' and fully qualified bodies, and no other function, policy, trigger or Edge Function names them.
--    Service-only functions that Edge Functions call through the service role, or that other functions call by name,
--    stay in public with no execute for anon or authenticated (already true before this migration).
-- 2. anon can no longer run google_mode(). The signed-out email-link page now gets the mode from the action endpoint.
-- 3. authenticated keeps only the owner, partner and staff RPCs the app calls, plus the RLS helpers is_member,
--    is_partner_member and is_staff that policies call as the signed-in user. is_demo_location and is_demo_user run
--    only inside trigger conditions; no anon or authenticated role has a write policy on those tables, so the
--    conditions only ever run as postgres or service_role. profile_score runs only inside profile_tasks_list
--    (SECURITY DEFINER). staff_concierge_edit_review has no caller.
-- Additive: nothing is dropped and no data changes.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;

alter function public.run_retention() set schema private;
alter function public.purge_old_chats() set schema private;
alter function public.ops_watchdog() set schema private;
alter function public.end_expired_plans() set schema private;
alter function public.concierge_daily_tasks() set schema private;
alter function public.concierge_overdue_alerts() set schema private;

revoke all on function private.run_retention(), private.purge_old_chats(), private.ops_watchdog(),
  private.end_expired_plans(), private.concierge_daily_tasks(), private.concierge_overdue_alerts()
  from public, anon, authenticated;

do $$
declare
  j record;
begin
  for j in
    select jobid, command from cron.job
    where command ~ 'public\.(run_retention|purge_old_chats|ops_watchdog|end_expired_plans|concierge_daily_tasks|concierge_overdue_alerts)\('
  loop
    perform cron.alter_job(j.jobid, command := regexp_replace(j.command,
      'public\.(run_retention|purge_old_chats|ops_watchdog|end_expired_plans|concierge_daily_tasks|concierge_overdue_alerts)\(',
      'private.\1(', 'g'));
  end loop;
end $$;

revoke execute on function public.google_mode() from anon;

revoke execute on function public.is_demo_location(uuid) from authenticated;
revoke execute on function public.is_demo_user(uuid) from authenticated;
revoke execute on function public.profile_score(uuid) from public, anon, authenticated;
revoke execute on function public.staff_concierge_edit_review(uuid, integer, text, text) from public, anon, authenticated;
