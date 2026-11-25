-- PILOT-READY (R-165): the WhatsApp replay harness keeps its own fictional people and its own phone locks.
-- 1. qa_ensure_whatsapp_personas(): the reset step of every scenario calls it, so the fictional phones (+1 212 555 0101 to 0105)
--    are bound again to the two demo businesses whenever someone has removed them (Lane R found them gone on 25 Nov 2026 and every
--    step answered needs_account). It is the seed of tests/e2e/seed/qa-whatsapp-personas.sql, safe to run again, and it refuses
--    to run unless both businesses are demo businesses (mock Google, R-17).
-- 2. qa_replay_lock(): two scenarios on the same phone spoiled each other, so a scenario takes its phones for a few minutes and a
--    second scenario that needs any of them is refused until the first ends. Additive only.

create table if not exists public.qa_replay_locks (
  phone text primary key,
  scenario text not null,
  locked_until timestamptz not null
);
alter table public.qa_replay_locks enable row level security;
revoke all on public.qa_replay_locks from public, anon, authenticated;

create or replace function public.qa_ensure_whatsapp_personas() returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_cafe constant uuid := 'de300000-0000-4000-8000-000000000001';
  v_salon constant uuid := 'de300000-0000-4000-8000-000000000002';
  p record;
begin
  if (select count(*) from public.locations where id in (v_cafe, v_salon) and is_demo) <> 2 then
    raise exception 'the two demo businesses must exist and be demo businesses';
  end if;
  for p in select * from (values
    ('de300000-0000-4000-8000-0000000000a1'::uuid, 'qa-wa-owner@test.local'),
    ('de300000-0000-4000-8000-0000000000a2'::uuid, 'qa-wa-manager@test.local'),
    ('de300000-0000-4000-8000-0000000000a3'::uuid, 'qa-wa-two@test.local'),
    ('de300000-0000-4000-8000-0000000000a4'::uuid, 'qa-wa-multi@test.local'),
    ('de300000-0000-4000-8000-0000000000a5'::uuid, 'qa-wa-staff@test.local')
  ) as t(id, email) loop
    insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, is_anonymous,
      confirmation_token, recovery_token, email_change, email_change_token_new, email_change_token_current, phone_change, phone_change_token, reauthentication_token)
    values (p.id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', p.email, now(),
      '{"provider":"email","providers":["email"]}', '{"qa":"qa-1"}', now(), now(), false, '', '', '', '', '', '', '', '')
    on conflict (id) do nothing;
  end loop;

  insert into public.location_members (location_id, user_id, role) values
    (v_cafe, 'de300000-0000-4000-8000-0000000000a1', 'owner'),
    (v_cafe, 'de300000-0000-4000-8000-0000000000a2', 'manager'),
    (v_salon, 'de300000-0000-4000-8000-0000000000a3', 'owner'),
    (v_cafe, 'de300000-0000-4000-8000-0000000000a4', 'owner'),
    (v_salon, 'de300000-0000-4000-8000-0000000000a4', 'owner'),
    (v_cafe, 'de300000-0000-4000-8000-0000000000a5', 'staff')
  on conflict do nothing;

  insert into public.whatsapp_optins (user_id, phone, state, consent_text, requested_at, verified_at, review_alerts)
  select ph.id, ph.phone, 'active', 'QA 1 fictional person (replay harness)', now(), now(), false
  from (values
    ('de300000-0000-4000-8000-0000000000a1'::uuid, '+12125550101'), ('de300000-0000-4000-8000-0000000000a2'::uuid, '+12125550102'),
    ('de300000-0000-4000-8000-0000000000a3'::uuid, '+12125550103'), ('de300000-0000-4000-8000-0000000000a4'::uuid, '+12125550104'),
    ('de300000-0000-4000-8000-0000000000a5'::uuid, '+12125550105')) as ph(id, phone)
  join auth.users u on u.id = ph.id
  on conflict (user_id) do nothing;

  insert into public.phone_roles (phone, role, user_id, location_id, partner_id, source)
  select v.* from (values
    ('+12125550101', 'owner', 'de300000-0000-4000-8000-0000000000a1'::uuid, v_cafe, null::uuid, 'code'),
    ('+12125550102', 'manager', 'de300000-0000-4000-8000-0000000000a2'::uuid, v_cafe, null, 'code'),
    ('+12125550103', 'owner', 'de300000-0000-4000-8000-0000000000a3'::uuid, v_salon, null, 'code'),
    ('+12125550103', 'partner', null, null, 'de300000-0000-4000-8000-0000000000b1'::uuid, 'partner_code'),
    ('+12125550104', 'owner', 'de300000-0000-4000-8000-0000000000a4'::uuid, v_cafe, null, 'code'),
    ('+12125550104', 'owner', 'de300000-0000-4000-8000-0000000000a4'::uuid, v_salon, null, 'code'),
    ('+12125550105', 'staff', 'de300000-0000-4000-8000-0000000000a5'::uuid, v_cafe, null, 'code')
  ) as v(phone, role, user_id, location_id, partner_id, source)
  where not exists (select 1 from public.phone_roles r where r.phone = v.phone and r.role = v.role and r.revoked_at is null
    and coalesce(r.location_id, '00000000-0000-0000-0000-000000000000') = coalesce(v.location_id, '00000000-0000-0000-0000-000000000000'));
end $$;

-- All or nothing: null when the scenario now holds every phone, else the first phone another scenario still holds.
create or replace function public.qa_replay_lock(p_phones text[], p_scenario text, p_seconds int default 300) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_busy text;
begin
  if exists (select 1 from unnest(p_phones) x where x !~ '^\+121255501[0-9]{2}$') then
    return 'not a fictional phone';
  end if;
  perform pg_advisory_xact_lock(hashtext('qa_replay_lock'));
  delete from public.qa_replay_locks where locked_until < now();
  select phone into v_busy from public.qa_replay_locks where phone = any (p_phones) and scenario <> p_scenario order by phone limit 1;
  if v_busy is not null then
    return v_busy;
  end if;
  insert into public.qa_replay_locks (phone, scenario, locked_until)
  select unnest(p_phones), p_scenario, now() + make_interval(secs => p_seconds)
  on conflict (phone) do update set scenario = excluded.scenario, locked_until = excluded.locked_until;
  return null;
end $$;

create or replace function public.qa_replay_unlock(p_phones text[], p_scenario text) returns void
language sql security definer set search_path = '' as $$
  delete from public.qa_replay_locks where phone = any (p_phones) and scenario = p_scenario;
$$;

revoke all on function public.qa_ensure_whatsapp_personas() from public, anon, authenticated;
revoke all on function public.qa_replay_lock(text[], text, int) from public, anon, authenticated;
revoke all on function public.qa_replay_unlock(text[], text) from public, anon, authenticated;
grant execute on function public.qa_ensure_whatsapp_personas() to service_role;
grant execute on function public.qa_replay_lock(text[], text, int) to service_role;
grant execute on function public.qa_replay_unlock(text[], text) to service_role;
