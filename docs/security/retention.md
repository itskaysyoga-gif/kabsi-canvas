# Retention per source

Written by Sec 2 on 27 Oct 2026 (master plan 30.15 section 8, 30.10 and 30.10.1). One row per kind of data Kabsi keeps: what it is, how long, the job that deletes it, and the test or read-back that proves it. Google's rules come first (Business Profile APIs policies: content kept only to manage that business for that owner, deleted within 30 days after it leaves, backups included; Places: nothing kept but the place id). `docs/GOOGLE-ARCHITECTURE.md` section 5 has the policy quotes; the privacy page (`/privacy`, section 9) is the public promise, and nothing here keeps anything longer than it says.

Jobs run in the database with pg_cron (UTC). "pgTAP" means a test in `supabase/tests/` run by CI's Database job; "live" means read back on production on 27 Oct 2026 (`cron.job`).

## Google Business Profile content

| Source | What | How long | Job that deletes it | Test |
|---|---|---|---|---|
| Reviews: text and reviewer name | Comment and name as Google returned them | 30 days after Google last returned them, then blanked | `private.run_retention()`, daily 02:53 (`kabsi_retention`) | pgTAP `retention.sql` |
| Reviews: ids, stars, dates, reply state | What the reply workflow needs | While the business is with Kabsi; deleted 7 days after it leaves | `private.purge_after_leaving()`, daily 02:58 | pgTAP `purge_after_leaving.sql` |
| Drafts and the approved reply text | `reply_drafts.body`, `publications.payload` | Blanked with their review's text | `run_retention()` | pgTAP `retention.sql` |
| Summaries in reports | Weekly report quotes (`weekly_reports.data.quotes`); the AI summary lines carry no review text | Quotes 30 days; the report row while the business is with Kabsi, deleted 7 days after it leaves | `run_retention()`, `purge_after_leaving()` | pgTAP `retention.sql`, `purge_after_leaving.sql` |
| Profile values Kabsi read | Protection before and after, Google's raw answers | 30 days | `run_retention()` | pgTAP `retention.sql` |
| Rating snapshots and performance numbers | Daily rating and count | 30 days | `run_retention()` | pgTAP `retention.sql` |
| Google's state, the Coach's read | Latest only | Deleted 7 days after the business leaves | `purge_after_leaving()` | pgTAP `purge_after_leaving.sql` |
| Pub/Sub notices | Message id, type, resource name (no text) | 90 days | `private.retention_sources()`, daily 03:31 (`kabsi_retention_sources`), new in Sec 2 | pgTAP `sec2_security.sql` section 5 |
| PDFs | No report PDF is stored (the monthly PDF is not built, LATER row); card and review-link PDFs are drawn on request and never stored | Not kept | None needed | `src/routes` and `_shared/review-cards` write no file (read 27 Oct) |

## Places and public data

| Source | What | How long | Job | Test |
|---|---|---|---|---|
| Place id | The only Places field Kabsi keeps | While the business is with Kabsi | Deleted with the business | Google allows it indefinitely |
| Places cache | None kept since session 19 rest (the table stays empty) | Not kept | `private.purge_places_cache()`, hourly (`kabsi_places_cache_purge`) | pgTAP `places_cost_guard.sql`, `profile_check.sql` |
| Map results (Visibility Map, Competitor Watch) | DataForSEO public results: rank, name, cid, place id, category, rating, counts, coordinates | While the business is with Kabsi; deleted 30 days after it leaves | `private.purge_visibility_after_leaving()`, daily 02:59 | pgTAP `sec2_security.sql` (new: no test held it before) |
| Free check results | A visitor's free check | 30 days, or 90 days once linked to a business | `private.purge_free_checks()`, daily 03:41 | pgTAP `sec2_security.sql` (new) |
| AI answers (AI Visibility) | The assistant's answer, sources, named or not | Until the run's `expires_at` (90 days; Gemini answers stay off, LATER row) | `private.purge_ai_expired()`, daily 03:19 | pgTAP `ai_visibility.sql` |

## People who are not yet customers

| Source | What | How long | Job | Test |
|---|---|---|---|---|
| Free check waiting list | Email or number, business, consent words | 365 days | `private.purge_free_check_waitlist()`, daily 03:47 | pgTAP `ux1_waitlist.sql` |
| Free check WhatsApp proof | Hash of the number, place id, consent words, page, time | Until the person asks (privacy page) | On request; the deletion is logged for restores | Deletion log, pgTAP `sec2_security.sql` section 6 |
| Founding 25 applications | Name, WhatsApp number, why now | Accepted: while in the program. Declined: 90 days after the decision. Waitlisted: 180 days after it (`founding_applications.delete_after`, set by a trigger when staff decide) | `retention_sources()` | pgTAP `sec2_security.sql` section 5 |
| Kabsi Partners applications | Name, email, phone, country | Declined: 90 days after the decision, unless a payment record exists (tax law) | `retention_sources()` | pgTAP `sec2_security.sql` |
| Nora chats | The conversation | 12 months after the last message | `private.purge_old_chats()`, daily 03:41 | pgTAP `retention.sql` |
| Nora contacts | Email, name, business, consent | Until the person asks (privacy page); see LATER row on double opt-in | On request; logged for restores | Deletion log |
| Consent records | Anonymous id, country, rule, wording, choice | Kept as proof of the choice | None (legal proof of consent) | Not deleted by design |

