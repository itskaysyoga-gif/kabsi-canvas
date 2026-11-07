# 7 Nov 2026, Audit close (R-125)

Decision: the ChatGPT audit account of R-123 is cancelled before use (master plan 30.40). This session closes the audit work and makes the live database match main again.

## 1. Pull requests and branches

- Closed unmerged, each with the comment "Closed by R-125: audit account cancelled before use.": 479 (part A), 480 (D), 481 (E), 482 (F), 483 (B), 484 (C), 485 (G).
- Branches: `claude/audit-a` to `claude/audit-g`, `claude/audit1` and `claude/audit1-baseline` have no open pull request. This session could not delete them: the session's git and API proxy answers 403 to a branch delete, and a policy denial is not retried. Rashid deletes them (see "Manual steps"). Deleted by this session: none.
- Kept: `claude/golive1-b-audit` (not part of R-123).

## 2. What the audit work left on the live database (read back 7 Nov, before this session changed anything)

The seven migrations were all applied: audit_access_foundation, audit_login_gate, audit_expiry_job, audit_masked_overview, audit_expiry_org_members, audit_deny_attribution_write, audit_mask_numeric_allowlist.

| Kind | Object | State read back |
|---|---|---|
| Table | `private.audit_access` | one grant row, expiry 14 Nov 2026 23:59 UTC, RLS on, no policy, no API role grant |
| Function | `private.is_auditor()` | security definer, execute for the owner role only |
| Function | `private.expire_audit_access()` | security definer, execute for the owner role only |
| Function | `private.audit_mask_json(jsonb)` | the numeric allowlist version, not security definer, no API role grant |
| Function | `public.audit_login_allowed()` | security definer, execute for authenticated and service_role |
| Function | `public.audit_staff_overview()` | security definer, execute for authenticated and service_role |
| Cron job | `kabsi_audit_expiry` | `59 23 14 11 *`, active |
| Check constraint | `public.staff.staff_role_check` | allowed 'admin', 'installer' and 'auditor'; a check on a text column, not an enum |
| Row | `public.staff` | one row with role auditor (the audit account); the only other row is the admin |
| Row | `auth.users` | the audit account: one Auth user, one identity, a password set, no location or organisation membership |
| Changed existing function | `public.save_signup_attribution(jsonb)` | carried an auditor read-only block; the only existing function the audit work changed |
| Policies | none | no policy on any table mentions audit_access, is_auditor or the auditor role |
| Enum values | none | |
| `public.is_staff()` | | unchanged (admin only), as the audit migrations promised |

The wider audit log (`private.audit`, `private.audit_*` triggers, `public.audit_events`, `auth.audit_log_entries`) is the P0.1-10 audit log, not R-123, and is untouched.

## 3. Restore (applied by the session)

Migration `supabase/migrations/20261107190406_audit_close_restore_attribution.sql` (applied as audit_close_restore_attribution, recorded by `list_migrations` as version 20261107190406). It is `create or replace` of `public.save_signup_attribution` with the body from `20261025210000_growth_events.sql` section 5, plus the same revoke and grant. No drops.

Read back: the live body has the same whitespace-normalised md5 as the body on main (6d88955e42ebf086a48c65c6d95a7261), no mention of the auditor, security definer, `search_path` empty, execute for authenticated, postgres and service_role only.

The seven audit migrations stay in the database's migration history (a version cannot be un-applied) and have no file on main. This is intended: adding them to main would put the audit objects back on every fresh database.

## 4. Drops file (Rashid runs it)

`supabase/manual/20261107_audit_close_drops.sql`, one transaction, checks inside it, then a read-back. It was run in this session only against a throwaway local Postgres 16 holding stand-in copies of the seven migrations' objects: it printed the expected read-back (cron_jobs 0, functions 0, tables 0, policies 0, auditor_staff_rows 0, the constraint with admin and installer only, audit_auth_users 0, password_accounts 1) and the unrelated `private.audit` function survived. It was not run on production.

Password block: the file has a marked separate block that clears the one password on the account that is both a staff admin and an owner of a real business (found by role; no address printed here or in the file). Live inventory read back on 7 Nov: three accounts hold a password: the audit account, that operator account, and the QA demo owner. `docs/testing.md` has Playwright sign in with one-time codes (`KABSI_QA_CODE_DEMO`, `KABSI_QA_CODE_OWNER`, `KABSI_QA_CODE_UI`), and no code in the repository calls a password sign-in, so nothing uses the QA demo owner's password. It was not on the task's list, so it is left as it is and the read-back expects `password_accounts` 1.

## 5. Proof

- `list_migrations` after the restore ends with 20261107163133 audit_access_foundation, 20261107163747 audit_login_gate, 20261107164310 audit_expiry_job, 20261107165741 audit_masked_overview, 20261107170650 audit_expiry_org_members, 20261107175152 audit_deny_attribution_write, 20261107175356 audit_mask_numeric_allowlist, 20261107190406 audit_close_restore_attribution.
- Security advisor, before and after the restore (the restore changes no grant, so the counts are equal): 1 info and 3 warning kinds; rls_enabled_no_policy 60 (one is `private.audit_access`), anon_security_definer_function_executable 1, authenticated_security_definer_function_executable 125 (two are `audit_login_allowed` and `audit_staff_overview`), auth_leaked_password_protection 1. Expected after Rashid runs the drops file: 59, 1, 123, 1. Read again after his run.
- One query over every function body, table, policy, trigger, view and cron job that mentions audit_access, is_auditor or expire_audit_access returned exactly six rows, every one removed by the drops file: cron `kabsi_audit_expiry`; functions `private.expire_audit_access`, `private.is_auditor`, `public.audit_login_allowed`, `public.audit_staff_overview`; table `private.audit_access`. No policy, trigger or view matched. `save_signup_attribution` no longer matches.

## Manual steps left for Rashid

1. Run `supabase/manual/20261107_audit_close_drops.sql` in the Supabase SQL editor (whole file, once) and paste the last result row back. Expected: `cron_jobs 0, functions 0, tables 0, policies 0, auditor_staff_rows 0, staff_role_check CHECK ((role = ANY (ARRAY['admin'::text, 'installer'::text]))), audit_auth_users 0, password_accounts 1`. A second run stops at the password block by design.
2. Delete the nine branches on GitHub (Branches page, trash icon) or from a terminal: `git push origin --delete claude/audit-a claude/audit-b claude/audit-c claude/audit-d claude/audit-e claude/audit-f claude/audit-g claude/audit1 claude/audit1-baseline`.
3. Nothing is needed for the operator's sign-in: the account keeps Google or the emailed code. After the run, sign in once that way to confirm.

## Found, not done

- Leaked-password protection in Supabase Auth is still off (advisor, already in PROGRESS "Open for Rashid"). With no password left on the operator account it matters less; it still stays on the list.
