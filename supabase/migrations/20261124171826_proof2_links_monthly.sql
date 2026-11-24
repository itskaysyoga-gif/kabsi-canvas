-- PROOF-2 (engineering plan 3.1): link watch, the monthly report, placement links and the competitor read ledger.
-- Additive only: new tables, new functions, one new column. Two existing functions are replaced with the same signature:
-- create_review_link (the cap of 5 review links no longer counts placement links) and task_close_except (the generic
-- task detectors leave the link watch's own tasks alone). Nothing is dropped and no row is changed.
--
--   1. cards.placement and public.create_placement_link: one labelled short link per place a business already puts its link
--      in (booking confirmation, receipt, email signature, social bio). It is an ordinary card of kind 'link', so go.kabsi.co,
--      kv-sync and the tap function serve it with no change. Kabsi sends nothing and stores no customer data.
--   2. public.link_taps: taps per card and per placement for any period, bots left out, this business's taps only.
--   3. public.link_watch (counts and times, never an address), public.link_watch_events (what happened, 100 days) and
--      public.link_watch_event (the one writer of the link watch's task: kind profile_gap, dedupe key link_watch:<kind>).
--   4. public.monthly_reports: the three-band report. Everything derived from Google's API sits under the key "google" and
--      is removed after 30 days by public.clear_old_monthly_numbers (K-40, register section 2). Competitor figures from
--      Places are never stored at all (master plan 30.10).
--   5. public.competitor_reads: a log with no Google content, so a competitor read is made at most once a month and a
--      request at most once a week.
--   6. Two daily or hourly pg_cron offers: kabsi_link_watch and kabsi_monthly_report, each making ordinary jobs.

-- 1. Placement links ----------------------------------------------------------------------------------------------------
alter table public.cards add column if not exists placement text;
alter table public.cards add constraint cards_placement_check
  check (placement is null or placement in ('booking', 'receipt', 'email_signature', 'social_bio'));
create unique index cards_one_placement_per_location on public.cards (location_id, placement) where placement is not null;
comment on column public.cards.placement is 'PROOF-2: the place a business pastes this link (booking, receipt, email_signature, social_bio). Null for review links and cards.';

-- The cap of 5 review links does not count placement links.
create or replace function public.create_review_link(p_location uuid, p_label text default null) returns text
language plpgsql security definer set search_path = '' as $$
declare alphabet constant text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ'; v_code text; v_place text;
begin
  if not public.is_member(p_location) then raise exception 'forbidden' using errcode = '42501'; end if;
  select place_id into v_place from public.locations where id = p_location;
  if v_place is null then raise exception 'location_has_no_place_id'; end if;
  if (select count(*) from public.cards where location_id = p_location and kind = 'link' and placement is null) >= 5 then
    raise exception 'too_many_links';
  end if;
  loop
    select string_agg(substr(alphabet, 1 + (get_byte(b, i) % 31), 1), '') into v_code
      from (select extensions.gen_random_bytes(6) as b) r, generate_series(0,5) i;
    begin
      insert into public.cards(code, kind) values (v_code, 'link');
      exit;
    exception when unique_violation then null;
    end;
  end loop;
  -- The update (not the insert) fires cards_kv_sync, which publishes the code to the Worker.
  update public.cards set location_id = p_location, status = 'active', activated_at = now(),
    destination = 'https://search.google.com/local/writereview?placeid=' || v_place,
    label = coalesce(nullif(left(trim(p_label), 60), ''), 'Review link')
  where code = v_code;
  return v_code;
end $$;
revoke execute on function public.create_review_link(uuid, text) from public, anon;
grant execute on function public.create_review_link(uuid, text) to authenticated;

-- One link per placement. Asking again returns the same code.
create or replace function public.create_placement_link(p_location uuid, p_placement text) returns text
language plpgsql security definer set search_path = '' as $$
declare alphabet constant text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ'; v_code text; v_place text; v_label text;
begin
  if not public.is_member(p_location) then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_placement is null or p_placement not in ('booking', 'receipt', 'email_signature', 'social_bio') then
    raise exception 'bad_placement';
  end if;
  perform pg_advisory_xact_lock(hashtext('placement:' || p_location::text));
  select code into v_code from public.cards where location_id = p_location and placement = p_placement;
  if found then return v_code; end if;
  select place_id into v_place from public.locations where id = p_location;
  if v_place is null then raise exception 'location_has_no_place_id'; end if;
  v_label := case p_placement when 'booking' then 'Booking confirmation' when 'receipt' then 'Receipt'
                              when 'email_signature' then 'Email signature' else 'Social bio' end;
  loop
    select string_agg(substr(alphabet, 1 + (get_byte(b, i) % 31), 1), '') into v_code
      from (select extensions.gen_random_bytes(6) as b) r, generate_series(0,5) i;
    begin
      insert into public.cards(code, kind, placement) values (v_code, 'link', p_placement);
      exit;
    exception when unique_violation then null;
    end;
  end loop;
  update public.cards set location_id = p_location, status = 'active', activated_at = now(),
    destination = 'https://search.google.com/local/writereview?placeid=' || v_place, label = v_label
  where code = v_code;
  return v_code;
end $$;
revoke execute on function public.create_placement_link(uuid, text) from public, anon;
grant execute on function public.create_placement_link(uuid, text) to authenticated;

-- 2. Taps per card and placement ---------------------------------------------------------------------------------------
-- Active cards and links of this business. A tap counts only when it was logged for this business; bots are left out.
-- Taps, never reviews. Members and staff, or the service role (the reports).
create or replace function public.link_taps(p_location uuid, p_from timestamptz, p_to timestamptz) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not (coalesce(auth.role(), 'service_role') = 'service_role' or public.is_member(p_location) or public.is_staff()) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'code', c.code, 'label', c.label, 'kind', c.kind, 'placement', c.placement,
             'taps', (select count(*) from public.taps t
                       where t.code = c.code and t.location_id = p_location and not t.is_bot
                         and t.created_at >= p_from and t.created_at < p_to))
           order by c.placement nulls first, c.activated_at nulls last, c.code)
      from public.cards c
     where c.location_id = p_location and c.status = 'active' and c.kind in ('card', 'link')), '[]'::jsonb);
