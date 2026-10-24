// Phone numbers in one form (master plan 30.8): every number Kabsi keeps (owners, managers, staff, partners, the staff
// phone, "Ask a customer" contacts) is checked with libphonenumber-js and stored in E.164 (+ and digits). A number that
// does not parse as a real one is refused, never guessed. WhatsApp sends the sender's number without the plus sign; a
// shared contact may carry a local number, so the business's country is the fallback region.
import { type CountryCode, parsePhoneNumberFromString } from "npm:libphonenumber-js@1.12.29/max";

export const E164 = /^\+[1-9][0-9]{6,14}$/;

/** The number in E.164, or null when it is not a valid phone number. `region` is an ISO country code for local numbers. */
export function toE164(raw: string | null | undefined, region?: string | null): string | null {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  // WhatsApp ids are digits only and always international; a leading 0 is a local number (the region decides).
  const country = region && /^[A-Za-z]{2}$/.test(region) ? (region.toUpperCase() as CountryCode) : undefined;
  const tries = s.startsWith("00") ? [`+${s.slice(2)}`] : /^[1-9]\d{7,14}$/.test(s) ? (country ? [s, `+${s}`] : [`+${s}`]) : [s];
  for (const t of tries) {
    const p = parsePhoneNumberFromString(t, country);
    if (p?.isValid() && E164.test(p.number)) return p.number;
  }
  return null;
}

/** The last four digits only, for logs and messages (never the whole number in a log). */
export const last4 = (e164: string) => e164.slice(-4);
