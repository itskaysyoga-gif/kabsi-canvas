# Kabsi master plan (lane R chat, v4 of 24 Oct 2026: sections 20 to 29 added to v3.2 of 23 Oct)

Decided by the lane R chat on Rashid's authority. Session 19's PR 0 copied this file into the repo as docs/KABSI-MASTERPLAN.md with the lane R chat's addendum of 23 Oct 2026 (10:40 Beirut) merged in (sections 0, 9.8, 9.9 and 17), recorded R-55, R-56 and R-58 to R-64 in plan section 4 and added section 17's waves to plan section 7. The addendum won over the master plan wherever they differed. Where older plan text disagrees, this file wins.

Numbering note: plan section 4 already used R-55 (identity), R-56 (homepage hero) and R-57 (free Google Profile Check) on 22 Oct 2026. In this file, R-55 means the Kapso account (section 0) and R-56 and R-63 mean skills and tools (section 14); plan section 4 records those two as R-55b and R-56b so neither pair of rows is overwritten.

Addendum 2 (23 Oct 2026, 11:30 Beirut) is sections 18 and 19 below, recorded as R-65 and R-66 in plan section 4; its updated waves are at the end of section 17. Its small fixes: number alerts by email go to hello@kabsi.co only (section 9.9, R-32); the facts file's "no WhatsApp number" line changes in session 13b part 1 (section 9.8); R-55b and R-56b stay as numbered and R-58 stays reserved.

What stays fixed: Google's API and review rules (no review gating, incentives or fake reviews; owner approval before anything is published), Meta's WhatsApp rules, payment processor rules and consumer law. Breaking them gets Kabsi's Google access, WhatsApp number or payments shut off, which ends the business; everything else is open.

