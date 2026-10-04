# Kabsi: Website, App and Conversion Design Review

Oct 2, 2026

## Summary

Kabsi's site already looks better than most competitors': a confident black and yellow brand, a real product demo in the hero, honest copy and careful accessibility. It converts worse than it looks, for four reasons: it asks for the hardest step (inviting Kabsi on Google) before showing any value, it uses three different calls to action, it has no proof of any kind, and it still describes features the product audit removed (Profile Score, Listing Shield, "Put mine back", a weekly post). The app has the same problem in miniature: Home is a dashboard of competing widgets when it should answer one question.

This review is based on the live Lovable project (latest commit 42e7994, 29 Sep 2026), its published homepage screenshot, the page code in the repo and the stored page screenshots. It follows the decisions in the product audit document (K-01 to K-56), so the two documents do not conflict.

The ten changes that matter most:

1.  **Slogan:** "Your reviews and listing. Taken care of." on every page; footer line "We watch your listing. You run your business."

2.  **One call to action:** "Start free" with "14 days. No card. Cancel any time." Drop "Get early access".

3.  **Value before the invite:** a free snapshot of the business's public Google profile right after signup, then the Manager invite with video, reminders and a setup call.

4.  **Homepage rebuilt around three jobs:** a reply ready for every new review, your details kept right, your profile kept fresh. Then the Weekly Care Report, why Kabsi, price.

5.  **Honest proof:** interactive approval demo, founder note with a real face and contact, safety promises, first case study only with consent.

6.  **Pricing page that sells the right product abroad:** no NFC hero outside Lebanon, outcome-based feature list, guarantee box, card payments.

7.  **Partners page for agencies:** portfolio view, client approvals, branded reports, two money models.

8.  **Free Google Profile Check** as the main lead magnet, sharing code with onboarding.

9.  **App Home with two states:** "You're all caught up" or "2 things need you", action cards, "What Kabsi did".

10. **kabsi.co** instead of kabsi-app.lovable.app, with an Arabic version before Gulf marketing.

Items 1, 2, 5 and 10 are mostly copy and settings and can ship in Lovable within a week; they, and card payments, should be live before any ad spend.

## Brand: slogan, positioning and voice

The brand is already distinctive: black, signal yellow and a heavy display face read as confident and local, not as another blue SaaS. What it lacks is one sentence that every page repeats, and a message order that sells the outcome before the mechanism.

**Slogan.** Main line on every page, ad and email: **"Your reviews and listing. Taken care of."** It is shorter than today's "Your Google Business Profile, taken care of.", avoids Google's product jargon (owners say "my Google", not "my Business Profile"), and keeps Google's name out of Kabsi's own slogan entirely, as Google's brand rules require for third parties ("Don't put our name in your name"; audit K-112). The site footer carries the full notice: "Google and Google Business Profile are trademarks of Google LLC. Kabsi is independent and not affiliated with, sponsored by or endorsed by Google." Footer and social sign-off replace "Tap. Review. Reply.", which describes the old NFC product, with **"We watch your listing. You run your business."**

Slogans considered and rejected:

| Option                                                 | Why not                                                  |
|--------------------------------------------------------|----------------------------------------------------------|
| "Your Google Business Profile, taken care of." (today) | Jargon; five words before the promise                    |
| "AI that replies to your reviews"                      | Leads with AI; Google now gives this away free in Gemini |
| "Get more 5-star reviews"                              | Banned claim; Google policy risk                         |
| "Rank higher on Google Maps"                           | Banned claim; unprovable                                 |
| "Tap. Review. Reply." (footer today)                   | Describes a card, not the product                        |

**Positioning statement** (internal, guides every page): For local business owners who know Google matters but never find time for it, Kabsi is the assistant that watches their Google profile, prepares every reply and update from facts they confirmed, and asks before anything goes live. Unlike Gemini, it comes to you and watches when you are busy. Unlike agencies and big platforms, it costs \$19 and you stay in control.

**Message hierarchy.** Every page, the homepage most of all, follows this order:

1.  **Promise:** your Google, taken care of.

2.  **Proof of the three jobs:** a reply ready for every new review; your information kept right; your profile kept fresh.

3.  **Control:** nothing goes live until you tap Approve.

4.  **Relief:** "You're all caught up" is the normal state; you hear from Kabsi only when something needs you.

5.  **Why Kabsi, not Gemini or an agency:** it comes to you, it watches, it remembers your facts, a person is behind it.

6.  **Price and risk removal:** \$19, 14 days free, no card, cancel any time.

**Voice.** Calm, direct, a little warm, like a capable employee reporting back. Short sentences. Verbs owners use: reply, check, fix, approve. Kabsi speaks in the first person plural on the site ("We watch") and in the third person inside the app ("Kabsi prepared a reply"). The existing house rules stay: no em or en dashes, no exclamation marks, no "AI-powered", no "SEO", no ranking promises, no "Listing Shield", "Profile Care" or "Profile Score" (renamed in the audit, K-02 and K-07).

**Name.** Keep "Kabsi". In Lebanese Arabic it echoes a press or tap, which carries the "one tap and it's done" idea in the Arabic market. Do not explain it on the English site; use it in Arabic marketing only.

## Visual system

Keep the palette and fonts; tighten how they are used. The current site uses yellow on almost every button, chip and underline, so nothing stands out; the display font appears at too many sizes; and the main visual is a stock photo when the strongest picture Kabsi has is its own approval card.

**Colour.** Keep the tokens in styles.css. Change the rules:

| Token                                | Use                                                                         | Change                                                                 |
|--------------------------------------|-----------------------------------------------------------------------------|------------------------------------------------------------------------|
| Yellow \#FFD60A                      | The one primary action per screen, and the "needs you" highlight in the app | Remove it from eyebrows, underlines, step numbers and decorative chips |
| Black \#000 and carbon \#0B0B0B      | Hero and final call-to-action bands, primary text                           | Keep                                                                   |
| Sand \#F6F4EF                        | Alternate section backgrounds, app background                               | Keep                                                                   |
| Green \#1F8A5B                       | "All caught up", published, Google Protection on                            | Use it more: calm is the product                                       |
| Red \#D93025                         | Only real problems: disconnected, rejected by Google, high-risk review      | Never decorative                                                       |
| New: amber \#B45309 text on \#FEF3C7 | "Needs your attention" states and warnings                                  | Add, so yellow stays for actions only                                  |

**Type.** Lalezar for H1 and H2 only, at two sizes (hero 56 to 80 px, section 36 to 44 px). Everything else in Readex Pro: 18 px body on marketing pages, 16 px in the app, 14 px for secondary text, never below 13 px. Line length 60 to 70 characters. Lalezar has an Arabic cut, so the Arabic site keeps the same voice; check every heading in Arabic, because Lalezar Arabic runs larger than Latin.

**Layout.** One 1200 px container, 12 columns, 24 px gutters; sections 96 px apart on desktop and 64 px on phones. Every section has one job, one headline, at most one paragraph, and one visual. Alternate white and sand backgrounds; use black only for the hero and the closing band.

