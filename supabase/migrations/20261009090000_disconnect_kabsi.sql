-- P0.2-02: disconnect Kabsi and access-change notices (K-41, K-113.1, K-113.2, A1, guardrail 11).
--
-- Additive only: new columns, one new table, new functions, one new trigger, two functions re-created with one rule
-- added each, and a wider check on google_connections.access_state. Nothing is dropped and no row is removed.
--
-- 1. locations.disconnect_requested_at, disconnect_requested_by, access_removed_at: the owner's request and the moment
--    Google no longer lists Kabsi. google_connections.access_state follows them as 'removing', then 'removed' (the
--    mirror trigger private.location_sync_tenancy, re-created with those two rules first).
-- 2. public.request_disconnect(location): signed-in owner only. In one transaction: the business is paused (nothing
--    is drafted, emailed, synced or sent), approvals waiting for their undo window are cancelled, open review tasks are
--    archived, open concierge tasks cancelled, unused email action links expired, queued jobs stopped, an audit event
--    and a #kabsi-customers line written, and one `disconnect` job offered. Asking twice returns the first request.
-- 3. A trigger on jobs refuses every new job for a disconnected business except `disconnect` itself, so no producer,
--    old or new, can start work for it again.
-- 4. public.record_disconnect_result(location, ok, error), service role: success marks access removed (and lost, so
--    the K-40 rule "Google data 30 days after access is lost" clears the Google data on schedule); failure opens a
--    staff follow-up due 7 business days after the request, alerts #kabsi-alerts and records it.
-- 5. public.staff_followups: one open row per business and kind, read by staff on /staff; staff close it with
--    public.staff_complete_followup(id, note), which marks access removed and offers the job that emails the owner.
-- 6. mock_listings.kabsi_removed_at and admin_removal: the mock admins API's state ('refuse' forces the failure path).
-- 7. public.ops_on_location: the generic "access lost" and "paused" Slack lines stay quiet for a disconnect, which
--    writes its own lines. Two wording fixes ride along in those Slack lines (house rules): no exclamation mark in
--    the partner message, and "remove from Kabsi" in the removal-request line.

-- 1. Columns ---------------------------------------------------------------------------------------------------------

alter table public.locations
  add column disconnect_requested_at timestamptz,
  -- No foreign key: like the audit log, the record outlives the user.
  add column disconnect_requested_by uuid,
  add column access_removed_at timestamptz,
  add constraint removed_needs_request check (access_removed_at is null or disconnect_requested_at is not null);

alter table public.google_connections drop constraint google_connections_access_state_check;
alter table public.google_connections add constraint google_connections_access_state_check
  check (access_state in ('none', 'pending', 'granted', 'error', 'lost', 'removing', 'removed'));

alter table public.mock_listings
  add column kabsi_removed_at timestamptz,
  add column admin_removal text check (admin_removal in ('refuse'));

