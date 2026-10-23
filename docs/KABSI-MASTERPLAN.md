# Kabsi master plan (lane R chat, 23 Oct 2026, v3.2, with addenda 1 and 2 of 23 Oct merged in)

Decided by the lane R chat on Rashid's authority. Session 19's PR 0 copied this file into the repo as docs/KABSI-MASTERPLAN.md with the lane R chat's addendum of 23 Oct 2026 (10:40 Beirut) merged in (sections 0, 9.8, 9.9 and 17), recorded R-55, R-56 and R-58 to R-64 in plan section 4 and added section 17's waves to plan section 7. The addendum won over the master plan wherever they differed. Where older plan text disagrees, this file wins.

Numbering note: plan section 4 already used R-55 (identity), R-56 (homepage hero) and R-57 (free Google Profile Check) on 22 Oct 2026. In this file, R-55 means the Kapso account (section 0) and R-56 and R-63 mean skills and tools (section 14); plan section 4 records those two as R-55b and R-56b so neither pair of rows is overwritten.

Addendum 2 (23 Oct 2026, 11:30 Beirut) is sections 18 and 19 below, recorded as R-65 and R-66 in plan section 4; its updated waves are at the end of section 17. Its small fixes: number alerts by email go to hello@kabsi.co only (section 9.9, R-32); the facts file's "no WhatsApp number" line changes in session 13b part 1 (section 9.8); R-55b and R-56b stay as numbered and R-58 stays reserved.

What stays fixed: Google's API and review rules (no review gating, incentives or fake reviews; owner approval before anything is published), Meta's WhatsApp rules, payment processor rules and consumer law. Breaking them gets Kabsi's Google access, WhatsApp number or payments shut off, which ends the business; everything else is open.

