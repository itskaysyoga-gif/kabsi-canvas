# Kabsi implementation plan

Version 1, 4 Oct 2026. Written by the planning chat (Opus) from the six source documents in `docs/source/`, checked against the code on `main` (commit 42e7994), the live database `kabsi-prod`, the Edge Functions and the live site.

This file replaces `docs/WORK-QUEUE.md`, `docs/KABSI-SPEC.md` and `docs/KABSI-STATE.md` as the place a build chat looks for what to do. Progress lives in `docs/KABSI-PROGRESS.md`.

## Contents

1. Guardrails (copied from `docs/source/KABSI-GUARDRAILS.md`, unchanged)
2. Rules for every build chat
3. Sources and precedence
4. Review decisions (R-01 to R-25): where this plan changes or settles the source documents
5. Decisions and inputs that belong to Rashid
6. Classification: every decision as P0, P1, P2 or Deferred
7. Wave P0.1: truth and foundations
8. Wave P0.2: trust and policy
9. Wave P0.3: the core loop
10. Wave P0.4: onboarding, trial and billing
11. Wave P0.5: content and proof
12. Wave P0.6: growth, tracking and launch preparation
13. Wave P0.7: Google go-live and the launch gate
14. P1 tasks
15. P2 and Deferred
16. Video and Meta: Claude's part, and the weekly rhythm
17. Appendix A: system reference (live IDs, functions, jobs, secrets)
18. Appendix B: decisions carried forward from the old spec

## 1. Guardrails

Copied unchanged from `docs/source/KABSI-GUARDRAILS.md` (headings moved down one level). Where it conflicts with the audit, the audit wins, as the file itself says.


These are the standing rules for every build chat. The strategy and product decisions are already set in the Kabsi documents (KABSI-AUDIT.docx K-01 to K-121, KABSI-DESIGN.docx, KABSI-GROWTH.docx G-01 to G-47, KABSI-VIDEO.docx). Do not keep reinventing, expanding or re-scoping the product. Turn the approved decisions into a coherent, production-ready implementation.

This file summarises how to build; it does not add decisions. If anything here conflicts with KABSI-AUDIT.docx, the audit wins.

Capability-based onboarding (section 13) is the one idea here that the audit does not state explicitly. Use it to drive the onboarding questions only where it fits audit decisions K-91 to K-98; it is not a separate system.

### 0. Canonical launch decisions (one place, so no build chat has to choose)

1. **Markets:** one Meta ad set for the US, UK, Canada, Australia, Ireland, New Zealand and Singapore at launch; the UAE as a separately funded test after month 1 (KABSI-VIDEO.docx Part 7, G-41).
2. **Payments:** Creem is the only card processor (K-106); NOWPayments only for crypto on request. No other processor is built.
3. **Launch ads:** cold #1, #5 and #2 (if profile watching is live; otherwise #6, the printable review card every customer gets); warm retargeting #7.
4. **Campaign:** Advantage+ Leads with Advantage+ audience and placements on; placement quality reviewed weekly.
5. **Landing page:** one `/meta` page, with headline and first proof section varied by an angle parameter (G-26).
6. **Consent:** one geo-aware consent banner: opt-in before advertising tags in the UK, EU and EEA, and by default in the UAE and Saudi Arabia; consent records stored (G-18 to G-21).
7. **Events:** internal PostHog names and Meta names are mapped once in G-47; never two names for one Meta event.
8. **Build order:** Google access and disconnect, the approval and publication pipeline, Business Knowledge, the trial and Creem, consent and events, `/meta`, a real end-to-end test, and only then Meta launch.
9. **Numbers** such as $6.80 per trial, $11 per access-granted business, 12% trial-to-paid or 60% access within 24 hours are starting targets, not evidence; replace them with Kabsi's own data.
10. **Language:** English first everywhere at launch; replies drafted in each reviewer's own language; other languages, Arabic included, are P2 (K-119).
11. **Memory:** each business has its own private memory of verified facts, preferences and decisions; nothing becomes a fact without the owner's confirmation; every draft is checked against it before the owner sees it (K-120).
12. **WhatsApp:** a dedicated US number on the WhatsApp Business app from day 1 for people-answered support and sales; no approvals over WhatsApp until the WhatsApp Business Platform is connected through the same approval pipeline (K-121).
13. **Paid ads** start only after the four gates in KABSI-VIDEO.docx and the end-to-end test in section 22.

### 1. The most important rule

Do not optimise for more features. Optimise for:

**correctness → trust → security → coherent UX → first value → reliable Google execution → observability → launch readiness.**

- If an existing implementation conflicts with the latest approved decisions, update it.
- If an existing implementation is already correct and consistent, leave it alone.
- If you have a new idea that is not explicitly required, put it in a DEFERRED list in docs/KABSI-PLAN.md instead of building it.

### 2. Kabsi's core product loop

Everything should reinforce this:

**Watch → Understand → Detect → Recommend → Prepare → Ask → Approve → Publish → Verify → Record → Report**

The owner should feel "Kabsi is taking care of my Google Business Profile", not "here is another dashboard I have to operate".

The promise: **Your reviews and listing. Taken care of.**

### 3. Old architecture does not survive just because it exists

Actively look for older concepts that conflict with the approved architecture, for example:

- Profile Score as a product concept
- profile_tasks
- duplicated review queues
- duplicated listing-change systems
- knowledge_card
- feature-specific publication systems
- duplicate audit or history systems
- autonomous Google writes
- old Shield behaviour that conflicts with the approved Protection model

Do not merely hide obsolete UI. If an old concept has been replaced, migrate it properly. The final system has one source of truth for each thing, not several competing implementations.

### 4. Business Knowledge is a core system, not a settings form

Business Knowledge is the structured source of truth for review replies, posts, profile recommendations, profile edits, photo and content suggestions, Nora, onboarding and future AI workflows. The owner should never have to tell Kabsi the same thing twice.

Use structured facts with source and confidence. Priority:

1. Owner-verified fact
2. Current Google value
3. Owner-approved website fact
4. Connected source
5. AI suggestion

AI may suggest. AI must not invent business facts. Every generated sentence must be traceable to allowed facts and context.

### 5. One task system

One unified task and action model. No separate systems for review actions, profile tasks, photo approvals, post approvals, Google changes, concierge work or recommendations. Different task types are fine; different task architectures are not.

Home (the Action Center) consumes this one system. For every task the owner can see: what needs attention, why, what Kabsi recommends, and what will happen if they approve.

### 6. One approval and publication pipeline

Every Google-changing workflow uses the same authorisation model:

draft → approved → publishing → published → verifying → verified

with rejected, failed and retry states.

This applies to review replies, posts, photos and media, profile changes, hours and every other Google-changing action.

- Use idempotency. Retries must never publish twice.
- No AI agent bypasses this pipeline.
- No notification channel bypasses it. Email, WhatsApp, Slack, MCP tools, Nora and the dashboard all go through the same authorisation, approval and audit architecture.

### 7. Google Protection is not auto-revert

Protection: **detect → show before and after → explain → ask → approve → execute → verify → record.**

- Never silently revert a Google change.
- Never assume Google's current value is wrong just because it differs from Kabsi's stored value.
- The owner-approved baseline is the reference point.

### 8. Auditability is part of the product

Every meaningful action answers: who, what, when, which business, which object, previous value, new value, initiated by Kabsi or a human, which approval authorised it, what happened at Google, and whether verification succeeded.

"Activity" is not a second, manually maintained history. Where the decisions name the audit log as the source, derive the UI from it.

### 9. Google API layer

Keep Google integrations behind one clean service boundary. No Google API calls in React components or scattered across Edge Functions.

Separate modules where useful: accounts, locations, reviews, posts, media, performance, attributes, notifications, updates, admin and support.

All Google writes pass through the same permission, approval, rate-limit, retry, idempotency and audit controls.

Until Gate A, Google stays in mock mode behind the mock layer. Mocks must be modelled on Google's documented responses; as soon as Google access is available, capture real responses and test against them. Do not assume production behaviour from handwritten mocks.

### 10. Jobs, queues and retries

No giant scheduled function that does everything. Use the approved job and queue architecture.

Jobs are small, retryable, observable, idempotent, scoped to one business or task, and safe to resume. Track pending, running, succeeded, failed, retrying and dead-letter. Admin and support tooling shows stuck jobs.

### 11. Security is not a later refactor

Do not simplify security to make implementation easier. Preserve: tenant isolation, RLS, partner and client separation, business and location boundaries, authorisation checks, approval requirements, retention controls, secret handling, prompt-injection defences and audit logging.

- A user can never reach another business by changing an ID in a request.
- A partner never gains owner-level authority over a client's Google profile.
- An AI agent never has more authority than the human role it acts for.
- Kabsi never stores owners' Google tokens and never asks for a Google password or verification code (K-92, K-95).
- Google API rules (K-113): written notice to the owner within 48 hours of any access change; disconnect within 7 business days; review content kept at most 30 days and never aggregated or used for AI training; no public API or MCP that proxies Google data; reply drafts never contain phone numbers, emails, links or promotions.
- Publishing follows Google's behaviour (K-116): replies may wait in Google's moderation (a "checking" state, never a re-post); never more than one high-risk field (name, address, primary category) per approval; no contact details in post or reply text.
- Google's name never appears in Kabsi's slogan, names or handles; only as plain descriptive words, with the non-affiliation notice (K-112).

### 12. Mobile owner experience first

At about 390 px wide, every important screen answers within seconds: what happened, what Kabsi wants me to do, what happens when I press this.

Avoid dense tables, technical status dumps, unnecessary configuration, giant forms, competing primary buttons and unexplained terms. Use progressive disclosure: desktop can show more detail; mobile shows the decision.

Use only the design tokens and shared components (K-108).

### 13. Onboarding

Do not build industry-specific forms. Use business capabilities, which can combine: offers_services, sells_products, has_menu, accepts_bookings, accepts_orders, offers_delivery, has_physical_location, serves_an_area, has_multiple_locations, has_special_hours, and so on.

Order (K-91 to K-98):

1. Find the business (no account yet).
2. Show the free snapshot: what Kabsi can safely know.
3. Sign up (Continue with Google, or email code).
4. Get Google access (manual Manager invite until Gate A; one-tap Connect after Gate A and scope verification), with the right scenario screen for every profile state.
5. Show what Kabsi found and ask for confirmation or correction.
6. Ask only for high-value missing information.
7. Save Business Knowledge.
8. Produce first value quickly.

Prefer "We found these details. Are they correct?" over "Please enter all your business details."

### 14. First value

Onboarding never ends at "Your account is ready." It ends at real work: "We found 23 unanswered reviews", "Here are the replies Kabsi prepared", "One profile detail changed", "Here is the first thing Kabsi recommends." The owner understands the value before being asked to explore anything.

### 15. Reviews

The review workflow must be extremely reliable: fetch eligible reviews, find unanswered and relevant ones, draft from approved business facts, respect the review's language and risk class, allow editing, require approval, publish safely, verify, record.

Optimise for accurate, appropriate, safe and sounding like the business, not clever prose.

### 16. Photos and content

Photos are an operational workflow, not a generic AI image generator. Recommendations come from real profile and content gaps.

Posts are grounded in verified business facts, approved photos, real events and offers, and relevant seasonal or local context. Never invent promotions, events, products, services or claims. Kabsi is not a social-media scheduler.

### 17. Weekly Care Report

Summarise what Kabsi watched, what changed, what it prepared, what the owner approved, what was published, what remains, and useful observations. It reads like a concise weekly briefing from a human operator, not an analytics dump.

### 18. Nora and AI

Nora is first-line support and product help. It answers only from Kabsi's facts file (K-104) and live account state. It never invents Google capabilities, product capabilities, business facts, policy rules or actions that did not happen.

Every change that alters behaviour, price or wording updates the Nora facts file in the same change.

AI agents call internal tools only through the same permission, approval, audit and Google controls as the product.

### 19. Partners

Maintain partner organisations, client businesses, client status, permissions, referral attribution, partner reporting and client boundaries. But: **owner product-market fit first, partner scale second.** No agency CRM.

### 20. Document completeness is not product completeness

Classify every item before building it:

- **P0:** required for the core product to work safely and credibly.
- **P1:** important for launch quality, can follow the core loop.
- **P2:** useful expansion or optimisation.
- **Deferred:** not needed now.

P2 never blocks P0.

### 21. Final page-by-page audit

Before calling the product launch-ready, walk the whole authenticated experience as a real owner would: login, onboarding, Home, Reviews, review detail, Get Reviews, Google Profile, Content, Insights, About your business, Recommendations, Staff, Notifications, Settings, Billing, Google connection, Help and Nora, partner experience.

Also check: empty, loading, error, success and permission-denied states; disconnected Google; expired session; failed publication; failed verification; mobile layouts. It must feel like one product.

### 22. Launch gate

Kabsi is not ready for paid acquisition because the UI looks good, the build compiles, the dashboard loads or mock data looks convincing.

Prove end to end, with real Google responses, both success and failure paths:

**Business discovery → snapshot → signup → Google access → knowledge → first value → review draft → owner approval → Google publication → Google verification → audit event → notification → weekly report → billing (Creem checkout, including on mobile) → disconnect, including Manager access removal.**

### 23. Real data before marketing

No fake or demo numbers in production marketing. Every review count, business example, testimonial, screenshot, performance result, quote, before and after, or time-saved figure is clearly real or clearly labelled as an example. Never imply a fictional business or result is real.

### 24. Remove contradictions

Before finalising, search the whole repository (source, UI copy, metadata, emails, reports, Help and Nora, marketing pages, error messages, tests, seed data and misleading comments) for stale language and concepts:

- Profile Score, "Do now"
- "coming soon" where the feature exists
- fake or test accounts outside the isolated demo workspace
- old pricing, trial or billing language (billing is Creem; the trial follows K-101)
- old Shield behaviour, old task architecture, old knowledge architecture, old onboarding assumptions
- Google ownership language (Kabsi is a Manager, never an owner)
- unsupported ranking promises

Keep, but control:

- **Mock mode** stays until Gate A. Only mock wording that leaks to real owners goes.
- **"Early access"** stays in organic marketing until Gate A (KABSI-VIDEO.docx); remove it after approval.
- **The demo workspace** with fictional businesses is required for video recordings. It stays isolated from real customers and never appears in production marketing as real.

The goal is one coherent product vocabulary.

### 25. Testing

Before declaring completion, run typecheck, lint, tests, build, anonymous-route checks and Edge Function checks. Fix real failures; never suppress them. If a check cannot run in the environment, say so; never claim it passed.

Manually test: 390 px mobile, desktop, the owner, manager, reviewer, viewer and partner roles, multiple businesses, multiple locations, disconnected Google, expired or invalid authorisation, failed Google request, retry, duplicate submission, concurrent approval, and unauthorised tenant access.

### 26. Do not overengineer

Prefer a boring, correct implementation. No unnecessary abstractions, speculative microservices, extra AI agents, duplicate state machines, duplicate data stores, generic frameworks for one use case, or complicated configuration. The complexity lives underneath; the owner experience stays simple.

### 27. Definition of done

Kabsi is done when a real business owner can:

1. Find their business.
2. Understand what Kabsi found.
3. Sign up.
4. Give Kabsi the correct Manager access.
5. Add or confirm business facts.
6. See immediate useful work.
7. Review a prepared action.
8. Approve it.
9. See it safely reach Google.
10. See verification.
11. See the action recorded.
12. Receive useful ongoing care.
13. Understand what Kabsi is doing.
14. Disconnect Kabsi cleanly if they choose.

All without compromising security, tenant isolation, authorisation, approval, auditability, retention, Google policy compliance or factual accuracy.

Do not move the finish line by adding features. Do not declare victory because the UI looks polished. Make the core loop exceptionally reliable.

If an old implementation conflicts with the latest approved decisions, stop and resolve the conflict explicitly; never silently choose whichever is easier to code.

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
- Nothing reaches Google without the owner's approval through the one publication pipeline (guardrail 6). Until Gate A every Google call runs in mock mode.
- Never store an owner's Google token. Never ask anyone for a Google password or verification code.
- Review text, reviewer names, Google data and Business Knowledge never go to Sentry, PostHog, Slack, Meta or any tool other than Kabsi's own database and the AI provider for drafting.
- Every change that alters behaviour, price or wording updates `knowledge/kabsi-facts.md` in the same pull request (K-104). Until task P0.1-01 moves it, the file is `docs/KNOWLEDGE-BASE.md`.

### 2.3 Database and functions

- Every schema change is a new timestamped file in `supabase/migrations/`. Never edit an existing migration.
- Migrations are additive first (expand, then contract in a later task), so code on `main` keeps working at every step.
- Apply the migration with the Supabase connector (`apply_migration`, project `ynjdqjlmdwjgbfezevxy`) before merging the code that needs it, then run `get_advisors` (security) and fix anything new.
- Pushing to `main` deploys every Edge Function and the Worker (`.github/workflows/deploy.yml`). Merging is deploying.
- `supabase/config.toml` holds `verify_jwt` for every function. A new function gets its line in the same pull request (D295).
- Google calls only through `supabase/functions/_shared/google/` once task P0.1-11 lands (before that, `_shared/google.ts`).
- Browser code never writes tables directly. Reads go through RLS, writes through membership-checked RPCs or Edge Functions (D206, D226).

### 2.4 Checks before merging

Run what applies and paste the result in the pull request:

- `npm install --registry=https://registry.npmjs.org --legacy-peer-deps`, then `npm run typecheck`, `npm run lint:changed`, `npm test`, `npm run build`.
- `bash scripts/deno-check.sh` when Edge Functions changed.
- The database test suite once task P0.1-07 exists (`supabase test db` in CI).
- For screens: check 390 px and 1440 px. If no browser is available in the session, say so in PROGRESS; never claim a visual check you did not do.
- If a check cannot run in your environment, say so. Never claim it passed.

### 2.5 Git and merging

- Branch `claude/<task-id>` (for example `claude/p0-1-03`). One pull request per task, at most about 10 changed files of code; if you need more, split the task in PROGRESS and do the first half.
- Never force-push, rebase, amend or squash pushed commits (Lovable syncs `main`).
- Merge the pull request yourself when CI is green and every "Done when" check is proven. Rashid does not want to be asked to merge or deploy.
- Exception: tasks marked "Ask Rashid before" in their section need his yes in the chat before the step named.

### 2.6 Proof

A build chat saying "done" is not proof. For every "Done when" line, PROGRESS records the evidence: a SQL result, an HTTP response, a test name and its output, a function version number, a file path and line, or a screenshot path. If something could not be verified, the task stays "in review" with the reason.

### 2.7 End of the chat

1. Update `docs/KABSI-PROGRESS.md`: the task row (status, date, PR number), the evidence, anything found but not done, and the next task.
2. If you made a decision the plan did not cover, add it to PROGRESS under "Decisions to confirm" with one line of reason. Do not edit this plan; the planning chat folds confirmed decisions in.
3. If the change alters behaviour, price or wording, confirm `knowledge/kabsi-facts.md` is updated.

### 2.8 Models

Each task names its model. Opus is used for anything touching security and access rules, database migrations, Google access, payments and Creem webhooks, or Nora's facts and AI safety. Everything else runs on Sonnet.

### 2.9 Standard prompt

Every task below has a ready prompt. They all start with the same opening, shown once here and written out in full in each prompt:

> You are a Kabsi build chat. Work in the GitHub repo rashidhamzy-hue/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task <ID>, then docs/KABSI-PROGRESS.md. Do only task <ID>. Follow section 2 for checks, merging, proof and the PROGRESS update.

## 3. Sources and precedence

The source of truth is the six documents in `docs/source/` (converted from the originals in the Claude project; the two diagrams are not reproduced):

| File | What it holds | Decisions |
|---|---|---|
| `KABSI-AUDIT.md` | Product and engineering decisions, the master | K-01 to K-121 |
| `KABSI-DESIGN.md` | Website, app, onboarding, emails, conversion | Follows the K-decisions |
| `KABSI-GROWTH.md` | SEO, AI search, speed, security, tracking, email, funnels, analytics, markets, tax | G-01 to G-47 |
| `KABSI-VIDEO.md` | Videos, content and Meta Ads | Parts 1 to 8 and the rules |
| `KABSI-RESEARCH-REPORT.md` | Evidence behind GROWTH | Reference only; GROWTH lists its corrections |
| `KABSI-GUARDRAILS.md` | Engineering and product rules (section 1 of this plan) | |

Order when two things disagree:

1. The three non-negotiables: Google's API policies, terms, brand rules and Gate A; Google's review rules; the law and the privacy and security of customers' data, including advertising law.
2. The review decisions R-01 to R-25 in section 4 of this plan, where they say they change something.
3. KABSI-AUDIT (a later K-decision wins over an earlier one when it says it amends it, for example K-119 over K-75, K-92 over K-04, K-101 over K-66 during the trial).
4. KABSI-GUARDRAILS, then KABSI-GROWTH and KABSI-VIDEO (VIDEO Part 7 is the canonical Meta setup, G-41), then KABSI-DESIGN.
5. The decisions carried forward from the old spec in Appendix B. Anything older that is not listed there is retired.

