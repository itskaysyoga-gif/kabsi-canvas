import assert from "node:assert/strict";
import { CATEGORIES } from "./notify-categories.ts";
import { atLocalHour, decideEmail, digestSubject, groupDigest, inQuietHours, isOpenNow, localParts, nextLocalHour } from "./notify-rules.ts";

// Beirut is UTC+2 in winter and UTC+3 in summer; New York is UTC-5 / UTC-4.
const BEIRUT = "Asia/Beirut";
const at = (iso: string) => new Date(iso);
const base = { tz: BEIRUT, digestHour: 19 };

Deno.test("quiet hours are 22:00 to 08:00 local", () => {
  assert.equal(inQuietHours(21), false);
  assert.equal(inQuietHours(22), true);
  assert.equal(inQuietHours(3), true);
  assert.equal(inQuietHours(7), true);
  assert.equal(inQuietHours(8), false);
});

Deno.test("a high-risk review is instant by day and held until 08:00 local at night", () => {
  const day = decideEmail({ ...base, category: "review_high_risk", now: at("2026-11-10T10:00:00Z") }); // 12:00 in Beirut
  assert.deepEqual(day, { mode: "send" });
  const night = decideEmail({ ...base, category: "review_high_risk", now: at("2026-11-10T21:30:00Z") }); // 23:30 in Beirut
  assert.equal(night.mode, "hold");
  if (night.mode === "hold") assert.equal(night.until.toISOString(), "2026-11-11T06:00:00.000Z"); // 08:00 in Beirut
});

Deno.test("an urgent profile change goes at once, even in quiet hours", () => {
  const d = decideEmail({ ...base, category: "profile_urgent", now: at("2026-11-10T01:00:00Z") }); // 03:00 in Beirut
  assert.deepEqual(d, { mode: "send" });
});

Deno.test("a normal review is instant while open and in the daily digest outside opening hours", () => {
  const hours = "Mon to Sat 09:00 to 18:00, Sun closed";
  const open = decideEmail({ ...base, category: "review_new", hours, now: at("2026-11-10T10:00:00Z") }); // Tuesday 12:00
  assert.deepEqual(open, { mode: "send" });
  const closed = decideEmail({ ...base, category: "review_new", hours, now: at("2026-11-10T17:00:00Z") }); // Tuesday 19:00, after closing
  assert.equal(closed.mode, "digest");
  const sunday = decideEmail({ ...base, category: "review_new", hours, now: at("2026-11-15T10:00:00Z") });
  assert.equal(sunday.mode, "digest");
});

Deno.test("with no readable opening hours a normal review counts as open", () => {
  assert.deepEqual(decideEmail({ ...base, category: "review_new", hours: null, now: at("2026-11-10T10:00:00Z") }), { mode: "send" });
  assert.deepEqual(decideEmail({ ...base, category: "review_new", hours: "by appointment", now: at("2026-11-10T10:00:00Z") }), { mode: "send" });
});

Deno.test("everything else defaults to the daily digest at the digest hour", () => {
  for (const category of ["profile_issue", "approval_needed"]) {
    const d = decideEmail({ ...base, category, now: at("2026-11-10T10:00:00Z") }); // 12:00 in Beirut
    assert.equal(d.mode, "digest", category);
    if (d.mode === "digest") assert.equal(d.until.toISOString(), "2026-11-10T17:00:00.000Z"); // 19:00 in Beirut
  }
});

Deno.test("a digest after today's digest hour waits for tomorrow's", () => {
  const d = decideEmail({ ...base, category: "approval_needed", now: at("2026-11-10T17:30:00Z") }); // 19:30 in Beirut
  assert.equal(d.mode, "digest");
  if (d.mode === "digest") assert.equal(d.until.toISOString(), "2026-11-11T17:00:00.000Z");
});

Deno.test("a digest hour inside quiet hours moves to 08:00", () => {
  const d = decideEmail({ tz: BEIRUT, digestHour: 5, category: "approval_needed", now: at("2026-11-10T10:00:00Z") });
  assert.equal(d.mode, "digest");
  if (d.mode === "digest") assert.equal(d.until.toISOString(), "2026-11-11T06:00:00.000Z");
});

