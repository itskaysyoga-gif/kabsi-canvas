// Run: deno test --no-check --allow-env --allow-read supabase/functions/_shared/webhook-smoke.test.ts
// Polish 4 (master plan 30.25 item 5): the smoke test's forged webhook calls carry x-kabsi-smoke: 1. They are still
// refused the same way; a tagged 401 is counted as smoke_401, an untagged one as status_401; the staff alert on bad
// signatures ignores up to 20 tagged refusals an hour and counts every one above that.
import { assertEquals } from "jsr:@std/assert@1";
import { alertCount, isSmoke, refusalAlertDue, rejectionReason, SMOKE_FREE_PER_HOUR } from "./webhook-smoke.ts";
import { counted } from "./webhook-rejections.ts";

/** hit_rate_limit in memory: one hit per call, true while the hits are at most max (one window, the test's hour). */
function limiter() {
  const hits = new Map<string, number>();
  const limit = (key: string, max: number, windowSeconds: number) => {
    assertEquals(windowSeconds, 3600);
    const n = (hits.get(key) ?? 0) + 1;
    hits.set(key, n);
    return Promise.resolve(n <= max);
  };
  return { limit, hits };
}
const KEYS = { counted: "creem_signature_failures", smoke: "creem_smoke_refusals" };

Deno.test("polish4 smoke: only x-kabsi-smoke: 1 is the smoke tag", () => {
  assertEquals(isSmoke(new Headers({ "x-kabsi-smoke": "1" })), true);
  assertEquals(isSmoke(new Headers({ "X-Kabsi-Smoke": " 1 " })), true);
  for (const v of ["0", "true", "yes", "11", ""]) assertEquals(isSmoke(new Headers({ "x-kabsi-smoke": v })), false, v);
  assertEquals(isSmoke(new Headers()), false);
});

Deno.test("polish4 smoke: a tagged 401 is smoke_401, everything else keeps its status reason", () => {
  assertEquals(rejectionReason(401, true), "smoke_401");
  assertEquals(rejectionReason(401, false), "status_401");
  assertEquals(rejectionReason(403, true), "status_403");
  assertEquals(rejectionReason(413, true), "status_413");
  // The reason column check in public.webhook_rejections.
  for (const r of ["smoke_401", "status_401", "status_403", "status_413"]) assertEquals(/^[a-z0-9_]{1,40}$/.test(r), true, r);
});

Deno.test("polish4 smoke: counted records a tagged refusal as smoke_401 and an untagged one as status_401, same answer", async () => {
  const seen: string[] = [];
  const rec = (s: string, r: string) => (seen.push(`${s}:${r}`), Promise.resolve());
  const tagged = new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
  const out = await counted("creem", tagged, rec, true);
  assertEquals(out, tagged, "the same response goes back");
  assertEquals(out.status, 401);
  await counted("creem", new Response(null, { status: 401 }), rec);
  await counted("whatsapp", new Response(null, { status: 401 }), rec, true);
  await counted("whatsapp", new Response(null, { status: 401 }), rec, false);
  // A tagged call that is accepted is not counted at all: the tag never counts or lets in anything by itself.
  await counted("creem", new Response(null, { status: 200 }), rec, true);
  assertEquals(seen, ["creem:smoke_401", "creem:status_401", "whatsapp:smoke_401", "whatsapp:status_401"]);
});

Deno.test("polish4 smoke: the alert count ignores up to 20 tagged refusals an hour and counts every one above", () => {
  assertEquals(SMOKE_FREE_PER_HOUR, 20);
  assertEquals(alertCount(0, 20), 0);
  assertEquals(alertCount(0, 21), 1);
  assertEquals(alertCount(3, 8), 3);
  assertEquals(alertCount(5, 26), 11);
});

Deno.test("polish4 smoke: smoke runs never alert; untagged refusals alert past 5; a flood that claims to be smoke still alerts", async () => {
  // Twenty tagged refusals in an hour (one smoke run makes two on Creem): no alert.
  {
    const { limit, hits } = limiter();
    for (let i = 0; i < 20; i++) assertEquals(await refusalAlertDue(true, limit, KEYS, 5), false, `tagged ${i + 1}`);
    assertEquals(hits.get(KEYS.counted) ?? 0, 0, "tagged refusals within 20 are not counted");
  }
  // Untagged: the sixth in the hour alerts, as before.
  {
    const { limit } = limiter();
    const due = [];
    for (let i = 0; i < 7; i++) due.push(await refusalAlertDue(false, limit, KEYS, 5));
    assertEquals(due, [false, false, false, false, false, true, true]);
  }
  // Tagged above 20: the 21st to 25th count (5, no alert yet), the 26th is the sixth counted and alerts.
  {
    const { limit } = limiter();
    const due = [];
    for (let i = 0; i < 26; i++) due.push(await refusalAlertDue(true, limit, KEYS, 5));
    assertEquals(due.indexOf(true), 25);
    assertEquals(due.filter(Boolean).length, 1);
    assertEquals(alertCount(0, 26) > 5, true, "the pure count agrees");
  }
  // Mixed: 3 untagged and 23 tagged make 6 counted refusals, so the last one alerts.
  {
    const { limit } = limiter();
    for (let i = 0; i < 3; i++) assertEquals(await refusalAlertDue(false, limit, KEYS, 5), false);
    const due = [];
    for (let i = 0; i < 23; i++) due.push(await refusalAlertDue(true, limit, KEYS, 5));
    assertEquals(due.indexOf(true), 22);
    assertEquals(alertCount(3, 23), 6);
  }
});
