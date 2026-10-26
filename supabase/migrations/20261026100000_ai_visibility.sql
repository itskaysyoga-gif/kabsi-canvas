-- V2 (master plan 27.3 item 2, 27.4, 27.10, 28.6 Scout, 30.10 points 1, 2 and 9): AI Visibility. Prompts in customers' words,
-- the runs on ChatGPT, Perplexity and Gemini, and what each answer said about the business: named or not, position,
-- competitors named, sources cited (domain and title only) and the cost of the call (25.8). Kept while the business uses
-- Kabsi; deleted 30 days after it leaves. Gemini rows never hold the answer text and are deleted after 90 days, because
-- Google's Additional Terms for Grounding with Google Maps allow nothing longer (docs/GOOGLE-ARCHITECTURE.md, kabsi-data-providers).
-- Additive: new tables, functions, settings and cron jobs; one existing purge function gains the AI tables.

-- 1. The questions a business is asked about ----------------------------------------------------------------------------
create table public.ai_visibility_prompts (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.locations(id) on delete cascade,
  text text not null check (char_length(text) between 8 and 120),
  kind text not null default 'suggested' check (kind in ('suggested', 'owner')),
  cadence text not null default 'monthly' check (cadence in ('monthly', 'biweekly')),
  active boolean not null default true,
  confirmed_at timestamptz,                -- the owner's yes (the keyword confirm on WhatsApp, 13b part 2)
  next_run_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create unique index ai_visibility_prompts_one on public.ai_visibility_prompts(location_id, lower(text));
create index ai_visibility_prompts_due on public.ai_visibility_prompts(next_run_at) where active and confirmed_at is not null;

-- 2. One answer from one provider ------------------------------------------------------------------------------------------
create table public.ai_visibility_runs (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.locations(id) on delete cascade,
  prompt_id uuid not null references public.ai_visibility_prompts(id) on delete cascade,
  provider text not null check (provider in ('chatgpt', 'perplexity', 'gemini')),
  model text,
  source text not null default 'mock' check (source in ('mock', 'live')),
  state text not null default 'queued' check (state in ('queued', 'done', 'failed')),
  run_at timestamptz,                      -- when the answer came back
  named boolean,
  position smallint check (position between 1 and 50),
  competitors jsonb not null default '[]', -- [{name, key, matched}] matched to the business's competitors where possible
  sources jsonb not null default '[]',     -- [{domain, title}] only; never a URL path or a snippet
  source_count smallint not null default 0,
  cost_micros integer not null default 0,
  error text,
  expires_at timestamptz,                  -- Gemini: 90 days (Google's terms); null elsewhere
  created_at timestamptz not null default now()
);
create index ai_visibility_runs_loc on public.ai_visibility_runs(location_id, run_at desc) where state = 'done';
create index ai_visibility_runs_prompt on public.ai_visibility_runs(prompt_id);
create index ai_visibility_runs_expiry on public.ai_visibility_runs(expires_at) where expires_at is not null;

-- The answer text, kept only where the provider's terms allow (ChatGPT and Perplexity through DataForSEO).
create table public.ai_visibility_answers (
  run_id uuid primary key references public.ai_visibility_runs(id) on delete cascade,
  location_id uuid not null references public.locations(id) on delete cascade,
  answer text not null check (char_length(answer) <= 12000)
);

create or replace function private.ai_visibility_answers_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.ai_visibility_runs where id = new.run_id and provider = 'gemini') then
    raise exception 'gemini_answer_not_kept' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger ai_visibility_answers_guard before insert or update on public.ai_visibility_answers for each row execute function private.ai_visibility_answers_guard();

-- 3. Who reads what: the business's own members and staff; writes only through the visibility function -----------------
do $$
declare t text;
begin
  foreach t in array array['ai_visibility_prompts', 'ai_visibility_runs', 'ai_visibility_answers'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select on public.%I to authenticated', t);
    execute format('create policy members_read on public.%I for select to authenticated using (public.is_member(location_id) or (select public.is_staff()))', t);
  end loop;
end $$;

-- 4. Settings: mock by default, a monthly cap for AI Visibility (DataForSEO LLM Responses and Gemini together) ------------
insert into public.app_settings (key, value) values
  ('ai_visibility_mode', 'mock'),
  ('ai_visibility_gemini', 'off'),        -- off until lane R decides (Google's terms; see the skill)
  ('ai_visibility_free_scan', 'off'),     -- V4 switches the free scan's one AI check on (28.1)
  ('provider_cap_ai_visibility_usd', '5')
on conflict (key) do nothing;

-- 5. Cost per provider for the staff page (25.8, unit economics) ----------------------------------------------------------
create or replace function public.ai_visibility_spend(p_days int default 30) returns jsonb
language sql stable security definer set search_path = '' as $$
  select case when (select public.is_staff()) or auth.role() = 'service_role' then
    coalesce((select jsonb_object_agg(provider, jsonb_build_object('runs', n, 'micros', micros))
                from (select provider, count(*) as n, sum(cost_micros) as micros from public.ai_visibility_runs
                       where state = 'done' and source = 'live' and run_at > now() - make_interval(days => p_days) group by provider) x), '{}'::jsonb)
  else null end
$$;
revoke all on function public.ai_visibility_spend(int) from public, anon;
grant execute on function public.ai_visibility_spend(int) to authenticated, service_role;

-- 6. Due prompts wake the function every 15 minutes; nothing due, no call -------------------------------------------------
create or replace function private.ai_visibility_tick() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.ai_visibility_prompts where active and confirmed_at is not null and next_run_at <= now()) then
    perform public.call_internal('visibility/ai-tick');
  end if;
end $$;

-- 7. Retention: Gemini rows after 90 days; everything 30 days after the business leaves (30.10.9) ---------------------------
create or replace function private.purge_ai_expired() returns integer
language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  delete from public.ai_visibility_runs where expires_at is not null and expires_at < now();
  get diagnostics n = row_count;
  return n;
end $$;

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
  delete from public.ai_visibility_prompts where location_id = any(v_locs); -- its runs and answers go with it
  return jsonb_build_object('locations', cardinality(v_locs), 'scans', v_scans);
end $$;

revoke all on function private.ai_visibility_tick(), private.purge_ai_expired(), private.ai_visibility_answers_guard() from public, anon, authenticated;

select cron.schedule('kabsi_ai_visibility_tick', '*/15 * * * *', $$select private.ai_visibility_tick()$$);
select cron.schedule('kabsi_purge_ai_expired', '19 3 * * *', $$select private.purge_ai_expired()$$);
