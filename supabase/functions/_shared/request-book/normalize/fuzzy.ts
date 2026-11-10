// RB-F3 (R-148 item 1): typos. A word an owner typed is matched to a real word Kabsi knows (a day, a month, a time word, a
// service) when it is within a small edit distance of it. Nothing is invented: a word with no near match stays as written,
// and two or more equally near matches with different meanings are returned as a tie, so the owner is asked with buttons.
//
// The rules, kept small on purpose so a name or an everyday word is not "corrected":
//   - the known word must be at least 5 letters (shorter words and abbreviations match only exactly);
//   - 2 edits for a known word of 8 letters or more (thursday, afternoon), 1 edit for 5 to 7 letters (friday, morning);
//   - the typed word has at least 4 letters and starts with the same letter as the known word;
//   - an edit is one letter added, removed, changed, or two letters next to each other swapped (thrusday).

/** Edits from a to b: insert, delete, substitute, or swap two neighbours (optimal string alignment). */
export function editDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (Math.abs(m - n) > 2) return 3;
  const d: number[][] = Array.from({ length: m + 1 }, (_, i) => Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(d[i - 1]![j]! + 1, d[i]![j - 1]! + 1, d[i - 1]![j - 1]! + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, d[i - 2]![j - 2]! + 1);
      d[i]![j] = v;
    }
  }
  return d[m]![n]!;
}

/** How many edits a known word allows: 2 for 8 letters or more, 1 for 5 to 7, none below 5. */
export const allowedEdits = (known: string): number => (known.length >= 8 ? 2 : known.length >= 5 ? 1 : 0);

/** The distance of a typed word to a known one when it is near enough under the rules above, else null. */
export function near(typed: string, known: string): number | null {
  if (typed === known) return 0;
  const max = allowedEdits(known);
  if (max === 0 || typed.length < 4 || typed[0] !== known[0]) return null;
  const e = editDistance(typed, known);
  return e <= max ? e : null;
}

/**
 * The known words nearest to a typed word, each with its meaning. One meaning: a match. Two or more meanings at the same
 * distance: a tie (the caller asks). Empty: no near word, the typed word stays as written.
 */
export function nearest<T>(typed: string, known: { word: string; value: T }[], same: (a: T, b: T) => boolean = (a, b) => a === b): { distance: number; values: T[] } | null {
  let best: number | null = null;
  let values: T[] = [];
  for (const k of known) {
    const e = near(typed, k.word);
    if (e === null) continue;
    if (best === null || e < best) {
      best = e;
      values = [k.value];
    } else if (e === best && !values.some((v) => same(v, k.value))) values.push(k.value);
  }
  return best === null ? null : { distance: best, values };
}

/**
 * Words of a text (lower case letters only) replaced by their nearest known word, with a map back to the original
 * positions, so evidence still points into what the owner typed. A tie gives one text per meaning (at most 3).
 */
export type Corrected = { text: string; toOrig: (i: number) => number; changed: boolean };

export function correctWords(text: string, known: { word: string; value: string }[], exact: Set<string>, within?: { start: number; end: number } | null): Corrected[] {
  // RB-F3 review: only words inside the range (the words the model quoted for this field) are read as typos, so a name
  // elsewhere in the message ("Frida", "Sundar") is never turned into a day. No range: nothing is corrected.
  if (!within) return [{ text, toOrig: (i) => i, changed: false }];
  // Each typed word that is not already a known or an everyday word, with its choices.
  const swaps: { start: number; end: number; choices: string[] }[] = [];
  for (const m of text.matchAll(/[a-z]+/g)) {
    const w = m[0];
    if (exact.has(w) || w.length < 4 || m.index! < within.start || m.index! + w.length > within.end) continue;
    const n = nearest(w, known);
    if (!n || n.distance === 0) continue;
    swaps.push({ start: m.index!, end: m.index! + w.length, choices: n.values.slice(0, 3) });
  }
  if (!swaps.length) return [{ text, toOrig: (i) => i, changed: false }];
  // One text per meaning of the first tie; other words take their first (only) choice. At most 3 texts.
  const tie = swaps.findIndex((s) => s.choices.length > 1);
  const variants = tie < 0 ? [0] : swaps[tie]!.choices.map((_, i) => i);
  return variants.map((v) => build(text, swaps.map((s, i) => ({ ...s, word: s.choices[i === tie ? v : 0]! }))));
}

function build(text: string, swaps: { start: number; end: number; word: string }[]): Corrected {
  let out = "";
  // pos[k] is the original position of output character k; pos[out.length] is the end of the text.
  const pos: number[] = [];
  let at = 0;
  for (const s of swaps) {
    for (let i = at; i < s.start; i++) {
      out += text[i];
      pos.push(i);
    }
    const len = s.end - s.start;
    for (let k = 0; k < s.word.length; k++) {
      out += s.word[k];
      pos.push(s.start + Math.min(len - 1, Math.floor((k * len) / s.word.length)));
    }
    at = s.end;
  }
  for (let i = at; i < text.length; i++) {
    out += text[i];
    pos.push(i);
  }
  // An end position just after a replaced word maps to the end of the typed word.
  const ends = new Map<number, number>();
  let o = 0;
  let a2 = 0;
  for (const s of swaps) {
    o += s.start - a2;
    o += s.word.length;
    ends.set(o, s.end);
    a2 = s.end;
  }
  return {
    text: out,
    changed: true,
    toOrig: (i: number) => (ends.has(i) ? ends.get(i)! : i >= pos.length ? text.length : pos[i]!),
  };
}
