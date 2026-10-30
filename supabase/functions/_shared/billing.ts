// Plans and payments with Creem, the database side (master plan section 10, R-67). The webhook (billing-creem) only
// checks and stores each event; the job queue runs applyEvent, which is the only writer of paid state (10.2.8). The
// owner's actions (checkout, portal, cancel, keep, change plan, add a location) and the staff setup action live here
// too, so the Plan screen and WhatsApp use the same code. The Creem key comes from Supabase secrets only (10.2.5).
import { admin, APP_URL, captureError, jobLog, log } from "./kabsi.ts";
import { notify as notifyEmail } from "./notify.ts";
import { esc } from "./email-layout.ts";
import type { EmailContent } from "./email/template.ts";
import { paymentFailed, planCancelled } from "./email/account-copy.ts";
import { outDb } from "./whatsapp/db.ts";
import { ref } from "./whatsapp/templates.ts";
import {
  CATALOGUE, checkoutRequestId, type Creem, creemClient, CreemError, type CreemEvent, effectOf, eventTime, extraKey, familyOfKey,
  isStale, keyOfProduct, ledgerOf, type Message, type Mode, modeOf, orgOf, type Period, type Plan, planKey, type PriceFamily,
  type ProductIds, type ProductKey,
  PRODUCT_KEYS, patchFor, sameMode, scrubEvent, setupPlan, type SubFacts, subFacts, subscriptionOf,
} from "./creem.ts";

export const CREEM_MODE: Mode = modeOf(Deno.env.get("CREEM_MODE"));
export const SUCCESS_URL = `${APP_URL}/billing/done`;
const GRACE_DAYS = 7;
const DATA_DAYS = 30;

export function creem(): Creem {
  const key = Deno.env.get("CREEM_API_KEY") ?? "";
  if (!key) throw new BillingError("not_configured", "Payments are not set up yet.");
  return creemClient(key, CREEM_MODE);
}
export class BillingError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
  }
}

const SETTINGS_KEY = (mode: Mode) => `creem_products_${mode}`;
export async function productIds(mode: Mode = CREEM_MODE): Promise<ProductIds> {
  const { data } = await admin().from("app_settings").select("value").eq("key", SETTINGS_KEY(mode)).maybeSingle();
  try {
    return (data?.value ? JSON.parse(String(data.value)) : {}) as ProductIds;
  } catch {
    return {};
  }
}

// ─── the webhook's part: store once, then hand to the queue ─────────────────────────────────────────────────────────
export type Stored = "stored" | "duplicate" | "stale" | "other_mode";
export async function storeEvent(e: CreemEvent, now = new Date()): Promise<Stored> {
  const l = ledgerOf(e);
  const at = eventTime(e);
  const stale = isStale(e, now);
  // A test event at the live endpoint (or the reverse) is kept for the record and never applied. Creem's live events say
  // "prod" (its EnvironmentMode); "live" and "production" are read as live too (Billing 2).
  const otherMode = !sameMode(l.mode, CREEM_MODE);
  const outcome = stale ? "refused_stale" : otherMode ? "refused_other_mode" : "queued";
  const { error } = await admin().from("billing_events").insert({
    provider: "creem", event_key: e.id, event_type: e.eventType, event_created_at: at?.toISOString() ?? null,
    mode: l.mode, organization_id: orgOf(e), provider_subscription_id: l.subscriptionId, provider_customer_id: l.customerId,
    payment_id: l.paymentId, amount: l.amount, currency: l.currency, payment_status: e.eventType, outcome,
    detail: scrubEvent(e),
  });
  if (error?.code === "23505") return "duplicate";
  if (error) throw error;
  if (stale) return "stale";
  if (otherMode) return "other_mode";
  const { error: je } = await admin().rpc("enqueue_job", { p_kind: "billing_event", p_location: null, p_dedupe_key: `billing_event:${e.id}`, p_payload: { event_id: e.id } });
  if (je) throw je;
  return "stored";
}

// ─── the queue's part: the one writer of paid state ─────────────────────────────────────────────────────────────────
type SubRow = {
  id: string; organization_id: string; plan: string; state: string; period: string | null; units: number;
  current_period_end: string | null; cancel_at_period_end: boolean | null; provider_customer_id: string | null;
  provider_subscription_id: string | null; past_due_at: string | null; last_event_at: string | null; founding: boolean;
  mode: string | null; ended_at: string | null; product_id?: string | null;
};