GitHub: the only account is itskaysyoga-gif (itskaysyoga@gmail.com, Rashid's).

Session 0 (24 Oct 2026) added sections 20 to 29 at the end of this file and the "Changed by" lines below; Ops 1 part B added section 30 the same day. Later sections win over earlier ones where they differ: 30 over 29 over 28 over 27 over everything older. Each older section that a later one replaces or changes starts with one italic line that says so and points to the new text; read the new text as current. The decisions are recorded in plan section 4 (R-68 to R-90); the session order is plan section 7.

## 0. Where things stand (23 Oct 2026)
- Built and live: sessions 7 to 16, 18, 20a, 20b, hotfix 20h and the 22 Oct sync session (R-47 to R-54 in the plan). Google reviews API open since 22 Oct; Google live on Yawmiyati; the first real reply published and verified; post removal, post Undo, the session-ended screen and the consent token fix live; places_daily_cap 20; homepage hero search and the free check flags live; Rashid Abou Hamzy named as operator, Creem as merchant of record.
- Moved from session 18 to session 19: the post Undo test on the prepared Update (tap the Update's own Approve, not "Approve the month") and P0.7-03 Pub/Sub.
- Kapso number: done (23 Oct 2026, section 9.8).
- Waiting on people: Creem test keys and the webhook secret in Supabase (session 10).
- R-55: one Kapso account under rashid.abouhamzy@yawmiyati.com for Kabsi and Alo King, hello@kabsi.co an owner of the Kabsi.co project; a deliberate exception to R-32 so one paid plan covers both businesses.

## 1. Position: Kabsi runs on WhatsApp (R-60)
*Replaced by 27.2 (position, hero, pillars). The two-touch rule and the WhatsApp-first idea stand; the hero lines, pillars and "never a review reply generator" below are not current.*
- The product is the WhatsApp agent. The two-touch rule: an owner uses the website twice, on day 1 (sign up, add Kabsi as Manager on Google, a few questions, connect WhatsApp) and when paying (Creem checkout). Everything else happens in WhatsApp: reviews, photos, posts, hours, holiday hours, listing changes, reports, QR and review link, team, billing questions.
- The dashboard stays as the place for setup, settings and history, never required for daily work.
- Kabsi is never promoted as a review reply generator. It is promoted as "your Google listing, run from WhatsApp": the work done every week, the owner replies Yes.
- Hero H1: "Run your Google listing from WhatsApp."
- Subline: "Kabsi answers every review, keeps your hours and details right, and posts every week. You just reply Yes."
- Tagline, footer and emails: "Your reviews and listing. Taken care of."
- Pillars: Every review answered / Your listing protected / Fresh every week / All from WhatsApp.
- Other approved lines: "Most owners never open an app", "Know the moment anyone changes your listing on Google, competitors included", "Set up in 10 minutes, no passwords", "Nothing goes live without your yes", "Cancel from WhatsApp any time".
- Launch waits for WhatsApp to be live.

## 2. Social channels (R-59)
Facebook https://www.facebook.com/profile.php?id=61574259448145 and Instagram https://www.instagram.com/kabsi.co in one constant (SOCIAL_LINKS): site footer, About, Organization JSON-LD sameAs, every email footer, Nora's facts, knowledge/kabsi-facts.md, llms.txt and llms-full.txt, Outbound signatures. A test fails if one is missing.

## 3. No Arabic shown (R-61)
*Changed by 27.6: still no Arabic shown until the Saudi step, then pages at /ar; the product works in Arabic and any language inside WhatsApp, voice notes included.*
Nothing in Arabic appears on the website, in marketing, ads, the public facts, llms files, guides, industry pages, screenshots or Outbound. Lebanese or Arabic examples in public copy become US examples. The product still works in Arabic where the owner or the reviewer writes it, silently. Spanish is shown where it helps US businesses.

## 4. Website and conversion
*Replaced by section 24 (the website that converts), with 27.7, 28.1 and 28.8. Nothing below is current.*
- Visual redesign from mockups the lane R chat draws (homepage, free check, pricing at 390 and 1440 px), approved by Rashid, built with the design tokens and the frontend-design skill. Phone speed 90 or more.
- Homepage: hero (H1, subline, business search box for the free check, a "Try it on WhatsApp" button once the number is live); a phone showing a WhatsApp chat with Nora (labelled Example): a review alert, "Yes", "Live on Google"; the four pillars; how it works (sign up, add Kabsi on Google, connect WhatsApp, reply Yes); industries; pricing; "Cancel from WhatsApp any time"; founder note; FAQ; final button.
- Conversion levers (all real): the free check showing the business's own gaps; the 14-day trial with no card; the founding offer (first 30 paying businesses keep their price, count shown live); a price anchor; risk reversal (cancel in WhatsApp); the first value in 10 minutes; trial reminders; retargeting once ads start.
- Click-to-WhatsApp: the hero button and Meta's Click-to-WhatsApp ads open a chat with Nora, who runs the free check inside WhatsApp and starts the trial from there.
- Free tools: the Google Profile Check (lead magnet) and the Review link and QR (search magnet). No reply writer tool.
- Add to Home Screen for the dashboard (PWA).

## 5. SEO and AI answers
*Corrected by 21.3 (HowTo is removed; no aggregateRating) and 27.8 (keywords); section 21 is the current SEO plan.*
Pages: the two tools, industry pages (6 to 10, US examples), guides (reply to a bad review, holiday hours, add a manager, more reviews within Google's rules). Structured data: Organization with sameAs, SoftwareApplication with prices, FAQPage, HowTo. knowledge/kabsi-facts.md stays the single truth; llms files rebuilt from it; every page states what Kabsi is, who it is for, the prices, that it runs on WhatsApp and that it is independent of Google.

## 6. Funnel gates (30 days after launch)
*Added to by 27.13 (more gates), 26.5 and 28.5 (time to the first map). The free check is now the Free Visibility Scan (27.7).*
Visit or ad, free check, sign-up, Manager access, WhatsApp connected, first Yes, paid. Gates: free check to sign-up 5 percent; sign-up to Manager access 40 percent; access to WhatsApp connected 80 percent; first Yes within 10 minutes 70 percent; trial to paid 20 percent. A miss gets one fix session; a second miss changes the step.

## 7. Dashboard (smaller job)
Setup, settings and history only. Home is one list "Waiting for you" (the same items WhatsApp sends) and "Done this week"; four tabs (Home, Reviews, Profile, Reports); account menu for WhatsApp, Team, Plan, Settings. No button acts on several things without saying how many; none shows when there is nothing to act on. Usability gate: Rashid and the Abou Hamze owner each finish approve, keep, post and find the report without help in under 2 minutes in total. One session, after WhatsApp.

## 8. AI brain and agents
*Changed by 28.6: six agents (Reply, Guard, Growth, Insights, Scout, Nora) and the model rules; the 200-case evaluation is cut to 50 cases plus every safety, injection and contradiction case (27.9).*
Business Knowledge is the only source for drafts. Agents: Reply, Guard, Growth, Insights, Nora (the WhatsApp agent's voice). Nothing publishes without the owner's yes. Before 17 Nov (promotional credit): fix N-004, run the 200-case reply evaluation and Nora's 60 questions live, add Spanish cases, add the WhatsApp conversation suite. Style learning from edits stays on.

## 9. WhatsApp agent and Kapso (R-62)
### Account
One Kapso account (R-55), project Kabsi.co, one US number. Kapso Free (1 number, 2,000 messages a month) until launch, then Kapso Pro (25 US dollars, 3 numbers) before launch for the standby number and the volume (section 9.8); the second number is a warm standby. Build sessions never use the Kapso connector for Kabsi.

### 9.1 How a message is handled
1. The webhook verifies Kapso's signature, stores the message once (by WhatsApp message id; a repeat is ignored), answers at once; work goes to the job queue.
2. Button taps resolve by the task id inside the button, with no AI call: Approve, Edit, Skip, Keep, Put it back, Undo, Confirm, a business from a list.
3. Everything else goes to the intent router (Claude with tools): it reads the owner, their businesses and roles, the conversation state and the open tasks, and calls one tool (edit draft, set exact reply, post from photo or text, hours change, holiday answer, stats, QR or link, billing link, switch business, help, hand off). Anything that will appear on Google is shown back for a Yes first.
4. One sender with rate limits, retries and the 24-hour window check (inside: free-form; outside: an approved utility template).

### 9.2 One number for every subscriber, worldwide
- Identity is the sender's phone, bound to a Kabsi user only by the one-time code from setup (prefilled wa.me message or a QR on the setup screen). A changed phone needs a new code. Removing a manager stops their phone at once.
- Each phone has one conversation state: active business, open question, language, time zone, last task, window expiry.
- Several businesses: every message is headed with the business name; a request without a business asks "Which business?" as a list and remembers it; "switch" changes it.
- Roles: owner (everything), manager (as the business's approval rules allow), staff (photos and news; the owner approves). Billing only for the owner.
- A phone that is not a customer meets Nora as Kabsi's assistant: free check, trial, questions. No business data is ever shown to a phone not bound to that business; tests prove it.
- Language: Nora answers in the language the owner writes; review replies in the reviewer's language; time zone and holidays follow the business's country.

### 9.3 Owner actions in WhatsApp
Reviews: approve, 10-second server-side undo, edit with an instruction, set exact text, skip, rating-only reviews, other languages (draft in that language, translation shown), reviews that need care ("needs care" label and a second Confirm), the fake review helper (never promises removal), duplicate taps ignored.
Content: a photo with or without a note becomes a post draft; several photos become one post; offers and events become drafts with dates; scheduling; change or cancel a draft; videos kept but not posted.
Hours: early close today, closed tomorrow, date ranges, permanent changes (confirm), holiday answers, unclear times (one question back), impossible times caught, midnight and time zones handled.
Listing: changes on Google with Keep or Put it back (owner's tap only; where Kabsi cannot undo a field, Nora gives the steps in Google).
Reports and assets: "stats" (7 days), "this month", weekly digest on Monday, "QR" (printable card image), "review link".
Team: pair a manager or staff phone, roles enforced, removal immediate.
Billing: reminders, "upgrade", "add a location", "my card changed", "invoice", "cancel" (each answered with the right Creem link at once).
Other: "talk to a person" (Kapso team inbox, answer within one business day), forwarded customer messages (advice only), STOP and START, voice notes (transcribed once on Kapso Pro; until then "Please type it for now"), unclear messages (one short question), abuse (one notice, then no reply).
Not offered: competitor rankings, duplicate listing detection, removing reviews, review gating. *Changed by 27.3: competitor rankings are now offered (Visibility Map, Competitor Watch); the rest stands.*

### 9.4 Messages Kabsi starts
Review alert, post ready, listing change, holiday question, photo received, weekly digest (Monday 08:00 local), trial and billing, the free check result (opt-in, once), access lost on Google. Utility templates only outside the window; no marketing templates to owners.

### 9.5 Keeping the number safe
- Only owners who connected their phone get messages; no cold WhatsApp messages, ever. Prospects come in through Click-to-WhatsApp ads, the site button and Outbound replies.
- STOP works at once in every language; one tap pauses alerts.
- At most 6 business-started messages per owner per day; events within 15 minutes batched; quiet hours 21:00 to 08:00 local except identity-field changes.
- Templates match their category, plain wording, no shortened or tracking links.
- Number health and quality rating read every hour; a drop to Medium cuts to digests only and alerts staff; a block rate above 2 percent in a day alerts staff.
- Meta business verification: do it when business-started conversations reach about 150 a day (section 9), or earlier if the username or a higher tier is needed. The lane R chat prepares the documents question then. An unverified business may start 250 business-started conversations a day.
- One queue, at most 20 messages a second at first, retries with backoff, no bursts of identical messages.

### 9.6 Scale and failure
The queue and idempotency let one number serve thousands of owners; nothing sent twice or lost. The standby number has templates approved; if the main number is restricted, one setting switches it and every owner gets an email with a one-tap "message us here" link. Kapso Pro covers 100,000 messages a month; Meta's per-template fees are tracked per business on the staff page.

### 9.7 Test suite (gate for go-live)
At least 100 scripted conversations covering 9.2 to 9.5 (Gemini's 80 corrected as in 9.3, plus role, privacy, rate-limit and failure cases), in English, Spanish and Arabic, one business and several, owner, manager, staff and an unknown phone. All pass in CI; a live pass on Kabsi's own test phones before any customer.

### 9.8 Kabsi's number
- The "waiting on a Kapso number" item in section 0 is done.
- Number +1 205-745-6874, connected, Kapso health check Passed (23 Oct, 10:17 Beirut). Display name "Kabsi" waiting for Meta's approval. Business unverified, so 250 business-started conversations a day; conversations the owner starts do not count against that.
- Kapso project Kabsi.co (d2ead89f-dedc-4902-967d-0f9586a8c1ef). Phone number ID 1310486382156171. WhatsApp account ID 1761713808421294. Business portfolio ID 1756516714947073. Kapso config ID fea82e46-b309-4ee8-a579-a7c52d68d670. Meta app: Kapso managed. Meta message fees paid from Kapso credits (8.01 US dollars on 23 Oct). Kapso free plan: 1 number, 2,000 messages a month; upgrade to Kapso Pro before launch (standby number and volume).
- Supabase secrets set by Rashid on 23 Oct: KAPSO_API_KEY (new project key), KAPSO_PHONE_NUMBER_ID, KAPSO_CONFIG_ID.
- The staff phone is bound by a one-time staff code in session 13b; no personal phone number is written in the repo.
- WhatsApp profile, live 23 Oct: photo the Kabsi mark; about "Your Google listing, run from WhatsApp."; email hello@kabsi.co; address 451 Harwinton Ave, Torrington, CT 06790; vertical Professional services; website https://kabsi.co; description "Kabsi runs your Google listing from WhatsApp. Replies to every review, keeps your hours and details right, and posts every week. Nothing goes live without your yes." Calls off. Inbound messages on. Shared with other apps off.
- Username "kabsi": blocked until Meta business verification (a higher messaging tier). Claim it right after verification.
- Meta business verification: do it when business-started conversations reach about 150 a day (section 9), or earlier if the username or a higher tier is needed. The lane R chat prepares the documents question then.
- Meta WhatsApp account time zone stays as created (US/Alaska); it cannot be changed and only affects Meta's own reports. Kabsi's code uses each business's time zone and Beirut for staff.
- Session 13b part 1 also changes the line in `knowledge/kabsi-facts.md` that says Kabsi has no WhatsApp number, because from then on owners can use the number.
- Session 13b: register the webhook (Kapso, phone number, Webhooks) to the Supabase whatsapp function with its own secret saved as KAPSO_WEBHOOK_SECRET; submit the utility templates through Kapso's API; set WHATSAPP_NUMBER; read number health through the API; confirm no Kapso automation or Kapso Agent auto-reply is switched on for the number, so only Kabsi's own code answers.

### 9.9 Staff alerts on WhatsApp (R-64)
- Slack is retired for Kabsi. On 23 Oct the lane R chat switched off the three Slack cron jobs (kabsi_slack_flush id 12, kabsi_slack_digest id 14, kabsi_slack_sentry id 16), so nothing posts to Slack. Only supabase/functions/slack/index.ts mentions Slack in the functions.
- Session 13b part 2 deletes: the slack Edge Function and its folder, the three cron jobs (cron.unschedule), the slack paths in ops_emit, ops_digest and staff_system_health, the SLACK_BOT_TOKEN and SLACK_SIGNING_SECRET secrets, and every Slack mention in docs and knowledge/kabsi-facts.md. public.ops_events stays as the alert queue and the new WhatsApp sender reads it. Rashid may delete the Kabsi app from his Slack workspace at any time.
- Staff alerts go to Rashid's phone from Kabsi's own number:
  - urgent, at once: jobs failing above the normal rate, Google errors or access lost on any business, the Creem webhook failing, the publication pipeline stuck, a new paying customer, a cancellation, an owner asking for a person;
  - daily at 08:00 Beirut: one summary (new sign-ups, trials, paid, reviews answered, items waiting, AI cost, Kapso credit balance, number quality).
- Anything about the WhatsApp number itself (quality drop, restriction, template rejected, low Kapso credit) goes by email to hello@kabsi.co only (R-32: no personal address), because the number may be the thing that is failing.
- Staff commands from Rashid's phone: "status" (system health), "waiting" (handoffs and stuck items), "today" (the daily numbers), "pause <business>" (stop sends for one business). Only phones with staff_admin can use them.
- Owner handoffs ("talk to a person") land in the Kapso team inbox; Rashid answers there, from the Kabsi number, so the owner sees one conversation.
- Sentry and UptimeRobot alerts go to email; the urgent ones are also forwarded to the staff WhatsApp alert.
- Until 13b part 2 ships, staff alerts reach Rashid by Sentry and UptimeRobot email only.
- Staff alerts count toward the daily cap like any other message and use one utility template outside the 24-hour window.

## 10. Plans and payments (Creem)
*Plan contents replaced by 27.4 (the old 10.2.1). The trial now starts when Google access is granted (google_access_granted), not at sign-up (25.1, the old 10.2.2); a sign-up that never connects gets the onboarding nudges, not trial reminders. Partner referrals get a 30-day Pro trial (29.1). Prices are unchanged.*
Prices: Essentials 19 a month or 190 a year; Pro 39 or 390; extra location 15 or 150. 14-day Pro trial, no card, starting when Google access works. Founding offer: the first 30 paying businesses keep their price while subscribed. Creem is merchant of record.
Before session 10, typed only into Supabase secrets, never into a chat: CREEM_API_KEY (test mode) and CREEM_WEBHOOK_SECRET. Hussein adds the webhook in Creem (Developers, Webhooks) pointing at https://ynjdqjlmdwjgbfezevxy.supabase.co/functions/v1/billing-creem and copies its signing secret; session 10 builds the function under exactly that name. It verifies Creem's signature on every call, refuses anything unsigned or stale, stores each event id once, and is the only writer of paid state.
WhatsApp and email: day 11 "Choose your plan" with a Creem checkout button for that business; day 13 reminder; day 14 approvals pause, nothing lost; failed payment: "Your card did not go through. Update it here" (portal), reminders day 3 and day 6 of the 7-day grace; after grace paused, data kept 30 days; yearly renewal reminder 7 days before; card updated confirmation; "invoice" and "cancel" answered with the Creem portal at once.

## 11. Industries
*Changed by 27.5 (lead markets are the UAE and the UK, US examples no longer the default) and 27.9 (new industry pages paused until Web 2). The launch set below stays as the list of trades.*
Launch set with US examples, page, reply tone, post ideas, photo and attribute checklists: restaurants, cafes, salons and barbers, auto repair, dentists and clinics (never confirm someone is a patient), hotels. After launch: service-area trades, gyms, retail, professional services.

## 12. Onboarding (10 minutes)
*Changed by 28.5: it ends with the owner's own first map, then the first review alert; the trial clock starts when Google access works (25.1).*
Profile Check or Click-to-WhatsApp, sign-up, add Kabsi as Manager (guide with live status, "send to my manager"), five questions, connect WhatsApp (QR on desktop, one tap on a phone), the first review alert arrives in WhatsApp before the owner closes the page. Measure time to first Yes.

## 13. Kabsi Outbound with Harvey (after the launch gate)
*Changed by 27.9: it starts right after the launch gate, targets the UAE and the UK first and then the US, and Email 1 offers the Free Visibility Scan instead of the Profile Check. Partner invitations by Outbound: 29.6, which also replaces the partner lines here.*
Private repo itskaysyoga-gif/kabsi-outbound imported from github.com/ethanplusai/harvey at that time; a daily scheduled run in claude.ai/code; drafts approved on Rashid's phone in /staff/outbound; sender "Nora at Kabsi", signature "Nora, Kabsi's AI assistant. Rashid Abou Hamzy, founder, reads every reply."; footer: Kabsi, 451 Harwinton Ave, Torrington, CT 06790 and "Reply 'no thanks' and we will not write again"; a separate sending domain on Zoho Mail Lite with SPF, DKIM and DMARC and two weeks of warm-up; OpenStreetMap and the business's own website only; Email 1 plain text, under 80 words, no link, one real detail, "Want me to run a free check of <business>'s Google profile and send you what I find?"; a yes gets the check result, the founding offer and the WhatsApp button within minutes; one follow-up on day 4; US, auto repair, salons and barbers, cafes and restaurants first; 20 a day for two weeks then 30, hard stop at 300; kill-gate fewer than 3 replies that lead to a check or trial.

## 14. Skills and tools (R-56, R-63)
Committed to .claude/skills: kabsi-build-session and kabsi-reply-lab (from kabsi-skills.zip, with the R-41 and R-43 to R-46 edits), kabsi-outreach renamed kabsi-outbound with section 13, a new kabsi-copy (plain English for owners, the approved lines in section 1, no Arabic shown, no dashes or exclamation marks, K-112), Anthropic's frontend-design, supabase/agent-skills, Kapso's agent skills. context7 on trial in .mcp.json. Not used: obra/superpowers, scroll-craft, open-seo, VoiceStudio; hyperframes only for ad videos later.

## 15. Before launch, do not forget
*Added to by 27.14 (the launch gate checks every line there). The AI cost alert of 3 US dollars is now 15 percent of the plan price (27.4).*
Nora first for support, then the Kapso team inbox and hello@kabsi.co; self-serve cancel, export and deletion; status page (UptimeRobot on hello@kabsi.co); Supabase Pro with a restore test; Vercel Pro; AI cost per business on the staff page with an alert above 3 US dollars a month; a draft within 5 minutes of a new review; the four auth email templates pasted again; the Resend webhook and news domain; delete turnstile-diag; Calendly; the lawyer's read; one phone pass.

## 16. Founding customers and growth order
*Replaced by 27.5 (markets: the UAE and the UK lead, Lebanon is only the proof pilot) and 29 (Kabsi Partners through Kabsi's own ledger, not Creem's affiliate program).*
Abou Hamze Auto Center first (live pilot, in English), then Outbound to US businesses, Click-to-WhatsApp ads once trial to paid is proven, then Kabsi Partners.

## 17. Session order from Sunday 25 Oct, with parallel sessions (addendum C of 23 Oct 2026)
*Replaced by 27.11, with the gate of 28.4 and the sessions of 29.8; the current order is plan section 7. The parallel rules below still apply.*
Parallel rules: at most 2 Opus sessions at once (Max plan usage), plus Sonnet sessions. Two sessions never touch the same area at the same time. Every session merges main into its branch (merge commit, never rebase) and runs the checks again right before its own merge. Each session writes only its own heading in docs/KABSI-PROGRESS.md. Migrations get a timestamp in the file name, so parallel ones do not clash. AI calls for evaluations come out of the promotional credit; each session reports what it spent.

- Wave 1, alone: Session 19 PR 0. The master plan, this addendum, R-55, R-56, R-58 to R-64, the social links rule, no Arabic shown, the skills (kabsi-skills.zip plus the new ones), .mcp.json with context7. Docs and skills only, merged first so every later session reads the same plan.
- Wave 2, in parallel after PR 0 merges:
  - Session 19 rest (Opus): P0.7-05b with the post Undo test (tap the Update's own Approve, not "Approve the month"), P0.7-03 Pub/Sub, N-004, the full live evaluations (200 cases plus Nora 60). Area: Google functions, content and the AI prompts.
  - Session 13b part 1 (Opus): the WhatsApp agent with section 9 and addendum A, webhook, router, phone binding, templates, the 100-conversation suite. Area: the whatsapp function and its tables.
  - Lane R chat: Web 1 mockups in the Design type for Rashid to approve.
- Wave 3:
  - Session 10 Creem (Opus) as soon as CREEM_API_KEY and CREEM_WEBHOOK_SECRET are in Supabase. Area: billing-creem, prices, checkout, the pricing page.
  - Web 1 (Sonnet) after the mockups are approved. Area: public pages; it leaves the pricing page to session 10 and takes it over after session 10 merges.
  - Session 13b part 2 (Opus) after part 1 and session 19 rest: staff alerts on WhatsApp (addendum B), Slack removal, the payment reminders once Creem is in.
- Wave 4: UX 1 (Sonnet), then session 20c audit, then session 21 launch gate, then Outbound.

### Updated waves (addendum 2 of 23 Oct 2026, adds to section 17)
- Wave 2 (in parallel): Session 19 rest (Opus) also builds 18.2's detection. Session 13b part 1 (Opus) also builds 18.2's owner message and 18.3's tests.
- Wave 3 (in parallel): Session 10 Creem (Opus) with 18.7; Web 1 (Sonnet); Ops 1 part B (Sonnet: backups, restore drill, scrubbing, the privacy page items); Session 13b part 2 (Opus) after its part 1.

## 18. Gemini review of 23 Oct (R-65)
1. Google Q&A monitoring: not built. Google discontinued the Q&A API on 3 Nov 2025 and is replacing Q&A on profiles with AI answers. Kabsi never offers or mentions Q&A.
2. Suspension and verification alert: built.
   - Session 19 rest: read VoiceOfMerchantState in the daily profile job and on every Pub/Sub notification for the location. hasVoiceOfMerchant false, a complyWithGuidelines action or a verify action marks the business "Google needs action": publishing pauses for that business, a task is created and an ops event is written.
   - Session 13b part 1: the owner gets a WhatsApp message at once (allowed in quiet hours, like identity-field changes): what Google is asking, plain steps, and the link to Google's own help page for that case (the session checks the current page on support.google.com; no guessed links). Staff alert at the same time. Kabsi never files an appeal for the owner and never promises reinstatement. Publishing resumes by itself when Google clears the state.
   - Test cases in the 13b suite: suspended, verification required, cleared again.
3. iPhone photos: already handled in code (above). Session 13b adds tests for the WhatsApp paths: a photo sent as an image (arrives as JPEG) and photos sent as documents (HEIC, PNG, WebP), each ending as a clean JPEG that meets Google's current photo rules, and an unreadable file answered with "Please send it as a photo".
4. Outbound website reading: plain fetch first; Jina Reader as the fallback when a page needs JavaScript. Only the home and contact pages, robots.txt respected. Firecrawl not used. Decided again when Outbound starts.
5. Langfuse or Helicone: not used. ai_usage and ai_runs already give tokens and cost per business, and sending prompts that contain customers' reviews to another company adds a processor for no gain. The staff page shows AI cost per business from ai_usage with the 3 US dollar alert (section 15).
6. An image-processing skill: not needed; the code and its tests cover it.
7. Billing skill: session 10 first reads Creem's current webhook and API docs (docs.creem.io, with context7 where it has them), builds the signature check from Creem's own example with tests, and only then writes .claude/skills/kabsi-billing with the verified facts and the doc links. No Stripe code or Stripe header names.

## 19. Keeping Kabsi running, safe and backed up (R-66)
Built by session Ops 1 (Sonnet), part A on 23 Oct and part B in wave 3. Its area is .github, docs and scripts only, so it touches nothing the other sessions change.

### 19.1 Backups and restores
- Supabase Pro before the first paying customer (daily backups, 7 days kept).
- *Changed by Ops 1 part B (24 Oct 2026): backups are encrypted with a passphrase (age, scrypt mode), stored as the GitHub secret BACKUP_PASSPHRASE, which Rashid types and keeps in his password manager and on paper. No key lives in the repo. Files: .github/workflows/backup.yml and restore-drill.yml, scripts/backup/.*
- Weekly database dump by a GitHub Action (pg_dump through the GitHub secret SUPABASE_DB_URL), encrypted with age in passphrase mode (BACKUP_PASSPHRASE), stored in the private Cloudflare R2 bucket kabsi-backups, 8 weeks kept. Storage photos copied weekly to the same bucket, encrypted the same way.
- Weekly git bundle of kabsi-canvas (and kabsi-outbound later) to the same bucket, because Kabsi has one GitHub account and an earlier account was banned. The bundle is encrypted the same way.
- A restore drill once a month: the newest dump is decrypted into a scratch Postgres in the runner and its row counts checked, the newest bundle is cloned, and the result is written where the daily staff summary reads it (app_settings backup_drill plus an ops event). Gate: no paying customer before one drill passes.

### 19.2 No single point of failure
- Google access: owners add only the Kabsi group (KABSI_GROUP_ID). The group gets a second Kabsi-owned Google account as a member, both with 2-step verification, so losing one account does not cut off every business.
- WhatsApp: the standby number on Kapso Pro (section 9.6). The sender sits behind one interface, so moving from Kapso to Meta's Cloud API directly is one module. Alert when Kapso credit falls under 5 US dollars.
- AI: model names live in one place (models.ts); a retired model is a one-line change. When the AI provider is down, drafts wait in the queue and nothing wrong is sent.
- Domain kabsi.co: auto-renew on, registrar lock on, 2-step verification on the registrar.
- Vercel Pro before payments (section 15).

### 19.3 Things that keep working
- Skills are copied into the repo, so they never change underneath a session. context7 is optional; nothing depends on it.
- Package versions stay pinned (lockfile, exact versions in npm: imports). Dependabot security updates on, with .github/dependabot.yml; updates merge only on green CI.
- Changed by 25.1: commit package-lock.json; CI and Vercel use npm ci; Dependabot reads the lockfile. GitHub Actions are pinned to full commit SHAs, kept current by Dependabot (Ops 1 part B).
- The Supabase security and performance advisors run weekly; a new security finding goes to the staff alert.

### 19.4 Secrets
- docs/SECRETS.md lists every secret by name, where it lives, who rotates it and when it was last rotated. Never a value.
- Rotate the main keys (Anthropic, Kapso, Creem, Resend, Google, cron secret) every 90 days and at once after any leak.
- gitleaks in CI and GitHub secret scanning with push protection on.
- Sentry and PostHog drop phone numbers, emails and review text before sending.

### 19.5 Rules Kabsi follows (built in, not optional)
- Privacy policy and terms list every company that handles customer data: Anthropic, Supabase, Vercel, Cloudflare, Kapso and Meta, Creem, Resend, PostHog, Sentry, Google.
- Google API Services User Data Policy, including the Limited Use statement on the privacy page.
- Self-serve data export and deletion (section 15).
- WhatsApp opt-in stored with time and source for every phone.
- Outbound emails: true sender (Nora disclosed as Kabsi's AI assistant), the postal address, a working opt-out honoured at once.
- Cookie consent for visitors from the EU and UK before PostHog loads. *Changed by 20.4: the EU, the UK and Switzerland, one small bar; PostHog is cookieless until consent everywhere.*
- The lawyer's read before launch (section 15).

### 19.6 Rashid's own list (once, before launch)
- 2-step verification with an authenticator app on GitHub, Supabase, Vercel, Cloudflare, Kapso, Meta, Google (both Kabsi accounts), Anthropic, Resend, PostHog, Sentry and the domain registrar; Hussein the same on Creem.
- Recovery codes printed and kept offline.
- Create the second Kabsi Google account and add it to the group.
- Create the R2 bucket and an R2 token for the backup Action, typed only into GitHub secrets (Ops 1 gives the exact names).

**Sections 20 to 23 were decided on 23 Oct 2026.**

Repo facts checked on 23 Oct: PostHog runs through the /ingest proxy with consent (src/lib/telemetry.ts, src/lib/consent.ts) and about 16 client events; product_events sends server events; no Meta Pixel or Conversions API; public/sitemap.xml is hand-written with hand-set dates (24 URLs); robots.txt allows Googlebot, OAI-SearchBot, ChatGPT-User and PerplexityBot. Search Console (Rashid's export of 23 Oct, data to 16 Oct): 4 pages indexed; 21 "Discovered, currently not indexed", none of them ever crawled, including old URLs Google still knows (/lebanon, /for/cafes-and-bakeries, /for/clinics-and-dentists, /for/florists, /for/garages-and-auto-repair, /for/hotels-and-guesthouses, /for/salons-and-barbers, /for/shops-and-boutiques). This is Google not spending crawl time on a new domain with few links, not a fault in the pages.

## 20. Measurement, funnels and pixels
Built by Growth 1 (Sonnet). Its area: src/lib/telemetry.ts, src/lib/consent*, a new _shared/meta-capi.ts, the product_events sender, docs/EVENTS.md.

### 20.1 One list of events
docs/EVENTS.md is the only list: name, when it fires, where (browser or server), properties. Properties are ids, plan, country, source and channel only; never review text, names, emails or phone numbers.
- Browser: landing_viewed, pricing_viewed, free_scan_started, free_scan_completed, review_link_created, whatsapp_button_clicked, signup_started.
- Server (the truth for money and state): signup_completed, google_access_granted, whatsapp_connected, first_alert_sent, first_yes, trial_started, checkout_started, paid, plan_changed, payment_failed, cancel_scheduled, churned.
- Existing events are kept under their names where they match, renamed in one place where they do not.

### 20.2 Funnels and dashboards in PostHog
- The funnel of section 6: visit or ad, free scan, sign-up, Google access, WhatsApp connected, first Yes, paid. The gates in section 6 stay.
- Four dashboards: Acquisition (source, UTM, landing page), Activation (time to first Yes, the onboarding step where people stop), Revenue (trial to paid, MRR from Creem events, founding places left), Retention (owners with a Yes each week, cancellations and why).
- The Monday staff WhatsApp summary carries the week's funnel numbers.

### 20.3 Attribution
- At sign-up the server stores first touch and last touch: utm_source, utm_medium, utm_campaign, utm_content, referrer, landing page, gclid, fbclid, and ctwa_clid when the owner came from a Click-to-WhatsApp ad (from the Kapso webhook's referral data). Carried from the landing page in sessionStorage, no cookie.
- Every ad, Outbound email and social post link uses UTM tags from one table in docs/EVENTS.md.

### 20.4 Meta and consent
- Meta Pixel on public pages only (never /app, /start, /staff, /login, token pages).
- Visitors outside the EU, UK and Switzerland see no pop-up. PostHog runs cookieless until consent everywhere. The Meta Pixel runs, and the footer carries "Your privacy choices", which opens a one-line panel with one switch: "Let Kabsi measure its ads" on or off (the US "do not sell or share" choice).
- Visitors in the EU, UK and Switzerland (from api.geo) see one small bar at the bottom, not a pop-up: "Can we use cookies to see which pages help and to measure our ads?" Buttons "Yes" and "No thanks", a "Details" link to /privacy. No category lists, no vendor wall. Until a yes, nothing that needs consent loads. The answer is remembered for 12 months and can be changed from "Your privacy choices".
- Pixel events: PageView, ViewContent (pricing), Lead (free scan completed), CompleteRegistration (sign-up), StartTrial, Subscribe (paid). StartTrial and Subscribe are sent from the server through the Conversions API, deduplicated with the browser by event_id; email and phone hashed as Meta requires.
- Conversions API for Business Messaging: when an owner who came from a Click-to-WhatsApp ad signs up or pays, Kabsi sends the event with that chat's ctwa_clid, so the ads learn from paying owners, not from chats.
- Rashid's manual step (Growth 1 gives exact clicks): in Meta Events Manager, under the Kabsi.co business portfolio, create one dataset (pixel) for kabsi.co, connect the WhatsApp account, and make a Conversions API token. Supabase secrets META_PIXEL_ID and META_CAPI_TOKEN; Vercel env VITE_META_PIXEL_ID.

### 20.5 Google and others
- No Google Analytics: PostHog is the one analytics tool.
- Google Ads tag and enhanced conversions only when Google Ads start, after the launch gate.
- Vercel Speed Insights for real-user Core Web Vitals (no cookies).
- No Microsoft Clarity or Hotjar: PostHog session replay covers it, on public pages only.
- Sentry and PostHog drop phone numbers, emails and review text before sending, with tests.

## 21. Search and AI answers
Built by SEO 1 (Sonnet, after Web 2). Its area: the sitemap and robots build, page metadata and structured data, public/llms files, new guide, industry and comparison pages.

### 21.1 Technical
- The sitemap is generated at build from the route list and the content files. lastmod is the real last change of that page's content (from git), never a hand date. No priority or changefreq. Only indexable, canonical, 200 pages.
- Old URLs answer at the server, not in the browser: /lebanon 301 to /pricing; /for/cafes-and-bakeries, /for/clinics-and-dentists, /for/salons-and-barbers, /for/garages-and-auto-repair 301 to their new pages (auto repair to /for/auto-repair); /for/hotels-and-guesthouses 301 to /for/hotels once that page exists; /for/florists and /for/shops-and-boutiques 410. Checked with a plain HTTP request.
- Every indexable page: a unique title of 60 characters or fewer, a description of 155 or fewer written as the snippet a searcher should see, a self canonical on https://kabsi.co, one H1, its main text in the server-rendered HTML (checked without JavaScript in CI), breadcrumbs, its own OG image, links to it from the home page, the footer or a hub page.
- Robots meta on every indexable page: index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1.
- No AMP: no ranking advantage; one fast page per URL is better.
- Open Graph and Twitter cards on every page with a designed 1200 by 630 image per page type, each under 250 KB (WhatsApp drops the preview above about 300 KB). The WhatsApp link preview is tested on a real phone for the home page, pricing and the two tools.
- robots.txt allows Googlebot, Bingbot, OAI-SearchBot, ChatGPT-User, GPTBot, PerplexityBot, ClaudeBot, Claude-SearchBot, Claude-User, Applebot and Google-Extended, with the same private paths blocked as today.
- IndexNow ping to Bing on each deploy that changes public pages.
- llms.txt and llms-full.txt stay, rebuilt from the facts; nothing depends on them.
- After SEO 1 merges it checks Search Console: Pages, Sitemaps, Enhancements (Product snippets, Breadcrumbs), Core Web Vitals and HTTPS, and reports anything not green.

### 21.2 Getting crawled
- The cure is links and signals, not resubmitting: the home page links every hub (tools, guides, industries, compare) and each hub links its pages; every guide links two related guides and one tool; the footer links the tools and hubs.
- Links from outside, real only: the Facebook and Instagram pages link the home page and the two tools; free listings on G2, Capterra, Product Hunt and Crunchbase; Bing Webmaster Tools.
- Rashid, after Web 2 and SEO 1 merge: resubmit the sitemap; URL inspection, Request indexing for the home page, pricing, the two tools and the top 6 guides (about 10 a day); Bing Webmaster Tools: import kabsi.co from Search Console and submit the sitemap.
- Optional: a Google Ads account with no spend, only for Keyword Planner volumes.

### 21.3 Structured data (corrects section 5)
- Organization (name, logo, sameAs Facebook and Instagram, contact email), WebSite, SoftwareApplication with the prices as Offers, BreadcrumbList on every page, Article on guides (author Rashid Abou Hamzy, founder; published and updated dates).
- SoftwareApplication shows zero errors in Search Console and the Rich Results Test. No aggregateRating or review markup until real reviews of Kabsi exist on the page. Product markup only on offer pages (clears Merchant listings warnings).
- FAQPage only where the questions are visible on the page.
- HowTo is removed: Google retired HowTo rich results in 2023.

### 21.4 Keywords: replaced by 27.8.

### 21.5 Being the answer in AI search
- Every page starts with two plain sentences saying what the page answers, then the details.
- The same one-line description everywhere, from the facts; independent of Google, said on every page.
- The facts files stay the single truth for prices and facts.
- Off-site, real only: Facebook and Instagram, free listings on G2, Capterra, Product Hunt and Crunchbase, the founder's posts; reviews of Kabsi only from real customers who choose to write them. The free tools are the link magnets.
- SEO 1 adds a weekly read-only Search Console pull (a service account added as a restricted user) into the Monday staff summary.

## 22. One design system for every screen
- The lane R chat draws the Kabsi design system in the Design System type from the existing tokens (K-108): colour, type, spacing, radius, shadows, buttons, inputs, cards, lists, the WhatsApp chat bubble, the map grid, badges, empty states, the email layout. Then mockups at 390 and 1440 px: homepage, free scan, pricing; one template each for tool, guide, industry, comparison and legal pages; and the app screens (onboarding steps, Home "Waiting for you", Visibility, Reviews, Profile, Reports, Settings, WhatsApp connect, Team, Plan, notification settings). Rashid approves them.
- Web 2 rebuilds every public route on the same shared layout and components, with no page-specific styling: home, how-it-works, pricing, partners, the free scan, google-review-link, faq, about, security, privacy and terms, guides index and pages, for index and pages, get-started, manager-steps, login, unsubscribe, the public review page, the token pages (a, h, u, activate). setup-call becomes "Talk to us on WhatsApp" with the button and a short form for people without WhatsApp.
- UX 1 brings /start (onboarding), /app, settings, notifications and /staff onto the same system, and the email layout onto the same tokens.
- CI takes screenshots of every route at 390 and 1440 px and fails on a page that does not use the shared layout.

## 23. Coverage check: every part, who builds it
*Changed by 30.1: the Growth row's partner line now points to section 29 (Kabsi's own ledger, Creem's affiliate program off).*
| Part | What must exist | Session |
| --- | --- | --- |
| AI brain | Business Knowledge as the only source; Reply, Guard, Growth, Insights agents; style learning from edits; evaluations passing; cost per business with the 15 percent alert (27.4); drafts wait safely when the AI provider is down | 19 rest, UX 1 |
| Nora | One voice in WhatsApp, on the site and in Outbound; sales answers for unknown phones (free scan, trial, prices); support first, then a person | 19 rest, 13b |
| WhatsApp agent | 9.1 to 9.9, 18.2, 18.3, 25.5, the 100-conversation suite, live test | 13b part 1 and 2 |
| Visibility, AI answers, competitors, reviews, report | Section 27.3 | V1 to V4 |
| Automations | Review alerts within 5 minutes, weekly Results Report, holiday questions, post drafts, listing watch, scans on schedule, trial reminders, dunning, onboarding nudges, data retention | 19 rest, 13b, 10, V1 to V4 |
| Payments | Section 10 (Creem), test mode until the launch gate | 10, 21 |
| Onboarding | Section 12: 10 minutes, Manager guide with live status, five questions, keyword confirm, WhatsApp connect, first alert before the page closes | UX 1, 13b, Growth 1 |
| Dashboard | Home "Waiting for you" and "Done this week", Visibility, Reviews, Profile, Reports, Kabsi activity | UX 1 |
| Settings | Business details, keywords and competitors, approval rules for managers, team and phones, notifications, plan, data export and deletion | UX 1, 10, Ops 1 B |
| Notifications | WhatsApp first, email second with the shared layout, digests to keep message counts low | 13b, UX 1 |
| Operations | Staff alerts and daily summary on WhatsApp, staff commands, Kapso inbox handoff, status page, backups and restore drill, docs/RUNBOOK.md | 13b part 2, Ops 1 B |
| Security and law | Section 19, 25.7 | Ops 1 A and B, Sec 1 |
| Measurement | Section 20 | Growth 1 |
| Search and AI answers | Sections 21 and 27.8 | SEO 1 |
| Design | Sections 22 and 24 | lane R, Web 2, UX 1 |
| Growth | Founding offer counter, Outbound after launch (27.9), Click-to-WhatsApp ads once trial to paid is proven, Kabsi Partners through Kabsi's own ledger (section 29, Creem's affiliate program off), Front Desk pilot | Web 2, PA1 to PA3, later |
| Quality | Page-by-page audit; launch gate with sections 15 and 27.14 | 20c, 21 |

## 24. The website that converts (23 Oct 2026; position, free tool and keywords changed by 27)
*Replaces section 4. Changed by 27.2, 27.7, 27.8, 28.1 and 28.8; the look, the budgets and the guards stay.*

### 24.1 What a visitor must understand in 5 seconds
1. What Kabsi is (27.2).
2. What it does for them: where they show up on Google Maps and in AI answers against competitors, more reviews the right way, the listing kept right and posts done.
3. What they do: reply Yes in WhatsApp. Nothing goes live without their yes.
4. What it costs: free for 14 days, no card; then from 19 dollars a month; cancel in WhatsApp.

### 24.2 Look and feel: alive, current, not a template
- Built from the design system (section 22). Bold type, the Kabsi yellow with deep ink, soft depth and glass where it helps, generous space, rounded shapes from the tokens.
- The hero is the product: a 3D-angled phone with a live WhatsApp chat that plays by itself (a map arrives with "You are top 3 in 18 of 49 spots", a review alert, Nora's draft, a thumb taps Yes, "Live on Google"). Labelled "Example".
- Motion everywhere it explains something: chats that type, a grid that fills in, cards that slide in on scroll, a listing that "heals", numbers that count up only when they are the visitor's own. All motion respects "reduce motion", loads after the first paint and stays inside 24.9.
- Real-world imagery of local businesses in the lead markets (a barber, a cafe, an auto shop, a dentist, a salon, a small hotel) from licensed stock or images the lane R chat generates, used as scenes, never presented as Kabsi customers.
- No fake proof: no invented logos, testimonials, customer counts or ratings. Social proof only when real (26.3).

### 24.3 The conversion path: show them their own business (the Free Visibility Scan, 27.7)
1. Hero: one box, "Find your business on Google".
2. Their own result at once: the map and its three numbers, the top competitors there, one AI check, then only what Google's public data really shows (rating, review count, the dates of the reviews returned, hours set or missing, photos, website, phone, categories). A second box, "What Kabsi sees once connected": reviews without a reply, posts, changes others made, Google's own warnings. Never guessed. A count of what is missing may be shown; never a score (K-02).
3. "Here is what Kabsi would send you": a WhatsApp chat built from a real review on their listing, with the reply Kabsi would draft (one AI draft per scan, never posted, labelled as a preview). The copy says "a review from your listing", never "your latest review"; Kabsi picks the most recent of the reviews returned.
4. Two buttons: "Get this on WhatsApp" (opens the Kabsi number with a prefilled message carrying the scan code, so Nora continues with their business known) and "Start free on the web". No card, 14 days.
5. If they leave: "Send me this report" by email or WhatsApp (opt-in, once).
6. Retargeting (after consent where required) uses the pixel audience only, never their data.

### 24.4 Show what they can do on WhatsApp
- An interactive chat on the home page and on how-it-works with tappable examples: "Where do I rank for dentist?", "A 1-star review came in", "Ask a customer for a review", "Close at 3 today", "Here is a photo of our new dish", "How did we do this week". Each tap plays the real conversation with the buttons the owner would see.
- A "Things you can say to Kabsi" grid: ranking and AI answers, competitors, reviews and review requests, hours and holidays, photos and posts, listing changes, weekly report, review link and QR, team, plan and billing, talk to a person.
- A short loop video (under 20 seconds, captioned) of the real flow on a phone, made after 13b's live test.

### 24.5 Pricing that sells honestly
- Two plans side by side (27.4), Pro marked "Most owners pick this", monthly and yearly with "190 a year, 2 months free" maths, extra locations in one line.
- "Free for 14 days. No card. Cancel in WhatsApp." under every button.
- The founding offer with the real number of places left.
- A comparison strip: what an agency charges, what rank and review tools cost separately, what Kabsi costs (honest, sourced, dated).
- FAQ: what if I already reply myself, can I edit replies, what Kabsi never does (no fake reviews, no review gating, never posts without your yes), is this safe with Google (Kabsi only uses Google's tools for managers and only after your yes), can I cancel (yes, from WhatsApp), is my data safe (link to /privacy), what happens after the trial.

### 24.6 Every page, same system, each with one job
- Home: understand and start the scan. How it works: see the WhatsApp agent in action. Pricing: choose and start. The two tools: useful first, then the same path as 24.3. Guides: answer the question, then offer the scan. Industry pages: their trade's scene and examples, then the scan. Compare: honest table, then the scan. About: the founder note with the Torrington address and hello@kabsi.co. Security and privacy: plain words. Login and token pages: calm and simple.
- One sticky bottom bar on phones: "Scan my business" and the WhatsApp button.
- The Facebook and Instagram links in the footer (R-59).

### 24.7 Gates for Web 2
- The 5-second test: Rashid and two people who never saw Kabsi say what it is, what it does and what it costs after 5 seconds on the home page.
- Every budget in 24.9 passes on every public page.
- The scan-to-sign-up rate is measured from day 1 against the section 6 gate.

### 24.8 Guards for the free scan and the WhatsApp hand-off
- The scan and its preview draft run only after Turnstile, under free_scan_daily_cap and places_daily_cap, limited to 3 scans an hour per visitor, cached by place and keyword for 7 days (27.7).
- The scan code is random (at least 8 characters, for example KAB-7Q4M2X9P), expires after 7 days, and points only to the public scan result.
- When a chat arrives without the code, Nora answers: "Welcome to Kabsi. Did you just scan your business on kabsi.co? Send me your business name or the code from the page and I will pick up from there." A business name runs the same scan inside WhatsApp (counted against the same caps).
- The prefilled message reads "Hi Kabsi, my scan code is KAB-...". Plain text, no link.

### 24.9 Speed and polish budgets (fail CI when missed)
Speed, by Lighthouse CI on a throttled mid-range phone (slow 4G) for every public page, and by Vercel Speed Insights on real visitors:
- Largest contentful paint under 2.0 seconds; interaction to next paint under 150 milliseconds (aim under 100); layout shift under 0.05; total blocking time under 150 milliseconds.
- Lighthouse on phone: performance 95 or more on the home page, pricing and the two tools, 90 or more everywhere else; accessibility, best practices and SEO 95 or more.
- JavaScript before the page is usable: under 120 KB compressed on public pages. Animation code, the chat demo, the pixel and analytics load after the first paint or on view.
- Images in AVIF or WebP at the right size, width and height set, the hero image preloaded, the rest lazy. Video in short MP4 or WebM loops with a poster.
- Fonts self-hosted, subset, at most two families, main weights preloaded, no flash of invisible text.
- Links prefetch on hover and on touch start.
Feel:
- Every button and link shows a pressed state within 100 milliseconds; anything slower shows progress at once, never a frozen screen.
- Optimistic updates where safe (menus, tabs, choosing a plan); never for anything that reaches Google or money.
- Nothing jumps while loading.
- Phone first: touch targets at least 44 by 44 pixels, thumb reach, the sticky bar never covers content or the iPhone home bar, no sideways scroll at 320 pixels, right keyboards, autocomplete, no zoom on focus, no hover-only features.
- Tested on a real iPhone (Safari) and a real mid-range Android (Chrome) before Web 2 merges, plus 320, 390, 430, 768, 1024, 1440 and 1920 pixel widths in CI screenshots.
Professional finish:
- Designed 404 and error pages, favicon and app icons, the manifest, theme colour, share images, print styles for the QR card, the counter card and reports.
- Loading, empty and error states for every component that fetches.
- Every line passes the kabsi-copy skill; prices from the facts only.
- Keyboard and screen reader work everywhere; contrast 4.5 to 1 or more; reduced motion respected.
- No console errors, no broken links (checked in CI), no mixed content.
- A last pass by the lane R chat at 390 and 1440 pixels, page by page, before Web 2 is called done.

## 25. Outside audit of 23 Oct (ChatGPT), what Kabsi takes from it

### 25.1 Changes to earlier sections
*Applied by Session 0: the trial line in section 10 (the old 10.2.2) and the lockfile line in 19.3.*
- 10.2.2: the 14-day trial starts when Google access is granted (google_access_granted), not at sign-up. A sign-up that never connects gets the onboarding nudges, not trial reminders.
- 24.3 step 2: Google's public data does not say which reviews have a reply and has no posts; the free scan shows only what it can see, and lists the rest under "What Kabsi sees once connected".
- 19.3: commit package-lock.json, CI and Vercel use npm ci, Dependabot reads the lockfile. GitHub Actions pinned to full commit SHAs, kept current by Dependabot.

### 25.2 Google architecture on record (session 19 rest)
- docs/GOOGLE-ARCHITECTURE.md: how Kabsi reaches a business (the owner adds the Kabsi group as Manager; Kabsi's own Google account acts through the approved API project; no owner token is stored), what Kabsi may do (only writes the owner approved, one by one), what it never does, and the quotes from Google's current Business Profile API policies and Places API terms that allow it, with links and the date read. Also what the policies say about showing third-party ranking data next to Business Profile data.
- If a policy conflicts with the design, stop and tell the lane R chat.
- Retention per data type against those policies (Places data: only place_id long term; review text, reviewer names, profile details, photos, posts, AI prompts and logs, exports, backups, scan data). Gaps fixed or listed.

### 25.3 Publication pipeline failure cases (session 19 rest)
Tests, with the database enforcing the rules:
- Approve tapped twice; the same webhook twice; two workers claiming the same publication.
- Cancel inside the undo window.
- Google accepts the write but the call times out: reconcile by reading Google, never write again blindly.
- Rate limit or moderation pending.
- Google's result differs from the approved text.
- Access lost, plan ended or business disconnected while the job waits: every queued job checks membership, permission, approval and plan again right before writing.
- "Published" only after Kabsi has read the result back from Google.

### 25.4 AI safety in the evaluations (session 19 rest)
- Review text is untrusted data: cases where a review tries to give orders, asks for personal data, or is sarcastic or ambiguous. All must pass.
- Facts in a reply come only from Business Knowledge with a source; anything uncertain is left out.
- Serious complaints (injury, discrimination, legal threats, health) get "needs care" and a second Confirm.
- Report per run: edit rate, unsupported claims, generic replies, language errors.

### 25.5 WhatsApp clarity (session 13b)
- Every message that can change Google names the business and shows the exact change. A typed "yes" while two items wait gets "Which one?" with buttons.
- An old button whose task is done, expired or no longer the phone's answers "This one is already handled" or "This is no longer yours to approve", and changes nothing.
- The status page tracks the number as a ladder with dates and proof: number acquired (23 Oct), profile set (23 Oct), webhook verified, templates approved, inbound tested, outbound tested, owners switched on. The facts say "WhatsApp is live" only at the last step.

### 25.6 Working rules for build sessions
- The R decisions table has a status column from R-55: Approved, Building, Merged, Verified live, Retired. Moved only with evidence.
- Session report: PR link, 3-line summary, tests actually run (exact commands), what was verified live and how, manual steps left for Rashid, known limits. In CLAUDE.md and the kabsi-build-session skill.
- A merged PR or a passing mock test is never called "live".

### 25.7 Session Sec 1 (Opus, before 20c)
- Tenant isolation for every API route, RPC and table across owner, manager, staff, staff_admin and an outsider, two businesses and two accounts; pgTAP and API tests in CI.
- Webhooks (Kapso, Creem, Google Pub/Sub): wrong signature, replayed, duplicate and malformed payloads.
- Disconnect and deletion reach jobs, logs, Storage and the next backup cycle.
- No tokens, codes, review text or personal data in logs, Sentry or PostHog.
- Findings by file and line; fixes in scope; the rest listed.

### 25.8 Unit economics on the staff page (UX 1, data from Growth 1, session 10 and V1 to V4)
- Per business per month: AI, Places, DataForSEO, Gemini, WhatsApp messages and Meta fees, emails, Creem fee, failed jobs; gross margin by plan.
- Alert when data plus AI passes 15 percent of the plan price (27.4).

### 25.9 Not taken
More agents, workflow builders or a partner marketplace before launch; a full line-by-line audit now (Sec 1, 20c and 21 cover it); a trial with a card.

### 25.10 Lovable is gone (account cancelled 23 Oct)
Ops 1 part B deletes bun.lock and bunfig.toml, src/lib/legacy-host.ts and tests/legacy-host.test.ts and their uses, the kabsi-app.lovable.app lines in the facts and llms files, any Lovable package or tag, and updates docs/hosting.md. History stays. CLAUDE.md gets "Kabsi does not use Lovable."

## 26. Second outside review (Kimi, 23 Oct), what Kabsi takes from it

Checked on 23 Oct: the deploy workflow runs only on pushes to main; prompt caching is already used in the AI client; supabase/functions/billing (NOWPayments) exists and billing-creem does not yet.

### 26.1 AI quality and cost (session 19 rest)
- Drafts as structured output (tool use with a fixed schema, validated in code).
- An AI judge scores the evaluations with a written rubric; scores stored per prompt version. Rubric and dataset format in .claude/skills/kabsi-eval.
- Contradiction cases: two closing times or prices; the draft leaves the fact out and Kabsi asks the owner.
- Prompt caching confirmed on every draft call, facts block last; saving reported.

### 26.2 Values owners see every week (now part of the Results Report, 27.3 item 6)
- Google's Performance API numbers this week against last.
- Review stats: median time to reply, replies this month against last, reviews still waiting.
- Links in posts carry utm_source=google, utm_medium=organic, utm_campaign=gbp_post.
- "How long left" on the trial at any time, and a day-7 recap (session 10 with 13b).
- A "Kabsi activity" list in the dashboard (UX 1).

### 26.3 Proof and referrals, real only
- A proof block on the home page and pricing, empty or real facts only until the Abou Hamze pilot gives real numbers and a quote the owner agrees to; then case study pages as real customers arrive.
- After 30 days, Nora asks the owner once for a short opinion of Kabsi and permission to quote it (about Kabsi, never the owner's Google reviews).
- Referral: a free month for an owner who brings a business that pays; after launch.

### 26.4 Conversion details (Web 2, Growth 1)
- The "Add to Home Screen" prompt only after the owner's first Yes.
- Growth 1 defines the retargeting audiences now (started the scan, finished the scan, signed up without Google access).

### 26.5 Measuring the promise (Growth 1)
- Time from WhatsApp connected to the first alert, median and 90th percentile. Gate: median under 10 minutes; if it misses, the promise changes.

### 26.6 Repo and CI safety (Ops 1 part B, Session 0 for the docs)
- Branch protection on main (PRs only, CI must pass, no force pushes, no deletion, no required human review); Ops 1 part B gives Rashid the clicks.
- Dependency review action in CI.
- CI checks: migration file names start with a timestamp; every SKILL.md has frontmatter.
- The docs diet (27.12).
- Framework versions stay pinned; docs/hosting.md says when to upgrade (a stable release and two quiet weeks, its own session). No upgrade before launch.

### 26.7 Facts split: moved to 27.12 (Session 0).

### 26.8 End-to-end tests and accessibility
- Playwright smoke tests with axe in CI: home to scan to sign-up (Web 2); sign-up, add Manager, connect WhatsApp, first alert, approve (UX 1).
- Sec 1: Content Security Policy and Permissions-Policy, report-only first, enforced after a week of clean reports; retried jobs and a dead-letter view on the staff page.

### 26.9 Staff alerts (13b part 2)
- Places calls at 80 percent of places_daily_cap alert staff; "today" shows the count. The same for DataForSEO and Gemini budgets (27.10).
- Error rate per function per hour in the daily staff summary.

### 26.10 Not taken
Exclamation marks in WhatsApp; a GitHub organisation, signed commits, CODEOWNERS, issue templates; pgmq, retrieval, the Batch API for now, canary prompts, WhatsApp Flows; Claude Code hooks; a "first business live" line (the founder's own business is not customer proof).

## 27. Kabsi becomes the local visibility and reviews manager (24 Oct 2026)

Decided by the lane R chat on Rashid's authority (R-41), after Rashid's verdict ("I would not pay 19 or 39 for the current features") and the review written in Hussein's Claude account on 24 Oct. This section wins over every earlier section where they differ, including sections 1, 3, 11, 13, 16, 21.4 and 24.

### 27.1 The verdict
A business that gets one review a week sees four replies, four posts and a report a month. Google is testing free AI replies; ChatGPT drafts them for free; Semrush Local bundles the same chores for 30 dollars. Nobody pays 39 dollars for chores. Owners pay for two things they cannot get alone: seeing where they stand against the shop down the street, and getting more customers to leave reviews. Kabsi sells those, does the chores as part of the deal, and runs it all from WhatsApp.

### 27.2 Position (replaces section 1)
- Kabsi is the local visibility and reviews manager for one business, run from WhatsApp. It measures, it does the work, and it reports what changed, every week.
- Hero H1: "See where you show up on Google and in AI answers."
- Subline: "Kabsi checks your Google Maps ranking and what ChatGPT and Gemini say about you, helps you get more reviews the right way, keeps your listing right and posts for you. You reply Yes on WhatsApp."
- Pillars: See where you show up / More reviews, the right way / Your listing kept right / All from WhatsApp.
- Footer and emails keep "Your reviews and listing. Taken care of."
- Replies stay in every plan, unlimited, and are never the headline again.
- K-144 stays absolute: Kabsi shows what it measured and what changed. It never promises rankings, reviews, calls or customers, and never says a change happened because of Kabsi.

### 27.3 The modules (all before launch)
1. Visibility Map. Kabsi suggests keywords from the search terms report and the category; the owner confirms in WhatsApp. A 7 by 7 grid around the business (radius by trade: about 1 km for a cafe, 3 km for a salon, 5 km for a clinic or auto repair) shows the Maps rank at each point. Three numbers: average rank, share of the grid in the top 3, and who beats the business where. Sent in WhatsApp as an image with one line, for example "You are top 3 in 18 of 49 spots for 'dentist'. Smile Clinic beats you north of the mall." Data: DataForSEO Google Maps SERP, standard queue.
2. AI Visibility. Prompts in customers' words ("best dentist in Jumeirah", "barber near Shoreditch open late") run on ChatGPT and Perplexity through DataForSEO LLM Responses and on Gemini with Google Maps grounding. Kabsi records: named or not, position, competitors named, sources cited. AI answers change from run to run, so the report shows a share across the period's runs and a trend, labelled as a sample. The sources cited become actions ("Time Out Dubai's list names three of your competitors").
3. Competitor Watch. 3 competitors on Essentials, 5 on Pro, picked by the owner from the grid results. Rating, review count, new reviews a month, reply rate, posts, photos and primary category, from the DataForSEO results (Google's Places data may not be stored beyond its caching limits, so competitor history never comes from Places). Alerts like "Smile Clinic got 14 reviews this month. You got 3."
4. Category check (part of Profile Coach). Kabsi compares the owner's primary and extra categories with the top three competitors in the grid and proposes a change as a normal approval, never automatically.
5. Review Growth, the feature owners pay for. Kabsi helps ask every customer, never only happy ones.
   - Kept: the review link, QR card and the staff "Send review link".
   - New: a monthly review goal and pace in every report ("4 new this month; your 3 competitors average 9").
   - New: "Ask a customer". The owner shares a customer's contact with Kabsi in WhatsApp; Kabsi sends back a ready message with the review link that the owner forwards from the business's own phone. Kabsi never messages the customer.
   - New: a printable counter card and a table tent with the QR, designed to be displayed.
   - Rules enforced in code: the same message to every customer, no rating question first, no rewards, no per-staff quotas, no review gating, ever.
6. Results Report (replaces the Weekly Care Report). Google's own numbers from the Business Profile Performance API week on week: calls, direction requests, website clicks, messaging clicks, bookings, impressions. Plus grid rank, AI share, reviews against competitors, review stats (26.2), what Kabsi did this week and three next actions, each one a Yes in WhatsApp. A one-page monthly PDF on Pro. Wording fixed in code: "changed", never "because of Kabsi".
7. Ask Kabsi with voice notes. Text or voice note in any language: "We are closed Friday" becomes holiday hours and a post to approve; "Why did calls drop?" gets an answer from the business's own numbers. Voice notes are transcribed (provider picked on a 20-note test in English, Arabic and Spanish).

Everything already built stays as the work: replies, Google Protection with Put it back, posts, photos, holiday hours, Profile Coach, the search terms report, the review link page, review graphics, the Report this review guide, and the suspension alert (18.2).

### 27.4 Plans (replaces 10.2.1 and the plan contents everywhere)
| | Essentials | Pro |
| --- | --- | --- |
| Price | 19 a month, 190 a year | 39 a month, 390 a year |
| Review alerts and replies | Unlimited | Unlimited |
| WhatsApp approvals, Ask Kabsi, voice notes | Yes | Yes |
| Google Protection, suspension alert | Yes | Yes |
| Visibility Map | 1 keyword, monthly | 5 keywords, weekly |
| AI Visibility | 3 prompts, monthly | 10 prompts, every 2 weeks |
| Competitor Watch | 3 competitors, monthly | 5 competitors, weekly |
| Review Growth | Everything | Everything |
| Results Report | Weekly | Weekly plus the monthly PDF |
| Posts and photos | Holiday hours, 2 posts a month | Weekly posts, photos from WhatsApp |
| Profile Coach and category check | Checklist | Checklist and actions |
| Team roles and approval rules | No | Yes |
- Extra location: 15 a month or 150 a year, same plan.
- Trial: 14 days of Pro, no card, starting when Google access works (25.1). The founding offer stays (first 30 paying businesses keep their price).
- Front Desk (99 a month or 990 a year): Pro plus an AI assistant on the business's own WhatsApp number through coexistence, answering only from Business Knowledge and the profile, handing bookings to staff, and sending a review request after each visit it knows about. Not built before launch. After launch, a 60-day paid pilot with 5 businesses; kill-gate: fewer than 3 of 5 pay, it stops. Session 10 does not create a Front Desk product yet.
- Cost rule: data plus AI per business stays under 15 percent of the plan price. The staff page alert changes from a flat 3 dollars to 15 percent of the plan price.

### 27.5 Markets (replaces the US-first rule, section 11's market line and section 16's order)
- Lead: the United Arab Emirates and the United Kingdom: English-first for business owners, on WhatsApp far more than the US, paying by card, both served by Creem.
- Open from day one: the US, Canada, Australia, Ireland and every country Creem serves, in English with local examples.
- Next, after 10 paying businesses in the lead markets: Saudi Arabia (with Arabic pages), then Spain and Latin America (with Spanish pages).
- Lebanon: the Abou Hamze pilot stays as the first real proof; not a sales target.
- The free scan, prices and examples show the visitor's own country where known (api.geo), with USD prices everywhere.

### 27.6 Arabic (changes R-61)
- Still no Arabic shown on the website, ads or public material until the Saudi step. The product works in Arabic and any language inside WhatsApp, voice notes included.
- At the Saudi step, Arabic pages at /ar in their own session; English stays first (K-119).

### 27.7 Free tool (replaces the Google Profile Check)
*Changed by 28.1: the public scan answers in seconds from live endpoints; the full 7 by 7 map is queued and arrives on the page and, if the visitor asks, on WhatsApp.*
- The Free Visibility Scan: find the business, Kabsi picks the most likely keyword from the category (the visitor can change it), runs one 7 by 7 grid and one AI check, and shows the map, the three numbers, the top competitors, the public profile facts (25.1) and "What Kabsi sees once connected". Then the preview draft (24.3), "Get this on WhatsApp" and "Start free".
- About 5 cents a scan. Guards: Turnstile, free_scan_daily_cap in app_settings, 3 scans an hour per visitor, results cached by place and keyword for 7 days.
- free_scan_daily_cap stays 0 on the public site until the DataForSEO top-up at the launch gate (27.10); test accounts and staff can scan before that. At launch it starts at 40.
- The Review link and QR tool stays free as the second tool.

### 27.8 Keywords (replaces 21.4)
1. Tools: google maps rank checker, local rank checker, google maps ranking tool, check my google ranking, is my business on chatgpt, ai visibility checker, google review link generator, google review qr code.
2. Product: google business profile management, local seo for small business, get more google reviews, google review request, track competitors on google maps, google business profile on whatsapp.
3. Guides (problem intent): how to rank higher on google maps, why is my business not showing on google maps, how to show up in chatgpt answers, how to get more google reviews (within Google's rules), best primary category for my business, google business profile suspended what to do, holiday hours on google, how to reply to google reviews, google changed my business info.
4. Pages per lead city for the tools (Dubai, Abu Dhabi, London, Manchester), honest and useful, no doorway pages.
Checked against Search Console 6 weeks after launch.

### 27.9 Paused, cut or moved
- Web 1 is replaced by Web 2, built after V1 so the site shows real maps and reports. The lane R chat draws the design system and mockups while V1 runs. Section 24's look, budgets and guards stay.
- New industry pages: paused until Web 2.
- Kabsi Outbound with Harvey (section 13): starts right after the launch gate. Targets the lead markets first (UAE and UK), then the US. Email 1 offers the Free Visibility Scan ("Want me to send you where <business> shows up on Google Maps for '<keyword>' against the shops near you?"); a yes gets the scan map, the founding offer and the WhatsApp button. The rest of section 13 stays: sender "Nora at Kabsi", the signature, the Torrington address, the opt-out line, a separate sending domain with two weeks of warm-up, 20 a day then 30, hard stop at 300, kill-gate fewer than 3 replies that lead to a scan or trial.
- The 200-case reply evaluation: 50 cases plus every safety, injection and contradiction case.
- Agencies and white label: after 50 paying owners.
- Front Desk: after launch, pilot only.

### 27.10 Data providers and keys
- DataForSEO: account under hello@kabsi.co; DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD in Supabase secrets (24 Oct); 1 US dollar of free credit, enough for about 20 live scans and AI checks while building V1 to V4. Build sessions test with recorded fixtures and spend live credit only on the one live check each reports. The 50 dollar top-up at the launch gate; the lane R chat tells Rashid when.
- Gemini: GEMINI_API_KEY in Supabase secrets (24 Oct), free tier; the lane R chat tells Rashid when to add billing.
- Each provider has a monthly spend cap in app_settings and a staff alert at 80 percent.
- V1 checks Google's Business Profile API policies on showing third-party ranking data next to Google's numbers before the report is built, and keeps the sources separate in storage and on screen.
- V1 checks Kapso: coexistence sign-up of client numbers on one account (Front Desk only) and the Platform plan price.

### 27.11 Sessions (replaces section 17 and the waves; at most 2 Opus at once)
- Session 0 (Sonnet, docs only, first and alone): commits sections 20 to 27, records the decisions, and does the docs diet (27.12).
- Wave A, after Session 0's first PR: session 19 rest (Opus), session 13b part 1 (Opus), Ops 1 part B (Sonnet).
- Wave B: session 10 Creem (Opus), Growth 1 (Sonnet), V1 Visibility Map, Competitor Watch and category check (Opus).
- Wave C: V2 AI Visibility (Sonnet), V3 Review Growth and voice notes (Sonnet), 13b part 2 (Opus).
- Wave D: V4 Results Report and the Free Visibility Scan (Sonnet), Web 2 (Sonnet, from the approved mockups), SEO 1 (Sonnet).
- Wave E: UX 1 (Sonnet), Sec 1 (Opus), 20c audit, 21 launch gate.
- After launch: Outbound (27.9), FD1 Front Desk pilot (Opus), Click-to-WhatsApp ads once trial to paid is proven.

### 27.12 Docs diet (Session 0)
- docs/KABSI-PLAN.md becomes an index under 40 KB: guardrails, rules for build sessions, the decision table with status, and links. Everything else moves to docs/plan/archive/, moved, never deleted.
- docs/KABSI-PROGRESS.md becomes a one-page current status (under 10 KB) with the WhatsApp ladder (25.5); history moves to docs/progress/archive/.
- knowledge/kabsi-facts.md splits into knowledge/facts/ (public facts Nora and the site use) and knowledge/internal/ (notes), with one generator for the combined file and the llms files.
- docs/KABSI-MASTERPLAN.md stays the always-read core.
- CLAUDE.md read-first list: CLAUDE.md, the plan index, the master plan, the status page, then only what the task names.

### 27.13 Gates (added to section 6)
- Before Wave D: two Results Reports in a row on two real profiles (Yawmiyati and Abou Hamze), read in WhatsApp.
- Launch gate (session 21): the WhatsApp ladder complete, one test-mode payment end to end, Hussein's Creem live switch done, the DataForSEO top-up done, the Free Visibility Scan working under its cap, every section 15 and 27.14 item.
- 60 days after launch: 10 paying businesses. If fewer, one fix session on the funnel; a second miss changes the offer, not the gate.
- Owners who answer Kabsi in WhatsApp in a given week: 60 percent of paying owners.
- Paying owners still paying after 3 months: 85 percent.
- Data plus AI cost under 15 percent of the price.

### 27.14 Not forgotten (the launch gate checks every line)
*Changed by 30.1: the Growth line's partner item now points to section 29 (Kabsi's own ledger, Creem's affiliate program off).*
- Accounts and money: Supabase Pro and Vercel Pro before the first payment; Kapso Pro with the standby number before launch; Hussein's Creem business verification and payout account, then live keys; the DataForSEO top-up and Gemini billing when the lane R chat says; the Anthropic promotional credit ends 17 Nov 2026.
- WhatsApp: display name "Kabsi" approved; Meta business verification at about 150 business-started conversations a day; the username "kabsi" right after verification; staff alerts on WhatsApp and Slack removed (13b part 2); STOP and opt-in records.
- Google: Search Console sitemap resubmitted and top pages inspected after Web 2 and SEO 1; Bing Webmaster Tools; the second Kabsi Google account in the group; docs/GOOGLE-ARCHITECTURE.md; suspension alerts.
- Security: 2-step verification on every account (19.6), recovery codes offline, branch protection on main, backups to R2 with a passed restore drill, gitleaks and secret scanning, the runbook.
- Growth: Facebook and Instagram links everywhere (R-59); Meta Pixel and Conversions API; PostHog funnel and dashboards; the founding offer counter; the proof block only with real data (26.3); Outbound right after launch (27.9); Click-to-WhatsApp ads once trial to paid is proven; Kabsi Partners through Kabsi's own ledger (section 29, Creem's affiliate program off); the Front Desk pilot.
- Legal and trust: privacy and terms with every processor (DataForSEO and Gemini included); the cookie bar for the EU, UK and Switzerland; "Your privacy choices"; the lawyer's read; no fake proof; no ranking promises; Google never implied as a partner.

## 28. Build traps, the first-map onboarding, and the repo clean-up (24 Oct 2026)

Sources: Gemini's last review (24 Oct), checked by the lane R chat, and the lane R chat's own additions. It wins over 27 where they differ.

### 28.1 The free scan answers in seconds (changes 27.7)
DataForSEO's standard queue is cheap but takes minutes, and a visitor will not wait. So the public scan has two parts:
- On the page, in a few seconds (DataForSEO live endpoints): the business's rank at its own address for the keyword, the top competitors there, one AI check, and the public profile facts. Cost about 3 cents.
- The full 7 by 7 map is queued (standard queue, about 3 cents) and arrives two ways: on the same page when it is ready (the page keeps checking), and by WhatsApp when the visitor taps "Send the full map to my WhatsApp". That button opens a chat with the Kabsi number with the scan code prefilled; the visitor sends it, which opens the conversation, and Kabsi answers with the map image. This is opt-in started by the visitor, never a cold message, and it is the best lead Kabsi can get.
- Subscriber scans on schedule stay on the standard queue.

### 28.2 Map images without heavy rendering (changes 27.3 item 1)
- Edge Functions do not run a browser or a canvas engine. The base map comes from a static map API with markers (Geoapify Static Maps on its free plan first; Mapbox Static Images as the fallback), never from OpenStreetMap's own tile servers, whose usage policy forbids this.
- Kabsi draws the 49 coloured rank pins and the legend as SVG and turns them into one PNG with a small WebAssembly renderer (resvg) or with ImageScript, which the photo pipeline already uses. Under 250 KB, readable on a phone, attribution printed on the image.
- V1 gives Rashid the clicks for a free Geoapify key, saved as GEOAPIFY_API_KEY.

### 28.3 Voice notes (changes 27.3 item 7, V3)
- Owners send long notes with shop noise and mixed Arabic and English. V3 tests OpenAI's transcription and ElevenLabs Scribe on 20 real-style notes (English, Gulf Arabic, Levantine Arabic, mixed, Spanish) and picks one; the key is added then.
- The webhook refuses audio over 10 MB or 3 minutes with a kind line ("Please keep voice notes under 3 minutes"). Audio is deleted after transcription; only the text is kept.

### 28.4 Core first (gate added to 27.11)
V2, V3 and V4 do not start until two things are proven: session 13b part 1's live test passed on Rashid's phone, and session 10's test-mode payment went through end to end. V1 may run before that, because it only adds data and does not touch the WhatsApp or payment paths.

### 28.5 The first map is the first wow (changes section 12, onboarding)
The 10-minute onboarding now ends with the owner's own map, not a review alert:
1. Sign up (or arrive from the free scan or WhatsApp with the business already known).
2. Add Kabsi as Manager on Google: a guide with live status ("Invite sent, waiting for you to accept", resend, "send this to my manager").
3. Five questions, then confirm the keyword Kabsi suggests (with the free scan's keyword prefilled) and pick competitors from the scan, all in one screen.
4. Connect WhatsApp: QR on desktop, one tap on a phone.
5. Within 5 minutes: the first full map arrives in WhatsApp with three next actions, then the first review alert when a review comes. The trial clock starts when Google access works (25.1).
- Measured: time from WhatsApp connected to the first map delivered (median under 10 minutes, 26.5).
- Owners who arrived from the free scan keep their scan and keyword, so they never type anything twice.

### 28.6 The AI brain and the agents after the pivot (changes section 8)
One brain, Business Knowledge plus each business's own measured data, and six agents, each with a clear job and limited tools:
- Reply: review replies (unchanged), structured output and judged evaluations (26.1).
- Guard: Google Protection, suspension and verification alerts, the listing watch.
- Growth: posts, photos, holiday hours, Review Growth messages and the "Ask a customer" text.
- Insights: the Results Report, the three next actions, answers to "why did calls drop", the category check, the AI Visibility sources turned into actions.
- Scout: runs and reads the Visibility Map, Competitor Watch and AI Visibility jobs; turns raw ranks into the three numbers and the one line for WhatsApp. It never writes to Google.
- Nora: the voice in WhatsApp, on the site and in Outbound; sells to unknown phones with the free scan; supports owners; hands to a person.
Rules: every agent writes to Google only through the one publication pipeline with the owner's yes; review text and competitor text are untrusted data; Haiku for sorting and short work, Sonnet for replies, posts, reports and Nora, no Opus in production; prompt caching on Business Knowledge; the Batch API for weekly reports once there are more than 20 businesses; cost per agent per business recorded (25.8).

### 28.7 Nora's knowledge
Nora answers only from the public facts (knowledge/facts/, 27.12): what Kabsi is now, the modules, the plans and limits, the trial, the markets, what Kabsi never does. Nora's 60-question evaluation gets 20 new questions about the new position (maps, AI answers, competitors, review requests, what the free scan shows, prices per plan) before 13b part 2 merges.

### 28.8 Website additions (changes 24.2 and 24.5, Web 2)
- The hero shows the product twice: a live map grid that fills in green and red around a pin, and beside it the phone with the WhatsApp chat receiving that map with its one line. Labelled "Example".
- Pricing adds an honest comparison of buying the same pieces separately (a map rank tool, an AI visibility tool, a review request tool, a profile tool), with sourced, dated prices, against one Kabsi plan.
- "See your map" is the one main button everywhere; "Try it on WhatsApp" the second.

### 28.9 Repo clean-up: session Clean 1 (Opus, alone, right after Session 0)
Goal: nothing old, unused or misleading left in the working repo, without breaking anything. Removed code stays in git history; nothing else is lost.
1. Find what is unused, with evidence:
   - code: knip (or ts-prune) for unused files, exports and dependencies in the app and scripts; unused components and routes;
   - Edge Functions: references in code and the invocation logs of the last 30 days (Supabase connector). Candidates seen on 24 Oct: tap, site-assets, turnstile-diag, kv-sync, brand and anything left from the NFC cards, the Lebanon bundle, the old partner reselling and the Free plan;
   - database: tables, functions and cron jobs nothing uses (read-only queries);
   - skills, scripts, docs pages and public files nothing points to.
2. Remove what is proven unused, in small commits, each with its evidence in the commit message. A function is deleted from the repo and from Supabase in the same PR.
3. Never delete without Rashid: database tables or columns and real data go to Rashid as an SQL file with a read-back, as always.
4. Not Clean 1's job (other sessions remove them when their replacement works): the Slack function and cron jobs (13b part 2), the NOWPayments billing function (session 10).
5. Lovable leftovers (25.10) move from Ops 1 part B to Clean 1.
6. Skills: keep kabsi-build-session, kabsi-reply-lab, kabsi-copy, kabsi-outbound, frontend-design, supabase, supabase-postgres-best-practices, integrate-whatsapp, observe-whatsapp, automate-whatsapp; keep integrate-whatsapp-calling only as a note for after launch, or remove it if nothing plans calling; make skills-lock.json match. Coming from later sessions: kabsi-eval (A), kabsi-billing (D), kabsi-data-providers (V1).
7. After clean-up: typecheck, lint, every test, the build and the deno checks pass; the site and the live functions answer as before (checked with plain requests); report what was removed, the size before and after, and anything left for Rashid.

## 29. Kabsi Partners, and one WhatsApp agent for every kind of person (24 Oct 2026)

Rashid does all the work: he approves partners, approves payouts and runs every account. Hussein does no work; Creem stays in his name, and a PayPal account for partner payouts is opened in his name if partners need it (29.1). It replaces 13's partner lines, 16's "Partners through Creem's affiliate program", 26.3's referral line where they differ, and K-32.

### 29.1 The program in short
*Replaces K-32 (referrals and commission) for partners, plus 13's partner lines and 16's "Partners through Creem's affiliate program"; K-32 in docs/source/KABSI-AUDIT.md carries a pointer here.*
- Affiliates only (no reselling, no white label until 50 paying owners, 27.9). Anyone can apply; Rashid approves each in staff WhatsApp. The first 20 approved are Founding Partners.
- Commission: 25 percent of every payment for as long as the business pays, extra locations included. One rate for everyone. Replaces 30 percent for 12 months and the 40 percent founding rate (K-32).
- Kabsi's own ledger, built on Creem's payment, refund and chargeback events (session 10's webhook). Creem's affiliate program stays off, so partners never open another account and there is one source of truth.
- Each commission line waits 30 days. A refund inside the hold cancels it; a chargeback after payout comes off the next payout.
- Payout on the 5th of each month for every partner with 50 dollars or more cleared; below that it rolls over. Rashid approves the month's list with one tap in staff WhatsApp.
- Payout methods: USDT or USDC, sent by Rashid from his own crypto wallet; or PayPal, from a PayPal account opened in Hussein's name (Hussein does the sign-up and identity check once; Rashid runs it from then on). Bank transfer and Wise come later if partners ask for them. Nora asks the partner how they want to be paid only when their first 50 dollars clears; details live in Supabase Vault and show as the last 4 characters. Kabsi pays the transfer fee. Every payout comes with a WhatsApp message and a PDF statement.
- Businesses that come through a partner get a 30-day Pro trial instead of 14 days. No discount codes, no cash to customers.
- The owner referral reward (a free month, 26.3) never stacks with a partner commission: one source per business.
- Partner links switch on at the launch gate. Partners can be recruited and approved before.

The money, per referred business per month: Essentials 19, partner 4.75, cost about 2.16, Kabsi keeps about 12.09 (64 percent); Pro 39, partner 9.75, cost about 6.39, Kabsi keeps about 22.86 (59 percent).

### 29.2 The partner journey, all in WhatsApp on the Kabsi number
- Apply: "Apply on WhatsApp" on kabsi.co/partners, or "partner" sent to the Kabsi number. Nora asks six things one at a time, with buttons where possible: name and email; country and city; what they do (creator, agency or freelancer, accountant or consultant, web, POS or booking seller, business group, other); where they will share Kabsi and roughly how many local owners it reaches; one line on how they will recommend it; for the UAE, their advertiser permit number or "I will only share privately". Then the terms link with "I agree" and "Not now".
- Approval: staff WhatsApp gets the application with Approve, Decline and Ask a question; answer within 2 working days; a kind decline, reapply after 90 days.
- What a partner can say (plain words or voice notes):
  - "My link": the page link, a short link and the QR image.
  - "How am I doing": this month's page visits, scans, trials, paying businesses, earned, pending, next payout date.
  - "Scan Al Noor Salon, Dubai Marina": the Free Visibility Scan for that business, returned as the map image and a report link "Prepared for Al Noor Salon, shared by Sara, Kabsi Partner", carrying the partner's attribution. 10 a day and 100 a month, inside the public scan caps.
  - "Send to a business": a ready message to forward from the partner's own phone.
  - "Kit": three ready posts, a 30-second video, approved claims and the do-not-say list.
  - A photo or "Change my line": updates the page after checks (a free-text line is checked in code for banned claims, then approved by Rashid).
  - "Payout", "Rules", "Talk to a person", "Stop", "Leave the program".
- Messages Kabsi starts (utility templates, few, never at night in the partner's time zone): approved, a trial started through you, a business paid (you earned X after the hold), payout sent, the Monday summary. One marketing template at most once a month after 30 quiet days.
- First 7 days, run by Nora: day 0 kit and page; day 1 "Scan three businesses you know and send them their map"; day 3 one example post; day 7 the first weekly summary.
- Privacy: partners see the trade and area of a referred business, never its name, reviews or data, unless the owner says yes once to "Can we tell Sara you joined?". Cancellations appear only as a count.

### 29.3 Pages
- kabsi.co/partners (indexable, targets "google business profile affiliate program" and "local seo affiliate program"): H1 "Earn 25% of every payment, for as long as they stay."; how it works in three steps; what partners get; an earnings slider labelled as an example; who it suits; the five rules; questions; Founding Partner places left as a real count; "Apply on WhatsApp" and "Apply by email".
- kabsi.co/p/HANDLE for every partner, one template: the partner's photo, name and one line, "Recommended by Sara, Kabsi Partner", the Free Visibility Scan, "30 days of Pro free, no card", pricing and FAQ from shared components, the disclosure under the strip and in the footer. Trade variants at kabsi.co/p/HANDLE/TRADE. noindex. Handles: 3 to 20 lowercase letters and numbers, unique, never a brand or Google term. A partner who leaves gets "This page is no longer active".
- kabsi.co/s/CODE, the prospect report from "Scan a business": map, three numbers, top competitors, public profile facts, the partner strip and disclosure; noindex; expires after 30 days.
- kabsi.co/partner, the optional dashboard, sign-in by a 6-digit code sent to WhatsApp or email: Home, My page, Prospects, Referrals, Kit, Payouts, Settings. The same numbers as WhatsApp, from the one ledger.

### 29.4 Tracking and fraud
- Entry points: /p/ pages, /s/ reports, ?via=CODE, and a WhatsApp message with "Code P-NAME". The code sits in sessionStorage during the visit and is written to the server at the first real action (a scan, a sign-up or a WhatsApp message); matched for 60 days through the scan code or the WhatsApp number; saved on the business at sign-up, last referral wins, never changed after.
- No commission on self-referral (owner email, phone or Google place matches the partner); one trial per Google place; trials earn nothing, only payments; brand bidding, coupon sites and spam end the partnership; breaches get one warning with the exact post, then the page is switched off and unpaid commission withheld (any Google partnership claim, review incentive or spam ends it at once).

### 29.5 Partner rules (in the partner terms, read by the lawyer with the other terms)
Disclose the paid partnership on every post or message; never say or suggest Kabsi works with Google (K-112); never promise rankings, reviews, calls, customers or review removal (K-144); never offer anything for reviews or suggest asking only happy customers; no bulk or unsolicited WhatsApp, SMS or email; no ads on the Kabsi name, no coupon or cashback sites; no fake accounts or self-referral; only approved claims and the kit. Country rules are the partner's own (UAE advertiser permit, UK ASA and CAP labelling, US FTC disclosure).

### 29.6 Founding Partners and recruiting
- Perks for the first 20: a Founding Partner badge, Kabsi Pro free for their own business from day one (others get it at 3 paying referrals), a monthly 20-minute call with Rashid, first look at new features and a say in the kit. Same 25 percent.
- Who: business setup consultants and free zone partners in the UAE, accountants and bookkeepers, web and social media freelancers, POS and booking resellers (Foodics, Square, Fresha), business groups and coworking spaces, creators who speak to small business owners in the UAE and the UK.
- How: the partners page, Kabsi's Facebook and Instagram, and partner invitations sent by the Outbound engine after the launch gate (27.9), one to one, each approved by Rashid on his phone. Target: 50 invitations, 20 approved, 10 who scan at least one business in their first 30 days.

### 29.7 One WhatsApp agent, many kinds of people (built into 13b from day 1)
One Kabsi number, one router, one brain in Supabase. Every phone resolves to one or more roles before anything else happens, and each role has its own allowed tools and its own Nora voice:
- unknown phone: Nora as Kabsi's assistant (the free scan, the trial, prices, the partner program, talk to a person); never sees any business data.
- prospect (came from a scan or a partner code): the same, with their scan and attribution kept.
- owner, manager, staff (per business): the owner tools of 9.3 and 27.3, limited by role and plan.
- partner: the partner tools of 29.2 only; never any business tools or data beyond 29.2's privacy rule.
- staff_admin (Rashid, bound by a one-time staff code): the ops commands of the staff alerts ("status", "waiting", "today", "pause"), partner approvals, the payout list approval, the Kapso inbox hand-offs.
- A phone with two roles (a partner who also owns a business, or Rashid testing his own business) is asked once "Your business or your partner tools?" when a message could mean either, and every reply is headed with the role and business it acts for. "switch" changes it.
- Roles live in Supabase (one phone_roles table with the business or partner it belongs to), checked by RLS and in the router; Kapso is the transport and the team inbox, never the source of truth. The 100-conversation suite gets partner and staff_admin cases, and cases where a partner tries owner tools and an owner tries partner tools.

### 29.8 Sessions (added to 27.11)
- PA1 Partners core (Opus), after session 10: partner, page, prospect scan and referral tables; the attribution of 29.4; the ledger from Creem events; the monthly payout run (the list, Rashid's one-tap approval, batch files for the chosen payout account, statements); payout details in Vault; self-referral checks; the staff approval screen.
- PA2 Partners on WhatsApp (Sonnet), after 13b part 1's live test and PA1: the partner role's tools in the router, apply, approve and decline, the commands, the partner templates for Meta approval, Scan a business, the first 7 days, partner cases in the suite.
- PA3 Partner pages (Sonnet), after Web 2: /partners, /p/HANDLE and trade variants, /s/CODE, the /partner dashboard, noindex and disclosure, link previews tested on a phone.
- Gates: at the launch gate, 10 approved partners with live pages and one test referral tracked from page visit to a test-mode payment and a commission line (if not, launch without partners and switch on when it passes); the first payout run approved and paid with statements; at 90 days, 20 active partners, partners bring 20 percent of new trials, and partner trial-to-paid at least the overall rate.
- Before the first payout run (about two months after launch at the earliest): Hussein opens the PayPal account in his name (one sign-up and identity check, then Rashid runs it); Rashid confirms his crypto wallet for USDT or USDC payouts, asks the accountant which payout records to keep, and sends the partner terms to the lawyer with the other terms. Commissions build up in the ledger until then.

### 29.9 Tools along the way (who sets up what, and when)
- Sentry (in place): release tags on the app and every function (Ops 1 part B), source maps uploaded from the Vercel build, alert rules to hello@kabsi.co, urgent ones also to staff WhatsApp (13b part 2), privacy scrubbing (Growth 1).
- PostHog (in place): the events and funnels of 20 plus partner events (partner_applied, partner_approved, partner_scan, referral_trial, referral_paid) and dashboards (Growth 1, PA1).
- Cloudflare: Turnstile on every public form and scan (in place); the kabsi-go Worker for short links and QR redirects, kept only if Clean 1 proves it is used, and used for partner short links (PA1); R2 for backups (Ops 1 part B); DNS stays where it is.
- Vercel: Speed Insights (Growth 1); environment variables per 19.4 (Ops 1 part B); preview builds stay off for claude/* and dependabot/*; Vercel Pro before the first payment, because the Hobby plan is not for commercial use (27.14).
- Kapso: one number, the team inbox for hand-offs, the standby number on Kapso Pro before launch; the Kapso skills (integrate-whatsapp, observe-whatsapp, automate-whatsapp) guide 13b and PA2; Kapso's own automations and AI agent stay off for the Kabsi number so only Kabsi's code answers.

## 30. The coverage audit of 24 Oct, the design guarantee, tools, and the risks (24 Oct 2026)

Committed by Ops 1 part B as section 30 and recorded as R-90. Written by the lane R chat on 24 Oct 2026 (23:30 Beirut), checked against the repo (main at de36b23, after Clean 1), Resend and Vercel on 24 Oct. It wins over earlier sections where they differ.

## 30.1 Fixes to the merged plan
- Section 23 (the Growth row) and 27.14 (Growth) still say "Partners through Creem's affiliate program". Both now point to section 29: Kabsi's own ledger, Creem's affiliate program off.
- Partner payouts stay as section 29 says (Rashid approves, USDT or USDC from Rashid's wallet, PayPal in Hussein's name run by Rashid, bank and Wise later). Hussein does no work.

## 30.2 Every surface, who builds it (status on 24 Oct)
| Surface | What must exist | Session | Status | Gap closed by |
| --- | --- | --- | --- | --- |
| Home | 27.2 position, map plus phone hero, scan box, proof block | Web 2 | built (old position) | Web 2 |
| Free Visibility Scan | 28.1 fast part, full map, WhatsApp hand-off | V1, V4, Web 2 | missing | V1 engine, V4 product, Web 2 page |
| Profile Check page | replaced by the scan | Web 2 | built (old) | Web 2 redirects it to the scan |
| Review link and QR tool | free tool, counter card, table tent | Web 2, V3 | built (old style) | V3 cards, Web 2 style |
| Pricing | 27.4 table, honest comparison, FAQ, checkout buttons | Web 2, D | built (old) | D buttons, Web 2 page |
| How it works | tappable WhatsApp demo (24.4) | Web 2 | built (old) | Web 2 |
| Partners page, /p/, /s/, /partner | 29.3 | PA3 | /partners built (old), the rest missing | PA3 |
| Guides | 5 exist plus the 27.8 guides | SEO 1 | 5 built | SEO 1 |
| Industry pages | 6 exist, auto repair rename, hotels | Web 2, SEO 1 | 6 built | Web 2 style, SEO 1 content |
| Compare and city pages | 27.8 items 3 and 4 | SEO 1 | missing | SEO 1 |
| About, FAQ, Security | plain words, operator line | Web 2 | built | Web 2 |
| Privacy, Terms, Partner terms | 19.5, 29.5, every processor | C | built (old), partner terms missing | C |
| 404 and error pages | designed, a way back | Web 2 | basic | Web 2 |
| Login, token, unsubscribe, public review page, get-started, manager steps | calm, shared layout | Web 2 | built | Web 2 |
| Billing done page | after checkout | D | missing | D |
| Cookie bar and "Your privacy choices" | 20.4 | E | partial (old banner) | E |
| Status page | public uptime page at status.kabsi.co | lane R | missing | lane R sets UptimeRobot monitors and the page (30.6) |
| Onboarding (/start) | 28.5 first map | UX 1 | built (old) | UX 1 |
| Dashboard | Home, Visibility, Competitors, AI answers, Reviews, Review Growth, Profile, Reports, Kabsi activity | UX 1 | 4 tabs built | UX 1 |
| Settings | business, keywords and competitors, team and phones, notifications, plan, export and delete | UX 1, D | partial | UX 1, D |
| Staff pages | costs per business (25.8), partner approvals, payout list, ops | UX 1, PA1 | partial | UX 1, PA1 |
| WhatsApp, unknown and prospect | Nora sales, scan pick-up | B | missing | B |
| WhatsApp, owner, manager, staff | 9.3, 27.3, roles | B, 13b part 2, V1 to V4 | missing | B and the V sessions |
| WhatsApp, partner | 29.2 | PA2 | missing | PA2 |
| WhatsApp, staff_admin (Rashid) | alerts, commands, approvals | B, 13b part 2, PA1 | missing | B, 13b part 2 |
| WhatsApp templates | owner (B), staff (13b part 2), partner (PA2), billing (D) | as listed | missing | as listed |
| Map image | 28.2 | V1 | missing | V1 |
| Report image and PDF | weekly image for WhatsApp, monthly PDF on Pro | V4 | missing | V4 |
| Emails | the shared layout on every email, restyled | UX 1 | built (layout exists) | UX 1 |
| Email sending | kabsi.co and send.kabsi.co verified in Resend (eu-west-1) | C, Rashid | built | 30.4 |
| Resend webhook | bounces and complaints into the suppression list; the code exists (email/webhook, Svix) | Rashid, C | missing (0 webhooks in Resend; RESEND_WEBHOOK_SECRET not set) | 30.4 |
| DMARC | a DMARC record on kabsi.co | Rashid | not checked (the sandbox cannot read DNS) | 30.4 |
| Inbox test | Gmail and Outlook land in the inbox | C | missing | 30.4 |
| Voice notes | transcription | V3 | missing | V3, 30.5 |
| Payments | checkout and portal branded, receipts, failed payment flow | D | branding done, store name still "kabsi.co" | D, Rashid renames to "Kabsi" |
| Facebook and Instagram | name, bio, picture, cover, highlights, link | lane R, Rashid | pages exist, polish missing | 30.6 |
| LinkedIn page | company page | lane R, Rashid | missing | 30.6 |
| Search Console, Bing | 21.2 | SEO 1, Rashid | Search Console built, Bing missing | 21.2 |
| G2, Capterra, Product Hunt, Crunchbase | real listings | lane R, Rashid | missing | 30.6 |
| Link previews | WhatsApp, LinkedIn, X, Facebook | Web 2, SEO 1 | old images | Web 2 images, SEO 1 tests |
| Trust | operator line everywhere, security page, processors listed | Web 2, C | partial | Web 2, C |
| Operations | alerts (13b part 2), backups and runbook (C), cost per business (UX 1), status page (lane R) | as listed | partial | as listed |

## 30.3 New and moved work
- C gains: commit this section; the 30.1 fixes; the email items of 30.4 (C may touch only the sender address constant and the test route in the email function); the skill-creator skill from github.com/anthropics/skills into .claude/skills; ELEVENLABS_API_KEY as a planned name.
- V4 gains: the weekly report as an image sized for WhatsApp (1080 by 1350) and the monthly PDF (A4 and US Letter), both from the design system.
- Web 2 gains: the Profile Check page redirects to the scan; DESIGN.md at the repo root (30.7).
- lane R gains: the status page (30.6), the social and directory work (30.6), the competitor teardown and the design system (30.7).

## 30.4 Email, done completely
- Kabsi's own product mail goes from "Kabsi <hello@send.kabsi.co>" with Reply-To hello@kabsi.co, so the root domain keeps its reputation for people's own mail. Outbound later uses its own separate domain (27.9). C changes the sender constant.
- Rashid, in Resend (signed in as hello@kabsi.co): Webhooks, Add webhook, endpoint https://ynjdqjlmdwjgbfezevxy.supabase.co/functions/v1/email/webhook, events email.bounced, email.complained and email.delivered, Add. Open it, copy the signing secret, and save it in Supabase secrets as RESEND_WEBHOOK_SECRET. C then sends a test event and checks the suppression list.
- Rashid, in the DNS of kabsi.co: check the DMARC record (mxtoolbox.com, DMARC lookup, kabsi.co). If there is none, add a TXT record named _dmarc with the value v=DMARC1; p=none; rua=mailto:hello@kabsi.co. After two clean weeks, change p=none to p=quarantine.
- C: one test email of every type through the existing test route to hello@kabsi.co, plus one to a mail-tester.com address (score 9 out of 10 or better), plus Rashid's Gmail and an Outlook address added for this test only; each must land in the inbox, not spam. Report the scores and any fix.

## 30.5 ElevenLabs (Rashid's own account)
- Use: Scribe for owner voice notes if V3's 20-note test picks it (key ELEVENLABS_API_KEY in Supabase secrets only); voice-over for the 20-second demo loop, ads and reels, made outside the repo.
- Do not use: voice replies to owners in WhatsApp, a phone agent, or any voice for Nora in 2026 (27.3, Front Desk is text first).

## 30.6 Online presence (lane R writes, Rashid posts)
- Facebook and Instagram: name "Kabsi", the mark as picture, a cover from the design system, a bio from 27.2 with kabsi.co, highlights (How it works, Free scan, Pricing, Partners), the link to kabsi.co with UTM tags. After the design system is approved.
- LinkedIn company page: same name, mark, cover and line; Rashid as founder.
- G2, Capterra, Product Hunt and Crunchbase: listings written by the lane R chat, posted by Rashid in launch week. Product Hunt launch about 30 days after launch, with real proof only.
- Status page: the lane R chat creates UptimeRobot monitors (kabsi.co, the health function, the WhatsApp webhook, the Creem webhook) and a public status page; Rashid points status.kabsi.co at it if he wants the subdomain.

## 30.7 The design guarantee (before Web 2 starts)
1. Teardown first, by the lane R chat: Localo, Semrush Local, BrightLocal, Podium, Local Falcon and Birdeye, for clarity, trust and conversion: what each says in 5 seconds, how it shows proof, pricing clarity, onboarding friction. A one-page brief of what Kabsi does better. No copying.
2. The design system in the Design System type, from the tokens (K-108) and KABSI-DESIGN.md: colour, type, spacing, radius, shadows, icons (one icon set), buttons, inputs, cards, lists, badges, empty, loading and error states, the WhatsApp chat bubble, the map grid (a colour-blind-safe scale with the rank number in each pin, never red against green alone), report image and PDF, email layout (light and dark mail clients), OG image templates, social profile images, motion rules (durations, easing, reduced motion), and right-to-left readiness for the later Saudi step (logical spacing, mirrored icons).
3. A copy deck per page, written with the kabsi-copy skill before mockups, so no mockup carries placeholder text.
4. Mockups at 390 and 1440 px: every page type (home, scan result, pricing, how it works, tool, guide, industry, compare, city, partners, partner page, prospect report, about, legal, 404 and error, login) and every app screen (onboarding steps, each dashboard tab, settings, plan, notifications, staff), plus the WhatsApp screens (owner, partner, staff_admin, unknown), the map image, the report image and PDF, three emails and the Creem checkout as Kabsi will style it. Rashid approves each in the Design artifact; nothing is built from an unapproved screen.
5. DESIGN.md at the repo root (about 8 KB) written from the approved system, modelled on the awesome-design-md format but only Kabsi's own content. Every UI session reads it first.
6. One shared layout and component set, no page-specific styling, enforced in CI (22).
7. Visual regression in CI: Playwright screenshots of every route at 390 and 1440 px compared to the approved baseline; an unexplained change fails.
8. Every visual Kabsi sends meets the same bar: map image, report image and PDF, OG images, emails (tested in Gmail, Outlook and Apple Mail, light and dark), WhatsApp previews, social images, the Creem checkout.
9. The gates of 22 and 24 stay: the 5-second test with 2 people who never saw Kabsi, speed and accessibility budgets in CI, real iPhone and Android checks, loading, empty and error states, the page-by-page review at 390 and 1440 px.
10. Before launch, a usability test with 3 real owners (UAE or UK first; if not found in time, any English-speaking owners, with the Abou Hamze pilot as the fourth): tasks are understand Kabsi in 5 seconds, run the scan, start the trial, add Kabsi as Manager, connect WhatsApp, approve a reply, find the report. Any task where 2 of 3 get stuck is fixed before launch and retested with 1 new owner.

## 30.8 Tools decided
- Add: libphonenumber-js (session B: every owner, staff, partner and "Ask a customer" number checked and stored in E.164); the small Turf modules @turf/destination and @turf/helpers (V1: grid points at a distance from the pin); Anthropic's skill-creator (C installs it; A, D and V1 use it for kabsi-eval, kabsi-billing and kabsi-data-providers); knip (already used in Clean 1); Lighthouse CI (C), axe with Playwright (Web 2, UX 1).
- Outside the repo, for marketing: instagram-agent-skill, used in the lane R chat or claude.ai for reels scripts, captions and profile audits; it never posts or logs in.
- Not used: ECC and its AgentShield (Sec 1 already runs CodeQL, gitleaks, dependency review, the Supabase advisors and its own checks; no third-party agent framework in the security session); Baileys and whatsapp-web.js; Google Maps scrapers; Ruflo; MiroFish; worldflowai/everything-claude-code.

## 30.9 The five biggest risks no session covered (now each has an owner)
1. Meta verification needs a registered business. Kabsi has none; the portfolio is unverified, so business-started conversations stop at 250 a day, the username waits, and the display name could be refused. Owner: Rashid decides the verifying entity before about 150 a day (9.5); the lane R chat prepares the documents question with him at the launch gate.
2. Real demand for the new modules is unproven. No owner in the UAE or UK has seen a map from Kabsi. Owner: Pilot 1 (lane R and Rashid, from Wave B): 5 pilot businesses in the UAE or UK found through partners, Rashid's network and Kabsi's social pages, each given a free scan and a 30-day trial; gate before Web 2 merges: 3 of 5 say the map and report are worth paying for.
3. Data that looks wrong kills trust. Grid ranks and AI answers vary. Owner: V1 and V2 add a calibration check: for 3 real businesses, the grid's centre rank matches a manual Maps search from that spot, and AI answers are labelled as samples; any mismatch is fixed before the first report goes to an owner.
4. Cash before revenue. After 17 Nov the AI credit ends; DataForSEO (50 once), Kapso Pro (25 a month), Supabase Pro (25), Vercel Pro (20) and Gemini come before the first payment. Owner: the lane R chat times each upgrade to its gate (Supabase and Vercel Pro at the first payment, Kapso Pro at launch, DataForSEO at the launch gate) and the staff page shows monthly fixed costs against MRR.
5. One person runs everything. Approvals, hand-offs, partner applications, payouts and support all land on Rashid. Owner: 13b part 2 and PA1 batch staff work into one morning digest with one-tap actions, Nora answers every question the facts cover before handing off, and the runbook (C) keeps each failure to one page.

## 30.10 Google's policies on record (lane R decisions of 25 Oct 2026, R-91)
Session 19 rest read Google's current Business Profile APIs policies, third-party policies, Maps Platform terms and Places policies on 24 Oct 2026 and found where they touch the design. The full record, with the quotes and the retention table, is docs/GOOGLE-ARCHITECTURE.md. Decided:
1. *Changed by the lane R chat on 25 Oct 2026 (30.10.1): Google's 30 days include the backups. Google data is deleted 7 days after a business leaves, not 30, and backups are kept 21 days, not 8 weeks (`scripts/backup/backup.sh`, the backup workflow and the RUNBOOK), so the worst case is 28 days. The sign-up name and address picked from Places are overwritten from the Business Profile on the first successful sync; UX 1 removes Places from onboarding later.* Retention. Using Business Profile content to manage that same business for that same owner is use inside Kabsi's Business Profile project, so Kabsi keeps it while the business is connected and managed by Kabsi. It is never used for anything else: no comparison across customers, no benchmarks, no marketing, no model training, no sales. Everything from the Business Profile APIs is deleted within 30 days (7 days since 30.10.1) after the business disconnects, removes Kabsi as Manager or closes its account; the retention jobs enforce it. Results Report trends are built only for that owner.
2. The Visibility Map and Competitor Watch use only DataForSEO public results for every business in them, the owner's own position included, even when a competitor is a Kabsi customer. No customer's Business Profile data is ever compared with, or shown next to, another business.
3. Nothing from Places is stored except place_id. The free scan's public profile facts are fetched live each time, shown with Google's attribution and never cached; only DataForSEO results are cached (7 days).
4. The Results Report, the dashboard and the PDF have two separate labelled sections, "From your Google Business Profile" and "From public Google Maps and AI checks by Kabsi", never mixed in one number or chart. The map image says "Kabsi rank check, not provided by Google".
5. Notices. Within 48 hours of Kabsi becoming Manager, and of any change to that access, the owner gets an email and a WhatsApp message saying so (built in session 19 rest in the Google access flow). The onboarding Manager step and the access email say "Google Business Profile is free from Google. Kabsi is an independent paid service." with a link to Google's "Working with a third party" help page. The footer, pricing page and terms carry it in Web 2.
6. In the cached prompt the business's facts come before the owner's recent replies (26.1 confirmed in this order).
7. Session 19 rest adds the publication pipeline side for approving an hours change and a typed post from WhatsApp, so 13b part 2 can wire the buttons.
8. Rashid's real phone number is replaced with fictional +1 555 numbers in tests and archive docs; the ones in the WhatsApp area are listed for 13b part 2.
9. Visibility results (map grids, competitor rows, AI answers) are kept while the business uses Kabsi and deleted 30 days after it leaves.

## 30.11 Lane R, 25 Oct 2026: one reference, faster sessions (R-92)
1. The design system is approved by Rashid and lives in two places: the "Kabsi Design System" artifact in the lane R chat (live previews) and `DESIGN.md` at the repo root (the contract for code). New tokens: kb-green-ink, kb-green-soft, kb-red-ink, kb-red-soft (text and pill grounds that pass 4.5:1), the map scale map-rank-top, map-rank-mid, map-rank-low (with an amber ring), map-rank-none, and the wa-* tokens for WhatsApp mockups. The map never puts red against green; this replaces 28.8's "fills in green and red".
2. The copy for every page, screen, WhatsApp message, image, email and the checkout is `docs/COPY.md`. Decisions in it: the main button is "See your map", the second "Try it on WhatsApp"; under every main button "Free for 14 days. No card. Cancel in WhatsApp."; the About page shows no address (R-55 holds over 24.6); the Weekly Care Report is the Results Report everywhere; while free_scan_daily_cap is 0 the scan box shows a waitlist.
3. The competitor teardown (30.7 step 1) is `docs/source/KABSI-TEARDOWN.md`.
4. Rashid's rule: a session never loops on a problem that can wait. It writes it under Known limits, adds a row to `docs/LATER.md`, and moves on. The lane R chat clears that list at the launch gate or when an item starts blocking real work.
5. Session working rules are in the kabsi-build-session skill, section "Working fast": no sleep polling, never wait for Lighthouse, Load only when its paths change, merge main and go green again right before merging, unique migration timestamps registered in schema_migrations, one try at a Supabase connector prompt then hand the SQL to the lane R chat, UI work reads DESIGN.md and COPY.md and uses the webapp-testing skill.
6. When a session's connector prompt times out, the lane R chat may apply that session's additive migration with execute_sql and register its version, and checks the function bodies by md5 against the branch file (done for PRs 210 and 211 on 25 Oct).
7. Nobody at Kabsi writes, edits or asks for a review to test anything. The Pub/Sub path is proven by the next natural review.
8. Order from here: Fix 1 (Sonnet: Kapso webhook with its own secret_key, template errors logged and resubmitted, the reply parser that rejects JSON followed by text, the evaluation false alarms, Nora's hand-off details, the number-health email wording, one hand-run evaluation under 3 US dollars), then session D (Creem, Opus) and V1 (Opus) in parallel, then 13b part 2 after Rashid's phone test passes.

## 30.12 Testing without Rashid's hands, and the test budget (lane R, 25 Oct 2026, R-93)
1. Budget: Rashid allows up to 50 US dollars of the promotional Anthropic credit (about 99 US dollars until 17 Nov 2026) for testing. Each prompt names its cap; the session stops at it and reports the spend. Planned: Fix 1 evaluation 3, QA 1 live journeys 8, V2 to V4 prompt checks 15, the final full evaluation before 17 Nov 10, reserve 14. EVAL_LIVE stays false; runs are by hand through eval-live.yml.
2. Manual tests become automated, in session QA 1 (Sonnet, after Fix 1 and D merge), with open-source tools only: Playwright (already installed in sessions), Playwright's own screenshot comparison for visual regression (30.7.7), @axe-core/playwright for accessibility, Lighthouse CI (already), and the webapp-testing skill.
   - Web journeys against production with a test account and the demo business on mock Google (R-17): scan page, sign-up, onboarding steps, approve, Undo, Cancel a waiting post, plan page. Screenshots at 390 and 1440 px.
   - WhatsApp journeys without a phone: a replay harness signs Kapso-format webhook payloads with the stored secret (inside the function, never printed) and posts them to the live whatsapp function from fictional +1 555 test phones bound to the demo business; every outbound reply lands as mock_sent in the outbox and is asserted. It runs every script in docs/progress/archive/2026-10-25-session-13b-1.md.
   - Real delivery proof without a person: one utility message to Kabsi's own allow-listed test phone and Kapso's delivered status read back. A real inbound message stays one 10-second step for Rashid, once.
   - Payments: Creem test mode checkout driven by Playwright with Creem's test card, then the webhook and the plan state read back (after session 10).
   - Emails: every template rendered in Playwright in light and dark, and Resend's delivered events read back. Gmail and Outlook rendering stay in docs/LATER.md for Web 2.
   - A nightly GitHub Action runs the smoke subset against production and sends a staff WhatsApp alert on failure.
3. What stays human: the first real inbound WhatsApp message, the 5-second test with people who never saw Kabsi, the usability test with real owners (30.7.10), and reviews, which only real customers write.
