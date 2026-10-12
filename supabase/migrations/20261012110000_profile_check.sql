-- P0.4-01: free snapshot and Google Profile Check (K-91, K-100, G-24, G-27).
--
-- 1. public.profile_check_emails: one row each time a visitor asks for the check by email. It holds the proof of
--    consent G-21 asks for: the address, the exact words shown next to the "Send me tips" box, the visitor's choice
--    (ticked or not), the page and the time. It keeps the Place ID only (which Google allows keeping) and no other
--    Google content, so nothing in it can outlive the 24 hour Places cache window. Service role only.
-- 2. public.give_back_rate_limit(key): hands one hit back to a limiter key. profile-snapshot counts a visitor's
--    daily check before it asks Places, and gives the hit back when no snapshot could be shown ("Back soon"), so a
--    visitor is not locked out for a day by a pause that was not theirs.
--
-- Additive: one new table and one new function; nothing existing changes.

create table public.profile_check_emails (
  id uuid primary key default gen_random_uuid(),
  email text not null check (length(email) between 6 and 254 and email = lower(email)),
  place_id text not null check (length(place_id) between 5 and 300),
  tips_opt_in boolean not null,
  consent_text text not null check (length(consent_text) between 1 and 500),
  consent_language text not null default 'en',
  page text not null check (page ~ '^/[a-z0-9/_-]{0,80}$'),
  created_at timestamptz not null default now()
);
create index profile_check_emails_email on public.profile_check_emails (email, created_at desc);
alter table public.profile_check_emails enable row level security;
revoke all on public.profile_check_emails from public, anon, authenticated, service_role;
grant select, insert on public.profile_check_emails to service_role;

create function public.give_back_rate_limit(p_key text) returns void
language sql security definer set search_path = '' as $$
  update public.rate_limits set hits = greatest(hits - 1, 0) where key = p_key
$$;
revoke execute on function public.give_back_rate_limit(text) from public, anon, authenticated;
grant execute on function public.give_back_rate_limit(text) to service_role;
