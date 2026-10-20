-- P0.4-06: the trial and the one entitlements function (K-101, K-94, K-48, K-100, R-24). The trial starts only at
-- working access to a verified profile; never for a concierge, demo or not-eligible business; one trial per place ID
-- and per Google account; the three caps; grace from day 14 to 21 (nothing publishes, Home says what waits); day 21
-- ends the trial and removes access through the disconnect job when trial_removal is on; every gated feature reads
-- entitlements and none reads plans or plans_v2 itself.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

\ir _fixtures.psql

-- Owners (all invented). T1 signs in with a Gmail address that has dots and a +tag; T3 is the same Gmail account
-- written another way; T4 and T5 are ordinary owners; T6 signs in with Google.
insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
select '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email, now(), '{}', '{}', now(), now()
from (values ('00000000-0000-4000-8000-0000000007a1'::uuid, 'jane.doe+shop@gmail.com'),
             ('00000000-0000-4000-8000-0000000007a3'::uuid, 'janedoe@googlemail.com'),
             ('00000000-0000-4000-8000-0000000007a4'::uuid, 'owner-four@example.test'),
             ('00000000-0000-4000-8000-0000000007a5'::uuid, 'owner-five@example.test'),
             ('00000000-0000-4000-8000-0000000007a6'::uuid, 'owner-six@example.test'),
             ('00000000-0000-4000-8000-0000000007a7'::uuid, 'owner-seven@example.test')) as u(id, email);
insert into auth.identities (id, user_id, provider, provider_id, identity_data, created_at, updated_at)
values (gen_random_uuid(), '00000000-0000-4000-8000-0000000007a6', 'google', 'google-sub-6',
        '{"sub": "google-sub-6", "email": "owner-six@example.test"}', now(), now());

-- A business for each owner, created the way start_location does (created_by makes the organisation).
create function pg_temp.biz(p_n int, p_owner uuid, p_place text) returns uuid language plpgsql as $$
declare v uuid := ('00000000-0000-4000-8000-0000000007c' || p_n)::uuid;
begin
  insert into public.locations (id, name, place_id, created_by, time_zone, signup_source)
  values (v, 'Trial Shop ' || p_n, p_place, p_owner, 'UTC', 'self');
  insert into public.location_members (location_id, user_id, role) values (v, p_owner, 'owner');
  return v;
end $$;
-- Working access: consent, Kabsi is Manager, Google's location id known (google_connections follows by trigger).
create function pg_temp.grant_access(p_loc uuid, p_verified boolean) returns void language plpgsql as $$
begin
  update public.locations set consent_at = now(), access_granted_at = now(),
    google_account_id = 'accounts/mock', google_location_id = 'locations/mock-' || left(p_loc::text, 8) || right(p_loc::text, 4)
   where id = p_loc;
  update public.google_connections set voice_of_merchant = p_verified where location_id = p_loc;
end $$;
create function pg_temp.ent(p_loc uuid) returns jsonb language sql as $$ select private.entitlements(null, p_loc) $$;

select pg_temp.biz(1, '00000000-0000-4000-8000-0000000007a1', 'trial-place-1');

-- 1. The clock starts only at working access to a verified profile ---------------------------------------------------
select is(private.start_trial('00000000-0000-4000-8000-0000000007c1'), null, 'no trial before Google access');
select is(pg_temp.ent('00000000-0000-4000-8000-0000000007c1') ->> 'state', 'none', 'before access the state is none');
select is(public.refresh_location_status('00000000-0000-4000-8000-0000000007c1'), 'onboarding', 'and the business is not active');

update public.locations set consent_at = now() where id = '00000000-0000-4000-8000-0000000007c1';
select is(public.refresh_location_status('00000000-0000-4000-8000-0000000007c1'), 'access_pending', 'consent alone starts nothing');
select is((select count(*)::int from public.subscriptions s join public.locations l on l.organization_id = s.organization_id
            where l.id = '00000000-0000-4000-8000-0000000007c1'), 0, 'no trial while access is pending');

