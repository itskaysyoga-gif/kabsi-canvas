# Secrets and accounts (Sec 2, 27 Oct 2026)

`docs/SECRETS.md` is the full inventory: every secret by name, where it lives (Supabase secret, Supabase Vault, Vercel env, GitHub secret, Cloudflare Worker secret), what reads it and how often to rotate it. This page holds what Sec 2 found and the steps that are Rashid's. No value is written anywhere.

## Where they live, in short

| Place | Secrets |
|---|---|
| Supabase Edge Function secrets | ANTHROPIC_API_KEY, KAPSO_API_KEY, KAPSO_WEBHOOK_SECRET, CREEM_API_KEY, CREEM_WEBHOOK_SECRET, RESEND_API_KEY, RESEND_WEBHOOK_SECRET, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN, PLACES_API_KEY, CF_API_TOKEN, TAP_SECRET, TURNSTILE_SECRET_KEY, DATAFORSEO_LOGIN and PASSWORD, GEMINI_API_KEY, SENTRY_DSN_EDGE, the settings that are not secret; set by Supabase: SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY |
| Supabase Vault (the database) | cron_secret (internal calls), unsubscribe_key (new in Sec 2), the Kapso webhook secret copy, qa_smoke_token |
| Supabase Auth | The Turnstile secret for the sign-in captcha (the same value as TURNSTILE_SECRET_KEY) |
| Vercel | VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY (public), SENTRY_AUTH_TOKEN (source maps, build only) |
| GitHub Actions | SUPABASE_ACCESS_TOKEN, CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, SUPABASE_DB_URL, BACKUP_PASSPHRASE, R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, ANTHROPIC_API_KEY (by-hand evaluations), QA_SMOKE_TOKEN |
| Cloudflare Worker `kabsi-go` | TAP_SECRET |

The names actually set in Supabase can be listed without values: `select public.call_internal('health', '{"only":"secret_names"}'::jsonb)` and read the answer from `net._http_response` (new in Sec 2, live after the deploy).

## Changed in Sec 2

- **The one-click unsubscribe links have their own key.** `unsubscribe_key` in Vault, made by the migration from random bytes, so nobody has seen it. New links are signed with it; links already in inboxes were signed with the cron secret and keep working (an unsubscribe link must not expire). Rotating the cron secret now no longer touches unsubscribe links made from today.
- **Turnstile fails closed.** `verifyTurnstile` refuses every request when TURNSTILE_SECRET_KEY is missing (and tells Sentry once), except on a local stack. Read back on 27 Oct 2026 before the change: the secret is set and Cloudflare accepts it (`health` turnstile: "secret valid (invalid-input-response)").
- **The backup's database address.** GitHub's runners have no IPv6 and Supabase's direct address answers on IPv6 only, so every Backup run failed at "Network is unreachable" (runs 10, 12 and 13). `scripts/backup/db-url.mjs` now swaps the direct address for the session pooler. Run 16 (27 Oct 2026, this branch) reached the pooler, which refused the password in the secret: Rashid's step 1 below.

## Steps for Rashid

1. **Backup secret.** Supabase, project kabsi, Connect (top bar), Connection string, Type URI, Method **Session pooler**. Copy it. It has this shape:
   `postgresql://postgres.ynjdqjlmdwjgbfezevxy:[YOUR-PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:5432/postgres`
   Put the database password where `[YOUR-PASSWORD]` is. If it has any of `@ : / ? # [ ] %` in it, write those as `%40 %3A %2F %3F %23 %5B %5D %25`. If you do not have the password: Project Settings, Database, Reset database password (nothing else in Kabsi uses it), then use the new one. Paste the result in GitHub, kabsi-canvas, Settings, Secrets and variables, Actions, `SUPABASE_DB_URL`, Update. Then Actions, Backup, Run workflow (main). Expect a green run and "Done." at the end of the Back up step; then Actions, Restore drill, Run workflow, and expect green with `"ok": true`.
2. **Remove unused secrets** (Supabase, Edge Functions, Secrets; delete each): `NOWPAYMENTS_API_KEY`, `NOWPAYMENTS_IPN_SECRET`. Nothing reads them (checked in the code on 27 Oct 2026). The live `secret_names` read after the deploy (27 Oct, request 54290) lists 44 names, names only; of the removal list only these two are Edge Function secrets. `SLACK_BOT_TOKEN`, `SLACK_SIGNING_SECRET`, a Supabase `SENTRY_AUTH_TOKEN` and `Anthropic_Api` are not there: if you see them in GitHub (Settings, Secrets and variables, Actions) or Vercel (Settings, Environment Variables), delete the Slack ones and `Anthropic_Api`; the Vercel `SENTRY_AUTH_TOKEN` stays. Also read on 27 Oct: `KAPSO_WEBHOOK_SECRET` is not an Edge secret because the webhook reads it from Vault (`kapso_webhook_secret`, present), and `SENTRY_DSN_EDGE` is not set, so Edge errors go to the DSN written in `_shared/kabsi.ts` (a DSN can only send reports).
3. **Two-step login on every account** (an authenticator app or a security key; recovery codes printed and kept offline, not in the same password manager):

| Account | Where to switch it on | Who |
|---|---|---|
| GitHub (itskaysyoga-gif) | Settings, Password and authentication, Two-factor authentication | Rashid |
| Supabase | Account preferences, Security, Multi-factor authentication; then Organization settings, Require MFA for all members | Rashid |
| Vercel | Account settings, Authentication, Two-factor authentication | Rashid |
| Cloudflare | My profile, Authentication, Two-factor authentication | Rashid |
| Google (hello@kabsi.co, Advanced Protection) and the second Kabsi Google account | myaccount.google.com, Security, 2-Step Verification | Rashid |
| Resend | Settings, Account, Two-factor authentication | Rashid |
| Creem | Account settings, Security | Hussein |
| Kapso | Profile, Security | Rashid |
| Zoho Mail (hello@kabsi.co) | accounts.zoho.com, Multi-factor authentication | Rashid |
| Sentry, PostHog, UptimeRobot, DataForSEO, Meta | Each account's security settings | Rashid |

   Tick each row in `docs/platforms.md` (row "Second trusted admin") when done. No session can read these settings.
