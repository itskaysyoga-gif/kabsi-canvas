-- KABSI: Profile Score and the "Do now" list (D296, D299, D303, D306).
-- The score is computed from facts Kabsi holds; nothing here writes to Google. Tasks are suggestions the owner can
-- do, put off for 3 days or skip for 30 days. Concierge businesses do not get posts, photos or listing tasks (D306).

create table public.profile_tasks (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.locations(id) on delete cascade,
  key text not null,
  title text not null,
  why text not null,
  path text not null,
  points int not null check (points between 0 and 100),
  state text not null default 'open' check (state in ('open','later','skipped','done')),
  snooze_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (location_id, key)
);
create index profile_tasks_open_idx on public.profile_tasks (location_id, state);
create trigger profile_tasks_updated before update on public.profile_tasks for each row execute function public.set_updated_at();
alter table public.profile_tasks enable row level security;
revoke all on public.profile_tasks from anon, authenticated;
create policy members_read_profile_tasks on public.profile_tasks for select to authenticated
  using ((select public.is_member(location_id)) or (select public.is_staff()));
grant select on public.profile_tasks to authenticated;

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

  -- replies (25)
  select count(*), count(*) filter (where state in ('posted','handled_offline') or existing_reply is not null)
    into n90, a90 from public.reviews where location_id = l.id and review_created_at >= now() - interval '90 days';
  select count(*) into waiting from public.reviews where location_id = l.id and state in ('drafted','blocked');
  it_e := case when n90 = 0 then 25 else round(25 * a90::numeric / n90, 1) end;
  v_items := v_items || jsonb_build_object('key','replies','label','Reviews answered','max',25,'earned',it_e,
    'note', case when n90 = 0 then 'No reviews in the last 90 days' else a90 || ' of ' || n90 || ' answered in the last 90 days' end,
    'waiting', waiting, 'path', '/app/inbox');
  v_earned := v_earned + it_e; v_max := v_max + 25;

  -- facts (15): six that make replies and posts specific
  select count(*) into core from unnest(array['about','services','hours_note','contact_phone','signature','mention']) k
    where nullif(trim(coalesce(l.knowledge_card ->> k, '')), '') is not null;
  it_e := round(15 * core / 6.0, 1);
  v_items := v_items || jsonb_build_object('key','facts','label','About your business','max',15,'earned',it_e,
    'note', core || ' of 6 key facts given', 'missing', 6 - core, 'path', '/app/knowledge');
  v_earned := v_earned + it_e; v_max := v_max + 15;

  -- review link (10): a link or card that a real person opened in the last 30 days
  select count(*) into taps30 from public.taps where location_id = l.id and not is_bot and created_at >= now() - interval '30 days';
  select count(*) into cards from public.cards where location_id = l.id and status = 'active';
  it_e := case when taps30 > 0 then 10 when cards > 0 then 5 else 0 end;
  v_items := v_items || jsonb_build_object('key','review_link','label','Review link shared','max',10,'earned',it_e,
    'note', case when taps30 > 0 then taps30 || ' opens in the last 30 days' when cards > 0 then 'Set up, not opened yet' else 'Not set up yet' end,
    'path', '/app/cards');
  v_earned := v_earned + it_e; v_max := v_max + 10;

  if not l.concierge then
    -- posts (15)
    select max(updated_at) into last_post from public.gbp_posts where location_id = l.id and state = 'posted';
    it_e := case when last_post >= now() - interval '7 days' then 15 when last_post >= now() - interval '14 days' then 8 else 0 end;
    v_items := v_items || jsonb_build_object('key','posts','label','Weekly post','max',15,'earned',it_e,
      'note', case when last_post is null then 'No post yet' else 'Last post ' || (current_date - last_post::date) || ' days ago' end,
      'path', '/app/posts');
    v_earned := v_earned + it_e; v_max := v_max + 15;

    -- photos (15): ten suitable photos is a full set
    select count(*) into photos from public.photos where location_id = l.id and state in ('draft','posted') and suitable is not false;
    it_e := round(15 * least(photos, 10) / 10.0, 1);
    v_items := v_items || jsonb_build_object('key','photos','label','Photos','max',15,'earned',it_e,
      'note', photos || ' added through Kabsi', 'have', photos, 'path', '/app/photos');
    v_earned := v_earned + it_e; v_max := v_max + 15;

    -- profile basics (10), from the last listing Kabsi read
    select fields into base from public.listing_baselines where location_id = l.id;
    if base is not null then
      basic := 0; v_missing := '';
      if nullif(trim(coalesce(base ->> 'phone', '')), '') is not null then basic := basic + 1; else v_missing := v_missing || 'phone, '; end if;
      if nullif(trim(coalesce(base ->> 'website', '')), '') is not null then basic := basic + 1; else v_missing := v_missing || 'website, '; end if;
      if base -> 'categories' is not null and base ->> 'categories' not in ('[]','null','') then basic := basic + 1; else v_missing := v_missing || 'categories, '; end if;
      if base -> 'hours' is not null and base ->> 'hours' not in ('[]','{}','null','') then basic := basic + 1; else v_missing := v_missing || 'opening hours, '; end if;
      it_e := round(10 * basic / 4.0, 1);
      v_missing := case when basic = 4 then '' else left(v_missing, length(v_missing) - 2) end;
      v_items := v_items || jsonb_build_object('key','basics','label','Profile basics','max',10,'earned',it_e,
        'note', case when basic = 4 then 'Phone, website, category and hours are set' else 'Missing: ' || v_missing end,
        'missing', v_missing, 'path', '/app/shield');
      v_earned := v_earned + it_e; v_max := v_max + 10;
    end if;

    -- listing watch (5)
    it_e := case when l.shield_checked_at >= now() - interval '2 days' then 5 else 0 end;
    v_items := v_items || jsonb_build_object('key','shield','label','Listing Shield','max',5,'earned',it_e,
      'note', case when it_e = 5 then 'Watching your listing' else 'Not checked in the last 2 days' end, 'path', '/app/shield');
    v_earned := v_earned + it_e; v_max := v_max + 5;
  end if;

  return jsonb_build_object('score', case when v_max = 0 then 0 else round(100 * v_earned / v_max)::int end, 'items', v_items);
