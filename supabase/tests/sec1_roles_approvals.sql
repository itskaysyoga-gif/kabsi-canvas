-- Sec 1 (master plan 30.15 section 8): roles that change and approvals bound to business, action, content version,
-- approver and expiry. A removed or demoted member loses WhatsApp approvals at once, and a yes they already gave stops
-- at the publish step; a changed phone presses nothing; one phone with roles in two businesses acts only where each
-- role allows; an edit voids the old yes; an old yes expires; the stop switch halts every Google write without losing
-- work; the Founding 25 owner match is for staff admins and never shows a number. The random orders of approve, edit,
-- Undo, retry and revoke are in sec1_approval_properties.ts (fast-check, run by scripts/db-test.sh).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

\ir _fixtures.psql

-- LA is active on the mock; LB too. Manager M (..a4) of LA; person D (..b4) is owner of LB and staff of LA.
update public.locations set consent_at = now(), access_granted_at = now(), google_account_id = 'accounts/test',
  google_location_id = 'locations/mock-victim', status = 'active'
 where id = '00000000-0000-4000-8000-0000000000c1';
update public.locations set consent_at = now(), access_granted_at = now(), google_account_id = 'accounts/test',
  google_location_id = 'locations/mock-other', status = 'active'
 where id = '00000000-0000-4000-8000-0000000000c2';
insert into public.subscriptions (organization_id, plan, state)
select organization_id, 'pro', 'active' from public.locations where id = '00000000-0000-4000-8000-0000000000c2';
insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
select '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email, now(), '{}', '{}', now(), now()
from (values
  ('00000000-0000-4000-8000-0000000000a4'::uuid, 'victim-manager@example.test'),
  ('00000000-0000-4000-8000-0000000000b4'::uuid, 'two-places@example.test'),
  ('00000000-0000-4000-8000-0000000000b6'::uuid, 'kabsi-installer@example.test')
) as u(id, email);
insert into public.location_members (location_id, user_id, role) values
  ('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000a4', 'manager'),
  ('00000000-0000-4000-8000-0000000000c2', '00000000-0000-4000-8000-0000000000b4', 'owner'),
  ('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000b4', 'staff');
insert into public.staff (user_id, name, role) values ('00000000-0000-4000-8000-0000000000b6', 'Kabsi Installer', 'installer');
-- The owner of LA lets managers approve replies.
insert into public.approval_policies (location_id, kind, policy, set_by)
values ('00000000-0000-4000-8000-0000000000c1', 'review_reply', 'owner_and_managers', '00000000-0000-4000-8000-0000000000a1')
on conflict (location_id, kind) do update set policy = excluded.policy;

insert into public.reviews (id, location_id, google_review_id, star_rating, review_created_at, state, risk)
select ('00000000-0000-4000-8000-0000000004' || lpad(g::text, 2, '0'))::uuid, '00000000-0000-4000-8000-0000000000c1',
  'sec1-review-' || g, 5, now(), 'drafted', 'low'
  from generate_series(1, 12) g;
insert into public.reply_drafts (review_id, version, body, source, safety_ok)
select ('00000000-0000-4000-8000-0000000004' || lpad(g::text, 2, '0'))::uuid, 1, 'Thank you for coming, see you soon.', 'ai', true
  from generate_series(1, 12) g;
insert into public.reviews (id, location_id, google_review_id, star_rating, review_created_at, state, risk)
values ('00000000-0000-4000-8000-000000000499', '00000000-0000-4000-8000-0000000000c2', 'sec1-review-b', 5, now(), 'drafted', 'low');
insert into public.reply_drafts (review_id, version, body, source, safety_ok)
values ('00000000-0000-4000-8000-000000000499', 1, 'Thank you from the other business.', 'ai', true);

create temp table t (k text primary key, v jsonb);
grant all on t to authenticated;

-- Phones: the owner A, the manager M and the person D with roles in two businesses each connect WhatsApp.
create function pg_temp.connect(p_user text, p_phone text) returns text language plpgsql as $$
declare c jsonb;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
  c := public.whatsapp_connect_start(repeat('Consent text shown to the person. ', 3));
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '', true);
  return public.whatsapp_bind(p_phone, 'KABSI ' || (c ->> 'code')) ->> 'result';
end $$;
select is(pg_temp.connect('00000000-0000-4000-8000-0000000000a1', '+15550002001'), 'verified', 'the owner connects WhatsApp');
select is(pg_temp.connect('00000000-0000-4000-8000-0000000000a4', '+15550002002'), 'verified', 'the manager connects WhatsApp');
select is(pg_temp.connect('00000000-0000-4000-8000-0000000000b4', '+15550002003'), 'verified', 'the person with two roles connects WhatsApp');

