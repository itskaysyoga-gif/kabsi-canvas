-- Phase 6b photos: private bucket, path = {location_id}/{uuid}.{ext}. Members upload and view their own.
-- 5 MB limit = the Anthropic image limit used by the photo check.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('owner-photos', 'owner-photos', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy owner_photos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'owner-photos' and public.is_member(((storage.foldername(name))[1])::uuid));
create policy owner_photos_select on storage.objects for select to authenticated
  using (bucket_id = 'owner-photos' and (public.is_member(((storage.foldername(name))[1])::uuid) or (select public.is_staff())));

-- The browser registers an uploaded file; the content function then checks it.
create or replace function public.add_photo(p_location uuid, p_path text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if not public.is_member(p_location) then raise exception 'forbidden' using errcode = '42501'; end if;
  if split_part(p_path, '/', 1) <> p_location::text then raise exception 'bad_path'; end if;
  if not exists (select 1 from storage.objects where bucket_id = 'owner-photos' and name = p_path) then raise exception 'not_uploaded'; end if;
  insert into public.photos (location_id, storage_path) values (p_location, p_path) returning id into v_id;
  return v_id;
end $$;
revoke execute on function public.add_photo(uuid, text) from public, anon;
grant execute on function public.add_photo(uuid, text) to authenticated;
