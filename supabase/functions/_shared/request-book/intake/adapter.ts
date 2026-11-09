// One interface for every way a request can arrive (RB-C2). Typed entry is the first adapter; a forward, a form, a voice
// note, a screenshot or a booking system will each add an adapter and change nothing else. Every adapter produces the
// same thing: a draft of the proposal record (request_intakes), with what code could read from the message and where
// in the message it was found. An adapter never writes: saving is the owner's tap, through the capture tool.
// No model is called here. Reading names and what the request is for from free text is a later session (RB-D).
import type { Pack } from "../packs/schema.ts";
import { normalizeMessage, NORMALIZER_VERSIONS, type NormalizedMessage } from "../normalize/index.ts";
import { INTAKE_SOURCES, type IntakeSource, type OriginChannel } from "../types.ts";

export const ADAPTER_INTERFACE_VERSION = 1;
export const MAX_RAW_TEXT = 8000;

/** What the adapter is told about the business and the moment. It comes from the verified sender and the location, never from the message. */
export type IntakeContext = { pack: Pack; country: string | null; timeZone: string; now: Date };

export type IntakeInput = {
  text: string | null;
  /** The provider's id for the message, so one message makes one proposal. */
  providerMessageId: string | null;
  originChannel?: OriginChannel;
};

/** What is stored for each field: the words, where they were, what code made of them, and nothing the owner has not seen. */
export type FieldEvidence = {
  kind: "stated" | "inferred" | "ambiguous" | "absent";
  raw: string | null;
  start: number | null;
  end: number | null;
  normalized: unknown;
  normalizer: { name: string; version: number } | null;
  candidates: unknown[];
  validation: { passed: boolean; reason: string | null };
  owner_action: null;
};

export type IntakeDraft = {
  source: IntakeSource;
  rawText: string | null;
  providerMessageId: string | null;
  originChannel: OriginChannel;
  fieldEvidence: Record<string, FieldEvidence>;
  normalized: NormalizedMessage | null;
  /** True while a name and what the request is for still have to be read from the words (the extraction call, RB-D). */
  needsExtraction: boolean;
};

export type IntakeRefusal = { ok: false; reason: "empty" | "too_long" | "unsupported_source" };
export type IntakeResult = { ok: true; draft: IntakeDraft } | IntakeRefusal;

export interface IntakeAdapter {
  readonly source: IntakeSource;
  readonly version: number;
  read(input: IntakeInput, ctx: IntakeContext): IntakeResult;
}

const absent = (reason: string): FieldEvidence => ({
  kind: "absent", raw: null, start: null, end: null, normalized: null, normalizer: null, candidates: [], validation: { passed: false, reason }, owner_action: null,
});

/** The evidence for what the deterministic normalizers found. A field they did not find is absent, never filled. */
export function evidenceOf(n: NormalizedMessage): Record<string, FieldEvidence> {
  const out: Record<string, FieldEvidence> = {};

  const ph = n.phone;
  out["phone"] = ph.status === "ok"
    ? { kind: "stated", raw: ph.raw, start: ph.start, end: ph.end, normalized: ph.value, normalizer: { name: "phone", version: ph.version }, candidates: [], validation: { passed: true, reason: null }, owner_action: null }
    : ph.status === "ambiguous"
      ? { kind: "ambiguous", raw: null, start: null, end: null, normalized: null, normalizer: { name: "phone", version: ph.version }, candidates: ph.candidates, validation: { passed: false, reason: "more_than_one_number" }, owner_action: null }
      : absent(ph.reason);

  const w = n.when;
  out["when"] = w.status === "ok"
    ? {
        kind: "stated", raw: w.raw, start: w.start, end: w.end,
        normalized: { date: w.date, time: w.time, starts_at: w.startsAt, day_part: w.dayPart },
        normalizer: { name: "dates", version: w.version }, candidates: [], validation: { passed: true, reason: null }, owner_action: null,
      }
    : w.status === "ambiguous"
      ? { kind: "ambiguous", raw: w.raw, start: w.start, end: w.end, normalized: null, normalizer: { name: "dates", version: w.version }, candidates: w.candidates, validation: { passed: false, reason: "more_than_one_reading" }, owner_action: null }
      : absent(w.reason);

  const s = n.services;
  out["services"] = s.status === "ok"
    ? {
        kind: "stated", raw: s.matches.map((m) => m.raw).join(", "), start: s.matches[0]!.start, end: s.matches[s.matches.length - 1]!.end,
        normalized: s.matches.map((m) => m.key), normalizer: { name: "vocabulary", version: s.version }, candidates: [], validation: { passed: true, reason: null }, owner_action: null,
      }
    : s.status === "ambiguous"
      ? { kind: "ambiguous", raw: s.raw, start: s.start, end: s.end, normalized: null, normalizer: { name: "vocabulary", version: s.version }, candidates: s.candidates, validation: { passed: false, reason: "more_than_one_service" }, owner_action: null }
      : absent(s.reason);
  return out;
}

/** Typed entry: the owner types a message. The first adapter. */
export const typedAdapter: IntakeAdapter = {
  source: "typed",
  version: 1,
  read(input, ctx) {
    const text = input.text?.trim() ?? "";
    if (text === "") return { ok: false, reason: "empty" };
    if (text.length > MAX_RAW_TEXT) return { ok: false, reason: "too_long" };
    const normalized = normalizeMessage(text, { country: ctx.country, timeZone: ctx.timeZone, now: ctx.now, pack: ctx.pack });
    return {
      ok: true,
      draft: {
        source: "typed",
        rawText: text,
        providerMessageId: input.providerMessageId,
        originChannel: input.originChannel ?? "whatsapp",
        fieldEvidence: evidenceOf(normalized),
        normalized,
        needsExtraction: true,
      },
    };
  },
};

/** The adapters that exist. A source with no adapter is refused, not guessed at. */
export const ADAPTERS: Partial<Record<IntakeSource, IntakeAdapter>> = { typed: typedAdapter };

export function readIntake(source: string, input: IntakeInput, ctx: IntakeContext): IntakeResult {
  const a = (INTAKE_SOURCES as readonly string[]).includes(source) ? ADAPTERS[source as IntakeSource] : undefined;
  return a ? a.read(input, ctx) : { ok: false, reason: "unsupported_source" };
}

export { NORMALIZER_VERSIONS };