end $$;

-- Refresh the task rows from the score, then return the score with the open tasks (top five, biggest gain first).
create or replace function public.profile_tasks_list(p_location uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare s jsonb; it jsonb; v_left numeric; v_title text; v_why text; v_pts int;
begin
  if not (public.is_member(p_location) or public.is_staff()) then raise exception 'forbidden' using errcode = '42501'; end if;
  s := public.profile_score(p_location);
  if s is null then return null; end if;
  -- give back tasks whose wait is over
  update public.profile_tasks set state = 'open', snooze_until = null
   where location_id = p_location and state in ('later','skipped') and snooze_until <= now();
  for it in select e from jsonb_array_elements(s -> 'items') e loop
    v_left := (it ->> 'max')::numeric - (it ->> 'earned')::numeric;
    if v_left <= 0 then
      update public.profile_tasks set state = 'done', snooze_until = null
       where location_id = p_location and key = it ->> 'key' and state <> 'done';
      continue;
    end if;
    v_pts := ceil(v_left)::int;
    case it ->> 'key'
      when 'replies' then
        v_title := case when (it ->> 'waiting')::int > 0
          then 'Answer ' || (it ->> 'waiting') || case when (it ->> 'waiting')::int = 1 then ' review' else ' reviews' end || ' waiting for you'
          else 'Answer your recent reviews' end;
        v_why := 'Replying shows customers you read what they wrote. Every reply is drafted for you and posts only when you approve it.';
      when 'facts' then
        v_title := 'Tell Kabsi ' || (it ->> 'missing') || ' more ' || case when (it ->> 'missing')::int = 1 then 'thing' else 'things' end || ' about your business';
        v_why := 'Replies and posts only use facts you gave, so the more you add, the more they sound like you.';
      when 'review_link' then
        v_title := case when (it ->> 'earned')::numeric = 5 then 'Share your review link with a customer' else 'Set up your review link' end;
        v_why := 'A short link and QR code make it easy for happy customers to leave a review. Ask everyone, never only the happy ones, and never offer a reward.';
      when 'posts' then
        v_title := 'Publish this week''s post';
        v_why := 'A post a week keeps your profile current. Google shows each post for a limited time.';
      when 'photos' then
        v_title := 'Add photos of your business';
        v_why := 'Photos help people see what to expect. Start with the outside, the inside, your team and what you sell.';
      when 'basics' then
        v_title := 'Complete your profile basics';
        v_why := 'Missing on Google: ' || (it ->> 'missing') || '. Complete details help customers reach you.';
      when 'shield' then
        v_title := 'Turn on your Listing Shield check';
        v_why := 'Kabsi checks your listing for changes you did not make and lets you put yours back with one tap.';
      else continue;
    end case;
    insert into public.profile_tasks (location_id, key, title, why, path, points)
    values (p_location, it ->> 'key', v_title, v_why, it ->> 'path', v_pts)
    on conflict (location_id, key) do update
      set title = excluded.title, why = excluded.why, path = excluded.path, points = excluded.points,
          state = case when public.profile_tasks.state = 'done' then 'open' else public.profile_tasks.state end,
          snooze_until = case when public.profile_tasks.state = 'done' then null else public.profile_tasks.snooze_until end;
  end loop;
  return jsonb_build_object('score', s -> 'score', 'items', s -> 'items',
    'tasks', coalesce((select jsonb_agg(jsonb_build_object('id', t.id, 'key', t.key, 'title', t.title, 'why', t.why, 'path', t.path, 'points', t.points)
        order by t.points desc, t.created_at)
      from (select * from public.profile_tasks where location_id = p_location and state = 'open' order by points desc, created_at limit 5) t), '[]'::jsonb),
    'later', (select count(*) from public.profile_tasks where location_id = p_location and state in ('later','skipped')));
end $$;

create or replace function public.profile_task_action(p_task uuid, p_action text) returns void
language plpgsql security definer set search_path = '' as $$
declare t public.profile_tasks;
begin
  select * into t from public.profile_tasks where id = p_task;
  if not found or not public.is_member(t.location_id) then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_action = 'later' then
    update public.profile_tasks set state = 'later', snooze_until = now() + interval '3 days' where id = p_task and state = 'open';
  elsif p_action = 'skip' then
    update public.profile_tasks set state = 'skipped', snooze_until = now() + interval '30 days' where id = p_task and state = 'open';
  else
    raise exception 'bad_action';
  end if;
end $$;

revoke execute on function public.profile_score(uuid), public.profile_tasks_list(uuid), public.profile_task_action(uuid, text) from public, anon;
grant execute on function public.profile_score(uuid), public.profile_tasks_list(uuid), public.profile_task_action(uuid, text) to authenticated;
