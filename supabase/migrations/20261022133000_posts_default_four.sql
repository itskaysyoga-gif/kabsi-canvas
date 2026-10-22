-- PR 0, lane R decision of 22 Oct 2026: Kabsi prepares one post a week (4 a month) by default; the owner can lower it
-- to 2 a month in Posts. Additive: a new default and a narrower owner choice. The check on the column still allows 1
-- so a value stored earlier stays valid; nobody can choose 1 from now on.
alter table public.locations alter column posts_per_month set default 4;

-- Every business so far holds the old default of 2 (nobody has chosen; read on 22 Oct 2026), so they move to the new default.
update public.locations set posts_per_month = 4 where posts_per_month = 2;

create or replace function public.set_post_cadence(p_location uuid, p_per_month integer) returns integer
language plpgsql security definer set search_path = '' as $$
begin
  if not public.has_location_role(p_location, array['owner', 'manager']) then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_per_month not in (2, 4) then raise exception 'bad_cadence'; end if;
  update public.locations set posts_per_month = p_per_month where id = p_location;
  return p_per_month;
end $$;
revoke execute on function public.set_post_cadence(uuid, integer) from public, anon;
grant execute on function public.set_post_cadence(uuid, integer) to authenticated;
