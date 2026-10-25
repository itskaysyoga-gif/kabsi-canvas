# Kabsi runbook: when something fails

Ops 1 part B (R-66, master plan 19, 23 and 30.9 item 5), 24 Oct 2026. One page per failure, written for Rashid, to print
and keep. Each page says how you notice, what to do in order, and when it is over. Nothing here needs code. Where a step
needs a person other than you, it says who. A value (key, password, code) is never written in this file: it lives in the
place `docs/SECRETS.md` names.

Where to look first, for every failure:

1. **kabsi.co/staff, System health.** Red means an open breaker, a dead job, a stuck publication or a job waiting more than
   10 minutes. It also shows failed emails and photos. You can retry or cancel a dead job there.
2. **The daily staff summary.** The weekly backup and the monthly restore drill write their result for it (the settings `backup_last` and `backup_drill` and an ops event each); session 13b part 2 puts it on WhatsApp.
3. **Sentry** (sentry.io, organisation google-nfc-card-dl): new errors, newest first.
4. **GitHub, Actions:** a red Deploy, Backup, Restore drill or Supabase advisors run.

Write what you did and the time in `docs/KABSI-PROGRESS.md` (Open for Rashid) afterwards. Never paste a secret anywhere.

<div style="page-break-after: always"></div>

## 1. Google (reviews or publishing stop)

**You notice:** no new reviews for hours, an approved reply stays "publishing" or fails, owners get "access lost" emails, the
staff page shows an open Google breaker, or Sentry shows `google 401`, `403` or `429`.

1. Open Google Cloud Console, project `smiling-chess-505915-b7` (number 856347937978), APIs and Services, Metrics. Look at
   errors for the Business Profile APIs. A wall of `429` means Kabsi hit the quota (300 a minute): wait 10 minutes, the
   breaker closes by itself.
2. `401` for every business at once: Kabsi's own sign-in expired. The credential is the central Manager account
   hello@kabsi.co through `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` and `GOOGLE_REFRESH_TOKEN` (Supabase secrets).
   Sign in to Google as hello@kabsi.co, re-authorise the OAuth client with the `business.manage` scope, and save the new
   refresh token in Supabase, Edge Functions, Secrets. Write the date in `docs/SECRETS.md`.
3. `403` or "access lost" for one business: the owner removed Kabsi or the profile changed hands. Nothing to fix on Kabsi's
   side. The owner is emailed; if they want Kabsi back they add the group Kabsi Clients (ID 5481006796) as Manager again.
4. `403` for every business, or an email from Google about the project: Google may have limited the project. Open the case
   Hussein holds (Gate A, case 1-4624000041157), answer Google's email from hello@kabsi.co, and tell nobody the cause until
   you know it. Never promise owners a date.
5. To stop every Google write at once while you work: Supabase, SQL editor, run
   `update app_settings set value = 'mock' where key = 'google_mode';`. Reads and writes to Google stop; the demo business
   is always mock. When fixed, set it back to `live`. Say so in PROGRESS.
6. Never ask an owner for a Google password or a verification code. Never work around a refusal from Google.

**Over when:** the staff page is green, a test review reply reaches Google, and `google_mode` reads `live`.

<div style="page-break-after: always"></div>

## 2. Kapso and WhatsApp (messages do not arrive or send)

**You notice:** owners say they got no alert, the staff page shows WhatsApp sends failing, Kapso shows the number as
restricted or disconnected, or Kapso credit is under 5 US dollars.

1. Email still works: review alerts and approvals also go by email, so no reply is lost. Nothing wrong is sent while
   WhatsApp is down; the job queue holds the messages.
2. Open the Kapso project Kabsi.co, WhatsApp numbers, the Kabsi number (+1 205-745-6874): read its health check.
   "Passed" means the problem is not the number.
3. Kapso is down: check Kapso's status page and wait. Do not reconnect or delete the number: that forces a new Meta
   approval and can take days.
4. The number shows restricted or the quality rating fell: stop sending. In Supabase, Edge Functions, Secrets, set
   `WHATSAPP_LIVE` to `false` (sends stop; receiving continues). Open Meta Business Suite, Business support home, read the
   reason, and answer it. Do not start any new conversation until the rating is back. The standby number is planned with
   Kapso Pro (master plan 9.6); until it exists, email is the fallback.
