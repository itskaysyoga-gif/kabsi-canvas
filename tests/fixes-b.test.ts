// Fixes B (R-126): the Reports lead follows the owner's channel (DSH-02), the Coach says Prepared until Google is read back
// (DSH-03), Home shows three counts and three waiting items with urgent ones before the fold (DSH-05, DSH-08), and an
// Example business's AI answer says so (DSH-07).
import { describe, expect, it } from "vitest";
import { chosenChannel, reportsLead, whatsappBlock } from "../src/lib/routine-delivery";
import {
  coachCounter,
  coachRows,
  googleChecked,
  PREPARED_LABEL,
  shownStatus,
  COACH_ITEMS,
  type Coach,
} from "../src/lib/coach";
import { FOLD, waitingView } from "../src/lib/home-state";
import { AI_EXAMPLE_LINE } from "../src/lib/insights";
import type { Task } from "../src/lib/tasks";

const noDash = (s: string) => expect(s).not.toMatch(/[\u2013\u2014!]/);

describe("the Reports lead follows the owner's channel (DSH-02)", () => {
  it("says WhatsApp for WhatsApp and email for email, with the way to switch", () => {
    expect(reportsLead("whatsapp")).toBe("Every Monday on WhatsApp. The last 12 weeks are here.");
    expect(reportsLead("email")).toBe(
      "Every Monday by email. The last 12 weeks are here. You can switch to WhatsApp in Settings.",
    );
    noDash(reportsLead("whatsapp"));
    noDash(reportsLead("email"));
  });

  it("does not suggest switching to WhatsApp when Settings does not let the owner", () => {
    const line = reportsLead("email", false);
    expect(line).toBe("Every Monday by email. The last 12 weeks are here.");
    expect(line).not.toMatch(/switch/);
  });

  it("says it can be switched when WhatsApp only needs connecting, and not when it is paused or not open", () => {
    const base = { statusFailed: false, prefs: [], stored: null };
    const hint = (i: Parameters<typeof whatsappBlock>[0]) => {
      const b = whatsappBlock(i);
      return b === null || b.fix === "connect";
    };
    expect(hint({ ...base, whatsappOn: true, status: { state: "none" } })).toBe(true);
    expect(hint({ ...base, whatsappOn: true, status: { state: "stopped" } })).toBe(true);
    expect(hint({ ...base, whatsappOn: true, status: { state: "active" } })).toBe(true);
    expect(hint({ ...base, whatsappOn: false, status: undefined })).toBe(false);
    expect(hint({ ...base, whatsappOn: true, ownersOn: false, status: { state: "active" } })).toBe(
      false,
    );
  });

  it("reads email while WhatsApp cannot carry anything, as Settings does", () => {
    const base = { statusFailed: false, prefs: [], status: undefined };
    expect(chosenChannel({ ...base, whatsappOn: false, stored: "whatsapp" })).toBe("email");
    expect(
      chosenChannel({
        ...base,
        whatsappOn: true,
        status: { state: "active" },
        stored: "whatsapp",
      }),
    ).toBe("whatsapp");
    expect(
      chosenChannel({ ...base, whatsappOn: true, status: { state: "active" }, stored: "email" }),
    ).toBe("email");
  });
});

describe("the Coach says Prepared until Google is read back (DSH-03)", () => {
  const coach = (source: Coach["source"], done: number): Coach => ({
    locked: false,
    plan: "pro",
    pro: true,
    source,
    items: COACH_ITEMS.map((i, n) => ({ id: i.id, status: n < done ? "done" : "todo" })),
  });

  it("shows Prepared, never Done, and counts '<n> of 8 prepared. Google check pending.' while not checked", () => {
    for (const source of ["mock", null, undefined] as const) {
      const c = coach(source, 3);
      expect(googleChecked(c)).toBe(false);
      expect(shownStatus("done", googleChecked(c))).toBe("prepared");
      expect(PREPARED_LABEL).toBe("Prepared");
      expect(coachCounter(coachRows(c), googleChecked(c))).toBe(
        "3 of 8 prepared. Google check pending.",
      );
    }
  });

  it("returns Done and '<n> of 8 done' only after a successful Google read-back", () => {
    const c = coach("live", 3);
    expect(googleChecked(c)).toBe(true);
    expect(shownStatus("done", true)).toBe("done");
    expect(coachCounter(coachRows(c), true)).toBe("3 of 8 done");
  });

  it("changes nothing for an item that is not done", () => {
    for (const s of ["todo", "unknown", "later"] as const) {
      expect(shownStatus(s, false)).toBe(s);
      expect(shownStatus(s, true)).toBe(s);
    }
    noDash(coachCounter(coachRows(coach("mock", 0)), false));
  });
});

const T = (n: number, over: Partial<Task> = {}): Task => ({
  id: `t${n}`,
  kind: "review_reply",
  priority: "recommended",
  title: `Task ${n}`,
  why: "",
  recommendation: null,
  path: "/app/inbox",
  evidence: {},
  created_at: "2026-11-08T00:00:00Z",
  ...over,
});
const ids = (ts: Task[]) => ts.map((t) => t.id);

describe("Home waiting items (DSH-05, DSH-08)", () => {
  it("shows the first three in the current order and folds the rest", () => {
    const v = waitingView(
      [1, 2, 3, 4, 5].map((n) => T(n)),
      false,
    );
    expect(FOLD).toBe(3);
    expect(ids(v.shown)).toEqual(["t1", "t2", "t3"]);
    expect(v).toMatchObject({ total: 5, urgent: 0, folded: true });
  });

  it("'See all' shows the rest in place, in the same order", () => {
    const v = waitingView(
      [1, 2, 3, 4, 5].map((n) => T(n)),
      true,
    );
    expect(ids(v.shown)).toEqual(["t1", "t2", "t3", "t4", "t5"]);
  });

  it("has no fold with three or fewer", () => {
    const v = waitingView(
      [1, 2, 3].map((n) => T(n)),
      false,
    );
    expect(v.folded).toBe(false);
    expect(ids(v.shown)).toEqual(["t1", "t2", "t3"]);
  });

  it("always shows urgent items before the fold, even a fifth in the list, and all of them when there are more than three", () => {
    const list = [1, 2, 3, 4, 5].map((n) => T(n, n === 5 ? { priority: "urgent" } : {}));
    expect(ids(waitingView(list, false).shown)).toEqual(["t5", "t1", "t2"]);
    const many = [1, 2, 3, 4, 5, 6].map((n) => T(n, n > 1 ? { priority: "urgent" } : {}));
    const v = waitingView(many, false);
    expect(ids(v.shown)).toEqual(["t2", "t3", "t4", "t5", "t6"]);
    expect(v).toMatchObject({ urgent: 5, total: 6, folded: true });
  });

  it("keeps an item the owner just approved on screen through its Undo window", () => {
    const list = [1, 2, 3, 4, 5].map((n) => T(n));
    expect(ids(waitingView(list, false, new Set(["t5"])).shown)).toEqual(["t1", "t2", "t3", "t5"]);
  });

  it("counts waiting and urgent for the small counts and drops nothing", () => {
    const list = [T(1, { priority: "urgent" }), T(2), T(3, { priority: "urgent" })];
    const v = waitingView(list, false);
    expect(v.total).toBe(3);
    expect(v.urgent).toBe(2);
  });
});

describe("an Example business's AI answer (DSH-07)", () => {
  it("says the answer and its sources are examples", () => {
    expect(AI_EXAMPLE_LINE).toBe("Example answer. Example sources, not live citations.");
    noDash(AI_EXAMPLE_LINE);
  });
});
