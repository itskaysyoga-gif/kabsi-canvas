-- Fix 3 (Sentry KABSI-EDGE-J): a failed Profile Coach read is not due again for 24 hours. Before this, a read that failed
-- left coach_read_due true, so the 5 minute detect_tasks job tried again every 5 minutes (5,796 failed Google calls since
-- 28 Oct). Additive: one table, one function, and coach_read_due replaced with the same rules plus the wait.
create table if not exists public.coach_read_failures (
  location_id uuid primary key references public.locations(id) on delete cascade,
  failed_at timestamptz not null default now(),
  error text
);
alter table public.coach_read_failures enable row level security;
revoke all on public.coach_read_failures from public, anon, authenticated;
grant select, insert, update on public.coach_read_failures to service_role;
comment on table public.coach_read_failures is 'Fix 3: the last failed Profile Coach read per business; coach_read_due waits 24 hours after it.';

create or replace function public.coach_read_failed(p_location uuid, p_error text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.locations where id = p_location) then raise exception 'unknown_location'; end if;
  insert into public.coach_read_failures (location_id, failed_at, error) values (p_location, now(), left(p_error, 300))
  on conflict (location_id) do update set failed_at = excluded.failed_at, error = excluded.error;
end $$;
revoke execute on function public.coach_read_failed(uuid, text) from public, anon, authenticated;
grant execute on function public.coach_read_failed(uuid, text) to service_role;

create or replace function public.coach_read_due(p_location uuid) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare l public.locations; c public.coach_profile; f public.coach_read_failures;
begin
  select * into l from public.locations where id = p_location;
  if not found or l.status <> 'active' or l.concierge or l.disconnect_requested_at is not null or l.google_location_id is null then
    return false;
  end if;
  if not (private.feature_plan(p_location) ->> 'essentials')::boolean then return false; end if;
  -- Fix 3: a failed read waits 24 hours before it is offered again.
  select * into f from public.coach_read_failures where location_id = p_location;
  if f.location_id is not null and f.failed_at > now() - interval '24 hours' then return false; end if;
  select * into c from public.coach_profile where location_id = p_location;
  return c.location_id is null or c.read_at < now() - interval '7 days';
end $$;
revoke execute on function public.coach_read_due(uuid) from public, anon, authenticated;
grant execute on function public.coach_read_due(uuid) to service_role;
