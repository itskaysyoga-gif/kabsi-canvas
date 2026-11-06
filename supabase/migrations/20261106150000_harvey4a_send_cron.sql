-- Harvey 4A part D (master plan 30.39): outbound-send every 10 minutes. The function sends at most one approved, due
-- message a tick, only when sending is open or, in test mode, only to the test addresses; otherwise it does nothing.
select cron.schedule('kabsi_outbound_send', '*/10 * * * *', $$select public.call_internal('outbound-send')$$);

-- Review of part D: a message is claimed before it is sent, so two ticks never send it twice, and a claimed message that
-- was never recorded as sent is marked failed for a person to look at, never sent again.
alter table public.outbound_messages add column if not exists claimed_at timestamptz;

-- The next sending slot, taken atomically: true moves next_send_at on by the gap; false while another send holds it.
create or replace function public.outbound_reserve_slot(p_gap_seconds integer) returns boolean
language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  update public.outbound_settings set next_send_at = now() + make_interval(secs => greatest(p_gap_seconds, 1200))
   where id and stopped_reason is null and (next_send_at is null or next_send_at <= now());
  get diagnostics n = row_count;
  return n = 1;
end $$;
revoke execute on function public.outbound_reserve_slot(integer) from public, anon, authenticated;
grant execute on function public.outbound_reserve_slot(integer) to service_role;
