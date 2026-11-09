# Claim sheet: vet clinic

Page `/for/veterinary-clinic`, file `src/content/industries/veterinary-clinic.ts`. Checked 5 Nov 2026 (Industries 2), against branch `claude/industries2-c`.
Source IDs (G, H, K, P) are in `README.md`. F means the facts file `knowledge/kabsi-facts.md`, cited by section; "F 13 hard
reviews" is the FAQ answer "What happens with hard reviews?". R1 means `supabase/functions/_shared/ai/risk.ts` line 86, which
counts a veterinarian as a health business. Example business: Greenway Vets, Bristol (invented, labelled Example), with
Hillside Animal Clinic and Riverside Vets, both invented.

## Rows

| # | Sentence on the page | Type | Source | What the source says |
| - | -------------------- | ---- | ------ | -------------------- |
| 1 | Lead: "Clinic hours and phone right on Google, careful replies that share no pet's care, and posts for your yes." | K | F Google Protection FAQ; F 7.12; R1 | "Replies thank the owner and say nothing about a pet's diagnosis or treatment" (7.12). |
| 2 | Searches: vet near me, emergency vet, vet open saturday, cat vet, puppy vaccinations, veterinary clinic | A | none | "Searches like these", no volumes. Volumes wait for the DataForSEO top up. |
| 3 | Category "Veterinarian" (primary) | C | https://business.google.com/v/cedar-plaza-vet-clinic/01539470686326437823/f8c9/_/lp/2015437193742423755/ ; https://business.google.com/v/peppertree-animal-hospital/03267594091162322921/ec53/_ | "Veterinarian in Mountlake Terrace"; "Veterinarian in Claremont". Read 5 Nov 2026. |
| 4 | Category "Animal hospital" | C | https://business.google.com/v/pet-headquarters/04714002645397762966/c674/_ | "Animal Hospital in Camarillo". Read 5 Nov 2026. |
| 5 | Category "Emergency veterinarian service" | C | https://business.google.com/v/onpoint-veterinary-urgent-care-fort-walton-beach/05590225467498315368/d362/_ | "Emergency Veterinarian Service in Fort Walton Beach". Read 5 Nov 2026. |
| 6 | Note: "Add the emergency category only if you really take emergencies in those hours. Read the names in your own profile, because they can differ by country." | A, G | G2; G13 | Advice; names differ by country. |
| 7 | Meta description, line and card: "hours and phone checked daily, careful replies that share no pet's care, posts for your yes" | K | as row 1 | Supported. |
| 8 | H1: "Your vet clinic on Google, in safe hands." | A | none | Headline. |
| 9 | Answer: "A worried pet owner checks a veterinarian Google Business Profile for the phone number and whether you are open now." | A, K | F 7.12 | Wording; 7.12 says "Hours and the phone matter most" (Kabsi's trade note, not a measured fact). |
| 10 | Answer: "Kabsi checks your hours and phone every day, drafts careful replies that share nothing about a pet's care, shows you a hard review as one that needs more care, and asks about holiday hours in time. You approve every word." | K | F Google Protection FAQ; F 7.12; F 13 hard reviews; F "Holiday hours" | Supported. Google Protection is off until Kabsi connects to Google (F 2.2). |
| 11 | Watch: "A worried owner trusts the hours Google shows. Kabsi checks them against yours every day." Fields Opening hours, Special hours, Phone, Address, Website, Main category; Example "Google shows you closed on Saturday. You told me 09:00 to 13:00." | A, K | F 2.1a | All watched; the message is an Example. |
| 12 | Post Example: "New puppy clinic every Thursday at 4 pm, from next week. Ask at reception." | A, K | F "A photo with words becomes a post" | Invented post. |
| 13 | Job "Hours and phone, checked daily": "When Google shows something else, you choose which stays." | K | F Google Protection FAQ | Supported. |
| 14 | Job "Replies that share no care details": "Thanks and an invitation to get in touch, nothing about the pet's treatment." | K | F 7.12; R1 | Supported. |
| 15 | Job "Clinic news, as posts": "A new clinic day or a new vet becomes a post for your yes." | K | F Posts FAQ | Supported. |
| 16 | Nearby and AI answer (Bishopston, Saturdays 9 am to 1 pm) | A | F "Nearby places"; F "AI Visibility" | Invented Examples. |
| 17 | Search text: "Owners search when something is wrong ... and when something is due ... Hours and the phone number matter most." | A, K | F 7.12 | "Hours and the phone matter most" (Kabsi's trade note). |
| 18 | Guide: "A pet owner in a hurry reads two things: are you open, and what number do they call." | A | none | Wording. |
| 19 | Guide: "Keep your weekly hours exact and set special hours for holidays, so Google shows the right answer." | G | https://support.google.com/business/answer/3039617 (G5); https://support.google.com/business/answer/6303076 (G4) | Main hours and special hours for holidays. |
| 20 | Guide: "Kabsi asks before each public holiday what you will do and sets special hours once you say yes." | K | F "Holiday hours" | England and Wales are in the list. |
| 21 | Guide: "If you send out of hours calls to another clinic, say so in your description and posts rather than in the category." | A | G2; F "Post checks" | Advice; a post may not carry a phone number. |
| 22 | Guide: "Kabsi compares your phone, hours and description on Google with what you confirmed, every day." | K | F 2.1a | Supported. |
| 23 | Guide: "A public reply should not discuss a pet's diagnosis or treatment." | A | F 7.12 | Advice, as in 7.12. |
| 24 | Guide: "Kabsi drafts replies that thank the owner and invite them to get in touch through the details on your profile, and you can add anything it should never say in About your business." | K | F 8.3; F FAQ "Can I stop Kabsi saying certain things?" | Supported. |
| 25 | Guide: "A review about a pet that was hurt or died comes to you marked as needing a little more care, with a short checklist and no draft. Kabsi writes a short, neutral holding reply only if you ask, and nothing is published until you approve it." | K | F 13 hard reviews; F 7.12 | Supported. |
| 26 | FAQ "Will a reply mention a pet's treatment?": "No. Drafts thank the owner and invite them to get in touch, and say nothing about the pet's care." | K | F 7.12; R1 | Supported. |
| 27 | FAQ "Can Kabsi set our bank holiday hours?": "Yes. Five days before each one, Kabsi asks what you will do and sets special hours once you say yes." | K | F "Holiday hours" | Supported. |
| 28 | FAQ "Does Kabsi see our clinic records?": "No. Kabsi works with your Google profile and its reviews, It does not connect to your clinic system." | K | F 7.5; F 8.6 | Supported. |
| 29 | FAQ "What happens with a very hard review?": "It comes to you marked as needing a little more care, with a short checklist and no draft. You write the reply, ask Kabsi for a short, neutral holding reply, or skip it." | K | F 13 hard reviews | "You can also write your own, choose 'I'll reply myself' or skip it." |
| 30 | FAQ "Can our practice manager approve replies?": "On Pro, yes. You choose who can approve replies and posts, and you still see everything." | K | F 2.1d; F "Pro will add" | Supported; reviews that need more care always need the owner. Pro cannot be bought yet. |
| 31 | Names: Greenway Vets, Hillside Animal Clinic, Riverside Vets | A | none | Invented, labelled Example. |

## Problems

* None on the page. (F 7.12 now names vets, so rows 1 and 14 no longer rest on code alone.)
* No ranking, review, customer or revenue promise, no "listing" or "visibility", no em dash, en dash or exclamation mark, no medical claim, nothing about Google approval found.

## Left out

* None: all three category names were shown by live profiles on 5 Nov 2026.


## Industries 3 (5 Nov 2026): the short lines

The page was cut to master plan 30.33 item 2. Each line below replaces longer text and keeps a fact of the rows above.

| Field | Line on the page | Row(s) above | Type |
| --- | --- | --- | --- |
| Answer | "A worried owner checks a veterinarian Google Business Profile for your phone and hours. Kabsi checks both daily and drafts careful replies for your yes." | 9, 10 | A, K |
| Profile card "Hours and the phone first" | "Exact hours. Kabsi asks before each public holiday and sets special hours on your yes." | 18, 19, 20 | A, G, K |
| Profile card "Out of hours calls" | "Sent to another clinic? Say so in your description and posts, not the category." | 21 | A |
| Profile card "No treatment in a reply" | "Drafts thank the owner and invite contact through your profile, never the pet's treatment." | 23, 24, 26 | A, K |
| Profile card "A pet hurt, or a death" | "No draft, a short checklist, and a neutral holding reply only if you ask." | 25 | K |
| Categories line | "Add the emergency category only if you really take emergencies in those hours. Names can differ by country." | 6 | A, G |
| FAQ "What happens with a very hard review?" | "No draft, just a short checklist. You write the reply, ask Kabsi for a neutral holding reply, or skip it." | 29 | K |

Jobs, the watch line and the AI answer are unchanged. Related: pet grooming, dental clinic, physiotherapy, medical and aesthetic clinic, optician, florist. Guides: hours and details the same everywhere, negative reviews, holiday hours.

Removed from the page: the search text (row 17); the two guide blocks as paragraphs; "you can add anything it should never say in About your business" (row 24); the guide line on the daily phone, hours and description check (row 22; job row 13 and the watch keep it); "and nothing is published until you approve it" (row 25); "Read the names in your own profile" (row 6); from the answer, "whether you are open now", "shows you a hard review as one that needs more care" and holiday hours (rows 9, 10; the holiday card keeps the last); "marked as needing a little more care" in the hard review FAQ.

## Industry 1 (9 Nov 2026, R-144): the new and changed lines

Lane R decision R-144: each industry page mostly its own text. New groups on this page: what the trade can list (services, as chips), the photos that work (beside the Example post), posts it can make, what customers write about, and hours and holidays, plus rewritten lines that read the same on other pages. Type and source as in README. A card title (short label) is wording only; its line carries the claim. Every new line was read against the facts on 9 Nov 2026; no number, customer claim or ranking promise was added.

| # | Where | Sentence on the page | Type | Source | What the source says |
| - | ----- | -------------------- | ---- | ------ | -------------------- |
| I1 | Card title | "Services, plainly listed" | A | none | A short label for the line under it. |
| I2 | Card line | "Vaccinations, neutering, dental care: each can be a service with a description." | G | G6 | Services can carry a price and a description; custom services are allowed; no prices in custom service names. |
| I3 | Card title | "Which animals you see" | A | none | A short label for the line under it. |
| I4 | Card line | "Cats and dogs only, or exotics too: say so in your description." | A | none | Advice or wording about the trade. Not a claim about the world. |
| I5 | Card line | "No draft for grief or injury; a checklist reaches you instead." | K | facts 13 "What happens with hard reviews?"; README K3 | A review about health, injury, safety, a legal threat or a named team member reaches the owner with no draft and a short checklist; a neutral holding reply only if asked. |
| I6 | Card title | "A long wait in reception" | A | none | A short label for the line under it. |
| I7 | Card line | "One apology, and an invitation to get in touch with the clinic." | K | facts 09 (7.3, 7.6) | Drafts stay calm, never argue, admit fault or promise refunds, and ask the reviewer to get in touch through the details on the profile. |
| I8 | Card title | "Christmas 2026" | A | none | A short label for the line under it. |
| I9 | Card line | "25 December and the Boxing Day holiday on Monday 28. Post your cover." | T | H1 | England and Wales bank holidays; a weekend holiday moves to a substitute weekday. |
| I10 | Card title | "Bank holidays, five days ahead" | A | none | A short label for the line under it. |
| I11 | Card line | "Kabsi asks, then sets special hours after your yes." | G | G4 | Special hours keep regular hours for holidays and exceptional days; up to 6 days closed fits special hours, 7 or more Temporarily closed. |
| I12 | Card title | "The reception desk" | A | none | A short label for the line under it. |
| I13 | Card line | "Bright and welcoming, with no pet or owner in view." | A | none | Advice or wording about the trade. Not a claim about the world. |
| I14 | Card title | "The consulting room" | A | none | A short label for the line under it. |
| I15 | Card line | "Clean table, tidy shelves, good light." | A | none | Advice or wording about the trade. Not a claim about the world. |
| I16 | Card title | "The car park and door" | A | none | A short label for the line under it. |
| I17 | Card line | "Where to stop with a pet carrier, seen from the street." | A | none | Advice or wording about the trade. Not a claim about the world. |
| I18 | Card title | "Vaccination clinic dates" | A | none | A short label for the line under it. |
| I19 | Card line | "The days you run them, as a dated post." | A | none | Advice or wording about the trade. Not a claim about the world. |
| I20 | Card title | "A new vet joins" | A | none | A short label for the line under it. |
| I21 | Card line | "Their name and the animals they see." | A | none | Advice or wording about the trade. Not a claim about the world. |
| I22 | Card title | "Bank holiday cover" | A | none | A short label for the line under it. |
| I23 | Card line | "Who answers urgent calls while you are closed." | A | none | Advice or wording about the trade. Not a claim about the world. |
| I24 | Card title | "The phone and hours, read daily" | A | none | A short label for the line under it. |
| I25 | Card line | "If Google differs, you decide which version stays." | K | facts 04 (Google Protection) | When Google shows something other than what the owner confirmed, the owner chooses Keep my information or Google is right; nothing changes by itself. |
| I26 | Answer | "No, drafts thank the owner and invite them to get in touch, and say nothing about the pet's care." | K | facts 09 (7.3, 7.6) | Drafts stay calm, never argue, admit fault or promise refunds, and ask the reviewer to get in touch through the details on the profile. |
| I27 | Answer | "Yes, five days before each one, Kabsi asks what you will do and sets special hours once you say yes." | K | K2 (docs/holidays.md); facts 04 "Holiday hours" | Kabsi asks five days before a public holiday: normal hours, closed or custom hours; set once the owner says yes. |
| I28 | Question | "Where does the review card go at a vet clinic?" | A | none | Advice or wording about the trade. Not a claim about the world. |
| I29 | Answer | "At reception, on appointment cards or in a follow-up email." | K | facts 09 (card placement, 7.1 to 7.8); facts 10 (ask everyone the same way, no incentive) | Where the review card goes for each trade; every customer asked the same way, never an incentive. |
| I30 | Question | "Can a reply mention a pet's name?" | A | none | Advice or wording about the trade. Not a claim about the world. |
| I31 | Answer | "No, a reply says nothing about the pet or its care, only thanks and how to reach you." | K | K1 (facts 09, 7.3) | Replies stay general: no personal details, never confirm someone is a patient or mention their care. |
| I32 | Service | "Vaccinations" | A | none | A service name a business of this kind can list (Example, not a full list); shown as chips under "What a [trade] can list". |
| I33 | Service | "Neutering" | A | none | A service name a business of this kind can list (Example, not a full list); shown as chips under "What a [trade] can list". |
| I34 | Service | "Pet dental care" | A | none | A service name a business of this kind can list (Example, not a full list); shown as chips under "What a [trade] can list". |
| I35 | Service | "Microchipping" | A | none | A service name a business of this kind can list (Example, not a full list); shown as chips under "What a [trade] can list". |
| I36 | Service | "Health checks" | A | none | A service name a business of this kind can list (Example, not a full list); shown as chips under "What a [trade] can list". |
| I37 | Service | "Flea and worm treatment" | A | none | A service name a business of this kind can list (Example, not a full list); shown as chips under "What a [trade] can list". |
| I38 | Service | "Nurse clinics" | A | none | A service name a business of this kind can list (Example, not a full list); shown as chips under "What a [trade] can list". |
