# If the GitHub account is lost

Safe 1 (lane R decision R-151, section C), 10 Nov 2026. The rule: if GitHub is ever gone (account locked, deleted,
hacked, or GitHub itself down for days), Kabsi must survive. This page is the order of work to get back to a working
build chain. Read the first two sections now, so you know what you would have to do. This repository is public: no value of
any secret is ever written here, only names (`docs/SECRETS.md`).

Who does it: a build session leads, Rashid holds the logins and the passphrase. Rashid can follow the steps by himself.

## What stops, and what keeps working

While GitHub is gone nothing a customer sees stops. Only the building chain stops.

Keeps working, untouched:

- The live site kabsi.co (Vercel keeps serving the last deploy).
- WhatsApp (Kapso, and the `whatsapp` function that answers it) and every other Edge Function already deployed.
- The database, its Auth, Storage and its cron jobs: all of that lives in Supabase and does not read GitHub.
- The go.kabsi.co review-link Worker (Cloudflare).
- The backups already in R2 (they are in Cloudflare, not GitHub).

Stops until you restore:

- CI (every check on a pull request), and merging.
- Deploy on merge: the website (Vercel builds from the GitHub link), the Edge Functions and the Worker (`deploy.yml`).
- The weekly backup (Sunday 02:17 UTC), the monthly restore drill and the weekly advisors.
- The nightly checks: the smoke test (03:30 UTC), the browser check (03:45 UTC), IndexNow.
- Harvey runs (kabsi-harvey-run) and the Harvey source repository.
- Outbound's list: the functions `outbound-prepare` and `outbound-inbox` read the register and write the suppression file
  through the GitHub API (`HARVEY_REPO_TOKEN`), so they fail until the Harvey repository exists somewhere they can read.
  Outbound is not live yet, so nothing is sent by mistake: with no list, nothing goes out.

The backups age out after 21 days (3 weekly sets), so GitHub gone for more than three weeks with the backup stopped means
the newest set is the last one. Start the restore within days, and run the backup by hand from a computer once the
restored repository exists (section "Backup without GitHub", at the end).

## What you need before you start

- Rashid's password manager with: the Kabsi backup passphrase (`BACKUP_PASSPHRASE`), the Harvey data key (`HARVEY_DB_KEY`),
  and the logins for Cloudflare, Vercel, Supabase and (for a new account) the new git host. Without the backup passphrase
  nobody can ever read a backup, and GitHub cannot show a secret again once saved, so a copy that only lives in GitHub
  does not count.
- A computer (Mac, Linux or Windows with WSL) with: git, age, openssl, Node 22 and npm, and a few GB free.
  `brew install git age node@22` or the same names in `apt`.
- About 2 hours without surprises, 4 hours with a login that needs recovering. Estimates below are for the whole step
  including logins; the measured part of each step is in "What was tested".

## The steps, in order

### 1. Get the newest backup from R2 and decrypt it (about 15 minutes)

You need nothing from GitHub for this.

