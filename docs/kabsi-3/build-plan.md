# KABSI 3.0 Build Plan

8 Nov 2026, Rashid Abou Hamzy. Copied from the Plan tab of the KABSI 3.0 Build Plan design doc, without its pricing section, its cost and market numbers, the legal questions and the provider questions, because this repository is public. The decision behind it is master plan 30.43 (R-134 to R-139).

## Where we are

Build the request book in small gated stages, and keep launching the Google product beside it, because only the Google product can earn money in the next few weeks. The next step is one docs session, RB-0, then three dark sessions to finish the foundations.

| Part | State today | Evidence |
|---|---|---|
| Google care (reviews, posts, listing, weekly report) | Built and working on Yawmiyati. No customer is live yet | PROGRESS |
| WhatsApp for owners | On since 5 Nov | Ladder in PROGRESS |
| Card payments | Closed until Creem's live setup (Hussein) | PROGRESS |
| Request book tables, 8 | In production, empty, off | PR 504 |
| Workflow functions, 6 | In production, every call returns disabled | PR 505 |
| Read and proposal functions | Missing. Found while writing this plan | RB-C1 adds them |
| Packs, tools, extraction | Not built | RB-C2, RB-D |
| WhatsApp connection for the request book | Not built | RB-E, RB-F |
| Customer data controls | Not built, so real customer data stays refused | RB-G to RB-J |
| Website | Unchanged, and correct for what has shipped | Section on the website below |

Three things changed while this plan was written.

- **PR C is now two sessions.** PR B only writes. Nothing can yet read a request, create a proposal or fill the name search key, so RB-C1 adds those first.
- **RB-0 comes first.** The design lives in Claude Docs, and build sessions treat the repo as the source of truth. RB-0 copies the engineering parts into the repo. Costs, price tests and lawyer questions stay out, because the repo is public.
- **The website is designed early and released late.** Kabsi may claim only what has shipped, so the redesign goes public at Gate 5.

Every session after RB-0 needs Rashid's go, written on the first line of its prompt. The prompts are kept outside this repository, in the Session prompts tab of the design doc, and lane R writes each one when its evidence exists.

## What we are building

Kabsi stays industry-neutral and WhatsApp-first, and adds a request book: the owner tells Kabsi what a customer wants, and Kabsi remembers it, finds it and updates it. Independent hair salons, barbers, beauty businesses and non-medical spas in the UAE and UK are the first commercial focus, not the only market.

| Tool | Owner says | Kabsi does |
|---|---|---|
| Capture | Book Sarah for highlights Thursday afternoon | Shows a proposal. One tap saves it. No time is invented |
| Find | Sarah | Shows her requests, or asks which one |
| List what is open | What's unconfirmed | Lists it and says it covers only what was entered in Kabsi |
| Update | Sarah confirmed Thursday 3 | Records it and offers Undo |
| Correct | Not highlights, a trim | Shows before and after, and offers Undo |
| Summarize | Request 12 | One reply with the whole state |

The success test is the one Rashid set: a busy owner finds Kabsi genuinely easier than their current way of working.

**What stays true for every business**

- Kabsi records what the owner tells it. It is not a diary and checks no availability.
- A saved appointment is a note in Kabsi. It changes nothing in any booking system.
- Kabsi never messages a business's customers.
- Anything the AI reads is shown for the owner to save first. Code writes every fact in a reply.
- Requested, staff-confirmed and customer-confirmed stay separate facts, and none is ever invented.

**What stays untouched until a gate says otherwise**

- Every Google feature and its approval flow.
- The public website, prices and live WhatsApp routing.
- Real customer data, which the database refuses today.

The largest unknown is whether owners will type requests at all. Kabsi cannot see their customer chats, and anyone on a booking system would be entering things twice. Five short conversations with independent salon owners, from Instagram, sent by hand as research (R-141), test this more cheaply than code, and can start now.

## Build order

The real-phone demo is 7 sessions away and the first real salon is 5 sessions after that, with a hard gate between stages. Sessions are listed in the order to run them. Two sessions can overlap only where the last column says so.

A stage starts only when the gate before it has its evidence. The website track starts after Gate 2 and goes public at Gate 5.

Gate 1 opened on 9 Nov 2026 on RB-D's evaluation (R-140, master plan 30.44 item 2). The test phone is Rashid's own phone through his existing verified user (R-141, master plan 30.45 item 1), needed before RB-E's phone script, not before its code.

