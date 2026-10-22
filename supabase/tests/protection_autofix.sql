-- P0.8-04 Protection (K-130): one-tap put-back publishes once through the pipeline, on WhatsApp for the fields WhatsApp
-- may approve; Pro auto-fix only for regular hours, special hours and website, only with the owner's opt-in, only on a
-- VERIFIED profile, never a third time in 30 days, and switched off by policy (Google's rule, K-130 point 5). The rules
-- are tested with the switch turned on inside this transaction only.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

\ir _fixtures.psql

update public.locations set consent_at = now(), access_granted_at = now(), google_account_id = 'accounts/test',
  google_location_id = case when id = '00000000-0000-4000-8000-0000000000c1' then 'locations/mock-victim' else 'locations/mock-other' end,
  status = 'active'
 where id in ('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000c2');
-- A paid plan, so the trial's three-fix cap does not apply to the put-backs below.
insert into public.subscriptions (organization_id, plan, state, period, current_period_end, provider)
select organization_id, 'pro', 'active', 'month', now() + interval '30 days', 'manual'
  from public.locations where id = '00000000-0000-4000-8000-0000000000c1';
-- The plan, fixed for this test: the victim is on Pro, the other business on Essentials (the plan values Creem brings,
-- P0.4-07, are not storable yet). Rolled back with everything else.
create or replace function private.feature_plan(p_location uuid) returns jsonb language sql stable set search_path = '' as $$
  select case when p_location = '00000000-0000-4000-8000-0000000000c1'
    then '{"state": "paid", "plan": "pro", "essentials": true, "pro": true}'::jsonb
    else '{"state": "paid", "plan": "essentials", "essentials": true, "pro": false}'::jsonb end
$$;

-- The owner's confirmed facts (K-18): only these are ever put back.
do $$
declare l record; f text; v_new uuid;
begin
  for l in select * from (values ('00000000-0000-4000-8000-0000000000c1'::uuid, '00000000-0000-4000-8000-0000000000a1'::uuid),
                                 ('00000000-0000-4000-8000-0000000000c2'::uuid, '00000000-0000-4000-8000-0000000000b2'::uuid)) x(id, owner) loop
    foreach f in array array['regular_hours', 'website'] loop
      v_new := gen_random_uuid();
      update public.knowledge_facts set superseded_by = v_new
       where location_id = l.id and slot = 'profile.' || f and superseded_by is null;
      insert into public.knowledge_facts (id, location_id, slot, key, value, status, source, confirmed_by, confirmed_at, version)
      values (v_new, l.id, 'profile.' || f, f, jsonb_build_object('display', 'Owner ' || f), 'verified', 'owner', l.owner, now(), 9);
    end loop;
  end loop;
end $$;

create temp table ch (k text primary key, id uuid);
create function pg_temp.change(p_loc uuid, p_field text) returns uuid language sql as $$
  insert into public.profile_changes (location_id, field, source, severity, status, previous_value, google_value)
  values (p_loc, p_field, 'google_update', 'urgent', 'awaiting_review', jsonb_build_object('display', 'Owner ' || p_field),
          jsonb_build_object('display', 'Google ' || p_field))
  returning id
$$;

-- Privileges --------------------------------------------------------------------------------------------------------
select ok(not has_function_privilege('authenticated', 'public.protection_autofix(uuid,text)', 'execute')
          and has_function_privilege('service_role', 'public.protection_autofix(uuid,text)', 'execute'),
  'auto-fix runs for the service role only');
select ok(not has_table_privilege('authenticated', 'private.google_revert_log', 'select')
          and not has_table_privilege('authenticated', 'private.protection_autofix', 'select'), 'the log and the opt-ins are closed');

-- Off by policy (K-130 point 5) ------------------------------------------------------------------------------------
select is((select value from public.app_settings where key = 'protection_autofix'), 'off', 'auto-fix ships switched off');
insert into ch select 'h1', pg_temp.change('00000000-0000-4000-8000-0000000000c1', 'regular_hours');
select is(public.protection_autofix((select id from ch where k = 'h1'), 'VERIFIED') ->> 'result', 'off', 'off: nothing is put back');
select tests.act_as('00000000-0000-4000-8000-0000000000a1');
select throws_ok($$ select public.set_protection_autofix('00000000-0000-4000-8000-0000000000c1', 'regular_hours', true,
  repeat('Kabsi puts back my approved opening hours. ', 2)) $$, 'P0001', 'autofix_off', 'nobody can switch it on while it is off');
reset role;

update public.app_settings set value = 'on' where key = 'protection_autofix';

-- Who may switch it on ------------------------------------------------------------------------------------------------
select tests.act_as('00000000-0000-4000-8000-0000000000b1');
select throws_ok($$ select public.set_protection_autofix('00000000-0000-4000-8000-0000000000c1', 'regular_hours', true,
  repeat('Kabsi puts back my approved opening hours. ', 2)) $$, '42501', null, 'a stranger cannot');
reset role;
select tests.act_as('00000000-0000-4000-8000-0000000000b2');
select throws_ok($$ select public.set_protection_autofix('00000000-0000-4000-8000-0000000000c2', 'regular_hours', true,
  repeat('Kabsi puts back my approved opening hours. ', 2)) $$, 'P0001', 'pro_required', 'an Essentials business cannot');
reset role;
select tests.act_as('00000000-0000-4000-8000-0000000000a1');
select throws_ok(format($$ select public.set_protection_autofix('00000000-0000-4000-8000-0000000000c1', %L, true,
  repeat('Kabsi puts back my approved value. ', 2)) $$, f), 'P0001', 'not_auto_fix', 'no auto-fix switch for ' || f)
  from unnest(array['name', 'address', 'main_category', 'map_pin', 'phone', 'open_status']) f;
select is(public.set_protection_autofix('00000000-0000-4000-8000-0000000000c1', 'regular_hours', true,
  repeat('Kabsi puts back my approved opening hours. ', 2)) ->> 'state', 'on', 'the Pro owner switches it on for opening hours');
reset role;
select ok((select consent_text like 'Kabsi puts back%' and consented_at is not null from private.protection_autofix
            where location_id = '00000000-0000-4000-8000-0000000000c1' and field = 'regular_hours'), 'the wording and the time are recorded');

-- Never an identity field (a test per field) ------------------------------------------------------------------------
insert into private.protection_autofix (location_id, field, consent_text, consented_by)
values ('00000000-0000-4000-8000-0000000000c1', 'website', 'x', '00000000-0000-4000-8000-0000000000a1');
update public.profile_changes set status = 'superseded', superseded_by = gen_random_uuid()
 where location_id = '00000000-0000-4000-8000-0000000000c1' and status in ('detected', 'awaiting_review') and field <> 'regular_hours';
select is(public.protection_autofix(pg_temp.change('00000000-0000-4000-8000-0000000000c1', f), 'VERIFIED') ->> 'result',
  'not_allowed_field', 'auto-fix never touches ' || f)
  from unnest(array['name', 'address', 'main_category', 'map_pin', 'phone', 'open_status']) f;
select throws_ok(format($$ select public.decide_profile_change(%L, 'reject', '00000000-0000-4000-8000-0000000000a1', 'auto_fix') $$, id),
  'P0001', 'not_auto_fix', 'the pipeline refuses auto_fix for ' || field)
  from public.profile_changes where location_id = '00000000-0000-4000-8000-0000000000c1'
   and field in ('name', 'address', 'main_category', 'map_pin', 'phone', 'open_status') and status = 'awaiting_review';
select throws_ok(format($$ select public.approve_publication('listing_revert', %L, '{}'::jsonb, '00000000-0000-4000-8000-0000000000a1', 'auto_fix') $$, id),
  'P0001', 'not_auto_fix', 'approve_publication refuses auto_fix for ' || field)
  from public.profile_changes where location_id = '00000000-0000-4000-8000-0000000000c1'
   and field in ('name', 'address', 'main_category', 'map_pin', 'phone', 'open_status') and status = 'awaiting_review';

-- Never on an unverified profile ---------------------------------------------------------------------------------------
select is(public.protection_autofix((select id from ch where k = 'h1'), 'UNVERIFIED') ->> 'result', 'not_verified', 'an unverified profile is never patched');
select is(public.protection_autofix((select id from ch where k = 'h1'), null) ->> 'result', 'not_verified', 'nor one whose state is unknown');
select is((select status from public.profile_changes where id = (select id from ch where k = 'h1')), 'awaiting_review', 'the change waits for the owner');

-- Pro with the opt-in: fixed through the pipeline, recorded as auto-fix ------------------------------------------------
select is(public.protection_autofix((select id from ch where k = 'h1'), 'VERIFIED') ->> 'result', 'fixed', 'a Pro business with the opt-in gets the put-back');
select is((select channel || '/' || state from public.publications where target_id = (select id from ch where k = 'h1')),
  'auto_fix/approved', 'one publication, its approval recorded as auto-fix');
select is((select count(*) from public.audit_events where action = 'approval' and channel = 'auto_fix'
            and object_id = (select id::text from ch where k = 'h1')), 1::bigint, 'the audit log says auto-fix');
select is((select count from private.google_revert_log where location_id = '00000000-0000-4000-8000-0000000000c1' and field = 'regular_hours'),
  1, 'the revert log counts it');

-- Essentials with an opt-in row (as if a plan lapsed): never auto-fixed --------------------------------------------------
insert into private.protection_autofix (location_id, field, consent_text, consented_by)
values ('00000000-0000-4000-8000-0000000000c2', 'regular_hours', 'x', '00000000-0000-4000-8000-0000000000b2');
select is(public.protection_autofix(pg_temp.change('00000000-0000-4000-8000-0000000000c2', 'regular_hours'), 'VERIFIED') ->> 'result',
  'not_pro', 'an Essentials business gets no auto-fix');

-- Two in 30 days stop it: the third is not fixed, the field needs review, the change waits for the owner ---------------
insert into ch select 'h2', pg_temp.change('00000000-0000-4000-8000-0000000000c1', 'regular_hours');
select is(public.protection_autofix((select id from ch where k = 'h2'), 'VERIFIED') ->> 'result', 'fixed', 'the second is fixed');
insert into ch select 'h3', pg_temp.change('00000000-0000-4000-8000-0000000000c1', 'regular_hours');
select is(public.protection_autofix((select id from ch where k = 'h3'), 'VERIFIED') ->> 'result', 'limit', 'the third in 30 days is not');
select is((select state from private.protection_autofix where location_id = '00000000-0000-4000-8000-0000000000c1' and field = 'regular_hours'),
  'needs_review', 'auto-fix stops for the field and it needs review');
select is((select status from public.profile_changes where id = (select id from ch where k = 'h3')), 'awaiting_review',
  'the owner decides the third');
select is((select count(*) from public.publications where target_id = (select id from ch where k = 'h3')), 0::bigint, 'nothing was sent');

-- One-tap put-back from the app publishes once -------------------------------------------------------------------------
insert into ch select 'w1', pg_temp.change('00000000-0000-4000-8000-0000000000c1', 'website');
select is(public.decide_profile_change((select id from ch where k = 'w1'), 'reject', '00000000-0000-4000-8000-0000000000a1', 'dashboard') ->> 'state',
  'rejected', 'Keep my information puts the website back');
select throws_ok(format($$ select public.decide_profile_change(%L, 'reject', '00000000-0000-4000-8000-0000000000a1', 'dashboard') $$,
  (select id from ch where k = 'w1')), 'P0001', 'already_decided', 'a second tap does nothing');
select is((select count(*) from public.publications where target_id = (select id from ch where k = 'w1')), 1::bigint, 'one publication');

-- Put-back on WhatsApp for a field WhatsApp may approve, through the same guards --------------------------------------
insert into public.whatsapp_optins (user_id, phone, state, consent_text, verified_at)
values ('00000000-0000-4000-8000-0000000000a1', '+15550003333', 'active', 'x', now());
insert into ch select 'w2', pg_temp.change('00000000-0000-4000-8000-0000000000c1', 'website');
create temp table tok as select public.whatsapp_action_create('00000000-0000-4000-8000-0000000000a1', 'listing_revert', (select id from ch where k = 'w2')) ->> 'token' as t;
select is(public.whatsapp_approve((select t from tok), '+15550003333') ->> 'result', 'approved', 'Put it back on WhatsApp');
select is((select channel from public.publications where target_id = (select id from ch where k = 'w2')), 'whatsapp', 'with the channel whatsapp');
select is((select status from public.profile_changes where id = (select id from ch where k = 'w2')), 'rejected', 'decided as the owner''s put-back');
select is(public.whatsapp_action_create('00000000-0000-4000-8000-0000000000a1', 'listing_revert',
  (select id from public.profile_changes where location_id = '00000000-0000-4000-8000-0000000000c1' and field = 'phone' and status = 'awaiting_review' limit 1)) ->> 'reason',
  'identity_field', 'no WhatsApp put-back for the phone');

select * from finish();
rollback;
