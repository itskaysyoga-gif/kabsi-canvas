-- P0.2-04: Google Protection on Google's update flow (K-19, K-20, K-64, K-77, K-116.2, A3, A4, guardrail 7). The
-- detector records a change against the owner's confirmed facts, once per value, with its explanation; a value never
-- confirmed is watched but never offered for restore; "Google is right" updates the fact; "Keep my information"
-- publishes once through the pipeline; the high-risk fields need the owner signed in and 7 days between them; a third
-- conflict in 30 days goes to Google support; nothing is ever sent without a decision; the retired tables follow K-40.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

\ir _fixtures.psql

-- LA (..c1, owner A ..a1, manager M ..b4) active on the mock. The fixtures' own phone change is closed first.
update public.profile_changes set status = 'expired' where location_id = '00000000-0000-4000-8000-0000000000c1';
insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-0000000000b4', 'authenticated', 'authenticated',
        'victim-manager@example.test', now(), '{}', '{}', now(), now());
insert into public.location_members (location_id, user_id, role)
values ('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000b4', 'manager');
update public.locations set consent_at = now(), access_granted_at = now(), google_account_id = 'accounts/test',
  google_location_id = 'locations/mock-victim', status = 'active'
 where id = '00000000-0000-4000-8000-0000000000c1';

-- The owner confirmed name, hours, phone, address and open status (K-18); the website was only seen on Google.
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-4000-8000-0000000000a1", "role": "authenticated"}';
select public.confirm_business_details('00000000-0000-4000-8000-0000000000c1', jsonb_build_object(
  'name', jsonb_build_object('display', 'Yawmiyati.com', 'raw', 'Yawmiyati.com'),
  'regular_hours', jsonb_build_object('display', 'Mon to Sun 09:00 to 22:00'),
  'phone', jsonb_build_object('display', '+961 1 123 456', 'raw', '+961 1 123 456'),
  'address', jsonb_build_object('display', 'Hamra Street, Beirut', 'raw', 'Hamra Street, Beirut'),
  'open_status', jsonb_build_object('display', 'Open', 'raw', 'OPEN')));
reset role;
set local request.jwt.claims = '';
insert into public.knowledge_facts (location_id, slot, key, value, status, source, uses)
values ('00000000-0000-4000-8000-0000000000c1', 'profile.website', 'website', '{"display": "https://victim.example", "raw": "https://victim.example"}',
        'needs_confirmation', 'google', '{profile}');

create function pg_temp.check(p_reads jsonb) returns jsonb language sql as $$
  select public.record_protection_check('00000000-0000-4000-8000-0000000000c1', p_reads)
$$;
create function pg_temp.read(p_field text, p_display text, p_previous text, p_updated boolean default false,
  p_explanation text default null, p_recommend text default null, p_reason text default null) returns jsonb language sql as $$
  select jsonb_build_object('field', p_field, 'value', jsonb_build_object('display', p_display, 'raw', p_display),
    'google_updated', p_updated, 'previous', p_previous, 'explanation', p_explanation, 'recommend', p_recommend, 'reason', p_reason)
$$;
create function pg_temp.open_change(p_field text) returns public.profile_changes language sql as $$
  select * from public.profile_changes where location_id = '00000000-0000-4000-8000-0000000000c1' and field = p_field
     and status in ('detected', 'awaiting_review')
$$;
create function pg_temp.fact(p_field text) returns public.knowledge_facts language sql as $$
  select * from public.knowledge_facts where location_id = '00000000-0000-4000-8000-0000000000c1'
     and slot = 'profile.' || p_field and superseded_by is null
$$;
create function pg_temp.decide(p_field text, p_decision text, p_user text default '00000000-0000-4000-8000-0000000000a1',
  p_channel text default 'dashboard') returns jsonb language sql as $$
  select public.decide_profile_change((pg_temp.open_change(p_field)).id, p_decision, p_user::uuid, p_channel)
$$;
create function pg_temp.pubs() returns bigint language sql as $$
  select count(*) from public.publications where location_id = '00000000-0000-4000-8000-0000000000c1' and target_type = 'listing_revert'
$$;

