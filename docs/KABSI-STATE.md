# KABSI: STATE

Last updated: 29 Sep 2026, morning Beirut. Source of truth: docs/KABSI-SPEC.md (D200 to D294) and the repo rashidhamzy-hue/kabsi-canvas (supabase/ backend, src/ app, workers/kabsi-go/ card Worker). App and site: https://kabsi-app.lovable.app (pushed to main; Lovable syncs from git). Edge Functions: api v24, content v17, posts-weekly v13, assistant v11, slack v10, partner v10, lead v15, health v9, review-link v8, site-assets v9, places-search v14, kv-sync v14, tap v14, brand v14. 27 migrations. cron-tick is a 410 stub. Go-live runbook: docs/GO-LIVE.md (the copy in the Claude.ai project, claude/KABSI-GO-LIVE.md, was rewritten 28 Sep; the repo copy still has the old text).

## START HERE (handover, updated 29 Sep 2026, afternoon)

D293 SOLVED IN THE UI (29 Sep): Google access runs through the business group "Kabsi Clients", ID 5481006796 (Organization kabsi.co, hello@kabsi.co accepts under Manage invitations). Rasheed proved it on Yawmiyati; Yawmiyati is connected again. Claude then rewrote every owner instruction (onboarding step, /manager-steps, /security, FAQ, guides, how-it-works, terms, privacy, llms files, docs copies) to "paste the Kabsi group ID", added the full Dubai address (Prompt 13), deleted roadmap.md, and changed the access job to vet invitations (Manager role plus consented business name; others left pending and reported). Pushed to main (8b70b04, 3a1c18a); site publish requested. Not yet deployed: the api Edge Function change (GOOGLE_MODE is still mock, so no live effect; deploy Sunday with a live check). Still unverified: API side of the group flow, and a stranger's account. Commit 2a0f7f1 (D294): onboarding step 1 now has a "One quick check" (verified profile, owner or manager) with guidance for unverified or unsure owners; published. No more Lovable prompts: Claude edits the repo directly.

Work now runs from `docs/WORK-QUEUE.md` (tasks Q01 to Q18, one task per session and pull request) under the rules in `CLAUDE.md`. The older wave plan (claude/KABSI-BUILD-PLAN.md, in the Claude.ai project) still holds the wider context.

Also done 29 Sep: Lovable prompts 1 to 12 ran and are published (Claude audited the diff f2c6652..085b19e: nothing outside src/ and public/ changed, no banned words or dashes in added text); the three secrets (Turnstile, NOWPayments key and IPN secret) are in Supabase; the NOWPayments IPN secret was rotated after it appeared in a screenshot and the new one is stored only as a Supabase secret (done, 29 Sep); address is Spring 19, Villa 9, Dubai, United Arab Emirates.

Update 29 Sep (morning): (1) Rasheed's legal name is Rashid Abou Hamzy with a Dubai address (D290). (2) Advanced Protection on hello@kabsi.co is done. (3) Organization account for hello@kabsi.co exists (D293). Website on the profile is confirmed (yawmiyati.com). (4) Lovable credits reset to 100 and were used for the twelve-prompt frontend pass. (5) Rasheed will message Instagram accounts that sell NFC cards worldwide (D292), by hand, 20 a day. (6) A keys guide for TURNSTILE_SECRET_KEY, NOWPAYMENTS_API_KEY and NOWPAYMENTS_IPN_SECRET is in the Lovable prompts file.

Original handover, 28 Sep 2026 night (still true unless the update above says otherwise):

Rasheed brought an outside review written by another Claude account (Opus 5.5), stored as reference in claude/KABSI-REVIEW-2026-09-28.md. Its decisions were accepted as D267 to D288, amended for Rasheed's constraints (no sales work, no capital, no company), plus D289 spend and ads gate, D290 legal identity, D291 Lebanon pilots run by the field team. Full text in the spec.

The plan is nine waves: 0 verify, 1 trust, honest copy and the kabsi.co switch, 2 safety and card reliability, 3 concierge mode (first real customers), 4 payments and trial, 5 positioning and Nora, 6 free tools and emails, 7 partner program (conditional), 8 go-live the day Gate A passes, 9 engineering process. Gate B is a date: 31 Oct 2026, 10 businesses active and 3 paying. Gate C proposed for 30 Nov.

The knowledge base (docs/KNOWLEDGE-BASE.md) must stay true of the system as built (it still describes $75 and $120 plans, the USDT paste flow and no trial) and is updated at the end of each wave.

