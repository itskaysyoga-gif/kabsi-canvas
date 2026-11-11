# Secrets and environment names

Ops 1 part A (R-66, master plan 19.4), 23 Oct 2026; merged with the old `docs/secrets-inventory.md` (P0.6-08, K-87, K-118) and extended by Ops 1 part B, 24 Oct 2026. Names only. A value never appears in this repository, in a log, in a pull
request, in a screenshot or in a chat: values are typed only into the place named in the third column. This file was made
by reading the code (`Deno.env.get`, `process.env`, `import.meta.env`, the workflows, the Worker config,
`scripts/check-env.mjs` and the database function `internal_secret`), not by reading any platform. `tests/platforms-docs.test.ts`
fails when an Edge Function or the Worker reads a name that is not in this file.

## How to read it

- Where it lives: Supabase secret (Edge Functions, Dashboard, Edge Functions, Secrets), Supabase Vault (the database),
  Vercel env (project settings, Environment Variables), GitHub secret or variable (repository Settings, Secrets and
  variables, Actions), Cloudflare Worker secret (the `kabsi-go` Worker), or Local only (a build session or a laptop).
- Rotate every: 90 days for Anthropic, Kapso, Creem, Resend, Google, the cron secret and the backup keys (R-66); "on leak"
  for the rest, and at once for any of them after a leak or when a person with access leaves. "Not a secret" marks
  settings, switches and identifiers: they are listed so no name in the code is missing, and they need no rotation.
  "Planned" marks a name a later session will create; nothing reads it yet.
- Last rotated: "Not recorded" unless `docs/KABSI-PROGRESS.md` or its archive holds a date. No build session can read a
  rotation date from a platform. Rashid fills the cell in the first time he rotates the secret.
- Every account that holds a secret sits under a kabsi.co address with two-step verification and a second trusted admin
  (K-118); `docs/platforms.md` says where each platform stands. Rotate on the due date, at once if a secret may have been
  seen, and always when a person with access leaves.

## Secrets the code reads

