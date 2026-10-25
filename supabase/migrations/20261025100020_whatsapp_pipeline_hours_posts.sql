-- Session 19 rest (master plan 30.10 point 7): the publication pipeline side for approving an hours change and a typed
-- post from WhatsApp, so session 13b part 2 can wire the buttons (private.whatsapp_item and the messages are 13b's).
-- 1. approve_publication accepts the whatsapp channel for special hours too (replies, posts and non-identity
--    put-backs were already allowed; identity fields and high-risk replies stay refused).
-- 2. apply_regular_hours accepts the whatsapp channel: the owner approves exactly the week the message showed.
-- 3. public.owner_post_prepare: a post the owner typed becomes a draft Kabsi checked, to approve with the same Approve
--    and 10 second undo as every post. Nothing is published here.
-- 4. public.special_hours_prepare: "we are closed Friday" becomes one special-hours draft to approve.
-- Each changed function is replaced by editing only the one condition in its current text; the migration stops if that
-- text is not found, so nothing else in the function can change. Additive: no table or column is dropped.

do $$
declare d text; n text;
begin
  d := pg_get_functiondef('public.approve_publication(text, uuid, jsonb, uuid, text, integer)'::regprocedure);
  n := replace(d, $x$p_target_type not in ('review_reply', 'local_post', 'listing_revert')$x$,
                  $x$p_target_type not in ('review_reply', 'local_post', 'listing_revert', 'special_hours')$x$);
  if n = d then raise exception 'approve_publication: the WhatsApp condition was not found'; end if;
  execute n;

  d := pg_get_functiondef('public.apply_regular_hours(uuid, uuid, text, text, jsonb)'::regprocedure);
  n := replace(d, $x$if p_channel not in ('dashboard', 'email_link') then raise exception 'bad_channel'; end if;$x$,
                  $x$if p_channel not in ('dashboard', 'email_link', 'whatsapp') then raise exception 'bad_channel'; end if;$x$);
  if n = d then raise exception 'apply_regular_hours: the channel check was not found'; end if;
  execute n;
end $$;

-- 3. A typed post. The words are the owner's own; the code checks for contact details run in the caller
-- (_shared/posts/typed.ts) before this, and again in the model-free length and shape checks here.
create or replace function public.owner_post_prepare(p_location uuid, p_user uuid, p_text text, p_channel text)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare l public.locations; v_text text := trim(coalesce(p_text, '')); v_id uuid;
begin
  if p_channel not in ('dashboard', 'whatsapp') then raise exception 'bad_channel'; end if;
  select * into l from public.locations where id = p_location;
  if not found then raise exception 'unknown_location'; end if;
  if not private.may_approve(p_location, 'post', p_user, false) then
    if not exists (select 1 from public.location_members where location_id = p_location and user_id = p_user) then
      raise exception 'not_member';
    end if;
    raise exception 'not_allowed_to_approve' using errcode = '42501';
  end if;
  if l.status <> 'active' or l.google_location_id is null then raise exception 'location_not_active'; end if;
  if l.concierge then raise exception 'concierge_profile'; end if;
  if length(v_text) < 10 or length(v_text) > 1500 then raise exception 'bad_post_text'; end if;
  if v_text ~ '[—–!]' then raise exception 'house_style'; end if;
  insert into public.gbp_posts (location_id, owner_input, body, state, source)
  values (p_location, v_text, v_text, 'draft', 'owner') returning id into v_id;
  return v_id;
end $$;

-- 4. Special hours from the owner's words, parsed by the caller into dates and times.
create or replace function public.special_hours_prepare(p_location uuid, p_user uuid, p_from date, p_to date, p_closed boolean,
  p_open time, p_close time, p_reason text)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare l public.locations; v_id uuid;
begin
  select * into l from public.locations where id = p_location;
  if not found then raise exception 'unknown_location'; end if;
  if not private.may_approve(p_location, 'hours', p_user, false) then
    if not exists (select 1 from public.location_members where location_id = p_location and user_id = p_user) then
      raise exception 'not_member';
    end if;
    raise exception 'not_allowed_to_approve' using errcode = '42501';
  end if;
  if l.status <> 'active' or l.google_location_id is null then raise exception 'location_not_active'; end if;
  if l.concierge then raise exception 'concierge_profile'; end if;
  if p_from is null or p_to is null or p_to < p_from or p_from < current_date - 1 or p_to > current_date + 400 then
    raise exception 'bad_dates';
  end if;
  if not coalesce(p_closed, false) and (p_open is null or p_close is null) then raise exception 'bad_hours'; end if;
  insert into public.special_hours (location_id, start_date, end_date, closed, open_time, close_time, reason, state)
  values (p_location, p_from, p_to, coalesce(p_closed, false), case when p_closed then null else p_open end,
          case when p_closed then null else p_close end, left(nullif(trim(coalesce(p_reason, '')), ''), 200), 'draft')
  returning id into v_id;
  return v_id;
end $$;

revoke all on function public.owner_post_prepare(uuid, uuid, text, text) from public, anon, authenticated;
revoke all on function public.special_hours_prepare(uuid, uuid, date, date, boolean, time, time, text) from public, anon, authenticated;
grant execute on function public.owner_post_prepare(uuid, uuid, text, text) to service_role;
grant execute on function public.special_hours_prepare(uuid, uuid, date, date, boolean, time, time, text) to service_role;
