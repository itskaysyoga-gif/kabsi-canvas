# Kabsi backend (Supabase project `kabsi-prod`, ref `ynjdqjlmdwjgbfezevxy`)

- `migrations/` — every migration already applied to production, named with the exact version
  Supabase recorded (`list_migrations`). Never edit an applied file; add a new one.
- `functions/` — Edge Functions, deployed by Claude (Supabase MCP) and kept here as the source of truth.
  `_shared/kabsi.ts` (clients, auth, rate limit, Sentry, branded email) and `_shared/google/` (the only
  place that calls Google: hello@kabsi.co access, Places, `GOOGLE_MODE=mock|live`; import `_shared/google/index.ts`)
  are bundled into each function at deploy time.
- There is deliberately **no `config.toml`** here: pushing one through the GitHub integration could
  overwrite live Auth settings (SMTP, templates, redirect URLs) that were set in the dashboard.
- Nothing generates files in this folder automatically: every change is a reviewed pull request.

## Functions

| Function | JWT | Called by | Purpose |
|---|---|---|---|
| `brand` | no | email clients | Logo PNG for every email |
| `tap` | no (TAP_SECRET header) | go.kabsi.co Worker | GET resolves a card code; POST logs a tap |
| `places-search` | yes | `/start` | Business search via Places API (New) |
| `lead` | no (honeypot + rate limit) | `/partners` form | Stores a lead, emails hello@kabsi.co |
| `cron-tick` | no (cron secret) | pg_cron every 5 min | Jobs: `access` (accept Manager invites → access granted → email) |
| `kv-sync` | no (cron secret) | DB trigger on `cards` | Clears the Worker's KV copy of a changed card |
| `partner` | no (JWT checked by the RPCs it calls; `billing` needs the cron secret) | `/partner`, `/staff`, pg_cron 06:10 UTC | `invite`, `claim`, `decide` run membership-checked RPCs as the caller and send the emails; `billing` creates last month's partner invoices (only when `google_mode` is live) |

Browser writes go through membership-checked RPCs (see migration `20260925060903`):
`start_location`, `save_consent`, `set_onboarding_step`, `update_knowledge_card`, `choose_plan`,
`activate_card`, `set_card_active`, `rename_card`, `update_notification_settings`,
staff-only `staff_record_payment`, `generate_card_codes`.
Partners (migration `20260926050830`): `claim_partner_membership`, `partner_create_invite`, `partner_submit_claim`,
`partner_invoice_calc`, staff-only `staff_create_partner`, `staff_decide_claim`; service-only `partner_billing_run`.

## Secrets (Supabase → Edge Functions → Secrets)

| Secret | Needed for | Status |
|---|---|---|
| `RESEND_API_KEY` | every email from functions (not the login emails, which use SMTP) | add |
| `PLACES_API_KEY` | business search in `/start` | add |
| `TAP_SECRET` | Worker ↔ `tap` (same value in Cloudflare) | add |
| `CF_API_TOKEN`, `CF_ACCOUNT_ID` | `kv-sync` (token needs Workers KV Storage: Edit) | add |
| `ANTHROPIC_API_KEY` | reply drafts (Phase 4) | later |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`, `GOOGLE_MODE=live` | after GBP API approval | later |

The cron secret is created inside the database (Vault `cron_secret`) and never needs to be copied.
