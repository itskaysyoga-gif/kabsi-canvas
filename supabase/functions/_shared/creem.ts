// Creem, Kabsi's one payment route (master plan section 10, R-67). One module, no SDK: plain fetch and WebCrypto
// (10.2.6). The base URL follows CREEM_MODE (test or live); the key is read from Supabase secrets by the caller and
// sent only to Creem's API (10.2.5). Pure where it can be: the signature check, the product catalogue, the setup plan
// and the event rules take everything as arguments, so tests run in Node without credentials.

export type Mode = "test" | "live";
export const CREEM_BASE: Record<Mode, string> = { test: "https://test-api.creem.io/v1", live: "https://api.creem.io/v1" };
export const modeOf = (v: string | null | undefined): Mode => (v === "live" ? "live" : "test");

// ─── the products (10.2.1, 10.2.3; names and description from docs/COPY.md section 23)
export type ProductKey = "essentials_month" | "essentials_year" | "pro_month" | "pro_year" | "extra_month" | "extra_year";
export type Plan = "essentials" | "pro";
export type Period = "month" | "year";
export const PRODUCT_DESCRIPTION = "Your Google listing and reviews, managed from WhatsApp. Cancel in WhatsApp any time.";
export const CATALOGUE: Record<ProductKey, { name: string; price: number; period: Period; plan: Plan | "extra" }> = {
  essentials_month: { name: "Kabsi Essentials, monthly", price: 1900, period: "month", plan: "essentials" },
  essentials_year: { name: "Kabsi Essentials, yearly", price: 19000, period: "year", plan: "essentials" },
  pro_month: { name: "Kabsi Pro, monthly", price: 3900, period: "month", plan: "pro" },
  pro_year: { name: "Kabsi Pro, yearly", price: 39000, period: "year", plan: "pro" },
  extra_month: { name: "Extra location", price: 1500, period: "month", plan: "extra" },
  extra_year: { name: "Extra location", price: 15000, period: "year", plan: "extra" },
};
export const PRODUCT_KEYS = Object.keys(CATALOGUE) as ProductKey[];
export const planKey = (plan: Plan, period: Period): ProductKey => `${plan}_${period}` as ProductKey;
export const extraKey = (period: Period): ProductKey => `extra_${period}` as ProductKey;
const BILLING_PERIOD: Record<Period, string> = { month: "every-month", year: "every-year" };

/** The product ids Kabsi uses in one mode (app_settings creem_products_<mode>), by key. */
export type ProductIds = Partial<Record<ProductKey, string>>;
export const keyOfProduct = (ids: ProductIds, productId: string | null | undefined): ProductKey | null =>
  (productId ? (PRODUCT_KEYS.find((k) => ids[k] === productId) ?? null) : null);

export type CreemProduct = {
  id: string; name: string; description?: string | null; price: number; currency: string; billing_type: string;
  billing_period?: string | null; status?: string; trial_period_days?: number | null;
};

/** Does this Creem product match a Kabsi product exactly: price, currency, interval and billing type (10.2.3)? */
export function matches(p: CreemProduct, key: ProductKey): boolean {
  const c = CATALOGUE[key];
  return p.status !== "archived" && p.price === c.price && String(p.currency).toUpperCase() === "USD" &&
    p.billing_type === "recurring" && p.billing_period === BILLING_PERIOD[c.period] && !p.trial_period_days;
}

export type SetupPlan = {
  reuse: { key: ProductKey; id: string; rename: boolean }[];
  create: ProductKey[];
  unmatched: { id: string; name: string; price: number; currency: string; billing_period: string | null }[];
};
/** What the setup action does with the products Creem already has: reuse an exact match (renaming it to Kabsi's name),
 * create what is missing, and list everything else for Rashid to archive. It never deletes. */
