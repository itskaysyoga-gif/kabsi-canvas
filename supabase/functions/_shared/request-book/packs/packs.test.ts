// RB-C2: the packs are data, and one schema checks them all.
import { assert, assertEquals } from "jsr:@std/assert@1";
import { OPEN_STATUSES, OUTCOMES, KINDS, statusKeys } from "../types.ts";
import { PACKS, garageV1, getPack, gymV1, salonV1 } from "./index.ts";
import { PACK_ID, assertValidPack, validatePack, type Pack } from "./schema.ts";

const clone = (p: Pack): Record<string, unknown> => JSON.parse(JSON.stringify(p));
const problems = (p: unknown) => validatePack(p).map((x) => `${x.path} ${x.message}`);

Deno.test("packs: salon, gym and garage are valid against the one schema", () => {
  assertEquals(PACKS.map((p) => `${p.id}.v${p.version}`), ["salon.v1", "gym.v1", "garage.v1"]);
  for (const p of PACKS) assertEquals(validatePack(p), [], p.id);
  for (const p of PACKS) assertEquals(assertValidPack(p), p);
});

Deno.test("packs: a pack is data only, so it survives a round trip through JSON unchanged", () => {
  for (const p of PACKS) assertEquals(JSON.parse(JSON.stringify(p)), p, p.id);
});

Deno.test("packs: ids match the database check, and a location row finds its pack by id and version", () => {
  for (const p of PACKS) assert(PACK_ID.test(p.id), p.id);
  assertEquals(getPack("salon", 1), salonV1);
  assertEquals(getPack("gym", 1), gymV1);
  assertEquals(getPack("garage", 1), garageV1);
  assertEquals(getPack("salon", 2), null);
  assertEquals(getPack("clinic", 1), null);
  assertEquals(new Set(PACKS.map((p) => p.id)).size, PACKS.length);
});

Deno.test("packs: each pack gives a word for every status and outcome of every kind it uses, and for no other", () => {
  for (const p of PACKS) {
    for (const k of KINDS) {
      if (p.kinds.includes(k)) {
        assertEquals(Object.keys(p.words.status[k]!).sort(), statusKeys(k).sort(), `${p.id} ${k}`);
        assert(p.words.kinds[k], `${p.id} ${k} word`);
      } else {
        assertEquals(p.words.status[k], undefined, `${p.id} ${k}`);
        assertEquals(p.words.kinds[k], undefined, `${p.id} ${k}`);
      }
    }
  }
});

Deno.test("packs: the three differ in the words an owner reads, and agree on the codes", () => {
  assertEquals(salonV1.words.status.appointment!["requested"], "Requested");
  assertEquals(garageV1.words.status.job!["active"], "In the shop");
  assertEquals(gymV1.words.status.enquiry!["new"], "Not contacted");
  assertEquals(salonV1.defaultKind, "appointment");
  assertEquals(gymV1.defaultKind, "enquiry");
  assertEquals(garageV1.defaultKind, "job");
  for (const p of PACKS) {
    for (const k of p.kinds) {
      assertEquals(OPEN_STATUSES[k].every((s) => s in p.words.status[k]!), true);
      assertEquals(OUTCOMES[k].every((s) => s in p.words.status[k]!), true);
    }
  }
});

Deno.test("packs: no word that claims a fact, no dash, no exclamation mark and no Arabic script anywhere in a pack", () => {
  for (const p of PACKS) {
    const text = JSON.stringify(p);
    assert(!/[\u2013\u2014!]/.test(text), `${p.id} dash or exclamation mark`);
    assert(!/[\u0600-\u06ff]/.test(text), `${p.id} Arabic script`);
    // Examples are what an owner types and may say booked or confirmed; the words an owner is shown may not.
    const shown = JSON.stringify({ title: p.title, words: p.words, services: p.services.map((s) => s.label), fields: p.fields.map((f) => f.label) });
    assert(!/\b(book(ed|ing)?|available|availability|confirm(ed|ation)?)\b/i.test(shown), `${p.id} claim word`);
  }
});

Deno.test("packs: every example is for a kind the pack uses, and there are at least 3 and at most 12", () => {
  for (const p of PACKS) {
    assert(p.examples.length >= 3 && p.examples.length <= 12, p.id);
    for (const e of p.examples) assert(p.kinds.includes(e.kind), `${p.id}: ${e.text}`);
  }
});

Deno.test("packs: one spelling means one service in a pack", () => {
  for (const p of PACKS) {
    const seen = new Map<string, string>();
    for (const s of p.services) for (const sp of s.spellings) {
      assert(!seen.has(sp) || seen.get(sp) === s.key, `${p.id}: ${sp}`);
      seen.set(sp, s.key);
    }
  }
});

// ---- the schema refuses what is not a pack ------------------------------------------------------------------

Deno.test("schema: a pack that is not an object, or has a field the schema does not know, is refused", () => {
  assert(problems(null).length > 0);
  assert(problems("pack").length > 0);
  assert(problems([]).length > 0);
  const extra = { ...clone(salonV1), onSave: "doSomething()" };
  assert(problems(extra).some((x) => x.startsWith("onSave")));
});

