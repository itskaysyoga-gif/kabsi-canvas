-- Demo pack part 4 (R-125): corrections found by the independent review of the first three parts. Update only, demo
-- locations only; ends with an assert on the tables it touches.
--  - a weekly report's period is the seven days before its Monday (the real report does the same), not the seven days after;
--  - the salon's late-opening post and special day agree: open 09:00 to 20:00, "until 8 pm";
--  - the salon's offer ends on 30 November, as its text says;
--  - the business's own rating in the competitor snapshots matches its rating series.
do $fix$
declare
  v_cafe constant uuid := 'de300000-0000-4000-8000-000000000001';
  v_salon constant uuid := 'de300000-0000-4000-8000-000000000002';
  v_before text;
  v_after text;
begin
  select md5(coalesce(string_agg(x, '|' order by x), '')) into v_before from (
    select 'c' || to_jsonb(c)::text x from public.competitor_snapshots c where not exists (select 1 from public.locations l where l.id = c.location_id and l.is_demo)
    union all select 'w' || to_jsonb(w)::text from public.weekly_reports w where not exists (select 1 from public.locations l where l.id = w.location_id and l.is_demo)
    union all select 's' || to_jsonb(s)::text from public.special_hours s where not exists (select 1 from public.locations l where l.id = s.location_id and l.is_demo)
    union all select 'g' || to_jsonb(g)::text from public.gbp_posts g where not exists (select 1 from public.locations l where l.id = g.location_id and l.is_demo)) q;

  update public.weekly_reports set data = jsonb_set(data, '{period}', jsonb_build_object('from', week_of - 7, 'to', week_of - 1))
  where location_id in (v_cafe, v_salon) and week_of in (date '2026-09-14', date '2026-09-21', date '2026-10-26', date '2026-11-02')
    and data #>> '{period,to}' = (week_of + 6)::text;

  update public.gbp_posts set body = 'Late opening on Tuesday 17 November until 8 pm, with a free consultation for first-time clients.'
  where id = 'de300000-0000-4000-9000-102000002004' and location_id = v_salon;
  update public.publications set payload = jsonb_set(payload, '{summary}', to_jsonb('Late opening on Tuesday 17 November until 8 pm, with a free consultation for first-time clients.'::text))
  where id = 'de300000-0000-4000-9000-104000002104' and location_id = v_salon;
  update public.special_hours set open_time = time '09:00', close_time = time '20:00'
  where id = 'de300000-0000-4000-9000-105000002001' and location_id = v_salon;
  update public.publications set payload = jsonb_set(jsonb_set(payload, '{open_time}', to_jsonb('09:00:00'::text)), '{close_time}', to_jsonb('20:00:00'::text))
  where id = 'de300000-0000-4000-9000-104000002300' and location_id = v_salon;

  update public.gbp_posts set end_date = date '2026-11-30'
  where id = 'de300000-0000-4000-9000-102000002006' and location_id = v_salon;

  update public.competitor_snapshots set rating = 3.7 where location_id = v_cafe and key = 'self';
  update public.competitor_snapshots set rating = 4.7 where location_id = v_salon and key = 'self';

  select md5(coalesce(string_agg(x, '|' order by x), '')) into v_after from (
    select 'c' || to_jsonb(c)::text x from public.competitor_snapshots c where not exists (select 1 from public.locations l where l.id = c.location_id and l.is_demo)
    union all select 'w' || to_jsonb(w)::text from public.weekly_reports w where not exists (select 1 from public.locations l where l.id = w.location_id and l.is_demo)
    union all select 's' || to_jsonb(s)::text from public.special_hours s where not exists (select 1 from public.locations l where l.id = s.location_id and l.is_demo)
    union all select 'g' || to_jsonb(g)::text from public.gbp_posts g where not exists (select 1 from public.locations l where l.id = g.location_id and l.is_demo)) q;
  if v_before is distinct from v_after then
    raise exception 'demo pack fixes: a row of a non-demo location changed';
  end if;
end
$fix$;
