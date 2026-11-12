# Surface map (docs/SYNC.md)

Master plan 30.45 item 6 (R-141). This is the map of every surface that states a price, a plan, the trial, a promise, a name or a rule: where it lives in the repository or outside it, how it is updated, and who owns it.

**The rule.** A pull request that changes behaviour, price or wording walks this file and lists in its report each surface it changed or checked. Part of the pull request template. W-4 (the public switch of the request book) walks the whole file.

**How this map was built.** By searching the repository on 9 Nov 2026, not from memory. The searches are at the end (section 13), so the next session can run them again and add the row of anything new they find.

## 1. How a surface is updated

| Code | Way | What to run after |
|---|---|---|
| F | Facts: edit the numbered file in `knowledge/facts/`, then build | `node scripts/build-kb.mjs` (writes `knowledge/kabsi-facts.md`, `public/llms-full.txt`, `src/content/llms-base.txt`; never edit those three by hand) |
| C | Copy deck: the line is in `docs/COPY.md` first, then the file that shows it | The file named in the row |
| S | One constant in code that every surface reads or repeats | `npm test` (tests/prices.test.ts and tests/sync-guards.test.ts read it) |
| T | A template or builder file; the rendered copy is generated from it | The render command in the row |
| K | A Kapso submission: the template text in `templates.ts` is submitted to Meta through Kapso and approved there | A new template version, approved Utility, never an edit of an approved one |
| R | Another repository or an outside account | The row says whose hands |
| H | By hand, in an outside tool | The row says whose hands |

Owners: **Rashid** (runs Kabsi; the lane R chat decides on his authority, R-41), **Hussein** (the Creem account only), **Build** (a build session in this repository), **Harvey** (the contact list builder: runs from the public repository `kabsi-harvey-run` with its data encrypted; `kabsi-harvey` is the private archive, R-146).

## 2. The numbers and names that live in one place

A surface that states one of these reads it or repeats it. When it changes here, every row of section 3 to 8 that repeats it is a surface to check. `tests/sync-guards.test.ts` fails when a checked surface states a different amount for a Kabsi plan.

| What | The one place | Repeated in (rows below) |
|---|---|---|
| List prices (Essentials 29 a month, 290 a year; Pro 59, 590) and the extra location (15, 150) | `PLAN_PRICES` in `src/lib/site.ts` (S) | Pricing, Home, FAQ, Founding, terms, plan emails, facts 06, llms files, Creem catalogue, Outbound, WhatsApp replies, OG images |
| Launch price (called the founding price inside the code and the database; Essentials 19, 190; Pro 39, 390) and the places (first 30 paying businesses) | `FOUNDING_PRICES`, `FOUNDING_TOTAL`, `FOUNDING_SENTENCE` in `src/lib/site.ts` (S); the email copy of the sentence in `email/lifecycle-copy.ts` | Pricing, Home, FAQ, terms, Plan page, plan emails, receipt, facts 02, 03, 06 and 13, Creem catalogue names, the launch places count (billing-creem/founding) |
| Founding 25 (three months of Pro free, by application): PRIVATE since Founding 1 (R-151, 30.51). Public surfaces carry none of it. | The private note `knowledge/internal/2026-11-10-founding-25-private.md`; the page words in `src/components/kabsi/founding-private.ts` and `d5-founding.tsx`; the secret is `app_settings.founding_invite_slug` | Only the invited page `/founding/<slug>`, the staff Invite link panel, the member emails (day 60, 85, 90), and, from Outbound 2, the follow-up email while places remain. Never Home, Pricing, FAQ, About, footer, sitemap, llms files, public facts, Nora's public knowledge or share images (`tests/founding1.test.ts`) |
| Trial: 14 days once Kabsi is connected, no card | `TRIAL_LINE` in `src/lib/site.ts` | Every page with a trial line, lifecycle emails, facts 05 and 06, WhatsApp replies |
| Brand line, the main button, the names | `BRAND_LINE`, `MAIN_CTA` in `src/lib/site.ts`; names from K-02 | Every page, email footer, OG images |
| WhatsApp number and switch | `supabase/functions/_shared/whatsapp-setting.ts` (`WHATSAPP_ON`) | Every page that says "on WhatsApp", auth emails, product emails |
| Facebook and Instagram | `SOCIAL_LINKS` in `supabase/functions/_shared/social-links.ts` (R-59) | Footer, About, email footers |
| The industries (21) | `src/content/industries/index.ts` | `/for` pages, `sitemap-pages.json`, OG images, `docs/claims/`, facts 09, Nora's page list, guide links |
| Never-say names and claims | The lists in `tests/helpers/house-rules.ts` | Every surface in sections 3 to 8 |
| The operator, merchant and non-affiliation lines | `OPERATOR_LINE`, `MERCHANT_LINE`, `NOT_AFFILIATED`, `GOOGLE_NOTICE` in `src/lib/site.ts` | Footer, terms, privacy, emails |

