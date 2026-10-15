# Testing

## Database suite (P0.1-07)

pgTAP tests in `supabase/tests/`, run by the `database` job in `.github/workflows/ci.yml` on every pull request.

- `scripts/db-test.sh` starts a local Supabase stack, applies every file in `supabase/migrations/` in one transaction,
  deletes the pg_cron jobs and queued pg_net requests before it commits (the jobs call the production function URL),
  then runs `supabase test db`. Run it locally with Docker and the Supabase CLI: `bash scripts/db-test.sh`, then
  `supabase stop`.
- `supabase/tests/_fixtures.psql` builds a victim (owner A of business LA, partner P with member PA, one row in every
  table signed-in users can read) and the personas: anon, a stranger, the owner of another business, a member of
  another partner. Each test file includes it with `\ir` inside its own transaction and rolls back.
- `rls_tables.sql`: for every table in `public`, each persona's `select count(*)` of the victim's rows is 0. It also
  checks RLS is on everywhere, no policy for anon or authenticated is `using (true)`, no readable view bypasses RLS,
  and every readable table has a victim row. A new table fails until it gets a fixture row.
- `rls_functions.sql`: every SECURITY DEFINER function in `public` that authenticated can execute is called by a
  signed-in stranger against the victim and must refuse. The list is checked against `pg_proc`, so a new function
  fails until it has a test, and every function on the list must still be callable (nothing revoked by mistake).
  Since P0.1-08 it also checks that anon can run no SECURITY DEFINER function at all, that the helpers only triggers
  use are closed to authenticated, and that schema `private` (cron-only functions) is out of reach of anon and
  authenticated. A function the browser does not call belongs in `private`, or in public with no execute for anon
  and authenticated when an Edge Function calls it through the service role.
- `tenant_model.sql` (P0.1-09): every business has an organisation and a `google_connections` row; signing up puts a
  second business in the same organisation; owners of a business are owners of its organisation, managers and staff
  are not; partner members are mirrored into the partner organisation; the Google columns and `partner_id` on
  `locations` flow into `google_connections` and `partner_clients`; demo businesses get a demo organisation; the
  approval policy accepts only known kinds and needs consent to delegate; only org owners and admins read
  `subscriptions`; the API roles cannot write the new tables.
- `audit_log.sql` (P0.1-10): `audit_events` takes inserts only through `private.audit`; UPDATE, DELETE and TRUNCATE
  fail for the table owner and the service role outside `private.run_retention`, and inside it only redaction and
  rows older than 24 months are allowed; approvals, publications, drafts, skips, knowledge edits, onboarding steps,
  role changes and concierge tasks write events, with the request context from the `x-kabsi-*` headers (service role
  only) or the browser's own headers; no review text or reviewer name is copied in; owners read only their own
  businesses' events; `activity_feed` returns plain lines with routine checks collapsed into one a day.

- `jobs_queue.sql` (P0.1-12a): `jobs` is closed to anon and authenticated and written only through `enqueue_job`,
  `claim_jobs` and `finish_job` (service role); a dedupe key is taken while a job is pending, running or retrying; a
  claimed job is not claimed again; failed tries wait about 30 s, 1, 2 and 4 minutes, and the fifth failure makes
  the job dead with one #kabsi-alerts event; a handler can rule out a retry (failed); a job left running for 10
  minutes is handed on; the producers offer one review sync per business every 5 minutes (concierge businesses
  excluded), one draft per new review and one owner email run when an email is due; the tick calls the dispatcher
  only when a job is due; `record_sync_result` fills `google_connections`; staff job health lists stopped jobs.
- `task_engine.sql` (P0.3-05): `tasks` is the one owner queue, read by members and staff, written by nobody from the
  browser. One test per detector (new review, profile difference, two answers for one fact, post and photo drafts,
  failed publish, missing field and missing knowledge, lost access, expiring plan, the holiday stub): each makes its
  task, running it again makes nothing new, and the task closes with the right state when its source moves on (an
  approval follows the publication). No review text, reviewer name or Google value is copied into a task. A full run
  of every detector twice adds no row and no key is live twice. `list_tasks` puts urgent first and returns no points or
  score; `task_action` puts a task off (owner or manager, audited) and the detector keeps it off until its date; the
  `detect_tasks` job is offered every 5 minutes per business once `app_settings.task_detectors` is on, never for a
  disconnected one; the profile_tasks rows move once; `profile_score` and the old queue's functions are gone.
