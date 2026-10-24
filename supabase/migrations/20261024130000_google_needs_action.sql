-- Session 19 rest (master plan 18.2, 25.3, P0.7-03).
-- 1. google_connections keeps Google's state for the profile (the parts of VoiceOfMerchantState the rule reads, never
--    text) and, while Google needs action, which action and since when.
-- 2. tasks.kind gains 'google_needs_action' (one urgent task per business, opened and closed only by record_google_state).
-- 3. public.record_google_state(location, state, action): called by the Guard's daily read and by every Pub/Sub
--    notification. A new action pauses publishing, opens the task and writes one ops event; a cleared state closes the
--    task, writes one ops event and offers the waiting publications again at once.
-- 4. claim_publication checks again, right before every write: Google needs action (the job waits, nothing is sent),
--    the approver may still approve this kind (a removed member or a changed role stops it), and the plan still
--    allows publishing (25.3: access lost, plan ended or business disconnected while the job waited).
-- 5. public.google_events: one row per Pub/Sub message (its id is unique, so a replay or a duplicate push is ignored),
--    with the type and the business; no review text (Google sends only resource names).
-- Additive: new columns, a widened check, a new table and new or replaced functions. Nothing is dropped and no row is
-- removed.

-- 1 ------------------------------------------------------------------------------------------------------------------
alter table public.google_connections
  add column if not exists google_state jsonb,
  add column if not exists google_state_checked_at timestamptz,
  add column if not exists google_action text check (google_action in ('suspended', 'verify', 'ownership', 'no_voice')),
  add column if not exists google_action_since timestamptz;

-- 2 ------------------------------------------------------------------------------------------------------------------
alter table public.tasks drop constraint if exists tasks_kind_check;
alter table public.tasks add constraint tasks_kind_check check (kind in ('review_reply', 'profile_change', 'photo_batch',
  'post', 'hours_confirm', 'knowledge_confirm', 'profile_gap', 'reconnect', 'billing', 'google_needs_action'));

create or replace function private.task_path(p_kind text, p_source_id text) returns text
language sql immutable set search_path = '' as $$
  select case p_kind
    when 'review_reply' then '/app/inbox'
    when 'profile_change' then '/app/shield'
    when 'knowledge_confirm' then '/app/knowledge'
    when 'post' then '/app/posts'
    when 'photo_batch' then '/app/photos'
    when 'hours_confirm' then '/app/hours'
    when 'reconnect' then '/app/settings'
    when 'billing' then '/app/plan'
    when 'google_needs_action' then '/app/shield'
    when 'profile_gap' then case
      when p_source_id like 'coach\_%' then '/app/coach'
      when p_source_id = 'facts' then '/app/knowledge' when p_source_id = 'review_link' then '/app/cards'
      when p_source_id = 'posts' then '/app/posts' when p_source_id like 'photos%' then '/app/photos' else '/app/shield' end
    else '/app' end
$$;

-- 3 ------------------------------------------------------------------------------------------------------------------
-- The owner's words for each action (kabsi-copy: plain, no promise that Google reinstates anything, Kabsi never files
-- an appeal). Session 13b part 1 adds the WhatsApp message with Google's own help page for the case.
create or replace function private.google_action_copy(p_action text, p_name text) returns jsonb
language sql immutable set search_path = '' as $$
  select jsonb_build_object(
    'title', 'Google needs action on ' || coalesce(p_name, 'your business'),
    'why', case p_action
      when 'suspended' then 'Google has suspended this profile because it believes something breaks its guidelines. Kabsi has stopped sending changes to Google until Google clears it.'
      when 'verify' then 'Google is asking you to verify this business. Kabsi has stopped sending changes to Google until it is verified.'
      when 'ownership' then 'Google says someone else also claims this profile. Kabsi has stopped sending changes to Google until Google settles who manages it.'
      else 'Google is not letting this profile be managed right now. Kabsi has stopped sending changes to Google until it does again.' end,
    'recommendation', 'Open your Business Profile on Google and follow the steps it shows. Only you can do this; Kabsi never files an appeal for you. Your approved items wait and go out once Google clears it.')
