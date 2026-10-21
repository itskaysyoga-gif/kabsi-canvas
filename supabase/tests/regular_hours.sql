-- P0.5-03 part A: the owner's regular opening hours through the one publication pipeline (K-21, K-18, K-38, K-16).
-- An edit is the owner's approval of exactly that week: it becomes the approved fact Google Protection compares, one
-- listing_revert publication carries it after the undo window, the history says the owner did it (owner_edit), the same
-- hours again send nothing, a manager needs the owner's policy, and the owner's own edits never count as Google
-- changing the value again (K-19).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

\ir _fixtures.psql

update public.profile_changes set status = 'expired' where location_id = '00000000-0000-4000-8000-0000000000c1';
insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-0000000000b4', 'authenticated', 'authenticated',
        'hours-manager@example.test', now(), '{}', '{}', now(), now());
insert into public.location_members (location_id, user_id, role)
values ('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000b4', 'manager');
update public.locations set consent_at = now(), access_granted_at = now(), google_account_id = 'accounts/test',
  google_location_id = 'locations/mock-hours', status = 'active'
 where id = '00000000-0000-4000-8000-0000000000c1';

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-4000-8000-0000000000a1", "role": "authenticated"}';
select public.confirm_business_details('00000000-0000-4000-8000-0000000000c1', jsonb_build_object(
  'regular_hours', jsonb_build_object('display', 'Mon 09:00 to 17:00', 'raw', '{"periods": []}'::jsonb)));
reset role;
set local request.jwt.claims = '';

create function pg_temp.raw(p_close int default 18) returns jsonb language sql as $$
  select jsonb_build_object('periods', jsonb_build_array(
    jsonb_build_object('openDay', 'MONDAY', 'openTime', jsonb_build_object('hours', 9), 'closeDay', 'MONDAY', 'closeTime', jsonb_build_object('hours', p_close)),
    jsonb_build_object('openDay', 'TUESDAY', 'openTime', jsonb_build_object('hours', 9), 'closeDay', 'TUESDAY', 'closeTime', jsonb_build_object('hours', p_close))))
$$;
create function pg_temp.apply(p_display text, p_raw jsonb, p_user text default '00000000-0000-4000-8000-0000000000a1',
  p_channel text default 'dashboard') returns jsonb language sql as $$
  select public.apply_regular_hours('00000000-0000-4000-8000-0000000000c1', p_user::uuid, p_channel, p_display, p_raw)
$$;
create function pg_temp.fact() returns public.knowledge_facts language sql as $$
  select * from public.knowledge_facts where location_id = '00000000-0000-4000-8000-0000000000c1'
     and slot = 'profile.regular_hours' and superseded_by is null
$$;

-- Who can run it ----------------------------------------------------------------------------------------------------------

select ok(not has_function_privilege('anon', 'public.apply_regular_hours(uuid,uuid,text,text,jsonb)', 'execute')
      and not has_function_privilege('authenticated', 'public.apply_regular_hours(uuid,uuid,text,text,jsonb)', 'execute')
      and has_function_privilege('service_role', 'public.apply_regular_hours(uuid,uuid,text,text,jsonb)', 'execute'),
  'the owner edit runs for the service role only (the content function builds the value after the owner confirmed it)');

-- Refusals ----------------------------------------------------------------------------------------------------------------

select throws_ok($$ select pg_temp.apply('Mon 09:00 to 18:00, Tue 09:00 to 18:00', pg_temp.raw(), '00000000-0000-4000-8000-0000000000b1') $$,
  'P0001', 'not_member', 'a stranger cannot edit the hours');
select throws_ok($$ select pg_temp.apply('Mon 09:00 to 18:00, Tue 09:00 to 18:00', pg_temp.raw(), '00000000-0000-4000-8000-0000000000b4') $$,
  '42501', 'not_allowed_to_approve', 'a manager cannot, until the owner lets managers approve profile changes (K-16)');
select throws_ok($$ select pg_temp.apply('Mon 09:00 to 18:00', '{"periods": []}'::jsonb) $$, 'P0001', 'bad_hours', 'no periods is refused');
select throws_ok($$ select pg_temp.apply('Mon 09:00 to 18:00', '{"periods": [{"openDay": "FUNDAY", "closeDay": "MONDAY", "openTime": {}, "closeTime": {}}]}'::jsonb) $$,
  'P0001', 'bad_hours', 'an unknown day is refused');
select throws_ok($$ select pg_temp.apply('', pg_temp.raw()) $$, 'P0001', 'bad_hours', 'an empty display is refused');
select throws_ok($$ select pg_temp.apply('x', pg_temp.raw(), '00000000-0000-4000-8000-0000000000a1', 'sms') $$, 'P0001', 'bad_channel', 'only the dashboard and email links approve');
select is((select count(*)::int from public.publications where target_type = 'listing_revert'), 0, 'nothing was published by a refusal');

