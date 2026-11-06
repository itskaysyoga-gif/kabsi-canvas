# Kabsi status

One page, under 10 KB. Updated 6 Nov 2026, Launch 3. The history (tasks, After merge checks, evidence, decisions) is word for word in `docs/progress/archive/`; nothing was deleted. The plan index is `docs/KABSI-PLAN.md`, the core is `docs/KABSI-MASTERPLAN.md`, the order of work is plan section 7.

## Where things stand

Files named in this list are in `docs/progress/archive/`.

- Built and live: sessions 1 to 16, 18, 20, 20a, 20b, hotfix 20h and the 22 Oct sync session. Google is live on Yawmiyati; the first real reply was published and verified; the post removal was verified on Google (23 Oct). kabsi.co runs on Vercel; Creem is the only payment route (test mode, not open). Evidence: `docs/progress/archive/evidence.md` and `where-things-stand.md`.
- Web 2, V4, UX 1, Email 1, Sec 1 and 2, WhatsApp 2, Billing 2, Price 1 and Web 3 (26 to 30 Oct): detail in the dated files in `docs/progress/archive/`.
- Go live 1 (5 Nov 2026, 30.28, R-108): WhatsApp for owners, the nearby check and the AI answer are on; card payments stay closed. Detail: `2026-11-05-golive1.md`.
- 5 Nov 2026: Scan 2, Copy 3, App 4, Guides 4, Fix 3, Industries 2 and 3, Style 1, App 5 (PRs 369 to 408). Detail: the dated `2026-11-05-*.md` files.
- App 6 (30.34 item 5, PRs 414, 415): Settings' delivery choice saves in one call and shows at once. `2026-11-05-app6.md`.
- Scan 3 (30.34, R-114, PRs 409 to 419): one bot check per search session; progressive free check; review link tool with an A6 QR card. `2026-11-05-scan3.md`.
- Site 2 (PRs 410, 412, 413, 416, 417): header, footer, WhatsApp marks, photos, About, Beauty salon. `2026-11-05-site2.md`.
- Launch 1 (30.35, R-115, PRs 422 to 427): About without the test business's name; Settings answers at once; Nora's page-link eval; the readiness check in `docs/launch1/readiness.md`. `2026-11-06-launch1.md`.
- Launch 2 (30.36, R-116, PRs 429 to 435): Nora's link filter, server copies of Lead and FreeScanCompleted, Team saves at once, one door to sign-up (/get-started 301 to /scan), holidays by UK nation, Functions in fra1. `2026-11-06-launch2.md`.
- Launch 3 (30.37, R-117, PRs 437 to 440): plan 30.37 and R-117; WhatsApp replies and the free check email link `/login?next=/start` or `/scan/<code>`; /privacy section 15 for businesses on Kabsi's contact list; the QA owner runs pass live. `2026-11-06-launch3.md`.
- No customer is live yet. Before the first Meta ad (30.35 item 5): the DataForSEO top-up, Vercel Pro and the open lines of `docs/launch1/readiness.md`. Before the first paying business: Kapso Pro and the rest of 30.19 section 6 (30.28).

## WhatsApp ladder (master plan 25.5)

The facts say "WhatsApp is live" only when the last step is done. Done 5 Nov 2026: the number is +1 205 745 6874 in its one setting.

