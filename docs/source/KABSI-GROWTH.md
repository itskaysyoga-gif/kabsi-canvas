# Kabsi: Growth and Technical Playbook

Oct 2, 2026

## Summary

Kabsi's biggest growth risk is economics, not technology. At \$19 a month with a no-card trial, published benchmarks put trial-to-paid between 9% and 18%, so paid ads pay back within a quarter only if a trial costs about \$6 or less. Meta ads should therefore start as a learning budget, while most of the effort goes into channels where Kabsi's low price is visible and acquisition is nearly free: the two free tools, search, agency partners and referrals.

The ten decisions that matter most:

1.  **Meta is a learning budget for 60 days**, optimised on trials and then on businesses granting Google access, with clear cut-off costs (G-01).

2.  **A merchant of record for card payments**: decided as Creem (audit K-106, K-107), live and tested before any ad spend. It collects and remits sales taxes, so the remaining reason to register the company now is the seller identity Creem and Meta require (K-65).

3.  **Consent by country, and proof of it**, with the Meta Pixel loading only after consent where the law requires it. Saudi Arabia's regulator issued 48 violation decisions in 2025 (G-18, G-21).

4.  **Meta Pixel plus server events with shared event IDs**, so Meta learns which businesses actually grant access and pay (G-19).

5.  **Two authenticated email subdomains**: Resend for transactional mail, Loops for a behaviour-triggered trial sequence (G-22 to G-25).

6.  **Activation means access granted and a first reply approved**, not signup, measured within 24 and 72 hours (G-28).

7.  **Dedicated ad landing pages**, testing "Check my profile free" against "Start free" as the first experiment (G-26, G-34).

8.  **Up to 20 industry pages, each genuinely different**, Arabic under /ar/, no city pages (G-04, G-06).

9.  **AI search through ordinary SEO and third-party presence** (G2, YouTube, honest Reddit participation), not llms.txt (G-08 to G-11).

10. **Public pages cached at the edge and a strict budget for tracking scripts**, with security headers and rate limits protecting the free tools from abuse (G-12, G-14 to G-16).

The research was corrected in twelve places where it assumed a different product, most importantly owner Google sign-in (Kabsi uses Manager access), a Profile Check score (Kabsi has none), and benchmarks built from other businesses' Google data, which Google's terms do not allow.

## How to use this playbook

This is the third of three Kabsi documents. It covers how Kabsi gets found, loads, stays safe, tracks, emails and converts. It is built from a deep research report on 2025 and 2026 evidence (1 October 2026), checked against Kabsi's code and the decisions already taken.

| Document                                         | Covers                                                                            | Decisions                 |
|--------------------------------------------------|-----------------------------------------------------------------------------------|---------------------------|
| Kabsi: Full Audit and Product Decisions          | Product, engineering, Google policy, roadmap                                      | K-01 to K-85 (the master) |
| Kabsi: Website, App and Conversion Design Review | Brand, pages, dashboards, emails, conversion design                               | Follows the K-decisions   |
| Kabsi: Growth and Technical Playbook (this one)  | SEO, AI search, speed, security, tracking, email, funnels, analytics, Middle East | G-01 to G-47              |

Where this playbook conflicts with a K-decision, the K-decision wins unless the G-decision says it amends it. Where the research conflicts with how Kabsi actually works, the research was corrected; the next section lists every correction so nobody re-imports the error.

Evidence labels used below: **Established** means current official documentation or law; **Benchmark** means published third-party data, often conflicting; **Practice** means stable industry practice not re-verified in the 2025 to 2026 window; **Kabsi call** means a judgement made for Kabsi. Nothing here is legal or tax advice.

## Corrections to the research

The research is strong on rules and benchmarks, but it assumed a generic Google-connected SaaS. Twelve of its recommendations would be wrong for Kabsi as built and decided. Each is corrected here and in the sections below.

| \#  | Research said                                                                                                   | Kabsi reality                                                                                                                                                                       | Correction                                                                                                                                   |
|-----|-----------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------|
| 1   | Owners connect through Google sign-in (OAuth) and pick a location; "Google sign-in, we never see your password" | Owners invite Kabsi's business group as a Manager (K-04). There is no owner Google sign-in                                                                                          | Activation event is google_access_granted. Trust line: "Add Kabsi as a Manager. We never see your password, and you can remove us any time." |
| 2   | Store owners' Google OAuth refresh tokens encrypted in Vault                                                    | Kabsi holds one central Google credential in server secrets (K-42)                                                                                                                  | No per-owner tokens to store; keep the central credential in secrets and rotate it                                                           |
| 3   | Domain kabsi.com, mail from mail.kabsi.com and news.kabsi.com                                                   | The domain is kabsi.co; transactional mail already sends from send.kabsi.co                                                                                                         | Use send.kabsi.co for transactional and news.kabsi.co for marketing (G-22)                                                                   |
| 4   | Profile Check shows "the score plus the top three issues"                                                       | No scores (K-07)                                                                                                                                                                    | Show the top three findings with Urgent, Recommended or Nice to have                                                                         |
| 5   | CTA "Fix these 7 issues automatically"                                                                          | "Automatically" is a banned claim; the owner approves everything (K-53)                                                                                                             | "Kabsi can take care of these. You approve each one."                                                                                        |
| 6   | Profile Check reports the description and review replies                                                        | Google's public data does not include the owner's description, photo dates or replies                                                                                               | Free check shows only public fields; the rest appears after connecting (K-82 note)                                                           |
| 7   | Pre-generate drafts for the last 10 unanswered reviews                                                          | Kabsi drafts the whole backlog on day one (K-66)                                                                                                                                    | Keep K-66; "23 replies ready" rather than a fixed 10                                                                                         |
| 8   | WhatsApp utility template to users who have not connected within 24 hours                                       | Automated WhatsApp is deferred until the company is registered (K-57, K-65)                                                                                                         | Email automatically; WhatsApp only as a wa.me button or a manual staff nudge                                                                 |
| 9   | Ad headline "Every Google review answered, in your voice — you just tap approve"                                | House style bans dashes (CLAUDE.md)                                                                                                                                                 | "Every Google review answered in your voice. You just tap Approve."                                                                          |
| 10  | UAE VAT: non-residents must register immediately for consumer sales                                             | VAT rules follow where the company is registered and operated (Rashid lives in Lebanon); decide this with the company registration (K-65, G-43), not from the research's assumption | Get UAE tax advice; a merchant of record removes most of this (G-37, G-38)                                                                   |
| 11  | English pages move to /en/                                                                                      | All English pages already live at the root; moving them costs redirects and search history                                                                                          | English stays at the root as x-default; Arabic goes under /ar/ (G-04)                                                                        |

