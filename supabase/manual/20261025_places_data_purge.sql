-- For Rashid (R-35, R-44): master plan 30.10 point 3, "Nothing from Places is stored except place_id". Session 19 rest
-- stopped every write of Places content (the free check reads Google live, the post writer reads category and area live
-- and stores only Kabsi's posting slot, the daily rating comes from the business's own Business Profile). This file
-- removes what Places content is still stored. Counts on 25 Oct 2026: places_cache 2 rows, rating_snapshots 4 rows
-- (all read from Places), 3 businesses with a Places category, label or area.
-- Run in the Supabase SQL editor. It runs in one transaction and ends with the read-back.
begin;
delete from public.places_cache;
delete from public.rating_snapshots where taken_on <= date '2026-10-25';
update public.locations set category = null, category_label = null, area = null
 where category is not null or category_label is not null or area is not null;
-- Read-back. Expected: 0 | 0 | 0
select (select count(*) from public.places_cache) as places_cache,
       (select count(*) from public.rating_snapshots where taken_on <= date '2026-10-25') as rating_snapshots,
       (select count(*) from public.locations where category is not null or category_label is not null or area is not null) as places_fields;
commit;
