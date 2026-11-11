# Kabsi status

One page, under 10 KB. Updated 11 Nov 2026. History is word for word in `docs/progress/archive/`. The plan index is `docs/KABSI-PLAN.md`, the core is `docs/KABSI-MASTERPLAN.md`, the order of work is plan section 7.

## Where things stand

Files named in this list are in `docs/progress/archive/`.

- Built and live: sessions 1 to 16, 18, 20, 20a, 20b, hotfix 20h and the 22 Oct sync session. Google is live on Yawmiyati (first real reply and post removal verified, 23 Oct). kabsi.co on Vercel; Creem the only payment route (test mode). Evidence: `evidence.md`.
- No customer is live yet. Before the first Meta ad (30.35 item 5): the DataForSEO top-up, Vercel Pro and the open lines of `docs/launch1/readiness.md`. Before the first paying business: Kapso Pro and the rest of 30.19 section 6 (30.28).

## WhatsApp ladder (master plan 25.5)

The facts say "WhatsApp is live" only when the last step is done. Done 5 Nov 2026: the number is +1 205 745 6874 in its one setting.

| Step | Done | Proof |
|---|---|---|
| Number acquired | 23 Oct 2026 | +1 205-745-6874 connected in the Kapso project Kabsi.co; Kapso health check Passed 10:17 Beirut (master plan 9.8) |
| Profile set | 23 Oct 2026 | Photo, about, email, address, website and description live; the display name "Kabsi" is waiting for Meta's approval (master plan 9.8) |
| Webhook verified | 25 Oct 2026 | Rashid's live phone test: his 12 messages reached Kabsi's function through the registered Kapso webhook (Fix 1, request 49115); his chat export confirms them |
| Templates approved | 29 Oct 2026 | Every account and approval notice has an approved Utility template (lane R, request 58250): the 13 replacements and new names read APPROVED and UTILITY; the sender switches to them on its hourly status read. Earlier reads: 55390, 55676, 57544 |
| Inbound tested | 25 Oct 2026 | Rashid's live test: 12 messages in, each handled (chat export); the suite (now 231 WhatsApp cases) passes in CI |
| Outbound tested | 25 Oct 2026 | Rashid's live test: 11 replies delivered to his phone (chat export); 28 Oct: template `kabsi_staff_alert` delivered to the staff phone, request 55442 |
| Owners switched on | 5 Nov 2026 | `whatsapp_owners_on` true at 04:32:11 UTC (Rashid's yes, Go live 1); `kabsi_work_update_v2` delivered to Yawmiyati's owner phone at 04:31:08 UTC (request 72591) |

## Open for Rashid (as last recorded; the full table is `docs/progress/archive/steps-only-rashid-can-do.md`)

- The lane R checklist of 7 Nov is Rashid's project doc `claude/kabsi-whats-left-2026-11-07.md` (not in this repository). In short: card payments wait for Creem's live setup; first Meta ad: the DataForSEO top-up, Vercel Pro, `docs/launch1/readiness.md`; first paying business: Kapso Pro and 30.19 section 6; AI credit ends 17 Nov, Sentry budget before 30 Nov.
- 13b part 2: send START from the staff phone (it is stopped); delete the Supabase secrets SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET and the Supabase SENTRY_AUTH_TOKEN; run `supabase/manual/20261025_drop_slack_leftovers.sql` (expect `0 | 0 | 0 | 0`); remove the Kabsi app from Slack when you like.
- Clean 4: run the branch delete script in `docs/progress/archive/2026-11-10-clean4-branches.md` with your own GitHub login (463 branches; expect 12 left).
- Safe 1: make `HARVEY_READ_TOKEN` (`docs/OPS-SETUP.md` step 9); tick the checklist at the end of `docs/runbooks/github-gone.md`; kabsi-harvey still has a daily schedule and the register in its tree.
- Sec 2: the backup secret, unused secrets, two-step logins (`docs/security/secrets-and-accounts.md`); the retention switch (`supabase/data/20261027_sec2_retention_on.sql`).
- Supabase Auth: leaked-password protection; paste the four `emails/auth/*.html` templates again, rebuilt on 5 Nov with the WhatsApp line (steps in emails/auth/README.md).
- Email 1: news.kabsi.co in Resend and Cloudflare before lifecycle emails go on (LATER row).
- Master plan 19.6: two-step verification everywhere, recovery codes offline, second Kabsi Google account.
- Google Cloud: Places quotas and budget alerts; contacts and owners on kabsi.co addresses only.
- Hosting (30.25 item 1): Supabase stays on Free until 10 paying businesses or 60 percent of any Free limit, then Pro. Vercel Pro (its free trial first) before paid ads or payments open.
- Price 1: before plans open, the test-mode checkout on both price families (LATER row: `founding_places_test` 0 for the list price, then back to 30). The live list products are made by the setup action at going live.
- Creem (session 10): send one test event from Creem's dashboard to the webhook (expect 200 and one `billing_events` row), add the product bundle, mark Yawmiyati's organisation `billing_test` if you want to try the paid buttons. Hussein only at going live (verification, payout). Exact steps: `docs/progress/archive/2026-10-25-session-10-creem.md`.
- Growth 1 (25 Oct): the Meta and Speed Insights steps in docs/EVENTS.md (last section).
- Growth 1 (11 Nov): read each listing site's own page, then submit by hand in the order of `docs/marketing/listings.md`; write back the date and live address.
- Check 2: on a phone, pick 3 businesses at kabsi.co/scan, then read today's `places_usage` (autocomplete above 0, details 3 or more); add a Google Cloud quota alert for Places Autocomplete.
- UX 1: after the deploy, `POST /visibility/terms` once (two DataForSEO calls, about 0.15 USD) and the read-back in the UX 1 archive file.
- V1: a free Geoapify key, saved as the Supabase secret GEOAPIFY_API_KEY (clicks in `docs/progress/archive/2026-10-25-v1-visibility-map.md`); until then maps draw on a plain ground. DataForSEO top-up (50 US dollars) before the first Meta ad (30.28; the balance read 0.31 after Scan 2 on 5 Nov); Gemini stays off.
- Scan 2: on a phone, send one real free check report to your email and check it matches the page (steps in `2026-11-05-scan2.md`; the session could not pass Turnstile).
- Scan 3: on /google-review-link download the A6 PDF and scan the printed code (the suggestions check is Launch 4's below).
- Sentry (30.33 item 4): Settings, Subscription, set a pay-as-you-go budget of 5 US dollars for errors, so errors are not dropped before 30 Nov.
- Ready 2: main's protection on (`docs/OPS-SETUP.md` step 7, 2 minutes); run `supabase/manual/20261107_ready2_qa_test_data_delete.sql` (expect 0s, demo_kept 2, demo_viewer_kept 1); did the staff phone get the alerts of 09:50 and 09:51 UTC?
- App 5: may qa-staff@test.local be staff, for live staff runs? (LATER row)
- Launch 1: Founding 25 is private: open its invite link (staff, Programs, Founding 25, Show the link) and send one application named "QA Launch 1 test" (a session removes the row).
- Outbound: before you say start on 10 Dec, the placement test of 30.39 item 13, steps in `2026-11-10-outbound2.md`. Ramp 5 a day, then 10 from day 8; 20 a day waits for 400 strong matches and clean delivery (lane R).
- Partners 3: print the A6 insert from kabsi.co/partner (Your kit) at 100 percent and scan it. Send the NFC card photo on 17 Nov.
- Signup 1, Fix 5: Google web client (origin https://kabsi.co); its ID first in Supabase Auth, Google, "Client IDs" (and secret, nonce check on) and in Vercel `VITE_GOOGLE_WEB_CLIENT_ID`; provider on, `https://kabsi.co/**` redirect; phone check in `2026-11-11-fix5.md`.
- RB-T: on 16 Nov, the 20-message phone script in `docs/kabsi-3/phone-script-2026-11-16.md` from your phone (pass: 18 of 20, no wrong save); start with "reset test".
- Voice 2: check `ELEVENLABS_API_KEY` is set for the whatsapp function and run the 20-note eval once (about 0.2 USD), then the 4 note phone check; exact steps and read-backs in `2026-11-11-voice2.md`. `voice_notes` is switched on only after the key is confirmed.
- Close 1: merge PR 499 (reply.v4) with the admin merge; the rule on main refuses it while the Prompt gate is red, by design (R-130); then check the deployed function names reply.v4. After the DataForSEO top-up, one full free check to see why the one of 6 Nov failed (30.42).

## Open After merge checks and findings

- After merge checks that a session could not run (they need a phone or a person) are in `docs/progress/archive/after-merge.md`. The first session of each kind reads the ones for its own area before starting.
- Ops 1 part B left one test row `bounced@resend.dev` in `email_suppressions` (archive entry).
- Found, not done: `docs/progress/archive/found-not-done.md`. Decisions to confirm: `docs/progress/archive/decisions-to-confirm.md`.

## Recent entries (newest first)

- 11 Nov 2026, Voice 2 (R-158 item 3): merged and deployed (PR 578); `voice_notes` off until the key check (see Open). `2026-11-11-voice2.md`.
- 11 Nov 2026, Home 2 (R-158 item 4): new Home, PR 580. `2026-11-11-home2.md`.
- 11 Nov 2026, Fix 5 (R-158 item 2): PRs 577 and 579. `2026-11-11-fix5.md`.
- Older entries (Cards 2, Growth 1 and Partners 3 `2026-11-11-<name>.md`; Partners 2, Outbound 2, Site 3a, Clean 4, Look 2 and 2b, Founding 1, RB-T, Safe 1, Signup 1, Plan 1, RB-F4, Ops 1 `2026-11-10-<name>.md`; Partners 1, RB-F3 and Tidy 2 in `2026-11-10-tidy2.md`; earlier ones in `2026-11-09-progress-moved.md`).

## How a session updates this page

1. Change "Where things stand", the ladder (only with proof, in the Proof column), "Open for Rashid" and "Recent entries" as needed. Keep this page under 10 KB: drop the oldest recent entry when you add one.
2. Put long evidence (commands run, outputs, SQL read-backs, After merge results, found not done, decisions to confirm) in one new file, `docs/progress/archive/<yyyy-mm-dd>-<session>.md`, and link it in one line under "Recent entries".
3. Use the session report of master plan 25.6: the pull request link, a 3-line summary, the tests actually run (exact commands), what was verified live and how, manual steps left for Rashid, known limits. A merged pull request or a passing mock test is never called live.
4. No em dashes, en dashes or exclamation marks.
