<!-- Moved verbatim from docs/KABSI-PLAN.md on 24 Oct 2026 (docs diet, master plan 27.12). The index is docs/KABSI-PLAN.md. -->

## 17. Appendix A: system reference (checked 4 Oct 2026)

### Live IDs

| Thing | Value |
|---|---|
| Supabase | project `kabsi-prod`, ref `ynjdqjlmdwjgbfezevxy`, eu-central-1, in Hussein's own Supabase organisation (moved 5 Oct 2026, same project and keys), free plan (Pro with point-in-time recovery before the first real customer other than Kabsi's own profiles, K-87, P0.7-07) |
| Supabase URL | `https://ynjdqjlmdwjgbfezevxy.supabase.co` |
| Vercel | hosting for the website and app (R-28), team and project created 7 Oct 2026 and connected to GitHub, Supabase and Claude; previews for every pull request; kabsi.co and www from P0.1-03 |
| Lovable (retired) | project `2f215f56-0677-42e1-b0d5-838eb32e1c1c` stays published only to forward `https://kabsi-app.lovable.app` to kabsi.co (`src/lib/legacy-host.ts`); GitHub disconnected 8 Oct 2026; remove after the old address stops getting visits (docs/hosting.md) |
| GitHub | `itskaysyoga-gif/kabsi-canvas` (Hussein's account; moved from `rashidhamzy-hue`), branch `main` (no longer synced with Lovable since P0.1-03); pushes to `main` deploy every Edge Function and the Worker (`.github/workflows/deploy.yml`) and, after P0.1-03, the website on Vercel; CI on pull requests (`ci.yml`); build chats merge their own pull requests (section 2.5) |
| Cloudflare | zone `kabsi.co` (DNS; Zoho mail records for hello@kabsi.co must never change except merging SPF); Worker `kabsi-go` on `go.kabsi.co` (code in `workers/kabsi-go/`, deployed by the workflow, never connected to app builds); Turnstile site key in `src/lib/site.ts` |
| Google Cloud | project `smiling-chess-505915-b7`; Business Profile API case 1-4624000041157 (Gate A approved 5 Oct 2026; project number 856347937978 confirmed as `smiling-chess-505915-b7` on 7 Oct; quota 300 requests per minute confirmed on Account Management, Business Information, Notifications, Place Actions, Q&A and Verifications; the Google My Business API for reviews and posts still to enable, P0.7-01a); OAuth consent screen External, in production, basic scopes; enabled APIs: mybusinessaccountmanagement, mybusinessbusinessinformation, mybusinessnotifications, mybusinessplaceactions, businessprofileperformance, places, places-backend (to disable: section 5, step 3), pubsub, vision |
| Kabsi Google account | `hello@kabsi.co`, Organization account `kabsi.co`, Advanced Protection on; business group "Kabsi Clients", ID `5481006796` (constant `KABSI_GROUP_ID` in `src/lib/site.ts`) |
| Email | Resend, sending from `send.kabsi.co`, reply-to `hello@kabsi.co`; `news.kabsi.co` to add (P0.4-08) |
| Sentry | org `google-nfc-card-dl` (EU, de.sentry.io), projects `kabsi-web`, `kabsi-edge`, `kabsi-go`; polled into Slack every 10 minutes |
| PostHog | US cloud, project 627817 |
| Slack | workspace itskabsi.slack.com; channel IDs in `app_settings.slack_channels` |
| Meta | business portfolio "Kabsi.co", Facebook Page, Instagram @kabsi.co, ad account in USD on Beirut time; fixes in P0.6-09 |
| Calendly | free plan, one event type "Call with Kabsi" created in P0.1-V3 (R-31); the account email must be a kabsi.co address, never a personal one (R-32) |
| Kapso | WhatsApp provider (K-122, R-29): US number (deleted from Kapso on 22 Oct 2026; `WHATSAPP_NUMBER` is empty until a new number exists), people-answered support from day 1; alerts and Nora later (P1-21, P1-22); Kapso and Meta are processors; keys only in Supabase secrets. From 21 Oct 2026 the same number is the owner channel (K-129, P0.8-03) |
| Models | drafts `claude-sonnet-5-5` with `claude-sonnet-5` fallback, checks `claude-haiku-4-5-20251001` (`_shared/models.ts`, `DRAFT_MODEL` secret overrides) |

### Database today (public schema, 40 tables, RLS on all)

*Changing on 21 Oct 2026:* `partners`, `partner_members`, `partner_invites`, `partner_clients`, `partner_invoices`, `usdt_claims` and `card_orders` (and the partner columns on `locations` and `plans`) are retired; Rashid drops them with separate SQL files after P0.8-01 (R-35). New: `whatsapp_optins`, `whatsapp_window`, `whatsapp_messages` (P0.8-03), `google_revert_log` (P0.8-04), the Kabsi Partners tables (P0.8-12).

staff, partners, partner_members, partner_invites, locations (3 rows: Yawmiyati, QA Bakery, Safa Chicken; all test or internal), location_members, plans, payments, partner_invoices, usdt_claims, cards (22), taps, card_orders, reviews, reply_drafts, gbp_posts, photos, special_hours, listing_baselines, listing_changes, publications, action_tokens, emails, leads, jobs_log, rate_limits, mock_google_reviews, mock_listings, rating_snapshots, weekly_reports, app_settings, chat_conversations, chat_messages, contacts, ops_events, trial_grants, concierge_tasks, billing_invoices, billing_events, profile_tasks. Five auth users, all test accounts. `app_settings`: google_mode mock, plans_v2 off, nowpayments test, concierge_cap 30 (R-09 sets 20), app_url kabsi-app.lovable.app (P0.1-03 changes it).

Security advisor (4 Oct): 55 SECURITY DEFINER functions executable by signed-in users, `google_mode()` executable by anon, leaked-password protection off, 11 service-only tables with RLS and no policies (intended). P0.1-08 addresses the first three.

### Edge Functions (all ACTIVE, 4 Oct)

*Changing on 21 Oct 2026:* `partner` and the resale part of `lead` are removed (P0.8-01); `billing` loses NOWPayments and Creem takes over (`billing-creem`, P0.4-07); `whatsapp` is new (P0.8-03); Kabsi Partners adds its own functions (P0.8-12).

api v32, content v25, posts-weekly v21, assistant v19, slack v18, partner v18, lead v23, health v17, review-link v16, site-assets v17, places-search v22, kv-sync v23, tap v23, brand v22, billing v2, cron-tick v24 (a 410 stub). `verify_jwt` false for tap, brand, health, site-assets, slack, billing (see `supabase/config.toml`, D295).

### Scheduled jobs (pg_cron, 4 Oct) and what happens to them

| Job | Schedule (UTC) | Does | Plan |
|---|---|---|---|
| kabsi_cron_tick | every 5 min | `api/cron-tick`: access, sync, draft, notify, Shield | Replaced by the job dispatcher (P0.1-12a, P0.1-12b) |
| kabsi_posts_weekly | every 30 min | weekly post drafts | Fixed in P0.1-04 (no review-derived keywords); replaced by the care routine in P0.5-02 |
| kabsi_plans_expiry | every 5 min | `end_expired_plans()` | Replaced when subscriptions take over (P0.4-06) |
| kabsi_partner_billing | daily 06:10 | monthly wholesale invoices | Removed in P0.8-01 (R-34); Kabsi Partners pays commission from the Creem webhook (P0.8-12) |
| kabsi_retention | daily 02:53 | `run_retention()` | Extended in P0.2-01 |
| kabsi_cleanup_action_tokens | daily 03:17 | delete tokens expired 30 days ago | Keep (P0.2-05 shortens token life) |
| kabsi_concierge_daily, kabsi_concierge_overdue | weekdays 05:00, hourly :17 | concierge task digest and overdue alerts | Keep until go-live, then keep for support |
| kabsi_chat_reports, kabsi_chat_retention | every 5 min, daily 03:41 | Nora chat reports, 12-month retention | Keep |
| kabsi_slack_flush, kabsi_slack_digest, kabsi_slack_sentry, kabsi_ops_watchdog, kabsi_ops_events_retention | every min, daily 05:53, every 10 min, every 10 min, daily 04:23 | Slack outbox, digest, Sentry polling, watchdog, retention | Keep |
| kabsi_health_jobs | every 10 min | alerts when no job succeeded in 30 minutes | Keep; P0.6-08 adds queue age |
| kabsi_cleanup_jobs_log, kabsi_cleanup_rate_limits, kabsi_cleanup_http_responses | weekly, hourly, daily | housekeeping | Keep |

There are no Claude scheduled tasks on the account (checked 4 Oct).

Changing on 21 Oct 2026: `kabsi_partner_billing` is unscheduled and removed in P0.8-01 (R-34).

### Secrets (names only; values live in Supabase secrets or GitHub Actions secrets)

Supabase: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN, GOOGLE_MODE, PLACES_API_KEY, ANTHROPIC_API_KEY (also saved once as Anthropic_Api; the functions accept both), RESEND_API_KEY, KABSI_TAP_SECRET, CRON_SECRET, CF_API_TOKEN, CF_ACCOUNT_ID, CF_KV_NAMESPACE_ID, PUBSUB_AUDIENCE, SENTRY_DSN_EDGE, SENTRY_AUTH_TOKEN, POSTHOG_KEY, APP_URL, TURNSTILE_SECRET_KEY, NOWPAYMENTS_API_KEY and NOWPAYMENTS_IPN_SECRET (retired 21 Oct 2026, K-124; removed with P0.8-01), SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET. To add: META_CAPI_TOKEN, META_DATASET_ID (P0.6-09), CREEM keys (P0.4-07), KAPSO_API_KEY, KAPSO_WEBHOOK_SECRET, KAPSO_PHONE_NUMBER_ID, WHATSAPP_LIVE ("true" only when live sends may start; anything else keeps the mock sender) and, once Meta approves them, KAPSO_TEMPLATE_REVIEW_ALERT and KAPSO_TEMPLATE_POST_READY (template names) (P0.8-03). GitHub Actions: SUPABASE_ACCESS_TOKEN, CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID; ANTHROPIC_API_KEY to add for the evaluation job (P0.3-04).

### Working notes that still hold

- Local install: `npm install --registry=https://registry.npmjs.org --legacy-peer-deps` (`package-lock.json` is gitignored; the old `bun.lock` is stale and unused).
- Edge Function type-check: `bash scripts/deno-check.sh`. Large functions (assistant) deploy from an esbuild bundle (`scripts/bundle-functions.sh`).
- Repo migration file stamps differ from the stamps applied in the database for the last four migrations; that is expected (the database keeps its own).
- Places: Google replaced the $200 monthly credit with per-product free caps in March 2025; every snapshot costs money past the free tier (K-100).
- Taps from a review link are logged as `nfc` unless opened from the QR (`?s=q`).
