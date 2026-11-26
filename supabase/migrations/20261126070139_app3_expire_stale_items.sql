-- APP-3 item 3 (R-169, 26 Nov 2026): stale items leave Home. A post planned for a month that has ended expires at the end of
-- that month (its month is its publishing time, else when it was made, on the business's own clock: the same rule as the
-- Posts page's monthOf). An unanswered "Anything new this month?" expires 14 days after it was asked, counted from the first
-- day of the month it is about when it was asked early. Expired items leave Home and the waiting count (their tasks are
-- closed as 'expired'), stay on the Posts page under Older, and nothing is published from them: approve_publication takes
-- only a 'draft' post, and an expired post is 'expired'. An expired question is not asked again for the same month.
-- Runs every hour and once now (Yawmiyati's October post and the 34 day question drop off).

alter table public.gbp_posts drop constraint if exists gbp_posts_state_check;
alter table public.gbp_posts add constraint gbp_posts_state_check
  check (state = any (array['draft', 'publishing', 'posted', 'skipped', 'failed', 'removing', 'removed', 'expired']));

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
         < to_char(now() at time zone coalesce(l.time_zone, 'UTC'), 'YYYY-MM');

  return jsonb_build_object('post_tasks', v_posts, 'month_tasks', v_months, 'questions', v_questions);
end $$;
revoke execute on function private.expire_stale_items() from public, anon, authenticated;

-- The care routine asks its question every run; a question that expired unanswered is not asked again for that month.
create or replace function public.post_question(p_location uuid, p_month text, p_question text)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if p_month !~ '^\d{4}-\d{2}$' then raise exception 'bad_month'; end if;
  if exists (select 1 from public.tasks where location_id = p_location and dedupe_key = 'post_question:' || p_month
              and state = 'expired') then
    return false;
  end if;
  return private.task_put(p_location, 'post', 'post_question', p_month, 'nice', left(p_question, 200),
    'Kabsi writes posts only from what is true about your business. Tell it one thing and it prepares the post for you to approve.',
    'Answer on Posts.', jsonb_build_object('month', p_month), null, 'post_question:' || p_month);
end $$;

select cron.unschedule(jobid) from cron.job where jobname = 'kabsi_expire_stale_items';
select cron.schedule('kabsi_expire_stale_items', '17 * * * *', $job$select private.expire_stale_items()$job$);
select private.expire_stale_items();
