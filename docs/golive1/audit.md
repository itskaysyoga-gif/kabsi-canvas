# Go live 1 part B: audit of kabsi.co (5 Nov 2026)

Audited live https://kabsi.co after main reached 80f20d4 (PR 365). The page source of / held no "At launch" and no "opens at launch" at the start, so no wait was needed. Nothing was fixed, nothing was committed, no real form was sent: every Edge Function POST was answered in the browser.

## What was run

- The QA 2 crawler (scripts/qa2/crawl.mjs) at 360, 390, 768, 1280 and 1440 px, full-page shots at 390 and 1440: 275 visits (every sitemap page, the extra pages /manager-steps, /google-profile-check, /login, /get-started, /setup-call, /unsubscribe, /review/QA2TEST, /scan/QA2TEST, /for/barbershop, /?menu=open, the 404, and the seven stubbed free check states). The repo copy hung on one visit, so it was rerun from a scratch copy with a 120 s limit per visit (B-038); one visit (/about at 360) hit the limit and passed on a separate retry.
- The same crawler with `--geo GB` (cookie bar on) for Home, Pricing, the free check, its result, Founding 25, Partners and the review link tool at 360, 390 and 768.
- A text pass of 48 pages at 390 px with every FAQ opened, checked against the never-say lists (master plan 30.15 section 1, 30.20 section 3, COPY.md 0.1), the old names, the launch words, dashes, exclamation marks and Arabic, and every price, count and allowance against src/lib/site.ts and src/components/kabsi/plans.ts.
- A section and yellow pass on Home, How it works, Pricing, /for/hair-salon and /for/restaurant at 390 and 1440 (headline and first line word counts, every element drawn in Kabsi yellow).
- Forms in the browser with page.route: the free check, Founding 25, Partners, Nora and the review link tool, each answered 200, 400 and 500.
- curl: every sitemap URL (status, canonical, robots), robots.txt, llms.txt and llms-full.txt against the repo, every internal and external link once.
- An image pass (missing alt, files far larger than shown) at 390 (2x) and 1440 (1x).
- Lighthouse 12, mobile, performance only, three runs each on /, /pricing and /scan, with Chromium 1243 from /opt/pw-browsers.

## What is clean

- Zero "At launch", "opens at launch", "from launch" or any "launch" word on 48 pages, in alt text, titles, descriptions and aria labels. Zero em dashes, en dashes, exclamation marks or Arabic script. Zero old names (Monday receipt, Monday Report, Weekly Care Report, Profile Score, Listing Shield, review reply tool).
- No promise of rankings, reviews, customers or revenue in marketing copy. The only hits are Google's own button name "Get more reviews" in the guides and the terms' "What we don't promise" list.
- Card payments: every page says "Card payments in US dollars are coming" or "Nothing to pay today". WhatsApp, the nearby check and the AI answer are described as on.
- Every price matches the code: $29 / $290, $59 / $590, extra location $15 / $150, founding $19 / $190 and $39 / $390 for the first 30, Founding 25 three months of Pro, trial 14 days of Pro, 30 days through a partner, 2 posts a month or weekly, the checks 1 search a month and 3 questions a month (Essentials) or 5 searches a week and 10 questions every 2 weeks (Pro).
- Axe: no serious or critical issue (no issue at all) on any page at 390 or 1440. No sideways scroll at any width. One H1 on every page and width. Every JSON-LD block parses (Organization and WebSite on Home, FAQPage on Pricing, Founding, FAQ, Partners and 11 industry pages, Article on the 7 guides, BreadcrumbList elsewhere), and none carries rating markup.
- All 38 sitemap URLs answer 200, are self-canonical and indexable. The live sitemap equals public/sitemap.xml. http and www redirect to https://kabsi.co. llms.txt and llms-full.txt on kabsi.co are byte for byte the repo's files.
- No broken internal link, no missing hash target, no button without a name. No image without an alt attribute.
- The cookie bar (GB) covers no button on the pages checked.
- Every form sends what the code says and shows a success state and an error state (details per form below). The free check result leaves out the nearby and AI parts quietly when the visibility call fails.