## 2a. Offers (Site 3a, 10 Nov 2026)

Every offer Kabsi makes, who gets it, when it starts and ends, and the file that controls it. Site 3a wrote this table and changed no offer. A pull request that changes an offer changes its row here.

| Offer | Who gets it | Starts | Ends | Controlled by |
|---|---|---|---|---|
| The 14 day trial (Pro, no card) | Every new business, public | The day Kabsi's Manager access to the Google profile works (day 1), never at sign-up | Day 14: the owner chooses a plan or stops; nothing is charged by itself. For 7 more days Kabsi keeps watching and drafting and publishes nothing | `trialDays` in `supabase/functions/_shared/plans.ts` and its SQL twin `trial_days_for` (migration `20260930090000_plans_v2_trial.sql`); the words are `TRIAL_LINE` in `src/lib/site.ts`, facts 05 and 06 |
| The launch price (Essentials 19 a month or 190 a year, Pro 39 or 390; called the founding price inside the code and the database) | The first 30 businesses that pay, public ("launch price", never "founding price", 30.51 item 3) | When card payments open (planned 10 Dec 2026, 30.50 item 15) | When the 30 places are taken; each of the 30 keeps the price while it stays subscribed | `FOUNDING_PRICES`, `FOUNDING_TOTAL`, `foundingLine`, `foundingPlacesLine` in `src/lib/site.ts`; the real count from `founding_places_left()` through `billing-creem/founding` (`supabase/functions/billing-creem/index.ts`); the Creem products in `CATALOGUE` of `supabase/functions/_shared/creem.ts`; facts 06 |
| The partner 30 day trial (Pro) | A business that comes through a Kabsi Partners link or card, public on the partners page and partner terms | When partner links switch on, which is when card payments open (30.50 item 7); for the business, the day its access works, as the 14 day trial | Day 30, then as the 14 day trial | Not built yet: `trialDays` in `supabase/functions/_shared/plans.ts` returns 14 for every signup until Kabsi Partners builds the partner trial (Partners 2, K-127). The words are in `d2-partners.tsx`, `src/routes/partners_.terms.tsx` and facts 08 |
| Founding 25 (three months of Pro free, by application) | Private, invite only (30.51 item 3): a business Rashid invites by message or email. Never named on a public surface | When the invited business's application is accepted and its access works | After 90 days the business chooses a plan at the launch price or stops; applications close when the 25 places are taken or Rashid closes them | The page `/founding/<slug>` (`src/routes/founding.$slug.tsx`, `d5-founding.tsx`, `founding-private.ts`); the secret `app_settings.founding_invite_slug` (rotated by staff through `public.staff_founding_invite`); the applications and places in `supabase/functions/programs/index.ts` and `supabase/functions/_shared/founding.ts`; the private note `knowledge/internal/2026-11-10-founding-25-private.md` |

## 3. The website (in this repository)

Every page below is read at 390 px and 1440 px in the truth pass. The copy of every page is in `docs/COPY.md` (section 24 to 68, later sections win).

