# Kabsi compliance and integration register

Version 3.1, 24 November 2026. Replaces every earlier version. Not legal advice. No question below has been sent to anyone.

Status values: **Verified**, **Conditional**, **Provider** (needs written confirmation), **Legal**, **Prohibited**.

## 1. What the founder override removed

Kabsi sends nothing to a business's customers and stores no customer contact details. So these no longer apply to Kabsi: email provider consent rules for customer mail, CAN-SPAM, PECR, CASL and the Australian Spam Act for review requests, suppression lists, customer deletion requests, a customer data processing agreement, carrier registration.

## 2. Google

| Item | Requirement | Status | Control |
| --- | --- | --- | --- |
| Replying for a client | Authorization required before responding on a client's behalf (developers.google.com/my-business/content/policies) | Verified | Manager access granted by the owner; every reply approved with a tap |
| Automated replies | Prohibited without "prior specific and express consent" | Provider | Off. Needs Google's answer on the consent wording, plus the gates in the blueprint |
| Reverting changes | Tools may not automatically revert changes Google makes | Verified | Every correction needs a tap |
| Notice of changes | Be transparent about changes; notify within 48 hours | Verified | Each published item is confirmed to the owner at once |
| Stored API content | At most 30 calendar days; not to be manipulated or aggregated | Conditional | Reviews and Google figures kept 30 days at most; patterns and month-on-month figures read fresh |
| Derived statistics, themes, monthly history | Not addressed by the policy | Provider | Not stored beyond 30 days until Google answers |
| Leaving | Seven business days to let a client disassociate | Verified | Existing disconnect flow |
| Posts and edits | Listing edits and posts need the user's consent | Verified | One tap per post, photo and change |
| Review solicitation | No incentives, no selective asking, no staff quotas, no pressure, no requested content; unusual volumes are treated as manipulation (support.google.com/contributionpolicy/answer/7400114) | Verified | Same neutral wording for everyone; guides never recommend selective tools |
| Places data | Live display allowed; only the place ID may be stored (existing rule 30.10) | Verified | Free check and competitor totals read live |
| Competitor history | Kabsi's earlier snapshots came through a third-party data service | Conditional | History writes off; totals only, from a live Places read |
| Brand | Never imply Google approves or partners with Kabsi | Verified | "Kabsi is independent and not affiliated with Google" on every page |

## 3. WhatsApp, Meta and Kapso

| Item | Finding | Status |
| --- | --- | --- |
| Audience | Kabsi's number messages only subscribed owners and their authorized staff, never a business's customers | Verified, standing rule |
| Opt-in | The owner opts in by starting the chat or in onboarding | Verified |
| AI provider clause | Meta bars AI providers where AI is the primary functionality (first report, as reported by TechCrunch). Kabsi is a Google management service whose assistant answers only about the owner's account | Provider |
| Templates | Owner notices use approved Utility templates (repo PROGRESS, 29 Oct) | Verified from the repo |
| Kapso price | Free: 2,000 messages, 1 number. Pro: 25 US dollars, 100,000 messages, 3 numbers (kapso.com/pricing) | Verified |
| Kapso retention | The pricing page lists retention for project events only, not messages | Provider |
| R-49 | The Kapso connector is not used for Kabsi | Standing rule, unchanged |
| Scope of the assistant | Only the subscribed owner's Google profile and Kabsi account. Other requests get one fixed line, read by code before any model (repo, `router.ts`) | Verified in code |
| Owner-started work | Replies go inside the 24-hour window the owner's message opened, without a template. Since 1 Oct 2026 the first 1,000 service messages per number each month are free; after that each is charged at the recipient country's rate (Kapso, 24 Nov) | Verified. Free up to about 40 active businesses; price the rest before then |
| Escalation | Meta's policy requires a clear path to a person from automation. The fixed off-topic line must name "talk to a person" and hello@kabsi.co | To change in OFFER-2 |
| Kapso model improvement | ON (Free plan default, never changed). Meta's terms forbid using platform data to train models | Turn off: one switch, needs Rashid's yes |
| Kapso transcription | ON for inbound and outbound audio, although Kabsi transcribes with ElevenLabs. A second processor of owners' audio for nothing | Turn off: needs Rashid's yes |
| Kapso retention | Free plan: kept indefinitely; a 30-day policy needs a paid plan | Pro before the pilot, then set 30 days |
| Approval | Spoken and forwarded words never count as a yes. Staff cannot approve | Verified in code |
| Number status | Connected, quality green, display name Kabsi usable without review, account review approved, tier 250 (Kapso, 24 Nov). Tier 250 caps business-started messages at 250 people a day | Verified. Enough until about 200 businesses; Meta business verification lifts it |
| Templates | 25 stored, all approved (14 November) | Verified |
| Review content in alerts | An alert carries the reviewer's first name and up to 300 characters of the review through Kapso and Meta | Provider: retention must not exceed Google's 30 days |
| Voice notes | Audio goes to ElevenLabs for transcription, is held in memory only and is not stored | Provider: a paid plan and its terms to confirm before the pilot |
| Owner messages and AI | A typed message that code cannot sort goes to the AI provider for sorting | To state in the privacy policy |

