// P0.2-02: the disconnect job, the mock admins API and the access-change notices.
// Run with: deno test --no-check _shared/ (scripts/deno-check.sh).
import assert from "node:assert/strict";
import { accessChangeEmail, addBusinessDays, type DisconnectDeps, type DisconnectState, type Notice, RemovalFailed, runDisconnect } from "./disconnect.ts";
import { removeKabsiEntries } from "./google/index.ts";
import * as accountsMock from "./google/accounts/mock.ts";
import * as adminsMock from "./google/admins/mock.ts";
import { type AdminStore, useAdminStore } from "./google/admins/mock.ts";
import type { Admin } from "./google/types.ts";
import liveAccounts from "../../../tests/fixtures/google/live/accounts.list.json" with { type: "json" };
import liveAdmins from "../../../tests/fixtures/google/live/admins.list.yawmiyati.json" with { type: "json" };

const MOCK_API = { ...accountsMock, ...adminsMock };

const REQUESTED = "2026-10-09T10:00:00.000Z";

function world(over: Partial<DisconnectState> = {}, removeFails = false) {
  const state: DisconnectState = {
    locationId: "loc-1", name: "QA Bakery", googleLocationId: "locations/mock-qa", concierge: false,
    requestedAt: REQUESTED, removedAt: null, followupDueAt: null, ...over,
  };
  const calls = { remove: 0, records: [] as { ok: boolean; error: string | null }[], notices: [] as { notice: Notice; dedupe: string }[] };
  const deps: DisconnectDeps = {
    load: () => Promise.resolve({ ...state }),
    remove: () => {
      calls.remove++;
      return removeFails ? Promise.reject(new Error("google 403 mock: PERMISSION_DENIED")) : Promise.resolve("removed");
    },
    record: (_id, ok, error) => {
      calls.records.push({ ok, error });
      if (ok) state.removedAt = state.removedAt ?? "2026-10-09T10:01:00.000Z";
      const dueAt = ok ? null : addBusinessDays(new Date(state.requestedAt!), 7).toISOString();
      if (!ok) state.followupDueAt = dueAt;
      return Promise.resolve({ removedAt: state.removedAt, dueAt });
    },
    notify: (_id, notice, dedupe) => {
      calls.notices.push({ notice, dedupe });
      return Promise.resolve();
    },
  };
  return { state, calls, deps };
}

Deno.test("disconnect: removes access, records it and sends the removed notice", async () => {
  const { calls, deps } = world();
  assert.equal(await runDisconnect("loc-1", deps), "removed");
  assert.equal(calls.remove, 1);
  assert.deepEqual(calls.records, [{ ok: true, error: null }]);
  assert.equal(calls.notices.length, 1);
  assert.equal(calls.notices[0].notice.change, "removed");
  assert.equal(calls.notices[0].dedupe, `access_change:removed:loc-1:${Date.parse("2026-10-09T10:01:00.000Z")}`);
});

Deno.test("disconnect: nothing happens without the owner's request", async () => {
  const { calls, deps } = world({ requestedAt: null });
  assert.equal(await runDisconnect("loc-1", deps), "nothing_requested");
  assert.equal(calls.remove + calls.records.length + calls.notices.length, 0);
});

Deno.test("disconnect: a forced failure opens the follow-up, tells the owner the due date and is retried", async () => {
  const { calls, deps } = world({}, true);
  await assert.rejects(runDisconnect("loc-1", deps), RemovalFailed);
  assert.equal(calls.records.length, 1);
  assert.equal(calls.records[0].ok, false);
  assert.match(calls.records[0].error!, /PERMISSION_DENIED/);
  assert.equal(calls.notices.length, 1);
  assert.equal(calls.notices[0].notice.change, "removing");
  // Requested Friday 9 Oct: 7 business days later is Tuesday 20 Oct.
  assert.equal(calls.notices[0].notice.dueAt, "2026-10-20T10:00:00.000Z");
  assert.equal(calls.notices[0].dedupe, `access_change:removing:loc-1:${Date.parse(REQUESTED)}`);
});

Deno.test("disconnect: a concierge business goes to staff without calling Google and without retries", async () => {
  const { calls, deps } = world({ concierge: true, googleLocationId: "locations/concierge-1" });
  assert.equal(await runDisconnect("loc-1", deps), "staff_followup");
  assert.equal(calls.remove, 0);
  assert.equal(calls.records[0].ok, false);
  assert.equal(calls.notices[0].notice.change, "removing");
});

Deno.test("disconnect: after staff removed access by hand, the job only sends the removed notice", async () => {
  const { calls, deps } = world({ removedAt: "2026-10-12T08:00:00.000Z" });
  assert.equal(await runDisconnect("loc-1", deps), "removed");
  assert.equal(calls.remove, 0);
  assert.equal(calls.records.length, 0);
  assert.deepEqual(calls.notices.map((n) => n.notice.change), ["removed"]);
});

