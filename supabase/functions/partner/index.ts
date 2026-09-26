// partner: Phase 9 (D239). All rules live in membership-checked RPCs (migration 20260926050830); this function
// only calls them as the signed-in user and sends the emails around them.
//   POST /partner/invite   partner member  { partner_id, email, name? }        → invite row + email to the business
//   POST /partner/claim    partner member  { invoice_id, network, tx_ref }     → USDT claim + alert to hello@kabsi.co
//   POST /partner/plan-claim owner         { location_id, item, network, tx_ref } → owner Pro paid in USDT (kind 'plan')
//   POST /partner/decide   staff           { claim_id, confirm, note? }        → invoice paid / plan started + "payment received" email
//   POST /partner/billing  internal (x-cron-secret, pg_cron daily 06:10 UTC)  → last month's invoices + emails
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { admin, APP_URL, captureError, CORS, emailLayout, esc, fail, isInternal, jobLog, json, log, ownerEmails, sendEmail } from "../_shared/kabsi.ts";

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
  bad_plan: "Choose 6 or 12 months.",
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
const p = (html: string) => `<p style="margin:0 0 14px 0;">${html}</p>`;

async function recipients(partnerId: string): Promise<string[]> {
  const { data, error } = await admin().rpc("partner_recipients", { p_partner: partnerId });
  if (error) throw error;
  return ((data ?? []) as string[]).filter(Boolean);
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
  const who = esc(partner!.name);
  const biz = b.name?.trim() ? ` for <strong>${esc(b.name.trim())}</strong>` : "";
  const bizText = b.name?.trim() ? ` for ${b.name.trim()}` : "";
  const sent = await sendEmail({
    kind: "partner_invite", to: email, partnerId: b.partner_id, dedupeKey: `partner_invite:${inviteId}`,
    subject: `${partner!.name} invited you to Kabsi`,
    html: emailLayout({
      preheader: "Reply to every Google review, with your approval.",
      title: "You're invited to Kabsi",
      bodyHtml: p(`<strong>${who}</strong> invited you to use Kabsi${biz}.`) +
        p("When a new Google review arrives, Kabsi emails you a reply already drafted in the reviewer's language. Nothing is posted until you tap Post.") +
        p("Setup has two steps: find your business, then add Kabsi as a Manager on your Google profile.") +
        p(`There's nothing to pay Kabsi: your plan comes through ${who}.`),
      button: { label: "Set up Kabsi", url: link },
      note: "If you weren't expecting this, you can ignore this email.",
    }),
    text: `${partner!.name} invited you to use Kabsi${bizText}.\n\nWhen a new Google review arrives, Kabsi emails you a reply already drafted in the reviewer's language. Nothing is posted until you tap Post.\n\nSet up Kabsi: ${link}\n\nThere's nothing to pay Kabsi: your plan comes through ${partner!.name}.`,
  }).catch(async (e) => { await captureError(FN, e, { route: "invite" }); return { failed: true }; });
  log(FN, { ok: true, route: "invite", emailed: !("failed" in sent) });
  return json({ ok: true, invite_id: inviteId, link, emailed: !("failed" in sent) && !("skipped" in sent) });
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
  const check = b.network === "trc20" ? ` <a href="https://tronscan.org/#/transaction/${encodeURIComponent(tx)}" style="color:#111111;">Check on Tronscan</a>` : "";
  await sendEmail({
    kind: "usdt_claim_alert", to: "hello@kabsi.co", dedupeKey: `usdt_claim:${claimId}`,
    subject: `USDT to check: ${partnerName}, ${money(inv!.amount_usd)}`,
    html: emailLayout({
      preheader: "A partner says they paid.", title: "Payment to check",
      bodyHtml: p(`<strong>${esc(partnerName)}</strong> says they paid the ${monthLabel(inv!.month)} invoice (${money(inv!.amount_usd)}).`) +
        p(`${net}: <code>${esc(tx)}</code>.${check}`) + p("Confirm it in Staff once the money is in the wallet."),
      button: { label: "Open Staff", url: `${APP_URL}/staff` },
    }),
    text: `${partnerName} says they paid the ${monthLabel(inv!.month)} invoice (${money(inv!.amount_usd)}).\n${net}: ${tx}\n\nConfirm in Staff: ${APP_URL}/staff`,
  }).catch((e) => captureError(FN, e, { route: "claim" }));
  log(FN, { ok: true, route: "claim" });
  return json({ ok: true, claim_id: claimId });
}

