import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CATEGORIES as EDGE_CATEGORIES } from "../supabase/functions/_shared/notify-categories";
import { KABSI_GROUP_ID as EDGE_GROUP_ID } from "../supabase/functions/_shared/email-layout";
import { CATEGORIES, DEFAULT_LINE } from "../src/lib/notification-categories";
import { choice, emailOptions, groupedCategories, type Pref } from "../src/lib/notifications";
import { KABSI_GROUP_ID } from "../src/lib/site";

// P0.4-09: one notification engine (K-46). The engine itself is tested in supabase/functions/_shared/notify-*.test.ts
// (Deno); these tests keep the browser's copy of the categories, the database check and the one-outbox rule honest.

const read = (p: string) => readFileSync(join(__dirname, "..", p), "utf8");

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith(".ts") && !p.endsWith(".test.ts")) out.push(p);
  }
  return out;
}

describe("the categories (K-46, K-118)", () => {
  it("the Settings screen copy equals the engine's list: ids, order, defaults, what can be switched off", () => {
    const pick = (c: {
      id: string;
      label: string;
      group: string;
      switchable: boolean;
      emailDefault: string;
      quietExempt: boolean;
      inApp: boolean;
    }) => [c.id, c.label, c.group, c.switchable, c.emailDefault, c.quietExempt, c.inApp];
    expect(CATEGORIES.map(pick)).toEqual(EDGE_CATEGORIES.map(pick));
    expect(CATEGORIES.map((c) => c.description)).toEqual(EDGE_CATEGORIES.map((c) => c.description));
  });

  it("the database accepts exactly these categories and refuses 'off' for exactly the ones that stay on", () => {
    const sql = read("supabase/migrations/20261021090000_notification_engine.sql");
    const fn = sql.slice(sql.indexOf("create function public.set_notification_pref"));
    const lists = [...fn.matchAll(/array\[([^\]]+)\]/g)].map((m) =>
      [...m[1]!.matchAll(/'([a-z_]+)'/g)].map((x) => x[1]),
    );
    const all = lists.find((l) => l.length === CATEGORIES.length)!;
    const stays = lists.find((l) => l.length < CATEGORIES.length && l.includes("access"))!;
    expect(all).toEqual(CATEGORIES.map((c) => c.id));
    expect(stays).toEqual(CATEGORIES.filter((c) => !c.switchable).map((c) => c.id));
  });

  it("a person who never changed anything gets the default; what stays on has no Off", () => {
    expect(choice([], "review_new", "email")).toBe("default");
    const prefs: Pref[] = [{ category: "review_new", channel: "email", frequency: "off" }];
    expect(choice(prefs, "review_new", "email")).toBe("off");
    expect(choice(prefs, "review_new", "in_app")).toBe("default");
    const options = (id: string) =>
      emailOptions(CATEGORIES.find((c) => c.id === id)!).map((o) => o.value);
    expect(options("review_new")).toEqual(["default", "instant", "daily_digest", "off"]);
    expect(options("access")).toEqual(["default", "instant", "daily_digest"]);
    expect(emailOptions(CATEGORIES.find((c) => c.id === "review_new")!)[0]!.label).toBe(
      `Default: ${DEFAULT_LINE.by_hours.toLowerCase()}`,
    );
  });

  it("the Settings screen shows every category once, grouped", () => {
    expect(groupedCategories().flatMap((g) => g.items.map((c) => c.id))).toEqual(
      CATEGORIES.map((c) => c.id),
    );
  });

  it("no copy has an em dash, an en dash or an exclamation mark", () => {
    for (const c of CATEGORIES) expect(`${c.label} ${c.description}`).not.toMatch(/[\u2013\u2014!]/);
  });
});

describe("one outbox", () => {
  it("only the engine's wiring (notify.ts) calls sendEmail: no sender goes round it", () => {
    const callers = walk(join(__dirname, "..", "supabase", "functions"))
      .filter((p) => /\bsendEmail\b/.test(readFileSync(p, "utf8")))
      .map((p) => p.slice(p.indexOf("supabase/functions/") + "supabase/functions/".length))
      .sort();
    // kabsi.ts defines it, notify.ts is the only caller; profile-snapshot.ts only names it as a dependency of its handler,
    // which index.ts wires to notify().
    expect(callers).toEqual([
      "_shared/kabsi.ts",
      "_shared/notify.ts",
      "_shared/profile-snapshot.ts",
      "profile-snapshot/index.ts",
    ]);
    expect(read("supabase/functions/profile-snapshot/index.ts")).toMatch(
      /sendEmail: \(o\) => notify\(/,
    );
  });

  it("nothing renders an email by itself: the layout is called only by the render step", () => {
    const callers = walk(join(__dirname, "..", "supabase", "functions"))
      .filter((p) => /\bemailLayout\(/.test(readFileSync(p, "utf8")))
      .map((p) => p.slice(p.indexOf("supabase/functions/") + "supabase/functions/".length));
    expect(callers.sort()).toEqual(["_shared/email-layout.ts", "_shared/email-render.ts"]);
  });

  it("the Kabsi group ID in emails equals the one on the screens", () => {
    expect(EDGE_GROUP_ID).toBe(KABSI_GROUP_ID);
  });
});