Deno.test("business days skip Saturday and Sunday", () => {
  assert.equal(addBusinessDays(new Date("2026-10-09T10:00:00Z"), 1).toISOString(), "2026-10-12T10:00:00.000Z");
  assert.equal(addBusinessDays(new Date("2026-10-10T10:00:00Z"), 1).toISOString(), "2026-10-12T10:00:00.000Z");
  assert.equal(addBusinessDays(new Date("2026-10-07T10:00:00Z"), 7).toISOString(), "2026-10-16T10:00:00.000Z");
});

function memoryStore(refuse = false) {
  const removed = new Set<string>();
  const store: AdminStore = {
    read: (l) => Promise.resolve({ removed: removed.has(l), refuse }),
    remove: (l) => Promise.resolve(void removed.add(l)),
  };
  return { removed, store };
}

Deno.test("mock admins: Kabsi's own Manager entry is removed and read back, the owner's entry stays", async () => {
  const m = memoryStore();
  useAdminStore(m.store);
  try {
    assert.equal(await removeKabsiEntries(MOCK_API, "locations/mock-qa"), "removed");
    assert.ok(m.removed.has("locations/mock-qa"));
    assert.equal((await adminsMock.listLocationAdmins("locations/mock-qa")).admins?.map((a) => a.role).join(), "PRIMARY_OWNER");
    assert.equal(await removeKabsiEntries(MOCK_API, "locations/mock-qa"), "already_removed");
  } finally {
    useAdminStore(null);
  }
});

Deno.test("mock admins: a refused delete throws, so the job opens a follow-up", async () => {
  useAdminStore(memoryStore(true).store);
  try {
    await assert.rejects(removeKabsiEntries(MOCK_API, "locations/mock-qa"), /google 403/);
  } finally {
    useAdminStore(null);
  }
});

// The real responses captured by P0.7-01: Kabsi Clients is one of the accounts Kabsi lists, and the only admin
// entry removed is its MANAGER entry, never the owner's.
Deno.test("live shapes: only the Kabsi Clients MANAGER entry is deleted, then read back as gone", async () => {
  let admins: Admin[] = structuredClone(liveAdmins.body.admins);
  const deleted: string[] = [];
  const api = {
    listAccounts: () => Promise.resolve(structuredClone(liveAccounts.body)),
    listLocationAdmins: () => Promise.resolve({ admins }),
    deleteLocationAdmin: (name: string) => {
      deleted.push(name);
      admins = admins.filter((a) => a.name !== name);
      return Promise.resolve({} as Record<string, never>);
    },
  };
  assert.equal(await removeKabsiEntries(api, "locations/4825254240697973899"), "removed");
  assert.deepEqual(deleted, ["locations/4825254240697973899/admins/113746201522792609010"]);
  assert.deepEqual(admins.map((a) => a.role), ["PRIMARY_OWNER"]);
});

Deno.test("live shapes: Google answering 403 to the list means Kabsi has no access left", async () => {
  const api = {
    listAccounts: () => Promise.resolve(structuredClone(liveAccounts.body)),
    listLocationAdmins: () => Promise.reject(new Error("google 403 PERMISSION_DENIED")),
    deleteLocationAdmin: () => Promise.reject(new Error("not called")),
  };
  assert.equal(await removeKabsiEntries(api, "locations/1"), "already_removed");
});

Deno.test("live shapes: a delete Google accepts but still lists is a failure for staff", async () => {
  const admins = structuredClone(liveAdmins.body.admins);
  const api = {
    listAccounts: () => Promise.resolve(structuredClone(liveAccounts.body)),
    listLocationAdmins: () => Promise.resolve({ admins }),
    deleteLocationAdmin: () => Promise.resolve({} as Record<string, never>),
  };
  await assert.rejects(removeKabsiEntries(api, "locations/4825254240697973899"), /kabsi_still_listed/);
});

Deno.test("access-change notices say what changed and how to remove Kabsi, within the house rules", () => {
  const all = (["granted", "removing", "removed"] as const).map((change) =>
    accessChangeEmail({ change, name: "QA <Bakery>", at: REQUESTED, dueAt: "2026-10-20T10:00:00.000Z", nextStep: "One step left." }, "https://kabsi.co"));
  const [granted, removing, removed] = all;
  assert.match(granted.text, /What changed: on 9 October 2026 Kabsi accepted your invitation/);
  assert.match(granted.text, /Disconnect Kabsi from Google/);
  assert.match(granted.text, /People and access\. Remove Kabsi Clients there/);
  assert.match(removing.text, /by 20 October 2026/);
  assert.match(removing.text, /Remove Kabsi Clients there/);
  assert.match(removed.text, /How to check: .*People and access\. Kabsi Clients is no longer listed/);
  assert.match(removed.text, /review link and cards keep working/);
  for (const m of all) {
    assert.ok(m.bodyHtml.includes("QA &lt;Bakery&gt;"), "the name is escaped");
    for (const s of [m.subject, m.text, m.bodyHtml, m.note, m.title, m.preheader]) {
      assert.doesNotMatch(s, /[–—!]/, "no dashes or exclamation marks");
      assert.doesNotMatch(s, /\d{6,}/, "no group or account ids in owner email");
    }
  }
});
