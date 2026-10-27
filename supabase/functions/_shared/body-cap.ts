// Request body size limits for the public functions (Sec 2, Sec 1 LATER row "no request body size limit on the public
// functions"). The body is read once, up to the limit, before the handler sees it; past the limit the answer is 413 and
// the rest is never read into memory. The handler gets a request whose body is the bytes read, so its own req.json()
// keeps working. GET, HEAD and OPTIONS pass through untouched. No database or network import: tested in body-cap.test.ts.

export const BODY_LIMITS = {
  /** Links, codes, consent choices, the review page: a few fields. */
  small: 8 * 1024,
  /** Forms with free text (applications, the waiting list, a reply of at most 4,000 characters). */
  form: 32 * 1024,
  /** Nora's chat (the visitor's last messages) and the signed-in api routes. */
  chat: 64 * 1024,
} as const;

type Handler = (req: Request) => Response | Promise<Response>;

function tooLarge(headers: Record<string, string>) {
  return new Response(JSON.stringify({ error: "too_large", message: "That is too long." }), {
    status: 413,
    headers: { ...headers, "content-type": "application/json" },
  });
}

/** The request with its body read up to `limit` bytes, or a 413 answer. */
export async function capBody(req: Request, limit: number, headers: Record<string, string> = {}): Promise<Request | Response> {
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS" || !req.body) return req;
  const declared = Number(req.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > limit) {
    await req.body.cancel().catch(() => {});
    return tooLarge(headers);
  }
  const reader = req.body.getReader();
  const parts: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel().catch(() => {});
      return tooLarge(headers);
    }
    parts.push(value);
  }
  const all = new Uint8Array(size);
  let at = 0;
  for (const p of parts) {
    all.set(p, at);
    at += p.byteLength;
  }
  return new Request(req.url, { method: req.method, headers: req.headers, body: all });
}

/** A Deno.serve handler that caps every request body at `limit` bytes before `handler` runs. */
export function withBodyCap(handler: Handler, limit: number, headers: Record<string, string> = {}): Handler {
  return async (req) => {
    const capped = await capBody(req, limit, headers);
    return capped instanceof Response ? capped : await handler(capped);
  };
}
