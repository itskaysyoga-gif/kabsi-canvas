-- P0.1-09: tenant model (K-33, K-16 roles, K-48 billing on the organisation, R-07, R-22).
--
-- Expand only. New tables next to the old columns, filled from them and kept in step with them by triggers, so every
-- screen, RPC and Edge Function on main keeps working unchanged. Later tasks move readers and writers over and then
-- drop the old columns (contract step); nothing is dropped here.
--
--   organizations          the paying customer: one owner (with one or more businesses) or one partner (agency)
--   organization_members   user and role in the organisation (owner, admin, member)
--   locations.organization_id   every business belongs to exactly one organisation
--   location_members.role  owner, manager and now staff (K-16; partner members reach clients through partner_clients)
--   partner_clients        partner organisation, client business, status, approval policy, consent (one partner per
--                          business); mirrors locations.partner_id until P1-01
--   google_connections     one row per business: Kabsi account, Google ids, access state, sync times, last error;
--                          mirrors the Google columns on locations until P0.1-11 and P0.1-12a move the writers
--   subscriptions          plan and billing state per organisation; created empty (Creem fills it, P0.4-07)
--
-- Backfill: one organisation per owner (a multi-location owner gets one organisation for all their businesses; demo
-- businesses get their own demo organisation), one organisation per partner, a google_connections row for every
-- business and a partner_clients row for every business with a partner.
--
-- Triggers keep the new tables complete for rows the old code writes:
--   locations insert       organisation of the creating owner (or a new one), google_connections row, partner_clients
--   locations update       google_connections and partner_clients follow the old columns
--   location_members       an owner of a business is an owner of its organisation
--   partners insert        a partner organisation
--   partner_members        mirrored into the partner organisation (owner -> owner, staff -> member)
-- The trigger functions live in schema private (P0.1-08), out of reach of the API roles.
--
-- RLS: read only for signed-in users, writes only through SECURITY DEFINER functions and the service role.
-- Helpers is_org_member and has_location_role answer only about the caller.

-- 1. Tables ------------------------------------------------------------------------------------------------------

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('owner', 'partner')),
  is_demo boolean not null default false,
  -- Link to the old partners row while partners still carries the agency's details (contract step: P1-01).
  partner_id uuid unique references public.partners(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint partner_link_only_on_partner_orgs check (partner_id is null or type = 'partner'),
  constraint demo_orgs_are_owner_orgs check (not is_demo or type = 'owner')
);

create table public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);
create index organization_members_user_idx on public.organization_members (user_id);

alter table public.locations add column organization_id uuid references public.organizations(id) on delete restrict;
create index locations_organization_idx on public.locations (organization_id);

alter table public.location_members drop constraint location_members_role_check;
alter table public.location_members add constraint location_members_role_check
  check (role in ('owner', 'manager', 'staff'));

create table public.partner_clients (
  id uuid primary key default gen_random_uuid(),
  partner_organization_id uuid not null references public.organizations(id) on delete cascade,
  location_id uuid not null unique references public.locations(id) on delete cascade,
  status text not null default 'invited' check (status in ('invited', 'onboarding', 'active', 'paused', 'ended')),
  -- Per action kind, who approves: 'owner' (the default when a kind is missing) or 'partner' (K-16). Delegating any
  -- kind to the partner needs the owner's consent text and date.
  approval_policy jsonb not null default '{}'::jsonb,
  consent_text text,
  consent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint approval_policy_shape check (
    jsonb_typeof(approval_policy) = 'object'
    and approval_policy - array['review_reply', 'post', 'photo', 'profile_change', 'hours'] = '{}'::jsonb
    and not jsonb_path_exists(approval_policy, '$.* ? (@.type() != "string" || (@ != "owner" && @ != "partner"))')),
  constraint delegation_needs_consent check (
    not jsonb_path_exists(approval_policy, '$.* ? (@ == "partner")')
    or (consent_at is not null and coalesce(btrim(consent_text), '') <> ''))
);
create index partner_clients_partner_idx on public.partner_clients (partner_organization_id);

create table public.google_connections (
  location_id uuid primary key references public.locations(id) on delete cascade,
  kabsi_account text,
  google_account_id text,
  google_location_id text unique,
  access_state text not null default 'none' check (access_state in ('none', 'pending', 'granted', 'error', 'lost')),
  access_granted_at timestamptz,
  last_attempted_sync_at timestamptz,
  last_successful_sync_at timestamptz,
  next_sync_at timestamptz,
  sync_status text,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  plan text not null check (plan in ('free', 'pro', 'lebanon_bundle', 'partner')),
  state text not null check (state in ('trialing', 'active', 'past_due', 'cancelled', 'expired')),
  period text check (period in ('month', 'year')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  provider text check (provider in ('creem', 'nowpayments', 'manual')),
  provider_customer_id text,
  provider_subscription_id text,
  trial_started_at timestamptz,
  trial_ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint provider_subscription_unique unique (provider, provider_subscription_id)
);
create index subscriptions_organization_idx on public.subscriptions (organization_id);

-- 2. Helpers for policies (answer only about the caller) ----------------------------------------------------------

create function public.is_org_member(p_org uuid, p_roles text[] default null) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.organization_members m
    where m.organization_id = p_org and m.user_id = auth.uid() and (p_roles is null or m.role = any (p_roles)))
