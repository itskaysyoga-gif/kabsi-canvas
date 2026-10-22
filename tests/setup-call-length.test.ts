// The free setup call is 20 minutes everywhere (R-31, SETUP_CALL_MINUTES in src/lib/site.ts). K-111 once said 15; the plan
// and the audit keep that history, but nothing Kabsi shows or says may. This scans what ships and what Nora reads.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SETUP_CALL_MINUTES } from "../src/lib/site";

const roots = [
  "src",
  "supabase/functions",
  "knowledge",
  "public",
  "emails",
  "docs/marketing",
  "docs/email-previews",
];
function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx|js|md|txt|html|py)$/.test(name)) out.push(p);
  }
  return out;
}

describe("the setup call is 20 minutes", () => {
  it("is 20 in the one constant", () => {
    expect(SETUP_CALL_MINUTES).toBe(20);
  });

  it("is never 15 or 30 minutes in anything that ships or that Nora reads", () => {
    const wrong =
      /\b(10|15|30|45|60)[- ]?(minutes?|min)\b[^.\n]{0,30}\b(setup )?call\b|\b(setup call|call with kabsi)\b[^.\n]{0,40}\b(10|15|30|45|60)[- ]?(minutes?|min)\b/i;
    const hits: string[] = [];
    for (const root of roots)
      for (const f of walk(root))
        for (const [i, line] of readFileSync(f, "utf8").split("\n").entries())
          if (
            wrong.test(line) &&
            !/ago|cache|retry|within|in the last|every|for \d|waited|hold|rate/i.test(line)
          )
            hits.push(`${f}:${i + 1}`);
    expect(hits).toEqual([]);
  });
});