-- The mirror: same function as P0.1-09 with 'removed' and 'removing' checked first.
create or replace function private.location_sync_tenancy() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_partner_org uuid;
begin
  insert into public.google_connections as g
    (location_id, google_account_id, google_location_id, access_state, access_granted_at, last_successful_sync_at)
  values (new.id, new.google_account_id, new.google_location_id,
    case when new.access_removed_at is not null and new.access_granted_at is null then 'removed'
         when new.disconnect_requested_at is not null and new.access_removed_at is null then 'removing'
         when new.access_lost_at is not null then 'lost'
         when new.access_error_since is not null then 'error'
         when new.access_granted_at is not null and new.google_location_id is not null then 'granted'
         when new.status = 'access_pending' or new.onboarding_step = 'access' then 'pending'
         else 'none' end,
    new.access_granted_at, new.reviews_synced_at)
  on conflict (location_id) do update set
    google_account_id = excluded.google_account_id,
    google_location_id = excluded.google_location_id,
    access_state = excluded.access_state,
    access_granted_at = excluded.access_granted_at,
    last_successful_sync_at = excluded.last_successful_sync_at,
    updated_at = now()
  where (g.google_account_id, g.google_location_id, g.access_state, g.access_granted_at, g.last_successful_sync_at)
    is distinct from (excluded.google_account_id, excluded.google_location_id, excluded.access_state,
                      excluded.access_granted_at, excluded.last_successful_sync_at);

  if new.partner_id is not null then
    select o.id into v_partner_org from public.organizations o where o.partner_id = new.partner_id;
  end if;
  if v_partner_org is not null then
    insert into public.partner_clients as c (partner_organization_id, location_id, status)
    values (v_partner_org, new.id,
      case new.status when 'active' then 'active' when 'paused' then 'paused' when 'disabled' then 'ended'
                      else 'onboarding' end)
    on conflict (location_id) do update set
      partner_organization_id = excluded.partner_organization_id,
      status = excluded.status,
      -- A new partner starts with the owner approving everything again.
      approval_policy = case when c.partner_organization_id = excluded.partner_organization_id
                             then c.approval_policy else '{}'::jsonb end,
      consent_text = case when c.partner_organization_id = excluded.partner_organization_id then c.consent_text end,
      consent_at = case when c.partner_organization_id = excluded.partner_organization_id then c.consent_at end,
      updated_at = now()
    where (c.partner_organization_id, c.status) is distinct from (excluded.partner_organization_id, excluded.status);
  else
    update public.partner_clients set status = 'ended', approval_policy = '{}'::jsonb, updated_at = now()
      where location_id = new.id and status <> 'ended';
  end if;
  return null;
end $$;

-- 2. Staff follow-ups ----------------------------------------------------------------------------------------------

create table public.staff_followups (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('google_access_removal')),
  -- No foreign key: the follow-up outlives the business if it goes meanwhile; the name stays for the staff list.
  location_id uuid,
  location_name text not null,
  detail text check (length(detail) <= 500),
  due_at timestamptz not null,
  created_at timestamptz not null default now(),
  done_at timestamptz,
  done_by uuid,
  done_note text check (length(done_note) <= 500),
  constraint done_has_note check (done_at is null or coalesce(btrim(done_note), '') <> '')
);
create unique index staff_followups_open on public.staff_followups (kind, location_id) where done_at is null;
create index staff_followups_due on public.staff_followups (due_at) where done_at is null;

alter table public.staff_followups enable row level security;
create policy staff_followups_read on public.staff_followups for select to authenticated using (public.is_staff());
revoke all on public.staff_followups from public, anon, authenticated, service_role;
grant select on public.staff_followups to authenticated, service_role;

-- 3. Helpers -------------------------------------------------------------------------------------------------------

-- p_days business days after p_from (Saturdays and Sundays skipped, UTC), the same rule as addBusinessDays in
-- _shared/disconnect.ts. Google's limit for giving up access is 7 business days (K-41).
create function private.add_business_days(p_from timestamptz, p_days integer) returns timestamptz
language plpgsql stable set search_path = '' as $$
declare d timestamptz := p_from; n integer := 0;
begin
  while n < greatest(coalesce(p_days, 0), 0) loop
    d := d + interval '1 day';
    if extract(isodow from (d at time zone 'UTC')) < 6 then n := n + 1; end if;
  end loop;
  return d;
end $$;

-- Kabsi no longer has access: removed, and lost from now (the K-40 clock for Google data starts here). Closes the
-- open follow-up, writes the audit event once.
create function private.mark_access_removed(p_location uuid, p_actor_type text, p_actor uuid, p_channel text)
returns timestamptz
language plpgsql security definer set search_path = '' as $$
declare v_at timestamptz;
begin
  update public.locations set access_removed_at = now(), access_granted_at = null, access_error_since = null,
    access_lost_at = coalesce(access_lost_at, now())
   where id = p_location and disconnect_requested_at is not null and access_removed_at is null
  returning access_removed_at into v_at;
  if v_at is not null then
    perform private.audit(p_actor_type, p_actor, 'google_access_removed', p_location, 'location', p_location::text,
      jsonb_build_object('access_state', 'removing'), jsonb_build_object('access_state', 'removed'), p_channel, 'removed');
  end if;
  update public.staff_followups set done_at = now(), done_by = coalesce(done_by, p_actor),
    done_note = coalesce(done_note, 'Kabsi removed its access on a later try')
   where location_id = p_location and kind = 'google_access_removal' and done_at is null;
  return coalesce(v_at, (select access_removed_at from public.locations where id = p_location));
