// App 5 (master plan 30.33 item 3): the staff workspace. The menu data, the Today rules, and the rule App 4 set (30.31
// item 3): every page under /staff is refused to a session that is not staff, because the one staff layout shows the
// not-found page before any page under it is drawn.
import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { STAFF_BAR, STAFF_MENU, STAFF_MORE, STAFF_PAGES, staffPageFor } from "@/lib/staff-nav";
import { capShare, failedRuns24h, newBusinesses, todayRows } from "@/lib/staff-today";
import { isPrivatePath } from "@/lib/private-paths";
import { isStaffPath } from "@/lib/idle";

const NOW = Date.parse("2026-11-05T12:00:00Z");
const DIR = "src/routes/_authenticated/staff";
const words = (n: string) => n.trim().split(/\s+/).length;

describe("the staff menu", () => {
  it("has the seven pages of 30.33 item 3, each at its own address", () => {
    expect(STAFF_MENU).toEqual([
      "today",
      "businesses",
      "conversations",
      "programs",
      "system",
      "costs",
      "settings",
    ]);
    expect(STAFF_MENU.map((id) => STAFF_PAGES[id].to)).toEqual([
      "/staff",
      "/staff/businesses",
      "/staff/conversations",
      "/staff/programs",
      "/staff/system",
      "/staff/costs",
      "/staff/settings",
    ]);
  });

  it("puts five in the phone bar and the other two in the phone menu, so every page is reachable", () => {
    expect(STAFF_BAR).toHaveLength(5);
    expect([...STAFF_BAR, ...STAFF_MORE].sort()).toEqual([...STAFF_MENU].sort());
  });

  it("finds the page of an address, with or without a trailing slash", () => {
    expect(staffPageFor("/staff")?.id).toBe("today");
    expect(staffPageFor("/staff/system/")?.id).toBe("system");
    expect(staffPageFor("/staffing")).toBeUndefined();
  });

  it("gives each page a heading whose phrase is in it once, and a purpose of at most 25 words", () => {
    for (const id of STAFF_MENU) {
      const p = STAFF_PAGES[id];
      expect(p.title.split(p.mark).length - 1, id).toBe(1);
      expect(words(p.purpose), id).toBeLessThanOrEqual(25);
      expect(`${p.title} ${p.purpose} ${p.label}`).not.toMatch(/[–—!؀-ۿ]/);
    }
  });

  it("has a route file for every page, and no page outside the menu", () => {
    const files = readdirSync(DIR).filter((f) => f.endsWith(".tsx") && f !== "route.tsx");
    const want = STAFF_MENU.map((id) =>
      id === "today" ? "index.tsx" : `${STAFF_PAGES[id].to.split("/").pop()}.tsx`,
    );
    expect(files.sort()).toEqual(want.sort());
  });
});

describe("a staff page is refused to anyone who is not staff (App 4's rule)", () => {
  const layout = readFileSync(`${DIR}/route.tsx`, "utf8");
  it("the one layout shows the not-found page when is_staff answers no, before any page is drawn", () => {
    expect(layout).toMatch(/if \(staff\.data === false\) return <NotFoundPage \/>;/);
    expect(layout).toMatch(/staff\.data === true \? <Outlet \/> : null/);
  });
  it("every staff page sits under that layout and checks nothing of its own", () => {
    for (const f of readdirSync(DIR).filter((x) => x !== "route.tsx")) {
      const src = readFileSync(`${DIR}/${f}`, "utf8");
      expect(src, f).toMatch(/createFileRoute\("\/_authenticated\/staff\//);
      expect(src, f).not.toMatch(/amStaff|NotFoundPage/);
    }
  });
  it("every staff address is private and keeps the 12 hours of staff pages", () => {
    for (const id of STAFF_MENU) {
      expect(isPrivatePath(STAFF_PAGES[id].to), id).toBe(true);
      expect(isStaffPath(STAFF_PAGES[id].to), id).toBe(true);
    }
  });
});

describe("Today", () => {
  it("says all clear when nothing waits", () => {
    expect(todayRows({ now: NOW })).toEqual([]);
    expect(todayRows({ now: NOW, chatsHandoff: 0, followupsDue: 0, newBusinesses: [] })).toEqual(
      [],
    );
  });

  it("gives each waiting thing one row with its count and its page", () => {
    const rows = todayRows({
      now: NOW,
      foundingNew: 2,
      partnersApplied: 1,
      chatsHandoff: 3,
      followupsDue: 1,
      conciergeTasks: 4,
      stuckApprovals: 1,
      accessStopped: 2,
      failedJobs24h: 2,
      deadJobs: 1,
      googleErrors24h: 5,
      webhooksRefused24h: 1,
      providerRefusals24h: 1,
      newBusinesses: [{ name: "Harbour Smiles Dental", step: "access", status: "onboarding" }],
    });
    const by = Object.fromEntries(rows.map((r) => [r.id, r]));
    expect(by["founding"]).toMatchObject({
      count: 2,
      page: "programs",
      show: "founding",
      text: "2 Founding 25 applications to decide",
    });
    expect(by["partners"]).toMatchObject({ count: 1, text: "1 partner application to decide" });
    expect(by["chats"]).toMatchObject({ count: 3, page: "conversations", show: "chats" });
    expect(by["followups"]).toMatchObject({ text: "1 follow-up is due" });
    expect(by["jobs"]).toMatchObject({ count: 2, page: "system", show: "jobs" });
    expect(by["dead"]).toMatchObject({ count: 1, text: "1 stopped job to retry or cancel" });
    expect(by["refusals"]).toMatchObject({ count: 7 });
    expect(by["new"]).toMatchObject({ count: 1, page: "businesses" });
    // The red rows come first.
    expect(rows[0]!.level).toBe("red");
    for (const r of rows) expect(r.text).not.toMatch(/[–—!]/);
  });

  it("counts only businesses of the last 7 days that are still setting up (not paused or active)", () => {
    const day = 86_400_000;
    const got = newBusinesses(
      [
        {
          name: "A",
          status: "onboarding",
          onboarding_step: "google_access",
          created_at: new Date(NOW - day).toISOString(),
        },
        {
          name: "P",
          status: "paused",
          onboarding_step: "done",
          created_at: new Date(NOW - day).toISOString(),
        },
        {
          name: "B",
          status: "active",
          onboarding_step: "done",
          created_at: new Date(NOW - day).toISOString(),
        },
        {
          name: "C",
          status: "onboarding",
          onboarding_step: "find",
          created_at: new Date(NOW - 9 * day).toISOString(),
        },
      ],
      NOW,
    );
    expect(got).toEqual([{ name: "A", step: "google access", status: "onboarding" }]);
  });

  it("adds the failed runs of the last 24 hours and reads a cap's share", () => {
    expect(failedRuns24h([{ failed_24h: 2 }, { failed_24h: 0 }, { failed_24h: 1 }])).toBe(3);
    expect(failedRuns24h(undefined)).toBe(0);
    expect(capShare(2_470_000, 10)).toBe(25);
    expect(capShare(12_000_000, 10)).toBe(100);
    expect(capShare(1, 0)).toBeNull();
  });
});
