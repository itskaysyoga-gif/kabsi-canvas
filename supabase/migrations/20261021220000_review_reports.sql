-- P0.8-11 (K-139): the "Report this review" helper, Pro. Additive.
--
-- public.review_reports keeps where an owner has got to with a review they reported to Google: reported, Google
-- answered, still showing or removed, and one appeal. The owner enters each step (Kabsi cannot see Google's decision
-- through any API it uses). The row holds no review text, no reviewer name and no evidence text: only the category the
-- owner picked, which evidence items they ticked, and the dates. A reminder is due a week after the last step.
--
-- States, in order:  reported -> answered -> still_showing | removed;  still_showing -> appealed (once) -> still_showing | removed.
-- Writes go through the RPCs below (owner or manager, Pro); members read the rows. The foreign keys to locations and
-- reviews carry cascade clauses and are in 20261021220010_review_reports_links.sql, which Hussein runs.

create table public.review_reports (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null,
  review_id uuid not null,
  -- The category the owner picked from Google's list (a short key; the app holds the list and the date it was checked).
  category text not null check (category ~ '^[a-z][a-z_]{2,39}$'),
  -- Keys of the evidence checklist items the owner ticked. Never the text of any evidence.
  evidence text[] not null default '{}',
  state text not null default 'reported' check (state in ('reported', 'answered', 'still_showing', 'removed', 'appealed')),
  reported_at timestamptz not null default now(),
  step_at timestamptz not null default now(),
  answered_at timestamptz,
  appeal_started_at timestamptz,
  closed_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint one_report_per_review unique (review_id)
);
create index review_reports_location_idx on public.review_reports (location_id, state);
create trigger review_reports_updated before update on public.review_reports
  for each row execute function public.set_updated_at();

alter table public.review_reports enable row level security;
revoke all on public.review_reports from public, anon, authenticated;
grant select on public.review_reports to authenticated;
create policy members_read_review_reports on public.review_reports for select to authenticated
  using (public.is_member(location_id) or (select public.is_staff()));

-- The owner says they reported a review to Google. Pro, owner or manager.
create function public.start_review_report(p_review uuid, p_category text, p_evidence text[] default '{}') returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_loc uuid; v_id uuid;
begin
  select location_id into v_loc from public.reviews where id = p_review;
  if v_loc is null or not public.has_location_role(v_loc, array['owner', 'manager']) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if not coalesce((public.feature_access(v_loc) ->> 'pro')::boolean, false) then raise exception 'pro_required'; end if;
  if p_category is null or p_category !~ '^[a-z][a-z_]{2,39}$' then raise exception 'bad_category'; end if;
  if cardinality(coalesce(p_evidence, '{}')) > 12 or exists (select 1 from unnest(coalesce(p_evidence, '{}')) e where e !~ '^[a-z][a-z_]{1,39}$') then
    raise exception 'bad_evidence';
  end if;
  insert into public.review_reports (location_id, review_id, category, evidence, created_by)
  values (v_loc, p_review, p_category, coalesce(p_evidence, '{}'), auth.uid())
  on conflict (review_id) do nothing
  returning id into v_id;
  if v_id is null then raise exception 'already_reported'; end if;
  return v_id;
end $$;

-- One step forward. The order is fixed and an appeal can be started once.
create function public.advance_review_report(p_report uuid, p_to text) returns void
language plpgsql security definer set search_path = '' as $$
declare r public.review_reports;
begin
  select * into r from public.review_reports where id = p_report for update;
  if not found or not public.has_location_role(r.location_id, array['owner', 'manager']) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if not (
    (r.state = 'reported' and p_to = 'answered')
    or (r.state = 'answered' and p_to in ('still_showing', 'removed'))
    or (r.state = 'still_showing' and p_to = 'appealed' and r.appeal_started_at is null)
    or (r.state = 'appealed' and p_to in ('still_showing', 'removed'))
  ) then
    raise exception 'bad_step';
  end if;
  update public.review_reports set
    state = p_to,
    step_at = now(),
    answered_at = case when p_to = 'answered' then now() else answered_at end,
    appeal_started_at = case when p_to = 'appealed' then now() else appeal_started_at end,
    closed_at = case when p_to = 'removed' or (p_to = 'still_showing' and r.state = 'appealed') then now() else null end
   where id = p_report;
end $$;

-- The reports of one business, with whether the one-week reminder is due. Members only.
create function public.list_review_reports(p_location uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not (public.is_member(p_location) or public.is_staff()) then raise exception 'forbidden' using errcode = '42501'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', r.id, 'review_id', r.review_id, 'category', r.category, 'evidence', r.evidence, 'state', r.state,
      'reported_at', r.reported_at, 'step_at', r.step_at, 'appeal_started_at', r.appeal_started_at, 'closed_at', r.closed_at,
      'reminder_due', r.state in ('reported', 'answered', 'appealed') and r.step_at < now() - interval '7 days'
    ) order by r.reported_at desc)
    from public.review_reports r where r.location_id = p_location), '[]'::jsonb);
end $$;

revoke execute on function public.start_review_report(uuid, text, text[]), public.advance_review_report(uuid, text),
  public.list_review_reports(uuid) from public, anon;
grant execute on function public.start_review_report(uuid, text, text[]), public.advance_review_report(uuid, text),
  public.list_review_reports(uuid) to authenticated;