export async function applyEvent(eventKey: string): Promise<string> {
  const db = admin();
  const { data: row, error } = await db.from("billing_events").select("id, detail, organization_id, processed_at")
    .eq("provider", "creem").eq("event_key", eventKey).maybeSingle();
  if (error) throw error;
  if (!row) return "missing";
  if (row.processed_at) return "already";
  const e = row.detail as CreemEvent;
  const ids = await productIds();
  const effect = effectOf(e, ids);
  const at = eventTime(e) ?? new Date();
  const facts = subFacts(subscriptionOf(e), ids);
  const subId = facts.subscriptionId;
  // Billing 2 (10.2.3): an Extra location subscription has its own row in billing_extras; its units go on the plan row.
  const knownExtra = subId ? await extraRow(subId) : null;
  const extra = facts.extra || knownExtra !== null;
  let existing = subId && !extra ? await subRow(subId) : null;
  // A renewal may carry no metadata: the business comes from the row Kabsi already keeps (plan or extra).
  const org = existing?.organization_id ?? knownExtra?.organization_id ?? (row.organization_id as string | null) ?? orgOf(e);
  let result = "recorded";

  if (extra && effect.write && subId && org) {
    result = await applyExtra(org, subId, e, effect, facts, at);
  } else if (effect.write && subId && org) {
    // An older event never undoes a newer one (Creem retries for 24 hours and can resend from the dashboard).
    const older = existing?.last_event_at && new Date(existing.last_event_at) > at;
    if (older) {
      result = "older_ignored";
    } else {
      const wasPaying = existing?.state === "active";
      // The plan row's units are the running extra locations (synced below), never what the plan's own items say.
      existing = await writeSub(org, subId, e, { ...effect, write: { ...effect.write, units: undefined } }, existing, at, ids);
      result = `applied:${existing?.state ?? "?"}`;
      await syncExtras(org);
      // Cancelling the base plan ends the extra locations with it (portal cancels and Creem's own ends included).
      if (existing && (effect.message === "scheduled_cancel" || effect.message === "ended" || e.eventType === "subscription.expired" || e.eventType === "subscription.paused")) {
        await endExtrasWithPlan(org).catch((x) => captureError("billing", x, { step: "end_extras", event: e.eventType }));
      }
      if (effect.paid && existing) await foundingCheck(existing, facts.family);
      if (e.eventType === "checkout.completed") {
        const requestId = typeof e.object.request_id === "string" ? e.object.request_id : null;
        if (requestId) await db.from("billing_checkouts").update({ completed_at: new Date().toISOString(), checkout_id: String(e.object.id ?? "") || null }).eq("request_id", requestId);
      }
      if (effect.message && existing) await tellOwner(effect.message, existing, e.id).catch((x) => captureError("billing", x, { step: "message", event: e.eventType }));
      // 9.9: a new paying customer and a cancellation reach the staff phone at once.
      if (existing && ((effect.paid && !wasPaying && existing.state === "active") || effect.message === "scheduled_cancel" || effect.message === "ended")) {
        const business = await businessName(org);
        const test = existing.mode === "live" ? "" : " (test mode)";
        const what = effect.paid ? `New paying customer: ${business} on ${existing.plan === "essentials" ? "Essentials" : "Pro"}`
          : effect.message === "ended" ? `${business}'s plan has ended` : `${business} cancelled; the plan ends on ${existing.current_period_end ? longDate(existing.current_period_end) : "its renewal date"}`;
        await staffAlert(`${what}${test}`, `${effect.paid ? "paid" : effect.message}:${e.id}`).catch((x) => captureError("billing", x, { step: "staff_alert" }));
      }
    }
  } else if (effect.write) {
    result = "no_business";
    await staffAlert(`Creem ${e.eventType} with no Kabsi business (${subId ?? "no subscription"})`, `nobiz:${e.id}`);
  }
  if (effect.alert) {
    const what = effect.alert === "refund" ? "a refund" : effect.alert === "dispute" ? "a chargeback" : "a trial event that should never come";
    const business = org ? await businessName(org) : "an unknown business";
    await staffAlert(`Creem reported ${what} for ${business}`, `${effect.alert}:${e.id}`);
  }
  // The partner ledger runs in a trigger on this update (Partners session): if it fails, the update fails, and the job
  // must fail too so the queue retries the event rather than lose the commission line.
  const { error: pe } = await db.from("billing_events").update({ processed_at: new Date().toISOString(), outcome: result, organization_id: org })
    .eq("id", row.id);
  if (pe) throw pe;
  log("billing", { ok: true, event: e.eventType, result });
  return result;
}