Decisions made for Rasheed, with reasons: business-owner cold outreach dropped, Instagram card-seller messages by Rasheed allowed (D292); ranking wording narrowed (D257 forbids implying replies or posts raise ranking); ads $0 until the gate then Lebanon-only at most $5 a day; concierge cap 30; concierge locations are not billable to partners until converted; Lebanon pilots use the existing $120 12-month plan; NOWPayments renewals by fresh invoices, not its recurring API; partners page stays as built until the commission program exists; Shield, holiday and commission lines in videos wait until they are true; Calendly instead of Cal.com; one WhatsApp number (+961 3 956 917).

Facts confirmed by Rasheed on 28 Sep (evening):

- Gate A (GBP API, case 1-4624000041157): applied 24 Sep using hello@kabsi.co. Cloud Console quota "Requests per minute" for the Business Profile API read 0 at 23:24 on 28 Sep, so not approved yet (300 means approved). Expected about 8 Oct. Yawmiyati's profile is verified for more than 8 years.
- Payments: NOWPayments account created and payout wallet added. Creem is not available in Lebanon: the brother applies with his UAE ID; Dodo Payments is the backup.
- Tools: Cloudflare Turnstile widget created; UptimeRobot account created and connected to Claude; Google Search Console has kabsi.co verified with the old sitemap; Calendly connected; card supplier has not replied; Higgsfield refills to 1,000 credits on Sunday 4 Oct.

Verified from Google's own pages on 28 Sep: pending invitations carry the place ID since 12 May 2026; ReviewReplyState (1 Apr), recurring posts (7 Apr), review media (20 Apr), PolicyViolation (1 Jul) and reviewReplyUrl (24 Jul) exist; API prerequisites are a verified and active profile of 60+ days, a website on the profile, an Organization account and a standard Google account; quota 0 means not approved, 300 approved. Not yet verified: whether an invitation exposes the invited role.

Don't redo (built 25 to 28 Sep): D255 to D259 site visuals, photos, industry pages, SEO and AI-search; D260 dashboard finish, About your business, Lebanon-only cards; D261 Nora; D262 dashboard final pass and Nora lead capture; D263 Slack hub; D264 three bug fixes; D265 chat-leak fix, Sentry polling, public header auth state, Lovable audit triage; D266 atomic publish locks (reviews only), retention cascade, fail-closed rate limits, log scrubbing.

Before launch (Gate A still the only external blocker): go-live runbook; delete test data (list below); a lawyer reads privacy and terms first if feasible, otherwise ship with the operator named and flag it.

## Where Kabsi is

Stage: before revenue, before Google approval. No outside customers. Rasheed's Yawmiyati is active on mock Google and is the first concierge test. Live site data 28 Sep: 32 visitors since 25 Sep, 29 of them the team in Lebanon; 5 accounts, all tests; 0 leads, 0 real Google connections, 2 card taps, 0 payments.

Market: partners and owners mostly in the US, Europe and worldwide (D256); Lebanon is the only place a sale can close this month (field team, cards, cash, Whish, OMT). Two tracks: Lebanon live sales, international self-serve plus partners fed by free tools. Languages: English, Spanish, Arabic, French.

Positioning (D257, D273): "Your Google Business Profile, taken care of." Plain outcomes; no "AI" or "local SEO" lead; no ranking implications. Google is testing free AI reply suggestions in profiles (US, Brazil, India), so the pitch leads with what Google's tool does not do: it comes to your inbox, uses your facts and voice, watches the listing, any language, and a person behind it.

Prices (target, D281): Free; Pro $19 a month or $190 a year; extra locations $15 a month or $150 a year; Lebanon bundle $120 a year with an NFC card and setup; 14-day trial without a card (30 through partners). Live today until Q04 to Q06 ship: Pro 6 months $75 and 12 months $120, USDT paste flow.

NFC cards (D260, D276): shipped only in Lebanon; elsewhere a partner or any NTAG tag with the free review link. Review links and QR codes are free everywhere. Cards page becomes "Get reviews".

Gate A: Google writes are simulated until approval; the black "Test mode" banner says so (D235). Concierge businesses will see an "Early access" note instead.

Owner Google sign-in: not needed. Owners add hello@kabsi.co as Manager (via the Kabsi Clients group ID, D293) and approve everything in Kabsi.

## Built (mock Google)

| Phase | Status |
|---|---|
| 1 to 3 Login, onboarding, cards | Real signup; card KQA234 opens Yawmiyati's review page. Only 21 card codes exist in the database (the supplier batch is not imported) |
| 4 Reviews | Drafts in the reviewer's language; email Post/Edit/Skip; To reply and All reviews |
| 5 Publish | Approval ledger; atomic claim on reviews only (D266); posts, photos and hours have no claim logic yet |
| 6 Posts, hours, photos | Tested (mock) |
| 7 Listing Shield | Edit detected, alert, Put mine back restored it (mock). Does not watch business status yet |
| 8 Weekly report | Monday email and report page |
| 9 Money and partners | Partner portal (D239), owner Plan page with USDT and renewals (D241), plan starts only with Google access (D224) |
| Home dashboard | /app, five-section navigation (D240), finished 27 Sep (D260) |
| 10 Marketing site | D242, D255 to D259 |
| 10i to 10l | Nora, dashboard pass, security and audit passes (D261 to D266) |
| 11 Go-live | Waiting on Gate A; concierge mode (Q07) lets real businesses start before it |

