# Kabsi master product blueprint

Version 3.1, 24 November 2026. Replaces every earlier version. Labels: [A] approved, [R] recommended and awaiting approval, [V] verified, [U] untested.

## 1. Product definition

**Kabsi. Your business on Google. Taken care of.** Your Google business profile, managed for you. Approve work and make changes straight from WhatsApp or email. Kabsi answers every review, protects the listing and its links, keeps the profile fresh, and proves the work every month. It works only through the Google Business Profile the owner shares with it, and it speaks only to the owner and the owner's staff.

- [A] Kabsi never communicates with a business's customers, on any channel.
- [A] Kabsi stores no customer contact details.
- [A] WhatsApp is the owner's working interface, not only a notice channel: the owner can ask for work and make changes in plain words (section 11). Email and the web stay complete alternatives.
- [R] One plan: 29 US dollars a month per location, 14-day trial with a card, cancel any time. Private founding offer: 19 for the first 12 months, first 25 businesses.
- [A] Markets: the United States and United Kingdom first; Canada, Australia, Ireland, New Zealand, the UAE and other English-speaking businesses are eligible.

## 2. Capabilities

Rule: a capability is in the plan when it is real recurring work, costs under about 0.10 US dollars a month per business, and does not create a message the owner must answer for no reason.

| Capability | Decision | Recurring work | Commercial value | Cost per business per month | State |
| --- | --- | --- | --- | --- | --- |
| Intelligent review replies | KEEP | Every new review | High. The most frequent visible work | About 0.02 a review | Built, verified on one business |
| Safe automatic replies | DEFER until gates pass | Same | High once allowed: makes the service hands-off | Same | To build, shadow mode first |
| Negative review alerts | KEEP | Each low or delicate review | High. Owners fear these most | About 0 | Built |
| Reputation intelligence and recurring complaints | SIMPLIFY | Monthly | Medium. Only when 3 or more mentions exist | About 0.05 | To build, fresh read only |
| Google profile protection and listing corrections | KEEP | Daily check, one-tap fix | High as insurance; events are rare | About 0 | Built |
| Business information management | KEEP | On change | Medium | About 0 | Built |
| Website and booking link monitoring | KEEP | Daily | High when it fires: a dead booking link loses customers | About 0 | Website check built; links to add |
| Google profile status monitoring | KEEP | Daily and on Google's notice | High. Suspension is the worst case | About 0 | Built |
| Holiday hours | KEEP | Before each public holiday | Medium, and very visible | 0 | Built |
| Google posts | KEEP, capped | Up to 2 a month | Medium. Shows the profile is alive | About 0.01 a post | Built; cadence to set |
| Seasonal content | KEEP inside posts | One of the 2 monthly posts | Medium | Included | Calendar built |
| Photo publishing | KEEP | When the owner sends a photo | Medium | About 0 | Built |
| Business profile improvement (Profile Coach) | SIMPLIFY | First week, then every 90 days | Medium at signup | About 0.01 | Built |
| Performance reporting | KEEP | Monthly | Medium. Google's own numbers | 0 | Built |
| Competitor intelligence | SIMPLIFY | Monthly live read of 3 competitors' rating and review count | Low to medium | About 0.04 | Built; history off |
| Local visibility checks (grid map) | DISABLE | | Not justified at this price: each scan buys many search results and invites ranking promises | Saves the largest data cost | Built, off |
| AI answer checks | DISABLE | | Unstable results, no owner action | Saves cost | Built, off |
| Review graphics | KEEP on request | When the owner asks | Low | 0 | Built |
| QR, NFC and review link tools | KEEP | Tap counts weekly | Medium. The review-growth part of the plan | 0 | Built |
| Weekly receipt | KEEP, short | Weekly | High for retention | About 0.003 | Built |
| Monthly proof of work | KEEP | Monthly | High for retention | Included | To build |
| Request book, partner program, Outbound, Harvey | DISABLE | | Outside the promise | 0 | Built, off |

## 3. Posts: proactive, but never filler [R]

- At most 2 prepared posts a month per business.
- Post 1 comes from the calendar: an upcoming holiday, season or local date, combined only with facts the owner has confirmed (services, hours, offers they stated).
- Post 2 comes from the owner: a photo they sent, or their answer to the monthly "anything new?" question.
- If there is no confirmed fact worth saying, Kabsi prepares nothing. No generic tips, no invented offers.
- Every post waits for one tap. An unapproved post expires after 7 days and is not chased.

## 4. Review growth without contacting customers [R]

Kabsi keeps its existing tools and adds short guides. It stores no customer data and sends nothing.

| Tool | What the owner does | What Kabsi does |
| --- | --- | --- |
| Review link, QR code, NFC card | Puts it at the till or on the receipt | Counts taps and reports them |
| Ready message | Taps "Send review link" and sends from their own phone | Supplies the neutral wording and the link |
| Placement links | Pastes a Kabsi link once into a message their system already sends to every customer: booking confirmation, receipt, invoice, thank-you email, email signature | Gives a separate link for each placement and reports taps by placement |
| "Switch it on where you already are" guides | Follows a 2-minute guide | Maintains the guides and checks them every 90 days |

