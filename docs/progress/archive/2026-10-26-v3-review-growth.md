# 26 Oct 2026, V3: Review Growth, photos and the monthly question on WhatsApp, sensitive reviews, voice notes

Branch `claude/v3-review-growth` (the prompt named it), PR 246. Model: Sonnet. Budget: US$1 transcription and US$2 Anthropic for checks. Spent: **0 and 0**. No Anthropic call and no transcription call was made; every test runs on fakes and fixtures.

## Built

1. **Ask a customer** (30.15 3.5). `_shared/review-growth/message.ts`: one message, "Thanks for visiting {business}. If you would like to leave a review, here is our link: {link}", word for word the website's Send review link message (tests/review-growth.test.ts keeps them equal). On WhatsApp: "ask a customer" (or a shared contact) from the owner, a manager or staff gives one intro line and then the message as its own message, to forward. `receive()` drops `contacts` before the message is stored, so no customer name or number is stored even until the message is handled; the branch reads no number. The link is `https://go.kabsi.co/CODE?s=m`.
2. **Opens apart from reviews.** The Worker logs `?s=m` as source `message`; `tap` accepts it; `taps.source` allows it; `review_growth_stats(location, days)` returns new reviews and opens by message, QR and tag (bots out). The WhatsApp stats answer adds "... An open is not a review."
3. **Print cards.** `_shared/review-growth/pdf.ts` writes real PDFs (A6 counter card, A4 table tent, top half turned, fold line) in the design studio's words and order, with vector QR codes (`qrcode-generator`) for `go.kabsi.co/CODE?s=q` and Helvetica text. Both QR codes decoded back to the link from a rendered page (jsQR on a 150 dpi render). Function `review-cards` (POST code and kind, member of the business only, rate limited, config.toml line).
4. **Review link page** copy from the design studio card (line, two honesty lines, inactive text). Screenshots at 390 and 1440 px: no sideways scroll; read at 390.
5. **Photos from WhatsApp, both plans** (3.4). Plan flag `photos_from_whatsapp` is now true for Essentials. After the photo engine finishes, the tick (`whatsapp_photos_due`) asks the sender (owner or manager) "Put it on your Google profile?" with Yes, Edit, Skip; a photo from staff goes to the owners and managers instead. Yes is `approve_publication` on the whatsapp channel (the migration adds `photo` to its WhatsApp allow-list, the same text-patch pattern as 13b part 2's special hours), with the 10 second undo; Edit asks for the kind of photo (8 choices) and makes a new Yes, because the item hash covers the category and the old Yes is refused; Skip marks the photo skipped. A refused photo goes back to the sender with the reason.
6. **Monthly question** (3.3). `business_update_prompts` (one row per business per month), `whatsapp_monthly_due`; from the 2nd in the business's time zone, owner with WhatsApp on, entitled, not early access, a week old. The owner's next message within 3 days is the answer: No closes it, a short day or hours change is an hours draft, anything else is a post of the owner's own words (a price they just stated may stay; phone numbers and links may not, `checkTypedPost(..., { statedByOwner })`). No model call.
7. **Sensitive reviews** (3.7). `whatsappReviewAlert` sends a sensitive review (health, threat, legal action, or a named member of staff in a complaint) with no draft, no Approve, no review text and a "Talk to a person" button; any review at a health, legal or financial business is sent without the customer's words.
8. **Voice notes** (28.3, 30.5). `_shared/voice/transcribe.ts`: interface, ElevenLabs Scribe (`scribe_v2`, key only from `ELEVENLABS_API_KEY`), mock (fixtures only). Over 10 MB or 3 minutes is refused before download with the kind line; the audio stays in memory (the old `keepVoice` upload is gone); Kabsi says "I heard: ..." and handles the words as typed; without the key it says voice notes are not switched on yet. Ceilings: 20 a day per phone, 400 a day for the number. `scripts/voice-eval.mjs` speaks the 20 notes of `tests/fixtures/voice/notes.json` (4 English, 4 Gulf, 4 Levantine, 4 mixed, 4 Spanish) with text to speech and reports the word error rate per language.
9. **Facts** (07, 01, 02, 11), COPY.md sections 5 and 20, LATER (10 rows), SECRETS.md.

## Decisions to confirm
- Photos from WhatsApp on both plans overrides 27.4's table and the old COPY pricing row (30.15 3.4 and the task say both). The plan flag, the pricing page list and the Nora evaluation's reference answer (en11) changed with it.
- The ready message keeps the live wording ("Thanks for visiting ... here is our link") instead of the design studio's newer line, so WhatsApp and the website say the same; LATER row for UX 1 to change both together.
- The staff-name rule is read in `review-growth/sensitive.ts`, not as a new risk reason: a reason key would change the classify prompt (eval gate). LATER row.
- Files outside the V3 area that changed, listed for lane R: `whatsapp/agent.ts`, `db.ts`, `router.ts`, `roles.ts`, `say.ts`, `templates.ts`, `intent.ts`, `replay.ts` and the test world (the flows), `posts/typed.ts` (one optional argument), `scripts/nora-eval/questions.ts` and `questions-28.ts` (two references moved with the facts: en11 photos, n78 the plan row), `tests/conversations` expectations for photos, voice and contacts. No threshold, test or workflow was weakened.

## Tests actually run
- `npm run typecheck`: clean. `npm run lint:changed`: 0 errors (2 existing warnings in mockups.tsx). `npm run check:repo`, `check:tokens`, `check:google`, `check:anon`: pass.
- `npx vitest run`: 64 files, 503 tests pass (new: tests/review-growth.test.ts; edited: pricing and review page tests untouched, both pass).
- `bash scripts/deno-check.sh` with Deno 2.9.6 (installed with npm in the scratchpad): type-checks every function (review-cards included) and runs all `_shared` Deno tests, the evaluation set and the Nora stub gate: all pass (new: review-growth.test.ts, voice.test.ts; the 100-conversation WhatsApp suite updated for photos, voice, contacts, ask a customer).
- `node scripts/voice-eval.mjs --dry`: 20 notes, 1,607 characters.

## Migration
`supabase/migrations/20261026150502_v3_review_growth.sql`, applied with apply_migration (recorded version 20261026150502, file renamed to match). Read-back before and after: the four patch targets matched; after: `approve_publication` allows `photo`, `whatsapp_item` has the photo branch, plan_limits essentials and pro `photos_from_whatsapp` both true, the tick calls `review_growth_due`, taps check allows `message`, 6 new functions, `review_growth_stats` ran (4 tag opens for the first business, 0 else).

## Independent review (fresh agent, diff and rules only)
No defects in review-cards, the Worker and tap change, the migration's grants and RLS, the contact-not-stored path or the message. Eight confirmed findings, all fixed in this PR with a test each:
1. A bare "Yes" to the monthly question could approve an unrelated waiting item: it now asks "What is new?" and keeps the question open.
2. "make it shorter" on a sensitive review could make a draft with an Approve button: the sensitive alert no longer remembers the review, so no draft or exact reply can start from WhatsApp.
3. The 3 minute limit was Ogg only: audio whose length cannot be read and is over 1.5 MB is now refused with the same kind line.
4. Staff names missed capitalised roles and commas ("Dr Khan", "Nurse Lina", "Our waiter, Sam"): roles are read in any case, the name must start with a capital.
5. The "I heard" echo could carry a dash or exclamation mark and was long: cleaned and cut to 160 characters. The reply is kept in the outbox for 30 days like every reply; the audio itself is never kept.
6. "Which one?" called a photo "Reply": it says "Photo".
7. Photo Edit used the first business of a phone with several: the menu names none and the confirmation uses the photo's own business.
8. A failure on one claimed item dropped the rest: each item has its own try, the tick reports the failures after sending the others.
Also: the photo category menu closes on any other message.
Final local run after the fixes: `bash scripts/deno-check.sh` 861 and 15 Deno tests pass, Nora stub gate passed; `npx vitest run` 503 pass; typecheck clean.

## CI and merge
First push: the Database job failed on `supabase/tests/whatsapp_channel.sql` test 35 ("nothing but replies, posts and put-backs"), which asserted that a photo is refused on WhatsApp, the rule this change replaces. The test now asserts the same refusal for a profile edit (`listing_edit`) and its name says photos joined the list. This is an edit to an existing test, listed for lane R; no other test, threshold or workflow was touched. Head d0063bb: all 13 checks green (App, Database, Edge Functions and Worker, Nora gate, Prompt gate, Secret scan, Dependency review, Load, CodeQL, Lighthouse report only). Merged with a merge commit, 8ea50ef, `main` had not moved.

## After merge (PR 246, merge 8ea50ef, Deploy run 114 green)
- `POST /functions/v1/review-cards` with only the anon key: `401 sign_in_required` (the function is live and refuses anyone who is not signed in). Before the deploy it answered 404 not found.
- kabsi.co/review/KQA234 answers 200; the live `llms-full.txt` carries the new facts ("Ask a customer" 4 times).
- Database: no failed jobs in the last hour; `private.review_growth_due()` false after the first tick.
- The first live tick ran the new code: 7 V3 outbox rows. One "your photo is ready" went live to the Yawmiyati phone (an old test photo from 25 Oct, inside the 2 day window the tick reads), the rest to the fictional QA personas (mock) or queued as a batch; 3 rows in `business_update_prompts` (Yawmiyati, Harbour Lane Coffee, Juniper Hair Studio), the monthly question queued for each. A rollout artefact, not a bug: the photos the engine finished in the last 2 days were announced once.
- Not verified live: a real photo from the owner's phone through Yes, Edit, Skip to Google; a real voice note; a signed-in PDF download; a forwarded message link counted as `message` (the Worker `kabsi-go` is a job of the same Deploy run 114, which was green, but no real `?s=m` open has been made). These need Rashid's phone and a signed-in session.
