-- Harvey 4A part E (master plan 30.39): outbound-inbox every 10 minutes, where it last read the mailbox, and a staff
-- action to close a reply Rashid answered himself (no draft is made for anything but a clear yes).
alter table public.outbound_settings add column if not exists inbox_last_uid bigint;
alter table public.outbound_settings add column if not exists inbox_uid_validity text check (char_length(inbox_uid_validity) <= 40);

create or replace function public.staff_outbound_reply_done(p_event_id bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare e public.outbound_events;
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into e from public.outbound_events where id = p_event_id for update;
  if not found then raise exception 'unknown_event'; end if;
  update public.outbound_events set handled_at = now() where id = p_event_id and handled_at is null;
  update public.outbound_prospects set status = case when interested then 'interested' else 'answered' end, updated_at = now()
   where id = e.prospect_id and status = 'needs_you';
  return jsonb_build_object('done', true);
end $$;
revoke execute on function public.staff_outbound_reply_done(bigint) from public, anon, authenticated;
grant execute on function public.staff_outbound_reply_done(bigint) to authenticated;

select cron.schedule('kabsi_outbound_inbox', '5-55/10 * * * *', $$select public.call_internal('outbound-inbox')$$);