## Totals by kind

| Kind | High | Medium | Low | Total | Lane R |
| --- | --- | --- | --- | --- | --- |
| Copy and facts | 0 | 4 | 10 | 14 | 9 |
| Numbers | 0 | 1 | 2 | 3 | 3 |
| Section and yellow rule | 0 | 3 | 3 | 6 | 6 |
| Links and buttons | 0 | 1 | 1 | 2 | 0 |
| Forms | 0 | 0 | 2 | 2 | 0 |
| SEO and structured data | 0 | 0 | 3 | 3 | 0 |
| Accessibility | 0 | 0 | 1 | 1 | 0 |
| Layout and covered | 0 | 1 | 0 | 1 | 0 |
| Images | 0 | 0 | 2 | 2 | 0 |
| Speed | 0 | 3 | 0 | 3 | 0 |
| Tooling | 0 | 0 | 1 | 1 | 0 |
| All | 0 | 13 | 25 | 38 | 18 |

No high-severity finding: nothing false about price, payments or what is switched on, nothing broken for a visitor, nothing unsafe.

## Lighthouse (mobile, performance, three runs, median)

| Page | Perf | LCP s | TBT ms | CLS | Script KB (transferred) | Budget (master plan) |
| --- | --- | --- | --- | --- | --- | --- |
| / | 85 (83, 85, 90) | 3.68 | 68 | 0.009 | 209 | 215 KB live (30.26 item 2): within |
| /pricing | 83 (80, 83, 84) | 3.99 | 107 | 0.009 | 220 | 120 KB (24.9): over by 100 |
| /scan | 97 (88, 97, 97) | 2.13 | 132 | 0.000 | 238 | 120 KB (24.9): over by 118 |

24.9 also asks performance 95 and LCP 2.0 s. The largest paint on all three is text (the Home lead, the Pricing and free check H1) with about 600 ms to first byte and 2.7 to 3.5 s of render delay, so the wait is fonts and the shared 135 KB index chunk, not images. These runs went through the session's outbound proxy, which adds latency; compare with the CI Lighthouse before acting on LCP alone.

## Forms (390 px, every POST answered in the browser)

| Form | Request | 200 | 400 | 500 |
| --- | --- | --- | --- | --- |
| Free check (/scan) | POST functions/v1/profile-snapshot {action, query, turnstile}, then {action, place_id, turnstile} | Result card: "What Kabsi found", "0 to fix, 6 already right", "What Kabsi would do from day one", nearby and AI parts left out with no line | "The check did not run" / "Something went wrong on our side." / the server's message / Try again (B-018) | Same card with "That didn't work. Please try again." |
| Founding 25 (/founding) | POST functions/v1/programs/founding {business_name, country, trade, business_kind, whatsapp, why_now, case_study, checkin_consent, turnstile} | "Application sent." and the 2 working days line | The message under the WhatsApp field (field mapping works) | Banner "Something went wrong. Please try again in a minute." |
| Partners (/partners) | POST functions/v1/programs/partners {name, email, kind, terms, turnstile} | "Application sent. Kabsi replies with the next step." | The message under Email | Banner "Something went wrong. Please try again in a minute." |
| Nora (phone button) | POST functions/v1/assistant {visitor, conversation, message, page, surface, meta {tz, lang, device, ref}, turnstile} | The answer shows in the sheet | The server's message shows | "Something went wrong." only (B-036) |
| Review link tool | POST functions/v1/review-link {query, turnstile} | Link, Copy link, the ready message, Download QR code, Print a counter card, Google's rules line | The server's message under the field | "Search didn't work. Try again." |

No form sent anything to a real endpoint; the only unanswered call was the free check's POST visibility/check, refused on purpose to test the quiet failure.