5. Credit low: top up in the Kapso dashboard, Billing.
6. A webhook problem (messages sent to Kabsi get no answer): Kapso, the webhook for the Kabsi number, check the last
   deliveries. A `401` means `KAPSO_WEBHOOK_SECRET` differs from the one in Kapso: set both to the same new value.
7. Never use the Kapso connector from a build session to send to owners (R-49).

**Over when:** a test message to and from Rashid's own phone works, and `WHATSAPP_LIVE` is back to `true` if you changed it.

<div style="page-break-after: always"></div>

## 3. Creem (payments)

Creem is the merchant of record and the account is in Hussein's name. Creem account steps are Hussein's; you decide, he
clicks. Card payments are in test mode and not open to customers yet, so today a Creem failure costs nothing.

**You notice (once payments are open):** a customer says their card failed, the staff page shows a billing event stuck, or
a payment does not turn a plan on.

1. Ask Hussein to open the Creem dashboard and look at the payment and the webhook deliveries. Creem's own status page tells
   you if Creem is down; if it is, wait: nobody is charged twice because Kabsi counts a payment only after Creem confirms it.
2. Plan not switched on after a confirmed payment: in the Creem dashboard resend the webhook event. If it keeps failing,
   check that `CREEM_WEBHOOK_SECRET` in Supabase matches the secret Creem shows (rotate both together).
3. Refund or chargeback: Hussein does it in Creem. Kabsi's partner ledger takes the refund from Creem's event; a chargeback
   after a payout comes off the partner's next payout.
4. Never give a customer a discount code, a cash refund outside Creem or a manual plan, unless Rashid decides it and writes
   it in PROGRESS.
5. Keys: test keys and the webhook secret are in Supabase before session 10; the live keys come from Hussein after Creem's
   business verification. Rotate every 90 days.

**Over when:** the customer's plan shows the right state in the app and the Creem payment and Kabsi's record agree.

<div style="page-break-after: always"></div>

## 4. The AI provider (Anthropic and Gemini)

**You notice:** drafts stop appearing, the staff page shows jobs waiting, Sentry shows `anthropic 401`, `429` or `529`, or
the balance is empty.

1. Nothing wrong is sent. When the AI provider is down, review drafts wait in the queue and are made when it is back. Owners
   are not told anything unless a draft is more than a few hours late.
2. Check status.anthropic.com. If Anthropic is down, wait; the queue catches up.
3. `401` or "credit balance too low": open console.anthropic.com, Billing. AI is on demand with auto-reload off (R-45, R-46):
   add credit by hand. The promotional credit ends 17 Nov 2026.
4. `429`: Kabsi is asking too fast. The per-business and global daily caps (`ai_daily_cap_business`, `ai_daily_cap_global`
   in `app_settings`) exist to stop a runaway; look at the staff page cost line before you raise them.
5. A retired model name: models live in one file (`supabase/functions/_shared/models.ts`); a build session changes the one
   line. Do not edit it yourself.
6. Gemini (AI answer checks, from V2): its key is `GEMINI_API_KEY`; free tier limits stop it quietly; add billing in Google AI
   Studio when the lane R chat says.
7. A leaked key: rotate it at once in the provider console, replace it in Supabase secrets, write the date in
   `docs/SECRETS.md`.

**Over when:** a new review gets a draft within 5 minutes and the staff page shows no waiting AI jobs.

<div style="page-break-after: always"></div>

## 5. DataForSEO (maps and AI answers, from V1)

Until V1 is built nothing calls DataForSEO. This page is for the day it does.

**You notice:** a map or AI answer is missing, a free scan fails, or the provider's spend alert (80 percent of its cap) fires.

1. Open the DataForSEO dashboard (account hello@kabsi.co), API Access, and read the last errors. `40200` or "insufficient
   funds" means the balance is empty: top up (50 US dollars once, at the launch gate; the lane R chat says when).
2. Costs rising: stop the public scan at once by setting `free_scan_daily_cap` to 0 in `app_settings`; scheduled business
   scans keep their own cap. Look for one visitor repeating (Turnstile and 3 scans an hour per visitor stop most).
3. Results look wrong: do not send a report. The calibration check (the centre rank must match a manual Maps search from the
   same spot) decides; tell the lane R chat.
4. The login is `DATAFORSEO_LOGIN` and `DATAFORSEO_PASSWORD` in Supabase secrets. A leaked password: change it in the
   dashboard, update both, write the date in `docs/SECRETS.md`.

