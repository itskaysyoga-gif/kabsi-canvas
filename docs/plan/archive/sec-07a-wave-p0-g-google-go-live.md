<!-- Moved verbatim from docs/KABSI-PLAN.md on 24 Oct 2026 (docs diet, master plan 27.12). The index is docs/KABSI-PLAN.md. -->

## 7A. Wave P0.G: Google go-live

Gate A was approved on 5 Oct 2026: Google Cloud project 856347937978, Business Profile APIs, 300 queries per minute. Hussein confirmed on the Google Cloud dashboard (7 Oct) that 856347937978 is the project number of `smiling-chess-505915-b7`, and that the quota reads 300 requests per minute on Account Management, Business Information, Notifications, Place Actions, Q&A and Verifications. The Google My Business API that serves reviews and posts is not yet enabled; enabling it is pending on Rashid (P0.7-01a). The tasks that need Google's access moved here from Wave P0.7 (section 13) and run right after Wave P0.1, ahead of P0.2 to P0.6. Wave P0.1 is finished when P0.1-03 (Vercel), P0.1-V3, P0.1-13a and P0.1-13b are done in PROGRESS.

Goal: real Google responses captured and the mocks corrected, the verification package submitted, Kabsi switched to live Google on Kabsi's own two profiles (Yawmiyati and Abou Hamze Auto Center), and a first real reply published and verified through the pipeline.

Order and what can start now (7 Oct 2026):

| Task | What | Can start now? | Waits for |
|---|---|---|---|
| P0.7-01a | Enable the reviews and posts API, confirm quota | Yes | Nothing (P0.1-11 is done) |
| P0.7-01 | Capture real Google responses (read-only) | Yes, after P0.7-01a | Hussein's confirmation of the profiles to read |
| P0.7-01b | Compare real responses with the mocks and fix the mocks | After P0.7-01 | P0.7-01 |
| P0.7-02 | `business.manage` verification package | Writing the package can start now; submitting waits | P0.1-03 (kabsi.co on Vercel with the privacy page) and P0.2-07 (privacy text with the Limited Use sentence). The planning chat recommends running P0.2-07 straight after P0.1-03 |
| P0.7-04 | The switch to live | No | P0.7-01b, P0.1-13a, P0.1-13b |
| P0.7-05 | Internal live test on Kabsi's own profiles | No | P0.7-04 |

Real customers are not connected in this wave: the call to action stays "Join early access" until P0.7-07. The permanent demo workspace stays on mock (R-17).

Done when (wave): every Google module has a real fixture and the mocks agree with them; the package is submitted (date in PROGRESS); `google_mode()` returns live; one real reply on a Kabsi-owned profile is `verified` in the pipeline; nothing was written to Google outside the pipeline.

### P0.7-01a Enable the reviews and posts API and confirm access