Deno.test("schema: id, version and title", () => {
  assert(problems({ ...clone(salonV1), id: "Salon" }).some((x) => x.startsWith("id")));
  assert(problems({ ...clone(salonV1), id: "s" }).some((x) => x.startsWith("id")));
  assert(problems({ ...clone(salonV1), version: 0 }).some((x) => x.startsWith("version")));
  assert(problems({ ...clone(salonV1), version: 1.5 }).some((x) => x.startsWith("version")));
  assert(problems({ ...clone(salonV1), title: "" }).some((x) => x.startsWith("title")));
});

Deno.test("schema: kinds", () => {
  assert(problems({ ...clone(salonV1), kinds: [] }).some((x) => x.startsWith("kinds")));
  assert(problems({ ...clone(salonV1), kinds: ["appointment", "dinner"] }).some((x) => x.includes("unknown kind dinner")));
  assert(problems({ ...clone(salonV1), kinds: ["appointment", "appointment", "enquiry"] }).some((x) => x.includes("twice")));
  assert(problems({ ...clone(salonV1), defaultKind: "job" }).some((x) => x.startsWith("defaultKind")));
});

Deno.test("schema: a missing, extra or repeated status word is refused", () => {
  const p = clone(salonV1) as { words: { status: Record<string, Record<string, string>>; kinds: Record<string, unknown> } };
  delete p.words.status["appointment"]!["no_show"];
  assert(problems(p).some((x) => x.includes("words.status.appointment.no_show")));

  const q = clone(salonV1) as typeof p;
  q.words.status["appointment"]!["arrived"] = "Arrived";
  assert(problems(q).some((x) => x.includes("arrived") && x.includes("not a status or outcome")));

  const r = clone(salonV1) as typeof p;
  r.words.status["job"] = { waiting: "Waiting" };
  assert(problems(r).some((x) => x.includes("words.status.job") && x.includes("does not use")));

  const s = clone(salonV1) as typeof p;
  s.words.kinds["job"] = { singular: "Job", plural: "Jobs" };
  assert(problems(s).some((x) => x.includes("words.kinds.job")));

  const t = clone(garageV1) as typeof p;
  t.words.status["job"]!["active"] = "waiting";
  assert(problems(t).some((x) => x.includes("open statuses need different words")));

  const u = clone(salonV1) as typeof p;
  u.words.status["appointment"]!["attended"] = "cancelled";
  u.words.status["appointment"]!["cancelled"] = "Cancelled";
  assert(problems(u).some((x) => x.includes("outcomes need different words")));
});

Deno.test("schema: a word that claims a fact is refused in anything an owner is shown, and allowed in an example", () => {
  for (const bad of ["Booked", "Available", "Confirmed", "Not available", "Booking made", "Confirmation sent"]) {
    const p = clone(salonV1) as { words: { status: Record<string, Record<string, string>> } };
    p.words.status["appointment"]!["requested"] = bad;
    assert(problems(p).some((x) => x.includes("claims a fact")), bad);
  }
  const ok = clone(salonV1) as { examples: { text: string; kind: string }[] };
  ok.examples[0] = { text: "Sarah confirmed, booked Thursday", kind: "appointment" };
  assertEquals(problems(ok), []);
});

Deno.test("schema: no dash, exclamation mark, Arabic script, edge space or length overrun in a word", () => {
  const mk = (word: string) => {
    const p = clone(salonV1) as { words: { status: Record<string, Record<string, string>> } };
    p.words.status["appointment"]!["requested"] = word;
    return problems(p);
  };
  assert(mk("Asked \u2014 waiting").some((x) => x.includes("dash")));
  assert(mk("Asked \u2013 waiting").some((x) => x.includes("dash")));
  assert(mk("Asked!").some((x) => x.includes("exclamation")));
  assert(mk("\u0645\u0631\u062d\u0628\u0627").some((x) => x.includes("Arabic script")));
  assert(mk(" Asked").some((x) => x.includes("spaces at an end")));
  assert(mk("x".repeat(41)).length > 0);
  assert(mk("").length > 0);
});

Deno.test("schema: services need a key, a label and plain spellings, and no spelling serves two services", () => {
  const base = () => clone(salonV1) as { services: { key: string; label: string; spellings: unknown[] }[] };
  const a = base();
  a.services[1]!.key = a.services[0]!.key;
  assert(problems(a).some((x) => x.includes("used twice")));
  const b = base();
  b.services[0]!.spellings = [];
  assert(problems(b).some((x) => x.includes("needs at least one spelling")));
  const c = base();
  c.services[0]!.spellings = ["Highlights"];
  assert(problems(c).some((x) => x.includes("lower case")));
  const d = base();
  d.services[0]!.spellings = ["high  lights"];
  assert(problems(d).some((x) => x.includes("lower case") || x.includes("double space")));
  const e = base();
  e.services[1]!.spellings = [...e.services[1]!.spellings, "balayage"];
  assert(problems(e).some((x) => x.includes("one spelling means one service")));
  const f = base();
  f.services[0]!.key = "Bad Key";
  assert(problems(f).some((x) => x.includes("services[0].key")));
  const g = base();
  g.services[0]!.spellings = ["caf\u00e9"];
  assert(problems(g).some((x) => x.includes("lower case")));
});