## 4. Data Kabsi still holds

| Data | Whose | Rule |
| --- | --- | --- |
| Owner and staff account details | The business's people | Privacy notice; deletion 30 days after cancellation on request |
| Reviews, including reviewer names | Public Google content about the business | Kept 30 days at most; never used for anything but replies and the report |
| Business facts the owner confirmed | The business | Kept while the account is active |
| Kabsi's work records | Kabsi | Kept; no review text inside them beyond 30 days |
| Photos the owner sends for publishing | The business | Deleted 30 days after publishing |
| Customer contact details | | None. Not collected |

Owner-sent photos are for posts only. If a photo shows people, the owner is asked to confirm they may publish it.

## 5. Country requirements that remain

| Topic | Finding | Status |
| --- | --- | --- |
| Customer communication law | Does not apply; Kabsi sends nothing to customers | Verified by design |
| Privacy law for owners' account data (US states, UK GDPR, EU GDPR, Canada, Australia) | Applies as for any online service: a privacy notice, security, deletion on request. Data is hosted in the EU | Legal, one review of the privacy notice and terms before scaling. Paid legal work is not authorized yet |
| Sales tax and VAT | Creem acts as merchant of record and handles it (first report) | Conditional on Creem live |
| WhatsApp as the owner channel | Works in every listed country; email is the alternative everywhere | Verified |
| Google Business Profile API | Available in every listed country | Verified |
| Language | English only at launch | Decision |

## 6. Integrations

| Integration | Cost | Status | Decision |
| --- | --- | --- | --- |
| Google Business Profile API | Free | Approved and live | Use |
| Google Places API (New) | Free monthly allowance per call type, then about 0.025 to 0.04 per call | Live, daily cap 20 | Raise the cap before any traffic |
| Resend, account email only | 20 US dollars for 50,000; free tier 3,000 a month | Live | Keep. Never for customers |
| Kapso | 25 US dollars on Pro | Live on Free | Pro before the first paying business |
| Creem | 3.9 percent plus 0.40; payout 7 US dollars or 1 percent, twice a month | Test mode; account held by Hussein Slim | Written agreement before the first charge |
| AI provider | Per use | Credit expired 17 Nov | Paid key with a hard monthly cap |
| DataForSEO | Per call | Balance near zero | Not needed at launch |

## 7. Launch blockers

| # | Blocker | Cleared by |
| --- | --- | --- |
| B0 | The backend has been locked out since 14 November: nothing syncs, publishes or sends | FIX-0 |
| B1 | The WhatsApp number's state today is unknown (last check 14 November) | FIX-0 |
| B2 | No paid AI key with a hard cap | Rashid |
| B3 | Card payments in test mode on an account the founder does not hold | Creem live setup and a written agreement |
| B4 | Kapso still on Free | Pro before the first paying business |
| B5 | Launch tests not run | GATE-2 |

Automatic replies are not a launch blocker: the product launches with one-tap approval.

## 8. Questions (not sent; Rashid decides)

**Google, Business Profile API support.** "1. Does a recorded, revocable instruction from the business owner to publish replies to 4 and 5 star reviews that pass our safety checks count as prior specific and express consent for automated replies? 2. We keep API content no longer than 30 days. May we keep beyond that our own derived monthly counts, short theme labels with counts and no review text, and month-by-month totals of performance metrics shown only to that business?"
What it decides: whether automatic replies can ever go live, and whether the report can show history.

**Kapso.** "Kabsi is a paid service that manages a local business's Google Business Profile. Our WhatsApp number talks only to our own subscribed business owners and the staff they authorize, after opt-in. It never messages their customers.
On this number the owner can: receive a new review with a prepared reply and approve or edit it; ask what is waiting; change opening hours and holiday hours; send a photo or a short post for their Google profile; ask for their review link and QR code, their Google figures and their weekly or monthly report; and manage their Kabsi plan. They can type or send an English voice note, which we transcribe. Every change to Google is shown back and needs the owner's tap on a button. A language model sorts the message into one of these tasks and drafts text. Anything outside these tasks gets one fixed line.
1. Is this a permitted use under Meta's WhatsApp Business terms on AI providers and general-purpose assistants, as you understand them?
2. Are replies inside the 24-hour window to an owner's own message treated as service messages for this use?
3. How long does Kapso keep message bodies and media on Pro, can we set it to 30 days or less, and is any of it used for model training?
4. Our number shows messaging limited at tier 250. What do we need to do to lift that?"
What it decides: whether WhatsApp can be sold as the main way to work with Kabsi, or only as one of two channels.

Dropped: the questions to Resend and Square.
