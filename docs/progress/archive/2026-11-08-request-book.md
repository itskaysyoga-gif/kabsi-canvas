# Request book foundations, PR A and PR B (8 Nov 2026)

Product decision and full design: the Build decisions tab of the KABSI 3.0 doc. Dark: nothing calls these tables or functions, no public or WhatsApp behaviour changed, so no facts change.

## What exists

- PR A, 8 service-only tables: `location_packs`, `customers`, `customer_identifiers`, `request_intakes`, `customer_requests`, `request_activities`, `request_activity_values`, `tool_executions`.
- PR B, 6 service-only functions: `request_create`, `request_set_status`, `request_set_confirmation`, `request_correct`, `request_convert_enquiry`, `request_undo`, one workflow for enquiry, appointment and job.
- Off by default: every function returns `disabled` unless `app_settings.request_book` is `on` and the location's pack state is `test`. Production has no such setting and no pack row.
- Real customer identifiers are refused: `real_data_allowed` is forced false, phones and emails must be reserved fictional values, external references must start `fictional-`. Free text cannot be checked by a constraint, so test data stays fictional by rule.

## Independent reviews (fresh agents, diff and rules only)

PR A, 6 confirmed, all fixed: email guard had no left anchor (high); undo and link columns not scoped to one business; deleting a parent could erase a timeline; truncate skipped the guards; cleared values could be rewritten; user columns accept outsiders (handled by the functions, which take only the checked actor).

PR B, 7 confirmed, all fixed: Undo could restore a stale shared customer name; a real number could enter through `external_id`; Undo could leak raw database errors; Undo of a creation left its intake and reference consumed; an erased customer could be written to; one date error class was uncaught; idempotency ignored the actor.

## Design deviations

- An enquiry converts by closing and linking a new request, not by changing kind on one row (Rashid's item 4).
- PR B replaces one PR A index, `customer_requests_external_uniq`, on an empty table, so an Undo frees its reference. No table or column was dropped.
- Decision: the original actor may Undo their own change for 10 minutes, even as staff. Staff still cannot cancel, mark lost or reopen someone else's work.
- `customer_identifiers` added to an existing customer stay after an Undo of the creation, as a fact about that customer.

## Not done, by authorization

PR C and PR D are specified in the doc and not built. No location has a pack row. Nothing is wired to WhatsApp.