-- Who can run what ------------------------------------------------------------------------------------------------------

select ok((select bool_and(not has_function_privilege('anon', f, 'execute') and not has_function_privilege('authenticated', f, 'execute')
                           and has_function_privilege('service_role', f, 'execute'))
             from unnest(array['public.record_protection_check(uuid,jsonb)', 'public.decide_profile_change(uuid,text,uuid,text)',
                               'public.mock_listing_send(text,text,jsonb)']) f),
  'the detector, the decision and the mock send run for the service role only');

-- Detect (K-19): a Google update to the hours is one change with its explanation ------------------------------------------

select is(pg_temp.check(jsonb_build_array(
    pg_temp.read('regular_hours', 'Mon to Sat 09:00 to 22:00, Sun 09:00 to 18:00', 'Mon to Sun 09:00 to 22:00', true,
      'Google shows Sunday closing at 18:00. You approved 22:00.'),
    pg_temp.read('phone', '+961 1 123 456', '+961 1 123 456'))) -> 'changes' -> 0 ->> 'field',
  'regular_hours', 'a Google update to the hours creates one change; an unchanged phone none');
select is((select row(c.source, c.severity, c.status, c.explanation, c.previous_value ->> 'display', c.google_value ->> 'display',
                      c.previous_fact_id = (pg_temp.fact('regular_hours')).id)::text from pg_temp.open_change('regular_hours') c),
  row('google_update', 'urgent', 'awaiting_review', 'Google shows Sunday closing at 18:00. You approved 22:00.',
      'Mon to Sun 09:00 to 22:00', 'Mon to Sat 09:00 to 22:00, Sun 09:00 to 18:00', true)::text,
  'the change keeps the source, the severity (K-20), the explanation and the confirmed value it is compared with');
select is((select count(*)::int from public.audit_events where action = 'protection_change' and object_id = (pg_temp.open_change('regular_hours')).id::text
            and result = 'awaiting_review' and after ->> 'field' = 'regular_hours' and after::text not like '%18:00%'),
  1, 'the change is in the audit log, with the field and the state, not Google''s value');
select is(pg_temp.check(jsonb_build_array(pg_temp.read('regular_hours', 'Mon to Sat 09:00 to 22:00, Sun 09:00 to 18:00',
    'Mon to Sun 09:00 to 22:00', true, 'again'))) -> 'changes', '[]'::jsonb, 'the same value is raised once');
select is(pg_temp.check(jsonb_build_array(pg_temp.read('regular_hours', 'Mon to Sun 10:00 to 22:00', 'Mon to Sun 09:00 to 23:00', true,
    'stale'))) -> 'changes', '[]'::jsonb, 'an explanation written against another value is not recorded (the next check redoes it)');
select is(jsonb_array_length(pg_temp.check(jsonb_build_array(pg_temp.read('regular_hours', 'Mon to Sun 10:00 to 22:00',
    'Mon to Sun 09:00 to 22:00', false, 'Google shows Monday opening at 10:00. You approved 09:00.'))) -> 'changes'), 1,
  'a newer value is a new change');
select is((select array_agg(status || ':' || (superseded_by is not null) order by status desc) from public.profile_changes
            where location_id = '00000000-0000-4000-8000-0000000000c1' and field = 'regular_hours'),
  array['superseded:true', 'awaiting_review:false'], 'it supersedes the open one (A5), never "kept"');
select ok((select shield_checked_at is not null from public.locations where id = '00000000-0000-4000-8000-0000000000c1'),
  'the check time is recorded (Home status line)');

-- K-18: a value the owner never confirmed is watched, labelled, never offered for restore ------------------------------------

select is(jsonb_array_length(pg_temp.check(jsonb_build_array(pg_temp.read('website', '', 'https://victim.example', false,
    'Google shows nothing as your website. Kabsi saw “https://victim.example” before. Not yet confirmed by you.'))) -> 'changes'), 1,
  'a change to an unconfirmed value is raised');
select is((select previous_fact_id from pg_temp.open_change('website')), null, 'with no approved value (Not yet confirmed by you)');
select is((select row(status, source, value ->> 'display')::text from pg_temp.fact('website')),
  row('needs_confirmation', 'google', '')::text, 'Kabsi keeps watching from what Google shows now, still unconfirmed');
