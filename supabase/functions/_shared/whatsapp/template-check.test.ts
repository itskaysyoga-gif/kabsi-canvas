// Kapso 1: the list of every template the code can send (and the guard that keeps a send inside it), and the daily check of
// Kabsi's WhatsApp number and templates, driven with recorded Kapso answers. Nothing here reaches Kapso or Meta.
import assert from "node:assert/strict";
import { mockSender } from "./deliver.ts";
import { countParams, readHealth, readTemplateDetails } from "./kapso-admin.ts";
import { routeOf } from "./staff-alerts.ts";
import {
  alertFor, bestTier, CHECK_KIND, checkTemplate, compareNumber, compareTemplates, numberFromHealth, runCheck, tierValue,
  type Alert, type NumberReading, type TemplateFound,
} from "./template-check.ts";
import { allDefs, assertSendable, ref, SENDABLE_NAMES, SENDABLE_TEMPLATES, sendName, TEMPLATE_LANGUAGE, TEMPLATES, type TemplateKey } from "./templates.ts";

// ---- the list and the guard -------------------------------------------------------------------------------------------

Deno.test("the list holds every name the code can send, built from the table, with its language and parameters", () => {
  assert.deepEqual(SENDABLE_TEMPLATES.map((t) => t.name).sort(), allDefs().map((d) => d.name).sort());
  assert.equal(new Set(SENDABLE_TEMPLATES.map((t) => t.name)).size, SENDABLE_TEMPLATES.length, "no name twice");
  for (const t of SENDABLE_TEMPLATES) {
    assert.equal(t.language, TEMPLATE_LANGUAGE, t.name);
    assert.equal(t.category, "UTILITY", t.name);
    assert.ok(t.params.length > 0, t.name);
  }
  // The parameters are exactly what ref() fills.
  for (const key of Object.keys(TEMPLATES) as TemplateKey[]) {
    const r = ref(key, {});
    assert.deepEqual(SENDABLE_TEMPLATES.find((t) => t.name === r.name)?.params, Object.keys(r.params), key);
  }
  const v2 = SENDABLE_TEMPLATES.find((t) => t.name === "kabsi_access_lost_v2")!;
  assert.equal(v2.replaces, "kabsi_access_lost");
  assert.equal(SENDABLE_TEMPLATES.find((t) => t.name === "kabsi_access_lost")!.replacedBy, "kabsi_access_lost_v2");
  // Sync 2a (R-142 item 6): the work update v1 fallback is retired; the approved v2 is the only name, and nothing is submitted.
  assert.ok(!SENDABLE_NAMES.has("kabsi_work_update"), "kabsi_work_update is retired");
  const wu = SENDABLE_TEMPLATES.find((t) => t.name === "kabsi_work_update_v2")!;
  assert.equal(wu.replaces, null);
  assert.equal(wu.replacedBy, null);
  assert.equal(ref("work_update", {}).name, "kabsi_work_update_v2");
});

