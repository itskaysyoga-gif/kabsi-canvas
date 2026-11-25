-- FIX-3 (R-165, LATER row of OUTBOUND-3): the kill gate counted clear yes replies (outbound_days.interested, tallied when a reply was
-- classified yes). It must count what a yes is for: a free check that was actually run for the business that replied, or a trial that
-- business started. A yes whose check could not run (places_daily_cap, an error) no longer counts, and a business counts once.
--   * outbound_on_event no longer tallies a yes. The column name interested stays (the dashboard views read it); it now means
--     "led to a check or a trial", one per business.
--   * outbound_note_led(prospect, 'check', code) is called by outbound-inbox when the check ran and returned its code: it keeps the
--     code, stamps led_at and tallies today once.
--   * outbound_note_trials() links the check's code to free_checks.location_id (set when the business signs up from that check)
--     and to a trial of that location's organisation; it stamps trial_at and counts the business if it was not counted yet. The gate
--     runs it first. Counts only; no name, address or email leaves the table.
alter table public.outbound_prospects
  add column check_code text check (check_code is null or check_code ~ '^[A-Za-z0-9_-]{4,40}$'),
  add column led_at timestamptz,
  add column led_by text check (led_by in ('check', 'trial')),
  add column trial_at timestamptz;
comment on column public.outbound_prospects.led_at is 'FIX-3: when this business first led to a free check run or a trial started; the kill gate counts one per business, by outbound_days.interested.';
comment on column public.outbound_days.interested is 'FIX-3: businesses that led to a free check run or a trial started that day (once each). Not yes replies.';

create or replace function private.outbound_on_event() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_day date := (new.received_at at time zone 'UTC')::date;
begin
  if new.kind = 'reply' and not exists (select 1 from public.outbound_events e where e.prospect_id = new.prospect_id
                                          and e.kind = 'reply' and e.id <> new.id) then
    perform private.outbound_tally(v_day, 'replies');
  elsif new.kind = 'opt_out' then perform private.outbound_tally(v_day, 'opt_outs');
  elsif new.kind = 'bounce' then perform private.outbound_tally(v_day, 'bounces');
  elsif new.kind = 'complaint' then perform private.outbound_tally(v_day, 'complaints');
  end if;
  return new;
end $$;

create or replace function public.outbound_note_led(p_prospect uuid, p_by text, p_code text default null) returns boolean
language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if p_by not in ('check', 'trial') then raise exception 'outbound: bad led_by' using errcode = '22023'; end if;
  update public.outbound_prospects
     set led_at = now(), led_by = p_by, check_code = coalesce(p_code, check_code), updated_at = now()
   where id = p_prospect and led_at is null
   returning id into v_id;
  if v_id is not null then
    perform private.outbound_tally((now() at time zone 'UTC')::date, 'interested');
    return true;
  end if;
  if p_code is not null then
    update public.outbound_prospects set check_code = p_code, updated_at = now() where id = p_prospect and check_code is null;
  end if;
  return false;
end $$;

create or replace function public.outbound_note_trials() returns integer
language plpgsql security definer set search_path = '' as $$
declare r record; v_new integer := 0;
begin
  for r in
    select p.id, p.led_at from public.outbound_prospects p
      join public.free_checks f on f.code = upper(regexp_replace(p.check_code, '^KAB-', '', 'i'))
      join public.locations l on l.id = f.location_id
     where p.check_code is not null and p.trial_at is null
       and exists (select 1 from public.subscriptions s where s.organization_id = l.organization_id and s.trial_started_at is not null)
  loop
    update public.outbound_prospects set trial_at = now(), updated_at = now() where id = r.id;
    if r.led_at is null and public.outbound_note_led(r.id, 'trial') then v_new := v_new + 1; end if;
  end loop;
  return v_new;
end $$;

create or replace function public.outbound_check_kill_gate() returns text
language plpgsql security definer set search_path = '' as $$
declare v_day date; v_yes integer; v_reason text;
begin
  select stopped_reason into v_reason from public.outbound_settings where id;
  if v_reason like 'Kill gate%' then return 'ended'; end if;
  perform public.outbound_note_trials();
  -- The day the 300th Email 1 went out.
  select day into v_day from (
    select day, sum(first_emails) over (order by day) as upto from public.outbound_days
  ) d where upto >= 300 order by day limit 1;
  if v_day is null then return 'open'; end if;
  if (now() at time zone 'UTC')::date < v_day + 14 then return 'waiting'; end if;
  select coalesce(sum(interested), 0) into v_yes from public.outbound_days where day <= v_day + 14;
  if v_yes >= 3 then return 'passed'; end if;
  perform public.outbound_stop(format('Kill gate: %s of the first 300 emails led to a check or a trial, fewer than 3. Outbound ends', v_yes));
  return 'ended';
end $$;

revoke execute on function public.outbound_note_led(uuid, text, text), public.outbound_note_trials() from public, anon, authenticated;
grant execute on function public.outbound_note_led(uuid, text, text), public.outbound_note_trials() to service_role;
