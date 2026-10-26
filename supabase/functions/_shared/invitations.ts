// D270 / D293 invitation vetting, kept free of imports so it can be tested on its own.
// Google's Invitation carries the listing's name and address, and no place ID. An invitation is accepted only
// when exactly one consented, access-pending business has the same normalized name AND a matching address
// or city. Two candidates, or none, means it stays pending and is reported.
// Access 1 (26 Oct 2026): the saved address may be shorter than Google's ("Mirna Chalouhi" against "Mirna Chalouhi
// Highway"), so a saved address of two words or more also counts when it appears whole inside Google's street lines
// and city. Area, postcode and country are never used for this, so "Dubai" or "London" alone never matches.

// Access 2: placeId is the business's own place ID (picked at sign-up); googleTitle and googleAddress are Google's own
// title and address for its listing, saved when Kabsi was granted access (the saved copy, google_listings).
export type PendingBusiness = {
  id?: string; name: string; address?: string | null; placeId?: string | null; googleTitle?: string | null; googleAddress?: string | null;
};
// Google documents the invitation's address as one formatted string ("1 Main Street, Example Town, CA 00000");
// the postal-address object is still read in case Google sends that shape.
export type InvitationAddress = string | { addressLines?: string[]; locality?: string; administrativeArea?: string; postalCode?: string } | null | undefined;
export type InvitationMatch =
  | { ok: true; business: PendingBusiness }
  | { ok: false; reason: string };

