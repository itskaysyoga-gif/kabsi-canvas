// Founding 25 and Kabsi Partners, the pure part (master plan 30.17 section 1, 29, 30.15 section 5): what an application
// must hold, and the words of the founding messages. No Deno and no database here, so tests run in Node.
import { CARD_PAYMENTS_COMING } from "./email/lifecycle-copy.ts";

export const FOUNDING_TRADES = ["beauty_hair", "food", "health", "other"] as const;
export const FOUNDING_COUNTRIES = ["AE", "GB", "US"] as const;
/** Partners 2 (30.50 item 5): the six kinds of partner, in the order the join form shows them. */
export const PARTNER_KINDS = ["card_seller", "agency", "creator", "accountant", "reseller", "customer"] as const;
export type PartnerKind = (typeof PARTNER_KINDS)[number];
/** The words for each kind (docs/COPY.md, Partners 2). Kept equal to the join form by tests/programs.test.ts. */
export const PARTNER_KIND_LABEL: Record<PartnerKind, string> = {
  card_seller: "Review card seller",
  agency: "Freelancer or small agency",
  creator: "Creator",
  accountant: "Consultant or accountant",
  reseller: "POS or booking reseller",
  customer: "Kabsi customer",
};
/** The version of /partners/terms a partner agrees to. Change it when the terms change in a way that matters. */
export const PARTNER_TERMS_VERSION = "2026-11-10.2"; // Partners 2 (R-150 item 4): join at once, review at the first payout
/**
 * The words the founding applicant agrees to, stored with the application (30.17 section 1). UX 1: the form asks "Named or
 * anonymous case study" (anonymous unless the owner picks named), and the stored words say which one they agreed to.
 */
export const FOUNDING_CONSENT = {
  anonymous:
    "I agree to a 2-minute check-in with Kabsi every two weeks, and to Kabsi writing a case study that does not name my business. " +
    "I approve the final text before it is published.",
  named:
    "I agree to a 2-minute check-in with Kabsi every two weeks, and to Kabsi writing a case study that names my business. " +
    "I approve the final text before it is published.",
} as const;

/**
 * Founding 1 (R-151, master plan 30.51): the private invite. The page is /founding/<slug>; the slug is app_settings
 * founding_invite_slug, 24 letters and digits. Kept equal to INVITE_SHAPE in src/lib/founding-invite.ts by tests/founding1.test.ts.
 */
export const INVITE_SHAPE = /^[A-Za-z0-9]{24}$/;
/** True only when the given slug has the shape and equals the stored one. Compares every character, so the time taken does not say how many matched. */
export function inviteMatches(given: unknown, stored: unknown): boolean {
  if (typeof given !== "string" || typeof stored !== "string") return false;
  if (!INVITE_SHAPE.test(given) || !INVITE_SHAPE.test(stored)) return false;
  let diff = 0;
  for (let i = 0; i < stored.length; i++) diff |= given.charCodeAt(i) ^ stored.charCodeAt(i);
  return diff === 0;
}

const E164 = /^\+[1-9][0-9]{6,14}$/;
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

type Body = Record<string, unknown>;
const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, max) : "");
export const phoneOf = (v: unknown) => {
  const raw = typeof v === "string" ? v.replace(/[\s().-]/g, "") : "";
  const p = raw.startsWith("00") ? `+${raw.slice(2)}` : raw;
  return E164.test(p) ? p : null;
};

export type Checked<T> = { ok: true; value: T } | { ok: false; field: string; message: string };

