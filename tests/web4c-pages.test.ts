// Web 4c part 1 (Design 8, lane R 1 Nov 2026): FAQ, About, Security, Founding 25 and Partners. The FAQ's five groups are
// the FAQPage data word for word; the free check answer names only what the check reads (decision 10); no founding
// count is typed (decision 2); /founding's example number follows the visitor's country (decision 4); the WhatsApp
// answers follow the switch (decision 6).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FAQ_ALL, FAQ_GROUPS, FOUNDING_FAQ, PARTNER_FAQ } from "@/components/kabsi/faq-data";
import { faqJsonLd } from "@/lib/faq";
import { KABSI_GROUP_ID, WHATSAPP_ON } from "@/lib/site";

const read = (p: string) => readFileSync(p, "utf8");

describe("/faq on Design 8", () => {
  it("has the five groups in lane R's order", () => {
    expect(FAQ_GROUPS.map((g) => g.title)).toEqual([
      "Getting started",
      "Google and control",
      "Plans and billing",
      "WhatsApp",
      "Privacy and data",
    ]);
    expect(FAQ_ALL.length).toBe(26);
    expect(new Set(FAQ_ALL.map((f) => f.q)).size).toBe(26);
  });
  it("gives the FAQPage data the visible answers word for word", () => {
    const ld = faqJsonLd(FAQ_ALL);
    expect(ld.mainEntity.map((q) => q.acceptedAnswer.text)).toEqual(FAQ_ALL.map((f) => f.a));
    expect(read("src/routes/faq.tsx")).toContain("faqJsonLd(FAQ_ALL)");
  });
  it("says the free check reads only Google's public data (K-82)", () => {
    const a = FAQ_ALL.find((f) => f.q === "What does the free check show?")!.a;
    expect(a).not.toMatch(/special hours|repl|post|booking/i);
    expect(a).toMatch(/hours/);
  });
  it("names the group ID from the one constant", () => {
    const a = FAQ_ALL.find((f) => f.q === "How do I add Kabsi to my Google profile?")!.a;
    expect(a).toContain(KABSI_GROUP_ID);
    expect(read("src/components/kabsi/faq-data.ts")).not.toMatch(/5481006796/);
  });
  it("answers WhatsApp by the switch", () => {
    const a = FAQ_ALL.find((f) => f.q === "Can I approve a reply or a post on WhatsApp?")!.a;
    expect(a.startsWith(WHATSAPP_ON ? "Yes." : "Not yet.")).toBe(true);
  });
});

describe("Founding 25 and Partners on Design 8", () => {
  const founding = read("src/components/kabsi/d5-founding.tsx");
  it("types no count of places left", () => {
    expect(founding).not.toMatch(/\d+ of 25 places left/);
    expect(founding).toContain("places.left");
  });
  it("picks the example number by the visitor's country", () => {
    expect(founding).toContain("onConsentChange");
    for (const n of ["+971 50 123 4567", "+44 7700 900123", "+1 202 555 0143"])
      expect(founding).toContain(n);
    expect(founding).toContain("With the country code, for example ${example}.");
  });
  it("carries FAQPage data on /founding and /partners", () => {
    expect(FOUNDING_FAQ.length).toBe(4);
    expect(PARTNER_FAQ.length).toBe(4);
    expect(read("src/routes/founding.tsx")).toContain("faqJsonLd(FOUNDING_FAQ)");
    expect(read("src/routes/partners.tsx")).toContain("faqJsonLd(PARTNER_FAQ)");
  });
  it("keeps every page head free of page components (Lean 1)", () => {
    for (const r of ["faq", "about", "security", "founding", "partners"]) {
      const head = read(`src/routes/${r}.tsx`);
      expect(head, r).toMatch(/hero-lines/);
      expect(head, r).toMatch(/crumbs:/);
    }
  });
});
