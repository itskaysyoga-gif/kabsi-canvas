<!-- Moved verbatim from docs/KABSI-PLAN.md on 24 Oct 2026 (docs diet, master plan 27.12). The index is docs/KABSI-PLAN.md. -->

## 1. Guardrails

Copied unchanged from `docs/source/KABSI-GUARDRAILS.md` (headings moved down one level). Where it conflicts with the audit, the audit wins, as the file itself says.

**Amended 21 Oct 2026.** Items 0.2, 0.12, 11, 19, 21 and 25 carry an "Amended" or "Replaced" line that follows K-123 to K-146; items 28 (go to market) and 29 (AI agents) are new. Everything else is unchanged.


These are the standing rules for every build chat. The strategy and product decisions are already set in the Kabsi documents (KABSI-AUDIT.docx K-01 to K-121, KABSI-DESIGN.docx, KABSI-GROWTH.docx G-01 to G-47, KABSI-VIDEO.docx). Do not keep reinventing, expanding or re-scoping the product. Turn the approved decisions into a coherent, production-ready implementation.

This file summarises how to build; it does not add decisions. If anything here conflicts with KABSI-AUDIT.docx, the audit wins.

Capability-based onboarding (section 13) is the one idea here that the audit does not state explicitly. Use it to drive the onboarding questions only where it fits audit decisions K-91 to K-98; it is not a separate system.

### 0. Canonical launch decisions (one place, so no build chat has to choose)

1. **Markets:** one Meta ad set for the US, UK, Canada, Australia, Ireland, New Zealand and Singapore at launch; the UAE as a separately funded test after month 1 (KABSI-VIDEO.docx Part 7, G-41).
2. **Payments:** Creem is the only payment route (K-124), cards only, in US dollars. **Amended 21 Oct 2026:** NOWPayments, USDT, Binance Pay, Whish, OMT and cash are retired; no other processor is built.
3. **Launch ads:** cold #1, #5 and #2 (if profile watching is live; otherwise #6, the printable review card every customer gets); warm retargeting #7.
4. **Campaign:** Advantage+ Leads with Advantage+ audience and placements on; placement quality reviewed weekly.
5. **Landing page:** one `/meta` page, with headline and first proof section varied by an angle parameter (G-26).
6. **Consent:** one geo-aware consent banner: opt-in before advertising tags in the UK, EU and EEA, and by default in the UAE and Saudi Arabia; consent records stored (G-18 to G-21).
7. **Events:** internal PostHog names and Meta names are mapped once in G-47; never two names for one Meta event.
8. **Build order:** Google access and disconnect, the approval and publication pipeline, Business Knowledge, the trial and Creem, consent and events, `/meta`, a real end-to-end test, and only then Meta launch.
9. **Numbers** such as $6.80 per trial, $11 per access-granted business, 12% trial-to-paid or 60% access within 24 hours are starting targets, not evidence; replace them with Kabsi's own data.
10. **Language:** English first everywhere at launch; replies drafted in each reviewer's own language; other languages, Arabic included, are P2 (K-119).
11. **Memory:** each business has its own private memory of verified facts, preferences and decisions; nothing becomes a fact without the owner's confirmation; every draft is checked against it before the owner sees it (K-120).
12. **WhatsApp:** a dedicated US number on the WhatsApp Business app from day 1 for people-answered support and sales; no approvals over WhatsApp until the WhatsApp Business Platform is connected through the same approval pipeline (K-121). **Amended by K-122 (R-29):** the number is Kapso's US number (deleted from Kapso on 22 Oct 2026; `WHATSAPP_NUMBER` is empty until a new number exists), served through Kapso from day 1; later alerts and Nora on WhatsApp go through the same pipeline, and a button opens the kabsi.co approval page. **Amended again by K-129 (21 Oct 2026, R-36):** the number also carries the owner channel: opt-in alerts, "Approve" for low and medium risk replies and weekly posts through the one pipeline with a 10-second undo, and never for high-risk reviews or identity fields.
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

Do not simplify security to make implementation easier. Preserve: tenant isolation, RLS, business and location boundaries, affiliate partners never seeing client data (K-127), authorisation checks, approval requirements, retention controls, secret handling, prompt-injection defences and audit logging.

- A user can never reach another business by changing an ID in a request.
- A partner (an affiliate in Kabsi Partners) has no access to any client's Google profile or data; an agency that manages a client is a Manager invited by the owner (K-127).
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

