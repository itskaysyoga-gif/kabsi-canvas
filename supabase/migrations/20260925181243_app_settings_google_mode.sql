-- D235: the app shows a "test mode" banner while Google writes are simulated. Flip together with the
-- GOOGLE_MODE Edge Function secret at go-live: update public.app_settings set value = 'live' where key = 'google_mode';
create table public.app_settings (key text primary key, value text not null, updated_at timestamptz not null default now());
alter table public.app_settings enable row level security;
revoke all on public.app_settings from anon, authenticated;
insert into public.app_settings (key, value) values ('google_mode', 'mock');
create or replace function public.google_mode() returns text language sql stable security definer set search_path = '' as $$
  select coalesce((select value from public.app_settings where key = 'google_mode'), 'mock')
$$;
revoke execute on function public.google_mode() from public;
grant execute on function public.google_mode() to anon, authenticated;
