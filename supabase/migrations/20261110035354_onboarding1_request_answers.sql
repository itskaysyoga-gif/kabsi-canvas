-- Onboarding 1 (10 Nov 2026, master plan 30.48, R-145): two optional questions asked of every new business in signed-in
-- onboarding, after its business is chosen, and changeable later on About your business.
--   1. How do you keep track of client requests today?  One choice: a booking app (with an optional app name), WhatsApp or
--      Instagram chats, a notebook or diary, memory, something else.
--   2. Want early access to new WhatsApp tools for your business?  Yes or No.
-- Both can be skipped. The answers are stored with the location, with the date each was first answered. Gate 3 reads them
-- (counts only) through public.staff_request_answers(). Nothing is sent because of an answer: no email, no WhatsApp message.
--
-- Access is the location's own: the columns are read through the existing locations policy (a member of the business or
-- staff; another business reads nothing) and written only through public.save_request_answers, which checks the caller is
-- an owner or manager of the business. The browser never writes the table directly.
-- Additive only: alter add, create or replace, comment, grant, revoke. Nothing is dropped, nothing is backfilled.

-- 1. The columns, on the location -------------------------------------------------------------------------------------------
alter table public.locations
  add column if not exists request_tracking text,
  add column if not exists request_tracking_app text,
  add column if not exists request_tracking_at timestamptz,
  add column if not exists early_access_whatsapp boolean,
  add column if not exists early_access_at timestamptz,
  add column if not exists onboarding_questions_at timestamptz;

alter table public.locations
  add constraint locations_request_tracking_check
    check (request_tracking is null or request_tracking in ('booking_app', 'chats', 'notebook', 'memory', 'other')),
  add constraint locations_request_tracking_app_check
    check (request_tracking_app is null or (request_tracking = 'booking_app' and char_length(btrim(request_tracking_app)) between 1 and 80)),
  add constraint locations_request_tracking_at_check
    check ((request_tracking is null) = (request_tracking_at is null)),
  add constraint locations_early_access_at_check
    check ((early_access_whatsapp is null) = (early_access_at is null));

comment on column public.locations.request_tracking is
  'Onboarding 1 (R-145): how the business keeps track of client requests today. booking_app, chats, notebook, memory, other. Null: not answered or skipped.';
comment on column public.locations.request_tracking_app is
  'Onboarding 1: the name of the booking app, only with request_tracking booking_app. Optional, 80 characters.';
comment on column public.locations.request_tracking_at is
  'Onboarding 1: when the first question was first answered. Kept when the answer is changed, cleared when it is removed.';
comment on column public.locations.early_access_whatsapp is
  'Onboarding 1 (R-145): true Yes, false No, null not answered or skipped. No message is sent because of this answer.';
comment on column public.locations.early_access_at is
  'Onboarding 1: when the second question was first answered. Kept when the answer is changed, cleared when it is removed.';
comment on column public.locations.onboarding_questions_at is
  'Onboarding 1: when the owner continued or skipped the two questions in onboarding, so they are not asked again.';

-- 2. Save the answers (owner or manager of the business) -------------------------------------------------------------------
-- Replaces both answers: a null removes that answer. The date of an answer that stays answered is kept, so the order of the
-- first businesses to answer does not move when someone changes their mind.
create or replace function public.save_request_answers(p_location uuid, p_tracking text, p_app text, p_early boolean)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  l public.locations;
  v_tracking text := nullif(btrim(p_tracking), '');
  v_app text := nullif(btrim(p_app), '');
  v_out jsonb;
begin
  if v_uid is null then raise exception 'sign_in_required' using errcode = '42501'; end if;
  if not public.has_location_role(p_location, array['owner', 'manager']) then raise exception 'forbidden' using errcode = '42501'; end if;
  if v_tracking is not null and v_tracking not in ('booking_app', 'chats', 'notebook', 'memory', 'other') then
    raise exception 'bad_request_tracking' using errcode = '22023';
  end if;
  if v_tracking is distinct from 'booking_app' then v_app := null; end if;
  if v_app is not null and char_length(v_app) > 80 then raise exception 'app_name_too_long' using errcode = '22023'; end if;

  select * into l from public.locations where id = p_location for update;
  if not found then raise exception 'forbidden' using errcode = '42501'; end if;

  update public.locations set
    request_tracking = v_tracking,
    request_tracking_app = v_app,
    request_tracking_at = case when v_tracking is null then null else coalesce(l.request_tracking_at, now()) end,
    early_access_whatsapp = p_early,
    early_access_at = case when p_early is null then null else coalesce(l.early_access_at, now()) end,
    onboarding_questions_at = coalesce(l.onboarding_questions_at, now())
   where id = p_location;

  v_out := jsonb_build_object('request_tracking', v_tracking, 'request_tracking_app', v_app, 'early_access_whatsapp', p_early);
  perform private.audit('user', v_uid, 'request_answers_saved', p_location, 'location', p_location::text,
    jsonb_build_object('request_tracking', l.request_tracking, 'early_access_whatsapp', l.early_access_whatsapp),
    jsonb_build_object('request_tracking', v_tracking, 'early_access_whatsapp', p_early), 'dashboard', 'saved');
  return v_out;