select throws_ok($$ select pg_temp.decide('website', 'reject') $$, 'P0001', 'not_confirmed',
  '"Keep my information" is refused for a value the owner never confirmed');
select throws_ok($$ select public.approve_publication('listing_revert', (pg_temp.open_change('website')).id, '{}'::jsonb,
  '00000000-0000-4000-8000-0000000000a1', 'dashboard') $$, 'P0001', 'not_confirmed', 'and by the pipeline itself');

-- No fact yet, or Google's value cleared after 30 days: noted, not raised.
select is(pg_temp.check(jsonb_build_array(pg_temp.read('main_category', 'Media company', null), pg_temp.read('map_pin', '', null))),
  '{"changes": [], "noted": 1}'::jsonb, 'a first value is noted as not yet confirmed; an empty one is not');
select is((select row(status, source, value ->> 'display')::text from pg_temp.fact('main_category')),
  row('needs_confirmation', 'google', 'Media company')::text, 'the noted value');

-- "Google is right" (accept): Google's value becomes the approved fact ---------------------------------------------------------

select is(pg_temp.decide('website', 'accept', '00000000-0000-4000-8000-0000000000b4') ->> 'state', 'accepted',
  'a manager can accept a low-risk change');
select is((select row(status, source, value ->> 'display', confirmed_by)::text from pg_temp.fact('website')),
  row('verified', 'google', '', '00000000-0000-4000-8000-0000000000b4'::uuid)::text, 'the fact is now the approved value, confirmed by who chose');
select is((select row(status, decided_by is not null, publication_id)::text from public.profile_changes
            where location_id = '00000000-0000-4000-8000-0000000000c1' and field = 'website'),
  row('accepted', true, null::uuid)::text, 'the change is accepted, and nothing goes to Google');
select throws_ok($$ select public.decide_profile_change((select id from public.profile_changes where field = 'website'
  and location_id = '00000000-0000-4000-8000-0000000000c1'), 'reject', '00000000-0000-4000-8000-0000000000a1', 'dashboard') $$,
  'P0001', 'already_decided', 'a decided change cannot be decided again');

-- "Keep my information" (reject): one publication, through the pipeline, with the approved value -----------------------------

select is(pg_temp.decide('regular_hours', 'reject') ->> 'state', 'rejected', 'the owner keeps their hours');
select is(pg_temp.pubs(), 1::bigint, 'one publication');
select is((select payload - 'fact_id' from public.publications where location_id = '00000000-0000-4000-8000-0000000000c1' and target_type = 'listing_revert'),
  '{"field": "regular_hours", "value": "Mon to Sun 09:00 to 22:00", "raw": null}'::jsonb,
  'it sends the owner''s approved value, read from Business Knowledge');
select is((select row(c.status, c.publication_id = p.id)::text from public.profile_changes c join public.publications p on p.target_id = c.id
            where c.location_id = '00000000-0000-4000-8000-0000000000c1' and c.field = 'regular_hours' and c.status <> 'superseded'),
  row('rejected', true)::text, 'the change is on its way, with its publication');
select is(public.approve_publication('listing_revert', (select target_id from public.publications where location_id = '00000000-0000-4000-8000-0000000000c1'
    and target_type = 'listing_revert'), '{}'::jsonb, '00000000-0000-4000-8000-0000000000a1', 'email_link') ->> 'created', 'false',
  'a second approval finds the same publication');
select is(pg_temp.check(jsonb_build_array(pg_temp.read('regular_hours', 'Mon to Sun 11:00 to 22:00', 'Mon to Sun 09:00 to 22:00'))) -> 'changes',
  '[]'::jsonb, 'while the put-back is on its way, the detector raises nothing for that field');
-- Undo inside the 10 seconds: back with the owner.
select is(public.undo_publication((select id from public.publications where location_id = '00000000-0000-4000-8000-0000000000c1'
    and target_type = 'listing_revert'), '00000000-0000-4000-8000-0000000000a1') ->> 'state', 'cancelled', 'undo');
