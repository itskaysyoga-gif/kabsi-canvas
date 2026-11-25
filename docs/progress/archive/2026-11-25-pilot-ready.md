# PILOT-READY, 25 Nov 2026 (R-165)

Ran in parallel with OUTBOUND-3 (outbound code), HARVEY-10 (another repository) and SITE-4 (public pages, components, DESIGN.md).

## What was built
- One price. `src/lib/offer.ts` is the one place (29 a month per location, 19 founding, `TRIAL_LINE`, `FOUNDING_LINE`). `src/lib/site.ts` adds `ONE_PLAN` and words `PRICES_SENTENCE`, `PLAN_PRICE_ROWS`, `foundingLine`, `HELP_LINE` and `REFUND_LINE` from it; the old two-plan numbers (`PLAN_PRICES`, `FOUNDING_PRICES`, `HELP_LINES.pro`) stay only as deprecated exports so SITE-4's components compile. The lifecycle and account emails, partner email, receipt and failed-payment previews, WhatsApp `prices`, `trial`, `needsAccount`, `scanPicked`, hand-off (one promise: the same working day), plan-change lines, the staff billing line, the old Founding 25 messages and /terms sections 8, 9 and 14 say one plan. `docs/email-previews` regenerated. SYNC.md rows for the price, the trial and the founding price rewritten.
- Guards. `tests/prices.test.ts` is the one-plan guard (amounts 29 and 19 only; a new test reads every line a reader sees in the email, WhatsApp, billing, programs, site.ts and terms files for Essentials, Pro, no card, Start free, 15 days and 15 dollars). `tests/helpers/house-rules.ts` allows only 29 and 19 monthly; `docs/COPY.md` is read for prices from section 90 on (older sections are history).
- GATE-2 wording: `docs/COPY.md` section 93 (and the one price lines), `knowledge/facts/05-setup-and-onboarding.md`, `node scripts/build-kb.mjs` run (facts, llms-full, llms-base), Nora stub gate passes (60 questions and the page questions, 0 style failures).
- Replay harness: migration `20261125060052_replay_personas_and_locks.sql` (applied with apply_migration; file renamed to the recorded version): `qa_ensure_whatsapp_personas()` makes the fictional users, memberships, opt-ins and phone bindings again (production had none of them: 0 persona users, 0 bindings, which is why every step answered needs_account), `qa_replay_lock` and `qa_replay_unlock` with the table `qa_replay_locks` (a scenario takes its phones for 5 minutes; a second scenario on any held phone is refused). `replay-db.ts` calls the first in `reset`; `replay-run.ts` locks first and always unlocks. Replay voice notes carry their words inside the audio (`replay-say-1` to `replay-say-7`, `replay-say-yes`) and the route's `transcribe` reads them, so voice tests call no paid transcription. New scenario `launch_16_18`.

