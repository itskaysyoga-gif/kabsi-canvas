-- Sec 1 (master plan 25.7, 30.15 section 8): hardening found by the Sec 1 tests.
--   1. The browser roles hold no INSERT, UPDATE, DELETE or TRUNCATE on any table in public. Nineteen tables from the
--      first schema still had them from Supabase's default grants. No policy allowed a write, so RLS refused every
--      insert, update and delete already, but TRUNCATE is not covered by RLS. Writes go through RPCs and Edge Functions
--      (D206); sec1_tenant_matrix.sql holds the rule for every table.
--   2. One stop switch for every Google write: app_settings google_writes ('on' or 'paused'). claim_publication waits
--      while it is paused (the job is postponed, nothing is lost) and the Google layer checks it for every other write.
--      Only a Kabsi staff admin flips it, with a reason, an audit event and a staff alert.
--   3. An approval is good for 7 days after the item was due (the later of the approval and its publish time, so a post
--      approved ahead for a later date is not affected): claim_publication refuses an older one (approval_expired), so a
--      yes given long ago cannot reach Google after a pause.
--   4. Founding 25 (LATER row): staff_founding_matches finds the businesses whose owner's WhatsApp number is the
--      application's number, for staff admins only, returning the business and the last 4 digits, never the number.
--   5. clean_ai_text read new.state on a reply_drafts row when the draft was the owner's (no such column), so an owner
--      draft row could not be saved. It now reads each table's own columns only.
--   6. Email links (database side of the Edge checks): use_action_link refuses any signed-in account that is not the
--      recipient, on every kind of link, and a skip changes only a review of the link's own business; use_holiday_link
--      treats a link with no expiry as expired, and so does the page that shows it (holiday_link_view).
--   7. Webhooks out of order: an older Creem event never overwrites a newer one on subscriptions, even when two jobs
--      race (a BEFORE UPDATE guard on last_event_at); a late WhatsApp receipt never moves a message backwards
--      (read stays read when a delivered receipt arrives after it).
-- Additive only: revoke, insert on conflict do nothing, create or replace.

-- 1. No direct table writes from the browser roles.
do $$
declare t record;
begin
  for t in select c.relname from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'p') loop
    execute format('revoke insert, update, delete, truncate on public.%I from anon, authenticated', t.relname);
  end loop;
end $$;
alter default privileges in schema public revoke insert, update, delete, truncate on tables from anon, authenticated;

-- 2. The stop switch.
insert into public.app_settings (key, value) values ('google_writes', 'on') on conflict (key) do nothing;

create or replace function private.google_writes_paused() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select value from public.app_settings where key = 'google_writes'), 'on') <> 'on'
$$;
revoke all on function private.google_writes_paused() from public, anon, authenticated;
grant execute on function private.google_writes_paused() to service_role;

-- Read by the Edge Functions (service role) before every Google write outside the publication pipeline.
create or replace function public.google_writes_paused() returns boolean
language sql stable security definer set search_path = '' as $$
  select private.google_writes_paused()
$$;
revoke all on function public.google_writes_paused() from public, anon, authenticated;
grant execute on function public.google_writes_paused() to service_role;

create or replace function private.is_staff_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.staff s where s.user_id = auth.uid() and s.role = 'admin')
$$;
revoke all on function private.is_staff_admin() from public, anon, authenticated;

