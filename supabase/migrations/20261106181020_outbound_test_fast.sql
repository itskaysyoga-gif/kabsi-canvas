-- Outbound test part G (master plan 30.39 item 12, lane R exception for the test run only): a setting that shortens the
-- 9:00 to 17:00 weekday window and the 20-minute spacing, and works only while sending is locked and test mode is on.
-- Only a lane R migration (postgres) may set it, at most 4 hours ahead; it is cleared the moment sending opens or test
-- mode goes off, and it ends by itself. The column starts null: nothing changes until lane R sets it.
alter table public.outbound_settings add column if not exists test_fast_until timestamptz;
comment on column public.outbound_settings.test_fast_until is
  'Part G test run only (30.39 item 12): until this time, with sending locked and test mode on, outbound-send skips the weekday window and spaces sends 1 minute apart. Set only by a lane R migration, at most 4 hours ahead; null otherwise.';

create or replace function private.outbound_settings_guard() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.sending_open and not old.sending_open and current_user <> 'postgres' then
    raise exception 'outbound: sending opens only by lane R' using errcode = '42501';
  end if;
  if old.stopped_reason is not null and new.stopped_reason is null and current_user <> 'postgres' then
    raise exception 'outbound: a stop is cleared only by lane R' using errcode = '42501';
  end if;
  -- The test setting never outlives test mode: opening sending or leaving test mode clears it.
  if new.sending_open or not new.test_mode then
    new.test_fast_until := null;
  elsif new.test_fast_until is not null and new.test_fast_until is distinct from old.test_fast_until then
    if current_user <> 'postgres' then
      raise exception 'outbound: the test setting is set only by lane R' using errcode = '42501';
    end if;
    if new.test_fast_until > now() + interval '4 hours' then
      raise exception 'outbound: the test setting lasts at most 4 hours' using errcode = '22023';
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;

-- The 20-minute floor stays, except while the test setting is live (then 1 minute).
create or replace function public.outbound_reserve_slot(p_gap_seconds integer) returns boolean
language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  update public.outbound_settings
     set next_send_at = now() + make_interval(secs => greatest(p_gap_seconds,
           case when not sending_open and test_mode and test_fast_until > now() then 60 else 1200 end))
   where id and stopped_reason is null and (next_send_at is null or next_send_at <= now());
  get diagnostics n = row_count;
  return n = 1;
end $$;
revoke execute on function public.outbound_reserve_slot(integer) from public, anon, authenticated;
grant execute on function public.outbound_reserve_slot(integer) to service_role;
