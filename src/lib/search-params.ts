// Small readers for the search part of an address (?q=...). Lean 1 (speed): a route's validateSearch runs in the shared
// bundle on every page, and zod (about 23 KB compressed) was in it only for these few shapes. Each reader gives the value
// when it fits and undefined when it does not, the same as zod's `.optional().catch(undefined)`, so a wrong or missing
// value never breaks a page. tests/search-params.test.ts keeps the equivalence.

/** A string, optionally trimmed, with a length range (after trimming). Anything else is undefined. */
export function text(
  v: unknown,
  o: { trim?: boolean; min?: number; max?: number } = {},
): string | undefined {
  if (typeof v !== "string") return undefined;
  const s = o.trim ? v.trim() : v;
  if (o.min !== undefined && s.length < o.min) return undefined;
  if (o.max !== undefined && s.length > o.max) return undefined;
  return s;
}

/** One of the listed words, or undefined. */
export function oneOf<T extends string>(v: unknown, allowed: readonly T[]): T | undefined {
  return typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : undefined;
}

/** A whole number from min to max (a string such as "3" is read as a number), or undefined. */
export function intBetween(v: unknown, min: number, max: number): number | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const n = Number(v);
  return Number.isInteger(n) && n >= min && n <= max ? n : undefined;
}

/** A string that matches the pattern, or undefined. */
export function matching(v: unknown, pattern: RegExp): string | undefined {
  return typeof v === "string" && pattern.test(v) ? v : undefined;
}

/** True when the key is present and not empty-ish, like zod's coerce.boolean (so "false" is true, as before). */
export function flag(v: unknown): boolean | undefined {
  return v === undefined ? undefined : Boolean(v);
}

// Polish 1 (1 Nov 2026): plain readers instead of zod (the same values as the schema this replaced, proven in
// tests/search-params.test.ts), so zod is not in the sign-in first load.
export const START_CODE = /^[2-9A-HJKMNP-Za-hjkmnp-z]{6}$/;
export const START_PREVIEWS = ["wa", "wa-notyet", "wa-done", "rest"] as const;
export function readStartSearch(s: { code?: unknown; new?: unknown; preview?: unknown }): {
  code?: string | undefined;
  new?: boolean | undefined;
  preview?: (typeof START_PREVIEWS)[number] | undefined;
} {
  return {
    code: matching(s.code, START_CODE), // card to link
    new: flag(s.new), // start another business
    // Screenshots on the development server only (scripts/app-shots/onboarding.mjs): states that need a tap or a
    // WhatsApp number. Ignored in a production build.
    preview: oneOf(s.preview, START_PREVIEWS),
  };
}