$$;

create function public.has_location_role(p_location uuid, p_roles text[]) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.location_members m
    where m.location_id = p_location and m.user_id = auth.uid() and m.role = any (p_roles))
$$;

revoke execute on function public.is_org_member(uuid, text[]) from public, anon;
revoke execute on function public.has_location_role(uuid, text[]) from public, anon;
grant execute on function public.is_org_member(uuid, text[]) to authenticated, service_role;
grant execute on function public.has_location_role(uuid, text[]) to authenticated, service_role;

-- 3. Sync functions (schema private) -------------------------------------------------------------------------------

-- The owner organisation a business created by p_user joins: the user's oldest owner organisation of the same kind
-- (demo or not), or a new one named after the business.
create function private.owner_organization(p_user uuid, p_name text, p_is_demo boolean) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_org uuid;
begin
  if p_user is not null then
    select o.id into v_org from public.organization_members m join public.organizations o on o.id = m.organization_id
      where m.user_id = p_user and m.role = 'owner' and o.type = 'owner' and o.is_demo = p_is_demo
      order by o.created_at, o.id limit 1;
  end if;
  if v_org is null then
    insert into public.organizations (name, type, is_demo) values (p_name, 'owner', p_is_demo) returning id into v_org;
    if p_user is not null then
      insert into public.organization_members (organization_id, user_id, role) values (v_org, p_user, 'owner')
      on conflict do nothing;
    end if;
  end if;
  return v_org;
end $$;

-- Before insert on locations: every business gets an organisation.
create function private.location_set_organization() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.organization_id is null then
    new.organization_id := private.owner_organization(new.created_by, new.name, new.is_demo);
  end if;
  return new;
end $$;