// ── owner says they paid Kabsi Pro in USDT
const PLAN_LABEL: Record<string, string> = { pro_6m: "Kabsi Pro, 6 months", pro_12m: "Kabsi Pro, 12 months" };
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
  const check = b.network === "trc20" ? ` <a href="https://tronscan.org/#/transaction/${encodeURIComponent(tx)}" style="color:#111111;">Check on Tronscan</a>` : "";
  await sendEmail({
    kind: "usdt_claim_alert", to: "hello@kabsi.co", locationId: b.location_id, dedupeKey: `usdt_claim:${claimId}`,
    subject: `USDT to check: ${loc?.name ?? "a business"}, ${money(c?.amount_usd ?? 0)}`,
    html: emailLayout({
      preheader: "An owner says they paid.", title: "Payment to check",
      bodyHtml: p(`<strong>${esc(loc?.name ?? "A business")}</strong> says they paid for ${PLAN_LABEL[b.item] ?? b.item} (${money(c?.amount_usd ?? 0)}).`) +
        p(`${net}: <code>${esc(tx)}</code>.${check}`) + p("Confirm it in Staff once the money is in the wallet. Confirming starts the plan."),
      button: { label: "Open Staff", url: `${APP_URL}/staff` },
    }),
    text: `${loc?.name ?? "A business"} says they paid for ${PLAN_LABEL[b.item] ?? b.item} (${money(c?.amount_usd ?? 0)}).\n${net}: ${tx}\n\nConfirm in Staff: ${APP_URL}/staff`,
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
      const line = `We received your payment of ${money(c.amount_usd ?? 0)} for ${PLAN_LABEL[c.item ?? ""] ?? "Kabsi Pro"}.${until ? ` Your plan runs until ${until}.` : ""} Thank you.`;
      for (const to of await ownerEmails(c.location_id)) {
        await sendEmail({
          kind: "payment_received", to, locationId: c.location_id, dedupeKey: `payment_received:${b.claim_id}:${to}`,
          subject: "Payment received",
          html: emailLayout({ preheader: "Thank you.", title: "Payment received", bodyHtml: p(esc(line)), button: { label: "Open Kabsi", url: `${APP_URL}/app` } }),
          text: `${line}\n\n${APP_URL}/app`,
        }).catch((e) => captureError(FN, e, { route: "decide" }));
      }
    }
    const month = (c?.partner_invoices as unknown as { month: string } | null)?.month;
    if (c?.partner_id && month) {
      for (const to of await recipients(c.partner_id)) {
        await sendEmail({
          kind: "payment_received", to, partnerId: c.partner_id, dedupeKey: `payment_received:${b.claim_id}:${to}`,
          subject: `Payment received: ${monthLabel(month)}`,
          html: emailLayout({
            preheader: "Thank you.", title: "Payment received",
            bodyHtml: p(`We received your payment of ${money(c.amount_usd ?? 0)} for ${monthLabel(month)}. Thank you.`),
            button: { label: "Open partner page", url: `${APP_URL}/partner` },
          }),
          text: `We received your payment of ${money(c.amount_usd ?? 0)} for ${monthLabel(month)}. Thank you.\n\n${APP_URL}/partner`,
        }).catch((e) => captureError(FN, e, { route: "decide" }));
      }
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
    const free = inv.free_count ? p(`Free this month (founding partner, first 30 days): ${inv.free_count}`) : "";
    const lines = p(`Active locations: <strong>${inv.active_count}</strong>`) + free +
      p(`Rate: ${money(inv.rate_usd)} per location`) + p(`<strong>Total: ${money(inv.amount_usd)} USDT</strong>`);
    const pay = inv.status === "unpaid"
      ? p(`Pay in USDT on TRC20 to <code>${TRC20}</code>, or with Binance Pay to ID <code>${BINANCE_PAY_ID}</code>.`) +
        p("Then open your partner page and paste the transaction ID so we can match it.")
      : p("Nothing to pay this month.");
    for (const to of await recipients(inv.partner_id)) {
      const r = await sendEmail({
        kind: "partner_invoice", to, partnerId: inv.partner_id, dedupeKey: `partner_invoice:${inv.id}:${to}`,
        subject: `Kabsi invoice for ${label}: ${money(inv.amount_usd)}`,
        html: emailLayout({
          preheader: `${inv.active_count} active locations in ${label}.`, title: `Invoice for ${label}`,
          bodyHtml: lines + pay, button: { label: "Open partner page", url: `${APP_URL}/partner` },
        }),
        text: `Kabsi invoice for ${label}\nActive locations: ${inv.active_count}\n${inv.free_count ? `Free (founding, first 30 days): ${inv.free_count}\n` : ""}Rate: ${money(inv.rate_usd)} per location\nTotal: ${money(inv.amount_usd)} USDT\n\n${inv.status === "unpaid" ? `Pay in USDT on TRC20 to ${TRC20}, or with Binance Pay to ID ${BINANCE_PAY_ID}. Then paste the transaction ID on your partner page: ${APP_URL}/partner` : "Nothing to pay this month."}`,
      }).catch(async (e) => { await captureError(FN, e, { route: "billing", invoice: inv.id }); return null; });
      if (r && "sent" in r) emailed++;
    }
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
