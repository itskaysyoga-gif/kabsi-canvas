# Kabsi events (docs/EVENTS.md)

The only list of what Kabsi measures (master plan 20). Built by Growth 1 on 25 Oct 2026. A name that is not here is not sent: `tests/events.test.ts` checks this file against `src/lib/telemetry.ts` and the database triggers.

Rules:

- Names are object_action, lower case, past tense, one name per action, the same name wherever it is sent.
- Properties are ids, plan, country, source, channel and counts only. Never review text, names, emails or phone numbers. Sentry and PostHog drop emails, phone numbers and review text before sending (`src/lib/scrub.ts`, `supabase/functions/_shared/kabsi.ts`, tests in `tests/scrub.test.ts`).
- The browser sends only what happens in the browser. Money, access, accounts, WhatsApp, alerts and approvals come from the database's own records (`public.product_events`, sent to PostHog every minute), never from the browser.
- The demo business and kabsi.co test accounts send nothing.
- PostHog runs without cookies until the visitor accepts (section "Consent").

## Browser events (PostHog, through kabsi.co/ingest)

| Name                      | When it fires                                                                  | Where                                   | Properties                                                                              |
| ------------------------- | ------------------------------------------------------------------------------ | --------------------------------------- | --------------------------------------------------------------------------------------- |
| `landing_viewed`          | Every public page view                                                         | Root of the site                        | page_type, category (industry pages), utm_source, utm_medium, utm_campaign, utm_content |
| `pricing_viewed`          | The pricing page is viewed                                                     | Root of the site                        | none                                                                                    |
| `free_scan_started`       | The visitor asks for their business: the "See your map" button of the scan box | Scan box (home, free check, onboarding) | source (home, tool, onboarding)                                                         |
| `free_scan_completed`     | The scan result is on screen                                                   | Scan box                                | source                                                                                  |
| `review_link_created`     | A business is picked in the free review link tool                              | /google-review-link                     | source                                                                                  |
| `whatsapp_button_clicked` | Any "Chat on WhatsApp" or "Try it on WhatsApp" link                            | Every WhatsApp link (one component)     | source (the link kind)                                                                  |
| `signup_started`          | The sign-up sheet opens, or /start opens with no business yet                  | Sign-up sheet, /start                   | source                                                                                  |
| `business_found`          | The owner finds their business in onboarding                                   | /start                                  | country, source                                                                         |
| `connect_started`         | The owner starts adding Kabsi as a Manager                                     | /start                                  | location_id, route                                                                      |
| `profile_state_seen`      | The owner says what state the profile is in                                    | /start                                  | state, location_id                                                                      |
| `setup_call_booked`       | A setup call is booked                                                         | /setup-call                             | source                                                                                  |
| `weekly_report_opened`    | The Results Report screen is opened, once per report                           | App                                     | location_id, source                                                                     |

Renamed by Growth 1: `snapshot_viewed` is `free_scan_completed`; the free check now sends `free_scan_started` at the search, not `business_found` (which stays for onboarding only).

## Server events (PostHog, from the database)

| Name                     | When it fires                                                                           | Source of truth                                      | Properties                             |
| ------------------------ | --------------------------------------------------------------------------------------- | ---------------------------------------------------- | -------------------------------------- |
| `signup_completed`       | A new account exists                                                                    | auth.users insert                                    | method (google, email)                 |
| `google_access_granted`  | Kabsi is a Manager on the profile                                                       | audit log                                            | route, minutes_since_signup            |
| `whatsapp_connected`     | An owner or manager phone is bound, once per person                                     | phone_roles insert                                   | role, source                           |
| `first_alert_sent`       | The first review, post or protection alert reaches the business on WhatsApp             | whatsapp_outbox state sent                           | kind, minutes_since_whatsapp_connected |
| `first_yes`              | The first approval of the business, any item, any channel                               | audit log (approval)                                 | object, channel                        |
| `trial_started`          | The 14-day trial starts                                                                 | audit log (trial_started)                            | plan                                   |
| `checkout_started`       | The owner opens a Creem checkout                                                        | billing-creem, through `public.record_product_event` | plan, period                           |
| `paid`                   | A subscription becomes active (from trial, from a new checkout, or back from cancelled) | subscriptions                                        | plan, period, currency, from, founding |
| `plan_changed`           | Plan or period changes on a paying subscription                                         | subscriptions                                        | plan, period, from_plan, from_period   |
| `payment_failed`         | A payment fails (past due)                                                              | subscriptions                                        | plan                                   |
| `cancel_scheduled`       | The owner asks to stop at the period end                                                | subscriptions                                        | plan                                   |
| `churned`                | A paid plan ends                                                                        | subscriptions                                        | plan, scheduled                        |
| `subscription_paused`    | Kept from P0.6-02                                                                       | subscriptions                                        | plan                                   |
| `details_confirmed`      | The owner confirms the business details                                                 | audit log                                            | changed_count                          |
| `reply_draft_ready`      | A reply draft is ready                                                                  | audit log                                            | rating, risk                           |
| `reply_approved`         | The owner approves a reply                                                              | audit log                                            | edited, seconds_to_approve, channel    |
| `reply_published`        | A reply is live on Google                                                               | audit log                                            | channel                                |
| `post_published`         | A post is live on Google                                                                | audit log                                            | channel                                |
| `photo_published`        | A photo is live on Google                                                               | audit log                                            | channel                                |
| `profile_change_decided` | The owner keeps or puts back a change to the listing                                    | audit log                                            | field, decision, channel               |
| `backlog_cleared`        | The owner approves the backlog of old reviews                                           | audit log                                            | count                                  |

