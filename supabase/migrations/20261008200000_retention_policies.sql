-- P0.2-01: the K-40 retention table (K-40, K-113.3, D257, D266). One row per data class in public.retention_policies,
-- seeded word for word from K-40, and the single source the daily retention job reads: private.run_retention and
-- private.purge_old_chats take every limit from it through private.retention_days. Additive: one table, three photo
-- columns, two functions replaced, one helper and one trigger added. Nothing is dropped.
--
-- What the job now does per class (keep_days from the table; "life" means the class has no limit):
--   review_content                 review text and reviewer name 30 days after Google last returned them; report quotes
--   review_metadata                life: ids, ratings, dates and reply state are never touched
--   google_profile_values          Places details on locations (restored: the 30 day clear of D258 was lost when
--                                  migration 029 replaced run_retention on 28 Sep), decided Google Protection values,
--                                  Google's raw response on publications, audit content of listing changes
--   owner_values                   life: knowledge, baselines the owner approved, approved payloads of posts, hours and
--                                  put-backs stay until the business is deleted
--   google_performance             rating snapshots (Google's rating and review count); no other performance figure is
--                                  stored today, they are read from Google on demand
--   drafts_and_payloads            redacted with their review (D266, unchanged)
--   uploaded_photos                files 30 days after the photo is on Google, or at the next run after a skip; the job
--                                  marks the photo (file_due_at) and offers one photo_files job, whose handler in the
--                                  api function removes the Storage objects through the Storage API (SQL cannot) and
--                                  stamps file_deleted_at. The photo row (id, category, state, dates) stays.
--   audit_log                      entries older than 731 days (24 months, never earlier than the append-only trigger
--                                  allows); content fields blanked per the classes above
--   email_log, nora_chats          366 days (12 months, never earlier)
--   google_data_after_access_lost  30 days after access is lost (unchanged)
--
-- The Google classes cannot be set above 30 days (check constraint), so a typo cannot keep Google content longer than
-- Google allows. A missing class stops the job with an error instead of keeping data forever.

-- 1. The table ---------------------------------------------------------------------------------------------------------

create table public.retention_policies (
  data_class text primary key check (data_class ~ '^[a-z][a-z_]{1,62}$'),
  keep_days integer check (keep_days is null or keep_days between 0 and 3660),
  kept text not null,
  basis text not null,
  updated_at timestamptz not null default now(),
  constraint google_classes_at_most_30_days check (
    data_class not in ('review_content', 'google_profile_values', 'google_performance', 'google_data_after_access_lost')
    or keep_days between 0 and 30)
);
comment on table public.retention_policies is
  'P0.2-01 (K-40): one retention policy per data class, the single source private.run_retention reads. keep_days null = life of account.';
alter table public.retention_policies enable row level security;
revoke all on public.retention_policies from public, anon, authenticated;
grant select on public.retention_policies to service_role;

insert into public.retention_policies (data_class, keep_days, kept, basis) values
  ('review_content', 30, '30 days after Google last returned it', 'Google API policy'),
  ('review_metadata', null, 'Life of account', 'Ids and numbers needed for workflow'),
  ('google_profile_values', 30, '30 days', 'Google API policy'),
  ('owner_values', null, 'Life of account, deleted on account deletion', 'Owner''s own data'),
  ('google_performance', 30, '30 days, re-fetched on demand', 'Google API policy'),
  ('drafts_and_payloads', null, 'Redacted with their review (exists)', 'Linked to Google content'),
  ('uploaded_photos', 30, '30 days after publishing, or on skip', 'Not needed after Google has it'),
  ('audit_log', 731, '24 months, content fields redacted per the rows above', 'Proof of approvals'),
  ('email_log', 366, '12 months (exists)', 'Delivery disputes'),
  ('nora_chats', 366, '12 months (exists)', 'Support'),
  ('google_data_after_access_lost', 30, 'Deleted after 30 days (exists)', 'Google API policy');

-- Reads one limit. Raises when the class is missing, so a deleted row never turns into "keep forever".
create function private.retention_days(p_class text) returns integer
language plpgsql stable security definer set search_path = '' as $$
declare v_days integer;
begin
  select keep_days into v_days from public.retention_policies where data_class = p_class;
  if not found then raise exception 'retention_policies: no row for %', p_class; end if;
  return v_days;
end $$;

-- 2. Photos: when the photo settled, when its file is due and when the file was removed ---------------------------------

alter table public.photos
  add column settled_at timestamptz,
  add column file_due_at timestamptz,
  add column file_deleted_at timestamptz;
update public.photos set settled_at = updated_at where state in ('posted', 'skipped');
create index photos_file_due_idx on public.photos (file_due_at) where file_due_at is not null and file_deleted_at is null;

create function private.stamp_photo_settled() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.state is distinct from old.state then
    new.settled_at := case when new.state in ('posted', 'skipped') then now() end;
  end if;
  return new;
end $$;
create trigger photos_stamp_settled before update of state on public.photos
  for each row execute function private.stamp_photo_settled();

-- 3. The daily job ------------------------------------------------------------------------------------------------------

create or replace function private.run_retention() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_review int := private.retention_days('review_content');
  v_profile int := private.retention_days('google_profile_values');
  v_perf int := private.retention_days('google_performance');
  v_photos int := private.retention_days('uploaded_photos');
  v_audit int := private.retention_days('audit_log');
  v_email int := private.retention_days('email_log');
  v_lost int := private.retention_days('google_data_after_access_lost');
  v_reviews int; v_emails int; v_locs uuid[]; v_text int; v_ratings int; v_reports int; v_changes int; v_drafts int;
  v_pubs int; v_places int; v_responses int; v_photo_files int; v_audit_redacted int; v_audit_deleted int;
  v_result jsonb;
begin
  -- The classes that have no limit must stay without one: a number there would mean the job ignores it.
  if private.retention_days('review_metadata') is not null or private.retention_days('owner_values') is not null
     or private.retention_days('drafts_and_payloads') is not null then
    raise exception 'retention_policies: review_metadata, owner_values and drafts_and_payloads follow other rules, keep_days must be null';
  end if;

  -- Access lost: drop the business's Google data entirely (migration 020). reply_drafts and publications cascade or
  -- stay orphaned-but-harmless once the review/location row is gone.
  select coalesce(array_agg(id), '{}') into v_locs from public.locations
   where access_lost_at < now() - make_interval(days => v_lost) and access_granted_at is null;
  delete from public.reviews where location_id = any(v_locs);
  get diagnostics v_reviews = row_count;
  delete from public.listing_changes where location_id = any(v_locs);
  delete from public.listing_baselines where location_id = any(v_locs);
  update public.locations set reviews_synced_at = null, backlog_emailed_at = null where id = any(v_locs);

  -- Review content: text and reviewer name after Google last returned them; quotes in weekly reports.
  update public.reviews set comment = null, reviewer_name = null, content_purged_at = now()
   where content_purged_at is null and fetched_at < now() - make_interval(days => v_review);
  get diagnostics v_text = row_count;
  update public.weekly_reports set data = jsonb_set(data, '{quotes}', '[]'::jsonb)
   where created_at < now() - make_interval(days => v_review)
     and jsonb_array_length(coalesce(data->'quotes', '[]'::jsonb)) > 0;
  get diagnostics v_reports = row_count;

  -- Google performance figures: the rating snapshots.
  delete from public.rating_snapshots where taken_on < current_date - v_perf;
  get diagnostics v_ratings = row_count;

  -- Google profile values read by Kabsi: decided Protection values, Places details, Google's raw responses.
  update public.listing_changes set old_value = null, new_value = null
   where state <> 'open' and created_at < now() - make_interval(days => v_profile)
     and (old_value is not null or new_value is not null);
  get diagnostics v_changes = row_count;
  update public.locations set category = null, category_label = null, area = null
   where place_details_at < now() - make_interval(days => v_profile);
  get diagnostics v_places = row_count;
  update public.publications set google_response = null
   where google_response is not null and updated_at < now() - make_interval(days => v_profile);
  get diagnostics v_responses = row_count;

  -- D266: drafts and the exact reply payload about a review are cleared with that review's Google content.
  update public.reply_drafts set body = '', instruction = null, redacted_at = now()
   where redacted_at is null
     and review_id in (select id from public.reviews where content_purged_at is not null);
  get diagnostics v_drafts = row_count;
  update public.publications set payload = jsonb_build_object('redacted', true), payload_redacted_at = now()
   where payload_redacted_at is null and target_type = 'review_reply'
     and target_id in (select id from public.reviews where content_purged_at is not null);
  get diagnostics v_pubs = row_count;

  -- Uploaded photos: due 30 days after they are on Google, or at once when skipped. The api function's photo_files
  -- job removes the files (Storage objects can only be removed through the Storage API).
  update public.photos set file_due_at = now()
   where file_due_at is null and file_deleted_at is null
     and ((state = 'posted' and settled_at < now() - make_interval(days => v_photos)) or state = 'skipped');
  get diagnostics v_photo_files = row_count;
  if exists (select 1 from public.photos where file_due_at is not null and file_deleted_at is null) then
    insert into public.jobs (kind, location_id, dedupe_key) values ('photo_files', null, 'photo_files')
    on conflict (dedupe_key) where dedupe_key is not null and state in ('pending', 'running', 'retrying') do nothing;
  end if;

  delete from public.emails where created_at < now() - make_interval(days => v_email);
  get diagnostics v_emails = row_count;

  -- P0.1-10 (K-40): the audit log keeps who, what and when. Content fields are blanked once the business is deleted
  -- (owner facts), the review they describe has lost its Google content, or they describe a Google Protection change
  -- (Google's value) older than the profile limit; entries older than the audit limit are deleted. The flag is
  -- transaction-local and is cleared again before this function returns.
  perform set_config('kabsi.audit_retention', 'on', true);
  update public.audit_events e set before = null, after = null, redacted_at = now()
   where e.redacted_at is null and (e.before is not null or e.after is not null)
     and ((e.location_id is not null and not exists (select 1 from public.locations l where l.id = e.location_id))
       or (e.object_type = 'review' and not exists (select 1 from public.reviews r
             where r.id::text = e.object_id and r.content_purged_at is null))
       or (e.object_type = 'listing_change' and e.created_at < now() - make_interval(days => v_profile)));
  get diagnostics v_audit_redacted = row_count;
  delete from public.audit_events where created_at < now() - make_interval(days => v_audit);
  get diagnostics v_audit_deleted = row_count;
  perform set_config('kabsi.audit_retention', 'off', true);

  v_result := jsonb_build_object('locations', cardinality(v_locs), 'reviews', v_reviews, 'emails', v_emails,
    'review_text', v_text, 'ratings', v_ratings, 'report_quotes', v_reports, 'shield_values', v_changes,
    'place_details', v_places, 'google_responses', v_responses, 'drafts_redacted', v_drafts, 'payloads_redacted', v_pubs,
    'photo_files_due', v_photo_files, 'audit_redacted', v_audit_redacted, 'audit_deleted', v_audit_deleted);
  insert into public.jobs_log (job, ok, detail)
  select 'retention', true, v_result
   where exists (select 1 from jsonb_each_text(v_result) where value::int > 0);
  return v_result;
end $$;

revoke all on function private.run_retention(), private.retention_days(text), private.stamp_photo_settled()
  from public, anon, authenticated;

-- 4. Nora chats read their limit from the same table --------------------------------------------------------------------

create or replace function private.purge_old_chats() returns integer
language sql security definer set search_path = '' as $$
  with d as (delete from public.chat_conversations
              where updated_at < now() - make_interval(days => private.retention_days('nora_chats')) returning 1)
  select count(*)::int from d
$$;
revoke all on function private.purge_old_chats() from public, anon, authenticated;
