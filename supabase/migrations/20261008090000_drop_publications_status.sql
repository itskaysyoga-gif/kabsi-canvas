-- P0.1-13b part B: the contract step of the one publication pipeline (K-38, R-05). publications.state is the only
-- state column; publications.status, the trigger that kept the two in step and concierge_queue_reply (no caller since
-- P0.1-13a) go. Hussein approved the drop on 8 Oct 2026 on three conditions: nothing reads or writes status any more
-- (repo and live catalog searched, see PROGRESS), state and status agree on every row (checked live, and again below
-- before anything changes), and id and status are copied to private.publications_status_backup_20261008 first.
--
-- 1. Stop if any row's status is not what its state says.
-- 2. Copy id and status to the backup table.
-- 3. The last readers and writers move to state: the audit and Slack triggers, ops_digest, staff_job_health and the
--    two concierge staff functions. The audit log keeps its result words (live, in_review, ...), mapped from state by
--    private.publication_status_of, so the "What Kabsi did" feed and earlier audit lines read the same.
-- 4. The sync trigger, its two functions and concierge_queue_reply are dropped; the concierge check moves to state.
-- 5. state defaults to approved (what an insert without status got before), then status is dropped.
--
-- Run as one transaction: a failure anywhere leaves everything as it was.

-- 1. Agreement check ---------------------------------------------------------------------------------------------------

do $$
declare n integer;
begin
  select count(*) into n from public.publications
   where status is distinct from private.publication_status_of(state, route);
  if n > 0 then raise exception 'publications: % rows where status does not follow state, nothing changed', n; end if;
end $$;

-- 2. Backup ------------------------------------------------------------------------------------------------------------

create table private.publications_status_backup_20261008 (
  id uuid primary key,
  status text not null,
  copied_at timestamptz not null default now()
);
insert into private.publications_status_backup_20261008 (id, status) select id, status from public.publications;
alter table private.publications_status_backup_20261008 enable row level security;
revoke all on private.publications_status_backup_20261008 from public, anon, authenticated;

-- 3. Readers and writers on state --------------------------------------------------------------------------------------

create or replace function private.audit_publication() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_new text := private.publication_status_of(new.state, new.route);
  v_after jsonb := jsonb_build_object('publication_id', new.id, 'target_type', new.target_type,
    'route', new.route, 'status', v_new, 'state', new.state);
begin
  if tg_op = 'INSERT' then
    perform private.audit('user', new.approved_by, 'approval', new.location_id, new.target_type, new.target_id::text,
      null, v_after, new.channel, 'approved');
  elsif v_new is distinct from private.publication_status_of(old.state, old.route)
        and v_new in ('live', 'in_review', 'rejected', 'failed', 'cancelled') then
    perform private.audit(case when new.posted_manually_by is not null then 'staff' else 'system' end,
      new.posted_manually_by, 'publication', new.location_id, new.target_type, new.target_id::text,
      jsonb_build_object('status', private.publication_status_of(old.state, old.route), 'state', old.state),
      v_after, new.channel, v_new);
  end if;
  return null;
end $$;

create or replace function public.ops_on_publication() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_name text;
begin
  if new.state in ('failed', 'rejected') and old.state is distinct from new.state then
    select name into v_name from public.locations where id = new.location_id;
    perform public.ops_emit('publication_' || new.state, 'alerts',
      ':red_circle: Google ' || case when new.state = 'rejected' then 'rejected' else 'write failed' end || ': ' || replace(new.target_type, '_', ' ') || ' for ' || coalesce(v_name, '?'),
      left(coalesce(new.error, new.google_response::text, ''), 800), '[]', public.ops_staff_btn('Job health'), 'pub:' || new.id || ':' || new.state);
  end if;
  return new;
end $$;

drop trigger publications_audit on public.publications;
create trigger publications_audit after insert or update of state on public.publications
  for each row execute function private.audit_publication();
drop trigger ops_publication on public.publications;
create trigger ops_publication after update of state on public.publications
  for each row when (not public.is_demo_location(new.location_id)) execute function public.ops_on_publication();

