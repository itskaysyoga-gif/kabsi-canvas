-- Session 13b part 2 (master plan 9.3, 9.9, 26.9, 28.5, 30.9 item 5, 30.10 point 7). Additive: no table or column is
-- dropped and no data is deleted. Functions that already exist are changed by editing only the one place in their
-- current text; the migration stops if that text is not found, so nothing else in them can change.
--   1. START opts back in for every role (the 13b phone test of 25 Oct), and a fresh staff code clears STOP.
--   2. WhatsApp may approve special hours (an hours change typed on WhatsApp) through the one publication pipeline.
--   3. The map on WhatsApp: the image goes with its line, the owner's keyword confirm, the first map after connecting.
--   4. Staff alerts on WhatsApp (R-64): ops_events is the alert queue the WhatsApp tick reads; Slack is gone.
--   5. The morning staff digest (08:00 Beirut) and the numbers behind "today" (9.9, 26.9).

-- 1. START (9.5): the person's own opt-in again. Every opt-in this phone stopped is active again, so a business role
-- comes back with it; the conversation is no longer stopped. Recorded like STOP.
create or replace function public.whatsapp_start(p_phone text) returns integer
language plpgsql security definer set search_path = '' as $$
declare v_n integer := 0; o record;
begin
  if p_phone !~ '^\+[1-9][0-9]{6,14}$' then return 0; end if;
  for o in update public.whatsapp_optins set state = 'active', stopped_at = null, updated_at = now()
            where phone = p_phone and state = 'stopped' returning user_id loop
    v_n := v_n + 1;
    perform private.audit('user', o.user_id, 'whatsapp_optin', null, 'user', o.user_id::text, null,
      jsonb_build_object('phone_last4', right(p_phone, 4), 'via', 'START'), 'whatsapp', 'active');
  end loop;
  insert into public.whatsapp_conversations (phone) values (p_phone) on conflict (phone) do nothing;
  update public.whatsapp_conversations set stopped_at = null, updated_at = now() where phone = p_phone;
  return v_n;
end $$;
revoke all on function public.whatsapp_start(text) from public, anon, authenticated;
grant execute on function public.whatsapp_start(text) to service_role;

do $$
declare d text; n text;
begin
  -- A fresh staff code is a new opt-in: the conversation is no longer stopped.
  d := pg_get_functiondef('public.whatsapp_bind(text, text)'::regprocedure);
  n := replace(d, $x$    update public.whatsapp_staff_codes set used_at = now(), used_phone = p_phone where code_hash = s.code_hash;$x$,
                  $x$    update public.whatsapp_staff_codes set used_at = now(), used_phone = p_phone where code_hash = s.code_hash;
    insert into public.whatsapp_conversations (phone) values (p_phone) on conflict (phone) do nothing;
    update public.whatsapp_conversations set stopped_at = null, updated_at = now() where phone = p_phone;$x$);
  if n = d then raise exception 'whatsapp_bind: the staff code step was not found'; end if;
  execute n;
end $$;

