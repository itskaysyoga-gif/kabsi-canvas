-- APP-3 review (26 Nov 2026): a draft with no publishing time belongs to the month it was made, but one saved late on a
-- month's last day must not expire minutes later. Such a draft expires only when its month has ended and it is at least
-- 7 days old. A draft with a publishing time is unchanged: it expires at the end of the month it was planned for.
create or replace function private.expire_stale_items() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_posts integer := 0; v_months integer := 0; v_questions integer := 0;
begin
  -- The tasks first, so the posts' own task sync (detect_post_drafts) finds nothing open to close as 'done'.
  with stale as (
    select p.id from public.gbp_posts p join public.locations l on l.id = p.location_id
     where p.state = 'draft'
       and to_char(coalesce(p.publish_at, p.created_at) at time zone coalesce(l.time_zone, 'UTC'), 'YYYY-MM')
           < to_char(now() at time zone coalesce(l.time_zone, 'UTC'), 'YYYY-MM')
       and (p.publish_at is not null or p.created_at < now() - interval '7 days')
  ), closed as (
    update public.tasks t set state = 'expired', resolved_at = now(), snooze_until = null
      from stale s
     where t.kind = 'post' and t.source_type = 'gbp_post' and t.source_id = s.id::text
       and t.state in ('open', 'snoozed', 'approved')
    returning 1
  )
  select count(*) into v_posts from closed;

  update public.tasks t set state = 'expired', resolved_at = now(), snooze_until = null
    from public.locations l
   where l.id = t.location_id and t.kind = 'post' and t.source_type = 'post_month'
     and t.state in ('open', 'snoozed', 'approved')
     and t.source_id < to_char(now() at time zone coalesce(l.time_zone, 'UTC'), 'YYYY-MM');
  get diagnostics v_months = row_count;

  update public.tasks t set state = 'expired', resolved_at = now(), snooze_until = null
    from public.locations l
   where l.id = t.location_id and t.kind = 'post' and t.source_type = 'post_question'
     and t.state in ('open', 'snoozed')
     and t.source_id ~ '^\d{4}-\d{2}$'
     and now() > greatest(t.created_at,
                          (to_date(t.source_id || '-01', 'YYYY-MM-DD')::timestamp at time zone coalesce(l.time_zone, 'UTC')))
                 + interval '14 days';
  get diagnostics v_questions = row_count;

  update public.gbp_posts p set state = 'expired'
    from public.locations l
   where l.id = p.location_id and p.state = 'draft'
     and to_char(coalesce(p.publish_at, p.created_at) at time zone coalesce(l.time_zone, 'UTC'), 'YYYY-MM')
         < to_char(now() at time zone coalesce(l.time_zone, 'UTC'), 'YYYY-MM')
     and (p.publish_at is not null or p.created_at < now() - interval '7 days');

  return jsonb_build_object('post_tasks', v_posts, 'month_tasks', v_months, 'questions', v_questions);
end $$;
revoke execute on function private.expire_stale_items() from public, anon, authenticated;
