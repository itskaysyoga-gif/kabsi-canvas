# Kabsi status

One page, under 10 KB. Updated 25 Oct 2026 by the lane R chat (master plan 19, 25.1, 26.6, 29.9, 30); first written by Session 0 (the docs diet, master plan 27.12). The history that used to live here (about 750 KB: tasks, After merge checks, evidence, found not done, decisions to confirm, the log) was moved word for word to `docs/progress/archive/`; nothing was deleted. The plan index is `docs/KABSI-PLAN.md`, the core is `docs/KABSI-MASTERPLAN.md`, the order of work is plan section 7.

## Where things stand

- Built and live: sessions 1 to 16, 18, 20, 20a, 20b, hotfix 20h and the 22 Oct sync session. Google is live on Yawmiyati; the first real reply was published and verified; the post removal was verified on Google (23 Oct). kabsi.co runs on Vercel; Creem is the only payment route (test mode, not open). Evidence: `docs/progress/archive/evidence.md` and `where-things-stand.md`.
- Merged 23 and 24 Oct, docs and config only: Session 19 PR 0 (PR 196, the master plan and skills), Ops 1 part A (PR 197, Dependabot, gitleaks, docs/SECRETS.md), Session 0 part 1 (PR 198, master plan sections 20 to 29, decisions R-67 to R-89, the new order of work, the facts lines).
- Session 0 is complete (PR 198 and PR 199, the docs diet).
- Clean 1 (master plan 28.9, PR 200, merged and verified live 24 Oct): unused code, packages, Edge Functions, a script, a page and a skill removed, the Lovable leftovers gone, the database drops written for Rashid. Detail: `docs/progress/archive/2026-10-24-clean-1.md`.
- Ops 1 part B (PR 203 and PR 206): section 30 committed (R-90); weekly encrypted backup and monthly restore drill built (dry run green on `main`: the bundle and all 77 Storage files were read and encrypted; the database step waits for Rashid's secrets); locked installs (`npm ci`) and every action pinned to a SHA; Sentry release tags and source maps; privacy, terms and partner terms; the runbook; Lighthouse CI (report only); advisors check; sender `Kabsi <hello@send.kabsi.co>` live (43 test emails delivered, four in Rashid's Gmail inbox with DKIM, SPF and DMARC passing); the Resend webhook is proven. Detail: `docs/progress/archive/2026-10-24-ops-1-part-b.md`.
- Session 13b part 1 (the WhatsApp agent): roles and router for every kind of person, the one sender, templates, number health, 18.2 and 18.3, the 141-case suite; migrations applied 25 Oct. Detail and the phone test: `docs/progress/archive/2026-10-25-session-13b-1.md`.
- 25 Oct, lane R (PR on `claude/lane-r-unified-reference`): the design system approved and written to `DESIGN.md`, the copy for every page in `docs/COPY.md`, the teardown in `docs/source/KABSI-TEARDOWN.md`, the fix-later list `docs/LATER.md`, master plan 30.11, faster session rules in the kabsi-build-session skill, new approved lines in kabsi-copy, the webapp-testing skill.
- Next: Fix 1 (webhook, templates, eval fixes), then session D (Creem) and V1, then 13b part 2 after the phone test.
- No customer is live yet. The launch gate (master plan 27.13) is not started.

## WhatsApp ladder (master plan 25.5)

The facts say "WhatsApp is live" only when the last step is done.

| Step | Done | Proof |
|---|---|---|
| Number acquired | 23 Oct 2026 | +1 205-745-6874 connected in the Kapso project Kabsi.co; Kapso health check Passed 10:17 Beirut (master plan 9.8) |
| Profile set | 23 Oct 2026 | Photo, about, email, address, website and description live; the display name "Kabsi" is waiting for Meta's approval (master plan 9.8) |
| Webhook verified | not yet | 25 Oct: `whatsapp/staff/setup` failed, Kapso 422; not registered (session 13b part 1 record) |
| Templates approved | not yet | 25 Oct: `whatsapp/staff/templates` failed, Meta 400; none submitted |
| Inbound tested | not yet | Suite of 141 cases passes in CI; the live pass on Rashid's phone is next |
| Outbound tested | not yet | A live send to Kabsi's own test phones |
| Owners switched on | not yet | After the launch gate |

## Open for Rashid (as last recorded; the full table is `docs/progress/archive/steps-only-rashid-can-do.md`)

