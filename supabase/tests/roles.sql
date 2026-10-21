-- P0.3-06: roles and approval policies (K-16, R-22, guardrail 11). Owner, manager and staff each get exactly their read
-- and approve rights (RLS and the RPCs, not only the screens); a member of business A never reads or changes business
-- B; staff never approve or publish; a manager approves only what the owner's policy allows and never a high-risk
-- field or review; there are no partner approval modes (K-127); the team is the owner's.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

\ir _fixtures.psql

-- Personas on top of the fixtures: manager MA ..a4 and staff SA ..a5 of the victim business LA (owner A ..a1);
-- manager MB ..b4 of the other business LB (owner B ..b2). PA ..a2 is a signed-in user who is not on LA's team.
insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
select '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email, now(), '{}', '{}', now(), now()
from (values ('00000000-0000-4000-8000-0000000000a4'::uuid, 'victim-manager@example.test'),
             ('00000000-0000-4000-8000-0000000000a5'::uuid, 'victim-staff-member@example.test'),
             ('00000000-0000-4000-8000-0000000000b4'::uuid, 'other-manager@example.test'),
             ('00000000-0000-4000-8000-0000000000a6'::uuid, 'new-hire@example.test')) as u(id, email);
insert into public.location_members (location_id, user_id, role) values
  ('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000a4', 'manager'),
  ('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000a5', 'staff'),
  ('00000000-0000-4000-8000-0000000000c2', '00000000-0000-4000-8000-0000000000b4', 'manager');
update public.locations set status = 'active', consent_at = now(), access_granted_at = now(),
  google_location_id = 'locations/mock-victim', is_demo = false
 where id = '00000000-0000-4000-8000-0000000000c1';
update public.cards set kind = 'link' where code = 'VCTM22';
update public.reviews set state = 'drafted', risk = 'low' where id = '00000000-0000-4000-8000-0000000000e1';
update public.publications set state = 'cancelled' where target_id = '00000000-0000-4000-8000-0000000000e1';
-- One row of business B the members of A must never see.
insert into public.reviews (id, location_id, google_review_id, star_rating, review_created_at, state)
values ('00000000-0000-4000-8000-0000000006b1', '00000000-0000-4000-8000-0000000000c2', 'other-review', 2, now(), 'drafted');

create function pg_temp.sees(p_who text, p_table text, p_loc uuid) returns bigint language plpgsql as $$
declare n bigint;
begin
  perform tests.act_as(p_who);
  execute format('select count(*) from public.%I where location_id = $1', p_table) into n using p_loc;
  perform set_config('role', 'postgres', true);
  return n;
exception when insufficient_privilege then
  perform set_config('role', 'postgres', true);
  return 0;
end $$;

-- 1. Read rights per role (K-16 "Can see") -------------------------------------------------------------------------------
select ok(pg_temp.sees('00000000-0000-4000-8000-0000000000a1', 'plans', '00000000-0000-4000-8000-0000000000c1') > 0, 'owner sees the plan');
select ok(pg_temp.sees('00000000-0000-4000-8000-0000000000a1', 'reviews', '00000000-0000-4000-8000-0000000000c1') > 0, 'owner sees reviews');
select ok(pg_temp.sees('00000000-0000-4000-8000-0000000000a1', 'payments', '00000000-0000-4000-8000-0000000000c1') > 0, 'owner sees payments');

select ok(pg_temp.sees('00000000-0000-4000-8000-0000000000a4', 'reviews', '00000000-0000-4000-8000-0000000000c1') > 0, 'manager sees reviews');
select ok(pg_temp.sees('00000000-0000-4000-8000-0000000000a4', 'publications', '00000000-0000-4000-8000-0000000000c1') > 0, 'manager sees publications');
select ok(pg_temp.sees('00000000-0000-4000-8000-0000000000a4', 'tasks', '00000000-0000-4000-8000-0000000000c1') > 0, 'manager sees tasks');
select ok(pg_temp.sees('00000000-0000-4000-8000-0000000000a4', 'photos', '00000000-0000-4000-8000-0000000000c1') > 0, 'manager sees photos');
select ok(pg_temp.sees('00000000-0000-4000-8000-0000000000a4', 'cards', '00000000-0000-4000-8000-0000000000c1') > 0, 'manager sees the review link');
select is(pg_temp.sees('00000000-0000-4000-8000-0000000000a4', 'plans', '00000000-0000-4000-8000-0000000000c1'), 0::bigint, 'manager does not see the plan (billing)');
select is(pg_temp.sees('00000000-0000-4000-8000-0000000000a4', 'payments', '00000000-0000-4000-8000-0000000000c1'), 0::bigint, 'manager does not see payments');

