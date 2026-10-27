# Claim sheets for the industry pages

Master plan 30.17 section 2 and 30.16 section 4: every industry page has a claim sheet. One sheet per page, in this folder,
named after the page's slug in `src/content/industries` (`barbershop.md` for `/for/barbershop`). Written by Content 1 on
26 Oct 2026. Lane R read each sheet and approved the nine pages on 27 Oct 2026 after the fixes in DESIGN-BRIEF section 18; each is `finished: true` (indexed). Section 18's fixes are marked 'round 2' in the sheets.

## How to read a sheet

Each row is one sentence a reader sees on the page, with its type, its source and what the source says.

| Type | Meaning | Needs a source |
| ---- | ------- | -------------- |
| G | A Google feature or Google's own rule | Yes: Google's help or developer page |
| C | A Google category name | Yes: a Google page or a live profile that shows the name |
| T | A fact about the trade, a country or a law (holidays, working hours, licences, labelling) | Yes: the government, regulator or trade body |
| K | What Kabsi does (our own product) | Yes: kabsi-canvas, `knowledge/facts` or `docs/reference/COPY.md` |
| S | A search term and how many people use it | Yes: `public.industry_search_terms` (DataForSEO, Google Ads volumes) |
| A | Advice or wording: what a reply or post should do, an example. Not a claim about the world | No. Marked so nobody mistakes it for a fact |

Rules this content follows:

- No sentence says how common something is in the trade ("the most common complaint", "most owners") unless a source says so.
  Where the first drafts of other pages did, this content says what a reply should do instead.
- Google category names appear on a page only when Google itself shows the name: in a Google help page, in Google's
  developer pages, or on a live Google Business Profile page (business.google.com/v/...) that displays it. A name that could
  not be shown that way is left out and listed under "Left out" in the sheet.
- Google publishes no open download of its category list (the API needs a signed-in account), so the profile's own category box is
  the final check. The sheets say so, and the page notes tell owners to read the name in their own box.
- Holiday dates come from the government pages. UAE Islamic dates follow the moon, so a page states the rule, not a date.
- Examples (Northside Barbers and the other invented businesses) are labelled Example on the page. Nothing in them is a claim.

## Source register

Checked 26 Oct 2026. "Read" means the page was fetched that day and the quoted text was in it.

