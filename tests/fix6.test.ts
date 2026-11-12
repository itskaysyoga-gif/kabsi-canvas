// Fix 6 (12 Nov 2026, lane R R-162, master plan 30.52): the records and the last small fixes before the two listings
// test. /manager-steps keeps setup as its one yellow action, Nora's round button on a phone steps aside for every
// control, the industry pages' photo to post Example is the Look 2 message of How it works, and Home's search field keeps
// its width at 1024 px. The real measures at 320, 375 and 390 px are in tests/e2e/nora-phone.spec.ts.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { D9_CASES, POST_LOOK_BUTTONS, postLook } from "../src/components/kabsi/d9-data";

const read = (f: string) => readFileSync(f, "utf8");

describe("Fix 6: the industry pages' photo to post Example is the Look 2 message", () => {
  it("is the same message as How it works' photo case, with the yes first", () => {
    const how = D9_CASES.find((c) => c.id === "photo")!;
    const m = postLook("Hollis Hair", "A post.");
    expect(m.title).toBe(how.look.title);
    expect(m.status).toBe(how.look.status);
    expect(m.marker).toBe("post");
    expect(m.facts).toEqual([{ text: "A post.", quote: true }]);
    expect([...POST_LOOK_BUTTONS]).toEqual([how.yes, ...how.others]);
  });
  it("PhotoToPost draws it with Look2Bubble and OwnerBubble, with no Design 9 bubble, state list or Skip", () => {
    const s = read("src/components/kabsi/d9-home-lower.tsx");
    const visual = s.slice(
      s.indexOf("function PhotoVisual("),
      s.indexOf("/* ---------- Where you show up"),
    );
    expect(visual).toContain("<Look2Bubble m={message} />");
    expect(visual).toContain("<OwnerBubble");
    expect(visual).not.toContain("PictureButtons");
    expect(visual).not.toContain("p.ready");
    expect(visual).not.toContain("Where the post is");
    expect(read("src/components/kabsi/d9-industry.tsx")).toContain("business: i.example.business");
  });
});

describe("Fix 6: Nora's round button on a phone", () => {
  const s = read("src/components/kabsi/site-chrome.tsx");
  it("steps aside for a button, a field or a tappable box, not for a word in a sentence", () => {
    expect(s).toMatch(
      /const AVOID_PHONE =\s*"button, input:not\(\[type=hidden\]\), select, textarea, summary, a\[href\]/,
    );
    expect(s).toContain('getComputedStyle(el).display !== "inline"');
    // The wide launcher keeps the Polish 4 list.
    expect(s).toContain(
      'const AVOID_WIDE = "form button[type=submit], form input[type=submit], [data-nora-avoid]"',
    );
  });
  it("the footer ends with room for her and for the phone bar, the safe area included", () => {
    expect(read("src/components/kabsi/site-footer.tsx")).toContain(
      "pb-[calc(6rem+env(safe-area-inset-bottom))]",
    );
  });
});

describe("Fix 6: Home's hero keeps the search field wide at 1024 px", () => {
  it("the picture has its own column from 1024 px and the old ratio returns at 1280 px", () => {
    const h = read("src/components/kabsi/home2-hero.tsx");
    expect(h).toContain("lg:grid-cols-[minmax(0,1fr)_21rem]");
    expect(h).toContain("xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]");
  });
});