| Surface | What it states | Where it lives | Updated by | Owner |
|---|---|---|---|---|
| Home `/` | Brand line in the H1 (with "through WhatsApp" since Home 2), the four jobs (Home 2, COPY.md 86; the fourth is "AI answers checked" since Site 3b, COPY.md 87; also at the top of How it works), the voice line in "For your kind of business" (Site 3b), the AI answer plan amounts, trial, launch price line with the real count of places (no Founding 25 since Founding 1), the one WhatsApp day in the hero, the meta title and description | `src/routes/index.tsx`, `d9-home.tsx`, `home2-hero.tsx`, `home2-hero-data.ts`, `d9-home-lower.tsx`, `home2-data.ts`, `look2.tsx`, `d9-data.ts` (the weekly report sample), `hero-lines.ts`; the copy with sources in `docs/site4/home.md` | C, S | Rashid |
| Pricing `/pricing` | Both plans, list and launch prices with the real count of launch places, extra location, help lines, refund line | `d8-pricing.tsx`, `plans.ts`, `faq-data.ts`; numbers from `site.ts` | S, C | Rashid |
| How it works `/how-it-works` | The loop, the three states (Approved, Sent to Google, Live on Google), what Kabsi does in four groups, the voice line under them (Site 3b) | `how-page.tsx`, `voice-line.ts`, `d9-how.tsx`, `d9-home-lower.tsx` (`HandlesGroups`) | C | Rashid |
| Free check `/scan`, `/scan/CODE`, `/google-profile-check` | What the check does and says, the trial as a separate thing | `d4-free-check.tsx`, `scan-live.tsx`, `scan-box.tsx`, `result-preview.tsx` | C | Rashid |
| Free tool `/google-review-link` | Link, QR, printable card | `d2-tools.tsx` | C | Rashid |
| Founding `/founding/<slug>` (private; `/founding` alone is the 404) | Founding 25, three months of Pro, the application; noindex, nofollow, no canonical, never cached, in no sitemap, llms file or IndexNow list; the count and the application need the slug | `src/routes/founding.$slug.tsx`, `d5-founding.tsx`, `founding-private.ts`, `src/lib/founding-invite.ts`, `founding-invite-server.ts`, `founding-count.ts`, `api.founding-count.ts`, `supabase/functions/programs/index.ts`, `vercel.json` headers; the slug is scrubbed from Sentry and PostHog and the Pixel skips the page (`scrub.ts`, `meta-pixel.ts`) | C (section 80), the staff Invite link panel | Rashid |
| About `/about` | Who runs Kabsi (Rashid's own words), the honest facts (no Founding 25 line since Founding 1) | `d8-about.tsx` | C | Rashid |
| Partners `/partners`, `/partners/terms` | The card line, three steps, six kinds of partner, the money with an Example on the list price (worked out from `PLAN_PRICES`), the five rules, questions, the real count of Founding Partner places, the one button "Join in two minutes", the launch day line while `CARDS_OPEN` is false (Partners 3, COPY.md 83); the terms, payout minimum 25 | `d2-partners.tsx`, `faq-data.ts`, `hero-lines.ts`, `partners_.terms.tsx` | C, S | Rashid |
| Partners join and home `/partners/join`, `/partners/home` (Partners 2, noindex; Fix 5 moved the home from `/partner`, which answers 301) | Join at once with a code, the six kinds, the UAE permit line, the terms version; the link, QR, numbers from the ledger, payout method from 50 US dollars behind a fresh confirm, the rules. Partners 3: the kit (18 ready posts with the paid partnership label, the A6 insert with the partner's QR and "30 days free", the say and do not say lists) | `partners_.join.tsx`, `partners_.home.tsx`, `src/lib/partner.ts` (the words, COPY.md section 82); the kit in `src/lib/partner-kit.ts`, `src/lib/partner-insert.ts` (drawn with `src/lib/qr-card.ts`) and `src/components/partners/partner-kit.tsx` (COPY.md section 83); `PARTNER_TERMS_VERSION` in `supabase/functions/_shared/programs.ts` and `src/lib/partner.ts` (kept equal by tests/partners2-web.test.ts) | C, S | Rashid |
| Security `/security` | What Kabsi stores and does not | `d8-security.tsx` | C, F | Rashid |
| Privacy `/privacy`, Terms `/terms` | The law's words, what Kabsi keeps about a business (including the two optional onboarding answers, R-145), retention, the contact list notice | `src/components/marketing/legal.tsx`, `src/lib/retention.ts`, `src/lib/consent.ts`; `src/routes/privacy.tsx`, `terms.tsx` | C (legal wording changes only with lane R) | Rashid |
| FAQ `/faq` and the FAQ on Pricing, Founding, Partners and the industry pages | Answers from the facts | `src/lib/faq.ts` (the JSON-LD builder), `src/components/kabsi/faq-data.ts`, `d8-faq.tsx` | F then C | Rashid |
| Setup call `/setup-call`, `/manager-steps` | How to add Kabsi as a manager; the booking is an email while `BOOKING_READY` is false | `setup-call.tsx`, `d2-flow.tsx`, `src/lib/manager-guide.ts` | C, S | Rashid |
| Log in `/login` and signed-out screens | Sign-in wording, the three ways and their order (WhatsApp first on a phone, Google first on a computer, WhatsApp first in in-app browsers), Google hidden when its provider is off (Signup 1) | `sign-in-panel.tsx`, `whatsapp-signin.tsx`, `src/lib/wa-signin.ts`, `src/lib/sign-in-errors.ts`, `signed-out.ts`; the consent beside Continue with WhatsApp is `WHATSAPP_SIGNIN_CONSENT` in `supabase/functions/_shared/wa-signin.ts` | C (sections 51 and 78) | Rashid |
| Header, footer, share text | Navigation, operator line, non-affiliation, social links; no line above the header and no promo bar (Founding 1) | `site-header.tsx`, `site-footer.tsx`, `site-chrome.tsx`, `site.ts` | S | Rashid |
| Page titles, descriptions, JSON-LD, sitemap | The words search engines read | `pageHead` in `src/lib/site.ts`, each route's head, `src/content/sitemap-pages.json`, `lastmod.json` | S, built at deploy | Build |
| Tokens and look | Colours, type, spacing | `DESIGN.md`, `src/styles.css` | `npm run check:tokens` | Rashid |
| Token pages that carry no marketing (`/a/TOKEN`, `/h/TOKEN`, `/u/TOKEN`, `/unsubscribe`, `/activate/CODE`, `/billing/done`, `/review/CODE`) | One action each, in plain words | `src/routes/*.tsx`, `d2-quiet.tsx`, `concierge-copy.ts`, `review-page-view.tsx` | C | Rashid |

## 4. Industry pages (21), guides and the share images

| Surface | What it states | Where it lives | Updated by | Owner |
|---|---|---|---|---|
| The 21 industry pages `/for/<industry>` and the hub `/for` | What Kabsi does for that business, examples labelled Example, no Arabic, no claims past the claims sheet | One file each in `src/content/industries/` (hair-salon, barbershop, nail-salon, spa-massage, dental-clinic, medical-aesthetic-clinic, physiotherapy, restaurant, cafe, bakery, auto-repair, gym-fitness, lash-and-brow-studio, tattoo-studio, pet-grooming, veterinary-clinic, car-wash, florist, optician, yoga-and-pilates-studio, beauty-salon); rendered by `d9-industry.tsx` | C (section 52 and 56 of COPY.md) | Rashid |
| The claims sheet of each industry | What a page may say about that business | `docs/claims/<industry>.md` | By hand, with lane R | Rashid |
| Guides `/guides` and `/guides/<slug>` | Plain-English how-tos; every guide leads to the free check; no ranking claims, no statistics | One file each in `src/content/guides/`, the list in `index.ts`, publish dates in `schedule.ts` | C (sections 53 and 54) | Rashid |
| Share images (`public/og/*.jpg`, `public/og/guides/`, `public/og/industries/`) | The page's headline on a card; no Google name in a graphic | Made by `scripts/og.mjs` and `scripts/industry-og.mjs`; the words are in those scripts | T: `node scripts/og.mjs` | Build |

## 5. Facts, Nora and the llms files

| Surface | What it states | Where it lives | Updated by | Owner |
|---|---|---|---|---|
| Facts (the one source) | Everything Kabsi says it does, costs and promises, with [COMING] and [CHANGING] markers | `knowledge/facts/00` to `15` (numbered files) | Edit here first, then F | Rashid |
| Facts file | The built facts Nora reads | `knowledge/kabsi-facts.md` | F, never by hand | Build |
| llms files | The same facts for AI search | `public/llms-full.txt`, `src/content/llms-base.txt`, `knowledge/facts/llms.txt`; `/llms.txt` is a server route (`src/routes/llms[.]txt.ts`) that adds the public guides | F, never by hand | Build |
| Nora's rules and link filter | How Nora answers, one page link at most, the help line | `supabase/functions/_shared/nora-rules.ts`, `nora-pages.ts`, `nora-contact.ts`, `src/routes/nora-pages[.]json.ts` | C then T | Build |
| Nora's questions and the judge | 60 plus 92 questions that check the facts; Google's own product name in the answer's language counts as "Google Business Profile" (`google-names.ts`, 30.49 item 4) | `scripts/nora-eval/` | By hand when the facts change | Build |
| Team-only notes | Never reach Nora or the site | `knowledge/internal/` | By hand | Rashid |

## 6. Emails

| Surface | What it states | Where it lives | Updated by | Owner |
|---|---|---|---|---|
| Product emails (review, weekly report, digest, access, deletion, receipt, payment failed, team invite and the rest; one sample of each) | The three states, one yellow button, the review subject `<Business>: new <n>-star review, reply ready` | Builders in `supabase/functions/_shared/email/` (`copy.ts`, `account-copy.ts`, `review.ts`, `report-body.ts`), `notify-engine.ts`, `team.ts`, `disconnect.ts`, `profile-snapshot.ts`; samples in `email/catalog.ts` | T: `docs/email-previews/` is the rendered copy (`index.html` lists every kind) | Build |
| Kabsi Partners emails (Partners 3: you joined with the link and the kit, your first trial started, your first payment earned after the hold, payout sent; account mail, one yellow button each, no unsubscribe) | The link, the 25 percent, the 30 day hold, the launch day line until card payments open, the statement; a referred business as trade and area only | `supabase/functions/_shared/email/partner-copy.ts` (the words, COPY.md section 83), sent at the join by `programs/index.ts` and for the other three by `_shared/partner-notices.ts` (the plan is `partner-plan.ts`), which the dispatcher runs in its 5 minute `trial_reminders` step; samples in `email/catalog.ts` | T: `docs/email-previews/` (four new kinds) | Build |
| Lifecycle emails (trial day 2, 7, 11, 14, winback 17, 30, verify, no access, ownership) | Trial, plan names and prices | `supabase/functions/_shared/email/lifecycle-copy.ts`, `lifecycle.ts` | T | Build |
| Auth emails (magic link, confirm signup, change email, reauthentication) | The code, the WhatsApp line | Built into `emails/auth/*.html` from `email/auth-templates.ts` by `deno run --allow-read --allow-write scripts/render-emails.ts`; pasted into Supabase Auth, Emails, Templates | T then H (Rashid pastes, `emails/auth/README.md`) | Rashid |
| Email footers | Brand line, operator, social links, unsubscribe | `email-layout.ts`, `email/template.ts`, `social-links.ts` | S | Build |

## 7. WhatsApp and Outbound

| Surface | What it states | Where it lives | Updated by | Owner |
|---|---|---|---|---|
| Agent replies to owners (say, intent, hours, photo post, stats, plan and billing answers, handoff) | What Kabsi did, asks for a yes, Undo, no promise | `supabase/functions/_shared/whatsapp/say.ts`, `agent.ts`, `alert-text.ts`, `google-action.ts`, `book.ts`, `policy.ts` | C (sections 20 and 30 of COPY.md) | Build |
| Sign-in on WhatsApp (Signup 1): the confirm, signed in, ended, too many tries, the new sign-in notice and its email, signed out everywhere; the staff alert and email when Google sign-in is off | The device and city, one button, never a code from Kabsi | `SIGNIN_SAY` in `supabase/functions/_shared/wa-signin.ts`, `whatsapp/signin.ts` (`noticeEmail`), `signin-provider-check.ts` | C (section 78) | Build |
| Request book replies (dark, off until Gate 2 and W-4) | What was saved, the guess marker, Undo | `supabase/functions/_shared/request-book/replies/` | C | Build |
| Kapso templates (Utility): the account and approval notices, the staff alert, the billing notice; the daily check of the number, the templates and the webhook delivery log (`docs/RUNBOOK.md` WhatsApp item 8; the delivery alert and email carry counts only, Tidy 2) | The words Meta approved | Text in `supabase/functions/_shared/whatsapp/templates.ts` (name, body, example); approved copy lives at Kapso and Meta | K: a new name and version, resubmitted; the sender switches on its hourly status read | Rashid |
| Kabsi's WhatsApp profile (display name, about, address, description, photo) | Who Kabsi is on WhatsApp | Kapso project Kabsi.co, WhatsApp Business profile | H (Rashid; display name waits for Meta) | Rashid |
| Outbound emails (first email, follow-up, yes reply, footer, signature) | The offer: the free Google check and Google care only (no Founding 25 since Sync 2b, R-142; Outbound 2 adds the invite link to the follow-up while places remain, 30.51 item 5, not built yet: LATER row); the reply to a yes adds the launch price sentence (`FOUNDING_SENTENCE` in `email/lifecycle-copy.ts`); why you got this | `supabase/functions/_shared/outbound/rules.ts` (`emailOne`, `followUp`, `SIGNATURE`, `FOOTER`), `inbox.ts` (`yesReply`), `docs/COPY.md` section 65 | C then T; Rashid approves every email in the daily batch at `/staff/outbound` | Rashid |
| Outbound list and counts | Who may be written to: UK registered companies active on Companies House, own-domain email (30.45 item 5; opens only when Rashid says start, after card payments open; the UAE and every other country stay off: `OPEN_COUNTRIES` in `outbound/rules.ts` and the database check on `open_countries` hold only GB); the six salon industries first (`SALON_INDUSTRIES`, R-142) | Harvey (`kabsi-harvey-run`, R-146) builds the list; `outbound-prepare` checks it | R (Harvey), H | Rashid, Harvey |

## 8. The signed-in app, staff area and billing

| Surface | What it states | Where it lives | Updated by | Owner |
|---|---|---|---|---|
| Owner dashboard screens (Home, Reviews, Google Profile, Content, Insights, Plan, Settings, Team, Photos, Hours) | Plain words, names from K-02, plan limits | `src/routes/_authenticated/app/`, `src/components/app/`, `src/components/home/`, `src/lib/entitlements.ts`, `src/lib/plans.ts` | C (sections 19, 36, 46, 51, 57, 60) | Rashid |
| Onboarding | Four stages, no passwords; two optional questions right after the business is chosen, shown only here and in About your business, never naming the request book, nothing sent because of an answer (Onboarding 1, R-145) | `src/components/onboarding/`, `src/lib/onboarding*.ts`, `src/components/onboarding/request-answers.tsx`, `src/lib/request-answers.ts`; the answers are columns of `locations` | C (section 18, 25, 73) | Rashid |
| Weekly report | Work done, what waits for a yes | `supabase/functions/_shared/care-report/compose.ts`, `report.ts`, `results-report/`, `insights/example.ts` | C | Rashid |
| Plan limits in the database | What each plan allows | `plan_limits()` (migration) and `supabase/functions/_shared/plans.ts`, `src/lib/plans.ts` | By migration | Build |
| Staff area | Staff only; never reaches owners. Programs, Founding 25 holds the Invite link (show, copy, make a new link; `public.staff_founding_invite(boolean)`, staff only). Businesses also shows Early answers: counts of the two onboarding answers and the first businesses to answer yes in chats, a notebook or memory, which is Gate 3's evidence (R-145); its line says the tie rule: exactly 2 of the first 10 counts the first 20, where 5 or more opens it (R-147, `gate3Line` in `src/lib/request-answers.ts`, `staff_request_answers()`) | `src/routes/_authenticated/staff/`, `src/components/staff/` (`request-answers-panel.tsx`; data from `public.staff_request_answers()`) | C (section 57, 73) | Rashid |
| Demo data | The two fictional demo businesses | `supabase/seed/demo.sql`, `supabase/functions/_shared/demo.ts` | By hand, with lane R | Build |
| Creem product names, descriptions and amounts | The ten products (the launch price and list families, extra location; the four launch price names end "launch price" since Founding 1, and the setup action renames the products Creem already holds), the product description | `CATALOGUE` and `PRODUCT_DESCRIPTION` in `supabase/functions/_shared/creem.ts`; made in Creem by the setup action (`billing-creem/setup`) | S, then the setup action in test and live mode | Hussein (the Creem account), Build |
| Creem checkout page | How Creem shows the product to the buyer | Creem's dashboard (`docs/COPY.md` section 23) | H | Hussein |

## 9. Outside the repository

| Surface | What it states | Where it lives | Updated by | Owner |
|---|---|---|---|---|
| Harvey (`kabsi-harvey-run`, `kabsi-harvey`) | The list of businesses, its own policy register and dashboard (refresh from 1 Dec 2026, Monday, Wednesday and Friday, 30.45 item 7). Harvey's first tier is beauty (hair salon, barbershop, beauty salon, nail salon, lash and brow studio, spa and massage) and food (restaurant, cafe); the launch stays open to all 21 industries (30.49, R-146) | Public repository `kabsi-harvey-run`, a daily scheduled run, its data encrypted; the private repository `kabsi-harvey` is the archive | R | Rashid, Harvey |
| kabsi-design-studio | Design 9 and later designs, Example businesses, image and email designs | Lovable project synced to GitHub as `kabsi-design-studio` | R: a design is ported by a session here; it never ships by itself | Rashid |
| Meta ads and video scripts | Ad copy, video scripts, the caption "AI characters. Example business." on any video with an AI character; real Kabsi screens only; organic now, paid after the launch gate (R-127, R-128); the first ads aim at beauty and food businesses, and the launch stays open to all 21 industries (30.49, R-146) | Lane R's notes and Creatify; shot sheets in `docs/marketing/` are older working notes | H (lane V, Rashid) | Rashid |
| Kabsi's Instagram and Facebook | Profile text, posts | The accounts; links only through `SOCIAL_LINKS` | H | Rashid |
| Kabsi's Google profile | Kabsi's own business profile text | Google Business Profile of Kabsi (second Kabsi Google account) | H | Rashid |
| Anthropic, Resend, Zoho, DataForSEO, Vercel, Supabase, Sentry consoles | Settings, not wording; listed in `docs/SECRETS.md` and `docs/THIRD-PARTY.md` | Each console | H | Rashid |
| Lane R's project docs (the checklist of 7 Nov, the Session prompts tab) | Decisions in progress | Claude project docs, outside this repository because it is public | H | Rashid |

## 10. Older working notes that state numbers (check, do not treat as the source)

| File | State today |
|---|---|
| `docs/marketing/feature-truth.md`, `docs/marketing/shot-sheets/` | Written in October; the truth pass records what is out of date |
| `docs/VIDEO-PLAN.md`, `docs/golive1/audit.md`, `docs/launch1/readiness.md`, `docs/strategy/` | Dated records. The facts and master plan win |
| `.claude/skills/*` | Instructions that repeat approved lines; a change to an approved line updates the skill that quotes it |

## 11. Which guard watches which surface

The shared lists (never-say names and claims, the dash and exclamation mark rules, the amounts read from `src/lib/site.ts`, the surface list itself) are in `tests/helpers/house-rules.ts`. A new surface goes into `SURFACES` there and into the tables above in the same pull request. `KNOWN_FINDINGS` in the same file holds the lines a truth pass has found and not yet fixed; each entry fails its own test once the line is fixed, so the list ends empty.

| Guard | Surfaces it reads |
|---|---|
| `tests/prices.test.ts` | `src` (every ts and tsx), `supabase/functions/_shared/email`, `docs/email-previews`, the facts file, both llms files: every dollar amount is a Kabsi price or a named exception |
| `tests/sync-guards.test.ts` | Facts, the built facts and llms files, `docs/COPY.md`, `emails/auth`, `docs/email-previews`, every file under `supabase/functions/_shared` and the WhatsApp, Outbound, billing and assistant functions, `scripts/og.mjs` and `scripts/industry-og.mjs`: a plan, an extra location or a founding amount that is not the one in `src/lib/site.ts` (and the wrong period), the founding place counts, the Creem catalogue in cents, the never-say names and claims, dashes and exclamation marks |
| `tests/claims-k144.test.ts` | FAQ, facts, llms files, every page, library, component and Edge Function, every guide, and now `emails/auth`, the email previews, the copy deck, Outbound and WhatsApp words |
| `tests/website-home.test.ts` | The public site's lines: dashes, exclamation marks, promises, retired names (reads `NEVER_CLAIMS` and `NEVER_NAMES` from the shared file), owner words |
| `tests/plan-choice.test.ts` | The plan card's words (reads `NEVER_NAMES`) |
| `supabase/functions/_shared/email/catalog.test.ts` | Every product email sample, built by the real builders |
| `supabase/functions/_shared/whatsapp/conversations.test.ts`, `request-book/replies/replies.test.ts` | WhatsApp replies and request book replies, built by the real code (Deno) |
| `npm run check:tokens` | Design tokens (K-108) |
| `node scripts/build-kb.mjs --check` and `tests/knowledge-build.test.ts` | The three built facts files match `knowledge/facts/` |
| `tests/sitemap.test.ts` | The sitemap equals the routes and the industry content |
| `tests/founding1.test.ts`, `tests/founding-count.test.ts`, `supabase/tests/founding1_private_invite.sql` and the Playwright `public.spec.ts` and `smoke.spec.ts` | Founding 25 is private: no slug and a wrong slug are 404, the right slug is the noindex page, the slug rotates and the old one stops, nothing public (sitemap, IndexNow list, llms files, public facts, public source files, email previews of non-members, every public page's rendered HTML) names Founding 25, the slug is scrubbed from telemetry |
| `tests/onboarding1-request-answers.test.ts` and `supabase/tests/onboarding1_request_answers.sql` | The two onboarding questions: their words, that they stay out of every public page, email and WhatsApp builder, skip and save, the staff counts and Gate 3's rule, and (database) that another business cannot read or write the answers |
| `tests/industry1-dup.test.ts` and `scripts/industry-dup.mjs` | The 21 industry pages: each at least 70 percent its own text, no pair above 35 percent identical sentences (R-144; the same measure runs on the served pages in `tests/e2e/public.spec.ts`) |

## 12. How to walk this map in a pull request

1. Name what you changed: a price, a plan, the trial, a promise, a name, a switch, or a line.
2. Find it in section 2. If it lives in one place, change that place and run the test. If it is repeated, open each row it names.
3. For each surface the change could reach, mark it in the report as changed, checked (read, nothing to change) or not applicable, with a line of reason.
4. A surface that needs someone else's hands (Rashid, Hussein, Kapso, Creem) goes in the report's manual steps, with who and where.
5. A new surface that states any of these goes into this file in the same pull request.

## 13. The searches behind this map (9 Nov 2026)

```
grep -rlE '\$(29|59|290|590|19|39|190|390|15|150)\b|(19|29|39|59|290|590|190|390) US dollars' .   # prices
grep -rl "14 days\|14-day" .                                                                      # the trial
grep -rl "Founding 25\|founding 25\|25 founding" .                                                # Founding 25 (private since Founding 1: only the files named in the Founding 25 row of section 2 may hold it)
grep -rl "Essentials" .                                                                           # plan names
grep -rl "Weekly Care Report\|Monday Report" .                                                    # retired names
grep -rln "Profile Score\|Listing Shield\|Put mine back" .                                        # never-say names
ls src/routes src/content/industries src/content/guides emails/auth docs/email-previews          # pages, industries, guides, emails
grep -o "kabsi_[a-z_0-9]*" supabase/functions/_shared/whatsapp/templates.ts                       # Kapso template names
```

(Run from the repository root, excluding `node_modules`, `.git`, `.output`, migrations and `docs/progress`.)