select pg_temp.grant_access('00000000-0000-4000-8000-0000000007c1', null);
select is(private.start_trial('00000000-0000-4000-8000-0000000007c1'), null, 'access to a profile not known to be verified starts no trial');
update public.google_connections set voice_of_merchant = false where location_id = '00000000-0000-4000-8000-0000000007c1';
select is(public.refresh_location_status('00000000-0000-4000-8000-0000000007c1'), 'awaiting_payment', 'an unverified profile is not eligible: no trial');
select is(pg_temp.ent('00000000-0000-4000-8000-0000000007c1') ->> 'state', 'none', 'not eligible: still none');

update public.google_connections set voice_of_merchant = true where location_id = '00000000-0000-4000-8000-0000000007c1';
update public.google_connections set access_state = 'error' where location_id = '00000000-0000-4000-8000-0000000007c1';
select is(private.start_trial('00000000-0000-4000-8000-0000000007c1'), null, 'access in error is not working access');
update public.google_connections set access_state = 'granted' where location_id = '00000000-0000-4000-8000-0000000007c1';

select is(public.refresh_location_status('00000000-0000-4000-8000-0000000007c1'), 'active', 'working access to a verified profile starts the trial');
select is(pg_temp.ent('00000000-0000-4000-8000-0000000007c1') ->> 'state', 'trial', 'the state is trial');
select ok((select s.trial_started_at between now() - interval '1 minute' and now() and s.state = 'trialing'
             and s.trial_ends_at = public.trial_end_at(s.trial_started_at, 'UTC', 14)
             and s.grace_ends_at = s.trial_ends_at + interval '7 days'
           from public.subscriptions s join public.locations l on l.organization_id = s.organization_id
          where l.id = '00000000-0000-4000-8000-0000000007c1'), '14 days from now, then 7 days of grace, on the organisation');
select is(pg_temp.ent('00000000-0000-4000-8000-0000000007c1') - 'organization_id' - 'ends_at' - 'trial',
  '{"state": "trial", "watch": true, "draft": true, "publish": true, "trial_used": true,
    "caps": {"profile_fixes": {"limit": 3, "used": 0}, "backlog_drafts": {"limit": 10}, "ai_generations": {"limit": 100, "used": 0}}}'::jsonb,
  'a trial watches, drafts and publishes, with the three caps');
select is((select count(*)::int from public.audit_events where action = 'trial_started' and location_id = '00000000-0000-4000-8000-0000000007c1'), 1,
  'the start is in the audit log');

-- 2. One trial per organisation, per place ID and per Google account -------------------------------------------------
select is(private.start_trial('00000000-0000-4000-8000-0000000007c1'), null, 'a second start does nothing');
select is((select count(*)::int from public.subscriptions s join public.locations l on l.organization_id = s.organization_id
            where l.id = '00000000-0000-4000-8000-0000000007c1'), 1, 'still one trial');

-- The listing comes back under a new owner: straight to a plan, no second trial.
update public.locations set place_id = null where id = '00000000-0000-4000-8000-0000000007c1';
select pg_temp.biz(4, '00000000-0000-4000-8000-0000000007a4', 'trial-place-1');
select pg_temp.grant_access('00000000-0000-4000-8000-0000000007c4', true);
select is(public.refresh_location_status('00000000-0000-4000-8000-0000000007c4'), 'awaiting_payment', 'the same place ID gets no second trial');
select is(pg_temp.ent('00000000-0000-4000-8000-0000000007c4') ->> 'trial_used', 'true', 'and the plan screen knows the trial was used');
update public.locations set place_id = null where id = '00000000-0000-4000-8000-0000000007c4';
update public.locations set place_id = 'trial-place-1' where id = '00000000-0000-4000-8000-0000000007c1';

