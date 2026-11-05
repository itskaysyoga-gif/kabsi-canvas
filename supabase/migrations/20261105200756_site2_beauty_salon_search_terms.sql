-- Site 2 (5 Nov 2026, master plan 30.34 item 4): the search the beauty salon page prefills in the free check, for the UK
-- (GB) and the UAE (AE). Google's own category name in lower case, approved by lane R (source lane_r_approved). The key is
-- the page slug (src/content/industries/beauty-salon.ts). A row that already exists is left as it is.
insert into public.industry_search_terms (industry, market, term, volume, candidates, source, checked_on)
values
  ('beauty-salon', 'GB', 'beauty salon', null, '[]'::jsonb, 'lane_r_approved', date '2026-11-05'),
  ('beauty-salon', 'AE', 'beauty salon', null, '[]'::jsonb, 'lane_r_approved', date '2026-11-05')
on conflict (industry, market) do nothing;