Deno.test("name list guard: a send with a name outside the list fails, in the sender and in the source", async () => {
  // Every name ref() or sendName() can produce is on the list, whatever the stored statuses say.
  const everyApproved = Object.fromEntries([...SENDABLE_NAMES].map((n) => [n, "APPROVED"]));
  for (const key of Object.keys(TEMPLATES) as TemplateKey[]) {
    const name = ref(key, {}).name;
    assert.ok(SENDABLE_NAMES.has(name), name);
    assert.ok(SENDABLE_NAMES.has(sendName(name, everyApproved)), name);
    assert.ok(SENDABLE_NAMES.has(sendName(name, {})), name);
  }
  // The sender (the mock one stands in for the live one, which calls the same guard) refuses an unlisted name.
  const sender = mockSender();
  await sender.template("1", "kabsi_review_waiting", { business: "x", stars: "5" });
  await assert.rejects(() => sender.template("1", "kabsi_made_up", {}), /template_not_listed/);
  await assert.rejects(() => sender.template("1", "hello_world", {}), /template_not_listed/);
  assert.throws(() => assertSendable(""), /template_not_listed/);
  assert.doesNotMatch((() => { try { assertSendable("bad name\n+9611234567"); } catch (e) { return String((e as Error).message); } return ""; })(), /\+|\s{2}/, "the error never carries more than a clean name");
  // The live sender calls the same guard (it cannot be driven without Kapso's client).
  assert.match(await Deno.readTextFile(new URL("./kapso.ts", import.meta.url)), /assertSendable\(name\)/);
  // No source file names a Kabsi template that is not on the list (a new template must be added to the table first).
  const root = new URL("../../", import.meta.url);
  const stray: string[] = [];
  async function walk(dir: URL) {
    for await (const e of Deno.readDir(dir)) {
      const url = new URL(e.name + (e.isDirectory ? "/" : ""), dir);
      if (e.isDirectory) await walk(url);
      else if (e.name.endsWith(".ts") && !e.name.endsWith(".test.ts") && !e.name.endsWith(".test-helpers.ts")) {
        for (const m of (await Deno.readTextFile(url)).matchAll(/["'`](kabsi_[a-z0-9_]+)["'`]/g)) {
          if (!SENDABLE_NAMES.has(m[1]) && !ALLOWED_OTHER_KABSI_STRINGS.has(m[1])) stray.push(`${e.name}: ${m[1]}`);
        }
      }
    }
  }
  await walk(root);
  assert.deepEqual(stray, [], "a template name outside the list");
});

/** Strings that start with kabsi_ in code but are not template names. None today; a name added here must say why. */
const ALLOWED_OTHER_KABSI_STRINGS = new Set<string>();

// ---- the comparison on recorded answers -------------------------------------------------------------------------------

const good = (): TemplateFound[] => SENDABLE_TEMPLATES.map((t) => ({ name: t.name, status: "APPROVED", category: "UTILITY", language: "en", params: t.params.length }));
const set = (rows: TemplateFound[], name: string, patch: Partial<TemplateFound>) => rows.map((r) => (r.name === name ? { ...r, ...patch } : r));
const findingNames = (rows: TemplateFound[]) => compareTemplates(rows).findings.map((f) => `${f.item} ${f.problem}`);

Deno.test("check: every template approved, utility, in English, with the right parameters is clean", () => {
  const r = compareTemplates(good());
  assert.deepEqual(r.findings, []);
  assert.ok(r.templates.every((t) => t.state === "ok"));
});

Deno.test("check: not approved (rejected, paused, pending), missing, wrong category, language and parameter count each name the item", () => {
  // kabsi_review_waiting has no replacement, so it is always in use.
  assert.deepEqual(findingNames(set(good(), "kabsi_review_waiting", { status: "REJECTED" })), ["kabsi_review_waiting is rejected, not approved"]);
  assert.deepEqual(findingNames(set(good(), "kabsi_review_waiting", { status: "PAUSED" })), ["kabsi_review_waiting is paused, not approved"]);
  assert.deepEqual(findingNames(set(good(), "kabsi_review_waiting", { status: "PENDING" })), ["kabsi_review_waiting is pending, not approved"]);
  assert.deepEqual(findingNames(good().filter((t) => t.name !== "kabsi_review_waiting")), ["kabsi_review_waiting is missing"]);
  assert.deepEqual(findingNames(set(good(), "kabsi_review_waiting", { category: "MARKETING" })), ["kabsi_review_waiting is marketing, not utility"]);
  assert.deepEqual(findingNames(set(good(), "kabsi_review_waiting", { language: "ar" })), ["kabsi_review_waiting is not in the language the code sends"]);
  // The code fills two parameters (business, stars): Meta has one.
  assert.deepEqual(findingNames(set(good(), "kabsi_review_waiting", { params: 1 })), ["kabsi_review_waiting has 1 parameters, the code fills 2"]);
  assert.deepEqual(findingNames(set(good(), "kabsi_review_waiting", { params: 3 })), ["kabsi_review_waiting has 3 parameters, the code fills 2"]);
  // The name exists in two languages: the English one is the one that counts.
  const both = [...good(), { name: "kabsi_review_waiting", status: "REJECTED", category: "UTILITY", language: "ar", params: 2 }];
  assert.deepEqual(compareTemplates(both).findings, []);
});

Deno.test("check: a replacement that is not ready leaves the first name in use, and a replacement that fails sends the check to the first name", () => {
  // v2 pending: the first name is what the sender sends, so it is the one checked; the v2 is reported, not alerted.
  const pendingV2 = set(good(), "kabsi_access_lost_v2", { status: "PENDING" });
  const a = compareTemplates(pendingV2);
  assert.deepEqual(a.findings, []);
  assert.equal(a.templates.find((t) => t.name === "kabsi_access_lost_v2")!.in_use, false);
  assert.equal(a.templates.find((t) => t.name === "kabsi_access_lost_v2")!.state, "not_approved");
  assert.equal(a.templates.find((t) => t.name === "kabsi_access_lost")!.in_use, true);
  // The same, and the fallback itself is paused: that one raises.
  assert.deepEqual(findingNames(set(pendingV2, "kabsi_access_lost", { status: "PAUSED" })), ["kabsi_access_lost is paused, not approved"]);
  // v2 ready: the first name is only the fallback now, so its own state does not raise.
  const fine = compareTemplates(set(good(), "kabsi_access_lost", { category: "MARKETING" }));
  assert.deepEqual(fine.findings, []);
  assert.equal(fine.templates.find((t) => t.name === "kabsi_access_lost")!.in_use, false);
  // v2 filed as Marketing is never sent (sendName), so the first name is in use and checked.
  const marketingV2 = set(good(), "kabsi_access_lost_v2", { category: "MARKETING" });
  assert.equal(compareTemplates(marketingV2).templates.find((t) => t.name === "kabsi_access_lost")!.in_use, true);
  // A replacement the sender will send (APPROVED, UTILITY) with the wrong parameters or language is in use, and raises.
  // kabsi_access_lost takes one parameter (business).
  assert.deepEqual(findingNames(set(good(), "kabsi_access_lost_v2", { params: 3 })), ["kabsi_access_lost_v2 has 3 parameters, the code fills 1"]);
  assert.deepEqual(findingNames(set(good(), "kabsi_access_lost_v2", { language: "ar" })), ["kabsi_access_lost_v2 is not in the language the code sends"]);
  // The check's idea of "in use" is the sender's: sendName picks the replacement exactly when the check says it is in use.
  for (const t of SENDABLE_TEMPLATES.filter((x) => x.replacedBy)) {
    for (const [status, category] of [["APPROVED", "UTILITY"], ["APPROVED", "MARKETING"], ["PENDING", "UTILITY"], ["PAUSED", "UTILITY"]]) {
      const rows = set(good(), t.replacedBy!, { status, category });
      const map = { [t.replacedBy!]: category !== "UTILITY" ? "NOT_UTILITY" : status };
      const used = compareTemplates(rows).templates.find((r) => r.name === t.replacedBy)!.in_use;
      assert.equal(used, sendName(t.name, map) === t.replacedBy, `${t.name} ${status} ${category}`);
    }
  }
});

Deno.test("check: the number, quality YELLOW or RED, a lower messaging limit and an unverified webhook raise; the rest does not", () => {
  const n = (p: Partial<NumberReading> = {}): NumberReading => ({ numberStatus: "CONNECTED", nameStatus: "APPROVED", quality: "GREEN", tier: "TIER_1K", webhookVerified: true, ...p });
  assert.deepEqual(compareNumber(n(), "TIER_1K"), []);
  assert.deepEqual(compareNumber(n({ tier: "TIER_10K" }), "TIER_1K"), [], "a higher limit is fine");
  assert.deepEqual(compareNumber(n({ quality: "YELLOW" }), null).map((f) => f.item), ["number quality"]);
  assert.deepEqual(compareNumber(n({ quality: "red" }), null).map((f) => f.item), ["number quality"]);
  assert.deepEqual(compareNumber(n({ quality: null }), null), [], "unknown is not YELLOW");
  assert.deepEqual(compareNumber(n({ tier: "TIER_250" }), "TIER_1K").map((f) => `${f.item} ${f.problem}`), ["messaging limit is TIER_250, it was TIER_1K"]);
  assert.deepEqual(compareNumber(n({ webhookVerified: false }), null).map((f) => f.item), ["webhook"]);
  assert.deepEqual(compareNumber(n({ webhookVerified: null }), null), [], "Kapso did not say");
  assert.equal(compareNumber(n({ quality: "RED", tier: "TIER_250", webhookVerified: false }), "TIER_10K").length, 3);
  // The display name and the number's own status are read and reported, and do not raise (the display name waits for Meta, PROGRESS).
  assert.deepEqual(compareNumber(n({ nameStatus: "PENDING_REVIEW", numberStatus: "PENDING" }), null), []);
  assert.equal(tierValue("TIER_250"), 250);
  assert.equal(tierValue("TIER_100K"), 100_000);
  assert.equal(tierValue("TIER_UNLIMITED"), Infinity);
  assert.equal(tierValue("nonsense"), null);
  assert.equal(bestTier(["TIER_250", null, "TIER_10K", "TIER_1K", "bad"]), "TIER_10K");
  assert.equal(bestTier([null]), null);
});

// Recorded answers, the shape Kapso's proxy gives for Meta's template list and for the number's health.
const META_TEMPLATES = {
  data: [
    { name: "kabsi_review_waiting", status: "APPROVED", category: "UTILITY", language: "en",
      components: [{ type: "BODY", text: "Kabsi here. A new {{stars}}-star review for {{business}} is waiting for your reply. Reply here to see the draft." }, { type: "BUTTONS", buttons: [] }] },
    { name: "kabsi_post_ready", status: "REJECTED", category: "UTILITY", language: "en", components: [{ type: "BODY", text: "Kabsi here. A post for {{business}} is ready." }] },
    { name: "kabsi_staff_alert_v3", status: "PAUSED", category: "UTILITY", language: "en", components: [{ type: "BODY", text: "Kabsi here. {{summary}}." }] },
    { name: "someone_elses_template", status: "APPROVED", category: "MARKETING", language: "en", components: [{ type: "BODY", text: "{{1}} and {{2}}" }] },
  ],
};
const HEALTH = { data: { status: "healthy", checks: { webhook_verified: { passed: true }, messaging_health: { overall_status: "LIMITED" } }, checked_at: "2026-11-09T05:00:00Z" } };
const META_NUMBER = { quality_rating: "GREEN", messaging_limit_tier: "TIER_250", name_status: "PENDING_REVIEW", status: "CONNECTED" };

function recordedKapso() {
  const calls: string[] = [];
  const f: typeof fetch = (input, init) => {
    const url = String(input);
    calls.push(`${init?.method ?? "GET"} ${new URL(url).pathname}`);
    const body = url.includes("/message_templates") ? META_TEMPLATES : url.endsWith("/health") ? HEALTH : url.includes("fields=quality_rating") ? META_NUMBER : { business_account_id: "123456789012345" };
    return Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));
  };
  return { f, calls };
}
Deno.test("the check source has no dash or exclamation literal", async () => {
  for (const f of ["./template-check.ts", "./template-check.test.ts"]) {
    const text = await Deno.readTextFile(new URL(f, import.meta.url));
    assert.doesNotMatch(text, /[\u2013\u2014]/, f);
  }
});