| # | Session | What it does | Model | Needs first | Overlap |
|---|---|---|---|---|---|
| 1 | RB-0 | Copies the design into the repo and records the decisions | Sonnet | Nothing | Alone |
| 2 | F-1 | A forwarded Yes stops counting as the owner's Yes | Opus | Rashid's go | With RB-C1 |
| 3 | RB-C1 | Read, proposal and name search functions | Opus | RB-0, Rashid's go | With F-1 |
| 4 | RB-C2 | Packs, normalizers, six tools, reply rules | Sonnet | RB-C1 | With F-1 |
| 5 | RB-D | Extraction, evidence checks, 150-case eval | Sonnet | RB-C2, Rashid's go | Alone |
|  | **Gate 1** |  |  |  |  |
| 6 | RB-E | WhatsApp connection: capture and find, test businesses | Opus | Gate 1 | Alone |
| 7 | RB-F | Update, correct, confirm, convert, Undo, what's open | Opus | RB-E | Alone |
|  | **Gate 2** |  |  |  |  |
| 8 | RB-G | Suggest an existing customer, never merge | Opus | Gate 2 | With W-1 |
| 9 | RB-H | Export, erasure, holds | Opus | RB-G | With W-1 |
| 10 | RB-I | Retention rules and the real-data gate | Opus | RB-H | Alone |
| 11 | RB-J | Privacy, terms, customer notice, facts | Sonnet | RB-I, the legal review's notes | With W-2 |
|  | **Gate 3** |  |  |  |  |
| 12 | RB-K | Pilot kit, the first session (R-140) and the salon worker ease test with RB-F's pass marks (R-141), one real salon switched on | Sonnet | Gate 3 | Alone |
|  | **Gate 4: the 30-day scorecard** |  |  |  |  |
| 13 | W-1 | Website and app design | Opus | Gate 2 | With RB-G, RB-H |
| 14 | W-2 | Copy and facts, held back | Sonnet | W-1 approved | With RB-J |
| 15 | W-3a to W-3c | Website build, switched off | Sonnet | W-2 | One at a time |
| 16 | P-1 | New plan and price, if the scorecard earns it | Opus | Gate 4, Creem live | Alone |
| 17 | W-4 | The public switch | Sonnet | Gate 5 | Alone |
| 18 | A-1 | A Requests page in the signed-in app | Opus | Gate 4 and owners asking | Alone |

Later capabilities each wait for their own evidence, and are listed in the Session prompts tab.

### The gates

| Gate | Opens | Evidence required | If it fails |
|---|---|---|---|
| 1 | The real phone | RB-C1, RB-C2 and RB-D merged. Eval pass marks met. Rashid's own phone as the test owner (R-141). Rashid's go | Fix and rerun. No phone work |
| 2 | Customer data work | Full script passes on the real phone. Yawmiyati unchanged. Meta's pricing data read. Five owner conversations from Instagram are done (R-141, master plan 30.45 item 3). A conversation counts only when the owner keeps requests by hand or in chats with no full booking platform and agrees to try Kabsi on their own phone for two weeks. At least 3 of 5 open the gate | After two rounds of fixes, redesign or stop. If fewer than 2 of 5 qualify and agree, the request book stops after the demo and Kabsi stays Google care |
| 3 | One real business | RB-G to RB-J merged. Legal review. Kapso Pro with a 30-day window. Supabase Pro. Kapso's written answer on the provider terms. Rashid's go for one location | No real data |
| 4 | More building | Pilot scorecard read after 30 days, with a usage check on day 14 | Continue, change focus to trades, or stop. If owners will not enter requests on most working days, the request book stops and Kabsi stays Google care |
| 5 | The public website | Live for real owners. Facts updated. Claims checked. Rashid's go | The site keeps saying only what it says now |
| 6 | A second business and scale | Limits and usage meter. Kapso's answer. A price decision | One business only |

### Google product launch, running beside this

This track is what can earn first, so it does not wait for any gate above.

| Step | Owner | Due |
|---|---|---|
| Monthly AI budget in the Anthropic console, or Nora and the AI answer stop | Rashid | By 17 Nov |
| Creem live verification, payout account, signed agreement | Hussein, Rashid | Now, the main blocker |
| Launch gate session (lane R writes the prompt once Creem is live) | Lane R, then a session | After Creem |
| DataForSEO top-up and Vercel Pro, then the first-ad prompt | Rashid, lane R | Before the first Meta ad |
| Kapso Pro, two-step logins, the rest of 30.19 section 6 | Rashid | Before the first paying business |
| Sentry budget | Rashid | By 30 Nov |