select ok(pg_temp.sees('00000000-0000-4000-8000-0000000000a5', 'photos', '00000000-0000-4000-8000-0000000000c1') > 0, 'staff see photos');
select ok(pg_temp.sees('00000000-0000-4000-8000-0000000000a5', 'cards', '00000000-0000-4000-8000-0000000000c1') > 0, 'staff see the review link');
select ok(pg_temp.sees('00000000-0000-4000-8000-0000000000a5', 'taps', '00000000-0000-4000-8000-0000000000c1') > 0, 'staff see link activity');
select is(
  (select array_agg(t order by t) from unnest(array['reviews', 'publications', 'tasks', 'gbp_posts', 'knowledge_facts',
     'knowledge_confirms', 'profile_changes', 'special_hours', 'weekly_reports', 'rating_snapshots', 'google_connections',
     'style_offers', 'audit_events', 'plans', 'payments', 'approval_policies',
     'team_invites']) t
    where pg_temp.sees('00000000-0000-4000-8000-0000000000a5', t, '00000000-0000-4000-8000-0000000000c1') > 0),
  null, 'staff see nothing else of the business');
select tests.act_as('00000000-0000-4000-8000-0000000000a5');
select is((select count(*) from public.locations where id = '00000000-0000-4000-8000-0000000000c1'), 1::bigint, 'staff see the business name');
select is((select count(*) from public.reply_drafts), 0::bigint, 'staff see no reply drafts');
reset role;

-- 2. A member of one business never reads the other ---------------------------------------------------------------------
select tests.act_as('00000000-0000-4000-8000-0000000000b4');
select is(tests.visible_victim_rows(tbl), 0::bigint, 'the manager of another business sees no rows of ' || tbl) from tests.victim_rows order by tbl;
reset role;
select is(pg_temp.sees('00000000-0000-4000-8000-0000000000a1', 'reviews', '00000000-0000-4000-8000-0000000000c2'), 0::bigint, 'owner of A reads no review of B');
select is(pg_temp.sees('00000000-0000-4000-8000-0000000000a4', 'reviews', '00000000-0000-4000-8000-0000000000c2'), 0::bigint, 'manager of A reads no review of B');
select is(pg_temp.sees('00000000-0000-4000-8000-0000000000a5', 'reviews', '00000000-0000-4000-8000-0000000000c2'), 0::bigint, 'staff of A read no review of B');
select tests.act_as('00000000-0000-4000-8000-0000000000a4');
select throws_ok($$ select public.list_tasks('00000000-0000-4000-8000-0000000000c2') $$, '42501', null, 'manager of A cannot list B''s tasks');
select throws_ok($$ select public.skip_review('00000000-0000-4000-8000-0000000006b1') $$, '42501', null, 'manager of A cannot skip B''s review');
select throws_ok($$ select public.set_auto_posts('00000000-0000-4000-8000-0000000000c2', true) $$, '42501', null, 'manager of A cannot change B');
select throws_ok($$ select public.invite_team_member('00000000-0000-4000-8000-0000000000c2', 'x@example.test', 'staff') $$, '42501', null, 'manager of A cannot invite to B');
reset role;
select tests.act_as('00000000-0000-4000-8000-0000000000a1');
select throws_ok($$ select public.list_team('00000000-0000-4000-8000-0000000000c2') $$, '42501', null, 'owner of A cannot read B''s team');
select throws_ok($$ select public.set_approval_policy('00000000-0000-4000-8000-0000000000c2', 'post', 'owner_and_managers') $$, '42501', null, 'owner of A cannot set B''s policy');
select throws_ok($$ select public.set_member_role('00000000-0000-4000-8000-0000000000c2', '00000000-0000-4000-8000-0000000000b4', 'staff') $$, '42501', null, 'owner of A cannot change B''s roles');
reset role;
select is((select count(*) from public.jobs where kind = 'team_invite_email'), 0::bigint, 'no invite went out');
select is(private.may_approve('00000000-0000-4000-8000-0000000000c2', 'review_reply', '00000000-0000-4000-8000-0000000000a1', false), false,
  'the owner of A may approve nothing of B');
