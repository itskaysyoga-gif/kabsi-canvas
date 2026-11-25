// outbound-inbox's rules (Harvey 4A part E, master plan 30.39 items 5 and 9): each new message in Rashid's mailbox is
// matched to what Kabsi sent by In-Reply-To and References (a bounce by the returned headers it carries), then handled:
//   bounce      mark bounced, suppress the address, cancel its queue
//   auto-reply  ignored, the schedule stays
//   opt-out     suppress the address and, on the business's own domain, the domain; cancel; send nothing
//   complaint   suppress, cancel, stop all sending
//   a person    cancel the follow-up, mark needs Rashid, alert him with no business detail; for a clear yes, run the
//               free check inside places_daily_cap and draft his reply with the personal check link
// Nothing is ever answered automatically. Opt-outs and bounces also go, as hashes, to kabsi-harvey's suppression list.
import { clearYes, complaintWords, looksLikeAutoReply, looksLikeBounce, looksLikeFeedbackReport, optOutReason, OurText, stripQuoted } from "./classify.ts";
import { ourIds, type Parsed } from "./mail.ts";
import { possessive } from "../possessive.ts";
import { domainOf, footerFor, houseStyleOk, isFreeMail, postalAddressOk, sha } from "./rules.ts";
import { SOCIAL_LINKS } from "../social-links.ts";

/** The offer line of the reply to a yes (blueprint 3.1). Keep equal to TRIAL_LINE in src/lib/offer.ts (tested). */
export const REPLY_TRIAL_LINE =
  "14 days free. Then 29 US dollars a month until you cancel. A card is needed to start. Cancel before day 14 and you pay nothing.";

export type Matched = {
  message: { id: string; kind: string; message_id: string };
  prospect: { id: string; email: string; email_domain: string; business_name: string; industry: string; city: string; country: string; test: boolean };
  sentBodies: string[];
};

export type EventRow = {
  prospect_id: string; message_id: string; kind: "reply" | "bounce" | "opt_out" | "auto_reply" | "complaint";
  intent?: "yes" | "other" | null; needs_rashid?: boolean; inbound_id: string; reply_subject?: string | null; reply_text?: string | null;
};

export type InboxDeps = {
  seen(inboundId: string): Promise<boolean>;
  match(ids: string[]): Promise<Matched | null>;
  /** A new message from an address Kabsi wrote to (the mailto unsubscribe of List-Unsubscribe has no thread headers). */
  matchBySender(address: string): Promise<Matched | null>;
  record(e: EventRow): Promise<void>;
  suppress(address: string, reason: string, domain: boolean): Promise<void>;
  cancelQueue(prospectId: string, onlyFollowUp: boolean): Promise<void>;
  setStatus(prospectId: string, status: string, interested?: boolean): Promise<void>;
  /** The stop rules (part F): a complaint, or bounces above 3 percent of the last 100 sends. */
  checkStops(reason: "complaint" | "bounce"): Promise<void>;
  alert(key: string): Promise<void>;
  /** The free check of this business inside places_daily_cap: the scan code, or null when it cannot run now. */
  freeCheck(p: Matched["prospect"]): Promise<string | null>;
  /** FIX-3: the check ran and returned its code. The kill gate counts the business once, here, never a yes reply. */
  noteLed(prospectId: string, code: string): Promise<void>;
  draftReply(r: { prospect_id: string; to_address: string; subject: string; body: string; in_reply_to: string; references_ids: string }): Promise<void>;
  /** Hashes queued for kabsi-harvey's kabsi/suppression.txt (real businesses only); the queue is sent after the run. */
  harveyHashes(hashes: string[]): Promise<void>;
  /** Kabsi's own address: its own mail in the inbox is never read as a reply. */
  self: string;
  /** The sender's postal address for a US reply's footer (CAN-SPAM), or null: then no US reply is drafted. */
  postal?: string | null;
};

export type InboxResult = { handled_to_uid: number | null; failed: number; looked_at: number; matched: number; replies: number; yes: number; opt_outs: number; bounces: number; auto_replies: number; complaints: number };

const reSubject = (s: string) => `Re: ${String(s ?? "").replace(/^\s*((re|aw|sv|fwd?)\s*:\s*)+/i, "").trim()}`.slice(0, 200);

/** Rashid's reply to a clear yes (docs/COPY.md section 65), with the Facebook and Instagram addresses of R-59. A US
 *  recipient's reply ends with the postal address footer (CAN-SPAM, OUTBOUND-3). */