-- The owner edits the hours -----------------------------------------------------------------------------------------------

select is(pg_temp.apply('Mon 09:00 to 18:00, Tue 09:00 to 18:00', pg_temp.raw()) ->> 'state', 'approved', 'the owner approves a new week');
select is((select row(status, source, value ->> 'display', confirmed_by, version)::text from pg_temp.fact()),
  row('verified', 'owner', 'Mon 09:00 to 18:00, Tue 09:00 to 18:00', '00000000-0000-4000-8000-0000000000a1'::uuid, 2)::text,
  'the new week is the owner-approved fact, version 2 (Google Protection compares against it from now on)');
select is((select value -> 'raw' from pg_temp.fact()), pg_temp.raw(), 'with Google''s own shape kept for the put-back');
select is((select count(*)::int from public.knowledge_facts where location_id = '00000000-0000-4000-8000-0000000000c1'
            and slot = 'profile.regular_hours' and superseded_by is not null), 1, 'the old week is superseded, not deleted');
select is((select row(target_type, state, channel, payload ->> 'field', payload ->> 'value', approved_by)::text from public.publications
            where location_id = '00000000-0000-4000-8000-0000000000c1' and target_type = 'listing_revert'),
  row('listing_revert', 'approved', 'dashboard', 'regular_hours', 'Mon 09:00 to 18:00, Tue 09:00 to 18:00',
      '00000000-0000-4000-8000-0000000000a1'::uuid)::text,
  'one publication through the pipeline, approved by the owner, waiting out the undo window');
select is((select row(c.source, c.status, c.explanation, c.previous_value ->> 'display', c.publication_id = p.id)::text
             from public.profile_changes c join public.publications p on p.target_id = c.id
            where c.location_id = '00000000-0000-4000-8000-0000000000c1' and c.field = 'regular_hours' and c.source = 'owner_edit'),
  row('owner_edit', 'rejected', 'You changed your opening hours in Kabsi.', 'Mon 09:00 to 17:00', true)::text,
  'the history says the owner changed it, with the value before');
select is(pg_temp.apply('Mon 09:00 to 18:00, Tue 09:00 to 18:00', pg_temp.raw()) ->> 'state', 'unchanged', 'the same hours again send nothing');
select is((select count(*)::int from public.publications where target_type = 'listing_revert'), 1, 'still one publication');

-- An open difference is replaced by the owner's edit (A5) ----------------------------------------------------------------

update public.publications set state = 'verified' where target_type = 'listing_revert';
insert into public.profile_changes (location_id, field, previous_value, google_value, source, severity, status, explanation)
values ('00000000-0000-4000-8000-0000000000c1', 'regular_hours', '{"display": "Mon 09:00 to 18:00, Tue 09:00 to 18:00"}',
        '{"display": "Mon 10:00 to 18:00"}', 'google_update', 'urgent', 'awaiting_review', 'Google shows Monday opening at 10:00.');
select is(pg_temp.apply('Mon 09:00 to 19:00, Tue 09:00 to 19:00', pg_temp.raw(19)) ->> 'state', 'approved', 'a new edit while Google differs');
select is((select array_agg(status order by status) from public.profile_changes
            where location_id = '00000000-0000-4000-8000-0000000000c1' and field = 'regular_hours' and source = 'google_update'),
  array['superseded'], 'it supersedes the open Google difference');

-- K-19: the owner's own edits are not "Google changed it again" ------------------------------------------------------------

update public.publications set state = 'verified' where target_type = 'listing_revert';
select is(pg_temp.apply('Mon 09:00 to 20:00, Tue 09:00 to 20:00', pg_temp.raw(20)) ->> 'state', 'approved', 'a third edit in a row is allowed');
update public.publications set state = 'verified' where target_type = 'listing_revert';
insert into public.profile_changes (location_id, field, previous_value, google_value, source, severity, status, explanation)
values ('00000000-0000-4000-8000-0000000000c1', 'regular_hours', '{"display": "Mon 09:00 to 20:00, Tue 09:00 to 20:00"}',
        '{"display": "Mon 11:00 to 20:00"}', 'google_update', 'urgent', 'awaiting_review', 'Google shows Monday opening at 11:00.');
select is(public.decide_profile_change((select id from public.profile_changes where location_id = '00000000-0000-4000-8000-0000000000c1'
            and field = 'regular_hours' and status = 'awaiting_review'), 'reject', '00000000-0000-4000-8000-0000000000a1', 'dashboard') ->> 'state',
  'rejected', 'after three owner edits, Google''s first change is put back normally, not sent to Google support');
select is((select count(*)::int from public.staff_followups where kind = 'google_support' and location_id = '00000000-0000-4000-8000-0000000000c1'), 0,
  'no support follow-up was made');

select * from finish();
rollback;
