// D270 / D293 invitation vetting, kept free of imports so it can be tested on its own.
// Google's Invitation carries the listing's name and address, and no place ID. An invitation is accepted only
// when exactly one consented, access-pending business has the same normalized name AND a matching address
// or city. Two candidates, or none, means it stays pending and is reported.
// Access 1 (26 Oct 2026): the saved address may be shorter than Google's ("Mirna Chalouhi" against "Mirna Chalouhi
// Highway"), so a saved address of two words or more also counts when it appears whole inside Google's street lines
// and city. Area, postcode and country are never used for this, so "Dubai" or "London" alone never matches.

export type PendingBusiness = { name: string; address?: string | null };
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
