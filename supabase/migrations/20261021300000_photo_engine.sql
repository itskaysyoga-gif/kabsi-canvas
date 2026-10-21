-- P0.5-01 part A: the photo engine (K-23, K-78, K-81, K-116.6, K-136, A6). Additive: new columns, a new table, new
-- functions, and replaced functions with the same signatures. Nothing is dropped.
--
-- An upload (the app, a staff upload link, or the WhatsApp photo drop of P0.8-03) only registers the file and offers
-- one process_photo job. The `photos` Edge Function does the work outside the request: the real file signature, the
-- 20 MB limit, no moving images, a new upright JPEG at Google's sizes with no metadata at all (GPS included), the
-- quality checks, and near-duplicates. It records the result here with photo_processed. Videos are accepted and kept
-- out of the photo rules (state held, kept 30 days; sending them to Google is P1-17). Publishing stays the one
-- pipeline: approve_publication sends the processed file, and the publish job uploads its bytes to Google.

-- The bucket takes HEIC from iPhones and short videos, up to 20 MB. What a file really is gets checked in the job.
update storage.buckets
   set file_size_limit = 20971520,
       allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'video/mp4', 'video/quicktime']
 where id = 'owner-photos';

alter table public.photos
  add column if not exists kind text not null default 'photo',
  add column if not exists source text not null default 'app',
  add column if not exists original_path text,
  add column if not exists uploaded_by uuid,
  add column if not exists width integer,
  add column if not exists height integer,
  add column if not exists bytes integer,
  add column if not exists brightness real,
  add column if not exists sharpness real,
  add column if not exists phash text,
  add column if not exists issues text[] not null default '{}',
  add column if not exists flags text[] not null default '{}',
  add column if not exists processed_at timestamptz;
alter table public.photos add constraint photos_kind_check check (kind in ('photo', 'video'));
alter table public.photos add constraint photos_source_check check (source in ('app', 'staff_link', 'whatsapp'));
-- refused: the file is not a usable photo (the reason is in suitability_note); held: a video, kept out of the photo
-- rules. The category list is Google's media categories, with COVER and LOGO for the preferred cover photo and logo.
alter table public.photos drop constraint photos_state_check;
alter table public.photos add constraint photos_state_check
  check (state in ('checking', 'draft', 'publishing', 'posted', 'skipped', 'failed', 'refused', 'held'));
alter table public.photos drop constraint photos_category_check;
alter table public.photos add constraint photos_category_check
  check (category in ('EXTERIOR', 'INTERIOR', 'PRODUCT', 'AT_WORK', 'TEAMS', 'FOOD_AND_DRINK', 'MENU', 'COMMON_AREA',
                      'ROOMS', 'ADDITIONAL', 'COVER', 'LOGO'));