select throws_ok($$ select public.approve_publication('review_reply', '00000000-0000-4000-8000-0000000006b1', '{"text": "Hijack"}',
  '00000000-0000-4000-8000-0000000000a1', 'dashboard') $$, 'P0001', 'approver_not_member', 'the owner of A cannot approve B''s reply');

-- 3. RPC rights per role --------------------------------------------------------------------------------------------------
-- Billing, plan, deletion, consent and onboarding: the owner only.
select tests.act_as('00000000-0000-4000-8000-0000000000a4');
select throws_ok($$ select public.plan_summary('00000000-0000-4000-8000-0000000000c1') $$, '42501', null, 'manager: no plan summary (billing)');
select throws_ok($$ select public.choose_plan('00000000-0000-4000-8000-0000000000c1', 'trial') $$, '42501', null, 'manager: cannot choose a plan');
select throws_ok($$ select public.request_location_deletion('00000000-0000-4000-8000-0000000000c1') $$, '42501', null, 'manager: cannot delete the business');
select throws_ok($$ select public.cancel_location_deletion('00000000-0000-4000-8000-0000000000c1') $$, '42501', null, 'manager: cannot cancel a deletion');
select throws_ok($$ select public.request_disconnect('00000000-0000-4000-8000-0000000000c1') $$, '42501', null, 'manager: cannot disconnect Google');
select throws_ok($$ select public.save_consent('00000000-0000-4000-8000-0000000000c1', 'yes') $$, '42501', null, 'manager: cannot give the owner''s consent');
select throws_ok($$ select public.set_onboarding_step('00000000-0000-4000-8000-0000000000c1', 'done') $$, '42501', null, 'manager: cannot move onboarding');
select throws_ok($$ select public.confirm_business_details('00000000-0000-4000-8000-0000000000c1', '{"phone": {"display": "+1 555 0100"}}') $$, '42501', null, 'manager: cannot confirm the profile details');
-- Team rights a manager has.
select lives_ok($$ select public.set_auto_posts('00000000-0000-4000-8000-0000000000c1', false) $$, 'manager: may set auto posts');
select lives_ok($$ select * from public.activity_feed('00000000-0000-4000-8000-0000000000c1', 7) $$, 'manager: sees the activity feed');
select lives_ok($$ select public.list_tasks('00000000-0000-4000-8000-0000000000c1') $$, 'manager: lists the tasks');
select lives_ok($$ select public.rename_card('VCTM22', 'Counter') $$, 'manager: may rename the review link');
select lives_ok($$ select public.set_review_link_mode('VCTM22', 'page') $$, 'manager: may switch the review link to the page');
select lives_ok($$ select public.save_fact('00000000-0000-4000-8000-0000000000c1', 'parking', '"Behind the shop"') $$, 'manager: may add a fact');
select throws_ok($$ select public.list_team('00000000-0000-4000-8000-0000000000c1') $$, '42501', null, 'manager: cannot see the team list');
select throws_ok($$ select public.invite_team_member('00000000-0000-4000-8000-0000000000c1', 'x@example.test', 'staff') $$, '42501', null, 'manager: cannot invite');
select throws_ok($$ select public.set_member_role('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000a5', 'manager') $$, '42501', null, 'manager: cannot change a role');
select throws_ok($$ select public.remove_member('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000a5') $$, '42501', null, 'manager: cannot remove anyone');
select throws_ok($$ select public.set_approval_policy('00000000-0000-4000-8000-0000000000c1', 'review_reply', 'owner_and_managers') $$, '42501', null, 'manager: cannot change who approves');
reset role;