create function pg_temp.button(p_user text, p_review int) returns jsonb language sql as $$
  select public.whatsapp_action_create(p_user::uuid, 'review_reply',
    ('00000000-0000-4000-8000-0000000004' || lpad(p_review::text, 2, '0'))::uuid)
$$;
create function pg_temp.press(p_button jsonb, p_phone text) returns jsonb language sql as $$
  select public.whatsapp_approve(p_button ->> 'token', p_phone)
$$;
create function pg_temp.due(p_pub text) returns void language sql as $$
  update public.publications set publish_after = now() - interval '1 second' where id = p_pub::uuid
$$;

-- 1. A removed manager loses WhatsApp approvals at once ---------------------------------------------------------------
insert into t values ('m1', pg_temp.button('00000000-0000-4000-8000-0000000000a4', 1));
insert into t values ('m2', pg_temp.button('00000000-0000-4000-8000-0000000000a4', 2));
select ok((select (v ->> 'ok')::boolean from t where k = 'm1'), 'the manager gets an Approve button while managers may approve replies');
insert into t values ('m2a', pg_temp.press((select v from t where k = 'm2'), '+15550002002'));
select is((select v ->> 'result' from t where k = 'm2a'), 'approved', 'the manager approves one reply');
-- The owner removes the manager (owner only, audited).
select tests.act_as('00000000-0000-4000-8000-0000000000a1');
select lives_ok($$ select public.remove_member('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000a4') $$,
  'the owner removes the manager');
reset role;
select is(pg_temp.press((select v from t where k = 'm1'), '+15550002002') ->> 'result', 'refused',
  'a button pressed after the removal approves nothing');
select is((select count(*) from public.publications where target_id = '00000000-0000-4000-8000-000000000401'), 0::bigint,
  'and makes no publication');
select is(jsonb_array_length(public.whatsapp_resolve('+15550002002') -> 'roles'), 0, 'the removed manager''s phone resolves to no business');
select pg_temp.due((select v ->> 'publication_id' from t where k = 'm2a'));
select is(public.claim_publication(((select v ->> 'publication_id' from t where k = 'm2a'))::uuid) ->> 'result', 'stopped',
  'the yes the manager gave before the removal stops at the publish step');
select is((select error from public.publications where id = (select (v ->> 'publication_id')::uuid from t where k = 'm2a')),
  'approver_no_longer_allowed', 'with the reason recorded');

-- 2. A manager demoted to staff, and a policy taken back, lose approvals the same way -------------------------------
insert into public.location_members (location_id, user_id, role)
values ('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000a4', 'manager');
insert into t values ('m3', pg_temp.button('00000000-0000-4000-8000-0000000000a4', 3));
insert into t values ('m4', pg_temp.button('00000000-0000-4000-8000-0000000000a4', 4));
insert into t values ('m4a', pg_temp.press((select v from t where k = 'm4'), '+15550002002'));
select is((select v ->> 'result' from t where k = 'm4a'), 'approved', 'the manager, back on the team, approves');
select tests.act_as('00000000-0000-4000-8000-0000000000a1');
select lives_ok($$ select public.set_member_role('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000a4', 'staff') $$,
  'the owner makes the manager staff');
reset role;
select is(pg_temp.press((select v from t where k = 'm3'), '+15550002002') ->> 'result', 'refused', 'staff cannot press the old button');
select pg_temp.due((select v ->> 'publication_id' from t where k = 'm4a'));
select is(public.claim_publication(((select v ->> 'publication_id' from t where k = 'm4a'))::uuid) ->> 'result', 'stopped',
  'the yes given as manager stops at the publish step after the demotion');
update public.location_members set role = 'manager'
 where location_id = '00000000-0000-4000-8000-0000000000c1' and user_id = '00000000-0000-4000-8000-0000000000a4';
insert into t values ('m5', pg_temp.button('00000000-0000-4000-8000-0000000000a4', 5));
select tests.act_as('00000000-0000-4000-8000-0000000000a1');
select lives_ok($$ select public.set_approval_policy('00000000-0000-4000-8000-0000000000c1', 'review_reply', 'owner') $$,
  'the owner takes approvals back');
reset role;
select is(pg_temp.press((select v from t where k = 'm5'), '+15550002002') ->> 'result', 'refused',
  'a manager''s button stops working when the owner takes approvals back');

