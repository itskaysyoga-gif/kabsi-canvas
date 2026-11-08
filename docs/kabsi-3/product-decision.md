# Product decision

8 Nov 2026, Rashid Abou Hamzy. Copied from the Product decision tab of the KABSI 3.0 design doc. Costs, price tests, the segment scores, the market evidence and the legal and provider questions are left out because this repository is public. `build-decisions.md` is later and wins where the two differ. The decision is recorded as master plan 30.43.

## The decision

Kabsi stays a WhatsApp-first assistant for all local businesses. The first commercial focus is independent hair, barber and beauty businesses, and the first engineering slice is built to work across industries from day one.

| Question | Decision |
|---|---|
| 1. Best initial industries | Independent hair salons, barbers, beauty salons and non-medical spas, in the UAE and UK. Trades and garages are next, and take over if salons will not pay. Dental stays on Google care only |
| 2. Shared data | A small core: customers, one requests table with three kinds, one activity timeline. Modules are added only when an industry needs them |
| 3. Universal assistant | Same tools for every business: capture, find, list what is open, update, correct, summarize. Packs supply only the words and fields |
| 4. First slice | A typed request book on one real phone, across a fictional salon, gym and garage |
| 5. Reuse | Almost all of the engineering: typed tools, grounding, approvals, isolation, audit, privacy, low-message design, early testing |
| 6. Postpone | Vehicles, quotes, forwards, voice, enquiry page, status page, calendars, customer-facing AI, and every clinic record |
| 7. Safe to authorize next | Four dark pull requests with no WhatsApp wiring and no customer data, detailed in section 6. PR A and PR B are built and merged. PR C is now two sessions, RB-C1 and RB-C2 (see `build-plan.md`) |

The largest uncertainty is whether owners will enter requests at all. Kabsi cannot see their customer chats, so anyone already using a booking system would be typing the same thing twice. The slice and a first pilot exist to test exactly that.

Garage Pack's engineering stands. Its garage-first framing and the plan to validate at Abou Hamze Auto Center are withdrawn. Round 2's garage-first ranking is not carried forward: it rested on judgement weights with no owner data.


## 1. Which industries first

Direction approved by Rashid on 8 Nov 2026 at 19:29: industry-neutral and WhatsApp-first. Independent hair, barber and beauty businesses and non-medical spas, in the UAE and UK, are the first commercial focus. They are not the exclusive market.

The top segments were too close for any scoring to decide, and the choice is a judgement: no owner in any segment has been interviewed. The first real pilot tests it (see `build-decisions.md`).

### Why hair and beauty first

- **It needs the least new product.** Google care already fits, and Kabsi already has its industry pages, salon guides and the first-customer focus.
- **It is the most frequent user.** Daily appointments and messages suit a daily assistant.
- **WhatsApp fits best in the UAE.** That is where the owner's habit and the customer's habit are both strongest.
- **Regulation is lightest.** Non-medical treatments only, and aesthetic medicine is excluded.

**The target is narrow:** independents without a full booking platform. A salon already on a full booking platform has a diary and reminders, so it mainly needs Kabsi's Google work.

### The weakness, and the gate

Hair and beauty may not pay enough for the assistant. **Gate:** the pilot scorecard in `build-decisions.md`. If it is weak on willingness to pay, commercial focus can move to trades and garages without a redesign.

### By segment

| Segment | Decision |
|---|---|
| Hair salons, barbers, beauty, non-medical spas | First focus |
| Trades, garages | Next, or the fallback if the gate fails |
| Gyms and studios | Used in the slice to test enquiries. Not a launch focus |
| Makeup artists | Served through Google care if they sign up. Instagram matters more than Google for most |
| Dental and other clinics | Google care only, under Kabsi's existing rules. No patient or appointment records until the clinic gate in section 3 is passed |

All other local businesses can still sign up for Google care, as they can today.

## 2. Shared data architecture

Use a small core built around one requests table with three kinds. It handles a salon, a gym and a garage in plain terms, and any later module is a new table.

| Option | Fits three industries | Complexity | Verdict |
|---|---|---|---|
| Generic work order for everything | Poorly. A gym trial is not a work order, and a haircut has no stages | Low | Rejected: awkward, and it would need a rewrite |
| Full modular: enquiries, activities, appointments, service requests, tasks, outcomes, each with a table | Well | High: seven tables, and every "what's open" joins them all | Rejected as premature |
| **Small core with kinds and optional modules** | Well | Low | **Recommended** |