select is((select row(status, publication_id, decided_by)::text from public.profile_changes where location_id = '00000000-0000-4000-8000-0000000000c1'
            and field = 'regular_hours' and status <> 'superseded'), row('awaiting_review', null::uuid, null::uuid)::text,
  'after undo the change waits for the owner again');
-- Approved again, sent, and Google shows it: corrected.
select is(pg_temp.decide('regular_hours', 'reject') ->> 'created', 'true', 'approved again');
create temp table p1 as select id from public.publications where location_id = '00000000-0000-4000-8000-0000000000c1'
  and target_type = 'listing_revert' and state = 'approved';
update public.publications set publish_after = now() - interval '1 second' where id = (select id from p1);
select is(public.claim_publication((select id from p1)) ->> 'result', 'claimed', 'the publish job claims it once');
select is(public.record_publication((select id from p1), 'published'), 'published', 'sent');
select is(public.record_publication((select id from p1), 'verified'), 'verified', 'Google shows it and no longer marks it as its own');
select is((select status from public.profile_changes where location_id = '00000000-0000-4000-8000-0000000000c1' and field = 'regular_hours'
            and status <> 'superseded'), 'corrected', 'the change is corrected');
select is((select count(*)::int from public.audit_events where action = 'protection_change' and result = 'rejected'
            and actor_type = 'user' and actor_id = '00000000-0000-4000-8000-0000000000a1'), 2,
  'each "Keep my information" is in the audit log as the owner''s decision');

-- K-19, K-64, A4: name, address, main category, open status and map pin need the owner, signed in -------------------------

select is(jsonb_array_length(pg_temp.check(jsonb_build_array(pg_temp.read('name', 'Yawmiyati', 'Yawmiyati.com', true,
    'Google shows “Yawmiyati” as your business name. You approved “Yawmiyati.com”.', 'accept',
    'Google removed ''.com''. Business names on Google can''t include web addresses, and putting it back can lead to a suspension.'))) -> 'changes'), 1,
  'a name change from Yawmiyati.com to Yawmiyati is raised');
select is((select row(recommend, recommend_reason)::text from pg_temp.open_change('name')),
  row('accept', 'Google removed ''.com''. Business names on Google can''t include web addresses, and putting it back can lead to a suspension.')::text,
  'with "Google is right" recommended and the reason (K-77)');
select throws_ok($$ select pg_temp.decide('name', 'reject', p_channel => 'email_link') $$, 'P0001', 'sign_in_required',
  'a name change cannot be decided from an email link');
select throws_ok($$ select pg_temp.decide('name', 'accept', p_channel => 'email_link') $$, 'P0001', 'sign_in_required',
  'not even "Google is right"');
select throws_ok($$ select public.approve_publication('listing_revert', (pg_temp.open_change('name')).id, '{}'::jsonb,
  '00000000-0000-4000-8000-0000000000a1', 'email_link') $$, 'P0001', 'sign_in_required', 'nor straight through the pipeline');
select throws_ok($$ select pg_temp.decide('name', 'reject', '00000000-0000-4000-8000-0000000000b4') $$, 'P0001', 'owner_only',
  'a manager cannot decide a high-risk field');
select throws_ok($$ select pg_temp.decide('name', 'reject', '00000000-0000-4000-8000-0000000000b2') $$, 'P0001', 'not_member',
  'someone outside the business cannot decide');
select is(pg_temp.decide('name', 'reject') ->> 'state', 'rejected', 'the signed-in owner can keep their name despite the warning');

-- K-116.2: a second high-risk put-back inside 7 days is refused.
select is(jsonb_array_length(pg_temp.check(jsonb_build_array(pg_temp.read('address', 'Verdun Street, Beirut', 'Hamra Street, Beirut'),
    pg_temp.read('open_status', 'Permanently closed', 'Open', true))) -> 'changes'), 2, 'address and open status changed');
select throws_like($$ select pg_temp.decide('address', 'reject') $$, 'high_risk_wait %',
  'a second high-risk change inside 7 days is refused, with the date it can go');
