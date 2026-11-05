# Kabsi status

One page, under 10 KB. Updated 5 Nov 2026, App 4 and Guides 3. The history (tasks, After merge checks, evidence, decisions) is word for word in `docs/progress/archive/`; nothing was deleted. The plan index is `docs/KABSI-PLAN.md`, the core is `docs/KABSI-MASTERPLAN.md`, the order of work is plan section 7.

## Where things stand

- Built and live: sessions 1 to 16, 18, 20, 20a, 20b, hotfix 20h and the 22 Oct sync session. Google is live on Yawmiyati; the first real reply was published and verified; the post removal was verified on Google (23 Oct). kabsi.co runs on Vercel; Creem is the only payment route (test mode, not open). Evidence: `docs/progress/archive/evidence.md` and `where-things-stand.md`.
- Web 2, V4, UX 1 and Email 1 (26 and 27 Oct, PRs 250, 252): public pages, free check, onboarding, emails. Detail: `docs/progress/archive/2026-10-27-*.md`.
- Sec 1 and Sec 2 (PRs 261, 266, 27 Oct), WhatsApp 2 (PRs 268, 270, 271), Billing 2 (PR 269), Price 1 (PRs 285 to 288, list prices 29 and 59, founding 19 and 39) and Web 3 (PRs 289 to 292, 30 Oct). Detail: the dated files in `docs/progress/archive/`.
- Go live 1 (5 Nov 2026, 30.28, R-108): WhatsApp for owners, the nearby check and the AI answer are on; card payments stay closed. Detail: `docs/progress/archive/2026-11-05-golive1.md`.
- Scan 2 (5 Nov 2026, 30.29, R-109, PRs 369 to 372): the free check names the town and country and only businesses Google Maps shows nearby. Detail: `docs/progress/archive/2026-11-05-scan2.md`.
- Copy 3 (5 Nov 2026, 30.29 item 2, 30.30, R-110, PRs 374 to 376): the Go live 1 audit's copy decisions B-001 to B-032 and the Scan 2 follow-ups are on kabsi.co. Detail: `docs/progress/archive/2026-11-05-copy3.md`.
- App 4 (5 Nov 2026, 30.31, R-111, PRs 378 to 388): Dashboard in the header, sign-ins last 30 days (staff pages 12 hours), /login for every case, pages open at the top, the signed-in audit. Detail: `docs/progress/archive/2026-11-05-app4.md`.
- Guides 3 (5 Nov 2026, PRs 385, 387, part C): 27 guides; the server decides per request what is public, so one appears every 2 days at 06:00 UTC to 13 Dec with no deploy. Live: guide 1 200, guide 2 404 until 7 Nov. Detail: `docs/progress/archive/2026-11-05-guides3.md`.
- No customer is live yet. Before the first Meta ad: the DataForSEO top-up and a nearby check on a real business. Before the first paying business: Kapso Pro and the rest of 30.19 section 6 (30.28).

## WhatsApp ladder (master plan 25.5)

The facts say "WhatsApp is live" only when the last step is done. Done 5 Nov 2026: the number is +1 205 745 6874 in its one setting.

