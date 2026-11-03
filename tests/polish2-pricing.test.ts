// Polish 2 part C (lane R decisions 5 and 6 of 3 Nov 2026): Pricing's cards name only built differences, and the free
// check's next step adds words, not events.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PLANS, PLAN_ROWS } from "@/components/kabsi/plans";

const limits = readFileSync("supabase/migrations/20261025173010_creem_billing.sql", "utf8");

describe("Polish 2, Pricing and the free check's next step", () => {
  it("gives each plan four things, and Pro's are Pro only in the comparison and the database", () => {
    for (const p of PLANS) expect(p.top).toHaveLength(4);
    const pro = PLANS.find((p) => p.id === "pro")!;
    expect(pro.top.join(" ")).toMatch(/A post every week/);
    for (const row of [
      "Team roles and approval rules",
      "Profile Coach actions: the change made for you after your yes",
      "The words people searched on Google to find you",
    ])
      expect(
        PLAN_ROWS.find((r) => r[0] === row),
        row,
      ).toEqual([row, "No", "Yes"]);
    // plan_limits(): Essentials 2 posts a month, Pro weekly posts, Coach actions and team roles.
    expect(limits).toMatch(/'essentials' then[^]*"posts_per_month": 2, "weekly_posts": false/);
    expect(limits).toMatch(
      /'pro' then[^]*"weekly_posts": true[^]*"coach_actions": true, "team_roles": true/,
    );
  });
  it("keeps the nearby check off the cards while it is closed", () => {
    for (const p of PLANS) expect(p.top.join(" ")).not.toMatch(/nearby|Google Maps|map/i);
  });
  it("keeps the free check's analytics events exactly as they were", () => {
    const src = readFileSync("src/components/kabsi/scan-live.tsx", "utf8");
    const events = [...src.matchAll(/track\("([a-z_]+)"/g)].map((m) => m[1]).sort();
    expect(events).toEqual(
      [
        "free_scan_completed",
        "free_scan_started",
        "free_tool_used",
        "free_tool_used",
        "signup_started",
      ].sort(),
    );
    expect(src).toContain(
      "Add Kabsi as a Manager on your Google profile. It takes about two minutes",
    );
  });
});
