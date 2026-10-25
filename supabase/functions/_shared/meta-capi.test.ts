// Growth 1 (20.4): the Conversions API event, hashing, the click id route and the consent rule.
import assert from "node:assert/strict";
const assertEquals = (a: unknown, b: unknown) => assert.deepEqual(a, b);
import { adsAllowed, capiEvent, normEmail, normPhone } from "./meta-capi.ts";

const base = {
  eventId: "0b9d6c1e-6f62-4c0a-9a43-2b8f6c7d1e11",
  event: "paid",
  at: "2026-10-25T10:00:00.000Z",
  userId: "u-1",
  email: "  Owner@Example.com ",
  phone: "+1 (555) 010-0101",
  fbc: "fb.1.1730000000000.abc",
  fbp: "fb.1.1730000000000.123",
  ctwaClid: null,
  wabaId: null,
  plan: "pro",
};

Deno.test("normalises email and phone as Meta asks", () => {
  assertEquals(normEmail("  Owner@Example.com "), "owner@example.com");
  assertEquals(normEmail("not an email"), null);
  assertEquals(normPhone("+1 (555) 010-0101"), "15550100101");
  assertEquals(normPhone("12"), null);
});

Deno.test(
  "a website event: hashed email, phone and id, the browser ids, the row id as event_id",
  async () => {
    const e = await capiEvent(base);
    assertEquals(e?.event_name, "Subscribe");
    assertEquals(e?.event_id, base.eventId);
    assertEquals(e?.action_source, "website");
    const u = e?.user_data as Record<string, unknown>;
    assertEquals((u.em as string[])[0].length, 64);
    assertEquals((u.ph as string[])[0].length, 64);
    assertEquals(/@/.test(JSON.stringify(e)), false);
    assertEquals(JSON.stringify(e).includes("5550100101"), false);
    assertEquals(u.fbc, base.fbc);
  },
);

Deno.test(
  "a chat from a Click to WhatsApp ad goes as business messaging with its click id",
  async () => {
    const e = await capiEvent({
      ...base,
      event: "trial_started",
      ctwaClid: "ARAkLk",
      wabaId: "1234",
    });
    assertEquals(e?.event_name, "StartTrial");
    assertEquals(e?.action_source, "business_messaging");
    assertEquals(e?.messaging_channel, "whatsapp");
    assertEquals((e?.user_data as Record<string, unknown>).ctwa_clid, "ARAkLk");
  },
);

Deno.test("only the three listed events are sent", async () => {
  assertEquals(
    (await capiEvent({ ...base, event: "signup_completed" }))?.event_name,
    "CompleteRegistration",
  );
  assertEquals(await capiEvent({ ...base, event: "reply_published" }), null);
});

Deno.test(
  "consent: the latest choice wins; without one, only an allowance saved at sign-up",
  () => {
    assertEquals(adsAllowed(false, true), false);
    assertEquals(adsAllowed(true, null), true);
    assertEquals(adsAllowed(null, true), true);
    assertEquals(adsAllowed(null, null), false);
    assertEquals(adsAllowed(null, false), false);
  },
);