export type FoundingApplication = {
  business_name: string; country: string; trade: string; business_kind: string; whatsapp: string; why_now: string;
  case_study: "named" | "anonymous"; checkin_consent: true; consent_text: string;
};
export function checkFounding(b: Body): Checked<FoundingApplication> {
  const business_name = text(b.business_name, 120);
  if (business_name.length < 2) return { ok: false, field: "business_name", message: "Please write your business name." };
  const country = text(b.country, 2).toUpperCase();
  if (!(FOUNDING_COUNTRIES as readonly string[]).includes(country)) {
    return { ok: false, field: "country", message: "Founding 25 is for businesses in the UAE, the UK or the US." };
  }
  const trade = text(b.trade, 20);
  if (!(FOUNDING_TRADES as readonly string[]).includes(trade)) return { ok: false, field: "trade", message: "Please choose the kind of business." };
  const business_kind = text(b.business_kind, 80);
  if (business_kind.length < 2) return { ok: false, field: "business_kind", message: "Please say what kind of business it is." };
  const whatsapp = phoneOf(b.whatsapp);
  if (!whatsapp) return { ok: false, field: "whatsapp", message: "Please write your WhatsApp number with the country code, like +971 50 123 4567." };
  const why_now = text(b.why_now, 1000);
  if (why_now.length < 10) return { ok: false, field: "why_now", message: "Please tell us in a line or two why now." };
  const case_study = b.case_study === "named" ? "named" : b.case_study === "anonymous" ? "anonymous" : null;
  if (!case_study) return { ok: false, field: "case_study", message: "Please choose whether a case study may name your business." };
  if (b.checkin_consent !== true) return { ok: false, field: "checkin_consent", message: "Founding 25 needs a yes to the 2-minute check-in every two weeks." };
  return { ok: true, value: { business_name, country, trade, business_kind, whatsapp, why_now, case_study, checkin_consent: true, consent_text: FOUNDING_CONSENT[case_study] } };
}

/** Partners 2 (30.50 item 4): the one short form at kabsi.co/partners/join, after sign-in. */
export type PartnerJoin = {
  name: string; email: string; country: string; kind: PartnerKind; reach: string; uae_permit: string | null; terms_version: string;
};
/** The UAE line of 29.2: an advertiser permit number, or "I will only share privately" (stored as "private"). */
export const UAE_PRIVATE = "private";
export function checkJoin(b: Body): Checked<PartnerJoin> {
  const name = text(b.name, 80);
  if (name.length < 2) return { ok: false, field: "name", message: "Please write your name." };
  const email = text(b.email, 254).toLowerCase();
  if (!EMAIL.test(email) || /@wa\.kabsi\.co$/.test(email)) return { ok: false, field: "email", message: "Please write an email address we can reach you at." };
  const kind = text(b.kind, 20) as PartnerKind;
  if (!(PARTNER_KINDS as readonly string[]).includes(kind)) return { ok: false, field: "kind", message: "Please choose what kind of partner you are." };
  const country = text(b.country, 2).toUpperCase();
  if (!/^[A-Z]{2}$/.test(country)) return { ok: false, field: "country", message: "Please choose your country." };
  const reach = text(b.reach, 300);
  if (reach.length < 3) return { ok: false, field: "reach", message: "Please say in a few words how you will share Kabsi." };
  let uae_permit: string | null = null;
  if (country === "AE") {
    uae_permit = b.uae_private === true ? UAE_PRIVATE : text(b.uae_permit, 60) || null;
    if (!uae_permit) return { ok: false, field: "uae_permit", message: "In the UAE, write your advertiser permit number, or tick that you will only share privately." };
  }
  if (b.terms !== true) return { ok: false, field: "terms", message: "Please read and agree to the partner terms." };
  return { ok: true, value: { name, email, country, kind, reach, uae_permit, terms_version: PARTNER_TERMS_VERSION } };
}

// ─── the payout method (29.1, 30.51 item 6) ──────────────────────────────────────────────────────────────────────
export const PAYOUT_METHODS = ["paypal", "usdt", "usdc"] as const;
export type PayoutMethod = (typeof PAYOUT_METHODS)[number];
export const PAYOUT_LABEL: Record<PayoutMethod, string> = { paypal: "PayPal", usdt: "USDT", usdc: "USDC" };
/** 29.1: the payout method is asked only once this much has cleared (cents). */
export const PAYOUT_ASK_CENTS = 5000;
/** A PayPal email, or a USDT or USDC wallet address (26 to 64 letters and digits, as TRON and Ethereum addresses are). */
export function checkPayout(b: Body): Checked<{ method: PayoutMethod; detail: string }> {
  const method = text(b.method, 10) as PayoutMethod;
  if (!(PAYOUT_METHODS as readonly string[]).includes(method)) return { ok: false, field: "method", message: "Please choose how you want to be paid." };
  const detail = typeof b.detail === "string" ? b.detail.trim() : "";
  if (method === "paypal") {
    if (!EMAIL.test(detail) || detail.length > 200) return { ok: false, field: "detail", message: "Please write the email of your PayPal account." };
  } else if (!/^[A-Za-z0-9]{26,64}$/.test(detail)) {
    return { ok: false, field: "detail", message: "Please paste your wallet address. It is 26 to 64 letters and numbers." };
  }
  return { ok: true, value: { method, detail } };
}
/** "PayPal ending in 1234". */
export const payoutName = (method: string, last4: string | null | undefined) =>
  `${PAYOUT_LABEL[method as PayoutMethod] ?? method} ending in ${last4 ?? ""}`.trim();
