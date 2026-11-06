-- Launch 2 part D (master plan 30.36 item 9, R-116): holidays follow the UK nation. England and Wales, Scotland and
-- Northern Ireland each get their own GOV.UK bank holidays, and the nation comes from the business's Google address.
--
-- 1. The Scotland and Northern Ireland rows from today to the end of 2027, read from https://www.gov.uk/bank-holidays.json
--    on 6 Nov 2026 (as the england-and-wales rows of 20261021240005 were). Substitute days are named as there.
-- 2. private.holiday_region(country, address): GB only. Scotland or Northern Ireland when the address names the nation as
--    one of its parts (a street such as "Scotland Road, Liverpool" does not count); otherwise
--    the postcode area (BT is Northern Ireland; AB, DD, DG, EH, FK, G, HS, IV, KA, KW, KY, ML, PA, PH, TD and ZE are
--    Scotland, except TD12 and TD15, which reach into England and are left to the address: Scottish only when the
--    address names Scotland, the Scottish Borders or Coldstream); otherwise england-and-wales. The old one-argument
--    form stays for its callers and gives what it gave before (no address: england-and-wales for GB).
-- 3. private.detect_holidays and public.holiday_calendar: the same bodies, with the region read from the address.
--
-- Additive only: INSERT ... ON CONFLICT DO NOTHING and CREATE OR REPLACE.

insert into public.holidays (country, region, name, starts_on, ends_on, kind, estimated, source, verified_on) values
  ('GB', 'scotland', 'St Andrew''s Day', date '2026-11-30', date '2026-11-30', 'public', false, 'https://www.gov.uk/bank-holidays', date '2026-11-06'),
  ('GB', 'scotland', 'Christmas Day', date '2026-12-25', date '2026-12-25', 'public', false, 'https://www.gov.uk/bank-holidays', date '2026-11-06'),
  ('GB', 'scotland', 'Boxing Day (substitute day)', date '2026-12-28', date '2026-12-28', 'public', false, 'https://www.gov.uk/bank-holidays', date '2026-11-06'),
  ('GB', 'scotland', 'New Year''s Day', date '2027-01-01', date '2027-01-01', 'public', false, 'https://www.gov.uk/bank-holidays', date '2026-11-06'),
  ('GB', 'scotland', '2nd January (substitute day)', date '2027-01-04', date '2027-01-04', 'public', false, 'https://www.gov.uk/bank-holidays', date '2026-11-06'),
  ('GB', 'scotland', 'Good Friday', date '2027-03-26', date '2027-03-26', 'public', false, 'https://www.gov.uk/bank-holidays', date '2026-11-06'),
  ('GB', 'scotland', 'Early May bank holiday', date '2027-05-03', date '2027-05-03', 'public', false, 'https://www.gov.uk/bank-holidays', date '2026-11-06'),
  ('GB', 'scotland', 'Spring bank holiday', date '2027-05-31', date '2027-05-31', 'public', false, 'https://www.gov.uk/bank-holidays', date '2026-11-06'),
  ('GB', 'scotland', 'Summer bank holiday', date '2027-08-02', date '2027-08-02', 'public', false, 'https://www.gov.uk/bank-holidays', date '2026-11-06'),
  ('GB', 'scotland', 'St Andrew''s Day', date '2027-11-30', date '2027-11-30', 'public', false, 'https://www.gov.uk/bank-holidays', date '2026-11-06'),
  ('GB', 'scotland', 'Christmas Day (substitute day)', date '2027-12-27', date '2027-12-27', 'public', false, 'https://www.gov.uk/bank-holidays', date '2026-11-06'),
  ('GB', 'scotland', 'Boxing Day (substitute day)', date '2027-12-28', date '2027-12-28', 'public', false, 'https://www.gov.uk/bank-holidays', date '2026-11-06'),
  ('GB', 'northern-ireland', 'Christmas Day', date '2026-12-25', date '2026-12-25', 'public', false, 'https://www.gov.uk/bank-holidays', date '2026-11-06'),
  ('GB', 'northern-ireland', 'Boxing Day (substitute day)', date '2026-12-28', date '2026-12-28', 'public', false, 'https://www.gov.uk/bank-holidays', date '2026-11-06'),
  ('GB', 'northern-ireland', 'New Year''s Day', date '2027-01-01', date '2027-01-01', 'public', false, 'https://www.gov.uk/bank-holidays', date '2026-11-06'),
  ('GB', 'northern-ireland', 'St Patrick''s Day', date '2027-03-17', date '2027-03-17', 'public', false, 'https://www.gov.uk/bank-holidays', date '2026-11-06'),
  ('GB', 'northern-ireland', 'Good Friday', date '2027-03-26', date '2027-03-26', 'public', false, 'https://www.gov.uk/bank-holidays', date '2026-11-06'),
  ('GB', 'northern-ireland', 'Easter Monday', date '2027-03-29', date '2027-03-29', 'public', false, 'https://www.gov.uk/bank-holidays', date '2026-11-06'),
  ('GB', 'northern-ireland', 'Early May bank holiday', date '2027-05-03', date '2027-05-03', 'public', false, 'https://www.gov.uk/bank-holidays', date '2026-11-06'),
  ('GB', 'northern-ireland', 'Spring bank holiday', date '2027-05-31', date '2027-05-31', 'public', false, 'https://www.gov.uk/bank-holidays', date '2026-11-06'),
  ('GB', 'northern-ireland', 'Battle of the Boyne (Orangemen''s Day)', date '2027-07-12', date '2027-07-12', 'public', false, 'https://www.gov.uk/bank-holidays', date '2026-11-06'),
  ('GB', 'northern-ireland', 'Summer bank holiday', date '2027-08-30', date '2027-08-30', 'public', false, 'https://www.gov.uk/bank-holidays', date '2026-11-06'),
  ('GB', 'northern-ireland', 'Christmas Day (substitute day)', date '2027-12-27', date '2027-12-27', 'public', false, 'https://www.gov.uk/bank-holidays', date '2026-11-06'),
  ('GB', 'northern-ireland', 'Boxing Day (substitute day)', date '2027-12-28', date '2027-12-28', 'public', false, 'https://www.gov.uk/bank-holidays', date '2026-11-06')
