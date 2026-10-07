-- P0.1-13b part A: posts, photos, special hours and Google Protection put-backs on the one publication pipeline
-- (K-38, audit finding A6, R-05, D202, D266, guardrail 6). P0.1-13a built the pipeline for review replies; this
-- migration opens it to the other four Google writes, so the `content` function and the Protection decision no longer
-- claim, call Google or write publications themselves.
--
-- 1. approve_publication(target_type, target_id, payload jsonb, ...) is the one approval for all five kinds. Under a
--    lock on the item it returns the open publication if there is one (a second tap, two tabs, the dashboard and an
--    email link at the same moment), or moves the item to its "on its way" state, writes the publication from the
--    stored item (only the post text and the photo category come from the owner's screen) and offers its publish job
--    after the 10 second undo window. The reply version with p_text stays, as a thin call into it.
-- 2. undo_publication puts any kind back where it was (draft, or an open Protection change).
-- 3. claim_publication hands the publish job everything it needs for any kind; a business that became concierge (no
--    Google work) stops a non-reply item instead.
-- 4. record_publication moves each kind's item with the publication: posts and photos to posted or failed, special
--    hours to posted or failed, a Protection change to reverted or revert_failed. Google refusing an item after it was
--    created (a post Google rejected) is now a recorded move too.
-- 5. special_hours gains the state "publishing" and listing_changes the state "reverting" (approved, on its way), so
--    "keep" cannot race a put-back and the same dates cannot be saved twice while one is on its way.
--
-- Additive: two check constraints widened and one unique index widened (re-created with the new state), functions
-- replaced or added. No column or row is removed. publications.status, its sync trigger and concierge_queue_reply stay
-- until part B's contract step.

-- 1. Item states -------------------------------------------------------------------------------------------------------

do $$
declare c text;
begin
  for c in select conname from pg_constraint
            where conrelid = 'public.special_hours'::regclass and contype = 'c' and pg_get_constraintdef(oid) ~ '\mCHECK \(\(state = ANY'
  loop
    execute format('alter table public.special_hours drop constraint %I', c);
  end loop;
  for c in select conname from pg_constraint
            where conrelid = 'public.listing_changes'::regclass and contype = 'c' and pg_get_constraintdef(oid) ~ '\mCHECK \(\(state = ANY'
  loop
    execute format('alter table public.listing_changes drop constraint %I', c);
  end loop;
end $$;
alter table public.special_hours add constraint special_hours_state_check
  check (state in ('draft', 'publishing', 'posted', 'skipped', 'failed'));
alter table public.listing_changes add constraint listing_changes_state_check
  check (state in ('open', 'reverting', 'reverted', 'kept', 'revert_failed'));

-- The same dates cannot be saved twice while one is on its way either.
create unique index special_hours_dates_open_unique on public.special_hours (location_id, start_date, end_date)
  where state in ('draft', 'publishing', 'posted');
drop index public.special_hours_dates_unique;
alter index public.special_hours_dates_open_unique rename to special_hours_dates_unique;

-- Owner-facing words per kind.
create function private.publication_noun(p_target_type text) returns text
language sql immutable set search_path = '' as $$
  select case p_target_type when 'review_reply' then 'reply' when 'local_post' then 'post' when 'photo' then 'photo'
    when 'special_hours' then 'change to your hours' else 'change' end
$$;

-- 2. Approve (the one approval path, every kind) --------------------------------------------------------------------------

create function public.approve_publication(p_target_type text, p_target_id uuid, p_payload jsonb, p_approved_by uuid,
  p_channel text, p_undo_seconds integer default 10) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare l public.locations; p public.publications; v_loc uuid; v_state text; v_payload jsonb; v_text text;
  v_n integer; r public.reviews; po public.gbp_posts; ph public.photos; sh public.special_hours;
  ch public.listing_changes; v_cat text;
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
    select * into ch from public.listing_changes where id = p_target_id for update;
    if not found then raise exception 'unknown_target'; end if;
    v_loc := ch.location_id; v_state := ch.state;
    -- The value to put back is the one the owner saw as "before", read from the stored change, never from the screen.
    v_payload := jsonb_build_object('field', ch.field, 'value', coalesce(ch.old_value ->> 'display', ''),
      'raw', ch.old_value -> 'raw');
  else
    raise exception 'unsupported_target';
  end case;

  if not exists (select 1 from public.location_members where location_id = v_loc and user_id = p_approved_by) then
    raise exception 'approver_not_member';
  end if;

  -- K-38: a second tap, a second email click or the other channel gets the existing result.
  select * into p from public.publications
   where target_type = p_target_type and target_id = p_target_id
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
    if v_state <> 'open' then raise exception 'already_decided'; end if;
    update public.listing_changes set state = 'reverting', decided_at = now() where id = p_target_id;
  end case;

  select count(*) into v_n from public.publications where target_type = p_target_type and target_id = p_target_id;
  insert into public.publications (location_id, target_type, target_id, payload, approved_by, channel, state, route,
    idempotency_key, publish_after)
  values (v_loc, p_target_type, p_target_id, v_payload, p_approved_by, p_channel, 'approved',
    case when l.concierge then 'concierge' else 'api' end, p_target_type || ':' || p_target_id || ':' || (v_n + 1),
    now() + make_interval(secs => greatest(coalesce(p_undo_seconds, 10), 0)))
  returning * into p;
  perform public.enqueue_job('publish', p.location_id, 'publish:' || p.id, jsonb_build_object('publication_id', p.id),
    p.publish_after);
  return jsonb_build_object('publication_id', p.id, 'state', p.state, 'route', p.route,
    'publish_after', p.publish_after, 'created', true);
end $$;

-- The reply form from P0.1-13a (api/approve, api/action and the tests call it): the same approval.
create or replace function public.approve_publication(p_target_type text, p_target_id uuid, p_text text, p_approved_by uuid,
  p_channel text, p_undo_seconds integer default 10) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if p_target_type is distinct from 'review_reply' then raise exception 'unsupported_target'; end if;
  return public.approve_publication(p_target_type, p_target_id, jsonb_build_object('text', p_text), p_approved_by,
    p_channel, p_undo_seconds);
end $$;

-- 3. Undo (K-70): any kind goes back where it was ----------------------------------------------------------------------

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
    update public.listing_changes set state = 'open', decided_at = null where id = p.target_id and state = 'reverting';
  else null;
  end case;
  return jsonb_build_object('state', 'cancelled');
end $$;

-- 4. Claim (the one claim, every kind) ----------------------------------------------------------------------------------

-- Returns {result: claimed | concierge | not_due | not_approved | stopped | missing}. Only "claimed" may call Google.
create or replace function public.claim_publication(p_publication uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
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
end $$;

-- 5. Record what Google answered, every kind -----------------------------------------------------------------------------

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
  -- The other kinds stay "on their way" (publishing, reverting) until Google shows them or refuses them; the reason
  -- is on the publication.
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
    if v_state = 'verified' then
      update public.listing_changes set state = 'reverted', decided_at = now()
       where id = p.target_id and state in ('reverting', 'revert_failed');
    elsif v_state in ('rejected', 'failed') then
      update public.listing_changes set state = 'revert_failed', decided_at = now()
       where id = p.target_id and state = 'reverting';
    end if;
  else null;
  end case;
  return v_state;
end $$;

-- 6. The reconcile job's claim: one due check at a time, with what it needs to read Google ---------------------------------

create or replace function public.claim_publication_check(p_publication uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare p public.publications; l public.locations; v_review text;
begin
  select * into p from public.publications where id = p_publication for update;
  if not found or p.state <> 'checking' then return jsonb_build_object('result', 'not_checking'); end if;
  if p.next_check_at > now() then return jsonb_build_object('result', 'not_due', 'next_check_at', p.next_check_at); end if;
  select * into l from public.locations where id = p.location_id;
  if p.target_type = 'review_reply' then
    select google_review_id into v_review from public.reviews where id = p.target_id;
  end if;
  update public.publications set state = 'verifying', last_checked_at = now() where id = p.id;
  return jsonb_build_object('result', 'claimed', 'publication_id', p.id, 'target_type', p.target_type,
    'target_id', p.target_id, 'text', p.payload ->> 'text', 'payload', p.payload, 'checks', p.checks,
    'google_ref', p.google_ref, 'google_account_id', l.google_account_id, 'google_location_id', l.google_location_id,
    'google_review_id', v_review);
end $$;

-- 7. Privileges: the Edge Functions run these as the service role; the browser goes through api and content. ---------------

revoke all on function public.approve_publication(text, uuid, jsonb, uuid, text, integer),
  public.approve_publication(text, uuid, text, uuid, text, integer), public.undo_publication(uuid, uuid),
  public.claim_publication(uuid), public.record_publication(uuid, text, text, text, text, text, jsonb, boolean),
  public.claim_publication_check(uuid)
  from public, anon, authenticated;
grant execute on function public.approve_publication(text, uuid, jsonb, uuid, text, integer),
  public.approve_publication(text, uuid, text, uuid, text, integer), public.undo_publication(uuid, uuid),
  public.claim_publication(uuid), public.record_publication(uuid, text, text, text, text, text, jsonb, boolean),
  public.claim_publication_check(uuid)
  to service_role;
revoke all on function private.publication_noun(text) from public, anon, authenticated, service_role;
