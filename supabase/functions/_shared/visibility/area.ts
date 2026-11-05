// Scan 2 (master plan 30.29 item 1): the free check's AI question always names the business's town and country, and a
// name not written in Latin letters is never shown. Pure, so the profile check, the visibility function and the tests
// share one rule.
import type { AddressComponent } from "../google/types.ts";

const clean = (s: string | null | undefined) => (s ?? "").replace(/\s+/g, " ").trim();

/** True when every letter of the name is a Latin letter (digits and plain punctuation are fine) and it has one. */
export function latinName(s: string | null | undefined): boolean {
  const t = clean(s);
  return !!t && /\p{L}/u.test(t) && !/[^\p{Script=Latin}\p{N}\p{P}\p{S}\p{Zs}\p{M}]/u.test(t);
}

/** What a business whose own name is not in Latin letters is called on every public screen, email, WhatsApp text and image (30.30 item 3). */
export const YOUR_BUSINESS = "Your business";
/** The visitor's own business name as it may be shown: the name in Latin letters, else "Your business". The name still goes to the provider as typed. */
export const ownName = (s: string | null | undefined): string =>
  latinName(s) ? clean(s) : YOUR_BUSINESS;

/** A search term as free-check.ts's cleanTerm makes it: letters, digits, spaces and a few marks, lower case, 2 to 60 characters. */
const termOf = (t: unknown): string | null => {
  const s = String(t ?? "")
    .replace(/[^\p{L}\p{N}\s'&-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  return s.length >= 2 && s.length <= 60 ? s : null;
};

/**
 * The Latin rule for the visitor's own text (master plan 30.30 item 3). A term not in Latin letters is replaced by the Google
 * category in lower case; if that is not in Latin letters either, the AI part is left out and the nearby part uses the
 * industry page's term; with neither, there is no term to show (null) and the check stops as unavailable.
 */
export function shownTerm(
  typed: string,
  category: string | null,
  industryTerm: string | null,
): { term: string; ai: boolean } | null {
  if (latinName(typed)) return { term: typed, ai: true };
  const cat = termOf(category);
  if (cat && latinName(cat)) return { term: cat, ai: true };
  const ind = termOf(industryTerm);
  return ind && latinName(ind) ? { term: ind, ai: false } : null;
}

/** The country's name in English from its ISO code ("LB" is "Lebanon"), or null. */
export function countryName(iso: string | null | undefined): string | null {
  const c = clean(iso).toUpperCase();
  if (!/^[A-Z]{2}$/.test(c)) return null;
  try {
    const n = new Intl.DisplayNames(["en"], { type: "region" }).of(c);
    return n && n !== c ? n : null;
  } catch {
    return null;
  }
}

let names: Set<string> | null = null;
/** Every country's English name, lower case, so an address's last part is known as a country without its code. */
function countryNames(): Set<string> {
  if (names) return names;
  names = new Set();
  const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for (const a of A)
    for (const b of A) {
      const n = countryName(a + b);
      if (n) names.add(n.toLowerCase());
    }
  return names;
}

/**
 * The town from a formatted address: the last part that is not the country, a postcode or a state code, with case kept.
 * "Main Street, Boqaata, Lebanon" is "Boqaata"; "12 High St, Austin, TX 78701, USA" is "Austin"; "Downtown - Dubai - United
 * Arab Emirates" is "Dubai". Null when nothing is left, or the town is not in Latin letters.
 */
export function townOf(address: string | null | undefined, country?: string | null): string | null {
  const name = (countryName(country) ?? "").toLowerCase();
  const parts = clean(address)
    .split(/,|\s[-–—]\s/)
    .map(clean)
    .filter(Boolean);
  const countryish = new Set(
    [name, "usa", "us", "uk", "uae", "ksa", clean(country).toLowerCase()].filter(Boolean),
  );
  while (parts.length) {
    const last = parts[parts.length - 1]!;
    const words = last.split(" ").filter((w) => !/\d/.test(w)); // postcodes and house numbers out
    const kept = words.join(" ").trim();
    const low = kept.toLowerCase();
    const region =
      /\b(governorate|province|district|county|region|emirate|state|prefecture|mohafazat)\b/i.test(
        kept,
      );
    if (
      !kept ||
      region ||
      countryish.has(low) ||
      countryNames().has(low) ||
      (name && low.endsWith(name)) ||
      /^[A-Z]{2,3}$/.test(kept)
    ) {
      parts.pop();
      continue;
    }
    // The first part is usually the street; a lone part is taken only when it is the whole address.
    if (
      parts.length === 1 &&
      clean(address).split(",").length > 1 &&
      /\b(st|street|road|rd|ave|avenue|highway|blvd)\b/i.test(kept)
    )
      return null;
    return kept.length <= 60 && latinName(kept) ? kept : null;
  }
  return null;
}

/**
 * The town from Places address components (locality, else postal town, else the first administrative area below the
 * country), else from the formatted address. Only when the field mask asks for them; the free check's does not, so the
 * address is used.
 */
export function areaOfPlace(
  p: { addressComponents?: AddressComponent[]; formattedAddress?: string },
  country?: string | null,
): string | null {
  const c = p.addressComponents ?? [];
  const by = (t: string) => c.find((x) => x.types?.includes(t))?.longText ?? null;
  const from = by("locality") ?? by("postal_town") ?? by("administrative_area_level_1");
  if (from && latinName(from)) return clean(from).slice(0, 60);
  return townOf(
    p.formattedAddress,
    country ?? c.find((x) => x.types?.includes("country"))?.shortText ?? null,
  );
}
