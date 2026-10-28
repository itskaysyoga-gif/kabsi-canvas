# Kabsi status

One page, under 10 KB. Updated 28 Oct 2026 by Billing 2 (before it: Sec 2) (earlier: the lane R chat, 25 Oct) (master plan 19, 25.1, 26.6, 29.9, 30); first written by Session 0 (the docs diet, master plan 27.12). The history that used to live here (about 750 KB: tasks, After merge checks, evidence, found not done, decisions to confirm, the log) was moved word for word to `docs/progress/archive/`; nothing was deleted. The plan index is `docs/KABSI-PLAN.md`, the core is `docs/KABSI-MASTERPLAN.md`, the order of work is plan section 7.

## Where things stand

- Built and live: sessions 1 to 16, 18, 20, 20a, 20b, hotfix 20h and the 22 Oct sync session. Google is live on Yawmiyati; the first real reply was published and verified; the post removal was verified on Google (23 Oct). kabsi.co runs on Vercel; Creem is the only payment route (test mode, not open). Evidence: `docs/progress/archive/evidence.md` and `where-things-stand.md`.
- Sessions 19 PR 0, Ops 1 parts A and B, Session 0, Clean 1, 13b part 1 and part 2, Fix 1, Session 10 Creem, V1, V2, V3, QA 1, Growth 1 and the lane R notes of 25 and 26 Oct: one line each in `docs/progress/archive/where-things-stand.md` (moved 27 Oct by V4), detail in their own archive files.
- Web 2 (PR 252, merged 26 Oct, deploy run 117 green, kabsi.co serves it): kabsi.co's public pages on the design studio's approved system (dark, Bricolage Grotesque and Manrope), every count real (Founding 25, founding price, Founding Partners), the Founding 25 and Partners forms on the programs function, the free check on V4's /visibility/check, the industry pages with nine hubs (hair salon, restaurant and dental clinic indexed; the nine Content 1 pages noindex until lane R approves), DESIGN.md and COPY.md 24, the facts. Detail: `docs/progress/archive/2026-10-27-web2.md`.
- V4 (PR 250, merged 26 Oct, deploy run 116 green; migration applied by lane R): onboarding in four stages, the first task, every task closes, the work receipt data, nearby places, the free check route, the category and monthly-facts proposals, the voice test op. The voice test did not pass (Gulf Arabic and mixed notes), so voice notes stay off. Detail: `docs/progress/archive/2026-10-27-v4.md`.
- UX 1 (PR 254, merged 27 Oct, deploy run 118 green; migrations applied): the signed-in website on Design 3 (light), every task with its state, onboarding in four stages with the resume link, Get reviews with the PDF buttons and the new message, owners' AI questions, the staff AI spend and Founding 25 checklist, the public leftovers, the free check waiting list, named or anonymous case study, the approved terms. Detail: `docs/progress/archive/2026-10-27-ux1.md`.
- Email 1 (PR 258, 27 Oct): one email design, the 30.15 set, the Results Report receipt, auth templates, streams, the routine channel. Detail: `docs/progress/archive/2026-10-27-email1.md`.
- Sec 1 (PR 261, merged 27 Oct): tenant isolation, roles, approvals, email links, webhooks, injection, abuse limits, the stop switch for Google writes, log scrubbing, ASVS L1 (`docs/security/ASVS-L1.md`). Detail: `docs/progress/archive/2026-10-27-sec1.md`.
- Sec 2 (27 Oct): approvals bound to the draft version shown, retention per source, privacy trace, backup to the pooler and a restore drill that re-applies deletions (passed locally), secrets audit, Sec 1 leftovers, the staff Operations view. PR 266, deployed and checked live. Detail: `docs/progress/archive/2026-10-27-sec2.md`.
- Billing 2 (PR 269, 28 Oct): extra locations as their own Creem subscription on the same customer (units kept on the plan row), Remove a location, Creem's `prod` mode read as live, the partner base for extras, the 410 billing stub removed from the repo. Detail: `docs/progress/archive/2026-10-28-billing2.md`.
- No customer is live yet. The launch gate (master plan 27.13) is not started.

## WhatsApp ladder (master plan 25.5)

The facts say "WhatsApp is live" only when the last step is done.

| Step | Done | Proof |
|---|---|---|
| Number acquired | 23 Oct 2026 | +1 205-745-6874 connected in the Kapso project Kabsi.co; Kapso health check Passed 10:17 Beirut (master plan 9.8) |
| Profile set | 23 Oct 2026 | Photo, about, email, address, website and description live; the display name "Kabsi" is waiting for Meta's approval (master plan 9.8) |
| Webhook verified | 25 Oct 2026 | Rashid's live phone test: his 12 messages reached Kabsi's function through the registered Kapso webhook (Fix 1, request 49115); his chat export confirms them |
| Templates approved | not yet | 25 Oct (Fix 1): all 10 submitted, all PENDING at Meta (request 49120); 13b part 2 adds `kabsi_billing_notice`. Approved when they read APPROVED |
| Inbound tested | 25 Oct 2026 | Rashid's live test: 12 messages in, each handled (chat export); the suite (now 231 WhatsApp cases) passes in CI |
| Outbound tested | 25 Oct 2026 | Rashid's live test: 11 replies delivered to his phone (chat export); QA 1's delivered receipt read back |
| Owners switched on | not yet | After the launch gate |

