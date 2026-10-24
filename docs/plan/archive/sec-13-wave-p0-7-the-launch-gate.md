<!-- Moved verbatim from docs/KABSI-PLAN.md on 24 Oct 2026 (docs diet, master plan 27.12). The index is docs/KABSI-PLAN.md. -->

## 13. Wave P0.7: the launch gate

Goal: with Google already live on Kabsi's own profiles (Wave P0.G, section 7A), finish the live-only checks once P0.1 to P0.6 are built, and pass the guardrail 22 launch gate with the first real customer. Only then do the CTA and the ads change.

Gate A was approved on 5 Oct 2026, so the plan B in K-86 (reapply, concierge only) is not needed. The concierge cap of 20 (R-09) stays until P0.7-07 passes. Moved to Wave P0.G: P0.7-01a, P0.7-01, P0.7-01b, P0.7-02, P0.7-04, P0.7-05. P0.7-03 stays here and can start as soon as P0.7-04 is done.

### P0.7-03 Google notifications through Pub/Sub

- Decisions: K-37, D250 (daily reconciliation stays).
- Touches: Pub/Sub topic and push subscription in project smiling-chess-505915-b7 (Rashid's console steps, or gcloud if he grants access), Edge Function `google-events` verifying the push token (OIDC issuer, audience, service account), mapping new review, updated review, Google update, location state change and new media into jobs (never writing data directly); notification settings turned on for the Kabsi account and the client group; daily reconciliation kept.
- Depends on: P0.7-04, P0.1-12b.
- Model: Sonnet (R-39; was Opus; it only turns events into jobs). Runs inside the Opus session 18.
- Done when: a real new review on Yawmiyati produces a job within a minute; a forged push without a valid token is refused (test); the reconciliation still runs daily.
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo itskaysyoga-gif/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.7-03, then docs/KABSI-PROGRESS.md. Do only task P0.7-03. Follow section 2: apply database changes yourself, open the pull request, make sure CI is green, update PROGRESS on the branch, merge the pull request yourself, run the After-merge checks you can, then give Rashid the PR link and a 3-line summary. Stop and ask only before dropping tables or columns or deleting real data.
Read K-37. Events only enqueue jobs. Give Rashid the console steps for the topic and subscription if you cannot create them, then verify with a real event.
```

### P0.7-05b Live test of the features built after Wave P0.G

**Changed 21 Oct 2026.** Also test live, with Hussein's approval of each write: a WhatsApp Approve of a low-risk reply and its Undo; a put-back; an auto-fix on a test profile if the policy check in P0.8-04 allows it; a holiday answer publishing `specialHours`; the review link page; a review graphic; the Coach checklist; and the search terms. It depends also on P0.8-03, P0.8-04 and P0.8-09. Changed by R-42: the order and booking button (P0.8-10) waits for session L4 and is not tested here.

- Decisions: K-85, K-66, K-67, K-41 (self-removal), K-117.
- Touches: on Yawmiyati and, with the owner's consent, Abou Hamze Auto Center: full onboarding; expected results: tasks for description, cover photo, opening date, special and extra hours; the recognised Google name update with "Google is right" recommended; video view figures in Insights; "sounds like you" voice rules proposed from past replies read live and only confirmed rules stored; backlog drafted; Business Knowledge baseline confirmed; disconnect and reconnect tested, including Kabsi's Manager access removed through the API (or the staff follow-up).
- Depends on: P0.7-05, P0.2-02, P0.2-03, P0.3-10, P0.5-01.
- Model: Opus (live Google).
- Done when: each expected result happened (evidence per line); if a detector misses an expected result it is recorded as a blocker (detectors are not ready until they pass); disconnect removed Kabsi's access.
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo itskaysyoga-gif/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.7-05b, then docs/KABSI-PROGRESS.md. Do only task P0.7-05b. Follow section 2: apply database changes yourself, open the pull request, make sure CI is green, update PROGRESS on the branch, merge the pull request yourself, run the After-merge checks you can, then give Rashid the PR link and a 3-line summary. Stop and ask only before dropping tables or columns or deleting real data.
Read K-67, K-85 and K-117. Every write to Google needs Hussein's own approval in the app, as for any owner.
```

### P0.7-06 Page-by-page audit, contradiction sweep and the test matrix

- Decisions: guardrails 21, 24 and 25, K-47, K-54 (manual checks).
- Touches: walk every authenticated screen as an owner, a manager, a staff member and a partner member, on 390 px and desktop: login, onboarding, Home, Reviews, review detail, Get Reviews, Google Profile, Content, Insights, Business Knowledge, tasks, team, notifications, Settings, billing, Google connection, help and Nora, partner view; every empty, loading, error, success and permission-denied state; disconnected Google, expired session, failed publication, failed verification; a repository-wide search for stale language (Profile Score, Do now, Listing Shield, Put mine back, old prices, "coming soon" where a feature exists, ownership language, ranking promises, test accounts outside the demo); the manual checks in K-54 (iPhone Safari, Android Chrome, slow network, revoked access, closing the approval screen mid-publish, double tap, partial failure).
- Depends on: P0.7-05b.
- Model: Sonnet for the walk; any fix that touches access rules goes to a separate Opus task.
- Done when: a checklist in PROGRESS with every screen and state marked pass or with an issue and its fix task; the stale-language search returns nothing.
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo itskaysyoga-gif/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.7-06, then docs/KABSI-PROGRESS.md. Do only task P0.7-06. Follow section 2: apply database changes yourself, open the pull request, make sure CI is green, update PROGRESS on the branch, merge the pull request yourself, run the After-merge checks you can, then give Rashid the PR link and a 3-line summary. Stop and ask only before dropping tables or columns or deleting real data.
Read guardrails 21, 24 and 25. Record every finding; fix only copy and layout issues in this task and open new PROGRESS items for anything else.
```

### P0.7-07 First real customer end to end, and the launch gate

**Changed 21 Oct 2026 (K-126, K-140, K-141, D4, D6).** Creem checkout is tested on Essentials and Pro; the CTA switch changes the trial buttons from "Join early access" to "Start free" (the hero "Check my Google profile free" never changes); a lawyer has read `/terms` and `/privacy`; Kabsi Partners stays off until Rashid opens it; the 5 to 10 founding customers follow (guardrail 28).

- Decisions: guardrail 22, guardrail 27, G-39 tier 1, VIDEO "Read first" gates, R-02, D2.
- Touches: with the first real customer (D2, written consent): business discovery, snapshot, sign-up, Google access, knowledge, first value, review draft, owner approval, publication, verification, audit event, notification, weekly report, billing (Creem checkout on a phone), disconnect including Manager access removal; success and failure paths (a rejected reply, a failed publication, a revoked access) with real Google responses; then the G-39 tier 1 checklist; then switch the CTA from "Join early access" to "Start free" with "14 days free. No card." everywhere (one constant) and remove "Early access" tags.
- Depends on: P0.7-06, P0.4-07, P0.6 done except P0.6-03, P0.6-04 and P0.6-09 (R-42). **Before card payments open (R-51, 22 Oct 2026): Vercel Pro (Hobby is non-commercial) and Supabase Pro with point-in-time recovery (K-87); the session checks both are active and records them in PROGRESS.** D2 is decided: Abou Hamze Auto Center; the owner agreed and Kabsi is Manager. Before the first real customer other than the two Kabsi-owned profiles connects, Rashid upgrades `kabsi-prod` from the free plan to Supabase Pro with point-in-time recovery (K-87, $25 a month, in Hussein's own organisation) and the session runs the first restore test into a scratch project (project and time recorded in PROGRESS).
- Ask Rashid before: contacting the customer, and before switching the CTA.
- Model: Opus.
- Done when: the Vercel Pro and Supabase Pro upgrades and the restore test are recorded; every step of guardrail 22 has evidence from the real run; every G-39 tier 1 line is ticked or explicitly waived by Rashid; the four VIDEO gates are clear; only then the CTA changes and PROGRESS records "Paid ads may start".
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo itskaysyoga-gif/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.7-07, then docs/KABSI-PROGRESS.md. Do only task P0.7-07. Follow section 2: apply database changes yourself, open the pull request, make sure CI is green, update PROGRESS on the branch, merge the pull request yourself, run the After-merge checks you can, then give Rashid the PR link and a 3-line summary. Stop and ask only before dropping tables or columns or deleting real data.
Check PROGRESS that Creem is live. Walk guardrail 22 with real Google responses, record evidence per step, then the G-39 tier 1 list. Ask Rashid before changing the call to action.
```
