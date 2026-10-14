-- P0.3-03: three review risk levels (K-13). reviews.risk replaces the urgent flag everywhere the database read it: the
-- email-link sign-in rule (K-17: the high-risk class signs in), the owner-email producer (jobs_queue.sql) and the ops
-- digest. No database function reads reviews.urgency any more.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

\ir _fixtures.psql

-- Shape.
select has_column('public', 'reviews', 'risk', 'reviews.risk exists');
select has_column('public', 'reviews', 'risk_reasons', 'reviews.risk_reasons exists');
select col_default_is('public', 'reviews', 'risk', 'low'::text, 'a new review starts low until it is classified');
select throws_ok($$ update public.reviews set risk = 'urgent' where id = '00000000-0000-4000-8000-0000000000e1' $$,
  '23514', null, 'only low, medium and high are allowed');
select lives_ok($$ update public.reviews set risk = 'high', risk_reasons = '{legal_threat}' where id = '00000000-0000-4000-8000-0000000000e1' $$,
  'high with its reason keys is stored');

-- K-17: only the high-risk class needs the recipient signed in to approve from an email link.
update public.reviews set risk = 'high' where id = '00000000-0000-4000-8000-0000000000e1';
select is(private.action_link_needs_sign_in('review', '00000000-0000-4000-8000-0000000000e1', 'post'), true, 'high risk: sign in to approve');
select is(private.action_link_needs_sign_in('review', '00000000-0000-4000-8000-0000000000e1', 'skip'), false, 'high risk: skipping needs no sign-in');
update public.reviews set risk = 'medium', urgency = 'urgent' where id = '00000000-0000-4000-8000-0000000000e1';
select is(private.action_link_needs_sign_in('review', '00000000-0000-4000-8000-0000000000e1', 'post'), false,
  'medium risk approves from the link, and the retired urgent flag no longer counts');
update public.reviews set risk = 'low', urgency = 'normal' where id = '00000000-0000-4000-8000-0000000000e1';
select is(private.action_link_needs_sign_in('review', '00000000-0000-4000-8000-0000000000e1', 'post'), false, 'low risk approves from the link');

-- Ops digest: high-risk reviews waiting for owners (no review text).
update public.locations set is_demo = false where id = '00000000-0000-4000-8000-0000000000c1';
update public.reviews set state = 'blocked', risk = 'high' where id = '00000000-0000-4000-8000-0000000000e1';
select ok((public.ops_digest(24) ->> 'high_risk_waiting')::int >= 1, 'the ops digest counts high-risk reviews waiting');
select ok(not (public.ops_digest(24) ? 'urgent_waiting'), 'the ops digest has no urgent count');

-- Nothing in the database reads the retired flag.
select is(
  (select coalesce(array_agg(p.oid::regprocedure::text order by 1), '{}') from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('public', 'private') and p.prosrc ~ '\murgency\M'),
  '{}'::text[], 'no function reads reviews.urgency');

select * from finish();
rollback;
