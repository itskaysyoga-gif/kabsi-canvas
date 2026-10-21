-- P0.8-06: public.feature_access (K-126): what the plan allows, read from the entitlements. A trial is 14 days of Pro;
-- a paid plan that is not Essentials is Pro; an ended trial, grace and no plan unlock nothing; demo and concierge are
-- Pro; only a member of the business (or staff) may ask.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

\ir _fixtures.psql

insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-0000000008a1', 'authenticated', 'authenticated',
        'feature-owner@example.test', now(), '{}', '{}', now(), now());
insert into public.locations (id, name, place_id, created_by, time_zone, signup_source)
values ('00000000-0000-4000-8000-0000000008c1', 'Feature Shop', 'feature-place-1', '00000000-0000-4000-8000-0000000008a1', 'UTC', 'self');
insert into public.location_members (location_id, user_id, role)
values ('00000000-0000-4000-8000-0000000008c1', '00000000-0000-4000-8000-0000000008a1', 'owner');

create function pg_temp.fa(p_loc uuid) returns jsonb language sql as $$ select public.feature_access(p_loc) $$;

-- No plan: only the review link and QR code run.
select is(pg_temp.fa('00000000-0000-4000-8000-0000000008c1'),
  '{"state": "none", "plan": "none", "essentials": false, "pro": false}'::jsonb, 'no plan unlocks nothing');

-- A trial is 14 days of Pro.
update public.locations set consent_at = now(), access_granted_at = now(), google_account_id = 'accounts/mock',
  google_location_id = 'locations/mock-feature-1' where id = '00000000-0000-4000-8000-0000000008c1';
update public.google_connections set voice_of_merchant = true, access_state = 'granted' where location_id = '00000000-0000-4000-8000-0000000008c1';
select is(public.refresh_location_status('00000000-0000-4000-8000-0000000008c1'), 'active', 'working access starts the trial');
select is(pg_temp.fa('00000000-0000-4000-8000-0000000008c1'),
  '{"state": "trial", "plan": "pro", "essentials": true, "pro": true}'::jsonb, 'a trial has Pro');

-- Grace and an ended trial unlock nothing.
update public.subscriptions s set trial_ends_at = now() - interval '2 days', grace_ends_at = now() + interval '5 days'
  from public.locations l where l.id = '00000000-0000-4000-8000-0000000008c1' and s.organization_id = l.organization_id;
select is(pg_temp.fa('00000000-0000-4000-8000-0000000008c1') ->> 'plan', 'none', 'grace unlocks nothing');
update public.subscriptions s set trial_ends_at = now() - interval '9 days', grace_ends_at = now() - interval '2 days'
  from public.locations l where l.id = '00000000-0000-4000-8000-0000000008c1' and s.organization_id = l.organization_id;
select is(pg_temp.fa('00000000-0000-4000-8000-0000000008c1') ->> 'plan', 'none', 'an ended trial unlocks nothing');

-- A paid plan that is not Essentials is Pro; a lapsed one is not.
insert into public.subscriptions (organization_id, plan, state, period, current_period_end, provider)
select organization_id, 'pro', 'active', 'month', now() + interval '30 days', 'manual' from public.locations where id = '00000000-0000-4000-8000-0000000008c1';
select is(pg_temp.fa('00000000-0000-4000-8000-0000000008c1'),
  '{"state": "paid", "plan": "pro", "essentials": true, "pro": true}'::jsonb, 'a paid plan is Pro');
update public.subscriptions set current_period_end = now() - interval '10 days' where plan = 'pro'
  and organization_id = (select organization_id from public.locations where id = '00000000-0000-4000-8000-0000000008c1');
select is(pg_temp.fa('00000000-0000-4000-8000-0000000008c1') ->> 'pro', 'false', 'a lapsed plan is not Pro');

-- Demo is Pro.
update public.locations set is_demo = true where id = '00000000-0000-4000-8000-0000000008c1';
select is(pg_temp.fa('00000000-0000-4000-8000-0000000008c1') ->> 'plan', 'pro', 'a demo business is Pro');

-- Who may ask.
select tests.act_as('00000000-0000-4000-8000-0000000008a1');
select lives_ok($$ select public.feature_access('00000000-0000-4000-8000-0000000008c1') $$, 'the owner may ask');
select throws_ok($$ select public.feature_access('00000000-0000-4000-8000-0000000000c1') $$, '42501', null, 'another business is refused');
reset role;
select tests.act_as('anon');
select throws_ok($$ select public.feature_access('00000000-0000-4000-8000-0000000008c1') $$, '42501', null, 'anon cannot ask');
reset role;

select * from finish();
rollback;