| ID | Source | What it says that the pages use |
| -- | ------ | -------------------------------- |
| G1 | https://support.google.com/business/answer/7249669 | "Select a primary category that best describes your business." Pick a specific one: "Nail salon" instead of "Salon". "Do not select a category for every product or service." A grocery store might add "Bakery" and "Deli". You cannot create your own category. |
| G2 | https://support.google.com/business/answer/3038177 | "Use as few categories as possible to describe your overall core business from the provided list." "Choose categories that are as specific as possible, but representative of your main business." Service-area businesses "should have one profile" and "should hide your business address". Doctors and dentists are individual practitioners. A location "should be staffed by your team and able to receive customers during its stated hours." The page names "Auto Repair Shop" and "Tyre Shop" as categories. |
| G3 | https://support.google.com/business/answer/3474050 | You must verify your business before you reply. "Google reviews your replies." Replies "usually take up to 10 minutes to review, but sometimes a review can take up to 30 days." A reply is public under the review. "The person who wrote the review is notified when you reply." Customers can change their review after reading your reply. |
| G4 | https://support.google.com/business/answer/6303076 | Special hours keep regular hours unchanged for holidays, special events and other exceptional circumstances. "It's a good idea to confirm your hours for official holidays." Special hours fit a business closed "up to 6 days in a row"; for 7 or more days mark it Temporarily closed. Hours must be set to "Open with main hours" to show. |
| G5 | https://support.google.com/business/answer/3039617 | Set main hours or mark closed; set special hours for holidays; set more hours "if you have different hours for different features you offer". |
| G6 | https://support.google.com/business/answer/9455399 | Services can carry "info such as price and description". You can add custom services. "Avoid including profanity, gibberish, personal information, prices, or phone numbers in custom service names." Businesses "in certain categories" have the option. |
| G7 | https://support.google.com/business/answer/7342169 | Post types: Updates, Offers, Events. "Posts older than 6 months are archived unless a date range is set." Offer posts include a "View Offer" button. An update post's button "should direct customers to a website where they can complete the action". |
| G8 | https://support.google.com/business/answer/6103862 | Photos: "JPG or PNG", "Between 10 KB and 5 MB", recommended 720 by 720 px, minimum 250 by 250 px, "in focus and well lit", no "significant alterations or excessive use of filters". Video up to 30 seconds, up to 75 MB, 720p or higher. "When you add an exterior photo, it helps customers recognize your business when they visit." |
| G9 | https://support.google.com/business/answer/3474122 | "To leave reviews, you can ask customers to visit a Google link or scan a QR code." "Offering incentives, like free or discounted goods or services, in exchange for customers to post reviews" is prohibited. |
| G10 | https://support.google.com/contributionpolicy/answer/7400114 | Under Fake Engagement: "We do not allow merchants or users to: Offer incentives - such as payment, discounts, free goods and/or services - in exchange for posting any review." Content "posted due to an incentive offered by a business" is rating manipulation. |
| G11 | https://support.google.com/business/answer/4596773 | Only reviews that violate Google policies are removed. "Do not report a review just because you disagree with it or dislike it." |
| G12 | https://support.google.com/business/answer/7475773 | "You can also add your own link to your Business Profile." Booking providers "will show up on your Business Profile within a week". |
| G13 | https://developers.google.com/my-business/content/services | Shows the category `gcid:barber_shop` and `gcid:hair_salon` with the display name "Hairdresser" (Singapore example). Predefined services "might differ based on the category and country". |
| G14 | https://business.google.com/en-all/business-profile/restaurants/ | To edit a menu, sign in to your Business Profile and tap the menu option; add photos of your menu and best dishes; ordering options depend on location and provider. |
| G15 | https://support.google.com/business/answer/7213077 | The posts content policy: "To avoid fraud or abuse, we may remove posts with unverified contact information." "This includes phone numbers, email addresses, and social media handles." A Call now button "uses your verified Business Profile phone number so customers can contact you." Read 27 Oct 2026. |
| P1 | Live profile pages at business.google.com/v/..., listed in each sheet | The category label Google shows under the business name, and the services, hours, menu and booking fields shown on a profile. |
| H1 | https://www.gov.uk/bank-holidays | England and Wales bank holidays 2026 and 2027; "If a bank holiday is on a weekend, a 'substitute' weekday becomes a bank holiday, normally the following Monday." |
| H2 | https://u.ae/en/information-and-services/public-holidays-and-religious-affairs/public-holidays | Eid Al Fitr "from 1 to 3 Shawwal"; Arafah Day 9 Dhu al-Hijjah; Eid Al Adha "From 10 to 12 Dhu al-Hijjah (3 days)"; National Day "2 and 3 December (2 days)"; Hijri New Year 1 Muharram; Prophet's birthday 12 Rabi' Awwal; "Islamic holidays are determined according to moon sighting." |
| H3 | https://u.ae/en/information-and-services/jobs/Sector-of-employment/employment-in-the-private-sector/working-hours | "During the holy month of Ramadan, working hours are reduced by 2 hours, every day." Private sector workers work "8 hours per day or 48 hours per week". |
| H4 | https://www.mohre.gov.ae/en/media-center/news/12/2/2026/reduction-of-working-hours-for-private-sector-employees-by-two-hours-daily-during-the-holy-month-of | The Ministry's announcement for Ramadan 2026 (read through a search result; the page itself returned 503 when fetched). Used only to confirm that the cut is announced each year. |
| H5 | https://www.hcpc-uk.org/about-us/who-we-regulate/the-professions/ | The protected titles listed for physiotherapists are "Physiotherapist" and "Physical therapist". "The professions we regulate have one or more designated titles that are protected by law." Read 27 Oct 2026. |
| K1 | kabsi-canvas `knowledge/facts/09-industry-notes.md` (7.1 to 7.8) and `10-google-policy-and-review-best-practice.md` (8.2 to 8.6) | How Kabsi drafts for each trade; names on the team list only; photos with a face as the main subject are flagged; no phone number or link in a reply; no incentive for reviews; Managers and Owners. |
| K2 | kabsi-canvas `docs/holidays.md` | "Kabsi asks the owner five days before a public holiday: normal hours, closed, or custom hours." |
| K3 | `docs/reference/MASTERPLAN-30-15.md` sections 3.3, 3.5, 3.7 and `docs/reference/COPY.md` | The monthly question "Any new services, prices, products or opening times?"; review requests give the owner a ready message and never receive a customer's number; sensitive reviews (health, threats, legal, staff names) go to the owner with no draft; "Published" only after Kabsi sees it on Google. |
| D1 | `public.industry_search_terms` in Supabase project kabsi-prod, read with select only on 26 Oct 2026 | One pick per trade and market with its monthly search volume from DataForSEO (Google Ads), and the candidate terms checked. |

