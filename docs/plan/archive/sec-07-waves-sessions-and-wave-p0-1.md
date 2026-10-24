<!-- Moved verbatim from docs/KABSI-PLAN.md on 24 Oct 2026 (docs diet, master plan 27.12). The index is docs/KABSI-PLAN.md. -->

## 7. Waves, sessions and Wave P0.1: truth and foundations

Goal: stop every public claim that breaks Google's rules or describes removed features, move kabsi.co to the new build, give the video work a demo workspace, and build the foundations every later wave stands on (tests, tenant model, audit log, Google layer, jobs, one publication pipeline). Owners see only the copy changes.

Done when (wave): kabsi.co serves the new build with K-112 wording; no file in the repo contains a retired product name outside migrations and `docs/source/`; CI runs the database test suite; a double approval publishes once in tests; 500 mock businesses sync inside an hour; every Google call goes through `_shared/google/`.

### Order of work (rewritten 24 Oct 2026; R-84, master plan 27.11, 28.4 and 29.8)

This replaces the bundled sessions and the waves from 25 Oct. Master plan 29.8 wins over 28.4, which wins over 27.11. The old session table is kept below only as the map from card to session number; where the two differ, this section wins.

Parallel rules: at most 2 Opus sessions at once (Max plan usage), plus Sonnet sessions. Two sessions never touch the same area at the same time. Every session merges main into its branch (merge commit, never rebase) and runs the checks again right before its own merge. Each session writes only its own heading in the status page and its own Evidence file. Migrations get a timestamp in the file name, so parallel ones do not clash. AI calls for evaluations come out of the promotional credit; each session reports what it spent. Build sessions test the new data providers (DataForSEO, Gemini) with recorded fixtures and spend live credit only on the one live check each reports (master plan 27.10).