on conflict do nothing;

create or replace function private.holiday_region(p_country text, p_address text) returns text
language sql immutable set search_path = '' as $$
  with a as (
    select upper(coalesce(p_address, '')) as addr,
           -- The last UK postcode in the address: its outward code (for example EH1, G2, BT9, TD15).
           (select m.v[1] from regexp_matches(upper(coalesce(p_address, '')),
              '\m([A-Z]{1,2}[0-9][0-9A-Z]?)\s*[0-9][A-Z]{2}\M', 'g') with ordinality as m(v, n)
             order by m.n desc limit 1) as outward
  ), p as (
    select addr, outward, substring(outward from '^[A-Z]+') as area from a
  )
  select case
    when upper(coalesce(p_country, '')) <> 'GB' then null
    -- The nation as a part of its own ("..., Edinburgh, Scotland, UK"), never inside a street name ("Scotland Road").
    when addr ~ '(^|,)\s*NORTHERN IRELAND\s*(,|$)' then 'northern-ireland'
    when addr ~ '(^|,)\s*SCOTLAND\s*(,|$)' then 'scotland'
    when area = 'BT' then 'northern-ireland'
    when outward in ('TD12', 'TD15') then
      case when addr ~ '\m(SCOTTISH BORDERS|COLDSTREAM)\M' then 'scotland' else 'england-and-wales' end
    when area in ('AB', 'DD', 'DG', 'EH', 'FK', 'G', 'HS', 'IV', 'KA', 'KW', 'KY', 'ML', 'PA', 'PH', 'TD', 'ZE') then 'scotland'
    else 'england-and-wales'
  end
  from p
$$;
comment on function private.holiday_region(text, text) is 'Launch 2 (30.36 item 9): the UK nation of a GB business from its Google address, for its bank holidays.';
revoke execute on function private.holiday_region(text, text) from public, anon, authenticated;

create or replace function private.holiday_region(p_country text) returns text
language sql immutable set search_path = '' as $$ select private.holiday_region(p_country, null) $$;
revoke execute on function private.holiday_region(text) from public, anon, authenticated;

-- The detector and the calendar, as before, with the nation read from the address.
create or replace function private.detect_holidays(p_location uuid) returns integer
language plpgsql security definer set search_path = '' as $$
declare l public.locations; h record; pr public.holiday_prompts; v_today date; v_made integer := 0; v_keep text[] := '{}';
  v_how jsonb := '{}'; v_sh public.special_hours; v_when text; v_title text; v_why text;
