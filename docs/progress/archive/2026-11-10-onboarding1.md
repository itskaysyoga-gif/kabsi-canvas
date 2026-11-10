# Onboarding 1: two optional questions at signup (10 Nov 2026)

Task Onboarding 1, lane R decision R-145 (master plan 30.48). Branch `claude/onboarding1`, one pull request. The questions appear only in signed-in onboarding and in About your business, never name the request book, and send nothing.

## What changed

- **Migration** `supabase/migrations/20261110035354_onboarding1_request_answers.sql`, additive, applied with `apply_migration` (name `onboarding1_request_answers`) and read back. Six columns on `public.locations`: `request_tracking` (booking_app, chats, notebook, memory, other), `request_tracking_app` (80 characters, only with booking_app), `request_tracking_at`, `early_access_whatsapp` (true Yes, false No), `early_access_at`, `onboarding_questions_at`. Four check constraints (a date exists exactly when its answer exists; an app name only with booking_app). No new policy: the answers are read through the location's own select policy (a member or staff). `public.save_request_answers(location, tracking, app, early)` (owner or manager, definer, row lock, audit) is the only write; a null removes that answer; the date of an answer that stays answered is kept. `private.onboarding_facts` gains `questions_done`. `public.staff_request_answers()` (staff only) returns counts, Gate 3's verdict and the first qualifying businesses.
- **Onboarding**: a new screen `questions` (stage 2, "Sign in") after the business is confirmed and before Connect WhatsApp: "Two quick questions", Continue (the yellow button) and Skip. Shown once (`questions_done` is false), not for a demo business or one whose access already works. `src/components/onboarding/request-answers.tsx`, `src/lib/request-answers.ts`, `src/lib/onboarding-flow.ts`, `src/routes/_authenticated/start.tsx`.
- **About your business** (`/app/knowledge`): the same two questions below the facts, with Clear answer and Save answers.
- **Staff**: Businesses gains Early answers (`src/components/staff/request-answers-panel.tsx`).
- **Docs**: master plan 30.48 (and "Changed by" lines under 30.44 and 30.45), plan index R-145 row, `docs/kabsi-3/build-plan.md` gates and Rashid's steps, COPY.md section 73, privacy page list item, facts 11 (9.2 and the retention table) and the built facts and llms files, SYNC.md rows and guard row, LATER.md.

## Decisions to confirm (lane R)

1. "Answered" for Gate 3 means a business answered at least one of the two questions; its place in the order is its first answer, whichever question. A business that answered only one cannot qualify.
2. Demo and test businesses (`is_demo`, `billing_test`) and businesses that asked to leave are left out of every count.
3. Exactly 2 of the first 10: the page says lane R decides (the rule is silent).
4. Lines the build session wrote, for lane R to confirm (COPY.md section 73): "Two quick questions", "Both are optional. You can skip them, and change your answers any time in About your business.", "Continue", "Skip", "Name of the app (optional)", "Two questions from setup", "Both are optional. Change or clear them any time.", "Clear answer", "Save answers", "Saved.", the staff headings. The two questions and their choices are lane R's words.
5. Privacy and facts say "whether you want to try new WhatsApp tools first" for the second answer, not "early access", because `tests/sync2a.test.ts` holds the facts free of the retired early access wording. The question itself keeps lane R's words.
6. An owner or manager can answer; a staff member of the business cannot. The answer date is the first answer, kept when the answer changes and cleared when it is removed.
7. A business already part way through setup (confirmed, access not yet working) sees the questions once on its next visit; a business whose access already works does not, and can answer in About your business.

## Found, not done

See `docs/LATER.md` (two rows added). The R-144 row is missing from the plan index and the index is over its size limit.

## Independent review (a fresh agent given only the diff and the rules)

No blocking defect against the eight rules. Fixed: (1) the change log kept the old and new choices, which contradicted "clearing an answer removes it"; a second additive migration `20261110041123_onboarding1_audit_booleans.sql` (applied, read back) makes the audit row say only whether each question is answered; (2) the 80 character cut counted UTF-16 units and could split an emoji, now cut by characters, with a test. Left as they are, for the record: the migration's four constraints are not idempotent (applied once, a replay would fail on "already exists", the same as the repository's other migrations); a business with a Google disconnect request still counts (only a deletion request leaves the count); the order of the first 10 moves if an owner clears an answer, because clearing clears its date (by the rule); Skip in a second tab could wipe answers saved a moment earlier in the first (the screen shows only while nothing was saved); a member with the staff role who reaches /start sees a failing Continue, as the existing confirm step does.

