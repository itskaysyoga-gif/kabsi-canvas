-- V3 Review Growth (master plan 27.3 item 5, 30.15 sections 3.3, 3.4, 3.5; session V3). Additive: new values, new columns, a new
-- table and new functions. Nothing is dropped, and no customer data is added anywhere.
--
-- 1. Link opens from a forwarded review request are counted apart (taps.source 'message'), never as reviews.
-- 2. Photos from WhatsApp go through the one publication pipeline like replies: WhatsApp may approve a photo (Yes), the owner
--    can change its category (Edit) or skip it (Skip). approve_publication takes the whatsapp channel for 'photo'; the draft
--    is shown back first and the hash covers the file and its category, so an edit voids an old yes.
-- 3. Photos from WhatsApp are on both plans (30.15 section 3.4): Essentials gets the flag Pro had.
-- 4. The monthly business-update question (30.15 section 3.3): one row per business per month, so it goes once.
-- 5. The tick wakes for the two new kinds of message.

-- 1. opens by source ----------------------------------------------------------------------------------------------------
alter table public.taps drop constraint if exists taps_source_check;
alter table public.taps add constraint taps_source_check check (source in ('nfc', 'qr', 'message'));

-- Review Growth numbers for one business: new reviews and link opens (bots excluded), apart. No person is named or counted.
create or replace function public.review_growth_stats(p_location uuid, p_days integer) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'days', p_days,
    'new_reviews', (select count(*) from public.reviews r where r.location_id = p_location
                      and coalesce(r.review_created_at, r.created_at) > now() - make_interval(days => p_days)),
    'opens_message', (select count(*) from public.taps t where t.location_id = p_location and not t.is_bot and t.source = 'message'
                        and t.created_at > now() - make_interval(days => p_days)),
    'opens_qr', (select count(*) from public.taps t where t.location_id = p_location and not t.is_bot and t.source = 'qr'
                   and t.created_at > now() - make_interval(days => p_days)),
    'opens_tag', (select count(*) from public.taps t where t.location_id = p_location and not t.is_bot and t.source = 'nfc'
                    and t.created_at > now() - make_interval(days => p_days)))
$$;
revoke all on function public.review_growth_stats(uuid, integer) from public, anon, authenticated;
grant execute on function public.review_growth_stats(uuid, integer) to service_role;

-- 2. photos on WhatsApp -------------------------------------------------------------------------------------------------
alter table public.photos add column if not exists wa_asked_at timestamptz;
comment on column public.photos.wa_asked_at is 'When Kabsi told the sender on WhatsApp that the photo is ready (or could not be used). Once.';

alter table public.whatsapp_actions drop constraint whatsapp_actions_target_type_check;
alter table public.whatsapp_actions add constraint whatsapp_actions_target_type_check
  check (target_type in ('review_reply', 'local_post', 'listing_revert', 'special_hours', 'photo'));

