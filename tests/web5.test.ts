// Web 5 (Design 9 on kabsi.co, master plan 30.24): the rules the new Home and shell must keep.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { NEARBY_ON, WHATSAPP_ON } from "@/lib/site";
import {
  D9_HERO_STREAM,
  D9_MAP_POINTS,
  D9_PHOTO,
  D9_SHOW_UP,
  D9_WATCH,
} from "@/components/kabsi/d9-data";

const read = (f: string) => readFileSync(f, "utf8");

describe("Design 9 Home (Web 5 part B)", () => {
  it("marks only the H1's second sentence with the yellow bar, once", () => {
    const hero = read("src/components/kabsi/d9-hero.tsx");
    expect(hero.match(/className="d9-mark"/g)).toHaveLength(1);
    expect(read("src/components/kabsi/d9-home.tsx")).not.toContain("d9-mark");
  });
  it("keeps the product's own buttons (30.24 item 2)", () => {
    const by = Object.fromEntries(D9_HERO_STREAM.map((m) => [m.id, m.buttons]));
    expect(by["review"]).toEqual(["Yes", "Edit", "Skip"]);
    expect(by["post"]).toEqual(["Approve", "Edit", "Skip"]);
    expect(D9_PHOTO.buttons).toEqual(["Approve", "Edit", "Skip"]);
  });
  it("says a photo with no words also waits for the owner's yes (30.24 item 2)", () => {
    expect(D9_PHOTO.noWords).toContain("after your yes");
  });
  it("labels Where you show up At launch until NEARBY_ON", () => {
    expect(D9_SHOW_UP.atLaunch).toBe(!NEARBY_ON);
  });
  it("says the map count the sample points really show", () => {
    const top3 = D9_MAP_POINTS.filter((p) => p.rank <= 3).length;
    expect(D9_SHOW_UP.map.count).toBe(
      `You came up in the first 3 at ${top3} of ${D9_MAP_POINTS.length} places Kabsi checked.`,
    );
  });
  it("promises WhatsApp on the profile watch only once the number is set", () => {
    expect(D9_WATCH.line.includes("on WhatsApp once it opens")).toBe(!WHATSAPP_ON);
    const home =
      read("src/components/kabsi/d9-home.tsx") + read("src/components/kabsi/d9-hero.tsx");
    expect(home.match(/\{!WHATSAPP_ON && \(/g)?.length).toBeGreaterThanOrEqual(2);
  });
  it("uses the facts' watched list and promises no put-back without a yes", () => {
    expect(D9_WATCH.watched).not.toContain("Description");
    expect(D9_WATCH.rules.map((r) => r.title)).toEqual([
      "Keep my information",
      "Google is right",
      "Never by itself",
    ]);
  });
  it("has no dashes, exclamation marks or Arabic in its lines", () => {
    for (const f of [
      "src/components/kabsi/d9-data.ts",
      "src/components/kabsi/d9-home.tsx",
      "src/components/kabsi/d9-hero.tsx",
    ]) {
      const text = read(f);
      expect(text, f).not.toMatch(/[–—؀-ۿ]/);
      expect(text.replace(/!==?|!\w|!\(|!\[|!places|!s\./g, ""), f).not.toMatch(/[a-z]!/i);
    }
  });
});
