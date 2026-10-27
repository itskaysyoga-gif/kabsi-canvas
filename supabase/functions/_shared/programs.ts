// Founding 25 and Kabsi Partners, the pure part (master plan 30.17 section 1, 29, 30.15 section 5): what an application
// must hold, and the words of the founding messages. No Deno and no database here, so tests run in Node.

export const FOUNDING_TRADES = ["beauty_hair", "food", "health", "other"] as const;
export const FOUNDING_COUNTRIES = ["AE", "GB", "US"] as const;
export const PARTNER_KINDS = ["creator", "agency", "accountant", "reseller", "business_group", "other"] as const;
/** The version of /partners/terms an applicant agrees to. Change it when the terms change in a way that matters. */
export const PARTNER_TERMS_VERSION = "2026-10-26";
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

export type PartnerApplication = {
  name: string; email: string; phone: string | null; country: string | null; city: string | null; kind: string;
  reach: string | null; pitch: string | null; uae_permit: string | null; source: "web"; terms_version: string;
};
export function checkPartner(b: Body): Checked<PartnerApplication> {
  const name = text(b.name, 80);
  if (name.length < 2) return { ok: false, field: "name", message: "Please write your name." };
  const email = text(b.email, 254).toLowerCase();
  if (!EMAIL.test(email)) return { ok: false, field: "email", message: "Please write an email address we can reach you at." };
  const phone = b.phone ? phoneOf(b.phone) : null;
  if (b.phone && !phone) return { ok: false, field: "phone", message: "Please write your WhatsApp number with the country code." };
  const country = text(b.country, 2).toUpperCase() || null;
  if (country && !/^[A-Z]{2}$/.test(country)) return { ok: false, field: "country", message: "Please choose your country." };
  const kind = text(b.kind, 20);
  if (!(PARTNER_KINDS as readonly string[]).includes(kind)) return { ok: false, field: "kind", message: "Please choose what you do." };
  if (b.terms !== true) return { ok: false, field: "terms", message: "Please read and agree to the partner terms." };
  const uae_permit = text(b.uae_permit, 60) || null;
  return {
    ok: true,
    value: { name, email, phone, country, city: text(b.city, 80) || null, kind, reach: text(b.reach, 300) || null, pitch: text(b.pitch, 500) || null,
      uae_permit, source: "web", terms_version: PARTNER_TERMS_VERSION },
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
  const price = "Founding price: Essentials $19 a month or Pro $39 a month, kept while your subscription stays paid.";
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
  return {
    whatsapp: body.join("\n"),
    email: {
      subject: subject[day], title: day === 60 ? "Your Founding 25 months" : "Choose your plan", preheader: body[0],
      bodyHtml: body.map((t) => `<p style="margin:0 0 16px 0;">${esc(t)}</p>`).join(""),
      text: body.join("\n\n"),
      button: day === 60 ? undefined : { label: "Choose your plan", url: plan },
    },
  };
}
