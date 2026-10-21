-- P0.5-03 part B: the holiday hours concierge (K-131). Five days before a public holiday Kabsi asks the owner: normal
-- hours, closed, or custom hours. The answer is the approval: "closed" and "custom" make one special hours period and
-- approve it through the one publication pipeline (10 second undo, then the publish job), "normal" records that the
-- owner answered and sends nothing. Never assume holiday hours.
--
-- 1. public.holidays            the calendar: a country, a name, a date or a run of dates, where it comes from. Seeded from
--                               official sources by scripts/build-holidays.mjs (the next migration file). A row with no
--                               verified_on is never asked about.
-- 2. public.holiday_prompts     one question per business and holiday, with the answer and, for the email path, the hash of
--                               the link (the raw link exists only in the email). The foreign keys are in the _links file.
-- 3. private.detect_holidays    replaces the stub of the task engine: opens the question 5 days ahead as a task (hours_confirm,
--                               dedupe holiday:<prompt>), notices when the owner already set special hours for those days,
--                               closes what was answered and expires what passed.
-- 4. the answer paths           private.holiday_answer is the one place an answer is decided; the content Edge Function (signed
--                               in, public.answer_holiday_as) and the email link page (public.use_holiday_link) call it.
--
-- Additive only. Nothing is dropped. Both tables are closed to the browser; the app reads through public.holiday_calendar.

create table public.holidays (
  id uuid primary key default gen_random_uuid(),
  country text not null check (country ~ '^[A-Z]{2}$'),
  region text check (region is null or region ~ '^[a-z-]{2,40}$'),
  name text not null check (length(name) between 2 and 80),
  starts_on date not null,
  ends_on date not null,
  kind text not null check (kind in ('public', 'islamic', 'ramadan')),
  -- A date that follows the moon: Kabsi says "expected" and lets the owner move the days.
  estimated boolean not null default false,
  source text not null check (source ~ '^https://'),
  -- Null: not checked against an official source, so never asked about.
  verified_on date,
  constraint holiday_span check (ends_on >= starts_on and ends_on - starts_on < 40)
);
create unique index holidays_unique on public.holidays (country, coalesce(region, ''), starts_on, name);
create index holidays_country_date on public.holidays (country, starts_on) where verified_on is not null;
comment on table public.holidays is 'P0.5-03 (K-131): public holidays per country, from official sources (scripts/build-holidays.mjs).';
alter table public.holidays enable row level security;
revoke all on public.holidays from public, anon, authenticated;
grant select on public.holidays to service_role;

create table public.holiday_prompts (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null,
  holiday_id uuid not null,
  state text not null default 'asked' check (state in ('asked', 'answered', 'expired')),
  asked_at timestamptz not null default now(),
  -- The email went out; the link's hash and last day (the raw link is only in the email).
  notified_at timestamptz,
  token_hash text unique,
  token_expires_at timestamptz,
  answer text check (answer in ('normal', 'closed', 'custom')),
  answered_at timestamptz,
  answered_by uuid,
  channel text check (channel in ('dashboard', 'email_link', 'whatsapp')),
  special_hours_id uuid,
  constraint answered_has_answer check ((state = 'answered') = (answer is not null)),
  unique (location_id, holiday_id)
);
comment on table public.holiday_prompts is 'P0.5-03 (K-131): one holiday question per business and holiday; the answer is the approval.';
create index holiday_prompts_open on public.holiday_prompts (location_id) where state = 'asked';
alter table public.holiday_prompts enable row level security;
revoke all on public.holiday_prompts from public, anon, authenticated;
grant select, insert, update on public.holiday_prompts to service_role;

-- 3. The detector ---------------------------------------------------------------------------------------------------------

-- Public holidays that apply to a business without a region of its own: the whole country, and for the United Kingdom
-- England and Wales (the other nations have their own bank holidays; a region setting comes later).
create function private.holiday_region(p_country text) returns text
language sql immutable set search_path = '' as $$ select case when upper(p_country) = 'GB' then 'england-and-wales' end $$;

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
     where hh.country = upper(l.country) and hh.region is not distinct from private.holiday_region(l.country)
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

-- 4. The answer ---------------------------------------------------------------------------------------------------------

