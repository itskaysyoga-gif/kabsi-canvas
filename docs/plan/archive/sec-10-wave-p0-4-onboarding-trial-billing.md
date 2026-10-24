<!-- Moved verbatim from docs/KABSI-PLAN.md on 24 Oct 2026 (docs diet, master plan 27.12). The index is docs/KABSI-PLAN.md. -->

## 10. Wave P0.4: onboarding, trial and billing

Goal: an owner finds their business, sees the free snapshot, signs up, gives Kabsi Manager access with help at every step, confirms their details, and reaches first value; the trial and Creem billing work, and every email is one template.

Done when (wave): five test owners go from search to connected and first value in under 4 minutes on the mock, each scenario screen has been walked; the trial clock starts only at working access; a Creem test checkout on a phone creates an active subscription from the webhook; every email renders in Gmail, Apple Mail and Outlook with a plain-text version.

Run order in this wave: P0.4-09, P0.4-01, P0.4-02, P0.4-03, P0.4-04, P0.4-05, P0.4-06, P0.4-08, P0.4-10, P0.4-11, then P0.4-07 as soon as D1 and the Creem keys exist.

### P0.4-01 Free snapshot and Google Profile Check

- Decisions: K-91 (snapshot before sign-up), K-45 step 1, K-82 note (public data only), G-27, G-24, K-100, K-62 (public data only, never the Business Profile API), design review "Free tools".
- Touches: public function `profile-snapshot` (Turnstile, per-IP rate limit, 3 checks per visitor a day, the Places kill switch, 24-hour cache, field mask: rating, review count, hours, open status, phone, website, category, photo presence), page `/google-profile-check` and onboarding steps 1 and 2 before sign-up ("Which business is yours?", "Here's what customers see"), findings labelled Urgent, Recommended, Nice to have, never a score; "Email me this check" with an unticked "Send me tips" box stored with consent proof; Google attribution; "Kabsi can take care of these. You approve each one." with the R-02 button.
- Depends on: P0.2-06, P0.1-05.
- Model: Sonnet.
- Done when: a check on a real business returns the snapshot with no reviews field requested (request log or code); the fourth check from one visitor in a day is refused; the email capture stores consent text, time, page and choice; no snapshot data is stored past the cache window (SQL).
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo itskaysyoga-gif/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.4-01, then docs/KABSI-PROGRESS.md. Do only task P0.4-01. Follow section 2: apply database changes yourself, open the pull request, make sure CI is green, update PROGRESS on the branch, merge the pull request yourself, run the After-merge checks you can, then give Rashid the PR link and a 3-line summary. Stop and ask only before dropping tables or columns or deleting real data.
Read K-91, K-100 and G-27, and the "Free tools" and "Signup, login and onboarding" sections of docs/source/KABSI-DESIGN.md. Public data only. Add the new function to supabase/config.toml.
```

### P0.4-02 Sign-up sheet: Continue with Google or an email code

- Decisions: K-91, R-11, K-100 (email-code abuse limits), G-16 (Turnstile, disposable domains), D225.
- Touches: `src/routes/login.tsx` and a shared sign-up sheet shown after the snapshot ("Save your snapshot and continue"): "Continue with Google" (primary, standard Google mark per Google's branding rules) and "Continue with email" (6-digit code); Turnstile on the email form; at most 3 codes per address per 15 minutes and 10 per IP per hour; codes expire in 10 minutes; disposable-domain list; no passwords. Rashid step 5 in section 5.
- Depends on: P0.4-01.
- Model: Opus (auth).
- Done when: a new Google account signs up and lands on the next onboarding step with the snapshot kept; the email path still works; the fourth code request in 15 minutes is refused; the Google sign-in requests only openid, email and profile (inspect the authorize URL).
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo itskaysyoga-gif/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.4-02, then docs/KABSI-PROGRESS.md. Do only task P0.4-02. Follow section 2: apply database changes yourself, open the pull request, make sure CI is green, update PROGRESS on the branch, merge the pull request yourself, run the After-merge checks you can, then give Rashid the PR link and a 3-line summary. Stop and ask only before dropping tables or columns or deleting real data.
Read K-91 and K-100. Give Rashid step 5 from section 5 and wait for his "done" before testing Google sign-in. Sign-in asks for basic scopes only.
```

### P0.4-03 Manual Manager route with a live status