select is((select status from pg_temp.open_change('address')), 'awaiting_review', 'and stays with the owner');
update public.publications set approved_at = now() - interval '8 days'
 where location_id = '00000000-0000-4000-8000-0000000000c1' and payload ->> 'field' = 'name';
select is(pg_temp.decide('address', 'reject') ->> 'state', 'rejected', 'after 7 days it goes');
select is(pg_temp.decide('open_status', 'accept') ->> 'state', 'accepted', '"Google is right" sends nothing, so no wait');

-- K-19: never re-sent more than twice in 30 days; the third conflict goes to Google support -------------------------------

insert into public.publications (location_id, target_type, target_id, payload, approved_by, channel, state, approved_at)
select '00000000-0000-4000-8000-0000000000c1', 'listing_revert', gen_random_uuid(), '{"field": "phone"}'::jsonb,
       '00000000-0000-4000-8000-0000000000a1', 'dashboard', 'verified', now() - make_interval(days => d)
  from unnest(array[3, 20]) d;
select is(jsonb_array_length(pg_temp.check(jsonb_build_array(pg_temp.read('phone', '+961 1 999 999', '+961 1 123 456'))) -> 'changes'), 1,
  'Google changed the phone a third time');
create temp table before_support as select pg_temp.pubs() n;
select is(pg_temp.decide('phone', 'reject') ->> 'state', 'support', 'the third "Keep my information" in 30 days goes to Google support');
select is(pg_temp.pubs(), (select n from before_support), 'and nothing is sent to Google');
select is((select row(kind, location_name, detail like '%Contact Google Business Profile support%', detail not like '%+961%')::text
            from public.staff_followups where location_id = '00000000-0000-4000-8000-0000000000c1' and done_at is null),
  row('google_support', 'Victim Bakery', true, true)::text, 'a staff task with a ready explanation, without Google''s values');
select is((select row(status, support_requested_at is not null)::text from public.profile_changes
            where location_id = '00000000-0000-4000-8000-0000000000c1' and field = 'phone' and google_value ->> 'display' = '+961 1 999 999'), row('rejected', true)::text,
  'the change records the owner''s answer and the support request');
select is(pg_temp.check(jsonb_build_array(pg_temp.read('phone', '+961 1 999 999', '+961 1 123 456'))) -> 'changes', '[]'::jsonb,
  'the same value is not raised again while support handles it');
-- An old put-back (31 days) does not count.
update public.publications set approved_at = now() - interval '31 days'
 where location_id = '00000000-0000-4000-8000-0000000000c1' and payload ->> 'field' = 'phone' and approved_at < now() - interval '10 days';
select is(jsonb_array_length(pg_temp.check(jsonb_build_array(pg_temp.read('phone', '+961 1 888 888', '+961 1 123 456'))) -> 'changes'), 1,
  'a newer phone value');
select is(pg_temp.decide('phone', 'reject') ->> 'state', 'rejected', 'one put-back in the last 30 days: the second may go');

-- Guardrail 7: the detector never sends anything ---------------------------------------------------------------------------

create temp table n_pubs as select pg_temp.pubs() n;
select pg_temp.check(jsonb_build_array(pg_temp.read('main_category', 'Newspaper', 'Media company'),
  pg_temp.read('map_pin', '33.88457, 35.54615', null)));
select is(pg_temp.pubs(), (select n from n_pubs), 'checks create changes, never a publication');
select throws_ok($$ select pg_temp.check('[{"field": "description"}]') $$, 'P0001', 'unknown field: description', 'only watched fields');

-- Disconnect (P0.2-02): an approved put-back inside its undo window is cancelled and the change is back with the owner.
select is((select status from public.profile_changes where location_id = '00000000-0000-4000-8000-0000000000c1' and field = 'phone'
            and google_value ->> 'display' = '+961 1 888 888'), 'rejected', 'a put-back is waiting');
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-4000-8000-0000000000a1", "role": "authenticated"}';
select public.request_disconnect('00000000-0000-4000-8000-0000000000c1');
reset role;
set local request.jwt.claims = '';
select is((select row(status, publication_id)::text from public.profile_changes where location_id = '00000000-0000-4000-8000-0000000000c1'
            and field = 'phone' and google_value ->> 'display' = '+961 1 888 888'), row('awaiting_review', null::uuid)::text,
  'after a disconnect the change is back with the owner, nothing sent');

