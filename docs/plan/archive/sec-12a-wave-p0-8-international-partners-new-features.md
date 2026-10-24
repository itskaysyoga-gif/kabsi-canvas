<!-- Moved verbatim from docs/KABSI-PLAN.md on 24 Oct 2026 (docs diet, master plan 27.12). The index is docs/KABSI-PLAN.md. -->

## 12A. Wave P0.8: international, Kabsi Partners and the new features

Added by the planning chat on 21 Oct 2026 from Hussein's final product decisions (K-123 to K-146 in `docs/source/KABSI-AUDIT.md`, R-33 to R-38 in section 4). It sits between Wave P0.6 and the launch gate; the bundled sessions in section 7 say when each card runs. Every card follows section 2, the cost rule (2.12) and the claims rule (2.11). Features that are not built yet are "coming" in `knowledge/kabsi-facts.md`; removals are "changing" until the card is merged, and the card that merges them removes the marker.

Goal: Kabsi is international, has one payment route and one partner program, Essentials and Pro are real plans, and the review, profile and WhatsApp features Hussein approved are built on the mock and tested, ready for the live test in P0.7-05b.

Done when (wave): no page, email, RPC or fact mentions Lebanon pricing, NFC card sales, USDT, Binance Pay, Whish, OMT, cash or the old partner model (grep in P0.7-06); each feature below is merged with its tests, except the cards in the After launch table (R-42); the Website v2 card is merged before P0.7-07.

### Cards changed and cards retired on 21 Oct 2026

Changed (the card text carries a "Changed 21 Oct 2026" line):

| Card | What changed | Decision |
|---|---|---|
| P0.2-07 | Built; the terms and privacy changes it needs are done in P0.8-01 | K-124, K-128 |
| P0.3-06 | Built; the partner role and partner approval policies are removed in P0.8-01 | K-127 |
| P0.4-03, P0.4-05 | Onboarding is six steps; step 4 adds "Connect WhatsApp"; step 5 ends on the day-one backlog card | K-141 |
| P0.4-06 | Entitlements per plan (Essentials, Pro), a 30-day trial through a partner link, no `partner_covered` | K-126, K-127 |
| P0.4-07 | Creem products are Essentials and Pro, monthly and yearly, and the extra location; no Lebanon bundle, no resale product, no NOWPayments | K-124, K-126 |
| P0.4-10 | Built; the day-11 email offers Essentials or Pro (copy change rides P0.4-07) | K-141 |
| P0.5-01 | The photo engine takes video and WhatsApp photo drop; counts photos by type for the Coach | K-129, K-136 |
| P0.5-03 | Holiday hours concierge: `date-holidays`, ask 5 days before, publish `specialHours` on the answer | K-131 |
| P0.5-04 | The report carries the Growth agent's weekly tasks and, monthly, "What customers say" | K-135, K-136, K-143 |
| P0.5-05 | Adds the search terms report | K-138 |
| P0.6-02 | Referral cookie of 60 days, last referral wins, saved at sign-up | K-127 |
| P0.6-06 | Nora's facts use [COMING] and [CHANGING] markers; no industry statistics | K-144, 2.11 |
| P0.6-10 | The Lebanese number is gone everywhere | K-123 |
| P0.7-04 | The deletion list loses the QA Partner rows (removed earlier in P0.8-01) | K-127 |
| P0.7-05b | Also tests WhatsApp approval, put-back, auto-fix, holiday hours and the order button live | K-129 to K-137 |
| P0.7-07 | Pricing, the trial and the CTA switch use the new plans | K-126, K-140 |
| P1-11 | The cards tab becomes "Your own NFC cards and tags" (how to write the link), no ordering | K-125 |
| P1-22 | Depends on P0.8-03 instead of P1-21 | K-129 |
| P1-23 | Voice notes on the WhatsApp owner channel | K-129 (voice notes are P1) | an owner's voice note is turned into a text the owner confirms before anything is drafted or approved; no audio is kept past the retention limit | P0.8-03, Rashid's yes on paid calls (2.12) | Sonnet | A test voice note becomes a confirmed text; nothing is approved from a voice note alone |

Retired (the row is marked RETIRED where it is listed; do not build):

| Card | Why | Replaced by |
|---|---|---|
| P1-01 Partner organisation, client onboarding, approval policies | Partner workspaces are deleted | P0.8-12 (Kabsi Partners); agencies are Managers in Team |
| P1-02 Portfolio dashboard | Same | P0.8-12 dashboard |
| P1-03 Partner branding and client reports | Same | none |
| P1-04 Referral attribution and commission from the webhook | Old commission model | P0.8-12 |
| P1-10 Review themes on request | Replaced | P0.8-08 |
| P1-14d Industry pages | Replaced | P0.8-13 `/for/<industry>` template |
| P1-14e Homepage rebuild | Replaced | P0.8-13 |
| P1-20 Pricing page rebuild | Replaced | P0.8-13 |
| P1-21 WhatsApp owner alerts through Kapso | Promoted to P0 and widened | P0.8-03 |
| P1-06a, P1-06b, P1-06c (parts) | Folded into the Coach | P0.8-09 |
| V13 and W5 shot sheets (partner workspace videos) | The workspace is deleted | a Kabsi Partners explainer when the program opens |
| The Lebanon page and bundle, NFC card orders, USDT, Binance Pay, Whish, OMT, cash, NOWPayments, partner resale and invoices | Market and payment decisions | P0.8-01 removes them |

