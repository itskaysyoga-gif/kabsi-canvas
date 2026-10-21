// Resend's bounce and complaint webhook (K-118, G-22): one suppression list, so a bounced or complaining address is
// never mailed again. Resend signs each delivery with Svix: the headers svix-id, svix-timestamp and svix-signature, the
// signed text "<id>.<timestamp>.<body>", HMAC-SHA256 with the base64 part of the signing secret ("whsec_..."). A delivery
// with a missing or wrong signature, or older than 5 minutes, is refused. Pure functions, no database or environment.

const enc = new TextEncoder();
const TOLERANCE_SECONDS = 300;

export async function verifySvix(secret: string, headers: { id: string | null; timestamp: string | null; signature: string | null }, body: string, nowSeconds = Math.floor(Date.now() / 1000)): Promise<boolean> {
  const { id, timestamp, signature } = headers;
  if (!secret || !id || !timestamp || !signature) return false;
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(nowSeconds - ts) > TOLERANCE_SECONDS) return false;
  let keyBytes: Uint8Array<ArrayBuffer>;
  try {
    keyBytes = Uint8Array.from(atob(secret.replace(/^whsec_/, "")), (c) => c.charCodeAt(0));
  } catch {
    return false;
  }
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const expected = btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(`${id}.${timestamp}.${body}`)))));
  // The header may hold several signatures ("v1,<sig> v1,<sig>") while a secret is being rotated.
  return signature.split(" ").some((part) => {
    const [version, sig] = part.split(",");
    if (version !== "v1" || !sig || sig.length !== expected.length) return false;
    let diff = 0;
    for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
    return diff === 0;
  });
}

export type MailEvent =
  | { kind: "delivered"; resendId: string }
  | { kind: "bounced"; resendId: string; addresses: string[]; permanent: boolean }
  | { kind: "complained"; resendId: string; addresses: string[] }
  | { kind: "ignored" };

/** What a Resend event means for us. Only a permanent bounce and a complaint suppress an address. */
export function readEvent(raw: unknown): MailEvent {
  const e = raw as { type?: string; data?: { email_id?: string; to?: string[] | string; bounce?: { type?: string } } } | null;
  const resendId = e?.data?.email_id;
  if (!e?.type || !resendId) return { kind: "ignored" };
  const addresses = (Array.isArray(e.data?.to) ? e.data!.to : e.data?.to ? [e.data.to] : []).map((a) => String(a).toLowerCase().replace(/^.*<(.+)>$/, "$1"));
  if (e.type === "email.delivered") return { kind: "delivered", resendId };
  if (e.type === "email.bounced") return { kind: "bounced", resendId, addresses, permanent: String(e.data?.bounce?.type ?? "Permanent").toLowerCase() === "permanent" };
  if (e.type === "email.complained") return { kind: "complained", resendId, addresses };
  return { kind: "ignored" };
}
