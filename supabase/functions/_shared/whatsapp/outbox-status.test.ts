// Ops 1: a delivery status never turns a held message into a sent one. A held row is a message waiting for the person to
// write (its template went out; the full text did not), and release() only finds rows still in state held.
import assert from "node:assert/strict";
import { outboxStatusUpdate } from "./outbox-status.ts";

Deno.test("a delivery status leaves a held message held, so the person's next message still releases it", () => {
  for (const status of ["sent", "delivered", "read", "failed"]) {
    const u = outboxStatusUpdate(status, status === "failed" ? "131047" : null);
    assert.ok(u === null || !u.whereStates.includes("held"), `${status} must not touch a held row`);
  }
});

Deno.test("a delivery status changes only rows already sent, and only a failure changes them", () => {
  assert.equal(outboxStatusUpdate("delivered", null), null);
  assert.equal(outboxStatusUpdate("read", null), null);
  assert.deepEqual(outboxStatusUpdate("failed", "131047"), { set: { state: "failed", error: "131047" }, whereStates: ["sent"] });
});
