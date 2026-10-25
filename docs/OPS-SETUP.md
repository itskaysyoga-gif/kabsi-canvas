# Ops setup: the clicks only Rashid can make

Ops 1 part B (R-66, master plan 19.6, 26.6, 29.9 and 30.4), 24 Oct 2026. Everything the build session could do is done;
these are the steps that need your hands, your password manager or your accounts. You type every value yourself. The
build session never sees one, and nothing here is ever pasted into a chat. Each step says how to know it worked. Tick them
in `docs/KABSI-PROGRESS.md` (Open for Rashid) when done.

What the session found on 24 Oct 2026 (so you know what is missing):

| Item | Found | Needs |
| --- | --- | --- |
| Cloudflare R2 | Not enabled on the account (Cloudflare answered "Please enable R2 through the Cloudflare Dashboard") | Step 1 |
| GitHub secrets for backups | Not readable by the session; the workflows report any that are missing by name | Steps 2 and 3 |
| Vercel `SENTRY_AUTH_TOKEN` | Only `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` exist | Step 5 |
| Sentry alerts to hello@kabsi.co | The Sentry login is a personal Gmail, so hello@kabsi.co receives nothing | Step 6 |
| Resend webhook | Done: the endpoint exists and the signing secret is saved (a bounce test added `bounced@resend.dev` to the suppression list) | Nothing |
| DMARC | Done: `_dmarc.kabsi.co` holds `v=DMARC1; p=none; rua=mailto:hello@kabsi.co` (`docs/platforms.md`) | After two clean weeks, change `p=none` to `p=quarantine` |

## 1. Cloudflare R2: enable it and make the bucket kabsi-backups