create or replace function public.ops_digest(p_hours integer default 24) returns jsonb
language sql stable security definer set search_path = '' as $$
  with w as (select now() - make_interval(hours => p_hours) as since),
  d as (select id from public.locations where is_demo)
  select jsonb_build_object(
    'hours', p_hours,
    'signups', (select count(*) from auth.users, w where created_at > since and email not like '%@test.local'
                  and lower(email) is distinct from public.demo_login_email()),
    'businesses_new', (select count(*) from public.locations, w where created_at > since and not is_demo),
    'businesses_live', (select count(*) from public.locations, w where activated_at > since and not is_demo),
    'businesses_active_total', (select count(*) from public.locations where status = 'active' and not is_demo),
    'waiting_for_access', (select count(*) from public.locations where status = 'access_pending' and not is_demo),
    'reviews_new', (select count(*) from public.reviews, w where created_at > since and location_id not in (select id from d)),
    'replies_posted', (select count(*) from public.publications, w where target_type = 'review_reply' and state in ('verified','verifying','checking') and created_at > since and (location_id is null or location_id not in (select id from d))),
    'drafts_waiting', (select count(*) from public.reviews where state in ('drafted','blocked') and location_id not in (select id from d)),
    'urgent_waiting', (select count(*) from public.reviews where state in ('drafted','blocked') and urgency = 'urgent' and location_id not in (select id from d)),
    'posts_published', (select count(*) from public.publications, w where target_type = 'local_post' and state in ('verified','verifying','checking') and created_at > since and (location_id is null or location_id not in (select id from d))),
    'shield_changes', (select count(*) from public.listing_changes, w where created_at > since and location_id not in (select id from d)),
    'taps', (select count(*) from public.taps, w where created_at > since and not is_bot and (location_id is null or location_id not in (select id from d))),
    'chats', (select count(*) from public.chat_conversations, w where created_at > since and message_count > 0 and (location_id is null or location_id not in (select id from d))),
    'chats_hot', (select count(*) from public.chat_conversations, w where created_at > since and lead_temperature = 'hot' and (location_id is null or location_id not in (select id from d))),
    'handoffs', (select count(*) from public.chat_conversations, w where updated_at > since and status = 'handoff' and (location_id is null or location_id not in (select id from d))),
    'contacts', (select count(*) from public.contacts, w where created_at > since),
    'leads', (select count(*) from public.leads, w where created_at > since),
    'payments_usd', (select coalesce(sum(amount_usd), 0) from public.payments, w where created_at > since),
    'claims_pending', (select count(*) from public.usdt_claims where status = 'pending'),
    'plans_ending_14d', (select count(*) from public.plans where status = 'active' and kind <> 'partner' and ends_at between now() and now() + interval '14 days'),
    'partners_active', (select count(*) from public.partners where status = 'active'),
    'invites', (select count(*) from public.partner_invites, w where created_at > since),
    'emails_sent', (select count(*) from public.emails, w where created_at > since and status in ('sent','delivered') and (location_id is null or location_id not in (select id from d))),
    'emails_failed', (select count(*) from public.emails, w where created_at > since and status in ('failed','bounced') and coalesce(error,'') not like 'test address%'),
    'jobs_failed', (select count(*) from public.jobs_log, w where created_at > since and not ok),
    'publications_failed', (select count(*) from public.publications, w where updated_at > since and state = 'failed' and (location_id is null or location_id not in (select id from d))),
    'google_mode', (select value from public.app_settings where key = 'google_mode'),
    'slack_queue', (select count(*) from public.ops_events where sent_at is null)
  )
$$;

create or replace function public.staff_job_health() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v jsonb;
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  select jsonb_build_object(
    'schedules', (select coalesce(jsonb_agg(jsonb_build_object(
        'name', j.jobname, 'schedule', j.schedule, 'active', j.active,
        'last_start', r.start_time, 'last_status', r.status, 'last_message', left(r.return_message, 200),
        'failed_24h', (select count(*) from cron.job_run_details d
                        where d.jobid = j.jobid and d.status = 'failed' and d.start_time > now() - interval '24 hours'))
        order by j.jobname), '[]'::jsonb)
      from cron.job j
      left join lateral (select start_time, status, return_message from cron.job_run_details d
                         where d.jobid = j.jobid order by start_time desc limit 1) r on true
      where j.jobname like 'kabsi_%'),
    'jobs', (select coalesce(jsonb_agg(jsonb_build_object('job', job, 'runs_7d', n, 'fails_7d', fails,
        'last_at', last_at, 'last_fail_at', last_fail_at) order by job), '[]'::jsonb)
      from (select job, count(*) n, count(*) filter (where not ok) fails, max(created_at) last_at,
                   max(created_at) filter (where not ok) last_fail_at
            from public.jobs_log where created_at > now() - interval '7 days' group by job) s),
    'recent_failures', (select coalesce(jsonb_agg(jsonb_build_object('job', job, 'at', created_at, 'detail', detail)
        order by created_at desc), '[]'::jsonb)
      from (select job, created_at, detail from public.jobs_log where not ok order by created_at desc limit 10) f),
    'queue', (select jsonb_build_object(
        'pending', count(*) filter (where state = 'pending'),
        'running', count(*) filter (where state = 'running'),
        'retrying', count(*) filter (where state = 'retrying'),
        'due_late', count(*) filter (where state in ('pending', 'retrying') and next_run_at < now() - interval '5 minutes'),
        'dead_7d', count(*) filter (where state = 'dead' and finished_at > now() - interval '7 days'),
        'failed_7d', count(*) filter (where state = 'failed' and finished_at > now() - interval '7 days'))
      from public.jobs),
    'stopped_jobs', (select coalesce(jsonb_agg(jsonb_build_object('id', s.id, 'kind', s.kind, 'state', s.state,
        'business', s.business, 'attempts', s.attempts, 'last_error', s.last_error, 'at', s.finished_at)
        order by s.finished_at desc), '[]'::jsonb)
      from (select j.id, j.kind, j.state, l.name business, j.attempts, left(j.last_error, 300) last_error, j.finished_at
              from public.jobs j left join public.locations l on l.id = j.location_id
             where j.state in ('dead', 'failed') and j.finished_at > now() - interval '7 days'
             order by j.finished_at desc limit 20) s),
    'http_errors_24h', (select count(*) from net._http_response
      where created > now() - interval '24 hours' and (status_code >= 400 or error_msg is not null)),
    'http_calls_24h', (select count(*) from net._http_response where created > now() - interval '24 hours'),
    'emails_failed_24h', (select count(*) from public.emails where status = 'failed'
      and created_at > now() - interval '24 hours' and coalesce(error, '') <> 'test address, not sent'),
    'emails_sent_24h', (select count(*) from public.emails where status = 'sent' and created_at > now() - interval '24 hours'),
    'publications_failed_7d', (select count(*) from public.publications where state in ('failed', 'rejected')
      and created_at > now() - interval '7 days'),
    'reviews_blocked', (select count(*) from public.reviews where state = 'blocked'),
    'google_mode', public.google_mode(),
    'email_from', (select value from public.app_settings where key = 'email_from'),
    'checked_at', now()
  ) into v;
  return v;
