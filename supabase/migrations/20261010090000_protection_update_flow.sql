-- P0.2-04: Google Protection on Google's update flow (K-19, K-20, K-64, K-77, K-116.2, K-117, A3, A4, guardrail 7).
--
-- Google Protection now compares what Google shows with Business Knowledge (knowledge_facts, P0.2-03) and records what
-- it finds in profile_changes. listing_baselines and listing_changes are retired: no code reads or writes them after
-- this task (the tables stay, unread, until a later contract step that asks Hussein first). Nothing is ever put back
-- without the owner's decision.
--
-- 1. profile_changes keeps the explanation shown to the owner ("Google shows Sunday closing at 18:00. You approved
--    22:00."), Kabsi's recommendation (K-77: "Google is right" when the old name broke Google's naming rules) and when a
--    third conflict went to Google support. knowledge_facts accepts the map pin (K-117). staff_followups gains the kind
--    google_support. Every change and every decision is written to the audit log (ids, field and states, never values).
-- 2. public.record_protection_check(location, reads): the detector job hands over what Google shows for each watched
--    field (name, phone, website, address, regular hours, main category, open status, map pin) and which fields Google
--    marked as its own update (getGoogleUpdated diffMask). A difference from the current fact becomes one change
--    awaiting the owner; a newer one supersedes the open one (A5); the same value is raised once. A field with no fact
--    yet (or whose Google value was cleared after 30 days, K-40) is only noted, as not yet confirmed. A field the owner
--    never confirmed is still watched: its change says "Not yet confirmed by you" and is never offered for restore.
-- 3. public.decide_profile_change(change, decision, user, channel): "Google is right" (accept) makes Google's value the
--    owner-approved fact; "Keep my information" (reject) re-sends the approved value through the one publication
--    pipeline. Guards: name, address, main category, open status and map pin need the owner, signed in (never from an
--    email link); at most one of those per approval and 7 days between them (K-116.2); a field is never re-sent more
--    than twice in 30 days, and the third conflict becomes a staff task to contact Google support.
-- 4. The pipeline's listing_revert kind now points at profile_changes: approve, undo, record and disconnect move the
--    change (rejected on its way, corrected, failed). The value sent is the owner's approved fact, read from the
--    database, never from the screen. A listing_changes id still resolves to its mirrored change while old code runs.
-- 5. private.profile_daily: changes expire after 14 days without an answer, all of them now; the retired tables follow
--    K-40 too: Google's values in listing_changes and in the listing_baselines Kabsi captured itself (updated_by
--    system) are blanked 30 days after they were read. For the two live system rows (Yawmiyati and QA Bakery, read
--    25 Sep) that is the run of 25 Oct. Rows are kept; only the values are blanked.
-- 6. profile_score reads the profile facts instead of listing_baselines, and its last item is named Google Protection.
--    ops_digest counts profile_changes. staff_mock_listing_edit can simulate open status and map pin changes, and the
--    mock gets mock_listing_send, which records a value Kabsi sent as the business's own (it clears Google's diff).
-- 7. Demo businesses (R-17, fictional): their staged profile values become the fictional owner's approved facts, so
--    recordings show both decisions.
--
-- Expand only: columns, constraints widened, functions added or replaced, one trigger. Nothing is dropped and no row is
-- removed.

-- 1. Columns and constraints ------------------------------------------------------------------------------------------

alter table public.profile_changes
  add column explanation text check (length(explanation) <= 500),
  add column recommend text check (recommend in ('accept', 'reject')),
  add column recommend_reason text check (length(recommend_reason) <= 500),
  add column support_requested_at timestamptz;

alter table public.knowledge_facts drop constraint knowledge_facts_key_check;
alter table public.knowledge_facts add constraint knowledge_facts_key_check check (key in (
  'description', 'service', 'product', 'price_note', 'staff_member', 'policy', 'booking', 'payment_method',
  'delivery', 'service_area', 'parking', 'accessibility', 'wifi', 'language', 'contact', 'hours_note',
  'special_rule', 'phrase_use', 'phrase_avoid', 'voice', 'signature', 'escalation_rule', 'faq',
  'name', 'phone', 'website', 'address', 'regular_hours', 'main_category', 'open_status', 'map_pin'));
alter table public.knowledge_facts drop constraint profile_slots_hold_profile_keys;
alter table public.knowledge_facts add constraint profile_slots_hold_profile_keys check (
  (slot like 'profile.%') = (key in ('name', 'phone', 'website', 'address', 'regular_hours', 'main_category', 'open_status', 'map_pin'))
  or (slot = 'profile.service_area' and key = 'service_area'));

alter table public.staff_followups drop constraint staff_followups_kind_check;
alter table public.staff_followups add constraint staff_followups_kind_check
  check (kind in ('google_access_removal', 'google_support'));

-- 2. Helpers ------------------------------------------------------------------------------------------------------------

