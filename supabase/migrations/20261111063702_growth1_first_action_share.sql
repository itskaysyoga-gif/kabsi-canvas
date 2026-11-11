-- Growth 1 (master plan 30.50 item 12): one number for the staff morning digest. Of the real businesses whose Manager
-- access began in the last 30 days and at least 24 hours ago, how many had their first approved Google action within
-- 24 hours of that access. "Manager access" is the first google_access_granted record of the business in the audit log;
-- "approved Google action" is an approval record by a person (every publication row is a write to Google, so each one
-- writes an approval record when it is made, any channel). Demo businesses and kabsi.co test accounts are left out.
-- Counts only: no business, person or customer detail leaves the database.
-- Additive: one new private function, and two new keys on whatsapp_staff_summary() (the digest and "today" read it).

create or replace function private.first_action_share() returns jsonb
language sql stable security definer set search_path = '' as $$
  with granted as (
    select e.location_id, min(e.created_at) as granted_at
      from public.audit_events e
      join public.locations l on l.id = e.location_id
     where e.action = 'google_access_granted' and not l.is_demo
       and not private.internal_user(l.created_by)
     group by e.location_id),
  cohort as (
    select g.location_id, g.granted_at from granted g
     where g.granted_at <= now() - interval '24 hours'
       and g.granted_at > now() - interval '30 days')
  select jsonb_build_object(
    'first_action_cohort', (select count(*) from cohort),
    'first_action_24h', (select count(*) from cohort c where exists (
        select 1 from public.audit_events a
         where a.location_id = c.location_id and a.action = 'approval' and a.actor_type = 'user'
           and a.created_at >= c.granted_at and a.created_at <= c.granted_at + interval '24 hours')))
$$;
revoke all on function private.first_action_share() from public, anon, authenticated;

do $$
declare d text; n text;
  old_expr constant text := $re$'alerts_24h',\s*\(select count\(\*\) from public\.ops_events, w where created_at > since\)\)$re$;
  new_expr constant text := $x$'alerts_24h', (select count(*) from public.ops_events, w where created_at > since))
    || private.first_action_share()$x$;
begin
  d := pg_get_functiondef('public.whatsapp_staff_summary()'::regprocedure);
  n := regexp_replace(d, old_expr, new_expr);
  if n = d then raise exception 'whatsapp_staff_summary: the alerts_24h line was not found'; end if;
  execute n;
end $$;

revoke all on function public.whatsapp_staff_summary() from public, anon, authenticated;
grant execute on function public.whatsapp_staff_summary() to service_role;