Deno.test("schema: fields need a name and a summary target, no repeated key or target, and a known target", () => {
  const base = () => clone(salonV1) as { fields: { key: string; label: string; target: string; required: unknown }[] };
  const a = base();
  a.fields = a.fields.filter((f) => f.target !== "customer_name");
  assert(problems(a).some((x) => x.includes("needs a field for customer_name")));
  const b = base();
  b.fields = b.fields.filter((f) => f.target !== "summary");
  assert(problems(b).some((x) => x.includes("needs a field for summary")));
  const c = base();
  c.fields[1]!.target = "customer_name";
  assert(problems(c).some((x) => x.includes("only one field may fill this target")));
  const d = base();
  d.fields[1]!.key = d.fields[0]!.key;
  assert(problems(d).some((x) => x.includes("used twice")));
  const e = base();
  e.fields[1]!.target = "everything";
  assert(problems(e).some((x) => x.includes("must be one of")));
  const f = base();
  f.fields[1]!.required = "yes";
  assert(problems(f).some((x) => x.includes("true or false")));
  const g = base();
  g.fields = [];
  assert(problems(g).some((x) => x.startsWith("fields")));
  // Several details fields are fine.
  assertEquals(problems(clone(garageV1)), []);
});

Deno.test("schema: examples", () => {
  const base = () => clone(salonV1) as { examples: { text: string; kind: string }[] };
  const a = base();
  a.examples = a.examples.slice(0, 2);
  assert(problems(a).some((x) => x.includes("3 to 12")));
  const b = base();
  b.examples = Array.from({ length: 13 }, () => ({ text: "Sarah trim", kind: "appointment" }));
  assert(problems(b).some((x) => x.includes("3 to 12")));
  const c = base();
  c.examples[0]!.kind = "job";
  assert(problems(c).some((x) => x.includes("must be one of the used kinds")));
  const d = base();
  d.examples[0]!.text = "Sarah! trim";
  assert(problems(d).some((x) => x.includes("exclamation")));
});

Deno.test("schema: assertValidPack throws and names every problem", () => {
  let message = "";
  try {
    assertValidPack({ ...clone(salonV1), id: "Bad", kinds: [] } as unknown as Pack);
  } catch (e) {
    message = (e as Error).message;
  }
  assert(message.includes("is not valid") && message.includes("id") && message.includes("kinds"));
});

// ---- found by the independent review ---------------------------------------------------------------------------

Deno.test("schema: a key the schema does not define is refused at every level, not only the top", () => {
  const withExtra = (mutate: (p: Record<string, any>) => void) => {
    const p = clone(salonV1) as Record<string, any>;
    mutate(p);
    return problems(p);
  };
  assert(withExtra((p) => { p.services[0].run = "x"; }).some((x) => x.startsWith("services[0].run")));
  assert(withExtra((p) => { p.fields[0].onSave = "x"; }).some((x) => x.startsWith("fields[0].onSave")));
  assert(withExtra((p) => { p.examples[0].extra = "x"; }).some((x) => x.startsWith("examples[0].extra")));
  assert(withExtra((p) => { p.words.hook = "x"; }).some((x) => x.startsWith("words.hook")));
  assert(withExtra((p) => { p.words.customer.extra = "x"; }).some((x) => x.startsWith("words.customer.extra")));
  assert(withExtra((p) => { p.words.kinds.appointment.extra = "x"; }).some((x) => x.includes("words.kinds.appointment.extra")));
});

Deno.test("schema: every Arabic block and every dash or exclamation mark an owner could read is refused", () => {
  const mk = (title: string) => problems({ ...clone(salonV1), title });
  for (const c of ["\u0645", "\u0750", "\u08a1", "\ufb51", "\ufe8d", "\ufdf2"]) assert(mk(`Salon ${c}`).some((x) => x.includes("Arabic script")), c.codePointAt(0)!.toString(16));
  for (const c of ["\u2012", "\u2013", "\u2014", "\u2015", "\u2212", "\uff01", "!"]) assert(mk(`Salon ${c} one`).some((x) => x.includes("dash")), c.codePointAt(0)!.toString(16));
});

Deno.test("schema: likely_pm_hours is optional data, whole hours from 1 to 7, no repeats; salon and garage list them, gym does not", () => {
  const base = () => clone(salonV1) as Record<string, unknown>;
  assertEquals(problems(base()), []);
  const without = base();
  delete without["likely_pm_hours"];
  assertEquals(problems(without), []);
  for (const bad of [[], [0], [8], [1.5], ["3"], [3, 3], "3", null]) {
    assert(problems({ ...base(), likely_pm_hours: bad }).some((x) => x.startsWith("likely_pm_hours")), JSON.stringify(bad));
  }
  assertEquals(salonV1.likely_pm_hours, [1, 2, 3, 4, 5, 6, 7]);
  assertEquals(garageV1.likely_pm_hours, [1, 2, 3, 4, 5]);
  assertEquals(gymV1.likely_pm_hours, undefined);
});
