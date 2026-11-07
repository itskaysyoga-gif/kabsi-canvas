-- R-123 C: synthetic demo ownership and content.
-- Apply only after the demo outbound barriers are deployed and verified.
-- Insert/update only. Every row belongs to an existing is_demo location.
-- Running the file twice is harmless.

begin;

with audit_user as (
  select u.id from auth.users u join public.staff s on s.user_id=u.id
  join private.audit_access a on a.user_id=u.id
  where u.email='chatgpt-audit@kabsi.co' and s.role='auditor'
    and a.expires_at > now()
)
insert into public.organization_members (organization_id,user_id,role)
select distinct l.organization_id,a.id,'owner'
from public.locations l cross join audit_user a
where l.is_demo and l.organization_id is not null
on conflict do nothing;

with audit_user as (
  select u.id from auth.users u join public.staff s on s.user_id=u.id
  join private.audit_access a on a.user_id=u.id
  where u.email='chatgpt-audit@kabsi.co' and s.role='auditor'
    and a.expires_at > now()
)
insert into public.location_members (location_id,user_id,role)
select l.id,a.id,'owner'
from public.locations l cross join audit_user a
where l.is_demo
on conflict do nothing;

-- This fictional salon's post is the missing content draft in the QA workspace.
insert into public.gbp_posts (id,location_id,owner_input,body,cta_type,state,source)
select 'de310000-0000-4000-8000-000000000001'::uuid, l.id,
       'Demo post about a fictional seasonal service',
       'Our studio is offering extra appointment slots ahead of the holiday season. Ask us about an opening that suits you.',
       'CALL','draft','owner'
from public.locations l
where l.is_demo and l.name='Juniper Hair Studio'
on conflict (id) do nothing;

-- Another fictional coffee shop draft for this month's Posts page.
insert into public.gbp_posts (id,location_id,owner_input,body,cta_type,state,source)
select 'de310000-0000-4000-8000-000000000002'::uuid,l.id,
       'Demo post about a fictional weekend offer',
       'A new weekend pastry selection is ready at our imaginary coffee shop. Stop in for a warm drink and a freshly baked treat.',
       'CALL','draft','owner'
from public.locations l
where l.is_demo and l.name='Harbour Lane Coffee'
on conflict (id) do nothing;

-- Read-back: only demo ownership was added. The audit identity must
-- have exactly two demo location memberships and zero non-demo memberships.
select
  (select count(*) from public.location_members m
   join public.locations l on l.id=m.location_id
   join auth.users u on u.id=m.user_id
   where u.email='chatgpt-audit@kabsi.co' and l.is_demo and m.role='owner') as demo_owned,
  (select count(*) from public.location_members m
   join public.locations l on l.id=m.location_id
   join auth.users u on u.id=m.user_id
   where u.email='chatgpt-audit@kabsi.co' and not l.is_demo) as real_owned,
  (select count(*) from public.gbp_posts p
   join public.locations l on l.id=p.location_id
   where l.is_demo and p.state='draft') as demo_post_drafts;

-- Expected: demo_owned 2, real_owned 0, demo_post_drafts 3 or more.
-- Commit only after inspecting counts. Do not run before the demo isolation review.
commit;