-- Staff: photos and the review link only.
select tests.act_as('00000000-0000-4000-8000-0000000000a5');
select throws_ok($$ select public.add_photo('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000c1/staff.jpg') $$,
  'P0001', 'not_uploaded', 'staff: may add a photo (past the role check, the upload itself is checked next)');
select throws_ok($$ select public.list_tasks('00000000-0000-4000-8000-0000000000c1') $$, '42501', null, 'staff: no task list');
select throws_ok($$ select * from public.activity_feed('00000000-0000-4000-8000-0000000000c1', 7) $$, '42501', null, 'staff: no activity feed');
select throws_ok($$ select public.rename_card('VCTM22', 'Staff') $$, '42501', null, 'staff: cannot rename the review link');
select throws_ok($$ select public.create_review_link('00000000-0000-4000-8000-0000000000c1', 'x') $$, '42501', null, 'staff: cannot make a review link');
select throws_ok($$ select public.set_card_active('VCTM22', false) $$, '42501', null, 'staff: cannot switch the link off');
select throws_ok($$ select public.set_review_link_mode('VCTM22', 'direct') $$, '42501', null, 'staff: cannot change what the link does');
select throws_ok($$ select public.set_auto_posts('00000000-0000-4000-8000-0000000000c1', true) $$, '42501', null, 'staff: cannot set auto posts');
select throws_ok($$ select public.update_notification_settings('00000000-0000-4000-8000-0000000000c1', null, null, null, null) $$, '42501', null, 'staff: no email settings');
select throws_ok($$ select public.save_fact('00000000-0000-4000-8000-0000000000c1', 'parking', '"x"') $$, '42501', null, 'staff: cannot change facts');
select throws_ok($$ select public.answer_knowledge_confirm('00000000-0000-4000-8000-0000000000fe', 'proposed') $$, '42501', null, 'staff: cannot answer a knowledge question');
select throws_ok($$ select public.task_action('00000000-0000-4000-8000-0000000000f8', 'later') $$, '42501', null, 'staff: cannot put a task off');
select throws_ok($$ select public.skip_review('00000000-0000-4000-8000-0000000000e1') $$, '42501', null, 'staff: cannot skip a review');
select throws_ok($$ select public.handle_review_offline('00000000-0000-4000-8000-0000000000e1') $$, '42501', null, 'staff: cannot close a review');
select throws_ok($$ select public.plan_summary('00000000-0000-4000-8000-0000000000c1') $$, '42501', null, 'staff: no plan');
select is((public.my_access('00000000-0000-4000-8000-0000000000c1') ->> 'role'), 'staff', 'my_access says staff');
select is((select bool_or(v::boolean) from jsonb_each_text(public.my_access('00000000-0000-4000-8000-0000000000c1') -> 'approve') x(k, v)),
  false, 'staff may approve no kind');
reset role;

-- The owner keeps every right.
select tests.act_as('00000000-0000-4000-8000-0000000000a1');
select lives_ok($$ select public.plan_summary('00000000-0000-4000-8000-0000000000c1') $$, 'owner: plan summary');
select lives_ok($$ select public.set_onboarding_step('00000000-0000-4000-8000-0000000000c1', 'done') $$, 'owner: onboarding');
select lives_ok($$ select public.save_consent('00000000-0000-4000-8000-0000000000c1', 'yes') $$, 'owner: consent');
select lives_ok($$ select public.list_team('00000000-0000-4000-8000-0000000000c1') $$, 'owner: team list');
select is((select bool_and(v::boolean) from jsonb_each_text(public.my_access('00000000-0000-4000-8000-0000000000c1') -> 'approve') x(k, v)),
  true, 'the owner may approve every kind');
reset role;

