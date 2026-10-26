// Staff alerts on WhatsApp (13b part 2, master plan 9.9, 26.9, 30.9 item 5): which events go at once, the plain text, the
// morning digest and its hour.
import assert from "node:assert/strict";
import { alertText, digestDue, morningDigest, numbersText, plain, routeOf, type Summary } from "./staff-alerts.ts";

const S: Summary = {
  signups: 1, trials_started: 1, paid_new: 0, paid_total: 0, cancellations: 0, reviews_answered: 3, replies_waiting: 2, handoffs_waiting: 1,
  publications_stuck: 0, jobs_failed: 0, errors_by_job: [], ai_cost_micros: 450_000, places_today: 16, places_cap: 20, dataforseo_micros: 0,
  dataforseo_cap_usd: 10, number_quality: "GREEN", number_messaging: "LIMITED", alerts_24h: 4,
};

Deno.test("urgent events go at once, number events by email only, the rest wait for the digest", () => {
  for (const k of ["jobs_silent", "access_lost", "google_needs_action", "publication_failed", "billing_alert", "payment", "whatsapp_handoff", "places_80", "places_cap", "ai_global_cap", "smoke_failed", "backup_failed"]) {
    assert.equal(routeOf({ kind: k }), "urgent", k);
  }
  assert.equal(routeOf({ kind: "whatsapp_number" }), "email_only");
  for (const k of ["signup", "business_new", "chat_started", "advisor_finding", "digest"]) assert.equal(routeOf({ kind: k }), "digest", k);
});

Deno.test("Slack-era titles become plain WhatsApp words in the house style", () => {
  assert.equal(plain(":warning: Places requests at 80 percent — of *today's* cap!"), "Places requests at 80 percent, of today's cap.");
  assert.equal(plain("See <https://kabsi.co/staff|Job health>"), "See Job health");
  const a = alertText({ id: 1, kind: "places_80", channel: "alerts", title: ":warning: Places at 80 percent:", body: "16 of 20 today.", created_at: "" });
  assert.equal(a.summary, "Places at 80 percent");
  assert.equal(a.body, "Kabsi staff alert: Places at 80 percent.\n\n16 of 20 today.");
  assert.doesNotMatch(a.body, /[—–!]/);
});

Deno.test("the morning digest: things to do, number health, the numbers, three one-tap buttons", () => {
  const d = morningDigest(S);
  assert.match(d.body, /^Morning\. 2 things today: 1 person wants to talk to someone, 2 replies are waiting for owners, number health good\./);
  assert.match(d.body, /AI cost since yesterday: \$0\.45\. Places today: 16 of 20\. DataForSEO: \$0\.00 of \$10 this month\./);
  assert.deepEqual(d.buttons.map((b) => b.title), ["Waiting", "Status", "Today"]);
  assert.match(morningDigest({ ...S, handoffs_waiting: 0, replies_waiting: 0, number_quality: "YELLOW" }).body, /^Morning\. Nothing is waiting for you today, number health yellow, messaging limited\./);
  assert.match(numbersText({ ...S, errors_by_job: [{ job: "sync", n: 48 }] }), /most from sync 48 \(2\.0 an hour\)/);
  for (const t of [d.body, numbersText(S)]) assert.doesNotMatch(t, /[—–!]|Slack/);
});

Deno.test("the digest goes in the 08:00 hour in Beirut, summer and winter", () => {
  assert.deepEqual(digestDue(new Date("2026-10-24T05:02:00Z")), { due: true, day: "2026-10-24" }); // UTC+3
  assert.equal(digestDue(new Date("2026-10-24T06:02:00Z")).due, false);
  assert.equal(digestDue(new Date("2026-10-26T05:02:00Z")).due, false); // UTC+2 after 25 Oct
  assert.deepEqual(digestDue(new Date("2026-10-26T06:02:00Z")), { due: true, day: "2026-10-26" });
});