**Imagery.** Lead with product, not stock. The hero shows the real approval card on a real phone frame, with the business owner's world softly behind it. Replace stock photos with three kinds of picture only:

1.  Product views of real Kabsi screens with example data marked "Example".

2.  Real owners in real places (once customers exist; Yawmiyati and the first Lebanese pilots first, with written permission).

3.  Simple line illustrations in black with one yellow accent for abstract ideas such as "we watch your profile".

Every image needs proper alt text; the pricing page currently shows the alt text "Review card stand on a restaurant table by candlelight" above the hero when the image fails to load.

**Components to standardise.** Button (primary yellow, secondary black outline, tertiary text link), the Kabsi card (the approval card used in the hero, emails and the app, one design everywhere), status pill (green, amber, red, grey), "Example" badge, step list, FAQ accordion, comparison table, quote card, and the phone frame. Build them once in src/components/ui and use only these on marketing pages.

**Motion.** Keep the current restraint (one 8 px rise per section, reduced-motion respected). Add one moment: on the homepage, the approval card animates from "Draft ready" to "Published" with a green tick when it enters view. That single animation explains the product.

## Conversion strategy

The site has one big conversion problem and three smaller ones. The big one: the hardest step, inviting Kabsi as a Manager on Google, happens before the owner has seen any value, and the homepage even prints the group ID to a cold visitor. The smaller ones: three different call-to-action labels, no proof at all, and USDT as the only international payment.

(Image omitted in the repo copy; see the original .docx in the Claude project.)

signup funnel · 8 steps, 1 new, 1 high-risk

The new snapshot step sits right before the Manager invite, so owners invite Kabsi to fix problems they have just seen.

**One call to action.** Replace "Get early access", "Start free trial" and "Start free" with one label everywhere: **"Start free"**, with the line "14 days. No card. Cancel any time." under it. "Early access" sounds like a waiting list and lowers intent; concierge mode means a real business can start today. The secondary action everywhere is **"See it work"**, which opens the interactive demo.

**Show value before the hard step.** New order after signup: find your business, then immediately show a free snapshot built from public Google data (rating, review count, hours, whether photos exist, missing website or phone) with "Kabsi can take care of 4 of these". Only then ask for the Manager invite. The owner now invites Kabsi to fix things they have just seen.

**Make the invite easy.** It is the step most likely to lose people:

- A 60-second video and phone screenshots for iPhone, Android and desktop, chosen automatically by device.

- "I'll do this later": the account stays, and reminder emails go out at 1 hour, 1 day and 3 days with a one-tap link back to the step.

- "Do it with us": a 10-minute setup call (Calendly, already connected) offered at this step only.

- A live check: "We're watching for your invitation" turns green the moment Kabsi accepts it.

- Move the group ID off the homepage; it belongs in onboarding and the Manager steps page only.

**Proof without customers.** Never invent testimonials or logos. Use honest proof until real customers exist:

1.  The interactive demo (exists) upgraded to a full approval flow: a review arrives, a draft appears, tap Approve, see "Published".

2.  A founder note with Rashid's photo and name: who runs Kabsi and how to reach a person.

3.  Specific safety promises: "Nothing goes live until you approve it", "Remove Kabsi from Google any time", "We never ask for your Google password".

4.  The first real case study from the concierge pilots (Yawmiyati, then Lebanese pilots), published only with written consent.

5.  Later: a live counter of replies prepared and changes caught, read from the audit log, never estimated.

**Lead magnets.** Two free tools carry most organic traffic: the review link and QR generator (exists) and the Google Profile Check (queue item Q11). Both end with the same offer: "Want Kabsi to take care of this? Start free." They also capture an email for a 5-email nurture sequence: your snapshot, how to reply to reviews, holiday hours, photos customers look for, and a trial reminder.

**Payment.** Card checkout must exist before any paid traffic outside Lebanon. Keep USDT, Whish, OMT and cash as options, not as the only way. Show the price in the visitor's currency where a processor supports it, billed in USD.