One correction does not fit the table because it affects several sections. **12. Benchmarks from Profile Check data.** The research suggests building industry pages and PR from "aggregated Profile Check data". Google's Maps Platform terms limit storing and caching Places content, and Google's Business Profile API policy forbids aggregating stored content (K-27). Kabsi must not build a database of other businesses' ratings or review counts. What Kabsi may publish is its own activity data: how fast owners approve replies, how many replies and profile fixes Kabsi published, average time to first reply after joining. See G-40.

## Unit economics and channel strategy

The research's most important finding is not technical: at \$19 a month with a no-card trial, paid ads only work if a trial costs about \$6 or less. That changes how the \$1,000 a month Meta budget should be used.

**The maths** (Benchmark plus Kabsi call):

| Input                         | Value                                                 | Source                                                          |
|-------------------------------|-------------------------------------------------------|-----------------------------------------------------------------|
| Trial to paid, no-card trials | 9% to 18%                                             | ChartMogul 2026 (8.9%); First Page Sage, September 2025 (18.2%) |
| Kabsi target trial to paid    | 12% or more                                           | Kabsi call                                                      |
| Payback target                | 3 months, so cost per paying customer of \$57 or less | Kabsi call                                                      |
| Maximum cost per trial        | About \$6.80 (\$57 x 12%)                             | Derived                                                         |

Cold Meta traffic to small business owners rarely produces trials that cheap at the start. So:

**G-01 Meta is a learning budget first.** For the first 60 days, judge Meta on what it teaches (which message, which trade, which country converts), not on payback. Optimise on trials started until about 50 owners a week grant Google access, then switch optimisation to google_access_granted (G-19). The payback target means about \$11 per business that grants Google access (if 20% of them pay, \$57 buys one customer). During the learning phase accept up to three times that, and cut any ad set still above \$35 per access-granted business after \$300 spent.

**G-02 Targets for the funnel** (Kabsi call, to be replaced by real numbers after 100 trials):

| Step                                                   | Target                                                    |
|--------------------------------------------------------|-----------------------------------------------------------|
| Trial to Google access granted within 24 hours         | 60% or more                                               |
| Access granted to first approved reply within 72 hours | 80% or more                                               |
| Access granted to paid                                 | 20% or more                                               |
| Overall trial to paid                                  | 12% or more                                               |
| Monthly logo churn in month 1                          | 6% or less (industry convention, not a sourced benchmark) |

**G-03 Channel mix.** Put most effort where Kabsi's price advantage is visible and cost per trial is near zero:

1.  **Free tools and SEO:** the review link generator and Profile Check, linked from industry pages and guides.

2.  **Agency partners:** each partner brings many businesses for one sales conversation (K-29 to K-32).

3.  **Referrals:** owner-to-owner, with the reward chosen in K-62.

4.  **Meta ads:** learning budget, as above.

5.  **Lebanon field sales:** only as far as demand allows. The World Bank's August 2026 Lebanon Economic Monitor projects the economy to contract by 6.4% in 2026 after renewed conflict, a real demand risk.

The price comparison supports this mix. Localo's single-business plan costs \$49 a month (\$39 yearly), BrightLocal starts at \$39, and Birdeye is reported at \$299 to \$449 per location on yearly contracts. Kabsi at \$19, cancel any time, with the price on the homepage, is the cheapest credible done-for-you option.

## Technical SEO and Arabic SEO

Kabsi's SEO base is already better than most early sites: server rendering, JSON-LD, sitemaps and industry pages. The work now is to move it to kabsi.co (design review, build order item 1), add Arabic properly, and keep programmatic pages on the right side of Google's scaled-content policy.

**G-04 URLs and languages.** English stays at the root (kabsi.co/pricing) as x-default; Arabic lives under /ar/ on the same domain, never a subdomain or a separate country domain. Every page pair carries reciprocal hreflang="en", hreflang="ar" and x-default. Regional variants (ar-AE, ar-SA, ar-LB) only when the content really differs, such as prices in AED or SAR. Arabic URLs use short Latin slugs (/ar/google-reviews-reply), because Arabic-script slugs turn into long encoded strings when shared on WhatsApp. (Practice)

**G-05 Technical basics** (Practice; most already exist, check each):

- Every marketing, industry, guide and free-tool page server-renders its title, description, canonical, H1, body and JSON-LD in the first response. Nothing SEO-relevant waits for JavaScript.

- The app (/app, /partner, /staff, /a/\*) is noindex and excluded from sitemaps.

- Canonicals strip UTM and other query parameters.

- Schema: Organization and WebSite on Home; SoftwareApplication with offers (19 USD) on Pricing; FAQPage only where questions are visible; BreadcrumbList on industry pages. Never a self-made AggregateRating.

- Separate sitemaps for English, Arabic and tools, with accurate lastmod, submitted in Search Console.

- Internal links: Home to the top industry pages, each industry page to one free tool, each tool result to Start free; every guide links to one tool and one industry page.

**G-06 Industry pages: up to 20, each genuinely different.** Google's scaled content abuse policy targets many pages made mainly to rank, whatever method made them (Established; spam update from 26 August 2025). Each industry page needs at least three elements no template can produce:

1.  Real example reviews and replies for that trade, in English and Arabic, written or approved by a person.

2.  The Google categories, attributes and photo types that matter for that trade.

3.  A worked example (a café's first week with Kabsi, using Kabsi's own activity data, G-40).

4.  Trade-specific rules (no patient confirmation for clinics, K-13).

Start with the 8 existing trades, add up to 12 more only when each meets the bar. No city pages, no city by trade grids, and no machine-translated Arabic pages published in bulk.

**G-07 Arabic SEO.**

- \<html lang="ar" dir="rtl"\>, CSS logical properties, full right-to-left layout with numbers, prices and brand names kept left-to-right.

- Headlines and legal text in Modern Standard Arabic; ad and landing copy in Gulf phrasing for UAE and Saudi Arabia, Levantine for Lebanon.

- Keywords in both standard and spoken forms (for example "ملف جوجل التجاري" and "جوجل بزنس"), refined from Search Console and Keyword Planner after launch.

- A native Gulf speaker and a native Levantine speaker review copy before publishing. No raw AI output.

- One .co domain with good hreflang and local signals (local examples, AED and SAR prices, a WhatsApp button) is enough; do not buy country domains.

Measure: indexed share of submitted pages (90% or more), clicks and impressions per industry page, non-brand clicks, tool-page to trial rate, Arabic versus English impressions.

## AI search visibility

Getting cited by ChatGPT, Gemini, Perplexity and Google's AI Overviews comes from the same things as normal search, plus presence on the third-party sites those engines quote. There is no special file or markup that does it. This section amends the design review's AI search paragraph, which leaned on llms.txt.

**What is established:**

