-- Cards 2, owner side (master plan 30.50 item 9, R-150): an owner links a card on WhatsApp ("Link card CODE", one confirm,
-- a place label), "cards" lists each card with its taps this week and last week, and the weekly report shows a Cards block.
--
-- Additive only: no table, column or row is removed, and no existing function changes. Every function here is called by
-- the whatsapp function or the weekly report with the service role; the browser cannot call any of them.
--   1. private.card_phone_locations: the businesses a phone may link cards for (owner or manager, from phone_roles, the
--      same rows the WhatsApp agent resolves a phone to).
--   2. public.card_link_check: what "Link card CODE" means for this phone (ask, already linked, sign up, unknown, off).
--   3. public.card_link_whatsapp: the tap that links the card to one of the phone's own businesses.
--   4. public.card_label_whatsapp: the place label (Front desk, Till, Table, or a typed one).
--   5. public.card_taps_weeks and public.card_list_whatsapp: taps per card for a week and the week before it, bots
--      excluded, counted only for this business (taps.location_id), so a card moved by staff never shows another
--      business's taps.
-- Words: always taps, never reviews. A label is a place, never a person; nothing ranks people.

-- ─── 1. the phone's own businesses ───────────────────────────────────────────────────────────────────────────────
create or replace function private.card_phone_locations(p_phone text) returns setof uuid
language sql stable security definer set search_path = '' as $$
  select distinct r.location_id
    from public.phone_roles r join public.locations l on l.id = r.location_id
   where r.phone = p_phone and r.revoked_at is null and r.role in ('owner', 'manager') and r.location_id is not null
     and not coalesce(l.is_demo, false)
$$;