### P0.8-01 International and partner cleanup

- Decisions: K-123, K-124, K-125, K-127, K-145, R-33, R-34, R-35.
- Touches: this is the first build session after session 6 and the largest removal in the plan. It removes, in code, copy, RLS and RPCs:
  - **Market and cards.** `src/routes/lebanon.tsx` becomes a 301 to `/pricing` (the old `/product` redirect follows it), `public/sitemap.xml` drops it; the Lebanese phone number and every Lebanon block, bundle, price and field-team line from `src/lib/site.ts`, `src/lib/region.ts` (sales wording only; consent country rules stay), `src/lib/faq.ts`, `src/lib/home.ts`, `src/lib/plans.ts`, `src/lib/verticals.tsx`, `src/components/marketing/parts.tsx`, `src/routes/{index,how-it-works,for.$slug,about,pricing,google-review-link,activate.$code}.tsx`, `src/routes/_authenticated/app/{plan,cards}.tsx`, `src/components/onboarding/steps.tsx`, the assistant widget; NFC card ordering, card prices and card copy (the new line is "Works with your own QR codes and NFC cards"); `card_orders` flows and the staff order screens; `/r/<code>` and `go.kabsi.co` redirects and `/activate/<code>` keep working, unadvertised.
  - **Payments.** Every USDT, Binance Pay, Whish, OMT and cash screen, claim RPC (`owner_submit_claim`), staff confirmation panel, Slack money prompt, `_shared/payments.ts`, `_shared/nowpayments*`, the NOWPayments webhook branch of `billing`, and the plan page payment instructions; the plan page says "Card payments are coming" until P0.4-07 and shows no other route. USD only.
  - **Old partner model.** Functions `partner` and the resale branch of `lead`; routes `/partner` (old dashboard), `src/lib/partner.ts`, `src/components/staff/partners-panel.tsx`; `partner_covered` and every partner path in `entitlements` and `choose_plan` (`plan_through_partner`); the approval policies "partner may approve" and "partner prepares, owner approves" and the partner role in `location_members` / roles migrations and RLS; partner invoices, payments and the `kabsi_partner_billing` job (unscheduled); partner emails (`_shared/email/catalog.ts`, `copy.ts`, `notify-categories`); resale lead flows; the QA Partner test data (named test rows, deleted with the connector); pgTAP tests and `scripts/check-anon-headers.mjs` entries that name them.
  - **Words and legal.** `src/routes/terms.tsx` and `privacy.tsx`: seller Hussein Slim, Dubai; governing law the law of the United Arab Emirates (lawyer to confirm, kept in PROGRESS "Decisions to confirm"); no partner clauses, no crypto or cash clauses, no card-order clauses. `knowledge/kabsi-facts.md` and `public/llms-full.txt`: every removal above moves from "changing" to removed. `public/llms.txt`, `docs/marketing/feature-truth.md`, `whatsapp-setup.md`, `brand-kit.md` and the V06 shot sheet lose Lebanon and card lines.
  - **Placeholder for the partner page.** `/partners` shows a plain holding page ("Kabsi Partners is opening soon", `hello@kabsi.co`) until P0.8-12 replaces it.
  - **Old tables and columns** (`partners`, `partner_members`, `partner_invites`, `partner_clients`, `partner_invoices`, `usdt_claims`, `card_orders`, the partner columns on `locations` and `plans`, and anything else the grep shows unused): never dropped by this session. The session writes them as separate SQL files in `supabase/migrations/` (the `_links` pattern used since P0.3-05), with row counts, for Rashid to run in the SQL editor; the code stops using them first, and the stop in section 2.3 applies.