-- The same Gmail account (dots, +tag and googlemail.com folded) with another business: no second trial.
select pg_temp.biz(3, '00000000-0000-4000-8000-0000000007a3', 'trial-place-3');
select pg_temp.grant_access('00000000-0000-4000-8000-0000000007c3', true);
select is(private.email_account_key('Jane.Doe+shop@gmail.com'), private.email_account_key('janedoe@googlemail.com'), 'one Gmail account is one key');
select is(private.email_account_key('boss+2@shop.example'), 'email:boss@shop.example', 'a +tag is the same address');
select is(private.start_trial('00000000-0000-4000-8000-0000000007c3'), null, 'the same Google account gets no second trial');
select is(pg_temp.ent('00000000-0000-4000-8000-0000000007c3') ->> 'state', 'none', 'its business has no trial');

-- A Google sign-in is a key too.
select pg_temp.biz(6, '00000000-0000-4000-8000-0000000007a6', 'trial-place-6');
select pg_temp.grant_access('00000000-0000-4000-8000-0000000007c6', true);
select isnt(private.start_trial('00000000-0000-4000-8000-0000000007c6'), null, 'a Google sign-in owner gets a trial');
select ok(exists (select 1 from public.trial_accounts where account_key = 'google:google-sub-6'), 'recorded under the Google account');

-- 3. Concierge, demo and partner-covered businesses never start a trial --------------------------------------------------
select pg_temp.biz(5, '00000000-0000-4000-8000-0000000007a5', 'trial-place-5');
-- An early-access business: a person works its profile, its Google id is a concierge one.
update public.locations set concierge = true, consent_at = now(), access_granted_at = now(),
  google_location_id = 'locations/concierge-7c5' where id = '00000000-0000-4000-8000-0000000007c5';
update public.google_connections set access_state = 'granted', voice_of_merchant = true
 where location_id = '00000000-0000-4000-8000-0000000007c5';
select is(private.start_trial('00000000-0000-4000-8000-0000000007c5'), null, 'a concierge business never starts a trial');
update public.locations set concierge = false, google_location_id = 'locations/mock-7c5'
 where id = '00000000-0000-4000-8000-0000000007c5';
update public.google_connections set access_state = 'granted', voice_of_merchant = true
 where location_id = '00000000-0000-4000-8000-0000000007c5';
update public.locations set is_demo = true where id = '00000000-0000-4000-8000-0000000007c5';
select is(private.start_trial('00000000-0000-4000-8000-0000000007c5'), null, 'a demo business never starts a trial');
update public.locations set is_demo = false where id = '00000000-0000-4000-8000-0000000007c5';
select is(private.start_trial('00000000-0000-4000-8000-0000000000c1'), null, 'a partner-covered business never starts a trial');

