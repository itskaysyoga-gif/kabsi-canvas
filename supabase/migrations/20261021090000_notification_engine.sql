-- P0.4-09: the notification engine (K-46 as amended by K-57, K-17, R-08).
--
-- 1. public.notifications is the one record of "someone was told", for the bell on Home, for the delivery log of
--    each email and for the daily digest. One row per event per address (dedupe_key plus to_address is unique), so
--    the same event is shown and emailed once however often a job runs. email_state says what became of the email:
--    sending, sent, held (quiet hours, sent at 08:00 local), digest (sent at the business's digest hour), off (the
--    person switched it off), skipped (emails paused, a demo or test address) or failed (tried again by the next
--    call). email_content holds what a held or digested email will say; it is cleared once the email is sent and the
--    notify_due job clears any left past 7 days, so no review text is kept for long (K-113).
-- 2. public.notification_preferences holds only what a person changed: per person, business, category and channel
--    (email or in_app) one choice (default, instant, daily_digest, off). The category list and its defaults live in
--    supabase/functions/_shared/notify-categories.ts; what can never be switched off is checked here too.
-- 3. The browser reads and writes only through four membership-checked functions (my_notification_prefs,
--    set_notification_pref, list_my_notifications, mark_notifications_read). The engine runs in Edge Functions with
--    the service key and uses notification_recipients to find who to tell.
-- 4. emails (the outbox log) gets the category and the notification it carried.
-- 5. private.produce_jobs() offers the notify_due job every 5 minutes once app_settings.notify_due is 'on' (it starts
--    'off' so a dispatcher deployed before this change never meets a job kind it does not know; the session turns it
--    on after the deploy), and from then on hands every unnotified review to the engine at once.
--
-- Additive: new tables, columns and functions. Nothing is taken away and no row is changed. The foreign keys with their
-- cascade clauses are in 20261021090010_notification_engine_links.sql, which Hussein runs in the SQL editor.

-- 1. The record and the bell ------------------------------------------------------------------------------------------

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null,
  user_id uuid,
  to_address text not null check (length(to_address) between 3 and 320),
  category text not null check (category ~ '^[a-z][a-z_]{1,40}$'),
  kind text not null check (kind ~ '^[a-z][a-z0-9_]{1,60}$'),
  dedupe_key text not null check (length(dedupe_key) between 3 and 250),
  title text not null check (length(title) between 1 and 200),
  body text check (length(body) <= 500),
  link text check (link is null or link like '/%'),
  in_app boolean not null default false,
  read_at timestamptz,
  email_state text not null default 'none'
    check (email_state in ('none', 'sending', 'sent', 'held', 'digest', 'off', 'skipped', 'failed')),
  email_due_at timestamptz,
  email_content jsonb check (email_content is null or jsonb_typeof(email_content) = 'object'),
  email_id uuid,
  created_at timestamptz not null default now()
);
comment on table public.notifications is
  'P0.4-09 (K-46): one row per event per address. The bell reads in_app rows; email_state is the delivery log. Titles and bodies never hold review text or a reviewer name.';
create unique index notifications_event on public.notifications (dedupe_key, to_address);
create index notifications_bell on public.notifications (user_id, location_id, created_at desc) where in_app;
create index notifications_due on public.notifications (email_due_at) where email_state in ('held', 'digest');

alter table public.notifications enable row level security;
revoke all on public.notifications from public, anon, authenticated;
create policy own_notifications on public.notifications for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_staff()));
grant select on public.notifications to authenticated;

-- 2. What each person chose ----------------------------------------------------------------------------------------------

create table public.notification_preferences (
  user_id uuid not null,
  location_id uuid not null,
  category text not null check (category ~ '^[a-z][a-z_]{1,40}$'),
  channel text not null check (channel in ('email', 'in_app')),
  frequency text not null check (frequency in ('default', 'instant', 'daily_digest', 'off')),
  updated_at timestamptz not null default now(),
  primary key (user_id, location_id, category, channel),
  constraint in_app_has_no_digest check (channel = 'email' or frequency <> 'daily_digest')
);
comment on table public.notification_preferences is
  'P0.4-09 (K-46): only what a person changed. A missing row means the default for the category.';

alter table public.notification_preferences enable row level security;
revoke all on public.notification_preferences from public, anon, authenticated;
create policy own_notification_preferences on public.notification_preferences for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_staff()));
grant select on public.notification_preferences to authenticated;

-- 3. The outbox log -----------------------------------------------------------------------------------------------------

alter table public.emails add column category text, add column notification_id uuid;

