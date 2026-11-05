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
