-- Industries 2 (5 Nov 2026, master plan 30.32): the search each new industry page prefills in the free check, for the UK
-- (GB) and the UAE (AE). Google's own category names in lower case, approved by lane R (source lane_r_approved). The keys are
-- the page slugs the industry pages send (src/content/industries). Keyword volumes wait for the DataForSEO top-up (a
-- docs/LATER.md row); a row that already exists is left as it is.
insert into public.industry_search_terms (industry, market, term, volume, candidates, source, checked_on)
values
  ('dental-clinic', 'GB', 'dentist', null, '[]'::jsonb, 'lane_r_approved', date '2026-11-05'),
  ('dental-clinic', 'AE', 'dentist', null, '[]'::jsonb, 'lane_r_approved', date '2026-11-05'),
  ('lash-and-brow-studio', 'GB', 'eyelash salon', null, '[]'::jsonb, 'lane_r_approved', date '2026-11-05'),
  ('lash-and-brow-studio', 'AE', 'eyelash salon', null, '[]'::jsonb, 'lane_r_approved', date '2026-11-05'),
  ('tattoo-studio', 'GB', 'tattoo shop', null, '[]'::jsonb, 'lane_r_approved', date '2026-11-05'),
  ('tattoo-studio', 'AE', 'tattoo shop', null, '[]'::jsonb, 'lane_r_approved', date '2026-11-05'),
  ('pet-grooming', 'GB', 'pet groomer', null, '[]'::jsonb, 'lane_r_approved', date '2026-11-05'),
  ('pet-grooming', 'AE', 'pet groomer', null, '[]'::jsonb, 'lane_r_approved', date '2026-11-05'),
  ('veterinary-clinic', 'GB', 'veterinarian', null, '[]'::jsonb, 'lane_r_approved', date '2026-11-05'),
  ('veterinary-clinic', 'AE', 'veterinarian', null, '[]'::jsonb, 'lane_r_approved', date '2026-11-05'),
  ('car-wash', 'GB', 'car wash', null, '[]'::jsonb, 'lane_r_approved', date '2026-11-05'),
  ('car-wash', 'AE', 'car wash', null, '[]'::jsonb, 'lane_r_approved', date '2026-11-05'),
  ('florist', 'GB', 'florist', null, '[]'::jsonb, 'lane_r_approved', date '2026-11-05'),
  ('florist', 'AE', 'florist', null, '[]'::jsonb, 'lane_r_approved', date '2026-11-05'),
  ('optician', 'GB', 'optician', null, '[]'::jsonb, 'lane_r_approved', date '2026-11-05'),
  ('optician', 'AE', 'optician', null, '[]'::jsonb, 'lane_r_approved', date '2026-11-05'),
  ('yoga-and-pilates-studio', 'GB', 'yoga studio', null, '[]'::jsonb, 'lane_r_approved', date '2026-11-05'),
  ('yoga-and-pilates-studio', 'AE', 'yoga studio', null, '[]'::jsonb, 'lane_r_approved', date '2026-11-05')
on conflict (industry, market) do nothing;
