// Tidy 2 part 3: the daily check of Kapso's webhook delivery log, driven with recorded rows. Nothing here reaches Kapso.
import assert from "node:assert/strict";
import { readWebhookDeliveries } from "./kapso-admin.ts";
import {
  buckets, DELIVERY_EMAIL_KIND, deliveryAlertFor, deliveryEmailFor, normalizeDelivery, runDeliveryCheck, stateOf, summarize,
  type Delivery, type DeliveryCheckDeps,
} from "./delivery-check.ts";
import { routeOf } from "./staff-alerts.ts";

const NOW = new Date("2026-11-10T05:17:00Z");
const row = (minutesAgo: number, status: string, extra: Record<string, unknown> = {}) =>
  normalizeDelivery({ event: "whatsapp.message.received", status, created_at: new Date(NOW.getTime() - minutesAgo * 60_000).toISOString(), webhook_id: "wh1", ...extra });

Deno.test("a row is reduced to its state, event, time and answer, and keeps no payload, number or text", () => {
  const d = normalizeDelivery({
    event: "whatsapp.message.received", status: "Failed", created_at: "2026-11-10T04:10:00Z", response_status: 500,
    webhook: { id: "wh1" }, payload: { from: "+15550100", text: "hello" }, error: "boom",
  });
  assert.deepEqual(d, { at: Date.parse("2026-11-10T04:10:00Z"), event: "whatsapp.message.received", status: "failed", code: 500, hasError: true, webhookId: "wh1" });
  assert.ok(!JSON.stringify(d).includes("15550100") && !JSON.stringify(d).includes("hello"));
  assert.equal(normalizeDelivery({}).event, "unknown");
  assert.equal(normalizeDelivery({ last_attempt_at: "2026-11-10T04:10:00Z" }).at, Date.parse("2026-11-10T04:10:00Z"));
});

Deno.test("what counts as failed: Kapso's word, an error code from Kabsi, or an error on a waiting row; good and waiting rows do not", () => {
  assert.equal(stateOf(row(5, "failed")), "failed");
  assert.equal(stateOf(row(5, "delivered", { response_status: 401 })), "failed");
  assert.equal(stateOf(row(5, "delivered", { response_status: 200 })), "ok");
  assert.equal(stateOf(row(5, "success")), "ok");
  assert.equal(stateOf(row(5, "pending")), "waiting");
  assert.equal(stateOf(row(5, "retrying", { error: "timeout" })), "failed");
  assert.equal(stateOf(row(5, "mystery")), "unknown");
  assert.equal(stateOf(row(5, "", { response_status: 204 })), "ok");
});

Deno.test("the summary counts the window only, by event and by answer, and keeps the words Kapso used", () => {
  const rows = [row(10, "delivered"), row(20, "failed", { response_status: 502 }), row(30, "failed", { event: "whatsapp.message.delivered" }), row(60 * 25, "failed"), row(15, "pending"), row(12, "mystery"),
    normalizeDelivery({ status: "failed" })];
  const s = summarize(rows, new Date(NOW.getTime() - 24 * 3_600_000), NOW);
  assert.equal(s.total, 5);
  assert.equal(s.ok, 1);
  assert.equal(s.failed, 2);
  assert.equal(s.waiting, 1);
  assert.equal(s.unknown, 1);
  assert.equal(s.undated, 1);
  assert.deepEqual(s.failed_by_event, { "whatsapp.message.received": 1, "whatsapp.message.delivered": 1 });
  assert.deepEqual(s.failed_by_code, { "502": 1, none: 1 });
  assert.deepEqual(s.statuses, { delivered: 1, failed: 2, pending: 1, mystery: 1 });
  assert.equal(s.last_failed_at, new Date(NOW.getTime() - 20 * 60_000).toISOString());
});

Deno.test("only the webhooks on the number are counted, and a row that names none is kept", () => {
  const rows = [row(10, "failed"), row(10, "failed", { webhook_id: "other" }), row(10, "failed", { webhook_id: undefined })];
  assert.equal(summarize(rows, new Date(NOW.getTime() - 3_600_000), NOW, ["wh1"]).failed, 2);
  assert.equal(summarize(rows, new Date(NOW.getTime() - 3_600_000), NOW).failed, 3);
});

Deno.test("the parts of 5 minutes show where deliveries stop or begin to fail", () => {
  const rows = [row(55, "delivered"), row(52, "delivered"), row(20, "failed"), row(18, "failed")];
  const parts = buckets(rows, new Date(NOW.getTime() - 60 * 60_000), NOW, 5);
  assert.equal(parts.length, 12);
  assert.equal(parts.reduce((n, p) => n + p.total, 0), 4);
  assert.equal(parts.reduce((n, p) => n + p.failed, 0), 2);
});

function deps(rows: Delivery[] | Error): DeliveryCheckDeps & { alerts: unknown[]; emails: unknown[] } {
  const alerts: unknown[] = [];
  const emails: unknown[] = [];
  return {
    alerts, emails,
    read: async () => { if (rows instanceof Error) throw rows; return { rows, webhookIds: ["wh1"], truncated: false }; },
    emit: async (a) => { alerts.push(a); },
    email: async (m) => { emails.push(m); },
    now: () => NOW,
  };
}

Deno.test("no failed delivery in 24 hours: no alert and no email", async () => {
  const d = deps([row(10, "delivered"), row(70, "success"), row(25 * 60, "failed")]);
  const r = await runDeliveryCheck(d);
  assert.equal(r.ok, true);
  assert.equal(r.alert_raised, false);
  assert.equal(r.email_raised, false);
  assert.deepEqual([d.alerts, d.emails], [[], []]);
});

