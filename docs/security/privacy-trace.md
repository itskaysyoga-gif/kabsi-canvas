# Privacy trace: one owner message and one review through every provider

Written by Sec 2 on 27 Oct 2026 (master plan 30.15 section 8). Read from the code on branch `claude/sec2`; file and line are given so a later session can check them. "Sends" is what leaves Kabsi for that provider; "Keeps" is what Kabsi or the provider keeps. The public promise is `/privacy` (`src/routes/privacy.tsx`); retention is in `docs/security/retention.md`.

## The two items

- **A. An owner's WhatsApp message.** The owner types a message to Kabsi's number. Kapso delivers it to the `whatsapp` function (`_shared/whatsapp/channel.ts:53`), which stores it (`whatsapp_messages`), asks the intent router what it means, and answers on WhatsApp.
- **B. A Google review.** `syncReviews` reads it from the Business Profile (`_shared/reviews.ts`), `draftReview` classifies it and drafts a reply, the notification engine emails the owner and sends the WhatsApp alert, and the approved reply goes to Google through the one publication pipeline (`_shared/publish.ts`).

## Per provider

| Provider | A. Owner message | B. Review | Keeps |
|---|---|---|---|
| **Kapso** (WhatsApp) | Inbound: phone, text, media, shared contacts, referral (`channel.ts:53`). Outbound: phone, body, buttons (`kapso.ts:73-76`) | Alert: business name, stars, reviewer first name, up to 300 characters of the review, the draft, one-use button tokens (`deliver.ts:193-197`, `alert-text.ts:23-40`). Template: business and stars only | The chat in the Kapso inbox, no automatic date (privacy page section 14); Kapso and Meta under their own terms |
| **Anthropic** | Intent router: the typed text, fenced, at most 1,500 characters, and the role; no phone (`intent.ts:58-59`, `whatsapp/db.ts:219`). Nora: the question, role, language and the business name (`nora.ts:28-34`) | Classify: the reviewer's name, rating and text (`ai/reply.ts:27`). Draft: the review with the full reviewer name, business memory, business name, the last 5 approved replies (`reviews.ts:149-178`). Check: the fenced review (`ai/reply.ts:96`) | No training on API data; `ai_runs` keeps hashes and check names only (`ai/contract.ts:82-88`) |
| **Resend** (email) | Nothing | To (the owner's address), subject (business and stars only, `email/review.ts:77`), body with the reviewer's name, the review, the draft and one-use links (`email/review.ts:37-39`), preheader (first 90 characters) | Resend under its own retention (EU); Kabsi's `emails` table keeps address, subject, state for 12 months |
| **Supabase** (database, Storage, logs) | `whatsapp_messages`: phone and payload, the payload cleared once handled or after a day (`20261025100000_whatsapp_agent.sql:204-244`); `whatsapp_outbox`: phone and the reply text | `reviews` (text and name blanked after 30 days), `reply_drafts`, `publications`, `notifications.email_content` (7 days), `whatsapp_outbox` (**since Sec 2 the alert text is cleared one day after sending**, behind the retention switch) | Logs scrubbed (`_shared/log-scrub.ts`); see retention.md |
| **Sentry** | Error messages scrubbed of emails, phones, tokens; `{ step, type }` from the WhatsApp path (`webhook-route.ts:59`) | The same; **since Sec 2 the keys `reviewer`, `reviewer_first`, `business_name` are dropped** at the Edge as in the browser | EU region, no IP, no review content (privacy page) |
| **PostHog** | Nothing from the message | Server events: user uuid as distinct id, location and organisation ids, plan, rating, risk, channel, role (`20261025210000_growth_events.sql:31-35`); no email, phone or text | US region, IPs anonymised (`docs/platforms.md`) |
| **Creem** | Nothing | Nothing. At checkout: the owner's email (to fill the form), product, units, the organisation and business ids as metadata (`creem.ts:324-327`) | Merchant of record under its own terms; Kabsi stores events without the customer's name or email (`creem.ts:169-176`) |
| **DataForSEO** | Nothing | Nothing from the review. For maps: keyword, coordinates, zoom, a scan id or check code (`dataforseo.ts:66-70`); to locate a business once: its public name and address (`locate.ts:17`) | Disclosed on the privacy page (`privacy.tsx:150-158`) |
| **Geoapify** | Nothing | Nothing. Map centre coordinates and zoom; reverse geocoding of coordinates (`geoapify.ts:15,47`) | Map points only |
| **Meta Conversions API** | Nothing | Nothing. SHA-256 of user id, email and phone, fbc, fbp or ctwa id, plan, event id and time, only with ads consent (`meta-capi.ts:51-60,127-159`) | Off until the dataset exists |

## Fields sent that were not needed

| # | Where | What | Done |
|---|---|---|---|
| 1 | `whatsapp_outbox.body` | The alert's review excerpt, reviewer first name and draft kept 30 days after sending, while the privacy page says alert review text is not kept | **Fixed**: `private.clear_sent_alert_texts()` replaces it one day after sending (migration `sec2_approvals_cards`, part of the retention job; pgTAP `sec2_security.sql`) |
| 2 | `_shared/ai/reply.ts` classify | The full reviewer name to Anthropic for language and risk | LATER row: the evaluation set keys its cases on the classify input, so this is a reply-pipeline change for the reply lab (with item 4) |
| 3 | `_shared/log-scrub.ts` | Edge log keys `reviewer`, `reviewer_first`, `business_name` were not dropped | **Fixed** |
| 4 | `_shared/reviews.ts:149` draft input | The full reviewer name; the reply greets by first name only | LATER row: it changes a model input of the reply prompt, which needs the reply lab and the evaluation (plan 2.12) |
| 5 | `_shared/whatsapp/nora.ts:31` | The owner's business name to Nora, who answers only from public facts | LATER row: Nora's inputs belong to Eval 1 this week |
| 6 | Privacy page | Says review text and facts reach Anthropic only for drafting; every typed WhatsApp message also goes to the intent router and Nora | LATER row (Medium): lane R updates `/privacy` and the facts together (the facts are Eval 1's this week) |
| 7 | `_shared/visibility/locate.ts:17` | Name and full address to DataForSEO although the place id is known | LATER row (Low): public data, disclosed; search by cid first |
| 8 | Review email | Full reviewer name, while WhatsApp uses the first name | Kept: the owner sees the name on Google; noted only |

No raw phone number or email address reaches Anthropic, PostHog or Geoapify; the review email's subject carries no review text; Creem gets only the email it needs to fill the checkout.
