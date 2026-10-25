-- QA 1 (master plan 30.12): the fictional WhatsApp people the replay harness speaks as. Run once with the Supabase
-- connector (execute_sql); safe to run again. Every phone is +1 212 555 01xx (555-0100 to 555-0199 is the block reserved
-- for fiction, and no real subscriber can hold it); every user is @test.local (no inbox; ops events skip it); every business is a demo
-- business (mock Google, R-17). Nothing here touches a real person, a real business or Google.
--   owner   +12125550101  owner of Harbour Lane Coffee
--   manager +12125550102  manager of Harbour Lane Coffee
--   two     +12125550103  owner of Juniper Hair Studio and a partner (two roles)
--   multi   +12125550104  owner of Harbour Lane Coffee and Juniper Hair Studio (two businesses)
--   staff   +12125550105  staff at Harbour Lane Coffee
-- The unknown phones (+12125550199 and +12125550198) have no row at all, on purpose.
do $$
declare
  v_cafe constant uuid := 'de300000-0000-4000-8000-000000000001';
  v_salon constant uuid := 'de300000-0000-4000-8000-000000000002';
  p record;
begin
  if not exists (select 1 from public.locations where id in (v_cafe, v_salon) and is_demo) then
    raise exception 'Run supabase/seed/demo.sql first: the two demo businesses must exist';
  end if;
  for p in select * from (values
    ('de300000-0000-4000-8000-0000000000a1'::uuid, 'qa-wa-owner@test.local', '+12125550101', 'owner'),
    ('de300000-0000-4000-8000-0000000000a2'::uuid, 'qa-wa-manager@test.local', '+12125550102', 'manager'),
    ('de300000-0000-4000-8000-0000000000a3'::uuid, 'qa-wa-two@test.local', '+12125550103', 'owner'),
    ('de300000-0000-4000-8000-0000000000a4'::uuid, 'qa-wa-multi@test.local', '+12125550104', 'owner'),
    ('de300000-0000-4000-8000-0000000000a5'::uuid, 'qa-wa-staff@test.local', '+12125550105', 'staff')
  ) as t(id, email, phone, role) loop
    insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, is_anonymous)
    values (p.id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', p.email, now(),
      '{"provider":"email","providers":["email"]}', '{"qa":"qa-1"}', now(), now(), false)
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
  select u.id, ph.phone, 'active', 'QA 1 fictional person (replay harness)', now(), now(), false
  from (values
    ('de300000-0000-4000-8000-0000000000a1'::uuid, '+12125550101'), ('de300000-0000-4000-8000-0000000000a2'::uuid, '+12125550102'),
    ('de300000-0000-4000-8000-0000000000a3'::uuid, '+12125550103'), ('de300000-0000-4000-8000-0000000000a4'::uuid, '+12125550104'),
    ('de300000-0000-4000-8000-0000000000a5'::uuid, '+12125550105')) as ph(id, phone)
  join auth.users u on u.id = ph.id
  on conflict (user_id) do update set phone = excluded.phone, state = 'active', stopped_at = null;

  -- review_alerts stays false: the persona never receives a real review alert from the pipeline, only replies to what the harness sends.
  delete from public.phone_roles where phone in ('+12125550101','+12125550102','+12125550103','+12125550104','+12125550105');
  insert into public.phone_roles (phone, role, user_id, location_id, partner_id, source) values
    ('+12125550101', 'owner', 'de300000-0000-4000-8000-0000000000a1', v_cafe, null, 'qa-1'),
    ('+12125550102', 'manager', 'de300000-0000-4000-8000-0000000000a2', v_cafe, null, 'qa-1'),
    ('+12125550103', 'owner', 'de300000-0000-4000-8000-0000000000a3', v_salon, null, 'qa-1'),
    ('+12125550103', 'partner', null, null, 'de300000-0000-4000-8000-0000000000b1', 'qa-1'),
    ('+12125550104', 'owner', 'de300000-0000-4000-8000-0000000000a4', v_cafe, null, 'qa-1'),
    ('+12125550104', 'owner', 'de300000-0000-4000-8000-0000000000a4', v_salon, null, 'qa-1'),
    ('+12125550105', 'staff', 'de300000-0000-4000-8000-0000000000a5', v_cafe, null, 'qa-1');
end $$;

-- Read-back: 5 users, 7 role rows, every business a demo one.
select (select count(*) from auth.users where email like 'qa-wa-%@test.local') as users,
       (select count(*) from public.phone_roles where source = 'qa-1') as roles,
       (select count(*) from public.phone_roles r join public.locations l on l.id = r.location_id where r.source = 'qa-1' and not l.is_demo) as non_demo_bound;