const ENV = (f: typeof fetch) => ({ apiKey: "test-key", phoneNumberId: "1111111111", wabaId: "123456789012345", fetch: f });

Deno.test("recorded Kapso answers: templates and number are read, nothing is written, and the parameters are counted", async () => {
  const k = recordedKapso();
  const found = await readTemplateDetails(ENV(k.f));
  const health = numberFromHealth(await readHealth(ENV(k.f)));
  assert.ok(k.calls.every((c) => c.startsWith("GET ")), "read only: no POST, PATCH or DELETE");
  assert.deepEqual(found.find((t) => t.name === "kabsi_review_waiting"), { name: "kabsi_review_waiting", status: "APPROVED", category: "UTILITY", language: "en", params: 2 });
  assert.equal(found.find((t) => t.name === "someone_elses_template")!.params, 2, "numbered parameters count too");
  assert.equal(countParams([{ type: "BODY", text: "{{a}} {{a}} {{ b }}" }]), 2, "the same parameter twice is one");
  assert.equal(countParams(undefined), 0);
  assert.deepEqual(health, { numberStatus: "CONNECTED", nameStatus: "PENDING_REVIEW", quality: "GREEN", tier: "TIER_250", webhookVerified: true });
  // The check on those answers: the rejected and the paused template are found, the ones Meta does not list are missing, the foreign one is ignored.
  const r = compareTemplates(found);
  const byName = new Map(r.templates.map((t) => [t.name, t.state]));
  assert.equal(byName.get("kabsi_review_waiting"), "ok");
  assert.equal(byName.get("kabsi_post_ready"), "not_approved");
  assert.equal(byName.get("kabsi_staff_alert_v3"), "not_approved");
  assert.equal(byName.get("kabsi_listing_change"), "missing");
  assert.ok(!byName.has("someone_elses_template"));
  // kabsi_staff_alert_v3 is paused, so its first name (not listed by Meta here) is the one in use and the one that is missing.
  assert.ok(r.findings.some((f) => f.item === "kabsi_staff_alert" && f.problem === "is missing"));
  assert.ok(!r.findings.some((f) => f.item === "kabsi_staff_alert_v3"), "a replacement that is not ready is reported, not alerted");
});

