# Kabsi consolidated decision register

Version 3, 24 November 2026. Replaces every earlier version and wins over the other documents where they differ.

## 1. Approved decisions

| # | Decision |
| --- | --- |
| A1 | Kabsi is a proactive Google management service. Brand line: "Your business on Google. Taken care of." |
| A2 | Kabsi never communicates with a business's customers on any channel, and its WhatsApp number speaks only to owners and their staff |
| A3 | No automatic customer email: no separate email account, Amazon SES, Gmail sending, notice forwarding or parsing, customer contact storage, imports, appointment-sheet or voice extraction, suppression lists, delivery engine, customer SMS or WhatsApp |
| A4 | No new personal-data collection systems |
| A5 | Existing QR, NFC, review link and ready-message tools stay |
| A6 | Useful Google capabilities stay; costly or off-promise features are switched off with their code kept |
| A7 | Google's retention limits and the owner's approval before publishing stay |
| A8 | Markets: United States and United Kingdom first; other English-speaking businesses eligible |
| A9 | A paid pilot with 3 to 5 real businesses comes before any advertising |
| A10 | AUDIT-1 was authorized read-only and is done (24 November) |
| A11 | WhatsApp is the owner's working interface: owners ask for work and make changes in plain words or by voice, as far as Google, Meta and Kapso allow. Email and web stay complete. Price stays 29 with the private 19 founding offer |
| A13 | FIX-0 approved (24 November). The Kapso connector moves from Alo King to the Kabsi.co project, read-only from the lane R chat; any write needs Rashid's yes. This replaces R-49 |
| A12 | R-49: the Kapso connector is not used for Kabsi. R-151: the founding offer stays private |

## 2. Superseded (no longer in force)

The 39 price and 29 founding price. Automatic review requests and everything built for them. FEAS-1. The questions to Resend and Square. The 1,200 US dollar ad test as the first validation. The United States-only limit on requests.

## 3. Recommendations awaiting approval

| # | Recommendation |
| --- | --- |
| R1 | One plan at 29 US dollars a month; 14-day trial with a card |
| R2 | Private founding offer: 19 for the first 12 months, first 25 businesses |
| R3 | Up to 2 prepared posts a month, only from confirmed facts, each approved with a tap |
| R4 | Placement links and short guides as the review-growth method; no guide recommends selective asking |
| R5 | Visibility map and AI answer checks off; competitors as a live monthly read of totals only |
| R6 | Three build sessions before the pilot: OFFER-2, PROOF-2, GATE-2. AUTO-1 afterwards, shadow mode only |
| R7 | Pilot terms: paid at the founding price from day 1 after the trial, 90 days, one-page agreement |
| R8 | A 400 US dollar ad probe only after the pilot's day 30 gate |
| R9 | Stop rule: fewer than 2 pilot businesses paying at day 90 ends the subscription product |

## 4. Not authorized (each needs its own yes)

FIX-0 and every build session. Production changes. Live billing. New paid services, including Kapso Pro and a paid AI key. Advertising. Any message to a provider. Automatic replies in production. Paid legal work.

## 5. Verified facts

| # | Fact | Source |
| --- | --- | --- |
| V1 | Google requires prior specific and express consent for automated review replies, forbids automatically reverting its changes, and limits stored API content to 30 days | developers.google.com/my-business/content/policies |
| V2 | Google forbids incentives and selective asking for reviews | support.google.com/contributionpolicy/answer/7400114 |
| V3 | Square's own Google review automation goes to regular customers or those who gave positive receipt feedback | Square help article 5660 |
| V4 | Jobber's Reviews tool asks after a visit, a closed job or a paid invoice; Calendly Workflows can email after an event ends | Vendor pages |
| V5 | Kapso Pro: 25 US dollars, 100,000 messages, 3 numbers | kapso.com/pricing |
| V6 | Reply and review tools sell from 10 to 44 US dollars a month; listing care at about 40 | Vendor pages read 24 Nov |
| V7 | The repo holds 209 migrations, about 140 tables and 45 scheduled jobs; PROGRESS states no customer is live | Repo at ef06e4b |
| V8 | In 60 days the site had 346 visitors, 3 finished free checks and no paid event | PostHog project 627817 |
| V9 | The backend has been locked out since 14 November 05:37 UTC: function calls to the database get 401, scheduled calls get 403, 37 jobs wait | Audit report section 1 |
| V10 | The database holds 7 locations (5 demo, 2 the founder's), 3 working Google connections, no subscription | Audit report section 2 |
| V11 | On WhatsApp today an owner can, in production code: approve, edit or dictate a reply, change one day's hours, send a photo or a post, get stats, the review link and a ready review message, and stop messages. Not yet: ask what is waiting, ask for a report, change weekly hours, see Google's figures | Blueprint section 11 |
| V12 | The WhatsApp number is connected, quality green, messaging limited, tier 250; 25 templates approved | Audit report section 4 |

## 6. Untested assumptions

Owners understand the product in one sentence. They connect Google. They approve work most weeks. A quiet business still sees enough to stay. 8 percent monthly churn. Variable cost of about 4.20 a month (3.50 to 9.20). Every ad rate.

## 7. Provider dependencies

| # | Dependency | Blocks |
| --- | --- | --- |
| P1 | Google on the standing consent wording | Automatic replies |
| P2 | Google on keeping derived counts, themes and monthly history | History in the report |
| P3 | Kapso and Meta on the AI provider terms and retention | Relying on WhatsApp at scale |
| P4 | Creem live and a written agreement with the account holder | The first charge |

## 8. Launch blockers

B0 backend locked out since 14 November (FIX-0). B1 WhatsApp number state unknown since 14 November (FIX-0). B2 paid AI key with a cap. B3 live payments on an agreed account. B4 Kapso Pro. B5 launch tests (GATE-2).

## 9. Key numbers (workbook)

| Item | Value |
| --- | --- |
| Variable cost per business per month, normal use | about 4.16 |
| Variable cost at maximum use | about 9.24 |
| Contribution per month at 29 / at 19 | about 24.84 / about 15.43 |
| Launch fixed costs per month | about 139 |
| Break-even at 29 / at 19 | 6 / 10 |
| Lifetime value at list / founding offer, 8 percent churn | about 310 / about 236 |
| Most that can be spent to win a customer at list / founding | about 103 / about 79 |
| Businesses for 5,000 / 10,000 / 20,000 a month | 173 / 345 / 690 |

All except the payment fees are estimates.

## 10. Next actions

1. FIX-0 code is merged (#589) and deployed. Rashid sets KABSI_SECRET_KEY; lane R runs the five proofs.
2. Rashid decides on R1 to R9.
3. On his yes, OFFER-2 is authorized, then PROOF-2, then GATE-2, one at a time. Each now carries its part of the WhatsApp work (blueprint section 11).
4. Pilot businesses are signed once the launch tests pass.
