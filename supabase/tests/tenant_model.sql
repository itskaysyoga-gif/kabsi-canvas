-- P0.1-09: tenant model (K-33, K-16, K-48). The backfill and the triggers keep organizations, organization_members,
-- partner_clients and google_connections complete while the old columns stay the source the app reads.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

\ir _fixtures.psql

-- New users for this file only.
insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
select '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email, now(), '{}', '{}', now(), now()
from (values
  ('00000000-0000-4000-8000-0000000000b4'::uuid, 'new-owner@example.test'),
  ('00000000-0000-4000-8000-0000000000b5'::uuid, 'manager@example.test')
) as u(id, email);

-- Every business has an organisation and a Google connection row.
select col_not_null('public', 'locations', 'organization_id', 'locations.organization_id is not null');
select is((select count(*)::int from public.locations l
  where not exists (select 1 from public.google_connections g where g.location_id = l.id)), 0,
  'every business has a google_connections row');

-- The victim world, built by the fixtures through the triggers.
select is((select o.type from public.organizations o join public.locations l on l.organization_id = o.id
  where l.id = '00000000-0000-4000-8000-0000000000c1'), 'owner', 'the victim business belongs to an owner organisation');
select is((select m.role from public.organization_members m join public.locations l on l.organization_id = m.organization_id
  where l.id = '00000000-0000-4000-8000-0000000000c1' and m.user_id = '00000000-0000-4000-8000-0000000000a1'), 'owner',
  'the owner of a business is an owner of its organisation');
select is((select m.role from public.organization_members m join public.organizations o on o.id = m.organization_id
  where o.partner_id = '00000000-0000-4000-8000-0000000000d1' and m.user_id = '00000000-0000-4000-8000-0000000000a2'), 'owner',
  'a partner member is mirrored into the partner organisation');
select is((select c.status || ':' || (c.partner_organization_id = o.id)::text
  from public.partner_clients c, public.organizations o
  where c.location_id = '00000000-0000-4000-8000-0000000000c1' and o.partner_id = '00000000-0000-4000-8000-0000000000d1'),
  'onboarding:true', 'a business with a partner has a partner_clients row for that partner organisation');
select is((select access_state from public.google_connections where location_id = '00000000-0000-4000-8000-0000000000c1'),
  'none', 'a business without Google access has access_state none');

-- Signing up: start_location puts the business in the owner's organisation, a second business joins the same one.
create temp table started (id uuid);
grant select, insert on started to authenticated;
select tests.act_as('00000000-0000-4000-8000-0000000000b4');
insert into started select public.start_location('new-place-1', 'New Cafe', 'x', 'US', 'UTC', null, null);
insert into started select public.start_location('new-place-2', 'New Cafe Two', 'x', 'US', 'UTC', null, null);
reset role;
select is((select count(distinct l.organization_id)::int from public.locations l join started s on s.id = l.id), 1,
  'a multi-location owner has one organisation for all their businesses');
select is((select count(*)::int from public.organization_members m
  where m.user_id = '00000000-0000-4000-8000-0000000000b4' and m.role = 'owner'), 1,
  'the new owner is the owner of exactly one organisation');
select is((select o.name from public.organizations o join public.locations l on l.organization_id = o.id
  where l.place_id = 'new-place-1'), 'New Cafe', 'the organisation is named after the first business');
select is((select access_state from public.google_connections g join started s on s.id = g.location_id limit 1), 'pending',
  'a business waiting for access has access_state pending');

-- The owner reads their organisation, its businesses' connections and its subscription; nobody else does.
select tests.act_as('00000000-0000-4000-8000-0000000000b4');
select is((select count(*)::int from public.organizations), 1, 'the new owner reads only their own organisation');
select is((select count(*)::int from public.google_connections), 2, 'the new owner reads the connections of their two businesses');
select ok(public.has_location_role((select id from started limit 1), array['owner']), 'has_location_role is true for the owner');
select ok(not public.has_location_role((select id from started limit 1), array['manager', 'staff']), 'has_location_role checks the role');
reset role;

-- Google columns on locations flow into google_connections.
update public.locations set google_account_id = 'accounts/mock', google_location_id = 'locations/mock-new1',
  access_granted_at = now(), consent_at = now()
  where place_id = 'new-place-1';
select is((select g.access_state || ':' || g.google_location_id from public.google_connections g
  join public.locations l on l.id = g.location_id where l.place_id = 'new-place-1'), 'granted:locations/mock-new1',
  'granting access is mirrored into google_connections');
update public.locations set access_lost_at = now() where place_id = 'new-place-1';
select is((select g.access_state from public.google_connections g join public.locations l on l.id = g.location_id
  where l.place_id = 'new-place-1'), 'lost', 'losing access is mirrored into google_connections');

-- Roles: staff is a location role now; anything else is refused.
insert into public.location_members (location_id, user_id, role)
select id, '00000000-0000-4000-8000-0000000000b5', 'manager' from public.locations where place_id = 'new-place-1';
select lives_ok($$ update public.location_members set role = 'staff'
  where user_id = '00000000-0000-4000-8000-0000000000b5' $$, 'location_members accepts the staff role');
select throws_ok($$ update public.location_members set role = 'reviewer'
  where user_id = '00000000-0000-4000-8000-0000000000b5' $$, '23514', null, 'location_members refuses a role outside owner, manager, staff');
select is((select count(*)::int from public.organization_members where user_id = '00000000-0000-4000-8000-0000000000b5'), 0,
  'a manager or staff member of a business is not a member of its organisation');