end $$;
revoke execute on function public.link_taps(uuid, timestamptz, timestamptz) from public, anon;
grant execute on function public.link_taps(uuid, timestamptz, timestamptz) to authenticated, service_role;

-- 3. Link watch --------------------------------------------------------------------------------------------------------
-- Counts and times only: the address of a link is read from the listing at each check and never kept.
create table public.link_watch (
  location_id uuid not null references public.locations (id) on delete cascade,
  kind text not null check (kind in ('website', 'booking', 'menu')),
  failures integer not null default 0 check (failures >= 0),
  alerted boolean not null default false,
  retry_at timestamptz,
  first_failed_at timestamptz,
  checked_at timestamptz not null default now(),
  primary key (location_id, kind)
);
alter table public.link_watch enable row level security;
revoke all on public.link_watch from public, anon, authenticated;
grant select, insert, update, delete on public.link_watch to service_role;

create table public.link_watch_events (
  id bigint generated always as identity primary key,
  location_id uuid not null references public.locations (id) on delete cascade,
  kind text not null check (kind in ('website', 'booking', 'menu')),
  event text not null check (event in ('down', 'back')),
  at timestamptz not null default now()
);
create index link_watch_events_location on public.link_watch_events (location_id, at desc);
alter table public.link_watch_events enable row level security;
revoke all on public.link_watch_events from public, anon, authenticated;
grant select, insert, delete on public.link_watch_events to service_role;
create policy members_read_link_events on public.link_watch_events for select to authenticated
  using ((select public.is_member(location_id)) or (select public.is_staff()));
grant select on public.link_watch_events to authenticated;

-- The generic detectors never close the link watch's own tasks (dedupe key link_watch:<kind>).
create or replace function private.task_close_except(p_location uuid, p_kind text, p_keep text[], p_how jsonb default '{}'::jsonb,
  p_default text default 'done') returns integer
language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  update public.tasks t set state = coalesce(p_how ->> t.dedupe_key, p_default), resolved_at = now(),
    resolved_by = auth.uid(), snooze_until = null
   where t.location_id = p_location and t.kind = p_kind
     and t.state in ('open', 'snoozed', 'approved', 'publishing')
     and t.dedupe_key not like 'link\_watch:%'
     and not (t.dedupe_key = any (coalesce(p_keep, '{}')));
  get diagnostics n = row_count;
  return n;
end $$;
revoke execute on function private.task_close_except(uuid, text, text[], jsonb, text) from public, anon, authenticated, service_role;

-- The one writer: 'down' (the third failure in a row) records the event and opens one task; 'back' records it and closes the task.
create or replace function public.link_watch_event(p_location uuid, p_kind text, p_event text,
  p_title text default null, p_why text default null, p_recommendation text default null) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_kind not in ('website', 'booking', 'menu') or p_event not in ('down', 'back') then raise exception 'bad_link_event'; end if;
  insert into public.link_watch_events (location_id, kind, event) values (p_location, p_kind, p_event);
  if p_event = 'down' then
    perform private.task_put(p_location, 'profile_gap', 'link_watch', p_kind, 'recommended',
      left(coalesce(p_title, 'A link on your Google profile is not loading'), 200),
      left(coalesce(p_why, 'Kabsi tried the link 3 times and it did not load.'), 500), left(p_recommendation, 300),
      jsonb_build_object('failures', 3), null, 'link_watch:' || p_kind);
  else
    update public.tasks set state = 'done', resolved_at = now()
     where location_id = p_location and kind = 'profile_gap' and dedupe_key = 'link_watch:' || p_kind
       and state in ('open', 'snoozed', 'approved', 'publishing');
  end if;
