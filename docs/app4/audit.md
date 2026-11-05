# App 4 part E: audit of the signed-in site (5 Nov 2026)

Master plan 30.31 item 5 (R-111), done the way Go live 1 audited the public site (docs/golive1/audit.md). Audited after parts A to D were merged (main at 99d1d50, PR 386). The fixes are on branch claude/app4-e.

## What was run

- **Every signed-in screen with a made-up owner** (scripts/app4/audit.mjs, built on scripts/app-shots.mjs: Rose Lane Salon, every Supabase call answered from scripts/app-shots/fixtures.mjs, nothing reaches Supabase). It covers 65 routes and states under /app, /start and /staff (empty, with items, first task, first check, trial, paid, cancelled, failed, manager, staff, staff admin, the onboarding stages) at 360, 390, 768, 1280 and 1440 px: 325 visits. Then each of the 26 paths in three more states at 390 and 1440 px: loading (Supabase never answers), error (every read answers 500) and ended (every read answers 401, so the session ends mid-use): 156 visits. That is 481 visits in all, run before the fixes and again after them.
- Each visit recorded page errors and console errors, failed requests, sideways scroll, labels cut off, text over text, controls covered at the top and at the very bottom of the page, buttons and links without a name, the number of H1s, yellow buttons on screen, axe serious or critical (at 390 and 1440), the words (em and en dashes, exclamation marks, Arabic script, retired names), whether the session-ended screen showed after a 401, and every internal link (each asked once from the server).
- **The signed-in site on production with the real QA demo account** (tests/e2e/app4-signed-in.spec.ts, code from tests/e2e/seed/qa-login-code.sql through the Supabase connector, never printed). It covers 16 routes under /app at 390 and 1440 px: 32 passed. No page error, no console error, no failed request to kabsi.co or Supabase, no sideways scroll, one H1, and no serious or critical axe finding. Nothing was pressed that changes anything.
- **One real email code sign-in on production** through the new log in page (tests/e2e/login.spec.ts with the QA code): passed and landed in /app.
- **Parts A to D on production** (tests/e2e/app4-account, app4-session, app4-scroll and app4-login specs, Supabase mocked where a case needs it): 66 passed in the first full run. The 3 failures were timing in the tests, fixed below, and app4-scroll then passed twice over at both widths (24 of 24).

## What is clean

- No sideways scroll on any screen, state or width (481 visits).
- No dash, exclamation mark or Arabic script in any signed-in screen. One retired name remained (E-01, fixed).
- No broken internal link and no button or link without a name.
- No page error, apart from E-04 (fixed).
- After a 401, the session-ended screen showed on every one of the 26 paths, and nothing behind it could be tapped.
- No control is covered by the phone bar, Nora or the header at the top or at the very end of any page. The tool flagged 10 cases on Team and Report. Each was checked on the screenshots and none is covered: they are the full-page capture drawing the fixed bar mid-page.
- The tool also flagged 80 cases of text over text. They were checked against the screenshots of Settings, Report, Team and Insights at 390 and 1440 px, and none is real. They come from closed sections and stat cards that the heuristic counts.
- Yellow: one main action per screen. The chosen chips and month chips (Team, Posts) are yellow as DESIGN.md allows.

## Totals by kind (findings after checking, before the fixes)

| Kind | High | Medium | Low | Total | Fixed | Lane R |
| --- | --- | --- | --- | --- | --- | --- |
| Words and facts | 0 | 1 | 0 | 1 | 1 | 0 |
| Errors | 0 | 1 | 0 | 1 | 1 | 0 |
| Accessibility | 0 | 0 | 2 | 2 | 2 | 0 |
| Session and staff | 0 | 0 | 1 | 1 | 1 | 0 |
| Design rules | 0 | 0 | 2 | 2 | 2 | 0 |
| Scroll | 0 | 0 | 1 | 1 | 0 | 0 |
| **All** | **0** | **2** | **6** | **8** | **7** | **0** |

The raw tool hits went from 162 before the fixes to 104 after. All 104 that remain are the checked false positives above, plus the expected 500s of the error state.

## Findings

| ID | Kind | Severity | Page family | Evidence | Fix |
| --- | --- | --- | --- | --- | --- |
| E-01 | Words | Medium | Settings, Plan | /app/plan: the trial banner said "reply drafts, Google Protection and the Results Report pause" and the No plan banner said "the Results Report are paused" at every width. B-008 made "Your weekly report" the one name, and Copy 3 missed this one because the words span a line break in the source. Screenshots: plan-before-390.png, plan-before-1440.png | "your weekly report pause" and "your weekly report are paused" (plan.tsx). After: plan-after-390.png, plan-after-1440.png |
| E-02 | Errors | Medium | Staff | /staff in the staff admin state: "TypeError: Cannot read properties of null (reading 'founding')". The whole staff page went blank when staff_validation answered nothing. | validation-panel.tsx shows "No data" when the figures are empty. |
| E-03 | Accessibility | Low | /app, /start (25 screens) | In the error state the error card took the page title's place and the screen had no H1. Affected: /app and its 16 pages, /start and its 7 states, /start/resume. | ErrorState takes `page`, and its title is then the H1 (app-layout.tsx, start.tsx, start_.resume.$code.tsx). The look is unchanged. |
| E-04 | Accessibility | Low | /app | axe document-title (serious) on /app while it loads. Production's HTML for /app had no `<title>` (Vercel fetch of kabsi.co/app, 13:45 UTC). | A default title "Kabsi" in the root; every page still sets its own (__root.tsx). |
| E-05 | Session and staff | Low | Staff | After part C a session that is not staff sees the not-found page on /staff. A failed is_staff call also counted as "not staff", so real staff on a bad connection were told the page does not exist. | amStaff throws on an error, and the staff page shows "This page did not load." with Try again (reviews.ts, staff.tsx). |
| E-06 | Design rules | Low | Not-found page | The not-found page had no element marked as its main action, so the phone bar's yellow button could join "Go home". | "Go home" is marked data-main-cta (status-pages.tsx). On the screenshots only one yellow button shows. |
| E-07 | Design rules | Low | Setup (/start, /get-started) | The setup header's wordmark read "kabsi" in the body font. Everywhere else it is "Kabsi" in the heading font. Screenshots: setup-logo-before-390.png, setup-logo-before-1440.png | The same wordmark as the website (kabsi-logo.tsx). After: setup-logo-after-390.png, setup-logo-after-1440.png |
| E-08 | Scroll | Low | Every page | On production, a scroll made within about a second of a fresh page load is undone by the router's first scroll to the top after hydration (seen in Playwright on /for). A visitor rarely scrolls that fast, and a link from another page is not affected. | Not fixed: a row in docs/LATER.md. |

## Checked and not changed

- Report: "Open it" under "Waiting for your yes" is a button and "Open it" under "One next step" is a link. This is deliberate: the waiting item leads.
- Plan: the plan cards' help line "A person answers on WhatsApp the same working day." stays for owners (30.29 item 2, B-026).
- Settings' tab row scrolls sideways on a phone ("Plan" and "Reports" sit past the edge), as App 3 built it.

## Gaps in the audit's own data

Ten calls have no fixture and were answered empty. They are listed in shots/app4/fixture-gaps-*.json (not committed): billing-creem/founding, api/resume, claim_team_invites, my_setup_link_emailed, save_signup_attribution, staff_activation, staff_validation, onboarding_scenarios, routine_channels and staff_evidence. The live run with the QA account covers the /app screens with real data, but not /staff or /start.

## Questions for lane R

None.
