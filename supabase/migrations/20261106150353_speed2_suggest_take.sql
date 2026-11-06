-- Speed 2 part A (lane R, 6 Nov 2026): suggestions on /scan are answered by a route on kabsi.co (POST /api/suggest on
-- Vercel, fra1) instead of the profile-snapshot function, so the browser pays no preflight and no Supabase gateway. The
-- route asks the database once per suggestion, with the public key and its own route key (least privilege, Rashid's
-- yes of 6 Nov: the route holds no service key (Sec 1), and a login role was ruled out because any login role on this
-- project reaches pg_net's request queue; rls_functions.sql names this function as anon's one exception): this function takes the visitor's three suggestion limits (the same keys
-- and windows as profile-snapshot, so both paths share one count per visitor) and, when the route will ask Google, one
-- Autocomplete request from the day's cap (places_take('autocomplete')), and answers allowed or the reason.
--
-- Order and counting are the same as profile-snapshot's: the minute, the hour, then the day; the first limit that refuses
-- stops there, so the later limits are not used up by a refused burst; the cap is asked only when every limit allowed.
-- A null limit is skipped (the pass action counts against the minute only). The visitor is the route's salted hash of the
-- address, never the address.
--
-- The route key: 32 random bytes made here by the database and kept in Vault as 'suggest_route_key' (the same way as
-- cron_secret; no API role can read Vault). Rashid copies it once into Vercel's environment as SUGGEST_ROUTE_KEY. It
-- opens this one function and nothing else. Additive: one Vault secret, one new function.
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'suggest_route_key') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'suggest_route_key',
      'Speed 2 part A: the key of the kabsi.co route /api/suggest (Vercel env SUGGEST_ROUTE_KEY); opens public.suggest_take only');
  end if;
end $$;

create or replace function public.suggest_take(
  p_key text, p_visitor text, p_per_minute integer, p_per_hour integer, p_per_day integer, p_places boolean
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_places jsonb;
begin
  if p_key is null or length(p_key) <> 64
     or p_key is distinct from public.internal_secret('suggest_route_key') then
    raise exception 'suggest_take: not allowed';
  end if;
  if p_visitor is null or p_visitor !~ '^[0-9a-f]{24}$' then raise exception 'suggest_take: bad visitor'; end if;
  if (p_per_minute is not null and p_per_minute not between 1 and 1000)
     or (p_per_hour is not null and p_per_hour not between 1 and 10000)
     or (p_per_day is not null and p_per_day not between 1 and 100000) then
    raise exception 'suggest_take: limit out of range';
  end if;
  if p_per_minute is not null and not public.hit_rate_limit('snapshot:suggest-min:' || p_visitor, p_per_minute, 60) then
    return jsonb_build_object('allowed', false, 'reason', 'rate_limited');
  end if;
  if p_per_hour is not null and not public.hit_rate_limit('snapshot:suggest-hour:' || p_visitor, p_per_hour, 3600) then
    return jsonb_build_object('allowed', false, 'reason', 'rate_limited');
  end if;
  if p_per_day is not null and not public.hit_rate_limit('snapshot:suggest-day:' || p_visitor, p_per_day, 86400) then
    return jsonb_build_object('allowed', false, 'reason', 'rate_limited');
  end if;
  if coalesce(p_places, false) then
    v_places := public.places_take('autocomplete');
    if coalesce((v_places ->> 'allowed')::boolean, false) is not true then
      return jsonb_build_object('allowed', false, 'reason', 'back_soon');
    end if;
  end if;
  return jsonb_build_object('allowed', true);
end $$;

-- The route reaches it with the public (anon) key; the route key inside is what lets a call through.
revoke execute on function public.suggest_take(text, text, integer, integer, integer, boolean) from public, authenticated;
grant execute on function public.suggest_take(text, text, integer, integer, integer, boolean) to anon, service_role;

comment on function public.suggest_take(text, text, integer, integer, integer, boolean) is
  'Speed 2 part A: the suggestion limits of one visitor and, when p_places, one Places Autocomplete request from the day''s cap, in one round trip. Refuses any call without the route key (the kabsi.co route /api/suggest).';
