<!-- Moved verbatim from docs/KABSI-PLAN.md on 24 Oct 2026 (docs diet, master plan 27.12). The index is docs/KABSI-PLAN.md. -->

# Kabsi implementation plan

Version 1, 4 Oct 2026. Written by the planning chat (Opus) from the six source documents in `docs/source/`, checked against the code on `main` (commit 42e7994), the live database `kabsi-prod`, the Edge Functions and the live site.

**Updated 21 Oct 2026 by the planning chat** from Hussein's final product decisions: `docs/source/KABSI-AUDIT.md` K-123 to K-146 (what each overrides is written there), review decisions R-33 to R-40 (section 4), the new Wave P0.8 (section 12A) with the changed and retired cards, the rebuilt bundled sessions (section 7), go to market and the AI agents (section 1, items 28 and 29), and skills, claims and cost rules (section 2.10 to 2.12). Where older text below disagrees, the K-decision, R-decision or card that says it overrides wins.

**Updated 21 Oct 2026 by the lane R chat** (R-41 to R-44, section 4): from 21 Oct 2026 Rashid runs Kabsi and the lane R chat makes every product decision, price and rule; Hussein only holds the Creem account and stays the legal seller. The launch scope is cut (R-42, "After launch" table in section 7), paid calls have a date rule (R-43) and cascade SQL is applied by the session (R-44).

**Updated 22 Oct 2026 by the lane R chat** (R-47 to R-57, section 4): the Places cap, PostHog after first paint, the Kapso account and project, Meta verification not needed to launch, Vercel Pro and Supabase Pro before card payments open, the session list, the Gemini review verdict (section 14) and the Kabsi Outbound option (item 28).

**Updated 23 Oct 2026 by the lane R chat** (R-55b, R-56b and R-58 to R-64, section 4; the waves from 25 Oct, section 7): the master plan is `docs/KABSI-MASTERPLAN.md` (Kabsi runs on WhatsApp, the number is live, staff alerts on WhatsApp, no Arabic shown, one social links constant) and where it disagrees with older text in this file, it wins. Every "Ask Hussein before" and manual step of Hussein's now reads Rashid; Hussein keeps only the Creem account.

**Updated 23 Oct 2026 by the lane R chat, addendum 2** (R-65 and R-66, section 4; master plan sections 18 and 19; the updated waves, section 7): the Gemini review verdict of 23 Oct (suspension and verification alerts, iPhone photo tests, Outbound page reading, Billing skill) and the Ops 1 session (backups, no single point of failure, secrets, privacy rules). Small fixes: number alerts by email go to hello@kabsi.co only (R-32); the facts file's "no WhatsApp number" line changes in session 13b part 1.

**Updated 24 Oct 2026 by the lane R chat, Session 0** (R-67 reserved, R-68 to R-89, section 4; master plan sections 20 to 29; the new order of work, section 7): Kabsi becomes the local visibility and reviews manager (master plan 27), with the website that converts (24), measurement (20), search (21), one design system (22), the two outside reviews (25 and 26), build traps and the repo clean-up (28) and Kabsi Partners with one WhatsApp agent for every kind of person (29). Later sections of the master plan win over earlier ones where they differ (29 over 28 over 27 over everything older), and the master plan wins over older text in this file. The section 4 table now has a status column from R-55 (master plan 25.6). The docs diet (27.12) moves the detail of this file to `docs/plan/archive/`.

This file replaces `docs/WORK-QUEUE.md`, `docs/KABSI-SPEC.md` and `docs/KABSI-STATE.md` as the place a build chat looks for what to do. Progress lives in `docs/KABSI-PROGRESS.md`.

## Contents

1. Guardrails (copied from `docs/source/KABSI-GUARDRAILS.md`, unchanged)
2. Rules for every build chat
3. Sources and precedence
4. Review decisions (R-01 to R-89): where this plan changes or settles the source documents
5. Decisions and inputs (the lane R chat decides, R-41; see the notes at the top of section 5)
6. Classification: every decision as P0, P1, P2 or Deferred
7. Waves, sessions and Wave P0.1: truth and foundations (rewritten 24 Oct 2026)
7A. Wave P0.G: Google go-live (Gate A approved 5 Oct 2026; tasks moved up from P0.7)
8. Wave P0.2: trust and policy
9. Wave P0.3: the core loop
10. Wave P0.4: onboarding, trial and billing
11. Wave P0.5: content and proof
12. Wave P0.6: growth, tracking and launch preparation
12A. Wave P0.8: international, Kabsi Partners and the new features (21 Oct 2026)
13. Wave P0.7: the launch gate
14. P1 tasks
15. P2 and Deferred
16. Video and Meta: Claude's part, and the weekly rhythm
17. Appendix A: system reference (live IDs, functions, jobs, secrets)
18. Appendix B: decisions carried forward from the old spec
