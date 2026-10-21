// partner: Phase 9 (D239). All rules live in membership-checked RPCs (migration 20260926050830); this function
// only calls them as the signed-in user and sends the emails around them.
//   POST /partner/invite   partner member  { partner_id, email, name? }        → invite row + email to the business
//   POST /partner/claim    partner member  { invoice_id, network, tx_ref }     → USDT claim + alert to hello@kabsi.co
//   POST /partner/plan-claim owner         { location_id, item, network, tx_ref } → owner Pro paid in USDT (kind 'plan')
//   POST /partner/decide   staff           { claim_id, confirm, note? }        → invoice paid / plan started + "payment received" email
//   POST /partner/billing  internal (x-cron-secret, pg_cron daily 06:10 UTC)  → last month's invoices + emails
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { PLAN_LABEL } from "../_shared/plans.ts";
import { admin, APP_URL, captureError, CORS, fail, isInternal, jobLog, json, log } from "../_shared/kabsi.ts";
import { notify } from "../_shared/notify.ts";
import * as copy from "../_shared/email/copy.ts";

const FN = "partner";
const TRC20 = "TMbdkH9hY14RGgz9N99DCXu3LXGDZBDqMe";
const BINANCE_PAY_ID = "User-2ad9b";
const PUBLISHABLE = "sb_publishable_eF-s_uWvQzj1MngyU1to6Q_aJNQZh2R";
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$/;

const FRIENDLY: Record<string, string> = {
  forbidden: "You don't have access to this.",
  partner_not_active: "Your partner account isn't active. Write to hello@kabsi.co.",
  too_many_invites: "You've sent 30 invites today. Try again tomorrow.",
  invoice_not_unpaid: "This invoice is already paid or closed.",
  claim_pending: "A payment for this invoice is already waiting for confirmation.",
  tx_already_used: "This transaction ID was already submitted.",
  bad_network: "Choose TRC20 or Binance Pay.",
  already_decided: "This payment was already confirmed or rejected.",
  unknown_claim: "Payment not found.",
  plan_through_partner: "Your plan comes through your Kabsi partner, so there's nothing to pay here.",
  bad_plan: "Choose one of the plans shown.",
};

// Runs RPCs as the caller, so auth.uid() and every membership check apply exactly as in the browser.
function asUser(req: Request) {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY") ?? PUBLISHABLE, {
    global: { headers: { authorization: req.headers.get("authorization") ?? "" } },
    auth: { persistSession: false },
  });
}
function rpcFail(error: { message?: string; code?: string }) {
  const code = (error.message ?? "").trim();
  if (code.includes("violates check constraint") && code.includes("tx_ref")) {
    return fail("bad_tx", "That doesn't look like a transaction ID. Copy it from your wallet or Binance.");
  }
  if (code.includes("violates check constraint")) return fail("bad_input", "Please check the details and try again.");
  return fail(code in FRIENDLY ? code : "error", FRIENDLY[code] ?? "Something went wrong. Please try again.", code === "forbidden" ? 403 : 400);
}
const money = (n: number | string) => `$${Number(n).toFixed(2)}`;
const monthLabel = (d: string) => new Date(`${d.slice(0, 10)}T00:00:00Z`).toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

async function recipients(partnerId: string): Promise<{ email: string; userId: null }[]> {
  const { data, error } = await admin().rpc("partner_recipients", { p_partner: partnerId });
  if (error) throw error;
  return ((data ?? []) as string[]).filter(Boolean).map((email) => ({ email, userId: null }));
}

// ── invite a business
async function invite(req: Request) {
  const b = await req.json().catch(() => ({})) as { partner_id?: string; email?: string; name?: string };
  const email = (b.email ?? "").trim().toLowerCase();
  if (!b.partner_id || !EMAIL_RE.test(email)) return fail("bad_input", "Enter the business owner's email.");
  const { data: inviteId, error } = await asUser(req).rpc("partner_create_invite", {
    p_partner: b.partner_id, p_email: email, p_name: b.name?.trim() || null,
  });
  if (error) return rpcFail(error);

  const { data: partner } = await admin().from("partners").select("name, handle").eq("id", b.partner_id).single();
  const link = `${APP_URL}/start?p=${encodeURIComponent(partner!.handle)}&i=${inviteId}`;
  // Sent because the partner just invited this person: no choices and no quiet hours (category direct).
  const sent = await notify({
    category: "direct", kind: "partner_invite", key: `partner_invite:${inviteId}`, partnerId: b.partner_id, to: [{ email, userId: null }],
    content: copy.partnerInvite(partner!.name, b.name?.trim() || null, link),
  }).catch(async (e) => { await captureError(FN, e, { route: "invite" }); return null; });
  const emailed = !!sent && sent.sent > 0;
  log(FN, { ok: true, route: "invite", emailed });
  return json({ ok: true, invite_id: inviteId, link, emailed });
}