begin
  select * into l from public.locations where id = p_location;
  if not found or l.status <> 'active' or l.concierge or l.disconnect_requested_at is not null or l.country is null then
    update public.tasks set state = 'expired', resolved_at = now(), snooze_until = null
     where location_id = p_location and kind = 'hours_confirm' and dedupe_key like 'holiday:%'
       and state in ('open', 'snoozed', 'approved', 'publishing');
    return 0;
  end if;
  v_today := (now() at time zone coalesce(l.time_zone, 'UTC'))::date;

  -- A question whose holiday is over is no longer asked.
  update public.holiday_prompts p set state = 'expired'
    from public.holidays hh
   where p.holiday_id = hh.id and p.location_id = p_location and p.state = 'asked' and hh.ends_on < v_today;

  -- Five days ahead (K-131). A holiday that began today or earlier but has not ended is still asked once.
  for h in
    select hh.* from public.holidays hh
     where hh.country = upper(l.country) and hh.region is not distinct from private.holiday_region(l.country, l.address)
       and hh.verified_on is not null and hh.ends_on >= v_today and hh.starts_on <= v_today + 5
  loop
    insert into public.holiday_prompts (location_id, holiday_id) values (p_location, h.id)
      on conflict (location_id, holiday_id) do nothing;
    select * into pr from public.holiday_prompts where location_id = p_location and holiday_id = h.id;
    if pr.state = 'expired' then continue; end if;

    -- The owner already set special hours covering these days, in the editor: that is the answer.
    if pr.state = 'asked' then
      select * into v_sh from public.special_hours s
       where s.location_id = p_location and s.state <> 'skipped' and s.start_date <= h.starts_on and s.end_date >= h.ends_on
       order by s.created_at desc limit 1;
      if found then
        update public.holiday_prompts set state = 'answered', answer = case when v_sh.closed then 'closed' else 'custom' end,
          answered_at = now(), channel = 'dashboard', special_hours_id = v_sh.id where id = pr.id;
        pr.state := 'answered';
      end if;
    end if;
    if pr.state <> 'asked' then continue; end if;

    v_keep := v_keep || ('holiday:' || pr.id);
    v_when := case when h.starts_on = h.ends_on then to_char(h.starts_on, 'FMDay FMDD FMMonth')
                   else to_char(h.starts_on, 'FMDD FMMonth') || ' to ' || to_char(h.ends_on, 'FMDD FMMonth') end;
    v_title := 'Your hours for ' || h.name;
    v_why := h.name || case when h.estimated then ' is expected on ' else ' is on ' end || v_when
      || '. Customers check Google for your hours first, so tell Kabsi what you will do.';
    if private.task_put(p_location, 'hours_confirm', 'holiday', pr.id::text, 'recommended', v_title, v_why,
      case when h.kind = 'ramadan' then 'Say whether you keep your normal hours or open on different hours for the month.'
           else 'Normal hours, closed, or custom hours.' end,
      jsonb_build_object('holiday', h.name, 'starts_on', h.starts_on, 'ends_on', h.ends_on, 'estimated', h.estimated, 'kind', h.kind,
        'prompt_id', pr.id),
      jsonb_build_object('answer', case when h.kind = 'ramadan' then jsonb_build_array('normal', 'custom')
                                        else jsonb_build_array('normal', 'closed', 'custom') end, 'prompt_id', pr.id),
      'holiday:' || pr.id) then
      v_made := v_made + 1;
    end if;
  end loop;

  -- Closed: answered is done, anything else that is no longer asked is expired.
  select coalesce(jsonb_object_agg('holiday:' || p.id, case p.state when 'answered' then 'done' else 'expired' end), '{}')
    into v_how from public.holiday_prompts p where p.location_id = p_location;
  update public.tasks t set state = coalesce(v_how ->> t.dedupe_key, 'expired'), resolved_at = now(), resolved_by = auth.uid(),
    snooze_until = null
   where t.location_id = p_location and t.kind = 'hours_confirm' and t.dedupe_key like 'holiday:%'
     and t.state in ('open', 'snoozed', 'approved', 'publishing') and not (t.dedupe_key = any (v_keep));
  return v_made;
end $$;

create or replace function public.holiday_calendar(p_location uuid, p_days integer default 120) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare l public.locations; v_today date;
begin
  if p_location is null or not public.is_member(p_location) then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into l from public.locations where id = p_location;
  v_today := (now() at time zone coalesce(l.time_zone, 'UTC'))::date;
  return jsonb_build_object(
    'prompts', (select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'name', h.name, 'starts_on', h.starts_on, 'ends_on', h.ends_on,
                 'kind', h.kind, 'estimated', h.estimated) order by h.starts_on), '[]'::jsonb)
                  from public.holiday_prompts p join public.holidays h on h.id = p.holiday_id
                 where p.location_id = p_location and p.state = 'asked' and h.ends_on >= v_today),
    'upcoming', (select coalesce(jsonb_agg(jsonb_build_object('name', h.name, 'starts_on', h.starts_on, 'ends_on', h.ends_on,
                 'kind', h.kind, 'estimated', h.estimated) order by h.starts_on), '[]'::jsonb)
                  from public.holidays h
                 where h.country = upper(coalesce(l.country, '')) and h.region is not distinct from private.holiday_region(l.country, l.address)
                   and h.verified_on is not null and h.ends_on >= v_today and h.starts_on <= v_today + greatest(1, least(coalesce(p_days, 120), 400))));
end $$;