## Tests changed (for lane R)
`tests/prices.test.ts`, `tests/helpers/house-rules.ts`, `tests/sync-guards.test.ts` (one plan, COPY.md from section 90), `tests/sync2a.test.ts` (the Pro hand-off time is retired), `tests/lifecycle.test.ts`, `tests/programs.test.ts`; Deno: `lifecycle.test.ts`, `conversations.test.ts` (prices, trial, hand-off), `catalog.test.ts`, `possessive.test.ts`, `outbound/inbox.test.ts` (OUTBOUND-3's file: one expected line, the founding sentence), `replay.test.ts` (lock, voice words, launch_16_18). Nothing weakened.

## Pull requests
598 (one price, GATE-2 wording, replay bindings and locks, launch_16_18), 600 (QA review reset, QR voice reply carries "I heard", sequence fixes), 601 (fixtures padding, expectations), 602 (old_card wording). All merged on green CI; the Deploy workflow was green after each. Review by a fresh agent on PR 598: six findings, five confirmed and fixed (terms card and yearly wording, "let it end" on a card trial, same-scenario lock now keyed by run, lock expiry 15 minutes and unlock retried, `problem()` checked before the reset); the sixth (empty phone list) cannot happen because the runner always has phones.

## Migrations applied (apply_migration, versions as recorded)
20261125060052 `replay_personas_and_locks`, 20261125061223 `replay_reports`, 20261125062441 `replay_fixtures_reset`, 20261125063758 `replay_fixtures_padding` (used channel api, failed the channel check), 20261125063851 `replay_fixtures_padding_channel` (the working one). All additive; no table or row of a real business is touched. Read-back: `qa_ensure_whatsapp_personas()` made 5 users, 7 role rows, 5 opt-ins (phone_roles on +1 212 555 010x was 0 rows before).

## The replay harness on production (route `POST /whatsapp/staff/replay`, called with `select public.call_internal(...)`, results read from `public.qa_replay_reports`, 25 Nov 2026 06:2x to 06:5x UTC)
Run one at a time (a second scenario on a held phone answered "another scenario is running on +1212555xxxx; run one at a time": owner_stop with voice_limits fired together, voice_limits was refused, owner_stop passed).
| Scenario | Result |
|---|---|
| owner_script | pass (7 steps) |
| owner_stop | pass |
| manager_staff | pass |
| two_roles, two_businesses, unknown_phone, voice_limits, stranger_card | pass |
| old_card | pass (approve, repeat, undo, undo again) |
| launch_16_18 | pass, 34 steps |
| billing_cancel | not run: no billing phone is seeded (needs the QA test account) |
| nora_live | not run: it spends model credit |

Every reply was `mock_sent`; nothing left Kabsi.

## Checklist lines 16 to 18, from the replay (owner phone of the demo business Harbour Lane Coffee)
| Line | Result | What Kabsi answered |
|---|---|---|
| 16.1 What needs my attention? | pass | "Waiting for you" with a numbered list |
| 16.2 a number, then "Make this reply more professional" | number pass; rewrite FAIL in replay | The number shows the draft with Approve. The rewrite answered the off-topic line: the intent model is not run in a replay. Not verified; Rashid's real message decides |
| 16.3 Change my opening hours on Saturday, then 10am to 4pm | question pass; week FAIL on demo data | Asked "What are your new hours on Saturdays?"; then "Kabsi does not have your hours yet" because the demo business has no weekly hours on file, so the week and Approve were not shown. Needs a business with hours (Yawmiyati) |
| 16.4 photo with Post this | pass | "Post with your photo" shown back for the yes |
| 16.5 How many reviews this month | pass | "the last 30 days: 17 new reviews, average 3.2 stars" |
| 16.6 everything you did this week | pass | "Your week from 2 November" with the report link |
| 16.7 review QR code | pass | the QR image with its caption |
| 16.8 stats | pass | the 7 day stats |
| 16.8 monthly report | pass | "Your first monthly report is made on the 1st of next month" |
| 16.8 feedback | pass | "What customers mention" with the 90 day topics |
| 16.8 profile health | pass | "2 of 5 profile items are in place" |
| 16.8 how do I compare | pass (honest answer) | "Google did not return their figures this time" (mock Google returns no nearby figures) |
| 17 the seven as voice notes | 6 of 7 pass; the rewrite is the same limit as 16.2 | Each reply opens "> I heard: ..."; the QR code reply sends the heard line first as its own message (fixed in PR 600, it had none) |
| 17 a voice "yes" | pass | "> I heard: yes" then "A voice note cannot say yes. Tap Yes, or type it yourself." Nothing approved |
| 18 the off-topic line | pass | ends with "talk to a person" and hello@kabsi.co |
| 18 the name change | pass | "Kabsi does not change that from a chat" with the guide; nothing changes |
| 18 staff cannot approve | pass | staff tap on the owner's Approve: "No longer yours to approve. Nothing changed."; staff typing yes: "Nothing is waiting" |
| 18 STOP then START | pass | one confirmation, then nothing, then "Welcome back" |
Line 19 (real delivery within 10 seconds and the template outside 24 hours) is not tested here: Rashid's real messages test it.

## Item 4, the two test checkouts: not done
Blocked, nothing changed. Both checkouts must be started by the signed-in owner of Yawmiyati (`POST /billing-creem/owner`, owner session only; a build session holds no owner session and never sees a Creem key), and the founding checkout needs an accepted Founding 25 place linked in Staff, which needs a staff session; there is no founding application (0 rows). Read-back on 25 Nov: `billing_test` on Yawmiyati's organisation is false, 0 subscriptions, 0 founding applications, `billing_open` off, 9 old webhook events. I did not set `billing_test`, so there is nothing to reset. Steps for Rashid are in PROGRESS.

## Found, not done
- `publish_approve` idempotency key from a row count (LATER row). The replay fixtures pad the demo review.
- The public components SITE-4 owns still carry two-plan wording (LATER row); Outbound's "Kabsi Pro" line is OUTBOUND-3's (LATER row).