The full list is the project doc `claude/kabsi-whats-left-2026-11-07.md`.

## Database plan

The database does not need a redesign. The eight tables and six functions already hold all three kinds of request, and every later step is a new additive migration. Existing Google tables stay as they are.

### What each session adds

| Session | Adds | Why |
|---|---|---|
| RB-C1 | `request_get`, `request_find`, `request_list_open`, `customer_suggest` | Nothing can read a request through the gate yet |
| RB-C1 | `request_intake_propose`, `request_intake_revise`, `request_intake_discard` | `request_create` consumes a proposal, but nothing creates one |
| RB-C1 | A trigger that fills `customers.name_key` | PR B leaves it blank, so name search would find nothing |
| RB-E | Three fictional businesses, one setting, three pack rows | Only with Rashid's go at Gate 1 |
| RB-H | `data_holds`, `erasure_requests`, `erasure_ledger`, export and erasure functions | Owner-instructed deletion that survives a backup restore |
| RB-I | `retention_rules`, the sweep job, `state` gains `live`, the real-data rule | The only way real data can ever be allowed |
| LM | `request_usage` or a view over `tool_executions` | Limits and usage per business, before a second business |

### How real data gets allowed

Today four separate locks refuse it. RB-I replaces them with one rule, and sets nothing to true.

| Lock today | After RB-I |
|---|---|
| `real_data_allowed` has a check forcing false | True only when the location is `live` and an approved retention rule exists for its country |
| `location_packs.state` allows only off and test | Adds `live`, set by hand for one location at Gate 3 |
| `customer_identifiers_guard` takes only fictional values | Takes real values only when `real_data_allowed` is true |
| `rb_gate` needs `test`, `rb_external_ok` needs `fictional-` | Accept `live` only with an approved rule. Test locations keep today's limits |

### Decided, with the reason

- **No merging of customers before the pilot.** A phone or name only suggests a match, and the lookup shows every match. A two-week pilot with one salon does not need merges, and merges make erasure much harder. It returns as a later card if duplicates appear in real use.
- **Vehicles and other assets wait** until a garage or trades pack goes live.
- **Follow-ups stay columns on the request.** The names `tasks` and `contacts` are already used in production.

### Rules every migration keeps

- Additive first. A drop is never a rollback once data exists. Switches are the rollback.
- Service-only tables: RLS on, no policies, no browser grants. Definer functions use an empty `search_path`.
- Applied once by the session with `apply_migration`, read back with a select, then the file renamed to the applied version.
- A statement the connector treats as destructive may ask for approval. If it is cancelled or times out, the session stops and reports. It does not retry.
- Independent review by a fresh agent for every migration.

## WhatsApp and AI plan

The request book joins the existing agent through one switch, after the steps that use no AI, and an owner whose business is off gets exactly today's behaviour. Who is acting and for which business always comes from the verified sender, never from what the message says.

### The rules that protect what already works

- `whatsapp_resolve` is not changed. The switch is read separately.
- With the switch off, the model's instructions are byte-identical, proved by a snapshot test, and the whole existing WhatsApp suite passes unchanged.
- Yawmiyati's stats and review link are checked on the real phone after each phone session.
- The test number has no other Kabsi role, because a second business on Rashid's phone would make Yawmiyati's flows ask which business. For the RB-E and RB-F demo only, R-141 (master plan 30.45 item 1) replaces this: the test owner is Rashid's own phone through his existing verified user, and after Gate 2 the test businesses go to state off and those memberships are removed.

### Words that already mean something

At a business with the request book on, a word means a request only when it comes with a request reference.

| Word | Today | Rule |
|---|---|---|
| stop, end, quit | Opts out | Always wins, as Meta requires |
| yes, ok, confirm | Approves the last task | Saves a request only when a proposal is waiting |
| closed, closing | Starts an hours change | "closed 42" is a request. "closed" alone stays hours |
| post | Starts a Google post | Unchanged unless a request reference follows |
| cancel | Billing | "cancel 42" is a request. "cancel" alone stays billing |
| 42 alone | Free text | Means request 42 at a business with the book on |
| waiting, today, status | Staff tools | Unchanged |

