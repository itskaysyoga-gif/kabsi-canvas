<!-- Moved verbatim from docs/KABSI-PLAN.md on 24 Oct 2026 (docs diet, master plan 27.12). The index is docs/KABSI-PLAN.md. -->

## 8. Wave P0.2: trust and policy

Goal: the things Google's policy requires before access is granted, and the trust promises Kabsi makes, work end to end on the mock: disconnect, notices, retention, an owner-approved baseline, Google Protection on Google's own update flow, tighter email approvals, Places costs capped, and legal pages that match the system.

Done when (wave): an owner can disconnect in 3 taps and the access-change email arrives; a mock Google update is accepted and rejected through the update flow; name and category changes refuse without sign-in; the retention job enforces the K-40 table; kabsi.co/privacy carries the Limited Use sentence word for word.

### P0.2-01 Retention table

- Decisions: K-40, K-113.3, D257, D266.
- Touches: migration adding `retention_policies` (data class, keep_days, basis) seeded from K-40, `run_retention` extended to Google profile values (30 days), Google performance figures (30 days), uploaded photos (30 days after publish or skip, Storage objects deleted), audit content fields (24 months, redacted per class), drafts and payloads (as today), Google data 30 days after access is lost (as today); tests.
- Depends on: P0.1-10.
- Model: Opus.
- Done when: database tests seed rows older than each limit and prove `run_retention()` clears exactly those fields and keeps ids, ratings, dates and the owner's own values; `retention_policies` matches K-40 row for row; the Storage clean-up is proven on a test object.
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo itskaysyoga-gif/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.2-01, then docs/KABSI-PROGRESS.md. Do only task P0.2-01. Follow section 2: apply database changes yourself, open the pull request, make sure CI is green, update PROGRESS on the branch, merge the pull request yourself, run the After-merge checks you can, then give Rashid the PR link and a 3-line summary. Stop and ask only before dropping tables or columns or deleting real data.
Read K-40 in docs/source/KABSI-AUDIT.md. Make the policy table the single source the retention job reads. Tests first, with rows on both sides of every limit.
```

### P0.2-02 Disconnect Kabsi and access-change notices

- Decisions: K-41, K-113.1, K-113.2, A1, guardrail 11.
- Touches: Settings section "Disconnect Kabsi from Google" (visible, not hidden; confirm sheet; 3 taps); RPC `request_disconnect(location)` (owner only, signed in); job `disconnect` that removes Kabsi's admin entry through `_shared/google/admins` (mock now), cancels open tasks and approvals, stops jobs for the business, marks `google_connections.access_state = removed`, emails the owner a confirmation with how to check in Google; if removal fails, a staff alert with a due date 7 business days out (tracked in a `staff_followups` row and shown on /staff); a separate access-change email within 48 hours of any change Kabsi makes to access, starting with accepting the Manager invitation, saying what changed and how to remove Kabsi; audit events for each step.
- Depends on: P0.1-13b, P0.2-01.
- Model: Opus (Google access).
- Done when: on a QA business in mock mode, disconnect takes 3 taps and produces the confirmation email, the audit events, cancelled tasks and no further jobs (SQL); a forced mock failure creates the staff follow-up with the right due date; accepting a mock invitation sends the access email within the same job run; the review link keeps working after disconnect.
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo itskaysyoga-gif/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.2-02, then docs/KABSI-PROGRESS.md. Do only task P0.2-02. Follow section 2: apply database changes yourself, open the pull request, make sure CI is green, update PROGRESS on the branch, merge the pull request yourself, run the After-merge checks you can, then give Rashid the PR link and a 3-line summary. Stop and ask only before dropping tables or columns or deleting real data.
Read K-41 and K-113 points 1 and 2 in docs/source/KABSI-AUDIT.md. Build the screen, the RPC, the disconnect job, the follow-up and the two emails. Use the admins module in _shared/google; it is mock until Gate A.
```

### P0.2-03 Business Knowledge table and the owner-approved baseline

