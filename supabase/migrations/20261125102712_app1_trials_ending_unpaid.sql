-- APP-1 review fix: staff_today()'s trials_ending_3d counted businesses that had already paid or cancelled. It now counts
-- only a latest trial that is not cancelled or expired, in an organisation with no paid subscription. Additive: create or
-- replace, the same keys, the same grants.

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
    ), '[]'::jsonb),
    'trials_ending_3d', (
      select count(*) from (
        select distinct on (s.organization_id) s.organization_id, s.trial_ends_at, s.state
          from public.subscriptions s
         where s.trial_started_at is not null
         order by s.organization_id, s.trial_started_at desc
      ) t
       where t.trial_ends_at > now() and t.trial_ends_at <= now() + interval '3 days'
         and coalesce(t.state, '') not in ('cancelled', 'expired')
         and not exists (select 1 from public.subscriptions p
                          where p.organization_id = t.organization_id and p.first_paid_at is not null)
    )
  );
end;
$$;

comment on function public.staff_today() is
  'App 5 and APP-1: the spend caps, the provider refusals of the last 24 hours and the trials ending, for the staff Today page. Staff only.';

revoke all on function public.staff_today() from public, anon;
grant execute on function public.staff_today() to authenticated;