**Changed 21 Oct 2026 (K-141).** This is onboarding step 3 of six: add Kabsi as Manager, with the live status. The one-tap "Connect with Google" stays P1-18. No Lebanon, card or partner wording on any card; "Someone else manages my listing" stays for an agency the owner uses (they are invited as Manager in Team).

- Decisions: K-93, K-04, D293, design review "The add Kabsi as manager guide".
- Touches: `ManagerAccessInstructions` and `/manager-steps`: five cards, one step each, device-specific with a "Show me the other version" switch, the group ID large with Copy ("Copied"), desktop screenshots from input I2 in `public/help/manager-steps/desktop/` (step-1 to step-6; phone uses text steps until phone screenshots arrive), the 20-second loop slot for W3, live pill "Waiting for your invitation. We check every 30 seconds." turning green "Invitation received. You're connected" (before Gate A: "We'll email you when access is ready" because staff accept by hand), exits: send these steps to my other device (email or a wa.me link), someone else manages my listing (ready message), book a free setup call.
- Depends on: P0.4-02, P0.1-V3.
- Model: Sonnet.
- Done when: the guide works at 390 px and desktop; Copy works on iOS Safari's fallback path (existing `copyText`); the status pill reads `google_connections.access_state`; "send to my other device" sends one email with a one-tap link back to the step.
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo itskaysyoga-gif/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.4-03, then docs/KABSI-PROGRESS.md. Do only task P0.4-03. Follow section 2: apply database changes yourself, open the pull request, make sure CI is green, update PROGRESS on the branch, merge the pull request yourself, run the After-merge checks you can, then give Rashid the PR link and a 3-line summary. Stop and ask only before dropping tables or columns or deleting real data.
Read K-93 and the manual guide section of docs/source/KABSI-DESIGN.md. Keep the group ID in KABSI_GROUP_ID only. Never ask for a password or a code.
```

### P0.4-04 Diagnosis, scenario screens and reminders

- Decisions: K-94, K-95, K-96, K-97, K-98, K-61, K-114.3 (never delete a duplicate), K-116.8, guardrail 13.
- Touches: the three tappable questions (manual route), scenario screens with one layout (what is happening, at most four steps, the button to Google's exact page, "I've done it", the setup-call link): manager not owner, needs verifying, Google is reviewing, suspended, someone else owns it or lost login, no profile in this account, not eligible, several locations, workspace admin blocks; trial clock paused for each per K-94; reminder emails at 1 hour, 24 hours and 72 hours for owners stopped at the invite, verification check-backs every 2 days, ownership reminders on day 3 and day 7; a staff task for a personal WhatsApp nudge at 72 hours when a phone number exists; all reminders stop at access or unsubscribe; the duplicate-profile guidance.
- Depends on: P0.4-03, P0.4-09.
- Model: Sonnet.
- Done when: each scenario screen is reachable from the questions and walked once (list in PROGRESS); reminder jobs fire at the right times on a test account with time travel in tests and stop on access; a not-eligible business never starts a trial (test).
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo itskaysyoga-gif/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.4-04, then docs/KABSI-PROGRESS.md. Do only task P0.4-04. Follow section 2: apply database changes yourself, open the pull request, make sure CI is green, update PROGRESS on the branch, merge the pull request yourself, run the After-merge checks you can, then give Rashid the PR link and a 3-line summary. Stop and ask only before dropping tables or columns or deleting real data.
Read K-61 and K-94 to K-98 in docs/source/KABSI-AUDIT.md and the scenario screens in docs/source/KABSI-DESIGN.md. No Google jargon on any screen. Link each scenario to its guide only when that guide exists.
```

### P0.4-05 Five questions and confirm your details

**Changed 21 Oct 2026 (K-141, K-129).** Steps 4 and 5 of six. While access is pending (step 4) the screen offers the five questions and "Connect WhatsApp" (the one-time-code chat from P0.8-03; hidden until that has merged). After access is confirmed (step 5): confirm your details, then the day-one backlog card from P0.3-10 ("We found 23 unanswered reviews. Replies are ready."). The banner reads "Your 14-day Pro trial has started. No card needed." (30 days through a partner link). Target metric: the first approval within 10 minutes of access, measured from `google_access_granted` to `reply_approved`.

