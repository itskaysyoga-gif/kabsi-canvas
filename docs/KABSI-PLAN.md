# Kabsi implementation plan: index

Version 1 was written on 4 Oct 2026 from the six source documents in `docs/source/`. **On 24 Oct 2026 (master plan 27.12, R-85) this file became an index.** It keeps the guardrails, the rules for build sessions, the decision table with status and the order of work. Everything else was moved, word for word, to `docs/plan/archive/`; nothing was deleted, and the full history is in git. The master plan (`docs/KABSI-MASTERPLAN.md`) is the always-read core and wins over this file and every older text; later master plan sections win over earlier ones (30 over 29 over 28 over 27 over everything older). Current status is `docs/KABSI-PROGRESS.md` (one page), its history is in `docs/progress/archive/`.

## Contents

1. Guardrails (digest here; full text in the archive)
2. Rules for every build chat (here, in full)
3. Sources and precedence (here, in full)
4. Review decisions R-01 to R-90 (table with status here; full text in the archive)
7. Order of work (here, short; the full section and the task cards are in the archive)
8. Where everything went

## 1. Guardrails

These are the standing rules for every build chat. The list below gives each guardrail by title. The full text is `docs/plan/archive/sec-01-guardrails.md` (a copy of `docs/source/KABSI-GUARDRAILS.md` with the amendments of 21 to 23 Oct 2026); `CLAUDE.md` holds the rules that never bend. Read the full text of any guardrail your task touches. If the audit disagrees with it, the audit wins; the master plan wins over both.

- 0. Canonical launch decisions
- 1. The most important rule
- 2. Kabsi's core product loop
- 3. Old architecture does not survive just because it exists
- 4. Business Knowledge is a core system, not a settings form
- 5. One task system
- 6. One approval and publication pipeline
- 7. Google Protection is not auto-revert
- 8. Auditability is part of the product
- 9. Google API layer
- 10. Jobs, queues and retries
- 11. Security is not a later refactor
- 12. Mobile owner experience first
- 13. Onboarding
- 14. First value
- 15. Reviews
- 16. Photos and content
- 17. Weekly Care Report
- 18. Nora and AI
- 19. Partners
- 20. Document completeness is not product completeness
- 21. Final page-by-page audit
- 22. Launch gate
- 23. Real data before marketing
- 24. Remove contradictions
- 25. Testing
- 26. Do not overengineer
- 27. Definition of done
- 28. Go to market
- 29. AI agents

## 2. Rules for every build chat

### 2.1 Start and scope

1. One task per chat. The prompt names a task ID. Do that task and nothing else.
2. Read, in this order: section 1 (guardrails) and section 2 of this file, the section for your task, then `docs/KABSI-PROGRESS.md`. Open a file in `docs/source/` only where the task section names a decision you need to read in full.
3. Check that every task listed under "Depends on" is marked done in PROGRESS. If one is not, stop and report.
4. If your task needs one of Rashid's decisions or inputs (section 5) that PROGRESS does not record, stop before writing code and ask him in one question.
5. Anything you notice outside the task goes under "Found, not done" in PROGRESS. Do not fix it.

### 2.2 House rules (code, copy, AI output)