Not a source of truth any more: `docs/KABSI-SPEC.md`, `docs/KABSI-STATE.md`, `docs/WORK-QUEUE.md`, `docs/VIDEO-PLAN.md`, `docs/GO-LIVE.md` and every project file they replaced. Their still-true facts are in Appendix A and B.

## 4. Review decisions (R-01 to R-25)

Each one either settles something the documents left open, fixes a contradiction between them, or changes a decision because the code or the live system showed something the documents did not know. Reason in one line.

| # | Decision | Changes | Reason |
|---|---|---|---|
| R-01 | Move kabsi.co to the new build now, in Wave P0.1, right after the copy fixes, not on Gate A day. The Lovable address redirects to kabsi.co from then on. | K-110 fix 1 timing (the design review and G-39 already wanted it first) | kabsi.co still serves the old product (WhatsApp reputation reports, Beirut) and its privacy page, and both Google's OAuth branding and the Gate A reviewer read kabsi.co. The Limited Use sentence (K-113.6) must be on kabsi.co/privacy before the business.manage package goes in. |
| R-02 | Until the launch gate in task P0.7-07 passes, the call to action is "Join early access" with the secondary "See it work". "Start free" with "14 days free. No card." replaces it on that day. | Design review's immediate "Start free" | A trial today would meet mocked Google features; K-110 and VIDEO already say early access until Gate A, and guardrail 22 sets the real bar. |
| R-03 | Resend is the only email tool. `send.kabsi.co` (exists, verified) carries account and product email; `news.kabsi.co` on Resend carries lifecycle and marketing. The behaviour-triggered trial sequence (G-25) is sent from Kabsi's own notification outbox. No Loops. | G-23 | One processor of owners' data instead of two, no new monthly bill, and every trigger (access granted, backlog drafted, first approval) is an event Kabsi already records. K-118 also chose Resend. |
| R-04 | Consent is a small first-party banner and a `consent_records` table, not a paid consent platform. | G-18 tool choice | Two tags need consent (PostHog cookies, Meta Pixel); the rules by country fit in one config; proof of consent (G-21) belongs in Kabsi's database anyway. Rashid has no budget for tools. |
| R-05 | One pipeline: `publications` becomes the single ledger and state machine for every Google write (approved, publishing, published, checking, verifying, verified, plus rejected, failed, cancelled), with an idempotency key, `publish_after` for the 10-second undo and the approval record. Content rows (reviews, posts, photos, special hours, profile changes) hold the content and point to their publication. `tasks` is the one owner queue; a task with a Google effect links one publication. | Settles K-08, K-38 and guardrails 5 and 6 into one design | The repo already has the ledger (D202) and a claim on reviews only; extending it is safer than a second system. |
| R-06 | The job queue is a plain `jobs` table claimed with `FOR UPDATE SKIP LOCKED` by a dispatcher that pg_cron calls every minute. Not Supabase Queues. | Settles K-35 | It needs dedupe keys, per-business status and a visible dead-letter list; a table gives all three and is easy to test. |
| R-07 | The tenant model (K-33) is built now, while the database holds three test businesses and five test accounts. | Timing of K-33 | Changing ownership and billing structure later, under real customers, is the expensive version. |
| R-08 | Web push from an installable app (K-69) and the daily link check (K-71) move to P1. P0 channels are email and in-app. | K-69, K-71 placement P0.4 | P0 is the core loop working safely; email approvals already work and both features are additions. |
| R-09 | The concierge ceiling is 20 (`app_settings.concierge_cap` is 30 today). | Aligns the database with K-88 | K-88 is the later decision. |
| R-10 | Video calendar weeks 1 and 2 use only screens that are true once P0.1-02b ships: S01, S03, S05 and the review card. S02, S06, S07, S08, S11 and S12 are recorded after their features ship (P0.2 to P0.5). | VIDEO Part 2 calendar order | The current app still shows Profile Score, "Post" and Listing Shield; recording it now would publish screens that the plan removes within days. |
| R-11 | Google sign-in (K-91) uses the existing OAuth client with the basic scopes already verified (openid, email, profile) through Supabase Auth's Google provider. | Implements K-91 | No new verification is needed for basic scopes. |
| R-12 | Database tests run in CI against a local Supabase stack (`supabase start`, `supabase test db` with pgTAP), built from the repo's migrations. | Implements K-54 and G-17 | RLS and pipeline invariants can only be proven against a real Postgres with Supabase's roles. |
| R-13 | Nora's facts file is `knowledge/kabsi-facts.md` (moved from `docs/KNOWLEDGE-BASE.md`), still built into `public/llms-full.txt` by `scripts/build-kb.mjs`. | Path named in K-104 | Keeps the working pipeline and gives the file the name the decisions use. |
| R-14 | Design review lines that break K-112 or later decisions are not used: "Your Google, taken care of." (message hierarchy and final band), "Arabic version before Gulf marketing" (K-119), root-domain sending (G-22), snapshot after signup (K-91: before), "14 days. No card. Cancel any time." (K-110 wording). | KABSI-DESIGN | Later decisions already replaced them; listed so no build chat copies them. |
| R-15 | Reference fixes: K-101 "deletes trial data under the 30-day rule (K-30)" means K-40; K-100 "Policy compliance (K-03, K-86)" means K-113 and K-86; K-109 "Google's review rules, K-03" means K-25 and K-116; K-117 "WhatsApp chat link (K-83)" means K-82; K-117 "identity attributes (K-84)" means K-83. | Typos in the audit | So nobody implements the wrong decision. |
| R-16 | In GROWTH and VIDEO, "trial" in funnel metrics means `registration_completed` (account and business created). The product's trial clock starts at working Google access (K-94, K-101). | Clarifies G-01, G-02 and VIDEO Part 8 | The documents use one word for two events; the tracking uses both names. |
| R-17 | The demo workspace is an organisation flagged `is_demo` with two fictional businesses, Harbour Lane Coffee and Juniper Hair Studio. It always runs on mock Google whatever `google_mode` says, never sends email except to the demo login, never fires PostHog or Meta events, never counts in metrics, billing or Slack, and every screen in it shows a small "Demo data" tag. It doubles as the permanent demo account Google may ask for (K-56). | Implements the video setup and K-56 | One isolated workspace serves recordings and Google's reviewer, and cannot leak into real data. |
| R-18 | Features that need real Google data are built against the mock in P0 and switched on in P0.7: K-66 full backlog, K-67 "sounds like you" from past replies, K-26 performance numbers, K-117 search terms. | Placement | They cannot be verified before Gate A. |
| R-19 | Remove now, as compliance fixes in P0.1: post keywords taken from review text (D245 "phrases customers use in 4 to 5 star reviews"), the reply rule that lets drafts include a phone number (`_shared/ai.ts`), and verbatim review quotes in the weekly report (D233). | Old D245, D233, D260 | K-113.3 forbids content derived from reviews; K-113.4 and K-14 block contact details in replies; K-28's report does not include quotes. |
| R-20 | The current footer, terms, privacy page and JSON-LD publish a private home address. Remove it in P0.1. The legal seller is Hussein Slim (D1, decided 4 Oct). The operator line, from one `LEGAL_SELLER` constant, is "Kabsi is operated by Hussein Slim, Dubai, United Arab Emirates. Contact: hello@kabsi.co": city only, never a street address. It goes live once Rashid confirms Hussein has signed the short agreement (section 5); until then the line is "Kabsi. Contact: hello@kabsi.co". | K-110 fix 2 | Never publish a private home address; the seller named on the site must match the Creem account holder (K-106). |
| R-21 | Review text sent to the AI is capped at 4,096 characters (today there is no cap at all, not 1,000 as K-99 assumed), with a per-business and a global daily AI budget. | K-99.5 premise | The code has no cap, which is a cost risk rather than a quality one. |
| R-22 | Roles are the four in K-16 (owner, manager, staff, partner member). The guardrails' test list (owner, manager, reviewer, viewer, partner) maps to them: "reviewer" and "viewer" are not separate roles. | Guardrail 25 wording | The audit wins over the guardrails. |
| R-23 | `kabsi_partner_billing` (monthly wholesale invoices in USDT) stays switched on but bills nothing while there are no live partner clients; it is replaced by Creem-based commission in P1 (K-32, K-106). | Old D239 | Nothing to bill today; the replacement needs Creem. |
| R-25 | Meta business details and Business Verification use the same identity as Creem: Hussein Slim. If Meta will not verify an individual without a company, ads still run; verification waits until it is needed for WhatsApp automation (P2). | VIDEO Part 7 ("the same as Creem") | One seller identity across Creem, Meta, terms, privacy and email footer. |
| R-24 | NOWPayments stays for annual crypto payments on request only (K-106). The old `$1 test` and `plans_v2` switch are retired: plans move to `subscriptions` on the organisation in P0.4, with Creem as the card path. | Old D269 and D281 flags | One billing model, as K-33 and K-106 require. |

## 5. Decisions and inputs that belong to Rashid

The planning chat and build chats plan around these and ask before any task that needs them.

| # | Decision or input | Tasks that wait for it | What happens meanwhile |
|---|---|---|---|
| D1 | Legal seller. **Decided 4 Oct: Hussein Slim (Dubai), who holds the Creem account; Meta business details and verification under the same name (R-25).** | P0.4-07, P0.4-08, P0.2-07, P0.6-09 | Built with one `LEGAL_SELLER` constant. Before his name goes live: Hussein agrees to be named and signs a short written agreement with Rashid on who owns the revenue (K-106) (step 8 below). |
| D2 | First real live customer. **Decided 4 Oct: Abou Hamze Auto Center (auto parts store, Bakaata), Rashid's cousin's business; Rashid is a primary owner of its Business Profile through rashid.abouhamzy@yawmiyati.com.** | P0.7-01, P0.7-05, P0.7-07 | Written consent from the business owner before any public use; any public mention says it is connected to Kabsi's team (K-117). Yawmiyati stays internal (K-99.6). |
| D3 | NFC outside Lebanon. **Decided 4 Oct: no NFC shipping outside Lebanon.** | None | Outside Lebanon the printable QR card only; NFC appears only on `/lebanon` (D297 stands). |
| I1 | US WhatsApp number (K-121). **4 Oct: comes later; build now with a placeholder.** | P0.6-10 | One `WHATSAPP_NUMBER` constant set to the current +961 3 956 917 until the US number arrives; swapping it is a one-line change plus the facts file. |
| I2 | Real screenshots of Google's "People and access" steps. **4 Oct: desktop done**, six images in `public/help/manager-steps/desktop/` (personal details blurred, browser bar cropped). Phone screenshots still to come. | P0.4-03 | Desktop guide uses them; phone cards use text steps until phone screenshots arrive. |
| I3 | Referral reward (K-62). **Decided 4 Oct: one free month.** | P1-15 | Built in P1. |

**Steps only Rashid can do** (his accounts; each takes minutes; the task that needs it says when):

1. Lovable: Settings, Domains, connect `kabsi.co` and `www.kabsi.co`, then add the records Lovable shows in Cloudflare DNS (keep the Zoho MX, SPF and DKIM records). Task P0.1-03.
2. Supabase dashboard: Authentication, URL configuration: Site URL `https://kabsi.co`, add `https://kabsi.co/**` to redirect URLs. Task P0.1-03.
3. Google Cloud (project smiling-chess-505915-b7): Quotas, set Place Details and Text Search to 100 requests a day; budget alerts at $5 and $10 a day; disable `places-backend.googleapis.com` (only the new Places API is used: checked, every call goes to places.googleapis.com/v1). Task P0.2-06.
4. Google Cloud and Search Console identities (K-99.3): create a second kabsi.co address on Zoho (for example rashid@kabsi.co); make hello@kabsi.co and it the OAuth support and developer contacts and the Search Console owners; remove rashid.abouhamzy@yawmiyati.com; keep rashid.hamzy@gmail.com only as a recovery owner. Any time in P0.1.
5. Supabase dashboard: Authentication, Providers, Google: paste the OAuth client ID and secret (basic scopes). Task P0.4-02.
6. Meta Business Settings items in VIDEO Part 7 that need his login (payment method, second admin, business info after D1, domain verification TXT record in Cloudflare). Task P0.6-09 writes the exact clicks.
7. Creem account (Hussein Slim) and API keys into Supabase secrets. Task P0.4-07.
8. Hussein Slim agrees to be named as the seller on the site and signs a short written agreement with Rashid on who owns Kabsi's revenue (K-106); Rashid confirms in the chat. Before the R-20 seller line goes live and before P0.4-07.

## 6. Classification (guardrail 20)

P0: required for the core product to work safely and credibly. P1: launch quality, follows the core loop. P2: expansion. Deferred: not now. "Done" means already true in the code or live system (checked 4 Oct).

### Audit decisions

