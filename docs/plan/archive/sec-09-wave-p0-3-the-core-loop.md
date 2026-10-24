<!-- Moved verbatim from docs/KABSI-PLAN.md on 24 Oct 2026 (docs diet, master plan 27.12). The index is docs/KABSI-PLAN.md. -->

## 9. Wave P0.3: the core loop

Goal: watch, understand, detect, recommend, prepare, ask, approve, publish, verify, record, report, for reviews first. One task queue, one memory per business, drafts that never invent, a Home that answers "Do I need to do anything?" and a review screen built for a phone.

Done when (wave): a new mock review becomes a task, a draft, an approval and a published reply in under 20 seconds on a phone; the evaluation set passes; Home shows all clear or at most 3 cards; the score is gone from the interface and the API.

### P0.3-01 Business Knowledge as the source for every draft

- Decisions: K-10, K-11, K-120 (storage and visibility), guardrail 4.
- Touches: RPCs to read, confirm, edit, reject and delete facts; `_shared/facts.ts` reads `knowledge_facts` (verified only) instead of `knowledge_card`; source priority and conflict detection creating `knowledge_confirm` tasks (stubbed until P0.3-05, then wired); `review_after` dates (prices 90, staff 180, hours notes 60 days); the "About your business" screen rebuilt around facts grouped with statuses Verified, Needs your OK, Out of date; deletion is real (row and versions removed); contract migration retiring writes to `knowledge_card`.
- Depends on: P0.2-03.
- Model: Opus (migration and AI grounding).
- Done when: drafts use only verified facts (test: an unconfirmed AI suggestion never appears in a prompt); an owner can confirm, edit and delete a fact on a phone; a website fact and an owner fact that disagree on hours create one confirm item, never a guess; `update_knowledge_card` is retired (no callers, revoked).
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo itskaysyoga-gif/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.3-01, then docs/KABSI-PROGRESS.md. Do only task P0.3-01. Follow section 2: apply database changes yourself, open the pull request, make sure CI is green, update PROGRESS on the branch, merge the pull request yourself, run the After-merge checks you can, then give Rashid the PR link and a 3-line summary. Stop and ask only before dropping tables or columns or deleting real data.
Read K-10, K-11 and K-120 in docs/source/KABSI-AUDIT.md and guardrail 4. Switch every reader to knowledge_facts, rebuild the About your business screen with the shared components from P0.1-05, then retire knowledge_card writes.
```

### P0.3-02 Per-business memory and the grounded reply pipeline

- Decisions: K-120, K-14 (steps 2 to 6), K-39 (AI contract), K-116.4, K-113.4, D244.
- Touches: `_shared/ai.ts` split into `_shared/ai/` with versioned prompt files (`prompts/reply.v1.md` and so on) and one contract runner; a compact, versioned memory summary per business (verified facts, voice rules, last 5 approved replies as style examples, open questions), cached and refreshed only when a fact changes (prompt caching); structured output `{reply, facts_used, language, topics}`; code checks (facts used must be in the trusted set, invented names, prices, services, policies, hours; money and compensation words; admissions of fault; personal data; contact details; links; hashtags; emoji; the stock-phrase list; similarity above 80 percent to the last 20 replies); the model check kept; a failed check shows the draft with the problem marked, never as ready; edit learning: when the owner edits a draft Kabsi records the style change, and after three similar edits offers "Save this as a rule?"; a factual addition in an edit asks once whether to save it as a fact; reviews are never a source of facts; an `ai_runs` record (prompt version, model, input hash, checks, approver) redacted with its review after 30 days.
- Depends on: P0.3-01, P0.1-04.
- Model: Opus (AI safety).
- Done when: Deno tests cover each code check; a draft citing a fact id outside the trusted set is rejected; a review asking "Is Maria still working there?" with no Maria in the facts gets a reply that does not confirm Maria; three similar edits produce the "Save this as a rule?" prompt (test); `ai_runs` rows exist for every draft with the prompt version.
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo itskaysyoga-gif/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.3-02, then docs/KABSI-PROGRESS.md. Do only task P0.3-02. Follow section 2: apply database changes yourself, open the pull request, make sure CI is green, update PROGRESS on the branch, merge the pull request yourself, run the After-merge checks you can, then give Rashid the PR link and a 3-line summary. Stop and ask only before dropping tables or columns or deleting real data.
Read K-14, K-39, K-116 point 4 and K-120 in docs/source/KABSI-AUDIT.md. Keep the existing fence and injection defences. Code decides the flow; the model only writes text inside it. Tests first.
```