-- The welcome goes only on a person's first message (QA 1 Nora finding): the store says whether this phone ever wrote before.
do $$
declare d text; n text;
begin
  d := pg_get_functiondef('public.whatsapp_inbound_store(text, text, text, jsonb, jsonb)'::regprocedure);
  n := replace(d, $x$declare v_id uuid; o public.whatsapp_optins;$x$, $x$declare v_id uuid; o public.whatsapp_optins; v_first boolean;$x$);
  n := replace(n, $x$  if v_id is null then return jsonb_build_object('duplicate', true); end if;$x$,
                  $x$  if v_id is null then return jsonb_build_object('duplicate', true); end if;
  v_first := not exists (select 1 from public.whatsapp_messages where phone = p_phone and direction = 'in' and id <> v_id);$x$);
  n := replace(n, $x$  return jsonb_build_object('duplicate', false, 'id', v_id);$x$,
                  $x$  return jsonb_build_object('duplicate', false, 'id', v_id, 'first', v_first);$x$);
  if n = d or n !~ 'v_first := not exists' or n !~ '''first'', v_first' then raise exception 'whatsapp_inbound_store: the text was not found'; end if;
  execute n;
end $$;
create index if not exists whatsapp_messages_phone_in on public.whatsapp_messages (phone) where direction = 'in';

-- 2. An hours change typed on WhatsApp (30.10 point 7): special hours are an item WhatsApp may approve. The owner sees the
-- exact days and times first; the hash covers them, so a draft changed after it was shown is refused ("changed").
-- approve_publication already takes special_hours on the whatsapp channel (20261025100020).
alter table public.whatsapp_actions drop constraint whatsapp_actions_target_type_check;
alter table public.whatsapp_actions add constraint whatsapp_actions_target_type_check
  check (target_type in ('review_reply', 'local_post', 'listing_revert', 'special_hours'));
do $$
declare d text; n text;
begin
  d := pg_get_functiondef('private.whatsapp_item(text, uuid)'::regprocedure);
  n := replace(d, $x$declare r public.reviews; d public.reply_drafts; po public.gbp_posts; pc public.profile_changes;$x$,
                  $x$declare r public.reviews; d public.reply_drafts; po public.gbp_posts; pc public.profile_changes; sh public.special_hours; v_sh text;$x$);
  n := replace(n, $x$  else
    return jsonb_build_object('ok', false, 'reason', 'not_on_whatsapp');$x$,
                  $x$  when 'special_hours' then
    select * into sh from public.special_hours where id = p_target_id;
    if not found then return jsonb_build_object('ok', false, 'reason', 'unknown_target'); end if;
    if sh.state <> 'draft' then return jsonb_build_object('ok', false, 'reason', 'not_draft', 'location_id', sh.location_id); end if;
    if sh.end_date < current_date - 1 then return jsonb_build_object('ok', false, 'reason', 'expired', 'location_id', sh.location_id); end if;
    v_sh := sh.start_date::text || ' to ' || sh.end_date::text || ': ' ||
            case when sh.closed then 'closed' else to_char(sh.open_time, 'HH24:MI') || ' to ' || to_char(sh.close_time, 'HH24:MI') end;
    return jsonb_build_object('ok', true, 'location_id', sh.location_id, 'text', v_sh, 'hash', private.whatsapp_hash(sh.id::text || ':' || v_sh));
  else
    return jsonb_build_object('ok', false, 'reason', 'not_on_whatsapp');$x$);
  if n = d or n !~ 'when ''special_hours'' then' or n !~ 'v_sh text;' then raise exception 'whatsapp_item: the text was not found'; end if;
  execute n;

  -- "Which one?" names what each waiting item is (Hours, Post, Change, Reply), not the message that carried it.
  d := pg_get_functiondef('public.whatsapp_open_items(text)'::regprocedure);
  n := replace(d, $x$jsonb_build_object('token', t.token, 'kind', t.kind, 'business', l.name, 'location_id', l.id)$x$,
                  $x$jsonb_build_object('token', t.token, 'kind', t.kind, 'business', l.name, 'location_id', l.id, 'target_type', a.target_type)$x$);
  if n = d then raise exception 'whatsapp_open_items: the text was not found'; end if;
  execute n;
end $$;

-- 3. The map on WhatsApp (28.5, docs/COPY.md section 20). An outbox message can carry an image by reference: the map of one
-- finished grid, drawn by the visibility function when the message goes. The function keeps its name and arguments; the
-- one new argument has a default, so callers that do not pass it work as before.
alter table public.whatsapp_outbox add column if not exists media jsonb
  check (media is null or (jsonb_typeof(media) = 'object' and media ? 'map_scan'));
drop function if exists public.whatsapp_outbox_add(text, uuid, uuid, text, text, jsonb, jsonb, boolean, text, timestamptz);
create or replace function public.whatsapp_outbox_add(p_phone text, p_user uuid, p_location uuid, p_kind text, p_body text,
  p_buttons jsonb, p_template jsonb, p_urgent boolean, p_dedupe text, p_due_at timestamptz default now(), p_media jsonb default null)
returns bigint
language plpgsql security definer set search_path = '' as $$
declare v_id bigint;
begin
  -- "pause <business>" (9.9): a paused business gets nothing but urgent messages.
  if not coalesce(p_urgent, false) and p_kind <> 'reply' and exists (select 1 from public.locations
       where id = p_location and emails_paused_until > now()) then
    return null;
  end if;
  insert into public.whatsapp_outbox (phone, user_id, location_id, kind, body, buttons, template, urgent, dedupe_key, due_at, media)
  values (p_phone, p_user, p_location, p_kind, left(p_body, 4096), coalesce(p_buttons, '[]'::jsonb), p_template,
    coalesce(p_urgent, false), p_dedupe, coalesce(p_due_at, now()), p_media)
  on conflict (dedupe_key) do nothing returning id into v_id;
  return v_id;
end $$;
revoke all on function public.whatsapp_outbox_add(text, uuid, uuid, text, text, jsonb, jsonb, boolean, text, timestamptz, jsonb) from public, anon, authenticated;
grant execute on function public.whatsapp_outbox_add(text, uuid, uuid, text, text, jsonb, jsonb, boolean, text, timestamptz, jsonb) to service_role;

-- A finished map goes once to the owners and managers who connected WhatsApp: the image with its line (docs/COPY.md 20).
alter table public.visibility_scans add column if not exists whatsapp_at timestamptz;
-- Maps finished before today were tests on the mock: they are marked as handled, so nothing old is sent.
update public.visibility_scans set whatsapp_at = now() where whatsapp_at is null and state <> 'queued';
create index if not exists visibility_scans_whatsapp_due on public.visibility_scans (done_at) where state = 'done' and whatsapp_at is null;

create or replace function public.whatsapp_maps_due() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('scan_id', s.id, 'location_id', s.location_id, 'business', l.name, 'first', s.first,
           'message', s.message,
           'to', (select coalesce(jsonb_agg(jsonb_build_object('user_id', o.user_id, 'phone', o.phone)), '[]'::jsonb)
                    from public.location_members m join public.whatsapp_optins o on o.user_id = m.user_id
                   where m.location_id = s.location_id and m.role in ('owner', 'manager') and o.state = 'active' and o.phone is not null))
           order by s.done_at), '[]'::jsonb)
    from (select * from public.visibility_scans where state = 'done' and whatsapp_at is null and done_at > now() - interval '2 days'
           order by done_at limit 20) s
    join public.locations l on l.id = s.location_id
   where l.deletion_requested_at is null
$$;
create or replace function public.whatsapp_map_sent(p_scan uuid) returns void
language sql security definer set search_path = '' as $$
  update public.visibility_scans set whatsapp_at = now() where id = p_scan and whatsapp_at is null
$$;
revoke all on function public.whatsapp_maps_due(), public.whatsapp_map_sent(uuid) from public, anon, authenticated;
grant execute on function public.whatsapp_maps_due(), public.whatsapp_map_sent(uuid) to service_role;

-- 4. Staff alerts on WhatsApp (9.9, R-64). Slack is retired: its three cron jobs go, ops_emit no longer wakes the slack
-- function, and the health numbers no longer name Slack. public.ops_events stays the alert queue: the WhatsApp tick takes
-- each new event once, sends the urgent ones to the staff phone at once and counts the rest in the morning digest.
-- (The slack_channel and slack_ts columns are kept; dropping them is Rashid's, supabase/manual/20261025_drop_slack_leftovers.sql.)
do $$
declare j text;
begin
  foreach j in array array['kabsi_slack_flush', 'kabsi_slack_digest', 'kabsi_slack_sentry'] loop
    if exists (select 1 from cron.job where jobname = j) then perform cron.unschedule(j); end if;
  end loop;
end $$;

do $$
declare d text; n text;
begin
  d := pg_get_functiondef('public.ops_emit(text, text, text, text, jsonb, jsonb, text, text, text)'::regprocedure);
  n := replace(d, $x$  if v_id is not null then
    perform public.call_internal('slack/flush');
  end if;
$x$, '');
  if n = d then raise exception 'ops_emit: the slack call was not found'; end if;
  execute n;

  d := pg_get_functiondef('public.ops_digest(integer)'::regprocedure);
  n := replace(d, $x$'slack_queue', (select count(*) from public.ops_events where sent_at is null)$x$,
                  $x$'alerts_unsent', (select count(*) from public.ops_events where sent_at is null)$x$);
  if n = d then raise exception 'ops_digest: the slack line was not found'; end if;
  execute n;

  d := pg_get_functiondef('public.staff_system_health()'::regprocedure);
  n := replace(d, $x$'slack_unsent', (select count(*) from public.ops_events where sent_at is null),
      'slack_oldest_unsent_minutes',$x$, $x$'alerts_unsent', (select count(*) from public.ops_events where sent_at is null),
      'alerts_oldest_unsent_minutes',$x$);
  if n = d then raise exception 'staff_system_health: the slack lines were not found'; end if;
  execute n;
end $$;

-- Events already in the queue were handled by Slack before today: none of them is sent again.
update public.ops_events set sent_at = now(), error = 'before_whatsapp_alerts' where sent_at is null;

-- The WhatsApp tick takes new events once (oldest first); the claim marks them, so two ticks never send one twice.
create or replace function public.whatsapp_ops_claim(p_limit integer default 50) returns setof jsonb
language plpgsql security definer set search_path = '' as $$
begin
  return query
  with due as (select id from public.ops_events where sent_at is null and attempts < 8 order by id limit p_limit for update skip locked)
  update public.ops_events e set sent_at = now(), claimed_at = now(), attempts = e.attempts + 1, error = null
    from due where e.id = due.id
  returning jsonb_build_object('id', e.id, 'kind', e.kind, 'channel', e.channel, 'title', e.title, 'body', e.body, 'created_at', e.created_at);
end $$;

-- 5. The numbers behind the morning digest and "today" (9.9, 26.9): the last 24 hours, and what is waiting now.
create or replace function public.whatsapp_staff_summary() returns jsonb
language sql stable security definer set search_path = '' as $$
  with w as (select now() - interval '24 hours' since),
  d as (select id from public.locations where is_demo)
  select jsonb_build_object(
    'signups', (select count(*) from public.locations, w where created_at > since and not is_demo),
    'trials_started', (select count(*) from public.subscriptions, w where trial_started_at > since),
    'paid_new', (select count(*) from public.subscriptions, w where state = 'active' and mode = 'live' and created_at > since),
    'paid_total', (select count(*) from public.subscriptions where state in ('active', 'past_due') and mode = 'live'),
    'cancellations', (select count(*) from public.subscriptions, w where mode = 'live' and cancel_at_period_end and updated_at > since),
    'reviews_answered', (select count(*) from public.publications, w where target_type = 'review_reply' and state in ('published', 'checking', 'verifying', 'verified')
                           and created_at > since and location_id not in (select id from d)),
    'replies_waiting', (select count(*) from public.reviews where state in ('drafted', 'blocked') and location_id not in (select id from d)),
    'handoffs_waiting', (select count(*) from public.whatsapp_conversations where handoff_at > now() - interval '2 days'),
    'publications_stuck', (select count(*) from public.publications where state in ('approved', 'publishing') and created_at < now() - interval '30 minutes'),
    'jobs_failed', (select count(*) from public.jobs_log, w where not ok and created_at > since),
    'errors_by_job', (select coalesce(jsonb_agg(jsonb_build_object('job', job, 'n', n) order by n desc), '[]'::jsonb)
                        from (select job, count(*) n from public.jobs_log, w where not ok and created_at > since group by job order by 2 desc limit 3) x),
    'ai_cost_micros', (select coalesce(sum(cost_micros), 0) from public.ai_agent_usage where day >= (now() at time zone 'utc')::date - 1),
    'places_today', (select coalesce(sum(calls), 0) from public.places_usage where day = current_date),
    'places_cap', coalesce((select nullif(value, '')::integer from public.app_settings where key = 'places_daily_cap'), 0),
    'dataforseo_micros', (select coalesce(sum(micros), 0) from public.provider_spend where provider = 'dataforseo' and month = date_trunc('month', now())::date),
    'dataforseo_cap_usd', coalesce((select nullif(value, '')::numeric from public.app_settings where key = 'provider_cap_dataforseo_usd'), 0),
    'number_quality', (select quality from public.whatsapp_number_health order by checked_at desc limit 1),
    'number_messaging', (select messaging from public.whatsapp_number_health order by checked_at desc limit 1),
    'alerts_24h', (select count(*) from public.ops_events, w where created_at > since))
$$;
revoke all on function public.whatsapp_ops_claim(integer), public.whatsapp_staff_summary() from public, anon, authenticated;
grant execute on function public.whatsapp_ops_claim(integer), public.whatsapp_staff_summary() to service_role;

-- The morning digest: 08:00 in Beirut. The cron runs at 05:02 and 06:02 UTC (Beirut is UTC+3 in summer, UTC+2 in winter);
-- the function sends only in the 08:00 hour, once a day.
select cron.schedule('kabsi_staff_digest', '2 5,6 * * *', $$select public.call_internal('whatsapp/staff/digest')$$);

-- The WhatsApp tick also wakes for new alerts and finished maps.
create or replace function private.whatsapp_tick() returns void
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.whatsapp_outbox where created_at < now() - interval '30 days';
  if exists (select 1 from public.whatsapp_outbox where state in ('queued', 'held') and due_at <= now())
     or exists (select 1 from public.whatsapp_messages where direction = 'in' and processed_at is null and payload is not null
                  and attempts < 1 and created_at < now() - interval '90 seconds')
     or exists (select 1 from public.ops_events where sent_at is null and attempts < 8)
     or exists (select 1 from public.visibility_scans where state = 'done' and whatsapp_at is null and done_at > now() - interval '2 days')
     or jsonb_array_length(public.whatsapp_google_action_due()) > 0 then
    perform public.call_internal('whatsapp/tick');
  end if;
end $$;
