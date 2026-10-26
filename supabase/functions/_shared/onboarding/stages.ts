// Onboarding in four stages (master plan 30.16 section 3, V4 item 1). Pure: the stage a business is at, the step its resume
// link opens, the WhatsApp words of the first 48 hours (docs/COPY.md section 20, onboarding) and the choice of the first task.
//
// 1. The free check gives its result first, with no sign-up.
// 2. Sign in and confirm the business, and that the person can manage its Google profile.
// 3. Connect WhatsApp: the owner sends the first message; Kabsi asks to send setup updates and approvals there, and the owner
//    confirms the search Kabsi will track (prefilled from the free check).
// 4. Add Kabsi as a Manager on Google. Three states: invite pending, accepted, access checked. Founder help on request. The
//    trial starts only when access is checked (private.start_trial already refuses anything less).
// Then the first task; competitors, extra searches, tone, AI questions, team and photos come only after it is done.
import { KABSI_GROUP_ID } from "../email-layout.ts";

export type Access = "not_started" | "invite_pending" | "accepted" | "checked";
export type Stage = "confirm" | "whatsapp" | "access" | "first_task" | "done";

export type Facts = {
  business: string;
  /** The free check this business came from (code and search), if any. */
  check: { code: string; term: string } | null;
  /** The owner confirmed the business and that they can manage its Google profile. */
  confirmed: boolean;
  /** An owner's phone is connected (they sent the first message) and they said Yes to setup updates on WhatsApp. */
  whatsapp: boolean;
  setup_ok: boolean;
  /** A search the owner confirmed for the map. */
  keyword: string | null;
  /** locations.consent_at: the owner started giving access. */
  consent: boolean;
  /** locations.access_granted_at: Kabsi accepted the invitation. */
  accepted: boolean;
  /** google_connections: granted, Kabsi can act as the business (voice of merchant), and one read worked. */
  checked: boolean;
  trial_ends_at: string | null;
  first_task_done: boolean;
};

export function accessOf(f: Pick<Facts, "consent" | "accepted" | "checked">): Access {
  if (f.checked) return "checked";
  if (f.accepted) return "accepted";
  return f.consent ? "invite_pending" : "not_started";
}

/** The next unfinished stage. */
export function stageOf(f: Facts): Stage {
  if (!f.confirmed) return "confirm";
  if (!f.whatsapp || !f.setup_ok) return "whatsapp";
  if (accessOf(f) !== "checked") return "access";
  return f.first_task_done ? "done" : "first_task";
}

/** What the resume link opens (the signed-in website's routes; Web 2 draws the screens). */
export const STAGE_PATH: Record<Stage, string> = {
  confirm: "/start/business",
  whatsapp: "/start/whatsapp",
  access: "/start/manager",
  first_task: "/app",
  done: "/app",
};

/** Competitors, extra searches, tone, AI questions, team and photos wait for the first completed task (30.16 section 3). */
export const unlocked = (f: Pick<Facts, "first_task_done">) => f.first_task_done;

/** The resume code: 20 hex characters made once by public.onboarding_status for the owner (locations.resume_code). */
export const RESUME_CODE = /^[0-9a-f]{20}$/;

// ─── The words (docs/COPY.md 20, onboarding; 30.17 section 3; 30.18 section 6) ───────────────────────────────────────
const firstName = (name: string | null) => (name ?? "").trim().split(/\s+/)[0] || "there";
const longDate = (iso: string, tz: string) =>
  new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", timeZone: tz }).format(new Date(iso));