1. Sign in to Cloudflare (dash.cloudflare.com), **R2 object storage**, bucket **kabsi-backups**, folder **weekly/**. Open the
   newest folder that has a `manifest.json` (folders are named with the UTC date and time; newest sorts last). A folder with no
   `manifest.json` is an unfinished upload, take the one before it.
2. Download these files from that folder (select a file, **Download**): `kabsi-canvas.bundle.age`,
   `kabsi-harvey-run.bundle.age`, `kabsi-harvey.bundle.age`, `manifest.json`, and the whole folder `harvey-release/` (the
   files in it end in `.enc`). The database and photos (`db.dump.age`, `photos.tar.gz.age`) are only needed for a database
   restore (`docs/runbooks/restore.md`), not for this page.
   For big files you can use the S3 address instead: R2, **Manage API tokens**, create a token with **Object Read only** on
   `kabsi-backups`, then `aws s3 cp --endpoint-url https://<account id>.r2.cloudflarestorage.com s3://kabsi-backups/weekly/<folder>/ . --recursive`.
3. Check that each file is whole: compare `sha256sum <file>` with the `sha256` of that file in `manifest.json`
   (`jq '.files' manifest.json`). A mismatch means a broken download: download again.
4. Decrypt each bundle. `age` asks for the passphrase on the keyboard, so type the one from the password manager:

   ```bash
   age -d -o kabsi-canvas.bundle kabsi-canvas.bundle.age
   age -d -o kabsi-harvey-run.bundle kabsi-harvey-run.bundle.age
   age -d -o kabsi-harvey.bundle kabsi-harvey.bundle.age
   ```

5. Check each bundle: `git bundle verify kabsi-canvas.bundle` (and the other two). Expect "is okay".
6. The files in `harvey-release/` were encrypted by Harvey itself (not by age) and are copied as they were. Keep them as they
   are. They open only with `HARVEY_DB_KEY` (section 3).

### 2. Restore the repositories to a new home (about 30 minutes, 60 with a new account)

Pick the new home first.

- **A new GitHub account** (recommended: every workflow in the repository runs there as it is). Make the account with
  an email login you control and two-step verification on, then create three **private** repositories named
  `kabsi-canvas`, `kabsi-harvey-run`, `kabsi-harvey`, empty (no README). Make all three private.
- **Another git host** (GitLab, Bitbucket, a self-hosted one): the code and history restore the same way, but none of the
  `.github/workflows` run there. CI, deploy on merge, the backups and the nightly checks must then be rewritten for that
  host, which is a project of its own. Until it exists, use sections 4 and 5 to deploy by hand and "Backup without GitHub".

Do this for each of the three bundles (shown for kabsi-canvas):

```bash
git clone --bare kabsi-canvas.bundle kabsi-canvas.git
cd kabsi-canvas.git
git symbolic-ref HEAD refs/heads/main
git remote add newhome <the new repository address>
git push newhome --all
git push newhome --tags
```

A bundle has no HEAD, so a plain `git clone kabsi-canvas.bundle` warns "remote HEAD refers to nonexistent ref" and
checks out nothing. Use `--bare` as above, or `git clone -b main kabsi-canvas.bundle kabsi-canvas` for a working copy.
For the two Harvey repositories use the same steps; their bundles also hold GitHub's `refs/pull/*` references, which
`--all` leaves out on purpose (a git host refuses them).

Then make the working copy you will build from: `git clone <the new repository address> kabsi-canvas`. Check:
`git log --oneline -1` shows the commit named as `main_sha` in `manifest.json` (or a later one, if you bundled later).

Put back what the bundle cannot carry (it holds files and history, not settings):

- Branch protection: `docs/runbooks/protect-main.ruleset.json` is the ruleset, import it (Settings, Rules, Rulesets, Import).
- In the new GitHub account, install Dependabot (it reads `.github/dependabot.yml`, nothing to do) and give the build
  sessions access (the Claude GitHub app on the new repositories).
- Vercel Git link: section 4, last item.

### 3. Harvey: put the data back (about 20 minutes, only if you want Harvey)

Harvey's data is the four files in `harvey-release/data/`: `harvey.db.enc`, `register.csv.enc`, `osm.tar.enc`,
`run-reports.jsonl.enc`. In `kabsi-harvey-run`, create a release named `data` and attach the four files as they are, then set
the secret `HARVEY_DB_KEY` (same value as before, from the password manager) on that repository. Harvey's own
workflows read the release. To open one file by hand:

```bash
export HARVEY_DB_KEY='<from the password manager>'
openssl enc -aes-256-cbc -pbkdf2 -iter 600000 -md sha256 -salt -pass env:HARVEY_DB_KEY -d -in register.csv.enc | gunzip -c > register.csv
```

(Typing the key into a shell leaves it in the shell history: use `read -s HARVEY_DB_KEY; export HARVEY_DB_KEY` instead.)
`osm.tar.enc` unpacks with `tar -x` after the same command. Then re-create the secrets that repository uses (list at the end of
section 6) and, if Outbound will read the register again, a new `HARVEY_REPO_TOKEN` (fine-grained, Contents read and write on
the new `kabsi-harvey` only) saved as the Supabase secret of that name.

### 4. Deploy the website with the Vercel CLI (about 20 minutes)

The Vercel project is **kabsi-canvas**, in the team **itskaysyoga-5542's projects** (slug `itskaysyoga-5542s-projects`),
region `fra1`. Its environment variables and domains are stored in Vercel and are not lost with GitHub. Run from the
restored `kabsi-canvas` working copy:

```bash
npm install -g vercel
vercel login
vercel link --yes --project kabsi-canvas --scope itskaysyoga-5542s-projects
vercel pull --yes --environment=production
vercel build --prod
vercel deploy --prebuilt --prod
```

`vercel login` asks for an email (a code is sent) or the login method of the account: if the account only had GitHub
as a login, this is the moment that fails, see "Single points of failure". `vercel build` runs the build command in
`vercel.json` (`check-env`, `npm run build`, the Sentry source maps) with the production variables that `vercel pull` fetched.
Afterwards open https://kabsi.co and a few pages, then check the new deployment in the Vercel dashboard (Deployments, the
newest one reads Ready and Production).

Last: so that Vercel deploys on merge again, Vercel, project, **Settings**, **Git**, **Disconnect**, then **Connect Git
Repository** to the new repository (GitHub, GitLab and Bitbucket are supported). Until that is done, `vercel deploy --prebuilt --prod`
is the deploy.

### 5. Deploy the Edge Functions (and the Worker) with the Supabase CLI (about 15 minutes)

The database, its cron jobs, Auth, Storage and the Vault live in Supabase and are untouched. Only the function code
needs a deploy, and only if you changed it since the last one (the live functions keep running as they are).

```bash
npm install -g supabase
export SUPABASE_ACCESS_TOKEN='<a new token: Supabase dashboard, Account, Access tokens>'
printf 'export const RELEASE = "%s";\n' "$(git rev-parse HEAD)" > supabase/functions/_shared/release.ts
supabase functions deploy --project-ref ynjdqjlmdwjgbfezevxy --use-api
git checkout supabase/functions/_shared/release.ts
```

This is exactly what `deploy.yml` does (every function; `verify_jwt` comes from `supabase/config.toml`). Check:
`supabase functions list --project-ref ynjdqjlmdwjgbfezevxy` shows every folder of `supabase/functions` as ACTIVE.

The go.kabsi.co Worker keeps running. To redeploy it:
`cd workers/kabsi-go && CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=... npx wrangler@3.114.17 deploy`.

### 6. Re-create the Actions secrets (about 45 minutes; skip if the new home is not GitHub)

Settings, **Secrets and variables**, **Actions**, **New repository secret**, in the new `kabsi-canvas`. Names and where each
value comes from (all of them are listed in `docs/SECRETS.md`; values are never pasted anywhere but the secret box):

| Secret | Where the value comes from |
| --- | --- |
| `BACKUP_PASSPHRASE` | The password manager (the one copy that can never be re-made) |
| `SUPABASE_ACCESS_TOKEN` | Supabase dashboard, Account, Access tokens, generate a new one |
| `SUPABASE_DB_URL` | Supabase, Project, Connect, **Session pooler** string with the database password (reset the password in Database settings if you do not have it) |
| `R2_ACCOUNT_ID` | Cloudflare, R2, the account id shown on the R2 page |
| `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | Cloudflare, R2, Manage API tokens, a new token with Object Read and Write on `kabsi-backups` only |
| `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` | Cloudflare, My Profile, API Tokens (Workers deploy); the account id as above |
| `ANTHROPIC_API_KEY` | Anthropic console, a new key (only for the by-hand evaluation runs) |
| `QA_SMOKE_TOKEN` | Not armed yet; if armed, the same value as the Vault secret `qa_smoke_token` |
| `HARVEY_READ_TOKEN` | A new fine-grained token with Contents read-only on the new `kabsi-harvey-run` and `kabsi-harvey` (`docs/OPS-SETUP.md`, step 9) |

Also the repository variable `EVAL_LIVE` (false). In `kabsi-harvey-run`: `HARVEY_DB_KEY` (password manager) and, only if
you run the bootstrap, `HARVEY_SOURCE_TOKEN`.

Then prove the chain: **Actions**, **Backup**, **Run workflow** (tick the dry run first, then run it for real), then
**Restore drill**. Both must be green before you call the restore finished.

### Time, all in

| Step | Estimate |
| --- | --- |
| 1. Backup from R2, decrypt | 15 minutes |
| 2. Repositories to a new home | 30 minutes (60 with a new account) |
| 3. Harvey data (optional) | 20 minutes |
| 4. Vercel deploy and Git link | 20 minutes |
| 5. Edge Functions (and Worker) | 15 minutes |
| 6. Actions secrets, backup and drill green | 45 minutes |
| Total | about 2 hours 30 minutes, or 3 hours 30 with a new account and Harvey |

## Backup without GitHub (until the workflows run again)

From a computer that has the restored repository, `aws` (S3 tools), PostgreSQL 17 client tools, `age`, `jq`, Python 3,
the Supabase CLI and the secrets as environment variables: `bash scripts/backup/backup.sh`. It does the same as the
Sunday job (`SUPABASE_DB_URL`, `BACKUP_PASSPHRASE`, `R2_*`, `SUPABASE_ACCESS_TOKEN`, optionally `HARVEY_READ_TOKEN`; for a
different git host set `GIT_SOURCE`, `HARVEY_RUN_SOURCE` and `HARVEY_SOURCE` to the new addresses).

## Single points of failure: can I be locked out of a tool because I signed in with GitHub?

Checked on 10 Nov 2026 with each tool's connector, read only (no account was changed). A connector shows what the account is,
never which login methods it has, so the right column is what to do, not a finding.

| Tool | What the connector showed | Can it be GitHub-only? | What Rashid does |
| --- | --- | --- | --- |
| Vercel | One personal team on the Hobby plan, one member, project `kabsi-canvas` imported from GitHub | Yes, it may be: the account's project import flow is GitHub | Account Settings, **Authentication**: add **Email** and a **Passkey** next to GitHub. The email must be one you can open. Add a second team member when the plan allows it |
| Supabase | One organisation named after the GitHub account ("itskaysyoga-gif's Org"), Free plan | Yes, very likely: the organisation name comes from a GitHub sign-up | Supabase, **Account**, Preferences or sign-in settings: add an email and password login. Also invite a second **Owner** to the organisation (Organization, Team) with a kabsi.co address |
| Cloudflare | Only that the R2 bucket `kabsi-backups` exists (created 25 Oct 2026) | Unknown; this is the one that holds every backup, so it matters most | Cloudflare, My Profile, **Authentication**: two-factor on, recovery codes offline; add a second member with the Super Administrator role on a kabsi.co address |
| Sentry | The signed-in user is a personal Gmail address; organisation `google-nfc-card-dl` | Possibly (Sentry offers GitHub, Google and email) | User Settings, **Security**: add a password to the account, two-factor on. `docs/OPS-SETUP.md` step 6 already moves alerts to hello@kabsi.co; also make hello@kabsi.co an Owner |
| Kapso | OAuth login works; the project the connector reached is named "Alo King", not Kabsi, so it may be another account: this check proves nothing about Kabsi's own Kapso login (the Kapso connector is not used for Kabsi, R-49) | Unknown | Kapso, account settings: add an email login or a second member for the Kabsi project; this tool holds the WhatsApp number, so it matters |

Not checked (no connector): the domain registrar and DNS for kabsi.co, Zoho Mail, Resend, Creem, Google Cloud and the Meta
account. Each needs the same question: can I sign in without GitHub, and is there a second admin? `docs/platforms.md` says
where each stands.

## Rashid's checklist

Tick each, with the date.

- [ ] Every secret named in `docs/SECRETS.md` has its value in the password manager (name it the same as in that file). The
      ones that cannot be re-made are `BACKUP_PASSPHRASE`, `HARVEY_DB_KEY`, `TAP_SECRET`, `TURNSTILE_SECRET_KEY` and the Vault
      secrets (`cron_secret`, `qa_smoke_token`). Print the backup passphrase once and keep the paper in the safe.
- [ ] Logins: Cloudflare, Vercel, Supabase, Sentry and Kapso each have an email login that works without GitHub (table above),
      and a second admin where the tool allows it.
- [ ] GitHub two-step login is on, and its recovery codes are stored offline (printed, in the safe), not in the same
      password manager that is protected by the same phone.
- [ ] The old personal GitHub account (the one that used Rashid's personal Gmail address) is deleted, once confirmed empty:
      no repository, no organisation membership, no Actions secret or personal access token still in use, and no tool in the
      table above signs in through it.
- [ ] Once a quarter: step 1 of this page (get the newest bundle, decrypt it, `git bundle verify`). It takes 10 minutes and
      proves the passphrase you hold still opens the backup.

## What was tested (10 Nov 2026, Safe 1)

On `main` at 22b01cd (the same bundle command and encryption the Sunday job uses), on a build machine:

| Step | Result |
| --- | --- |
| Mirror clone of kabsi-canvas, then `git bundle create --branches --tags` | 2,275 commits on main, 471 branches, bundle 355,950,988 bytes; mirror clone 18 seconds |
| Encrypt (age) and decrypt the bundle | identical bytes, 2 seconds each |
| `git bundle verify` | okay |
| `git clone -b main` from the decrypted bundle | 6 seconds, main at 22b01cd, 2,275 commits |
| `npm ci --registry=https://registry.npmjs.org --legacy-peer-deps --no-audit --no-fund` in the clone | 401 packages, 8 seconds (needs those flags, as in CI and Vercel; plain `npm ci` fails on the lock file) |
| `npm run build` in the clone | exit 0, 10 seconds, `.output` produced |
| `git clone --bare` from the bundle, push `--all` and `--tags` to an empty repository | 471 of 471 branches arrived, 14 seconds |
| Harvey's own openssl command, encrypt then decrypt a test file | the file came back; the encrypted file starts with `Salted__` |
| Backup dry run with real Harvey repositories (read through the build machine's own access) | both bundles verified and encrypted (kabsi-harvey-run 9 refs, kabsi-harvey 28 refs); all 4 release assets copied with their exact sizes and the `Salted__` header |

Not tested, on purpose: `vercel deploy` and `supabase functions deploy` (they would overwrite production), a restore of the
database dump (that is the monthly drill, `docs/runbooks/restore.md`), and a real login to any of the five tools.
