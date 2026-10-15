-- P0.3-05: one task engine (K-08, K-07, R-05, guardrail 5, D308 retired).
--
-- 1. public.tasks is the one owner queue. Each row is one thing an owner can act on, with its business, kind, the
--    record that created it (source_type, source_id), a priority (urgent, recommended, nice; no points, K-07), the
--    plain text shown on the card, the evidence, what would be published if approved, the approval policy, a state
--    (open, snoozed, approved, publishing, done, rejected, expired, failed), the timing and who closed it, and the
--    publication that carries it to Google (R-05). A dedupe key is unique per business while the task is live (open,
--    snoozed, approved, publishing), so a detector can run any number of times and still make one task.
-- 2. Tasks are made only by server-side detectors, never by the browser. Each detector is one small function for one
--    business that opens the tasks its condition calls for and closes the ones whose condition has gone:
--      detect_review_tasks       a review with a draft ready, blocked, high risk or refused by Google (review_reply)
--      detect_profile_changes    a difference Google Protection found (profile_change)
--      detect_knowledge_confirms two answers for one fact (knowledge_confirm; this wires the P0.3-01 stub)
--      detect_post_drafts        a Google post waiting for approval (post)
--      detect_photo_drafts       photos checked and ready (photo_batch, one per business)
--      detect_failed_publishes   a post, photo, holiday hours or profile fix that did not reach Google
--      detect_profile_gaps       a missing field or a missing piece of Business Knowledge (profile_gap)
--      detect_access_lost        Kabsi's Manager access is gone without the owner disconnecting (reconnect)
--      detect_expiring_plan      the plan ends within 7 days (billing)
--      detect_holidays           holiday ahead: a stub returning 0 until P0.5-03 (hours_confirm)
-- 3. public.run_task_detectors(business) runs all of them (service role only). The `detect_tasks` job runs it for one
--    business; private.produce_jobs() offers that job every 5 minutes per business once app_settings.task_detectors
--    is 'on' (it starts 'off' so the dispatcher deployed before this change never meets a job kind it does not know;
--    the session turns it on after the deploy). Statement triggers on the source tables run the matching detector at
--    once, so an approval, a new draft or an answered question shows on Home without waiting for the job.
-- 4. public.list_tasks(business) is the one reader for Home and Nora: the open tasks by priority, then age, with the
--    app page for each. public.task_action(task, later | skip) puts a task off for 3 or 30 days (owner or manager).
-- 5. The live profile_tasks rows move into tasks once (private.migrate_profile_tasks): a put-off task stays put off
--    until its date; the old "replies" and "shield" rows are not carried (the review tasks and Protection replace
--    them). profile_tasks_list, profile_task_action and profile_score stop being called by this change; they are
--    dropped by the contract file after the code is live, and the profile_tasks table only with Hussein's yes.
--
-- Additive: a new table, new functions, triggers and one app_settings row. Nothing is dropped and no row is removed.
-- The table's two foreign keys (to locations and publications) are in 20261015090010_task_engine_links.sql, which
-- Hussein runs in the SQL editor (it holds the cascade clauses).

-- 1. The table -------------------------------------------------------------------------------------------------------

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null,
  kind text not null check (kind in ('review_reply', 'profile_change', 'photo_batch', 'post', 'hours_confirm',
                                     'knowledge_confirm', 'profile_gap', 'reconnect', 'billing')),
  source_type text not null check (source_type ~ '^[a-z][a-z_]{1,40}$'),
  source_id text not null check (length(source_id) between 1 and 200),
  priority text not null check (priority in ('urgent', 'recommended', 'nice')),
  title text not null check (length(title) between 1 and 200),
  why text not null check (length(why) between 1 and 500),
  recommendation text check (length(recommendation) <= 300),
  evidence jsonb not null default '{}'::jsonb check (jsonb_typeof(evidence) = 'object'),
  proposed_action jsonb check (proposed_action is null or jsonb_typeof(proposed_action) = 'object'),
  approval_policy text not null default 'owner' check (approval_policy in ('owner', 'partner', 'dual')),
  state text not null default 'open'
    check (state in ('open', 'snoozed', 'approved', 'publishing', 'done', 'rejected', 'expired', 'failed')),
  due_at timestamptz,
  snooze_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid,
  dedupe_key text not null check (length(dedupe_key) between 3 and 200),
  publication_id uuid,
  constraint snoozed_has_date check (state <> 'snoozed' or snooze_until is not null),
  constraint resolved_has_time check ((state in ('done', 'rejected', 'expired', 'failed')) = (resolved_at is not null))
);
comment on table public.tasks is
  'P0.3-05 (K-08): the one owner queue. Rows are made and closed only by the detectors (private.detect_*).';
create unique index tasks_dedupe_live on public.tasks (location_id, dedupe_key)
  where state in ('open', 'snoozed', 'approved', 'publishing');
