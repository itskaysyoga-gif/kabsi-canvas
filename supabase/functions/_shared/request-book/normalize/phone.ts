// Phone numbers in a message (normalizer "phone", version 1). Reuses toE164 (master plan 30.8) with the location's
// country as the region for local numbers. A run of digits is a phone only when the whole run passes the phone check:
// a digit inside written-out Arabic such as 3ali or 7assan sits against letters, so it is never a run of its own and
// never a phone. Failing the check gives unknown, never a guess.
import { toE164 } from "../../whatsapp/phone.ts";
import { readable } from "./digits.ts";
import type { Normalized } from "./result.ts";

export const PHONE_VERSION = 1;

type Token = { text: string; start: number; end: number };

// A phone is written with digits and these separators; a "+" may open it.
const SEP = /[\s().\-]/;

/** Maximal groups of digits (and one leading plus) split by separators, each with its position. Digit groups touching a letter are dropped whole. */
function digitTokens(text: string): Token[] {
  const t = readable(text);
  const out: Token[] = [];
  let i = 0;
  while (i < t.length) {
    const ch = t[i]!;
    if (/[0-9]/.test(ch) || (ch === "+" && /[0-9]/.test(t[i + 1] ?? ""))) {
      const start = i;
      i++;
      while (i < t.length && /[0-9]/.test(t[i]!)) i++;
      const before = t[start - 1] ?? " ";
      const after = t[i] ?? " ";
      // A digit group against a letter belongs to a word (3ali, 7assan, el7, b123): it is not a number.
      const attached = /[a-z؀-ۿ]/.test(before) || /[a-z؀-ۿ]/.test(after);
      if (!attached) out.push({ text: t.slice(start, i), start, end: i });
    } else i++;
  }
  return out;
}

/** Group tokens that are joined only by separators (so "03 123 456" is one run, "03 123 456, tomorrow" is not). */
function runs(text: string, tokens: Token[]): Token[][] {
  const t = readable(text);
  const out: Token[][] = [];
  let cur: Token[] = [];
  for (const tok of tokens) {
    const prev = cur[cur.length - 1];
    if (prev && [...t.slice(prev.end, tok.start)].every((c) => SEP.test(c))) cur.push(tok);
    else {
      if (cur.length) out.push(cur);
      cur = [tok];
    }
  }
  if (cur.length) out.push(cur);
  return out;
}

/**
 * The phone number in a message, in E.164, or unknown. A run that does not pass as a whole may still contain a number
 * made of whole groups ("Corolla 2016 03 123 456" holds 03 123 456): the longest passing stretch of whole groups wins.
 * Two different numbers in one message are ambiguous, with both listed.
 */
export function normalizePhone(text: string, country: string | null | undefined): Normalized<string> {
  const t = readable(text);
  const found: { value: string; raw: string; start: number; end: number }[] = [];
  for (const run of runs(text, digitTokens(text))) {
    const hit = longestPassing(run, t, country);
    if (hit) found.push(hit);
  }
  const distinct = found.filter((f, i) => found.findIndex((g) => g.value === f.value) === i);
  if (distinct.length === 0) return { status: "unknown", reason: "no_phone", version: PHONE_VERSION };
  if (distinct.length > 1) return { status: "ambiguous", candidates: distinct, version: PHONE_VERSION };
  const f = distinct[0]!;
  return { status: "ok", value: f.value, raw: text.slice(f.start, f.end), start: f.start, end: f.end, version: PHONE_VERSION };
}

function longestPassing(run: Token[], t: string, country: string | null | undefined) {
  for (let len = run.length; len >= 1; len--) {
    for (let from = 0; from + len <= run.length; from++) {
      const first = run[from]!;
      const last = run[from + len - 1]!;
      const raw = t.slice(first.start, last.end);
      // Fewer than 7 digits is never a phone; this also keeps a year or a time from being tried.
      if (raw.replace(/\D/g, "").length < 7) continue;
      const e164 = toE164(raw, country);
      if (e164) return { value: e164, raw, start: first.start, end: last.end };
    }
  }
  return null;
}