-- The fields Google Protection watches (K-19 with open status, K-117 map pin), as K-18 keys.
create function private.protection_fields() returns text[]
language sql immutable set search_path = '' as $$
  select array['name', 'phone', 'website', 'address', 'regular_hours', 'main_category', 'open_status', 'map_pin']
$$;

-- K-19, K-64, K-116.2, K-117: the fields a wrong change to can send a profile back to verification.
create function private.protection_high_risk(p_field text) returns boolean
language sql immutable set search_path = '' as $$
  select p_field in ('name', 'address', 'main_category', 'open_status', 'map_pin')
$$;

create function private.protection_label(p_field text) returns text
language sql immutable set search_path = '' as $$
  select case p_field when 'name' then 'business name' when 'phone' then 'phone number' when 'website' then 'website'
    when 'address' then 'address' when 'regular_hours' then 'opening hours' when 'main_category' then 'main category'
    when 'open_status' then 'open status' when 'map_pin' then 'map pin' else replace(p_field, '_', ' ') end
$$;

-- The audit log (K-19 step 6): every change and every decision, with the field and the states only. Google's values
-- stay in profile_changes, where K-40 clears them.
create function private.audit_profile_change() returns trigger
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
    null, new.status);
  return null;
end $$;
create trigger profile_changes_audit after insert or update of status on public.profile_changes
  for each row execute function private.audit_profile_change();

-- 3. The detector's record ----------------------------------------------------------------------------------------------

