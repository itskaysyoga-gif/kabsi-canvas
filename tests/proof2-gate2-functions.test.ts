import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  competitorTotals,
  type CompetitorDeps,
  nextAllowed,
} from "../supabase/functions/_shared/monthly-report/competitors";
import {
  MIN_MENTIONS,
  recurringFeedback,
  themeLine,
} from "../supabase/functions/_shared/monthly-report/feedback";
import { profileHealthSummary } from "../supabase/functions/_shared/monthly-report/profile-health";
import { nearbyLines } from "../supabase/functions/_shared/monthly-report/compose";
import { receiptText } from "../supabase/functions/_shared/results-report/receipt";

// PROOF-2 item 5: the pure server functions GATE-2 wires into WhatsApp, and the rules they keep.
const NOW = new Date("2026-11-01T05:00:00Z");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86400_000).toISOString();
const rev = (rating: number, comment: string | null, ago = 10) => ({
  rating,
  comment,
  createTime: daysAgo(ago),
});

describe("recurring feedback", () => {
  const wait = (n: number, rating = 2) =>
    Array.from({ length: n }, (_, i) =>
      rev(rating, `We waited a long time for the table, number ${i}.`),
    );
  it("is a topic only when 3 or more reviews mention it", () => {
    expect(MIN_MENTIONS).toBe(3);
    expect(recurringFeedback(wait(2), NOW)).toEqual([]);
    expect(recurringFeedback(wait(3), NOW)).toEqual([
      { id: "waiting", label: "waiting time", count: 3, lean: "low" },
    ]);
  });
  it("counts reviews, not words: one review that says wait twice is one mention", () => {
    expect(
      recurringFeedback([rev(1, "wait wait wait waiting queue"), rev(1, "wait"), ...wait(0)], NOW),
    ).toEqual([]);
  });
  it("looks back 90 days and no further, and ignores reviews with no words", () => {
    expect(recurringFeedback([...wait(2), rev(2, "waited ages", 91)], NOW)).toEqual([]);
    expect(recurringFeedback([...wait(2), rev(2, "waited ages", 89)], NOW)).toHaveLength(1);
    expect(recurringFeedback([rev(5, null), rev(5, "   "), rev(5, null)], NOW)).toEqual([]);
  });
  it("says where the mentions sit: mostly high stars, mostly low, or nothing when mixed", () => {
    expect(recurringFeedback(wait(4, 5), NOW)[0]!.lean).toBe("high");
    expect(recurringFeedback([...wait(2, 5), ...wait(2, 1)], NOW)[0]!.lean).toBe("mixed");
    expect(themeLine({ id: "waiting", label: "waiting time", count: 4, lean: "mixed" })).toBe(
      "4 reviews in the last 90 days mention waiting time.",
    );
  });
  it("returns at most 3 topics, most mentioned first, and never a review's words or a name", () => {
    const many = [
      ...wait(5),
      ...Array.from({ length: 4 }, () => rev(5, "The staff were lovely")),
      ...Array.from({ length: 3 }, () => rev(4, "Great price for the quality")),
      ...Array.from({ length: 3 }, () => rev(5, "Spotless and clean")),
      ...Array.from({ length: 3 }, () => rev(5, "Easy parking")),
    ];
    const got = recurringFeedback(many, NOW);
    expect(got.map((t) => t.id)).toEqual(["waiting", "staff", "clean"]);
    expect(JSON.stringify(got)).not.toMatch(/lovely|Spotless|Great price/);
  });
});

function competitorDeps(
  o: {
    picks?: (string | null)[];
    last?: Date | null;
    answers?: Record<
      string,
      ReturnType<CompetitorDeps["read"]> extends Promise<infer R> ? R : never
    >;
  } = {},
) {
  const calls: string[] = [];
  const logged: string[] = [];
  const d: CompetitorDeps = {
    picks: async () => (o.picks ?? ["p1", "p2", "p3"]).map((place_id) => ({ place_id })),
    read: async (id) => (
      calls.push(id),
      o.answers && id in o.answers
        ? o.answers[id]!
        : { name: `Business ${id}`, rating: 4.5, count: 100 }
    ),
    lastRead: async () => o.last ?? null,
    log: async (k) => void logged.push(k),
    now: () => NOW,
  };
  return { d, calls, logged };
}

