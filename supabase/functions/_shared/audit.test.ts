// Run: deno test supabase/functions/_shared/audit.test.ts
import assert from "node:assert/strict";
import { auditHeaders } from "./audit.ts";

Deno.test("auditHeaders forwards request id, country, user agent and actor", () => {
  const req = new Request("https://x.test", {
    headers: { "x-request-id": "req-1", "cf-ipcountry": "lb", "user-agent": "Mozilla/5.0 (iPhone)" },
  });
  assert.deepEqual(auditHeaders(req, "00000000-0000-4000-8000-0000000000a1"), {
    "x-kabsi-request-id": "req-1",
    "x-kabsi-ip-country": "LB",
    "x-kabsi-user-agent": "Mozilla/5.0 (iPhone)",
    "x-kabsi-actor-id": "00000000-0000-4000-8000-0000000000a1",
  });
});

Deno.test("auditHeaders drops unknown country, bad actor and control characters", () => {
  const req = new Request("https://x.test", {
    headers: { "x-request-id": "a b\"c", "cf-ipcountry": "XX", "user-agent": "Boté 1" },
  });
  const h = auditHeaders(req, "not-a-uuid");
  assert.equal(h["x-kabsi-request-id"], "abc");
  assert.equal(h["x-kabsi-ip-country"], undefined);
  assert.equal(h["x-kabsi-user-agent"], "Bot 1");
  assert.equal(h["x-kabsi-actor-id"], undefined);
});

Deno.test("auditHeaders makes a request id when the request has none", () => {
  const h = auditHeaders(new Request("https://x.test"));
  assert.equal(typeof h["x-kabsi-request-id"], "string");
  assert.equal(h["x-kabsi-request-id"].length, 36);
});