### How the AI is used

| Step | Done by |
|---|---|
| Status words and request numbers | Code, no model, instant |
| Find the words for each field and quote them | The model, in a fixed schema, on the small check model (`MODELS.check`) |
| Confirm each quote is really in the message | Code |
| Phones, digits, dates, service words | Code, versioned |
| Decide what the owner sees and whether to ask | Code |
| Write facts in a reply | Code, from the record |

An inferred value is shown as a guess and saved only after Save. Missing values are left out, never filled in.

### Message rules

- One reply does the work of several, and carries the next useful button.
- At most one question per reply. Kabsi never interviews.
- "On it" appears after 2.5 seconds today. For request tools it waits 10 seconds, because it is a billable message.
- A long list is plain text: 15 rows, then how many more.

RB-F reads Meta's pricing data on delivered messages to check how each delivered reply is charged.

The provider and Meta questions that gate real data and scale are tracked outside this repository. Gate 3 and Gate 6 below name the evidence needed.

## Website and app redesign

Design the new site once the phone demo works, build it switched off during the pilot, and make it public only at Gate 5. Kabsi's claims rule allows only what has shipped, and Rashid decided the assistant is not advertised or described as coming until real owners use it.

The existing design system stays: Design 9, the light-led tokens, one yellow button per screen, and phone first at 390 px. This is a change of story and pages, not a new look, so it stays cheap and keeps the speed budgets.

### Page by page

| Page | Until Gate 5 | At Gate 5 |
|---|---|---|
| Home | Unchanged | Industry-neutral. Leads with one assistant that does two jobs: looks after Google and keeps track of what customers ask for |
| How it works | Unchanged | Adds a request book case beside hours, photo post and review |
| Pricing | Unchanged | Only what P-1 decides |
| `/for` pages | Unchanged | Hair, barber, beauty and spa pages carry the salon examples. Salon focus never reaches Home |
| FAQ, About | Unchanged | New answers: what it records, what it does not, and that Kabsi never messages customers |
| Security, Privacy, Terms | Change at Gate 3 through RB-J, because real data needs them | Reviewed wording stays |
| Founding, Partners | Unchanged | Reworded only if the offer changes |
| Free check, guides, free tools | Unchanged | Unchanged |
| Nora, `llms` files, facts | Unchanged | Updated in the same switch as the site |
| Signed-in app | Unchanged | A-1 adds a Requests page, only if owners ask for one |

### Direction for the hero

Keep today's line until the pilot ends: "Your business on Google. Taken care of through WhatsApp." A working draft for Gate 5 is "The assistant for your business, on WhatsApp", with the lead "Kabsi looks after your Google profile and keeps track of what your customers ask for. You approve from WhatsApp." The final words should come from what pilot owners actually say.

### Rules for every screen

- Real product only. The phone screens come from the test phone and are marked Example.
- No garage language in public. No Google logo or partnership impression. No ranking or customer promises.
- Never say Kabsi books, confirms or checks availability.
- No Arabic shown anywhere public, Facebook and Instagram through `SOCIAL_LINKS`, no em dashes, en dashes or exclamation marks.

### How it ships

1. W-1 designs Home, How it works, Pricing, the hair salon page and the Requests page in `kabsi-design-studio`. Lane R reviews.
2. W-2 writes the lines into `docs/kabsi-3/copy-v3.md`, not into the live facts.
3. W-3a to W-3c build behind one constant that stays false, in small pull requests with the speed gate green.
4. W-4 flips the constant, updates `docs/COPY.md` and the facts, and runs the live checks in one pull request.

## Privacy decisions that change earlier ones

No price or plan changes are made by this plan. A new plan or price is decided only at Gate 4 by P-1, from what pilot owners do.

| Earlier decision | Change | Why |
|---|---|---|
| Kapso retention at 12 months (R-102, master plan 30.22 item 7) | A 30-day window before the first real customer record enters | Customer details sit in the owner's chat, and the window is the only way to delete them at Kapso |
| Supabase stays on Free until 10 paying businesses (R-105, master plan 30.25 item 1) | Move to Pro before the first real customer record | Free lists no backups, and erasure must survive a restore |

Both changes apply to that case only. The earlier decisions stand for everything else. Clinics get no records at all until the legal position, Meta's health data rule and any UAE storage rule are all cleared. Wording for privacy, terms and the customer notice is written in RB-J after review.

