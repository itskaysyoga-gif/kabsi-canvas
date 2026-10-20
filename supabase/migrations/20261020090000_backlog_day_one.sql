-- P0.3-10: clear the backlog on day one (K-66, K-101, K-36, R-18).
--
-- 1. private.detect_review_tasks also makes ONE task for the day-one backlog ("We found 23 unanswered reviews. Replies
--    are ready."), with how many are low risk, need a look, or need care, how many are still being prepared and how many
--    wait for a plan. The reviews keep their own tasks, marked backlog, so Home can fold them into the one card.
-- 2. public.approve_backlog(business, items) approves the low-risk replies the owner was shown, together, through the
--    one publication pipeline. The owner's consent covers exactly the list sent: each item names the review and the draft
--    version that was on screen, and anything that changed since is left out and reported. The approvals are spaced
--    12 seconds apart (5 a minute, K-36) and the list is written to the audit log.
-- 3. app_settings.full_backlog (off): the full backlog for a paid plan is switched on with the live Google switch
--    (R-18, P0.7-04). Until then a trial drafts the 10 most recent unanswered reviews and every other plan keeps the
--    earlier limit of 20.
--
-- No table, no column, nothing removed.

insert into public.app_settings (key, value) values ('full_backlog', 'off') on conflict (key) do nothing;

-- 1. The backlog card -----------------------------------------------------------------------------------------------

create or replace function private.detect_review_tasks(p_location uuid) returns integer
language plpgsql security definer set search_path = '' as $$
declare r record; v_keep text[] := '{}'; v_how jsonb := '{}'; v_made integer := 0; v_pub public.publications;
  v_state text; v_stars text; v_low integer; v_other integer; v_high integer; v_drafting integer; v_more integer;
  v_trial boolean; v_total integer;
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
        'google_refused', r.reply_state = 'rejected', 'backlog', r.is_backlog),
      jsonb_build_object('publish', 'review_reply', 'review_id', r.id),
      'review_reply:' || r.id, v_state, v_pub.id) then
      v_made := v_made + 1;
    end if;
  end loop;
  -- P0.3-10 (K-66, K-101): the day-one backlog is one card, not a card per old review. The reviews keep their own tasks
  -- (marked backlog, so Home folds them into this one and the Reviews badge and Nora still count them).
  select count(*) filter (where state = 'drafted' and risk = 'low' and coalesce(
           (select d.safety_ok from public.reply_drafts d where d.review_id = rv.id order by d.version desc limit 1), false)),
         count(*) filter (where state in ('drafted', 'blocked') and risk <> 'high'),
         count(*) filter (where state in ('drafted', 'blocked') and risk = 'high')
    into v_low, v_other, v_high
    from public.reviews rv where rv.location_id = p_location and rv.is_backlog;
  v_other := v_other - v_low;
  select count(*) filter (where state = 'new'),
         count(*) filter (where state = 'archived' and existing_reply is null)
    into v_drafting, v_more
    from public.reviews rv where rv.location_id = p_location and rv.is_backlog;
  v_total := v_low + v_other + v_high;
  v_trial := exists (select 1 from public.plans p where p.location_id = p_location and p.kind = 'trial'
                        and p.status = 'active' and p.ends_at > now())
             and not exists (select 1 from public.plans p where p.location_id = p_location and p.kind <> 'trial'
                        and p.status = 'active' and p.ends_at > now());
  if v_total > 0 then
    v_keep := v_keep || ('review_reply:backlog');
    if private.task_put(p_location, 'review_reply', 'backlog', p_location::text, 'recommended',
      'We found ' || v_total || ' unanswered ' || case when v_total = 1 then 'review' else 'reviews' end
        || '. Replies are ready.',
      case when v_high > 0 then 'Low-risk replies can be approved together after you see the list. Reviews that need care are never approved in bulk.'
           else 'Low-risk replies can be approved together after you see the list. The others you read one by one.' end
        || case when v_drafting > 0 then ' ' || v_drafting || ' more ' || case when v_drafting = 1 then 'is' else 'are' end || ' still being prepared.' else '' end
        || case when v_trial and v_more > 0 then ' Your free trial covers the ' || v_total || ' most recent; ' || v_more || ' more wait for your plan.' else '' end,
      case when v_low > 0 then 'Read the list, then approve the low-risk replies together.' else 'Read each reply and approve it.' end,
      jsonb_build_object('backlog_summary', true, 'total', v_total, 'low', v_low, 'other', v_other, 'high', v_high,
        'drafting', v_drafting, 'more_waiting', v_more, 'trial', v_trial),
      jsonb_build_object('publish', 'backlog_low'),
      'review_reply:backlog', 'open', null) then
      v_made := v_made + 1;
    end if;
  end if;
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


-- 2. Approve the shown low-risk replies together ------------------------------------------------------------------------

create function public.approve_backlog(p_location uuid, p_items jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); it jsonb; r public.reviews; d public.reply_drafts; v_i integer := 0;
  v_ok jsonb := '[]'::jsonb; v_skip jsonb := '[]'::jsonb; v_batch uuid := gen_random_uuid(); v_why text;
begin
  if v_uid is null then raise exception 'sign_in_required' using errcode = '42501'; end if;
  if not public.has_location_role(p_location, array['owner', 'manager']) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  -- K-16: the owner always; a manager only when the owner turned review replies on. Never a bulk approval for anyone else.
  if not private.may_approve(p_location, 'review_reply', v_uid, false) then
    raise exception 'not_allowed_to_approve' using errcode = '42501';
  end if;
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 50 then
    raise exception 'bad_items';
  end if;
  for it in select * from jsonb_array_elements(p_items) loop
    v_why := null;
    select * into r from public.reviews
     where id = (it ->> 'review_id')::uuid and location_id = p_location for update;
    if not found then
      v_why := 'not_found';
    elsif not r.is_backlog or r.state <> 'drafted' or r.risk <> 'low' then
      v_why := 'not_ready';
    else
      select * into d from public.reply_drafts where review_id = r.id order by version desc limit 1;
      if not found or not d.safety_ok or coalesce(trim(d.body), '') = '' then v_why := 'no_safe_draft';
      elsif d.version is distinct from (it ->> 'version')::integer then v_why := 'changed';
      end if;
    end if;
    if v_why is null then
      begin
        -- Spaced 12 seconds apart after the 10 second undo window: at most 5 replies a minute to one profile (K-36).
        perform public.approve_publication('review_reply', r.id, jsonb_build_object('text', trim(d.body)), v_uid,
          'dashboard', 10 + v_i * 12);
        v_ok := v_ok || to_jsonb(r.id);
        v_i := v_i + 1;
      exception when others then
        if sqlerrm like '%not_allowed_to_approve%' or sqlerrm like '%location_not_active%' then raise; end if;
        v_why := 'could_not_approve';
      end;
    end if;
    if v_why is not null then
      v_skip := v_skip || jsonb_build_object('review_id', it ->> 'review_id', 'why', v_why);
    end if;
  end loop;
  -- The list the owner agreed to, kept with the approval (append-only audit log, K-43).
  perform private.audit('user', v_uid, 'backlog_approved', p_location, 'backlog', v_batch::text, null,
    jsonb_build_object('reviews', v_ok, 'count', jsonb_array_length(v_ok), 'left_out', v_skip), 'dashboard', 'approved');
  return jsonb_build_object('batch', v_batch, 'approved', v_ok, 'left_out', v_skip,
    'spacing_seconds', 12);
end $$;
revoke execute on function public.approve_backlog(uuid, jsonb) from public, anon;
grant execute on function public.approve_backlog(uuid, jsonb) to authenticated;
