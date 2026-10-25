-- V1 (master plan 27.3 items 1, 3 and 4; 28.2; 30.10 points 2, 3 and 9; 27.10): the Visibility Map, Competitor Watch
-- and the category check. Every rank and competitor row here comes from DataForSEO's public Google Maps results,
-- the business's own position included; nothing from the Business Profile and nothing from Places but place_id
-- (30.10.2 and 30.10.3). Kept while the business uses Kabsi; deleted 30 days after it leaves (30.10.9).
-- Additive: new tables, functions, settings and cron jobs. Nothing existing is changed or dropped.

-- 1. The searches a business tracks -----------------------------------------------------------------------------------
create table public.visibility_keywords (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.locations(id) on delete cascade,
  keyword text not null check (char_length(keyword) between 2 and 80),
  radius_km numeric(4,1) not null check (radius_km between 0.5 and 20),
  center_lat double precision not null check (center_lat between -90 and 90),
  center_lng double precision not null check (center_lng between -180 and 180),
  -- Who the business is in DataForSEO's results (public identifiers only).
  self_title text not null,
  self_cid text,
  self_place_id text,
  cadence text not null default 'monthly' check (cadence in ('monthly', 'weekly')),
  active boolean not null default true,
  confirmed_at timestamptz,
  next_run_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create unique index visibility_keywords_one on public.visibility_keywords(location_id, lower(keyword));
create index visibility_keywords_due on public.visibility_keywords(next_run_at) where active;

-- 2. One grid run -----------------------------------------------------------------------------------------------------
create table public.visibility_scans (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.locations(id) on delete cascade,
  keyword_id uuid references public.visibility_keywords(id) on delete cascade,
  keyword text not null,
  radius_km numeric(4,1) not null,
  center_lat double precision not null,
  center_lng double precision not null,
  zoom numeric(4,2) not null,
  grid_size smallint not null default 7 check (grid_size between 3 and 9),
  source text not null check (source in ('mock', 'live')),
  state text not null default 'queued' check (state in ('queued', 'done', 'failed')),
  first boolean not null default false,
  average_rank numeric(4,1),
  top3 smallint,
  ranked smallint,
  centre_rank smallint,
  beats jsonb,
  competitors jsonb,
  category_check jsonb,
  message jsonb,
  error text,
  cost_micros integer not null default 0,
  created_at timestamptz not null default now(),
  done_at timestamptz
);
create index visibility_scans_loc on public.visibility_scans(location_id, created_at desc);
create index visibility_scans_queued on public.visibility_scans(created_at) where state = 'queued';

create table public.visibility_points (
  scan_id uuid not null references public.visibility_scans(id) on delete cascade,
  row smallint not null,
  col smallint not null,
  lat double precision not null,
  lng double precision not null,
  task_id text,
  rank smallint check (rank between 1 and 20),  -- null: not in the top 20
  items jsonb,                                  -- the kept fields of the top 20 (dataforseo.ts MapsItem)
  done_at timestamptz,
  primary key (scan_id, row, col)
);
create index visibility_points_task on public.visibility_points(task_id) where done_at is null;

-- 3. Competitor Watch -------------------------------------------------------------------------------------------------
create table public.competitor_picks (
  location_id uuid not null references public.locations(id) on delete cascade,
  key text not null,          -- cid:..., pid:... or t:<name> (dataforseo.ts keyOf)
  name text not null,
  cid text,
  place_id text,
  picked_at timestamptz not null default now(),
  primary key (location_id, key)
);

create table public.competitor_snapshots (
  location_id uuid not null references public.locations(id) on delete cascade,
  key text not null,
  taken_on date not null,
  is_self boolean not null default false,
  name text not null,
  rating numeric(2,1),
  reviews integer,
  photos integer,
  category text,
  categories text[] not null default '{}',
  primary key (location_id, key, taken_on)
);

-- 4. Who reads what: the business's own members and staff; writes only through the visibility function -----------------
do $$
declare t text;
begin
  foreach t in array array['visibility_keywords', 'visibility_scans', 'competitor_picks', 'competitor_snapshots'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select on public.%I to authenticated', t);
    execute format('create policy members_read on public.%I for select to authenticated using (public.is_member(location_id) or (select public.is_staff()))', t);
  end loop;
end $$;

alter table public.visibility_points enable row level security;
revoke all on public.visibility_points from anon, authenticated;
grant select on public.visibility_points to authenticated;
create policy members_read on public.visibility_points for select to authenticated using (
  exists (select 1 from public.visibility_scans s where s.id = scan_id and (public.is_member(s.location_id) or (select public.is_staff())))
);

-- 5. Data provider spend and the monthly cap (27.10) ------------------------------------------------------------------
create table public.provider_spend (
  provider text not null,
  month date not null,
  calls integer not null default 0,
  micros bigint not null default 0,
  alerted_80 boolean not null default false,
  primary key (provider, month)
);
alter table public.provider_spend enable row level security;
revoke all on public.provider_spend from anon, authenticated;
grant select on public.provider_spend to authenticated;
create policy staff_read on public.provider_spend for select to authenticated using ((select public.is_staff()));

insert into public.app_settings (key, value) values
  ('dataforseo_mode', 'mock'),
  ('provider_cap_dataforseo_usd', '10')
on conflict (key) do nothing;

-- May this much more be spent this month? Records nothing.
create or replace function public.provider_spend_room(p_provider text, p_micros bigint) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select micros from public.provider_spend
                    where provider = p_provider and month = date_trunc('month', now())::date), 0) + p_micros
         <= coalesce((select (value::numeric * 1000000)::bigint from public.app_settings
                       where key = 'provider_cap_' || p_provider || '_usd'), 0)