end $$;
revoke all on function public.save_request_answers(uuid, text, text, boolean) from public, anon;
grant execute on function public.save_request_answers(uuid, text, text, boolean) to authenticated;

-- 3. The facts onboarding reads (service role) and the member's status gain one field ---------------------------------------
-- Same body as V4's, plus 'questions_done': the owner has continued or skipped the two questions.
create or replace function private.onboarding_facts(p_location uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'location_id', l.id, 'business', l.name, 'time_zone', coalesce(l.time_zone, 'UTC'), 'is_demo', l.is_demo,
    'check', (select jsonb_build_object('code', f.code, 'term', f.term) from public.free_checks f
               where f.location_id = l.id order by f.created_at desc limit 1),
    'confirmed', l.manage_confirmed_at is not null,
    'whatsapp', exists (select 1 from public.location_members m join public.whatsapp_optins o on o.user_id = m.user_id
                         where m.location_id = l.id and m.role = 'owner' and o.state = 'active' and o.phone is not null),
    'setup_ok', l.setup_whatsapp_at is not null,
    'keyword', (select k.keyword from public.visibility_keywords k where k.location_id = l.id and k.active
                  and k.confirmed_at is not null order by k.created_at limit 1),
    'consent', l.consent_at is not null,
    'accepted', l.access_granted_at is not null,
    'checked', coalesce(g.access_state = 'granted' and g.voice_of_merchant is true and g.last_successful_sync_at is not null, false),
    'trial_ends_at', (select s.trial_ends_at from public.subscriptions s where s.organization_id = l.organization_id
                       order by s.created_at desc limit 1),
    'first_task_done', l.first_task_done_at is not null,
    'questions_done', l.onboarding_questions_at is not null)
  from public.locations l
  left join public.google_connections g on g.location_id = l.id
  where l.id = p_location
$$;
revoke all on function private.onboarding_facts(uuid) from public, anon, authenticated;

-- 4. The staff view: counts only (Gate 3's evidence, master plan 30.48) -----------------------------------------------------
-- Real businesses only: demo and test businesses (is_demo, billing_test) and businesses that asked to leave are left out.
-- "Answered" means the business answered at least one question; its place in the order is its first answer, whichever
-- question that was. A business qualifies when it keeps requests in chats, a notebook or memory AND said yes to early access.
-- Gate 3 (30.48): of the first 10 businesses that answer, at least 3 qualify, the first being the pilot. Fewer than 2 of 10
-- keeps the request book off. The verdict is a word for the page, not a decision: 'collecting' until 10 have answered
-- (or 3 already qualify), then 'open', 'off', or 'between' (2 of 10, which the rule does not settle).
-- No email, phone or app name is returned, only the business name and the dates the staff pages already show.
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
  ), first_ten as (select * from answered where pos <= 10)
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
      'first_ten_answered', (select count(*) from first_ten),
      'first_ten_qualifying', (select count(*) from first_ten where qualifies),
      'verdict', case
        when (select count(*) from first_ten where qualifies) >= 3 then 'open'
        when (select count(*) from first_ten) < 10 then 'collecting'
        when (select count(*) from first_ten where qualifies) < 2 then 'off'
        else 'between' end),
    'qualifying', coalesce((select jsonb_agg(jsonb_build_object('position', a.pos, 'business', a.name,
        'answered_on', a.first_at::date, 'keeps_requests', a.request_tracking, 'in_first_ten', a.pos <= 10) order by a.pos)
      from (select * from answered where qualifies order by pos limit 10) a), '[]'::jsonb)
  ) into v;
  return v;
end $$;
revoke all on function public.staff_request_answers() from public, anon;
grant execute on function public.staff_request_answers() to authenticated;
