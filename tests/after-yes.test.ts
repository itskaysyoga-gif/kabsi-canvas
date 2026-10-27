import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  APPROVED_LINE as KABSI_APPROVED_LINE,
  outcomeLine,
} from "../supabase/functions/_shared/task-close";
import { APPROVED_LINE, LATER_CHIP, doneLine } from "../src/lib/after-yes";

// Master plan 30.15 3.1: the public pages never say "Published" right after a Yes. They show what Kabsi really sends.
describe("what the public pages show after Yes", () => {
  it("uses Kabsi's real lines from task-close.ts", () => {
    expect(APPROVED_LINE).toBe(KABSI_APPROVED_LINE);
    expect(doneLine("Rose Lane Salon")).toBe(
      outcomeLine({
        business: "Rose Lane Salon",
        target_type: "review_reply",
        state: "verified",
        link: null,
      }),
    );
  });

  it("has no em dash, en dash or exclamation mark", () => {
    for (const t of [APPROVED_LINE, LATER_CHIP, doneLine("Rose Lane Salon")])
      expect(t).not.toMatch(new RegExp("[\\u2013\\u2014!]"));
  });

  it("is on the hero scene and on Home's try-it chat, and neither says Published", () => {
    for (const f of ["whatsapp.tsx", "d4-home.tsx"]) {
      const src = readFileSync(join(__dirname, "..", "src/components/kabsi", f), "utf8");
      expect(src).not.toMatch(/Published on your/);
    }
    const hero = readFileSync(join(__dirname, "..", "src/components/kabsi/whatsapp.tsx"), "utf8");
    expect(hero).toContain("<ApprovedBubble");
    expect(hero).toContain("{LATER_CHIP}");
    expect(hero).toContain("<DoneBubble");
    const home = readFileSync(join(__dirname, "..", "src/components/kabsi/d4-home.tsx"), "utf8");
    expect(home).toContain("<DoneBubble business={DEMO.business}");
  });
});