- Decisions: K-45 steps 4 and 5, K-18, K-10.
- Touches: onboarding "Five quick questions" (sign-off, tone with three tappable examples, a contact route for unhappy customers, one thing customers love, one thing never to say), skippable, shown while access is pending; "Confirm your details" once access is confirmed (name, phone, hours, website, category, open status: Correct or Change), written as owner-verified facts and the Protection baseline; then the first Home with the first prepared items and "Your 14-day free trial has started. No card needed." (shown only after R-02's launch gate; before it "Early access").
- Depends on: P0.4-04, P0.3-01.
- Model: Sonnet.
- Done when: answers land in `knowledge_facts` as verified, source owner; confirmed fields show "Approved by you" on Google Profile; skipping uses safe defaults.
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo itskaysyoga-gif/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.4-05, then docs/KABSI-PROGRESS.md. Do only task P0.4-05. Follow section 2: apply database changes yourself, open the pull request, make sure CI is green, update PROGRESS on the branch, merge the pull request yourself, run the After-merge checks you can, then give Rashid the PR link and a 3-line summary. Stop and ask only before dropping tables or columns or deleting real data.
Read K-18 and K-45. Use the facts RPCs from P0.3-01; do not write knowledge any other way.
```

### P0.4-06 The trial

**Changed 21 Oct 2026 (K-126, K-127).** Built in session 5. Follow-up, done in session 10 with P0.4-07: the trial is 14 days of Pro, 30 days through a partner link (the `via` code, P0.8-12); `entitlements(org)` returns the plan (`essentials`, `pro` or none) and each feature checks it per K-126 (Essentials: alerts and replies, WhatsApp approve, backlog, put-back, review link and QR, manager chat, staff Send link, holiday reminders, Weekly Care Report, Business Knowledge, Nora, the Coach checklist; Pro adds auto-fix, WhatsApp photo drop, weekly posts, review graphics, What customers say, the Coach actions, the order button, search terms, the fake review helper, and team roles and approval rules). The trial caps stay (3 fixes, 10 backlog drafts, 100 generations). `partner_covered` goes in P0.8-01. There is no Free plan: a business with no plan keeps its review link and QR code and nothing else runs.

- Decisions: K-101, K-94 (clock), K-48 (grace), R-24, R-16.
- Touches: `subscriptions` trial fields and a single `entitlements(org)` function every feature checks; trial starts at working access to a verified profile; one trial per place ID and per Google account (returning listings go straight to paid with settings restored); caps: 3 profile fixes of the owner's choice, 10 backlog drafts, 100 AI generations (silent cap then ask to subscribe or book a call); day 14 to 21 grace (watching and drafting continue, nothing publishes, Home shows what is waiting); day 21 removes access through the disconnect job and tells the owner; the trial emails (day 2 first win, day 7 your week, day 11 three days left, day 14 trial ended) are sent by P0.4-10.
- Depends on: P0.1-09, P0.2-02.
- Model: Opus (billing logic).
- Done when: tests cover each cap, the one-trial rules, grace and the day-21 removal; a concierge or not-eligible business never starts a trial; `plans` and `plans_v2` are no longer read by features (grep).
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo itskaysyoga-gif/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.4-06, then docs/KABSI-PROGRESS.md. Do only task P0.4-06. Follow section 2: apply database changes yourself, open the pull request, make sure CI is green, update PROGRESS on the branch, merge the pull request yourself, run the After-merge checks you can, then give Rashid the PR link and a 3-line summary. Stop and ask only before dropping tables or columns or deleting real data.
Read K-48, K-94 and K-101 in docs/source/KABSI-AUDIT.md. One entitlements function decides access; billing state never touches google_connections. Tests first.
```

### P0.4-07 Creem: checkout, webhook, portal

- Decisions: K-106, K-107, K-48, G-29 (cancel question and pause), G-30, R-24, G-47 (Purchase event hook point).
- Touches: Creem products in US dollars: Essentials monthly $19 and yearly $190, Pro monthly $39 and yearly $390, extra location $15 a month or $150 a year (K-126); no Lebanon bundle, no partner resale product, no NOWPayments (K-124); function `billing-creem` (create checkout with the organisation ID and plan in metadata; webhook verifying Creem's signature, storing each event ID once, updating `subscriptions`; upgrade and downgrade between Essentials and Pro; failed payment: 7-day grace, then no plan, data and access kept, drafting and publishing pause); the webhook is the only writer of paid state and the source for Kabsi Partners commission rows (P0.8-12); "Manage billing" opens Creem's customer portal; cancel flow with one question and a pause of one or two months; prices shown as "$19 a month, plus tax where it applies"; Creem branding with Kabsi's logo and colours; the day-7 and day-11 emails (P0.4-10) show the right plan prices; `knowledge/kabsi-facts.md` moves the new prices from [COMING] to live and drops the old ones; the `billing` function's NOWPayments branch is already gone (P0.8-01).
- Depends on: Rashid step 7, P0.4-06. D1 is decided: the Creem account holder is Hussein Slim.
- **Emails to update with the plan names and prices (noted by session 8, email fixes round 2, 21 Oct 2026).** The emails still say the old plan: `_shared/email/lifecycle-copy.ts` (`PRICE_MONTHLY` 19 and `PRICE_YEARLY` 190, "Kabsi Pro is $19 a month, or $190 a year", used by the day 7 and day 11 trial emails; `tests/lifecycle.test.ts` holds it equal to `src/lib/site.ts`), `_shared/email/copy.ts` `renewalReminder` ("Kabsi Pro, monthly") and `PLAN_LABEL` in `_shared/plans.ts` (the renewal emails `renew_r5` and `renew_r1`), and the facts file section 4.4. Change them to Essentials and Pro with the new prices in the same pull request that opens Creem checkout, then run `deno run --allow-read --allow-write scripts/render-emails.ts` so `docs/email-previews/` matches. The three older trial reminder emails (`trial_d7`, `trial_d1`, `trial_d0`) were removed in that round: the lifecycle set is the only trial email set. The job kind `trial_reminders` is still offered by `private.produce_jobs()` and does nothing; stop offering it in a migration here.
- Model: Opus (payments and webhooks).
- Done when: a test-mode checkout on a phone ends in an active Essentials subscription and another in an active Pro subscription, each written only by the webhook; replaying the same webhook changes nothing; a bad signature is refused; a test failed payment starts the grace; the portal opens; upgrade from Essentials to Pro changes the entitlements at once (test); each target country is checked against Creem's tax coverage list (recorded with the date); the Creem affiliates question for P0.8-12 is answered in PROGRESS.
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo itskaysyoga-gif/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.4-07, then docs/KABSI-PROGRESS.md. Do only task P0.4-07. Follow section 2: apply database changes yourself, open the pull request, make sure CI is green, update PROGRESS on the branch, merge the pull request yourself, run the After-merge checks you can, then give Rashid the PR link and a 3-line summary. Stop and ask only before dropping tables or columns or deleting real data.
Check PROGRESS for Rashid step 7 (Creem keys in Supabase secrets). If it is missing, stop and ask. Read K-48, K-106 and K-107. Work in Creem's test mode first; the webhook is the only writer of paid state.
```

### P0.4-08 One email template and the email set

- Decisions: K-102, K-118 (email list and "can be switched off" rules), G-22, D244, R-03, R-20.
- Touches: `_shared/email/` with one template that reads the tokens (sand background, one white card, the mark, heading, content, one yellow button with black text, the approval promise, footer with the seller line from `LEGAL_SELLER`, "Why you got this", Email settings link); subject format "Business name: action" (the review email is exactly `<Business>: new <n>-star review, reply ready`, R-30); one yellow button per email, every other action a plain link (R-30); preview line; secondary "Edit first" link; plain-text version always; dark-mode-safe logo; 600 px, 16 px body, 44 px buttons; one-click unsubscribe headers on non-essential mail; Resend idempotency keys; a Resend webhook for bounces and complaints feeding one suppression list; `email_settings` per user per type; every existing email moved onto it; Supabase Auth templates rebuilt with `emails/build.py`; `news.kabsi.co` added in Resend (connector `create-domain`) with SPF, DKIM and DMARC `p=none`, the DNS records given to Rashid to add in Cloudflare, then verified (`verify-domain`).
- Depends on: P0.1-05, P0.4-09.
- Model: Sonnet.
- Done when: every email has exactly one yellow button and the review email subject matches R-30 (test); each email type sends a test to a Gmail, an Outlook and an Apple Mail inbox and is checked in light and dark mode (Rashid confirms on his phone, or the chat records which clients it could check); plain text exists for every template; a suppressed address is never sent to (test).
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo itskaysyoga-gif/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.4-08, then docs/KABSI-PROGRESS.md. Do only task P0.4-08. Follow section 2: apply database changes yourself, open the pull request, make sure CI is green, update PROGRESS on the branch, merge the pull request yourself, run the After-merge checks you can, then give Rashid the PR link and a 3-line summary. Stop and ask only before dropping tables or columns or deleting real data.
Read K-102 and K-118 in docs/source/KABSI-AUDIT.md and the Emails section of docs/source/KABSI-DESIGN.md. One template for every email; move existing emails onto it without changing what triggers them.
```

### P0.4-09 Notification engine

- Decisions: K-46 as amended by K-57, K-17, R-08.
- Touches: `notification_preferences` (user, business, category, channel email or in-app, frequency instant, daily digest, off); one outbox (the `emails` table plus an in-app `notifications` table) with dedupe keys and delivery log; defaults: high-risk reviews and urgent profile changes instant; normal reviews instant during opening hours and digested outside them; everything else in the daily digest; quiet hours 22:00 to 08:00 local except urgent profile changes; in-app bell on Home.
- Depends on: P0.3-05.
- Model: Sonnet.
- Done when: tests prove defaults, quiet hours and dedupe; an owner can switch a category off; the digest groups items.
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo itskaysyoga-gif/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.4-09, then docs/KABSI-PROGRESS.md. Do only task P0.4-09. Follow section 2: apply database changes yourself, open the pull request, make sure CI is green, update PROGRESS on the branch, merge the pull request yourself, run the After-merge checks you can, then give Rashid the PR link and a 3-line summary. Stop and ask only before dropping tables or columns or deleting real data.
Read K-46 and K-57. Every send goes through one outbox; no channel bypasses approvals.
```

### P0.4-10 Behaviour-triggered lifecycle emails

**Changed 21 Oct 2026 (K-141, K-126).** Built in session 6. The plan choice from day 11 offers Essentials or Pro (four prices) and the trial is called a Pro trial; the price copy changes in P0.4-07 and the two win-back subjects in P0.8-02.

- Decisions: G-25, K-101 (messages), G-30, G-24, R-03, K-61.
- Touches: lifecycle sender on `news.kabsi.co` (Resend, authenticated in P0.4-08) driven by events: account created (welcome and the one next step), no access at 1, 24, 72 hours (from P0.4-04), access granted, backlog drafted, first reply approved, day 7 recap from the audit log with the yearly offer, day 11 three days left with both prices, day 14 trial ended, win-back on day 17 and day 30 after expiry based on real waiting items; consent rules by country; unsubscribe.
- Depends on: P0.4-08, P0.4-06.
- Model: Sonnet.
- Done when: each trigger produces its email once in a time-travel test; no lifecycle email reaches an address without the required consent for its country (test); numbers in the day-7 recap come from `audit_events` (test).
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo itskaysyoga-gif/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.4-10, then docs/KABSI-PROGRESS.md. Do only task P0.4-10. Follow section 2: apply database changes yourself, open the pull request, make sure CI is green, update PROGRESS on the branch, merge the pull request yourself, run the After-merge checks you can, then give Rashid the PR link and a 3-line summary. Stop and ask only before dropping tables or columns or deleting real data.
Read G-24, G-25 and G-30 in docs/source/KABSI-GROWTH.md and K-101. Counts come only from the audit log. No end-of-trial discount.
```

### P0.4-11 "Need a hand?" on every onboarding step

- Decisions: K-111, K-89, K-104, K-58, design review "Help on every onboarding step".
- Touches: a chip under each step's main button opening a sheet (Ask Nora with three suggested questions for that step and the owner's state, the step's 20-second clip slot, the free 15-minute setup call from the access step on); Nora steps in once when stuck (3 minutes on the manual step without an invitation, a failed access check, a scenario screen); Nora's onboarding context tool (step, scenario, access state) in `assistant`; handover recorded with the conversation.
- Depends on: P0.4-04, P0.6-06 can follow (facts), P0.1-V3.
- Model: Sonnet.
- Done when: the chip appears on every step at the same place; the stuck prompt shows once per step (test); Nora answers "Where is People and access?" from the facts file and offers the call when it cannot help (recorded conversation on the mock).
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo itskaysyoga-gif/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.4-11, then docs/KABSI-PROGRESS.md. Do only task P0.4-11. Follow section 2: apply database changes yourself, open the pull request, make sure CI is green, update PROGRESS on the branch, merge the pull request yourself, run the After-merge checks you can, then give Rashid the PR link and a 3-line summary. Stop and ask only before dropping tables or columns or deleting real data.
Read K-111 and the help section in docs/source/KABSI-DESIGN.md. Nora never asks for a password or code and answers only from the facts file and live state.
```
