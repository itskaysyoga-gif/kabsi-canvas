# Holiday calendar (P0.5-03, K-131)

Kabsi asks the owner five days before a public holiday: normal hours, closed, or custom hours. The calendar behind it is
`public.holidays`, seeded by `scripts/build-holidays.mjs` from the official references in `scripts/holidays/reference.mjs`.
A row with no `verified_on` is never asked about. Nothing is assumed: where an official page could not be read, there are no rows.

## What was checked on 21 Oct 2026

| Country | Official source | Result |
|---|---|---|
| United Kingdom (England and Wales) | https://www.gov.uk/bank-holidays (the JSON GOV.UK publishes, saved as `scripts/holidays/gov-uk-bank-holidays.json`) | Used as the data. The date-holidays package was wrong: no Summer bank holiday, and Boxing Day on a Saturday (only the substitute day, 28 Dec 2026, is a bank holiday). Scotland and Northern Ireland have their own days: not covered until a business has a region. |
| United States | https://www.opm.gov/policy-data-oversight/pay-leave/federal-holidays/ | Federal holidays with the day each is observed, 2026 to 2028. The package matched for 2026. States have more holidays: not covered. |
| Canada | https://www.canada.ca/en/employment-social-development/services/labour-standards/reports/holidays.html | The page lists the ten general holidays of the Canada Labour Code but not the dates. Each date is computed from its rule (Victoria Day the Monday before 25 May, Labour Day the first Monday of September, Thanksgiving the second Monday of October, the rest fixed). Provincial holidays: not covered. |
| New Zealand | https://www.employment.govt.nz/leave-and-holidays/public-holidays/public-holidays-and-anniversary-dates/ | 2026 only (the page shows no later year), so the calendar ends in December 2026 there. |
| Singapore | https://www.mom.gov.sg/employment-practices/public-holidays | 2026 and 2027, with the observed days. |
| United Arab Emirates | https://u.ae/en/information-and-services/public-holidays-and-religious-affairs/public-holidays | The page gives the rules (Eid Al Fitr 1 to 3 Shawwal, Arafah Day and Eid Al Adha 9 to 12 Dhu Al Hijjah, National Day 2 and 3 December, New Year 1 January) and the National Day and New Year dates. The Islamic dates follow the moon, so they are estimates from the package and are marked `estimated`: the email says "expected" and the owner can move the days up to three either way. The package alone was wrong for the UAE (extra days, National Day as one day). |
| Australia | https://www.fairwork.gov.au/employment-conditions/public-holidays | **Not readable on 21 Oct 2026** (503, and a second URL 503). **Rows come from the date-holidays package instead, checked 22 Oct 2026 (source on every row: https://github.com/commenthol/date-holidays#v3.37.0, not an official page).** The national public days only: New Year's Day, Australia Day, Good Friday, Easter Monday, Anzac Day, Christmas Day, Boxing Day and the substitute days of Christmas and Boxing Day. Easter Saturday and Easter Sunday are left out because they differ by state, and so are all state holidays. Anzac Day 2027 falls on a Sunday and the package gives no substitute. |
| Ireland | https://www.citizensinformation.ie/... and gov.ie | **Not readable on 21 Oct 2026** (403 and 404). **Rows come from the date-holidays package instead, checked 22 Oct 2026 (source on every row: https://github.com/commenthol/date-holidays#v3.37.0, not an official page).** The package's public days, named plainly (New Year's Day, St. Brigid's Day, St. Patrick's Day, Easter Monday, the May, June, August and October bank holidays, Christmas Day, St. Stephen's Day and its substitute day). Good Friday is left out: the package calls it a bank day, not a public holiday. |

No Lebanon row exists (K-123).

## Rows from the package (Australia and Ireland)

Lane R decided on 22 Oct 2026 that Australia and Ireland get rows from the `date-holidays` package, marked with that source, because
their official pages could not be read. They are made by `buildPackageRows()` in `scripts/build-holidays.mjs` into their own
migration (`20261022064134_holiday_calendar_au_ie.sql`; the first seed file is unchanged), and every row's `source` is the package's
address with its version. The package is not an official source and was wrong for the UK and the UAE (see above), so a person
should check these rows against the official pages when they can be read (Fair Work for Australia, gov.ie for Ireland) and
replace the package rows in `scripts/holidays/reference.mjs`. State and county holidays are not covered.

## Keeping it right

- The seed covers 21 Oct 2026 to 31 Dec 2027. Each year, read the official pages again, extend `FROM` and `TO` and the lists in
  `scripts/holidays/reference.mjs`, run `node scripts/build-holidays.mjs`, and add the new rows with a new migration (the
  seed file for the first run is `supabase/migrations/20261021240005_holiday_calendar_seed.sql`).
- `tests/holidays.test.ts` fails when a seed file is not what the script makes, when a row has no source, or when a country
  with neither an official source nor the package gets rows.
- Public holidays that differ by region are not asked for a business that has no region. A region setting for the United
  Kingdom, the United States, Canada and Australia is a later card.