export const SAY_ONBOARDING = {
  firstBack: (name: string | null, business: string, hasCheck: boolean) =>
    `Hi ${firstName(name)}, I am Nora, Kabsi's AI assistant. ${hasCheck ? `I have your free check for ${business}.` : `I am setting up Kabsi for ${business}.`} Can Kabsi send your setup steps and approvals here? Reply Yes, or Help to talk to Rashid, the founder. Reply Stop any time.`,
  check: (term: string, date: string, fact: string) =>
    `Your nearby check for '${term}', ${date}: ${fact} Results change by place and time. Nothing has changed on Google.`,
  invite:
    `Next, add Kabsi as a Manager on your Google profile. On Google: your profile, Business Profile settings, People and access, Add. Paste Kabsi's ID ${KABSI_GROUP_ID} (it comes in the next message, to copy), choose Manager, then Add (on some screens, Invite). Manager access lets Kabsi make changes, and Kabsi publishes only what you approve. You stay the owner and can remove Kabsi any time. Never send us a password or a code.`,
  id: KABSI_GROUP_ID,
  someoneElse: `Send these steps to whoever looks after your Google profile:\nOn Google, open your profile (search your business name while signed in), then Menu, Business Profile settings, People and access, Add. Paste ${KABSI_GROUP_ID}, choose Manager, then Add (on some screens, Invite).`,
  cannotFind: (business: string) =>
    `You may be signed in to another Google account, or you may be a manager yourself. Only an owner can invite Kabsi. Does someone else look after Google for ${business}?`,
  founderAsked: "Thanks. Rashid, the founder, will message you here to help you finish. You make every change on your own phone.",
  /** For Rashid to send himself (it goes to the staff phone with the request; Kabsi never sends it as him). */
  founderDraft: (name: string | null) =>
    `Hi ${firstName(name)}, Rashid here, Kabsi's founder. I can help you finish this. Steps here, or a short call? You make every change on your own phone.`,
  checkMap: "Here are the places around you where Kabsi searched like a customer. Sample Google Maps results, not customer counts.",
  inviteSent: "Thanks. Kabsi checks for your invitation every few minutes and tells you here when access works.",
  skipped: "Okay, skipped. Nothing was published.",
  factsAsk: (business: string, lines: string[]) =>
    `${business}: Kabsi also noted ${lines.length === 1 ? "a new detail" : `${lines.length} new details`} for About your business, in your words: ${lines.map((l) => `"${l}"`).join(" ")} Save ${lines.length === 1 ? "it" : "them"} so Kabsi can use ${lines.length === 1 ? "it" : "them"} in replies and posts?`,
  factsSaved: (n: number) => `Saved ${n === 1 ? "1 detail" : `${n} details`} to About your business. Change or remove them any time in Kabsi.`,
  factsNotSaved: "Okay. Nothing was saved to About your business.",
  accessWorks: (business: string, trialEnds: string | null, tz: string) =>
    `Kabsi now has Manager access to ${business}. ${trialEnds ? `Your free trial starts today and ends on ${longDate(trialEnds, tz)}. No card, and no charge unless you choose a plan.` : ""} Nothing has been published. I am preparing your first task.`.replace(/\s+/g, " "),
  firstReview: (business: string, review: string, draft: string) =>
    `This review for ${business} has no reply: '${review}'. Here is the reply I suggest: '${draft}'. Publish it on Google?`,
  postQuestion: (service: string) =>
    `I can prepare a Google post about ${service}. Do you offer it now, and is there anything customers should know before booking?`,
  hoursFix: (business: string, what: string) =>
    `Google shows ${what} for ${business}, which is not what you told Kabsi. Kabsi can put your hours back on Google after your yes.`,
  reminder: (business: string, what: "reply" | "post" | "change") =>
    `Your ${what} for ${business} is ready. Nothing has been published. Review it now, or later?`,
  after48: (business: string, done: string[], waiting: string | null, trialEnds: string | null, tz: string) =>
    `Done for ${business} so far: ${done.length ? done.join("; ") : "nothing published yet"}. Waiting for you: ${waiting ?? "nothing"}. ${trialEnds ? `Your trial ends on ${longDate(trialEnds, tz)}. ` : ""}What still feels like work you do yourself?`,
  stillBlocked: (business: string, step: string) =>
    `Setup for ${business} is waiting for ${step}. Your trial has not started and nothing has been published. Want help with that step?`,
};

/** The step a blocked owner is waiting on, in the owner's words. */
export const STEP_WORDS: Record<Exclude<Stage, "first_task" | "done">, string> = {
  confirm: "you to confirm your business",
  whatsapp: "your yes to setup messages here",
  access: "Kabsi to be added as a Manager on Google",
};

// ─── The first task (30.16 section 3): one, chosen in this order ─────────────────────────────────────────────────────
export type ReviewCandidate = { review_id: string; stars: number; text: string | null; draft: string | null; draft_ok: boolean; risk: string | null; sensitive: boolean };
export type PostCandidate = { fact_id: string; service: string };
export type HoursCandidate = { change_id: string; shown: string };
export type FirstTask =
  | { kind: "review"; review_id: string; text: string; draft: string }
  | { kind: "post"; fact_id: string; service: string }
  | { kind: "hours"; change_id: string; shown: string }
  | { kind: "none" };

