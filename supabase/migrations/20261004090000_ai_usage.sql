-- P0.1-04 (K-100, R-21): daily AI budget. One row per business per UTC day: generations (drafting jobs: a review
-- reply or a post, each with its classify and check calls) and the tokens they used. Two caps in app_settings:
-- per business and global. When the global cap is reached, #kabsi-alerts gets one alert that day.
-- Additive only: a new table, two settings, two service-only functions.

create table public.ai_usage (
  location_id uuid not null references public.locations(id) on delete cascade,
  day date not null default (now() at time zone 'utc')::date,
  generations integer not null default 0,
  input_tokens bigint not null default 0,
  output_tokens bigint not null default 0,
  updated_at timestamptz not null default now(),
  primary key (location_id, day)
);
create index ai_usage_day_idx on public.ai_usage (day);
alter table public.ai_usage enable row level security;
revoke all on public.ai_usage from anon, authenticated;
create policy staff_read_ai_usage on public.ai_usage for select to authenticated using ((select public.is_staff()));
grant select on public.ai_usage to authenticated;

insert into public.app_settings (key, value) values
  ('ai_daily_cap_business', '60'),
  ('ai_daily_cap_global', '3000')
on conflict (key) do nothing;

-- Takes one generation for this business today. Returns 'ok', or 'business' / 'global' when that cap is used up
-- (nothing is counted then). The global count is serialised with an advisory lock so two jobs cannot both pass it.
create or replace function public.ai_budget_take(p_location uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_day date := (now() at time zone 'utc')::date;
  v_cap_business int := coalesce((select value::int from public.app_settings where key = 'ai_daily_cap_business'), 60);
  v_cap_global int := coalesce((select value::int from public.app_settings where key = 'ai_daily_cap_global'), 3000);
  v_global int;
  v_mine int;
begin
  perform pg_advisory_xact_lock(hashtext('ai_budget_take'));
  select coalesce(sum(generations), 0) into v_global from public.ai_usage where day = v_day;
  if v_global >= v_cap_global then
    perform public.ops_emit('ai_global_cap', 'alerts', ':warning: Daily AI budget reached',
      'Kabsi stopped new drafts for today: ' || v_global || ' drafting jobs (cap ' || v_cap_global || '). Drafts start again at 00:00 UTC. Raise ai_daily_cap_global in app_settings if this is real demand.',
      '[]', '[]', 'ai_global_cap:' || v_day);
    return 'global';
  end if;
  select generations into v_mine from public.ai_usage where location_id = p_location and day = v_day;
  if coalesce(v_mine, 0) >= v_cap_business then return 'business'; end if;
  insert into public.ai_usage (location_id, day, generations) values (p_location, v_day, 1)
  on conflict (location_id, day) do update set generations = public.ai_usage.generations + 1, updated_at = now();
  return 'ok';
end $$;

-- Adds the tokens a drafting job used (after it ran).
create or replace function public.ai_usage_add(p_location uuid, p_input bigint, p_output bigint) returns void
language sql security definer set search_path = '' as $$
  insert into public.ai_usage (location_id, day, input_tokens, output_tokens)
  values (p_location, (now() at time zone 'utc')::date, greatest(p_input, 0), greatest(p_output, 0))
  on conflict (location_id, day) do update set
    input_tokens = public.ai_usage.input_tokens + excluded.input_tokens,
    output_tokens = public.ai_usage.output_tokens + excluded.output_tokens,
    updated_at = now();
$$;

revoke all on function public.ai_budget_take(uuid) from public, anon, authenticated;
revoke all on function public.ai_usage_add(uuid, bigint, bigint) from public, anon, authenticated;
grant execute on function public.ai_budget_take(uuid) to service_role;
grant execute on function public.ai_usage_add(uuid, bigint, bigint) to service_role;
