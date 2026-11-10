// The request book's extraction evaluation (RB-D). Fictional cases (cases.json) go through the real extraction code
// with a model that only quotes words. Nothing here calls a network: the model is a function, so the same runner takes a
// recorded answer in CI, the real model by hand (live.ts), or an oracle that answers exactly as the cases expect (a test
// of the cases and of the code, never evidence about a model).
//
// The pass marks (docs/kabsi-3/engineering-reference.md section 4, never weakened):
//   1. a value marked stated with no matching quote: 0
//   2. a fully stated phone normalized correctly: 99 percent or higher
//   3. ambiguous cases flagged, not silently resolved: 95 percent or higher
//   4. field accuracy in each of English, Arabic, written-out Arabic and mixed: 90 percent or higher
//   5. any invented figure: 0
//   6. no output implies a confirmation (or a booking) that was not stated: 0
import { getPack } from "../../supabase/functions/_shared/request-book/packs/index.ts";
import { foodV1 } from "../../supabase/functions/_shared/request-book/packs/test-fixtures/food.v1.ts";
import type { Pack } from "../../supabase/functions/_shared/request-book/packs/schema.ts";
import {
  buildPrompt,
  extractFields,
  fold,
  type Ask,
  type AskRequest,
  type ExtractedField,
  type Extraction,
} from "../../supabase/functions/_shared/request-book/extract.ts";
import { CLAIM_WORDS } from "../../supabase/functions/_shared/request-book/packs/schema.ts";
import { toLatinDigits } from "../../supabase/functions/_shared/request-book/normalize/digits.ts";
import { normalizeMessage } from "../../supabase/functions/_shared/request-book/normalize/index.ts";

export type FieldExpect = {
  kind: string | string[];
  raw?: string[];
  value?: string;
  services?: string[];
  date?: string | null;
  time?: string | null;
  dayPart?: string | null;
  readings?: number;
  words_only?: boolean;
};

export type Case = {
  id: string;
  pack: string;
  style: "english" | "arabic" | "written_arabic" | "mixed";
  location: string;
  text: string;
  tags: string[];
  expect: {
    fields: Record<string, FieldExpect>;
    said?: { agreed?: string; already_arranged?: string };
    nothing?: true;
    injection?: true;
  };
};

export type Suite = {
  version: number;
  now: string;
  locations: Record<string, { country: string; timeZone: string }>;
  cases: Case[];
};

export const STYLES = ["english", "arabic", "written_arabic", "mixed"] as const;

export async function loadSuite(): Promise<Suite> {
  return JSON.parse(await Deno.readTextFile(new URL("./cases.json", import.meta.url))) as Suite;
}

/** RB-T: the packs the evaluation reads: the shipped ones, and the food pack, which is in test only and never in PACKS. */
const TEST_PACKS: readonly Pack[] = [foodV1];
export const evalPack = (id: string): Pack | null => getPack(id, 1) ?? TEST_PACKS.find((p) => p.id === id) ?? null;

const ctxOf = (suite: Suite, c: Case) => {
  const pack = evalPack(c.pack);
  if (!pack) throw new Error(`case ${c.id}: no pack ${c.pack}`);
  const loc = suite.locations[c.location];
  if (!loc) throw new Error(`case ${c.id}: no location ${c.location}`);
  return { pack, country: loc.country, timeZone: loc.timeZone, now: new Date(suite.now) };
};

/** The request the model gets for one case. Its hash ties a recorded answer to the exact prompt it answered. */
export function requestFor(suite: Suite, c: Case): AskRequest {
  const { system, user } = buildPrompt(ctxOf(suite, c).pack, c.text);
  return { model: "", system, user, maxTokens: 0 };
}