## Open for Rashid (as last recorded; the full table is `docs/progress/archive/steps-only-rashid-can-do.md`)

- Done 25 Oct: Clean 1 drops (done, read-back 0 on all four), the Places purge (done, read-back `0 | 0 | 0`), the Resend webhook, R2 and the bucket `kabsi-backups`, the five backup secrets, `SENTRY_AUTH_TOKEN` in Vercel, the Pub/Sub topic `gbp-notifications` with its push subscription and secrets, `WHATSAPP_LIVE` set to `true`, the post Undo test.
- Phone test (13b part 1): passed 25 Oct (ladder above). 13b part 2: send START from the staff phone (it is stopped); delete the Supabase secrets SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET and the Supabase SENTRY_AUTH_TOKEN; run `supabase/manual/20261025_drop_slack_leftovers.sql` (expect `0 | 0 | 0 | 0`); remove the Kabsi app from Slack when you like.
- Sec 2: the backup secret, unused secrets, two-step logins (`docs/security/secrets-and-accounts.md` steps 1 to 3); the retention switch (`supabase/data/20261027_sec2_retention_on.sql`); check the go.kabsi.co rate limit is Deployed.
- Postponed to `docs/LATER.md`: the failing Backup run, the disabled branch ruleset, the inbox tests, Sentry membership (free plan allows 1).
- Supabase Auth: leaked-password protection; paste the four rebuilt `emails/auth/*.html` templates (Email 1, steps in emails/auth/README.md).
- Email 1: news.kabsi.co in Resend and Cloudflare before lifecycle emails go on (LATER row).
- Google Cloud: Places quotas and budget alerts; contacts and owners on kabsi.co addresses only.
- Supabase Pro with point-in-time recovery and Vercel Pro, before the first payment.
- Creem (session 10): send one test event from Creem's dashboard to the webhook (expect 200 and one `billing_events` row), add the product bundle, mark Yawmiyati's organisation `billing_test` if you want to try the paid buttons. Hussein only at going live (verification, payout). Exact steps: `docs/progress/archive/2026-10-25-session-10-creem.md`.
- A lawyer reads /terms, /privacy and the partner terms (master plan 29.8).
- Master plan 19.6: two-step verification everywhere, recovery codes offline, the second Kabsi Google account.
- Growth 1: the Meta and Speed Insights steps in docs/EVENTS.md (last section).
- V3 heads-up: the first live tick after the deploy sent one "your photo is ready" message to the Yawmiyati phone about an old 25 Oct test photo (tap Skip, never Yes: Yes would publish it to the real profile) and queued the monthly question there; your next typed message within 3 days is read as its answer, so reply No to close it.
- V3 and V4: at the launch gate submit the templates `kabsi_photo_ready`, `kabsi_business_update`, `kabsi_setup_step` and `kabsi_work_update`. Voice notes stay off: the voice test failed for Gulf Arabic and mixed notes (LATER row).
- UX 1: after the deploy, `POST /visibility/terms` once (two DataForSEO calls, about 0.15 USD) and the read-back in the UX 1 archive file.
- V1: a free Geoapify key, saved as the Supabase secret GEOAPIFY_API_KEY (clicks in `docs/progress/archive/2026-10-25-v1-visibility-map.md`); until then maps draw on a plain ground. DataForSEO top-up and Gemini billing at the launch gate.

## Open After merge checks and findings

- After merge checks that a session could not run (they need a phone or a person) are in `docs/progress/archive/after-merge.md`. The first session of each kind reads the ones for its own area before starting.
- New in Ops 1 part B: zod 3 to 4 is a session of its own (dependency review names it as an exception); one test row `bounced@resend.dev` is left in `email_suppressions`. Full list in the archive entry.
- Found, not done: `docs/progress/archive/found-not-done.md`. Decisions to confirm: `docs/progress/archive/decisions-to-confirm.md`.
- Session 19 rest closed the session 18 items: the post Undo test passed on 25 Oct (P0.7-05b, undone 3.7 seconds after approval, never sent to Google); Pub/Sub is registered live and a forged push gets 401 (P0.7-03); the push from a real review is still to be seen.

## Recent entries (newest first)

- 28 Oct 2026, Billing 2. Detail: `docs/progress/archive/2026-10-28-billing2.md`.
- 27 Oct 2026, Sec 2. Detail: `docs/progress/archive/2026-10-27-sec2.md`.
- 27 Oct 2026, Audit 1. Detail: `docs/progress/archive/2026-10-27-audit1.md`.

## How a session updates this page

1. Change "Where things stand", the ladder (only with proof, in the Proof column), "Open for Rashid" and "Recent entries" as needed. Keep this page under 10 KB: drop the oldest recent entry when you add one.
2. Put long evidence (commands run, outputs, SQL read-backs, After merge results, found not done, decisions to confirm) in one new file, `docs/progress/archive/<yyyy-mm-dd>-<session>.md`, and link it in one line under "Recent entries".
3. Use the session report of master plan 25.6: the pull request link, a 3-line summary, the tests actually run (exact commands), what was verified live and how, manual steps left for Rashid, known limits. A merged pull request or a passing mock test is never called live.
4. No em dashes, en dashes or exclamation marks.