Renamed by Growth 1 (20.1, "renamed in one place"): `registration_completed` is `signup_completed`, `trial_converted` is `paid`, `subscription_cancelled` is `cancel_scheduled` or `churned`. Rows sent before 25 Oct 2026 keep the old names in PostHog; insights use both names until 25 Jan 2027.

## Funnel and dashboards (PostHog, 20.2)

The funnel of master plan section 6, with the button names of 28.8:

1. Visit or ad: `landing_viewed`
2. See your map: `free_scan_started`, then `free_scan_completed`
3. Sign-up: `signup_completed`
4. Google access: `google_access_granted`
5. WhatsApp connected: `whatsapp_connected`
6. First Yes: `first_yes`
7. Paid: `paid`

Four dashboards:

- Acquisition: landing_viewed by utm_source, utm_campaign and page_type; free_scan_started and free_scan_completed by source; whatsapp_button_clicked.
- Activation: the funnel above; time from signup_completed to first_yes; the onboarding step where people stop (business_found, connect_started, google_access_granted, whatsapp_connected).
- Revenue: trial_started to paid; checkout_started to paid; plan_changed; paid by founding; MRR comes from Creem's events in `billing_events`, not from PostHog.
- Retention: owners with a first_yes or reply_approved each week; cancel_scheduled and churned; payment_failed.

Promise check (26.5): `first_alert_sent.minutes_since_whatsapp_connected`, median and 90th percentile. Gate: median under 10 minutes; if it misses, the promise changes.

The Monday staff WhatsApp summary with the week's funnel numbers is built by session 13b part 2 (staff alerts), from the same events.

## Attribution (20.3)

- The browser keeps, for the visit only (sessionStorage, no cookie): first and last touch with utm_source, utm_medium, utm_campaign, utm_content, utm_term, the landing page and the referring site; gclid and fbclid (and fbc, fbp) only where the privacy choice allows advertising.
- Right after the first sign-in, `public.save_signup_attribution` saves them once on the account (`public.signup_attribution`), with `ads_ok`: whether advertising was allowed at that moment.
- A Click to WhatsApp ad's ctwa_clid is kept on the WhatsApp conversation (`whatsapp_conversations.referral_first` and `referral_last`) by the Kapso webhook.
- A referral link (via=CODE) sets the first-party cookie kabsi_via for 60 days (disclosed on /privacy).

### UTM tags (every ad, Outbound email and social post link)

| Channel                            | utm_source | utm_medium  | utm_campaign                                    | utm_content                                         |
| ---------------------------------- | ---------- | ----------- | ----------------------------------------------- | --------------------------------------------------- |
| Meta ads (Facebook, Instagram)     | meta       | paid_social | country_goal_yyyymm, for example us_scan_202611 | the ad name                                         |
| Click to WhatsApp ads              | meta       | ctwa        | country_goal_yyyymm                             | the ad name (the click id comes from WhatsApp)      |
| Google Ads (after the launch gate) | google     | cpc         | country_goal_yyyymm                             | the ad group                                        |
| Outbound email                     | outbound   | email       | outbound_yyyymm                                 | step1, step2                                        |
| Facebook page post                 | facebook   | social      | post_yyyymmdd                                   | the post topic                                      |
| Instagram post or bio              | instagram  | social      | post_yyyymmdd or bio                            | the post topic                                      |
| Kabsi Partners                     | partner    | referral    | partners                                        | the partner handle (the via code does the counting) |
| Kabsi emails to owners             | kabsi      | email       | the email kind, for example results_report      | the button                                          |

