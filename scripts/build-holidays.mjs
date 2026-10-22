// Builds the seed of the holiday calendar (P0.5-03, K-131) from the official references in scripts/holidays/ and, for
// the Islamic dates only, the date-holidays package.
//   node scripts/build-holidays.mjs            writes supabase/migrations/20261021240005_holiday_calendar_seed.sql and, for Australia
//                                              and Ireland from the date-holidays package, the PACKAGE_MIGRATION file (reference.mjs)
//   node scripts/build-holidays.mjs --check    exits 1 when the file on disk is not what this script makes (CI: tests/holidays.test.ts)
// Every row says where it comes from. Rows are "verified" when an official source stated them (or the rule they
// follow); a date that follows the moon is "estimated". Run it again each year with the window extended.
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import {
  CANADA,
  CHECKED_ON,
  FROM,
  OFFICIAL,
  PACKAGE_CHECKED_ON,
  PACKAGE_MIGRATION,
  PACKAGE_NAMES,
  PACKAGE_SKIP,
  PACKAGE_SOURCE,
  TO,
  UAE,
} from "./holidays/reference.mjs";

const require = createRequire(import.meta.url);
const OUT = new URL(
  "../supabase/migrations/20261021240005_holiday_calendar_seed.sql",
  import.meta.url,
);

const iso = (d) => d.toISOString().slice(0, 10);
const add = (date, n) => iso(new Date(Date.parse(`${date}T00:00:00Z`) + n * 86400_000));
const inWindow = (r) => r.end >= FROM && r.start <= TO;

export function buildRows() {
  const rows = [];
  const push = (country, region, r, kind, estimated, source) =>
    inWindow(r) &&
    rows.push({
      country,
      region,
      name: r.name,
      start: r.start,
      end: r.end,
      kind,
      estimated,
      source,
      verified: CHECKED_ON,
    });

  for (const [country, o] of Object.entries(OFFICIAL))
    for (const r of o.rows) push(country, o.region ?? null, r, "public", false, o.source);

  // Canada: computed from the Labour Code rules.
  const Holidays = require("date-holidays");
  for (const y of [2026, 2027]) {
    const monday = (y0, m, nth) => {
      const first = new Date(Date.UTC(y0, m, 1));
      const offset = (8 - first.getUTCDay()) % 7; // days to the first Monday
      return iso(new Date(Date.UTC(y0, m, 1 + offset + 7 * (nth - 1))));
    };
    const may25 = new Date(Date.UTC(y, 4, 25));
    const victoria = iso(
      new Date(
        may25.getTime() -
          ((((may25.getUTCDay() + 6) % 7) + 7) % 7) * 86400_000 -
          (may25.getUTCDay() === 1 ? 7 * 86400_000 : 0),
      ),
    );
    const good = new Holidays("CA")
      .getHolidays(y)
      .find((h) => h.name === "Good Friday")
      .date.slice(0, 10);
    const list = [
      [`${y}-01-01`, "New Year's Day"],
      [good, "Good Friday"],
      [victoria, "Victoria Day"],
      [`${y}-07-01`, "Canada Day"],
      [monday(y, 8, 1), "Labour Day"],
      [`${y}-09-30`, "National Day for Truth and Reconciliation"],
      [monday(y, 9, 2), "Thanksgiving Day"],
      [`${y}-11-11`, "Remembrance Day"],
      [`${y}-12-25`, "Christmas Day"],
      [`${y}-12-26`, "Boxing Day"],
    ];
    for (const [d, name] of list)
      push("CA", null, { start: d, end: d, name }, "public", false, CANADA.source);
  }

  // United Arab Emirates: the durations are the official ones; the Islamic dates follow the moon, so they are estimates.
  for (const r of UAE.fixed) push("AE", null, r, "public", false, UAE.source);
  const ae = new Holidays("AE", { languages: ["en"] });
  for (const y of [2027]) {
    const named = (needle) =>
      ae
        .getHolidays(y)
        .find((h) => h.name.includes(needle))
        ?.date.slice(0, 10);
    const ramadan = named("First day of Ramadan"),
      fitr = named("Eid al-Fitr"),
      adha = named("Eid al-Adha"),
      hijri = named("Islamic New Year"),
      mawlid = named("Mawlid");
    push(
      "AE",
      null,
      { start: ramadan, end: add(fitr, -1), name: "Ramadan" },
      "ramadan",
      true,
      UAE.source,
    );
    push(
      "AE",
      null,
      { start: fitr, end: add(fitr, 2), name: "Eid al-Fitr" },
      "islamic",
      true,
      UAE.source,
    );
    push(
      "AE",
      null,
      { start: add(adha, -1), end: add(adha, 2), name: "Arafah Day and Eid al-Adha" },
      "islamic",
      true,
      UAE.source,
    );
    push(
      "AE",
      null,
      { start: hijri, end: hijri, name: "Islamic New Year" },
      "islamic",
      true,
      UAE.source,
    );
    push(
      "AE",
      null,
      { start: mawlid, end: mawlid, name: "Prophet's birthday" },
      "islamic",
      true,
      UAE.source,
    );
  }
  rows.sort(
    (a, b) =>
      a.country.localeCompare(b.country) ||
      a.start.localeCompare(b.start) ||
      a.name.localeCompare(b.name),
  );
  return rows;
}

