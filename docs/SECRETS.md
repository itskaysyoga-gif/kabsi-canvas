# Secrets and environment names

Ops 1 part A (R-66, master plan 19.4), 23 Oct 2026. Names only. A value never appears in this repository, in a log, in
a pull request, in a screenshot or in a chat: values are typed only into the place named in the second column. This
file was made by reading the code (`Deno.env.get`, `process.env`, `import.meta.env`, the workflows, the Worker config,
`scripts/check-env.mjs` and the database function `internal_secret`), not by reading any platform.

## How to read it

- Where it lives: Supabase secret (Edge Functions, Dashboard, Edge Functions, Secrets), Supabase Vault (the database),
  Vercel env (project settings, Environment Variables), GitHub secret or variable (repository Settings, Secrets and
  variables, Actions), Cloudflare Worker secret (the `kabsi-go` Worker), or Local only (a build session or a laptop).
- Rotate every: 90 days for Anthropic, Kapso, Creem, Resend, Google and the cron secret (R-66); "on leak" for the rest,
  and at once for any of them after a leak or when a person with access leaves. "Not a secret" marks settings, switches
  and identifiers: they are listed so no name in the code is missing, and they need no rotation.
- Last rotated: "Not recorded" unless `docs/KABSI-PROGRESS.md` holds a date. No build session can read a rotation date
  from a platform. Rashid fills the cell in the first time he rotates the secret.
- Older cadence: `docs/secrets-inventory.md` (P0.6-08) still says yearly for several of these. This file wins (R-66).
  That file stays for now because `tests/platforms-docs.test.ts` reads it; see Found, not done in PROGRESS.

## Secrets the code reads

