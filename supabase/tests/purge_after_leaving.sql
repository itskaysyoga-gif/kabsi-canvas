-- Session 19 rest (master plan 30.10 point 1): 30 days after a business leaves, every table that holds Google's
-- content or numbers is emptied for it; a business still connected keeps its rows.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

\ir _fixtures.psql

insert into public.reviews (location_id, google_review_id, star_rating, review_created_at)
values ('00000000-0000-4000-8000-0000000000c2', 'other-review', 4, now());
insert into public.rating_snapshots (location_id, taken_on) values ('00000000-0000-4000-8000-0000000000c2', current_date);

select is((private.purge_after_leaving() ->> 'locations')::int, 0, 'nobody has left: nothing happens');

-- The victim disconnected 31 days ago and did not come back.
update public.locations set access_lost_at = now() - interval '31 days', access_granted_at = null
 where id = '00000000-0000-4000-8000-0000000000c1';
select is((private.purge_after_leaving() ->> 'locations')::int, 1, 'one business left more than 30 days ago');
select is((select count(*)::int from public.reviews where location_id = '00000000-0000-4000-8000-0000000000c1'), 0, 'its reviews are gone');
select is((select count(*)::int from public.rating_snapshots where location_id = '00000000-0000-4000-8000-0000000000c1'), 0, 'its rating snapshots are gone');
select is((select count(*)::int from public.weekly_reports where location_id = '00000000-0000-4000-8000-0000000000c1'), 0, 'its report copies are gone');
select is((select count(*)::int from public.reviews where location_id = '00000000-0000-4000-8000-0000000000c2'), 1, 'another business keeps its reviews');
select is((select count(*)::int from public.rating_snapshots where location_id = '00000000-0000-4000-8000-0000000000c2'), 1, 'and its snapshots');
select ok(not has_function_privilege('authenticated', 'private.purge_after_leaving()', 'execute'), 'not for signed-in users');

select * from finish();
rollback;
