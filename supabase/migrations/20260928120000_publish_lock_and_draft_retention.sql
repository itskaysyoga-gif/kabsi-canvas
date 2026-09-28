-- KABSI: migration 029: atomic publish locking + retention cascade to drafts/payloads (D266, 28 Sep 2026)
-- * A new 'publishing' state is the atomic claim a publish path takes before calling Google, so two
--   concurrent approvals (dashboard + email link, a double click, two tabs) can no longer both post.
--   A row can be stuck at 'publishing' after an ambiguous Google failure (timeout/network/5xx) — that is
--   deliberate: we don't know if Google received the write, so nothing auto-reverts and auto-retries it
--   (that could double-post). It needs a human to check the live listing, then a manual SQL fix.
-- * reply_drafts.body/instruction and publications.payload (review replies) quote or reference a specific
--   customer review; once that review's own content is purged (or the review/location is gone), the drafts
--   and payload about it lose their point and are cleared too, same spirit as migration 022.

alter table public.reviews drop constraint reviews_state_check;
alter table public.reviews add constraint reviews_state_check
  check (state in ('new','drafted','blocked','publishing','posted','skipped','handled_offline','archived'));

alter table public.gbp_posts drop constraint gbp_posts_state_check;
alter table public.gbp_posts add constraint gbp_posts_state_check
  check (state in ('draft','publishing','posted','skipped','failed'));

alter table public.photos drop constraint photos_state_check;
alter table public.photos add constraint photos_state_check
  check (state in ('checking','draft','publishing','posted','skipped','failed'));

alter table public.reply_drafts add column redacted_at timestamptz;
alter table public.publications add column payload_redacted_at timestamptz;

create or replace function public.run_retention() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_reviews int; v_emails int; v_locs uuid[]; v_text int; v_ratings int; v_reports int; v_changes int; v_drafts int; v_pubs int;
begin
  -- Access lost for 30 days: drop the business's Google data entirely (migration 020). reply_drafts and
  -- publications cascade or stay orphaned-but-harmless once the review/location row is gone.
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

  -- D266: drafts and the exact reply payload about a review lose their point once that review's Google
  -- content is purged — clear them in the same pass rather than on their own separate timer.
  update public.reply_drafts set body = '', instruction = null, redacted_at = now()
   where redacted_at is null
     and review_id in (select id from public.reviews where content_purged_at is not null);
  get diagnostics v_drafts = row_count;
  update public.publications set payload = jsonb_build_object('redacted', true), payload_redacted_at = now()
   where payload_redacted_at is null and target_type = 'review_reply'
     and target_id in (select id from public.reviews where content_purged_at is not null);
  get diagnostics v_pubs = row_count;

  delete from public.emails where created_at < now() - interval '12 months';
  get diagnostics v_emails = row_count;

  insert into public.jobs_log (job, ok, detail)
  select 'retention', true, jsonb_build_object('locations', cardinality(v_locs), 'reviews', v_reviews, 'emails', v_emails,
         'review_text', v_text, 'ratings', v_ratings, 'report_quotes', v_reports, 'shield_values', v_changes,
         'drafts_redacted', v_drafts, 'payloads_redacted', v_pubs)
  where cardinality(v_locs) + v_emails + v_text + v_ratings + v_reports + v_changes + v_drafts + v_pubs > 0;
  return jsonb_build_object('locations', cardinality(v_locs), 'reviews', v_reviews, 'emails', v_emails,
         'review_text', v_text, 'ratings', v_ratings, 'report_quotes', v_reports, 'shield_values', v_changes,
         'drafts_redacted', v_drafts, 'payloads_redacted', v_pubs);
end $$;

revoke execute on function public.run_retention() from public, anon, authenticated;
grant execute on function public.run_retention() to service_role;
