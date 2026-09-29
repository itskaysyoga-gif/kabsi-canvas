# Kabsi work queue

Every task below fits one Claude Code cloud session and one pull request. Take them in order unless Rashid says otherwise. Decisions (D-entries) are in `docs/KABSI-SPEC.md`; the reasoning is in the Master Review doc.

## How to run a task

- Start a new cloud session on `rashidhamzy-hue/kabsi-canvas`, branch `main`, model **Sonnet 5.5**, effort **Medium**.
- Prompt: `Do task Q01 from docs/WORK-QUEUE.md. Follow CLAUDE.md.` (change the number).
- Tasks marked **Opus to plan**: first ask Opus 5.5 for a plan only, no code. Then paste that plan into a new Sonnet session to build it.
- One task per session. Merge the PR, press Sync in the Claude.ai project, then start a fresh session for the next task. Never reuse a long old session: its whole history is re-read on every turn.
- Visual and layout work goes to Lovable, where the preview is live (last section).

## One-time setup (Rashid, before Q01)

1. Rotate the NOWPayments IPN secret, because the current one was visible in a screenshot. Store the new one only as a Supabase secret.
2. Export KABSI-SPEC and KABSI-STATE from the Claude.ai project into `docs/KABSI-SPEC.md` and `docs/KABSI-STATE.md`. Commit them with `CLAUDE.md` and this file.
3. In the Claude.ai project, remove the pasted copies and add `docs/` and `CLAUDE.md` from GitHub (Project knowledge, +, GitHub). Press Sync after every merged PR.
4. Pause the scheduled routine until Sunday's reset; routines do not use the cloud credit.

## Foundations

### [x] Q01 · Card taps never depend on the database (D271) · S · Sonnet (code done 29 Sep; deploy kv-sync and the Worker, then run the backfill)
- Files: `supabase/functions/kv-sync/index.ts`, `workers/kabsi-go/src/index.js`
- Do: kv-sync writes the card's JSON to KV with no expiry instead of deleting it. The Worker stops setting `expirationTtl` on cache writes. Add a one-off backfill that writes every active card. Count one tap per card per 10 minutes using a KV key made from a daily-salted hash, never the raw IP.
- Done when: an edited card reaches KV within a minute, a tap still redirects with Supabase unreachable, and repeat taps within 10 minutes count once.

### [x] Q02 · Tighter invitation vetting (D270) · S · Sonnet
- Files: `supabase/functions/_shared/google.ts`, `supabase/functions/api/cron.ts`
- Do: replace the substring name match (`includes`) with an exact normalized name plus an address or city match. If the Invitation resource now returns a place ID, match on it first. Never accept when two consented businesses match. Add tests with look-alike names ("Cafe" and "Cafe Younes").
- Done when: tests pass and skipped invitations still reach Sentry and #kabsi-alerts.

### [ ] Q03 · CI checks on every pull request (D278) · S · Sonnet
- Files: `.github/workflows/ci.yml`, `package.json`, a Vitest setup
- Do: on each PR run install, type-check (`tsc --noEmit`, add a `typecheck` script), lint, build and `deno check` on `supabase/functions`. Add Vitest with first tests for `src/lib/region.ts`, the invitation matching from Q02, and the price constants.
- Done when: a PR shows green checks and a type error turns them red. Rashid then turns on branch protection for `main`.

## Revenue

### [ ] Q04 · New prices on the site (D281) · M · Sonnet
- Files: `src/lib/site.ts` (PRICES and JSON-LD offers), `src/routes/pricing.tsx`, the pricing block in `src/routes/index.tsx`, `src/lib/faq.ts`, onboarding plan copy, `public/llms.txt`, `docs/KNOWLEDGE-BASE.md` price lines
- Do: PRICES become Pro $19 a month or $190 a year, extra locations $15 or $150, the Lebanon bundle $120 a year, extra cards $10 or $40 for five; partner rates stay $8 and $6. Remove the 6-month plan. Plan cards: Free, Pro with a monthly or yearly switch, and the Lebanon bundle for Lebanese visitors only (through `region.ts`). Add "14-day free trial, no card".
- Done when: no "$75", "6 months" or `pro6` remains in `src`, `public` or `docs`, and pricing reads right at 390 and 1440 px in both regions.

### [ ] Q05 · Plans and the free trial (D281) · M · Opus to plan
- Files: a new migration, plan logic in the Edge Functions, `src/routes/_authenticated/app/plan.tsx`
- Do: plan kinds free, trial, pro_monthly, pro_yearly and lebanon_yearly. The trial starts when Google access starts (keep D241): 14 days, or 30 when `signup_source` is a partner. Emails 7 days and 1 day before the end, and on the day it ends. At the end the business drops to Free: drafting stops, the review link keeps working.
- Done when: a test business moves from trial to Free on expiry, and a payment extends the plan correctly.

### [ ] Q06 · Crypto billing through NOWPayments (D269) · L · Opus to plan
- Files: new `supabase/functions/billing/index.ts`, `supabase/functions/_shared/nowpayments.ts`, a migration for payment provider fields, the Plan page buttons
- Do: create an invoice through the NOWPayments API (priced in USD, paid in USDT on TRC20 or BEP20, `order_id` = the plan purchase). The IPN webhook verifies `x-nowpayments-sig` (HMAC-SHA512 over the key-sorted JSON body with the IPN secret), ignores repeats of the same `payment_id`, and only `finished` activates a plan. Write `payments`, start or renew the plan, post to #kabsi-money. Whish, OMT, cash and the manual USDT claim stay as fallbacks.
- Secrets: `NOWPAYMENTS_API_KEY` and `NOWPAYMENTS_IPN_SECRET`, in Supabase secrets only.
- Done when: a real $1 invoice marks a test plan paid on its own, and replaying the same webhook changes nothing.

