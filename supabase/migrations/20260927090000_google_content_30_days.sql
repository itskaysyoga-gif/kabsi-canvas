-- KABSI: migration 022: Google content is kept at most 30 days (D257, 27 Sep 2026)
-- Business Profile API policy: content from the API "must be stored temporarily for no more than 30 calendar days".
-- Places API content (the public rating) follows the same limit.
-- * reviews.fetched_at = last time Google returned the review. Every sync refreshes it (the newest 50 per business).
--   After 30 days without a refresh, the review text and reviewer name are removed; the review id, star rating,
--   dates, state and the owner's own reply stay (they are ids, numbers and the owner's content).
-- * rating_snapshots older than 30 days are deleted (the weekly report only compares with 7 days ago).
-- * Weekly reports older than 30 days lose their verbatim quotes; the numbers stay.
-- * Decided Listing Shield changes older than 30 days lose the before/after values; the field and decision stay.
--   Baselines stay: they are the owner's approved details, refreshed by every check.

alter table public.reviews
  add column fetched_at timestamptz not null default now(),
  add column content_purged_at timestamptz;
update public.reviews set fetched_at = greatest(updated_at, created_at);
create index reviews_fetched_at_idx on public.reviews (fetched_at) where content_purged_at is null;

create or replace function public.run_retention() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_reviews int; v_emails int; v_locs uuid[]; v_text int; v_ratings int; v_reports int; v_changes int;
begin
  -- Access lost for 30 days: drop the business's Google data entirely (migration 020).
  select coalesce(array_agg(id), '{}') into v_locs from public.locations
   where access_lost_at < now() - interval '30 days' and access_granted_at is null;
  delete from public.reviews where location_id = any(v_locs);
  get diagnostics v_reviews = row_count;
  delete from public.listing_changes where location_id = any(v_locs);
  delete from public.listing_baselines where location_id = any(v_locs);
  update public.locations set reviews_synced_at = null, backlog_emailed_at = null where id = any(v_locs);

  -- Google content older than 30 days since Google last returned it.
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

  delete from public.emails where created_at < now() - interval '12 months';
  get diagnostics v_emails = row_count;

  insert into public.jobs_log (job, ok, detail)
  select 'retention', true, jsonb_build_object('locations', cardinality(v_locs), 'reviews', v_reviews, 'emails', v_emails,
         'review_text', v_text, 'ratings', v_ratings, 'report_quotes', v_reports, 'shield_values', v_changes)
  where cardinality(v_locs) + v_emails + v_text + v_ratings + v_reports + v_changes > 0;
  return jsonb_build_object('locations', cardinality(v_locs), 'reviews', v_reviews, 'emails', v_emails,
         'review_text', v_text, 'ratings', v_ratings, 'report_quotes', v_reports, 'shield_values', v_changes);
end $$;

revoke execute on function public.run_retention() from public, anon, authenticated;
grant execute on function public.run_retention() to service_role;
