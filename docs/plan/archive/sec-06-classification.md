<!-- Moved verbatim from docs/KABSI-PLAN.md on 24 Oct 2026 (docs diet, master plan 27.12). The index is docs/KABSI-PLAN.md. -->

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
| K-16 roles and approval policies | P0 owner, manager, staff; partner policies retired (K-127) | P0.3-06 |
| K-17 email approvals | P0 | P0.2-05 |
| K-18, K-19, K-20 baseline, Google Protection, change events | P0; one-tap put-back and Pro auto-fix by K-130 | P0.2-03, P0.2-04, P0.8-04 |
| K-21 hours and holidays | P0; holiday concierge by K-131 (asks 5 days before) | P0.5-03 |
| K-22 description, services, attributes | Superseded by K-136 (Profile Coach); the rest P1 | P0.8-09, P1-06a, P1-06b, P1-06d |
| K-23 photo engine | P0 | P0.5-01 |
| K-24 posts and content calendar | P0 | P0.5-02 |
| K-25 Get Reviews rules | P0 (copy and labels; mostly done in the Worker); review link page and staff Send link by K-132, K-133 | P0.1-02b, P0.8-05, P0.8-06 |
| K-26 Insights | P0 headline and tiles (mock until live); P1 change detection | P0.5-05, P1-09 |
| K-27 review themes | Replaced by K-135 "What customers say" (P0, off for real customers until Google answers the data question) | P0.8-08 |
| K-28 Weekly Care Report | P0 | P0.5-04 |
| K-29 to K-32 partner workspace, portfolio, branding, commission | Retired 21 Oct 2026 (K-127); Kabsi Partners replaces them | P0.8-12 |
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
| K-46, K-57 notification engine and channels | P0 email and in-app; WhatsApp owner channel P0 (K-129); other automation P2 | P0.4-09, P0.8-03 |
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
| K-62 growth loops | P1 (needs I3; partner audit links retired by K-127; needs re-scoping) | P1-15 |
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
| K-73, K-109 print designer and print kit | P1 (no card shop, K-125) | P1-11 |
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
| K-89, K-105 setup call and partner call | Setup call P0; partner-call placements retired (K-127) | P0.1-V3, P0.4-11 |
| K-90 video plan | P0 setup | Section 16 |
| K-91 sign-up | P0 | P0.4-02 |
| K-92 Connect with Google route | P1 after business.manage verification | P1-18; package P0.7-02 |
| K-93 manual route | P0 | P0.4-03 |
| K-94 to K-98 diagnosis and scenario screens | P0 | P0.4-04 |
| K-99 six corrections | P0 | See the review in PROGRESS; P0.1-04, P0.7-02, section 5 |
| K-100 cost guardrails | P0 | P0.1-04, P0.2-06, P0.6-05 |
| K-101 trial | P0 | P0.4-06 |
| K-102 email design | P0 | P0.4-08 |
| K-103 WhatsApp, ManyChat, Nora | P0 click-to-chat; owner channel P0 (K-129); ManyChat P2 | P0.6-10, P0.8-03 |
| K-104 Nora in sync | P0 | P0.1-01, P0.6-06 |
| K-106, K-107 Creem, taxes | P0 (needs D1); amended by K-124 (Creem only, no crypto, cash or Lebanon methods), K-125, K-126 (Essentials and Pro) | P0.4-07 |
| K-108 one design system | P0 | P0.1-05 |
| K-110 visual direction, comparison, guides, live-site fixes | P0 fixes; P1 comparison pages and guides | P0.1-02a, P0.1-03, P1-14 |
| K-111 Nora and the call on every onboarding step | P0 | P0.4-11 |
| K-112 slogan | P0 | P0.1-02a, P0.1-02b |
| K-113 Google API compliance | P0 | P0.1-04, P0.2-02, P0.2-07, P0.7-02 |
| K-114 four agency features | P1 (Nora's "never delete" answer P0) | P0.6-06, P1-06 |
| K-115 care routine | P0 daily and weekly; P1 monthly and quarterly | P0.5-04, P1-09 |
| K-116 Google behaviour rules | P0 | P0.1-13a, P0.2-04, P0.5-01, P0.5-02 |
| K-117 search terms, services, links, products, description | Search terms P0 (K-138); description and services in the Coach (K-136); order button P0 (K-137); the rest P1 | P0.5-05, P0.8-09, P0.8-10, P1-06d, P1-09 |
| K-118 platforms and the email set | P0 | P0.6-08, P0.4-08 |
| K-119 English first | P0 (rule) | Every copy task |
| K-120 per-business memory | P0 | P0.3-01, P0.3-02 |
| K-121 WhatsApp number, amended by K-122 | P0 | P0.6-10, P0.6-12 |
| K-122 WhatsApp through Kapso: support now, alerts and Nora later | P0 (support); alerts and Approve moved to P0 by K-129; Nora on WhatsApp P1 | P0.6-10, P0.6-12, P0.8-03, P1-22 |

### Decisions of 21 Oct 2026 (K-123 to K-146)

All P0 unless stated. Each is written in `docs/source/KABSI-AUDIT.md` with what it overrides.

| Decision | Class | Where |
|---|---|---|
| K-123 international, USD, no Lebanon | P0 | P0.8-01 |
| K-124 Creem only; terms under UAE law | P0 | P0.8-01, P0.4-07 |
| K-125 no NFC card sales | P0 | P0.8-01, P1-11 |
| K-126 Essentials and Pro, Pro trial | P0 | P0.4-06, P0.4-07 |
| K-127, K-128 Kabsi Partners and its rules | P0 (opens after live reviews work) | P0.8-01, P0.8-12 |
| K-129 WhatsApp owner channel | P0 | P0.8-03 |
| K-130 put-back and Pro auto-fix | P0 (auto-fix gated by Google's policy check) | P0.8-04 |
| K-131 holiday hours concierge | P0 | P0.5-03 |
| K-132, K-133 review link page, staff Send link | P0 | P0.8-05, P0.8-06 |
| K-134 review graphics | P0 | P0.8-07 |
| K-135 What customers say | P0 (flag off until Google answers) | P0.8-08 |
| K-136 Profile Coach | P0 | P0.8-09 |
| K-137 own order and booking button | P0 | P0.8-10 |
| K-138 search terms report | P0 | P0.5-05 |
| K-139 fake review helper | P0 | P0.8-11 |
| K-140 Website v2 | P0 | P0.8-13 |
| K-141 onboarding in six steps | P0 | P0.4-03, P0.4-05, P0.3-10 |
| K-142 go to market | Rule | Section 1, item 28 |
| K-143 five AI agents | Rule | Section 1, item 29 |
| K-144 claims rule | Rule | Section 2.11 |
| K-145 rejected list | Rule | Section 15 |
| K-146 cost rule and skills | Rule | Sections 2.10 and 2.12 |

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
| G-31, G-32, G-44, G-47 events, attribution, onboarding steps, Meta mapping | P0 (partner cookie is 60 days, last referral wins, K-127) | P0.6-02, P0.6-03, P0.8-12 |
| G-33 weekly numbers dashboard | P1 | P1-13 |
| G-34 experiments | P1 (after traffic) | Section 16 |
| G-36 WhatsApp within the rules | P0 click-to-chat and opt-in (K-129) | P0.6-10, P0.8-03 |
| G-37, G-38, G-43 payments and tax | P0 through Creem (K-106, K-107) | P0.4-07 |
| G-39 launch checklist | P0, merged into the launch gate | P0.7-07 |
| G-40 publish own numbers only | P0 rule | |
| G-41 markets | P0 rule for ads | Section 16 |
| G-42 setup call as a tracked step | P0 | P0.4-11, P0.6-03 |
| G-45 guides programme | P1 | P1-14 |
| G-46 comparison pages | P1 | P1-14 |

**How to read a task.**

Each task lists: the decisions it implements, the files and tables it touches, what it depends on, the model, "Done when" checks Rashid can verify, and the prompt to paste into a new chat. Tasks inside a wave run in the order listed unless "Depends on" says otherwise. Tasks marked "can run in parallel" may share a day with the task before them.
