// The possessive of a business name in every message Kabsi writes (PR 469, docs/COPY.md section 65): one helper for
// Outbound, the access and disconnect notices, billing alerts and the AI answer findings. No network, no database.

/** A name ending in s takes only an apostrophe ("Harbor Barbers'", "Maple Nails'", "Moss'"), a name already ending in an
 *  apostrophe (straight or curly) is left as it is, any other name takes 's. Surrounding spaces are dropped. */
export function possessive(name: string): string {
  const n = String(name ?? "").trim();
  if (/['\u2019]$/.test(n)) return n;
  return /s$/i.test(n) ? `${n}'` : `${n}'s`;
}