- `roles.sql` (P0.3-06): owner, manager and staff (K-16) each get exactly their rights, through RLS and the RPCs. Reads per
  role (the owner sees billing; the manager everything but billing; staff only photos, the review link and the business
  name), every changed RPC per role, and isolation: a manager of business B sees no row of business A in any table, and
  members of A cannot read, list, skip, invite, set or approve anything of B. Approvals: by default only the owner; a
  manager only for a kind the owner opened; never a high-risk review or a name, address, main category or open status
  change; staff never; undo and skip follow the same rule; approval emails go to owners only. Partner modes are stored
  only with consent text (10 characters at least) and date, enforced by the RPC and the table, and let a member of the
  business's live partner approve that kind only. Team: invite (lower-cased address, one email job), claim on sign-in
  once, change role and remove (owner only, never the last owner), each audited.
- `jobs_claim_concurrency.sh` (P0.1-12a), run by `scripts/db-test.sh` after the pgTAP suite because it needs two
  real sessions: 100 committed jobs, dispatcher w1 claims 60 and holds its transaction 2 seconds, w2 asks 0.3 s later
  and must get the other 40 at once; every job is claimed exactly once and w2 never waits (it fails if SKIP LOCKED is
  removed).
- `google_limits.sql` (P0.1-12b): the rate limiter, circuit breaker and postponed jobs are closed to anon and
  authenticated; four Google requests in one second go and the fifth waits a second; five edits to one profile in a
  minute go and a sixth waits until the oldest is a minute old, without taking a place; a read is not held by the edit
  limit; 20 failures inside a minute open the breaker for 5 minutes with one #kabsi-alerts message, the gate then
  refuses every request, and after the 5 minutes it closes with a second message; a postponed job goes back to the
  queue without counting the try; Protection is one job per business (every 5 minutes on the mock, hourly on live
  Google, none for concierge businesses); access, ratings, weekly reports, deletions, trial and renewal reminders are
  one job each, offered every 5 minutes at their own minute; the tick clears rate buckets unused for a day; the
  ops watchdog alerts when no job has finished in 20 minutes (it no longer watches `kabsi_cron_tick`).
- `retention.sql` (P0.2-01): `retention_policies` holds the eleven K-40 rows word for word, is closed to anon and
  authenticated, refuses more than 30 days for a Google class, and a missing class stops the job. Rows are seeded on
  both sides of every limit (31 and 29 days, 367 and 365, 732 and 729) and `run_retention()` must clear exactly the
  past ones: review text and names, report quotes, rating snapshots, decided Protection values, Places details,
  Google's raw responses, drafts and reply payloads of purged reviews, emails, chats, audit entries and the content of
  old Protection change events. Ids, ratings, dates, the owner's reply, knowledge, baseline and approved payloads stay.
  Photos 30 days on Google and skipped photos are marked and one `photo_files` job is offered; changing a limit in
  the table changes what the job clears. The Storage removal itself is `_shared/retention.test.ts` (Deno).
- `business_knowledge.sql` (P0.2-03): the card becomes one verified owner fact per value (lists one per distinct item,
  empty values none; counts per card key), with the K-10 keys, ask-again dates and uses (the contact phone has none);
  a later card edit is a new version and the old one stays, a removed value is outdated, a reorder is no change;
  baseline values arrive as needs_confirmation, source google; `confirm_business_details` refuses a signed-out caller,
  a manager, the partner and another owner, checks each detail, writes verified owner facts as new versions and one
  audit event, and only re-dates a value already confirmed; members read, nobody writes from the browser; every
  `listing_changes` row is mirrored into `profile_changes`; a newer change supersedes the open one (never kept, A5);
  keep is accepted with who decided, a put-back is rejected with its publication, then failed or back with the owner;
  `profile_daily()` expires changes older than 14 days (not on a demo business) and clears Google's values after 30
  days and 30 days after access is lost, keeping the owner's.
- `protection.sql` (P0.2-04): Google Protection on Business Knowledge. The detector, the decision and the mock send run
  for the service role only; a Google update to the hours is one change with its source, severity and explanation,
  raised once per value, superseded by a newer value, and skipped while a put-back is on its way; a value the owner
  never confirmed is watched, labelled and never offered for restore; a first value is noted, not raised; "Google is
  right" makes Google's value the approved fact and sends nothing; "Keep my information" makes one publication with
  the approved value, undo puts it back with the owner, verified is corrected; the high-risk fields (name, address,
  main category, open status, map pin) refuse an email link and a manager, and a second high-risk put-back inside 7
  days; a third put-back of a field in 30 days becomes a google_support staff follow-up and sends nothing; checks never
  create a publication; a disconnect hands an approved put-back back to the owner; a listing_changes id still resolves;
  the retired tables lose Google's values after 30 days while the owner's kept baselines stay; every change and
  decision is in the audit log without Google's values.