-- One answer, decided in one place. p_user is null only for "normal" from an email link (it publishes nothing); the
-- two answers that publish need a member the approval policy lets approve hours. p_from and p_to let the owner move
-- the days (the Islamic dates follow the moon): within 3 days of the expected dates, never in the past.
create function private.holiday_answer(p_prompt uuid, p_user uuid, p_channel text, p_answer text, p_open text, p_close text,
  p_from date, p_to date) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare pr public.holiday_prompts; h public.holidays; l public.locations; v_today date; v_from date; v_to date;
  v_open time; v_close time; v_sh uuid; r jsonb;
begin
  if p_answer not in ('normal', 'closed', 'custom') then raise exception 'bad_answer'; end if;
  if p_channel not in ('dashboard', 'email_link') then raise exception 'bad_channel'; end if;
  select * into pr from public.holiday_prompts where id = p_prompt for update;
  if not found then raise exception 'unknown_prompt'; end if;
  select * into h from public.holidays where id = pr.holiday_id;
  select * into l from public.locations where id = pr.location_id;
  if pr.state = 'answered' then
    return jsonb_build_object('state', 'answered', 'answer', pr.answer, 'repeat', true);
  end if;
  if pr.state <> 'asked' then raise exception 'holiday_passed'; end if;
  v_today := (now() at time zone coalesce(l.time_zone, 'UTC'))::date;
  if h.ends_on < v_today then raise exception 'holiday_passed'; end if;
  if p_user is not null and not exists (select 1 from public.location_members where location_id = l.id and user_id = p_user) then
    raise exception 'not_member';
  end if;

  if p_answer = 'normal' then
    update public.holiday_prompts set state = 'answered', answer = 'normal', answered_at = now(), answered_by = p_user,
      channel = p_channel where id = pr.id;
    return jsonb_build_object('state', 'answered', 'answer', 'normal');
  end if;

  if p_user is null then raise exception 'sign_in_required'; end if;
  if h.kind = 'ramadan' and p_answer = 'closed' then raise exception 'bad_answer'; end if;
  if not private.may_approve(l.id, 'hours', p_user, false) then raise exception 'not_allowed_to_approve' using errcode = '42501'; end if;
  if l.status <> 'active' or l.google_location_id is null then raise exception 'location_not_active'; end if;
  if l.concierge then raise exception 'concierge_profile'; end if;

  v_from := coalesce(p_from, h.starts_on);
  v_to := coalesce(p_to, h.ends_on);
  if v_to < v_from or v_to < v_today or v_from < h.starts_on - 3 or v_to > h.ends_on + 3 or v_to - v_from >= 40 then
    raise exception 'bad_dates';
  end if;
  if p_answer = 'custom' then
    if p_open !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' or p_close !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then raise exception 'bad_times'; end if;
    v_open := p_open::time; v_close := p_close::time;
    -- Closing at 00:00 is the end of the day; any other close must be after the open.
    if v_close <= v_open and v_close <> time '00:00' then raise exception 'bad_times'; end if;
  end if;

  begin
    insert into public.special_hours (location_id, start_date, end_date, closed, open_time, close_time, reason)
    values (l.id, v_from, v_to, p_answer = 'closed', case when p_answer = 'custom' then v_open end,
            case when p_answer = 'custom' then v_close end, left(h.name, 120))
    returning id into v_sh;
  exception when unique_violation then
    raise exception 'already_saved';
  end;
  r := public.approve_publication('special_hours', v_sh, '{}'::jsonb, p_user, p_channel);
  update public.holiday_prompts set state = 'answered', answer = p_answer, answered_at = now(), answered_by = p_user,
    channel = p_channel, special_hours_id = v_sh where id = pr.id;
  return jsonb_build_object('state', 'answered', 'answer', p_answer, 'special_hours_id', v_sh,
    'publication_id', r ->> 'publication_id', 'publish_after', r ->> 'publish_after', 'publication_state', r ->> 'state');
end $$;

-- Signed in (dashboard): the content Edge Function passes the user it verified.
create function public.answer_holiday_as(p_prompt uuid, p_user uuid, p_answer text, p_open text, p_close text, p_from date, p_to date)
returns jsonb language sql security definer set search_path = '' as $$
  select private.holiday_answer(p_prompt, p_user, 'dashboard', p_answer, p_open, p_close, p_from, p_to)
$$;
revoke execute on function public.answer_holiday_as(uuid, uuid, text, text, text, date, date) from public, anon, authenticated;
grant execute on function public.answer_holiday_as(uuid, uuid, text, text, text, date, date) to service_role;

