// Sec 1: small, pure checks that the Edge Functions use before any service role read or write on a business's data.
// Kept free of imports so the self-contained functions (health, google-capture) can use them too, and so the Deno
// tests in routes.test.ts can run them without a database.

/** Constant-time comparison of a secret from a request header with the stored one. Unequal lengths fail at once
 *  (the length of a 64 character secret is not a secret); a missing or non-string side never matches. */
export function secretMatches(given: string | null | undefined, expected: unknown): boolean {
  if (typeof given !== "string" || typeof expected !== "string" || !given || !expected) return false;
  if (given.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < given.length; i++) diff |= given.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

export type OneLocation = { ok: true; locationId: string } | { ok: false; reason: "missing" | "mismatch" };

/** The one business a request is about. A request can name a business directly (location_id) and through the rows it
 *  names (a post, a photo, a holiday question, a Protection change, a publication). Every one of them must point at
 *  the same business: otherwise the membership check would run on one business while the work runs on another's
 *  row (Sec 1, the content IDOR). Empty values are ignored; no value at all is "missing". */
export function resolveOneLocation(candidates: ReadonlyArray<string | null | undefined>): OneLocation {
  const seen = new Set(candidates.filter((c): c is string => typeof c === "string" && c.length > 0));
  if (seen.size === 0) return { ok: false, reason: "missing" };
  if (seen.size > 1) return { ok: false, reason: "mismatch" };
  return { ok: true, locationId: [...seen][0] };
}

export type VisibilityCaller = { kind: "internal" } | { kind: "staff"; id: string } | { kind: "member"; id: string; role: string } | null;

/** Who may change a business's Visibility Map searches and competitor picks: the internal caller, Kabsi staff, and the
 *  business's owner or manager. A member with the staff role only adds photos and shares the review link (K-16), the
 *  same rule the WhatsApp agent applies to the keyword confirm. */
export function mayChangeVisibility(who: VisibilityCaller): who is NonNullable<VisibilityCaller> {
  if (!who) return false;
  if (who.kind === "internal" || who.kind === "staff") return true;
  return who.role === "owner" || who.role === "manager";
}
