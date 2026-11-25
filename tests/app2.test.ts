// APP-2 (25 Nov 2026): the fixes APP-1 and FIX-4 left on docs/LATER.md, before a real customer sees the app.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { effectiveCadence, MAX_POSTS_PER_MONTH } from "../src/lib/posts";
import { errorText } from "../supabase/functions/_shared/jobs";
import { SECTIONS } from "../src/lib/app-nav";

const read = (f: string) => readFileSync(f, "utf8");

describe("APP-2 item 1: Posts offers up to 2 a month, as the facts say", () => {
  it("never offers or uses 4: a stored 4 reads as 2", () => {
    expect(MAX_POSTS_PER_MONTH).toBe(2);
    expect(effectiveCadence(4)).toBe(2);
    expect(effectiveCadence(2)).toBe(2);
    expect(effectiveCadence(null)).toBe(2);
    expect(effectiveCadence(1)).toBe(1);
  });
  it("the Posts page has no month chips and the job never plans more than 2", () => {
    const page = read("src/routes/_authenticated/app/posts.tsx");
    expect(page).not.toContain("posts-a-month");
    expect(page).not.toContain("setCadence");
    expect(page).toContain("Kabsi prepares up to 2 posts a month.");
    expect(read("supabase/functions/api/jobs.ts")).not.toContain("posts_per_month ?? 4");
  });
});

describe("APP-2 item 3: staff Businesses says what the action does", () => {
  it("is Start trial, not Give Pro trial", () => {
    const s = read("src/components/staff/businesses-panel.tsx");
    expect(s).toContain("Start trial");
    expect(s).not.toContain("Give Pro trial");
  });
});

describe("APP-2 item 4: Where you show up is off the owner's navigation", () => {
  it("has no tab, and the route goes to Home", () => {
    const tabs = Object.values(SECTIONS).flatMap((x) => x.tabs ?? []);
    expect(tabs.some((t) => t.to === "/app/insights" || t.label === "Where you show up")).toBe(
      false,
    );
    expect(SECTIONS["google-profile"].paths).not.toContain("/app/insights");
    const route = read("src/routes/_authenticated/app/insights.tsx");
    expect(route).toContain('redirect({ to: "/app"');
    expect(route).not.toContain("loadNearby");
  });
});

describe("APP-2 item 5: the old-reviews card never shows a server message", () => {
  it("uses the short retry line", () => {
    const s = read("src/components/home/backlog-card.tsx");
    expect(s).not.toContain("approve.error.message");
    expect(s).toContain("RetryLine");
  });
});

describe("APP-2 item 6: a failed job stores the real message", () => {
  it("reads an Error, a Postgres error object and a string", () => {
    expect(errorText(new Error("google 500"))).toBe("Error: google 500");
    const t = errorText({ message: "duplicate key", code: "23505" });
    expect(t).toContain("duplicate key");
    expect(t).toContain("23505");
    expect(errorText({ code: "x" })).toBe('{"code":"x"}');
    expect(errorText("plain")).toBe("plain");
    expect(errorText({ message: "m" })).not.toContain("[object Object]");
  });
});

describe("APP-2 item 7: a billing event for a deleted business closes at once and tells nobody", () => {
  it("applyEvent checks the business first and returns before any message or alert", () => {
    const all = read("supabase/functions/_shared/billing.ts");
    const s = all.slice(all.indexOf("export async function applyEvent"));
    const i = s.indexOf("orgExists(org)");
    const close = s.indexOf('outcome: "business_deleted"');
    expect(i).toBeGreaterThan(0);
    expect(close).toBeGreaterThan(i);
    expect(close).toBeLessThan(
      s.indexOf("staffAlert(`Creem ${e.eventType} with no Kabsi business"),
    );
    expect(close).toBeLessThan(s.indexOf("tellOwner(effect.message"));
  });
});
