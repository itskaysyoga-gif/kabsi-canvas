# Kabsi progress

Every build chat reads this file after `docs/KABSI-PLAN.md` and updates it before it ends (plan section 2.7). Newest log entries at the top.

## Where things stand

- Plan version 1 written on 4 Oct 2026 (pull request claude/plan-v2). Nothing in it has been built yet.
- Google: Gate A pending (case 1-4624000041157). Everything Google runs in mock mode.
- Live site: https://kabsi-app.lovable.app (new build, still with retired wording); kabsi.co still serves the old product until P0.1-03.
- Clean-up confirmed by Rashid on 4 Oct; project knowledge now holds the six source documents (folder `source/`) and KABSI-STICKER-SPEC.md only.
- P0.1-01 and P0.1-01b done (pull requests 13 and 15). P0.1-02a merged (17, 18). P0.1-02b merged in two parts (19, 20). The Deploy workflow now passes (fixed by PR 21). Still open before those can be marked done: the live-site and signed-in-app checks under After merge (the build sandbox cannot reach the site), and pasting the auth email templates into Supabase. The P0.1-02b test email was confirmed by Hussein on 4 Oct. P0.1-03 waits on Rashid's steps 1 and 2; P0.1-04 split in two: part A merged (PR 23), part B (daily AI budget) merged (PR 24). P0.1-05 (design tokens) merged (PR 25).

## Rashid's decisions and inputs (plan section 5)

| # | Item | Status |
|---|---|---|
| D1 | Legal seller | Decided 4 Oct: Hussein Slim (Dubai) holds the Creem account and is the seller; Meta business details and verification under the same name (R-25). Hussein agreed to be named on Creem, Meta and the site; no written agreement |
| D2 | First real live customer | Decided 4 Oct: Abou Hamze Auto Center (Bakaata). Owner agreed 4 Oct; Kabsi Clients group added as Manager and hello@kabsi.co accepted (Business Profile Manager shows Abou Hamze Auto Center and Yawmiyati, both Verified) |
| D3 | NFC shipping outside Lebanon | Decided 4 Oct: none |
| I1 | US WhatsApp number | Later; placeholder +961 3 956 917 in one constant meanwhile |
| I2 | Real screenshots of Google's People and access steps | Desktop done 4 Oct (`public/help/manager-steps/desktop/`, blurred); phone still to come |
| I3 | Referral reward | Decided 4 Oct: one free month |

## Steps only Rashid can do (plan section 5)