## Findings by page family

Severity: high, medium, low. "lane R" marks a copy or design choice for lane R, not a clear bug. Screenshots of pages with findings are in docs/golive1/before/ (390 and 1440 full pages).

### Home

**B-001** Home, 390 and 1440. Section rule: the hero line has 27 words (limit 20). Evidence: `section#hero-title p`, "Kabsi checks your Google profile every day, prepares the fixes, posts, photos and replies it needs, and brings each one to you on WhatsApp for a yes." Severity medium, lane R. Fix: a line of 20 words or fewer, for example 30.20's approved "Reviews to reply to. Details to keep right. Posts to prepare. Kabsi does the work and asks for your yes on WhatsApp." trimmed, or cut "it needs".

**B-002** Home, How it works and Pricing, all widths. Section rule: the steps strip headline has 13 words and five points (limits 8 and 3). Evidence: `section#steps-h` (Home), `#how-steps-h`, `#pricing-steps-h`: "The whole job: Kabsi checks, prepares, asks you on WhatsApp, follows through, reports." with markers 1 to 5. COPY 45 kept it "unchanged words". Severity medium, lane R. Fix: decide whether this strip is a section (then 8 words, 3 steps) or a caption under the hero; if kept, say so in COPY 45.

**B-003** Every public page, 390 and 1440. Yellow rule: Nora's button carries a yellow circle (`button[data-nora-launcher] span.bg-kb-yellow`, `[data-nora-bar] span.bg-kb-yellow`), which is none of the four allowed uses. Severity low, lane R. Fix: charcoal or ivory icon circle, or record Nora's button as an allowed use in DESIGN.md.

**B-004** Home, all widths. Numbers: the Example map says "You came up in the first 3 at 3 of 8 places Kabsi checked." while the real nearby check and the industry Examples use 49 places (map-data.ts, industryCheck "the salon's pattern of 49 places"; 30.15 section 2 "at 18 of 49 places"). Severity low, lane R. Fix: use the 49-place count in the Example, or say the Example shows 8 of the places.

**B-005** Home and /founding, 390 and 1440. Images: the founder photo is served far larger than shown: founder-rashid-800 (800x800) drawn at 80 px on a 2x phone (5x) and 128 px at 1440 (6.3x); founder-rashid-400 drawn at 48 px on /founding (4.2x and 8.3x). Severity low. Fix: a 160 and 256 px variant through srcset and sizes.

**B-006** Home at 768, and the trade photo on the industry pages at 360 and 390. Images: 800x531 landscape files are cropped into portrait cards (350x438 on a 2x phone), so they are upscaled 1.5 to 1.65 times and look soft: barber-cut, nail-technician, restaurant-dining (Home 768 and their pages), auto-garage, bakery-window, gym-training, aesthetic-treatment, physio-stretch, massage-therapist; the 1600 variants of aesthetic-laser, nail-desk and physio-back are 1.32 times at 768. Severity low. Fix: portrait crops (or a 1200 w file) in the srcset for these cards.

### How it works

No finding of its own beyond B-002. The hero line (18 words), the demonstration, Getting started and You stay in control meet the section rule; yellow is only the main action and numbered markers.

### Pricing

**B-007** Pricing, 390 and 1440. Section rule: the hero line has 23 words. Evidence: "Each plan does the Google work for one business, and you approve every change. Prices in US dollars, plus tax where it applies." Severity low, lane R. Fix: drop the second sentence (the cards and the line under them already say it).

**B-008** Pricing, all widths. Copy: one report under two names on one page: the Essentials card says "Your weekly report every Monday, with one next step", the comparison says "Results Report every Monday, with one next step" (plans.ts `top` and `PLAN_ROWS`). Severity low. Fix: one name in both, as K-02 names it.

