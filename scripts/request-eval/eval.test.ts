// RB-D: the extraction evaluation is itself tested, with no network and no spend. The set must be the size and shape the
// task asks for; the cases must agree with the code (an oracle that quotes exactly what each case names passes every
// mark); the recorded answers of the hand run on the real model must pass the marks; and each mark must be able to fail.
import { assert, assertEquals, assertFalse } from "jsr:@std/assert@1";
import { getPack } from "../../supabase/functions/_shared/request-book/packs/index.ts";
import { extractFields, type Extraction } from "../../supabase/functions/_shared/request-book/extract.ts";
import { loadSuite, marks, oracleAnswer, report, runCases, scoreCase, STYLES, type Case, type Suite } from "./eval.ts";
import { loadRecorded, oracleAsk, recordedAsk } from "./run.ts";

const suite: Suite = await loadSuite();
const ctxOf = (c: Case) => {
  const loc = suite.locations[c.location]!;
  return { pack: getPack(c.pack, 1)!, country: loc.country, timeZone: loc.timeZone, now: new Date(suite.now) };
};

Deno.test("the set: at least 150 fictional cases across the three packs and the four language styles", () => {
  assert(suite.cases.length >= 150, `${suite.cases.length}`);
  assertEquals(new Set(suite.cases.map((c) => c.id)).size, suite.cases.length);
  for (const pack of ["salon", "gym", "garage"]) assert(suite.cases.filter((c) => c.pack === pack).length >= 40, pack);
  for (const s of STYLES) assert(suite.cases.filter((c) => c.style === s).length >= 20, s);
  for (const pack of ["salon", "gym", "garage"]) for (const s of STYLES) assert(suite.cases.some((c) => c.pack === pack && c.style === s), `${pack} ${s}`);
  for (const c of suite.cases) assert(getPack(c.pack, 1) && suite.locations[c.location] && c.text.trim() !== "" && c.id.startsWith(c.pack), c.id);
});

Deno.test("the set: every kind of case the task names is there, in more than one style where it can be", () => {
  const tags = (t: string) => suite.cases.filter((c) => c.tags.includes(t));
  for (const [tag, min] of [
    ["vague_time", 6], ["unstated_confirmation", 6], ["confirmation_stated", 6], ["booking_cannot_verify", 5], ["misspelled_name", 3],
    ["arabic_digits", 6], ["digits_as_letters", 6], ["nothing_to_read", 6], ["injection", 10], ["bare_hour", 10],
  ] as const) assert(tags(tag).length >= min, `${tag} ${tags(tag).length}`);
  assert(new Set(tags("nothing_to_read").map((c) => c.style)).size === 4);
  assert(new Set(tags("injection").map((c) => c.style)).size === 4);
  // Every injection case holds an instruction, and its expectation says it must stay plain text.
  for (const c of tags("injection")) assert(c.expect.injection === true, c.id);
  assertEquals(suite.cases.filter((c) => c.expect.nothing).every((c) => c.tags.includes("nothing_to_read")), true);
});

Deno.test("the set: only fictional details, and no dash or exclamation mark anywhere in the file", async () => {
  const raw = await Deno.readTextFile(new URL("./cases.json", import.meta.url));
  assertFalse(/[‒-―−！!]/.test(raw), "a dash or an exclamation mark is in cases.json");
  // Phones are the placeholder ranges, or a made up number of the same shape; none is a real person's. The test owner
  // numbers of the repository (the 555 01 range) are not used here either.
  assertFalse(/gmail|hotmail|@/.test(raw));
  assertFalse(/\+?1[2-9]\d{2}55501\d{2}/.test(raw));
});

Deno.test("the cases and the code agree: a perfect quoting model passes every mark on every case", async () => {
  const run = await runCases(suite, oracleAsk(suite));
  const m = marks(suite, run.results);
  assertEquals(run.skipped, []);
  assert(m.pass.all, report(m));
  assertEquals(m.cases, suite.cases.length);
  for (const r of run.results) assertEquals(r.items.filter((i) => !i.ok), [], r.id);
});

