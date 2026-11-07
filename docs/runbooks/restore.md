# Restore from backup: the drill and the real thing

Ready 2 part E (master plan 30.19 section 6, 30.25 item 1: "Kabsi's own daily encrypted backup to R2 with a green restore
drill is the recovery"). Supabase is on the Free plan, which keeps no backup a project can restore from, so Kabsi's own
backup is the one that counts: the Backup workflow (`scripts/backup/backup.sh`) and the Restore drill
(`scripts/backup/restore-drill.sh`). `docs/RUNBOOK.md` page 10 is the incident page; this file is the drill, its timings
and the steps for a real restore.

## What a backup set is

Every Sunday at 02:17 UTC, and by hand (Actions, Backup, Run workflow), one set goes to the private R2 bucket
`kabsi-backups`, folder `weekly/<UTC stamp>/`. The newest 3 sets are kept (21 days).

- `db.dump.age`: `pg_dump` of the database in custom format, encrypted with age (passphrase mode, BACKUP_PASSPHRASE).
- `photos.tar.gz.age`: every Storage file.
- `kabsi-canvas.bundle.age`: a git bundle of every branch and tag.
- `manifest.json`: the sha256 of each file and the row count of every table at the time of the dump.

The backups are weekly, not nightly. "Last night's backup" does not exist on a Saturday, so on 7 Nov 2026 the session ran
the Backup by hand first and restored that set.

## The drill of 7 Nov 2026 (the evidence)

| Step | Run | Start (UTC) | End (UTC) | Took |
|---|---|---|---|---|
| Backup by hand, main at 069c5c2 | Backup run 42361977026 | 09:59:01 | 10:02:55 | 3 min 54 s |
| Restore drill on set 20261107T095927Z | Restore drill run 42362373508 | 10:04:23 | 10:05:23 | 60 s (the restore and checks: 28 s) |
| Restore drill again, with the main tables printed (branch claude/ready2-e) | Restore drill run 42362528419 | 10:06:30 | 10:07:40 | 70 s (the restore and checks: 26 s) |

Result of run 42362373508 (written to `app_settings.backup_drill`, read back 10:05 UTC): ok true; 155 tables checked, 0
wrong (a table may differ from the manifest by 5 percent or 2 rows); pg_restore 0 errors; git bundle main at 069c5c2,
1908 commits; photos 89 files for 89 Storage rows, 0 rows without a file; deletions made after the dump re-applied: 0,
left 0; retention jobs on the copy: ok.

The main tables (manifest count at the dump, count in the restored copy):

From run 42362528419, set 20261107T095927Z; every one equal:

| Table | Manifest | Restored |
|---|---|---|
| auth.users | 9 | 9 |
| public.organizations | 3 | 3 |
| public.locations | 4 | 4 |
| public.location_members | 11 | 11 |
| public.subscriptions | 1 | 1 |
| public.reviews | 26 | 26 |
| public.publications | 39 | 39 |
| public.tasks | 70 | 70 |
| public.knowledge_facts | 65 | 65 |
| public.emails | 147 | 147 |
| public.cards | 4 | 4 |
| public.whatsapp_messages | 140 | 140 |
| public.jobs | 28,522 | 28,522 |
| public.audit_events | 30,164 | 30,164 |
| storage.objects | 89 | 89 |

Encrypted sizes of the set: database 3,627,273 bytes, photos 10,650,830 bytes, repository bundle 348,602,059 bytes.

This was a restore into a scratch Postgres 17 inside the GitHub runner, not into a Supabase branch: Supabase branching is
a paid feature and the project is on Free. The drill proves the dump decrypts, restores with no error and has every row;
it does not prove the Supabase-only parts (Auth settings, Vault, Edge Function secrets), which are listed below.

## How to run the drill (about 5 minutes, nothing to install)

1. GitHub, Actions, **Backup**, **Run workflow** (branch main, dry run off). Wait for green (about 4 minutes).
2. Actions, **Restore drill**, **Run workflow**. Wait for green (about 1 minute).
3. Read the result: the log lines "155 tables checked, 0 wrong", "main table ...", "Photos archive", or the daily staff
   summary (it reads `backup_drill`). A red run prints COUNT, MISSING or "did not decrypt": `docs/RUNBOOK.md` page 10.

The drill also runs by itself on the 1st of each month at 04:23 UTC.

## A real restore (the database is lost or damaged)

Time to expect, from the drill: about 4 minutes for a fresh backup if the database still answers, 1 minute to download
and decrypt, under 30 seconds for `pg_restore` of today's 3.6 MB dump, plus the Supabase steps below (about an hour by
hand, mostly secrets). A build session leads it; Rashid holds the passphrase.

1. Stop writes on the damaged project if it still answers: Supabase, Integrations, Cron, switch each job off (note which
   were on), so no job writes while you restore.
2. Download from R2 (Cloudflare, R2, `kabsi-backups`, `weekly/`, the newest folder that has `manifest.json`):
   `db.dump.age`, `photos.tar.gz.age`, `manifest.json`.
3. Decrypt on a computer with age and PostgreSQL 17: `age -d -o db.dump db.dump.age` (enter BACKUP_PASSPHRASE from the
   password manager), the same for the photos.
4. A new Supabase project in Hussein's organisation, region Frankfurt. Apply every file of `supabase/migrations` in order
   (a session does this with the Supabase connector or `supabase db push`).
5. `pg_restore --no-owner --no-privileges --data-only -d "<new project Session pooler address>" db.dump`.
6. Check: run the drill's count query against the new project and compare with `manifest.json` (the drill script's
   step 2 is the query).
7. Deletions made after the dump: the drill's step 2b re-applies them from `public.deletion_log` of the old project if it
   still answers; if it does not, note the date of the dump in the incident record (anything deleted after it must be
   deleted again by hand from the owners' requests in hello@kabsi.co).
8. Not in the backup, set again by hand: the Vault (`cron_secret`, `qa_smoke_token` and the rest named in
   `docs/SECRETS.md`), every Edge Function secret (`docs/SECRETS.md`), the Auth settings (Site URL, redirect URLs, OTP
   600 seconds, the email templates in `emails/auth/`, captcha), then redeploy the functions (re-run the Deploy workflow).
9. Photos: unpack `photos.tar.gz` and upload each bucket's folder (a session does this with the Storage API).
10. Point the website and the Worker at the new project (Vercel environment variables, `workers/kabsi-go/wrangler.jsonc`
    `TAP_FUNCTION_URL`), then run the nightly smoke by hand (Actions, Smoke) and read it green.
