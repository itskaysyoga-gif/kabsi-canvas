-- Scope 1 part 2 (30 Oct 2026): give a change that Kabsi already saw live on Google its verified time, so measures B and C can
-- read it. Run once in the Supabase SQL editor by Rashid (it updates existing rows, so it is not in a migration).
-- publications.verified_at is stamped by a trigger from the migration onward; rows verified before it have none.
--
-- 1. Read what will change (expect the count of businesses' verified changes so far; with Yawmiyati only, a small number):
select count(*) as verified_without_time from public.publications where state = 'verified' and verified_at is null;
--
-- 2. Set it from the time Kabsi last checked the change (the check that saw it), else from the last update:
update public.publications
   set verified_at = coalesce(last_checked_at, updated_at)
 where state = 'verified' and verified_at is null;
--
-- 3. Read-back. Expect 0:
select count(*) as verified_without_time from public.publications where state = 'verified' and verified_at is null;
