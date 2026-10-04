-- P0.1-10: append-only audit log and the "What Kabsi did" feed source (K-43, K-09, K-40, K-17, guardrail 8).
--
-- Additive only: one new table, functions and triggers. Nothing existing is dropped, moved or rewritten; the one
-- replaced function is private.run_retention, which keeps every step it had and adds the audit log's own rules.
--
--   public.audit_events      who did what, when, to which business and object, before and after (no review text,
--                            no reviewer names), channel, result, request id, IP country and user agent
--   private.audit(...)       the only insert path; no role has insert, update or delete on the table
--   immutability trigger     refuses UPDATE and DELETE for everyone, the table owner and the service role included,
--                            except inside private.run_retention (transaction-local flag kabsi.audit_retention):
--                            there it may only blank content fields and delete rows older than 24 months (K-40)
--   recording triggers       approvals and publications, knowledge edits, onboarding steps and consent, Google access
--                            and checks, role changes, review drafts, skips and concierge actions write events from
--                            the tables every path already writes, so no code path can skip the log
--   public.activity_feed()   owner-scoped plain lines for "What Kabsi did", routine checks collapsed to one a day
--
-- Request context (K-17): a signed-in browser call through the API records its own user agent and CF-IPCountry.
-- Edge Functions run as the service role and forward the owner's request as x-kabsi-request-id, x-kabsi-ip-country,
-- x-kabsi-user-agent and x-kabsi-actor-id headers (_shared/audit.ts); those headers count only for the service role.

-- 1. Table -------------------------------------------------------------------------------------------------------

create table public.audit_events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  actor_type text not null check (actor_type in ('user', 'staff', 'partner', 'system', 'google')),
  actor_id uuid,
  action text not null check (action ~ '^[a-z][a-z_]{1,62}$'),
  -- No foreign keys: the log outlives the business, the user and the object it describes (24 months, K-40), and a
  -- cascade would be an UPDATE or DELETE the immutability trigger refuses.
  organization_id uuid,
  location_id uuid,
  object_type text check (object_type ~ '^[a-z][a-z_]{1,62}$'),
  object_id text check (length(object_id) <= 200),
  before jsonb,
  after jsonb,
  channel text check (channel in ('dashboard', 'email_link', 'partner', 'staff', 'system', 'google')),
  result text check (length(result) <= 100),
  request_id text check (length(request_id) <= 100),
  ip_country text check (ip_country ~ '^[A-Z]{2}$'),
  user_agent text check (length(user_agent) <= 300),
  redacted_at timestamptz
);
comment on table public.audit_events is
  'P0.1-10 append-only audit log (K-43). Insert only through private.audit; UPDATE and DELETE only inside private.run_retention.';

create index audit_events_location_idx on public.audit_events (location_id, created_at desc) where location_id is not null;
create index audit_events_organization_idx on public.audit_events (organization_id, created_at desc) where organization_id is not null;
create index audit_events_created_idx on public.audit_events (created_at);

alter table public.audit_events enable row level security;
-- Members of the business, owners and admins of the organisation, and Kabsi staff read; nobody writes directly.
create policy audit_events_read on public.audit_events for select to authenticated
  using ((location_id is not null and public.is_member(location_id))
      or (organization_id is not null and public.is_org_member(organization_id, array['owner', 'admin']))
      or public.is_staff());
revoke all on public.audit_events from public, anon, authenticated, service_role;
grant select on public.audit_events to authenticated, service_role;

-- 2. Immutability ------------------------------------------------------------------------------------------------

create or replace function private.audit_events_immutable() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'TRUNCATE' or coalesce(current_setting('kabsi.audit_retention', true), '') <> 'on' then
    raise exception 'audit_events is append-only' using errcode = '42501';
  end if;
  if tg_op = 'DELETE' then
    if old.created_at >= now() - interval '24 months' then
      raise exception 'audit_events: only entries older than 24 months may be deleted' using errcode = '42501';
    end if;
    return old;
  end if;
  -- Retention may only blank the content fields; who, what, when, where and the result stay as recorded.
  if (new.id, new.created_at, new.actor_type, new.actor_id, new.action, new.organization_id, new.location_id,
      new.object_type, new.object_id, new.channel, new.result, new.request_id, new.ip_country, new.user_agent)
     is distinct from
     (old.id, old.created_at, old.actor_type, old.actor_id, old.action, old.organization_id, old.location_id,
      old.object_type, old.object_id, old.channel, old.result, old.request_id, old.ip_country, old.user_agent)
     or (new.before is not null and new.before is distinct from old.before)
     or (new.after is not null and new.after is distinct from old.after)
     or new.redacted_at is null then
    raise exception 'audit_events: retention may only redact before and after' using errcode = '42501';
  end if;
  return new;
