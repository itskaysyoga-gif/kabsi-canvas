-- Voice 2 (lane R decision R-158 item 3, changing 30.50 item 11): the cost and health record of voice notes.
--   - public.voice_usage: one row per day (Beirut date, the digest's day): notes transcribed, seconds transcribed, failures.
--   - public.voice_health: one row, the number of transcription failures in a row.
--   - public.voice_record(seconds, outcome): the whatsapp function calls it after every transcription. It adds to the day, moves the
--     streak, and raises two staff alerts through ops_emit: the day passing 60 minutes (once a day), and 3 failures in a row (at most
--     once an hour while it lasts). Counts only: no audio, no words, no phone number, no business is ever stored here.
--   - private.voice_yesterday(): yesterday's minutes and notes for the morning digest, added to whatsapp_staff_summary().
-- Additive. Nothing here switches voice notes on: app_settings voice_notes is set in its own step after the code is deployed.

create table public.voice_usage (
  day date primary key,
  notes integer not null default 0 check (notes >= 0),
  seconds integer not null default 0 check (seconds >= 0),
  failures integer not null default 0 check (failures >= 0),
  over_alerted boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.voice_usage enable row level security;
revoke all on public.voice_usage from public, anon, authenticated, service_role;
grant select on public.voice_usage to service_role;

create table public.voice_health (
  id boolean primary key default true check (id),
  fail_streak integer not null default 0 check (fail_streak >= 0),
  updated_at timestamptz not null default now()
);
insert into public.voice_health (id) values (true);
alter table public.voice_health enable row level security;
revoke all on public.voice_health from public, anon, authenticated, service_role;
grant select on public.voice_health to service_role;

create or replace function public.voice_record(p_seconds integer, p_outcome text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_day date := (now() at time zone 'Asia/Beirut')::date;
  v_secs integer; v_notes integer; v_alerted boolean; v_streak integer;
begin
  if p_outcome not in ('ok', 'empty', 'failed') then
    raise exception 'voice_record: unknown outcome %', p_outcome;
  end if;
  -- A failed request is not a note and is not billed; an answered one, silence included, is both.
  insert into public.voice_usage as u (day, notes, seconds, failures)
  values (v_day, case when p_outcome = 'failed' then 0 else 1 end, case when p_outcome = 'failed' then 0 else greatest(coalesce(p_seconds, 0), 0) end,
          case when p_outcome = 'failed' then 1 else 0 end)
  on conflict (day) do update set notes = u.notes + excluded.notes, seconds = u.seconds + excluded.seconds,
    failures = u.failures + excluded.failures, updated_at = now()
  returning u.seconds, u.notes, u.over_alerted into v_secs, v_notes, v_alerted;

  update public.voice_health
     set fail_streak = case when p_outcome = 'failed' then fail_streak + 1 else 0 end, updated_at = now()
   where id
  returning fail_streak into v_streak;

  -- The day passes 60 minutes: one staff alert a day.
  if v_secs > 3600 and not v_alerted then
    update public.voice_usage set over_alerted = true where day = v_day;
    perform public.ops_emit('voice_minutes_high', 'alerts', 'Voice notes passed 60 minutes today',
      format('%s minutes of voice notes were transcribed today so far, in %s notes. Check the speech to text bill and whether one phone is sending many.', (v_secs / 60), v_notes),
      p_dedupe => 'voice_minutes:' || v_day::text);
  end if;
  -- Three failures in a row: a staff alert, then at most one an hour while it keeps failing. One failure is not an alert.
  if p_outcome = 'failed' and v_streak >= 3 then
    perform public.ops_emit('voice_failed', 'alerts', 'Voice notes are failing',
      format('%s voice notes in a row could not be transcribed. Owners are asked to type until it works. Check the speech to text provider, its key and its model name.', v_streak),
      p_dedupe => 'voice_failed:' || to_char(now() at time zone 'utc', 'YYYYMMDDHH24'));
  end if;
  return jsonb_build_object('seconds_today', v_secs, 'notes_today', v_notes, 'fail_streak', v_streak);
end $$;
revoke all on function public.voice_record(integer, text) from public, anon, authenticated;
grant execute on function public.voice_record(integer, text) to service_role;

-- Yesterday's voice use for the morning digest (08:00 Beirut, so yesterday is a whole Beirut day).
create or replace function private.voice_yesterday() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'voice_seconds_yesterday', coalesce(sum(seconds), 0),
    'voice_notes_yesterday', coalesce(sum(notes), 0),
    'voice_failures_yesterday', coalesce(sum(failures), 0))
    from public.voice_usage where day = (now() at time zone 'Asia/Beirut')::date - 1
$$;
revoke all on function private.voice_yesterday() from public, anon, authenticated;

do $$
declare d text; n text;
  old_expr constant text := $re$\|\|\s*private\.first_action_share\(\)$re$;
  new_expr constant text := $x$|| private.first_action_share()
    || private.voice_yesterday()$x$;
begin
  d := pg_get_functiondef('public.whatsapp_staff_summary()'::regprocedure);
  n := regexp_replace(d, old_expr, new_expr);
  if n = d then raise exception 'whatsapp_staff_summary: the first_action_share line was not found'; end if;
  execute n;
end $$;

revoke all on function public.whatsapp_staff_summary() from public, anon, authenticated;
grant execute on function public.whatsapp_staff_summary() to service_role;
