// outbound-send's rules (Harvey 4A part D, master plan 30.39 items 5, 7 and 8): one approved, due message per tick, and
// only when every rule holds. Locked unless sending is open, or test mode and the address is a test address of a test
// business. Weekdays 9:00 to 17:00 in the recipient's time zone, at least 20 minutes apart with jitter, the day's cap
// from the ramp and started_on, the monthly cap. Suppression is checked again right before sending. The follow-up goes in
// the same thread on day 4 or 5 and is cancelled by any reply, bounce or suppression at that business.
import { buildMessage, newMessageId } from "./smtp.ts";
import { dailyCap, followUpDate, houseStyleOk, inWindow, linksOk, localParts, nextGap } from "./rules.ts";

export type SendSettings = {
  sending_open: boolean; test_mode: boolean; ramp_week1: number; ramp_week2: number; ramp_after: number; monthly_cap: number;
  started_on: string | null; stopped_reason: string | null; next_send_at: string | null;
};
export type DueMessage = {
  id: string; prospect_id: string; parent_id: string | null; kind: "first" | "follow_up" | "reply"; to_address: string;
  subject: string; body: string; send_after: string | null; in_reply_to: string | null; references_ids: string | null;
  prospect: { email: string; email_domain: string; time_zone: string; test: boolean; status: string };
  parent: { status: string; message_id: string | null; sent_at: string | null } | null;
};

export type SendDeps = {
  settings(): Promise<SendSettings>;
  refreshSuppression(): Promise<void>;
  due(now: Date): Promise<DueMessage[]>;
  suppressed(address: string): Promise<boolean>;
  /** Any reply, bounce, opt-out or complaint at this business (the prospect, or any prospect on its domain). */
  heardFrom(prospectId: string, domain: string): Promise<boolean>;
  sentOn(localDate: string, timeZone: string): Promise<number>;
  sentThisMonth(): Promise<number>;
  deliver(to: string, message: string): Promise<void>;
  markSent(m: DueMessage, messageId: string, at: Date, followUpAt: Date | null): Promise<void>;
  markCancelled(ids: string[], why: string): Promise<void>;
  markFailed(id: string, why: string): Promise<void>;
  setNextSendAt(at: Date): Promise<void>;
  testRecipients: string[];
  sender: { name: string; address: string };
  now: Date;
  random?: () => number;
};

export type SendResult = { state: string; sent: number; cancelled: number; failed: number };

/** Why this message may not go to this address in this mode, or null. */
export function modeRefusal(s: SendSettings, m: DueMessage, testRecipients: string[]): string | null {
  if (s.sending_open) {
    if (m.prospect.test) return "test_business_while_open";
    if (m.kind !== "reply" && m.to_address.toLowerCase() !== m.prospect.email.toLowerCase()) return "not_the_business_address";
    return null;
  }
  if (!s.test_mode) return "locked";
  if (!m.prospect.test) return "real_business_in_test_mode";
  if (!testRecipients.includes(m.to_address.toLowerCase())) return "not_a_test_recipient";
  return null;
}

export async function sendTick(deps: SendDeps): Promise<SendResult> {
  const r: SendResult = { state: "idle", sent: 0, cancelled: 0, failed: 0 };
  const s = await deps.settings();
  if (s.stopped_reason) return { ...r, state: "stopped" };
  if (!s.sending_open && !s.test_mode) return { ...r, state: "locked" };
  if (s.next_send_at && Date.parse(s.next_send_at) > deps.now.getTime()) return { ...r, state: "spacing" };
  await deps.refreshSuppression();
  const due = await deps.due(deps.now);
  for (const m of due) {
    const why = modeRefusal(s, m, deps.testRecipients);
    if (why === "real_business_in_test_mode") continue; // waits, approved, until lane R opens sending
    if (why) {
      await deps.markFailed(m.id, why);
      r.failed++;
      continue;
    }
    // The business said no, bounced, or is on the list: nothing more goes to it.
    if ((await deps.suppressed(m.prospect.email)) || (await deps.suppressed(m.to_address))) {
      await deps.markCancelled([m.id], "suppressed");
      r.cancelled++;
      continue;
    }
    if (m.kind === "follow_up") {
      if (!m.parent || m.parent.status !== "sent" || !m.parent.message_id) continue; // Email 1 first
      if (await deps.heardFrom(m.prospect_id, m.prospect.email_domain)) {
        await deps.markCancelled([m.id], "heard_from_business");
        r.cancelled++;
        continue;
      }
    }
    if (!houseStyleOk(m.body) || !houseStyleOk(m.subject) || !linksOk(m.body, m.kind)) {
      await deps.markFailed(m.id, "house_style_or_links");
      r.failed++;
      continue;
    }
    const tz = m.prospect.time_zone;
    if (!inWindow(deps.now, tz)) continue;
    const local = localParts(deps.now, tz).date;
    if ((await deps.sentOn(local, tz)) >= dailyCap(s, local)) return { ...r, state: "day_full" };
    if ((await deps.sentThisMonth()) >= s.monthly_cap) return { ...r, state: "month_full" };

    const messageId = newMessageId();
    const thread = m.kind === "follow_up" ? m.parent!.message_id : m.in_reply_to;
    const refs = m.kind === "follow_up" ? m.parent!.message_id : m.references_ids;
    const message = buildMessage({
      from: deps.sender, to: m.to_address, subject: m.subject, body: m.body, messageId, date: deps.now,
      inReplyTo: thread, references: refs,
    });
    try {
      await deps.deliver(m.to_address, message);
    } catch (e) {
      const step = e && typeof e === "object" && "step" in e ? String((e as { step: string }).step) : "connect";
      await deps.markFailed(m.id, `smtp_${step}`);
      r.failed++;
      await deps.setNextSendAt(new Date(deps.now.getTime() + nextGap(deps.random)));
      return { ...r, state: "failed" };
    }
    const followAt = m.kind === "first" ? followUpDate(deps.now, tz, deps.random) : null;
    await deps.markSent(m, messageId, deps.now, followAt);
    await deps.setNextSendAt(new Date(deps.now.getTime() + nextGap(deps.random)));
    r.sent++;
    return { ...r, state: "sent" };
  }
  return r;
}
