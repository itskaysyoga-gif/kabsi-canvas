-- Founding 1 (lane R R-151, master plan 30.51 item 3): Founding 25 becomes private. Rashid offers it only by message and
-- email, with a link that holds a secret. The page opens only at /founding/<slug>, where the slug is the one setting
-- app_settings.founding_invite_slug. This migration:
--   1. generates the slug (24 random characters, letters and digits) if it is not there yet; running it again never rotates it;
--   2. adds the one staff function that reads and rotates it. app_settings is closed to anon and authenticated (the table
--      has no grant and row level security is on), so a browser cannot read the slug; the Edge Function programs and the
--      staff function are the only readers. The old link stops working the moment the slug changes (nothing caches it).
-- Nothing is dropped and no table or column changes. Rollback: drop function public.staff_founding_invite(boolean); the
-- setting row can stay (it is closed to browsers).
-- Read-backs, after applying:
--   select length(value) from public.app_settings where key = 'founding_invite_slug';       expect: 24
--   select has_function_privilege('anon', 'public.staff_founding_invite(boolean)', 'execute'),
--          has_function_privilege('authenticated', 'public.staff_founding_invite(boolean)', 'execute');   expect: f, t (staff only inside)

insert into public.app_settings (key, value)
values ('founding_invite_slug', translate(encode(extensions.gen_random_bytes(18), 'base64'), '+/', 'xy'))
on conflict (key) do nothing;

-- One definer function, staff only, empty search_path. p_rotate false reads the current slug (the staff page builds the link
-- from it); true makes a new one and returns it. A caller who is not staff gets 42501 and learns nothing.
create or replace function public.staff_founding_invite(p_rotate boolean default false) returns text
language plpgsql security definer set search_path = '' as $$
declare v text;
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  if coalesce(p_rotate, false) then
    insert into public.app_settings (key, value, updated_at)
    values ('founding_invite_slug', translate(encode(extensions.gen_random_bytes(18), 'base64'), '+/', 'xy'), now())
    on conflict (key) do update set value = excluded.value, updated_at = excluded.updated_at
    returning value into v;
  else
    select s.value into v from public.app_settings s where s.key = 'founding_invite_slug';
  end if;
  return v;
end $$;
revoke all on function public.staff_founding_invite(boolean) from public, anon;
grant execute on function public.staff_founding_invite(boolean) to authenticated;
