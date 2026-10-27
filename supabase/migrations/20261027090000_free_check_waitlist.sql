-- UX 1 (27 Oct 2026): the free check's waiting list ("Save my place", COPY.md shared pieces; master plan 30.15 section 6).
-- While the nearby check is closed, a visitor leaves an email or a WhatsApp number to be told once, the day it opens. One row
-- per request, with the exact words agreed to (the notice, and the separate unticked tips box). Written only by the
-- visibility function (service role); closed to the browser. Kept 365 days, then purged by the cron below.
-- Additive only: one table, one function, one cron.

create table if not exists public.free_check_waitlist (
  id uuid primary key default gen_random_uuid(),
  email text check (email is null or (char_length(email) between 6 and 254 and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]{2,}$')),
  phone text check (phone is null or phone ~ '^\+[1-9][0-9]{6,14}$'),
  business text not null check (char_length(business) between 2 and 120),
  country text check (country is null or country ~ '^[A-Z]{2}$'),
  place_id text check (place_id is null or (char_length(place_id) between 10 and 300 and place_id ~ '^[A-Za-z0-9_-]+$')),
  term text check (term is null or char_length(term) between 1 and 60),
  industry text check (industry is null or industry ~ '^[a-z0-9-]{2,40}$'),
  notice_consent_text text not null check (char_length(notice_consent_text) between 10 and 1000),
  notice_consent_at timestamptz not null default now(),
  marketing_consent boolean not null default false,
  marketing_consent_text text check (marketing_consent_text is null or char_length(marketing_consent_text) between 10 and 1000),
  page text not null default '/scan' check (page ~ '^/[A-Za-z0-9/_-]{0,120}$'),
  notified_at timestamptz,
  created_at timestamptz not null default now(),
  constraint free_check_waitlist_contact check (email is not null or phone is not null),
  constraint free_check_waitlist_marketing check (not marketing_consent or (marketing_consent_text is not null and email is not null))
);
comment on table public.free_check_waitlist is 'UX 1: the free check waiting list (email or WhatsApp, the words agreed to). Service role only; purged after 365 days.';
-- One place on the list per contact and business: asking again changes nothing.
create unique index if not exists free_check_waitlist_once
  on public.free_check_waitlist (coalesce(email, ''), coalesce(phone, ''), coalesce(place_id, lower(business)));
create index if not exists free_check_waitlist_open on public.free_check_waitlist (created_at) where notified_at is null;
alter table public.free_check_waitlist enable row level security;
revoke all on public.free_check_waitlist from public, anon, authenticated;

-- Retention: a place on the list is kept for 365 days.
create or replace function private.purge_free_check_waitlist() returns integer
language plpgsql security definer set search_path = '' as $$
declare v_n integer;
begin
  delete from public.free_check_waitlist where created_at < now() - interval '365 days';
  get diagnostics v_n = row_count;
  return v_n;
end $$;
revoke all on function private.purge_free_check_waitlist() from public, anon, authenticated;
select cron.schedule('kabsi_purge_free_check_waitlist', '47 3 * * *', $$select private.purge_free_check_waitlist()$$);
