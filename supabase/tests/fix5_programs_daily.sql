-- Fix 5 (R-158 item 2): kabsi_programs_daily failed on 11 Nov 2026 with 'record "r" is not assigned yet' because the
-- loop variable r shared its name with the alias r of the referral subqueries. This runs private.programs_daily() with
-- a partner referral row, an owner referral row and an expired payout request present, and checks the daily step still
-- attributes a new business with a partner link. It also checks the partner emails have their own job step.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

\ir _fixtures.psql

insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
select '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email, now(), '{}', '{}', now(), now()
from (values ('00000000-0000-4000-8000-0000000050a1'::uuid, 'f5-partner@example.test'),
             ('00000000-0000-4000-8000-0000000050a2'::uuid, 'f5-referred@example.test'),
             ('00000000-0000-4000-8000-0000000050a3'::uuid, 'f5-owner-referred@example.test'),
             ('00000000-0000-4000-8000-0000000050a4'::uuid, 'f5-late@example.test')) as u(id, email);

create function pg_temp.biz(p_id uuid, p_user uuid, p_name text, p_place text) returns uuid language plpgsql as $$
begin
  insert into public.locations (id, name, place_id, created_by, time_zone, signup_source, category_label, area)
  values (p_id, p_name, p_place, p_user, 'UTC', 'self', 'Hair salon', 'Leeds');
  insert into public.location_members (location_id, user_id, role) values (p_id, p_user, 'owner');
  return (select organization_id from public.locations where id = p_id);
end $$;
create function pg_temp.org(p uuid) returns uuid language sql as $$ select organization_id from public.locations where id = p $$;
create function pg_temp.pid() returns uuid language sql security definer as $$
  select id from public.partner_accounts where user_id = '00000000-0000-4000-8000-0000000050a1' $$;
create function pg_temp.code() returns text language sql security definer as $$
  select code from public.partner_accounts where user_id = '00000000-0000-4000-8000-0000000050a1' $$;

select is(public.partner_join('00000000-0000-4000-8000-0000000050a1', jsonb_build_object('name', 'Fix Five', 'email', 'f5-partner@example.test',
  'kind', 'card_seller', 'country', 'GB', 'reach', 'My clients', 'terms_version', '2026-11-10.2')) ->> 'result', 'joined', 'a partner joins');

-- A business referred by the partner: its partner_referrals row is what the daily step's subquery reads.
select pg_temp.biz('00000000-0000-4000-8000-0000000050c2', '00000000-0000-4000-8000-0000000050a2', 'Fix Five Salon', 'f5-place-2');
update public.locations set via_code = pg_temp.code() where id = '00000000-0000-4000-8000-0000000050c2';
select private.partner_attribute('00000000-0000-4000-8000-0000000050c2');
select is((select count(*)::int from public.partner_referrals where organization_id = pg_temp.org('00000000-0000-4000-8000-0000000050c2')), 1,
  'a partner referral row is present');

-- A business referred by an owner link: an owner_referrals row.
select pg_temp.biz('00000000-0000-4000-8000-0000000050c3', '00000000-0000-4000-8000-0000000050a3', 'Fix Five Barber', 'f5-place-3');
insert into public.owner_referrals (referrer_org, organization_id, location_id, code, touched_at)
values (pg_temp.org('00000000-0000-4000-8000-0000000050c2'), pg_temp.org('00000000-0000-4000-8000-0000000050c3'),
        '00000000-0000-4000-8000-0000000050c3', 'R-F5F5F5', now());

-- A new business whose partner link arrives after the sign-up step: the daily step attributes it.
select pg_temp.biz('00000000-0000-4000-8000-0000000050c4', '00000000-0000-4000-8000-0000000050a4', 'Fix Five Gym', 'f5-place-4');
delete from public.partner_referrals where organization_id = pg_temp.org('00000000-0000-4000-8000-0000000050c4');
insert into public.signup_attribution (user_id, via_code, via_at) values ('00000000-0000-4000-8000-0000000050a4', pg_temp.code(), now() - interval '1 hour')
on conflict (user_id) do update set via_code = excluded.via_code, via_at = excluded.via_at;

-- An expired payout method request: the second loop (the one whose variable was renamed) ends it.
insert into public.partner_payout_changes (partner_id, method, last4, channel, phone, expires_at)
values (pg_temp.pid(), 'paypal', 'm.uk', 'whatsapp', '+447700900501', now() - interval '1 minute');

select lives_ok($$ select private.programs_daily() $$, 'programs_daily runs with referral rows present (the 11 Nov failure)');
select is((select count(*)::int from public.partner_payout_changes where partner_id = pg_temp.pid() and state = 'asked'), 0,
  'the expired payout request is ended');
select is((select partner_id from public.partner_referrals where organization_id = pg_temp.org('00000000-0000-4000-8000-0000000050c4')),
  pg_temp.pid(), 'a new business with a partner link is attributed by the daily step');
select is((select count(*)::int from public.partner_referrals where organization_id = pg_temp.org('00000000-0000-4000-8000-0000000050c3')), 0,
  'a business with an owner referral is not given to a partner');
select is((select count(*)::int from public.partner_referrals where organization_id = pg_temp.org('00000000-0000-4000-8000-0000000050c2')), 1,
  'the referred business keeps its one row');

-- No PL/pgSQL function in public or private declares a record named like a table alias it uses.
select is((
  with f as (
    select p.oid::regprocedure::text as fn, p.prosrc from pg_proc p join pg_namespace n on n.oid = p.pronamespace join pg_language l on l.oid = p.prolang
     where l.lanname = 'plpgsql' and n.nspname in ('public', 'private')
  ), recs as (
    select distinct f.fn, f.prosrc, lower(m[1]) as v
      from f, regexp_matches(f.prosrc, '(?:declare|;)\s*([a-z_][a-z0-9_]*)\s+(?:record|[a-z0-9_."]+%rowtype|public\.[a-z0-9_]+)\s*(?::=[^;]*)?;', 'gi') as m
  )
  select coalesce(array_agg(fn || ':' || v order by fn), '{}') from recs
   where prosrc ~* ('(from|join)\s+[a-z0-9_."]+\s+(as\s+)?' || v || '\s+(where|on|join|left|inner|order|group|limit|,|\))')), '{}'::text[],
  'no declared record shares its name with a table alias in the same function');

-- The partner emails have their own job step (Partners 3 LATER row).
delete from public.jobs where kind = 'partner_notices';
select private.produce_jobs();
select is((select count(*)::int from public.jobs where kind = 'partner_notices' and state = 'pending'), 1, 'produce_jobs offers the partner_notices step');
select private.produce_jobs();
select is((select count(*)::int from public.jobs where kind = 'partner_notices' and state = 'pending'), 1, 'and only once while it waits');

select * from finish();
rollback;
