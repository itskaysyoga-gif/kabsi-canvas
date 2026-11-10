// Polish 2 (lane R's decisions of 3 Nov 2026): the last marketing polish before ads.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { EXAMPLE_RESULT, HERO_REPORT, HERO_STREAM } from "@/components/kabsi/d8-data";
import { HOME_FAQ } from "@/components/kabsi/faq-data";
import { industry as industryBySlug } from "@/content/industries";

describe("Polish 2", () => {
  // Changed on purpose by Fix 2 (master plan 30.27 item 2): the Example no longer says "no hours" while its AI answer
  // compares a Saturday closing time with the profile; the first finding is still one Kabsi acts on today.
  it("leads the Example result with a finding Kabsi acts on today (decision 1, Fix 2)", () => {
    expect(EXAMPLE_RESULT.first.fact).toBe("Google shows no photos for this business.");
    expect(EXAMPLE_RESULT.first.action).toBe(
      "Kabsi asks for photos from your phone and prepares them for you to approve.",
    );
  });
  it("keeps the Example result consistent: the profile shows Saturday to 18:00, the AI answer 17:00 (Fix 2)", () => {
    const sat = EXAMPLE_RESULT.found.find((f) => f.label === "Saturday");
    expect(sat?.value).toBe("09:00 to 18:00");
    expect(EXAMPLE_RESULT.ai.line).toContain("Saturday as 17:00");
    expect(EXAMPLE_RESULT.found.some((f) => f.label === "Photos")).toBe(false);
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
  it("has no Founding 25 line above any header: Founding 25 is private (Founding 1, R-151; was master plan 30.24)", () => {
    expect(existsSync("src/components/kabsi/founding-line.tsx")).toBe(false);
    expect(readFileSync("src/components/kabsi/site-chrome.tsx", "utf8")).not.toContain(
      "FoundingLine",
    );
  });
  it("says the password point once on Home: in 'You stay in control.', not the questions (decision 8)", () => {
    expect(HOME_FAQ).not.toContain(1);
  });
});
