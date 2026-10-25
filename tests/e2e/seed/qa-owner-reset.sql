-- QA 1: puts the QA owner (delivered+kabsi-qa@resend.dev, no inbox) back to "no business yet", so the sign-up and onboarding
-- journey can run again. It removes the one fictional business "Kabsi QA Cafe" that the journey makes (place id
-- qa-place-kabsi-qa-cafe) and what hangs off it, and nothing else. Run with the Supabase connector. Safe to run when
-- there is nothing to remove. The account itself stays; create it once with qa-owner-create below.
-- 1. Once: create the account (an email-confirmed Auth user; the sign-in code comes from qa-login-code.sql).
insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, is_anonymous)
values ('de300000-0000-4000-8000-0000000000a6', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
  'delivered+kabsi-qa@resend.dev', now(), '{"provider":"email","providers":["email"]}', '{"qa":"qa-1"}', now(), now(), false)
on conflict (id) do nothing;
-- 2. Every time: forget the fictional business (its organisation, members, subscription and rows go with it).
do $$
declare v_loc uuid; v_org uuid;
begin
  select id, organization_id into v_loc, v_org from public.locations where place_id = 'qa-place-kabsi-qa-cafe' and created_by = 'de300000-0000-4000-8000-0000000000a6';
  if v_loc is null then return; end if;
  delete from public.subscriptions where organization_id = v_org;
  delete from public.locations where id = v_loc;
  delete from public.organization_members where organization_id = v_org;
  delete from public.organizations where id = v_org and not exists (select 1 from public.locations where organization_id = v_org);
end $$;
select (select count(*) from public.locations where place_id = 'qa-place-kabsi-qa-cafe') as qa_business_left;
-- Expect 0. If a delete is refused by a foreign key, read the error and remove that table's rows for this business first.
