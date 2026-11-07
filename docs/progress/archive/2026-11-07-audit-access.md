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