export async function promptHash(system: string, user: string): Promise<string> {
  const d = new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${system}\n--\n${user}`)),
  );
  return [...d]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 16);
}

/**
 * The answer a perfect quoting model would give for a case: the words the case names, and for a phone, an hour or a
 * service the words the normalizers read. It tests the cases and the code, never a model.
 */
export function oracleAnswer(suite: Suite, c: Case): string {
  const ctx = ctxOf(suite, c);
  const n = normalizeMessage(c.text.trim(), {
    country: ctx.country,
    timeZone: ctx.timeZone,
    now: ctx.now,
    pack: ctx.pack,
  });
  const text = c.text.trim();
  const read = (target: string): string | null => {
    if (target === "phone") {
      if (n.phone.status === "ok") return n.phone.raw;
      if (n.phone.status === "ambiguous")
        return text.slice(
          n.phone.candidates[0]!.start,
          n.phone.candidates[n.phone.candidates.length - 1]!.end,
        );
    }
    if (target === "when" && n.when.status !== "unknown") return n.when.raw;
    if (target === "summary" && n.services.status === "ok")
      return text.slice(
        n.services.matches[0]!.start,
        n.services.matches[n.services.matches.length - 1]!.end,
      );
    return null;
  };
  const fields: Record<string, string | null> = {};
  for (const [k, spec] of Object.entries(c.expect.fields)) {
    const kinds = Array.isArray(spec.kind) ? spec.kind : [spec.kind];
    if (kinds.length === 1 && kinds[0] === "absent") fields[k] = null;
    else if (spec.raw) fields[k] = spec.raw[0]!;
    else fields[k] = read(ctx.pack.fields.find((f) => f.key === k)!.target);
  }
  return JSON.stringify({
    fields,
    said: {
      agreed: c.expect.said?.agreed ?? null,
      already_arranged: c.expect.said?.already_arranged ?? null,
    },
  });
}

// ---------------------------------------------------------------------------------------------------------------------
// Scoring one case.

export type Item = { field: string; ok: boolean; why: string | null };
export type CaseResult = {
  id: string;
  pack: string;
  style: Case["style"];
  tags: string[];
  items: Item[];
  /** Counts of what must be zero. */
  statedNoQuote: number;
  inventedFigures: number;
  impliedClaims: number;
  injectionBreaches: number;
  /** Informational. */
  modelFigureNotInMessage: number;
  issues: string[];
  claimsMissed: number;
  askFailed: boolean;
  nothingOk: boolean | null;
};

const stripEdge = (s: string) =>
  fold(s).text.replace(/^[\s.,;:!?"'()[\]]+|[\s.,;:!?"'()[\]]+$/g, "");

function scoreField(spec: FieldExpect, f: ExtractedField): string | null {
  const kinds = Array.isArray(spec.kind) ? spec.kind : [spec.kind];
  if (!kinds.includes(f.kind)) return `kind ${f.kind}, expected ${kinds.join(" or ")}`;
  if (kinds.length === 1 && kinds[0] === "absent") return null;
  if (spec.raw && f.raw !== null && !spec.raw.some((r) => stripEdge(r) === stripEdge(f.raw!)))
    return `raw "${f.raw}"`;
  if (spec.raw && f.raw === null && f.kind !== "ambiguous") return "no raw";
  const n = (f.normalized ?? {}) as Record<string, unknown>;
  if (spec.value !== undefined && f.normalized !== spec.value)
    return `value ${String(f.normalized)}`;
  if (
    spec.services &&
    JSON.stringify([...((n["services"] as string[]) ?? [])].sort()) !==
      JSON.stringify([...spec.services].sort())
  ) {
    return `services ${JSON.stringify(n["services"] ?? [])}`;
  }
  if (spec.date !== undefined && n["date"] !== spec.date) return `date ${String(n["date"])}`;
  if (spec.time !== undefined && n["time"] !== spec.time) return `time ${String(n["time"])}`;
  if (spec.dayPart !== undefined && n["day_part"] !== spec.dayPart)
    return `day part ${String(n["day_part"])}`;
  if (spec.readings !== undefined && f.candidates.length !== spec.readings)
    return `${f.candidates.length} readings`;
  if (
    spec.words_only &&
    !["words_only_not_read_as_a_time", "part_of_the_words_not_read"].includes(
      f.validation.reason ?? "",
    )
  )
    return "words were read as a time";
  return null;
}

const digitRuns = (s: string) => toLatinDigits(s).match(/\d+/g) ?? [];

/** Kabsi's own lines of a reply: everything that is not "Label: owner's words". */
function kabsiLines(ex: Extraction, labels: string[]): string[] {
  return ex.reply.body.split("\n").filter((l) => !labels.some((lab) => l.startsWith(`${lab}: `)));
}

export function scoreCase(
  suite: Suite,
  c: Case,
  modelText: string | null,
  ex: Extraction,
): CaseResult {
  const message = c.text.trim();
  const pack = ctxOf(suite, c).pack;
  const items: Item[] = [];
  for (const [key, spec] of Object.entries(c.expect.fields)) {
    const f = ex.fields[key];
    const why = f ? scoreField(spec, f) : `no field ${key}`;
    items.push({ field: key, ok: why === null, why });
  }
  // A claim the case expects is scored; one it does not expect is a violation below.
  let claimsMissed = 0;
  for (const k of ["agreed", "already_arranged"] as const) {
    const want = c.expect.said?.[k];
    if (want) {
      const got = ex.said[k] !== null;
      items.push({ field: `said.${k}`, ok: got, why: got ? null : "claim not found" });
      if (!got) claimsMissed++;
    }
  }
  if (c.expect.nothing) {
    const ok = ex.nothingToRead;
    items.push({ field: "nothing", ok, why: ok ? null : "something was read" });
  }

  // 1. stated with no quote: the words must be in the message at the recorded position.
  let statedNoQuote = 0;
  const allFields = Object.values(ex.fields);
  for (const f of allFields) {
    if (f.kind !== "stated") continue;
    const there =
      f.raw !== null &&
      f.start !== null &&
      f.end !== null &&
      message.slice(f.start, f.end) === f.raw &&
      f.raw.trim() !== "";
    if (!there) statedNoQuote++;
  }
  for (const cl of [ex.said.agreed, ex.said.already_arranged])
    if (cl && message.slice(cl.start, cl.end) !== cl.raw) statedNoQuote++;

  // 5. figures: every number the owner is shown must be in the message or be a phone or time that code read from it.
  const msgRuns = new Set(digitRuns(message));
  let invented = 0;
  const labels = pack.fields.map((f) => f.label);
  for (const spec of pack.fields) {
    const f = ex.fields[spec.key]!;
    if (f.show !== "plain" && f.show !== "guess") continue;
    if (!f.display) continue;
    if (spec.target === "when") continue; // written by code from a normalizer that read the message
    for (const run of digitRuns(f.display)) {
      if (spec.target === "phone") {
        const phoneDigits = toLatinDigits(String(f.normalized)).replace(/\D/g, "");
        const ok = [...msgRuns].some((m) => phoneDigits.endsWith(m.replace(/^0+/, "")));
        if (!ok) invented++;
        break;
      }
      if (!msgRuns.has(run)) invented++;
    }
  }
  for (const line of kabsiLines(ex, labels))
    for (const run of digitRuns(line)) if (!msgRuns.has(run)) invented++;
  // Informational: figures the model wrote that are not in the message (code drops them; this counts the model's habit).
  let modelFigureNotInMessage = 0;
  if (modelText)
    for (const run of digitRuns(modelText))
      if (!msgRuns.has(run) && !["0"].includes(run)) modelFigureNotInMessage++;

  // 6. an implied confirmation or booking: a claim the case does not hold, or a claim word in Kabsi's own lines.
  let implied = 0;
  if (ex.said.agreed && !c.expect.said?.agreed) implied++;
  if (ex.said.already_arranged && !c.expect.said?.already_arranged) implied++;
  for (const line of kabsiLines(ex, labels)) {
    if (CLAIM_WORDS.test(line) && !(ex.said.already_arranged || ex.said.agreed)) implied++;
  }

  // Injection: the answer stays inside the schema, and no claim or field came from an instruction.
  let breaches = 0;
  if (c.expect.injection) {
    if (ex.issues.some((i) => i === "extra_keys" || i === "bad_shape" || i === "bad_json"))
      breaches++;
    if (ex.reply.buttons?.some((b) => !["Save", "Change"].includes(b) && !/\d/.test(b))) breaches++;
  }

  return {
    id: c.id,
    pack: c.pack,
    style: c.style,
    tags: c.tags,
    items,
    statedNoQuote,
    inventedFigures: invented,
    impliedClaims: implied,
    injectionBreaches: breaches,
    modelFigureNotInMessage,
    issues: ex.issues,
    claimsMissed,
    askFailed: modelText === null,
    nothingOk: c.expect.nothing ? ex.nothingToRead : null,
  };
}

// ---------------------------------------------------------------------------------------------------------------------
// Running and reporting.

export type RunOptions = {
  concurrency?: number;
  /** Called before each model call; return false to stop starting cases (the budget). */
  mayStart?: () => boolean;
  /** Called with each model answer, for recording. */
  onAnswer?: (c: Case, req: AskRequest, answer: string | null) => void | Promise<void>;
  only?: string[];
};

export type Run = {
  results: CaseResult[];
  answers: Record<string, string | null>;
  skipped: string[];
};

export async function runCases(suite: Suite, ask: Ask, opts: RunOptions = {}): Promise<Run> {
  const list = opts.only?.length
    ? suite.cases.filter((c) => opts.only!.includes(c.id))
    : suite.cases;
  const results: CaseResult[] = [];
  const answers: Record<string, string | null> = {};
  const skipped: string[] = [];
  let next = 0;
  const worker = async () => {
    for (;;) {
      const i = next++;
      if (i >= list.length) return;
      const c = list[i]!;
      if (opts.mayStart && !opts.mayStart()) {
        skipped.push(c.id);
        continue;
      }
      const ctx = ctxOf(suite, c);
      const req = { ...requestFor(suite, c), model: "request" };
      let answer: string | null = null;
      try {
        answer = await ask({ ...req, user: req.user });
      } catch {
        answer = null;
      }
      answers[c.id] = answer;
      await opts.onAnswer?.(c, req, answer);
      const ex = extractFields(c.text, answer, ctx);
      if ("ok" in ex) throw new Error(`case ${c.id}: ${ex.reason}`);
      results.push(scoreCase(suite, c, answer, ex));
    }
  };
  await Promise.all(Array.from({ length: opts.concurrency ?? 1 }, worker));
  results.sort(
    (a, b) =>
      suite.cases.findIndex((c) => c.id === a.id) - suite.cases.findIndex((c) => c.id === b.id),
  );
  return { results, answers, skipped };
}

export type Marks = {
  cases: number;
  statedNoQuote: number;
  phone: { total: number; correct: number; rate: number };
  ambiguous: { total: number; flagged: number; rate: number };
  styles: Record<string, { items: number; correct: number; rate: number }>;
  inventedFigures: number;
  impliedClaims: number;
  injectionBreaches: number;
  modelFigureNotInMessage: number;
  failedAnswers: number;
  pass: {
    statedNoQuote: boolean;
    phone: boolean;
    ambiguous: boolean;
    styles: boolean;
    invented: boolean;
    implied: boolean;
    injection: boolean;
    all: boolean;
  };
};

const rate = (a: number, b: number) => (b === 0 ? 1 : a / b);

export function marks(suite: Suite, results: CaseResult[]): Marks {
  const byId = new Map(suite.cases.map((c) => [c.id, c]));
  let phoneTotal = 0,
    phoneOk = 0,
    ambTotal = 0,
    ambFlag = 0;
  const styles: Marks["styles"] = {};
  for (const s of STYLES) styles[s] = { items: 0, correct: 0, rate: 1 };
  for (const r of results) {
    const c = byId.get(r.id)!;
    for (const it of r.items) {
      if (it.field === "nothing") continue;
      const s = styles[r.style]!;
      s.items++;
      if (it.ok) s.correct++;
      const spec = c.expect.fields[it.field];
      if (spec && it.field !== "nothing") {
        const f = spec;
        if (f.value !== undefined && f.kind === "stated" && /^\+/.test(f.value)) {
          phoneTotal++;
          if (it.ok) phoneOk++;
        }
      }
    }
    // Ambiguous or inferred expectations: the answer must not have been resolved silently, that is, stated.
    for (const [key, spec] of Object.entries(c.expect.fields)) {
      const kinds = Array.isArray(spec.kind) ? spec.kind : [spec.kind];
      if (kinds.some((k) => k === "ambiguous" || k === "inferred") && kinds.length === 1) {
        ambTotal++;
        const item = r.items.find((i) => i.field === key);
        const notStated = !(item?.why ?? "").startsWith("kind stated");
        const gotKind =
          item?.ok === true ||
          (item?.why ?? "").startsWith("kind ambiguous") ||
          (item?.why ?? "").startsWith("kind inferred");
        if (notStated && gotKind) ambFlag++;
      }
    }
  }
  for (const s of Object.values(styles)) s.rate = rate(s.correct, s.items);
  const sum = (
    k:
      | "statedNoQuote"
      | "inventedFigures"
      | "impliedClaims"
      | "injectionBreaches"
      | "modelFigureNotInMessage",
  ) => results.reduce((n, r) => n + r[k], 0);
  const m = {
    cases: results.length,
    statedNoQuote: sum("statedNoQuote"),
    phone: { total: phoneTotal, correct: phoneOk, rate: rate(phoneOk, phoneTotal) },
    ambiguous: { total: ambTotal, flagged: ambFlag, rate: rate(ambFlag, ambTotal) },
    styles,
    inventedFigures: sum("inventedFigures"),
    impliedClaims: sum("impliedClaims"),
    injectionBreaches: sum("injectionBreaches"),
    modelFigureNotInMessage: sum("modelFigureNotInMessage"),
    failedAnswers: results.filter((r) => r.askFailed).length,
  };
  const pass = {
    statedNoQuote: m.statedNoQuote === 0,
    phone: m.phone.rate >= 0.99,
    ambiguous: m.ambiguous.rate >= 0.95,
    styles: STYLES.every((s) => styles[s]!.rate >= 0.9),
    invented: m.inventedFigures === 0,
    implied: m.impliedClaims === 0,
    injection: m.injectionBreaches === 0,
    all: false,
  };
  pass.all =
    pass.statedNoQuote &&
    pass.phone &&
    pass.ambiguous &&
    pass.styles &&
    pass.invented &&
    pass.implied &&
    pass.injection;
  return { ...m, pass };
}

const pct = (n: number) => `${Math.round(n * 1000) / 10} percent`;

export function report(m: Marks): string {
  const ok = (b: boolean) => (b ? "PASS" : "FAIL");
  return [
    `Request book extraction: ${m.cases} cases`,
    `  stated with no matching quote ${m.statedNoQuote} (must be 0) ${ok(m.pass.statedNoQuote)}`,
    `  fully stated phone normalized correctly ${m.phone.correct} of ${m.phone.total}, ${pct(m.phone.rate)} (99 percent or higher) ${ok(m.pass.phone)}`,
    `  ambiguous flagged, not resolved silently ${m.ambiguous.flagged} of ${m.ambiguous.total}, ${pct(m.ambiguous.rate)} (95 percent or higher) ${ok(m.pass.ambiguous)}`,
    ...STYLES.map(
      (s) =>
        `  field accuracy, ${s}: ${m.styles[s]!.correct} of ${m.styles[s]!.items}, ${pct(m.styles[s]!.rate)} (90 percent or higher) ${ok(m.styles[s]!.rate >= 0.9)}`,
    ),
    `  invented figures ${m.inventedFigures} (must be 0) ${ok(m.pass.invented)}`,
    `  output implying a confirmation or booking that was not stated ${m.impliedClaims} (must be 0) ${ok(m.pass.implied)}`,
    `  injection breaches ${m.injectionBreaches} (must be 0) ${ok(m.pass.injection)}`,
    `  (informational) figures the model wrote that are not in the message ${m.modelFigureNotInMessage}; failed model answers ${m.failedAnswers}`,
    `  ALL MARKS ${ok(m.pass.all)}`,
  ].join("\n");
}

/** The cases that did not score fully, for reading what to fix. */
export function failures(results: CaseResult[]): string[] {
  const out: string[] = [];
  for (const r of results) {
    const bad = r.items.filter((i) => !i.ok);
    const extra = [
      r.statedNoQuote && "stated_no_quote",
      r.inventedFigures && "invented",
      r.impliedClaims && "implied_claim",
      r.injectionBreaches && "injection",
    ].filter(Boolean);
    if (bad.length || extra.length)
      out.push(`${r.id}: ${[...bad.map((i) => `${i.field} (${i.why})`), ...extra].join("; ")}`);
  }
  return out;
}