async function subRow(subscriptionId: string): Promise<SubRow | null> {
  const { data, error } = await admin().from("subscriptions").select("*").eq("provider", "creem")
    .eq("provider_subscription_id", subscriptionId).maybeSingle();
  if (error) throw error;
  return data as SubRow | null;
}

type ExtraRow = {
  id: string; organization_id: string; state: string; units: number; provider_subscription_id: string;
  current_period_end: string | null; cancel_at_period_end: boolean; ended_with_plan: boolean; last_event_at: string | null;
  past_due_at: string | null; created_at: string; cancel_requested_at: string | null;
};
async function extraRow(subscriptionId: string): Promise<ExtraRow | null> {
  const { data, error } = await admin().from("billing_extras").select("*").eq("provider_subscription_id", subscriptionId).maybeSingle();
  if (error) throw error;
  return data as ExtraRow | null;
}
async function syncExtras(org: string): Promise<number> {
  const { data, error } = await admin().rpc("billing_extras_sync", { p_org: org });
  if (error) throw error;
  return Number(data ?? 0);
}

/** One event of an Extra location subscription: its own row, then the units on the plan row. No owner message: the owner
 * asked for it on the Plan page or WhatsApp and was answered there. Returns the job's result. */
async function applyExtra(org: string, subId: string, e: CreemEvent, effect: ReturnType<typeof effectOf>, f: SubFacts, at: Date): Promise<string> {
  const db = admin();
  const w = effect.write!;
  const units = f.units > 0 ? f.units : Math.max(1, Math.round(Number(e.object.units ?? 1)) || 1);
  // The same changes as a plan row (state, period end, past due, cancel), without plan or units: one extra is one location.
  const patchOn = (row: ExtraRow | null) => {
    const patch = patchFor({ ...w, plan: undefined, period: undefined, productId: undefined, units: undefined }, f, e.eventType, row, at);
    delete patch.product_id;
    return patch;
  };
  const update = async (row: ExtraRow): Promise<string | null> => {
    // An older event never undoes a newer one.
    if (row.last_event_at && new Date(row.last_event_at) > at) return "extra_older_ignored";
    const patch = patchOn(row);
    // Resumed at Creem (the portal or the dashboard): no longer being removed.
    if (patch.cancel_at_period_end === false) patch.cancel_requested_at = null;
    const { error } = await db.from("billing_extras").update({ ...patch, units }).eq("id", row.id);
    if (error) throw error;
    return null;
  };
  const existing = await extraRow(subId);
  if (existing) {
    const older = await update(existing);
    if (older) return older;
  } else {
    const row = { organization_id: org, provider_subscription_id: subId, mode: CREEM_MODE, period: f.period, units, state: "incomplete", ...patchOn(null) };
    const { error } = await db.from("billing_extras").insert(row);
    if (error?.code === "23505") {
      // The other event of the same payment made the row a moment ago (checkout.completed and subscription.paid race): this
      // event's changes apply to the winner's row as it is now, so a checkout never moves a paid extra back to incomplete.
      const winner = await extraRow(subId);
      if (!winner) throw error;
      const older = await update(winner);
      if (older) return older;
    } else if (error) throw error;
  }
  if (e.eventType === "checkout.completed") {
    const requestId = typeof e.object.request_id === "string" ? e.object.request_id : null;
    if (requestId) await db.from("billing_checkouts").update({ completed_at: new Date().toISOString(), checkout_id: String(e.object.id ?? "") || null }).eq("request_id", requestId);
  }
  const total = await syncExtras(org);
  const after = await extraRow(subId);
  return `extra:${after?.state ?? "?"}:${total}`;
}

/** The base plan was cancelled or ended: every extra location still running is cancelled at its own period end (scheduled,
 * never at once), marked as ended with the plan so Keep my plan resumes it. A Creem refusal reaches staff. */
