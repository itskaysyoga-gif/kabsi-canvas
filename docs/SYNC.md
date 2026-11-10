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
| Founding price (Essentials 19, 190; Pro 39, 390) and the places (first 30 paying businesses) | `FOUNDING_PRICES`, `FOUNDING_TOTAL` in `src/lib/site.ts` (S) | Pricing, Founding, Home, FAQ, facts 06, Creem catalogue, the founding count |
| Founding 25 (three months of Pro free, by application) | Facts 06 and `src/components/kabsi/founding-total.ts` | Founding, Home, About, Outbound templates, Nora, llms files |
| Trial: 14 days once Kabsi is connected, no card | `TRIAL_LINE` in `src/lib/site.ts` | Every page with a trial line, lifecycle emails, facts 05 and 06, WhatsApp replies |
| Brand line, the main button, the names | `BRAND_LINE`, `MAIN_CTA` in `src/lib/site.ts`; names from K-02 | Every page, email footer, OG images |
| WhatsApp number and switch | `supabase/functions/_shared/whatsapp-setting.ts` (`WHATSAPP_ON`) | Every page that says "on WhatsApp", auth emails, product emails |
| Facebook and Instagram | `SOCIAL_LINKS` in `supabase/functions/_shared/social-links.ts` (R-59) | Footer, About, email footers |
| The industries (21) | `src/content/industries/index.ts` | `/for` pages, `sitemap-pages.json`, OG images, `docs/claims/`, facts 09, Nora's page list, guide links |
| Never-say names and claims | The lists in `tests/helpers/house-rules.ts` | Every surface in sections 3 to 8 |
| The operator, merchant and non-affiliation lines | `OPERATOR_LINE`, `MERCHANT_LINE`, `NOT_AFFILIATED`, `GOOGLE_NOTICE` in `src/lib/site.ts` | Footer, terms, privacy, emails |

## 3. The website (in this repository)

Every page below is read at 390 px and 1440 px in the truth pass. The copy of every page is in `docs/COPY.md` (section 24 to 68, later sections win).

