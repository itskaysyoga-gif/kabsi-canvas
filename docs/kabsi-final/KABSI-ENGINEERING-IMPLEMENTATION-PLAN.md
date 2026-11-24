# Kabsi engineering implementation plan

Version 3.1, 24 November 2026. Replaces every earlier version. AUDIT-1 is done. FIX-0 is approved. Nothing else is authorized yet. Each later session needs its own authorization. One session, one branch `claude/<task-id>`, one pull request, under `CLAUDE.md`.

## 1. What exists

Evidence: repo `itskaysyoga-gif/kabsi-canvas` at commit ef06e4b (12 Nov 2026), Vercel, PostHog project 627817, the Cloudflare worker list. Not inspected: Kabsi's database (`ynjdqjlmdwjgbfezevxy`) and its Kapso project, which this chat cannot reach. AUDIT-1 covers both from a build session.

| Area | Built | Operational | Needed for launch |
| --- | --- | --- | --- |
| Google connection, publish pipeline, verification reads | Yes | Verified live on one business | Test on 2 more listings |
| New review notices from Google | Yes | Per repo | Confirm after FIX-0 |
| Risk rules, classifier, grounded reply, tone judge, prompt gate | Yes | AI credit expired 17 Nov | Paid key with a hard cap |
| Sensitive review alerts | Yes | Per repo | Test |
| Google Protection: watch, explain, one-tap decision | Yes | Verified live | None |
| Google status reads (suspension, verification) | Yes | Per repo | Test on a mock state |
| Holiday prompts and hours | Yes | Per repo | Test one holiday |
| Posts from owner input, monthly "anything new?" | Yes | Automatic schedule retired | Set the 2-a-month cadence |
| Photos | Yes | Verified live | None |
| Profile Coach, website check | Yes | Per repo | Limit to first week and every 90 days; extend to links |
| Review link, QR, NFC, taps, ready message | Yes | Live | Placement links and guides |
| Weekly report | Yes | Verified live | Shorten |
| Insights (Google performance figures) | Yes | Per repo | Feed the monthly report |
| Competitor picks | Yes | Snapshot history exists | Switch to a live monthly read; history off |
| Billing with Creem | Yes | Test mode only | One plan; live setup needs Rashid and the account holder |
| WhatsApp owner channel | Yes | Owners on since 5 Nov | Kapso Pro before the first paying business |
| Monthly report, review patterns | No | | Build |
| Automatic replies | No | | Build after the pilot starts, shadow mode only |
| Visibility map, AI answer checks, request book, partners, Outbound | Yes | Mixed | Switch off |

Removed from every plan by the founder override: request engine, customer contact tables, sending adapter, inbound email, notice parsing, lists and imports, suppression, FEAS-1.

## 2. Sessions