async function endExtrasWithPlan(org: string): Promise<number> {
  const running = await runningExtras(org);
  let n = 0;
  // Every extra still renewing is cancelled with the plan. One the owner already removed is not marked, so Keep my plan never
  // brings it back (its own cancel may still be on its way; a second scheduled cancel changes nothing at Creem).
  for (const x of running.filter((r) => !r.cancel_at_period_end && !r.ended_with_plan)) {
    if (!x.cancel_requested_at) {
      await admin().from("billing_extras").update({ ended_with_plan: true, updated_at: new Date().toISOString() }).eq("id", x.id);
    }
    try {
      await creem().cancelAtPeriodEnd(x.provider_subscription_id);
      n++;
    } catch (err) {
      // The plan's own cancel already went through; a person cancels this one by hand.
      await captureError("billing", err, { step: "end_extra" });
      await staffAlert(`Creem did not cancel the extra location ${x.provider_subscription_id} after its plan was cancelled. Cancel it in the Creem dashboard`, `extra_end:${x.id}`)
        .catch((y) => captureError("billing", y, { step: "end_extra_alert" }));
    }
  }
  return n;
}
async function runningExtras(org: string): Promise<ExtraRow[]> {
  const { data, error } = await admin().from("billing_extras").select("*").eq("organization_id", org)
    .in("state", ["active", "past_due"]).order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ExtraRow[];
}

async function writeSub(org: string, subId: string, e: CreemEvent, effect: ReturnType<typeof effectOf>, existing: SubRow | null, at: Date, ids: ProductIds): Promise<SubRow | null> {
  const w = effect.write!;
  const f = subFacts(subscriptionOf(e), ids);
  const db = admin();
  const update = async (row: SubRow) => {
    const { data, error } = await db.from("subscriptions").update(patchFor(w, f, e.eventType, row, at)).eq("id", row.id).select("*").single();
    if (error) throw error;
    return data as SubRow;
  };
  if (existing) return await update(existing);
  const patch = patchFor(w, f, e.eventType, null, at);
  const { data, error } = await db.from("subscriptions").insert({
    organization_id: org, provider: "creem", provider_subscription_id: subId, mode: CREEM_MODE,
    plan: (patch.plan as string) ?? "pro", state: (patch.state as string) ?? "incomplete", ...patch,
  }).select("*").single();
  if (error?.code === "23505") {
    // The other event of the same payment made the row a moment ago: this event's changes still apply, to that row.
    const winner = await subRow(subId);
    if (!winner) throw error;
    return await update(winner);
  }
  if (error) throw error;
  return data as SubRow;
}

// The first 30 paying businesses keep their price while subscribed (10.2.4, Price 1). The place is taken at checkout, under
// a database lock (billing_checkout_family), so a payment on a founding product marks its subscription founding. A Founding
// 25 business (30.17) that chooses a plan keeps the founding price too, in either mode.
async function foundingCheck(s: SubRow, family: PriceFamily | null) {
  if (s.founding) return;
  let founding = family === "founding";
  if (!founding) {
    const { data: f25 } = await admin().from("founding_applications").select("id").eq("organization_id", s.organization_id)
      .eq("status", "accepted").limit(1);
    founding = (f25 ?? []).length > 0;
  }
  if (founding) await admin().from("subscriptions").update({ founding: true }).eq("id", s.id);
}
/** The price family a running subscription is on: its product's family, else its founding flag. Changes stay in it. */
export function familyOfSub(s: Pick<SubRow, "founding" | "product_id">, ids: ProductIds): PriceFamily {
  return familyOfKey(keyOfProduct(ids, s.product_id ?? null)) ?? (s.founding ? "founding" : "list");
}

// ─── messages to the owner (WhatsApp and email) and to staff (WhatsApp, R-64) ──────────────────────────────────────
type Contact = { user_id: string; phone: string | null; location_id: string; business: string };
async function contacts(org: string): Promise<Contact[]> {
  const { data, error } = await admin().rpc("billing_owner_contacts", { p_org: org });
  if (error) throw error;
  return (data ?? []) as Contact[];
}
async function businessName(org: string): Promise<string> {
  const c = await contacts(org).catch(() => []);
  return c[0]?.business ?? "a business";
}
export const longDate = (d: Date | string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(d));
const addDays = (d: Date | string, n: number) => new Date(new Date(d).getTime() + n * 86_400_000);

export type Line = { whatsapp: string; buttons?: { id: string; title: string }[]; email?: EmailContent };
const para = (t: string) => `<p style="margin:0 0 16px 0;">${esc(t)}</p>`;
function emailOf(subject: string, title: string, lines: string[], button?: { label: string; url: string }): EmailContent {
  return { subject, title, preheader: lines[0], bodyHtml: lines.map(para).join(""), text: lines.join("\n\n") + (button ? `\n\n${button.label}: ${button.url}` : ""), button };
}

