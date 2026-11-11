-- Cards 2, partner side (master plan 30.50 item 9, R-150): partners mint Kabsi card links in batches (200 to start, until
-- staff raise it), set each one's business through the review link search, and an unclaimed partner card sends a tap
-- straight to that business's Google review form. An owner who sends "Link card CODE" for a partner card starts sign-up
-- attributed to the partner (Partners 2's rules: the last link before sign-up wins, self referral earns nothing, 30 days
-- of Pro through private.partner_trial_days).
--
-- Additive only: three columns, no row removed, no constraint changed. A partner card stays 'unassigned' (no business in
-- Kabsi) until an owner claims it; the tap function and kv-sync serve an unassigned partner card that has a business set
-- as a direct link (supabase/functions/_shared/card-served.ts). Kabsi sells no cards: the partner sells their own card
-- and writes the link on it.
--   1. cards.partner_id, cards.place_id (the Google Place ID only, Places policy, 30.10 item 3), cards.minted_at,
--      cards.claimed_at; partner_accounts.card_limit (200). The kv-sync trigger also fires when a card's partner changes
--      (a deleted partner's cards stop being served at once).
--   2. public.partner_cards, partner_cards_mint, partner_cards_place: the partner home's Card links (programs function,
--      service role). Setting a business counts against a per-partner daily limit (50 a day) on top of the search's own.
--   3. card_link_check and card_link_whatsapp (from 20261111061956) and activate_card (live body, 20261027192128) with
--      one change each: a partner card whose business is set links only to a business with the same Google place, and
--      an unknown phone that sends a partner card's code gets the partner's code for its sign-up link (and the WhatsApp
--      touch is noted, as "Code P-..." does).

-- ─── 1. columns ──────────────────────────────────────────────────────────────────────────────────────────────────
alter table public.cards add column if not exists partner_id uuid references public.partner_accounts(id) on delete set null;
alter table public.cards add column if not exists place_id text check (place_id is null or place_id ~ '^[A-Za-z0-9_-]{10,255}$');
alter table public.cards add column if not exists minted_at timestamptz;
-- When an owner first claimed a partner card. Never cleared (owner deletion puts a card back to unassigned and clears its
-- business, activated_at included), so the partner never sees the business's taps or re-sets a card a business had.
alter table public.cards add column if not exists claimed_at timestamptz;
create index if not exists cards_partner_id_idx on public.cards (partner_id, minted_at desc) where partner_id is not null;
alter table public.partner_accounts add column if not exists card_limit integer not null default 200 check (card_limit between 0 and 100000);