| Order | Task | Model | Goal | Before the pilot |
| --- | --- | --- | --- | --- |
| Done | AUDIT-1 | | Read-only audit, run from the lane R chat on 24 November. Report: `KABSI-AUDIT-1-REPORT.md` | |
| 0 | FIX-0 | Sonnet | Restore the backend, locked out since 14 November, and add an outside check | Code merged (#589) and deployed 24 November. Ends when KABSI_SECRET_KEY is set and the five proofs pass |
| 1 | OFFER-2 | Sonnet | One plan at 29, switch off costly jobs, set the post cadence, update facts and site copy | Yes |
| 2 | PROOF-2 | Sonnet | Link watch, short weekly receipt, monthly report, placement links and guides | Yes |
| 3 | GATE-2 | Opus | Onboarding in three steps, first-day backlog, launch tests, pilot kit | Yes |
| 4 | AUTO-1 | Opus | Automatic replies in shadow mode only | No. Starts once the pilot is running |

One repair and three build sessions stand between today and the pilot. The WhatsApp work of blueprint section 11 is inside OFFER-2, PROOF-2 and GATE-2. No new agent and no new service.

### AUDIT-1 (done)
Finding that changes the order of work: since 14 November 05:37 UTC every function's database call is refused (401) and every scheduled call is refused (403). Nothing has synced, published or been sent for 10 days. 37 jobs wait in the queue. Full report in `KABSI-AUDIT-1-REPORT.md`.

### FIX-0
- **Cause to confirm:** the key the functions hold (`SUPABASE_SERVICE_ROLE_KEY`) is no longer accepted by the database API.
- **Fix:** restore a valid key for the functions. No schema change.
- **Before the queue runs again:** list the 8 waiting publications and the 11 waiting post runs for Rashid. Anything older than 7 days is cancelled, not published late.
- **Outside check:** a monitor outside the project that calls `/health` every 5 minutes and alerts when the scheduler has logged nothing for 15 minutes.
- **Also:** add the audit report to `docs/progress/archive/2026-11-AUDIT-1.md`.
- **Acceptance:** scheduler log lines resume; a review sync succeeds on Yawmiyati; the WhatsApp health check writes a new row; a test message to the number gets a reply; no stale item was published.

### OFFER-2
- **Changes:** `src/lib/plans.ts`, `supabase/functions/_shared/plans.ts`, `supabase/functions/billing-creem` to one plan (29 monthly; founding 19 for 12 months, 25 places, private); `knowledge/facts/04-product.md` and `06-pricing-and-payment.md`, then `node scripts/build-kb.mjs`; `docs/COPY.md`; public pages to the website blueprint; walk `docs/SYNC.md`.
- **Jobs off by setting, never deleted:** `kabsi_visibility_tick`, `kabsi_ai_visibility_tick`, `kabsi_outbound_prepare`, `kabsi_outbound_send`, `kabsi_outbound_inbox`, `kabsi_partner_billing`, `kabsi_partner_payout_run`, and any Slack job left. Competitor snapshot writes off.
- **Posts:** at most 2 prepared a month per location (one calendar, one owner input), unapproved posts expire after 7 days, nothing prepared without a confirmed fact.
- **Migration:** additive: `founding_ends_at` on the subscription, settings for the prices and the post cap.
- **Also off by setting:** `request_book`, `ai_visibility_mode`, `dataforseo_mode`. Automatic posts to 2 a month on every location.
- **WhatsApp (blueprint 11):** new owner help text and router descriptions for the Google-care tools only; read tools "waiting" (unanswered reviews, pending approvals, detected problems, as a numbered list), "done" (the latest weekly summary and the report link) and current hours; a reply edit can name a review from the waiting list; a post in plain words without "post:"; the QR code sent as an image; WhatsApp answers on the small model; the fixed off-topic line ends with "talk to a person" and hello@kabsi.co (Meta's escalation rule).
- **WhatsApp tests:** each of the seven sentences in the launch checklist line 16 reaches the right tool with a stubbed router; a manager and a staff phone get only their own tools; a voice or forwarded "yes" approves nothing; an off-topic message gets the fixed line.
- **Acceptance:** test-mode checkout shows 29, and 19 with the founding flag, with the month-13 price stated; no public page names Essentials, Pro, AI answers, the map or any message to customers; a disabled job makes no provider call; CI green.

### PROOF-2
- **Link watch:** extend `supabase/functions/_shared/coach/site.ts` with `link-watch.ts` for the website, booking and menu links on the listing, through the existing safe fetch; three failures (now, 30 minutes, 2 hours) before one alert; a recovery line. Job `kabsi_link_watch`, daily.
- **Weekly receipt:** shorten `_shared/report.ts` output to 3 to 5 lines.
- **Monthly report:** new `_shared/monthly-report/` in three bands, every Google figure and review pattern from a fresh read, nothing derived from Google stored beyond 30 days. Job `kabsi_monthly_report`, the 1st at 08:00 local.
- **Placement links:** several labelled short links per location through the existing `cards`, `taps` and `workers/kabsi-go`; a "Get reviews" page with the guides; taps by placement in both reports. No customer data.
- **Competitors:** one live Places read a month for 3 picks; totals only.
- **WhatsApp (blueprint 11):** a weekly-hours change for one day of the week and a phone or website change, each shown back exactly and approved with a tap, on the existing listing write, with an independent review; Google's own calls, directions and website clicks added to "stats" from a fresh read; competitor totals, recurring feedback and profile health on request, each reusing this session's report code.
- **WhatsApp tests:** a weekly-hours change replaces only the named day; the shown text equals what is sent to Google; name, address and category changes are refused with the guide line; a competitor request beyond one a week makes no provider call.
- **Acceptance:** a report built from fixtures matches an expected report line by line; no line counts a check as work; a broken test link alerts only after the third failure; no stored review text or Google figure older than 30 days.

### GATE-2
- **Onboarding:** three steps (find business, add Kabsi as manager, choose email or WhatsApp), phone first at 390 px.
- **First-day backlog:** on connection, draft replies for unanswered reviews from the last 90 days and send them as one approval batch.
- **Profile Coach:** first week, then every 90 days, no standing list.
- **Launch tests:** the checklist section 1 on Yawmiyati and two more authorized listings; an evidence file with a pass or fail per line.
- **Pilot kit:** a one-page pilot agreement text, the pilot signup path with the founding price, and a staff view of activation and weekly approvals per pilot business.
- **Billing:** everything verified in test mode. Switching Creem to live is not part of this session and needs Rashid's approval.
- **WhatsApp:** run launch checklist lines 16 to 19 on the live number with the founder's own phone, typed and by voice.
- **Acceptance:** a new test owner goes from the free check to an approved first reply in under 15 minutes; all checklist lines pass or are listed as not run with a reason.

### AUTO-1 (after the pilot starts)
- `approval_policies.policy` gains `standing_owner`; `classify.v3` adds `needs_human`; one pure function `autoReplyDecision()` for the 12 conditions with a test each; the daily digest; a staff kill switch; pause on an owner edit; revocation in Settings and on WhatsApp.
- **Shadow mode only:** decisions are logged with `would_publish`; nothing is published without a tap.
- **Evaluation:** 200 labelled reviews (120 traps, 80 clean) in `scripts/eval/`, plus a held-out set of 100 kept out of prompt tuning. `gate.sh` fails on any trap marked safe.
- **Extra tests:** two workers on one review publish once; consent revoked just before publishing publishes nothing; a model error sends the review to the owner; an edited review cancels a queued reply; a duplicate Google event and a retry produce one reply and one audit record.
- **Acceptance:** 0 of 120 and 0 held-out traps marked safe; at least 56 of 80 clean marked safe; shadow log populated. Publishing stays off.

## 3. Session prompts

**FIX-0 (Sonnet)**
```
Task FIX-0 in itskaysyoga-gif/kabsi-canvas, approved by Rashid on 24 Nov 2026. Read CLAUDE.md and docs/progress/archive/2026-11-AUDIT-1.md (the audit report is in this prompt's project doc claude/kabsi-audit-1-2026-11-24.md; add it to that path) first.

What is broken. Since 14 Nov 2026 05:37 UTC every Edge Function call to the database API is refused at the gateway with 401 (rpc/internal_secret about 3,600 times a day, also rpc/queue_health and others). Because the functions cannot read cron_secret, every pg_cron call to them returns 403. Nothing has synced, published or sent since. 37 jobs wait in public.jobs.
Already ruled out by lane R: grants (internal_secret, queue_health and call_internal still grant EXECUTE to service_role), migrations (none applied since 12 Nov), the vault cron_secret (unchanged since 25 Sep), the legacy anon key (still enabled).
So the key the functions send as SUPABASE_SERVICE_ROLE_KEY is no longer accepted. Find out which of these it is, with evidence: the legacy service_role key was disabled or revoked in Settings, API Keys; a custom function secret overrides SUPABASE_SERVICE_ROLE_KEY with a stale value; or the JWT signing secret changed.

Before anything runs again. List every pending publish and care_posts job, and every publication in state approved, with its age and target type (no text). Cancel any publication or post run created before 17 Nov 2026 so nothing stale reaches Google. Give Rashid the list in the report.

The fix. Prefer the current key system: a secret key (sb_secret_...) for server use, read by admin() in supabase/functions/_shared/kabsi.ts from one env name, falling back to SUPABASE_SERVICE_ROLE_KEY only if set and valid. If a new key must be created or a secret set in the dashboard, give Rashid the exact clicks and let him paste it into Edge Functions, Secrets himself. A key is never printed, committed, logged or pasted in chat. No schema change. Redeploy every function that uses admin(), and check workers/ and Vercel for the same key.

Proof, each with the query or log line: scheduler lines in jobs_log resume; edge_logs show 200 on rpc/internal_secret; one sync_reviews job succeeds on the Yawmiyati location; whatsapp_number_health gets a new row; a message from the staff phone gets a reply.

Outside check. A monitor outside the project (UptimeRobot, free plan) on /health every 5 minutes, and /health returning 503 when jobs_log has no line for 15 minutes. Alert to hello@kabsi.co.

Merge on green CI with an independent review (the key handling is sensitive). Session report of master plan 25.6.
```

**OFFER-2 (Sonnet)**
```
Task OFFER-2. Read CLAUDE.md, docs/KABSI-PLAN.md section 2 and docs/kabsi-final/KABSI-ENGINEERING-IMPLEMENTATION-PLAN.md (OFFER-2).
Make Kabsi one plan: 29 US dollars a month per location, 14-day trial with a card; private founding price 19 for the first 12 months for the first 25 businesses, with the month-13 price shown at checkout. Update plans.ts on both sides, billing-creem, the facts (then node scripts/build-kb.mjs), docs/COPY.md, and the public pages to docs/kabsi-final/KABSI-WEBSITE-AND-CONVERSION-BLUEPRINT.md. Walk docs/SYNC.md.
Switch off by setting, never by deleting: the visibility, AI visibility, outbound, partner billing and partner payout jobs and competitor snapshot writes. A disabled job must make no provider call.
Set posts to at most 2 prepared a month per location, expiring after 7 days unapproved, never without a confirmed fact.
Also switch off request_book, ai_visibility_mode and dataforseo_mode, and set automatic posts to 2 a month on every location.
WhatsApp, product blueprint section 11: do the rows marked OFFER-2 and the WhatsApp tests in the plan. Reuse roles.ts, router.ts, intent.ts, agent.ts and the open-items list. No new agent, no new service, no new table.
Kabsi never contacts a business's customers and stores no customer contact details: remove any wording that suggests otherwise.
Test mode only. Do not touch Creem live settings. Migrations additive, applied by you.
```

**PROOF-2 (Sonnet)**
```
Task PROOF-2. Read the engineering plan (PROOF-2) and the product blueprint sections 4, 6, 7 and 8.
Build link watch for the website, booking and menu links (three failures before one alert, a recovery line); the 3 to 5 line weekly receipt; the monthly report in three bands with every Google figure and review pattern from a fresh read; labelled placement links on the existing cards, taps and kabsi-go, with a Get reviews page and the guides; a live monthly read of 3 competitors' totals.
WhatsApp, product blueprint section 11: do the rows marked PROOF-2 and the WhatsApp tests in the plan. The weekly-hours and phone or website changes get an independent review before merging.
Nothing derived from Google's API may be stored beyond 30 days. No customer data of any kind. Acceptance criteria are in the plan.
```

**GATE-2 (Opus)**
```
Task GATE-2. Read the engineering plan (GATE-2) and docs/kabsi-final/KABSI-LAUNCH-AND-VALIDATION-CHECKLIST.md.
Build the three-step onboarding, the first-day backlog batch, the Profile Coach schedule and the pilot kit. Then run every line of checklist section 1 on Yawmiyati and the two other authorized listings named in PROGRESS, recording the request, query or screen and the result for each. Anything not run is listed as not run with the reason.
Run checklist lines 16 to 19 on the live WhatsApp number with the founder's own phone only, typed and by voice.
Billing is verified in test mode only. Do not switch Creem to live. Do not mark anything live without evidence.
```

**AUTO-1 (Opus)**
```
Task AUTO-1. Read the product blueprint section 5 and the engineering plan (AUTO-1).
Build automatic replies in shadow mode only: the standing_owner policy with its consent text, classify.v3 with needs_human, the pure function autoReplyDecision() with one test per condition, the concurrency, revocation, model error, edited review and duplicate event tests, the daily digest, the kill switch and revocation.
Add the 200-case set and the separate held-out set of 100, and make scripts/eval/gate.sh fail on any trap marked safe. Run the evaluation by hand once, under 5 US dollars. Nothing may be published without the owner's tap. Independent review before merging.
```

## 4. Rules for every session

- No message to any customer of any business, ever.
- No table, column or log that holds a customer's contact details.
- Secrets never appear in code, commits, logs or reports.
- A merged pull request is not "live". Evidence is a request, a query or a screen.
- Drops and deletions of real data go to Rashid as SQL files with a read-back.