| Name | What it opens | Where it lives | What uses it | Rotate every | Last rotated |
| --- | --- | --- | --- | --- | --- |
| `ANTHROPIC_API_KEY` | Reply, post and Nora calls to Anthropic; prepaid balance, auto-reload off (R-45) | Supabase secret; GitHub secret for the by-hand evaluation runs | `assistant`, drafting, `.github/workflows/ci.yml` and `eval-sample.yml`, `scripts/nora-eval` (also read from the local environment) | 90 days | Not recorded |
| `Anthropic_Api` (older name, read as a fallback) | The same key under its older name | Supabase secret, only if that is the name that was set | drafting, `assistant`, `health`, when `ANTHROPIC_API_KEY` is empty | 90 days | Not recorded |
| `KAPSO_API_KEY` | WhatsApp sending and the project API at Kapso | Supabase secret | `whatsapp` sender | 90 days | Not recorded in PROGRESS (master plan 9.8 says Rashid set the new project key on 23 Oct 2026) |
| `HARVEY_REPO_TOKEN` | GitHub fine-grained token for itskaysyoga-gif/kabsi-harvey only: contents read (data/register.csv) and contents write (kabsi/suppression.txt, hashes only) | Supabase secret | `outbound-prepare`, `outbound-inbox` (Harvey 4A, 30.39) | 90 days | Not set yet (Steps for Rashid, Harvey 4A) |
| `OUTBOUND_TEST_RECIPIENTS` | Not a secret: the test addresses, comma separated, the only ones that may receive Outbound mail in test mode | Supabase secret | `outbound-prepare`, `outbound-send` | When the test inboxes change | Not set yet (Steps for Rashid, Harvey 4A) |
| `ZOHO_SMTP_PASSWORD` | A Zoho Mail app password for rashid@getkabsi.com: SMTP on 465 (sending) and IMAP on 993 (reading replies, read only) | Supabase secret | `outbound-send`, `outbound-inbox` (Harvey 4A, 30.39) | 90 days, and at once if Outbound stops for a complaint | Not set yet (Steps for Rashid, Harvey 4A) |
| `OUTBOUND_SMTP_HOST` | Not a secret: the Zoho SMTP host if it is not smtp.zoho.com (for example smtp.zoho.eu) | Supabase secret, optional | `outbound-send` | Never | Not set (smtp.zoho.com) |
| `OUTBOUND_IMAP_HOST` | Not a secret: the Zoho IMAP host if it is not imap.zoho.com (for example imap.zoho.eu) | Supabase secret, optional | `outbound-inbox` | Never | Not set (imap.zoho.com) |
| `KAPSO_WEBHOOK_SECRET` | Proves a WhatsApp event came from Kapso | Supabase secret | `whatsapp` webhook signature check | 90 days | Not recorded (session 13b part 1 registers the webhook) |
| `CREEM_API_KEY` | Card payments at Creem (test mode until the launch gate) | Supabase secret | `billing-creem` and `_shared/billing.ts` (session 10): the setup action, checkouts, the portal and plan changes, sent only to Creem's API | 90 days | Test key saved by Rashid 23 Oct 2026 |
| `CREEM_WEBHOOK_SECRET` | Proves a payment event came from Creem | Supabase secret | `billing-creem` signature check (session 10) | 90 days | Test secret saved by Rashid 23 Oct 2026 |
| `CREEM_MODE` | `test` or `live`: which Creem API and products Kabsi uses | Supabase secret | `_shared/billing.ts` (session 10) | Not a secret; changed to `live` at going live (10.2.13) | Set to `test` by Rashid 23 Oct 2026 |
| `RESEND_API_KEY` | Sends every Kabsi email | Supabase secret | `_shared/kabsi.ts` (every outgoing email), `health` | 90 days | Not recorded |
| `RESEND_WEBHOOK_SECRET` | Verifies Resend's bounce, complaint and delivery calls | Supabase secret | `email` bounce and complaint webhook | 90 days | The webhook was made in Resend on 24 Oct 2026; Rashid saves its signing secret here (master plan 30.4), date not recorded |
| `GOOGLE_CLIENT_SECRET` | Kabsi's Google Cloud OAuth client (project 856347937978) | Supabase secret | the Google layer (`_shared/google`), `health` | 90 days | 8 Oct 2026 (first set by Hussein, PROGRESS P0.7-01 part 1); no rotation recorded |
| `GOOGLE_REFRESH_TOKEN` | Kabsi's own Google account (hello@kabsi.co, Advanced Protection) for Business Profile calls; never an owner's token | Supabase secret | the Google layer (Kabsi's own hello@kabsi.co token, never an owner's) | 90 days | 8 Oct 2026 (first set by Hussein, PROGRESS P0.7-01 part 1); no rotation recorded |
| `PLACES_API_KEY` | Google Places search | Supabase secret; also read by `scripts/load` from the local environment | `places-search`, `profile-snapshot`, `review-link`, the report, the Google layer, `health` | 90 days | Not recorded |
| Cron secret (`cron_secret`, read in SQL as `internal_secret('cron_secret')`, sent as the `x-cron-secret` header) | Lets the database's schedules call internal functions | Supabase Vault (the database) | pg_cron and database triggers calling `health`, `google-capture`, `api` and other internal functions | 90 days | Not recorded (created by migration 20260925060903) |
| Unsubscribe key (`unsubscribe_key`, read in the email code as `internal_secret('unsubscribe_key')`) | Signs the one-click unsubscribe links (Sec 2: its own key, no longer the cron secret; links signed before stay readable with the cron secret) | Supabase Vault (made by the migration `sec2_approvals_cards` from random bytes; nobody has seen it) | `_shared/notify.ts` (signs), `email` (verifies) | On leak (rotating it ends every unsubscribe link already sent, so only on a leak) | Made 27 Oct 2026 by Sec 2 |
| `SUPABASE_SERVICE_ROLE_KEY` | The database with every right | Supabase secret (set by Supabase itself in every function) | every Edge Function; `scripts/load` reads it as `SERVICE_ROLE_KEY` from a local stack | On leak | Not recorded |
| `SUPABASE_ACCESS_TOKEN` | Deploys Edge Functions, reads the advisors, writes backup results to the staff summary (GitHub); reads Storage for the backup | GitHub secret | `deploy.yml` (deploys the Edge Functions), `backup.yml`, `restore-drill.yml`, `advisors.yml` | On leak | Not recorded |
| `CLOUDFLARE_API_TOKEN` | Deploys the go.kabsi.co Worker from GitHub | GitHub secret | `deploy.yml` (deploys the `kabsi-go` Worker) | On leak | Not recorded |
| `CLOUDFLARE_ACCOUNT_ID` | The Cloudflare account (an identifier) | GitHub secret | `deploy.yml` | On leak | Not recorded |
| `CF_API_TOKEN` | Writes the review-link table in Cloudflare KV | Supabase secret | `kv-sync`, `health` (writes the review-link table in Cloudflare KV) | On leak | Not recorded |
| `TAP_SECRET` | Signs review-link opens between the Worker and the database; salts the daily visitor hash | Supabase secret and Cloudflare Worker secret (the same value in both) | `tap`, the `kabsi-go` Worker, the daily visitor hash | On leak (rotate both places together) | Not recorded |
| `TURNSTILE_SECRET_KEY` | Verifies the Cloudflare bot check on forms and sign-in | Supabase secret; the same value is in Supabase Auth (captcha protection) | `_shared/kabsi.ts` (the bot check on sign-in, the Profile Check, the contact form and Nora), `health` | On leak (rotate both places together) | Not recorded |
| `GEO_SIGN_KEY` (optional) | Signs the approximate city and country that `/api/geo?sign=1` gives Continue with WhatsApp (Signup 1). Not set: both sides derive the key from `SUGGEST_ROUTE_KEY` (Vercel) and Vault `suggest_route_key` (Supabase) with a fixed label, so no new value exists | Vercel env and Supabase secret, the same value in both, only if ever set | `src/routes/api.geo.ts`, `auth-whatsapp` (`_shared/wa-signin.ts` `geoSignKey`) | With the route key, or on leak (rotate both places together) | Not set (derived, 10 Nov 2026) |
| `SLACK_BOT_TOKEN` | Retired: posted to the Slack channels | Supabase secret, unused | Nothing (the `slack` function was removed in session 13b part 2, 25 Oct 2026). Rashid deletes the secret | Delete | Not recorded |
| `SLACK_SIGNING_SECRET` | Retired: verified Slack's calls | Supabase secret, unused | Nothing (removed in session 13b part 2). Rashid deletes the secret | Delete | Not recorded |
| `SENTRY_AUTH_TOKEN` (Supabase) | Retired: read Sentry's issue list for the Slack digest | Supabase secret, unused | Nothing (removed in session 13b part 2; Sentry alerts go by email, 9.9). Rashid deletes the Supabase secret | Delete | Not recorded |
| `SENTRY_AUTH_TOKEN` (a second token, not the one above) | Uploads source maps and release tags for the web app (scopes: project releases and organisation read) | Vercel env, Production only, sensitive; build time only | `scripts/sentry-sourcemaps.mjs` in the Vercel build command (Ops 1 part B, master plan 29.9) | On leak | Not set yet (Rashid creates it: `docs/OPS-SETUP.md`) |
| `SUPABASE_DB_URL` | The Postgres database for `pg_dump` (the Session pooler address with the database password) | GitHub secret | `backup.yml` (`scripts/backup/db-url.mjs` turns a direct `db.<ref>.supabase.co` address into the session pooler, Sec 2) | 90 days, together with the database password | Set before 25 Oct 2026; on 27 Oct 2026 the pooler refused its password (run 16): Rashid pastes it again (`docs/security/secrets-and-accounts.md`) |
| `NOWPAYMENTS_API_KEY`, `NOWPAYMENTS_IPN_SECRET` | Retired: the crypto payments of the old `billing` function (a 410 stub since P0.8-01) | Supabase secret, unused | Nothing reads them (`grep` 27 Oct 2026). Rashid deletes them | Delete | Not recorded |
| `BACKUP_PASSPHRASE` | Encrypts and decrypts every backup (age, passphrase mode, master plan 19.1). Rashid types it and keeps a copy in his password manager and on paper | GitHub secret | `backup.yml`, `restore-drill.yml` | Not on a schedule: changing it leaves older backups readable only with the old one, so rotate it only after a leak and keep the old one until those sets age out (8 weeks) | Not set yet (`docs/OPS-SETUP.md`) |
| `QA_SMOKE_TOKEN` (GitHub) and `qa_smoke_token` (Vault, read in SQL as `internal_secret('qa_smoke_token')`) | The same long random string in both places: lets the nightly browser check and the smoke test ask the `whatsapp` function's smoke route for one staff WhatsApp alert when a night fails (`docs/testing.md`). Not armed yet, so it may not exist | GitHub secret and Supabase Vault (the database) | `qa2-live.yml` (nightly job), `smoke.yml`, `whatsapp` (`_shared/whatsapp/smoke-alert.ts`) | On leak (rotate both places together) | Not set (docs/LATER.md: built, not armed) |
| `HARVEY_READ_TOKEN` | Optional. A GitHub fine-grained token, read-only: Contents read on `kabsi-harvey-run` and `kabsi-harvey` only (both private). Lets the weekly backup bundle both repositories and copy the release assets of `kabsi-harvey-run` (Safe 1, R-151 section C). Without it, or if it cannot read, the backup logs a warning and still succeeds, with no Harvey part that week | GitHub secret (kabsi-canvas, Actions) | `backup.yml` (`scripts/backup/backup.sh`, the Harvey step); never given to pull requests | 90 days | Not set yet (Rashid creates it: `docs/OPS-SETUP.md`, step 9) |
| `HARVEY_DB_KEY` | Encrypts Harvey's data (AES-256, key derived with PBKDF2) before it is stored as release assets and files in `kabsi-harvey-run`. The weekly backup copies those encrypted files as they are, so this key is what opens them: it must also be in Rashid's password manager and on paper (the runbook `docs/runbooks/github-gone.md`). Not read by any Kabsi code or workflow in this repository | GitHub secret in `kabsi-harvey-run` (Settings, Secrets and variables, Actions) | `kabsi-harvey-run` workflows (`contact-list.yml`, `bootstrap.yml`, `funnel.yml`) | Not on a schedule: changing it leaves the older encrypted files readable only with the old key | Not recorded |
| `HARVEY_SOURCE_TOKEN` | Optional. A GitHub fine-grained token that lets `bootstrap.yml` in `kabsi-harvey-run` read `kabsi-harvey` once the source is private | GitHub secret in `kabsi-harvey-run` | `kabsi-harvey-run` `bootstrap.yml` (a one-off, by hand) | 90 days, or delete it when the bootstrap is done | Not recorded |
| `R2_ACCOUNT_ID` | The Cloudflare account that holds the R2 bucket `kabsi-backups` (an identifier, stored with the others) | GitHub secret | `backup.yml`, `restore-drill.yml` | Not a secret | Not set yet (`docs/OPS-SETUP.md`) |
| `R2_ACCESS_KEY_ID` | Half of the R2 token scoped to the bucket `kabsi-backups` (object read and write) | GitHub secret | `backup.yml`, `restore-drill.yml` | 90 days | Not set yet (`docs/OPS-SETUP.md`) |
| `R2_SECRET_ACCESS_KEY` | The other half of that R2 token | GitHub secret | `backup.yml`, `restore-drill.yml` | 90 days | Not set yet (`docs/OPS-SETUP.md`) |
| `DATAFORSEO_LOGIN` | DataForSEO account under hello@kabsi.co: map ranks, AI answers (master plan 27.10) | Supabase secret | V1 to V4 (nothing reads it yet) | On leak | Set 24 Oct 2026 by Rashid (master plan 27.10) |
| `DATAFORSEO_PASSWORD` | The other half of the DataForSEO login | Supabase secret | V1 to V4 (nothing reads it yet) | On leak | Set 24 Oct 2026 by Rashid (master plan 27.10) |
| `GEMINI_API_KEY` | Google's Gemini API, free tier, for AI answer checks (master plan 27.10) | Supabase secret | V2 (nothing reads it yet) | On leak | Set 24 Oct 2026 by Rashid (master plan 27.10) |
| `GEOAPIFY_API_KEY` | Geoapify static map images for the visibility map (master plan 28.2) | Supabase secret | V1 | On leak | Planned: not set yet; V1 gives the clicks |
| `META_CAPI_TOKEN` | Meta Conversions API: server events for CompleteRegistration, StartTrial and Subscribe (master plan 20.4, `_shared/meta-capi.ts`) | Supabase secret | Growth 1 | On leak | Not set yet; the clicks are in docs/EVENTS.md. Until it is set every `meta_capi` job ends as skipped (mock) |
| `ELEVENLABS_API_KEY` | ElevenLabs Scribe for owner voice notes (master plan 30.5; chosen in V3, on for everyone from Voice 2, R-158 item 3). Never used for voice replies | Supabase secret only | V3 | On leak | `_shared/voice/transcribe.ts`; voice notes are on only while `app_settings.voice_notes` is `on`; without the key owners are told they are not switched on yet |
| `VOICE_SCRIBE_MODEL` | Optional: the Scribe model id, when the default (`scribe_v3`, ElevenLabs' current model for recorded audio) has to change without a deploy, for example back to `scribe_v2`. A name, not a secret | Supabase secret (optional) | Voice 2 | Never | Read in `_shared/whatsapp/db.ts`; unset means the default |
| `SENTRY_DSN_EDGE` | Where Edge Function errors go (write only) | Supabase secret | Edge Function error reporting (`_shared/kabsi.ts`); a DSN can only send reports | On leak | Not recorded |
| `SUPABASE_ANON_KEY` | Public database key (publishable, safe in the browser) | Supabase secret (set by Supabase itself); public by design | `api`, `assistant` (calls made as the signed-in caller) | On leak (Supabase rotates it) | Not recorded |

## Settings, switches and identifiers (not secrets)

| Name | What it opens | Where it lives | What uses it | Rotate every | Last rotated |
| --- | --- | --- | --- | --- | --- |
| `SUPABASE_URL` | A setting or identifier, not a secret | Supabase secret (set by Supabase itself) | every Edge Function; `scripts/load` reads it as `SUPABASE_URL` | Not a secret | n/a |
| `VITE_SUPABASE_URL` | A setting or identifier, not a secret | Vercel env; build-time, checked by `scripts/check-env.mjs` | the website (`src/lib/supabase.ts`) | Not a secret | n/a |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | A setting or identifier, not a secret | Vercel env; build-time, checked by `scripts/check-env.mjs` | the website; public by design, it reaches the browser | Not a secret | n/a |
| `GOOGLE_CLIENT_ID` | A setting or identifier, not a secret | Supabase secret | the Google layer, `health` | Not a secret | n/a |
| `GOOGLE_MODE` | A setting or identifier, not a secret | Supabase secret (and `app_settings.google_mode`) | the Google layer; `mock` or `live` | Not a secret | n/a |
| `GOOGLE_PUBSUB_AUDIENCE`, `GOOGLE_PUBSUB_SERVICE_ACCOUNT` | A setting or identifier, not a secret: the audience and the push service account Google signs each Pub/Sub push for (a forged push fails without Google's signature) | Supabase secret (set by Rashid with the Pub/Sub push subscription, P0.7-03) | `google-events`: the token audience and the service account Google signs each push for | Not a secret | n/a |
| `KAPSO_PHONE_NUMBER_ID` | A setting or identifier, not a secret | Supabase secret | `whatsapp` sender | Not a secret | n/a |
| `KAPSO_CONFIG_ID` | A setting or identifier, not a secret | Supabase secret (set 23 Oct 2026 per master plan 9.8; no code reads it yet) | session 13b | Not a secret | n/a |
| `KAPSO_TEMPLATE_REVIEW_ALERT`, `KAPSO_TEMPLATE_POST_READY`, `KAPSO_TEMPLATE_PROFILE_CHANGE`, `KAPSO_TEMPLATE_PROFILE_CHECK` | A setting or identifier, not a secret | Supabase secret | `whatsapp`, `profile-snapshot` (approved template names). The access notice template name is a constant in code (`ACCESS_CHANGE_TEMPLATE`, Fix 1), no secret | Not a secret | n/a |
| `WHATSAPP_LIVE` | A setting or identifier, not a secret | Supabase secret | `whatsapp` (live sends only when `true`) | Not a secret | n/a |
| `APP_URL`, `KABSI_ENV` | A setting or identifier, not a secret | Supabase secret | functions (links in emails, environment tag) | Not a secret | n/a |
| `CF_ACCOUNT_ID`, `CF_KV_NAMESPACE_ID` | A setting or identifier, not a secret | Supabase secret | `kv-sync`, `health` | Not a secret | n/a |
| `DRAFT_MODEL` | A setting or identifier, not a secret | Supabase secret (optional override of the draft model) | `_shared/models.ts` | Not a secret | n/a |
| `NORA_MODEL` | A setting or identifier, not a secret | Local only | `scripts/nora-eval/run-nora-eval.ts` | Not a secret | n/a |
| `EVAL_LIVE` | A setting or identifier, not a secret | GitHub repository variable | `ci.yml` prompt and Nora gates (false until Rashid says so, R-45) | Not a secret | n/a |
| `BASE_REF`, `GITHUB_SHA` | A setting or identifier, not a secret | Set by CI | `scripts/lint-changed.mjs`, `vite.config.ts` | Not a secret | n/a |
| `VERCEL`, `VERCEL_GIT_COMMIT_SHA` | A setting or identifier, not a secret | Set by Vercel | `vite.config.ts` (build preset and release tag) | Not a secret | n/a |
| `DENO_DEPLOYMENT_ID` | A setting or identifier, not a secret | Set by Supabase | `_shared/kabsi.ts` (release tag) | Not a secret | n/a |
| `API_URL`, `DB_URL`, `LOAD_BUSINESSES`, `LOAD_MINUTES`, `LOAD_LATENCY_MS` | A setting or identifier, not a secret | Local only (the local Supabase stack, `scripts/load`, `load.yml`) | `scripts/load/mock-500.ts` | Not a secret | n/a |
| `APP_ORIGIN`, `TAP_FUNCTION_URL` | A setting or identifier, not a secret | `workers/kabsi-go/wrangler.jsonc` (vars) | the Worker | Not a secret | n/a |
| `META_PIXEL_ID` | A setting or identifier, not a secret: the Meta dataset (pixel) for kabsi.co | Supabase secret | Growth 1 (server events) | Not a secret | Not set yet (docs/EVENTS.md) |
| `META_WABA_ID` | A setting or identifier, not a secret: the WhatsApp Business Account id, for Conversions API events from Click to WhatsApp ads | Supabase secret | Growth 1 (server events) | Not a secret | Not set yet (docs/EVENTS.md); without it those events go as website events |
| `VITE_META_PIXEL_ID` | A setting or identifier, not a secret: the same pixel id for the browser | Vercel env (public by design, it reaches the browser) | Growth 1 (the Pixel on public pages, `src/lib/meta-pixel.ts`) | Not a secret | Not set yet (docs/EVENTS.md); without it no Pixel loads |
| `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_URL` | A setting or identifier, not a secret: Kabsi's Sentry organisation, the project `kabsi-web` and the EU address | Vercel env, optional (the defaults in `scripts/sentry-sourcemaps.mjs` are Kabsi's) | `scripts/sentry-sourcemaps.mjs` | Not a secret | n/a |
| `VERCEL_ENV`, `SENTRY_UPLOAD` | A setting or identifier, not a secret: a production build uploads source maps (`SENTRY_UPLOAD=1` forces it by hand) | Set by Vercel; the second is by hand only | `scripts/sentry-sourcemaps.mjs` | Not a secret | n/a |
| `SUPABASE_PROJECT_REF`, `R2_BUCKET`, `BACKUP_KEEP`, `GIT_SOURCE`, `HARVEY_OWNER`, `HARVEY_RUN_SOURCE`, `HARVEY_SOURCE`, `GH_BIN`, `GITHUB_TOKEN`, `AWS_BIN`, `BACKUP_WORKDIR`, `DRILL_WORKDIR`, `SCRATCH_DB_URL`, `DELETIONS_DB_URL` | A setting or identifier, not a secret: knobs of the backup scripts (project address, bucket name `kabsi-backups`, sets kept 3 (the script's own default, R-66), repository to bundle, the Harvey repositories and the stand-ins the pull request run uses, the workflow's own token, test stand-ins, the throwaway Postgres of the restore drill) | Set by the workflow or by hand; none holds a value Rashid types | `scripts/backup/`, `scripts/ops/` | Not a secret | n/a |

## When a secret leaks

1. Rotate it at once in the platform that issued it, then replace it in every place the second column names.
2. Check the platform's log for use between the leak and the rotation.
3. Write the date in the Last rotated cell and a line in `docs/KABSI-PROGRESS.md`. Never write the value anywhere.
4. A key found in git history is rotated, not rewritten out of history (no history rewrite on `main`).

## Second trusted admin

Each platform needs a second person who can sign in if the first cannot (K-87, K-118). The platform-by-platform status is in
`docs/platforms.md`; every open row there is a step for Rashid.