/** Australia and Ireland from the date-holidays package (not an official page; see reference.mjs and docs/holidays.md). */
export function buildPackageRows() {
  const Holidays = require("date-holidays");
  const rows = [];
  const seen = new Set();
  for (const country of ["AU", "IE"]) {
    const h = new Holidays(country, { languages: ["en"] });
    for (const y of [2026, 2027])
      for (const x of h.getHolidays(y)) {
        const substitute = x.substitute && /substitute day/.test(x.name);
        if (x.type !== "public" && !substitute) continue;
        const clean = x.name.replace(/\u2019/g, "'");
        const base = clean.replace(/ \(substitute day\)$/, "");
        if (PACKAGE_SKIP[country].includes(base)) continue;
        const name = PACKAGE_NAMES[base] ? clean.replace(base, PACKAGE_NAMES[base]) : clean;
        const day = x.date.slice(0, 10);
        const key = `${country}|${day}|${name}`;
        if (seen.has(key) || !inWindow({ start: day, end: day })) continue;
        seen.add(key);
        rows.push({
          country,
          region: null,
          name,
          start: day,
          end: day,
          kind: "public",
          estimated: false,
          source: PACKAGE_SOURCE,
          verified: PACKAGE_CHECKED_ON,
        });
      }
  }
  rows.sort(
    (a, b) =>
      a.country.localeCompare(b.country) ||
      a.start.localeCompare(b.start) ||
      a.name.localeCompare(b.name),
  );
  return rows;
}

const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
export function buildSql() {
  const rows = buildRows();
  const values = rows.map(
    (r) =>
      `  (${q(r.country)}, ${r.region ? q(r.region) : "null"}, ${q(r.name)}, '${r.start}', '${r.end}', ${q(r.kind)}, ${r.estimated}, ${q(r.source)}, '${r.verified}')`,
  );
  return `-- P0.5-03 part B: the holiday calendar seed (K-131), made by scripts/build-holidays.mjs from the official sources in
-- scripts/holidays/reference.mjs. ${rows.length} rows, ${FROM} to ${TO}, checked on ${CHECKED_ON}. Do not edit by hand: change the
-- references and run \`node scripts/build-holidays.mjs\` (tests/holidays.test.ts fails when this file is not what the script makes).
-- Every row names its source; \`estimated\` marks a date that follows the moon. Australia and Ireland have no rows yet
-- (their official pages could not be read on ${CHECKED_ON}), so Kabsi asks nothing there.

insert into public.holidays (country, region, name, starts_on, ends_on, kind, estimated, source, verified_on) values
${values.join(",\n")}
on conflict do nothing;
`;
}

const PACKAGE_OUT = new URL(`../supabase/migrations/${PACKAGE_MIGRATION}`, import.meta.url);
export function buildPackageSql() {
  const rows = buildPackageRows();
  const values = rows.map(
    (r) =>
      `  (${q(r.country)}, null, ${q(r.name)}, '${r.start}', '${r.end}', ${q(r.kind)}, ${r.estimated}, ${q(r.source)}, '${r.verified}')`,
  );
  return `-- P0.5-03 leftovers (lane R decision of 22 Oct 2026): Australia and Ireland. ${rows.length} rows, ${FROM} to ${TO}, from the date-holidays
-- package (${PACKAGE_SOURCE.split("#")[1]}), because the official pages could not be read on ${CHECKED_ON}. This is the package's list of national public days, with
-- the substitute days of Christmas, Boxing Day and St Stephen's Day, and without the days that differ by state (Easter
-- Saturday and Easter Sunday in Australia). It is not an official source. Made by scripts/build-holidays.mjs; do not edit by hand.
-- The first seed file still says Australia and Ireland have no rows: this file adds them. Additive, nothing is changed.

insert into public.holidays (country, region, name, starts_on, ends_on, kind, estimated, source, verified_on) values
${values.join(",\n")}
on conflict do nothing;
`;
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const files = [
    [OUT, buildSql()],
    [PACKAGE_OUT, buildPackageSql()],
  ];
  if (process.argv.includes("--check")) {
    for (const [out, sql] of files) {
      const have = (() => {
        try {
          return readFileSync(out, "utf8");
        } catch {
          return "";
        }
      })();
      if (have !== sql) {
        console.error(
          `holiday seed is out of date: run node scripts/build-holidays.mjs (${out.pathname})`,
        );
        process.exit(1);
      }
    }
    console.log("holiday seeds are up to date");
  } else {
    for (const [out, sql] of files) writeFileSync(out, sql);
    console.log(
      `wrote ${OUT.pathname} (${buildRows().length} rows) and ${PACKAGE_OUT.pathname} (${buildPackageRows().length} rows)`,
    );
  }
}
