<!-- Moved verbatim from docs/KABSI-PLAN.md on 24 Oct 2026 (docs diet, master plan 27.12). The index is docs/KABSI-PLAN.md. -->

## 12. Wave P0.6: growth, tracking and launch preparation

Goal: everything VIDEO's gate 3 and G-39 tier 1 need before the first ad dollar, plus Nora in sync and a staff view of system health. Most of this wave can run in parallel with P0.5.

Done when (wave): the consent banner works by country with stored proof; PageView, ViewContent, CompleteRegistration, GoogleAccessGranted, Schedule and Purchase arrive in Meta's Test Events deduplicated; `/meta` shows the hero in under 2.5 s on a mid-range phone; Nora passes her evaluation; the platform checks in K-118 are green.

### P0.6-01 Consent banner and proof of consent

- Decisions: G-18, G-21, R-04, G-14 (PostHog without cookies before consent), VIDEO Part 7 consent line.
- Touches: a small banner component and `consent_records` (anonymous visitor id or user, country, rule applied, choices, exact wording and version, page, time); rules: opt-in before advertising tags in the UK, EU, EEA, UAE and Saudi Arabia; UK analytics allowed first-party and aggregate-only with notice and opt-out; notice and opt-out elsewhere; country from Cloudflare's `cf-ipcountry` on kabsi.co (proxied), browser time zone as fallback; the Meta Pixel never loads before consent where opt-in applies; PostHog runs cookieless until consent; the site works fully when declined; a "Privacy choices" link in the footer to reopen it.
- Depends on: P0.1-03.
- Model: Opus (session 11, R-42; was Sonnet under R-39).
- Done when: with a UK country header, no request to connect.facebook.net happens before accepting (network log or a Playwright test); declining leaves the site working; each choice writes one `consent_records` row with the wording version; with a US header the notice shows and the Pixel loads.
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo itskaysyoga-gif/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.6-01, then docs/KABSI-PROGRESS.md. Do only task P0.6-01. Follow section 2: apply database changes yourself, open the pull request, make sure CI is green, update PROGRESS on the branch, merge the pull request yourself, run the After-merge checks you can, then give Rashid the PR link and a 3-line summary. Stop and ask only before dropping tables or columns or deleting real data.
Read G-18 to G-21 in docs/source/KABSI-GROWTH.md and R-04. Build the banner and the records table; no third-party consent tool. English only at launch.
```

### P0.6-02 Product events, attribution and onboarding funnel

**Changed 21 Oct 2026 (K-127).** The partner and referral cookie is `via=CODE`, first party, 60 days (not 90), last referral wins, written to the user and the business at sign-up on the server and disclosed on `/privacy`. P0.8-12 builds the program on this plumbing.

- Decisions: G-31, G-32, G-44, G-28, K-55, K-76, K-118 (PostHog row), R-16, D219.
- Touches: `src/lib/telemetry.ts` and server-side event sender; event names from G-31 and G-44 exactly (landing_viewed, business_found, snapshot_viewed, registration_completed with method, connect_started with route, profile_state_seen, setup_call_booked, google_access_granted with route and minutes since sign-up, details_confirmed, reply_draft_ready, reply_approved with edited, seconds_to_approve and channel, reply_published, backlog_cleared, profile_change_decided, photo_published, post_published, weekly_report_opened, trial_converted, payment_failed, subscription_paused, subscription_cancelled); server-side events for access, publication and payment never inferred from the browser; first-touch and last-touch UTMs, `fbclid`, `fbp` and `fbc` saved on the user at sign-up server-side; partner and referral links set a first-party cookie for 90 days and are written to the business at sign-up; autocapture off inside the app; session replay off in the app; PostHog through a proxy on a Kabsi subdomain (for example `e.kabsi.co`, a Cloudflare Worker route); properties never include review text, names or emails; demo businesses never send events.
- Depends on: P0.6-01, P0.4-02.
- Model: Opus (session 11, R-42).
- Done when: a full mock sign-up to access run shows each event once in PostHog with the right properties (event list from PostHog in PROGRESS); the user row carries both touches and the click IDs; ad-blocker test: events still arrive through the proxy.
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo itskaysyoga-gif/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.6-02, then docs/KABSI-PROGRESS.md. Do only task P0.6-02. Follow section 2: apply database changes yourself, open the pull request, make sure CI is green, update PROGRESS on the branch, merge the pull request yourself, run the After-merge checks you can, then give Rashid the PR link and a 3-line summary. Stop and ask only before dropping tables or columns or deleting real data.
Read G-28, G-31, G-32 and G-44 in docs/source/KABSI-GROWTH.md. One name per action; the Meta names come in P0.6-03 from the G-47 table. Use the PostHog connector to confirm events arrive.
```

