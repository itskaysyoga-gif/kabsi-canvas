---
name: "kabsi-build-session"
description: "Use in any Claude Code session building Kabsi (repo itskaysyoga-gif/kabsi-canvas): the standing rules, hard stops, lean testing and handoff format for bundled build sessions."
---

# Kabsi build session

Rashid runs Kabsi and the build sessions, and the lane R chat decides on his authority (R-41). Hussein only holds the Creem account. You build. The repo is the source of truth: CLAUDE.md, docs/KABSI-MASTERPLAN.md (it wins over older plan text), docs/KABSI-PLAN.md (section 2 rules, section 4 decisions, section 7 order and waves), docs/KABSI-PROGRESS.md, docs/source/.

## Start
1. Confirm the model matches the one named in the prompt. If not, stop and say so.
2. Read CLAUDE.md, plan sections 1 and 2, the master plan sections your task touches, the cards for your tasks, PROGRESS, and only the decisions the cards name.
3. Check any open item from the previous session that PROGRESS says Rashid had to do (SQL files, secrets). Record what you find in one line and carry on. Creem account steps are Hussein's.

## Work
- Do the tasks in the order given. One branch and one PR per task, branch names claude/<task-id>, for example claude/session-19-pr0 or claude/p0-3-07.
- Build on what earlier tasks made. Do not redo it.
- Apply database changes yourself and merge your own PR when ci.yml is green, without asking. The Vercel check does not block.
- Parallel sessions (master plan section 17): never touch another running session's area. Merge main into your branch (merge commit, never rebase) and run the checks again right before your own merge. Write only your own heading in docs/KABSI-PROGRESS.md. Give migrations a timestamp in the file name.
- If context runs low, stop after a merge and report what is left. Never start the next session's tasks.

## Hard stops
- Paid calls follow R-43 to R-46 and PROGRESS. AI is on demand only: the Anthropic key lives in Supabase secrets, there is about 100 US dollars of promotional credit until 17 Nov 2026 with auto-reload off, and EVAL_LIVE stays false (no live evaluation in CI). Build against mocks, fixtures and stubs. Make only the model calls a card needs and report how many in the PR and in PROGRESS. A live reply evaluation runs by hand only: 20 cases from scripts/eval/cases.json when a reply prompt changes, and the full 200-case reply set and Nora's 60 questions once, on the final prompts, before the credit ends.
- Live WhatsApp sends go only to Kabsi's own test phones until launch. No cold messages, ever. No other paid API calls (Meta templates, transcription, data providers) without Rashid's yes.
- Google calls follow google_mode() and PROGRESS. The demo business stays on mock always (R-17). places_daily_cap is 20 (R-47); raise it only when Rashid says so.
- Never use the Kapso connector for Kabsi (R-49). Kapso is reached only by Kabsi's own code. Never write, paste or print a secret.
- Do not change prompt files while the eval gate is off, unless the kabsi-reply-lab skill has been run on the change and its results are recorded in PROGRESS.
- Stop before dropping tables or columns or deleting real data. Drops and real deletions go in their own file with a read-back query and the expected result, and Rashid runs them (R-35, R-44).
- Additive SQL with on delete clauses (for example foreign keys with on delete cascade) is applied by you with execute_sql and a read-back in the same call (R-44). The connector's apply_migration refuses the clause; execute_sql runs it.
- Stop and ask only before a step the task marks "Ask Rashid before", or when a task needs a manual step of Rashid's that PROGRESS does not record as done.

## Google guard (any change under supabase/functions/_shared/google/ or anything that writes to Google)
Before opening the PR, review the diff against these and fix what fails:
- Every write goes through the one publication pipeline, never a direct call.
- Owner approval exists for the write, except Pro auto-fix on regular hours, special hours or website when the owner opted in.
- Never patch when verificationState is not VERIFIED. Never auto-change name, address, category, map pin, phone or open status.
- Auto-fix respects google_revert_log: 2 reverts of a field in 30 days stops it and asks the owner.
- Handle 429 RESOURCE_EXHAUSTED with backoff and the circuit breaker; handle NOT_FOUND and PERMISSION_DENIED with a plain message and no retry loop.
- updateMask lists only the fields changed. Respect the project quota (300 per minute) through the existing limiter.
- Mock mode: every new call has a mock using tests/fixtures/google/ and works with google_mode = mock.
- No Places data stored beyond Google's limits (place IDs only long term). Never claim a competitor made an edit.
- Never reproduce Google review text outside Kabsi except the owner's own review graphics (truncated, reviewer first name and initial).
Record "Google guard: passed" with any notes in PROGRESS.

## Testing: lean, not ceremonial
Goal: features that work, proven once.
- Required: typecheck, lint on the committed diff, the existing test suites CI runs, build.
- Write new tests only for what the card's "Done when" asks, plus access rules (RLS: one business can never see another; roles get exactly their rights; a phone never sees a business it is not bound to) and anything touching money, consent or publishing to Google.
- Screens: one pass at 390 px for each new or changed screen, read the screenshots, fix what is off. Add 1440 px only for layout-heavy screens.
- Migrations: dry-run against production in a rolled-back block only when the migration changes existing data, triggers or RLS. Simple additive migrations: apply after CI is green and read back.
- Do not wait on the Load workflow unless the change adds triggers or touches the job queue or sync.
- After merge: confirm Deploy is green, the live app loads, and recent jobs have not failed. That is enough.

## Always
- Never imply Google approves, endorses, sponsors or partners with Kabsi (K-112). No "compliant with Google" badges.
- No invented proof: no fake logos, numbers, testimonials or "trusted by" lines. No ranking or autopilot promises. No industry statistics (plan 2.11).
- Never use anyone's personal email in Kabsi (R-32). Kabsi uses hello@kabsi.co.
- Every behaviour, price or wording change updates knowledge/kabsi-facts.md (K-104) and public/llms-full.txt when relevant.
- Design tokens only (K-108). English first (K-119). No em dashes, en dashes or exclamation marks anywhere. Product copy follows the kabsi-copy skill.
- Facebook and Instagram links come only from the SOCIAL_LINKS constant (R-59). No Arabic is shown anywhere public (R-61); the product still answers in Arabic silently where the owner or reviewer writes it.
- Staff alerts go to WhatsApp, never Slack (R-64). Leave existing Slack code alone until session 13b part 2 removes it.
- Never store owners' Google tokens. Never ask anyone for passwords or codes.
- Use available Claude skills when they fit: frontend-design for new screens, kabsi-reply-lab for anything touching reply prompts, kabsi-copy for any line a reader sees, kabsi-outbound for Outbound, the Supabase and Kapso skills for database and WhatsApp work, xlsx/pdf/docx for files.

## Finish
Update docs/KABSI-PROGRESS.md (row, evidence, After merge, Found not done, Decisions to confirm) in the task PR or one small docs PR.
Reply to Rashid, short, per task:
- What changed (plain words, no file lists).
- What you verified (one line).
- What needs Rashid: only real actions, each with the exact SQL file path or click path and the read-back result to expect. Creem account steps go to Hussein.
