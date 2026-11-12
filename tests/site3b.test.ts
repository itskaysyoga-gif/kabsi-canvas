// Site 3b part 1 (12 Nov 2026, lane R R-161, master plan 30.50 item 10): the fixes for the audit rows E1 to E15 that
// Site 3a left (docs/site3/audit.md). One primary action per public page (the free check), the footer's operator and Creem
// line, the Security short answers first, one reassurance under the search on /for, the guides' contents links at 24 px.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { MERCHANT_LINE, OPERATOR_LINE, TRIAL_LINE } from "../src/lib/site";

const read = (f: string) => readFileSync(f, "utf8");

describe("Site 3b: one primary action per public page (audit E3, E4, E5, E10; E4 changed by Fix 6)", () => {
  it("/setup-call: the email button is quiet and the page ends with the free check", () => {
    const s = read("src/routes/setup-call.tsx");
    expect(s).toMatch(/buttonClass\("secondary", "lg"\)/);
    expect(s).not.toMatch(/buttonClass\("primary"/);
    expect(s).not.toContain("data-main-cta");
    expect(s).toContain("<Closing />");
  });
  it("/manager-steps: setup is the one yellow action and the free check is a quiet link (Fix 6, R-162)", () => {
    const s = read("src/components/kabsi/d2-flow.tsx");
    // "Show me how" and "Continue" are primary; nothing on the page is a secondary button standing in for them.
    expect(s).toMatch(/href="#how" className=\{buttonClass\(\)\}/);
    expect(s).toMatch(/<ButtonLink to="\/setup-call">Continue<\/ButtonLink>/);
    expect(s).not.toMatch(/to="\/setup-call" variant="secondary"/);
    // The free check is a text link to /scan, not the Closing band with its yellow search box.
    expect(s).not.toContain("<Closing");
    expect(s).not.toContain("<ScanBox");
    expect(s).toMatch(/<SiteLink\s+to="\/scan"/);
    expect(s).toContain("{MAIN_CTA}");
  });
  it("the 404: the free check is the yellow button, Go home a quiet link", () => {
    const s = read("src/components/kabsi/status-pages.tsx");
    expect(s).toMatch(/<ButtonLink to="\/scan">Check my business free<\/ButtonLink>/);
    expect(s).toMatch(/<ButtonLink to="\/" variant="tertiary">\s*Go home/);
  });
  it("About, Security and the FAQ: the hero's free check is the search box with the trial line (audit E11)", () => {
    for (const f of ["about", "security", "faq"]) {
      const d = read(`src/components/kabsi/d8-${f}.tsx`);
      expect(d, f).toContain('action={<ScanBox id="hero-scan" note={TRIAL_LINE} />}');
      expect(d, f).toContain("under={null}");
    }
  });
  it("/guides: the hero has the free check and the trial line", () => {
    const s = read("src/routes/guides.index.tsx");
    expect(s).toMatch(/<ButtonLink to="\/scan">\{MAIN_CTA\}<\/ButtonLink>/);
    expect(s).toContain("{TRIAL_LINE}");
  });
});

describe("Site 3b: the footer, the contents links and the headings (audit E1, E2, E7)", () => {
  it("the footer carries the operator and Creem lines, and the quiet row has no wide links", () => {
    const f = read("src/components/kabsi/site-footer.tsx");
    expect(f).toContain("{OPERATOR_LINE} {MERCHANT_LINE}");
    expect(f).not.toMatch(/quietLink =\s*"[^"]*min-w-11/);
    expect(OPERATOR_LINE).toBe("Kabsi is operated by Rashid Abou Hamzy. Contact: hello@kabsi.co.");
    expect(MERCHANT_LINE).toBe("Card payments will be processed by Creem, our merchant of record.");
  });
  it("the FAQ's side list keeps the yellow bar for headlines only", () => {
    const f = read("src/components/kabsi/d8-faq.tsx");
    const side = f.slice(f.indexOf('aria-label="Jump to a topic"'), f.indexOf("max-w-3xl"));
    expect(side).not.toContain("<Marked");
  });
  it("a guide's contents links are at least 24 px tall", () => {
    expect(read("src/components/marketing/guide-article.tsx")).toMatch(
      /className="py-1\.5 text-text-1 underline/,
    );
  });
  it("an industry page's cards are h3 straight under their section headline", () => {
    const d = read("src/components/kabsi/d9-industry.tsx");
    expect(d).toMatch(/<CardGrid items=\{i\.profile\} className="mt-8" level="h3" \/>/);
  });
});

describe("Site 3b: one reassurance under the search on /for and the industry pages (audit E8, E9)", () => {
  const d = read("src/components/kabsi/d9-industry.tsx");
  it("the hero boxes and the closing say the trial line only", () => {
    expect(d).not.toContain("trialSeparate");
    expect(d.match(/note=\{TRIAL_LINE\}/g)).toHaveLength(3);
    expect(d).toMatch(/keywordHint=\{false\}/);
    expect(TRIAL_LINE).toBe("Free for 14 days once Kabsi is connected. No card.");
  });
});

describe("Site 3b: Security answers first, the sign-in picture, the route list", () => {
  it("Security opens its summary with password, Manager access, approval and removal", () => {
    const s = read("src/components/kabsi/d8-security.tsx");
    const list = s.slice(
      s.indexOf("const SUMMARY = ["),
      s.indexOf("] as const;", s.indexOf("const SUMMARY = [")),
    );
    const lines = [...list.matchAll(/^\s+"([^"]+)",$/gm)].map((m) => m[1]);
    expect(lines.slice(0, 4)).toEqual([
      "Kabsi never sees your Google password.",
      "Kabsi works as a Manager you add on Google. You stay the owner.",
      "Nothing goes live without your yes.",
      "You can remove Kabsi as a Manager any time.",
    ]);
    // On a phone the list comes before the picture.
    expect(s.indexOf("{SUMMARY.map")).toBeLessThan(s.indexOf("PHOTOS.phoneReading"));
  });
  it("the sign-in page shows Home's Look 2 Example, not the old Design 9 phone", () => {
    const l = read("src/routes/login.tsx");
    expect(l).toContain("Look2Phone");
    expect(l).not.toMatch(/D9Phone|D9_HERO_STREAM/);
    expect(read("src/components/kabsi/look2.tsx")).toContain("export function Look2Phone");
  });
  it("scripts/routes.json lists each page once (/for/beauty-and-wellness is a 301 since Industries 2)", () => {
    const paths = (JSON.parse(read("scripts/routes.json")) as { path: string }[]).map(
      (r) => r.path,
    );
    expect(new Set(paths).size).toBe(paths.length);
    expect(paths).not.toContain("/for/beauty-and-wellness");
  });
});
