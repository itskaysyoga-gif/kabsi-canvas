-- Sec 2 (27 Oct 2026), part 2: retention per source, the deletion log a restore re-applies, rejected webhooks counted,
-- and the staff operations view (master plan 30.15 section 8). The table of every source is docs/security/retention.md.
--   1. private.retention_sources(), daily at 03:31 UTC: the sources no earlier job covered. A dry run (counts only,
--      nothing deleted) until app_settings retention_sources is 'on', which Rashid sets with
--      supabase/data/20261027_sec2_retention_on.sql after reading the dry run's counts. Declined and waitlisted
--      Founding 25 applications and declined partner applications get a deletion date (founding_applications.delete_after,
--      set when staff decide; rows decided before this have their date worked out from decided_at); finished jobs,
--      Pub/Sub events, sent product events, WhatsApp number health, invitation lookups, used WhatsApp buttons, done staff
--      follow-ups, old notifications and AI run records; the photo files of a business that left Kabsi; the deletion log
--      itself after 60 days (longer than the 21 days of backups).
--   2. public.deletion_log: ids only (table and row id, never content). A row is added when a business, a Nora contact,
--      a chat, an application, a partner, a waiting list entry or a free check WhatsApp proof is deleted. A restore of a
--      backup made before the deletion deletes the same rows again (private.reapply_deletions, run by the restore drill),
--      so the privacy promise "never restored into the live service afterwards" holds for a restore too.
--   3. public.webhook_rejections: per source, reason and hour, a count of refused webhook calls (wrong signature, too
--      large, bad token). No payload, no address.
--   4. public.staff_operations(): staff admins only. Stuck approvals, businesses whose Google access stopped, failed
--      publications (7 days), jobs failing or waiting too long, webhooks refused (24 hours), each row with what to do.
-- Additive only: create, alter add, create or replace, revoke, grant, cron.schedule.

-- 2. The deletion log.
create table if not exists public.deletion_log (
  id bigint generated always as identity primary key,
  tbl text not null,
  row_id text not null,
  deleted_at timestamptz not null default now()
);
create index if not exists deletion_log_at_idx on public.deletion_log (deleted_at);
alter table public.deletion_log enable row level security;
revoke all on public.deletion_log from anon, authenticated;
comment on table public.deletion_log is
  'Sec 2: ids of rows deleted for privacy (no content). A restored backup deletes them again (private.reapply_deletions). Kept 60 days.';

-- The tables whose deletions a restore must repeat. Their children go with them (on delete cascade).
create or replace function private.deletion_tables() returns text[]
language sql immutable set search_path = '' as $$
  select array['locations', 'contacts', 'chat_conversations', 'founding_applications', 'partner_accounts',
               'free_check_waitlist', 'profile_check_whatsapp']
$$;
revoke all on function private.deletion_tables() from public, anon, authenticated;

create or replace function private.log_deletion() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.deletion_log (tbl, row_id) values (tg_table_name, old.id::text);
  return old;
end $$;
revoke all on function private.log_deletion() from public, anon, authenticated;

do $$
declare t text;
begin
  foreach t in array private.deletion_tables() loop
    execute format('create or replace trigger log_deletion after delete on public.%I for each row execute function private.log_deletion()', t);
  end loop;
end $$;

-- Run by the restore drill on the restored copy, with the log rows the live database wrote after the backup was made.
-- Only the listed tables, only by id. Returns the number of rows deleted.
create or replace function private.reapply_deletions(p_rows jsonb) returns integer
language plpgsql security definer set search_path = '' as $$
declare r jsonb; n integer := 0; k integer;
begin
  for r in select * from jsonb_array_elements(coalesce(p_rows, '[]'::jsonb)) loop
    if (r ->> 'tbl') = any (private.deletion_tables()) and r ->> 'row_id' is not null then
      execute format('delete from public.%I where id::text = $1', r ->> 'tbl') using r ->> 'row_id';
      get diagnostics k = row_count;
      n := n + k;
    end if;
  end loop;
  return n;
end $$;
revoke all on function private.reapply_deletions(jsonb) from public, anon, authenticated;

-- 1. Founding 25 and partner decisions get a deletion date.
alter table public.founding_applications add column if not exists delete_after timestamptz;
alter table public.partner_accounts add column if not exists delete_after timestamptz;
comment on column public.founding_applications.delete_after is
  'Sec 2: declined applications are deleted 90 days after the decision, waitlisted ones 180 days after it.';
comment on column public.partner_accounts.delete_after is 'Sec 2: a declined application is deleted 90 days after the decision.';