end $$;
revoke execute on function public.link_watch_event(uuid, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.link_watch_event(uuid, text, text, text, text, text) to service_role;

-- 4. Monthly report ----------------------------------------------------------------------------------------------------
create table public.monthly_reports (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.locations (id) on delete cascade,
  month_of date not null check (extract(day from month_of) = 1),   -- the first day of the month the report is about
  data jsonb not null,
  created_at timestamptz not null default now(),
  unique (location_id, month_of)
);
alter table public.monthly_reports enable row level security;
revoke all on public.monthly_reports from public, anon, authenticated;
grant select on public.monthly_reports to authenticated;
grant select, insert, update, delete on public.monthly_reports to service_role;
create policy members_read_monthly on public.monthly_reports for select to authenticated
  using ((select public.is_member(location_id)) or (select public.is_staff()));

-- Content from Google's API is not kept beyond 30 days (register section 2): the "google" key (rating and review count as
-- read, Google's own figures, the recurring feedback labels) goes after 30 days. Kabsi's own counts stay.
create or replace function public.clear_old_monthly_numbers() returns integer
language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  update public.monthly_reports set data = data - 'google'
   where created_at < now() - interval '30 days' and data ? 'google';
  get diagnostics n = row_count;
  delete from public.link_watch_events where at < now() - interval '100 days';
  return n;
end $$;
revoke execute on function public.clear_old_monthly_numbers() from public, anon, authenticated;
grant execute on function public.clear_old_monthly_numbers() to service_role;

-- 5. Competitor reads --------------------------------------------------------------------------------------------------
-- A log of when a read was made, never of what it returned.
create table public.competitor_reads (
  id bigint generated always as identity primary key,
  location_id uuid not null references public.locations (id) on delete cascade,
  kind text not null check (kind in ('monthly', 'request')),
  read_at timestamptz not null default now()
);
create index competitor_reads_location on public.competitor_reads (location_id, read_at desc);
alter table public.competitor_reads enable row level security;
revoke all on public.competitor_reads from public, anon, authenticated;
grant select, insert, delete on public.competitor_reads to service_role;

-- 6. The offers ---------------------------------------------------------------------------------------------------------
create or replace function private.offer_link_watch() returns integer
language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  with added as (
    insert into public.jobs (kind, location_id, dedupe_key)
    select 'link_watch', l.id, 'link_watch:' || l.id
      from public.locations l
     where l.status = 'active' and l.google_location_id is not null and not l.concierge and not coalesce(l.is_demo, false)
       and l.google_location_id not like 'locations/concierge-%'
    on conflict (dedupe_key) where dedupe_key is not null and state in ('pending', 'running', 'retrying') do nothing
    returning 1
  )
  select count(*) into n from added;
  return n;
end $$;
revoke all on function private.offer_link_watch() from public, anon, authenticated, service_role;

-- The 1st of the month from 08:00 in the business's own time zone, with a catch-up until the 3rd if an outage skipped it.
-- One job per business per month; the report row's unique key keeps it single.
create or replace function private.offer_monthly_reports() returns integer
language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  with due as (
    select l.id, (date_trunc('month', (now() at time zone l.time_zone) - interval '1 month'))::date as month_of
      from public.locations l
     where l.status = 'active' and l.google_location_id is not null and not l.concierge and not coalesce(l.is_demo, false)
       and l.google_location_id not like 'locations/concierge-%'
       and ((extract(day from now() at time zone l.time_zone) = 1 and extract(hour from now() at time zone l.time_zone) >= 8)
            or extract(day from now() at time zone l.time_zone) between 2 and 3)
  ), added as (
    insert into public.jobs (kind, location_id, dedupe_key, payload)
    select 'monthly_report', d.id, 'monthly_report:' || d.id || ':' || to_char(d.month_of, 'YYYY-MM'),
           jsonb_build_object('month_of', d.month_of)
      from due d
     where not exists (select 1 from public.monthly_reports m where m.location_id = d.id and m.month_of = d.month_of)
    on conflict (dedupe_key) where dedupe_key is not null and state in ('pending', 'running', 'retrying') do nothing
    returning 1
  )
  select count(*) into n from added;
  return n;
end $$;
revoke all on function private.offer_monthly_reports() from public, anon, authenticated, service_role;

select cron.schedule('kabsi_link_watch', '17 5 * * *', $$select private.offer_link_watch()$$);
select cron.schedule('kabsi_monthly_report', '7 * * * *', $$select private.offer_monthly_reports()$$);
select cron.schedule('kabsi_monthly_clear', '11 3 * * *', $$select public.clear_old_monthly_numbers()$$);
