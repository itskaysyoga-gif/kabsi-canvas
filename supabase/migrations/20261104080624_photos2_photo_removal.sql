-- Photos 2 (4 Nov 2026): removing a photo Kabsi put on Google, through the one publication pipeline, and a small copy of
-- each checked photo for the Photos list. Additive: two check constraints widened (inside a DO block), one new column,
-- and functions changed by replacing only the named lines in their current definitions (each replacement must match
-- exactly once or the migration stops), as the post removal did (20261022170000_post_removal.sql).
--
-- 1. photo_removal: a new publication kind. The owner, or a manager who may approve photos, approves it on the dashboard
--    only; the 10 second undo applies; the publish job deletes the media item Kabsi uploaded, by the name Google gave it
--    (read from the photo's verified publication here, never from the request), and the photo is removed once Google no
--    longer has it. Photo states: removing (approved, on its way off Google) and removed (Google no longer has it).
-- 2. photos.thumb_path: the small copy the photo engine writes beside the checked photo. The list shows it; the full
--    file only when the photo is opened. Older photos have none and show the full file.
-- 3. The WhatsApp outcome lines leave a photo removal out, as they do a post removal.
-- 4. Retention: a removed photo's files go 30 days after it was removed, like a photo on Google.
-- 5. detect_failed_publishes: a photo removal that did not go through opens a photo task ("A photo removal did not go
--    through"), not a profile fix task (independent review finding 1).

alter table public.photos add column if not exists thumb_path text;
comment on column public.photos.thumb_path is
  'Photos 2: a small JPEG copy (480 pixels on the long side) of the checked photo, for the Photos list. Null for photos checked before 4 Nov 2026.';

do $mig$
declare
  v_def text;
  v_new text;
begin
  execute $x$alter table public.publications drop constraint publications_target_type_check$x$;
  execute $x$alter table public.publications add constraint publications_target_type_check
    check (target_type = any (array['review_reply', 'local_post', 'local_post_removal', 'photo', 'photo_removal', 'special_hours', 'listing_revert', 'listing_edit']))$x$;
  execute $x$alter table public.photos drop constraint photos_state_check$x$;
  execute $x$alter table public.photos add constraint photos_state_check
    check (state = any (array['checking', 'draft', 'publishing', 'posted', 'skipped', 'failed', 'refused', 'held', 'removing', 'removed']))$x$;

  -- approval_kind and publication_noun: a photo removal is approved like a photo and named as one.
  v_def := pg_get_functiondef('private.approval_kind(text)'::regprocedure);
  v_new := replace(v_def, $o$when 'photo' then 'photo'$o$, $n$when 'photo' then 'photo' when 'photo_removal' then 'photo'$n$);
  if v_new = v_def then raise exception 'approval_kind: no match'; end if;
  execute v_new;

  v_def := pg_get_functiondef('private.publication_noun(text)'::regprocedure);
  v_new := replace(v_def, $o$when 'photo' then 'photo'$o$, $n$when 'photo' then 'photo' when 'photo_removal' then 'photo removal'$n$);
  if v_new = v_def then raise exception 'publication_noun: no match'; end if;
  execute v_new;

  -- approve_publication: the payload (the media name of Kabsi's own upload, under this business), the superseded rule
  -- and the state change.
  v_def := pg_get_functiondef('public.approve_publication(text,uuid,jsonb,uuid,text,integer)'::regprocedure);
  v_new := replace(v_def, $o$  when 'special_hours' then
    select * into sh from public.special_hours where id = p_target_id for update;$o$, $n$  when 'photo_removal' then
    -- Photos 2: only a photo Kabsi put on Google, found by the name Google gave Kabsi's upload of it.
    if p_channel <> 'dashboard' then raise exception 'not_on_this_channel'; end if;
    select * into ph from public.photos where id = p_target_id for update;
    if not found then raise exception 'unknown_target'; end if;
    v_loc := ph.location_id; v_state := ph.state;
    select google_ref into v_text from public.publications
     where target_type = 'photo' and target_id = p_target_id and location_id = ph.location_id and state = 'verified'
       and google_ref is not null
     order by created_at desc limit 1;
    if v_text is null or v_text !~ '^accounts/[A-Za-z0-9_-]+/locations/[A-Za-z0-9_-]+/media/[A-Za-z0-9_-]+$'
       or split_part(v_text, '/', 3) || '/' || split_part(v_text, '/', 4)
          is distinct from (select google_location_id from public.locations where id = ph.location_id) then
      raise exception 'photo_not_on_google';
    end if;
    v_payload := jsonb_build_object('media_ref', v_text, 'category', ph.category);
  when 'special_hours' then
    select * into sh from public.special_hours where id = p_target_id for update;$n$);
  if v_new = v_def then raise exception 'approve_publication: no match (payload)'; end if;
  v_def := v_new;
  v_new := replace(v_def, $o$       when 'local_post_removal' then v_state = 'posted'$o$, $n$       when 'local_post_removal' then v_state = 'posted'
       when 'photo_removal' then v_state = 'posted'$n$);
  if v_new = v_def then raise exception 'approve_publication: no match (superseded)'; end if;
  v_def := v_new;
  v_new := replace(v_def, $o$    update public.photos set state = 'publishing', category = v_cat where id = p_target_id;$o$, $n$    update public.photos set state = 'publishing', category = v_cat where id = p_target_id;
  when 'photo_removal' then
    if v_state <> 'posted' then raise exception 'already_handled'; end if;
    update public.photos set state = 'removing' where id = p_target_id;$n$);
  if v_new = v_def then raise exception 'approve_publication: no match (state)'; end if;
  execute v_new;

  -- record_publication: removed once verified; back to posted if Google refused or it failed.
  v_def := pg_get_functiondef('public.record_publication(uuid,text,text,text,text,text,jsonb,boolean)'::regprocedure);
  v_new := replace(v_def, $o$  when 'special_hours' then
    if v_state = 'verified' then
      update public.special_hours$o$, $n$  when 'photo_removal' then
    if v_state = 'verified' then
      update public.photos set state = 'removed' where id = p.target_id and state = 'removing';
    elsif v_state in ('rejected', 'failed') then
      update public.photos set state = 'posted' where id = p.target_id and state = 'removing';
    end if;
  when 'special_hours' then
    if v_state = 'verified' then
      update public.special_hours$n$);
  if v_new = v_def then raise exception 'record_publication: no match'; end if;
  execute v_new;

  -- undo_publication: an undone removal leaves the photo on Google, as it was.
  v_def := pg_get_functiondef('public.undo_publication(uuid,uuid)'::regprocedure);
  v_new := replace(v_def, $o$  when 'special_hours' then update public.special_hours set state = 'draft'$o$, $n$  when 'photo_removal' then update public.photos set state = 'posted' where id = p.target_id and state = 'removing';
  when 'special_hours' then update public.special_hours set state = 'draft'$n$);
  if v_new = v_def then raise exception 'undo_publication: no match'; end if;
  execute v_new;

  -- The WhatsApp outcome lines (sent, live, did not go through) leave a photo removal out, like a post removal.
  v_def := pg_get_functiondef('public.publication_outcomes_due(integer)'::regprocedure);
  v_new := replace(v_def, $o$and p.target_type <> 'local_post_removal'$o$, $n$and p.target_type not in ('local_post_removal', 'photo_removal')$n$);
  if v_new = v_def then raise exception 'publication_outcomes_due: no match'; end if;
  execute v_new;

  v_def := pg_get_functiondef('private.v4_whatsapp_due()'::regprocedure);
  v_new := replace(v_def, $o$and p.target_type <> 'local_post_removal'$o$, $n$and p.target_type not in ('local_post_removal', 'photo_removal')$n$);
  if v_new = v_def then raise exception 'v4_whatsapp_due: no match'; end if;
  execute v_new;

  -- photo_processed: the small copy's path, in the business's own folder like the photo.
  v_def := pg_get_functiondef('public.photo_processed(uuid,jsonb)'::regprocedure);
  v_new := replace(v_def, $o$    update public.photos set storage_path = p_result ->> 'path', width = (p_result ->> 'width')::integer,$o$, $n$    if p_result ->> 'thumb' is not null and split_part(p_result ->> 'thumb', '/', 1) <> ph.location_id::text then raise exception 'bad_path'; end if;
    update public.photos set storage_path = p_result ->> 'path', thumb_path = p_result ->> 'thumb', width = (p_result ->> 'width')::integer,$n$);
  if v_new = v_def then raise exception 'photo_processed: no match'; end if;
  execute v_new;

  -- detect_failed_publishes: a failed photo removal is a photo task with its own title.
  v_def := pg_get_functiondef('private.detect_failed_publishes(uuid)'::regprocedure);
  v_new := replace(v_def, $o$when 'photo' then 'photo_batch'
$o$, $n$when 'photo' then 'photo_batch' when 'photo_removal' then 'photo_batch'
$n$);
  if v_new = v_def then raise exception 'detect_failed_publishes: no match (kind)'; end if;
  v_def := v_new;
  v_new := replace(v_def, $o$when 'photo_batch' then 'A photo did not reach Google'$o$, $n$when 'photo_batch' then case p.target_type when 'photo_removal'
                    then 'A photo removal did not go through' else 'A photo did not reach Google' end$n$);
  if v_new = v_def then raise exception 'detect_failed_publishes: no match (title)'; end if;
  execute v_new;

  -- run_retention: a removed photo's files go 30 days (the photo limit) after it was removed.
  v_def := pg_get_functiondef('private.run_retention()'::regprocedure);
  v_new := replace(v_def, $o$((state = 'posted' and settled_at < now() - make_interval(days => v_photos)) or state = 'skipped')$o$, $n$((state = 'posted' and settled_at < now() - make_interval(days => v_photos))
       or (state = 'removed' and updated_at < now() - make_interval(days => v_photos)) or state = 'skipped')$n$);
  if v_new = v_def then raise exception 'run_retention: no match'; end if;
  execute v_new;
end
$mig$;