create or replace function private.decision_delete_after() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status is distinct from old.status or new.delete_after is null then
    new.delete_after := case
      when tg_table_name = 'founding_applications' and new.status = 'declined' then coalesce(new.decided_at, now()) + interval '90 days'
      when tg_table_name = 'founding_applications' and new.status = 'waitlisted' then coalesce(new.decided_at, now()) + interval '180 days'
      when tg_table_name = 'partner_accounts' and new.status = 'declined' then coalesce(new.decided_at, now()) + interval '90 days'
      else null end;
  end if;
  return new;
end $$;
revoke all on function private.decision_delete_after() from public, anon, authenticated;
create or replace trigger decision_delete_after before update on public.founding_applications
  for each row execute function private.decision_delete_after();
create or replace trigger decision_delete_after before update on public.partner_accounts
  for each row execute function private.decision_delete_after();

-- The days of each rule below are set here, not in retention_policies: that table is the privacy page's own list
-- (src/lib/retention.ts, tests/retention-page.test.ts), and these sources are staff and operations records, the
-- applications and the deletion log. docs/security/retention.md lists every source with its days.
create or replace function private.retention_sources_apply() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v jsonb := '{}'::jsonb; n integer;
  d_found_dec constant int := 90; d_found_wait constant int := 180; d_partner constant int := 90;
  d_jobs constant int := 30; d_events constant int := 90; d_product constant int := 30; d_ops constant int := 90;
  d_follow constant int := 180; d_notes constant int := 366; d_ai constant int := 366; d_log constant int := 60;
  d_lost int := coalesce(private.retention_days('google_data_after_access_lost'), 7);
begin
  delete from public.founding_applications
   where coalesce(delete_after, decided_at + make_interval(days => case status when 'declined' then d_found_dec else d_found_wait end))
         < now()
     and status in ('declined', 'waitlisted');
  get diagnostics n = row_count; v := v || jsonb_build_object('founding_applications', n);

  delete from public.partner_accounts
   where status = 'declined' and coalesce(delete_after, decided_at + make_interval(days => d_partner)) < now()
     -- A partner with any money record is kept (payment records follow tax law, not this rule).
     and not exists (select 1 from public.partner_referrals r where r.partner_id = partner_accounts.id)
     and not exists (select 1 from public.partner_commissions c where c.partner_id = partner_accounts.id)
     and not exists (select 1 from public.partner_payouts o where o.partner_id = partner_accounts.id);
  get diagnostics n = row_count; v := v || jsonb_build_object('partner_applications', n);

  delete from public.jobs where state in ('succeeded', 'dead', 'failed')
     and coalesce(finished_at, created_at) < now() - make_interval(days => d_jobs);
  get diagnostics n = row_count; v := v || jsonb_build_object('jobs', n);

  delete from public.google_events where received_at < now() - make_interval(days => d_events);
  get diagnostics n = row_count; v := v || jsonb_build_object('google_events', n);

  delete from public.product_events where created_at < now() - make_interval(days => d_product)
     and (sent_at is not null or created_at < now() - make_interval(days => d_product * 2));
  get diagnostics n = row_count; v := v || jsonb_build_object('product_events', n);

  delete from public.whatsapp_number_health where checked_at < now() - make_interval(days => d_ops);
  get diagnostics n = row_count; v := v || jsonb_build_object('number_health', n);
  delete from public.invitation_lookups where checked_at < now() - make_interval(days => d_ops);
  get diagnostics n = row_count; v := v || jsonb_build_object('invitation_lookups', n);
  delete from public.whatsapp_actions where coalesce(used_at, expires_at) < now() - make_interval(days => d_ops);
  get diagnostics n = row_count; v := v || jsonb_build_object('whatsapp_buttons', n);
  delete from public.webhook_rejections where hour < now() - make_interval(days => d_ops);

  delete from public.staff_followups where done_at < now() - make_interval(days => d_follow);
  get diagnostics n = row_count; v := v || jsonb_build_object('staff_followups', n);

  delete from public.notifications where created_at < now() - make_interval(days => d_notes);
  get diagnostics n = row_count; v := v || jsonb_build_object('notifications', n);

  delete from public.ai_runs where created_at < now() - make_interval(days => d_ai);
  get diagnostics n = row_count; v := v || jsonb_build_object('ai_runs', n);

  -- The photo files of a business that left: due now; the photo_files job removes them from Storage.
  update public.photos p set file_due_at = now()
    from public.locations l
   where l.id = p.location_id and p.file_due_at is null and p.file_deleted_at is null
     and ((l.access_removed_at < now() - make_interval(days => d_lost) and (l.access_granted_at is null or l.access_granted_at < l.access_removed_at))
       or (l.access_lost_at < now() - make_interval(days => d_lost) and l.access_granted_at is null));
  get diagnostics n = row_count; v := v || jsonb_build_object('photo_files_due', n);
  if n > 0 then
    insert into public.jobs (kind, location_id, dedupe_key) values ('photo_files', null, 'photo_files')
    on conflict (dedupe_key) where dedupe_key is not null and state in ('pending', 'running', 'retrying') do nothing;
  end if;

  delete from public.deletion_log where deleted_at < now() - make_interval(days => d_log);
  get diagnostics n = row_count; v := v || jsonb_build_object('deletion_log', n);

  return v;
