// Web 4b part 1 (Design 8, lane R 1 Nov 2026, decision 10): the result shows only what the check really reads from
// Google's public data. Things only Manager access shows are what Kabsi checks once connected, never findings.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { dayOne, foundRows } from "@/components/kabsi/scan-live";
import type { Snapshot } from "@/lib/profile-check";

const base: Snapshot = {
  place_id: "ChIJtest0000000000001",
  name: "Rose Lane Salon",
  address: "12 Harbour Lane, Example Town, USA",
  category: "Hair salon",
  rating: 4.6,
  review_count: 38,
  business_status: "OPERATIONAL",
  open_now: true,
  hours: ["Monday: 10:00 to 21:00"],
  phone: "+1 202 555 0143",
  website: null,
  has_photos: true,
  photo_count: 10,
  flags: [
    {
      tone: "warning",
      fact: "No website is shown on Google.",
      action:
        "Add your website on your Google profile. Once you connect, Kabsi checks it every day with your other details.",
    },
    {
      tone: "neutral",
      fact: "Google does not show the public which reviews have a reply.",
      action:
        "Once you connect, Kabsi counts the reviews with no reply and prepares one for each. You approve every reply.",
    },
  ],
  checklist: [],
  cached: false,
};

describe("the free check result on Design 8", () => {
  it("lists only what Google's public data holds, the things to fix first", () => {
    const rows = foundRows(base);
    expect(rows.map((r) => r.label)).toEqual([
      "Website",
      "Opening hours",
      "Reviews",
      "Photos",
      "Phone",
      "Category",
    ]);
    expect(rows[0]).toMatchObject({ ok: false, value: null });
    expect(rows.find((r) => r.label === "Reviews")!.value).toBe("38, rated 4.6");
    for (const r of rows) expect(`${r.label} ${r.why}`).not.toMatch(/repl|holiday|post|booking/i);
  });
  it("never shows Google's 10-photo limit as the business's photo count", () => {
    const photos = (n: number) =>
      foundRows({ ...base, photo_count: n }).find((r) => r.label === "Photos")!.value;
    expect(photos(10)).toBe("10 or more");
    expect(photos(4)).toBe("4");
  });
  it("counts fewer than 10 reviews as worth fixing, like the check's own finding", () => {
    expect(foundRows({ ...base, review_count: 3 }).find((r) => r.label === "Reviews")!.ok).toBe(
      false,
    );
  });
  it("day one lists the check's own actions, findings first, at most four", () => {
    const l = dayOne(base);
    expect(l[0]).toMatch(/^Add your website on your Google profile/);
    expect(l[1]).toMatch(/^Once you connect/);
    expect(l.length).toBeLessThanOrEqual(4);
  });
  it("leaves the AI answer and the nearby check out when the check is unavailable (Go live 1, master plan 30.28)", () => {
    const live = readFileSync("src/components/kabsi/scan-live.tsx", "utf8");
    const result = live.slice(
      live.indexOf("export function LiveResult"),
      live.indexOf("function Competitors"),
    );
    expect(result).not.toMatch(/At launch/);
    // Both parts show only with a check, or the mock mode's waiting list; "unavailable" shows neither.
    // Scan 3: the nearby detail shows with a check, the waiting list in mock mode, else nothing; the AI detail only with an answer.
    expect(result).toContain("{check ? (");
    expect(result).toContain(") : waitlist ? (");
    expect(result).toContain("{ai ? (");
    expect(result).toContain('started.state === "waitlist"');
    expect(result).toContain("Kabsi will search Google Maps from places around you");
  });
});
