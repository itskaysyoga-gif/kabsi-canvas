// Official public holiday dates, read from each country's own page on 21 Oct 2026 (P0.5-03, K-131). A row goes into the
// holiday calendar only when an official source stated it (or, for Canada and the UAE, the rule it follows); the
// date-holidays package is used for what the sources do not give (the Islamic dates, which follow the moon) and is never
// trusted on its own: it was wrong for the UK (no Summer bank holiday and a Boxing Day that is a Saturday) and for the
// UAE (extra days, one day too few for National Day). Australia and Ireland are not here: their official pages answered
// 503 and 403 on 21 Oct 2026, so nothing is asked there until the dates are checked (docs/holidays.md).
import { readFileSync } from "node:fs";

export const CHECKED_ON = "2026-10-21";
/** The window the seed covers. Extend it every year (docs/holidays.md). */
export const FROM = "2026-10-21";
export const TO = "2027-12-31";

const range = (s, e, name) => ({ start: s, end: e, name });
const day = (d, name) => range(d, d, name);

// United Kingdom, England and Wales: GOV.UK's own bank holiday data (saved beside this file as it was fetched).
const uk = JSON.parse(readFileSync(new URL("./gov-uk-bank-holidays.json", import.meta.url), "utf8"))["england-and-wales"].events;

export const OFFICIAL = {
  GB: {
    region: "england-and-wales",
    source: "https://www.gov.uk/bank-holidays",
    rows: uk.map((e) => day(e.date, `${e.title.replace(/\u2019/g, "'")}${e.notes ? ` (${e.notes.toLowerCase()})` : ""}`)),
  },
  // United States: the federal holidays, with the day each is observed (OPM).
  US: {
    source: "https://www.opm.gov/policy-data-oversight/pay-leave/federal-holidays/",
    rows: [
      day("2026-11-11", "Veterans Day"), day("2026-11-26", "Thanksgiving Day"), day("2026-12-25", "Christmas Day"),
      day("2027-01-01", "New Year's Day"), day("2027-01-18", "Birthday of Martin Luther King, Jr."), day("2027-02-15", "Washington's Birthday"),
      day("2027-05-31", "Memorial Day"), day("2027-06-18", "Juneteenth National Independence Day (observed)"),
      day("2027-07-05", "Independence Day (observed)"), day("2027-09-06", "Labor Day"), day("2027-10-11", "Columbus Day"),
      day("2027-11-11", "Veterans Day"), day("2027-11-25", "Thanksgiving Day"), day("2027-12-24", "Christmas Day (observed)"),
      day("2027-12-31", "New Year's Day (observed)"),
    ],
  },
  // New Zealand: Employment New Zealand lists 2026.
  NZ: {
    source: "https://www.employment.govt.nz/leave-and-holidays/public-holidays/public-holidays-and-anniversary-dates/",
    rows: [day("2026-10-26", "Labour Day"), day("2026-12-25", "Christmas Day"), day("2026-12-26", "Boxing Day"), day("2026-12-28", "Boxing Day (Mondayised)")],
  },
  // Singapore: the Ministry of Manpower lists 2026 and 2027.
  SG: {
    source: "https://www.mom.gov.sg/employment-practices/public-holidays",
    rows: [
      range("2026-11-08", "2026-11-09", "Deepavali"), day("2026-12-25", "Christmas Day"),
      day("2027-01-01", "New Year's Day"), range("2027-02-06", "2027-02-08", "Chinese New Year"), day("2027-03-10", "Hari Raya Puasa"),
      day("2027-03-26", "Good Friday"), day("2027-05-01", "Labour Day"), day("2027-05-17", "Hari Raya Haji"), day("2027-05-20", "Vesak Day"),
      day("2027-08-09", "National Day"), day("2027-10-28", "Deepavali"), day("2027-12-25", "Christmas Day"),
    ],
  },
};

// Canada: the ten general holidays of the Canada Labour Code, as canada.ca lists them. The page gives the list, not the
// dates, so each date is computed from its rule here: Victoria Day is the Monday before 25 May, Labour Day the first
// Monday of September, Thanksgiving the second Monday of October, the rest are fixed days. Good Friday comes from the
// package's Easter (it matches GOV.UK's for the UK in every year checked).
export const CANADA = {
  source: "https://www.canada.ca/en/employment-social-development/services/labour-standards/reports/holidays.html",
};
export const UAE = {
  source: "https://u.ae/en/information-and-services/public-holidays-and-religious-affairs/public-holidays",
  // From the page: Eid Al Fitr 1 to 3 Shawwal, Arafah Day 9 and Eid Al Adha 10 to 12 Dhu Al Hijjah (one run of four days),
  // Hijri New Year and the Prophet's birthday one day each, National Day 2 and 3 December, New Year 1 January.
  fixed: [
    range("2026-12-02", "2026-12-03", "National Day"), day("2027-01-01", "New Year's Day"),
    range("2027-12-02", "2027-12-03", "National Day"),
  ],
};