**Over when:** one scan for a test business returns a map and the balance is above the alert line.

<div style="page-break-after: always"></div>

## 6. Supabase (database, sign-in, functions, storage)

**You notice:** the site loads but nothing saves, sign-in codes do not arrive, functions return `5xx`, Sentry shows
`connection` or `timeout` errors, or status.supabase.com shows an incident.

1. Check status.supabase.com first. An incident on their side: wait, and do not change anything.
2. Supabase dashboard, project ynjdqjlmdwjgbfezevxy: Reports (CPU, memory, connections) and Logs, Edge Functions. A single
   function failing: read its last errors; a bad deploy is fixed by re-running the last good Deploy workflow in GitHub
   (Actions, Deploy, Run workflow on `main`).
3. Project paused (free plan): Restore project in the dashboard. Supabase Pro with point-in-time recovery is needed before the
   first payment.
4. Bad data or a wrong delete: with Pro, Database, Backups, Point in time, pick a time before the mistake and restore to a
   new project first, then copy rows back. Without Pro, use the newest weekly backup (page 10, Backups).
5. A secret leaked: rotate it in the dashboard (Settings, API for keys; Edge Functions, Secrets for the rest) and follow
   `docs/SECRETS.md`, section When a secret leaks.
6. The advisors: a new security finding arrives on the alerts channel each Monday. Open Supabase, Advisors, read the finding,
   and give it to a build session. Never turn off row level security to make something work.

**Over when:** the staff page is green, a test sign-in code arrives, and the last Deploy run is green.

<div style="page-break-after: always"></div>

## 7. Vercel (the website and app)

**You notice:** kabsi.co does not load or shows an error, a page is broken after a merge, or vercel-status.com shows an
incident.

1. Check www.vercel-status.com. An incident: wait.
2. A bad release: vercel.com, project kabsi-canvas, Deployments. Find the last deployment that was fine (green, before the
   merge), open its menu and choose Promote to Production (instant, no rebuild). Tell the build session which commit broke it.
3. The build fails: open the failed deployment, read the log. A missing `VITE_SUPABASE_URL` or `VITE_SUPABASE_PUBLISHABLE_KEY`
   stops the build on purpose (`scripts/check-env.mjs`): add it under Settings, Environment Variables, for Production,
   Preview and Development. A Sentry token problem never fails a build.
4. Daily deployment limit reached (Hobby plan): wait for the day to roll over, or upgrade to Pro, which is needed before the
   first payment anyway.
5. Domain problem: Settings, Domains, read the error next to kabsi.co and www.kabsi.co. DNS changes are made where the
   domain's DNS lives (Cloudflare page).
6. Previews of `claude/*` and `dependabot/*` branches are off on purpose.

**Over when:** kabsi.co, /pricing and /login load, and the newest Production deployment is the one you chose.

<div style="page-break-after: always"></div>

## 8. Cloudflare (DNS, go.kabsi.co links, the bot check, R2)

**You notice:** review links or QR cards (go.kabsi.co) fail, forms refuse everyone, a domain does not resolve, or
cloudflarestatus.com shows an incident.

1. Review links and cards: open `https://go.kabsi.co/_check`. `200` means the Worker and its list are fine. `503` means the
   list cannot be read: in GitHub, Actions, Deploy, Run workflow on `main` redeploys the Worker; if it still fails, the
   list is rebuilt by the health check, so wait 10 minutes and look again.
2. A bad Worker deploy: Cloudflare, Workers and Pages, kabsi-go, Deployments, roll back to the previous version.
3. Forms and sign-in refuse everyone: Cloudflare, Turnstile, check the widget is active and the hostname list holds kabsi.co.
   `TURNSTILE_SECRET_KEY` must be the same in Supabase secrets and in Supabase Auth (captcha). Rotate both together.
4. DNS: a record was changed or deleted. Cloudflare, DNS, compare with the records Vercel and Resend ask for (Resend:
   Domains, kabsi.co and send.kabsi.co show every record they need). Never delete the `_dmarc`, `resend._domainkey`, SPF or
   MX records.
5. R2 (backups): see page 10. The R2 token is only in GitHub secrets.
6. Two-step verification and recovery codes for the Cloudflare account are in your password manager and on paper.

**Over when:** `go.kabsi.co/_check` answers 200 and a test card opens the Google review page.

