-- Session 19 rest (master plan 30.10 point 1, docs/GOOGLE-ARCHITECTURE.md section 5): everything Kabsi read from the
-- Business Profile APIs is deleted within 30 days after a business leaves. run_retention already deletes reviews and
-- listing rows 30 days after access was lost (a disconnect in Settings marks access lost too); this adds the tables
-- that hold Google's numbers and were left behind: rating snapshots, weekly report copies, the Coach's read and
-- Google's state. A business that reconnected since is left alone. Daily at 02:58 UTC, after run_retention.
-- Additive: one new function and one cron job. Nothing is dropped; rows are deleted only for businesses that left.

create or replace function private.purge_after_leaving() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_days int := coalesce(private.retention_days('google_data_after_access_lost'), 30); v_locs uuid[];
  v_reviews int; v_ratings int; v_reports int;
begin
  select coalesce(array_agg(id), '{}') into v_locs from public.locations
   where (access_removed_at < now() - make_interval(days => v_days)
          and (access_granted_at is null or access_granted_at < access_removed_at))
      or (access_lost_at < now() - make_interval(days => v_days) and access_granted_at is null);
  if cardinality(v_locs) = 0 then return jsonb_build_object('locations', 0); end if;
  delete from public.reviews where location_id = any(v_locs);
  get diagnostics v_reviews = row_count;
  delete from public.listing_changes where location_id = any(v_locs);
  delete from public.listing_baselines where location_id = any(v_locs);
  delete from public.rating_snapshots where location_id = any(v_locs);
  get diagnostics v_ratings = row_count;
  delete from public.weekly_reports where location_id = any(v_locs);
  get diagnostics v_reports = row_count;
  delete from public.coach_profile where location_id = any(v_locs);
  update public.google_connections set google_state = null, google_state_checked_at = null, google_action = null,
    google_action_since = null where location_id = any(v_locs);
  update public.locations set reviews_synced_at = null, backlog_emailed_at = null where id = any(v_locs);
  return jsonb_build_object('locations', cardinality(v_locs), 'reviews', v_reviews, 'ratings', v_ratings, 'reports', v_reports);
end $$;

revoke all on function private.purge_after_leaving() from public, anon, authenticated;

select cron.schedule('kabsi_purge_after_leaving', '58 2 * * *', $$select private.purge_after_leaving()$$);