### [ ] Q07 · Concierge mode for early access (D267) · L · Opus to plan
- Files: the staff area, a new migration, owner-facing access copy
- Do: a per-business `concierge` flag, capped at 30 businesses. Staff can enter a new review by hand (stars, text, author, date) and mark an approved reply "Posted" after posting it in Google. Owners see: "A person on our team posts what you approve, within one working day." Listing Shield stays off while concierge is on. The ledger records which staff member posted.
- Done when: a concierge business runs review, draft, owner approval, staff "Posted", with a complete ledger.

## Product and growth

### [ ] Q08 · Nora's knowledge base (D285) · S · Sonnet
- Files: `docs/KNOWLEDGE-BASE.md`, the script that builds `public/llms-full.txt`
- Do: rewrite for the new prices, both trials, payment methods, early access, the five module names, the partner program, the ranking line, "How is this different from Google's own AI replies?", security answers and the free setup call. Put a "Facts that change" block at the top.
- Done when: the rebuilt `llms-full.txt` holds the new facts and none of the old prices.

### [x] Q09 · One model setting; drafts on Sonnet 5.5 · S · Sonnet
- Files: the five places in `supabase/functions` that name `claude-sonnet-5`
- Do: move the model id into one constant or app setting. Switch drafting to `claude-sonnet-5-5` (same price as Sonnet 5) with `claude-sonnet-5` as fallback. Run the reply checks on 30 saved example reviews on both models.
- Done when: one setting controls the model and the PR shows the comparison.

### [ ] Q10 · Turnstile on public forms · S · Sonnet
- Files: the lead form, the review link tool, Nora's widget, `places-search`, `assistant`
- Do: add Cloudflare Turnstile to each form and verify the token server-side in the Edge Function it calls.
- Done when: a request without a valid token is refused with a friendly message.

### [ ] Q11 · Free tool: Google Profile Check · M · Sonnet
- Do: route `/google-profile-check`. Find the business, show public facts only with Google attribution and the 30-day cache rules: rating, review count, hours, holiday hours, photo count, website, phone, category. "Email me this" and the Pro trial offer. 3 checks per visitor a day, Turnstile, PostHog events.
- Done when: it works for five real businesses in Lebanon and the US.

### [ ] Q12 · Free tool: Review Reply Generator · M · Sonnet
- Do: route `/review-reply-generator`. The visitor pastes a review and gets the reply Kabsi would draft, using the product's prompt and safety check without a knowledge card, tagged "Example". 5 per visitor a day, Turnstile, trial offer.
- Done when: English, Arabic and Spanish reviews get replies in their own language.

### [ ] Q13 · Partner program, part 1 (D274) · M · Sonnet
- Do: the 30-day trial for partner signups (uses Q05). A referral dashboard in the partner portal: clients by status, this month's commission, next payout date, payout wallet. A print-ready insert PDF with the partner's QR code (`kabsi.co/start?p=<handle>`).
- Done when: a signup through a partner link gets 30 days and appears on that partner's dashboard.

### [ ] Q14 · Partner program, part 2 (D274) · M · Sonnet
- Do: a `partner_commissions` ledger filled by the billing function: 30%, or 40% for founding partners, for 12 months, counted after the 14-day refund window. A monthly job on the 5th prepares the NOWPayments mass-payout list for Rashid to approve; nothing is sent automatically at first.
- Done when: test payments produce the right commission rows and payout list.

### [ ] Q15 · Nora's tools and weekly evaluation (D285) · L · Opus to plan
- Do: tools `check_profile`, `draft_reply`, `book_setup_call` (Cal.com link) and `start_trial`; `account_status` in the app; first chips that depend on the page; WhatsApp hand-off for Lebanese visitors. Add `docs/nora-evals.csv` with 60 questions and a script that runs them against the live function.
- Done when: the evaluation runs and reports accuracy and honesty failures.

### [ ] Q16 · Deploy workflow and tap monitor (D278) · S · Sonnet
- Do: a GitHub Action that deploys Edge Functions and migrations with the Supabase CLI on merge to `main`, using GitHub secrets. A synthetic tap check on go.kabsi.co every 5 minutes that alerts #kabsi-alerts.
- Done when: a merged change to one function deploys without anyone touching it.

## Waiting on others

### [ ] Q17 · Card checkout through Creem (D269) · M · Sonnet · after Creem approves the account
- Do: checkout for Pro monthly and yearly; the Creem webhook into `billing` with signature check and repeat protection; renewals and cancellations; the customer portal link on the Plan page; "Pay by card" becomes the first button.

### [ ] Q18 · Go-live additions (D283) · L · Opus to plan · after Google grants API access
- Do: Google's performance numbers (calls, directions, website clicks) in the Monday Report and on Home; the 2026 review fields (reply URL, reply state, policy violation); Profile Care writing approved facts into Google's own fields.

## In Lovable, not Claude Code

- Home page in the 12-part order from the Master Review, with the module names, trust strip and honesty block.
- The visual fixes from the Visual review: real card photos, product screens instead of icon grids, the CTA band on sand, Nora's smaller icon on phones.
- Rule: finish and merge any open Claude Code PR that touches the same files before editing them in Lovable, and never edit the same area in both at once.