end $$;

create trigger audit_events_immutable before update or delete on public.audit_events
  for each row execute function private.audit_events_immutable();
create trigger audit_events_no_truncate before truncate on public.audit_events
  for each statement execute function private.audit_events_immutable();

-- 3. The insert path ---------------------------------------------------------------------------------------------

-- The request behind the current statement, from PostgREST's request.headers. x-kabsi-* headers are trusted only
-- when the caller is the service role (an Edge Function forwarding the owner's request); a browser call records its
-- own headers. Outside an API request (cron, migrations, tests without headers) everything is null.
create or replace function private.audit_request(out request_id text, out ip_country text, out user_agent text,
  out actor_id uuid)
language plpgsql stable set search_path = '' as $$
declare h jsonb; v_role text; v_country text; v_actor text;
begin
  begin
    h := nullif(current_setting('request.headers', true), '')::jsonb;
    v_role := nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role';
  exception when others then
    h := null;
  end;
  if h is null or jsonb_typeof(h) <> 'object' then return; end if;
  if v_role = 'service_role' then
    request_id := h ->> 'x-kabsi-request-id';
    v_country := h ->> 'x-kabsi-ip-country';
    user_agent := h ->> 'x-kabsi-user-agent';
    v_actor := h ->> 'x-kabsi-actor-id';
    if v_actor ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then actor_id := v_actor::uuid; end if;
  else
    request_id := coalesce(h ->> 'x-request-id', h ->> 'cf-ray');
    v_country := h ->> 'cf-ipcountry';
    user_agent := h ->> 'user-agent';
  end if;
  request_id := left(nullif(trim(request_id), ''), 100);
  v_country := upper(trim(coalesce(v_country, '')));
  ip_country := case when v_country ~ '^[A-Z]{2}$' and v_country <> 'XX' then v_country end;
  user_agent := left(nullif(trim(user_agent), ''), 300);
end $$;

-- Who is acting: the signed-in user (staff when they are on the staff list), the user an Edge Function acts for, or
-- the system.
create or replace function private.audit_actor(out actor_type text, out actor_id uuid)
language plpgsql stable security definer set search_path = '' as $$
begin
  actor_id := coalesce(auth.uid(), (private.audit_request()).actor_id);
  if actor_id is null then
    actor_type := 'system';
  elsif exists (select 1 from public.staff s where s.user_id = actor_id) then
    actor_type := 'staff';
  else
    actor_type := 'user';
  end if;
end $$;

create or replace function private.audit(
  p_actor_type text, p_actor_id uuid, p_action text, p_location uuid, p_object_type text, p_object_id text,
  p_before jsonb default null, p_after jsonb default null, p_channel text default null, p_result text default null,
  p_organization uuid default null
) returns bigint
language plpgsql security definer set search_path = '' as $$
declare r record; v_org uuid := p_organization; v_id bigint;
begin
  if v_org is null and p_location is not null then
    select organization_id into v_org from public.locations where id = p_location;
  end if;
  r := private.audit_request();
  insert into public.audit_events (actor_type, actor_id, action, organization_id, location_id, object_type, object_id,
    before, after, channel, result, request_id, ip_country, user_agent)
  values (p_actor_type, p_actor_id, p_action, v_org, p_location, p_object_type, left(p_object_id, 200),
    p_before, p_after, p_channel, left(p_result, 100), r.request_id, r.ip_country, r.user_agent)
  returning id into v_id;
  return v_id;
end $$;

-- 4. Recording triggers ------------------------------------------------------------------------------------------

-- Approvals and publications (D202, K-17). The approval is the publications row itself; the publication event is
-- its outcome. Payload text stays in publications (redacted with its review); the log keeps ids and states only.
create or replace function private.audit_publication() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_after jsonb := jsonb_build_object('publication_id', new.id, 'target_type', new.target_type,
  'route', new.route, 'status', new.status);
begin
  if tg_op = 'INSERT' then
    perform private.audit('user', new.approved_by, 'approval', new.location_id, new.target_type, new.target_id::text,
      null, v_after, new.channel, 'approved');
  elsif new.status is distinct from old.status and new.status in ('live', 'in_review', 'rejected', 'failed', 'cancelled') then
    perform private.audit(case when new.posted_manually_by is not null then 'staff' else 'system' end,
      new.posted_manually_by, 'publication', new.location_id, new.target_type, new.target_id::text,
      jsonb_build_object('status', old.status), v_after, new.channel, new.status);
  end if;
  return null;
end $$;

create trigger publications_audit after insert or update of status on public.publications
  for each row execute function private.audit_publication();

-- Business-level changes: About your business, onboarding, consent, Google access and checks, concierge, deletion.
create or replace function private.audit_location() returns trigger
language plpgsql security definer set search_path = '' as $$
declare a record; v_before jsonb; v_after jsonb;
begin
  a := private.audit_actor();
  if new.knowledge_card is distinct from old.knowledge_card then
    -- Only the fields that changed. These are the owner's own facts (kept for the life of the account, K-40);
    -- private.run_retention blanks them once the business is deleted.
    select jsonb_object_agg(k, coalesce(o.v, 'null'::jsonb)) filter (where o.v is distinct from n.v),
           jsonb_object_agg(k, coalesce(n.v, 'null'::jsonb)) filter (where o.v is distinct from n.v)
      into v_before, v_after
      from (select jsonb_object_keys(coalesce(old.knowledge_card, '{}')) k
            union select jsonb_object_keys(coalesce(new.knowledge_card, '{}'))) keys
      left join lateral (select old.knowledge_card -> keys.k v) o on true
      left join lateral (select new.knowledge_card -> keys.k v) n on true;
    perform private.audit(a.actor_type, a.actor_id, 'knowledge_edit', new.id, 'knowledge_card', new.id::text,
      v_before, v_after, case when a.actor_type = 'system' then 'system' else 'dashboard' end, 'saved');
  end if;
  if new.onboarding_step is distinct from old.onboarding_step then
    perform private.audit(a.actor_type, a.actor_id, 'onboarding_step', new.id, 'location', new.id::text,
      jsonb_build_object('step', old.onboarding_step), jsonb_build_object('step', new.onboarding_step),
      case when a.actor_type = 'system' then 'system' else 'dashboard' end, new.onboarding_step);
  end if;
  if new.consent_at is not null and new.consent_at is distinct from old.consent_at then
    perform private.audit(a.actor_type, a.actor_id, 'consent_saved', new.id, 'location', new.id::text,
      null, jsonb_build_object('consent_at', new.consent_at), 'dashboard', 'saved');
  end if;
  if new.access_granted_at is not null and old.access_granted_at is null then
    perform private.audit('system', null, 'google_access_granted', new.id, 'location', new.id::text,
      null, null, 'system', 'granted');
  end if;
  if new.access_lost_at is not null and old.access_lost_at is null then
    perform private.audit('system', null, 'google_access_lost', new.id, 'location', new.id::text,
      null, null, 'system', 'lost');
  end if;
  if new.reviews_synced_at is not null and new.reviews_synced_at is distinct from old.reviews_synced_at then
    perform private.audit('system', null, 'google_check', new.id, 'location', new.id::text,
      null, null, 'system', 'checked');
  end if;
  if new.concierge is distinct from old.concierge then
    perform private.audit(a.actor_type, a.actor_id, case when new.concierge then 'concierge_on' else 'concierge_off' end,
      new.id, 'location', new.id::text, null, null, 'staff', 'saved');
  end if;
  if new.deletion_requested_at is distinct from old.deletion_requested_at then
    perform private.audit(a.actor_type, a.actor_id,
      case when new.deletion_requested_at is null then 'deletion_cancelled' else 'deletion_requested' end,
      new.id, 'location', new.id::text, null, null,
      case when a.actor_type = 'system' then 'system' else 'dashboard' end, 'saved');
  end if;
  return null;
end $$;

create trigger locations_audit after update of knowledge_card, onboarding_step, consent_at, access_granted_at,
  access_lost_at, reviews_synced_at, concierge, deletion_requested_at on public.locations
  for each row execute function private.audit_location();

-- Role changes on a business and in an organisation (K-16).
create or replace function private.audit_member() returns trigger
language plpgsql security definer set search_path = '' as $$
declare a record; r record; v_action text; v_loc uuid; v_org uuid;
begin
  a := private.audit_actor();
  if tg_op = 'DELETE' then r := old; else r := new; end if;
  if tg_op = 'UPDATE' and new.role is not distinct from old.role then return null; end if;
  v_action := case tg_op when 'INSERT' then 'role_added' when 'UPDATE' then 'role_changed' else 'role_removed' end;
  if tg_table_name = 'location_members' then
    v_loc := r.location_id;
  else
    v_org := r.organization_id;
  end if;
  perform private.audit(a.actor_type, a.actor_id, v_action, v_loc, 'user', r.user_id::text,
    case when tg_op <> 'INSERT' then jsonb_build_object('role', old.role) end,
    case when tg_op <> 'DELETE' then jsonb_build_object('role', new.role, 'scope', tg_table_name) end,
    case when a.actor_type = 'system' then 'system' when a.actor_type = 'staff' then 'staff' else 'dashboard' end,
    'saved', v_org);
  return null;
end $$;

create trigger location_members_audit after insert or update or delete on public.location_members
  for each row execute function private.audit_member();
create trigger organization_members_audit after insert or update or delete on public.organization_members
  for each row execute function private.audit_member();

-- Reviews: drafts ready, owner decisions without a reply, and reviews staff typed in for a concierge business.
-- No review text or reviewer name goes into the log.
create or replace function private.audit_review() returns trigger
language plpgsql security definer set search_path = '' as $$
declare a record;
begin
  if tg_op = 'INSERT' then
    if new.source = 'concierge' then
      perform private.audit('staff', new.entered_by, 'concierge_review_entered', new.location_id, 'review', new.id::text,
        null, jsonb_build_object('star_rating', new.star_rating), 'staff', 'saved');
    end if;
    return null;
  end if;
  if new.state is not distinct from old.state then return null; end if;
  -- publishing -> drafted is a failed or cancelled publication handing the draft back, not a new draft.
  if new.state = 'drafted' and old.state <> 'publishing' then
    perform private.audit('system', null, 'reply_drafted', new.location_id, 'review', new.id::text,
      jsonb_build_object('state', old.state), jsonb_build_object('state', new.state), 'system', 'drafted');
  elsif new.state in ('skipped', 'handled_offline') then
    a := private.audit_actor();
    perform private.audit(a.actor_type, a.actor_id, case new.state when 'skipped' then 'review_skipped' else 'review_handled_offline' end,
      new.location_id, 'review', new.id::text, jsonb_build_object('state', old.state), jsonb_build_object('state', new.state),
      case when a.actor_type = 'system' then 'system' else 'dashboard' end, new.state);
  end if;
  return null;
end $$;

create trigger reviews_audit after insert or update of state on public.reviews
  for each row execute function private.audit_review();

-- Concierge tasks (D267): opened, claimed, done or cancelled, with the person who did it.
create or replace function private.audit_concierge_task() returns trigger
language plpgsql security definer set search_path = '' as $$
declare a record; v_after jsonb := jsonb_build_object('kind', new.kind, 'state', new.state, 'outcome', new.outcome,
  'review_id', new.review_id, 'publication_id', new.publication_id);
begin
  a := private.audit_actor();
  if tg_op = 'INSERT' then
    perform private.audit(a.actor_type, a.actor_id, 'concierge_task_opened', new.location_id, 'concierge_task',
      new.id::text, null, v_after, case when a.actor_type = 'system' then 'system' else 'staff' end, new.state);
    return null;
  end if;
  if new.claimed_by is not null and new.claimed_by is distinct from old.claimed_by then
    perform private.audit('staff', new.claimed_by, 'concierge_task_claimed', new.location_id, 'concierge_task',
      new.id::text, null, v_after, 'staff', 'claimed');
  end if;
  if new.state is distinct from old.state then
    perform private.audit(case when new.done_by is not null then 'staff' else a.actor_type end,
      coalesce(new.done_by, a.actor_id), 'concierge_task_' || new.state, new.location_id, 'concierge_task',
      new.id::text, jsonb_build_object('state', old.state), v_after,
      case when new.done_by is not null or a.actor_type = 'staff' then 'staff' else 'system' end, new.state);
  end if;
  return null;
end $$;

create trigger concierge_tasks_audit after insert or update of state, claimed_by on public.concierge_tasks
  for each row execute function private.audit_concierge_task();

revoke all on function private.audit_events_immutable(), private.audit_request(), private.audit_actor(),
  private.audit(text, uuid, text, uuid, text, text, jsonb, jsonb, text, text, uuid), private.audit_publication(),
  private.audit_location(), private.audit_member(), private.audit_review(), private.audit_concierge_task()
  from public, anon, authenticated;

-- 5. "What Kabsi did" (K-09) -------------------------------------------------------------------------------------

-- Plain lines read from the log, newest first, days in the business's time zone. Routine checks and photos are one
-- line a day; failed, cancelled and rejected publications are not work done and stay out of the feed.
create or replace function public.activity_feed(p_location uuid, p_days integer default 7)
returns table (day date, happened_at timestamptz, action text, line text, times integer)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
declare v_tz text; v_days integer := least(greatest(coalesce(p_days, 7), 1), 90);
begin
  if not (public.is_member(p_location) or public.is_staff()) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select coalesce(nullif(l.time_zone, ''), 'UTC') into v_tz from public.locations l where l.id = p_location;
  if v_tz is null or not exists (select 1 from pg_catalog.pg_timezone_names where name = v_tz) then v_tz := 'UTC'; end if;

  return query
  with ev as (
    select e.*, (e.created_at at time zone v_tz)::date as d, e.after ->> 'target_type' as target
    from public.audit_events e
    where e.location_id = p_location and e.created_at >= now() - make_interval(days => v_days)
      and (e.action in ('google_check', 'reply_drafted')
        or (e.action = 'publication' and e.result in ('live', 'in_review')))
  ), grouped as (
    select ev.d, max(ev.created_at) as happened_at, ev.action, null::text as target, null::text as result, null::text as actor_type,
           null::text as object_id, count(*)::integer as n
    from ev where ev.action = 'google_check' group by ev.d, ev.action
    union all
    select ev.d, max(ev.created_at), ev.action, ev.target, 'live', null, null, count(*)::integer
    from ev where ev.action = 'publication' and ev.target = 'photo' and ev.result = 'live' group by ev.d, ev.action, ev.target
    union all
    select ev.d, ev.created_at, ev.action, ev.target, ev.result, ev.actor_type, ev.object_id, 1
    from ev where ev.action = 'reply_drafted'
       or (ev.action = 'publication' and not (ev.target = 'photo' and ev.result = 'live'))
  )
  select g.d, g.happened_at, g.action,
    case
      when g.action = 'google_check' then 'Checked your Google profile'
      when g.action = 'reply_drafted' then
        coalesce('Prepared a reply to ' || nullif(split_part(trim(r.reviewer_name), ' ', 1), '') || '''s review',
                 'Prepared a reply to a review')
      when g.target = 'photo' and g.result = 'live' then
        case when g.n = 1 then 'Added 1 approved photo' else 'Added ' || g.n || ' approved photos' end
      when g.target = 'review_reply' and g.actor_type = 'staff' then 'Our team posted your approved reply on Google'
      when g.target = 'review_reply' and g.result = 'in_review' then 'Sent your approved reply to Google, which is checking it'
      when g.target = 'review_reply' then 'Published your approved reply'
      when g.target = 'local_post' and g.result = 'in_review' then 'Sent your approved post to Google, which is checking it'
      when g.target = 'local_post' then 'Published your approved post'
      when g.target = 'photo' then 'Sent your approved photo to Google, which is checking it'
      when g.target = 'special_hours' then 'Updated your special hours on Google'
      when g.target = 'listing_edit' then 'Updated your Google profile with the change you approved'
      when g.target = 'listing_revert' then 'Restored your approved information on Google'
      else 'Updated Google with something you approved'
    end,
    g.n
  from grouped g
  left join public.reviews r on g.action = 'reply_drafted' and r.id::text = g.object_id and r.content_purged_at is null
  order by g.happened_at desc
  limit 200;
end $$;

revoke all on function public.activity_feed(uuid, integer) from public, anon;
grant execute on function public.activity_feed(uuid, integer) to authenticated, service_role;

-- 6. Retention (K-40): the audit log's rules join the daily job ---------------------------------------------------

create or replace function private.run_retention() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_reviews int; v_emails int; v_locs uuid[]; v_text int; v_ratings int; v_reports int; v_changes int; v_drafts int; v_pubs int;
  v_audit_redacted int; v_audit_deleted int;
begin
  -- Access lost for 30 days: drop the business's Google data entirely (migration 020). reply_drafts and
  -- publications cascade or stay orphaned-but-harmless once the review/location row is gone.
  select coalesce(array_agg(id), '{}') into v_locs from public.locations
   where access_lost_at < now() - interval '30 days' and access_granted_at is null;
  delete from public.reviews where location_id = any(v_locs);
  get diagnostics v_reviews = row_count;
  delete from public.listing_changes where location_id = any(v_locs);
  delete from public.listing_baselines where location_id = any(v_locs);
  update public.locations set reviews_synced_at = null, backlog_emailed_at = null where id = any(v_locs);

  -- Google content older than 30 days since Google last returned it.
  update public.reviews set comment = null, reviewer_name = null, content_purged_at = now()
   where content_purged_at is null and fetched_at < now() - interval '30 days';
  get diagnostics v_text = row_count;
  delete from public.rating_snapshots where taken_on < current_date - 30;
  get diagnostics v_ratings = row_count;
  update public.weekly_reports set data = jsonb_set(data, '{quotes}', '[]'::jsonb)
   where created_at < now() - interval '30 days' and jsonb_array_length(coalesce(data->'quotes', '[]'::jsonb)) > 0;
  get diagnostics v_reports = row_count;
  update public.listing_changes set old_value = null, new_value = null
   where state <> 'open' and created_at < now() - interval '30 days' and (old_value is not null or new_value is not null);
  get diagnostics v_changes = row_count;

  -- D266: drafts and the exact reply payload about a review lose their point once that review's Google
  -- content is purged, so clear them in the same pass rather than on their own separate timer.
  update public.reply_drafts set body = '', instruction = null, redacted_at = now()
   where redacted_at is null
     and review_id in (select id from public.reviews where content_purged_at is not null);
  get diagnostics v_drafts = row_count;
  update public.publications set payload = jsonb_build_object('redacted', true), payload_redacted_at = now()
   where payload_redacted_at is null and target_type = 'review_reply'
     and target_id in (select id from public.reviews where content_purged_at is not null);
  get diagnostics v_pubs = row_count;

  delete from public.emails where created_at < now() - interval '12 months';
  get diagnostics v_emails = row_count;

  -- P0.1-10 (K-40): the audit log keeps who, what and when for 24 months. Content fields are blanked once the
  -- business is deleted (owner facts) or the review they describe has lost its Google content; entries older than
  -- 24 months are deleted. The flag is transaction-local and is cleared again before this function returns.
  perform set_config('kabsi.audit_retention', 'on', true);
  update public.audit_events e set before = null, after = null, redacted_at = now()
   where e.redacted_at is null and (e.before is not null or e.after is not null)
     and ((e.location_id is not null and not exists (select 1 from public.locations l where l.id = e.location_id))
       or (e.object_type = 'review' and not exists (select 1 from public.reviews r
             where r.id::text = e.object_id and r.content_purged_at is null)));
  get diagnostics v_audit_redacted = row_count;
  delete from public.audit_events where created_at < now() - interval '24 months';
  get diagnostics v_audit_deleted = row_count;
  perform set_config('kabsi.audit_retention', 'off', true);

  insert into public.jobs_log (job, ok, detail)
  select 'retention', true, jsonb_build_object('locations', cardinality(v_locs), 'reviews', v_reviews, 'emails', v_emails,
         'review_text', v_text, 'ratings', v_ratings, 'report_quotes', v_reports, 'shield_values', v_changes,
         'drafts_redacted', v_drafts, 'payloads_redacted', v_pubs,
         'audit_redacted', v_audit_redacted, 'audit_deleted', v_audit_deleted)
  where cardinality(v_locs) + v_emails + v_text + v_ratings + v_reports + v_changes + v_drafts + v_pubs
        + v_audit_redacted + v_audit_deleted > 0;
  return jsonb_build_object('locations', cardinality(v_locs), 'reviews', v_reviews, 'emails', v_emails,
         'review_text', v_text, 'ratings', v_ratings, 'report_quotes', v_reports, 'shield_values', v_changes,
         'drafts_redacted', v_drafts, 'payloads_redacted', v_pubs,
         'audit_redacted', v_audit_redacted, 'audit_deleted', v_audit_deleted);
end $$;

revoke all on function private.run_retention() from public, anon, authenticated;
