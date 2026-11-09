# Build decisions

8 Nov 2026, Rashid Abou Hamzy. Copied from the Build decisions tab of the KABSI 3.0 design doc. It is the final design for PR A and PR B, written before any code, and it applies Rashid's eight adjustments. It is later than `product-decision.md` and wins where the two differ. The decision is recorded as master plan 30.43. PR A and PR B are built and merged (PRs 504 and 505); their record is `docs/progress/archive/2026-11-08-request-book.md`.

The success test stays the same: a busy owner finds Kabsi genuinely easier than their current way of working.

## The eight adjustments

| Adjustment | How it is built |
|---|---|
| Reduce work, do not duplicate it | Manual entry is only the first way in. Every way in, now or later, produces the same proposal record. The shared request has `entry_method`, external references and an intake link, so a forward, form or booking system can feed it without a redesign |
| Attribution, ownership, due dates, external references | Six columns on the request: `entry_method`, `origin_channel`, `follow_up_user_id`, `next_action`, `next_action_due_at`, and the `external_system` and `external_id` pair |
| Requested, staff-confirmed, customer-confirmed | Two independent facts with who and when. No column exists that could claim availability was checked or a booking was made elsewhere |
| Preserve enquiry history | Conversion closes the enquiry as `converted` and creates a linked appointment. The enquiry row and its timeline are unchanged. Nothing is added in between |
| One workflow | One table, one set of functions. Kinds are data. Packs in PR C supply only words and fields |
| Real owner number, fictional customers | The test owner is Rashid's own phone, joined to the three test businesses through his existing verified user (R-141). Customer records are fictional and are never contacted. The 555-01xx range is only a guard against real numbers entering |
| Scorecard, not a 3-of-10 gate | Below, and the Product decision now points here |
| Salons and beauty first | The first real pilot is an independent salon or beauty business. Gym and garage packs validate the architecture and are not market positioning |

One change from the Product decision: an enquiry no longer changes kind on the same row. Two linked rows keep the original enquiry intact and allow its history to be read as it happened.

## PR A: core schema

Eight new tables, all additive and all empty. RLS is on with no policies, and `anon` and `authenticated` have no grants, which is the repo's service-only pattern. `service_role` can read but not write, so only the PR B functions can change anything.

| Table | Holds | Key rules |
|---|---|---|
| `location_packs` | Pack, version, state, numbering | State is only `off` or `test`. `real_data_allowed` has a check that forces false |
| `customers` | Display name, name key, last seen, erased at | Scoped to one location |
| `customer_identifiers` | Phone or email | Not unique. A trigger refuses anything outside reserved fictional ranges |
| `request_intakes` | Raw text, evidence, state, provider message id | Expires by default after 30 days |
| `customer_requests` | The request | Below |
| `request_activities` | Timeline, no personal values | Append only |
| `request_activity_values` | Before and after values | Can only be cleared |
| `tool_executions` | Idempotency and cost | One result per key per location |

Composite foreign keys carry `location_id`, so a row can never point at another business's row, at the database level.

### One workflow, three kinds

| Kind | Open status | Closes as |
|---|---|---|
| `enquiry` | `new`, `contacted` | `converted`, `lost`, `voided` |
| `appointment` | `requested` | `attended`, `no_show`, `cancelled`, `voided` |
| `job` | `waiting`, `active`, `ready` | `completed`, `cancelled`, `no_show`, `voided` |

`staff_confirmed_at` and `customer_confirmed_at` are set independently, in either order, each recording who entered it. Customer confirmation always means staff recorded what the customer told them. Confirming needs a set time. If the time changes, both confirmations clear, with a flag on the timeline.

## PR B: write functions

Six service-only functions, each one transaction: `request_create`, `request_set_status`, `request_set_confirmation`, `request_correct`, `request_convert_enquiry`, `request_undo`.

- All are disabled unless `app_settings.request_book` is `on` and the location's pack is in `test`. Production has no such setting, so every call returns `disabled`.
- The actor must be a member of that location. Staff cannot cancel, mark lost, reopen or correct core fields.
- A refused call writes nothing and returns a reason.
- A skipped step returns `needs_confirmation`, and only an explicit acknowledgement proceeds, with a flag recording what was never stated.
- A repeated idempotency key returns the first result. Reusing a key with different input is refused.
- A stale row version is refused.
- Undo works for 10 minutes on the latest effective activity, by a compensating activity. Undo of an undo is refused.
- Unknown input fields are refused, so nothing can set a confirmation at creation.

## Acceptance tests

All run as pgTAP in the database job in CI, on the real migration chain.

### PR A