end $$;

-- 4. No new work for a disconnected business -----------------------------------------------------------------------

create function private.jobs_skip_disconnected() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.location_id is not null and new.kind <> 'disconnect' and exists (
       select 1 from public.locations l where l.id = new.location_id and l.disconnect_requested_at is not null) then
    return null;
  end if;
  return new;
end $$;

create trigger jobs_skip_disconnected before insert on public.jobs
  for each row execute function private.jobs_skip_disconnected();

-- 5. The owner's request -------------------------------------------------------------------------------------------

create function public.request_disconnect(p_location uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); l public.locations; v_pubs integer; v_reviews integer; v_tasks integer;
  v_tokens integer; v_jobs integer; v_state text;
begin
  if v_uid is null then raise exception 'sign_in_required' using errcode = '42501'; end if;
  if not public.has_location_role(p_location, array['owner']) then raise exception 'forbidden' using errcode = '42501'; end if;

  select * into l from public.locations where id = p_location for update;
  if not found then raise exception 'forbidden' using errcode = '42501'; end if;
  if l.is_demo then raise exception 'demo_location'; end if;
  if l.disconnect_requested_at is not null then
    select access_state into v_state from public.google_connections where location_id = p_location;
    return jsonb_build_object('state', v_state, 'requested_at', l.disconnect_requested_at, 'created', false);
  end if;

  update public.locations set disconnect_requested_at = now(), disconnect_requested_by = v_uid,
    status = case when status = 'disabled' then status else 'paused' end
   where id = p_location;

  -- Approvals still inside their undo window: cancelled, and their item goes back to where it was (as undo does).
  with c as (
    update public.publications set state = 'cancelled', error = 'disconnected'
     where location_id = p_location and state = 'approved'
    returning target_type, target_id
  ), r as (
    update public.reviews set state = 'drafted' where id in (select target_id from c where target_type = 'review_reply') and state = 'publishing'
  ), p as (
    update public.gbp_posts set state = 'draft' where id in (select target_id from c where target_type = 'local_post') and state = 'publishing'
  ), ph as (
    update public.photos set state = 'draft' where id in (select target_id from c where target_type = 'photo') and state = 'publishing'
  ), h as (
    update public.special_hours set state = 'draft' where id in (select target_id from c where target_type = 'special_hours') and state = 'publishing'
  ), lc as (
    update public.listing_changes set state = 'open', decided_at = null
     where id in (select target_id from c where target_type = 'listing_revert') and state = 'reverting'
  )
  select count(*) into v_pubs from c;

  -- Open review tasks: archived (Kabsi does not act on them). The reviews and their drafts stay until K-40 removes them.
  update public.reviews set state = 'archived' where location_id = p_location and state in ('new', 'drafted', 'blocked');
  get diagnostics v_reviews = row_count;
  update public.concierge_tasks set state = 'cancelled', outcome = coalesce(outcome, 'disconnected'), updated_at = now()
   where location_id = p_location and state = 'open';
  get diagnostics v_tasks = row_count;
  -- Email links that would open or approve something: they stop working now.
  update public.action_tokens set expires_at = now()
   where location_id = p_location and used_at is null and expires_at > now();
  get diagnostics v_tokens = row_count;
  update public.jobs set state = 'failed', last_error = 'stopped: the owner disconnected Kabsi from Google',
    finished_at = now(), locked_at = null, locked_by = null
   where location_id = p_location and state in ('pending', 'retrying');
  get diagnostics v_jobs = row_count;

  perform private.audit('user', v_uid, 'disconnect_requested', p_location, 'location', p_location::text,
    jsonb_build_object('status', l.status),
    jsonb_build_object('status', 'paused', 'approvals_cancelled', v_pubs, 'reviews_archived', v_reviews,
      'concierge_tasks_cancelled', v_tasks, 'links_expired', v_tokens, 'jobs_stopped', v_jobs),
    'dashboard', 'requested');
  perform public.ops_emit('disconnect_requested', 'customers', ':electric_plug: Disconnect requested: ' || l.name,
    'The owner disconnected Kabsi in Settings. Kabsi removes its Manager access now; if Google refuses, a staff follow-up opens.',
    '[]', public.ops_staff_btn(), 'loc_disconnect:' || l.id);
  perform public.enqueue_job('disconnect', p_location, 'disconnect:' || p_location);
  return jsonb_build_object('state', 'removing', 'requested_at', now(), 'created', true);