-- 4. Who to tell (the engine, service role only) ---------------------------------------------------------------------------

-- Members with one of the roles (owner, manager) who have an email address, plus the extra alert addresses the owner
-- set (no account, so no choices). Staff are never told about reviews or profile changes (K-16).
create function public.notification_recipients(p_location uuid, p_roles text[])
returns table (user_id uuid, email text, role text)
language sql stable security definer set search_path = '' as $$
  select u.id, lower(u.email), m.role
    from public.location_members m join auth.users u on u.id = m.user_id
   where m.location_id = p_location and m.role = any (p_roles) and u.email is not null and u.email <> ''
  union all
  select null::uuid, lower(a.e), 'alert'
    from public.locations l, unnest(l.alert_emails) as a(e)
   where l.id = p_location and a.e <> ''
     and not exists (select 1 from public.location_members m2 join auth.users u2 on u2.id = m2.user_id
                      where m2.location_id = p_location and lower(u2.email) = lower(a.e))
$$;
revoke execute on function public.notification_recipients(uuid, text[]) from public, anon, authenticated;
grant execute on function public.notification_recipients(uuid, text[]) to service_role;

-- 5. The screens: choices and the bell ----------------------------------------------------------------------------------

create function public.my_notification_prefs(p_location uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.has_location_role(p_location, array['owner', 'manager']) then raise exception 'forbidden' using errcode = '42501'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('category', p.category, 'channel', p.channel, 'frequency', p.frequency))
                     from public.notification_preferences p
                    where p.user_id = auth.uid() and p.location_id = p_location), '[]'::jsonb);
end $$;

-- One choice. The categories an owner cannot switch off refuse "off" (their list matches notify-categories.ts).
create function public.set_notification_pref(p_location uuid, p_category text, p_channel text, p_frequency text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.has_location_role(p_location, array['owner', 'manager']) then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_category <> all (array['review_high_risk', 'review_new', 'profile_urgent', 'profile_issue', 'approval_needed',
                              'weekly_report', 'access', 'billing', 'trial', 'partner', 'account', 'help']) then
    raise exception 'bad_category';
  end if;
  if p_channel not in ('email', 'in_app') then raise exception 'bad_channel'; end if;
  if p_frequency not in ('default', 'instant', 'daily_digest', 'off') then raise exception 'bad_frequency'; end if;
  if p_channel = 'in_app' and p_frequency = 'daily_digest' then raise exception 'bad_frequency'; end if;
  if p_frequency = 'off' and p_category = any (array['profile_urgent', 'access', 'billing', 'account', 'help']) then
    raise exception 'cannot_switch_off';
  end if;
  insert into public.notification_preferences (user_id, location_id, category, channel, frequency)
  values (auth.uid(), p_location, p_category, p_channel, p_frequency)
  on conflict (user_id, location_id, category, channel) do update set frequency = excluded.frequency, updated_at = now();
end $$;

-- The bell: the caller's own in-app notices for one business, newest first, with the unread count.
create function public.list_my_notifications(p_location uuid, p_limit integer default 30) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.has_location_role(p_location, array['owner', 'manager']) then raise exception 'forbidden' using errcode = '42501'; end if;
  return jsonb_build_object(
    'unread', (select count(*) from public.notifications n
                where n.user_id = auth.uid() and n.location_id = p_location and n.in_app and n.read_at is null),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object('id', x.id, 'category', x.category, 'title', x.title, 'body', x.body,
                                          'link', x.link, 'created_at', x.created_at, 'read_at', x.read_at)
                       order by x.created_at desc, x.id)
        from (select * from public.notifications n
               where n.user_id = auth.uid() and n.location_id = p_location and n.in_app
               order by n.created_at desc, n.id limit least(greatest(coalesce(p_limit, 30), 1), 100)) x), '[]'::jsonb));
end $$;

-- Mark some (or all, when p_ids is null) of the caller's notices read. Returns how many changed.
create function public.mark_notifications_read(p_location uuid, p_ids uuid[] default null) returns integer
language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  if not public.has_location_role(p_location, array['owner', 'manager']) then raise exception 'forbidden' using errcode = '42501'; end if;
  update public.notifications set read_at = now()
   where user_id = auth.uid() and location_id = p_location and in_app and read_at is null
     and (p_ids is null or id = any (p_ids));
  get diagnostics n = row_count;
  return n;
end $$;

revoke execute on function public.my_notification_prefs(uuid), public.set_notification_pref(uuid, text, text, text),
  public.list_my_notifications(uuid, integer), public.mark_notifications_read(uuid, uuid[]) from public, anon;