| ID | Test |
|---|---|
| A1 | All eight tables exist with RLS on |
| A2 | `anon` and `authenticated` cannot select from any of them |
| A3 | `service_role` can select but cannot insert, update or delete |
| A4 | A real-looking phone or email is refused. A reserved fictional one is accepted |
| A5 | `real_data_allowed` cannot be true, and state cannot be `on` |
| A6 | A row cannot reference another location's customer, request or intake |
| A7 | Activities cannot be updated or deleted while their request exists. Values can only be cleared |
| A8 | Status, outcome and confirmation constraints refuse invalid combinations for each kind |
| A9 | Deleting a location removes all its rows and does not fail, so the existing deletion job keeps working |
| A10 | No column uses trade-specific words |
| A11 | Follow-up owner must be a member of the location |

### PR B

| ID | Test |
|---|---|
| B1 | With the switch off, every function returns `disabled` and writes nothing |
| B2 | A non-member and another location's member are refused for every function |
| B3 | Functions cannot be run by `anon` or `authenticated` |
| B4 | Every allowed move works for all three kinds |
| B5 | Every refused move returns a reason and writes nothing |
| B6 | A skipped step needs acknowledgement, records its flag and invents no event |
| B7 | Retry with one key returns the first result with one row. A changed input is refused |
| B8 | Stale row version is refused |
| B9 | Requested, staff-confirmed and customer-confirmed are independent, in either order |
| B10 | Creation cannot set a confirmation. Confirming without a time is refused. A time change clears both, and Undo restores them |
| B11 | Conversion keeps the enquiry and its timeline, adds no `contacted` event and no confirmation |
| B12 | Undo inside the window restores state. After the window, or of an undo, or of a non-latest activity, it is refused |
| B13 | Undo of a conversion restores the enquiry and voids the appointment |
| B14 | Staff limits hold |
| B15 | Audit rows and tool results hold no personal values |
| B16 | A fictional-range violation during creation leaves no customer or request |
| B17 | Function bodies use no trade-specific words |

## Security review

Before each PR merges, a fresh agent reviews only the diff and these rules, without the author's reasoning. Confirmed findings are fixed and listed in the report.

| Review area | Must hold |
|---|---|
| Tenant isolation | No path reads or writes across locations |
| Privilege | Definer functions set an empty `search_path`, use qualified names, and are revoked from public, `anon` and `authenticated` |
| Real data | No path allows a real phone or email, or sets `real_data_allowed` |
| Injection | No dynamic SQL built from input |
| Personal data | None in audit rows, tool results, activities or error text |
| Existing features | No existing table, function, trigger, route or Google path changes |
| Honesty | No field or function can claim an external booking or availability check |

## Pilot scorecard

The first real pilot is an independent salon or beauty business. After 30 days the whole card is read together, and the outcome is continue, change focus or stop. No single number decides it.

| Measure | How it is measured | Strong signal | Weak signal |
|---|---|---|---|
| Actual usage | Requests entered, by working day | Most working days | A burst, then nothing |
| Repeated use | Weeks with lookups and updates, not only entries | Every week | Entries never reopened |
| Administrative time saved | Timed before and after, on the same tasks, plus the owner's own estimate | Clearly faster than today | Same or slower |
| Support effort | Minutes spent per business | Falling, under 1 hour a month | Rising or constant hand-holding |
| Existing software | What they use, and overlap with Kabsi | Fills a real gap | Duplicates their diary |
| Willingness to pay | The price named, and what they say and do | They pay, or commit a date | Polite interest only |
| Reasons for rejection | Recorded in their words | A fixable pattern | Does not need it |

First session (R-140): RB-K adds a 10-minute first session in which the owner enters one practice request with a fictional name, finds it, corrects it and undoes the correction, then it is voided. The scorecard counts only requests created after that session ends.

Ease test (R-141): the salon worker ease test is part of the pilot owner's first session in RB-K, with RB-F's pass marks. A miss is fixed before day 1 of the scorecard.

## PR C and PR D, prepared for review only

Neither will be built or merged without Rashid's separate authorization. PR C is now two sessions: RB-C1 first (the read, proposal and name search functions that PR B does not have), then RB-C2 (the packs, normalizers, tools and reply rules below). See `build-plan.md`.

### PR C: packs and tools

- Salon, gym and garage packs as small data files: words, service vocabulary, which kinds are used, fields, example phrases. No workflow code.
- Normalizers for phone, digits, dates, and pack vocabulary.
- Tool registry and policy: schema, roles, risk, approval, idempotency and cost for each tool.
- Reply rules: never say booked, available or confirmed unless the record holds that fact, and say when an answer covers only what was entered in Kabsi.
- An intake adapter interface, with typed entry as the first adapter.
- Done when: every tool declares its contract, a fourth pack needs no schema or workflow change, and the reply rules are tested.

### PR D: extraction and eval

- Source, normalized and inferred layers with evidence checks.
- 150 fictional cases across three packs and English, Arabic, written-out Arabic and mixed messages, including vague times, confirmations that were never stated, and owners stating a booking that Kabsi cannot verify.
- A hand run under 5 USD. Not reachable from WhatsApp.
- Done when: the pass marks in `engineering-reference.md` (section 4) are met and no output implies a confirmation that was not stated.