-- The email link page. The token is the credential for "normal"; "closed" and "custom" need the signed-in member.
create function public.use_holiday_link(p_token_hash text, p_answer text, p_open text, p_close text, p_from date, p_to date,
  p_session_user uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare pr public.holiday_prompts; v_user uuid := p_session_user;
begin
  select * into pr from public.holiday_prompts where token_hash = p_token_hash;
  if not found then raise exception 'invalid_link'; end if;
  if pr.token_expires_at < now() and pr.state = 'asked' then raise exception 'link_expired'; end if;
  -- "Normal hours" publishes nothing, so the link alone is enough; a session that is not a member of the business is ignored.
  if p_answer = 'normal' and v_user is not null
     and not exists (select 1 from public.location_members where location_id = pr.location_id and user_id = v_user) then
    v_user := null;
  end if;
  return private.holiday_answer(pr.id, v_user, 'email_link', p_answer, p_open, p_close, p_from, p_to);
end $$;
revoke execute on function public.use_holiday_link(text, text, text, text, date, date, uuid) from public, anon, authenticated;
grant execute on function public.use_holiday_link(text, text, text, text, date, date, uuid) to service_role;

-- What the link page shows. Reads only.
create function public.holiday_link_view(p_token_hash text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare pr public.holiday_prompts; h public.holidays; l public.locations; f public.knowledge_facts; v_status text;
begin
  select * into pr from public.holiday_prompts where token_hash = p_token_hash;
  if not found then return jsonb_build_object('status', 'invalid'); end if;
  select * into h from public.holidays where id = pr.holiday_id;
  select * into l from public.locations where id = pr.location_id;
  select * into f from public.knowledge_facts where location_id = l.id and slot = 'profile.regular_hours' and superseded_by is null;
  v_status := case when pr.state = 'answered' then 'answered'
                   when pr.state = 'expired' or pr.token_expires_at < now() then 'expired' else 'ok' end;
  return jsonb_build_object('status', v_status, 'business', l.name, 'demo', l.is_demo, 'location_id', l.id,
    'holiday', jsonb_build_object('name', h.name, 'starts_on', h.starts_on, 'ends_on', h.ends_on, 'kind', h.kind, 'estimated', h.estimated),
    'answer', pr.answer, 'special_hours_id', pr.special_hours_id,
    'regular_hours', case when f.status = 'verified' then f.value ->> 'display' end);
end $$;
revoke execute on function public.holiday_link_view(text) from public, anon, authenticated;
grant execute on function public.holiday_link_view(text) to service_role;

-- The email job: the questions whose email has not gone out. Service role only.
create function public.holiday_prompts_to_send(p_location uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'name', h.name, 'starts_on', h.starts_on, 'ends_on', h.ends_on,
      'kind', h.kind, 'estimated', h.estimated, 'business', l.name) order by h.starts_on), '[]'::jsonb)
    from public.holiday_prompts p join public.holidays h on h.id = p.holiday_id join public.locations l on l.id = p.location_id
   where p.location_id = p_location and p.state = 'asked' and p.notified_at is null and h.ends_on >= current_date - 1
$$;
revoke execute on function public.holiday_prompts_to_send(uuid) from public, anon, authenticated;
grant execute on function public.holiday_prompts_to_send(uuid) to service_role;

create function public.mark_holiday_prompt_sent(p_prompt uuid, p_token_hash text, p_expires timestamptz) returns void
language sql security definer set search_path = '' as $$
  update public.holiday_prompts set token_hash = p_token_hash, token_expires_at = p_expires, notified_at = now()
   where id = p_prompt and state = 'asked'
$$;
revoke execute on function public.mark_holiday_prompt_sent(uuid, text, timestamptz) from public, anon, authenticated;
grant execute on function public.mark_holiday_prompt_sent(uuid, text, timestamptz) to service_role;

-- What the Hours screen shows: the open questions and the next holidays for this business's country. Members only.
create function public.holiday_calendar(p_location uuid, p_days integer default 120) returns jsonb
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
                 where h.country = upper(coalesce(l.country, '')) and h.region is not distinct from private.holiday_region(l.country)
                   and h.verified_on is not null and h.ends_on >= v_today and h.starts_on <= v_today + greatest(1, least(coalesce(p_days, 120), 400))));
end $$;
revoke execute on function public.holiday_calendar(uuid, integer) from public, anon;
grant execute on function public.holiday_calendar(uuid, integer) to authenticated;