| Name | Where it lives | What uses it | Rotate every | Last rotated |
| --- | --- | --- | --- | --- |
| `ANTHROPIC_API_KEY` | Supabase secret; GitHub secret for the by-hand evaluation runs | `assistant`, drafting, `.github/workflows/ci.yml` and `eval-sample.yml`, `scripts/nora-eval` (also read from the local environment) | 90 days | Not recorded |
| `Anthropic_Api` (older name, read as a fallback) | Supabase secret, only if that is the name that was set | drafting, `assistant`, `health`, when `ANTHROPIC_API_KEY` is empty | 90 days | Not recorded |
| `KAPSO_API_KEY` | Supabase secret | `whatsapp` sender | 90 days | Not recorded in PROGRESS (master plan 9.8 says Rashid set the new project key on 23 Oct 2026) |
| `KAPSO_WEBHOOK_SECRET` | Supabase secret | `whatsapp` webhook signature check | 90 days | Not recorded (session 13b part 1 registers the webhook) |
| `CREEM_API_KEY` | Supabase secret | `billing-creem` (session 10; not read by any code yet) | 90 days | Not recorded (not set yet) |
| `CREEM_WEBHOOK_SECRET` | Supabase secret | `billing-creem` signature check (session 10; not read by any code yet) | 90 days | Not recorded (not set yet) |
| `RESEND_API_KEY` | Supabase secret | `_shared/kabsi.ts` (every outgoing email), `health` | 90 days | Not recorded |
| `RESEND_WEBHOOK_SECRET` | Supabase secret | `email` bounce and complaint webhook | 90 days | Not recorded (no webhook exists yet, P0.6-08) |
| `GOOGLE_CLIENT_SECRET` | Supabase secret | the Google layer (`_shared/google`), `health` | 90 days | 8 Oct 2026 (first set by Hussein, PROGRESS P0.7-01 part 1); no rotation recorded |
| `GOOGLE_REFRESH_TOKEN` | Supabase secret | the Google layer (Kabsi's own hello@kabsi.co token, never an owner's) | 90 days | 8 Oct 2026 (first set by Hussein, PROGRESS P0.7-01 part 1); no rotation recorded |
| `PLACES_API_KEY` | Supabase secret; also read by `scripts/load` from the local environment | `places-search`, `profile-snapshot`, `review-link`, the report, the Google layer, `health` | 90 days | Not recorded |
| Cron secret (`cron_secret`, read in SQL as `internal_secret('cron_secret')`, sent as the `x-cron-secret` header) | Supabase Vault (the database) | pg_cron and database triggers calling `health`, `google-capture`, `api` and other internal functions | 90 days | Not recorded (created by migration 20260925060903) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase secret (set by Supabase itself in every function) | every Edge Function; `scripts/load` reads it as `SERVICE_ROLE_KEY` from a local stack | On leak | Not recorded |
| `SUPABASE_ACCESS_TOKEN` | GitHub secret | `.github/workflows/deploy.yml` (deploys the Edge Functions) | On leak | Not recorded |
| `CLOUDFLARE_API_TOKEN` | GitHub secret | `deploy.yml` (deploys the `kabsi-go` Worker) | On leak | Not recorded |
| `CLOUDFLARE_ACCOUNT_ID` | GitHub secret | `deploy.yml` | On leak | Not recorded |
| `CF_API_TOKEN` | Supabase secret | `kv-sync`, `health` (writes the review-link table in Cloudflare KV) | On leak | Not recorded |
| `TAP_SECRET` | Supabase secret and Cloudflare Worker secret (the same value in both) | `tap`, the `kabsi-go` Worker, the daily visitor hash | On leak (rotate both places together) | Not recorded |
| `TURNSTILE_SECRET_KEY` | Supabase secret; the same value is in Supabase Auth (captcha protection) | `_shared/kabsi.ts` (the bot check on sign-in, the Profile Check, the contact form and Nora), `health` | On leak (rotate both places together) | Not recorded |
| `SLACK_BOT_TOKEN` | Supabase secret | `slack` (removed by session 13b part 2, master plan 9.9; delete the secret then) | On leak | Not recorded |
| `SLACK_SIGNING_SECRET` | Supabase secret | `slack` (removed by session 13b part 2; delete the secret then) | On leak | Not recorded |
| `SENTRY_AUTH_TOKEN` | Supabase secret (read by the `slack` function's Sentry digest) | `slack` (removed by session 13b part 2; delete the secret then) | On leak | Not recorded |
| `SENTRY_DSN_EDGE` | Supabase secret | Edge Function error reporting (`_shared/kabsi.ts`); a DSN can only send reports | On leak | Not recorded |
| `SUPABASE_ANON_KEY` | Supabase secret (set by Supabase itself); public by design | `api`, `assistant` (calls made as the signed-in caller) | On leak (Supabase rotates it) | Not recorded |

## Settings, switches and identifiers (not secrets)

| Name | Where it lives | What uses it | Rotate every | Last rotated |
| --- | --- | --- | --- | --- |
| `SUPABASE_URL` | Supabase secret (set by Supabase itself) | every Edge Function; `scripts/load` reads it as `SUPABASE_URL` | Not a secret | n/a |
| `VITE_SUPABASE_URL` | Vercel env; build-time, checked by `scripts/check-env.mjs` | the website (`src/lib/supabase.ts`) | Not a secret | n/a |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Vercel env; build-time, checked by `scripts/check-env.mjs` | the website; public by design, it reaches the browser | Not a secret | n/a |
| `GOOGLE_CLIENT_ID` | Supabase secret | the Google layer, `health` | Not a secret | n/a |
| `GOOGLE_MODE` | Supabase secret (and `app_settings.google_mode`) | the Google layer; `mock` or `live` | Not a secret | n/a |
| `GOOGLE_PUBSUB_AUDIENCE`, `GOOGLE_PUBSUB_SERVICE_ACCOUNT` | Supabase secret (set by Rashid with the Pub/Sub push subscription, P0.7-03) | `google-events`: the token audience and the service account Google signs each push for | Not a secret | n/a |
| `KAPSO_PHONE_NUMBER_ID` | Supabase secret | `whatsapp` sender | Not a secret | n/a |
| `KAPSO_CONFIG_ID` | Supabase secret (set 23 Oct 2026 per master plan 9.8; no code reads it yet) | session 13b | Not a secret | n/a |
| `KAPSO_TEMPLATE_REVIEW_ALERT`, `KAPSO_TEMPLATE_POST_READY`, `KAPSO_TEMPLATE_PROFILE_CHANGE`, `KAPSO_TEMPLATE_PROFILE_CHECK` | Supabase secret | `whatsapp`, `profile-snapshot` (approved template names) | Not a secret | n/a |
| `WHATSAPP_LIVE` | Supabase secret | `whatsapp` (live sends only when `true`) | Not a secret | n/a |
| `APP_URL`, `KABSI_ENV` | Supabase secret | functions (links in emails, environment tag) | Not a secret | n/a |
| `CF_ACCOUNT_ID`, `CF_KV_NAMESPACE_ID` | Supabase secret | `kv-sync`, `health` | Not a secret | n/a |
| `DRAFT_MODEL` | Supabase secret (optional override of the draft model) | `_shared/models.ts` | Not a secret | n/a |
| `NORA_MODEL` | Local only | `scripts/nora-eval/run-nora-eval.ts` | Not a secret | n/a |
| `EVAL_LIVE` | GitHub repository variable | `ci.yml` prompt and Nora gates (false until Rashid says so, R-45) | Not a secret | n/a |
| `BASE_REF`, `GITHUB_SHA` | Set by CI | `scripts/lint-changed.mjs`, `vite.config.ts` | Not a secret | n/a |
| `VERCEL`, `VERCEL_GIT_COMMIT_SHA` | Set by Vercel | `vite.config.ts` (build preset and release tag) | Not a secret | n/a |
| `DENO_DEPLOYMENT_ID` | Set by Supabase | `_shared/kabsi.ts` (release tag) | Not a secret | n/a |
| `API_URL`, `DB_URL`, `LOAD_BUSINESSES`, `LOAD_MINUTES`, `LOAD_LATENCY_MS` | Local only (the local Supabase stack, `scripts/load`, `load.yml`) | `scripts/load/mock-500.ts` | Not a secret | n/a |
| `APP_ORIGIN`, `TAP_FUNCTION_URL` | `workers/kabsi-go/wrangler.jsonc` (vars) | the Worker | Not a secret | n/a |

## Named in the plan, not in the code yet

- Meta Conversions API (`META_CAPI_TOKEN`, `META_DATASET_ID`): only when P0.6-03 is built after launch.
- The backup names for Cloudflare R2 and the age public key: Ops 1 part B gives the exact names. They go only into
  GitHub secrets, typed by Rashid (master plan 19.6).

## When a secret leaks

1. Rotate it at once in the platform that issued it, then replace it in every place the second column names.
2. Check the platform's log for use between the leak and the rotation.
3. Write the date in the Last rotated cell and a line in `docs/KABSI-PROGRESS.md`. Never write the value anywhere.
4. A key found in git history is rotated, not rewritten out of history (no history rewrite on `main`).
