// P0.8-09 (K-136): the Profile Coach checklist. The browser's catalog and the free Profile Check's catalog are the same
// list; the checklist reads the database's answer; nothing in it scores or ranks.
import { describe, expect, it } from "vitest";
import { COACH_ITEMS, coachRows, detailLine, STATUS_LABEL, type Coach } from "@/lib/coach";
import {
  COACH_ITEMS as SERVER_ITEMS,
  freeChecklist,
} from "../supabase/functions/_shared/coach/catalog";
import { SECTIONS } from "@/lib/app-nav";

describe("the checklist catalog", () => {
  it("is the same list in the app and in the free Profile Check", () => {
    expect(COACH_ITEMS).toEqual(SERVER_ITEMS);
  });

  it("uses plain words: no dashes, no exclamation marks, no score", () => {
    for (const i of COACH_ITEMS) {
      for (const t of [i.title, i.why]) {
        expect(t).not.toMatch(/[–—!]/);
        expect(t.toLowerCase()).not.toMatch(/\bscore\b|\bpoints\b/);
      }
    }
    for (const t of Object.values(STATUS_LABEL)) expect(t).not.toMatch(/[–—!]/);
  });

  it("never offers anything about who the owner is (K-83) or keywords in the name (K-112)", () => {
    const all = COACH_ITEMS.map((i) => `${i.title} ${i.why}`)
      .join(" ")
      .toLowerCase();
    expect(all).toContain("who you are or who owns the business");
    expect(all).not.toMatch(/keyword/);
  });
});

describe("the owner's checklist", () => {
  const coach: Coach = {
    locked: false,
    plan: "essentials",
    pro: false,
    source: "live",
    items: [
      { id: "description", status: "todo", detail: { length: 120 } },
      { id: "categories", status: "done" },
      { id: "services", status: "todo" },
    ],
  };

  it("shows every item in the catalog order, the unread ones as not checked yet", () => {
    const rows = coachRows(coach);
    expect(rows.map((r) => r.id)).toEqual(COACH_ITEMS.map((i) => i.id));
    expect(rows.find((r) => r.id === "attributes")?.status).toBe("unknown");
    expect(rows.find((r) => r.id === "description")?.status).toBe("todo");
  });

  it("says what is missing in words", () => {
    const rows = coachRows(coach);
    expect(detailLine(rows.find((r) => r.id === "description")!)).toBe(
      "Your description is 120 characters.",
    );
    expect(detailLine(rows.find((r) => r.id === "categories")!)).toBeNull();
    expect(detailLine({ ...rows[0], status: "todo", detail: { length: 0 } })).toBe(
      "You have no description yet.",
    );
  });

  it("lives under Google Profile, next to Hours", () => {
    expect(SECTIONS["google-profile"].tabs?.map((t) => t.label)).toEqual([
      "Google Profile",
      "Hours",
      "Profile Coach",
    ]);
    expect(SECTIONS["google-profile"].paths).toContain("/app/coach");
  });
});

describe("the free Profile Check checklist", () => {
  it("asserts nothing public data cannot show", () => {
    const rows = freeChecklist({ website: "https://example.com", photo_count: 4 });
    expect(rows).toHaveLength(COACH_ITEMS.length);
    for (const id of ["description", "categories", "services", "attributes", "service_area"]) {
      expect(rows.find((r) => r.id === id)?.status, id).toBe("unknown");
    }
    expect(rows.find((r) => r.id === "photos")?.status).toBe("later");
  });

  it("tells a website with the tag from one without, and no website from both", () => {
    const status = (website: string | null) =>
      freeChecklist({ website, photo_count: 0 }).find((r) => r.id === "website_tracking")!.status;
    expect(
      status("https://example.com/?utm_source=google&utm_medium=organic&utm_campaign=gbp"),
    ).toBe("done");
    expect(status("https://example.com")).toBe("todo");
    expect(status(null)).toBe("later");
  });
});