-- 3. A changed phone presses nothing ---------------------------------------------------------------------------------
insert into t values ('o6', pg_temp.button('00000000-0000-4000-8000-0000000000a1', 6));
select is(pg_temp.connect('00000000-0000-4000-8000-0000000000a1', '+15550002009'), 'verified', 'the owner moves WhatsApp to a new number');
select is(pg_temp.press((select v from t where k = 'o6'), '+15550002001') ->> 'result', 'unknown',
  'the old number cannot press the owner''s button');
select is(jsonb_array_length(public.whatsapp_resolve('+15550002001') -> 'roles'), 0, 'the old number resolves to no business');
select is(pg_temp.press((select v from t where k = 'o6'), '+15550002009') ->> 'result', 'approved', 'the new number can');

-- 4. One phone, roles in two businesses: owner of LB, staff of LA ---------------------------------------------------
select is(
  (select jsonb_agg(x ->> 'business' || ':' || (x ->> 'role') order by x ->> 'business') from jsonb_array_elements(public.whatsapp_resolve('+15550002003') -> 'roles') x),
  '["Other Barber:owner", "Victim Bakery:staff"]'::jsonb, 'the phone resolves to both businesses, each with its own role');
insert into t values ('d7', pg_temp.button('00000000-0000-4000-8000-0000000000b4', 7));
select is(pg_temp.press((select v from t where k = 'd7'), '+15550002003') ->> 'result', 'refused',
  'as staff of LA the person cannot approve an LA reply');
select is((select count(*) from public.publications where target_id = '00000000-0000-4000-8000-000000000407'), 0::bigint,
  'and nothing is published for LA');
select is(public.whatsapp_action_create('00000000-0000-4000-8000-0000000000a1', 'review_reply', '00000000-0000-4000-8000-000000000499') ->> 'reason',
  'not_member', 'the owner of LA gets no button for LB');
insert into t values ('d9', public.whatsapp_action_create('00000000-0000-4000-8000-0000000000b4', 'review_reply', '00000000-0000-4000-8000-000000000499'));
select is(pg_temp.press((select v from t where k = 'd9'), '+15550002003') ->> 'result', 'approved', 'as owner of LB they approve an LB reply');

-- 5. An edit voids the old yes, in every channel -----------------------------------------------------------------------
insert into t values ('o8', pg_temp.button('00000000-0000-4000-8000-0000000000a1', 8));
insert into public.reply_drafts (review_id, version, body, source, safety_ok)
values ('00000000-0000-4000-8000-000000000408', 2, 'An edited reply the owner has not seen yet.', 'owner', true);
select is(pg_temp.press((select v from t where k = 'o8'), '+15550000000') ->> 'result', 'unknown', 'a stranger''s phone gets nothing');
select is(pg_temp.press((select v from t where k = 'o8'), '+15550002009') ->> 'reason', 'changed', 'the button for the old text is refused after an edit');
-- Dashboard: the yes is for the exact text sent with it; a redraft after the yes stops the publication.
insert into t values ('d10', public.approve_publication('review_reply', '00000000-0000-4000-8000-000000000410',
  '{"text": "The text the owner saw."}'::jsonb, '00000000-0000-4000-8000-0000000000a1', 'dashboard'));
select is((select payload ->> 'text' from public.publications where id = (select (v ->> 'publication_id')::uuid from t where k = 'd10')),
  'The text the owner saw.', 'the publication holds the exact text approved');
update public.reviews set state = 'drafted' where id = '00000000-0000-4000-8000-000000000410';
select pg_temp.due((select v ->> 'publication_id' from t where k = 'd10'));
select is(public.claim_publication(((select v ->> 'publication_id' from t where k = 'd10'))::uuid) ->> 'result', 'stopped',
  'a reply that went back to a draft after the yes is not sent');

-- 6. An old yes expires --------------------------------------------------------------------------------------------
insert into t values ('e11', public.approve_publication('review_reply', '00000000-0000-4000-8000-000000000411',
  '{"text": "Thank you for coming."}'::jsonb, '00000000-0000-4000-8000-0000000000a1', 'dashboard'));
update public.publications set approved_at = now() - interval '8 days', publish_after = now() - interval '8 days'
 where id = (select (v ->> 'publication_id')::uuid from t where k = 'e11');
select is(public.claim_publication(((select v ->> 'publication_id' from t where k = 'e11'))::uuid) ->> 'result', 'stopped',
  'a yes older than 7 days is not sent');
select is((select state || '/' || error from public.publications where id = (select (v ->> 'publication_id')::uuid from t where k = 'e11')),
  'failed/approval_expired', 'it fails as approval_expired');
select is((select state from public.reviews where id = '00000000-0000-4000-8000-000000000411'), 'drafted',
  'and the reply is back with the owner');