// ── partner says they paid an invoice
async function claim(req: Request) {
  const b = await req.json().catch(() => ({})) as { invoice_id?: string; network?: string; tx_ref?: string };
  const tx = (b.tx_ref ?? "").trim();
  if (!b.invoice_id || !tx) return fail("bad_input", "Paste the transaction ID.");
  const { data: claimId, error } = await asUser(req).rpc("partner_submit_claim", {
    p_invoice: b.invoice_id, p_network: b.network, p_tx_ref: tx,
  });
  if (error) return rpcFail(error);

  const { data: inv } = await admin().from("partner_invoices").select("month, amount_usd, partners(name)").eq("id", b.invoice_id).single();
  const partnerName = (inv?.partners as unknown as { name: string } | null)?.name ?? "A partner";
  const net = b.network === "trc20" ? "USDT TRC20" : "Binance Pay";
  await notify({
    category: "internal", kind: "usdt_claim_alert", key: `usdt_claim:${claimId}`, to: [{ email: "hello@kabsi.co", userId: null }],
    content: copy.usdtClaim({
      who: partnerName, whoLine: `the ${monthLabel(inv!.month)} invoice`, reference: String(claimId), net, tx, tronscan: b.network === "trc20",
      startsPlan: false, amount: Number(inv!.amount_usd),
    }, APP_URL),
  }).catch((e) => captureError(FN, e, { route: "claim" }));
  log(FN, { ok: true, route: "claim" });
  return json({ ok: true, claim_id: claimId });
}

// ── owner says they paid Kabsi Pro in USDT
async function planClaim(req: Request) {
  const b = await req.json().catch(() => ({})) as { location_id?: string; item?: string; network?: string; tx_ref?: string };
  const tx = (b.tx_ref ?? "").trim();
  if (!b.location_id || !b.item || !tx) return fail("bad_input", "Paste the transaction ID.");
  const { data: claimId, error } = await asUser(req).rpc("owner_submit_claim", {
    p_location: b.location_id, p_item: b.item, p_network: b.network, p_tx_ref: tx,
  });
  if (error) return rpcFail(error);
  const { data: loc } = await admin().from("locations").select("name").eq("id", b.location_id).single();
  const { data: c } = await admin().from("usdt_claims").select("amount_usd").eq("id", claimId).single();
  const net = b.network === "trc20" ? "USDT TRC20" : "Binance Pay";
  await notify({
    category: "internal", kind: "usdt_claim_alert", key: `usdt_claim:${claimId}`, locationId: b.location_id, to: [{ email: "hello@kabsi.co", userId: null }],
    content: copy.usdtClaim({
      who: loc?.name ?? "A business", whoLine: `for ${PLAN_LABEL[b.item] ?? b.item}`, reference: String(claimId), net, tx, tronscan: b.network === "trc20",
      startsPlan: true, amount: Number(c?.amount_usd ?? 0),
    }, APP_URL),
  }).catch((e) => captureError(FN, e, { route: "plan-claim" }));
  log(FN, { ok: true, route: "plan-claim", location_id: b.location_id });
  return json({ ok: true, claim_id: claimId });
}

