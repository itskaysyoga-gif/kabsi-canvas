-- P0.8-03 WhatsApp owner channel (K-129, K-17, K-70, K-113, R-36). Additive: four new tables (service role only), the
-- channel `whatsapp` on publications and audit events, approve_publication taking that channel with the K-129 point 2
-- refusals, the publish job re-checking a reply is still the one approved, and the RPCs the `whatsapp` Edge Function
-- calls. Nothing here sends a message; the function does, through Kapso, and only to an owner who opted in.
-- The foreign keys (on delete cascade) are in 20261022034010_whatsapp_owner_channel_links.sql (R-44).

-- 1. The channel, on the publication and in the audit log.
alter table public.publications drop constraint publications_channel_check;
alter table public.publications add constraint publications_channel_check
  check (channel in ('dashboard', 'email_link', 'whatsapp'));
alter table public.audit_events drop constraint audit_events_channel_check;
alter table public.audit_events add constraint audit_events_channel_check
  check (channel in ('dashboard', 'email_link', 'partner', 'staff', 'system', 'google', 'whatsapp'));

-- 2. Tables. No policies: the browser reads its own status through whatsapp_status(), everything else is the function's.
create table public.whatsapp_optins (
  user_id uuid primary key,
  phone text unique check (phone ~ '^\+[1-9][0-9]{6,14}$'),
  state text not null default 'pending' check (state in ('pending', 'active', 'stopped')),
  code_hash text,
  code_expires_at timestamptz,
  -- What the owner was shown when they pressed Connect, and when they sent the code (the opt-in, K-129 point 1).
  consent_text text not null,
  requested_at timestamptz not null default now(),
  verified_at timestamptz,
  stopped_at timestamptz,
  review_alerts boolean not null default true,
  digest_optin boolean not null default false,
  digest_consent_at timestamptz,
  updated_at timestamptz not null default now()
);
create table public.whatsapp_window (
  user_id uuid primary key,
  phone text not null,
  last_inbound_at timestamptz not null
);
create table public.whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  location_id uuid,
  direction text not null check (direction in ('in', 'out')),
  kind text not null check (kind ~ '^[a-z][a-z_]*$'),
  state text not null check (state in ('received', 'ignored', 'sent', 'mock_sent', 'held', 'refused', 'failed',
                                       'delivered', 'read')),
  provider_id text unique,
  template text,
  error text check (length(error) <= 500),
  dedupe_key text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index whatsapp_messages_user on public.whatsapp_messages (user_id, created_at desc);
-- One button press is one action: the token (only its hash is kept) names the item and the draft the owner saw.
create table public.whatsapp_actions (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  user_id uuid not null,
  location_id uuid not null,
  target_type text not null check (target_type in ('review_reply', 'local_post', 'listing_revert')),
  target_id uuid not null,
  draft_hash text not null,
  publication_id uuid,
  expires_at timestamptz not null,
  used_at timestamptz,
  result jsonb,
  created_at timestamptz not null default now()
);
create index whatsapp_actions_target on public.whatsapp_actions (target_type, target_id);
alter table public.whatsapp_optins enable row level security;
alter table public.whatsapp_window enable row level security;
alter table public.whatsapp_messages enable row level security;
alter table public.whatsapp_actions enable row level security;
revoke all on public.whatsapp_optins, public.whatsapp_window, public.whatsapp_messages, public.whatsapp_actions
  from anon, authenticated;

-- 3. The identity fields WhatsApp never approves (K-129 point 2): name, address, categories, map pin, phone, open or closed.
create or replace function private.whatsapp_identity_field(p_field text) returns boolean
language sql immutable set search_path = '' as $$
  select coalesce(p_field, '') in ('name', 'address', 'main_category', 'categories', 'additional_categories', 'map_pin',
                                   'phone', 'open_status')
$$;

create or replace function private.whatsapp_hash(p_text text) returns text
language sql immutable set search_path = '' as $$
  select encode(extensions.digest(coalesce(p_text, ''), 'sha256'), 'hex')
$$;

-- 4. approve_publication: the same function with the channel `whatsapp` and its refusals.
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
  if p_channel not in ('dashboard', 'email_link', 'whatsapp') then raise exception 'bad_channel'; end if;
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


