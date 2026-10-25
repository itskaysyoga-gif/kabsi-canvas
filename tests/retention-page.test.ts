import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { RETENTION_ROWS } from "../src/lib/retention";

// The privacy page lists the retention table (K-40). It must match the rows the daily retention job reads.
const SEED = readFileSync("supabase/migrations/20261008200000_retention_policies.sql", "utf8");
const seeded = [...SEED.matchAll(/^\s*\('([a-z_]+)',\s*(null|\d+),/gm)].map((m) => ({
  dataClass: m[1],
  keepDays: m[2] === "null" ? null : Number(m[2]),
}));
// Later migrations that change a limit ("set keep_days = 7 ... where data_class = 'x'"), applied in file order.
for (const f of readdirSync("supabase/migrations")
  .filter((f) => f > "20261008200000")
  .sort()) {
  const sql = readFileSync(`supabase/migrations/${f}`, "utf8");
  for (const m of sql.matchAll(
    /update public\.retention_policies\s+set keep_days = (null|\d+)[^;]*?where data_class = '([a-z_]+)'/g,
  )) {
    const row = seeded.find((r) => r.dataClass === m[2]);
    if (row) row.keepDays = m[1] === "null" ? null : Number(m[1]);
  }
}

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
