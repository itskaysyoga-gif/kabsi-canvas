// Phone numbers in a message (normalizer "phone", version 1). Reuses toE164 (master plan 30.8) with the location's
// country as the region for local numbers. A run of digits is a phone only when the whole run passes the phone check:
// a digit inside written-out Arabic such as 3ali or 7assan sits against letters, so it is never a run of its own and
// never a phone. Failing the check gives unknown, never a guess.
import { toE164 } from "../../whatsapp/phone.ts";
import { readable } from "./digits.ts";
import type { Normalized } from "./result.ts";

export const PHONE_VERSION = 1;

/** A phone number has at most 15 digits (E.164), so no stretch of groups longer than that is ever tried. */
const MAX_DIGITS = 15;
/** The most phone checks one message may cost. A message that needs more is unknown, never a partial answer. */
const MAX_CHECKS = 200;

type Token = { text: string; start: number; end: number };

// Letters only: the Arabic comma, semicolon and question mark sit in the same block and are not part of a word.
const ARABIC_OR_LATIN_LETTER = /[a-z\u0621-\u064a\u066e-\u06d3]/;

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
      const attached = ARABIC_OR_LATIN_LETTER.test(before) || ARABIC_OR_LATIN_LETTER.test(after);
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
 * made of whole groups ("Corolla 2016 03 123 456" holds 03 123 456): the longest passing stretch of whole groups wins,
 * and what is left of the run on either side is read the same way, so two numbers written with only a space between
 * them are two numbers. Two different numbers in one message are ambiguous, with both listed. A stretch that reads as a
 * date or a time ("15 11 2026 10 30") is never tried as a phone.
 */
export function normalizePhone(text: string, country: string | null | undefined): Normalized<string> {
  const t = readable(text);
  const found: { value: string; raw: string; start: number; end: number }[] = [];
  const budget = { left: MAX_CHECKS };
  for (const run of runs(text, digitTokens(text))) {
    findAll(run, t, country, budget, found);
    if (budget.left < 0) return { status: "unknown", reason: "too_many_candidates", version: PHONE_VERSION };
  }
  const distinct = found.filter((f, i) => found.findIndex((g) => g.value === f.value) === i);
  if (distinct.length === 0) return { status: "unknown", reason: "no_phone", version: PHONE_VERSION };
  if (distinct.length > 1) return { status: "ambiguous", candidates: distinct.sort((a, b) => a.start - b.start), version: PHONE_VERSION };
  const f = distinct[0]!;
  return { status: "ok", value: f.value, raw: text.slice(f.start, f.end), start: f.start, end: f.end, version: PHONE_VERSION };
}

type Hit = { value: string; raw: string; start: number; end: number };

function findAll(run: Token[], t: string, country: string | null | undefined, budget: { left: number }, out: Hit[]) {
  if (run.length === 0 || budget.left < 0) return;
  const at = longestPassing(run, t, country, budget);
  if (!at) return;
  out.push(at.hit);
  findAll(run.slice(0, at.from), t, country, budget, out);
  findAll(run.slice(at.from + at.len), t, country, budget, out);
}

const digitsOf = (tok: Token) => tok.text.replace(/\D/g, "");
const isYear = (d: string) => /^(19|20)\d{2}$/.test(d);

/** A stretch of groups that reads as a date, possibly with a time: a year with a day or month beside it, or a year followed by hours or minutes. */
function dateLike(tokens: Token[]): boolean {
  const d = tokens.map(digitsOf);
  for (let i = 0; i < d.length; i++) {
    if (!isYear(d[i]!)) continue;
    if (i + 1 < d.length && d[i + 1]!.length <= 2) return true; // 2026 11 15, 2026 3
    if (i > 0 && d[i - 1]!.length <= 2) return true; // 15 11 2026, 11 2026
  }
  return false;
}

function longestPassing(run: Token[], t: string, country: string | null | undefined, budget: { left: number }) {
  const digits = run.map((tok) => digitsOf(tok).length);
  for (let len = Math.min(run.length, MAX_DIGITS); len >= 1; len--) {
    for (let from = 0; from + len <= run.length; from++) {
      let count = 0;
      for (let i = from; i < from + len; i++) count += digits[i]!;
      // Fewer than 7 digits is never a phone (this keeps a year or a time from being tried), and more than 15 cannot be.
      if (count < 7 || count > MAX_DIGITS) continue;
      const window = run.slice(from, from + len);
      if (dateLike(window)) continue;
      if (--budget.left < 0) return null;
      const first = window[0]!;
      const last = window[window.length - 1]!;
      const raw = t.slice(first.start, last.end);
      const e164 = toE164(raw, country);
      if (e164) return { hit: { value: e164, raw, start: first.start, end: last.end }, from, len };
    }
  }
  return null;
}
