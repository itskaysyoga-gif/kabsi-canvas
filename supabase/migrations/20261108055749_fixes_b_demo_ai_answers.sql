-- Fixes B (R-126, DSH-01 and DSH-07): the demo businesses' trade and their example AI answers' sources. Update only, demo
-- locations only; it ends with an assert that no non-demo row changed.
--  - the two demo locations get their Google category (the example search terms and nothing else read it), without a Places
--    stamp, so the 30 day Places purge does not clear it: the category is invented, not Places data;
--  - the salon's example AI answers named a coffee list (eats.example.com) and cafe rivals; they now name a hair guide
--    and salon rivals. The cafe's answers fit their trade and are not touched.
do $fixes_b$
declare
  v_cafe constant uuid := 'de300000-0000-4000-8000-000000000001';
  v_salon constant uuid := 'de300000-0000-4000-8000-000000000002';
  v_start constant timestamptz := now();
  v_before text;
  v_after text;
begin
  if (select count(*) from public.locations where is_demo and id in (v_cafe, v_salon)) <> 2 then
    raise notice 'fixes b: the demo businesses are not here, nothing to do';
    return;
  end if;

  select md5(coalesce(string_agg(x, '|' order by x), '')) into v_before from (
    select 'l' || l.id::text || '|' || coalesce(l.category, '') || '|' || coalesce(l.category_label, '') || '|' || coalesce(l.place_details_at::text, '') x
      from public.locations l where not l.is_demo
    union all select 'r' || r.id::text || '|' || r.competitors::text || '|' || r.sources::text
      from public.ai_visibility_runs r where r.run_at < v_start and not exists (select 1 from public.locations l where l.id = r.location_id and l.is_demo)
    union all select 'a' || a.run_id::text || '|' || a.answer
      from public.ai_visibility_answers a where not exists (select 1 from public.locations l where l.id = a.location_id and l.is_demo)) q;

  update public.locations set category = 'cafe', category_label = 'Cafe' where id = v_cafe and is_demo;
  update public.locations set category = 'hair_salon', category_label = 'Hair salon' where id = v_salon and is_demo;
  -- The stamp trigger set place_details_at on that change; the demo category is not Places data, so it carries no stamp.
  update public.locations set place_details_at = null where id in (v_cafe, v_salon) and is_demo;

  update public.ai_visibility_runs set
    competitors = jsonb_build_array('Larkhaven Hair Co', 'The salon on Pier Street'),
    sources = jsonb_build_array(
      jsonb_build_object('domain', 'larkhaven-guide.example.com', 'title', 'Larkhaven local guide'),
      jsonb_build_object('domain', 'hairguide.example.com', 'title', 'Best hair salons in Larkhaven'))
  where location_id = v_salon and model = 'demo' and source = 'live';

  select md5(coalesce(string_agg(x, '|' order by x), '')) into v_after from (
    select 'l' || l.id::text || '|' || coalesce(l.category, '') || '|' || coalesce(l.category_label, '') || '|' || coalesce(l.place_details_at::text, '') x
      from public.locations l where not l.is_demo
    union all select 'r' || r.id::text || '|' || r.competitors::text || '|' || r.sources::text
      from public.ai_visibility_runs r where r.run_at < v_start and not exists (select 1 from public.locations l where l.id = r.location_id and l.is_demo)
    union all select 'a' || a.run_id::text || '|' || a.answer
      from public.ai_visibility_answers a where not exists (select 1 from public.locations l where l.id = a.location_id and l.is_demo)) q;
  if v_before is distinct from v_after then
    raise exception 'fixes b: a row of a non-demo location changed';
  end if;
  if exists (select 1 from public.ai_visibility_runs where location_id = v_salon and sources::text like '%eats.example.com%') then
    raise exception 'fixes b: the salon still names a coffee list';
  end if;
end
$fixes_b$;
