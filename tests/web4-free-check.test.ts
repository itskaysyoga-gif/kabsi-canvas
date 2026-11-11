// Web 4 part 3 (Design 8, lane R 1 Nov 2026): the free check's start page says only what the check reads, and the
// result shows Google's required attribution where Places data appears.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (p: string) => readFileSync(p, "utf8");

describe("the free check on Design 8", () => {
  it("names only what Google's public data holds (K-82) and the ChatGPT answer, with no At launch label (Go live 1)", () => {
    const start = read("src/components/kabsi/d4-free-check.tsx");
    const rows = start.slice(
      start.indexOf("const LOOKS_AT"),
      start.indexOf("function CheckLooksAtVisual"),
    );
    expect(rows).not.toMatch(/reply|repl(y|ies) from you|special hours|bank holiday|post|booking/i);
    expect(rows).toContain("What ChatGPT says");
    expect(start).not.toMatch(/atLaunch|At launch/);
  });
  it("shows the words Google Maps under the result's Places data, exactly and not translated", () => {
    const live = read("src/components/kabsi/scan-live.tsx");
    expect(live).toContain('<span translate="no">Google Maps</span>');
    const result = live.slice(
      live.indexOf("export function LiveResult"),
      live.indexOf("function Waitlist"),
    );
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
