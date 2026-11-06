# Launch 1: readiness for paid ads (6 Nov 2026)

On production (kabsi.co), as a new owner would meet it. Master plan 30.35 item 5: paid Meta ads may start before card payments open, Founding 25 traffic only on a small daily budget, once the DataForSEO top-up, Vercel Pro and this check are done. Each line has its evidence; the scripts are in the session's scratch folder and their results are copied here.

## 1. The public journey (iPhone 13 profile and 1440 px)

Pages: Home, /for/hair-salon, Pricing, /scan, the saved result /scan/CFE4RMDN (no new spend), /founding, the review link tool /google-review-link, the guide /guides/why-is-my-business-not-on-google-maps, About, Security, the FAQ and a 404 (/this-page-does-not-exist). No consent given; any call that could spend was stopped in the browser.

| Check | Result |
|---|---|
| Status | Every page 200; the 404 page 404 with its own H1 |
| One H1 | 24 of 24 page loads |
| Console errors | 0, except the 404 page's own "Failed to load resource: 404" (expected) |
| Failed requests | 0 to kabsi.co or its services. Three aborted calls on the iPhone profile went to an AWS host that is not in Kabsi's bundle or pages (the test environment's own) |
| axe serious or critical | 0 on all 24 |
| Covered by the cookie bar, Nora or the phone bar | 0: every link and button in main and the footer, scrolled to the middle of the screen, was the element on top |
| Broken internal links | 0 of 34 checked |
| Spend calls made by a page load | 0 |
| /scan with a real suggestion | Not run: Turnstile does not pass for an automated browser, so no suggestion call was made (LATER row; Rashid on a phone) |
| Founding 25 form with a test entry | Not run for the same reason: the form is behind the same Turnstile gate. No test row was created, so nothing had to be deleted (LATER row) |
| About (part A) live | `curl https://kabsi.co/about`: "Every feature runs on a real Google profile first", "Before an owner sees a feature, Kabsi runs it on a real Google profile.", the founder line of 30.35 item 3; no business name; /llms.txt and /llms-full.txt hold no business name |

## 2. Sign-up and onboarding (QA owner, delivered+kabsi-qa@resend.dev)

The account was reset with `tests/e2e/seed/qa-owner-reset.sql` part 2 (one row: Kabsi QA Cafe, step access) and signed in with an admin-made code (qa-login-code.sql, never printed).

| Step | Result |
|---|---|
| Stage 2, Sign in: find the business, say who looks after it, "Yes, this is my business" | Passed at 390 px (onboarding.spec.ts test 1 up to the next stage) |
| Stage 3, Connect WhatsApp | Skipped by the app for this owner, whose WhatsApp is already connected (right behaviour; the spec still expects the screen, LATER row) |
| Stage 4, Add Kabsi on Google: the agreement, then "Waiting for your invite." | Passed at 390 and 1440 px |
| Back on /start after the agreement | Opens on "Waiting for your invite." at both sizes; the spec's "Your setup link" is now "Send on WhatsApp" and "Send by email" (LATER row) |
| The Google access step's states in mock | The pill's words for none, pending, granted, lost and error: tests/manager-guide.test.ts, 23 passed. A browser stand-in of the state on production did not take (the page reads it through another call), so the states were not seen on screen live |
| Settings (part C) | Every switch and choice on /app/settings saved, persisted after a reload and was put back; times on screen in PR 426 |

## 3. Meta Pixel and Conversions API

Run against production with Meta's /tr calls caught in the browser and answered locally (nothing reached Meta's dataset); the free check and the report were the Scan 2 stand-ins (nothing paid, nothing sent).

| Check | Result |
|---|---|
| Without consent | No fbevents.js load and no event on Home, /for/hair-salon, Pricing and /founding |
| PageView | Once per page, with an event id (Home with ?utm_source=meta&utm_campaign=founding25&fbclid=QA123) |
| ViewContent on a /for page | Did not fire: ViewContent was sent on Pricing only. Fixed in this pull request: every /for/<kind> page sends ViewContent (content_name industry_<kind>), unit tested; to be seen live after the deploy |
| ViewContent on Pricing | Once, with an event id |
| FreeScanCompleted | Once, with an event id (FreeScanStarted once before it) |
| Lead on the report sent | Once, with an event id, after "Sent." |
| Lead on a Founding 25 application | Not seen: Turnstile (above). The code sends it on the form's success (d5-founding.tsx) |
| Conversions API with the same event id | Not possible as built: the server sends only CompleteRegistration, StartTrial and Subscribe (EVENTS.md); the four browser events have no server copy. No meta_capi job in the last 30 days (read of public.jobs), so the server side was not seen live (LATER row for lane R) |
| UTM and fbclid kept | sessionStorage kabsi_touch holds utm_source meta, utm_medium paid_social, utm_campaign founding25, fbclid QA123 and fbc after the free check and still on /get-started (the sign-up door); saved to the account at the first sign-in by save_signup_attribution (not run: no new account) |
| An extra request | After a click, Meta's own script sent one request with no event name (its automatic events; LATER row) |

## 4. The ad landing (Lighthouse, mobile, 3 runs, median; Actions run 42162898466)

| Page | Perf | LCP | TBT | CLS |
|---|---|---|---|---|
| /?utm_source=meta&utm_campaign=founding25 | 95 | 2.7 s | 75 ms | 0.009 |
| /founding?utm_source=meta&utm_campaign=founding25 | 96 | 2.4 s | 97 ms | 0.024 |

/founding is under 2.5 s; Home is not (simulated LCP; real DevTools LCP was 1.85 s in Lean 1). LATER row.

## 5. Claims

Every page of the live sitemap (64) as text, searched for the never-say lists (COPY.md 0.1, plan 2.2, K-144): top of Google, more customers, fully automatic, set and forget, we manage everything, Google-approved, approved by Google, Google partner, remove bad reviews, no work needed, AI recommends you, guarantee, automatically, Profile Score, Do now, Listing Shield, Put mine back, prevents suspension, trusted by, the test business's name, em and en dashes. Every hit is a negation or Google's own words: Terms ("we don't promise ... more customers", "can't guarantee"), the partner terms ("Never say ... approved by Google or is a Google partner"), a guide on extortion ("If someone demands money to remove bad reviews, do not pay"), guides quoting Google ("rejected automatically", "set automatically"), Terms ("Plans don't renew automatically") and "what your dentists do now". "Card payments are coming" is true wherever payments are mentioned: Pricing ("Nothing to pay today. Card payments in US dollars are coming."), the FAQ, Terms and Partners ("Kabsi Partners opens when card payments open").

## Remaining

Ready for paid ads once: the DataForSEO top-up and Vercel Pro are done (Rashid), Rashid has typed a business at kabsi.co/scan on a phone and seen suggestions and sent one Founding 25 test application, ViewContent on a /for page is seen live after this deploy, and lane R has decided Home's 2.7 s LCP (fix it or land the ads on /founding) and Nora's pg03.