-- 4. Approvals ------------------------------------------------------------------------------------------------------------
-- Default policy: the owner approves; a manager may not; staff never.
select throws_ok($$ select public.approve_publication('review_reply', '00000000-0000-4000-8000-0000000000e1', '{"text": "Thank you."}',
  '00000000-0000-4000-8000-0000000000a4', 'dashboard') $$, '42501', 'not_allowed_to_approve', 'manager cannot approve a reply by default');
select throws_ok($$ select public.approve_publication('review_reply', '00000000-0000-4000-8000-0000000000e1', '{"text": "Thank you."}',
  '00000000-0000-4000-8000-0000000000a5', 'dashboard') $$, '42501', 'not_allowed_to_approve', 'staff cannot approve a reply');
select tests.act_as('00000000-0000-4000-8000-0000000000a4');
select throws_ok($$ select public.skip_review('00000000-0000-4000-8000-0000000000e1') $$, '42501', null, 'manager cannot skip a review by default');
reset role;
-- The owner lets managers approve review replies.
select tests.act_as('00000000-0000-4000-8000-0000000000a1');
select lives_ok($$ select public.set_approval_policy('00000000-0000-4000-8000-0000000000c1', 'review_reply', 'owner_and_managers') $$,
  'the owner lets managers approve review replies');
reset role;
select is((select count(*) from public.audit_events where action = 'approval_policy_set' and location_id = '00000000-0000-4000-8000-0000000000c1'),
  1::bigint, 'changing a policy is audited');
select throws_ok($$ select public.approve_publication('review_reply', '00000000-0000-4000-8000-0000000000e1', '{"text": "Thank you."}',
  '00000000-0000-4000-8000-0000000000a5', 'dashboard') $$, '42501', 'not_allowed_to_approve', 'staff still cannot approve');
select throws_ok($$ select public.approve_publication('local_post', (select id from public.gbp_posts where location_id = '00000000-0000-4000-8000-0000000000c1' limit 1),
  '{"summary": "A post about our bread this week."}'::jsonb, '00000000-0000-4000-8000-0000000000a4', 'dashboard') $$, '42501', 'not_allowed_to_approve',
  'a policy for replies does not cover posts');
-- A high-risk review always needs the owner.
update public.reviews set risk = 'high', state = 'blocked' where id = '00000000-0000-4000-8000-0000000000e1';
select throws_ok($$ select public.approve_publication('review_reply', '00000000-0000-4000-8000-0000000000e1', '{"text": "Thank you."}',
  '00000000-0000-4000-8000-0000000000a4', 'dashboard') $$, '42501', 'not_allowed_to_approve', 'a manager never approves a high-risk review');
select tests.act_as('00000000-0000-4000-8000-0000000000a4');
select throws_ok($$ select public.skip_review('00000000-0000-4000-8000-0000000000e1') $$, '42501', null, 'nor skips one');
reset role;
update public.reviews set risk = 'low', state = 'drafted' where id = '00000000-0000-4000-8000-0000000000e1';
select lives_ok($$ select public.approve_publication('review_reply', '00000000-0000-4000-8000-0000000000e1', '{"text": "Thank you."}',
  '00000000-0000-4000-8000-0000000000a4', 'dashboard') $$, 'with the policy, a manager approves a low-risk reply');
select is((select approved_by from public.publications where target_id = '00000000-0000-4000-8000-0000000000e1' and state = 'approved'),
  '00000000-0000-4000-8000-0000000000a4'::uuid, 'the approval records the manager');
select throws_ok($$ select public.undo_publication((select id from public.publications where target_id = '00000000-0000-4000-8000-0000000000e1' and state = 'approved'),
  '00000000-0000-4000-8000-0000000000a5') $$, '42501', 'not_allowed_to_approve', 'staff cannot undo it');
select lives_ok($$ select public.undo_publication((select id from public.publications where target_id = '00000000-0000-4000-8000-0000000000e1' and state = 'approved'),
  '00000000-0000-4000-8000-0000000000a1') $$, 'the owner can undo it');

