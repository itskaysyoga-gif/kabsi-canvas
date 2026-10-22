// The public Supabase values the browser needs to call Edge Functions and Storage. This file does not import the
// Supabase client, so a public page can reach a function (the Profile Check, the review link tool, the consent proof)
// without loading supabase-js (about 55 KB compressed). Everything that signs in or reads a table imports `@/lib/supabase`.
//
// Both values are public by design (docs/hosting.md). Vercel sets VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY for
// Production and Preview, and scripts/check-env.mjs stops a Vercel build that lacks them. The fallbacks are the same
// public values, so a local run, CI and any other host build without extra setup. Server secrets are never read here.
export const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ?? "https://ynjdqjlmdwjgbfezevxy.supabase.co";
export const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "sb_publishable_eF-s_uWvQzj1MngyU1to6Q_aJNQZh2R";

// Public "anon" JWT (safe in the browser, like the publishable key). Edge Functions with JWT verification on
// reject calls that carry no token, so anonymous browser calls (email action links, Nora, forms) send this one (D295).
export const anonJwt =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InluamRxamxtZHdqZ2JmZXpldnh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAzMDA5NzAsImV4cCI6MjEwNTg3Njk3MH0.VfPtwbV2h1-HevQMW8PjVYsO48SHBZ6vXnRivEu07vA";
export const anonHeaders = { apikey: anonJwt, authorization: `Bearer ${anonJwt}` } as const;
