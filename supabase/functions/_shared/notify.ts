// The notification engine wired to the database and the outbox (P0.4-09). Everything that tells someone something calls
// notify(); nothing else sends an email. The rules and the flow are in notify-engine.ts and notify-rules.ts.
import { admin, APP_URL, internalSecret, log, sendEmail } from "./kabsi.ts";
import { signUnsubscribe } from "./email/unsubscribe.ts";
import { type Deps, type EmailState, type NewRow, type NotifyInput, type NotifyResult, type Recipient, releaseDue, type ReleaseResult, runNotify, type StoredItem } from "./notify-engine.ts";
import type { Frequency } from "./notify-categories.ts";

export type { EmailContent } from "./email/template.ts";
export type { NotifyInput, NotifyResult, Recipient } from "./notify-engine.ts";

export function dbDeps(): Deps {
  const db = admin();
  return {
    now: () => new Date(),
    appUrl: APP_URL,

    async recipients(locationId, to): Promise<Recipient[]> {
      // Owners and the alert addresses, or owners and managers. Staff are never told about reviews or profile changes (K-16).
      const { data, error } = await db.rpc("notification_recipients", { p_location: locationId, p_roles: to === "owners" ? ["owner"] : ["owner", "manager"] });
      if (error) throw error;
      return ((data ?? []) as { user_id: string | null; email: string; role: string }[]).map((r) => ({ email: r.email, userId: r.user_id, role: r.role }));
    },

    async business(locationId) {
      const { data, error } = await db.from("locations").select("name, time_zone, digest_hour, emails_paused_until").eq("id", locationId).maybeSingle();
      if (error) throw error;
      return data ? { name: data.name as string, tz: data.time_zone as string, digestHour: data.digest_hour as number, pausedUntil: data.emails_paused_until as string | null } : null;
    },

    async prefs(userId, locationId) {
      const { data, error } = await db.from("notification_preferences").select("category, channel, frequency").eq("user_id", userId).eq("location_id", locationId);
      if (error) throw error;
      return new Map(((data ?? []) as { category: string; channel: string; frequency: Frequency }[]).map((p) => [`${p.category}:${p.channel}`, p.frequency]));
    },

    async hours(locationId) {
      const { data, error } = await db.from("knowledge_facts").select("value").eq("location_id", locationId).eq("slot", "profile.regular_hours")
        .eq("status", "verified").is("superseded_by", null).maybeSingle();
      if (error) throw error;
      return (data?.value as { display?: string } | null)?.display ?? null;
    },

    async insert(row: NewRow) {
      const { data, error } = await db.from("notifications").insert(row).select("id").single();
      if (!error) return { id: data.id as string, fresh: true, state: row.email_state };
      if (error.code !== "23505") throw error;
      const { data: prior, error: pe } = await db.from("notifications").select("id, email_state").eq("dedupe_key", row.dedupe_key).eq("to_address", row.to_address).single();
      if (pe) throw pe;
      return { id: prior.id as string, fresh: false, state: prior.email_state as EmailState };
    },

    async update(id, patch) {
      const { error } = await db.from("notifications").update(patch).eq("id", id);
      if (error) throw error;
    },

    async deliver(o) {
      const r = await sendEmail({
        kind: o.kind, to: o.to, subject: o.subject, html: o.html, text: o.text, dedupeKey: o.dedupeKey, locationId: o.locationId,
        partnerId: o.partnerId, ...(o.replyTo ? { replyTo: o.replyTo } : {}), category: o.category, notificationId: o.notificationId ?? null,
        unsubscribeUrl: o.unsubscribeUrl ?? null, stream: o.category === "trial" ? "news" : "send",
      });
      if ("sent" in r && o.notificationId) await db.from("notifications").update({ email_id: (r as { id?: string }).id ?? null }).eq("id", o.notificationId);
      return "sent" in r ? { sent: r.sent as string } : { skipped: r.skipped };
    },

    async suppressed(address, category) {
      const { data, error } = await db.from("email_suppressions").select("scope").eq("address", address.toLowerCase()).in("scope", ["*", category]).limit(1);
      if (error) throw error;
      return (data ?? []).length > 0;
    },

    async unsubscribeLinks(address, userId, locationId, category) {
      const secret = await internalSecret();
      if (!secret) throw new Error("no signing secret for unsubscribe links");
      const token = await signUnsubscribe({ a: address.toLowerCase(), u: userId, l: locationId, c: category }, secret);
      return { page: `${APP_URL}/unsubscribe?t=${token}`, oneClick: `${Deno.env.get("SUPABASE_URL")}/functions/v1/email/unsubscribe?t=${token}` };
    },

    async listDue(now, limit): Promise<StoredItem[]> {
      const { data, error } = await db.from("notifications")
        .select("id, location_id, user_id, to_address, category, kind, dedupe_key, title, link, email_state, email_due_at, email_content")
        .in("email_state", ["held", "digest"]).lte("email_due_at", now.toISOString()).not("email_content", "is", null)
        .order("email_due_at").limit(limit);
      if (error) throw error;
      return (data ?? []) as unknown as StoredItem[];
    },

    log: (event, fields) => log("notify", { event, ...fields }),
  };
}

/** Tell people something. See NotifyInput. Throws after the others went out if one send failed, so a job retries. */
export function notify(input: NotifyInput): Promise<NotifyResult> {
  return runNotify(input, dbDeps());
}

/** The notify_due job: send held and digested emails whose time has come, and clear stored content past 7 days. */
export async function notifyDue(): Promise<ReleaseResult & { cleared: number }> {
  const result = await releaseDue(dbDeps());
  const { data, error } = await admin().from("notifications").update({ email_content: null, email_state: "skipped" })
    .in("email_state", ["held", "digest"]).lt("created_at", new Date(Date.now() - 7 * 86_400_000).toISOString()).select("id");
  if (error) throw error;
  return { ...result, cleared: data?.length ?? 0 };
}