-- Profile changes: name, address, main category and open status always need the owner (K-16).
insert into public.knowledge_facts (location_id, slot, key, value, status, source, confirmed_by, confirmed_at) values
  ('00000000-0000-4000-8000-0000000000c1', 'profile.name', 'name', '{"display": "Victim Bakery"}', 'verified', 'owner', '00000000-0000-4000-8000-0000000000a1', now()),
  ('00000000-0000-4000-8000-0000000000c1', 'profile.website', 'website', '{"display": "victim.example"}', 'verified', 'owner', '00000000-0000-4000-8000-0000000000a1', now());
insert into public.profile_changes (id, location_id, field, google_value, source, severity, status) values
  ('00000000-0000-4000-8000-0000000006c1', '00000000-0000-4000-8000-0000000000c1', 'name', '{"display": "Victim Bakery Cheap"}', 'google_update', 'urgent', 'awaiting_review'),
  ('00000000-0000-4000-8000-0000000006c2', '00000000-0000-4000-8000-0000000000c1', 'website', '{"display": "cheap.example"}', 'google_update', 'urgent', 'awaiting_review');
select lives_ok($$ select public.set_approval_policy('00000000-0000-4000-8000-0000000000c1', 'profile_change', 'owner_and_managers')
  from (select tests.act_as('00000000-0000-4000-8000-0000000000a1')) x $$, 'the owner lets managers decide profile changes');
reset role;
select throws_ok($$ select public.decide_profile_change('00000000-0000-4000-8000-0000000006c1', 'reject', '00000000-0000-4000-8000-0000000000a4', 'dashboard') $$,
  'P0001', 'owner_only', 'a manager cannot approve a name change, whatever the policy');
select throws_ok($$ select public.approve_publication('listing_revert', '00000000-0000-4000-8000-0000000006c1', '{}'::jsonb,
  '00000000-0000-4000-8000-0000000000a4', 'dashboard') $$, '42501', 'not_allowed_to_approve', 'nor put the name back through the pipeline');
select throws_ok($$ select public.decide_profile_change('00000000-0000-4000-8000-0000000006c2', 'accept', '00000000-0000-4000-8000-0000000000a5', 'dashboard') $$,
  '42501', 'not_allowed_to_approve', 'staff cannot decide a website change');
select lives_ok($$ select public.decide_profile_change('00000000-0000-4000-8000-0000000006c2', 'accept', '00000000-0000-4000-8000-0000000000a4', 'dashboard') $$,
  'with the policy, a manager decides a website change');
select lives_ok($$ select public.decide_profile_change('00000000-0000-4000-8000-0000000006c1', 'accept', '00000000-0000-4000-8000-0000000000a1', 'dashboard') $$,
  'the owner decides the name change');
-- A manager whose policy was turned back off may approve nothing again.
select lives_ok($$ select public.set_approval_policy('00000000-0000-4000-8000-0000000000c1', 'review_reply', 'owner')
  from (select tests.act_as('00000000-0000-4000-8000-0000000000a1')) x $$, 'the owner takes it back');
reset role;
select is(private.may_approve('00000000-0000-4000-8000-0000000000c1', 'review_reply', '00000000-0000-4000-8000-0000000000a4', false), false,
  'the manager may no longer approve replies');
-- Owner emails with approval links go to owners only.
select is((select array_agg(e order by e) from public.location_owner_emails('00000000-0000-4000-8000-0000000000c1') e),
  array['victim-owner@example.test'], 'approval emails go to the owner, not the manager or staff');

-- 5. No partner approval modes (K-127, P0.8-01): only "owner" and "owner and managers" exist ----------------------------
select tests.act_as('00000000-0000-4000-8000-0000000000a1');
select throws_ok($$ select public.set_approval_policy('00000000-0000-4000-8000-0000000000c1', 'post', 'partner',
  'I let Victim Partner approve and publish Google posts for my business.') $$, 'P0001', 'bad_policy',
  'the old partner mode is refused, even with consent text');
select throws_ok($$ select public.set_approval_policy('00000000-0000-4000-8000-0000000000c1', 'post', 'partner_prepares') $$, 'P0001', 'bad_policy',
  'and so is partner prepares, owner approves');
