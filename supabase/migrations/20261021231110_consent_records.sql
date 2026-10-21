-- P0.6-01 (G-18, G-21, R-04): proof of consent for the first-party privacy banner. Additive.
--
-- One row per choice a visitor makes in the banner (accept, decline, save, ok). It keeps what G-21 asks for: who
-- (an anonymous visitor id from the browser, and the signed-in user when there is one), what they agreed to (the
-- choices, the exact wording shown and its version and language), when, from which page, the country and the rule
-- applied, and how (the banner). No IP address, no email, no name.
-- Written only by the `consent` Edge Function with the service key; nobody reads it from the browser.

create table public.consent_records (
  id uuid primary key default gen_random_uuid(),
  visitor_id uuid not null,
  user_id uuid references auth.users (id) on delete set null,
  -- ISO country the rule was chosen for, and where it came from: the network (Vercel or Cloudflare) or the browser time zone.
  country text check (country is null or country ~ '^[A-Z]{2}$'),
  country_source text not null check (country_source in ('network', 'timezone', 'unknown')),
  rule text not null check (rule in ('opt_in', 'ads_opt_in', 'notice')),
  action text not null check (action in ('accept', 'decline', 'save', 'ok')),
  analytics boolean not null,
  advertising boolean not null,
  wording_version text not null check (wording_version ~ '^[0-9a-z.-]{1,32}$'),
  wording text not null check (length(wording) between 1 and 4000),
  language text not null default 'en' check (language ~ '^[a-z]{2}$'),
  page text not null check (length(page) between 1 and 300),
  method text not null default 'banner' check (method in ('banner')),
  created_at timestamptz not null default now()
);
create index consent_records_visitor_idx on public.consent_records (visitor_id, created_at desc);
create index consent_records_user_idx on public.consent_records (user_id) where user_id is not null;

alter table public.consent_records enable row level security;
revoke all on public.consent_records from public, anon, authenticated;