| # | Step | Needed by | Status |
|---|---|---|---|
| 1 | Connect kabsi.co in Lovable and add the DNS records in Cloudflare | P0.1-03 | Todo |
| 2 | Supabase Auth URL settings for kabsi.co | P0.1-03 | Todo |
| 3 | Google Cloud: Places quotas 100 a day, budget alerts, disable places-backend | P0.2-06 | Todo |
| 4 | Google Cloud and Search Console contacts and owners on kabsi.co addresses (K-99.3) | Any time in P0.1 | Todo |
| 5 | Supabase Auth Google provider with the OAuth client | P0.4-02 | Todo |
| 6 | Meta Business Settings items (P0.6-09 file) | P0.6-03 | Todo |
| 7 | Creem account (Hussein Slim) and keys in Supabase secrets | P0.4-07 | Todo |
| 9 | Paste the four `emails/auth/*.html` files into the Supabase Auth email templates (the login-code email still shows the old Beirut footer) | P0.1-02b done | Todo (Rashid, manual dashboard step; recorded 4 Oct at Hussein's request) |
| 8 | Hussein agrees to be named as seller | R-20 seller line, P0.4-07, P0.6-09 | Done 4 Oct (no written agreement, Rashid's decision) |

## Tasks

| ID | Task | Model | Status | PR | Date |
|---|---|---|---|---|---|
| P0.1-01 | Retire the old docs and move Nora's facts file | Sonnet | done (its leftover grep lines cleared by P0.1-01b) | 13 | 4 Oct 2026 |
| P0.1-01b | Remove leftover references to the retired docs | Sonnet | done | 15 | 4 Oct 2026 |
| P0.1-02a | Public site: wording that breaks Google's rules or describes removed features | Sonnet | merged (17, 18); live After-merge checks not run, see Evidence | 17, 18 | 4 Oct 2026 |
| P0.1-02b | App, emails and Nora: the same wording fixes | Sonnet | merged in two parts (19, 20); mock-review check passed; live app check and auth template paste still open | 19, 20 | 4 Oct 2026 |
| P0.1-03 | Move kabsi.co to the new build | Sonnet | todo | | |
| P0.1-04a | AI and Google-rules fixes in drafting, part A: replies and posts without contact details, no review-derived keywords, no report quotes, review cap | Opus | merged (23); After-merge checks partly run, see Evidence | 23 | 4 Oct 2026 |
| P0.1-04b | AI and Google-rules fixes in drafting, part B: `ai_usage` migration, per-business and global daily AI budget, owner message, #kabsi-alerts | Opus | merged (24); After-merge checks partly run, see Evidence | 24 | 4 Oct 2026 |
| P0.1-05 | Design tokens and shared components | Sonnet | merged (25); `/design` not yet looked at as staff | 25 | 4 Oct 2026 |
| P0.1-06 | Demo workspace with fictional businesses | Opus | merged (28, 29); After-merge: Deploy and ops_events checks passed; mock-review email check and browser checks still open, see Evidence | 28, 29 | 4 Oct 2026 |
| P0.1-V1 | Brand kit text and shot sheets for videos 1 to 8 | Sonnet (run on Opus in Hussein's session) | done (merged 31 on Hussein's "merge"; docs only, no After-merge checks) | 31 | 4 Oct 2026 |
| P0.1-V2 | Shot sheets for videos 9 to 16 and website videos W1 to W5 | Sonnet | PR open (docs only) | 32 | 4 Oct 2026 |
| P0.1-V3 | Setup-call and partner-call booking links | Sonnet | todo | | |
| P0.1-07 | Database test suite in CI | Opus | todo | | |
| P0.1-08 | Security hardening of the database API | Opus | todo | | |
| P0.1-09 | Tenant model: organisations, connections, subscriptions | Opus | todo | | |
| P0.1-10 | Append-only audit log and the "What Kabsi did" feed source | Opus | todo | | |
| P0.1-11 | One Google service layer | Opus | todo | | |
| P0.1-12a | Job queue and dispatcher, review jobs first | Opus | todo | | |
| P0.1-12b | Rate limiter, circuit breaker and the rest of the cron | Opus | todo | | |
| P0.1-13a | One publication pipeline: schema, claim, replies and undo | Opus | todo | | |
| P0.1-13b | One publication pipeline: posts, photos, hours, profile changes | Opus | todo | | |
| P0.2-01 | Retention table | Opus | todo | | |
| P0.2-02 | Disconnect Kabsi and access-change notices | Opus | todo | | |
| P0.2-03 | Business Knowledge table and the owner-approved baseline | Opus | todo | | |
| P0.2-04 | Google Protection on Google's update flow | Opus | todo | | |
| P0.2-05 | Email approvals tightened | Opus | todo | | |
| P0.2-06 | Places cost guard | Sonnet | todo | | |
| P0.2-07 | Privacy, terms and security pages that match the system | Sonnet | todo | | |
| P0.3-01 | Business Knowledge as the source for every draft | Opus | todo | | |
| P0.3-02 | Per-business memory and the grounded reply pipeline | Opus | todo | | |
| P0.3-03 | Three review risk levels | Opus | todo | | |
| P0.3-04 | Evaluation set and the prompt gate | Opus | todo | | |
| P0.3-05 | One task engine | Opus | todo | | |
| P0.3-06 | Roles and approval policies | Opus | todo | | |
| P0.3-07 | Home is the Action Center | Sonnet | todo | | |
| P0.3-08 | App navigation and product names | Sonnet | todo | | |
| P0.3-09 | Review screen built for a phone | Sonnet | todo | | |
| P0.3-10 | Clear the backlog on day one | Sonnet | todo | | |
| P0.3-11 | Google Profile screen | Sonnet | todo | | |
| P0.4-01 | Free snapshot and Google Profile Check | Sonnet | todo | | |
| P0.4-02 | Sign-up sheet: Continue with Google or an email code | Opus | todo | | |
| P0.4-03 | Manual Manager route with a live status | Sonnet | todo | | |
| P0.4-04 | Diagnosis, scenario screens and reminders | Sonnet | todo | | |
| P0.4-05 | Five questions and confirm your details | Sonnet | todo | | |
| P0.4-06 | The trial | Opus | todo | | |
| P0.4-07 | Creem: checkout, webhook, portal | Opus | todo | | |
| P0.4-08 | One email template and the email set | Sonnet | todo | | |
| P0.4-09 | Notification engine | Sonnet | todo | | |
| P0.4-10 | Behaviour-triggered lifecycle emails | Sonnet | todo | | |
| P0.4-11 | "Need a hand?" on every onboarding step | Sonnet | todo | | |
| P0.5-01 | Photo engine, cover and logo | Opus | todo | | |
| P0.5-02 | Posts: three types, checks and the month view | Sonnet | todo | | |
| P0.5-03 | Hours: one editor and the holiday calendar | Sonnet | todo | | |
| P0.5-04 | The Weekly Care Report | Sonnet | todo | | |
| P0.5-05 | Insights: one sentence and four tiles | Sonnet | todo | | |
| P0.6-01 | Consent banner and proof of consent | Opus | todo | | |
| P0.6-02 | Product events, attribution and onboarding funnel | Sonnet | todo | | |
| P0.6-03 | Meta Pixel and Conversions API with one event ledger | Opus | todo | | |
| P0.6-04 | The /meta landing page | Sonnet | todo | | |
| P0.6-05 | Security headers, Turnstile everywhere, rate limits | Opus | todo | | |
| P0.6-06 | Nora in sync: facts file, handover and evaluation | Opus | todo | | |
| P0.6-07 | Honest proof pages: founder note, About, Security | Sonnet | todo | | |
| P0.6-08 | Supporting platforms checked against K-118 | Sonnet | todo | | |
| P0.6-09 | Meta account fixes (VIDEO Part 7) | Sonnet | todo | | |
| P0.6-10 | WhatsApp click-to-chat on the US number | Sonnet | todo | | |
| P0.6-11 | Staff system health page | Sonnet | todo | | |
| P0.7-01 | Gate A day: capture real responses | Opus | todo | | |
| P0.7-02 | business.manage verification package | Opus | todo | | |
| P0.7-03 | Google notifications through Pub/Sub | Opus | todo | | |
| P0.7-04 | The switch to live | Opus | todo | | |
| P0.7-05 | Internal live test on Kabsi's own profiles | Opus | todo | | |
| P0.7-06 | Page-by-page audit, contradiction sweep and the test matrix | Sonnet | todo | | |
| P0.7-07 | First real customer end to end, and the launch gate | Opus | todo | | |
| P1-01 | Partner organisation, client onboarding and approval policies; Partners page rewrite for agencies | Opus | todo | | |
| P1-02 | Portfolio dashboard | Sonnet | todo | | |
| P1-03 | Partner branding and client reports | Sonnet | todo | | |
| P1-04 | Referral attribution and commission from the payment webhook | Opus | todo | | |
| P1-05 | Website importer | Opus | todo | | |
| P1-06a | Description, opening date, Google's checklist mirrored | Sonnet | todo | | |
| P1-06b | Services by interview, custom services | Sonnet | todo | | |
| P1-06c | Attributes in Google's groups | Sonnet | todo | | |
| P1-06d | More hours, social and chat links, action links, products | Sonnet | todo | | |
| P1-07 | Installable app and web push | Sonnet | todo | | |
| P1-08 | Daily check of the links customers tap | Sonnet | todo | | |
| P1-09a | Monthly and quarterly care routine | Sonnet | todo | | |
| P1-09b | Search terms, photo prompts from search gaps, change detection | Sonnet | todo | | |
| P1-10 | Review themes on request | Opus | todo | | |
| P1-11 | Get Reviews redesign and the print designer | Sonnet | todo | | |
| P1-12 | Staff two-step sign-in and owner diagnostics | Opus | todo | | |
| P1-13 | The weekly numbers dashboard | Sonnet | todo | | |
| P1-14a | Facts page | Sonnet | todo | | |
| P1-14b | Comparison pages | Sonnet | todo | | |
| P1-14c | Guides launch set of 10, then one a week | Sonnet | todo | | |
| P1-14d | Industry pages to the G-06 standard | Sonnet | todo | | |
| P1-14e | Homepage rebuild | Sonnet | todo | | |
| P1-15 | Growth loops | Sonnet | todo | | |
| P1-16 | "Your year on Google" | Sonnet | todo | | |
| P1-17 | Short videos through the photo pipeline | Sonnet | todo | | |
| P1-18 | "Connect with Google" route | Opus | todo | | |
| P1-19 | Speed and caching | Sonnet | todo | | |
| P1-20 | Pricing page rebuild | Sonnet | todo | | |

## After merge

After the P0.1-06 part A pull request (28) is merged: the function versions are done (see Evidence). Still open:
- A mock review added to a demo business (`mock_google_reviews`, google_location_id `locations/demo-harbour-lane-coffee`) is synced and drafted, and its email goes only to the demo login: `select to_address from emails where location_id in (select id from locations where is_demo)` returns only that address. Then the mock review, its review row, draft and action tokens are deleted (Hussein's "apply").
- `select count(*) from ops_events where created_at > '<seed time>' and (title ilike '%Harbour Lane%' or title ilike '%Juniper%')` is 0.

After the P0.1-06 part B pull request is merged and Lovable has deployed `main`:
- Signed in as the demo login at 390 px and 1440 px: the header shows the business name with a "Demo data" tag on Home, Reviews, Google Profile, Get Reviews and Settings, for both businesses.
- An email-link page (/a/...) for a demo review shows "Demo data" beside the logo; a link for a real business does not.
- In the browser's network tab on a demo screen: no requests to us.i.posthog.com after the page loads (Rashid or Hussein, any browser).
- Rashid records S01, S03, S05 and the review card on his phone and confirms in the chat (Done-when line 3).

After the P0.1-02b part B pull request (20) was merged: Deploy passed and the mock-review check passed (see Evidence). Still open:
- Paste the four `emails/auth/*.html` files into the Supabase Auth email templates (dashboard step for Rashid or Hussein); the dashboard copies still carry the old footer.
- Done 4 Oct: Hussein confirmed the "New review for Yawmiyati (3 of 5)" test email from screenshots on desktop and phone: the button reads "Review reply", the new footer shows, and there is no address.

After the P0.1-04b pull request (24) is merged (Deploy publishes `api`, `content`, `posts-weekly`):
- `select * from ai_usage where day = current_date` shows a row for Yawmiyati after the next mock review is drafted, with generations 1 or more and tokens above 0.
- An owner redraft beyond the business cap returns "Kabsi has written as many drafts as it can for this business today. New drafts start again tomorrow." (test by lowering `ai_daily_cap_business` for a minute, then setting it back to 60).

After the P0.1-04a pull request is merged (Deploy publishes `api`, `content`, `posts-weekly`) and Lovable has deployed `main`:
- Edge Function versions for `api`, `content` and `posts-weekly` are newer than the merge time (`list_edge_functions`).
- Live mock check on Yawmiyati: one mock review that asks for the business's number, drafted after the deploy; paste the draft body here and confirm it has no phone number, email, link, handle or hashtag, and that an unhappy reviewer gets "please contact us through the details on our profile".
- `select count(*) from weekly_reports where created_at > '<merge time>' and data::text ~ '"quotes"'` is 0 after the next Monday reports (the plan's Done-when says `body`; the column is `data`).
- In the app: the Posts page suggestions carry no "Customers mention this in reviews" chip; the Report page shows no "What customers wrote" block; About your business shows "Business phone" with the hint that Kabsi never writes a phone number in a public reply.

After the P0.1-02b part A pull request is merged and Lovable has deployed `main`:
- In the signed-in app at 390 px and 1440 px: navigation reads Home, Reviews, Google Profile, Get Reviews, Settings; Home shows "What needs your attention" with no score and no points; the reply button says "Approve reply"; the Google Protection page is titled that and its button reads "Keep my information"; Get Reviews shows "link activity" and the sentence "Activity is not the same as reviews. Google decides which reviews appear."

Checks that need a task's merged code live. The next build chat runs them first (plan section 2.5), records the evidence under Evidence and marks the task done.

After pull requests 17 and 18 are merged and Lovable has deployed `main`:
- On https://kabsi-app.lovable.app, `/`, `/pricing` and `/faq` each show the footer notice "Google and Google Business Profile are trademarks of Google LLC..." and the operator line "Kabsi is operated by Hussein Slim, Dubai, United Arab Emirates. Contact: hello@kabsi.co".
- The hero reads "Your reviews and listing. Taken care of." with the button "Join early access", and none of Profile Score, Do now, Listing Shield, "Get early access" or "Spring 19" appears on the public pages.
- Look at `/pricing` at 390 px and 1440 px: the "Early access" pill on four Pro lines (not yet checked in a browser).

## Evidence

(One block per finished task: the Done-when lines with their proof.)

### After-merge checks run at the start of the P0.1-V2 chat (4 Oct 2026, Hussein's session)
- `ops_events` since 12:15 UTC with Harbour Lane or Juniper in the title: 0 (read-only SQL). Demo `emails` rows: 0, demo `mock_google_reviews` rows: 24. The demo email check ("only the demo login") still has nothing to read: it needs a new mock review on a demo business, a database write that waits for Hussein's "apply".
- `list_edge_functions`: every function updated 2026-10-04 13:22 UTC, after the PR 31 merge.
- NOT run: the browser checks for P0.1-06 part B ("Demo data" tag at 390 and 1440 px, the `/a/...` tag, no PostHog requests) and Rashid's phone recordings; the sandbox cannot reach the live site. The Supabase Auth template paste (step 9) is still open.

### P0.1-V2 (branch claude/h-p0-1-v2, PR 32, 4 Oct 2026, Hussein's session)
- Thirteen files exist in `docs/marketing/shot-sheets/`: `V09.md` to `V16.md`, `W1.md` to `W5.md`. `docs/marketing/feature-truth.md` has a new table, "Videos 9 to 16 and website videos W1 to W5". No code changed, no database change.
- Format as V01: status, hooks, scenes, stills with the style line, Higgsfield clips, voice one sentence per line, caption, CTA before and after the gate, screen code with the demo flow, files, claims check. W1 to W5 add the website rules (click to play, poster, VTT, "Kabsi is not affiliated with Google."; W2 loops MP4 and WebM under 1.5 MB at 720 px).
- Done-when lines: V09, V03 (V1) and W4 carry the "AI presenter" tag and "Presenter is AI-generated"; V12, V13, V14 and W5 carry them too. V13 and W5 say "after the partner workspace (P1-01)". V16 is a guide with an eight-item consent checklist, the three-question email and the rules for a customer's claims.
- Checks: Python scan of the new files for em dash, en dash and exclamation mark, 0 hits. `grep -niE "automatically|real-time|24/7|rank higher|one tap|in seconds|guarantee|best|easiest|google protection|profile score"` matches only "never say" and "no ..." lines. `npx prettier --write docs/marketing` run. No app checks needed (docs only).
- Where the sheets differ from the VIDEO plan, on purpose, and why: button text "Keep my information" (not "Keep my hours") and "Posted" (not green "Published"), because the app says so; V10 "before the holidays" (not "every public holiday"), because P0.5-03 has a country table; V15 drops "and the button to do it", because Nora has no action button (checked `assistant-widget.tsx` and the tool list in `assistant/index.ts`); V09 "Reviews come in, and details can change" (not "pile up ... change"), because the rules forbid generalisations about the viewer's business; V14 adds "Google decides whether a reported review is removed" and a source line; V13 and W5 take the commission and resale numbers from the Partners page terms, not from the sheet.
- Not checked: Google's help page titles (the sandbox cannot reach Google); the real timing of the Kabsi voice on each script (Rashid generates and times it, V09 has a trim rule).

### P0.1-V1 (branch claude/h-p0-1-v1, PR 31, 4 Oct 2026, Hussein's session)
- Ten files exist: `docs/marketing/brand-kit.md`, `docs/marketing/feature-truth.md`, `docs/marketing/shot-sheets/V01.md` to `V08.md`. No code changed.
- Each shot sheet has: status, hooks A, B, C, scene list with times, Gemini prompts with the style line, Higgsfield model and motion prompts, voice lines one sentence per line with numbers as words, on-screen text, post caption, CTA before and after the launch gate, the product screen codes with the exact demo flow (business, reviewer, taps), file names, and a claims check.
- "Record after task X" (R-10 and plan section 16): V02 after P0.2-04; V03 full version after P0.3-07, P0.2-04, P0.5-04 and P0.1-V3 (a short version with S01 and S05 only can be recorded now); V08 after P0.5-04, P0.3-07 and P0.2-04. V01, V04, V05, V06 and V07 can be recorded now; V01, V05 and V07 carry the "Early access" tag because real owners get team posting until P0.7-04.
- Claims: `grep -rniE "automatically|real-time|24/7|rank higher|one tap|in seconds|guarantee|best|easiest" docs/marketing` matches only the "never say" column of the claims table and one "no automatically" note. No em dash, en dash or exclamation mark in the ten files (checked with a Python scan). "Google Protection" appears only in instructions to Rashid, never in a voice line, caption or on-screen text.
- Screen facts checked against the code: reply button "Approve reply" (`inbox.tsx`, `a.$token.tsx`), "Posted. It shows on Google within a few minutes." for the demo (mock), the early-access text for real owners (`concierge-copy.ts`), "You're all caught up." (`inbox.tsx`), demo reviewers and drafts (`supabase/seed/demo.sql`), demo review link HBRDM2 opening kabsi.co, logo `public/kabsi-mark.svg`, colours from `src/styles.css`.
- `npx prettier --write docs/marketing` run. No app checks needed (docs only).

### "Approve" copy on the Reviews screens (branch claude/h-approve-copy, 4 Oct 2026, Hussein's request, not a plan task)
- The reply button reads "Approve reply" since P0.1-02b; the text around it still said "Post". Changed: Reviews header "Nothing goes on Google until you approve it."; draft heading "Your reply, ready to approve"; draft hint "Change anything you like. Kabsi publishes exactly this text after you approve." (Reviews and the email-link page `/a/...`); Home "Nothing goes on Google until you approve it." and "...change it if you like, and approve it."; the partner invite email (`partner` function, HTML and text) "Nothing goes on Google until you approve it."; `knowledge/kabsi-facts.md` two FAQ answers; `public/llms-full.txt` rebuilt (13250 words).
- Kept on purpose: Posts and Photos say "tap Post to Google", which is the real button on those screens.
- `grep -rn "tap Post" src supabase/functions knowledge` leaves only the Posts line ("tap Post to Google").
- Checks: typecheck clean; eslint on the 3 changed screens 0 problems; prettier clean on them (`partner/index.ts` was already not prettier-formatted before this change; CI does not check it); `npm test` 19 passed; `check:tokens` ok; build ok. `deno check` not run here (deno is not installed in this sandbox); CI runs it.
- Not checked in a browser: the Supabase host and the live site are blocked from the sandbox.

### P0.1-06 After-merge checks (run 4 Oct 2026, 12:56 UTC, Hussein's session)
- Deploy run 11 (7dcb18f, PR 29) success; `list_edge_functions` shows every function updated 2026-10-04 12:51:35 UTC (`api` 39, `content` 32, `partner` 25).
- `select count(*) from ops_events where created_at > '2026-10-04 12:15 UTC' and (title ilike '%Harbour Lane%' or title ilike '%Juniper%')` = 0. Demo businesses 2; demo mock reviews 24.
- Demo emails: `emails` has no row for a demo business yet (no new demo review since the seed), so the "only the demo login" check has nothing to read. It needs a new mock review on a demo business (a database write, waits for Hussein's "apply").
- NOT run: the part B browser checks ("Demo data" tag at 390 and 1440 px, `/a/...` tag, no PostHog requests) and Rashid's phone recordings. `kabsi-app.lovable.app` is blocked from the sandbox (curl status 000).

### P0.1-06 part B (branch claude/h-p0-1-06b, 4 Oct 2026, Hussein's session)
- "Demo data" tag: the shared `ExampleBadge` (guardrail 23 label) with the text "Demo data". In the app it sits beside the business name in the sticky header (`app-layout.tsx` LocationMenu), so every app screen shows it; on the email-link page it sits beside the logo (`ConfirmLayout` gets `demo`, `/a/$token` passes it from the action API, which now returns `demo` from `locations.is_demo` for review and listing-change links). `src/lib/onboarding.ts` reads `is_demo` with the other location columns.
- PostHog: `setAnalyticsPaused` in `src/lib/telemetry.ts` (opt out of capturing and drop `track` calls) is switched on by the app layout while a demo business is open and by the email-link page for a demo link; a real business turns it back on. Test `tests/telemetry-demo.test.ts` written first: 2 failed before the change, 2 passed after.
- Checks: `npm run typecheck` clean (after one fix: the loading screen keeps a plain `ConfirmLayout`); eslint on the 7 changed files 0 problems; prettier clean; `npm test` 19 passed; `check:tokens` ok; `check:anon` ok; `npm run build` ok; `deno check api/index.ts` (repo script settings) passes.
- `knowledge/kabsi-facts.md` "Is there a demo?" names the demo workspace, its two invented businesses and the "Demo data" tag; `public/llms-full.txt` rebuilt (13249 words).
- Not checked: the screens in a browser. The Supabase host is blocked from the sandbox, so the signed-in app and the action API cannot load here; listed under After merge.
- Known limit: the auth provider identifies the user to PostHog at sign-in, before the business (and so `is_demo`) is known; the demo login can send that one identify call. Everything after the business loads is paused. Listed under Decisions to confirm.

### P0.1-06 part A (branch claude/h-p0-1-06, 4 Oct 2026, Hussein's session)
- Demo login: Hussein chose rashid.hamzy+kabsidemo@gmail.com (sign-in codes reach Rashid's inbox, no manual step; can move to demo@kabsi.co later). The address is kept out of the repository: it lives in `app_settings.demo_login_email`, read by `public.demo_login_email()` (service role only).
- Migration `20261004120000_demo_workspace.sql` shown to Hussein and applied after his "apply" (4 Oct). First attempt failed and rolled back as a whole (`cannot remove parameter defaults` on `ops_digest`; read back: no `is_demo` column, cap still 30); the file now keeps `p_hours integer default 24` and the second apply succeeded. Read back: `concierge_cap` 20, 9 ops triggers carry a WHEN condition, `ops_digest` keeps `DEFAULT 24`, `authenticated` cannot run `demo_login_email()` or `email_allowed_for_location()`.
- Security advisors after it: three new warnings, `is_demo_location`, `is_demo_login`, `is_demo_user` executable by anon and authenticated. Fix in `20261004121000_demo_login_grants.sql` (anon loses all three, `is_demo_login` only for supabase_auth_admin and service_role), applied after Hussein's "apply A" (4 Oct). Read back with `has_function_privilege`: anon false on all three; `is_demo_login` true only for service_role and supabase_auth_admin; `is_demo_location` and `is_demo_user` true for authenticated and service_role. Advisors after it: no anon finding for the demo functions and none for `is_demo_login`; `is_demo_location` and `is_demo_user` stay listed for authenticated, on purpose (they return only true or false and sit in trigger conditions on tables signed-in users have grants on, like `is_member` and `is_staff`).
- Local proof on a throwaway Postgres 16 with a stub of the live tables and triggers: migration and seed apply; the seed runs twice without error or duplicates (2 demo businesses, 24 reviews, 9 drafts, 1 open hours change, Thanksgiving 26 Nov and Christmas Eve drafts); demo email, demo chat (by location and by the demo user), demo plan and demo location update give 0 ops events, while a real signup and a real business give 2; a demo business with a partner is refused (check `demo_has_no_partner`); `email_allowed_for_location` false for another address, true for the demo login (any case) and for a non-demo business.
- Code: `_shared/demo.ts` (`locations/demo-` ids, `googleModeFor`), `_shared/google.ts` (all 8 mock checks per business: a demo business is mock even when GOOGLE_MODE is live), `_shared/kabsi.ts` (`sendEmail` asks `email_allowed_for_location` before writing a row; a refused address writes nothing and sends nothing), `posts-weekly` (skips `is_demo`). Test `_shared/demo.test.ts` written first; it failed (module not found), then 2 passed.
- `deno check` passes for 15 of 16 functions; `site-assets` not checked here (deno.land unreachable from the sandbox, import unchanged; CI checks it). `deno test --no-check _shared/`: 45 passed.
- R-09: `concierge_cap` 30 to 20; `knowledge/kabsi-facts.md` (two lines) and `src/lib/concierge.ts` say 20 businesses; `public/llms-full.txt` rebuilt (13211 words).
- PR 27 test data deleted on Hussein's "apply" (4 Oct): 3 `action_tokens`, 1 `reply_drafts`, review 9c758bf2-d99d-4b7d-b03a-e0455bd5f999, mock row mock-4d80969db7fc4cf6ad8c9efac5d9dde8. Kept: email row 87c67339-587a-4c0e-a5bc-bf56140e8690 and today's `ai_usage` row.
- Demo login created by Hussein in the Supabase dashboard (4 Oct, 12:11 UTC; email confirmed; the dashboard required a password, nobody keeps it; the login uses email codes). One Slack "New account" message (ops_events 1238, #customers) went out at 12:11 because `demo_login_email` was not set yet when the user was created; already sent, nothing to undo; later demo signups are filtered.
- `app_settings.demo_login_email` set, then `supabase/seed/demo.sql` run after Hussein's "apply" (4 Oct). First run failed and rolled back whole (`urgency_reasons` is not null in the live table; read back: 0 demo rows); the seed now writes `'{}'` there and `'[]'::jsonb` for `reply_drafts.safety_notes`, checked against every not-null column of the 12 tables; second run after Hussein's second "apply" succeeded.
- Read back after the seed: Harbour Lane Coffee and Juniper Hair Studio active, 2 memberships, 24 reviews (9 waiting, 9 drafts), 24 mock reviews, 1 open hours change, 2 weekly reports, special hours 2026-11-26 Thanksgiving and 2026-12-24 Christmas Eve, 1 post idea, 2 review links; `emails` 0 and `plans` 0 for demo businesses; no `ops_events` row from the seed (only 1238 above in that window); `refresh_location_status` on the café returns active; `ops_digest` businesses_active_total 2 (same as before the seed: the demo businesses are not counted).
- Sign-in check: the sandbox proxy refuses ynjdqjlmdwjgbfezevxy.supabase.co (CONNECT 403), so it could not run from the build chat. Hussein checked it by hand on 4 Oct: the code arrived in Rashid's inbox, he signed in and saw both demo businesses. Database read-back: the demo login's `last_sign_in_at` 2026-10-04 12:41:45 UTC; no `ops_events` row after 1238, no `emails` row and no chat for the demo businesses.
- PR 28 merged by Hussein's "merge" (squash 197c64e, 12:20 UTC). `list_edge_functions` after the Deploy: every function updated 2026-10-04 12:21:17 UTC (`api` 38, `content` 31, `posts-weekly` 27, `partner` 24), after the merge.

### Email buttons and phone layout (branch claude/h-email-buttons, 4 Oct 2026, Hussein's request, not a plan task)
- Review email: one yellow "Review reply"; "Open Kabsi" is now a text link on the same wrapping line as Edit and Skip. Daily digest (several reviews in one email): each review has text links only (Review reply, Edit, Skip) and the layout's yellow "Open Kabsi" is the one button. Urgent and "no safe draft" emails keep text links plus the layout's yellow "Open Kabsi". Every other template already had one layout button and no other yellow; the layout is shared, so they all got the new button size.
- Phone and desktop rules now in `_shared/email-layout.ts` (moved out of `kabsi.ts`, re-exported, so Deno tests can import it without env access): one column, 16 px body, card padding 32 and 24, button full width up to 320 px, height 52 px, text links 44 px tall and wrapping. Weekly Care Report rows (label beside value) and the staff Nora chat email (label cell beside value, 14 px) are now one column at 16 px.
- Tests: `_shared/email-layout.test.ts`, 6 tests (one yellow, own button plus links still one yellow, 44 px, 16 px and viewport, button width). `deno test --no-check _shared/`: 43 passed. `deno check` passes for every function except `site-assets` (deno.land unreachable from this sandbox, import unchanged).
- Rendered the single review, digest and Google Protection emails in Chromium at 390 px and 1440 px: no horizontal scroll, body 16 px, "Review reply" 52 px tall and 310 px (390) or 320 px (1440) wide, Edit, Skip and Open Kabsi 44 px tall on one line. Screenshots were not committed.
- Not checked: the email in real mail apps (Gmail, Apple Mail, Outlook). Hussein checks the test email on phone and laptop after merge.
- `knowledge/kabsi-facts.md` line 83 updated; `public/llms-full.txt` rebuilt.

### P0.1-05 (branch claude/h-p0-1-05, PR 25, 4 Oct 2026, Hussein's session)
- `src/styles.css`: one `@theme` block (fonts, 14 colours incl. new `kb-amber` #B45309 and `kb-amber-soft` #FEF3C7, type scale `text-kb-hero` to `text-kb-caption`, spacing `kb-section`, `kb-section-sm`, `kb-gutter`, container `kb`, radii, `shadow-kb`, `shadow-kb-lift`). Existing colour values unchanged. The old `--kb-*` variables were only used in styles.css and are gone. Built CSS contains `--color-kb-amber-soft:#fef3c7` and `.text-kb-hero`.
- Components in `src/components/ui/`: Button (`primary`, `secondary` black outline, `tertiary` link; the unused black-filled `secondary` was replaced, `default` and `outline` kept), `status-pill.tsx`, `example-badge.tsx`, `kabsi-card.tsx`, `step-list.tsx`, `banner.tsx`. No existing screen changed.
- `node scripts/check-tokens.mjs` on the repo: `Design tokens ok (154 files).` exit 0. On `tests/fixtures/bad-tokens.txt`: exit 1 with arbitrary hex colour, colour function and font lines. Test `tests/check-tokens.test.ts` (2 tests) passes. CI step "Design tokens (K-108)" added to `.github/workflows/ci.yml`; `npm run check:tokens` added.
- `/design`: `src/routes/_authenticated/design.tsx`, noindex head, `Disallow: /design` in `public/robots.txt`, non-staff get `<Navigate to="/app">` (same `amStaff` check as `/staff`). Not run in a browser: no staff login in this session.
- Yellow in `components/ui` (grep `kb-yellow`): `button.tsx` primary and default, `banner.tsx` needsYou, `kabsi-card.tsx` needsYou. Nothing else.
- Checks: `npm run typecheck` clean; `npm test` 17 passed; `npm run build` ok (regenerated `routeTree.gen.ts`, 21 added lines for `/design`); eslint on changed files 0 errors, 3 fast-refresh warnings; prettier clean. Deno check not run (no Edge Function changed). `knowledge/kabsi-facts.md` not changed: no owner-facing behaviour or wording changed.
- Not checked: `/design` at 390 px and 1440 px.

### After-merge checks for P0.1-04a and P0.1-04b (run at the start of the P0.1-05 chat, 4 Oct 2026)
- Deploy runs 7 (819f1f2) and 8 (09c2a0e) both success. `list_edge_functions`: `api` 36, `content` 29, `posts-weekly` 25, all updated 2026-10-04 08:20:51 UTC, after both merges.
- `weekly_reports` rows created after 08:11 UTC with `"quotes"` in `data`: 0 (no report has run since the merge, so this is not conclusive until the next Monday reports).
- `ai_usage`: 0 rows, caps `ai_daily_cap_business` 60 and `ai_daily_cap_global` 3000.
- Live mock check run 4 Oct after Hussein's "apply": mock review (3 stars, asks for phone and email) inserted into `mock_google_reviews` for Yawmiyati at 08:35:29 UTC; cron synced it and drafted at 08:40:07. Draft body: "Thank you for sharing your feedback. We understand that waiting without an answer is frustrating. Please contact us through the details on our profile so we can hear more about what happened. Yawmiyati Team" (regex for 7 or more digits, @, link, www, # matches nothing). `ai_usage` row for Yawmiyati: generations 1, input tokens 2032, output tokens 409. Email row 1cb757d9-ba6b-4e7e-a023-d5852f3e19f0 (review_new, sent) kept as the record. Test data deleted after the check: 3 `action_tokens`, the `reviews` row (draft cascaded), the mock row. The `ai_usage` row for today stays (harmless).
- STILL OPEN: the cap test (an owner redraft past the cap returns the "Kabsi has written as many drafts as it can..." message) needs a signed-in owner session; not run. Also open: the app-screen checks for 04a and 04b, and `/design` as staff at 390 and 1440 px.
- (Superseded by the two lines above.) NOT run yet: the live mock review on Yawmiyati (draft without contact details, `ai_usage` row), the cap test, and the app-screen checks (need a signed-in browser). The first two write to the database and wait for Hussein's "apply". Tasks 04a and 04b stay "merged" until these pass.

### P0.1-04b (branch claude/h-p0-1-04b, PR 24, 4 Oct 2026, Hussein's session)
- Migration `20261004090000_ai_usage.sql` shown to Hussein part by part; applied with `apply_migration` after his "apply" (success). Additive only: table `ai_usage`, index, settings `ai_daily_cap_business` 60 and `ai_daily_cap_global` 3000, functions `ai_budget_take` and `ai_usage_add` (service role only).
- Security advisors after the migration: nothing new for `ai_usage` or the two functions (the listed items all predate this change).
- Rolled-back proof on Yawmiyati (one DO block ending in an exception): `first take=ok, row=1/1200/150, at business cap=business, generations still=1, at global cap=global, again=global, alerts queued=1, anon can run=false, authenticated can run=false, authenticated can add=false, service_role can run=true, authenticated can insert=false`. Afterwards: 0 `ai_usage` rows, caps back at 60 and 3000, 0 `ai_global_cap` events.
- `deno check` api, content, posts-weekly pass; `deno test --no-check _shared/` 37 passed. CI run 24 green before the PROGRESS commit.

### P0.1-04a (branch claude/h-p0-1-04, 4 Oct 2026, Hussein's session)
- Split: the full task changes 15 code files, over the 10 in plan section 2.5. Part A (this pull request) is the drafting rules, no database change; part B is the `ai_usage` migration and the daily budget.
- Tests written first in `supabase/functions/_shared/drafting.test.ts`; the first run failed (`Module not found ... contact.ts`), then 8 of 8 passed after the change. Done-when tests: "a review that asks for the number gets a draft with no run of 7 or more digits" (a stub model that repeats any phone it is given; the prompt no longer carries `contact_phone`), "a post draft with 'call 555 0100' fails the check", "a 10,000-character review is fenced at 4,096 characters", "keyword suggestions never come from reviews". Also: the code check blocks phone, email, link, handle, hashtag and unlisted price before any model call; dates, times, years and "#1" pass.
- `deno test --no-check _shared/`: 37 passed, 0 failed. `deno check` passes for every function except `site-assets`, which fails here only because the sandbox cannot reach deno.land (its import is unchanged); CI runs it.
- `npm run typecheck` clean, `npm test` 15 passed, `npm run build` ok, eslint and prettier clean on the three changed screens (one existing warning in `knowledge-form.tsx` line 244, not from this change).
- Before this change, live: 3 of 3 `weekly_reports` rows carry `"quotes"` (read-only SQL, 4 Oct).
- Screens not checked in a browser at 390 px or 1440 px in this session (wording-only changes and one removed block).
- `knowledge/kabsi-facts.md` updated (after Hussein allowed it): the About your business phone row, the clinic and garage notes, the negative-review advice (no phone, email or link in a reply), a new FAQ "Will a reply include my phone number, email or website?", the weekly report answer (no customer quotes), the retention row and the Search phrases glossary entry (never from reviews). `node scripts/build-kb.mjs` rebuilt `public/llms-full.txt` (13,108 words).

### Deploy workflow fix and P0.1-02b part B After-merge checks (4 Oct 2026, Hussein's session)
- Deploy run 5 (37185310050, merge of PR 20, commit 2a204f9): Edge Functions job success, Worker kabsi-go job failure. Log line: "Missing entry-point: The entry-point should be specified via the command line ... or the `main` config field." The four runs on 29 Sep had the same shape (Edge Functions success, Worker failure).
- Cause: `cloudflare/wrangler-action@v3` installs Wrangler 3.90.0 by default, which does not read `workers/kabsi-go/wrangler.jsonc`. Reproduced with `wrangler deploy --dry-run` on a clean copy of the folder: 3.90.0 fails with the same error; 3.114.17 bundles the Worker (3.41 KiB) and lists the STICKERS binding and vars.
- Fix: PR 21 pins `wranglerVersion: "3.114.17"` in `.github/workflows/deploy.yml` (merged as 7b82144). Deploy run 6 (37185695836) on 7b82144: both jobs success. This was the first Worker deploy from CI, so the Worker code on main is now live on go.kabsi.co; the TAP_SECRET set in the Cloudflare dashboard is untouched by `wrangler deploy`.
- Edge Function versions after run 6 (`list_edge_functions`): `api` 34, `content` 27, `assistant` 21, all updated 2026-10-04 about 07:25 UTC, after the PR 20 merge.
- Mock-review check on Yawmiyati (location 9803ee99-fee8-4c6a-abb4-1a830fcbb438, mock mode): `staff_mock_review` needs a staff login that the Supabase connector does not have, so the same row it writes was inserted into `mock_google_reviews` (review id mock-eafac0a35ce9446684800827a9285d6e, 3 stars, reviewer "Deploy check", 07:27:37 UTC). The cron synced it at 07:30:03 (reviews row e3852d23-d5ff-4253-829c-001e0f61df61, state drafted, one reply draft) and sent the email at 07:30:08: `emails` row 84558298-d9f7-4d72-8f19-02b99d59f869, kind review_new, status sent, subject "New review for Yawmiyati (3 of 5)", to rashid.hamzy@gmail.com, resend_id 01a105d1-f845-7ee8-b09d-3a13d23eb9db.
- Wording in the deployed code (`get_edge_function` for `api`, searched for strings): "Review reply" 2 hits, "Nothing is published until you approve it." 1, "trademarks of Google LLC" 1, "Kabsi is operated by Hussein Slim, Dubai, United Arab Emirates" 1; "Beirut, Lebanon", "only posts what you approve", "Put mine back" and ">Post<" 0 hits.
- Plan correction: the `emails` table has no body column (columns: id, location_id, partner_id, kind, to_address, subject, resend_id, status, error, dedupe_key, created_at). The plan's "check the `emails` row body" (P0.1-02b Done when, and the standard prompt) cannot be done. The check is the sent email (row exists with status sent, then read the inbox) plus the wording in the deployed function code.
- Test data clean-up (applied on Hussein's "apply", 4 Oct 2026, one statement): deleted 3 `action_tokens` rows for the review, the `reviews` row e3852d23-d5ff-4253-829c-001e0f61df61 (its one `reply_drafts` row went with it, `on delete cascade`) and the `mock_google_reviews` row mock-eafac0a35ce9446684800827a9285d6e; the statement returned 3, 1 and 1 deleted rows. A read-back shows 0 rows in `mock_google_reviews`, `reviews`, `reply_drafts` and `action_tokens` for those ids. The `emails` row 84558298-d9f7-4d72-8f19-02b99d59f869 is kept as the record of the send.

### P0.1-02a After-merge checks (run at the start of the P0.1-02b chat, 4 Oct 2026)
- Live checks on https://kabsi-app.lovable.app NOT run: the build sandbox's egress proxy refuses that host (CONNECT 403). Hussein or the next chat with web access should run the three After-merge bullets above against the live site.
- Run instead on `main` at e6fe7cb (source only, not the deployed site): `src/lib/site.ts:28` holds the footer notice, `site.ts:17` builds the operator line from `LEGAL_SELLER` and `CONTACT_EMAIL`, `site.ts:20` and `:24` hold the brand line and "Join early access", `pricing.tsx:230` has the "Early access" pill. The retired-name grep over the public routes, `faq.ts`, `verticals.tsx`, `guides.tsx` and `public/llms.txt` (profile score, do now, listing shield, get early access, spring 19) returns nothing.
- Not checked: the pricing page at 390 and 1440 px.

### P0.1-02b part B (branch claude/h-p0-1-02b-b, 4 Oct 2026)
- Changed: `_shared/kabsi.ts` (footer: "Nothing is published until you approve it.", the full non-affiliation notice, the operator line; the Beirut address is gone), `_shared/reviews.ts` (email button "Review reply"), `_shared/shield.ts` (no "Put mine back" link; the email says what changed and has the button "Open Google Protection" to the app, no action tokens are created), `api/cron.ts` (trial and renewal emails use reply drafts, Google Protection, Weekly Care Report), `content/index.ts` (message and comment), `_shared/google.ts` (comment), `assistant/index.ts` (prompt and tool text; `get_profile_score` keeps its name and now returns only task title, reason and path, no score or points), `emails/auth/*.html` and `emails/build.py` (same footer; `python3 emails/build.py` output is identical to the committed html), `knowledge/kabsi-facts.md` and regenerated `public/llms-full.txt` (12919 words).
- Retired-name grep over `src supabase/functions emails public/llms.txt`, excluding the `get_profile_score` tool name, `lib/verticals.tsx` and `profile_tasks` identifiers, returns nothing. The facts file names the old terms once (line 83) so Nora can map an owner's old words to the new names.
- Checks: `npm run typecheck` exit 0; `npm test` 15 pass; `deno test --allow-env supabase/functions/_shared/` 29 pass; no em dash, en dash or exclamation mark in added copy (the two `!==` hits are code operators). NOT run locally: `bash scripts/deno-check.sh` (deno.land and the npm cache are unreachable from this sandbox), so the Deno type check is left to CI. No browser check (no screens in part B).
- Not changed: the Supabase Auth email templates are pasted into the Supabase dashboard by hand (see `emails/auth/README.md`); the four files here are the source, the dashboard copies still carry the old footer until someone pastes them.

### P0.1-02b part A (branch claude/h-p0-1-02b, 4 Oct 2026)
- Changed (12 files, copy and labels only, no schema, no URL change): `components/app/do-now.tsx`, `lib/profile.ts` (comment), `components/layouts/app-layout.tsx`, `routes/_authenticated/app/{index,inbox,reviews,shield,plan,cards}.tsx`, `routes/a.$token.tsx`, `components/assistant/assistant-widget.tsx` (comment), `components/onboarding/steps.tsx` ("Start free trial" became "Start trial", which P0.1-02a left for this task).
- Home: Profile Score number and points removed; list titled "What needs your attention"; order unchanged. Navigation: Reviews, Google Profile, Google Protection, Get Reviews. Reply buttons: "Approve reply" (inbox, email-link page, confirm dialog); the demo chip on the signed-in Home reads "Approve". Google Protection screen and email-link page: "Keep my information" replaces "Put mine back"; it still needs a tap. Plan page: retired module names replaced by "reply drafts, Google Protection and the Weekly Care Report". Get Reviews: "link activity" labels and the sentence from the task.
- `grep -rniE "profile score|do now|listing shield|put mine back|get early access|start free trial|monday report" src` leaves only `lib/verticals.tsx:562` and `:665` ("A Monday report", a 02a file, see Found, not done).
- Checks: `npm run typecheck` exit 0; `npm test` 3 files, 15 tests pass; `npm run build` completes; eslint and prettier on the 12 changed files clean (prettier also joined one pre-existing multi-line import in `cards.tsx`). No em dash, en dash or exclamation mark in the added lines. Deno check not run: no Edge Function changed in part A.
- Not checked: any screen in a browser at 390 or 1440 px (no signed-in session in this chat).


### P0.1-02a (pull requests 17 and 18, 4 Oct 2026)
- Checks on both branches: typecheck exit 0; vitest 3 files, 15 tests pass; build completes; eslint on changed files 0 errors; CI on #17 green (App and Edge Functions jobs). CI on #18 runs on open.
- Rendered `/`, `/pricing`, `/faq` with `vite dev`: each has the footer notice, the operator line and "Join early access"; no "Spring 19", "Get early access", Profile Score, Do now or Listing Shield. `/faq` has the Gemini question.
- Done-when grep over `src public/llms.txt` leaves only the brand line plus app files that belong to P0.1-02b: `components/app/do-now.tsx`, `routes/_authenticated/app/{index,plan,shield}.tsx`, `components/assistant/assistant-widget.tsx`, `components/layouts/app-layout.tsx`, `lib/profile.ts`, `routes/a.$token.tsx` ("Put mine back"). The line "Start free trial" remains in `components/onboarding/steps.tsx` (app, 02b).
- Not checked: the pages in a real browser at 390 and 1440 px (no browser pass in this chat).

### P0.1-01b (pull request 15, branch claude/p0-1-01b, commit 26f8930)

- Comments and docs only. Changed files: `.gitignore`, `CLAUDE.md`, `knowledge/kabsi-facts.md`, `public/llms-full.txt`, `scripts/deno-check.sh`, `src/lib/qr.ts`, `src/lib/site.ts`, `src/lib/telemetry.ts`, `src/routes/privacy.tsx`; `docs/WORK-QUEUE.md` deleted (`git status` showed D).
- Old-spec citations now cite the plan: `site.ts:1-2` (facts file and plan section 2.2), `site.ts:4` (task P0.1-03), `site.ts:9` (plan Appendix B), `site.ts:27` (D-number dropped), `qr.ts:3`, `telemetry.ts:4` (plan section 2.2) and `:121` (plan and G-47), `privacy.tsx:5-6` (plan Appendix A), `deno-check.sh:3` and `.gitignore:36` (plan Appendix A, working notes). `CLAUDE.md:20` names only `knowledge/kabsi-facts.md`.
- `knowledge/kabsi-facts.md` line 1: "Last updated: 4 Oct 2026. Source: docs/source (K and G decisions) and docs/KABSI-PLAN.md."
- `node scripts/build-kb.mjs` ran (12832 words). `public/llms-full.txt` line 5 matches the facts file line 1; `git diff` on that file is that one line only.
- Done-when grep, run after the edits: `grep -rn "KABSI-SPEC\|KABSI-STATE\|WORK-QUEUE\|KNOWLEDGE-BASE\|GO-LIVE\|VIDEO-PLAN" --exclude-dir=node_modules --exclude-dir=.git .` filtered to exclude `docs/source/`, `docs/KABSI-PLAN.md` and `docs/KABSI-PROGRESS.md` printed no lines (count of lines outside those three paths: 0). Unfiltered, the only hits are inside those three paths.
- `docs/WORK-QUEUE.md` is gone.
- No em dashes, en dashes or exclamation marks in the added lines (checked on the diff).
- Checks run locally: `npm run typecheck` exit 0; `npm run lint:changed` linted the 4 changed source files, exit 0; `npm test` 3 files, 15 tests passed; `npm run build` completed. Deno check not run: no Edge Function changed.
- CI on pull request 15 at the commit before this line: App (typecheck, lint, anon JWT guard, tests, build) success; Edge Functions and Worker (deno check, Deno tests) success; Supabase Preview skipped.

### P0.1-01 (done, pull request 13, branch claude/p0-1-01, commit 2ead48c)

- Retired docs deleted: `docs/KABSI-SPEC.md`, `docs/KABSI-STATE.md`, `docs/VIDEO-PLAN.md`, `docs/GO-LIVE.md`, `docs/screenshots/q04/` (8 jpg). `git status` showed them as D; `docs/` now holds KABSI-PLAN.md, KABSI-PROGRESS.md, WORK-QUEUE.md, slack-app-manifest.yml, source/.
- Facts file moved with `git mv` to `knowledge/kabsi-facts.md` (git shows R). `scripts/build-kb.mjs` lines 1 and 6 now read `knowledge/kabsi-facts.md`.
- `node scripts/build-kb.mjs` ran (12829 words). `public/llms-full.txt` md5 is 05d23c458006b14ace2e2d01dd87066e before and after: byte-identical, and git reports no change to that file.
- `AGENTS.md`: Lovable block and both existing rules kept; one paragraph added pointing to `docs/KABSI-PLAN.md`, `docs/KABSI-PROGRESS.md` and `knowledge/kabsi-facts.md`, plus "Use only the design tokens".
- Lovable project knowledge (project 2f215f56-0677-42e1-b0d5-838eb32e1c1c): `set_project_knowledge` then read back with `get_project_knowledge`. It keeps every existing rule except the old "Copy:" line, which section 2.2 replaces; adds all nine section 2.2 rules, the line "Use only the design tokens", and the facts-file rule. The first set call failed on a wrong parameter name and saved nothing; the second call saved and the read back matches.
- Grep line was NOT MET at the time; the leftovers were cleared by P0.1-01b (pull request 15), which is the task that owns that line. Original note: the grep line. `grep -rn "KABSI-SPEC\|KABSI-STATE\|WORK-QUEUE\|KNOWLEDGE-BASE.md" --exclude-dir=node_modules --exclude-dir=.git .` still returns lines outside `docs/source/` and `docs/KABSI-PLAN.md` (list under Found, not done). Clearing them needs edits to files the task says not to change, and the `llms-full.txt` line must stay byte-identical, so the two Done-when lines cannot both hold. Left as is.
- Checks: typecheck, lint, tests and build not run (no source code changed). CI on the pull request is the check; result not yet read.

## Found, not done

- P0.1-V2: Nora has no "suggested action" button (K-111, VIDEO #15), so the V15 line "and the button to do it" is cut until one exists. No task in the plan names it. Planning chat to decide where it belongs (P0.6-06 or P0.4-11).
- P0.1-V2: VIDEO says the profile alert button is "Keep my hours" and the reply confirmation is green "Published". The app says "Keep my information" and "Posted". Same wording question as the V1 note for P0.1-13a.
- P0.1-V2: the VIDEO plan's S13 is used by "#17" and W3, but there is no video 17 in the plan. Not touched.
- P0.1-V2: calendar clash. V10 is slotted for 2 Nov (week 5) but needs P0.5-03, and V14 for 2 Nov needs P0.3-03. Both are late waves. If they have not merged, the slots move or become winner re-cuts (VIDEO Part 2).
- P0.1-V1: the VIDEO cards say green "Published" after approval; the app says "Posted. It shows on Google within a few minutes." (dashboard) and "Posted. Your reply is on Google." (email page). The shot sheets use the app's text. Whether the app should say "Published" is a wording question for P0.1-13a.
- P0.1-V1: recording uses up demo reviews (each approval posts one). Re-takes after the spares are gone need a demo reset (a database write that waits for Hussein's "apply"), and V07 needs a new mock review on a demo business each take. A reset script would help the video work; not built.
- P0.1-V1: no designed A6 table card file exists in the repo; Get Reviews prints a plain QR page. The VIDEO plan's G16 expects the designed card (P1-11).
- For P0.4-08 (Hussein, 4 Oct): the review email subject should be "<Business>: new <n>-star review, reply ready" with a preview line, instead of "New review for <Business> (3 of 5)".
- After-merge check for the email-buttons change (PR 27): Hussein checked the test email on phone and laptop on 4 Oct: OK.
- Email buttons: fixed by branch claude/h-email-buttons (see Evidence). The Supabase Auth emails have no button; their yellow box is the one-time code display, left as it is (K-102 says one yellow button; Rashid to confirm the code box is fine).
- `scripts/build-kb.mjs` header retired names: fixed by P0.1-02a (pull request 18).
- `scripts/build-kb.mjs` D261 and D244 citations: fixed by P0.1-02a (pull request 18).
- Old-spec D-numbers remain in other code comments outside P0.1-01b's touch list (for example `grep -rn "\bD[0-9]\{3\}\b" src supabase scripts`). They do not match the Done-when grep. Not touched.
- Abou Hamze Auto Center: Kabsi Clients is Manager and hello@kabsi.co accepted the invitation by hand (4 Oct). Kabsi's database does not know this business yet; it is connected in Kabsi during P0.7-05. (Planning chat, 4 Oct.)

- Yawmiyati is the listing behind the Gate A application, and K-98 says an online media business is not eligible for a Business Profile. Nothing to change now; if Google questions it, answer with the real business's in-person activity or move the application to an eligible profile. (Planning review, 4 Oct.)
- The live hero shows "Your Google Business Profile, taken care of." (Google's name in the slogan, against K-112), "Profile Score" and a "Post" button. Fixed by P0.1-02a and P0.1-02b.
- Drafting code allows phone numbers in replies (`_shared/ai.ts`), weekly posts use phrases from review text (D245) and reports quote reviews (D233). Fixed by P0.1-04.
- Review text sent to the model has no length cap. Fixed by P0.1-04.
- P0.1-04a: the three existing `weekly_reports` rows still hold quotes in `data`; the app no longer shows them. Deleting them is a retention question (P0.2-01).
- P0.1-04a: `src/routes/privacy.tsx` line 260 mentions "the quotes in weekly reports". True for the old rows; P0.2-07 should reword it.
- P0.1-04a: a reply or post the owner edits by hand is not checked for contact details at publish (only drafts are). Kabsi drafts are blocked in code; whether to warn on owner-typed text is open (P0.3-02 or P0.1-13a).

## Decisions to confirm

(Build chats add decisions the plan did not cover here, one line each with the reason. The planning chat folds confirmed ones into the plan.)

- P0.1-V2: V13 and W5 need a fourth end card, "End card, partner" (yellow button "Apply as a partner"), because the brand kit has only three. Add it to `brand-kit.md` if Rashid agrees.
- P0.1-V2: W4 keeps the "AI presenter" tag on screen for the whole video, not only the first 3 s (a trust video; the cost is nothing).
- P0.1-V2: W1 and V09 each get a "version now" built from S01, S05 and today's QR page, as V03 did (R-10), so something can be recorded before the later screens exist. W3 is split the same way (manual route first, one-tap after P1-18).
- P0.1-V2: V12 hook C and the on-screen "Replies drafted. Profile watched. Weekly report." are held until P0.2-04, P0.5-02 and P0.5-04 are live, even though the plan lists V12 as an early ad.
- P0.1-V2: V16 gives a consent checklist, not legal wording. Rashid or a lawyer approves the release text before the first use.
- P0.1-V1: V05 voice step three says "point them to the contact details on your profile" instead of "give a way to reach you directly", because Kabsi drafts never carry contact details (K-113) and the draft on screen says exactly that.
- P0.1-V1: until P0.4-01 is live every video ends with "Join early access at kabsi.co" (R-10); the brand kit has three end cards (early access, Profile Check, start free) instead of VIDEO's two.
- P0.1-V1: V03 is split into a short version recordable now (Leah plus S01 and S05, no profile-change, report or setup-call lines) and the full VIDEO script after its features ship, following R-10's "unless Leah's cutaways use only S01 and S05".
- P0.1-V1: V06 uses today's Get Reviews QR (Download QR or Print) as the card in G16, because no designed A6 table card file exists yet (P1-11); G16 is made again after P1-11.
- P0.1-V1: V07 records the email in the phone's own Mail app, not the Gmail app, so no Google screen appears, and the demo login address is cropped.

- P0.1-06: demo businesses stay in the `api` cron (sync, drafts, emails, Google Protection, weekly report) because recordings S05 and S06 need a real new-review email and a Weekly Care Report email; isolation comes from the email guard (demo login only), the per-business mock and the Slack and metrics exclusions, not from skipping the cron. Trials and renewals never apply (no plan), ratings need a place_id (none).
- P0.1-06: a demo business is active without any plan (`refresh_location_status` returns early), so no trial, payment or plan row exists for it; partner billing cannot count it (check: no partner).
- P0.1-06: "one holiday-hours reminder" is seeded as a drafted special-hours entry (Thanksgiving for the café, Christmas Eve for the salon); the holiday calendar itself is P0.5-03.
- P0.1-06: the review links of the demo businesses open https://kabsi.co, never a Google page, because the businesses are invented.
- P0.1-06: the demo login can still send one PostHog identify call at sign-in (the auth provider identifies before the business loads); everything after is paused. Closing it fully means knowing demo-ness at sign-in (a claim or a lookup); left for P0.6-02, which reworks product events.
- P0.1-06: the "Demo data" tag reuses `ExampleBadge` (grey outline pill) instead of a new component; a demo business is an example under guardrail 23.
- P0.1-06: the task changes 13 code files, so it is split: part A database, seed and backend isolation; part B the "Demo data" tag (app header and the email reply page) and PostHog off for demo businesses.
- P0.1-02a: every trade page headline (`verticals.tsx` h1) is now the brand line, because the plan gave no per-trade headline and the old ones used the retired slogans.
- P0.1-02a: the Gemini question replaces the older "How is this different from Google's own AI replies?" question, so the FAQ does not carry two answers on the same topic.
- P0.1-02a: four of the six Pro lines on `/pricing` carry an "Early access" pill (Know when Google changes your details, Photos and updates prepared for you, Holiday hours reminders, Weekly Care Report) because they are not live yet.
- P0.1-02a: `TRIAL_LINE` and the "Start free. Pay when it is worth it." headline were left as they are; the plan's list did not change them.
- P0.1-04a: "posts: except the owner's own domain in the button only" is read as: post text never carries a link; the button is the only link. Kabsi has no reliable record of the owner's domain yet (Business Knowledge, P0.2-03), so the button link is not matched to a domain.
- P0.1-04a: keyword suggestions use up to three items from the owner's "Products and services" field (source "owner") in place of review phrases, as the plan's "owner input".
- P0.1-04b: daily caps start at 60 drafting jobs per business and 3,000 across Kabsi (a first-day backlog of 20 reviews fits); a job is one reply or post draft with its checks. Change them in `app_settings`.
- P0.1-04a: the `contact_phone` field stays (the mock listing uses it) but is relabelled "Business phone" with the hint that Kabsi never writes a phone number in a public reply.

## Found, not done by P0.1-02a

- `knowledge/kabsi-facts.md` still describes the app with the retired names in many places (sections 2.1 to 2.1c, 6, 9 trade notes and runbook lines, for example "Listing Shield", "Profile Score", "Do now", "weekly draft", "Monday Report", "no quick Post button"). It is Nora's source and follows the app, so it changes with P0.1-02b.
- `src/components/onboarding/steps.tsx` button "Start free trial": done in P0.1-02b part A. The app pages named above: part A done, emails and functions in part B.
- `src/lib/verticals.tsx:562` and `:665` still have a card titled "A Monday report" (retired name, K-02). Not touched in part A.
- The facts file says weekly post drafts arrive on set days ("When does the weekly draft arrive?"). The public site no longer says "weekly"; confirm with Rashid whether post cadence is still a feature (P0.1-02b or later).

## Test data to delete at go-live (P0.7-04)

- Yawmiyati: the email row 1cb757d9-ba6b-4e7e-a023-d5852f3e19f0 (4 Oct, 04a and 04b check) and the email row 84558298-d9f7-4d72-8f19-02b99d59f869 (created 4 Oct by the P0.1-02b After-merge check). The mock review, its draft and its action tokens were already deleted on 4 Oct.

- QA account qa-owner@test.local and "QA Bakery"; "QA Partner" (qa-partner) with Rashid's account as member; the "Test by rashid" partner invite and acceptance.
- Yawmiyati's three overlapping pro_6m plans, the pending pro_12m and three payments rows from 25 Sep tests; its test photos.
- Nora test chats from 27 Sep (visitor ids starting qa-, chats with contact "Kay").
- "Safa Chicken" (06ee2022-b1bc-40a4-9493-b46e2e055f1c) and the tarikhtube@gmail.com account.
- A gmail.co typo account that never received its code.
- Keep Yawmiyati (internal test only) and the demo workspace.

## Log

- 4 Oct 2026 (Hussein's session): P0.1-V2 on branch claude/h-p0-1-v2, PR 32: shot sheets V09 to V16 and W1 to W5 (docs only). After-merge read-only checks re-run (0 demo ops events, functions 13:22 UTC); demo email and browser checks still open. Next: P0.1-V3 needs Rashid's hours first; otherwise P0.1-07.
- 4 Oct 2026 (Hussein's session): PR 30 (approve copy) and PR 31 (P0.1-V1) merged on Hussein's "merge". Open: P0.1-06 demo email check (needs a mock review, Hussein's "apply"), browser checks, Supabase auth template paste (Rashid). Next: P0.1-V2.
- 4 Oct 2026 (Hussein's session): P0.1-V1 on branch claude/h-p0-1-v1: brand kit, feature-truth and shot sheets V01 to V08 (docs only). Next: P0.1-V2.
- 4 Oct 2026 (Hussein's session): P0.1-06 After-merge read-only checks passed (Deploy 11, functions 12:51 UTC, 0 demo ops events); demo email and browser checks still open. Supabase Auth template paste recorded as Rashid's step 9. Copy fix on branch claude/h-approve-copy (Reviews and Home say approve, not tap Post).

- 4 Oct 2026 (Hussein's session): PR 28 (P0.1-06 part A) merged on Hussein's "merge"; demo sign-in checked by Hussein; functions redeployed 12:21 UTC. P0.1-06 part B on branch claude/h-p0-1-06b, PR 29, CI green on 793fde7. Next: part B After-merge checks, the open part A mock-review email check, then P0.1-V1.
- 4 Oct 2026 (Hussein's session): After-merge checks: Deploy run 9 (PR 27) success, all functions updated 08:58 UTC; live site still blocked from the sandbox. PR 27 email confirmed by Hussein; its test data deleted. P0.1-06 part A on branch claude/h-p0-1-06, PR 28, CI green (both migrations applied; demo login and seed waiting). Next: demo login, seed, then P0.1-06 part B.
- 4 Oct 2026 (Hussein's session): PR 26 merged (progress notes only). Email button and phone-layout fix on branch claude/h-email-buttons. Next: P0.1-V1.
- 4 Oct 2026 (Hussein's session): PR 25 (P0.1-05) merged on Hussein's "merge". Live mock-review check for 04a and 04b passed; cap test and screen checks still open. Next: P0.1-V1.
- 4 Oct 2026 (Hussein's session): PRs 23 and 24 merged. After-merge read-only checks for 04a and 04b run (Deploy green, function versions newer); the database-writing and screen checks are still open. P0.1-05 on branch claude/h-p0-1-05, PR 25. Next: P0.1-V1, or the open After-merge checks.
- 4 Oct 2026 (Hussein's session): PR 23 (P0.1-04a) merged on Hussein's "merge". P0.1-04b on branch claude/h-p0-1-04b, PR 24; `ai_usage` migration applied after Hussein's "apply". Next: P0.1-04a and 04b After-merge checks, then P0.1-05.
- 4 Oct 2026 (Hussein's session): recorded Hussein's confirmation of the P0.1-02b test email (desktop and phone screenshots). P0.1-04 split into 04a and 04b (15 code files); 04a on branch claude/h-p0-1-04. Next: P0.1-04b (needs Hussein's "apply" for the `ai_usage` migration).

- 4 Oct 2026 (Hussein's session): Deploy fixed (PR 21, Wrangler pinned) and passing; P0.1-02b mock-review After-merge check passed; plan correction recorded (the `emails` table has no body). Next: P0.1-03 once Rashid has done steps 1 and 2.

- 4 Oct 2026 (Hussein's session): the Deploy run for the P0.1-02b part B merge (run 37185310050) passed the Edge Functions job and failed the Worker job: wrangler-action installs Wrangler 3.90.0, which does not read `wrangler.jsonc`, so it reports "Missing entry-point". Same failure as the four runs on 29 Sep. Fix: pin `wranglerVersion: "3.114.17"` in `.github/workflows/deploy.yml` (branch claude/h-deploy-wrangler). Verified with `wrangler deploy --dry-run` on a clean copy of `workers/kabsi-go`: 3.90.0 fails with the same error, 3.114.17 bundles it and shows the STICKERS binding and vars. The first successful Worker deploy from CI will publish the Worker code now on main to go.kabsi.co.

- 4 Oct 2026 (Hussein's session): P0.1-02b part B on branch claude/h-p0-1-02b-b (emails, Edge Function copy, Nora, facts file). Next: P0.1-03 needs Rashid's steps 1 and 2 first.

- 4 Oct 2026 (Hussein's session): PRs 17 and 18 found merged on main; live After-merge checks could not run (sandbox proxy). P0.1-02b split in two; part A (app screens) on branch claude/h-p0-1-02b. Next: part B, then P0.1-03.

- 4 Oct 2026: P0.1-02a done as two pull requests, 17 (routes, components, site constants, footer notice) and 18 (FAQ, trade pages, guides, llms.txt, facts). Open for Rashid to merge, 17 first. Next: P0.1-02b.
- 4 Oct 2026 (planning chat): build chats no longer merge. They open the pull request, get CI green, update PROGRESS on the branch and stop with the PR link and a 3-line summary; Rashid merges on GitHub (plan section 2.5). After-merge checks are run by the next build chat.

- 4 Oct 2026: P0.1-01b done on branch claude/p0-1-01b, pull request 15. Leftover references to the retired docs removed, `llms-full.txt` regenerated, `docs/WORK-QUEUE.md` deleted, P0.1-01 marked done. Next: P0.1-02a.

- 4 Oct 2026 (planning chat): P0.1-01 merged (PR 13). Added P0.1-01b for leftover references. Recorded: Hussein agreed to be named as seller, no written agreement; Abou Hamze Auto Center owner agreed, Kabsi Clients is Manager and the invitation was accepted. Next: P0.1-01b.

- 4 Oct 2026: P0.1-01 done on branch claude/p0-1-01, pull request 13, in review (grep Done-when line not met, see Evidence). Lovable project knowledge updated. Next: P0.1-02a.

- 4 Oct 2026: Clean-up done (19 retired project files deleted after a backup was sent to Rashid; six source documents added). Decisions recorded: D1 seller Hussein Slim, D2 Abou Hamze Auto Center, D3 no NFC outside Lebanon, I1 placeholder number, I3 one free month; desktop Manager screenshots added (blurred). Plan merged. Next: P0.1-01.

- 4 Oct 2026: Plan v1 written by the planning chat (Opus) from the six source documents, checked against main 42e7994, the live database and functions. Next: Rashid confirms the clean-up, merges the plan pull request, then P0.1-01.
