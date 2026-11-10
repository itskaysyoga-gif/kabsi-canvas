-- Tidy 2 part 2 (10 Nov 2026, master plan 30.49 item 3, R-147): the tie rule of Gate 3.
-- Of the first 10 businesses that answer, at least 3 keep requests in chats, a notebook or memory and say yes: Gate 3 opens.
-- Fewer than 2 of the first 10 keeps the request book off. Exactly 2 of the first 10 grows the window to the first 20: at
-- least 5 of the first 20 open Gate 3, fewer keep the request book off. Same counts, same rows as Onboarding 1 (R-145).
-- The verdict word 'between' (the old "exactly 2 is neither") is replaced by 'extended' (the window is the first 20 and
-- the count is not complete). The first_ten fields stay, and three fields are added: first_twenty_answered,
-- first_twenty_qualifying and window (10 or 20), so a screen that reads only the old fields keeps working.
-- Additive: create or replace of the one function, nothing is dropped, no table changes. Staff only, counts only.
create or replace function public.staff_request_answers() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v jsonb;
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  with real as (
    select l.id, l.name, l.request_tracking, l.request_tracking_at, l.early_access_whatsapp, l.early_access_at,
           least(l.request_tracking_at, l.early_access_at) as first_at
      from public.locations l
      join public.organizations o on o.id = l.organization_id
     where not l.is_demo and not o.is_demo and not coalesce(o.billing_test, false) and l.deletion_requested_at is null
  ), answered as (
    select r.*, row_number() over (order by r.first_at, r.id) as pos,
           (r.request_tracking in ('chats', 'notebook', 'memory') and r.early_access_whatsapp is true) as qualifies
      from real r where r.first_at is not null
  ), c as (
    select count(*) filter (where pos <= 10) as n10,
           count(*) filter (where pos <= 10 and qualifies) as q10,
           count(*) filter (where pos <= 20) as n20,
           count(*) filter (where pos <= 20 and qualifies) as q20
      from answered
  )
  select jsonb_build_object(
    'generated_at', now(),
    'businesses', (select count(*) from real),
    'answered_any', (select count(*) from answered),
    'tracking', jsonb_build_object(
      'answered', (select count(*) from real where request_tracking is not null),
      'booking_app', (select count(*) from real where request_tracking = 'booking_app'),
      'chats', (select count(*) from real where request_tracking = 'chats'),
      'notebook', (select count(*) from real where request_tracking = 'notebook'),
      'memory', (select count(*) from real where request_tracking = 'memory'),
      'other', (select count(*) from real where request_tracking = 'other')),
    'early_access', jsonb_build_object(
      'answered', (select count(*) from real where early_access_whatsapp is not null),
      'yes', (select count(*) from real where early_access_whatsapp is true),
      'no', (select count(*) from real where early_access_whatsapp is false)),
    'gate3', jsonb_build_object(
      'first_ten_answered', (select n10 from c),
      'first_ten_qualifying', (select q10 from c),
      'first_twenty_answered', (select n20 from c),
      'first_twenty_qualifying', (select q20 from c),
      'window', (select case when q10 = 2 and n10 >= 10 then 20 else 10 end from c),
      'verdict', (select case
        when q10 >= 3 then 'open'
        when n10 < 10 then 'collecting'
        when q10 < 2 then 'off'
        when q20 >= 5 then 'open'
        when n20 < 20 then 'extended'
        else 'off' end from c)),
    'qualifying', coalesce((select jsonb_agg(jsonb_build_object('position', a.pos, 'business', a.name,
        'answered_on', a.first_at::date, 'keeps_requests', a.request_tracking, 'in_first_ten', a.pos <= 10) order by a.pos)
      from (select * from answered where qualifies order by pos limit 10) a), '[]'::jsonb)
  ) into v;
  return v;
end $$;
revoke all on function public.staff_request_answers() from public, anon;
grant execute on function public.staff_request_answers() to authenticated;
