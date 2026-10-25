# Fix later

Rule from Rashid (25 Oct 2026, master plan 30.11): a session never loops on a problem that can wait. It notes the problem in its report under Known limits, adds a row here in its own PR, and moves on. The lane R chat clears this list at the launch gate, or earlier when an item starts blocking real work. A problem that blocks the session's own task is fixed, not postponed.

| Item | Why it can wait | Must be fixed before | Owner |
| --- | --- | --- | --- |
| Backup workflow fails at "Back up" (exit 1). Likely SUPABASE_DB_URL: Session pooler URI, port 5432, user postgres.ynjdqjlmdwjgbfezevxy, password percent-encoded | No paying customer yet | First paying customer: one Backup and one Restore drill green | Rashid, lane R |
| Branch ruleset protect-main is Disabled (it required "CI / App", a name no job reports) | Sessions merge only on green ci.yml | Launch gate: re-enable with the job names in docs/OPS-SETUP.md step 7 | Rashid |
| Zoho shows an orange warning icon beside Kabsi emails | Mail lands in the inbox | Launch gate | Rashid |
| Email logo is an outside image, hidden in Zoho and Outlook until clicked | No owners yet | Session D: inline image (content_id), empty alt | D |
| Inbox test: mail-tester score and Outlook | Gmail and Zoho inbox placement pass | Web 2 email templates | Web 2 |
| Sentry alerts go to Rashid's Gmail (free plan, 1 member) | Rashid reads Gmail | Only if the plan changes | none |
| zod 3 high advisory (Dependabot PR 209, breaking upgrade) | Listed exception | Sec 1 | Sec 1 |
| Dependabot PR 207 (Actions bumps) | Pins are recent | Any session with a free slot | any |
| Pub/Sub not yet seen from a real review | Registration read back live; needs a natural review (never one Rashid or anyone at Kabsi writes) | Launch gate | lane R checks google_events |
| Facts still say Kabsi has no WhatsApp number | True until the phone test passes | 13b phone test | Fix 1 |
| Rashid's own phone number is still in two Deno test files (`_shared/whatsapp/world.test-helpers.ts`, `agent-units.test.ts` line 30) | Test data only, not shipped | Launch gate: replace with +1 555 numbers | 13b part 2 |
