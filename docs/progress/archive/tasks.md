<!-- Moved verbatim from docs/KABSI-PROGRESS.md on 24 Oct 2026 (docs diet, master plan 27.12). The current status page is docs/KABSI-PROGRESS.md. -->

## Tasks

| ID | Task | Model | Status | PR | Date |
|---|---|---|---|---|---|
| P0.1-01 | Retire the old docs and move Nora's facts file | Sonnet | done (its leftover grep lines cleared by P0.1-01b) | 13 | 4 Oct 2026 |
| P0.1-01b | Remove leftover references to the retired docs | Sonnet | done | 15 | 4 Oct 2026 |
| P0.1-02a | Public site: wording that breaks Google's rules or describes removed features | Sonnet | merged (17, 18); live After-merge checks not run, see Evidence | 17, 18 | 4 Oct 2026 |
| P0.1-02b | App, emails and Nora: the same wording fixes | Sonnet | merged in two parts (19, 20); mock-review check passed; live app check and auth template paste still open | 19, 20 | 4 Oct 2026 |
| P0.1-03 | Move hosting to Vercel and switch kabsi.co (replaces "Move kabsi.co to the new build") | Sonnet | merged in three parts (56, 58, 61); After-merge passed except the 390 px look, a preview email-code sign-in, and a before and after `dig` comparison of the Zoho records (see Evidence); then done | 56, 58, 61 | 8 Oct 2026 |
| H-TANSTACK-XSS | Security hotfix: TanStack Start 1.168.32 to 1.168.60 (CVE-2026-102989) | Opus | merged (52, 70c1188); Vercel production build passes; live on kabsi-app.lovable.app only after Hussein's Lovable sync and Publish, see After merge | 52 | 8 Oct 2026 |
| H-20H-TURNSTILE | Hotfix 20h: Turnstile check refused on every form; interaction-only widget, Try again line, error codes to Sentry and logs, health check | Opus | merged (175, fb82240), live 09:13 UTC; forms work only after Rashid step 11 (the secret), then the After-merge checks | 175 | 22 Oct 2026 |
| P0.1-04a | AI and Google-rules fixes in drafting, part A: replies and posts without contact details, no review-derived keywords, no report quotes, review cap | Opus | merged (23); After-merge checks partly run, see Evidence | 23 | 4 Oct 2026 |
| P0.1-04b | AI and Google-rules fixes in drafting, part B: `ai_usage` migration, per-business and global daily AI budget, owner message, #kabsi-alerts | Opus | merged (24); After-merge checks partly run, see Evidence | 24 | 4 Oct 2026 |
| P0.1-05 | Design tokens and shared components | Sonnet | merged (25); `/design` not yet looked at as staff | 25 | 4 Oct 2026 |
| P0.1-06 | Demo workspace with fictional businesses | Opus | merged (28, 29); After-merge: Deploy and ops_events checks passed; mock-review email check and browser checks still open, see Evidence | 28, 29 | 4 Oct 2026 |
| P0.1-06c | Move the demo login to a kabsi.co address | Opus | merged (63); migration live and read back; Hussein's one sign-in check under After merge, then done | 63 | 8 Oct 2026 |
| P0.1-V1 | Brand kit text and shot sheets for videos 1 to 8 | Sonnet (run on Opus in Hussein's session) | done (merged 31 on Hussein's "merge"; docs only, no After-merge checks) | 31 | 4 Oct 2026 |
| P0.1-V2 | Shot sheets for videos 9 to 16 and website videos W1 to W5 | Sonnet | done (merged 32 on Hussein's "merge"; docs only, no After-merge checks) | 32 | 4 Oct 2026 |
| P0.1-V3 | Setup-call and partner-call booking links | Sonnet | page, helpers and placements built; Calendly event and real `BOOKING_URL` still to do by hand (no connector), see After merge | see Evidence | 8 Oct 2026 |
| P0.1-07 | Database test suite in CI | Opus | done (merged 33; no After-merge checks) | 33 | 4 Oct 2026 |
| P0.1-08 | Security hardening of the database API | Opus | merged (35); After-merge checks partly run, see Evidence | 35 | 4 Oct 2026 |
| P0.1-09 | Tenant model: organisations, connections, subscriptions | Opus | merged (36); After-merge calls checked through RLS, browser smoke still open, see Evidence | 36 | 4 Oct 2026 |
| P0.1-10 | Append-only audit log and the "What Kabsi did" feed source | Opus | done (merged 37; approval and publication events checked live at the start of the P0.1-12a chat; the next `kabsi_retention` run still to read, see After merge) | 37 | 4 Oct 2026 |
| P0.1-11 | One Google service layer | Opus | done (part A merged 38, part B merged 39; After-merge checks passed) | 38, 39 | 4 Oct 2026 |
| P0.1-12a | Job queue and dispatcher, review jobs first | Opus | merged (40); migration fully live; After-merge passed (deploy, dispatcher, sync status, no duplicates, mock review end to end, Home line checked in a browser by Hussein); staff Job health look still open (Rashid), see Evidence | 40, 41 | 4 Oct 2026 |
| P0.1-12b | Rate limiter, circuit breaker and the rest of the cron | Opus | done (merged 43; `dispatch_tick` re-applied by Hussein in the SQL editor and read back `94ea83b8` on 7 Oct; mock Protection alert passed 7 Oct) | 43, 44 | 7 Oct 2026 |
| P0.1-13a | One publication pipeline: schema, claim, replies and undo | Opus | done (merged 47; Deploy passed after step 15; mock end to end and moderation path passed 7 Oct); Hussein's 390 px browser look still open, see After merge | 47 | 7 Oct 2026 |
| P0.1-13b | One publication pipeline: posts, photos, hours, profile changes | Opus | split: part A (the four paths on the pipeline) merged (49, 7 Oct 20:40 UTC) and its fix merged (50, 21:00 UTC); After-merge mock post, special hours and put-backs verified on Yawmiyati; a repeat Protection alert during a put-back fixed in PR 51; part B (`status` readers to `state`, then drop `status`, its sync trigger and `concierge_queue_reply`) merged (54) and the drop live 8 Oct 04:05 UTC, read back; done except Hussein's 390 px look of Home and Reviews | 49, 50, 51, 54, 55 | 8 Oct 2026 |
| P0.7-01a | Wave P0.G: enable the reviews and posts API and confirm access | Sonnet | merged (65, 84bab5d, 8 Oct 11:59 UTC; CI run 37773346652 App, Edge Functions and Database passed, Vercel success); docs only, no Deploy needed. Done except the card's read-only 200 calls and the `gcloud` or screenshot proof, moved to P0.7-01 (Hussein: no live Google call), see Evidence | 65 | 8 Oct 2026 |
| P0.7-01 | Wave P0.G: capture real Google responses (read-only) | Sonnet (R-39) | **done (PR 164 merged as a274ad8 on green ci.yml, session 18, 22 Oct 2026):** reviews, local posts and media captured live (200) on both profiles, six redacted fixtures, the moderation question answered (no moderation field on the wire; K-116.1 stays inferred by reading the reply back). Earlier: part 2 merged (153, a051145), part 1 merged (67, a48160f). See Evidence | 164 | 22 Oct 2026 |
| P0.7-01b | Wave P0.G: compare real responses with the mocks and fix the mocks | Sonnet (R-39) | **done (PR 164 merged as a274ad8, session 18):** `contract.test.ts` now covers reviews, posts and media (40 tests: 8 new shape cases, 4 new parser cases); three mock fixes (review `updateTime`, post photo shape, media item without `dataRef`). Earlier part merged (156, d0a34d5). See Evidence | 156, 164 | 22 Oct 2026 |
| P0.7-02 | Wave P0.G: business.manage verification package | Sonnet (R-39) | package written, **not submitted** (22 Oct 2026, session 16): `docs/google/business-manage-verification.md` has the scope justification, the video script, the console steps and the questions Google may ask. **Decided 22 Oct 2026 (lane R): not submitted; with the Manager model only hello@kabsi.co signs in to Google, so P0.7-02 waits for P1-18 (owner sign-in) and no staging Connect with Google route is built.** | 157 | 22 Oct 2026 |
| P0.7-04 | Wave P0.G: the switch to live | Opus | **done (session 18, PR 167):** Rashid ran both deletion files (`supabase/manual/20261022_p0_7_04_test_data_delete.sql`, tasks check relaxed to `n < 9`; `20261022_p0_7_04_regenerated_mock_rows.sql` with the window 07:00 to 07:15 UTC); read back: no non-demo mock row, the demo's 26 mock rows, only Yawmiyati and the demo connected. `GOOGLE_MODE` secret and `app_settings.google_mode` live, `full_backlog` on, Yawmiyati on `locations/4825254240697973899`; first live sync 07:20 UTC. See Evidence | 167 | 22 Oct 2026 |
| P0.7-05 | Wave P0.G: internal live test on Kabsi's own profiles | Opus | **moved to session 19 (P0.7-05b)** (session 18, 23 Oct 2026): done on Yawmiyati: live sync, the real reply approved by Rashid and `verified` (Google held it about 11 minutes, K-116.1), the Protection alerts kept as Google shows them (address 10:01:34, hours 15:05:58), Insights opened, a post published and its removal verified; left: the Update approve and Undo test. See Evidence | | 22 Oct 2026 |
| P0.2-01 | Retention table | Opus | merged (70, aa49b0c, 9 Oct 03:19 UTC); migration live and read back, dry run of the new job on live data 0 everywhere; Deploy passed (`api` 64 with `photo_files`); open: the first real run on 10 Oct 02:53 UTC and the Storage removal on a real photo (due about 26 Oct), see After merge | 70 | 9 Oct 2026 |
| P0.2-02 | Disconnect Kabsi and access-change notices | Opus | merged (72, 0ccf4e8, 9 Oct 05:40 UTC); Deploy passed (`api` 65); mock end to end on QA Bakery passed (forced failure, follow-up, retry, both notices); open: the invitation notice on the next mock acceptance and Hussein's 390 px look, see After merge | 72, 73 | 9 Oct 2026 |
| P0.2-03 | Business Knowledge table and the owner-approved baseline | Opus | merged (74, 4138122, 9 Oct 11:00 UTC); migration run by Hussein in the SQL editor and read back; Deploy passed (`api` 66); Protection runs on the new code passed; open: the first `kabsi_profile_daily` run (10 Oct 03:07 UTC), the 25 Oct clear and Hussein's 390 px look, see After merge | 74, 75 | 9 Oct 2026 |
| P0.2-04 | Google Protection on Google's update flow | Opus | merged (76, fa04fad, 10 Oct 05:23 UTC); migration live and read back; Deploy passed (`api` 67); new code checks and the mock end to end on QA Bakery passed; open: the 25 Oct check and Hussein's 390 px look, see After merge | 76, 77 | 10 Oct 2026 |
| P0.2-05 | Email approvals tightened | Opus | merged (78, 5aae112, 12 Oct 04:36 UTC); migration live and read back; Deploy passed (`api` 68); live end to end through the deployed `/api/action` on QA Bakery passed; open: Hussein's 390 px look, see After merge | 78, 79 | 12 Oct 2026 |
| P0.2-06 | Places cost guard | Sonnet | merged (80, 9d1aced, 12 Oct 05:22 UTC); migration live and read back; Deploy passed; open: Hussein's Google Cloud step 3 (quotas, budget alerts, places-backend), see After merge | 80 | 12 Oct 2026 |
| P0.2-07 | Privacy, terms and security pages that match the system | Sonnet | merged (82, 92a4bfb, 12 Oct 05:58 UTC); CI green; production READY (dpl_4HCDRS9gCFGB1VbSsWHgKBNJAHqr); live pages checked; a lawyer should read /privacy and /terms before launch; open: Hussein's 390 px look | 12 Oct | |
| P0.3-01 | Business Knowledge as the source for every draft | Opus | merged (92, 5c01dc8, 13 Oct 06:23 UTC); Deploy passed; migrations 1 and 2 live (2 run by Hussein, read back 14 Oct); open: the real-model draft (credit) and Hussein's 390 px look, see After merge | 92, 93 | 13 Oct 2026 |
| P0.3-02 | Per-business memory and the grounded reply pipeline | Opus | merged (94, 88ef7e0, 13 Oct 06:52 UTC); Deploy passed; migrations 1 and 2 live (2 run by Hussein, read back 14 Oct); open: the real-model checks (credit) and Hussein's 390 px look, see After merge | 94, 95 | 13 Oct 2026 |
| P0.3-03 | Three review risk levels | Opus | merged (96, f11ef00, 14 Oct 03:53 UTC); migration live and read back; Deploy passed (`api` 74, `slack` 60); live high-risk mock review on QA Bakery passed (no draft, no model call, the guidance email); open: the medium and holding-reply real-model checks (credit) and Hussein's 390 px look, see After merge | 96, 97 | 14 Oct 2026 |
| P0.3-04 | Evaluation set and the prompt gate | Opus | merged (97, 404d5e5, 14 Oct 04:06 UTC); After-merge checks passed (production READY, live site 200, jobs green) on green ci.yml (run 38509173689: App, Edge Functions with the 9 eval tests, Database, Prompt gate passing at once with no prompt change); no database or function change to deploy; open: the real evaluation run (credit), see After merge | 97, 98 (throwaway, closed) | 14 Oct 2026 |
| P0.3-05 | One task engine | Opus | done (100, a855c30, 15 Oct); Deploy re-run green (run 38683212631, attempt 2); Hussein's two SQL files and the profile_tasks drop read back on 20 Oct; `task_detectors` on 20 Oct 05:01 UTC and `detect_tasks` jobs succeed; only the real Nora turn waits for Anthropic credit (After merge step 5) | 100 | 20 Oct 2026 |
| P0.3-06 | Roles and approval policies | Opus | done (102, 487f0c1, 15 Oct); Deploy re-run green (run 38686596016, attempt 2); Hussein's links file read back on 20 Oct (2, true, true) | 102 | 20 Oct 2026 |
| P0.3-07 | Home is the Action Center | Sonnet | done (105, 103099e, 20 Oct); CI green; Vercel production READY; jobs 0 failed | 105 | 20 Oct 2026 |
| P0.3-08 | App navigation and product names | Sonnet | done (106, f70ee30, 20 Oct); CI green; Vercel production READY; jobs 0 failed | 106 | 20 Oct 2026 |
| P0.3-09 | Review screen built for a phone | Sonnet | done (107, 403d294, 20 Oct); CI green; Vercel production READY; jobs 0 failed | 107 | 20 Oct 2026 |
| P0.3-10 | Clear the backlog on day one | Sonnet | done (108, 1f4f63a, 20 Oct 06:06 UTC); CI and Load green; migration live; Deploy green; Vercel production READY; jobs 0 failed; only the real drafting run waits for Anthropic credit | 108 | 20 Oct 2026 |
| P0.3-11 | Google Profile screen | Sonnet | done (109, edf84fe, 20 Oct 06:12 UTC); CI green; Vercel production READY; jobs 0 failed | 109 | 20 Oct 2026 |
| P0.4-01 | Free snapshot and Google Profile Check | Sonnet | merged (90, 77fac57, 12 Oct 17:04 UTC); CI green; Deploy passed; live page checked; built and tested on mocked Places only; the "check a real business" item is pending until Hussein re-enables Places (After merge); the function and page are live behind the cap of 0 ("Back soon") | 90 | 12 Oct 2026 |
| P0.4-02 | Sign-up sheet: Continue with Google or an email code | Opus | merged (111, 8992179, 20 Oct 15:44 UTC); Deploy passed (`auth-code` 1); email path proven on the live function and Auth; pending: live Google sign-in after Hussein's step 5, and one email sign-in by a person | 111 | 20 Oct 2026 |
| P0.4-03 | Manual Manager route with a live status | Sonnet | done: merged (154, c1434b4, 22 Oct 04:34 UTC); CI green; Deploy 67 green; the live /manager-steps page shows the guide and opens on card 3; open: one real email from Send these steps to my other device and a phone look (After merge) | 154 | 22 Oct 2026 |
| P0.4-04 | Diagnosis, scenario screens and reminders | Sonnet | done: merged (158, 2df3615, 22 Oct 04:53 UTC); CI green; Deploy 69 green; migrations applied and read back; the reminders stay off until lifecycle_emails is on; open: a phone look at the situation screens (After merge) | 158 | 22 Oct 2026 |
| P0.4-05 | Five questions and confirm your details | Sonnet | done: merged (159, 3fe0547, 22 Oct 05:05 UTC); CI green; Vercel production READY; no migration; plan choice from day 11 is part 2 (merged, PR 161, 0562b24); open: a phone look at steps 4 and 5 and the Home trial banner (After merge) | 159 | 22 Oct 2026 |
| P0.4-06 | The trial | Opus | done: merged (112, 253ed7e, 20 Oct 16:29 UTC); Deploy passed (`api` 79); migration applied and read back; day-21 removal waits for `trial_removal` on with P0.4-07 | 112 | 20 Oct 2026 |
| P0.4-07 | Creem: checkout, webhook, portal | Opus | todo | | |
| P0.4-08 | One email template and the email set | Sonnet | merged (115, 7d27f47, 21 Oct); CI green; Deploy passed (`email` function new); migration applied; 31 email types sent once to hello@kabsi.co; open: Hussein's Resend steps (`news.kabsi.co`, webhook), the Auth templates and a look in real inboxes | 115 | 21 Oct 2026 |
| P0.4-09 | Notification engine | Sonnet | done (114, acc378b, 21 Oct); CI green; Deploy passed; `notify_due` on and succeeding; open: Hussein's links file (cascade foreign keys) | 114 | 21 Oct 2026 |
| P0.4-10 | Behaviour-triggered lifecycle emails | Sonnet | merged (116, 30c0186, 21 Oct); CI green; Deploy passed; migration applied; the 11 lifecycle emails sent once to hello@kabsi.co; switched off until Hussein verifies `news.kabsi.co` and turns it on | 116 | 21 Oct 2026 |
| P0.4-11 | "Need a hand?" on every onboarding step | Sonnet | done: merged (160, f858bb2, 22 Oct 05:17 UTC); CI green; no migration; `assistant` function deployed by the Deploy run; Nora on a live conversation waits for the AI credit (After merge) | 160 | 22 Oct 2026 |
| P0.5-01 | Photo engine, cover and logo | Opus | merged in two parts: A (142, 57e0485; After merge 1 and 2 passed) and B (143, 69dded0); open: the phone checks under After merge (a real GPS photo through exiftool, a HEIC upload, the staff link) | 142, 143 | 21 Oct 2026 |
| P0.5-02 | Posts: three types, checks and the month view | Sonnet (run in Opus session 12) | merged in two parts: A (144, f1486cf; After merge: Deploy passed, posts-weekly 410, a care_posts job on QA Bakery asked the question) and B (145, b7c8070); open: the phone check and the first daily run at 06:13 UTC on 22 Oct | 144, 145 | 21 Oct 2026 |
| P0.5-03 | Hours: one editor and the holiday calendar | Sonnet | done: part A (PR 133) and part B (PR 135) merged and checked | 133, 135 | 21 Oct 2026 |
| P0.5-04 | The Weekly Care Report | Sonnet | done: merged (PR 140) and checked; "What customers say" waits for P0.8-08 | 140 | 21 Oct 2026 |
| P0.5-05 | Insights: one sentence and four tiles | Sonnet | PR open (131); After merge below | 131 | 21 Oct 2026 |
| P0.6-01 | Consent banner and proof of consent | Opus (session 11, R-42) | done (merged 132, 1488219; Deploy passed; After merge passed 21 Oct 18:58 UTC) | 132 | 21 Oct 2026 |
| P0.6-02 | Product events, attribution and onboarding funnel | Opus (session 11, R-42) | merged (134, d3e4984); After merge passed except one real sign-up by a person (needs an email code) | 134 | 21 Oct 2026 |
| P0.6-03 | Meta Pixel and Conversions API with one event ledger | Sonnet (R-39) | todo | | |
| P0.6-04 | The /meta landing page | Sonnet | todo | | |
| P0.6-05 | Security headers, Turnstile everywhere, rate limits | Opus (session 11, R-42) | done (merged 136, 327764b; Deploy passed; After merge passed 21 Oct 19:25 UTC); follow-up: enforce the CSP after 14 clean days (on or after 4 Nov 2026) | 136 | 21 Oct 2026 |
| P0.6-06 | Nora in sync: facts file, handover and evaluation | Sonnet (R-39) | merged (165, 26c74f6, 22 Oct 2026); CI green; Deploy 73 green; stub evaluation 60 of 60, zero honesty failures; the live run is by hand only (R-45); open: kabsi.co/llms-full.txt still served the old file when checked, see After merge | 165 | 22 Oct 2026 |
| P0.6-07 | Honest proof pages: founder note, About, Security | Sonnet | merged (84, 64adfad, 12 Oct); CI green; live /about serves the new page (fetched 12 Oct 06:25 UTC); 390 px checked by script, no horizontal scroll; open: Hussein's look and the photo question | 12 Oct | |
| P0.6-08 | Supporting platforms checked against K-118 | Sonnet | merged (168, 1c1a340, 22 Oct 2026); CI green (the separate Load workflow was still running at the merge); `health/queue` answers 200 and `go.kabsi.co/_check` answers ok; Rashid steps A1 to E2 in `docs/platforms.md` | 168 | 22 Oct 2026 |
| P0.6-09 | Meta account fixes (VIDEO Part 7) | Sonnet | todo | | |
| P0.6-10 | WhatsApp click-to-chat on the Kapso US number | Sonnet | merged (86, 00d3515, 12 Oct); CI green; Deploy passed; live pages checked (Evidence); open: Kapso step 12 (the inbox setup) and Hussein's 390 px look | 86 | 12 Oct |
| P0.6-11 | Staff system health page | Sonnet | merged (169, 250ec84, 22 Oct 2026); CI green (pgTAP took two rounds: the private helper had to be closed to API roles and the test read `jobs` as staff); live functions read back with the three forced failures; the page is not looked at in a browser and the website is not rebuilt by Vercel yet, see After merge | 169 | 22 Oct 2026 |
| P0.6-12 | WhatsApp privacy and processors (Kapso and Meta) | Sonnet | merged (88, 1a0631d, 12 Oct); CI green; live /privacy and /terms name Kapso and Meta (Evidence); open: Hussein's Kapso check and 390 px look; lawyer read of the pages | 88 | 12 Oct |
| P0.7-03 | Google notifications through Pub/Sub | Sonnet (R-39) | moved to session 19 (P0.7-05b); not started | | |
| P0.7-05b | Live test of the features built after Wave P0.G | Opus | todo | | |
| P0.7-06 | Page-by-page audit, contradiction sweep and the test matrix | Sonnet | todo | | |
| P0.7-07 | First real customer end to end, and the launch gate | Opus | todo | | |
| P0.8-01 | Wave P0.8: International and partner cleanup (session 7) | Opus | done (119, 22d7d9e; Deploy passed; live redirects checked); three removal files for Hussein (After merge) | 119 | 21 Oct 2026 |
| P0.8-02 | Wave P0.8: Session 6 email fixes and email previews (session 7) | Sonnet (in the Opus session) | done (120, edcb9a4; CI green; Edge Functions deployed) | 120 | 21 Oct 2026 |
| P0.8-02b | Wave P0.8: Email fixes round 2 (session 8, Hussein's extra PR) | Sonnet | done (127, 5813ffe; CI green) | 127 | 21 Oct 2026 |
| PR 0 (S13) | WhatsApp off switch: one `WHATSAPP_NUMBER` setting that can be empty (the Kapso number was deleted on 22 Oct 2026) | Opus | merged (147, c3450b9); After merge: Deploy and the live pages, see Evidence | 147 | 22 Oct 2026 |
| P0.8-03 | Wave P0.8: WhatsApp owner channel (session 13) | Opus | merged in two parts (148, 0ae30af; 149, 38c144a), built on mocks; live sends wait for a new number and Rashid's steps 12 and 18 | 148, 149 | 22 Oct 2026 |
| P0.8-04 | Wave P0.8: Protection put-back and Pro auto-fix (session 13) | Opus | merged (150, 601dbd5); **auto-fix ships off** (Google's policy sentence in Where things stand); one-tap put-back in the app, by email and on WhatsApp | 150 | 22 Oct 2026 |
| P0.8-05 | Wave P0.8: Review link page, Google button first (session 8) | Sonnet | done (123, 5a13c0c; CI green; Deploy 48 passed; live link redirect and function checked) | 123 | 21 Oct 2026 |
| P0.8-06 | Wave P0.8: Staff Send review link (session 8) | Sonnet | done (124, 8223bf7; CI green); phone check for Hussein (After merge) | 124 | 21 Oct 2026 |
| P0.8-07 | Wave P0.8: Review graphics, Pro (session 8) | Sonnet | done (125, 3e82b3d; CI green; Deploy 49 passed); one real render to try (After merge) | 125 | 21 Oct 2026 |
| P0.8-08 | Wave P0.8: What customers say, Pro (session 15) | Sonnet | todo | | |
| P0.8-09 | Wave P0.8: Profile Coach (session 9) | Sonnet | done: part A (PR 138) and part B (PR 139) merged and checked; the description writer waits for AI credit (K-146), sending a description and services to Google wait for their own cards | 138, 139 | 21 Oct 2026 |
| P0.8-10 | Wave P0.8: Own order and booking button, Pro (session 19) | Opus | todo | | |
| P0.8-11 | Wave P0.8: Report a fake review helper, Pro (session 8) | Sonnet | done (126, 825ee2a; CI green); links file for Hussein (After merge) | 126 | 21 Oct 2026 |
| P0.8-12 | Wave P0.8: Kabsi Partners (session 11) | Sonnet | todo | | |
| P0.8-13 | Wave P0.8: Website v2 (session 20) | Sonnet | done: industry pages (171), homepage (172), pricing and how it works (173); live pages checked; Lighthouse performance below 90 on a first visit, see Found, not done | 171, 172, 173 | 22 Oct 2026 |
| P1-23 | Voice notes on the WhatsApp owner channel | Sonnet | todo | | |
| P1-01 | Partner organisation, client onboarding and approval policies; Partners page rewrite for agencies | Opus | retired 21 Oct 2026 (K-127, replaced by P0.8-12) | | |
| P1-02 | Portfolio dashboard | Sonnet | retired 21 Oct 2026 (K-127) | | |
| P1-03 | Partner branding and client reports | Sonnet | retired 21 Oct 2026 (K-127) | | |
| P1-04 | Referral attribution and commission from the payment webhook | Opus | retired 21 Oct 2026 (K-127, replaced by P0.8-12) | | |
| P1-05 | Website importer | Opus | todo | | |
| P1-06a | Description, opening date, Google's checklist mirrored | Sonnet | todo, description draft moves to P0.8-09 (K-136) | | |
| P1-06b | Services by interview, custom services | Sonnet | todo, filling services moves to P0.8-09 (K-136) | | |
| P1-06c | Attributes in Google's groups | Sonnet | retired 21 Oct 2026 (K-136, in P0.8-09) | | |
| P1-06d | More hours, social and chat links, action links, products | Sonnet | todo | | |
| P1-07 | Installable app and web push | Sonnet | todo | | |
| P1-08 | Daily check of the links customers tap | Sonnet | todo | | |
| P1-09a | Monthly and quarterly care routine | Sonnet | todo | | |
| P1-09b | Search terms, photo prompts from search gaps, change detection | Sonnet | todo, search terms moved to P0.5-05 (K-138) | | |
| P1-10 | Review themes on request | Opus | retired 21 Oct 2026 (K-135, replaced by P0.8-08) | | |
| P1-11 | Get Reviews redesign and the print designer | Sonnet | todo, no card ordering (K-125) | | |
| P1-12 | Staff two-step sign-in and owner diagnostics | Opus | todo | | |
| P1-13 | The weekly numbers dashboard | Sonnet | todo | | |
| P1-14a | Facts page | Sonnet | todo | | |
| P1-14b | Comparison pages | Sonnet | todo | | |
| P1-14c | Guides launch set of 10, then one a week | Sonnet | todo | | |
| P1-14d | Industry pages to the G-06 standard | Sonnet | retired 21 Oct 2026 (K-140, replaced by P0.8-13) | | |
| P1-14e | Homepage rebuild | Sonnet | retired 21 Oct 2026 (K-140, replaced by P0.8-13) | | |
| P1-15 | Growth loops | Sonnet | todo, needs re-scoping (K-126, K-127) | | |
| P1-16 | "Your year on Google" | Sonnet | todo | | |
| P1-17 | Short videos through the photo pipeline | Sonnet | todo | | |
| P1-18 | "Connect with Google" route | Opus | todo | | |
| P1-19 | Speed and caching | Sonnet | todo | | |
| P1-20 | Pricing page rebuild | Sonnet | retired 21 Oct 2026 (K-140, replaced by P0.8-13) | | |
| P1-21 | WhatsApp owner alerts through Kapso | Opus | retired 21 Oct 2026 (K-129, replaced by P0.8-03) | | |
| P1-22 | Nora on WhatsApp | Opus | todo, depends on P0.8-03 (K-129) | | |