- No em dashes or en dashes as punctuation, and no exclamation marks, in any copy, email, AI output, commit message or doc. Number ranges like 2 to 4 are written with "to".
- Product names exactly as K-02: Reviews, Google Profile, Google Protection, Get Reviews, Weekly Care Report, Business Knowledge (screen title "About your business" where the design says so), Insights, Content, Settings. Never: Profile Score, Do now, Listing Shield, Profile Care, Replies (as a module), Monday Report, Put mine back.
- Brand line: "Your reviews and listing. Taken care of." Never Google's name in a slogan, name, handle or headline graphic (K-112).
- Claims: only the allowed list in K-53 and the video claims table. Never rankings, guaranteed reviews or ratings, "automatically", "prevents suspension", "Google partner" or "approved by Google".
- Colours, type, spacing and radii come only from the design tokens (K-108). No arbitrary hex or font values.
- Owner screens are designed at 390 px first. One primary (yellow) button per screen.
- Nothing reaches Google without the owner's approval through the one publication pipeline (guardrail 6). Gate A was approved on 5 Oct 2026 (R-27): until `google_mode()` is switched to live in P0.7-04, every Google call runs in mock mode, and a demo business stays on mock always (R-17).
- Never store an owner's Google token. Never ask anyone for a Google password or verification code.
- Never use Hussein's personal email (or anyone's personal email) in Kabsi: not in code, seeds, settings, DNS, consoles, Calendly, Creem, Meta, Google or Supabase. Only kabsi.co addresses (R-32). The operator is Rashid Abou Hamzy and payments are processed by Creem, the merchant of record (R-55, replaces D1 for the public wording).
- One yellow button per email; the review email subject is exactly `<Business>: new <n>-star review, reply ready` (R-30).
- Review text, reviewer names, Google data and Business Knowledge never go to Sentry, PostHog, Slack, Meta or any tool other than Kabsi's own database and the AI provider for drafting.
- Names added on 21 Oct 2026 (K-126, K-127, K-135, K-136, K-139): plan names Essentials and Pro; the partner program Kabsi Partners; Profile Coach; What customers say; Report a fake review. There is no Free plan, Partner plan or Lebanon bundle in any copy.
- Every change that alters behaviour, price or wording updates `knowledge/kabsi-facts.md` in the same pull request (K-104). Features that are not built yet are marked [COMING] there and removals still in force are marked [CHANGING]; the card that builds or removes them changes the marker. Until task P0.1-01 moves it, the file is `docs/KNOWLEDGE-BASE.md`. **Since 24 Oct 2026 (docs diet):** the facts are written in the numbered files of `knowledge/facts/` and built by `node scripts/build-kb.mjs` into `knowledge/kabsi-facts.md`, `public/llms-full.txt` and `public/llms.txt`; never edit those three by hand. Team-only notes go in `knowledge/internal/`.

### 2.3 Database and functions

