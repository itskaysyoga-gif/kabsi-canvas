// Copy of src/lib/consent-rules.ts for the `consent` Edge Function (P0.6-01). tests/consent.test.ts keeps the two equal.
// Change the wording only together with a new CONSENT_VERSION, so every stored record still matches what was shown.

export const CONSENT_VERSION = "2026-10-21";

// opt_in: EU and EEA (and any visitor whose country is unknown): statistics and advertising wait for a yes.
// ads_opt_in: UK, UAE and Saudi Arabia: statistics in totals only with notice and an opt-out; advertising waits for a yes.
// notice: everywhere else: both on, with notice and an opt-out.
export type ConsentRule = "opt_in" | "ads_opt_in" | "notice";

const EU_EEA = "AT BE BG HR CY CZ DK EE FI FR DE GR HU IE IT LV LT LU MT NL PL PT RO SK SI ES SE IS LI NO".split(" ");
const ADS_OPT_IN = ["GB", "AE", "SA"];

export function ruleFor(country: string | null | undefined): ConsentRule {
  const cc = (country ?? "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc) || cc === "XX") return "opt_in";
  if (EU_EEA.includes(cc)) return "opt_in";
  if (ADS_OPT_IN.includes(cc)) return "ads_opt_in";
  return "notice";
}

export const CONSENT_WORDING: Record<string, Record<ConsentRule, string>> = {
  "2026-10-21": {
    opt_in:
      "Until you choose, Kabsi counts visits without cookies and without any identifier. With your OK, PostHog may also remember your visits so we can see which pages help, and Meta may measure which of our ads brought you here. You can change this any time under Privacy choices at the foot of every page.",
    ads_opt_in:
      "Kabsi counts visits with PostHog, in totals only and without cookies. You can turn that off. With your OK, PostHog may also remember your visits, and Meta may measure which of our ads brought you here. You can change this any time under Privacy choices at the foot of every page.",
    notice:
      "Kabsi counts visits with PostHog and may measure which of its ads brought you here with Meta. You can turn either off now, or any time under Privacy choices at the foot of every page.",
  },
};

export type ConsentAction = "accept" | "decline" | "save" | "ok";