create index tasks_location_live on public.tasks (location_id, state) where state in ('open', 'snoozed', 'approved', 'publishing');
create index tasks_source on public.tasks (source_type, source_id);
create trigger tasks_updated before update on public.tasks for each row execute function public.set_updated_at();

alter table public.tasks enable row level security;
revoke all on public.tasks from public, anon, authenticated;
create policy members_read_tasks on public.tasks for select to authenticated
  using ((select public.is_member(location_id)) or (select public.is_staff()));
grant select on public.tasks to authenticated;

-- 2. Open and close ---------------------------------------------------------------------------------------------------

-- Open a task, or bring the live one with the same dedupe key up to date. A task the owner put off stays put off until
-- its date, unless it moves on (approved or publishing). Returns true when a new task was made.
create function private.task_put(p_location uuid, p_kind text, p_source_type text, p_source_id text, p_priority text,
  p_title text, p_why text, p_recommendation text, p_evidence jsonb, p_proposed jsonb, p_dedupe text,
  p_state text default 'open', p_publication uuid default null) returns boolean
language plpgsql security definer set search_path = '' as $$
declare v_new boolean;
begin
  insert into public.tasks as t (location_id, kind, source_type, source_id, priority, title, why, recommendation,
    evidence, proposed_action, dedupe_key, state, publication_id)
  values (p_location, p_kind, p_source_type, p_source_id, p_priority, p_title, p_why, p_recommendation,
    coalesce(p_evidence, '{}'::jsonb), p_proposed, p_dedupe, p_state, p_publication)
  on conflict (location_id, dedupe_key) where state in ('open', 'snoozed', 'approved', 'publishing') do update set
    priority = excluded.priority, title = excluded.title, why = excluded.why, recommendation = excluded.recommendation,
    evidence = excluded.evidence, proposed_action = excluded.proposed_action,
    publication_id = coalesce(excluded.publication_id, t.publication_id),
    state = case when t.state = 'snoozed' and t.snooze_until > now() and excluded.state = 'open' then 'snoozed'
                 else excluded.state end,
    snooze_until = case when t.state = 'snoozed' and t.snooze_until > now() and excluded.state = 'open' then t.snooze_until end
  where (t.priority, t.title, t.why, t.recommendation, t.evidence, t.proposed_action, t.state, t.publication_id)
        is distinct from (excluded.priority, excluded.title, excluded.why, excluded.recommendation, excluded.evidence,
                          excluded.proposed_action,
                          case when t.state = 'snoozed' and t.snooze_until > now() and excluded.state = 'open' then 'snoozed'
                               else excluded.state end,
                          coalesce(excluded.publication_id, t.publication_id))
  returning (xmax = 0) into v_new;
  return coalesce(v_new, false);
end $$;

-- Close the live tasks of one kind for a business whose dedupe key is not in p_keep. p_how maps a dedupe key to the
-- closing state (done, rejected, expired, failed); a key it does not name closes as p_default.
create function private.task_close_except(p_location uuid, p_kind text, p_keep text[], p_how jsonb default '{}'::jsonb,
  p_default text default 'done') returns integer
language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  update public.tasks t set state = coalesce(p_how ->> t.dedupe_key, p_default), resolved_at = now(),
    resolved_by = auth.uid(), snooze_until = null
   where t.location_id = p_location and t.kind = p_kind
     and t.state in ('open', 'snoozed', 'approved', 'publishing')
     and not (t.dedupe_key = any (coalesce(p_keep, '{}')));
  get diagnostics n = row_count;
  return n;
end $$;

-- The page in the app where the owner acts on a task (one place, read by Home and Nora).
create function private.task_path(p_kind text, p_source_id text) returns text
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
    when 'profile_gap' then case p_source_id
      when 'facts' then '/app/knowledge' when 'review_link' then '/app/cards' when 'posts' then '/app/posts'
      when 'photos' then '/app/photos' else '/app/shield' end
    else '/app' end
$$;

-- 3. Detectors --------------------------------------------------------------------------------------------------------

-- Reviews waiting for the owner. One task per review; no review text or name is copied (K-40 clears those after 30
-- days; the task keeps only the stars and the risk). Approved and publishing follow the review's publication.
create function private.detect_review_tasks(p_location uuid) returns integer
language plpgsql security definer set search_path = '' as $$
declare r record; v_keep text[] := '{}'; v_how jsonb := '{}'; v_made integer := 0; v_pub public.publications;
  v_state text; v_stars text;
