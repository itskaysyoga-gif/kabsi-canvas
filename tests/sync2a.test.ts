// Sync 2a (R-142, master plan 30.46): lane R's answers to Sync 1. Each part adds its guards here.
import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { HELP_LINES, WORKING_HOURS } from "@/lib/site";
import { PLANS } from "@/components/kabsi/plans";

const read = (p: string) => readFileSync(p, "utf8");
const facts = readdirSync("knowledge/facts")
  .filter((f) => /^\d\d-.*\.md$/.test(f))
  .map((f) => ({ f, text: read(`knowledge/facts/${f}`) }));

describe("Sync 2a part 1", () => {
  it("item 1: no fact says early access, test mode, 20 businesses, hand posting or Google Protection off", () => {
    for (const { f, text } of facts) {
      expect(text, f).not.toMatch(/early[- ]access/i);
      expect(text, f).not.toMatch(/\bTest mode\b/);
      expect(text, f).not.toMatch(/limited to 20 businesses/i);
      expect(text, f).not.toMatch(/Google Protection (is|stays) off/i);
    }
    for (const g of ["how-to-set-holiday-hours-on-google", "someone-changed-my-hours-on-google"]) {
      expect(read(`src/content/guides/${g}.tsx`)).not.toMatch(/early access/i);
    }
  });

  it("item 2: the tattoo job and card say house rules, and the no-shows guide keeps one Kabsi line", () => {
    const tattoo = read("src/content/industries/tattoo-studio.ts");
    expect(tattoo).toContain('title: "House rules in your description, kept right"');
    expect(tattoo).toContain('card: "House rules right, healed work as posts."');
    expect(tattoo).not.toMatch(/booking rules/i);
    const guide = read("src/content/guides/reply-to-reviews-about-no-shows-and-cancellation-fees.tsx");
    expect(guide).toContain("Kabsi works only with your Google profile.");
    expect(guide).not.toContain("booking system");
  });

  it("item 5: no owner line says API for ChatGPT, Perplexity or Google, and the Pro line is the approved one", () => {
    for (const p of ["src/components/kabsi/d8-about.tsx", "src/components/kabsi/d9-data.ts", "src/components/kabsi/faq-data.ts"]) {
      expect(read(p), p).not.toMatch(/(ChatGPT|Perplexity|OpenAI|Google)[^.]*\bAPI\b/);
    }
    expect(read("src/components/kabsi/d8-about.tsx")).toContain("Kabsi connects to your Google Business Profile with your permission.");
    expect(read("src/components/kabsi/d9-data.ts")).toContain("Answers we get from ChatGPT and Perplexity directly, which can differ from what their apps show.");
    expect(PLANS.find((p) => p.id === "pro")?.line).toBe("For a busier business: a post every week and a team that approves.");
    expect(read("src/components/kabsi/plans.ts")).not.toMatch(/menu and offers/);
  });

  it("item 7: the hand-off times in say.ts are the help lines and the working hours of site.ts", () => {
    const say = read("supabase/functions/_shared/whatsapp/say.ts");
    expect(HELP_LINES.essentials).toContain("the same working day");
    expect(HELP_LINES.pro).toContain("within 4 working hours");
    expect(say).toContain('essentials: "the same working day"');
    expect(say).toContain('pro: "within 4 working hours"');
    expect(say).toContain('other: "within one working day"');
    expect(say).toContain(`HANDOFF_HOURS = "${WORKING_HOURS}"`);
    const nora = read("supabase/functions/_shared/whatsapp/nora.ts");
    expect(say + nora).not.toContain("business day");
  });

  it("item 7: the scan and partner code replies carry no promise", () => {
    const say = read("supabase/functions/_shared/whatsapp/say.ts");
    expect(say).toContain("You can check your business free at ${scanResultUrl(null)} and send me the code from the page.");
    expect(say).toContain('partnerCodeNoted: "Thanks, your partner code is noted."');
    expect(say).not.toMatch(/as soon as maps are switched on|your free Pro trial is 30 days/);
  });
});