- Every schema change is a new timestamped file in `supabase/migrations/`. Never edit an existing migration.
- Migrations are additive first (expand, then contract in a later task), so code on `main` keeps working at every step.
- Apply the migration yourself with the Supabase connector (`apply_migration`, project `ynjdqjlmdwjgbfezevxy`, now in Hussein's own Supabase organisation) before opening the pull request, without asking, then run `get_advisors` (security) and fix anything new. Because migrations are additive, `main` keeps working while the pull request is open.
- Additive SQL with `on delete` clauses (foreign keys with `on delete cascade`, for example) is applied by the session with `execute_sql` and a read-back in the same call (R-44). Only drops and real deletions go to Rashid, each in its own file with a read-back.
- The one stop: before dropping a table or a column, or deleting real data (not test or mock rows the task names), stop and ask Rashid in one question with the exact list and row counts. A contract step (dropping something) is applied only after the code that stopped using it is merged and live; the task section says so.
- Pushing to `main` deploys every Edge Function and the Worker (`.github/workflows/deploy.yml`) and the website (Vercel, once P0.1-03 lands). The session's merge is the deploy.
- `supabase/config.toml` holds `verify_jwt` for every function. A new function gets its line in the same pull request (D295).
- Google calls only through `supabase/functions/_shared/google/` once task P0.1-11 lands (before that, `_shared/google.ts`).
- Browser code never writes tables directly. Reads go through RLS, writes through membership-checked RPCs or Edge Functions (D206, D226).

### 2.4 Checks before opening the pull request

Run what applies and paste the result in the pull request:

- `npm ci --registry=https://registry.npmjs.org --legacy-peer-deps` (the lockfile is committed since Ops 1 part B; use `npm install` only to change a dependency, and commit the lockfile with it), then `npm run typecheck`, `npm run lint:changed`, `npm test`, `npm run build`.
- `bash scripts/deno-check.sh` when Edge Functions changed.
- The database test suite once task P0.1-07 exists (`supabase test db` in CI).
- For screens: check 390 px and 1440 px. If no browser is available in the session, say so in PROGRESS; never claim a visual check you did not do.
- If a check cannot run in your environment, say so. Never claim it passed.

### 2.5 Git and the pull request (the session merges)

Rashid runs the project (R-41). The build chat opens, checks and merges its own pull request, and does not ask first.

- Branch `claude/<task-id>` (for example `claude/p0-1-03`). One pull request per task, at most about 10 changed files of code; if you need more, split the task in PROGRESS and do the first half.
- Never force-push, rebase, amend or squash pushed commits. Merge with a merge commit (not squash, not rebase).
- Never hand-edit `src/routeTree.gen.ts`.
- The build chat:
  1. applies database changes (section 2.3) and opens the pull request;
  2. makes sure CI is green (fixes real failures, never suppresses or skips a test);
  3. updates `docs/KABSI-PROGRESS.md` on the same branch (task status, the evidence so far, and the "After merge" checks still to run);
  4. merges the pull request itself once CI is green and there is no conflict. Never merge on red CI, never merge with an unresolved conflict;
  5. runs the After-merge checks it can (Deploy workflow result, function versions, the Vercel preview or live URL, a live email). It records the evidence and marks the task done in a small docs-only pull request, merged the same way. Checks it cannot run stay in PROGRESS under "After merge" for the next chat;
  6. gives Rashid the pull request link and a 3-line summary: what changed, how it was checked, what to look at or do.
- It stops and asks only in these cases: before dropping tables or columns or deleting real data (section 2.3); before a step marked "Ask Rashid before" in the task; when a task needs one of Rashid's manual steps (section 5) that PROGRESS does not record as done.
- "Done when" checks that need the merged code live (deployed function versions, the live site, a live email) are listed in PROGRESS under "After merge" for that task. If one fails, the chat reports it before starting anything else.
- Visual checks after a merge use the Vercel preview URL of the pull request or the live URL (kabsi.co once P0.1-03 is done), never the old Lovable address.
- Tasks marked "Ask Rashid before" in their section need Rashid's yes in the chat before the step named. That marker overrides the no-asking rule above.

### 2.6 Proof

A build chat saying "done" is not proof. For every "Done when" line, PROGRESS records the evidence: a SQL result, an HTTP response, a test name and its output, a function version number, a file path and line, or a screenshot path. If something could not be verified, the task stays "PR open" or "in review" with the reason. A task is "done" only after its pull request is merged and its After-merge checks have passed.

### 2.7 Start and end of the chat

Start of the chat, before anything else: if PROGRESS lists After-merge checks for a merged task that a session could not run, run them, record the evidence and mark that task done (section 2.5).

1. Update `docs/KABSI-PROGRESS.md` on the task branch, before merging the pull request: the task row (status "PR open", date, PR number), the evidence, the After-merge checks, anything found but not done, and the next task.
2. If you made a decision the plan did not cover, add it to PROGRESS under "Decisions to confirm" with one line of reason. Do not edit this plan; the planning chat folds confirmed decisions in.
3. If the change alters behaviour, price or wording, confirm `knowledge/kabsi-facts.md` is updated.

**Since 24 Oct 2026 (docs diet).** `docs/KABSI-PROGRESS.md` is a one-page status under 10 KB. Steps 1 and 2 above change to this: update the status page (where things stand, the ladder with proof, open steps for Rashid, one line under Recent entries) and put the long record (task rows, evidence, After merge checks, found not done, decisions to confirm) in one new file `docs/progress/archive/<yyyy-mm-dd>-<session>.md`. The old sections of PROGRESS are in `docs/progress/archive/`; an After-merge check still open there is run by the first session of that area (2.5, 2.7). The task cards that sections 2.1 and 2.9 call "the section for your task" are in `docs/plan/archive/` (section 8 of this index says which file).

### 2.8 Models

Each task names its model. **Rule from 21 Oct 2026 (R-39):** Opus is used only where a task writes to Google, handles money, changes access rules, or approves from WhatsApp. Everything else runs on Sonnet, including migrations that only add tables, Nora's facts, consent, headers, Meta tracking and read-only Google work. A session that needs both runs on Opus. P1 rows keep the model they show until P1 starts; the planning chat re-applies this rule then.

### 2.9 Standard prompt

Every task below has a ready prompt. They all start with the same opening, shown once here and written out in full in each prompt:

> You are a Kabsi build chat. Work in the GitHub repo itskaysyoga-gif/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task <ID>, then docs/KABSI-PROGRESS.md. Do only task <ID>. Follow section 2: apply database changes yourself, open the pull request, make sure CI is green, update PROGRESS on the branch, merge the pull request yourself, run the After-merge checks you can, then give Rashid the PR link and a 3-line summary. Stop and ask only before dropping tables or columns or deleting real data.

### 2.10 Skills (21 Oct 2026, K-146)

- Build sessions use the `kabsi-build-session` skill (the standing rules, hard stops, lean testing and handoff format; it includes the Google guard). Add "Use the kabsi-build-session skill." to the first paragraph of any prompt below that lacks it.
- A change to a reply prompt uses `kabsi-reply-lab`: it runs the evaluation cases with the session itself (no API credit), scores them against Kabsi's checks, proposes prompt edits, and the results are recorded in PROGRESS. The CI prompt gate's live run (`EVAL_LIVE`) stays off until Rashid says so (2.12).
- Outbound (master plan section 13) uses `kabsi-outbound` (renamed from `kabsi-outreach` on 23 Oct 2026): it qualifies the people Rashid lists and writes drafts, briefs and scripts for Rashid to approve; no scraping.
- Every line a reader sees (website, emails, WhatsApp, Nora, ads, Outbound) uses `kabsi-copy`: plain English for owners, the approved lines in master plan section 1, no Arabic shown, no dashes or exclamation marks (K-112).
- Session 19 PR 0 also commits Anthropic's `frontend-design`, Supabase's agent skills and Kapso's agent skills to `.claude/skills` (master plan section 14, R-56b and R-63).
- Website v2 (P0.8-13) also uses the frontend-design skill. The WhatsApp session (P0.8-03) installs `gokapso/agent-skills` (integrate-whatsapp, observe-whatsapp).
- P1 note: `gokapso/whatsapp-cloud-inbox` is a possible staff inbox with quick replies and labels (not planned until P1 is ordered).

### 2.11 Claims rule (21 Oct 2026, K-144)

Never quote an industry statistic such as "520% more calls" or "16% of ranking" as fact in the product, in emails, on the website, in ads, in partner material, in Nora's answers or in the facts file. Say what Kabsi does, not what Google's algorithm rewards. This adds to the allowed list in K-53 and the video claims table; a draft that breaks it is rewritten, not softened.

### 2.12 Cost rule (21 Oct 2026, K-146)

No Anthropic, Google or other paid API call is made until Rashid says so in the chat. That covers real model calls in builds, tests and evaluations; live WhatsApp sends; live Google calls beyond the read-only ones already approved; and CI evaluation runs. Build against mocks, fixtures, sandboxes and stubs, and say in the pull request what was not run live. A card that needs a live call stops and asks.

**Changed by R-43 (21 Oct 2026).** "Until Rashid says so" is now a rule: the Anthropic credit turns on the day Google enables `mybusiness.googleapis.com` for project 856347937978 (key under hello@kabsi.co in Supabase secrets only, hard limit 20 US dollars a month), then `EVAL_LIVE` = true. Live WhatsApp sends to Kabsi's own test numbers start from session 13. Until PROGRESS records that paid calls are on, everything above holds. Kill-gate: if reviews are still closed on 30 Nov 2026, the lane R chat re-plans launch (D5).

**Changed by R-45 (22 Oct 2026).** AI is on demand only: a prepaid balance of about 3 US dollars, auto-reload off, no monthly top-up; `EVAL_LIVE` stays false; a 20-case live evaluation runs by hand only when a reply prompt changes; the full 200-case run waits for a top-up before launch. The kill-gate is cleared: Google opened reviews, posts and media on 22 Oct 2026.

**Changed by R-46 (22 Oct 2026).** About 100 US dollars of promotional Anthropic credit until 17 Nov 2026, auto-reload off. Full evaluations run by hand only, never in CI on every change; `EVAL_LIVE` stays false.

## 3. Sources and precedence

The source of truth is the six documents in `docs/source/` (converted from the originals in the Claude project; the two diagrams are not reproduced):

| File | What it holds | Decisions |
|---|---|---|
| `KABSI-AUDIT.md` | Product and engineering decisions, the master | K-01 to K-146 (K-123 to K-146 are Hussein's final decisions of 21 Oct 2026) |
| `KABSI-DESIGN.md` | Website, app, onboarding, emails, conversion | Follows the K-decisions |
| `KABSI-GROWTH.md` | SEO, AI search, speed, security, tracking, email, funnels, analytics, markets, tax | G-01 to G-47 |
| `KABSI-VIDEO.md` | Videos, content and Meta Ads | Parts 1 to 8 and the rules |
| `KABSI-RESEARCH-REPORT.md` | Evidence behind GROWTH | Reference only; GROWTH lists its corrections |
| `KABSI-GUARDRAILS.md` | Engineering and product rules (section 1 of this plan) | |

Order when two things disagree:

1. The three non-negotiables: Google's API policies, terms, brand rules and Gate A; Google's review rules; the law and the privacy and security of customers' data, including advertising law.
2. The review decisions R-01 to R-25 in section 4 of this plan, where they say they change something.
3. KABSI-AUDIT (K-123 to K-146 win over everything earlier in the audit, the design review and this plan's earlier cards where they say so; a later K-decision wins over an earlier one when it says it amends it, for example K-119 over K-75, K-92 over K-04, K-101 over K-66 during the trial).
4. KABSI-GUARDRAILS, then KABSI-GROWTH and KABSI-VIDEO (VIDEO Part 7 is the canonical Meta setup, G-41), then KABSI-DESIGN.
5. The decisions carried forward from the old spec in Appendix B. Anything older that is not listed there is retired.

Not a source of truth any more: `docs/KABSI-SPEC.md`, `docs/KABSI-STATE.md`, `docs/WORK-QUEUE.md`, `docs/VIDEO-PLAN.md`, `docs/GO-LIVE.md` and every project file they replaced. Their still-true facts are in Appendix A and B.

Added on 24 Oct 2026: the master plan (`docs/KABSI-MASTERPLAN.md`) sits above items 2 to 5 for everything it covers, with its later sections winning over its earlier ones.

## 4. Review decisions (R-01 to R-90)

One line per decision. The full text, with what each one changes and why, is `docs/plan/archive/sec-04-review-decisions.md`. **Status (master plan 25.6, from R-55):** Approved, Building, Merged, Verified live or Retired. A row moves only with evidence (a pull request number, a check, a live response); a merged pull request or a passing mock test is never called live. Rows before R-55 were settled before the column existed. R-67 is reserved for session 10 (Creem). Later decisions override earlier ones where they differ: R-90 over R-89 over R-88 over R-75 to R-87 over everything older. A new decision is added to the full table first, then to this index, in the same pull request.

| # | Decision | Status |
|---|---|---|
| R-01 | Move kabsi.co to the new build now, in Wave P0.1, right after the copy... |  |
| R-02 | Until the launch gate in task P0.7-07 passes, the call to action is "Join... |  |
| R-03 | Resend is the only email tool |  |
| R-04 | Consent is a small first-party banner and a `consent_records` table, not a... |  |
| R-05 | One pipeline: `publications` becomes the single ledger and state machine... |  |
| R-06 | The job queue is a plain `jobs` table claimed with `FOR UPDATE SKIP... |  |
| R-07 | The tenant model (K-33) is built now, while the database holds three test... |  |
| R-08 | Web push from an installable app (K-69) and the daily link check (K-71)... |  |
| R-09 | The concierge ceiling is 20 (`app_settings.concierge_cap` is 30 today) |  |
| R-10 | Video calendar weeks 1 and 2 use only screens that are true once P0.1-02b... |  |
| R-11 | Google sign-in (K-91) uses the existing OAuth client with the basic scopes... |  |
| R-12 | Database tests run in CI against a local Supabase stack (`supabase start`,... |  |
| R-13 | Nora's facts file is `knowledge/kabsi-facts.md` (moved from... |  |
| R-14 | Design review lines that break K-112 or later decisions are not used:... |  |
| R-15 | Reference fixes: K-101 "deletes trial data under the 30-day rule (K-30)"... |  |
| R-16 | In GROWTH and VIDEO, "trial" in funnel metrics means... |  |
| R-17 | The demo workspace is an organisation flagged `is_demo` with two fictional... |  |
| R-18 | Features that need real Google data are built against the mock in P0 and... |  |
| R-19 | Remove now, as compliance fixes in P0.1: post keywords taken from review... |  |
| R-20 | The current footer, terms, privacy page and JSON-LD publish a private home... |  |
| R-21 | Review text sent to the AI is capped at 4,096 characters (today there is... |  |
| R-22 (amended by R-34) | Roles are the four in K-16 (owner, manager, staff, partner member) |  |
| R-23 (retired by R-34) | `kabsi_partner_billing` (monthly wholesale invoices in USDT) stays... |  |
| R-25 | Meta business details and Business Verification use the same identity as... |  |
| R-24 (retired by R-33) | NOWPayments stays for annual crypto payments on request only (K-106) |  |
| R-26 | Superseded by R-41 (21 Oct 2026) |  |
| R-27 | Gate A was approved on 5 Oct 2026 |  |
| R-28 | Hosting moves from Lovable to Vercel |  |
| R-29 (scope amended by R-36) | WhatsApp runs through Kapso |  |
| R-30 | Email rules |  |
| R-31 | Calendly stays on the free plan with one event type |  |
| R-32 | The legal seller is Hussein Slim, Dubai |  |
| R-33 | Kabsi is international and has one payment route |  |
| R-34 | One partner program, Kabsi Partners, affiliates only |  |
| R-35 | Removal order |  |
| R-36 | WhatsApp becomes an approval channel for low and medium risk |  |
| R-37 | "What customers say" replaces review themes |  |
| R-38 | The Profile Coach replaces the attribute and service optimizer and takes... |  |
| R-39 | Model rule |  |
| R-40 | Sessions rebuilt |  |
| R-41 | Lane R decides |  |
| R-42 | Launch scope |  |
| R-43 | Paid calls (D5) |  |
| R-44 | Cascade SQL |  |
| R-45 | AI on demand only (22 Oct 2026, replaces R-43's spend rule) |  |
| R-46 | AI credit (22 Oct 2026) |  |
| R-47 | Places cap (22 Oct 2026) |  |
| R-48 | PostHog loads after the first paint (22 Oct 2026, accepted) |  |
| R-49 | Kapso (22 Oct 2026) |  |
| R-50 | Meta business verification is not needed to launch (22 Oct 2026) |  |
| R-51 | Paid plans before card payments open (launch gate) |  |
| R-52 | Session list (22 Oct 2026) |  |
| R-53 | Gemini review verdict (22 Oct 2026) |  |
| R-54 | Kabsi Outbound (22 Oct 2026), a go to market option after P0.7-07, for the... |  |
| R-55 | Identity (22 Oct 2026) | Verified live |
| R-56 | Homepage hero (22 Oct 2026) | Verified live |
| R-57 | Free Google Profile Check (22 Oct 2026) | Verified live |
| R-55b | Kapso account (23 Oct 2026; master plan section 0) | Verified live |
| R-56b | Skills committed to the repo | Merged |
| R-58 | Reserved | Approved |
| R-59 | Social channels | Approved |
| R-60 | Position: Kabsi runs on WhatsApp | Approved |
| R-61 | No Arabic shown | Approved |
| R-62 | WhatsApp agent and Kapso | Approved |
| R-63 | Tools | Merged |
| R-64 | Staff alerts move from Slack to WhatsApp | Approved |
| R-65 | Gemini review of 23 Oct | Approved |
| R-66 | Keeping Kabsi running, safe and backed up | Building |
| R-67 | Reserved for session 10 | Approved |
| R-68 | Measurement, funnels and pixels | Approved |
| R-69 | Search and AI answers | Approved |
| R-70 | One design system for every screen | Approved |
| R-71 | Coverage check | Approved |
| R-72 | The website that converts | Approved |
| R-73 | Outside audit of 23 Oct | Approved |
| R-74 | Second outside review | Approved |
| R-75 | Position: the local visibility and reviews manager | Approved |
| R-76 | The modules, all before launch | Approved |
| R-77 | Plans and entitlements | Approved |
| R-78 | Markets | Approved |
| R-79 | Arabic | Approved |
| R-80 | The Free Visibility Scan replaces the Google Profile Check | Approved |
| R-81 | Keywords | Approved |
| R-82 | Paused, cut or moved, and Outbound | Approved |
| R-83 | Data providers and keys | Approved |
| R-84 | Sessions and waves | Approved |
| R-85 | Docs diet | Approved |
| R-86 | Gates | Approved |
| R-87 | Not forgotten | Approved |
| R-88 | Build traps, the first-map onboarding and the repo clean-up | Approved |
| R-89 | Kabsi Partners and one WhatsApp agent for every kind of person | Approved |
| R-90 | The coverage audit, the design guarantee, tools and risks (master plan section 30) | Approved |

## 7. Order of work (R-84; master plan 27.11, 28.4, 29.8)

Parallel rules: at most 2 Opus sessions at once; two sessions never touch the same area at the same time; every session merges main into its branch (merge commit, never rebase) and re-runs the checks before its own merge; each session writes only its own entry in the status page; migrations get a timestamp in the file name. The full table, with the model, what each session builds and what it waits for, is in `docs/plan/archive/sec-07-waves-sessions-and-wave-p0-1.md` and in master plan 27.11, 28.4 and 29.8.

1. **Session 0** (Sonnet, docs only, alone): sections 20 to 29, the decisions, the docs diet.
2. **Clean 1** (Opus, alone, after Session 0): the repo clean-up of master plan 28.9.
3. **Wave A:** session 19 rest (Opus), session 13b part 1 (Opus), Ops 1 part B (Sonnet).
4. **Wave B:** session 10 Creem (Opus), Growth 1 (Sonnet), V1 Visibility Map, Competitor Watch and category check (Opus). The lane R chat draws the design system and mockups meanwhile.
5. **Gate (28.4):** V2, V3 and V4 wait for 13b part 1's live test on Rashid's phone and session 10's test-mode payment end to end.
6. **Wave C:** V2 AI Visibility (Sonnet), V3 Review Growth and voice notes (Sonnet), 13b part 2 (Opus).
7. **Gate (27.13):** two Results Reports in a row on Yawmiyati and Abou Hamze, read in WhatsApp.
8. **Wave D:** V4 Results Report and the Free Visibility Scan (Sonnet), Web 2 (Sonnet), SEO 1 (Sonnet).
9. **Wave E:** UX 1 (Sonnet), Sec 1 (Opus), the 20c audit (Sonnet), the 21 launch gate (Opus).
10. **Partners:** PA1 (Opus, after session 10), PA2 (Sonnet, after 13b part 1's live test and PA1), PA3 (Sonnet, after Web 2).
11. **After launch:** Outbound, FD1 Front Desk pilot (Opus), Click-to-WhatsApp ads. L2 to L4 (Meta account fixes and /meta page, What customers say, the order button) wait for their gates.

The task cards (what each card does, its "Done when" checks and its prompt) are in the archive files listed in section 8. A session reads the cards its task names, not the whole archive.

## 8. Where everything went

| Part | File in `docs/plan/archive/` |
|---|---|
| Header and the dated update notes, the old Contents list | `00-header-and-update-notes.md` |
| 1. Guardrails, full text | `sec-01-guardrails.md` |
| 4. Review decisions, full text | `sec-04-review-decisions.md` |
| 5. Decisions and inputs that belong to Rashid | `sec-05-decisions-and-inputs-for-rashid.md` |
| 6. Classification of every decision | `sec-06-classification.md` |
| 7. Order of work in full, card map, Wave P0.1 cards (P0.1-xx) | `sec-07-waves-sessions-and-wave-p0-1.md` |
| 7A. Wave P0.G cards (P0.7-01 to P0.7-05) | `sec-07a-wave-p0-g-google-go-live.md` |
| 8. Wave P0.2 cards | `sec-08-wave-p0-2-trust-and-policy.md` |
| 9. Wave P0.3 cards | `sec-09-wave-p0-3-the-core-loop.md` |
| 10. Wave P0.4 cards | `sec-10-wave-p0-4-onboarding-trial-billing.md` |
| 11. Wave P0.5 cards | `sec-11-wave-p0-5-content-and-proof.md` |
| 12. Wave P0.6 cards | `sec-12-wave-p0-6-growth-and-launch-prep.md` |
| 12A. Wave P0.8 cards (P0.8-01 to P0.8-13) | `sec-12a-wave-p0-8-international-partners-new-features.md` |
| 13. Wave P0.7 cards (P0.7-06 and P0.7-07, the launch gate) | `sec-13-wave-p0-7-the-launch-gate.md` |
| 14. P1 tasks | `sec-14-p1-tasks.md` |
| 15. P2 and Deferred | `sec-15-p2-and-deferred.md` |
| 16. Video and Meta | `sec-16-video-and-meta.md` |
| 17. Appendix A, system reference | `sec-17-appendix-a-system-reference.md` |
| 18. Appendix B, decisions carried forward | `sec-18-appendix-b-carried-forward.md` |

Other places: `docs/KABSI-MASTERPLAN.md` (the core), `docs/KABSI-PROGRESS.md` (status), `docs/progress/archive/` (progress history), `docs/source/` (the source decisions K-01 to K-146, G-01 to G-47, design and video), `knowledge/facts/` and `knowledge/internal/` (the facts, section 2.2 of the rules above), `.claude/skills/` (build skills), `docs/RUNBOOK.md` (one printable page per failure), `docs/OPS-SETUP.md` (Rashid's once-only clicks), `docs/SECRETS.md` (every secret and setting by name), `docs/hosting.md` (installs, versions, upgrades).
