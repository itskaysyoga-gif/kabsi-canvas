-- Launch 1 part C (master plan 30.35): Settings says why WhatsApp cannot be chosen when owners' WhatsApp is switched
-- off. app_settings is not readable from the browser, so this security definer function returns only the one boolean
-- of the key whatsapp_owners_on (false when the key is missing), nothing else. Signed-in people only.
create or replace function public.whatsapp_owners_on() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select value = 'true' from public.app_settings where key = 'whatsapp_owners_on'), false)
$$;

comment on function public.whatsapp_owners_on() is
  'Launch 1: whether WhatsApp is switched on for owners (app_settings.whatsapp_owners_on). Returns only that boolean.';

revoke all on function public.whatsapp_owners_on() from public;
revoke all on function public.whatsapp_owners_on() from anon;
grant execute on function public.whatsapp_owners_on() to authenticated;