describe("competitor totals: one live read, never stored", () => {
  it("reads up to 3 picks once and logs that it read, nothing else", async () => {
    const { d, calls, logged } = competitorDeps({ picks: ["p1", "p2", "p3", "p4"] });
    const r = await competitorTotals("monthly", d);
    expect(r.state).toBe("ok");
    expect(calls).toEqual(["p1", "p2", "p3"]);
    expect(logged).toEqual(["monthly"]);
    expect(r.state === "ok" && r.nearby.items.map((i) => i.name)).toEqual([
      "Business p1",
      "Business p2",
      "Business p3",
    ]);
  });
  it("the monthly read is once a calendar month: a second one in November makes no provider call", async () => {
    const { d, calls } = competitorDeps({ last: new Date("2026-11-01T05:00:00Z") });
    expect(
      await competitorTotals("monthly", { ...d, now: () => new Date("2026-11-20T10:00:00Z") }),
    ).toEqual({ state: "too_soon", again_on: "2026-12-01" });
    expect(calls).toEqual([]);
  });
  it("a request is at most one a week: an earlier read inside 7 days makes no provider call", async () => {
    const { d, calls, logged } = competitorDeps({ last: new Date("2026-10-28T05:00:00Z") });
    const r = await competitorTotals("request", d); // 4 days later
    expect(r).toEqual({ state: "too_soon", again_on: "2026-11-04" });
    expect(calls).toEqual([]);
    expect(logged).toEqual([]);
    const later = competitorDeps({ last: new Date("2026-10-24T05:00:00Z") });
    expect((await competitorTotals("request", later.d)).state).toBe("ok");
    expect(later.calls).toHaveLength(3);
  });
  it("nextAllowed: monthly resets on the 1st, weekly after 7 days to the minute", () => {
    expect(nextAllowed("monthly", null, NOW)).toBeNull();
    expect(nextAllowed("monthly", new Date("2026-10-31T23:00:00Z"), NOW)).toBeNull();
    expect(nextAllowed("request", new Date(NOW.getTime() - 7 * 86400_000), NOW)).toBeNull();
    expect(
      nextAllowed("request", new Date(NOW.getTime() - 7 * 86400_000 + 60_000), NOW)?.toISOString(),
    ).toBe("2026-11-01T05:01:00.000Z");
  });
  it("no picks, a spent Places cap and an unreadable place are told apart; a spent cap logs nothing", async () => {
    expect(await competitorTotals("monthly", competitorDeps({ picks: [] }).d)).toEqual({
      state: "none",
    });
    expect(await competitorTotals("monthly", competitorDeps({ picks: [null, null] }).d)).toEqual({
      state: "none",
    });
    const capped = competitorDeps({ answers: { p1: "back_soon" } });
    expect(await competitorTotals("monthly", capped.d)).toEqual({ state: "back_soon" });
    expect(capped.logged).toEqual([]);
    const half = competitorDeps({ answers: { p2: "back_soon" } });
    const r = await competitorTotals("monthly", half.d);
    expect(r.state === "ok" && r.nearby.items).toHaveLength(1);
    expect(half.logged).toEqual(["monthly"]);
    expect(
      await competitorTotals(
        "monthly",
        competitorDeps({ answers: { p1: null, p2: null, p3: null } }).d,
      ),
    ).toEqual({ state: "unavailable" });
  });
  it("totals only: a name, a rating and a count; no history and no claim that anyone gained", () => {
    expect(
      nearbyLines({
        read_on: "2026-11-01",
        items: [
          { name: "Juniper", rating: 4.5, count: 301 },
          { name: "Cut", rating: null, count: null },
        ],
      }),
    ).toEqual(["Juniper: 4.5 stars from 301 reviews.", "Cut: no rating shown."]);
    const code = readFileSync("supabase/functions/_shared/monthly-report/competitors.ts", "utf8");
    expect(code).not.toMatch(/\.insert\(|\.upsert\(|rpc\(/); // the module writes nothing itself; the log is a dep
    const sql = readFileSync("supabase/migrations/20261124171826_proof2_links_monthly.sql", "utf8");
    const ledger = sql.slice(
      sql.indexOf("create table public.competitor_reads"),
      sql.indexOf("-- 6. The offers"),
    );
    expect(ledger).not.toMatch(/rating|name|reviews|count/i);
  });
});

describe("profile health summary from the Profile Coach", () => {
  it("counts what is in place and names what is not, in plain words", () => {
    const s = profileHealthSummary({
      items: [
        { id: "description", status: "done" },
        { id: "categories", status: "todo" },
        { id: "services", status: "todo" },
        { id: "attributes", status: "done" },
        { id: "photos", status: "unknown" },
        { id: "service_area", status: "later" },
      ],
    });
    expect(s).toEqual({
      state: "ok",
      done: 2,
      of: 4,
      todo: ["More categories", "Services and products"],
      line: "2 of 4 profile items are in place. Still to do: More categories, Services and products.",
      path: "/app/coach",
    });
  });
  it("says nothing is missing, and says when nothing was read or the check is not on", () => {
    expect(profileHealthSummary({ items: [{ id: "description", status: "done" }] }).line).toBe(
      "1 of 1 profile items are in place. Nothing is missing.",
    );
    expect(profileHealthSummary({ items: [{ id: "description", status: "unknown" }] }).state).toBe(
      "unread",
    );
    expect(profileHealthSummary({ locked: true, items: [] }).state).toBe("locked");
    expect(profileHealthSummary(null).state).toBe("locked");
  });
  it("no score, no points, no dash", () => {
    for (const c of [null, { items: [{ id: "description", status: "todo" }] }] as const) {
      expect(profileHealthSummary(c as never).line).not.toMatch(/score|points|[–—!]/i);
    }
  });
});

describe("the weekly summary is short", () => {
  const did = [
    { key: "replies", label: "Replies sent to Google", count: 3 },
    { key: "posts", label: "Posts sent to Google", count: 1 },
    { key: "photos", label: "Photos sent to Google", count: 2 },
    { key: "hours", label: "Hours updated", count: 1 },
    { key: "drafts", label: "Replies prepared", count: 2 },
  ];
  it("a busy week is the week, three kinds of work, one find, taps, then what waits and one next step", () => {
    const t = receiptText({
      business: "Rose Lane Salon",
      dates: "19 to 25 October",
      did,
      waiting: 2,
      next: "Approve the reply to Lina",
      taps: 7,
      found: 1,
    });
    expect(t.split("\n")).toEqual([
      "*\u{1F9FE} Your weekly report* · Rose Lane Salon",
      "",
      "19 to 25 October",
      "Replies sent to Google: 3",
      "Posts sent to Google: 1",
      "Photos sent to Google: 2",
      "Found on your profile: 1 change.",
      "Review link taps: 7.",
      "",
      "Waiting for your yes: 2. Next step: Approve the reply to Lina.",
    ]);
  });
  it("never more than 5 lines of facts, and none counts a check as work", () => {
    const t = receiptText({
      business: "B",
      dates: "d",
      did,
      waiting: 0,
      next: null,
      taps: 3,
      found: 2,
    });
    const facts = t.split("\n\n")[1]!.split("\n");
    expect(facts.length).toBeLessThanOrEqual(6);
    expect(t).not.toMatch(/checked|profile checks|times/i);
    expect(t.endsWith("Nothing is waiting for your yes.")).toBe(true);
  });
  it("a quiet week says so in one line and keeps the rest", () => {
    const t = receiptText({ business: "B", did: [], waiting: 0, next: null });
    expect(t).toBe(
      "*\u{1F9FE} Your weekly report* · B\n\nA quiet week. Kabsi kept watching your Google profile.\n\nNothing is waiting for your yes.",
    );
  });
});

describe("placement links and the migration", () => {
  const sql = readFileSync("supabase/migrations/20261124171826_proof2_links_monthly.sql", "utf8");
  it("is additive: nothing is dropped, no row is changed", () => {
    expect(sql).not.toMatch(/\bdrop (table|column|function|schema|index)\b/i);
    expect(sql).not.toMatch(/\bdelete from public\.(?!link_watch_events)/i);
    expect(sql).not.toMatch(/\btruncate\b/i);
  });
  it("one link per placement, only for a member, and asking again returns the same code", () => {
    const fn = sql.slice(
      sql.indexOf("create or replace function public.create_placement_link"),
      sql.indexOf("-- 2. Taps per card"),
    );
    expect(fn).toMatch(/if not public\.is_member\(p_location\) then raise exception 'forbidden'/);
    expect(fn).toMatch(/pg_advisory_xact_lock/);
    expect(fn).toMatch(/if found then return v_code; end if;/);
    expect(sql).toMatch(
      /create unique index cards_one_placement_per_location on public\.cards \(location_id, placement\) where placement is not null/,
    );
    expect(sql).toMatch(/placement in \('booking', 'receipt', 'email_signature', 'social_bio'\)/);
  });
  it("taps by placement leave bots out and count only this business's taps, for members, staff or the service", () => {
    const fn = sql.slice(
      sql.indexOf("create or replace function public.link_taps"),
      sql.indexOf("-- 3. Link watch"),
    );
    expect(fn).toMatch(/not t\.is_bot/);
    expect(fn).toMatch(/t\.location_id = p_location/);
    expect(fn).toMatch(/is_member\(p_location\) or public\.is_staff\(\)/);
    expect(fn).not.toMatch(/\bphone\b|\bemail\b|\bip\b|country/i); // no customer detail of any kind
  });
  it("every new table has row level security on and no write for a signed-in user", () => {
    for (const t of ["link_watch", "link_watch_events", "monthly_reports", "competitor_reads"]) {
      expect(sql).toMatch(new RegExp(`alter table public\\.${t} enable row level security`));
      expect(sql).toMatch(
        new RegExp(`revoke all on public\\.${t} from public, anon, authenticated`),
      );
    }
    expect(sql).not.toMatch(/grant (insert|update|delete)[^;]* to authenticated/);
  });
  it("the generic task detectors leave the link watch's own tasks alone", () => {
    expect(sql).toMatch(/t\.dedupe_key not like 'link\\_watch:%'/);
  });
});
