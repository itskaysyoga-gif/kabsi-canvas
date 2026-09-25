-- Owner addresses for a location: members' login emails + extra alert emails. Server-only.
create or replace function public.location_owner_emails(p_location uuid) returns setof text
language sql stable security definer set search_path = '' as $$
  select distinct lower(e) from (
    select u.email as e from public.location_members m join auth.users u on u.id = m.user_id
      where m.location_id = p_location and u.email is not null
    union
    select unnest(l.alert_emails) from public.locations l where l.id = p_location
  ) x where e is not null and e <> ''
$$;
revoke execute on function public.location_owner_emails(uuid) from public, anon, authenticated;
grant execute on function public.location_owner_emails(uuid) to service_role;
