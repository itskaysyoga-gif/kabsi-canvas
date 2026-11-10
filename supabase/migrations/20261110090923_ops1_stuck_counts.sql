-- Ops 1: one honest count of stuck publications, and what to do about each.
-- Until now the morning digest and the staff "status" and "waiting" answers counted every approved publication created
-- more than 30 minutes ago, including ones the owner scheduled for later (publish_after still ahead) and the demo
-- business's fixture rows. On 8, 9 and 10 Nov that was 8, 8 and 5 publications, every one of them a demo-pack row waiting
-- for its date; none was stuck. The staff Operations view (staff_operations) already had the right test: approved and past
-- its publish time by 15 minutes, or publishing for 15 minutes. This function is that test plus the ones Google is
-- checking for an hour, split by what to do:
--   retrying       approved or publishing, a publish job is pending, running or retrying: nothing to do, it retries itself
--   waiting_google Google is checking it (checking or verifying for an hour, a real business), or Google needs action on
--                  the profile, or Google writes are paused
--   need_look      approved or publishing and no publish job is working on it: open System health
-- Demo businesses never call Google (R-17), so their checking or verifying fixtures are not counted as waiting for Google.
-- Additive: a new private function, the two staff number functions gain keys, the System health stuck list skips demo rows.

create or replace function private.publication_stuck_counts() returns jsonb
language sql stable security definer set search_path = '' as $$
  with writes as (select coalesce((select value from public.app_settings where key = 'google_writes'), 'on') as v),
  s as (
    select p.state in ('checking', 'verifying') as at_google,
           (gc.google_action is not null or (select v from writes) <> 'on') as paused,
           exists (select 1 from public.jobs j where j.kind = 'publish' and j.dedupe_key = 'publish:' || p.id
                    and j.state in ('pending', 'running', 'retrying')) as has_job
      from public.publications p
      join public.locations l on l.id = p.location_id
      left join public.google_connections gc on gc.location_id = p.location_id
     where (p.state = 'approved' and p.publish_after < now() - interval '15 minutes')
        or (p.state = 'publishing' and coalesce(p.claimed_at, p.updated_at) < now() - interval '15 minutes')
        or (p.state in ('checking', 'verifying') and not l.is_demo
            and coalesce(p.claimed_at, p.publish_after, p.approved_at) < now() - interval '1 hour')
  )
  select jsonb_build_object(
    'total', count(*),
    'retrying', count(*) filter (where not at_google and not paused and has_job),
    'waiting_google', count(*) filter (where at_google or paused),
    'need_look', count(*) filter (where not at_google and not paused and not has_job))
  from s
$$;
revoke all on function private.publication_stuck_counts() from public, anon, authenticated;

do $$
declare d text; n text;
  old_expr constant text := $re$'publications_stuck',\s*\(select count\(\*\) from public\.publications where state in \('approved', 'publishing'\)\s+and created_at < now\(\) - interval '30 minutes'\)$re$;
  new_expr constant text := $x$'publications_stuck', (private.publication_stuck_counts() ->> 'total')::integer,
    'publications_retrying', (private.publication_stuck_counts() ->> 'retrying')::integer,
    'publications_waiting_google', (private.publication_stuck_counts() ->> 'waiting_google')::integer,
    'publications_need_look', (private.publication_stuck_counts() ->> 'need_look')::integer$x$;
begin
  d := pg_get_functiondef('public.whatsapp_staff_numbers()'::regprocedure);
  n := regexp_replace(d, old_expr, new_expr);
  if n = d then raise exception 'whatsapp_staff_numbers: the stuck count was not found'; end if;
  execute n;

  d := pg_get_functiondef('public.whatsapp_staff_summary()'::regprocedure);
  n := regexp_replace(d, old_expr, new_expr);
  if n = d then raise exception 'whatsapp_staff_summary: the stuck count was not found'; end if;
  execute n;

  -- The System health page listed the demo fixtures that sit in verifying; Google is never called for a demo business.
  d := pg_get_functiondef('public.staff_system_health()'::regprocedure);
  n := replace(d, $x$or (p.state in ('checking', 'verifying')$x$, $x$or (p.state in ('checking', 'verifying') and not l.is_demo$x$);
  if n = d then raise exception 'staff_system_health: the checking line was not found'; end if;
  execute n;
end $$;

revoke all on function public.whatsapp_staff_numbers(), public.whatsapp_staff_summary() from public, anon, authenticated;
grant execute on function public.whatsapp_staff_numbers(), public.whatsapp_staff_summary() to service_role;