## Search term table (D1, checked_on 2026-10-26)

`volume` in the table is the monthly volume of the pick, which for some trades adds a "near me" variant (bakery 74,000 plus
bakery near me 33,100 gives 107,100 in the UAE). The candidates are the terms that were checked.

| Trade | Market | Pick | Volume | Candidates (volume) | Proposal for lane R |
| ----- | ------ | ---- | -----: | ------------------- | -------------------- |
| barbershops | AE | barber | 18,100 | barber 18,100; barber shop 12,100; barbershop 12,100; mens haircut 9,900 | Keep. |
| barbershops | GB | barber | 246,000 | barber 246,000; barber shop 60,500; barbershop 60,500; mens haircut 40,500 | Keep. |
| nail-and-beauty-salons | AE | nails | 14,800 | nail salon 6,600; beauty salon 14,800; nails 14,800; manicure 3,600 | Change to "nail salon". |
| nail-and-beauty-salons | GB | nails | 201,000 | nail salon 74,000; beauty salon 27,100; nails 201,000; manicure 18,100 | Change to "nail salon". |
| spas-and-massage | AE | spa | 246,000 | spa 246,000; massage 201,000; massage spa 27,100; day spa 260 | Keep "spa"; add "massage". |
| spas-and-massage | GB | massage | 301,000 | spa 165,000; massage 301,000; massage spa 14,800; day spa 4,400 | Keep "massage"; add "spa". |
| medical-and-aesthetic-clinics | AE | clinic | 12,100 | aesthetic clinic 1,600; medical clinic no data; skin clinic 590; clinic 12,100 | Change to "aesthetic clinic". |
| medical-and-aesthetic-clinics | GB | clinic | 14,800 | aesthetic clinic 2,900; medical clinic no data; skin clinic 5,400; clinic 14,800 | Change to "skin clinic". |
| physiotherapy | AE | physio | 9,900 | physiotherapy no data; physiotherapist 9,900; physio 9,900 | Keep "physio". |
| physiotherapy | GB | physio | 90,500 | physiotherapy no data; physiotherapist 90,500; physio 90,500 | Keep "physio". |
| cafes | AE | coffee | 201,000 | cafe 49,500; coffee shop 18,100; coffee 201,000 | Change to "cafe". |
| cafes | GB | cafe | 1,500,000 | cafe 1,500,000; coffee shop 368,000; coffee 673,000 | Keep "cafe". |
| bakeries | AE | bakery | 107,100 | bakery 74,000; cake shop 5,400; bakery near me 33,100 | Keep. |
| bakeries | GB | bakery | 696,000 | bakery 246,000; cake shop 49,500; bakery near me 450,000 | Keep. |
| auto-repair | AE | garage | 9,900 | car repair 3,600; garage 9,900; auto repair 1,000; mechanic 2,900 | Change to "car repair". |
| auto-repair | GB | garage | 135,000 | car repair 18,100; garage 135,000; auto repair 5,400; mechanic 40,500 | Change to "car repair"; add "mechanic". |
| gyms-and-fitness-studios | AE | gym | 255,500 | gym 90,500; fitness studio 140; gym near me 165,000; fitness 4,400 | Keep. |
| gyms-and-fitness-studios | GB | gym | 1,223,000 | gym 550,000; fitness studio 40,500; gym near me 673,000; fitness 22,200 | Keep. |

The reasons for each change are in the trade's sheet. The page's single free check term (`keyword`) follows the proposal where
the two markets agree; where they do not, the page keeps one term and the sheet names the second for Web 2.
