# Kabsi AUDIT-1 report

24 November 2026, 10:00 to 10:15 UTC. Read from the lane R chat through the Supabase connector on project `kabsi-prod` (`ynjdqjlmdwjgbfezevxy`) and from the repo at commit `ef06e4b`. Read-only: no write, no migration, no deploy, no message. Counts only: no names, emails, phone numbers or message text were read into this report. The Kapso connector was not used (R-49).

## 1. Headline: the backend has been locked out since 14 November

Every server function has been refusing its own database calls for 10 days.

| Evidence | Value |
| --- | --- |
| Last normal scheduler log line | 14 Nov 2026, 05:37 UTC |
| Scheduler log lines per day before | about 1,444 |
| Scheduler log lines in the 10 days since | 5 |
| Calls from the database to the functions, last 6 hours | 910, every one answered 403 forbidden |
| Database API calls from the functions, last 24 hours | 3,762, every one answered 401 |
| The call that fails most | `rpc/internal_secret`, 3,628 times |
| Function responses in the last 24 hours | 3,624 forbidden, 127 unavailable, 3 successful |

What it means: the functions hold a database key (`SUPABASE_SERVICE_ROLE_KEY`) that the database no longer accepts. The stored scheduler secret itself has not changed since 25 September. The most likely cause is that the project's older API keys were switched off or replaced on 14 November. This is not confirmed: the key settings are not readable from here.

What has not run since 14 November:

- Review sync, listing checks, status checks, ratings, task detection.
- Publishing: 8 approved items are waiting in the queue.
- Weekly reports, post preparation (11 runs waiting), holiday prompts, notices.
- The WhatsApp sender and the WhatsApp webhook. The last inbound WhatsApp message on record is 11 November. The last number health check is 14 November.

Nothing was lost: the queue holds 37 waiting jobs and will resume once the key is fixed. No paying customer was affected, because there is none.

The monitoring did not catch it because the monitor runs through the same locked-out path. A check from outside the project is needed.

## 2. Who is in the database

| Item | Count |
| --- | --- |
| Locations | 7: 5 demo, 2 real (both the founder's own, country LB) |
| Location status | 3 active, 4 in onboarding |
| Google connections | 3 granted and syncing, 1 pending, 3 none |
| Organizations | 4 |
| Subscriptions, trials, payments on Creem | 0 subscriptions, 0 trials |
| Plans granted by hand | 3 (2 yearly, 1 six-month) |
| WhatsApp opt-ins | 1 active, 2 pending |
| Phones with a role | 4 owner, 2 prospect, 1 staff |

Confirmed: no customer is live.

## 3. Work on record

| Item | Count |
| --- | --- |
| Reviews held | 51 |
| Review replies published and verified | 9 verified, 2 published, 2 verifying; 13 cancelled, 2 rejected |
| Posts | 8 verified, 9 cancelled, 2 approved and waiting |
| Photos | 7 verified, 2 rejected |
| One-day hours changes | 2 verified |
| Listing changes detected | 4 (3 accepted, 1 waiting) |
| Weekly reports | 21 |
| Open tasks | 41 (15 replies, 13 profile gaps, 8 posts, 4 photo batches, 1 listing change) |

Every one of the 61 publications is recorded with the channel `dashboard`. No review reply has yet been approved from WhatsApp in production.

## 4. WhatsApp

| Item | Value |
| --- | --- |
| Number status at the last check (14 Nov) | Connected, quality green, messaging limited, tier 250 |
| Status history | "degraded / limited" on all 480 checks since 25 October |
| Templates | 25 stored, all approved |
| Inbound messages on record | 148 |
| Replies sent | 81 live, 17 mock |
| Template sends | 58 (55 to staff, 2 monthly update, 1 photo ready) |
| Billing category of messages | 76 service (not billable), 2 utility (billable) |
| Voice notes received | 1 |
| Approvals used from WhatsApp | 1 (a photo) |

What owners actually did on WhatsApp so far: mostly the request book (30 of 30 recorded tool runs), plus help, prices, role and business picks, one stats request, one review link request, one photo.

## 5. Scheduled jobs and settings that contradict version 3

39 scheduled jobs are active. These should be off under the version 3 blueprint and are still on:

| Setting or job | State |
| --- | --- |
| `request_book` | on; 7 customer records and 7 requests exist (test data) |
| `kabsi_outbound_prepare`, `kabsi_outbound_send`, `kabsi_outbound_inbox` | active (sending itself is closed and in test mode; 6 draft emails, none sent) |
| `kabsi_visibility_tick`, `kabsi_ai_visibility_tick` | active; `ai_visibility_mode` live |
| `dataforseo_mode` | live; 204 calls in November |
| `kabsi_partner_payout_run` | active |
| Automatic posts | on for 6 of 7 locations, at 4 a month (blueprint: 2) |
| `billing_open` | off |
| `protection_autofix` | off (correct) |
| `google_writes` | on |
| `voice_notes` | on |

## 6. Spending on record

| Item | Value |
| --- | --- |
| AI drafting, last 30 days | 0 generations |
| Assistant answers (Nora) | 9 answers, 0.74 US dollars: about 0.08 each on the larger model |
| AI answer checks | 0.14 in October, 0.12 in November |
| DataForSEO | 0.36 in October, 0.13 in November |
| Google Places, last 30 days | 39 calls |

## 7. Security advisor

| Level | Finding | Count |
| --- | --- | --- |
| Warning | Functions that run with owner rights and can be called by any signed-in user | 125 |
| Warning | One such function callable without signing in (`suggest_take`) | 1 |
| Warning | Leaked-password protection is off in Auth | 1 |
| Info | Tables with row security on and no policy (closed to browsers, by design) | 72 |

The 125 need a review of which ones check the caller inside. Not a launch blocker for a pilot of five, a blocker before public signup.

## 8. Not read

Storage bucket sizes, the performance advisor, and the live state of the WhatsApp number today (the health check has not run since 14 November).