-- ─── 2. the partner home's Card links ────────────────────────────────────────────────────────────────────────────
-- Taps shown to the partner are the taps before an owner first claimed the card (cards.claimed_at): after the claim the
-- taps are the business's, never the partner's, even if the business later leaves.
create or replace function public.partner_cards(p_user uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare x public.partner_accounts;
begin
  select * into x from public.partner_accounts where user_id = p_user;
  if not found then return jsonb_build_object('result', 'not_partner'); end if;
  return jsonb_build_object('result', 'ok', 'limit', x.card_limit, 'can_mint', x.status = 'approved',
    'used', (select count(*) from public.cards c where c.partner_id = x.id),
    'cards', coalesce((select jsonb_agg(jsonb_build_object(
        'code', c.code,
        'state', case when c.claimed_at is not null or c.location_id is not null then 'claimed' when c.status = 'disabled' then 'off'
                      when c.destination is not null then 'set' else 'new' end,
        'destination', case when c.claimed_at is null and c.location_id is null and c.status <> 'disabled' then c.destination end,
        'taps', (select count(*) from public.taps t where t.code = c.code and t.location_id is null and not t.is_bot
                  and t.created_at < coalesce(c.claimed_at, 'infinity'::timestamptz)),
        'minted_at', c.minted_at) order by c.minted_at desc, c.code)
      from public.cards c where c.partner_id = x.id), '[]'::jsonb));
end $$;

-- A batch of 1 to 50 new card links, within the partner's limit. Only an approved partner mints.
create or replace function public.partner_cards_mint(p_user uuid, p_count integer) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare x public.partner_accounts; v_used int; v_code text; v_codes text[] := '{}';
begin
  select * into x from public.partner_accounts where user_id = p_user for update;
  if not found then return jsonb_build_object('result', 'not_partner'); end if;
  if x.status <> 'approved' then return jsonb_build_object('result', 'not_active'); end if;
  if p_count is null or p_count < 1 or p_count > 50 then return jsonb_build_object('result', 'bad_count'); end if;
  select count(*) into v_used from public.cards where partner_id = x.id;
  if v_used + p_count > x.card_limit then
    return jsonb_build_object('result', 'over_limit', 'left', greatest(x.card_limit - v_used, 0), 'limit', x.card_limit);
  end if;
  for i in 1..p_count loop
    for t in 1..8 loop
      v_code := private.card_code6();
      begin
        insert into public.cards (code, kind, status, partner_id, minted_at) values (v_code, 'card', 'unassigned', x.id, now());
        v_codes := v_codes || v_code;
        exit;
      exception when unique_violation then
        v_code := null;
      end;
    end loop;
    if v_code is null then raise exception 'no_code'; end if;
  end loop;
  perform private.audit('partner', p_user, 'partner_cards_minted', null, 'partner', x.id::text, null,
    jsonb_build_object('count', p_count), 'partner', 'minted');
  return jsonb_build_object('result', 'minted', 'codes', to_jsonb(v_codes));
end $$;

-- The business of one or more of the partner's own unclaimed cards: the Google Place ID picked in the review link search.
-- One business set counts once against the partner's daily limit (50), whatever the number of cards.
create or replace function public.partner_cards_place(p_user uuid, p_codes text[], p_place text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare x public.partner_accounts; v_n int;
begin
  select * into x from public.partner_accounts where user_id = p_user;
  if not found then return jsonb_build_object('result', 'not_partner'); end if;
  if x.status not in ('approved', 'paused') then return jsonb_build_object('result', 'not_active'); end if;
  if coalesce(p_place, '') !~ '^[A-Za-z0-9_-]{10,255}$' or cardinality(coalesce(p_codes, '{}')) not between 1 and 50 then
    return jsonb_build_object('result', 'bad_request');
  end if;
  if not exists (select 1 from public.cards c where c.partner_id = x.id and c.code = any (p_codes) and c.location_id is null
                   and c.claimed_at is null and c.status = 'unassigned') then
    return jsonb_build_object('result', 'set', 'count', 0);
  end if;
  if not public.hit_rate_limit('partner_card_place:' || x.id::text, 50, 86400) then
    return jsonb_build_object('result', 'limited');
  end if;
  update public.cards c set place_id = p_place, destination = 'https://search.google.com/local/writereview?placeid=' || p_place
   where c.partner_id = x.id and c.code = any (p_codes) and c.location_id is null and c.claimed_at is null and c.status = 'unassigned';
  get diagnostics v_n = row_count;
  return jsonb_build_object('result', 'set', 'count', v_n);
end $$;

-- ─── 3. claiming: the same Google place, and the partner's code for an unknown phone ────────────────────────────────
-- card_link_check as in 20261111061956, with: a partner card whose business is set asks only the phone's businesses
-- with that place ('only'; none of them is 'other_business'); an unknown phone gets the partner's code ('partner_code')
-- and the code is noted on the WhatsApp conversation, the touch Partners 2's attribution reads (whatsapp_attach_code).
create or replace function public.card_link_check(p_phone text, p_code text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_code text := upper(btrim(coalesce(p_code, ''))); c public.cards; v_key text := 'card_wa:' || coalesce(p_phone, '');
  v_mine uuid[]; v_only uuid[]; v_partner text;
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
  if c.partner_id is not null then
    select p.code into v_partner from public.partner_accounts p where p.id = c.partner_id and p.status in ('approved', 'paused');
  end if;
  if cardinality(v_mine) = 0 then
    if v_partner is not null then perform public.whatsapp_attach_code(p_phone, null, v_partner); end if;
    return jsonb_build_object('result', 'signup', 'partner_code', v_partner);
  end if;
  if c.place_id is not null then
    v_only := array(select l.id from public.locations l where l.id = any (v_mine) and l.place_id = c.place_id);
    if cardinality(v_only) = 0 then return jsonb_build_object('result', 'other_business'); end if;
    return jsonb_build_object('result', 'ask', 'only', to_jsonb(v_only));
  end if;
  return jsonb_build_object('result', 'ask');
end $$;

-- card_link_whatsapp as in 20261111061956, with the same-place check for a partner card whose business is set.
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
  if c.place_id is not null and c.place_id <> v_place then
    perform public.hit_rate_limit(v_key, 10, 3600);
    return jsonb_build_object('result', 'other_business');
  end if;
  v_dest := 'https://search.google.com/local/writereview?placeid=' || v_place;
  update public.cards set location_id = p_location, destination = v_dest, status = 'active', activated_at = coalesce(activated_at, now()),
    claimed_at = case when partner_id is not null then coalesce(claimed_at, now()) end
   where code = v_code;
  select r.user_id into v_user from public.phone_roles r
   where r.phone = p_phone and r.location_id = p_location and r.revoked_at is null and r.role in ('owner', 'manager')
   order by (r.role = 'owner') desc limit 1;
  perform private.audit('user', v_user, 'card_linked', p_location, 'card', v_code, null,
    jsonb_build_object('status', 'active', 'partner_card', c.partner_id is not null), 'whatsapp', 'linked');
  return jsonb_build_object('result', 'linked', 'label', c.label);
end $$;

-- activate_card as it stands live (20261027192128), with one change: a partner card whose business is set links only to
-- a business with the same Google place (refused as card_in_use, the page's existing words).
create or replace function public.activate_card(p_code text, p_location uuid, p_label text default null) returns text
language plpgsql security definer set search_path = '' as $$
declare c public.cards; v_place text; v_code text := upper(trim(coalesce(p_code, ''))); v_dest text;
  v_admin boolean := public.is_staff(); v_key text := 'card_try:' || coalesce(auth.uid()::text, 'none'); v_refused text;
begin
  if not (public.has_location_role(p_location, array['owner', 'manager']) or v_admin or private.is_installer()) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if not v_admin and exists (select 1 from public.rate_limits r where r.key = v_key and r.hits >= 10
                               and r.window_start > now() - interval '1 hour') then
    return 'rate_limited';
  end if;
  select * into c from public.cards where code = v_code for update;
  if not found then v_refused := 'unknown_card';
  elsif c.location_id is not null and c.location_id <> p_location and not v_admin then
    v_refused := case when private.is_installer() then 'card_in_use' else 'unknown_card' end;
  elsif c.status = 'disabled' and not v_admin then v_refused := 'card_disabled';
  end if;
  if v_refused is not null then
    if not v_admin then perform public.hit_rate_limit(v_key, 10, 3600); end if;
    return v_refused;
  end if;
  select place_id into v_place from public.locations where id = p_location;
  if v_place is null then raise exception 'location_has_no_place_id'; end if;
  if c.place_id is not null and c.place_id <> v_place and not v_admin then
    perform public.hit_rate_limit(v_key, 10, 3600);
    return 'card_in_use';
  end if;
  v_dest := 'https://search.google.com/local/writereview?placeid=' || v_place;
  update public.cards set location_id = p_location, destination = v_dest, status = 'active',
    activated_at = coalesce(activated_at, now()), label = coalesce(left(p_label, 60), label),
    claimed_at = case when partner_id is not null then coalesce(claimed_at, now()) end
  where code = v_code;
  return v_dest;
end $$;

-- ─── 4. the Worker's copy follows a change of partner too ────────────────────────────────────────────────────────
-- public.cards_kv_sync as it stands live (read 11 Nov 2026), with partner_id added: an unclaimed partner card is served
-- only while it has a partner (card-served.ts), so a partner removed by retention takes its cards off the edge at once.
create or replace function public.cards_kv_sync() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op <> 'UPDATE'
     or old.status is distinct from new.status
     or old.destination is distinct from new.destination
     or old.location_id is distinct from new.location_id
     or old.page_mode is distinct from new.page_mode
     or old.partner_id is distinct from new.partner_id then
    perform public.call_internal('kv-sync', jsonb_build_object('code', coalesce(new.code, old.code)));
  end if;
  return null;
end $$;

do $$
declare f text;
begin
  foreach f in array array['public.partner_cards(uuid)', 'public.partner_cards_mint(uuid,integer)', 'public.partner_cards_place(uuid,text[],text)',
    'public.card_link_check(text,text)', 'public.card_link_whatsapp(text,text,uuid)'] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $$;
-- activate_card keeps its grant (create or replace keeps it; it is on the definer allowlist for authenticated).