-- Billing is for the organisation's owners: a manager of the business does not read the subscription.
insert into public.subscriptions (organization_id, plan, state)
select organization_id, 'pro', 'trialing' from public.locations where place_id = 'new-place-1';
select tests.act_as('00000000-0000-4000-8000-0000000000b5');
select is((select count(*)::int from public.subscriptions), 0, 'a staff member does not read the subscription');
reset role;
select tests.act_as('00000000-0000-4000-8000-0000000000b4');
select is((select count(*)::int from public.subscriptions), 1, 'the owner reads the subscription');
reset role;

-- An owner who is removed from their last business in the organisation leaves the organisation.
insert into public.location_members (location_id, user_id, role)
select id, '00000000-0000-4000-8000-0000000000b5', 'owner' from public.locations where place_id = 'new-place-2';
select is((select count(*)::int from public.organization_members where user_id = '00000000-0000-4000-8000-0000000000b5'), 1,
  'a second owner of a business joins its organisation as owner');
delete from public.location_members where user_id = '00000000-0000-4000-8000-0000000000b5'
  and location_id = (select id from public.locations where place_id = 'new-place-2');
select is((select count(*)::int from public.organization_members where user_id = '00000000-0000-4000-8000-0000000000b5'), 0,
  'removing that owner removes them from the organisation');

-- Demo businesses never join a real organisation.
insert into public.locations (name, place_id, is_demo, created_by)
values ('Demo Cafe', 'demo-place-new', true, '00000000-0000-4000-8000-0000000000b4');
select ok((select o.is_demo from public.organizations o join public.locations l on l.organization_id = o.id
  where l.place_id = 'demo-place-new'), 'a demo business gets a demo organisation');
select isnt((select organization_id from public.locations where place_id = 'demo-place-new'),
  (select organization_id from public.locations where place_id = 'new-place-1'),
  'the demo organisation is not the owner''s real organisation');

-- Partners: a new partner gets an organisation, its members follow, and a client business is linked to it.
insert into public.partners (id, name, handle, status) values ('00000000-0000-4000-8000-0000000000d3', 'New Agency', 'new-agency', 'active');
insert into public.partner_members (partner_id, user_id, role) values ('00000000-0000-4000-8000-0000000000d3', '00000000-0000-4000-8000-0000000000b5', 'staff');
select is((select m.role from public.organization_members m join public.organizations o on o.id = m.organization_id
  where o.partner_id = '00000000-0000-4000-8000-0000000000d3'), 'member', 'a partner staff member is a member of the partner organisation');
update public.locations set partner_id = '00000000-0000-4000-8000-0000000000d3' where place_id = 'new-place-2';
select is((select o.partner_id from public.partner_clients c join public.organizations o on o.id = c.partner_organization_id
  join public.locations l on l.id = c.location_id where l.place_id = 'new-place-2'), '00000000-0000-4000-8000-0000000000d3'::uuid,
  'setting a partner on a business links it to the partner organisation');
update public.locations set partner_id = null where place_id = 'new-place-2';
select is((select c.status from public.partner_clients c join public.locations l on l.id = c.location_id
  where l.place_id = 'new-place-2'), 'ended', 'removing the partner ends the link');
delete from public.partner_members where partner_id = '00000000-0000-4000-8000-0000000000d3';
select is((select count(*)::int from public.organization_members m join public.organizations o on o.id = m.organization_id
  where o.partner_id = '00000000-0000-4000-8000-0000000000d3'), 0, 'removing a partner member removes them from the organisation');

-- Approval policy: only known kinds, only owner or partner, and delegation needs the owner's consent.
select throws_ok($$ update public.partner_clients set approval_policy = '{"review_reply": "partner"}'
  where location_id = '00000000-0000-4000-8000-0000000000c1' $$, '23514', null, 'delegating to the partner without consent is refused');
select throws_ok($$ update public.partner_clients set approval_policy = '{"refunds": "owner"}'
  where location_id = '00000000-0000-4000-8000-0000000000c1' $$, '23514', null, 'an unknown action kind is refused');
select throws_ok($$ update public.partner_clients set approval_policy = '{"post": "nobody"}'
  where location_id = '00000000-0000-4000-8000-0000000000c1' $$, '23514', null, 'an approver other than owner or partner is refused');
select throws_ok($$ update public.partner_clients set approval_policy = '{"post": 1}'
  where location_id = '00000000-0000-4000-8000-0000000000c1' $$, '23514', null, 'a non-text approver is refused');
select lives_ok($$ update public.partner_clients set approval_policy = '{"post": "partner", "review_reply": "owner"}',
  consent_text = 'I let my agency approve posts.', consent_at = now()
  where location_id = '00000000-0000-4000-8000-0000000000c1' $$, 'delegating with consent is accepted');

-- The API roles cannot write the new tables.
select tests.act_as('00000000-0000-4000-8000-0000000000a1');
select throws_ok($$ insert into public.subscriptions (organization_id, plan, state)
  select organization_id, 'pro', 'active' from public.locations where id = '00000000-0000-4000-8000-0000000000c1' $$,
  '42501', null, 'an owner cannot write their own subscription');
select throws_ok($$ update public.partner_clients set approval_policy = '{}' $$, '42501', null, 'an owner cannot write partner_clients directly');
select throws_ok($$ insert into public.organization_members (organization_id, user_id, role)
  select id, '00000000-0000-4000-8000-0000000000a1', 'owner' from public.organizations $$, '42501', null,
  'an owner cannot add themselves to another organisation');
reset role;

select * from finish();
rollback;