end $$;
revoke all on function private.retention_sources_apply() from public, anon, authenticated;

-- The daily job. Until app_settings retention_sources reads 'on' it is a dry run: the deletes run and are rolled back,
-- and only the counts are kept in jobs_log, so Rashid sees what the first real run removes before switching it on
-- (supabase/data/20261027_sec2_retention_on.sql; deleting real data is his step, CLAUDE.md).
create or replace function private.retention_sources() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v jsonb := '{}'::jsonb;
  v_on boolean := coalesce((select value from public.app_settings where key = 'retention_sources'), 'dry_run') = 'on';
begin
  begin
    v := private.retention_sources_apply();
    if not v_on then raise exception 'retention_dry_run'; end if;
  exception when raise_exception then
    if sqlerrm <> 'retention_dry_run' then raise; end if;
  end;
  v := v || jsonb_build_object('mode', case when v_on then 'on' else 'dry_run' end);
  insert into public.jobs_log (job, ok, detail)
  select 'retention_sources', true, v
   where exists (select 1 from jsonb_each_text(v - 'mode') where value::int > 0);
  return v;
end $$;
revoke all on function private.retention_sources() from public, anon, authenticated;

select cron.schedule('kabsi_retention_sources', '31 3 * * *', 'select private.retention_sources()');

-- 3. Rejected webhooks, counted by the hour.
create table if not exists public.webhook_rejections (
  source text not null check (source in ('creem', 'whatsapp', 'google_events', 'resend')),
  reason text not null check (reason ~ '^[a-z0-9_]{1,40}$'),
  hour timestamptz not null,
  n integer not null default 1,
  last_at timestamptz not null default now(),
  primary key (source, reason, hour)
);
alter table public.webhook_rejections enable row level security;
revoke all on public.webhook_rejections from anon, authenticated;
comment on table public.webhook_rejections is 'Sec 2: refused webhook calls per source, reason and hour. Counts only. Kept 90 days.';

create or replace function public.record_webhook_rejection(p_source text, p_reason text) returns void
language sql security definer set search_path = '' as $$
  insert into public.webhook_rejections as w (source, reason, hour)
  values (p_source, left(lower(regexp_replace(coalesce(p_reason, 'refused'), '[^a-zA-Z0-9_]', '_', 'g')), 40),
          date_trunc('hour', now()))
  on conflict (source, reason, hour) do update set n = w.n + 1, last_at = now()
$$;
revoke all on function public.record_webhook_rejection(text, text) from public, anon, authenticated;
grant execute on function public.record_webhook_rejection(text, text) to service_role;

-- Error text as staff see it: no email address, phone number or token (the Edge code scrubs before storing since Sec 2;
-- this covers rows stored before).
create or replace function private.scrub_text(p text, p_max integer default 200) returns text
language sql immutable set search_path = '' as $$
  select left(regexp_replace(regexp_replace(regexp_replace(coalesce(p, ''),
    '([?&#](t|token|key|sig|code|otp|access_token|refresh_token|api_key)=)[^&#\s"'']+', '\1[redacted]', 'g'),
    '[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+\.[A-Za-z0-9.-]+', '[email]', 'g'),
    '\+\d[\d\s().-]{6,}\d|\m\d{9,15}\M', '[phone]', 'g'), p_max)
$$;
revoke all on function private.scrub_text(text, integer) from public, anon, authenticated;