### P0.6-03 Meta Pixel and Conversions API with one event ledger

**Moved 21 Oct 2026 (R-42).** Runs after launch as session L2; gate: onboarding converts. No Pixel or Conversions API call is made before it.

- Decisions: G-19, G-47 (architecture and the name table), G-42, VIDEO Part 7 events list, K-118 (least-access system user), guardrail 0.7.
- Touches: browser Pixel on public pages only after consent (PageView, ViewContent on `/meta`); `meta_events` ledger keyed by business, event type and source event so retries never mint a new ID; Edge Function `meta-capi` sending CompleteRegistration (browser and server, shared event ID created in the browser and stored with the funnel record), GoogleAccessGranted (server, custom event, when backend confirms working access), Schedule (setup call booked, from the Calendly widget's browser message plus server), Purchase (server, after Creem confirms, value and currency, monthly and yearly distinguished; refunds corrected); payload with hashed email where consent allows, external ID, `fbp`, `fbc`, source URL, action source website; access token and dataset ID only in Supabase secrets (`META_CAPI_TOKEN`, `META_DATASET_ID`); never review text, Google data, tokens or Business Knowledge; demo and internal testers excluded.
- Depends on: P0.6-02, P0.6-09 (dataset and system user exist), P0.4-07 for Purchase (ship the rest first if Creem waits on D1).
- Model: Opus (session 11 for P0.6-05; session L2 for P0.6-09, P0.6-03, P0.6-04, R-42).
- Done when: each event shows in Events Manager Test Events as received, processed and deduplicated (screenshots or the Test Events code run recorded); a retried server send reuses the event ID (test); Event Match Quality noted for CompleteRegistration.
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo itskaysyoga-gif/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.6-03, then docs/KABSI-PROGRESS.md. Do only task P0.6-03. Follow section 2: apply database changes yourself, open the pull request, make sure CI is green, update PROGRESS on the branch, merge the pull request yourself, run the After-merge checks you can, then give Rashid the PR link and a 3-line summary. Stop and ask only before dropping tables or columns or deleting real data.
Read G-19 and G-47 in docs/source/KABSI-GROWTH.md and Part 7 of docs/source/KABSI-VIDEO.md. Check PROGRESS that Rashid created the Kabsi dataset and the "Kabsi CAPI" system user and put the token in Supabase secrets; if not, stop and ask. Use Meta's Test Events code for every check.
```

### P0.6-04 The /meta landing page

**Moved 21 Oct 2026 (R-42).** Runs after launch as session L2; gate: onboarding converts. Website v2 does not wait for it.

- Decisions: G-26, design review "Meta landing page", K-110, R-02, VIDEO "Make the click convert", G-12 speed target.
- Touches: route `/meta` (noindex) with five sections and nothing else: hero repeating the Reel's hook by `?angle=` (reviews, profile-changes, approval, or a trade), the K-110 explanation line, the CSS and SVG approval-card animation (under 60 KB, plays twice then rests), the price visible without scrolling, the R-02 button and "14 days free. No card. $19 a month after." only after the launch gate; how it works in 3 steps; four plain cards (Your reviews, Your details, Your posts and photos, Your week); trust (you approve everything, not affiliated with Google, free setup call, cancel any time); five FAQs and the final button; a sticky button bar on phones after the first scroll; W1 poster that loads the player only on tap; no menu, no comparison, no guide links.
- Depends on: P0.1-05, P0.6-01.
- Model: Opus (session 11 for P0.6-05; session L2 for P0.6-09, P0.6-03, P0.6-04, R-42).
- Done when: Lighthouse mobile on `/meta` shows LCP under 2.5 s (report saved); each angle changes only the hero and first proof section; Meta's Sharing Debugger reads the right title and image (Rashid or the chat records it).
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo itskaysyoga-gif/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.6-04, then docs/KABSI-PROGRESS.md. Do only task P0.6-04. Follow section 2: apply database changes yourself, open the pull request, make sure CI is green, update PROGRESS on the branch, merge the pull request yourself, run the After-merge checks you can, then give Rashid the PR link and a 3-line summary. Stop and ask only before dropping tables or columns or deleting real data.
Read G-26 and the "Meta landing page" bullet in docs/source/KABSI-DESIGN.md. No 3D, no carousel, no autoplay. Use the shared components and tokens.
```

### P0.6-05 Security headers, Turnstile everywhere, rate limits

- Decisions: G-15, G-16, K-42, K-100 (email-code limits if not done in P0.4-02), K-118 (Cloudflare row).
- Touches: response headers on kabsi.co (set in `vercel.json` on Vercel; no Cloudflare rules are needed because Cloudflare only holds DNS): HSTS, nosniff, Referrer-Policy, Permissions-Policy, CSP with `frame-ancestors 'none'` and the allow list (Meta, PostHog proxy, Sentry ingest, Turnstile, the Supabase project including websockets, Kabsi domains) in report-only mode with reports to Sentry; Turnstile with server checks on sign-up, login, both free tools, the partner form, the contact form and Nora's public tools; 10 requests a minute per IP on free-tool endpoints; Cloudflare managed rules and bot protection on; WAF; never cache app pages or API responses.
- Depends on: P0.1-03, P0.4-01.
- Model: Opus (session 11 for P0.6-05; session L2 for P0.6-09, P0.6-03, P0.6-04, R-42).
- Done when: `curl -sI https://kabsi.co` shows each header; CSP reports arrive in Sentry for a deliberate violation; a free-tool call without a token gets 400; a burst of 15 requests in a minute gets 429. Enforcing the CSP is a follow-up after 14 clean days (listed in PROGRESS with the date).
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo itskaysyoga-gif/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.6-05, then docs/KABSI-PROGRESS.md. Do only task P0.6-05. Follow section 2: apply database changes yourself, open the pull request, make sure CI is green, update PROGRESS on the branch, merge the pull request yourself, run the After-merge checks you can, then give Rashid the PR link and a 3-line summary. Stop and ask only before dropping tables or columns or deleting real data.
Read G-15 and G-16 in docs/source/KABSI-GROWTH.md. Set the headers in `vercel.json`, check them on a Vercel preview first, then on kabsi.co. Start the CSP in report-only mode.
```

### P0.6-06 Nora in sync: facts file, handover and evaluation

**Changed 21 Oct 2026 (K-144, 2.11, 2.12).** The facts file uses [COMING] for features not built yet and [CHANGING] for removals still in force; Nora says a [COMING] item is "not available yet" with no date, and never quotes an industry statistic. The evaluation adds questions on Essentials and Pro prices, what WhatsApp can approve, Kabsi Partners and the removed offers. Evaluation runs use stubs or `kabsi-reply-lab` until Hussein allows paid calls.

- Decisions: K-104, K-58, K-51, K-111 (rules), K-114.3 (never delete a duplicate), K-88 (reply promise), K-119, R-13.
- Touches: `knowledge/kabsi-facts.md` rewritten as the single list of facts Nora may state (prices, trial rules, onboarding routes and scenarios, the booking link with its three versions, support email, policies, the claims list, retention in plain words, eligibility, disconnect, what Kabsi never asks for); Nora answers product questions only from it and account questions only from live tools; handover rules (asks for a person, stuck, upset, unknown) offering the call with the right preselected answer, the support email, and "Write to hello@kabsi.co and we'll reply today" for urgent problems; any "delete" question gets the never-delete warning first; a 60-question evaluation (English first, then Spanish, French and Arabic for the questions owners write in) run in CI on every change to the facts file or Nora's prompt and blocking the merge on any contradiction; weekly list of unanswered questions for review.
- Depends on: P0.3-05 (list_tasks), P0.1-V3.
- Model: Sonnet (R-39; was Opus).
- Done when: the evaluation passes with zero honesty failures (score in PROGRESS); a changed price in the facts file without updating the evaluation fails CI; Nora never states a fact absent from the file in the evaluation run.
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo itskaysyoga-gif/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.6-06, then docs/KABSI-PROGRESS.md. Do only task P0.6-06. Follow section 2: apply database changes yourself, open the pull request, make sure CI is green, update PROGRESS on the branch, merge the pull request yourself, run the After-merge checks you can, then give Rashid the PR link and a 3-line summary. Stop and ask only before dropping tables or columns or deleting real data.
Read K-58, K-104 and K-111 in docs/source/KABSI-AUDIT.md. Every fact in the file must be true of the system on main today; anything not live is written as not available yet. Nora never asks for a password or a code.
```

### P0.6-07 Honest proof pages: founder note, About, Security

- Decisions: design review "Proof without customers" and "Other public pages" (About, Security), K-105 (Rashid by name and role, Kabsi's mark, no photo on partner surfaces), guardrail 23, G-39 tier 1.
- Touches: `about.tsx` (who runs Kabsi, why it exists, how to reach a person, the sign-off line), `security.tsx` lead (no password ever, Manager access you can remove, nothing posted without you, then what exists today: 30-day Google data, encryption, Advanced Protection on Kabsi's Google account), a short founder note block on the homepage, W4 slot on About.
- Depends on: P0.2-07.
- Model: Sonnet.
- Ask Rashid before: whether the founder note uses his photo (Rashid's, as founder) (the design review suggests it for the owner site; K-105 says no photo for partner surfaces).
- Done when: every claim on the three pages is true today (checked line by line against the facts file, list in PROGRESS); no testimonial, logo wall or number that is not Kabsi's own.
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo itskaysyoga-gif/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.6-07, then docs/KABSI-PROGRESS.md. Do only task P0.6-07. Follow section 2: apply database changes yourself, open the pull request, make sure CI is green, update PROGRESS on the branch, merge the pull request yourself, run the After-merge checks you can, then give Rashid the PR link and a 3-line summary. Stop and ask only before dropping tables or columns or deleting real data.
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
You are a Kabsi build chat. Work in the GitHub repo itskaysyoga-gif/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.6-08, then docs/KABSI-PROGRESS.md. Do only task P0.6-08. Follow section 2: apply database changes yourself, open the pull request, make sure CI is green, update PROGRESS on the branch, merge the pull request yourself, run the After-merge checks you can, then give Rashid the PR link and a 3-line summary. Stop and ask only before dropping tables or columns or deleting real data.
Read K-87 and K-118 in docs/source/KABSI-AUDIT.md. Use the Resend, Sentry, PostHog, UptimeRobot and Slack connectors to check and fix what they allow; list exact steps for Rashid for the rest. Never write a secret value anywhere.
```

### P0.6-09 Meta account fixes (VIDEO Part 7)

**Moved 21 Oct 2026 (R-42).** Runs after launch as session L2 with P0.6-03 and P0.6-04; gate: onboarding converts. Ads stay off until then.

- Decisions: VIDEO Part 7 "Meta account: current state and fixes" and "Before the first dollar", K-87 (second admin), G-47.
- Touches: `docs/marketing/meta-setup.md` with the exact clicks for each fix: confirm the contact email; business info and Business Verification after D1; second admin with two-factor; payment method, billing address and an account spending limit equal to the month's budget (keep USD and Beirut time); connect the Page and Instagram to the ad account and check Instagram is linked to the Page; create the "Kabsi Website" dataset and connect it to the ad account; move the Revelo and Cedar Spark datasets out (or stop using them in this portfolio); add kabsi.co under Domains and verify with a DNS TXT record in Cloudflare; create the "Kabsi" asset group and assign people to it; create the least-access system user "Kabsi CAPI" with access only to the dataset (and the ad account if needed), generate its token and store it as the Supabase secret `META_CAPI_TOKEN`, and the dataset ID as `META_DATASET_ID`; the custom audiences in Part 7 (created once events flow); Instagram and Facebook bios (K-112 wording: "Reviews and listing care for local businesses. Works with Google Business Profile."); the URL template for ads.
- Depends on: P0.1-03 (domain). Business info and verification use Hussein Slim's details (D1, R-25).
- Model: Opus (session 11 for P0.6-05; session L2 for P0.6-09, P0.6-03, P0.6-04, R-42).
- Done when: the setup file exists; Rashid ticks each step; the chat verifies what it can (the TXT record with `dig`, the secrets' presence by name through the Supabase connector, events in Test Events once P0.6-03 runs).
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo itskaysyoga-gif/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.6-09, then docs/KABSI-PROGRESS.md. Do only task P0.6-09. Follow section 2: apply database changes yourself, open the pull request, make sure CI is green, update PROGRESS on the branch, merge the pull request yourself, run the After-merge checks you can, then give Rashid the PR link and a 3-line summary. Stop and ask only before dropping tables or columns or deleting real data.
Read Part 7 of docs/source/KABSI-VIDEO.md. Write the step list for Rashid in plain words, one action per line, then verify each step he reports done with the tools you have. Business info and verification use Hussein Slim's details (R-25).
```

### P0.6-10 WhatsApp click-to-chat on the Kapso US number

**Changed 21 Oct 2026 (K-123).** The Lebanese number and every "kept on /lebanon" line are gone (P0.8-01). From P0.8-03 the same Kapso number also carries the owner channel.

- Decisions: K-122 (replaces the Numero part of K-121), K-121 points 3 to 5, K-103, G-36, K-57, R-29.
- Touches: `WHATSAPP_NUMBER` in `src/lib/site.ts` set to the Kapso number (deleted from Kapso on 22 Oct 2026; `WHATSAPP_NUMBER` is empty until a new number exists), replacing `CONTACT_PHONE` for support; a `wa.me` link with a short prefilled message on the contact page, footer, `/setup-call`, Nora's handover and support emails; the Kapso inbox profile text and quick replies written for Rashid in `docs/marketing/whatsapp-setup.md` (greeting, away message, quick replies: how to add Kabsi as Manager, the booking link with each answer, prices and trial, how to disconnect, "We never ask for your Google password or codes", labels), in whatever Kapso's inbox offers; `knowledge/kabsi-facts.md` and `public/llms-full.txt`: the number, "answered by a person", and Kapso and Meta named as the processors of WhatsApp messages; the Lebanese field contact kept only on `/lebanon` if Rashid wants it.
- Depends on: P0.1-03, Hussein's step 11 (Kapso account and the number's profile).
- Model: Sonnet.
- Done when: each placement opens WhatsApp with the prefilled text (URLs tested); no page shows the old number except `/lebanon` if kept; the setup file exists; the facts file names Kapso and Meta; WhatsApp here is people-answered only and approves nothing.
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo itskaysyoga-gif/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.6-10, then docs/KABSI-PROGRESS.md. Do only task P0.6-10. Follow section 2: apply database changes yourself, open the pull request, make sure CI is green, update PROGRESS on the branch, merge the pull request yourself, run the After-merge checks you can, then give Rashid the PR link and a 3-line summary. Stop and ask only before dropping tables or columns or deleting real data.
Use one WHATSAPP_NUMBER constant set to the Kapso number (deleted from Kapso on 22 Oct 2026; `WHATSAPP_NUMBER` is empty until a new number exists) (K-122). Keep the Lebanese number on /lebanon. WhatsApp here is people-answered only; it approves nothing and sends no alerts. Give Rashid the Kapso clicks one at a time in plain words and never ask for an API key in the chat.
```

### P0.6-12 WhatsApp privacy and processors

- Decisions: K-122, K-113 (Google data stays out of other tools), K-104.
- Touches: `/privacy` and `/terms` (Kapso and Meta listed as processors of WhatsApp messages, what is sent, retention of the conversation, the opt-in and STOP wording for later alerts), the processors row in P0.2-07's list, `knowledge/kabsi-facts.md` (Nora's facts: how WhatsApp works, who answers, that Kabsi never asks for a Google password or codes over WhatsApp, that nothing is approved over WhatsApp itself), `public/llms-full.txt`.
- Depends on: P0.2-07, P0.6-10.
- Model: Sonnet.
- Done when: `curl -s https://kabsi.co/privacy` names Kapso and Meta; Nora's facts file says the same and a Nora test question about WhatsApp answers from it; the processors list matches the live set.
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo itskaysyoga-gif/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.6-12, then docs/KABSI-PROGRESS.md. Do only task P0.6-12. Follow section 2: apply database changes yourself, open the pull request, make sure CI is green, update PROGRESS on the branch, merge the pull request yourself, run the After-merge checks you can, then give Rashid the PR link and a 3-line summary. Stop and ask only before dropping tables or columns or deleting real data.
Read K-122 in docs/source/KABSI-AUDIT.md. Describe only what is built: click-to-chat now, alerts and Nora on WhatsApp later (P1-21, P1-22), marked as not yet live.
```

### P0.6-11 Staff system health page

- Decisions: K-44 (staff part), K-36, K-35, guardrail 10.
- Touches: `/staff` System health: Google API errors by type, quota use, sync lag per business, failed and stuck publications (including `checking` older than an hour), dead-letter jobs with retry and cancel, photo processing failures, email and notification delivery, access errors, circuit breaker state; per-business diagnostics with technical detail and never credentials.
- Depends on: P0.1-13b, P0.5-01.
- Model: Sonnet.
- Done when: a forced dead job, a stuck `checking` publication and an open breaker each appear on the page (tests or SQL setup recorded); retry from the page moves a dead job back to pending.
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo itskaysyoga-gif/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.6-11, then docs/KABSI-PROGRESS.md. Do only task P0.6-11. Follow section 2: apply database changes yourself, open the pull request, make sure CI is green, update PROGRESS on the branch, merge the pull request yourself, run the After-merge checks you can, then give Rashid the PR link and a 3-line summary. Stop and ask only before dropping tables or columns or deleting real data.
Read K-44 in docs/source/KABSI-AUDIT.md. Staff only; owners see plain messages, never this page.
```
