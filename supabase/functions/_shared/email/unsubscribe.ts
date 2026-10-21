// One-click unsubscribe (RFC 8058, K-102, K-118): a signed link in the footer and in the List-Unsubscribe header of every
// email the owner can switch off. A link names one address and one kind of notice, never anything else, and works for
// good (an unsubscribe link that expires is a trap). The link in the footer opens a page on kabsi.co that asks first; the
// unsubscribe happens on POST, so a mail scanner that opens links changes nothing (the same rule as the approval links,
// K-17). The List-Unsubscribe header carries the function's own POST address for the mail client's Unsubscribe button.
// Pure functions over Web Crypto, no database or environment access.

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