// ---- the whole check and the once-a-day alert ---------------------------------------------------------------------------

function deps(found: TemplateFound[], number: NumberReading, best: string | null, now: string, emitted: Alert[]) {
  return { readNumber: async () => number, readTemplates: async () => found, bestTier: async () => best, emit: async (a: Alert) => void emitted.push(a), now: () => new Date(now) };
}
const NUMBER_OK: NumberReading = { numberStatus: "CONNECTED", nameStatus: "APPROVED", quality: "GREEN", tier: "TIER_1K", webhookVerified: true };

Deno.test("once a day: a clean check raises nothing, a bad one raises one alert whose key is the day, however often it runs", async () => {
  const emitted: Alert[] = [];
  const clean = await runCheck(deps(good(), NUMBER_OK, "TIER_1K", "2026-11-10T05:17:00Z", emitted));
  assert.equal(clean.ok, true);
  assert.equal(clean.alert_raised, false);
  assert.equal(emitted.length, 0);

  const bad = set(good(), "kabsi_staff_alert", { status: "PAUSED" });
  const stillBad = set(bad, "kabsi_staff_alert_v3", { status: "PAUSED" });
  for (const at of ["2026-11-10T05:17:00Z", "2026-11-10T05:17:00Z", "2026-11-10T21:59:00Z"]) {
    await runCheck(deps(stillBad, { ...NUMBER_OK, quality: "YELLOW" }, "TIER_1K", at, emitted));
  }
  assert.equal(emitted.length, 3, "the check emits each time it runs...");
  assert.equal(new Set(emitted.map((a) => a.dedupe)).size, 1, "...but all under one key, so ops_emit keeps one event that day (its dedupe_key is unique)");
  assert.equal(emitted[0].dedupe, `${CHECK_KIND}:2026-11-10`);
  await runCheck(deps(stillBad, NUMBER_OK, "TIER_1K", "2026-11-11T05:17:00Z", emitted));
  assert.equal(emitted.at(-1)!.dedupe, `${CHECK_KIND}:2026-11-11`, "the next day is a new key");
});

