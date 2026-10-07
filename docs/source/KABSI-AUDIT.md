# Kabsi: Full Audit and Product Decisions

Oct 2, 2026

## Summary

Kabsi's foundations are strong, and the path to the product in the master prompt is a reorganisation, not a rewrite. About 60% of what the prompt asks for exists. The approval ledger, scanner-safe email approvals, prompt-injection defence and Google's 30-day storage rule are already done well. What is missing is the operating loop that ties features together, a Business Knowledge layer that knows which facts are true, and a Google Protection built on Google's own rules.

Four findings override parts of the prompt, because Google's current policy forbids them or Google has removed them:

1.  Review content cannot be kept beyond 30 days or aggregated, so review themes are computed on request and never stored (K-27).

2.  Kabsi may not use the API to automatically revert Google's changes, so Google Protection uses Google's accept-or-reject flow and always asks the owner (K-19).

3.  Agencies and customers may not drive Google actions through Kabsi's API project, so there is no public API or MCP for Google writes (K-49).

4.  The Q&A API was retired in November 2025, so Q&A is not built.

Two gaps would put the API project at risk once access is granted and are fixed first: owners have no way to disconnect Kabsi (K-41), and Listing Shield protects values the owner never confirmed and can patch name and category in one tap (K-18, K-19).

Google's Gemini now does free what many tools charge for: draft replies, edit hours, create posts and show metrics, for one profile, when the owner asks. Kabsi wins by doing what Gemini does not: it comes to the owner, watches continuously, remembers confirmed facts and history, supports teams and agencies, and has a person behind it (K-50).

The headline decisions:

| \#           | Decision                                                                                                                                                                 |
|--------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| K-01, K-02   | One product, "Your reviews and listing. Taken care of." Module names replaced by plain ones: Reviews, Google Profile, Google Protection, Get Reviews, Weekly Care Report |
| K-04         | Keep Manager access through the Kabsi group; no owner Google sign-in                                                                                                     |
| K-06 to K-09 | Home becomes the Action Center with two states; one tasks queue; no score or points                                                                                      |
| K-10, K-11   | Business Knowledge becomes individual facts with source and status; AI uses only verified facts                                                                          |
| K-13, K-14   | Three review risk levels; high risk gets no draft; stricter generation that avoids Google's reply rejections                                                             |
| K-16, K-17   | Roles and per-business approval policies for agencies; email approvals keep the token flow, sign-in for profile changes                                                  |
| K-18 to K-21 | Google Protection rebuilt on owner-confirmed baselines and Google's update API; hours become a first-class field                                                         |
| K-23, K-24   | Photo engine and a content calendar that never invents facts                                                                                                             |
| K-26, K-28   | Insights from Google's performance data and the Weekly Care Report as proof of work                                                                                      |
| K-29 to K-32 | Partner workspace with portfolio view, client approvals and server-side commission                                                                                       |
| K-33 to K-38 | Tenant model, one Google service layer, job queue, quota limiter, Pub/Sub, exactly-once publishing                                                                       |
| K-40 to K-43 | Retention table, disconnect flow, security hardening, append-only audit log                                                                                              |

Amendments K-57 to K-65, added on 1 October, set the messaging channels (email first, WhatsApp by link, no SMS yet), Nora's handoff, the website scanner rules, photo prompts, onboarding recovery, growth loops, the unit-economics model and the policy guardrails, and make registering the company a first step. Decisions K-66 to K-76 add the moments that make owners recommend Kabsi: the review backlog cleared on day one, replies that sound like the owner from the first draft, approval from the lock screen, a 10-second undo, daily checks of the links customers tap, honest time-saved figures, a premium print kit, a yearly summary, and Arabic dialect replies as a real strength. Decisions K-77 to K-85, from a live profile review, add Google's name rules, cover photo and logo, videos, all three post types, Google's own completeness checklist, opening date, extra hours, social and WhatsApp chat links, attribute groups with a guardrail on identity attributes, and custom services. Decisions K-86 to K-88 add a plan B if Google refuses or delays API access, backups and recovery (including protecting Kabsi's central Google account), and support limits for a one-person team. K-89 makes a free setup call available to every customer, and K-90 links the video, content and Meta Ads plan. K-91 to K-98 redesign sign-up and Google access: "Continue with Google", a one-click "Connect with Google" that adds Kabsi as Manager automatically, the manual invite as fallback, and a guided path for every profile state (unverified, under review, suspended, owned by someone else, missing). K-99 to K-108 settle the P0.1 architecture check, cost guardrails, the trial, emails, WhatsApp and Nora, partner calls, payments through Creem, taxes and one design system everywhere. K-109 redesigns Get Reviews around a branded print designer. K-110 settles the visual direction, comparison pages and the guides programme, and lists three fixes on the live site. K-111 puts Nora and the setup call into every onboarding step as one helper. K-112 sets a slogan without Google's name; K-113 adds Google API compliance rules from Google's own documentation; K-114 adds four owner-facing features learned from what local SEO agencies teach; K-115 sets Kabsi's care routine by day, week, month and quarter; K-116 adapts the product to how Google Business Profile behaves in 2025 and 2026; K-117 covers search terms, services, booking and order links, products and description rules, from a real profile; K-118 sets up every supporting platform and lists every email Kabsi sends; K-119 makes English the priority language; K-120 defines Kabsi's per-business memory; K-121 sets up the WhatsApp number from day 1, and K-122 moves it to Kapso. What Rashid does first: accept or amend the K-decisions as D309 onward, start the company registration (K-65), then start P0.1 Foundations. That wave changes nothing customers see, and every later wave depends on it.

## How to use this document

This document replaces the master instruction prompt, CLAUDE.md and the D-entries in KABSI-SPEC.md wherever they conflict. Where an older D-entry is not mentioned here, it still stands.

Each decision has an ID (K-01, K-02 and so on), the decision itself, and the reason. Where it reverses an earlier decision, it names the one it replaces. Rashid records each accepted K-decision as a new D-entry (D309 onward) so the decision log stays the single source of truth.

Three rules decided every conflict in this review:

1.  **The master prompt wins on product direction.** That covers positioning, the operating loop, what the owner sees first, and the honesty and policy guardrails.

2.  **Working engineering wins over a rewrite.** Where the repo already does something correctly (email approvals, publish claims, retention cascade, concierge mode), it is kept and extended, not rebuilt.

3.  **Google's current rules win over both.** Anything the prompt or the repo assumes about Google that is false or unverified is corrected or marked as a limitation.

Inputs reviewed:

- The repo snapshot kabsi-canvas at commit 2a5dbce (29 Sep 2026): 37 migrations, 16 Edge Functions, the React app and the card Worker.

- KABSI-STATE.md, KABSI-SPEC.md (repo copy), WORK-QUEUE.md, KNOWLEDGE-BASE.md and CLAUDE.md.

- Google's current Business Profile API documentation and policies, as of today.

- The current public feature pages of the main competitors.

No code was run or changed, and nothing in Supabase, GitHub or Lovable was touched. Every "verified" claim below means verified against documentation or code reading, not against a live Google connection. Google access (Gate A) is still pending.

## Audit: what exists today

Kabsi is about 60% of the way to the product the prompt describes. The parts that are hard to get right (approval, publishing, retention, prompt-injection defence) are already better than most competitors. The gap is in organisation: the product is a set of modules, not one operating loop, and Business Knowledge is a flat form with no notion of truth.

The codebase has 37 migrations, 41 tables, 16 Edge Functions (about 4,600 lines), a React app on TanStack Start (about 6,600 lines in the signed-in app) and a Cloudflare Worker for card taps. All Google calls run in mock mode until Google approves API access.

| Area                     | What exists                                                                                                             | Verdict                                                                                                         |
|--------------------------|-------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------|
| Approval ledger          | Every Google write needs an approver, recorded in publications with the exact text shown (D202)                         | Keep. This is the core of trust                                                                                 |
| Email approvals          | /a/:token: GET only shows, POST performs; tokens hashed, 7-day expiry, rate limited, fail-closed                        | Keep. Already scanner-safe                                                                                      |
| Review drafts            | Draft in reviewer's language, fenced untrusted input, code checks plus a model check, owner "avoid" list, redraft limit | Keep and extend into the K-14 pipeline                                                                          |
| Review risk              | Binary "urgent" flag (rating 2 or less, keyword list, model)                                                            | Replace with three risk levels (K-13)                                                                           |
| Publish safety           | Atomic claim on review replies only; ambiguous failures left for a human                                                | Extend the claim to posts, photos, hours, profile edits (K-38)                                                  |
| Listing Shield           | Watches 6 fields hourly, emails before and after, "Put mine back"                                                       | Rebuild as Google Protection (K-18 to K-20): wrong baseline, misses key fields, ignores Google's own update API |
| Business Knowledge       | One knowledge_card JSON column, 20 or so keys, no source, no confidence, no history                                     | Rebuild as structured facts (K-10)                                                                              |
| Profile Score and Do now | profile_tasks with 0 to 100 points per task                                                                             | Keep the tasks, drop the points (K-07)                                                                          |
| Posts                    | Weekly drafts from owner input and search keywords                                                                      | Keep, move under Content, add policy checks (K-24)                                                              |
| Photos                   | Upload, suitability check by model, category, publish via signed URL                                                    | Keep, upgrade to the Photo engine (K-23)                                                                        |
| Hours                    | Special hours only; no regular-hours editor                                                                             | Extend (K-21)                                                                                                   |
| Weekly report            | Monday email: rating (from Places API), reviews, replies, taps                                                          | Keep, rename, add performance data (K-28)                                                                       |
| Get Reviews              | Review link, QR, NFC card (Lebanon), tap counts with bot filter                                                         | Keep, fix labels (K-25)                                                                                         |
| Partners                 | Portal, invites, invoices, commission maths, USDT claims                                                                | Foundation only; rebuild as Partner workspace (K-29 to K-32)                                                    |
| Concierge mode           | Staff post approved replies by hand while API access is pending                                                         | Keep until Google access is live, then keep for support                                                         |
| Staff and ops            | Staff panel, Slack hub, Sentry polling, job heartbeat, watchdog                                                         | Keep, add a system health page (K-44)                                                                           |
| Billing                  | NOWPayments USDT invoices with HMAC check and replay protection; plans v2 behind a flag                                 | Keep. Add a card processor before scaling outside Lebanon (K-48)                                                |
| Nora assistant           | Public and in-app chat, knowledge-base answers, owner tools                                                             | Keep for support; do not expand into an "AI chatbot" feature (K-51)                                             |
| Tests                    | 15 Vitest tests, about 40 Deno tests, CI on every PR                                                                    | Far below what the prompt requires (K-54)                                                                       |

What is mocked: every Google read and write, Google review sync, Listing Shield detection, photo publishing and search keywords. The mock is good enough for UI work but has never seen a real Google response. The getListing mock invents a Restaurant category and a US phone number, which can leak into a real baseline if mock rows survive go-live.

What is commercially weak: the owner has to learn five module names before seeing value. Home leads with a score. The weekly report shows rating and taps but not what customers did on the profile (calls, directions, website clicks), which is the number owners care about most.

What is missing entirely: Google's notification feed (Pub/Sub), Google's own "Google updated your profile" API, business status monitoring (open, temporarily closed, permanently closed), description, attributes, services, regular hours, performance data, roles beyond owner and manager, an audit log separate from the publications ledger, and a way for an owner to disconnect Kabsi from their profile.

## Audit: security, compliance and Google policy issues

There is no critical security hole. Tenant isolation is enforced: RLS is on for every table, and each of the 55 SECURITY DEFINER functions I sampled checks membership or staff status itself. The serious issues are about Google policy, and two of them would put the API project at risk once access is granted.

| \#  | Issue                                                                                                                                                                                                                  | Severity                       | Fix                     |
|-----|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|--------------------------------|-------------------------|
| A1  | No way for an owner to disconnect. Google requires a quick way to stop, and that Kabsi gives up its access within 7 business days                                                                                      | High (policy)                  | K-41                    |
| A2  | Listing Shield compares against the first value it saw, not one the owner approved. A wrong value on day one becomes "protected"                                                                                       | High (product)                 | K-18                    |
| A3  | "Put mine back" patches Google directly and ignores Google's own update flow (getGoogleUpdated). Google forbids using the API to automatically revert Google's changes; a one-tap email revert sits close to that line | High (policy)                  | K-19                    |
| A4  | Shield can patch name and category. Editing these can send a profile back to verification or trigger a suspension review                                                                                               | High (customer harm)           | K-19                    |
| A5  | A superseded open change is marked "kept" though the owner never decided. The history records a decision that never happened                                                                                           | Medium                         | K-20                    |
| A6  | Publish claim exists for review replies only. A double tap on a post, photo or special-hours approval can publish twice                                                                                                | Medium                         | K-38                    |
| A7  | No separate, append-only audit log. publications covers Google writes only; knowledge edits, role changes, disconnects and approvals of non-Google actions are not recorded                                            | Medium                         | K-43                    |
| A8  | Shield and sync loop over every business inside one cron call. With 200 businesses the call times out and later businesses are silently skipped                                                                        | Medium (scale)                 | K-35                    |
| A9  | Google token cached per function instance; no per-location limit on edits. Google allows 10 edits a minute per profile                                                                                                 | Medium                         | K-36                    |
| A10 | 55 SECURITY DEFINER functions are callable by any signed-in user. Each checks permissions itself today, but one missed check exposes data                                                                              | Low (defence in depth)         | K-42                    |
| A11 | google_mode() is callable without signing in. It leaks only "mock" or "live"                                                                                                                                           | Low                            | K-42                    |
| A12 | Leaked password protection is off in Supabase Auth                                                                                                                                                                     | Low (sign-in is by email code) | K-42                    |
| A13 | Mock data (invented phone and category) can reach real baselines at go-live                                                                                                                                            | Medium                         | Go-live checklist, K-56 |
| A14 | Reviews are stored with reviewer names and text for up to 30 days. This matches Google's 30-day limit; any feature that keeps or aggregates review content longer would break it                                       | Note                           | K-40                    |
| A15 | Review reply drafts use stock warm phrases. Google now moderates replies, and analysis of 12,752 rejected replies found AI boilerplate in most of them                                                                 | Medium                         | K-14                    |
| A16 | The email-link page publishes on POST without sign-in; the token is the credential. Safe against scanners, but anyone with a forwarded email can approve                                                               | Low                            | K-17                    |

Email approval is already correct on the point the prompt worries about most: a GET never publishes. The prompt asks for an authenticated confirmation page; I decided against forcing sign-in (see K-17), because a single-use, short-lived token plus an explicit tap is the standard, and a login step at the counter kills the 20-second reply.

