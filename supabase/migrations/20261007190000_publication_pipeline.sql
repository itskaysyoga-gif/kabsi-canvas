-- P0.1-13a: one publication pipeline, review replies first (K-38, K-70, K-116.1, R-05, D202, D266, guardrail 6).
--
-- 1. publications becomes the one ledger and state machine for Google writes: state (approved, publishing,
--    published, checking, verifying, verified, rejected, failed, cancelled), an idempotency key, publish_after for the
--    10 second undo (K-70), the approval record (approved_by, approved_at, channel, already there), attempts, the
--    Google reference, Google's moderation state and the reconcile schedule.
--    The old status column stays (expand first): a trigger keeps state and status in step both ways, so the post,
--    photo, hours and Protection paths that still write status (until P0.1-13b) and the concierge staff functions
--    keep working, and every reader of status (audit feed, ops alerts, metrics, Reviews page) sees the same thing.
-- 2. approve_publication(...) is the one approval: under a lock on the review it returns the open publication if
--    there is one (a second tap, a second email click, a dashboard and an email approval at the same moment), or
--    claims the review, writes the publication and offers its publish job at publish_after.
-- 3. undo_publication(...) cancels while now() < publish_after; nothing reaches Google.
-- 4. claim_publication(...) is the one claim: only an approved, due publication moves to publishing, once. A concierge
--    business gets its concierge task here instead of a Google call (D267).
-- 5. record_publication(...) records what Google answered, moves the review with it, and schedules the reconcile
--    checks for a reply Google is checking (10 minutes, then 30 minutes, 1, 3, 6, 12 and 24 hours, then daily; after
--    7 days without the reply it is failed and returned to the owner). A write is never retried after an ambiguous
--    failure: the item goes to checking and the reconcile job reads Google (D266, K-116.1).
-- 6. claim_publication_check(...) takes one due check (checking to verifying) for the reconcile job.
-- 7. private.produce_jobs() also offers due publish and reconcile jobs, and moves a publication whose worker stopped
--    mid-write (publishing or verifying for 10 minutes) to checking, never back to approved.
-- 8. The mock reviews API gains a call counter and test modes (pending moderation, timeout, rejection) through
--    mock_google_reply(...), so the tests and a staff check can drive every path without Google.
--
-- Additive: new columns, functions, indexes and two triggers re-created on more columns (same functions). Nothing is
-- removed and no row is lost. concierge_queue_reply is no longer called by the code; it goes in P0.1-13b's contract
-- step.

-- 1. Columns ---------------------------------------------------------------------------------------------------------

alter table public.publications
  add column state text check (state in ('approved', 'publishing', 'published', 'checking', 'verifying', 'verified',
                                         'rejected', 'failed', 'cancelled')),
  add column idempotency_key text,
  add column publish_after timestamptz,
  add column attempts integer not null default 0,
  add column claimed_at timestamptz,
  add column google_ref text,
  add column moderation_state text check (moderation_state in ('pending', 'unknown')),
  add column last_checked_at timestamptz,
  add column next_check_at timestamptz,
  add column checks integer not null default 0;

create unique index publications_idempotency_key on public.publications (idempotency_key);
create index publications_open_idx on public.publications (state, publish_after, next_check_at)
  where state in ('approved', 'publishing', 'verifying', 'checking');
create index publications_target_open_idx on public.publications (target_type, target_id)
  where state in ('approved', 'publishing', 'published', 'checking', 'verifying', 'verified');

alter table public.mock_google_reviews
  add column reply_mode text check (reply_mode in ('pending', 'timeout', 'reject')),
  add column reply_calls integer not null default 0,
  add column pending_reply_comment text;

-- 2. State and status in step ------------------------------------------------------------------------------------------

