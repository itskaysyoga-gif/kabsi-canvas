# Moved from KABSI-PROGRESS.md by GATE-2, 24 Nov 2026 (30.54 item 8)

Word for word, as the page read before GATE-2.

## Open for Rashid (as last recorded; the full table is `docs/progress/archive/steps-only-rashid-can-do.md`)

- The lane R checklist of 7 Nov is Rashid's project doc `claude/kabsi-whats-left-2026-11-07.md` (not in this repository). In short: card payments wait for Creem's live setup; first Meta ad: the DataForSEO top-up, Vercel Pro, `docs/launch1/readiness.md`; first paying business: Kapso Pro and 30.19 section 6; AI credit ends 17 Nov, Sentry budget before 30 Nov.
- 13b part 2: send START from the staff phone (it is stopped); delete the Supabase secrets SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET and the Supabase SENTRY_AUTH_TOKEN; run `supabase/manual/20261025_drop_slack_leftovers.sql` (expect `0 | 0 | 0 | 0`); remove the Kabsi app from Slack when you like.
- Clean 4: run the branch delete script in `docs/progress/archive/2026-11-10-clean4-branches.md` with your own GitHub login (463 branches; expect 12 left).
- Safe 1: make `HARVEY_READ_TOKEN` (`docs/OPS-SETUP.md` step 9); tick the checklist at the end of `docs/runbooks/github-gone.md`; kabsi-harvey still has a daily schedule and the register in its tree.
- Sec 2: the backup secret, unused secrets, two-step logins (`docs/security/secrets-and-accounts.md`); the retention switch (`supabase/data/20261027_sec2_retention_on.sql`).
- Supabase Auth: leaked-password protection; paste the four `emails/auth/*.html` templates again, rebuilt on 5 Nov with the WhatsApp line (steps in emails/auth/README.md).
- Email 1: news.kabsi.co in Resend and Cloudflare before lifecycle emails go on (LATER row).
- Master plan 19.6: two-step login everywhere, recovery codes offline, second Kabsi Google account.
- Google Cloud: Places quotas and budget alerts; kabsi.co addresses only.
- Hosting (30.25 item 1): Supabase Free until 10 paying businesses or 60 percent of a limit, then Pro. Vercel Pro (free trial first) before paid ads or payments.
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
- Signup 1, Fix 5: the Google web client ID is in Vercel (`VITE_GOOGLE_WEB_CLIENT_ID`, set 12 Nov); confirm it is first in Supabase Auth, Google, "Client IDs" (secret, nonce check on) and the `https://kabsi.co/**` redirect; phone check in `2026-11-11-fix5.md` and `2026-11-12-site3b.md`.
- Fix 6: phone check in `2026-11-12-fix6.md`. Launch gate additions: 30.52 item 10.
- RB-T: on 16 Nov, the 20-message phone script in `docs/kabsi-3/phone-script-2026-11-16.md` from your phone (pass: 18 of 20, no wrong save); start with "reset test".
- Voice 2: `voice_notes` reads `on`. Check `ELEVENLABS_API_KEY` is set for the whatsapp function and run the 20-note eval once (about 0.2 USD), then the 4 note phone check; steps in `2026-11-11-voice2.md`.
- Close 1: merge PR 499 (reply.v4) with the admin merge; the rule on main refuses it while the Prompt gate is red, by design (R-130); then check the deployed function names reply.v4. After the DataForSEO top-up, one full free check to see why the one of 6 Nov failed (30.42).


## Recent entries (newest first)

- 24 Nov 2026, SITE-1 (R-163, PR 594): Home in the nine sections of blueprint 3.1, one price card at 29, How it works, FAQ word for word, About and Security shortened, Partners out of the navigation and sitemap, src/lib/offer.ts, facts and Nora's evaluation sets on the new offer. `2026-11-24-site1.md`.
- 24 Nov 2026, OFFER-2 (R-163): one plan at 29 with a 14-day card trial, founding 19 private, costly jobs off by setting, 2 posts a month, WhatsApp Google-care tools, staff alerts once an hour a kind. `2026-11-24-offer2.md`.
- 24 Nov 2026, FIX-0: Edge Functions refused by the database API since 14 Nov 05:37 UTC; stale work cancelled; key resolver and public /health built; waiting for Rashid's new secret key. `2026-11-24-fix0.md`.
- 24 Nov 2026, PROOF-2: link watch, short weekly summary, monthly report, placement links, pure functions for GATE-2. Migration applied; nothing run live (FIX-0's key). `2026-11-24-proof2.md`.
- Older entries (Site 3b and Fix 6 `2026-11-12-<name>.md`; Home 2, Fix 5, Cards 2, Growth 1 and Partners 3 `2026-11-11-<name>.md`; Partners 2, Outbound 2, Site 3a, Clean 4, Look 2 and 2b, Founding 1, RB-T, Safe 1, Signup 1, Plan 1, RB-F4, Ops 1 `2026-11-10-<name>.md`; Partners 1, RB-F3 and Tidy 2 in `2026-11-10-tidy2.md`; earlier ones in `2026-11-09-progress-moved.md`).
- 12 Nov 2026, Fix 6 (R-162): records 30.52 and four small fixes. `2026-11-12-fix6.md`.
- Older entries (Site 3b `2026-11-12-site3b.md`; Home 2, Fix 5, Cards 2, Growth 1 and Partners 3 `2026-11-11-<name>.md`; Partners 2, Outbound 2, Site 3a, Clean 4, Look 2 and 2b, Founding 1, RB-T, Safe 1, Signup 1, Plan 1, RB-F4, Ops 1 `2026-11-10-<name>.md`; Partners 1, RB-F3 and Tidy 2 in `2026-11-10-tidy2.md`; earlier ones in `2026-11-09-progress-moved.md`).