Sources: [Business Profile APIs policies](https://developers.google.com/my-business/content/policies), [Manage Google Updates](https://developers.google.com/my-business/content/accept-or-reject-updates), [Quota limits](https://developers.google.com/my-business/content/limits), [rejected replies analysis](https://localsearchforum.com/threads/googles-review-reply-rejection-filter-what-12-752-rejected-replies-reveal.63252/), Supabase security advisor run on kabsi-prod today (read only).

## Google reality check

Most of what the prompt asks for is possible through Google's APIs today. Four things in the prompt are not, and they change the design: Q&A is gone, review content cannot be stored or aggregated beyond 30 days, Kabsi may not expose Google actions to other people's automation, and Google's own updates must go through Google's accept-or-reject flow.

| Capability                        | Status in Google's API (checked 1 Oct 2026)                                                                                                                | What Kabsi does                                                                                                             |
|-----------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------|
| Read reviews, reply, delete reply | Available (v4). Since April: reply moderation state; since July: policy violation reason; since July: a public reply URL                                   | Read the moderation state after every reply and show "Live", "Being checked by Google" or "Google rejected it, here is why" |
| Review photos and videos          | Available since April 2026                                                                                                                                 | Show them in the review card                                                                                                |
| Real-time events                  | Pub/Sub notifications: new and updated reviews, media uploads, Google updates, location state changes                                                      | Build in P0 (K-37), keep a daily reconciliation sweep                                                                       |
| Google updates to the profile     | hasGoogleUpdated flag and getGoogleUpdated with a diff mask; accept or reject through a normal patch                                                       | Google Protection is built on this (K-19)                                                                                   |
| Profile fields                    | Name, categories, address, service area, phone, website, regular and special hours, description, open status, attributes, services, menus, action links    | Read all; write only with approval; name, address and category get extra warnings                                           |
| Posts                             | Create, edit, delete; recurring posts since April 2026; media in posts must be uploaded from a URL                                                         | Keep                                                                                                                        |
| Photos and videos                 | Upload from URL or from bytes; category per photo                                                                                                          | Switch location photos to byte upload (no public URL needed)                                                                |
| Performance                       | Daily metrics (impressions, calls, website clicks, direction requests, bookings, conversations and food orders where relevant) and monthly search keywords | Build in P0 for the report (K-26)                                                                                           |
| Q&A                               | API retired 3 Nov 2025; the public section replaced by Gemini "Ask Maps"                                                                                   | Do not build. Feed the same answers into Business Knowledge so the description, services and attributes carry them          |
| Verification                      | Only on the owner's direct request                                                                                                                         | Never start a verification for the owner; link them to Google                                                               |
| Admins                            | List, invite and remove admins                                                                                                                             | Use for disconnect (K-41)                                                                                                   |
| Quotas                            | 300 requests a minute per API; 10 edits a minute per profile, which cannot be raised                                                                       | Enforce in code (K-36)                                                                                                      |

Policy rules that bind Kabsi directly, quoted from Google's API policy page:

- Kabsi must not automate review replies, listing edits or other actions "without the user's prior specific and express consent". The current approve-every-item design satisfies this. Any future auto-reply must be an explicit, per-business opt-in with its own consent record.

- Kabsi "may not use the Business Profile APIs to automatically revert changes made by Google".

- Stored content must be temporary (30 days at most), secure, and "cannot be manipulated or aggregated in any way".

- Agencies and clients may not use Kabsi's API project through scripts or their own APIs. They must sign in and act by hand.

- Kabsi must tell the owner about any change it makes to their account (such as accepting a manager invitation) within 48 hours, in a separate notice.

- Kabsi must give owners a quick way to leave and must remove its own access within 7 business days.

- Kabsi's interface must not copy the look of Google's Business Profile screens, and must never suggest a Google partnership.

- Google can ask for a working demo account within 7 days. Keep a permanent demo business ready (K-56).

Google itself is now a competitor. Since June 2026 an owner can connect one profile to the Gemini app and ask it to update hours, draft review replies, create posts, summarise reviews and report performance. Gemini also surfaces alerts such as holiday-hours reminders. Today it is limited to owners with a single profile and works only when the owner opens Gemini. That limit is Kabsi's opening (K-50).

Sources: [API policies](https://developers.google.com/my-business/content/policies), [Latest updates](https://developers.google.com/my-business/content/latest-updates), [Notifications](https://developers.google.com/my-business/content/notification-setup), [Manage Google Updates](https://developers.google.com/my-business/content/accept-or-reject-updates), [Upload media](https://developers.google.com/my-business/content/upload-photos), [Quota limits](https://developers.google.com/my-business/content/limits), [Gemini and Business Profile help page](https://support.google.com/business/answer/17142585), [PPC Land on the Gemini launch](https://ppc.land/gemini-now-manages-your-google-business-profile-with-a-single-tap/), [BrightLocal on the end of Q&A](https://www.brightlocal.com/learn/google-business-profile-qa).

## Competitors and what to take from them

No competitor sells "Google, taken care of, with your approval, for \$19". The market splits into expensive multi-location suites (Birdeye, Yext), agency SEO toolkits (BrightLocal, Whitespark, Semrush Local), cheap AI autopilots (Paige by Localo, Merchynt) and now Google's own Gemini. Kabsi wins by being the only one that is proactive, approval-first and priced for one shop, while still working for agencies.

| Product                                                                                                                                                           | Price (USD)                                          | What it does well                                                                         | Weakness Kabsi exploits                                                                      |
|-------------------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------|-------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------|
| [Birdeye](https://costbench.com/software/review-management/birdeye)                                                                                               | \$299 to \$449 per location a month, annual contract | AI agents for reviews, listings, messaging, social; 200+ review sites                     | Price; built for chains; overwhelming                                                        |
| [BrightLocal](https://www.stork.ai/en/brightlocal)                                                                                                                | From about \$39 a month; prices rose July 2026       | Agency reporting, white label, grid rank tracking, citations, a public API and MCP server | Toolkit for SEO people, not owners; review management only in top tier                       |
| [Localo](https://searchatlas.com/blog/localo-review/) and Paige                                                                                                   | About \$39 to \$49 a month per profile               | AI agent, profile audit, smart tasks, rank grid, auto-posting                             | Autopilot posting and keyword focus; owner is not in the loop                                |
| Merchynt and other \$99 autopilots ([comparison](https://godberrystudios.com/posts/ai-local-seo-stack-merchynt-birdeye-podium-gohighlevel-nicejob-2026/index.md)) | About \$99 per location a month                      | "Set and forget" AI                                                                       | Fully automatic actions conflict with Google's consent rule                                  |
| [Gemini in Business Profile](https://support.google.com/business/answer/17142585)                                                                                 | Free                                                 | Edits hours, posts, drafts replies, summarises reviews, shows metrics                     | Single profile only; owner must go to it; no watching, no approvals, no team, no agency view |

Every feature competitors sell, classified against the one question: does it make Kabsi better at taking care of a business's Google presence?

| Feature                                           | Who has it                      | Decision                                                    |
|---------------------------------------------------|---------------------------------|-------------------------------------------------------------|
| AI review replies in the business's voice         | All                             | Build now (exists; harden, K-14)                            |
| Approval before publishing                        | Few (Birdeye optional)          | Build now (exists; Kabsi's core)                            |
| Listing change monitoring                         | Birdeye, Yext, BrightLocal      | Build now (Google Protection, K-19)                         |
| Profile audit with tasks                          | Localo, BrightLocal             | Build now (K-06, no score)                                  |
| Post scheduling                                   | All                             | Build now (exists)                                          |
| Photo management                                  | Birdeye, Localo                 | Build now (K-23)                                            |
| Performance reporting                             | All                             | Build now (K-26)                                            |
| White-label client reports                        | BrightLocal, Birdeye            | Build later (P1, K-31)                                      |
| Client approval workflows                         | Rare                            | Build now for partners (K-16): a real gap in the market     |
| Bulk actions across clients                       | BrightLocal, Birdeye            | Build later (P1)                                            |
| Services, attributes, menus                       | Yext, Localo                    | Build later (P1, K-22)                                      |
| Review themes and sentiment                       | Birdeye, Localo                 | Build later, limited by Google's storage rule (K-27)        |
| Geo-grid rank tracking                            | BrightLocal, Localo, Whitespark | Build later (P2, partners only)                             |
| Competitor benchmarking                           | Birdeye, Localo                 | Build later (P2, from public Places data only)              |
| Review requests by SMS and email campaigns        | Birdeye, NiceJob                | Do not build now; a CRM in disguise                         |
| Review site monitoring beyond Google              | Birdeye                         | Do not build                                                |
| Citations and directory syndication               | Yext, BrightLocal, Whitespark   | Do not build                                                |
| Social media publishing                           | Birdeye                         | Do not build                                                |
| Webchat and AI chatbot for customers              | Birdeye                         | Do not build                                                |
| Public API or MCP for agencies to automate Google | BrightLocal                     | Do not build: forbidden for Kabsi by Google's policy (K-49) |
| AI-generated images for posts                     | Localo, Paige                   | Do not build: misleading for a real business                |

Prices are from third-party pages read today and are approximate.

## Decisions: positioning, language and navigation

Kabsi becomes one product, "the Google Business Profile operating system for local business", not five modules. The owner sees outcomes in plain words, and the module names disappear from the interface.

**K-01 Positioning.** Main line: "Your reviews and listing. Taken care of." Supporting line: "Kabsi takes care of your Google presence: your reviews, business information, photos, updates and performance, so you don't have to." Never lead with AI. Partners hear: "Manage every client's Google presence from one place. Kabsi does the repetitive work. You manage the relationship." Replaces the five-module framing in D282.

**K-02 Product language.** These names are used everywhere in the interface, emails and the site:

| Old name (D282)      | New name           | Notes                                          |
|----------------------|--------------------|------------------------------------------------|
| Replies              | Reviews            | Reply assistant is the feature inside it       |
| Profile Care         | Google Profile     | Includes "What needs attention"                |
| Listing Shield       | Google Protection  | Runs quietly; shown as a status, not a product |
| Review Link and Card | Get Reviews        |                                                |
| Monday Report        | Weekly Care Report | Still sent Monday morning, local time          |
| About your business  | Business Knowledge |                                                |
| Profile Score        | Removed            | See K-07                                       |

The house copy rules in CLAUDE.md stay: no em or en dashes, no exclamation marks, plain words. Banned claims are in K-53. Technical words never appear on owner screens: no "API", "sync", "SEO score", "listing integrity" or "pipeline".

**K-03 Navigation.** Eight destinations, as the prompt proposes, but no more than five on a phone:

| Desktop sidebar                                  | Phone bottom bar                                           |
|--------------------------------------------------|------------------------------------------------------------|
| Home                                             | Home                                                       |
| Reviews                                          | Reviews                                                    |
| Get Reviews                                      | Profile                                                    |
| Google Profile                                   | Content                                                    |
| Content (Posts and Photos)                       | More (Get Reviews, Insights, Business Knowledge, Settings) |
| Insights                                         |                                                            |
| Business Knowledge                               |                                                            |
| Settings (team, notifications, plan, disconnect) |                                                            |

The Plan page moves inside Settings. The Report page becomes part of Insights, with each weekly report kept there.

**K-04 Access model: keep Manager access through the Kabsi group.** The prompt says "connect Google"; the repo already does something better. The owner invites Kabsi's business group as a Manager on their profile, Kabsi never sees the owner's password or Google login, and the owner can remove Kabsi in Google at any time. This is the access level Google's own third-party rules favour. Owner Google sign-in (OAuth) is not built. "Connect Google" in the interface means "invite Kabsi as a Manager", explained in three steps with screenshots. Confirms D293.

**K-05 One operating loop.** Every feature is a step in the same loop: watch, detect, prepare, ask, publish, verify, record, report. A feature that does not fit a step of that loop is not built. The loop is drawn in the architecture section.

## Decisions: Home, Action Center and the task engine

Home answers one question, "Do I need to do anything?", and every item that needs the owner comes from one queue. Today Home is 807 lines mixing a score, a health list, a Do now list and a plan card; it is rebuilt around that one question.

**K-06 Home is the Action Center.** Two states only:

- **All clear:** "Good morning, \[Business\]. You're all caught up. Kabsi is taking care of the rest." Below it, the "What Kabsi did" feed for the last 7 days, and one line on last check ("Google profile checked 14 minutes ago").

- **Attention needed:** "2 things need your attention." At most 3 cards are shown; a "See all" link opens the rest.

A header strip always shows the business name, Google connection status, last successful check and the plan state. If the last check is older than 6 hours, the strip says so in amber; Home never looks healthy when sync is failing.

Every action card carries: what happened, why it matters (one sentence), what Kabsi recommends, the evidence ("Google shows 18:00, you approved 22:00"), a risk label when relevant, the prepared action, one primary button and one secondary button, the time, and a "history" link to the audit trail. Example primary and secondary pairs: Approve and Edit (reply); Keep my information and Google is right (profile change); Approve all and Review one by one (photos).

**K-07 Tasks replace the score.** The Profile Score (0 to 100 points per task) is removed from the interface and the API. Points imply a ranking effect Kabsi cannot prove. Each task gets one of three priorities: Urgent (customer-facing information is wrong, or a high-risk review), Recommended (a useful improvement), Nice to have. Home shows the top 3 by priority, then age. Replaces D298's score.

**K-08 One task engine.** A new tasks table becomes the single operating queue, replacing profile_tasks and absorbing the review queue, listing changes, photo and post approvals and concierge work. Fields:

| Field                                                      | Meaning                                                                                                            |
|------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------|
| location_id                                                | Which business                                                                                                     |
| kind                                                       | review_reply, profile_change, photo_batch, post, hours_confirm, knowledge_confirm, profile_gap, reconnect, billing |
| source_type, source_id                                     | The record that created it (a review, a profile change, a photo)                                                   |
| priority                                                   | urgent, recommended, nice                                                                                          |
| title, why, recommendation                                 | Plain-language text shown on the card                                                                              |
| evidence                                                   | JSON: the data behind the recommendation                                                                           |
| proposed_action                                            | JSON: exactly what will be published if approved                                                                   |
| approval_policy                                            | owner, partner, dual (K-16)                                                                                        |
| state                                                      | open, snoozed, approved, publishing, done, rejected, expired, failed                                               |
| due_at, snooze_until, created_at, resolved_at, resolved_by | Timing and who closed it                                                                                           |
| dedupe_key                                                 | Stops the same task being created twice                                                                            |

Tasks are created only by server-side detectors, never by the browser. Each detector is a small function with a test: new review, profile difference, missing field, photo age, holiday ahead, disconnected access, failed publish, expiring plan.

**K-09 "What Kabsi did" is a first-class feed.** It is read from the audit log (K-43), not written separately, so it can never claim work that did not happen. Entries are plain: "Checked your Google profile", "Prepared a reply to Sarah's review", "Published your approved reply", "Added 3 approved photos", "Noticed your Sunday hours changed on Google". Routine checks are collapsed into one line per day so the feed shows work, not noise.

## Decisions: Business Knowledge

Business Knowledge becomes Kabsi's memory and moat: a set of individual facts, each with a source, a status and a history, instead of one JSON blob. AI may only state a fact whose status is verified.

**K-10 Structured facts.** A knowledge_facts table replaces locations.knowledge_card. One row per fact:

| Field                      | Meaning                                                                                                                                                                                                                                                                               |
|----------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| key                        | From a fixed catalogue: description, service, product, price_note, staff_member, policy, booking, payment_method, delivery, service_area, parking, accessibility, wifi, language, contact, hours_note, special_rule, phrase_use, phrase_avoid, voice, signature, escalation_rule, faq |
| value                      | Structured JSON for that key (a staff member has name and role; a service has name, description, optional price)                                                                                                                                                                      |
| status                     | verified, needs_confirmation, outdated, rejected                                                                                                                                                                                                                                      |
| source                     | owner, google, website, partner, ai_suggestion, staff                                                                                                                                                                                                                                 |
| source_ref                 | The page, Google field or user that supplied it                                                                                                                                                                                                                                       |
| confirmed_by, confirmed_at | Who verified it                                                                                                                                                                                                                                                                       |
| review_after               | When Kabsi should ask again (prices 90 days, staff 180 days, hours notes 60 days)                                                                                                                                                                                                     |
| uses                       | Where it may appear: replies, posts, profile                                                                                                                                                                                                                                          |

The existing card is migrated row by row with status verified and source owner, since the owner typed it. A change to a fact creates a new version; the old one is kept for the audit trail.

Voice and rules become their own small group: tone (warm, formal, short), signature in each language, phrases to use, phrases to avoid, topics never to discuss, and escalation rules ("any mention of allergies goes to me, no draft"). When the owner edits a draft before approving, Kabsi records the edit. After three similar edits it offers "Save this as a rule?" and never learns silently.

**K-11 Source priority and conflicts.** Order of trust: 1. owner-verified fact; 2. Google's current value; 3. owner-approved website fact; 4. other connected sources; 5. AI suggestion. A lower source never overrides a higher one. When two sources disagree on something customers see (hours, phone, services, prices), Kabsi creates a knowledge_confirm task: "Kabsi found two different answers. Which is right?" It never guesses. AI suggestions enter with status needs_confirmation and are excluded from every prompt until confirmed.

**K-12 Website importer (P1).** The owner pastes a website address; Kabsi reads up to 20 pages from that domain (with an allow-list fetcher that refuses private IP ranges, against SSRF) and proposes facts: description, services, hours, phone, booking link, team, policies, FAQs. Every imported fact arrives as "Imported from your website, please confirm" and is grouped into one review screen with Confirm all, Edit and Remove. It also produces the comparison task "Your website lists 4 services that are not on your Google profile."

Onboarding asks for only five facts (K-45): signature, tone, a contact for unhappy customers, one thing customers love, and one thing never to say. Everything else is collected later through tasks, one question at a time.

## Decisions: Reviews

Reviews stay Kabsi's strongest feature and get three upgrades: three risk levels instead of one urgent flag, a stricter generation pipeline that writes like a person and survives Google's new reply moderation, and a review screen built for a phone.

**K-13 Three risk levels.** Classification runs in code first, then a small model, and the higher result wins.

| Level  | Triggers                                                                                                                                                        | What Kabsi does                                                                                                                                             |
|--------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Low    | Normal praise or mild feedback                                                                                                                                  | Drafts normally                                                                                                                                             |
| Medium | Complaint, refund request, staff complaint, disputed fact, rating 1 to 3, any review for a medical, dental, legal or financial business                         | Drafts carefully, shows the issue on top ("They mention a refund. Kabsi didn't promise one.")                                                               |
| High   | Legal threat, discrimination, health or safety claim (illness, injury, allergy), threats, harassment, privacy or personal data, regulator, accusations of crime | No draft. Card says "This review needs a little more care." Owner sees a short checklist and can ask for a neutral holding reply, which is never pre-filled |

For health-related businesses, a reply must never confirm that the reviewer was a patient or client, and never mention treatment. The industry is taken from the Google category.

**K-14 Reply pipeline.** Every draft goes through the same fixed steps:

1.  Normalise the review: strip control and invisible characters, fence it as untrusted, cap length. (Exists.)

2.  Build trusted context from verified facts only (K-10), the voice rules, the owner's last 5 approved replies for this business as style examples, and the industry rules.

3.  Generate with structured output: JSON with reply, facts_used (fact ids), language, topics. A reply that cites a fact id not in the trusted set is rejected.

4.  Check in code: invented staff names, prices, services or policies (anything not in facts_used); money and compensation words (exists); admissions of fault; personal data; phone numbers and emails (Google treats contact details in replies as solicitation; only the owner's approved contact rule allows a phone number); links; hashtags; emoji (exists); a banned-phrase list of stock AI wording ("thrilled to hear", "your kind words", "we look forward to welcoming you back"); and similarity above 80% to any of the last 20 replies for this business.

5.  Check with a second model call for tone and the rules a model judges better than code (exists, keep).

6.  If any check fails, the owner sees the draft with the problem marked: "Kabsi couldn't safely verify this detail." Unchecked text is never offered as "ready".

After publishing, Kabsi reads the reply back and stores Google's moderation state. A rejected reply becomes an Urgent task with Google's stated reason and a rewritten draft.

**K-15 Review screen.** Filters: Needs reply, All, Replied, Positive (4 and 5), Neutral (3), Negative (1 and 2), High risk. Each card shows stars, text, date, reviewer name, review photos, reply status (Draft ready, Waiting for you, Published, Being checked by Google, Rejected by Google, You chose not to reply), risk label and topics. On a phone the card is the whole screen: review on top, draft below, Approve as the large button, Edit and Other options (shorter, more formal, regenerate, I'll reply myself, Skip) behind it. Approve to published must take under 20 seconds including the confirmation.

## Decisions: Approvals

The rule stays absolute: AI prepares, people decide, Kabsi executes. What changes is who may decide, which is now set per business and per kind of action, so agencies can work without breaking the owner's control.

**K-16 Roles and approval policies.** Location roles grow from owner and manager to four:

| Role                    | Can see                                  | Can approve                            |
|-------------------------|------------------------------------------|----------------------------------------|
| Owner                   | Everything                               | Everything; sets policies; disconnects |
| Manager                 | Everything except billing                | Whatever the owner's policy allows     |
| Staff                   | Photos and the review link               | Nothing; can upload photos only        |
| Partner (agency) member | Client businesses linked to their agency | Whatever the client's policy allows    |

Each business has an approval policy per action kind (review replies, posts, photos, profile changes, hours):

- **Owner approves:** the default for every kind.

- **Partner may approve:** the owner explicitly delegates that kind to the agency. Recorded with the owner's consent text and date.

- **Partner prepares, owner approves:** the agency edits, then sends to the owner; the owner sees "Prepared by \[Agency\]".

Profile changes to name, address, main category and open status always need the owner, whatever the policy says. High-risk reviews always need the owner unless the owner names a delegate in writing.

Future automation (for example auto-publishing replies to 5-star reviews with no text) is allowed only as a per-business opt-in that names the action kind, shows an example, and records the consent. It is off by default and not in P0 or P1. This meets Google's rule that actions need "prior specific and express consent".

**K-17 Email approvals.** Keep the current design and tighten it:

- The email button always says "Review reply", never "Post". It opens a confirmation page; GET never changes anything (already true).

- The page shows the exact text and one Approve button that sends a POST. A second tap on Approve does nothing (K-38).

- Tokens are single-use, bound to one action and one recipient, valid 72 hours (down from 7 days), hashed at rest (already true).

- No sign-in for review replies and photos: speed at the counter matters, and the token is as strong as a magic sign-in link.

- Sign-in required for profile changes, hours and anything in the High risk class, because those affect what every customer sees.

- Every approval records channel (dashboard, email link, partner), the user, IP country and user agent in the audit log.

After approval Kabsi runs the same sequence every time: claim, publish, read back from Google, record, show the result. On a definite rejection the item returns to the owner with Google's reason. On an unclear failure (timeout, 5xx) the item stays "Checking with Google" and a reconciliation job reads Google again within 10 minutes, rather than leaving it for manual SQL as today.

## Decisions: Google Profile and Google Protection

The Google Profile section shows every important field with three values side by side: what Google shows now, what the owner approved, and when Kabsi last checked. Google Protection is rebuilt on Google's own update mechanism, starts from values the owner confirmed, and never touches the name, address or category without a signed-in owner.

**K-18 Approved baseline.** At onboarding, Kabsi reads the profile and asks the owner to confirm the fields customers rely on: name, phone, website, address or service area, regular hours, main category and open status. Each confirmed value becomes an owner-approved fact (K-10). Until a field is confirmed, Kabsi still watches it but labels changes "Not yet confirmed by you" and never offers to restore it. This fixes A2, where the first value seen was treated as correct.

Storage follows Google's rule: owner-approved values are the owner's own data and are kept for the life of the account. Values read from Google are kept 30 days at most. Field history keeps the owner's values and decisions forever, and Google's values for 30 days.

**K-19 Google Protection.** How it works:

1.  **Watch.** Pub/Sub notifications for Google updates and location state changes (K-37), plus a daily read of every watched field and hasGoogleUpdated.

2.  **Detect.** Watched fields: name, categories, phone, website, address, service area, regular hours, special hours, description, open status (open, temporarily closed, permanently closed), attributes, verification state and pending edits. Open status matters most: a false "permanently closed" stops customers instantly.

3.  **Explain.** "Google shows Sunday closing at 18:00. You approved 22:00." With who likely changed it when Google says (a Google update or a public suggestion) and "We don't know" when it does not.

4.  **Ask.** Two buttons: "Google is right" (accept: the approved fact is updated) and "Keep my information" (reject: Kabsi re-sends the approved value). For Google updates Kabsi uses Google's accept or reject flow, then reads getGoogleUpdated again to confirm the diff is cleared.

5.  **Guard.** Name, address, main category and open status need a signed-in owner and show a warning: "Changing this can make Google ask you to verify your business again." Kabsi never re-sends the same field more than twice in 30 days; a third conflict becomes a task to contact Google support, with a ready-made explanation.

6.  **Record.** Every step goes into the audit log.

Nothing is ever reverted automatically, from email or anywhere else. Google Protection is shown on Home as a status line ("Google Protection: on, last check 09:14"), not as a separate product. Marketing never says "guaranteed" or "prevents suspension". Replaces D218's "Put mine back".

**K-20 Change events.** listing_changes becomes profile_changes with: field, previous approved value, Google's value, source (Google update, notification, scheduled check), detected_at, severity (urgent for open status, phone, hours, address; recommended for others), status (detected, awaiting_review, accepted, rejected, corrected, failed, expired, superseded), decided_by, decided_at, publication id. A change replaced by a newer one becomes "superseded", not "kept" (fixes A5). Changes nobody answers in 14 days become "expired" and are raised again in the weekly report.

**K-21 Hours, the first-class field.** Regular hours, special hours, temporary closure and reopening date all get one editor with a calendar. Kabsi keeps a holiday calendar per country (starting with Lebanon, UAE, Saudi Arabia, United States, United Kingdom, France, Spain) and creates a Recommended task 21 days before each holiday: "Eid al-Adha is on \[date\]. Are your hours different?" with Same as usual, Closed, and Different hours. It never assumes holiday hours. Ramadan gets a month-long hours option for countries that observe it.

**K-22 Description, services, attributes (P1).** Each is a structured editor fed by Business Knowledge:

- Description: Kabsi drafts from verified facts, 750 characters, no phone numbers, links or keyword lists. Approval required.

- Services and products: structured list with name, description and optional price, only where Google's category supports it. Website services not on Google become a comparison task.

- Attributes: read the attributes Google offers for this category and country at run time (they differ), show which are unset, and ask the owner yes or no. Never infer an attribute.

- Menus and action links: P2, only for categories where Google supports them.

"What needs attention" on this page lists the open profile tasks with Urgent, Recommended or Nice to have. No score, no ranking claims.

## Decisions: Photos and Content

Photos become a major feature because they are the profile work owners skip most. Kabsi makes adding one as easy as sending a photo from a phone, then does everything else. Posts and photos live together under Content, and Kabsi prepares them so the owner only says yes.

**K-23 Photo engine.** Every image goes through the same pipeline:

1.  **Receive.** From the app (camera or gallery, bulk up to 20), from a staff upload link (no account; a private link per business that only accepts uploads and can be revoked), later from WhatsApp and email (P2).

2.  **Validate.** Check the real file signature, not the extension; accept JPEG, PNG, HEIC and WebP; reject anything over 20 MB; reject animated or multi-frame files.

3.  **Normalise.** Convert to JPEG, fix orientation, resize to Google's limits, strip all metadata including GPS (owner and staff locations must not leak). Done in an isolated worker, never in the request path.

4.  **Assess quality in code.** Brightness, blur (Laplacian variance), resolution, near-duplicates of photos already sent through Kabsi (perceptual hash).

5.  **Classify with a vision model.** Suggest a Google category (exterior, interior, product, food and drink, team, at work, common area, rooms) and flag issues: faces of children, other people's screens, text-heavy flyers, screenshots, stock-looking or AI-generated images, logos of other brands.

6.  **Explain simply.** "This photo looks good." "This photo is dark." "This photo is a bit blurry." "This looks like an exterior photo." "This would fill a gap: you have no recent exterior photo." Never a ranking claim.

7.  **Queue for approval** as one batch card: "3 photos are ready." Approve all, or one by one, with category editable.

8.  **Publish** by uploading bytes to Google (no public URL), read back the media item, store Google's media id.

9.  **Record** in the audit log; the original upload is deleted from storage 30 days after publishing.

Kabsi never generates, edits beyond basic exposure correction, or composites photos of the business. A misleading photo of a real place is a policy and trust problem.

**Freshness and gaps.** Two detectors feed the task engine: no new photo in 30 days (Recommended: "Send Kabsi a new photo from your phone."), and a category gap, such as many interior photos and no exterior photo in 12 months. The shot list per industry (a dentist: reception, treatment room, team; a café: counter, food, outside) is a small table Kabsi maintains, shown as "Photos customers look for".

**K-24 Posts and the content calendar.** Kabsi prepares 2 updates a month by default (owner can choose 1 or 4) from: verified facts, the season and local holidays, photos just approved, events or offers the owner typed, and recurring themes customers praise. It never invents an offer, price, event, service, policy, staff member or hours. If there is nothing true to say, it asks one question instead of writing filler: "Anything new this month? A dish, a service, an event?"

Every post passes checks before the owner sees it: no phone numbers in the text (the call button does that), no links except the owner's own domain, no prices or offers not in Business Knowledge, an offer post must carry terms and dates the owner gave, no superlatives Kabsi cannot support ("best in town"), no keyword stuffing (more than two repeats of the category or city), no claims about health, safety or results, and not more than 70% similar to any post in the last 90 days. Category rules: no medical outcome claims for clinics, no alcohol promotion where the country restricts it.

The calendar shows a month at a glance with prepared, waiting, published and skipped items. The owner can approve the month in one tap or review each. Recurring posts (Google supports them since April 2026) are offered only for real recurring things, such as a weekly market day.

## Decisions: Get Reviews

Keep the link, QR code and NFC card exactly as honest as they are now, and bring them in line with Google's April 2026 review policy, which explicitly bans staff review quotas and asking customers to name staff, and treats in-store review devices as manipulation.

**K-25 Get Reviews rules.**

- Every route goes straight to Google's own review form for that business. No Kabsi page in between that asks "How was your visit?", no star pre-selection, no private feedback form. This is the no-gating rule, and it is already how the Worker behaves.

- Assets: short review link with Copy, QR code (PNG and SVG), printable table card and counter sign in A6 and A5, share message for WhatsApp and SMS that the owner sends from their own phone, NFC card (Lebanon bundle and partners only, as now).

- Card and printout wording: "Enjoyed your visit? Review us on Google." Never "5 stars", never a staff name, never a reward.

- Labels per card or QR describe a place ("Counter", "Table 4", "Delivery bag"), never a person. No per-employee tap counts, no leaderboards, no targets. These would now count as staff quotas under Google's policy.

- The setup guide tells owners: customers use their own phone; never hand a customer the shop's phone or tablet.

- Analytics label: "Link activity" with taps, scans and opens per week and per placement, bots excluded (exists). The screen states: "Activity is not the same as reviews. Google decides which reviews appear." Kabsi shows new Google reviews in a separate number and never draws a line from taps to reviews.

NFC stays a fulfilment option (Lebanon bundle, partner kits), not a headline product, confirming D297.

## Decisions: Insights and the Weekly Care Report

Insights tells the owner in one sentence how customers used their profile, then lets curious owners and partners go deeper. The Weekly Care Report is the product's proof of work, and the main reason a customer keeps paying.

**K-26 Insights from Google's Performance data.** Owner view, this month against last month: new reviews, average rating, profile interactions (calls, website clicks, direction requests, bookings and messages where available), and how many times the profile was seen. Headline in plain words: "217 customers interacted with your Google profile this month, 12% more than last month." A "See details" link opens daily charts and search terms for owners and partners who want them.

Google's figures are fetched when needed and never kept longer than 30 days. Period comparisons work because Google returns many months of history on request, so Kabsi does not need its own archive. Search-term counts below Google's threshold are shown as "fewer than 15", never as a number.

Change detection (P1) flags only large, sustained moves: at least 25% against the previous 4 weeks and at least 20 events. The wording is "This changed", never a cause. "Website clicks dropped 28% compared with the previous 4 weeks" is allowed; "because Google lowered your ranking" is not.

**K-27 Review themes, within Google's storage rule.** Google forbids keeping review content beyond 30 days and forbids aggregating stored content. So themes are computed on request: when the owner opens Insights, Kabsi fetches the last 90 days of reviews from Google, labels topics in memory (staff, waiting time, cleanliness, price, quality, atmosphere, a named service), shows counts, and keeps nothing. Minimum evidence before a theme appears: 5 reviews in the period. Wording: "Over the last 30 days, 8 reviews mentioned waiting time, more than the 30 days before." Never "significant". One practical suggestion per positive theme: "Customers often praise your staff. Want an update about the team?"

Before launch, Rashid asks Google through the [data access form](https://support.google.com/business/contact/dma_data_request) whether on-request theme analysis is acceptable, and keeps the answer on file. Until then this stays P1 and off for partners' portfolio views.

**K-28 The Weekly Care Report.** Sent Monday 08:00 local time, by email, and kept in Insights. Structure:

1.  Headline: "Kabsi took care of 8 things this week." Counted from the audit log, only real actions.

2.  Reviews: new reviews, replies published, average rating.

3.  Google Profile: checked N times, changes found and how they were resolved, or "No important changes".

4.  Content: updates and photos published.

5.  Customer activity: profile views, calls, website clicks, direction requests, against the week before.

6.  What needs you: "Nothing", or one line and one button per open task, at most 3.

No invented return on investment, no ranking claims, no "thanks to Kabsi" next to any Google number. A partner can brand it (K-31). The report's stored copy keeps Kabsi's own counts; Google's numbers in older copies are re-fetched on view or dropped after 30 days.

## Decisions: Partners and agencies

Partners get the same operating system as owners, seen across many clients, with approval rules the client controls. Today's partner portal handles invites, invoices and commission; it becomes a workspace where an agency can run 50 clients without opening 50 Google profiles.

**K-29 Partner workspace and client onboarding.** A partner is an organisation with members (admin, member). A client business links to at most one partner, with a status (invited, onboarding, active, paused, ended) and an approval policy (K-16). Onboarding takes seven steps and the partner types almost nothing:

1.  Partner creates the client by searching Google Places by name.

2.  Kabsi sends the client an onboarding link (email or a WhatsApp message the partner sends).

3.  The client invites the Kabsi group as Manager on their profile (K-04).

4.  The client answers the five Business Knowledge questions.

5.  Kabsi runs the first audit and produces the first tasks.

6.  The partner sees status at each step and can nudge with one tap.

7.  The client becomes active and the trial starts.

Partners should never take ownership of a client's Google profile through Kabsi. If the agency already manages the profile in Google, the client still invites Kabsi, so the client stays the owner of record.

**K-30 Portfolio dashboard.** Top line, counted live: "32 clients. 5 need attention. 12 have approvals waiting. 3 disconnected. 2 have profile issues. 10 are all caught up." Each number filters the list. Each client row shows operational states, not a score: Google connection, profile status, replies (all answered, N waiting, oldest waiting age), profile tasks open, last photo, last post, customer activity trend, plan, onboarding step. Clicking a client opens that client's Kabsi, with a banner naming the client and the partner's permissions. Bulk actions (P1): approve all low-risk replies the partner is allowed to approve, send approval requests to clients, schedule the same holiday-hours question to every client in a country.

Partner-level review intelligence (unanswered reviews, clients with a run of low ratings, falling review counts) uses only counts and ratings fetched live, never stored review text (K-27).

**K-31 Branding and reports (foundation now, full white label P2).** Add partners.brand (name, logo, colour, reply-to email) now. Client reports and client emails show "Prepared by \[Agency\] with Kabsi". Custom domains and sender identities are P2. Partners can schedule weekly or monthly client reports and choose recipients per client. Reports carry observable data only.

**K-32 Referrals and commission, server-side.** Attribution is recorded when the account is created, from a signed referral code in the link (first touch, 60 days), and stored on the business, never re-read from the browser later. Commission rows are written by the billing webhook on each successful payment (30% for 12 months, 40% for the first 10 founding partners, per D274), with states pending, approved after the refund window, paid, and reversed. Partners see referred accounts, conversions, active subscriptions, commission earned and payout status. Payouts stay manual in USDT until volume justifies automation.

## Decisions: Architecture

The architecture keeps Supabase, Edge Functions, TanStack Start and the Cloudflare Worker. Three things change underneath: a clean tenant model, one Google service layer, and a real job queue so nothing depends on one long cron call.

(Image omitted in the repo copy; see the original .docx in the Claude project.)

Kabsi operating loop · 8 steps on 5 shared foundations

The owner or partner appears at one step, Ask; the other seven run on their own, and every step reads from and writes to the same five foundations.

**K-33 Tenant model.** Separate concepts that are mixed today:

| Entity                                                                 | Purpose                                                                     | Today                            |
|------------------------------------------------------------------------|-----------------------------------------------------------------------------|----------------------------------|
| users                                                                  | A person who signs in                                                       | auth.users (keep)                |
| organizations                                                          | The paying customer: a single owner, a multi-location business or an agency | Missing; plans hang on locations |
| organization_members                                                   | User, role in the organisation                                              | Missing                          |
| businesses (keep the name locations in the database to avoid a rename) | One Google profile                                                          | locations                        |
| location_members                                                       | User, role on one business (owner, manager, staff)                          | Exists with two roles            |
| partner_clients                                                        | Partner organisation, client business, status, approval policy, consent     | Partly on locations.partner_id   |
| google_connections                                                     | Which Kabsi Google account and location id, access state, last error        | Columns on locations             |
| subscriptions                                                          | Organisation, plan, state, period, provider ids                             | plans per location               |

A multi-location owner is one organisation with several businesses and a location switcher. An agency is an organisation of type partner whose clients are separate organisations. A business never belongs to two partners. Billing state lives only in subscriptions and never changes google_connections.

**K-34 One Google service layer.** \_shared/google.ts (one file, mock inside) is split into google/ with one module per area: accounts, locations, reviews, posts, media, performance, attributes, notifications, updates, admins. Each module has the same shape: a live client, a mock client with recorded real responses (captured once access is live), typed inputs and outputs, and the per-location limiter (K-36). No React component, no other function, ever calls a Google URL directly. A lint rule blocks googleapis.com strings outside google/.

**K-35 Job queue and sync engine.** Replace "loop over all businesses inside one cron call" with a jobs table (or Supabase Queues): one job per business per task (sync reviews, read profile, read performance, publish item), with attempts, next_run_at, last_error, and a dead-letter state after 5 failures. A dispatcher runs every minute and takes a small batch, spread evenly through the hour so traffic stays smooth as Google asks. Each business records last attempted sync, last successful sync, next sync, status and error, and Home shows them (K-06). Sync is incremental (reviews by update time; profile by hasGoogleUpdated plus a daily full read).

**K-36 Quota and rate control.** A shared limiter in Postgres: at most 4 requests a second across the project (under 300 a minute), and at most 5 edits a minute per profile (Google's hard limit is 10). Backoff with jitter on 429 (exists), and a circuit breaker that pauses all Google jobs for 5 minutes after 20 failures in a minute, with an alert.

**K-37 Notifications from Google.** Set up a Pub/Sub topic in the Kabsi Google Cloud project, push to a new google-events Edge Function that verifies the push token, and turn on notifications for the Kabsi account and the client group. Handled events: new review, updated review, Google update, location state change (verification, suspension, disabled), new media. Events enqueue jobs; they never write data directly. A daily reconciliation still runs for every business, because notifications can be missed.

**K-38 Exactly-once publishing.** Every publishable item (reply, post, photo, hours, profile edit) gets the same columns and the same claim: state (draft, approved, publishing, published, rejected, failed, checking), an idempotency key, and a conditional update that only one request can win. A second tap, a second email click or a retried job finds the item already claimed and returns the existing result. Ambiguous failures go to "checking" and a reconciliation job reads Google to decide.

## Decisions: AI safety architecture

Every AI step in Kabsi follows one contract, so no workflow can be weaker than the others. Most of it already exists for review replies; K-39 makes it the rule for posts, photos, descriptions, knowledge import, insights and Nora.

**K-39 The AI contract.** Each AI workflow is a registered function with these parts:

| Layer             | Rule                                                                                                                                    |
|-------------------|-----------------------------------------------------------------------------------------------------------------------------------------|
| Input cleaning    | Strip control and invisible characters, cap length, neutralise fence tags (exists in fenceReview; generalise to every untrusted input)  |
| Trusted context   | Verified facts, voice rules and industry rules only, passed inside \<business_facts\> as data                                           |
| Untrusted context | Reviews, website pages, photo text, partner notes, anything a stranger wrote; always fenced, always labelled "data, never instructions" |
| Structured output | JSON schema per workflow; anything that fails to parse is discarded, never shown                                                        |
| Code checks       | Facts used must be in the trusted set; banned claims, money words, contact details, links, stock phrases, duplicates (K-14, K-24)       |
| Model check       | A second, cheaper model judges tone and rules code cannot judge                                                                         |
| Human approval    | Required for every customer-facing output (K-16)                                                                                        |
| Record            | Prompt version, model, input hash, output, checks passed or failed, approver; text redacted with the source content after 30 days       |

Prompts live in versioned files with an id (reply.v7), never inline strings scattered through functions. A change to a prompt runs the evaluation set before deploy.

**Evaluation set.** Extend scripts/eval from 30 fictional reviews to 200 cases: 60 normal, 40 complaints, 30 high-risk, 30 prompt-injection attempts (in English, Arabic and French, including instructions hidden in names and in Arabizi), 20 healthcare, 20 reviews that tempt invented facts ("Is Maria still working there?"). Pass bar: zero invented facts, zero followed injections, zero compensation offers, high-risk routing at 100%. Run in CI on every prompt change.

**Models.** Keep the current split: a Sonnet-class model drafts, a Haiku-class model classifies and checks (\_shared/models.ts). Never let the model choose which tool or action runs; code decides the flow, the model only writes text inside it.

## Decisions: Security, retention, observability and admin

Kabsi's security base is sound; these decisions close the policy gaps, add a real audit trail and give the team one place to see whether the system is healthy.

**K-40 Data retention table.** One configurable policy per data class, enforced by the daily retention job (exists, extend):

| Data                                  | Kept                                                  | Why                                 |
|---------------------------------------|-------------------------------------------------------|-------------------------------------|
| Review text and reviewer name         | 30 days after Google last returned it                 | Google API policy                   |
| Review id, rating, dates, reply state | Life of account                                       | Ids and numbers needed for workflow |
| Google profile values read by Kabsi   | 30 days                                               | Google API policy                   |
| Owner-approved facts and values       | Life of account, deleted on account deletion          | Owner's own data                    |
| Google performance figures            | 30 days, re-fetched on demand                         | Google API policy                   |
| Drafts and published text payloads    | Redacted with their review (exists)                   | Linked to Google content            |
| Photos uploaded to Kabsi              | 30 days after publishing, or on skip                  | Not needed after Google has it      |
| Audit log entries                     | 24 months, content fields redacted per the rows above | Proof of approvals                  |
| Email log                             | 12 months (exists)                                    | Delivery disputes                   |
| Nora chats                            | 12 months (exists)                                    | Support                             |
| Google data after access is lost      | Deleted after 30 days (exists)                        | Google API policy                   |

The privacy policy and terms list this table in plain words.

**K-41 Disconnect and leave.** Settings gets "Disconnect Kabsi from Google". It asks for confirmation, then: removes Kabsi's admin access from the profile through Google's admin API, cancels open tasks and approvals, stops all jobs, emails the owner a confirmation with steps to check in Google, and deletes Google data on the K-40 schedule. If removal through the API fails, staff get an alert and must finish within 7 business days (Google's limit). Kabsi also sends the owner a separate notice within 48 hours of any change it makes to their account, starting with the moment it accepts the Manager invitation. Leaving never affects the owner's ownership of the profile, the review link keeps working until the plan ends, and nothing is held back.

**K-42 Security hardening.**

- Move service-only functions out of the public API schema into a private schema; keep only the owner-callable RPCs in public, each with an explicit membership check and a test.

- Revoke anonymous access to google_mode().

- Turn on leaked-password protection, and add TOTP for staff and partner admins (D301 pending item).

- Google refresh tokens stay in Supabase secrets, never in tables or logs. Rotate the Kabsi Google account's credentials on a schedule; Advanced Protection stays on.

- Pub/Sub pushes, NOWPayments IPN and Slack callbacks all verify signatures (IPN exists).

- Upload storage per business with signed URLs valid 5 minutes, served only to members.

- An automated RLS test suite: for every table, a stranger, another business's owner, another partner and an anonymous visitor all get zero rows.

**K-43 Audit log.** A new append-only audit_events table: actor (user, staff, partner member, system job, Google), action, business, object type and id, before and after (redacted per K-40), channel, result, request id, created_at. Inserts only through one server function; no update or delete grants to anyone, including service code. Events cover everything in the prompt's list plus knowledge edits, policy changes, role changes and disconnects. "What Kabsi did" and the weekly count read from it (K-09, K-28).

**K-44 Observability, admin and concierge support.** One staff page, System health, shows: Google API errors by type, quota use, sync lag per business, failed and stuck publications, dead-letter jobs, photo processing failures, email and notification delivery, OAuth and access errors, and database errors from Sentry. Each business has a staff diagnostics view with technical detail (never credentials), while the owner sees the plain version: "Kabsi couldn't update Google right now. Your information is safe. We'll try again automatically." or "Google asks you to reconnect Kabsi. Here is how." Error copy never says "Something went wrong". Concierge mode stays for the first 50 to 100 customers as a support tool: staff can see what the owner sees and help them through setup by screen share.

## Decisions: Onboarding, billing, notifications and mobile

Onboarding must show value inside 4 minutes of signup, billing must never interfere with Google, notifications go through one engine the owner controls, and every owner task must work standing at a counter with a phone.

**K-45 Onboarding in under 4 minutes, with a first-value moment.**

1.  Find the business on Google (Places search, exists).

2.  Check eligibility: verified profile, owner or manager (exists, D300).

3.  Invite Kabsi's group as Manager, with screenshots per device (exists, D293). While Kabsi waits for the invitation, the next steps continue.

4.  Five Business Knowledge questions (K-10).

5.  Confirm the key Google fields (K-18), shown as soon as access arrives.

6.  First value: "We found 4 things worth taking care of", built from the first read: replies waiting, description missing or short, no recent exterior photo, holiday ahead, hours unconfirmed. "Kabsi can prepare these for you." With one tap, drafts start.

7.  Plan: the 14-day trial starts automatically when access starts (D224, D281); the card is asked for only at the end of the trial.

Before Google access arrives, the owner sees the public facts from Places (rating, review count, hours, photo count) so the screen is never empty. Time to first value and drop-off per step are measured (K-55).

**K-46 Notification engine.** One notification_preferences row per user per business per category (new review, urgent profile change, approval needed, weekly report, photo request, profile issue, access issue, billing, partner events) with channel (email, in-app, later WhatsApp and SMS) and frequency (instant, daily digest, off). Defaults: high-risk reviews and urgent profile changes instant; normal reviews instant during opening hours and digested outside them; everything else in the daily digest; quiet hours 22:00 to 08:00 local except urgent profile changes. Every send goes through one outbox with dedupe and a delivery log (the Slack outbox pattern already exists). WhatsApp is designed for (channel column, template ids) but not built until P2 (K-52).

**K-47 Mobile and accessibility.** Every owner action is built phone first at 390 px: one primary button per screen, touch targets at least 44 px, no tables on owner screens, before and after shown stacked, not side by side. Accessibility: WCAG 2.2 AA contrast, visible focus states, keyboard reachable, labelled buttons for screen readers, reduced-motion respected, Arabic right-to-left layouts tested. Test devices: iPhone Safari, Android Chrome, desktop Chrome, a slow 3G profile, and the email-to-approval path from Gmail and Outlook apps.

**K-48 Billing.** Keep prices from D281: Free, Pro \$19 a month or \$190 a year, extra locations \$15 or \$150, Lebanon bundle \$120 a year, and partner rates. Add a card processor before any paid acquisition outside Lebanon, because USDT alone will block most owners in the US and Europe (Creem through the UAE route, Dodo Payments as backup, per D269). Billing rules:

- Subscription state lives on the organisation (K-33), never on Google connection rows.

- Failed payment: 7-day grace with daily reminders, then the plan drops to Free. Data, knowledge, history and Google access are kept; drafting and publishing pause; the review link keeps working.

- Cancellation: monthly plans run to the end of the paid month; yearly plans are refundable within 14 days (D281). Cancelling never removes Kabsi's Google access by itself; disconnect is a separate, explicit action (K-41).

- Location limits enforced on the server when a business is added.

## Decisions: What to remove, hide or not build

Focus is a feature. These decisions remove what weakens trust, refuse what Google forbids, and park what distracts from the core loop.

**Remove or hide now:**

- The Profile Score and all points (K-07).

- The five module names in the interface (K-02).

- The "Put mine back" button in emails; profile corrections happen on a confirmation page, and name, address, category and status need sign-in (K-17, K-19).

- Search-keyword stuffing in post drafts: keywords may suggest a topic, never be inserted as phrases (K-24).

- Any per-staff review card counts or leaderboards (K-25).

- Mock rows (mock_listings, mock_google_reviews) and test accounts at go-live (K-56).

**K-49 MCP and AI agents: internal only.** Kabsi's services get clean internal operations (get_business, get_pending_actions, draft_review_reply, request_owner_approval, publish_post and so on), and Nora and staff tools use them with exactly the same permission, approval, policy and audit checks as the app. Kabsi does not offer a public API or MCP server that lets agencies or customers' own AI agents read or write Google data, because Google's policy forbids third parties using Kabsi's API project programmatically. A read-only, Kabsi-data-only MCP (tasks, reports, knowledge, never Google content) can be reconsidered in P2 after Google confirms it in writing.

**K-50 Position against Gemini.** Do not compete on "AI drafts replies": Google gives that away. Compete on what Gemini does not do: Kabsi comes to the owner (email, phone, weekly report) instead of waiting to be asked; watches the profile around the clock; keeps a confirmed memory of the business and its history; supports a team, approvals and agencies across many businesses; handles Arabic dialects and Franco properly; and has a person behind it. Every marketing page answers "Why not just use Gemini?" in two sentences. Revisit quarterly, because Google's limits will move.

**K-51 Nora stays a support assistant.** Answers questions about Kabsi and helps with setup, hands off to a person. It does not become a general business chatbot or a second way to publish to Google outside the approval engine.

**K-52 Not now:**

| Do not build                                    | Reason                                      | Revisit                         |
|-------------------------------------------------|---------------------------------------------|---------------------------------|
| CRM, email or SMS marketing campaigns           | Not Google presence; huge scope             | Never as core                   |
| Review request campaigns by SMS or email        | Becomes a CRM and invites gating complaints | P2, only plain one-to-one links |
| Social media scheduler                          | Not Google                                  | Never                           |
| Apple, Bing, Yelp syndication and citations     | Different product (Yext, BrightLocal)       | Not planned                     |
| Giant SEO dashboard on Home                     | Owners do not want it                       | Advanced Insights only          |
| Grid rank tracking, competitor intelligence     | Useful for agencies, not core               | P2                              |
| WhatsApp ingestion and notifications            | Valuable, but slows the core                | P2 (designed for now)           |
| AI-generated photos or images                   | Misleading for a real business              | Never                           |
| Auto-publishing replies or posts                | Google consent rule; trust                  | Opt-in only, P2 at earliest     |
| Automatic reversion of Google updates           | Forbidden by Google                         | Never                           |
| Review gating, incentives, staff quotas, kiosks | Forbidden by Google and illegal in places   | Never                           |
| Q&A management                                  | API retired                                 | Never                           |

**K-53 Marketing claims.** Allowed: "Keep your Google information accurate", "Respond to reviews faster", "Know when important Google information changes", "Make it easy for customers to leave genuine reviews", "Keep your profile fresh", "See how customers use your profile", "Save time on your Google presence". Banned: rankings or the 3-pack, guaranteed reviews or ratings, "automatically fixes", "prevents suspension", "Google-approved" or "Google partner", revenue promises, "beat your competitors", and any statement that a post or reply improves ranking (confirms D257).

## Roadmap: P0, P1, P2

P0 is four waves of roughly 9 to 11 weeks for one full-time builder with Claude Code, built in this order because each wave depends on the one before. Waves 1 to 3 can be built on the mock while Google access is pending; the last part of wave 4 needs live access. Concierge customers keep running on the current system in parallel, and nothing in wave 1 changes what they see.

(Image omitted in the repo copy; see the original .docx in the Claude project.)

Kabsi roadmap · 4 P0 waves, 2 gates, P1 and P2

The P0 waves run in order; Google access is the gate for go-live, and P2 waits for 50 paying customers.

| Wave                                        | Decisions                                                                                                                                                                       | Done when                                                                                                                                                                                       |
|---------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| P0.1 Foundations (about 2 to 3 weeks)       | K-33 tenant model, K-34 Google layer, K-35 job queue, K-36 limiter, K-38 exactly-once publishing, K-43 audit log, K-42 hardening, K-54 test harness                             | No function calls Google outside google/; a double approval publishes once in tests; the RLS suite passes for all tables; sync for 500 mock businesses finishes inside an hour with no timeouts |
| P0.2 Trust and policy (about 2 weeks)       | K-41 disconnect and 48-hour notice, K-40 retention table, K-18 baseline, K-19 Google Protection, K-20 change events, K-17 email approvals                                       | An owner can disconnect in 3 taps; a mock Google update is accepted and rejected through the update flow; name and category changes refuse without sign-in                                      |
| P0.3 Core loop (about 3 weeks)              | K-08 tasks, K-06 Home, K-09 feed, K-07 no score, K-10 and K-11 knowledge, K-13 to K-15 reviews, K-16 roles and policies, K-02 and K-03 language and navigation                  | A new review becomes a task, a draft, an approval and a published reply in under 20 seconds on a phone; the eval set passes; Home shows all-clear or at most 3 cards                            |
| P0.4 Content and proof (about 2 to 3 weeks) | K-23 photos, K-24 posts, K-21 hours, K-26 Insights, K-28 Care Report, K-46 notifications, K-45 onboarding, K-47 mobile, K-37 Pub/Sub, K-56 go-live                              | A photo goes from phone to Google with metadata stripped; the report counts only audited actions; onboarding to first value takes under 4 minutes for 5 test users                              |
| P1 (about 6 to 8 weeks after P0)            | K-12 website import, K-22 description, services, attributes, K-27 themes, change detection, K-29 to K-32 partner workspace, bulk actions, K-48 card payments, Advanced Insights | An agency runs 20 test clients from one screen; partner commission appears from a webhook with no manual step                                                                                   |
| P2                                          | WhatsApp, full white label and domains, grid rank tracking, competitor views, menus and action links, multi-location bulk edits, opt-in automation                              | Decided after 50 paying customers, from the learning loop                                                                                                                                       |

**K-54 Testing.** Automated tests are required for every item in the prompt's list, grouped as: isolation (tenant, partner, multi-location, RLS for every table and every RPC); Google (OAuth token refresh, sync, retries, quota, failed and ambiguous mutations, using recorded real responses once access is live); publishing (approval, duplicate prevention for each item type, email link prefetch, expired token); AI (the 200-case eval set, injection, invented facts, high-risk routing); content (photo validation, post checks); billing state; audit log completeness. Manual checks before each release: iPhone Safari, Android Chrome, desktop Chrome, slow network, revoked Google access, closing the approval screen mid-publish, double tap, partial failure. CI blocks a merge when any automated test fails.

**K-55 Learning loop and metrics.** PostHog events (exists) for: signup, access granted, onboarding steps, first value shown, first reply approved, first photo, first post, first profile correction, report opened, approval, edit-before-approval, rejection, disconnect, support request. The weekly internal dashboard tracks activation (signup to first approved action within 7 days), time to value, actions completed by Kabsi per active business, owner effort (median seconds from notification to approval), reply rate and time to reply, profile changes caught and resolved, photos and posts published, and retention by month. Daily logins are not a goal: a healthy customer may open Kabsi only when told something needs them.

## Amendments (1 October 2026)

These decisions were added after a further review. Where one amends an earlier decision, it names it; the amendment wins. The most important new point is K-65: registering the company is now a dependency for both card payments and any paid messaging.

**K-57 Messaging channels for P0 and P1.** Amends K-46.

| Channel                                                     | Use                                                                                                   | Status                                                                                                        |
|-------------------------------------------------------------|-------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------|
| Email                                                       | Primary channel for owners: single-token, scanner-safe approval links (K-17), reports, reminders      | P0, every market; costs nothing per message                                                                   |
| In-app                                                      | Action Center and notifications                                                                       | P0                                                                                                            |
| WhatsApp through wa.me links                                | Pre-filled messages for sales outreach, manual nudges, concierge photo collection and support handoff | P0. A wa.me link only opens WhatsApp with text filled in; a person still presses send. It cannot be automated |
| Slack                                                       | Internal only: system health, watchdog and ops alerts                                                 | Exists; keep                                                                                                  |
| SMS                                                         | None                                                                                                  | Not in P0 or P1                                                                                               |
| Automated WhatsApp (business API templates) and SMS (10DLC) | Automatic owner notifications                                                                         | P2, only after the company is registered (K-65)                                                               |

**K-58 Nora as first-line support.** Amends K-51. Nora answers routine questions from the knowledge base inside the app. Target: Nora resolves about 80% of support conversations without a person; this is a goal to measure monthly, not a current figure. When Nora cannot help, or the owner asks for a person, she shows a wa.me link to Kabsi support with a pre-filled message containing only the business name, the account email and the issue type. Never review text, approval tokens, reviewer names or anything else private, because that text travels in the link and in WhatsApp.

**K-59 Website scanner rules.** Amends K-12. No CMS passwords, plugins or API keys: the scanner reads public HTML only. SSRF-safe fetching (no private or internal addresses, no redirects off the domain), at most 20 pages, respects robots.txt, and only scans the website listed on the business's own Google profile or a domain the owner confirms, so it cannot be pointed at someone else's site. Every extracted fact enters knowledge_facts with status needs_confirmation and is never used by AI until the owner confirms it.

**K-60 Photo prompts from search gaps.** Amends K-23. Photos are understood through visual recognition and Google photo categories, never through keyword-stuffed captions. Google's monthly search-term data (fetched on demand, never stored beyond 30 days) can trigger photo prompts: many searches for "outdoor seating" can produce "Customers search for outdoor seating. Add a patio photo?" Three guardrails:

- Prompt only when Business Knowledge confirms the feature exists. No outdoor seating confirmed, no patio prompt.

- Google hides small search counts, so these prompts will be rare for small businesses; the normal photo-freshness and category-gap prompts still run.

- Never say a photo will improve ranking.

**K-61 Onboarding recovery.** Confirms and extends K-45. The free public snapshot comes before the Manager invite (value before friction). For anyone who stops at the invite step:

- Automatic emails at 1 hour, 24 hours and 72 hours, each with the 60-second setup video, the Calendly link for a 10-minute setup call, and a "Message us on WhatsApp" wa.me button.

- At 72 hours, if the account gave a phone number, a task appears in the staff panel to send a personal WhatsApp nudge by hand.

- Stop all reminders the moment access is granted or the owner unsubscribes.

**K-62 Growth loops.** Amends K-25, K-30 and K-32.

- "Powered by Kabsi" with a referral link on Free plan QR assets and on owner Weekly Care Reports. The referral reward is either a \$10 credit or one free month; Rashid picks one before launch. Owner-to-owner referral rewards are allowed; rewards for customer reviews are never allowed.

- No Kabsi branding on partner-branded reports, emails or printables (K-31), or agencies will not use them.

- Partners can share audit links from the Google Profile Check as a pitch: kabsi.co/check?ref=\<signed partner code\>. The code is signed and opaque, never a raw agency_id, so it cannot be guessed or swapped; attribution follows K-32 (first touch, 60 days).

- The Profile Check uses public Places data only, never Kabsi's Business Profile API access, because Google forbids using that API for lead generation. Rate limits apply to partner links as to everyone.

**K-63 Unit economics as a model, not a fact.** Amends K-48. The working estimate is about \$1.50 a month in direct costs per active business (AI drafting and checks, email, database and functions), which would be about 92% gross margin at \$19. That estimate leaves out three real costs:

| Cost                             | Why it matters                                                                                                                |
|----------------------------------|-------------------------------------------------------------------------------------------------------------------------------|
| Card processor fees              | Several percent of \$19, likely more than the AI cost                                                                         |
| Google Places API calls          | Each free Profile Check and onboarding snapshot costs money; a popular free tool can cost more than paying customers bring in |
| Human support and concierge time | The largest real cost for the first 100 customers                                                                             |

Recalculate from actual usage after the first full month. Add a daily spending alert on the Places API and keep the free tool's limit of 3 checks per visitor per day.

**K-64 Policy guardrails, restated.** Confirms K-17, K-19, K-25 and K-56. Google Protection never reverts a profile change automatically; Google's updates go through the getGoogleUpdated accept or reject flow with the owner's explicit decision. Changes to name, address, main category or open status need the owner signed in, not just a tap in an email. No review gating, no star pre-screening, no employee review quotas or per-staff tracking. All Google functionality stays behind the mock layer until Gate A is approved, and mock data is deleted before go-live.

**K-65 Register the company first.** New. Card payments (K-48) are required before any ad spend, and card processors usually require a registered business, as do automated WhatsApp and SMS (K-57). Registering the company is therefore on the critical path for revenue outside Lebanon. Start it now, in parallel with P0.1.

## Making owners say "wow" (K-66 to K-76)

The decisions above make Kabsi correct, safe and compliant. These make it memorable: specific moments where an owner sees Kabsi do something that would have taken them hours, or that no other tool does. Each one is honest, within Google's rules, and cheap to run. Together they are what moves Kabsi from "a good tool" to the one owners recommend to the shop next door.

**K-66 Clear the backlog on day one.** The day access arrives, Kabsi drafts replies to every unanswered review it can fetch, and Home shows: "We found 23 unanswered reviews. Replies are ready."

- Low-risk replies get "Approve all", showing the full list before the tap, so the owner's consent covers exactly what they saw.

- Medium-risk replies are approved one by one. High-risk reviews get no draft (K-13).

- Publishing runs through the queue at no more than 5 edits a minute per profile (K-36), with a progress line: "14 of 23 published."

- Going from never having answered a review to all answered in five minutes is the moment owners remember. Placement: P0.3.

**K-67 "Sounds like you" from the first draft.** If the owner has replied to reviews before, Kabsi reads their recent replies live from Google during onboarding and proposes voice rules in plain words: "You sign off as 'Rami and the team', you thank people by name, you keep it short." The owner confirms or edits them, and only the confirmed rules are stored, as owner facts (K-10). The original reply texts are used only at that moment and not stored beyond Google's 30-day rule. Placement: P0.3.

**K-68 A personal welcome for the first 100 customers.** Within one working day of access, Rashid sends a 2-minute screen recording walking through that business's own profile: what Kabsi found, what it will take care of first, and his WhatsApp link. It does not scale and is not meant to. It turns early customers into references and teaches Kabsi what owners actually care about. Placement: now, manual.

**K-69 Approve from the lock screen, at no cost.** Make the owner app an installable web app with web push notifications.

- On Android, the notification shows the review and an Approve button that opens the confirmation step.

- On iPhone (iOS 16.4 and later, once added to the home screen), tapping the notification opens the approval screen; iPhone web notifications do not support action buttons.

- Needs no company registration and costs nothing per message, so it is the main instant channel until automated WhatsApp is possible (K-57).

- Onboarding ends with "Add Kabsi to your home screen" and a one-screen guide per device. Placement: P0.4.

**K-70 Ten seconds to undo.** After Approve, the item shows "Publishing in 10 seconds" with Undo. Approval sets publish_after to now plus 10 seconds; the publish job claims it only after that (K-38), so Undo is safe. Applies in the app and on the email confirmation page. It removes the fear of tapping too fast at a busy counter. Placement: P0.3.

**K-71 Kabsi checks the links customers tap.** Once a day, Kabsi opens the website, booking, menu and order links on the profile with the same SSRF-safe fetcher as the website scanner (K-59). Two failures in a row create an Urgent task: "Your Google website link shows an error page. Customers who tap it can't reach you." Pages that block automated visitors are retried with a normal browser profile before any alert, so owners do not get false alarms. Few competitors do this, it costs almost nothing, and it is the kind of catch that makes Kabsi feel like an employee. Placement: P0.4.

**K-72 Time saved, labelled honestly.** The Weekly Care Report and Home show "About 2 hours saved this month", with the formula one tap away: 5 minutes per reply, 15 per update, 10 per photo batch, 10 per profile check that found something, counted from the audit log (K-43). Always called an estimate, never turned into money. Placement: P0.4.

**K-73 A print kit that looks premium.** Free table cards, counter signs and window stickers in the business's own colours and logo, with designs per trade (café, clinic, salon, garage, hotel), print-ready PDFs at A6, A5 and A4, and wording that follows Google's review rules (K-25): no stars, no staff names, no rewards. A good-looking card on the counter sells Kabsi to every customer and the shop next door. Lebanese customers can order it printed through the bundle. Placement: P1.

**K-74 "Your year on Google".** Every December, a one-page summary each owner can share:

- Kabsi's work from the audit log: reviews answered, changes caught, photos and updates published, time saved.

- Customer activity fetched fresh from Google: calls, direction requests, website visits, profile views.

- No review text, no reviewer names, no per-staff figures.

- A share image for Instagram or WhatsApp; "Powered by Kabsi" with a referral link on the Free plan only (K-62).

- The first edition (December 2026) covers "your first months with Kabsi". Placement: P1.

**K-75 Arabic as a strength, not a translation.** In the Middle East this is where Kabsi can be clearly better than any global competitor:

- Replies match the reviewer's dialect and script: Lebanese, Gulf, Egyptian or Modern Standard Arabic, and Arabizi (Franco). A review in Arabizi gets a reply in the same style unless the owner sets a rule.

- The evaluation set (K-39) includes at least 40 Arabic and Arabizi cases, and the pass bar applies to them separately.

- The owner app and all emails get a full Arabic version with right-to-left layout, built in P1; replies in dialect are P0.3.

**K-76 Measure the wow.** Instrument these from P0.1 and review them weekly with the K-55 metrics:

| Measure                                                         | Why it matters                                 |
|-----------------------------------------------------------------|------------------------------------------------|
| First drafts approved without edits                             | The best sign that Kabsi sounds like the owner |
| Time from access granted to first published reply               | The first-wow moment; aim for under 10 minutes |
| Backlog cleared in the first week                               | Proof of K-66                                  |
| Approvals made from a notification or email, not the dashboard  | Shows Kabsi comes to the owner                 |
| Owners who reply to the welcome video or refer another business | Word of mouth, the cheapest growth Kabsi has   |

**Not built, on purpose:** showing owners which staff members customers praise and how often. Owners would love it, but per-employee review tracking conflicts with Google's April 2026 review policy and with K-64.

## Findings from a live profile (K-77 to K-85)

These come from screens of a real Business Profile managed by someone close to Kabsi (Yawmiyati, a media company in Lebanon), captured on 1 October 2026. They show fields and prompts Google offers today that the earlier decisions either missed or under-specified. Yawmiyati also makes a good first live test once Google access arrives, because it has almost every gap below.

| What the profile showed                                                                                        | Kabsi today                        | Decision   |
|----------------------------------------------------------------------------------------------------------------|------------------------------------|------------|
| "Your business name was updated by Google": Yawmiyati.com became Yawmiyati                                     | Would offer "Keep my information"  | K-77       |
| No cover photo; logo set; one video with 1,440 views                                                           | No cover, logo or video handling   | K-78, K-79 |
| Post types Update, Offer and Event; scheduling; button; images and videos; 1,500 characters                    | Updates only                       | K-80       |
| Google's own "Complete your Business Profile" prompts: description, shop front photo                           | Not mirrored                       | K-81       |
| Empty description, opening date, special hours; "Add more hours" (Access, Breakfast, Brunch, Delivery, Dinner) | Description and special hours only | K-82       |
| Social profiles (TikTok, X, YouTube) and a Chat field                                                          | Not handled                        | K-82       |
| Attribute groups: From the business, Accessibility, Amenities, Children, Crowd                                 | Generic attributes in K-22         | K-83       |
| Services: no predefined services for "Media company", only "Add custom service"                                | Assumes predefined services        | K-84       |

**K-77 Google's name fixes are often right.** Amends K-19. Google changes names that break its naming rules: a web address, keywords, a city or a slogan added to the real name. Yawmiyati.com to Yawmiyati is exactly that. Before showing a name change, Kabsi checks the old and new names against those rules. When the old name breaks them, the card recommends "Google is right" and explains why: "Google removed '.com'. Business names on Google can't include web addresses, and putting it back can lead to a suspension." "Keep my information" is still available but carries that warning. The same check runs on the name at onboarding (K-18), so a non-compliant name is flagged before Google acts. Placement: P0.2.

**K-78 Cover photo and logo.** Kabsi manages the logo and the cover photo as their own items, using Google's dedicated photo categories for each:

- Missing cover photo is a Recommended task: "Add a cover photo. It's the first picture many customers see."

- Kabsi suggests the best existing candidate (a sharp exterior or interior photo, landscape) or asks for one, and checks size and framing.

- Logo: square, clear on a small circle, checked for blur.

- Wording stays honest: Google decides which photo it shows first, so Kabsi says "your preferred cover photo", never "your cover photo will show".

- Placement: P0.4, with the photo engine.

**K-79 Videos.** Owners can send short videos of their own place and work through the same pipeline as photos (K-23): file checks, metadata removed, a quality check, approval, publish. Google's view counts for photos and videos (the profile showed 1,440 views on one video) are read on demand and shown in Insights: "Your kitchen video was viewed 1,440 times." Never AI-generated or stock video. Placement: P1.

**K-80 All three post types.** Amends K-24. Posts support Update, Offer and Event with their own fields, up to 1,500 characters, images (and video where the API supports it), and a button:

- Offer: start and end date and terms are required, and only offers the owner typed in are allowed (no invented discounts). Optional coupon code and redeem link.

- Event: title, start and end date and time, from the owner's own events only.

- Scheduling: Kabsi publishes approved posts at the chosen date and time from its own queue.

- Placement: P0.4.

**K-81 Mirror Google's own checklist.** Google shows owners its own "Complete your Business Profile" prompts (describe your business, add a shop front photo and more). Kabsi reads which of these apply and turns each into a task with the same intent, so the owner never sees Google ask for something Kabsi ignored. Two Google statements are useful in the app and on the site, always attributed to Google:

- Google tells owners that customers are twice as likely to interact with businesses that have more information. Quote it as Google's claim, not Kabsi's.

- Google warns that location data inside photos may be used to update the business's location in Maps. Kabsi already strips location data from every upload (K-23), which protects the map pin from a photo taken elsewhere. Say so in the photo screen.

**K-82 More profile fields.** Amends K-19 and K-22. Kabsi reads, watches and (with approval) updates these as well:

- **Opening date:** asked once, in onboarding or as a Nice to have task.

- **More hours:** the extra hour types Google offers for the category (such as delivery, brunch, access, pickup). Each is a separate editor under Hours, and holiday reminders (K-21) cover them too.

- **Social profiles:** TikTok, X, YouTube, Instagram, Facebook, LinkedIn and WhatsApp. None of these, nor the cover photo, the owner's description or review replies, appear in Google's public Places data, so the free Profile Check cannot detect them; only a connected account can. Google says these can be managed through the API, though the feature is only available in some regions. Kabsi suggests links found on the owner's confirmed website (K-59) and adds them only after the owner confirms.

- **Chat button:** in the Middle East, a WhatsApp chat button may be the single most useful field. Kabsi suggests adding the owner's WhatsApp click-to-chat link. Google Business Messages, the old built-in chat, ended in July 2024; today's Chat field holds a WhatsApp click-to-chat link or a text-message number. Attribute names reported elsewhere for it (url_whatsapp, url_text_messaging) are unverified: on day one of live access, read the attribute list Google returns for a real location and use whatever it names. If the field cannot be set through the API, Kabsi shows a 3-step guide instead and checks afterwards that the button appears.

- The daily link check (K-71) covers social and chat links too.

- Placement: P1, except the chat button prompt, which is P0.4 for Middle East businesses.

**K-83 Attribute groups, and identity attributes.** Amends K-22. Attributes are shown in Google's own groups for the category (accessibility, amenities, children, crowd and others), each as simple yes or no questions. The "From the business" group contains identity attributes (for example, whether a business is women-owned). Kabsi never suggests, infers or pre-selects these. They are shown only as an optional question the owner can answer or skip, with no reminder if skipped. Placement: P1.

**K-84 Custom services.** Amends K-22. Some categories, such as Media company, have no predefined services in Google, only "Add custom service". For these, Kabsi proposes custom services drawn only from verified Business Knowledge (for a media company: advertising campaigns, sponsored content, video production), each with a short description. The owner approves each one. Placement: P1.

**K-85 The first live test.** Once Google access is live, run the full onboarding on Yawmiyati first. Expected results:

- **Tasks:** add a description, add a cover photo, set an opening date, consider special and extra hours, answer accessibility and amenity questions.

- **Name change:** a recognised Google name update, with "Google is right" recommended.

- **Insights:** video view figures.

If Kabsi does not produce these, the detectors are not ready for customers.

## Resilience: plan B, recovery and support capacity, setup calls and video plan (K-86 to K-90)

Three gaps were left after the earlier decisions: what Kabsi does if Google refuses or delays API access, how it recovers from data loss or an outage, and how much support one person can carry. All three are risks to the business, not just to the code.

**K-86 Plan B if Google refuses or delays API access.** Kabsi's automation depends on Gate A. If Google says no, or says nothing for too long:

1.  **Reapply properly.** Read Google's stated reason, fix it (usually the use case description, the demo, the privacy policy or the website), and resubmit. Keep the permanent demo business ready (K-56). If there is no answer by 31 October 2026, follow up through Google's Business Profile API support form, and every two weeks after that.

2.  **Keep selling the assisted service.** Kabsi already has Manager access through its business group, so concierge mode (staff act on approved items by hand in Google's own interface) keeps working. It is limited by K-88's capacity ceiling, so price it as the same \$19 plan while capacity lasts, with a waiting list beyond it.

3.  **Add a no-API path for owners.**

    - Owners can forward Google's own "new review" notification emails to a private Kabsi address. Kabsi drafts the reply and sends it back with a "Copy reply and open Google" button that takes the owner to the review in Google. The owner pastes and posts.

    - The free tools, holiday-hours reminders, photo checks and a reduced Weekly Care Report (rating and review count from public data) keep working without the API.

4.  **Never do these, whatever happens:** scrape Google, automate a browser that signs in to owners' Google accounts, or use unofficial APIs. Each breaks Google's terms and would end any chance of approval.

5.  **Be honest in marketing.** Until access is approved, no page or ad promises automatic publishing, real-time alerts or Google Protection. Those sections stay off the site or say "Coming soon" (design review, build order note).

**K-87 Backups, recovery and single points of failure.**

| Risk                                                                             | Decision                                                                                                                                                                                                                                                                                                                             |
|----------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Database loss or a bad migration                                                 | Confirm Supabase daily backups are on. Turn on point-in-time recovery before the first paying customers outside concierge. Test a restore into a separate project once a month. Target: lose at most 24 hours of data now, at most a few minutes once point-in-time recovery is on; back online within 4 hours                       |
| Code loss                                                                        | GitHub is the source of truth; the Lovable project can be rebuilt from the repo. Keep the repo private with two-factor sign-in for every account that can push                                                                                                                                                                       |
| **Kabsi's central Google account**                                               | The single most important asset: if it is suspended, hacked or locked, Kabsi loses access to every customer at once. Keep Advanced Protection on (exists), use the account for nothing else, store recovery codes offline, add a second trusted admin to the business group, and never let anyone sign in to it from a shared device |
| Secrets (Google credential, Resend, PostHog, Turnstile, payments, Sentry, Slack) | One inventory in a password manager, shared with a second trusted person, with a rotation date for each                                                                                                                                                                                                                              |
| Supabase, Resend or Lovable hosting down                                         | Approvals and emails go into the queue and retry (K-35, K-46); the app shows a plain status banner; nothing is published twice (K-38)                                                                                                                                                                                                |
| Google API down                                                                  | Circuit breaker pauses Google jobs (K-36); Home says "Google is not responding. Your information is safe. We'll try again."                                                                                                                                                                                                          |
| Customers not knowing what is happening                                          | A simple public status page at status.kabsi.co, linked from the footer, support emails and Nora                                                                                                                                                                                                                                      |

**K-88 Support capacity for one person.** Rashid is Kabsi's only support today, and concierge mode, welcome videos and WhatsApp handoffs all land on him. Limits, set now so they are not discovered in a crisis (all figures are Kabsi calls, to be adjusted with real data):

- **Concierge ceiling:** at most 20 businesses in concierge mode at once. Beyond that, a waiting list.

- **Response promise:** a reply within one working day, Beirut time (Rashid's working hours), published on the site and in Nora. Urgent issues (wrong information published, Google access lost) the same day.

- **Order of help:** Nora and the knowledge base first, then email or WhatsApp to a person (K-58).

- **Measure support load:** minutes per customer per month, and total hours per week. If the average passes 10 minutes per customer, or support passes 10 hours a week, stop adding concierge customers and automate or document the most common question first.

- **Hiring trigger:** a part-time Arabic- and English-speaking support person at about 150 paying customers, or when support passes 10 hours a week for a month, whichever comes first.

- **Partners carry their own clients:** agencies give first-line support to the businesses they manage; Kabsi supports the agency.

Placement: K-86 and K-88 now; K-87's backup test and status page before the first paying customers outside concierge.

**K-89 Free setup call for every customer.** Rashid is available for an onboarding call with any trial user or customer who wants one. This is Kabsi's strongest answer to the hardest step in the funnel, granting Google Manager access, and the clearest way to show there are real people behind a small brand.

- **Format:** 15 minutes by phone or video call, screen share only, no camera needed. The owner adds Kabsi as Manager themselves while Rashid guides; Rashid never asks for a Google password or a verification code.

- **Booking:** a Calendly link, embedded on a /setup-call page, with slots in Rashid's hours (Beirut) plus a few late-afternoon slots for US East Coast mornings.

- **Where it appears:** the onboarding "Give Kabsi access" step ("Stuck? Book a free 15-minute setup call"), the end of the W3 tutorial video, the welcome email and the day-2 email to trials that have not granted access, the pricing page FAQ, the footer and contact page, Nora's handoff, and Meta retargeting ad text. It is not a separate video.

- **Measure:** calls booked, show rate, and the share of call attendees who grant Google access within 24 hours. If calls pass about 10 hours a week, K-88's hiring trigger applies.

- **Relation to K-88:** setup calls are separate from concierge mode; the 20-business concierge ceiling still applies to hands-on service.

**K-90 Video, content and Meta Ads plan.** Marketing video, social content and Meta campaigns follow the separate document "Kabsi: Video, Content and Meta Ads Plan". Its gates for paid ads restate K-65 (card payments), K-86 (Google approval) and growth decision G-01; where it differs from the growth playbook on markets, G-41 records the change.

## Onboarding and Google access (K-91 to K-98)

The owner should reach "Kabsi is connected" in under 3 minutes on a phone, with one decision per screen and no Google jargon. Every profile state Google can report has its own screen, its own plain instructions and a way back into Kabsi, so no owner hits a dead end. These decisions amend K-04 and the onboarding steps in the design review.

**K-91 Sign-up: "Continue with Google" first, email code second.** Every Business Profile owner already has a Google account, so Google sign-in is one tap and removes typos. Keep the existing email code for owners who prefer it. No passwords, no phone or WhatsApp codes (cost and SMS fraud), no Apple or Microsoft sign-in for now. Sign-in asks for the basic scopes only (name, email); it does not touch the Business Profile. Sign-up happens after the owner has found their business and seen the free snapshot, never before.

**K-92 Google access: "Connect with Google" adds Kabsi as Manager, then lets go (amends K-04).** Kabsi still works through Manager access held by its own business group, as K-04 decided. What changes is how it gets there:

1.  The owner taps "Connect with Google" and approves Google's consent screen once (scope business.manage), on the same Google account they signed in with (pre-selected).

2.  Kabsi lists the profiles in that account with their role and Google status (Account Management API, and the Verifications API's voice-of-merchant state), and the owner ticks the ones to connect.

3.  For each ticked profile Kabsi invites its own business group as Manager (locations.admins.create), accepts the invitation from its own account (accounts.invitations.accept), and confirms access.

4.  Kabsi then revokes the owner's token and stores nothing from it. No per-owner tokens are kept, exactly as K-04 intended.

The owner does nothing inside Google's own screens. Before the consent screen, one Kabsi screen explains it in plain words: "Google will ask you to let Kabsi manage your listing. We use this once, to add Kabsi as a manager, then we disconnect. You can remove Kabsi any time."

This route needs Google's API approval (Gate A) and Google's OAuth app verification for the business.manage scope; start that verification as soon as Gate A is granted. It is also unavailable when a company's Google Workspace administrator blocks third-party apps. In every one of those cases the manual route (K-93) is used, and it stays available to everyone as a choice.

**K-93 The manual route: invite Kabsi in Google, with a step-by-step guide.** The owner adds Kabsi's business group ID as Manager in Google's People and access screen. The design review specifies the guide: device-specific cards with real screenshots, a copy button, a live status check and three exits (send the steps to another device, someone else manages my profile, book a setup call). After Gate A, Kabsi accepts the invitation automatically within a minute; before Gate A, staff accept it by hand in Google's interface (concierge).

**K-94 Kabsi diagnoses the profile before asking for anything.** In the Connect route Kabsi reads the state from Google. In the manual route, three tappable questions replace it: "Can you sign in to your Business Profile?", "Do you see a 'Get verified' button?", "Do you see a warning that your profile is suspended or limited?". Both lead to the same scenario screens:

| Situation                                                            | How Kabsi knows                     | What the owner sees                                                                                                                                                  | What happens to the trial         |
|----------------------------------------------------------------------|-------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------|
| Verified, and the person is an owner                                 | Role owner, voice of merchant true  | "Connect" and done                                                                                                                                                   | Starts when access is confirmed   |
| Verified, but the person is only a manager                           | Role manager                        | "Only an owner can add Kabsi." Shows the owner's name as Google lists it, and a ready message (email or WhatsApp) with a link that lets the owner connect in one tap | Not started                       |
| Never verified                                                       | Voice-of-merchant action "verify"   | Verification helper (K-95)                                                                                                                                           | Paused until verified             |
| Verification under review                                            | Action "wait for voice of merchant" | "Google is reviewing your profile. This can take up to 5 business days. We'll email you the moment it's done."                                                       | Paused                            |
| Suspended or disabled                                                | Action "comply with guidelines"     | Reinstatement guide (K-96)                                                                                                                                           | Paused; no charge while suspended |
| Duplicate of a profile someone else controls                         | Action "resolve ownership conflict" | Ownership request guide (K-97)                                                                                                                                       | Paused                            |
| No profile in this Google account                                    | Empty list                          | "Try another Google account" (most common cause), then "Find my business on Google" to tell claimed from missing                                                     | Not started                       |
| Someone else owns the profile (former staff, agency, previous owner) | Search shows it as claimed          | Ownership request guide (K-97)                                                                                                                                       | Not started                       |
| No profile exists at all                                             | Search finds nothing                | Eligibility check, then a create-and-verify guide                                                                                                                    | Not started                       |
| Business type Google does not allow                                  | Eligibility check                   | Honest stop (K-98)                                                                                                                                                   | No charge                         |
| Several locations                                                    | More than one profile listed        | Tick boxes, with the extra-location price shown before connecting                                                                                                    | Starts on connect                 |
| Workspace admin blocks the connection                                | Google returns an access error      | Switch to the manual route, with a note to forward to their IT person                                                                                                | Not started                       |

The trial clock starts only when Kabsi has working access to a verified profile. Owners stuck at Google's side do not lose trial days, which removes the main reason to give up and is fairer.

**K-95 Verification helper.** Kabsi cannot verify for the owner and must never ask for a verification code: Google tells owners not to share codes with anyone, including companies that help manage their profile. Kabsi explains what Google may offer (phone or text code, email, a recorded video, a live video call) and prepares the owner for the video, which fails most often: one continuous take showing the street and signage outside, the inside of the business, tools or equipment of the trade, and proof of management such as unlocking the door or opening the till. It links to Google's own page, then checks back: in the Connect route by reading the state again when the owner returns, in the manual route by an email every two days asking "Verified yet? Tap to continue".

**K-96 Suspension and reinstatement guide.** A short page explains the common causes (a name with extra keywords, an address that is a virtual office or PO box, a business type Google does not allow) and links to Google's reinstatement request, with a checklist of evidence to gather (business licence, utility bill, photos of signage and storefront). Kabsi does not write appeals that misstate facts and makes no promise about the outcome.

**K-97 Ownership request guide (someone else has it, or the login is lost).**

- Lost the Google account login: Google's account recovery first, because recovering the account restores the profile with its reviews.

- A former employee, agency or previous owner has it: a ready message asking them to add the owner as owner, or to transfer primary ownership.

- No contact, or no answer: Google's "Request access" from the profile's claim page. Google gives the current owner 3 days to respond (in practice the next step can take up to 7); with no response, Google may offer the requester the option to verify and claim. Kabsi reminds the owner on day 3 and again on day 7. Service-area businesses use Google's support form instead.

- Kabsi tracks the date the request was made and reminds the owner when the waiting period ends.

**K-98 Eligibility, stated honestly.** Before an owner creates a profile or appeals a suspension, Kabsi shows Google's main limits in plain words: the business must meet customers in person at its address or at theirs; online-only businesses, rental or for-sale properties, and virtual offices are not eligible. If the business is not eligible, Kabsi says so, does not take a trial or payment, and points to the free tools where they still help. A business opening soon can be set up in advance with its opening date.

**Rules for every onboarding screen:** one instruction per screen; no Google jargon ("your Google listing" rather than "location" or "voice of merchant"); never ask for a Google password or a verification code; reassurance beside every permission ("You can remove Kabsi any time"); the setup-call link on every step after sign-up (K-89); every exit saves progress and sends a reminder link.

**Measure:** for each step, how many owners reach it and how many finish it; time from sign-up to connected; share connecting by the Connect route versus manual; how many owners land in each situation in the table, and how many of them come back connected within 14 days. These events are listed in growth decision G-44.

Sources for K-91 to K-98: [Account Management API (admins, invitations)](https://developers.google.com/my-business/reference/accountmanagement/rest) · [Verifications API voice-of-merchant state](https://developers.google.com/my-business/reference/verifications/rest/v1/locations/getVoiceOfMerchantState) · [Owners and managers: only owners add users; 7-day limits for new users](https://support.google.com/business/answer/3403100?hl=en) · [Verify your business: methods, up to 5 business days, never share codes](https://support.google.com/business/answer/7107242?hl=en) · [Request ownership: 3 to 7 days to respond](https://hub.greenixmedia.com/knowledgebase/11/Request-ownership-of-a-GMB-Business-Profile.html)

## Foundations, trial, payments and channels (K-99 to K-108)

**K-99 Check of the P0.1 architecture summary.** The summary matches K-91 to K-98: Google sign-in with basic scopes plus email code, sign-up after the snapshot, the manual Manager invite as the route until Gate A, the one-tap Connect route staged for after Gate A with the owner's token discarded, the scenario screens, the paused trial clock, and never asking for passwords or codes. Six corrections before code:

1.  **The business group ID.** 1029384756 reads like a placeholder. Use the real ID from Kabsi's business group, store it in configuration (not in page copy), and test one real invite end to end before the guide is published.

2.  **Adding business.manage later reopens Google's review.** The consent screen is verified for basic scopes only. Requesting business.manage for the Connect route means a sensitive-scope verification (a demo video of the flow, the scope justification, privacy policy wording about Google data). Prepare it now, submit the day Gate A is granted.

3.  **Kabsi's Google identities must be Kabsi's.** The OAuth developer and support contacts and the Search Console owners include personal addresses and an address on another company's domain. Make hello@kabsi.co plus one more kabsi.co admin the owners and contacts; keep one personal Gmail only as a recovery owner (K-87). A product's Google trust chain should not depend on another business's domain.

4.  **Google Cloud budgets do not cap spending.** A budget only sends alerts; Google keeps serving and billing. Hard limits come from per-API daily quotas (K-100).

5.  **Review text limit.** Truncating reviews at 1,000 characters cuts genuine long reviews in half and produces worse replies. Fence and normalise as now, but allow up to 4,096 characters (Google's review length), and cap cost with a per-business daily AI budget instead (K-100).

6.  **Yawmiyati as the first live test (K-85).** Google allows Business Profiles only for businesses that meet customers in person (K-98); an online content website does not qualify, and the test post drafted for it describes deliveries the business does not make. Keep Yawmiyati for internal testing only, never in public material, and pick a real café, salon or clinic as the first live customer.

**K-100 Cost guardrails, corrected and completed.**

| Risk                                                          | Guardrail                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
|---------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Bots or a viral spike on the free Profile Check               | Cloudflare Turnstile on every check; 10 requests a minute per IP and 3 checks a day per visitor (as planned); plus hard daily quotas set on each Places API in Google Cloud (Quotas page), set to 100 snapshot calls a day (the snapshot's rating, review count, hours, phone and website fields are billed as Place Details Enterprise: 1,000 free calls a month, then \$25 per 1,000, so the cap is about \$2.50 a day); budget alerts at \$5 and \$10 a day by email; an app-level kill switch that turns the tool into "Back soon" when the daily count passes the cap |
| Paying for Places fields Kabsi does not use                   | Field masks on every Places request (only the fields the snapshot shows, never the reviews field, which moves the whole call to the \$30 per 1,000 tier), Autocomplete with session tokens so a search plus one details lookup is billed as one session, and a 24-hour cache of each snapshot by place ID                                                                                                                                                                                                                                                                  |
| Long or hostile review text                                   | Fencing and normalisation (K-14); up to 4,096 characters; max 2 redrafts per review; output token cap per draft; a per-business daily AI budget and a global daily budget with an alert                                                                                                                                                                                                                                                                                                                                                                                    |
| AI provider runaway spend                                     | Monthly spend limit and alerts set in the AI provider's console; separate API keys for production and testing                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Email-code abuse (someone floods an inbox with sign-in codes) | Turnstile on the email-code form, at most 3 codes per address per 15 minutes and 10 per IP per hour; codes expire in 10 minutes                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Retry storms against Google                                   | Circuit breaker, backoff with jitter, dead-letter after 5 tries (K-35, K-36), as planned                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Email scanners clicking links                                 | GET shows, POST performs, exactly-once claim (K-17, K-38), as planned                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Trial abuse                                                   | One trial per Google listing and per Google account (K-101)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Meta ads overspend                                            | Account spending limit in Meta set to the month's budget; daily budgets only, no lifetime budgets                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Lost Google API access (the costliest failure)                | Policy compliance (K-03, K-86) and the plan B in K-86                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |

**K-101 The trial: full product, limits only where people would "fix and leave".** Kabsi's value is ongoing (new reviews, changes Google makes, weekly posts), so the trial gives the ongoing product in full and holds back only one-time clean-up work.

- **Length and start:** 14 days, no card, starting when Kabsi has working access (K-94).

- **Full during the trial:** reply drafts and publishing for new reviews, profile watching and alerts, the Weekly Care Report, one post a week, the review link, QR code and card, Nora.

- **Capped during the trial:** profile fixes: Kabsi lists every fix it finds but applies 3 of the owner's choice; the rest apply on subscribing. Old unanswered reviews: up to 10 replies drafted from the backlog; the rest on subscribing. This is how K-66's day-one backlog works during a trial: the 10 most recent unanswered reviews are drafted at once (low-risk praise can be approved together), and Home shows how many more are waiting. Owners can still fix things by hand in Google; the point is that the done-for-you clean-up is part of the paid product.

- **Silent cost cap:** 100 AI generations per trial account; past it, Kabsi asks the owner to subscribe or book a setup call.

- **One trial per business:** one per Google listing (place ID) and one per Google account. A returning listing goes straight to paid, with its earlier settings restored.

- **Messages that convert:** day 2 "first win" (the first reply approved or change caught); day 7 "Your week with Kabsi" (what was drafted, published and caught); day 11 "3 days left" with both prices; day 14 "Keep Kabsi running". No end-of-trial discount: it trains people to wait.

- **After day 14 without payment:** 7 days of grace in which Kabsi keeps watching and drafting but publishes nothing, and Home shows what is waiting ("4 replies ready, 1 change caught"). On day 21 Kabsi removes its Manager access, tells the owner, and deletes trial data under the 30-day rule (K-30).

- **Measure:** trial-to-paid (target 12% or more), share of trials that hit a cap, conversion of capped versus uncapped trials.

**K-102 Emails: keep the current design, tighten five things.** The test email ("This week's post is ready") is right in structure: sand background, one white card, the brand mark, a clear heading, the content itself, one yellow button with black text, the approval promise, and a footer saying Kabsi is not affiliated with Google. Keep it as the template for every email, and change:

1.  **Subject and preview text:** business name first, then the action: "Yawmiyati: approve this week's Google post". Add a preview line ("Nothing is posted until you approve."). Owners with several businesses can then scan the inbox.

2.  **Show what will go live:** for posts, the photo thumbnail, the text and the button label exactly as they will appear on Google, and when the draft expires. For replies, the review (within the 30-day rule) above the draft.

3.  **Two actions:** primary "Review and approve" (opens the confirmation page, K-17), secondary text link "Edit first".

4.  **Footer:** the legal seller's name and postal address once registered (K-65, K-106), "Why you got this" in one line, and an "Email settings" link with a toggle per email type. Non-essential emails also carry a one-click unsubscribe header; sign-in codes and security emails do not.

5.  **Rendering:** a plain-text version of every email; dark-mode-safe logo (transparent PNG with a thin light outline); 600 px max width; body text 16 px; buttons 44 px tall; tested in Gmail, Apple Mail and Outlook before each new template ships. All emails come from one template system that reads the design tokens (K-108).

Post drafting rule (seen in the test): lead with one concrete thing (an offer, news, a seasonal note), 150 to 300 characters, one button, one real photo, and never describe services the owner has not confirmed in Business Knowledge.

**K-103 WhatsApp, ManyChat and Nora.** WhatsApp automation is not possible without the WhatsApp Business Platform: ManyChat itself connects only through the WhatsApp Business API, which needs a verified Meta business and a phone number not registered on any WhatsApp app. Unofficial tools that automate a normal WhatsApp account break WhatsApp's terms and get numbers banned. So:

- **Until the company is registered and Meta-verified:** WhatsApp is a click-to-chat link (wa.me) answered by Rashid in the WhatsApp Business app, using its built-in greeting, away messages, quick replies and labels.

- **After verification:** connect the WhatsApp Cloud API directly to Nora (a webhook into Kabsi's backend). No ManyChat for WhatsApp: it would add a per-contact fee and a second bot brain.

- **ManyChat's job:** Instagram and Facebook comment and DM automation (for example a comment with "SETUP" gets the booking link; story replies get a short answer), which it does well through Meta's official APIs. Free-text DMs get a link to Nora; once volume justifies it, ManyChat's External Request passes them to Nora's API so one brain answers everywhere.

- **Nora stays in-house.** It already exists, knows each account's live state (trial days, onboarding scenario, approvals waiting), and costs far less per answer than per-resolution help-desk bots. Rebuilding on a third-party platform would lose that account context.

**K-104 Nora is always in sync.** One source of truth, knowledge/kabsi-facts, holds every product fact Nora may state: prices, trial rules (K-101), onboarding routes and scenarios (K-91 to K-98), the Calendly booking link with its three pre-selected versions (setup, partner, other) and the support email, policies, the claims list. Rules: Nora answers product questions only from it, and account questions only from live tools (never from memory); every change that alters behaviour, price or wording must update it in the same change (a checklist item in the project rules); the evaluation set (K-75) runs on every deploy and blocks the release if Nora contradicts the facts; questions Nora could not answer are reviewed weekly and turned into facts.

**Nora hands over to a person.** Nora offers a call whenever someone asks to talk to a person, asks for a call or for help, says they are stuck, sounds upset, or asks something Nora cannot answer from the facts or live state. It gives the Calendly link with the matching answer already chosen (setup for owners connecting Google, partner for agencies, other for anything else), plus the support email, and says plainly that a real person (Rashid) will help. Urgent problems (wrong information published on Google, Google access lost, a payment issue) also get "Write to hello@kabsi.co and we'll reply today" (K-88). Nora never invents availability or promises a time; Calendly shows the real slots. Every handover is recorded with the conversation, so the person picking it up does not ask the owner to repeat themselves, and the evaluation set (K-75) includes these requests in English first and in the other languages owners write in (K-119).

**K-105 A call with Rashid for agencies and partners.** Rashid's free Calendly account has one event type, so both calls use it: "Call with Kabsi" (20 minutes), with one required question, "What's the call about?" (Setting up my Google profile / Partner or agency / Something else), and each page's link pre-selects the answer. A separate "Partner call with Rashid" type comes when calls are frequent enough to justify a paid plan. Partner call placements: the Partners page hero as the secondary button ("Talk to Rashid") and again beside the partner FAQ; the partner application confirmation page; the partner dashboard's help menu; the resale section of the pricing page; the footer ("For agencies: talk to Rashid"); Nora, whenever someone says they manage clients; partner onboarding emails. Rashid appears by name and role, with Kabsi's mark rather than a photo.

**K-106 Payments through Creem; NOWPayments only for crypto requests.**

- **Creem as the merchant of record for all card payments.** Creem is the legal seller: it charges the card, issues invoices, handles chargebacks, and calculates, collects and remits VAT, GST and sales tax. Fee: 3.9% plus \$0.40 per successful payment, no monthly fee. On a \$19 month that is about \$1.14 (6%); on \$190 a year about \$7.81 (4%), one more reason to promote annual.

- **Account ownership.** Creem checks the identity of the account holder, and payouts go only to a bank account in that same name. The account must therefore belong to whoever legally owns Kabsi's revenue (the UAE company once registered, K-65, or the named individual). Do not share one person's login with another: add Rashid as a team member if Creem allows it, and put a short written agreement between the account holder and Rashid on who owns the revenue. The seller named in Kabsi's terms, privacy policy and email footer must match.

- **Build:**

  - Products in Creem: Monthly \$19, Annual \$190, Extra location \$15 a month or \$150 a year, Lebanon bundle \$120 a year, Partner resale \$8 per business a month (quantity-based).

  - Kabsi runs the no-card trial itself; Creem is used only when the owner subscribes. A server function creates a Creem checkout with the workspace ID in metadata and sends the owner to Creem's hosted checkout.

  - A webhook endpoint verifies Creem's signature, stores each event ID once (idempotent), and updates one subscriptions table (active, past due, cancelled, expired) from which all feature access is computed.

  - "Manage billing" opens Creem's customer portal (card change, invoices, cancel).

  - Creem's checkout and invoices carry Kabsi's logo and colours (K-108).

  - Partner referral commissions (30% for 12 months, 40% for founding partners) run through Creem's affiliate feature if it supports a 12-month recurring commission; otherwise Kabsi tracks referrals and pays monthly.

- **NOWPayments:** keep it, hidden from the normal checkout, for annual plans paid in crypto by customers who ask (mostly Lebanon, where card payments are hard). For those sales Kabsi, not Creem, is the seller, so keep them few and recorded for the accountant.

**K-107 Taxes: Creem handles sales taxes; prices shown before tax.** As merchant of record Creem collects and remits VAT, GST and US sales tax on Kabsi's subscriptions, so Kabsi does not register for VAT or GST in the US, Canada, UK, Ireland, Australia, New Zealand or Singapore. Show prices in USD as "\$19 a month, plus tax where it applies"; Creem adds the right tax at checkout, and business customers who enter a valid VAT or GST number are charged without it where the law allows. Before launch, check that each target country is in Creem's current tax coverage list (Creem's own pages give different counts). What stays with Kabsi: the owning company's income or corporate tax (in the UAE, corporate tax applies only above the small-business threshold), and any tax on the few NOWPayments sales. This supersedes growth decision G-43.

**K-108 One design system everywhere.** Every surface Kabsi shows uses the same tokens and components: marketing site, app, onboarding, emails, the Weekly Care Report, Nora's widget, the status page, help pages, booking pages, Creem's checkout and invoices, social templates and video end cards.

- One tokens file (colours, type, spacing, radius, shadows) is the only place values live; Tailwind is configured from it with no arbitrary colour or font values allowed; emails inline the same tokens.

- Fonts: Lalezar for display titles, Readex Pro for everything else; emails fall back to system fonts where clients block web fonts.

- A shared component library (buttons, cards, inputs, status pills, banners) and an internal /design page showing every token and component.

- Third-party pages (Creem, Calendly where its plan allows, status page) get Kabsi's logo, yellow, black and sand in their branding settings.

- A release check: screenshots of the key pages on phone and desktop compared on every deploy, so drift is caught before users see it.

Sources for K-99 to K-108: [Creem: merchant of record, tax collection and remittance](https://docs.creem.io/getting-started/introduction) · [Creem payouts: identity must match KYC, fee example](https://docs.creem.io/merchant-of-record/finance/payouts) · [Creem pricing: 3.9% + 40¢](https://www.creem.io/pricing) · [Creem tax coverage counts differ between its pages (MoR Finder)](https://www.merchantofrecordfinder.com/providers/creem) · [ManyChat WhatsApp needs the WhatsApp Business API and Meta business verification](https://setsmart.io/blog/manychat-whatsapp)

**K-109 Get Reviews becomes a print designer with three tabs.** The printed QR is the most visible thing Kabsi makes: it sits on a customer's counter for months. A bare QR code looks unfinished, and the current single long page (link, five message boxes, NFC instructions, cards) loses owners who want one thing. Decisions, specified in the design review ("Get Reviews, redesigned"):

- **Structure:** a fixed header (link, QR, opens, the one fairness rule) and three tabs: Print (default), Share (one channel picker instead of five boxes), Cards and tags (NFC folded away). First visit is a three-step guide: where customers will see it, make it yours, download.

- **Print designer:** six formats (table tent, counter card, round sticker, A5 sign, A4 poster, business-card size), three template looks built from the design tokens, the owner's logo, one accent colour, an approved headline, an optional 40-character line, in English (other languages later, K-119). Output: print-ready PDF with bleed and crop marks, a print-at-home A4 sheet, and a PNG.

- **Locked for quality and policy:** QR size and contrast, the short link under it, "scan with your phone camera"; no Google logo, no five-filled-stars graphic; headlines only from the approved list; the optional line blocks reward and rating words (Google's review rules, K-03).

- **Placements:** each printed or shared item gets its own short code automatically, so owners see which placement is opened most. Opens are shown honestly as opens, not reviews.

- **Plans:** the designer is fully available in the trial and on every plan. Prints carry a small "Made with kabsi.co" line (6 to 7 pt, grey, bottom edge, away from the QR and headline), on by default and removable with one toggle on any plan, including the trial. Always off on prints made from a partner or agency workspace. The review link itself opens Google directly, with no Kabsi page in between.

- **Later:** "Order printed" (Kabsi prints and ships) only when fulfilment exists per country; until then the PDF works with any local print shop.

**K-110 Visual direction, comparison and guides.** Specified in the design review ("Visual direction, comparison and guides") and growth decisions G-45 and G-46. In short: calm, product-led design with the approval card as the one recurring visual; no 3D; one CSS hero animation and small purposeful motion only; one icon set; a five-section Meta landing page with no comparison and no menu; a no-names "three ways" comparison on the homepage and fair, dated comparison pages for search; guides with true dates, real screenshots, human review, one inline next step, launched as a set of 10 and then one a week for 12 weeks.

Three fixes found on the live site (kabsi-app.lovable.app/guides, checked 3 Oct 2026):

1.  **Canonical address.** kabsi.co is verified in Search Console with an old site and sitemap, and moves to the new build when Google approves API access. Until then the new build lives at kabsi-app.lovable.app, which is public and declares itself canonical, so search engines can index it and later treat kabsi.co as a duplicate. Until the switch: mark every kabsi-app.lovable.app page noindex. On switch day: point kabsi.co at the new build, set every canonical to https://kabsi.co/..., redirect the Lovable address to kabsi.co, redirect any old kabsi.co URL that has a new equivalent and let the rest return 404, then submit the new sitemap in Search Console and remove the old one.

2.  **Operator line in the footer.** It names an individual with a home address in Dubai. Replace it with the legal seller and business address that match Creem and the terms (K-106); never publish a private home address.

3.  **Two slogans.** The share image and closing banner say "Every Google review, answered. You just tap Post." while the brand line is "Your reviews and listing. Taken care of." Final wording, used everywhere: the brand line is "Your reviews and listing. Taken care of." (hero, share images, page titles, closing banners, app sign-in, video end cards); the explanation line under it, written in owners' words rather than product terms and covering the whole product, is "Kabsi looks after your business on Google: a reply ready for every new review, your hours and details kept right, and fresh posts. You just approve." (share and search descriptions may add "plus easy ways to get more reviews and one short report a week"); the call to action is "Start free" with "14 days free. No card." ("Join early access" until Gate A). "Every Google review, answered" is retired: it over-promises, since owners can decline drafts. The sign-off "We watch your listing. You run your business." stays only on the About page and video end cards.

**K-111 One helper on every onboarding step: Nora plus the setup call.** A "Need a hand?" chip under each step's main button opens a sheet with: Ask Nora (three questions for that step, aware of the owner's profile state), the step's 20-second clip, and a free 15-minute setup call (from the Google access step onward). Nora offers help once, unprompted, only when an owner is stuck (3 minutes on the manual invite without an invitation, a failed access check, or a scenario screen). Nora is shown with the Kabsi mark and an "AI" tag, never asks for passwords or codes, answers only from the facts file and live state (K-104), and hands over to the call when it cannot solve the problem. Specified in the design review ("Help on every onboarding step"). This refines K-89 and the onboarding screen rules in K-91 to K-98.

**K-112 Slogan: "Your reviews and listing. Taken care of."** Google's brand rules for third parties say not to put Google's name in your own name, domain or slogan ("Don't put our name in your name"), so neither "Your Google Business. Taken care of." nor "Your business on Google. Taken care of." may be used. The final slogan names what an owner recognises (their reviews and their listing) without any Google trademark. It replaces every earlier version everywhere: site, app, ads, videos, emails, share images, social bios. The sign-off becomes "We watch your listing. You run your business."

"Google" and "Google Business Profile" stay allowed only as plain descriptive words in sentences ("Kabsi looks after your business on Google", "works with Google Business Profile"), never as a noun or verb on their own, never in a handle, display name or headline graphic, and never with Google's logo. Social bios read like: "Reviews and listing care for local businesses. Works with Google Business Profile." The website footer, help pages and comparison pages carry the full notice: "Google and Google Business Profile are trademarks of Google LLC. Kabsi is independent and not affiliated with, sponsored by or endorsed by Google." Ads and video end cards, where space is short, use "Kabsi is not affiliated with Google." Unaltered Google screenshots with a highlight are allowed only where they teach: onboarding, help pages, guides and organic how-to posts. Never in ads (including boosted posts) or printed marketing.

**K-113 Google API compliance, from Google's own documentation** (Business Profile APIs policies, updated 28 August 2026; API Services User Data Policy; checked October 2026):

1.  **Written notice within 48 hours.** When Kabsi gains Manager access to a profile (or changes anything about access), the owner gets Kabsi's own email within 48 hours saying what changed and how to remove Kabsi, separate from Google's notifications. Build it into onboarding (sent at confirmation).

2.  **Disconnect within 7 business days.** One self-serve "Disconnect Kabsi" removes Kabsi's Manager access through the API immediately, with staff follow-up; the 7-business-day limit is the outer bound (K-03, K-86).

3.  **No aggregation of review content.** Review themes (K-27) are computed on request, in memory, shown and discarded; no theme tables, embeddings or summaries derived from review text are stored. Review text and reviewer details are deleted at 30 days (K-30).

4.  **Reply and post pre-checks.** Before a draft is shown, Kabsi blocks phone numbers, email addresses, links, promotions and repeated boilerplate in review replies, because Google filters and can reject them; posts keep their single button link.

5.  **No proxy access.** No public API, MCP server or script that lets anyone else read or write Google data through Kabsi's project; every Google action happens inside Kabsi's own product.

6.  **OAuth verification package for business.manage** (a sensitive scope, not restricted, so no paid security assessment is needed): an unlisted demo video showing the address bar with the OAuth client ID, the consent screen and the Manager invitation; the written justification that the token is used once to invite Kabsi's business group and is then revoked, with no refresh tokens kept and no Google data used for advertising or AI model training; and the Limited Use sentence in the privacy policy, word for word: "Kabsi's use and transfer to any other app of information received from Google APIs will adhere to the Google API Services User Data Policy, including the Limited Use requirements." Expect 3 to 5 business days for a first answer and 2 to 4 weeks with questions.

7.  **Never use Google data to train AI models,** never sell or transfer it, never use it for ads or retargeting; people at Kabsi read it only with the owner's consent, for security, or as the law requires. The privacy policy says so plainly.

8.  **Positioning against Gemini in Business Profile.** Google's free tools already draft replies and posts when an owner opens them. Kabsi never leads with "AI replies"; it leads with what comes to the owner unasked: alerts when details change, drafts delivered by email ready to approve, a memory of verified business facts, team and agency approval, and the weekly report. Comparison pages state only facts sourced and dated from Google's own pages (G-46); claims such as "Gemini makes things up" are not used.

**K-114 Four features from what local SEO agencies teach owners.** A review of a US local SEO agency's tutorials (GoBIG Systems, October 2026) shows the jobs owners pay agencies for. Four fit Kabsi's approve-before-publish model; the rest do not.

1.  **Service descriptions by interview.** Under "Your details", Kabsi lists the profile's services, adds any missing ones the owner confirms, then asks 3 to 5 short questions per service (what's included, brands or methods, areas served, typical time). It drafts each description under Google's 300-character limit, mentioning the service and the city naturally once, and the owner approves each one. Answers are saved as verified Business Knowledge (K-10, K-11), so they feed replies and posts too. No keyword stuffing, no invented details.

2.  **"Recent job" posts for service businesses.** For trades and clinics, a post type built from one real job: the owner's own photo, the area it was in, what was done, one button. Areas named must come from real jobs the owner confirms, never from a list of towns to rank in.

3.  **"Never delete your profile" protection.** Owners lose their reviews by deleting a profile they think is a duplicate. Kabsi (a Manager, so it cannot delete) adds a guide, a Nora answer and an onboarding scenario for duplicates: do not delete; ask Google to merge or mark the duplicate, with Google's own help link. Any "delete" question to Nora gets this warning first.

4.  **Service areas check.** For service-area businesses, the completeness check (K-80) includes the service-area list, with the owner confirming each area they really serve, within Google's limits.

Not adopted, and why: mining review text into descriptions (it creates stored content derived from reviews, which K-113 forbids; owners may do it themselves in Google); scraping competitors' websites or listings for gap analysis (Kabsi is not a website SEO tool and does not build benchmarks from other businesses' Google data); naming towns in posts where no work was done, or addresses in cities without a real location (both break Google's guidelines); and the agency's unsourced statistics ("34% more engagement", "ahead of 99% of people"), which never appear in Kabsi copy.

**K-115 Kabsi's care routine (what Kabsi does, and when).** Owners and agencies think about profile care as a routine. Kabsi makes that routine visible in Home and the Weekly Care Report, so the owner sees the work being done:

| When          | Kabsi does                                                                                                                                                                                                                                                                                          | Owner does                                                  |
|---------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------|
| Every day     | Checks for new reviews and drafts a reply for each (aim: owner approves within 24 to 48 hours); checks for profile changes and alerts urgent ones                                                                                                                                                   | Approves or edits                                           |
| Every week    | Drafts one post (offer, news, event or recent job, K-114); asks for one or two real photos from this week; sends the Weekly Care Report                                                                                                                                                             | Approves the post; sends photos from their phone            |
| Every month   | Services and products check (missing services, descriptions, prices, K-114); reminds about special hours for the coming month's holidays                                                                                                                                                            | Confirms or corrects                                        |
| Every quarter | Full profile check against Google's completeness list (K-80); "Who has access" check: lists every owner and manager on the profile from Google, so the owner can spot an old agency or former employee; checks the website link on the profile still works and carries Kabsi's tracking tag (below) | Removes anyone who should not have access (only owners can) |

Two small additions from this routine:

1.  **Tracked website link.** Kabsi suggests adding a tracking tag to the profile's website link (?utm_source=google&utm_medium=organic&utm_campaign=gbp), so the owner's own analytics show visits from their Google profile. Shown as a normal profile change for the owner to approve.

2.  **Access check.** The quarterly "Who has access" list reads Google's owners and managers for the profile and labels Kabsi's own entry; it never removes anyone itself.

Not built: chat or messaging replies (Google ended Business Profile chat in 2024), citation management across other directories (outside Kabsi's product), and claims such as "Google detects stock photos and removes your ranking", which are not confirmed by Google.

**K-116 Product rules from how Google Business Profile behaves now (2025 to 2026).** From a research notebook of about 150 sources (October 2026), mostly third-party; each item is a product rule because the safe behaviour costs little. Rashid's Claude confirms the marked items (†) against Google's own pages or real API responses once Gate A is granted.

1.  **Replies can wait in Google's moderation (†).** Owner replies are checked before they appear, sometimes for minutes, sometimes much longer. The publication pipeline therefore has a "Google is checking your reply" state between published and verified: Kabsi keeps checking on a widening schedule, shows the owner that state calmly, and treats a reply as failed only if Google rejects or removes it. No duplicate re-posting while a reply waits (K-38).

2.  **Never several risky edits at once.** Changing name, address and primary category together is a known suspension trigger. Kabsi publishes at most one of these high-risk fields per approval, spaces them at least a week apart, and warns the owner before any name change that adds words not on their signage (K-77).

3.  **No contact details in post text.** Phone numbers, emails and social handles in posts can get them rejected; posts use the profile's call or link button instead. Added to the pre-checks in K-113 for posts as well as replies.

4.  **Replies:** 2 to 4 sentences; same language as the review (K-75); for unhappy reviewers, "please contact us through the details on our profile" rather than writing a phone number; for suspected fake reviews, a calm, factual reply that never reveals customer records, plus a prompt to report it to Google.

5.  **Hotels and lodging:** no Offer posts.

6.  **Photos:** Kabsi checks at least 720 x 720 pixels, JPG or PNG, not dark or blurry, no text overlays, before suggesting upload; never stock images.

7.  **Asking for reviews steadily.** Sudden bursts of reviews can be filtered as spam. Get Reviews advises asking every customer as they visit, not a one-off message to the whole customer list, and the design never offers "send to all your past customers".

8.  **Suspension appeals (K-96):** fix everything in one pass before appealing; have evidence ready because the evidence form must be completed soon after the appeal is opened (†, reported as 60 minutes); never create a new profile or file a second appeal while one is under review.

9.  **Google's own review link and QR (2025).** Google now offers official review links and QR codes. Kabsi's review links must open Google's official review form, and Kabsi's value is the branded print designer, placements and opens (K-109), not the link itself.

10. **Q&A is gone; AI answers read the profile (†).** Google retired Q&A in late 2025, and its AI answers on Maps draw on profile details, services, reviews, photos and the website. This makes complete, accurate details and service descriptions (K-114) more valuable; Kabsi may say "Google's AI answers read your profile, so keep it complete and accurate", never that Kabsi improves AI answers or rankings.

11. **Identity attributes are never suggested** ("women-led", "LGBTQ+ friendly" and similar), only offered for the owner to add themselves (K-84), even though some sources recommend them by industry.

12. **Google now lets owners schedule posts and post to several locations natively.** Kabsi's posts keep their value through drafting from verified facts and the weekly rhythm, not scheduling alone; do not market scheduling as a differentiator.

**K-117 Search terms, services, action links, products and descriptions (from a real profile, October 2026).** A review of the full Business Profile of a real Lebanese auto parts store managed by Rashid ("Abou Hamze Auto Center") showed five things Kabsi must handle well. Items marked † are confirmed against real API responses after Gate A.

1.  **Search terms.** Google's Performance screen lists the search terms that showed the profile, by month, with small counts shown as ranges ("\< 15"). Kabsi reads them through the Business Profile Performance API (already enabled; monthly search-keyword impressions) and uses them three ways: the monthly section of the Weekly Care Report ("How people found you this month", shown exactly as Google reports them); wording for service names, descriptions and posts, using only terms the owner confirms describe their business; and spotting confusion (in this profile, searches for other businesses with a similar name in other areas). Never: other businesses' names, places the business does not serve, or stuffing terms into the business name.

2.  **Services.** Google limits a custom service name to 120 characters and a description to 300. Kabsi's rules: start from the services Google suggests for the primary category; one service per item; names short and plain, in the words customers use (2 to 5 words, "Brake pads and discs", never "Best brake parts Bakaata Shouf cheap"); no city or keyword lists in names; descriptions from the owner interview (K-114), naming the service and the real area once. English and Arabic names where the business serves both. Services are written through the Business Information API, approved by the owner like any change (†).

3.  **Booking, ordering and menu links.** Kabsi manages the profile's action links (appointment, online booking, reservation, order online, delivery, takeaway, shop online, menu) through the Place Actions API (already enabled): it suggests the right type for the business, the owner approves the link, and the weekly link check (K-115) raises a card if a link breaks. One preferred link per type; the website keeps its tracking tag.

4.  **Products.** Retail profiles show an "Edit products" area (in this profile empty, with Google's new "answer simple questions about your shop" set-up). If Google's APIs do not allow writing products (†), Kabsi makes it an assisted task: it prepares each product's name, category, short description, price if the owner gives one, and photo, and the owner adds them in Google with a step-by-step card; Kabsi then checks they appear. If the API allows it, products go through the normal approval pipeline.

5.  **Description and field rules.** The profile's description held a phone number and a superlative ("Your best place for all your spare parts"); its opening date, chat link, service area, payments, accessibility and parking were empty while the business delivers (its van says "Free delivery"). Kabsi's completeness check (K-80) and drafting rules therefore include: descriptions up to 750 characters, factual (what the business sells or does, since when, where, what makes it different), with no phone numbers, links, prices, promotions or superlatives; the opening date when the owner knows it; the WhatsApp chat link where the owner uses WhatsApp (K-83); a service area for storefronts that also deliver or visit customers; and every attribute group the owner can confirm (identity attributes only on the owner's own initiative, K-84).

The same profile showed five "updated by Google" notices at once (website, social profile, map pin, recycling and delivery attributes). This is exactly the case Google Protection (K-18 to K-20) handles: show each change with before and after, explain it, and let the owner keep it or restore their value, one high-risk field at a time (K-116). A moved map pin is treated as high risk.

This store is a strong candidate for the first live customer in place of Yawmiyati (K-99): a real storefront with real reviews and real Google edits. Using it needs the owner's written consent, and any public use must say it is connected to Kabsi's team.

**K-118 Supporting platforms and the email set.** Every tool below is owned by a kabsi.co account with two-factor sign-in, a second trusted admin and its keys in the secrets inventory (K-87). No tool receives review text, reviewer names, Google data or Business Knowledge, except Kabsi's own database. Rashid's Claude checks each current setting against this table and turns the gaps into P0 or P1 tasks.

| Platform                                       | Set up                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Never                                                                               |
|------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------|
| **Cloudflare**                                 | DNS for kabsi.co; proxy and caching for public pages; the go.kabsi.co review-link Worker (K-109 placements, open counts); Turnstile on the Profile Check, email-code and booking forms (K-100); rate limits; redirects for the domain switch (K-110); security headers; WAF managed rules on                                                                                                                                                                                                                                                                                                                                                                                         | Cache logged-in app pages or API responses                                          |
| **Resend**                                     | Sending subdomains split by purpose (for example mail.kabsi.co for account and product emails, news.kabsi.co for marketing), each with SPF, DKIM and DMARC aligned, starting at p=none (G-22); Google Postmaster Tools; bounce and complaint webhooks feeding one suppression list; idempotency key per email so retries never double-send; reply-to hello@kabsi.co, which a person reads                                                                                                                                                                                                                                                                                            | Marketing from the account subdomain; sending to suppressed addresses               |
| **Sentry**                                     | Web app and Edge Functions, with release tags; personal data scrubbing on; alerts to Slack for new errors, error spikes and failed publications                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Sending request bodies, review text or tokens                                       |
| **PostHog**                                    | Product analytics with the events in G-44 and G-47; the data region that matches the privacy policy; autocapture off inside the app (named events only); session replay off, or on only for onboarding with every input masked                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Recording review text, drafts or Business Knowledge                                 |
| **Uptime monitoring** (UptimeRobot or similar) | Checks every minute on the site, the app, a health endpoint for Edge Functions and the queue, the go.kabsi.co Worker, and the Creem and Meta webhook endpoints; public status page at status.kabsi.co (K-87)                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | A green status page while the queue is stuck: the health endpoint reports queue age |
| **Slack**                                      | Channels: alerts (Sentry, uptime, dead-letter jobs, circuit breaker, K-36), signups and access granted, payments (Creem events), support (Nora handovers, setup-call bookings), ads (weekly scorecard)                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Customer review text or personal data in messages                                   |
| **Calendly**                                   | Rashid's free Calendly account, kept free until calls are frequent: one event type, "Call with Kabsi" (20 minutes), with the required question "What's the call about?" (setup, partner, other), embedded on /setup-call and the Partners page with the answer pre-selected. The free plan has no webhooks, so the embedded widget's own "event scheduled" browser message tells Kabsi's page, which records the booking and sends Meta's Schedule event with one event ID from the browser and the server (G-47). Calendly's default look is accepted for now. Upgrade to a paid plan (two event types, Kabsi branding, webhooks) once calls are regular, roughly 10 or more a week | Collecting anything beyond name, email, business and time                           |
| **Creem, Meta, Google**                        | As decided: K-106, G-47, K-113                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |                                                                                     |

**Every email Kabsi sends** (one template system, K-102 design; "Settings" means the owner can switch it off in email settings):

| Group              | Emails                                                                                                                                                                                                                                 | Can be switched off                     |
|--------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------|
| Account            | Sign-in code; welcome; email change                                                                                                                                                                                                    | No                                      |
| Google access      | Access confirmed, with how to remove Kabsi (within 48 hours, K-113); scenario reminders (verification, review, ownership request on day 3 and day 7); access lost; disconnect confirmed                                                | No                                      |
| Daily work         | New review: reply ready; risky review: guidance (no draft); profile changed by Google; reply rejected or removed by Google; link broken                                                                                                | Settings (urgent changes stay on)       |
| Weekly and monthly | Weekly Care Report; post ready to approve; photo request; monthly services check and "How people found you"; holiday hours reminder                                                                                                    | Settings                                |
| Trial and billing  | Day 2 first win, day 7 your week, day 11 three days left, day 14 trial ended, grace notice, access removal on day 21 (K-101); payment confirmed, payment failed, plan changed, cancellation confirmed (alongside Creem's own receipts) | No for billing; Settings for trial tips |
| Partners           | Application received; approved; client added; monthly partner report                                                                                                                                                                   | Settings                                |
| Help               | Setup call confirmed and reminder (from Calendly); Nora handover reply from a person                                                                                                                                                   | No                                      |

Every template is tested before it ships in Gmail, Apple Mail and Outlook, on phone and desktop, in light and dark mode, with its plain-text version and correct links, and is checked against the claims rules (no ranking promises, no "automatically").

**K-119 English first; every language understood.** Kabsi launches in eight English-speaking markets, so English is the priority everywhere: the app, onboarding, emails, Nora, the website, guides, videos and ads are English only at launch. Kabsi still understands every language a review or an owner writes in, and drafts each reply in the reviewer's language (K-116). Earlier Arabic-first or Gulf-first items (an Arabic site, Arabic dialect evaluation as a headline feature, Arabic versions of print headlines) become P2: built when a market or a meaningful share of customers needs them, alongside other languages such as Spanish and French. Arabic-speaking customers in the UAE are served in English, with replies to Arabic reviews in Arabic. The evaluation set (K-75) is English first, then covers the languages reviews actually arrive in for Kabsi's customers.

**K-120 Kabsi's memory for each business.** Every business has its own private memory that Kabsi uses for everything it writes, so the owner never repeats themselves and Kabsi never invents.

1.  **What it holds,** for that business only: verified facts (Business Knowledge, K-10, K-11: services, hours, prices the owner gave, areas, what makes them different), each with its source, confidence and date; the owner's preferences (tone, sign-off, words to use or avoid, how they answer complaints); decisions and history (what was approved, edited or rejected, and why if the owner said); search terms Google reports (K-117); open questions Kabsi is waiting on.

2.  **How it learns:** from the owner's answers, confirmations and edits. When an owner edits a draft, Kabsi notes the change in style (for example "shorter", "uses first names") and, if the edit adds a fact, asks once whether to save it as a fact. Nothing becomes a fact without the owner's confirmation. Reviews are never a source of facts (they are customers' opinions, and review text is kept 30 days at most, K-113).

3.  **No invention:** every draft is built only from verified facts, the owner's preferences and the item being answered. A checker compares each factual statement in a draft (prices, hours, services, offers, names, dates) with the memory before the owner sees it; anything not backed is removed, and if it matters Kabsi asks the owner instead ("Do you deliver to nearby areas?"). Unknown is better than invented.

4.  **Fast and affordable:** each business's memory is kept as a compact, versioned summary that is reused across drafts (prompt caching), refreshed only when a fact changes.

5.  **Private and visible:** one business's memory is never used for another, never shared, and never used to train AI models. The owner sees it all in "About your business", can correct or delete anything, and deletion is real.

6.  **Same memory for Nora:** Nora answers questions about an owner's own business from the same memory and live state, under the same rules (K-104).

**K-121 WhatsApp from day 1, on a US number.** *Amended by K-122 (7 Oct 2026): the number is no longer bought from the Numero app. Points 1, 2 and 6 below are replaced by K-122; points 3, 4 and 5 stand, with the tools Kapso's inbox offers in place of the WhatsApp Business app.* Original day-1 setup:

1.  **The number:** used only for Kabsi; Numero account under hello@kabsi.co with two-step sign-in, paid yearly with auto-renew, recorded in the secrets inventory (K-87). If a virtual number lapses it can be reassigned, and the WhatsApp account goes with it, so renewal is critical.

2.  **WhatsApp Business app** on a dedicated phone (not Rashid's personal one), with WhatsApp's two-step verification PIN and a recovery email. Business profile: name "Kabsi", the logo, "Your reviews and listing. Taken care of.", website, hello@kabsi.co, and hours in the customer's terms ("We reply within one working day").

3.  **Built-in tools:** a greeting message, an away message outside Rashid's hours, quick replies (how to add Kabsi as Manager, the Calendly link with each pre-selected answer, prices and trial, how to disconnect, "we never ask for your Google password or codes"), and labels (lead, trial, customer, partner, urgent).

4.  **Where it appears:** a click-to-chat link (wa.me/\<number\> with a short prefilled message) on the contact page, footer, /setup-call, Nora's handover (K-104) and support emails; the Instagram and Facebook WhatsApp contact buttons.

5.  **What it is for now:** questions, sales and support answered by a person. It does not send approvals or alerts and cannot approve anything: approvals over WhatsApp come only with the WhatsApp Business Platform, through the same approval pipeline as every other channel (guardrails section 6).

6.  **Later, without changing number:** once the company is registered and Meta-verified (K-103), connect the same number to the WhatsApp Business Platform with Meta's coexistence option, which keeps the WhatsApp Business app working on the number (†, confirm availability then), and route messages to Nora with handover to Rashid. Message templates for alerts and approvals are submitted then.

**K-122 WhatsApp through Kapso (replaces the Numero part of K-121).** Decided 7 Oct 2026, with Hussein running the project. Kabsi's WhatsApp runs through Kapso on a Kapso-provided US number, **+1 201-483-5474**.

1.  **People-answered support from day 1.** The number is used for questions, sales and support answered by a person. A click-to-chat link (`wa.me/12014835474` with a short prefilled message) appears on the contact page, the footer, the `/setup-call` page, Nora's handover (K-104) and the support emails. The number lives in one constant (`WHATSAPP_NUMBER` in `src/lib/site.ts`). The Lebanese number stays only on `/lebanon`. Kapso's inbox profile, greeting, away message, quick replies and labels are set up as listed in K-121 point 3. Nothing is approved over WhatsApp at this stage.

2.  **Owner alerts on WhatsApp, later.** Alerts and approval prompts are sent only with the owner's opt-in (recorded with the time, the phone number and the wording shown), only as Meta-approved templates, and each carries one button that opens the kabsi.co approval page. WhatsApp never approves anything itself: the approval happens on kabsi.co through the one approval and publication pipeline (guardrails section 6). Every send goes through the job queue, never directly from a screen or a function, and every send, failure and delivery status writes an audit event (K-36). STOP and its variants stop all sends at once and are recorded. A message never contains review text, reviewer names or Business Knowledge (K-113); it names the business and says what is waiting.

3.  **Nora on WhatsApp in P1.** Owners can message Nora on WhatsApp. Kapso's inbound webhook is signed; a message with a missing or wrong signature, or from an unknown sender, is ignored. Nora answers under the same facts, memory and safety rules as in the app (K-104, K-120), hands over to Hussein when she cannot answer, and never approves, publishes or changes anything: an action link goes to the kabsi.co approval page.

4.  **Processors.** The privacy policy and Nora's facts list Kapso and Meta as processors of WhatsApp messages, with what is sent and how long conversations are kept.

5.  **Tasks.** P0.6-10 (click-to-chat on the Kapso number), P0.6-12 (privacy text and Nora's facts), P1-21 (owner alerts: opt-in, templates, button, job queue, audit events, STOP, signed webhook receiver), P1-22 (Nora on WhatsApp). Kapso's API keys are Supabase secrets only. Meta business verification (R-25) is needed before P1-21.

## Open risks and what Rashid must verify

The largest risk is not technical: Google's API approval is still pending, and every live claim in this document depends on it. The rest are checks Rashid should close before or right after access arrives.

| Risk or open question                                                    | Why it matters                    | Action                                                        |
|--------------------------------------------------------------------------|-----------------------------------|---------------------------------------------------------------|
| Google API access not yet granted (quota read 0 on 28 Sep)               | Nothing live can be verified      | Keep concierge mode; build P0.1 to P0.3 on the mock           |
| Whether on-request review theme analysis counts as "aggregating" content | K-27 could break policy           | Ask through Google's data form; keep the reply on file        |
| Whether a Manager can remove its own access through the admin API        | K-41 depends on it                | Test on Yawmiyati on day one of live access                   |
| Whether Pub/Sub covers group-held locations                              | K-37 coverage                     | Test on day one; daily reconciliation covers gaps meanwhile   |
| Gemini expanding to multi-profile owners and proactive alerts            | Weakens K-50                      | Review positioning every quarter                              |
| Photo size and resolution limits                                         | K-23 normalisation targets        | Read Google's current photo guidelines before building step 3 |
| Card payments outside Lebanon                                            | Self-serve growth blocked by USDT | Finish the Creem or Dodo setup before paid ads                |
| One builder, about 20 weeks of P0 and P1                                 | Schedule slip                     | Hold the wave order; cut P1 before cutting tests              |
| Legal text (privacy, terms, retention table)                             | Promises must match the system    | Lawyer review before launch, as already planned               |

**K-56 Go-live checklist.** Before switching google_mode to live:

- [ ] Delete mock rows and every test account and business listed in KABSI-STATE.

- [ ] Re-read every connected business from Google and ask owners to confirm their baseline (K-18).

- [ ] Record real Google responses for each API module to replace hand-written mocks (K-34).

- [ ] Turn on Pub/Sub for the Kabsi account and the client group (K-37).

- [ ] Create a permanent demo business and demo login, since Google can ask for one within 7 days.

- [ ] Confirm the disconnect flow and the 48-hour change notice work end to end (K-41).

- [ ] Run the full test suite and the manual device checks (K-54).

- [ ] Publish the updated privacy policy, terms and knowledge base.

## Sources

Google: [Business Profile APIs policies](https://developers.google.com/my-business/content/policies) · [Latest updates](https://developers.google.com/my-business/content/latest-updates) · [Real-time notifications](https://developers.google.com/my-business/content/notification-setup) · [Manage Google Updates](https://developers.google.com/my-business/content/accept-or-reject-updates) · [Upload media](https://developers.google.com/my-business/content/upload-photos) · [Quota limits](https://developers.google.com/my-business/content/limits) · [Gemini and Business Profile](https://support.google.com/business/answer/17142585) · [Data access form](https://support.google.com/business/contact/dma_data_request) · [Social media links on Business Profile](https://support.google.com/business/answer/13580646)

Industry: [PPC Land on Gemini and Business Profile](https://ppc.land/gemini-now-manages-your-google-business-profile-with-a-single-tap/) · [BrightLocal on the end of Q&A](https://www.brightlocal.com/learn/google-business-profile-qa) · [Rejected review replies analysis](https://localsearchforum.com/threads/googles-review-reply-rejection-filter-what-12-752-rejected-replies-reveal.63252/) · [April 2026 review policy summary](https://www.duck-hub.com/blog/google-review-policy-update-2026) · [Birdeye pricing](https://costbench.com/software/review-management/birdeye) · [BrightLocal overview](https://www.stork.ai/en/brightlocal) · [Localo review](https://searchatlas.com/blog/localo-review/) · [AI local SEO stack comparison](https://godberrystudios.com/posts/ai-local-seo-stack-merchynt-birdeye-podium-gohighlevel-nicejob-2026/index.md)

Kabsi: repo kabsi-canvas at commit 2a5dbce; docs/KABSI-STATE.md, docs/KABSI-SPEC.md, docs/WORK-QUEUE.md, CLAUDE.md; Supabase security advisor on kabsi-prod, read only, 1 Oct 2026.