Lower case, digits and underscores only.

## Consent (20.4)

- The EU, the EEA, the UK, Switzerland, the United Arab Emirates and Saudi Arabia (and a visitor whose country is unknown): one small bar at the bottom: "Kabsi uses cookies to measure visits and improve ads. You choose." Buttons "Accept" and "Only necessary", link "Details" to /privacy (docs/COPY.md). Until Accept, PostHog stays cookieless and nothing for ads loads. "Only necessary" stops PostHog too.
- Everywhere else: no pop-up. The Meta Pixel may run; PostHog stays cookieless.
- "Your privacy choices" at the foot of every page opens one switch, "Let Kabsi measure its ads", saved the moment it moves.
- A choice counts for 12 months. Each one is stored as proof in `consent_records` (version 2026-10-25, method banner or panel).
- Code: `src/lib/consent-rules.ts`, `src/lib/consent.ts`, `src/lib/region.ts`, `src/components/shared/privacy-banner.tsx`; the server copy in `supabase/functions/_shared/consent.ts`.

## Meta Pixel and Conversions API (20.4)

Pixel (`src/lib/meta-pixel.ts`): public pages only, never /app, /start, /staff, /login, /partner, /billing, the review page a business's customers see, or any token page. Loads only when the choice allows advertising and `VITE_META_PIXEL_ID` is set. Every event carries an event_id.

| Meta event               | From                     | Kabsi event         |
| ------------------------ | ------------------------ | ------------------- |
| PageView                 | Browser                  | every public page   |
| ViewContent              | Browser                  | pricing_viewed      |
| FreeScanStarted (custom) | Browser                  | free_scan_started   |
| Lead                     | Browser                  | free_scan_completed |
| CompleteRegistration     | Server (Conversions API) | signup_completed    |
| StartTrial               | Server (Conversions API) | trial_started       |
| Subscribe                | Server (Conversions API) | paid                |

Conversions API (`supabase/functions/_shared/meta-capi.ts`, the `meta_capi` job): event_id is the `product_events` row id; email, phone and the account id are hashed with SHA-256; fbc and fbp from sign-up. When the owner's chat came from a Click to WhatsApp ad and `META_WABA_ID` is set, the event goes as business_messaging on WhatsApp with that ctwa_clid. Sent only when the person allowed ad measurement (their latest privacy choice, otherwise `ads_ok` from sign-up). Without `META_PIXEL_ID` and `META_CAPI_TOKEN` (Supabase secrets) every job ends as skipped (mock).

### Retargeting audiences (26.4), made in Meta Ads Manager from the Pixel

- Started the scan: FreeScanStarted in the last 30 days, excluding Lead.
- Finished the scan: Lead in the last 30 days, excluding CompleteRegistration.
- Signed up without Google access: CompleteRegistration in the last 30 days, excluding StartTrial (the trial starts only once Kabsi has Google access).

Retargeting uses the Pixel audience only, never an owner's own data.

## Rashid's steps for Meta (once)

1. business.facebook.com, choose the Kabsi.co business portfolio, Events Manager, Connect data sources, Web, name it "kabsi.co", Create. Copy the dataset ID (the pixel ID).
2. In that dataset: Settings, Conversions API, Generate access token. Copy it once.
3. Same dataset: Settings, connected assets: add the WhatsApp Business account of +1 205-745-6874. Copy the WhatsApp Business Account ID from Business settings, Accounts, WhatsApp accounts.
4. Supabase, project ynjdqjlmdwjgbfezevxy, Edge Functions, Secrets: add META_PIXEL_ID (step 1), META_CAPI_TOKEN (step 2) and META_WABA_ID (step 3).
5. Vercel, project kabsi, Settings, Environment Variables: add VITE_META_PIXEL_ID (step 1) for Production, then Redeploy.
6. Vercel, project kabsi, Speed Insights, Enable (no cookies; the script is already on every page).
7. Check: open kabsi.co from a US connection, Events Manager, Test events: PageView arrives. A test sign-up shows CompleteRegistration from the server.
