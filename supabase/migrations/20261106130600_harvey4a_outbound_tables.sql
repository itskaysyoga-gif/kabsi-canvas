-- Harvey 4A part A (master plan 30.39, R-119): Outbound's own tables in Kabsi. Staff read through RLS (is_staff), staff
-- act through the security definer RPCs below, and the outbound functions use the service role. Sending stays locked:
-- outbound_settings starts with sending_open false and test_mode true, and nothing in this file or in any RPC can set
-- sending_open true (only lane R, by a migration of its own). Counts for Harvey's dashboard come from two views that
-- hold numbers and dates only.

-- 1. Settings: one row. -----------------------------------------------------------------------------------------------
create table public.outbound_settings (
  id boolean primary key default true check (id),
  sending_open boolean not null default false,
  test_mode boolean not null default true,
  open_countries text[] not null default '{}' check (open_countries <@ array['GB', 'IE', 'AE', 'SA', 'QA', 'KW', 'BH', 'OM', 'AU', 'NZ', 'SG', 'CA', 'US']),
  ramp_week1 integer not null default 3 check (ramp_week1 between 0 and 50),
  ramp_week2 integer not null default 5 check (ramp_week2 between 0 and 50),
  ramp_after integer not null default 10 check (ramp_after between 0 and 50),
  monthly_cap integer not null default 300 check (monthly_cap between 0 and 300),
  started_on date,
  stopped_reason text check (char_length(stopped_reason) <= 300),
  stopped_at timestamptz,
  next_send_at timestamptz,
  updated_at timestamptz not null default now()
);
comment on table public.outbound_settings is 'Outbound (30.39): the lock. sending_open is set true only by lane R; any stop sets it false with stopped_reason.';
insert into public.outbound_settings (id) values (true) on conflict do nothing;

