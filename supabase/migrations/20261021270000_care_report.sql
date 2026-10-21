-- P0.5-04: the Weekly Care Report (K-28, K-72, K-135, K-136, K-138, K-40).
--
-- Kabsi's own counts in the report come only from the audit log (audit_events): nothing is estimated except the labelled
-- time-saved line, which is the counts times a formula the owner can read. This file adds the one place those counts are
-- made (public.care_report_inputs, service role, called by the weekly job), so a person can run the same query by hand and
-- get the same numbers, and one function that drops Google's numbers from report copies older than 30 days (K-40).
--
--   care_report_inputs       the counts for a window, what needs the owner (at most 3), and the Growth agent's plan
--                            (the Profile Coach's open gaps, at most 3, Essentials and Pro only)
--   clear_old_report_numbers removes the customer activity and the search terms from reports older than 30 days
--
-- Additive: two functions. Nothing is dropped.

create function public.care_report_inputs(p_location uuid, p_from timestamptz, p_to timestamptz, p_tz text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare c jsonb; n jsonb; n_total integer; pl jsonb := '[]'::jsonb;
begin
  if not exists (select 1 from public.locations where id = p_location) then raise exception 'unknown_location'; end if;

  -- Real actions only: a reply prepared, a publication that is live (or with Google for review), a change Kabsi found.
  select jsonb_build_object(
    'replies_prepared', count(*) filter (where e.action = 'reply_drafted' and e.object_type = 'review' and e.result = 'drafted'),
    'replies_published', count(distinct e.after ->> 'publication_id') filter (where e.action = 'publication' and e.object_type = 'review_reply' and e.result in ('live', 'in_review')),
    'posts_published', count(distinct e.after ->> 'publication_id') filter (where e.action = 'publication' and e.object_type = 'local_post' and e.result in ('live', 'in_review')),
    'photos_published', count(distinct e.after ->> 'publication_id') filter (where e.action = 'publication' and e.object_type = 'photo' and e.result in ('live', 'in_review')),
    'photo_batches', count(distinct (e.created_at at time zone p_tz)::date) filter (where e.action = 'publication' and e.object_type = 'photo' and e.result in ('live', 'in_review')),
    'hours_updates', count(distinct e.after ->> 'publication_id') filter (where e.action = 'publication' and e.object_type = 'special_hours' and e.result in ('live', 'in_review')),
    'profile_updates', count(distinct e.after ->> 'publication_id') filter (where e.action = 'publication' and e.object_type = 'listing_revert' and e.result in ('live', 'in_review')),
    'profile_checks', count(*) filter (where e.action = 'google_check' and e.result = 'checked'),
    'changes_found', count(distinct e.object_id) filter (where e.action = 'protection_change' and e.result = 'awaiting_review'),
    'changes_kept', count(distinct e.object_id) filter (where e.action = 'protection_change' and e.result = 'accepted'),
    'changes_put_back', count(distinct e.object_id) filter (where e.action = 'protection_change' and e.result = 'corrected'))
    into c
    from public.audit_events e
   where e.location_id = p_location and e.created_at >= p_from and e.created_at < p_to;

  -- What needs the owner: open tasks, urgent first, never more than three lines. The Profile Coach's gaps are the plan below.
  select count(*) into n_total from public.tasks t
   where t.location_id = p_location and t.state = 'open'
     and not (t.kind = 'profile_gap' and t.dedupe_key like 'profile\_gap:coach\_%');
  select coalesce(jsonb_agg(jsonb_build_object('title', x.title, 'path', private.task_path(x.kind, x.source_id), 'priority', x.priority)
                            order by x.rank, x.created_at), '[]'::jsonb) into n
    from (select t.*, case t.priority when 'urgent' then 0 when 'recommended' then 1 else 2 end as rank
            from public.tasks t
           where t.location_id = p_location and t.state = 'open'
             and not (t.kind = 'profile_gap' and t.dedupe_key like 'profile\_gap:coach\_%')
           order by case t.priority when 'urgent' then 0 when 'recommended' then 1 else 2 end, t.created_at limit 3) x;

  -- The Growth agent's weekly plan: the Coach's open gaps, three at most, for a business on a plan with the checklist.
  if (private.feature_plan(p_location) ->> 'essentials')::boolean then
    select coalesce(jsonb_agg(jsonb_build_object('title', x.title, 'path', private.task_path(x.kind, x.source_id)) order by x.rank, x.created_at), '[]'::jsonb) into pl
      from (select t.*, case t.priority when 'urgent' then 0 when 'recommended' then 1 else 2 end as rank
              from public.tasks t
             where t.location_id = p_location and t.state = 'open' and t.kind = 'profile_gap' and t.dedupe_key like 'profile\_gap:coach\_%'
             order by case t.priority when 'urgent' then 0 when 'recommended' then 1 else 2 end, t.created_at limit 3) x;
  end if;

  return jsonb_build_object('counts', c, 'needs', n, 'needs_total', n_total, 'plan', pl);
end $$;
revoke execute on function public.care_report_inputs(uuid, timestamptz, timestamptz, text) from public, anon, authenticated;
grant execute on function public.care_report_inputs(uuid, timestamptz, timestamptz, text) to service_role;

-- K-40: Google's numbers (the customer activity and the search terms) are not kept past 30 days. Kabsi's own counts stay.
create function public.clear_old_report_numbers() returns integer
language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  update public.weekly_reports set data = data - 'activity' - 'terms'
   where created_at < now() - interval '30 days' and (data ? 'activity' or data ? 'terms');
  get diagnostics n = row_count;
  return n;
end $$;
revoke execute on function public.clear_old_report_numbers() from public, anon, authenticated;
grant execute on function public.clear_old_report_numbers() to service_role;