end $$;

-- Concierge: a publication waits for the person while it is approved or publishing on the concierge route (the old
-- status "queued").
create or replace function public.staff_concierge_cancel_task(p_task uuid, p_outcome text, p_reason text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare t public.concierge_tasks;
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_outcome not in ('redo','gone','access_lost') then raise exception 'bad_outcome'; end if;
  update public.concierge_tasks set state = 'cancelled', outcome = p_outcome, note = nullif(left(coalesce(p_reason, ''), 500), ''),
    done_by = auth.uid(), done_at = now()
   where id = p_task and state = 'open' and kind = 'post_reply' returning * into t;
  if not found then raise exception 'already_done'; end if;
  update public.publications set state = 'cancelled', error = left(coalesce(p_reason, p_outcome), 500)
   where id = t.publication_id and state in ('approved', 'publishing') and route = 'concierge';
  if p_outcome = 'gone' then
    update public.reviews set state = 'archived' where id = t.review_id and state = 'publishing';
  else
    update public.reviews set state = 'drafted' where id = t.review_id and state = 'publishing';
  end if;
  if p_outcome = 'access_lost' then
    update public.locations set google_account_id = null, google_location_id = null, access_granted_at = null,
      status = case when status = 'active' then 'access_pending' else status end where id = t.location_id;
    insert into public.concierge_tasks (location_id, kind) values (t.location_id, 'invite') on conflict do nothing;
    perform public.refresh_location_status(t.location_id);
  end if;
end $$;

create or replace function public.staff_concierge_mark_posted(p_task uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare t public.concierge_tasks; p public.publications; v_text text; v_first boolean := false; l public.locations;
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  update public.concierge_tasks set state = 'done', done_by = auth.uid(), done_at = now()
   where id = p_task and kind = 'post_reply' and state = 'open' returning * into t;
  if not found then raise exception 'already_done'; end if;
  select * into p from public.publications where id = t.publication_id for update;
  v_text := p.payload ->> 'text';
  if p.payload_redacted_at is not null or v_text is null then raise exception 'text_redacted'; end if;
  update public.publications set state = 'verified', posted_manually_by = auth.uid(), posted_manually_at = now()
   where id = p.id and state in ('approved', 'publishing') and route = 'concierge';
  if not found then raise exception 'publication_not_queued'; end if;
  update public.reviews set state = 'posted', existing_reply = v_text, reply_state = 'live'
   where id = t.review_id and state = 'publishing';
  select * into l from public.locations where id = t.location_id for update;
  if l.concierge_first_post_at is null then
    v_first := true;
    update public.locations set concierge_first_post_at = now() where id = l.id;
    perform public.grant_trial_if_eligible(l.id, true);
    perform public.refresh_location_status(l.id);
    perform public.ops_emit('concierge_first_post', 'money', ':tada: First concierge reply posted: ' || l.name,
      'The plan clock started for this business.', '[]', public.ops_staff_btn(), 'cfirst:' || l.id);
  end if;
  return jsonb_build_object('ok', true, 'first_post', v_first);
end $$;

-- 4. The sync trigger, its helpers and the old concierge path go; the concierge check moves to state ----------------

drop trigger publications_state on public.publications;
drop function private.publication_sync_state();
drop function private.publication_state_of(text);
drop function public.concierge_queue_reply(uuid, text, uuid, text);

alter table public.publications add constraint concierge_verified_needs_person
  check (route <> 'concierge' or state not in ('verified', 'verifying', 'checking') or posted_manually_by is not null);
alter table public.publications drop constraint concierge_live_needs_person;
alter table public.publications drop constraint publications_status_check;
drop index public.publications_status_idx;

-- 5. The column ----------------------------------------------------------------------------------------------------------

alter table public.publications alter column state set default 'approved';
alter table public.publications drop column status;