## Slack ops hub (D263 to D265), live

Workspace itskabsi.slack.com (free plan). Channels: #kabsi-alerts C0C4XH03ESY, #kabsi-customers C0C4XH03C3W, #kabsi-chats C0C4CFS5C31, #kabsi-money C0C4NPYF0FP, #kabsi-partners C0C4RU2Q2ES, #kabsi-daily C0C4RU2NF3Q (stored in app_settings.slack_channels).

How it works: triggers write business events to ops_events (outbox) via ops_emit, which kicks slack/flush through pg_net; kabsi_slack_flush runs every minute as a safety net. Buttons: web links, I'm on it and Done (staff users only, app_settings.slack_staff_users, now Rasheed U8RNNNBCH). Watchdog kabsi_ops_watchdog every 10 minutes; daily digest kabsi_slack_digest 05:53 UTC; /kabsi today|week|pending|find (untested by a person).

Sentry to Slack: slack/sentry polls org google-nfc-card-dl (EU, de.sentry.io; projects kabsi-web, kabsi-edge, kabsi-go) every 10 minutes.

Partners and WhatsApp: partners.whatsapp and preferred_channel; Slack alerts carry a pre-written wa.me link, sent by Rasheed from his phone. No automatic WhatsApp (D209). Retention: ops_events 30 days.

## Publish locking and retention (D266), live

reviews, gbp_posts, photos have a publishing state (migration 20260928120000_publish_lock_and_draft_retention.sql). publishReply claims a review with one conditional UPDATE; the loser throws already_posted. Posts, photos and special hours do not have their own claim logic yet.

No auto-retry on ambiguous failure, on purpose: isDefiniteGoogleRejection() (_shared/kabsi.ts) auto-reverts only on Google's 400/401/403/404; timeouts, network errors and 5xx leave the row at publishing and call captureError, because Google may already have the write. A stuck row needs a human to check the live listing, then a manual SQL fix.

Retention cascade: reply_drafts.body/instruction and publications.payload are redacted once their review's text is purged (30 days). Rate limits: rateLimit(key, max, window, {failClosed}); fail-closed on action, approve, assistant, places-search; fail-open on lead and review-link. captureError and jobLog redact review text, reviewer names, emails and tokens.

## Nora, the assistant (D261, D262, D265)

Chat on every public page and in the app; says she is an AI if asked; answers only from the knowledge base (docs/KNOWLEDGE-BASE.md, `node scripts/build-kb.mjs`, public/llms-full.txt, cached 15 minutes; a KB change needs build-kb and publish, no function deploy).

Model claude-sonnet-5 with prompt caching; tools save_contact and hand_off_to_human. Limits: 40 messages per visitor per hour, 80 per network per hour, 3,000 a day. Data: chat_conversations, chat_messages, contacts (service only). Reports: cron kabsi_chat_reports every 5 minutes emails app_settings.assistant_report_to (hello@kabsi.co). Staff: /staff Chats with Nora and contacts (CSV). Retention: chats 12 months.

Isolation (D265): conversations tied to user_id; assistant-storage.ts clears ids on sign-out; the function refuses history to anyone else.

Deploy method for big functions: bundle with esbuild first (`npx esbuild <entry> --bundle --format=esm --platform=neutral --target=esnext --external:npm:* --outfile=<bundle>`), then deploy the single bundled file as index.ts.

## Dashboard, About your business, reviews (D260, D262, D264)

About your business: grouped form with a progress bar; four groups start collapsed and open if they hold an answer; update_knowledge_card whitelists keys, 16 KB cap. Reviews: urgent first, filter chips, "I'll handle it", Skip, confirm for urgent or 2-star and under, 4,000-character counter. Home: attention count, "What Kabsi did", honest plan card, profile health rows, empty and paused states. Auth: query cache and Nora chat cleared on sign-out or user change; safe next redirect; 6-digit code, 60 s resend.

## Test data to delete before launch

- QA account qa-owner@test.local and "QA Bakery"; "QA Partner" (qa-partner) with Rasheed's account as member; the "Test by rashid" partner invite and acceptance.
- Yawmiyati's three overlapping pro_6m plans, pending pro_12m and three payments rows from 25 Sep tests; its test photos.
- Nora test chats from 27 Sep (visitor ids starting qa-, and chats with contact "Kay").
- "Safa Chicken" (06ee2022-b1bc-40a4-9493-b46e2e055f1c) and the tarikhtube@gmail.com account (chat-leak reproduction).
- A gmail.co typo account that never received its code.
- Do not delete Yawmiyati itself: it becomes the first concierge and first live business.

