// One-click unsubscribe (RFC 8058, K-102, K-118): a signed link in the footer and in the List-Unsubscribe header of every
// email the owner can switch off. A link names one address and one kind of notice, never anything else, and works for
// good (an unsubscribe link that expires is a trap). The link in the footer opens a page on kabsi.co that asks first; the
// unsubscribe happens on POST, so a mail scanner that opens links changes nothing (the same rule as the approval links,
// K-17). The List-Unsubscribe header carries the function's own POST address for the mail client's Unsubscribe button.
// Pure functions over Web Crypto, no database or environment access (the handler below takes its database as deps).

export type UnsubscribeClaim = {
  /** The address. */
  a: string;
  /** The Kabsi user, when the address belongs to one. */
  u: string | null;
  /** The business, when the notice was about one. */
  l: string | null;
  /** The category of notice (notify-categories.ts). */
  c: string;
};

const enc = new TextEncoder();
const b64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

async function hmac(secret: string, data: string) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(data)));
}

export async function signUnsubscribe(claim: UnsubscribeClaim, secret: string): Promise<string> {
  const payload = b64url(enc.encode(JSON.stringify(claim)));
  return `${payload}.${b64url(await hmac(secret, payload))}`;
}

export async function verifyUnsubscribe(token: string, secret: string): Promise<UnsubscribeClaim | null> {
  const [payload, sig, extra] = token.split(".");
  if (!payload || !sig || extra !== undefined || token.length > 1000) return null;
  try {
    const expected = await hmac(secret, payload);
    const given = fromB64url(sig);
    if (given.length !== expected.length) return null;
    let diff = 0;
    for (let i = 0; i < given.length; i++) diff |= given[i]! ^ expected[i]!;
    if (diff !== 0) return null;
    const c = JSON.parse(new TextDecoder().decode(fromB64url(payload))) as UnsubscribeClaim;
    if (typeof c.a !== "string" || typeof c.c !== "string" || !/^[a-z][a-z_]{1,40}$/.test(c.c)) return null;
    return { a: c.a.toLowerCase(), u: typeof c.u === "string" ? c.u : null, l: typeof c.l === "string" ? c.l : null, c: c.c };
  } catch {
    return null;
  }
}

/** The headers Gmail, Apple Mail and Yahoo read to show their own Unsubscribe button (RFC 8058). */
export function unsubscribeHeaders(url: string): Record<string, string> {
  return { "List-Unsubscribe": `<${url}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" };
}

export type UnsubscribeDeps = {
  /** The signing key, or null when it cannot be read. */
  secret(): Promise<string | null>;
  /** The words for a category ("weekly report"). */
  label(category: string): string;
  /** public.apply_unsubscribe for the claim; false when the database refused (the caller has reported it). */
  apply(claim: UnsubscribeClaim): Promise<boolean>;
};
export type UnsubscribeReply = { status: number; body: Record<string, unknown> };

/** Never cached, never a Referer: the token names an address (Sec 1). */
export const UNSUBSCRIBE_HEADERS: Record<string, string> = { "cache-control": "no-store", "referrer-policy": "no-referrer" };

// The whole HTTP surface of /email/unsubscribe (Sec 1). GET reads what the link would stop; POST stops it (the page's
// button, and the RFC 8058 one-click POST from the mail client); anything else, such as a link scanner's HEAD, is refused
// before the token is even checked. Only a token signed with Kabsi's key names an address: a plain address does nothing.
export async function unsubscribeRequest(method: string, token: string | null, deps: UnsubscribeDeps): Promise<UnsubscribeReply> {
  if (method !== "GET" && method !== "POST") return { status: 405, body: { error: "method_not_allowed", message: "Use GET or POST." } };
  const secret = await deps.secret();
  const claim = secret ? await verifyUnsubscribe(token ?? "", secret) : null;
  if (!claim) return { status: 400, body: { error: "invalid_link", message: "This link is not valid." } };
  const label = deps.label(claim.c);
  // Reads only: what the link would stop. A mail scanner that opens it changes nothing.
  if (method === "GET") return { status: 200, body: { ok: true, label } };
  if (!(await deps.apply(claim))) return { status: 400, body: { error: "failed", message: "That did not work. Write to hello@kabsi.co." } };
  return { status: 200, body: { ok: true, label } }; // the mail client's one-click POST wants a 200; the page reads the label
}
