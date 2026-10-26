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
  if (typeof inv === "string") return textAddressMatches(hay, inv);
  const street = norm(inv.addressLines?.[0]);
  if (street && containsWords(hay, street)) return true;
  const city = norm(inv.locality);
  if (city && containsWords(hay, city)) return true;
  if (words(hay) < 2) return false;
  const streetAndCity = norm([...(inv.addressLines ?? []), inv.locality].filter(Boolean).join(" "));
  return containsWords(streetAndCity, hay);
}

const words = (v: string) => (v ? v.split(" ").length : 0);

// Access 1: the string Google sends. Its first part (the street) inside the saved address counts, as does the
// saved address of two words or more inside Google's whole line, or Google's whole line inside the saved address.
// Later parts alone (area, postcode, country) never count, so "Dubai" or "London" alone never matches.
function textAddressMatches(hay: string, inv: string): boolean {
  const full = norm(inv);
  if (!full) return false;
  const street = norm(inv.split(",")[0]);
  if (words(street) >= 2 && containsWords(hay, street)) return true;
  if (words(hay) >= 2 && containsWords(full, hay)) return true;
  return words(full) >= 2 && containsWords(hay, full);
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