/** The words of each billing message (10.2.9). Pure, so tests read them. */
export function billingLine(m: Message | "payment_reminder", c: { business: string; periodEnd?: string | null; graceEnds?: Date; portal?: string | null; dataUntil?: Date }): Line {
  const end = c.periodEnd ? longDate(c.periodEnd) : null;
  switch (m) {
    case "scheduled_cancel": {
      const lines = [`Your Kabsi plan for ${c.business} ends on ${end ?? "the last day you paid for"}.`, "Until then everything keeps working. Changed your mind? Tap Keep my plan."];
      // Email 1: the cancellation email of 30.15 section 6 (COPY.md 25).
      return { whatsapp: lines.join(" "), buttons: [{ id: "k:keep", title: "Keep my plan" }], email: planCancelled({ business: c.business, ends: c.periodEnd ?? null, dataDays: DATA_DAYS }, APP_URL) };
    }
    case "payment_failed":
    case "payment_reminder": {
      const until = c.graceEnds ? longDate(c.graceEnds) : null;
      const lines = [`${c.business}: your card did not go through. Update it here: ${c.portal ?? `${APP_URL}/app/plan`}`, `Kabsi keeps working until ${until ?? "the grace period ends"}.`];
      // Email 1: the failed-payment email of 30.15 section 6 (COPY.md 25).
      const email = paymentFailed({ business: c.business, graceEnds: c.graceEnds ?? null, portal: c.portal ?? `${APP_URL}/app/plan`, reminder: m === "payment_reminder" });
      return { whatsapp: (m === "payment_reminder" ? "Reminder. " : "") + lines.join("\n"), email };
    }
    case "paused": {
      const until = c.dataUntil ? longDate(c.dataUntil) : null;
      const lines = [`Your Kabsi plan for ${c.business} is paused. Approvals have stopped and nothing is lost.`, `Your data is kept until ${until}. Reply plan to start again.`];
      return { whatsapp: lines.join(" "), email: emailOf(`${c.business}: your Kabsi plan is paused`, "Your plan is paused", [lines[0], `Your data is kept until ${until}.`], { label: "Choose your plan", url: `${APP_URL}/app/plan` }) };
    }
    case "ended": {
      const until = c.dataUntil ? longDate(c.dataUntil) : null;
      const lines = [`Your Kabsi plan for ${c.business} has ended. Thank you for trusting Kabsi with your Google profile.`, `Your data is kept until ${until}, then deleted. Reply plan any time to come back.`];
      return { whatsapp: lines.join(" "), email: emailOf(`${c.business}: your Kabsi plan has ended`, "Your plan has ended", lines, { label: "Choose your plan", url: `${APP_URL}/app/plan` }) };
    }
    case "resumed": {
      const lines = [`Your Kabsi plan for ${c.business} carries on.${end ? ` The next payment is on ${end}.` : ""}`];
      return { whatsapp: lines[0] };
    }
  }
}

async function tellOwner(m: Message | "payment_reminder", s: SubRow, key: string) {
  const people = await contacts(s.organization_id);
  if (!people.length) return;
  const business = people[0].business;
  const portal = m === "payment_failed" || m === "payment_reminder" ? await portalFor(s).catch(() => null) : null;
  const line = billingLine(m, {
    business, periodEnd: s.current_period_end, portal,
    graceEnds: s.past_due_at ? addDays(s.past_due_at, GRACE_DAYS) : undefined,
    dataUntil: addDays(s.ended_at ?? new Date(), DATA_DAYS),
  });
  for (const p of people) {
    if (p.phone) {
      // 13b part 2: outside the 24-hour window the billing_notice utility template goes first; the full line follows the reply.
      await outDb.add({ phone: p.phone, userId: p.user_id, locationId: p.location_id, kind: `billing_${m}`, body: line.whatsapp,
        buttons: line.buttons, urgent: m === "payment_failed", dedupe: `billing:${m}:${key}:${p.user_id}`,
        template: ref("billing_notice", { business }) });
    }
  }
  if (line.email) {
    await notifyEmail({ category: "billing", kind: `billing_${m}`, key: `billing:${m}:${key}`, locationId: people[0].location_id, to: "owners", content: line.email });
  }
  if (m === "payment_failed") {
    // Reminders on day 3 and day 6 of the 7-day grace; each checks the payment is still failing before it goes.
    const start = s.past_due_at ? new Date(s.past_due_at) : new Date();
    for (const day of [3, 6]) {
      await admin().rpc("enqueue_job", { p_kind: "billing_reminder", p_location: null, p_dedupe_key: `billing_reminder:${s.id}:${start.toISOString().slice(0, 10)}:${day}`,
        p_payload: { subscription_id: s.id, day }, p_run_at: addDays(start, day).toISOString() });
    }
  }
}

