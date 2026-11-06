-- Speed 2 part A (lane R, 6 Nov 2026): suggestions on /scan are answered by a route on kabsi.co (POST /api/suggest on
-- Vercel, fra1, beside the database in eu-central-1) instead of the profile-snapshot function, so the browser pays no
-- preflight and no Supabase gateway. The route asks the database once per suggestion: this function takes the
-- visitor's three suggestion limits (the same keys and windows as profile-snapshot, so both paths share one count per
-- visitor) and, when the route will ask Google, one Autocomplete request from the day's cap (places_take('autocomplete')),
-- and answers allowed or the reason.
--
-- Order and counting are the same as profile-snapshot's: the minute, the hour, then the day; the first limit that refuses
-- stops there, so the later limits are not used up by a refused burst; the cap is asked only when every limit allowed.
-- A null limit is skipped (the pass action counts against the minute only). The visitor is the route's salted hash of the
-- address, never the address.
--
-- Least privilege (Sec 1: no service key on the website's server; rls_functions.sql: anon runs no SECURITY DEFINER
-- function): the route signs in to Postgres through Supabase's pooler as its own role, suggest_route, which can run this
-- one function and nothing else (no table, no other function). Its password is made here by the database (32 random
-- bytes), set inside the DO block (only top-level statements are logged, so the password is not), and kept in Vault as
-- 'suggest_route_db_password' for Rashid to copy once into Vercel. Additive: one role, one Vault secret, one function.
do $$
declare
  v_pw text;
begin
  if not exists (select 1 from pg_roles where rolname = 'suggest_route') then
    v_pw := encode(extensions.gen_random_bytes(32), 'hex');
    execute format('create role suggest_route login noinherit connection limit 30 password %L', v_pw);
    if not exists (select 1 from vault.secrets where name = 'suggest_route_db_password') then
      perform vault.create_secret(v_pw, 'suggest_route_db_password',
        'Speed 2 part A: password of the Postgres role suggest_route (kabsi.co route /api/suggest, Vercel env SUGGEST_DB_URL); runs public.suggest_take only');
    end if;
  end if;
end $$;
alter role suggest_route set statement_timeout = '3s';
alter role suggest_route set idle_in_transaction_session_timeout = '5s';
grant usage on schema public to suggest_route;

create or replace function public.suggest_take(
  p_visitor text, p_per_minute integer, p_per_hour integer, p_per_day integer, p_places boolean
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_places jsonb;
begin
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

revoke execute on function public.suggest_take(text, integer, integer, integer, boolean) from public, anon, authenticated;
grant execute on function public.suggest_take(text, integer, integer, integer, boolean) to suggest_route, service_role;

comment on function public.suggest_take(text, integer, integer, integer, boolean) is
  'Speed 2 part A: the suggestion limits of one visitor and, when p_places, one Places Autocomplete request from the day''s cap, in one round trip. Runs for the role suggest_route (the kabsi.co route /api/suggest) and the service role only.';