- Depends on: sessions 1 to 6 done (P0.4-10 merged).
- Model: Opus (billing and access rules).
- Done when: the greps in "Words" below return nothing in `src`, `supabase/functions`, `public`, `knowledge`; `curl -sI https://kabsi.co/lebanon` returns 301 to `/pricing`; `/r/<an existing code>` still answers 302; `/pricing` shows no Lebanon block, no card price and no USDT; `entitlements` and `choose_plan` have no partner branch (SQL read-back); the database suite passes without the partner tests; the removal SQL files exist with counts and are listed in PROGRESS for Rashid; Nora's facts no longer offer any removed route (checked by hand on three questions).
  - Words: `grep -rniE "lebanon|lebanese|\+961|usdt|binance|whish|\bomt\b|nowpayments|partner_covered|resale|\$120|bundle" src supabase/functions public knowledge` returns only the 301 redirect and the facts file's "removed" lines.
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo itskaysyoga-gif/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.8-01, then docs/KABSI-PROGRESS.md. Do only task P0.8-01. Follow section 2: apply database changes yourself, open the pull request, make sure CI is green, update PROGRESS on the branch, merge the pull request yourself, run the After-merge checks you can, then give Rashid the PR link and a 3-line summary. Stop and ask only before dropping tables or columns or deleting real data. Use the kabsi-build-session skill.
Read K-123, K-124, K-125, K-127 and K-145 in docs/source/KABSI-AUDIT.md. This is a removal task. Split it into pull requests of about 10 files: (1) market, cards and the /lebanon redirect, (2) payments, (3) old partner model in code and RLS, (4) the SQL files for Rashid. Never drop a table or column yourself. Keep /r/<code> redirects working. Update knowledge/kabsi-facts.md in each pull request and rebuild public/llms-full.txt.
```

### P0.8-02 Session 6 email fixes and email previews

- Decisions: K-102, K-118, P0.4-08, P0.4-10 (the findings of session 6).
- Touches: `_shared/email/` and the lifecycle sender: the day 17 and the day 30 win-backs get different subjects (today they share one); the old-format Weekly Care Report subject is changed to the P0.4-08 format; a script `scripts/render-emails.ts` renders every email kind to `docs/email-previews/<kind>.html` (with fixture data, light mode, plus the plain-text next to it) so Rashid can review all of them in a browser; a test that the previews are current.
- Depends on: P0.4-08, P0.4-10 (both merged).
- Model: Sonnet (it runs inside the Opus session 7 because it follows the cleanup in the same files).
- Done when: the two win-back emails differ in subject (test); no email kind keeps the old report subject (test over the catalog); `docs/email-previews/` holds one HTML file per email kind in the catalog (count equals the catalog); typecheck, lint, tests and `bash scripts/deno-check.sh` pass.
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo itskaysyoga-gif/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.8-02, then docs/KABSI-PROGRESS.md. Do only task P0.8-02. Follow section 2: apply database changes yourself, open the pull request, make sure CI is green, update PROGRESS on the branch, merge the pull request yourself, run the After-merge checks you can, then give Rashid the PR link and a 3-line summary. Stop and ask only before dropping tables or columns or deleting real data. Use the kabsi-build-session skill.
Fix the three email items and add the preview renderer. No new email kinds. Send nothing to real addresses; previews are files.
```

### P0.8-03 WhatsApp owner channel

**Confirmed 21 Oct 2026 (Hussein, recorded against K-113).** A WhatsApp review alert carries the business, the star rating, the reviewer's first name, the review text up to 300 characters and the draft, because the owner must read the review to approve it. The owner's WhatsApp opt-in consent text names Meta and Kapso as carrying the message. This is the one exception to section 2.2's "review text and reviewer names never go to Meta": it applies only to the owner's own alert, after that opt-in, and never to logs, analytics or staff tools.