-- ─── 2. "Link card CODE" ─────────────────────────────────────────────────────────────────────────────────────────
-- A refused code counts against the phone (10 an hour), as activate_card does for a signed-in account. A card linked to
-- a business that is not the phone's own reads as unknown: its business is never named or hinted at.
create or replace function public.card_link_check(p_phone text, p_code text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_code text := upper(btrim(coalesce(p_code, ''))); c public.cards; v_key text := 'card_wa:' || coalesce(p_phone, '');
  v_mine uuid[];
begin
  if coalesce(p_phone, '') !~ '^\+[1-9][0-9]{6,14}$' or v_code !~ '^[2-9A-HJKMNP-Z]{6}$' then
    return jsonb_build_object('result', 'unknown');
  end if;
  if exists (select 1 from public.rate_limits r where r.key = v_key and r.hits >= 10 and r.window_start > now() - interval '1 hour') then
    return jsonb_build_object('result', 'limited');
  end if;
  v_mine := array(select private.card_phone_locations(p_phone));
  select * into c from public.cards where code = v_code and kind = 'card';
  if not found or (c.location_id is not null and not c.location_id = any (v_mine)) then
    perform public.hit_rate_limit(v_key, 10, 3600);
    return jsonb_build_object('result', 'unknown');
  end if;
  if c.status = 'disabled' then
    perform public.hit_rate_limit(v_key, 10, 3600);
    return jsonb_build_object('result', 'disabled');
  end if;
  if c.location_id is not null then
    return jsonb_build_object('result', 'already', 'location_id', c.location_id, 'label', c.label);
  end if;
  if cardinality(v_mine) = 0 then return jsonb_build_object('result', 'signup'); end if;
  return jsonb_build_object('result', 'ask');
end $$;

-- ─── 3. the tap that links it ────────────────────────────────────────────────────────────────────────────────────
-- The business comes from the button, and is checked here against the phone's own businesses: a button for any other
-- business is refused. The checks of card_link_check are made again under a row lock.
create or replace function public.card_link_whatsapp(p_phone text, p_code text, p_location uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_code text := upper(btrim(coalesce(p_code, ''))); c public.cards; v_key text := 'card_wa:' || coalesce(p_phone, '');
  v_place text; v_dest text; v_user uuid;
begin
  if p_location is null or not p_location in (select private.card_phone_locations(p_phone)) then
    return jsonb_build_object('result', 'unknown');
  end if;
  if exists (select 1 from public.rate_limits r where r.key = v_key and r.hits >= 10 and r.window_start > now() - interval '1 hour') then
    return jsonb_build_object('result', 'limited');
  end if;
  select * into c from public.cards where code = v_code and kind = 'card' for update;
  if not found or (c.location_id is not null and c.location_id <> p_location) then
    perform public.hit_rate_limit(v_key, 10, 3600);
    return jsonb_build_object('result', 'unknown');
  end if;
  if c.status = 'disabled' then return jsonb_build_object('result', 'disabled'); end if;
  select place_id into v_place from public.locations where id = p_location;
  if v_place is null then return jsonb_build_object('result', 'no_place'); end if;
  v_dest := 'https://search.google.com/local/writereview?placeid=' || v_place;
  update public.cards set location_id = p_location, destination = v_dest, status = 'active', activated_at = coalesce(activated_at, now())
   where code = v_code;
  select r.user_id into v_user from public.phone_roles r
   where r.phone = p_phone and r.location_id = p_location and r.revoked_at is null and r.role in ('owner', 'manager')
   order by (r.role = 'owner') desc limit 1;
  perform private.audit('user', v_user, 'card_linked', p_location, 'card', v_code, null,
    jsonb_build_object('status', 'active'), 'whatsapp', 'linked');
  return jsonb_build_object('result', 'linked', 'label', c.label);
end $$;

-- ─── 4. the place label ──────────────────────────────────────────────────────────────────────────────────────────
create or replace function public.card_label_whatsapp(p_phone text, p_code text, p_label text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_code text := upper(btrim(coalesce(p_code, ''))); v_label text := btrim(regexp_replace(coalesce(p_label, ''), '\s+', ' ', 'g'));
  v_loc uuid;
begin
  if char_length(v_label) < 2 or char_length(v_label) > 30 or v_label ~ '[<>{}\\]' then
    return jsonb_build_object('result', 'bad_label');
  end if;
  select location_id into v_loc from public.cards where code = v_code and kind = 'card';
  if v_loc is null or not v_loc in (select private.card_phone_locations(p_phone)) then
    return jsonb_build_object('result', 'unknown');
  end if;
  update public.cards set label = v_label where code = v_code;
  return jsonb_build_object('result', 'labelled', 'label', v_label);
end $$;

-- ─── 5. taps per card ────────────────────────────────────────────────────────────────────────────────────────────
-- The week that starts on p_week (a Monday, the business's own time zone) and the week before it. Active cards of this
-- business only; a tap counts only when it was logged for this business; bots are left out.
create or replace function public.card_taps_weeks(p_location uuid, p_week date) returns jsonb
language sql stable security definer set search_path = '' as $$
  with z as (select coalesce(l.time_zone, 'UTC') as tz from public.locations l where l.id = p_location),
  b as (
    select (p_week::timestamp at time zone z.tz) as s, ((p_week + 7)::timestamp at time zone z.tz) as e,
           ((p_week - 7)::timestamp at time zone z.tz) as p
      from z)
  select coalesce(jsonb_agg(jsonb_build_object(
           'code', c.code, 'label', c.label,
           'this_week', (select count(*) from public.taps t where t.code = c.code and t.location_id = p_location and not t.is_bot
                          and t.created_at >= b.s and t.created_at < b.e),
           'last_week', (select count(*) from public.taps t where t.code = c.code and t.location_id = p_location and not t.is_bot
                          and t.created_at >= b.p and t.created_at < b.s))
         order by c.activated_at nulls last, c.code), '[]'::jsonb)
    from public.cards c, b
   where c.location_id = p_location and c.kind = 'card' and c.status = 'active'
$$;

-- "cards" on WhatsApp: this week is the week so far (from Monday in the business's time zone).
create or replace function public.card_list_whatsapp(p_phone text, p_location uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_week date;
begin
  if p_location is null or not p_location in (select private.card_phone_locations(p_phone)) then
    return jsonb_build_object('result', 'unknown');
  end if;
  select date_trunc('week', now() at time zone coalesce(l.time_zone, 'UTC'))::date into v_week from public.locations l where l.id = p_location;
  return jsonb_build_object('result', 'ok', 'cards', public.card_taps_weeks(p_location, v_week));
end $$;

do $$
declare f text;
begin
  foreach f in array array['public.card_link_check(text,text)', 'public.card_link_whatsapp(text,text,uuid)',
    'public.card_label_whatsapp(text,text,text)', 'public.card_taps_weeks(uuid,date)', 'public.card_list_whatsapp(text,uuid)'] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
  revoke all on function private.card_phone_locations(text) from public, anon, authenticated;
end $$;