begin
  for r in select * from public.reviews where location_id = p_location and state in ('drafted', 'blocked', 'publishing') loop
    v_keep := v_keep || ('review_reply:' || r.id);
    v_stars := r.star_rating || '-star review';
    v_pub := null; v_state := 'open';
    if r.state = 'publishing' then
      select * into v_pub from public.publications
       where target_type = 'review_reply' and target_id = r.id
         and state in ('approved', 'publishing', 'published', 'checking', 'verifying')
       order by created_at desc limit 1;
      v_state := case when v_pub.state = 'approved' then 'approved' else 'publishing' end;
    end if;
    if private.task_put(p_location, 'review_reply', 'review', r.id::text,
      case when r.risk = 'high' or r.reply_state = 'rejected' then 'urgent' else 'recommended' end,
      case
        when r.state = 'publishing' then 'Your reply to a ' || v_stars || ' is on its way'
        when r.reply_state = 'rejected' then 'Google did not show your reply to a ' || v_stars
        when r.risk = 'high' then 'A ' || v_stars || ' needs a little more care'
        when r.state = 'blocked' then 'A draft for a ' || v_stars || ' needs a look'
        else 'Reply ready for a ' || v_stars end,
      case
        when r.state = 'publishing' then 'You approved it. Kabsi is sending it to Google and checks that it shows.'
        when r.reply_state = 'rejected' then 'Google did not accept the reply. Open it to see why and approve a new one.'
        when r.risk = 'high' then 'Kabsi did not draft a reply. Open it to see what to check first.'
        when r.state = 'blocked' then 'Kabsi marked a problem in the draft. Open it to fix it before you approve.'
        else 'Kabsi prepared a reply. Read it, change it if you like, and approve it.' end,
      case when r.state = 'publishing' then null
           when r.risk = 'high' then 'Read the checklist before you reply.'
           else 'Approve the reply.' end,
      jsonb_build_object('review_id', r.id, 'stars', r.star_rating, 'risk', r.risk, 'review_state', r.state,
        'google_refused', r.reply_state = 'rejected'),
      jsonb_build_object('publish', 'review_reply', 'review_id', r.id),
      'review_reply:' || r.id, v_state, v_pub.id) then
      v_made := v_made + 1;
    end if;
  end loop;
  -- Closed: replied (by Kabsi or the owner) is done, skipped is rejected, archived or gone is expired.
  select coalesce(jsonb_object_agg(t.dedupe_key,
           case rv.state when 'posted' then 'done' when 'handled_offline' then 'done' when 'skipped' then 'rejected'
                         else 'expired' end), '{}')
    into v_how
    from public.tasks t left join public.reviews rv on rv.id::text = t.source_id
   where t.location_id = p_location and t.kind = 'review_reply' and t.state in ('open', 'snoozed', 'approved', 'publishing');
  perform private.task_close_except(p_location, 'review_reply', v_keep, v_how, 'expired');
  return v_made;
end $$;

create function private.field_label(p_field text) returns text
language sql immutable set search_path = '' as $$
  select case p_field
    when 'name' then 'business name' when 'main_category' then 'main category' when 'phone' then 'phone number'
    when 'regular_hours' then 'opening hours' when 'special_hours' then 'holiday hours'
    when 'open_status' then 'open or closed status' when 'map_pin' then 'map pin' when 'service_area' then 'service area'
    when 'attributes' then 'details'
    else replace(coalesce(p_field, 'details'), '_', ' ') end
$$;

-- Google Protection's open differences (K-19, K-20). The values stay on profile_changes, where K-40 clears Google's
-- after 30 days; the task names the field only.
create function private.detect_profile_changes(p_location uuid) returns integer
language plpgsql security definer set search_path = '' as $$
declare c record; v_keep text[] := '{}'; v_how jsonb; v_made integer := 0;
begin
  for c in select * from public.profile_changes where location_id = p_location and status in ('detected', 'awaiting_review') loop
    v_keep := v_keep || ('profile_change:' || c.id);
    if private.task_put(p_location, 'profile_change', 'profile_change', c.id::text, c.severity,
      'Your ' || private.field_label(c.field) || ' changed on Google',
      'Google shows something different from what you approved. See what changed and choose what stays.',
      case c.recommend when 'accept' then 'Kabsi thinks Google is right.' when 'reject' then 'Kabsi suggests keeping your information.' end,
      jsonb_build_object('profile_change_id', c.id, 'field', c.field, 'source', c.source),
      null, 'profile_change:' || c.id) then
      v_made := v_made + 1;
    end if;
  end loop;
  select coalesce(jsonb_object_agg(t.dedupe_key,
           case when pc.id is null then 'expired' when pc.status = 'failed' then 'failed'
                when pc.status in ('expired', 'superseded') then 'expired' else 'done' end), '{}')
    into v_how
    from public.tasks t left join public.profile_changes pc on pc.id::text = t.source_id
   where t.location_id = p_location and t.kind = 'profile_change' and t.state in ('open', 'snoozed', 'approved', 'publishing');
  perform private.task_close_except(p_location, 'profile_change', v_keep, v_how, 'expired');
  return v_made;
end $$;

