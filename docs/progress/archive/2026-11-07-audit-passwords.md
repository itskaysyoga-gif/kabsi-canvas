# R-123 F. Password sign-in inventory

Checked 7 Nov 2026 without exposing user identifiers or credential material.

| Classification | Roles | Password currently set | Expected password policy |
|---|---|---|---|
| Temporary auditor | auditor, no owner membership yet | Yes, one | Keep only through 14 Nov expiry |
| Operator | staff admin and real-location owner | Yes, one | Normal Google or email code sign-in |
| QA demo | QA, demo-location owner | Yes, one | Normal six-digit email code sign-in |

The role-based inventory found three accounts total, of which two are non-audit. No other password-enabled accounts were found at the time of the read.

The account credentials have **not** been cleared. Under the repo's real-data deletion rule, the owner must review and execute `supabase/manual/20261107_clear_unused_passwords.sql` from the Supabase SQL editor. It verifies exactly the two expected account classes before clearing password hashes and prints only role counts. This preserves Google and OTP sign-in, not other existing sessions. Any changed inventory stops execution.

The `/login` flow remains unchanged. Never copy a password, hash, account address or test code into a report.
