-- P0.8-04 Protection: one-tap put-back on WhatsApp and Pro auto-fix (K-130, K-19, K-129, K-137, guardrail 7). Additive.
--
-- K-130 point 5 gate. Google's Business Profile APIs policies (developers.google.com/my-business/content/policies,
-- last updated 28 Aug 2026, read 22 Oct 2026), "Automated use of your Business Profile project": "You may not use the
-- Business Profile APIs to automatically revert changes made by Google." The owner's opt-in does not change that, so
-- auto-fix ships switched off: app_settings.protection_autofix is 'off', nobody can opt in while it is off, and the
-- auto-fix function does nothing. The rules are built and tested so the lane R chat can decide with Google's written
-- answer. One-tap put-back ("Keep my information", the owner's own tap) needs no such gate and works in the app, by
-- email link and, for the fields WhatsApp may approve, on WhatsApp.

-- 1. The channels: whatsapp put-backs go through decide_profile_change; auto_fix is recorded as its own approval.
alter table public.publications drop constraint publications_channel_check;
alter table public.publications add constraint publications_channel_check
  check (channel in ('dashboard', 'email_link', 'whatsapp', 'auto_fix'));
alter table public.audit_events drop constraint audit_events_channel_check;
alter table public.audit_events add constraint audit_events_channel_check
  check (channel in ('dashboard', 'email_link', 'partner', 'staff', 'system', 'google', 'whatsapp', 'auto_fix'));

insert into public.app_settings (key, value) values ('protection_autofix', 'off') on conflict (key) do nothing;

-- 2. The three fields auto-fix may ever touch (K-130 point 2). Never name, address, category, map pin, phone or open status.
create or replace function private.autofix_field(p_field text) returns boolean
language sql immutable set search_path = '' as $$
  select coalesce(p_field, '') in ('regular_hours', 'special_hours', 'website')
$$;

-- 3. The owner's opt-in per field (Pro), with the wording and the time, and the revert log.
create table private.protection_autofix (
  location_id uuid not null,
  field text not null check (private.autofix_field(field)),
  state text not null default 'on' check (state in ('on', 'needs_review', 'off')),
  consent_text text not null,
  consented_by uuid not null,
  consented_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (location_id, field)
);
create table private.google_revert_log (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null,
  field text not null,
  reverted_at timestamptz not null default now(),
  count integer not null check (count >= 1),
  publication_id uuid
);
create index google_revert_log_recent on private.google_revert_log (location_id, field, reverted_at desc);
revoke all on private.protection_autofix, private.google_revert_log from public, anon, authenticated;

-- 4. approve_publication: the same function, also taking auto_fix for the three fields.
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
  if p_channel = 'whatsapp' and (p_target_type not in ('review_reply', 'local_post', 'listing_revert')
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
-- 5. decide_profile_change: the same function, taking whatsapp (the owner's tap on WhatsApp) and auto_fix (the owner's
-- opt-in). Neither ever decides an identity field; every other guard (two put-backs in 30 days, then Google support)
-- stays as it was.
CREATE OR REPLACE FUNCTION public.decide_profile_change(p_change uuid, p_decision text, p_user uuid, p_channel text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare c public.profile_changes; l public.locations; f public.knowledge_facts; v_role text; v_new uuid; v_last timestamptz;
  v_n integer; r jsonb;
begin
  if p_decision not in ('accept', 'reject') then raise exception 'bad_decision'; end if;
  if p_channel not in ('dashboard', 'email_link', 'whatsapp', 'auto_fix') then raise exception 'bad_channel'; end if;
  select * into c from public.profile_changes where id = p_change for update;
  if not found then raise exception 'unknown_change'; end if;
  if p_channel = 'whatsapp' and private.whatsapp_identity_field(c.field) then raise exception 'not_on_whatsapp'; end if;
  if p_channel = 'auto_fix' and (p_decision <> 'reject' or not private.autofix_field(c.field)) then raise exception 'not_auto_fix'; end if;
  select role into v_role from public.location_members where location_id = c.location_id and user_id = p_user;
  if v_role is null then raise exception 'not_member'; end if;
  if c.status not in ('detected', 'awaiting_review') then raise exception 'already_decided'; end if;
  if private.protection_high_risk(c.field) then
    if p_channel <> 'dashboard' and not private.signed_in_as(p_user) then raise exception 'sign_in_required'; end if;
    if v_role <> 'owner' then raise exception 'owner_only'; end if;
  end if;
  if not private.may_approve(c.location_id, 'profile_change', p_user, private.protection_high_risk(c.field)) then
    raise exception 'not_allowed_to_approve' using errcode = '42501';
  end if;
  select * into l from public.locations where id = c.location_id;

  select * into f from public.knowledge_facts
   where location_id = c.location_id and slot = 'profile.' || c.field and superseded_by is null for update;

  if p_decision = 'accept' then
    if c.google_value is null then raise exception 'values_cleared'; end if;
    v_new := gen_random_uuid();
    if f.id is not null then update public.knowledge_facts set superseded_by = v_new where id = f.id; end if;
    insert into public.knowledge_facts (id, location_id, slot, key, value, status, source, source_ref, confirmed_by,
      confirmed_at, uses, version)
    values (v_new, c.location_id, 'profile.' || c.field, c.field,
      jsonb_build_object('display', coalesce(c.google_value ->> 'display', ''), 'raw', coalesce(c.google_value -> 'raw', 'null'::jsonb)),
      'verified', 'google', 'profile_change:' || c.id, p_user, now(), array['profile'], coalesce(f.version, 0) + 1);
    update public.profile_changes set status = 'accepted', decided_by = p_user, decided_at = now() where id = c.id;
    return jsonb_build_object('state', 'accepted', 'fact_id', v_new);
  end if;

  if f.id is null or f.status <> 'verified' or f.value is null then raise exception 'not_confirmed'; end if;
  if l.status <> 'active' or l.google_location_id is null then raise exception 'location_not_active'; end if;

  if private.protection_high_risk(c.field) then
    select max(p.approved_at) into v_last from public.publications p
     where p.location_id = c.location_id and p.target_type = 'listing_revert' and p.state <> 'cancelled'
       and private.protection_high_risk(private.profile_key(p.payload ->> 'field'))
       and p.approved_at > now() - interval '7 days';
    if v_last is not null then
      raise exception 'high_risk_wait %', to_char((v_last + interval '7 days') at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI"Z"');
    end if;
  end if;

  select count(*) into v_n from public.publications p
   where p.location_id = c.location_id and p.target_type = 'listing_revert' and p.state <> 'cancelled'
     and private.profile_key(p.payload ->> 'field') = c.field and p.approved_at > now() - interval '30 days'
     and not exists (select 1 from public.profile_changes o where o.publication_id = p.id and o.source = 'owner_edit');
  if v_n >= 2 then
    insert into public.staff_followups (kind, location_id, location_name, detail, due_at)
    select 'google_support', l.id, l.name,
      left(format('Google changed the %s again after Kabsi put the owner''s approved value back %s times in 30 days. '
        || 'Kabsi does not send it a third time (K-19). Contact Google Business Profile support: say the owner confirmed '
        || 'this value, Google keeps replacing it, and ask Google to keep the owner''s value. The values are on change %s '
        || 'in Google Protection.', private.protection_label(c.field), v_n, c.id), 500),
      private.add_business_days(now(), 2)
     where not exists (select 1 from public.staff_followups s
                        where s.kind = 'google_support' and s.location_id = l.id and s.done_at is null);
    update public.profile_changes set status = 'rejected', decided_by = p_user, decided_at = now(),
      support_requested_at = now() where id = c.id;
    perform public.ops_emit('protection_support', 'customers', ':telephone_receiver: Google support needed: ' || l.name,
      'Google keeps changing the ' || private.protection_label(c.field) || '. Kabsi put it back twice in 30 days; contact Google support (staff follow-up).',
      '[]', public.ops_staff_btn(), 'protection_support:' || c.id);
    return jsonb_build_object('state', 'support');
  end if;

  r := public.approve_publication('listing_revert', c.id, '{}'::jsonb, p_user, p_channel);
  return (r - 'state') || jsonb_build_object('state', 'rejected', 'publication_state', r ->> 'state');
end $function$;

-- 6. Put-back on WhatsApp goes through decide_profile_change, with all its guards (K-130 point 1).
create or replace function public.whatsapp_approve(p_token text, p_phone text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare a public.whatsapp_actions; o public.whatsapp_optins; i jsonb; v_res jsonb; v_payload jsonb;
begin
  select * into a from public.whatsapp_actions where token_hash = private.whatsapp_hash(p_token) for update;
  if not found then return jsonb_build_object('result', 'unknown'); end if;
  select * into o from public.whatsapp_optins where user_id = a.user_id;
  if not found or o.phone is distinct from p_phone then return jsonb_build_object('result', 'unknown'); end if;
  if o.state <> 'active' then return jsonb_build_object('result', 'stopped'); end if;
  if a.used_at is not null then return a.result || jsonb_build_object('repeat', true); end if;
  if a.expires_at < now() then return jsonb_build_object('result', 'expired', 'location_id', a.location_id); end if;
  i := private.whatsapp_item(a.target_type, a.target_id);
  if not (i ->> 'ok')::boolean then
    return jsonb_build_object('result', 'refused', 'reason', i ->> 'reason', 'location_id', a.location_id,
      'target_type', a.target_type);
  end if;
  if i ->> 'hash' is distinct from a.draft_hash then
    return jsonb_build_object('result', 'refused', 'reason', 'changed', 'location_id', a.location_id, 'target_type', a.target_type);
  end if;
  v_payload := case a.target_type when 'review_reply' then jsonb_build_object('text', i ->> 'text')
                                  when 'local_post' then jsonb_build_object('summary', i ->> 'text')
                                  else '{}'::jsonb end;
  begin
    if a.target_type = 'listing_revert' then
      v_res := public.decide_profile_change(a.target_id, 'reject', a.user_id, 'whatsapp');
      if v_res ->> 'state' = 'support' then
        return jsonb_build_object('result', 'refused', 'reason', 'support', 'location_id', a.location_id, 'target_type', a.target_type);
      end if;
    else
      v_res := public.approve_publication(a.target_type, a.target_id, v_payload, a.user_id, 'whatsapp', 10);
    end if;
  exception when others then
    return jsonb_build_object('result', 'refused', 'reason', sqlerrm, 'location_id', a.location_id, 'target_type', a.target_type);
  end;
  update public.whatsapp_actions set used_at = now(), publication_id = (v_res ->> 'publication_id')::uuid,
    result = jsonb_build_object('result', 'approved', 'publication_id', v_res ->> 'publication_id',
      'publish_after', v_res ->> 'publish_after', 'location_id', a.location_id, 'target_type', a.target_type)
   where id = a.id returning result into v_res;
  return v_res;
end $$;

-- 7. The owner's switch (Pro, owner only, per field). Refused while auto-fix is off by policy; switching off always works.
create or replace function public.set_protection_autofix(p_location uuid, p_field text, p_on boolean, p_consent_text text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null or not exists (select 1 from public.location_members where location_id = p_location and user_id = v_user) then
    raise exception 'not_member' using errcode = '42501';
  end if;
  if not exists (select 1 from public.location_members where location_id = p_location and user_id = v_user and role = 'owner') then
    raise exception 'owner_only' using errcode = '42501';
  end if;
  if not private.autofix_field(p_field) then raise exception 'not_auto_fix'; end if;
  if not coalesce(p_on, false) then
    update private.protection_autofix set state = 'off', updated_at = now() where location_id = p_location and field = p_field;
    return jsonb_build_object('field', p_field, 'state', 'off');
  end if;
  if coalesce((select value from public.app_settings where key = 'protection_autofix'), 'off') <> 'on' then
    raise exception 'autofix_off';
  end if;
  if not coalesce((private.feature_plan(p_location) ->> 'pro')::boolean, false) then raise exception 'pro_required'; end if;
  if length(trim(coalesce(p_consent_text, ''))) < 40 then raise exception 'consent_text_required'; end if;
  insert into private.protection_autofix (location_id, field, state, consent_text, consented_by, consented_at)
  values (p_location, p_field, 'on', trim(p_consent_text), v_user, now())
  on conflict (location_id, field) do update set state = 'on', consent_text = excluded.consent_text,
    consented_by = excluded.consented_by, consented_at = now(), updated_at = now();
  return jsonb_build_object('field', p_field, 'state', 'on');
end $$;

-- 8. Auto-fix one new change (service role, called by the Protection detector). The rules, in order: off by policy;
-- only the three fields; an owner's opt-in that is on; Pro; the profile VERIFIED; fewer than two put-backs of the
-- field in 30 days (the second stops auto-fix for the field, marks it needs review and the detector alerts the owner);
-- then the owner's opted-in approval through decide_profile_change and the one pipeline, channel auto_fix.
create or replace function public.protection_autofix(p_change uuid, p_verification text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare c public.profile_changes; o private.protection_autofix; v_n integer; r jsonb;
begin
  select * into c from public.profile_changes where id = p_change;
  if not found then return jsonb_build_object('result', 'unknown'); end if;
  if coalesce((select value from public.app_settings where key = 'protection_autofix'), 'off') <> 'on' then
    return jsonb_build_object('result', 'off');
  end if;
  if not private.autofix_field(c.field) then return jsonb_build_object('result', 'not_allowed_field'); end if;
  select * into o from private.protection_autofix where location_id = c.location_id and field = c.field for update;
  if not found or o.state = 'off' then return jsonb_build_object('result', 'no_optin'); end if;
  if o.state = 'needs_review' then return jsonb_build_object('result', 'needs_review'); end if;
  if not coalesce((private.feature_plan(c.location_id) ->> 'pro')::boolean, false) then return jsonb_build_object('result', 'not_pro'); end if;
  if p_verification is distinct from 'VERIFIED' then return jsonb_build_object('result', 'not_verified'); end if;
  select count(*) into v_n from private.google_revert_log
   where location_id = c.location_id and field = c.field and reverted_at > now() - interval '30 days';
  if v_n >= 2 then
    update private.protection_autofix set state = 'needs_review', updated_at = now()
     where location_id = c.location_id and field = c.field;
    return jsonb_build_object('result', 'limit', 'field', c.field, 'count', v_n);
  end if;
  begin
    r := public.decide_profile_change(c.id, 'reject', o.consented_by, 'auto_fix');
  exception when others then
    return jsonb_build_object('result', 'refused', 'reason', sqlerrm);
  end;
  if r ->> 'state' <> 'rejected' then return jsonb_build_object('result', 'refused', 'reason', r ->> 'state'); end if;
  insert into private.google_revert_log (location_id, field, count, publication_id)
  values (c.location_id, c.field, v_n + 1, (r ->> 'publication_id')::uuid);
  return jsonb_build_object('result', 'fixed', 'publication_id', r ->> 'publication_id', 'count', v_n + 1);
end $$;

revoke all on function public.set_protection_autofix(uuid, text, boolean, text), public.protection_autofix(uuid, text)
  from public, anon, authenticated;
grant execute on function public.set_protection_autofix(uuid, text, boolean, text) to authenticated;
grant execute on function public.protection_autofix(uuid, text) to service_role;
revoke all on function private.autofix_field(text) from public, anon, authenticated;
