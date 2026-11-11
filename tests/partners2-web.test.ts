import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  PARTNER_KIND_LABEL,
  PARTNER_KINDS,
  PARTNER_TERMS_VERSION as SERVER_VERSION,
} from "../supabase/functions/_shared/programs.ts";
import {
  PARTNER_COPY,
  PARTNER_KIND_OPTIONS,
  PARTNER_TERMS_VERSION,
  partnerLink,
} from "../src/lib/partner";

// Partners 2 (master plan 30.50 items 4 to 6): the join form and the partner home say what the server checks, in the
// words of docs/COPY.md section 82, with the house rules (no dashes, no exclamation marks, no Arabic).
describe("Partners 2 web", () => {
  it("lists the six kinds in the server's order and words", () => {
    expect(PARTNER_KIND_OPTIONS.map(([k]) => k)).toEqual([...PARTNER_KINDS]);
    for (const [k, label] of PARTNER_KIND_OPTIONS) expect(label).toBe(PARTNER_KIND_LABEL[k]);
  });
  it("agrees to the same terms version as the server records", () => {
    expect(PARTNER_TERMS_VERSION).toBe(SERVER_VERSION);
    expect(readFileSync("src/routes/partners_.terms.tsx", "utf8")).toContain(
      `version ${SERVER_VERSION}`,
    );
  });
  it("builds the link from the code", () => {
    expect(partnerLink("P-AB23CD")).toBe("https://kabsi.co/?via=P-AB23CD");
  });
  it("keeps the house rules in every line", () => {
    const all = JSON.stringify(PARTNER_COPY);
    expect(all).not.toMatch(/[—–!]/);
    expect(all).not.toMatch(/[؀-ۿ]/);
    expect(all).not.toMatch(/Apply|application step|approved by Google|Google partner/);
  });
  it("serves /partners/join and /partners/home; /partner and /partner/ answer 301 to /partners/home (Fix 5)", () => {
    const v = JSON.parse(readFileSync("vercel.json", "utf8")) as {
      redirects: { source: string; destination: string; statusCode?: number }[];
      headers: { source: string; headers: { key: string; value: string }[] }[];
    };
    const sources = v.redirects.map((r) => r.source);
    for (const s of ["/partner/:path*", "/partners/join", "/partners/home", "/partners/:path*"])
      expect(sources).not.toContain(s);
    expect(sources).toContain("/partner/:path+"); // the old partner area's deeper links still go to /partners
    for (const s of ["/partner", "/partner/"])
      expect(v.redirects.find((r) => r.source === s)).toMatchObject({
        destination: "/partners/home",
        statusCode: 301,
      });
    // /partner comes before the deeper rule, so it answers in one hop.
    expect(sources.indexOf("/partner")).toBeLessThan(sources.indexOf("/partner/:path+"));
    const noindex = v.headers.find((h) => h.source === "/partners/:page(join|home)");
    expect(noindex?.headers).toContainEqual({ key: "X-Robots-Tag", value: "noindex" });
    const pages = JSON.parse(readFileSync("src/content/sitemap-pages.json", "utf8")) as { path: string }[];
    expect(pages.map((p) => p.path)).not.toContain("/partners/join");
    expect(pages.map((p) => p.path)).not.toContain("/partners/home");
    expect(readFileSync("src/routes/partners_.home.tsx", "utf8")).toMatch(/content: "noindex"/);
  });
  it("is in docs/COPY.md", () => {
    const copy = readFileSync("docs/COPY.md", "utf8");
    for (const line of [
      PARTNER_COPY.joinLead,
      PARTNER_COPY.payoutNotYet,
      PARTNER_COPY.waitWhatsApp,
      PARTNER_COPY.numbersNote,
    ]) {
      expect(copy).toContain(line);
    }
  });
});
