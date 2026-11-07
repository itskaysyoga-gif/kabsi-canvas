-- Demo pack part 2 (R-125): the ages the app shows. Home dates a waiting card by its task, and the task detectors made the
-- tasks of the seeded reviews, posts and photos at the minute the demo pack ran, so every card read "just now". Each demo
-- task and review now carries the date of the thing it is about. Update only, demo locations only; ends with an assert that
-- the non-demo reviews and tasks are unchanged.
do $ages$
declare
  v_rev text;
  v_task text;
begin
  select md5(coalesce(string_agg(to_jsonb(r)::text, '|' order by r.id::text), '')) into v_rev from public.reviews r
    where not exists (select 1 from public.locations l where l.id = r.location_id and l.is_demo);
  select md5(coalesce(string_agg(to_jsonb(t)::text, '|' order by t.id::text), '')) into v_task from public.tasks t
    where not exists (select 1 from public.locations l where l.id = t.location_id and l.is_demo);

  update public.reviews r set created_at = r.review_created_at
  where r.location_id in (select id from public.locations where is_demo) and r.created_at > r.review_created_at + interval '1 hour';

  update public.tasks t set created_at = r.review_created_at + interval '1 hour'
  from public.reviews r
  where t.source_type = 'review' and t.source_id = r.id::text and t.location_id = r.location_id
    and t.location_id in (select id from public.locations where is_demo)
    and t.created_at > r.review_created_at + interval '2 hours';

  update public.tasks t set created_at = p.created_at
  from public.gbp_posts p
  where t.source_type = 'gbp_post' and t.source_id = p.id::text and t.location_id = p.location_id
    and t.location_id in (select id from public.locations where is_demo) and t.created_at > p.created_at + interval '2 hours';

  update public.tasks t set created_at = (select max(ph.created_at) from public.photos ph where ph.location_id = t.location_id and ph.state = 'draft')
  where t.kind = 'photo_batch' and t.location_id in (select id from public.locations where is_demo)
    and t.created_at > (select max(ph.created_at) from public.photos ph where ph.location_id = t.location_id and ph.state = 'draft') + interval '2 hours';

  if v_rev is distinct from (select md5(coalesce(string_agg(to_jsonb(r)::text, '|' order by r.id::text), '')) from public.reviews r
        where not exists (select 1 from public.locations l where l.id = r.location_id and l.is_demo))
     or v_task is distinct from (select md5(coalesce(string_agg(to_jsonb(t)::text, '|' order by t.id::text), '')) from public.tasks t
        where not exists (select 1 from public.locations l where l.id = t.location_id and l.is_demo)) then
    raise exception 'demo pack ages: a row of a non-demo location changed';
  end if;
end
$ages$;
