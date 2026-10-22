-- P0.5-03 leftovers (lane R decision of 22 Oct 2026): Australia and Ireland. 27 rows, 2026-10-21 to 2027-12-31, from the date-holidays
-- package (v3.37.0), because the official pages could not be read on 2026-10-21. This is the package's list of national public days, with
-- the substitute days of Christmas, Boxing Day and St Stephen's Day, and without the days that differ by state (Easter
-- Saturday and Easter Sunday in Australia). It is not an official source. Made by scripts/build-holidays.mjs; do not edit by hand.
-- The first seed file still says Australia and Ireland have no rows: this file adds them. Additive, nothing is changed.

insert into public.holidays (country, region, name, starts_on, ends_on, kind, estimated, source, verified_on) values
  ('AU', null, 'Christmas Day', '2026-12-25', '2026-12-25', 'public', false, 'https://github.com/commenthol/date-holidays#v3.37.0', '2026-10-22'),
  ('AU', null, 'Boxing Day', '2026-12-26', '2026-12-26', 'public', false, 'https://github.com/commenthol/date-holidays#v3.37.0', '2026-10-22'),
  ('AU', null, 'Boxing Day (substitute day)', '2026-12-28', '2026-12-28', 'public', false, 'https://github.com/commenthol/date-holidays#v3.37.0', '2026-10-22'),
  ('AU', null, 'New Year''s Day', '2027-01-01', '2027-01-01', 'public', false, 'https://github.com/commenthol/date-holidays#v3.37.0', '2026-10-22'),
  ('AU', null, 'Australia Day', '2027-01-26', '2027-01-26', 'public', false, 'https://github.com/commenthol/date-holidays#v3.37.0', '2026-10-22'),
  ('AU', null, 'Good Friday', '2027-03-26', '2027-03-26', 'public', false, 'https://github.com/commenthol/date-holidays#v3.37.0', '2026-10-22'),
  ('AU', null, 'Easter Monday', '2027-03-29', '2027-03-29', 'public', false, 'https://github.com/commenthol/date-holidays#v3.37.0', '2026-10-22'),
  ('AU', null, 'Anzac Day', '2027-04-25', '2027-04-25', 'public', false, 'https://github.com/commenthol/date-holidays#v3.37.0', '2026-10-22'),
  ('AU', null, 'Christmas Day', '2027-12-25', '2027-12-25', 'public', false, 'https://github.com/commenthol/date-holidays#v3.37.0', '2026-10-22'),
  ('AU', null, 'Boxing Day', '2027-12-26', '2027-12-26', 'public', false, 'https://github.com/commenthol/date-holidays#v3.37.0', '2026-10-22'),
  ('AU', null, 'Christmas Day (substitute day)', '2027-12-27', '2027-12-27', 'public', false, 'https://github.com/commenthol/date-holidays#v3.37.0', '2026-10-22'),
  ('AU', null, 'Boxing Day (substitute day)', '2027-12-28', '2027-12-28', 'public', false, 'https://github.com/commenthol/date-holidays#v3.37.0', '2026-10-22'),
  ('IE', null, 'October bank holiday', '2026-10-26', '2026-10-26', 'public', false, 'https://github.com/commenthol/date-holidays#v3.37.0', '2026-10-22'),
  ('IE', null, 'Christmas Day', '2026-12-25', '2026-12-25', 'public', false, 'https://github.com/commenthol/date-holidays#v3.37.0', '2026-10-22'),
  ('IE', null, 'St. Stephen''s Day', '2026-12-26', '2026-12-26', 'public', false, 'https://github.com/commenthol/date-holidays#v3.37.0', '2026-10-22'),
  ('IE', null, 'St. Stephen''s Day (substitute day)', '2026-12-28', '2026-12-28', 'public', false, 'https://github.com/commenthol/date-holidays#v3.37.0', '2026-10-22'),
  ('IE', null, 'New Year''s Day', '2027-01-01', '2027-01-01', 'public', false, 'https://github.com/commenthol/date-holidays#v3.37.0', '2026-10-22'),
  ('IE', null, 'St. Brigid''s Day', '2027-02-01', '2027-02-01', 'public', false, 'https://github.com/commenthol/date-holidays#v3.37.0', '2026-10-22'),
  ('IE', null, 'St. Patrick''s Day', '2027-03-17', '2027-03-17', 'public', false, 'https://github.com/commenthol/date-holidays#v3.37.0', '2026-10-22'),
  ('IE', null, 'Easter Monday', '2027-03-29', '2027-03-29', 'public', false, 'https://github.com/commenthol/date-holidays#v3.37.0', '2026-10-22'),
  ('IE', null, 'May bank holiday', '2027-05-03', '2027-05-03', 'public', false, 'https://github.com/commenthol/date-holidays#v3.37.0', '2026-10-22'),
  ('IE', null, 'June bank holiday', '2027-06-07', '2027-06-07', 'public', false, 'https://github.com/commenthol/date-holidays#v3.37.0', '2026-10-22'),
  ('IE', null, 'August bank holiday', '2027-08-02', '2027-08-02', 'public', false, 'https://github.com/commenthol/date-holidays#v3.37.0', '2026-10-22'),
  ('IE', null, 'October bank holiday', '2027-10-25', '2027-10-25', 'public', false, 'https://github.com/commenthol/date-holidays#v3.37.0', '2026-10-22'),
  ('IE', null, 'Christmas Day', '2027-12-25', '2027-12-25', 'public', false, 'https://github.com/commenthol/date-holidays#v3.37.0', '2026-10-22'),
  ('IE', null, 'St. Stephen''s Day', '2027-12-26', '2027-12-26', 'public', false, 'https://github.com/commenthol/date-holidays#v3.37.0', '2026-10-22'),
  ('IE', null, 'St. Stephen''s Day (substitute day)', '2027-12-27', '2027-12-27', 'public', false, 'https://github.com/commenthol/date-holidays#v3.37.0', '2026-10-22')
on conflict do nothing;