/** The day 3 and day 6 reminder of a failed payment (a job). Sent only while the payment is still failing. */
export async function paymentReminder(subscriptionRowId: string, day: number): Promise<string> {
  const { data } = await admin().from("subscriptions").select("*").eq("id", subscriptionRowId).maybeSingle();
  const s = data as SubRow | null;
  if (!s || s.state !== "past_due") return "not_due";
  await tellOwner("payment_reminder", s, `${s.id}:${s.past_due_at ?? ""}:d${day}`);
  return "sent";
}

export async function staffAlert(summary: string, key: string) {
  const { data } = await admin().from("phone_roles").select("phone").eq("role", "staff_admin").is("revoked_at", null);
  for (const r of (data ?? []) as { phone: string }[]) {
    await outDb.add({ phone: r.phone, userId: null, locationId: null, kind: "staff_alert", urgent: true, body: `${summary}.`,
      template: ref("staff_alert", { summary }), dedupe: `billing_staff:${key}:${r.phone}` });
  }
  await jobLog("billing_alert", false, { summary });
}

// ─── the owner's actions ────────────────────────────────────────────────────────────────────────────────────────────
/** The owner's Creem subscription that still runs (active, past due or paused), newest first. */
export async function currentSub(org: string): Promise<SubRow | null> {
  const { data, error } = await admin().from("subscriptions").select("*").eq("organization_id", org).eq("provider", "creem")
    .in("state", ["active", "past_due", "paused"]).order("updated_at", { ascending: false }).limit(1);
  if (error) throw error;
  return ((data ?? [])[0] as SubRow | undefined) ?? null;
}
async function lastCustomer(org: string): Promise<string | null> {
  const { data } = await admin().from("subscriptions").select("provider_customer_id").eq("organization_id", org).eq("provider", "creem")
    .not("provider_customer_id", "is", null).order("updated_at", { ascending: false }).limit(1);
  return ((data ?? [])[0]?.provider_customer_id as string | undefined) ?? null;
}
async function portalFor(s: { organization_id: string; provider_customer_id: string | null }): Promise<string> {
  const customer = s.provider_customer_id ?? await lastCustomer(s.organization_id);
  if (!customer) throw new BillingError("no_customer", "There is no payment on record yet.");
  return (await creem().portalLink(customer)).customer_portal_link;
}

/** May this business buy now: plans open (10.2.13), or a Kabsi test account. */
export async function checkoutOpen(org: string): Promise<boolean> {
  const [{ data: open }, { data: o }] = await Promise.all([
    admin().from("app_settings").select("value").eq("key", "billing_open").maybeSingle(),
    admin().from("organizations").select("billing_test, is_demo").eq("id", org).maybeSingle(),
  ]);
  if (o?.is_demo) return false;
  return open?.value === "on" || !!o?.billing_test;
}

export async function startCheckout(org: string, userId: string | null, email: string | null, plan: Plan, period: Period, now = new Date()): Promise<string> {
  if (!(await checkoutOpen(org))) throw new BillingError("plans_closed", "Plans open soon.");
  const running = await currentSub(org);
  if (running && running.state !== "paused") throw new BillingError("already_paid", "This business already has a plan.");
  const ids = await productIds();
  if (!ids[planKey(plan, period, "founding")] || !ids[planKey(plan, period, "list")]) throw new BillingError("not_configured", "Payments are not set up yet.");
  // Price 1: the request id names the plan, not the price, so a repeated tap keeps the price the owner was shown.
  const requestId = checkoutRequestId(org, `${plan}_${period}`, 1, now);
  const db = admin();
  // Under one database lock: a checkout already started keeps its price; Founding 25 gets the founding price; otherwise the
  // founding price while places are left (an open founding checkout holds its place for 24 hours), then the list price.
  const { data: f, error: fe } = await db.rpc("billing_checkout_family", { p_org: org, p_request_id: requestId, p_mode: CREEM_MODE,
    p_plan: plan, p_period: period, p_user: userId });
  if (fe) throw fe;
  const picked = f as { family: PriceFamily; checkout_url: string | null; completed: boolean };
  if (picked.checkout_url && !picked.completed) return picked.checkout_url;
  const key = planKey(plan, period, picked.family);
  const productId = ids[key]!;
  const location = (await contacts(org))[0]?.location_id ?? "";
  const c = await creem().createCheckout({ productId, units: 1, requestId, successUrl: SUCCESS_URL, email,
    metadata: { referenceId: org, business_id: location, price_family: picked.family } });
  const { error: ue } = await db.from("billing_checkouts").update({ product_key: key, checkout_id: c.id, checkout_url: c.checkout_url })
    .eq("request_id", requestId);
  if (ue) throw ue;
  // 20.1: checkout_started, once per checkout request. An analytics problem never stops the checkout.
  await db.rpc("record_product_event", { p_event: "checkout_started", p_user: userId, p_location: location || null,
    p_props: { plan, period }, p_key: `checkout:${requestId}` }).then(() => {}, () => {});
  return c.checkout_url;
}