Deno.test("an owner can switch a category off, and choose instant or digest instead of the default", () => {
  const now = at("2026-11-10T10:00:00Z");
  assert.deepEqual(decideEmail({ ...base, category: "review_new", pref: "off", now }), { mode: "off" });
  assert.deepEqual(decideEmail({ ...base, category: "profile_issue", pref: "instant", now }), { mode: "send" });
  assert.equal(decideEmail({ ...base, category: "review_high_risk", pref: "daily_digest", now }).mode, "digest");
  assert.deepEqual(decideEmail({ ...base, category: "weekly_report", pref: "default", now }), { mode: "send" });
});

Deno.test("what cannot be switched off ignores off", () => {
  const now = at("2026-11-10T10:00:00Z");
  for (const c of CATEGORIES.filter((c) => !c.switchable)) {
    assert.notEqual(decideEmail({ ...base, category: c.id, pref: "off", now }).mode, "off", c.id);
  }
  assert.deepEqual(CATEGORIES.filter((c) => !c.switchable).map((c) => c.id), ["profile_urgent", "access", "billing", "account", "help"]);
});

Deno.test("system mail has no choices and no quiet hours", () => {
  assert.deepEqual(decideEmail({ ...base, category: "direct", pref: "off", now: at("2026-11-10T01:00:00Z") }), { mode: "send" });
});

Deno.test("local time helpers cross a daylight saving change", () => {
  // New York changes to winter time on 1 Nov 2026 at 02:00 local.
  assert.equal(atLocalHour("2026-10-31", 8, "America/New_York").toISOString(), "2026-10-31T12:00:00.000Z");
  assert.equal(atLocalHour("2026-11-01", 8, "America/New_York").toISOString(), "2026-11-01T13:00:00.000Z");
  const next = nextLocalHour(at("2026-11-01T04:00:00Z"), "America/New_York", 8);
  assert.equal(next.toISOString(), "2026-11-01T13:00:00.000Z");
  assert.equal(localParts(at("2026-11-10T22:30:00Z"), BEIRUT).ymd, "2026-11-11");
  assert.equal(localParts(at("2026-11-10T10:00:00Z"), BEIRUT).weekday, 1); // Tuesday
});

Deno.test("isOpenNow reads the owner's opening hours, including a close after midnight", () => {
  assert.equal(isOpenNow("Mon to Sun 09:00 to 22:00", at("2026-11-10T10:00:00Z"), BEIRUT), true);
  assert.equal(isOpenNow("Mon to Sun 09:00 to 22:00", at("2026-11-10T19:30:00Z"), BEIRUT), true); // 21:30
  assert.equal(isOpenNow("Mon to Sun 09:00 to 22:00", at("2026-11-10T20:30:00Z"), BEIRUT), false); // 22:30
  assert.equal(isOpenNow("Mon to Sun 18:00 to 02:00", at("2026-11-10T23:30:00Z"), BEIRUT), true); // 01:30 Wednesday, open since Tuesday
  assert.equal(isOpenNow("", at("2026-11-10T10:00:00Z"), BEIRUT), null);
});

Deno.test("the digest groups items by category and names the business first", () => {
  const sections = groupDigest([
    { category: "approval_needed", title: "A post is ready" },
    { category: "review_new", title: "New 5-star review" },
    { category: "review_new", title: "New 4-star review" },
    { category: "profile_issue", title: "Website changed" },
  ]);
  assert.deepEqual(sections.map((s) => [s.category, s.count]), [["review_new", 2], ["profile_issue", 1], ["approval_needed", 1]]);
  assert.equal(digestSubject("Yawmiyati", sections), "Yawmiyati: 2 new reviews, 1 profile change and 1 post or photo to approve");
  assert.equal(digestSubject("Yawmiyati", sections.slice(0, 1)), "Yawmiyati: 2 new reviews");
});
