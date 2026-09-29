// billing: crypto payments through NOWPayments (Q06, D269). One function, two routes.
//   POST /billing/invoice       signed-in owner. Body { location_id, item, pay_currency }. Returns { invoice_url }.
//   POST /billing/nowpayments   NOWPayments' IPN webhook. Signature-checked, idempotent.
// NOWPayments sends no Supabase JWT, so this function needs verify_jwt = false in supabase/config.toml (D295); the
// invoice route checks the user's token itself with currentUser(). Secrets NOWPAYMENTS_API_KEY and
// NOWPAYMENTS_IPN_SECRET are read only in _shared/nowpayments.ts and here, and are never logged: only ids, status
// and outcome are logged.
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { admin, APP_URL, captureError, CORS, currentUser, fail, json, log, rateLimit } from "../_shared/kabsi.ts";
import { createInvoice, getPayment, verifyIpn } from "../_shared/nowpayments.ts";
import { sendPaymentReceived } from "../_shared/payments.ts";

const PUBLISHABLE = "sb_publishable_eF-s_uWvQzj1MngyU1to6Q_aJNQZh2R";
const FRIENDLY: Record<string, string> = {
  forbidden: "You don't have access to this business.",
  plan_through_partner: "Your plan comes through your Kabsi partner, so there's nothing to pay here.",
  bad_plan: "Choose one of the plans shown.",
  bad_currency: "Choose USDT on TRON or USDT on BNB Chain.",
  not_available: "Paying with USDT here isn't available yet. Use one of the other ways to pay.",
  too_many_invoices: "You already have open payment links. Finish one, or try again in an hour.",
};
const PLAN_NAME: Record<string, string> = { pro_monthly: "Kabsi Pro, monthly", pro_yearly: "Kabsi Pro, yearly", lebanon_yearly: "Kabsi Lebanon bundle, 12 months" };

// Runs RPCs as the caller, so auth.uid() and every membership check apply exactly as in the browser.
function asUser(req: Request) {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY") ?? PUBLISHABLE, {
    global: { headers: { authorization: req.headers.get("authorization") ?? "" } },
    auth: { persistSession: false },
  });
}

async function invoiceRoute(req: Request) {
  const user = await currentUser(req);
  if (!user) return fail("not_signed_in", "Please log in.", 401);
  const b = await req.json().catch(() => ({})) as { location_id?: string; item?: string; pay_currency?: string; test?: boolean };
  if (!b.location_id || !b.item || !b.pay_currency) return fail("bad_input", "Choose a plan and a network.");
  if (!(await rateLimit(`billing_inv:${user.id}`, 6, 3600, { failClosed: true })) ||
      !(await rateLimit(`billing_inv_loc:${b.location_id}`, 10, 3600, { failClosed: true }))) {
    return fail("rate_limited", "That's enough payment links for now. Try again in an hour.", 429);
  }
  const { data, error } = await asUser(req).rpc("billing_prepare_invoice", {
    p_location: b.location_id, p_item: b.item, p_pay_currency: b.pay_currency, p_test: b.test === true,
  });
  if (error) {
    const code = (error.message ?? "").trim();
    return fail(code in FRIENDLY ? code : "error", FRIENDLY[code] ?? "Something went wrong. Please try again.", code === "forbidden" ? 403 : 400);
  }
  const row = (data as { id: string; order_id: string; amount_usd: number; invoice_url: string | null; reused: boolean }[] | null)?.[0];
  if (!row) return fail("error", "Something went wrong. Please try again.", 500);
  if (row.reused && row.invoice_url) return json({ ok: true, invoice_id: row.id, invoice_url: row.invoice_url });

  try {
    const inv = await createInvoice({
      priceAmount: Number(row.amount_usd), payCurrency: b.pay_currency, orderId: row.order_id,
      description: PLAN_NAME[b.item] ?? "Kabsi Pro", // no business name: it is not needed there
      ipnUrl: `${Deno.env.get("SUPABASE_URL")}/functions/v1/billing/nowpayments`,
      successUrl: `${APP_URL}/app/plan?paid=${row.id}`, cancelUrl: `${APP_URL}/app/plan?cancelled=1`,
    });
    if (!new URL(inv.invoiceUrl).hostname.endsWith("nowpayments.io")) throw new Error("unexpected invoice host");
    await admin().rpc("billing_attach_invoice", { p_id: row.id, p_provider_invoice_id: inv.id, p_url: inv.invoiceUrl });
    log("billing", { ok: true, route: "invoice", location_id: b.location_id, item: b.item });
    return json({ ok: true, invoice_id: row.id, invoice_url: inv.invoiceUrl });
  } catch (e) {
    await admin().rpc("billing_mark_create_failed", { p_id: row.id });
    await captureError("billing", e, { route: "invoice", invoice: row.id });
    return fail("provider_error", "We couldn't create the payment link. Please try again in a minute.", 502);
  }
}

