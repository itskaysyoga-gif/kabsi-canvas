// SITE-3 (R-164 item 7): one design system across the public pages and the home page redone to convert.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { TRIAL_LINE } from "../src/lib/offer";
import {
  HERO_MARKS,
  HERO_SCENES,
  PRICE,
  PROBLEM,
  TELL,
  WEEK,
} from "../src/components/marketing/v31-data";
import { ALL_GUIDES } from "../src/content/guides";
import { publicGuides, SITE3_PUBLISH_AT } from "../src/content/guides/schedule";

const read = (f: string) => readFileSync(f, "utf8");

describe("SITE-3: the home page", () => {
  it("puts three short marks under the hero button", () => {
    expect([...HERO_MARKS]).toEqual([
      "No Google password",
      "Nothing goes live without your yes",
      "Cancel any time",
    ]);
  });
  it("plays three scenes in a phone labelled Example, still for reduced motion, with a pause button", () => {
    expect(HERO_SCENES.map((s) => s.name)).toEqual([
      "A review reply approved",
      "Saturday's hours approved",
      "A photo posted",
    ]);
    const home = read("src/components/marketing/v31.tsx");
    // SITE-4: the scenes play turn by turn (typing dots first) and stand still under reduced motion or when paused.
    expect(read("src/components/marketing/life.tsx")).toContain(
      'matchMedia("(prefers-reduced-motion: reduce)")',
    );
    expect(home).toContain("const reduced = useReducedMotion();");
    expect(home).toContain("const playing = !reduced && !paused;");
    expect(home).toContain('playing && "kb-play"');
    expect(read("src/styles.css")).toContain(".kb-play .kb-dots");
    expect(home).toContain("Pause the example");
    expect(home).not.toMatch(/WhatsAppGlyph|bg-wa-|text-wa-/);
  });
  it("sources every problem point from Google's own help pages, with no numbers made up", () => {
    expect(PROBLEM.points).toHaveLength(3);
    for (const p of PROBLEM.points) {
      expect(p.source).toMatch(/^https:\/\/support\.google\.com\/business\/answer\/\d+/);
      expect(p.text).not.toMatch(/\d+ ?(%|percent)/);
    }
  });
  it("draws the week as four days, each with a small card", () => {
    expect(WEEK.days.map((d) => d.day)).toEqual(["Monday", "Wednesday", "Friday", "Next Monday"]);
    expect(read("src/components/marketing/v31.tsx")).toContain("<DayPicture n={i} />");
  });
  it("shows the voice note line and keeps the answer panel tall enough not to jump", () => {
    expect(TELL.voice).toBe("Or send a voice note.");
    expect(read("src/components/marketing/v31.tsx")).toContain("min-h-[21rem]");
  });
  it("puts TRIAL_LINE beside the price card's button, in full", () => {
    expect(PRICE.terms).toBe(TRIAL_LINE);
  });
  it("has the yellow bar on the H1 and one other headline only", () => {
    const home = read("src/components/marketing/v31.tsx");
    const body = home.slice(
      home.indexOf("export function V31Home"),
      home.indexOf("/* ---------- Pricing"),
    );
    expect(body.match(/mark=/g) ?? []).toHaveLength(0);
    // The H1 (HOME_HERO.mark) and the week's headline ("with Kabsi.").
    expect(home.match(/mark=\{HOME_HERO\.mark\}|mark="with Kabsi\."/g)).toHaveLength(2);
  });
});

describe("SITE-3: the rules for every public page", () => {
  it("reads darker and larger: the reading grey and the 17 to 18 px size, scoped to public pages", () => {
    const css = read("src/styles.css");
    expect(css).toContain("--kb-slate: #3d3b37;");
    expect(css).toContain("--text-read: clamp(1.0625rem, 1.02rem + 0.18vw, 1.125rem);");
    expect(css).toMatch(/\.page-light main \{\s*--text-2: var\(--kb-slate\);/);
  });
  it("draws the yellow bar in a section headline only when the page asks (kit.tsx)", () => {
    expect(read("src/components/marketing/kit.tsx")).toContain(
      "{mark ? <Marked text={title} mark={mark} /> : title}",
    );
    for (const f of [
      "src/components/marketing/v31-pages.tsx",
      "src/components/kabsi/scan-result.tsx",
    ])
      expect(read(f)).not.toMatch(/<Marked text="[^"]+" mark=/);
  });
  it("publishes the three new guides now (R-164 item 5)", () => {
    const now = new Date(SITE3_PUBLISH_AT);
    const live = publicGuides(ALL_GUIDES, now).map((g) => g.slug);
    for (const s of [
      "where-to-put-your-google-review-link",
      "ask-for-google-reviews-from-jobber",
      "ask-for-google-reviews-from-calendly",
    ])
      expect(live).toContain(s);
    expect(Date.parse(SITE3_PUBLISH_AT)).toBeLessThan(Date.parse("2026-11-25T00:00:00Z"));
  });
});