| Decisions | Class | Where |
|---|---|---|
| K-01, K-02, K-03 positioning, names, navigation | P0 | P0.1-02a, P0.1-02b, P0.3-08 |
| K-04 Manager access through the Kabsi group | Done (D293, proven on Yawmiyati 29 Sep) | Amended by K-92 |
| K-05 one operating loop | P0 (principle) | All waves |
| K-06, K-07, K-09 Home, no score, "What Kabsi did" feed | P0 | P0.1-02b (remove score), P0.3-07 |
| K-08 one task engine | P0 | P0.3-05 |
| K-10, K-11 structured facts, source priority | P0 | P0.2-03 (table), P0.3-01 |
| K-12, K-59 website importer and scanner rules | P1 | P1-05 |
| K-13, K-14 risk levels, reply pipeline | P0 | P0.3-02, P0.3-03, P0.1-04 (first checks) |
| K-15 review screen | P0 | P0.3-09 |
| K-16 roles and approval policies | P0 owner, manager, staff; P1 partner policies | P0.3-06, P1-01 |
| K-17 email approvals | P0 | P0.2-05 |
| K-18, K-19, K-20 baseline, Google Protection, change events | P0 | P0.2-03, P0.2-04 |
| K-21 hours and holidays | P0 | P0.5-03 |
| K-22 description, services, attributes | P1 | P1-06 |
| K-23 photo engine | P0 | P0.5-01 |
| K-24 posts and content calendar | P0 | P0.5-02 |
| K-25 Get Reviews rules | P0 (copy and labels; mostly done in the Worker) | P0.1-02b |
| K-26 Insights | P0 headline and tiles (mock until live); P1 change detection | P0.5-05, P1-09 |
| K-27 review themes | P1, off until Google answers the data question | P1-10 |
| K-28 Weekly Care Report | P0 | P0.5-04 |
| K-29 to K-32 partner workspace, portfolio, branding, commission | P1 | P1-01 to P1-04 |
| K-33 tenant model | P0 | P0.1-09 |
| K-34 Google service layer | P0 | P0.1-11 |
| K-35, K-36 job queue, quota and rate control | P0 | P0.1-12a, P0.1-12b |
| K-37 Pub/Sub | P0 at go-live | P0.7-03 |
| K-38 exactly-once publishing | P0 | P0.1-13a, P0.1-13b |
| K-39 AI contract and evaluation set | P0 | P0.3-02, P0.3-04 |
| K-40 retention table | P0 | P0.2-01 |
| K-41 disconnect and leave | P0 | P0.2-02 |
| K-42 security hardening | P0 | P0.1-08, P0.6-05; TOTP for staff P1-12 |
| K-43 audit log | P0 | P0.1-10 |
| K-44 system health and diagnostics | P0 minimal staff page; P1 owner diagnostics | P0.6-11, P1-12 |
| K-45 onboarding with first value | P0 | P0.4-01 to P0.4-05 |
| K-46, K-57 notification engine and channels | P0 email and in-app; WhatsApp automation P2 | P0.4-09 |
| K-47 mobile and accessibility | P0 (rule for every screen) | All UI tasks, P0.7-06 |
| K-48 billing rules | P0 | P0.4-06, P0.4-07 |
| K-49 internal tools only, no public API | P0 (rule) | Guardrails |
| K-50, K-113.8 position against Gemini | P0 copy | P0.1-02a, P1-14 comparison page |
| K-51, K-58 Nora as first-line support | P0 | P0.6-06 |
| K-52 not now list | Deferred | Section 15 |
| K-53 claims | P0 (rule) | Every copy task |
| K-54 testing | P0 | P0.1-07, every task |
| K-55, K-76 learning loop, measure the wow | P0 events; dashboard P1 | P0.6-02, P1-13 |
| K-56 go-live checklist | P0 | P0.7-04 |
| K-60 photo prompts from search gaps | P1 | P1-09 |
| K-61 onboarding recovery | P0 | P0.4-04 |
| K-62 growth loops | P1 (needs I3) | P1-15 |
| K-63 unit economics model | P0 alerts; recalculation after month 1 | P0.2-06, P1-13 |
| K-64 policy guardrails restated | P0 (rule) | Guardrails |
| K-65 register the company | Rashid (D1) | Section 5 |
| K-66 backlog on day one | P0 (trial cap K-101) | P0.3-10, live in P0.7 |
| K-67 "sounds like you" from past replies | P0 at go-live | P0.7-05 |
| K-68 personal welcome video | Rashid, manual | Section 16 |
| K-69 web push | P1 (R-08) | P1-07 |
| K-70 ten seconds to undo | P0 | P0.1-13a, P0.3-09 |
| K-71 link check | P1 (R-08) | P1-08 |
| K-72 time saved estimate | P0 | P0.5-04 |
| K-73, K-109 print designer and print kit | P1 | P1-11 |
| K-74 "Your year on Google" | P1 (December) | P1-16 |
| K-75 Arabic as a strength | P2 (K-119) | Section 15 |
| K-77 Google's name fixes | P0 | P0.2-04 |
| K-78 cover photo and logo | P0 | P0.5-01 |
| K-79 videos in the photo pipeline | P1 | P1-17 |
| K-80 three post types | P0 | P0.5-02 |
| K-81 mirror Google's checklist | P1 | P1-06 |
| K-82 more profile fields | P1; chat button prompt P1 (English-first launch, Middle East later) | P1-06 |
| K-83, K-84 attribute groups, custom services | P1 | P1-06 |
| K-85, K-99.6 first live test | P0 at go-live, Yawmiyati internal only | P0.7-05 |
| K-86 plan B if Google refuses | P0 (no build now; concierge exists) | Section 13 note |
| K-87 backups, recovery, central account | P0 before the first paying customer | P0.7-04, P0.6-08 |
| K-88 support limits | P0 (R-09) | P0.1-06 |
| K-89, K-105 setup call and partner call | P0 | P0.1-V3, P0.4-11 |
| K-90 video plan | P0 setup | Section 16 |
| K-91 sign-up | P0 | P0.4-02 |
| K-92 Connect with Google route | P1 after business.manage verification | P1-18; package P0.7-02 |
| K-93 manual route | P0 | P0.4-03 |
| K-94 to K-98 diagnosis and scenario screens | P0 | P0.4-04 |
| K-99 six corrections | P0 | See the review in PROGRESS; P0.1-04, P0.7-02, section 5 |
| K-100 cost guardrails | P0 | P0.1-04, P0.2-06, P0.6-05 |
| K-101 trial | P0 | P0.4-06 |
| K-102 email design | P0 | P0.4-08 |
| K-103 WhatsApp, ManyChat, Nora | P0 click-to-chat; automation P2 | P0.6-10 |
| K-104 Nora in sync | P0 | P0.1-01, P0.6-06 |
| K-106, K-107 Creem, taxes | P0 (needs D1) | P0.4-07 |
| K-108 one design system | P0 | P0.1-05 |
| K-110 visual direction, comparison, guides, live-site fixes | P0 fixes; P1 comparison pages and guides | P0.1-02a, P0.1-03, P1-14 |
| K-111 Nora and the call on every onboarding step | P0 | P0.4-11 |
| K-112 slogan | P0 | P0.1-02a, P0.1-02b |
| K-113 Google API compliance | P0 | P0.1-04, P0.2-02, P0.2-07, P0.7-02 |
| K-114 four agency features | P1 (Nora's "never delete" answer P0) | P0.6-06, P1-06 |
| K-115 care routine | P0 daily and weekly; P1 monthly and quarterly | P0.5-04, P1-09 |
| K-116 Google behaviour rules | P0 | P0.1-13a, P0.2-04, P0.5-01, P0.5-02 |
| K-117 search terms, services, links, products, description | P1 (search terms in the report at go-live) | P1-06, P1-09 |
| K-118 platforms and the email set | P0 | P0.6-08, P0.4-08 |
| K-119 English first | P0 (rule) | Every copy task |
| K-120 per-business memory | P0 | P0.3-01, P0.3-02 |
| K-121 WhatsApp number | P0 (needs I1) | P0.6-10 |

### Growth decisions

| Decisions | Class | Where |
|---|---|---|
| G-01, G-02, G-03 Meta as a learning budget, funnel targets, channel mix | P0 rules for the ads phase | Section 16 |
| G-04, G-07, G-35 Arabic URLs and SEO | P2 (K-119) | Section 15 |
| G-05 technical SEO basics | P0 checks at the domain switch | P0.1-03 |
| G-06 industry pages to standard | P1 | P1-14 |
| G-08 facts page, answer-first | P1 | P1-14 |
| G-09, G-11 third-party presence, AI visibility check | P1 (needs real customers) | Section 16 |
| G-10 crawlers and llms.txt | P0 check at the domain switch | P0.1-03 |
| G-12, G-13, G-14 caching, images, script budget | P1 (measure first) | P1-19 |
| G-15 security headers and CSP | P0 report-only, then enforce | P0.6-05 |
| G-16 bots and abuse | P0 | P0.6-05 |
| G-17 database checks | P0 | P0.1-07, P0.1-08 |
| G-18 to G-21 consent and Meta tracking | P0 | P0.6-01, P0.6-03 |
| G-20 no Google tags | P0 rule | |
| G-22 email subdomains and authentication | P0 | P0.6-08 |
| G-23 Loops | Replaced by R-03 | |
| G-24 email consent | P0 | P0.4-01, P0.4-10 |
| G-25 behaviour-triggered trial sequence | P0 | P0.4-10 |
| G-26 /meta landing page | P0 | P0.6-04 |
| G-27 free tool funnels | P0 Profile Check; P1 print kit by email | P0.4-01, P1-11 |
| G-28 activation definition | P0 | P0.6-02 |
| G-29 cancel flow, pause | P0 with Creem | P0.4-07 |
| G-30 yearly plan from day 7 | P0 | P0.4-10 |
| G-31, G-32, G-44, G-47 events, attribution, onboarding steps, Meta mapping | P0 | P0.6-02, P0.6-03 |
| G-33 weekly numbers dashboard | P1 | P1-13 |
| G-34 experiments | P1 (after traffic) | Section 16 |
| G-36 WhatsApp within the rules | P0 click-to-chat; opt-in field P1 | P0.6-10 |
| G-37, G-38, G-43 payments and tax | P0 through Creem (K-106, K-107) | P0.4-07 |
| G-39 launch checklist | P0, merged into the launch gate | P0.7-07 |
| G-40 publish own numbers only | P0 rule | |
| G-41 markets | P0 rule for ads | Section 16 |
| G-42 setup call as a tracked step | P0 | P0.4-11, P0.6-03 |
| G-45 guides programme | P1 | P1-14 |
| G-46 comparison pages | P1 | P1-14 |

**How to read a task.**

Each task lists: the decisions it implements, the files and tables it touches, what it depends on, the model, "Done when" checks Rashid can verify, and the prompt to paste into a new chat. Tasks inside a wave run in the order listed unless "Depends on" says otherwise. Tasks marked "can run in parallel" may share a day with the task before them.

## 7. Wave P0.1: truth and foundations

Goal: stop every public claim that breaks Google's rules or describes removed features, move kabsi.co to the new build, give the video work a demo workspace, and build the foundations every later wave stands on (tests, tenant model, audit log, Google layer, jobs, one publication pipeline). Owners see only the copy changes.

Done when (wave): kabsi.co serves the new build with K-112 wording; no file in the repo contains a retired product name outside migrations and `docs/source/`; CI runs the database test suite; a double approval publishes once in tests; 500 mock businesses sync inside an hour; every Google call goes through `_shared/google/`.

### P0.1-01 Retire the old docs and move Nora's facts file

- Decisions: K-104, R-13, guardrail 24, section 3.
- Touches: delete `docs/KABSI-SPEC.md`, `docs/KABSI-STATE.md`, `docs/VIDEO-PLAN.md`, `docs/GO-LIVE.md`, `docs/screenshots/q04/`; move `docs/KNOWLEDGE-BASE.md` to `knowledge/kabsi-facts.md`; `scripts/build-kb.mjs`; `AGENTS.md`; Lovable project knowledge (via the Lovable connector, project 2f215f56-0677-42e1-b0d5-838eb32e1c1c).
- Depends on: the plan pull request (claude/plan-v2) merged; Rashid's yes on the clean-up list.
- Model: Sonnet.
- Done when:
  - `grep -rn "KABSI-SPEC\|KABSI-STATE\|WORK-QUEUE\|KNOWLEDGE-BASE.md" --exclude-dir=node_modules .` returns only lines in `docs/source/` and `docs/KABSI-PLAN.md`.
  - `node scripts/build-kb.mjs` runs and `public/llms-full.txt` is byte-identical to before (the content did not change, only the path).
  - `AGENTS.md` keeps the Lovable block and points to `docs/KABSI-PLAN.md`.
  - Lovable project knowledge (read back with `get_project_knowledge`) carries the new rules: names from K-02, tokens only (K-108), brand line K-112, no Google writes, plus the existing frontend-only rules.
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo rashidhamzy-hue/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.1-01, then docs/KABSI-PROGRESS.md. Do only task P0.1-01. Follow section 2 for checks, merging, proof and the PROGRESS update.
Delete the retired docs listed in the task, move docs/KNOWLEDGE-BASE.md to knowledge/kabsi-facts.md with git mv and point scripts/build-kb.mjs at it. Update AGENTS.md. Then update the Lovable project knowledge with set_project_knowledge: keep every existing rule, replace the copy rules with section 2.2 of the plan, and add "use only the design tokens". Do not change any other file.
```

### P0.1-02a Public site: wording that breaks Google's rules or describes removed features

- Decisions: K-112, K-110 (fixes 2 and 3 and the final wording), K-53, K-02, K-50, K-25, K-116.7, R-02, R-14, R-20, D297.
- Touches: `src/routes/index.tsx`, `how-it-works.tsx`, `pricing.tsx`, `faq.tsx`, `partners.tsx`, `about.tsx`, `security.tsx`, `terms.tsx`, `privacy.tsx`, `src/components/layouts/public-layout.tsx`, `src/lib/site.ts` (JSON-LD address, slogans), `src/lib/faq.ts`, `src/lib/verticals.tsx`, `src/lib/guides.tsx`, `public/llms.txt`. Split into two pull requests if more than 10 files change (routes first, then lib and llms).
- Depends on: P0.1-01.
- Model: Sonnet.
- What changes:
  - Brand line everywhere (hero, titles, share and search descriptions, closing bands): "Your reviews and listing. Taken care of." Explanation line under it: "Kabsi looks after your business on Google: a reply ready for every new review, your hours and details kept right, and fresh posts. You just approve." Retire "Your Google Business Profile, taken care of.", "Every Google review, answered", "Tap. Review. Reply." and "Your Google, taken care of."
  - Primary button "Join early access" (R-02), secondary "See it work" (opens the existing demo). One label everywhere.
  - Remove "Profile Score", "Do now", "Listing Shield", "Put mine back", "weekly post", "by following Google's own guidance", "Follows Google's guidelines" as a tick, and the five module names. Use K-02 names and the outcome wording from the design review (pricing feature list: "A reply ready for every new review", "Know when Google changes your details", "Photos and updates prepared for you", "Holiday hours reminders", "Weekly Care Report", "A person to talk to"). Features not yet live carry "Early access" and never "Coming soon" where the feature exists.
  - Demo card button says "Approve", not "Post"; the note under it says "Nothing is published until you approve it."
  - Footer: the full notice "Google and Google Business Profile are trademarks of Google LLC. Kabsi is independent and not affiliated with, sponsored by or endorsed by Google." Sign-off "We watch your listing. You run your business." only on About.
  - Remove the private home address from the footer, terms, privacy and the JSON-LD `streetAddress`; operator line per R-20.
  - Partners page: remove "they never see review text" and "can't post for them" promises and "Settle in USDT" as a headline benefit; keep the lead form. Full rewrite is P1-01.
  - Get Reviews copy on public pages: "Ask every customer the same way, as they visit. Never offer a reward."
  - FAQ adds "How is this different from Gemini in Business Profile?" with the two-sentence K-50 answer, sourced to Google's help page.
- Done when:
  - `grep -rniE "profile score|do now|listing shield|put mine back|taken care of\.\"|google business profile, taken care|every google review, answered|tap\. review\. reply|spring 19|villa 9" src public/llms.txt` returns nothing except the new brand line.
  - `grep -rn "Get early access\|Start free trial\|Start free\"" src` returns nothing; "Join early access" appears on every public CTA.
  - The footer notice text is present on `/`, `/pricing`, `/faq`.
  - typecheck, lint, tests and build pass.
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo rashidhamzy-hue/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.1-02a, then docs/KABSI-PROGRESS.md. Do only task P0.1-02a. Follow section 2 for checks, merging, proof and the PROGRESS update.
This is a copy task on the public site only. Make exactly the changes listed under "What changes", using the wording given there word for word. Do not redesign layouts. Keep the existing demo and photos. Update knowledge/kabsi-facts.md where a fact or wording changed, then rebuild llms-full.txt with node scripts/build-kb.mjs.
```

### P0.1-02b App, emails and Nora: the same wording fixes

- Decisions: K-02, K-07, K-17 (button label), K-25, K-112, K-53.
- Touches: `src/components/layouts/app-layout.tsx`, `src/components/app/do-now.tsx`, `src/lib/profile.ts`, `src/routes/_authenticated/app/index.tsx`, `shield.tsx`, `plan.tsx`, `cards.tsx`, `src/routes/a.$token.tsx`, `src/components/assistant/assistant-widget.tsx`, email copy in `supabase/functions/api/cron.ts`, `supabase/functions/_shared/shield.ts`, `supabase/functions/_shared/kabsi.ts` (footer), `supabase/functions/assistant/index.ts` (tool descriptions), `emails/auth/*.html` and `emails/build.py`.
- Depends on: P0.1-02a.
- Model: Sonnet.
- What changes:
  - Home: remove the Profile Score number and every points value; the list is titled "What needs your attention" and shows the same items ordered by the existing order (the task engine replaces it in P0.3-05). Navigation labels follow K-02 (Reviews, Google Profile, Get Reviews, Settings); URLs stay.
  - Every "Post" button that approves a reply or post says "Approve"; email buttons say "Review reply" (K-17) and open the confirmation page as today.
  - The Listing Shield screen is titled "Google Protection" and the "Put mine back" email link is removed: the email says what changed and links to the app; the app button reads "Keep my information" and still needs a tap in the app. (The full Protection rebuild is P0.2-04.)
  - Email footer: "Nothing is published until you approve it." plus the full non-affiliation notice and the R-20 operator line; no address.
  - Get Reviews page: "Link activity" label, the sentence "Activity is not the same as reviews. Google decides which reviews appear.", no per-person labels in examples (places only: Counter, Table 4).
  - Nora's tool descriptions and greeting stop using "Profile Score"; `get_profile_score` keeps its name in code for now but returns no score text to owners.
- Done when:
  - The grep from P0.1-02a, run on `src supabase/functions emails`, returns nothing.
  - A mock review email (staff_mock_review on Yawmiyati) arrives with the button "Review reply" and the new footer (check the `emails` row body).
  - typecheck, lint, tests, build and `bash scripts/deno-check.sh` pass; functions deploy on merge (check versions with list_edge_functions).
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo rashidhamzy-hue/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.1-02b, then docs/KABSI-PROGRESS.md. Do only task P0.1-02b. Follow section 2 for checks, merging, proof and the PROGRESS update.
Copy and label changes in the signed-in app, the email templates and Nora's tool text, exactly as listed. No schema change. Keep URLs. After merging, trigger one mock review on Yawmiyati with staff_mock_review through the Supabase connector and paste the resulting emails row as proof.
```

### P0.1-03 Move kabsi.co to the new build

- Decisions: R-01, K-110 fix 1 (switch-day steps), G-04, G-05, G-10, D268.
- Touches: `src/lib/site.ts` (`SITE_URL`), `public/sitemap.xml`, `public/robots.txt`, `public/llms.txt`, `knowledge/kabsi-facts.md` and `public/llms-full.txt`, `workers/kabsi-go/wrangler.jsonc` and the fallback in `workers/kabsi-go/src/index.js` (`APP_ORIGIN`), Supabase secret `APP_URL`, `app_settings.app_url`, canonical helper in `src/lib/site.ts` (strip query parameters), noindex on `/app`, `/partner`, `/staff`, `/start`, `/login`, `/a/*`, `/activate/*`.
- Depends on: P0.1-02a, P0.1-02b; Rashid steps 1 and 2 in section 5 (Lovable domain and DNS, Supabase URL settings).
- Model: Sonnet.
- Ask Rashid before: telling him the exact DNS records Lovable shows, and before the final redirect check.
- Done when:
  - `curl -sI https://kabsi.co` returns 200 from the new build and the HTML title carries the K-112 line; `curl -sI https://kabsi-app.lovable.app/pricing` returns 301 to `https://kabsi.co/pricing` (or Lovable's primary-domain redirect does the same).
  - Old kabsi.co URLs that have a new equivalent (`/privacy`, `/terms`, `/pricing`) answer from the new build; the rest return 404.
  - `curl -s https://kabsi.co/sitemap.xml` lists only `https://kabsi.co/...` URLs; `robots.txt` names that sitemap and allows Googlebot, OAI-SearchBot, ChatGPT-User and PerplexityBot.
  - Canonical on `/pricing?utm_source=x` is `https://kabsi.co/pricing`.
  - Email sign-in from kabsi.co works end to end (a code arrives and signs in); an email action link opens on kabsi.co.
  - A card tap on `go.kabsi.co/KQA234` still redirects to Google, and an unknown code lands on `https://kabsi.co/activate/...`.
  - Zoho MX, SPF and DKIM records unchanged (compare before and after with `dig`).
  - Rashid has resubmitted the sitemap in Search Console (recorded in PROGRESS).
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo rashidhamzy-hue/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.1-03, then docs/KABSI-PROGRESS.md. Do only task P0.1-03. Follow section 2 for checks, merging, proof and the PROGRESS update.
First record the current DNS for kabsi.co (dig A, AAAA, MX, TXT) in PROGRESS. Then give Rashid steps 1 and 2 from section 5 in plain words and wait for his "done". Then change every place that names kabsi-app.lovable.app to https://kabsi.co, add the canonical query-stripping and the noindex list, update APP_URL and app_settings.app_url, and run every Done-when check with curl and dig.
```

### P0.1-04 AI and Google-rules fixes in drafting

- Decisions: K-113.3, K-113.4, K-14 (contact-details check), K-116.3, K-116.4, K-99.5, K-100, R-19, R-21.
- Touches: `supabase/functions/_shared/ai.ts`, `_shared/facts.ts`, `_shared/posts.ts`, `_shared/report.ts`, `content/index.ts`, `posts-weekly/index.ts`, `supabase/functions/api/*`; a migration adding `ai_usage` (business, day, generations, tokens) and two settings (per-business daily cap, global daily cap); Deno tests.
- Depends on: P0.1-01.
- Model: Opus (AI safety).
- What changes:
  - Replies never contain phone numbers, email addresses, links, hashtags or prices not in the facts; the "Replies may use the phone" rule goes. An unhappy reviewer gets "please contact us through the details on our profile".
  - Code check rejects a draft or post that contains a phone number, email address, URL (posts: except the owner's own domain in the button only), social handle or hashtag.
  - `keyword_suggest` and weekly posts stop using phrases taken from review text (the "reviews" source); only category, area, owner input and, after go-live, Google's search terms.
  - The weekly report stops quoting review text.
  - `fenceReview` caps review text at 4,096 characters; drafting stops with a clear owner message when the business or global daily AI budget is used up, and the global cap alerts #kabsi-alerts.
- Done when:
  - New Deno tests pass: a review that asks "what's your number?" produces a draft with no digits sequence of 7 or more; a post draft with "call 555 0100" fails the check; a 10,000-character review is fenced at 4,096; `keyword_suggest` output never has `source: "reviews"`.
  - Live mock check on Yawmiyati: one mock review drafted after deploy, draft body pasted in PROGRESS shows no contact details.
  - `select count(*) from weekly_reports where body::text ~ '"quotes"'` for reports created after the merge is 0.
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo rashidhamzy-hue/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.1-04, then docs/KABSI-PROGRESS.md. Do only task P0.1-04. Follow section 2 for checks, merging, proof and the PROGRESS update.
Read K-14, K-100 and K-113 in docs/source/KABSI-AUDIT.md first. Write the Deno tests first, see them fail, then change the code. Apply the ai_usage migration with the Supabase connector before merging. Keep the existing injection fence and safety check; add, do not loosen.
```

### P0.1-05 Design tokens and shared components

- Decisions: K-108, design review "Visual system" and "Components to standardise", R-14.
- Touches: `src/styles.css` (one `@theme` token block: colours incl. new amber `#B45309` on `#FEF3C7`, type scale, spacing, radius, shadows), `src/components/ui/` (Button variants primary yellow, secondary black outline, tertiary link; StatusPill green, amber, red, grey; ExampleBadge; KabsiCard approval card; StepList; Banner), `scripts/check-tokens.mjs` and a CI step, a staff-only noindex route `/design` showing every token and component.
- Depends on: P0.1-01. Can run in parallel with P0.1-04.
- Model: Sonnet.
- Done when:
  - `node scripts/check-tokens.mjs` fails on a test fixture containing `bg-[#123456]` or `font-[Inter]` and passes on the repo; CI runs it.
  - `/design` renders for a staff login and redirects others; it is in the robots disallow list.
  - Yellow appears only on primary buttons and the "needs you" highlight in components (reviewed in the PR with a screenshot or, if no browser, listed by grep of `kb-yellow` uses).
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo rashidhamzy-hue/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.1-05, then docs/KABSI-PROGRESS.md. Do only task P0.1-05. Follow section 2 for checks, merging, proof and the PROGRESS update.
Read K-108 in docs/source/KABSI-AUDIT.md and the "Visual system" section of docs/source/KABSI-DESIGN.md. Consolidate the existing --kb-* tokens into one block; do not change existing colour values except adding amber. Build the components once; do not migrate existing screens in this task (later tasks use them).
```

### P0.1-06 Demo workspace with fictional businesses

- Decisions: R-17, VIDEO "How Rashid uses this plan" step 3 and Part 4 "Product screens", K-56 (permanent demo), guardrail 23 and 24 (isolated demo).
- Touches: migration adding `locations.is_demo` (and `organizations.is_demo` once P0.1-09 lands: the P0.1-09 backfill carries it), a seed SQL file `supabase/seed/demo.sql` run once with the connector, exclusions in `api` cron, `posts-weekly`, `partner` billing, Slack `ops_emit`, PostHog server events and email sending (emails only to the demo login), a "Demo data" tag in the app header when the business is a demo one, `app_settings.concierge_cap` set to 20 (R-09).
- Depends on: P0.1-02b.
- Model: Opus (isolation from real data).
- Seed: one demo login (`demo@kabsi.co`, an alias Rashid creates on Zoho, or a `@test.local` address if he prefers no mailbox); Harbour Lane Coffee (café, fictional US address, `+1 (555)` number) and Juniper Hair Studio (salon); 12 invented reviews each in English with a mix of 1 to 5 stars and two in other languages; drafts for most, one high-care review, one profile change alert ("Google changed your Saturday hours to Closed"), one weekly report, one holiday-hours reminder, one review card link. All names and text invented; no real business, person or place.
- Done when:
  - Signing in as the demo login shows both businesses with the data above and the "Demo data" tag on every screen.
  - SQL proof: no `emails` row for demo businesses has a recipient other than the demo login; `ops_events` has no rows for them; partner billing and plans ignore them (`select ... where is_demo`).
  - Rashid can record S01, S03, S05 and the review card on his phone (he confirms in the chat).
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo rashidhamzy-hue/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.1-06, then docs/KABSI-PROGRESS.md. Do only task P0.1-06. Follow section 2 for checks, merging, proof and the PROGRESS update.
Ask Rashid one question first: may the demo login be demo@kabsi.co (he creates the Zoho alias) or should it be a @test.local address. Then add is_demo, the exclusions, the Demo data tag and the seed. Every name, review and number in the seed is invented and international (US-style). Prove isolation with SQL.
```

### P0.1-V1 Brand kit text and shot sheets for videos 1 to 8

- Decisions: VIDEO Part 4 "Brand kit", Part 2 cards #1 to #8, "Rules every video must follow", R-10.
- Touches: `docs/marketing/brand-kit.md`, `docs/marketing/shot-sheets/V01.md` to `V08.md`, `docs/marketing/feature-truth.md`.
- Depends on: P0.1-02b (wording), P0.1-06 (screen names).
- Model: Sonnet.
- Each shot sheet is one page Rashid copies from on higgsfield.ai: hooks A, B, C; scene list with times; for each still the Gemini prompt with the style line; for each clip the Higgsfield model and motion prompt; voice lines one sentence per line with numbers as words; on-screen text; captions; CTA for before and after Gate A; the product screen codes and which demo flow to record; the file name pattern; the claims checked against the claims table. `feature-truth.md` lists each feature a video shows and whether it is live today (so Rashid knows which videos can become ads).
- Done when: ten files exist; every line passes the claims table (no "automatically", "real-time", "Google Protection" before it is live, no ranking claims); videos whose screens are not true yet are marked "record after task X".
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo rashidhamzy-hue/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.1-V1, then docs/KABSI-PROGRESS.md. Do only task P0.1-V1. Follow section 2 for checks, merging, proof and the PROGRESS update.
Read docs/source/KABSI-VIDEO.md Parts 2, 4, 5 and the rules section in full. Write the brand kit text, feature-truth.md and shot sheets V01 to V08 as described. No code changes.
```

### P0.1-V2 Shot sheets for videos 9 to 16 and website videos W1 to W5

- Decisions: VIDEO Part 2 cards #9 to #16, Part 3, R-10.
- Touches: `docs/marketing/shot-sheets/V09.md` to `V16.md`, `W1.md` to `W5.md`.
- Depends on: P0.1-V1.
- Model: Sonnet.
- Done when: thirteen files in the same format; #9, #3 and W4 carry the "AI presenter" and "Presenter is AI-generated" lines; #13 and W5 are marked "after the partner workspace (P1-01)"; #16 is a guide for a real customer with the consent checklist.
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo rashidhamzy-hue/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.1-V2, then docs/KABSI-PROGRESS.md. Do only task P0.1-V2. Follow section 2 for checks, merging, proof and the PROGRESS update.
Use the same format as docs/marketing/shot-sheets/V01.md. Read docs/source/KABSI-VIDEO.md Parts 2 and 3 and the rules section. No code changes.
```

### P0.1-V3 Setup-call and partner-call booking links

- Decisions: K-89, K-105, K-118 (Calendly row), K-104 (three pre-selected answers), G-42 (event wiring comes in P0.6-03).
- Touches: Calendly (connector): one event type "Call with Kabsi", 20 minutes, required question "What's the call about?" with Setting up my Google profile, Partner or agency, Something else, slots in Beirut hours plus a few late-afternoon slots for US East Coast mornings (ask Rashid for his hours). Repo: `src/lib/site.ts` (`BOOKING_URL` with the three prefilled variants), new route `/setup-call` (embedded booking widget, one paragraph "We guide, you click; we never ask for your Google password", support email), links on pricing FAQ, footer ("Book a free setup call", "For agencies: talk to Rashid"), contact and partners pages ("Talk to Rashid" secondary button), the Manager steps page and onboarding access step ("Stuck? Book a free 15-minute setup call"), `knowledge/kabsi-facts.md`.
- Depends on: P0.1-03.
- Model: Sonnet.
- Done when: the Calendly event exists (read back through the connector) with the required question; `/setup-call` renders the widget; each placement link opens Calendly with the right answer preselected (three URLs tested with curl for 200 and recorded); Nora's facts file names the link and the three versions.
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo rashidhamzy-hue/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.1-V3, then docs/KABSI-PROGRESS.md. Do only task P0.1-V3. Follow section 2 for checks, merging, proof and the PROGRESS update.
Ask Rashid one question: which hours (Beirut time) he takes calls, and which days. Then create the Calendly event type through the Calendly connector, and add the page and links listed. The booking page stays on Calendly's default look (free plan).
```

### P0.1-07 Database test suite in CI

- Decisions: K-54, K-42 (RLS test), G-17, R-12, guardrail 25.
- Touches: `supabase/config.toml` (local stack settings only), `supabase/tests/*.sql` (pgTAP), `.github/workflows/ci.yml` (new job `database`: install Supabase CLI, `supabase start` with only the database services, `supabase test db`), `docs/testing.md`.
- Depends on: P0.1-01.
- Model: Opus.
- Tests to write now: for every table in `public`, as anon, as a stranger, as the owner of another business and as a partner member of another partner, `select count(*)` is 0; every SECURITY DEFINER function executable by `authenticated` refuses a non-member (one test per function, generated from `pg_proc` so a new function without a test fails the suite); `google_mode()` not executable by anon (expected to fail until P0.1-08, marked TODO with the task ID).
- Done when: the `database` job runs on a pull request and passes; a scratch branch that adds `create policy p on locations for select using (true)` makes it fail (link to the failed run in PROGRESS); the suite runs in under 10 minutes.
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo rashidhamzy-hue/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.1-07, then docs/KABSI-PROGRESS.md. Do only task P0.1-07. Follow section 2 for checks, merging, proof and the PROGRESS update.
Build the local-stack database job and the pgTAP suite described. Generate the per-table and per-function tests from the catalog so new tables and functions are covered by default. Prove the suite catches a bad policy with a throwaway branch, then delete that branch.
```

### P0.1-08 Security hardening of the database API

- Decisions: K-42, audit findings A10, A11, A12, G-17, D301 (sessions part already done).
- Touches: migration creating schema `private`, moving service-only functions there (`call_internal`, `run_retention`, `partner_billing_run`, `partner_recipients`, `plan_price`, `start_paid_plans`, `ops_emit`, `ops_watchdog`, `purge_old_chats`, `end_expired_plans`, `concierge_daily_tasks`, `concierge_overdue_alerts`, mock helpers, and any other function not meant for the browser), updating pg_cron commands and Edge Function RPC calls that use them; `revoke execute on function public.google_mode() from anon`; an explicit membership check reviewed in every remaining browser-callable SECURITY DEFINER function; Auth settings (leaked-password protection on, email OTP length 6 stays).
- Depends on: P0.1-07.
- Model: Opus.
- Done when: `get_advisors` security shows no `anon_security_definer_function_executable`; the `authenticated` list contains only owner, partner and staff RPCs that the browser calls (list in PROGRESS); every pg_cron job still runs (check `cron.job_run_details` for one successful run of each after the change); the database suite passes including the google_mode test.
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo rashidhamzy-hue/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.1-08, then docs/KABSI-PROGRESS.md. Do only task P0.1-08. Follow section 2 for checks, merging, proof and the PROGRESS update.
List every SECURITY DEFINER function with its callers (grep src and supabase/functions, and cron.job) before moving anything. Move only functions with no browser caller. Update cron commands in the same migration. If leaked-password protection cannot be set through the tools you have, give Rashid the one dashboard step and record it.
```

### P0.1-09 Tenant model: organisations, connections, subscriptions

- Decisions: K-33, K-16 (roles), K-48 (billing on the organisation), R-07, R-22.
- Touches: migration adding `organizations` (id, name, type owner or partner, is_demo, created_at), `organization_members` (org, user, role owner, admin, member), `locations.organization_id`, `location_members.role` extended to owner, manager, staff, `partner_clients` (partner org, location, status invited, onboarding, active, paused, ended, approval_policy jsonb, consent_text, consent_at), `google_connections` (location, kabsi_account, google_account_id, google_location_id, access_state, access_granted_at, last_attempted_sync_at, last_successful_sync_at, next_sync_at, sync_status, last_error), `subscriptions` (org, plan, state trialing, active, past_due, cancelled, expired, period, provider, provider ids, trial fields) created empty; backfill one organisation per owner and the partner organisation; helper functions `is_org_member`, `has_location_role`; RLS on all new tables; views or RPC changes so existing screens keep working.
- Depends on: P0.1-08.
- Model: Opus.
- Done when: every location has an organisation and a google_connections row (SQL); the database suite covers the new tables and passes; the app works for the Yawmiyati owner and the partner login (smoke: Home, Reviews, partner page load with data; PROGRESS lists the calls checked); nothing is dropped yet (contract step in later tasks).
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo rashidhamzy-hue/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.1-09, then docs/KABSI-PROGRESS.md. Do only task P0.1-09. Follow section 2 for checks, merging, proof and the PROGRESS update.
Read K-16, K-33 and K-48 in docs/source/KABSI-AUDIT.md. Expand only: add tables, columns and backfill; keep old columns (partner_id, plans) working. Write the RLS tests for each new table in the same pull request. Regenerate src/types/db.ts if the project uses generated types.
```

### P0.1-10 Append-only audit log and the "What Kabsi did" feed source

- Decisions: K-43, K-09, K-40 (redaction), K-17 (channel, IP country, user agent), guardrail 8.
- Touches: migration adding `audit_events` (actor_type user, staff, partner, system, google; actor_id; action; organization_id; location_id; object_type; object_id; before; after; channel; result; request_id; ip_country; user_agent; created_at), `private.audit(...)` as the only insert path, a trigger that refuses UPDATE and DELETE except the retention redaction (session flag set only inside `run_retention`), an owner-scoped RPC `activity_feed(location, days)` that groups routine checks into one line a day; calls to `private.audit` from approvals, publications, knowledge edits, onboarding steps, role changes, concierge actions.
- Depends on: P0.1-09.
- Model: Opus.
- Done when: database tests prove insert through the function works, UPDATE and DELETE fail even for the service role outside retention, an owner sees only their businesses' events; approving a mock reply writes an `approval` and a `publication` event with channel; `activity_feed` returns plain lines for Yawmiyati.
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo rashidhamzy-hue/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.1-10, then docs/KABSI-PROGRESS.md. Do only task P0.1-10. Follow section 2 for checks, merging, proof and the PROGRESS update.
Read K-09, K-40 and K-43 in docs/source/KABSI-AUDIT.md. Build the table, the single insert function, the immutability trigger and the feed RPC, then wire the existing approval and publish paths to it. Tests first.
```

### P0.1-11 One Google service layer

- Decisions: K-34, K-99 (mock data must not reach baselines, A13), guardrail 9, R-18.
- Touches: `supabase/functions/_shared/google/` with modules `accounts`, `locations`, `reviews`, `posts`, `media`, `performance`, `attributes`, `notifications`, `updates`, `admins`, `verifications`, `placeActions`, `places` (Places API New, with field masks), each with `live.ts` and `mock.ts` and shared types; `tests/fixtures/google/*.json` built from Google's documented response examples with the doc URL in each file; remove the invented Restaurant category and US phone from the mock listing; move every call in `review-link`, `places-search`, `health`, `_shared/report.ts` and `_shared/google.ts` into the layer; `scripts/check-google-calls.mjs` in CI fails on `googleapis.com` outside `_shared/google/`.
- Depends on: P0.1-09.
- Model: Opus.
- Done when: the CI check passes on the repo and fails on a fixture; every function type-checks; Deno tests run each mock module against its fixture shape; the mock mode switch still reads `GOOGLE_MODE` and `app_settings.google_mode`, and demo businesses are always mock (R-17).
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo rashidhamzy-hue/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.1-11, then docs/KABSI-PROGRESS.md. Do only task P0.1-11. Follow section 2 for checks, merging, proof and the PROGRESS update.
Read K-34 and the "Google reality check" section of docs/source/KABSI-AUDIT.md. Build mocks from Google's documented response shapes (cite the doc URL in each fixture), not from the current hand-written mock. Behaviour of existing features must not change; this is a move plus better mocks. Split into two pull requests if it passes 10 files: layer and fixtures first, call-site moves second.
```

### P0.1-12a Job queue and dispatcher, review jobs first

- Decisions: K-35, R-06, guardrail 10.
- Touches: migration adding `jobs` (id, kind, location_id, dedupe_key unique while pending or running, payload, state pending, running, succeeded, failed, retrying, dead, attempts, max_attempts 5, next_run_at, locked_at, locked_by, last_error, created_at, finished_at) and `private.claim_jobs(n)` using `for update skip locked`; a dispatcher route in `api` called by a new pg_cron job every minute (spreads work evenly through the hour); producers and handlers for review sync, draft, notify; per-business sync status written to `google_connections`; staff job health shows dead jobs; `kabsi_cron_tick` keeps only what is not yet ported.
- Depends on: P0.1-11.
- Model: Opus.
- Done when: tests prove a job is claimed once by two concurrent dispatchers, retries with backoff, and lands in `dead` after 5 failures; a mock review on Yawmiyati goes sync, draft, notify through jobs (`jobs` rows in PROGRESS); Home's "last check" reads `google_connections.last_successful_sync_at`.
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo rashidhamzy-hue/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.1-12a, then docs/KABSI-PROGRESS.md. Do only task P0.1-12a. Follow section 2 for checks, merging, proof and the PROGRESS update.
Read K-35 in docs/source/KABSI-AUDIT.md. Build the jobs table, claim function and dispatcher, then port review sync, draft and notify from api/cron.ts. Leave access acceptance and Protection on the old cron until P0.1-12b.
```

### P0.1-12b Rate limiter, circuit breaker and the rest of the cron

- Decisions: K-36, K-35, audit finding A8 and A9.
- Touches: migration adding `google_rate` buckets (project 4 a second, per profile 5 edits a minute) and `circuit_breaker` state; limiter calls inside `_shared/google/`; breaker opens for 5 minutes after 20 failures in a minute with a #kabsi-alerts message; port access acceptance and Protection checks to jobs; retire `kabsi_cron_tick`; a load script `scripts/load/mock-500.ts` that seeds 500 mock businesses on the local stack and measures one hour of dispatch.
- Depends on: P0.1-12a.
- Model: Opus.
- Done when: the load script finishes all syncs inside one simulated hour with no function timeout (output in PROGRESS); a test proves a sixth edit in a minute for one profile waits; a test proves the breaker opens and closes; `kabsi_cron_tick` is unscheduled and `cron.job` shows the dispatcher instead.
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo rashidhamzy-hue/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.1-12b, then docs/KABSI-PROGRESS.md. Do only task P0.1-12b. Follow section 2 for checks, merging, proof and the PROGRESS update.
Read K-36. Add the limiter and breaker inside the Google layer only, port the remaining cron steps to jobs, run the 500-business load test on the local stack and record the numbers.
```

### P0.1-13a One publication pipeline: schema, claim, replies and undo

- Decisions: K-38, K-70, K-116.1, R-05, D202, D266 (no blind retry), guardrail 6.
- Touches: migration extending `publications`: `state` (approved, publishing, published, checking, verifying, verified, rejected, failed, cancelled), `idempotency_key` unique, `publish_after`, `approval` fields (approved_by, approved_at, channel), `attempts`, `google_ref`, `moderation_state`, `last_checked_at`; one claim function; one `publish` job handler; reply path ported (`publishReply` becomes a thin call); undo RPC that cancels while `now() < publish_after`; a `reconcile` job that rechecks `checking` items at 10 minutes then on a widening schedule and never re-posts; concierge businesses still produce a concierge task instead of a Google call.
- Depends on: P0.1-12b, P0.1-10.
- Model: Opus.
- Done when: tests prove a dashboard approval and an email approval of the same reply at the same moment create one publication and one Google call (mock call counter); undo inside 10 seconds cancels with no Google call; a mock timeout leaves `checking` and reconcile marks `verified` after the mock shows the reply; a mock 400 marks `rejected` and returns the item to the owner with the reason; Google moderation "pending" shows as "Google is checking your reply".
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo rashidhamzy-hue/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.1-13a, then docs/KABSI-PROGRESS.md. Do only task P0.1-13a. Follow section 2 for checks, merging, proof and the PROGRESS update.
Read K-38, K-70 and K-116.1 in docs/source/KABSI-AUDIT.md, and R-05 in the plan. Tests first. Never retry a write after an ambiguous failure; reconcile by reading Google. Port only review replies in this task.
```

### P0.1-13b One publication pipeline: posts, photos, hours, profile changes

- Decisions: K-38, audit finding A6, R-05.
- Touches: the post, photo, special-hours and listing-change publish paths in `content` and `_shared/*` moved onto the pipeline; their own claim code and old states removed in a contract migration once nothing reads them.
- Depends on: P0.1-13a.
- Model: Opus.
- Done when: the double-approval test passes for each type; grep shows no Google write outside the publish job handler; old per-type publishing columns are unused (grep and a SQL check) and dropped.
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo rashidhamzy-hue/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.1-13b, then docs/KABSI-PROGRESS.md. Do only task P0.1-13b. Follow section 2 for checks, merging, proof and the PROGRESS update.
Port posts, photos, special hours and listing changes onto the pipeline built in P0.1-13a, with the same tests per type, then remove the old per-type claim logic.
```

## 8. Wave P0.2: trust and policy

Goal: the things Google's policy requires before access is granted, and the trust promises Kabsi makes, work end to end on the mock: disconnect, notices, retention, an owner-approved baseline, Google Protection on Google's own update flow, tighter email approvals, Places costs capped, and legal pages that match the system.

Done when (wave): an owner can disconnect in 3 taps and the access-change email arrives; a mock Google update is accepted and rejected through the update flow; name and category changes refuse without sign-in; the retention job enforces the K-40 table; kabsi.co/privacy carries the Limited Use sentence word for word.

### P0.2-01 Retention table

- Decisions: K-40, K-113.3, D257, D266.
- Touches: migration adding `retention_policies` (data class, keep_days, basis) seeded from K-40, `run_retention` extended to Google profile values (30 days), Google performance figures (30 days), uploaded photos (30 days after publish or skip, Storage objects deleted), audit content fields (24 months, redacted per class), drafts and payloads (as today), Google data 30 days after access is lost (as today); tests.
- Depends on: P0.1-10.
- Model: Opus.
- Done when: database tests seed rows older than each limit and prove `run_retention()` clears exactly those fields and keeps ids, ratings, dates and the owner's own values; `retention_policies` matches K-40 row for row; the Storage clean-up is proven on a test object.
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo rashidhamzy-hue/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.2-01, then docs/KABSI-PROGRESS.md. Do only task P0.2-01. Follow section 2 for checks, merging, proof and the PROGRESS update.
Read K-40 in docs/source/KABSI-AUDIT.md. Make the policy table the single source the retention job reads. Tests first, with rows on both sides of every limit.
```

### P0.2-02 Disconnect Kabsi and access-change notices

- Decisions: K-41, K-113.1, K-113.2, A1, guardrail 11.
- Touches: Settings section "Disconnect Kabsi from Google" (visible, not hidden; confirm sheet; 3 taps); RPC `request_disconnect(location)` (owner only, signed in); job `disconnect` that removes Kabsi's admin entry through `_shared/google/admins` (mock now), cancels open tasks and approvals, stops jobs for the business, marks `google_connections.access_state = removed`, emails the owner a confirmation with how to check in Google; if removal fails, a staff alert with a due date 7 business days out (tracked in a `staff_followups` row and shown on /staff); a separate access-change email within 48 hours of any change Kabsi makes to access, starting with accepting the Manager invitation, saying what changed and how to remove Kabsi; audit events for each step.
- Depends on: P0.1-13b, P0.2-01.
- Model: Opus (Google access).
- Done when: on a QA business in mock mode, disconnect takes 3 taps and produces the confirmation email, the audit events, cancelled tasks and no further jobs (SQL); a forced mock failure creates the staff follow-up with the right due date; accepting a mock invitation sends the access email within the same job run; the review link keeps working after disconnect.
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo rashidhamzy-hue/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.2-02, then docs/KABSI-PROGRESS.md. Do only task P0.2-02. Follow section 2 for checks, merging, proof and the PROGRESS update.
Read K-41 and K-113 points 1 and 2 in docs/source/KABSI-AUDIT.md. Build the screen, the RPC, the disconnect job, the follow-up and the two emails. Use the admins module in _shared/google; it is mock until Gate A.
```

### P0.2-03 Business Knowledge table and the owner-approved baseline

- Decisions: K-10 (table), K-18, K-20, A2, A5, R-05.
- Touches: migration adding `knowledge_facts` (location, key from the K-10 catalogue, value jsonb, status verified, needs_confirmation, outdated, rejected, source owner, google, website, partner, ai_suggestion, staff, source_ref, confirmed_by, confirmed_at, review_after, uses, version, superseded_by) with history kept by versioning; `profile_changes` replacing `listing_changes` (field, previous approved value, Google value, source google_update, notification, scheduled_check, detected_at, severity, status detected, awaiting_review, accepted, rejected, corrected, failed, expired, superseded, decided_by, decided_at, publication_id); migrate existing baselines as "not yet confirmed" (never as approved, fixing A2); a "confirm your details" RPC that writes owner-verified facts for name, phone, website, address or service area, regular hours, main category, open status.
- Depends on: P0.2-01.
- Model: Opus.
- Done when: existing `knowledge_card` values are copied to `knowledge_facts` as verified, source owner (row counts match per key); existing baselines appear as unconfirmed; a superseded change becomes `superseded`, not `kept` (test); changes nobody answers in 14 days become `expired` (test); RLS tests cover both tables.
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo rashidhamzy-hue/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.2-03, then docs/KABSI-PROGRESS.md. Do only task P0.2-03. Follow section 2 for checks, merging, proof and the PROGRESS update.
Read K-10, K-11, K-18 and K-20 in docs/source/KABSI-AUDIT.md. Expand only: add the two tables, migrate data, keep knowledge_card readable until P0.3-01 switches readers. Tests first.
```

### P0.2-04 Google Protection on Google's update flow

- Decisions: K-19, K-77, K-116.2, K-117 (map pin is high risk), K-64, A3, A4, guardrail 7.
- Touches: `_shared/shield.ts` replaced by a Protection detector job using `_shared/google/updates` (hasGoogleUpdated and getGoogleUpdated diff) plus the daily read; watched fields per K-19 including open status and map pin; explanation text ("Google shows Sunday closing at 18:00. You approved 22:00."); the two decisions "Google is right" (accept, updates the fact) and "Keep my information" (reject, re-sends the approved value through the pipeline, then reads getGoogleUpdated again); Google's name rules checker (web addresses, keywords, city, slogan) that recommends "Google is right" when the old name broke them; name, address, main category, open status and map pin need a signed-in owner and show "Changing this can make Google ask you to verify your business again."; at most one high-risk field per approval and 7 days between them; a field never re-sent more than twice in 30 days (third conflict becomes a support task with a ready explanation); fields not yet confirmed are labelled "Not yet confirmed by you" and never offered for restore; status line on Home "Google Protection: on, last check 09:14".
- Depends on: P0.2-03, P0.1-13b.
- Model: Opus (Google access).
- Done when: on the mock, a Google update to hours creates a change with the explanation, "Keep my information" publishes once through the pipeline and the diff clears; "Google is right" updates the fact; a name change from "Yawmiyati.com" to "Yawmiyati" recommends "Google is right" with the reason; a name change attempted from an email link is refused until sign-in (test); a second high-risk change inside 7 days is refused (test); nothing is ever reverted without a decision (grep and test).
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo rashidhamzy-hue/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.2-04, then docs/KABSI-PROGRESS.md. Do only task P0.2-04. Follow section 2 for checks, merging, proof and the PROGRESS update.
Read K-18 to K-20, K-77 and K-116 point 2 in docs/source/KABSI-AUDIT.md and guardrail 7. Never revert anything automatically. Build detection, explanation, the two decisions through the pipeline and the guards; the full Google Profile screen comes in P0.3-11, so keep the UI to the change card and the Home status line.
```

### P0.2-05 Email approvals tightened

- Decisions: K-17, K-38, K-70, A16.
- Touches: `action_tokens` (bind to one action and one recipient, 72-hour expiry, single use), `src/routes/a.$token.tsx` (shows the exact text, one Approve button that sends a POST, then "Publishing in 10 seconds" with Undo), `api/action.ts`; sign-in required for profile changes, hours and high-risk items (the page asks to sign in and returns); audit events with channel, user, IP country and user agent; `kabsi_cleanup_action_tokens` keeps working.
- Depends on: P0.1-13a.
- Model: Opus.
- Done when: tests prove GET never changes anything, a second POST returns the existing result, an expired or used token is refused, a token used by another recipient's session is refused for sign-in-required kinds; undo from the email page cancels; the audit row carries the channel `email_link`.
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo rashidhamzy-hue/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.2-05, then docs/KABSI-PROGRESS.md. Do only task P0.2-05. Follow section 2 for checks, merging, proof and the PROGRESS update.
Read K-17 in docs/source/KABSI-AUDIT.md. Keep the scanner-safe design (GET shows, POST performs). Tests first.
```

### P0.2-06 Places cost guard

- Decisions: K-100, K-63, K-99.4, G-16 (rate limits on tools).
- Touches: `_shared/google/places.ts` (field masks on every request, never the reviews field; autocomplete with session tokens; 24-hour cache by place ID), `places_usage` daily counter with a kill switch at the cap (tool shows "Back soon" when passed), Slack alert at 80 percent; Rashid's step 3 in section 5.
- Depends on: P0.1-11.
- Model: Sonnet.
- Done when: every Places request in the code has a field mask (grep); a cache hit makes no Places call (test with a call counter); the kill switch trips at the configured cap in a test; Rashid confirms the quota of 100 a day, the budget alerts and places-backend disabled (recorded in PROGRESS with the date).
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo rashidhamzy-hue/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.2-06, then docs/KABSI-PROGRESS.md. Do only task P0.2-06. Follow section 2 for checks, merging, proof and the PROGRESS update.
Read K-100 in docs/source/KABSI-AUDIT.md. Add masks, session tokens, the cache and the kill switch. Then give Rashid step 3 from section 5 of the plan in plain words and record his confirmation.
```

### P0.2-07 Privacy, terms and security pages that match the system

- Decisions: K-40 (table in plain words), K-41, K-113.6 (Limited Use sentence word for word), K-113.7, K-112 (notice), K-98 (eligibility), K-101 (trial terms), K-48 (billing rules), R-20, D254.
- Touches: `src/routes/privacy.tsx`, `terms.tsx`, `security.tsx`, `knowledge/kabsi-facts.md`.
- Depends on: P0.2-01, P0.2-02, P0.1-03.
- Model: Sonnet.
- Seller: the pages read the seller from the `LEGAL_SELLER` constant in `src/lib/site.ts` (R-20: Hussein Slim, Dubai, once Rashid step 8 is confirmed; the neutral line before that); governing law is listed for the lawyer read.
- Done when: `curl -s https://kabsi.co/privacy` contains "Kabsi's use and transfer to any other app of information received from Google APIs will adhere to the Google API Services User Data Policy, including the Limited Use requirements."; the retention table on the page matches `retention_policies`; processors listed match reality (Supabase EU, Resend, Anthropic, Sentry EU, PostHog US, Cloudflare, Lovable, Calendly, Creem once live); no "Replit"; disconnect described as built.
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo rashidhamzy-hue/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.2-07, then docs/KABSI-PROGRESS.md. Do only task P0.2-07. Follow section 2 for checks, merging, proof and the PROGRESS update.
Read K-40, K-41, K-112 and K-113 in docs/source/KABSI-AUDIT.md. Every sentence must be true of the system as built today; mark nothing as coming. Use the LEGAL_SELLER constant for the seller line. Add a note in PROGRESS that a lawyer should read both pages before launch.
```

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
You are a Kabsi build chat. Work in the GitHub repo rashidhamzy-hue/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.3-01, then docs/KABSI-PROGRESS.md. Do only task P0.3-01. Follow section 2 for checks, merging, proof and the PROGRESS update.
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
You are a Kabsi build chat. Work in the GitHub repo rashidhamzy-hue/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.3-02, then docs/KABSI-PROGRESS.md. Do only task P0.3-02. Follow section 2 for checks, merging, proof and the PROGRESS update.
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
You are a Kabsi build chat. Work in the GitHub repo rashidhamzy-hue/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.3-03, then docs/KABSI-PROGRESS.md. Do only task P0.3-03. Follow section 2 for checks, merging, proof and the PROGRESS update.
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
You are a Kabsi build chat. Work in the GitHub repo rashidhamzy-hue/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.3-04, then docs/KABSI-PROGRESS.md. Do only task P0.3-04. Follow section 2 for checks, merging, proof and the PROGRESS update.
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
You are a Kabsi build chat. Work in the GitHub repo rashidhamzy-hue/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.3-05, then docs/KABSI-PROGRESS.md. Do only task P0.3-05. Follow section 2 for checks, merging, proof and the PROGRESS update.
Read K-07 and K-08 in docs/source/KABSI-AUDIT.md and R-05 in the plan. Tasks are created only by server-side detectors, never by the browser. Migrate, then retire profile_tasks and the score. Tests first.
```

### P0.3-06 Roles and approval policies

- Decisions: K-16, R-22, guardrail 11 (an AI agent never has more authority than its human role).
- Touches: `location_members.role` owner, manager, staff in every RLS policy and RPC; per-business, per-kind approval policy (owner approves by default; "partner may approve" and "partner prepares, owner approves" stored with consent text and date, used by P1-01); name, address, main category, open status and high-risk reviews always need the owner; Settings, Team: invite by email, change role, remove (owner only); audit events for role changes.
- Depends on: P0.3-05, P0.1-09.
- Model: Opus (access rules).
- Done when: database tests prove each role's read and approve rights per the K-16 table, a manager cannot approve a name change, staff can only upload photos and see the review link; inviting and removing a team member works on a phone.
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo rashidhamzy-hue/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.3-06, then docs/KABSI-PROGRESS.md. Do only task P0.3-06. Follow section 2 for checks, merging, proof and the PROGRESS update.
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
You are a Kabsi build chat. Work in the GitHub repo rashidhamzy-hue/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.3-07, then docs/KABSI-PROGRESS.md. Do only task P0.3-07. Follow section 2 for checks, merging, proof and the PROGRESS update.
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
You are a Kabsi build chat. Work in the GitHub repo rashidhamzy-hue/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.3-08, then docs/KABSI-PROGRESS.md. Do only task P0.3-08. Follow section 2 for checks, merging, proof and the PROGRESS update.
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
You are a Kabsi build chat. Work in the GitHub repo rashidhamzy-hue/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.3-09, then docs/KABSI-PROGRESS.md. Do only task P0.3-09. Follow section 2 for checks, merging, proof and the PROGRESS update.
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
You are a Kabsi build chat. Work in the GitHub repo rashidhamzy-hue/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.3-10, then docs/KABSI-PROGRESS.md. Do only task P0.3-10. Follow section 2 for checks, merging, proof and the PROGRESS update.
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
You are a Kabsi build chat. Work in the GitHub repo rashidhamzy-hue/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.3-11, then docs/KABSI-PROGRESS.md. Do only task P0.3-11. Follow section 2 for checks, merging, proof and the PROGRESS update.
Read K-18 and K-19 and the Google Profile row in docs/source/KABSI-DESIGN.md. Read data only from knowledge_facts, profile_changes, tasks and google_connections.
```

## 10. Wave P0.4: onboarding, trial and billing

Goal: an owner finds their business, sees the free snapshot, signs up, gives Kabsi Manager access with help at every step, confirms their details, and reaches first value; the trial and Creem billing work, and every email is one template.

Done when (wave): five test owners go from search to connected and first value in under 4 minutes on the mock, each scenario screen has been walked; the trial clock starts only at working access; a Creem test checkout on a phone creates an active subscription from the webhook; every email renders in Gmail, Apple Mail and Outlook with a plain-text version.

Run order in this wave: P0.4-09, P0.4-01, P0.4-02, P0.4-03, P0.4-04, P0.4-05, P0.4-06, P0.4-08, P0.4-10, P0.4-11, then P0.4-07 as soon as D1 and the Creem keys exist.

### P0.4-01 Free snapshot and Google Profile Check

- Decisions: K-91 (snapshot before sign-up), K-45 step 1, K-82 note (public data only), G-27, G-24, K-100, K-62 (public data only, never the Business Profile API), design review "Free tools".
- Touches: public function `profile-snapshot` (Turnstile, per-IP rate limit, 3 checks per visitor a day, the Places kill switch, 24-hour cache, field mask: rating, review count, hours, open status, phone, website, category, photo presence), page `/google-profile-check` and onboarding steps 1 and 2 before sign-up ("Which business is yours?", "Here's what customers see"), findings labelled Urgent, Recommended, Nice to have, never a score; "Email me this check" with an unticked "Send me tips" box stored with consent proof; Google attribution; "Kabsi can take care of these. You approve each one." with the R-02 button.
- Depends on: P0.2-06, P0.1-05.
- Model: Sonnet.
- Done when: a check on a real business returns the snapshot with no reviews field requested (request log or code); the fourth check from one visitor in a day is refused; the email capture stores consent text, time, page and choice; no snapshot data is stored past the cache window (SQL).
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo rashidhamzy-hue/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.4-01, then docs/KABSI-PROGRESS.md. Do only task P0.4-01. Follow section 2 for checks, merging, proof and the PROGRESS update.
Read K-91, K-100 and G-27, and the "Free tools" and "Signup, login and onboarding" sections of docs/source/KABSI-DESIGN.md. Public data only. Add the new function to supabase/config.toml.
```

### P0.4-02 Sign-up sheet: Continue with Google or an email code

- Decisions: K-91, R-11, K-100 (email-code abuse limits), G-16 (Turnstile, disposable domains), D225.
- Touches: `src/routes/login.tsx` and a shared sign-up sheet shown after the snapshot ("Save your snapshot and continue"): "Continue with Google" (primary, standard Google mark per Google's branding rules) and "Continue with email" (6-digit code); Turnstile on the email form; at most 3 codes per address per 15 minutes and 10 per IP per hour; codes expire in 10 minutes; disposable-domain list; no passwords. Rashid step 5 in section 5.
- Depends on: P0.4-01.
- Model: Opus (auth).
- Done when: a new Google account signs up and lands on the next onboarding step with the snapshot kept; the email path still works; the fourth code request in 15 minutes is refused; the Google sign-in requests only openid, email and profile (inspect the authorize URL).
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo rashidhamzy-hue/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.4-02, then docs/KABSI-PROGRESS.md. Do only task P0.4-02. Follow section 2 for checks, merging, proof and the PROGRESS update.
Read K-91 and K-100. Give Rashid step 5 from section 5 and wait for his "done" before testing Google sign-in. Sign-in asks for basic scopes only.
```

### P0.4-03 Manual Manager route with a live status

- Decisions: K-93, K-04, D293, design review "The add Kabsi as manager guide".
- Touches: `ManagerAccessInstructions` and `/manager-steps`: five cards, one step each, device-specific with a "Show me the other version" switch, the group ID large with Copy ("Copied"), desktop screenshots from input I2 in `public/help/manager-steps/desktop/` (step-1 to step-6; phone uses text steps until phone screenshots arrive), the 20-second loop slot for W3, live pill "Waiting for your invitation. We check every 30 seconds." turning green "Invitation received. You're connected" (before Gate A: "We'll email you when access is ready" because staff accept by hand), exits: send these steps to my other device (email or a wa.me link), someone else manages my listing (ready message), book a free setup call.
- Depends on: P0.4-02, P0.1-V3.
- Model: Sonnet.
- Done when: the guide works at 390 px and desktop; Copy works on iOS Safari's fallback path (existing `copyText`); the status pill reads `google_connections.access_state`; "send to my other device" sends one email with a one-tap link back to the step.
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo rashidhamzy-hue/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.4-03, then docs/KABSI-PROGRESS.md. Do only task P0.4-03. Follow section 2 for checks, merging, proof and the PROGRESS update.
Read K-93 and the manual guide section of docs/source/KABSI-DESIGN.md. Keep the group ID in KABSI_GROUP_ID only. Never ask for a password or a code.
```

### P0.4-04 Diagnosis, scenario screens and reminders

- Decisions: K-94, K-95, K-96, K-97, K-98, K-61, K-114.3 (never delete a duplicate), K-116.8, guardrail 13.
- Touches: the three tappable questions (manual route), scenario screens with one layout (what is happening, at most four steps, the button to Google's exact page, "I've done it", the setup-call link): manager not owner, needs verifying, Google is reviewing, suspended, someone else owns it or lost login, no profile in this account, not eligible, several locations, workspace admin blocks; trial clock paused for each per K-94; reminder emails at 1 hour, 24 hours and 72 hours for owners stopped at the invite, verification check-backs every 2 days, ownership reminders on day 3 and day 7; a staff task for a personal WhatsApp nudge at 72 hours when a phone number exists; all reminders stop at access or unsubscribe; the duplicate-profile guidance.
- Depends on: P0.4-03, P0.4-09.
- Model: Sonnet.
- Done when: each scenario screen is reachable from the questions and walked once (list in PROGRESS); reminder jobs fire at the right times on a test account with time travel in tests and stop on access; a not-eligible business never starts a trial (test).
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo rashidhamzy-hue/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.4-04, then docs/KABSI-PROGRESS.md. Do only task P0.4-04. Follow section 2 for checks, merging, proof and the PROGRESS update.
Read K-61 and K-94 to K-98 in docs/source/KABSI-AUDIT.md and the scenario screens in docs/source/KABSI-DESIGN.md. No Google jargon on any screen. Link each scenario to its guide only when that guide exists.
```

### P0.4-05 Five questions and confirm your details

- Decisions: K-45 steps 4 and 5, K-18, K-10.
- Touches: onboarding "Five quick questions" (sign-off, tone with three tappable examples, a contact route for unhappy customers, one thing customers love, one thing never to say), skippable, shown while access is pending; "Confirm your details" once access is confirmed (name, phone, hours, website, category, open status: Correct or Change), written as owner-verified facts and the Protection baseline; then the first Home with the first prepared items and "Your 14-day free trial has started. No card needed." (shown only after R-02's launch gate; before it "Early access").
- Depends on: P0.4-04, P0.3-01.
- Model: Sonnet.
- Done when: answers land in `knowledge_facts` as verified, source owner; confirmed fields show "Approved by you" on Google Profile; skipping uses safe defaults.
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo rashidhamzy-hue/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.4-05, then docs/KABSI-PROGRESS.md. Do only task P0.4-05. Follow section 2 for checks, merging, proof and the PROGRESS update.
Read K-18 and K-45. Use the facts RPCs from P0.3-01; do not write knowledge any other way.
```

### P0.4-06 The trial

- Decisions: K-101, K-94 (clock), K-48 (grace), R-24, R-16.
- Touches: `subscriptions` trial fields and a single `entitlements(org)` function every feature checks; trial starts at working access to a verified profile; one trial per place ID and per Google account (returning listings go straight to paid with settings restored); caps: 3 profile fixes of the owner's choice, 10 backlog drafts, 100 AI generations (silent cap then ask to subscribe or book a call); day 14 to 21 grace (watching and drafting continue, nothing publishes, Home shows what is waiting); day 21 removes access through the disconnect job and tells the owner; the trial emails (day 2 first win, day 7 your week, day 11 three days left, day 14 trial ended) are sent by P0.4-10.
- Depends on: P0.1-09, P0.2-02.
- Model: Opus (billing logic).
- Done when: tests cover each cap, the one-trial rules, grace and the day-21 removal; a concierge or not-eligible business never starts a trial; `plans` and `plans_v2` are no longer read by features (grep).
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo rashidhamzy-hue/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.4-06, then docs/KABSI-PROGRESS.md. Do only task P0.4-06. Follow section 2 for checks, merging, proof and the PROGRESS update.
Read K-48, K-94 and K-101 in docs/source/KABSI-AUDIT.md. One entitlements function decides access; billing state never touches google_connections. Tests first.
```

### P0.4-07 Creem: checkout, webhook, portal

- Decisions: K-106, K-107, K-48, G-29 (cancel question and pause), G-30, R-24, G-47 (Purchase event hook point).
- Touches: Creem products (Monthly $19, Annual $190, Extra location $15 a month or $150 a year, Lebanon bundle $120 a year, Partner resale $8 per business a month, quantity-based); function `billing-creem` (create checkout with the organisation ID in metadata; webhook verifying Creem's signature, storing each event ID once, updating `subscriptions`; failed payment: 7-day grace, then Free, data and access kept, drafting and publishing pause); "Manage billing" opens Creem's customer portal; cancel flow with one question and a pause of one or two months; prices shown as "$19 a month, plus tax where it applies"; Creem branding with Kabsi's logo and colours; NOWPayments kept for annual crypto on request only, writing to the same `subscriptions`.
- Depends on: Rashid steps 7 and 8, P0.4-06. D1 is decided: the Creem account holder is Hussein Slim.
- Model: Opus (payments and webhooks).
- Done when: a test-mode checkout on a phone ends in an active subscription written only by the webhook; replaying the same webhook changes nothing; a bad signature is refused; a test failed payment starts the grace; the portal opens; each target country is checked against Creem's tax coverage list (recorded with the date).
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo rashidhamzy-hue/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.4-07, then docs/KABSI-PROGRESS.md. Do only task P0.4-07. Follow section 2 for checks, merging, proof and the PROGRESS update.
Check PROGRESS for Rashid steps 7 (Creem keys in Supabase secrets) and 8 (Hussein's agreement). If either is missing, stop and ask. Read K-48, K-106 and K-107. Work in Creem's test mode first; the webhook is the only writer of paid state.
```

### P0.4-08 One email template and the email set

- Decisions: K-102, K-118 (email list and "can be switched off" rules), G-22, D244, R-03, R-20.
- Touches: `_shared/email/` with one template that reads the tokens (sand background, one white card, the mark, heading, content, one yellow button with black text, the approval promise, footer with the seller line from `LEGAL_SELLER`, "Why you got this", Email settings link); subject format "Business name: action"; preview line; secondary "Edit first" link; plain-text version always; dark-mode-safe logo; 600 px, 16 px body, 44 px buttons; one-click unsubscribe headers on non-essential mail; Resend idempotency keys; a Resend webhook for bounces and complaints feeding one suppression list; `email_settings` per user per type; every existing email moved onto it; Supabase Auth templates rebuilt with `emails/build.py`; `news.kabsi.co` added in Resend (connector `create-domain`) with SPF, DKIM and DMARC `p=none`, the DNS records given to Rashid to add in Cloudflare, then verified (`verify-domain`).
- Depends on: P0.1-05, P0.4-09.
- Model: Sonnet.
- Done when: each email type sends a test to a Gmail, an Outlook and an Apple Mail inbox and is checked in light and dark mode (Rashid confirms on his phone, or the chat records which clients it could check); plain text exists for every template; a suppressed address is never sent to (test).
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo rashidhamzy-hue/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.4-08, then docs/KABSI-PROGRESS.md. Do only task P0.4-08. Follow section 2 for checks, merging, proof and the PROGRESS update.
Read K-102 and K-118 in docs/source/KABSI-AUDIT.md and the Emails section of docs/source/KABSI-DESIGN.md. One template for every email; move existing emails onto it without changing what triggers them.
```

### P0.4-09 Notification engine

- Decisions: K-46 as amended by K-57, K-17, R-08.
- Touches: `notification_preferences` (user, business, category, channel email or in-app, frequency instant, daily digest, off); one outbox (the `emails` table plus an in-app `notifications` table) with dedupe keys and delivery log; defaults: high-risk reviews and urgent profile changes instant; normal reviews instant during opening hours and digested outside them; everything else in the daily digest; quiet hours 22:00 to 08:00 local except urgent profile changes; in-app bell on Home.
- Depends on: P0.3-05.
- Model: Sonnet.
- Done when: tests prove defaults, quiet hours and dedupe; an owner can switch a category off; the digest groups items.
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo rashidhamzy-hue/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.4-09, then docs/KABSI-PROGRESS.md. Do only task P0.4-09. Follow section 2 for checks, merging, proof and the PROGRESS update.
Read K-46 and K-57. Every send goes through one outbox; no channel bypasses approvals.
```

### P0.4-10 Behaviour-triggered lifecycle emails

- Decisions: G-25, K-101 (messages), G-30, G-24, R-03, K-61.
- Touches: lifecycle sender on `news.kabsi.co` (Resend, authenticated in P0.4-08) driven by events: account created (welcome and the one next step), no access at 1, 24, 72 hours (from P0.4-04), access granted, backlog drafted, first reply approved, day 7 recap from the audit log with the yearly offer, day 11 three days left with both prices, day 14 trial ended, win-back on day 17 and day 30 after expiry based on real waiting items; consent rules by country; unsubscribe.
- Depends on: P0.4-08, P0.4-06.
- Model: Sonnet.
- Done when: each trigger produces its email once in a time-travel test; no lifecycle email reaches an address without the required consent for its country (test); numbers in the day-7 recap come from `audit_events` (test).
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo rashidhamzy-hue/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.4-10, then docs/KABSI-PROGRESS.md. Do only task P0.4-10. Follow section 2 for checks, merging, proof and the PROGRESS update.
Read G-24, G-25 and G-30 in docs/source/KABSI-GROWTH.md and K-101. Counts come only from the audit log. No end-of-trial discount.
```

### P0.4-11 "Need a hand?" on every onboarding step

- Decisions: K-111, K-89, K-104, K-58, design review "Help on every onboarding step".
- Touches: a chip under each step's main button opening a sheet (Ask Nora with three suggested questions for that step and the owner's state, the step's 20-second clip slot, the free 15-minute setup call from the access step on); Nora steps in once when stuck (3 minutes on the manual step without an invitation, a failed access check, a scenario screen); Nora's onboarding context tool (step, scenario, access state) in `assistant`; handover recorded with the conversation.
- Depends on: P0.4-04, P0.6-06 can follow (facts), P0.1-V3.
- Model: Sonnet.
- Done when: the chip appears on every step at the same place; the stuck prompt shows once per step (test); Nora answers "Where is People and access?" from the facts file and offers the call when it cannot help (recorded conversation on the mock).
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo rashidhamzy-hue/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.4-11, then docs/KABSI-PROGRESS.md. Do only task P0.4-11. Follow section 2 for checks, merging, proof and the PROGRESS update.
Read K-111 and the help section in docs/source/KABSI-DESIGN.md. Nora never asks for a password or code and answers only from the facts file and live state.
```

## 11. Wave P0.5: content and proof

Goal: photos, posts and hours go through the same loop, and the Weekly Care Report proves the work every Monday from the audit log.

Done when (wave): a photo goes from a phone to Google (mock) with metadata stripped; a post of each type is drafted only from verified facts and passes the checks; a holiday task appears 21 days ahead; the report counts only audited actions.

### P0.5-01 Photo engine, cover and logo

- Decisions: K-23, K-78, K-81 (GPS note), K-116.6, K-60 guard, A6 (via the pipeline).
- Touches: private Storage bucket per business with 5-minute signed URLs for members only; upload from the app (camera or gallery, up to 20) and a revocable staff upload link per business that only accepts uploads; a processing job outside the request path: real file-signature check (JPEG, PNG, HEIC, WebP), 20 MB limit, no animated files, convert to JPEG, fix orientation, resize to Google's limits, strip all metadata including GPS; quality checks in code (brightness, blur by Laplacian variance, resolution at least 720 by 720, near-duplicate by perceptual hash); vision model classification into Google's photo categories and flags (children's faces, other people's screens, text-heavy flyers, screenshots, stock-looking or AI-generated images, other brands' logos); plain explanations; one batch card "3 photos are ready" with Approve all or one by one; publish by uploading bytes through `_shared/google/media` and the pipeline; original deleted 30 days after publishing (retention); "Cover and logo" strip with the preferred cover and logo and their checks, worded "your preferred cover photo"; freshness and category-gap detectors creating tasks; the photo screen says Kabsi removes location data from every photo.
- Depends on: P0.1-13b, P0.3-05, P0.2-01.
- Model: Opus (storage access and processing).
- Done when: an uploaded test JPEG with GPS EXIF comes out with no EXIF (checked with exiftool output in PROGRESS); a renamed PDF with a .jpg name is refused; a dark photo gets "This photo is dark."; a staff link uploads without an account and stops working when revoked; approve-all publishes once per photo through the pipeline (mock).
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo rashidhamzy-hue/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.5-01, then docs/KABSI-PROGRESS.md. Do only task P0.5-01. Follow section 2 for checks, merging, proof and the PROGRESS update.
Read K-23, K-78 and K-116 point 6 in docs/source/KABSI-AUDIT.md. Never generate or edit a photo beyond orientation and basic exposure. Processing runs in a job, never in the request. Split into two pull requests if needed: pipeline and storage first, screen second.
```

### P0.5-02 Posts: three types, checks and the month view

- Decisions: K-24, K-80, K-116.3, K-116.5, K-116.12, K-102 (post drafting rule), K-113.3, R-19.
- Touches: `_shared/posts.ts` and the Content, Updates screen: Update, Offer (start, end, terms required, only offers the owner typed, optional code and redeem link) and Event (title, start and end, owner's events only); up to 1,500 characters, one real photo, one button; drafts lead with one concrete thing, 150 to 300 characters; two a month by default (1 or 4 by choice); when nothing true is known Kabsi asks one question instead of writing filler; checks before the owner sees it: no phone numbers, emails or social handles, no links except the owner's own domain in the button, no prices or offers not in Business Knowledge, no superlatives, no keyword stuffing (more than two repeats of category or city), no health, safety or results claims, not more than 70 percent similar to any post in the last 90 days, category rules (no medical outcome claims for clinics, no Offer posts for hotels and lodging, no alcohol promotion where restricted); month view with prepared, waiting, published and skipped; "Approve the month" or one by one; scheduled publishing from Kabsi's own queue through the pipeline; recurring posts only for real recurring things; `posts-weekly` replaced by a care-routine job.
- Depends on: P0.5-01, P0.3-02.
- Model: Sonnet.
- Done when: tests for every check; an Offer without dates is refused; a hotel cannot get an Offer draft; a business with no recent facts gets the one question, not a post; approving the month publishes each post at its time through the pipeline (mock).
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo rashidhamzy-hue/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.5-02, then docs/KABSI-PROGRESS.md. Do only task P0.5-02. Follow section 2 for checks, merging, proof and the PROGRESS update.
Read K-24, K-80 and K-116 points 3, 5 and 12. Never invent an offer, price, event, service, policy, staff member or hours. Do not market scheduling as a feature.
```

### P0.5-03 Hours: one editor and the holiday calendar

- Decisions: K-21, K-82 (more hours types: P1), D236.
- Touches: one editor for regular hours, special hours, temporary closure and reopening date, with a calendar, published through the pipeline; a holiday table per country starting with the eight launch markets (US, UK, Canada, Australia, Ireland, New Zealand, Singapore, UAE) plus Lebanon; a Recommended task 21 days before each holiday with Same as usual, Closed, Different hours; never assume holiday hours; Ramadan month-long hours option where observed; the holiday email links each answer to a confirm page.
- Depends on: P0.3-05, P0.1-13b.
- Model: Sonnet.
- Done when: a test business in the UK gets a task 21 days before the next UK bank holiday; "Closed" creates a special-hours publication that needs the owner's tap; regular hours edits go through the pipeline and Protection treats the result as the approved value.
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo rashidhamzy-hue/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.5-03, then docs/KABSI-PROGRESS.md. Do only task P0.5-03. Follow section 2 for checks, merging, proof and the PROGRESS update.
Read K-21 in docs/source/KABSI-AUDIT.md. Holiday dates come from a maintained table checked against an official source for each country, with the source noted per row.
```

### P0.5-04 The Weekly Care Report

- Decisions: K-28, K-72, K-115 (visible routine), K-09, G-29 (retention engine), D222 (adapted: no quotes, R-19).
- Touches: report builder reading only `audit_events` for Kabsi's counts: headline "Kabsi took care of 8 things this week", reviews (new, replies published, average rating), Google Profile (checked N times, changes found and how they were resolved, or "No important changes"), content (updates and photos published), customer activity (views, calls, website clicks, directions, against the week before; mock until live, labelled), what needs you (nothing, or at most 3 lines with one button each), time saved estimate with the formula one tap away (5 minutes a reply, 15 an update, 10 a photo batch, 10 a profile check that found something), never money; sent Monday 08:00 local; kept in Insights; Google numbers in older copies re-fetched on view or dropped after 30 days.
- Depends on: P0.4-08, P0.1-10, P0.5-05 for the activity block (stub until then).
- Model: Sonnet.
- Done when: for the demo and Yawmiyati, every count in a generated report matches a SQL count on `audit_events` for the same week (both pasted in PROGRESS); no review text appears in the report; the time-saved line links to its formula.
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo rashidhamzy-hue/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.5-04, then docs/KABSI-PROGRESS.md. Do only task P0.5-04. Follow section 2 for checks, merging, proof and the PROGRESS update.
Read K-28 and K-72. Every number Kabsi claims as its own work comes from the audit log; nothing is estimated except the labelled time-saved line.
```

### P0.5-05 Insights: one sentence and four tiles

- Decisions: K-26, K-40 (30-day storage), R-18.
- Touches: `_shared/google/performance` (daily metrics; mock until live), Insights screen: headline "217 customers interacted with your Google profile this month, 12% more than last month", tiles for calls, website clicks, directions, views against last month, the weekly reports archive, "See details" with daily charts for owners and partners who want them; figures fetched on demand, cached at most 30 days; mock figures always labelled "Example" outside the demo workspace.
- Depends on: P0.1-11, P0.3-08.
- Model: Sonnet.
- Done when: the screen renders from the mock module with the "Example" label; no performance figure is stored past 30 days (retention test); search-term counts below Google's threshold show "fewer than 15".
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo rashidhamzy-hue/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.5-05, then docs/KABSI-PROGRESS.md. Do only task P0.5-05. Follow section 2 for checks, merging, proof and the PROGRESS update.
Read K-26 in docs/source/KABSI-AUDIT.md. Never claim a cause for a change. Use the dataviz rules: one simple chart style, readable on a phone.
```

## 12. Wave P0.6: growth, tracking and launch preparation

Goal: everything VIDEO's gate 3 and G-39 tier 1 need before the first ad dollar, plus Nora in sync and a staff view of system health. Most of this wave can run in parallel with P0.5.

Done when (wave): the consent banner works by country with stored proof; PageView, ViewContent, CompleteRegistration, GoogleAccessGranted, Schedule and Purchase arrive in Meta's Test Events deduplicated; `/meta` shows the hero in under 2.5 s on a mid-range phone; Nora passes her evaluation; the platform checks in K-118 are green.

### P0.6-01 Consent banner and proof of consent

- Decisions: G-18, G-21, R-04, G-14 (PostHog without cookies before consent), VIDEO Part 7 consent line.
- Touches: a small banner component and `consent_records` (anonymous visitor id or user, country, rule applied, choices, exact wording and version, page, time); rules: opt-in before advertising tags in the UK, EU, EEA, UAE and Saudi Arabia; UK analytics allowed first-party and aggregate-only with notice and opt-out; notice and opt-out elsewhere; country from Cloudflare's `cf-ipcountry` on kabsi.co (proxied), browser time zone as fallback; the Meta Pixel never loads before consent where opt-in applies; PostHog runs cookieless until consent; the site works fully when declined; a "Privacy choices" link in the footer to reopen it.
- Depends on: P0.1-03.
- Model: Opus (privacy).
- Done when: with a UK country header, no request to connect.facebook.net happens before accepting (network log or a Playwright test); declining leaves the site working; each choice writes one `consent_records` row with the wording version; with a US header the notice shows and the Pixel loads.
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo rashidhamzy-hue/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.6-01, then docs/KABSI-PROGRESS.md. Do only task P0.6-01. Follow section 2 for checks, merging, proof and the PROGRESS update.
Read G-18 to G-21 in docs/source/KABSI-GROWTH.md and R-04. Build the banner and the records table; no third-party consent tool. English only at launch.
```

### P0.6-02 Product events, attribution and onboarding funnel

- Decisions: G-31, G-32, G-44, G-28, K-55, K-76, K-118 (PostHog row), R-16, D219.
- Touches: `src/lib/telemetry.ts` and server-side event sender; event names from G-31 and G-44 exactly (landing_viewed, business_found, snapshot_viewed, registration_completed with method, connect_started with route, profile_state_seen, setup_call_booked, google_access_granted with route and minutes since sign-up, details_confirmed, reply_draft_ready, reply_approved with edited, seconds_to_approve and channel, reply_published, backlog_cleared, profile_change_decided, photo_published, post_published, weekly_report_opened, trial_converted, payment_failed, subscription_paused, subscription_cancelled); server-side events for access, publication and payment never inferred from the browser; first-touch and last-touch UTMs, `fbclid`, `fbp` and `fbc` saved on the user at sign-up server-side; partner and referral links set a first-party cookie for 90 days and are written to the business at sign-up; autocapture off inside the app; session replay off in the app; PostHog through a proxy on a Kabsi subdomain (for example `e.kabsi.co`, a Cloudflare Worker route); properties never include review text, names or emails; demo businesses never send events.
- Depends on: P0.6-01, P0.4-02.
- Model: Sonnet.
- Done when: a full mock sign-up to access run shows each event once in PostHog with the right properties (event list from PostHog in PROGRESS); the user row carries both touches and the click IDs; ad-blocker test: events still arrive through the proxy.
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo rashidhamzy-hue/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.6-02, then docs/KABSI-PROGRESS.md. Do only task P0.6-02. Follow section 2 for checks, merging, proof and the PROGRESS update.
Read G-28, G-31, G-32 and G-44 in docs/source/KABSI-GROWTH.md. One name per action; the Meta names come in P0.6-03 from the G-47 table. Use the PostHog connector to confirm events arrive.
```

### P0.6-03 Meta Pixel and Conversions API with one event ledger

- Decisions: G-19, G-47 (architecture and the name table), G-42, VIDEO Part 7 events list, K-118 (least-access system user), guardrail 0.7.
- Touches: browser Pixel on public pages only after consent (PageView, ViewContent on `/meta`); `meta_events` ledger keyed by business, event type and source event so retries never mint a new ID; Edge Function `meta-capi` sending CompleteRegistration (browser and server, shared event ID created in the browser and stored with the funnel record), GoogleAccessGranted (server, custom event, when backend confirms working access), Schedule (setup call booked, from the Calendly widget's browser message plus server), Purchase (server, after Creem confirms, value and currency, monthly and yearly distinguished; refunds corrected); payload with hashed email where consent allows, external ID, `fbp`, `fbc`, source URL, action source website; access token and dataset ID only in Supabase secrets (`META_CAPI_TOKEN`, `META_DATASET_ID`); never review text, Google data, tokens or Business Knowledge; demo and internal testers excluded.
- Depends on: P0.6-02, P0.6-09 (dataset and system user exist), P0.4-07 for Purchase (ship the rest first if Creem waits on D1).
- Model: Opus (secrets and personal data).
- Done when: each event shows in Events Manager Test Events as received, processed and deduplicated (screenshots or the Test Events code run recorded); a retried server send reuses the event ID (test); Event Match Quality noted for CompleteRegistration.
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo rashidhamzy-hue/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.6-03, then docs/KABSI-PROGRESS.md. Do only task P0.6-03. Follow section 2 for checks, merging, proof and the PROGRESS update.
Read G-19 and G-47 in docs/source/KABSI-GROWTH.md and Part 7 of docs/source/KABSI-VIDEO.md. Check PROGRESS that Rashid created the Kabsi dataset and the "Kabsi CAPI" system user and put the token in Supabase secrets; if not, stop and ask. Use Meta's Test Events code for every check.
```

### P0.6-04 The /meta landing page

- Decisions: G-26, design review "Meta landing page", K-110, R-02, VIDEO "Make the click convert", G-12 speed target.
- Touches: route `/meta` (noindex) with five sections and nothing else: hero repeating the Reel's hook by `?angle=` (reviews, profile-changes, approval, or a trade), the K-110 explanation line, the CSS and SVG approval-card animation (under 60 KB, plays twice then rests), the price visible without scrolling, the R-02 button and "14 days free. No card. $19 a month after." only after the launch gate; how it works in 3 steps; four plain cards (Your reviews, Your details, Your posts and photos, Your week); trust (you approve everything, not affiliated with Google, free setup call, cancel any time); five FAQs and the final button; a sticky button bar on phones after the first scroll; W1 poster that loads the player only on tap; no menu, no comparison, no guide links.
- Depends on: P0.1-05, P0.6-01.
- Model: Sonnet.
- Done when: Lighthouse mobile on `/meta` shows LCP under 2.5 s (report saved); each angle changes only the hero and first proof section; Meta's Sharing Debugger reads the right title and image (Rashid or the chat records it).
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo rashidhamzy-hue/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.6-04, then docs/KABSI-PROGRESS.md. Do only task P0.6-04. Follow section 2 for checks, merging, proof and the PROGRESS update.
Read G-26 and the "Meta landing page" bullet in docs/source/KABSI-DESIGN.md. No 3D, no carousel, no autoplay. Use the shared components and tokens.
```

### P0.6-05 Security headers, Turnstile everywhere, rate limits

- Decisions: G-15, G-16, K-42, K-100 (email-code limits if not done in P0.4-02), K-118 (Cloudflare row).
- Touches: response headers on kabsi.co (Cloudflare Transform Rules if Lovable hosting cannot set them): HSTS, nosniff, Referrer-Policy, Permissions-Policy, CSP with `frame-ancestors 'none'` and the allow list (Meta, PostHog proxy, Sentry ingest, Turnstile, the Supabase project including websockets, Kabsi domains) in report-only mode with reports to Sentry; Turnstile with server checks on sign-up, login, both free tools, the partner form, the contact form and Nora's public tools; 10 requests a minute per IP on free-tool endpoints; Cloudflare managed rules and bot protection on; WAF; never cache app pages or API responses.
- Depends on: P0.1-03, P0.4-01.
- Model: Opus (security).
- Done when: `curl -sI https://kabsi.co` shows each header; CSP reports arrive in Sentry for a deliberate violation; a free-tool call without a token gets 400; a burst of 15 requests in a minute gets 429. Enforcing the CSP is a follow-up after 14 clean days (listed in PROGRESS with the date).
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo rashidhamzy-hue/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.6-05, then docs/KABSI-PROGRESS.md. Do only task P0.6-05. Follow section 2 for checks, merging, proof and the PROGRESS update.
Read G-15 and G-16 in docs/source/KABSI-GROWTH.md. First find out whether Lovable hosting lets you set headers on kabsi.co; if not, write the Cloudflare rules and give Rashid the exact steps. Start the CSP in report-only mode.
```

### P0.6-06 Nora in sync: facts file, handover and evaluation

- Decisions: K-104, K-58, K-51, K-111 (rules), K-114.3 (never delete a duplicate), K-88 (reply promise), K-119, R-13.
- Touches: `knowledge/kabsi-facts.md` rewritten as the single list of facts Nora may state (prices, trial rules, onboarding routes and scenarios, the booking link with its three versions, support email, policies, the claims list, retention in plain words, eligibility, disconnect, what Kabsi never asks for); Nora answers product questions only from it and account questions only from live tools; handover rules (asks for a person, stuck, upset, unknown) offering the call with the right preselected answer, the support email, and "Write to hello@kabsi.co and we'll reply today" for urgent problems; any "delete" question gets the never-delete warning first; a 60-question evaluation (English first, then Spanish, French and Arabic for the questions owners write in) run in CI on every change to the facts file or Nora's prompt and blocking the merge on any contradiction; weekly list of unanswered questions for review.
- Depends on: P0.3-05 (list_tasks), P0.1-V3.
- Model: Opus (Nora's facts and safety).
- Done when: the evaluation passes with zero honesty failures (score in PROGRESS); a changed price in the facts file without updating the evaluation fails CI; Nora never states a fact absent from the file in the evaluation run.
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo rashidhamzy-hue/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.6-06, then docs/KABSI-PROGRESS.md. Do only task P0.6-06. Follow section 2 for checks, merging, proof and the PROGRESS update.
Read K-58, K-104 and K-111 in docs/source/KABSI-AUDIT.md. Every fact in the file must be true of the system on main today; anything not live is written as not available yet. Nora never asks for a password or a code.
```

### P0.6-07 Honest proof pages: founder note, About, Security

- Decisions: design review "Proof without customers" and "Other public pages" (About, Security), K-105 (Rashid by name and role, Kabsi's mark, no photo on partner surfaces), guardrail 23, G-39 tier 1.
- Touches: `about.tsx` (who runs Kabsi, why it exists, how to reach a person, the sign-off line), `security.tsx` lead (no password ever, Manager access you can remove, nothing posted without you, then what exists today: 30-day Google data, encryption, Advanced Protection on Kabsi's Google account), a short founder note block on the homepage, W4 slot on About.
- Depends on: P0.2-07.
- Model: Sonnet.
- Ask Rashid before: whether the founder note uses his photo (the design review suggests it for the owner site; K-105 says no photo for partner surfaces).
- Done when: every claim on the three pages is true today (checked line by line against the facts file, list in PROGRESS); no testimonial, logo wall or number that is not Kabsi's own.
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo rashidhamzy-hue/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.6-07, then docs/KABSI-PROGRESS.md. Do only task P0.6-07. Follow section 2 for checks, merging, proof and the PROGRESS update.
Ask Rashid one question: photo on the founder note, yes or no. Then write the pages from the design review's guidance, true today, no invented proof.
```

### P0.6-08 Supporting platforms checked against K-118

- Decisions: K-118, K-87 (status page, secrets inventory, second admins), G-22, R-03, D263.
- Touches (through the connectors where they exist, otherwise exact steps for Rashid): Resend (both subdomains verified, DMARC `p=none` with reports, Google Postmaster Tools for both, bounce and complaint webhook from P0.4-08, reply-to hello@kabsi.co); Sentry (release tags on web and functions, scrubbing on, alerts to #kabsi-alerts for new errors, spikes and failed publications); PostHog (data region recorded in the privacy page, autocapture off in the app); UptimeRobot (1-minute checks on the site, the app, a new `health/queue` endpoint that fails when the oldest pending job is older than 10 minutes, `go.kabsi.co/_check`, the Creem and Meta webhook endpoints) and a public status page at `status.kabsi.co`; Slack (map the six existing channels to K-118's alerts, signups and access, payments, support, ads); a secrets inventory document listing every secret's owner, location and rotation date (names only, never values) at `docs/secrets-inventory.md`; second trusted admin on each platform (Rashid's step).
- Depends on: P0.4-08, P0.1-12b.
- Model: Sonnet.
- Done when: a table in PROGRESS lists each platform row of K-118 as done, Rashid step pending, or not possible, with evidence (connector output); the status page URL answers; the queue health check turns red when a test job is held.
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo rashidhamzy-hue/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.6-08, then docs/KABSI-PROGRESS.md. Do only task P0.6-08. Follow section 2 for checks, merging, proof and the PROGRESS update.
Read K-87 and K-118 in docs/source/KABSI-AUDIT.md. Use the Resend, Sentry, PostHog, UptimeRobot and Slack connectors to check and fix what they allow; list exact steps for Rashid for the rest. Never write a secret value anywhere.
```

### P0.6-09 Meta account fixes (VIDEO Part 7)

- Decisions: VIDEO Part 7 "Meta account: current state and fixes" and "Before the first dollar", K-87 (second admin), G-47.
- Touches: `docs/marketing/meta-setup.md` with the exact clicks for each fix: confirm the contact email; business info and Business Verification after D1; second admin with two-factor; payment method, billing address and an account spending limit equal to the month's budget (keep USD and Beirut time); connect the Page and Instagram to the ad account and check Instagram is linked to the Page; create the "Kabsi Website" dataset and connect it to the ad account; move the Revelo and Cedar Spark datasets out (or stop using them in this portfolio); add kabsi.co under Domains and verify with a DNS TXT record in Cloudflare; create the "Kabsi" asset group and assign people to it; create the least-access system user "Kabsi CAPI" with access only to the dataset (and the ad account if needed), generate its token and store it as the Supabase secret `META_CAPI_TOKEN`, and the dataset ID as `META_DATASET_ID`; the custom audiences in Part 7 (created once events flow); Instagram and Facebook bios (K-112 wording: "Reviews and listing care for local businesses. Works with Google Business Profile."); the URL template for ads.
- Depends on: P0.1-03 (domain). Business info and verification use Hussein Slim's details (D1, R-25) once Rashid step 8 is confirmed.
- Model: Sonnet.
- Done when: the setup file exists; Rashid ticks each step; the chat verifies what it can (the TXT record with `dig`, the secrets' presence by name through the Supabase connector, events in Test Events once P0.6-03 runs).
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo rashidhamzy-hue/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.6-09, then docs/KABSI-PROGRESS.md. Do only task P0.6-09. Follow section 2 for checks, merging, proof and the PROGRESS update.
Read Part 7 of docs/source/KABSI-VIDEO.md. Write the step list for Rashid in plain words, one action per line, then verify each step he reports done with the tools you have. Business info and verification use Hussein Slim's details (R-25); mark them waiting until Rashid step 8 is confirmed.
```

### P0.6-10 WhatsApp click-to-chat on the US number

- Decisions: K-121, K-103, G-36, K-57.
- Touches: `WHATSAPP_NUMBER` in `src/lib/site.ts` replacing `CONTACT_PHONE` for support, a `wa.me` link with a short prefilled message on the contact page, footer, `/setup-call`, Nora's handover and support emails; the WhatsApp Business app profile text and quick replies written for Rashid in `docs/marketing/whatsapp-setup.md` (greeting, away message, quick replies: how to add Kabsi as Manager, the booking link with each answer, prices and trial, how to disconnect, "We never ask for your Google password or codes", labels); Lebanon field contact kept only on `/lebanon` if Rashid wants it.
- Depends on: P0.1-03. Uses the I1 placeholder number until the US number arrives.
- Model: Sonnet.
- Done when: each placement opens WhatsApp with the prefilled text (URLs tested); no page shows the old number except `/lebanon` if kept; the setup file exists.
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo rashidhamzy-hue/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.6-10, then docs/KABSI-PROGRESS.md. Do only task P0.6-10. Follow section 2 for checks, merging, proof and the PROGRESS update.
Use one WHATSAPP_NUMBER constant set to the I1 placeholder (+961 3 956 917) so the US number is a one-line swap later. Keep the Lebanese number on /lebanon. WhatsApp here is people-answered only; it approves nothing.
```

### P0.6-11 Staff system health page

- Decisions: K-44 (staff part), K-36, K-35, guardrail 10.
- Touches: `/staff` System health: Google API errors by type, quota use, sync lag per business, failed and stuck publications (including `checking` older than an hour), dead-letter jobs with retry and cancel, photo processing failures, email and notification delivery, access errors, circuit breaker state; per-business diagnostics with technical detail and never credentials.
- Depends on: P0.1-13b, P0.5-01.
- Model: Sonnet.
- Done when: a forced dead job, a stuck `checking` publication and an open breaker each appear on the page (tests or SQL setup recorded); retry from the page moves a dead job back to pending.
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo rashidhamzy-hue/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.6-11, then docs/KABSI-PROGRESS.md. Do only task P0.6-11. Follow section 2 for checks, merging, proof and the PROGRESS update.
Read K-44 in docs/source/KABSI-AUDIT.md. Staff only; owners see plain messages, never this page.
```

## 13. Wave P0.7: Google go-live and the launch gate

Goal: the day Google grants access (quota "Requests per minute" reads 300 on the Business Profile APIs), capture real responses, prove the loop on Kabsi's own profile, switch to live, and pass the guardrail 22 launch gate with the first real customer. Only then do the CTA and the ads change.

Gate A has no fixed date. P0.7-01 and P0.7-02 run the day it arrives, even if P0.3 to P0.6 are still in progress; P0.7-04 onward wait for P0.1 to P0.5.

If Google refuses or says nothing by 31 October 2026: K-86 applies. Reapply with the stated reason fixed, follow up through the support form every two weeks, keep concierge (20 at most), and never scrape, automate a browser inside owners' Google accounts or use unofficial APIs. The planning chat reviews the plan if this happens.

### P0.7-01 Gate A day: capture real responses

- Decisions: K-34 (record real responses), K-56, K-116 and K-117 items marked with a dagger, K-82 (chat and social attribute names), K-41 open risk (can a Manager remove itself), K-37 open risk (Pub/Sub for group-held locations), D293 (API side of the group flow).
- Touches: read-only calls with hello@kabsi.co's credential against Yawmiyati and Abou Hamze Auto Center (with Rashid's consent): accounts and invitations (what an invitation exposes, the invited role), location read with every field mask, getGoogleUpdated, reviews list with reply state and moderation fields, media list, performance and search keywords, attributes metadata for the category and country, place action links, verification state; responses saved, with personal data removed, as fixtures in `tests/fixtures/google/live/`; a short findings note answering each dagger item.
- Depends on: Gate A; P0.1-11.
- Ask Rashid before: the first live call (confirm the quota reads 300 and the businesses to read).
- Model: Opus (Google access).
- Done when: each module has at least one real fixture; mocks are updated where real shapes differ, with tests passing against both; the findings note answers: does an invitation expose the role, can a Manager remove its own access through the admins API, which attribute names hold the chat and social links, can products be written, does moderation state appear on replies; nothing was written to Google.
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo rashidhamzy-hue/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.7-01, then docs/KABSI-PROGRESS.md. Do only task P0.7-01. Follow section 2 for checks, merging, proof and the PROGRESS update.
Read-only: no write call of any kind. Ask Rashid to confirm the quota reads 300 and which profiles to read. Strip reviewer names, review text and phone numbers from fixtures before committing.
```

### P0.7-02 business.manage verification package

- Decisions: K-113.6, K-92, K-99.2.
- Touches: `docs/google/business-manage-verification.md`: the scope justification (the token is used once to invite Kabsi's business group as Manager and is then revoked; no refresh tokens kept; Google data never used for advertising or AI model training), the demo video script showing the address bar with the OAuth client ID, the consent screen and the Manager invitation (recorded by Rashid on the demo flow once P1-18 exists in a test build, or on a staging route), the privacy page link with the Limited Use sentence (live since P0.2-07), and the exact Cloud Console steps to submit.
- Depends on: Gate A, P0.2-07.
- Model: Opus.
- Done when: the package file is complete; Rashid submits it (date in PROGRESS); answers from Google are tracked in PROGRESS.
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo rashidhamzy-hue/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.7-02, then docs/KABSI-PROGRESS.md. Do only task P0.7-02. Follow section 2 for checks, merging, proof and the PROGRESS update.
Read K-92 and K-113 point 6. Write the package and the step list for Rashid; confirm kabsi.co/privacy carries the Limited Use sentence word for word before he submits.
```

### P0.7-03 Google notifications through Pub/Sub

- Decisions: K-37, D250 (daily reconciliation stays).
- Touches: Pub/Sub topic and push subscription in project smiling-chess-505915-b7 (Rashid's console steps, or gcloud if he grants access), Edge Function `google-events` verifying the push token (OIDC issuer, audience, service account), mapping new review, updated review, Google update, location state change and new media into jobs (never writing data directly); notification settings turned on for the Kabsi account and the client group; daily reconciliation kept.
- Depends on: P0.7-01, P0.1-12b.
- Model: Opus.
- Done when: a real new review on Yawmiyati produces a job within a minute; a forged push without a valid token is refused (test); the reconciliation still runs daily.
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo rashidhamzy-hue/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.7-03, then docs/KABSI-PROGRESS.md. Do only task P0.7-03. Follow section 2 for checks, merging, proof and the PROGRESS update.
Read K-37. Events only enqueue jobs. Give Rashid the console steps for the topic and subscription if you cannot create them, then verify with a real event.
```

### P0.7-04 The switch to live

- Decisions: K-56, K-87 (Supabase Pro, point-in-time recovery, monthly restore test), D279, A13.
- Touches: delete mock rows (`mock_listings`, `mock_google_reviews`) and every test account and business listed in PROGRESS "Test data" (QA Bakery and its owner, QA Partner and the test invite, Safa Chicken and tarikhtube@gmail.com, the gmail.co typo account, Nora test chats, Yawmiyati's overlapping test plans and payments, test photos); keep Yawmiyati and the demo workspace; re-read every connected business from Google and ask owners to confirm their baseline; `GOOGLE_MODE` secret and `app_settings.google_mode` to live; Supabase Pro with point-in-time recovery and a first restore test into a scratch project.
- Depends on: P0.7-01, P0.1 to P0.5 done.
- Ask Rashid before: the deletions (show the exact list and row counts) and the Supabase Pro upgrade ($25 a month).
- Model: Opus.
- Done when: the deletion counts match the shown list; no mock row remains; `google_mode()` returns live; a restore test succeeded (project and time recorded); the permanent demo login still works on mock (R-17).
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo rashidhamzy-hue/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.7-04, then docs/KABSI-PROGRESS.md. Do only task P0.7-04. Follow section 2 for checks, merging, proof and the PROGRESS update.
Read K-56 and K-87. Build the deletion list with row counts and show it to Rashid; delete nothing until he says yes. Then flip to live and run the checks.
```

### P0.7-05 Internal live test on Kabsi's own profiles

- Decisions: K-85, K-99.6, K-67, K-66, K-41 (self-removal), K-117 (search terms in the report).
- Touches: full onboarding on Yawmiyati (internal only, never in public material) and, with Rashid's consent, Abou Hamze Auto Center; expected results: tasks for description, cover photo, opening date, special and extra hours; the recognised Google name update with "Google is right" recommended; video view figures in Insights; "sounds like you" voice rules proposed from past replies read live and only confirmed rules stored; backlog drafted; one real reply approved and verified; disconnect and reconnect tested.
- Depends on: P0.7-04.
- Model: Opus (live Google).
- Done when: each expected result happened (evidence per line); a real reply is live on Google with `verified` in the pipeline; disconnect removed Kabsi's access through the API (or the staff follow-up worked).
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo rashidhamzy-hue/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.7-05, then docs/KABSI-PROGRESS.md. Do only task P0.7-05. Follow section 2 for checks, merging, proof and the PROGRESS update.
Read K-67, K-85 and K-117. Every write to Google needs Rashid's own approval in the app, as for any owner. If a detector misses an expected result, record it as a blocker; detectors are not ready until they pass.
```

### P0.7-06 Page-by-page audit, contradiction sweep and the test matrix

- Decisions: guardrails 21, 24 and 25, K-47, K-54 (manual checks).
- Touches: walk every authenticated screen as an owner, a manager, a staff member and a partner member, on 390 px and desktop: login, onboarding, Home, Reviews, review detail, Get Reviews, Google Profile, Content, Insights, Business Knowledge, tasks, team, notifications, Settings, billing, Google connection, help and Nora, partner view; every empty, loading, error, success and permission-denied state; disconnected Google, expired session, failed publication, failed verification; a repository-wide search for stale language (Profile Score, Do now, Listing Shield, Put mine back, old prices, "coming soon" where a feature exists, ownership language, ranking promises, test accounts outside the demo); the manual checks in K-54 (iPhone Safari, Android Chrome, slow network, revoked access, closing the approval screen mid-publish, double tap, partial failure).
- Depends on: P0.7-05.
- Model: Sonnet for the walk; any fix that touches access rules goes to a separate Opus task.
- Done when: a checklist in PROGRESS with every screen and state marked pass or with an issue and its fix task; the stale-language search returns nothing.
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo rashidhamzy-hue/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.7-06, then docs/KABSI-PROGRESS.md. Do only task P0.7-06. Follow section 2 for checks, merging, proof and the PROGRESS update.
Read guardrails 21, 24 and 25. Record every finding; fix only copy and layout issues in this task and open new PROGRESS items for anything else.
```

### P0.7-07 First real customer end to end, and the launch gate

- Decisions: guardrail 22, guardrail 27, G-39 tier 1, VIDEO "Read first" gates, R-02, D2.
- Touches: with the first real customer (D2, written consent): business discovery, snapshot, sign-up, Google access, knowledge, first value, review draft, owner approval, publication, verification, audit event, notification, weekly report, billing (Creem checkout on a phone), disconnect including Manager access removal; success and failure paths (a rejected reply, a failed publication, a revoked access) with real Google responses; then the G-39 tier 1 checklist; then switch the CTA from "Join early access" to "Start free" with "14 days free. No card." everywhere (one constant) and remove "Early access" tags.
- Depends on: P0.7-06, P0.4-07, P0.6 done. D2 is decided: Abou Hamze Auto Center, with the owner's written consent.
- Ask Rashid before: contacting the customer, and before switching the CTA.
- Model: Opus.
- Done when: every step of guardrail 22 has evidence from the real run; every G-39 tier 1 line is ticked or explicitly waived by Rashid; the four VIDEO gates are clear; only then the CTA changes and PROGRESS records "Paid ads may start".
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo rashidhamzy-hue/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.7-07, then docs/KABSI-PROGRESS.md. Do only task P0.7-07. Follow section 2 for checks, merging, proof and the PROGRESS update.
Check PROGRESS for the written consent from Abou Hamze Auto Center and Creem being live. Walk guardrail 22 with real Google responses, record evidence per step, then the G-39 tier 1 list. Ask Rashid before changing the call to action.
```

## 14. P1 tasks

P1 starts when Wave P0.3 is done and never delays a P0 task (guardrail 20). The planning chat orders P1 by what real owners and partners ask for once P0.7-07 has passed; the order below is the default. Each prompt uses the standard opening from section 2.9; only the task-specific line is shown.

| ID | Task | Decisions | Touches | Depends on | Model | Done when |
|---|---|---|---|---|---|---|
| P1-01 | Partner organisation, client onboarding and approval policies; Partners page rewrite for agencies | K-29, K-16 (partner policies), design review "Public Partners page", K-105 | `partner_clients`, partner invite flow (search Places, onboarding link by email or a WhatsApp message the partner sends), seven-step status, nudge; `/partners` page per the design review with "Talk to Rashid" | P0.3-06, P0.4-04 | Opus | A partner adds a client, the client invites Kabsi, answers the five questions and goes active; the client remains owner of record; a partner never sees another partner's clients (database tests) |
| P1-02 | Portfolio dashboard | K-30, design review "Partner dashboard" | `/partner` Portfolio with count tiles and client rows, client view banner with permissions in plain words, one approvals queue across clients with bulk approve where allowed and "Send to client" | P1-01 | Sonnet | 20 test clients on the mock run from one screen; bulk approve publishes only what the partner may approve |
| P1-03 | Partner branding and client reports | K-31, K-62 (no Kabsi branding on partner material) | `partners.brand` (name, logo, colour, reply-to), "Prepared by [Agency] with Kabsi" on client reports and emails, schedules and recipients per client | P1-02, P0.5-04 | Sonnet | A scheduled client report goes out with the agency's logo and no Kabsi credit line on partner prints |
| P1-04 | Referral attribution and commission from the payment webhook | K-32, G-32 (90-day cookie), K-106 (Creem affiliate if it supports 12-month recurring), R-23 | signed opaque partner codes, attribution written at account creation, `partner_commissions` written by the Creem webhook (pending, approved after the refund window, paid, reversed), partner earnings view, retire `kabsi_partner_billing` | P0.4-07, P1-01 | Opus | A test payment from a referred account creates a commission row with no manual step; a refund reverses it |
| P1-05 | Website importer | K-12, K-59 | SSRF-safe fetcher (no private addresses, no off-domain redirects, robots.txt, 20 pages), only the website on the profile or a domain the owner confirms; facts arrive as needs_confirmation in one review screen; comparison task "Your website lists 4 services that are not on your Google profile" | P0.3-01 | Opus | Tests refuse private IPs and redirects off the domain; imported facts are excluded from prompts until confirmed |
| P1-06a | Description, opening date, Google's checklist mirrored | K-22, K-81, K-82 (opening date), K-117.5 | description drafted from verified facts (750 characters, no phone numbers, links, prices, promotions or superlatives), opening date question, tasks mirroring Google's "Complete your Business Profile" prompts with Google's claims attributed | P0.3-05, P0.7-01 | Sonnet | Drafted descriptions pass the rules (tests); each Google prompt read from the real profile becomes one task |
| P1-06b | Services by interview, custom services | K-114.1, K-84, K-117.2 | list services, 3 to 5 questions per service, descriptions under 300 characters naming the service and the real area once, names 2 to 5 words, answers saved as verified facts, written through the Business Information API with approval | P1-06a | Sonnet | A service goes from interview to an approved publication; names over 120 characters or with city lists are refused |
| P1-06c | Attributes in Google's groups | K-83, K-116.11 | attributes read at run time for the category and country, yes or no questions per group, identity attributes only as an optional question with no reminder | P0.7-01 | Sonnet | No identity attribute is ever suggested or preselected (test) |
| P1-06d | More hours, social and chat links, action links, products | K-82, K-117.3, K-117.4 | extra hour types per category under Hours, social links suggested from the confirmed website, WhatsApp chat link where the owner uses it (attribute names from P0.7-01, or a 3-step guide if the API cannot set it), action links through the Place Actions API, products as an assisted task if the API cannot write them | P1-06a | Sonnet | Each field goes through the pipeline or the assisted card, and Protection watches it |
| P1-07 | Installable app and web push | K-69, R-08 | manifest, service worker, push subscription per device, notification opens the approval screen (Android action button opens the confirmation), "Add Kabsi to your home screen" guide | P0.4-09 | Sonnet | A push on Android and on iOS 16.4 or later (home screen) opens the right approval |
| P1-08 | Daily check of the links customers tap | K-71, K-59 fetcher | website, booking, menu, order, social and chat links; two failures in a row create an Urgent task; blocked pages retried with a normal browser profile first | P1-05 | Sonnet | A broken test link produces one task after two failures, not one |
| P1-09a | Monthly and quarterly care routine | K-115 | monthly services and products check and next month's holiday reminders; quarterly completeness check, "Who has access" list read from Google (labels Kabsi, removes nobody), tracked website link suggestion with the UTM tag as a profile change | P0.7-01, P1-06a | Sonnet | Each routine creates its tasks on schedule (time-travel tests) |
| P1-09b | Search terms, photo prompts from search gaps, change detection | K-117.1, K-60, K-26 (change detection) | "How people found you this month" in the report exactly as Google reports it; photo prompts only when Business Knowledge confirms the feature; "This changed" alerts at 25 percent and 20 events over 4 weeks, never a cause | P0.7-01, P0.5-05 | Sonnet | Counts under Google's threshold show as "fewer than 15"; no prompt without a confirmed fact (test) |
| P1-10 | Review themes on request | K-27, K-113.3 | computed in memory when Insights opens, nothing stored, at least 5 reviews per theme, off for partner portfolios | Google's written answer through the data access form (Rashid asks) | Opus | No table, embedding or summary of review text exists (schema check); the feature flag stays off until the answer is on file |
| P1-11 | Get Reviews redesign and the print designer | K-109, K-73, K-25, K-116.9, G-27 | header with link, QR, opens and the one fairness rule; tabs Print, Share, Cards and tags; six formats, three looks from the tokens, approved headlines, the 40-character line with blocked words, print-ready PDF with bleed and crop marks, A4 home sheet, PNG; placements with their own short codes; "Made with kabsi.co" toggle; print kit by email from the free tool | P0.1-05 | Sonnet | Every format exports a PDF that scans (QR checked); a blocked word is refused with the reason |
| P1-12 | Staff two-step sign-in and owner diagnostics | K-42 (TOTP), K-44 (owner messages), D301 | TOTP for staff and partner admins, fresh email code for sensitive actions, plain owner messages for every failure state | P0.6-11 | Opus | Staff cannot open /staff without TOTP (test); each failure state shows its plain message |
| P1-13 | The weekly numbers dashboard | G-33, K-55, K-76, K-63 | one PostHog dashboard with the G-33 list and the K-76 wow measures; unit economics recalculated after the first full month from real usage | P0.6-02 | Sonnet | The dashboard exists and shows last week's numbers; the cost model is updated in PROGRESS |
| P1-14a | Facts page | G-08, K-110 | `/facts`: what Kabsi is, price, countries, languages, what it does and does not do, who runs it, how to reach a person | P0.6-06 | Sonnet | Every line matches the facts file (test that builds both from one source) |
| P1-14b | Comparison pages | G-46, K-113.8, K-50 | "Kabsi vs Google's free Gemini tools in Business Profile", then Birdeye and Podium; fair, dated, sourced, rechecked every quarter; linked from the footer and the facts page only | P1-14a | Sonnet | Every competitor fact has a source and a check date |
| P1-14c | Guides launch set of 10, then one a week | G-45, design review guide template | the 5 existing guides plus verify, suspended, request ownership, lost login, holiday hours; true dates in the page and in Article markup; real screenshots (input I2) | P0.4-04 | Sonnet | Ten guides live with "Checked against Google's help pages on [date]"; scenario screens link their guide |
| P1-14d | Industry pages to the G-06 standard | G-06, D259 | the 8 existing pages rebuilt with trade examples, categories, photo types and rules; a "Trades and home services" page | P1-14c | Sonnet | Each page has the four elements G-06 requires |
| P1-14e | Homepage rebuild | design review "Homepage", K-110 | the 13 sections in the design review (with R-14 replacements), the approval-card animation, the three-ways comparison without names | P0.6-04 | Sonnet | Lighthouse mobile performance at least 90, accessibility 95 |
| P1-15 | Growth loops | K-62, input I3 | "Powered by Kabsi" with a referral link on Free plan QR assets and owner reports, partner audit links with signed codes | P1-04, I3 | Sonnet | A referral reward is applied by the webhook, never for customer reviews |
| P1-16 | "Your year on Google" | K-74 | December one-page summary from the audit log and fresh Google numbers, share image | P0.5-04 | Sonnet | The first edition renders for the demo and a live business by 1 December |
| P1-17 | Short videos through the photo pipeline | K-79 | file checks, metadata removed, quality check, approval, publish where the API allows, view counts in Insights | P0.5-01, P0.7-01 | Sonnet | A test video publishes through the pipeline on a live profile |
| P1-18 | "Connect with Google" route | K-92, K-94 (state from Google) | consent screen once for business.manage, list profiles with role and verification state, invite Kabsi's group as Manager, accept from Kabsi's account, revoke the owner's token, store nothing from it; manual route stays | business.manage verification approved (P0.7-02) | Opus | A test owner connects in one tap; no owner token exists anywhere after the flow (database and logs checked) |
| P1-19 | Speed and caching | G-12, G-13, G-14 | measure LCP, INP and CLS per page type; edge caching for public pages if Lovable hosting allows (else Cloudflare); image formats and sizes; third-party script budget | P0.6-05 | Sonnet | Public pages meet the targets at the 75th percentile in Search Console after 28 days |
| P1-20 | Pricing page rebuild | design review "Pricing page", K-106, K-107 | three columns (Free, Pro, Partner), outcome list, "2 months free" on the toggle, location calculator, guarantee box, card first then other ways in Lebanon, FAQ, Lebanon block by region | P0.4-07 | Sonnet | Prices on the page come from the same constants as Creem products (test) |

Prompt for any P1 task:

```
You are a Kabsi build chat. Work in the GitHub repo rashidhamzy-hue/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the row for task <ID> in section 14, then docs/KABSI-PROGRESS.md. Do only task <ID>. Follow section 2 for checks, merging, proof and the PROGRESS update.
Read the decisions the row names in docs/source/ in full before starting. If the row's "Depends on" is not done in PROGRESS, stop and report.
```

## 15. P2 and Deferred

### P2 (decided after 50 paying customers, from the learning loop)

- Arabic, Spanish and French app, site, emails and guides; Arabic dialect evaluation as a headline (K-75, K-119, G-04, G-07, G-35).
- Automated WhatsApp and SMS notifications and approvals through the WhatsApp Business Platform, through the same approval pipeline; ManyChat for Instagram and Facebook comments and DMs (K-57, K-103, K-121 point 6, G-36). Needs D1 and Meta verification.
- Full white label and custom domains for partners (K-31).
- Grid rank tracking and competitor views from public data, partners only (K-52).
- Menus and action links beyond P1-06d (K-22).
- Multi-location bulk edits and bulk holiday questions across clients (K-30).
- Opt-in automation (for example 5-star reviews with no text), per business, per kind, with a consent record (K-16, K-52).
- A read-only, Kabsi-data-only MCP, only after Google confirms it in writing (K-49).
- Owner referrals beyond P1-15, nearby snapshot in reports (old D286), the monthly AI-answers check (old D287).
- A cheaper "replies only" plan (G-29, after 3 months of retention data).

### Deferred (not planned)

CRM and email or SMS marketing campaigns; review request campaigns to customer lists; social media scheduling; Apple, Bing and Yelp syndication and citations; a giant SEO dashboard on Home; AI-generated photos or images of a business; automatic reversion of Google updates; review gating, incentives, staff quotas and kiosks; Q&A management (API retired); a public API or MCP for Google data; scraping Google or automating a browser inside owners' Google accounts; server-side tag managers and Customer.io (until spend and size justify them); country domains; city pages; a formal testing programme before about 10,000 landing visits a month.

## 16. Video and Meta: Claude's part, and the weekly rhythm

Rashid makes every video himself on the Higgsfield website (not through the connector). Claude's one-time setup is in the plan as tasks:

| Setup item | Task |
|---|---|
| Demo workspace with fictional businesses | P0.1-06 |
| Brand kit text | P0.1-V1 |
| Shot sheets for every video and website video | P0.1-V1, P0.1-V2 |
| Free setup-call and partner-call booking links on the site and in onboarding | P0.1-V3 (site), P0.4-11 (onboarding) |
| Meta tracking (G-47) | P0.6-01, P0.6-02, P0.6-03, P0.6-04 |
| Meta account fixes (VIDEO Part 7) | P0.6-09 |

Changes to the VIDEO calendar from this review (R-10): week 1 uses #4 (education, no product screens), #5 (S03) and #7 (S05) once P0.1-02b and P0.1-06 are done; #3 Meet Kabsi moves to the week S08 is true (after P0.3-07) unless Leah's cutaways use only S01 and S05; #2 waits for Google Protection (P0.2-04) for recording and for go-live for ads; #8 waits for the Weekly Care Report (P0.5-04); #10 waits for the holiday flow (P0.5-03); #14 waits for risk levels (P0.3-03); #15 waits for Nora's facts (P0.6-06). Until the launch gate (P0.7-07), every organic video ends with "Free Google Profile Check at kabsi.co" once P0.4-01 is live, or "Join early access" before that, and carries the "Early access" tag where it shows a feature not yet live (`docs/marketing/feature-truth.md`).

**The weekly rhythm after setup** (in the planning chat, not a build chat):

- Every Friday Rashid brings the week's numbers (organic: non-follower reach, average watched, saves and shares per 1,000 reached; once ads run: the scorecard row per ad from VIDEO Part 8). The planning chat applies the Part 8 rules (pause, winner, scale, refresh), names next week's re-cuts, and writes new hooks: three per video in the next week's slots, under 9 words, each passing the claims table, with the trade named for trade variants.
- The first Friday of each month: what the month taught (message, trade, country), the budget level for next month, and the credit log.
- Day 60 of ads: keep, change or stop Meta against the cost per access-granted business.
- If Rashid wants, a scheduled task can prepare the Friday hook draft automatically once ads run and the Meta data is connected; it is not created now.

Ads start only after P0.7-07 records "Paid ads may start" (the four VIDEO gates and guardrail 0.13).

## 17. Appendix A: system reference (checked 4 Oct 2026)

### Live IDs

| Thing | Value |
|---|---|
| Supabase | project `kabsi-prod`, ref `ynjdqjlmdwjgbfezevxy`, eu-central-1, free plan (Pro before the first paying customer, K-87) |
| Supabase URL | `https://ynjdqjlmdwjgbfezevxy.supabase.co` |
| Lovable | project `2f215f56-0677-42e1-b0d5-838eb32e1c1c`, frontend only, never Lovable Cloud; published at `https://kabsi-app.lovable.app` until P0.1-03 |
| GitHub | `rashidhamzy-hue/kabsi-canvas`, branch `main` synced with Lovable; pushes to `main` deploy every Edge Function and the Worker (`.github/workflows/deploy.yml`); CI on pull requests (`ci.yml`) |
| Cloudflare | zone `kabsi.co` (DNS; Zoho mail records for hello@kabsi.co must never change except merging SPF); Worker `kabsi-go` on `go.kabsi.co` (code in `workers/kabsi-go/`, deployed by the workflow, never connected to app builds); Turnstile site key in `src/lib/site.ts` |
| Google Cloud | project `smiling-chess-505915-b7`; Business Profile API case 1-4624000041157 (Gate A, quota 0 means not approved, 300 approved); OAuth consent screen External, in production, basic scopes; enabled APIs: mybusinessaccountmanagement, mybusinessbusinessinformation, mybusinessnotifications, mybusinessplaceactions, businessprofileperformance, places, places-backend (to disable: section 5, step 3), pubsub, vision |
| Kabsi Google account | `hello@kabsi.co`, Organization account `kabsi.co`, Advanced Protection on; business group "Kabsi Clients", ID `5481006796` (constant `KABSI_GROUP_ID` in `src/lib/site.ts`) |
| Email | Resend, sending from `send.kabsi.co`, reply-to `hello@kabsi.co`; `news.kabsi.co` to add (P0.4-08) |
| Sentry | org `google-nfc-card-dl` (EU, de.sentry.io), projects `kabsi-web`, `kabsi-edge`, `kabsi-go`; polled into Slack every 10 minutes |
| PostHog | US cloud, project 627817 |
| Slack | workspace itskabsi.slack.com; channel IDs in `app_settings.slack_channels` |
| Meta | business portfolio "Kabsi.co", Facebook Page, Instagram @kabsi.co, ad account in USD on Beirut time; fixes in P0.6-09 |
| Calendly | Rashid's free account; event created in P0.1-V3 |
| Models | drafts `claude-sonnet-5-5` with `claude-sonnet-5` fallback, checks `claude-haiku-4-5-20251001` (`_shared/models.ts`, `DRAFT_MODEL` secret overrides) |

### Database today (public schema, 40 tables, RLS on all)

staff, partners, partner_members, partner_invites, locations (3 rows: Yawmiyati, QA Bakery, Safa Chicken; all test or internal), location_members, plans, payments, partner_invoices, usdt_claims, cards (22), taps, card_orders, reviews, reply_drafts, gbp_posts, photos, special_hours, listing_baselines, listing_changes, publications, action_tokens, emails, leads, jobs_log, rate_limits, mock_google_reviews, mock_listings, rating_snapshots, weekly_reports, app_settings, chat_conversations, chat_messages, contacts, ops_events, trial_grants, concierge_tasks, billing_invoices, billing_events, profile_tasks. Five auth users, all test accounts. `app_settings`: google_mode mock, plans_v2 off, nowpayments test, concierge_cap 30 (R-09 sets 20), app_url kabsi-app.lovable.app (P0.1-03 changes it).

Security advisor (4 Oct): 55 SECURITY DEFINER functions executable by signed-in users, `google_mode()` executable by anon, leaked-password protection off, 11 service-only tables with RLS and no policies (intended). P0.1-08 addresses the first three.

### Edge Functions (all ACTIVE, 4 Oct)

api v32, content v25, posts-weekly v21, assistant v19, slack v18, partner v18, lead v23, health v17, review-link v16, site-assets v17, places-search v22, kv-sync v23, tap v23, brand v22, billing v2, cron-tick v24 (a 410 stub). `verify_jwt` false for tap, brand, health, site-assets, slack, billing (see `supabase/config.toml`, D295).

### Scheduled jobs (pg_cron, 4 Oct) and what happens to them

| Job | Schedule (UTC) | Does | Plan |
|---|---|---|---|
| kabsi_cron_tick | every 5 min | `api/cron-tick`: access, sync, draft, notify, Shield | Replaced by the job dispatcher (P0.1-12a, P0.1-12b) |
| kabsi_posts_weekly | every 30 min | weekly post drafts | Fixed in P0.1-04 (no review-derived keywords); replaced by the care routine in P0.5-02 |
| kabsi_plans_expiry | every 5 min | `end_expired_plans()` | Replaced when subscriptions take over (P0.4-06) |
| kabsi_partner_billing | daily 06:10 | monthly wholesale invoices | Bills nothing today; replaced in P1-04 (R-23) |
| kabsi_retention | daily 02:53 | `run_retention()` | Extended in P0.2-01 |
| kabsi_cleanup_action_tokens | daily 03:17 | delete tokens expired 30 days ago | Keep (P0.2-05 shortens token life) |
| kabsi_concierge_daily, kabsi_concierge_overdue | weekdays 05:00, hourly :17 | concierge task digest and overdue alerts | Keep until go-live, then keep for support |
| kabsi_chat_reports, kabsi_chat_retention | every 5 min, daily 03:41 | Nora chat reports, 12-month retention | Keep |
| kabsi_slack_flush, kabsi_slack_digest, kabsi_slack_sentry, kabsi_ops_watchdog, kabsi_ops_events_retention | every min, daily 05:53, every 10 min, every 10 min, daily 04:23 | Slack outbox, digest, Sentry polling, watchdog, retention | Keep |
| kabsi_health_jobs | every 10 min | alerts when no job succeeded in 30 minutes | Keep; P0.6-08 adds queue age |
| kabsi_cleanup_jobs_log, kabsi_cleanup_rate_limits, kabsi_cleanup_http_responses | weekly, hourly, daily | housekeeping | Keep |

There are no Claude scheduled tasks on the account (checked 4 Oct).

### Secrets (names only; values live in Supabase secrets or GitHub Actions secrets)

Supabase: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN, GOOGLE_MODE, PLACES_API_KEY, ANTHROPIC_API_KEY (also saved once as Anthropic_Api; the functions accept both), RESEND_API_KEY, KABSI_TAP_SECRET, CRON_SECRET, CF_API_TOKEN, CF_ACCOUNT_ID, CF_KV_NAMESPACE_ID, PUBSUB_AUDIENCE, SENTRY_DSN_EDGE, SENTRY_AUTH_TOKEN, POSTHOG_KEY, APP_URL, TURNSTILE_SECRET_KEY, NOWPAYMENTS_API_KEY, NOWPAYMENTS_IPN_SECRET, SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET. To add: META_CAPI_TOKEN, META_DATASET_ID (P0.6-09), CREEM keys (P0.4-07). GitHub Actions: SUPABASE_ACCESS_TOKEN, CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID; ANTHROPIC_API_KEY to add for the evaluation job (P0.3-04).

### Working notes that still hold

- Local install: `npm install --registry=https://registry.npmjs.org --legacy-peer-deps` (`bun.lock` points at Lovable's private registry; `package-lock.json` is gitignored).
- Edge Function type-check: `bash scripts/deno-check.sh`. Large functions (assistant) deploy from an esbuild bundle (`scripts/bundle-functions.sh`).
- Repo migration file stamps differ from the stamps applied in the database for the last four migrations; that is expected (the database keeps its own).
- Places: Google replaced the $200 monthly credit with per-product free caps in March 2025; every snapshot costs money past the free tier (K-100).
- Taps from a review link are logged as `nfc` unless opened from the QR (`?s=q`).

## 18. Appendix B: decisions carried forward from the old spec

These older decisions are not contradicted by the six documents and still hold. Everything else in the old spec (D200 to D308) is retired.

| Old | Still true |
|---|---|
| D201, D205 | Stack: Lovable React frontend only, Supabase (Postgres, Auth, Edge Functions, pg_cron, Storage), Cloudflare Worker, Resend, Anthropic, Sentry, PostHog, GitHub. Lovable Cloud is never enabled. |
| D202 | Every Google write needs an approval record in `publications`; no autopilot (now inside R-05's pipeline). |
| D203 (as amended by K-92, K-113) | One central Kabsi Google credential in secrets; no per-owner tokens, ever. |
| D206, D226 | The browser never writes tables directly; database-only steps are membership-checked RPCs, tested; Edge Functions are for external APIs and schedules. |
| D212, D213, D227, D231, D271 | Card codes from `23456789ABCDEFGHJKMNPQRSTUVWXYZ`, every tap goes straight to Google's review page, logging with `ctx.waitUntil`, KV write-through with no expiry, taps deduplicated without storing IPs, the Worker deployed on its own. |
| D225 (amended by K-91) | Email sign-in is a 6-digit code only, never a link. |
| D232 (as tightened by K-14, K-116.4) | Replies: 2 to 4 short sentences, no emoji or slang spellings, gender-neutral, no invented plans or promises, reviewer's language; Franco-Arabic gets simple English with at most one Lebanese word. |
| D235 | Mock mode is visible: a "Test mode" banner while `google_mode` is mock (concierge businesses see the early-access note). |
| D244 | No em or en dashes and no exclamation marks; AI output cleaned by `noDashes()` and the `clean_ai_text` trigger. |
| D251 | Owner-requested deletion of a business with 7 days to cancel. |
| D263 | Slack is the operations hub through the `ops_events` outbox; money is confirmed only on /staff. |
| D265, D266 | Server-side ownership checks on every conversation and session lookup; Sentry and logs scrubbed; ambiguous Google failures never auto-retried. |
| D267 (cap from K-88) | Concierge mode until live access, at most 20 businesses; never billed until a person has posted a real approved reply. |
| D270, D293 | Manager invitations accepted only for the Manager role and a matching consented business; owners invite the "Kabsi Clients" group by ID. |
| D274 (with K-32, K-106) | Partner economics: 30 percent commission for 12 months (40 percent for the first 10 partners), resale at $8 per business a month ($6 founding); partners never promise reviews, ratings or rankings. |
| D290 (with R-20) | The site never claims a company, licence or registration Kabsi does not have. |
| D292 | Rashid may message Instagram accounts that sell NFC review cards, by hand, at most 20 a day; no outreach to business owners. |
| D295, D304 | `supabase/config.toml` is the single source of `verify_jwt`; deploys run from GitHub on push to `main`. |
| D307 | Turnstile on public forms with server-side checks. |