-- 2. Prospects: one row per business Outbound may write to, with where its email and detail came from. ------------------
create table public.outbound_prospects (
  id uuid primary key default gen_random_uuid(),
  harvey_company_id text not null check (char_length(harvey_company_id) between 1 and 200),
  country text not null check (country ~ '^[A-Z]{2}$'),
  industry text not null check (char_length(industry) between 2 and 60),
  city text not null check (char_length(city) between 1 and 80),
  business_name text not null check (char_length(business_name) between 2 and 120),
  email text not null check (email ~ '^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$'),
  email_domain text not null check (email_domain ~ '^[a-z0-9.-]+\.[a-z]{2,24}$'),
  time_zone text not null default 'Europe/London' check (char_length(time_zone) between 3 and 60),
  source_page text not null check (source_page ~ '^https?://' and char_length(source_page) <= 2000),
  source_date date not null,
  company_number text check (company_number ~ '^[A-Z0-9]{6,10}$'),
  company_status text check (char_length(company_status) <= 40),
  detail_kind text not null check (detail_kind in ('booking', 'hours', 'instagram', 'updated')),
  detail_used text not null check (char_length(detail_used) between 10 and 300),
  status text not null default 'drafted' check (status in
    ('drafted', 'approved', 'written', 'needs_you', 'answered', 'interested', 'opted_out', 'bounced', 'skipped', 'closed')),
  interested boolean not null default false,
  test boolean not null default false,
  last_email_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index outbound_prospects_email on public.outbound_prospects (lower(email));
create unique index outbound_prospects_company on public.outbound_prospects (harvey_company_id);
create index outbound_prospects_domain on public.outbound_prospects (email_domain);
comment on table public.outbound_prospects is 'Outbound (30.39): a business Outbound may write to. Deleted 90 days after the last email with no reply (only its domain hash stays); a no keeps only the hash.';

-- 3. Messages: Email 1, its follow-up, and the replies Rashid sends. ---------------------------------------------------
create table public.outbound_messages (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references public.outbound_prospects(id) on delete cascade,
  parent_id uuid references public.outbound_messages(id) on delete cascade,
  kind text not null check (kind in ('first', 'follow_up', 'reply')),
  to_address text not null check (to_address ~ '^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$'),
  subject text not null check (char_length(subject) between 3 and 200),
  body text not null check (char_length(body) between 20 and 4000),
  status text not null default 'draft' check (status in ('draft', 'approved', 'sent', 'skipped', 'cancelled', 'failed')),
  send_after timestamptz,
  sent_at timestamptz,
  message_id text unique check (message_id ~ '^<[^<>\s]{6,250}>$'),
  in_reply_to text check (char_length(in_reply_to) <= 300),
  references_ids text check (char_length(references_ids) <= 2000),
  approved_by uuid,
  approved_at timestamptz,
  error text check (char_length(error) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index outbound_messages_due on public.outbound_messages (send_after) where status = 'approved';
create index outbound_messages_prospect on public.outbound_messages (prospect_id);
create unique index outbound_messages_one_first on public.outbound_messages (prospect_id) where kind = 'first';
create unique index outbound_messages_one_follow_up on public.outbound_messages (prospect_id) where kind = 'follow_up';

-- 4. Events: what came back. ---------------------------------------------------------------------------------------------
create table public.outbound_events (
  id bigint generated always as identity primary key,
  prospect_id uuid references public.outbound_prospects(id) on delete cascade,
  message_id uuid references public.outbound_messages(id) on delete cascade,
  kind text not null check (kind in ('reply', 'bounce', 'opt_out', 'auto_reply', 'complaint')),
  intent text check (intent in ('yes', 'other')),
  needs_rashid boolean not null default false,
  handled_at timestamptz,
  inbound_id text not null unique check (char_length(inbound_id) between 3 and 300),
  reply_subject text check (char_length(reply_subject) <= 200),
  reply_text text check (char_length(reply_text) <= 4000),
  received_at timestamptz not null default now()
);
create index outbound_events_prospect on public.outbound_events (prospect_id);
comment on column public.outbound_events.reply_text is 'A person''s own words (quote removed), kept only while the prospect exists, so Rashid can answer.';

-- 5. Suppression: sha256 of a lower-cased address or domain (the same rule as Harvey's kabsi/suppression.txt). --------
create table public.outbound_suppression (
  hash text primary key check (hash ~ '^[0-9a-f]{64}$'),
  reason text not null check (reason in ('opt_out', 'bounce', 'complaint', 'customer', 'applicant', 'partner', 'contacted', 'removed', 'manual')),
  created_at timestamptz not null default now()
);

-- 6. Daily tallies: kept when prospects are deleted, so the counts survive the 90-day rule. --------------------------
create table public.outbound_days (
  day date primary key,
  sent integer not null default 0,
  first_emails integer not null default 0,
  follow_ups integer not null default 0,
  replies integer not null default 0,
  interested integer not null default 0,
  opt_outs integer not null default 0,
  bounces integer not null default 0,
  complaints integer not null default 0
);

-- 7. Access: staff read, service role writes, nobody else. -----------------------------------------------------------
alter table public.outbound_settings enable row level security;
alter table public.outbound_prospects enable row level security;
alter table public.outbound_messages enable row level security;
alter table public.outbound_events enable row level security;
alter table public.outbound_suppression enable row level security;
alter table public.outbound_days enable row level security;
revoke all on public.outbound_settings, public.outbound_prospects, public.outbound_messages, public.outbound_events,
  public.outbound_suppression, public.outbound_days from public, anon, authenticated;
grant select on public.outbound_settings, public.outbound_prospects, public.outbound_messages, public.outbound_events
  to authenticated;
grant select, insert, update, delete on public.outbound_settings, public.outbound_prospects, public.outbound_messages,
  public.outbound_events, public.outbound_suppression, public.outbound_days to service_role;
create policy outbound_settings_staff on public.outbound_settings for select to authenticated using (public.is_staff());
create policy outbound_prospects_staff on public.outbound_prospects for select to authenticated using (public.is_staff());
create policy outbound_messages_staff on public.outbound_messages for select to authenticated using (public.is_staff());
create policy outbound_events_staff on public.outbound_events for select to authenticated using (public.is_staff());

-- The lock: no update may open sending except a migration run as postgres (lane R). The service role may close it.
create or replace function private.outbound_settings_guard() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.sending_open and not old.sending_open and current_user <> 'postgres' then
    raise exception 'outbound: sending opens only by lane R' using errcode = '42501';
  end if;
  if old.stopped_reason is not null and new.stopped_reason is null and current_user <> 'postgres' then
    raise exception 'outbound: a stop is cleared only by lane R' using errcode = '42501';
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger outbound_settings_guard before update on public.outbound_settings
  for each row execute function private.outbound_settings_guard();

-- 8. Helpers. --------------------------------------------------------------------------------------------------------
create or replace function private.outbound_sha(p text) returns text
language sql immutable set search_path = '' as $$
  select encode(sha256(convert_to(lower(btrim(coalesce(p, ''))), 'UTF8')), 'hex')
$$;

-- The keys looked up for an address: the address, its domain and every parent domain that still has a dot.
create or replace function private.outbound_keys(p_address text) returns text[]
language plpgsql immutable set search_path = '' as $$
declare v text := lower(btrim(coalesce(p_address, ''))); d text; out text[] := array[]::text[];
begin
  if v = '' then return out; end if;
  out := array[v];
  d := case when position('@' in v) > 0 then split_part(v, '@', 2) else '' end;
  while d like '%.%' loop
    out := out || d;
    d := substr(d, position('.' in d) + 1);
  end loop;
  return out;
end $$;

-- Free mail domains: a customer on one of these suppresses the address, never the whole provider.
create or replace function private.outbound_free_mail(p_domain text) returns boolean
language sql immutable set search_path = '' as $$
  select lower(coalesce(p_domain, '')) ~ '^(gmail|googlemail|outlook|hotmail|live|msn|yahoo|ymail|icloud|me|mac|aol|proton|protonmail|pm|gmx|mail|yandex|zoho|btinternet|sky|virginmedia|talktalk)\.'
$$;

create or replace function public.outbound_is_suppressed(p_address text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.outbound_suppression s
                  where s.hash = any (select private.outbound_sha(k) from unnest(private.outbound_keys(p_address)) k))
$$;

-- Add an address (and, when asked and not free mail, its domain) to the list.
create or replace function public.outbound_suppress(p_address text, p_reason text, p_domain boolean default false)
returns integer language plpgsql security definer set search_path = '' as $$
declare v text := lower(btrim(coalesce(p_address, ''))); d text; n integer := 0; c integer;
begin
  if v = '' then return 0; end if;
  insert into public.outbound_suppression (hash, reason) values (private.outbound_sha(v), p_reason) on conflict do nothing;
  get diagnostics c = row_count; n := n + c;
  d := case when position('@' in v) > 0 then split_part(v, '@', 2) else v end;
  if p_domain and d like '%.%' and not private.outbound_free_mail(d) then
    insert into public.outbound_suppression (hash, reason) values (private.outbound_sha(d), p_reason) on conflict do nothing;
    get diagnostics c = row_count; n := n + c;
  end if;
  return n;
end $$;

-- Every Kabsi customer, applicant and partner: their address and their own domain (never a free mail provider).
-- Run by outbound-prepare before choosing and by outbound-send before each tick, so the list stays current.
create or replace function public.outbound_refresh_suppression() returns integer
language plpgsql security definer set search_path = '' as $$
declare n integer := 0; r record;
begin
  for r in
    select u.email as e, case when exists (select 1 from public.founding_applications f join public.organization_members m
                                            on m.organization_id = f.organization_id where m.user_id = u.id)
                              then 'applicant' else 'customer' end as why
      from auth.users u where u.email is not null
    union all select p.email, 'partner' from public.partner_accounts p
    union all select c.email, 'applicant' from public.contacts c
  loop
    n := n + public.outbound_suppress(r.e, r.why, true);
  end loop;
  return n;
end $$;

-- A business Kabsi already knows by name in the same country (a Founding 25 application, a business on Kabsi).
create or replace function public.outbound_known_business(p_name text, p_country text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.founding_applications f
                  where lower(btrim(f.business_name)) = lower(btrim(p_name)) and f.country = p_country)
      or exists (select 1 from public.organizations o where lower(btrim(o.name)) = lower(btrim(p_name)))
$$;

-- The day's cap from the ramp: week 1 from started_on, week 2, then after. Before started_on (test mode) week 1.
create or replace function public.outbound_daily_cap(p_day date default (now() at time zone 'Europe/London')::date)
returns integer language sql stable security definer set search_path = '' as $$
  select case when s.started_on is null or p_day - s.started_on < 7 then s.ramp_week1
              when p_day - s.started_on < 14 then s.ramp_week2 else s.ramp_after end
    from public.outbound_settings s
$$;

-- 9. Tallies, by trigger. --------------------------------------------------------------------------------------------
create or replace function private.outbound_tally(p_day date, p_col text, p_n integer default 1) returns void
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.outbound_days (day) values (p_day) on conflict do nothing;
  execute format('update public.outbound_days set %I = %I + $1 where day = $2', p_col, p_col) using p_n, p_day;
end $$;

create or replace function private.outbound_on_message() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_day date;
begin
  new.updated_at := now();
  if new.status = 'sent' and old.status is distinct from 'sent' then
    v_day := (coalesce(new.sent_at, now()) at time zone 'UTC')::date;
    perform private.outbound_tally(v_day, 'sent');
    if new.kind = 'first' then perform private.outbound_tally(v_day, 'first_emails'); end if;
    if new.kind = 'follow_up' then perform private.outbound_tally(v_day, 'follow_ups'); end if;
  end if;
  return new;
end $$;
create trigger outbound_on_message before update on public.outbound_messages
  for each row execute function private.outbound_on_message();

create or replace function private.outbound_on_event() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_day date := (new.received_at at time zone 'UTC')::date;
begin
  if new.kind = 'reply' and not exists (select 1 from public.outbound_events e where e.prospect_id = new.prospect_id
                                          and e.kind = 'reply' and e.id <> new.id) then
    perform private.outbound_tally(v_day, 'replies');
    if new.intent = 'yes' then perform private.outbound_tally(v_day, 'interested'); end if;
  elsif new.kind = 'opt_out' then perform private.outbound_tally(v_day, 'opt_outs');
  elsif new.kind = 'bounce' then perform private.outbound_tally(v_day, 'bounces');
  elsif new.kind = 'complaint' then perform private.outbound_tally(v_day, 'complaints');
  end if;
  return new;
end $$;
create trigger outbound_on_event after insert on public.outbound_events
  for each row execute function private.outbound_on_event();

-- 10. Staff actions (kabsi.co/staff/outbound). Approving Email 1 approves its follow-up. None of them can open sending.
create or replace function private.outbound_links_ok(p_body text, p_kind text) returns boolean
language plpgsql immutable set search_path = '' as $$
declare m text;
begin
  for m in select (regexp_matches(coalesce(p_body, ''), '((?:https?://)?(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:/[^\s]*)?)', 'gi'))[1] loop
    m := lower(regexp_replace(regexp_replace(m, '^https?://', ''), '[.,;:)]+$', ''));
    if p_kind in ('first', 'follow_up') then
      if m not in ('kabsi.co', 'kabsi.co/privacy') then return false; end if;
    else
      if not (m = 'kabsi.co' or m like 'kabsi.co/%' or m like 'www.facebook.com/profile.php?id=%' or m like 'www.instagram.com/kabsi.co%') then
        return false;
      end if;
    end if;
  end loop;
  return true;
end $$;

create or replace function public.staff_outbound_approve(p_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare m public.outbound_messages; n integer;
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into m from public.outbound_messages where id = p_id for update;
  if not found then raise exception 'unknown_message'; end if;
  if m.status <> 'draft' then return jsonb_build_object('status', m.status, 'changed', 0); end if;
  if m.kind = 'follow_up' then raise exception 'approve_email_1'; end if;
  update public.outbound_messages set status = 'approved', approved_by = auth.uid(), approved_at = now(),
         send_after = case when kind = 'reply' then now() else send_after end
   where (id = p_id or (parent_id = p_id and kind = 'follow_up')) and status = 'draft';
  get diagnostics n = row_count;
  if m.kind = 'first' then
    update public.outbound_prospects set status = 'approved', updated_at = now() where id = m.prospect_id and status = 'drafted';
  else
    update public.outbound_prospects set status = 'answered', updated_at = now() where id = m.prospect_id and status = 'needs_you';
    update public.outbound_events set handled_at = now() where prospect_id = m.prospect_id and needs_rashid and handled_at is null;
  end if;
  return jsonb_build_object('status', 'approved', 'changed', n);
end $$;

create or replace function public.staff_outbound_approve_all(p_ids uuid[]) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v uuid; n integer := 0;
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  if coalesce(array_length(p_ids, 1), 0) > 50 then raise exception 'too_many'; end if;
  foreach v in array coalesce(p_ids, array[]::uuid[]) loop
    if exists (select 1 from public.outbound_messages where id = v and kind = 'first' and status = 'draft') then
      perform public.staff_outbound_approve(v);
      n := n + 1;
    end if;
  end loop;
  return jsonb_build_object('approved', n);
end $$;

create or replace function public.staff_outbound_edit(p_id uuid, p_subject text, p_body text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare m public.outbound_messages; v_body text := btrim(coalesce(p_body, '')); v_subject text := btrim(coalesce(p_subject, ''));
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into m from public.outbound_messages where id = p_id for update;
  if not found then raise exception 'unknown_message'; end if;
  if m.status <> 'draft' then raise exception 'not_a_draft'; end if;
  if char_length(v_body) not between 20 and 4000 or char_length(v_subject) not between 3 and 200 then raise exception 'bad_length'; end if;
  if v_body ~ '[–—!]' or v_subject ~ '[–—!]' then raise exception 'house_style'; end if;
  if not private.outbound_links_ok(v_body, m.kind) then raise exception 'links'; end if;
  update public.outbound_messages set subject = v_subject, body = v_body where id = p_id;
  return jsonb_build_object('saved', true);
end $$;

create or replace function public.staff_outbound_skip(p_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare m public.outbound_messages; n integer;
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into m from public.outbound_messages where id = p_id for update;
  if not found then raise exception 'unknown_message'; end if;
  if m.status not in ('draft', 'approved') or (m.status = 'approved' and m.kind <> 'first') then
    return jsonb_build_object('status', m.status, 'changed', 0);
  end if;
  update public.outbound_messages set status = 'skipped'
   where (id = p_id or (parent_id = p_id and kind = 'follow_up')) and status in ('draft', 'approved');
  get diagnostics n = row_count;
  if m.kind = 'first' then
    update public.outbound_prospects set status = 'skipped', updated_at = now() where id = m.prospect_id;
  else
    update public.outbound_prospects set status = 'answered', updated_at = now() where id = m.prospect_id and status = 'needs_you';
    update public.outbound_events set handled_at = now() where prospect_id = m.prospect_id and needs_rashid and handled_at is null;
  end if;
  return jsonb_build_object('status', 'skipped', 'changed', n);
end $$;

-- 11. Harvey's dashboard: numbers and dates only, for the service role. -----------------------------------------------
create or replace view public.outbound_dashboard_counts with (security_invoker = true) as
with d as (select * from public.outbound_days), s as (select * from public.outbound_settings limit 1),
     today as (select (now() at time zone 'UTC')::date as t)
select
  coalesce((select sum(sent) from d, today where d.day = today.t), 0)::integer as sent_today,
  coalesce((select sum(sent) from d, today where d.day > today.t - 7), 0)::integer as sent_7_days,
  coalesce((select sum(sent) from d, today where date_trunc('month', d.day) = date_trunc('month', today.t)), 0)::integer as sent_this_month,
  coalesce((select sum(sent) from d), 0)::integer as sent_ever,
  coalesce((select sum(first_emails) from d), 0)::integer as first_emails,
  coalesce((select sum(follow_ups) from d), 0)::integer as follow_ups,
  coalesce((select sum(first_emails) from d), 0)::integer as businesses_written_to,
  (select count(*) from public.outbound_messages where status = 'draft' and kind = 'first')::integer as waiting_approval,
  (select count(*) from public.outbound_messages where status = 'approved')::integer as approved_queued,
  (select count(*) from public.outbound_messages where status = 'skipped' and kind = 'first')::integer as skipped,
  (select count(*) from public.outbound_messages where status = 'failed')::integer as failed,
  coalesce((select sum(replies) from d), 0)::integer as replied,
  coalesce((select sum(interested) from d), 0)::integer as interested,
  (select count(*) from public.outbound_prospects where status = 'needs_you')::integer as needs_you,
  coalesce((select sum(opt_outs) from d), 0)::integer as opted_out,
  coalesce((select sum(bounces) from d), 0)::integer as bounced,
  (select count(*) from public.outbound_suppression)::integer as suppressed,
  round(100.0 * coalesce((select sum(replies) from d), 0) / nullif((select sum(first_emails) from d), 0), 1) as reply_rate,
  round(100.0 * coalesce((select sum(bounces) from d), 0) / nullif((select sum(sent) from d), 0), 1) as bounce_rate,
  public.outbound_daily_cap() as daily_limit,
  (select monthly_cap from s) as monthly_limit;

create or replace view public.outbound_dashboard_days with (security_invoker = true) as
  select day, sent, replies from public.outbound_days order by day;

revoke all on public.outbound_dashboard_counts, public.outbound_dashboard_days from public, anon, authenticated;
grant select on public.outbound_dashboard_counts, public.outbound_dashboard_days to service_role;

-- 12. Function rights. -----------------------------------------------------------------------------------------------
revoke execute on function private.outbound_settings_guard(), private.outbound_sha(text), private.outbound_keys(text),
  private.outbound_free_mail(text), private.outbound_tally(date, text, integer), private.outbound_on_message(),
  private.outbound_on_event(), private.outbound_links_ok(text, text) from public, anon, authenticated;
revoke execute on function public.outbound_is_suppressed(text), public.outbound_suppress(text, text, boolean),
  public.outbound_refresh_suppression(), public.outbound_known_business(text, text), public.outbound_daily_cap(date),
  public.staff_outbound_approve(uuid), public.staff_outbound_approve_all(uuid[]), public.staff_outbound_edit(uuid, text, text),
  public.staff_outbound_skip(uuid) from public, anon, authenticated;
grant execute on function public.outbound_is_suppressed(text), public.outbound_suppress(text, text, boolean),
  public.outbound_refresh_suppression(), public.outbound_known_business(text, text), public.outbound_daily_cap(date)
  to service_role;
grant execute on function public.staff_outbound_approve(uuid), public.staff_outbound_approve_all(uuid[]),
  public.staff_outbound_edit(uuid, text, text), public.staff_outbound_skip(uuid) to authenticated;