## Notes

- Taps from a review link are logged as nfc unless opened from the QR (?s=q). Weekly drafts need at least one fact in About your business.
- At go-live: GOOGLE_MODE=live secret and `update app_settings set value='live' where key='google_mode'`.
- Domain switch: SITE_URL in src/lib/site.ts, public/sitemap.xml, the Sitemap: line in public/robots.txt, public/llms.txt and llms-full.txt (rebuild), APP_URL in function secrets, Supabase Site URL and redirect URLs, Worker APP_ORIGIN. Never touch Zoho MX or its SPF and DKIM records (hello@kabsi.co mail); merge Resend into the single SPF record.
- Local builds: `npm install --registry=https://registry.npmjs.org --legacy-peer-deps`; package-lock.json is gitignored. Format only changed files with prettier.
- Edge Function type-check: copy supabase/functions to a scratch folder with `{"nodeModulesDir":"auto"}` in deno.json, then `npx -y deno@2 check <fn>/index.ts`. After a deploy, fetch the function and compare with the repo or bundle.
- Frontend verification: no browser tool in some sessions; check with tsc --noEmit, eslint and a full build. Anything visual needs Rasheed's look.
- Backend verification: no CI and no supabase/config.toml, so a git push never deploys; every fix needs its own apply_migration or deploy_edge_function call, confirmed by version number, then a live query. CI is Q03 and Q16.
- Places pricing: Google replaced the $200 monthly credit in March 2025 with per-product free caps; the free tool's "400 a day inside the free credit" comment is suspect. The daily rating snapshot stops being free at about 30 businesses.
- Sentry org google-nfc-card-dl, EU host de.sentry.io, projects kabsi-web, kabsi-edge, kabsi-go.

## Log

- 29 Sep 2026: added CLAUDE.md, docs/KABSI-SPEC.md, docs/KABSI-STATE.md, docs/WORK-QUEUE.md (exported from the Claude.ai project). Next: Q01.
- 29 Sep 2026: Q01 code: kv-sync writes cards to KV with no expiry plus `{"backfill":true}`; Worker has no cache TTL and dedupes taps per visitor per card for 10 minutes (daily-salted hash). Not deployed. Next: deploy kv-sync and the Worker, call the backfill once, then Q02.
- 29 Sep 2026: Q02 code: exact normalized name plus address or city, never accept two matches (_shared/invitations.ts, 9 Deno tests). Added supabase/config.toml (verify_jwt per function) and a jobs_log heartbeat check in health (migration 20260929120000 schedules it). Not deployed. Next: Q03.
- 29 Sep 2026: Q09 code (branch claude/q09): model ids in _shared/models.ts, drafts on claude-sonnet-5-5 with claude-sonnet-5 fallback, DRAFT_MODEL secret overrides; reply eval harness in scripts/eval (30 fictional reviews). Comparison NOT run: needs ANTHROPIC_API_KEY. Not deployed (api, content, posts-weekly, assistant).
- 29 Sep 2026: Special hours guard (branch claude/special-hours-guard): ref guard on the confirm button, partial unique index special_hours_dates_unique (draft and posted rows), friendly 409 in content. Migration 20260929130000 not applied; content not deployed.
- 29 Sep 2026: Q05 (branch claude/q05): plans v2 and trial. Migration 20260930090000_plans_v2_trial.sql (not applied), _shared/plans.ts (+16 Deno tests), api trials job, drafting gated to active businesses, plan page and onboarding read plan_summary. plans_v2 flag stays 'off' until billing (Q06) ships. Rolled-back SQL test on the live DB passed.
- 29 Sep 2026: Q04 (branch claude/q04, on Q05): new prices in src, llms.txt (Pro $19 or $190, extra locations, Lebanon bundle for Lebanon only, 14-day trial), 6-month plan removed; screenshots in docs/screenshots/q04. Do not publish before plans_v2 is on and billing (Q06) works. Knowledge base still has old prices until Q08.
- 29 Sep 2026: Q08 (branch claude/q08, on Q04): docs/KNOWLEDGE-BASE.md rewritten for the new prices, trials, early access, five modules, group ID access and the verified-profile rule, with a "Facts that change" block; public/llms-full.txt rebuilt. Publish only with Q04, Q05 and Q07 live.
- 29 Sep 2026: Q07 part A (branch claude/q07): concierge mode backend. Migration 20261001090000_concierge_mode.sql (not applied; tested on a scratch Postgres with the whole migration history), _shared/concierge.ts, Google calls refuse concierge ids, publishReply queues a task instead of writing to Google, sync/shield/posts skip concierge. Staff panel is part B, owner copy part C.
