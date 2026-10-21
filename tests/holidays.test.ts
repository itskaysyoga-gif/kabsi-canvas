import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildRows, buildSql } from "../scripts/build-holidays.mjs";
import { addDays, checkAnswer, readBack, whenWords, type HolidayInfo } from "../src/lib/holidays";

// P0.5-03 (K-131): the holiday calendar and the words on the screens. The seed is made by scripts/build-holidays.mjs from
// official sources; this file holds it to what the script makes and to the rules the card sets.
const seed = readFileSync("supabase/migrations/20261021240005_holiday_calendar_seed.sql", "utf8");
const rows = buildRows() as {
  country: string;
  region: string | null;
  name: string;
  start: string;
  end: string;
  kind: string;
  estimated: boolean;
  source: string;
  verified: string;
}[];

describe("the holiday seed", () => {
  it("is exactly what the script makes (run node scripts/build-holidays.mjs after changing a reference)", () => {
    expect(seed).toBe(buildSql());
  });

  it("covers the countries whose official page could be read, and none that could not", () => {
    expect([...new Set(rows.map((r) => r.country))].sort()).toEqual([
      "AE",
      "CA",
      "GB",
      "NZ",
      "SG",
      "US",
    ]);
    expect(rows.some((r) => ["AU", "IE", "LB"].includes(r.country))).toBe(false);
  });

  it("names a source and a check date on every row, and only https sources", () => {
    for (const r of rows) {
      expect(r.source, r.name).toMatch(/^https:\/\//);
      expect(r.verified).toBe("2026-10-21");
    }
  });

  it("keeps GOV.UK's England and Wales dates, including the ones the package missed", () => {
    const gb = rows.filter((r) => r.country === "GB");
    expect(gb.every((r) => r.region === "england-and-wales")).toBe(true);
    expect(
      gb.find((r) => r.name === "Summer bank holiday" && r.start === "2027-08-30"),
    ).toBeTruthy();
    expect(gb.some((r) => r.start === "2026-12-26")).toBe(false); // a Saturday: only the substitute day is a bank holiday
    expect(gb.find((r) => r.start === "2026-12-28")?.name).toBe("Boxing Day (substitute day)");
  });

  it("computes Canada's days from the Labour Code rules", () => {
    const ca = new Map(
      rows.filter((r) => r.country === "CA").map((r) => [r.name + r.start.slice(0, 4), r.start]),
    );
    expect(ca.get("Victoria Day2027")).toBe("2027-05-24"); // the Monday before 25 May
    expect(ca.get("Labour Day2027")).toBe("2027-09-06");
    expect(ca.get("Thanksgiving Day2027")).toBe("2027-10-11");
    expect(ca.get("National Day for Truth and Reconciliation2027")).toBe("2027-09-30");
  });

  it("marks only the dates that follow the moon as estimates, and runs Ramadan up to Eid", () => {
    const ae = rows.filter((r) => r.country === "AE");
    expect(
      ae
        .filter((r) => r.estimated)
        .map((r) => r.kind)
        .sort(),
    ).toEqual(["islamic", "islamic", "islamic", "islamic", "ramadan"]);
    const ramadan = ae.find((r) => r.kind === "ramadan")!;
    const eid = ae.find((r) => r.name === "Eid al-Fitr")!;
    expect(addDays(ramadan.end, 1)).toBe(eid.start);
    expect(ae.find((r) => r.name === "National Day" && r.start === "2026-12-02")?.end).toBe(
      "2026-12-03",
    );
    expect(rows.filter((r) => r.country !== "AE").every((r) => !r.estimated)).toBe(true);
  });

  it("stays inside the window and has no dash or exclamation mark in any name", () => {
    for (const r of rows) {
      expect(r.end >= "2026-10-21" && r.start <= "2027-12-31", r.name).toBe(true);
      expect(r.name).not.toMatch(/[—–!]/);
    }
  });
});

describe("what the owner sees", () => {
  const holiday: HolidayInfo = {
    name: "Christmas Day",
    starts_on: "2026-12-25",
    ends_on: "2026-12-25",
    kind: "public",
    estimated: false,
  };
  const eid: HolidayInfo = {
    name: "Eid al-Fitr",
    starts_on: "2027-03-09",
    ends_on: "2027-03-11",
    kind: "islamic",
    estimated: true,
  };
  const form = (o: Partial<Record<"open" | "close" | "from" | "to", string>> = {}) => ({
    open: "10:00",
    close: "16:00",
    from: "2026-12-25",
    to: "2026-12-25",
    ...o,
  });

  it("says the dates in words", () => {
    expect(whenWords("2026-12-25", "2026-12-25")).toBe("Friday 25 December");
    expect(whenWords("2027-03-09", "2027-03-11")).toBe("9 March to 11 March");
  });

  it("reads the answer back before anything is sent", () => {
    expect(readBack(holiday, "closed", form())).toBe("Friday 25 December: Closed");
    expect(readBack(holiday, "custom", form())).toBe("Friday 25 December: 10:00 to 16:00");
    expect(readBack(holiday, "custom", form({ close: "00:00" }))).toBe(
      "Friday 25 December: 10:00 to midnight",
    );
    expect(readBack(holiday, "normal", form())).toContain("normal opening hours stay as they are");
  });

  it("checks custom hours the way the database does", () => {
    const today = "2026-12-20";
    expect(checkAnswer(holiday, "custom", form(), today)).toBeNull();
    expect(checkAnswer(holiday, "custom", form({ open: "12:00", close: "10:00" }), today)).toMatch(
      /after opening time/,
    );
    expect(checkAnswer(holiday, "custom", form({ open: "", close: "" }), today)).toMatch(
      /opening and a closing time/,
    );
    expect(checkAnswer(holiday, "custom", form({ close: "00:00" }), today)).toBeNull();
    expect(
      checkAnswer(holiday, "closed", form({ from: "2026-12-26", to: "2026-12-25" }), today),
    ).toBe("Check the dates.");
    expect(checkAnswer(holiday, "normal", form({ from: "", to: "" }), today)).toBeNull();
  });

  it("lets a moon holiday move three days either way, never into the past", () => {
    const today = "2027-03-01";
    expect(
      checkAnswer(eid, "closed", form({ from: "2027-03-10", to: "2027-03-12" }), today),
    ).toBeNull();
    expect(
      checkAnswer(eid, "closed", form({ from: "2027-03-06", to: "2027-03-14" }), today),
    ).toBeNull();
    expect(
      checkAnswer(eid, "closed", form({ from: "2027-03-05", to: "2027-03-11" }), today),
    ).toMatch(/3 days either way/);
    expect(
      checkAnswer(eid, "closed", form({ from: "2027-02-20", to: "2027-02-27" }), "2027-03-01"),
    ).toMatch(/past|either way/);
  });
});