export function setupPlan(existing: CreemProduct[]): SetupPlan {
  const taken = new Set<string>();
  const reuse: SetupPlan["reuse"] = [];
  const create: ProductKey[] = [];
  for (const key of PRODUCT_KEYS) {
    const live = existing.filter((p) => !taken.has(p.id) && matches(p, key));
    const hit = live.find((p) => p.name === CATALOGUE[key].name) ?? live[0];
    if (hit) {
      taken.add(hit.id);
      reuse.push({ key, id: hit.id, rename: hit.name !== CATALOGUE[key].name || (hit.description ?? "") !== PRODUCT_DESCRIPTION });
    } else create.push(key);
  }
  const unmatched = existing.filter((p) => !taken.has(p.id) && p.status !== "archived")
    .map((p) => ({ id: p.id, name: p.name, price: p.price, currency: p.currency, billing_period: p.billing_period ?? null }));
  return { reuse, create, unmatched };
}
export const createBody = (key: ProductKey, successUrl: string) => ({
  name: CATALOGUE[key].name, description: PRODUCT_DESCRIPTION, price: CATALOGUE[key].price, currency: "USD",
  billing_type: "recurring", billing_period: BILLING_PERIOD[CATALOGUE[key].period], tax_mode: "exclusive",
  tax_category: "saas", default_success_url: successUrl,
});

// ─── the webhook signature (10.1: hex HMAC-SHA256 of the raw body with the webhook secret)
const enc = new TextEncoder();
export async function hmacHex(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(body));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function sameText(a: string, b: string): boolean {
  // Constant time over the longer length, so the length of a wrong guess tells nothing either.
  const n = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < n; i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}
/** "missing", "wrong" or null when the signature is good. */
export async function signatureProblem(rawBody: string, header: string | null, secret: string): Promise<"missing" | "wrong" | null> {
  const given = (header ?? "").trim().toLowerCase();
  if (!given) return "missing";
  if (!secret) return "wrong";
  return sameText(given, await hmacHex(secret, rawBody)) ? null : "wrong";
}

// ─── events
export type CreemEvent = { id: string; eventType: string; created_at: number | string; object: Record<string, unknown> };
export const STALE_DAYS = 3;
export const EVENTS = [
  "checkout.completed", "subscription.active", "subscription.paid", "subscription.trialing", "subscription.update",
  "subscription.scheduled_cancel", "subscription.canceled", "subscription.past_due", "subscription.unpaid",
  "subscription.paused", "subscription.expired", "refund.created", "dispute.created",
] as const;