**B-009** Pricing and FAQ. Copy and facts: "Can I cancel? Yes, any time. Your plan runs to the end of the period you paid for." sits beside "Cancelling in Creem's own billing page ends the plan at once." Severity low, lane R. Fix: "Yes, any time. Cancel on the Plan page and your plan runs to the end of the period you paid for."

**B-010** Pricing, 390 and 1440. Yellow rule: a yellow "Start free" button in the plan cards (`section#plans-h a`, 300x52 at 390) is a second yellow action that is not the main one (the free check). Severity low, lane R. Fix: secondary style on the card buttons, or name "Start free" the main action of that screen in DESIGN.md.

**B-011** Pricing, Home, /for and industry pages. Numbers: the Founding 25 line above the header says "25 places left." while COPY 0.1 says "[n] of 25 places left." (the /founding page and Pricing body use "25 of 25 places left."). Severity low, lane R. Fix: the same words in the slim line.

**B-012** /pricing, mobile Lighthouse. Speed: 220 KB of script transferred, over the 120 KB of 24.9 and over Home's 215 KB; performance 83, LCP 3.99 s. Severity medium. Fix: set a Pricing budget in 30.26 or bring the comparison and FAQ code behind the first paint like Home.

### Businesses and /for pages

**B-013** /for, all widths. Links: the hub links /for/dental-clinic, which is noindex, not in the sitemap and marked "noindex and out of the sitemap until it has one [claim sheet]" (dental-clinic.ts), while types.ts says unfinished pages "stay noindex and unlinked". Evidence: `a[href="/for/dental-clinic"]` under "More kinds of business". Severity medium. Fix: unlink it until its claim sheet is written, or write the sheet and index it.

**B-014** /for/hair-salon and /for/restaurant, 390 and 1440. Section rule: headlines "The Google jobs that come back for a hair salon." (10 words) and "... for a restaurant." (9); first lines of 30 and 28 words in that section, 33 words in "What people search for" (both pages), 87 words (hair salon) and 53 words (restaurant) in "Your Google profile, as a ... owner"; hero lines 26 and 22 words. Severity medium, lane R. Fix: decide whether the long-form SEO block is exempt from 30.25 item 3; trim the jobs headline to "Google jobs that come back." and the hero and search lines to 20 words.

**B-015** /for/hair-salon and /for (hair salon card). Copy and facts: job 1 "New services, with a price and a line each" reads as work Kabsi does, while the FAQ on the same page answers "Can Kabsi add a new service to my Google profile? Not yet." Severity medium. Fix: "Services missing from your profile, listed by the Profile Coach", or move the job lower with "Kabsi lists what is missing".

**B-016** Every industry page, the hero and closing scan box. Copy and facts: "Kabsi searches for 'hair salon', like a customer." (and "'restaurant'") under the free check box, while the free check reads the public profile and does not search or rank (facts line 240, 30.27 item 2). Severity medium, lane R. Fix: "Free check. No Google access needed. Takes about 10 seconds." alone, or keep the line only where the nearby check runs.

**B-017** Industry pages and guides. SEO: titles over 65 characters on /for/hair-salon (86), /for/nail-salon (84), /for/restaurant (78), /for/barbershop (78) and the ChatGPT guide (75); descriptions over 165 characters on /for/spa-and-massage, /for/medical-and-aesthetic-clinic, /for/physiotherapy, /for/cafe, /for/bakery, /for/auto-repair, /for/gym-and-fitness (187 to 235), /guides (238) and Home (175). Titles also mix "Kabsi: X" and "X | Kabsi". Severity low. Fix: titles under about 60 characters and descriptions under about 160, one title pattern.

### Free check and saved result

