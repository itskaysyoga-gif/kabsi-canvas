# Kabsi status

One page, under 10 KB. Updated 25 Oct 2026 by the lane R chat (master plan 19, 25.1, 26.6, 29.9, 30); first written by Session 0 (the docs diet, master plan 27.12). The history that used to live here (about 750 KB: tasks, After merge checks, evidence, found not done, decisions to confirm, the log) was moved word for word to `docs/progress/archive/`; nothing was deleted. The plan index is `docs/KABSI-PLAN.md`, the core is `docs/KABSI-MASTERPLAN.md`, the order of work is plan section 7.

## Where things stand

- Built and live: sessions 1 to 16, 18, 20, 20a, 20b, hotfix 20h and the 22 Oct sync session. Google is live on Yawmiyati; the first real reply was published and verified; the post removal was verified on Google (23 Oct). kabsi.co runs on Vercel; Creem is the only payment route (test mode, not open). Evidence: `docs/progress/archive/evidence.md` and `where-things-stand.md`.
- Merged 23 and 24 Oct, docs and config only: Session 19 PR 0 (PR 196), Ops 1 part A (PR 197), Session 0 (PR 198 and PR 199, the docs diet).
- Clean 1 (master plan 28.9, PR 200, merged and verified live 24 Oct): unused code, packages, Edge Functions, a script, a page and a skill removed, the Lovable leftovers gone, the database drops written for Rashid. Detail: `docs/progress/archive/2026-10-24-clean-1.md`.
- Ops 1 part B (PR 203 and PR 206): section 30 committed (R-90); encrypted weekly backup and restore drill (the database step waits for Rashid's secrets); locked installs and pinned actions; Sentry releases; legal pages; the runbook; Lighthouse CI (report only); sender `Kabsi <hello@send.kabsi.co>` live with DKIM, SPF and DMARC passing. Detail: `docs/progress/archive/2026-10-24-ops-1-part-b.md`.
- Session 13b part 1 (the WhatsApp agent): roles and router for every kind of person, the one sender, templates, number health, 18.2 and 18.3, the 141-case suite; migrations applied 25 Oct. Detail and the phone test: `docs/progress/archive/2026-10-25-session-13b-1.md`.
- 25 Oct, lane R (PR 218): DESIGN.md, docs/COPY.md, the teardown, docs/LATER.md, master plan 30.11, faster session rules, new kabsi-copy lines, the webapp-testing skill.
- Fix 1 (PR 219, merged 25 Oct, deploy run 98): the Kapso webhook is registered, the 10 templates are submitted (pending), number health alerts only on YELLOW, RED or BLOCKED, the reply parser takes the first JSON object, the waiting post has Cancel, the evaluation false alarms are fixed. Detail: `docs/progress/archive/2026-10-25-fix-1.md`.
- Session 10 / D, Creem (PR 221 and PR 223, 25 Oct): the `billing-creem` webhook (signature, once per event, replay guard, the job queue as the only writer of paid state), owner actions on the Plan page and in WhatsApp, the 27.4 limits, the founding count, the 30-day partner trial, the inline email logo. Live: bad signatures get 401, `/founding` answers 30. Plans stay closed (`billing_open` off). Detail: `docs/progress/archive/2026-10-25-session-10-creem.md`.
- V1 (Visibility Map engine, 25 Oct): 7 by 7 grid from DataForSEO public results only (mock until `dataforseo_mode` is live), three numbers, the WhatsApp line, the map image, competitor picks and snapshots, the category check, the DataForSEO cap, 30-day deletion after leaving. Not sent to owners yet. Google guard: not applicable. Detail: `docs/progress/archive/2026-10-25-v1-visibility-map.md`.
- QA 1 (PR 225 and PR 227, 25 Oct): Playwright journeys, visual baseline and axe, the WhatsApp replay harness, Creem test checkout with a WhatsApp cancel, emails, nightly smoke, Nora judged (3.33 of 5). Fixed a billing race; Creem refuses extra locations on one subscription. Detail: `docs/progress/archive/2026-10-25-qa-1.md`.
- 25 Oct, lane R: owners read "places around you", never "spots", and "website", never "app" (PR 228). The design studio is set up (master plan 30.13, R-94): itskaysyoga-gif/kabsi-design-studio, synced with Lovable, with its brief, photos, parts and checks.
- Growth 1 (PR 226, 25 Oct): consent bar (EU, EEA, UK, Switzerland, UAE, Saudi Arabia) and "Your privacy choices", the 20.1 events in docs/EVENTS.md, Pixel and Conversions API (off until Rashid's Meta step), scrubbing; migration applied by lane R. Detail: `docs/progress/archive/2026-10-25-growth-1.md`.
- Next: 13b part 2 (Opus) and Design 1 (Opus) together, then V2 (Sonnet); Design 2 and 3 after Rashid approves Design 1; Web 2 and UX 1 port the approved design.
- No customer is live yet. The launch gate (master plan 27.13) is not started.

## WhatsApp ladder (master plan 25.5)

The facts say "WhatsApp is live" only when the last step is done.

| Step | Done | Proof |
|---|---|---|
| Number acquired | 23 Oct 2026 | +1 205-745-6874 connected in the Kapso project Kabsi.co; Kapso health check Passed 10:17 Beirut (master plan 9.8) |
| Profile set | 23 Oct 2026 | Photo, about, email, address, website and description live; the display name "Kabsi" is waiting for Meta's approval (master plan 9.8) |
| Webhook verified | not yet | 25 Oct (Fix 1): registered, active, on Kabsi's URL, secret in Vault (`whatsapp/staff/setup`, request 49115). Verified when the first message from the phone test arrives |
| Templates approved | not yet | 25 Oct (Fix 1): all 10 submitted, all PENDING at Meta (request 49120). Approved when they read APPROVED |
| Inbound tested | not yet | Suite of 141 cases passes in CI; the live pass on Rashid's phone is next |
| Outbound tested | not yet | A live send to Kabsi's own test phones |
| Owners switched on | not yet | After the launch gate |

## Open for Rashid (as last recorded; the full table is `docs/progress/archive/steps-only-rashid-can-do.md`)

- Done 25 Oct: Clean 1 drops (done, read-back 0 on all four), the Places purge (done, read-back `0 | 0 | 0`), the Resend webhook, R2 and the bucket `kabsi-backups`, the five backup secrets, `SENTRY_AUTH_TOKEN` in Vercel, the Pub/Sub topic `gbp-notifications` with its push subscription and secrets, `WHATSAPP_LIVE` set to `true`, the post Undo test.
- Session 19 rest: the Places purge is done (Rashid ran `supabase/manual/20261025_places_data_purge.sql` on 25 Oct, read-back `0 | 0 | 0`). Pub/Sub waits for a natural review on Yawmiyati: nobody at Kabsi writes or edits a review to test it (fake review rule). The "testing it" post is cancelled (back to a draft, 25 Oct); Skip it in the app if it is still listed.
- Phone test (13b part 1): the webhook is registered; make a staff code at kabsi.co/staff and run the test in `docs/progress/archive/2026-10-25-session-13b-1.md`.
- Postponed to `docs/LATER.md`: the failing Backup run, the disabled branch ruleset, the inbox tests, Sentry membership (free plan allows 1).
- Supabase Auth: leaked-password protection; paste the four `emails/auth/*.html` templates.
- Google Cloud: Places quotas and budget alerts; contacts and owners on kabsi.co addresses only.
- Supabase Pro with point-in-time recovery and Vercel Pro, before the first payment.
- Creem (session 10): send one test event from Creem's dashboard to the webhook (expect 200 and one `billing_events` row), add the product bundle, mark Yawmiyati's organisation `billing_test` if you want to try the paid buttons. Hussein only at going live (verification, payout). Exact steps: `docs/progress/archive/2026-10-25-session-10-creem.md`.
- A lawyer reads /terms, /privacy and the partner terms (master plan 29.8).
- Master plan 19.6: two-step verification everywhere, recovery codes offline, the second Kabsi Google account.
- Growth 1: Meta dataset, token, WABA id, VITE_META_PIXEL_ID, Speed Insights (docs/EVENTS.md, last section).
- V1: a free Geoapify key, saved as the Supabase secret GEOAPIFY_API_KEY (clicks in `docs/progress/archive/2026-10-25-v1-visibility-map.md`); until then maps draw on a plain ground. DataForSEO top-up and Gemini billing at the launch gate.

## Open After merge checks and findings

- After merge checks that a session could not run (they need a phone or a person) are in `docs/progress/archive/after-merge.md`. The first session of each kind reads the ones for its own area before starting.
- New in Ops 1 part B: zod 3 to 4 is a session of its own (dependency review names it as an exception); one test row `bounced@resend.dev` is left in `email_suppressions`. Full list in the archive entry.
- Found, not done: `docs/progress/archive/found-not-done.md`. Decisions to confirm: `docs/progress/archive/decisions-to-confirm.md`.
- Session 19 rest closed the session 18 items: the post Undo test passed on 25 Oct (P0.7-05b, an Update with no Learn more link: approved 05:34:54, undone 3.7 seconds later, cancelled, never sent to Google); Pub/Sub is registered live and a forged push gets 401 (P0.7-03); the push from a real review is still to be seen.

## Recent entries (newest first)

- 25 Oct 2026, Growth 1: measurement, consent, Meta. Detail: `docs/progress/archive/2026-10-25-growth-1.md`.
- 25 Oct 2026, QA 1: end-to-end journeys, baseline, replay harness, Creem test checkout, smoke. Detail: `docs/progress/archive/2026-10-25-qa-1.md`.
- 25 Oct 2026, V1: Visibility Map engine, map image, Competitor Watch data, category check, spend cap. Detail: `docs/progress/archive/2026-10-25-v1-visibility-map.md`.
- 25 Oct 2026, Session 10 / D (Creem): PR 221 and the part 2 PR. Detail: `docs/progress/archive/2026-10-25-session-10-creem.md`.

## How a session updates this page

1. Change "Where things stand", the ladder (only with proof, in the Proof column), "Open for Rashid" and "Recent entries" as needed. Keep this page under 10 KB: drop the oldest recent entry when you add one.
2. Put long evidence (commands run, outputs, SQL read-backs, After merge results, found not done, decisions to confirm) in one new file, `docs/progress/archive/<yyyy-mm-dd>-<session>.md`, and link it in one line under "Recent entries".
3. Use the session report of master plan 25.6: the pull request link, a 3-line summary, the tests actually run (exact commands), what was verified live and how, manual steps left for Rashid, known limits. A merged pull request or a passing mock test is never called live.
4. No em dashes, en dashes or exclamation marks.