-- 5. claim_publication: the publish job re-checks that the reply is still the one approved (K-129 point 3). The approval
-- claimed the review (state publishing); a review answered, skipped or reset since then is not published.
CREATE OR REPLACE FUNCTION public.claim_publication(p_publication uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare p public.publications; l public.locations; v_review text;
begin
  select * into p from public.publications where id = p_publication for update;
  if not found then return jsonb_build_object('result', 'missing'); end if;
  if p.state <> 'approved' then return jsonb_build_object('result', 'not_approved', 'state', p.state); end if;
  if p.publish_after is null then return jsonb_build_object('result', 'not_approved', 'state', p.state); end if;
  if p.publish_after > now() then return jsonb_build_object('result', 'not_due', 'publish_after', p.publish_after); end if;
  if p.payload_redacted_at is not null or (p.target_type = 'review_reply' and p.payload ->> 'text' is null) then
    perform public.record_publication(p.id, 'failed', 'The approved text is no longer kept. Approve a new reply.',
      'payload_redacted', null, null, null, true);
    return jsonb_build_object('result', 'stopped');
  end if;
  if p.target_type = 'review_reply'
     and not exists (select 1 from public.reviews where id = p.target_id and state = 'publishing') then
    perform public.record_publication(p.id, 'failed', 'This reply changed after it was approved. Nothing was sent.',
      'not_draft', null, null, null, true);
    return jsonb_build_object('result', 'stopped');
  end if;

  select * into l from public.locations where id = p.location_id;
  if l.status <> 'active' or l.google_location_id is null then
    perform public.record_publication(p.id, 'failed',
      'Kabsi sends to Google while a free trial or a Pro plan is active and Kabsi can reach your profile.',
      'location_not_active', null, null, null, true);
    return jsonb_build_object('result', 'stopped');
  end if;
  if l.concierge and p.target_type <> 'review_reply' then
    perform public.record_publication(p.id, 'failed',
      'Kabsi does not change your Google profile yet. Nothing was sent.', 'concierge_profile', null, null, null, true);
    return jsonb_build_object('result', 'stopped');
  end if;

  update public.publications set state = 'publishing', attempts = attempts + 1, claimed_at = now() where id = p.id;

  if p.route = 'concierge' then
    -- Early access (D267): a person posts it by hand; staff "Mark posted" makes it live. No Google call.
    insert into public.concierge_tasks (location_id, kind, review_id, publication_id)
    values (p.location_id, 'post_reply', p.target_id, p.id);
    return jsonb_build_object('result', 'concierge');
  end if;

  if p.target_type = 'review_reply' then
    select google_review_id into v_review from public.reviews where id = p.target_id;
  end if;
  return jsonb_build_object('result', 'claimed', 'publication_id', p.id, 'location_id', p.location_id,
    'target_type', p.target_type, 'target_id', p.target_id, 'text', p.payload ->> 'text', 'payload', p.payload,
    'attempts', p.attempts + 1, 'google_account_id', l.google_account_id, 'google_location_id', l.google_location_id,
    'google_review_id', v_review);
end $function$;

-- 6. Connect WhatsApp (signed-in member): a one-time code the owner sends from their phone. Sending it is the opt-in
-- (K-129 point 1): the time, the number and the wording shown are recorded when the code arrives.
create or replace function public.whatsapp_connect_start(p_consent_text text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_code text;
begin
  if v_user is null then raise exception 'sign_in_required' using errcode = '42501'; end if;
  if not exists (select 1 from public.location_members where user_id = v_user) then
    raise exception 'not_member' using errcode = '42501';
  end if;
  if length(trim(coalesce(p_consent_text, ''))) < 40 then raise exception 'consent_text_required'; end if;
  v_code := lpad(((('x' || encode(extensions.gen_random_bytes(4), 'hex'))::bit(32)::bigint) % 1000000)::text, 6, '0');
  insert into public.whatsapp_optins as o (user_id, state, code_hash, code_expires_at, consent_text, requested_at)
  values (v_user, 'pending', private.whatsapp_hash(v_code), now() + interval '30 minutes', trim(p_consent_text), now())
  on conflict (user_id) do update set code_hash = excluded.code_hash, code_expires_at = excluded.code_expires_at,
    consent_text = excluded.consent_text, requested_at = now(), updated_at = now(),
    state = case when o.state = 'active' then 'active' else 'pending' end;
  return jsonb_build_object('code', v_code, 'expires_at', now() + interval '30 minutes');
end $$;

create or replace function public.whatsapp_status() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce((select jsonb_build_object('state', o.state, 'phone_last4', right(o.phone, 4), 'verified_at', o.verified_at,
      'stopped_at', o.stopped_at, 'review_alerts', o.review_alerts, 'digest_optin', o.digest_optin)
    from public.whatsapp_optins o where o.user_id = auth.uid()), jsonb_build_object('state', 'none'))
$$;

create or replace function public.whatsapp_set_prefs(p_review_alerts boolean, p_digest boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'sign_in_required' using errcode = '42501'; end if;
  update public.whatsapp_optins set review_alerts = coalesce(p_review_alerts, review_alerts),
    digest_optin = coalesce(p_digest, digest_optin),
    digest_consent_at = case when p_digest and not digest_optin then now() when p_digest is false then null else digest_consent_at end,
    updated_at = now()
   where user_id = auth.uid();
  return public.whatsapp_status();
end $$;

-- Disconnect from the app: the same as STOP.
create or replace function public.whatsapp_disconnect() returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'sign_in_required' using errcode = '42501'; end if;
  update public.whatsapp_optins set state = 'stopped', stopped_at = now(), code_hash = null, updated_at = now()
   where user_id = auth.uid() and state <> 'stopped';
  return public.whatsapp_status();
end $$;

-- 7. The function's side (service role).
-- An inbound message, once: a provider id seen before is a replay and returns duplicate. Known senders open the
-- 24-hour window (K-129 point 4).
create or replace function public.whatsapp_inbound(p_phone text, p_provider_id text, p_kind text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare o public.whatsapp_optins; v_id uuid;
begin
  if p_provider_id is null or length(p_provider_id) < 3 then raise exception 'provider_id_required'; end if;
  select * into o from public.whatsapp_optins where phone = p_phone;
  insert into public.whatsapp_messages (user_id, direction, kind, state, provider_id)
  values (o.user_id, 'in', coalesce(nullif(p_kind, ''), 'other'), case when o.user_id is null then 'ignored' else 'received' end,
    p_provider_id)
  on conflict (provider_id) do nothing returning id into v_id;
  if v_id is null then return jsonb_build_object('duplicate', true); end if;
  if o.user_id is not null then
    insert into public.whatsapp_window (user_id, phone, last_inbound_at) values (o.user_id, p_phone, now())
    on conflict (user_id) do update set phone = excluded.phone, last_inbound_at = now();
  end if;
  return jsonb_build_object('duplicate', false, 'known', o.user_id is not null, 'user_id', o.user_id, 'state', o.state);
end $$;

-- The code the owner sent: verifies the number, records the opt-in and opens the window.
create or replace function public.whatsapp_verify(p_phone text, p_code text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare o public.whatsapp_optins;
begin
  if p_phone !~ '^\+[1-9][0-9]{6,14}$' then return jsonb_build_object('result', 'bad_phone'); end if;
  select * into o from public.whatsapp_optins
   where code_hash = private.whatsapp_hash(p_code) and code_expires_at > now() for update;
  if not found then return jsonb_build_object('result', 'unknown_code'); end if;
  if exists (select 1 from public.whatsapp_optins where phone = p_phone and user_id <> o.user_id and state = 'active') then
    return jsonb_build_object('result', 'phone_in_use');
  end if;
  update public.whatsapp_optins set phone = null where phone = p_phone and user_id <> o.user_id;
  update public.whatsapp_optins set phone = p_phone, state = 'active', verified_at = now(), stopped_at = null,
    code_hash = null, code_expires_at = null, updated_at = now()
   where user_id = o.user_id;
  insert into public.whatsapp_window (user_id, phone, last_inbound_at) values (o.user_id, p_phone, now())
  on conflict (user_id) do update set phone = excluded.phone, last_inbound_at = now();
  perform private.audit('user', o.user_id, 'whatsapp_optin', null, 'user', o.user_id::text, null,
    jsonb_build_object('phone_last4', right(p_phone, 4), 'consent_text', o.consent_text), 'whatsapp', 'active');
  return jsonb_build_object('result', 'verified', 'user_id', o.user_id);
end $$;

-- STOP and its variants (K-129 point 7): every send stops at once, and it is recorded.
create or replace function public.whatsapp_stop(p_phone text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare o public.whatsapp_optins;
begin
  update public.whatsapp_optins set state = 'stopped', stopped_at = now(), updated_at = now()
   where phone = p_phone and state <> 'stopped' returning * into o;
  if not found then return jsonb_build_object('result', 'not_found'); end if;
  perform private.audit('user', o.user_id, 'whatsapp_optin', null, 'user', o.user_id::text, null,
    jsonb_build_object('phone_last4', right(p_phone, 4)), 'whatsapp', 'stopped');
  return jsonb_build_object('result', 'stopped', 'user_id', o.user_id);
end $$;

-- May Kabsi send this person something now? No opt-in or STOP: refused. Inside 24 hours of their last message: a
-- normal message. Outside: only an approved template (the function holds the message when it has none).
create or replace function public.whatsapp_may_send(p_user uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select case
    when o.user_id is null then jsonb_build_object('ok', false, 'reason', 'no_optin')
    when o.state = 'stopped' then jsonb_build_object('ok', false, 'reason', 'stopped')
    when o.state <> 'active' or o.phone is null then jsonb_build_object('ok', false, 'reason', 'not_verified')
    else jsonb_build_object('ok', true, 'phone', o.phone, 'review_alerts', o.review_alerts, 'digest', o.digest_optin,
      'in_window', coalesce((select w.last_inbound_at > now() - interval '24 hours' from public.whatsapp_window w
                              where w.user_id = o.user_id and w.phone = o.phone), false))
  end
  from (select 1) one left join public.whatsapp_optins o on o.user_id = p_user
$$;

create or replace function public.whatsapp_record(p_user uuid, p_location uuid, p_kind text, p_state text,
  p_provider_id text default null, p_template text default null, p_error text default null, p_dedupe text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  insert into public.whatsapp_messages (user_id, location_id, direction, kind, state, provider_id, template, error, dedupe_key)
  values (p_user, p_location, 'out', p_kind, p_state, p_provider_id, p_template, left(p_error, 500), p_dedupe)
  on conflict (dedupe_key) do nothing returning id into v_id;
  return v_id;
end $$;

-- Delivery receipts from Kapso.
create or replace function public.whatsapp_status_update(p_provider_id text, p_state text, p_error text default null)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if p_state not in ('sent', 'delivered', 'read', 'failed') then raise exception 'bad_state'; end if;
  update public.whatsapp_messages set state = p_state, error = coalesce(left(p_error, 500), error), updated_at = now()
   where provider_id = p_provider_id and direction = 'out';
  return found;
end $$;

-- What WhatsApp may approve (K-129 point 2), and the draft the owner sees, for one item.
create or replace function private.whatsapp_item(p_target_type text, p_target_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare r public.reviews; d public.reply_drafts; po public.gbp_posts; pc public.profile_changes;
begin
  case p_target_type
  when 'review_reply' then
    select * into r from public.reviews where id = p_target_id;
    if not found then return jsonb_build_object('ok', false, 'reason', 'unknown_target'); end if;
    if r.risk = 'high' then return jsonb_build_object('ok', false, 'reason', 'high_risk', 'location_id', r.location_id); end if;
    if r.state <> 'drafted' then return jsonb_build_object('ok', false, 'reason', 'not_draft', 'location_id', r.location_id); end if;
    select * into d from public.reply_drafts where review_id = r.id order by version desc limit 1;
    if not found or not d.safety_ok or d.redacted_at is not null or length(trim(coalesce(d.body, ''))) = 0 then
      return jsonb_build_object('ok', false, 'reason', 'no_safe_draft', 'location_id', r.location_id);
    end if;
    return jsonb_build_object('ok', true, 'location_id', r.location_id, 'text', d.body, 'hash', private.whatsapp_hash(d.body));
  when 'local_post' then
    select * into po from public.gbp_posts where id = p_target_id;
    if not found then return jsonb_build_object('ok', false, 'reason', 'unknown_target'); end if;
    if po.state <> 'draft' then return jsonb_build_object('ok', false, 'reason', 'not_draft', 'location_id', po.location_id); end if;
    if length(trim(coalesce(po.body, ''))) < 10 then
      return jsonb_build_object('ok', false, 'reason', 'no_safe_draft', 'location_id', po.location_id);
    end if;
    return jsonb_build_object('ok', true, 'location_id', po.location_id, 'text', po.body, 'hash', private.whatsapp_hash(po.body));
  when 'listing_revert' then
    select * into pc from public.profile_changes where id = p_target_id;
    if not found then return jsonb_build_object('ok', false, 'reason', 'unknown_target'); end if;
    if private.whatsapp_identity_field(pc.field) then
      return jsonb_build_object('ok', false, 'reason', 'identity_field', 'location_id', pc.location_id);
    end if;
    if pc.status not in ('detected', 'awaiting_review') then
      return jsonb_build_object('ok', false, 'reason', 'not_draft', 'location_id', pc.location_id);
    end if;
    return jsonb_build_object('ok', true, 'location_id', pc.location_id, 'text', pc.field,
      'hash', private.whatsapp_hash(pc.id::text || ':' || coalesce(pc.google_value::text, '')));
  else
    return jsonb_build_object('ok', false, 'reason', 'not_on_whatsapp');
  end case;
end $$;

-- A button for one opted-in person and one item. Returns the token once; only its hash is kept. Refused for
-- anything WhatsApp may not approve, so a high-risk review or an identity field never gets an Approve button.
create or replace function public.whatsapp_action_create(p_user uuid, p_target_type text, p_target_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare i jsonb := private.whatsapp_item(p_target_type, p_target_id); v_token text;
begin
  if not (i ->> 'ok')::boolean then return jsonb_build_object('ok', false, 'reason', i ->> 'reason'); end if;
  if not exists (select 1 from public.location_members where location_id = (i ->> 'location_id')::uuid and user_id = p_user) then
    return jsonb_build_object('ok', false, 'reason', 'not_member');
  end if;
  v_token := translate(encode(extensions.gen_random_bytes(18), 'base64'), '+/', '-_');
  insert into public.whatsapp_actions (token_hash, user_id, location_id, target_type, target_id, draft_hash, expires_at)
  values (private.whatsapp_hash(v_token), p_user, (i ->> 'location_id')::uuid, p_target_type, p_target_id, i ->> 'hash',
    now() + interval '72 hours');
  return jsonb_build_object('ok', true, 'token', v_token, 'text', i ->> 'text');
end $$;

-- Approve from WhatsApp (K-129 point 3, K-70): the sender must be the opted-in person the button was made for; the item
-- must still be what they saw; the approval is the one pipeline with channel whatsapp and a 10 second server-side
-- undo. A second press returns the first answer.
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
    v_res := public.approve_publication(a.target_type, a.target_id, v_payload, a.user_id, 'whatsapp', 10);
  exception when others then
    return jsonb_build_object('result', 'refused', 'reason', sqlerrm, 'location_id', a.location_id, 'target_type', a.target_type);
  end;
  update public.whatsapp_actions set used_at = now(), publication_id = (v_res ->> 'publication_id')::uuid,
    result = jsonb_build_object('result', 'approved', 'publication_id', v_res ->> 'publication_id',
      'publish_after', v_res ->> 'publish_after', 'location_id', a.location_id, 'target_type', a.target_type)
   where id = a.id returning result into v_res;
  return v_res;
end $$;

-- Undo from WhatsApp, inside the 10 seconds: the same undo as the app.
create or replace function public.whatsapp_undo(p_token text, p_phone text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare a public.whatsapp_actions; o public.whatsapp_optins;
begin
  select * into a from public.whatsapp_actions where token_hash = private.whatsapp_hash(p_token);
  if not found then return jsonb_build_object('result', 'unknown'); end if;
  select * into o from public.whatsapp_optins where user_id = a.user_id;
  if not found or o.phone is distinct from p_phone then return jsonb_build_object('result', 'unknown'); end if;
  if a.publication_id is null then return jsonb_build_object('result', 'nothing_to_undo'); end if;
  begin
    return jsonb_build_object('result', public.undo_publication(a.publication_id, a.user_id) ->> 'state');
  exception when others then
    return jsonb_build_object('result', case when sqlerrm = 'too_late' then 'too_late' else 'refused' end);
  end;
end $$;

-- 8. Privileges: the four app calls for signed-in people, the rest for the function (service role) only.
revoke all on function public.whatsapp_connect_start(text), public.whatsapp_status(), public.whatsapp_set_prefs(boolean, boolean),
  public.whatsapp_disconnect(), public.whatsapp_inbound(text, text, text), public.whatsapp_verify(text, text),
  public.whatsapp_stop(text), public.whatsapp_may_send(uuid), public.whatsapp_record(uuid, uuid, text, text, text, text, text, text),
  public.whatsapp_status_update(text, text, text), public.whatsapp_action_create(uuid, text, uuid),
  public.whatsapp_approve(text, text), public.whatsapp_undo(text, text) from public, anon, authenticated;
grant execute on function public.whatsapp_connect_start(text), public.whatsapp_status(),
  public.whatsapp_set_prefs(boolean, boolean), public.whatsapp_disconnect() to authenticated;
grant execute on function public.whatsapp_inbound(text, text, text), public.whatsapp_verify(text, text),
  public.whatsapp_stop(text), public.whatsapp_may_send(uuid), public.whatsapp_record(uuid, uuid, text, text, text, text, text, text),
  public.whatsapp_status_update(text, text, text), public.whatsapp_action_create(uuid, text, uuid),
  public.whatsapp_approve(text, text), public.whatsapp_undo(text, text) to service_role;
revoke all on function private.whatsapp_identity_field(text), private.whatsapp_hash(text), private.whatsapp_item(text, uuid)
  from public, anon, authenticated;
