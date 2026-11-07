# R-123 audit access, 7 Nov 2026

## Decision and status

Lane R approved a temporary, read-only, privacy-masked audit for ChatGPT. The fixed expiration is 14 Nov 2026 at 23:59 UTC.

**Part A foundation:** PR 479 on `claude/audit-a` is open as a draft, not merged or complete. The migration has been applied to the live Supabase project with recorded version `20261107163133`, and the repository file was renamed to that same version. It adds the `auditor` staff role, protected `private.audit_access` and `private.is_auditor()`. Existing `public.is_staff()` is intentionally unchanged, so the audit identity cannot read staff pages or real customer data during the incomplete rollout. No demo ownership has been added.

**Live read-back:** `private.audit_access` has one matching auditor record expiring at the approved UTC instant; the staff role is `auditor`; `public.is_staff()` is false for an unprivileged caller. Security advisors were queried. The new private table appears as an informational RLS-with-no-policy finding, by design; it is not exposed through the Data API.

## Inventory and risk

- The live catalog currently lists 55 public functions that are staff-oriented or refer to `is_staff()`, including read functions, writes and shared owner functions. All exact final staff-write functions and Edge paths still require review.
- The existing `public.is_staff()` is used by RLS policies. Simply letting an auditor pass it would expose raw table reads and personal data, even if the UI hides fields. Therefore this PR does not change it.
- Both demo businesses exist and have existing owner memberships. New audit ownership is deferred until demo isolation is proven.
- Password-enabled Auth users were inspected without outputting addresses or password hashes. The live count differed from the task's initial statement. No existing password was changed.
- Supabase Auth's configured CAPTCHA needs testing for password sign-in with a QA user. No test authentication as the audit identity was attempted.

## Checks and remaining work

- CI on PR 479 is pending at the time of this record. Local npm, Deno, database suite and Playwright have not been run and are not claimed.
- A is incomplete until every staff read/write function and Edge Function is protected, and the requested CI enumeration test has passed.
- B: server-side masking for every staff read including direct SQL and RPC access, with tests.
- C: demo ownership, idempotent invented fixtures, exhaustive outbound-safety barriers and QA.
- D: hidden password login with CAPTCHA, expiration check and robots/sitemap isolation.
- E: expiry cron and a separate final deletion file for Rashid.
- F: role-classified password inventory and justified clearing migrations, without addresses.
- G: 390 px and 1440 px signed-in QA Playwright proofs and independent reviews of A, B and D.

**Release hold:** The foundation was applied but must not be represented as working audit access. Do not merge or activate temporary broad staff reads until the masking review and test gate are complete. No user-facing demonstration or production login has been verified.

## Recovery

Because this migration is additive for data and roles, rollback should preserve `private.audit_access` and deny audit access by expiring its row, not by dropping the live table. The final deletion of the user and its rows belongs in Rashid's separately reviewed SQL file.


## Subsequent restricted parts, 7 Nov 2026

All listed pull requests are drafts, unmerged, and not verified in the owner dashboard.

| Part | Pull request | Verified SQL or code | Not yet verified |
|---|---|---|---|
| A | #479 | Auditor role, private expiry grant; catalog enumerator over all volatile SECURITY DEFINER staff functions | Complete independent review of every staff and Edge write; end-to-end UI |
| B | #483 | Private recursive JSON sanitizer; limited audit totals and categories RPC; synthetic SQL redaction read-back | Existing staff panels have not been converted to masked server reads |
| C | #484 | Proposed server guards in WhatsApp delivery and outbox, email send, owner billing; queued-digest filter and Deno tests | Not deployed; no audit demo memberships added; missing salon photo fixture and visibility fixtures |
| D | #480 | Password route, Turnstile token, fresh access RPC, robots noindex and private path | Not deployed; CAPTCHA and real browser session untested; /staff gate intentionally denies auditor |
| E | #481 | Cron job active in UTC; fixed UTC expiry, ban and both location and organization demo memberships removed | Actual scheduled expiry cannot be proved until the time; manual final deletion not run |
| F | #482 | Classified three password accounts without address or hash exposure | Two non-audit password credentials not cleared; operator-owned SQL prepared |

The live Supabase migration versions are `20261107163133`, `20261107163747`, `20261107164310`, `20261107165741`, and `20261107170650`, in that order of application. The cron job `kabsi_audit_expiry` is active; a SELECT read-back confirmed it is set for 23:59 UTC on 14 November. These are not proof of a deployed website.

`supabase/data/20261107_audit_demo_workspaces.sql` is a staged insert-only data file; it has not been executed, because external-side-effect coverage is not complete. It will be unsafe to activate full auditor ownership before an independent security review confirms no real Google, WhatsApp, Resend or Creem calls can occur from a demo action.

**No part has merged.** GitHub Actions CI runs the normal npm/Edge/pgTAP/390 px speed gate on each draft PR. An authenticated QA Playwright browser run at 390 px and 1440 px has not been executed. No reviewer password was accessed or used.

### Manual files for Rashid

- `supabase/manual/20261107_clear_unused_passwords.sql`: checks roles and accounts, then clears only the two unexpected password credentials. Expected read-back: non-audit count 0, auditor count 1. Not executed.
- `supabase/manual/20261107_audit_final_delete.sql`: review after expiry, delete only the temporary identity with checks for unexpected memberships. Expected read-back: all five counts 0. Not executed.

### Security release gate

Before moving any draft PR into main, complete the existing staff RPC and RLS masking, explicit all-staff Edge write denial, all-demo outbound coverage, full-page dummy data, and 390 px and 1440 px QA sign-in Playwright tests. Have a fresh independent reviewer of the A, B and D diffs; merge current main into each branch and wait for green CI again. Do not silently downgrade these requirements.