end $$;

-- 6. The job's result -----------------------------------------------------------------------------------------------

create function public.record_disconnect_result(p_location uuid, p_ok boolean, p_error text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare l public.locations; v_id uuid; v_due timestamptz; v_new boolean;
begin
  select * into l from public.locations where id = p_location for update;
  if not found or l.disconnect_requested_at is null then raise exception 'no_disconnect_request'; end if;
  if p_ok or l.access_removed_at is not null then
    return jsonb_build_object('removed_at', private.mark_access_removed(p_location, 'system', null, 'google'), 'due_at', null);
  end if;

  insert into public.staff_followups as s (kind, location_id, location_name, detail, due_at)
  values ('google_access_removal', p_location, l.name, left(coalesce(p_error, 'failed'), 500),
    private.add_business_days(l.disconnect_requested_at, 7))
  on conflict (kind, location_id) where done_at is null do update set detail = excluded.detail
  returning s.id, s.due_at, (s.xmax = 0) into v_id, v_due, v_new;
  if v_new then
    perform private.audit('system', null, 'google_access_removal_failed', p_location, 'location', p_location::text,
      null, jsonb_build_object('followup_id', v_id, 'due_at', v_due), 'google', 'staff_followup');
    perform public.ops_emit('access_removal_followup', 'alerts',
      ':red_circle: Remove Kabsi from ' || l.name || ' by hand, due ' || to_char(v_due at time zone 'UTC', 'DD Mon YYYY'),
      'Kabsi could not remove its own Manager access after the owner disconnected. Google''s limit is 7 business days.',
      public.ops_f('Why', left(coalesce(p_error, ''), 300)), public.ops_staff_btn('Follow-ups'), 'followup:' || v_id);
  end if;
  return jsonb_build_object('removed_at', null, 'due_at', v_due, 'followup_id', v_id);
end $$;

-- 7. Staff finish a follow-up -----------------------------------------------------------------------------------------

create function public.staff_complete_followup(p_id uuid, p_note text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare f public.staff_followups; v_note text := btrim(coalesce(p_note, ''));
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  if v_note = '' or length(v_note) > 500 then raise exception 'note_required'; end if;
  select * into f from public.staff_followups where id = p_id for update;
  if not found then raise exception 'unknown_followup'; end if;
  if f.done_at is not null then return jsonb_build_object('done_at', f.done_at, 'created', false); end if;
  update public.staff_followups set done_at = now(), done_by = auth.uid(), done_note = v_note where id = p_id;
  if f.kind = 'google_access_removal' and f.location_id is not null then
    perform private.mark_access_removed(f.location_id, 'staff', auth.uid(), 'staff');
    -- The job sends the owner the "removed" notice (K-113.1).
    perform public.enqueue_job('disconnect', f.location_id, 'disconnect:' || f.location_id);
  end if;
  return jsonb_build_object('done_at', now(), 'created', true);
end $$;

revoke execute on function public.request_disconnect(uuid), public.record_disconnect_result(uuid, boolean, text),
  public.staff_complete_followup(uuid, text) from public, anon, authenticated;
grant execute on function public.request_disconnect(uuid), public.staff_complete_followup(uuid, text) to authenticated;
grant execute on function public.record_disconnect_result(uuid, boolean, text) to service_role;
revoke execute on function private.add_business_days(timestamptz, integer),
  private.mark_access_removed(uuid, text, uuid, text), private.jobs_skip_disconnected() from public, anon, authenticated;

-- 8. Slack lines: a disconnect writes its own, so the generic "access lost" and "paused" lines stay quiet for it. ------

create or replace function public.ops_on_location() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_partner public.partners; v_owner text; v_msg text;
begin
  if new.partner_id is not null then select * into v_partner from public.partners where id = new.partner_id; end if;
  if tg_op = 'INSERT' then
    select email into v_owner from auth.users where id = new.created_by;
    if coalesce(v_owner, '') like '%@test.local' then return new; end if;
    perform public.ops_emit('business_new', 'customers', ':convenience_store: New business started setup: ' || new.name,
      new.address,
      public.ops_f('Country', new.country) || public.ops_f('Owner', v_owner) || public.ops_f('Came from', new.signup_source)
        || public.ops_f('Partner', v_partner.name),
      public.ops_staff_btn(), 'loc_new:' || new.id);
    return new;
  end if;

  if new.status = 'active' and old.status is distinct from 'active' then
    perform public.ops_emit('business_live', 'customers', ':tada: ' || new.name || ' is live on Kabsi',
      'Google access works. Reviews are synced and drafted from now on.',
      public.ops_f('Country', new.country) || public.ops_f('Partner', v_partner.name),
      public.ops_staff_btn(), 'loc_live:' || new.id || ':' || extract(epoch from now())::bigint);
    if v_partner.id is not null then
      v_msg := 'Hi ' || v_partner.name || ', good news: ' || new.name || ' is now live on Kabsi. Thank you for bringing them in. Rasheed from Kabsi';
      perform public.ops_emit('partner_business_live', 'partners', ':tada: ' || v_partner.name || '''s client ' || new.name || ' is live',
        null, public.ops_f('Partner prefers', v_partner.preferred_channel),
        public.ops_btn('Tell them on WhatsApp', public.wa_link(v_partner.whatsapp, v_msg))
          || public.ops_btn('Email them', 'mailto:' || v_partner.contact_email || '?subject=' || public.url_encode(new.name || ' is live on Kabsi') || '&body=' || public.url_encode(v_msg)),
        'ploc_live:' || new.id || ':' || extract(epoch from now())::bigint);
    end if;
  end if;
  if new.access_lost_at is not null and old.access_lost_at is null and new.disconnect_requested_at is null then
    perform public.ops_emit('access_lost', 'alerts', ':warning: Google access lost: ' || new.name,
      'Kabsi can''t reach this Google profile any more (hello@kabsi.co removed or access changed). The owner was emailed the steps to add it back.',
      public.ops_f('Country', new.country) || public.ops_f('Partner', v_partner.name), public.ops_staff_btn(),
      'loc_lost:' || new.id || ':' || extract(epoch from new.access_lost_at)::bigint);
  end if;
  if new.deletion_requested_at is not null and old.deletion_requested_at is null then
    perform public.ops_emit('deletion_requested', 'customers', ':wastebasket: Deletion requested: ' || new.name,
      'The owner asked to remove this business from Kabsi. It goes in 7 days unless they cancel.', '[]', public.ops_staff_btn(),
      'loc_del:' || new.id || ':' || extract(epoch from new.deletion_requested_at)::bigint);
  elsif new.deletion_requested_at is null and old.deletion_requested_at is not null then
    perform public.ops_emit('deletion_cancelled', 'customers', ':relieved: Deletion cancelled: ' || new.name, null, '[]', '[]',
      'loc_undel:' || new.id || ':' || extract(epoch from now())::bigint);
  end if;
  if new.status in ('paused', 'disabled') and old.status is distinct from new.status
     and not (new.disconnect_requested_at is not null and old.disconnect_requested_at is null) then
    perform public.ops_emit('business_' || new.status, 'customers', ':pause_button: ' || new.name || ' is now ' || new.status, null,
      '[]', public.ops_staff_btn(), 'loc_' || new.status || ':' || new.id || ':' || extract(epoch from now())::bigint);
  end if;
  return new;
end $$;