export function parseEvent(raw: string): CreemEvent | null {
  try {
    const e = JSON.parse(raw) as Partial<CreemEvent>;
    if (!e || typeof e.id !== "string" || !e.id || typeof e.eventType !== "string" || !e.object || typeof e.object !== "object") return null;
    return e as CreemEvent;
  } catch {
    return null;
  }
}
/** When Creem made the event. Creem sends milliseconds; seconds and ISO text are read too. */
export function eventTime(e: Pick<CreemEvent, "created_at">): Date | null {
  const v = e.created_at;
  if (typeof v === "number" && Number.isFinite(v)) return new Date(v < 1e12 ? v * 1000 : v);
  if (typeof v === "string" && v) {
    const n = Number(v);
    const d = Number.isFinite(n) ? new Date(n < 1e12 ? n * 1000 : n) : new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}
/** The replay guard Creem does not give (10.2.8): an event older than 3 days, or with no time, is refused. */
export const isStale = (e: CreemEvent, now: Date) => {
  const t = eventTime(e);
  return !t || now.getTime() - t.getTime() > STALE_DAYS * 86_400_000;
};

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj | null => (v && typeof v === "object" && !Array.isArray(v) ? v as Obj : null);
const str = (v: unknown): string | null => (typeof v === "string" && v ? v : null);
const idOf = (v: unknown): string | null => str(v) ?? str(obj(v)?.id);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** The subscription inside an event: the object itself for subscription.*, nested for checkouts, refunds and disputes. */
export function subscriptionOf(e: CreemEvent): Obj | null {
  if (e.eventType.startsWith("subscription.")) return e.object;
  return obj(e.object.subscription);
}
/** The Kabsi organisation the event belongs to: metadata.referenceId set at checkout (10.2.7). */
export function orgOf(e: CreemEvent): string | null {
  const sub = subscriptionOf(e);
  const metas = [obj(e.object.metadata), obj(sub?.metadata), obj(obj(e.object.checkout)?.metadata)];
  for (const m of metas) {
    const id = str(m?.referenceId);
    if (id && /^[0-9a-f-]{36}$/i.test(id)) return id.toLowerCase();
  }
  return null;
}

/** The facts the ledger keeps for every event (10.2.15): no names, no emails. */
export function ledgerOf(e: CreemEvent) {
  const sub = subscriptionOf(e);
  const tx = obj(e.object.transaction) ?? obj(sub?.last_transaction) ?? obj(e.object.order);
  const refund = e.eventType === "refund.created";
  const dispute = e.eventType === "dispute.created";
  const amount = refund ? num(e.object.refund_amount) : dispute ? num(e.object.amount) : num(tx?.amount) ?? (e.eventType === "subscription.paid" ? num(obj(sub?.product)?.price) : null);
  const currency = refund ? str(e.object.refund_currency) : dispute ? str(e.object.currency) : str(tx?.currency) ?? str(obj(sub?.product)?.currency);
  return {
    subscriptionId: idOf(sub) ?? str(obj(e.object.transaction)?.subscription),
    customerId: idOf(e.object.customer) ?? idOf(sub?.customer),
    paymentId: str(tx?.id) ?? str(sub?.last_transaction_id),
    amount, currency: currency ? currency.toUpperCase() : null,
    mode: str(e.object.mode) ?? str(sub?.mode),
  };
}
/** The event body as stored: everything Kabsi needs to apply it, without the customer's name or email. */
export function scrubEvent(e: CreemEvent): CreemEvent {
  const clean = (v: unknown, depth = 0): unknown => {
    if (depth > 6 || v === null || typeof v !== "object") return v;
    if (Array.isArray(v)) return v.map((x) => clean(x, depth + 1));
    const out: Obj = {};
    for (const [k, x] of Object.entries(v as Obj)) {
      if (k === "email" || (k === "name" && (v as Obj).object === "customer")) continue;
      out[k] = clean(x, depth + 1);
    }
    return out;
  };
  return clean(e) as CreemEvent;
}

// What a subscription in an event says: the plan, period, extra locations and the period end.
export type SubFacts = {
  subscriptionId: string | null; customerId: string | null; productId: string | null;
  plan: Plan | null; period: Period | null; units: number; periodStart: string | null; periodEnd: string | null;
  status: string | null; extraItemId: string | null;
};
export function subFacts(sub: Obj | null, ids: ProductIds): SubFacts {
  const productId = idOf(sub?.product);
  const key = keyOfProduct(ids, productId);
  const items = Array.isArray(sub?.items) ? (sub!.items as Obj[]) : [];
  let units = 0;
  let extraItemId: string | null = null;
  for (const it of items) {
    const k = keyOfProduct(ids, str(it.product_id));
    if (k === "extra_month" || k === "extra_year") {
      units += Math.max(0, Math.round(num(it.units) ?? 0));
      extraItemId ??= str(it.id);
    }
  }
  const c = key ? CATALOGUE[key] : null;
  return {
    subscriptionId: idOf(sub), customerId: idOf(sub?.customer), productId,
    plan: c && c.plan !== "extra" ? c.plan : null, period: c ? c.period : null, units,
    periodStart: str(sub?.current_period_start_date), periodEnd: str(sub?.current_period_end_date) ?? str(sub?.next_transaction_date),
    status: str(sub?.status), extraItemId,
  };
}

// ─── event to state (10.2.9)
export type SubState = "incomplete" | "active" | "past_due" | "paused" | "cancelled" | "expired";
export type Message = "scheduled_cancel" | "payment_failed" | "paused" | "ended" | "resumed";
export type Effect = {
  /** Write the subscription row (by its Creem id), or nothing. */
  write: null | {
    state?: SubState; plan?: Plan; period?: Period; units?: number; productId?: string | null; periodStart?: string | null;
    periodEnd?: string | null; cancelAtPeriodEnd?: boolean; pastDue?: "start" | "clear"; ended?: boolean; link?: boolean;
  };
  message: Message | null;
  /** A staff alert on WhatsApp (R-64). */
  alert: string | null;
  /** A first payment: the founding count is checked. */
  paid: boolean;
};

export function effectOf(e: CreemEvent, ids: ProductIds): Effect {
  const f = subFacts(subscriptionOf(e), ids);
  const plan = f.plan ? { plan: f.plan, period: f.period ?? undefined, productId: f.productId } : {};
  const none: Effect = { write: null, message: null, alert: null, paid: false };
  switch (e.eventType) {
    case "checkout.completed":
      // Links the Creem customer and subscription to the business; no access change by itself.
      return { ...none, write: { link: true, state: "incomplete", ...plan, units: f.units } };
    case "subscription.active":
    case "subscription.paid":
      return {
        ...none, paid: e.eventType === "subscription.paid",
        write: { state: "active", ...plan, units: f.units, periodStart: f.periodStart, periodEnd: f.periodEnd, pastDue: "clear",
          cancelAtPeriodEnd: f.status === "scheduled_cancel" },
      };
    case "subscription.update":
      return { ...none, write: { ...plan, units: f.units, periodEnd: f.periodEnd, cancelAtPeriodEnd: f.status === "scheduled_cancel" ? true : f.status === "active" ? false : undefined } };
    case "subscription.scheduled_cancel":
      return { ...none, write: { cancelAtPeriodEnd: true, periodEnd: f.periodEnd }, message: "scheduled_cancel" };
    case "subscription.past_due":
    case "subscription.unpaid":
      return { ...none, write: { state: "past_due", pastDue: "start", periodEnd: f.periodEnd }, message: "payment_failed" };
    case "subscription.paused":
      return { ...none, write: { state: "paused" }, message: "paused" };
    case "subscription.expired":
      return { ...none, write: { state: "expired", ended: true }, message: "paused" };
    case "subscription.canceled":
      return { ...none, write: { state: "cancelled", ended: true, cancelAtPeriodEnd: false }, message: "ended" };
    case "refund.created":
      return { ...none, alert: "refund" };
    case "dispute.created":
      return { ...none, alert: "dispute" };
    case "subscription.trialing":
      return { ...none, alert: "trialing" };
    default:
      return none;
  }
}

/**
 * The changes one event makes to a subscription row, given the row as it is now (null when there is none yet). Pure, so the race of
 * two events for one subscription is tested: Creem sends `checkout.completed` and `subscription.paid` within a second and two
 * workers can take them together, so whoever loses the insert must apply its own changes to the winner's row (QA 1, 25 Oct).
 */
export function patchFor(
  w: NonNullable<Effect["write"]>, f: SubFacts, eventType: string,
  existing: { state: string; past_due_at: string | null } | null, at: Date, now: Date = new Date(),
): Record<string, unknown> {
  const patch: Record<string, unknown> = { last_event_at: at.toISOString(), updated_at: now.toISOString() };
  // A checkout after a cancel never moves an active subscription back to incomplete.
  if (w.state && !(w.state === "incomplete" && existing && existing.state !== "incomplete")) patch.state = w.state;
  if (w.plan) patch.plan = w.plan;
  if (w.period) patch.period = w.period;
  if (w.productId) patch.product_id = w.productId;
  if (w.units !== undefined && (w.units > 0 || eventType !== "checkout.completed")) patch.units = w.units;
  if (w.periodStart) patch.current_period_start = w.periodStart;
  if (w.periodEnd) patch.current_period_end = w.periodEnd;
  if (w.cancelAtPeriodEnd !== undefined) patch.cancel_at_period_end = w.cancelAtPeriodEnd;
  if (w.pastDue === "start") patch.past_due_at = existing?.past_due_at ?? at.toISOString();
  if (w.pastDue === "clear") patch.past_due_at = null;
  if (w.ended) patch.ended_at = at.toISOString();
  if (w.state === "active") patch.ended_at = null;
  if (f.customerId) patch.provider_customer_id = f.customerId;
  return patch;
}

// ─── the client (fetch is injected so tests use a fake)
export type Fetch = (url: string, init: RequestInit) => Promise<Response>;
export class CreemError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}
export function creemClient(key: string, mode: Mode, f: Fetch = fetch) {
  const call = async <T>(method: string, path: string, body?: unknown): Promise<T> => {
    const res = await f(`${CREEM_BASE[mode]}${path}`, {
      method, headers: { "x-api-key": key, "content-type": "application/json", accept: "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    if (!res.ok) throw new CreemError(res.status, `creem ${method} ${path.split("?")[0]} ${res.status}: ${text.slice(0, 200)}`);
    return (text ? JSON.parse(text) : {}) as T;
  };
  return {
    mode,
    async listProducts(): Promise<CreemProduct[]> {
      const all: CreemProduct[] = [];
      for (let page = 1; page <= 10; page++) {
        const r = await call<{ items: CreemProduct[]; pagination?: { next_page?: number | null } }>("GET", `/products/search?page_number=${page}&page_size=50`);
        all.push(...(r.items ?? []));
        if (!r.pagination?.next_page || !(r.items ?? []).length) break;
      }
      return all;
    },
    createProduct: (key: ProductKey, successUrl: string) => call<CreemProduct>("POST", "/products", createBody(key, successUrl)),
    renameProduct: (id: string, key: ProductKey) => call<CreemProduct>("PATCH", `/products/${encodeURIComponent(id)}`, { name: CATALOGUE[key].name, description: PRODUCT_DESCRIPTION }),
    createCheckout: (b: { productId: string; units?: number; requestId: string; successUrl: string; email?: string | null; metadata: Record<string, string> }) =>
      call<{ id: string; checkout_url: string }>("POST", "/checkouts", {
        product_id: b.productId, units: b.units ?? 1, request_id: b.requestId, success_url: b.successUrl,
        ...(b.email ? { customer: { email: b.email } } : {}), metadata: b.metadata,
      }),
    portalLink: (customerId: string) => call<{ customer_portal_link: string }>("POST", "/customers/billing", { customer_id: customerId }),
    getSubscription: (id: string) => call<Obj>("GET", `/subscriptions?subscription_id=${encodeURIComponent(id)}`),
    cancelAtPeriodEnd: (id: string) => call<Obj>("POST", `/subscriptions/${encodeURIComponent(id)}/cancel`, { mode: "scheduled", onExecute: "cancel" }),
    resume: (id: string) => call<Obj>("POST", `/subscriptions/${encodeURIComponent(id)}/resume`, {}),
    upgrade: (id: string, productId: string, behavior: "proration-charge-immediately" | "proration-none") =>
      call<Obj>("POST", `/subscriptions/${encodeURIComponent(id)}/upgrade`, { product_id: productId, update_behavior: behavior }),
    setItems: (id: string, items: { id?: string; product_id?: string; units: number }[]) =>
      call<Obj>("POST", `/subscriptions/${encodeURIComponent(id)}`, { items, update_behavior: "proration-charge-immediately" }),
  };
}
export type Creem = ReturnType<typeof creemClient>;

/** Kabsi's own request id for a checkout: the same business, product and units on the same day give the same id, so a
 * repeated tap returns the link already made (10.2.7). */
export const checkoutRequestId = (orgId: string, key: ProductKey, units: number, now: Date) =>
  `kabsi-${orgId}-${key}-${units}-${now.toISOString().slice(0, 10)}`;
