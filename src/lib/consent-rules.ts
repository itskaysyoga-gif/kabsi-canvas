// Consent rules by country and the exact wording shown (P0.6-01, master plan 20.4, docs/COPY.md shared pieces). A copy
// of this file's data is in supabase/functions/_shared/consent.ts, which stores the wording as proof;
// tests/consent.test.ts keeps the two equal. Change the wording only together with a new CONSENT_VERSION, so every
// stored record still matches what was shown. Older versions stay listed so their records can still be read.
import { CONSENT_ASK_FIRST } from "@/lib/region";

export const CONSENT_VERSION = "2026-10-25";

// opt_in: the EU, the EEA, the UK and Switzerland (and any visitor whose country is unknown): one small bar at the
// bottom; nothing that needs consent loads before a yes.
// notice: everywhere else: no pop-up; the Meta Pixel may run, PostHog stays cookieless, and "Your privacy choices" in
// the footer has one switch. ads_opt_in is the rule of version 2026-10-21, kept for its stored records only.
export type ConsentRule = "opt_in" | "ads_opt_in" | "notice";

export function ruleFor(country: string | null | undefined): ConsentRule {
  const cc = (country ?? "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc) || cc === "XX") return "opt_in";
  return CONSENT_ASK_FIRST.includes(cc) ? "opt_in" : "notice";
}

// What the visitor saw: "bar" is the bar of the opt_in rule, "panel" is "Your privacy choices" under every rule.
export type ConsentWording = Partial<Record<ConsentRule | "panel", string>>;

export const CONSENT_WORDING: Record<string, ConsentWording> = {
  "2026-10-21": {
    opt_in:
      "Until you choose, Kabsi counts visits without cookies and without any identifier. With your OK, PostHog may also remember your visits so we can see which pages help, and Meta may measure which of our ads brought you here. You can change this any time under Privacy choices at the foot of every page.",
    ads_opt_in:
      "Kabsi counts visits with PostHog, in totals only and without cookies. You can turn that off. With your OK, PostHog may also remember your visits, and Meta may measure which of our ads brought you here. You can change this any time under Privacy choices at the foot of every page.",
    notice:
      "Kabsi counts visits with PostHog and may measure which of its ads brought you here with Meta. You can turn either off now, or any time under Privacy choices at the foot of every page.",
  },
  "2026-10-25": {
    opt_in: "Kabsi uses cookies to measure visits and improve ads. You choose.",
    panel: "Let Kabsi measure its ads",
  },
};

// accept and decline come from the bar ("Accept", "Only necessary"); switch from the panel. save and ok are the
// actions of version 2026-10-21.
export type ConsentAction = "accept" | "decline" | "switch" | "save" | "ok";

// A choice is remembered for 12 months (20.4), then the bar asks again where the rule asks first.
export const CONSENT_DAYS = 365;
