-- Sec 1, found by the approval property test in CI (supabase/tests/sec1_approval_properties.ts): the owner approves
-- a reply, the draft is edited inside the 10 seconds (the review goes back to a draft), then the owner presses Yes on
-- WhatsApp for the new words. approve_publication returned the first, stale publication (the old words) as "approved";
-- it then failed at the claim, so the new words were never sent although the owner was told they were. Now a
-- publication still waiting on an item that is back to a draft is cancelled (error 'superseded') and the new yes makes
-- its own publication. approve_publication as in 20261022044000_protection_putback_autofix.sql otherwise.
CREATE OR REPLACE FUNCTION public.approve_publication(p_target_type text, p_target_id uuid, p_payload jsonb, p_approved_by uuid, p_channel text, p_undo_seconds integer DEFAULT 10)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare l public.locations; p public.publications; v_loc uuid; v_state text; v_payload jsonb; v_text text;
  v_n integer; r public.reviews; po public.gbp_posts; ph public.photos; sh public.special_hours;
  pc public.profile_changes; kf public.knowledge_facts; v_cat text; v_target uuid := p_target_id;
  v_photo text; v_undo integer := p_undo_seconds;
begin
  if p_channel not in ('dashboard', 'email_link', 'whatsapp', 'auto_fix') then raise exception 'bad_channel'; end if;
  -- P0.8-04 (K-130 point 2): auto-fix only ever puts back regular hours, special hours or the website.
  if p_channel = 'auto_fix' and (p_target_type <> 'listing_revert' or not exists (select 1 from public.profile_changes
       where (id = p_target_id or listing_change_id = p_target_id) and private.autofix_field(field))) then
    raise exception 'not_auto_fix';
  end if;
  -- P0.8-03 (K-129 point 2): WhatsApp never approves a high-risk reply, an identity field or anything but replies,
  -- posts and put-backs; whatsapp_approve checks the same before it gets here.
  if p_channel = 'whatsapp' and (p_target_type not in ('review_reply', 'local_post', 'listing_revert', 'special_hours', 'photo')
       or (p_target_type = 'review_reply' and exists (select 1 from public.reviews where id = p_target_id and risk = 'high'))
       or (p_target_type = 'listing_revert' and exists (select 1 from public.profile_changes
             where (id = p_target_id or listing_change_id = p_target_id) and private.whatsapp_identity_field(field)))) then
    raise exception 'not_on_whatsapp';
  end if;

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
    -- P0.5-02: the post type, its Event or Offer fields and its one photo go with the approval; a scheduled post waits
    -- in Kabsi's queue (and can be undone) until its time.
    if po.photo_id is not null then
      select storage_path into v_photo from public.photos
       where id = po.photo_id and location_id = po.location_id and kind = 'photo' and state in ('draft', 'publishing', 'posted')
         and file_deleted_at is null;
      if not found then raise exception 'post_photo_missing'; end if;
    end if;
    v_payload := jsonb_build_object('summary', v_text, 'language', coalesce(nullif(p_payload ->> 'language', ''), 'en'),
      'cta_type', po.cta_type, 'cta_url', po.cta_url, 'topic_type', po.topic_type, 'event_title', po.event_title,
      'start_date', po.start_date, 'end_date', po.end_date, 'start_time', to_char(po.start_time, 'HH24:MI'),
      'end_time', to_char(po.end_time, 'HH24:MI'), 'offer_terms', po.offer_terms, 'coupon_code', po.coupon_code,
      'redeem_url', po.redeem_url, 'photo_path', v_photo);
    if po.publish_at is not null and po.publish_at > now() then
      v_undo := greatest(coalesce(p_undo_seconds, 10), ceil(extract(epoch from po.publish_at - now()))::integer);
    end if;
  when 'local_post_removal' then
    -- P0.7-05: only a post that is on Google, found by the name Google gave it when Kabsi published it.
    if p_channel <> 'dashboard' then raise exception 'not_on_this_channel'; end if;
    select * into po from public.gbp_posts where id = p_target_id for update;
    if not found then raise exception 'unknown_target'; end if;
    v_loc := po.location_id; v_state := po.state;
    select google_ref into v_text from public.publications
     where target_type = 'local_post' and target_id = p_target_id and state = 'verified' and google_ref is not null
     order by created_at desc limit 1;
    if v_text is null then raise exception 'post_not_on_google'; end if;
    v_payload := jsonb_build_object('post_ref', v_text, 'summary', po.body);
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
  -- Sec 1: a yes still waiting (approved, not yet claimed) on an item that has since gone back to a draft (an edit or
  -- a new version during the 10 seconds) is stale: it is cancelled and this yes, on the words shown now, makes a new
  -- publication. Otherwise a second yes for the new words would get the old publication back, which then fails.
  if found and p.state = 'approved' and (case p_target_type
       when 'review_reply' then v_state in ('drafted', 'blocked')
       when 'local_post_removal' then v_state = 'posted'
       when 'listing_revert' then v_state in ('detected', 'awaiting_review')
       else v_state = 'draft' end) then
    update public.publications set state = 'cancelled', error = 'superseded' where id = p.id;
  elsif found then
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
  when 'local_post_removal' then
    if v_state <> 'posted' then raise exception 'already_handled'; end if;
    update public.gbp_posts set state = 'removing' where id = p_target_id;
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
    now() + make_interval(secs => greatest(coalesce(v_undo, 10), 0)))
  returning * into p;
  if p_target_type = 'listing_revert' then
    update public.profile_changes set publication_id = p.id where id = v_target;
  end if;
  perform public.enqueue_job('publish', p.location_id, 'publish:' || p.id, jsonb_build_object('publication_id', p.id),
    p.publish_after);
  return jsonb_build_object('publication_id', p.id, 'state', p.state, 'route', p.route,
    'publish_after', p.publish_after, 'created', true);
end $function$;