Guides planned first, each to be checked against the vendor's own help page when written:
- **Jobber:** its Reviews tool asks by text and email after a visit, a closed job or a paid invoice. [V]
- **Calendly:** a Workflow can send a thank-you email after an event ends; the Kabsi link goes in it. [V]
- **Any invoicing or booking tool:** the link in the receipt or confirmation template. [U] per tool
- **Square:** Square has its own Google review automation, but it is sent to regular customers or those who gave positive feedback on a receipt. That is selective asking, which Google's policy forbids, so Kabsi's guide will not recommend it and will point to the receipt link instead. [V]

Rules that stay: the same request for everyone, no reward, no rating question first, no staff targets. The word for a link open is "tap", never "review".

## 5. Review replies

- Every new review is classified by code rules and a model; the higher risk wins. Health, legal and financial businesses get extra care, and a delicate review gets no draft, only guidance.
- The reply is grounded in the owner's confirmed facts and checked for tone before the owner sees it.
- The owner approves with one tap, edits, or skips. Kabsi publishes, then reads it back from Google after 10 minutes and after 24 hours.
- **Automatic publishing** stays off. It can be switched on later only when all of these hold: Google has confirmed that a recorded standing instruction is "prior specific and express consent"; the 12 conditions are implemented; 0 of 120 trap reviews are marked safe in the test set and in a separate held-out set of 100; shadow mode has run for at least 14 days and 100 real reviews; a pilot of up to 3 consenting businesses has run; Rashid has said yes.

The 12 conditions: recorded consent; rating 4 or 5; code rules say low risk; the classifier says low risk and no human needed; a second check agrees; not a health, legal or financial business; a new review, not an edited one; supported language and 600 characters or fewer; the reply passes every grounding and tone check; at least 10 owner-approved replies already; fewer than 10 automatic replies that day; global and location switches both on.

## 6. Protection: what Kabsi fixes and what it only reports

Google forbids using its API to automatically revert Google's changes, so every correction keeps one tap. [V]

| Item | Fix after one tap | Alert only |
| --- | --- | --- |
| Hours, holiday hours, phone, website link, booking and menu links, description, attributes | Yes | |
| Main category | Yes, with a warning that Google may ask to verify again | |
| Name, address, map location, open or closed status | | Yes, with a link to Google |
| Suspension, verification request, ownership conflict, lost manager access | | Yes, urgent; Kabsi stops all writes |
| Website down, broken page, redirect to another domain, expired certificate | | Yes |
| A page that loads but shows an error message | | Not detected; stated as a limit |

Link checks run daily with a 10 second limit. A failure is retried after 30 minutes and 2 hours; only three failures in a row alert. One alert per incident and one line when it recovers.

## 7. Reputation intelligence and competitors

- Google's policy limits stored API content to 30 days and forbids aggregating stored content. [V] So patterns are computed from a fresh read when the report is built, and Kabsi keeps no review text, themes or monthly Google figures beyond 30 days until Google answers.
- Shown only with evidence: a complaint or praised service mentioned 3 or more times in 90 days; review frequency against the previous three months; a burst of low ratings (3 or more in 48 hours), with Google's own report link.
- Never shown: rankings of staff, generic advice.
- Competitors: current rating and review count of 3 nearby businesses from a live Google Places read. No stored history, so no "they gained" line until Google's answer allows it. [V] Places permits live display; storing more than the place ID is not allowed.

## 8. Proof of work

**Weekly receipt, 3 to 5 lines:** replies live, anything waiting for a yes, anything found, taps on review links.

**Monthly report, three bands kept apart:**

| Band | Lines | Source |
| --- | --- | --- |
| Work done | Reviews answered; replies verified live; median response time; low ratings escalated; corrections approved and verified; posts and photos published and verified; holiday hours set | Kabsi's own records and read-backs |
| Found | Listing changes detected; broken links; status warnings; review patterns | Daily checks, fresh read |
| Observed | New reviews and rating; review link taps by placement; Google's calls, direction requests, website clicks and views; 3 competitors' current totals | Google, go.kabsi.co |

Routine checks appear as one small line. Nothing says Kabsi caused a review, a ranking or revenue.

## 9. Onboarding

Three steps: find your business; add Kabsi as a manager on Google; choose email or WhatsApp. Kabsi never asks for a Google password.

**First day:** every unanswered review from the last 90 days arrives with a ready reply, to approve together, plus the first listing and link check.

**Success metric:** *Activated* means Google connected and at least one piece of work approved within 7 days of starting.

## 10. Free check

Your rating and review count beside 3 nearby businesses; listing basics (hours, phone, website, category, photos); whether your website and booking link load now; the reply Kabsi would write for your latest review; what Kabsi would do each month. One button: "Start 14 days free". Live reads only, nothing stored but the place ID. About 0.065 US dollars a check after Google's free monthly allowance, plus about 0.02 for the sample reply.

## 11. WhatsApp: the owner's working interface [A]

