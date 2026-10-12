import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { RETENTION_ROWS } from "../src/lib/retention";

// The privacy page lists the retention table (K-40). It must match the rows the daily retention job reads.
const SEED = readFileSync("supabase/migrations/20261008200000_retention_policies.sql", "utf8");
const seeded = [...SEED.matchAll(/^\s*\('([a-z_]+)',\s*(null|\d+),/gm)].map((m) => ({
  dataClass: m[1],
  keepDays: m[2] === "null" ? null : Number(m[2]),
}));

describe("retention table on /privacy", () => {
  it("reads the 11 seeded rows", () => {
    expect(seeded).toHaveLength(11);
  });

  it("has the same data classes and day limits as retention_policies", () => {
    const page = RETENTION_ROWS.map(({ dataClass, keepDays }) => ({ dataClass, keepDays }));
    expect(page).toEqual(seeded);
  });

  it("uses no dashes or exclamation marks", () => {
    const text = JSON.stringify(RETENTION_ROWS);
    expect(text).not.toMatch(/[–—!]/);
  });
});
