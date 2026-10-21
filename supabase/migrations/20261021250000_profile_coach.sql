-- P0.8-09 part A: the Profile Coach checklist and its tasks (K-136, K-143, K-83, R-38).
--
-- The Growth agent reads, once a week, four things about a business's Google profile that Kabsi did not keep until now:
-- how long the description is, how many extra categories it has, how many attributes are set. Only the three numbers are
-- stored (never Google's text), one row per business, replaced by the next read. Together with Business Knowledge they
-- make a checklist: what is missing and why. Every gap becomes a profile_gap task the owner approves one by one, so the
-- changes themselves (part B) all go through the one publication pipeline.
--
--   coach_profile            the three numbers and where they came from (live Google, or the mock until Gate A)
--   private.coach_status     the checklist: one row per item, done / todo / unknown / later, from the data above
--   public.coach_checklist   what the app and the free tools show (members only; Essentials and Pro; K-126)
--   private.coach_tasks      the tasks for the items that are todo (called by detect_profile_gaps)
--   private.feature_plan     the plan question feature_access answers, without the member check, for the detectors
--
-- A number that came from the mock is shown but never creates a task (it would be a task about an example): only a live
-- read, or the demo workspace, does. Additive only: one table, new functions, detect_profile_gaps and task_path replaced,
-- feature_access rewritten on top of feature_plan with the same answers. Nothing is dropped.

create table public.coach_profile (
  location_id uuid primary key,
  description_length integer not null check (description_length between 0 and 100000),
  additional_categories integer not null check (additional_categories between 0 and 100),
  attributes integer not null check (attributes between 0 and 1000),
  source text not null check (source in ('mock', 'live')),
  read_at timestamptz not null default now()
);
alter table public.coach_profile enable row level security;
revoke all on public.coach_profile from public, anon, authenticated;
grant select, insert, update on public.coach_profile to service_role;

-- 1. The plan question, for the detectors -------------------------------------------------------------------------------

create function private.feature_plan(p_location uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_org uuid; v_state text; v_plan text := 'none'; v_sub text;
begin
  select organization_id into v_org from public.locations where id = p_location;
  if v_org is null then raise exception 'unknown_location'; end if;
  v_state := private.entitlements(v_org, p_location) ->> 'state';
  if v_state in ('demo', 'concierge', 'trial', 'partner') then
    v_plan := 'pro';
  elsif v_state = 'paid' then
    select s.plan into v_sub from public.subscriptions s
     where s.organization_id = v_org and s.plan <> 'free'
       and ((s.state = 'active' and (s.current_period_end is null or s.current_period_end > now()))
         or (s.state = 'past_due' and s.current_period_end + interval '7 days' > now()))
     order by s.current_period_end desc nulls first limit 1;
    v_plan := case when v_sub = 'essentials' then 'essentials' else 'pro' end;
  end if;
  return jsonb_build_object('state', v_state, 'plan', v_plan, 'essentials', v_plan in ('essentials', 'pro'), 'pro', v_plan = 'pro');
end $$;
revoke all on function private.feature_plan(uuid) from public, anon, authenticated;

create or replace function public.feature_access(p_location uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.locations where id = p_location) then raise exception 'unknown_location'; end if;
  if not (coalesce(auth.role(), 'service_role') = 'service_role' or public.is_staff() or public.is_member(p_location)) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return private.feature_plan(p_location);
end $$;
revoke all on function public.feature_access(uuid) from public, anon;
grant execute on function public.feature_access(uuid) to authenticated, service_role;

-- 2. The checklist ------------------------------------------------------------------------------------------------------

-- One row per item, always in this order. Statuses:
--   done     nothing to do
--   todo     missing, and Kabsi knows it
--   unknown  Kabsi has not read it from a live profile yet (or only the mock), so it asserts nothing
--   later    waits for something else (a website to tag, the photo engine)
create function private.coach_status(p_location uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare l public.locations; c public.coach_profile; v_known boolean; v_site text; v_services boolean; v_area boolean; v_items jsonb := '[]';
begin
  select * into l from public.locations where id = p_location;
  if not found then return '[]'::jsonb; end if;
  select * into c from public.coach_profile where location_id = p_location;
  v_known := c.location_id is not null and (c.source = 'live' or l.is_demo);

  v_items := v_items || jsonb_build_object('id', 'description', 'status',
    case when not v_known then 'unknown' when c.description_length < 250 then 'todo' else 'done' end,
    'detail', case when c.location_id is null then '{}'::jsonb else jsonb_build_object('length', c.description_length, 'example', not v_known) end);

  v_items := v_items || jsonb_build_object('id', 'categories', 'status',
    case when not v_known then 'unknown' when c.additional_categories = 0 then 'todo' else 'done' end,
    'detail', case when c.location_id is null then '{}'::jsonb else jsonb_build_object('count', c.additional_categories, 'example', not v_known) end);

  select exists (select 1 from public.knowledge_facts f
                  where f.location_id = p_location and f.superseded_by is null and f.status = 'verified'
                    and f.slot not like 'profile.%' and f.key in ('service', 'product')) into v_services;
  v_items := v_items || jsonb_build_object('id', 'services', 'status', case when v_services then 'done' else 'todo' end, 'detail', '{}'::jsonb);

  v_items := v_items || jsonb_build_object('id', 'attributes', 'status',
    case when not v_known then 'unknown' when c.attributes = 0 then 'todo' else 'done' end,
    'detail', case when c.location_id is null then '{}'::jsonb else jsonb_build_object('count', c.attributes, 'example', not v_known) end);

  -- The photo engine (P0.5-01) counts the types; until it exists the row says so and asserts nothing.
  v_items := v_items || jsonb_build_object('id', 'photos', 'status', 'later', 'detail', jsonb_build_object('waits', 'photo_engine'));

  -- Service area: only the owner's own answer settles it; nothing is assumed for a business that has not said.
  select exists (select 1 from public.knowledge_facts f
                  where f.location_id = p_location and f.superseded_by is null and f.status = 'verified' and f.key = 'service_area') into v_area;
  v_items := v_items || jsonb_build_object('id', 'service_area', 'status', case when v_area then 'done' else 'unknown' end,
    'detail', case when v_area then '{}'::jsonb else jsonb_build_object('question', true) end);

  select nullif(trim(coalesce(f.value ->> 'display', '')), '') into v_site from public.knowledge_facts f
   where f.location_id = p_location and f.slot = 'profile.website' and f.superseded_by is null;
  v_items := v_items || jsonb_build_object('id', 'website_tracking', 'status',
    case when v_site is null then 'later' when v_site ilike '%utm\_source=%' then 'done' else 'todo' end,
    'detail', case when v_site is null then jsonb_build_object('waits', 'website') else '{}'::jsonb end);
  return v_items;
end $$;
revoke all on function private.coach_status(uuid) from public, anon, authenticated;

-- What the app shows. Essentials and Pro see the checklist; a business without a plan sees nothing (K-126). Members only.
create function public.coach_checklist(p_location uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare a jsonb; l public.locations; c public.coach_profile;
begin
  a := public.feature_access(p_location);
  select * into l from public.locations where id = p_location;
  if not (a ->> 'essentials')::boolean then
    return jsonb_build_object('locked', true, 'plan', a ->> 'plan', 'pro', false, 'items', '[]'::jsonb);
  end if;
  select * into c from public.coach_profile where location_id = p_location;
  return jsonb_build_object('locked', false, 'plan', a ->> 'plan', 'pro', (a ->> 'pro')::boolean, 'concierge', l.concierge,
    'read_at', c.read_at, 'source', c.source, 'items', private.coach_status(p_location));
end $$;
revoke execute on function public.coach_checklist(uuid) from public, anon;
grant execute on function public.coach_checklist(uuid) to authenticated, service_role;

-- 3. The tasks ----------------------------------------------------------------------------------------------------------

-- A gap found twice is one task: the dedupe key is the item. Returns the keys to keep open. A business without a plan, a
-- concierge business and one Kabsi cannot reach get none; the number from a mock read creates none (see above).
create function private.coach_tasks(p_location uuid) returns text[]
language plpgsql security definer set search_path = '' as $$
declare l public.locations; v_keep text[] := '{}'; i jsonb; v_title text; v_why text; v_prio text; v_len integer;
begin
  select * into l from public.locations where id = p_location;
  if not found or l.status <> 'active' or l.concierge or l.disconnect_requested_at is not null then return v_keep; end if;
  if not (private.feature_plan(p_location) ->> 'essentials')::boolean then return v_keep; end if;
  for i in select * from jsonb_array_elements(private.coach_status(p_location)) loop
    if i ->> 'status' <> 'todo' then continue; end if;
    v_prio := 'nice';
    case i ->> 'id'
      when 'description' then
        v_len := coalesce((i -> 'detail' ->> 'length')::integer, 0);
        v_title := case when v_len = 0 then 'Add a description to your profile' else 'Make your profile description longer' end;
        v_why := 'Your description tells customers what you do. Google allows up to 750 characters and shows the first 250 first. Kabsi writes a draft from the facts you confirmed and you approve it.';
        v_prio := 'recommended';
      when 'categories' then
        v_title := 'Add more categories';
        v_why := 'Extra categories help Google show you for more of what you do. Kabsi suggests them and you choose. Your main category never changes unless you sign in and approve it.';
      when 'services' then
        v_title := 'Add your services and products';
        v_why := 'Customers search for what you sell. Kabsi fills these in from what you told it about your business, and you approve what goes to Google.';
        v_prio := 'recommended';
      when 'attributes' then
        v_title := 'Fill in your profile details';
        v_why := 'Details such as payment options and accessibility help customers decide. Kabsi never suggests anything about who you are or who owns the business.';
      when 'website_tracking' then
        v_title := 'See the visits Google sends to your website';
        v_why := 'A small tag on your website link shows how many visits come from your Google profile. You approve the change and Kabsi keeps it as your approved value.';
      else continue;
    end case;
    v_keep := v_keep || ('profile_gap:coach_' || (i ->> 'id'));
    perform private.task_put(p_location, 'profile_gap', 'profile_gap', 'coach_' || (i ->> 'id'), v_prio, v_title, v_why,
      'Open the Profile Coach to see what to do.', jsonb_build_object('coach', i ->> 'id', 'detail', i -> 'detail'), null,
      'profile_gap:coach_' || (i ->> 'id'));
  end loop;
  return v_keep;
end $$;
revoke all on function private.coach_tasks(uuid) from public, anon, authenticated;

-- Where a coach task opens.
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
    when 'profile_gap' then case
      when p_source_id like 'coach\_%' then '/app/coach'
      when p_source_id = 'facts' then '/app/knowledge' when p_source_id = 'review_link' then '/app/cards'
      when p_source_id = 'posts' then '/app/posts' when p_source_id = 'photos' then '/app/photos' else '/app/shield' end
    else '/app' end
$$;

-- detect_profile_gaps: as before, with the Coach's tasks kept open alongside the others.
create or replace function private.detect_profile_gaps(p_location uuid) returns integer
language plpgsql security definer set search_path = '' as $$
declare l public.locations; v_keep text[] := '{}'; v_made integer := 0; v_core integer; v_missing text := '';
  v_profile jsonb; v_cards integer; v_taps integer; v_photos integer; v_last_post timestamptz; v_open_posts integer; v_before integer;
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

  -- P0.8-09: the Profile Coach's gaps (description, categories, services, attributes, website tracking).
  select count(*) into v_before from public.tasks t
   where t.location_id = l.id and t.kind = 'profile_gap' and t.dedupe_key like 'profile_gap:coach\_%'
     and t.state in ('open', 'snoozed', 'approved', 'publishing');
  v_keep := v_keep || private.coach_tasks(l.id);
  select v_made + count(*) - v_before into v_made from public.tasks t
   where t.location_id = l.id and t.kind = 'profile_gap' and t.dedupe_key like 'profile_gap:coach\_%'
     and t.state in ('open', 'snoozed', 'approved', 'publishing');

  perform private.task_close_except(l.id, 'profile_gap', v_keep, '{}', 'done');
  return v_made;
end $$;
