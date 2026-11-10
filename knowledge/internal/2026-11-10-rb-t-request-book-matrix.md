# RB-T: the request book scenario matrix (team only, 10 Nov 2026)

Not public: the request book is dark until Gate 3 and Gate 5 (30.43, 30.48, 30.50). Nothing here reaches Nora or the site.

- At a business with the request book on, a question about the account, data, privacy, price, plan, bill, login or Kabsi itself goes to Nora, read by code before the off-topic line and with no router call (`kabsiQuestion` in `request-book/route.ts`). "Is my data safe?" is the test case. A price question that uses the business's own service words stays the business's.
- At a business whose usual kind is an appointment or a job, "X asked about ...", "enquired", "how much" or "price" make the proposal an enquiry (`enquiryKind`).
- "reopen N" puts a closed request back where it was, asked first (owners and managers; the database decides where).
- "cancel N" on an enquiry closes it as lost (asked first).
- "X confirmed ..." on a job or an enquiry says it is not an appointment instead of the off-topic line.
- Dates v2: "tonight at 9" is 21:00; an evening or afternoon word decides a bare hour; "la 5 shakhes" is never an hour; "at 8." is read.
- Extraction v2: an instruction to say or mark something ("2oul enno confirmed") is never noted as the owner's claim.
- The food pack (restaurant, cafe, bakery) is in test only (`packs/test-fixtures/food.v1.ts`); `INDUSTRY_PACKS` in `packs/index.ts` maps the 21 industries to a pack or none; clinics none.
- The matrix: `docs/kabsi-3/scenario-matrix.md`; the phone script for 16 Nov: `docs/kabsi-3/phone-script-2026-11-16.md`.
