// Web 5 (Design 9 on kabsi.co, master plan 30.24): the rules the new Home and shell must keep.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { NEARBY_ON, WHATSAPP_ON } from "@/lib/site";
import { D9Title, splitTitle } from "@/components/kabsi/d9-title";
import {
  D9_CASES,
  D9_FAILED_LABEL,
  D9_STATES,
  D9_UNDO_SECONDS,
  d9NextState,
  d9OtherLine,
  D9_HERO_STREAM,
  D9_MAP_POINTS,
  D9_PHOTO,
  D9_SHOW_UP,
  D9_WATCH,
} from "@/components/kabsi/d9-data";

const read = (f: string) => readFileSync(f, "utf8");

describe("Design 9 Home (Web 5 part B)", () => {
  it("marks only the H1's second sentence with the yellow bar, once", () => {
    const title = read("src/components/kabsi/d9-title.tsx");
    expect(title.match(/className="d9-mark"/g)).toHaveLength(1);
    expect(read("src/components/kabsi/d9-hero.tsx")).not.toContain('className="d9-mark"');
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
      "src/components/kabsi/d9-how.tsx",
      "src/components/kabsi/how-page.tsx",
      "src/components/kabsi/d9-title.tsx",
    ]) {
      const text = read(f);
      expect(text, f).not.toMatch(/[–—؀-ۿ]/);
      expect(text.replace(/!==?|!\w|!\(|!\[|!places|!s\./g, ""), f).not.toMatch(/[a-z]!/i);
    }
  });
});

describe("How it works: the demonstration in three cases (Web 5 part C)", () => {
  it("has the three cases in order, with the product's own buttons", () => {
    expect(D9_CASES.map((c) => c.tab)).toEqual(["Hours changed", "Photo to post", "New review"]);
    const by = Object.fromEntries(D9_CASES.map((c) => [c.id, [c.yes, ...c.others]]));
    expect(by["hours"]).toEqual(["Use my hours", "Keep Google's"]);
    expect(by["photo"]).toEqual(["Approve", "Edit", "Skip"]);
    expect(by["review"]).toEqual(["Yes", "Edit", "Skip"]);
  });
  it("goes Approved, Sent to Google, then Live on Google or Did not go through, never merged", () => {
    expect(D9_STATES.map((s) => s.label)).toEqual(["Approved", "Sent to Google", "Live on Google"]);
    expect(D9_FAILED_LABEL).toBe("Did not go through");
    expect(d9NextState("approved", false)).toBe("sent");
    expect(d9NextState("sent", false)).toBe("live");
    expect(d9NextState("sent", true)).toBe("failed");
    expect(d9NextState("live", true)).toBe("live");
    expect(d9NextState("ask", false)).toBe("ask");
    expect(D9_UNDO_SECONDS).toBe(10);
  });
  it("answers the other buttons without sending anything", () => {
    expect(d9OtherLine("Keep Google's")).toContain("nothing is sent");
    expect(d9OtherLine("Skip")).toContain("Nothing is sent");
    expect(d9OtherLine("Edit")).toContain("then you approve");
  });
  it("calls no backend: the demonstration has no fetch, API or Supabase import", () => {
    const demo = read("src/components/kabsi/d9-how.tsx");
    expect(demo).not.toMatch(/fetch\(|@\/lib\/(api|public-api|supabase)|supabase/);
  });
  it("marks the second sentence of a PageHero title in treatment B", () => {
    expect(splitTitle("Kabsi prepares. You approve. Kabsi follows through.")).toEqual([
      "Kabsi prepares. You approve.",
      "Kabsi follows through.",
    ]);
    expect(splitTitle("Your business on Google. Taken care of.")).toEqual([
      "Your business on Google.",
      "Taken care of.",
    ]);
    expect(splitTitle("Questions owners ask")).toEqual([null, "Questions owners ask"]);
    expect(typeof D9Title).toBe("function");
    expect(read("src/components/kabsi/how-page.tsx")).toContain("marked");
  });
});