-- 4. The caps ---------------------------------------------------------------------------------------------------------------
select ok(private.trial_take('00000000-0000-4000-8000-0000000007c1', 'profile_fix', 'fix-1'), 'first profile fix');
select ok(private.trial_take('00000000-0000-4000-8000-0000000007c1', 'profile_fix', 'fix-2'), 'second profile fix');
select ok(private.trial_take('00000000-0000-4000-8000-0000000007c1', 'profile_fix', 'fix-1'), 'the same fix again counts once');
select ok(private.trial_take('00000000-0000-4000-8000-0000000007c1', 'profile_fix', 'fix-3'), 'third profile fix');
select ok(not private.trial_take('00000000-0000-4000-8000-0000000007c1', 'profile_fix', 'fix-4'), 'the fourth profile fix waits for a plan');
select is((pg_temp.ent('00000000-0000-4000-8000-0000000007c1') #>> '{caps,profile_fixes,used}')::int, 3, 'three fixes used');
select ok(private.trial_take('00000000-0000-4000-8000-0000000007c6', 'profile_fix', 'fix-1'), 'another organisation has its own three');
select ok(private.trial_take('00000000-0000-4000-8000-0000000000c1', 'profile_fix', 'any'), 'a business not on a trial is not capped');

insert into public.ai_usage (location_id, day, generations) values ('00000000-0000-4000-8000-0000000007c1', (now() at time zone 'utc')::date, 59);
select is(public.ai_budget_take('00000000-0000-4000-8000-0000000007c1'), 'ok', 'drafting under the trial cap');
insert into public.app_settings (key, value) values ('ai_daily_cap_business', '1000') on conflict (key) do update set value = '1000';
update public.ai_usage set generations = 99 where location_id = '00000000-0000-4000-8000-0000000007c1';
select is(public.ai_budget_take('00000000-0000-4000-8000-0000000007c1'), 'ok', 'the 100th generation is allowed');
select is(public.ai_budget_take('00000000-0000-4000-8000-0000000007c1'), 'trial', 'past 100 generations the trial stops drafting (silent cap)');
select is((pg_temp.ent('00000000-0000-4000-8000-0000000007c1') #>> '{caps,ai_generations,used}')::int, 100, 'and counts 100');
select is(public.ai_budget_take('00000000-0000-4000-8000-0000000000c1'), 'ok', 'a business with a plan is not on the trial cap');
select is((pg_temp.ent('00000000-0000-4000-8000-0000000007c1') #>> '{caps,backlog_drafts,limit}')::int, 10, 'the backlog cap is 10');
update public.ai_usage set generations = 0 where location_id = '00000000-0000-4000-8000-0000000007c1';

-- 5. Grace, day 14 to 21: watching and drafting go on, nothing publishes, Home says what waits --------------------------------
insert into public.reviews (id, location_id, google_review_id, reviewer_name, star_rating, comment, review_created_at, state, risk)
values ('00000000-0000-4000-8000-0000000007e1', '00000000-0000-4000-8000-0000000007c1', 'trial-review-1', 'Invented Reviewer', 5,
        'Lovely', now(), 'drafted', 'low');
update public.subscriptions s set trial_ends_at = now() - interval '1 day', grace_ends_at = now() + interval '6 days'
  from public.locations l where l.id = '00000000-0000-4000-8000-0000000007c1' and s.organization_id = l.organization_id;
select is(pg_temp.ent('00000000-0000-4000-8000-0000000007c1') ->> 'state', 'grace', 'after day 14 the state is grace');
select is(pg_temp.ent('00000000-0000-4000-8000-0000000007c1') ->> 'publish', 'false', 'grace publishes nothing');
select is(pg_temp.ent('00000000-0000-4000-8000-0000000007c1') ->> 'draft', 'true', 'grace keeps drafting');
select is(public.refresh_location_status('00000000-0000-4000-8000-0000000007c1'), 'active', 'grace keeps watching');
select is(public.ai_budget_take('00000000-0000-4000-8000-0000000007c1'), 'ok', 'grace drafts');
select throws_ok($$ select public.approve_publication('review_reply', '00000000-0000-4000-8000-0000000007e1',
    '{"text": "Thank you"}'::jsonb, '00000000-0000-4000-8000-0000000007a1', 'dashboard') $$,
  'P0001', 'plan_required', 'an approval in grace is refused: nothing publishes');
select is((select state from public.reviews where id = '00000000-0000-4000-8000-0000000007e1'), 'drafted', 'the reply stays ready');
select is(private.detect_expiring_plan('00000000-0000-4000-8000-0000000007c1'), 1, 'Home gets the grace card');
select is((select title from public.tasks where location_id = '00000000-0000-4000-8000-0000000007c1' and kind = 'billing' and state = 'open'),
  'Your free trial has ended', 'it says the trial has ended');
select matches((select why from public.tasks where location_id = '00000000-0000-4000-8000-0000000007c1' and kind = 'billing' and state = 'open'),
  '^1 reply ready\. Kabsi keeps watching and drafting for 6 more days, but nothing is published until you subscribe\.$',
  'and what is waiting');

-- During the trial the same approval goes through.
update public.subscriptions s set trial_ends_at = now() + interval '3 days', grace_ends_at = now() + interval '10 days'
  from public.locations l where l.id = '00000000-0000-4000-8000-0000000007c1' and s.organization_id = l.organization_id;
select is(private.detect_expiring_plan('00000000-0000-4000-8000-0000000007c1'), 0, 'three days before the end: the same card, updated');
select is((select title from public.tasks where location_id = '00000000-0000-4000-8000-0000000007c1' and kind = 'billing' and state = 'open'),
  'Your free trial ends in 3 days', 'it counts the days left');
select is(public.approve_publication('review_reply', '00000000-0000-4000-8000-0000000007e1',
    '{"text": "Thank you"}'::jsonb, '00000000-0000-4000-8000-0000000007a1', 'dashboard') ->> 'state', 'approved',
  'during the trial an approval publishes through the pipeline');

-- 6. Day 21 -----------------------------------------------------------------------------------------------------------------
update public.subscriptions s set trial_ends_at = now() - interval '8 days', grace_ends_at = now() - interval '1 hour'
  from public.locations l where l.id = '00000000-0000-4000-8000-0000000007c1' and s.organization_id = l.organization_id;
select is(pg_temp.ent('00000000-0000-4000-8000-0000000007c1') ->> 'state', 'ended', 'after day 21 the trial has ended');
select is(pg_temp.ent('00000000-0000-4000-8000-0000000007c1') ->> 'watch', 'false', 'and nothing is watched');
select is((select value from public.app_settings where key = 'trial_removal'), 'off', 'removal ships off until Creem is live');
select ok(private.trial_sweep() >= 1, 'the sweep ends the trial');
select is((select s.state from public.subscriptions s join public.locations l on l.organization_id = s.organization_id
            where l.id = '00000000-0000-4000-8000-0000000007c1'), 'expired', 'the trial is expired');
select is((select status from public.locations where id = '00000000-0000-4000-8000-0000000007c1'), 'awaiting_payment',
  'the business stops being active');
select is((select disconnect_requested_at from public.locations where id = '00000000-0000-4000-8000-0000000007c1'), null,
  'with removal off, access stays and staff are told');

update public.app_settings set value = 'on' where key = 'trial_removal';
update public.subscriptions s set trial_ends_at = now() - interval '8 days', grace_ends_at = now() - interval '1 hour'
  from public.locations l where l.id = '00000000-0000-4000-8000-0000000007c6' and s.organization_id = l.organization_id;
select ok(private.trial_sweep() >= 1, 'with removal on, the sweep ends the next trial');
select isnt((select disconnect_requested_at from public.locations where id = '00000000-0000-4000-8000-0000000007c6'), null,
  'day 21 removes Kabsi''s access');
select is((select status from public.locations where id = '00000000-0000-4000-8000-0000000007c6'), 'paused', 'the business is paused');
select is((select count(*)::int from public.jobs where kind = 'disconnect' and location_id = '00000000-0000-4000-8000-0000000007c6'), 1,
  'through the disconnect job, which tells the owner');
select is((select count(*)::int from public.audit_events where action = 'trial_access_removed' and location_id = '00000000-0000-4000-8000-0000000007c6'), 1,
  'recorded as the trial removal');
select is(private.trial_sweep(), 0, 'the sweep runs once per trial');

-- A business that chose a plan in grace keeps everything.
select pg_temp.biz(7, '00000000-0000-4000-8000-0000000007a7', 'trial-place-7');
select pg_temp.grant_access('00000000-0000-4000-8000-0000000007c7', true);
select isnt(private.start_trial('00000000-0000-4000-8000-0000000007c7'), null, 'a seventh owner starts a trial');
update public.subscriptions s set trial_ends_at = now() - interval '8 days', grace_ends_at = now() - interval '1 hour'
  from public.locations l where l.id = '00000000-0000-4000-8000-0000000007c7' and s.organization_id = l.organization_id;
insert into public.subscriptions (organization_id, plan, state, period, current_period_end, provider)
select organization_id, 'pro', 'active', 'month', now() + interval '30 days', 'manual' from public.locations where id = '00000000-0000-4000-8000-0000000007c7';
select is(pg_temp.ent('00000000-0000-4000-8000-0000000007c7') ->> 'state', 'paid', 'a paid plan wins over an ended trial');
select is(pg_temp.ent('00000000-0000-4000-8000-0000000007c7') -> 'caps', 'null'::jsonb, 'a paid plan has no caps');
select ok(private.trial_sweep() >= 1, 'the sweep closes the old trial');
select is((select disconnect_requested_at from public.locations where id = '00000000-0000-4000-8000-0000000007c7'), null,
  'and leaves a paying business connected');
update public.app_settings set value = 'off' where key = 'trial_removal';

-- 7. Who may read entitlements -------------------------------------------------------------------------------------------
select tests.act_as('00000000-0000-4000-8000-0000000007a7');
select is(public.entitlements(null, '00000000-0000-4000-8000-0000000007c7') ->> 'state', 'paid', 'the owner reads their own');
select throws_ok($$ select public.entitlements(null, '00000000-0000-4000-8000-0000000007c1') $$, '42501', null,
  'an owner never reads another organisation''s');
select tests.act_as('anon');
select throws_ok($$ select public.entitlements(null, '00000000-0000-4000-8000-0000000007c1') $$, '42501', null, 'anon cannot call it');
reset role;
select is((select count(*)::int from pg_proc p where p.pronamespace = 'private'::regnamespace and p.proname = 'entitlements'
            and has_function_privilege('authenticated', p.oid, 'execute')), 0, 'the private function is not callable from the API');

-- 8. Every gated feature reads entitlements, and none reads plans or plans_v2 itself ----------------------------------------
select is(
  (select array_agg(p.oid::regprocedure::text order by 1) from pg_proc p
    where p.oid in ('public.refresh_location_status(uuid)'::regprocedure,
                    'public.approve_publication(text, uuid, jsonb, uuid, text, integer)'::regprocedure,
                    'public.ai_budget_take(uuid)'::regprocedure,
                    'private.detect_review_tasks(uuid)'::regprocedure,
                    'private.detect_expiring_plan(uuid)'::regprocedure,
                    'public.plan_summary(uuid)'::regprocedure,
                    'private.trial_take(uuid, text, text)'::regprocedure,
                    'private.trial_sweep()'::regprocedure)
      and pg_get_functiondef(p.oid) !~ '(private\.entitlements|private\.entitled)\('),
  null, 'every gated feature asks entitlements');
select is(
  (select array_agg(p.oid::regprocedure::text order by 1) from pg_proc p
    where p.oid in ('public.refresh_location_status(uuid)'::regprocedure,
                    'public.approve_publication(text, uuid, jsonb, uuid, text, integer)'::regprocedure,
                    'public.ai_budget_take(uuid)'::regprocedure,
                    'private.detect_review_tasks(uuid)'::regprocedure,
                    'private.detect_expiring_plan(uuid)'::regprocedure,
                    'private.trial_take(uuid, text, text)'::regprocedure,
                    'private.trial_sweep()'::regprocedure,
                    'public.grant_trial_if_eligible(uuid, boolean, integer)'::regprocedure)
      and pg_get_functiondef(p.oid) ~ '(public\.plans\y|plans_v2)'),
  null, 'no gated feature reads plans or plans_v2 itself');
select ok(pg_get_functiondef('private.start_trial(uuid, integer)'::regprocedure) !~ 'plans_v2',
  'the trial no longer waits for the plans_v2 switch');

select * from finish();
rollback;