<div style="page-break-after: always"></div>

## 9. GitHub (code, deploys, Actions)

**You notice:** Deploy, CI or Backup runs do not start, githubstatus.com shows an incident, or the account is locked or
suspended (an earlier Kabsi account was banned once).

1. Incident on GitHub's side: wait. The live site and functions keep running; only new deploys wait. In an emergency
   deploy a function by hand with the Supabase CLI (`supabase functions deploy NAME --project-ref ynjdqjlmdwjgbfezevxy`),
   signed in with your own access token.
2. A red run: open it, read the first failing step. Do not skip or delete a check to get green.
3. A secret was exposed in a pull request or a log: rotate it first (`docs/SECRETS.md`), then ask a build session to look.
   Secret scanning and push protection should be on (Settings, Code security).
4. Account locked or banned: you still have the code. The weekly backup in R2 holds a git bundle of every branch and tag.
   a. Get the newest `kabsi-canvas.bundle.age` from R2 (Cloudflare, R2, kabsi-backups, weekly, newest folder).
   b. On a computer with `age` installed: `age -d -o kabsi.bundle kabsi-canvas.bundle.age`, enter BACKUP_PASSPHRASE from your
      password manager, then `git clone kabsi.bundle kabsi` and `cd kabsi && git checkout main`.
   c. Make a new GitHub account (kabsi.co address, two-step verification on), create the repository, push every branch.
   d. Reconnect Vercel (Settings, Git), re-add every GitHub secret that `docs/SECRETS.md` lists under GitHub, and run the
      Deploy workflow.
5. Branch protection on `main` must stay on (`docs/OPS-SETUP.md`). If a rule blocks an urgent fix, fix the cause; do not
   remove the rule.

**Over when:** a small pull request goes through CI and Deploy to green.

<div style="page-break-after: always"></div>

## 10. Backups: check them, and restore from them

**What runs:** every Sunday the Backup workflow encrypts the database, the Storage photos and a git bundle (age, passphrase
mode) and stores them in the Cloudflare R2 bucket `kabsi-backups`; the newest 3 weekly sets (21 days) are kept, so with the 7 day purge after a business leaves no copy of its Google data outlives 28 days (master plan 30.10 point 1). On the 1st of each month
the Restore drill restores the newest set into a scratch Postgres and writes the result to the daily staff summary. Gate:
no paying customer before one drill has passed.

**Check:** GitHub, Actions, Backup and Restore drill: green. The staff summary has the date of the last backup and the last
drill. Red or missing for two weeks is an incident: follow this page.

1. A Backup run failed: open it. "These backup secrets are missing" means a GitHub secret was deleted: add it again
   (`docs/OPS-SETUP.md`). `pg_dump` errors about the connection mean `SUPABASE_DB_URL` is wrong or the database password
   changed: copy the Session pooler address again. An R2 error means the R2 token expired: make a new token, update the
   two R2 secrets.
2. A Restore drill failed: open it and read the line that starts "COUNT" or "MISSING". A wrong passphrase prints "did not
   decrypt": the secret `BACKUP_PASSPHRASE` is not the one the backup used. Run the Backup again after fixing the cause,
   then the drill.
3. **Restoring for real** (the database is lost or damaged and Supabase's own backups cannot help). A build session leads
   this; it has not been needed yet, and the monthly drill proves the dump restores cleanly into an empty Postgres:
   a. Download `db.dump.age` and `manifest.json` from the newest finished folder in R2.
   b. `age -d -o db.dump db.dump.age` and enter the passphrase (BACKUP_PASSPHRASE, from your password manager).
   c. Make a new Supabase project. Run every file in `supabase/migrations` in order (a build session does this), then
      `pg_restore --no-owner --no-privileges --data-only -d "<new project Session pooler address>" db.dump`.
   d. The Vault is not in the backup: create a new `cron_secret` in the Vault, and set every Supabase secret again from
      `docs/SECRETS.md`. Owners are not asked to do anything.
   e. Photos: `photos.tar.gz.age` holds the Storage files; a build session uploads them to the buckets.
4. Lost the passphrase: the backups cannot be read by anyone. Keep it in your password manager and one paper copy. If it
   is gone, set a new BACKUP_PASSPHRASE at once so next week's backup is readable, and note the date older sets died.

**Over when:** the last Backup and the last Restore drill are green and the staff summary shows today's or last Sunday's date.