- Decisions: K-10 (table), K-18, K-20, A2, A5, R-05.
- Touches: migration adding `knowledge_facts` (location, key from the K-10 catalogue, value jsonb, status verified, needs_confirmation, outdated, rejected, source owner, google, website, partner, ai_suggestion, staff, source_ref, confirmed_by, confirmed_at, review_after, uses, version, superseded_by) with history kept by versioning; `profile_changes` replacing `listing_changes` (field, previous approved value, Google value, source google_update, notification, scheduled_check, detected_at, severity, status detected, awaiting_review, accepted, rejected, corrected, failed, expired, superseded, decided_by, decided_at, publication_id); migrate existing baselines as "not yet confirmed" (never as approved, fixing A2); a "confirm your details" RPC that writes owner-verified facts for name, phone, website, address or service area, regular hours, main category, open status.
- Depends on: P0.2-01.
- Model: Opus.
- Done when: existing `knowledge_card` values are copied to `knowledge_facts` as verified, source owner (row counts match per key); existing baselines appear as unconfirmed; a superseded change becomes `superseded`, not `kept` (test); changes nobody answers in 14 days become `expired` (test); RLS tests cover both tables.
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo itskaysyoga-gif/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.2-03, then docs/KABSI-PROGRESS.md. Do only task P0.2-03. Follow section 2: apply database changes yourself, open the pull request, make sure CI is green, update PROGRESS on the branch, merge the pull request yourself, run the After-merge checks you can, then give Rashid the PR link and a 3-line summary. Stop and ask only before dropping tables or columns or deleting real data.
Read K-10, K-11, K-18 and K-20 in docs/source/KABSI-AUDIT.md. Expand only: add the two tables, migrate data, keep knowledge_card readable until P0.3-01 switches readers. Tests first.
```

### P0.2-04 Google Protection on Google's update flow

- Decisions: K-19, K-77, K-116.2, K-117 (map pin is high risk), K-64, A3, A4, guardrail 7.
- Touches: `_shared/shield.ts` replaced by a Protection detector job using `_shared/google/updates` (hasGoogleUpdated and getGoogleUpdated diff) plus the daily read; watched fields per K-19 including open status and map pin; explanation text ("Google shows Sunday closing at 18:00. You approved 22:00."); the two decisions "Google is right" (accept, updates the fact) and "Keep my information" (reject, re-sends the approved value through the pipeline, then reads getGoogleUpdated again); Google's name rules checker (web addresses, keywords, city, slogan) that recommends "Google is right" when the old name broke them; name, address, main category, open status and map pin need a signed-in owner and show "Changing this can make Google ask you to verify your business again."; at most one high-risk field per approval and 7 days between them; a field never re-sent more than twice in 30 days (third conflict becomes a support task with a ready explanation); fields not yet confirmed are labelled "Not yet confirmed by you" and never offered for restore; status line on Home "Google Protection: on, last check 09:14".
- Depends on: P0.2-03, P0.1-13b.
- Model: Opus (Google access).
- Done when: on the mock, a Google update to hours creates a change with the explanation, "Keep my information" publishes once through the pipeline and the diff clears; "Google is right" updates the fact; a name change from "Yawmiyati.com" to "Yawmiyati" recommends "Google is right" with the reason; a name change attempted from an email link is refused until sign-in (test); a second high-risk change inside 7 days is refused (test); nothing is ever reverted without a decision (grep and test).
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo itskaysyoga-gif/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.2-04, then docs/KABSI-PROGRESS.md. Do only task P0.2-04. Follow section 2: apply database changes yourself, open the pull request, make sure CI is green, update PROGRESS on the branch, merge the pull request yourself, run the After-merge checks you can, then give Rashid the PR link and a 3-line summary. Stop and ask only before dropping tables or columns or deleting real data.
Read K-18 to K-20, K-77 and K-116 point 2 in docs/source/KABSI-AUDIT.md and guardrail 7. Never revert anything automatically. Build detection, explanation, the two decisions through the pipeline and the guards; the full Google Profile screen comes in P0.3-11, so keep the UI to the change card and the Home status line.
```

### P0.2-05 Email approvals tightened

