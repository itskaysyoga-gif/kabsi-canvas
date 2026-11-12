// Web 5 (Design 9 on kabsi.co, master plan 30.24): the rules the new Home and shell must keep.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { WHATSAPP_ON } from "@/lib/site";
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
    // Industries 2: the bar is the shared Highlight component; D9Title uses it once.
    const title = read("src/components/kabsi/d9-title.tsx");
    expect(title.match(/<Highlight>/g)).toHaveLength(1);
    expect(read("src/components/kabsi/highlight.tsx").match(/className="d9-mark"/g)).toHaveLength(
      1,
    );
    expect(read("src/components/kabsi/d9-hero.tsx")).not.toContain('className="d9-mark"');
    expect(read("src/components/kabsi/d9-home.tsx")).not.toContain("d9-mark");
  });
  it("keeps the product's own buttons (30.24 item 2)", () => {
    const by = Object.fromEntries(D9_HERO_STREAM.map((m) => [m.id, m.buttons]));
    expect(by["review"]).toEqual(["Yes", "Edit", "Skip"]);
    expect(by["post"]).toEqual(["Approve", "Edit", "Skip"]);
    expect(D9_PHOTO.buttons).toEqual(["Approve", "Edit", "Skip"]);
  });
  // Polish 4 (master plan 30.25 item 3): the photo band is a yellow label, a two-sentence headline, one line and three
  // points; the photo-with-no-words line, the posts-per-plan line and the launch line left this section on purpose.
  it("keeps the photo band to the 30.25 rule", () => {
    expect(D9_PHOTO.label).toBe("On WhatsApp");
    expect(`${D9_PHOTO.title} ${D9_PHOTO.titleMark}`.split(" ").length).toBeLessThanOrEqual(8);
    expect(D9_PHOTO.line.split(" ").length).toBeLessThanOrEqual(20);
    expect(D9_PHOTO.points).toHaveLength(3);
    expect(D9_PHOTO.line).toContain("asks for your yes");
  });
  it("labels Where you show up with no At launch label (Go live 1, master plan 30.28)", () => {
    expect("atLaunch" in D9_SHOW_UP).toBe(false);
    expect(D9_SHOW_UP.line).toBe("Two checks Kabsi runs, shown as they are. No score.");
  });
  // B-004 (Copy 3, master plan 30.29 item 2): the Example speaks of the 49 places the real check uses and says the map
  // shows only some of them, and the sample really draws that many.
  it("says the Example map count of 49 places and that the map shows the points it draws", () => {
    expect(D9_SHOW_UP.map.count).toBe("In the first 3 at 18 of 49 places Kabsi checked.");
    expect(D9_SHOW_UP.map.shows).toBe(`The map shows ${D9_MAP_POINTS.length} of them.`);
    expect(D9_MAP_POINTS.length).toBe(8);
  });
  // Polish 4 (30.25 item 3): the watch line names no channel, so it is true either way. Go live 1 (30.28): the launch
  // line is gone from the hero and from every page.
  it("promises no channel on the profile watch and shows no launch line", () => {
    expect(D9_WATCH.line).not.toContain("WhatsApp");
    expect(D9_WATCH.line.split(" ").length).toBeLessThanOrEqual(20);
    expect(read("src/components/kabsi/d9-home.tsx")).not.toContain("WHATSAPP_LAUNCH_LINE");
    expect(read("src/components/kabsi/d9-hero.tsx")).not.toMatch(
      /WHATSAPP_LAUNCH_LINE|opens at launch/,
    );
    expect(WHATSAPP_ON).toBe(true);
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
    // Site 3b: the Look 2 words of Home's thread (yes first; "Edit on kabsi.co"; the hours case is the Keep my information choice).
    expect(by["hours"]).toEqual(["Keep my information", "Google is right"]);
    expect(by["photo"]).toEqual(["Approve", "Edit on kabsi.co"]);
    expect(by["review"]).toEqual(["Approve", "Edit on kabsi.co"]);
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
    expect(d9OtherLine("Google is right")).toContain("nothing is sent");
    expect(d9OtherLine("Skip")).toContain("Nothing is sent");
    expect(d9OtherLine("Edit on kabsi.co")).toContain("then you approve");
  });
  it("draws each case in the Look 2 style: a marker and title, the facts, one question, no first person", () => {
    for (const c of D9_CASES) {
      expect(c.look.title.split(" ").length, c.id).toBeLessThanOrEqual(5);
      expect(c.look.status, c.id).toMatch(/\?$/);
      expect(JSON.stringify(c), c.id).not.toMatch(
        /six weeks|Saturdays are open|\bI will\b|\bI \w+ed\b/,
      );
    }
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

describe("every public page on Design 9 (Web 5 part D)", () => {
  it("gives every PageHero the yellow bar on its title's last sentence", () => {
    expect(read("src/components/kabsi/page-hero.tsx")).toContain("marked = true");
  });
  it("puts the steps line under Pricing's hero, and the photo story on every industry page (Industries 2)", () => {
    expect(read("src/components/kabsi/d8-pricing.tsx")).toContain(
      '<StepsLine id="pricing-steps-h" />',
    );
    // Industry 1 (R-144): the band also takes the trade's own photo cards, so the props sit on their own lines.
    expect(read("src/components/kabsi/d9-industry.tsx")).toMatch(/<PhotoToPost\s+example=/);
  });
});
