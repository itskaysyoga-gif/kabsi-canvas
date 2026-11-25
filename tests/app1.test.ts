// APP-1: the owner Home in three parts (the yes, the week's receipt, the profile health strip), the staff Today queue in
// urgency order, the chat list's names and state chips, and the retired plan names off the owner screens.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { profileHealth, weekReceipt } from "@/lib/home-state";
import { todayRows } from "@/lib/staff-today";
import { chatName, chatState } from "@/components/staff/chats-panel";
import type { Task } from "@/lib/tasks";

const pub = (kind: string, targetId: string, owner: string) => ({ kind, targetId, owner });
const task = (kind: Task["kind"], evidence: Record<string, unknown> = {}) => ({
  kind,
  path: "/app",
  evidence,
});

describe("This week, the receipt", () => {
  it("counts each item once, only when it went to Google, and never an undone one", () => {
    const lines = weekReceipt([
      pub("review_reply", "r1", "confirmed"),
      pub("review_reply", "r1", "sent"), // an older state of the same reply
      pub("review_reply", "r2", "sent"),
      pub("review_reply", "r3", "approved"), // still in its Undo window: not sent yet
      pub("review_reply", "r4", "undone"),
      pub("local_post", "p1", "confirmed"),
      pub("special_hours", "h1", "sent"),
    ]);
    const by = Object.fromEntries(lines.map((l) => [l.key, l.n]));
    expect(by).toEqual({ replies: 2, posts: 1, photos: 0, fixes: 1 });
  });

  it("shows the four lines at 0 when nothing happened, and a failed line only when there is one", () => {
    expect(weekReceipt([]).map((l) => l.n)).toEqual([0, 0, 0, 0]);
    const failed = weekReceipt([pub("local_post", "p1", "failed")]);
    expect(failed.at(-1)).toMatchObject({ key: "failed", n: 1, tone: "bad" });
  });
});

describe("Your Google profile, the health strip", () => {
  it("has the five parts in order, each with one action", () => {
    const items = profileHealth({ tasks: [], week: [] });
    expect(items.map((h) => h.key)).toEqual(["details", "hours", "photos", "posts", "reviews"]);
    for (const h of items) {
      expect(h.tone).toBe("ok");
      expect(h.action.to).toMatch(/^\/app\//);
    }
  });

  it("marks what waits for the owner and sends them where to act", () => {
    const items = profileHealth({
      tasks: [
        task("profile_change"),
        task("hours_confirm"),
        task("review_reply"),
        task("review_reply"),
      ],
      week: [pub("local_post", "p1", "confirmed")],
    });
    const by = Object.fromEntries(items.map((h) => [h.key, h]));
    expect(by["details"]).toMatchObject({ tone: "warn", state: "1 thing to check" });
    expect(by["hours"]).toMatchObject({ tone: "warn", action: { to: "/app/hours" } });
    expect(by["reviews"]).toMatchObject({ tone: "warn", state: "2 replies waiting" });
    expect(by["posts"]).toMatchObject({ tone: "ok", state: "Sent this week" });
  });
});

describe("Your Google profile, review fixes", () => {
  it("counts the reviews a day-one backlog holds, and sees profile gaps", () => {
    const items = profileHealth({
      tasks: [task("review_reply", { backlog_summary: true, total: 23 }), task("profile_gap")],
      week: [],
    });
    const by = Object.fromEntries(items.map((h) => [h.key, h]));
    expect(by["reviews"]).toMatchObject({ state: "23 replies waiting" });
    expect(by["details"]).toMatchObject({ tone: "warn" });
  });
});

describe("Staff Today, in urgency order", () => {
  it("puts approvals waiting, failed sends, trials ending and stopped jobs first, in that order", () => {
    const rows = todayRows({
      now: Date.parse("2026-11-25T10:00:00Z"),
      chatsHandoff: 1,
      deadJobs: 1,
      trialsEnding3d: 2,
      failedSends7d: 3,
      stuckApprovals: 1,
      foundingNew: 1,
    });
    expect(rows.map((r) => r.id)).toEqual([
      "stuck",
      "failed-sends",
      "trials",
      "dead",
      "chats",
      "founding",
    ]);
    expect(rows[2]).toMatchObject({
      text: "2 free trials end in the next 3 days",
      page: "businesses",
    });
    for (const r of rows) expect(r.text).not.toMatch(/[–—!]/);
  });
});

describe("Conversations", () => {
  it("names a chat by its business first, and gives each state a word", () => {
    expect(
      chatName({
        business_name: null,
        signed_in_business: "Cedar Corner Bakery",
        name: "A",
        email: null,
      }),
    ).toBe("Cedar Corner Bakery");
    expect(
      chatName({ business_name: null, signed_in_business: null, name: null, email: null }),
    ).toBe("Website visitor");
    expect(chatState("handoff").word).toBe("Needs a person");
    expect(chatState("open").word).toBe("Open");
    expect(chatState("reported").word).toBe("Done");
  });
});

describe("Retired plan names on the owner screens", () => {
  it("no Pro trial, no Essentials or Pro, no No card on Plan, Posts, Photos, Coach or the shell", () => {
    for (const f of [
      "src/routes/_authenticated/app/plan.tsx",
      "src/routes/_authenticated/app/posts.tsx",
      "src/routes/_authenticated/app/photos.tsx",
      "src/routes/_authenticated/app/coach.tsx",
      "src/components/layouts/app-layout.tsx",
      "src/components/home/action-center.tsx",
      "src/components/home/home-week.tsx",
    ]) {
      const s = readFileSync(f, "utf8");
      expect(s, f).not.toMatch(/Pro trial|On Essentials|On Pro\b|Essentials and Pro|No card/);
    }
  });
});
