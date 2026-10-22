-- Free Google Profile Check, "Send my check to WhatsApp" (lane R sync, item D, 22 Oct 2026).
--
-- public.profile_check_whatsapp: one row each time a visitor ticks the opt-in and asks for the check on WhatsApp. It holds
-- the proof of consent (G-21): a one-way hash of the number (the number itself is used to send the one message and is not
-- kept here), the exact words shown next to the tick, the page, the time and what happened to the message. It keeps the
-- Place ID only. One message per request and no follow-up sequence, so nothing else reads this table. Service role only.
--
-- Additive: one new table; nothing existing changes.

create table public.profile_check_whatsapp (
  id uuid primary key default gen_random_uuid(),
  phone_hash text not null check (length(phone_hash) between 16 and 128),
  place_id text not null check (length(place_id) between 5 and 300),
  consent_text text not null check (length(consent_text) between 1 and 500),
  consent_language text not null default 'en',
  page text not null check (page ~ '^/[a-z0-9/_-]{0,80}$'),
  state text not null default 'pending' check (state in ('pending', 'sent', 'mock_sent', 'held', 'failed')),
  provider_id text,
  error text check (error is null or length(error) <= 300),
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create index profile_check_whatsapp_phone on public.profile_check_whatsapp (phone_hash, created_at desc);
alter table public.profile_check_whatsapp enable row level security;
revoke all on public.profile_check_whatsapp from public, anon, authenticated, service_role;
grant select, insert, update on public.profile_check_whatsapp to service_role;
