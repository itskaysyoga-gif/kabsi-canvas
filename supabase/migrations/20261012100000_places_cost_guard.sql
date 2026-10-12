-- P0.2-06: Places cost guard (K-100, K-63, G-16).
--
-- 1. public.places_usage: one counter per day and kind of Places request ('search' = Text Search, 'details' = Place
--    Details, 'autocomplete'). places_take(kind) is asked before every Places request: it counts the request and
--    answers {"allowed": true}, or {"allowed": false} once the day's cap is reached (the kill switch: the tool shows
--    "Back soon" until the next UTC day). The cap is app_settings.places_daily_cap, 100 to match the quota set in Google
--    Cloud. Two Slack alerts through ops_emit: at 80 percent of the cap and when the cap is reached.
-- 2. public.places_cache: the Place Details answer for one place ID and one field mask, kept 24 hours. A cache hit
--    makes no Places request and takes nothing from the cap. Rows older than 24 hours are blanked every hour (only the
--    place ID stays, which Google's terms allow keeping), so no Google content is kept beyond 24 hours.
--
-- Service role only, like the limiter tables. Additive: two new tables and new functions; nothing calls them until the
-- code in the same pull request is deployed.

insert into public.app_settings (key, value) values ('places_daily_cap', '100')
on conflict (key) do nothing;

create table public.places_usage (
  day date not null,
  kind text not null check (kind in ('search', 'details', 'autocomplete')),
  calls integer not null default 0 check (calls >= 0),
  updated_at timestamptz not null default now(),
  primary key (day, kind)
);
alter table public.places_usage enable row level security;
revoke all on public.places_usage from public, anon, authenticated, service_role;
grant select on public.places_usage to service_role;

create table public.places_cache (
  place_id text not null,
  field_mask text not null,
  data jsonb,
  fetched_at timestamptz not null default now(),
  primary key (place_id, field_mask)
);
alter table public.places_cache enable row level security;
revoke all on public.places_cache from public, anon, authenticated, service_role;
grant select on public.places_cache to service_role;

-- The day's cap. A missing or non-numeric setting falls back to 100, never to "no cap".
create function private.places_cap() returns integer
language sql stable security definer set search_path = '' as $$
  select coalesce((select case when value ~ '^[0-9]{1,6}$' then value::integer end
                     from public.app_settings where key = 'places_daily_cap'), 100)
$$;

-- Count one Places request, or refuse it when the day's cap is reached.
create function public.places_take(p_kind text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_day date := (now() at time zone 'UTC')::date; v_cap integer := private.places_cap(); v_calls integer;
begin
  if p_kind not in ('search', 'details', 'autocomplete') then raise exception 'places_take: unknown kind %', p_kind; end if;
  insert into public.places_usage (day, kind) values (v_day, p_kind) on conflict do nothing;
  select calls into v_calls from public.places_usage where day = v_day and kind = p_kind for update;
  if v_calls >= v_cap then
    return jsonb_build_object('allowed', false, 'used', v_calls, 'cap', v_cap);
  end if;
  update public.places_usage set calls = calls + 1, updated_at = now()
   where day = v_day and kind = p_kind returning calls into v_calls;
  if v_calls = ceil(v_cap * 0.8)::integer and v_calls < v_cap then
    perform public.ops_emit('places_80', 'alerts', ':warning: Places requests at 80 percent of today''s cap',
      v_calls || ' of ' || v_cap || ' ' || p_kind || ' requests used today (UTC). At ' || v_cap
        || ' the search tools show "Back soon" until tomorrow.',
      '[]'::jsonb, public.ops_staff_btn('Job health'), 'places_80:' || p_kind || ':' || v_day);
  end if;
  if v_calls = v_cap then
    perform public.ops_emit('places_cap', 'alerts', ':red_circle: Places daily cap reached, search tools show "Back soon"',
      v_cap || ' ' || p_kind || ' requests used today (UTC). Kabsi sends no more until tomorrow. Raise '
        || 'app_settings.places_daily_cap and the Google Cloud quota together if this is real demand.',
      '[]'::jsonb, public.ops_staff_btn('Job health'), 'places_cap:' || p_kind || ':' || v_day);
  end if;
  return jsonb_build_object('allowed', true, 'used', v_calls, 'cap', v_cap);
end $$;

-- The cached Place Details answer, or null when there is none or it is older than 24 hours.
create function public.places_cache_get(p_place_id text, p_field_mask text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select data from public.places_cache
   where place_id = p_place_id and field_mask = p_field_mask and fetched_at > now() - interval '24 hours'
$$;

create function public.places_cache_put(p_place_id text, p_field_mask text, p_data jsonb) returns void
language sql security definer set search_path = '' as $$
  insert into public.places_cache (place_id, field_mask, data, fetched_at)
  values (p_place_id, p_field_mask, p_data, now())
  on conflict (place_id, field_mask) do update set data = excluded.data, fetched_at = excluded.fetched_at
$$;

-- Hourly: blank cached answers older than 24 hours; returns how many were blanked.
create function private.purge_places_cache() returns integer
language plpgsql security definer set search_path = '' as $$
declare v_n integer;
begin
  update public.places_cache set data = null where data is not null and fetched_at < now() - interval '24 hours';
  get diagnostics v_n = row_count;
  return v_n;
end $$;

revoke execute on function private.places_cap(), private.purge_places_cache() from public, anon, authenticated, service_role;
revoke execute on function public.places_take(text), public.places_cache_get(text, text), public.places_cache_put(text, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.places_take(text), public.places_cache_get(text, text), public.places_cache_put(text, text, jsonb)
  to service_role;

select cron.schedule('kabsi_places_cache_purge', '17 * * * *', $$select private.purge_places_cache()$$);