- Decisions: K-34, K-92, K-113, R-27 (Gate A approved).
- Touches: Google Cloud project 856347937978: enable the Business Profile API that serves reviews, local posts and media (the v4 `mybusiness.googleapis.com` service; confirm the exact name against Google's Business Profile "Latest updates" page), next to the account management, business information, notifications, place actions and performance APIs that are already on; confirm "Requests per minute" reads 300 on each; `docs/google/api-access.md` (new) listing which API serves which module (reviews, posts, media, hours, notifications, performance, place actions) with its quota; the module-to-API map in `supabase/functions/_shared/google/` if it names services.
- Depends on: Gate A approved (done 5 Oct), P0.1-11.
- Status 7 Oct: the project number and the 300 requests per minute on Account Management, Business Information, Notifications, Place Actions, Q&A and Verifications are already confirmed by Hussein (recorded in PROGRESS). What remains: enable the Google My Business API (reviews, posts, media), read its quota, and write `docs/google/api-access.md`. Enabling is pending on Hussein.
- Hussein's manual step, only if the session has no Cloud Console access: open Google Cloud Console, project 856347937978, APIs and Services, Library, find the Business Profile API that serves reviews and posts, press Enable; then open Quotas and read the "Requests per minute" line on each Business Profile API; send the number back in the chat. Never share a password or a code.
- Model: Sonnet.
- Done when: each API shows enabled (`gcloud services list --enabled` output or a screenshot path in PROGRESS); the quota reads 300 on each; `docs/google/api-access.md` exists; one read-only call each to reviews, posts and media with `hello@kabsi.co`'s credential returns 200 (status codes only recorded, no data saved).
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo itskaysyoga-gif/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.7-01a, then docs/KABSI-PROGRESS.md. Do only task P0.7-01a. Follow section 2: apply database changes yourself, open the pull request, make sure CI is green, update PROGRESS on the branch, merge the pull request yourself, run the After-merge checks you can, then give Rashid the PR link and a 3-line summary. Stop and ask only before dropping tables or columns or deleting real data.
Read-only. Enable the API through the console if the session can; otherwise give Rashid the manual step above in plain words and wait for the answer. Never ask for or store a Google password, code or token in the chat.
```

### P0.7-01 Capture real Google responses

- Decisions: K-34 (record real responses), K-56, K-116 and K-117 items marked with a dagger, K-82 (chat and social attribute names), K-41 open risk (can a Manager remove itself), K-37 open risk (Pub/Sub for group-held locations), D293 (API side of the group flow).
- Touches: read-only calls with hello@kabsi.co's credential against Yawmiyati and Abou Hamze Auto Center (the Abou Hamze owner agreed on 4 Oct; Rashid confirms that still stands): accounts and invitations (what an invitation exposes, the invited role), location read with every field mask, getGoogleUpdated, reviews list with reply state and moderation fields, media list, performance and search keywords, attributes metadata for the category and country, place action links, verification state; responses saved, with personal data removed, as fixtures in `tests/fixtures/google/live/`; a short findings note `docs/google/live-findings.md` answering each dagger item.
- Depends on: Gate A (done 5 Oct), P0.1-11, P0.7-01a.
- Ask Rashid before: the first live call (confirm the quota reads 300, the businesses to read, and that the Abou Hamze consent still stands).
- Model: Sonnet (R-39; was Opus; read-only Google).
- Done when: each module has at least one real fixture; the findings note answers: does an invitation expose the role, can a Manager remove its own access through the admins API, which attribute names hold the chat and social links, can products be written, does moderation state appear on replies; nothing was written to Google.
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo itskaysyoga-gif/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.7-01, then docs/KABSI-PROGRESS.md. Do only task P0.7-01. Follow section 2: apply database changes yourself, open the pull request, make sure CI is green, update PROGRESS on the branch, merge the pull request yourself, run the After-merge checks you can, then give Rashid the PR link and a 3-line summary. Stop and ask only before dropping tables or columns or deleting real data.
Read-only: no write call of any kind. Ask Rashid to confirm the quota reads 300 and which profiles to read. Strip reviewer names, review text and phone numbers from fixtures before committing.
```

### P0.7-01b Compare real responses with the mocks and fix the mocks

- Decisions: K-34, guardrail on mocks (section 1: mocks modelled on documented responses, then checked against real ones).
- Touches: `supabase/functions/_shared/google/` mock layer, `tests/fixtures/google/live/`, a contract test that runs every live fixture and its mock through the same parsing code, `docs/google/mock-vs-real.md` (every difference: field names, missing fields, enums, error shapes, paging, rate-limit errors, and what changed in the mock).
- Depends on: P0.7-01.
- Model: Sonnet (R-39; was Opus; read-only Google).
- Done when: every module has a test that passes against both the mock and the real fixture; the difference note lists each change; `npm test` is green; no write call to Google was made.
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo itskaysyoga-gif/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.7-01b, then docs/KABSI-PROGRESS.md. Do only task P0.7-01b. Follow section 2: apply database changes yourself, open the pull request, make sure CI is green, update PROGRESS on the branch, merge the pull request yourself, run the After-merge checks you can, then give Rashid the PR link and a 3-line summary. Stop and ask only before dropping tables or columns or deleting real data.
Do not change production parsing to fit a mock: if the real shape differs, fix the mock and the parser together, and say which. Read-only against Google.
```

### P0.7-02 business.manage verification package

- Decisions: K-113.6, K-92, K-99.2.
- Touches: `docs/google/business-manage-verification.md`: the scope justification (the token is used once to invite Kabsi's business group as Manager and is then revoked; no refresh tokens kept; Google data never used for advertising or AI model training), the demo video script showing the address bar with the OAuth client ID, the consent screen and the Manager invitation (recorded by Rashid on the demo flow once P1-18 exists in a test build, or on a staging route), the privacy page link with the Limited Use sentence (live since P0.2-07), and the exact Cloud Console steps to submit. Contact addresses are kabsi.co addresses only, never a personal email.
- Depends on: Gate A (done), P0.1-03 (kabsi.co on Vercel), P0.2-07. Writing the package can start before those; submitting cannot.
- Model: Sonnet (R-39; was Opus; it writes a document).
- Done when: the package file is complete; Hussein submits it (date in PROGRESS); answers from Google are tracked in PROGRESS.
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo itskaysyoga-gif/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.7-02, then docs/KABSI-PROGRESS.md. Do only task P0.7-02. Follow section 2: apply database changes yourself, open the pull request, make sure CI is green, update PROGRESS on the branch, merge the pull request yourself, run the After-merge checks you can, then give Rashid the PR link and a 3-line summary. Stop and ask only before dropping tables or columns or deleting real data.
Read K-92 and K-113 point 6. Write the package and the step list for Rashid; confirm kabsi.co/privacy carries the Limited Use sentence word for word before it is submitted.
```

### P0.7-04 The switch to live

**Changed 21 Oct 2026 (K-127).** QA Partner and its test invite are deleted earlier, in P0.8-01, so they are not on this list.

- Decisions: K-56, D279, A13, R-27.
- Touches: delete mock rows (`mock_listings`, `mock_google_reviews`) and every test account and business listed in PROGRESS "Test data" (QA Bakery and its owner, QA Partner and the test invite, Safa Chicken and tarikhtube@gmail.com, the gmail.co typo account, Nora test chats, Yawmiyati's overlapping test plans and payments, test photos); keep Yawmiyati and the demo workspace; re-read both connected businesses from Google and confirm the baseline with their owners; `GOOGLE_MODE` secret and `app_settings.google_mode` to live. Supabase Pro with point-in-time recovery and the first restore test (K-87) move to P0.7-07: kabsi-prod is on the free plan in Hussein's organisation until the first real customer connects.
- Depends on: P0.7-01b, P0.1-13a, P0.1-13b.
- Ask Rashid before: the deletions (show the exact list and row counts; this is the stop for deleting real data).
- Model: Opus.
- Done when: the deletion counts match the shown list; no mock row remains; `google_mode()` returns live; the permanent demo login still works on mock (R-17); no customer other than the two Kabsi-owned profiles is connected.
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo itskaysyoga-gif/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.7-04, then docs/KABSI-PROGRESS.md. Do only task P0.7-04. Follow section 2: apply database changes yourself, open the pull request, make sure CI is green, update PROGRESS on the branch, merge the pull request yourself, run the After-merge checks you can, then give Rashid the PR link and a 3-line summary. Stop and ask only before dropping tables or columns or deleting real data.
Read K-56 and K-87. Build the deletion list with row counts and show it to Rashid; delete nothing until the answer is yes. Then flip to live and run the checks.
```

### P0.7-05 Internal live test on Kabsi's own profiles

- Decisions: K-85, K-99.6, K-67, K-66, K-41 (self-removal), K-117 (search terms in the report).
- Touches: what exists after Wave P0.1, on Yawmiyati (internal only, never in public material) and, with the owner's consent, Abou Hamze Auto Center: sync of reviews, listing, media and performance; one real review drafted and one real reply approved by Rashid in the app, published and `verified` through the pipeline (P0.1-13a), with undo checked; one test post, photo or hours change through the pipeline (P0.1-13b) on Yawmiyati; the Google update flow read (getGoogleUpdated) and shown, not acted on. The items that need later waves (backlog on day one, voice rules from past replies, Business Knowledge baseline, the recognised Google name update, disconnect and reconnect) move to P0.7-05b.
- Depends on: P0.7-04.
- Model: Opus (live Google).
- Done when: each item above has evidence (a response, a row, a screenshot path); a real reply is live on Google with `verified` in the pipeline; the audit log shows who approved it.
- Prompt:

```
You are a Kabsi build chat. Work in the GitHub repo itskaysyoga-gif/kabsi-canvas. Read docs/KABSI-PLAN.md sections 1 and 2 and the section for task P0.7-05, then docs/KABSI-PROGRESS.md. Do only task P0.7-05. Follow section 2: apply database changes yourself, open the pull request, make sure CI is green, update PROGRESS on the branch, merge the pull request yourself, run the After-merge checks you can, then give Rashid the PR link and a 3-line summary. Stop and ask only before dropping tables or columns or deleting real data.
Read K-67, K-85 and K-117. Every write to Google needs Hussein's own approval in the app, as for any owner. Write only to Yawmiyati unless the other owner has consented to a named write.
```