/** The 6 digits of an email confirm, from random bytes (rejection sampling keeps each digit equally likely). */
export function emailCode(randomBytes: (n: number) => Uint8Array): string {
  let out = "";
  while (out.length < 6) for (const b of randomBytes(12)) if (b < 250 && out.length < 6) out += String(b % 10);
  return out;
}
/** The email with the code (docs/COPY.md, Partners 2). The code is in the body only, never in the subject. */
export function payoutCodeEmail(code: string, method: string, last4: string) {
  const line = `Your code to change your Kabsi payout method to ${payoutName(method, last4)} is ${code}.`;
  const help = "It works once, for 10 minutes. If you did not ask for this, ignore this email and nothing changes.";
  const html = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return {
    subject: "Your Kabsi payout code",
    preheader: "Enter the code on kabsi.co/partner to confirm the change.",
    title: "Confirm your payout method",
    bodyHtml: `<p>${html(line)}</p><p>${html(help)}</p>`,
    text: `${line}\n\n${help}`,
  };
}

// ─── the founding messages (day 60, day 85, day 90) ──────────────────────────────────────────────────────────────
export type FoundingDay = 60 | 85 | 90;
export const FOUNDING_DAYS: FoundingDay[] = [60, 85, 90];
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const longDate = (d: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(d));

export function foundingLine(day: FoundingDay, business: string, endsAt: string | null, appUrl: string) {
  const end = endsAt ? longDate(endsAt) : "the last day of your free months";
  const plan = `${appUrl}/app/plan`;
  const price = "Launch price: Essentials $19 a month or Pro $39 a month, kept while your subscription stays paid.";
  const lines: Record<FoundingDay, string[]> = {
    60: [
      `${business}: you are 60 days into your three free months of Kabsi Pro as one of the Founding 25.`,
      `They end on ${end}. Nothing is charged by itself: on that day you choose a plan or stop.`,
      "What should Kabsi do better for you? Reply here and a person at Kabsi reads it.",
    ],
    85: [
      `${business}: your free months of Kabsi Pro end on ${end}.`,
      price,
      `To carry on, choose a plan here: ${plan}. Nothing is charged unless you choose.`,
    ],
    90: [
      `${business}: your three free months of Kabsi Pro end today.`,
      `Choose a plan to keep Kabsi publishing for you: ${plan}. ${price}`,
      "If you do not choose, nothing is charged. Kabsi keeps watching and drafting for 7 days and publishes nothing.",
    ],
  };
  const subject: Record<FoundingDay, string> = {
    60: `${business}: 60 days of Kabsi Pro, 30 to go`,
    85: `${business}: your free months end on ${end}`,
    90: `${business}: your free months end today`,
  };
  const body = lines[day];
  // Sync 1 (EML-11): an email that names prices also says card payments are not open yet.
  const mail = day === 60 ? body : [...body, CARD_PAYMENTS_COMING];
  return {
    whatsapp: body.join("\n"),
    email: {
      subject: subject[day], title: day === 60 ? "Your Founding 25 months" : "Choose your plan", preheader: body[0],
      bodyHtml: mail.map((t) => `<p style="margin:0 0 16px 0;">${esc(t)}</p>`).join(""),
      text: mail.join("\n\n"),
      button: day === 60 ? undefined : { label: "Choose your plan", url: plan },
    },
  };
}

/**
 * 30.51 item 6: how a payout change is confirmed. The partner's own WhatsApp ("Yes, it's me") when the account has a
 * confirmed number. Kabsi may write a free-form message with a button only inside the 24-hour window, so with the window
 * closed the partner is asked to send Kabsi any message first ("open_window"). A code by email only without WhatsApp (no
 * confirmed number, or the number stopped Kabsi's messages). Kabsi never uses a channel the browser chose.
 */
export function payoutChannel(o: { phone: string | null; windowOpen: boolean; stopped: boolean }): "whatsapp" | "email" | "open_window" {
  if (!o.phone || o.stopped) return "email";
  return o.windowOpen ? "whatsapp" : "open_window";
}