## Customers and operations

| Source | What | How long | Job | Test |
|---|---|---|---|---|
| A business deleted by its owner | Everything of that business | 7 days after the request | `delete_location_now` (api cron), cascades; logged for restores | pgTAP `disconnect.sql`; deletion log `sec2_security.sql` |
| Uploaded photos | The file in Storage | 30 days after it is on Google, at once when skipped; and (Sec 2) due as soon as a business has left for 7 days | `run_retention()` and `retention_sources()` mark them due, the `photo_files` job removes the file | pgTAP `retention.sql`, `sec2_security.sql`; Deno `retention.test.ts` |
| Email log | Address, subject, state | 12 months | `run_retention()` | pgTAP `retention.sql` |
| Notification content | The held email body | 7 days | `notifyDue()` (api) | pgTAP `notifications.sql` |
| Notifications | In-app notices | 12 months (new) | `retention_sources()` | pgTAP `sec2_security.sql` |
| Audit log | Who did what, when | 24 months; content fields blanked with their data | `run_retention()` | pgTAP `audit_log.sql`, `retention.sql` |
| Email action links | Token hashes | 30 days after they expire | cron `kabsi_cleanup_action_tokens`, daily 03:17 | live (`cron.job`) |
| WhatsApp buttons | Token hashes, draft hashes | 90 days after use or expiry (new) | `retention_sources()` | pgTAP `sec2_security.sql` |
| Jobs | Finished jobs (payloads are ids) | 30 days after they ended (new) | `retention_sources()` | pgTAP `sec2_security.sql` |
| Job log | Outcomes | 90 days | cron `kabsi_cleanup_jobs_log`, weekly | live |
| Ops events | Staff alerts | 30 days | cron `kabsi_ops_events_retention`, daily 04:23 | live |
| Product events | Event names and ids already sent to PostHog | 30 days after sending (new) | `retention_sources()` | pgTAP `sec2_security.sql` |
| AI run records | Hashes, models, check names | 12 months (new) | `retention_sources()` | pgTAP `sec2_security.sql` |
| Rate limits | Hashed keys | 1 day | cron `kabsi_cleanup_rate_limits`, hourly | live |
| Outgoing HTTP answers (`net._http_response`) | Function answers to the database | 2 days | cron `kabsi_cleanup_http_responses`, daily | live |
| Staff follow-ups | Business name and a note | 180 days after done (new) | `retention_sources()` | pgTAP `sec2_security.sql` |
| WhatsApp number health, invitation lookups | Status rows | 90 days (new) | `retention_sources()` | pgTAP `sec2_security.sql` |
| Refused webhooks | Counts per source, reason, hour | 90 days (new) | `retention_sources()` | pgTAP `sec2_security.sql` section 7 |
| WhatsApp messages and the outbox | Text of the chat | No automatic date today (privacy page: until the person asks) | On request | LATER row: lane R decides a limit |
| Payments | Amount, plan, Creem ids | As tax law requires; the business link removed when the business is deleted | None (legal) | Privacy page |

## Logs outside the database

| Source | What | How long | Who deletes it |
|---|---|---|---|
| Edge Function logs | Scrubbed lines (`_shared/log-scrub.ts`: no email, phone, token, review text) | The Supabase plan's log window | Supabase |
| Platform request log | Request paths; since Sec 2 no token rides in a query string (codes moved to bodies, headers and path segments) | The Supabase plan's log window | Supabase |
| Sentry | Scrubbed errors | Sentry's plan window (90 days) | Sentry |
| PostHog | Events without review text, names or contact details; no session replay on token pages | PostHog's plan window | PostHog |
| Vercel request logs | Paths of kabsi.co | Vercel's plan window | Vercel |

## Backups

| Source | What | How long | Job | Test |
|---|---|---|---|---|
| Weekly backup set (R2 `kabsi-backups`) | Encrypted database dump, Storage files, git bundle | The newest 3 sets (21 days), so a business that left is gone from every copy within 7 + 21 = 28 days | `scripts/backup/backup.sh` step 5 (prune), every Sunday | Restore drill (monthly) lists the sets; `tests/backup-scripts.test.ts` checks `BACKUP_KEEP` is 3 |
| A restore | A copy of an older day | Deletions made after the backup are applied again from `public.deletion_log` (ids only, kept 60 days) and the time-based jobs run on the copy | `scripts/backup/restore-drill.sh` steps 2b and 4 | pgTAP `sec2_security.sql` section 6 (`reapply_deletions`); the drill's result `deletions_reapplied`, `deleted_rows_left` |

## Switch

`private.retention_sources()` (the rows marked new) runs as a dry run until Rashid runs `supabase/data/20261027_sec2_retention_on.sql`: deleting real rows is his step (CLAUDE.md). The dry run keeps only counts in `jobs_log`.
