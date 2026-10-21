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
| Australia | https://www.fairwork.gov.au/employment-conditions/public-holidays | **Not checked**: the page answered 503 (and a second URL 503) on 21 Oct 2026. No rows, so Kabsi asks nothing in Australia. |
| Ireland | https://www.citizensinformation.ie/... and gov.ie | **Not checked**: the pages answered 403 and 404. No rows, so Kabsi asks nothing in Ireland. |

No Lebanon row exists (K-123).

## Keeping it right

- The seed covers 21 Oct 2026 to 31 Dec 2027. Each year, read the official pages again, extend `FROM` and `TO` and the lists in
  `scripts/holidays/reference.mjs`, run `node scripts/build-holidays.mjs`, and add the new rows with a new migration (the
  seed file for the first run is `supabase/migrations/20261021240005_holiday_calendar_seed.sql`).
- `tests/holidays.test.ts` fails when the seed file is not what the script makes, when a row has no source, or when a country
  without a checked source gets rows.
- Public holidays that differ by region are not asked for a business that has no region. A region setting for the United
  Kingdom, the United States, Canada and Australia is a later card.
