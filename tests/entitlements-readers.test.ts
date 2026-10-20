import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

// P0.4-06 (K-101, R-24): features ask public.entitlements what a business may do; none reads the `plans` rows or the
// plans_v2 switch itself. Only billing's own screens and payment plumbing still touch `plans`, until Creem (P0.4-07)
// moves payments onto the organisation. The database side is checked in supabase/tests/trial.sql.
const ROOT = join(__dirname, "..");
const BILLING = new Set([
  "src/routes/_authenticated/app/plan.tsx", // the plan and payments screen (NOWPayments history)
  "supabase/functions/_shared/payments.ts", // records a payment against its plan row
  "supabase/functions/partner/index.ts", // partner invoices
]);

function walk(dir: string, out: string[] = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\.ts$/.test(name) && !name.endsWith(".gen.ts"))
      out.push(p);
  }
  return out;
}
const files = [...walk(join(ROOT, "src")), ...walk(join(ROOT, "supabase", "functions"))];

describe("features read entitlements, not plans (P0.4-06)", () => {
  it("only billing reads the plans table", () => {
    const readers = files
      .filter((f) => /\.from\(\s*["']plans["']\s*\)/.test(readFileSync(f, "utf8")))
      .map((f) => relative(ROOT, f))
      .sort();
    expect(readers.filter((f) => !BILLING.has(f))).toEqual([]);
  });

  it("no code reads the plans_v2 switch", () => {
    const readers = files
      .filter((f) => /["']plans_v2["']|plans_v2_on/.test(readFileSync(f, "utf8")))
      .map((f) => relative(ROOT, f));
    expect(readers).toEqual([]);
  });

  it("the gated features ask entitlements", () => {
    for (const f of [
      "supabase/functions/_shared/backlog.ts",
      "supabase/functions/api/cron.ts",
      "supabase/functions/assistant/index.ts",
      "src/lib/home.ts",
      "src/routes/_authenticated/app/index.tsx",
    ]) {
      expect(readFileSync(join(ROOT, f), "utf8"), f).toMatch(/entitlements|loadEntitlements/);
    }
  });
});