1. Sign in to dash.cloudflare.com with the Kabsi account (two-step verification on).
2. Left menu, **Storage and databases**, **R2 object storage**, **Overview**.
3. If it asks you to subscribe, choose the **Free** R2 plan (10 GB a month is more than Kabsi's backups need) and add a payment
   method if Cloudflare asks. You are charged nothing under the free limits.
4. Click **Create bucket**. Bucket name: `kabsi-backups`. Location: **Automatic**. Storage class: **Standard**. Do not choose a
   jurisdiction. Click **Create bucket**.
5. Open the bucket, **Settings**. Leave **Public access** and the **r2.dev subdomain** switched off. The bucket stays private.
6. Back on the R2 Overview page, copy the **Account ID** (right side) to somewhere you can paste it in step 3.

## 2. An R2 token that can touch only kabsi-backups

1. R2 Overview, **Manage API tokens** (top right of the R2 page), **Create Account API token** (or **Create API token**).
2. Token name: `kabsi-backups-github`. Permissions: **Object Read and Write**. Specify bucket: **Apply to specific buckets
   only**, and choose `kabsi-backups`. TTL: leave **Forever** or choose 1 year (the rotation reminder is 90 days).
3. Click **Create API token**. The next page shows an **Access Key ID** and a **Secret Access Key** once. Keep the page open
   and go straight to step 3. (Do not use the long "API token value" that is also shown: the backup needs the Access Key ID
   and Secret Access Key pair.)

## 3. Five GitHub secrets (you type them)

GitHub, repository `itskaysyoga-gif/kabsi-canvas`, **Settings**, **Secrets and variables**, **Actions**, **New repository
secret**. Make each of these, name exactly as written:

| Name | What you paste |
| --- | --- |
| `R2_ACCOUNT_ID` | The Account ID from step 1.6 |
| `R2_ACCESS_KEY_ID` | The Access Key ID from step 2.3 |
| `R2_SECRET_ACCESS_KEY` | The Secret Access Key from step 2.3 |
| `SUPABASE_DB_URL` | The database address, from the next list |
| `BACKUP_PASSPHRASE` | A long passphrase you make now, from the list after that |

**SUPABASE_DB_URL**

1. Supabase, project `ynjdqjlmdwjgbfezevxy`, the **Connect** button at the top.
2. Tab **Connection string**, Type **URI**, Method **Session pooler** (port 5432). Not Direct connection (GitHub cannot reach
   it) and not Transaction pooler (port 6543).
3. Copy it. It contains `[YOUR-PASSWORD]`: replace that whole piece with the database password.
4. Do not know the password? **Project Settings**, **Database**, **Database password**, **Reset database password**. Kabsi's
   Edge Functions and website do not use it, so resetting breaks nothing. Save the new one in your password manager.
5. Paste the finished address as the secret.

**BACKUP_PASSPHRASE**

1. In your password manager, generate a passphrase of at least 6 random words, 40 characters or more.
2. Save it in the password manager first, as "Kabsi backup passphrase", and print one paper copy for the safe. Without this
   passphrase nobody can ever read a backup, and GitHub cannot show a secret again once it is saved.
3. Then paste it as the secret.

## 4. First run: prove it works before you trust it

1. GitHub, **Actions**, **Backup**, **Run workflow**, tick **Build and encrypt everything, upload nothing**, **Run workflow**.
   Open the run. Expect green and the line "Dry run: nothing was uploaded". A red line naming a secret means that secret is
   missing or mistyped.
2. Run **Backup** again with the box not ticked. Expect green. In R2, `kabsi-backups`, a folder `weekly/<date>` appears with
   four files (the database, the photos, the repository, a manifest).
3. **Actions**, **Restore drill**, **Run workflow**. Expect green and "Restore drill passed" in the staff summary. Gate: no
   paying customer before this has passed once.
4. The weekly Backup (Sundays) and the monthly Restore drill (the 1st) now run by themselves. If one turns red, GitHub emails
   you; `docs/RUNBOOK.md` page 10 says what to do.

## 5. Sentry source maps (Vercel)

1. Sentry, organisation google-nfc-card-dl, **Settings**, **Developer Settings**, **Organization Tokens**, **Create New
   Token**. Name: `vercel-sourcemaps`. Copy the token when it is shown (once).
2. Vercel, project kabsi-canvas, **Settings**, **Environment Variables**, **Add**. Key: `SENTRY_AUTH_TOKEN`. Value: the token.
   Environments: **Production** only. Switch on **Sensitive**. **Save**.
3. Nothing else is needed (the organisation, project and EU address are built into `scripts/sentry-sourcemaps.mjs`). The next
   production deploy uploads the maps; the build log says "Sentry source maps: uploaded". In Sentry, Releases, the newest
   release is the commit of that deploy.

## 6. Sentry alerts to hello@kabsi.co

Sentry emails alert rules to members of the organisation, so hello@kabsi.co must be a member.

1. Sentry, **Settings**, **Members**, **Invite Members**. Email: `hello@kabsi.co`. Role: **Owner**. **Send invite**.
2. Open the invitation in the hello@kabsi.co mailbox and accept it (set two-step verification when Sentry asks).
3. Tell the build session or the lane R chat "hello@kabsi.co is a Sentry member". They then switch the three existing rules
   "Send a notification for high priority issues" (projects kabsi-web, kabsi-edge, kabsi-go) to email that member, and you
   can remove the personal Gmail member. Urgent alerts also go to staff WhatsApp once session 13b part 2 is built.

## 7. Branch protection on main (master plan 26.6)

1. GitHub, **Settings**, **Rules**, **Rulesets**, **New ruleset**, **New branch ruleset**. Name: `main`. Enforcement: **Active**.
2. Target branches: **Add target**, **Include by pattern**, `main`.
3. Switch on: **Restrict deletions**, **Block force pushes**, **Require a pull request before merging** (set **Required
   approvals** to `0`: no human review is required), and **Require status checks to pass**.
4. Under status checks, **Add checks**, and add each of these (they appear in the list once they have run on a pull
   request; this pull request ran them):
   - App (typecheck, lint, anon JWT guard, tests, build)
   - Edge Functions and Worker (deno check, Deno tests)
   - Prompt gate (evaluation set)
   - Nora gate (60 questions)
   - Secret scan (gitleaks, this pull request's commits)
   - Database (pgTAP on a local Supabase stack)
   - Dependency review
5. Leave **Require branches to be up to date** off (parallel sessions merge main into their own branch before merging).
   Do not add Lighthouse CI: it is report only until Web 2. Leave the bypass list empty.
6. **Create**. Check: open a small pull request with a deliberately failing test and see the merge button stay grey. A build
   session merges its own pull request once the checks are green, as before.
7. Also, **Settings**, **Code security**: **Dependency graph** on (the Dependency review check needs it), **Dependabot
   alerts** and **Dependabot security updates** on (done), **Secret Protection** with **Push protection** on (still open).

## 8. For the email inbox test (30.4)

Done so far (24 Oct 2026): 43 test emails to hello@kabsi.co, all delivered, and four types in your Gmail inbox with DKIM,
SPF and DMARC passing. Still needed from you:

1. Open the hello@kabsi.co mailbox (Zoho) and its Spam folder: the 43 emails start with "Yawmiyati:" and a few other
   subjects. Tell the session whether any is in Spam.
2. Give the session an Outlook address to use for this test only (a new free outlook.com address is fine).
3. Open mail-tester.com, copy the address it shows (it looks like test-xxxx@srv1.mail-tester.com) and give it to the
   session; it sends the emails there and reads the score. The target is 9 of 10 or better.
