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