-- Two answers for one fact (K-11, P0.3-01). The question and both values stay on knowledge_confirms, shown on About
-- your business; the task is the queue item.
create function private.detect_knowledge_confirms(p_location uuid) returns integer
language plpgsql security definer set search_path = '' as $$
declare q record; v_keep text[] := '{}'; v_made integer := 0;
begin
  for q in select * from public.knowledge_confirms where location_id = p_location and state = 'open' loop
    v_keep := v_keep || ('knowledge_confirm:' || q.id);
    if private.task_put(p_location, 'knowledge_confirm', 'knowledge_confirm', q.id::text, 'recommended',
      'Which ' || replace(q.key, '_', ' ') || ' is right?',
      'Kabsi found two different answers. It leaves this out of replies until you choose.',
      'Choose the right answer on About your business.',
      jsonb_build_object('knowledge_confirm_id', q.id, 'key', q.key, 'proposed_source', q.proposed_source),
      null, 'knowledge_confirm:' || q.id) then
      v_made := v_made + 1;
    end if;
  end loop;
  perform private.task_close_except(p_location, 'knowledge_confirm', v_keep, '{}', 'done');
  return v_made;
end $$;

-- Google posts waiting for approval, one task each.
create function private.detect_post_drafts(p_location uuid) returns integer
language plpgsql security definer set search_path = '' as $$
declare p record; v_keep text[] := '{}'; v_how jsonb; v_made integer := 0;
begin
  for p in select id, state from public.gbp_posts where location_id = p_location and state in ('draft', 'publishing') loop
    v_keep := v_keep || ('post:' || p.id);
    if private.task_put(p_location, 'post', 'gbp_post', p.id::text, 'recommended',
      case when p.state = 'publishing' then 'Your Google post is on its way' else 'A Google post is ready for you' end,
      case when p.state = 'publishing' then 'You approved it. Kabsi is sending it to Google.'
           else 'Read it, change it if you like, and approve it. Nothing goes on Google without you.' end,
      case when p.state = 'draft' then 'Approve the post.' end,
      jsonb_build_object('post_id', p.id),
      jsonb_build_object('publish', 'local_post', 'post_id', p.id),
      'post:' || p.id, case when p.state = 'publishing' then 'publishing' else 'open' end) then
      v_made := v_made + 1;
    end if;
  end loop;
  select coalesce(jsonb_object_agg(t.dedupe_key,
           case gp.state when 'posted' then 'done' when 'skipped' then 'rejected' when 'failed' then 'failed' else 'expired' end), '{}')
    into v_how
    from public.tasks t left join public.gbp_posts gp on gp.id::text = t.source_id
   where t.location_id = p_location and t.kind = 'post' and t.source_type = 'gbp_post'
     and t.state in ('open', 'snoozed', 'approved', 'publishing');
  -- Only this detector's own post tasks (a failed publish is detect_failed_publishes's).
  update public.tasks t set state = coalesce(v_how ->> t.dedupe_key, 'expired'), resolved_at = now(),
    resolved_by = auth.uid(), snooze_until = null
   where t.location_id = p_location and t.kind = 'post' and t.source_type = 'gbp_post'
     and t.state in ('open', 'snoozed', 'approved', 'publishing') and not (t.dedupe_key = any (v_keep));
  return v_made;
end $$;

-- Photos checked and ready to post: one task per business for the whole batch.
create function private.detect_photo_drafts(p_location uuid) returns integer
language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  select count(*) into n from public.photos where location_id = p_location and state = 'draft';
  if n > 0 then
    return case when private.task_put(p_location, 'photo_batch', 'location', p_location::text, 'recommended',
      n || case when n = 1 then ' photo is' else ' photos are' end || ' checked and ready to post',
      'Look them over and approve the ones you want on Google.',
      'Approve the photos.',
      jsonb_build_object('photos', n), jsonb_build_object('publish', 'photo', 'count', n),
      'photo_batch:' || p_location) then 1 else 0 end;
  end if;
  update public.tasks set state = 'done', resolved_at = now(), resolved_by = auth.uid(), snooze_until = null
   where location_id = p_location and kind = 'photo_batch' and source_type = 'location'
     and state in ('open', 'snoozed', 'approved', 'publishing');
  return 0;
end $$;