-- ─── Intake: one door for every upload. The file must already be in the business's own folder of the bucket.
create or replace function private.photo_intake(p_location uuid, p_path text, p_source text, p_user uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare l public.locations; v_id uuid;
begin
  select * into l from public.locations where id = p_location;
  if not found then raise exception 'unknown_location'; end if;
  if l.concierge then raise exception 'concierge_profile'; end if;
  if p_source not in ('app', 'staff_link', 'whatsapp') then raise exception 'bad_source'; end if;
  if split_part(p_path, '/', 1) <> p_location::text then raise exception 'bad_path'; end if;
  if not exists (select 1 from storage.objects where bucket_id = 'owner-photos' and name = p_path) then raise exception 'not_uploaded'; end if;
  if exists (select 1 from public.photos where storage_path = p_path or original_path = p_path) then raise exception 'already_added'; end if;
  if (select count(*) from public.photos where location_id = p_location and created_at > now() - interval '1 day') >= 100 then
    raise exception 'too_many_photos';
  end if;
  insert into public.photos (location_id, storage_path, original_path, source, uploaded_by)
  values (p_location, p_path, p_path, p_source, p_user) returning id into v_id;
  perform public.enqueue_job('process_photo', p_location, 'process_photo:' || v_id, jsonb_build_object('photo_id', v_id), now());
  return v_id;
end $$;
revoke all on function private.photo_intake(uuid, text, text, uuid) from public, anon, authenticated;

-- The app's upload (owner, manager or staff; K-16).
create or replace function public.add_photo(p_location uuid, p_path text) returns uuid
language plpgsql security definer set search_path = '' as $$
begin
  if not public.has_location_role(p_location, array['owner', 'manager', 'staff']) then raise exception 'forbidden' using errcode = '42501'; end if;
  return private.photo_intake(p_location, p_path, 'app', auth.uid());
end $$;
revoke execute on function public.add_photo(uuid, text) from public, anon;
grant execute on function public.add_photo(uuid, text) to authenticated;

-- ─── The staff upload link: one active link per business, only for uploads, no account needed (K-23). The link holds
-- a random token; only its SHA-256 is stored, so the link is shown once, when it is made.
create table if not exists public.photo_upload_links (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null,
  token_hash text not null unique,
  created_by uuid,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  last_used_at timestamptz,
  uploads integer not null default 0
);
create unique index if not exists photo_upload_links_active on public.photo_upload_links (location_id) where revoked_at is null;
alter table public.photo_upload_links enable row level security;
revoke all on public.photo_upload_links from anon, authenticated;

create or replace function public.photo_link_create(p_location uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_token text; v_row public.photo_upload_links;
begin
  if not public.has_location_role(p_location, array['owner', 'manager']) then raise exception 'forbidden' using errcode = '42501'; end if;
  if exists (select 1 from public.locations where id = p_location and concierge) then raise exception 'concierge_profile'; end if;
  update public.photo_upload_links set revoked_at = now() where location_id = p_location and revoked_at is null;
  v_token := translate(encode(extensions.gen_random_bytes(24), 'base64'), '+/', '-_');
  insert into public.photo_upload_links (location_id, token_hash, created_by)
  values (p_location, encode(extensions.digest(v_token, 'sha256'), 'hex'), auth.uid()) returning * into v_row;
  return jsonb_build_object('token', v_token, 'created_at', v_row.created_at);
end $$;

create or replace function public.photo_link_revoke(p_location uuid) returns integer
language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  if not public.has_location_role(p_location, array['owner', 'manager']) then raise exception 'forbidden' using errcode = '42501'; end if;
  update public.photo_upload_links set revoked_at = now() where location_id = p_location and revoked_at is null;
  get diagnostics n = row_count;
  return n;
end $$;

create or replace function public.photo_link_status(p_location uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare r public.photo_upload_links;
begin
  if not public.has_location_role(p_location, array['owner', 'manager']) then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into r from public.photo_upload_links where location_id = p_location and revoked_at is null;
  if not found then return jsonb_build_object('active', false); end if;
  return jsonb_build_object('active', true, 'created_at', r.created_at, 'uploads', r.uploads, 'last_used_at', r.last_used_at);
end $$;

revoke execute on function public.photo_link_create(uuid), public.photo_link_revoke(uuid), public.photo_link_status(uuid) from public, anon;
grant execute on function public.photo_link_create(uuid), public.photo_link_revoke(uuid), public.photo_link_status(uuid) to authenticated;

-- The business behind an active link, for the `photos` function (service role). Null when the link is unknown or was
-- turned off.
create or replace function public.photo_link_location(p_hash text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('location_id', l.id, 'name', l.name)
    from public.photo_upload_links k join public.locations l on l.id = k.location_id
   where k.token_hash = p_hash and k.revoked_at is null and not l.concierge
$$;

-- The upload entry point for the staff link and the WhatsApp photo drop (P0.8-03), service role only.
create or replace function public.photo_upload(p_location uuid, p_path text, p_source text, p_user uuid default null,
  p_link_hash text default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if p_source = 'staff_link' then
    if p_link_hash is null or not exists (select 1 from public.photo_upload_links
         where token_hash = p_link_hash and location_id = p_location and revoked_at is null) then
      raise exception 'link_revoked';
    end if;
  end if;
  v_id := private.photo_intake(p_location, p_path, p_source, p_user);
  if p_link_hash is not null then
    update public.photo_upload_links set uploads = uploads + 1, last_used_at = now() where token_hash = p_link_hash;
  end if;
  return v_id;
end $$;

-- ─── The job's result. Only a photo still being checked takes one; anything else returns its state unchanged.
create or replace function public.photo_processed(p_photo uuid, p_result jsonb) returns text
language plpgsql security definer set search_path = '' as $$
declare ph public.photos; v_out text := p_result ->> 'outcome'; v_issues text[]; v_flags text[]; v_cat text;
begin
  select * into ph from public.photos where id = p_photo for update;
  if not found then return 'missing'; end if;
  if ph.state <> 'checking' then return ph.state; end if;
  if v_out = 'refused' then
    -- Not a usable photo: nothing to keep, so the file goes with the next photo_files run.
    update public.photos set state = 'refused', suitable = false, suitability_note = left(coalesce(p_result ->> 'reason', ''), 300),
      bytes = nullif(p_result ->> 'bytes', '')::integer, processed_at = now(), file_due_at = now()
     where id = p_photo;
  elsif v_out = 'video' then
    update public.photos set kind = 'video', state = 'held', bytes = nullif(p_result ->> 'bytes', '')::integer,
      suitability_note = 'Kabsi keeps this video for 30 days. Sending videos to Google comes later.', processed_at = now(),
      file_due_at = now() + make_interval(days => coalesce(private.retention_days('uploaded_photos'), 30))
     where id = p_photo;
  elsif v_out = 'ready' then
    if split_part(coalesce(p_result ->> 'path', ''), '/', 1) <> ph.location_id::text then raise exception 'bad_path'; end if;
    select coalesce(array_agg(x), '{}') into v_issues from jsonb_array_elements_text(coalesce(p_result -> 'issues', '[]')) x;
    select coalesce(array_agg(x), '{}') into v_flags from jsonb_array_elements_text(coalesce(p_result -> 'flags', '[]')) x;
    v_cat := p_result ->> 'category';
    if v_cat is not null and v_cat not in ('EXTERIOR', 'INTERIOR', 'PRODUCT', 'AT_WORK', 'TEAMS', 'FOOD_AND_DRINK', 'MENU',
         'COMMON_AREA', 'ROOMS', 'ADDITIONAL') then v_cat := null; end if;
    update public.photos set storage_path = p_result ->> 'path', width = (p_result ->> 'width')::integer,
      height = (p_result ->> 'height')::integer, bytes = (p_result ->> 'bytes')::integer,
      brightness = (p_result ->> 'brightness')::real, sharpness = (p_result ->> 'sharpness')::real, phash = p_result ->> 'phash',
      issues = v_issues, flags = v_flags, category = coalesce(v_cat, category),
      suitable = cardinality(v_issues) = 0 and cardinality(v_flags) = 0,
      suitability_note = nullif(left(coalesce(p_result ->> 'note', ''), 300), ''), state = 'draft', processed_at = now()
     where id = p_photo;
  else
    raise exception 'bad_outcome';
  end if;
  return (select state from public.photos where id = p_photo);
end $$;

revoke execute on function public.photo_link_location(text), public.photo_upload(uuid, text, text, uuid, text),
  public.photo_processed(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.photo_link_location(text), public.photo_upload(uuid, text, text, uuid, text),
  public.photo_processed(uuid, jsonb) to service_role;

-- ─── Counts by type for the Profile Coach and the gap detectors: photos on Google through Kabsi.
create or replace function private.photo_counts(p_location uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'exterior', count(*) filter (where category = 'EXTERIOR'),
    'interior', count(*) filter (where category = 'INTERIOR'),
    'team', count(*) filter (where category = 'TEAMS'),
    'work', count(*) filter (where category = 'AT_WORK'),
    'products', count(*) filter (where category in ('PRODUCT', 'FOOD_AND_DRINK', 'MENU')),
    'total', count(*),
    'last_posted_at', max(coalesce(settled_at, updated_at)))
  from public.photos where location_id = p_location and kind = 'photo' and state = 'posted'
$$;

-- Freshness and category gaps (K-23): one task when there are no photos yet, one naming the missing kinds, and one
-- when the newest photo is 30 days old. Nothing while photos wait for approval. Returns the task keys it keeps.
create or replace function private.photo_gap_tasks(p_location uuid) returns text[]
language plpgsql security definer set search_path = '' as $$
declare c jsonb := private.photo_counts(p_location); v_keep text[] := '{}'; v_missing text[] := '{}'; v_waiting integer;
  v_days integer; v_list text;
begin
  select count(*) into v_waiting from public.photos
   where location_id = p_location and kind = 'photo' and state in ('checking', 'draft', 'publishing');
  if v_waiting > 0 then
    -- Keep what is open while the owner has photos to look at.
    select coalesce(array_agg(dedupe_key), '{}') into v_keep from public.tasks
     where location_id = p_location and kind = 'profile_gap' and dedupe_key like 'profile\_gap:photos%'
       and state in ('open', 'snoozed', 'approved', 'publishing');
    return v_keep;
  end if;
  if (c ->> 'total')::integer = 0 then
    perform private.task_put(p_location, 'profile_gap', 'profile_gap', 'photos', 'nice', 'Add photos of your business',
      'Photos help people see what to expect. Start with the outside, the inside, your team and what you sell.',
      'Add them from your phone. Kabsi checks each one and you approve it.', jsonb_build_object('have', 0), null,
      'profile_gap:photos');
    return array['profile_gap:photos'];
  end if;

  if (c ->> 'exterior')::integer = 0 then v_missing := v_missing || 'the outside'::text; end if;
  if (c ->> 'interior')::integer = 0 then v_missing := v_missing || 'the inside'::text; end if;
  if (c ->> 'team')::integer = 0 then v_missing := v_missing || 'your team'::text; end if;
  if (c ->> 'work')::integer = 0 then v_missing := v_missing || 'your work'::text; end if;
  if (c ->> 'products')::integer = 0 then v_missing := v_missing || 'what you sell'::text; end if;
  if cardinality(v_missing) > 0 then
    v_list := case when cardinality(v_missing) = 1 then v_missing[1]
                   else array_to_string(v_missing[1:cardinality(v_missing) - 1], ', ') || ' and ' || v_missing[cardinality(v_missing)] end;
    v_keep := v_keep || 'profile_gap:photos_types'::text;
    perform private.task_put(p_location, 'profile_gap', 'profile_gap', 'photos_types', 'nice', 'Add a photo of ' || v_list,
      'Customers like to see the whole picture before they come. Kabsi counts the photos you added through Kabsi.',
      'Add them from your phone. Kabsi checks each one and you approve it.', c - 'last_posted_at', null,
      'profile_gap:photos_types');
  end if;

  v_days := floor(extract(epoch from now() - (c ->> 'last_posted_at')::timestamptz) / 86400);
  if v_days >= 30 then
    v_keep := v_keep || 'profile_gap:photos_fresh'::text;
    perform private.task_put(p_location, 'profile_gap', 'profile_gap', 'photos_fresh', 'nice', 'Add a new photo',
      'Your newest photo through Kabsi went up ' || v_days || ' days ago. A recent photo shows customers what you look like today.',
      'Add one from your phone. Kabsi checks it and you approve it.', jsonb_build_object('days', v_days), null,
      'profile_gap:photos_fresh');
  end if;
  return v_keep;
end $$;
revoke all on function private.photo_counts(uuid), private.photo_gap_tasks(uuid) from public, anon, authenticated;

-- detect_profile_gaps: the photo block now comes from photo_gap_tasks. The rest is unchanged.
create or replace function private.detect_profile_gaps(p_location uuid)
 returns integer
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare l public.locations; v_keep text[] := '{}'; v_made integer := 0; v_core integer; v_missing text := '';
  v_profile jsonb; v_cards integer; v_taps integer; v_last_post timestamptz; v_open_posts integer; v_before integer;
  v_photo_before integer; v_photo_keep text[];
begin
  select * into l from public.locations where id = p_location;
  if not found or l.status <> 'active' then
    perform private.task_close_except(p_location, 'profile_gap', '{}', '{}', 'expired');
    return 0;
  end if;

  select count(distinct f.key) into v_core from public.knowledge_facts f
   where f.location_id = l.id and f.superseded_by is null and f.status = 'verified' and f.slot not like 'profile.%'
     and f.key in ('description', 'service', 'hours_note', 'contact', 'signature', 'phrase_use');
  if v_core < 6 then
    v_keep := v_keep || 'profile_gap:facts'::text;
    if private.task_put(l.id, 'profile_gap', 'profile_gap', 'facts', 'recommended',
      'Tell Kabsi ' || (6 - v_core) || ' more ' || case when 6 - v_core = 1 then 'thing' else 'things' end || ' about your business',
      'Replies and posts only use facts you confirmed, so the more you add, the more they sound like you.',
      'Add them on About your business.', jsonb_build_object('have', v_core, 'of', 6), null, 'profile_gap:facts') then
      v_made := v_made + 1;
    end if;
  end if;

  select jsonb_object_agg(f.key, f.value ->> 'display') into v_profile from public.knowledge_facts f
   where f.location_id = l.id and f.slot like 'profile.%' and f.superseded_by is null;
  if v_profile is not null and not l.concierge then
    if nullif(trim(coalesce(v_profile ->> 'phone', '')), '') is null then v_missing := v_missing || 'phone number, '; end if;
    if nullif(trim(coalesce(v_profile ->> 'website', '')), '') is null then v_missing := v_missing || 'website, '; end if;
    if nullif(trim(coalesce(v_profile ->> 'main_category', '')), '') is null then v_missing := v_missing || 'main category, '; end if;
    if nullif(trim(coalesce(v_profile ->> 'regular_hours', '')), '') is null then v_missing := v_missing || 'opening hours, '; end if;
    if v_missing <> '' then
      v_missing := left(v_missing, length(v_missing) - 2);
      v_keep := v_keep || 'profile_gap:basics'::text;
      if private.task_put(l.id, 'profile_gap', 'profile_gap', 'basics', 'recommended',
        'Complete your profile basics', 'Missing on Google: ' || v_missing || '. Complete details help customers reach you.',
        'Add what is missing. You approve the change before it goes to Google.',
        jsonb_build_object('missing', v_missing), null, 'profile_gap:basics') then
        v_made := v_made + 1;
      end if;
    end if;
  end if;

  select count(*) into v_cards from public.cards where location_id = l.id and status = 'active';
  select count(*) into v_taps from public.taps where location_id = l.id and not is_bot and created_at >= now() - interval '30 days';
  if v_taps = 0 then
    v_keep := v_keep || 'profile_gap:review_link'::text;
    if private.task_put(l.id, 'profile_gap', 'profile_gap', 'review_link', 'nice',
      case when v_cards > 0 then 'Share your review link with a customer' else 'Set up your review link' end,
      'A short link and QR code make it easy for customers to leave a review. Ask everyone, never only the happy ones, and never offer a reward.',
      null, jsonb_build_object('cards', v_cards), null, 'profile_gap:review_link') then
      v_made := v_made + 1;
    end if;
  end if;

  if not l.concierge then
    -- P0.5-01: photo freshness and category gaps.
    select count(*) into v_photo_before from public.tasks t
     where t.location_id = l.id and t.kind = 'profile_gap' and t.dedupe_key like 'profile\_gap:photos%'
       and t.state in ('open', 'snoozed', 'approved', 'publishing');
    v_photo_keep := private.photo_gap_tasks(l.id);
    v_keep := v_keep || v_photo_keep;
    v_made := v_made + greatest(cardinality(v_photo_keep) - v_photo_before, 0);

    select max(updated_at) into v_last_post from public.gbp_posts where location_id = l.id and state = 'posted';
    select count(*) into v_open_posts from public.gbp_posts where location_id = l.id and state in ('draft', 'publishing');
    if v_open_posts = 0 and (v_last_post is null or v_last_post < now() - interval '14 days') then
      v_keep := v_keep || 'profile_gap:posts'::text;
      if private.task_put(l.id, 'profile_gap', 'profile_gap', 'posts', 'nice', 'Publish a post this week',
        'A post keeps your profile current. Google shows each post for a limited time.',
        null, jsonb_build_object('last_post_at', v_last_post), null, 'profile_gap:posts') then
        v_made := v_made + 1;
      end if;
    end if;
  end if;

  select count(*) into v_before from public.tasks t
   where t.location_id = l.id and t.kind = 'profile_gap' and t.dedupe_key like 'profile\_gap:coach\_%'
     and t.state in ('open', 'snoozed', 'approved', 'publishing');
  v_keep := v_keep || private.coach_tasks(l.id);
  select v_made + count(*) - v_before into v_made from public.tasks t
   where t.location_id = l.id and t.kind = 'profile_gap' and t.dedupe_key like 'profile\_gap:coach\_%'
     and t.state in ('open', 'snoozed', 'approved', 'publishing');

  perform private.task_close_except(l.id, 'profile_gap', v_keep, '{}', 'done');
  return v_made;
end $function$;

-- The batch card (K-23): "3 photos are ready", Approve all or one by one.
create or replace function private.detect_photo_drafts(p_location uuid)
 returns integer
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare n integer;
begin
  select count(*) into n from public.photos where location_id = p_location and state = 'draft' and kind = 'photo';
  if n > 0 then
    return case when private.task_put(p_location, 'photo_batch', 'location', p_location::text, 'recommended',
      n || case when n = 1 then ' photo is ready' else ' photos are ready' end,
      'Kabsi checked them and removed the location data. Approve all, or look at them one by one.',
      'Approve the photos.',
      jsonb_build_object('photos', n), jsonb_build_object('publish', 'photo', 'count', n),
      'photo_batch:' || p_location) then 1 else 0 end;
  end if;
  update public.tasks set state = 'done', resolved_at = now(), resolved_by = auth.uid(), snooze_until = null
   where location_id = p_location and kind = 'photo_batch' and source_type = 'location'
     and state in ('open', 'snoozed', 'approved', 'publishing');
  return 0;
end $function$;

-- The new photo task keys open the photo screen.
create or replace function private.task_path(p_kind text, p_source_id text)
 returns text
 language sql
 immutable
 set search_path to ''
as $function$
  select case p_kind
    when 'review_reply' then '/app/inbox'
    when 'profile_change' then '/app/shield'
    when 'knowledge_confirm' then '/app/knowledge'
    when 'post' then '/app/posts'
    when 'photo_batch' then '/app/photos'
    when 'hours_confirm' then '/app/hours'
    when 'reconnect' then '/app/settings'
    when 'billing' then '/app/plan'
    when 'profile_gap' then case
      when p_source_id like 'coach\_%' then '/app/coach'
      when p_source_id = 'facts' then '/app/knowledge' when p_source_id = 'review_link' then '/app/cards'
      when p_source_id = 'posts' then '/app/posts' when p_source_id like 'photos%' then '/app/photos' else '/app/shield' end
    else '/app' end
$function$;

-- The Profile Coach's photo item: counts by type (it waited for this card). Everything else is unchanged.
create or replace function private.coach_status(p_location uuid)
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to ''
as $function$
declare l public.locations; c public.coach_profile; s public.coach_site_check; v_known boolean; v_site text; v_services boolean;
  v_area boolean; v_bad text[]; v_items jsonb := '[]'; v_photos jsonb;
begin
  select * into l from public.locations where id = p_location;
  if not found then return '[]'::jsonb; end if;
  select * into c from public.coach_profile where location_id = p_location;
  select * into s from public.coach_site_check where location_id = p_location;
  v_known := c.location_id is not null and (c.source = 'live' or l.is_demo);

  v_items := v_items || jsonb_build_object('id', 'description', 'status',
    case when not v_known then 'unknown' when c.description_length < 250 then 'todo' else 'done' end,
    'detail', case when c.location_id is null then '{}'::jsonb else jsonb_build_object('length', c.description_length, 'example', not v_known) end);

  v_items := v_items || jsonb_build_object('id', 'categories', 'status',
    case when not v_known then 'unknown' when c.additional_categories = 0 then 'todo' else 'done' end,
    'detail', case when c.location_id is null then '{}'::jsonb else jsonb_build_object('count', c.additional_categories, 'example', not v_known) end);

  select exists (select 1 from public.knowledge_facts f
                  where f.location_id = p_location and f.superseded_by is null and f.status = 'verified'
                    and f.slot not like 'profile.%' and f.key in ('service', 'product')) into v_services;
  v_items := v_items || jsonb_build_object('id', 'services', 'status', case when v_services then 'done' else 'todo' end, 'detail', '{}'::jsonb);

  v_items := v_items || jsonb_build_object('id', 'attributes', 'status',
    case when not v_known then 'unknown' when c.attributes = 0 then 'todo' else 'done' end,
    'detail', case when c.location_id is null then '{}'::jsonb else jsonb_build_object('count', c.attributes, 'example', not v_known) end);

  v_photos := private.photo_counts(p_location);
  v_items := v_items || jsonb_build_object('id', 'photos', 'status',
    case when (v_photos ->> 'exterior')::integer > 0 and (v_photos ->> 'interior')::integer > 0 and (v_photos ->> 'team')::integer > 0
              and (v_photos ->> 'work')::integer > 0 and (v_photos ->> 'products')::integer > 0 then 'done' else 'todo' end,
    'detail', v_photos - 'last_posted_at');

  select exists (select 1 from public.knowledge_facts f
                  where f.location_id = p_location and f.superseded_by is null and f.status = 'verified' and f.key = 'service_area') into v_area;
  v_items := v_items || jsonb_build_object('id', 'service_area', 'status', case when v_area then 'done' else 'unknown' end,
    'detail', case when v_area then '{}'::jsonb else jsonb_build_object('question', true) end);

  select nullif(trim(coalesce(f.value ->> 'display', '')), '') into v_site from public.knowledge_facts f
   where f.location_id = p_location and f.slot = 'profile.website' and f.superseded_by is null;
  v_items := v_items || jsonb_build_object('id', 'website_tracking', 'status',
    case when v_site is null then 'later' when v_site ilike '%utm\_source=%' then 'done' else 'todo' end,
    'detail', case when v_site is null then jsonb_build_object('waits', 'website') else '{}'::jsonb end);

  select coalesce(array_agg(k order by k), '{}') into v_bad from jsonb_each_text(coalesce(s.found, '{}'::jsonb)) as e(k, v) where v = 'mismatch';
  v_items := v_items || jsonb_build_object('id', 'website_match', 'status',
    case when v_site is null then 'later' when s.location_id is null then 'unknown' when cardinality(v_bad) > 0 then 'todo' else 'done' end,
    'detail', case when v_site is null then jsonb_build_object('waits', 'website')
                   when s.location_id is null then '{}'::jsonb
                   else jsonb_build_object('mismatches', to_jsonb(v_bad), 'checked_at', s.checked_at) end);
  return v_items;
end $function$;

-- approve_publication: the photo branch takes Google's full category list (with COVER and LOGO for the preferred cover
-- photo and logo) and refuses a video (P1-17). Everything else is unchanged.
CREATE OR REPLACE FUNCTION public.approve_publication(p_target_type text, p_target_id uuid, p_payload jsonb, p_approved_by uuid, p_channel text, p_undo_seconds integer DEFAULT 10)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare l public.locations; p public.publications; v_loc uuid; v_state text; v_payload jsonb; v_text text;
  v_n integer; r public.reviews; po public.gbp_posts; ph public.photos; sh public.special_hours;
  pc public.profile_changes; kf public.knowledge_facts; v_cat text; v_target uuid := p_target_id;
begin
  if p_channel not in ('dashboard', 'email_link') then raise exception 'bad_channel'; end if;

  -- Lock the item: approvals of the same item take turns, and the second finds the first's publication.
  case p_target_type
  when 'review_reply' then
    v_text := trim(coalesce(p_payload ->> 'text', ''));
    if length(v_text) < 1 or length(v_text) > 4000 then raise exception 'bad_reply_text'; end if;
    select * into r from public.reviews where id = p_target_id for update;
    if not found then raise exception 'unknown_review'; end if;
    v_loc := r.location_id; v_state := r.state;
    v_payload := jsonb_build_object('text', v_text);
  when 'local_post' then
    v_text := trim(coalesce(p_payload ->> 'summary', ''));
    if length(v_text) < 10 or length(v_text) > 1500 then raise exception 'bad_post_text'; end if;
    select * into po from public.gbp_posts where id = p_target_id for update;
    if not found then raise exception 'unknown_target'; end if;
    v_loc := po.location_id; v_state := po.state;
    v_payload := jsonb_build_object('summary', v_text, 'language', coalesce(nullif(p_payload ->> 'language', ''), 'en'),
      'cta_type', po.cta_type, 'cta_url', po.cta_url);
  when 'photo' then
    select * into ph from public.photos where id = p_target_id for update;
    if not found then raise exception 'unknown_target'; end if;
    if ph.kind = 'video' then raise exception 'video_later'; end if;
    v_cat := coalesce(nullif(p_payload ->> 'category', ''), ph.category, 'ADDITIONAL');
    if v_cat not in ('EXTERIOR', 'INTERIOR', 'PRODUCT', 'AT_WORK', 'TEAMS', 'FOOD_AND_DRINK', 'MENU', 'COMMON_AREA', 'ROOMS',
                     'ADDITIONAL', 'COVER', 'LOGO') then
      raise exception 'bad_category';
    end if;
    v_loc := ph.location_id; v_state := ph.state;
    v_payload := jsonb_build_object('storage_path', ph.storage_path, 'category', v_cat);
  when 'special_hours' then
    select * into sh from public.special_hours where id = p_target_id for update;
    if not found then raise exception 'unknown_target'; end if;
    v_loc := sh.location_id; v_state := sh.state;
    v_payload := jsonb_build_object('start_date', sh.start_date, 'end_date', sh.end_date, 'closed', sh.closed,
      'open_time', to_char(sh.open_time, 'HH24:MI'), 'close_time', to_char(sh.close_time, 'HH24:MI'));
  when 'listing_revert' then
    -- P0.2-04: a Google Protection change (profile_changes). An id of the retired listing_changes resolves to its
    -- mirrored change, for the Edge Function code that runs until this task deploys.
    select * into pc from public.profile_changes where id = p_target_id for update;
    if not found then
      select * into pc from public.profile_changes where listing_change_id = p_target_id for update;
      if not found then raise exception 'unknown_target'; end if;
    end if;
    v_target := pc.id;
    v_loc := pc.location_id; v_state := pc.status;
    -- K-19, A4: the high-risk fields never go from an email link, unless the owner is signed in on its page (P0.2-05).
    if private.protection_high_risk(pc.field) and p_channel <> 'dashboard' and not private.signed_in_as(p_approved_by) then raise exception 'sign_in_required'; end if;
    -- The value to put back is the owner's approved fact, read here, never from the screen (K-18).
    select * into kf from public.knowledge_facts
     where location_id = pc.location_id and slot = 'profile.' || pc.field and superseded_by is null;
    if not found or kf.status <> 'verified' or kf.value is null then raise exception 'not_confirmed'; end if;
    v_payload := jsonb_build_object('field', pc.field, 'value', coalesce(kf.value ->> 'display', ''),
      'raw', kf.value -> 'raw', 'fact_id', kf.id);
  else
    raise exception 'unsupported_target';
  end case;

  -- P0.3-06 (K-16): who may approve this kind for this business. Name, address, main category, open status and map
  -- pin, and high-risk reviews, always need the owner; staff never approve.
  if not private.may_approve(v_loc, private.approval_kind(p_target_type), p_approved_by,
       (p_target_type = 'review_reply' and r.risk = 'high')
       or (p_target_type = 'listing_revert' and private.protection_high_risk(pc.field))) then
    if not exists (select 1 from public.location_members where location_id = v_loc and user_id = p_approved_by) then
      raise exception 'approver_not_member';
    end if;
    raise exception 'not_allowed_to_approve' using errcode = '42501';
  end if;

  -- K-38: a second tap, a second email click or the other channel gets the existing result.
  select * into p from public.publications
   where target_type = p_target_type and target_id = v_target
     and state in ('approved', 'publishing', 'published', 'checking', 'verifying', 'verified')
   order by created_at desc limit 1;
  if found then
    return jsonb_build_object('publication_id', p.id, 'state', p.state, 'route', p.route,
      'publish_after', p.publish_after, 'created', false);
  end if;

  select * into l from public.locations where id = v_loc;
  if l.status <> 'active' or l.google_location_id is null then raise exception 'location_not_active'; end if;
  -- P0.4-06 (K-101, K-48): the organisation's entitlements decide whether anything may publish now.
  if not private.entitled(v_loc, 'publish') then
    raise exception 'plan_required' using hint = 'The free trial has ended. Subscribe to publish what is waiting.';
  end if;
  if p_target_type = any (private.profile_fix_kinds()) and not private.trial_take(v_loc, 'profile_fix', v_target::text) then
    raise exception 'trial_profile_fix_cap' using hint = 'The free trial applies 3 profile fixes. The rest apply when you subscribe.';
  end if;
  -- Early access (D267): a person posts replies by hand; posts, photos, hours and Protection wait for Google access.
  if l.concierge and p_target_type <> 'review_reply' then raise exception 'concierge_profile'; end if;

  case p_target_type
  when 'review_reply' then
    if v_state not in ('drafted', 'blocked') then raise exception 'already_posted'; end if;
    update public.reviews set state = 'publishing', reply_state_reason = null where id = p_target_id;
  when 'local_post' then
    if v_state <> 'draft' then raise exception 'already_handled'; end if;
    update public.gbp_posts set state = 'publishing', body = v_text where id = p_target_id;
  when 'photo' then
    if v_state <> 'draft' then raise exception 'already_handled'; end if;
    update public.photos set state = 'publishing', category = v_cat where id = p_target_id;
  when 'special_hours' then
    if v_state <> 'draft' then raise exception 'already_handled'; end if;
    update public.special_hours set state = 'publishing' where id = p_target_id;
  when 'listing_revert' then
    if v_state not in ('detected', 'awaiting_review') then raise exception 'already_decided'; end if;
    update public.profile_changes set status = 'rejected', decided_at = now(), decided_by = p_approved_by
     where id = v_target;
  end case;

  select count(*) into v_n from public.publications where target_type = p_target_type and target_id = v_target;
  insert into public.publications (location_id, target_type, target_id, payload, approved_by, channel, state, route,
    idempotency_key, publish_after)
  values (v_loc, p_target_type, v_target, v_payload, p_approved_by, p_channel, 'approved',
    case when l.concierge then 'concierge' else 'api' end, p_target_type || ':' || v_target || ':' || (v_n + 1),
    now() + make_interval(secs => greatest(coalesce(p_undo_seconds, 10), 0)))
  returning * into p;
  if p_target_type = 'listing_revert' then
    update public.profile_changes set publication_id = p.id where id = v_target;
  end if;
  perform public.enqueue_job('publish', p.location_id, 'publish:' || p.id, jsonb_build_object('publication_id', p.id),
    p.publish_after);
  return jsonb_build_object('publication_id', p.id, 'state', p.state, 'route', p.route,
    'publish_after', p.publish_after, 'created', true);
end $function$;
