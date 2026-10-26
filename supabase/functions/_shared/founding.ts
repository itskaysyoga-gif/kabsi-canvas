// Founding 25 (master plan 30.17 section 1) and the partner payout alert (29.1, 30.15 section 5), the job side.
// founding_message: the day-60, day-85 and day-90 messages to the owners of a Founding 25 business, on WhatsApp (the
// billing_notice template first when the 24-hour window is closed, as billing messages do) and by email. Nothing is
// charged at day 90: the owner chooses a plan on the Plan page through Creem, at the founding price.
// partner_payouts_ready: tells staff on WhatsApp (R-64) that the month's payout list waits for their approval.
import { admin, APP_URL } from "./kabsi.ts";
import { notify as notifyEmail } from "./notify.ts";
import { outDb } from "./whatsapp/db.ts";
import { ref } from "./whatsapp/templates.ts";
import { staffAlert } from "./billing.ts";
import { FOUNDING_DAYS, type FoundingDay, foundingLine } from "./programs.ts";

type Contact = { user_id: string; phone: string | null; location_id: string; business: string };

/** One founding message (a job). Sent once: the application row records it; a business that pays gets none. */
export async function foundingMessage(applicationId: string, day: number): Promise<string> {
  if (!FOUNDING_DAYS.includes(day as FoundingDay)) return "bad_day";
  const d = day as FoundingDay;
  const db = admin();
  const col = `day${d}_sent_at`;
  const { data: a, error } = await db.from("founding_applications").select(`id, status, organization_id, ${col}`).eq("id", applicationId).maybeSingle();
  if (error) throw error;
  const row = a as Record<string, unknown> | null;
  if (!row || row.status !== "accepted" || !row.organization_id) return "not_founding";
  if (row[col]) return "already";
  const org = String(row.organization_id);
  const { data: paying } = await db.from("subscriptions").select("id").eq("organization_id", org).eq("provider", "creem")
    .in("state", ["active", "past_due"]).limit(1);
  if ((paying ?? []).length) return "paying";
  const { data: trial } = await db.from("subscriptions").select("trial_ends_at").eq("organization_id", org)
    .not("trial_started_at", "is", null).order("trial_started_at", { ascending: false }).limit(1);
  const { data: people, error: ce } = await db.rpc("billing_owner_contacts", { p_org: org });
  if (ce) throw ce;
  const owners = (people ?? []) as Contact[];
  if (!owners.length) return "no_owner";
  const business = owners[0].business;
  const line = foundingLine(d, business, (trial ?? [])[0]?.trial_ends_at ?? null, APP_URL);
  for (const p of owners) {
    if (!p.phone) continue;
    await outDb.add({ phone: p.phone, userId: p.user_id, locationId: p.location_id, kind: `founding_day${d}`, body: line.whatsapp,
      dedupe: `founding:${applicationId}:${d}:${p.user_id}`, template: ref("billing_notice", { business }) });
  }
  await notifyEmail({ category: "billing", kind: `founding_day${d}`, key: `founding:${applicationId}:${d}`, locationId: owners[0].location_id,
    to: "owners", content: line.email });
  const { error: ue } = await db.from("founding_applications").update({ [col]: new Date().toISOString() }).eq("id", applicationId);
  if (ue) throw ue;
  return "sent";
}

/** The month's payout list is ready for staff approval (the 5th). */
export async function partnerPayoutsReady(runOn: string): Promise<string> {
  const { data, error } = await admin().from("partner_payouts").select("amount_cents").eq("run_on", runOn).eq("state", "proposed");
  if (error) throw error;
  const rows = (data ?? []) as { amount_cents: number }[];
  if (!rows.length) return "none";
  const total = rows.reduce((s, r) => s + r.amount_cents, 0) / 100;
  await staffAlert(`Partner payouts for ${runOn}: ${rows.length} ${rows.length === 1 ? "partner" : "partners"}, $${total.toFixed(2)} in all. Approve them on the staff page`, `payouts:${runOn}`);
  return "alerted";
}