-- A publication that did not reach Google (posts, photos, holiday hours, Protection put-backs). A refused review
-- reply goes back to the owner as a review task (detect_review_tasks), so it is not repeated here. Closed when a
-- newer publication for the same item exists, or after 14 days.
create function private.detect_failed_publishes(p_location uuid) returns integer
language plpgsql security definer set search_path = '' as $$
declare p record; v_keep text[] := '{}'; v_made integer := 0; v_kind text;
begin
  for p in
    select pb.* from public.publications pb
     where pb.location_id = p_location and pb.state in ('failed', 'rejected') and pb.target_type <> 'review_reply'
       and pb.updated_at > now() - interval '14 days'
       and not exists (select 1 from public.publications n where n.target_type = pb.target_type and n.target_id = pb.target_id
                         and n.created_at > pb.created_at and n.state <> 'cancelled')
  loop
    v_kind := case p.target_type when 'local_post' then 'post' when 'photo' then 'photo_batch'
                                 when 'special_hours' then 'hours_confirm' else 'profile_change' end;
    v_keep := v_keep || ('publication:' || p.id);
    if private.task_put(p_location, v_kind, 'publication', p.id::text, 'urgent',
      case v_kind when 'post' then 'Your post did not reach Google'
                  when 'photo_batch' then 'A photo did not reach Google'
                  when 'hours_confirm' then 'Your holiday hours did not reach Google'
                  else 'Your profile fix did not reach Google' end,
      'Nothing changed on Google. Open it to see why and try again.',
      'Try again, or tell Kabsi what to change.',
      jsonb_build_object('publication_id', p.id, 'target_type', p.target_type, 'target_id', p.target_id),
      null, 'publication:' || p.id, 'open', p.id) then
      v_made := v_made + 1;
    end if;
  end loop;
  update public.tasks t set
    state = case when exists (select 1 from public.publications n join public.publications o on o.id::text = t.source_id
                               where n.target_type = o.target_type and n.target_id = o.target_id
                                 and n.created_at > o.created_at and n.state <> 'cancelled')
                 then 'done' else 'expired' end,
    resolved_at = now(), resolved_by = auth.uid(), snooze_until = null
   where t.location_id = p_location and t.source_type = 'publication'
     and t.state in ('open', 'snoozed', 'approved', 'publishing') and not (t.dedupe_key = any (v_keep));
  return v_made;
end $$;

-- Missing fields and missing Business Knowledge (K-07: no points; each gap is a task with a priority). Replaces the
-- score items of profile_score: facts, profile basics, review link, photos and weekly posts (the last two not for
-- concierge businesses, D306).
create function private.detect_profile_gaps(p_location uuid) returns integer
language plpgsql security definer set search_path = '' as $$
declare l public.locations; v_keep text[] := '{}'; v_made integer := 0; v_core integer; v_missing text := '';
  v_profile jsonb; v_cards integer; v_taps integer; v_photos integer; v_last_post timestamptz; v_open_posts integer;
begin
  select * into l from public.locations where id = p_location;
  if not found or l.status <> 'active' then
    perform private.task_close_except(p_location, 'profile_gap', '{}', '{}', 'expired');
    return 0;
  end if;

  -- Business Knowledge: six facts that make replies and posts specific.
  select count(distinct f.key) into v_core from public.knowledge_facts f
   where f.location_id = l.id and f.superseded_by is null and f.status = 'verified' and f.slot not like 'profile.%'
     and f.key in ('description', 'service', 'hours_note', 'contact', 'signature', 'phrase_use');
  if v_core < 6 then
    v_keep := v_keep || 'profile_gap:facts'::text;
    if private.task_put(l.id, 'profile_gap', 'profile_gap', 'facts', 'recommended',
      'Tell Kabsi ' || (6 - v_core) || ' more ' || case when 6 - v_core = 1 then 'thing' else 'things' end || ' about your business',
      'Replies and posts only use facts you confirmed, so the more you add, the more they sound like you.',
      'Add them on About your business.', jsonb_build_object('have', v_core, 'of', 6), null, 'profile_gap:facts') then
      v_made := v_made + 1;
    end if;
  end if;

  -- Profile basics Google shows (the profile facts Google Protection keeps), only once Kabsi has read the profile.
  select jsonb_object_agg(f.key, f.value ->> 'display') into v_profile from public.knowledge_facts f
   where f.location_id = l.id and f.slot like 'profile.%' and f.superseded_by is null;
  if v_profile is not null and not l.concierge then
    if nullif(trim(coalesce(v_profile ->> 'phone', '')), '') is null then v_missing := v_missing || 'phone number, '; end if;
    if nullif(trim(coalesce(v_profile ->> 'website', '')), '') is null then v_missing := v_missing || 'website, '; end if;
    if nullif(trim(coalesce(v_profile ->> 'main_category', '')), '') is null then v_missing := v_missing || 'main category, '; end if;
    if nullif(trim(coalesce(v_profile ->> 'regular_hours', '')), '') is null then v_missing := v_missing || 'opening hours, '; end if;
    if v_missing <> '' then
      v_missing := left(v_missing, length(v_missing) - 2);
      v_keep := v_keep || 'profile_gap:basics'::text;
      if private.task_put(l.id, 'profile_gap', 'profile_gap', 'basics', 'recommended',
        'Complete your profile basics', 'Missing on Google: ' || v_missing || '. Complete details help customers reach you.',
        'Add what is missing. You approve the change before it goes to Google.',
        jsonb_build_object('missing', v_missing), null, 'profile_gap:basics') then
        v_made := v_made + 1;
      end if;
    end if;
  end if;

  -- Review link: set up and opened by a real person in the last 30 days.
  select count(*) into v_cards from public.cards where location_id = l.id and status = 'active';
  select count(*) into v_taps from public.taps where location_id = l.id and not is_bot and created_at >= now() - interval '30 days';
  if v_taps = 0 then
    v_keep := v_keep || 'profile_gap:review_link'::text;
    if private.task_put(l.id, 'profile_gap', 'profile_gap', 'review_link', 'nice',
      case when v_cards > 0 then 'Share your review link with a customer' else 'Set up your review link' end,
      'A short link and QR code make it easy for customers to leave a review. Ask everyone, never only the happy ones, and never offer a reward.',
      null, jsonb_build_object('cards', v_cards), null, 'profile_gap:review_link') then
      v_made := v_made + 1;
    end if;
  end if;

  if not l.concierge then
    select count(*) into v_photos from public.photos where location_id = l.id and state in ('draft', 'posted') and suitable is not false;
    if v_photos < 10 then
      v_keep := v_keep || 'profile_gap:photos'::text;
      if private.task_put(l.id, 'profile_gap', 'profile_gap', 'photos', 'nice', 'Add photos of your business',
        'Photos help people see what to expect. Start with the outside, the inside, your team and what you sell.',
        null, jsonb_build_object('have', v_photos), null, 'profile_gap:photos') then
        v_made := v_made + 1;
      end if;
    end if;

    select max(updated_at) into v_last_post from public.gbp_posts where location_id = l.id and state = 'posted';
    select count(*) into v_open_posts from public.gbp_posts where location_id = l.id and state in ('draft', 'publishing');
    if v_open_posts = 0 and (v_last_post is null or v_last_post < now() - interval '14 days') then
      v_keep := v_keep || 'profile_gap:posts'::text;
      if private.task_put(l.id, 'profile_gap', 'profile_gap', 'posts', 'nice', 'Publish a post this week',
        'A post keeps your profile current. Google shows each post for a limited time.',
        null, jsonb_build_object('last_post_at', v_last_post), null, 'profile_gap:posts') then
        v_made := v_made + 1;
      end if;
    end if;
  end if;

  perform private.task_close_except(l.id, 'profile_gap', v_keep, '{}', 'done');
  return v_made;