- Done 25 Oct: Clean 1 drops (read-back 0 on all four), the Resend webhook, R2 and the bucket `kabsi-backups`, the five backup secrets, `SENTRY_AUTH_TOKEN` in Vercel, the Pub/Sub topic `gbp-notifications` with its push subscription and secrets, `WHATSAPP_LIVE` set to `true`, the post Undo test.
- Session 19 rest: run `supabase/manual/20261025_places_data_purge.sql` (read-back `0 | 0 | 0`). Pub/Sub waits for a natural review on Yawmiyati: nobody at Kabsi writes or edits a review to test it (fake review rule). The "testing it" post scheduled for 30 Oct: delete it in the app.
- Phone test (13b part 1): waits for Fix 1 to register the webhook; then make a staff code at kabsi.co/staff and run the test in `docs/progress/archive/2026-10-25-session-13b-1.md`.
- Postponed to `docs/LATER.md`: the failing Backup run, the disabled branch ruleset, the inbox tests, Sentry membership (free plan allows 1).
- Supabase Auth: leaked-password protection; paste the four `emails/auth/*.html` templates.
- Google Cloud: Places quotas and budget alerts; contacts and owners on kabsi.co addresses only.
- Supabase Pro with point-in-time recovery and Vercel Pro, before the first payment.
- Hussein (Creem only): products and live keys when session 10 asks.
- A lawyer reads /terms, /privacy and the partner terms (master plan 29.8).
- Master plan 19.6: two-step verification everywhere, recovery codes offline, the second Kabsi Google account.
- V1 needs a free Geoapify key (GEOAPIFY_API_KEY, 28.2). DataForSEO top-up and Gemini billing at the launch gate.

## Open After merge checks and findings

- After merge checks that a session could not run (they need a phone or a person) are in `docs/progress/archive/after-merge.md`. The first session of each kind reads the ones for its own area before starting.
- New in Ops 1 part B: Growth 1 must make the consent code match the privacy page (20.4, a new CONSENT_VERSION); zod 3 to 4 is a session of its own (dependency review names it as an exception); one test row `bounced@resend.dev` is left in `email_suppressions`. Full list in the archive entry.
- Found, not done: `docs/progress/archive/found-not-done.md`. Decisions to confirm: `docs/progress/archive/decisions-to-confirm.md`.
- New in Session 0 part 1: the facts file still says Kabsi has no WhatsApp number (session 13b part 1 changes it); the master plan has no 10.2.1 or 10.2.2 numbering, so the plan and trial changes sit at the top of its section 10.
- Session 19 rest closed the session 18 items: the post Undo test passed on 25 Oct (P0.7-05b, an Update with no Learn more link: approved 05:34:54, undone 3.7 seconds later, cancelled, never sent to Google); Pub/Sub is registered live and a forged push gets 401 (P0.7-03); the push from a real review is still to be seen.

## Recent entries (newest first)

- 25 Oct 2026, lane R: design system, copy, fix-later list, session rules (master plan 30.11).
- 25 Oct 2026, Session 13b part 1: the WhatsApp agent. Detail: `docs/progress/archive/2026-10-25-session-13b-1.md`.
- 24 Oct 2026, Ops 1 part B (PR 203, PR 206): detail `docs/progress/archive/2026-10-24-ops-1-part-b.md`.
- 25 Oct 2026, Session 19 rest: PR 204, 205, 210 (30.10 and 30.10.1, nothing from Places stored, purge 7 days after leaving, backups 21 days), 212 (Pub/Sub registration), 213 (access notices by email and WhatsApp, the free-from-Google line, the WhatsApp pipeline side), 215 (main fix after 211 and 213 met) and 216 (the judge, contradictions, kabsi-eval, Nora's 20 questions, the 27.9 cut); live evaluation 2.38 USD, both gates blocked (findings listed). Detail: `docs/progress/archive/2026-10-24-session-19-rest.md`.
- 24 Oct 2026, Clean 1 (master plan 28.9): detail `docs/progress/archive/2026-10-24-clean-1.md`. Tracked files 1,255 to 1,204 (11.59 MB to 11.27 MB), npm packages 438 to 364.
- 24 Oct 2026, Session 0 part 2: docs diet (detail: `docs/progress/archive/2026-10-24-session-0-diet.md`). Plan index 29 KB, status page 5.8 KB; facts split into `knowledge/facts/` and `knowledge/internal/` with one generator (`node scripts/build-kb.mjs`). File sizes are in the pull request.

## How a session updates this page

1. Change "Where things stand", the ladder (only with proof, in the Proof column), "Open for Rashid" and "Recent entries" as needed. Keep this page under 10 KB: drop the oldest recent entry when you add one.
2. Put long evidence (commands run, outputs, SQL read-backs, After merge results, found not done, decisions to confirm) in one new file, `docs/progress/archive/<yyyy-mm-dd>-<session>.md`, and link it in one line under "Recent entries".
3. Use the session report of master plan 25.6: the pull request link, a 3-line summary, the tests actually run (exact commands), what was verified live and how, manual steps left for Rashid, known limits. A merged pull request or a passing mock test is never called live.
4. No em dashes, en dashes or exclamation marks.
