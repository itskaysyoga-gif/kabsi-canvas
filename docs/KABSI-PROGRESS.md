# Kabsi status

One page, under 10 KB. Updated 10 Nov 2026 (Signup 1). History is word for word in `docs/progress/archive/`. The plan index is `docs/KABSI-PLAN.md`, the core is `docs/KABSI-MASTERPLAN.md`, the order of work is plan section 7.

## Where things stand

Files named in this list are in `docs/progress/archive/`.

- Built and live: sessions 1 to 16, 18, 20, 20a, 20b, hotfix 20h and the 22 Oct sync session. Google is live on Yawmiyati (first real reply and post removal verified, 23 Oct). kabsi.co on Vercel; Creem the only payment route (test mode). Evidence: `evidence.md`, `where-things-stand.md`.
- Older status lines (26 Oct to 6 Nov 2026: Web 2 to Web 3, Go live 1, Scan 2 to Site 2, Launch 1 to 4, Speed 2, Harvey 4A and the Outbound test) are word for word in `2026-11-09-progress-moved.md`.
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

- The lane R checklist of 7 Nov is Rashid's project doc `claude/kabsi-whats-left-2026-11-07.md` (not in this repository). In four lines: card payments stay closed until Creem's live setup; the first Meta ad waits for the DataForSEO top-up, Vercel Pro and the open lines of `docs/launch1/readiness.md`; the first paying business waits for Kapso Pro and the rest of 30.19 section 6; the dates that matter are the end of the promotional AI credit on 17 Nov and the Sentry budget before 30 Nov.
- Phone test (13b part 1): passed 25 Oct (ladder above). 13b part 2: send START from the staff phone (it is stopped); delete the Supabase secrets SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET and the Supabase SENTRY_AUTH_TOKEN; run `supabase/manual/20261025_drop_slack_leftovers.sql` (expect `0 | 0 | 0 | 0`); remove the Kabsi app from Slack when you like.
- Sec 2: the backup secret, unused secrets, two-step logins (`docs/security/secrets-and-accounts.md`); the retention switch (`supabase/data/20261027_sec2_retention_on.sql`).
- Supabase Auth: leaked-password protection; paste the four `emails/auth/*.html` templates again, rebuilt on 5 Nov with the WhatsApp line (steps in emails/auth/README.md).
- Email 1: news.kabsi.co in Resend and Cloudflare before lifecycle emails go on (LATER row).
- Google Cloud: Places quotas and budget alerts; contacts and owners on kabsi.co addresses only.
- Hosting (30.25 item 1): Supabase stays on Free until 10 paying businesses or 60 percent of any Free limit, then Pro. Vercel Pro (its free trial first) before paid ads or payments open.
- Price 1: before plans open, the test-mode checkout on both price families (LATER row: `founding_places_test` 0 for the list price, then back to 30). The live list products are made by the setup action at going live.
- Creem (session 10): send one test event from Creem's dashboard to the webhook (expect 200 and one `billing_events` row), add the product bundle, mark Yawmiyati's organisation `billing_test` if you want to try the paid buttons. Hussein only at going live (verification, payout). Exact steps: `docs/progress/archive/2026-10-25-session-10-creem.md`.
- Master plan 19.6: two-step verification everywhere, recovery codes offline, the second Kabsi Google account.
- Growth 1: the Meta and Speed Insights steps in docs/EVENTS.md (last section).
- Check 2: on a phone, pick 3 businesses at kabsi.co/scan, then read today's `places_usage` (autocomplete above 0, details 3 or more); add a Google Cloud quota alert for Places Autocomplete.
- UX 1: after the deploy, `POST /visibility/terms` once (two DataForSEO calls, about 0.15 USD) and the read-back in the UX 1 archive file.
- V1: a free Geoapify key, saved as the Supabase secret GEOAPIFY_API_KEY (clicks in `docs/progress/archive/2026-10-25-v1-visibility-map.md`); until then maps draw on a plain ground. DataForSEO top-up (50 US dollars) before the first Meta ad (30.28; the balance read 0.31 after Scan 2 on 5 Nov); Gemini stays off.
- Scan 2: on a phone, send one real free check report to your email and check it matches the page (steps in `2026-11-05-scan2.md`; the session could not pass Turnstile).
- Scan 3: on /google-review-link download the A6 PDF and scan the printed code (the suggestions check is Launch 4's below).
- Sentry (30.33 item 4): Settings, Subscription, set a pay-as-you-go budget of 5 US dollars for errors, so errors are not dropped before 30 Nov.
- Ready 2: main's protection on (`docs/OPS-SETUP.md` step 7, 2 minutes); run `supabase/manual/20261107_ready2_qa_test_data_delete.sql` (expect 0s, demo_kept 2, demo_viewer_kept 1); did the staff phone get the alerts of 09:50 and 09:51 UTC?
- App 5: may qa-staff@test.local be staff, for live staff runs? (LATER row)
- Launch 1: send one Founding 25 application named "QA Launch 1 test" (a session removes the row).
- Outbound: before you say start, the placement test of 30.39 item 13 (LATER row).
- Signup 1 (PR 554): migration applied 10 Nov (version 20261110125951); turn on the Google provider in Supabase Auth with `https://kabsi.co/**` in the redirect URLs (read 10 Nov: google false); then the 7 step phone check in `2026-11-10-signup1.md`.
- Close 1: merge PR 499 (reply.v4) with the admin merge; the rule on main refuses it while the Prompt gate is red, by design (R-130); then check the deployed function names reply.v4. After the DataForSEO top-up, one full free check to see why the one of 6 Nov failed (30.42).

## Open After merge checks and findings

- After merge checks that a session could not run (they need a phone or a person) are in `docs/progress/archive/after-merge.md`. The first session of each kind reads the ones for its own area before starting.
- Ops 1 part B left one test row `bounced@resend.dev` in `email_suppressions` (archive entry).
- Found, not done: `docs/progress/archive/found-not-done.md`. Decisions to confirm: `docs/progress/archive/decisions-to-confirm.md`.

## Recent entries (newest first)

- 10 Nov 2026, Signup 1 (R-150, PR 554): Continue with WhatsApp ("Kabsi sign in CODE", the device and city in the confirm, Yes it's me, the session minted on the server after the tap), the new sign-in notice with Sign me out everywhere, Google hidden when off and a daily staff alert, the contact email in onboarding. Waits for its migration. `2026-11-10-signup1.md`.
- 10 Nov 2026, Look 2 (R-150 item 2): one render step (`whatsapp/look.ts`) for WhatsApp replies: three blocks (marker and bold title, facts one per line, one status or question), quote lines for reviews and drafts, standing notes in the footer, request lists as WhatsApp list messages (10 rows, then "and N more"); request book, help, switch, off topic and the Google care replies in the window; no button, route, approval path, template or model call changed. Phone check for Rashid in `2026-11-10-look2.md`.
- Older entries (Plan 1 is in `2026-11-10-plan1.md`, RB-F4 in `2026-11-10-rb-f4.md` and Ops 1 in `2026-11-10-ops1.md`; Partners 1, RB-F3, Tidy 2 parts 0, 1 and 3 are in `2026-11-10-tidy2.md` and `2026-11-09-progress-moved.md`; Tidy 2 part 2, Tidy 1 parts 0 to 4, RB-F, Sync 2a, Sync 2b parts A and B) are word for word in `2026-11-09-progress-moved.md`.

## How a session updates this page

1. Change "Where things stand", the ladder (only with proof, in the Proof column), "Open for Rashid" and "Recent entries" as needed. Keep this page under 10 KB: drop the oldest recent entry when you add one.
2. Put long evidence (commands run, outputs, SQL read-backs, After merge results, found not done, decisions to confirm) in one new file, `docs/progress/archive/<yyyy-mm-dd>-<session>.md`, and link it in one line under "Recent entries".
3. Use the session report of master plan 25.6: the pull request link, a 3-line summary, the tests actually run (exact commands), what was verified live and how, manual steps left for Rashid, known limits. A merged pull request or a passing mock test is never called live.
4. No em dashes, en dashes or exclamation marks.