reset role;
select throws_ok($$ insert into public.approval_policies (location_id, kind, policy, set_by)
  values ('00000000-0000-4000-8000-0000000000c2', 'post', 'partner', '00000000-0000-4000-8000-0000000000b2') $$, '23514', null,
  'the table itself refuses a partner mode');
select is(private.may_approve('00000000-0000-4000-8000-0000000000c1', 'post', '00000000-0000-4000-8000-0000000000a2', false), false,
  'someone who is not on the team approves nothing');

-- 6. Team: invite, join, change, remove (owner only), audited -------------------------------------------------------------
select tests.act_as('00000000-0000-4000-8000-0000000000a1');
select throws_ok($$ select public.invite_team_member('00000000-0000-4000-8000-0000000000c1', 'victim-manager@example.test', 'staff') $$,
  'P0001', 'already_member', 'someone already on the team cannot be invited again');
select throws_ok($$ select public.invite_team_member('00000000-0000-4000-8000-0000000000c1', 'not an email', 'staff') $$, 'P0001', 'bad_email', 'a bad address is refused');
select throws_ok($$ select public.invite_team_member('00000000-0000-4000-8000-0000000000c1', 'x@example.test', 'owner') $$, 'P0001', 'bad_role', 'an invite is for a manager or staff');
select lives_ok($$ select public.invite_team_member('00000000-0000-4000-8000-0000000000c1', ' New-Hire@Example.test ', 'staff') $$, 'the owner invites someone');
reset role;
select is((select email || ' ' || role from public.team_invites where location_id = '00000000-0000-4000-8000-0000000000c1' and email like 'new-hire%'),
  'new-hire@example.test staff', 'the invite keeps the address in lower case and the role');
select is((select count(*) from public.jobs where kind = 'team_invite_email' and location_id = '00000000-0000-4000-8000-0000000000c1'), 1::bigint,
  'one invitation email is offered');
select is((public.team_invite_for_email((select id from public.team_invites where email = 'new-hire@example.test')) ->> 'business'), 'Victim Bakery',
  'the email job reads the business name');
select ok(not has_function_privilege('authenticated', 'public.team_invite_for_email(uuid)', 'execute'), 'the browser cannot read invite emails');
select tests.act_as('00000000-0000-4000-8000-0000000000b1');
select is(public.claim_team_invites(), 0, 'someone else signing in claims nothing');
reset role;
select tests.act_as('00000000-0000-4000-8000-0000000000a6');
select is(public.claim_team_invites(), 1, 'the invited address signs in and joins');
select is((public.my_access('00000000-0000-4000-8000-0000000000c1') ->> 'role'), 'staff', 'with the invited role');
select is(public.claim_team_invites(), 0, 'an invite is used once');
reset role;
select tests.act_as('00000000-0000-4000-8000-0000000000a1');
select lives_ok($$ select public.set_member_role('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000a6', 'manager') $$, 'the owner makes them a manager');
select throws_ok($$ select public.set_member_role('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000a1', 'manager') $$,
  'P0001', 'last_owner', 'the only owner cannot step down');
select throws_ok($$ select public.remove_member('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000a1') $$,
  'P0001', 'last_owner', 'nor remove themselves');
select lives_ok($$ select public.remove_member('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000a6') $$, 'the owner removes them');
reset role;
select is((select array_agg(action order by created_at, action) from public.audit_events
            where location_id = '00000000-0000-4000-8000-0000000000c1' and object_id = '00000000-0000-4000-8000-0000000000a6'),
  array['role_added', 'role_changed', 'role_removed'], 'joining, the role change and the removal are audited');
select tests.act_as('00000000-0000-4000-8000-0000000000a6');
select throws_ok($$ select public.my_access('00000000-0000-4000-8000-0000000000c1') $$, '42501', null, 'once removed, no access');
select is((select count(*) from public.reviews), 0::bigint, 'and no reviews');
reset role;

select * from finish();
rollback;
