# Secrets inventory (K-87, K-118)

Names only. A value never appears in this repository, in a log, in a pull request or in a screenshot. The values live in
the place named in the Where it lives column and nowhere else. Every account that holds a secret must sit under a kabsi.co address with
two-factor sign-in and a second trusted admin (K-118); docs/platforms.md says where each platform stands. "Last set" is
the day the secret was last set or rotated, and "Next due" is when it is due. "Not recorded" means no session has
seen the date; Rashid fills it in the first time he rotates the secret (a build session cannot read the date from the
platforms it has no connector for).

Rotate on the due date, at once if a secret may have been seen, and always when a person with access leaves.

| Secret | What it opens | Where it lives | Read by | Last set | Next due |
| --- | --- | --- | --- | --- | --- |
| `SUPABASE_SERVICE_ROLE_KEY` | The database with every right | Supabase Edge Function secrets (set by Supabase itself) | every Edge Function | Not recorded | On any suspicion; yearly |
| `SUPABASE_ANON_KEY` | Public database key (publishable, safe in the browser) | Supabase Edge Function secrets and Vercel (`VITE_SUPABASE_PUBLISHABLE_KEY`) | functions, website | Not recorded | When Supabase rotates |
| `SUPABASE_URL` | The project address (not secret) | Edge Function secrets, Vercel (`VITE_SUPABASE_URL`) | functions, website | n/a | n/a |
| `SUPABASE_ACCESS_TOKEN` | Deploys Edge Functions from GitHub | GitHub repository secret | `.github/workflows/deploy.yml` | Not recorded | 90 days |
| `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` | Deploys the go.kabsi.co Worker from GitHub | GitHub repository secrets | `deploy.yml` | Not recorded | 90 days |
| `CF_API_TOKEN`, `CF_ACCOUNT_ID`, `CF_KV_NAMESPACE_ID` | Writes the review-link table in Cloudflare KV | Supabase Edge Function secrets | `kv-sync`, `health` | Not recorded | 90 days |
| `TAP_SECRET` | Signs review-link opens between the Worker and the database; salts the daily visitor hash | Supabase Edge Function secrets and the Worker's secrets | `tap`, the Worker | Not recorded | Yearly |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Kabsi's Google Cloud OAuth client (project 856347937978) | Supabase Edge Function secrets | Google layer, `health` | Not recorded | Yearly |
| `GOOGLE_REFRESH_TOKEN` | Kabsi's own Google account (hello@kabsi.co, Advanced Protection) for Business Profile calls; never an owner's token | Supabase Edge Function secrets | Google layer | Not recorded | When Google shows an expiry (the health check reports it) |
| `GOOGLE_MODE` | `mock` or `live` switch (not secret) | Edge Function secrets and `app_settings` | Google layer | n/a | n/a |
| `PLACES_API_KEY` | Google Places search for the free Profile Check | Supabase Edge Function secrets | `places-search`, `profile-snapshot` | Not recorded | Yearly |
| `ANTHROPIC_API_KEY` (older name `Anthropic_Api`) | Reply, post and Nora calls to Anthropic; prepaid balance, auto-reload off (R-45) | Supabase Edge Function secrets; GitHub secret for the by-hand evaluation only | `assistant`, drafting | Not recorded | Yearly |
| `RESEND_API_KEY` | Sends every Kabsi email | Supabase Edge Function secrets | `email`, notify | Not recorded | Yearly |
| `RESEND_WEBHOOK_SECRET` | Verifies Resend's bounce and complaint calls | Supabase Edge Function secrets | `email` webhook | Not yet created (no webhook exists, see PROGRESS P0.6-08) | When the webhook is made |
| `TURNSTILE_SECRET_KEY` | Verifies the Cloudflare bot check on forms and sign-in | Supabase Edge Function secrets; Supabase Auth (captcha) | functions | Not recorded | Yearly |
| `SLACK_BOT_TOKEN`, `SLACK_SIGNING_SECRET` | Posts to the Slack channels and verifies Slack's calls | Supabase Edge Function secrets | `slack` | Not recorded | Yearly |
| `SENTRY_DSN_EDGE` | Where Edge Function errors go (a DSN is write-only) | Supabase Edge Function secrets | functions | Not recorded | Only if exposed |
| `SENTRY_AUTH_TOKEN` | Uploads release tags and source maps | Vercel and GitHub, build time only | build | Not recorded | Yearly |
| `KAPSO_API_KEY`, `KAPSO_WEBHOOK_SECRET`, `KAPSO_PHONE_NUMBER_ID`, `KAPSO_TEMPLATE_REVIEW_ALERT`, `KAPSO_TEMPLATE_POST_READY`, `KAPSO_TEMPLATE_PROFILE_CHANGE`, `WHATSAPP_LIVE` | WhatsApp owner channel through Kapso | Supabase Edge Function secrets | `whatsapp` | Not set: Kabsi has no WhatsApp number (22 Oct 2026) | When a number exists |
| `CREEM_*` | Card payments | Supabase Edge Function secrets | `billing` | Not set: card payments are not built yet (P0.4-07) | When Creem opens |
| `META_CAPI_TOKEN`, `META_DATASET_ID` | Meta Conversions API | Supabase Edge Function secrets | the events sender | Not set (P0.6-03 is after launch) | When built |
| `APP_URL`, `KABSI_ENV` | Settings, not secrets | Edge Function secrets | functions | n/a | n/a |
| Cron secret (`x-cron-secret`, read in the database by `internal_secret('cron_secret')`) | Lets the database's schedules call internal functions | Supabase database | `health`, `google-capture`, cron | Not recorded | On any suspicion |
| PostHog project API key (`phc_...`) | Sends events (public by design) | In the website code | website | n/a | n/a |

## Second trusted admin

Each platform needs a second person who can sign in if the first cannot (K-87). Recorded in PROGRESS under P0.6-08: every
row is a step for Rashid.