### P0.3-03 Three review risk levels

- Decisions: K-13, A15, D220 (urgent email rules adapted).
- Touches: classifier in `_shared/ai/` (code rules first, then Haiku, higher wins); `reviews.risk` (low, medium, high) replacing the urgent flag; high risk produces no draft and a short checklist ("This review needs a little more care"), with an optional neutral holding reply only when the owner asks, never pre-filled; medium shows the issue on top ("They mention a refund. Kabsi didn't promise one."); health, dental, legal and financial categories are at least medium and replies never confirm the reviewer was a patient or client.
- Depends on: P0.3-02.
- Model: Opus.
- Done when: tests for each trigger in the K-13 table; a high-risk mock review creates no draft and a guidance email; a clinic review reply never mentions treatment or confirms a visit (test).
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo itskaysyoga-gif/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.3-03, then docs/KABSI-PROGRESS.md. Do only task P0.3-03. Follow section 2: apply database changes yourself, open the pull request, make sure CI is green, update PROGRESS on the branch, merge the pull request yourself, run the After-merge checks you can, then give Rashid the PR link and a 3-line summary. Stop and ask only before dropping tables or columns or deleting real data.
Read K-13 in docs/source/KABSI-AUDIT.md. Replace the urgent flag with the three levels everywhere it is read (emails, Home, review screen) and test every trigger.
```

### P0.3-04 Evaluation set and the prompt gate

- Decisions: K-39 (evaluation set), K-119 (English first, then the languages reviews arrive in), K-104 (eval blocks a release).
- Touches: `scripts/eval/` extended from 30 to 200 fictional cases: 60 normal, 40 complaints, 30 high-risk, 30 injection attempts (English first, plus Spanish, French and Arabic, hidden in names and in Arabizi), 20 healthcare, 20 that tempt invented facts; a runner that scores zero invented facts, zero followed injections, zero compensation offers, 100 percent high-risk routing; a CI job that runs when anything under `_shared/ai/prompts/` changes (needs the `ANTHROPIC_API_KEY` GitHub secret: ask Rashid to add it if missing).
- Depends on: P0.3-03.
- Model: Opus.
- Done when: the runner passes on the current prompts with the numbers recorded; a pull request that changes a prompt triggers the job; one deliberately weakened prompt fails it (throwaway branch).
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo itskaysyoga-gif/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.3-04, then docs/KABSI-PROGRESS.md. Do only task P0.3-04. Follow section 2: apply database changes yourself, open the pull request, make sure CI is green, update PROGRESS on the branch, merge the pull request yourself, run the After-merge checks you can, then give Rashid the PR link and a 3-line summary. Stop and ask only before dropping tables or columns or deleting real data.
Read K-39 in docs/source/KABSI-AUDIT.md. Every case is invented; no real reviews. Check whether the ANTHROPIC_API_KEY GitHub secret exists; if not, ask Rashid to add it and wait.
```

### P0.3-05 One task engine

