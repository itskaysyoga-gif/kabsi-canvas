-- Fix 2 part B (master plan 30.27 item 2, R-107): a post's approval is bound to its text AND its photo.
-- Before this, a WhatsApp Approve for a post was bound to the post's text only (private.whatsapp_item hashed the body), and
-- the website's Approve sent only the text. A photo changed after the draft was shown could go to Google under the old yes.
--
-- The photo is identified by its id and by the content hash of its stored file: the file as the sender sent it
-- (photos.original_path, else storage_path), whose eTag Supabase Storage computes from the bytes. The processed JPEG Kabsi
-- sends is made from that file by Kabsi's own photo engine; the file as sent is the one that stays the same from the
-- WhatsApp preview (made while the photo is still being checked) to the yes. A file that is gone reads as 'no_file'.
--
-- 1. private.post_photo_sig(photo): '<photo id>:<path>:<eTag>' (null when the post has no photo).
-- 2. public.photo_sig(gbp_posts): the same, as a field the Posts page reads with the post (members of its business only),
--    so the page can send back exactly the photo it showed.
-- 3. private.whatsapp_item, local_post: the hash covers the text and the photo signature; the item also returns them.
-- 4. public.whatsapp_approve: passes the photo id and signature the token was checked against on to approve_publication.
-- 5. public.approve_publication, local_post: the payload must name the photo id and signature that were shown; under the row
--    lock they must still be the post's own, or the approval is refused with 'post_changed' (nothing is approved).
--
-- Only CREATE OR REPLACE, REVOKE, GRANT, COMMENT and DO blocks. Nothing is dropped, updated or deleted.

create or replace function private.post_photo_sig(p_photo uuid) returns text
language sql stable security definer set search_path = '' as $$
  select ph.id::text || ':' || coalesce(ph.original_path, ph.storage_path, '') || ':' ||
         coalesce((select coalesce(o.metadata ->> 'eTag', 'at ' || o.updated_at::text)
                     from storage.objects o
                    where o.bucket_id = 'owner-photos' and o.name = coalesce(ph.original_path, ph.storage_path)
                    limit 1), 'no_file')
    from public.photos ph
   where ph.id = p_photo
$$;
revoke all on function private.post_photo_sig(uuid) from public, anon, authenticated;
comment on function private.post_photo_sig(uuid) is
  'Fix 2: a post photo''s identity for approvals: its id, the path of the file as sent, and that file''s content hash (eTag).';

create or replace function public.photo_sig(p public.gbp_posts) returns text
language sql stable security definer set search_path = '' as $$
  select private.post_photo_sig(p.photo_id)
   where p.photo_id is not null
     and exists (select 1 from public.photos ph where ph.id = p.photo_id and ph.location_id = p.location_id)
     and (coalesce(auth.role(), 'service_role') = 'service_role' or public.is_member(p.location_id))
$$;
revoke all on function public.photo_sig(public.gbp_posts) from public, anon;
grant execute on function public.photo_sig(public.gbp_posts) to authenticated, service_role;
comment on function public.photo_sig(public.gbp_posts) is
  'Fix 2: the post''s photo signature, read with the post (select ..., photo_sig) and sent back with the approval.';

-- 3. whatsapp_item: the post's hash covers its photo.
do $$
declare d text; n text;
begin
  d := pg_get_functiondef('private.whatsapp_item(text, uuid)'::regprocedure);
  n := replace(d,
    $x$return jsonb_build_object('ok', true, 'location_id', po.location_id, 'text', po.body, 'hash', private.whatsapp_hash(po.body));$x$,
    $x$return jsonb_build_object('ok', true, 'location_id', po.location_id, 'text', po.body,
      'photo_id', po.photo_id, 'photo_sig', private.post_photo_sig(po.photo_id),
      'hash', case when po.photo_id is null then private.whatsapp_hash(po.body)
                   else private.whatsapp_hash(po.body || chr(10) || 'photo ' || coalesce(private.post_photo_sig(po.photo_id), 'missing')) end);$x$);
  if n = d then raise exception 'whatsapp_item: the local_post line was not found'; end if;
  execute n;
end $$;

-- 4. whatsapp_approve: the photo checked with the token goes on to approve_publication.
do $$
declare d text; n text;
begin
  d := pg_get_functiondef('public.whatsapp_approve(text, text)'::regprocedure);
  n := replace(d,
    $x$when 'local_post' then jsonb_build_object('summary', i ->> 'text')$x$,
    $x$when 'local_post' then jsonb_build_object('summary', i ->> 'text', 'photo_id', i -> 'photo_id', 'photo_sig', i -> 'photo_sig')$x$);
  if n = d then raise exception 'whatsapp_approve: the local_post payload was not found'; end if;
  execute n;
end $$;

-- 5. approve_publication: a post's yes names the photo it was given for; under the row lock it must still be the post's.
do $$
declare d text; n text;
begin
  d := pg_get_functiondef('public.approve_publication(text, uuid, jsonb, uuid, text, integer)'::regprocedure);
  n := replace(d,
    $x$    if po.photo_id is not null then
      select storage_path into v_photo from public.photos$x$,
    $x$    -- Fix 2: the yes is for the photo that was shown (its id and its file's content hash), not whatever the post has now.
    if not (p_payload ? 'photo_id' and p_payload ? 'photo_sig')
       or nullif(p_payload ->> 'photo_id', '') is distinct from po.photo_id::text
       or nullif(p_payload ->> 'photo_sig', '') is distinct from private.post_photo_sig(po.photo_id) then
      raise exception 'post_changed';
    end if;
    if po.photo_id is not null then
      select storage_path into v_photo from public.photos$x$);
  if n = d then raise exception 'approve_publication: the local_post block was not found'; end if;
  execute n;
end $$;
