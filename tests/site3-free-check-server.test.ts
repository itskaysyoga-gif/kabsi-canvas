// SITE-3 step 4: the free check's server path. POST /visibility/check reads only the 3 nearby businesses (one Places Text
// Search); the rank (DataForSEO) and AI answer code stays for the Visibility Map and the AI jobs, but this path no longer
// calls it. The profile check's answer carries the latest review with a template reply and the website's state now.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (p: string) => readFileSync(p, "utf8");
const between = (text: string, from: string, to: string) => {
  const a = text.indexOf(from);
  const b = text.indexOf(to, a + from.length);
  expect(a, from).toBeGreaterThanOrEqual(0);
  expect(b, to).toBeGreaterThan(a);
  return text.slice(a, b);
};

describe("SITE-3: the free check without rank or AI work", () => {
  const index = read("supabase/functions/visibility/index.ts");
  // The function's code without its comments (which explain what it no longer does).
  const start = between(index, "async function startFreeCheck(", "\n}\n").split("\n").filter((l) => !/^\s*\/\//.test(l)).join("\n");

  it("calls the nearby check, never the rank provider, DataForSEO's spend or an AI answer", () => {
    expect(start).toContain("startNearbyCheck(");
    for (const banned of ["startCheck(", "provider(", "freeScanCheck", "dataforseo_mode", "deps.room", "deps.spend", "aiSetting", "liveProfile"]) {
      expect(start, banned).not.toContain(banned);
    }
    expect(start).toMatch(/searchText\(key, q, 8, "places\.id,places\.displayName,places\.rating,places\.userRatingCount"\)/);
  });

  it("keeps the rank and AI code for the Visibility Map and the AI jobs", () => {
    const fc = read("supabase/functions/_shared/visibility/free-check.ts");
    expect(fc).toMatch(/export async function startCheck\(/);
    expect(fc).toMatch(/export async function collectCheck\(/);
    expect(index).toContain("tickAi(aiDeps)");
  });

  it("never stores the nearby businesses: the saved row has none, the answer has them", () => {
    expect(start).toMatch(/fast: r\.fast/);
    expect(start).toMatch(/competitors: started\.competitors/);
    expect(read("supabase/functions/_shared/visibility/free-check.ts")).toMatch(/fast: \{ rank: null, line: "", competitors: \[\] \}/);
  });
});

describe("SITE-3: the profile check's extra parts", () => {
  it("the website look goes through the link watch's safe fetch with the 4 second limit", () => {
    const fn = read("supabase/functions/profile-snapshot/index.ts");
    expect(fn).toMatch(/linkNow\("website", url, \{ resolve: resolveHost, fetch:/);
    expect(read("supabase/functions/_shared/link-watch/link-watch.ts")).toMatch(/export const NOW_MS = 4_000;/);
  });

  it("the reply is a template: the free check makes no model call", () => {
    const imports = (p: string) => read(p).split("\n").filter((l) => /^import /.test(l)).join("\n");
    for (const f of ["supabase/functions/_shared/free-reply.ts", "supabase/functions/_shared/profile-snapshot.ts"]) {
      expect(imports(f), f).not.toMatch(/"\.\/ai\.ts"|ai\/client|ai\/reply\.ts|anthropic/i);
    }
  });
});