$$;

-- Record spend. Returns true once, the first time the month passes 80 percent of the cap (the staff alert).
create or replace function public.provider_spend_add(p_provider text, p_calls int, p_micros bigint) returns boolean
language plpgsql security definer set search_path = '' as $$
declare v_month date := date_trunc('month', now())::date; v_total bigint; v_alerted boolean;
  v_cap bigint := coalesce((select (value::numeric * 1000000)::bigint from public.app_settings
                             where key = 'provider_cap_' || p_provider || '_usd'), 0);
begin
  insert into public.provider_spend (provider, month, calls, micros) values (p_provider, v_month, p_calls, p_micros)
  on conflict (provider, month) do update set calls = provider_spend.calls + excluded.calls, micros = provider_spend.micros + excluded.micros
  returning micros, alerted_80 into v_total, v_alerted;
  if not v_alerted and v_cap > 0 and v_total * 10 >= v_cap * 8 then
    update public.provider_spend set alerted_80 = true where provider = p_provider and month = v_month;
    return true;
  end if;
  return false;
end $$;

revoke all on function public.provider_spend_room(text, bigint), public.provider_spend_add(text, int, bigint) from public, anon, authenticated;
grant execute on function public.provider_spend_room(text, bigint), public.provider_spend_add(text, int, bigint) to service_role;

-- 6. Due work wakes the function every 5 minutes; nothing due, no call ---------------------------------------------
create or replace function private.visibility_tick() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.visibility_keywords where active and confirmed_at is not null and next_run_at <= now())
     or exists (select 1 from public.visibility_scans where state = 'queued') then
    perform public.call_internal('visibility/tick');
  end if;
end $$;

-- 7. Retention (30.10.9): 30 days after a business leaves, its visibility results go -------------------------------
create or replace function private.purge_visibility_after_leaving() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_locs uuid[]; v_scans int;
begin
  select coalesce(array_agg(id), '{}') into v_locs from public.locations
   where (access_removed_at < now() - interval '30 days'
          and (access_granted_at is null or access_granted_at < access_removed_at))
      or (access_lost_at < now() - interval '30 days' and access_granted_at is null)
      or (status = 'disabled' and updated_at < now() - interval '30 days');
  if cardinality(v_locs) = 0 then return jsonb_build_object('locations', 0); end if;
  delete from public.visibility_scans where location_id = any(v_locs);
  get diagnostics v_scans = row_count;
  delete from public.visibility_keywords where location_id = any(v_locs);
  delete from public.competitor_picks where location_id = any(v_locs);
  delete from public.competitor_snapshots where location_id = any(v_locs);
  return jsonb_build_object('locations', cardinality(v_locs), 'scans', v_scans);
end $$;

revoke all on function private.visibility_tick(), private.purge_visibility_after_leaving() from public, anon, authenticated;

select cron.schedule('kabsi_visibility_tick', '*/5 * * * *', $$select private.visibility_tick()$$);
select cron.schedule('kabsi_purge_visibility', '59 2 * * *', $$select private.purge_visibility_after_leaving()$$);
