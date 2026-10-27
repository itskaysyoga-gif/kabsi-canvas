# OWASP ASVS 4.0.3, level 1: Kabsi

Written by Sec 1 on 27 Oct 2026 (master plan 30.15 section 8). Every level 1 requirement is listed with **pass**, **fail** (with its row in `docs/LATER.md`) or **n/a** (with the reason). "Proof" names the test or file that holds it; a test name in `supabase/tests/` runs in CI's Database job, `supabase/functions/_shared/**.test.ts` in the Edge Functions job, `tests/*.test.ts` in the App job.

Kabsi in one line for this list: sign-in is a one-time email code (Supabase Auth), no passwords; the browser reads through row level security and writes only through checked RPCs and Edge Functions; every Google write goes through one publication pipeline with the owner's approval.

## V1 Architecture

Level 1 has no V1 requirement in ASVS 4.0.3 (they start at level 2). The architecture is in `docs/GOOGLE-ARCHITECTURE.md` and `docs/KABSI-MASTERPLAN.md`.

## V2 Authentication

| ID | Requirement | Verdict | Proof or reason |
|---|---|---|---|
| 2.1.1 to 2.1.12 | Password rules | n/a | No passwords anywhere: sign-in is a one-time email code. |
| 2.2.1 | Anti-automation on authentication | fail | `auth-code` has Turnstile and per-IP and per-address limits (Sec 1 abuse review), but Supabase Auth's own captcha is off, so `/auth/v1/otp` can be called directly with the public key. LATER row "Supabase Auth captcha". |
| 2.2.2 | Weak authenticators (SMS, email) only as secondary | pass with note | The email code is the only factor for owners, which ASVS accepts at level 1 for low-value accounts; staff MFA is Sec 2's audit. |
| 2.2.3 | Notify after authentication detail changes | n/a | There is no password or authenticator a user can change; the email address is the identity. |
| 2.3.1 | System-generated initial secrets | pass | Codes are random, single use and expire (Supabase Auth; `_shared/auth-code.ts`). |
| 2.5.1 to 2.5.4, 2.5.6 | Recovery | pass | No recovery secret or security question exists; recovery is a new email code. No default or shared account (`rls_tables.sql` checks no shared fixture can read data). |
| 2.7.1 | Out-of-band code not by SMS or PSTN | pass | Email only. |
| 2.7.2 | Out-of-band code expires within 10 minutes | fail | The email code's lifetime is a Supabase Auth project setting, not in the repo; Supabase's default is 1 hour. LATER row "sign-in code lifetime" (Rashid: Authentication, Providers, Email, Email OTP Expiration 600). |
| 2.7.3 | Out-of-band code used once | pass | Supabase verifies and consumes the code; the WhatsApp connect code is single use (`whatsapp_channel.sql` "a code works once"). |
| 2.7.4 | Out-of-band channel secure | pass | TLS to Resend and Supabase. |
| 2.8.1 | Time-based OTP | n/a | No TOTP. |

## V3 Session management

| ID | Requirement | Verdict | Proof or reason |
|---|---|---|---|
| 3.1.1 | Session token never in the URL | pass | The Supabase session travels in the Authorization header. Action links carry their own single-use link token, not a session (see 8.3.1). |
| 3.2.1 | New session token on authentication | pass | Supabase Auth issues a new token pair on every sign-in. |
| 3.2.2 | Session token has at least 64 bits of entropy | pass | Supabase JWT and refresh token. |
| 3.2.3 | Session token stored securely in the browser | pass with note | supabase-js keeps the session in localStorage; no third-party script reads it (CSP report-only, see 14.4.3). |
| 3.3.1 | Logout invalidates the session | pass | `signOut` revokes the refresh token (auth logs show `token_revoked`). |
| 3.4.1 to 3.4.5 | Cookie attributes | n/a | Kabsi sets no session cookie; the consent choice is the only cookie and holds no secret. |
| 3.7.1 | Re-authentication before sensitive actions | pass | High-risk reviews, hours and profile changes from an email link need the recipient signed in (`email_approvals.sql`); identity fields never from WhatsApp (`whatsapp_channel.sql`). |

