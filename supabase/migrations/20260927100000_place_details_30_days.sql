-- KABSI: migration 023: Places details cached at most 30 days (D258, 27 Sep 2026)
-- locations.category / category_label / area come from Places API details (post keywords, D245).
-- Google Maps Platform terms allow keeping the place ID, not other Places content, beyond 30 days.
-- A trigger stamps place_details_at whenever those columns are written; run_retention clears them after
-- 30 days, and the next post draft reads them from Places again (ensureCategory refetches when category is null).

alter table public.locations add column place_details_at timestamptz;
update public.locations set place_details_at = now() where category is not null;

create or replace function public.stamp_place_details() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.category is distinct from old.category or new.category_label is distinct from old.category_label
     or new.area is distinct from old.area then
    new.place_details_at := case when new.category is null then null else now() end;
  end if;
  return new;
end $$;
create trigger locations_stamp_place_details before update of category, category_label, area on public.locations
  for each row execute function public.stamp_place_details();

-- Adds the Places purge to the daily retention job (everything else unchanged from migration 022).
create or replace function public.run_retention() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_reviews int; v_emails int; v_locs uuid[]; v_text int; v_ratings int; v_reports int; v_changes int; v_places int;
begin
  select coalesce(array_agg(id), '{}') into v_locs from public.locations
   where access_lost_at < now() - interval '30 days' and access_granted_at is null;
  delete from public.reviews where location_id = any(v_locs);
  get diagnostics v_reviews = row_count;
  delete from public.listing_changes where location_id = any(v_locs);
  delete from public.listing_baselines where location_id = any(v_locs);
  update public.locations set reviews_synced_at = null, backlog_emailed_at = null where id = any(v_locs);

  update public.reviews set comment = null, reviewer_name = null, content_purged_at = now()
   where content_purged_at is null and fetched_at < now() - interval '30 days';
  get diagnostics v_text = row_count;
  delete from public.rating_snapshots where taken_on < current_date - 30;
  get diagnostics v_ratings = row_count;
  update public.weekly_reports set data = jsonb_set(data, '{quotes}', '[]'::jsonb)
   where created_at < now() - interval '30 days' and jsonb_array_length(coalesce(data->'quotes', '[]'::jsonb)) > 0;
  get diagnostics v_reports = row_count;
  update public.listing_changes set old_value = null, new_value = null
   where state <> 'open' and created_at < now() - interval '30 days' and (old_value is not null or new_value is not null);
  get diagnostics v_changes = row_count;
  update public.locations set category = null, category_label = null, area = null
   where place_details_at < now() - interval '30 days';
  get diagnostics v_places = row_count;

  delete from public.emails where created_at < now() - interval '12 months';
  get diagnostics v_emails = row_count;

  insert into public.jobs_log (job, ok, detail)
  select 'retention', true, jsonb_build_object('locations', cardinality(v_locs), 'reviews', v_reviews, 'emails', v_emails,
         'review_text', v_text, 'ratings', v_ratings, 'report_quotes', v_reports, 'shield_values', v_changes, 'place_details', v_places)
  where cardinality(v_locs) + v_emails + v_text + v_ratings + v_reports + v_changes + v_places > 0;
  return jsonb_build_object('locations', cardinality(v_locs), 'reviews', v_reviews, 'emails', v_emails,
         'review_text', v_text, 'ratings', v_ratings, 'report_quotes', v_reports, 'shield_values', v_changes, 'place_details', v_places);
end $$;

revoke execute on function public.run_retention(), public.stamp_place_details() from public, anon, authenticated;
grant execute on function public.run_retention() to service_role;