- Decisions: K-08, K-07, R-05, guardrail 5, D308 (profile_tasks retired).
- Touches: migration adding `tasks` (location, kind review_reply, profile_change, photo_batch, post, hours_confirm, knowledge_confirm, profile_gap, reconnect, billing; source_type, source_id; priority urgent, recommended, nice; title, why, recommendation, evidence jsonb, proposed_action jsonb, approval_policy, state open, snoozed, approved, publishing, done, rejected, expired, failed; due_at, snooze_until, resolved_at, resolved_by; dedupe_key unique while open; publication_id); detectors as small job handlers with one test each (new review, profile difference, missing field, failed publish, disconnected access, expiring plan, holiday ahead as a stub until P0.5-03); migrate `profile_tasks` rows; drop the `profile_score` RPC and points; Nora's `get_profile_score` becomes `list_tasks`.
- Depends on: P0.3-03, P0.2-04.
- Model: Opus (migration).
- Done when: every open item an owner can act on comes from `tasks` (grep shows no other queue read by Home or Nora); a detector run twice creates one task (dedupe test); `profile_tasks` and `profile_score` are gone (SQL); Nora answers "what should I do next" from `list_tasks` on the mock.
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo itskaysyoga-gif/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.3-05, then docs/KABSI-PROGRESS.md. Do only task P0.3-05. Follow section 2: apply database changes yourself, open the pull request, make sure CI is green, update PROGRESS on the branch, merge the pull request yourself, run the After-merge checks you can, then give Rashid the PR link and a 3-line summary. Stop and ask only before dropping tables or columns or deleting real data.
Read K-07 and K-08 in docs/source/KABSI-AUDIT.md and R-05 in the plan. Tasks are created only by server-side detectors, never by the browser. Migrate, then retire profile_tasks and the score. Tests first.
```

### P0.3-06 Roles and approval policies

**Changed 21 Oct 2026 (K-127, R-34).** Built. The partner role and the approval policies "partner may approve" and "partner prepares, owner approves" (with their consent text) are removed in P0.8-01. Roles stay owner, manager and staff; an agency is a Manager invited in Settings, Team.

- Decisions: K-16, R-22, guardrail 11 (an AI agent never has more authority than its human role).
- Touches: `location_members.role` owner, manager, staff in every RLS policy and RPC; per-business, per-kind approval policy (owner approves by default; "partner may approve" and "partner prepares, owner approves" stored with consent text and date, used by P1-01); name, address, main category, open status and high-risk reviews always need the owner; Settings, Team: invite by email, change role, remove (owner only); audit events for role changes.
- Depends on: P0.3-05, P0.1-09.
- Model: Opus (access rules).
- Done when: database tests prove each role's read and approve rights per the K-16 table, a manager cannot approve a name change, staff can only upload photos and see the review link; inviting and removing a team member works on a phone.
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo itskaysyoga-gif/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.3-06, then docs/KABSI-PROGRESS.md. Do only task P0.3-06. Follow section 2: apply database changes yourself, open the pull request, make sure CI is green, update PROGRESS on the branch, merge the pull request yourself, run the After-merge checks you can, then give Rashid the PR link and a 3-line summary. Stop and ask only before dropping tables or columns or deleting real data.
Read K-16 in docs/source/KABSI-AUDIT.md. Enforce roles in the database (RLS and RPC checks), not only in the UI. Tests per role per action.
```

### P0.3-07 Home is the Action Center

- Decisions: K-06, K-09, K-07, design review "Owner dashboard" (Home row), guardrails 12 and 14.
- Touches: `src/routes/_authenticated/app/index.tsx` and its components rebuilt: header strip (business name, Google connection dot, "Checked 14 minutes ago" from `google_connections`, amber when older than 6 hours, plan state), the two states ("You're all caught up. Kabsi is taking care of the rest." or "2 things need your attention" with at most 3 cards and "See all"), each card with what happened, why, recommendation, evidence, risk label, the prepared action, one primary and one secondary button, time, and a History link to the audit trail; "What Kabsi did" from `activity_feed`; one customer-activity line (mock until live); empty, loading, error, disconnected and concierge states.
- Depends on: P0.3-05, P0.1-05.
- Model: Sonnet.
- Done when: at 390 px Home answers "do I need to do anything" without scrolling (screenshot or, without a browser, a component test of both states); the last-check strip turns amber on a business whose last sync is 7 hours old (test); no score, chart or quick-action tiles remain.
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo itskaysyoga-gif/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.3-07, then docs/KABSI-PROGRESS.md. Do only task P0.3-07. Follow section 2: apply database changes yourself, open the pull request, make sure CI is green, update PROGRESS on the branch, merge the pull request yourself, run the After-merge checks you can, then give Rashid the PR link and a 3-line summary. Stop and ask only before dropping tables or columns or deleting real data.
Read K-06 and K-09 in docs/source/KABSI-AUDIT.md and the "Owner dashboard" section of docs/source/KABSI-DESIGN.md. Use only the shared components and tokens. Phone first.
```

### P0.3-08 App navigation and product names

- Decisions: K-02, K-03, design review "App shell".
- Touches: `src/components/layouts/app-layout.tsx` (desktop sidebar: Home, Reviews, Get Reviews, Google Profile, Content, Insights, Business Knowledge, Settings; phone bottom bar: Home, Reviews, Profile, Content, More), Plan inside Settings, the report inside Insights, old URLs redirect, "Need a hand?" box with WhatsApp (once I1) and email.
- Depends on: P0.3-07.
- Model: Sonnet.
- Done when: every old app URL still lands on the right screen (list tested); no module name from the old set appears (grep); bottom bar has 5 items at 390 px.
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo itskaysyoga-gif/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.3-08, then docs/KABSI-PROGRESS.md. Do only task P0.3-08. Follow section 2: apply database changes yourself, open the pull request, make sure CI is green, update PROGRESS on the branch, merge the pull request yourself, run the After-merge checks you can, then give Rashid the PR link and a 3-line summary. Stop and ask only before dropping tables or columns or deleting real data.
Read K-02 and K-03. Change navigation and page titles only; keep every old URL working with redirects.
```

