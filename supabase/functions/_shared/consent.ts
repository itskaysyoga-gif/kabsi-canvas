// Copy of src/lib/consent-rules.ts (and CONSENT_ASK_FIRST in src/lib/region.ts) for the `consent` Edge Function
// (P0.6-01, master plan 20.4). tests/consent.test.ts keeps the two equal.
// Change the wording only together with a new CONSENT_VERSION, so every stored record still matches what was shown.

export const CONSENT_VERSION = "2026-10-25";

// opt_in: the EU, the EEA, the UK and Switzerland (and any visitor whose country is unknown): one small bar.
// notice: everywhere else: no pop-up, one switch under "Your privacy choices". ads_opt_in: version 2026-10-21 only.
export type ConsentRule = "opt_in" | "ads_opt_in" | "notice";

export const ASK_FIRST =
  "AT BE BG HR CY CZ DK EE FI FR DE GR HU IE IT LV LT LU MT NL PL PT RO SK SI ES SE IS LI NO GB CH".split(
    " ",
  );

export function ruleFor(country: string | null | undefined): ConsentRule {
  const cc = (country ?? "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc) || cc === "XX") return "opt_in";
  return ASK_FIRST.includes(cc) ? "opt_in" : "notice";
}

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

export type ConsentAction = "accept" | "decline" | "switch" | "save" | "ok";
