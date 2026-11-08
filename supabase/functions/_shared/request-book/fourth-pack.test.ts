// RB-C2: a fourth pack needs no change to the schema, the workflow, the tools, the policy, the replies, the normalizers
// or the adapter. The fixtures here are two packs no shipped pack resembles; they pass through every part of the
// folder, and the source of every shared file is checked not to name them.
import { assert, assertEquals, assertNotMatch, assertStringIncludes } from "jsr:@std/assert@1";
import { PACKS } from "./packs/index.ts";
import { validatePack, type Pack } from "./packs/schema.ts";
import { tutorV1 } from "./packs/test-fixtures/tutor.v1.ts";
import { typedAdapter, type IntakeContext } from "./intake/adapter.ts";
import { normalizeMessage } from "./normalize/index.ts";
import { statusDecision } from "./policy.ts";
import { openListReply, proposalReply, statusChangedReply, summaryReply, type ReplyContext } from "./replies/index.ts";
import { TOOLS, checkInput } from "./tools/registry.ts";
import { OPEN_STATUSES, OUTCOMES, type RequestRow } from "./types.ts";

// A pack with one kind only, and plain words. Nothing like salon, gym or garage.
const repairs: Pack = {
  id: "repairs", version: 3, title: "Phone repairs", kinds: ["job"], defaultKind: "job",
  words: {
    customer: { singular: "owner", plural: "owners" }, staffSide: "the bench",
    kinds: { job: { singular: "Repair", plural: "Repairs" } },
    status: { job: { waiting: "Dropped off", active: "On the bench", ready: "Fixed", completed: "Picked up", cancelled: "Withdrawn", no_show: "Never came", voided: "Removed" } },
  },
  services: [{ key: "screen", label: "Screen", spellings: ["screen", "cracked screen", "display"] }, { key: "battery_swap", label: "Battery", spellings: ["battery", "charging"] }],
  fields: [
    { key: "customer_name", label: "Name", target: "customer_name", required: true },
    { key: "fault", label: "Fault", target: "summary", required: true },
    { key: "model", label: "Handset", target: "details", required: false },
  ],
  examples: [{ text: "Noor cracked screen Friday 11", kind: "job" }, { text: "42 fixed", kind: "job" }, { text: "Rami battery tomorrow 3pm", kind: "job" }],
};

const row = (kind: RequestRow["kind"], status: string, outcome: string | null = null, over: Partial<RequestRow> = {}): RequestRow => ({
  request_id: "00000000-0000-4000-8000-000000000001", number: 42, kind, status, outcome, summary: "Algebra", customer_id: "c", customer_name: "Noor",
  requested_window_text: null, starts_at: "2026-11-12T11:00:00.000Z", staff_confirmed: false, customer_confirmed: false, next_action: null,
  next_action_due_at: null, follow_up_user_id: null, created_at: "2026-11-08T09:00:00.000Z", ...over,
});

const NOW = new Date("2026-11-08T10:00:00Z");

for (const pack of [tutorV1, repairs]) {
  Deno.test(`fourth pack ${pack.id}: passes the one schema without any change to it`, () => {
    assertEquals(validatePack(pack), []);
    assertEquals(JSON.parse(JSON.stringify(pack)), pack);
    assert(!PACKS.some((p) => p.id === pack.id), "a fixture is not a shipped pack");
  });

  Deno.test(`fourth pack ${pack.id}: the normalizers, the adapter and the proposal reply read it`, () => {
    const ctx: ReplyContext = { pack, timeZone: "Asia/Dubai", now: NOW };
    const text = `Noor ${pack.services[0]!.spellings[0]} tomorrow 10, 0501234567`;
    const n = normalizeMessage(text, { country: "AE", timeZone: "Asia/Dubai", now: NOW, pack });
    assertEquals(n.services.status, "ok");
    assertEquals(n.phone.status, "ok");
    assertEquals(n.when.status, "ok");
    const ic: IntakeContext = { pack, country: "AE", timeZone: "Asia/Dubai", now: NOW };
    const r = typedAdapter.read({ text, providerMessageId: "m" }, ic);
    assert(r.ok);
    const p = proposalReply({ kind: pack.defaultKind, name: "Noor", summary: pack.services[0]!.label, norm: n }, ctx);
    assertStringIncludes(p.body, `${pack.words.kinds[pack.defaultKind]!.singular}: Noor`);
    assertEquals(p.buttons, ["Save", "Change"]);
  });

  Deno.test(`fourth pack ${pack.id}: every status and outcome of every kind it uses has its word in a reply`, () => {
    const ctx: ReplyContext = { pack, timeZone: "Asia/Dubai", now: NOW };
    for (const kind of pack.kinds) {
      for (const s of OPEN_STATUSES[kind]) {
        assertStringIncludes(summaryReply(row(kind, s), ctx).body, `Status: ${pack.words.status[kind]![s]}`);
        assertStringIncludes(statusChangedReply(row(kind, s), ctx).body, `is now ${pack.words.status[kind]![s]}.`);
      }
      for (const o of OUTCOMES[kind]) assertStringIncludes(summaryReply(row(kind, "closed", o), ctx).body, `Status: ${pack.words.status[kind]![o]}`);
      const list = openListReply([row(kind, OPEN_STATUSES[kind][0]!)], 0, ctx).body;
      assertStringIncludes(list, "This covers only what was entered in Kabsi.");
    }
  });
}

Deno.test("fourth pack: the policy and the tools take no pack at all, so they cannot differ by trade", () => {
  // The same call gives the same answer whatever business it is for: there is no pack argument to pass.
  assertEquals(statusDecision({ role: "owner", kind: "job", from: "waiting", to: "active", outcome: null, startsAt: null, now: NOW }).allowed, true);
  assertEquals(statusDecision.length, 1);
  assertEquals(Object.keys(TOOLS).length, 6);
  assertEquals(checkInput("capture", { source: "typed", text: "Noor maths Tuesday 4pm" }), { ok: true });
});

Deno.test("fourth pack: no shared file names a pack, so no shared file had to change for one", async () => {
  const dir = new URL("./", import.meta.url);
  const shared = ["types.ts", "policy.ts", "index.ts", "packs/schema.ts", "packs/index.ts", "tools/registry.ts", "replies/index.ts", "replies/words.ts",
    "normalize/index.ts", "normalize/phone.ts", "normalize/dates.ts", "normalize/digits.ts", "normalize/vocabulary.ts", "normalize/result.ts", "intake/adapter.ts"];
  for (const f of shared) {
    const src = await Deno.readTextFile(new URL(f, dir));
    assertNotMatch(src, /\b(tutor|tutoring|repairs)\b/i, f);
    for (const p of [...PACKS, tutorV1, repairs]) {
      if (f === "packs/index.ts") continue; // the one list of shipped packs, one line each
      assertNotMatch(src, new RegExp(`["'\`]${p.id}["'\`]`), `${f} names pack ${p.id}`);
    }
  }
});