- Decisions: K-129, K-17, K-70, K-113, K-122, K-146, R-36, guardrails 6 and 8.
- Touches: Edge Function `whatsapp` (new; a line in `supabase/config.toml`, `verify_jwt` false, Kapso signature verified, replay window, unknown sender ignored) built on github.com/gokapso/whatsapp-cloud-api-js; the session installs github.com/gokapso/agent-skills (integrate-whatsapp, observe-whatsapp); tables `whatsapp_optins` (owner, phone, one-time code, state, consent text and time, STOP time), `whatsapp_window` (owner, last inbound at, so the 24-hour service window is tracked), `whatsapp_messages` (kind, state, provider id, error); the "Connect WhatsApp" flow (button opens `wa.me` with a prefilled one-time code; the owner sends it; that verifies the number and opens the window); review alerts (draft and the buttons "Approve" and "Edit in app", templates outside the window); approval handler: allowed only for low and medium risk replies and weekly posts, never high risk and never identity fields (name, address, categories, map pin, phone, open or closed), which reply with a link to the app; the approval creates the publication with `publish_after = now() + 10 seconds` through the job queue (server-side undo, K-70), and the publish job re-checks that the reply is still a draft; weekly digest opt-in; photos sent to the number become uploads in the photo engine (needs P0.5-01; the handler is wired in P0.5-01's follow-up if that has not merged); audit events with channel `whatsapp`; STOP and variants; Settings, "What Kabsi tells you" gets the WhatsApp channel; `/privacy`, `/terms` and facts updated (WhatsApp is now an approval channel for low and medium risk); `KAPSO_API_KEY` and the webhook secret only in Supabase secrets (names added to Appendix A). Voice notes are P1.
- Depends on: P0.4-09 (notification engine), P0.3-06, P0.6-10, P0.6-12, P0.5-01 for the photo drop. Kapso template approvals and Meta business verification (R-25) are Hussein's steps (section 5, step 11 and 14).
- Model: Opus (WhatsApp approvals reach Google through the pipeline).
- Done when (all on the Kapso sandbox or a mock client until Rashid says live sends may start, K-146): tests prove an Approve on a low-risk draft publishes once after 10 seconds, an Undo inside 10 seconds cancels, a second Approve is a no-op, a draft that changed to approved or discarded is not published, a high-risk review and an identity-field change are refused with the app link, a send outside the 24-hour window uses a template or is held, a send without opt-in is refused, STOP stops sends, a forged webhook is refused; the audit rows carry channel `whatsapp`; the K-113 answer on message content (rating and draft only, or with a short excerpt) is recorded in PROGRESS; no key appears in code, logs or the PR.
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo itskaysyoga-gif/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.8-03, then docs/KABSI-PROGRESS.md. Do only task P0.8-03. Follow section 2: apply database changes yourself, open the pull request, make sure CI is green, update PROGRESS on the branch, merge the pull request yourself, run the After-merge checks you can, then give Rashid the PR link and a 3-line summary. Stop and ask only before dropping tables or columns or deleting real data. Use the kabsi-build-session skill.
Read K-129, K-17, K-70 and K-113 in docs/source/KABSI-AUDIT.md. Install gokapso/agent-skills (integrate-whatsapp, observe-whatsapp) and build on gokapso/whatsapp-cloud-api-js. Make no live WhatsApp send until Rashid says so; use Kapso's sandbox or a mock client. KAPSO_API_KEY lives only in Supabase secrets; never ask for it in the chat. Tests first.
```

### P0.8-04 Protection: one-tap put-back and Pro auto-fix

**Confirmed 21 Oct 2026 (Hussein).** The auto-fix gate as written is accepted: auto-fix ships only after the build chat re-reads Google's policy and records the sentence; if the owner's opt-in does not satisfy it, auto-fix ships off and one-tap put-back remains.

- Decisions: K-130, K-19, K-116.2, K-129, K-137 (hours fields), R-36, guardrail 7.
- Touches: `private.protection_*` and the Guard agent job; `google_revert_log` (`location_id`, `field`, `reverted_at`, `count`); a one-tap "Put it back" on every watched field's change card in the app and, for fields WhatsApp may approve (not the identity fields), as a WhatsApp button (P0.8-03); Pro opt-in per field for auto-fix of regular hours, special hours and website only (a switch in Google Profile, with the sentence of what it does, and a record of the owner's consent text and time); the entitlement check (Pro); the rules: two reverts of one field in 30 days stop auto-fix for it, set the field to "needs review" and alert the owner; patch only when `verificationState` is VERIFIED; the copy never says a competitor, a customer or a named person made an edit; the pipeline records "auto-fix, owner opted in" as the approval; the K-130 point 5 gate: read Google's current policy text on automatic reverts, paste the sentence in PROGRESS, and keep auto-fix off for live profiles if the opt-in does not satisfy it.
- Depends on: P0.8-03, P0.2-04, P0.4-06 (entitlements per plan).
- Model: Opus (Google writes and access rules).
- Done when: tests prove put-back publishes once through the pipeline; auto-fix never touches name, address, category, map pin, phone or open or closed (a test per field); a Pro business with opt-in gets an auto-fix on a mock hours change and an Essentials business does not; the third change inside 30 days is not auto-fixed and the owner is alerted; an unverified profile is never patched; the K-130 point 5 sentence is in PROGRESS.
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo itskaysyoga-gif/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.8-04, then docs/KABSI-PROGRESS.md. Do only task P0.8-04. Follow section 2: apply database changes yourself, open the pull request, make sure CI is green, update PROGRESS on the branch, merge the pull request yourself, run the After-merge checks you can, then give Rashid the PR link and a 3-line summary. Stop and ask only before dropping tables or columns or deleting real data. Use the kabsi-build-session skill.
Read K-19, K-130 and guardrail 7. Build on the mock. Before enabling auto-fix for live profiles, re-read Google's Business Profile API policy on automatic changes and record the exact sentence in PROGRESS; if it forbids the owner-opt-in design, ship auto-fix switched off and say so to Hussein.
```

### P0.8-05 Review link page: the Google button first

**Confirmed 21 Oct 2026 (Hussein).** Existing review links keep redirecting straight to Google until the owner switches a link to the page, so printed QR codes never break. There is no Free plan: a business with no plan keeps only its review link and QR code (K-126).

- Decisions: K-132, K-25, K-116.9, K-125, K-129 (the business's own WhatsApp).
- Touches: a public page behind a review link (route and Worker/function change, `supabase/functions/review-link`, `workers/kabsi-go`), per-link setting "Open Google directly" or "Show the page" (existing links default to direct, so printed QR codes and `/r/<code>` keep working); the page shows the Google review button first and large to every visitor, then a second line "Need help now? Message the manager" that opens `wa.me` with the business's WhatsApp number (a Business Knowledge fact; hidden when none); no sentiment question, no rating screen, no routing; opens counted per link as today (K-25 wording); the Get Reviews screen explains it in two sentences and the "Works with your own QR codes and NFC cards" line; `knowledge/kabsi-facts.md`.
- Depends on: P0.8-01.
- Model: Sonnet.
- Done when: the page renders at 390 px with the Google button above the fold and first in the tab order; it is the same for every visitor (no code path reads a rating or any answer); with no WhatsApp number the second line is absent; an existing link still redirects straight to Google (test); a component test fails if the manager line comes before the button.
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo itskaysyoga-gif/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.8-05, then docs/KABSI-PROGRESS.md. Do only task P0.8-05. Follow section 2: apply database changes yourself, open the pull request, make sure CI is green, update PROGRESS on the branch, merge the pull request yourself, run the After-merge checks you can, then give Rashid the PR link and a 3-line summary. Stop and ask only before dropping tables or columns or deleting real data. Use the kabsi-build-session skill.
Read K-132 and K-25. The Google review button is always first and always shown to everyone; no question is asked; nobody is routed. Phone first at 390 px.
```

### P0.8-06 Staff "Send review link"

- Decisions: K-133, K-25, K-16 (staff role).
- Touches: a staff-visible button on Get Reviews and in the staff upload view that opens WhatsApp click-to-chat (`wa.me/?text=`) from the staff member's own WhatsApp with a neutral prefilled message and the review link (the message offers to every customer, for example "Thanks for visiting <business>. If you would like to leave a review, here is our link: <link>"; no "if you enjoyed", no reward words); the link used is the place link (K-25 places not people); no record of who sent what; copy and the wording check list in `knowledge/kabsi-facts.md`.
- Depends on: P0.8-01, P0.3-06.
- Model: Sonnet.
- Done when: the button works on iOS Safari and Android Chrome (URL tested); a test fails on any of the words reward, free, discount, if you enjoyed, happy, 5 stars in the message; no table stores a staff member next to a send; the staff role sees it and nothing else new.
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo itskaysyoga-gif/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.8-06, then docs/KABSI-PROGRESS.md. Do only task P0.8-06. Follow section 2: apply database changes yourself, open the pull request, make sure CI is green, update PROGRESS on the branch, merge the pull request yourself, run the After-merge checks you can, then give Rashid the PR link and a 3-line summary. Stop and ask only before dropping tables or columns or deleting real data. Use the kabsi-build-session skill.
Read K-133 and K-25. No quotas, no per-staff counting, no rewards, no "if you enjoyed". Every customer gets the same message.
```

### P0.8-07 Review graphics (Pro)

- Decisions: K-134, K-113 (30-day limit, no storage beyond it), K-126 (Pro).
- Touches: an image renderer (Satori and resvg, in an Edge Function or the Worker, the build chat picks and records why) producing a square and a story image for 4-star and 5-star reviews; first name and initial only; text sanitised (no links, no contact details, no hashtags) and cut to about 200 characters with an ellipsis; token colours and fonts only (K-108); the Reviews screen gets "Make a graphic" on eligible reviews; the owner downloads or uses the phone share sheet; nothing is posted anywhere; the image is rendered on request and not stored (or stored for at most the review's own 30-day limit); the entitlement check (Pro); `knowledge/kabsi-facts.md` as coming.
- Depends on: P0.8-01, P0.4-06 (entitlements per plan).
- Model: Sonnet.
- Done when: tests prove a 4-star and a 5-star review produce both sizes and a 3-star one is refused; a 600-character review is cut at about 200 with an ellipsis and no mid-word break; a review with a phone number or link is cleaned; no image or review text remains in Storage after 30 days (retention test or no storage); an Essentials business is told it is a Pro feature.
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo itskaysyoga-gif/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.8-07, then docs/KABSI-PROGRESS.md. Do only task P0.8-07. Follow section 2: apply database changes yourself, open the pull request, make sure CI is green, update PROGRESS on the branch, merge the pull request yourself, run the After-merge checks you can, then give Rashid the PR link and a 3-line summary. Stop and ask only before dropping tables or columns or deleting real data. Use the kabsi-build-session skill.
Read K-134 and K-113. Nothing is posted automatically. Use only design tokens (K-108). Render on request; keep nothing past Google's 30-day review limit.
```

### P0.8-08 What customers say (Pro)

**Moved 21 Oct 2026 (R-42).** Runs after launch as session L3; gate: the AI credit is on and Google's written answer is on file (R-37). The feature shows as coming, with no date.

**Confirmed 21 Oct 2026 (Hussein).** The summary fetches reviews at run time and stores no review text; it stays off for real customers until Google's written answer is on file.

- Decisions: K-135, K-27, K-113, K-100, K-143 (Insights agent), K-146, R-37.
- Touches: a monthly job (Insights agent) that fetches up to 90 days of reviews at run time and sends them to Claude Haiku in one batch (staff, place, products or services mentioned); input capped at about 10,000 tokens, the most recent reviews above that; the run counts against the AI budget (`ai_usage`) and does not start when AI credit is off or the budget is used up; the result stores only a short summary and counts (no review text, no names) and is shown in the monthly Weekly Care Report block, in Insights and as a WhatsApp message (P0.8-03); a feature flag that stays off for real customers until Google's written answer on the data-access question (K-27) is on file; the entitlement check (Pro); `knowledge/kabsi-facts.md` as coming. P1-10 is retired.
- Depends on: P0.5-04, P0.8-03, P0.4-06.
- Model: Sonnet (the first real run waits for Rashid's yes on API calls, K-146; tests use stubs).
- Done when: tests prove the input is cut at the cap with the newest reviews kept, a run with credit off does nothing, each run writes an `ai_usage` row, the stored result contains no review text, and an Essentials business sees no block; the flag state and the Google answer status are recorded in PROGRESS.
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo itskaysyoga-gif/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.8-08, then docs/KABSI-PROGRESS.md. Do only task P0.8-08. Follow section 2: apply database changes yourself, open the pull request, make sure CI is green, update PROGRESS on the branch, merge the pull request yourself, run the After-merge checks you can, then give Rashid the PR link and a 3-line summary. Stop and ask only before dropping tables or columns or deleting real data. Use the kabsi-build-session skill.
Read K-135, K-27 and K-113. Make no real model call: test with stubs. Review text is never stored.
```

### P0.8-09 Profile Coach

- Decisions: K-136, K-143 (Growth agent), K-81 to K-84, K-116, K-117, K-112 (no keywords in the name), R-38.
- Touches: a weekly Growth-agent job that builds a completeness checklist per business from the profile and Business Knowledge and creates tasks (task kinds `profile_gap` and new coach kinds) which the owner approves one by one; Essentials sees the checklist (what is missing and why) and Pro gets the actions:
  1. Description: a draft up to 750 characters from verified facts, most useful facts first, no links, promotions or contact details (AI, only when credit is on; the code checks from P0.3-02 apply).
  2. Categories: Business Information `categories.list` (mock now) for the business type; additional categories suggested; a primary-category change is only suggested, flagged sensitive, and never applied without the signed-in owner.
  3. Services and products filled from Business Knowledge (the interview stays P1-06b).
  4. Attributes: `attributes.metadata` for the category against the profile (no identity attributes, K-83).
  5. Photos and video: counts by type (exterior, interior, team, work, products) from the photo engine and a nudge for missing types.
  6. Service-area businesses: suggest hiding the address and setting up to 20 service areas when customers do not visit (sensitive, signed-in owner).
  7. Website link tracking: offer `utm_source=google&utm_medium=organic&utm_campaign=gbp` on the website link (owner approves; Protection records the new value as approved).
  8. Schema snippet: a `LocalBusiness` JSON-LD built from the profile with a copy button.
  9. Website match check: an SSRF-safe fetch of the owner's public website (no private addresses, no off-domain redirects, robots.txt, one to three pages) comparing name, phone, address and hours with the profile, listing mismatches as tasks.
  10. Never suggest keywords in the business name.
  The free Profile Check page (P0.4-01) shows the same completeness checklist. Gaps and the weekly task plan appear in the Weekly Care Report (P0.5-04). The description writer's real model calls wait for AI credit and Rashid's yes (K-146); everything else uses no AI. Pro gating by entitlement; `knowledge/kabsi-facts.md` as coming.
- Depends on: P0.3-05, P0.2-03, P0.4-01, P0.5-05 (data), P0.4-06; photo counts need P0.5-01 (the nudge appears when it has merged).
- Model: Sonnet.
- Done when: tests per item above; a gap found twice creates one task (dedupe); a primary-category suggestion never reaches the pipeline without a signed-in approval (test); the description check rejects links, phone numbers and promotions; a name containing keywords is never suggested; the website check refuses `127.0.0.1` and a redirect to another domain (tests); the free Profile Check shows the checklist; an Essentials business sees the checklist only.
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo itskaysyoga-gif/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.8-09, then docs/KABSI-PROGRESS.md. Do only task P0.8-09. Follow section 2: apply database changes yourself, open the pull request, make sure CI is green, update PROGRESS on the branch, merge the pull request yourself, run the After-merge checks you can, then give Rashid the PR link and a 3-line summary. Stop and ask only before dropping tables or columns or deleting real data. Use the kabsi-build-session skill.
Read K-136, K-83 and K-116 in docs/source/KABSI-AUDIT.md. Every change is a task the owner approves. Build on the mock; make no real model call (use stubs) until Rashid says so. Split into two pull requests if it passes 10 files: checklist and tasks first, actions second.
```

### P0.8-10 Own order and booking button (Pro)

**Moved 21 Oct 2026 (R-42).** Runs after launch as session L4; gate: real Place Actions responses. The feature shows as coming, with no date.

- Decisions: K-137, K-117.3, K-38 (pipeline), K-146.
- Touches: `_shared/google/placeActions` (live and mock; live fixtures exist from P0.7-01) used by a Guard-agent check and a Pro card in Google Profile: add the owner's direct order or booking link through the Place Actions API and mark it preferred, written through the pipeline with the owner's approval; an alert task when the preferred link is missing or has changed; a plain explanation that links from aggregators cannot be removed by Kabsi; NOT_FOUND and PERMISSION_DENIED hide the feature for that business, are recorded once, and are never retried in a loop; the entitlement check (Pro).
- Depends on: P0.7-01 (real Place Actions responses), P0.8-04, P0.4-06.
- Model: Opus (Google writes).
- Done when: tests prove the add goes through the pipeline once; a changed preferred link raises one task; a mock NOT_FOUND and a mock PERMISSION_DENIED each hide the feature and make exactly one Google call (call counter); nothing retries; the card text says Kabsi cannot remove aggregator links.
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo itskaysyoga-gif/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.8-10, then docs/KABSI-PROGRESS.md. Do only task P0.8-10. Follow section 2: apply database changes yourself, open the pull request, make sure CI is green, update PROGRESS on the branch, merge the pull request yourself, run the After-merge checks you can, then give Rashid the PR link and a 3-line summary. Stop and ask only before dropping tables or columns or deleting real data. Use the kabsi-build-session skill.
Read K-137 and the Place Actions fixtures from P0.7-01. Writes go through the one pipeline. Never retry after NOT_FOUND or PERMISSION_DENIED. No live write until P0.7-05b and Hussein's approval of each write.
```

### P0.8-11 Report a fake review helper (Pro)

- Decisions: K-139, K-113.8, the facts rule against promising removal.
- Touches: a helper opened from a review ("Report this review"): Google's prohibited and restricted content categories in plain words (spam and fake content, off-topic, conflict of interest, offensive content, impersonation, and the others Google lists, with the current list dated and linked); an evidence checklist (why it is fake, dates, any proof the person was not a customer, screenshots the owner keeps); a deep link to Google's Reviews Management Tool for the business; outcome tracking per review (reported, Google answered, still showing, removed) entered by the owner and reminded after a week; one appeal step with its own checklist; no AI, no legal language, no promise that a review will be removed; strings in the facts file; the entitlement check (Pro).
- Depends on: P0.8-01, P0.4-06.
- Model: Sonnet.
- Done when: the screen works at 390 px; the deep link opens (URL tested); the outcome states move in order and the appeal can be started once; a text check fails on the words guarantee, will be removed, we will get it removed, lawsuit, defamation, legal action; no model call exists in the code path.
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo itskaysyoga-gif/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.8-11, then docs/KABSI-PROGRESS.md. Do only task P0.8-11. Follow section 2: apply database changes yourself, open the pull request, make sure CI is green, update PROGRESS on the branch, merge the pull request yourself, run the After-merge checks you can, then give Rashid the PR link and a 3-line summary. Stop and ask only before dropping tables or columns or deleting real data. Use the kabsi-build-session skill.
Read K-139. Take the category list and the Reviews Management Tool link from Google's own help pages and note the date checked. Kabsi never promises a removal and never uses legal language.
```

### P0.8-12 Kabsi Partners

**Moved 21 Oct 2026 (R-42).** Runs after launch as session L1; gate: live reviews work and the first founding customers are in (D6). The `/partners` holding page stays until then.

- Decisions: K-127, K-128, K-126 (30-day trial), K-124 (Creem), K-144, R-34, G-32.
- Touches:
  - **Public.** `/partners` (replaces the holding page from P0.8-01): who can apply (creators, agencies, consultants, accountants, web and POS sellers), the terms in plain words (30% of every payment for the first 12 months of each referred business, a 30-day hold, paid monthly, $50 minimum, no upfront bounty; the referred business gets a 30-day Pro trial), the partner rules (K-128), an application form (name, email, who you are, audience or client base, country, website or channel; Turnstile; a stored row, not a sales lead), and the line "Rashid approves each partner". No earnings promises, no income claims.
  - **Attribution.** `kabsi.co/?via=CODE` sets a first-party cookie for 60 days (last referral wins); the code is saved on the user and business at sign-up server-side (P0.6-02 carries the event plumbing); disclosed on `/privacy` and in the consent text; invalid or unapproved codes are ignored; self-referral (same email or Google account as the partner) earns nothing.
  - **Partner dashboard** (`/partner`, new): link and code, clicks, sign-ups, trials, paying businesses, earned, paid. Aggregates and pseudonymous rows only; no business name beyond what the partner already told, no Google data, no reviews.
  - **Staff screen** (in `/staff`): applications to approve or decline, partners, referrals, commission rows, mark payouts paid (monthly, $50 minimum, the hold date shown), a reversal when a payment is refunded or charged back.
  - **Money.** First check whether Creem affiliates cover recurring commission for 12 months, a 30-day hold, monthly payout and our last-referral attribution; if they do, use them and keep a read-only mirror; if not, an own ledger (`kabsi_partners`, `partner_referrals`, `partner_commissions`) written by the Creem webhook (P0.4-07) with states pending, payable after the hold, paid, reversed. Record the choice and the reasons in PROGRESS.
  - **Rules in the product.** Partner copy and the script kit (approved claims list from K-53, the video claims table and the claims rule) in `docs/marketing/partner-kit.md`; the paid-partnership label rule and the licence rule in the terms for partners.
  - **Not here.** Resale, partner-covered plans, partner workspaces, partner approvals, agency roles: agencies are invited by the owner as Manager in Team.
  - Live only after live reviews work: a switch (`app_settings.partners_open`) stays off until P0.7-05 has passed and Rashid turns it on; the public page shows the holding line until then.
- Depends on: P0.8-01, P0.4-07 (the Creem webhook), P0.6-02, P0.6-01.
- Model: Sonnet.
- Done when: a test payment from a referred business inside 12 months creates a pending commission of 30% of the amount, payable after 30 days, and none after month 12; a refund reverses it; the last referral inside 60 days wins; an unapproved partner earns nothing; a partner sees no other partner's rows and no business data (database tests); the staff screen marks a payout paid only at or above $50; `/privacy` states the 60-day code; the switch is off.
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo itskaysyoga-gif/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.8-12, then docs/KABSI-PROGRESS.md. Do only task P0.8-12. Follow section 2: apply database changes yourself, open the pull request, make sure CI is green, update PROGRESS on the branch, merge the pull request yourself, run the After-merge checks you can, then give Rashid the PR link and a 3-line summary. Stop and ask only before dropping tables or columns or deleting real data. Use the kabsi-build-session skill.
Read K-127 and K-128. This is the only partner program; the old model was deleted in P0.8-01. Check Creem affiliates first and record whether they fit. Keep the program switched off (app_settings.partners_open) until Rashid turns it on after live reviews work. Split into pull requests of about 10 files: data and attribution, dashboard, staff screen, public page.
```

### P0.8-13 Website v2

- Decisions: K-140, K-108, K-112, K-144, K-126, K-125, R-02, R-14, guardrail 23.
- Touches: `src/routes/{index,pricing,how-it-works,partners,for.$slug,for.index}.tsx`, `src/components/marketing/*`, `src/lib/{faq,home,verticals,plans}.ts`, `src/lib/site.ts` (one CTA constant), `public/llms.txt`, `public/sitemap.xml`, `knowledge/kabsi-facts.md`, `public/llms-full.txt`. Use the frontend-design skill. Keep the design system and tokens: no dark mode, no new palette, no framer-motion; a CSS fade-in that respects `prefers-reduced-motion`. Real product mockups only: rendered from the real app components with example data labelled "Example"; no stock people, no invented numbers.
  Homepage order: (1) hero: H1 "Your reviews and listing. Taken care of.", sub "Every review answered, every change to your listing caught, a fresh post every week. You approve in one tap." (ends "You approve on WhatsApp." only when `WHATSAPP_NUMBER` is set; R-56), the free check's business search instead of the yellow button, secondary "See how it works", WhatsApp phone mockup; (2) how it works in 4 steps; (3) three pillars (Every review answered, Your profile protected, Ready to be found), each with a real screen; (4) a WhatsApp section; (5) the Essentials and Pro feature grid; (6) pricing with the 14-day Pro trial; (7) "You stay in control": nothing posted without your OK, never your Google password, you stay the owner, disconnect any time, independent and not affiliated with Google; (8) founder note and real proof only (quotes with written consent, no logos or numbers until real); (9) industry links; (10) FAQ; (11) the final yellow button.
  One `/for/<industry>` template with honest copy for restaurants, cafes, salons, clinics, dentists and car services; the other old industry slugs redirect to `/for` (list in PROGRESS). `/pricing` shows Essentials and Pro (monthly and yearly), the extra location, the trial, "Cards through Creem", no Free, Partner or Lebanon column; `/how-it-works` is the operating loop in plain words with "What Kabsi can and cannot do"; `/partners` follows P0.8-12.
  **Changed 21 Oct 2026 (Hussein):** the H1 is the brand line "Your reviews and listing. Taken care of." and Google's name appears only in the subline, as plain descriptive words; the non-affiliation notice stays in the footer and in the "You stay in control" block. The hero button is the free Profile Check at all times; trial buttons read "Join early access" until P0.7-07, then "Start free", from one constant.
- Depends on: P0.8-01, P0.4-06, P0.4-07, P0.8-03 to P0.8-07, P0.8-09, P0.8-11 (so every feature on the page is real or marked "Early access"). Changed by R-42: it does not depend on P0.8-12, P0.8-08, P0.8-10 or P0.6-04; Kabsi Partners, What customers say and the order and booking button show as coming, with no date, and `/partners` stays the holding page.
- Model: Sonnet (frontend-design skill).
- Done when: the homepage sections are in the order above (test of the heading order); no claim passes the claims rule (grep for "%" and for "ranking", "rank", "autopilot", "automatically"); no Lebanon, card-sale, USDT or partner-resale text; `/for/<industry>` renders for the six trades; Lighthouse mobile performance at least 90 and accessibility 95 (report saved); a reduced-motion check shows no animation; 390 px and 1440 px looked at (or PROGRESS says no browser).
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo itskaysyoga-gif/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.8-13, then docs/KABSI-PROGRESS.md. Do only task P0.8-13. Follow section 2: apply database changes yourself, open the pull request, make sure CI is green, update PROGRESS on the branch, merge the pull request yourself, run the After-merge checks you can, then give Rashid the PR link and a 3-line summary. Stop and ask only before dropping tables or columns or deleting real data. Use the kabsi-build-session skill and the frontend-design skill.
Read K-140, K-112 and K-144 and the existing design tokens. The homepage text is fixed in the card; do not add proof that is not real. Split into pull requests of about 10 files: homepage, pricing and how it works, industry template, partners page.
```
