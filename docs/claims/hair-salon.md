# Claim sheet: hair salon

Page `/for/hair-salon`, file `src/content/industries/hair-salon.ts`. Written by Web 4c on 2 Nov 2026 from Design 8
(kabsi-design-studio `src/components/kabsi/d7-trades.ts`, lane R's approval of 1 Nov 2026), before the page was
indexed (lane R decision 8). Source IDs (G, H, K, P) are in `README.md`; the link is repeated on each row. Example
business: Hollis Hair, Bristol (invented, labelled Example on the page).

The page before Web 4c (Rose Lane Salon, Dubai) had no claim sheet; it is retired with this one.

## Rows

| # | Sentence on the page | Type | Source | What the source says |
| - | -------------------- | ---- | ------ | -------------------- |
| 1 | Lead: "New stylists announced, your colour work as posts, holiday hours asked in time, and a reply that thanks the stylist by name. You approve each one." | K | knowledge/kabsi-facts.md 7.4, "Posts" and "Holiday hours" (decisions block) | Team names let replies thank the right stylist; Kabsi prepares posts from what is true; it asks five days before a public holiday; nothing goes to Google without the owner's approval. |
| 2 | Hero message (Example): "Amber starts on Tuesday. Post ready: 'New to the team: Amber, colour and balayage, from Tuesday.'" with Yes, Edit, Skip | A, K | K facts "Posts" | An invented message. Posts wait for the owner's Yes, Edit or Skip. |
| 3 | "Google can show each service with a price and a short description" | G | https://support.google.com/business/answer/9455399 (G6) | "You can add info such as price and description." |
| 4 | Job title "Services missing from your profile, listed" and "Kabsi's Profile Coach lists the services your profile is missing, so you know what to add on Google." (Go live 1, B-015: was "New services, with a price and a line each", which read as work Kabsi does next to row 23's "Not yet") | K | knowledge/facts/04-product.md (Profile Coach, P0.8-09 part A) | Profile Coach lists what a complete profile has and what yours is missing, "more categories, services and" more; "Services and profile details are listed in the checklist; filling them in on Google comes later." |
| 5 | "When someone joins, add the name to your team list so replies can thank them. A post that says who joined can go up once you approve it." | K | K1 7.4; facts "Posts" | "Add team names so replies can thank the right stylist." The owner can write a post (Write a post) and every post waits for approval. No post is made by adding a name (review finding). |
| 6 | "Kabsi uses only the names on your team list, so a stylist who left is never thanked once you take their name off the list." | K | K1 7.4 | "names not on the list are never used." The second half is the consequence of removing a name. |
| 7 | "A colour you are proud of becomes a post with your photo, checked first, ready for your yes." | K | facts "Photos" and "Post checks" | Photos are checked in Kabsi's own code (dark, blurry, smaller than 720 by 720, a likely repeat); posts wait for approval. |
| 8 | "Five days before each bank holiday Kabsi asks what you will do" | K | facts "Holiday hours (live from 21 Oct 2026)"; K2 | "Five days before a public holiday Kabsi asks the owner ... normal hours, closed, or custom hours." England and Wales from GOV.UK. |
| 9 | "so nobody arrives on Boxing Day to a closed door" | A, T | https://www.gov.uk/bank-holidays (H1) | Boxing Day is a bank holiday in England and Wales. The rest is the reason. |
| 10 | Searches: hair salon near me, hairdressers, balayage, hair colour near me, blow dry | A | none | Shown as examples of what people type ("Searches like these"), with no volume. The free check term is "hair salon" (the trade's name). |
| 11 | "People choose a salon by the work they see and the stylist they read about. They search for a salon nearby or for the service itself, then look at photos, services and replies." | A | none | Wording about why the page shows these searches. No figure or share is claimed. |
| 12 | Free check example: Website Missing, Opening hours Shown, Reviews 38 rated 4.8, Photos 10 or more | A, K | src/lib/profile-check.ts and facts "Free Google Profile Check" | Invented values. The rows are only what the check reads from Google's public data (K-82): hours, reviews and rating, photos, website, phone, category. "10 or more": Google returns at most 10 photos. |
| 13 | "Replies, holiday hours and posts are what Kabsi checks once connected." | K | K-82; facts 2.1a | Google's public data has no reply status, special hours or posts; Kabsi reads them with Manager access. |
| 14 | "you can add services of your own" | G | G6 | "You can add custom services." |
| 15 | "Keep the price out of a custom service name, because Google rejects a name that has a price in it." | G | G6 | "Avoid including ... prices, or phone numbers in custom service names." "Custom services that violate policy will be automatically rejected." |
| 16 | "Google's name for a category can differ by country (Google's own example shows 'Hairdresser'), so read the category name in the box on your own profile." | G | https://developers.google.com/my-business/content/services (G13) | `gcid:hair_salon` shows the display name "Hairdresser" in the Singapore example. |
| 17 | "When a stylist joins, two things change on Google: what you offer and who clients will ask for." | A | none | Wording. |
| 18 | "Google lets you add your own link to your Business Profile, so clients can book straight from it." | G | https://support.google.com/business/answer/7475773 (G12) | "You can also add your own link to your Business Profile." |
| 19 | "A link that points at an old booking tool sends a ready client to an error page, so check it each time you change tools." | A | none | Advice. Kabsi does not edit the booking link (facts: the order and booking button is [COMING]; "services and the booking link are not edited by Kabsi yet"). |
| 20 | "Google asks for photos in focus and well lit, without significant alterations or excessive filters" | G | https://support.google.com/business/answer/6103862 (G8) | "The photo should be in focus and well lit, and have no significant alterations or excessive use of filters." |
| 21 | "Kabsi checks each photo before it goes to Google and tells you when one is dark, blurry or too small." | K | facts "Photos (live from 21 Oct 2026)" | "This photo is dark.", blurry, "smaller than Google's 720 by 720 pixels". |
| 22 | "Before every bank holiday, Christmas included, Kabsi asks what you will do and sets special hours once you say yes." | K, T | facts "Holiday hours"; H1 | Christmas Day is a bank holiday in England and Wales; closed and custom answers become special hours after the owner confirms. |
| 23 | FAQ "Can Kabsi add a new service to my Google profile?" "Not yet. Kabsi's Profile Coach lists the services your profile is missing; adding them on Google for you comes later." | K | facts 04 (Profile Coach) | "filling them in on Google comes later." |
| 24 | FAQ "Will a reply thank the right stylist?" | K | K1 7.4 | As rows 5 and 6. |
| 25 | FAQ "Does Kabsi work with my booking system?" "No. Kabsi works only with your Google profile." | K | facts 7.5 ("Kabsi works with Google only, not booking sites") | Kabsi connects to Google only. |
| 26 | FAQ "Can my salon manager approve instead of me?" "On Pro, yes. You choose who can approve replies and posts, and you still see everything." | K | facts 2.1d; facts 4.1 comparison (team roles on Pro) | "Who can approve, per kind ... by default only the owner. The owner can turn a kind on to let managers approve it too." Team roles are Pro. |
| 27 | Hollis Hair, Bristol; Amber; Juniper Hair Studio; Lark Salon | A | none | Invented, labelled Example. |

## Changed from Design 8 to the facts (lane R decision 1)

- Design 8's hero message ("Add her colour services to your Google profile and post it?"), the job "A booking link that
  works", the FAQ answers "Yes, after your yes" (services) and "It keeps the booking link on your profile right", and
  the guide's "Kabsi tells you when the link is missing and changes it after your yes": Kabsi does not edit services or
  the booking link yet (facts 04; the order and booking button is [COMING]). Rewritten as rows 2, 4, 19, 23 and 25.
- "flags one where a face fills the frame": the facts' photo section says Kabsi does not look for faces yet (the AI
  model is off). Rewritten as row 21. (facts 7.4 still says faces are flagged; LATER row to settle the two.)
- The free check example rows "Booking link Missing", "Bank holiday hours Not set", "Reviews with no reply": not in
  Google's public data (K-82, lane R decision 10). Row 12.
- Lead and title: "a booking link that works" and "new services" left out for the same reason.

## Left out

- Any figure about how often clients book from a profile. No source was read.
- A list of Google categories for hair salons beyond the note in row 16.

## Industries 3 (5 Nov 2026): the short lines

The page was cut to master plan 30.33 item 2. Each line below replaces longer text and keeps a fact of the rows above.

| Field       | Line on the page                                                                                                                                   | Row(s) above | Type       |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | ---------- |
| page.answer | "For a hair salon Google Business Profile, Kabsi drafts every reply, turns colour work into posts and asks about holiday hours, all for your yes." | 1, 7, 8      | K          |
| profile     | "Services with a price": "Each service can carry a price. Google rejects a custom name that has one."                                              | 3, 15        | G          |
| profile     | "A new stylist on the team": "Add them to your team list. Reviews that name them get a reply thanking them."                                       | 5, 6, 24     | K          |
| profile     | "The booking link": "Google lets you add your own link. Check it each time you change tools."                                                      | 18, 19       | G, A       |
| profile     | "Photos true to the chair": "Google asks for photos in focus and well lit. Kabsi checks each one first."                                           | 20, 21       | G, K       |
| page.jobs   | "A reply for every review": "Thanks Amber when a review names her, using only names on your team list."                                            | 6, 24, 27    | K, Example |
| page.jobs   | "Bank holiday hours": "Kabsi asks five days before each bank holiday and sets your answer after your yes."                                         | 8, 22        | K          |

Removed from the page: the two long guide sections (custom services of your own, the category name by country, the
reason a stylist matters, the Christmas line, the dark, blurry or too small detail), and the daily details check from the
answer. The old tasks were not shown and are deleted.

### Industries 3: fixed after the independent check (5 Nov 2026)

- Answer: "prepares review replies" replaces "drafts every reply", because a high risk review gets no draft (facts 13, "What happens with hard reviews?").

## Industry 1 (9 Nov 2026, R-144): the new and changed lines

Lane R decision R-144: each industry page mostly its own text. New groups on this page: what the trade can list (services, as chips), the photos that work (beside the Example post), posts it can make, what customers write about, and hours and holidays, plus rewritten lines that read the same on other pages. Type and source as in README. A card title (short label) is wording only; its line carries the claim. Every new line was read against the facts on 9 Nov 2026; no number, customer claim or ranking promise was added.

| # | Where | Sentence on the page | Type | Source | What the source says |
| - | ----- | -------------------- | ---- | ------ | -------------------- |
| I1 | Card line | "Sharp, bright photos of real work. Kabsi looks at every one before Google does." | K | facts 13 "What photos can I post?"; facts 04 "Photos" | The photo check flags a dark, blurry or small (under 720 by 720) photo and a likely repeat; it does not look for faces. |
| I2 | Card title | "A stylist named in the review" | A | none | A short label for the line under it. |
| I3 | Card line | "The reply thanks that stylist, when the name is on your team list." | K | K1 (facts 09, 7.4) | Team names let replies thank the right person; names not on the list are never used. |
| I4 | Card title | "Colour that came out wrong" | A | none | A short label for the line under it. |
| I5 | Card line | "A calm draft asking the client to get in touch through your profile." | K | facts 09 (7.3, 7.6) | Drafts stay calm, never argue, admit fault or promise refunds, and ask the reviewer to get in touch through the details on the profile. |
| I6 | Card title | "A scalp reaction to dye" | A | none | A short label for the line under it. |
| I7 | Card line | "A health matter: no draft, only a short checklist for you." | K | facts 13 "What happens with hard reviews?"; README K3 | A review about health, injury, safety, a legal threat or a named team member reaches the owner with no draft and a short checklist; a neutral holding reply only if asked. |
| I8 | Card title | "Bank holidays, asked ahead" | A | none | A short label for the line under it. |
| I9 | Card line | "Five days before, Kabsi asks: normal, closed or your own hours." | K | K2 (docs/holidays.md); facts 04 "Holiday hours" | Kabsi asks five days before a public holiday: normal hours, closed or custom hours; set once the owner says yes. |
| I10 | Card title | "Christmas week 2026" | A | none | A short label for the line under it. |
| I11 | Card line | "Christmas Day is Friday 25 December; the Boxing Day holiday is Monday 28." | T | H1 | England and Wales bank holidays; a weekend holiday moves to a substitute weekday. |
| I12 | Card title | "A training day, closed" | A | none | A short label for the line under it. |
| I13 | Card line | "One day is special hours. Seven days or more is temporarily closed." | G | G4 | Special hours keep regular hours for holidays and exceptional days; up to 6 days closed fits special hours, 7 or more Temporarily closed. |
| I14 | Card title | "Colour by the window" | A | none | A short label for the line under it. |
| I15 | Card line | "Shoot the finished colour in daylight. Kabsi flags a dark or blurry one." | K | facts 13 "What photos can I post?"; facts 04 "Photos" | The photo check flags a dark, blurry or small (under 720 by 720) photo and a likely repeat; it does not look for faces. |
| I16 | Card title | "The lengths, not the face" | A | none | A short label for the line under it. |
| I17 | Card line | "The back of the head or the ends. Kabsi does not look for faces." | K | facts 13 "What photos can I post?"; facts 04 "Photos" | The photo check flags a dark, blurry or small (under 720 by 720) photo and a likely repeat; it does not look for faces. |
| I18 | Card title | "The chair and the basin" | A | none | A short label for the line under it. |
| I19 | Card line | "A photo with no words goes on as a profile photo, after your yes." | K | facts 04 (posts, photos, approvals); facts 13 | Kabsi prepares posts, photo uploads and hours from what the owner sends; nothing reaches Google until the owner approves; Kabsi never invents a price or an offer. |
| I20 | Card title | "A stylist's first day" | A | none | A short label for the line under it. |
| I21 | Card line | "Their name, what they love doing and when bookings with them open." | A | none | Advice or wording about the trade. Not a claim about the world. |
| I22 | Card title | "Colour of the month" | A | none | A short label for the line under it. |
| I23 | Card line | "One photo of the shade and one line from you." | A | none | Advice or wording about the trade. Not a claim about the world. |
| I24 | Card title | "Late nights before Christmas" | A | none | A short label for the line under it. |
| I25 | Card line | "Which evenings you stay open, once they are set as special hours." | G | G4 | Special hours keep regular hours for holidays and exceptional days; up to 6 days closed fits special hours, 7 or more Temporarily closed. |
| I26 | First category | "Hairdresser" | C | G13 (row 16 above) | The category rows earlier in this sheet (or the other sheet named there) show the name on a Google page or a live profile. |
| I27 | Line | "Hairdresser is the name in Google's own example; the label can change by country, so open your category box first." | G | G1, G2, G13 | Pick the most specific category from Google's list; Google's example shows one category under different names by country. |
| I28 | Question | "Does Kabsi work with my salon booking system?" | K | facts 04 (posts, photos, approvals); facts 13 | Kabsi prepares posts, photo uploads and hours from what the owner sends; nothing reaches Google until the owner approves; Kabsi never invents a price or an offer. |
| I29 | Answer | "No, Kabsi looks after the salon's Google profile; appointments stay in your own system." | K | facts 04 (posts, photos, approvals); facts 13 | Kabsi prepares posts, photo uploads and hours from what the owner sends; nothing reaches Google until the owner approves; Kabsi never invents a price or an offer. |
| I30 | Question | "Where does the review QR card go in a salon?" | A | none | Advice or wording about the trade. Not a claim about the world. |
| I31 | Answer | "At each station by the mirror and at reception. Hand it over the same way after every visit." | K | facts 09 (card placement, 7.1 to 7.8); facts 10 (ask everyone the same way, no incentive) | Where the review card goes for each trade; every customer asked the same way, never an incentive. |
| I32 | Service | "Cut and blow dry" | A | none | A service name a business of this kind can list (Example, not a full list); shown as chips under "What a [trade] can list". |
| I33 | Service | "Full head colour" | A | none | A service name a business of this kind can list (Example, not a full list); shown as chips under "What a [trade] can list". |
| I34 | Service | "Balayage" | A | none | A service name a business of this kind can list (Example, not a full list); shown as chips under "What a [trade] can list". |
| I35 | Service | "Highlights" | A | none | A service name a business of this kind can list (Example, not a full list); shown as chips under "What a [trade] can list". |
| I36 | Service | "Root touch up" | A | none | A service name a business of this kind can list (Example, not a full list); shown as chips under "What a [trade] can list". |
| I37 | Service | "Toner and gloss" | A | none | A service name a business of this kind can list (Example, not a full list); shown as chips under "What a [trade] can list". |
| I38 | Service | "Wedding hair" | A | none | A service name a business of this kind can list (Example, not a full list); shown as chips under "What a [trade] can list". |
| I39 | Service | "Children's cuts" | A | none | A service name a business of this kind can list (Example, not a full list); shown as chips under "What a [trade] can list". |
| I40 | Category | "Beauty salon" | C | lash-and-brow-studio.md row 4 (live profile, read 5 Nov 2026) | The category rows earlier in this sheet (or the other sheet named there) show the name on a Google page or a live profile. |
