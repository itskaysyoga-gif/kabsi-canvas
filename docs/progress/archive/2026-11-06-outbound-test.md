# Outbound test: the inbox login, Companies House without a key, part G (6 Nov 2026, master plan 30.39 items 8 and 12)

Task "Outbound test" (lane R prompt of 6 Nov 2026, evening). Sending stayed locked throughout: `sending_open` false, `test_mode` true; mail only to OUTBOUND_TEST_RECIPIENTS. No business was written to.

## Pull requests

| Part | What | PR |
| --- | --- | --- |
| 1 | The inbox login: AUTHENTICATE PLAIN, Zoho's own reply logged without the password, an SMTP login probe that sends nothing | 464 |
| 2 | Companies House from Harvey's register, no API key (30.39 item 12); column `company_status_date` | 465 |
| G | A test-only setting that shortens the window and the spacing (30.39 item 12, lane R exception) | 466 |
| Docs | This file, PROGRESS, LATER | this docs PR |

## 1. The inbox login

The cause, from the function's own log after PR 464 (17:55:04 UTC, 6 Nov), with no secret in it:

- IMAP (imap.zoho.com 993, AUTHENTICATE PLAIN as rashid@getkabsi.com): `NO [ALERT] You are yet to enable IMAP for your account. Please contact your administrator (Failure)`.
- SMTP (smtp.zoho.com 465, the same app password, EHLO, AUTH PLAIN, QUIT, nothing sent): `2.7.0 Authentication Successful`.

So the app password, the login name and the host are right (getkabsi.com's MX is mx.zoho.com: the .com data centre). IMAP was off at the organisation level in Zoho. Rashid turned it on in the Zoho Admin Console (about 18:10 UTC). The next run, 18:15:12 UTC on imap.zoho.com 993, answered HTTP 200: `looked_at 11, matched 0, failed 0, handled_to_uid 11` (none of the 11 is Outbound mail). imappro.zoho.com was not needed.

What PR 464 changed: AUTHENTICATE PLAIN when the server offers it (no character of the password needs quoting), else LOGIN with IMAP quoted strings; the password is trimmed; a refusal carries the server's words through `serverSays` (printable, 160 characters, every form of the password cut out); on an IMAP refusal the function logs in to SMTP and quits, and logs `login_refused` with both replies.

## 2. Companies House without a key (30.39 item 12, R-119 rows)

outbound-prepare reads `company_status` and `company_status_date` from `register.csv` (Harvey 4B adds them). A UK row passes only when the status is exactly Active on a Basic Company Data file at most 40 days old (London date). Refused before any page is read: a stale file (`company_status_stale`), no or an impossible date (`no_company_status`), a date ahead (`company_status_date_ahead`), any other status including "Active - Proposal to Strike off" (`company_not_active`), and limited partnerships (numbers LP, SL, NL: `limited_partnership`, from the independent review). Until Harvey 4B ships every UK row is refused with `no_company_status`. COMPANIES_HOUSE_API_KEY is gone from code, tests, SECRETS.md and the skill; Rashid may delete the secret if he set it. The prospect keeps the status and the file date; the staff page shows "(active, Companies House file of <date>)".

Independent review (a fresh agent given only the diff and the rules): no confirmed way for a refused business through. Acted on: apply the migration before merging (done), limited partnerships refused, no file date on test rows, an unrelated deno.lock line dropped. Noted for Harvey 4B: the register should mark "registered company" only for limited companies and LLPs; the age is counted at prepare time (a 40-day file on Friday drafts Monday's mail).

Migration `20261106174809_outbound_company_status_date` applied with apply_migration before merge; read back: `company_status_date | date`.
