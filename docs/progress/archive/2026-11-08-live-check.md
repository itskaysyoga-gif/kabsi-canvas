# Live check of kabsi.co, 8 Nov 2026 (Lane R decision R-126)

Branch `claude/live-check`. Task: the ChatGPT audit could not open kabsi.co, so this session checks production itself, records numbers and fixes only clear small defects. Everything bigger is a row in `docs/LATER.md` with source R-126.

Where it was measured: production, https://kabsi.co, on Sunday 8 Nov 2026 from 08:40 to 09:30 UTC, from a cloud sandbox (Chromium 153 through an egress proxy, so the numbers are from one machine and one network; the speed gate's own runner differs). Scripts and raw JSON stayed in the session scratchpad and are not committed (R-121: no files of that kind in the repository).

## Summary

| Part | Result |
| --- | --- |
| 1 Pages and search signals | 64 of 64 sitemap pages pass every test. One gap: public pages had no robots meta (fixed). |
| 2 Speed | Home, Pricing and /scan are inside the Speed gate on mobile. /for/hair-salon is not gated and reads LCP 2.71 s. Pricing's script is 3 KB under its live budget. |
| 3 Consent | Before a choice nothing that needs a yes loads. Two defects after a withdrawal were found and fixed (PostHog kept counting; Meta's cookie stayed). |
| 4 Keyboard and names | Skip link, menu, search box and /app dialog work. Four defects fixed (focus lost when Home's lower sections wake, focus not returned after a dialog closes, cookie bar last in the tab order, plus the robots meta of part 1). |
| 5 Free check timing | Not run. The bot check never gives an automated browser a token, so no check can start from a session. Nothing was spent. |

## Part 1. Pages, canonical, headings, robots, titles, share images, structured data

Method: every `<loc>` of https://kabsi.co/sitemap.xml (64) plus `/`, `/pricing`, `/scan`, `/login`, `/setup-call` and `/this-page-does-not-exist-live-check`, fetched as a search engine would (raw HTML, no script). 67 requests, median 275 ms, slowest `/scan` 1501 ms.

| Check | Result |
| --- | --- |
| Status 200 | 64 of 64 sitemap pages, plus `/login` and `/setup-call` (in the sitemap) |
| 404 page | 404 for the made-up path, one H1, `robots` noindex |
| Self canonical | 64 of 64 (`/` is `https://kabsi.co`, no trailing slash, as the sitemap writes it) |
| Exactly one H1 | 64 of 64, and the 404 page and `/login` |
| Title and description present and unique | 64 unique titles, 64 unique descriptions; longest title 59 characters; two descriptions over 160 characters (`/` 176, `/guides` 170) |
| Robots meta | Before this PR: none on any indexable page (the default is index), `noindex` on `/login` and the 404. After this PR: `index, follow, max-image-preview:large` on every indexable page, `noindex` unchanged |
| og:image | 56 distinct images, every one returns 200 with `image/png` or `image/jpeg` and is exactly 1200 by 630 |
| JSON-LD | Parses on every page that has it (Organization and WebSite on Home; Breadcrumb on 9 pages; FAQPage on /faq, /pricing, /founding, /partners and every guide and industry page; Article on guides; CollectionPage on /guides). None has AggregateRating or Review |
| `/google-profile-check` | 301 to `/scan` (also `/get-started` 301 to `/scan`) |
| Saved `/scan/<code>` | `/scan/KAB-DEMO0000` and `/scan/abc123` both return 200 with `robots` noindex, the generic title "Kabsi: Your free check" and the generic description "Your free check: where you come up nearby, and who came first around you." No business name or data is in the head, because the head is built from the address only (`src/routes/scan.$code.tsx`). `robots.txt` also disallows `/scan/`. A real saved code was not opened (no free check could be run, part 5). |

Not defects, noted: `/login` has no canonical and no share image (it is noindex); the 404 has no description (noindex).

## Part 2. Speed (Lighthouse 12.8.2, 3 runs each, median)

Mobile uses the Speed gate's own setup (390 by 844 at scale 3, Lighthouse's throttling); desktop uses Lighthouse's desktop preset. Script is the transfer size of all scripts.

| Page | Form | Score | LCP | FCP | TBT | CLS | Script | LCP runs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| / | mobile | 98 | 1.98 s | 1.56 s | 99 ms | 0.000 | 207 KB | 2.11, 1.98, 1.95 |
| /pricing | mobile | 96 | 2.16 s | 1.83 s | 139 ms | 0.000 | 222 KB | 2.16, 2.22, 2.15 |
| /scan | mobile | 98 | 1.93 s | 1.61 s | 69 ms | 0.000 | 232 KB | 1.93, 2.13, 1.91 |
| /for/hair-salon | mobile | 95 | 2.71 s | 2.05 s | 61 ms | 0.000 | 262 KB | 2.71, 2.99, 2.63 |
| / | desktop | 100 | 0.51 s | 0.40 s | 0 ms | 0.002 | 207 KB | |
| /pricing | desktop | 100 | 0.72 s | 0.65 s | 0 ms | 0.002 | 222 KB | |
| /scan | desktop | 100 | 0.43 s | 0.39 s | 0 ms | 0.000 | 232 KB | |
| /for/hair-salon | desktop | 99 | 0.75 s | 0.66 s | 0 ms | 0.002 | 261 KB | |

Against the budgets in CI:

| Budget | Where | Home | Pricing | /scan | /for/hair-salon |
| --- | --- | --- | --- | --- | --- |
| LCP at most 3.0 s (the blocking gate, `ci.yml` and `lighthouse-live.yml`) | blocking | 1.98 pass | 2.16 pass | 1.93 pass | 2.71 pass (page not gated) |
| LCP under 2.5 s (R-116 aim for Home) | aim | pass | pass | pass | over |
| Script at most 215 / 225 / 245 KB (live gate; CI 205 / 215 / 235) | blocking | 207 pass | 222 pass, 3 KB headroom | 232 pass | not gated, 262 |
| LCP at most 2.0 s, TBT at most 150 ms, CLS at most 0.05, script at most 120 KB (`lighthouserc.json`) | report only | LCP pass, TBT pass, script over | LCP over, TBT pass, script over | LCP pass, TBT pass, script over | LCP over, TBT pass, script over |
| Score at least 0.95 (Home, Pricing, /scan) and 0.90 (industry pages) | report only | pass | pass | pass | pass |

The gate's number for Home on its own runner was 2.4 to 2.6 s (LATER, Launch 4 part A); on this machine it reads 1.98 s, so use this table for the shape, not the exact LCP.

## Part 3. Consent (TRUST-02)

How the country was set: the consent code decides from `/api/geo` (the host's country header), then falls back to the browser time zone (`src/lib/consent.ts`). It has no test override switch. Three runs, each with a fresh browser profile:

1. UK by network: `/api/geo` answered `{"country":"GB"}` by a Playwright route, locale en-GB, time zone Europe/London. Rule: opt_in. This is the run in the table below.
2. UK by time zone: `/api/geo` answered `{"country":null}`, same locale and time zone. The bar showed and every step matched run 1 (the fallback works).
3. The sandbox as it really is: `/api/geo` says `US`, so the rule is notice (no bar). Meta's Pixel loads about 5 s after load with no choice, which the notice rule allows.

Each step waited 9 s (PostHog and the Pixel start 5 s after load). The user agent was a normal Chrome one, so PostHog and Sentry treated the visits as real. The test sent a handful of real events to PostHog, from a made-up visitor id.

| Step (UK, opt_in) | PostHog (/ingest) | Meta | Sentry | Other third parties | Cookies | Storage |
| --- | --- | --- | --- | --- | --- | --- |
| 1. Fresh, no choice | Script and config load. Two cookieless events ($pageview, landing_viewed) with a random id kept in memory | none | Loader script only (GET); no error happened, so nothing was sent | Vercel Speed Insights script | none | session: kabsi_geo, kabsi_touch |
| 2. Reject all ("Only necessary") | None. The proof goes to Kabsi's own `consent` function. The opt-out flag is stored | none | Loader script on each later page | Speed Insights script | none | local: kabsi_consent, PostHog opt-out flag |
| 2b. Next page after reject | None | none | Loader script | Speed Insights script | none | same |
| 3. Accept | Recorder, heatmap and web vitals events; id kept in a cookie and local storage | fbevents.js, the Pixel's config call, one request to www.facebook.com/tr per event, and one call to an AWS host the Pixel uses (its Conversions API gateway, inferred) | Loader; one report of the report-only content security policy, because the AWS host is not in the policy | Speed Insights | `ph_..._posthog` and `_fbp` on kabsi.co, `fr` on facebook.com | local and session PostHog keys, referrer keys |
| 3b. Next page after accept | Events continue | Pixel loads again | Loader and one policy report | Speed Insights | same | same |
| 4. Withdraw (footer, Your privacy choices, switch off) | Before the fix: events kept going (`$dead_click` at 3.4 s, `$$heatmap` at 4.5 s, two flag calls). After the fix: none (unit test; live check after deploy) | No new Pixel event (one request to www.facebook.com/tr went out at the moment of the click) | none | none | PostHog cookie gone. `_fbp` stayed 90 days (fixed) and `fr` stays (Meta's own) | PostHog keys gone |
| 4b. Next page after withdraw | None (the opt-out flag is back) | `fbq` not defined, none | Loader | Speed Insights | `_fbp` stayed (fixed) | opt-out flag |

Against the rules in `src/lib/consent.ts`: nothing that needs a yes (a persistent PostHog id, session recording, any Meta tag) loaded before a yes in an opt_in country, in either the network run or the time zone run. Sentry's loader and Vercel Speed Insights load under every choice; the privacy page lists both as anonymous statistics and error reports (no IP address, no review text), the consent rules do not gate them, and the Sentry events of automated browsers are dropped by its own filter. Recorded, not changed (lane R may want to say it in plain words on the privacy page).

Defects found and fixed here:

| Defect | Cause | Fix |
| --- | --- | --- |
| After withdrawing a yes, PostHog went on counting dead clicks and heatmaps until the next page load | `posthog.reset()` clears PostHog's opt-out flag (confirmed on kabsi.co: has_opted_out_capturing true, then false after reset); the code opted out first and reset second | `src/lib/telemetry.ts` applies the opt-out again after the reset. Test `tests/live-check.test.ts` fails without the fix |
| After withdrawing, Meta's `_fbp` cookie stayed for 90 days | nothing removed it | `src/lib/meta-pixel.ts` removes `_fbp` and `_fbc` on kabsi.co when advertising turns off. `fr` is set by facebook.com and is Meta's |

## Part 4. Keyboard and screen reader names (A11Y-01, PERF-02)

Home before any scroll, 390 and 1440 px. The `/app` dialog ran on the QA demo owner (fictional Juniper Hair Studio) with a one-time QA code made by `tests/e2e/seed/qa-login-code.sql`; nothing was written except that sign-in code. The business search used stand-ins for the bot check and the suggestions, so no Google call was made.

| Item | 390 px | 1440 px |
| --- | --- | --- |
| Skip link | First Tab stop, "Skip to content", 2 px focus ring, jumps to `#main` | same |
| Menu | "Open menu" button (aria-expanded), dialog "Menu" (aria-modal), focus moves to the first link, Tab stays inside and wraps, Escape closes and focus returns to "Open menu" | Header links show instead (How it works, Businesses, Pricing, Guides, About, Log in, Free check), each with a 2 px ring |
| Search box | combobox "Find your business on Google", `aria-controls`, `aria-expanded`; listbox "Suggestions" with option names; live region "3 suggestions. Use the up and down arrow keys, then Enter to choose."; ArrowDown sets `aria-activedescendant` and `aria-selected`; Escape closes and keeps focus on the box; Enter opens /scan with the place | same |
| Search box focus ring | The ring is a darker border (rgb 94 91 85 on ivory), not an outline; visible, passes 3 to 1 | same |
| Choosing a result | Goes to /scan; focus starts at the top of the new page and nothing is announced about the chosen business | same |
| Cookie bar | region "Cookies"; buttons Accept and Only necessary; Enter on a button works. Before the fix it was last in the tab order (not reached in 25 Tab presses). After the fix it is first | same |
| Dialog in /app | "Your businesses" (business switcher): focus moves to Close, Tab stays inside, background inert. Before the fix, Escape and Close left focus on the page body. After the fix, focus returns to the switcher button | same |
| Lower Home sections waking | A link focused in them lost focus to the page body when they were drawn again (live, both widths). After the fix focus stays on the same link (local build). CLS when they wake: 0.000; the only shift on Home is 0.0095 at 0.8 s (a text swap, at both widths 0.0017 to 0.0095) | same |
| CLS before any scroll | 0.000 in Lighthouse, 0.0095 in the session's own observer | 0.0017 |

Defects fixed:

| Defect | Fix |
| --- | --- |
| Focus fell to the page body when Home's lower sections woke (a fast Tab or a pointer wake while one of their links had focus) | `src/components/kabsi/d9-home.tsx` keeps the focused element's place among the section's focusable elements and gives it back before the next paint |
| Closing any sheet or alert dialog opened by a plain button dropped focus to the page body | `src/components/ui/return-focus.ts`, used by `sheet.tsx` and `alert-dialog.tsx`: the element focused at opening gets focus on closing. This covers every sheet in the app |
| The cookie bar came after the whole page in the tab order | `src/routes/__root.tsx` renders it before the page. It stays fixed at the foot of the screen; the skip link is now the fourth stop when the bar shows. Rollback: move the line back |

## Part 5. Free check timing (feeds the "about 10 seconds" line)

Not run. The free check needs a Cloudflare bot check token before it makes a suggestion or starts. An automated browser never gets one: headless Chromium and a headed one under a virtual display both waited 30 s with no suggestion (`/api/suggest` answered the warm call, the challenge never completed). I did not work around the bot check (that is what it is for). So 0 of the 3 allowed free checks were run, no Google call was made, and no business was touched. Rashid's reply allowed any public business, but the limit is the bot check, not the choice of business.

How Rashid can time it in two minutes, on a phone at kabsi.co/scan: type a business name, choose it, start a stopwatch when the check starts and stop it when "At your address you rank" appears. Do it three times and send the three numbers. Only the quick check counts; the 49-place check takes minutes and arrives on WhatsApp (median 353 s on record).

Where "about 10 seconds" is still written (not changed, awaiting the number): `src/components/kabsi/hero-lines.ts:12`, `scan-live.tsx:172`, `how-page.tsx:49`, `d4-free-check.tsx:33,42`, `d6-home.tsx:524`, `faq-data.ts:117` and `docs/COPY.md` lines 69, 497 and 795. Fixes A dropped "Takes about 10 seconds" from Home's hero; these other lines stay.

## Found, not fixed (LATER rows, source R-126)

1. /for/hair-salon is slower than the gated pages: mobile LCP 2.71 s (2.99 s on one run), script 262 KB; the report-only budgets (LCP 2.0 s, script 120 KB) are missed on every page.
2. Pricing's script is 222 KB against a 225 KB live budget; one more feature on that page fails the gate.
3. Descriptions on `/` (176) and `/guides` (170) are over 160 characters, so search results may cut them.
4. The report-only content security policy does not list the AWS host the Meta Pixel calls, so every visitor who accepts sends one violation report (page address and blocked address) to Sentry.
5. After choosing a search result nothing is announced to a screen reader and focus restarts at the top of /scan.
6. Free check timing (part 5) and the 7 places that say "about 10 seconds".
7. The cookie bar's new place (first in the tab order) is a choice for lane R to confirm.
8. Sentry's loader and Speed Insights load before and after a no; the privacy page covers it in general words only.

## Checks run

See the pull request. Local: `npm run typecheck`, `npm run lint:changed`, `npm test`, `npm run build`.