create or replace function public.staff_set_google_writes(p_paused boolean, p_reason text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_reason text := btrim(coalesce(p_reason, ''));
begin
  if not private.is_staff_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_paused is null then raise exception 'bad_input'; end if;
  if char_length(v_reason) < 5 or char_length(v_reason) > 300 then raise exception 'reason_required'; end if;
  insert into public.app_settings (key, value, updated_at) values ('google_writes', case when p_paused then 'paused' else 'on' end, now())
  on conflict (key) do update set value = excluded.value, updated_at = now();
  perform private.audit('staff', auth.uid(), case when p_paused then 'google_writes_paused' else 'google_writes_resumed' end,
    null, 'app_setting', 'google_writes', null, jsonb_build_object('paused', p_paused, 'reason', v_reason), 'staff',
    case when p_paused then 'paused' else 'on' end);
  perform public.ops_emit('google_writes', 'alerts',
    case when p_paused then 'Google writes are paused' else 'Google writes are back on' end, v_reason);
  return jsonb_build_object('google_writes', case when p_paused then 'paused' else 'on' end);
end $$;
revoke all on function public.staff_set_google_writes(boolean, text) from public, anon;
grant execute on function public.staff_set_google_writes(boolean, text) to authenticated;

-- 2 and 3. claim_publication: as in 20261024130000_google_needs_action.sql, plus the approval age and the stop switch.
create or replace function public.claim_publication(p_publication uuid) returns jsonb
language plpgsql security definer set search_path = '' as $function$
declare p public.publications; l public.locations; v_review text; v_action text; v_high boolean := false;
begin
  select * into p from public.publications where id = p_publication for update;
  if not found then return jsonb_build_object('result', 'missing'); end if;
  if p.state <> 'approved' then return jsonb_build_object('result', 'not_approved', 'state', p.state); end if;
  if p.publish_after is null then return jsonb_build_object('result', 'not_approved', 'state', p.state); end if;
  if p.publish_after > now() then return jsonb_build_object('result', 'not_due', 'publish_after', p.publish_after); end if;
  -- Sec 1: a yes is good for 7 days. An approval still waiting after that (Google needed action, the switch was off)
  -- is not sent: the owner approves again, on what the item says then.
  -- Measured from when the item was due: a post approved in a month plan for a later date is not expired by waiting.
  if greatest(p.approved_at, p.publish_after) < now() - interval '7 days' then
    perform public.record_publication(p.id, 'failed', 'This approval is more than 7 days old. Nothing was sent. Approve it again.',
      'approval_expired', null, null, null, true);
    return jsonb_build_object('result', 'stopped');
  end if;
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
  if l.status <> 'active' or l.google_location_id is null or l.disconnect_requested_at is not null then
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

  -- 25.3: the plan and the approval are checked again right before the write, not only when the owner approved.
  if not private.entitled(p.location_id, 'publish') then
    perform public.record_publication(p.id, 'failed',
      'Your plan ended before this went to Google. Nothing was sent. Choose a plan to publish it.',
      'plan_ended', null, null, null, true);
    return jsonb_build_object('result', 'stopped');
  end if;
  if p.channel <> 'auto_fix' then
    if p.target_type = 'review_reply' then
      v_high := exists (select 1 from public.reviews where id = p.target_id and risk = 'high');
    elsif p.target_type = 'listing_revert' then
      v_high := private.protection_high_risk(p.payload ->> 'field');
    end if;
    if not private.may_approve(p.location_id, private.approval_kind(p.target_type), p.approved_by, v_high) then
      perform public.record_publication(p.id, 'failed',
        'The person who approved this can no longer approve it for this business. Nothing was sent.',
        'approver_no_longer_allowed', null, null, null, true);
      return jsonb_build_object('result', 'stopped');
    end if;
  end if;

  -- Sec 1: the one stop switch for every Google write (app_settings google_writes = 'paused'). The publication stays
  -- approved and the job waits; nothing is lost. The Google layer checks the same switch for writes outside this pipeline.
  if p.route = 'api' and private.google_writes_paused() then
    return jsonb_build_object('result', 'paused', 'action', 'google_writes_paused', 'retry_at', now() + interval '15 minutes');
  end if;

  -- 18.2: while Google needs action on this profile nothing is sent. The publication stays approved and the job waits.
  if p.route = 'api' then
    select google_action into v_action from public.google_connections where location_id = p.location_id;
    if v_action is not null then
      return jsonb_build_object('result', 'paused', 'action', v_action, 'retry_at', now() + interval '1 hour');
    end if;
  end if;

  update public.publications set state = 'publishing', attempts = attempts + 1, claimed_at = now() where id = p.id;

  if p.route = 'concierge' then
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

-- 4. Founding 25: which business is this application's? Matched in the database, so staff never read owners' numbers.
create or replace function public.staff_founding_matches(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare a public.founding_applications;
begin
  if not private.is_staff_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into a from public.founding_applications where id = p_id;
  if not found then raise exception 'not_found'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('location_id', l.id, 'name', l.name, 'phone_last4', right(o.phone, 4),
             'whatsapp_state', o.state) order by l.created_at)
      from public.whatsapp_optins o
      join public.location_members m on m.user_id = o.user_id and m.role = 'owner'
      join public.locations l on l.id = m.location_id
     where o.phone = a.whatsapp and not l.is_demo), '[]'::jsonb);
end $$;
revoke all on function public.staff_founding_matches(uuid) from public, anon;
grant execute on function public.staff_founding_matches(uuid) to authenticated;

-- 5. The no-dashes trigger reads only the columns of its own table.
create or replace function public.clean_ai_text() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_table_name = 'reply_drafts' then
    if coalesce(new.source, 'ai') like 'ai%' then new.body := public.no_dashes(new.body); end if;
  elsif tg_table_name = 'gbp_posts' then
    if new.state = 'draft' then new.body := public.no_dashes(new.body); end if;
  end if;
  return new;
end $$;