**Targets to measure against** (benchmarks for no-card SaaS trials, to be replaced by Kabsi's own numbers after 100 signups): visitor to signup 3 to 5%; signup to Google access 50% or more; access to first approved action within 48 hours 80%; trial to paid 20 to 30%.

## Homepage

The homepage today is well made but explains features one by one (Reviews, posts, Listing Shield, review link, how it works with the group ID). The new page sells one outcome in the first screen, then proves the three jobs, then removes risk. It has 13 short sections, each with one job, one headline and one visual.

**Hero, new copy:**

- Eyebrow: "For businesses customers find on Google"

- H1: **"Your reviews and listing. Taken care of."**

- Subhead: "Kabsi answers every review, keeps your hours and details right, and keeps your profile fresh. You approve everything from your phone, in seconds."

- Primary button: "Start free"; under it "14 days. No card. Cancel any time."

- Secondary button: "See it work"

- Three ticks: "You approve everything", "Replies in your customer's language", "Remove Kabsi any time"

- Visual: a phone showing the Kabsi Home screen in its two states, cycling once from "1 thing needs you" to "You're all caught up" after the owner taps Approve. Background stays dark with a softly blurred café, as today.

Remove from the hero: "by following Google's own guidance" (sounds like an excuse), "a weekly post" and "Profile Score" (both changed in the audit).

| \#  | Section                  | Today                                                                              | New                                                                                                                                                                                          |
|-----|--------------------------|------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| 1   | Hero                     | Feature list in the subhead; demo card                                             | As above                                                                                                                                                                                     |
| 2   | Who it's for             | "If customers find you on Google Maps, Kabsi is for you" with a business grid      | Keep the grid, shorten to one line, add Arabic and French names of trades for SEO and recognition                                                                                            |
| 3   | The problem              | Missing                                                                            | "Google is your shop window. It's also a part-time job." Three plain pains: reviews waiting, wrong hours after Google's edits, a profile that looks closed because nothing changed in months |
| 4   | Job 1: Reviews           | "Never wonder what to reply again"                                                 | Keep the headline. Show the approval card in English, Arabic, French and Spanish tabs (exists). Add the high-risk example: "This review needs a little more care"                            |
| 5   | Job 2: Google Protection | "Listing Shield" with "Put mine back"                                              | H2 "Know the moment Google changes your details." Example alert with "Keep my information" and "Google is right". Line: "Nothing changes unless you say so."                                 |
| 6   | Job 3: A fresh profile   | "Keep your profile fresh" with four features                                       | H2 "Photos and updates, ready for your OK." Phone uploading a photo, Kabsi saying "This looks like an exterior photo. Ready for Google?"                                                     |
| 7   | Weekly Care Report       | Missing as a section                                                               | H2 "Every Monday, see what Kabsi took care of." A real-looking report email marked Example                                                                                                   |
| 8   | Why Kabsi                | Missing                                                                            | Three columns: "It comes to you" (vs opening a dashboard or Gemini), "It remembers your business" (facts you confirmed), "A person behind it" (Rashid's photo, WhatsApp and email)           |
| 9   | Get Reviews              | Long paragraph on links, NFC and rules                                             | One line and a link: "Your review link and QR code are free, forever." Card offer only for Lebanese visitors                                                                                 |
| 10  | How it works             | Three steps including the group ID                                                 | Three steps: "Find your business", "Invite Kabsi as a Manager (2 minutes, we show you how)", "Approve from your phone". No ID here                                                           |
| 11  | Pricing                  | Free and \$19 cards                                                                | Same, plus a comparison line: "An agency charges \$200 to \$500 a month for this."                                                                                                           |
| 12  | FAQ                      | Four questions                                                                     | Six: Do you need my Google password? Can Kabsi post without me? Is this allowed by Google? Can I remove Kabsi? Which languages? How is this different from Gemini?                           |
| 13  | Final band               | "Your reviews and listing. Taken care of." with the explanation line (audit K-110) | "Your Google, taken care of. Starting today." with Start free                                                                                                                                |

Sections 2 and 3 can merge if the page feels long on a phone. The page must read in order as: promise, pain, three jobs, proof of work, why us, price, questions, ask.

The agency price line in row 11 is a market range from public agency price lists; check it against three agency price pages in the target markets before publishing.

## Pricing page

The pricing page is clear and honest, but it sells a card to US visitors, describes the old module names, and asks international buyers to pay in USDT. The new page answers three questions in order: what does it cost, what do I get, what if it doesn't work for me.

| Area             | Today                                                      | Change                                                                                                                                                                                                       |
|------------------|------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Hero visual      | NFC table card (Lebanon-only product) for every visitor    | No visual; a single line: "One price. Everything included. 14 days free."                                                                                                                                    |
| Hero headline    | "Start free. Pay when it is worth it."                     | Keep. It is good                                                                                                                                                                                             |
| Plans            | Free and Pro                                               | Three columns: Free (\$0), Pro (\$19 a month or \$190 a year, marked "Most businesses"), Partner ("From \$8 per business", link to Partners)                                                                 |
| Pro feature list | Module names (Listing Shield, Profile Care, Monday Report) | Plain outcomes: "A reply ready for every new review", "Know when Google changes your details", "Photos and updates prepared for you", "Holiday hours reminders", "Weekly Care Report", "A person to talk to" |
| Yearly toggle    | Shows yearly price                                         | Show "2 months free" on the toggle itself                                                                                                                                                                    |
| Extra locations  | One line in small print                                    | A small calculator: number of locations, monthly or yearly, total                                                                                                                                            |
| How to pay       | USDT and Lebanese methods                                  | Card first (once live), then "Also: USDT, Whish, OMT, cash in Lebanon"                                                                                                                                       |
| Comparison       | Missing                                                    | Short table: Kabsi, doing it yourself, Gemini, an agency, Birdeye. Rows: price, who replies, watches your profile, you approve everything, team and agency support. Every competitor fact sourced and dated  |
| Guarantee        | Refund rule in small print                                 | A visible box: "Try it free for 14 days. Monthly plans cancel any time. Yearly plans refunded in full within 14 days."                                                                                       |
| FAQ              | Small print list                                           | Accordion: trial start, what happens at the end of the trial, cancelling, leaving Kabsi, VAT and invoices, multiple locations                                                                                |
| Lebanon          | Mixed into the main page                                   | Separate block shown only to Lebanese visitors via region.ts: "Lebanon bundle: \$120 a year with an NFC card and in-person setup"                                                                            |

Price stays at \$19. It sits below every serious competitor and above the free tools, and the yearly plan anchors a lower monthly figure (\$15.83).

## Other public pages

The supporting pages are numerous and well written for search, but they repeat old product names and explain mechanics before outcomes. Each gets one job and one call to action.

| Page                                         | Job                                                        | Changes                                                                                                                                                                                                                                                                                                                        |
|----------------------------------------------|------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| How it works                                 | Remove fear about access and control                       | Rebuild as the operating loop in plain words: Kabsi watches, prepares, asks, publishes, reports. One illustrated row per step. Add a clear "What Kabsi can and cannot do" box: cannot see your password, cannot post without you, cannot lock your listing, cannot promise rankings                                            |
| Industry pages (/for/restaurants and 7 more) | Rank for "\[trade\] Google reviews" and convert that trade | Keep the 8 trades. Each page: trade-specific hero ("For clinics: replies that never confirm who your patients are"), 3 example reviews and drafts from that trade, the photos customers look for in that trade, trade FAQ. Add dentists separately from clinics, and add gyms, real estate offices and car rental for the Gulf |
| Lebanon                                      | Sell the bundle on the ground                              | Keep separate. Arabic version first. WhatsApp button as the main call to action, the field team's faces, cash and Whish payment, the physical card shown in hand                                                                                                                                                               |
| Guides                                       | Organic traffic                                            | Keep the three guides. Add: "How to set holiday hours on Google", "Why Google changed my business hours", "Google Business Profile photos: what customers look for", "Gemini vs a Google profile assistant". Each ends with the free tool or Start free                                                                        |
| FAQ                                          | Answer objections                                          | Group into Access and safety, Replies, Your profile, Pricing, Leaving Kabsi. Add the Gemini question. Remove questions about Listing Shield and Profile Score                                                                                                                                                                  |
| About                                        | Build trust                                                | Rewrite around the person: who Rashid is, why Kabsi exists, where it operates (Dubai, Beirut), how to reach a human. Photo. No company jargon                                                                                                                                                                                  |
| Security                                     | Answer "is this safe?"                                     | Lead with three facts: no password ever, Manager access you can remove, nothing posted without you. Then the details that exist today (encryption, data kept 30 days, Advanced Protection on Kabsi's Google account)                                                                                                           |
| Manager steps                                | Help during onboarding                                     | Keep, add device-specific screenshots and the 60-second video                                                                                                                                                                                                                                                                  |
| Privacy and Terms                            | Legal                                                      | Update for the retention table and disconnect flow from the audit (K-40, K-41)                                                                                                                                                                                                                                                 |

Global navigation: How it works, Pricing, For your business (dropdown of trades), Partners, Log in, and the yellow "Start free" button. Move FAQ and Guides to the footer. The footer keeps "Kabsi is independent and not affiliated with Google", which Google's policy requires in spirit and buyers find reassuring.

Languages (audit K-119): the site, app, emails and guides launch in English only, for the eight English-speaking markets. Other languages, Arabic included, are P2: an Arabic version (homepage, pricing, How it works, Security, right-to-left checked on a phone) comes only when Gulf or Lebanon marketing starts; Spanish and French follow search data. Kabsi still drafts replies in each reviewer's own language from day 1.

## Public Partners page

The current page speaks to NFC card sellers and promises partners they "never see review text" and "can't post for them". That was true for a card reseller; it is the opposite of what an agency wants, and the audit (K-16, K-29 to K-32) now gives agencies real tools with client-controlled approvals. The page is rewritten for two audiences, with agencies first.

**Hero:**

- H1: **"Manage every client's Google from one place."**

- Subhead: "Kabsi does the repetitive work: review replies, profile checks, photos, updates and reports. You manage the relationship, and your clients approve what matters."

- Buttons: "Apply as a partner" and "See the partner workspace" (an example screen).

**Sections in order:**

1.  **The portfolio view:** a screenshot of the partner dashboard: "32 clients. 5 need attention. 10 all caught up."

2.  **Approval your way:** three cards: client approves; you approve with the client's permission; you prepare and the client approves. "Your clients stay the owners of their Google profiles."

3.  **Reports with your name:** the weekly client report with the agency logo.

4.  **The economics:** two models side by side. Referral: 30% of every payment for 12 months (40% for the first 10 partners). Resale: \$8 per live business a month (\$6 for founding partners), you set your own price. A small earnings calculator: clients times your price minus Kabsi's rate.

5.  **Who it's for:** local marketing agencies, web designers who manage clients' Google, NFC and review-card sellers, and accountants or consultants who already advise small businesses.

6.  **Rules we keep:** no review gating, no incentives, no ranking promises. "Partners who break these lose access."

7.  **Apply:** the existing form, shortened to name, email, company, country, number of clients, and website. Response promise: "We reply within 2 working days."

Remove: the "Cards plus software" section as the lead message (move it to a short block for card sellers), "Settle in USDT" as a headline benefit, and the sentence about partners not seeing reviews.

## Free tools

The two free tools are Kabsi's cheapest acquisition channel: people search for them every day, and each result is a natural lead-in to the paid product. The review link tool exists; the Google Profile Check should be built next (queue item Q11) because it shows the owner exactly what Kabsi would fix.

**Free review link and QR code (/google-review-link).** Keep the tool; improve the result screen:

- Result shows the link, a QR code, a printable A6 table card and A5 counter sign in Kabsi's design, and a WhatsApp share message, all downloadable without signing up.

- Below the result: "Kabsi can also reply to every review you get from this link. Start free."

- Optional email field: "Email me the print files" (feeds the nurture sequence).

- Page title and H1 target the search phrase exactly: "Free Google review link and QR code generator".

- Card wording on all printables follows Google's April 2026 rules: no staff names, no rewards, no "5 stars".

**Google Profile Check (/google-profile-check, new).** Search a business, then show a one-page result from public data only, with Google attribution:

| Block                         | Shows                                                                                                                                                                                                 |
|-------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Headline                      | "Here's what customers see on Google"                                                                                                                                                                 |
| Snapshot                      | Rating, review count only (no review text or dates: requesting reviews moves every snapshot call to Google's most expensive Places tier; review details appear after the owner connects, audit K-100) |
| Details                       | Regular hours and current open status, phone, website, category. Not the owner's description: Google's public data only carries Google's own editorial summary                                        |
| Photos                        | Whether the profile has photos (Google's public data returns at most 10, without dates)                                                                                                               |
| What Kabsi would take care of | Three to five items in plain words, each with Urgent, Recommended or Nice to have                                                                                                                     |
| Offer                         | "Start free and Kabsi prepares these for you" and "Email me this report"                                                                                                                              |

No score out of 100, no ranking language, no comparison with competitors. Limits: 3 checks per visitor per day, Turnstile, cached public data for no more than Google's allowed period.

Both tools launch in English; versions in other languages come with the language rollout (K-119).

## Signup, login and onboarding

Onboarding is where Kabsi wins or loses customers. The new flow shows value before asking for anything, connects Google in one tap where possible, and has a clear screen for every situation an owner can be in (audit K-91 to K-98). Target: connected in under 3 minutes on a phone.

**Sign up and log in.** One sheet with two buttons: "Continue with Google" (primary, black with the standard Google mark as Google's branding rules require) and "Continue with email" (sends a 6-digit code, as today). No passwords. Log in uses the same two buttons. The sheet appears after the owner has found their business and seen the snapshot, with the line "Save your snapshot and continue".

**New onboarding, one screen per step, progress bar of 5:**

1.  **"Which business is yours?"** Search by name with Places, pick from results showing name, address and rating. No account yet. "I can't find my business" leads to the eligibility check and the create-a-profile guide (K-98).

2.  **"Here's what customers see."** The free snapshot (same as the Profile Check). "Kabsi can take care of 4 of these." Button: "Let Kabsi take care of it", which opens the sign-up sheet.

3.  **"Connect your Google listing."** One big button, "Connect with Google", with the plain explanation above Google's consent screen (K-92). Below it, a quieter link: "I'd rather add Kabsi myself" (the manual guide). Kabsi then shows the profiles it found, each with a plain status ("Ready", "Needs verifying", "Google is reviewing", "Suspended", "You're a manager, not an owner"), and the owner ticks the ready ones. Anything not ready opens its scenario screen.

4.  **"Five quick questions."** How you sign off, tone (three tappable examples, not a dropdown), a contact for unhappy customers, one thing customers love, one thing never to say. Skippable, with defaults. Shown while Kabsi finishes connecting, so no one waits on a spinner.

5.  **"Confirm your details."** Shown once access is confirmed: name, phone, hours, website, category, each with "Correct" or "Change". This becomes the protected baseline, and the trial clock starts here.

**Scenario screens** (one each, same layout: what is happening in one sentence, what to do in at most four numbered steps, a button to Google's exact page, "I've done it", and the setup-call link):

- **You're a manager, not an owner:** the owner's name as Google lists it; "Send them a one-tap link" by email or WhatsApp. The owner's link opens a short page where they tap "Connect with Google" themselves.

- **Needs verifying:** the verification helper (K-95): what Google may ask, the video checklist with a 20-second example, "Never share your code with anyone, including us".

- **Google is reviewing:** "Up to 5 business days. We'll email you when it's done." A progress line with the date the review started.

- **Suspended:** causes, evidence checklist and Google's reinstatement link (K-96). "No charge while your profile is suspended."

- **Someone else owns it / I lost the login:** three cards: "I lost my Google login" (account recovery), "An old employee or agency has it" (ready message asking them to make you owner), "I don't know who has it" (Request access, then a reminder after 7 days) (K-97).

- **No profile in this account:** "Try another Google account" first, then "Search for my business on Google".

- **Not eligible:** an honest stop with the reason, no trial taken (K-98).

**The "add Kabsi as manager" guide (manual route).** Most owners manage Google on a phone and have never seen this screen, so the guide does the work:

- **Format:** one step per card (not a marketing carousel), swiped or tapped forward, each with a real annotated screenshot for the owner's device: phone screenshots on a phone, desktop on a computer, with a "Show me the other version" switch. The exact button is circled in yellow. Five cards: open your Business Profile (button "Open my Google listing" goes there in a new tab); tap the three-dot menu, then Business Profile settings; People and access; Add; paste Kabsi's ID, choose Manager, Invite.

- **On top:** a silent 20-second loop of the same five steps (a cut of website video W3), for owners who prefer to watch.

- **Kabsi's ID:** shown large with a Copy button that confirms "Copied"; the field also accepts a long-press paste on phones.

- **Live status:** a pill under the cards: "Waiting for your invitation. We check every 30 seconds." It turns green, "Invitation received. You're connected", and moves on automatically.

- **Exits:** "Send these steps to my other device" (email or WhatsApp link, because many owners manage Google on a different device), "Someone else manages my Google listing" (ready message), "Book a free setup call".

- **Keeping it true:** screenshots carry the date they were taken and are re-checked every month and whenever Google changes the screen; a small "Screens look different?" link opens the setup call. Screenshots come from a Business Profile Kabsi's team manages, with that business's details blurred, are shown unaltered except for the highlight, are used only in onboarding and help, and are never used in ads.

Then the first Home screen with the first prepared items, and a banner: "Your 14-day free trial has started. No card needed." Plan choice moves to the end of the trial.

**While waiting for access** (it can take minutes to a day), Home shows the snapshot, the five questions if skipped, and a calm status: "Waiting for your invitation. We'll email you the moment it arrives." If the profile is being verified, reviewed or reinstated, Home shows that scenario's status instead, with "Your free trial starts when Google is ready, so you don't lose any days." Never an empty dashboard.

**Help on every onboarding step: Nora and the setup call together (audit K-111).** One small "Need a hand?" chip sits under each step's main button, the same place on every screen. It never covers the screen or pops up uninvited.

- **Tapping it opens a sheet** (bottom sheet on phones, side panel on desktop) with three options, in this order:

  1.  **Ask Nora:** three suggested questions for that exact step ("Where is People and access?", "I don't see Manager", "Is it safe to add Kabsi?"), plus a free-text box. Nora already knows the step and the owner's profile state, so the owner never explains it.

  2.  **Watch it:** the step's 20-second clip.

  3.  **Book a free 15-minute setup call:** "Screen share, no camera needed. A real person does it with you."

- **Nora steps in once, only when someone is stuck:** after 3 minutes on the manual invite step without the invitation arriving, after a failed access check, or when a scenario screen opens (not verified, suspended, someone else owns it). A single line appears above the chip: "Stuck? I can walk you through it, or book a free setup call." It does not repeat on that step.

- **Before sign-up** (find your business, snapshot) the chip offers Nora only, with questions like "What does Kabsi do?" and "Do I need to give my password?"; the call option appears from the Google access step on.

- **Look:** Nora's mark is the yellow Kabsi dot (no face), labelled "Nora, Kabsi's assistant" with a small "AI" tag. Messages use the same cards, type and colours as the rest of onboarding; one suggested-question style; the call option uses the secondary button, so the step's own yellow button stays the only primary action.

- **Rules:** Nora never asks for a Google password or verification code and says so if asked; it answers only from the facts file and the owner's live onboarding state (K-104); when it cannot solve the problem, it offers the call instead of guessing.

- **Measure, per step:** how often help opens, how many owners finish the step after a Nora answer, and how many book a call. A step where many owners need help is a step to redesign.

**Copy rules for onboarding:** one sentence per instruction, buttons that say what happens ("Copy group ID", "I've sent the invitation"), and reassurance next to every scary moment: "Kabsi can't see your password", "You can remove Kabsi any time".

**Free setup call (audit K-89).** Every trial user and customer can book a free 15-minute call with Rashid to connect Google (phone or video, screen share, no camera). Design it into the product, not as a pop-up:

- Onboarding "Give Kabsi access" step: a secondary link under the main instructions, "Stuck? Book a free 15-minute setup call", opening the booking page in a sheet so the owner does not lose their place. Show it again after 3 minutes on the step or after a failed access check.

- A /setup-call page with the embedded booking calendar, one paragraph on what happens on the call ("we guide, you click; we never ask for your Google password"), and the support address.

- Pricing page FAQ ("Do you help me set it up?"), footer, contact page, and Nora's handoff.

- Welcome email and the day-2 email to trials without Google access: one plain link, "Book a free setup call".

**Video on the site (video plan, W1 to W5).** W1 "Kabsi in 60 seconds" under the homepage hero and on the Meta landing page, click to play with a poster image; three silent feature loops in the homepage features section; W3 "Connect your Google profile" on the onboarding access step and in the welcome email, ending on the setup-call link; W4 "How Kabsi works with you" on the About and pricing pages; W5 on the Partners page once the partner workspace exists. No video autoplays with sound or loads before the visitor presses play (speed rules in the growth playbook).

**Partner call with Rashid (audit K-105).** Agencies, freelancers and resellers can book a 20-minute call with Rashid. Place "Talk to Rashid" as the secondary button in the Partners page hero and again beside the partner FAQ, on the partner application confirmation page, in the partner dashboard's help menu, in the resale section of the pricing page and in the footer ("For agencies: talk to Rashid"). Show his name and role with Kabsi's mark, no photo.

**Emails (audit K-102).** Every email uses the current template: sand background, one white card, the Kabsi mark, a heading, the content, one yellow button with black text, the approval promise, the footer. Add: the business name first in the subject, a preview line, the content exactly as it will appear on Google (photo, text, button label, expiry), a secondary "Edit first" link, the legal seller and postal address, "Email settings" with a toggle per type, a plain-text version and a dark-mode-safe logo.

**One design system everywhere (audit K-108).** The marketing site, app, onboarding, emails, Weekly Care Report, Nora's widget, help pages, status page, Calendly booking pages, Creem checkout and invoices, social templates and video end cards all use the same tokens: black, carbon, sand, one yellow for the action, green for done, red only for real problems; Lalezar for display titles and Readex Pro for everything else. Tokens live in one file; Tailwind allows no values outside it; third-party pages get Kabsi's logo and colours in their branding settings where their plan allows (Calendly stays on its free default look for now); key pages are screenshot-checked on every deploy.

## Visual direction, comparison and guides (final, audit K-110)

**Principle: calm, confident, product-led.** Kabsi sells relief from a chore, so the site should feel quiet and certain, not busy. The real product is the hero visual everywhere: the Kabsi approval card (review in, draft ready, Approve, green "Published") is the one recurring image across ads, site, app and emails. Most visitors arrive from a Reel on a phone, inside Meta's in-app browser, so every visual choice is judged by one test: does it make the page clearer and faster on a phone?

**Decisions for every surface**

| Element      | Decision                                                                                                                                                                                        | Why                                                                                                             |
|--------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------|
| 3D           | None, anywhere                                                                                                                                                                                  | Heavy on phones and in Meta's in-app browser, looks like a generic AI site, and shows nothing about the product |
| Hero motion  | One looping animation of the approval card on a phone (review arrives, draft appears, Approve, green "Published"), built in CSS and SVG, under 60 KB, plays twice then rests on the final frame | It shows the whole product in 6 seconds without a video player                                                  |
| Other motion | Elements fade and rise 8 px once as they enter the screen; buttons and cards respond in 150 to 250 ms; nothing loops except the hero; all motion off for reduced-motion settings                | Motion should explain or confirm, never decorate                                                                |
| Not used     | Parallax, scroll-jacking, cursor effects, counters that count up, carousels on marketing pages, autoplay video with sound                                                                       | Each one slows the page or hides content on phones                                                              |
| Icons        | One set only (Lucide, already in the stack), 1.75 px stroke, 20 or 24 px, black or carbon; never mixed sets, never emoji in the interface                                                       | Consistency reads as quality                                                                                    |
| Photography  | Warm, natural-light scenes of real-looking small businesses: hands, counters, phones face down, no posed smiles at the camera; one art direction across hero, industry and guide images         | Matches the Reels and the brand's calm tone                                                                     |
| Illustration | None, except the simple instructional drawings in onboarding and guides                                                                                                                         | Generic illustration makes SaaS sites look alike                                                                |
| Colour       | The design tokens only (K-108): black, carbon, sand, yellow for the one action per screen, green for done, red only for real problems                                                           | One yellow button per screen tells people what to do                                                            |

**By page type**

- **Meta landing page** (where every ad points; G-26): one scroll, five sections, nothing else. (1) Hero: headline that repeats the Reel's hook, then the line "Kabsi looks after your business on Google: a reply ready for every new review, your hours and details kept right, and fresh posts. You just approve.", the phone animation, "Start free" with "14 days free. No card. \$19 a month after." (2) How it works in 3 steps. (3) What Kabsi does, in four plain cards named the way owners think: "Your reviews" (a reply ready for each one, and easy ways to ask for more), "Your details" (hours, phone and info kept right, holiday reminders, alerts if Google changes something), "Your posts and photos" (fresh updates ready to approve), "Your week" (one short report of what Kabsi did). (4) Trust: you approve everything, not affiliated with Google, a free setup call with a real person, cancel any time. (5) Five FAQs and the final button. A sticky "Start free" bar on phones after the first scroll. No navigation menu, no comparison table, no guides links. Under 2.5 s to show the hero on a mid-range phone.

- **Homepage:** the same story with room for the industry links, the W1 video, the three ways to compare (below) and the partner link. Still one primary button per section.

- **Dashboard and app:** no decorative motion at all. Only state changes: skeleton loading, a green check when something is approved or published, short confirmation toasts. Mobile shows the decision; desktop can show more detail.

- **Guides:** a reading layout (680 px column, 18 px body text), real annotated screenshots, numbered steps, one callout style, no animation.

- **Emails:** the template in K-102.

**Comparison: yes, but in the right place.**

- **Meta landing page:** no comparison. Someone who just watched a Reel needs to know what Kabsi is, how it works, what it costs and how to start; a table of competitors adds reading and introduces brands they had never heard of.

- **Homepage:** a simple three-column block, "Three ways to look after your Google profile": Do it yourself (free, takes your evenings, easy to forget), Hire an agency (about \$200 to \$500 a month), Kabsi (\$19 a month, drafts everything, you approve). No competitor names.

- **Search and AI answers:** separate, factual comparison pages linked from the footer and the facts page: "Kabsi vs Google's free Gemini tools in Business Profile" first (the comparison owners and AI assistants actually make), then Kabsi vs Birdeye and Kabsi vs Podium. Each is fair (says where the other product is the better choice), dated, sourced from the competitor's own pages, and rechecked every quarter. Comparative claims must be true and current, so no figure appears without a source and a date.

**Guide article template** (growth decision G-45):

1.  Title as the question owners search ("How do I verify my Google Business Profile?").

2.  Byline: "Kabsi team, reviewed by Rashid Abou Hamzy", with "Published" and "Updated" dates and "Checked against Google's help pages on \[date\]".

3.  A 40 to 60 word direct answer first (G-08).

4.  Numbered steps with real annotated screenshots for phone and desktop.

5.  "Common problems" with the fix for each.

6.  One inline box after the steps: the matching free tool (review link generator or Profile Check) or "Kabsi can do this for you", never both.

7.  Three to five FAQs, a link to Google's own help page, related guides.

8.  End block: "Let Kabsi look after this. 14 days free, no card." One button.

## Owner dashboard

The app is built well underneath but looks like a dashboard: a score, rating charts, a "Do now" list, a plan card and quick actions all compete on Home. The owner should open Kabsi and know in two seconds whether to do anything. Every screen below is designed at 390 px first.

(Image omitted in the repo copy; see the original .docx in the Claude project.)

owner Home on a phone · 2 states

On a normal day the owner sees only the green state; the amber state shows at most three cards, each resolved with one tap. In the built app the primary buttons are Kabsi yellow; this drawing uses neutral colours.

**App shell.** Phone: bottom bar with Home, Reviews, Profile, Content, More. Desktop: left sidebar with the eight sections from the audit (K-03), business switcher at the top, "Need a hand?" with WhatsApp and email at the bottom. Header strip on every screen: business name, a green, amber or red dot for the Google connection, and "Checked 14 minutes ago".

| Screen                   | Purpose                        | Layout and key content                                                                                                                                                                                                                                                                                                      |
|--------------------------|--------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Home                     | "Do I need to do anything?"    | Greeting with business name. One big state: green "You're all caught up" or amber "2 things need you". Up to 3 action cards. Then "What Kabsi did this week" as a short feed. Then one line of customer activity ("217 people used your profile this month"). Remove the Profile Score, rating chart and quick-action tiles |
| Action card (everywhere) | Resolve in seconds             | What happened, one line why, the prepared item, one yellow primary button, one secondary, "History" link. Before and after stacked, never side by side                                                                                                                                                                      |
| Reviews                  | Answer reviews                 | Filter chips (Needs reply, All, Positive, Neutral, Negative, High risk). Full-screen card per review on phone, swipe to the next. Status labels: Draft ready, Published, Being checked by Google, Rejected by Google                                                                                                        |
| Get Reviews              | Free review tools              | Link with Copy, QR download, printables, share message, "Link activity" chart labelled clearly as not reviews                                                                                                                                                                                                               |
| Google Profile           | See and fix details            | One row per field: what Google shows, what you approved, status pill, last checked. "What needs attention" list at the top. Google Protection status line                                                                                                                                                                   |
| Content                  | Photos and updates             | Two tabs. Photos: big "Add photos" button using the camera, gaps ("No recent exterior photo"), queue with quality notes. Updates: month calendar, "Approve the month" button                                                                                                                                                |
| Insights                 | How customers use your profile | Headline number, four tiles (calls, website, directions, views) with change against last month, weekly reports archive, "See details" for charts and search terms                                                                                                                                                           |
| Business Knowledge       | What Kabsi knows               | Grouped facts with status: Verified, Needs your OK, Out of date. "Kabsi asks one question at a time" card at top. Voice and rules group                                                                                                                                                                                     |
| Settings                 | Account                        | Team and roles, notifications, plan and billing, approval rules for partners, Disconnect Kabsi from Google (clearly visible, not hidden)                                                                                                                                                                                    |

### Get Reviews, redesigned (audit K-109)

The current page puts everything on one long scroll: the link, a bare QR code, five near-identical message boxes, NFC writer instructions, a test card and a code field. An owner who wants one thing ("something to put on my counter") has to read all of it, and what they print is a plain QR code that looks unfinished next to their menu. The new page asks one question first, "Where will customers see it?", and turns the printed piece into a finished, branded product.

**Layout: one header, three tabs.**

- **Header (always visible):** the review link with Copy, the QR, opens in the last 7 and 30 days, and one line: "Ask every customer the same way. Never offer a reward." The rule appears once, here, instead of three times down the page.

- **Tab 1, Print (default):** the print designer below.

- **Tab 2, Share:** one card with a channel picker (WhatsApp, SMS, email, email signature, receipt line) instead of five stacked boxes. The text is editable, the link is already in it, and the buttons do the job: "Open in WhatsApp" (opens WhatsApp with the text filled in), "Copy".

- **Tab 3, Cards and tags:** Kabsi cards and the owner's own NFC tags, each with its code, opens and on/off switch; "Add a Kabsi card" at the top; "Program your own NFC tag" folded into a short how-to that opens on tap. The ready-made Kabsi card offer appears only where fulfilment exists (Lebanon today, audit decision on NFC).

**Placements instead of "Create another link".** Every printed or shared item gets its own short code automatically ("Counter card", "Table tents", "Receipt", "WhatsApp"), so the header can show which placement is opened most. Owners never manage links by hand; they can rename or switch off a placement.

**The print designer.**

1.  **Choose a format** (picture tiles): table tent (A6, folds to stand), counter stand card (A6 or 10 x 15 cm), window or door sticker (10 cm round), A5 counter sign, A4 poster, business-card size (85 x 55 mm) for bags and receipts.

2.  **Make it yours:** upload a logo (or use the business name in Lalezar), pick an accent colour (six presets plus one taken from the logo), choose a headline from an approved list, add an optional short line (40 characters), in English at launch (other languages later, K-119).

3.  **Preview** at real size on screen, with the QR live.

4.  **Get it:** a print-ready PDF (vector, 3 mm bleed and crop marks, for any print shop), a "Print at home" A4 sheet with several copies and cut lines, and a PNG for screens and social posts.

**Fixed in every design, not editable:** the QR code (at least 3 cm wide, high error correction, quiet margin around it, dark on light only), the short link printed under it as a fallback, "Scan with your phone camera" (and a tap icon on NFC versions), and a small "Opens our Google review page". No Google logo or Maps imagery (trademark), and no five-filled-stars graphic, which reads as asking for five stars.

**Approved headlines** (the list grows only through review): "How did we do? Tell us on Google" · "Your review helps us grow" · "We read every review" · "Share your experience on Google", in English at launch; versions in other languages are written by native speakers when those languages launch (K-119). The optional short line is checked as the owner types and blocks reward or rating words (discount, free, gift, win, prize, 5 stars, only if happy) with a plain explanation.

**Templates:** three looks, each in every format: Clean (white, accent band, logo top), Bold (accent background, large headline), Minimal (sand, black type). All built from the design tokens (audit K-108) so they look like one family with the owner's brand inside it.

**Kabsi credit line:** every print has "Made with kabsi.co" in 6 to 7 pt grey along the bottom edge, never near the QR or headline. A toggle under the preview ("Show 'Made with kabsi.co'") removes it on any plan, including the trial. Prints made from a partner or agency workspace never show it.

**First visit:** a three-step guide replaces the long page: "Where will customers see it?" (format tiles), "Make it yours" (logo, colour, headline), "Download and print". Afterwards the page opens on the tabs.

**States every screen needs:** loading (skeletons, not spinners), empty (one sentence of what will appear and when, never a blank card), error ("Kabsi couldn't load this. Your information is safe." with Retry), disconnected (red banner on every screen with the fix), concierge ("A person on our team posts what you approve, within one working day").

**Copy in the app:** Kabsi in the third person ("Kabsi prepared a reply"), owner as "you", buttons as verbs (Approve, Edit, Keep my information). Remove all module names and the words "Profile Score", "Do now", "drafts" (say "replies ready"), "revert" and "sync".

**Additions from a live profile review (audit decisions K-77 to K-85).** These change three screens and the free tool:

- **Google Profile:** add rows for opening date, extra hours (delivery, brunch and others the category offers), social profiles, and the chat button, with a WhatsApp prompt for Middle East businesses. Attributes appear in Google's own groups as yes or no questions; the "From the business" identity group is optional and never suggested. A name change by Google shows why Google made it, and recommends "Google is right" when the old name broke Google's naming rules.

- **Content:** Photos gets a "Cover and logo" strip at the top, showing the preferred cover photo and logo with their status, and accepts short videos. Updates offers three types (Update, Offer, Event), each with its own simple form.

- **Insights:** photo and video view counts where Google provides them.

- **Free Google Profile Check:** lists only what Google's public data shows: missing hours, website or phone, and few photos. The owner's own description, photo dates, which photo is the cover, social links, the chat button and whether reviews have replies are not in Google's public data, so they appear only after the owner connects Kabsi.

## Partner dashboard

Today /partner is a billing page: a table of businesses with status and card taps, invites, invoices and cards. It becomes the agency's daily workspace, designed for a laptop first because agencies work at desks, and usable on a phone.

**Layout.** Left sidebar: Portfolio, Approvals, Reports, Clients, Earnings, Settings (brand, team, payout). Top bar: agency name and logo, search across clients, "Add client" button in yellow.

| Screen           | Content                                                                                                                                                                                                                                                                                                                                                                          |
|------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Portfolio (home) | A row of count tiles that filter the list below: Need attention, Approvals waiting, Disconnected, Profile issues, All caught up. Client list with one row per business: name, city, Google connection dot, replies waiting and age of the oldest, open profile tasks, last photo, last update, activity trend arrow, plan, onboarding step. Sort by "needs attention" by default |
| Client view      | The owner's Kabsi, with a banner: "Viewing Café Younes as Agency X. You can: prepare everything, approve replies." Permissions shown in plain words                                                                                                                                                                                                                              |
| Approvals        | One queue across all clients, filtered by type and client. Bulk approve for items the partner is allowed to approve; "Send to client" for the rest                                                                                                                                                                                                                               |
| Reports          | Weekly or monthly client reports with the agency logo, schedule per client, preview and send                                                                                                                                                                                                                                                                                     |
| Clients          | Add client (search Google Places, enter the owner's email or copy a WhatsApp invite), onboarding progress per client with "Nudge" button, approval rules per client                                                                                                                                                                                                              |
| Earnings         | Referred accounts, trials, paid, monthly commission or resale margin, payout status, invoice download                                                                                                                                                                                                                                                                            |

**Empty state for a new partner:** a three-step checklist (add your brand, add your first client, send the first report) and a sample client so the workspace never looks empty, labelled "Example".

**Visual difference from the owner app:** same components, denser tables, sand background, a small "Partner" label beside the logo so screenshots in sales calls are recognisable.

## Emails

For most owners, Kabsi's emails are the product: they will see the inbox more often than the app. Each email does one thing, reads on a phone in five seconds, and has one button.

| Email                       | Subject line                                    | Body                                                                                                    | Button                                       |
|-----------------------------|-------------------------------------------------|---------------------------------------------------------------------------------------------------------|----------------------------------------------|
| New review, reply ready     | "Sarah left 5 stars. Your reply is ready."      | Stars, the review, the prepared reply, one line "Nothing is posted until you approve."                  | "Review reply" (opens the confirmation page) |
| High-risk review            | "A review that needs a little more care"        | The review, why it is flagged, no draft, a short checklist                                              | "Open in Kabsi"                              |
| Google changed your details | "Google now shows different Sunday hours"       | Your approved value and Google's value, stacked                                                         | "Review the change"                          |
| Photos ready                | "3 photos are ready for Google"                 | Thumbnails with quality notes                                                                           | "Review photos"                              |
| Updates ready               | "Your October updates are ready"                | First lines of each update                                                                              | "Review updates"                             |
| Holiday reminder            | "Are your hours different on \[holiday\]?"      | Three tappable answers: same as usual, closed, different hours                                          | Each answer is a link to a confirm page      |
| Weekly Care Report          | "Kabsi took care of 8 things this week"         | Structure from audit K-28: headline count, reviews, profile, content, customer activity, what needs you | "Open your week"                             |
| Disconnected                | "Kabsi can no longer reach your Google profile" | What it means, how to fix in two steps                                                                  | "Reconnect"                                  |
| Trial ending                | "3 days left in your free trial"                | What Kabsi did so far (counts from the audit log), price, what happens if they do nothing               | "Keep Kabsi"                                 |

Design: Kabsi logo, white card on sand, one yellow button, plain-text version always included, no images required to understand it. Sender name "Kabsi for \[Business name\]" so the owner recognises it. Today the sending domain is send.kabsi.co; moving to the root domain with SPF, DKIM and DMARC aligned (already planned) is the biggest single fix for inbox placement.

The button on approval emails never says "Post": it opens the confirmation page where the owner approves, which keeps link scanners from approving anything (audit K-17).

## SEO, AI search and measurement

The SEO groundwork is better than most early sites (sitemap, JSON-LD, llms.txt, industry pages, guides), but it all sits on kabsi-app.lovable.app. Search engines and AI assistants credit the domain, so every page built there now is building someone else's address.

**Fix first: move to kabsi.co.** The steps are already listed in KABSI-STATE (site URL, sitemap, robots, llms.txt, Supabase redirect URLs, Worker origin). Add 301 redirects from every lovable.app path, then submit the new sitemap in Search Console.

**Search targets, by page:**

| Page             | Main phrase                                                                                 | Supporting phrases                                 |
|------------------|---------------------------------------------------------------------------------------------|----------------------------------------------------|
| Home             | Google Business Profile management for small business                                       | reply to Google reviews, Google business assistant |
| Review link tool | Google review link generator                                                                | Google review QR code, free review link            |
| Profile Check    | Google Business Profile checker                                                             | check my Google listing                            |
| Industry pages   | Google reviews for \[restaurants, dentists, salons\]                                        | how to reply to \[trade\] reviews                  |
| Guides           | how to reply to Google reviews; why did Google change my hours; set holiday hours on Google | negative review reply examples                     |
| Arabic pages     | <span dir="rtl">الرد على تقييمات جوجل</span>                                                | <span dir="rtl">إدارة حساب جوجل للأعمال</span>     |

Every page: one H1 with the main phrase, a title under 60 characters, a description under 155, FAQ schema where there are questions, Organization and SoftwareApplication schema on Home and Pricing, Open Graph image per page showing the Kabsi card, and hreflang once Arabic exists.

**AI search.** Assistants answer "what's a cheap tool to reply to Google reviews" from clear, factual pages. Keep llms.txt and llms-full.txt current with prices and the Gemini comparison; publish a plain "Kabsi facts" page (what it does, price, countries, languages, what it does not do) that assistants can quote.

**Measurement.** PostHog is installed. Define one funnel and look at it weekly: landing page, Start free clicked, account created, business chosen, snapshot seen, invitation sent, access granted, first approval, trial converted. Add events for both free tools (searched, result shown, email captured, Start free clicked). Tag every link from ads, partners and the Lebanese field team with UTM codes so each channel's cost per paying customer is known before the \$1,000 a month ad budget is spent.

## Build order

Do the changes that raise conversion and remove contradictions first; leave the big redesigns for after the audit's P0.1 foundations. Most of the first batch is copy and can be done in Lovable in days.

| Order | Change                                                                                                             | Effort | Why now                                           |
|-------|--------------------------------------------------------------------------------------------------------------------|--------|---------------------------------------------------|
| 1     | Move the site to kabsi.co with redirects                                                                           | Small  | Every day on lovable.app is lost search credit    |
| 2     | One call to action "Start free" with "14 days. No card." everywhere                                                | Small  | Three labels today; "early access" lowers intent  |
| 3     | New hero copy and slogan; remove Profile Score, Listing Shield and "weekly post" wording site-wide                 | Small  | Site describes things the audit removed           |
| 4     | Remove the group ID from the homepage; move it into onboarding                                                     | Small  | Scares cold visitors                              |
| 5     | Fix pricing: no NFC hero outside Lebanon, plain-outcome feature list, visible guarantee box, broken image alt text | Small  | Pricing page sells the wrong product abroad       |
| 6     | Card payments live                                                                                                 | Medium | Required before any paid ads outside Lebanon      |
| 7     | Onboarding reorder with the free snapshot before the invite, reminders and setup call                              | Medium | Largest drop-off point                            |
| 8     | Partners page rewrite for agencies                                                                                 | Medium | Current promise contradicts the new partner model |
| 9     | Founder note, About rewrite, Security page lead                                                                    | Small  | Only honest proof available today                 |
| 10    | Google Profile Check tool                                                                                          | Medium | Best lead magnet; reuses the onboarding snapshot  |
| 11    | Homepage rebuild (13 sections), new hero visual and approval animation                                             | Large  | After the copy changes prove the message          |
| 12    | Owner app Home and screens per this document                                                                       | Large  | Built with the audit's P0.3 core loop             |
| 13    | Partner workspace                                                                                                  | Large  | Built with the audit's P1                         |
| 14    | Arabic site                                                                                                        | Medium | Before Gulf marketing                             |
| 15    | Email redesign and root-domain sending                                                                             | Medium | With the Weekly Care Report rebuild               |

Items 1 to 5 and 9 should ship before the Meta ads start. Nothing on the site may claim a feature before it works: if Google Protection or the Profile Check are not live, their sections stay off the page or carry "Coming soon".