-- The retired tables (listing_changes, listing_baselines) and K-40 -----------------------------------------------------------

-- A listing_changes id (code before P0.2-04) resolves to its mirrored change.
update public.locations set status = 'active', disconnect_requested_at = null, disconnect_requested_by = null
 where id = '00000000-0000-4000-8000-0000000000c1';
insert into public.listing_changes (id, location_id, field, old_value, new_value, detected_by) values
  ('00000000-0000-4000-8000-0000000009a1', '00000000-0000-4000-8000-0000000000c1', 'website',
   '{"display": ""}', '{"display": "https://other.example"}', 'scheduled_check');
select is((select publication_id is null from public.profile_changes where listing_change_id = '00000000-0000-4000-8000-0000000009a1'), true,
  'the mirror still makes a profile change for a row old code writes');
select is((public.approve_publication('listing_revert', '00000000-0000-4000-8000-0000000009a1', '{}'::jsonb,
    '00000000-0000-4000-8000-0000000000a1', 'dashboard') ->> 'created'), 'true', 'old code''s put-back still goes through the pipeline');
select is((select p.target_id = c.id from public.publications p join public.profile_changes c on c.listing_change_id = '00000000-0000-4000-8000-0000000009a1'
            where p.id = c.publication_id), true, 'on the profile change');

-- K-40: Google's values in the retired tables go 30 days after they were read; the owner's kept baselines stay.
insert into public.locations (id, name, place_id) values ('00000000-0000-4000-8000-0000000009c1', 'Old System Baseline', 'old-sys');
insert into public.listing_baselines (location_id, fields, updated_by, updated_at) values
  ('00000000-0000-4000-8000-0000000009c1', '{"phone": {"display": "+961 1 000 000"}}', 'system', now() - interval '31 days');
update public.listing_baselines set fields = '{"phone": {"display": "+961 1 555 555"}}', updated_by = 'owner', updated_at = now() - interval '200 days'
 where location_id = '00000000-0000-4000-8000-0000000000c1';
insert into public.listing_changes (id, location_id, field, old_value, new_value, detected_by, state, created_at) values
  ('00000000-0000-4000-8000-0000000009a2', '00000000-0000-4000-8000-0000000009c1', 'website', '{"display": "a"}', '{"display": "b"}',
   'scheduled_check', 'reverting', now() - interval '31 days');
select is((private.profile_daily() ->> 'retired_values')::int >= 2, true, 'the daily job counts the retired values it blanked');
select is((select fields from public.listing_baselines where location_id = '00000000-0000-4000-8000-0000000009c1'), '{}'::jsonb,
  'a baseline Kabsi captured (system) is blanked after 30 days; the row stays');
select is((select fields ->> 'phone' from public.listing_baselines where location_id = '00000000-0000-4000-8000-0000000000c1'),
  '{"display": "+961 1 555 555"}', 'a value the owner kept stays');
select is((select row(old_value, new_value, state)::text from public.listing_changes where id = '00000000-0000-4000-8000-0000000009a2'),
  row(null::jsonb, null::jsonb, 'reverting')::text, 'a retired change loses Google''s values after 30 days, whatever its state');

-- The mock (R-17): a value Kabsi sends is the business's own, so it is no longer Google's update -----------------------------

insert into public.mock_listings (google_location_id, fields) values
  ('locations/mock-send-test', '{"hours": "Mon to Sun 09:00 to 18:00", "merchant": {"hours": "Mon to Sun 09:00 to 22:00"}}');
select is(public.mock_listing_send('locations/mock-send-test', 'hours', '"Mon to Sun 09:00 to 22:00"'),
  '{"hours": "Mon to Sun 09:00 to 22:00", "merchant": {"hours": "Mon to Sun 09:00 to 22:00"}}'::jsonb,
  'the shown value and the business''s own value are the same after a put-back');
select is(public.mock_listing_send('locations/mock-none', 'hours', '"x"'), null::jsonb, 'no mock listing: nothing written');

select * from finish();
rollback;