### The core

| Table | Holds |
|---|---|
| `location_packs` | Which pack and version, test or live, real data allowed |
| `customers`, `customer_identifiers` | A person and any number of phones or emails. Not unique |
| `customer_requests` | One thing a customer wants: kind, status, outcome, summary, time, confirmation, next step and when |
| `request_activities`, `request_activity_values` | The timeline of what happened, with personal values kept apart so they can be erased |
| `request_intakes` | The AI's proposal, with evidence, before anyone saves it |
| `tool_executions` | Idempotency and cost |

That is eight tables, down from ten in the Revised plan. The names `tasks` and `contacts` are already used in production, so follow-ups are columns on the request.

### Three kinds, in code

| Kind | Open statuses | How it closes | Used by |
|---|---|---|---|
| `enquiry` | `new`, `contacted` | `converted`, `lost`, `voided` | Gym trial, price question, any first contact |
| `appointment` | `requested` | `attended`, `no_show`, `cancelled`, `voided` | Salon, barber, spa, clinic admin |
| `job` | `waiting`, `active`, `ready` | `completed`, `cancelled`, `no_show`, `voided` | Garage, trades |

Changed by `build-decisions.md`, which wins where it differs: conversion keeps the enquiry and links a new appointment, and appointment confirmation is two separate facts (staff-confirmed and customer-confirmed), not a status. The rules on natural commands and skipped steps in `engineering-reference.md` carry over.

### Same record, three industries

| Field | Salon | Gym | Garage |
|---|---|---|---|
| Kind | `appointment` | `enquiry` | `job` |
| Owner reads | Sarah, highlights, Thu afternoon, not confirmed | Maya, asked about a trial, not contacted | Ali's car, in the shop |
| Summary | Highlights | Trial | Corolla brakes |
| Extra module later | Repeat bookings | Memberships | Vehicles, quotes |

The test of the design is whether a new trade is only a new pack file. A module earns a table only when a pack needs facts the core cannot hold, such as vehicle history or memberships.

## 3. The universal WhatsApp assistant

Every business uses the same six tools: capture, find, list what is open, update, correct and summarize. None of the five examples works today. Today's assistant handles Google work only, and it has no customer records, calendar or customer-facing AI.

| Owner says | Handled as | Works now | Needs | Stays with staff |
|---|---|---|---|---|
| Salon: "Book Sarah for highlights Thursday afternoon." | Capture, kind `appointment`. Kabsi shows a proposal to save | Nothing | Core and salon pack | Choosing the exact time, entering it in any booking system, and telling Sarah |
| Spa: "What appointments are still unconfirmed?" | List what is open, status `requested` | Nothing | Core and spa pack | Contacting clients. The answer covers only what was entered in Kabsi, and it says so |
| Gym: "Who asked about a trial this week?" | List, kind `enquiry`, topic trial | Nothing | Core and gym pack | Replying and arranging the trial |
| Dental receptionist: "Show today's administrative appointment requests." | Would be a list, admin fields only | Nothing | Blocked by the clinic gate below | Everything clinical, the practice system, and every contact with patients |
| Garage: "Ali's car is ready." | Update, kind `job`, status `ready` | Nothing | Core and garage pack. Vehicle history needs a later module | Telling Ali. Kabsi can only open the owner's own WhatsApp with a ready message |

### What stays true everywhere

- Kabsi records what the owner tells it. It is not a diary and checks no availability.
- A saved appointment is a note in Kabsi. It changes nothing in any booking system.
- Kabsi never messages a business's customers.
- Anything AI reads is shown for the owner to save first, and code writes every fact in a reply.
- A reply says when an answer covers only what was entered in Kabsi.

### The clinic gate

Clinics get no records until all of these are true: the legal position in the UK and UAE is confirmed in writing, Meta's restriction on health information is resolved for this use, and any UAE storage requirement is met. If it is ever opened, only name, callback number and time would be held, with no reason for visit.

## 4. Public positioning

Nothing on kabsi.co changes now. The homepage stays industry-neutral and the existing line stands: "Your business on Google. Taken care of through WhatsApp."

- No garage design or garage language on the public site.
- Salon focus lives in ads and the existing industry pages, never on the homepage.
- Public claims stay limited to what has shipped, which is the Google work.
- The assistant is not advertised, or described as coming, until it is live for real owners and the facts are updated.

