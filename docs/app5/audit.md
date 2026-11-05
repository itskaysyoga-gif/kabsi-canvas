# App 5 part C: audit of the signed-in site and the staff workspace (5 Nov 2026)

Master plan 30.33 items 2 and 3 (R-113), done the way App 4 audited the signed-in site (docs/app4/audit.md). Audited after parts A and B were merged (main at 427f481, PR 406). The fixes are on branch claude/app5-c.

## What was run

- **Every signed-in, setup and staff screen with a made-up owner and a made-up staff member** (scripts/app5/audit.mjs: App 4's audit plus four checks for the 30.32 look: one phrase on the highlight bar in every H1, no paragraph over 25 words, no list item over 15, no lone card in a grid's last row by the real layout). Every Supabase call is answered from scripts/app-shots/fixtures.mjs; nothing reaches Supabase. 71 routes and states under /app, /start and /staff (the seven staff pages are new) at 360, 390, 768, 1280 and 1440 px, then each path in three more states (loading, error, ended) at 390 and 1440 px. 237 raw hits, sorted below.
- **The staff workspace with mocks at 390 and 1440 px** (tests/e2e/app5-staff.spec.ts): Today to each of the six pages through the menu and back with axe on each; a Today row opens its panel; a failed staff check says the page did not load; a session that is not staff gets the not-found page on all seven pages and no staff read is made. 8 passed.
- **Production, kabsi.co, with the QA demo owner** (not staff; code from tests/e2e/seed/qa-login-code.sql through the Supabase connector, never printed): tests/e2e/app4-signed-in.spec.ts (16 routes) and tests/e2e/app5-staff-live.spec.ts at 390 and 1440 px: 34 passed, 14 skipped (the "as staff" runs: there is no QA staff account). A read of seven live pages at both widths: every H1 holds one highlighted phrase (Home, Reviews, Posts and photos, Google profile, Settings).

## Findings (after checking)

| ID | Kind | Severity | Where | Evidence | Fix |
| --- | --- | --- | --- | --- | --- |
| F-01 | Look | Low | /app, /start, /staff error states | The error card that takes the page's place had an H1 with no phrase on the bar (34 visits) | ErrorState's page title uses Headline (ui.tsx), part C |
| F-02 | Look | Low | Home, Needs attention | The AI answer line ran 33 words in one paragraph | Each detail line shows as short paragraphs, cut between sentences (action-center.tsx), part C |
| F-03 | Look | Medium | Plan, Photos, Settings, Get reviews, Business knowledge, Coach, Profile watch, Home's task lines, setup, staff panels | About 20 paragraphs over 25 words | Split between sentences with the same words; two single sentences reworded (COPY.md 57 part B), part B |
| F-04 | Look | Low | Posts (1440), Photos tiles (390, 1440), Profile watch (1440), staff Job health stats (390) | A lone card in the last row | Centred at one card's width (balance-2, balance-tiles), part B. The tool's own check then counted a centred card as lone; fixed in the tool |
| F-05 | Look | Medium | Every signed-in H1 | No H1 carried the highlight bar | Headline in AccountTop, StepTitle and the business picker, part B |
| F-06 | Speed | High | Every website page | The first part A build put the staff pages in the boot script (a route's head ships with every page): Home's script 205 KB over the 205 KB budget | Six staff pages in one `$page` route whose head reads only a title list; entry chunk 122.7 KB against main's 122.4 KB, gate green, part A |
| F-07 | Tests | Medium | Database | rls_functions.sql had no line for the new staff_today() | A non-staff test line (throws 42501), part A |
| F-08 | Staff | Low | Today | Independent review: dead jobs of all time were counted as "in the last 24 hours"; paused businesses counted as setting up | Two rows (failed runs in 24 hours, stopped jobs to retry); setting up is onboarding, access pending or awaiting payment, part A |
| F-09 | Words | Low | Setup (access steps) | "On Google, open your profile ..." is 31 words, and the same step as a list item is 16 | Not fixed: the steps are shared with the public /manager-steps page (out of this task). LATER row |
| F-10 | Words | Low | Settings and setup, WhatsApp | The consent text is one paragraph of about 85 words | Not fixed: stored word for word as the proof of the opt-in (K-113). LATER row for lane R |

## Checked and not changed

- Posts: two yellow buttons (the chosen month chip and Approve). DESIGN.md allows chosen chips; App 4 kept it.
- Team and Report: "covered" controls are the full-page capture drawing the fixed bar mid-page (App 4's same finding).
- Text over text (96 hits): Settings, Insights, Report and Team as App 4 found, plus the staff pages, where the screenshots at 390 px show the full-page capture drawing the phone bar over Today's rows. None is real on screen.
- The staff pages' loading, error and ended synthetic states show the public not-found page, because the audit's made-up session is not staff there. One yellow button is on screen; the count includes the hidden phone bar.
- Console errors on /app's error state are the 500s the state sends on purpose.
- No sideways scroll at any width, no dash, exclamation mark or Arabic, no broken internal link, one H1 everywhere outside the synthetic states.

## Gaps in the audit's own data

Ten calls had no fixture and were answered empty (shots/app5/fixture-gaps-1.json, not committed): billing-creem/founding, api/resume, claim_team_invites, my_setup_link_emailed, save_signup_attribution, staff_activation, staff_validation, onboarding_scenarios, routine_channels and staff_evidence. No QA account is staff, so the staff pages were not run signed in on production (LATER row).

## Screenshots

docs/app5/before/ (main at cd27b6d, before App 5) and docs/app5/after/ (after parts A and B), at 390 and 1440 px: the old single staff page and each new staff page; Home, Reviews, Posts, Photos, Get reviews, Profile watch, Report, Plan, Settings, setup (find, check) and the business picker.
