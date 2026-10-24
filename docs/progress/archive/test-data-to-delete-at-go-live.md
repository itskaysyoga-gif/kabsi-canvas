<!-- Moved verbatim from docs/KABSI-PROGRESS.md on 24 Oct 2026 (docs diet, master plan 27.12). The current status page is docs/KABSI-PROGRESS.md. -->

## Test data to delete at go-live (P0.7-04)

- QA Bakery, 9 Oct (P0.2-02 After-merge check): the two `access_change` `emails` rows of 05:43 and 05:44 UTC, the closed `staff_followups` row due 2026-10-20, and the `disconnect_requested` (05:42) row in `ops_events`; the audit events stay with the audit log's own 24-month rule.
- Yawmiyati, 7 Oct (P0.1-13b fix check): the special hours row for 31 Dec 2026 (reason "P0.1-13b after-merge check 2"), listing changes bc13891c (title) and 171638e7 (phone, the repeat alert) and its `shield_alert` email of 20:48, publications d134a107-9208-4dc5-8bca-15b65038200d and 8f3e46c0-a566-452d-a5e1-54a64390ad77.
- Yawmiyati, 7 Oct (P0.1-13b After-merge check): the `gbp_posts` row with owner input "P0.1-13b after-merge check", the special hours row for 25 Dec 2026 (reason "P0.1-13b after-merge check"), publications 2234d0ec-d873-4795-9d06-01c634f3f5c5, 758a9abf-007b-4f5b-b88c-bc4970eb3e86 and 954b559a-8a96-40e6-bd52-986dd5f035c7, and `mock_listings.fields.specialHours` for `locations/mock-9803ee99`.

- Yawmiyati, 7 Oct (P0.1-13a After-merge check): `mock_google_reviews` `mock-00abd2e02b4f47aba490b45ce57152f6` and `mock-b40a1253de894ca7860cd01edf1ff549`, reviews 345df350-a4a2-44b6-9d97-b9ccd0d2701f and 8e115912-b17a-47e0-b3c9-9076b822c737, their drafts, the owner email of 19:54:11 and publications fb0ba68a-80da-4231-9d1a-ac9506e56508 and 9bfe5b48-3fcc-47aa-aa6a-d85e54c3966e.

- Yawmiyati: the P0.1-12a mock review `mock-c48dbe7d352c4542964ed4666238e63e` (mock_google_reviews), its review 66b3474d-e373-4110-9791-742960d0cdd1, draft, email and action tokens (4 Oct).
- Yawmiyati: the email row 1cb757d9-ba6b-4e7e-a023-d5852f3e19f0 (4 Oct, 04a and 04b check) and the email row 84558298-d9f7-4d72-8f19-02b99d59f869 (created 4 Oct by the P0.1-02b After-merge check). The mock review, its draft and its action tokens were already deleted on 4 Oct.

- QA account qa-owner@test.local and "QA Bakery". ("QA Partner", its member, invites and cards are removed earlier by the P0.8-01 removal files 2 and 3.)
- Yawmiyati's three overlapping pro_6m plans, the pending pro_12m and three payments rows from 25 Sep tests; its test photos.
- Nora test chats from 27 Sep (visitor ids starting qa-, chats with contact "Kay").
- "Safa Chicken" (06ee2022-b1bc-40a4-9493-b46e2e055f1c) and the tarikhtube@gmail.com account.
- A gmail.co typo account that never received its code.
- Keep Yawmiyati (internal test only) and the demo workspace.