end $$;

-- Kabsi's Manager access is gone and the owner did not ask for it (an owner's disconnect is their choice, P0.2-02).
create function private.detect_access_lost(p_location uuid) returns integer
language plpgsql security definer set search_path = '' as $$
declare v_lost boolean;
begin
  select g.access_state = 'lost' and l.disconnect_requested_at is null and l.status in ('active', 'paused')
    into v_lost
    from public.google_connections g join public.locations l on l.id = g.location_id where g.location_id = p_location;
  if coalesce(v_lost, false) then
    return case when private.task_put(p_location, 'reconnect', 'google_connection', p_location::text, 'urgent',
      'Kabsi lost access to your Google profile',
      'Kabsi cannot read new reviews or check your profile until it is a Manager again.',
      'Add Kabsi as a Manager again. The steps take about two minutes.',
      jsonb_build_object('access_state', 'lost'), null, 'reconnect:' || p_location) then 1 else 0 end;
  end if;
  perform private.task_close_except(p_location, 'reconnect', '{}', '{}', 'done');
  return 0;
end $$;

-- The paid time ends within 7 days (urgent within 2). Partner plans are billed to the partner, not the owner.
create function private.detect_expiring_plan(p_location uuid) returns integer
language plpgsql security definer set search_path = '' as $$
declare v_until timestamptz; v_partner boolean; v_days integer;
begin
  select max(ends_at), bool_or(kind = 'partner') into v_until, v_partner from public.plans
   where location_id = p_location and status = 'active' and (ends_at is null or ends_at > now());
  if v_until is not null and not coalesce(v_partner, false) and v_until <= now() + interval '7 days'
     and exists (select 1 from public.locations where id = p_location and status = 'active') then
    v_days := greatest(ceil(extract(epoch from v_until - now()) / 86400)::integer, 0);
    return case when private.task_put(p_location, 'billing', 'location', p_location::text,
      case when v_days <= 2 then 'urgent' else 'recommended' end,
      'Your plan ends in ' || v_days || case when v_days = 1 then ' day' else ' days' end,
      'Renew to keep replies and profile checks going.', 'Renew your plan.',
      jsonb_build_object('ends_at', v_until), null, 'billing:' || p_location) then 1 else 0 end;
  end if;
  perform private.task_close_except(p_location, 'billing', '{}', '{}',
    case when v_until is null then 'expired' else 'done' end);
  return 0;
end $$;

-- Holiday ahead: the hours editor and holiday calendar come with P0.5-03. Until then nothing is detected.
create function private.detect_holidays(p_location uuid) returns integer
language sql stable set search_path = '' as $$ select 0 $$;

