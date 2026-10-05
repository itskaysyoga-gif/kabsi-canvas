-- P0.1-12b part 1: Google rate limiter and circuit breaker (K-36, audit finding A9).
--
-- 1. public.google_rate: one row per bucket with the times of its recent calls (a sliding window, so the limit holds
--    over any second or any minute, not just inside fixed windows). Two kinds of bucket:
--      'project'                 every Google Business Profile call: at most 4 a second (Google allows 300 a minute)
--      'profile:locations/<id>'  every write to one profile: at most 5 a minute (Google's hard limit is 10)
-- 2. public.circuit_breaker: one row, 'google'. 20 failed Google calls (429, 5xx, network) inside a minute open it for
--    5 minutes with a #kabsi-alerts message; while it is open no Google call is made. It closes on its own after the
--    5 minutes, with a second message.
-- 3. google_gate(profile) is asked before every Google call (supabase/functions/_shared/google/client.ts): it returns
--    {"wait_ms": 0} and counts the call, {"wait_ms": n} without counting it when the caller must wait, or
--    {"open_until": t} while the breaker is open. google_failure() records one failed call.
-- 4. postpone_job(...) puts a claimed job back without counting the try, for work that waits on the breaker or the
--    limiter (a paused Google is not the job's fault, so it must not run the job towards dead).
--
-- Service role only, like the other job functions (P0.1-08). Additive: two new tables and new functions. Nothing
-- calls them until the code in the same pull request is deployed.

-- 1. Rate buckets ----------------------------------------------------------------------------------------------------

create table public.google_rate (
  bucket text primary key,
  hits timestamptz[] not null default '{}',
  updated_at timestamptz not null default now()
);
alter table public.google_rate enable row level security;
revoke all on public.google_rate from public, anon, authenticated, service_role;
grant select on public.google_rate to service_role;

-- 2. Circuit breaker -------------------------------------------------------------------------------------------------

create table public.circuit_breaker (
  name text primary key,
  state text not null default 'closed' check (state in ('closed', 'open')),
  window_start timestamptz not null default now(),
  failures integer not null default 0,
  opened_at timestamptz,
  open_until timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.circuit_breaker enable row level security;
revoke all on public.circuit_breaker from public, anon, authenticated, service_role;
grant select on public.circuit_breaker to service_role;
insert into public.circuit_breaker (name) values ('google');

-- Close the breaker once its 5 minutes are over. Returns when it stays open until, or null when it is closed.
create function private.google_circuit() returns timestamptz
language plpgsql security definer set search_path = '' as $$
declare v public.circuit_breaker;
begin
  select * into v from public.circuit_breaker where name = 'google';
  if v.state is distinct from 'open' then return null; end if;
  if v.open_until > now() then return v.open_until; end if;
  update public.circuit_breaker set state = 'closed', failures = 0, window_start = now(), updated_at = now()
   where name = 'google' and state = 'open' and open_until <= now()
  returning * into v;
  if v.name is not null then
    perform public.ops_emit('circuit_closed', 'alerts', ':large_green_circle: Google calls resumed',
      'The 5 minute pause is over. Kabsi calls Google again; queued work runs in order.',
      '[]'::jsonb, public.ops_staff_btn('Job health'), 'circuit_closed:' || extract(epoch from v.opened_at)::bigint);
  end if;
  return null;
end $$;

-- One failed Google call. The 20th inside a minute opens the breaker for 5 minutes.
create function public.google_failure() returns void
language plpgsql security definer set search_path = '' as $$
declare v public.circuit_breaker;
begin
  update public.circuit_breaker set
    failures = case when window_start > now() - interval '1 minute' then failures + 1 else 1 end,
    window_start = case when window_start > now() - interval '1 minute' then window_start else now() end,
    updated_at = now()
  where name = 'google' and state = 'closed'
  returning * into v;
  if v.name is null or v.failures < 20 then return; end if;
  update public.circuit_breaker set state = 'open', opened_at = now(), open_until = now() + interval '5 minutes',
    failures = 0, window_start = now(), updated_at = now()
   where name = 'google'
  returning * into v;
  perform public.ops_emit('circuit_open', 'alerts', ':red_circle: Google calls paused for 5 minutes',
    '20 Google calls failed inside a minute (rate limit, server errors or no answer). Kabsi stops calling Google until '
      || to_char(v.open_until at time zone 'UTC', 'HH24:MI') || ' UTC; queued work waits and nothing is lost.',
    '[]'::jsonb, public.ops_staff_btn('Job health'), 'circuit_open:' || extract(epoch from v.opened_at)::bigint);
end $$;

-- 3. The gate before every Google call -------------------------------------------------------------------------------

-- Take one call from a bucket's window, or say how long to wait. Locks the bucket row, so two callers never both
-- take the last place.
create function private.rate_take(p_bucket text, p_limit integer, p_window interval, p_take boolean) returns integer
language plpgsql security definer set search_path = '' as $$
declare v_hits timestamptz[];
begin
  insert into public.google_rate (bucket) values (p_bucket) on conflict (bucket) do nothing;
  select array(select h from unnest(r.hits) h where h > now() - p_window order by h) into v_hits
    from public.google_rate r where r.bucket = p_bucket for update;
  if cardinality(v_hits) >= p_limit then
    -- Wait until the oldest call that still counts leaves the window.
    return greatest(1, ceil(extract(epoch from (v_hits[cardinality(v_hits) - p_limit + 1] + p_window - now())) * 1000))::integer;
  end if;
  if p_take then
    update public.google_rate set hits = v_hits || now(), updated_at = now() where bucket = p_bucket;
  end if;
  return 0;
end $$;

-- p_profile is 'locations/<id>' for a write to that profile, null for a read or a write that is not on a profile.
create function public.google_gate(p_profile text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_open timestamptz; v_project integer; v_profile integer := 0;
begin
  v_open := private.google_circuit();
  if v_open is not null then return jsonb_build_object('open_until', v_open); end if;
  -- Check both buckets first and take from both only when both have room, so a wait never uses up a place.
  if p_profile is not null then
    v_profile := private.rate_take('profile:' || p_profile, 5, interval '1 minute', false);
  end if;
  v_project := private.rate_take('project', 4, interval '1 second', false);
  if v_project > 0 or v_profile > 0 then return jsonb_build_object('wait_ms', greatest(v_project, v_profile)); end if;
  perform private.rate_take('project', 4, interval '1 second', true);
  if p_profile is not null then perform private.rate_take('profile:' || p_profile, 5, interval '1 minute', true); end if;
  return jsonb_build_object('wait_ms', 0);
end $$;

-- 4. Postpone a claimed job ------------------------------------------------------------------------------------------

-- Put a claimed job back to run at p_until without counting the try. Returns the new state, or null when the job is
-- no longer this worker's.
create function public.postpone_job(p_id bigint, p_worker text, p_until timestamptz, p_reason text default null)
returns text
language plpgsql security definer set search_path = '' as $$
declare v_state text;
begin
  update public.jobs set
    state = case when attempts > 1 then 'retrying' else 'pending' end,
    attempts = greatest(attempts - 1, 0),
    next_run_at = greatest(coalesce(p_until, now()), now()),
    last_error = left(coalesce(p_reason, 'postponed'), 1000),
    locked_at = null, locked_by = null
  where id = p_id and state = 'running' and locked_by = left(p_worker, 100)
  returning state into v_state;
  return v_state;
end $$;

revoke all on function public.google_gate(text), public.google_failure(), public.postpone_job(bigint, text, timestamptz, text)
  from public, anon, authenticated;
grant execute on function public.google_gate(text), public.google_failure(), public.postpone_job(bigint, text, timestamptz, text)
  to service_role;
revoke all on function private.google_circuit(), private.rate_take(text, integer, interval, boolean)
  from public, anon, authenticated, service_role;
