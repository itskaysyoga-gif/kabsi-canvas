// Sec 1: the raw body of a webhook, read with a size cap. A declared Content-Length over the cap is refused before a
// byte is read, and a chunked body is read only until it passes the cap, so a huge body never sits whole in memory and
// is never hashed. Used by the Kapso, Creem, Resend and Pub/Sub webhooks.

/** Every webhook Kabsi takes is a few kilobytes; 256 KB leaves room for a Kapso batch. */
export const MAX_WEBHOOK_BODY = 256 * 1024;

/** The body's bytes, or null when it is larger than `max`. */
export async function readCapped(req: Request, max = MAX_WEBHOOK_BODY): Promise<Uint8Array<ArrayBuffer> | null> {
  const declared = Number(req.headers.get("content-length") ?? "");
  if (Number.isFinite(declared) && declared > max) {
    await req.body?.cancel().catch(() => {});
    return null;
  }
  if (!req.body) return new Uint8Array(0);
  const reader = req.body.getReader();
  const parts: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel().catch(() => {});
      return null;
    }
    parts.push(value);
  }
  const out = new Uint8Array(size);
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.byteLength;
  }
  return out;
}

export const textOf = (b: Uint8Array) => new TextDecoder().decode(b);
