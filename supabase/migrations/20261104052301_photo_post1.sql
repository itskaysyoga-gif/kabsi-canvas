-- Photo Post 1 (master plan 30.23 item 2, lane R's decisions of 4 Nov 2026): a photo sent on WhatsApp with words becomes a
-- Google post with that photo, for the owner's yes. Additive: one new column, new functions, and two functions replaced with
-- the same signatures. Nothing is dropped, updated or deleted at the top level.
--
-- 1. photos.post_hold: the photo came with words, so it waits for the post (or for the owner's own choice) and the review
--    growth tick never offers it as a plain Google photo on its own. Posts and plain photos stay separate Google operations.
-- 2. whatsapp_photo_hold: holds a photo the sender just sent with words, before anything else is decided.
-- 3. whatsapp_photo_post_prepare: the post draft with that photo, checked against the plan's posts, and the people who may
--    say yes (the sender when they may approve posts, else the owners and managers who may, with WhatsApp on).
-- 4. whatsapp_post_skip: Skip under the post. The post and its held photo are skipped; nothing reaches Google.
-- 5. whatsapp_held_photo: the owner's own choice for a held photo: "Add as a photo" (it goes the plain photo way, Yes, Edit
--    or Skip, once Kabsi has checked it) or Skip.
-- 6. whatsapp_photos_due and private.review_growth_due: a held photo is never offered as a plain photo; a held photo the
--    photo engine refused is still told to its sender, and a post waiting with it is skipped.

alter table public.photos add column if not exists post_hold boolean not null default false;
alter table public.photos add column if not exists wa_post_id uuid;
comment on column public.photos.wa_post_id is 'Photo Post 1: the post made on WhatsApp from this photo and its words. Skip and "Add as a photo" act only on that post.';
comment on column public.photos.post_hold is
  'Photo Post 1: the photo came on WhatsApp with words. It goes to Google only with its post, or as a plain photo after the owner chooses "Add as a photo".';

-- 2. Hold: only the person who sent the photo, only a WhatsApp photo.
create or replace function public.whatsapp_photo_hold(p_photo uuid, p_user uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  update public.photos set post_hold = true
   where id = p_photo and uploaded_by = p_user and source = 'whatsapp' and kind = 'photo';
  return found;
end $$;

-- How many posts a business may still send this month on its plan (Essentials 2 a month; Pro weekly, counted as up to 5 a
-- month, one for each week a month can touch). Posts sent this month and photo posts already waiting for a yes count.
-- Null: no plan limits apply here (no plan at all; publishing itself still checks the plan).
create or replace function private.photo_posts_left(p_location uuid) returns integer
language plpgsql stable security definer set search_path = '' as $$
declare l public.locations; v_lim jsonb; v_cap integer; v_month timestamptz; v_used integer;
begin
  select * into l from public.locations where id = p_location;
  if not found then return 0; end if;
  v_lim := private.entitlements(l.organization_id, l.id) -> 'limits';
  if v_lim is null or jsonb_typeof(v_lim) <> 'object' then return null; end if;
  if jsonb_typeof(v_lim -> 'posts_per_month') = 'number' then v_cap := (v_lim ->> 'posts_per_month')::integer;
  elsif coalesce((v_lim ->> 'weekly_posts')::boolean, false) then v_cap := 5;
  else return null;
  end if;
  v_month := date_trunc('month', now() at time zone coalesce(l.time_zone, 'UTC')) at time zone coalesce(l.time_zone, 'UTC');
  select count(*) into v_used from public.gbp_posts g
   where g.location_id = p_location
     and ((g.state in ('publishing', 'posted', 'removing', 'removed') and g.created_at >= v_month)
       or (g.state = 'draft' and g.created_at > now() - interval '72 hours'
           and exists (select 1 from public.photos p where p.id = g.photo_id and p.post_hold and p.source = 'whatsapp')));
  return greatest(v_cap - v_used, 0);
end $$;

-- 3. The post with the photo. The words were checked in code (posts/checks.ts and posts/typed.ts) before this; the length and
-- house style are checked again here. The sender may be staff: the draft is then made for the owner's yes, never theirs.
create or replace function public.whatsapp_photo_post_prepare(p_location uuid, p_user uuid, p_photo uuid, p_caption text, p_text text)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare l public.locations; ph public.photos; v_text text := trim(coalesce(p_text, '')); v_id uuid; v_left integer; v_to jsonb;
  v_self boolean;
begin
  -- The business row is locked, so two photos sent at the same moment cannot both take the last post of the month.
  select * into l from public.locations where id = p_location for update;
  if not found then return jsonb_build_object('ok', false, 'reason', 'unknown_location'); end if;
  if not exists (select 1 from public.location_members where location_id = p_location and user_id = p_user) then
    return jsonb_build_object('ok', false, 'reason', 'not_member');
  end if;
  if l.status <> 'active' or l.google_location_id is null then return jsonb_build_object('ok', false, 'reason', 'location_not_active'); end if;
  if l.concierge then return jsonb_build_object('ok', false, 'reason', 'concierge_profile'); end if;
  select * into ph from public.photos where id = p_photo for update;
  if not found or ph.location_id <> p_location or ph.uploaded_by is distinct from p_user or ph.source <> 'whatsapp' or ph.kind <> 'photo'
     or ph.state not in ('checking', 'draft') then
    return jsonb_build_object('ok', false, 'reason', 'photo_not_usable');
  end if;
  if length(v_text) < 10 or length(v_text) > 1500 then return jsonb_build_object('ok', false, 'reason', 'bad_post_text'); end if;
  if v_text ~ '[—–!]' then return jsonb_build_object('ok', false, 'reason', 'house_style'); end if;
  update public.photos set post_hold = true where id = p_photo;
  v_left := private.photo_posts_left(p_location);
  if v_left is not null and v_left <= 0 then return jsonb_build_object('ok', false, 'reason', 'posts_used_up'); end if;
  insert into public.gbp_posts (location_id, owner_input, body, state, source, topic_type, photo_id)
  values (p_location, left(trim(coalesce(p_caption, '')), 1000), v_text, 'draft', 'owner', 'STANDARD', p_photo)
  returning id into v_id;
  update public.photos set wa_post_id = v_id where id = p_photo;
  v_self := private.may_approve(p_location, 'post', p_user, false);
  if v_self then
    v_to := jsonb_build_array(jsonb_build_object('user_id', p_user));
  else
    select coalesce(jsonb_agg(jsonb_build_object('user_id', o.user_id, 'phone', o.phone)), '[]') into v_to
      from public.location_members m join public.whatsapp_optins o on o.user_id = m.user_id
     where m.location_id = p_location and m.role in ('owner', 'manager') and o.state = 'active' and o.phone is not null
       and private.may_approve(p_location, 'post', m.user_id, false);
  end if;
  return jsonb_build_object('ok', true, 'post_id', v_id, 'self', v_self, 'to', v_to);
end $$;

-- 4. Skip under the post: the person the button was made for, from their own phone.
create or replace function public.whatsapp_post_skip(p_token text, p_phone text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare a public.whatsapp_actions; o public.whatsapp_optins; po public.gbp_posts;
begin
  select * into a from public.whatsapp_actions where token_hash = private.whatsapp_hash(p_token) for update;
  if not found or a.target_type <> 'local_post' then return jsonb_build_object('result', 'unknown'); end if;
  select * into o from public.whatsapp_optins where user_id = a.user_id;
  if not found or o.phone is distinct from p_phone then return jsonb_build_object('result', 'unknown'); end if;
  if o.state <> 'active' then return jsonb_build_object('result', 'stopped'); end if;
  if a.used_at is not null then return jsonb_build_object('result', 'already', 'location_id', a.location_id); end if;
  select * into po from public.gbp_posts where id = a.target_id for update;
  if not found or po.state <> 'draft' then
    update public.whatsapp_actions set used_at = now(), result = jsonb_build_object('result', 'already', 'location_id', a.location_id) where id = a.id;
    return jsonb_build_object('result', 'already', 'location_id', a.location_id);
  end if;
  update public.gbp_posts set state = 'skipped' where id = po.id;
  update public.photos set state = 'skipped' where id = po.photo_id and post_hold and state in ('checking', 'draft');
  update public.whatsapp_actions set used_at = now(), result = jsonb_build_object('result', 'skipped', 'location_id', a.location_id) where id = a.id;
  return jsonb_build_object('result', 'skipped', 'location_id', a.location_id);
end $$;

-- 5. A held photo, from a phone with WhatsApp on. "Add as a photo" only by an owner or manager of its business (the owner's own
-- choice); Skip also by the person who sent it.
create or replace function public.whatsapp_held_photo(p_phone text, p_photo uuid, p_action text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare o public.whatsapp_optins; ph public.photos;
begin
  if p_action not in ('photo', 'skip') then return jsonb_build_object('result', 'unknown'); end if;
  select * into o from public.whatsapp_optins where phone = p_phone and state = 'active';
  if not found then return jsonb_build_object('result', 'unknown'); end if;
  select * into ph from public.photos where id = p_photo for update;
  if not found or ph.source <> 'whatsapp' then return jsonb_build_object('result', 'unknown'); end if;
  if not exists (select 1 from public.location_members m where m.location_id = ph.location_id
                   and m.user_id = o.user_id and m.role in ('owner', 'manager'))
     and not (p_action = 'skip' and ph.uploaded_by = o.user_id) then
    return jsonb_build_object('result', 'not_yours');
  end if;
  if not ph.post_hold or ph.state not in ('checking', 'draft') then
    return jsonb_build_object('result', 'already', 'location_id', ph.location_id);
  end if;
  -- Either way the post made on WhatsApp from this photo (if any) is skipped: the owner chose something else.
  update public.gbp_posts set state = 'skipped' where id = ph.wa_post_id and state = 'draft';
  if p_action = 'skip' then
    update public.photos set state = 'skipped' where id = p_photo;
    return jsonb_build_object('result', 'skipped', 'location_id', ph.location_id);
  end if;
  -- "Add as a photo": the plain photo way. A photo already checked is asked again by the tick (Yes, Edit or Skip).
  update public.photos set post_hold = false, wa_asked_at = null,
    processed_at = case when processed_at is not null then greatest(processed_at, now() - interval '1 day') else processed_at end
   where id = p_photo;
  return jsonb_build_object('result', 'photo', 'location_id', ph.location_id);
end $$;

-- 6. The tick: a held photo is never offered on its own. A refused one still goes back to its sender with the reason, and a
-- post waiting with it is skipped (its photo cannot go to Google).
create or replace function public.whatsapp_photos_due(p_limit integer default 20) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare r record; v_out jsonb := '[]'::jsonb; v_role text; v_to jsonb;
begin
  for r in
    select p.id, p.location_id, p.state, p.category, p.suitable, p.issues, p.flags, p.suitability_note, p.uploaded_by, p.wa_post_id,
           l.name as business
      from public.photos p join public.locations l on l.id = p.location_id
     where p.source = 'whatsapp' and p.kind = 'photo' and p.state in ('draft', 'refused') and p.wa_asked_at is null
       and p.processed_at > now() - interval '2 days' and p.uploaded_by is not null
       and (p.state = 'refused' or not p.post_hold)
     order by p.processed_at limit p_limit for update of p skip locked
  loop
    update public.photos set wa_asked_at = now() where id = r.id;
    if r.state = 'refused' then
      update public.gbp_posts set state = 'skipped' where id = r.wa_post_id and state = 'draft';
    end if;
    select m.role into v_role from public.location_members m where m.location_id = r.location_id and m.user_id = r.uploaded_by;
    if r.state = 'refused' or v_role in ('owner', 'manager') then
      select coalesce(jsonb_agg(jsonb_build_object('user_id', o.user_id, 'phone', o.phone)), '[]') into v_to
        from public.whatsapp_optins o where o.user_id = r.uploaded_by and o.state = 'active' and o.phone is not null;
    else
      select coalesce(jsonb_agg(jsonb_build_object('user_id', o.user_id, 'phone', o.phone)), '[]') into v_to
        from public.location_members m join public.whatsapp_optins o on o.user_id = m.user_id
       where m.location_id = r.location_id and m.role in ('owner', 'manager') and o.state = 'active' and o.phone is not null;
    end if;
    v_out := v_out || jsonb_build_object('photo_id', r.id, 'location_id', r.location_id, 'business', r.business, 'state', r.state,
      'category', r.category, 'suitable', r.suitable, 'issues', to_jsonb(r.issues), 'flags', to_jsonb(r.flags),
      'note', r.suitability_note, 'sender_role', v_role, 'to', v_to);
  end loop;
  return v_out;
end $$;

create or replace function private.review_growth_due() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.photos where source = 'whatsapp' and kind = 'photo' and state in ('draft', 'refused')
                    and wa_asked_at is null and processed_at > now() - interval '2 days' and uploaded_by is not null
                    and (state = 'refused' or not post_hold))
      or exists (select 1 from private.monthly_update_candidates())
$$;

-- 7. A held photo is never approved as a plain photo, from any screen (the app's Publish and Approve all included). It reaches
-- Google only as its post's media, or as a plain photo after the owner chose "Add as a photo" (which clears the hold).
do $$
declare d text; n text;
begin
  d := pg_get_functiondef('public.approve_publication(text, uuid, jsonb, uuid, text, integer)'::regprocedure);
  n := replace(d, $x$if ph.kind = 'video' then raise exception 'video_later'; end if;$x$,
                  $x$if ph.kind = 'video' then raise exception 'video_later'; end if;
    if ph.post_hold then raise exception 'photo_with_post'; end if;$x$);
  if n = d then raise exception 'approve_publication: the photo check was not found'; end if;
  execute n;
end $$;

revoke all on function public.whatsapp_photo_hold(uuid, uuid), public.whatsapp_photo_post_prepare(uuid, uuid, uuid, text, text),
  public.whatsapp_post_skip(text, text), public.whatsapp_held_photo(text, uuid, text) from public, anon, authenticated;
revoke all on function private.photo_posts_left(uuid) from public, anon, authenticated;
grant execute on function public.whatsapp_photo_hold(uuid, uuid), public.whatsapp_photo_post_prepare(uuid, uuid, uuid, text, text),
  public.whatsapp_post_skip(text, text), public.whatsapp_held_photo(text, uuid, text) to service_role;