| Step | Session | Model | What it builds | Starts after |
|---|---|---|---|---|
| 1 | Session 0 | Sonnet | Docs only: master plan sections 20 to 29, the decisions in section 4 (R-67 to R-89), this section, the facts lines, then the docs diet (27.12) in its own pull request | first and alone |
| 2 | Clean 1 | Opus | The repo clean-up of master plan 28.9: what is proven unused is removed with evidence, Lovable leftovers (25.10) included | Session 0 has merged both pull requests; alone |
| 3, Wave A | Session 19 rest | Opus | P0.7-05b with the post Undo test (tap the Update's own Approve, not "Approve the month"), P0.7-03 Pub/Sub, N-004, the suspension and verification detection (18.2), docs/GOOGLE-ARCHITECTURE.md (25.2), the pipeline failure-case tests (25.3), the AI safety cases (25.4), structured drafts and the judged evaluation in kabsi-eval (26.1), the evaluation of 50 cases plus every safety, injection and contradiction case, Nora's 60 questions | Clean 1 |
| 3, Wave A | Session 13b part 1 | Opus | The WhatsApp agent: master plan 9.1 to 9.9, 18.2 and 18.3, 25.5 (clarity and the number ladder), the phone_roles table and router of 29.7 from day 1, templates, the 100-conversation suite with partner and staff_admin cases, the live test on Rashid's phone | Clean 1 |
| 3, Wave A | Ops 1 part B | Sonnet | Backups and the restore drill, Sentry and PostHog scrubbing, the privacy page items, the lockfile and SHA pinning of 19.3, branch protection clicks, CI checks (26.6), docs/RUNBOOK.md | Clean 1 |
| 4, Wave B | Session 10 Creem | Opus | billing-creem, prices, checkout, the pricing page and the plan entitlements of 27.4, 18.7 (reads Creem's docs, then the kabsi-billing skill); writes R-67 | Wave A, and CREEM_API_KEY and CREEM_WEBHOOK_SECRET in Supabase |
| 4, Wave B | Growth 1 | Sonnet | Section 20: docs/EVENTS.md, funnels and dashboards, attribution, Meta Pixel and Conversions API, consent, scrubbing | Wave A |
| 4, Wave B | V1 | Opus | Visibility Map, Competitor Watch and the category check (27.3 items 1, 3, 4), map images (28.2), the data-provider and policy checks (27.10), kabsi-data-providers skill | Wave A (it only adds data; it does not touch the WhatsApp or payment paths) |
| 4, in parallel | Lane R chat | | The design system and the mockups (section 22) while V1 runs | Session 0 |
| gate | Core first (28.4) | | V2, V3 and V4 do not start until 13b part 1's live test has passed on Rashid's phone and session 10's test-mode payment has gone through end to end | |
| 5, Wave C | V2 | Sonnet | AI Visibility (27.3 item 2) | the core-first gate and V1 |
| 5, Wave C | V3 | Sonnet | Review Growth and voice notes (27.3 items 5 and 7, 28.3) | the core-first gate |
| 5, Wave C | Session 13b part 2 | Opus | Staff alerts on WhatsApp (9.9, 26.9), Slack removal, payment reminders, Nora's 20 new questions (28.7) | 13b part 1, session 19 rest and session 10 |
| gate | Two Results Reports | | Two in a row on two real profiles (Yawmiyati and Abou Hamze), read in WhatsApp (27.13) | |
| 6, Wave D | V4 | Sonnet | The Results Report and the Free Visibility Scan (27.3 item 6, 27.7, 28.1) | the two-report gate |
| 6, Wave D | Web 2 | Sonnet | Every public route from the approved mockups (sections 22, 24 and 28.8); P0.8-13 is replaced by this | the two-report gate and Rashid's approval of the mockups |
| 6, Wave D | SEO 1 | Sonnet | Section 21 | Web 2 |
| 7, Wave E | UX 1 | Sonnet | The app, /start, settings, notifications and /staff on the design system; the unit economics page (25.8) | Wave D |
| 7, Wave E | Sec 1 | Opus | Tenant isolation, webhooks, disconnect and deletion, no personal data in logs (25.7) | Wave D |
| 7, Wave E | Session 20c | Sonnet | P0.7-06, the page-by-page audit | UX 1 and Sec 1 |
| 7, Wave E | Session 21 | Opus | P0.7-07, the launch gate (master plan 27.13 and 27.14); Vercel Pro and Supabase Pro first (R-51) | Session 20c |
| partners | PA1 Partners core | Opus | The ledger, attribution, payout run, Vault and the staff approval screen (29.8) | session 10 |
| partners | PA2 Partners on WhatsApp | Sonnet | The partner role's tools, apply and approve, Scan a business, templates, partner cases in the suite | 13b part 1's live test and PA1 |
| partners | PA3 Partner pages | Sonnet | /partners, /p/HANDLE, /s/CODE and /partner | Web 2 |
| after launch | Outbound, FD1, ads | Opus for FD1 | Outbound right after the launch gate (27.9); the Front Desk pilot FD1; Click-to-WhatsApp ads once trial to paid is proven | the launch gate |

Gates beyond the table (master plan 27.13 and 29.8): at the launch gate, 10 approved partners with live pages and one test referral tracked from page visit to a test-mode payment and a commission line (if not, launch without partners and switch them on when it passes); the first payout run approved and paid with statements; at 90 days, 20 active partners, partners bringing 20 percent of new trials, and partner trial-to-paid at least the overall rate.

### Cards that leave the launch path (R-42, adjusted)

Each waits for its gate, then runs as its own session under the same rules. Until then its feature shows as coming in the product, on the website and in the facts, with no date. L1 is replaced by PA1 to PA3 (R-89); the Meta Pixel and Conversions API of P0.6-03 are built by Growth 1 (R-68).

| Session | Model | Tasks | Gate |
|---|---|---|---|
| L2 | Opus | P0.6-09 (Meta account fixes), P0.6-04 (/meta landing page) | Onboarding converts |
| L3 | Sonnet | P0.8-08 (What customers say) | The AI credit is on and Google's written answer is on file (R-37) |
| L4 | Opus | P0.8-10 (own order and booking button) | Real Place Actions responses |

### Card map: the numbered sessions (history, kept for the card numbers)

Set by Hussein on 13 Oct 2026, rebuilt on 21 Oct 2026 and cut on 21 Oct 2026 by the lane R chat (R-42), after his final product decisions (R-39, R-40). Sessions 1 to 6 are finished. The order and the waves of the sessions still to run are in the section above; this table only says which cards belong to which numbered session. One build session runs the tasks of one row, in the order written. Rule: one pull request per task (large cards split as their prompts say), merged (CI green, After-merge checks run) before the next task starts. If a session runs low on context it stops after a merge and reports what is left. Rashid's manual items (section 5) are not sessions. Cards named P0.8-xx are in section 12A.

| Session | Model | Tasks | Why here |
|---|---|---|---|
| 1 | Opus | P0.3-01, P0.3-02 | finished |
| 2 | Opus | P0.3-03, P0.3-04 | finished |
| 3 | Opus | P0.3-05, P0.3-06 | finished |
| 4 | Sonnet | P0.3-07, P0.3-08, P0.3-09, P0.3-10, P0.3-11 | finished |
| 5 | Opus | P0.4-02, P0.4-06 | finished |
| 6 | Sonnet | P0.4-09, P0.4-08, P0.4-10 | finished |
| 7 | Opus | P0.8-01 (international and partner cleanup), P0.8-02 (session 6 email fixes and previews) | Billing and access rules; everything after is built on the cleaned model |
| 8 | Sonnet | P0.8-05 (review link page), P0.8-06 (staff Send review link), P0.8-07 (review graphics), P0.8-11 (fake review helper) | Review tools; no live Google |
| 9 | Sonnet | P0.5-05 (Insights and search terms), P0.5-03 (holiday hours concierge), P0.8-09 (Profile Coach), P0.5-04 (Weekly Care Report) | The Growth agent's cards; no live Google; the report comes last so it carries the Coach and search terms |
| 10 | Opus | P0.4-06 (entitlements per plan, amended), P0.4-07 (Creem) | Money; needs Hussein's step 7 |
| 11 | Opus | P0.6-01 (consent banner), P0.6-02 (events and attribution), P0.6-05 (security headers, Turnstile, rate limits) | Consent, events and security before onboarding; the 60-day code and its disclosure sit with consent and events (R-42) |
| 12 | Opus | P0.5-01 (photo engine, video), P0.5-02 (posts) | Google writes and storage access; the WhatsApp photo drop needs it |
| 13 | Opus | P0.8-03 (WhatsApp owner channel), P0.8-04 (Protection put-back and auto-fix) | WhatsApp approvals and Google writes |
| 13b | Opus | WhatsApp go-live: the new Kapso number replaces `KAPSO_API_KEY`, `KAPSO_PHONE_NUMBER_ID` and `KAPSO_CONFIG_ID` and sets `WHATSAPP_NUMBER`; templates submitted (R-49, R-50) | The number was deleted on 22 Oct 2026; nothing live on WhatsApp until it exists |
| 14 | Sonnet | P0.4-03, P0.4-04, P0.4-05, P0.4-11 (onboarding in six steps and the help chip) | Step 4 needs Connect WhatsApp from session 13 |
| 15 | Sonnet | P0.6-06 (Nora in sync), P0.6-08 (supporting platforms), P0.6-11 (staff system health) | Nora learns every new feature last (R-42) |
| 16 | Sonnet | P0.7-01 (the rest, read-only), P0.7-01b (mocks against real responses), P0.7-02 (business.manage package) | Google paperwork; no Google write |
| 17 | | (empty) | P0.6-05 moved to session 11; P0.6-09, P0.6-03, P0.6-04 moved to L2 (R-42) |
| 18 | Opus | P0.7-04 (switch to live), P0.7-05 (internal live test), P0.7-03 (Pub/Sub) | The first Google writes; Hussein approves the deletions |
| 19 | Opus | P0.7-05b (live test of the later features); the fix for N-004 (an empty reply when the model stops at the token limit); the full 200-case reply evaluation and the 60-question Nora evaluation, live, by hand, on the promotional credit that expires 17 Nov 2026 (never in CI) | Google writes on real responses; P0.8-10 moved to L4 (R-42); evaluations run once on the final prompts (R-46, R-52) |
| 20 | Sonnet | P0.8-13 (Website v2) | Just before the launch gate; session 20b (homepage speed, tidy-ups) is finished |
| 20c | Sonnet | P0.7-06 (page-by-page audit) | The audit covers the new site and the 22 Oct copy changes (R-52) |
| 21 | Opus | P0.7-07 (first real customer and the launch gate) | One card by design; Vercel Pro and Supabase Pro first (R-51) |

### Superseded: waves from Sunday 25 Oct 2026 (R-62, kept for reference)

Replaced on 24 Oct 2026 by the order of work above (R-84). Not current.

Set by the lane R chat on 23 Oct 2026 (addendum C). The sessions in the table above keep their numbers; these waves say the order and what may run together.

Parallel rules: at most 2 Opus sessions at once (Max plan usage), plus Sonnet sessions. Two sessions never touch the same area at the same time. Every session merges main into its branch (merge commit, never rebase) and runs the checks again right before its own merge. Each session writes only its own heading in `docs/KABSI-PROGRESS.md`. Migrations get a timestamp in the file name, so parallel ones do not clash. AI calls for evaluations come out of the promotional credit; each session reports what it spent.

- Wave 1, alone: Session 19 PR 0. The master plan, the addendum, R-55b, R-56b, R-58 to R-64, the social links rule, no Arabic shown, the skills (kabsi-skills.zip plus the new ones), `.mcp.json` with context7. Docs and skills only, merged first so every later session reads the same plan.
- Wave 2, in parallel after PR 0 merges:
  - Session 19 rest (Opus): P0.7-05b with the post Undo test (tap the Update's own Approve, not "Approve the month"), P0.7-03 Pub/Sub, N-004, the full live evaluations (200 cases plus Nora 60). Area: Google functions, content and the AI prompts.
  - Session 13b part 1 (Opus): the WhatsApp agent with master plan section 9 and 9.8, webhook, router, phone binding, templates, the 100-conversation suite. Area: the whatsapp function and its tables.
  - Lane R chat: Web 1 mockups in the Design type for Rashid to approve.
- Wave 3:
  - Session 10 Creem (Opus) as soon as `CREEM_API_KEY` and `CREEM_WEBHOOK_SECRET` are in Supabase. Area: billing-creem, prices, checkout, the pricing page.
  - Web 1 (Sonnet) after the mockups are approved. Area: public pages; it leaves the pricing page to session 10 and takes it over after session 10 merges.
  - Session 13b part 2 (Opus) after part 1 and session 19 rest: staff alerts on WhatsApp (master plan section 9.9, R-64), Slack removal, the payment reminders once Creem is in.
- Wave 4: UX 1 (Sonnet), then session 20c audit, then session 21 launch gate, then Outbound.

Updated by addendum 2 (23 Oct 2026, R-65 and R-66, master plan sections 18 and 19):

- Ops 1 part A (Sonnet, 23 Oct, alone): Dependabot security updates, gitleaks in CI, secret scanning, `docs/SECRETS.md`. Area: `.github`, `docs`, `vercel.json` only.
- Wave 2 (in parallel): Session 19 rest (Opus) also builds the suspension and verification detection (master plan 18.2). Session 13b part 1 (Opus) also builds 18.2's owner message and 18.3's photo tests, and changes the facts file's "no WhatsApp number" line.
- Wave 3 (in parallel): Session 10 Creem (Opus) with 18.7 (reads Creem's docs, then writes the billing skill); Web 1 (Sonnet); Ops 1 part B (Sonnet: backups, restore drill, Sentry and PostHog scrubbing, the privacy page items); Session 13b part 2 (Opus) after its part 1.

### Superseded: the After launch table of R-42 (kept for reference)

Replaced on 24 Oct 2026 by the cards that leave the launch path above. L1 (P0.8-12 Kabsi Partners) is replaced by PA1 to PA3; P0.6-03 moves to Growth 1.

These cards leave the launch path. Each waits for its gate, then runs as its own session in the order written, under the same rules as the bundled sessions. Until then their features show as coming in the product, on the website and in `knowledge/kabsi-facts.md`, with no date.

| Session | Model | Tasks | Gate |
|---|---|---|---|
| L1 | Sonnet | P0.8-12 (Kabsi Partners) | Live reviews work and the first founding customers are in (D6) |
| L2 | Opus | P0.6-09 (Meta account fixes), P0.6-03 (Meta Pixel and Conversions API), P0.6-04 (/meta landing page) | Onboarding converts |
| L3 | Sonnet | P0.8-08 (What customers say) | The AI credit is on and Google's written answer is on file (R-37) |
| L4 | Opus | P0.8-10 (own order and booking button) | Real Place Actions responses |

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
You are a Kabsi build chat. Work in the GitHub repo itskaysyoga-gif/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.1-01, then docs/KABSI-PROGRESS.md. Do only task P0.1-01. Follow section 2: apply database changes yourself, open the pull request, make sure CI is green, update PROGRESS on the branch, merge the pull request yourself, run the After-merge checks you can, then give Rashid the PR link and a 3-line summary. Stop and ask only before dropping tables or columns or deleting real data.
Delete the retired docs listed in the task, move docs/KNOWLEDGE-BASE.md to knowledge/kabsi-facts.md with git mv and point scripts/build-kb.mjs at it. Update AGENTS.md. Then update the Lovable project knowledge with set_project_knowledge: keep every existing rule, replace the copy rules with section 2.2 of the plan, and add "use only the design tokens". Do not change any other file.
```

### P0.1-01b Remove leftover references to the retired docs

- Decisions: guardrail 24, K-104, section 3.
- Touches: comments in `src/lib/site.ts`, `src/lib/qr.ts`, `src/lib/telemetry.ts`, `src/routes/privacy.tsx`, `scripts/deno-check.sh`, `.gitignore`; the facts-file line in `CLAUDE.md`; the source line at the top of `knowledge/kabsi-facts.md`; `public/llms-full.txt` (regenerated); delete `docs/WORK-QUEUE.md`.
- Depends on: P0.1-01.
- Model: Sonnet.
- What changes: each comment that cites KABSI-SPEC, KABSI-STATE or a D-number from the old spec cites the plan or the source decision instead (for example "KABSI-SPEC D219" becomes "plan Appendix B and G-14"; "see KABSI-STATE.md notes" becomes "see docs/KABSI-PLAN.md Appendix A, working notes"), or is shortened to the rule itself; `CLAUDE.md` names only `knowledge/kabsi-facts.md`; the facts file's first line reads "Last updated: <date>. Source: docs/source (K and G decisions) and docs/KABSI-PLAN.md." Comments only: no code behaviour changes.
- Done when: `grep -rn "KABSI-SPEC\|KABSI-STATE\|WORK-QUEUE\|KNOWLEDGE-BASE\|GO-LIVE\|VIDEO-PLAN" --exclude-dir=node_modules --exclude-dir=.git .` returns lines only in `docs/source/`, `docs/KABSI-PLAN.md` and `docs/KABSI-PROGRESS.md`; `node scripts/build-kb.mjs` regenerates `public/llms-full.txt` and its first lines match the facts file; `docs/WORK-QUEUE.md` is gone; typecheck, lint, tests and build pass.
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo itskaysyoga-gif/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.1-01b, then docs/KABSI-PROGRESS.md. Do only task P0.1-01b. Follow section 2: apply database changes yourself, open the pull request, make sure CI is green, update PROGRESS on the branch, merge the pull request yourself, run the After-merge checks you can, then give Rashid the PR link and a 3-line summary. Stop and ask only before dropping tables or columns or deleting real data.
Comment and doc changes only. Replace each old-spec reference as described, regenerate public/llms-full.txt with node scripts/build-kb.mjs, delete docs/WORK-QUEUE.md, run the grep in Done when and paste its output in PROGRESS. Also mark P0.1-01 done in PROGRESS (its leftover grep lines are this task).
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
  - Remove the private home address from the footer, terms, privacy and the JSON-LD `streetAddress`. Add `LEGAL_SELLER` to `src/lib/site.ts` and use it for the operator line: "Kabsi is operated by Hussein Slim, Dubai, United Arab Emirates. Contact: hello@kabsi.co" (R-20); privacy names him as the operator with hello@kabsi.co as the contact.
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
You are a Kabsi build chat. Work in the GitHub repo itskaysyoga-gif/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.1-02a, then docs/KABSI-PROGRESS.md. Do only task P0.1-02a. Follow section 2: apply database changes yourself, open the pull request, make sure CI is green, update PROGRESS on the branch, merge the pull request yourself, run the After-merge checks you can, then give Rashid the PR link and a 3-line summary. Stop and ask only before dropping tables or columns or deleting real data.
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
  - typecheck, lint, tests, build and `bash scripts/deno-check.sh` pass. After merge: functions deployed (versions from list_edge_functions).
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo itskaysyoga-gif/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.1-02b, then docs/KABSI-PROGRESS.md. Do only task P0.1-02b. Follow section 2: apply database changes yourself, open the pull request, make sure CI is green, update PROGRESS on the branch, merge the pull request yourself, run the After-merge checks you can, then give Rashid the PR link and a 3-line summary. Stop and ask only before dropping tables or columns or deleting real data.
Copy and label changes in the signed-in app, the email templates and Nora's tool text, exactly as listed. No schema change. Keep URLs. List as After-merge checks in PROGRESS: trigger one mock review on Yawmiyati with staff_mock_review through the Supabase connector and paste the resulting emails row.
```

### P0.1-03 Move hosting to Vercel and switch kabsi.co

- Decisions: R-01, R-28 (hosting moves from Lovable to Vercel), K-110 fix 1 (switch-day steps), G-04, G-05, G-10, G-15, G-16, D268. Hussein created the Vercel account and connected it to GitHub, Supabase and Claude (done); the session works through the Vercel connector.
- Touches, in six parts:
  1. **Vercel config.** A Vercel project for `itskaysyoga-gif/kabsi-canvas`, production branch `main`. `vite.config.ts` stops using `@lovable.dev/vite-tanstack-config` (it builds for Cloudflare) and uses the TanStack Start Vite plugins directly with the Nitro Vercel preset, keeping `src/server.ts` as the SSR error wrapper. `vercel.json` with the install command (`npm install --registry=https://registry.npmjs.org --legacy-peer-deps`), the build command, and the headers and redirects below. One lockfile, the one CI uses. The Cloudflare Worker `kabsi-go` and its deploy workflow stay as they are.
  2. **Remove Lovable-only code and settings.** `src/lib/lovable-error-reporting.ts` and its call in `src/routes/__root.tsx`; the `lovable` host test in `src/lib/telemetry.ts` (preview is `*.vercel.app` now); every `@lovable.dev/*` dependency in `package.json` and the matching line in `bunfig.toml`; the `.lovable/` folder; the Lovable block in `AGENTS.md`; the Lovable lines in `CLAUDE.md`, `README.md`, `supabase/README.md`, `.gitignore`, `.github/workflows/ci.yml` comments and Appendix A of this plan; "Lovable: hosting the website and app" on `/privacy` becomes Vercel (and `knowledge/kabsi-facts.md`, `public/llms-full.txt`). Lovable project knowledge is not edited again; Hussein disconnects the project at the end (step 5 below).
  3. **Environment variables.** Every `VITE_*` and server value the build needs is set in Vercel for Production and Preview. `docs/hosting.md` (new) lists them by name and where each value comes from, never the value. A check fails the build when a required name is missing. Secrets stay in Supabase secrets and GitHub secrets; none appears in code, logs, the pull request or screenshots.
  4. **Preview deployments for every pull request.** Each pull request gets a Vercel preview URL. Previews send `X-Robots-Tag: noindex`, use the same Supabase project, and are in the Supabase Auth redirect list (a wildcard for the team's `vercel.app` previews) so sign-in can be tested on a preview. From now on after-merge visual checks use the preview or the live URL.
  5. **kabsi.co and www on Vercel.** `kabsi.co` and `www.kabsi.co` added to the Vercel project (www redirects to the apex); the Lovable address `kabsi-app.lovable.app` redirects 301 to the same path on `https://kabsi.co` (a host check in `src/server.ts`, harmless on Vercel, plus one last Publish in Lovable by Rashid; if Lovable cannot publish it, PROGRESS says so and the old address stays unlinked and noindex); old kabsi.co URLs that have a new equivalent (`/privacy`, `/terms`, `/pricing`) answer from the new build, the rest return 404.
  6. **Addresses and search, from K-110.** Supabase Auth Site URL `https://kabsi.co` with redirect URLs; Google OAuth consent screen home page, privacy and terms links and authorised domain on kabsi.co (change only the fields Google lists, since branding edits can trigger a re-check); `src/lib/site.ts` (`SITE_URL`), `public/sitemap.xml`, `public/robots.txt`, `public/llms.txt`, `knowledge/kabsi-facts.md` and `public/llms-full.txt`, `workers/kabsi-go/wrangler.jsonc` and the fallback in `workers/kabsi-go/src/index.js` (`APP_ORIGIN`), `supabase/functions/_shared/kabsi.ts` (`APP_URL` fallback), Supabase secret `APP_URL`, `app_settings.app_url`, the canonical helper in `src/lib/site.ts` (strip query parameters), noindex on `/app`, `/partner`, `/staff`, `/start`, `/login`, `/a/*`, `/activate/*`; sitemap resubmitted in Search Console.
- Depends on: P0.1-02a, P0.1-02b, and the Hussein steps below.
- Model: Sonnet.
- **Hussein's manual steps, in plain words** (the session gives them one at a time and waits for "done"):
  1. In Cloudflare, open the `kabsi.co` DNS page and add the records Vercel shows for `kabsi.co` and `www` (set them to "DNS only", the grey cloud). Do not change the Zoho mail records, the `send` records for email, or the `go` record.
  2. In the Supabase dashboard (your own organisation), open Authentication, URL configuration: set Site URL to `https://kabsi.co` and add `https://kabsi.co/**` and the Vercel preview address pattern the session gives you to the redirect list.
  3. In Google Cloud, open the OAuth consent screen and set the home page to `https://kabsi.co`, the privacy link to `https://kabsi.co/privacy`, the terms link to `https://kabsi.co/terms`, and the authorised domain to `kabsi.co`. Change nothing else.
  4. In Search Console, resubmit `https://kabsi.co/sitemap.xml`.
  5. In Lovable, press Publish once after the redirect is merged, then open the project settings and disconnect GitHub.
  6. In Vercel, if the session says a value is missing, paste it into Settings, Environment Variables. Never paste a value into the chat.
- Ask Rashid before: telling them the exact DNS records Vercel shows, and the moment the DNS switches kabsi.co.
- Done when:
  - `curl -sI https://kabsi.co` returns 200 with a Vercel header (`x-vercel-id`) and the HTML title carries the K-112 line; `https://www.kabsi.co` redirects to `https://kabsi.co`; `curl -sI https://kabsi-app.lovable.app/pricing` returns 301 to `https://kabsi.co/pricing`.
  - A new pull request gets a Vercel preview URL that loads, sends `noindex`, and signs in with an email code (the connector's deployment list is pasted in PROGRESS).
  - `grep -rIn -i lovable src package.json vite.config.ts bunfig.toml .github` returns nothing except the redirect host check; `npm run build` passes from a clean clone with the new config.
  - `docs/hosting.md` lists every required environment variable by name; Vercel has each one for Production and Preview (connector read-back by name).
  - `curl -s https://kabsi.co/sitemap.xml` lists only `https://kabsi.co/...` URLs; `robots.txt` names that sitemap and allows Googlebot, OAI-SearchBot, ChatGPT-User and PerplexityBot.
  - Canonical on `/pricing?utm_source=x` is `https://kabsi.co/pricing`.
  - Email sign-in from kabsi.co works end to end (a code arrives and signs in); an email action link opens on kabsi.co.
  - A card tap on `go.kabsi.co/KQA234` still redirects to Google, and an unknown code lands on `https://kabsi.co/activate/...`.
  - Zoho MX, SPF and DKIM records unchanged (compare before and after with `dig`).
  - Hussein has resubmitted the sitemap in Search Console and updated the OAuth consent URLs (both recorded in PROGRESS).
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo itskaysyoga-gif/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.1-03, then docs/KABSI-PROGRESS.md. Do only task P0.1-03. Follow section 2: apply database changes yourself, open the pull request, make sure CI is green, update PROGRESS on the branch, merge the pull request yourself, run the After-merge checks you can, then give Rashid the PR link and a 3-line summary. Stop and ask only before dropping tables or columns or deleting real data.
First record the current DNS for kabsi.co (dig A, AAAA, MX, TXT) in PROGRESS and read the Vercel project through the connector. Do the repository work first (Vercel config, Lovable removal, environment variable list, preview deployments), merge it, and check the preview. Then give Rashid the manual steps from the task section one at a time in plain words and wait for "done" on each. Then change every place that names kabsi-app.lovable.app to https://kabsi.co, add the canonical query-stripping and the noindex list, update APP_URL and app_settings.app_url, and run every Done-when check with curl, dig and the Vercel connector. Never write an environment variable value anywhere.
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
You are a Kabsi build chat. Work in the GitHub repo itskaysyoga-gif/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.1-04, then docs/KABSI-PROGRESS.md. Do only task P0.1-04. Follow section 2: apply database changes yourself, open the pull request, make sure CI is green, update PROGRESS on the branch, merge the pull request yourself, run the After-merge checks you can, then give Rashid the PR link and a 3-line summary. Stop and ask only before dropping tables or columns or deleting real data.
Read K-14, K-100 and K-113 in docs/source/KABSI-AUDIT.md first. Write the Deno tests first, see them fail, then change the code. Apply the ai_usage migration with the Supabase connector before opening the pull request. Keep the existing injection fence and safety check; add, do not loosen.
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
You are a Kabsi build chat. Work in the GitHub repo itskaysyoga-gif/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.1-05, then docs/KABSI-PROGRESS.md. Do only task P0.1-05. Follow section 2: apply database changes yourself, open the pull request, make sure CI is green, update PROGRESS on the branch, merge the pull request yourself, run the After-merge checks you can, then give Rashid the PR link and a 3-line summary. Stop and ask only before dropping tables or columns or deleting real data.
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
You are a Kabsi build chat. Work in the GitHub repo itskaysyoga-gif/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.1-06, then docs/KABSI-PROGRESS.md. Do only task P0.1-06. Follow section 2: apply database changes yourself, open the pull request, make sure CI is green, update PROGRESS on the branch, merge the pull request yourself, run the After-merge checks you can, then give Rashid the PR link and a 3-line summary. Stop and ask only before dropping tables or columns or deleting real data.
Ask Rashid one question first: may the demo login be demo@kabsi.co (he creates the Zoho alias) or should it be a @test.local address. Then add is_demo, the exclusions, the Demo data tag and the seed. Every name, review and number in the seed is invented and international (US-style). Prove isolation with SQL.
```

### P0.1-06c Move the demo login to a kabsi.co address

- Decisions: R-32, R-17, the P0.1-06 demo isolation (`app_settings.demo_login_email`).
- Touches: `app_settings.demo_login_email` (changed from the Gmail address chosen on 4 Oct to `hello+demo@kabsi.co`, which lands in the hello@kabsi.co mailbox and needs no new Zoho alias; any other hello@kabsi.co address is fine if Rashid prefers), the demo user in Supabase Auth, the membership rows that link the demo user to Harbour Lane Coffee and Juniper Hair Studio, `docs/KABSI-PROGRESS.md` (the old address is removed from the log), `supabase/seed/demo.sql` comments. No code change expected: the address lives only in the setting.
- Order that matters: first set `demo_login_email` to the new address (so the first sign-in is already treated as the demo login and sends no Slack or PostHog events); then sign in once with the new address (the code arrives in hello@kabsi.co) or create the user through the connector with the email confirmed; then move the memberships to the new user; then check isolation; then delete the old demo user, which removes a personal address from Kabsi.
- Depends on: P0.1-06.
- Model: Opus (isolation from real data).
- Done when: signing in as the new address shows both demo businesses and the "Demo data" tag; SQL proof as in P0.1-06: no `emails` row for demo businesses has a recipient other than the new address, `ops_events` has no rows for the new user, partner billing ignores them; no table or setting still holds the old address (query result recorded without printing the address); the old demo user is gone.
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo itskaysyoga-gif/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.1-06c, then docs/KABSI-PROGRESS.md. Do only task P0.1-06c. Follow section 2: apply database changes yourself, open the pull request, make sure CI is green, update PROGRESS on the branch, merge the pull request yourself, run the After-merge checks you can, then give Rashid the PR link and a 3-line summary. Stop and ask only before dropping tables or columns or deleting real data.
Small task. Set app_settings.demo_login_email to hello+demo@kabsi.co before anything else, then move the demo user and its memberships, prove isolation with SQL, then delete the old demo user (a demo account, not real data). Never print the old personal address in the pull request, PROGRESS or logs.
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
You are a Kabsi build chat. Work in the GitHub repo itskaysyoga-gif/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.1-V1, then docs/KABSI-PROGRESS.md. Do only task P0.1-V1. Follow section 2: apply database changes yourself, open the pull request, make sure CI is green, update PROGRESS on the branch, merge the pull request yourself, run the After-merge checks you can, then give Rashid the PR link and a 3-line summary. Stop and ask only before dropping tables or columns or deleting real data.
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
You are a Kabsi build chat. Work in the GitHub repo itskaysyoga-gif/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.1-V2, then docs/KABSI-PROGRESS.md. Do only task P0.1-V2. Follow section 2: apply database changes yourself, open the pull request, make sure CI is green, update PROGRESS on the branch, merge the pull request yourself, run the After-merge checks you can, then give Rashid the PR link and a 3-line summary. Stop and ask only before dropping tables or columns or deleting real data.
Use the same format as docs/marketing/shot-sheets/V01.md. Read docs/source/KABSI-VIDEO.md Parts 2 and 3 and the rules section. No code changes.
```

### P0.1-V3 Setup-call and partner-call booking links

- Decisions: K-89, K-105, K-118 (Calendly row), K-104 (three pre-selected answers), G-42 (event wiring comes in P0.6-03).
- Touches: Calendly (connector; free plan, exactly one event type, R-31): one event type "Call with Kabsi", 20 minutes, required question "What's the call about?" with Setting up my Google profile, Partner or agency, Something else, slots in Beirut hours plus a few late-afternoon slots for US East Coast mornings (ask Rashid for his hours). Repo: `src/lib/site.ts` (`BOOKING_URL` with the three prefilled variants), new route `/setup-call` (embedded booking widget, one paragraph "We guide, you click; we never ask for your Google password", support email), links on pricing FAQ, footer ("Book a free setup call", "For agencies: talk to Rashid"), contact and partners pages ("Talk to Rashid" secondary button), the Manager steps page and onboarding access step ("Stuck? Book a free 15-minute setup call"), `knowledge/kabsi-facts.md`.
- Depends on: P0.1-03.
- Model: Sonnet.
- Done when: the Calendly event exists (read back through the connector) with the required question; `/setup-call` renders the widget; each placement link opens Calendly with the right answer preselected (three URLs tested with curl for 200 and recorded); Nora's facts file names the link and the three versions.
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo itskaysyoga-gif/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.1-V3, then docs/KABSI-PROGRESS.md. Do only task P0.1-V3. Follow section 2: apply database changes yourself, open the pull request, make sure CI is green, update PROGRESS on the branch, merge the pull request yourself, run the After-merge checks you can, then give Rashid the PR link and a 3-line summary. Stop and ask only before dropping tables or columns or deleting real data.
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
You are a Kabsi build chat. Work in the GitHub repo itskaysyoga-gif/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.1-07, then docs/KABSI-PROGRESS.md. Do only task P0.1-07. Follow section 2: apply database changes yourself, open the pull request, make sure CI is green, update PROGRESS on the branch, merge the pull request yourself, run the After-merge checks you can, then give Rashid the PR link and a 3-line summary. Stop and ask only before dropping tables or columns or deleting real data.
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
You are a Kabsi build chat. Work in the GitHub repo itskaysyoga-gif/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.1-08, then docs/KABSI-PROGRESS.md. Do only task P0.1-08. Follow section 2: apply database changes yourself, open the pull request, make sure CI is green, update PROGRESS on the branch, merge the pull request yourself, run the After-merge checks you can, then give Rashid the PR link and a 3-line summary. Stop and ask only before dropping tables or columns or deleting real data.
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
You are a Kabsi build chat. Work in the GitHub repo itskaysyoga-gif/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.1-09, then docs/KABSI-PROGRESS.md. Do only task P0.1-09. Follow section 2: apply database changes yourself, open the pull request, make sure CI is green, update PROGRESS on the branch, merge the pull request yourself, run the After-merge checks you can, then give Rashid the PR link and a 3-line summary. Stop and ask only before dropping tables or columns or deleting real data.
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
You are a Kabsi build chat. Work in the GitHub repo itskaysyoga-gif/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.1-10, then docs/KABSI-PROGRESS.md. Do only task P0.1-10. Follow section 2: apply database changes yourself, open the pull request, make sure CI is green, update PROGRESS on the branch, merge the pull request yourself, run the After-merge checks you can, then give Rashid the PR link and a 3-line summary. Stop and ask only before dropping tables or columns or deleting real data.
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
You are a Kabsi build chat. Work in the GitHub repo itskaysyoga-gif/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.1-11, then docs/KABSI-PROGRESS.md. Do only task P0.1-11. Follow section 2: apply database changes yourself, open the pull request, make sure CI is green, update PROGRESS on the branch, merge the pull request yourself, run the After-merge checks you can, then give Rashid the PR link and a 3-line summary. Stop and ask only before dropping tables or columns or deleting real data.
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
You are a Kabsi build chat. Work in the GitHub repo itskaysyoga-gif/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.1-12a, then docs/KABSI-PROGRESS.md. Do only task P0.1-12a. Follow section 2: apply database changes yourself, open the pull request, make sure CI is green, update PROGRESS on the branch, merge the pull request yourself, run the After-merge checks you can, then give Rashid the PR link and a 3-line summary. Stop and ask only before dropping tables or columns or deleting real data.
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
You are a Kabsi build chat. Work in the GitHub repo itskaysyoga-gif/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.1-12b, then docs/KABSI-PROGRESS.md. Do only task P0.1-12b. Follow section 2: apply database changes yourself, open the pull request, make sure CI is green, update PROGRESS on the branch, merge the pull request yourself, run the After-merge checks you can, then give Rashid the PR link and a 3-line summary. Stop and ask only before dropping tables or columns or deleting real data.
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
You are a Kabsi build chat. Work in the GitHub repo itskaysyoga-gif/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.1-13a, then docs/KABSI-PROGRESS.md. Do only task P0.1-13a. Follow section 2: apply database changes yourself, open the pull request, make sure CI is green, update PROGRESS on the branch, merge the pull request yourself, run the After-merge checks you can, then give Rashid the PR link and a 3-line summary. Stop and ask only before dropping tables or columns or deleting real data.
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
You are a Kabsi build chat. Work in the GitHub repo itskaysyoga-gif/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.1-13b, then docs/KABSI-PROGRESS.md. Do only task P0.1-13b. Follow section 2: apply database changes yourself, open the pull request, make sure CI is green, update PROGRESS on the branch, merge the pull request yourself, run the After-merge checks you can, then give Rashid the PR link and a 3-line summary. Stop and ask only before dropping tables or columns or deleting real data.
Port posts, photos, special hours and listing changes onto the pipeline built in P0.1-13a, with the same tests per type, then remove the old per-type claim logic.
```