**Replaced 21 Oct 2026 by K-127.** There is one partner program, Kabsi Partners, for affiliates only: anyone can apply, Rashid approves each, 30% of every payment for the first 12 months of each referred business after a 30-day hold, paid monthly with a $50 minimum, a partner dashboard and a staff screen. No resale, no partner-covered plans, no partner workspaces, no partner approvals. An agency that manages a client's profile is invited by the owner as Manager in Team. Owner product-market fit first, partner scale second. No agency CRM.

### 20. Document completeness is not product completeness

Classify every item before building it:

- **P0:** required for the core product to work safely and credibly.
- **P1:** important for launch quality, can follow the core loop.
- **P2:** useful expansion or optimisation.
- **Deferred:** not needed now.

P2 never blocks P0.

### 21. Final page-by-page audit

Before calling the product launch-ready, walk the whole authenticated experience as a real owner would: login, onboarding, Home, Reviews, review detail, Get Reviews, Google Profile, Content, Insights, About your business, Recommendations, Staff, Notifications, Settings, Billing, Google connection, Help and Nora, the partner dashboard (Kabsi Partners).

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

- **Mock mode** stays until the switch to live in P0.7-04 (Gate A was approved on 5 Oct 2026). Only mock wording that leaks to real owners goes.
- **"Early access"** stays in organic marketing until Gate A (KABSI-VIDEO.docx); remove it after approval.
- **The demo workspace** with fictional businesses is required for video recordings. It stays isolated from real customers and never appears in production marketing as real.

The goal is one coherent product vocabulary.

### 25. Testing

Before declaring completion, run typecheck, lint, tests, build, anonymous-route checks and Edge Function checks. Fix real failures; never suppress them. If a check cannot run in the environment, say so; never claim it passed.

Manually test: 390 px mobile, desktop, the owner, manager and staff roles (R-22 as amended by K-127), the partner dashboard, multiple businesses, multiple locations, disconnected Google, expired or invalid authorisation, failed Google request, retry, duplicate submission, concurrent approval, and unauthorised tenant access.

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

### 28. Go to market (21 Oct 2026, K-142)

In this order, each step waiting for the one before:

1. Finish the build (Waves P0.4 to P0.8 and the launch gate's checks).
2. Run Kabsi live on Kabsi's own profiles (P0.7-05).
3. Win 5 to 10 founding customers from Hussein's network, each with written consent for any quote or name used in marketing.
4. Open Kabsi Partners (K-127) with real proof, not before live reviews work.
5. Start Meta ads only after onboarding converts (the first approval within 10 minutes of access, K-141) and the four gates in KABSI-VIDEO.docx are clear (guardrail 0.13).

**Option after P0.7-07, for the founding customers (R-54, 22 Oct 2026): Kabsi Outbound.** Recorded only; nothing is built for it. Harvey (github.com/ethanplusai/harvey) as a private fork, run only from claude.ai/code as a daily scheduled task. Data from OpenStreetMap and the business's own website only, never Kabsi's Google project, the Places key or the Business Profile API. A separate sending domain and mailbox, never kabsi.co. At most 20 to 30 emails a day and at most one follow-up. Every email is approved by Rashid, names the sender and carries a working unsubscribe that is honoured at once. US first; no UK or EU sole traders without consent; no Lebanon. Kabsi's claims rule (2.11) applies. Kill-gate: after 300 approved emails, fewer than 3 replies that lead to a free check or trial means stop.

### 29. AI agents (21 Oct 2026, K-143)

Five agents. All run as jobs in the task engine (guardrails 5 and 10). None publishes to Google without the owner's approval, except the fields an owner opted in to auto-fix (K-130). An agent never has more authority than the human role it acts for (guardrail 11).

| Agent | Does | Cards |
|---|---|---|
| Reply agent | Drafts review replies from Business Knowledge (built) | P0.3-01 to P0.3-04 |
| Guard agent | Protection: watches fields, one-tap put-back, Pro auto-fix for hours and website | P0.2-04, P0.8-04 |
| Growth agent | Profile Coach, weekly posts, photo nudges, holiday hours, search terms; produces the weekly task plan | P0.8-09, P0.5-01 to P0.5-05 |
| Insights agent | The monthly "What customers say" | P0.8-08 |
| Nora | First-line support and product help in the app and on WhatsApp | P0.6-06, P1-22 |
