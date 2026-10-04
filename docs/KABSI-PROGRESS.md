# Kabsi progress

Every build chat reads this file after `docs/KABSI-PLAN.md` and updates it before it ends (plan section 2.7). Newest log entries at the top.

## Where things stand

- Plan version 1 written on 4 Oct 2026 (pull request claude/plan-v2). Nothing in it has been built yet.
- Google: Gate A pending (case 1-4624000041157). Everything Google runs in mock mode.
- Live site: https://kabsi-app.lovable.app (new build, still with retired wording); kabsi.co still serves the old product until P0.1-03.
- Clean-up confirmed by Rashid on 4 Oct; project knowledge now holds the six source documents (folder `source/`) and KABSI-STICKER-SPEC.md only.
- P0.1-01 and P0.1-01b done (pull requests 13 and 15). P0.1-02a has two pull requests open (17, then 18). Next task: P0.1-02b.

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
| 8 | Hussein agrees to be named as seller | R-20 seller line, P0.4-07, P0.6-09 | Done 4 Oct (no written agreement, Rashid's decision) |

## Tasks

| ID | Task | Model | Status | PR | Date |
|---|---|---|---|---|---|
| P0.1-01 | Retire the old docs and move Nora's facts file | Sonnet | done (its leftover grep lines cleared by P0.1-01b) | 13 | 4 Oct 2026 |
| P0.1-01b | Remove leftover references to the retired docs | Sonnet | done | 15 | 4 Oct 2026 |
| P0.1-02a | Public site: wording that breaks Google's rules or describes removed features | Sonnet | merged (17, 18); live After-merge checks not run, see Evidence | 17, 18 | 4 Oct 2026 |
| P0.1-02b | App, emails and Nora: the same wording fixes | Sonnet | part A merged (PR 19); part B PR open on branch claude/h-p0-1-02b-b | 19, B below | 4 Oct 2026 |
| P0.1-03 | Move kabsi.co to the new build | Sonnet | todo | | |
| P0.1-04 | AI and Google-rules fixes in drafting | Opus | todo | | |
| P0.1-05 | Design tokens and shared components | Sonnet | todo | | |
| P0.1-06 | Demo workspace with fictional businesses | Opus | todo | | |
| P0.1-V1 | Brand kit text and shot sheets for videos 1 to 8 | Sonnet | todo | | |
| P0.1-V2 | Shot sheets for videos 9 to 16 and website videos W1 to W5 | Sonnet | todo | | |
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

After the P0.1-02b part B pull request is merged and the Deploy workflow has run (its last runs on main, 29 Sep, failed; check it first):
- Edge Function versions (`list_edge_functions`) for `api`, `content`, `assistant` are newer than the merge time.
- Trigger one mock review on Yawmiyati with `staff_mock_review` through the Supabase connector. The new `emails` row body has the button "Review reply" and the new footer (non-affiliation notice, operator line, "Nothing is published until you approve it."), and no address.
- Paste the four `emails/auth/*.html` files into the Supabase Auth templates (dashboard step for Rashid or Hussein).

After the P0.1-02b part A pull request is merged and Lovable has deployed `main`:
- In the signed-in app at 390 px and 1440 px: navigation reads Home, Reviews, Google Profile, Get Reviews, Settings; Home shows "What needs your attention" with no score and no points; the reply button says "Approve reply"; the Google Protection page is titled that and its button reads "Keep my information"; Get Reviews shows "link activity" and the sentence "Activity is not the same as reviews. Google decides which reviews appear."

Checks that need a task's merged code live. The next build chat runs them first (plan section 2.5), records the evidence under Evidence and marks the task done.

After pull requests 17 and 18 are merged and Lovable has deployed `main`:
- On https://kabsi-app.lovable.app, `/`, `/pricing` and `/faq` each show the footer notice "Google and Google Business Profile are trademarks of Google LLC..." and the operator line "Kabsi is operated by Hussein Slim, Dubai, United Arab Emirates. Contact: hello@kabsi.co".
- The hero reads "Your reviews and listing. Taken care of." with the button "Join early access", and none of Profile Score, Do now, Listing Shield, "Get early access" or "Spring 19" appears on the public pages.
- Look at `/pricing` at 390 px and 1440 px: the "Early access" pill on four Pro lines (not yet checked in a browser).

## Evidence

(One block per finished task: the Done-when lines with their proof.)

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

- `scripts/build-kb.mjs` header retired names: fixed by P0.1-02a (pull request 18).
- `scripts/build-kb.mjs` D261 and D244 citations: fixed by P0.1-02a (pull request 18).
- Old-spec D-numbers remain in other code comments outside P0.1-01b's touch list (for example `grep -rn "\bD[0-9]\{3\}\b" src supabase scripts`). They do not match the Done-when grep. Not touched.
- Abou Hamze Auto Center: Kabsi Clients is Manager and hello@kabsi.co accepted the invitation by hand (4 Oct). Kabsi's database does not know this business yet; it is connected in Kabsi during P0.7-05. (Planning chat, 4 Oct.)

- Yawmiyati is the listing behind the Gate A application, and K-98 says an online media business is not eligible for a Business Profile. Nothing to change now; if Google questions it, answer with the real business's in-person activity or move the application to an eligible profile. (Planning review, 4 Oct.)
- The live hero shows "Your Google Business Profile, taken care of." (Google's name in the slogan, against K-112), "Profile Score" and a "Post" button. Fixed by P0.1-02a and P0.1-02b.
- Drafting code allows phone numbers in replies (`_shared/ai.ts`), weekly posts use phrases from review text (D245) and reports quote reviews (D233). Fixed by P0.1-04.
- Review text sent to the model has no length cap. Fixed by P0.1-04.

## Decisions to confirm

(Build chats add decisions the plan did not cover here, one line each with the reason. The planning chat folds confirmed ones into the plan.)

- P0.1-02a: every trade page headline (`verticals.tsx` h1) is now the brand line, because the plan gave no per-trade headline and the old ones used the retired slogans.
- P0.1-02a: the Gemini question replaces the older "How is this different from Google's own AI replies?" question, so the FAQ does not carry two answers on the same topic.
- P0.1-02a: four of the six Pro lines on `/pricing` carry an "Early access" pill (Know when Google changes your details, Photos and updates prepared for you, Holiday hours reminders, Weekly Care Report) because they are not live yet.
- P0.1-02a: `TRIAL_LINE` and the "Start free. Pay when it is worth it." headline were left as they are; the plan's list did not change them.

## Found, not done by P0.1-02a

- `knowledge/kabsi-facts.md` still describes the app with the retired names in many places (sections 2.1 to 2.1c, 6, 9 trade notes and runbook lines, for example "Listing Shield", "Profile Score", "Do now", "weekly draft", "Monday Report", "no quick Post button"). It is Nora's source and follows the app, so it changes with P0.1-02b.
- `src/components/onboarding/steps.tsx` button "Start free trial": done in P0.1-02b part A. The app pages named above: part A done, emails and functions in part B.
- `src/lib/verticals.tsx:562` and `:665` still have a card titled "A Monday report" (retired name, K-02). Not touched in part A.
- The facts file says weekly post drafts arrive on set days ("When does the weekly draft arrive?"). The public site no longer says "weekly"; confirm with Rashid whether post cadence is still a feature (P0.1-02b or later).

## Test data to delete at go-live (P0.7-04)

- QA account qa-owner@test.local and "QA Bakery"; "QA Partner" (qa-partner) with Rashid's account as member; the "Test by rashid" partner invite and acceptance.
- Yawmiyati's three overlapping pro_6m plans, the pending pro_12m and three payments rows from 25 Sep tests; its test photos.
- Nora test chats from 27 Sep (visitor ids starting qa-, chats with contact "Kay").
- "Safa Chicken" (06ee2022-b1bc-40a4-9493-b46e2e055f1c) and the tarikhtube@gmail.com account.
- A gmail.co typo account that never received its code.
- Keep Yawmiyati (internal test only) and the demo workspace.

## Log

- 4 Oct 2026 (Hussein's session): P0.1-02b part B on branch claude/h-p0-1-02b-b (emails, Edge Function copy, Nora, facts file). Next: P0.1-03 needs Rashid's steps 1 and 2 first.

- 4 Oct 2026 (Hussein's session): PRs 17 and 18 found merged on main; live After-merge checks could not run (sandbox proxy). P0.1-02b split in two; part A (app screens) on branch claude/h-p0-1-02b. Next: part B, then P0.1-03.

- 4 Oct 2026: P0.1-02a done as two pull requests, 17 (routes, components, site constants, footer notice) and 18 (FAQ, trade pages, guides, llms.txt, facts). Open for Rashid to merge, 17 first. Next: P0.1-02b.
- 4 Oct 2026 (planning chat): build chats no longer merge. They open the pull request, get CI green, update PROGRESS on the branch and stop with the PR link and a 3-line summary; Rashid merges on GitHub (plan section 2.5). After-merge checks are run by the next build chat.

- 4 Oct 2026: P0.1-01b done on branch claude/p0-1-01b, pull request 15. Leftover references to the retired docs removed, `llms-full.txt` regenerated, `docs/WORK-QUEUE.md` deleted, P0.1-01 marked done. Next: P0.1-02a.

- 4 Oct 2026 (planning chat): P0.1-01 merged (PR 13). Added P0.1-01b for leftover references. Recorded: Hussein agreed to be named as seller, no written agreement; Abou Hamze Auto Center owner agreed, Kabsi Clients is Manager and the invitation was accepted. Next: P0.1-01b.

- 4 Oct 2026: P0.1-01 done on branch claude/p0-1-01, pull request 13, in review (grep Done-when line not met, see Evidence). Lovable project knowledge updated. Next: P0.1-02a.

- 4 Oct 2026: Clean-up done (19 retired project files deleted after a backup was sent to Rashid; six source documents added). Decisions recorded: D1 seller Hussein Slim, D2 Abou Hamze Auto Center, D3 no NFC outside Lebanon, I1 placeholder number, I3 one free month; desktop Manager screenshots added (blurred). Plan merged. Next: P0.1-01.

- 4 Oct 2026: Plan v1 written by the planning chat (Opus) from the six source documents, checked against main 42e7994, the live database and functions. Next: Rashid confirms the clean-up, merges the plan pull request, then P0.1-01.