## 5. The first cross-industry slice

The smallest useful demonstration is a typed request book on one real phone, used by three fictional businesses: a salon, a gym and a garage. All data is fictional, and each existing Google feature is checked afterwards.

| Owner sends | Expected |
|---|---|
| Salon: Book Sarah for highlights Thursday afternoon | Proposal, one tap saves it, no time invented |
| Salon: what's unconfirmed | Sarah listed, marked as entered in Kabsi only |
| Salon: Sarah confirmed Thursday 3 | Time set, Undo offered |
| Gym: Maya asked about a trial | Enquiry proposal, saved on one tap |
| Gym: who asked about a trial this week | Maya listed |
| Gym: Maya booked a trial Monday 6 | Enquiry becomes an appointment, timeline shows it |
| Garage: Ali Corolla brakes, car's here | Job proposal, saved on one tap |
| Garage: Ali's car is ready | Status Ready, Undo offered |
| Garage: not Corolla, Civic | Before and after shown, Undo offered |
| Any: what's open | Correct list for that business only |
| Switch business | Asks which business, and shows no other business's data |
| Yawmiyati phone: stats, review link | Same as today |

The worker ease test and pass marks from the Revised plan still apply, with a salon worker doing the test.

### Common and specific

| Common to every industry | Specific, from a pack file |
|---|---|
| Customers, requests, timeline, proposals | Which kinds the business uses |
| Six tools, approvals, permissions, audit | Status words the owner reads |
| Phone, date and digit normalizers | Service vocabulary and spellings |
| Evidence checks and display rules | Fields to extract |
| Test mode refusing real phone numbers | Example phrases for the eval set |

### After the slice

The next proof is a real independent salon in the UAE, from a Founding 25 application or an introduction in Dubai, using typed entry for two weeks. It needs the customer data controls in place first.

**Stop gate:** if owners will not enter requests on most working days, the request book stops. Kabsi remains a Google care product.

## 6. Reuse, postpone, authorize

### Reuse from Garage Pack and the Revised plan (`engineering-reference.md`)

| Keep | Change |
|---|---|
| Typed tools, roles, risk and policy | Tool names become universal |
| Source, normalized and inferred layers, evidence checks | Eval cases span three packs |
| One-message journeys and low-message rules | Applied per request |
| Natural commands, no invented events, Undo | Status words come from packs |
| Tenant isolation, audit, idempotency | Unchanged |
| Customer identity, erasure, holds, retention by country, processor controls | Vehicle links move to a later module |
| Switches, test mode, additive migrations, no-drop rollback | Unchanged |
| Word collision rules, Google regression checks | Unchanged |

### Postpone

| Item | Until |
|---|---|
| Vehicles and other assets | A garage or trades pack goes live |
| Quotes | Real owners ask for them |
| Forwards, screenshots, voice | The typed pilot shows where retyping hurts |
| Enquiry page, status page, nudges | After the pilot |
| Calendar or booking integrations | Owners ask, and a provider has a usable API |
| Customer-facing AI, merchant WhatsApp numbers | Meta's position is written down |
| Clinic records | The clinic gate is passed |
| Garage-specific pages, prices or validation sites | Not planned |

### Safe to authorize next

Four pull requests, invisible to everyone. None is connected to WhatsApp, none can hold a real customer's data, and every existing Google feature is left alone.

| PR | Contains | Done when |
|---|---|---|
| A. Core schema | The eight tables, row-level security, generic-terms check | Additive migration applied, 0 rows readable from another location, no new security advisor findings |
| B. Write functions | Create, status, kind change, correct, undo, for all three kinds | Every allowed and refused move tested, retries safe, no personal values in audit rows |
| C. Packs and tools | Salon, gym and garage packs, normalizers, tool registry, policy | Each tool declares schema, roles, risk and cost, and a new pack needs no schema change |
| D. Extraction and eval | Evidence checks, 150 fictional cases across three packs and four language styles | Pass marks met in a hand run under 5 USD. Not reachable from WhatsApp |

Not included: the phone stage, real data, website or price changes. The phone stage still needs a WhatsApp number with no Kabsi role, plus Rashid's approval.

Alongside it, five short conversations with independent salon owners, by introduction only, would test the biggest unknown more cheaply than code: how they track requests today, and whether they would type them anywhere.

This is not legal advice. Clinic rules, retention and processor terms need a lawyer.
