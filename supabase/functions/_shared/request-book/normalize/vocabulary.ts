// Pack vocabulary (normalizer "vocabulary", version 1). Finds the services a pack knows in a message, by whole words, in
// any of the spellings the pack lists. The pack is data; this code does not know any trade. A spelling the pack gives to
// one service is never guessed to be another.
import type { Pack } from "../packs/schema.ts";
import { wordsOnly } from "./digits.ts";
import { near } from "./fuzzy.ts";
import type { Evidence } from "./result.ts";

export const VOCABULARY_VERSION = 1;

export type ServiceMatch = { key: string; label: string } & Evidence;

/** RB-F3: words that are equally near two or more services. The owner is asked which one, never told. */
export type ServiceTie = { candidates: { key: string; label: string }[] } & Evidence;

export type VocabularyResult =
  | { status: "ok"; matches: ServiceMatch[]; ties?: ServiceTie[]; version: number }
  | { status: "ambiguous"; candidates: { key: string; label: string }[]; raw: string; start: number; end: number; version: number }
  | { status: "unknown"; reason: string; version: number };

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * The services of `pack` written in `text`. When two services claim the same words (a pack with a shared spelling is
 * refused by the schema, so this only happens when one service's spelling is longer words of another's), the longest
 * spelling wins and the shorter one is dropped. Nothing found is unknown, never a guess.
 */
export function normalizeVocabulary(text: string, pack: Pick<Pack, "services">): VocabularyResult {
  const t = wordsOnly(text);
  const hits: (ServiceMatch & { length: number })[] = [];
  for (const s of pack.services) {
    for (const sp of s.spellings) {
      const re = new RegExp(`(^| )(${escape(sp).replace(/ /g, " +")})(?= |$)`, "g");
      for (const m of t.matchAll(re)) {
        const start = m.index! + (m[1]?.length ?? 0);
        const end = m.index! + m[0].length;
        hits.push({ key: s.key, label: s.label, raw: text.slice(start, end), start, end, length: end - start });
      }
    }
  }
  // Longest first, then the earliest; a hit inside an earlier kept hit is dropped.
  hits.sort((a, b) => b.length - a.length || a.start - b.start);
  const kept: (ServiceMatch & { length: number })[] = [];
  for (const h of hits) if (!kept.some((k) => h.start < k.end && k.start < h.end)) kept.push(h);
  const ties: ServiceTie[] = [];
  // RB-F3: words that matched nothing exactly are read as the nearest service when they are a typo of one of its spellings
  // ("highlightss", "manicur"). Equally near different services is a tie, asked about. No near spelling: nothing is read.
  for (const f of nearHits(text, t, pack, kept)) {
    if (f.candidates.length === 1) kept.push({ key: f.candidates[0]!.key, label: f.candidates[0]!.label, raw: f.raw, start: f.start, end: f.end, length: f.end - f.start });
    else ties.push(f);
  }
  if (kept.length === 0 && ties.length === 0) return { status: "unknown", reason: "no_known_service", version: VOCABULARY_VERSION };
  kept.sort((a, b) => a.start - b.start);
  // The same service written twice is one service.
  const seen = new Set<string>();
  const matches = kept.filter((k) => !seen.has(k.key) && seen.add(k.key)).map(({ length: _l, ...m }) => m);
  return { status: "ok", matches, ...(ties.length ? { ties } : {}), version: VOCABULARY_VERSION };
}

/** Runs of 1 to 3 words outside the exact hits that are near a spelling, word by word, with the services they are nearest to. */
function nearHits(text: string, t: string, pack: Pick<Pack, "services">, kept: { start: number; end: number }[]): ServiceTie[] {
  const words = [...t.matchAll(/[a-z0-9]+/g)].map((m) => ({ w: m[0], start: m.index!, end: m.index! + m[0].length }));
  const free = (s: number, e: number) => !kept.some((k) => s < k.end && k.start < e);
  const out: ServiceTie[] = [];
  let i = 0;
  while (i < words.length) {
    let found: ServiceTie | null = null;
    let used = 1;
    for (let n = 3; n >= 1 && !found; n--) {
      const run = words.slice(i, i + n);
      if (run.length < n || !free(run[0]!.start, run[n - 1]!.end)) continue;
      let best: number | null = null;
      let cands: { key: string; label: string }[] = [];
      for (const s of pack.services) {
        for (const sp of s.spellings) {
          const parts = sp.split(" ");
          if (parts.length !== n) continue;
          let total = 0;
          let typo = false;
          for (let k = 0; k < n; k++) {
            const e = near(run[k]!.w, parts[k]!);
            if (e === null) {
              total = -1;
              break;
            }
            total += e;
            if (e > 0) typo = true;
          }
          if (total < 0 || !typo) continue;
          if (best === null || total < best) {
            best = total;
            cands = [{ key: s.key, label: s.label }];
          } else if (total === best && !cands.some((c) => c.key === s.key)) cands.push({ key: s.key, label: s.label });
        }
      }
      if (best !== null) {
        const start = run[0]!.start;
        const end = run[n - 1]!.end;
        found = { candidates: cands.slice(0, 3), raw: text.slice(start, end), start, end };
        used = n;
      }
    }
    if (found) out.push(found);
    i += used;
  }
  return out;
}