Deno.test("the alert names the items and their states only, in plain words, and goes to the staff phone", async () => {
  const emitted: Alert[] = [];
  const rows = set(set(good(), "kabsi_review_waiting", { params: 1 }), "kabsi_post_ready", { status: "REJECTED" });
  const r = await runCheck(deps(rows, { ...NUMBER_OK, quality: "RED", webhookVerified: false, tier: "TIER_250" }, "TIER_1K", "2026-11-10T05:00:00Z", emitted));
  assert.equal(r.findings.length, 5);
  const a = emitted[0];
  assert.equal(a.kind, CHECK_KIND);
  assert.equal(a.channel, "alerts");
  assert.equal(routeOf({ kind: a.kind }), "urgent", "the staff phone on WhatsApp (R-64), not the digest and not email only");
  assert.match(a.title, /^WhatsApp check found 5 items: kabsi_review_waiting, kabsi_post_ready, number quality and 2 more$/);
  for (const text of [a.title, a.body]) {
    assert.doesNotMatch(text, /[\u2013\u2014!]/, "no dash or exclamation mark");
    assert.doesNotMatch(text, /\+?\d{7,}/, "no phone number or id");
    assert.doesNotMatch(text, /test-key|secret|token/i);
  }
  assert.match(a.body, /kabsi_post_ready is rejected, not approved/);
  assert.match(a.body, /kabsi_review_waiting has 1 parameters, the code fills 2/);
  assert.match(a.body, /messaging limit is TIER_250, it was TIER_1K/);
  assert.equal(alertFor([], "2026-11-10"), null);
  assert.equal(alertFor([{ item: "webhook", problem: "is not verified" }], "2026-11-10")!.title, "WhatsApp check found 1 item: webhook");
  // The answer of the check holds names and states only.
  assert.doesNotMatch(JSON.stringify(r), /\+?\d{7,}|test-key/);
});