export function yesReply(business: string, code: string, country = "GB", postal: string | null = null): string {
  const fb = SOCIAL_LINKS.find((s) => s.name === "Facebook")!.href.replace(/^https:\/\//, "");
  const ig = SOCIAL_LINKS.find((s) => s.name === "Instagram")!.href.replace(/^https:\/\//, "");
  // Lane R, 6 Nov 2026 (30.39 item 11): word for word; a template wrote it, so it is signed without Nora. OUTBOUND-3:
  // the retired launch price sentence gives way to the one plan's trial line (blueprint 3.1).
  return [
    `Hi ${business} team,`,
    `Thanks. Here is the free check of ${possessive(business)} Google profile: kabsi.co/scan/${code}`,
    `If you would like Kabsi to look after it: ${REPLY_TRIAL_LINE}`,
    `Rashid Abou Hamzy, founder of Kabsi\nkabsi.co\nFacebook: ${fb}\nInstagram: ${ig}`,
    ...(country === "US" ? [footerFor("US", postal)] : []),
  ].join("\n\n");
}

async function hashesFor(address: string, domain: boolean): Promise<string[]> {
  const out = [await sha(address)];
  const d = domainOf(address);
  if (domain && d && !isFreeMail(d)) out.push(await sha(d));
  return out;
}

export async function handleInbox(deps: InboxDeps, messages: { uid: number; parsed: Parsed; validity: string | null }[]): Promise<InboxResult> {
  const r: InboxResult = { handled_to_uid: null, failed: 0, looked_at: 0, matched: 0, replies: 0, yes: 0, opt_outs: 0, bounces: 0, auto_replies: 0, complaints: 0 };
  for (const item of messages) {
    try {
      await handleOne(deps, item, r);
      r.handled_to_uid = item.uid;
    } catch {
      // Everything for this message is done again on the next run (each step is safe to repeat; the event, written last,
      // marks it done). Later messages wait behind it so none is skipped.
      r.failed++;
      break;
    }
  }
  return r;
}

async function handleOne(deps: InboxDeps, item: { uid: number; parsed: Parsed; validity: string | null }, r: InboxResult) {
  const { uid, parsed: m, validity } = item;
  r.looked_at++;
  const inbound = (m.messageId || `<uid.${validity ?? "x"}.${uid}@imap>`).slice(0, 300);
  if (m.from === deps.self.toLowerCase() || ourIds(m.messageId).length) return; // Kabsi's own mail
  if (await deps.seen(inbound)) return;
  const bounce = looksLikeBounce(m.from, m.subject, m.contentType, m.raw);
  const feedback = looksLikeFeedbackReport(m.contentType);
  const ids = bounce || feedback ? ourIds(m.raw) : ourIds(`${m.inReplyTo} ${m.references}`);
  const hit = (ids.length ? await deps.match(ids) : null) ?? (!bounce && !feedback && m.from ? await deps.matchBySender(m.from) : null);
  if (!hit) return;
  r.matched++;
  const p = hit.prospect;
  const base = { prospect_id: p.id, message_id: hit.message.id, inbound_id: inbound };
  // In test mode the "business" is the fictional prospect: its address is suppressed, never the test inbox.
  const sender = p.test ? p.email : m.from || p.email;
  const ownDomainSender = p.test || domainOf(sender) === p.email_domain;
  const both = async (domain: boolean) => [...new Set([...await hashesFor(p.email, domain), ...(sender !== p.email ? await hashesFor(sender, domain && ownDomainSender) : [])])];

  if (bounce) {
    await deps.suppress(p.email, "bounce", false);
    await deps.cancelQueue(p.id, false);
    await deps.setStatus(p.id, "bounced");
    await deps.record({ ...base, kind: "bounce" });
    await deps.checkStops("bounce");
    if (!p.test) await deps.harveyHashes(await hashesFor(p.email, false));
    r.bounces++;
    return;
  }
  const own = stripQuoted(m.text);
  const subject = m.subject.replace(/^\s*((re|aw|sv|fwd?)\s*:\s*)+/i, "");
  const their = new OurText(hit.sentBodies).remove(own);
  if (feedback || complaintWords(their)) {
    // Stop first: nothing else may stand between a complaint and the stop.
    await deps.checkStops("complaint");
    await deps.suppress(p.email, "complaint", true);
    if (!p.test && sender !== p.email) await deps.suppress(sender, "complaint", ownDomainSender);
    await deps.cancelQueue(p.id, false);
    await deps.setStatus(p.id, "opted_out");
    await deps.record({ ...base, kind: "complaint" });
    if (!p.test) await deps.harveyHashes(await both(true));
    r.complaints++;
    return;
  }
  if (looksLikeAutoReply(m.headers, m.subject, own)) {
    await deps.record({ ...base, kind: "auto_reply" });
    r.auto_replies++;
    return;
  }
  if (optOutReason(`${subject}\n${their}`, own.trim() ? own : subject)) {
    await deps.suppress(p.email, "opt_out", true);
    if (!p.test && sender !== p.email) await deps.suppress(sender, "opt_out", ownDomainSender);
    await deps.cancelQueue(p.id, false);
    await deps.setStatus(p.id, "opted_out");
    await deps.record({ ...base, kind: "opt_out" });
    if (!p.test) await deps.harveyHashes(await both(true));
    r.opt_outs++;
    return;
  }
  const yes = clearYes(own);
  await deps.cancelQueue(p.id, true);
  await deps.setStatus(p.id, "needs_you", yes);
  if (yes) {
    const code = await deps.freeCheck(p);
    if (code) await deps.noteLed(p.id, code);
    const canFooter = p.country !== "US" || postalAddressOk(deps.postal);
    if (code && /^[A-Za-z0-9_-]{4,40}$/.test(code) && houseStyleOk(p.business_name) && canFooter) {
      await deps.draftReply({
        prospect_id: p.id, to_address: m.from || p.email, subject: reSubject(m.subject), body: yesReply(p.business_name, code, p.country, deps.postal ?? null),
        in_reply_to: m.messageId, references_ids: `${m.references} ${m.messageId}`.trim().split(" ").slice(-10).join(" "),
      });
    }
  }
  await deps.alert(await sha(inbound)); // deduplicated by its key, so a repeat after a failure sends nothing twice
  await deps.record({ ...base, kind: "reply", intent: yes ? "yes" : "other", needs_rashid: true, reply_subject: m.subject.slice(0, 200), reply_text: own.slice(0, 4000) });
  r.replies++;
  if (yes) r.yes++;
}
