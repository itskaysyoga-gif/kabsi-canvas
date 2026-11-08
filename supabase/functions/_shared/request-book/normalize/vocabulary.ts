// Pack vocabulary (normalizer "vocabulary", version 1). Finds the services a pack knows in a message, by whole words, in
// any of the spellings the pack lists. The pack is data; this code does not know any trade. A spelling the pack gives to
// one service is never guessed to be another.
import type { Pack } from "../packs/schema.ts";
import { wordsOnly } from "./digits.ts";
import type { Evidence } from "./result.ts";

export const VOCABULARY_VERSION = 1;

export type ServiceMatch = { key: string; label: string } & Evidence;

export type VocabularyResult =
  | { status: "ok"; matches: ServiceMatch[]; version: number }
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
  if (kept.length === 0) return { status: "unknown", reason: "no_known_service", version: VOCABULARY_VERSION };
  kept.sort((a, b) => a.start - b.start);
  // The same service written twice is one service.
  const seen = new Set<string>();
  const matches = kept.filter((k) => !seen.has(k.key) && seen.add(k.key)).map(({ length: _l, ...m }) => m);
  return { status: "ok", matches, version: VOCABULARY_VERSION };
}
