// Site 3a (master plan 30.50 item 10, as changed by 30.51): one main action and one reassurance on Home, Pricing, How it
// works and the free check result; Home's one WhatsApp demonstration in the Look 2 frame; the launch price beside the
// plans; words before numbers in the saved result; the offers table; no Founding 25 in DESIGN.md.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { D9_DEMO, D9_HANDLES, D9_THREE_STEPS } from "@/components/kabsi/d9-data";
import { nearbyWords, SAVED_NOT_KEPT } from "@/lib/scan-words";

const read = (f: string) => readFileSync(f, "utf8");
const DASH_OR_BANG = /[\u2013\u2014!]/;

describe("Site 3a: one main action, one reassurance", () => {
  it("puts only TRIAL_LINE beside the free check on Home and in the closing check", () => {
    const hero = read("src/components/kabsi/d9-hero.tsx");
    expect(hero).toContain('<ScanBox id="hero-scan" note={TRIAL_LINE} />');
    expect(hero).not.toContain("HERO_PRICE_LINE");
    expect(hero).not.toContain("trialSeparate");
    const closing = read("src/components/kabsi/closing.tsx");
    expect(closing).toContain("note={TRIAL_LINE}");
    expect(closing).not.toContain("SCAN_LINE");
  });
  it("keeps Pricing to one yellow button: Start free is a link, the launch price sits above the plans", () => {
    const p = read("src/components/kabsi/d8-pricing.tsx");
    expect(p).not.toMatch(/<ButtonLink[\s\S]{0,200}Start free/);
    expect(p).toContain("startFreeHref(door)");
    expect(p.indexOf("foundingPlacesLine(left)")).toBeLessThan(p.indexOf("{PLANS.map("));
    expect(p).not.toMatch(/founding price/i);
  });
  it("orders How it works: what Kabsi does, what you approve, what happens next, then the Manager detail", () => {
    const h = read("src/components/kabsi/how-page.tsx");
    const at = ["<HandlesGroups", "<DemoThreeCases", 'id="next-h"', 'id="manager-h"'].map((x) =>
      h.indexOf(x),
    );
    expect(at.every((i) => i > 0)).toBe(true);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
    expect(h.indexOf("KABSI_GROUP_ID}")).toBeGreaterThan(h.indexOf('id="manager-h"'));
  });
});

describe("Site 3a: Home's one WhatsApp demonstration (Look 2, 30.50 item 2)", () => {
  for (const m of [D9_DEMO.alert, D9_DEMO.done]) {
    it(`${m.id}: a title of five words or fewer, at most 3 buttons, the yes first`, () => {
      expect(m.title.split(" ").length).toBeLessThanOrEqual(5);
      expect((m.buttons ?? []).length).toBeLessThanOrEqual(3);
      if (m.id === "review") expect(m.buttons?.[0]).toBe("Approve");
      for (const l of [m.title, m.status, ...m.facts.map((f) => f.text)])
        expect(l).not.toMatch(DASH_OR_BANG);
    });
  }
  it("is labelled Example and keeps the three states apart", () => {
    expect(read("src/components/kabsi/d9-home-lower.tsx")).toMatch(/<ExampleBadge[^>]*\/>/);
    expect(D9_DEMO.states).toEqual(["Approved", "Sent to Google", "Live on Google"]);
  });
  it("names the four groups with the four approved jobs", () => {
    expect(D9_HANDLES.map((h) => h.title)).toEqual([
      "Reply to every review",
      "Keep your details right",
      "Post when something changes",
      "See the work, every Monday",
    ]);
    expect(D9_THREE_STEPS).toHaveLength(3);
    for (const s of [...D9_HANDLES, ...D9_THREE_STEPS])
      expect(`${s.title} ${s.text}`).not.toMatch(DASH_OR_BANG);
  });
});

describe("Site 3a: the free check result", () => {
  it("says the nearby finding in words, with no number, before the position", () => {
    expect(nearbyWords("barber shop", 2)).toBe(
      "When someone nearby searches for 'barber shop', you come up near the top of Google Maps.",
    );
    expect(nearbyWords("barber shop", 9)).toContain("but not near the top");
    expect(nearbyWords("barber shop", null)).toContain("did not come up");
    for (const r of [1, 3, 4, 20, 21, null])
      expect(nearbyWords("cafe", r).replace("'cafe'", "")).not.toMatch(/\d/);
    expect(SAVED_NOT_KEPT).toContain("Kabsi could not check it here");
  });
  it("lists what Kabsi could not check apart from what is missing", () => {
    const s = read("src/components/kabsi/scan-live.tsx");
    expect(s).toContain('s.flags.filter((f) => f.tone === "neutral")');
    expect(s).toContain("Could not check");
    expect(s).toContain('{r.value ?? "Missing"}');
  });
});

describe("Site 3a: the docs", () => {
  it("has the offers table in SYNC.md with the four offers", () => {
    const sync = read("docs/SYNC.md");
    const table = sync.slice(sync.indexOf("## 2a. Offers"), sync.indexOf("## 3. The website"));
    for (const o of [
      "The 14 day trial",
      "The launch price",
      "The partner 30 day trial",
      "Founding 25",
    ])
      expect(table).toContain(o);
    expect(table).toContain("Private, invite only");
  });
  it("no longer names Founding 25 in DESIGN.md (R-154)", () => {
    expect(read("DESIGN.md")).not.toContain("Founding 25");
  });
});
