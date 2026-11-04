// Polish 2 (lane R's decisions of 3 Nov 2026): the last marketing polish before ads.
import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { EXAMPLE_RESULT, HERO_REPORT, HERO_STREAM } from "@/components/kabsi/d8-data";
import { foundingLinePage } from "@/components/kabsi/founding-line";
import { HOME_FAQ } from "@/components/kabsi/faq-data";
import { industry as industryBySlug } from "@/content/industries";

describe("Polish 2", () => {
  it("leads the Example result with a finding Kabsi acts on today (decision 1)", () => {
    expect(EXAMPLE_RESULT.first.fact).toBe("No opening hours are shown on Google.");
    expect(EXAMPLE_RESULT.first.action).toBe(
      "Kabsi asks you for your hours and sends them to Google once you say yes.",
    );
  });
  it("gives every warning row on the industry Examples its next step (decision 1)", () => {
    for (const slug of ["hair-salon", "barbershop", "nail-salon", "restaurant"]) {
      const rows = industryBySlug(slug)?.d8?.check ?? [];
      expect(rows.length, slug).toBeGreaterThan(0);
      for (const r of rows)
        if (r.tone === "warn") expect(r.next, `${slug} ${r.label}`).toBeTruthy();
      expect(
        rows.some((r) => r.label === "Website" && r.tone === "warn"),
        slug,
      ).toBe(false);
    }
  });
  it("keeps 'Monday receipt' off the website (decision 4)", () => {
    const dir = "src/components/kabsi";
    for (const f of readdirSync(dir)) {
      expect(readFileSync(`${dir}/${f}`, "utf8"), f).not.toMatch(/monday receipt/i);
    }
  });
  it("shows three messages on the hero phone and the weekly report as its own card (decision 3)", () => {
    expect(HERO_STREAM.map((m) => m.id)).toEqual(["hours", "review", "post"]);
    expect(HERO_REPORT.title).toBe("Your weekly report");
  });
  it("shows the Founding 25 line only on Home, Pricing and the /for pages (master plan 30.24)", () => {
    for (const p of ["/", "/pricing", "/for", "/for/barbershop", "/pricing/"])
      expect(foundingLinePage(p), p).toBe(true);
    for (const p of [
      "/how-it-works",
      "/about",
      "/security",
      "/terms",
      "/privacy",
      "/partners",
      "/partners/terms",
      "/login",
      "/founding",
      "/faq",
      "/scan",
      "/format",
    ])
      expect(foundingLinePage(p), p).toBe(false);
  });
  it("says the password point once on Home: in 'You stay in control.', not the questions (decision 8)", () => {
    expect(HOME_FAQ).not.toContain(1);
  });
});
