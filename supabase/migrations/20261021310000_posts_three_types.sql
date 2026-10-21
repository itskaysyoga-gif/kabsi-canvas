-- P0.5-02 part A: posts of three types, their checks and the month (K-24, K-80, K-116.3, K-116.5, K-116.12, K-102,
-- K-113.3, R-19). Additive: new columns, new functions, replaced functions with the same signatures; the posts-weekly
-- schedule is replaced by the care routine. Nothing is dropped.
--
-- A post is an Update (STANDARD), an Offer or an Event, up to 1,500 characters, one real photo of the business and one
-- button. The checks run in code in the content function and the care routine before the owner sees a post. A
-- prepared post has its local publishing time (publish_at); approving it, or the whole month, goes through the one
-- pipeline, and the publish job sends it at that time (the publication waits in Kabsi's own queue until then and can
-- be undone until it goes).

alter table public.gbp_posts
  add column if not exists topic_type text not null default 'STANDARD',
  add column if not exists event_title text,
  add column if not exists start_date date,
  add column if not exists end_date date,
  add column if not exists start_time time,
  add column if not exists end_time time,
  add column if not exists offer_terms text,
  add column if not exists coupon_code text,
  add column if not exists redeem_url text,
  add column if not exists photo_id uuid,
  add column if not exists publish_at timestamptz,
  add column if not exists recurs_monthly boolean not null default false,
  add column if not exists recurs_from uuid,
  add column if not exists checks jsonb not null default '[]';
alter table public.gbp_posts add constraint gbp_posts_topic_type_check check (topic_type in ('STANDARD', 'OFFER', 'EVENT'));
-- An Offer needs its dates and terms, an Event its title and dates (K-80); recurring only for a plain Update.
alter table public.gbp_posts add constraint gbp_posts_offer_fields check
  (topic_type <> 'OFFER' or (start_date is not null and end_date is not null and end_date >= start_date and length(trim(coalesce(offer_terms, ''))) > 0));
alter table public.gbp_posts add constraint gbp_posts_event_fields check
  (topic_type <> 'EVENT' or (start_date is not null and end_date is not null and end_date >= start_date and length(trim(coalesce(event_title, ''))) > 0));
alter table public.gbp_posts add constraint gbp_posts_recurs_check check (not recurs_monthly or topic_type = 'STANDARD');
create index if not exists gbp_posts_month_idx on public.gbp_posts (location_id, publish_at) where publish_at is not null;

-- How many posts a month Kabsi prepares: 2 by default, 1 or 4 by choice (K-24).
alter table public.locations add column if not exists posts_per_month smallint not null default 2;
alter table public.locations add constraint locations_posts_per_month_check check (posts_per_month in (1, 2, 4));

create or replace function public.set_post_cadence(p_location uuid, p_per_month integer) returns integer
language plpgsql security definer set search_path = '' as $$
begin
  if not public.has_location_role(p_location, array['owner', 'manager']) then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_per_month not in (1, 2, 4) then raise exception 'bad_cadence'; end if;
  update public.locations set posts_per_month = p_per_month where id = p_location;
  return p_per_month;
end $$;
revoke execute on function public.set_post_cadence(uuid, integer) from public, anon;
grant execute on function public.set_post_cadence(uuid, integer) to authenticated;

-- ─── The care routine's database side (service role). The month's posts with their local time.
create or replace function public.post_month_plan(p_location uuid, p_month text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'state', p.state, 'summary', coalesce(p.body, ''),
           'publish_local', to_char(p.publish_at at time zone l.time_zone, 'YYYY-MM-DD"T"HH24:MI')) order by p.publish_at), '[]')
    from public.gbp_posts p join public.locations l on l.id = p.location_id
   where p.location_id = p_location and p.state <> 'skipped' and p.publish_at is not null
     and to_char(p.publish_at at time zone l.time_zone, 'YYYY-MM') = p_month
$$;

-- One prepared Update from Kabsi at a local time.
create or replace function public.post_prepare(p_location uuid, p_publish_local text, p_summary text, p_photo uuid,
  p_checks jsonb default '[]') returns uuid
language plpgsql security definer set search_path = '' as $$
declare l public.locations; v_id uuid;
begin
  select * into l from public.locations where id = p_location;
  if not found or l.concierge then raise exception 'not_active'; end if;
  if length(trim(coalesce(p_summary, ''))) < 10 or length(p_summary) > 1500 then raise exception 'bad_post_text'; end if;
  insert into public.gbp_posts (location_id, owner_input, body, source, topic_type, photo_id, publish_at, checks)
  values (p_location, 'Prepared by Kabsi', trim(p_summary), 'auto', 'STANDARD', p_photo,
          (p_publish_local::timestamp at time zone l.time_zone), coalesce(p_checks, '[]'))
  returning id into v_id;
  return v_id;
end $$;

-- The one question when there is nothing true to say (K-24): one task a month, closed once a post is planned.
create or replace function public.post_question(p_location uuid, p_month text, p_question text) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if p_month !~ '^\d{4}-\d{2}$' then raise exception 'bad_month'; end if;
  return private.task_put(p_location, 'post', 'post_question', p_month, 'nice', left(p_question, 200),
    'Kabsi writes posts only from what is true about your business. Tell it one thing and it prepares the post for you to approve.',
    'Answer on Posts.', jsonb_build_object('month', p_month), null, 'post_question:' || p_month);
end $$;

revoke execute on function public.post_month_plan(uuid, text), public.post_prepare(uuid, text, text, uuid, jsonb),
  public.post_question(uuid, text, text) from public, anon, authenticated;
