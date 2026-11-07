# Outbound test: the inbox login, Companies House without a key, part G (6 Nov 2026, master plan 30.39 items 8 and 12)

Task "Outbound test" (lane R prompt of 6 Nov 2026, evening). Sending stayed locked throughout: `sending_open` false, `test_mode` true; mail only to OUTBOUND_TEST_RECIPIENTS. No business was written to.

## Pull requests

| Part | What | PR |
| --- | --- | --- |
| 1 | The inbox login: AUTHENTICATE PLAIN, Zoho's own reply logged without the password, an SMTP login probe that sends nothing | 464 |
| 2 | Companies House from Harvey's register, no API key (30.39 item 12); column `company_status_date` | 465 |
| G | A test-only setting that shortens the window and the spacing (30.39 item 12, lane R exception) | 466 |
| G fix | In test mode, suppression reads the test business's own address, not the test inbox (found in the live run) | 467 |
| Docs | This file, PROGRESS, LATER, the run's migration files | this docs PR |

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

## G. The test run (test mode, OUTBOUND_TEST_RECIPIENTS only)

PR 466 added `outbound_settings.test_fast_until` (lane R exception, 30.39 item 12): while sending is locked and test mode is on, outbound-send skips the weekday window and spaces sends 1 minute apart; only a lane R migration sets it, at most 4 hours ahead; opening sending or leaving test mode clears it. Applied as `20261106181020_outbound_test_fast`; read back: column null, the slot rule present, `outbound_reserve_slot` closed to the browser.

Timeline (UTC, 6 Nov), every step a lane R migration in `supabase/migrations/` or a scheduled run:

| Time | What | Evidence |
| --- | --- | --- |
| 18:58 | Test setting on for 3 hours; prepare asked for today (`20261106185829`) | prepare: `no_test_recipients` (the secret was not readable yet); again at 18:58:52 (`20261106185851`), same |
| 19:45 | Rashid saved OUTBOUND_TEST_RECIPIENTS again; prepare asked a third time (`20261106194559`) | 3 test businesses, 3 Email 1 drafts and their follow-ups: 2 to Rashid's Gmail, 1 to a fresh mail-tester.com address; 0 real businesses |
| 19:49 | Rashid approved all 3 on kabsi.co/staff/outbound on his phone | `approved_at` set on all 6 messages |
| 19:50 | outbound-send: the mail-tester email sent; one Gmail email cancelled `suppressed` | Bug: the test inbox is a Kabsi user, so on the never-contact list |
| 19:54 | Sending held 25 minutes so the other was not cancelled (`20261106195401`) | next_send_at 20:19 |
| 20:01 | PR 467 deployed: in test mode suppression reads the test business's own address | Deploy run 176 green |
| 20:03 | The cancelled test email back to approved, the hold ended (`20261106200308`) | 2 approved firsts |
| 20:10, 20:20 | Both Gmail emails sent | Gmail received 20:10:09 (its own Received header); the connector's search showed them only after 20:36 |
| 20:42 | From Rashid's Gmail: an out-of-office ("Automatic reply:" subject) on thread A, "Yes please" on thread B | Gmail message ids in the session |
| 20:45 | outbound-inbox: `matched 2, auto_replies 1, replies 1, yes 1, failed 0` | A: event auto_reply, follow-up still approved (schedule kept). B: follow-up cancelled `heard_from_business`, status needs_you, interested, the reply to a yes drafted (test code), alert "New reply to Kabsi outbound" queued 20:45:04 and taken by the WhatsApp tick 20:45:07 |
| 20:47 | "No thanks." on thread A | |
| 20:55 | outbound-inbox: `matched 1, opt_outs 1, failed 0, harvey_added 0` | A: status opted_out, its address and domain suppressed, follow-up cancelled. No hash to kabsi-harvey: by design a test business never reaches Harvey's list (inbox.ts skips test businesses); the real path is covered by the inbox tests |
| 20:56 | Views read back, then cleared (`20261106205636`) | Before: sent 3, replied 1, interested 1, opted_out 1, approved_queued 2, reply_rate 33.3; days: 6 Nov sent 3, replies 1. After: every count 0, no day rows, 0 prospects, messages, events; suppressed 12 (Kabsi's own users); lock `(f,t,,,)` |

### Deliverability

- Correction, 7 Nov 2026 (lane R): on 6 Nov Gmail placed both test emails in the Spam folder of the test inbox (Rashid's screenshot, 22:38 Beirut, which is 20:38 UTC). Rashid moved them to the inbox, which is where this session later found them through the connector, so the record above that read as if they had landed in the inbox is wrong. mail-tester read 9.2 of 10, and the only deduction was the domain's age. The placement gate that follows from this is master plan 30.39 item 13.
- Also from the live run: the subject sent, "Harbor Barbers's Google profile", used 's after a name ending in s. Fixed in Outbound polish (7 Nov): the possessive is Harbor Barbers' Google profile (docs/COPY.md section 65).
- Gmail, Authentication-Results on the 20:10 Email 1: `dkim=pass header.i=@getkabsi.com header.s=zmail2`, `spf=pass` (165.173.182.12, sender5-op-o12.zoho.com), `dmarc=pass (p=NONE)`.
- DKIM: the signing selector `zmail2` is a 2048-bit key (read from DNS). The older `zmail` record is 1024-bit and is not the one signing.
- mail-tester.com, Email 1 (subject "Harbor Barbers's Google profile"): **9.2 of 10**. SpamAssassin -0.8, almost all `FROM_FMBLA_NEWDOM14` (-0.999, the From domain registered 7 to 14 days ago); `SPF_HELO_NONE` -0.001. DKIM valid from the author's domain, SPF pass, plain text, no image, no shortener, List-Unsubscribe present, not blocklisted. Nothing in the email or the settings can lift the new-domain rule; it lapses as getkabsi.com ages. A fresh test after 20 Nov should read higher (LATER row); the gate of 30.39 item 13 asks for at least 9.5 and an inbox placement test.

## Tests run

- `cd supabase/functions && deno test --no-check --allow-env _shared/outbound/` (Deno 2.9 installed in the session): part 1 50 passed, part 2 46 passed, part G 52 passed, the fix 53 passed, 0 failed.
- `deno check` on outbound-inbox, outbound-send, outbound-prepare: passed. CI's Edge Functions job (scripts/deno-check.sh) green on 464 to 467.
- `npm run typecheck`, `npm run lint:changed` (one existing warning in outbound-panel.tsx), `npm test` (1310 passed after the log-guard rename; the first run caught one log line naming "code" and "text", fixed without touching the guard), `npm run build`: passed.
- Playwright against the local production build (part 2): `tests/e2e/harvey4a-outbound.spec.ts`, `tests/e2e/app5-staff.spec.ts`, `tests/e2e/smoke.spec.ts` at 390 and 1440 px with axe: 37 passed, 1 skipped (the smoke test's own). Screenshot read at 390 px.
- pgTAP `supabase/tests/outbound_test_fast.sql` and the existing Outbound files: CI Database job green.
- Load workflow: not waited for (no trigger, queue or sync change).

## Moved from PROGRESS (to keep it under 10 KB, word for word)

- Session 19 rest closed the session 18 items: the post Undo test passed on 25 Oct (P0.7-05b, undone 3.7 seconds after approval, never sent to Google); Pub/Sub is registered live and a forged push gets 401 (P0.7-03); the push from a real review is still to be seen.

- Trimmed from PROGRESS on 7 Nov to keep it under 10 KB, word for word: Launch 4 (it held "ID " first; the code reads digits only anyway); Speed 2 (read back 16:08 UTC, `/api/suggest` warm says configured true); Scan 2 (the session could not pass Turnstile).

## Known limits

- The staff alert row was taken by the WhatsApp tick at 20:45:07; staff alerts are not stored in `whatsapp_messages`, so the delivery receipt was not read. Rashid confirms on the staff phone.
- The Harvey suppression push was not exercised live (test businesses never reach it by design).
- The reply to a clear yes was drafted but not sent (it waits for Rashid's Send, and the row was cleared).
- mail-tester 9.2, not 10: the new-domain rule only.
- Harvey 4B must add `company_status` and `company_status_date` to register.csv; until then every UK row is refused.
