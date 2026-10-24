# Supporting platforms checked against K-118 (P0.6-08)

Checked on 22 Oct 2026 through the Resend, Sentry, PostHog, UptimeRobot, Slack and Supabase connectors, DNS-over-HTTPS and
the code. Each row says done, Rashid step, or not possible, and what shows it. Secret names and rotation dates are in
`docs/secrets-inventory.md`; no value appears anywhere. The same table was in `docs/KABSI-PROGRESS.md` until the docs diet of 24 Oct 2026; its old text is `docs/progress/archive/` and `docs/SECRETS.md` wins.

## Where each platform stands

| Platform | K-118 item | Status | Evidence |
|---|---|---|---|
| Resend | Sending domains verified | Done for the two that exist | `list-domains`: `kabsi.co` and `send.kabsi.co` both verified, sending on, eu-west-1. The split of K-118 (a marketing subdomain `news.kabsi.co`) does not exist: Rashid step A1 |
| Resend | DMARC `p=none` with reports | Done | TXT `_dmarc.kabsi.co` = `v=DMARC1; p=none; rua=mailto:hello@kabsi.co` (DNS-over-HTTPS); it covers `send.kabsi.co` by inheritance |
| Resend | Google Postmaster Tools for both domains | Rashid step A2 | Needs a Google sign-in as hello@kabsi.co; no connector |
| Resend | Bounce and complaint webhook from P0.4-08 | Rashid step A3 | The handler is live (`email/webhook`, Svix-signed, secret name `RESEND_WEBHOOK_SECRET`) but `list-webhooks` finds 0 webhooks. The session tried to create it and the permission check refused, so it was left undone |
| Resend | Reply-to hello@kabsi.co | Done | `supabase/functions/_shared/kabsi.ts` sets `reply_to` to hello@kabsi.co unless a person's address is given |
| Sentry | Web and Edge Functions send errors | Done | projects `kabsi-web`, `kabsi-edge`, `kabsi-go` exist; open issues listed |
| Sentry | Release tags on web and functions | Done in this pull request, live after the deploy | web: `release` = the commit Vercel builds (`vite.config.ts`, `src/lib/telemetry.ts`); functions: `release` = `DENO_DEPLOYMENT_ID` (`_shared/kabsi.ts`). Check a new issue shows a release after the deploy |
| Sentry | Personal data scrubbing | Done | web `sendDefaultPii: false`, user reduced to an id, cookies and `X-Forwarded-For` removed, `/a/<token>` and `?t=` scrubbed (`telemetry.ts`); functions scrub keys and emails (`captureError`) |
| Sentry | Alerts to Slack for new errors | Done another way | Sentry's Slack integration needs the Team plan (D265, `get_alert_options` for Slack returns none), so the `slack` function polls Sentry every 10 minutes and posts each new issue once to #kabsi-alerts |
| Sentry | Alerts for error spikes | Not possible on this plan | Only the default "high priority issues" rules exist; spike alerts to Slack need the integration. Rashid step B1 if he upgrades |
| Sentry | Alerts for failed publications | Partly | A failed Google write is captured as an error and reaches #kabsi-alerts through the polling above; there is no separate rule |
| PostHog | Data region recorded in the privacy page | Done | Kabsi's PostHog project uses the US region (`us.posthog.com`, `vercel.json` rewrites `/ingest` to the US hosts); the facts file and `/privacy` say United States |
| PostHog | Autocapture off in the app | Done | `autocapture: false`, `disable_session_recording: true` (`src/lib/telemetry.ts`); recording starts only on public pages after a yes to statistics |
| PostHog | Project setting for IP anonymising | Done | `anonymize_ips: true` (`project-get`) |
| PostHog | Project-level session recording | Rashid step C1 | The project has recording opted in with masked inputs; the code keeps it off inside the app. Turn the project switch off if replay is not used |
| UptimeRobot | 1-minute checks | Not possible on the free plan | The account's plan is FREE (5-minute interval, 50 monitors). One monitor exists: `kabsi.co`, every 5 minutes, up |
| UptimeRobot | The account is a kabsi.co account | Rashid step D1 | The account is registered to a personal address (K-118 and R-32 say kabsi.co only). No monitor was added there; create the account as hello@kabsi.co and add the monitors below |
| UptimeRobot | Queue health endpoint | Built in this pull request | `GET https://ynjdqjlmdwjgbfezevxy.supabase.co/functions/v1/health/queue`: 200 `{"status":"ok"}`, 503 `{"status":"stuck"}` when a job that was due has waited more than 10 minutes, 503 `{"status":"unknown"}` when it cannot read the queue. `public.queue_health()` applied and read back; a held test job (due 20 minutes ago) made it `ok: false`, rolled back (pgTAP `queue_health.sql` holds it) |
| UptimeRobot | `go.kabsi.co/_check` | Built in this pull request, live after the Worker deploys | 200 `ok` when the Worker runs and KV reads, 503 otherwise (`workers/kabsi-go`, `tests/worker-check.test.ts`) |
| UptimeRobot | The app, the Creem and Meta webhook endpoints | The app is a step; the others cannot exist yet | Monitor `https://kabsi.co/login` (the app's front door). The Creem webhook is built with P0.4-07 and the Meta endpoint with P0.6-03 (after launch); add them then |
| UptimeRobot | Public status page at `status.kabsi.co` | Rashid step D2 | `list-psps`: none. `status.kabsi.co` has no DNS record. A status page on a custom domain is a paid UptimeRobot feature and needs a CNAME in Cloudflare |
| Slack | Map the six channels to K-118's alerts | Done below | See the mapping; five of the six carry events today |
| Secrets | Inventory at `docs/secrets-inventory.md` | Done | Names, where each lives, who reads it; last-set dates "Not recorded" until Rashid enters them |
| All | Second trusted admin on each platform | Rashid step E1 | No connector can add a person to Supabase, Vercel, Cloudflare, Resend, Sentry, PostHog, Slack, Creem, Meta or Google Cloud |

## Slack channels (K-118 against what exists)

| K-118 channel | Channel today | Carries |
|---|---|---|
| alerts | #kabsi-alerts | Sentry issues, dead jobs, the circuit breaker, no-successful-job alerts (13 events sent) |
| signups and access granted | #kabsi-customers | new accounts and access (7 sent, last 20 Oct) |
| payments (Creem events) | #kabsi-money | nothing yet: card payments are not built (P0.4-07) |
| support (Nora handovers, setup-call bookings) | #kabsi-chats | Nora chat reports (7 sent, last 29 Sep) |
| ads (weekly scorecard) | none yet | ads start after launch (P0.6-03, P0.6-04); #kabsi-daily carries the daily digest meanwhile |
| (extra) | #kabsi-daily, #kabsi-partners | the daily digest (24 sent); partner events, quiet since the partner model was removed (Kabsi Partners will use it) |

## Steps for Rashid (each takes minutes)

- **A1 Resend marketing subdomain.** Resend, Domains, Add domain `news.kabsi.co`, region eu-west-1; add the records it shows in Cloudflare; Verify. The lifecycle win-back emails stay off until it is verified.
- **A2 Postmaster Tools.** Sign in to postmaster.google.com as hello@kabsi.co, add `kabsi.co` and `send.kabsi.co` (and `news.kabsi.co` when it exists), add the TXT record in Cloudflare, verify.
- **A3 Resend webhook.** Resend, Webhooks, Add webhook: endpoint `https://ynjdqjlmdwjgbfezevxy.supabase.co/functions/v1/email/webhook`, events `email.delivered`, `email.bounced`, `email.complained`. Copy the signing secret into Supabase, Edge Function secrets, name `RESEND_WEBHOOK_SECRET` (never into the chat). Then send one email to `bounced@resend.dev` and check the address lands on the suppression list.
- **B1 Sentry spikes (optional).** Only with Sentry's Team plan: install the Slack integration and add an alert for "number of events above 20 in 5 minutes" to #kabsi-alerts. Until then new errors arrive by polling.
- **C1 PostHog.** Project settings, Session replay: switch it off if you will not use it; the website code already keeps it off in the app.
- **D1 UptimeRobot account.** Sign up at uptimerobot.com with hello@kabsi.co and two-factor sign-in, then create these monitors (HTTP, expect 200, alert contact hello@kabsi.co): `https://kabsi.co`, `https://kabsi.co/login`, `https://ynjdqjlmdwjgbfezevxy.supabase.co/functions/v1/health/queue`, `https://go.kabsi.co/_check`. Use a 1-minute interval if the plan allows, otherwise 5 minutes. The old account can then be closed.
- **D2 Status page.** In the new UptimeRobot account, Status pages, New: add the four monitors; for `status.kabsi.co` choose Custom domain (a paid feature), then add the CNAME it shows in Cloudflare, DNS only. Link it in the footer afterwards (a later change).
- **E1 Second admins.** On each of Supabase, Vercel, GitHub, Cloudflare, Resend, Sentry, PostHog, Slack, Creem, Meta and Google Cloud add one trusted person with two-factor sign-in, and tick it off in PROGRESS.
- **E2 Rotation dates.** When you next rotate a secret, write the date in `docs/secrets-inventory.md`.