/**
 * An unanswered review that can be answered accurately (words to answer, a safe draft, nothing sensitive, not high risk), else
 * a post from facts the owner confirmed, else an hours fix only when Google shows hours that differ from what the owner gave.
 * Nothing sensitive (category, address) is ever changed to show activity.
 */
export function pickFirstTask(c: { reviews: ReviewCandidate[]; posts: PostCandidate[]; hours: HoursCandidate[] }): FirstTask {
  const r = c.reviews.find((x) =>
    !x.sensitive && x.risk !== "high" && x.draft_ok && !!x.draft?.trim() && (x.text ?? "").trim().length >= 15
  );
  if (r) return { kind: "review", review_id: r.review_id, text: r.text!.trim(), draft: r.draft!.trim() };
  const p = c.posts.find((x) => x.service.trim().length >= 3);
  if (p) return { kind: "post", fact_id: p.fact_id, service: p.service.trim() };
  const h = c.hours[0];
  if (h) return { kind: "hours", change_id: h.change_id, shown: h.shown };
  return { kind: "none" };
}

/** A review quoted on WhatsApp: the customer's words cut to 200 characters (the full text stays in Kabsi). */
export const quote = (s: string, max = 200) => {
  const t = s.replace(/\s+/g, " ").trim();
  return [...t].length <= max ? t : [...t].slice(0, max - 1).join("").trimEnd() + "…";
};

// ─── The owner's replies to the setup messages ────────────────────────────────────────────────────────────────────
export type SetupReply = "yes" | "help" | "someone_else" | "cannot_find" | "done" | null;
export function setupReply(raw: string): SetupReply {
  const t = raw.toLowerCase().replace(/[.!?]+$/g, "").trim();
  if (/^(yes|yes please|ok|okay|sure|yep|yeah|go ahead|si|sí|نعم|اي|أيوه)$/.test(t)) return "yes";
  if (/^(help|founder|talk to rashid|rashid|call me|a call)$/.test(t)) return "help";
  if (/(someone else|my manager|my agency|agency|not me|another person|my partner) (looks after|manages|does|handles)|^someone else$|^my manager$/.test(t)) return "someone_else";
  if (/(can'?t|cannot|could not|couldn'?t|don'?t) (find|see)|not there|no (add|people and access)/.test(t)) return "cannot_find";
  if (/^(done|sent|invited|i (sent|added|invited) (it|kabsi)|added)$/.test(t)) return "done";
  return null;
}

// ─── The monthly answer as Business Knowledge proposals (30.15 3.3, V4 item 7) ──────────────────────────────────────
const SERVICE = /\b(new|now|offer|offering|launch|launched|introduc\w*|added|adding|start(ing|ed)?)\b[^.\n]{0,80}\b(service|treatment|menu|product|dish|item|class|package|massage|cut|colour|color|facial|cake|coffee)/i;
const PRICE = /(\$|aed|dhs?|dirhams?|usd|dollars?|pounds?|£|€|eur|euros?)\s?\d|\d+(\.\d+)?\s?(\$|aed|dhs?|dirhams?|usd|dollars?|pounds?|£|€|eur|euros?)\b/i;

/**
 * Sentences of the owner's answer that state a new service, product or price, as proposals for About your business. Never a
 * phone number, link or handle; at most three, each up to 200 characters. The owner confirms each before Kabsi uses it.
 */
export function monthlyFacts(answer: string): { key: "service" | "price_note"; text: string }[] {
  const out: { key: "service" | "price_note"; text: string }[] = [];
  for (const s of answer.split(/(?<=[.?!])\s+|\n+/).map((x) => x.replace(/\s+/g, " ").trim()).filter(Boolean)) {
    if (s.length > 200 || /https?:|www\.|@\w|\+?\d[\d\s-]{7,}\d/.test(s)) continue;
    if (PRICE.test(s)) out.push({ key: "price_note", text: s });
    else if (SERVICE.test(s)) out.push({ key: "service", text: s });
    if (out.length === 3) break;
  }
  return out;
}
