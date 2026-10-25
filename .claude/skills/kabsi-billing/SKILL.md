---
name: "kabsi-billing"
description: "Use for any Kabsi work on plans, prices, the trial, Creem checkout, the Creem webhook, the customer portal, cancel, upgrade, downgrade, extra locations, the founding price, or the payment ledger Kabsi Partners reads (master plan section 10, R-67)."
---

# Kabsi billing (Creem)

Written by session 10 on 25 Oct 2026. The decisions are master plan section 10 (R-67); plan contents are 27.4; partners are 29.1.

## Facts
- Creem is the merchant of record and the only payment route. Store kabsi.co, account in Hussein's name, run by Rashid. Hussein's only steps: business verification and the payout account at going live (10.2b).
- API: test `https://test-api.creem.io/v1`, live `https://api.creem.io/v1`, header `x-api-key`. Test and live are fully separate (keys, products, webhooks, customers).
- Secrets (Supabase only, never in a chat or a session): `CREEM_API_KEY`, `CREEM_WEBHOOK_SECRET`, `CREEM_MODE` (`test` or `live`). Build sessions never see a key and never use Creem's CLI or MCP server.
- Prices in cents, USD: Essentials 1900 and 19000, Pro 3900 and 39000, extra location 1500 and 15000. Names and description: docs/COPY.md section 23. No product has a Creem trial.
- Trial lives in Kabsi: 14 days of Pro, 30 through a partner (`trial_days_for`, signup_source starting with "partner"), from working Google access, no card.
- Founding: the first 30 live paying businesses keep their price (`subscriptions.founding`, `founding_places_left()`, served at `GET /billing-creem/founding`).
- Fees: 3.9 percent plus 40 cents per payment.

## Code map
- `supabase/functions/_shared/creem.ts`: no SDK. Catalogue, setup plan (reuse an exact match, rename it, create the rest, list the rest, never delete), signature check (hex HMAC-SHA256 of the raw body, constant time), event parsing, the 10.2.9 event table (`effectOf`), the ledger facts, the client.
- `supabase/functions/_shared/billing.ts`: `storeEvent` (one row per event id in `billing_events`, refuses events older than 3 days and events from the other mode, queues job `billing_event`), `applyEvent` (the only writer of paid state; an older event never undoes a newer one), owner messages, day 3 and day 6 reminders (job `billing_reminder`), owner actions, `setupProducts`.
- `supabase/functions/billing-creem/index.ts`: `POST /` webhook, `POST /setup` (staff or x-cron-secret), `POST /owner` (signed-in owner only), `GET /founding`.
- WhatsApp: router words and `k:<op>` Confirm buttons in `_shared/whatsapp/router.ts`, the handler `billing()` in `agent.ts`, the real deps in `db.ts`.
- App: `src/routes/_authenticated/app/plan.tsx`, `src/routes/billing.done.tsx`, `src/lib/plans.ts`; pricing founding block in `src/routes/pricing.tsx`.
- Database: migrations `20261025173010_creem_billing.sql` and `20261025173020_creem_billing_grants.sql`; tests `supabase/tests/billing.sql`, `tests/creem.test.ts`, the billing conversations in `_shared/whatsapp/conversations.test.ts`.

## Rules
- The webhook is the only writer of paid state. The success page and the app never write it.
- Cancel is always scheduled (`mode: scheduled`), never immediate, except Creem's own portal, which cancels at once.
- Upgrade: `proration-charge-immediately`. Downgrade: `proration-none` now, Pro kept in Kabsi until the renewal (`kept_plan`). Add a location: one more unit of the Extra location item, charged now.
- Every change from WhatsApp shows the price and waits for the owner's Confirm. Only the owner (role list and the server check).
- Until going live (session 21) `app_settings.billing_open` is `off`: the paid buttons read "Plans open soon" except for `organizations.billing_test` accounts.
- Product ids live in `app_settings.creem_products_<mode>`, written by the setup action. Never put an id in code.
- Partner commissions (PA1) read `billing_events` (type, amount, currency, organisation, Creem ids). Creem's affiliate program stays off.

## Going live (10.2.13, session 21)
Hussein: verification and payout. Rashid: switch Creem to live, add the live webhook at the same URL, replace `CREEM_API_KEY` and `CREEM_WEBHOOK_SECRET`, set `CREEM_MODE=live`. Then run the setup action in live mode, set `billing_open` to `on`, make one real 19 USD purchase and refund it.

## Docs
- https://docs.creem.io/llms.txt (index), https://docs.creem.io/api-reference/openapi.json (every endpoint), https://docs.creem.io/code/webhooks.md, https://docs.creem.io/features/customer-portal.md, https://docs.creem.io/features/seat-based-billing.md
- Test cards: 4111 1111 1111 1111 succeeds; 4507 9900 0000 0028 declined; 4507 9900 0000 0010 insufficient funds; any future date and CVV.