grant execute on function public.post_month_plan(uuid, text), public.post_prepare(uuid, text, text, uuid, jsonb),
  public.post_question(uuid, text, text) to service_role;

-- A post planned in a month answers that month's question.
create or replace function private.post_answers_question() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_month text;
begin
  if new.publish_at is null or new.state = 'skipped' then return new; end if;
  select to_char(new.publish_at at time zone l.time_zone, 'YYYY-MM') into v_month from public.locations l where l.id = new.location_id;
  update public.tasks set state = 'done', resolved_at = now(), snooze_until = null
   where location_id = new.location_id and dedupe_key = 'post_question:' || v_month
     and state in ('open', 'snoozed', 'approved', 'publishing');
  return new;
end $$;
revoke all on function private.post_answers_question() from public, anon, authenticated;
drop trigger if exists gbp_posts_answers_question on public.gbp_posts;
create trigger gbp_posts_answers_question after insert or update of publish_at on public.gbp_posts
  for each row execute function private.post_answers_question();

-- The care routine runs once a day as one job per business (guardrail 10), replacing the posts-weekly function.
create or replace function private.offer_care_posts() returns integer
language plpgsql security definer set search_path = '' as $$
declare n integer := 0; l record;
begin
  for l in select id from public.locations
            where status = 'active' and not concierge and not is_demo and auto_posts and disconnect_requested_at is null loop
    if public.enqueue_job('care_posts', l.id, 'care_posts:' || l.id || ':' || current_date, '{}'::jsonb, now()) is not null then
      n := n + 1;
    end if;
  end loop;
  return n;
end $$;
revoke all on function private.offer_care_posts() from public, anon, authenticated;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'kabsi_posts_weekly') then perform cron.unschedule('kabsi_posts_weekly'); end if;
  if exists (select 1 from cron.job where jobname = 'kabsi_care_posts') then perform cron.unschedule('kabsi_care_posts'); end if;
  perform cron.schedule('kabsi_care_posts', '13 6 * * *', 'select private.offer_care_posts()');
end $$;

-- Post tasks: a prepared month is one task ("2 posts for November are ready", Approve the month or one by one); a
-- post without a date keeps its own task, as before.
create or replace function private.detect_post_drafts(p_location uuid)
 returns integer
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare p record; v_keep text[] := '{}'; v_how jsonb; v_made integer := 0; v_tz text;
begin
  select coalesce(time_zone, 'UTC') into v_tz from public.locations where id = p_location;
  for p in select id, state from public.gbp_posts
            where location_id = p_location and state in ('draft', 'publishing') and (publish_at is null or state = 'publishing') loop
    v_keep := v_keep || ('post:' || p.id);
    if private.task_put(p_location, 'post', 'gbp_post', p.id::text, 'recommended',
      case when p.state = 'publishing' then 'Your Google post is on its way' else 'A Google post is ready for you' end,
      case when p.state = 'publishing' then 'You approved it. Kabsi sends it to Google at its time.'
           else 'Read it, change it if you like, and approve it. Nothing goes on Google without you.' end,
      case when p.state = 'draft' then 'Approve the post.' end,
      jsonb_build_object('post_id', p.id),
      jsonb_build_object('publish', 'local_post', 'post_id', p.id),
      'post:' || p.id, case when p.state = 'publishing' then 'publishing' else 'open' end) then
      v_made := v_made + 1;
    end if;
  end loop;
  for p in select to_char(publish_at at time zone v_tz, 'YYYY-MM') as month, count(*) as n,
                  to_char(min(publish_at) at time zone v_tz, 'FMMonth') as month_name
             from public.gbp_posts where location_id = p_location and state = 'draft' and publish_at is not null
            group by 1 loop
    v_keep := v_keep || ('post_month:' || p.month);
    if private.task_put(p_location, 'post', 'post_month', p.month, 'recommended',
      p.n || case when p.n = 1 then ' post for ' else ' posts for ' end || p.month_name || case when p.n = 1 then ' is ready' else ' are ready' end,
      'Kabsi prepared them from what is true about your business. Approve the month, or read them one by one.',
      'Approve the month.', jsonb_build_object('month', p.month, 'posts', p.n),
      jsonb_build_object('publish', 'local_post', 'month', p.month), 'post_month:' || p.month) then
      v_made := v_made + 1;
    end if;
  end loop;
  select coalesce(jsonb_object_agg(t.dedupe_key,
           case gp.state when 'posted' then 'done' when 'skipped' then 'rejected' when 'failed' then 'failed' else 'expired' end), '{}')
    into v_how
    from public.tasks t left join public.gbp_posts gp on gp.id::text = t.source_id
   where t.location_id = p_location and t.kind = 'post' and t.source_type in ('gbp_post', 'post_month')
     and t.state in ('open', 'snoozed', 'approved', 'publishing');
  -- Only this detector's own post tasks (a failed publish is detect_failed_publishes's; the monthly question closes
  -- when a post is planned that month). A month with nothing left to approve is done.
  update public.tasks t set state = case when t.source_type = 'post_month' then 'done' else coalesce(v_how ->> t.dedupe_key, 'expired') end,
    resolved_at = now(), resolved_by = auth.uid(), snooze_until = null
   where t.location_id = p_location and t.kind = 'post' and t.source_type in ('gbp_post', 'post_month')
     and t.state in ('open', 'snoozed', 'approved', 'publishing') and not (t.dedupe_key = any (v_keep));
  return v_made;
end $function$;

-- approve_publication: the local_post branch carries the type, its fields and its photo, and waits for publish_at.
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