export async function portal(org: string): Promise<string> {
  return await portalFor({ organization_id: org, provider_customer_id: null });
}

async function mustRun(org: string): Promise<SubRow> {
  const s = await currentSub(org);
  if (!s?.provider_subscription_id) throw new BillingError("no_plan", "There is no paid plan to change.");
  return s;
}

/** "cancel": at the end of the paid period, never at once (10.2.10). Returns the end date. */
export async function cancelAtEnd(org: string): Promise<string | null> {
  const s = await mustRun(org);
  await creem().cancelAtPeriodEnd(s.provider_subscription_id!);
  // Billing 2: the extra locations end with the plan. The plan's own cancel already went through, so a problem here goes to
  // staff and Sentry, never back to the owner as a failed cancel.
  await endExtrasWithPlan(org).catch((x) => captureError("billing", x, { step: "end_extras_owner" }));
  return s.current_period_end;
}
/** "Keep my plan": undoes a scheduled cancel. */
export async function keepPlan(org: string): Promise<string | null> {
  const s = await mustRun(org);
  const c = creem();
  await c.resume(s.provider_subscription_id!);
  // Billing 2: the extra locations that were ending only because the plan was carry on with it.
  // Whether or not each extra's own scheduled_cancel event has arrived yet.
  for (const x of (await runningExtras(org)).filter((r) => r.ended_with_plan && !r.cancel_requested_at)) {
    try {
      await c.resume(x.provider_subscription_id);
      await admin().from("billing_extras").update({ ended_with_plan: false, updated_at: new Date().toISOString() }).eq("id", x.id);
    } catch (err) {
      // The plan itself carries on; a person resumes this extra by hand.
      await captureError("billing", err, { step: "resume_extra" });
      await staffAlert(`Creem did not resume the extra location ${x.provider_subscription_id} after Keep my plan. Resume it in the Creem dashboard`, `extra_resume:${x.id}`)
        .catch((y) => captureError("billing", y, { step: "resume_extra_alert" }));
    }
  }
  return s.current_period_end;
}

/** The price of a change, in dollars, for the Confirm line. */
export function priceOf(key: ProductKey): number {
  return CATALOGUE[key].price / 100;
}

/** "upgrade" charges the difference now; "downgrade" takes effect at renewal (10.2.10). */
export async function changePlan(org: string, to: Plan): Promise<{ effective: "now" | "renewal"; until: string | null }> {
  const s = await mustRun(org);
  if (s.plan === to) throw new BillingError("same_plan", `You are already on ${to === "pro" ? "Pro" : "Essentials"}.`);
  const period = (s.period === "year" ? "year" : "month") as Period;
  const ids = await productIds();
  // Price 1: an upgrade or downgrade stays in the price family the business is on.
  const productId = ids[planKey(to, period, familyOfSub(s, ids))];
  if (!productId) throw new BillingError("not_configured", "Payments are not set up yet.");
  if (to === "pro") {
    await creem().upgrade(s.provider_subscription_id!, productId, "proration-charge-immediately");
    await admin().from("subscriptions").update({ kept_plan: null, kept_plan_until: null }).eq("id", s.id);
    return { effective: "now", until: null };
  }
  // Creem bills the new price from the next renewal (no proration); Kabsi keeps Pro until then.
  await creem().upgrade(s.provider_subscription_id!, productId, "proration-none");
  await admin().from("subscriptions").update({ kept_plan: "pro", kept_plan_until: s.current_period_end }).eq("id", s.id);
  return { effective: "renewal", until: s.current_period_end };
}

/**
 * "add a location" (10.2.10, Billing 2): Creem cannot add the Extra location item to the plan's subscription
 * (subscription_item_add_unsupported), so each extra location is a second checkout for the Extra location product, on the
 * owner's own Creem customer, in the plan's period. The owner pays on Creem's page; the webhook adds the location when the
 * payment goes through. A repeated tap the same day returns the same link. Returns the checkout link.
 */