// Lower-case, drop accents (é becomes e), turn everything that is not a letter or digit into one space.
export const norm = (v: string | null | undefined): string =>
  (v ?? "").normalize("NFKD").replace(/\p{M}+/gu, "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();

// True when every word of `needle` appears in `hay` as whole words, in order and adjacent ("Rome" is not in "Jerome").
function containsWords(hay: string, needle: string): boolean {
  return !!needle && ` ${hay} `.includes(` ${needle} `);
}

// An address or city match. The street line must appear in the business address, or the city (locality) must.
export function addressMatches(businessAddress: string | null | undefined, inv: InvitationAddress): boolean {
  const hay = norm(businessAddress);
  if (!hay || !inv) return false;
  if (typeof inv === "string") return textAddressMatches(hay, inv, businessAddress ?? "");
  const street = norm(inv.addressLines?.[0]);
  if (street && containsWords(hay, street)) return true;
  const city = norm(inv.locality);
  if (city && containsWords(hay, city)) return true;
  if (words(hay) < 2) return false;
  const streetAndCity = norm([...(inv.addressLines ?? []), inv.locality].filter(Boolean).join(" "));
  return containsWords(streetAndCity, hay);
}

const words = (v: string) => (v ? v.split(" ").length : 0);

// Access 1: the string Google sends. Both addresses are split into their comma parts, and the country and
// postcode parts are dropped. It matches when every remaining part of the shorter address appears, as whole words,
// in the longer one, and the shorter one's first part (the street) has two words or more. So "Mirna Chalouhi" matches
// "Mirna Chalouhi, Sin El Fil, Lebanon", while "United Kingdom", "Dubai" or "High Street, Croydon" against
// "High Street, Bromley" never match.
const COUNTRIES = new Set(["lebanon", "united kingdom", "uk", "great britain", "england", "scotland", "wales", "northern ireland",
  "united arab emirates", "uae", "united states", "usa", "us", "united states of america", "canada", "australia", "ireland",
  "saudi arabia", "qatar", "kuwait", "bahrain", "oman"]);
const POSTCODE = /^(?=.*\d)[a-z0-9]{2,5}( [a-z0-9]{2,4})?$/;
function addressParts(v: string): string[] {
  return v.split(",").map(norm).filter((p) => p && !COUNTRIES.has(p) && !POSTCODE.test(p));
}
function textAddressMatches(hay: string, inv: string, saved: string): boolean {
  const g = addressParts(inv), b = addressParts(saved);
  if (!g.length || !b.length) return false;
  // The shorter address inside the longer one; with the same number of parts, either way round.
  const inside = (short: string[], long: string[]) => {
    if (words(short[0]) < 2) return false;
    const longText = long.join(" ");
    return short.every((p) => containsWords(longText, p));
  };
  if (!hay) return false;
  if (g.length < b.length) return inside(g, b);
  if (b.length < g.length) return inside(b, g);
  return inside(g, b) || inside(b, g);
}

// What the skipped report shows of an invitation's address, so staff can see why it was left pending.
export function invitationPlace(inv: InvitationAddress): string {
  if (!inv) return "";
  if (typeof inv === "string") return inv.slice(0, 120);
  return [inv.addressLines?.[0], inv.locality].filter(Boolean).join(", ");
}

export function matchInvitation(locationName: string, address: InvitationAddress, pending: PendingBusiness[]): InvitationMatch {
  const name = norm(locationName);
  if (!name) return { ok: false, reason: "invitation has no listing name" };
  const sameName = pending.filter((p) => norm(p.name) === name);
  if (!sameName.length) return { ok: false, reason: "no consented business with this name" };
  const matches = sameName.filter((p) => addressMatches(p.address, address));
  if (!matches.length) return { ok: false, reason: "name matches but address or city does not" };
  if (matches.length > 1) return { ok: false, reason: `ambiguous: ${matches.length} consented businesses match` };
  return { ok: true, business: matches[0] };
}

// ─── Access 2 (27 Oct 2026). Google can write the invitation's address in the listing's own script: Yawmiyati's read
// "طريق ميرنا شالوحي, Lebanon" while Kabsi saved "Mirna Chalouhi", so the text rules above can never match it. Two
// more ways to accept, both still bound by D270 (never Manager of a listing whose owner did not consent in Kabsi):
//   1. the saved copy: Google's own title and address for a listing Kabsi was granted before, so a re-invitation from
//      the same listing matches without a Places call;
//   2. the Places check: Text Search on "name, address" in the invitation's own language, accepted only when exactly
//      one result has the invitation's exact name, that result's place ID is the place ID of exactly one consented
//      business, and the invitation's street appears in that result's address. Each invitation is looked up at most
//      once a day (invitation_lookups).
// And a backstop: any listing Kabsi manages that matches no business in Kabsi is removed (strayListings, api/cron.ts).

const invitationText = (inv: InvitationAddress) => (typeof inv === "string" ? inv.trim() : invitationPlace(inv));

// The invitation's street: its first comma part that is not the country, a postcode or the listing's own name, of two
// words or more. "Yawmiyati, Lebanon" and "United Kingdom" (a hidden service-area address) have none, and "Dubai" alone
// is a city, not a street.
export function streetPart(locationName: string, inv: InvitationAddress): string | null {
  const name = norm(locationName);
  const first = addressParts(invitationText(inv)).filter((p) => p !== name)[0];
  return first && words(first) >= 2 ? first : null;
}

// 1. The saved copy: exactly one consented business whose saved Google title is the invitation's name and whose saved
// Google address has the same parts (country and postcode aside) and a street.
export function matchSavedCopy(locationName: string, inv: InvitationAddress, pending: PendingBusiness[]): InvitationMatch {
  const name = norm(locationName);
  const street = streetPart(locationName, inv);
  if (!name || !street) return { ok: false, reason: "no street to compare with a saved copy" };
  const parts = addressParts(invitationText(inv)).join(" | ");
  const hits = pending.filter((p) =>
    p.googleTitle && norm(p.googleTitle) === name && streetPart(p.googleTitle, p.googleAddress ?? "") && addressParts(p.googleAddress ?? "").join(" | ") === parts
  );
  if (hits.length !== 1) return { ok: false, reason: hits.length ? `ambiguous: ${hits.length} saved copies match` : "no saved copy matches" };
  return { ok: true, business: hits[0] };
}

// The language to ask Places in: the script the invitation's address is written in. Latin is left to Google.
export function languageOf(text: string): string | undefined {
  const scripts: [RegExp, string][] = [
    [/\p{Script=Arabic}/u, "ar"], [/\p{Script=Hebrew}/u, "iw"], [/\p{Script=Cyrillic}/u, "ru"], [/\p{Script=Greek}/u, "el"],
    [/\p{Script=Hangul}/u, "ko"], [/[\p{Script=Hiragana}\p{Script=Katakana}]/u, "ja"], [/\p{Script=Han}/u, "zh"],
    [/\p{Script=Thai}/u, "th"], [/\p{Script=Devanagari}/u, "hi"],
  ];
  return scripts.find(([re]) => re.test(text))?.[1];
}

export type PlaceHit = { id?: string; displayName?: { text?: string }; formattedAddress?: string };
// The Places Text Search the job uses: "cap" when places_take refused (nothing was sent), "error" when Google answered
// with an error.
export type PlaceSearch = (query: string, languageCode: string | undefined) => Promise<{ status: "ok"; places: PlaceHit[] } | { status: "cap" | "error" }>;
// The 24-hour memory of lookups. claim() answers the remembered result, or null after claiming the invitation for a
// new lookup (so a crash after the call still counts as today's lookup); it throws when the memory cannot be read.
export type Remembered = { placeId: string | null; reason: string };
export type LookupMemory = {
  claim: (invitation: string) => Promise<Remembered | null>;
  save: (invitation: string, r: Remembered) => Promise<void>;
  release: (invitation: string) => Promise<void>;
};

// What one Places answer proves, without the consented businesses: the place ID when (a) exactly one result has the
// invitation's exact name and (c) the invitation's street is in that result's address; otherwise why not.
export function placeFromResults(locationName: string, street: string, places: PlaceHit[]): Remembered {
  const name = norm(locationName);
  const exact = places.filter((p) => norm(p.displayName?.text) === name);
  if (exact.length !== 1) return { placeId: null, reason: `Places found ${exact.length} listings with this exact name` };
  if (!exact[0].id) return { placeId: null, reason: "Places gave no place ID" };
  if (!containsWords(norm(exact[0].formattedAddress), street)) return { placeId: null, reason: "the street is not in the Places address" };
  return { placeId: exact[0].id, reason: "Places confirms the listing" };
}

// 2. The Places check. No lookup unless a consented business with this exact name and a place ID is waiting and the
// invitation has a street. (b) is checked against today's consented businesses on every run, so it is never remembered.
export async function matchByPlace(
  invitation: string, locationName: string, inv: InvitationAddress, pending: PendingBusiness[], search: PlaceSearch, memory: LookupMemory,
): Promise<InvitationMatch> {
  const name = norm(locationName);
  if (!name || !pending.some((p) => p.placeId && norm(p.name) === name)) return { ok: false, reason: "no consented business with this name and a place ID" };
  const street = streetPart(locationName, inv);
  if (!street) return { ok: false, reason: "the invitation's address has no street" };
  let found: Remembered | null;
  try {
    found = await memory.claim(invitation);
  } catch {
    return { ok: false, reason: "lookup memory unavailable, no Places lookup" };
  }
  if (!found) {
    const text = invitationText(inv);
    const r = await search(`${locationName}, ${text}`, languageOf(text)).catch(() => ({ status: "error" as const }));
    if (r.status === "cap") {
      // Nothing was sent to Google: let the next run ask places_take again (it refuses until the next UTC day).
      await memory.release(invitation).catch(() => {});
      return { ok: false, reason: "Places cap reached today" };
    }
    found = r.status === "ok" ? placeFromResults(locationName, street, r.places) : { placeId: null, reason: "Places answered with an error" };
    await memory.save(invitation, found).catch(() => {});
  }
  if (!found.placeId) return { ok: false, reason: found.reason };
  const hits = pending.filter((p) => p.placeId === found!.placeId);
  if (hits.length !== 1) return { ok: false, reason: hits.length ? "two consented businesses share this place ID" : "Places names a listing no consented business has" };
  return { ok: true, business: hits[0] };
}

// The backstop (Access 2, step 3): the listings Kabsi manages that match no business in Kabsi by place ID or Google
// location. Only a listing first seen in this run, with a place ID, is removed: listings Kabsi already managed before
// (Kabsi's own profiles, the first run's baseline) are kept, and more than two at once is treated as a fault and only
// reported.
export type Listing = { locationId: string; placeId: string | null; title: string };
export function strayListings(
  managed: Listing[], businesses: { placeId?: string | null; googleLocationId?: string | null }[], seen: Set<string> | null,
): { remove: Listing[]; report: Listing[] } {
  const places = new Set(businesses.map((b) => b.placeId).filter(Boolean));
  const locations = new Set(businesses.map((b) => b.googleLocationId).filter(Boolean));
  const stray = managed.filter((m) => !(m.placeId && places.has(m.placeId)) && !locations.has(m.locationId));
  // No baseline yet (the first run, or the memory could not be read): remove nothing.
  if (!seen || !seen.size) return { remove: [], report: [] };
  const fresh = stray.filter((m) => !seen.has(m.locationId));
  const removable = fresh.filter((m) => m.placeId);
  if (removable.length > 2) return { remove: [], report: fresh };
  return { remove: removable, report: fresh.filter((m) => !m.placeId) };
}
