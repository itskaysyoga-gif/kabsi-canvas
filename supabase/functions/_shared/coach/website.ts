// The website link tag (P0.8-09, K-136.7): utm_source=google&utm_medium=organic&utm_campaign=gbp on the link Google shows,
// so the owner's own analytics can tell the visits that come from the Google profile. The owner sees the exact new link
// and approves it; Protection then keeps it as the approved value. Pure.
const TAG: [string, string][] = [["utm_source", "google"], ["utm_medium", "organic"], ["utm_campaign", "gbp"]];

/** Is the link already tagged (a utm_source of any value)? */
export function hasTag(link: string): boolean {
  try {
    return new URL(link.trim()).searchParams.has("utm_source");
  } catch {
    return false;
  }
}

/** The link with the tag, keeping everything the owner wrote (path, other query values, the part after #). null when the text
 * is not a plain web link, or already tagged, so there is nothing to change. */
export function tagWebsite(link: string): string | null {
  const text = link.trim();
  let u: URL;
  try {
    u = new URL(text);
  } catch {
    return null;
  }
  if ((u.protocol !== "https:" && u.protocol !== "http:") || u.username || u.password) return null;
  if (u.searchParams.has("utm_source")) return null;
  const hash = text.indexOf("#");
  const base = hash === -1 ? text : text.slice(0, hash);
  const frag = hash === -1 ? "" : text.slice(hash);
  const missing = TAG.filter(([k]) => !u.searchParams.has(k)).map(([k, v]) => `${k}=${v}`).join("&");
  const sep = !base.includes("?") ? "?" : base.endsWith("?") || base.endsWith("&") ? "" : "&";
  return `${base}${sep}${missing}${frag}`;
}
