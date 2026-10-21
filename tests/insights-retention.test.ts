import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// P0.5-05 (K-26, K-138, K-40): Google's performance figures and the search terms are read when Insights opens and are
// never kept. K-40 allows at most 30 days (class google_performance); this feature keeps them for zero days, so the
// retention job has nothing to purge and nothing can outlive the limit. These checks fail if anything starts storing them.
const strip = (code: string) =>
  code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
const read = (p: string) => strip(readFileSync(p, "utf8"));
const list = (dir: string, ext: RegExp): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? list(join(dir, e.name), ext) : ext.test(e.name) ? [join(dir, e.name)] : [],
  );

describe("nothing from Google's performance data is stored", () => {
  const serverFiles = [
    ...list("supabase/functions/_shared/insights", /\.ts$/).filter((f) => !f.endsWith(".test.ts")),
    "supabase/functions/insights/index.ts",
  ];

  it("the insights function and its modules never write to the database", () => {
    for (const file of serverFiles) {
      expect(read(file), file).not.toMatch(/\.(insert|upsert|update|delete)\(/);
    }
  });

  it("the only database function it calls is the plan check", () => {
    const calls = serverFiles.flatMap((f) =>
      [...read(f).matchAll(/\.rpc\(\s*"([a-z_]+)"/g)].map((m) => m[1]),
    );
    expect(calls).toEqual(["feature_access"]);
  });

  it("the handler has no dependency that could save a figure", () => {
    const deps = read("supabase/functions/_shared/insights/handler.ts").match(
      /export type Deps = \{([\s\S]*?)\n\};/,
    )![1]!;
    expect(deps).not.toMatch(/\b(save|store|write|cache|insert|upsert)\w*\s*:/i);
  });

  it("no migration creates a table or column for figures or search terms", () => {
    for (const file of list("supabase/migrations", /\.sql$/)) {
      expect(readFileSync(file, "utf8"), file).not.toMatch(
        /\b(search_keywords?|search_terms?|insights_value|daily_metrics?|performance_cache|insights_cache)\b/i,
      );
    }
  });

  it("the browser keeps them in memory only", () => {
    for (const file of [
      "src/lib/insights.ts",
      "src/routes/_authenticated/app/insights.tsx",
      "src/components/insights/daily-chart.tsx",
    ]) {
      expect(read(file), file).not.toMatch(/localStorage|sessionStorage|indexedDB/);
    }
  });

  it("/privacy says so", () => {
    const rows = readFileSync("src/lib/retention.ts", "utf8");
    expect(rows).toContain("are not stored");
  });
});