| Step | Done | Proof |
|---|---|---|
| Number acquired | 23 Oct 2026 | +1 205-745-6874 connected in the Kapso project Kabsi.co; Kapso health check Passed 10:17 Beirut (master plan 9.8) |
| Profile set | 23 Oct 2026 | Photo, about, email, address, website and description live; the display name "Kabsi" is waiting for Meta's approval (master plan 9.8) |
| Webhook verified | 25 Oct 2026 | Rashid's live phone test: his 12 messages reached Kabsi's function through the registered Kapso webhook (Fix 1, request 49115); his chat export confirms them |
| Templates approved | 29 Oct 2026 | Every account and approval notice has an approved Utility template (lane R, request 58250, 15:16 UTC): the 13 replacements and new names (access change, access lost, Google action, holiday question, profile change, map ready, updates waiting, photo ready, setup step, billing notice v3, staff alert v3, business update v2, work update v2) read APPROVED and UTILITY; the sender switches to them on its hourly status read. Earlier reads: 55390, 55676, 57544 |
| Inbound tested | 25 Oct 2026 | Rashid's live test: 12 messages in, each handled (chat export); the suite (now 231 WhatsApp cases) passes in CI |
| Outbound tested | 25 Oct 2026 | Rashid's live test: 11 replies delivered to his phone (chat export); 28 Oct: template `kabsi_staff_alert` delivered to the staff phone, request 55442 |
| Owners switched on | 5 Nov 2026 | `whatsapp_owners_on` true at 04:32:11 UTC (Rashid's yes, Go live 1); `kabsi_work_update_v2` delivered to Yawmiyati's owner phone at 04:31:08 UTC (request 72591) |

## Open for Rashid (as last recorded; the full table is `docs/progress/archive/steps-only-rashid-can-do.md`)

- Done 25 Oct: Clean 1 drops, the Places purge, the Resend webhook, R2 and the backup secrets, Pub/Sub, WHATSAPP_LIVE true (detail: `docs/progress/archive/2026-11-05-golive1.md`).
- Phone test (13b part 1): passed 25 Oct (ladder above). 13b part 2: send START from the staff phone (it is stopped); delete the Supabase secrets SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET and the Supabase SENTRY_AUTH_TOKEN; run `supabase/manual/20261025_drop_slack_leftovers.sql` (expect `0 | 0 | 0 | 0`); remove the Kabsi app from Slack when you like.
- Sec 2: the backup secret, unused secrets, two-step logins (`docs/security/secrets-and-accounts.md`); the retention switch (`supabase/data/20261027_sec2_retention_on.sql`); the go.kabsi.co rate limit.
- Supabase Auth: leaked-password protection; paste the four `emails/auth/*.html` templates again, rebuilt on 5 Nov with the WhatsApp line (steps in emails/auth/README.md).
- Email 1: news.kabsi.co in Resend and Cloudflare before lifecycle emails go on (LATER row).
- Google Cloud: Places quotas and budget alerts; contacts and owners on kabsi.co addresses only.
- Hosting (30.25 item 1): Supabase stays on Free until 10 paying businesses or 60 percent of any Free limit, then Pro. Vercel Pro (its free trial first) before paid ads or payments open.
- Price 1: before plans open, the test-mode checkout on both price families (LATER row: `founding_places_test` 0 for the list price, then back to 30). The live list products are made by the setup action at going live.
- Creem (session 10): send one test event from Creem's dashboard to the webhook (expect 200 and one `billing_events` row), add the product bundle, mark Yawmiyati's organisation `billing_test` if you want to try the paid buttons. Hussein only at going live (verification, payout). Exact steps: `docs/progress/archive/2026-10-25-session-10-creem.md`.
- A lawyer reads /terms, /privacy and the partner terms (master plan 29.8).
- Master plan 19.6: two-step verification everywhere, recovery codes offline, the second Kabsi Google account.
- Growth 1: the Meta and Speed Insights steps in docs/EVENTS.md (last section).
- Check 2: on a phone, pick 3 businesses at kabsi.co/scan, then read today's `places_usage` (autocomplete above 0, details 3 or more); add a Google Cloud quota alert for Places Autocomplete.
- UX 1: after the deploy, `POST /visibility/terms` once (two DataForSEO calls, about 0.15 USD) and the read-back in the UX 1 archive file.
- V1: a free Geoapify key, saved as the Supabase secret GEOAPIFY_API_KEY (clicks in `docs/progress/archive/2026-10-25-v1-visibility-map.md`); until then maps draw on a plain ground. DataForSEO top-up (50 US dollars) before the first Meta ad (30.28; the balance read 0.31 after Scan 2 on 5 Nov); Gemini stays off.
- Scan 2: on a phone, send one real free check report to your email and check it matches the page (steps in `2026-11-05-scan2.md`; the session could not pass Turnstile).
- Scan 3: on a phone at kabsi.co/scan, type a business name and see suggestions; on /google-review-link download the A6 PDF and scan the printed code.
- Sentry (30.33 item 4): Settings, Subscription, set a pay-as-you-go budget of 5 US dollars for errors, so errors are not dropped before 30 Nov.
- App 5: may qa-staff@test.local be staff, for live staff runs? (LATER row)
- Launch 1: on a phone, type a business at kabsi.co/scan and see suggestions; send one Founding 25 application named "QA Launch 1 test" (a session removes the row).
- Launch 2: to see the Lead and FreeScanCompleted pairs in Meta's Test events, add the Supabase secret META_TEST_EVENT_CODE (and META_CAPI_TOKEN if unset), accept ads on kabsi.co/scan and finish a check; remove the code afterwards.
- Launch 3: read /privacy section 15 and say how long an entry is kept (LATER row, UK GDPR article 14 asks for it). Two WhatsApp lines changed address only; the approved templates hold no link.

## Open After merge checks and findings

- After merge checks that a session could not run (they need a phone or a person) are in `docs/progress/archive/after-merge.md`. The first session of each kind reads the ones for its own area before starting.
- New in Ops 1 part B: zod 3 to 4 is a session of its own (dependency review names it as an exception); one test row `bounced@resend.dev` is left in `email_suppressions`. Full list in the archive entry.
- Found, not done: `docs/progress/archive/found-not-done.md`. Decisions to confirm: `docs/progress/archive/decisions-to-confirm.md`.
- Session 19 rest closed the session 18 items: the post Undo test passed on 25 Oct (P0.7-05b, undone 3.7 seconds after approval, never sent to Google); Pub/Sub is registered live and a forged push gets 401 (P0.7-03); the push from a real review is still to be seen.

## Recent entries (newest first)

- 6 Nov 2026, Launch 3: PRs 437 to 440. `2026-11-06-launch3.md`.
- 6 Nov 2026, Launch 2: PRs 429 to 435. `2026-11-06-launch2.md`.

## How a session updates this page

1. Change "Where things stand", the ladder (only with proof, in the Proof column), "Open for Rashid" and "Recent entries" as needed. Keep this page under 10 KB: drop the oldest recent entry when you add one.
2. Put long evidence (commands run, outputs, SQL read-backs, After merge results, found not done, decisions to confirm) in one new file, `docs/progress/archive/<yyyy-mm-dd>-<session>.md`, and link it in one line under "Recent entries".
3. Use the session report of master plan 25.6: the pull request link, a 3-line summary, the tests actually run (exact commands), what was verified live and how, manual steps left for Rashid, known limits. A merged pull request or a passing mock test is never called live.
4. No em dashes, en dashes or exclamation marks.
