-- P0.2-05: email approvals tightened (K-17, K-38, K-70, A16).
--
-- Additive: one column, one trigger, three new functions; four existing functions are re-created with one change each.
-- Nothing is dropped. The Edge Function code on main keeps working until this task deploys.
--
--   action_tokens.result          the outcome of the one POST that used the link; a second POST gets it back (K-38)
--   72 hours                      a trigger caps every link at 72 hours from its creation (was 7 days); open links
--                                 older than that are ended now
--   public.action_link_view       what the page shows on GET. STABLE: Postgres refuses any write inside it, so opening
--                                 a link (a mail scanner, a preview) can never change anything
--   public.use_action_link        the POST: the link's own action, once, for its recipient only; undo of the
--                                 publication it made inside the 10 seconds (K-70)
--   sign-in (K-17)                profile changes, hours and urgent reviews (the high-risk class until P0.3-03 adds
--                                 reviews.risk) need the recipient signed in on the page; another account's session is
--                                 refused. Review replies, skips and photos keep working from the link alone
--   private.signed_in_as          a transaction-local flag set only by use_action_link once it has checked the session:
--                                 decide_profile_change and approve_publication accept a high-risk field from the email
--                                 page only with it (before: dashboard only)
--   channel email_link            every use writes an email_link_used audit event (user, IP country, user agent from the
--                                 Edge Function's headers); skips and Protection decisions made through a link carry
--                                 the channel email_link (private.audit_review, private.audit_profile_change)

-- 1. 72 hours, single result ---------------------------------------------------------------------------------------------

alter table public.action_tokens add column if not exists result jsonb;
comment on column public.action_tokens.result is
  'P0.2-05: the outcome of the POST that used this link. A second POST returns it instead of acting again (K-38).';

create or replace function private.action_token_cap() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.expires_at := least(new.expires_at, coalesce(new.created_at, now()) + interval '72 hours');
  return new;
end $$;
create trigger action_tokens_cap before insert or update of expires_at, created_at on public.action_tokens
  for each row execute function private.action_token_cap();

-- Links already sent: none lives past 72 hours from now on (6 open links on 12 Oct, all older than 72 hours).
update public.action_tokens set expires_at = created_at + interval '72 hours'
 where used_at is null and expires_at > now() and expires_at > created_at + interval '72 hours';

-- 2. Who needs to sign in, and the flag -----------------------------------------------------------------------------------

-- The verb a link stands for, for the sign-in rule: Review reply, See draft and Edit approve; the Protection links decide.
create or replace function private.action_link_verb(p_action text) returns text
language sql immutable set search_path = '' as $$
  select case when p_action in ('post', 'edit', 'see_draft') then 'post' else p_action end
$$;

-- K-17: no sign-in for review replies and photos; sign-in for profile changes, hours and the high-risk class. Only the
-- verbs that change something need it (Skip and "I'll handle it" never do).
create or replace function private.action_link_needs_sign_in(p_target_type text, p_target_id text, p_do text) returns boolean
language plpgsql stable security definer set search_path = '' as $$
begin
  if p_do not in ('post', 'revert', 'keep') then return false; end if;
  if p_target_type = 'photo' then return false; end if;
  if p_target_type = 'review' then
    if p_target_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then return true; end if;
    return exists (select 1 from public.reviews r where r.id = p_target_id::uuid and r.urgency = 'urgent');
  end if;
  return true;
end $$;

-- True only inside use_action_link, after it checked that the signed-in session is the link's recipient.
create or replace function private.signed_in_as(p_user uuid) returns boolean
language sql stable set search_path = '' as $$
  select p_user is not null and coalesce(current_setting('kabsi.signed_in_user', true), '') = p_user::text
$$;

-- 3. GET: what the page shows ---------------------------------------------------------------------------------------------

-- p_session_user: the signed-in user behind the page, checked by the Edge Function, or null. Returns {status: invalid |
-- expired | used | ok, action, target_type, target_id, location_id, user_id, sign_in, signed_in, other_account, result}.
create or replace function public.action_link_view(p_token_hash text, p_session_user uuid default null) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare t public.action_tokens;
begin
  select * into t from public.action_tokens where token_hash = p_token_hash;
  if not found then return jsonb_build_object('status', 'invalid'); end if;
  return jsonb_build_object(
    'status', case when t.used_at is not null then 'used' when t.expires_at <= now() then 'expired' else 'ok' end,
    'action', t.action, 'target_type', t.target_type, 'target_id', t.target_id, 'location_id', t.location_id,
    'user_id', t.user_id,
    'sign_in', private.action_link_needs_sign_in(t.target_type, t.target_id, private.action_link_verb(t.action)),
    'signed_in', p_session_user is not null and p_session_user = t.user_id,
    'other_account', p_session_user is not null and p_session_user is distinct from t.user_id,
    'result', t.result);
end $$;

-- 4. POST: the one action -------------------------------------------------------------------------------------------------

-- p_do: post | skip | handle_myself | revert | keep | undo. p_text: the reply exactly as shown and edited on the page
-- (D202). p_session_user: as above. p_publication: for undo, the publication this link made.
-- Returns {done, state, publication_id, publish_after} and, for a link already used, the first result with repeat true.
-- Refusals: invalid_link, link_expired, link_used, not_allowed, sign_in_required, wrong_account, not_member,
-- already_handled, and whatever approve_publication, decide_profile_change and undo_publication refuse.
create or replace function public.use_action_link(p_token_hash text, p_do text, p_text text default null,
  p_session_user uuid default null, p_publication uuid default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare t public.action_tokens; v_need boolean; v_signed_in boolean; v_result jsonb; r jsonb; v_state text;
begin
  select * into t from public.action_tokens where token_hash = p_token_hash for update;
  if not found then raise exception 'invalid_link'; end if;

  -- Bound to one recipient: for the kinds that need sign-in, another account's session gets nothing, not even a result.
  v_need := private.action_link_needs_sign_in(t.target_type, t.target_id,
    case when p_do = 'undo' then private.action_link_verb(t.action) else p_do end);
  if v_need and p_session_user is not null and p_session_user is distinct from t.user_id then
    raise exception 'wrong_account';
  end if;

  -- Undo (K-70): only the publication this link made, only inside its 10 seconds (undo_publication checks the time).
  if p_do = 'undo' then
    if t.result ->> 'done' = 'undone' then return t.result || jsonb_build_object('repeat', true); end if;
    if t.used_at is null or p_publication is null or t.result ->> 'publication_id' is distinct from p_publication::text then
      raise exception 'not_allowed';
    end if;
    perform public.undo_publication(p_publication, t.user_id);
    v_result := jsonb_build_object('done', 'undone', 'state', 'cancelled');
    update public.action_tokens set result = v_result where id = t.id;
    perform private.audit('user', t.user_id, 'email_link_used', t.location_id,
      case t.target_type when 'listing_change' then 'profile_change' else t.target_type end, t.target_id, null,
      jsonb_build_object('link', t.action, 'do', 'undo', 'signed_in', p_session_user is not null and p_session_user = t.user_id,
        'publication_id', p_publication), 'email_link', 'undone');
    return v_result;
  end if;

  if t.expires_at <= now() then raise exception 'link_expired'; end if;

  -- K-38: a second POST, whatever it asks, gets the first result, with the publication's state as it is now.
  if t.used_at is not null then
    if t.result is null then raise exception 'link_used'; end if;
    v_result := t.result;
    if v_result ? 'publication_id' then
      select state into v_state from public.publications where id = (v_result ->> 'publication_id')::uuid;
      if found then v_result := v_result || jsonb_build_object('state', v_state); end if;
    end if;
    return v_result || jsonb_build_object('repeat', true);
  end if;

  if t.user_id is null or t.target_type not in ('review', 'listing_change') or not (p_do = any (case t.action
      when 'post' then array['post', 'skip'] when 'edit' then array['post', 'skip']
      when 'see_draft' then array['post', 'handle_myself'] when 'skip' then array['skip']
      when 'handle_myself' then array['handle_myself'] when 'revert' then array['revert', 'keep']
      when 'keep' then array['keep', 'revert'] else array[]::text[] end)) then
    raise exception 'not_allowed';
  end if;

  v_signed_in := p_session_user is not null and p_session_user = t.user_id;
  if v_need and not v_signed_in then raise exception 'sign_in_required'; end if;
  if not exists (select 1 from public.location_members where location_id = t.location_id and user_id = t.user_id) then
    raise exception 'not_member';
  end if;

  -- For this call only: the channel for the audit triggers, and the checked sign-in for the high-risk fields.
  perform set_config('kabsi.channel', 'email_link', true);
  perform set_config('kabsi.signed_in_user', case when v_signed_in then t.user_id::text else '' end, true);

  if t.target_type = 'listing_change' then
    -- "revert" is "Keep my information" (reject Google's value), "keep" is "Google is right" (accept it).
    r := public.decide_profile_change(t.target_id::uuid, case when p_do = 'revert' then 'reject' else 'accept' end,
      t.user_id, 'email_link');
    v_result := jsonb_build_object('done', case r ->> 'state' when 'rejected' then 'reverting' when 'accepted' then 'kept'
        else r ->> 'state' end,
      'state', coalesce(r ->> 'publication_state', r ->> 'state'));
    if r ? 'publication_id' then
      v_result := v_result || jsonb_build_object('publication_id', r -> 'publication_id', 'publish_after', r -> 'publish_after');
    end if;
  elsif p_do = 'post' then
    r := public.approve_publication('review_reply', t.target_id::uuid, jsonb_build_object('text', coalesce(p_text, '')),
      t.user_id, 'email_link');
    v_result := jsonb_build_object('done', case when r ->> 'route' = 'concierge' then 'queued_manual' else 'approved' end,
      'state', r ->> 'state', 'publication_id', r -> 'publication_id', 'publish_after', r -> 'publish_after');
  else
    update public.reviews set state = case when p_do = 'skip' then 'skipped' else 'handled_offline' end
     where id = t.target_id::uuid and state in ('new', 'drafted', 'blocked');
    if not found then raise exception 'already_handled'; end if;
    v_result := jsonb_build_object('done', case when p_do = 'skip' then 'skipped' else 'handled_offline' end);
  end if;

  update public.action_tokens set used_at = now(), result = v_result where id = t.id;
  perform private.audit('user', t.user_id, 'email_link_used', t.location_id,
    case t.target_type when 'listing_change' then 'profile_change' else t.target_type end, t.target_id, null,
    jsonb_build_object('link', t.action, 'do', p_do, 'signed_in', v_signed_in, 'publication_id', v_result -> 'publication_id'),
    'email_link', v_result ->> 'done');

  perform set_config('kabsi.channel', '', true);
  perform set_config('kabsi.signed_in_user', '', true);
  return v_result;
end $$;

-- 5. The channel in the audit triggers ------------------------------------------------------------------------------------

-- As in P0.1-10, plus: a skip or "I'll handle it" made through an email link is recorded with the channel email_link.
create or replace function private.audit_review() returns trigger
language plpgsql security definer set search_path = '' as $$
declare a record;
begin
  if tg_op = 'INSERT' then
    if new.source = 'concierge' then
      perform private.audit('staff', new.entered_by, 'concierge_review_entered', new.location_id, 'review', new.id::text,
        null, jsonb_build_object('star_rating', new.star_rating), 'staff', 'saved');
    end if;
    return null;
  end if;
  if new.state is not distinct from old.state then return null; end if;
  -- publishing -> drafted is a failed or cancelled publication handing the draft back, not a new draft.
  if new.state = 'drafted' and old.state <> 'publishing' then
    perform private.audit('system', null, 'reply_drafted', new.location_id, 'review', new.id::text,
      jsonb_build_object('state', old.state), jsonb_build_object('state', new.state), 'system', 'drafted');
  elsif new.state in ('skipped', 'handled_offline') then
    a := private.audit_actor();
    perform private.audit(a.actor_type, a.actor_id, case new.state when 'skipped' then 'review_skipped' else 'review_handled_offline' end,
      new.location_id, 'review', new.id::text, jsonb_build_object('state', old.state), jsonb_build_object('state', new.state),
      coalesce(nullif(current_setting('kabsi.channel', true), ''),
        case when a.actor_type = 'system' then 'system' else 'dashboard' end), new.state);
  end if;
  return null;
end $$;

-- As in P0.2-04, plus the channel of an owner's decision made through an email link.
create or replace function private.audit_profile_change() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_user boolean;
begin
  if tg_op = 'UPDATE' and new.status is not distinct from old.status then return null; end if;
  v_user := tg_op = 'UPDATE' and new.status in ('accepted', 'rejected') and new.decided_by is not null;
  perform private.audit(case when v_user then 'user' else 'system' end, case when v_user then new.decided_by end,
    'protection_change', new.location_id, 'profile_change', new.id::text,
    case when tg_op = 'UPDATE' then jsonb_build_object('status', old.status) end,
    jsonb_build_object('field', new.field, 'status', new.status, 'source', new.source,
      'confirmed_value', new.previous_fact_id is not null, 'publication_id', new.publication_id,
      'superseded_by', new.superseded_by, 'support', new.support_requested_at is not null),
    case when v_user then nullif(current_setting('kabsi.channel', true), '') end, new.status);
  return null;
end $$;

-- 6. The high-risk fields from the email page, signed in (K-17, K-19) -------------------------------------------------------

-- decide_profile_change and approve_publication as in P0.2-04; the only change is the sign-in check, which now also
-- accepts the email page once use_action_link has checked that the recipient is signed in.

create or replace function public.decide_profile_change(p_change uuid, p_decision text, p_user uuid, p_channel text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare c public.profile_changes; l public.locations; f public.knowledge_facts; v_role text; v_new uuid; v_last timestamptz;
  v_n integer; r jsonb;
begin
  if p_decision not in ('accept', 'reject') then raise exception 'bad_decision'; end if;
  if p_channel not in ('dashboard', 'email_link') then raise exception 'bad_channel'; end if;
  select * into c from public.profile_changes where id = p_change for update;
  if not found then raise exception 'unknown_change'; end if;
  select role into v_role from public.location_members where location_id = c.location_id and user_id = p_user;
  if v_role is null then raise exception 'not_member'; end if;
  if c.status not in ('detected', 'awaiting_review') then raise exception 'already_decided'; end if;
  -- K-19, K-64, A4: name, address, main category, open status and map pin: the owner, signed in.
  if private.protection_high_risk(c.field) then
    if p_channel <> 'dashboard' and not private.signed_in_as(p_user) then raise exception 'sign_in_required'; end if;
    if v_role <> 'owner' then raise exception 'owner_only'; end if;
  end if;
  select * into l from public.locations where id = c.location_id;

  select * into f from public.knowledge_facts
   where location_id = c.location_id and slot = 'profile.' || c.field and superseded_by is null for update;

  if p_decision = 'accept' then
    -- Google's value becomes the owner-approved fact (K-18: the owner's own data from now on).
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

  -- "Keep my information": only a value the owner confirmed is ever put back (K-18).
  if f.id is null or f.status <> 'verified' or f.value is null then raise exception 'not_confirmed'; end if;
  if l.status <> 'active' or l.google_location_id is null then raise exception 'location_not_active'; end if;

  -- K-116.2: one high-risk field per approval (each approval is one field), and 7 days between them.
  if private.protection_high_risk(c.field) then
    select max(p.approved_at) into v_last from public.publications p
     where p.location_id = c.location_id and p.target_type = 'listing_revert' and p.state <> 'cancelled'
       and private.protection_high_risk(private.profile_key(p.payload ->> 'field'))
       and p.approved_at > now() - interval '7 days';
    if v_last is not null then
      raise exception 'high_risk_wait %', to_char((v_last + interval '7 days') at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI"Z"');
    end if;
  end if;

  -- K-19: never re-sent more than twice in 30 days. The third conflict goes to Google support, by a person.
  select count(*) into v_n from public.publications p
   where p.location_id = c.location_id and p.target_type = 'listing_revert' and p.state <> 'cancelled'
     and private.profile_key(p.payload ->> 'field') = c.field and p.approved_at > now() - interval '30 days';
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
end $$;

create or replace function public.approve_publication(p_target_type text, p_target_id uuid, p_payload jsonb, p_approved_by uuid,
  p_channel text, p_undo_seconds integer default 10) returns jsonb
language plpgsql security definer set search_path = '' as $$
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
    v_cat := coalesce(nullif(p_payload ->> 'category', ''), ph.category, 'ADDITIONAL');
    if v_cat not in ('EXTERIOR', 'INTERIOR', 'PRODUCT', 'TEAMS', 'FOOD_AND_DRINK', 'ADDITIONAL') then
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

  if not exists (select 1 from public.location_members where location_id = v_loc and user_id = p_approved_by) then
    raise exception 'approver_not_member';
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
end $$;

-- 7. Who can run what -----------------------------------------------------------------------------------------------------

revoke all on function public.action_link_view(text, uuid), public.use_action_link(text, text, text, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.action_link_view(text, uuid), public.use_action_link(text, text, text, uuid, uuid) to service_role;
revoke execute on function private.action_token_cap(), private.action_link_verb(text),
  private.action_link_needs_sign_in(text, text, text), private.signed_in_as(uuid) from public, anon, authenticated;