create function private.publication_status_of(p_state text, p_route text) returns text
language sql immutable set search_path = '' as $$
  select case p_state
    when 'approved' then 'queued'
    when 'publishing' then case when p_route = 'concierge' then 'queued' else 'sent' end
    when 'published' then 'sent'
    when 'verifying' then 'in_review'
    when 'checking' then 'in_review'
    when 'verified' then 'live'
    else p_state end
$$;

create function private.publication_state_of(p_status text) returns text
language sql immutable set search_path = '' as $$
  select case p_status
    when 'queued' then 'approved'
    when 'sent' then 'publishing'
    when 'live' then 'verified'
    when 'in_review' then 'checking'
    else p_status end
$$;

create function private.publication_sync_state() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if new.state is null then
      new.state := private.publication_state_of(new.status);
    else
      new.status := private.publication_status_of(new.state, new.route);
    end if;
  elsif new.state is distinct from old.state then
    new.status := private.publication_status_of(new.state, new.route);
  elsif new.status is distinct from old.status then
    new.state := private.publication_state_of(new.status);
  end if;
  return new;
end $$;

update public.publications set state = private.publication_state_of(status) where state is null;
alter table public.publications alter column state set not null;

create trigger publications_state before insert or update on public.publications
  for each row execute function private.publication_sync_state();

-- The audit and ops triggers fired on "update of status"; the pipeline updates state (status follows in the trigger
-- above), so they now fire on either column. Same functions as before.
create or replace trigger publications_audit after insert or update of status, state on public.publications
  for each row execute function private.audit_publication();
create or replace trigger ops_publication after update of status, state on public.publications
  for each row when (not public.is_demo_location(new.location_id)) execute function public.ops_on_publication();

-- 3. Approve (the one approval path) -----------------------------------------------------------------------------------

create function public.approve_publication(p_target_type text, p_target_id uuid, p_text text, p_approved_by uuid,
  p_channel text, p_undo_seconds integer default 10) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare r public.reviews; l public.locations; p public.publications; v_text text := trim(coalesce(p_text, ''));
  v_n integer;
begin
  if p_target_type is distinct from 'review_reply' then raise exception 'unsupported_target'; end if;
  if p_channel not in ('dashboard', 'email_link') then raise exception 'bad_channel'; end if;
  if length(v_text) < 1 or length(v_text) > 4000 then raise exception 'bad_reply_text'; end if;

  -- The lock on the review makes approvals of the same reply take turns: the second one finds the first's row.
  select * into r from public.reviews where id = p_target_id for update;
  if not found then raise exception 'unknown_review'; end if;
  if not exists (select 1 from public.location_members where location_id = r.location_id and user_id = p_approved_by) then
    raise exception 'approver_not_member';
  end if;

  -- K-38: a second tap, a second email click or the other channel gets the existing result.
  select * into p from public.publications
   where target_type = 'review_reply' and target_id = r.id
     and state in ('approved', 'publishing', 'published', 'checking', 'verifying', 'verified')
   order by created_at desc limit 1;
  if found then
    return jsonb_build_object('publication_id', p.id, 'state', p.state, 'route', p.route,
      'publish_after', p.publish_after, 'created', false);
  end if;

  select * into l from public.locations where id = r.location_id;
  if l.status <> 'active' or l.google_location_id is null then raise exception 'location_not_active'; end if;
  if r.state not in ('drafted', 'blocked') then raise exception 'already_posted'; end if;

  select count(*) into v_n from public.publications where target_type = 'review_reply' and target_id = r.id;
  update public.reviews set state = 'publishing', reply_state_reason = null where id = r.id;
  insert into public.publications (location_id, target_type, target_id, payload, approved_by, channel, state, route,
    idempotency_key, publish_after)
  values (r.location_id, 'review_reply', r.id, jsonb_build_object('text', v_text), p_approved_by, p_channel, 'approved',
    case when l.concierge then 'concierge' else 'api' end, 'review_reply:' || r.id || ':' || (v_n + 1),
    now() + make_interval(secs => greatest(coalesce(p_undo_seconds, 10), 0)))
  returning * into p;
  perform public.enqueue_job('publish', p.location_id, 'publish:' || p.id, jsonb_build_object('publication_id', p.id),
    p.publish_after);
  return jsonb_build_object('publication_id', p.id, 'state', p.state, 'route', p.route,
    'publish_after', p.publish_after, 'created', true);
