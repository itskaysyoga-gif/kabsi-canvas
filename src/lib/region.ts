// Country rules that the law needs (CLAUDE.md, K-123). Kabsi has no country-only wording; rules live here.

// Countries where a business may not promote alcohol in its Google posts (P0.5-02, K-116). Kept equal to
// ALCOHOL_PROMOTION_RESTRICTED in supabase/functions/_shared/posts/checks.ts by tests/posts.test.ts.
export const ALCOHOL_PROMOTION_RESTRICTED = [
  "AE",
  "AF",
  "IR",
  "KW",
  "LY",
  "MR",
  "QA",
  "SA",
  "SD",
  "SO",
  "YE",
];

// Where visitors are asked before anything that needs consent loads (master plan 20.4): the EU and EEA, the United
// Kingdom and Switzerland. Everywhere else there is no pop-up, and "Your privacy choices" in the footer has one switch.
// Kept equal to ASK_FIRST in supabase/functions/_shared/consent.ts by tests/consent.test.ts.
export const CONSENT_ASK_FIRST =
  "AT BE BG HR CY CZ DK EE FI FR DE GR HU IE IT LV LT LU MT NL PL PT RO SK SI ES SE IS LI NO GB CH".split(
    " ",
  );
