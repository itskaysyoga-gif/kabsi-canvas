-- QA 1 (master plan 30.12 item 4): marks ONLY the QA test account's organisation billing_test = true, so its Plan page offers the
-- paid buttons in Creem's test mode, and gives that account's business a fictional WhatsApp phone (+12125550106) for the cancel
-- step of the replay harness. Run after the onboarding journey made the business "Kabsi QA Cafe". Run with the Supabase
-- connector. The organisation is found through the QA owner's own business; no other organisation can be touched.
do $$
declare
  v_user constant uuid := 'de300000-0000-4000-8000-0000000000a6';
  v_loc uuid; v_org uuid;
begin
  select id, organization_id into v_loc, v_org from public.locations where place_id = 'qa-place-kabsi-qa-cafe' and created_by = v_user;
  if v_loc is null then raise exception 'Run the onboarding journey first: the QA business does not exist'; end if;
  update public.organizations set billing_test = true where id = v_org and not is_demo;
  insert into public.whatsapp_optins (user_id, phone, state, consent_text, requested_at, verified_at, review_alerts)
  values (v_user, '+12125550106', 'active', 'QA 1 fictional person (replay harness)', now(), now(), false)
  on conflict (user_id) do nothing;
  insert into public.phone_roles (phone, role, user_id, location_id, source)
  select '+12125550106', 'owner', v_user, v_loc, 'code'
  where not exists (select 1 from public.phone_roles r where r.phone = '+12125550106' and r.revoked_at is null);
end $$;
select o.id as organisation, o.billing_test, o.is_demo, (select count(*) from public.organizations where billing_test) as organisations_marked
from public.organizations o join public.locations l on l.organization_id = o.id where l.place_id = 'qa-place-kabsi-qa-cafe';
-- Expect: billing_test true and organisations_marked 1.
