// Web 4 part 3 (Design 8, lane R 1 Nov 2026): the free check's start page says only what the check reads, and the
// result shows Google's required attribution where Places data appears.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (p: string) => readFileSync(p, "utf8");

describe("the free check on Design 8", () => {
  it("names only what Google's public data holds (K-82), with no AI answer and no At launch label (SITE-2, Go live 1)", () => {
    const start = read("src/components/kabsi/d4-free-check.tsx");
    const rows = start.slice(
      start.indexOf("const LOOKS_AT"),
      start.indexOf("function CheckLooksAtVisual"),
    );
    // SITE-2 (blueprint 3.1 section 3): the check reads the public booking link and shows the reply Kabsi would write, so
    // "reply" and "booking" alone are no longer claims; a read of the owner's own replies, special hours or posts still is.
    expect(rows).not.toMatch(
      /replies|repl(y|ies) from you|your replies|special hours|bank holiday|\bposts?\b/i,
    );
    expect(rows).not.toMatch(/ChatGPT/);
    expect(start).not.toMatch(/atLaunch|At launch/);
  });
  it("shows the words Google Maps under the result's Places data, exactly and not translated", () => {
    const live = read("src/components/kabsi/scan-live.tsx");
    expect(live).toContain('<span translate="no">Google Maps</span>');
    // SITE-2: LiveResult and SavedFreeCheck each carry it; the shared result parts (scan-result.tsx) sit under them.
    const result = live.slice(live.indexOf("export function LiveResult"));
    expect(result.match(/<PlacesAttribution/g)?.length).toBeGreaterThanOrEqual(2);
  });
  it("keeps the route heads free of page components (Lean 1)", () => {
    for (const r of [
      "src/routes/scan.index.tsx",
      "src/routes/google-profile-check.tsx",
      "src/routes/index.tsx",
    ]) {
      const head = read(r);
      expect(head).not.toMatch(
        /import \{[^}]*\b(HOME_LINE|CHECK_HERO)\b[^}]*\} from "@\/components\/kabsi\/(d8-data|d4-free-check)"/,
      );
    }
  });
});

describe("the suggestion list opens above the hero visual (Web 4 review)", () => {
  it("lifts the search box's wrapper above the visual on Home and on every PageHero", () => {
    expect(read("src/components/kabsi/page-hero.tsx")).toMatch(
      /className="relative z-10 mt-7 animate-enter"/,
    );
    expect(read("src/components/kabsi/home2-hero.tsx")).toMatch(
      /className="relative z-10 mt-5 max-w-\[36rem\]/,
    );
  });
  it("keeps the free check page off Home's module", () => {
    expect(read("src/components/kabsi/d4-free-check.tsx")).not.toContain('from "./d8-home"');
    expect(read("src/components/kabsi/d4-free-check.tsx")).not.toContain('from "./d9-home"');
  });
});