## Checks and evidence

Pull request 541, merged as 6ed8c5c on 10 Nov 2026 after merging main three times (Nora 2, RB-F2).

- `npm run typecheck`: clean. `npm test`: 140 files, 1583 tests passed. `npm run build`: passed. `node scripts/build-kb.mjs --check`: exit 0. `npm run lint:changed` and eslint on the new files: clean. `tests/onboarding1-request-answers.test.ts`: 27 tests.
- Playwright against a local build: `onboarding1-questions.spec.ts` 10 of 10 at 390 and 1440 px; `smoke.spec.ts` 27 passed, 1 skipped; `public.spec.ts` 87 passed, 1 skipped.
- CI on the merged head adf973ea: all 14 checks green (App, Edge Functions, Database pgTAP including `onboarding1_request_answers.sql`, Load, Speed gate, Nora gate, Prompt gate, CodeQL, secret scan, dependency review, Lighthouse). The Load job failed once on an earlier head (one cold dispatcher run, 53.6 s, minute 2); re-run once, passed, and it passed again on the final head. An earlier pgTAP failure was this pull request's own (the test inserted a second business the fixtures already make); fixed. One CodeQL note on a test helper (tag stripping); fixed.
- The database logic of both functions was also run on a local Postgres 16 with stubbed helpers (19 checks, all true) before CI.
- Production read-backs (select only): six columns and four checks on `public.locations`; `anon` cannot execute either function, `authenticated` can; no existing row has an answer (7 locations). After the second migration the function body audits only the two booleans.
- Live on kabsi.co after the deploy (55 seconds after the merge): `/privacy` carries "Two optional answers from setup"; `onboarding1-questions.spec.ts` run against https://kabsi.co with a made-up session (Supabase answered by the test): 10 of 10 at 390 and 1440 px (questions shown after the business is chosen, Skip saves nothing, Continue saves choice and app name, not asked twice, About your business changes and clears, staff Early answers shows counts and names in order); anon calls to both functions answer 401 and an anon read of `locations` answers 42501.
- Not run live: a real owner or staff login (no QA code in this session), so the real staff view with real counts and a real save through the browser are not seen yet; the pgTAP suite runs only in CI.

Pull request 541, merged as 6ed8c5c on 10 Nov 2026 after merging main three times (Nora 2, RB-F2).

- `npm run typecheck`: clean. `npm test`: 140 files, 1583 tests passed. `npm run build`: passed. `node scripts/build-kb.mjs --check`: exit 0. `npm run lint:changed` and eslint on the new files: clean. `tests/onboarding1-request-answers.test.ts`: 27 tests.
- Playwright against a local build: `onboarding1-questions.spec.ts` 10 of 10 at 390 and 1440 px; `smoke.spec.ts` 27 passed, 1 skipped; `public.spec.ts` 87 passed, 1 skipped.
- CI on the merged head adf973ea: all 14 checks green (App, Edge Functions, Database pgTAP including `onboarding1_request_answers.sql`, Load, Speed gate, Nora gate, Prompt gate, CodeQL, secret scan, dependency review, Lighthouse). The Load job failed once on an earlier head (one cold dispatcher run, 53.6 s, minute 2); re-run once, passed, and it passed again on the final head. An earlier pgTAP failure was this pull request's own (the test inserted a second business the fixtures already make); fixed. One CodeQL note on a test helper (tag stripping); fixed.
- The database logic of both functions was also run on a local Postgres 16 with stubbed helpers (19 checks, all true) before CI.
- Production read-backs (select only): six columns and four checks on `public.locations`; `anon` cannot execute either function, `authenticated` can; no existing row has an answer (7 locations). After the second migration the function body audits only the two booleans.
- Live on kabsi.co after the deploy (55 seconds after the merge): `/privacy` carries "Two optional answers from setup"; `onboarding1-questions.spec.ts` run against https://kabsi.co with a made-up session (Supabase answered by the test): 10 of 10 at 390 and 1440 px (questions shown after the business is chosen, Skip saves nothing, Continue saves choice and app name, not asked twice, About your business changes and clears, staff Early answers shows counts and names in order); anon calls to both functions answer 401 and an anon read of `locations` answers 42501.
- Not run live: a real owner or staff login (no QA code in this session), so the real staff view with real counts and a real save through the browser are not seen yet; the pgTAP suite runs only in CI.
