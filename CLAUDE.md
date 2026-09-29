# Kabsi: instructions for Claude Code

Kabsi takes care of a local business's Google Business Profile: reply drafts for every review, profile care, Listing Shield, a review link and card, and a Monday report. Stack: TanStack Start on Lovable, Supabase (Postgres, Auth, Edge Functions), a Cloudflare Worker for card taps (`workers/kabsi-go`), Sentry, PostHog, Slack.

## Read first, in this order

1. `docs/KABSI-SPEC.md`: the decision log (D-entries). It wins over everything else in the repo.
2. `docs/KABSI-STATE.md`: what is live, what is broken, what is next.
3. `docs/WORK-QUEUE.md`: take the top unchecked task unless the prompt names another.

Read only the files the task lists. Use `grep` before opening large files. Never read `bun.lock`, `src/routeTree.gen.ts`, `public/llms-full.txt` or old migrations unless the task needs them.

## Rules that never bend

- Nothing reaches Google without an owner's approval, or a named delegated approver's; the publications ledger records who approved it (D202).
- Honesty (spec §3): never promise more reviews, higher ratings or rankings; no fake reviews, no review gating, no rewards for reviews. Demo content is labelled "Example".
- Copy: no em dashes, no en dashes, no exclamation marks, plain words. Module names exactly: Replies, Profile Care, Listing Shield, Review Link and Card, Monday Report. Plans: Free, Pro, Partner.
- Lebanon-only card wording goes through `src/lib/region.ts`; Manager-invite steps live only in `ManagerAccessInstructions` (see `AGENTS.md`).
- Secrets never appear in code, commits, logs, PR text or screenshots. They live in Supabase secrets and GitHub Actions secrets.

## Git and Lovable

- `main` is connected to Lovable: every push to `main` shows up in Lovable's editor. Keep `main` working.
- Never force-push, rebase, amend or squash commits that are already pushed.
- One task, one branch (`claude/<task-id>`), one pull request. Keep diffs small; if a task needs more than about 10 files, stop and propose a split in the PR.
- Never hand-edit `src/routeTree.gen.ts`. New database changes are new timestamped files in `supabase/migrations`; never edit an existing migration.

## Before opening a pull request

- `bun install`, then `bunx tsc --noEmit`, `bun run lint` and `bun run build` (npm works if bun is missing).
- For changed Edge Functions, run `deno check` on them when Deno is available.
- The PR body says what changed, how to test it, and any "Proposed D-entry" for a new decision.

## Deploys

Cloud sessions do not deploy. Rashid reviews and merges; Lovable publishes the site; Edge Functions and migrations deploy the way they do today until the CI deploy workflow (queue item Q16) exists.

## End of every session

1. Add at most five lines to `docs/KABSI-STATE.md` under "Log": date, task, what changed, what is next.
2. Tick the task in `docs/WORK-QUEUE.md`.
3. Never write a new decision straight into `docs/KABSI-SPEC.md`; propose it in the PR. Rashid accepts it in the Claude.ai project, then a later session records it.
