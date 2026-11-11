-- Outbound 2 (lane R, R-151 item 5, master plan 30.51). Additive. Sending stays locked: sending_open is not touched.
-- 1. The ramp: 5 a day in week 1, then 10 from day 8, staying 10 through December; the monthly cap stays 300.
--    20 a day waits for 400 strong matches and clean delivery numbers (lane R decides).
-- 2. The follow-up may carry the private Founding 25 invite link, kabsi.co/founding/ and 24 letters and digits (the
--    shape of app_settings.founding_invite_slug). Email 1 still carries only kabsi.co and kabsi.co/privacy.
-- Read-back:
--   select ramp_week1, ramp_week2, ramp_after, monthly_cap, sending_open, test_mode from public.outbound_settings;
--     expect: 5, 10, 10, 300, false, true
--   select private.outbound_links_ok('Details: kabsi.co/founding/AAAAAAAAAAAAAAAAAAAAAAAA', 'follow_up'),
--          private.outbound_links_ok('Details: kabsi.co/founding/AAAAAAAAAAAAAAAAAAAAAAAA', 'first'),
--          private.outbound_links_ok('kabsi.co/founding/short', 'follow_up');
--     expect: true, false, false

alter table public.outbound_settings alter column ramp_week1 set default 5;
alter table public.outbound_settings alter column ramp_week2 set default 10;
alter table public.outbound_settings alter column ramp_after set default 10;
update public.outbound_settings set ramp_week1 = 5, ramp_week2 = 10, ramp_after = 10;

create or replace function private.outbound_links_ok(p_body text, p_kind text) returns boolean
language plpgsql immutable set search_path = '' as $$
declare m text;
begin
  for m in select (regexp_matches(coalesce(p_body, ''), '((?:https?://)?(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:/[^\s]*)?)', 'gi'))[1] loop
    m := lower(regexp_replace(regexp_replace(m, '^https?://', ''), '[.,;:)]+$', ''));
    if p_kind in ('first', 'follow_up') then
      if m not in ('kabsi.co', 'kabsi.co/privacy')
         and not (p_kind = 'follow_up' and m ~ '^kabsi\.co/founding/[a-z0-9]{24}$') then
        return false;
      end if;
    else
      if not (m = 'kabsi.co' or m like 'kabsi.co/%' or m like 'www.facebook.com/profile.php?id=%' or m like 'www.instagram.com/kabsi.co%') then
        return false;
      end if;
    end if;
  end loop;
  return true;
end $$;
revoke all on function private.outbound_links_ok(text, text) from public, anon, authenticated;
