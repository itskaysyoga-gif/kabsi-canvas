// Every normalizer, with its version. Each result carries the version that produced it, so a stored value can always be
// traced to the code that read it. A change to what a normalizer returns changes its version.
import type { Pack } from "../packs/schema.ts";
import { DIGITS_VERSION } from "./digits.ts";
import { DATES_VERSION, normalizeWhen, type WhenResult } from "./dates.ts";
import { normalizePhone, PHONE_VERSION } from "./phone.ts";
import type { Normalized } from "./result.ts";
import { normalizeVocabulary, VOCABULARY_VERSION, type VocabularyResult } from "./vocabulary.ts";

export const NORMALIZER_VERSIONS = {
  digits: DIGITS_VERSION,
  phone: PHONE_VERSION,
  dates: DATES_VERSION,
  vocabulary: VOCABULARY_VERSION,
} as const;

export type NormalizeContext = { country: string | null; timeZone: string; now: Date; pack: Pick<Pack, "services"> };
export type NormalizedMessage = { phone: Normalized<string>; when: WhenResult; services: VocabularyResult };

/** Every deterministic reading of one message. No model is involved. */
export function normalizeMessage(text: string, ctx: NormalizeContext): NormalizedMessage {
  return {
    phone: normalizePhone(text, ctx.country),
    when: normalizeWhen(text, { now: ctx.now, timeZone: ctx.timeZone }),
    services: normalizeVocabulary(text, ctx.pack),
  };
}

export { foldKey, readable, toLatinDigits, wordsOnly } from "./digits.ts";
export { normalizePhone, normalizeVocabulary, normalizeWhen };
export type { Normalized, VocabularyResult, WhenResult };
