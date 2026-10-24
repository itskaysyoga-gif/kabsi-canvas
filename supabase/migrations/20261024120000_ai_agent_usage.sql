-- Session 19 rest (master plan 28.6 and 25.8): AI cost per agent per business. One row per UTC day, agent, model and
-- business (business empty for Nora on the website): jobs (one drafting job or one Nora turn), tokens with cache reads and writes apart (26.1), and the
-- cost in millionths of a US dollar from Kabsi's price table (ai/agents.ts). ai_usage stays as the daily budget.
-- Additive only: a new table and one service-only function.

create table public.ai_agent_usage (
  day date not null default (now() at time zone 'utc')::date,
  agent text not null check (agent in ('reply', 'guard', 'growth', 'insights', 'scout', 'nora')),
  model text not null,
  location_id uuid references public.locations(id) on delete cascade,
  jobs integer not null default 0,
  input_tokens bigint not null default 0,
  output_tokens bigint not null default 0,
  cache_read_tokens bigint not null default 0,
  cache_write_tokens bigint not null default 0,
  cost_micros bigint not null default 0,
  updated_at timestamptz not null default now()
);
create unique index ai_agent_usage_key on public.ai_agent_usage
  (day, agent, model, coalesce(location_id, '00000000-0000-0000-0000-000000000000'::uuid));
create index ai_agent_usage_location_idx on public.ai_agent_usage (location_id, day);
alter table public.ai_agent_usage enable row level security;
revoke all on public.ai_agent_usage from anon, authenticated;
create policy staff_read_ai_agent_usage on public.ai_agent_usage for select to authenticated using ((select public.is_staff()));
grant select on public.ai_agent_usage to authenticated;

create or replace function public.ai_agent_usage_add(p_location uuid, p_agent text, p_model text, p_input bigint, p_output bigint,
  p_cache_read bigint, p_cache_write bigint, p_cost_micros bigint) returns void
language sql security definer set search_path = '' as $$
  insert into public.ai_agent_usage (day, agent, model, location_id, jobs, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens, cost_micros)
  values ((now() at time zone 'utc')::date, p_agent, left(p_model, 80), p_location, 1, greatest(p_input, 0), greatest(p_output, 0),
          greatest(p_cache_read, 0), greatest(p_cache_write, 0), greatest(p_cost_micros, 0))
  on conflict (day, agent, model, coalesce(location_id, '00000000-0000-0000-0000-000000000000'::uuid)) do update set
    jobs = public.ai_agent_usage.jobs + 1,
    input_tokens = public.ai_agent_usage.input_tokens + excluded.input_tokens,
    output_tokens = public.ai_agent_usage.output_tokens + excluded.output_tokens,
    cache_read_tokens = public.ai_agent_usage.cache_read_tokens + excluded.cache_read_tokens,
    cache_write_tokens = public.ai_agent_usage.cache_write_tokens + excluded.cache_write_tokens,
    cost_micros = public.ai_agent_usage.cost_micros + excluded.cost_micros,
    updated_at = now();
$$;

revoke all on function public.ai_agent_usage_add(uuid, text, text, bigint, bigint, bigint, bigint, bigint) from public, anon, authenticated;
grant execute on function public.ai_agent_usage_add(uuid, text, text, bigint, bigint, bigint, bigint, bigint) to service_role;
