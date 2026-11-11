# Kabsi product profile (verified)

Growth 1 (master plan 30.50 item 12, as changed by 30.51). Written 11 Nov 2026. This is the one place the outside world's description of Kabsi comes from: directory listings (`docs/marketing/listings.md`), partner and press requests, and any short form that asks "what is it". Copy from here as it stands; do not reword. A new line needs the lane R chat's yes (kabsi-copy).

How it is verified: every line below names the fact file it comes from (`knowledge/facts/`, the numbered files; the built `knowledge/kabsi-facts.md` has the same text). A line with no fact file is marked "New, lane R to confirm" and is not to be pasted anywhere until confirmed. Only shipped features are named. Nothing here mentions the request book, bookings, customers' requests or any assistant for them. Nothing here says "Google partner", "approved by Google" or any promise about rankings, reviews or customers.

Before every submission, read the "Re-check" section at the end. Prices and the state of card payments change; this file is a copy, the fact files are the source.

## 1. Name line

| Item | Text | Fact file |
|---|---|---|
| Name | Kabsi | 04, 2.1 |
| Tagline (the brand line) | Your business on Google. Taken care of. | 04, 2.1 (master plan 30.15 section 1) |
| What it is, in one line | A Google profile assistant on WhatsApp | 04, 2.1 ("a Google Business Profile assistant on WhatsApp") |
| Address | kabsi.co | 02, Address |
| Contact | hello@kabsi.co | 02, Contact |
| Operator | Kabsi is operated by Rashid Abou Hamzy. Contact: hello@kabsi.co. | 04, 2.1d (email footer), 06 |
| Independence notice (carry it where there is room) | Kabsi is independent and not affiliated with Google. | 04, 2.1d (email footer) |
| Facebook and Instagram | Not typed here. They come from the one `SOCIAL_LINKS` constant (R-59). | CLAUDE.md |

Google's name is used only as plain words ("your Google profile"), never in the name, a handle or a headline graphic (K-112).

## 2. Descriptions

Paste these three blocks as they stand. The counts are of characters, spaces included, and are checked in the Growth 1 test run (the lengths are fixed at 58, 142 and 600).

**60 characters (58)**

> Your Google profile, kept right. You approve every change.

**160 characters (142)**

> Kabsi checks your Google profile every day and prepares replies, posts and fixes. You say yes on WhatsApp. Nothing goes live without your yes.

**600 characters (600)**

> Kabsi looks after a local business's Google profile. Every new review gets a reply ready in the reviewer's language. Kabsi checks your hours, phone, website and address every day and tells you when Google shows something different. It prepares photos and posts, and sends a weekly report every Monday. You approve each change with a tap on WhatsApp, and nothing goes live without your yes. Needs a verified Google profile. Free for 14 days once Kabsi is connected, no card. Then Essentials is $29 a month and Pro is $59 (card payments are coming). Kabsi is independent and not affiliated with Google.

Where each sentence comes from:

| Sentence | Fact file |
|---|---|
| Looks after a local business's Google profile | 04, 2.1 |
| A reply ready for every new review, in the reviewer's language | 04, 2.1a (Reviews) |
| Checks hours, phone, website and address every day; tells you when Google shows something different | 04, 2.1a (Google Profile, Google Protection); 04, 2.1 |
| Prepares photos and posts | 04, 2.1; 06, 4.1 (what each plan includes) |
| Weekly report every Monday | 04, 2.1a (Your weekly report) |
| Approve with a tap on WhatsApp; nothing goes live without your yes | 04, 2.1; 02 (WhatsApp messages) |
| Needs a verified Google profile | 04, 2.1c |
| Free for 14 days once Kabsi is connected, no card | 02 (Free trial); the approved trial line (master plan 30.15) |
| Essentials $29 a month, Pro $59; card payments are coming | 06, 4.1 |
| Independent and not affiliated with Google | 04, 2.1d |

## 3. Three positioning sentences

Use one, or all three in order. They are the only positioning Kabsi uses outside its own site.

1. Kabsi is a Google profile assistant on WhatsApp: it prepares the work and asks for your yes. (04, 2.1)
2. Kabsi is software you control, not an agency, and nothing goes live without your yes. (kabsi-copy: "subscription software the owner controls"; 04, 2.1)
3. Kabsi follows Google's own published guidance and works only with your Google profile today. (04, 2.1 and 2.1b, "What Kabsi works with today")

Never position Kabsi as a review reply generator (kabsi-copy), as an SEO tool, or as a way to rank higher.

## 4. Categories

New, lane R to confirm: no fact file names directory categories. Each is a plain description of a built feature (04, 2.1a), chosen from what a site offers. Take the closest match on each site; never a category that promises ranking, SEO or lead generation.

| Order | Category (as sites usually word it) | Built feature behind it |
|---|---|---|
| 1 | Review management | Reviews: a reply ready for every new review |
| 2 | Local business profile management (a Google Business Profile tool) | Google Profile, Google Protection |
| 3 | Small business marketing (posts and photos) | Posts and photos prepared for approval |

Audience in one line: owners of businesses customers visit, and the people who look after a few of them (04, 2.1c, who can use Kabsi).

## 5. Prices

US dollars, plus tax where it applies, the same in every country (06, 4.1). The public name of the lower price is "launch price". Never "founding price". Founding 25 is private and is never named (master plan 30.51 item 3).