- `email_approvals.sql` (P0.2-05): email approvals tightened (K-17, K-38, K-70). The two link functions run for the
  service role only and the GET one is STABLE; a link asked for 7 days is stored with 72 hours and cannot be
  lengthened; opening a link changes nothing (no use, no audit event, no publication, no job); the first POST makes one
  publication with the channel email_link and an email_link_used audit event with the user, IP country and user agent;
  a second POST, whatever it asks, returns the first result; undo from the page cancels only that link's publication;
  expired, used, unknown, wrong-verb, recipient-less and non-member links are refused; a skip through a link is audited
  as email_link; urgent reviews, hours and profile changes refuse a signed-out POST and another recipient's session,
  and work for the recipient signed in, the name (high risk) included; the sign-in flag and the channel do not outlive
  the call; the kabsi_cleanup_action_tokens statement still removes links expired 30 days ago. The Edge Function side
  (GET never calls use_action_link, the session and the recipient are passed through, refusal words) is in
  `supabase/functions/_shared/email-links.test.ts`.
- `knowledge_source.sql` (P0.3-01): Business Knowledge is the source for every draft. `draft_facts` (service role
  only) returns the verified, current facts for one use; an AI suggestion, an unconfirmed website fact, a rejected
  fact and a fact past its ask-again date (prices 90 days, staff 180, hours notes 60) are in no draft, and confirming
  brings them in; a higher source replaces an unconfirmed lower one, a lower one never overrides; a website value that
  disagrees with the owner's hours makes one open question (however often it repeats), changes nothing and takes the
  hours out of the drafts until the owner or a manager answers; the owner's own edit answers it; `save_fact` writes a
  new verified version (the same value is no new version, list items keep their history, caps and lengths hold);
  `remove_fact` removes the row, every version and any question about it; every action is audited without the value;
  `update_knowledge_card` is retired (nobody may run it, no function calls it). The prompt side is
  `supabase/functions/_shared/facts.test.ts` (Deno, stub model calls only).
- `grounded_replies.sql` (P0.3-02): `ai_runs` and `style_edits` are closed to the browser, `style_offers` is read-only
  for members; a run is recorded with a prompt version like `reply.v1` and a hashed input (text is refused); a draft
  records its prompt version and the facts it used; three edits of one kind make one "Save this as a rule?" offer and a
  fourth does not ask again; an added fact makes one "Save this as a fact?" offer, asked once; only the owner or a
  manager answers; yes saves a verified owner rule or adds the sentence to what to mention, both through `save_fact`;
  no saves nothing and is never asked again; every answer is audited without the text. The pipeline itself is
  `supabase/functions/_shared/ai/ai.test.ts` (Deno, stub model calls only): the memory summary (ids, voice, rules,
  open questions, versioned, style examples apart), every code check, the contract runner (structured output, a fact id
  outside the trusted set, the "Is Maria still working there?" case, the model check, the `ai_runs` record), and edit
  learning.
- `review_risk.sql` (P0.3-03): `reviews.risk` takes only low, medium or high (new reviews start low); from an email
  link only the high-risk class needs the recipient signed in to approve; the ops digest counts high-risk reviews
  waiting; no database function reads the retired `urgency` flag. `jobs_queue.sql` checks that medium and high are
  emailed at once whatever the rating. The classifier is `supabase/functions/_shared/review-risk.test.ts` (Deno, stub
  model calls only): every trigger of the K-13 table in English, Spanish, French and Arabic, ordinary words that only
  look risky, the higher-wins merge with a stubbed Haiku (the model never lowers the code result, unknown answers are
  ignored, no model call when the rules already say high), no draft for high and the holding reply only on request, the
  guidance email, and the clinic rule (a reply that mentions treatment or confirms a visit is never ready).
  `tests/review-risk.test.ts` holds the words equal on the screens and in the emails.
- `publication_pipeline.sql` (P0.1-13a) and `publication_content.sql` (P0.1-13b): the one publication pipeline for
  replies, posts, photos, special hours and Google Protection put-backs. Per kind: one publication however many times
  or from whichever channel it is approved, the item moves to "on its way" and back on undo inside 10 seconds, one
  claim after the undo window, Google's answer moves the item (posted, reverted, failed, revert_failed), something
  not shown after 7 days is failed, and a concierge business gets no Google profile work.
  `publication_concurrency.sh`, run after the pgTAP suite, races a dashboard and an email approval, then two claims,
  in two real sessions for every kind: one publication, one publish job, one claim.

## The evaluation set and the prompt gate (P0.3-04)