-- 6. Email links: use_action_link and use_holiday_link as before, with the two Sec 1 checks.
CREATE OR REPLACE FUNCTION public.use_action_link(p_token_hash text, p_do text, p_text text DEFAULT NULL::text, p_session_user uuid DEFAULT NULL::uuid, p_publication uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare t public.action_tokens; v_need boolean; v_signed_in boolean; v_result jsonb; r jsonb; v_state text;
begin
  select * into t from public.action_tokens where token_hash = p_token_hash for update;
  if not found then raise exception 'invalid_link'; end if;

  -- Bound to one recipient: another account's session gets nothing, not even a result (Sec 1: every kind of link, not
  -- only the kinds that need sign-in, so nobody acts in the recipient's name).
  v_need := private.action_link_needs_sign_in(t.target_type, t.target_id,
    case when p_do = 'undo' then private.action_link_verb(t.action) else p_do end);
  if p_session_user is not null and p_session_user is distinct from t.user_id then
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
    -- P0.3-06 (K-16): skipping from a link is a decision on the review, like approving it.
    if not private.may_approve(t.location_id, 'review_reply', t.user_id,
         coalesce((select risk = 'high' from public.reviews where id = t.target_id::uuid), false)) then
      raise exception 'not_allowed_to_approve' using errcode = '42501';
    end if;
    update public.reviews set state = case when p_do = 'skip' then 'skipped' else 'handled_offline' end
     where id = t.target_id::uuid and location_id = t.location_id and state in ('new', 'drafted', 'blocked');
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
end $function$;

CREATE OR REPLACE FUNCTION public.use_holiday_link(p_token_hash text, p_answer text, p_open text, p_close text, p_from date, p_to date, p_session_user uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare pr public.holiday_prompts; v_user uuid := p_session_user;
begin
  select * into pr from public.holiday_prompts where token_hash = p_token_hash;
  if not found then raise exception 'invalid_link'; end if;
  -- Sec 1: a link with no expiry is treated as expired.
  if coalesce(pr.token_expires_at, '-infinity') < now() and pr.state = 'asked' then raise exception 'link_expired'; end if;
  -- "Normal hours" publishes nothing, so the link alone is enough; a session that is not a member of the business is ignored.
  if p_answer = 'normal' and v_user is not null
     and not exists (select 1 from public.location_members where location_id = pr.location_id and user_id = v_user) then
    v_user := null;
  end if;
  return private.holiday_answer(pr.id, v_user, 'email_link', p_answer, p_open, p_close, p_from, p_to);
end $function$;

-- 7. Webhooks out of order.
create or replace function private.subscriptions_keep_newest() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  -- An event older than the last one applied changes nothing; other writers (no event time) are not affected.
  if old.last_event_at is not null and new.last_event_at is not null and new.last_event_at < old.last_event_at then
    return old;
  end if;
  return new;
end $$;
revoke all on function private.subscriptions_keep_newest() from public, anon, authenticated;
create or replace trigger subscriptions_keep_newest before update on public.subscriptions
  for each row execute function private.subscriptions_keep_newest();

create or replace function public.whatsapp_status_update(p_provider_id text, p_state text, p_error text default null)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_rank int := case p_state when 'sent' then 1 when 'delivered' then 2 when 'read' then 3 when 'failed' then 4 end;
begin
  if v_rank is null then raise exception 'bad_state'; end if;
  update public.whatsapp_messages set state = p_state, error = coalesce(left(p_error, 500), error), updated_at = now()
   where provider_id = p_provider_id and direction = 'out'
     and coalesce(case state when 'sent' then 1 when 'delivered' then 2 when 'read' then 3 when 'failed' then 4 end, 0) < v_rank;
  return found;
end $$;

-- 6. The holiday link page says expired for a link with no expiry, like the action.
CREATE OR REPLACE FUNCTION public.holiday_link_view(p_token_hash text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare pr public.holiday_prompts; h public.holidays; l public.locations; f public.knowledge_facts; v_status text;
begin
  select * into pr from public.holiday_prompts where token_hash = p_token_hash;
  if not found then return jsonb_build_object('status', 'invalid'); end if;
  select * into h from public.holidays where id = pr.holiday_id;
  select * into l from public.locations where id = pr.location_id;
  select * into f from public.knowledge_facts where location_id = l.id and slot = 'profile.regular_hours' and superseded_by is null;
  v_status := case when pr.state = 'answered' then 'answered'
                   when pr.state = 'expired' or coalesce(pr.token_expires_at, '-infinity') < now() then 'expired' else 'ok' end;
  return jsonb_build_object('status', v_status, 'business', l.name, 'demo', l.is_demo, 'location_id', l.id,
    'holiday', jsonb_build_object('name', h.name, 'starts_on', h.starts_on, 'ends_on', h.ends_on, 'kind', h.kind, 'estimated', h.estimated),
    'answer', pr.answer, 'special_hours_id', pr.special_hours_id,
    'regular_hours', case when f.status = 'verified' then f.value ->> 'display' end);
end $function$;
