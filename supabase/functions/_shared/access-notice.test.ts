// Run: deno test supabase/functions/_shared/access-notice.test.ts
// Master plan 30.10 point 5: every access change is told on WhatsApp too, to the owners who connected it, and the
// granted notice carries Google's free-from-Google line. Stubs only.
import assert from "node:assert/strict";
import { accessWhatsappBody, FREE_FROM_GOOGLE, sendAccessWhatsapp, THIRD_PARTY_HELP } from "./access-notice.ts";
import { accessChangeEmail } from "./disconnect.ts";

const APP = "https://kabsi.test";

Deno.test("each change has its own WhatsApp text, plain and in the house style", () => {
  for (const change of ["granted", "removing", "removed", "lost"] as const) {
    const b = accessWhatsappBody({ change, business: "Corner Loaf" }, APP);
    assert.match(b, /^Corner Loaf: /);
    assert.doesNotMatch(b, /[—–!]/);
    assert.ok(b.length < 1024);
  }
  const g = accessWhatsappBody({ change: "granted", business: "Corner Loaf" }, APP);
  assert.ok(g.includes(FREE_FROM_GOOGLE) && g.includes(THIRD_PARTY_HELP), "the granted notice says Business Profile is free and links Google's page");
  assert.match(accessWhatsappBody({ change: "removed", business: "Corner Loaf" }, APP), /deleted within 30 days/);
});

Deno.test("the granted email carries the free-from-Google line and Google's link", () => {
  const m = accessChangeEmail({ change: "granted", name: "Corner Loaf", at: "2026-10-25T08:00:00Z" }, APP);
  assert.ok(m.text.includes(FREE_FROM_GOOGLE) && m.text.includes(THIRD_PARTY_HELP));
  assert.ok(m.bodyHtml.includes(THIRD_PARTY_HELP));
});

Deno.test("one message to each opted-in owner; a failure for one never stops the others or throws", async () => {
  const sent: string[] = [];
  const out = await sendAccessWhatsapp("loc-1", { change: "granted", business: "Corner Loaf" }, "access_granted:loc-1", APP, {
    owners: () => Promise.resolve(["u1", "u2"]),
    send: (u, _l, kind, dedupe) => {
      sent.push(`${u}:${kind}:${dedupe}`);
      return u === "u1" ? Promise.reject(new Error("kapso down")) : Promise.resolve("sent");
    },
  });
  assert.deepEqual(sent, ["u1:access_change:access_granted:loc-1:u1", "u2:access_change:access_granted:loc-1:u2"]);
  assert.match(out.u1, /^failed/);
  assert.equal(out.u2, "sent");
  const none = await sendAccessWhatsapp("loc-1", { change: "lost", business: "X" }, "k", APP, {
    owners: () => Promise.reject(new Error("db down")), send: () => Promise.resolve("sent"),
  });
  assert.ok(none.error, "a failed lookup is reported, not thrown");
});