`scripts/eval/cases.json` holds 200 invented reviews (60 normal, 40 complaints, 30 high risk, 30 injection attempts
in the text and in the reviewer's name, 20 for a dental practice, 20 that tempt invented facts), English first, then
Spanish, French, Arabic and Arabizi. `scripts/eval/eval.ts` runs each one through the production steps (classify,
no draft for high risk, the grounded draft with its checks and one rewrite) and scores only the drafts that come out
ready. The gate passes only with zero invented facts, zero followed injections, zero compensation offers, zero
health-rule breaks, 100 percent high-risk routing and no case that failed to run.

- `scripts/eval/eval.test.ts` (Deno, stub models only, run by `scripts/deno-check.sh` in CI): the set's shape, a
  passing stub passes, a failing stub is blocked on every rule, a stub that does only what its prompts say passes on
  today's prompts and is blocked when the injection rule, the compensation rule or the high-risk definition is removed.
- CI job "Prompt gate (evaluation set)" in `ci.yml`: passes at once when no file under
  `supabase/functions/_shared/ai/prompts/` changed. When one did, it runs `bash scripts/eval/gate.sh` on the real
  models if the repository variable `EVAL_LIVE` is `true` (with the `ANTHROPIC_API_KEY` secret); otherwise it fails
  and nothing is sent to Anthropic, so a prompt change cannot merge without the evaluation.
- By hand: `ANTHROPIC_API_KEY=... bash scripts/eval/gate.sh` (results in `eval-result.json`, exit 1 when blocked);
  `bash scripts/eval/gate.sh --stub fail` shows a blocked run with no network.

When you add a table or a browser-callable function, add its fixture row or its test in the same pull request.

## Job queue (P0.1-12a, P0.1-12b)

`supabase/functions/_shared/jobs.test.ts` (Deno) checks how one claimed job ends: success, a thrown error retried, a
`PermanentJobError` or an unknown kind not retried, `RetryLater` (Google paused or no place under the rate limit)
postponed without a failed try. The handlers and the `/api/dispatch` route are in `supabase/functions/api/jobs.ts`.

`supabase/functions/_shared/google/limits.test.ts` (Deno) checks what `gbp()` does with the gate's answers: a sixth
edit in a minute to one profile waits for its place and then goes; a wait over 65 seconds or an open breaker sends
nothing and throws `GoogleBusy`; every try passes the gate; 429, 5xx and no answer count as failures for the breaker,
a 403 does not.

Load test (`scripts/load/mock-500.ts`, workflow `.github/workflows/load.yml`): after `scripts/db-test.sh`, it seeds
500 mock businesses with three answered reviews each and runs one simulated hour: each loop runs the real producer and
the real dispatcher route (imported into the script, mock Google, limiter in the local database), then moves every
schedule back by what is left of the minute. It fails unless every business synced every 5 minutes after its first,
no job died or failed, nothing was due at the end and no dispatcher run came near the function time limit. CI adds
20 ms to every database call (`LOAD_LATENCY_MS`) to stand in for the network in production. Locally:
`bash scripts/db-test.sh`, then `eval "$(supabase status -o env)"; export API_URL SERVICE_ROLE_KEY DB_URL;
deno run -A --node-modules-dir=auto --no-lock scripts/load/mock-500.ts`.

## App and functions

`npm run typecheck`, `npm run lint:changed`, `npm test`, `npm run build`, and `bash scripts/deno-check.sh` for Edge
Functions (plan section 2.4).

## Google layer (P0.1-11)

Every Google call goes through `supabase/functions/_shared/google/` (K-34). Each area (accounts, locations, reviews,
posts, media, performance, attributes, notifications, updates, admins, verifications, placeActions, places) has a
`live.ts` and a `mock.ts` that return the same wire types (`types.ts`); `index.ts` picks one per business (a demo
business is always mock, R-17) and maps Google's responses to the app's shapes.

`tests/fixtures/google/*.json` hold one documented Google response per call, with the documentation page in `_doc`.
`_shared/google/mocks.test.ts` (run by `scripts/deno-check.sh`) checks that every field a mock returns exists in the
fixture with the same type. On Gate A day (P0.7-01) the fixtures are replaced with captured real responses and the
same test then holds the mocks to Google's real behaviour.

`scripts/check-google-calls.mjs` (`npm run check:google`, a step in CI's App job) fails when a Google API host appears
in code outside `_shared/google/` (src, supabase, workers, scripts). `tests/check-google-calls.test.ts` proves it fails
on `tests/fixtures/rogue-google-call.txt` and passes on the repo. Functions import the layer from
`_shared/google/index.ts`.
