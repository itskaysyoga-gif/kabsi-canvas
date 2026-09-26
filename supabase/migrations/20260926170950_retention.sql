-- KABSI: migration 020: retention rules the privacy policy promises (26 Sep 2026)
-- * Google data of a business whose Google access was lost and not restored for 30 days is deleted:
--   reviews (and their drafts), Listing Shield baselines and changes. The account, plan and settings stay,
--   so the owner can reconnect; reviews come back from Google on the next sync.
-- * The email log (address, subject, status) is kept 12 months.
-- * Both run daily in kabsi_retention.

alter table public.locations add column access_lost_at timestamptz;

create or replace function public.mark_access_lost(p_location uuid) returns text
language plpgsql security definer set search_path = '' as $$
begin
  update public.locations
     set access_granted_at = null, access_error_since = null, access_lost_at = coalesce(access_lost_at, now()),
         status = case when status = 'active' then 'access_pending' else status end
   where id = p_location;
  return public.refresh_location_status(p_location);
end $$;

-- Access back: the access job sets access_granted_at again; clear the lost marker with it.
create or replace function public.clear_access_lost() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.access_granted_at is not null then new.access_lost_at := null; end if;
  return new;
end $$;
create trigger locations_clear_access_lost before update of access_granted_at on public.locations
  for each row execute function public.clear_access_lost();

create or replace function public.run_retention() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_reviews int; v_emails int; v_locs uuid[];
begin
  select coalesce(array_agg(id), '{}') into v_locs from public.locations
   where access_lost_at < now() - interval '30 days' and access_granted_at is null;
  delete from public.reviews where location_id = any(v_locs);
  get diagnostics v_reviews = row_count;
  delete from public.listing_changes where location_id = any(v_locs);
  delete from public.listing_baselines where location_id = any(v_locs);
  update public.locations set reviews_synced_at = null, backlog_emailed_at = null where id = any(v_locs);
  delete from public.emails where created_at < now() - interval '12 months';
  get diagnostics v_emails = row_count;
  insert into public.jobs_log (job, ok, detail)
  select 'retention', true, jsonb_build_object('locations', cardinality(v_locs), 'reviews', v_reviews, 'emails', v_emails)
  where cardinality(v_locs) > 0 or v_emails > 0;
  return jsonb_build_object('locations', cardinality(v_locs), 'reviews', v_reviews, 'emails', v_emails);
end $$;

revoke execute on function public.mark_access_lost(uuid), public.clear_access_lost(), public.run_retention()
  from public, anon, authenticated;
grant execute on function public.mark_access_lost(uuid), public.run_retention() to service_role;

select cron.schedule('kabsi_retention', '53 2 * * *', $$select public.run_retention()$$);