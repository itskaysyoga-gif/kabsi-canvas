// "Payment received" email, shared by the partner function (manual USDT claims) and billing (NOWPayments).
import { admin, APP_URL, esc } from "./kabsi.ts";
import { notify } from "./notify.ts";
import * as copy from "./email/copy.ts";
import { PLAN_LABEL } from "./plans.ts";

const money = (n: number | string) => `$${Number(n).toFixed(2)}`;
const day = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/** Emails every owner once per `dedupeBase`. Says when the plan runs until, or that it starts once access works. */
export async function sendPaymentReceived(o: { locationId: string; item: string; amountUsd: number; dedupeBase: string }) {
  const { data: loc } = await admin().from("locations").select("name").eq("id", o.locationId).maybeSingle();
  const business = (loc?.name as string | undefined) ?? "Your business";
  const { data: plan } = await admin().from("plans").select("starts_at, ends_at")
    .eq("location_id", o.locationId).eq("status", "active").neq("kind", "trial").order("ends_at", { ascending: false }).limit(1).maybeSingle();
  const started = plan?.starts_at && Date.parse(plan.starts_at) <= Date.now();
  const tail = plan?.ends_at
    ? started
      ? ` Your plan runs until ${day(plan.ends_at)}.`
      : ` Your plan starts on ${day(plan.starts_at!)}, when your current period ends.`
    : " Your plan starts as soon as Kabsi's access to your Google profile is working.";
  const line = `We received your payment of ${money(o.amountUsd)} for ${PLAN_LABEL[o.item] ?? "Kabsi Pro"}.${tail} Thank you.`;
  const r = await notify({
    category: "billing", kind: "payment_received", key: o.dedupeBase, locationId: o.locationId, to: "owners",
    inApp: { title: "Payment received", body: `${money(o.amountUsd)} for ${PLAN_LABEL[o.item] ?? "Kabsi Pro"}.`, link: "/app/plan" },
    content: copy.paymentReceived(business, line, APP_URL),
  });
  return r.sent;
}