## Session prompts

Every prompt is in the Session prompts tab, ready to paste into a claude.ai/code session on the model it names. Sessions through RB-K and W-4 have full prompts. Later capabilities are short cards, because lane R writes each prompt only when its evidence exists.

## What Rashid needs to do

Only the items below need Rashid. Everything else runs inside the sessions.

| When | What | Exact step |
|---|---|---|
| Now | Run RB-0 | Open a claude.ai/code session on `kabsi-canvas`, choose Sonnet, paste the RB-0 prompt |
| Now | Say go for F-1, RB-C1, RB-C2 and RB-D | Write GO on the first line of each prompt |
| Now | Start the five owner conversations (R-141) | From Instagram, by hand, as research, and never from any WhatsApp number. Ask how they track requests today and whether they would try Kabsi on their own phone for two weeks |
| By 17 Nov | Set the monthly AI budget | Anthropic console. RB-D's hand run under 5 USD should finish before the credit ends |
| Before Gate 1 | Rashid's own phone, the owner of Yawmiyati, joined to the three test businesses through his existing verified user (R-141) | Bind it through the test businesses in RB-E. No number in code. Never paste the number into a report |
| At Gate 2 | Run the phone script | Script comes from RB-F's report. The ease test with a salon worker moves to RB-K's first session (R-141) |
| Before Gate 3 | Legal review, Kapso Pro with a 30-day window, Supabase Pro | The review's notes go into the RB-J prompt |
| Gate 3 | One real salon, from a Founding 25 application or an introduction | Rashid's go for one location |
| Day 14 and day 30 of the pilot | Read the scorecard with lane R | Lane R decides continue, change focus or stop |

Paste each session report back into the lane R chat. Lane R checks it, and any change to the next prompt comes from there.

## Not building, and what could stop the plan

These stay out until real use earns them: vehicles, quotes, forwards, screenshots, voice notes, status pages, an enquiry page, calendar or booking integrations, customer-facing AI, merchant WhatsApp numbers and clinic records.

| Risk | What could happen | Control |
|---|---|---|
| Owners will not type | The slice works and nobody uses it | Five conversations now. Day 14 check. Gate 4 stop rule |
| Live agent regression | A Google flow breaks | One switch, the snapshot test, the full WhatsApp suite, the Yawmiyati check |
| No staging system | Dark code runs in production | Fictional businesses, a separate phone, real data refused by the database |
| A service caller names the wrong person | The database cannot prove who is behind a call | RB-E takes actor and location from the verified sender, as an acceptance test |

## Later capabilities

Lane R writes each prompt when its evidence exists, because what the pilot finds changes the details.

| ID | Capability | Model | Unlocked by | Main risk |
| --- | --- | --- | --- | --- |
| P-1 | New plan or price | Opus | Gate 4, Creem live | Willingness to pay in hair and beauty |
| LM | Limits and cost meter per business | Sonnet | Before a second business | None significant |
| A-1 | Requests page in the signed-in app | Opus | Pilot owners ask for it, or lists outgrow 15 rows | Access rules |
| FW | Forwards, screenshots, contact cards | Opus | Owners keep retyping customer messages. Forwarded-text eval passes. F-1 merged | Third-party customer data |
| VN | Voice notes | Opus | Owners ask. Proved deletion at the provider. 20-note test | Voice is personal data |
| DU | Duplicate warnings and merging | Opus | Duplicates seen in real use | False warnings, harder erasure |
| ML | Morning list and nudges | Sonnet | Owners ask what is open at least weekly | More billable messages |
| QT | Quotes | Opus | Owners track prices elsewhere and miss them | Money figures |
| RV | Review message after a closed request | Opus | Offered after every outcome, never only happy customers, tested | Google's review rules |
| EP | Enquiry page | Opus | Google accepts the link on one real profile. Templates approved | Public form, consent |
| SP | Status page and the owner's tap | Opus | Customers actually call to ask | Public token page |
| PK | Next pack live: trades or garages | Sonnet | Gate 4 moves the focus, or Gate 6 opens | New vocabulary |
| AS | Vehicles and other assets | Opus | A garage or trades pack goes live | New tables |
| CA | Calendar or booking integrations | Opus | Owners ask and a provider has a usable API | Double entry, external claims |
