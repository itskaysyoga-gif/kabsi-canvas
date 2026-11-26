-- APP-3 (R-169, 26 Nov 2026): three small reads, nothing written.
-- 1. staff_today() adds providers_on: which paid providers are switched on (dataforseo_mode, ai_visibility_mode = 'live').
--    Today hides the spend lines of a provider that is off (R-163 switched DataForSEO, AI Visibility and AI answers off).
-- 2. staff_business_plans(): per business, whether it has ever had a plan, a trial or a payment, so the staff "Start trial"
--    button shows only where it applies. Staff only.
-- 3. profile_coach_numbers(p_location): the Profile Coach's last Google read (description length, attribute count), for the
--    owner's Google profile screen, so the Description and Attributes rows show what Kabsi already read instead of
--    "Not read yet". Members of the business only. Google's text is never stored (K-40); these are counts.

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
    'providers_on', jsonb_build_object(
      'dataforseo', coalesce((select value = 'live' from public.app_settings where key = 'dataforseo_mode'), false),
      'ai_visibility', coalesce((select value = 'live' from public.app_settings where key = 'ai_visibility_mode'), false)
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

create or replace function public.staff_business_plans()
returns table (location_id uuid, has_plan boolean)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  return query
    select l.id,
           exists (select 1 from public.plans p where p.location_id = l.id)
           or exists (select 1 from public.payments p where p.location_id = l.id)
           or exists (select 1 from public.subscriptions s where s.organization_id = l.organization_id
                       and (s.trial_started_at is not null or s.first_paid_at is not null
                            or coalesce(s.state, '') not in ('', 'incomplete')))
      from public.locations l;
end;
$$;
revoke execute on function public.staff_business_plans() from public, anon;
grant execute on function public.staff_business_plans() to authenticated;

create or replace function public.profile_coach_numbers(p_location uuid)
returns table (description_length integer, attributes integer, read_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not (public.is_member(p_location) or public.is_staff()) then raise exception 'forbidden' using errcode = '42501'; end if;
  return query
    select c.description_length, c.attributes, c.read_at
      from public.coach_profile c
     where c.location_id = p_location and c.source = 'live';
end;
$$;
revoke execute on function public.profile_coach_numbers(uuid) from public, anon;
grant execute on function public.profile_coach_numbers(uuid) to authenticated;