do $$
declare d text; n text;
begin
  -- The item a Yes is for: a processed photo still waiting, with the category Kabsi would send it under.
  d := pg_get_functiondef('private.whatsapp_item(text, uuid)'::regprocedure);
  n := replace(d, $x$ v_sh text;$x$, $x$ v_sh text; ph public.photos;$x$);
  n := replace(n, $x$  else
    return jsonb_build_object('ok', false, 'reason', 'not_on_whatsapp');$x$,
                  $x$  when 'photo' then
    select * into ph from public.photos where id = p_target_id;
    if not found then return jsonb_build_object('ok', false, 'reason', 'unknown_target'); end if;
    if ph.kind <> 'photo' or ph.state <> 'draft' then return jsonb_build_object('ok', false, 'reason', 'not_draft', 'location_id', ph.location_id); end if;
    return jsonb_build_object('ok', true, 'location_id', ph.location_id, 'text', coalesce(ph.category, 'ADDITIONAL'),
      'hash', private.whatsapp_hash(ph.id::text || ':' || coalesce(ph.storage_path, '') || ':' || coalesce(ph.category, 'ADDITIONAL')));
  else
    return jsonb_build_object('ok', false, 'reason', 'not_on_whatsapp');$x$);
  if n = d or n !~ 'when ''photo'' then' or n !~ 'ph public.photos;' then raise exception 'whatsapp_item: the text was not found'; end if;
  execute n;

  -- The one publication pipeline takes the whatsapp channel for a photo. Nothing else about it changes.
  d := pg_get_functiondef('public.approve_publication(text, uuid, jsonb, uuid, text, integer)'::regprocedure);
  n := replace(d, $x$'listing_revert', 'special_hours')$x$, $x$'listing_revert', 'special_hours', 'photo')$x$);
  if n = d or n !~ '''special_hours'', ''photo''\)' then raise exception 'approve_publication: the text was not found'; end if;
  execute n;
end $$;

-- 3. both plans ---------------------------------------------------------------------------------------------------------
do $$
declare d text; n text;
begin
  d := pg_get_functiondef('private.plan_limits(text)'::regprocedure);
  n := replace(d, $x$"photos_from_whatsapp": false$x$, $x$"photos_from_whatsapp": true$x$);
  if n = d then raise exception 'plan_limits: the text was not found'; end if;
  execute n;
end $$;

-- The photos Kabsi has finished checking that came from WhatsApp, each told once. A ready photo goes to the person who sent it
-- when they may approve (owner or manager), otherwise to the owners and managers who have WhatsApp on; a photo Kabsi could not
-- use goes back to the person who sent it, with the reason. The rows are claimed here (wa_asked_at), so a tick never repeats one.
create or replace function public.whatsapp_photos_due(p_limit integer default 20) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare r record; v_out jsonb := '[]'::jsonb; v_role text; v_to jsonb;
begin
  for r in
    select p.id, p.location_id, p.state, p.category, p.suitable, p.issues, p.flags, p.suitability_note, p.uploaded_by, l.name as business
      from public.photos p join public.locations l on l.id = p.location_id
     where p.source = 'whatsapp' and p.kind = 'photo' and p.state in ('draft', 'refused') and p.wa_asked_at is null
       and p.processed_at > now() - interval '2 days' and p.uploaded_by is not null
     order by p.processed_at limit p_limit for update of p skip locked
  loop
    update public.photos set wa_asked_at = now() where id = r.id;
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

-- Edit on a photo: the category the owner picks, for a photo still waiting, by an owner or manager of that business.
create or replace function public.whatsapp_photo_category(p_user uuid, p_photo uuid, p_category text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare ph public.photos;
begin
  if p_category not in ('EXTERIOR', 'INTERIOR', 'PRODUCT', 'AT_WORK', 'TEAMS', 'FOOD_AND_DRINK', 'MENU', 'COMMON_AREA', 'ROOMS', 'ADDITIONAL') then
    return jsonb_build_object('ok', false, 'reason', 'bad_category');
  end if;
  select * into ph from public.photos where id = p_photo for update;
  if not found then return jsonb_build_object('ok', false, 'reason', 'unknown_target'); end if;
  if not exists (select 1 from public.location_members m where m.location_id = ph.location_id and m.user_id = p_user and m.role in ('owner', 'manager')) then
    return jsonb_build_object('ok', false, 'reason', 'not_member');
  end if;
  if ph.state <> 'draft' then return jsonb_build_object('ok', false, 'reason', 'not_draft'); end if;
  update public.photos set category = p_category where id = p_photo;
  return jsonb_build_object('ok', true, 'location_id', ph.location_id);
end $$;

-- Skip on a photo: the same person the button was made for, from their own phone. The photo is skipped, nothing reaches Google.
create or replace function public.whatsapp_photo_skip(p_token text, p_phone text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare a public.whatsapp_actions; o public.whatsapp_optins;
begin
  select * into a from public.whatsapp_actions where token_hash = private.whatsapp_hash(p_token) for update;
  if not found or a.target_type <> 'photo' then return jsonb_build_object('result', 'unknown'); end if;
  select * into o from public.whatsapp_optins where user_id = a.user_id;
  if not found or o.phone is distinct from p_phone then return jsonb_build_object('result', 'unknown'); end if;
  if o.state <> 'active' then return jsonb_build_object('result', 'stopped'); end if;
  if a.used_at is not null then return jsonb_build_object('result', 'already', 'location_id', a.location_id); end if;
  update public.photos set state = 'skipped' where id = a.target_id and state = 'draft';
  update public.whatsapp_actions set used_at = now(), result = jsonb_build_object('result', 'skipped', 'location_id', a.location_id) where id = a.id;
  return jsonb_build_object('result', 'skipped', 'location_id', a.location_id);
end $$;

-- 4. the monthly business-update question -------------------------------------------------------------------------------
create table if not exists public.business_update_prompts (
  location_id uuid not null references public.locations(id) on delete cascade,
  month date not null,
  asked_at timestamptz not null default now(),
  answered_at timestamptz,
  primary key (location_id, month)
);
alter table public.business_update_prompts enable row level security;
revoke all on public.business_update_prompts from anon, authenticated;
comment on table public.business_update_prompts is 'One row per business per month: the question "Any new services, prices, products or opening times?" was sent. No answer text is kept here.';

-- Businesses due this month: active, not early access, at least a week old, still entitled, the owner has WhatsApp on, and from
-- the 2nd of the month in the business's own time zone. Read only; whatsapp_monthly_due claims them.
create or replace function private.monthly_update_candidates() returns table (location_id uuid, business text, user_id uuid, phone text, month date)
language sql stable security definer set search_path = '' as $$
  select l.id, l.name, o.user_id, o.phone, date_trunc('month', now() at time zone coalesce(l.time_zone, 'UTC'))::date
    from public.locations l
    join public.location_members m on m.location_id = l.id and m.role = 'owner'
    join public.whatsapp_optins o on o.user_id = m.user_id and o.state = 'active' and o.phone is not null
   where l.status = 'active' and not coalesce(l.concierge, false) and l.created_at < now() - interval '7 days'
     and extract(day from now() at time zone coalesce(l.time_zone, 'UTC')) >= 2
     and private.entitled(l.id, 'publish')
     and not exists (select 1 from public.business_update_prompts b where b.location_id = l.id
                       and b.month = date_trunc('month', now() at time zone coalesce(l.time_zone, 'UTC'))::date)
$$;

create or replace function public.whatsapp_monthly_due(p_limit integer default 20) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare r record; v_out jsonb := '[]'::jsonb; v_n integer;
begin
  for r in select distinct on (c.location_id) c.* from private.monthly_update_candidates() c order by c.location_id, c.user_id limit p_limit loop
    insert into public.business_update_prompts (location_id, month) values (r.location_id, r.month) on conflict do nothing;
    get diagnostics v_n = row_count;
    if v_n = 1 then
      v_out := v_out || jsonb_build_object('location_id', r.location_id, 'business', r.business, 'user_id', r.user_id, 'phone', r.phone, 'month', r.month);
    end if;
  end loop;
  return v_out;
end $$;

create or replace function public.whatsapp_monthly_answered(p_location uuid) returns void
language sql security definer set search_path = '' as $$
  update public.business_update_prompts set answered_at = now()
   where location_id = p_location and answered_at is null
     and month = (select date_trunc('month', now() at time zone coalesce(l.time_zone, 'UTC'))::date from public.locations l where l.id = p_location)
$$;

-- 5. the tick -----------------------------------------------------------------------------------------------------------
create or replace function private.review_growth_due() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.photos where source = 'whatsapp' and kind = 'photo' and state in ('draft', 'refused')
                    and wa_asked_at is null and processed_at > now() - interval '2 days' and uploaded_by is not null)
      or exists (select 1 from private.monthly_update_candidates())
$$;

do $$
declare d text; n text;
begin
  d := pg_get_functiondef('private.whatsapp_tick()'::regprocedure);
  n := replace(d, $x$or jsonb_array_length(public.whatsapp_google_action_due()) > 0 then$x$,
                  $x$or jsonb_array_length(public.whatsapp_google_action_due()) > 0
     or private.review_growth_due() then$x$);
  if n = d then raise exception 'whatsapp_tick: the text was not found'; end if;
  execute n;
end $$;

revoke all on function public.whatsapp_photos_due(integer), public.whatsapp_photo_category(uuid, uuid, text), public.whatsapp_photo_skip(text, text),
  public.whatsapp_monthly_due(integer), public.whatsapp_monthly_answered(uuid) from public, anon, authenticated;
grant execute on function public.whatsapp_photos_due(integer), public.whatsapp_photo_category(uuid, uuid, text), public.whatsapp_photo_skip(text, text),
  public.whatsapp_monthly_due(integer), public.whatsapp_monthly_answered(uuid) to service_role;
revoke all on function private.monthly_update_candidates(), private.review_growth_due() from public, anon, authenticated;
