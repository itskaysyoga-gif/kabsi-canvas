-- Check 2 (1 Nov 2026): suggestions while the visitor types in the free check use Places Autocomplete (New). Its requests
-- are counted in public.places_usage (kind 'autocomplete', already allowed there) and have their own daily cap,
-- app_settings.places_autocomplete_daily_cap, 300 by default. At the cap the box stops suggesting and the visitor searches
-- then picks, as before; the other Places kinds keep app_settings.places_daily_cap. Additive: a setting row, one reader
-- function, and places_take replaced with the same signature, grants and alerts (it only picks the cap by kind).

insert into public.app_settings (key, value) values ('places_autocomplete_daily_cap', '300')
on conflict (key) do nothing;

-- The Autocomplete cap. A missing or non-numeric setting falls back to 300, never to "no cap".
create or replace function private.places_autocomplete_cap() returns integer
language sql stable security definer set search_path = '' as $$
  select coalesce((select case when value ~ '^[0-9]{1,6}$' then value::integer end
                     from public.app_settings where key = 'places_autocomplete_daily_cap'), 300)
$$;
revoke execute on function private.places_autocomplete_cap() from public, anon, authenticated, service_role;

create or replace function public.places_take(p_kind text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_day date := (now() at time zone 'UTC')::date;
  v_cap integer;
  v_calls integer;
  v_effect text;
begin
  if p_kind not in ('search', 'details', 'autocomplete') then raise exception 'places_take: unknown kind %', p_kind; end if;
  v_cap := case when p_kind = 'autocomplete' then private.places_autocomplete_cap() else private.places_cap() end;
  v_effect := case when p_kind = 'autocomplete' then 'the free check box stops suggesting and the visitor searches then picks'
                   else 'the search tools show "Back soon"' end;
  insert into public.places_usage (day, kind) values (v_day, p_kind) on conflict do nothing;
  select calls into v_calls from public.places_usage where day = v_day and kind = p_kind for update;
  if v_calls >= v_cap then
    return jsonb_build_object('allowed', false, 'used', v_calls, 'cap', v_cap);
  end if;
  update public.places_usage set calls = calls + 1, updated_at = now()
   where day = v_day and kind = p_kind returning calls into v_calls;
  if v_calls = ceil(v_cap * 0.8)::integer and v_calls < v_cap then
    perform public.ops_emit('places_80', 'alerts', ':warning: Places requests at 80 percent of today''s cap',
      v_calls || ' of ' || v_cap || ' ' || p_kind || ' requests used today (UTC). At ' || v_cap || ', ' || v_effect || ' until tomorrow.',
      '[]'::jsonb, public.ops_staff_btn('Job health'), 'places_80:' || p_kind || ':' || v_day);
  end if;
  if v_calls = v_cap then
    perform public.ops_emit('places_cap', 'alerts', ':red_circle: Places daily cap reached for ' || p_kind,
      v_cap || ' ' || p_kind || ' requests used today (UTC). Kabsi sends no more until tomorrow: ' || v_effect || '. Raise '
        || case when p_kind = 'autocomplete' then 'app_settings.places_autocomplete_daily_cap' else 'app_settings.places_daily_cap' end
        || ' (and the Google Cloud quota with it) if this is real demand.',
      '[]'::jsonb, public.ops_staff_btn('Job health'), 'places_cap:' || p_kind || ':' || v_day);
  end if;
  return jsonb_build_object('allowed', true, 'used', v_calls, 'cap', v_cap);
end $$;

comment on function private.places_autocomplete_cap() is
  'Check 2: the daily cap of Places Autocomplete requests (app_settings.places_autocomplete_daily_cap, default 300).';