| Surface | What it states | Where it lives | Updated by | Owner |
|---|---|---|---|---|
| Home `/` | Brand line, the four jobs, prices from, trial, Founding 25 line, nearby check | `src/routes/index.tsx`, `d9-home.tsx`, `d9-home-lower.tsx`, `d9-hero.tsx`, `hero-lines.ts`, `home-examples.ts` | C, S | Rashid |
| Pricing `/pricing` | Both plans, list and founding prices, extra location, help lines, refund line | `d8-pricing.tsx`, `plans.ts`, `faq-data.ts`; numbers from `site.ts` | S, C | Rashid |
| How it works `/how-it-works` | The loop, the three states (Approved, Sent to Google, Live on Google) | `how-page.tsx`, `d9-how.tsx` | C | Rashid |
| Free check `/scan`, `/scan/CODE`, `/google-profile-check` | What the check does and says, the trial as a separate thing | `d4-free-check.tsx`, `scan-live.tsx`, `scan-box.tsx`, `result-preview.tsx` | C | Rashid |
| Free tool `/google-review-link` | Link, QR, printable card | `d2-tools.tsx` | C | Rashid |
| Founding `/founding` | Founding 25, three months of Pro, the application | `d5-founding.tsx`, `founding-line.tsx`, `founding-price.tsx`, `founding-total.ts` | S, C | Rashid |
| About `/about` | Who runs Kabsi (Rashid's own words), the honest facts | `d8-about.tsx` | C | Rashid |
| Partners `/partners`, `/partners/terms` | Kabsi Partners terms, payout minimum 25 | `d2-partners.tsx`, `partners_.terms.tsx` | C | Rashid |
| Security `/security` | What Kabsi stores and does not | `d8-security.tsx` | C, F | Rashid |
| Privacy `/privacy`, Terms `/terms` | The law's words, what Kabsi keeps about a business (including the two optional onboarding answers, R-145), retention, the contact list notice | `src/components/marketing/legal.tsx`, `src/lib/retention.ts`, `src/lib/consent.ts`; `src/routes/privacy.tsx`, `terms.tsx` | C (legal wording changes only with lane R) | Rashid |
| FAQ `/faq` and the FAQ on Pricing, Founding, Partners and the industry pages | Answers from the facts | `src/lib/faq.ts` (the JSON-LD builder), `src/components/kabsi/faq-data.ts`, `d8-faq.tsx` | F then C | Rashid |
| Setup call `/setup-call`, `/manager-steps` | How to add Kabsi as a manager; the booking is an email while `BOOKING_READY` is false | `setup-call.tsx`, `d2-flow.tsx`, `src/lib/manager-guide.ts` | C, S | Rashid |
| Log in `/login` and signed-out screens | Sign-in wording, the code email first in in-app browsers | `sign-in-panel.tsx`, `src/lib/sign-in-errors.ts`, `signed-out.ts` | C | Rashid |
| Header, footer, share text | Navigation, operator line, non-affiliation, social links | `site-header.tsx`, `site-footer.tsx`, `site-chrome.tsx`, `site.ts` | S | Rashid |
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
| Nora's questions and the judge | 60 plus 90 questions that check the facts | `scripts/nora-eval/` | By hand when the facts change | Build |
| Team-only notes | Never reach Nora or the site | `knowledge/internal/` | By hand | Rashid |

## 6. Emails

| Surface | What it states | Where it lives | Updated by | Owner |
|---|---|---|---|---|
| Product emails (review, weekly report, digest, access, deletion, receipt, payment failed, team invite and the rest; one sample of each) | The three states, one yellow button, the review subject `<Business>: new <n>-star review, reply ready` | Builders in `supabase/functions/_shared/email/` (`copy.ts`, `account-copy.ts`, `review.ts`, `report-body.ts`), `notify-engine.ts`, `team.ts`, `disconnect.ts`, `profile-snapshot.ts`; samples in `email/catalog.ts` | T: `docs/email-previews/` is the rendered copy (`index.html` lists every kind) | Build |
| Lifecycle emails (trial day 2, 7, 11, 14, winback 17, 30, verify, no access, ownership) | Trial, plan names and prices | `supabase/functions/_shared/email/lifecycle-copy.ts`, `lifecycle.ts` | T | Build |
| Auth emails (magic link, confirm signup, change email, reauthentication) | The code, the WhatsApp line | Built into `emails/auth/*.html` from `email/auth-templates.ts` by `deno run --allow-read --allow-write scripts/render-emails.ts`; pasted into Supabase Auth, Emails, Templates | T then H (Rashid pastes, `emails/auth/README.md`) | Rashid |
| Email footers | Brand line, operator, social links, unsubscribe | `email-layout.ts`, `email/template.ts`, `social-links.ts` | S | Build |

## 7. WhatsApp and Outbound

| Surface | What it states | Where it lives | Updated by | Owner |
|---|---|---|---|---|
| Agent replies to owners (say, intent, hours, photo post, stats, plan and billing answers, handoff) | What Kabsi did, asks for a yes, Undo, no promise | `supabase/functions/_shared/whatsapp/say.ts`, `agent.ts`, `alert-text.ts`, `google-action.ts`, `book.ts`, `policy.ts` | C (sections 20 and 30 of COPY.md) | Build |
| Request book replies (dark, off until Gate 2 and W-4) | What was saved, the guess marker, Undo | `supabase/functions/_shared/request-book/replies/` | C | Build |
| Kapso templates (Utility): the account and approval notices, the staff alert, the billing notice | The words Meta approved | Text in `supabase/functions/_shared/whatsapp/templates.ts` (name, body, example); approved copy lives at Kapso and Meta | K: a new name and version, resubmitted; the sender switches on its hourly status read | Rashid |
| Kabsi's WhatsApp profile (display name, about, address, description, photo) | Who Kabsi is on WhatsApp | Kapso project Kabsi.co, WhatsApp Business profile | H (Rashid; display name waits for Meta) | Rashid |
| Outbound emails (first email, follow-up, yes reply, footer, signature) | The offer: the free Google check and Google care only (no Founding 25 since Sync 2b, R-142); the reply to a yes adds the founding price sentence (`FOUNDING_SENTENCE` in `email/lifecycle-copy.ts`); why you got this | `supabase/functions/_shared/outbound/rules.ts` (`emailOne`, `followUp`, `SIGNATURE`, `FOOTER`), `inbox.ts` (`yesReply`), `docs/COPY.md` section 65 | C then T; Rashid approves every email in the daily batch at `/staff/outbound` | Rashid |
| Outbound list and counts | Who may be written to: UK registered companies active on Companies House, own-domain email (30.45 item 5; opens only when Rashid says start, after card payments open; the UAE and every other country stay off: `OPEN_COUNTRIES` in `outbound/rules.ts` and the database check on `open_countries` hold only GB); the six salon industries first (`SALON_INDUSTRIES`, R-142) | Harvey (`kabsi-harvey-run`, R-146) builds the list; `outbound-prepare` checks it | R (Harvey), H | Rashid, Harvey |

## 8. The signed-in app, staff area and billing

| Surface | What it states | Where it lives | Updated by | Owner |
|---|---|---|---|---|
| Owner dashboard screens (Home, Reviews, Google Profile, Content, Insights, Plan, Settings, Team, Photos, Hours) | Plain words, names from K-02, plan limits | `src/routes/_authenticated/app/`, `src/components/app/`, `src/components/home/`, `src/lib/entitlements.ts`, `src/lib/plans.ts` | C (sections 19, 36, 46, 51, 57, 60) | Rashid |
| Onboarding | Four stages, no passwords; two optional questions right after the business is chosen, shown only here and in About your business, never naming the request book, nothing sent because of an answer (Onboarding 1, R-145) | `src/components/onboarding/`, `src/lib/onboarding*.ts`, `src/components/onboarding/request-answers.tsx`, `src/lib/request-answers.ts`; the answers are columns of `locations` | C (section 18, 25, 73) | Rashid |
| Weekly report | Work done, what waits for a yes | `supabase/functions/_shared/care-report/compose.ts`, `report.ts`, `results-report/`, `insights/example.ts` | C | Rashid |
| Plan limits in the database | What each plan allows | `plan_limits()` (migration) and `supabase/functions/_shared/plans.ts`, `src/lib/plans.ts` | By migration | Build |
| Staff area | Staff only; never reaches owners. Businesses also shows Early answers: counts of the two onboarding answers and the first businesses to answer yes in chats, a notebook or memory, which is Gate 3's evidence (R-145) | `src/routes/_authenticated/staff/`, `src/components/staff/` (`request-answers-panel.tsx`; data from `public.staff_request_answers()`) | C (section 57, 73) | Rashid |
| Demo data | The two fictional demo businesses | `supabase/seed/demo.sql`, `supabase/functions/_shared/demo.ts` | By hand, with lane R | Build |
| Creem product names, descriptions and amounts | The ten products (founding and list families, extra location), the product description | `CATALOGUE` and `PRODUCT_DESCRIPTION` in `supabase/functions/_shared/creem.ts`; made in Creem by the setup action (`billing-creem/setup`) | S, then the setup action in test and live mode | Hussein (the Creem account), Build |
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
grep -rl "Founding 25\|founding 25\|25 founding" .                                                # Founding 25
grep -rl "Essentials" .                                                                           # plan names
grep -rl "Weekly Care Report\|Monday Report" .                                                    # retired names
grep -rln "Profile Score\|Listing Shield\|Put mine back" .                                        # never-say names
ls src/routes src/content/industries src/content/guides emails/auth docs/email-previews          # pages, industries, guides, emails
grep -o "kabsi_[a-z_0-9]*" supabase/functions/_shared/whatsapp/templates.ts                       # Kapso template names
```

(Run from the repository root, excluding `node_modules`, `.git`, `.output`, migrations and `docs/progress`.)