end $$;

-- 4. Undo (K-70): only the business's members, only before publish_after ------------------------------------------------

create function public.undo_publication(p_publication uuid, p_user uuid) returns jsonb
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
  if p.target_type = 'review_reply' then
    update public.reviews set state = 'drafted' where id = p.target_id and state = 'publishing';
  end if;
  return jsonb_build_object('state', 'cancelled');
end $$;

-- 5. Claim (the one claim) -----------------------------------------------------------------------------------------------

-- Returns {result: claimed | concierge | not_due | not_approved | stopped | missing}. Only "claimed" may call Google.
create function public.claim_publication(p_publication uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare p public.publications; l public.locations; v_review text;
begin
  select * into p from public.publications where id = p_publication for update;
  if not found then return jsonb_build_object('result', 'missing'); end if;
  if p.state <> 'approved' then return jsonb_build_object('result', 'not_approved', 'state', p.state); end if;
  if p.publish_after is null then return jsonb_build_object('result', 'not_approved', 'state', p.state); end if;
  if p.publish_after > now() then return jsonb_build_object('result', 'not_due', 'publish_after', p.publish_after); end if;
  if p.payload_redacted_at is not null or p.payload ->> 'text' is null then
    perform public.record_publication(p.id, 'failed', 'The approved text is no longer kept. Approve a new reply.',
      'payload_redacted', null, null, null, true);
    return jsonb_build_object('result', 'stopped');
  end if;

  select * into l from public.locations where id = p.location_id;
  if l.status <> 'active' or l.google_location_id is null then
    perform public.record_publication(p.id, 'failed',
      'Replies are sent while a free trial or a Pro plan is active and Kabsi can reach your profile.',
      'location_not_active', null, null, null, true);
    return jsonb_build_object('result', 'stopped');
  end if;

  update public.publications set state = 'publishing', attempts = attempts + 1, claimed_at = now() where id = p.id;

  if p.route = 'concierge' then
    -- Early access (D267): a person posts it by hand; staff "Mark posted" makes it live. No Google call.
    insert into public.concierge_tasks (location_id, kind, review_id, publication_id)
    values (p.location_id, 'post_reply', p.target_id, p.id);
    return jsonb_build_object('result', 'concierge');
  end if;

  select google_review_id into v_review from public.reviews where id = p.target_id;
  return jsonb_build_object('result', 'claimed', 'publication_id', p.id, 'location_id', p.location_id,
    'target_type', p.target_type, 'target_id', p.target_id, 'text', p.payload ->> 'text', 'attempts', p.attempts + 1,
    'google_account_id', l.google_account_id, 'google_location_id', l.google_location_id, 'google_review_id', v_review);
end $$;

-- 6. Record what Google answered -----------------------------------------------------------------------------------------

-- Wait before the next check of a reply Google is checking, after p_checks checks.
create function private.publication_check_delay(p_checks integer) returns interval
language sql immutable set search_path = '' as $$
  select case greatest(coalesce(p_checks, 0), 0)
    when 0 then interval '10 minutes' when 1 then interval '30 minutes' when 2 then interval '1 hour'
    when 3 then interval '3 hours' when 4 then interval '6 hours' when 5 then interval '12 hours'
    else interval '24 hours' end
$$;

-- p_internal lets claim_publication stop an approved item; the allowed moves are listed below. Returns the new state.
create function public.record_publication(p_publication uuid, p_state text, p_reason text default null,
  p_error text default null, p_google_ref text default null, p_moderation text default null,
  p_response jsonb default null, p_internal boolean default false) returns text
language plpgsql security definer set search_path = '' as $$
declare p public.publications; v_state text := p_state; v_reason text := p_reason; v_text text;
begin
  select * into p from public.publications where id = p_publication for update;
  if not found then raise exception 'unknown_publication'; end if;

  if not (
       (p.state = 'publishing' and v_state in ('approved', 'published', 'checking', 'rejected'))
    or (p.state = 'published' and v_state in ('verified', 'checking'))
    or (p.state = 'verifying' and v_state in ('verified', 'checking', 'failed'))
    or (p.state = 'approved' and v_state = 'failed' and p_internal)
  ) then
    raise exception 'bad_transition % to %', p.state, v_state;
  end if;

  -- K-116.1: a reply that Google still does not show 7 days after approval is treated as removed.
  if v_state = 'checking' and p.approved_at < now() - interval '7 days' then
    v_state := 'failed';
    v_reason := 'Google has not shown this reply after 7 days. Edit it and approve again, or reply on Google.';
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
    last_checked_at = case when v_state in ('verified', 'checking', 'failed') and p.state = 'verifying' then now()
                           else last_checked_at end,
    checks = case when v_state = 'checking' and p.state = 'verifying' then checks + 1 else checks end,
    next_check_at = case when v_state = 'checking'
                         then now() + private.publication_check_delay(case when p.state = 'verifying' then checks + 1 else 0 end)
                         else null end
  where id = p.id;

  if p.target_type = 'review_reply' then
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
  end if;
  return v_state;
end $$;

-- 7. The reconcile job's claim: one due check at a time ------------------------------------------------------------------

create function public.claim_publication_check(p_publication uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare p public.publications; l public.locations; v_review text;
begin
  select * into p from public.publications where id = p_publication for update;
  if not found or p.state <> 'checking' then return jsonb_build_object('result', 'not_checking'); end if;
  if p.next_check_at > now() then return jsonb_build_object('result', 'not_due', 'next_check_at', p.next_check_at); end if;
  select * into l from public.locations where id = p.location_id;
  select google_review_id into v_review from public.reviews where id = p.target_id;
  update public.publications set state = 'verifying', last_checked_at = now() where id = p.id;
  return jsonb_build_object('result', 'claimed', 'publication_id', p.id, 'target_type', p.target_type,
    'target_id', p.target_id, 'text', p.payload ->> 'text', 'checks', p.checks,
    'google_account_id', l.google_account_id, 'google_location_id', l.google_location_id, 'google_review_id', v_review);
end $$;

-- 8. Producers: due publish and reconcile jobs, and writes whose worker stopped ------------------------------------------

create or replace function private.produce_jobs() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_sync integer; v_draft integer; v_notify integer; v_protect integer; v_steps integer := 0; v_live boolean;
  v_publish integer; v_reconcile integer; v_stuck integer;
begin
  -- Review sync: every business whose reviews Kabsi reads from Google (concierge businesses are typed in by staff),
  -- every 5 minutes. A business seen for the first time starts at its own offset inside the 5 minutes.
  with due as (
    select g.location_id, g.next_sync_at is null as first_time
      from public.google_connections g join public.locations l on l.id = g.location_id
     where l.status = 'active' and l.google_location_id is not null and not l.concierge
       and l.google_location_id not like 'locations/concierge-%'
       and (g.next_sync_at is null or g.next_sync_at <= now())
     for update of g skip locked
  ), moved as (
    update public.google_connections g set
      next_sync_at = case when due.first_time
                          then now() + make_interval(secs => abs(hashtext(g.location_id::text)) % 300)
                          else now() + interval '5 minutes' end
      from due where g.location_id = due.location_id
    returning g.location_id, due.first_time
  ), added as (
    insert into public.jobs (kind, location_id, dedupe_key)
    select 'sync_reviews', m.location_id, 'sync_reviews:' || m.location_id from moved m where not m.first_time
    on conflict (dedupe_key) where dedupe_key is not null and state in ('pending', 'running', 'retrying') do nothing
    returning 1
  )
  select count(*) into v_sync from added;

  -- Drafts: new reviews of active businesses, newest first, at most 10 a minute (the old 10 per run, K-100 budget).
  with added as (
    insert into public.jobs (kind, location_id, dedupe_key, payload)
    select 'draft_reply', r.location_id, 'draft_reply:' || r.id, jsonb_build_object('review_id', r.id)
      from public.reviews r join public.locations l on l.id = r.location_id
     where r.state = 'new' and r.draft_attempts < 3 and l.status = 'active'
       and not exists (select 1 from public.jobs j where j.dedupe_key = 'draft_reply:' || r.id
                         and j.state in ('pending', 'running', 'retrying'))
     order by r.review_created_at desc nulls last
     limit 10
    on conflict (dedupe_key) where dedupe_key is not null and state in ('pending', 'running', 'retrying') do nothing
    returning 1
  )
  select count(*) into v_draft from added;

  -- Owner emails: a business with drafted or blocked reviews not yet emailed, when one is due now (D220, D221).
  with added as (
    insert into public.jobs (kind, location_id, dedupe_key)
    select 'notify_owner', l.id, 'notify_owner:' || l.id
      from public.locations l
     where l.status = 'active' and l.google_location_id is not null
       and (l.emails_paused_until is null or l.emails_paused_until <= now())
       and exists (select 1 from public.reviews r
                    where r.location_id = l.id and r.state in ('drafted', 'blocked') and r.notified_at is null
                      and (r.is_backlog or r.star_rating <= 3 or r.urgency = 'urgent'
                           or private.local_hour(l.time_zone) >= l.digest_hour))
    on conflict (dedupe_key) where dedupe_key is not null and state in ('pending', 'running', 'retrying') do nothing
    returning 1
  )
  select count(*) into v_notify from added;

  -- Google Protection (D218): the same businesses as the sync, every 5 minutes on the mock and for demo businesses,
  -- once an hour on live Google. A business seen for the first time starts at its own offset inside the 5 minutes.
  v_live := public.google_mode() = 'live';
  with due as (
    select g.location_id, g.next_protection_at is null as first_time,
           case when v_live and not l.is_demo then interval '1 hour' else interval '5 minutes' end as every
      from public.google_connections g join public.locations l on l.id = g.location_id
     where l.status = 'active' and l.google_location_id is not null and not l.concierge
       and l.google_location_id not like 'locations/concierge-%'
       and (g.next_protection_at is null or g.next_protection_at <= now())
     for update of g skip locked
  ), moved as (
    update public.google_connections g set
      next_protection_at = case when due.first_time
                                then now() + make_interval(secs => abs(hashtext('protection:' || g.location_id::text)) % 300)
                                else now() + due.every end
      from due where g.location_id = due.location_id
    returning g.location_id, due.first_time
  ), added as (
    insert into public.jobs (kind, location_id, dedupe_key)
    select 'protection_check', m.location_id, 'protection_check:' || m.location_id from moved m where not m.first_time
    on conflict (dedupe_key) where dedupe_key is not null and state in ('pending', 'running', 'retrying') do nothing
    returning 1
  )
  select count(*) into v_protect from added;

  -- The whole-system steps the 5 minute cron ran, each at its own minute.
  v_steps := private.offer_every('access_check', interval '5 minutes', interval '0 minutes')
           + private.offer_every('ratings_snapshot', interval '5 minutes', interval '1 minute')
           + private.offer_every('weekly_reports', interval '5 minutes', interval '2 minutes')
           + private.offer_every('deletions', interval '5 minutes', interval '3 minutes')
           + private.offer_every('trial_reminders', interval '5 minutes', interval '4 minutes')
           + private.offer_every('renewal_reminders', interval '5 minutes', interval '4 minutes');

  -- P0.1-13a: a write whose worker stopped (publishing or verifying for 10 minutes) may or may not have reached
  -- Google: it goes to checking and is read, never sent again (D266).
  with moved as (
    update public.publications set state = 'checking', moderation_state = coalesce(moderation_state, 'unknown'),
      error = coalesce(error, 'stopped before Google answered'), next_check_at = now()
     where publish_after is not null and route = 'api'
       and ((state = 'publishing' and claimed_at < now() - interval '10 minutes')
         or (state = 'verifying' and last_checked_at < now() - interval '10 minutes'))
    returning 1
  )
  select count(*) into v_stuck from moved;

  -- Due approvals (approve_publication offers each one already; this is the safety net) and due checks.
  with added as (
    insert into public.jobs (kind, location_id, dedupe_key, payload)
    select 'publish', p.location_id, 'publish:' || p.id, jsonb_build_object('publication_id', p.id)
      from public.publications p
     where p.state = 'approved' and p.publish_after <= now()
    on conflict (dedupe_key) where dedupe_key is not null and state in ('pending', 'running', 'retrying') do nothing
    returning 1
  )
  select count(*) into v_publish from added;
  with added as (
    insert into public.jobs (kind, location_id, dedupe_key, payload)
    select 'reconcile_publication', p.location_id, 'reconcile_publication:' || p.id, jsonb_build_object('publication_id', p.id)
      from public.publications p
     where p.state = 'checking' and p.next_check_at <= now()
    on conflict (dedupe_key) where dedupe_key is not null and state in ('pending', 'running', 'retrying') do nothing
    returning 1
  )
  select count(*) into v_reconcile from added;

  return jsonb_build_object('sync_reviews', v_sync, 'draft_reply', v_draft, 'notify_owner', v_notify,
    'protection_check', v_protect, 'steps', v_steps, 'publish', v_publish, 'reconcile_publication', v_reconcile,
    'stuck_publications', v_stuck);
end $$;

-- 9. The mock reviews API's reply (mock mode and demo businesses only; R-17) ----------------------------------------------

-- Counts every call. reply_mode drives the tests: null stores the reply (Google shows it), pending keeps it out of
-- sight (moderation, shown once staff or a test copies it to reply_comment), timeout stores it and answers nothing,
-- reject stores nothing and answers 400.
create function public.mock_google_reply(p_review_id text, p_comment text) returns text
language plpgsql security definer set search_path = '' as $$
declare m public.mock_google_reviews;
begin
  update public.mock_google_reviews set reply_calls = reply_calls + 1 where review_id = p_review_id returning * into m;
  if not found then return 'not_found'; end if;
  if m.reply_mode = 'reject' then return 'reject'; end if;
  if m.reply_mode = 'pending' then
    update public.mock_google_reviews set pending_reply_comment = p_comment, reply_update_time = now()
     where review_id = p_review_id;
    return 'pending';
  end if;
  update public.mock_google_reviews set reply_comment = p_comment, reply_update_time = now() where review_id = p_review_id;
  return coalesce(m.reply_mode, 'ok');
end $$;

-- 10. Privileges: the Edge Functions run these as the service role; the browser goes through api/approve and api/action.

revoke all on function public.approve_publication(text, uuid, text, uuid, text, integer),
  public.undo_publication(uuid, uuid), public.claim_publication(uuid),
  public.record_publication(uuid, text, text, text, text, text, jsonb, boolean), public.claim_publication_check(uuid),
  public.mock_google_reply(text, text)
  from public, anon, authenticated;
grant execute on function public.approve_publication(text, uuid, text, uuid, text, integer),
  public.undo_publication(uuid, uuid), public.claim_publication(uuid),
  public.record_publication(uuid, text, text, text, text, text, jsonb, boolean), public.claim_publication_check(uuid),
  public.mock_google_reply(text, text)
  to service_role;
revoke all on function private.publication_status_of(text, text), private.publication_state_of(text),
  private.publication_sync_state(), private.publication_check_delay(integer), private.produce_jobs()
  from public, anon, authenticated, service_role;