grant execute on function public.my_notification_prefs(uuid), public.set_notification_pref(uuid, text, text, text),
  public.list_my_notifications(uuid, integer), public.mark_notifications_read(uuid, uuid[]) to authenticated;

-- 6. The job ------------------------------------------------------------------------------------------------------------

insert into public.app_settings (key, value) values ('notify_due', 'off') on conflict (key) do nothing;

-- private.produce_jobs(): the 20261015090000_task_engine.sql version, with the notify_due offer and the engine switch.
create or replace function private.produce_jobs() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_sync integer; v_draft integer; v_notify integer; v_protect integer; v_steps integer := 0; v_live boolean;
  v_publish integer; v_reconcile integer; v_stuck integer; v_tasks integer := 0; v_engine boolean;
begin
  -- P0.4-09: once the notification engine is deployed (app_settings.notify_due is 'on') every unnotified review is handed
  -- to it at once, and it decides the timing (instant, held for quiet hours, or the daily digest).
  v_engine := coalesce((select value from public.app_settings where key = 'notify_due'), 'off') = 'on';

  -- Review sync: every business whose reviews Kabsi reads from Google (concierge businesses are typed in by staff),
  -- every 5 minutes. A business seen for the first time starts at its own offset inside the 5 minutes.
  with due as (
    select g.location_id, g.next_sync_at is null as first_time
      from public.google_connections g join public.locations l on l.id = g.location_id
     where l.status = 'active' and l.google_location_id is not null and not l.concierge
       and l.google_location_id not like 'locations/concierge-%'
       and (g.next_sync_at is null or g.next_sync_at <= now())
     for update of g skip locked
  ), moved as (
    update public.google_connections g set
      next_sync_at = case when due.first_time
                          then now() + make_interval(secs => abs(hashtext(g.location_id::text)) % 300)
                          else now() + interval '5 minutes' end
      from due where g.location_id = due.location_id
    returning g.location_id, due.first_time
  ), added as (
    insert into public.jobs (kind, location_id, dedupe_key)
    select 'sync_reviews', m.location_id, 'sync_reviews:' || m.location_id from moved m where not m.first_time
    on conflict (dedupe_key) where dedupe_key is not null and state in ('pending', 'running', 'retrying') do nothing
    returning 1
  )
  select count(*) into v_sync from added;

  -- Drafts: new reviews of active businesses, newest first, at most 10 a minute (the old 10 per run, K-100 budget).
  with added as (
    insert into public.jobs (kind, location_id, dedupe_key, payload)
    select 'draft_reply', r.location_id, 'draft_reply:' || r.id, jsonb_build_object('review_id', r.id)
      from public.reviews r join public.locations l on l.id = r.location_id
     where r.state = 'new' and r.draft_attempts < 3 and l.status = 'active'
       and not exists (select 1 from public.jobs j where j.dedupe_key = 'draft_reply:' || r.id
                         and j.state in ('pending', 'running', 'retrying'))
     order by r.review_created_at desc nulls last
     limit 10
    on conflict (dedupe_key) where dedupe_key is not null and state in ('pending', 'running', 'retrying') do nothing
    returning 1
  )
  select count(*) into v_draft from added;

  -- Owner emails: a business with drafted or blocked reviews not yet emailed, when one is due now (D220 adapted to K-13: medium and high right away, D221).
  with added as (
    insert into public.jobs (kind, location_id, dedupe_key)
    select 'notify_owner', l.id, 'notify_owner:' || l.id
      from public.locations l
     where l.status = 'active' and l.google_location_id is not null
       and (l.emails_paused_until is null or l.emails_paused_until <= now())
       and exists (select 1 from public.reviews r
                    where r.location_id = l.id and r.state in ('drafted', 'blocked') and r.notified_at is null
                      and (v_engine or r.is_backlog or r.star_rating <= 3 or r.risk <> 'low'
                           or private.local_hour(l.time_zone) >= l.digest_hour))
    on conflict (dedupe_key) where dedupe_key is not null and state in ('pending', 'running', 'retrying') do nothing
    returning 1
  )
  select count(*) into v_notify from added;

  -- Google Protection (D218): the same businesses as the sync, every 5 minutes on the mock and for demo businesses,
  -- once an hour on live Google. A business seen for the first time starts at its own offset inside the 5 minutes.
  v_live := public.google_mode() = 'live';
  with due as (
    select g.location_id, g.next_protection_at is null as first_time,
           case when v_live and not l.is_demo then interval '1 hour' else interval '5 minutes' end as every
      from public.google_connections g join public.locations l on l.id = g.location_id
     where l.status = 'active' and l.google_location_id is not null and not l.concierge
       and l.google_location_id not like 'locations/concierge-%'
       and (g.next_protection_at is null or g.next_protection_at <= now())
     for update of g skip locked
  ), moved as (
    update public.google_connections g set
      next_protection_at = case when due.first_time
                                then now() + make_interval(secs => abs(hashtext('protection:' || g.location_id::text)) % 300)
                                else now() + due.every end
      from due where g.location_id = due.location_id
    returning g.location_id, due.first_time
  ), added as (
    insert into public.jobs (kind, location_id, dedupe_key)
    select 'protection_check', m.location_id, 'protection_check:' || m.location_id from moved m where not m.first_time
    on conflict (dedupe_key) where dedupe_key is not null and state in ('pending', 'running', 'retrying') do nothing
    returning 1
  )
  select count(*) into v_protect from added;

  -- The whole-system steps the 5 minute cron ran, each at its own minute.
  v_steps := private.offer_every('access_check', interval '5 minutes', interval '0 minutes')
           + private.offer_every('ratings_snapshot', interval '5 minutes', interval '1 minute')
           + private.offer_every('weekly_reports', interval '5 minutes', interval '2 minutes')
           + private.offer_every('deletions', interval '5 minutes', interval '3 minutes')
           + private.offer_every('trial_reminders', interval '5 minutes', interval '4 minutes')
           + private.offer_every('renewal_reminders', interval '5 minutes', interval '4 minutes');
  -- P0.4-09: held and digested emails come due (notify-engine.ts releaseDue).
  if v_engine then v_steps := v_steps + private.offer_every('notify_due', interval '5 minutes', interval '2 minutes'); end if;

  -- P0.1-13a: a write whose worker stopped (publishing or verifying for 10 minutes) may or may not have reached
  -- Google: it goes to checking and is read, never sent again (D266).
  with moved as (
    update public.publications set state = 'checking', moderation_state = coalesce(moderation_state, 'unknown'),
      error = coalesce(error, 'stopped before Google answered'), next_check_at = now()
     where publish_after is not null and route = 'api'
       and ((state = 'publishing' and claimed_at < now() - interval '10 minutes')
         or (state = 'verifying' and last_checked_at < now() - interval '10 minutes'))
    returning 1
  )
  select count(*) into v_stuck from moved;

  -- Due approvals (approve_publication offers each one already; this is the safety net) and due checks.
  with added as (
    insert into public.jobs (kind, location_id, dedupe_key, payload)
    select 'publish', p.location_id, 'publish:' || p.id, jsonb_build_object('publication_id', p.id)
      from public.publications p
     where p.state = 'approved' and p.publish_after <= now()
    on conflict (dedupe_key) where dedupe_key is not null and state in ('pending', 'running', 'retrying') do nothing
    returning 1
  )
  select count(*) into v_publish from added;
  with added as (
    insert into public.jobs (kind, location_id, dedupe_key, payload)
    select 'reconcile_publication', p.location_id, 'reconcile_publication:' || p.id, jsonb_build_object('publication_id', p.id)
      from public.publications p
     where p.state = 'checking' and p.next_check_at <= now()
    on conflict (dedupe_key) where dedupe_key is not null and state in ('pending', 'running', 'retrying') do nothing
    returning 1
  )
  select count(*) into v_reconcile from added;

  -- P0.3-05: the task detectors, once every 5 minutes per business that is not disconnected (the time-based ones:
  -- profile gaps, lost access, plan ending; and a safety net for the rest, which also run at once on change).
  if coalesce((select value from public.app_settings where key = 'task_detectors'), 'off') = 'on' then
    with added as (
      insert into public.jobs (kind, location_id, dedupe_key)
      select 'detect_tasks', l.id, 'detect_tasks:' || l.id
        from public.locations l
       where l.status in ('active', 'paused') and l.disconnect_requested_at is null
         and not exists (select 1 from public.jobs j where j.location_id = l.id and j.kind = 'detect_tasks'
                           and j.created_at > now() - interval '5 minutes')
      on conflict (dedupe_key) where dedupe_key is not null and state in ('pending', 'running', 'retrying') do nothing
      returning 1
    )
    select count(*) into v_tasks from added;
  end if;

  return jsonb_build_object('sync_reviews', v_sync, 'draft_reply', v_draft, 'notify_owner', v_notify,
    'protection_check', v_protect, 'steps', v_steps, 'publish', v_publish, 'reconcile_publication', v_reconcile,
    'stuck_publications', v_stuck, 'detect_tasks', v_tasks);
end $$;