$$;

create or replace function public.record_google_state(p_location uuid, p_state jsonb, p_action text) returns text
language plpgsql security definer set search_path = '' as $$
declare g public.google_connections; v_name text; v_copy jsonb; v_out text := 'ok'; n integer;
begin
  if p_action is not null and p_action not in ('suspended', 'verify', 'ownership', 'no_voice') then
    raise exception 'bad_google_action';
  end if;
  select * into g from public.google_connections where location_id = p_location for update;
  if not found then return 'missing'; end if;
  select name into v_name from public.locations where id = p_location;

  update public.google_connections set google_state = p_state, google_state_checked_at = now(),
    voice_of_merchant = coalesce((p_state ->> 'hasVoiceOfMerchant')::boolean, voice_of_merchant),
    google_action = p_action,
    google_action_since = case when p_action is null then null
                               when g.google_action is null then now() else coalesce(g.google_action_since, now()) end
   where location_id = p_location;

  if p_action is not null then
    v_copy := private.google_action_copy(p_action, v_name);
    -- One live task per business; a changed action updates it in place.
    perform private.task_put(p_location, 'google_needs_action', 'google_state', p_action, 'urgent', v_copy ->> 'title',
      v_copy ->> 'why', v_copy ->> 'recommendation', jsonb_build_object('action', p_action), null, 'google_needs_action');
    if g.google_action is distinct from p_action then
      perform public.ops_emit('google_needs_action', 'alerts', v_copy ->> 'title',
        'Google state ' || p_action || ' on ' || coalesce(v_name, p_location::text) || '. Publishing is paused for this business; the owner has an urgent task.',
        '[]', '[]', 'google_needs_action:' || p_location || ':' || p_action || ':' || (now() at time zone 'utc')::date);
      v_out := 'needs_action';
    else
      v_out := 'still_needs_action';
    end if;
  elsif g.google_action is not null then
    perform private.task_close_except(p_location, 'google_needs_action', '{}');
    perform public.ops_emit('google_cleared', 'alerts', 'Google cleared ' || coalesce(v_name, 'a business'),
      'Google no longer asks for action on ' || coalesce(v_name, p_location::text) || '. Publishing resumed.',
      '[]', '[]', 'google_cleared:' || p_location || ':' || extract(epoch from now())::bigint);
    -- Publishing resumes by itself: the publications that waited are offered again now, not at their next retry.
    update public.jobs j set next_run_at = now()
     where j.kind = 'publish' and j.location_id = p_location and j.state in ('pending', 'retrying') and j.next_run_at > now();
    get diagnostics n = row_count;
    v_out := 'cleared';
  end if;
  return v_out;
end $$;

revoke all on function public.record_google_state(uuid, jsonb, text) from public, anon, authenticated;
grant execute on function public.record_google_state(uuid, jsonb, text) to service_role;

-- 4 ------------------------------------------------------------------------------------------------------------------
create or replace function public.claim_publication(p_publication uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare p public.publications; l public.locations; v_review text; v_action text; v_high boolean := false;
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
end $$;

-- 5 ------------------------------------------------------------------------------------------------------------------
create table if not exists public.google_events (
  message_id text primary key check (length(message_id) between 1 and 200),
  type text not null check (length(type) between 1 and 60),
  google_location_id text,
  location_id uuid,
  jobs integer not null default 0,
  published_at timestamptz,
  received_at timestamptz not null default now()
);
create index if not exists google_events_received on public.google_events (received_at);
alter table public.google_events enable row level security;
revoke all on public.google_events from public, anon, authenticated;
create policy staff_read_google_events on public.google_events for select to authenticated using ((select public.is_staff()));
grant select on public.google_events to authenticated;