### P0.3-09 Review screen built for a phone

- Decisions: K-15, K-70, K-13 labels, design review Reviews row.
- Touches: `src/routes/_authenticated/app/reviews.tsx` and `inbox.tsx` merged into one Reviews screen: filters Needs reply, All, Replied, Positive, Neutral, Negative, High risk; card shows stars, text, date, reviewer name, review photos, status (Draft ready, Waiting for you, Published, Google is checking your reply, Rejected by Google, You chose not to reply), risk label and topics; on a phone one review per screen with Approve as the large button, Edit and Other options (shorter, more formal, regenerate, I'll reply myself, Skip); after Approve "Publishing in 10 seconds" with Undo.
- Depends on: P0.3-07, P0.1-13a.
- Model: Sonnet.
- Done when: approve to published takes under 20 seconds on the mock including the confirmation (timed and recorded); undo works from the screen; each status renders (component tests).
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo itskaysyoga-gif/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.3-09, then docs/KABSI-PROGRESS.md. Do only task P0.3-09. Follow section 2: apply database changes yourself, open the pull request, make sure CI is green, update PROGRESS on the branch, merge the pull request yourself, run the After-merge checks you can, then give Rashid the PR link and a 3-line summary. Stop and ask only before dropping tables or columns or deleting real data.
Read K-15 and K-70 in docs/source/KABSI-AUDIT.md and the Reviews row in docs/source/KABSI-DESIGN.md. Use the pipeline's undo RPC. Phone first.
```

### P0.3-10 Clear the backlog on day one

- Decisions: K-66, K-101 (trial cap of 10), K-36 (5 edits a minute), R-18.
- Touches: a backlog job when access starts (drafts the most recent unanswered reviews, 10 during a trial, all on a paid plan), Home card "We found 23 unanswered reviews. Replies are ready." with "Approve all" for low-risk ones showing the full list before the tap, medium one by one, high none; publish through the pipeline at the profile rate limit with a progress line "14 of 23 published".
- Depends on: P0.3-09, P0.1-12b.
- Model: Sonnet.
- Done when: on a mock business with 23 unanswered reviews, a trial account gets 10 drafts and a note of how many more wait; "Approve all" publishes only the low-risk ones it listed, at no more than 5 a minute (job timestamps in PROGRESS).
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo itskaysyoga-gif/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.3-10, then docs/KABSI-PROGRESS.md. Do only task P0.3-10. Follow section 2: apply database changes yourself, open the pull request, make sure CI is green, update PROGRESS on the branch, merge the pull request yourself, run the After-merge checks you can, then give Rashid the PR link and a 3-line summary. Stop and ask only before dropping tables or columns or deleting real data.
Read K-66 and K-101 in docs/source/KABSI-AUDIT.md. The owner's consent covers exactly the list shown; record that list in the approval.
```

### P0.3-11 Google Profile screen

- Decisions: design review "Google Profile" row, K-18, K-19 (status line), K-22 (what needs attention list only; editors are P1).
- Touches: `src/routes/_authenticated/app/shield.tsx` replaced by a Google Profile screen: one row per watched field with what Google shows, what you approved, status pill and last checked; "What needs attention" from tasks; the Protection status line; before and after stacked on phones.
- Depends on: P0.2-04, P0.3-08.
- Model: Sonnet.
- Done when: the screen lists every K-19 field for Yawmiyati on the mock with correct statuses; an open change shows its card with the two decisions; unconfirmed fields say "Not yet confirmed by you".
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo itskaysyoga-gif/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.3-11, then docs/KABSI-PROGRESS.md. Do only task P0.3-11. Follow section 2: apply database changes yourself, open the pull request, make sure CI is green, update PROGRESS on the branch, merge the pull request yourself, run the After-merge checks you can, then give Rashid the PR link and a 3-line summary. Stop and ask only before dropping tables or columns or deleting real data.
Read K-18 and K-19 and the Google Profile row in docs/source/KABSI-DESIGN.md. Read data only from knowledge_facts, profile_changes, tasks and google_connections.
```
