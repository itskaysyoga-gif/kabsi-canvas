-- OUTBOUND-3: Outbound reopens for the pilot, the US first. Additive. Sending stays locked: sending_open stays false and
-- test_mode true; only a lane R migration opens it, after Rashid says the mailbox is ready.
-- 1. open_countries may hold US and GB (every other country stays off). The row itself is not changed: '{}' stays.
-- 2. The deliverability record for the staff page: the last DNS reading, and the mail-tester.com address and score.
-- 3. The lock gets two more conditions, for everyone (lane R too): sending opens only while SPF, DKIM and DMARC read
--    correctly and the last mail-tester score is 10 of 10.
-- 4. The kill gate (30.19 section 5): fewer than 3 replies that lead to a check or a trial in the first 300 emails ends
--    Outbound and alerts Rashid. Counted from the daily tallies: the first 300 Email 1s, then 14 days for replies.
-- 5. Approve all takes a whole week (up to 100 Email 1s).
-- 6. The three jobs are scheduled again: prepare every 2 hours on Sundays (the coming week, ready for Monday), send every
--    10 minutes, inbox every 10 minutes between the sends.
-- Read-back:
--   select sending_open, test_mode, open_countries, dns_ok, mail_tester_score from public.outbound_settings;
--     expect: false, true, {}, null, null
--   select jobname, schedule from cron.job where jobname like 'kabsi_outbound%' order by 1;
--     expect: inbox 5-55/10 * * * *, prepare 15 */2 * * 0, retention 41 3 * * *, send */10 * * * *
--   select public.outbound_check_kill_gate();  expect: open

-- 1 ------------------------------------------------------------------------------------------------------------------
alter table public.outbound_settings drop constraint if exists outbound_settings_open_countries_check;
alter table public.outbound_settings add constraint outbound_settings_open_countries_check
  check (open_countries <@ array['US', 'GB']::text[]);
comment on column public.outbound_settings.open_countries is
  'Outbound (OUTBOUND-3): only US and GB may be opened, by lane R. Every other country stays off.';

-- 2 ------------------------------------------------------------------------------------------------------------------
alter table public.outbound_settings add column if not exists dns_ok boolean;
alter table public.outbound_settings add column if not exists dns_problem text check (char_length(dns_problem) <= 40);
alter table public.outbound_settings add column if not exists dns_checked_at timestamptz;
alter table public.outbound_settings add column if not exists mail_tester_address text
  check (mail_tester_address ~ '^[a-z0-9][a-z0-9-]{2,60}@srv[0-9]{1,3}\.mail-tester\.com$');
alter table public.outbound_settings add column if not exists mail_tester_sent_at timestamptz;
alter table public.outbound_settings add column if not exists mail_tester_score numeric(3,1)
  check (mail_tester_score between 0 and 10);
alter table public.outbound_settings add column if not exists mail_tester_at timestamptz;

-- 3 ------------------------------------------------------------------------------------------------------------------
-- The guard of Outbound test part G (20261106181020), kept whole, with the two new conditions on opening.
create or replace function private.outbound_settings_guard() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.sending_open and not old.sending_open then
    if current_user <> 'postgres' then
      raise exception 'outbound: sending opens only by lane R' using errcode = '42501';
    end if;
    if not coalesce(new.dns_ok, false) or coalesce(new.mail_tester_score, 0) < 10 then
      raise exception 'outbound: sending opens only when SPF, DKIM and DMARC read correctly and mail-tester scores 10 of 10'
        using errcode = '42501';
    end if;
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

-- 4 ------------------------------------------------------------------------------------------------------------------
create or replace function public.outbound_check_kill_gate() returns text
language plpgsql security definer set search_path = '' as $$
declare v_day date; v_yes integer; v_reason text;
begin
  select stopped_reason into v_reason from public.outbound_settings where id;
  if v_reason like 'Kill gate%' then return 'ended'; end if;
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
revoke execute on function public.outbound_check_kill_gate() from public, anon, authenticated;
grant execute on function public.outbound_check_kill_gate() to service_role;

-- 5 ------------------------------------------------------------------------------------------------------------------
create or replace function public.staff_outbound_approve_all(p_ids uuid[]) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v uuid; n integer := 0;
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  if coalesce(array_length(p_ids, 1), 0) > 100 then raise exception 'too_many'; end if;
  foreach v in array coalesce(p_ids, array[]::uuid[]) loop
    if exists (select 1 from public.outbound_messages where id = v and kind = 'first' and status = 'draft') then
      perform public.staff_outbound_approve(v);
      n := n + 1;
    end if;
  end loop;
  return jsonb_build_object('approved', n);
end $$;
revoke execute on function public.staff_outbound_approve_all(uuid[]) from public, anon;
grant execute on function public.staff_outbound_approve_all(uuid[]) to authenticated;

-- 6 ------------------------------------------------------------------------------------------------------------------
select cron.schedule('kabsi_outbound_prepare', '15 */2 * * 0', $$select public.call_internal('outbound-prepare')$$);
select cron.schedule('kabsi_outbound_send', '*/10 * * * *', $$select public.call_internal('outbound-send')$$);
select cron.schedule('kabsi_outbound_inbox', '5-55/10 * * * *', $$select public.call_internal('outbound-inbox')$$);
