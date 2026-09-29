// D270 / D293 invitation vetting, kept free of imports so it can be tested on its own.
// Google's Invitation carries the listing's name and address, and no place ID. An invitation is accepted only
// when exactly one consented, access-pending business has the same normalized name AND a matching address
// or city. Two candidates, or none, means it stays pending and is reported.

export type PendingBusiness = { name: string; address?: string | null };
export type InvitationAddress = { addressLines?: string[]; locality?: string; administrativeArea?: string; postalCode?: string } | null | undefined;
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
  const street = norm(inv.addressLines?.[0]);
  if (street && containsWords(hay, street)) return true;
  const city = norm(inv.locality);
  return !!city && containsWords(hay, city);
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
