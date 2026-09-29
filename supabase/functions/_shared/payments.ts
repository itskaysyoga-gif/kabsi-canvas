// "Payment received" email, shared by the partner function (manual USDT claims) and billing (NOWPayments).
import { admin, APP_URL, emailLayout, esc, ownerEmails, sendEmail } from "./kabsi.ts";
import { PLAN_LABEL } from "./plans.ts";

const money = (n: number | string) => `$${Number(n).toFixed(2)}`;
const day = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/** Emails every owner once per `dedupeBase`. Says when the plan runs until, or that it starts once access works. */
export async function sendPaymentReceived(o: { locationId: string; item: string; amountUsd: number; dedupeBase: string }) {
  const { data: plan } = await admin().from("plans").select("starts_at, ends_at")
    .eq("location_id", o.locationId).eq("status", "active").neq("kind", "trial").order("ends_at", { ascending: false }).limit(1).maybeSingle();
  const started = plan?.starts_at && Date.parse(plan.starts_at) <= Date.now();
  const tail = plan?.ends_at
    ? started
      ? ` Your plan runs until ${day(plan.ends_at)}.`
      : ` Your plan starts on ${day(plan.starts_at!)}, when your current period ends.`
    : " Your plan starts as soon as Kabsi's access to your Google profile is working.";
  const line = `We received your payment of ${money(o.amountUsd)} for ${PLAN_LABEL[o.item] ?? "Kabsi Pro"}.${tail} Thank you.`;
  let sent = 0;
  for (const to of await ownerEmails(o.locationId)) {
    const r = await sendEmail({
      kind: "payment_received", to, locationId: o.locationId, dedupeKey: `${o.dedupeBase}:${to}`,
      subject: "Payment received",
      html: emailLayout({
        preheader: "Thank you.", title: "Payment received",
        bodyHtml: `<p style="margin:0 0 14px 0;">${esc(line)}</p>`,
        button: { label: "Open Kabsi", url: `${APP_URL}/app` },
      }),
      text: `${line}\n\n${APP_URL}/app`,
    });
    if ("sent" in r) sent++;
  }
  return sent;
}