GitHub: the only account is itskaysyoga-gif (itskaysyoga@gmail.com, Rashid's).

## 0. Where things stand (23 Oct 2026)
- Built and live: sessions 7 to 16, 18, 20a, 20b, hotfix 20h and the 22 Oct sync session (R-47 to R-54 in the plan). Google reviews API open since 22 Oct; Google live on Yawmiyati; the first real reply published and verified; post removal, post Undo, the session-ended screen and the consent token fix live; places_daily_cap 20; homepage hero search and the free check flags live; Rashid Abou Hamzy named as operator, Creem as merchant of record.
- Moved from session 18 to session 19: the post Undo test on the prepared Update (tap the Update's own Approve, not "Approve the month") and P0.7-03 Pub/Sub.
- Kapso number: done (23 Oct 2026, section 9.8).
- Waiting on people: Creem test keys and the webhook secret in Supabase (session 10).
- R-55: one Kapso account under rashid.abouhamzy@yawmiyati.com for Kabsi and Alo King, hello@kabsi.co an owner of the Kabsi.co project; a deliberate exception to R-32 so one paid plan covers both businesses.

## 1. Position: Kabsi runs on WhatsApp (R-60)
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
Nothing in Arabic appears on the website, in marketing, ads, the public facts, llms files, guides, industry pages, screenshots or Outbound. Lebanese or Arabic examples in public copy become US examples. The product still works in Arabic where the owner or the reviewer writes it, silently. Spanish is shown where it helps US businesses.

## 4. Website and conversion
- Visual redesign from mockups the lane R chat draws (homepage, free check, pricing at 390 and 1440 px), approved by Rashid, built with the design tokens and the frontend-design skill. Phone speed 90 or more.
- Homepage: hero (H1, subline, business search box for the free check, a "Try it on WhatsApp" button once the number is live); a phone showing a WhatsApp chat with Nora (labelled Example): a review alert, "Yes", "Live on Google"; the four pillars; how it works (sign up, add Kabsi on Google, connect WhatsApp, reply Yes); industries; pricing; "Cancel from WhatsApp any time"; founder note; FAQ; final button.
- Conversion levers (all real): the free check showing the business's own gaps; the 14-day trial with no card; the founding offer (first 30 paying businesses keep their price, count shown live); a price anchor; risk reversal (cancel in WhatsApp); the first value in 10 minutes; trial reminders; retargeting once ads start.
- Click-to-WhatsApp: the hero button and Meta's Click-to-WhatsApp ads open a chat with Nora, who runs the free check inside WhatsApp and starts the trial from there.
- Free tools: the Google Profile Check (lead magnet) and the Review link and QR (search magnet). No reply writer tool.
- Add to Home Screen for the dashboard (PWA).

## 5. SEO and AI answers
Pages: the two tools, industry pages (6 to 10, US examples), guides (reply to a bad review, holiday hours, add a manager, more reviews within Google's rules). Structured data: Organization with sameAs, SoftwareApplication with prices, FAQPage, HowTo. knowledge/kabsi-facts.md stays the single truth; llms files rebuilt from it; every page states what Kabsi is, who it is for, the prices, that it runs on WhatsApp and that it is independent of Google.

## 6. Funnel gates (30 days after launch)
Visit or ad, free check, sign-up, Manager access, WhatsApp connected, first Yes, paid. Gates: free check to sign-up 5 percent; sign-up to Manager access 40 percent; access to WhatsApp connected 80 percent; first Yes within 10 minutes 70 percent; trial to paid 20 percent. A miss gets one fix session; a second miss changes the step.

## 7. Dashboard (smaller job)
Setup, settings and history only. Home is one list "Waiting for you" (the same items WhatsApp sends) and "Done this week"; four tabs (Home, Reviews, Profile, Reports); account menu for WhatsApp, Team, Plan, Settings. No button acts on several things without saying how many; none shows when there is nothing to act on. Usability gate: Rashid and the Abou Hamze owner each finish approve, keep, post and find the report without help in under 2 minutes in total. One session, after WhatsApp.

## 8. AI brain and agents
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
Not offered: competitor rankings, duplicate listing detection, removing reviews, review gating.

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
- Staff phone: Rashid, +961 3 956 917, opted in by messaging the Kabsi number on 23 Oct. Session 13b gives this phone the staff_admin role.
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
Prices: Essentials 19 a month or 190 a year; Pro 39 or 390; extra location 15 or 150. 14-day Pro trial, no card. Founding offer: the first 30 paying businesses keep their price while subscribed. Creem is merchant of record.
Before session 10, typed only into Supabase secrets, never into a chat: CREEM_API_KEY (test mode) and CREEM_WEBHOOK_SECRET. Hussein adds the webhook in Creem (Developers, Webhooks) pointing at https://ynjdqjlmdwjgbfezevxy.supabase.co/functions/v1/billing-creem and copies its signing secret; session 10 builds the function under exactly that name. It verifies Creem's signature on every call, refuses anything unsigned or stale, stores each event id once, and is the only writer of paid state.
WhatsApp and email: day 11 "Choose your plan" with a Creem checkout button for that business; day 13 reminder; day 14 approvals pause, nothing lost; failed payment: "Your card did not go through. Update it here" (portal), reminders day 3 and day 6 of the 7-day grace; after grace paused, data kept 30 days; yearly renewal reminder 7 days before; card updated confirmation; "invoice" and "cancel" answered with the Creem portal at once.

## 11. Industries
Launch set with US examples, page, reply tone, post ideas, photo and attribute checklists: restaurants, cafes, salons and barbers, auto repair, dentists and clinics (never confirm someone is a patient), hotels. After launch: service-area trades, gyms, retail, professional services.

## 12. Onboarding (10 minutes)
Profile Check or Click-to-WhatsApp, sign-up, add Kabsi as Manager (guide with live status, "send to my manager"), five questions, connect WhatsApp (QR on desktop, one tap on a phone), the first review alert arrives in WhatsApp before the owner closes the page. Measure time to first Yes.

## 13. Kabsi Outbound with Harvey (after the launch gate)
Private repo itskaysyoga-gif/kabsi-outbound imported from github.com/ethanplusai/harvey at that time; a daily scheduled run in claude.ai/code; drafts approved on Rashid's phone in /staff/outbound; sender "Nora at Kabsi", signature "Nora, Kabsi's AI assistant. Rashid Abou Hamzy, founder, reads every reply."; footer: Kabsi, 451 Harwinton Ave, Torrington, CT 06790 and "Reply 'no thanks' and we will not write again"; a separate sending domain on Zoho Mail Lite with SPF, DKIM and DMARC and two weeks of warm-up; OpenStreetMap and the business's own website only; Email 1 plain text, under 80 words, no link, one real detail, "Want me to run a free check of <business>'s Google profile and send you what I find?"; a yes gets the check result, the founding offer and the WhatsApp button within minutes; one follow-up on day 4; US, auto repair, salons and barbers, cafes and restaurants first; 20 a day for two weeks then 30, hard stop at 300; kill-gate fewer than 3 replies that lead to a check or trial.

## 14. Skills and tools (R-56, R-63)
Committed to .claude/skills: kabsi-build-session and kabsi-reply-lab (from kabsi-skills.zip, with the R-41 and R-43 to R-46 edits), kabsi-outreach renamed kabsi-outbound with section 13, a new kabsi-copy (plain English for owners, the approved lines in section 1, no Arabic shown, no dashes or exclamation marks, K-112), Anthropic's frontend-design, supabase/agent-skills, Kapso's agent skills. context7 on trial in .mcp.json. Not used: obra/superpowers, scroll-craft, open-seo, VoiceStudio; hyperframes only for ad videos later.

## 15. Before launch, do not forget
Nora first for support, then the Kapso team inbox and hello@kabsi.co; self-serve cancel, export and deletion; status page (UptimeRobot on hello@kabsi.co); Supabase Pro with a restore test; Vercel Pro; AI cost per business on the staff page with an alert above 3 US dollars a month; a draft within 5 minutes of a new review; the four auth email templates pasted again; the Resend webhook and news domain; delete turnstile-diag; Calendly; the lawyer's read; one phone pass.

## 16. Founding customers and growth order
Abou Hamze Auto Center first (live pilot, in English), then Outbound to US businesses, Click-to-WhatsApp ads once trial to paid is proven, then Kabsi Partners.

## 17. Session order from Sunday 25 Oct, with parallel sessions (addendum C of 23 Oct 2026)
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
- Weekly database dump by a GitHub Action, encrypted with an age public key in the repo (Rashid keeps the private key offline, printed and in his password manager), stored in a private Cloudflare R2 bucket, 8 weeks kept. Storage photos copied weekly to the same bucket.
- Weekly git bundle of kabsi-canvas (and kabsi-outbound later) to the same bucket, because Kabsi has one GitHub account and an earlier account was banned.
- A restore drill once a month: the newest dump into a scratch database and the newest bundle cloned; the result goes in the daily staff summary. Gate: no paying customer before one drill passes.

### 19.2 No single point of failure
- Google access: owners add only the Kabsi group (KABSI_GROUP_ID). The group gets a second Kabsi-owned Google account as a member, both with 2-step verification, so losing one account does not cut off every business.
- WhatsApp: the standby number on Kapso Pro (section 9.6). The sender sits behind one interface, so moving from Kapso to Meta's Cloud API directly is one module. Alert when Kapso credit falls under 5 US dollars.
- AI: model names live in one place (models.ts); a retired model is a one-line change. When the AI provider is down, drafts wait in the queue and nothing wrong is sent.
- Domain kabsi.co: auto-renew on, registrar lock on, 2-step verification on the registrar.
- Vercel Pro before payments (section 15).

### 19.3 Things that keep working
- Skills are copied into the repo, so they never change underneath a session. context7 is optional; nothing depends on it.
- Package versions stay pinned (lockfile, exact versions in npm: imports). Dependabot security updates on, with .github/dependabot.yml; updates merge only on green CI.
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
- Cookie consent for visitors from the EU and UK before PostHog loads.
- The lawyer's read before launch (section 15).

### 19.6 Rashid's own list (once, before launch)
- 2-step verification with an authenticator app on GitHub, Supabase, Vercel, Cloudflare, Kapso, Meta, Google (both Kabsi accounts), Anthropic, Resend, PostHog, Sentry and the domain registrar; Hussein the same on Creem.
- Recovery codes printed and kept offline.
- Create the second Kabsi Google account and add it to the group.
- Create the R2 bucket and an R2 token for the backup Action, typed only into GitHub secrets (Ops 1 gives the exact names).