-- p_reads: [{"field": "<K-18 key>", "value": {"display": "<what Google shows>", "raw": <Google's shape>},
--   "google_updated": <true when getGoogleUpdated named the field>, "previous": "<the display the detector compared
--   against, null when it had none>", "explanation": "...", "recommend": null | "accept" | "reject", "reason": "..."}].
-- Returns {"changes": [{"id", "field"}], "noted": <values noted as not yet confirmed>}. Service role only.
create function public.record_protection_check(p_location uuid, p_reads jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare r jsonb; v_field text; v_display text; v_value jsonb; f public.knowledge_facts; v_has_fact boolean;
  last public.profile_changes; v_id uuid; v_new uuid; v_changes jsonb := '[]'::jsonb; v_noted integer := 0;
begin
  -- One check of a business at a time.
  perform 1 from public.locations where id = p_location for update;
  if not found then raise exception 'unknown_location'; end if;
  if jsonb_typeof(p_reads) is distinct from 'array' then raise exception 'reads must be an array'; end if;

  for r in select * from jsonb_array_elements(p_reads) loop
    v_field := r ->> 'field';
    if v_field is null or not (v_field = any (private.protection_fields())) then
      raise exception 'unknown field: %', v_field;
    end if;
    v_display := coalesce(btrim(r #>> '{value,display}'), '');
    v_value := jsonb_build_object('display', v_display, 'raw', coalesce(r #> '{value,raw}', 'null'::jsonb));

    -- The owner chose to keep their value and it is on its way: Google may show the old one until it lands, or while
    -- it checks the edit. The publication pipeline reads it; no new change.
    if exists (select 1 from public.profile_changes c join public.publications p on p.id = c.publication_id
                where c.location_id = p_location and c.field = v_field and c.status = 'rejected'
                  and p.state in ('approved', 'publishing', 'published', 'checking', 'verifying')) then
      continue;
    end if;

    select * into f from public.knowledge_facts
     where location_id = p_location and slot = 'profile.' || v_field and superseded_by is null for update;
    v_has_fact := found;

    -- Nothing to compare with: never seen, or Google's value was cleared after 30 days (K-40). Kabsi notes what Google
    -- shows as not yet confirmed (K-18) and raises nothing.
    if not v_has_fact or f.value is null or f.status in ('outdated', 'rejected') then
      if v_display <> '' then
        v_new := gen_random_uuid();
        if v_has_fact then update public.knowledge_facts set superseded_by = v_new where id = f.id; end if;
        insert into public.knowledge_facts (id, location_id, slot, key, value, status, source, source_ref, uses, version)
        values (v_new, p_location, 'profile.' || v_field, v_field, v_value, 'needs_confirmation', 'google',
          'protection_check', array['profile'], coalesce(f.version, 0) + 1);
        v_noted := v_noted + 1;
      end if;
      continue;
    end if;

    if f.value ->> 'display' is not distinct from v_display then continue; end if;
    -- The explanation was written against this value; if the fact moved meanwhile, the next check does it again.
    if (r ->> 'previous') is distinct from (f.value ->> 'display') then continue; end if;

    -- Raised once per value: still waiting, expired without an answer (raised again by the weekly report, K-20), or
    -- answered with "Keep my information" and with Google support now.
    select * into last from public.profile_changes
     where location_id = p_location and field = v_field and status <> 'superseded'
     order by detected_at desc, (google_value is not null) desc, created_at desc limit 1;
    if found and last.status in ('detected', 'awaiting_review', 'expired', 'rejected')
       and last.google_value ->> 'display' is not distinct from v_display then
      continue;
    end if;

    -- A5: the newer change replaces the open one, as superseded.
    v_id := gen_random_uuid();
    update public.profile_changes set status = 'superseded', superseded_by = v_id
     where location_id = p_location and field = v_field and status in ('detected', 'awaiting_review');
    insert into public.profile_changes (id, location_id, field, previous_value, previous_fact_id, google_value, source,
      severity, status, explanation, recommend, recommend_reason)
    values (v_id, p_location, v_field, f.value, case when f.status = 'verified' then f.id end, v_value,
      case when coalesce((r ->> 'google_updated')::boolean, false) then 'google_update' else 'scheduled_check' end,
      private.change_severity(v_field), 'awaiting_review', left(nullif(btrim(r ->> 'explanation'), ''), 500),
      case when r ->> 'recommend' in ('accept', 'reject') then r ->> 'recommend' end,
      left(nullif(btrim(r ->> 'reason'), ''), 500));

    -- A value the owner never confirmed: Kabsi keeps watching from what Google shows now (K-18).
    if f.status <> 'verified' then
      v_new := gen_random_uuid();
      update public.knowledge_facts set superseded_by = v_new where id = f.id;
      insert into public.knowledge_facts (id, location_id, slot, key, value, status, source, source_ref, uses, version)
      values (v_new, p_location, 'profile.' || v_field, v_field, v_value, 'needs_confirmation', 'google',
        'protection_check', array['profile'], f.version + 1);
    end if;
    v_changes := v_changes || jsonb_build_object('id', v_id, 'field', v_field);
  end loop;

  update public.locations set shield_checked_at = now() where id = p_location;
  return jsonb_build_object('changes', v_changes, 'noted', v_noted);
end $$;

-- 4. The owner's decision ---------------------------------------------------------------------------------------------

-- p_decision: 'accept' ("Google is right") or 'reject' ("Keep my information"). p_channel: 'dashboard' (signed in) or
-- 'email_link'. Service role only: the Edge Functions call it for the user they checked. Returns {"state": ...}:
-- accepted, rejected (with the publication), or support (third conflict in 30 days, nothing sent).
create function public.decide_profile_change(p_change uuid, p_decision text, p_user uuid, p_channel text) returns jsonb
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
    if p_channel <> 'dashboard' then raise exception 'sign_in_required'; end if;
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

-- 5. The publication pipeline on profile_changes ----------------------------------------------------------------------

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
    -- K-19, A4: the high-risk fields never go from an email link.
    if private.protection_high_risk(pc.field) and p_channel <> 'dashboard' then raise exception 'sign_in_required'; end if;
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

create or replace function public.undo_publication(p_publication uuid, p_user uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare p public.publications;
begin
  select * into p from public.publications where id = p_publication for update;
  if not found then raise exception 'unknown_publication'; end if;
  if not exists (select 1 from public.location_members where location_id = p.location_id and user_id = p_user) then
    raise exception 'not_member';
  end if;
  if p.state = 'cancelled' then return jsonb_build_object('state', 'cancelled'); end if;
  if p.state <> 'approved' or now() >= p.publish_after then raise exception 'too_late'; end if;
  update public.publications set state = 'cancelled', error = 'undone' where id = p.id;
  case p.target_type
  when 'review_reply' then update public.reviews set state = 'drafted' where id = p.target_id and state = 'publishing';
  when 'local_post' then update public.gbp_posts set state = 'draft' where id = p.target_id and state = 'publishing';
  when 'photo' then update public.photos set state = 'draft' where id = p.target_id and state = 'publishing';
  when 'special_hours' then update public.special_hours set state = 'draft' where id = p.target_id and state = 'publishing';
  when 'listing_revert' then
    update public.profile_changes set status = 'awaiting_review', decided_at = null, decided_by = null, publication_id = null
     where id = p.target_id and status = 'rejected';
  else null;
  end case;
  return jsonb_build_object('state', 'cancelled');
end $$;

create or replace function public.record_publication(p_publication uuid, p_state text, p_reason text default null,
  p_error text default null, p_google_ref text default null, p_moderation text default null,
  p_response jsonb default null, p_internal boolean default false) returns text
language plpgsql security definer set search_path = '' as $$
declare p public.publications; v_state text := p_state; v_reason text := p_reason; v_text text;
begin
  select * into p from public.publications where id = p_publication for update;
  if not found then raise exception 'unknown_publication'; end if;

  if not (
       (p.state = 'publishing' and v_state in ('approved', 'published', 'checking', 'rejected'))
    or (p.state = 'published' and v_state in ('verified', 'checking', 'rejected'))
    or (p.state = 'verifying' and v_state in ('verified', 'checking', 'failed', 'rejected'))
    or (p.state = 'approved' and v_state = 'failed' and p_internal)
  ) then
    raise exception 'bad_transition % to %', p.state, v_state;
  end if;

  -- K-116.1: something Google still does not show 7 days after approval is treated as not there.
  if v_state = 'checking' and p.approved_at < now() - interval '7 days' then
    v_state := 'failed';
    v_reason := case when p.target_type = 'review_reply'
      then 'Google has not shown this reply after 7 days. Edit it and approve again, or reply on Google.'
      else 'Google has not shown this ' || private.publication_noun(p.target_type) || ' after 7 days. Kabsi did not send it again.' end;
  end if;

  update public.publications set
    state = v_state,
    attempts = case when v_state = 'approved' then greatest(attempts - 1, 0) else attempts end,
    claimed_at = case when v_state = 'approved' then null else claimed_at end,
    error = case when v_state in ('rejected', 'failed', 'checking') then left(coalesce(p_error, v_reason, error), 500)
                 when v_state = 'verified' then null else error end,
    google_ref = coalesce(p_google_ref, google_ref),
    google_response = coalesce(p_response, google_response),
    moderation_state = case when v_state = 'checking' then coalesce(p_moderation, moderation_state, 'unknown')
                            when v_state = 'verified' then null else moderation_state end,
    last_checked_at = case when v_state in ('verified', 'checking', 'failed', 'rejected') and p.state = 'verifying' then now()
                           else last_checked_at end,
    checks = case when v_state = 'checking' and p.state = 'verifying' then checks + 1 else checks end,
    next_check_at = case when v_state = 'checking'
                         then now() + private.publication_check_delay(case when p.state = 'verifying' then checks + 1 else 0 end)
                         else null end
  where id = p.id;

  case p.target_type
  when 'review_reply' then
    v_text := p.payload ->> 'text';
    if v_state = 'published' then
      update public.reviews set state = 'posted', existing_reply = v_text, reply_state = 'in_review', reply_state_reason = null
       where id = p.target_id and state = 'publishing';
    elsif v_state = 'verified' then
      update public.reviews set state = 'posted', existing_reply = v_text, reply_state = 'live', reply_state_reason = null
       where id = p.target_id and state in ('publishing', 'posted');
    elsif v_state = 'checking' then
      update public.reviews set state = 'posted', existing_reply = coalesce(existing_reply, v_text),
        reply_state = 'in_review', reply_state_reason = 'Google is checking your reply'
       where id = p.target_id and state in ('publishing', 'posted');
    elsif v_state in ('rejected', 'failed') then
      -- Back to the owner with the reason, to edit and approve again.
      update public.reviews set state = 'drafted', reply_state = 'rejected', reply_state_reason = left(v_reason, 300),
        existing_reply = case when existing_reply = v_text then null else existing_reply end
       where id = p.target_id and state in ('publishing', 'posted');
    end if;
  -- The other kinds stay "on their way" (publishing, rejected for a Protection change) until Google shows them or
  -- refuses them; the reason is on the publication.
  when 'local_post' then
    if v_state = 'verified' then
      update public.gbp_posts set state = 'posted' where id = p.target_id and state in ('publishing', 'failed');
    elsif v_state in ('rejected', 'failed') then
      update public.gbp_posts set state = 'failed' where id = p.target_id and state = 'publishing';
    end if;
  when 'photo' then
    if v_state = 'verified' then
      update public.photos set state = 'posted' where id = p.target_id and state in ('publishing', 'failed');
    elsif v_state in ('rejected', 'failed') then
      update public.photos set state = 'failed' where id = p.target_id and state = 'publishing';
    end if;
  when 'special_hours' then
    if v_state = 'verified' then
      update public.special_hours set state = 'posted' where id = p.target_id and state in ('publishing', 'failed');
    elsif v_state in ('rejected', 'failed') then
      update public.special_hours set state = 'failed' where id = p.target_id and state = 'publishing';
    end if;
  when 'listing_revert' then
    -- Verified: Google shows the approved value again and no longer marks the field as its own update.
    if v_state = 'verified' then
      update public.profile_changes set status = 'corrected' where id = p.target_id and status in ('rejected', 'failed');
    elsif v_state in ('rejected', 'failed') then
      update public.profile_changes set status = 'failed' where id = p.target_id and status = 'rejected';
    end if;
  else null;
  end case;
  return v_state;
end $$;

create or replace function public.request_disconnect(p_location uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); l public.locations; v_pubs integer; v_reviews integer; v_tasks integer;
  v_tokens integer; v_jobs integer; v_state text;
begin
  if v_uid is null then raise exception 'sign_in_required' using errcode = '42501'; end if;
  if not public.has_location_role(p_location, array['owner']) then raise exception 'forbidden' using errcode = '42501'; end if;

  select * into l from public.locations where id = p_location for update;
  if not found then raise exception 'forbidden' using errcode = '42501'; end if;
  if l.is_demo then raise exception 'demo_location'; end if;
  if l.disconnect_requested_at is not null then
    select access_state into v_state from public.google_connections where location_id = p_location;
    return jsonb_build_object('state', v_state, 'requested_at', l.disconnect_requested_at, 'created', false);
  end if;

  update public.locations set disconnect_requested_at = now(), disconnect_requested_by = v_uid,
    status = case when status = 'disabled' then status else 'paused' end
   where id = p_location;

  -- Approvals still inside their undo window: cancelled, and their item goes back to where it was (as undo does).
  with c as (
    update public.publications set state = 'cancelled', error = 'disconnected'
     where location_id = p_location and state = 'approved'
    returning target_type, target_id
  ), r as (
    update public.reviews set state = 'drafted' where id in (select target_id from c where target_type = 'review_reply') and state = 'publishing'
  ), p as (
    update public.gbp_posts set state = 'draft' where id in (select target_id from c where target_type = 'local_post') and state = 'publishing'
  ), ph as (
    update public.photos set state = 'draft' where id in (select target_id from c where target_type = 'photo') and state = 'publishing'
  ), h as (
    update public.special_hours set state = 'draft' where id in (select target_id from c where target_type = 'special_hours') and state = 'publishing'
  ), pc as (
    update public.profile_changes set status = 'awaiting_review', decided_at = null, decided_by = null, publication_id = null
     where id in (select target_id from c where target_type = 'listing_revert') and status = 'rejected'
  )
  select count(*) into v_pubs from c;

  -- Open review tasks: archived (Kabsi does not act on them). The reviews and their drafts stay until K-40 removes them.
  update public.reviews set state = 'archived' where location_id = p_location and state in ('new', 'drafted', 'blocked');
  get diagnostics v_reviews = row_count;
  update public.concierge_tasks set state = 'cancelled', outcome = coalesce(outcome, 'disconnected'), updated_at = now()
   where location_id = p_location and state = 'open';
  get diagnostics v_tasks = row_count;
  -- Email links that would open or approve something: they stop working now.
  update public.action_tokens set expires_at = now()
   where location_id = p_location and used_at is null and expires_at > now();
  get diagnostics v_tokens = row_count;
  update public.jobs set state = 'failed', last_error = 'stopped: the owner disconnected Kabsi from Google',
    finished_at = now(), locked_at = null, locked_by = null
   where location_id = p_location and state in ('pending', 'retrying');
  get diagnostics v_jobs = row_count;

  perform private.audit('user', v_uid, 'disconnect_requested', p_location, 'location', p_location::text,
    jsonb_build_object('status', l.status),
    jsonb_build_object('status', 'paused', 'approvals_cancelled', v_pubs, 'reviews_archived', v_reviews,
      'concierge_tasks_cancelled', v_tasks, 'links_expired', v_tokens, 'jobs_stopped', v_jobs),
    'dashboard', 'requested');
  perform public.ops_emit('disconnect_requested', 'customers', ':electric_plug: Disconnect requested: ' || l.name,
    'The owner disconnected Kabsi in Settings. Kabsi removes its Manager access now; if Google refuses, a staff follow-up opens.',
    '[]', public.ops_staff_btn(), 'loc_disconnect:' || l.id);
  perform public.enqueue_job('disconnect', p_location, 'disconnect:' || p_location);
  return jsonb_build_object('state', 'removing', 'requested_at', now(), 'created', true);
end $$;

-- 6. Daily: expiry (K-20) and Google's values (K-40), the retired tables included ---------------------------------------

create or replace function private.profile_daily() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_profile int := private.retention_days('google_profile_values');
  v_lost int := private.retention_days('google_data_after_access_lost');
  v_expired int; v_facts int; v_changes int; v_lost_facts int; v_lost_changes int; v_old_changes int;
  v_old_baselines int; v_result jsonb;
begin
  -- K-20: no answer in 14 days. Demo businesses keep their staged changes for recordings.
  update public.profile_changes c set status = 'expired'
   where c.status in ('detected', 'awaiting_review') and c.detected_at < now() - interval '14 days'
     and not exists (select 1 from public.locations l where l.id = c.location_id and l.is_demo);
  get diagnostics v_expired = row_count;

  -- K-40 google_profile_values: Google's values Kabsi read, 30 days. The owner's confirmed values stay.
  update public.knowledge_facts set value = null, status = case when status = 'needs_confirmation' then 'outdated' else status end
   where source = 'google' and status <> 'verified' and value is not null
     and created_at < now() - make_interval(days => v_profile);
  get diagnostics v_facts = row_count;
  update public.profile_changes set google_value = null,
      previous_value = case when previous_fact_id is null then null else previous_value end, values_cleared_at = now()
   where values_cleared_at is null and status not in ('detected', 'awaiting_review')
     and detected_at < now() - make_interval(days => v_profile);
  get diagnostics v_changes = row_count;

  -- The retired tables (P0.2-04): nothing reads them, so Google's values there are blanked 30 days after they were read,
  -- whatever the change's state. Baselines the owner kept (updated_by owner) are the owner's own values and stay.
  update public.listing_changes set old_value = null, new_value = null
   where (old_value is not null or new_value is not null) and created_at < now() - make_interval(days => v_profile);
  get diagnostics v_old_changes = row_count;
  update public.listing_baselines set fields = '{}'::jsonb
   where updated_by = 'system' and fields <> '{}'::jsonb and updated_at < now() - make_interval(days => v_profile);
  get diagnostics v_old_baselines = row_count;

  -- K-40: Google data 30 days after access is lost (the same businesses run_retention clears).
  update public.knowledge_facts f set value = null, status = case when status = 'needs_confirmation' then 'outdated' else status end
   where f.source = 'google' and f.status <> 'verified' and f.value is not null
     and f.location_id in (select id from public.locations
                            where access_lost_at < now() - make_interval(days => v_lost) and access_granted_at is null);
  get diagnostics v_lost_facts = row_count;
  update public.profile_changes c set google_value = null,
      previous_value = case when previous_fact_id is null then null else previous_value end, values_cleared_at = now()
   where c.values_cleared_at is null
     and c.location_id in (select id from public.locations
                            where access_lost_at < now() - make_interval(days => v_lost) and access_granted_at is null);
  get diagnostics v_lost_changes = row_count;

  v_result := jsonb_build_object('expired', v_expired, 'google_facts', v_facts + v_lost_facts,
    'change_values', v_changes + v_lost_changes, 'retired_values', v_old_changes + v_old_baselines);
  insert into public.jobs_log (job, ok, detail)
  select 'profile_daily', true, v_result where exists (select 1 from jsonb_each_text(v_result) where value::int > 0);
  return v_result;
end $$;

-- 7. Readers that used the retired tables ---------------------------------------------------------------------------------

create or replace function public.profile_score(p_location uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  l public.locations; v_items jsonb := '[]'::jsonb; v_earned numeric := 0; v_max numeric := 0;
  n90 int; a90 int; waiting int; last_post timestamptz; photos int; core int; taps30 int; cards int; base jsonb; basic int;
  it_e numeric; v_missing text;
begin
  if not (public.is_member(p_location) or public.is_staff()) then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into l from public.locations where id = p_location;
  if not found then return null; end if;

  select count(*), count(*) filter (where state in ('posted','handled_offline') or existing_reply is not null)
    into n90, a90 from public.reviews where location_id = l.id and review_created_at >= now() - interval '90 days';
  select count(*) into waiting from public.reviews where location_id = l.id and state in ('drafted','blocked');
  it_e := case when n90 = 0 then 25 else round(25 * a90::numeric / n90, 1) end;
  v_items := v_items || jsonb_build_object('key','replies','label','Reviews answered','max',25,'earned',it_e,
    'note', case when n90 = 0 then 'No reviews in the last 90 days' else a90 || ' of ' || n90 || ' answered in the last 90 days' end,
    'waiting', waiting, 'path', '/app/inbox');
  v_earned := v_earned + it_e; v_max := v_max + 25;

  select count(*) into core from unnest(array['about','services','hours_note','contact_phone','signature','mention']) k
    where nullif(trim(coalesce(l.knowledge_card ->> k, '')), '') is not null;
  it_e := round(15 * core / 6.0, 1);
  v_items := v_items || jsonb_build_object('key','facts','label','About your business','max',15,'earned',it_e,
    'note', core || ' of 6 key facts given', 'missing', 6 - core, 'path', '/app/knowledge');
  v_earned := v_earned + it_e; v_max := v_max + 15;

  select count(*) into taps30 from public.taps where location_id = l.id and not is_bot and created_at >= now() - interval '30 days';
  select count(*) into cards from public.cards where location_id = l.id and status = 'active';
  it_e := case when taps30 > 0 then 10 when cards > 0 then 5 else 0 end;
  v_items := v_items || jsonb_build_object('key','review_link','label','Review link shared','max',10,'earned',it_e,
    'note', case when taps30 > 0 then taps30 || ' opens in the last 30 days' when cards > 0 then 'Set up, not opened yet' else 'Not set up yet' end,
    'path', '/app/cards');
  v_earned := v_earned + it_e; v_max := v_max + 10;

  if not l.concierge then
    select max(updated_at) into last_post from public.gbp_posts where location_id = l.id and state = 'posted';
    it_e := case when last_post >= now() - interval '7 days' then 15 when last_post >= now() - interval '14 days' then 8 else 0 end;
    v_items := v_items || jsonb_build_object('key','posts','label','Weekly post','max',15,'earned',it_e,
      'note', case when last_post is null then 'No post yet' else 'Last post ' || (current_date - last_post::date) || ' days ago' end,
      'path', '/app/posts');
    v_earned := v_earned + it_e; v_max := v_max + 15;

    select count(*) into photos from public.photos where location_id = l.id and state in ('draft','posted') and suitable is not false;
    it_e := round(15 * least(photos, 10) / 10.0, 1);
    v_items := v_items || jsonb_build_object('key','photos','label','Photos','max',15,'earned',it_e,
      'note', photos || ' added through Kabsi', 'have', photos, 'path', '/app/photos');
    v_earned := v_earned + it_e; v_max := v_max + 15;

    -- P0.2-04: the profile details Google Protection knows (knowledge_facts), not the retired listing_baselines.
    select jsonb_object_agg(f.key, f.value ->> 'display') into base from public.knowledge_facts f
     where f.location_id = l.id and f.slot like 'profile.%' and f.superseded_by is null;
    if base is not null then
      basic := 0; v_missing := '';
      if nullif(trim(coalesce(base ->> 'phone', '')), '') is not null then basic := basic + 1; else v_missing := v_missing || 'phone, '; end if;
      if nullif(trim(coalesce(base ->> 'website', '')), '') is not null then basic := basic + 1; else v_missing := v_missing || 'website, '; end if;
      if nullif(trim(coalesce(base ->> 'main_category', '')), '') is not null then basic := basic + 1; else v_missing := v_missing || 'categories, '; end if;
      if nullif(trim(coalesce(base ->> 'regular_hours', '')), '') is not null then basic := basic + 1; else v_missing := v_missing || 'opening hours, '; end if;
      it_e := round(10 * basic / 4.0, 1);
      v_missing := case when basic = 4 then '' else left(v_missing, length(v_missing) - 2) end;
      v_items := v_items || jsonb_build_object('key','basics','label','Profile basics','max',10,'earned',it_e,
        'note', case when basic = 4 then 'Phone, website, category and hours are set' else 'Missing: ' || v_missing end,
        'missing', v_missing, 'path', '/app/shield');
      v_earned := v_earned + it_e; v_max := v_max + 10;
    end if;

    it_e := case when l.shield_checked_at >= now() - interval '2 days' then 5 else 0 end;
    v_items := v_items || jsonb_build_object('key','shield','label','Google Protection','max',5,'earned',it_e,
      'note', case when it_e = 5 then 'Watching your listing' else 'Not checked in the last 2 days' end, 'path', '/app/shield');
    v_earned := v_earned + it_e; v_max := v_max + 5;
  end if;

  return jsonb_build_object('score', case when v_max = 0 then 0 else round(100 * v_earned / v_max)::int end, 'items', v_items);
end $$;

create or replace function public.ops_digest(p_hours integer default 24) returns jsonb
language sql stable security definer set search_path = '' as $$
  with w as (select now() - make_interval(hours => p_hours) as since),
  d as (select id from public.locations where is_demo)
  select jsonb_build_object(
    'hours', p_hours,
    'signups', (select count(*) from auth.users, w where created_at > since and email not like '%@test.local'
                  and lower(email) is distinct from public.demo_login_email()),
    'businesses_new', (select count(*) from public.locations, w where created_at > since and not is_demo),
    'businesses_live', (select count(*) from public.locations, w where activated_at > since and not is_demo),
    'businesses_active_total', (select count(*) from public.locations where status = 'active' and not is_demo),
    'waiting_for_access', (select count(*) from public.locations where status = 'access_pending' and not is_demo),
    'reviews_new', (select count(*) from public.reviews, w where created_at > since and location_id not in (select id from d)),
    'replies_posted', (select count(*) from public.publications, w where target_type = 'review_reply' and state in ('verified','verifying','checking') and created_at > since and (location_id is null or location_id not in (select id from d))),
    'drafts_waiting', (select count(*) from public.reviews where state in ('drafted','blocked') and location_id not in (select id from d)),
    'urgent_waiting', (select count(*) from public.reviews where state in ('drafted','blocked') and urgency = 'urgent' and location_id not in (select id from d)),
    'posts_published', (select count(*) from public.publications, w where target_type = 'local_post' and state in ('verified','verifying','checking') and created_at > since and (location_id is null or location_id not in (select id from d))),
    'shield_changes', (select count(*) from public.profile_changes, w where detected_at > since and location_id not in (select id from d)),
    'taps', (select count(*) from public.taps, w where created_at > since and not is_bot and (location_id is null or location_id not in (select id from d))),
    'chats', (select count(*) from public.chat_conversations, w where created_at > since and message_count > 0 and (location_id is null or location_id not in (select id from d))),
    'chats_hot', (select count(*) from public.chat_conversations, w where created_at > since and lead_temperature = 'hot' and (location_id is null or location_id not in (select id from d))),
    'handoffs', (select count(*) from public.chat_conversations, w where updated_at > since and status = 'handoff' and (location_id is null or location_id not in (select id from d))),
    'contacts', (select count(*) from public.contacts, w where created_at > since),
    'leads', (select count(*) from public.leads, w where created_at > since),
    'payments_usd', (select coalesce(sum(amount_usd), 0) from public.payments, w where created_at > since),
    'claims_pending', (select count(*) from public.usdt_claims where status = 'pending'),
    'plans_ending_14d', (select count(*) from public.plans where status = 'active' and kind <> 'partner' and ends_at between now() and now() + interval '14 days'),
    'partners_active', (select count(*) from public.partners where status = 'active'),
    'invites', (select count(*) from public.partner_invites, w where created_at > since),
    'emails_sent', (select count(*) from public.emails, w where created_at > since and status in ('sent','delivered') and (location_id is null or location_id not in (select id from d))),
    'emails_failed', (select count(*) from public.emails, w where created_at > since and status in ('failed','bounced') and coalesce(error,'') not like 'test address%'),
    'jobs_failed', (select count(*) from public.jobs_log, w where created_at > since and not ok),
    'publications_failed', (select count(*) from public.publications, w where updated_at > since and state = 'failed' and (location_id is null or location_id not in (select id from d))),
    'google_mode', (select value from public.app_settings where key = 'google_mode'),
    'slack_queue', (select count(*) from public.ops_events where sent_at is null)
  )
$$;

-- 8. The mock (mock mode and demo businesses only, R-17) ---------------------------------------------------------------

-- Staff simulate a Google edit, now also of open status and map pin. It changes what Google shows, not the business's
-- own values, so the mock's getGoogleUpdated names the field.
create or replace function public.staff_mock_listing_edit(p_location uuid, p_field text, p_value text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_gl text;
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_field not in ('title', 'phone', 'address', 'hours', 'website', 'categories', 'open_status', 'map_pin') then
    raise exception 'bad_field';
  end if;
  if p_field = 'open_status' and p_value not in ('OPEN', 'CLOSED_TEMPORARILY', 'CLOSED_PERMANENTLY') then
    raise exception 'open_status: OPEN, CLOSED_TEMPORARILY or CLOSED_PERMANENTLY';
  end if;
  select google_location_id into v_gl from public.locations where id = p_location;
  if v_gl is null or v_gl not like 'locations/mock-%' then raise exception 'not_a_mock_location'; end if;
  update public.mock_listings set fields = jsonb_set(fields, array[p_field], to_jsonb(left(p_value, 200))), updated_at = now()
  where google_location_id = v_gl;
  if not found then raise exception 'no_listing_yet'; end if;
end $$;

-- Kabsi sends a value (a put-back): Google shows it and records it as the business's own (fields.merchant), so the
-- field is no longer Google's update. One key under the row lock, like mock_listing_set.
create function public.mock_listing_send(p_location text, p_key text, p_value jsonb) returns jsonb
language sql security definer set search_path = '' as $$
  update public.mock_listings
     set fields = jsonb_set(fields || jsonb_build_object(p_key, p_value), '{merchant}',
                            coalesce(fields -> 'merchant', '{}'::jsonb) || jsonb_build_object(p_key, p_value)),
         updated_at = now()
   where google_location_id = p_location
  returning fields
$$;

-- 9. Demo businesses (R-17): their staged values are the fictional owner's approved facts ---------------------------------

do $$
declare f record; v_new uuid;
begin
  for f in select k.* from public.knowledge_facts k join public.locations l on l.id = k.location_id
            where l.is_demo and k.slot like 'profile.%' and k.superseded_by is null and k.status = 'needs_confirmation'
              and k.value is not null
  loop
    v_new := gen_random_uuid();
    update public.knowledge_facts set superseded_by = v_new where id = f.id;
    insert into public.knowledge_facts (id, location_id, slot, key, value, status, source, source_ref, confirmed_at, uses, version)
    values (v_new, f.location_id, f.slot, f.key, f.value, 'verified', 'owner', 'demo_seed', now(), f.uses, f.version + 1);
  end loop;
end $$;
update public.profile_changes c set previous_fact_id = k.id
  from public.knowledge_facts k, public.locations l
 where l.id = c.location_id and l.is_demo and c.status in ('detected', 'awaiting_review') and c.previous_fact_id is null
   and k.location_id = c.location_id and k.slot = 'profile.' || c.field and k.superseded_by is null and k.status = 'verified'
   and k.value ->> 'display' is not distinct from c.previous_value ->> 'display';

-- 10. Who can run what -----------------------------------------------------------------------------------------------------

revoke all on function public.record_protection_check(uuid, jsonb), public.decide_profile_change(uuid, text, uuid, text),
  public.mock_listing_send(text, text, jsonb) from public, anon, authenticated;
grant execute on function public.record_protection_check(uuid, jsonb), public.decide_profile_change(uuid, text, uuid, text),
  public.mock_listing_send(text, text, jsonb) to service_role;
revoke execute on function private.protection_fields(), private.protection_high_risk(text), private.protection_label(text),
  private.audit_profile_change() from public, anon, authenticated;
