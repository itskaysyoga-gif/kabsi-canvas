-- Phase 8: weekly report (D222). Facts only; rating comes from Google Places (public rating + count).
create table public.rating_snapshots (
  location_id uuid not null references public.locations(id) on delete cascade,
  taken_on date not null,
  rating numeric(2,1),
  review_count integer,
  created_at timestamptz not null default now(),
  primary key (location_id, taken_on)
);
alter table public.rating_snapshots enable row level security;
revoke all on public.rating_snapshots from anon, authenticated;
grant select on public.rating_snapshots to authenticated;
create policy members_read_snapshots on public.rating_snapshots for select to authenticated
  using (public.is_member(location_id) or (select public.is_staff()));

create table public.weekly_reports (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.locations(id) on delete cascade,
  week_of date not null,               -- local date of the Monday the report was sent
  data jsonb not null,
  created_at timestamptz not null default now(),
  unique (location_id, week_of)
);
alter table public.weekly_reports enable row level security;
revoke all on public.weekly_reports from anon, authenticated;
grant select on public.weekly_reports to authenticated;
create policy members_read_reports on public.weekly_reports for select to authenticated
  using (public.is_member(location_id) or (select public.is_staff()));
create index weekly_reports_loc_idx on public.weekly_reports(location_id, week_of desc);
