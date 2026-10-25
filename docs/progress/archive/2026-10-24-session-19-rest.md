# Session 19 rest (24 Oct 2026)

Wave A. Tasks in the order given: P0.7-05b with the post Undo test, P0.7-03 Pub/Sub, N-004, the 18.2 detection, the 9.8 line, docs/GOOGLE-ARCHITECTURE.md (25.2), the pipeline failure cases (25.3), AI quality and cost (26.1), the six agents (28.6), and the evaluations on the promotional credit (27.9). Parallel sessions: 13b part 1 (the whatsapp function and its tables) and Ops 1 part B (.github, scripts, docs, privacy pages); neither area was touched.

## PR A: N-004, structured drafts, prompt caching check, the six agents, cost per agent

- **N-004 root cause.** Sonnet 5.5 runs adaptive thinking by default and the thinking counts toward `max_tokens`. The draft call had 500 tokens, so on a longer review the model spent them thinking and wrote no text (`stop_reason=max_tokens`, empty reply). Fix: drafts run at `output_config.effort` low with 2,000 tokens; a call that still stops at the cap with no text is asked once more with twice the room (at most 8,000); a second empty answer is an error, never an empty draft. Posts (700 tokens) and Nora (700 tokens) had the same risk and got the same settings.
- **Structured drafts (26.1).** The reply call sends a fixed JSON schema (`REPLY_SCHEMA`: reply, facts_used, language, topics, every field required, no others) as `output_config.format`; `parseReply` still validates the answer in code and throws away anything that does not fit. The prompt text (reply.v2) is unchanged, so no prompt file changed.
- **Prompt caching (26.1).** Checked in code and by test: every draft call sends the fixed rules, then the business's memory (the facts), then the owner's recent replies, each as a cache breakpoint; the review is in the user turn after the cached prefix. The meter now counts cache reads and writes apart, so the saving shows in `ai_agent_usage` and in the evaluation report. Order kept as rules, facts, style examples: the style examples change with every approved reply, so they sit last (decision to confirm: 26.1 says "facts block last"; putting the facts after the style examples would break the facts' cache each time a reply is approved).
- **The six agents (28.6).** `supabase/functions/_shared/ai/agents.ts`: Reply, Guard, Growth, Insights, Scout (empty, for V1) and Nora, each with its job, its tools and a model per step. `useTool` throws for a tool outside an agent's list (Reply's drafting and Nora's tool calls check it); no agent has a Google write tool, only `propose_publication`, which the owner approves. Haiku for classify and checks, Sonnet for drafts, posts and Nora, never Opus (tested).
- **Cost per agent per business.** New table `public.ai_agent_usage` (day, agent, model, business, jobs, tokens, cache reads and writes, cost in millionths of a US dollar), written by `ai_agent_usage_add` after each drafting job and each Nora turn. Staff read only (RLS); the function is service-role only. Applied with execute_sql (on delete cascade, R-44); read-back: 0 rows, RLS on, anon cannot execute, service_role can. Advisors: nothing new.
- Tests: `supabase/functions/_shared/ai/agents.test.ts` (9 tests: the agents and their limits, the model rule, N-004 retry and the error after a second empty answer, the schema, the cache breakpoints, cost).
- Checks run: `npm run typecheck` (clean), `npm run lint:changed` (0 errors), `npm test` (55 files, 430 tests passed), `bash scripts/deno-check.sh` (every function checks; 518 and 10 Deno tests passed; the eval and Nora gates pass on stubs).
- Model calls: none.

PR A: [itskaysyoga-gif/kabsi-canvas#204](https://github.com/itskaysyoga-gif/kabsi-canvas/pull/204), merged 24 Oct with ci.yml green (the first Database run failed on the RLS fixture rule for the new table; fixed with a victim row).

## PR B: Google needs action (18.2), Pub/Sub (P0.7-03), the 9.8 line

- **Detection (18.2).** The Guard reads Google's VoiceOfMerchantState once a day inside the hourly Protection job, and at once on every Pub/Sub notification for the business (`google_state_check` job). `googleAction` maps it: complyWithGuidelines is "suspended", a verify action is "verify", resolveOwnershipConflict is "ownership", hasVoiceOfMerchant false is "no_voice". Only the parts the rule reads are stored (`google_connections.google_state`), no text.
- **Pause and resume, in the database.** `record_google_state` marks the business, opens one urgent task of kind `google_needs_action` (shown on Home and Google Protection, "See what Google asks"), and writes one ops event per new action and day. `claim_publication` returns `paused` while the mark is set: nothing is sent, the item stays approved and the job waits an hour. When Google clears the state the task closes, an ops event says so and the waiting publish jobs are offered again at once.
- **25.3 checks right before the write** (in the same claim): the plan still allows publishing, the business is not being disconnected, and the approver may still approve this kind for this business; otherwise the item fails with a plain reason and nothing is sent.
- **Pub/Sub (P0.7-03).** New function `google-events` (verify_jwt off): every push must carry Google's OIDC token (RS256 against Google's current keys, issuer, audience `GOOGLE_PUBSUB_AUDIENCE`, service account `GOOGLE_PUBSUB_SERVICE_ACCOUNT` with a verified email, not expired). A notification only offers jobs: new or updated review, a review sync; Google update, a Protection check; new customer media, the task detectors; every one also the Google state read. Each message id is stored once in `google_events`, so a replayed or duplicate push does nothing. The daily reconciliation stays.
- Mock and live paths: the mock VoiceOfMerchantState is clear; the live Yawmiyati capture (8 Oct) is clear; the documented fixture with complyWithGuidelines maps to suspended.
- Tests: `supabase/functions/_shared/google/events.test.ts` (7: a forged push refused in 10 ways, a real one accepted, parsing, the jobs per kind, the state mapping on mock and live fixtures, the daily cadence), `publish.test.ts` (paused: no Google call, stays approved, then goes out), `supabase/tests/google_state.sql` (pgTAP: suspended pauses, one task, one ops event, a second read adds nothing, verify updates the task, cleared resumes, unknown action refused, a removed approver stops the write, only the service may record).
- Facts: `knowledge/facts/04-product.md` gains the "When Google needs action" line; `node scripts/build-kb.mjs` run.
- 9.8: the staff phone line now reads "The staff phone is bound by a one-time staff code in session 13b; no personal phone number is written in the repo."
- Google guard: passed. No new write to Google; the only new Google read is VoiceOfMerchantState (read only, mock in mock mode, through the limiter); nothing from Places is stored; Google's text is not stored.

## Stopped at 25.2: Google's policies conflict with parts of the design (24 Oct 2026)

The task says to stop and tell Rashid if a policy conflicts with the design. Pages read 24 Oct 2026 (raw text, quoted exactly):
Business Profile APIs policies (developers.google.com/my-business/content/policies, last updated 28 Aug 2026), Business Profile third-party policies (support.google.com/business/answer/7353941), Google Maps Platform Terms (last modified 26 Aug 2026), Maps Service Specific Terms (15 Oct 2026), Places API policies (21 Oct 2026), Google APIs Terms (9 Nov 2021).

1. **Storing Business Profile data.** Policies: "You cannot pre-fetch, cache, index, or store any content provided through the Business Profile APIs ("Content") for use outside of your Business Profile project except for limited amounts of Content. ... It must be stored temporarily for no more than 30 calendar days. It must be stored securely. It cannot be manipulated or aggregated in any way." Kabsi keeps reviews, performance numbers and listing snapshots longer and builds week on week trends (Weekly Care Report, the coming Results Report). Open question: does "for use outside of your Business Profile project" cover Kabsi's own use for the same owner? If not, a 30-day limit applies to Google's content.
2. **Competitor data across customers.** Third-party policies: "You must not compare or share one customer's Business Profile-specific data with your other customers." Competitor Watch must never use a competitor's Business Profile API data when that competitor is also a Kabsi customer.
3. **Rank data from other sources.** Third-party policies: "If your service provides reporting data from other profile management platforms, you must report the Business Profile data separately from the non-Business Profile data." The Visibility Map and AI Visibility numbers must be shown apart from Google's own numbers and labelled as not from Google.
4. **Visibility Map from Places.** Maps Platform Terms 3.2.3(a): "Customer will not export, extract, or otherwise scrape Google Maps Content for use outside the Services ... (iii) copy and save business names, addresses, or user reviews"; 3.2.3(c): "Customer will not create content based on Google Maps Content."; Service Specific Terms: place_id may be cached, latitude and longitude for up to 30 days, nothing else. A rank grid built and stored from Places Text Search would break these. A grid from DataForSEO only, kept apart from Places content, avoids these clauses (analysis, not Google's words).
5. **Notices owed today.** Policies: "provide notice to the end-client of the change within 48 hours after the change is made. Make this notice separate and distinct from any other notices that Business Profile might automatically provide" (the access-granted email may cover it; to be checked). Third-party policies: a fee-charging manager must tell customers Business Profile is free ("At a minimum, you must inform new customers in writing before you manage their profile and disclose the existence of this fee on customer invoices") and link the "Working with a third party" disclosure on the website.
6. **No conflict found** with: the Manager access model, owner approval of each write, no auto-revert of Google's changes, place IDs kept long term, the never-imply-endorsement rule. Nothing found on the pages about showing third-party ranking data next to Business Profile data beyond points 3 and 4.

What was not done because of the stop: docs/GOOGLE-ARCHITECTURE.md and the retention table (25.2), the rest of 25.3, the judge and the kabsi-eval skill (26.1), Nora's 20 new questions, and the live evaluations (no model call has been made). The saved page text is in the session scratchpad, not in the repo.

PR B: [itskaysyoga-gif/kabsi-canvas#205](https://github.com/itskaysyoga-gif/kabsi-canvas/pull/205), merged 24 Oct with ci.yml and Load green (the first run failed on the private-function rule and prettier; fixed). Migration `20261024130000_google_needs_action.sql` applied with execute_sql; read-back: no business marked, the task kind widened, record_google_state and google_action_copy not executable by signed-in users, claim_publication returns paused. After merge: Deploy run 90 green; `google-events` version 1 active with verify_jwt off; a forged push answers 503 (the two Pub/Sub secrets are not set yet, so nothing is processed); kabsi.co 200; jobs of the last 40 minutes all succeeded. yawmiyati.com answered Cloudflare 522 (origin unreachable) on four tries, so the Update with Learn more must not go live until it answers.

## 25 Oct 2026: lane R decisions on the Google policy points (R-91, master plan 30.10), and the work they set

Rashid decided the nine points (master plan 30.10). Session 19 rest continues.

## PR C: Google's policies on record and the fixes they need

- Master plan 30.10 and R-91 (plan index and the full table) record the decisions.
- `docs/GOOGLE-ARCHITECTURE.md`: the access model, what Kabsi may do and never does, the quotes with links and the date read, rank data next to Business Profile data, the retention table per data type with each gap fixed or listed, and the notices owed.
- Nothing from Places is stored but the place ID: the Places layer has no cache (getPlace always reads Google; the cache functions are no longer called); the free check's email and WhatsApp copy read Google live (a business Google no longer has answers "not found", a used-up day answers the busy line); the post writer reads category and area live and saves only Kabsi's posting slot; the daily rating and review count come from the business's own Business Profile (reviews list totals, mock and live), not Places.
- `private.purge_after_leaving()` (daily, 02:58 UTC): 30 days after a business leaves, its rating snapshots, weekly report copies, Coach read and Google state are deleted too (reviews and listing rows were already deleted by run_retention; a disconnect marks access lost).
- `supabase/manual/20261025_places_data_purge.sql` for Rashid: removes the Places content stored before the change (2 cache rows, 4 rating snapshots up to 25 Oct, 3 Places categories). Expected read-back `0 | 0 | 0`.
- Gaps listed, not fixed here: the weekly backups keep 8 weeks (Ops 1 owns it); the business name, address and country picked at sign-up come from the Places search (UX 1 replaces them from the Business Profile once access works).
- Facts (07, 11) and the privacy page and the check's attribution line now say the public details are read from Google each time and not kept.
- Phone numbers: Rashid's number replaced with +1 555 010 4477 in `_shared/drafting.test.ts`, `_shared/google/capture.test.ts`, `_shared/review-graphic/text.test.ts`, the evidence archive and KABSI-AUDIT K-123. Left for 13b part 2 (WhatsApp area): `tests/whatsapp.test.ts` lines 193 and 194.
- Tests: profile-snapshot (no cache, a second check reads Google, the email and WhatsApp copies read live, busy and not found), places (nothing cached), `supabase/tests/purge_after_leaving.sql`, the counts in `tests/free-tool-busy.test.ts` and `tests/places-field-masks.test.ts`.
- Google guard: passed. No new write; the rating read is the reviews list Kabsi already reads; mock has the same totals; nothing from Places is stored.
- 25 Oct, lane R decisions on PR C: (1) apply its migration with execute_sql and record it in schema_migrations; (2) the first Load failure was the same pgTAP check as the Database job (CI unschedules cron jobs, so `cron.job` is empty there); fixed, and Load passed on 9cc4636; (3) **30.10.1:** Google data is deleted 7 days after a business leaves (the `google_data_after_access_lost` row, read by run_retention and purge_after_leaving) and backups keep 3 weekly sets, 21 days (`scripts/backup/backup.sh`, the workflow comment, the RUNBOOK), so the worst case is 28 days; the disconnect email, the facts, the privacy and terms pages and the retention table say so; `tests/retention-page.test.ts` now applies later keep_days changes; (4) on the first successful Business Profile sync the name, address and country picked from Places are replaced from the profile (`adoptProfileIdentity`, `locations.profile_identity_at`).
- PR 210 merged 25 Oct (merge commit 2432eaf) after the protect-main ruleset that required a check named "CI / App" was disabled by Rashid; its three migrations were applied by lane R. Deploy run 92 green.

## 25 Oct 2026: P0.7-05b, the post Undo test (passed)

- yawmiyati.com stays down, so the test ran on an Update with no Learn more link. Kabsi prepared it as a draft (gbp_posts `f6f2da62`, source auto, "A new story is up on Yawmiyati today. Come and read it with your morning coffee.").
- Rashid tapped the Update's own Approve, then Undo. The database read-back:
  - one publication, `2fb23502`, channel dashboard, approved at 05:34:54.50 UTC with `publish_after` 05:35:04.50;
  - undone at 05:34:58.16 (3.7 seconds later): state `cancelled`, error `undone`, attempts 0, never claimed, no Google reference;
  - the post is back to `draft`. Nothing reached Google.

## 25 Oct 2026: P0.7-03, Kabsi's account registered with the topic (PR 212)

- `google-events` takes `{"op":"register"}` with the internal secret. It was called from the database with pg_net, so the secret never left it; request 48961 answered 200.
- Google read the setting back: `accounts/113746201522792609010` (the account Yawmiyati is managed through) points at `projects/smiling-chess-505915-b7/topics/gbp-notifications` for NEW_REVIEW, UPDATED_REVIEW, GOOGLE_UPDATE, NEW_CUSTOMER_MEDIA, DUPLICATE_LOCATION and VOICE_OF_MERCHANT_UPDATED. The Q&A types and LOSS_OF_VOICE_OF_MERCHANT are deprecated and left out.
- The Pub/Sub Publisher role for mybusiness-api-pubsub@system.gserviceaccount.com was already on the topic (Rashid).
- Live refusals on google-events: no token 401; a forged RS256 token 401.
- Not yet seen: a push from a real review. `google_events` was still empty at the last check. Rashid leaves or edits a review on Yawmiyati; then a `google_events` row and a `sync_reviews` job should follow within a minute.

## 25 Oct 2026: PR D (213), access notices, the free-from-Google line, the WhatsApp pipeline side

- Access notices go by email and, for owners with an active WhatsApp opt-in, by WhatsApp: when access is granted, changes or ends. The WhatsApp removed text says the data is deleted within 7 days. The template name is `KAPSO_TEMPLATE_ACCESS_CHANGE` (listed in docs/SECRETS.md); no template is sent until it is set.
- "Google Business Profile is free from Google. Kabsi is an independent paid service." with Google's "Working with a third party" link, on the onboarding Manager step and in the access email. Facts 05 updated.
- The WhatsApp pipeline side for 13b part 2:
  - special hours may be approved on WhatsApp, and `apply_regular_hours` takes the whatsapp channel;
  - `owner_post_prepare` and `special_hours_prepare` (service only);
  - `checkTypedPost`.
- Migration applied with execute_sql. Read-back: both conditions changed, and signed-in users cannot run the new functions.
- 13b part 1 had already used the timestamp 20261025100000, so the file moved to `20261025100020_whatsapp_pipeline_hours_posts.sql` in PR 215, and schema_migrations records 20261025100020.
- The first Database run failed: an untyped literal picked the older `approve_publication(text, uuid, text, ...)` overload. The test now passes jsonb.

## 25 Oct 2026: PR 215, main fixed

- PR 213 merged right after PR 211 (13b part 1). The two never ran CI together, so main failed:
  - the Edge Functions typecheck: `TemplateRef` is now named params;
  - the repo check: the two migrations shared a timestamp.
- Both fixed in PR 215, merged with CI green.

## PR E (216): the judge, contradictions, kabsi-eval, Nora's 20 questions, the 27.9 cut, 25.3

- **Contradictions (26.1).** The memory leaves out a one-answer field with two different answers, and any fact under an open question; the existing memory test now expects the hours under an open question to be left out too. 10 cases on a café with two closing times and two prices (EN, ES, FR). The code checks hold a leaking draft ("the opening hours in the draft are not in your facts", "states a price that is not in your facts"), and each case's forbid patterns catch the leak.
- **The judge (26.1):** `scripts/eval/judge.ts`, a rubric per evaluation, Haiku, cached rubric and facts, scores per prompt version in `scripts/eval/scores.json`. The rubric and the dataset format are in `.claude/skills/kabsi-eval/SKILL.md`.
- **Nora (28.7):** 20 questions in `scripts/nora-eval/questions-28.ts`; all 80 pass on the reference answers. The live runner now caches the facts and uses Nora's chat task settings (N-004).
- **27.9:** the cut is 160 cases (50 everyday, all 110 safety, injection and contradiction cases, Spanish included). Both runners stop at a budget. The by-hand workflow `Eval live (by hand, 27.9)` defaults to 5 USD for replies and 2.5 USD for Nora.
- **25.3:** `supabase/tests/publication_waiting.sql` covers the plan ending, and the owner disconnecting, while an approved item waits. The other 25.3 cases were already covered: double approval, double webhook (google_events message id, email links), two workers claiming, undo, timeout and reconcile, rate limit, moderation, a different result on Google, approver removed, Google needs action, and "published" only after the read back.