## V4 Access control

| ID | Requirement | Verdict | Proof or reason |
|---|---|---|---|
| 4.1.1 | Access rules enforced on a trusted service layer | pass | RLS and SECURITY DEFINER checks (`rls_tables.sql`, `rls_functions.sql`, `sec1_tenant_matrix.sql`); the browser roles hold no table write and no TRUNCATE (`sec1_tenant_matrix.sql`, migration `20261027150000_sec1_hardening.sql`). |
| 4.1.2 | Attributes used for access cannot be changed by users | pass | Roles live in `location_members` and `staff`, writable only through owner-only RPCs (`roles.sql`). |
| 4.1.3 | Least privilege | pass with note | Every role gets exactly its rights (`roles.sql`); a role in one business gives nothing in another (`sec1_tenant_matrix.sql`). Kabsi installers read every business for support, which is wider than they need: LATER row "installer least privilege". |
| 4.1.5 | Access control fails securely | pass | Unknown or missing membership raises 42501; limiters on paid or Google-adjacent calls fail closed (`tests/free-tool-busy.test.ts`, Sec 1 abuse review). |
| 4.2.1 | Protection against IDOR | pass | Every RPC refuses another business (`_victim_calls.psql` run as a stranger, the other business's owner, manager and staff, and Kabsi staff); Edge routes check the business before any service-role read or write (`_shared/sec1/routes.test.ts`; the `content` route was fixed by Sec 1); Storage is folder per business (`sec1_storage.sql`). |
| 4.2.2 | CSRF protection | pass | Authenticated calls use a bearer token, not a cookie; email links act only on POST (`_shared/sec1/email-links.test.ts`). |
| 4.3.1 | Administrative interfaces use MFA | n/a here | Staff MFA is Sec 2's audit (task "the MFA and secrets audit"). |
| 4.3.2 | Directory browsing disabled | pass | Vercel and Supabase Storage do not list folders; buckets are private except `site` (`sec1_storage.sql`). |

## V5 Validation, sanitisation and encoding

| ID | Requirement | Verdict | Proof or reason |
|---|---|---|---|
| 5.1.1 | HTTP parameter pollution | pass | Handlers read one JSON body or one named parameter. |
| 5.1.2 | Mass assignment | pass | Writes go through RPCs with explicit parameters; no table accepts a browser row. |
| 5.1.3 | Input validated by allowlist | pass | Check constraints on every enum column; route schemas in `src/routes` (zod 4). |
| 5.1.4 | Structured data checked against a schema | pass | Model output through `ai/contract.ts`; webhooks through their route parsers (`_shared/sec1/webhooks.test.ts`). |
| 5.1.5 | URL redirects only to allowed destinations | pass | Redirects go to Kabsi paths or to Google's own review URL built from a place ID. |
| 5.2.1 | Untrusted HTML sanitised | pass | React escapes; emails are rendered from fixed templates (`email-layout.ts`). |
| 5.2.2 | Unstructured data sanitised | pass | Review text and owner messages are fenced before any model (`_shared/sec1/injection.test.ts`). |
| 5.2.3 | Email injection | pass | Mail goes through the Resend API with structured fields. |
| 5.2.4 | No eval or dynamic code | pass | None in the code base. |
| 5.2.5 | Template injection | n/a | No server-side template engine reads user input. |
| 5.2.6 | SSRF | pass | Website reading through `safe-fetch.ts` (private addresses refused). |
| 5.2.7 | SVG and scriptable content sanitised | pass | SVG, GIF and PDF uploads are refused by their bytes (`injection.test.ts` P3, P6). |
| 5.2.8 | Scriptable or expression template content | n/a | None. |
| 5.3.1 to 5.3.4 | Output encoding, XSS, SQL injection | pass | React escaping; every query is parameterised (supabase-js, `format(%I, %L)` in plpgsql). |
| 5.3.5 to 5.3.10 | LDAP, OS command, file inclusion, XPath, JSON injection | n/a or pass | No LDAP, no shell, no file paths from users (Storage paths start with the checked business id), JSON built by `JSON.stringify` and `jsonb_build_object`. |
| 5.5.1 to 5.5.3 | Safe deserialisation | pass | JSON only. |

## V6 Stored cryptography

| ID | Requirement | Verdict | Proof or reason |
|---|---|---|---|
| 6.2.1 | Crypto modules fail securely | pass | WebCrypto and pgcrypto; an error refuses the request. |
| 6.2.2 to 6.2.6 | Vetted algorithms and modes | pass | SHA-256 for link hashes, HMAC-SHA256 for signatures and unsubscribe claims, RS256 for Google's push tokens. |

## V7 Error handling and logging

| ID | Requirement | Verdict | Proof or reason |
|---|---|---|---|
| 7.1.1 | No credentials or session tokens in logs | pass with note | Edge `log()` scrubs keys, emails, phones and query tokens (`_shared/log-scrub.ts`, `tests/sec1-no-secrets-in-logs.test.ts`); 24 hours of production function logs read on 27 Oct: 0 emails, 0 phones, 0 tokens in 5728 lines. Supabase's own request log keeps full URLs, and two requests carried a code in the query: LATER row "codes in query strings". |
| 7.1.2 | No other sensitive data in logs | pass | Model output is no longer quoted in errors (`ai/client.ts`); Sentry and PostHog scrub token paths (`src/lib/scrub.ts`). |
| 7.4.1 | Generic error message with an id | pass | `fail()` answers plain words; details go to Sentry scrubbed. |

## V8 Data protection

| ID | Requirement | Verdict | Proof or reason |
|---|---|---|---|
| 8.2.1 | Anti-caching headers on sensitive data | pass | `no-store` on app pages, API answers and every token page (`vercel.json`, `tests/sec1-email-routes.test.ts`). |
| 8.2.2 | No sensitive data in browser storage | pass with note | Only the Supabase session (3.2.3) and the consent choice. |
| 8.2.3 | Data cleared after the session | pass | `signOut` clears the session. |
| 8.3.1 | Sensitive data in the body or headers, not the URL | fail | Email links carry their link token in the path (by design, single use and hashed), but `api/action?t=`, `email/unsubscribe?t=`, `api/resume?code=` and `visibility/check?code=` put it in the query string. LATER row "codes in query strings". |
| 8.3.2 | Users can remove or export their data | pass | Disconnect and deletion (`disconnect.sql`, `purge_after_leaving.sql`); export by request (privacy page). |
| 8.3.3 | Clear privacy language and consent | pass | `/privacy`, consent proof stored with its wording (`consent.ts`). |
| 8.3.4 | Sensitive data identified and protected | pass | Retention table K-40 (`retention.sql`); per-source review is Sec 2. |

## V9 Communications

| ID | Requirement | Verdict | Proof or reason |
|---|---|---|---|
| 9.1.1 | TLS for all connections | pass | Vercel, Supabase, Cloudflare; HSTS with preload (`tests/security-headers.test.ts`). |
| 9.1.2, 9.1.3 | Current TLS and ciphers | pass | Managed by Vercel, Supabase and Cloudflare. |

## V10 Malicious code

| ID | Requirement | Verdict | Proof or reason |
|---|---|---|---|
| 10.3.1 | Auto-update integrity | n/a | No auto-update. |
| 10.3.2 | Subresource integrity on third-party scripts | fail | The Sentry loader, Turnstile and the Meta pixel load from their CDNs without `integrity` (they change under the same URL by design). LATER row "third-party scripts". |
| 10.3.3 | No subdomain takeover | pass with note | Every kabsi.co record points at a live service (docs/OPS-SETUP.md); not re-read live in this session. |

## V11 Business logic

| ID | Requirement | Verdict | Proof or reason |
|---|---|---|---|
| 11.1.1 | Steps in order | pass | Approve, 10 second Undo, claim, publish; the claim re-checks every condition (`sec1_approval_properties.ts`, 400 random orders). |
| 11.1.2 | Realistic human time | pass | Rate limits on every public endpoint (Sec 1 abuse review). |
| 11.1.3 | Limits per user and per business | pass | AI caps, places cap, redraft limit, backlog spacing (`backlog.sql`, `places_cost_guard.sql`). |
| 11.1.4 | Anti-automation | pass | Turnstile and limits on free check, waiting list, Founding 25, Partners, review link, sign-in codes. |
| 11.1.5 | Business logic limits | pass | One publication per item, approvals bound to approver, content and 7 days, one stop switch (`sec1_roles_approvals.sql`). |

## V12 Files and resources

| ID | Requirement | Verdict | Proof or reason |
|---|---|---|---|
| 12.1.1 | Large files refused | pass | 20 MB and 50 megapixels caps before decoding (`injection.test.ts` P1, P2, P7). |
| 12.3.1 | File name metadata not used for paths | pass | Storage paths are built by the server from the business id and a random name. |
| 12.3.2 to 12.3.5 | File inclusion, download, command | n/a | No server file system access from user input. |
| 12.4.1 | Untrusted files outside the web root | pass | Private bucket `owner-photos` (`sec1_storage.sql`). |
| 12.4.2 | Untrusted files scanned | pass with note | Photos are decoded and re-encoded from pixels only (EXIF and GPS gone); other types are refused. No antivirus. |
| 12.5.1 | Web tier serves only allowed file types | pass | Vercel serves the build; Storage serves images. |
| 12.5.2 | Uploaded files never run as HTML or script | pass | Re-encoded images only; `nosniff`. |
| 12.6.1 | Outbound requests to an allowlist | pass | Google, Resend, Kapso, Creem, Anthropic hosts in code; website reading through `safe-fetch.ts`. |

## V13 API and web service

| ID | Requirement | Verdict | Proof or reason |
|---|---|---|---|
| 13.1.1 | Same encoding and parsers | pass | JSON everywhere. |
| 13.1.3 | API URLs expose no sensitive data | fail | Same as 8.3.1. |
| 13.2.1 | Methods used as meant | pass | A GET never acts; HEAD refused on link routes (`email-links.test.ts`). |
| 13.2.2 | JSON schema validation | pass | Route parsers and RPC parameter checks. |
| 13.2.3 | CSRF on REST | pass | Bearer tokens; one-click unsubscribe is a signed claim (RFC 8058). |
| 13.3.1 | SOAP and XML | n/a | None. |

## V14 Configuration

| ID | Requirement | Verdict | Proof or reason |
|---|---|---|---|
| 14.2.1 | Components up to date | pass | Dependency review in CI with no exception left (zod 4.6.7 from Sec 1). |
| 14.2.2 | Unneeded features removed | pass with note | The old `billing` function answers 410 and runs nothing (LATER row, lane R). |
| 14.2.3 | Third-party assets with SRI | fail | Same as 10.3.2. |
| 14.3.2 | Debug modes off | pass | Production builds; Sentry `sendDefaultPii` false. |
| 14.3.3 | No version detail in headers | pass | Vercel and Supabase defaults; no framework banner. |
| 14.4.1 | Content-Type with charset | pass | Vercel and `json()`. |
| 14.4.2 | Content-Disposition on API file answers | pass | PDF and image downloads name their file. |
| 14.4.3 | Content Security Policy | fail | The policy is report-only until Web 2 has a clean week of reports (`tests/security-headers.test.ts`). LATER row "CSP enforce". |
| 14.4.4 | nosniff | pass | `tests/security-headers.test.ts`. |
| 14.4.5 | HSTS | pass | Two years, subdomains, preload. |
| 14.4.6 | Referrer-Policy | pass | `strict-origin-when-cross-origin`, and `no-referrer` on token pages. |
| 14.4.7 | Framing refused | pass | `X-Frame-Options: DENY` on every path (Sec 1), `frame-ancestors 'none'` in the report-only policy. |
| 14.5.1 | Only the methods used | pass | Handlers answer 405 to others. |
| 14.5.2 | Origin header not used for access | pass | Access is decided by the token. |
| 14.5.3 | CORS allowlist | pass with note | Edge Functions answer `*`, which is safe because they use bearer tokens and no cookies. |