**B-018** /scan, 390. Forms: a 400 from profile-snapshot (the visitor's input) shows "The check did not run. Something went wrong on our side." above the server's own message. Severity low. Fix: on a 4xx show the server's message without "on our side". Screenshot: before/freecheck-400-390.png.

**B-019** /google-profile-check. SEO: the old address answers 200 with the same page as /scan (same title and description, canonical /scan). Severity low. Fix: a 301 to /scan in vercel.json.

**B-020** /scan, mobile Lighthouse. Speed: 238 KB of script (scan-live adds 9 KB to the shared 135 KB chunk), double the 120 KB of 24.9; performance 97 and LCP 2.13 s are near the budget. Severity medium. Fix: a /scan budget in 30.26, or load scan-live on the first touch of the box.

/scan/QA2TEST shows "This report has expired." with the box, noindex and self-canonical: as designed. The stubbed result has no finding.

### Review link tool

No finding. 200, 400 and 500 all show the right state; the rules line ("Do not offer anything in return, and do not ask only happy customers") shows with the result.

### Guides

**B-021** /guides/why-chatgpt-describes-your-business-wrongly. Links: https://help.openai.com/en/articles/9237897-chatgpt-search answers 403 to curl (likely bot protection, not a dead page). Every other external source answered 200. Severity low. Fix: open it by hand; if it moved, link OpenAI's current page.

### FAQ, About, Security

**B-022** /faq "What does Kabsi cost?". Copy and facts: "Both plans are free for 14 days, with no card." while the trial is 14 days of Pro, one per business (facts line 40, the next answer). Severity low. Fix: "The trial is 14 days of Pro, with no card."

**B-023** /faq "What does the free check keep?". Copy and facts: "If you ask for the result by email or join the waiting list" names a waiting list the site no longer offers. Severity low, lane R. Fix: drop "or join the waiting list" if no form offers it.

**B-024** /faq "Does Kabsi have a WhatsApp number?". Copy: "Yes. Message Kabsi on WhatsApp, or write to hello@kabsi.co." gives no number, while COPY 48 says the on answer gives the number. Severity low. Fix: "Yes, +1 205 745 6874. ..."

**B-025** /about. Copy and facts: the founder quote "local owners lose customers to a Google profile nobody has time to look after" sits next to the never-say "more customers". Severity low, lane R. Fix: "local owners have a Google profile nobody has time to look after".

**B-026** /about, /faq (Talk to a person), /setup-call, /privacy section 14. Copy and facts: "Ask a question on WhatsApp. A person answers." and "A person replies" while Nora answers visitors on WhatsApp from the facts (COPY 48, question 3, still open). Severity medium, lane R. Fix: lane R picks the line, for example "Nora answers at once, and a person takes over when you ask."

**B-027** /privacy. Copy: "the Kabsi app" and "the app" six times ("It covers the website, the Kabsi app", "never inside the app", "from the app or an email link", "Preferences: the app remembers") against COPY 0.1. Severity low, lane R (legal page). Fix: "your Kabsi account on kabsi.co".

/security: no finding.

### Partners and /p

**B-028** /partners, all widths. Copy and links: the Example shows "kabsi.co/p/sam" and lists "Your own page and QR code", but no /p route exists (kabsi.co/p/test answers 404) and the facts give the partner link as kabsi.co/?via=CODE. COPY section 11 (/p/HANDLE) is not built. Severity medium. Fix: show "kabsi.co/?via=SAM" in the Example and "Your own link and QR code", or build /p before partners open.

**B-029** /partners. Copy and facts: earnings are quoted ("$14.75 a month" per Pro business, "about $147.50 a month" for 10), from the $59 list price, while the facts say "Do not quote earnings" and the first 30 businesses pay $39 (25 percent is $9.75). Severity low, lane R. Fix: keep the Example only with "at the list price", or show the rate alone.

**B-030** /partners. Copy: the hero says "Everything runs on WhatsApp." and step 1 is "Apply on WhatsApp", while the form at the end is "Apply by email". Severity low, lane R. Fix: "Apply on WhatsApp or by email" in step 1.

There is no /p route in src/routes; partner links use ?via= (src/lib/attribution.ts).

### Founding 25

No copy finding. The form works for 200, 400 (error under the field) and 500. See B-031 for the tick box target.

### Setup help and Log in

**B-031** Several pages, 360 to 768. Accessibility: touch targets under 44 px: the founding and partner tick boxes (20x20 input; the label row is 44 px, so it passes in practice), the "kabsi" logo link on /get-started (84x28), the inline "See how it works" in the reply guide (129x22), a 52x32 button on /how-it-works (the demonstration), "Your privacy choices" on /privacy (158x26), the Founding 25 link on the free check result at 768 (358x21). Severity low. Fix: min-h-11 on those links and buttons.

**B-032** /setup-call, /faq (setup answer, src/lib/faq.ts) and the facts. Numbers: "Calls run Monday to Friday, 8am to 6pm Beirut time." while Pricing and the plan cards say "Working hours: Monday to Friday, 9:00 to 18:00, UAE time." Two schedules for one team, and a Beirut time is Lebanon-only wording (K-123). Severity medium, lane R. Fix: one schedule, in UAE time (WORKING_HOURS), on /setup-call, the FAQ and the facts.

**B-033** /setup-call. Copy: "The call is about: Setting up my Google profile, Partner or agency, Something else." reads as an unfinished sentence (the old Calendly question). Severity low. Fix: drop it, or "Tell us in the email if it is about setup, partnering or something else."

**B-034** /setup-call. SEO: indexable and self-canonical but not in the sitemap. Severity low. Fix: add it to public/sitemap.xml or mark it noindex.

**B-035** /setup-call and the 404 at 768. Layout and covered: Nora's wide button ("Chat with Nora", `button.fixed.right-6.bottom-6`) sits over the footer's Facebook and Instagram links on the first screen of short pages; the button is also charcoal on the charcoal footer. Evidence: crawler `coveredFirst` "Kabsi on Facebook under button.fixed right-6 bottom-6", before/setup-call-768-first.png. Severity medium. Fix: add the social links to AVOID in site-chrome.tsx, or bottom padding in the footer while the wide button shows.

/login: no finding (noindex, "Continue with Google", "Continue with email", the Google sign-in line).

### Nora (every page)

**B-036** Nora, 390. Forms: on a 500 without a message the sheet says only "Something went wrong." with no next step. Severity low. Fix: "Nora could not answer. Try again, or write to hello@kabsi.co." Screenshot: before/nora-500-390.png.

### Home speed

**B-037** /, mobile Lighthouse. Speed: script 209 KB is within the 215 KB live budget, but performance is 85 (budget 95) and LCP 3.68 s (budget 2.0 s), with the hero lead as the largest paint after a 3 s render delay. Severity medium. Fix: check the CI Lighthouse on the Vercel preview first (this run went through a proxy); if it agrees, preload the heading font or use a system fallback for the lead's first paint.

### Legal

Covered by B-027. /terms and /partners/terms carry no launch line; "Card payments are coming" and "Kabsi Partners opens when card payments open" match COPY 48.

### 404

No finding: answers 404, one H1 "This page is not here.", Go home and the free check. B-035 applies at 768.

### Tooling

**B-038** scripts/qa2/crawl.mjs. Tooling: there is no limit per visit, so one stuck visit (axe or a full-page shot) holds the whole crawl and findings.json is never written; the first run here stopped at 274 of 275 visits for over 8 minutes. Severity low. Fix: wrap each visit in a Promise.race with a 120 s limit that records an error, as the scratch copy did.

## Not run, and limits

- WebKit was not crawled (Chromium only).
- The free check's real nearby and AI parts were not seen with data: the visibility call was refused on purpose, and live data would spend the DataForSEO balance.
- Nora's real answers and the live review link, profile-snapshot and programs functions were not called.
- Lighthouse ran through the session's proxy, 3 runs per page, not on the CI runner; only performance was measured.
- The meaning of every line on the 7 guides and the legal pages was read for the word lists and launch lines, not line by line against every fact.
