-- App 5 (master plan 30.33 item 3): the staff Today page. Two things it shows are not readable from the browser today:
-- the monthly spend caps of the paid data providers and the Places daily cap live in app_settings (no browser access),
-- and DataForSEO's refusals (no balance, cost limit, blocked) are recorded only as staff alerts in ops_events (no
-- browser access). staff_today() returns both for staff, and nothing else: no setting value but the caps, no alert
-- body, no phone number, no business data.
-- Additive only: create or replace, revoke, grant.

create or replace function public.staff_today() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  return jsonb_build_object(
    'checked_at', now(),
    'caps', jsonb_build_object(
      'dataforseo_usd', coalesce((select nullif(value, '')::numeric from public.app_settings
                                   where key = 'provider_cap_dataforseo_usd'), 0),
      'ai_visibility_usd', coalesce((select nullif(value, '')::numeric from public.app_settings
                                      where key = 'provider_cap_ai_visibility_usd'), 0)
    ),
    'refusals_24h', coalesce((
      select jsonb_agg(jsonb_build_object('title', e.title, 'at', e.created_at) order by e.created_at desc)
        from public.ops_events e
       where e.created_at > now() - interval '24 hours'
         and (e.dedupe_key like 'dataforseo_refused:%'
              or e.dedupe_key like 'cap:%'
              or e.dedupe_key like 'ai_cap:%')
    ), '[]'::jsonb)
  );
end;
$$;

comment on function public.staff_today() is
  'App 5: the spend caps and the provider refusals of the last 24 hours, for the staff Today page. Staff only.';

revoke all on function public.staff_today() from public, anon;
grant execute on function public.staff_today() to authenticated;