- Decisions: K-17, K-38, K-70, A16.
- Touches: `action_tokens` (bind to one action and one recipient, 72-hour expiry, single use), `src/routes/a.$token.tsx` (shows the exact text, one Approve button that sends a POST, then "Publishing in 10 seconds" with Undo), `api/action.ts`; sign-in required for profile changes, hours and high-risk items (the page asks to sign in and returns); audit events with channel, user, IP country and user agent; `kabsi_cleanup_action_tokens` keeps working.
- Depends on: P0.1-13a.
- Model: Opus.
- Done when: tests prove GET never changes anything, a second POST returns the existing result, an expired or used token is refused, a token used by another recipient's session is refused for sign-in-required kinds; undo from the email page cancels; the audit row carries the channel `email_link`.
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo itskaysyoga-gif/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.2-05, then docs/KABSI-PROGRESS.md. Do only task P0.2-05. Follow section 2: apply database changes yourself, open the pull request, make sure CI is green, update PROGRESS on the branch, merge the pull request yourself, run the After-merge checks you can, then give Rashid the PR link and a 3-line summary. Stop and ask only before dropping tables or columns or deleting real data.
Read K-17 in docs/source/KABSI-AUDIT.md. Keep the scanner-safe design (GET shows, POST performs). Tests first.
```

### P0.2-06 Places cost guard

- Decisions: K-100, K-63, K-99.4, G-16 (rate limits on tools).
- Touches: `_shared/google/places.ts` (field masks on every request, never the reviews field; autocomplete with session tokens; 24-hour cache by place ID), `places_usage` daily counter with a kill switch at the cap (tool shows "Back soon" when passed), Slack alert at 80 percent; Rashid's step 3 in section 5.
- Depends on: P0.1-11.
- Model: Sonnet.
- Done when: every Places request in the code has a field mask (grep); a cache hit makes no Places call (test with a call counter); the kill switch trips at the configured cap in a test; Rashid confirms the quota of 100 a day, the budget alerts and places-backend disabled (recorded in PROGRESS with the date).
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo itskaysyoga-gif/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.2-06, then docs/KABSI-PROGRESS.md. Do only task P0.2-06. Follow section 2: apply database changes yourself, open the pull request, make sure CI is green, update PROGRESS on the branch, merge the pull request yourself, run the After-merge checks you can, then give Rashid the PR link and a 3-line summary. Stop and ask only before dropping tables or columns or deleting real data.
Read K-100 in docs/source/KABSI-AUDIT.md. Add masks, session tokens, the cache and the kill switch. Then give Rashid step 3 from section 5 of the plan in plain words and record his confirmation.
```

### P0.2-07 Privacy, terms and security pages that match the system

**Changed 21 Oct 2026 (K-124, K-128, R-33).** Built. The seller wording stays; the governing law becomes the law of the United Arab Emirates (a lawyer confirms, D4); the partner, crypto, cash and card-order clauses go; `/privacy` adds the 60-day `via` attribution. The edits are made in P0.8-01 and P0.8-12, not here.

- Decisions: K-40 (table in plain words), K-41, K-113.6 (Limited Use sentence word for word), K-113.7, K-112 (notice), K-98 (eligibility), K-101 (trial terms), K-48 (billing rules), R-20, D254.
- Touches: `src/routes/privacy.tsx`, `terms.tsx`, `security.tsx`, `knowledge/kabsi-facts.md`.
- Depends on: P0.2-01, P0.2-02, P0.1-03.
- Model: Sonnet.
- Seller: the pages read the seller from the `LEGAL_SELLER` constant in `src/lib/site.ts` (R-20: Hussein Slim, Dubai); governing law is listed for the lawyer read.
- Done when: `curl -s https://kabsi.co/privacy` contains "Kabsi's use and transfer to any other app of information received from Google APIs will adhere to the Google API Services User Data Policy, including the Limited Use requirements."; the retention table on the page matches `retention_policies`; processors listed match reality (Supabase EU, Resend, Anthropic, Sentry EU, PostHog US, Cloudflare, Vercel, Calendly, Creem once live; Kapso and Meta added by P0.6-12); no "Replit"; disconnect described as built.
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo itskaysyoga-gif/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.2-07, then docs/KABSI-PROGRESS.md. Do only task P0.2-07. Follow section 2: apply database changes yourself, open the pull request, make sure CI is green, update PROGRESS on the branch, merge the pull request yourself, run the After-merge checks you can, then give Rashid the PR link and a 3-line summary. Stop and ask only before dropping tables or columns or deleting real data.
Read K-40, K-41, K-112 and K-113 in docs/source/KABSI-AUDIT.md. Every sentence must be true of the system as built today; mark nothing as coming. Use the LEGAL_SELLER constant for the seller line. Add a note in PROGRESS that a lawyer should read both pages before launch.
```
