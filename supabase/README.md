# Kabsi backend (Supabase project `kabsi-prod`, ref `ynjdqjlmdwjgbfezevxy`)

- `migrations/` — every migration already applied to production, named with the exact version
  Supabase recorded (`list_migrations`). Never edit an applied file; add a new one.
- `functions/` — Edge Functions, deployed by Claude (Supabase MCP) and kept here as the source of truth.
  `_shared/kabsi.ts` (clients, auth, rate limit, Sentry, branded email) and `_shared/google/` (the only
  place that calls Google: hello@kabsi.co access, Places, `GOOGLE_MODE=mock|live`; import `_shared/google/index.ts`)
  are bundled into each function at deploy time.
- `config.toml` holds `verify_jwt` for every function (D295); `.github/workflows/deploy.yml` deploys every
  function on a push to `main`. Migrations are applied with the Supabase connector, never by the deploy.
- Nothing generates files in this folder automatically: every change is a reviewed pull request.

## Functions

Each function's folder starts with a comment saying who calls it and how it checks the caller; `config.toml` says
whether the gateway asks for a JWT. Removed in Clean 1 (24 Oct 2026, master plan 28.9): `cron-tick`, `partner` and
`posts-weekly` (retired 410 stubs), `lead` (no page sent it) and `site-assets` (a one-off image import tool, unused
since 26 Sep); they stay in git history.

Browser writes go through membership-checked RPCs or Edge Functions (D206, D226); the browser never writes tables directly.

## Secrets

The list of secrets, where each lives and who reads it is `docs/SECRETS.md`. The cron secret is created inside the
database (Vault `cron_secret`) and never needs to be copied.