-- All detectors for one business. Service role only (the detect_tasks job).
create function public.run_task_detectors(p_location uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.locations where id = p_location) then return null; end if;
  return jsonb_build_object(
    'review_reply', private.detect_review_tasks(p_location),
    'profile_change', private.detect_profile_changes(p_location),
    'knowledge_confirm', private.detect_knowledge_confirms(p_location),
    'post', private.detect_post_drafts(p_location),
    'photo_batch', private.detect_photo_drafts(p_location),
    'failed_publish', private.detect_failed_publishes(p_location),
    'profile_gap', private.detect_profile_gaps(p_location),
    'reconnect', private.detect_access_lost(p_location),
    'billing', private.detect_expiring_plan(p_location),
    'holiday', private.detect_holidays(p_location));
end $$;
revoke execute on function public.run_task_detectors(uuid) from public, anon, authenticated;
grant execute on function public.run_task_detectors(uuid) to service_role;

-- 4. Right away on change ---------------------------------------------------------------------------------------------

-- Runs the detector that belongs to the changed table once per business touched by the statement. A detector error
-- never stops the owner's action or the job that changed the row: it is logged, and the 5 minute job runs it again
-- (and reports a failure there).
create function private.tasks_on_change() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_loc uuid;
begin
  for v_loc in select distinct location_id from changed where location_id is not null loop
    begin
      case tg_table_name
        when 'reviews' then perform private.detect_review_tasks(v_loc);
        when 'profile_changes' then perform private.detect_profile_changes(v_loc);
        when 'knowledge_confirms' then perform private.detect_knowledge_confirms(v_loc);
        when 'gbp_posts' then perform private.detect_post_drafts(v_loc); perform private.detect_failed_publishes(v_loc);
        when 'photos' then perform private.detect_photo_drafts(v_loc); perform private.detect_failed_publishes(v_loc);
        when 'publications' then perform private.detect_failed_publishes(v_loc);
        when 'google_connections' then perform private.detect_access_lost(v_loc);
        else null;
      end case;
    exception when others then
      raise warning 'task detector for % on % failed: %', v_loc, tg_table_name, sqlerrm;
    end;
  end loop;
  return null;
end $$;

