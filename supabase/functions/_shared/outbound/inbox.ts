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
import { domainOf, houseStyleOk, isFreeMail, sha } from "./rules.ts";
import { SOCIAL_LINKS } from "../social-links.ts";

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
  record(e: EventRow): Promise<void>;
  suppress(address: string, reason: string, domain: boolean): Promise<void>;
  cancelQueue(prospectId: string, onlyFollowUp: boolean): Promise<void>;
  setStatus(prospectId: string, status: string, interested?: boolean): Promise<void>;
  /** The stop rules (part F): a complaint, or bounces above 3 percent of the last 100 sends. */
  checkStops(reason: "complaint" | "bounce"): Promise<void>;
  alert(): Promise<void>;
  /** The free check of this business inside places_daily_cap: the scan code, or null when it cannot run now. */
  freeCheck(p: Matched["prospect"]): Promise<string | null>;
  draftReply(r: { prospect_id: string; to_address: string; subject: string; body: string; in_reply_to: string; references_ids: string }): Promise<void>;
  /** Hashes appended to kabsi-harvey's kabsi/suppression.txt (real businesses only). */
  harveyHashes(hashes: string[]): Promise<void>;
};

export type InboxResult = { looked_at: number; matched: number; replies: number; yes: number; opt_outs: number; bounces: number; auto_replies: number; complaints: number };

const reSubject = (s: string) => `Re: ${String(s ?? "").replace(/^\s*((re|aw|sv|fwd?)\s*:\s*)+/i, "").trim()}`.slice(0, 200);

/** Rashid's reply to a clear yes (docs/COPY.md section 65), with the full R-59 signature. */
export function yesReply(business: string, code: string): string {
  const fb = SOCIAL_LINKS.find((s) => s.name === "Facebook")!.href;
  const ig = SOCIAL_LINKS.find((s) => s.name === "Instagram")!.href;
  return [
    `Hi ${business} team,`,
    `Thanks for the yes. Here is the free check of ${business}'s Google profile: kabsi.co/scan/${code}`,
    "We're taking 25 founding businesses, with three months of Pro free. If you would like one of the places, reply here and I will set it up with you.",
    "Rashid Abou Hamzy, founder of Kabsi. Drafted with Nora, Kabsi's AI assistant.\nkabsi.co\n" +
      `Facebook: ${fb.replace(/^https:\/\//, "")}\nInstagram: ${ig.replace(/^https:\/\//, "")}`,
  ].join("\n\n");
}

async function hashesFor(address: string, domain: boolean): Promise<string[]> {
  const out = [await sha(address)];
  const d = domainOf(address);
  if (domain && d && !isFreeMail(d)) out.push(await sha(d));
  return out;
}

export async function handleInbox(deps: InboxDeps, messages: { uid: number; parsed: Parsed; validity: string | null }[]): Promise<InboxResult> {
  const r: InboxResult = { looked_at: 0, matched: 0, replies: 0, yes: 0, opt_outs: 0, bounces: 0, auto_replies: 0, complaints: 0 };
  for (const { uid, parsed: m, validity } of messages) {
    r.looked_at++;
    const inbound = (m.messageId || `<uid.${validity ?? "x"}.${uid}@imap>`).slice(0, 300);
    if (await deps.seen(inbound)) continue;
    const bounce = looksLikeBounce(m.from, m.subject, m.contentType);
    const feedback = looksLikeFeedbackReport(m.contentType);
    const ids = bounce || feedback ? ourIds(m.raw) : ourIds(`${m.inReplyTo} ${m.references}`);
    const hit = ids.length ? await deps.match(ids) : null;
    if (!hit) continue;
    r.matched++;
    const p = hit.prospect;
    const base = { prospect_id: p.id, message_id: hit.message.id, inbound_id: inbound };
    // In test mode the "business" is the fictional prospect: its address is suppressed, never the test inbox.
    const sender = p.test ? p.email : m.from || p.email;
    const ownDomainSender = p.test || domainOf(sender) === p.email_domain;

    if (bounce) {
      await deps.record({ ...base, kind: "bounce" });
      await deps.suppress(p.email, "bounce", false);
      await deps.cancelQueue(p.id, false);
      await deps.setStatus(p.id, "bounced");
      if (!p.test) await deps.harveyHashes(await hashesFor(p.email, false));
      await deps.checkStops("bounce");
      r.bounces++;
      continue;
    }
    const own = stripQuoted(m.text);
    const their = new OurText(hit.sentBodies).remove(own);
    if (feedback || complaintWords(their)) {
      await deps.record({ ...base, kind: "complaint" });
      await deps.suppress(p.email, "complaint", true);
      if (!p.test && sender !== p.email) await deps.suppress(sender, "complaint", ownDomainSender);
      await deps.cancelQueue(p.id, false);
      await deps.setStatus(p.id, "opted_out");
      if (!p.test) await deps.harveyHashes([...new Set([...await hashesFor(p.email, true), ...(sender !== p.email ? await hashesFor(sender, ownDomainSender) : [])])]);
      await deps.checkStops("complaint");
      r.complaints++;
      continue;
    }
    if (looksLikeAutoReply(m.headers, m.subject, own)) {
      await deps.record({ ...base, kind: "auto_reply" });
      r.auto_replies++;
      continue;
    }
    if (optOutReason(their, own)) {
      await deps.record({ ...base, kind: "opt_out" });
      await deps.suppress(p.email, "opt_out", true);
      if (!p.test && sender !== p.email) await deps.suppress(sender, "opt_out", ownDomainSender);
      await deps.cancelQueue(p.id, false);
      await deps.setStatus(p.id, "opted_out");
      if (!p.test) await deps.harveyHashes([...new Set([...await hashesFor(p.email, true), ...(sender !== p.email ? await hashesFor(sender, ownDomainSender) : [])])]);
      r.opt_outs++;
      continue;
    }
    const yes = clearYes(own);
    await deps.record({ ...base, kind: "reply", intent: yes ? "yes" : "other", needs_rashid: true, reply_subject: m.subject.slice(0, 200), reply_text: own.slice(0, 4000) });
    await deps.cancelQueue(p.id, true);
    await deps.setStatus(p.id, yes ? "needs_you" : "needs_you", yes);
    await deps.alert();
    r.replies++;
    if (yes) {
      r.yes++;
      const code = await deps.freeCheck(p);
      if (code && /^[A-Za-z0-9_-]{4,40}$/.test(code) && houseStyleOk(p.business_name)) {
        await deps.draftReply({
          prospect_id: p.id, to_address: m.from || p.email, subject: reSubject(m.subject), body: yesReply(p.business_name, code),
          in_reply_to: m.messageId, references_ids: `${m.references} ${m.messageId}`.trim().slice(-1900),
        });
      }
    }
  }
  return r;
}
