-- PILOT-READY (R-165): the replay route keeps the last report of each scenario, because the database's HTTP call gives up after
-- 20 seconds and a long scenario (launch_16_18) takes longer. Staff read it with a select. Fictional phones only (masked in the report).
create table if not exists public.qa_replay_reports (
  scenario text primary key,
  report jsonb not null,
  finished_at timestamptz not null default now()
);
alter table public.qa_replay_reports enable row level security;
revoke all on public.qa_replay_reports from public, anon, authenticated;