Audited 24 November 2026 from the code at `ef06e4b` and the production database. "Verified" means there is a production record of it working. "Built, needs testing" means the code and its unit tests exist and no production record does.

### 11.1 The five kinds of work

1. **Kabsi does it without being asked, no approval needed:** watches for new reviews, checks the listing, the links and the profile status, counts link and card taps, writes the weekly summary and the monthly report.
2. **Kabsi prepares it without being asked, the owner approves:** a reply to each review, a fix when the listing changed, holiday hours, up to 2 posts a month.
3. **The owner starts it on WhatsApp:** everything in the matrix below marked as an owner request.
4. **Kabsi explains or guides only:** business name, address and category changes, services, attributes and description, offers with dates and codes, card details, anything Google must do itself (verification, reinstatement, review removal).
5. **Never:** a message to a customer on any channel, a customer contact list, a cold WhatsApp message, a publication without the owner's yes, general questions that are not about the owner's Google profile or Kabsi account.

### 11.2 Capability matrix

| # | Operation | State today | Smallest change | Session |
| --- | --- | --- | --- | --- |
| 1 | Get new and unanswered reviews | Alert with a draft is built. On request: not built | One read tool, "waiting", on the existing open-items list | OFFER-2 |
| 2 | Prepare, edit and approve a reply | Built, needs testing. No reply has been approved from WhatsApp in production | None. Let edits name a review from the waiting list, not only the last one | OFFER-2, test in GATE-2 |
| 3 | Sensitive review alert and guidance | Built, needs testing. High-risk replies are approved only on kabsi.co, by design | None | GATE-2 |
| 4a | Change hours for one day | Built, needs testing (2 verified from the web) | None | GATE-2 |
| 4b | Change weekly hours | Not on WhatsApp: Kabsi sends the link to the Hours page | One day of the week at a time, shown back exactly, on the existing listing write. Independent review | PROOF-2 |
| 4c | Check current hours | Not built | Read tool on the stored listing | OFFER-2 |
| 5 | Holiday hours | Built, needs testing | None | GATE-2 |
| 6a | Update phone or website | Write path exists, no WhatsApp tool | One tool, shown back exactly. Independent review | PROOF-2 |
| 6b | Description, services, attributes | No write path | Substantial. Guide only at launch | Later |
| 6c | Name, address, category | Not permitted from chat: a wrong change can suspend the profile | Guide only | Never from chat |
| 7 | Booking and menu links | Read only | Substantial. Link watch reports a broken one; the owner fixes it with Kabsi's steps | Later |
| 8 | Send a photo for Google | Built and verified (4 published from WhatsApp) | None | |
| 9 | Post from words or a photo | Built, needs testing. Words must start with "post:" today | Accept plain wording when the router says it is a post | OFFER-2 |
| 10 | Announcements and offers | Announcements as in 9. Offers with dates and codes on kabsi.co only | Kabsi sends the link | |
| 11 | Performance figures | Reviews and link opens: built and verified. Calls, directions and website clicks: not on WhatsApp | Add Google's own figures from a fresh read to "stats" | PROOF-2 |
| 12 | Competitor comparison on request | Not built | Reuse the monthly read, at most one a week | PROOF-2 |
| 13 | Recurring customer feedback | Not built | Return the monthly report's pattern band, only when 3 or more mentions exist | PROOF-2 |
| 14 | Profile health | Web only | Short summary from Profile Coach | PROOF-2 |
| 15 | Detected problems and prepared fixes | Alert built, needs testing. On request: through "waiting" | Same tool as 1 | OFFER-2 |
| 16 | Review link and QR code | Link: built and verified. QR: a link to the page, not the image | Send the QR image in the chat | OFFER-2 |
| 17 | Review graphic | Web only | Kabsi sends the link at launch | Later |
| 18 | Weekly and monthly report on request | Not built | "done" tool: the latest summary and the report link | OFFER-2, monthly in PROOF-2 |
| 19 | Pending approvals | Digest built. On request: through "waiting" | Same tool as 1 | OFFER-2 |
| 20 | Notification choices | STOP and START built and verified. Finer choices on kabsi.co | Kabsi sends the Settings link | |
| 21 | Plan and cancellation | Built, switched off: the live reply today is "Billing is coming soon" | On with live billing. Card changes only through the payment provider's secure page | GATE-2 (test mode) |
| V | Voice instructions in English | Built. Transcription test of 26 October: 4 English notes, no errors. One voice note received in production | Test each supported task by voice | GATE-2 |

### 11.3 Rules that do not change

- Spoken words and forwarded messages are never a yes. A publication needs a tap on Approve or a typed yes from the owner or a manager.
- Staff can send photos and words. Only owners and managers approve.
- When something is missing Kabsi asks one question.
- A message that is not about the owner's Google profile or Kabsi account gets one fixed line, never a model answer.
- Every reply to an owner goes inside the 24-hour window their message opened. Outside it only an approved utility template is used.
- The request book is off, and its code stays.
- Answers on WhatsApp use the small model.