- Google says there are no extra requirements or special optimisations for AI Overviews or AI Mode, and no need for AI text files or markup, because Google Search does not use them (Google Search Central, updated December 2025; Google's AI optimisation guide, May and June 2026).

- llms.txt is not used by the major engines. Google's John Mueller said no AI system uses it (June 2025); SE Ranking found no link between having one and being cited (November 2025); one large test file received no visits from the main AI crawlers over two months.

- AI engines most often cite Reddit, YouTube, LinkedIn, Wikipedia and major publishers, with Yelp and G2 common for "best tool" questions (Search Engine Land study of 30 million sources, 2026).

- Engines differ: AI Overviews and AI Mode cite the same pages only 13.7% of the time (Ahrefs, September 2025), and citation sources can shift sharply within weeks.

**Strong but correlational:** most ChatGPT citations come from the first third of a page, and cited pages use direct "X is" answers under question-style headings (Kevin Indig, February 2026).

**G-08 Facts page and answer-first writing.** Publish kabsi.co/facts: what Kabsi is, price, countries, languages, what it does and does not do (owner approves everything, no ranking promises), who runs it, how to reach a person. Every guide and industry page opens with a 40 to 60 word direct answer, then detail, with question-style H2s ("How do I reply to a negative Google review?").

**G-09 Be present where AI engines look.** In order:

1.  G2 and Capterra listings, with genuine reviews from real customers once they exist (never incentivised or fake).

2.  YouTube walkthroughs of both free tools and of approving a reply on a phone, in English and Arabic.

3.  Honest participation in small business and local SEO communities on Reddit, by Rashid under his own name. No fake accounts or planted posts.

4.  Inclusion in "best Google Business Profile tools" roundups: send the facts page and a demo account to their authors.

**G-10 Crawlers and llms.txt.** Allow Googlebot, OAI-SearchBot, ChatGPT-User and PerplexityBot in robots.txt, and check Cloudflare's AI bot blocking setting is a deliberate choice, not a default. Keep the existing llms.txt files only because they cost nothing to maintain; spend no further time on them.

**G-11 Measure it by hand.** Once a month, ask 20 questions in four engines (ChatGPT, Gemini, Perplexity, Google AI Mode), half in Arabic, such as "best tool to manage Google reviews for a small restaurant in Dubai". Log whether Kabsi is mentioned or cited. Track referral visits from chatgpt.com, perplexity.ai and gemini.google.com in PostHog, and branded search growth in Search Console. Ignore paid "AI visibility" audits and scores.

## Speed and caching

Small business owners open Kabsi's pages on phones, often on mobile data in the Gulf and Lebanon. A slow first page loses them before the hero loads. Kabsi already does several things right: self-hosted fonts with Arabic and Latin subsets, font-display: swap, restrained motion. The gains now are in caching and in keeping tracking scripts from slowing pages down.

**Targets** (Practice; thresholds unchanged since March 2024): Largest Contentful Paint 2.5 seconds or less, Interaction to Next Paint 200 ms or less, Cumulative Layout Shift 0.1 or less, at the 75th percentile of real users. Track them per page type in Search Console, and test landing pages on a mid-range Android phone over 4G from the UAE and Saudi Arabia.

**G-12 Cache public pages at the edge.** Marketing, industry, guide and tool pages look the same for every visitor, so their HTML is cached at the edge:

- Response header Cache-Control: public, s-maxage=3600, stale-while-revalidate=86400 on public pages only.

- Never cache /app, /partner, /staff, /a/\*, /login, API routes or any response when a session cookie is present.

- Purge the cache on each deploy.

- Free tool results are never cached; they run in a function and stream back.

- Aim for 80% or more cache hits on public pages.

- Verify first: Kabsi is hosted by Lovable. Check whether Lovable's hosting honours these headers and allows cache rules on a custom domain, or whether kabsi.co should sit behind Cloudflare's proxy. Do not switch hosting for this alone.

**G-13 Images and fonts.**

- Images as AVIF or WebP with explicit width and height, fetchpriority="high" on the hero image only, lazy loading for the rest. No hero carousels.

- Replace the remaining stock photos with product screens (design review), which are lighter as SVG or compressed PNG.

- Keep Lalezar and Readex Pro: both already cover Arabic. Load at most three weights, preload only the regular weight, and keep the Arabic and Latin subsets split as they are today.

**G-14 A budget for third-party scripts.** At most about 150 KB of compressed third-party JavaScript on any public page:

- Meta Pixel loads only after consent, and after the page is interactive.

- PostHog runs without cookies until consent (G-18), through a proxy on Kabsi's own subdomain, with session recordings off on public pages unless an investigation needs them.

- Sentry loads lazily on public pages with a low sample rate; never run Sentry and PostHog recordings together.

- Turnstile loads only on pages with a form or a free tool.

- No Google tags at launch (G-20).

## Website security and abuse protection

The app's data security is covered by the audit (K-38, K-40 to K-43): row-level security, exactly-once publishing, the audit log and retention. This section adds the website layer: browser security headers, and protection for the public forms and free tools that bots will find within days of launch. (Practice; verify each header against current Cloudflare and Lovable hosting documentation before switching it on.)

**G-15 Security headers and content security policy.**

| Header                    | Value                                                                                                                |
|---------------------------|----------------------------------------------------------------------------------------------------------------------|
| Strict-Transport-Security | max-age=63072000; includeSubDomains; preload                                                                         |
| X-Content-Type-Options    | nosniff                                                                                                              |
| Referrer-Policy           | strict-origin-when-cross-origin                                                                                      |
| Permissions-Policy        | camera, microphone and location off on public pages (the app's photo upload uses the file picker, which still works) |
| Content-Security-Policy   | frame-ancestors 'none', plus an allow list (below)                                                                   |

The allow list covers only what Kabsi loads: Meta (connect.facebook.net, www.facebook.com), the PostHog proxy subdomain, Sentry ingest, Cloudflare Turnstile (challenges.cloudflare.com), the Supabase project URL (including websockets) and Kabsi's own domains. Run it in report-only mode for two weeks with reports sent to Sentry, fix every violation, then enforce. Never leave unsafe-inline on permanently; use per-request nonces from the server renderer.

**G-16 Bots and abuse.**

- Turnstile with server-side token checks on signup, login, both free tools, the partner application and the contact form. Kabsi already uses Turnstile on the review link tool and Nora; extend it everywhere a stranger can submit something.

- Cloudflare managed firewall rules and bot protection on.

- A rate limit on free tool endpoints (about 10 requests a minute per IP), on top of the 3 checks a day per visitor (design review). Every Profile Check costs money in Google Places API calls (K-63), so an unprotected tool is a bill anyone can run up.

- Supabase Auth email and code limits tightened; reject disposable email domains at signup.

- A daily alert when Places API spend passes a set amount (K-63).

**G-17 Database checks before launch.** Confirms K-42: row-level security on every table, policies written with (select auth.uid()) for speed, indexes on the columns policies use, the service key never in the browser, and the Supabase security advisor at zero findings. One addition from the research: Kabsi's partner model makes organisation membership checks the most important policies to test (K-33), because one wrong join would show one agency's clients to another.

Measure: firewall and rate-limit events per day, Turnstile pass and fail rates, disposable-email signups blocked, content policy violations trending to zero, advisor findings at zero.

## Ads tracking, pixels and consent

Meta can only optimise toward businesses that pay if it is told who they are, and the law in most of Kabsi's markets says ad tracking needs permission first. Both are solved by the same setup: a consent banner that changes by country, the Meta Pixel in the browser, and the same events sent from Kabsi's server.

**What the law says, by market** (Established unless marked):

| Market                          | Ad cookies and pixels                                 | Analytics                                                                                                                                                                                    | Notes                                                                                |
|---------------------------------|-------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------|
| EU and EEA                      | Opt-in before loading                                 | Opt-in                                                                                                                                                                                       | Unchanged                                                                            |
| UK                              | Opt-in                                                | May run without consent if first-party, used only for aggregate statistics, with clear notice and an easy opt-out (Data (Use and Access) Act, from 5 February 2026; ICO guidance April 2026) | Fines up to £17.5m or 4% of turnover                                                 |
| Saudi Arabia                    | Opt-in (defensible position; no cookie-specific rule) | Notice                                                                                                                                                                                       | SDAIA issued 48 violation decisions in 2025, including for marketing without consent |
| UAE                             | Opt-in (defensible position)                          | Notice                                                                                                                                                                                       | PDPL in force; executive regulations still unpublished                               |
| Lebanon                         | Notice and opt-out                                    | Notice                                                                                                                                                                                       | Law 81/2018 requires consent but enforcement is minimal                              |
| United States and rest of world | Notice and opt-out                                    | Notice                                                                                                                                                                                       |                                                                                      |

**G-18 One consent banner, rules by country.** Use one consent tool (CookieYes, Cookiebot or Usercentrics) set up with the rules above, available in English and Arabic. Before consent, PostHog runs without cookies and the Meta Pixel does not load. Consent choices are stored with a timestamp and kept as proof (G-21).

**G-19 Meta Pixel plus the Conversions API.**

| Event                        | Sent from          | When                                               |
|------------------------------|--------------------|----------------------------------------------------|
| PageView, ViewContent        | Browser            | Landing and pricing pages                          |
| Lead                         | Browser and server | Email captured on a free tool                      |
| CompleteRegistration         | Browser and server | Account created                                    |
| GoogleAccessGranted (custom) | Server             | Kabsi accepts the Manager invitation               |
| Subscribe                    | Server             | First successful payment, from the payment webhook |

- The browser creates one event ID per event and passes it to the server with the signup or tool request; both send the same event_name and event_id, so Meta counts each event once. Any mismatch, even in letter case, double-counts it.

- The server sends hashed email, an external ID, and the fbp and fbc cookies, which drive Meta's match quality. Aim for a match quality score of 7 or more on each event.

- Server events go straight from a Supabase Edge Function: free, already in the stack. Server-side tag managers (sGTM, Stape) wait until ad spend passes about \$5,000 a month.

- Never optimise campaigns on page views or on free tool use: that trains Meta to find people who want free things. Start on CompleteRegistration, move to GoogleAccessGranted at about 50 a week (G-01).

**G-20 No Google tags at launch.** Add the Google tag and Consent Mode only if Kabsi starts running Google Ads. Search Console covers organic search without any script.

**G-21 Keep proof of consent.** For cookies, marketing email and any future WhatsApp messages, store: the person, what they agreed to (exact wording and language), when, from which page, and how. Saudi enforcement makes this the minimum standard in practice. Never send unhashed personal data to Meta.

Measure: consent opt-in rate by country, match quality per event, cost per trial, cost per access-granted business, cost per paying customer.

## Email

Email is Kabsi's main channel to owners (K-57), so reaching the inbox is a product requirement, not a marketing detail. Gmail began permanently rejecting non-compliant bulk mail in November 2025 and Microsoft began rejecting it on 5 May 2025 (Established). Kabsi is below the 5,000-a-day bulk threshold today, but should meet the rules now so nothing changes when it grows.

**G-22 Two sending subdomains, fully authenticated.** Amends the design review's note about moving sending to the root domain.

| Subdomain              | Used for                                                                                             | Tool         |
|------------------------|------------------------------------------------------------------------------------------------------|--------------|
| send.kabsi.co (exists) | Transactional: sign-in codes, approval emails, Weekly Care Report, Google Protection alerts, billing | Resend       |
| news.kabsi.co (new)    | Marketing and lifecycle: nurture, trial reminders, win-back, newsletters                             | Loops (G-23) |

Both get SPF, DKIM and DMARC aligned. Start DMARC at p=none with reports, move to quarantine after 30 clean days. Register both in Google Postmaster Tools. Every non-transactional email carries one-click unsubscribe (List-Unsubscribe headers) and a plain-text version. Keep the spam complaint rate under 0.1% and never let it reach 0.3%: above that, Gmail withdraws support until it stays under for seven days in a row.

**G-23 Resend for transactional, Loops for lifecycle.** Resend's newer automation features are not yet strong enough for behaviour-based sequences, and building that logic inside Kabsi is wasted effort. Loops fits a solo founder: free up to 1,000 contacts and 4,000 sends a month, \$49 a month for 5,000 subscribers, and it accepts events through its API, so Supabase can send google_access_granted, first_reply_approved and the rest. Customer.io (from about \$100 a month) waits until around 1,000 customers. (Benchmark; prices as of June to September 2026.)

**G-24 Email consent.**

- On the free tools: an unticked checkbox, "Send me tips on managing my Google profile", separate from receiving the result.

- Trial users receive lifecycle email as part of the service they signed up for; marketing beyond the trial needs that tick or a clear notice at signup, depending on country (opt-in for Saudi Arabia, UAE and the EU).

- Store the proof described in G-21.

- Never buy, rent or scrape lists of businesses. Saudi enforcement in 2025 included marketing messages sent without consent.

**G-25 The trial sequence, triggered by behaviour.** Emails depend on what the owner has done, not only on the day count. This replaces the separate lists in K-61 and the design review's trial-ending email with one sequence:

| Trigger                                    | Email                                                                                                               |
|--------------------------------------------|---------------------------------------------------------------------------------------------------------------------|
| Account created                            | Welcome, and the one next step: invite Kabsi as a Manager (video, guide, setup call link)                           |
| No access after 1 hour, 24 hours, 72 hours | "Here's what we found on your profile" (public snapshot), the video, the Calendly link and a WhatsApp button (K-61) |
| Access granted                             | "Kabsi is in. Your first replies are being prepared."                                                               |
| Backlog drafted                            | "23 replies are ready. Approve them in one tap." (K-66)                                                             |
| First reply approved                       | Short thank-you, plus "add Kabsi to your home screen" for lock-screen approvals (K-69)                              |
| Day 7                                      | Value recap from the audit log: replies published, changes caught, time saved (K-72)                                |
| Day 11                                     | "Your trial ends in 3 days", what stops, the yearly offer (G-30)                                                    |
| Day 14                                     | Trial ended; the review link keeps working; one tap to continue                                                     |
| Day 17 and day 30 after expiry             | Win-back based on real changes: "4 new reviews are waiting for a reply"                                             |

Measure: spam rate (under 0.1%), bounce rate (under 2%), unsubscribe rate per send (under 0.5%), and for each email the share who take its one action.

## Funnels

The design review set the site-wide funnel: one "Start free" button, the free snapshot before the Manager invite, and a reminder sequence. This section adds what the research contributes: dedicated pages for paid traffic, sharper free-tool funnels, a precise definition of activation, and a cancel flow that keeps customers.

**G-26 Dedicated landing pages for Meta ads.** Never send ad traffic to the homepage. Launch with one page, \`/meta\`, whose headline and first proof section change by an angle parameter (\`/meta?angle=reviews\`, \`profile-changes\`, \`approval\`, or a trade); pricing, eligibility, consent and trust sections stay identical. Separate pages only if a variant clearly wins and needs more. Every version has:

- No main navigation; one action.

- Outcome headline, for example: "Every Google review answered in your voice. You just tap Approve."

- The \$19 price visible without scrolling.

- A 20-second phone recording of approving a reply.

- Three trust lines: "Add Kabsi as a Manager. We never see your password.", "Nothing is posted until you approve it.", "Cancel any time."

- The first experiment (G-34) compares two calls to action: "Check my profile free" (runs the Profile Check first, then offers the trial) against "Start free". The research expects the tool-first version to convert cold traffic better; Kabsi tests it rather than assumes it. The rest of the site keeps "Start free".

- Load in under 2.5 seconds on a phone (G-12).

**G-27 Free tool funnels.**

- **Review link and QR code:** the link and QR are shown instantly, with no email. The branded print kit in the business's own colours (K-73) is sent by email, which is where the email is captured. A small "Made with Kabsi" mark on Free plan printables only (K-62).

- **Profile Check:** the top three findings show instantly, labelled Urgent, Recommended or Nice to have (no score), with "Email me the full check". Call to action: "Kabsi can take care of these. You approve each one. Start free." Only public data, as corrected in K-82.

- Both tools double as search and AI-citation pages (G-06, G-09).

**G-28 Activation, defined precisely.** Signing up is not activation. A business is activated when two things happen:

1.  Kabsi's Manager invitation is accepted (google_access_granted), target within 24 hours of signup.

2.  The first reply is approved and published, target within 72 hours, made easy by the day-one backlog (K-66).

Until step 1, the account asks only for what it needs: the business (picked from Google) and an email. No phone number, no extra fields before the invite.

**G-29 Keep customers who try to leave.**

- **Weekly Care Report as the retention engine** (K-28): results first ("3 new reviews answered, rating 4.6 to 4.7, 2 profile fixes").

- **Cancel flow:** one question ("Why are you leaving?") and one alternative: pause for one or two months at no charge. During a pause, data and Google access are kept and drafting stops.

- **Failed payments:** three automatic retries with emails before the plan drops to Free (K-48 grace period).

- **Not at launch:** a cheaper "replies only" plan. The research suggests \$9, but adding a tier before Kabsi knows its retention invites downgrades; revisit after 3 months of data.

**G-30 Offer the yearly plan from day 7.** Present \$190 a year (two months free) inside the day-7 recap and the day-11 reminder, not at signup.

Measure the whole path: ad click, tool run, email captured, trial, access granted within 24 hours, first reply approved within 72 hours, paid.

## Analytics

PostHog is already installed. The work is to name events consistently in the browser and on the server, tie every signup to where it came from, and watch the same few numbers every week. (Kabsi call: this is a recommended design, not sourced fact.)

**G-31 Event names.** Format object_action, lower case with underscores, past tense. The same name everywhere, whether the browser or an Edge Function sends it. Server-side events (access granted, published, paid) are sent from the server, never inferred from the browser.

| Stage      | Events and key properties                                                                                                                                                                                                 |
|------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Visit      | landing_page_viewed {page_type, lang, industry, utm fields}                                                                                                                                                               |
| Free tools | review_link_generated, profile_check_completed {findings_count}, email_captured {source}                                                                                                                                  |
| Signup     | signup_completed {method}, business_selected {category, country}                                                                                                                                                          |
| Access     | manager_invite_viewed, google_access_granted, access_reminder_sent {step}                                                                                                                                                 |
| Value      | reply_draft_ready {rating, risk}, reply_approved {edited, seconds_to_approve, channel}, reply_published, backlog_cleared, profile_change_decided {field, decision}, photo_published, post_published, weekly_report_opened |
| Revenue    | trial_converted {plan, period, currency}, payment_failed, subscription_paused, subscription_cancelled {reason}                                                                                                            |
| Partners   | partner_client_added, partner_approval_sent                                                                                                                                                                               |

Users are identified at signup; events are grouped by business and by partner organisation, so agency activity can be read across clients. PostHog runs through a proxy on Kabsi's own subdomain so ad blockers do not hide a large share of events.

**G-32 Attribution.** Amends K-32's attribution window.

- UTM standard: utm_source (meta, partner, referral, newsletter), utm_medium (paid_social, partner, referral, email), utm_campaign as {market}\_{angle}\_{yyyymm}, utm_content as the creative ID.

- First-touch and last-touch UTMs are saved on the user record at signup, server-side, because cookies get lost.

- Partner links (kabsi.co/p/{signed code}) and referral links set a first-party cookie for 90 days, longer than K-32's 60, because agencies take longer to convince clients. The partner is written to the business at signup and never re-read from the browser.

**G-33 The weekly numbers.** One PostHog dashboard, reviewed every Monday. It merges this list with K-55 and K-76:

1.  Trials started, by channel.

2.  Cost per trial and cost per access-granted business (Meta).

3.  Share of trials granting access within 24 hours.

4.  Median time from access to first approved reply.

5.  First drafts approved without edits.

6.  Trial to paid.

7.  New and net new monthly recurring revenue.

8.  Customer churn and revenue churn.

9.  Weekly active businesses (at least one approval in the week) as a share of paying customers.

10. Free tool runs, then email captured, then trial.

11. Email spam rate and failed payments.

## Experimentation

With a few thousand ad visitors a month, Kabsi cannot run classic A/B tests on small changes. Detecting a lift from 4% to 5% conversion needs about 6,100 visitors per version, roughly 12,000 in total (standard statistics, 95% confidence, 80% power). So tests must be big swings, run one at a time, and qualitative research does most of the learning.

**G-34 How Kabsi tests.**

- **Only big swings, in this order:**

  1.  Tool-first versus trial-first call to action on ad landing pages (G-26).

  2.  Price framing: "\$19 a month" versus "less than \$1 a day" versus yearly first.

  3.  Onboarding: drafts ready on arrival versus an empty start (expected to confirm K-66).

- **Let Meta test the creatives.** Meta finds winning images, videos and headlines on its own data faster than the website can.

- **Decide with PostHog's Bayesian results:** ship a version at 90% or higher probability of being best when the downside is small and easy to reverse. Never stop a test early because it looks good after two days.

- **Learn from people first:** interview 5 to 10 trial owners per market, at least half Arabic speakers; watch 20 session recordings of owners abandoning the Manager invite step before changing it; ask the one cancel question (G-29).

- **Keep an experiment log:** the hypothesis, the smallest effect worth detecting, the result, the decision.

- **Never:** button colour tests, several tests on the same small funnel at once, or a formal testing programme before about 10,000 landing visits a month.

## Middle East: Arabic, WhatsApp, payments and tax

The Gulf is where Kabsi can be clearly better than global competitors, but three practical things decide whether that turns into revenue: Arabic that reads as local, a way to pay that Gulf owners trust, and staying on the right side of new data and tax rules. No credible 2025 to 2026 data exists on Business Profile use in the UAE, Saudi Arabia or Lebanon, so Kabsi should not cite third-party claims about it.

**G-35 Arabic landing pages that read as local.** Builds on G-07 and K-75:

- Fully mirrored layout; local examples (a Dubai café, a Riyadh clinic, a Beirut restaurant) with real Arabic reply examples.

- Prices shown in AED and SAR with "VAT may apply", billed in USD or local currency depending on the payment provider (G-37).

- Trust signals: named founder with photo, "Add Kabsi as a Manager. We never see your password.", a WhatsApp click-to-chat button, Arabic privacy policy and consent banner (G-18).

- Copy reviewed by native Gulf and Levantine speakers before publishing.

**G-36 WhatsApp, within the rules.** Confirms K-57. Since 1 July 2025, Meta charges per delivered template message; marketing templates are always charged, and business-initiated messages need prior opt-in (Established). For Kabsi:

- Now: wa.me click-to-chat buttons (the customer starts the conversation, so nothing is charged) for support and sales; manual nudges by staff.

- Collect a separate, unticked WhatsApp opt-in at signup now, so it exists when automated utility messages ("3 replies are waiting for you") become possible after company registration (K-65).

- Never: marketing blasts, unofficial bulk-sending tools, or messages to numbers that did not opt in. Check the UAE's rules on unsolicited electronic communications before any WhatsApp or SMS marketing.

**G-37 Payments: a merchant of record that supports Gulf cards.** Amends K-48's processor shortlist.

| Requirement                 | Why                                                                                                                                                     |
|-----------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------|
| Merchant of record          | It sells on Kabsi's behalf and handles VAT and sales tax in each country                                                                                |
| Supports mada and Apple Pay | mada carries most Saudi card payments (reported over 90% of domestic card value) and Apple Pay is a leading online method; Stripe does not support mada |
| Shows local currency        | Gulf buyers distrust USD-only pricing                                                                                                                   |
| Accepts Kabsi's company     | Requires the registration in K-65                                                                                                                       |

Decided: Creem is the only card processor (audit K-106); the earlier Paddle and Dodo comparison is closed. If Saudi customers later need mada, check Creem's support for it before that market opens. For Lebanon, keep what works today: "fresh dollar" cards, Whish and OMT virtual Visa cards, and manual Whish or cash for yearly prepayment. Banque du Liban reports a structural shift to cash, so do not count on recurring card billing there.

**G-38 Tax: get advice before Gulf consumer sales.** Points to verify with a UAE tax adviser:

- VAT and GST duties depend on where the company is registered and where it sells; Rashid lives in Lebanon, so the earlier "Dubai operator" assumption is withdrawn. Decide with the company registration (K-65, G-43).

- Saudi business customers registered for VAT account for it themselves (reverse charge); sales to Saudi consumers or unregistered businesses would require Saudi registration from the first sale.

- A merchant of record handles both, which is a strong reason to choose one (G-37).

- Invoices to Gulf business customers show the customer's VAT number and a reverse-charge note where it applies.

Measure: Arabic versus English page conversion, payment success rate by country and method, WhatsApp opt-in rate, share of Gulf customers with VAT numbers.

## Launch checklist

**G-39 No ad spend until tier 1 is done.** This checklist merges the research's launch list with the design review's build order and the audit's go-live list (K-56). It covers growth and website readiness; product readiness stays governed by the audit's roadmap.

**Tier 1: before the first ad dollar**

- [ ] Company registered (K-65) and a merchant of record live with card payments, mada and Apple Pay where available (G-37); yearly plan and failed-payment retries working.

- [ ] Site on kabsi.co with redirects from the old address; app pages noindex; sitemaps submitted (G-04, G-05).

- [ ] Design review copy fixes live: slogan, "Start free", hero, no group ID on the homepage, pricing page fixed, founder note.

- [ ] One dedicated Meta landing page, price visible, loading in under 2.5 seconds on a phone (G-26, G-12).

- [ ] Consent banner by country in English and Arabic, with stored proof of consent (G-18, G-21).

- [ ] Meta Pixel plus server events with shared event IDs; match quality checked (G-19).

- [ ] PostHog events and UTM and partner capture saved server-side (G-31, G-32).

- [ ] send.kabsi.co and news.kabsi.co authenticated; Postmaster Tools set up; one-click unsubscribe (G-22).

- [ ] Loops trial sequence live and triggered by behaviour (G-23, G-25).

- [ ] Turnstile with server checks on every public form and tool; rate limits on tool endpoints; Places API spend alert (G-16).

- [ ] Security headers on; content policy in report-only mode (G-15).

- [ ] Onboarding: snapshot, then the Manager invite with reminders, then the day-one backlog (K-45, K-61, K-66).

- [ ] Privacy policy and terms in English and Arabic; kabsi.co/facts published (G-08).

**Tier 2: first 30 days**

- [ ] Review the weekly numbers every Monday (G-33); interview 10 trial owners, at least 5 Arabic speakers.

- [ ] Switch Meta optimisation to GoogleAccessGranted at about 50 a week (G-01).

- [ ] Rebuild the 8 industry pages to the G-06 standard; Arabic versions of the top 5.

- [ ] Recruit the first 5 agency partners with tracked links (K-29 to K-32).

- [ ] G2 and Capterra listings; first YouTube walkthroughs; honest Reddit participation (G-09).

- [ ] Content policy enforced; DMARC moved to quarantine (G-15, G-22).

- [ ] First AI visibility check (G-11).

- [ ] First big-swing test: tool-first versus trial-first (G-34).

**Tier 3: can wait**

- Server-side tag managers (until ad spend passes about \$5,000 a month).

- Customer.io (until about 1,000 customers).

- Country domains and regional Arabic variants.

- Automated WhatsApp messages (after company registration and opt-ins).

- City pages (only with real local value).

- A cheaper "replies only" plan (after 3 months of retention data).

- A formal testing programme (from about 10,000 landing visits a month).

## Open questions, verification and sources

**G-40 Publish Kabsi's own numbers, not other businesses' data.** Original data is the best material for press, search and AI citations, but it must come from Kabsi's own activity (correction 12). Allowed, once there are enough customers to be meaningful and always anonymised and aggregated across at least 20 businesses: median time from a review arriving to a published reply for Kabsi customers, share of drafts approved without edits, number of Google profile changes Kabsi caught and how owners decided, time saved per month. Not allowed: ratings, review counts or profile details of non-customers gathered through the free tools or Places data.

**G-41 English-speaking markets first for paid acquisition.** Meta ads and social content start in English for the US, Canada, UK, Ireland, Australia, New Zealand, Singapore and the UAE, following "Kabsi: Video, Content and Meta Ads Plan": one broad ad set covering the US, UK, Canada, Australia, Ireland, New Zealand and Singapore at launch, the UAE as a separately funded test after month 1, and countries split into their own ad sets only once they have enough sign-ups (KABSI-VIDEO.docx Part 7 is the canonical campaign setup). In these markets Kabsi's Arabic advantage does not apply, so its stated edge is profile watching, approval before anything goes live, the free setup call and price. English is the priority language everywhere at launch (audit K-119); the Arabic site, Gulf phrasing, Arabic SEO and Lebanon pricing decisions in this playbook become P2, built when those markets open.

**G-42 The free setup call is a tracked conversion step.** Fire a Schedule (Meta's standard event; setup_call_booked in PostHog) event (PostHog and Meta Conversions API) when a call is booked, and report calls booked, show rate and Google access granted within 24 hours of a call. Retargeting ads for trials without Google access lead with the call (audit K-89). Do not optimise Meta campaigns on this event; it is a support step, and GoogleAccessGranted stays the optimisation target.

**G-43 Tax is handled by Creem as merchant of record.** Settled by audit K-106 and K-107: Creem, as merchant of record, collects and remits VAT, GST and sales tax on subscriptions in every target market, so Kabsi registers for none of them. Prices show as USD "plus tax where it applies". Check each target country is in Creem's tax coverage before ads run there. The owning company's own income or corporate tax stays with its accountant.

**G-44 Measure onboarding step by step.** Onboarding is the funnel that decides payback, so every step sends a PostHog event, and the ones Meta needs are sent to it under their Meta names (mapping table in G-47): business_found, snapshot_viewed, registration_completed (with method: Google or email), connect_started (route: connect or manual), profile_state_seen (one per situation in audit K-94), setup_call_booked (Meta: Schedule), google_access_granted (with route and minutes since sign-up), details_confirmed. Review weekly: drop-off per step, share by route, and how many owners in each blocked situation return connected within 14 days. If the manual route's completion rate is below half of the Connect route's, push the Connect button harder and test the manual guide's screenshots first.

**G-45 Guides: fewer, better, real, and each one a step toward a trial.** Guides earn search and AI-answer traffic, and they double as Kabsi's help centre and onboarding support. Google's own guidance is unchanged: helpful, people-first content written from real experience wins, and pages produced at scale mainly to rank can be treated as spam. So:

- **Dates are true.** Each guide shows "Published" and "Updated" and "Checked against Google's help pages on \[date\]", with the same values in the page's Article markup (datePublished, dateModified). Never backdate or spread fake dates; nothing is indexed yet, so the launch set of 10 is dated the day it goes live on kabsi.co, and each later guide carries the day it is actually published, which spreads the dates naturally. "Updated" changes only when the content really changes.

- **Launch set of 10:** the 5 existing guides plus 5 that match the onboarding scenarios, so the scenario screens and Nora can link to them: verify your Business Profile; what to do when your profile is suspended; request ownership of a profile someone else controls; recover access when you lost the Google login; set holiday and special hours.

- **Cadence after launch:** one new guide a week for the first 12 weeks, then two a month, plus a monthly refresh of the five most-visited guides (check every step against Google's current screens and help pages). Never publish to fill a schedule: a guide ships only when it is complete, with real screenshots.

- **Topic order** (from what owners ask Nora, setup calls and search): reviews (fake reviews, replying in other languages, review replies that Google rejects); profile basics (categories, services, attributes, photos that help, Google posts); access and control (managers versus owners, removing an old agency); seasonal (Thanksgiving, Christmas, Ramadan and Eid hours); then one guide per industry page. Early in that order, because owners search for them and they match Kabsi features (audit K-114): "Never delete your Business Profile: what to do about a duplicate", "How to write Google Business Profile service descriptions", "Set your service areas the right way", and "Post a recent job with a real photo". Add a "Trades and home services" industry page (plumbers, roofers, electricians): urgent-need trades depend most on being found on Maps, which makes them a strong US test audience.

- **Every guide is written and checked by a person.** AI may draft, but Rashid or a named reviewer checks every step against Google's current interface, and every screenshot is real (from a profile Kabsi's team manages, details blurred).

- **Conversion inside every guide:** one inline box after the steps (the matching free tool, or "Kabsi can do this for you") and one end block with the trial button (design review template). No pop-ups, no exit-intent overlays. Measure guide visit → tool use or trial start, per guide, monthly; rewrite or merge any guide that gets traffic but no next step after three months.

- **AI answers:** the answer-first opening, the facts page (G-08), plain question headings, links to Google's own help, and the true dates are what AI assistants quote; no special AI files are needed (AI search section above).

- **Distribution:** each new guide becomes one carousel and, where it fits, one Reel hook (KABSI-VIDEO.md); Nora links the right guide in answers; onboarding scenario screens link their matching guide.

**G-46 Comparison pages for search and AI, not for ads.** Publish fair, dated comparison pages, starting with "Kabsi vs Google's free Gemini tools in Business Profile", then Birdeye and Podium. Each states where the other product is the better choice, cites the competitor's own pages with the date checked, and is rechecked every quarter; any price or feature not confirmed that quarter is removed. Link them from the footer and the facts page, never from the Meta landing page (design review, "Visual direction, comparison and guides").

**G-47 Meta tracking architecture (Pixel plus Conversions API on Supabase).** From Meta's current documentation, checked 3 October 2026 in the Meta-specialist research:

1.  **Browser Pixel** on public pages only, after the consent decision: PageView and ViewContent on /meta.

2.  **Browser plus server** for CompleteRegistration and Purchase: the browser generates one event ID, Kabsi stores it with the funnel record, and the Supabase Edge Function sends the same ID through the Conversions API, so Meta counts the event once.

3.  **Server-first** for GoogleAccessGranted, sent when the backend confirms working Manager access. It is a custom event, not a custom conversion; create a custom conversion only for a filtered report or audience, never as a second optimisation signal for the same action.

4.  **Purchase** only after Creem confirms payment, with value and currency, monthly and yearly distinguished; refunds and failed payments corrected.

5.  **An event ledger** keyed by business, event type and source event, so retries never create a new event ID (idempotency, as in K-38).

6.  **Payload:** event name, time, ID, action_source: website, source URL, hashed identifiers where lawful, fbp and fbc captured at first touch and refreshed when they change. The access token and dataset ID live only in Supabase secrets. Never send review text, reviewer identity, Google data, tokens or Business Knowledge.

7.  **Match quality:** Meta scores Event Match Quality out of 10 but sets no required target. Kabsi's working target is 7 or more on CompleteRegistration and Purchase; investigate anything below 6. Never collect extra identifiers just to raise the score.

8.  **Aggregated Event Measurement:** in Meta's updated experience, the eight-event prioritisation and domain-based event configuration are no longer required (rolling out gradually). Verify kabsi.co anyway, for domain control and link permissions.

9.  **Before spend:** every event checked in Events Manager's Test Events as received, processed, deduplicated and matched.

**Event names: PostHog versus Meta.** Each business action has one internal name and, where Meta needs it, one Meta name. Browser and server send the same Meta event name with the same event ID; never two different names for one action.

| Business action                     | PostHog event          | Meta event                         |
|-------------------------------------|------------------------|------------------------------------|
| Business found (no account)         | business_found         | none                               |
| /meta page viewed                   | landing_viewed         | ViewContent                        |
| Account and business record created | registration_completed | CompleteRegistration               |
| Google Manager access confirmed     | google_access_granted  | GoogleAccessGranted (custom event) |
| Setup call booked                   | setup_call_booked      | Schedule                           |
| Creem payment confirmed             | payment_succeeded      | Purchase (value, currency)         |

The other onboarding events in G-44 stay PostHog-only.

**To verify before building** (the research marked these as not re-checked in the 2025 to 2026 window):

| Item                                                                                     | Check against                                                              |
|------------------------------------------------------------------------------------------|----------------------------------------------------------------------------|
| Core Web Vitals thresholds and caching behaviour on Lovable hosting                      | Google's current Web Vitals page; Lovable hosting docs (G-12)              |
| Security headers and content policy syntax with Turnstile and the PostHog proxy          | Current Cloudflare, PostHog and Sentry docs (G-15)                         |
| Supabase rate limiting and Auth limits                                                   | Current Supabase docs (G-16)                                               |
| hreflang and Arabic SEO mechanics                                                        | Google Search Central (G-04, G-07)                                         |
| UK direct marketing rules for sole traders, US CAN-SPAM                                  | ICO and FTC guidance (G-24)                                                |
| UAE unsolicited electronic communication rules                                           | TDRA (G-36)                                                                |
| Merchant of record support for mada, Apple Pay, local currency, and Kabsi's company type | Creem (decided, audit K-106): confirm tax coverage for each target country |
| VAT position for the country of registration, selling through a merchant of record       | A UAE tax adviser (G-38)                                                   |
| Places API terms on storing and displaying results in the free tools                     | Google Maps Platform terms (G-27, G-40)                                    |

**Weakest evidence in this playbook:** competitor prices (from third-party sites, some run by competitors; Birdeye's are unofficial); trial conversion benchmarks (two studies disagree, 8.9% and 18.2%); Saudi payment shares (vendor and analyst sources); churn for low-price small business software (convention, not a sourced figure).

**Main sources** (from the research report, 1 October 2026):

- Google: [AI features and your website](https://developers.google.com/search/docs/appearance/ai-features) · [Outlook high-volume sender requirements (Microsoft)](https://techcommunity.microsoft.com/blog/microsoftdefenderforoffice365blog/strengthening-email-ecosystem-outlook%E2%80%99s-new-requirements-for-high%E2%80%90volume-senders/4399730) · [Gmail enforcement (Red Sift)](https://redsift.com/blog/gmails-enforcement-ramps-up-what-bulk-senders-need-to-know)

- AI search: [Search Engine Land citation study](https://searchengineland.com/ai-search-engines-cite-reddit-youtube-and-linkedin-most-study-473138) · [llms.txt one year later](https://hybridranking.com/blog/llms-txt-one-year-later)

- Trials: [Opt-in versus opt-out benchmarks](https://www.shno.co/marketing-statistics/free-trial-conversion-statistics) · [Trial-to-paid benchmarks](https://www.pulseahead.com/blog/trial-to-paid-conversion-benchmarks-in-saas)

- Consent and privacy: [UK cookie changes under the Data (Use and Access) Act](https://www.policypros.co.uk/cookie-consent-changes-duaa-guide/) · [Saudi cookies and direct marketing (Baker McKenzie)](https://resourcehub.bakermckenzie.com/en/resources/global-data-and-cyber-handbook/emea/saudi-arabia/topics/cookies-online-tracking-and-direct-marketing) · [UAE data protection (DLA Piper)](https://www.dlapiperdataprotection.com/countries/uae-general/law.html) · [Lebanon Law 81/2018](https://www.consentstack.io/regulations/lb-law81)

- Tracking: [Meta Conversions API setup and deduplication](https://www.dataally.ai/blog/how-to-set-up-meta-conversions-api)

- Email tools: [Loops pricing](https://www.sequenzy.com/pricing/loops)

- WhatsApp: [WhatsApp Business Platform pricing (Meta)](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing)

- Payments and tax: [Paddle local payment methods](https://www.paddle.com/blog/local-payment-methods-fltr) · [Saudi VAT on digital services](https://www.anrok.com/vat-software-digital-services/saudi-arabia) · [Banque du Liban Macroeconomic Review, June 2025](https://www.bdl.gov.lb/CB%20Com/Publications/Publications/Annual%20Report_1_En%C2%A711030_3.pdf)

- Competitors: [Localo review (Search Atlas)](https://searchatlas.com/blog/localo-review/) · [BrightLocal pricing](https://saaspricehub.io/tools/brightlocal) · [Birdeye pricing (unofficial)](https://contractortoolstack.com/software/birdeye/pricing/)

The full research report, with all 104 sources, should be kept alongside this playbook in the Kabsi project.
