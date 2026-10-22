-- P0.6-08 (K-118, K-87): the queue health check. The uptime monitor must turn red when work is stuck, not only when the
-- site answers, so one function says how long the oldest job that was due has been waiting. The health Edge Function
-- (GET /health/queue) turns it into 200 or 503. Nothing here names a business, a review or a person.
-- Additive: one new function. Nothing existing is changed or dropped.

create or replace function public.queue_health() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'ok', coalesce(max(extract(epoch from now() - next_run_at)), 0) <= 600,
    'oldest_due_seconds', coalesce(max(extract(epoch from now() - next_run_at))::bigint, 0),
    'due_jobs', count(*),
    'limit_seconds', 600,
    'checked_at', now()
  )
  from public.jobs
  where state in ('pending', 'retrying') and next_run_at <= now()
$$;

-- Only the health Edge Function (service role) runs it; the browser and anon cannot.
revoke all on function public.queue_health() from public, anon, authenticated;
grant execute on function public.queue_health() to service_role;