-- After insert or update on locations: google_connections and partner_clients follow the old columns.
create function private.location_sync_tenancy() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_partner_org uuid;
begin
  insert into public.google_connections as g
    (location_id, google_account_id, google_location_id, access_state, access_granted_at, last_successful_sync_at)
  values (new.id, new.google_account_id, new.google_location_id,
    case when new.access_lost_at is not null then 'lost'
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

-- After insert, update or delete on location_members: owners of a business are owners of its organisation, and lose
-- that when they no longer own any business in it.
create function private.location_member_sync_org() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_org uuid;
begin
  if tg_op in ('INSERT', 'UPDATE') and new.role = 'owner' then
    select l.organization_id into v_org from public.locations l where l.id = new.location_id;
    if v_org is not null then
      insert into public.organization_members (organization_id, user_id, role) values (v_org, new.user_id, 'owner')
      on conflict (organization_id, user_id) do update set role = 'owner';
    end if;
  end if;
  if tg_op in ('UPDATE', 'DELETE') and old.role = 'owner' then
    select l.organization_id into v_org from public.locations l where l.id = old.location_id;
    if v_org is not null and not exists (
      select 1 from public.location_members m join public.locations l on l.id = m.location_id
      where l.organization_id = v_org and m.user_id = old.user_id and m.role = 'owner') then
      delete from public.organization_members where organization_id = v_org and user_id = old.user_id and role = 'owner';
    end if;
  end if;
  return null;
end $$;

-- After insert on partners: a partner organisation.
create function private.partner_create_org() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.organizations (name, type, partner_id, created_at) values (new.name, 'partner', new.id, new.created_at)
  on conflict (partner_id) do nothing;
  return null;
end $$;

-- After insert, update or delete on partner_members: mirrored into the partner organisation.
create function private.partner_member_sync_org() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_org uuid;
begin
  if tg_op in ('UPDATE', 'DELETE') then
    delete from public.organization_members m using public.organizations o
      where o.partner_id = old.partner_id and m.organization_id = o.id and m.user_id = old.user_id;
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    select o.id into v_org from public.organizations o where o.partner_id = new.partner_id;
    if v_org is not null then
      insert into public.organization_members (organization_id, user_id, role)
      values (v_org, new.user_id, case new.role when 'owner' then 'owner' else 'member' end)
      on conflict (organization_id, user_id) do update set role = excluded.role;
    end if;
  end if;
  return null;
end $$;

revoke all on function private.owner_organization(uuid, text, boolean), private.location_set_organization(),
  private.location_sync_tenancy(), private.location_member_sync_org(), private.partner_create_org(),
  private.partner_member_sync_org() from public, anon, authenticated;

-- 4. Backfill ------------------------------------------------------------------------------------------------------

-- Partner organisations and their members.
insert into public.organizations (name, type, partner_id, created_at)
select p.name, 'partner', p.id, p.created_at from public.partners p order by p.created_at;
insert into public.organization_members (organization_id, user_id, role, created_at)
select o.id, pm.user_id, case pm.role when 'owner' then 'owner' else 'member' end, pm.created_at
from public.partner_members pm join public.organizations o on o.partner_id = pm.partner_id;

-- Owner organisations: oldest business first, grouped by its first owner (the creator when the creator is an owner).
-- Only organization_id is written: updated_at and the Slack trigger are paused for this one update.
alter table public.locations disable trigger locations_updated;
alter table public.locations disable trigger ops_location;
do $$
declare r record;
begin
  for r in
    select l.id, l.name, l.is_demo,
      coalesce(
        (select m.user_id from public.location_members m
          where m.location_id = l.id and m.role = 'owner' and m.user_id = l.created_by),
        (select m.user_id from public.location_members m
          where m.location_id = l.id and m.role = 'owner' order by m.created_at, m.user_id limit 1)) as owner_id
    from public.locations l order by l.created_at, l.id
  loop
    update public.locations set organization_id = private.owner_organization(r.owner_id, r.name, r.is_demo)
      where id = r.id;
  end loop;
end $$;
alter table public.locations enable trigger locations_updated;
alter table public.locations enable trigger ops_location;
insert into public.organization_members (organization_id, user_id, role, created_at)
select distinct on (l.organization_id, m.user_id) l.organization_id, m.user_id, 'owner', m.created_at
from public.location_members m join public.locations l on l.id = m.location_id
where m.role = 'owner'
order by l.organization_id, m.user_id, m.created_at
on conflict do nothing;

alter table public.locations alter column organization_id set not null;

-- google_connections and partner_clients from the old columns.
insert into public.google_connections
  (location_id, google_account_id, google_location_id, access_state, access_granted_at, last_successful_sync_at)
select l.id, l.google_account_id, l.google_location_id,
  case when l.access_lost_at is not null then 'lost'
       when l.access_error_since is not null then 'error'
       when l.access_granted_at is not null and l.google_location_id is not null then 'granted'
       when l.status = 'access_pending' or l.onboarding_step = 'access' then 'pending'
       else 'none' end,
  l.access_granted_at, l.reviews_synced_at
from public.locations l;

insert into public.partner_clients (partner_organization_id, location_id, status, created_at)
select o.id, l.id,
  case l.status when 'active' then 'active' when 'paused' then 'paused' when 'disabled' then 'ended' else 'onboarding' end,
  l.created_at
from public.locations l join public.organizations o on o.partner_id = l.partner_id;

-- 5. Triggers (after the backfill, so it is not done twice) --------------------------------------------------------

create trigger locations_set_organization before insert on public.locations
  for each row execute function private.location_set_organization();
create trigger locations_sync_tenancy after insert or update of google_account_id, google_location_id,
  access_granted_at, access_lost_at, access_error_since, reviews_synced_at, status, onboarding_step, partner_id
  on public.locations for each row execute function private.location_sync_tenancy();
create trigger location_members_sync_org after insert or update or delete on public.location_members
  for each row execute function private.location_member_sync_org();
create trigger partners_create_org after insert on public.partners
  for each row execute function private.partner_create_org();
create trigger partner_members_sync_org after insert or update or delete on public.partner_members
  for each row execute function private.partner_member_sync_org();

-- 6. Row level security (read only for signed-in users) ------------------------------------------------------------

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.partner_clients enable row level security;
alter table public.google_connections enable row level security;
alter table public.subscriptions enable row level security;

revoke all on public.organizations, public.organization_members, public.partner_clients, public.google_connections,
  public.subscriptions from anon, authenticated;
grant select on public.organizations, public.organization_members, public.partner_clients, public.google_connections,
  public.subscriptions to authenticated;

create policy members_read_organizations on public.organizations for select to authenticated
  using (public.is_org_member(id) or (select public.is_staff()));
create policy members_read_own_org_membership on public.organization_members for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_staff()));
create policy owner_or_partner_read_partner_clients on public.partner_clients for select to authenticated
  using (public.is_member(location_id) or public.is_org_member(partner_organization_id) or (select public.is_staff()));
create policy members_read_google_connections on public.google_connections for select to authenticated
  using (public.is_member(location_id) or (select public.is_staff()));
-- Billing is for the organisation's owners and admins only (K-16: managers see everything except billing).
create policy org_admins_read_subscriptions on public.subscriptions for select to authenticated
  using (public.is_org_member(organization_id, array['owner', 'admin']) or (select public.is_staff()));