-- 4. The operations view.
create or replace function public.staff_operations() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v jsonb;
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  select jsonb_build_object(
    'checked_at', now(),
    'google_writes', coalesce((select value from public.app_settings where key = 'google_writes'), 'on'),
    -- Approved more than 15 minutes ago and not sent: the publish job is not taking it, or it is held.
    'stuck', coalesce((select jsonb_agg(x order by x ->> 'since') from (
      select jsonb_build_object('id', p.id, 'business', l.name, 'what', p.target_type, 'state', p.state,
        'since', coalesce(p.claimed_at, p.publish_after, p.approved_at),
        'todo', case
          when coalesce((select value from public.app_settings where key = 'google_writes'), 'on') <> 'on'
            then 'Google writes are paused. Resume them under System health when it is safe; nothing is lost.'
          when gc.google_action is not null then 'Google needs action on this profile (' || gc.google_action || '). Tell the owner; it goes once Google clears it.'
          when p.state = 'publishing' then 'Sent to Google more than 15 minutes ago with no answer. Open the jobs below; the job retries by itself.'
          else 'Not sent yet. Check the publish job under Jobs; if it is dead, the owner approves again.' end) as x
        from public.publications p join public.locations l on l.id = p.location_id
        left join public.google_connections gc on gc.location_id = p.location_id
       where (p.state = 'approved' and p.publish_after < now() - interval '15 minutes')
          or (p.state = 'publishing' and coalesce(p.claimed_at, p.updated_at) < now() - interval '15 minutes')
       limit 50) s), '[]'::jsonb),
    -- Kabsi's Manager access stopped working or was removed.
    'access_stopped', coalesce((select jsonb_agg(x order by x ->> 'since' desc) from (
      select jsonb_build_object('business', l.name, 'location_id', l.id, 'state', coalesce(gc.access_state, 'lost'),
        'since', coalesce(l.access_removed_at, l.access_lost_at, gc.updated_at),
        'todo', case
          when l.disconnect_requested_at is not null then 'The owner disconnected Kabsi. Nothing to do; Google data is deleted 7 days after.'
          when coalesce(gc.access_state, '') = 'removed' then 'Kabsi was removed as Manager. The owner was emailed; follow up once on WhatsApp.'
          else 'Access stopped working. Ask the owner to add the Kabsi Clients group as Manager again.' end) as x
        from public.locations l left join public.google_connections gc on gc.location_id = l.id
       where not l.is_demo and (l.access_lost_at is not null or gc.access_state in ('lost', 'error', 'removed'))
       limit 50) s), '[]'::jsonb),
    'failed_publications', coalesce((select jsonb_agg(x order by x ->> 'at' desc) from (
      select jsonb_build_object('id', p.id, 'business', l.name, 'what', p.target_type, 'state', p.state, 'at', p.updated_at,
        'error', private.scrub_text(p.error, 200),
        'todo', case
          when p.error in ('approval_expired', 'not_draft', 'superseded', 'payload_redacted') then 'Nothing to fix: the owner approves again if they still want it.'
          when p.error in ('plan_ended', 'location_not_active') then 'The plan or access ended. Nothing was sent.'
          when p.error = 'approver_no_longer_allowed' then 'The approver lost the right to approve. The owner approves again.'
          when p.state = 'rejected' then 'Google refused it. Read the error; the owner was told and can edit and approve again.'
          else 'Read the error. If it is on Kabsi''s side, open the job and retry it.' end) as x
        from public.publications p join public.locations l on l.id = p.location_id
       where p.state in ('failed', 'rejected') and p.updated_at > now() - interval '7 days' and p.error is distinct from 'undone'
       limit 50) s), '[]'::jsonb),
    'jobs', coalesce((select jsonb_agg(x order by x ->> 'at') from (
      select jsonb_build_object('id', j.id, 'kind', j.kind, 'state', j.state, 'business', l.name, 'attempts', j.attempts,
        'at', coalesce(j.finished_at, j.locked_at, j.next_run_at), 'error', private.scrub_text(j.last_error, 200),
        'todo', case
          when j.state in ('dead', 'failed') then 'Stopped after its tries. Read the error, fix the cause, then queue it again from Job health.'
          when j.state = 'running' then 'Running for more than 15 minutes: its lease runs out and another worker takes it. Check the function logs if it repeats.'
          else 'Due more than 15 minutes ago and not started. Check the dispatcher schedule under Job health.' end) as x
        from public.jobs j left join public.locations l on l.id = j.location_id
       where (j.state in ('dead', 'failed') and coalesce(j.finished_at, j.created_at) > now() - interval '7 days')
          or (j.state in ('pending', 'retrying') and j.next_run_at < now() - interval '15 minutes')
          or (j.state = 'running' and j.locked_at < now() - interval '15 minutes')
       limit 50) s), '[]'::jsonb),
    'webhooks_rejected', coalesce((select jsonb_agg(x order by x ->> 'last_at' desc) from (
      select jsonb_build_object('source', w.source, 'reason', w.reason, 'count', sum(w.n), 'last_at', max(w.last_at),
        'todo', case when sum(w.n) > 20 then 'Many refusals: check the signing secret of ' || w.source || ' in Supabase secrets, or someone is probing the address.'
                     else 'A few refusals are normal (scanners). Nothing to do unless real events stop arriving.' end) as x
        from public.webhook_rejections w where w.hour > now() - interval '24 hours'
       group by w.source, w.reason) s), '[]'::jsonb)
  ) into v;
  return v;
end $$;
revoke all on function public.staff_operations() from public, anon;
grant execute on function public.staff_operations() to authenticated;
