// NOWPayments (Q06, D269). Pure helpers: no database, no shared imports, so they can be tested on their own.
// The secrets NOWPAYMENTS_API_KEY and NOWPAYMENTS_IPN_SECRET are read with Deno.env.get only where they are used,
// and are never logged.

/** Sorts object keys at every level (arrays keep their order). NOWPayments signs the JSON of the sorted body. */
export function sortDeep(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortDeep);
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    return Object.fromEntries(Object.keys(o).sort().map((k) => [k, sortDeep(o[k])]));
  }
  return v;
}
export const canonical = (body: unknown): string => JSON.stringify(sortDeep(body));

export async function hmacSha512Hex(secret: string, text: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-512" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(text));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Checks the x-nowpayments-sig header: HMAC-SHA512, keyed with the IPN secret, over the body with keys sorted at
 * every level. The older documented form (a top-level key replacer) drops nested keys such as `fee`; it is keyed with
 * the same secret, so accepting it as a fallback costs nothing in security.
 */
export async function verifyIpn(rawBody: string, sigHeader: string | null, secret: string): Promise<boolean> {
  if (!sigHeader || !secret) return false;
  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return false;
  }
  if (!body || typeof body !== "object") return false;
  const given = sigHeader.trim().toLowerCase();
  if (safeEqual(await hmacSha512Hex(secret, canonical(body)), given)) return true;
  const legacy = JSON.stringify(body, Object.keys(body as object).sort());
  return safeEqual(await hmacSha512Hex(secret, legacy), given);
}

/** Payment statuses in the order a payment normally moves through them. */
export const STATUS_RANK: Record<string, number> = { waiting: 1, confirming: 2, confirmed: 3, sending: 4, partially_paid: 5, finished: 6 };

const base = () => Deno.env.get("NOWPAYMENTS_BASE") ?? "https://api.nowpayments.io/v1";
const apiKey = () => {
  const k = Deno.env.get("NOWPAYMENTS_API_KEY");
  if (!k) throw new Error("nowpayments_not_configured");
  return k;
};

export type InvoiceInput = {
  priceAmount: number; payCurrency: string; orderId: string; description: string;
  ipnUrl: string; successUrl: string; cancelUrl: string;
};
export async function createInvoice(o: InvoiceInput): Promise<{ id: string; invoiceUrl: string }> {
  const res = await fetch(`${base()}/invoice`, {
    method: "POST",
    headers: { "x-api-key": apiKey(), "content-type": "application/json" },
    signal: AbortSignal.timeout(15_000),
    body: JSON.stringify({
      price_amount: o.priceAmount, price_currency: "usd", pay_currency: o.payCurrency, order_id: o.orderId,
      order_description: o.description, ipn_callback_url: o.ipnUrl, success_url: o.successUrl, cancel_url: o.cancelUrl,
      is_fixed_rate: true, is_fee_paid_by_user: false,
    }),
  });
  if (!res.ok) throw new Error(`nowpayments invoice ${res.status}`);
  const j = await res.json() as { id?: string | number; invoice_url?: string };
  if (j.id == null || !j.invoice_url) throw new Error("nowpayments invoice: unexpected reply");
  return { id: String(j.id), invoiceUrl: j.invoice_url };
}

/** Second check on a `finished` notification: ask NOWPayments directly, so a leaked IPN secret alone cannot grant a plan. */
export async function getPayment(paymentId: string): Promise<{ status: string; invoiceId: string | null }> {
  const res = await fetch(`${base()}/payment/${encodeURIComponent(paymentId)}`, {
    headers: { "x-api-key": apiKey() },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`nowpayments payment ${res.status}`);
  const j = await res.json() as { payment_status?: string; invoice_id?: string | number | null };
  return { status: String(j.payment_status ?? ""), invoiceId: j.invoice_id == null ? null : String(j.invoice_id) };
}
