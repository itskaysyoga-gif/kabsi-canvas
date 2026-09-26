-- KABSI: migration 019: owner-requested deletion (26 Sep 2026)
-- An owner can ask Kabsi to delete a business from Settings. The request waits 7 days (it can be cancelled),
-- then the api cron job removes stored photos, emails a confirmation and calls delete_location_now:
-- NFC cards go back to unassigned, review links are deleted, and the business row is deleted, which removes
-- reviews, drafts, posts, photos, Shield data, reports, plans and claims. Payment records stay (location
-- set to null) where the law requires; taps hold no personal data and stay unlinked.

alter table public.locations add column deletion_requested_at timestamptz;
alter table public.locations add column deletion_requested_by uuid references auth.users(id) on delete set null;
alter table public.locations add column deletion_notice_at timestamptz;

create or replace function public.request_location_deletion(p_location uuid) returns timestamptz
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_member(p_location) then raise exception 'forbidden' using errcode = '42501'; end if;
  update public.locations set deletion_requested_at = coalesce(deletion_requested_at, now()),
    deletion_requested_by = coalesce(deletion_requested_by, auth.uid())
  where id = p_location;
  return (select deletion_requested_at + interval '7 days' from public.locations where id = p_location);
end $$;

create or replace function public.cancel_location_deletion(p_location uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_member(p_location) then raise exception 'forbidden' using errcode = '42501'; end if;
  update public.locations set deletion_requested_at = null, deletion_requested_by = null, deletion_notice_at = null
  where id = p_location;
end $$;

create or replace function public.delete_location_now(p_location uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.locations where id = p_location and deletion_requested_at is not null) then
    raise exception 'no_deletion_request';
  end if;
  delete from public.cards where location_id = p_location and kind = 'link';
  update public.cards set status = 'unassigned', location_id = null, destination = null, label = null, activated_at = null
  where location_id = p_location;
  delete from public.locations where id = p_location;
end $$;

revoke execute on function public.request_location_deletion(uuid), public.cancel_location_deletion(uuid),
  public.delete_location_now(uuid) from public, anon, authenticated;
grant execute on function public.request_location_deletion(uuid), public.cancel_location_deletion(uuid) to authenticated;
grant execute on function public.delete_location_now(uuid) to service_role;