export async function addLocation(org: string, userId: string | null, now = new Date()): Promise<string> {
  const s = await mustRun(org);
  if (s.cancel_at_period_end) throw new BillingError("plan_ends", "Your plan is set to end. Tap Keep my plan first, then add a location.");
  const period = (s.period === "year" ? "year" : "month") as Period;
  const key = extraKey(period);
  const productId = (await productIds())[key];
  if (!productId) throw new BillingError("not_configured", "Payments are not set up yet.");
  const customer = s.provider_customer_id ?? await lastCustomer(org);
  if (!customer) throw new BillingError("no_customer", "There is no payment on record yet.");
  // Every extra ever made counts, so an extra that ended today never gives a new tap an old, completed request id.
  const { count } = await admin().from("billing_extras").select("id", { count: "exact", head: true }).eq("organization_id", org);
  const n = (count ?? 0) + 1;
  const requestId = checkoutRequestId(org, key, n, now);
  const db = admin();
  const { data: prior } = await db.from("billing_checkouts").select("checkout_url, completed_at").eq("request_id", requestId).maybeSingle();
  if (prior?.checkout_url && !prior.completed_at) return prior.checkout_url as string;
  if (prior?.completed_at) throw new BillingError("adding", "Kabsi is adding that location now. Check your plan again in a minute.");
  const location = (await contacts(org))[0]?.location_id ?? "";
  const c = await creem().createCheckout({ productId, units: 1, requestId, successUrl: SUCCESS_URL, customerId: customer,
    metadata: { referenceId: org, business_id: location, kind: "extra_location", plan_subscription: s.provider_subscription_id ?? "" } });
  await db.from("billing_checkouts").upsert({ request_id: requestId, organization_id: org, product_key: key, units: 1, mode: CREEM_MODE,
    checkout_id: c.id, checkout_url: c.checkout_url, created_by: userId }, { onConflict: "request_id" });
  return c.checkout_url;
}

/** "Remove a location" (Billing 2): the newest extra location is cancelled at the end of its paid period (scheduled, never at
 * once). Then that business's Kabsi work stops; nothing on Google changes. Returns the date it ends. */
export async function removeLocation(org: string): Promise<string | null> {
  await mustRun(org);
  const x = (await runningExtras(org)).filter((r) => !r.cancel_at_period_end && !r.cancel_requested_at && !r.ended_with_plan).pop();
  if (!x) throw new BillingError("no_extra", "Your plan has no extra location to remove.");
  // Kept so a second tap picks the next extra, not this one again; the paid state still changes only with Creem's event.
  await admin().from("billing_extras").update({ cancel_requested_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", x.id);
  try {
    await creem().cancelAtPeriodEnd(x.provider_subscription_id);
  } catch (err) {
    // A clear refusal (4xx): the extra is not being removed. A timeout or a 5xx may have gone through, so the flag stays and
    // the extra's own event decides.
    if (isCreemError(err) && err.status >= 400 && err.status < 500) {
      await admin().from("billing_extras").update({ cancel_requested_at: null, updated_at: new Date().toISOString() }).eq("id", x.id);
    }
    throw err;
  }
  return x.current_period_end;
}

// ─── staff: set up the products in this mode (10.2.3) ──────────────────────────────────────────────────────────────
export async function setupProducts() {
  const c = creem();
  const existing = await c.listProducts();
  const plan = setupPlan(existing);
  const ids: ProductIds = {};
  for (const r of plan.reuse) {
    ids[r.key] = r.id;
    if (r.rename) await c.renameProduct(r.id, r.key);
  }
  for (const key of plan.create) ids[key] = (await c.createProduct(key, SUCCESS_URL)).id;
  const missing = PRODUCT_KEYS.filter((k) => !ids[k]);
  if (!missing.length) {
    const { error } = await admin().from("app_settings").upsert({ key: SETTINGS_KEY(CREEM_MODE), value: JSON.stringify(ids), updated_at: new Date().toISOString() }, { onConflict: "key" });
    if (error) throw error;
  }
  return { mode: CREEM_MODE, reused: plan.reuse.map((r) => ({ key: r.key, id: r.id, renamed: r.rename })), created: plan.create, unmatched: plan.unmatched, missing };
}

export const isCreemError = (e: unknown): e is CreemError => e instanceof CreemError;