const hourBucket = () => Math.floor(Date.now() / 3_600_000);

async function ipnRoute(req: Request) {
  const raw = await req.text();
  if (raw.length > 32_768) return new Response("too large", { status: 413 });
  const secret = Deno.env.get("NOWPAYMENTS_IPN_SECRET");
  if (!secret) return new Response("not configured", { status: 503 });
  if (!(await verifyIpn(raw, req.headers.get("x-nowpayments-sig"), secret))) {
    log("billing", { ok: false, route: "ipn", reason: "bad_sig" });
    await admin().rpc("ops_emit", {
      p_kind: "billing_alert", p_channel: "alerts", p_title: ":warning: A payment webhook failed its signature check",
      p_body: "Someone called the NOWPayments webhook with a bad signature, or the IPN secret differs from NOWPayments' setting.",
      p_dedupe: `np_badsig:${hourBucket()}`,
    });
    return new Response("bad signature", { status: 401 });
  }
  let ev: Record<string, unknown>;
  try {
    ev = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return new Response("bad json", { status: 400 });
  }
  const s = (v: unknown) => (v == null ? "" : String(v));
  const n = (v: unknown) => (v == null || v === "" ? null : Number(v));
  const paymentId = s(ev.payment_id), invoiceId = s(ev.invoice_id), orderId = s(ev.order_id), status = s(ev.payment_status);
  if (!paymentId || !status) return new Response("missing fields", { status: 400 });

  try {
    // A `finished` notice is checked again with NOWPayments directly, so a leaked IPN secret alone cannot grant a plan.
    let verified = true;
    if (status === "finished") {
      const p = await getPayment(paymentId);
      verified = p.status === "finished" && p.invoiceId === invoiceId;
    }
    const { data: outcome, error } = await admin().rpc("billing_apply_ipn", {
      p_payment_id: paymentId, p_invoice_id: invoiceId, p_order_id: orderId, p_status: status,
      p_price_amount: n(ev.price_amount), p_price_currency: s(ev.price_currency), p_pay_currency: s(ev.pay_currency),
      p_actually_paid: n(ev.actually_paid), p_verified: verified,
    });
    if (error) throw error;
    log("billing", { ok: true, route: "ipn", status, outcome: String(outcome) });
    if (outcome === "applied") {
      const { data: inv } = await admin().from("billing_invoices").select("location_id, item, amount_usd").eq("provider_invoice_id", invoiceId).single();
      if (inv) {
        await sendPaymentReceived({ locationId: inv.location_id, item: inv.item, amountUsd: Number(inv.amount_usd), dedupeBase: `payment_received:np:${paymentId}` })
          .catch((e) => captureError("billing", e, { route: "email", payment: paymentId }));
      }
    }
    // An unknown invoice may just be early (the row is committed before the API call, but stay safe): let NOWPayments retry.
    if (outcome === "unknown_invoice") return new Response("retry", { status: 500 });
    return json({ ok: true, outcome });
  } catch (e) {
    await captureError("billing", e, { route: "ipn", status, payment: paymentId });
    return new Response("error", { status: 500 });
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return fail("method_not_allowed", "Use POST.", 405);
  const route = new URL(req.url).pathname.split("/").filter(Boolean).pop();
  try {
    if (route === "invoice") return await invoiceRoute(req);
    if (route === "nowpayments") return await ipnRoute(req);
    return fail("not_found", "Unknown route.", 404);
  } catch (e) {
    await captureError("billing", e, { route: route ?? "" });
    return fail("internal", "Something went wrong. Please try again.", 500);
  }
});
