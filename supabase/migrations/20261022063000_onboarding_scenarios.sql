-- P0.4-04: the situation an owner reports while adding Kabsi as a Manager, and the reminders that follow (K-94 to K-98,
-- K-61, K-114.3, K-116.8, guardrail 13).
--
-- 1. public.onboarding_scenarios: one row per business, the situation the owner reported with three tappable questions
--    or one tap in a list (manager not owner, needs verifying, Google is reviewing, suspended, someone else holds it, no
--    profile in this account, not eligible, several locations, workspace blocks it). Members read it through RLS; the
--    owner or a manager writes it only through set_onboarding_scenario, scenario_done ("I've done it") and
--    clear_onboarding_scenario ("Back to the steps"). Nothing is deleted: clearing sets resolved_at. Working access
--    resolves every situation except not_eligible by itself (trigger on google_connections), so reminders stop at access.
--    The foreign key to locations is in 20261022063010_onboarding_scenarios_links.sql.
-- 2. A business marked not_eligible never starts a trial (K-98, K-94): public.grant_trial_if_eligible, the one entry
--    point every trial start goes through, returns null while that situation is open. Every other situation costs no
--    trial day because the trial starts only at working access to a verified profile (P0.4-06).
-- 3. lifecycle_snapshots also carries the open situation (id, variant, when it began, when the owner said "I've done
--    it"), and lists a business with an open situation however old it is, so the verification check-backs every 2 days
--    and the ownership reminders on day 3 and day 7 reach it (the rules are in _shared/lifecycle.ts).
-- 4. A staff follow-up of kind whatsapp_nudge: 72 hours after the owner agreed and gave Kabsi no access, when the owner
--    has given a phone number (contacts.phone for an owner address), a task asks staff to send a personal WhatsApp by hand
--    (K-61). It carries no phone number, only where to find it (Staff, Contacts). One per business, ever. An hourly job.
--
-- Additive: one table, five functions, one trigger, one widened check, one job. No row changes and nothing is dropped.

-- 1. The table and its writers -------------------------------------------------------------------------------------------

create table public.onboarding_scenarios (
  location_id uuid primary key,
  scenario text not null check (scenario in ('manager_not_owner', 'needs_verifying', 'google_reviewing', 'suspended',
    'someone_else_owns', 'no_profile_in_account', 'not_eligible', 'several_locations', 'workspace_blocks')),
  variant text check (variant in ('lost_login', 'agency_has_it', 'dont_know')),
  started_at timestamptz not null default now(),
  done_at timestamptz,
  resolved_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint onboarding_scenarios_variant_only_for_owner check (variant is null or scenario = 'someone_else_owns')
);
comment on table public.onboarding_scenarios is
  'The situation the owner reported while adding Kabsi (K-94): one row per business, written only by set_onboarding_scenario, scenario_done and clear_onboarding_scenario. resolved_at is set when it is cleared or access works.';

alter table public.onboarding_scenarios enable row level security;
revoke all on public.onboarding_scenarios from public, anon, authenticated;
create policy members_read_scenarios on public.onboarding_scenarios for select to authenticated
  using ((select public.has_location_role(location_id, array['owner', 'manager'])) or (select public.is_staff()));
grant select on public.onboarding_scenarios to authenticated, service_role;

create function public.set_onboarding_scenario(p_location uuid, p_scenario text, p_variant text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); old public.onboarding_scenarios; v_changed boolean;
begin
  if v_uid is null then raise exception 'sign_in_required' using errcode = '42501'; end if;
  if not public.has_location_role(p_location, array['owner', 'manager']) then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_scenario not in ('manager_not_owner', 'needs_verifying', 'google_reviewing', 'suspended', 'someone_else_owns',
                        'no_profile_in_account', 'not_eligible', 'several_locations', 'workspace_blocks') then
    raise exception 'bad_scenario';
  end if;
  if p_variant is not null and (p_scenario <> 'someone_else_owns' or p_variant not in ('lost_login', 'agency_has_it', 'dont_know')) then
    raise exception 'bad_variant';
  end if;
  -- Access already works: there is nothing to report, so nothing is stored.
  if exists (select 1 from public.google_connections g where g.location_id = p_location and g.access_state = 'granted') then return; end if;
  select * into old from public.onboarding_scenarios where location_id = p_location for update;
  v_changed := not found or old.resolved_at is not null or old.scenario <> p_scenario or old.variant is distinct from p_variant;
  insert into public.onboarding_scenarios as s (location_id, scenario, variant)
  values (p_location, p_scenario, p_variant)
  on conflict (location_id) do update set
    scenario = excluded.scenario, variant = excluded.variant, resolved_at = null, updated_at = now(),
    started_at = case when v_changed then now() else s.started_at end,
    done_at = case when v_changed then null else s.done_at end;
  if v_changed then
    perform private.audit('user', v_uid, 'scenario_set', p_location, 'location', p_location::text, null,
      jsonb_build_object('scenario', p_scenario, 'variant', p_variant), 'dashboard', p_scenario);
  end if;
end $$;

-- "I've done it": the owner did what the screen said. Starts the day 3 and day 7 ownership reminders, and counts the
-- verification check-backs from the situation's start. There is nothing to do for a business that is not eligible.
create function public.scenario_done(p_location uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_scenario text;
begin
  if v_uid is null then raise exception 'sign_in_required' using errcode = '42501'; end if;
  if not public.has_location_role(p_location, array['owner', 'manager']) then raise exception 'forbidden' using errcode = '42501'; end if;
  update public.onboarding_scenarios set done_at = coalesce(done_at, now()), updated_at = now()
   where location_id = p_location and resolved_at is null and scenario <> 'not_eligible' and done_at is null
  returning scenario into v_scenario;
  if v_scenario is not null then
    perform private.audit('user', v_uid, 'scenario_done', p_location, 'location', p_location::text, null,
      jsonb_build_object('scenario', v_scenario), 'dashboard', v_scenario);
  end if;
end $$;

-- "Back to the steps": the owner says the situation is not theirs, or is sorted. Reminders for it stop.
create function public.clear_onboarding_scenario(p_location uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_scenario text;
begin
  if v_uid is null then raise exception 'sign_in_required' using errcode = '42501'; end if;
  if not public.has_location_role(p_location, array['owner', 'manager']) then raise exception 'forbidden' using errcode = '42501'; end if;
  update public.onboarding_scenarios set resolved_at = now(), updated_at = now()
   where location_id = p_location and resolved_at is null
  returning scenario into v_scenario;
  if v_scenario is not null then
    perform private.audit('user', v_uid, 'scenario_cleared', p_location, 'location', p_location::text, null,
      jsonb_build_object('scenario', v_scenario), 'dashboard', v_scenario);
  end if;
end $$;

revoke execute on function public.set_onboarding_scenario(uuid, text, text), public.scenario_done(uuid),
  public.clear_onboarding_scenario(uuid) from public, anon;
grant execute on function public.set_onboarding_scenario(uuid, text, text), public.scenario_done(uuid),
  public.clear_onboarding_scenario(uuid) to authenticated;

-- Working access ends every situation except not_eligible (an honest stop stays until staff or the owner change it).
create function private.scenario_resolve_on_access() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.onboarding_scenarios set resolved_at = now(), updated_at = now()
   where location_id = new.location_id and resolved_at is null and scenario <> 'not_eligible';
  return null;
end $$;
revoke execute on function private.scenario_resolve_on_access() from public, anon, authenticated;
create trigger google_connections_resolve_scenario after insert or update of access_state on public.google_connections
  for each row when (new.access_state = 'granted') execute function private.scenario_resolve_on_access();

-- 2. Not eligible never starts a trial ----------------------------------------------------------------------------------

create function private.trial_blocked(p_location uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.onboarding_scenarios s
                  where s.location_id = p_location and s.scenario = 'not_eligible' and s.resolved_at is null)
$$;
revoke execute on function private.trial_blocked(uuid) from public, anon, authenticated;

create or replace function public.grant_trial_if_eligible(p_location uuid, p_ignore_flag boolean default false, p_days integer default null)
returns uuid
language plpgsql security definer set search_path = '' as $$
begin
  if private.trial_blocked(p_location) then return null; end if;
  return private.start_trial(p_location, p_days);
end $$;

-- 3. What the lifecycle job reads -------------------------------------------------------------------------------------

create or replace function public.lifecycle_snapshots(p_now timestamptz default now()) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(x.j), '[]'::jsonb) from (
    select jsonb_build_object(
      'location_id', l.id,
      'organization_id', l.organization_id,
      'name', l.name,
      'time_zone', l.time_zone,
      'country', l.country,
      'status', l.status,
      'created_at', l.created_at,
      'consent_at', l.consent_at,
      'access_granted_at', l.access_granted_at,
      'entitlement', e2.ent ->> 'state',
      'trial_started_at', ts.trial_started_at,
      'trial_ends_at', ts.trial_ends_at,
      'owners', coalesce((select jsonb_agg(jsonb_build_object('user_id', o.user_id, 'email', o.email)) from public.notification_recipients(l.id, array['owner']) o where o.user_id is not null), '[]'::jsonb),
      'marketing_consent', exists (select 1 from public.contacts c where c.marketing_consent
                                    and lower(c.email) in (select o.email from public.notification_recipients(l.id, array['owner']) o)),
      'waiting_reviews', (select count(*) from public.reviews r where r.location_id = l.id and r.state in ('drafted', 'blocked')),
      'waiting_changes', (select count(*) from public.profile_changes c where c.location_id = l.id and c.status = 'awaiting_review'),
      'first_approval_at', (select min(e.created_at) from public.audit_events e where e.location_id = l.id and e.action = 'approval' and e.object_type = 'review_reply'),
      'scenario', (select jsonb_build_object('id', sc.scenario, 'variant', sc.variant, 'started_at', sc.started_at, 'done_at', sc.done_at)
                     from public.onboarding_scenarios sc where sc.location_id = l.id and sc.resolved_at is null),
      'recap', jsonb_build_object(
        'replies_prepared', (select count(*) from public.audit_events e where e.location_id = l.id and e.action = 'reply_drafted'
                               and e.created_at >= coalesce(ts.trial_started_at, l.created_at)),
        'replies_sent', (select count(distinct e.after ->> 'publication_id') from public.audit_events e where e.location_id = l.id and e.action = 'publication'
                           and e.object_type = 'review_reply' and e.result in ('live', 'in_review') and e.created_at >= coalesce(ts.trial_started_at, l.created_at)),
        'posts_sent', (select count(distinct e.after ->> 'publication_id') from public.audit_events e where e.location_id = l.id and e.action = 'publication'
                         and e.object_type = 'local_post' and e.result in ('live', 'in_review') and e.created_at >= coalesce(ts.trial_started_at, l.created_at)),
        'changes_caught', (select count(distinct e.object_id) from public.audit_events e where e.location_id = l.id and e.action = 'protection_change'
                             and e.result = 'awaiting_review' and e.created_at >= coalesce(ts.trial_started_at, l.created_at)))
    ) as j
    from public.locations l
    left join lateral (select s.trial_started_at, s.trial_ends_at from public.subscriptions s
                        where s.organization_id = l.organization_id and s.trial_started_at is not null
                        order by s.trial_started_at desc limit 1) ts on true
    cross join lateral (select private.entitlements(l.organization_id, l.id) as ent) e2
    where not l.is_demo and not l.concierge
      and (l.created_at > p_now - interval '14 days' or ts.trial_started_at > p_now - interval '75 days'
           or exists (select 1 from public.onboarding_scenarios sc where sc.location_id = l.id and sc.resolved_at is null
                        and sc.started_at > p_now - interval '45 days'))
  ) x
$$;
revoke execute on function public.lifecycle_snapshots(timestamptz) from public, anon, authenticated;
grant execute on function public.lifecycle_snapshots(timestamptz) to service_role;

-- 4. The personal WhatsApp nudge at 72 hours (K-61) ---------------------------------------------------------------------

alter table public.staff_followups drop constraint staff_followups_kind_check;
alter table public.staff_followups add constraint staff_followups_kind_check
  check (kind in ('google_access_removal', 'google_support', 'whatsapp_nudge'));

-- One follow-up per business, ever, for an owner who agreed 72 hours ago, still has no access, and gave a phone number.
-- The follow-up holds no phone number: it says where staff find it. It stops being made once access works.
create function private.onboarding_nudges() returns integer
language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  insert into public.staff_followups (kind, location_id, location_name, detail, due_at)
  select 'whatsapp_nudge', l.id, l.name,
    left('The owner agreed 72 hours ago and Kabsi has no access yet. They gave a phone number (Staff, Contacts, ' || c.email
      || '). Send a short personal WhatsApp from your own phone asking if they need a hand adding Kabsi as a Manager, and offer the free setup call. Never ask for a Google password or code.', 500),
    now()
  from public.locations l
  cross join lateral (select o.email from public.notification_recipients(l.id, array['owner']) o where o.user_id is not null order by o.email limit 1) own
  join lateral (select ct.email from public.contacts ct where lower(ct.email) = lower(own.email) and nullif(btrim(ct.phone), '') is not null limit 1) c on true
  where l.consent_at is not null and l.consent_at <= now() - interval '72 hours'
    and l.access_granted_at is null and l.status = 'access_pending'
    and not l.is_demo and not l.concierge
    and not private.trial_blocked(l.id)
    and not exists (select 1 from public.staff_followups f where f.kind = 'whatsapp_nudge' and f.location_id = l.id);
  get diagnostics n = row_count;
  return n;
end $$;
revoke execute on function private.onboarding_nudges() from public, anon, authenticated;

select cron.schedule('kabsi_onboarding_nudges', '23 * * * *', $$select private.onboarding_nudges()$$);
