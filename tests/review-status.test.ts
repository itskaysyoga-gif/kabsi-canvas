import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ReviewStatusPill } from "../src/components/reviews/review-status";
import { PublishingBanner } from "../src/components/reviews/review-card";
import {
  FILTERS,
  VIEWS,
  matchesFilter,
  matchesView,
  onGoogle,
  viewFor,
  needsReply,
  reviewStatus,
  sortReviews,
  type StatusInput,
} from "../src/lib/review-status";

// P0.3-09: the Reviews screen (K-15). Each status renders in the owner's words, each filter keeps the right reviews, the
// approve countdown shows "Publishing in 10 seconds" with Undo (K-70).
const base: StatusInput & { star_rating: number; review_created_at: string | null } = {
  state: "drafted",
  reply_state: null,
  risk: "low",
  existing_reply: null,
  draft: { body: "Thank you.", safety_ok: true },
  star_rating: 5,
  review_created_at: "2026-10-01T10:00:00Z",
};
const html = (over: Partial<StatusInput>, concierge = false) =>
  renderToStaticMarkup(
    createElement(ReviewStatusPill, { review: { ...base, ...over }, concierge }),
  );

describe("each status renders", () => {
  it("Draft ready", () => expect(html({})).toContain("Draft ready"));
  it("Waiting for you", () => {
    expect(html({ state: "blocked", draft: null })).toContain("Waiting for you");
    expect(html({ risk: "high", draft: null })).toContain("Waiting for you");
    expect(html({ draft: { body: "x", safety_ok: false } })).toContain("Waiting for you");
  });
  it("Published", () => expect(html({ state: "posted" })).toContain("Published"));
  it("Google is checking your reply", () =>
    expect(html({ state: "posted", reply_state: "in_review" })).toContain(
      "Google is checking your reply",
    ));
  it("Rejected by Google", () => {
    const out = html({ state: "drafted", reply_state: "rejected" });
    expect(out).toContain("Rejected by Google");
    expect(out).toContain("text-bad");
  });
  it("You chose not to reply", () => {
    expect(html({ state: "skipped" })).toContain("You chose not to reply");
    expect(html({ state: "handled_offline" })).toContain("You replied yourself");
  });
  it("shows the reply on its way, and early access in its own words", () => {
    expect(html({ state: "publishing" })).toContain("On its way to Google");
    expect(html({ state: "publishing" }, true)).toContain("our team posts it");
    expect(html({ state: "new", draft: null })).toContain("Kabsi is drafting");
  });
  it("names no score and no dash", () => {
    for (const state of ["drafted", "posted", "skipped", "publishing", "blocked"]) {
      expect(html({ state })).not.toMatch(/[–—!]/);
    }
  });
});

describe("filters", () => {
  const rows = [
    { ...base, state: "drafted", star_rating: 5 },
    { ...base, state: "blocked", risk: "high" as const, star_rating: 1, draft: null },
    { ...base, state: "posted", star_rating: 3 },
    { ...base, state: "skipped", star_rating: 2 },
    { ...base, state: "handled_offline", star_rating: 4 },
    { ...base, state: "drafted", reply_state: "rejected", star_rating: 4 },
  ];
  const n = (f: (typeof FILTERS)[number]["key"]) => rows.filter((r) => matchesFilter(r, f)).length;
  it("lists the seven filters of K-15 in order", () => {
    expect(FILTERS.map((f) => f.label)).toEqual([
      "Needs reply",
      "All",
      "Replied",
      "Positive",
      "Neutral",
      "Negative",
      "High risk",
    ]);
  });
  it("keeps the right reviews", () => {
    expect(n("needs")).toBe(3);
    expect(n("all")).toBe(6);
    expect(n("replied")).toBe(2);
    expect(n("positive")).toBe(3);
    expect(n("neutral")).toBe(1);
    expect(n("negative")).toBe(2);
    expect(n("high")).toBe(1);
    expect(rows.filter(needsReply)).toHaveLength(3);
  });
  it("puts high risk first on Needs reply, newest first elsewhere", () => {
    const a = { ...base, review_created_at: "2026-10-03T00:00:00Z" };
    const b = { ...base, risk: "high" as const, review_created_at: "2026-10-01T00:00:00Z" };
    const c = { ...base, review_created_at: "2026-10-02T00:00:00Z" };
    expect(sortReviews([a, b, c], "needs")[0]).toBe(b);
    expect(sortReviews([a, b, c], "all")[0]).toBe(a);
  });
});

describe("approve countdown (K-70)", () => {
  const out = (until: number) =>
    renderToStaticMarkup(
      createElement(PublishingBanner, { until, busy: false, error: "", onUndo: () => {} }),
    );
  it("says Publishing in 10 seconds with Undo", () => {
    const s = out(Date.now() + 10_000);
    expect(s).toContain("Publishing in 10 seconds");
    expect(s).toContain("Undo");
  });
  it("drops Undo once the time is up", () => {
    const s = out(Date.now() - 1000);
    expect(s).toContain("On its way to Google");
    expect(s).not.toContain("Undo");
  });
});

describe("Design 3 views: Waiting, On Google, All", () => {
  it("lists the three views in order", () => {
    expect(VIEWS.map((v) => v.label)).toEqual(["Waiting", "On Google", "All"]);
  });
  it("keeps the old addresses working: ?f=needs is Waiting, Replied is On Google, the rest All", () => {
    expect(viewFor("needs")).toBe("waiting");
    expect(viewFor("waiting")).toBe("waiting");
    expect(viewFor("replied")).toBe("google");
    for (const f of ["all", "positive", "neutral", "negative", "high"])
      expect(viewFor(f)).toBe("all");
    expect(viewFor("nonsense")).toBeUndefined();
  });
  it("says On Google only once Kabsi saw the reply there, else by the review's own state", () => {
    const posted = { ...base, state: "posted" };
    expect(onGoogle(posted, { owner: "sent" })).toBe(false);
    expect(onGoogle(posted, { owner: "confirmed" })).toBe(true);
    expect(onGoogle(posted)).toBe(true);
    expect(onGoogle({ ...posted, reply_state: "in_review" })).toBe(false);
    expect(matchesView(base, "waiting")).toBe(true);
    expect(matchesView(base, "google")).toBe(false);
    expect(matchesView(base, "all")).toBe(true);
  });
});