// ── staff confirm or reject a claim
async function decide(req: Request) {
  const b = await req.json().catch(() => ({})) as { claim_id?: string; confirm?: boolean; note?: string };
  if (!b.claim_id || typeof b.confirm !== "boolean") return fail("bad_input", "Missing claim or decision.");
  const { data: status, error } = await asUser(req).rpc("staff_decide_claim", {
    p_claim: b.claim_id, p_confirm: b.confirm, p_note: b.note?.trim() || null,
  });
  if (error) return rpcFail(error);

  if (status === "confirmed") {
    const { data: c } = await admin().from("usdt_claims")
      .select("kind, partner_id, location_id, item, amount_usd, partner_invoices(month)").eq("id", b.claim_id).single();
    if (c?.kind === "plan" && c.location_id) {
      const { data: plan } = await admin().from("plans").select("starts_at, ends_at")
        .eq("location_id", c.location_id).eq("status", "active").order("ends_at", { ascending: false }).limit(1).maybeSingle();
      const until = plan?.ends_at ? new Date(plan.ends_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : null;
      const { data: bizRow } = await admin().from("locations").select("name").eq("id", c.location_id).maybeSingle();
      const bizName = (bizRow?.name as string | undefined) ?? "Your business";
      const line = `We received your payment of ${money(c.amount_usd ?? 0)} for ${PLAN_LABEL[c.item ?? ""] ?? "Kabsi Pro"}.${until ? ` Your plan runs until ${until}.` : " Your plan starts as soon as Kabsi's access to your Google profile is working."} Thank you.`;
      await notify({
        category: "billing", kind: "payment_received", key: `payment_received:${b.claim_id}`, locationId: c.location_id, to: "owners",
        inApp: { title: "Payment received", link: "/app/plan" },
        content: copy.paymentReceived(bizName, line, APP_URL),
      }).catch((e) => captureError(FN, e, { route: "decide" }));
    }
    const month = (c?.partner_invoices as unknown as { month: string } | null)?.month;
    if (c?.partner_id && month) {
      await notify({
        category: "partner", kind: "payment_received", key: `payment_received:${b.claim_id}`, partnerId: c.partner_id, to: await recipients(c.partner_id),
        content: copy.partnerPaid(monthLabel(month), Number(c.amount_usd ?? 0), APP_URL),
      }).catch((e) => captureError(FN, e, { route: "decide" }));
    }
  }
  log(FN, { ok: true, route: "decide", status });
  return json({ ok: true, status });
}

// ── month-end invoices (runs every morning; only a finished month with no invoice yet produces anything)
async function billing(req: Request) {
  if (!(await isInternal(req))) return fail("forbidden", "Internal only.", 403);
  const now = new Date();
  const month = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)).toISOString().slice(0, 10);
  const { data, error } = await admin().rpc("partner_billing_run", { p_month: month });
  if (error) { await captureError(FN, error, { route: "billing", month }); return fail("internal", error.message, 500); }
  const invoices = (data ?? []) as { id: string; partner_id: string; month: string; active_count: number; free_count: number; rate_usd: number; amount_usd: number; status: string }[];

  let emailed = 0;
  for (const inv of invoices) {
    const label = monthLabel(inv.month);
    const r = await notify({
      category: "partner", kind: "partner_invoice", key: `partner_invoice:${inv.id}`, partnerId: inv.partner_id, to: await recipients(inv.partner_id),
      content: copy.partnerInvoice({
        label, amount: Number(inv.amount_usd), active: inv.active_count, free: inv.free_count, rate: Number(inv.rate_usd), unpaid: inv.status === "unpaid",
        trc20: TRC20, binanceId: BINANCE_PAY_ID,
      }, APP_URL),
    }).catch(async (e) => { await captureError(FN, e, { route: "billing", invoice: inv.id }); return null; });
    if (r) emailed += r.sent;
  }
  if (invoices.length) await jobLog("partner_billing", true, { month, invoices: invoices.length, emailed });
  log(FN, { ok: true, route: "billing", month, invoices: invoices.length, emailed });
  return json({ ok: true, month, invoices: invoices.length, emailed });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return fail("method_not_allowed", "Use POST.", 405);
  const route = new URL(req.url).pathname.split("/").filter(Boolean).pop();
  const started = Date.now();
  try {
    if (route === "billing") return await billing(req);
    if (!/^Bearer\s+\S+/i.test(req.headers.get("authorization") ?? "")) return fail("unauthorized", "Please log in again.", 401);
    if (route === "invite") return await invite(req);
    if (route === "claim") return await claim(req);
    if (route === "plan-claim") return await planClaim(req);
    if (route === "decide") return await decide(req);
    return fail("not_found", "Unknown route.", 404);
  } catch (e) {
    await captureError(FN, e, { route, ms: Date.now() - started });
    return fail("internal", "Something went wrong. Please try again.", 500);
  }
});