Deno.test("a check that cannot read Kapso does not pass: the unread part is itself a finding, with no error text", async () => {
  const emitted: Alert[] = [];
  const r = await runCheck({
    readNumber: async () => { throw new Error("kapso GET /platform/v1/whatsapp 500: key=abcdefghijklmnopqrstuvwxyz0123456789"); },
    readTemplates: async () => good(),
    bestTier: async () => { throw new Error("db down"); },
    emit: async (a) => void emitted.push(a),
    now: () => new Date("2026-11-10T05:00:00Z"),
  });
  assert.equal(r.ok, false);
  assert.deepEqual(r.findings, [{ item: "number reading", problem: "could not be read from Kapso" }]);
  assert.equal(r.number, null);
  assert.doesNotMatch(emitted[0].body + emitted[0].title, /abcdefghijkl|500/);
  const r2 = await runCheck({ ...deps([], NUMBER_OK, null, "2026-11-10T05:00:00Z", emitted), readTemplates: async () => { throw new Error("x"); } });
  assert.deepEqual(r2.findings, [{ item: "template list", problem: "could not be read from Kapso" }], "an unread list is not 'every template missing'");
});

Deno.test("checkTemplate on its own: the order of the checks is missing, language, status, category, parameters", () => {
  const t = SENDABLE_TEMPLATES.find((x) => x.name === "kabsi_review_waiting")!;
  const row = (p: Partial<TemplateFound>): TemplateFound => ({ name: t.name, status: "APPROVED", category: "UTILITY", language: "en", params: 2, ...p });
  assert.equal(checkTemplate(t, [], true).state, "missing");
  assert.equal(checkTemplate(t, [row({ language: "fr" })], true).state, "wrong_language");
  assert.equal(checkTemplate(t, [row({ status: "REJECTED", category: "MARKETING", params: 9 })], true).state, "not_approved");
  assert.equal(checkTemplate(t, [row({ category: "MARKETING", params: 9 })], true).state, "wrong_category");
  assert.equal(checkTemplate(t, [row({ params: 9 })], true).state, "wrong_params");
  assert.equal(checkTemplate(t, [row({ language: "EN" })], true).state, "ok");
});
