-- P0.8-01, removal file 3 of 3, run by Hussein in the Supabase SQL editor after files 1 and 2 (it holds drop
-- statements, which the connector cannot run). It removes the tables and columns of the retired model. Since
-- 20261021180000 no role but the owner can read or write them and no code uses them.
--
-- Removes 8 tables, with their rows, policies and triggers (row counts on 21 Oct 2026):
--   partners 1 (QA Partner), partner_members 1, partner_invites 2, partner_clients 0 after file 2, partner_invoices 0,
--   usdt_claims 0, card_orders 3 (requested, never paid), billing_invoices 0 (NOWPayments invoices)
-- Removes 6 columns: locations.partner_id (1 business set: Safa Chicken), organizations.partner_id, cards.partner_id
--   (0 set after file 2), emails.partner_id (2 old partner invite emails set; the email rows stay),
--   approval_policies.consent_text and approval_policies.consent_at (partner consent only; 0 set)
--   and with them the checks demo_has_no_partner, partner_link_only_on_partner_orgs and partner_needs_consent.
-- Removes 8 functions that only served those tables: is_partner_member, ops_on_card_order, ops_on_claim,
--   ops_on_invite, ops_on_invoice, ops_on_partner, private.partner_create_org, private.partner_member_sync_org.
-- Tightens 5 checks to what Kabsi sells now: organizations.type (owner), plans.kind (trial and the Pro kinds),
--   plans.active_has_end, subscriptions.plan (free, pro) and subscriptions.provider (creem, manual); and removes the
--   old approval_policies.policy check that still allowed the partner modes (approval_policies_owner_or_managers,
--   added by 20261021180000, stays). The trigger locations_sync_tenancy is made again without partner_id.
--
-- Read-back (expected: 0, 0, 0, 0):
--   select count(*) from information_schema.tables where table_schema = 'public'
--    and table_name in ('partners', 'partner_members', 'partner_invites', 'partner_clients', 'partner_invoices',
--                       'usdt_claims', 'card_orders', 'billing_invoices');
--   select count(*) from information_schema.columns where table_schema = 'public'
--    and ((table_name in ('locations', 'organizations', 'cards', 'emails') and column_name = 'partner_id')
--      or (table_name = 'approval_policies' and column_name in ('consent_text', 'consent_at')));
--   select count(*) from pg_proc where proname in ('is_partner_member', 'ops_on_card_order', 'ops_on_claim',
--     'ops_on_invite', 'ops_on_invoice', 'ops_on_partner', 'partner_create_org', 'partner_member_sync_org');
--   select count(*) from pg_constraint where conname in ('demo_has_no_partner', 'partner_link_only_on_partner_orgs',
--     'partner_needs_consent', 'approval_policies_policy_check');

-- Columns first, so no foreign key points at partners any more. The tenancy trigger listed partner_id among the columns
-- it watches, so it is made again with the same columns less that one.
drop trigger if exists locations_sync_tenancy on public.locations;
create trigger locations_sync_tenancy after insert or update of google_account_id, google_location_id, access_granted_at,
  access_lost_at, access_error_since, reviews_synced_at, status, onboarding_step
  on public.locations for each row execute function private.location_sync_tenancy();
alter table public.locations drop column if exists partner_id;
alter table public.organizations drop column if exists partner_id;
alter table public.cards drop column if exists partner_id;
alter table public.emails drop column if exists partner_id;
alter table public.approval_policies drop constraint if exists partner_needs_consent;
alter table public.approval_policies drop constraint if exists approval_policies_policy_check;
alter table public.approval_policies drop column if exists consent_text;
alter table public.approval_policies drop column if exists consent_at;

drop table if exists public.usdt_claims;
drop table if exists public.partner_invoices;
drop table if exists public.partner_invites;
drop table if exists public.partner_clients;
drop table if exists public.partner_members;
drop table if exists public.card_orders;
drop table if exists public.billing_invoices;
drop table if exists public.partners;

drop function if exists public.is_partner_member(uuid);
drop function if exists public.ops_on_card_order();
drop function if exists public.ops_on_claim();
drop function if exists public.ops_on_invite();
drop function if exists public.ops_on_invoice();
drop function if exists public.ops_on_partner();
drop function if exists private.partner_create_org();
drop function if exists private.partner_member_sync_org();

alter table public.organizations drop constraint if exists organizations_type_check;
alter table public.organizations add constraint organizations_type_check check (type = 'owner');
alter table public.plans drop constraint if exists plans_kind_check;
alter table public.plans add constraint plans_kind_check check (kind in ('trial', 'pro_monthly', 'pro_yearly', 'pro_6m'));
alter table public.plans drop constraint if exists active_has_end;
alter table public.plans add constraint active_has_end check (status <> 'active' or ends_at is not null);
alter table public.subscriptions drop constraint if exists subscriptions_plan_check;
alter table public.subscriptions add constraint subscriptions_plan_check check (plan in ('free', 'pro'));
alter table public.subscriptions drop constraint if exists subscriptions_provider_check;
alter table public.subscriptions add constraint subscriptions_provider_check check (provider in ('creem', 'manual'));