-- A post approved ahead for a later date is measured from that date, not from the approval.
insert into public.gbp_posts (id, location_id, owner_input, body, state)
values ('00000000-0000-4000-8000-0000000004a1', '00000000-0000-4000-8000-0000000000c1', 'x', 'Fresh bread every morning from 7.', 'draft');
insert into t values ('p20', public.approve_publication('local_post', '00000000-0000-4000-8000-0000000004a1',
  '{"summary": "Fresh bread every morning from 7."}'::jsonb, '00000000-0000-4000-8000-0000000000a1', 'dashboard'));
update public.publications set approved_at = now() - interval '20 days', publish_after = now() - interval '1 second'
 where id = (select (v ->> 'publication_id')::uuid from t where k = 'p20');
select is(public.claim_publication(((select v ->> 'publication_id' from t where k = 'p20'))::uuid) ->> 'result', 'claimed',
  'a post approved 20 days before its date still goes on its date');

-- 7. The stop switch -------------------------------------------------------------------------------------------------
select is((select value from public.app_settings where key = 'google_writes'), 'on', 'Google writes are on by default');
select ok(not has_function_privilege('authenticated', 'public.google_writes_paused()', 'execute')
          and not has_function_privilege('anon', 'public.google_writes_paused()', 'execute')
          and has_function_privilege('service_role', 'public.google_writes_paused()', 'execute'),
  'the switch is read by the service role only');
insert into t values ('s12', public.approve_publication('review_reply', '00000000-0000-4000-8000-000000000412',
  '{"text": "Thank you for coming."}'::jsonb, '00000000-0000-4000-8000-0000000000a1', 'dashboard'));
select pg_temp.due((select v ->> 'publication_id' from t where k = 's12'));
select tests.act_as('00000000-0000-4000-8000-0000000000b6');
select throws_ok($$ select public.staff_set_google_writes(true, 'installer tries') $$, '42501', null, 'an installer cannot flip the switch');
reset role;
select tests.act_as('00000000-0000-4000-8000-0000000000a1');
select throws_ok($$ select public.staff_set_google_writes(true, 'owner tries') $$, '42501', null, 'an owner cannot flip the switch');
reset role;
select tests.act_as('00000000-0000-4000-8000-0000000000a3');
select throws_ok($$ select public.staff_set_google_writes(true, '') $$, 'P0001', 'reason_required', 'a reason is required');
select is(public.staff_set_google_writes(true, 'Google incident drill') ->> 'google_writes', 'paused', 'a staff admin pauses every Google write');
reset role;
select is(public.google_writes_paused(), true, 'the switch reads paused');
select is(public.claim_publication(((select v ->> 'publication_id' from t where k = 's12'))::uuid) ->> 'result', 'paused',
  'while paused, a due publication is not claimed');
select is((select state from public.publications where id = (select (v ->> 'publication_id')::uuid from t where k = 's12')), 'approved',
  'it stays approved: nothing is lost');
select is((select count(*) from public.audit_events where action = 'google_writes_paused' and actor_type = 'staff'), 1::bigint,
  'the pause is in the audit log');
select tests.act_as('00000000-0000-4000-8000-0000000000a3');
select is(public.staff_set_google_writes(false, 'Drill finished') ->> 'google_writes', 'on', 'the staff admin turns writes back on');
reset role;
select is(public.claim_publication(((select v ->> 'publication_id' from t where k = 's12'))::uuid) ->> 'result', 'claimed',
  'then the same publication is claimed');

-- 8. Founding 25: the owner match, for staff admins, without the number --------------------------------------------
insert into public.founding_applications (id, business_name, country, trade, business_kind, whatsapp, why_now, case_study,
  checkin_consent, consent_text)
values ('00000000-0000-4000-8000-0000000004f1', 'Other Barber', 'AE', 'beauty_hair', 'Barber', '+15550002003',
  'We want more reviews this month.', 'anonymous', true, 'I agree to a check-in call.');
select tests.act_as('00000000-0000-4000-8000-0000000000b6');
select throws_ok($$ select public.staff_founding_matches('00000000-0000-4000-8000-0000000004f1') $$, '42501', null,
  'an installer cannot match owners');
reset role;
select tests.act_as('00000000-0000-4000-8000-0000000000a3');
select is(public.staff_founding_matches('00000000-0000-4000-8000-0000000004f1'),
  '[{"name": "Other Barber", "location_id": "00000000-0000-4000-8000-0000000000c2", "phone_last4": "2003", "whatsapp_state": "active"}]'::jsonb,
  'a staff admin finds the business whose owner has the application''s number, with the last 4 digits only');
reset role;

select * from finish();
rollback;