do $$
declare t text;
begin
  foreach t in array array['reviews', 'profile_changes', 'knowledge_confirms', 'gbp_posts', 'photos', 'publications',
                           'google_connections'] loop
    execute format('create trigger tasks_on_insert after insert on public.%I referencing new table as changed
                    for each statement execute function private.tasks_on_change()', t);
    execute format('create trigger tasks_on_update after update on public.%I referencing new table as changed
                    for each statement execute function private.tasks_on_change()', t);
  end loop;
end $$;

-- 5. Read and put off -------------------------------------------------------------------------------------------------

-- The one reader for Home and Nora: open tasks by priority, then age, each with its page; and how many are put off.
create function public.list_tasks(p_location uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not (public.is_member(p_location) or public.is_staff()) then raise exception 'forbidden' using errcode = '42501'; end if;
  return jsonb_build_object(
    'tasks', coalesce((
      select jsonb_agg(jsonb_build_object('id', t.id, 'kind', t.kind, 'priority', t.priority, 'title', t.title,
               'why', t.why, 'recommendation', t.recommendation, 'path', private.task_path(t.kind, t.source_id),
               'evidence', t.evidence, 'created_at', t.created_at)
             order by case t.priority when 'urgent' then 1 when 'recommended' then 2 else 3 end, t.created_at, t.id)
        from public.tasks t
       where t.location_id = p_location
         and (t.state = 'open' or (t.state = 'snoozed' and t.snooze_until <= now()))), '[]'::jsonb),
    'snoozed', (select count(*) from public.tasks t where t.location_id = p_location and t.state = 'snoozed'
                  and t.snooze_until > now()));
end $$;

-- Later (3 days) or skip (30 days). The owner or a manager; the item itself is untouched.
create function public.task_action(p_task uuid, p_action text) returns void
language plpgsql security definer set search_path = '' as $$
declare t public.tasks; v_until timestamptz;
begin
  if auth.uid() is null then raise exception 'sign_in_required' using errcode = '42501'; end if;
  select * into t from public.tasks where id = p_task for update;
  if not found or not public.has_location_role(t.location_id, array['owner', 'manager']) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_action not in ('later', 'skip') then raise exception 'action: later or skip'; end if;
  if t.state not in ('open', 'snoozed') then raise exception 'not_open'; end if;
  v_until := now() + case when p_action = 'later' then interval '3 days' else interval '30 days' end;
  update public.tasks set state = 'snoozed', snooze_until = v_until where id = t.id;
  perform private.audit('user', auth.uid(), 'task_snoozed', t.location_id, 'tasks', t.id::text, null,
    jsonb_build_object('kind', t.kind, 'until', v_until), 'dashboard', p_action);
end $$;

revoke execute on function public.list_tasks(uuid), public.task_action(uuid, text) from public, anon;
grant execute on function public.list_tasks(uuid), public.task_action(uuid, text) to authenticated;

-- 6. The job and its producer -----------------------------------------------------------------------------------------

insert into public.app_settings (key, value) values ('task_detectors', 'off') on conflict (key) do nothing;

create or replace function private.produce_jobs() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_sync integer; v_draft integer; v_notify integer; v_protect integer; v_steps integer := 0; v_live boolean;
  v_publish integer; v_reconcile integer; v_stuck integer; v_tasks integer := 0;
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

  -- Owner emails: a business with drafted or blocked reviews not yet emailed, when one is due now (D220 adapted to K-13: medium and high right away, D221).
  with added as (
    insert into public.jobs (kind, location_id, dedupe_key)
    select 'notify_owner', l.id, 'notify_owner:' || l.id
      from public.locations l
     where l.status = 'active' and l.google_location_id is not null
       and (l.emails_paused_until is null or l.emails_paused_until <= now())
       and exists (select 1 from public.reviews r
                    where r.location_id = l.id and r.state in ('drafted', 'blocked') and r.notified_at is null
                      and (r.is_backlog or r.star_rating <= 3 or r.risk <> 'low'
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

  -- P0.3-05: the task detectors, once every 5 minutes per business that is not disconnected (the time-based ones:
  -- profile gaps, lost access, plan ending; and a safety net for the rest, which also run at once on change).
  if coalesce((select value from public.app_settings where key = 'task_detectors'), 'off') = 'on' then
    with added as (
      insert into public.jobs (kind, location_id, dedupe_key)
      select 'detect_tasks', l.id, 'detect_tasks:' || l.id
        from public.locations l
       where l.status in ('active', 'paused') and l.disconnect_requested_at is null
         and not exists (select 1 from public.jobs j where j.location_id = l.id and j.kind = 'detect_tasks'
                           and j.created_at > now() - interval '5 minutes')
      on conflict (dedupe_key) where dedupe_key is not null and state in ('pending', 'running', 'retrying') do nothing
      returning 1
    )
    select count(*) into v_tasks from added;
  end if;

  return jsonb_build_object('sync_reviews', v_sync, 'draft_reply', v_draft, 'notify_owner', v_notify,
    'protection_check', v_protect, 'steps', v_steps, 'publish', v_publish, 'reconcile_publication', v_reconcile,
    'stuck_publications', v_stuck, 'detect_tasks', v_tasks);
end $$;

-- 7. Move the profile_tasks rows --------------------------------------------------------------------------------------

-- One time, and safe to run again: each live score task becomes a profile_gap task with the same text and, when the
-- owner had put it off, the same date. "replies" (now one task per review) and "shield" (Protection is always on) are
-- not carried. The detectors then keep each gap up to date or close it.
create function private.migrate_profile_tasks() returns integer
language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  with moved as (
    insert into public.tasks (location_id, kind, source_type, source_id, priority, title, why, evidence, dedupe_key,
      state, snooze_until, created_at)
    select p.location_id, 'profile_gap', 'profile_gap', p.key,
           case when p.key in ('facts', 'basics') then 'recommended' else 'nice' end,
           left(p.title, 200), left(p.why, 500), jsonb_build_object('from', 'profile_tasks'), 'profile_gap:' || p.key,
           case when p.state in ('later', 'skipped') and p.snooze_until > now() then 'snoozed' else 'open' end,
           case when p.state in ('later', 'skipped') and p.snooze_until > now() then p.snooze_until end,
           p.created_at
      from public.profile_tasks p
     where p.state in ('open', 'later', 'skipped') and p.key in ('facts', 'basics', 'review_link', 'photos', 'posts')
    on conflict (location_id, dedupe_key) where state in ('open', 'snoozed', 'approved', 'publishing') do nothing
    returning 1
  )
  select count(*) into n from moved;
  return n;
end $$;

select private.migrate_profile_tasks();

-- Every business once now, so the queue is full before Home reads it.
select public.run_task_detectors(id) from public.locations;

-- The helpers, detectors and the move run only inside the functions above, the triggers and the jobs.
revoke execute on function private.task_put(uuid, text, text, text, text, text, text, text, jsonb, jsonb, text, text, uuid),
  private.task_close_except(uuid, text, text[], jsonb, text), private.task_path(text, text), private.field_label(text),
  private.detect_review_tasks(uuid), private.detect_profile_changes(uuid), private.detect_knowledge_confirms(uuid),
  private.detect_post_drafts(uuid), private.detect_photo_drafts(uuid), private.detect_failed_publishes(uuid),
  private.detect_profile_gaps(uuid), private.detect_access_lost(uuid), private.detect_expiring_plan(uuid),
  private.detect_holidays(uuid), private.tasks_on_change(), private.migrate_profile_tasks()
  from public, anon, authenticated, service_role;
