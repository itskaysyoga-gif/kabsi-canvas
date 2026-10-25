// The Sentry release tag of the Edge Functions (Ops 1 part B, master plan 29.9). In the repository it reads "dev".
// .github/workflows/deploy.yml overwrites this file with the commit being deployed just before `supabase functions
// deploy`, so every error a function reports names the commit it was built from, the same way the web app's release
// is the commit Vercel builds. Never edit it by hand to anything else.
export const RELEASE = "dev";
