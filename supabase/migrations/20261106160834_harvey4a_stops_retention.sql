-- Harvey 4A part F (master plan 30.39 and 30.19 section 5, retention widened by 30.39 item 2). The stop rules: any
-- complaint, or bounces above 3 percent of the last 100 sends, set sending_open false with stopped_reason and alert Rashid;
-- only lane R reopens (the settings trigger refuses anyone else). The data rules, daily: a business written to with no
-- reply is deleted 90 days after the last email and its domain (coded) goes on the never-contact list with reason
-- contacted; a no or a bounce keeps only the hash; a draft never sent is deleted after 30 days with no hash (it was never
-- written to); a yes stays as a contact under the privacy page. Tallies in outbound_days are numbers and stay.

create or replace function public.outbound_stop(p_reason text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare v_was boolean;
begin
  select stopped_reason is null into v_was from public.outbound_settings where id for update;
  if not coalesce(v_was, false) then return false; end if;
  update public.outbound_settings set sending_open = false, stopped_reason = left(p_reason, 300), stopped_at = now() where id;
  perform public.ops_emit('outbound_stop', 'alerts', 'Kabsi outbound stopped',
    left(p_reason, 300) || '. Sending is off until lane R reopens it.', '[]'::jsonb, public.ops_staff_btn('Open Outbound'),
    'outbound_stop:' || to_char(now(), 'YYYY-MM-DD HH24:MI'));
  return true;
end $$;

-- Called by outbound-inbox after a complaint or a bounce.
create or replace function public.outbound_check_stops(p_reason text) returns text
language plpgsql security definer set search_path = '' as $$
declare v_sent integer; v_bounced integer;
begin
  if p_reason = 'complaint' then
    perform public.outbound_stop('A complaint came in');
    return 'stopped';
  end if;
  -- From the daily tallies, which the 90-day and opt-out deletions never touch: the most recent days that hold the last
  -- 100 sends, and the bounces counted on those days.
  with d as (select sent, bounces, sum(sent) over (order by day desc) as upto from public.outbound_days)
  select coalesce(sum(sent), 0), coalesce(sum(bounces), 0) into v_sent, v_bounced from d where upto - sent < 100;
  if v_sent > 0 and v_bounced::numeric / v_sent > 0.03 then
    perform public.outbound_stop(format('Bounces at %s of the last %s sends, above 3 percent', v_bounced, v_sent));
    return 'stopped';
  end if;
  return 'ok';
end $$;

create or replace function private.outbound_retention() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare r record; n_contacted integer := 0; n_no integer := 0; n_drafts integer := 0;
begin
  for r in select id, email, email_domain from public.outbound_prospects
            where status in ('written', 'answered') and not interested
              and coalesce(last_email_at, created_at) < now() - interval '90 days'
              and updated_at < now() - interval '90 days'
  loop
    perform public.outbound_suppress(r.email, 'contacted', true);
    delete from public.outbound_prospects where id = r.id;
    n_contacted := n_contacted + 1;
  end loop;
  with gone as (delete from public.outbound_prospects where status in ('opted_out', 'bounced') and updated_at < now() - interval '1 day' returning 1)
  select count(*) into n_no from gone;
  with gone as (delete from public.outbound_prospects where status in ('drafted', 'skipped') and last_email_at is null
                  and created_at < now() - interval '30 days' returning 1)
  select count(*) into n_drafts from gone;
  return jsonb_build_object('contacted', n_contacted, 'no_or_bounce', n_no, 'unsent', n_drafts);
end $$;

revoke execute on function public.outbound_stop(text), public.outbound_check_stops(text), private.outbound_retention()
  from public, anon, authenticated;
grant execute on function public.outbound_stop(text), public.outbound_check_stops(text) to service_role;

select cron.schedule('kabsi_outbound_retention', '41 3 * * *', $$select private.outbound_retention()$$);
