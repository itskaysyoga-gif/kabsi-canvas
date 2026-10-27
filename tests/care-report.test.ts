import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// P0.5-04 (K-28, K-72, K-40): the Weekly Care Report. The checks that hold the rules in place: Monday 08:00, Kabsi's own
// counts only from the audit log, Google's numbers dropped after 30 days, no review text, no money.
const read = (p: string) => readFileSync(p, "utf8");
const strip = (code: string) =>
  code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

describe("the Weekly Care Report", () => {
  const report = strip(read("supabase/functions/_shared/report.ts"));
  const sql = read("supabase/migrations/20261021270000_care_report.sql");

  it("goes out on Monday from 08:00 local time", () => {
    expect(report).toMatch(/weekday !== "Mon" \|\| hour < 8/);
    expect(report).not.toMatch(/hour < 9/);
  });

  it("makes Kabsi's counts in one database function over the audit log, and nowhere else", () => {
    expect(report).toMatch(/rpc\("care_report_inputs"/);
    const fn = sql.slice(
      sql.indexOf("create function public.care_report_inputs"),
      sql.indexOf("create function public.clear_old_report_numbers"),
    );
    expect(fn).toMatch(/from public\.audit_events e/);
    // The counts read the audit log; the lists read tasks; the other reads are the business and its plan.
    const tables = [...fn.matchAll(/\bfrom (public\.[a-z_]+)/g)].map((m) => m[1]);
    expect([...new Set(tables)].sort()).toEqual([
      "public.audit_events",
      "public.locations",
      "public.tasks",
    ]);
  });

  it("keeps no review text: the blocks hold counts, task titles and Kabsi's own sentences", () => {
    const compose = strip(read("supabase/functions/_shared/care-report/compose.ts"));
    expect(compose).not.toMatch(/comment|reviewer|review_text|quote/i);
    expect(sql).not.toMatch(/\bcomment\b/);
    expect(read("supabase/functions/_shared/report.ts")).not.toMatch(/select\([^)]*comment/);
  });

  it("drops Google's numbers from copies older than 30 days and leaves Kabsi's counts", () => {
    const fn = sql.slice(sql.indexOf("create function public.clear_old_report_numbers"));
    expect(fn).toMatch(/data - 'activity' - 'terms'/);
    expect(fn).toMatch(/interval '30 days'/);
    expect(fn).not.toMatch(/'care'|'time_saved'/);
    expect(report).toMatch(/rpc\("clear_old_report_numbers"\)/);
  });

  it("says the time saved is an estimate, with its formula, and never in money", () => {
    const compose = read("supabase/functions/_shared/care-report/compose.ts");
    expect(compose).toContain("It is an estimate, counted from what Kabsi did.");
    expect(compose).toContain("5 minutes for each reply sent to Google, 15 for each update");
    const formula = /export const FORMULA =\s*"([^"]+)"/.exec(compose)![1]!;
    expect(formula).not.toMatch(/[$€£]|money|dollar/i);
  });

  it("uses plain words only: no dashes and no exclamation marks in what the owner reads", () => {
    for (const f of [
      "supabase/functions/_shared/care-report/compose.ts",
      "src/components/report/care-blocks.tsx",
    ]) {
      const text = [...strip(read(f)).matchAll(/(["'`])((?:\\.|(?!\1).)*?)\1/g)]
        .map((m) => m[2])
        .join(" ");
      expect(text, f).not.toMatch(/[\u2013\u2014]|!/);
    }
  });
});
