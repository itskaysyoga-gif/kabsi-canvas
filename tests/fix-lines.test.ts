import { describe, expect, it } from "vitest";
import {
  COACH_SHORT,
  fixCountLine,
  fixLine,
  MAX_FIX_WORDS,
  shortWhy,
  thingsToFix,
} from "@/lib/fix-lines";
import { profileHealth } from "@/lib/home-state";
import type { Task } from "@/lib/tasks";

// APP-3 (R-169): "things to fix" with one count on Home and on the Google profile screen; each card a bold line and at most
// 20 words.
const task = (
  kind: Task["kind"],
  evidence: Record<string, unknown> = {},
  why = "A reason.",
): Task => ({
  id: Math.random().toString(36).slice(2),
  kind,
  priority: "recommended",
  title: "A title",
  why,
  recommendation: null,
  path: "/app/shield",
  evidence,
  created_at: "2026-11-26T06:00:00Z",
});
const count = (s: string) => s.trim().split(/\s+/).length;

describe("things to fix", () => {
  it("Home's strip and the Google profile screen say the same words with the same count", () => {
    const tasks = [
      task("profile_gap", { coach: "description" }),
      task("profile_gap", { coach: "attributes" }),
      task("profile_gap", { have: 0 }),
      task("profile_gap", { missing: "website" }),
      task("profile_gap", { of: 6, have: 4 }),
      task("post"),
      task("review_reply"),
    ];
    const screen = fixCountLine(thingsToFix(tasks).length);
    const home = profileHealth({ tasks, week: [] }).find((h) => h.key === "details")!;
    expect(screen).toBe("5 things to fix");
    expect(home.state).toBe(screen);
    expect(fixCountLine(1)).toBe("1 thing to fix");
    expect(fixCountLine(0)).toBe("Nothing to fix");
  });

  it("every short line is at most 20 words, with no dash or exclamation mark", () => {
    const lines = [
      ...Object.values(COACH_SHORT),
      fixLine(task("profile_gap", { failures: 3 })),
      fixLine(task("profile_gap", { missing: "website" })),
      fixLine(task("profile_gap", { of: 6, have: 4 })),
      fixLine(task("profile_gap", { have: 0 })),
    ];
    for (const l of lines) {
      expect(count(l), l).toBeLessThanOrEqual(MAX_FIX_WORDS);
      expect(l).not.toMatch(/[–—!]/);
    }
  });

  it("a long reason is cut to whole sentences within 20 words", () => {
    const why =
      "Kabsi tried it 3 times today and it did not load. Customers who tap your website link may see an error. Kabsi found it, and you fix it where the link points.";
    expect(shortWhy(why)).toBe("Kabsi tried it 3 times today and it did not load.");
    const one = "word ".repeat(30).trim() + ".";
    expect(count(shortWhy(one))).toBe(MAX_FIX_WORDS);
  });

  it("the profile details card no longer says who owns the business", () => {
    expect(fixLine(task("profile_gap", { coach: "attributes" }))).not.toMatch(/who owns/);
  });
});