| Item | Price | Fact file |
|---|---|---|
| Essentials | $29 a month or $290 a year | 06, 4.1 |
| Pro | $59 a month or $590 a year | 06, 4.1 |
| Extra location | $15 a month or $150 a year | 06, 4.1 |
| Launch price, the first 30 paying businesses, kept while they stay subscribed | Essentials $19 a month or $190 a year; Pro $39 a month or $390 a year | 06, 4.1 |
| Free trial | 14 days, no card, the whole of Pro, starts when Kabsi's access works | 06, 4.1 and 4.3 |
| Yearly | Two months free; refundable in full within 14 days | 06, 4.1 and 4.5 |
| Free tools | The free Google profile check, the review link and QR code | 02 (Free tools) |
| Card payments | Coming. Nothing can be bought today. | 06, 4.1 and 4.2 |

Only quote the launch price with its real count of places left from the Pricing page on the day, and hide it when none are left (06, 4.1). When a form needs one price, give Essentials $29 a month.

## 6. Approved screenshots

No image is committed under docs/ (R-153). A screenshot here is a Playwright baseline picture that is already in the repository, named by its path. Rashid takes a copy of the file when a form asks for one and uploads it from his own computer. Each was opened and looked at on 11 Nov 2026.

| Baseline path | Shows | Example label |
|---|---|---|
| `tests/e2e/baseline/d1440/public.spec.ts/home.png` | Home at 1440 px: the brand line, the free check, the Example result of an invented salon, "When Google shows something different, you choose.", the three steps, the Example WhatsApp message | Visible on all three examples |
| `tests/e2e/baseline/m390/public.spec.ts/home.png` | The same at 390 px | Visible on the comparison card and on the WhatsApp phone |
| `tests/e2e/baseline/d1440/public.spec.ts/pricing.png` | Pricing: Essentials, Pro and the launch price with its count | No example data on the page |
| `tests/e2e/baseline/m390/app.spec.ts/reviews.png` | The Reviews screen of the invented demo business, replies ready with Approve, Edit and Skip | Visible beside the business name |

Not approved, with the reason:

- `tests/e2e/baseline/d1440/public.spec.ts/scan.png`: its footer still shows a Founding 25 link, which is private since Founding 1. The picture is out of date, not the site. Do not use it. Logged in `docs/LATER.md`.
- `tests/e2e/baseline/d1440/app.spec.ts/home.png`: the sidebar foot shows the QA test address of the demo owner.
- Every other baseline (the `email.spec.ts` set, `onboarding.spec.ts`, the other app screens, `for-hair-salon.png`, the 390 px `scan.png`): not looked at for this purpose, so not approved. Look first, then add a row here.

Rules for any picture a listing shows: the Example label stays visible, no invented review is presented as real, and Google's name never sits in a headline graphic (K-112).

## 7. Do-not-say list

Any of these in a listing, a form, a reply to a site's editor or an answer to a visitor is a stop. They come from CLAUDE.md, the kabsi-copy skill, plan 2.11, K-53, K-112, R-61 and master plan 30.50 and 30.51.

Claims:
- "Google partner", "approved by Google", "endorsed", "certified", "compliant with Google" or any badge that implies it.
- Any ranking promise: the 3-pack, "rank higher", "show up in more searches", "higher visibility", "beat your competitors".
- More reviews, more customers, more calls, revenue, "attract new customers". Any promise that a reply or a post improves ranking.
- "Automatically fixes", "prevents suspension", "protects from fake reviews", a promise that a review will be removed or a profile reinstated.
- "24/7", "monitors your messages", "answers questions", "we manage", "we do the Google work", "agency".
- Industry statistics quoted as fact. "Trusted by", customer counts, logos, quotes or ratings of any kind. An example is labelled Example.
- Anything about asking for, gating, rewarding or choosing who reviews. Never "get more 5-star reviews".

Private or not built:
- Founding 25 and "founding price" (the public name is "launch price"). Any place count other than the live one on Pricing.
- The request book, bookings, customers' requests, a booking assistant, or any link to a booking tool, a till, a CRM, Yelp, Tripadvisor, Booking.com, Facebook reviews or any other platform (04, 2.1b).
- Kabsi Partners rewards, payout figures or the partner program (not part of the product profile).
- "Kabsi cards" or any card for sale: Kabsi sells none.
- Any Arabic text, any Lebanon-only example (R-61, K-123).
- Slack, Lovable, or any tool name that is not the product.

Names:
- Never Profile Score, Do now, Listing Shield, Profile Care, Put mine back, Monday Report, Weekly Care Report, Replies as a module.
- No Free plan, Partner plan or Lebanon bundle.

Style: no em dashes, no en dashes, no exclamation marks. Numbers as digits; ranges with "to".

## 8. Re-check before each submission

Read these on the day. If any differ from this file, change the fact file first (K-104), then this file.

1. `knowledge/facts/06-pricing-and-payment.md` 4.1 and 4.2: prices, the launch price and whether card payments are open. Card payments, partner links and Harvey are planned to open on 10 Dec (master plan 30.50 item 15); until a session records it as done, the line "card payments are coming" stays.
2. `knowledge/facts/02-facts-that-change.md`: the free trial line, WhatsApp, the contact lines.
3. The Pricing page on kabsi.co: the live count of launch places.
4. This file's screenshots: the baseline file still exists and still shows what the table says.

## 9. Lines that are new (lane R to confirm)

- The three descriptions of section 2 are new wording made from approved lines and facts; each sentence is traced in the table under them.
- The category names of section 4.
- Positioning sentence 2 combines two approved ideas (software the owner controls; nothing goes live without your yes).