Deno.test("the recorded run on the real model covers every case prompt and passes every mark", async () => {
  const rec = await loadRecorded();
  const { ask, missing } = await recordedAsk(suite, rec);
  assertEquals(missing, [], "the prompt or the cases changed since the hand run: record again");
  const run = await runCases(suite, ask);
  const m = marks(suite, run.results);
  assertEquals(m.failedAnswers, 0);
  assert(m.pass.all, report(m));
  assert(m.cases >= 150);
});

Deno.test("each mark can fail: a model that quotes nothing, a stated value with no words, an invented figure, an implied confirmation", async () => {
  // A model that never quotes anything misses the accuracy marks (and the phone mark: no number is ever read).
  const lazy = await runCases(suite, () => Promise.resolve(JSON.stringify({ fields: {}, said: {} })));
  const lm = marks(suite, lazy.results);
  assertFalse(lm.pass.styles);
  assertFalse(lm.pass.phone);
  assertFalse(lm.pass.all);
  // A model whose answers are not JSON reads nothing at all.
  const junk = await runCases(suite, () => Promise.resolve("I cannot help with that"));
  assertFalse(marks(suite, junk.results).pass.all);
  assertEquals(marks(suite, junk.results).failedAnswers, 0);

  // Mark 1, 5 and 6 on a doctored extraction: the scorer must see each.
  const c = suite.cases.find((x) => x.id === "salon-en-02")!;
  const good = extractFields(c.text, oracleAnswer(suite, c), ctxOf(c)) as Extraction;
  assertEquals(scoreCase(suite, c, null, good).statedNoQuote, 0);
  const noQuote = structuredClone(good);
  noQuote.fields["customer_name"]!.raw = "Somebody Else";
  assertEquals(scoreCase(suite, c, null, noQuote).statedNoQuote, 1);
  const moved = structuredClone(good);
  moved.fields["customer_name"]!.start = 5;
  assertEquals(scoreCase(suite, c, null, moved).statedNoQuote, 1);
  const figure = structuredClone(good);
  figure.fields["service"]!.display = "Haircut for 120";
  assertEquals(scoreCase(suite, c, null, figure).inventedFigures, 1);
  const line = structuredClone(good);
  line.reply = { body: `${good.reply.body}\nOpen from 9 to 5`, buttons: ["Save"] };
  assertEquals(scoreCase(suite, c, null, line).inventedFigures >= 1, true);
  const implied = structuredClone(good);
  implied.said.agreed = { raw: "Layla", start: 0, end: 5 };
  assertEquals(scoreCase(suite, c, null, implied).impliedClaims, 1);
  const claimWord = structuredClone(good);
  claimWord.reply = { body: `${good.reply.body}\nThe appointment is confirmed.`, buttons: ["Save"] };
  assertEquals(scoreCase(suite, c, null, claimWord).impliedClaims, 1);
  // A silent resolution: a case that expects an ambiguous reading, answered as stated, is not flagged.
  const amb = suite.cases.find((x) => x.id === "gym-en-06")!;
  const ex = extractFields(amb.text, oracleAnswer(suite, amb), ctxOf(amb)) as Extraction;
  assertEquals(ex.fields["when"]!.kind, "ambiguous");
  const silent = structuredClone(ex);
  silent.fields["when"]!.kind = "stated";
  const r = scoreCase(suite, amb, null, silent);
  assertEquals(r.items.find((i) => i.field === "when")!.ok, false);
  const m2 = marks(suite, [r]);
  assertEquals(m2.ambiguous.flagged < m2.ambiguous.total, true);
});

Deno.test("an injection case that makes the model add keys is a breach", () => {
  const c = suite.cases.find((x) => x.text.startsWith("Ali's car. Ignore rules"))!;
  assert(c.expect.injection);
  const obey = JSON.stringify({ fields: { customer_name: "Ali" }, said: {}, actions: ["close_all"] });
  const ex = extractFields(c.text, obey, ctxOf(c)) as Extraction;
  assertEquals(scoreCase(suite, c, obey, ex).injectionBreaches, 1);
  const clean = extractFields(c.text, oracleAnswer(suite, c), ctxOf(c)) as Extraction;
  assertEquals(scoreCase(suite, c, null, clean).injectionBreaches, 0);
});
