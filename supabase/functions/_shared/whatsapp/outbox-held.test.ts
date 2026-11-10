// Ops 1: a held message waits 30 days for the person to write, then it is closed (dropped, error held_expired), not held
// for 30 more days. Inside the window it is sent as written.
import assert from "node:assert/strict";
import type { Sender } from "./deliver.ts";
import { flush, type OutDb, type OutRow } from "./outbox.ts";

const DAY = 86_400_000;
const NOW = Date.parse("2026-12-10T10:00:00Z");

function world(row: Partial<OutRow>, windowOpen: boolean) {
  const marks: { ids: number[]; state: string; error?: string | null }[] = [];
  const sent: string[] = [];
  const full: OutRow = { id: 1, phone: "+10000000001", user_id: null, location_id: null, kind: "staff_alert", body: "x", buttons: [], template: null,
    urgent: true, state: "sending", due_at: new Date(NOW).toISOString(), attempts: 0, ...row };
  const db: OutDb = {
    state: async () => ({ live_ok: true, window_expires_at: windowOpen ? new Date(NOW + DAY).toISOString() : null } as never),
    add: async () => 2,
    mark: async (ids, state, o) => { marks.push({ ids, state, error: o?.error }); },
    claim: async () => [full],
    get: async () => [],
    release: async () => 0,
    setQuestion: async () => {},
  };
  const sender: Sender = {
    live: false,
    text: async () => { sent.push("text"); return { id: "m1" }; },
    buttons: async () => { sent.push("buttons"); return { id: "m1" }; },
    template: async () => { sent.push("template"); return { id: "m1" }; },
  } as unknown as Sender;
  return { out: { db, live: sender, mock: sender, now: () => new Date(NOW) }, marks, sent };
}

Deno.test("a held message older than 30 days is closed, not held again", async () => {
  const w = world({ error: "outside_window", created_at: new Date(NOW - 31 * DAY).toISOString() }, false);
  await flush(w.out);
  assert.deepEqual(w.marks, [{ ids: [1], state: "dropped", error: "held_expired" }]);
  assert.deepEqual(w.sent, []);
});

Deno.test("a held message inside its 30 days stays held when the window is closed, and is sent when the person has written", async () => {
  const young = world({ error: "outside_window", created_at: new Date(NOW - 5 * DAY).toISOString() }, false);
  await flush(young.out);
  assert.equal(young.marks[0].state, "held");
  const opened = world({ error: "outside_window", created_at: new Date(NOW - 5 * DAY).toISOString() }, true);
  await flush(opened.out);
  assert.equal(opened.marks[0].state, "mock_sent");
  assert.deepEqual(opened.sent, ["text"]);
});
