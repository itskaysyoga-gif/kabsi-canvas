# Session 10 / session D: plans and payments with Creem (25 Oct 2026, master plan section 10, R-67)

Branch `claude/jolly-euler-miuz27`. PR 221 (part 1: webhook, setup, owner actions, paid state) and the part 2 PR (same branch, restarted from main after PR 221 merged) (part 2: Plan screen, pricing founding block, /billing/done, WhatsApp billing actions, inline email logo, facts, the kabsi-billing skill, this record).

## What was built

- `billing-creem` (verify_jwt off, checks in code): `POST /` the webhook (creem-signature over the raw body, constant time; 401 for missing or wrong, more than 5 in an hour alerts staff on WhatsApp; one row per event id; older than 3 days refused; other mode refused; work queued as job `billing_event`), `POST /setup` (staff or x-cron-secret), `POST /owner` (signed-in owner), `GET /founding` (public count).
- `_shared/creem.ts` (no SDK) and `_shared/billing.ts` (the only writer of paid state, owner messages, day 3 and day 6 reminders as job `billing_reminder`, founding check, owner actions, product setup).
- Migrations `20261025173010_creem_billing.sql` and `20261025173020_creem_billing_grants.sql`, applied by this session with execute_sql (the cascade key, R-44) and registered in schema_migrations.
- Entitlements now return `plan`, `limits` (27.4, `private.plan_limits`), `locations_allowed`, `billing` and the `paused` state. A failed payment keeps working 7 days from the first failure, then pauses (watch and draft, no publish). A downgrade keeps Pro until the renewal (`kept_plan`).
- Plan screen: Monthly or Yearly, Choose Essentials, Choose Pro ("Plans open soon" until `billing_open` is on, except `organizations.billing_test`), and for a paid plan Card and invoices, Switch plan, Add a location, Cancel my plan or Keep my plan, each change after a Confirm with the price.
- `/billing/done` (COPY 23). Pricing page: the line under the buttons and the founding block (real count, hidden at 0 or unknown).
- WhatsApp (10.2.10): "card", "invoice", "receipt", "upgrade", "downgrade", "add a location", "cancel", "keep my plan", "plan"; Confirm buttons `k:<op>`; owner only; the server checks again.
- Emails: the mark is an inline image (Resend attachment, content_id `kabsi-mark`, 64 px PNG of 1,175 bytes, empty alt beside the word kabsi).
- Trial: 30 days for `partner_link` and `partner_invite` signups (`trial_days_for`), 14 otherwise.

## Decisions to confirm
- Product ids per mode live in `app_settings.creem_products_test` and `creem_products_live`, written by the setup action.
- Creem's API has no product bundle endpoint: the bundle with self-service upgrades is a dashboard step (docs/LATER.md).
- Founding places count live mode only; a test purchase never takes one.
- `subscription.unpaid` is treated like `past_due` (7-day grace from the first failure).

## Evidence
Before merge (local, then CI on PR 221):
- `npm run typecheck`: no errors. `npm run lint:changed`: pass after prettier. `npm test`: 61 files, 473 tests pass (new `tests/creem.test.ts`, 23 tests).
- `bash scripts/deno-check.sh`: every function checks; 691 Deno tests pass (699 with the 8 new billing conversations of part 2); eval gate passed on stubs.
- `npm run build`: pass.
- CI on PR 221 head 182e739: App, Edge Functions, Database (pgTAP, including the new `supabase/tests/billing.sql`), Prompt gate, Nora gate, Secret scan, Dependency review, CodeQL all green; Load green on b6be2d7 (the last head with Load-path changes).
- Two red rounds fixed on the way: `rls_functions.sql` refused an anon SECURITY DEFINER function (the founding count moved behind `GET /billing-creem/founding`, migration `20261025173020`) and a private function with the default execute grant (`plan_limits`, revoked); `trial.sql` compared the whole entitlements object (now strips the new keys and checks the trial is Pro).
- Dry run of the migration on production inside a transaction that raised at the end: Yawmiyati and a throwaway business gave trial over = grace, incomplete = grace, active = paid, past due 6 days = paid, past due 8 days = paused with publish false, paused = paused, cancelled = ended; nothing persisted (read back 0 new columns, 0 throwaway rows).
- Applied with execute_sql (the cascade key, R-44): versions 20261025173010 and 20261025173020 registered; read-back: 9 new subscription columns, `billing_checkouts` FK on delete cascade, founding 30, `billing_open` off, Yawmiyati still paid on Pro; anon and authenticated cannot run `founding_places_left` or `plan_limits`, service_role can.
- Security advisors after apply: nothing new (RLS-on-no-policy info rows for the two closed tables, as for every service-only table).

Live after the merge of PR 221 (deploy run 99):
- `curl -X POST .../functions/v1/billing-creem` with no signature: 401 `{"error":"unauthorized"}`. With `creem-signature: deadbeef`: 401.
- `curl .../functions/v1/billing-creem/founding`: 200 `{"left":30}`.
- `POST /billing-creem/owner` without a session: 401; `POST /billing-creem/setup` without staff: 403.
- Setup action in test mode (`select public.call_internal('billing-creem/setup', '{}')`, request 49152): 200, mode test; reused and renamed essentials_month prod_6jmmPqVD08lSOWlm3X1Fk3, essentials_year prod_7RyCZWfuwRMngRfQfoQTmw, pro_month prod_4sBSxgOqjTvzxdjEuFmeGE, pro_year prod_tUrQDKV8rFsdo40xJ983z; created extra_month prod_7lIS3Bvq6HXiz7BMs3tfcX and extra_year prod_w4HWFosnnc0Zq18OT5Z28; unmatched none. Second run (request 49153): every product reused, none renamed, none created. `app_settings.creem_products_test` holds the six ids.
- Screens: `/billing/done` and `/pricing` at 390 px on a local dev build (no sideways scroll; the founding block is hidden until the live count answers). The Plan screen needs a signed-in owner: not screenshotted (docs/LATER.md, QA 1).
- No model call and no paid call was made. Creem calls: the two setup runs in test mode only.

## After merge
Still to run (they need Creem's dashboard or a person):
1. Creem dashboard, Test mode, Developers, Webhooks, the kabsi endpoint, Send test event (10.3.3). Expect 200 at Creem and one row: `select event_key, event_type, outcome, processed_at from public.billing_events order by received_at desc limit 3;`. A test event older than 3 days answers `stale` and is kept with outcome `refused_stale`.
2. The test purchase and the 10.2.12 script, now automated in QA 1 (30.12): mark a test organisation `update public.organizations set billing_test = true where id = '<org id>';`, open Plan, Choose Pro, pay with 4111 1111 1111 1111; then a decline with 4507 9900 0000 0028; a card change in the portal; "cancel" then Confirm in WhatsApp. Read back `select state, plan, period, current_period_end, cancel_at_period_end from public.subscriptions where provider = 'creem';`.
3. Zoho: open the next Kabsi email in Zoho and confirm the mark shows without "Display now" (the inline attachment ships with part 2).

## Found, not done
- The old `billing` function and the two NOWPayments secrets stay until the test checkout passes (10.2.11, docs/LATER.md).
