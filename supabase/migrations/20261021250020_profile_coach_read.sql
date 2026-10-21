-- P0.8-09 part A: the two calls the weekly Coach read makes (api/jobs.ts, detect_tasks). Service role only. Additive: two
-- functions. coach_read_due says whether this business's profile should be read now (active, reachable, on a plan that
-- includes the checklist, and not read in the last 7 days); coach_profile_put keeps the three numbers, replacing the last.
create function public.coach_read_due(p_location uuid) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare l public.locations; c public.coach_profile;
begin
  select * into l from public.locations where id = p_location;
  if not found or l.status <> 'active' or l.concierge or l.disconnect_requested_at is not null or l.google_location_id is null then
    return false;
  end if;
  if not (private.feature_plan(p_location) ->> 'essentials')::boolean then return false; end if;
  select * into c from public.coach_profile where location_id = p_location;
  return c.location_id is null or c.read_at < now() - interval '7 days';
end $$;
revoke execute on function public.coach_read_due(uuid) from public, anon, authenticated;
grant execute on function public.coach_read_due(uuid) to service_role;

create function public.coach_profile_put(p_location uuid, p_description_length integer, p_additional_categories integer,
  p_attributes integer, p_source text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.locations where id = p_location) then raise exception 'unknown_location'; end if;
  insert into public.coach_profile (location_id, description_length, additional_categories, attributes, source, read_at)
  values (p_location, least(greatest(p_description_length, 0), 100000), least(greatest(p_additional_categories, 0), 100),
          least(greatest(p_attributes, 0), 1000), p_source, now())
  on conflict (location_id) do update set description_length = excluded.description_length,
    additional_categories = excluded.additional_categories, attributes = excluded.attributes, source = excluded.source,
    read_at = excluded.read_at;
end $$;
revoke execute on function public.coach_profile_put(uuid, integer, integer, integer, text) from public, anon, authenticated;
grant execute on function public.coach_profile_put(uuid, integer, integer, integer, text) to service_role;
