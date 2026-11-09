# Claim sheet: optician

Page `/for/optician`, file `src/content/industries/optician.ts`. Checked 5 Nov 2026 (Industries 2), against branch `claude/industries2-c`.
Source IDs (G, H, K, P) are in `README.md`. F means the facts file `knowledge/kabsi-facts.md`, cited by section; "F 13 hard
reviews" is the FAQ answer "What happens with hard reviews?". R1 means `supabase/functions/_shared/ai/risk.ts` line 86, which
counts an optician or optometrist as a health business. Example business: Clearsight Opticians, Leeds (invented, labelled
Example), with Frame and Lens and Northgate Eyecare, both invented.

## Rows

| # | Sentence on the page | Type | Source | What the source says |
| - | -------------------- | ---- | ------ | -------------------- |
| 1 | Lead: "Your eye test page and hours right on Google, new frames as posts, and careful replies. You approve each one." | K | F 7.14; F "A photo with words becomes a post"; R1 | "The booking link (website) and hours are checked every day." |
| 2 | Searches: optician near me, eye test, contact lenses, glasses frames, kids eye test, opticians open saturday | A | none | "Searches like these", no volumes. Volumes wait for the DataForSEO top up. |
| 3 | Category "Optician" (primary) | C | https://business.google.com/v/french-optical-fashion-inc/06809570653801541533/0788/_ | "Optician in New York". Read 5 Nov 2026. |
| 4 | Category "Optometrist" | C | https://business.google.com/v/westlake-village-optometry/09699060546339146512/1ffd/_ | "Optometrist in Westlake Village". Read 5 Nov 2026. |
| 5 | Category "Eye care center" | C | https://business.google.com/v/einsteins-optical/014184407211933572608/f8f3/_ | "Eye Care Center in london" (Ontario). Read 5 Nov 2026. |
| 6 | Note: "Choose the first by what most visits are for, glasses or eye tests, and read the names in your own profile, because they can differ by country." | A, G | G2; G13 | Advice; names differ by country. |
| 7 | Meta description, line and card: "the eye test page and hours checked daily, new frames as posts, careful replies for your yes"; "the eye test link and hours right"; "Eye test link right" | K | as row 1 | Supported. |
| 8 | H1: "Your optician on Google, in clear focus." | A | none | Headline. |
| 9 | Answer: "An optician Google Business Profile is where people find the link to book an eye test and your hours." | A | none | Wording; no share claimed. |
| 10 | Answer: "Kabsi checks your website, phone and hours every day, turns a photo of new frames into a post, drafts careful replies that never mention an eye test result, and asks about holiday hours in time. You approve every change." | K | F Google Protection FAQ; F 7.14; F "Holiday hours" | "replies never mention a result, a prescription or a condition". Google Protection is off until Kabsi connects to Google (F 2.2). |
| 11 | Watch: "Your website link is where patients go to book. Kabsi checks it, and your hours, every day." | A, K | F 7.14 | Supported. |
| 12 | Watch fields Website, Opening hours, Phone, Main category, Special hours; Example "Google shows your old website. You told me your eye test page." | K, A | F 2.1a; F Google Protection FAQ | Kabsi compares the website Google shows with the approved one. The message is an Example. |
| 13 | Post Example: "New acetate frames are in today, in tortoiseshell and clear. Come and try them on." | A, K | F "A photo with words becomes a post" | Invented post. |
| 14 | Job "The eye test link and hours": "Checked every day. When Google shows something else, you choose." | K | F Google Protection FAQ | Supported. |
| 15 | Job "New frames, as posts": "A photo of the shelf and a line become a post for your yes." | K | F 7.14 | "Photos of new frames make good posts". |
| 16 | Job "Replies that keep eyes private": "No result, no prescription, just thanks and an invitation to get in touch." | K | F 7.14; R1 | Supported. |
| 17 | Nearby and AI answer (Victoria Quarter, children's eye tests on Saturdays) | A | F "Nearby places"; F "AI Visibility" | Invented Examples. |
| 18 | Search text: "People search for an eye test, contact lenses or new frames, often with a day in mind. They check the hours, whether the booking link works, and what reviews say about the staff." | A | none | Wording. |
| 19 | Guide: "The website link on your profile should be the one you want patients to use." | A | none | Advice. |
| 20 | Guide: "Kabsi compares the website, phone and hours on Google with what you confirmed, every day, and asks when they differ." | K | F 2.1a; F Google Protection FAQ | Supported. |
| 21 | Guide: "Frames sell on looks. A photo of the new shelf with one line becomes a post for your yes, and Kabsi checks each photo is sharp and well lit before it reaches Google." | A, K | F "A photo with words becomes a post"; F FAQ "What photos can I post?" | First sentence is wording; the rest is supported. |
| 22 | Guide: "An eye test is health care, so a public reply should not mention a result, a prescription or a condition." | A, K | F 7.14 | "An eye test is health care: replies never mention a result, a prescription or a condition". |
| 23 | Guide: "Kabsi drafts replies that thank the patient and invite them to get in touch through the details on your profile." | K | F 7.14; F 8.3 | Supported. |
| 24 | Guide: "You can add anything Kabsi should never say in About your business, and every draft follows it. A hard review comes to you as one that needs more care, so you decide." | K | F FAQ "Can I stop Kabsi saying certain things?"; F 13 hard reviews | Supported. |
| 25 | FAQ "Will a reply mention someone's prescription?": "No. Drafts thank the patient and invite them to get in touch, and say nothing about their eyes." | K | F 7.14 | Supported. |
| 26 | FAQ "Our booking page moved. What happens?": "Tell Kabsi the new page. When Google shows the old one, Kabsi asks you and puts yours back once you say yes." | K | F Google Protection FAQ "Keep my information"; F "Put it back" | Supported; the new page must be confirmed in About your business first. |
| 27 | FAQ "Can Kabsi post our new frames?": "Yes, photos you send and approve. Kabsi never writes a price you did not give." | K | F 7.14; F Posts FAQ | Supported. |
| 28 | FAQ "Does Kabsi see patient records?": "No. Kabsi works with your Google profile and its reviews, It does not connect to your practice system." | K | F 7.5; F 8.6 | Supported. |
| 29 | FAQ "Can our practice manager approve replies?": "On Pro, yes. You choose who can approve replies and posts, and you still see everything." | K | F 2.1d; F "Pro will add" | Supported; Pro cannot be bought yet. |
| 30 | Names: Clearsight Opticians, Frame and Lens, Northgate Eyecare | A | none | Invented, labelled Example. |

## Problems

* None. (F 7.14 now names opticians, so the reply rule no longer rests on code alone.)
* No ranking, review, customer or revenue promise, no "listing" or "visibility", no em dash, en dash or exclamation mark, no medical claim, nothing about Google approval found.

## Left out

* None: all three category names were shown by live profiles on 5 Nov 2026.


## Industries 3 (5 Nov 2026): the short lines

The page was cut to master plan 30.33 item 2. Each line below replaces longer text and keeps a fact of the rows above.

| Field | Line on the page | Row(s) above | Type |
| --- | --- | --- | --- |
| answer | "Kabsi looks after your optician Google Business Profile: the eye test link and hours checked daily, new frames as posts, careful replies for your yes." | 7, 10 | K |
| profile | "The link patients book with": "Website, phone and hours checked against yours daily. Kabsi asks when they differ." | 19, 20 | A, K |
| profile | "New frames on the shelf": "A shelf photo and a line become a post for your yes, checked for sharpness." | 21 | K |
| profile | "Eye health stays private": "Eye tests are health care. Drafts thank patients and ask them to get in touch." | 22, 23 | K |
| profile | "What Kabsi never says": "Add it in About your business; every draft follows it. Hard reviews come to you." | 24 | K |
| categories.line | "Choose the first by what most visits are for, glasses or eye tests. Check the names in your own profile; they differ by country." | 6 | A, G |

Removed from the page: the search text paragraph (row 18) and the two guide sections it replaces as long text; "Frames sell on looks", "well lit" in the photo check, "a result, a prescription or a condition" (the job and the first FAQ keep it), and the answer's opening sentence and holiday clause.

## Industry 1 (9 Nov 2026, R-144): the new and changed lines

Lane R decision R-144: each industry page mostly its own text. New groups on this page: what the trade can list (services, as chips), the photos that work (beside the Example post), posts it can make, what customers write about, and hours and holidays, plus rewritten lines that read the same on other pages. Type and source as in README. A card title (short label) is wording only; its line carries the claim. Every new line was read against the facts on 9 Nov 2026; no number, customer claim or ranking promise was added.

| # | Where | Sentence on the page | Type | Source | What the source says |
| - | ----- | -------------------- | ---- | ------ | -------------------- |
| I1 | Card title | "Eye tests as a service" | A | none | A short label for the line under it. |
| I2 | Card line | "Google can show each service with a description, an eye test included." | G | G6 | Services can carry a price and a description; custom services are allowed; no prices in custom service names. |
| I3 | Card title | "Home visits, if you do them" | A | none | A short label for the line under it. |
| I4 | Card line | "A service area shows where you travel; the shop keeps its address." | G | G16 | A business that travels to customers can set a service area and hide its address. |
| I5 | Card title | "Glasses not ready on time" | A | none | A short label for the line under it. |
| I6 | Card line | "One apology and an invitation to contact the practice." | K | facts 09 (7.3, 7.6) | Drafts stay calm, never argue, admit fault or promise refunds, and ask the reviewer to get in touch through the details on the profile. |
| I7 | Card title | "A complaint about a result" | A | none | A short label for the line under it. |
| I8 | Card line | "No draft; a checklist comes to you, and you decide." | K | facts 13 "What happens with hard reviews?"; README K3 | A review about health, injury, safety, a legal threat or a named team member reaches the owner with no draft and a short checklist; a neutral holding reply only if asked. |
| I9 | Card title | "Bank holidays in Leeds" | A | none | A short label for the line under it. |
| I10 | Card line | "Kabsi asks five days before each and sets your hours after your yes." | K | K2 (docs/holidays.md); facts 04 "Holiday hours" | Kabsi asks five days before a public holiday: normal hours, closed or custom hours; set once the owner says yes. |
| I11 | Card title | "A Saturday clinic" | A | none | A short label for the line under it. |
| I12 | Card line | "A Saturday unlike the rest of the week is special hours for that date." | G | G4 | Special hours keep regular hours for holidays and exceptional days; up to 6 days closed fits special hours, 7 or more Temporarily closed. |
| I13 | Card title | "Between Christmas and New Year" | A | none | A short label for the line under it. |
| I14 | Card line | "Closed days that week go on Google as special hours." | G | G4 | Special hours keep regular hours for holidays and exceptional days; up to 6 days closed fits special hours, 7 or more Temporarily closed. |
| I15 | Card title | "The testing room" | A | none | A short label for the line under it. |
| I16 | Card line | "Equipment tidy and the room empty, in good light." | A | none | Advice or wording about the trade. Not a claim about the world. |
| I17 | Card title | "The front of the shop" | A | none | A short label for the line under it. |
| I18 | Card line | "Your sign from the pavement, so a first visit finds you." | A | none | Advice or wording about the trade. Not a claim about the world. |
| I19 | Card title | "New frames in" | A | none | A short label for the line under it. |
| I20 | Card line | "The brand or style, from the photo you send." | A | none | Advice or wording about the trade. Not a claim about the world. |
| I21 | Card title | "Eye test slots" | A | none | A short label for the line under it. |
| I22 | Card line | "Days with free test times, as a dated update." | A | none | Advice or wording about the trade. Not a claim about the world. |
| I23 | Card title | "Contact lens checks" | A | none | A short label for the line under it. |
| I24 | Card line | "When you offer them, in your own words." | A | none | Advice or wording about the trade. Not a claim about the world. |
| I25 | Card line | "Read every day; when Google differs, you choose." | K | facts 04 (Google Protection) | When Google shows something other than what the owner confirmed, the owner chooses Keep my information or Google is right; nothing changes by itself. |
| I26 | Answer | "No, drafts thank the patient and invite them to get in touch, and say nothing about their eyes." | K | facts 09 (7.3, 7.6) | Drafts stay calm, never argue, admit fault or promise refunds, and ask the reviewer to get in touch through the details on the profile. |
| I27 | Answer | "Yes, send a photo of the frames; prices appear only if you give them." | A | none | Advice or wording about the trade. Not a claim about the world. |
| I28 | Question | "Where does the review card go at an optician?" | A | none | Advice or wording about the trade. Not a claim about the world. |
| I29 | Answer | "At the desk when glasses are collected, the same for every patient." | K | facts 09 (card placement, 7.1 to 7.8); facts 10 (ask everyone the same way, no incentive) | Where the review card goes for each trade; every customer asked the same way, never an incentive. |
| I30 | Question | "Will a reply say someone had an eye test?" | A | none | Advice or wording about the trade. Not a claim about the world. |
| I31 | Answer | "No, a public reply never confirms that someone is a patient." | K | K1 (facts 09, 7.3) | Replies stay general: no personal details, never confirm someone is a patient or mention their care. |
| I32 | Service | "Eye test" | A | none | A service name a business of this kind can list (Example, not a full list); shown as chips under "What a [trade] can list". |
| I33 | Service | "Contact lens fitting" | A | none | A service name a business of this kind can list (Example, not a full list); shown as chips under "What a [trade] can list". |
| I34 | Service | "Children's eye test" | A | none | A service name a business of this kind can list (Example, not a full list); shown as chips under "What a [trade] can list". |
| I35 | Service | "Glasses repairs" | A | none | A service name a business of this kind can list (Example, not a full list); shown as chips under "What a [trade] can list". |
| I36 | Service | "Sunglasses" | A | none | A service name a business of this kind can list (Example, not a full list); shown as chips under "What a [trade] can list". |
| I37 | Service | "Varifocals" | A | none | A service name a business of this kind can list (Example, not a full list); shown as chips under "What a [trade] can list". |
| I38 | Service | "Frame adjustments" | A | none | A service name a business of this kind can list (Example, not a full list); shown as chips under "What a [trade] can list". |
| I39 | Service | "Lens replacement" | A | none | A service name a business of this kind can list (Example, not a full list); shown as chips under "What a [trade] can list". |