Deno.test("failed deliveries: one staff alert on WhatsApp and one email to the team, counts only, one key a day", async () => {
  const d = deps([row(10, "delivered"), row(40, "failed", { response_status: 500, payload: { text: "private words", from: "+15550100" } }), row(50, "failed")]);
  const r = await runDeliveryCheck(d);
  assert.equal(r.ok, false);
  assert.equal(r.summary?.failed, 2);
  const a = d.alerts[0] as { kind: string; title: string; body: string; dedupe: string };
  const m = d.emails[0] as { key: string; text: string; subject: string };
  assert.equal(a.dedupe, "whatsapp_deliveries:2026-11-10");
  assert.equal(m.key, `${DELIVERY_EMAIL_KIND}:2026-11-10`);
  assert.match(a.body, /webhook deliveries 2 of 3 failed in the last 24 hours/);
  assert.match(m.text, /2 of 3 failed in the last 24 hours/);
  // Counts only: nothing of the rows' contents reaches either message.
  assert.ok(!/private words|15550100/.test(JSON.stringify([a, m])));
  // The alert rides the urgent kind, so it goes to the staff phone on WhatsApp (R-64).
  assert.equal(routeOf({ kind: a.kind }), "urgent");
  assert.equal(deliveryAlertFor(r.summary!, "2026-11-10")?.dedupe, a.dedupe);
  assert.equal(deliveryEmailFor(r.summary!, "2026-11-10")?.key, m.key);
});

Deno.test("a log that cannot be read is itself alerted, with no error text", async () => {
  const d = deps(new Error("kapso GET /platform/v1/webhook_deliveries 500: secret-ish detail"));
  const r = await runDeliveryCheck(d);
  assert.equal(r.unread, true);
  assert.equal(r.ok, false);
  assert.equal(d.alerts.length, 1);
  assert.equal(d.emails.length, 1);
  assert.ok(!JSON.stringify([d.alerts, d.emails]).includes("secret-ish"));
});

Deno.test("a log that came back but was not understood is alerted as unread, under its own key", async () => {
  // rows with no readable time
  const d = deps([normalizeDelivery({ status: "failed", createdAt: "2026-11-10T04:10:00Z" })]);
  const r = await runDeliveryCheck(d);
  assert.equal(r.unread, true);
  assert.equal(r.ok, false);
  assert.equal((d.alerts[0] as { dedupe: string }).dedupe, "whatsapp_deliveries_unread:2026-11-10");
  assert.equal((d.emails[0] as { key: string }).key, `${DELIVERY_EMAIL_KIND}_unread:2026-11-10`);
});

Deno.test("webhook ids written differently on the rows do not hide the log", () => {
  const rows = [row(10, "failed", { webhook_id: "A-1" })];
  assert.equal(summarize(rows, new Date(NOW.getTime() - 3_600_000), NOW, ["a1"]).failed, 1);
});

Deno.test("a 200 answer with no list in it is an error, not an empty log", async () => {
  const f = (async () => new Response(JSON.stringify({ deliveries: [{ status: "failed" }] }), { status: 200 })) as typeof fetch;
  await assert.rejects(() => readWebhookDeliveries({ apiKey: "k", phoneNumberId: "p", fetch: f }, "24h"), /unexpected_shape/);
  const g = (async () => new Response(JSON.stringify({ data: [] }), { status: 200 })) as typeof fetch;
  assert.deepEqual((await readWebhookDeliveries({ apiKey: "k", phoneNumberId: "p", fetch: g }, "24h")).rows, []);
});

Deno.test("a failure of one route is loud and does not hide the other", async () => {
  const d = deps([row(10, "failed")]);
  d.email = async () => { throw new Error("mail down"); };
  await assert.rejects(() => runDeliveryCheck(d), /mail down/);
  assert.equal(d.alerts.length, 1);
});

Deno.test("the reader pages by cursor, sends only GET to the delivery list with the API key, and keeps field names without values", async () => {
  const seen: { url: string; method: string }[] = [];
  const pages = [
    { data: [{ event: "e", status: "failed", created_at: "2026-11-10T04:00:00Z", secret_field: "x" }], paging: { cursors: { after: "c1" }, next: "n1" } },
    { data: [{ event: "e", status: "delivered", created_at: "2026-11-10T04:01:00Z" }], paging: { cursors: { after: "c2" } } },
  ];
  let i = 0;
  const f = (async (url: string, init?: RequestInit) => {
    seen.push({ url: String(url), method: init?.method ?? "GET" });
    return new Response(JSON.stringify(pages[i++]), { status: 200 });
  }) as typeof fetch;
  const out = await readWebhookDeliveries({ apiKey: "k", phoneNumberId: "p", fetch: f }, "7d");
  assert.equal(out.rows.length, 2);
  assert.equal(out.truncated, false);
  assert.deepEqual(out.keys, ["created_at", "event", "secret_field", "status"]);
  assert.deepEqual(seen.map((s) => s.method), ["GET", "GET"]);
  assert.match(seen[0].url, /\/platform\/v1\/webhook_deliveries\?period=7d&limit=100$/);
  assert.match(seen[1].url, /after=c1$/);
});

Deno.test("the check file holds no em dash or en dash", async () => {
  const src = await Deno.readTextFile(new URL("./delivery-check.ts", import.meta.url));
  assert.ok(!/[\u2013\u2014]/.test(src));
});