| Step | Done | Proof |
|---|---|---|
| Number acquired | 23 Oct 2026 | +1 205-745-6874 connected in the Kapso project Kabsi.co; Kapso health check Passed 10:17 Beirut (master plan 9.8) |
| Profile set | 23 Oct 2026 | Photo, about, email, address, website and description live; the display name "Kabsi" is waiting for Meta's approval (master plan 9.8) |
| Webhook verified | 25 Oct 2026 | Rashid's live phone test: his 12 messages reached Kabsi's function through the registered Kapso webhook (Fix 1, request 49115); his chat export confirms them |
| Templates approved | 29 Oct 2026 | Every account and approval notice has an approved Utility template (lane R, request 58250, 15:16 UTC): the 13 replacements and new names (access change, access lost, Google action, holiday question, profile change, map ready, updates waiting, photo ready, setup step, billing notice v3, staff alert v3, business update v2, work update v2) read APPROVED and UTILITY; the sender switches to them on its hourly status read. Earlier reads: 55390, 55676, 57544 |
| Inbound tested | 25 Oct 2026 | Rashid's live test: 12 messages in, each handled (chat export); the suite (now 231 WhatsApp cases) passes in CI |
| Outbound tested | 25 Oct 2026 | Rashid's live test: 11 replies delivered to his phone (chat export); QA 1's delivered receipt read back. 28 Oct: a real template (`kabsi_staff_alert`) delivered to the staff phone, request 55442 |
| Owners switched on | 5 Nov 2026 | `whatsapp_owners_on` true at 04:32:11 UTC (Rashid's yes, Go live 1); `kabsi_work_update_v2` delivered to Yawmiyati's owner phone at 04:31:08 UTC (request 72591) |

## Open for Rashid (as last recorded; the full table is `docs/progress/archive/steps-only-rashid-can-do.md`)

- Done 25 Oct: Clean 1 drops, the Places purge, the Resend webhook, R2 and the backup secrets, SENTRY_AUTH_TOKEN in Vercel, Pub/Sub, WHATSAPP_LIVE true, the post Undo test (full line in `docs/progress/archive/2026-11-05-golive1.md`).
- Phone test (13b part 1): passed 25 Oct (ladder above). 13b part 2: send START from the staff phone (it is stopped); delete the Supabase secrets SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET and the Supabase SENTRY_AUTH_TOKEN; run `supabase/manual/20261025_drop_slack_leftovers.sql` (expect `0 | 0 | 0 | 0`); remove the Kabsi app from Slack when you like.
- Sec 2: the backup secret, unused secrets, two-step logins (`docs/security/secrets-and-accounts.md` steps 1 to 3); the retention switch (`supabase/data/20261027_sec2_retention_on.sql`); check the go.kabsi.co rate limit is Deployed.
- Postponed to `docs/LATER.md`: the failing Backup run, the disabled branch ruleset, the inbox tests, Sentry membership.
- Supabase Auth: leaked-password protection; paste the four `emails/auth/*.html` templates again, rebuilt on 5 Nov with the WhatsApp line (steps in emails/auth/README.md).
- Email 1: news.kabsi.co in Resend and Cloudflare before lifecycle emails go on (LATER row).
- Google Cloud: Places quotas and budget alerts; contacts and owners on kabsi.co addresses only.
- Hosting (30.25 item 1): Supabase stays on Free until 10 paying businesses or 60 percent of any Free limit, then Pro. Vercel Pro (its free trial first) before paid ads or payments open.
- Price 1: before plans open, the test-mode checkout on both price families (LATER row: set `founding_places_test` to 0 in app_settings for the list price, then back to 30). The live list products are made by the setup action at going live, no dashboard step.
- Creem (session 10): send one test event from Creem's dashboard to the webhook (expect 200 and one `billing_events` row), add the product bundle, mark Yawmiyati's organisation `billing_test` if you want to try the paid buttons. Hussein only at going live (verification, payout). Exact steps: `docs/progress/archive/2026-10-25-session-10-creem.md`.
- A lawyer reads /terms, /privacy and the partner terms (master plan 29.8).
- Master plan 19.6: two-step verification everywhere, recovery codes offline, the second Kabsi Google account.
- Growth 1: the Meta and Speed Insights steps in docs/EVENTS.md (last section).
- V3 heads-up (25 Oct): on the Yawmiyati phone tap Skip on the old photo message, never Yes, and reply No to the monthly question. Detail: `docs/progress/archive/2026-10-26-v3-review-growth.md`.
- Templates: all approved 29 Oct (ladder). Voice notes stay off: the voice test failed for Gulf Arabic and mixed notes (LATER row).
- Check 2: on a phone, pick 3 businesses at kabsi.co/scan, then read today's `places_usage` (autocomplete above 0, details 3 or more); add a Google Cloud quota alert for Places Autocomplete.
- UX 1: after the deploy, `POST /visibility/terms` once (two DataForSEO calls, about 0.15 USD) and the read-back in the UX 1 archive file.
- V1: a free Geoapify key, saved as the Supabase secret GEOAPIFY_API_KEY (clicks in `docs/progress/archive/2026-10-25-v1-visibility-map.md`); until then maps draw on a plain ground. DataForSEO top-up (50 US dollars) before the first Meta ad (30.28; the balance read 0.31 after Scan 2 on 5 Nov); Gemini stays off.
- Scan 2: on a phone, open kabsi.co/scan, pick SEVEN Burgers & Beyond, wait for the nearby places, untick tips and send the report to your email: it should hold the nearby places with "Most places put you ..." under the count, the AI question with its date, and kabsi.co/scan/[code] (the session could not pass Turnstile).

## Open After merge checks and findings

- After merge checks that a session could not run (they need a phone or a person) are in `docs/progress/archive/after-merge.md`. The first session of each kind reads the ones for its own area before starting.
- New in Ops 1 part B: zod 3 to 4 is a session of its own (dependency review names it as an exception); one test row `bounced@resend.dev` is left in `email_suppressions`. Full list in the archive entry.
- Found, not done: `docs/progress/archive/found-not-done.md`. Decisions to confirm: `docs/progress/archive/decisions-to-confirm.md`.
- Session 19 rest closed the session 18 items: the post Undo test passed on 25 Oct (P0.7-05b, undone 3.7 seconds after approval, never sent to Google); Pub/Sub is registered live and a forged push gets 401 (P0.7-03); the push from a real review is still to be seen.

## Recent entries (newest first)

- 5 Nov 2026, App 4 (30.31, R-111): PRs 378 to 388, checked live. Detail: `docs/progress/archive/2026-11-05-app4.md`.
- 5 Nov 2026, Guides 3: PRs 385 (scheduling, template, guide 1), 387 (guides 3 to 20), part C (7 earlier guides rewritten); live on release 5e7fc3c0. Detail: `docs/progress/archive/2026-11-05-guides3.md`.
- 5 Nov 2026, Copy 3 (30.29, 30.30, R-110): PRs 374 (30.30), 375 (copy decisions B-001 to B-032), 376 (Scan 2 follow-ups, speed gate); live on release 841ab8e. Detail: `docs/progress/archive/2026-11-05-copy3.md`.

## How a session updates this page

1. Change "Where things stand", the ladder (only with proof, in the Proof column), "Open for Rashid" and "Recent entries" as needed. Keep this page under 10 KB: drop the oldest recent entry when you add one.
2. Put long evidence (commands run, outputs, SQL read-backs, After merge results, found not done, decisions to confirm) in one new file, `docs/progress/archive/<yyyy-mm-dd>-<session>.md`, and link it in one line under "Recent entries".
3. Use the session report of master plan 25.6: the pull request link, a 3-line summary, the tests actually run (exact commands), what was verified live and how, manual steps left for Rashid, known limits. A merged pull request or a passing mock test is never called live.
4. No em dashes, en dashes or exclamation marks.
