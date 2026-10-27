// The free check's waiting list (UX 1, COPY.md shared pieces, master plan 30.15 section 6): while the nearby check is
// closed, a visitor leaves an email or a WhatsApp number and Kabsi tells them once the day it opens. Stored with the exact
// words they agreed to. A separate, unticked box asks for tips; it is never needed to join the list. Pure: no Deno and no
// database here, so tests run in Node.

/** What the visitor agrees to by pressing "Save my place" (COPY.md, the scan box's waitlist state). Stored as proof. */
export const WAITLIST_NOTICE_TEXT =
  "The free scan opens soon. Leave your email or WhatsApp and Kabsi sends your map the day it opens.";
/** The separate tips box (the same words the free profile check stores, profile-snapshot.ts TIPS_CONSENT_TEXT). */
export const WAITLIST_TIPS_TEXT = "Send me tips on managing my Google profile";

export type WaitlistEntry = {
  email: string | null;
  phone: string | null;
  business: string;
  country: string | null;
  place_id: string | null;
  term: string | null;
  industry: string | null;
  notice_consent_text: string;
  marketing_consent: boolean;
  marketing_consent_text: string | null;
  page: string;
};

export type Checked<T> = { ok: true; value: T } | { ok: false; field: string; message: string };

const EMAIL = /^[^@\s]{1,64}@[^@\s]+\.[^@\s]{2,}$/;
const E164 = /^\+[1-9][0-9]{6,14}$/;
const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, max) : "");
const phoneOf = (v: unknown) => {
  const raw = typeof v === "string" ? v.replace(/[\s().-]/g, "") : "";
  const p = raw.startsWith("00") ? `+${raw.slice(2)}` : raw;
  return E164.test(p) ? p : null;
};

/** Checks one "Save my place" request. `whatsappOn` is false while Kabsi has no public WhatsApp number (K-122). */
export function checkWaitlist(b: Record<string, unknown>, whatsappOn: boolean): Checked<WaitlistEntry> {
  const rawEmail = text(b.email, 254).toLowerCase();
  const email = rawEmail && EMAIL.test(rawEmail) ? rawEmail : null;
  if (rawEmail && !email) return { ok: false, field: "email", message: "Check the email. It needs a full address, like name@shop.com." };
  const phone = whatsappOn && b.phone ? phoneOf(b.phone) : null;
  if (whatsappOn && b.phone && !phone) return { ok: false, field: "phone", message: "Type your WhatsApp number with its country code." };
  if (phone && b.whatsapp_consent !== true) return { ok: false, field: "phone", message: "Tick the box to get the message on WhatsApp." };
  if (!email && !phone) return { ok: false, field: "email", message: "Type an email address or a WhatsApp number with its country code." };
  const business = text(b.business, 120);
  if (business.length < 2) return { ok: false, field: "business", message: "Type your business name as it shows on Google." };
  const country = typeof b.country === "string" && /^[A-Z]{2}$/.test(b.country) ? b.country : null;
  const place_id = typeof b.place_id === "string" && /^[A-Za-z0-9_-]{10,300}$/.test(b.place_id) ? b.place_id : null;
  const term = text(b.term, 60) || null;
  const industry = typeof b.industry === "string" && /^[a-z0-9-]{2,40}$/.test(b.industry) ? b.industry : null;
  const marketing = b.tips === true && !!email;
  const page = typeof b.page === "string" && /^\/[a-z0-9/_-]{0,120}$/i.test(b.page) ? b.page : "/scan";
  return {
    ok: true,
    value: {
      email, phone, business, country, place_id, term, industry, page,
      notice_consent_text: WAITLIST_NOTICE_TEXT,
      marketing_consent: marketing,
      marketing_consent_text: marketing ? WAITLIST_TIPS_TEXT : null,
    },
  };
}
