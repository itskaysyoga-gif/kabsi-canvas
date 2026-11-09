# Kabsi copy deck (docs/COPY.md), lane R chat, 25 Oct 2026

Every line a mockup or Web 2 page carries, so no screen has placeholder text. Written to the kabsi-copy rules and master plan 24, 27, 28, 29 and 30. Web 2 builds from it and updates the facts to match (section 27 makes several facts lines out of date: the Weekly Care Report is now the Results Report, the pillars and H1 changed).

Rules used throughout: sentence case; numbers as digits; ranges with "to"; no dashes, no exclamation marks; Google only as plain words, never in a headline graphic; never promise rankings, reviews, calls or customers (K-144); every example labelled Example; one main button per screen.

Decisions taken while writing (lane R, R-41):
- The main button is "See your map" (28.8); the second is "Try it on WhatsApp". "Start free" appears only on pricing and plan screens.
- The line under every main button: "Free for 14 days. No card. Cancel in WhatsApp."
- About shows no street address or city (R-55 holds over 24.6's address line until Kabsi has a registered entity).
- The weekly report is called "Your weekly report" wherever a reader sees it (B-008, section 50). "Weekly Care Report" and "Results Report" are retired owner words; older sections below that still say "Results Report" are superseded by B-008.
- While free_scan_daily_cap is 0, the scan box shows the waitlist state (below) instead of running.

## Shared pieces

**Header (Web 2, Design 5):** Kabsi mark and name. Links: How it works, Pricing, Businesses, Free tools, Founding 25, Partners. Right: Log in, and the button "Check my business free". Phone menu: "Open menu", "Close menu"; "Skip to content".
**Phone bottom bar (after the first scroll):** "Check my business free" and a WhatsApp icon button labelled "Chat on WhatsApp".
**Footer:**
- Line: "Your business on Google. Taken care of."
- Columns (Web 2). Product: How it works, Pricing, Free check, Review link and QR code, Security. Learn: Every kind of business, Hair salons, Barbershops, Restaurants, Dental clinics, Guides, FAQ. Company: About, Founding 25, Partners, Partner terms, Privacy, Terms. Follow: Facebook, Instagram (SOCIAL_LINKS in src/lib/site.ts). Bottom: "Your privacy choices", "© 2026 Kabsi". "Kabsi or Google's free tools" waits for its sourced page (docs/LATER.md).
- Small print: "Kabsi is independent and not affiliated with Google. Google Business Profile is free from Google. Kabsi is an independent paid service." with the link "Google's guidance on working with a third party". "Kabsi is operated by Rashid Abou Hamzy. Contact: hello@kabsi.co. Card payments will be processed by Creem, our merchant of record."
- SEO 1 (9 Nov 2026): the footer's Company group ends with "Help setting up" (/setup-call), so the page in the sitemap is reachable from every page. The page title and its crumb already use these words.
**Cookie bar:** "Kabsi uses cookies to measure visits and improve ads. You choose." Buttons: "Accept", "Only necessary". Link: "Details".
**Scan box (one component, used on many pages):**
- Label: "Find your business on Google"
- Placeholder: "Business name and city"
- Button: "Check my business free"
- Under it: "Free check. No account and no Google access needed." On Home, /scan and the /for pages a second line follows: "The 14-day free trial is separate. It starts once Kabsi is a Manager on your profile." (Fixes A, section 66.)
- Waitlist state (cap 0): "The free check opens soon. Leave your email or WhatsApp number and Kabsi sends your result the day it opens." Button: "Save my place". Done: "Saved. You are on the list." On kabsi.co the waiting list is built (UX 1, section 25); "free scan" and "map" are not owner words, so the lines say "free check" and "result" (UX 1 round 2).

**Finding your business (Check 2, 1 Nov 2026, lane R decisions; one box on Home, the industry pages and /scan):**
- Suggestions while typing: after 3 characters and a 300 ms pause, at most 5, each the business name and a short address. Under the list, Google's required attribution, exactly "Google Maps" (Google's Places policy for results shown without a Google map; the one place Google's name appears here is that attribution, not a slogan).
- Screen reader, when the list opens: "5 suggestions. Use the up and down arrow keys, then Enter to choose." When there is none: "No suggestions. Press Enter to search." The list is labelled "Suggestions".
- Choosing a suggestion goes straight to the check. When the box is not suggesting (the daily cap, a limit, a problem on Google's side) it is a plain box and says nothing about it.
- Search result, never picked for the visitor. One match: H1 "Is this your business?" Several: H1 "Pick your business". Each match: name, address, category, the button "This is my business" (the main button when there is one match, a second button when there are several). Under them: "Not here? Search again".
- Search again (the box with the typed text kept; nothing is looked up until the visitor searches): eyebrow "Free check", H1 "Find your business again", line "Add the city, or type the name exactly as it shows on Google."
- Every result (/scan and /scan/CODE), under the address or the heading: "Not your business? Change it". It goes to the same search again screen, with the text the visitor typed.

## 0.1 Words owners understand (lane R, 25 Oct 2026; 30.15 lines added 26 Oct)

- Never "spot", "grid", "grid point", "geo" or "pin" in a line an owner reads. Say "places around you" and "searched like a customer". The number on a dot is "where you came up", 1 is first.
- Never "the app" or "app". Kabsi has no app. Say "the Kabsi website", "your Kabsi account" or "on kabsi.co". Nav item: "How it works", never "The app". WhatsApp is WhatsApp.

- Never "listing" or "visibility" in a line an owner reads (30.15): say "your business on Google" or "your Google profile". One exception (Sync 2a, R-142 item 6): Visibility Map is a K-02 product name, so the approved template `kabsi_map_ready` (and `kabsi_map_ready_v2`) keeps "The Visibility Map of {{business}} is ready."; no template is resubmitted for it.
- The map leads with three nearby places, then one count: "Near your salon you came up 2nd for 'hair salon'. Near the metro station, Juniper Hair Studio came first. You were in the first 3 at 18 of 49 places Kabsi checked." Place names come only from the real checked point. Under it: "Sample Google Maps results, not customer counts."
- AI answers: "An answer customers might see", never a score. Label: "Answers we get from ChatGPT and Perplexity directly, which can differ from what their apps show."
- Never: top of Google, more customers, fully automatic, set and forget, we manage everything, Google-approved, Google partner, we remove bad reviews, no work needed, AI recommends you.

**Founding 25 (30.17):** Banner: "Founding 25: three months of Kabsi Pro, free, for 25 businesses. Kabsi does the Google work; you tell Rashid what to make better." (Price 1, 30 Oct 2026; was "We do the Google work; you tell us what to make better.") Then "[n] of 25 places left." (the real count from GET programs/founding; no number while it loads or if it fails; "All 25 places are taken." at 0) and the button "Apply for a place". Under it: "By application. No card. After 90 days, choose a plan or stop, nothing is charged by itself."
**Access steps (30.17, the same everywhere; shortened by section 59 part C to "On Google, open your profile, then ..."):** "On Google, open your profile (search your business name while signed in), then Menu, Business Profile settings, People and access, Add. Paste 5481006796, choose Manager, then Add (on some screens, Invite)." Under it: "5481006796 is Kabsi Clients, Kabsi's business group on Google. Never send us a password or a code." Button: "Copy the ID".

## 1. Home (/)
*Changed by Web 3 (Design 6 round 2, approved by lane R on 30 Oct 2026; kabsi-design-studio docs/DESIGN-PROPOSAL.md, "Design 6" and "Design 6 round 2"): Home is now, in this order, the hero (H1 "Your business on Google. Taken care of."; line "Reviews to reply to. Details to keep right. Posts to prepare. Kabsi does the work and asks for your yes on WhatsApp."; while WhatsApp is off, `WHATSAPP_LAUNCH_LINE` under it; the free check; "See how it works"; "You approve every change." and "You keep control of your Google profile."; one interactive phone and its status card "Your reply to Layla K.": Approved, Sent to Google, Live on Google), the dark band "From review to live, in five steps." with "Tap Yes, Edit or Skip on the phone above. Each step shows here as it happens.", the four jobs ("The work your Google profile needs, done."), "You stay in control.", "Where you come up nearby.", "Pick your business", the pricing preview ("Two plans. The work comes first."), Founding 25 with the founder, four questions and "Start with a free check." Every line is in `src/components/kabsi/d6-home.tsx` and `d6-demo.tsx`, word for word from Design 6. The hero, pillars and how-it-works lines below are the earlier Home, kept for the record.*
*Changed by section 34 (Price 1, 30 Oct 2026): the prices in this section are replaced by the list prices 29 and 59 and the founding price 19 and 39.*

**Hero**
- H1: "Your business on Google. Taken care of through WhatsApp."
- Lead: "Kabsi prepares your review replies, posts and updates to your business details. You approve each one on WhatsApp before it goes live."
- Buttons: "Check my business free" (main) and "See how it works" (the WhatsApp demo). The 14-day trial is explained apart from the free check: "Free for 14 days once Kabsi is connected. No card."
- Scan box (the free check).
- Visual (Example): the map filling in, the phone receiving it. Map line in the chat: "We searched 'dentist' on Google Maps from 49 places around your clinic, like a customer would. You came up in the top 3 from 18 of them. North of the mall, Smile Clinic comes up first."

**Pillars** (H2: "The Google work, done for you"; rewritten by 30.15, Design 4 sets the final lines for lane R)
1. See where you show up: "A map of your ranking across your area, what AI assistants say about you, and the 3 to 5 competitors around you."
2. More reviews, the right way: "Your review link, a QR card for the counter, and a ready message you send to every customer. Never only the happy ones."
3. Your listing kept right: "Hours, holidays, photos and posts kept current. If anyone changes your listing, you know in minutes."
4. All from WhatsApp: "Every reply, post and change comes to you ready. Reply Yes and it goes live. Nothing goes live without your yes."

**How it works** (H2: "Set up in a few steps, no passwords"; Price 1, 30 Oct 2026, was "Set up in 10 minutes")
1. "See your map": "Run the free scan. It takes about 30 seconds."
2. "Add Kabsi as a Manager": "On your Google listing, in a few taps. You stay the owner."
3. "Connect WhatsApp": "Your first full map arrives within 5 minutes."

**Try it** (H2: "Things you can say to Kabsi")
Tappable chips, each plays a chat (Example): "Where do I rank for dentist?" / "A 1-star review came in" / "Ask a customer for a review" / "Close at 3 today" / "Here is a photo of our new dish" / "How did we do this week?"
Under the chat: button "Try it on WhatsApp".

**What a week looks like** (H2: "Your Results Report, every Monday")
Lead: "What changed on your listing, where you rank, what AI answers said, how your reviews compare, and 3 next steps. Each one is a Yes on WhatsApp." Visual: ReportImage (Example).

**Three ways** (H2: "Three ways to look after your Google listing")
Table: Do it yourself (Free / Your evenings / Easy to forget) · Hire an agency (About $200 to $500 a month / Calls and emails / The agency decides) · Kabsi ($19 a month / One tap to approve / You decide, every time). Note: "Agency range from public price pages, checked [date of the Web 2 check]." The date is filled by Web 2 when it checks; the row is removed if no source is found.

**Trust** (H2: "You stay in charge")
- "Nothing goes live without your yes."
- "Kabsi never asks for your Google password. You add Kabsi as a Manager and can remove it any time."
- "No fake reviews, no rewards for reviews, no asking only happy customers. Ever."
- "Cancel from WhatsApp any time."

**FAQ** (5): see section 16, questions 1, 2, 4, 6, 9.
**Closing band** (black): H2 "See where you show up in about 30 seconds." Scan box. "Free for 14 days. No card. Cancel in WhatsApp."

## 2. Scan result (/scan/CODE)

- Eyebrow: "Free Visibility Scan, [date]"
- H1: "[Business], for '[keyword]'"
- Change keyword link: "Change the search"
- Fast result card: "At your address you rank [n] for '[keyword]'." If not in the top 20: "At your address you are not in the top 20 for '[keyword]'."
- Competitors: H3 "Who shows up around you" then 3 rows: name, rating, review count.
- AI check: H3 "What an AI assistant said" then "[ChatGPT] named you" or "[ChatGPT] did not name you. It named [A], [B] and [C]." Label: "One sample. AI answers change from run to run."
- Full map, loading: "Searching from 49 places around you, like a customer would. This takes a few minutes." Button: "Send the full map to my WhatsApp". Ready: the map, then three numbers: "Your average position: [n]" / "Top 3 from [n] of 49 places" / "[Competitor] comes up above you from [n] places". Legend under the map: "Each dot is a place near you where Kabsi searched like a customer. The number is where you came up. 1 is first." Credit: "Kabsi rank check, not provided by Google."
- Public facts (H3 "From your public Google listing"): Rating, Reviews, Latest reviews returned, Hours, Photos, Website, Phone, Categories. Each shows the value or "Missing". Line: "Shown live from Google. Kabsi does not store it."
- Box (H3 "What Kabsi sees once connected"): "Reviews without a reply, posts, changes others made to your listing, and Google's own warnings."
- Preview chat (H3 "Here is what Kabsi would send you"): built from a review on their listing. Label: "Preview. Not posted."
- Buttons: "Get this on WhatsApp" (main) and "Start free on the web". Under: "Free for 14 days. No card. Cancel in WhatsApp."
- Leaving: "Send me this report" with email or WhatsApp. Done: "Sent."

## 3. Pricing (/pricing)
*Changed by Web 3 (Design 6 round 2, lane R 30 Oct 2026): H1 "Two plans. Free for 14 days." The plan cards and the comparison table use the lines in `src/components/kabsi/plans.ts` word for word (Essentials six lines; Pro "Everything in Essentials, and:" and five lines; the table adds "Profile Coach actions: the change made for you after your yes", Pro only, and lane R keeps the Coach's actions off the cards). The Founding 25 banner reads "Kabsi does the Google work; you tell Rashid what to make better." Prices, the founding lines and the help lines are section 34's, unchanged.*
*Changed by section 34 (Price 1, 30 Oct 2026): the prices in this section are replaced by the list prices 29 and 59 and the founding price 19 and 39.*

- H1: "Simple plans. Free for 14 days."
- Lead: "Every plan has unlimited review replies and runs from WhatsApp. Prices in US dollars."
- Toggle: "Monthly" / "Yearly, 2 months free"
- Essentials: "$19 a month" or "$190 a year". Line: "For one business that wants to see where it stands and keep its listing right." Button: "Start free".
- Pro, badge "Most owners pick this": "$39 a month" or "$390 a year". Line: "For a business that wants to track competitors every week and grow reviews." Button: "Start free".
- Rows (Essentials / Pro): Review alerts and replies (Unlimited / Unlimited); WhatsApp approvals, Ask Kabsi, voice notes (Yes / Yes); Google Protection and suspension alert (Yes / Yes); Visibility Map (1 search, monthly / 5 searches, weekly); AI Visibility (3 questions, monthly / 10 questions, every 2 weeks); Competitor Watch (3 competitors, monthly / 5, weekly); Review Growth (Everything / Everything); Results Report (Weekly / Weekly and a monthly PDF); Posts and photos (Holiday hours and 2 posts a month / Weekly posts, photos from WhatsApp); Profile Coach and category check (Checklist / Checklist and actions); Team roles and approval rules (No / Yes).
- Extra location: "Each extra location is $15 a month or $150 a year, on the same plan."
- Founding offer: "Founding price: the first 30 paying businesses keep their price for as long as they stay. [n] places left." The count is real; the block hides at 0.
- Under the buttons: "Free for 14 days. No card. Cancel in WhatsApp. Your trial starts when Kabsi's access to your listing works."
- Comparison strip (H2 "Buying the pieces separately"): a map rank tool, an AI visibility tool, a review request tool, a listing tool, each with a sourced price and date, then "Kabsi Pro: $39 a month". Only rows with a source ship.
- FAQ: 16 questions 3, 4, 5, 6, 7, 8, 9, 10.

## 4. How it works (/how-it-works)

- H1: "Kabsi does the work. You reply Yes."
- Lead: "Here is what a normal week with Kabsi looks like on WhatsApp."
- The interactive chat (same chips as Home), then the grid H2 "Things you can say to Kabsi": Rankings and AI answers / Competitors / Reviews and review requests / Hours and holidays / Photos and posts / Changes to your listing / Your weekly report / Review link and QR / Your team / Plan and billing / Talk to a person.
- Setup (StepList): 1 "See your map" 2 "Add Kabsi as a Manager" 3 "Answer 5 questions about your business" 4 "Connect WhatsApp" 5 "Get your first full map within 5 minutes".
- H2 "What Kabsi never does": "Posts without your yes." / "Asks for your Google password." / "Writes fake reviews or rewards reviews." / "Asks only happy customers." / "Messages your customers."
- Closing: scan box.

## 5. Free tool: Review link and QR code (/google-review-link)

- H1: "Get your Google review link and QR code."
- Lead: "One link that opens the review box on your listing. Free, no sign-up."
- Box: "Find your business on Google", button "Get my link".
- Result: the link, "Copy link", "Download QR code", "Print a counter card".
- Rules box: "Send it to every customer, the same way. Do not offer anything in return, and do not ask only happy customers. Those are Google's rules."
- Then: "Want to see where you rank too?" Scan box.

**The page a review link opens (/review/CODE), V3.** H1 the business name under "Thank you for visiting". Line: "Tell other people how your visit went. It takes a minute." Button: "Write a review on Google" (Design 2, UX 1; was "Write a Google review"). Under it: "Say what you honestly thought. Everyone sees this same page." and "Your review goes to Google. Kabsi does not read it or change it." Manager line (only when the business saved a WhatsApp number): "Need help now? Message the manager". Inactive: "This review link is no longer active." / "Ask the business for a new one. Thank you for trying."
**Printed cards (counter card A6, table tent A4), V3.** "Tell others how your visit went" / "Scan to leave a review on Google. It takes a minute." / the business name / "Or type go.kabsi.co/CODE". Table tent fold line: "Fold here".

## 6. Guide template (/guides/SLUG)

- H1: the question, for example "Why is my business not showing on Google Maps?"
- Byline: "Kabsi team, reviewed by Rashid Abou Hamzy. Published [date]. Updated [date]. Checked against Google's help pages on [date]."
- Short answer box (40 to 60 words), then numbered steps with screenshots, "Common problems", one inline box ("See where you show up" with the scan box), 3 to 5 FAQs, "Google's own help page" link, related guides.
- End block: "Let Kabsi look after this. Free for 14 days, no card." Button: "See your map".
- First guides, titles: "How to rank higher on Google Maps" / "Why is my business not showing on Google Maps?" / "How to show up in ChatGPT answers" / "How to get more Google reviews, within Google's rules" / "How to choose your primary category" / "My Google Business Profile is suspended. What now?" / "How to set holiday hours on Google" / "How to reply to Google reviews" / "Someone changed my business info on Google".
- Rule for the ranking guides: quote Google's own help page word for word in quotation marks, with its link and the date read (30.32 item 7, K-144), and say what an owner controls. Never say in Kabsi's own words what Google's ranking uses. No promise that any step raises a rank.

## 7. Industry template (/for/TRADE)
*Changed by Web 3: every finished industry page is on the light-led Design 6 shell; the H1's last phrase uses the phrase role (ink on ivory, never yellow on ivory). Unfinished pages stay noindex and unlinked.*

- H1: "See where your [trade] shows up on Google." (barber shop, cafe, auto repair shop, dental clinic, salon, small hotel)
- Lead: "Customers search '[trade] near me'. Kabsi shows you where you appear across your area, and who appears above you."
- Scene image (licensed or generated, never presented as a customer).
- Three cards with trade examples (Example): a review reply in that trade's voice, a post, a map line.
- Scan box with the trade's keyword prefilled.

## 8. Compare (/compare/OTHER)

- H1: "Kabsi or [Other]: an honest comparison"
- Lead: "Checked on [date] from [Other]'s own pages. We recheck every 3 months."
- Table rows: price, who it is for, rank map, AI answers, review requests, replies, WhatsApp, approval before posting.
- H2 "When [Other] is the better choice": a true paragraph.
- H2 "When Kabsi fits": a true paragraph.
- First pages: "Kabsi or Google's free tools in Business Profile", then Birdeye, then Podium.

## 9. City page (/tools/rank-checker/CITY)

- H1: "Google Maps rank checker for [City]"
- Lead: "See where your business shows up across [City] for the search your customers use."
- Scan box, then one real paragraph about searching in that city (areas, how far people travel), then the FAQ. Only Dubai, Abu Dhabi, London and Manchester. Pages that cannot say something true and useful about the city do not ship.

## 10. Partners (/partners)

- H1: "Earn 25% of every payment, for as long as they stay."
- Lead: "Recommend Kabsi to local business owners you know. Everything runs on WhatsApp."
- Steps: 1 "Apply on WhatsApp" 2 "Share your page or check a business for them" 3 "Get paid on the 5th of each month".
- What partners get: "Your own page and QR code" / "Free checks to send to businesses you know" / "A kit of ready posts and a short video" / "A WhatsApp summary every Monday".
- Earnings slider (labelled Example): "If 10 businesses you refer pay for Pro, you earn about $97.50 a month."
- Who it suits: business setup consultants, accountants and bookkeepers, web and social media freelancers, POS and booking resellers, business groups and coworking spaces, creators who speak to small business owners.
- The rules (5): "Say it is a paid partnership, every time." / "Never say Kabsi works with Google." / "Never promise rankings, reviews or customers." / "Never offer anything for reviews." / "No bulk or unsolicited messages."
- Founding Partners: "The first 20 partners get Kabsi Pro free for their own business and a monthly call with Rashid. [n] places left."
- Buttons: "Apply on WhatsApp" (main), "Apply by email".
- FAQ: "When do I get paid?" "On the 5th of each month, once at least $25 has cleared its 30-day hold, with a statement." / "How?" "USDT or USDC, or PayPal." / "What do businesses I refer get?" "30 days of Pro free instead of 14, no card." / "Can I see who joined?" "You see the trade and area. The name only if the owner says yes."

## 11. Partner page (/p/HANDLE)

- Strip: partner photo, "Recommended by [Name], Kabsi Partner", their one line.
- H1: "Your business on Google. Taken care of through WhatsApp."
- Scan box. Under: "30 days of Pro free. No card. Cancel in WhatsApp."
- Pricing and FAQ from the shared blocks.
- Disclosure under the strip and in the footer: "[Name] is a Kabsi Partner and earns a share if you subscribe."
- Inactive: "This page is no longer active." Button: "See your map".

## 12. Prospect report (/s/CODE)

- Eyebrow: "Prepared for [Business], shared by [Name], Kabsi Partner"
- H1: "[Business], for '[keyword]'"
- The map, the three numbers, top competitors, public facts (as the scan result).
- Button: "Get this on WhatsApp". Disclosure as on the partner page.
- Expired: "This report has expired. Run a fresh one in about 30 seconds." Scan box.

## 13. About (/about)

- H1: "Kabsi is built for the owner at the counter."
- Founder note: "I built Kabsi because local owners lose customers to a listing nobody has time to look after. Kabsi measures where you show up, does the work, and asks for your yes on WhatsApp before anything goes live. Rashid Abou Hamzy, founder"
- Facts: "Kabsi is independent and not affiliated with Google." "Contact: hello@kabsi.co." Social links.

## 14. Legal pages (/privacy, /terms, /partners/terms, /security)

- H1s: "Privacy" / "Terms" / "Partner terms" / "Security".
- Lead on each: "Plain words first. The full text follows." Then a 5-line summary box, then the full text from Ops 1 part B (lawyer to read).
- Security summary: "Kabsi never sees your Google password." / "You can remove Kabsi as a Manager any time." / "Your data is encrypted in transit and at rest." / "Data from your Google listing is deleted after you leave." / "Report a problem: hello@kabsi.co."

## 15. 404 and error

- 404 H1: "This page is not here." Line: "The link may be old. Nothing on your Google profile changed." (Price 1, 30 Oct 2026) Buttons: "Go home", tertiary "Check my business free".
- Error H1: "Something went wrong on our side." Line: "Nothing you did. Try again in a minute." Button: "Try again".

## 16. Shared FAQ (answers from the facts)

1. "Does Kabsi need my Google password?" "No. You add Kabsi as a Manager on your listing. You stay the owner and can remove Kabsi any time."
2. "Is anything posted without me?" "No. Every reply, post and change waits for your yes on WhatsApp."
3. "What if I already reply to reviews myself?" "Keep going. Kabsi drafts a reply for each new review, and you can edit or skip any of them."
4. "Can Kabsi promise where I come up on Google Maps?" (Price 1, 30 Oct 2026) "No one can promise that. Kabsi shows where you show up, what changed, and what you can do next."
5. "Can I edit replies?" "Yes. Tap Edit on WhatsApp or on the Kabsi website."
6. "Is this safe with Google?" "Kabsi uses Google's tools for managers and only acts after your yes. Kabsi is independent and not affiliated with Google."
7. "What happens after the trial?" "Choose a plan to keep going. If you do not, Kabsi stops publishing and you keep your review link and QR code."
8. "Can I cancel?" "Yes, any time. Your plan runs to the end of the period you paid for." (Price 1, 30 Oct 2026: Kabsi's own Cancel is scheduled, master plan 30.20 section 4)
9. "Where does the ranking data come from?" "Kabsi runs its own checks of public Google Maps and AI answers. They are separate from the numbers in your Google Business Profile."
10. "Is my data safe?" "Yes. Read how Kabsi handles it on the Privacy page."

## 17. Log in (/login)

- H1: "Log in to Kabsi"
- Field: "Email". Button: "Send me a code". Then: "Enter the 6-digit code we sent to [email]." Button: "Log in". Link: "Send a new code".
- Error: "That code did not work. Check it, or send a new one."
- Under: "New here?" link "Check my business free" (changed in Audit 1: "See your map" is retired, section 24 names the button).

## 18. Website, signed in: onboarding (28.5)

Changed by section 25 (UX 1, Design 3's approved lines win where they differ).

1. Sign up. H1 "Let's set up [Business]." (or "Find your business" when unknown). Button: "Continue".
2. Manager. H1 "Add Kabsi as a Manager on Google." Steps with live status: "Invite sent. Kabsi accepts it within a few minutes." / "Access works." Buttons: "Show me how", tertiary "Send this to my manager", "Resend". Line: "Google Business Profile is free from Google. Kabsi is an independent paid service." Link to Google's third party page.
3. Five questions, one screen. H1 "A few things about your business." Then H2 "The search Kabsi will track" with the keyword prefilled ("Change"), and H2 "Pick your competitors" with the scan's list (pick 3, or 5 on Pro). Button: "Save".
4. WhatsApp. H1 "Connect WhatsApp." Desktop: "Scan this code with your phone." Phone: button "Open WhatsApp". Line: "Kabsi only messages you about your business. Reply Stop any time."
5. Done. H1 "Your first map is on its way." Line: "It arrives on WhatsApp within 5 minutes."

## 19. Website, signed in: dashboard tabs

Changed by section 25 (UX 1, Design 3's approved lines win where they differ).

- Home, H1 "Waiting for you". Empty: "All caught up." / "Kabsi will message you on WhatsApp when something needs you." Plan strip: "Pro trial, [n] days left."
- Visibility, H1 "Where you show up". Sections: "Google Maps" (map, three numbers), "AI answers" ("Named in [n] of [n] answers this period", label "A sample"), "Competitors". Credit line under each: "Kabsi rank check, not provided by Google."
- Reviews, H1 "Reviews". Filters: "Waiting", "Published", "All". Card: KabsiCard. Review Growth box: "This month: [n] new reviews. Your competitors average [n]." Buttons: "Ask a customer", "Get your QR card".
- Profile, H1 "Your listing". Sections: "Details", "Hours", "Photos", "Posts", "Changes others made". Coach list: "[n] things to fix".
- Reports, H1 "Results Reports". Two labelled sections in every report: "From your Google Business Profile" and "From public Google Maps and AI checks by Kabsi".
- Settings, H1 "Settings". Groups: "Your business", "WhatsApp", "What Kabsi tells you", "Team", "Plan", "Disconnect".
- WhatsApp connect, H1 "WhatsApp". "Connected to [number]." Button: "Change number".
- Team (Pro), H1 "Team". "Invite someone" / roles "Owner", "Manager", "Staff" / "Approvals": "Who can approve replies and posts".
- Plan, H1 "Your plan". "Pro trial, ends [date]." Buttons: "Choose Essentials", "Choose Pro". Line: "Card payments will be processed by Creem, our merchant of record."
- Notifications, H1 "What Kabsi tells you". Switches: "New reviews on WhatsApp", "Changes to your listing", "Results Report on WhatsApp", "Results Report by email", "Tips during your trial".
- Disconnect: H1 "Disconnect Kabsi". Line: "Kabsi stops, and data from your Google listing is deleted after 7 days." Button: "Disconnect" (secondary). (Matches the 30.10.1 change sent to session A on 25 Oct.)
- Staff page (Rashid only): "Today" (waiting approvals, partner applications, payouts), "Costs this month" against MRR, "Number health". No marketing copy.

## 20. WhatsApp screens (one per role)

- Owner, review: "[Business]: new 4-star review from Maya. 'Great sourdough, a bit of a wait on Saturday.' Reply ready: 'Thank you, Maya...' Reply Yes to publish." Buttons: Yes / Edit / Skip. After Yes, Kabsi's real lines (task-close.ts), never "Published" in the same breath: "Approved. It goes to Google in 10 seconds. Reply Undo to stop it.", then a centred chip "A few minutes later", then "[Business]: Your reply is on Google. Done." ("Published on your Google profile." is retired, UX 1 round 2, master plan 30.15 3.1.)
- Owner, first map: "Your first map is ready. We searched 'bakery' on Google Maps from 49 places around your shop, like a customer standing there. You came up in the top 3 from 18 of them. East of the station, Harbor Bakes comes up first. 3 next steps:" Buttons: "Show me" / "Later".
- Partner: "Hi Sara. This week: 42 page visits, 6 scans, 2 trials, 1 paying business. Earned $9.75, cleared after the 30-day hold. Next payout: 5 Nov." Buttons: "My link" / "Scan a business".
- staff_admin: "Morning, Rashid. 3 things today: 2 partner applications, 1 payout list to approve, number health good." Buttons: "Review applications" / "Approve payouts".
- Unknown: "Welcome to Kabsi. Did you just scan your business on kabsi.co? Send me your business name or the code from the page and I will pick up from there."
- Two roles: "Your business or your partner tools?" Buttons: "Business" / "Partner".

**Review Growth, photos, the monthly question and sensitive reviews (V3, 30.15 sections 3.3 to 3.7).**
- Ask a customer: "Here is the message for your customers. Forward the next message from your own phone, after a real visit. Send it to every customer the same way. Kabsi never gets their number and never messages them." Then, as its own message: "Thanks for visiting [Business]. If you would like to leave a review, here is our link: [link]". No link yet: "[Business] has no review link yet. Make one in Kabsi under Get Reviews, then ask me again."
- Stats, second paragraph: "[n] new reviews on Google in the last [days] days. Your review link was opened [n] times. An open is not a review."
- Photo sent: "Got it. Kabsi is getting your photo ready and will ask you here in a minute: Yes, Edit or Skip. Nothing goes on Google until you say yes." From staff: "Thank you. Kabsi is getting the photo ready, and the owner is asked to approve it. Nothing goes on Google until they say yes."
- Photo ready: "[Business]: your photo is ready. Kabsi checked the size and light and saved a clean copy with no location details. It would go on your Google profile as [the inside]. Put it on your Google profile?" Buttons: Yes / Edit / Skip. Edit: "What is it of? Reply with the number." with eight kinds. Skip: "Okay, skipped. Nothing was put on Google." Could not use: "[Business]: Kabsi could not use that photo. [Reason]. Please send another one."
- Monthly question: "[Business]: anything new this month? Any new services, prices, products or opening times? Reply here in your own words, or reply No if nothing changed. Kabsi turns your answer into drafts, and nothing goes live without your yes." After No: "Thanks. Nothing to change this month. I will ask again next month." After an answer: "[Business]: thanks. Kabsi can post this on your Google profile after your yes. It is your own words." with the post in quotes, Approve and Edit on kabsi.co.
- Sensitive review: "[Business]: a new [n]-star review needs your care. It is about something sensitive, so Kabsi shows none of it here and did not write a reply. Read it in Kabsi first." For a clinic: "Kabsi shows nothing of what the customer wrote here, and did not write a reply. Details about a patient or client stay out of WhatsApp. Read it in Kabsi." Then the link, "Reply \"talk to a person\" and someone at Kabsi will help you here." and the button "Talk to a person".
- Voice note: "I heard: \"[words]\"" then the answer to those words. Not switched on: "Voice notes are not switched on yet. Please type your message and I will take it from there." Not heard: "I could not hear that note clearly. Please try again, or type your message." Too long: "Please keep voice notes under 3 minutes".

**Onboarding, the first 48 hours (30.16 section 3).** Sent only when the event happens. Outside the 24-hour window, the approved template with the same words.
- First message back: "Hi [Name], I am Nora, Kabsi's AI assistant. I have your free check for [Business]. Can Kabsi send your setup steps and approvals here? Reply Yes, or Help to talk to Rashid, the founder. Reply Stop any time." The free check is sent whatever the answer.
- The check: "Your nearby check for '[search]', [date]: [one factual line]. Results change by place and time. Nothing has changed on Google."
- The invite: "Next, add Kabsi as a Manager on your Google profile. On Google: your profile, Business Profile settings, People and access, Add. Paste Kabsi's ID 5481006796 (it comes in the next message, to copy), choose Manager, then Add (on some screens, Invite). Manager access lets Kabsi make changes, and Kabsi publishes only what you approve. You stay the owner and can remove Kabsi any time. Never send us a password or a code."
- Right after it, on its own so a long press copies it: "5481006796"
- If someone else looks after the profile: "Send these steps to whoever looks after your Google profile:" then the five steps and the ID.
- Cannot find it: "You may be signed in to another Google account, or you may be a manager yourself. Only an owner can invite Kabsi. Does someone else look after Google for [Business]?"
- Founder: "Hi [Name], Rashid here, Kabsi's founder. I can help you finish this. Steps here, or a short call? You make every change on your own phone."
- Access works: "Kabsi now has Manager access to [Business]. Your free trial starts today and ends on [date]. No card, and no charge unless you choose a plan. Nothing has been published. I am preparing your first task."
- First task (a review with no reply): "This review for [Business] has no reply: '[review]'. Here is the reply I suggest: '[draft]'. Publish it on Google?" Buttons: Yes / Edit / Skip.
- After Yes: "Approved. It goes to Google in 10 seconds. Reply Undo to stop it."
- Confirmed: "Your reply is on Google: [link]. Done."
- Not confirmed yet: "Your yes is saved. I have not seen the reply on Google yet. Nothing else is needed from you. I will tell you when it shows." A known failure says what failed and the next step instead.
- A post, when useful: "I can prepare a Google post about [service]. Do you offer it now, and is there anything customers should know before booking?"
- One reminder: "Your [reply or post] for [Business] is ready. Nothing has been published. Review it now, or later?" Never a second reminder.
- After 48 hours: "Done for [Business] so far: [work, with links]. Waiting for you: [item, or nothing]. Your trial ends on [date]. What still feels like work you do yourself?"
- Still blocked: "Setup for [Business] is waiting for [step]. Your trial has not started and nothing has been published. Want help with that step?"
- Stop: "WhatsApp messages are stopped. Your plan and Kabsi's Google access stay as they are; change them here: [link]. Send Start to turn messages back on."

## 21. Images Kabsi sends

Changed by section 25 (UX 1, Design 3's approved lines win where they differ).

- Map image: title "'[keyword]' around [Business]", date, legend "1 to 3", "4 to 10", "11 to 20", "Not in top 20", credit "Kabsi rank check, not provided by Google. Map: Geoapify, © OpenStreetMap contributors."
- Report image: "Results Report, [dates]", the two labelled sections, footer "Your reviews and listing. Taken care of."
- PDF (Pro, monthly): cover "Monthly Results Report, [month], [Business]", the same two sections, "What Kabsi did", "3 next steps".

## 22. Three emails

- Review: subject "[Business]: new [n]-star review, reply ready". Body: "[Name] wrote: '[first line]'." Draft box. Button: "Approve reply". Line: "Nothing is published until you approve it."
- Welcome: subject "Welcome to Kabsi, one step left". Body: "Add Kabsi as a Manager on your Google listing and your first map arrives on WhatsApp within 5 minutes." Button: "Add Kabsi as a Manager". Line: "Google Business Profile is free from Google. Kabsi is an independent paid service."
- Results Report: subject "[Business]: your Results Report for [dates]". Body: the report image, then "3 next steps", each a line. Button: "Open your report".
- Footer on all: tagline, non-affiliation line, Facebook and Instagram, "Unsubscribe from these emails" where allowed.

## 23. Creem checkout (as Kabsi styles it)

- Product names: "Kabsi Essentials, monthly" / "yearly", "Kabsi Pro, monthly" / "yearly", "Extra location".
- Description: "Your Google listing and reviews, managed from WhatsApp. Cancel in WhatsApp any time."
- Success page: H1 "You are all set." Line: "Your plan starts the day Kabsi's access to your Google listing works." Button: "Back to Kabsi".
- Extra locations (Billing 2, 28 Oct 2026, master plan 10.2.3; each extra location is its own Creem payment on the owner's same Creem customer):
  - Plan page buttons: "Add a location", "Remove a location" (shown when the plan has an extra location).
  - Confirm lines: "Add a location for [$15 a month]. You pay for it on Creem's page now, and it renews from today." / "Remove one extra location at the end of its paid period. Then Kabsi stops its work for your newest business. Nothing changes on Google."
  - After removing: "Done. The extra location ends on [date]."
  - Banner on a business past the plan's locations: title "This business is not on your plan." Line: "Kabsi has stopped its work here. Nothing on Google changed. Add a location to start again."
  - WhatsApp: "Add a location for [$15 a month]? You pay for it on Creem's page, and it renews from today." Then after Confirm: "Pay for the extra location here: [Creem link]" and "Kabsi adds it to your plan when the payment goes through."
  - Refusals (Plan page and WhatsApp): "Your plan is set to end. Tap Keep my plan first, then add a location." / "Kabsi is adding that location now. Check your plan again in a minute." / "Your plan has no extra location to remove."
  - Retired: "Done. Kabsi added a location to your plan." and "Done. Your plan now has [n] extra locations." (the location now joins when Creem's payment goes through).

## 24. Web 2: the approved design lines on kabsi.co (27 Oct 2026)
*Changed by section 34 (Price 1, 30 Oct 2026): the prices in this section are replaced by the list prices 29 and 59 and the founding price 19 and 39.*

Web 2 ported the design studio's public pages (itskaysyoga-gif/kabsi-design-studio, docs/DESIGN-PROPOSAL.md). Every line below was approved by lane R in Design 1 to 5 (DESIGN-BRIEF.md sections 12, 13, 16 and 17) and is copied here word for word, so this file stays the one copy deck. The industry pages' lines are in src/content/industries/*.ts and the Home examples in src/content/home-examples.ts (Design 5, approved); Content 1 finishes the other nine industry pages there.

Where the live site differs from the prototype:
- Every count is the real one or none: Founding 25 places (GET programs/founding), the founding price places (GET billing-creem/founding, Pricing only), Founding Partner places (GET programs/partners). The Example badge stays on every example (the hero story, the tappable demo, the nearby card on the free check page, the counter card before a business is found).
- The prototype's ?state= links show states only in development; on kabsi.co a page shows the state it is really in.
- While Kabsi's WhatsApp number is empty in the one setting (K-122), the WhatsApp buttons ("Chat on WhatsApp", "Apply on WhatsApp", "Get this on WhatsApp", "Send the full map to my WhatsApp", the phone bar's WhatsApp button) are hidden and hello@kabsi.co is shown instead. "Send on WhatsApp" in the access steps opens WhatsApp with no number, so the owner picks who gets the steps.
- Security, Privacy, Terms and the partner terms keep kabsi-canvas's own full text in the design studio's layout. Their "In short" lines are the approved ones that are true on every count today: Security "Kabsi never sees your Google password.", "You can remove Kabsi as a Manager any time.", "Nothing goes live without your yes.", "Report a problem: hello@kabsi.co."; Privacy "Kabsi collects your email, your WhatsApp number and the details of your business.", "Your public Google profile is shown live in the free tools. Kabsi does not store it.", "Ask a question or ask to see your data: hello@kabsi.co."; Terms "You can cancel from WhatsApp, any time.", "Nothing goes live on your Google profile without your yes.", "Kabsi cannot promise rankings, reviews, calls or customers.", "Kabsi is independent and not affiliated with Google."; Partner terms the five lines of Design 2.
- The consent bar and "Your privacy choices" keep the wording stored as proof (CONSENT_VERSION 2026-10-25: the bar line above and one switch, "Let Kabsi measure its ads"), in the new look. Design 1's two-switch panel needs a new consent version (docs/LATER.md).
- The free check result: "What to do first" is the first fact and action the public profile check returns (the profile-snapshot function's lines); the nearby cards, the quick result line, "An answer customers might see" and its label are V4's own lines from GET /visibility/check. "Start free on the web" keeps the business and opens Log in, then setup.
- About and How it works closing bands: "Start with a free check." (Home's approved line).

New lines Web 2 needed, for lane R to approve (the rest of each form uses approved labels and the server's own messages):
- Founding 25 form: "Why now?" is required (the server asks for at least a line: "Please tell us in a line or two why now."), so "(optional)" is dropped. The case study is sent as anonymous until the owner chooses with Rashid (decision to confirm).
- Partners, "Apply by email" form: labels "Your name", "Email", "Who it suits" (the kinds: "Business setup consultant", "Accountant or bookkeeper", "Web or social media freelancer", "POS or booking reseller", "Business group or coworking space", "Creator who speaks to small business owners", "Something else"), "I agree to the partner terms.", the button "Apply by email", done "Application sent." with "Kabsi replies with the next step." Errors are the programs function's own. Step 1 of "How it works" reads "Apply by email" while WhatsApp is off.
- Free check: "Pick your business" with "This one" (Design 2 lines) when the search finds more than one; "Send me this report" with the fields "Email" and, while WhatsApp is on, "WhatsApp number", each with the stored consent words of the profile check.
- FAQ "Talk to a person" while WhatsApp is off: "Write to hello@kabsi.co." with the address as the button.

### Design 1

Approved in round 1: every line below down to the /system page lines.

- Scan box empty error: "Type your business name and city."
- Waitlist field label: "Email or WhatsApp number". Its error: "Type an email address or a WhatsApp number with its
  country code."
- Privacy panel: title "Your privacy choices"; "Choose which cookies Kabsi may use. You can change this any time from
  the footer."; "Necessary" / "Keep the website working and remember these choices. Always on."; "Measuring visits" /
  "Count visits and see which pages help, without your name."; "Ads" / "Show Kabsi ads to people who visited, and see
  which ads work."; buttons "Save my choices", "Only necessary".
- Hero scene lock screen: "Saturday 25 October"; notification time "now"; chat header "Business account"; "Play again".
- Footer: "Your privacy choices", "© 2026 Kabsi". Header: "Skip to content", "Open menu", "Close menu".
- /system page lines (internal page, noindex).

New in round 2, for lane R to approve:

- Home: FAQ title "Questions owners ask" (also Pricing); "Compare the plans"; the AI answer card "An AI assistant,
  asked like a customer", "Where can I get good croissants near the station?", "Corner Bakery is a popular choice,
  with fresh croissants from 7 in the morning. Harbor Bakes is also nearby.", "Named you"; QR card "Scan to leave a
  review"; alerts "Saturday hours checked: 7 to 4", "New photo ready to post", "Holiday hours ready for 1 November",
  "Someone changed your phone number"; WhatsApp card "Corner Bakery: a photo of today's sourdough is ready to post,
  with: 'Fresh from the oven at 7.' Reply Yes to post."; the story "Yes: It goes live on your Google listing.",
  "Edit: Change a word, then reply Yes.", "Skip: Nothing is posted.", "Undo: Changed your mind? Tap Undo in the next
  10 seconds and nothing reaches Google."; report labels "New reviews", "Replies published", "Calls and directions", "Places of 49 where
  you came up in the top 3", "Your average position", "AI answers of 5 that named you", "The two kinds of numbers are
  never mixed."; map image title uses COPY.md 21.
- Scan: searching "Searching for [business]", "Finding your business on Google", "Checking where you come up at your
  address", "Asking an AI assistant about you"; "The full map"; not found "We could not find that business." and
  "Check the name and city, or type the name exactly as it shows on Google."; "Missing" as a pill.
- How it works: the six chat answers (Example), "Your first 14 days", "The same thing shows on WhatsApp and on the
  Kabsi website. Answer wherever you are.", the seven day lines and their website cards, "Pro trial, ends today.".
- Pricing: "What each plan includes" (screen readers only).
- Log in: field label "Code"; "Sent. Check your email."; email error "Check the email. It needs a full address, like
  name@shop.com.".

### Design 2

Every other line on these pages is from COPY.md (sections 2, 5, 10 to 12, 13 to 17, 20, 22, 23 and the shared pieces).

- Tools: tabs "Review link and QR code", "Google profile check", "Visibility scan"; "Today's free checks are used up."
  with "Try again tomorrow, or leave your email or WhatsApp and Kabsi sends the result then."; "Your review link";
  "Building your link and QR code"; "It takes a minute."; the three lines under the box ("Type your business name and
  city.", "Kabsi finds your listing and builds the link.", "Put the code by the till, and send the link to every
  customer.").
- Profile check: H1 "Check your Google profile."; lead "See what customers see on your public listing, and what is
  missing. Free, no sign-up."; button "Check my profile"; "Reading your public listing", "Checking what is missing";
  empty cards "Your details", "What is missing", "What to fix first" with one line each; "[n] of 8", "details filled in";
  the three fixes ("Add your website", "Check your holiday hours", "Reply to the reviews that wait") with their lines;
  the website line "Add your website. Customers who want a menu or a booking look for it first."
- Find your business: lead "Kabsi finds your Google listing, so it can set up everything for you."; "Find my business";
  "Pick your business", "This one"; "Is this your business?", "Yes, this is it", "Pick a different one"; lead under "Let's
  set up [Business]." "Kabsi sends a code to your email each time you log in. There is no password."; step names "Find
  your business", "Your email", "Add Kabsi as a Manager"; "Step [n] of 3".
- Manager steps: "You stay the owner. You can remove Kabsi any time."; "Not started", "Five taps on Google, and Kabsi can
  start.", "Kabsi checks for your invite by itself. Nothing goes live without your yes."; "Waiting", "Invite sent. Kabsi accepts it within a few minutes.", "This page updates
  by itself.", "Sent again."; "Done", "Kabsi can now see your listing. Your first map arrives on WhatsApp within 5
  minutes of connecting it."; "Kabsi cannot see the invite yet." with "Check that you typed the address exactly and
  chose Manager, not Owner. Then send the invite again." and "Check again"; "How to add Kabsi" and its five steps (open
  your Business Profile on Google; open Business Profile settings, then People and access; tap Add; type Kabsi's
  address and choose Manager; tap Invite); "Where you are" with "Send the invite on Google", "Wait for it to arrive";
  "Kabsi's address", "Copy address"; "Send this to your manager" with its message, "Send on WhatsApp", "Send by email",
  "Back"; the drawing caption "A drawing of the form, not a screen from Google."
- Setup call: H1 "Book a setup call."; lead "A short call to set up Kabsi with you. You pick the time."; "Pick a day",
  "Pick a time", "Times are shown in your time zone."; "Your details", "Your name", "WhatsApp number" with "With its
  country code. Kabsi sends the call details here.", "Book my call", "Your call", "Pick a time"; the side line; "Booked",
  "A message is on its way to [number]. It has everything you need for the call.", "Back to Kabsi", "Change the time";
  "No times left this week." with "Leave your WhatsApp number or email and Kabsi writes to you with new times."; "That
  time was just taken." with "Someone booked it a moment ago. Nothing was saved." and "Pick another time".
- Guides: H1 "Plain guides for your Google listing." with "Short answers, then the steps. Each one is checked against
  Google's own help pages."; "Read the guide", "Next guides", "Next" (a title with no article yet), "More guides", "All
  guides"; the article "Why is my business not showing on Google Maps?" in full (short answer, six steps, three common
  problems, three questions); "The short answer", "Check these, in this order", "Common problems", "See where you show
  up" with "Type your business and Kabsi searches from places around it, like a customer.", "Questions", "Google's own
  help page", "Let Kabsi look after this." with "Free for 14 days, no card."
- Industries: H1 "Kabsi for your kind of business." with "Pick yours. See what Kabsi sends and where you could show up.";
  "What Kabsi sends a [trade]", "Every reply, post and map waits for your yes on WhatsApp.", "A review reply", "A post",
  "A map line", "Ready to post, waiting for your yes", "Other kinds of business", "Kabsi searches for '[keyword]', like
  a customer."; each trade's review, reply, post and map line (d2-data.ts).
- Compare: H1 "Kabsi next to the other ways to look after your listing." with its lead, "An honest comparison, row by
  row.", "Read it", "Kabsi is independent and not affiliated with [Other].", every cell and the two paragraphs per page.
- City: H1 "Google Maps rank checker, by city." with its lead, "Searching in [City]", "Places that matter here:", the
  paragraph for each of the four cities, three questions.
- Partners: "How it works", "What you could earn" with "Pro is $39 a month. You earn 25% of every payment, for as long as
  the business stays.", "Businesses you refer", "Who it suits", "The rules", "Read the partner terms", "Founding
  Partners", "Questions partners ask", "Earn 25% of every payment."; the five line summary and sections of the partner
  terms; partner page "Simple plans. Free for 30 days."; inactive "This page is no longer active." with "The person who
  shared it may have stopped. Your listing is fine, and the scan is free."; report "Expired", "This report has expired."
- Long text: About "Plain facts", "Follow Kabsi", "Or ask a question on WhatsApp. A person answers."; FAQ groups "The
  basics", "Plans and cancelling", "Google and your data", and the five added questions (messages to customers, price,
  more than one location); "Talk to a person", "Ask on WhatsApp, or write to hello@kabsi.co."; "In short", "On this page",
  "Updated [date]"; the text of Security, Privacy and Terms.
- The review page: "Tell other people how your visit went. It takes a minute.", "Write a review on Google", "Say what you
  honestly thought. Everyone sees this same page.", "Your review goes to Google. Kabsi does not read it or change it.",
  "Google is opening.", "If nothing happened, tap the button again.", "We could not open Google.", "Check your connection
  and try again.", "This review link is no longer active." with "Ask [Business] for a new one. Thank you for trying."
- Set up a card: "Set up your card.", "Card [code] is new. Find your business and Kabsi links it, so customers who scan it
  reach your review box.", "Link this card to [Business]?", "Link my card", "Pick a different business", "Your card is
  ready.", "Customers who scan card [code] go to the review box for [Business]. Put it by the till.", "Log in to see
  your card", "This card is already linked to [Business]." with its line, "We do not know this card." with "Check the code
  printed on the back, or ask on WhatsApp.", "We could not link the card."
- Staff upload: "Send a photo to [Business].", "[Owner] sees it first. Nothing is posted until [Owner] says yes. You do
  not need an account.", "Take or choose a photo", "Your food, your shop or your work. One photo at a time.", "Choose a
  photo", "What is it? (optional)", "Send to [Owner]", "Choose a different photo", "Sending", "Sent to [Owner].", "Send
  another photo", "That photo is too big." with "Choose one under 15 MB, or take a new one.", "That is not a photo." with
  "Choose a picture from your phone, or take a new one.", "This link has expired." with "Ask [Owner] to send you a new
  one."
- Email actions: "A reply is ready.", "Approve reply" (COPY.md 22), "Edit", "Skip", "Save and approve", "Cancel",
  "Approved.", "Changed your mind? Tap Undo in the next [n] seconds and nothing reaches Google.", "Waiting [n]
  seconds", "Undo", "Sent to Google. Kabsi tells you when it shows there." (COPY.md 25; "Published on your Google listing." is retired), "To remove it, open your Kabsi account on the
  website.", "Undone. Nothing reached Google." with "The reply is back, waiting for your yes.", "This reply is already
  handled." with "You approved it on WhatsApp, so there is nothing more to do here.", "Log in to approve the reply on the
  Kabsi website.", "Nothing is published until you approve it."; hours: "Holiday hours ready for 1 November." (Home alert),
  "Customers look up your hours before a holiday. Say yes and your listing shows them.", "Yes, use these hours",
  "Change", "Save these hours", "Closed all day", "Opens", "Closes", "Done.", "Your listing will show: [hours] on 1
  November.", "Skipped. Nothing was changed.", "Your listing keeps its usual hours.", "Nothing changes on Google until you
  say yes."
- Unsubscribe and payment: "Stop these emails?", "You get the Results Report by email at [email]. Unsubscribe and Kabsi
  stops sending it.", "Unsubscribe", "Choose which emails I get", "You are unsubscribed.", "Kabsi stops sending Results
  Report emails to [email]. WhatsApp messages are not affected.", "Changed your mind? Turn them back on"; "Checking your
  payment." with "This takes a few seconds. You do not need to pay again.", "We have not received your payment yet." with
  "If your bank asked you to confirm it, finish that first. If you were charged, write to hello@kabsi.co and a person
  helps.", "Check again", "Back to the plans". "You are all set." and its line are COPY.md 23.

### Design 4

Every other new line is from COPY.md (sections 0.1, 1, 16, 20 and the shared pieces) or master plan 30.15 and 30.16.

- Nearby cards: "'[search]' around [Business]" (COPY.md 21), "Searched on Google Maps, [date]", "Near your salon",
  "Near the metro station", "By the park" (Example names), "You came up [2nd].", "You were not in the first 20.",
  "[Name] came first.", "You came first.", "Detailed results".
- Home: "Try it: one review, ready for your yes."; "This is how every reply, post and change reaches you. Tap Yes,
  Edit or Skip."; "Yes: it goes to Google, with 10 seconds to Undo."; "Edit: change a word, then reply Yes.";
  "Skip: nothing is posted."; "On WhatsApp"; "Send the words you want. I show you the new reply before anything is
  published."; "Skipped. Nothing is posted."; "Undo ([n])"; "A sample conversation. This preview publishes
  nothing."; "Start again"; the three benefits ("Review replies, ready", "Your details kept right", "Posts and
  photos, done" with their lines); "And you see where you come up nearby: three places, who came first there, and
  one count from the 49 places Kabsi checked."; "For salons", "For barbers"; "You keep the keys." with "The free check
  needs no access. When you start, you add Kabsi as a Manager on your Google profile." and its three points; "A
  person helps" with its line; "Two plans. The work comes first."; "Start with a free check." with "The quick check
  shows in about 30 seconds. The full check from 49 places around you arrives on WhatsApp within minutes."
- Hero scene review: Layla K., "'Hana did my colour and it is exactly what I asked for.'", reply "'Thank you, Layla.
  We will pass this on to Hana. See you at your next visit.'"; demo review from Maya and its reply.
- FAQ 11: "Can't I do this myself for free?" "Yes. Your Google profile is free, and you can reply to reviews and
  update it yourself. The subscription pays for the ongoing work: Kabsi keeps checking, drafts the replies and
  posts, follows up, and brings each one to you on WhatsApp for a yes."
- Free check: "Check your business on Google, free."; "See your public Google profile and where you come up nearby,
  together. Kabsi asks for nothing before you see the result."; "Your Google profile" and "Where you come up nearby"
  with their lines; "The full map arrives on WhatsApp within minutes, if you want it."; tab "Free check".
- Scan result: "Free check, [date]"; "What to do first"; "[n] reviews on your Google profile have no reply."; "Kabsi
  drafts a reply to each one. You approve them on WhatsApp before anything goes live."; "This was the quick check,
  from your address. The full check from 49 places around you takes a few minutes."; "How to read it" and its
  paragraph; "[Assistant], [date]. Asked: '[question]'", "It named you.", "It did not name you.", "Sources it cited:
  [sources]."; "Your public Google profile, in full"; "Reviews without a reply", "Website or booking link"; the new
  "What Kabsi sees once connected" text.
- Review link tool: "A message to send after a visit", "Thank you for visiting [Business]. If you have a minute, you
  can leave a review on Google here: [link]", "Copy message", "Free, no sign-up."
- Pricing: the three lines per plan, the two plan lines ("For one business that wants its Google work done and its
  details kept right.", "For a business that wants more posts, a team that approves, and weekly checks."), the
  table rows, the founding line.
- Trade pages: the salon and barber H1s and leads, "Where you show up nearby", "Every reply and post waits for your
  yes on WhatsApp.", the barber nearby names.
- How it works: the five setup steps above.
- Partners: "Earn 25% of every payment." with "Recommend Kabsi to local business owners you know. You earn while the
  referred subscription stays paid. Everything runs on WhatsApp."

### Design 5

All industry content in src/content/industries/*.ts (hair-salon, restaurant and dental-clinic in full; the nine
others' leads, searches and tasks) and the eleven Home examples in src/content/home-examples.ts are new lines. Also:

- Picker: "Pick your business", "The example on this page changes to match.", "Other", "Showing [Business], an
  example.", "Kabsi for hair salons" (and for barbershops, restaurants, cafes, clinics, dental clinics, garages,
  gyms, hotels, home services, shops); Home: "Kabsi for your kind of business".
- Industry template: "Your [trade] on Google. Taken care of."; "Five jobs that come back every month"; "Kabsi
  prepares each one. You reply Yes on WhatsApp."; "What customers search"; "Searches like these. Kabsi checks the
  ones your customers use in your area."; "Google categories that fit", "First category:", "Also:"; "What customers
  write about"; "Post ideas"; "Photos that matter"; "Holidays and busy dates"; "Where you come up nearby" with "The
  free check searches '[search]' from places around you, like a customer standing there."; "Keep reading", "[Hub]:
  every kind of business", "The free check"; "A sample conversation. Every business here is an example.";
  breadcrumbs "All businesses".
- /for and hubs: "Kabsi for every local business." with its lead; the nine hub names and leads (index.ts); "Pages
  on the way"; "Kabsi works for any business with a Google profile. Start with the free check."; "[n] kinds of
  business so far, with more every month."
- Founding 25 (banner from COPY.md): "[n] of 25 places left.", "All 25 places are taken."; /founding: H1
  "Founding 25: three months of Kabsi Pro, free.", "Who can apply", "What you get", "What Kabsi asks" and their
  lines, "The 25 places" with the four groups, "A place still open after 30 days goes to the next good applicant
  of any trade.", "Rashid Abou Hamzy, founder of Kabsi, reads every application himself.", "Apply for a place", "Two
  minutes. Rashid answers on WhatsApp.", the field labels and errors, the two consents, "Send my application", the
  five states' lines, the four questions.
- Access steps: the approved lines of 16.1, the five steps ("On Google, open your profile: search your business name
  while signed in." / "Tap Menu, then Business Profile settings." / "Tap People and access, then Add." / "Paste
  5481006796 and choose Manager." / "Tap Add. On some screens the button says Invite."), "Kabsi's ID on Google",
  "Copy the ID", "Copied", "Five steps on Google", "Our own drawings of each step, not screens from Google.", "After
  you tap Add", "Invite pending", "Accepted by Kabsi" and "Access checked" with their lines, "Send on WhatsApp", "Send
  by email", "A 16 second recording, on a real profile.", "Play the recording", "Pause the recording"; "You can
  remove Kabsi any time." with "On Google: your profile, Business Profile settings, People and access, Kabsi
  Clients, Remove. Kabsi loses access at once."; free check "When you start: add Kabsi on Google" and its line;
  /manager-steps "Invite pending", "Kabsi accepted your invite.", "Check that you pasted 5481006796 and chose
  Manager, not Owner. Then tap Add again."
- Navigation: header "Businesses", "Founding 25"; footer "Every kind of business", "Hair salons", "Barbershops", "Restaurants",
  "Dental clinics", "Founding 25". About: "Rashid Abou Hamzy, founder of Kabsi".

## 25. UX 1: the signed-in website, the onboarding and the leftovers (27 Oct 2026)

Design 3's lines were approved by lane R (master plan 30.17 section 4: "Design 3's changed lines are approved and go into COPY.md in UX 1"). They replace the older lines of sections 18, 19 and 21 where they differ ("listing" is retired, the onboarding has four stages, the report has one next step). The email and checkout lines below are for Email 1 and the checkout session; UX 1 used the website and onboarding lines. The lines are copied word for word from the design studio (docs/DESIGN-PROPOSAL.md, Design 3, "New copy lines").

- Task states: "Waiting for your yes", "Needs you", "Approved", "Sent to Google", "Live on Google", "Did not go through", "Skipped", "A person should answer"; the track "Approved", "Sent to Google", "Live on Google"; "Approved. It goes to Google in [n] seconds.", "Your yes is saved. Kabsi has not seen it on Google yet. Nothing else is needed from you. Kabsi tells you on WhatsApp when it shows.", "Kabsi saw it on Google. Done.", "See it on Google", "Skipped. Nothing was published.", "Bring it back", "Reply ready", "Post ready", "Hours ready", "Photo ready", "Approve reply", "Approve", "Send my answer", "Not now", "Your answer, in your own words", "Kabsi writes the post from your answer, then asks for your yes."
- Failures: reply "Google did not take the reply: Kabsi's access to your Google profile stopped working." with "Nothing was published. Check that Kabsi is still a Manager. Kabsi sends the reply as soon as access works."; post "Google did not take the post: it turned down one of the words." with "Nothing was published. Kabsi rewrites it and asks for your yes again."; hours "Google did not take the new hours." with "Nothing was changed. Kabsi tries again in an hour and tells you if it still does not work."; photo "Google did not take the photo: it is smaller than Google allows." with "Nothing was published. Send the photo again as a file on WhatsApp, or send a new one. Kabsi tries again as soon as it arrives."; buttons "Check Kabsi's access", "Send it on WhatsApp", "Try again".
- Sensitive review: "A 1-star review needs you", "Kabsi did not write a reply.", "This review talks about an injury and a lawyer. A reply here should come from you, in your own words. Nothing has been posted.", "Write my reply", "Talk to Rashid".
- Shell: "Google profile", "Posts and photos", "Where you show up", "Reports", "Get reviews", short "Profile", "Posts", "More", "Log out", "Ends [date]", sub tabs "Waiting", "All reviews", "Profile watch", "Hours", "Posts", "Photos", "Settings", "Team", "Plan".
- Home: "3 things need you. Each one is on WhatsApp too: answer wherever you are.", "Done lately", "Your next report", "Monday 2 November on WhatsApp: what Kabsi did, what waits for your yes, and one next step.", "See last week's report", "Setup is waiting for one step: add Kabsi as a Manager." with "Your trial has not started and nothing has been published." and "Continue setup"; page errors "This page did not load." with "Nothing you did, and nothing changed on Google. Try again in a minute."
- Reviews: filters "Waiting", "Live on Google", "All" (changed from "Published"); "No reviews waiting." with "When a review comes in, Kabsi drafts a reply and sends it to you on WhatsApp."; "Review Growth"; "New reviews this month", "Times the link was opened. An open is not a review.", labels "From your Google Business Profile" and "From your Kabsi review link"; buttons "Send your review link" (changed from "Ask a customer"), "Get your QR card".
- Google profile: H1 "Your Google profile" (changed from "Your listing") with "Kabsi checks your details every day and tells you when anything changes."; "Changes others made", "Google shows a new phone number for [Business].", "Someone suggested [number] on Google yesterday. Yours was [number]. Kabsi changed nothing.", "Put my number back", "The new number is right"; "Details" with "Booking link" Missing; "2 things to fix" ("Add your booking link", "Add 3 photos of your work" with their lines); "Google's warnings", "None. Google has not flagged anything on your profile."; empty "Kabsi is reading your profile." Hours: "Usual hours", "Change hours", "Holidays", "Nothing changes on Google until you say yes."
- Posts and photos: "On Pro, Kabsi writes a post every week. On Essentials, 2 a month."; "Anything new this month?" with "Any new services, prices, products or opening times? Kabsi turns your answer into posts and updates, and asks for your yes on each one." and "Answer on WhatsApp"; "Send photos on WhatsApp" with "Send a photo to Kabsi. It checks the size and light, gets it ready and asks for your yes before it goes on Google. On Essentials and Pro."; "Send a photo", "Approve photo", "Let your team send photos" with its line, "Team photo link"; empty lines.
- Where you show up: "Kabsi's own checks of public Google Maps and AI answers."; "An answer customers might see", "Asked on [date], monthly.", "The question, to ChatGPT", "The answer", "Named you", "Sources it named: ...", "One thing to check" with its line; "Juniper Hair Studio got 14 reviews this month. You got 6." with "Kabsi tells you only when something changes that matters."; "Your first check is running." with its line.
- Reports: "Every Monday on WhatsApp. The last 12 weeks are here."; "What Kabsi did", "Waiting for your yes", "One next step" (changed from "3 next steps"), "Open it", "Get the message", "See it", "See the places", "Earlier reports", "Monthly Results Report, [month] (PDF, Pro)"; "Your first report comes on Monday." with its line.
- Get reviews: H1 "Get reviews" with "A ready message you or your team send after a real visit. The same message to every customer."; the message "Thank you for visiting [Business] today. If you have a minute, tell others how your visit went: [link]"; "Forward on WhatsApp", "Copy message", "Kabsi never asks for your customers' numbers and never messages them. You choose who gets it, after a visit."; "Your QR code", "Print a counter card", "Print a table card", "This month", "Google's rules".
- Team and settings: "Only me", "Me and managers", "Staff can send photos. They cannot approve anything."; "Search Kabsi checks", "Your email", "Where your routine messages go" with "Reports and reminders go to one place. Kabsi does not send the same thing twice."; switches "New reviews", "Changes to your Google profile", "Results Report every Monday", "Tips during your trial"; Disconnect line with "Google profile" (changed from "listing").
- Plan: plan cards list the work first with Design 4's `PLANS.work` lines (plans.ts); banners "No card, and no charge unless you choose a plan. Photos from WhatsApp and replies are on both.", "Next payment on [date]. Founding price, kept while your subscription stays paid.", "Your last payment did not go through." with "Kabsi keeps working for 7 days while you fix it. Nothing has been deleted." and "Update my card", "Your plan ends on [date]." with "Kabsi stops publishing then. You keep your review link and QR code."; "Your trial", "Your plan", "Receipts", "No payments yet.", "Cancel any time: reply Cancel on WhatsApp, or cancel here."
- Onboarding: stage names "Your free check", "Sign in", "Connect WhatsApp", "Add Kabsi on Google"; "Your free check for [Business]" with "Here is your free check. Nothing has changed on Google, and Kabsi has no access yet.", "Set up Kabsi for [Business]", "Free for 14 days once Kabsi is connected. No card."; "Sign in to set up [Business]", "Continue with Google" with "This signs you in to Kabsi only. It does not give Kabsi access to your Google profile."; "Is this your business?", "Who looks after its Google profile?" with "I do. I am the owner or I can add people.", "Someone else does it for me.", "I am not sure.", "That is fine. Kabsi helps you find out." and its line, "Yes, this is my business"; "Connect WhatsApp" with "Send Kabsi one message. Kabsi answers with your free check, and asks before it sends anything else.", "The message is written for you: it says KABSI and your code, [code]. Just tap send.", "Waiting for your message", "This page updates by itself when it arrives.", "Check now", "Kabsi has not received your message yet." with its line, "WhatsApp is connected to [number]." with "Kabsi sent your free check there, and asked if it can send your setup steps and approvals.", "Next: add Kabsi on Google"; Manager: the track "Your invite on Google", "Accepted by Kabsi", "Access checked", the four steps, "Waiting for your invite.", "Kabsi accepted your invite. It is checking that it can read your profile. This takes about a minute.", "Access works.", "Your free trial starts today and ends on [date]." with "No card, and no charge unless you choose a plan.", "See your first task", "Get help from Rashid", "[Rashid], the founder, can help.", "Help on WhatsApp", "Book a short call", "Your trial starts only when access is checked."; "Your first task" with its lead, "What comes after this"; "The rest of setup" with "These open after your first task is done. One thing at a time.", "Next, when you are ready" and the six items with their lines, "Go to your account"; "Finish on another device", "Your setup link" with "It opens the next step you have not finished, on any phone or computer." ("Kabsi also sent it to your email." is left out until an email carries the setup link; Email 1 puts it back, docs/LATER.md.)
- Images: map image (Design 4's lines) with the Kabsi mark and Example; report image: "Results Report, [dates]", the three blocks, "From your Google Business Profile" with Calls, Direction requests, Website clicks, New reviews (calls and directions apart), "From Kabsi's Google Maps checks: [count]", brand line "Your business on Google. Taken care of." (changed from "Your reviews and listing."); PDF cover with the five section names. Print cards: "Tell others how your visit went", "Scan to leave a review on Google. It takes a minute.", "Or type [short link]", "Fold here"; pages "Counter card" with "Print it, cut it out, and stand it by the till.", "Table card" with "Print it on A4, fold it across the middle, and stand it on a table. Both sides read the same.", "Print", "Back to Get reviews".
- Emails (subject, then the body lines on /emails): welcome (changed: "One step left: add Kabsi as a Manager on your Google profile. Kabsi then prepares your first task, and you approve it on WhatsApp."), review (as COPY.md 22), report (changed: "One next step" and the source labels), setup incomplete "[Business]: one step left in your setup", access works "Kabsi can now look after [Business]", first work completed "Your first reply is on Google", one reminder "[Business]: a reply is ready for your yes" with "This is the only reminder Kabsi sends for this reply.", failed "[Business]: Kabsi's Google access stopped working", trial ending "Your Kabsi trial ends on [date]" (work done, both prices, "Choose my plan", "Or let it end..."), receipt "Receipt: Kabsi Pro, monthly", failed payment "Your payment for Kabsi did not go through", cancellation "Your Kabsi plan is cancelled". Footer: brand line, non-affiliation, Facebook, Instagram, "Unsubscribe from these emails" only on emails a person can switch off, "Kabsi is operated by Rashid Abou Hamzy. Contact: hello@kabsi.co."
- Checkout: description changed to "Your Google profile and reviews, looked after from WhatsApp. Cancel in WhatsApp any time."; "Pay with card", "A drawing of the payment form. Nothing here takes a card.", "Tax", "Worked out from your country", "Due today", "Pay $[n]"; success line changed to "Your plan starts the day Kabsi's access to your Google profile works." and "A receipt is on its way to [email]."

UX 1's own lines (for lane R to approve; everything else on the screens is from the list above or sections 17 to 20):
- Free check waiting list (the scan box's waitlist state, now built; words changed in UX 1 round 2, the stored consent words changed with them, rows already stored keep theirs): "The free check opens soon. Leave your email or WhatsApp number and Kabsi sends your result the day it opens.", "Save my place", "Saved. You are on the list.", the tips box "Send me tips on managing my Google profile" (the stored words of the profile check), and while WhatsApp is on "Send my result to this WhatsApp number the day the free check opens." Errors: "Type an email address or a WhatsApp number with its country code.", "Check the email. It needs a full address, like name@shop.com.", "Tick the box to get the message on WhatsApp."
- Founding 25 form: "Named or anonymous case study" with "Anonymous" (chosen unless the owner picks) and "Named"; the tick reads "I agree to a 2-minute check-in with Kabsi every two weeks, and to Kabsi writing a case study that does not name my business. I approve the final text before it is published." or, for Named, "...a case study that names my business. I approve the final text before it is published." (stored as the proof).
- Task states on the website use V4's words for what failed and what happens next (task-close.ts failedNext, the same as WhatsApp), not Design 3's example causes, because Kabsi words a failure from its state and kind only.

## 26. Email 1: every email on one design (27 Oct 2026)

The one-button rule (one yellow button per email) has one approved exception, lane R, 9 Nov 2026 (R-143 item 7): the Founding 25 day 60 email has no button, because it is a feedback ask and the answer is a reply to the email.

Master plan 30.18 section 3. The subjects of section 25 and the body lines of the design studio's /emails (Design 3) are used word for word; the lines below are the ones Email 1 wrote or changed, for lane R to approve. The code is supabase/functions/_shared/email/ (account-copy.ts holds the 30.15 section 6 set).

Lane R, 27 Oct 2026: every line below is approved, with one change: the work chips say "Replies sent to Google", "Posts sent to Google" and "Photos sent to Google" (were "... published"), because the count includes work Google may still be checking; "published" and "on Google" are said only after Kabsi sees it there (master plan 30.15 3.1). UX 1 round 2's lines (section 25 and the waiting list) are approved as built.
- Footer on every owner email (section 25): "Why you got this: [line]", "Your business on Google. Taken care of.", "Kabsi is independent and not affiliated with Google.", "Facebook", "Instagram", "Unsubscribe from these emails" only where a person can switch the email off, "Kabsi is operated by Rashid Abou Hamzy. Contact: hello@kabsi.co." The old footer lines ("Nothing is published until you approve it.", "Email settings", "Questions? Reply to this email or write to hello@kabsi.co.", the long trademark notice) are gone from the footer; "Nothing is published until you approve it." stays in the body of every email that asks for a yes (the review email's note).
- Review (section 22): title "A reply is ready."; the draft's label "Reply ready" (was "Drafted reply").
- Results Report: subject "[Business]: your Results Report for [dates]"; title "Your Results Report, [dates]"; "What Kabsi did" with the chips ("Replies sent to Google", "Posts sent to Google", "Photos sent to Google", "Hours updated", "Profile details updated", "Changes put back", "Replies prepared", each with its count); "A quiet week. Kabsi kept watching your Google profile."; "Waiting for your yes" with the items, "And [n] more in Kabsi." and "Nothing is waiting for your yes."; "One next step"; "From your Google Business Profile" with the cards "Calls", "Direction requests", "Website clicks", "New reviews" and "[n] more than last week", "[n] fewer than last week", "Same as last week", "Average [n] stars", "None this week"; "From Kabsi's record of your reviews" (the new-reviews card when Google's figures are not in); "From your Kabsi review link" with "Your review link was opened [n] times. An open is not a review."; "Competitor Watch"; the button "Review and approve" when something waits, otherwise "Open your report", and the link "Open your report"; preheader "Kabsi did [n] things this week. [n] waiting for your yes." or "A quiet week. Nothing waits for your yes."
- Welcome: title "Welcome to Kabsi." (with the owner's first name when Kabsi has it); the studio's line (its end "you approve it on WhatsApp" reads "you approve it by email or in Kabsi" while Kabsi's WhatsApp number is not set), then "Kabsi never asks for your Google password or a verification code."; the note "Google Business Profile is free from Google. Kabsi is an independent paid service."
- Setup incomplete (the 1 hour, 24 hour and 72 hour reminders): subjects "[Business]: one step left to start" (1 hour), "[Business]: one step left in your setup" (24 hours, section 25), "[Business]: still want Kabsi to look after your Google profile?" (72 hours); the 72 hour one adds "If something stopped you, for example your profile is not verified yet or someone else looks after it, reply and Kabsi finds the way with you. Changed your mind? Then you can ignore this email."; the button "Continue setup" opens kabsi.co/start/resume/CODE (kabsi.co/start without a code); the note says "The button opens the step you have not finished, on any phone or computer. Want help? Reply to this email and a person helps." (the studio's WhatsApp clause is left out: the note is plain text and cannot carry the link). Why line "You started setting up Kabsi and one step is left."
- Access works (it is also Kabsi's notice of the access change, K-113.1): "What changed: on [date] Kabsi accepted your invitation and became a Manager of [Business]'s Google profile, through the Kabsi Clients group. You stay the owner. Nothing has been published."; cards "Your free trial" ("Started [date], ends [date]. No card, and no charge unless you choose a plan.", shown when the trial dates are known) and "Your first task" ("Kabsi is preparing your first task. It comes to you for a yes."); the remove line and Google's third-party line kept; button "See your first task". When the business has no plan yet or is on early access, the caller's own next step shows instead under "What happens next", with the button "Open Kabsi".
- First work completed: "Kabsi saw your first reply for [Business] on Google. Done." Sent once Kabsi sees the reply on Google, not at the approval. Button "See your reply" (to Kabsi's Reviews, so every link stays on kabsi.co).
- The one reminder: "Your [reply, post or change] for [Business] is ready. Nothing has been published. Review it now, or later.", the card "Reply ready" / "Post ready" / "Hours ready", button "Review it", note "This is the only reminder Kabsi sends for this [reply]."
- Connection failed: title "Kabsi could not reach your Google profile."; "Kabsi can no longer reach the Google profile of [Business]. This usually means Kabsi was removed as a Manager. Nothing was published."; card "What happens next": "[n approved items wait / Anything you approve waits] until access works. Add Kabsi as a Manager again and Kabsi sends it within a few minutes."; the steps with the group ID; button "Check Kabsi's access"; note "Did you remove Kabsi on purpose? Then there is nothing to do." (the studio's "Kabsi stops trying after 7 days" is left out: no rule in the code says so)
- Trial ending: "Done for [Business] in your trial" with ticks from Kabsi's record ("[n] replies sent to Google", "[n] posts sent to Google" (Kabsi's record counts a reply Google may still be checking), "[n] changes to your Google profile caught", or "Kabsi watched your reviews and your Google profile every day"); "Your choice" with the studio's prices line plus "Prices are in US dollars, plus tax where it applies."; changed: "Or let it end. Nothing is charged, and from [date] Kabsi publishes nothing. For 7 more days it keeps watching your reviews and drafting replies, in case you choose a plan. You keep your review link and QR code." (the studio's "stops publishing on [date]" plus the 7-day grace of the facts); then "Card payments in US dollars are coming. Until they open there is nothing to pay." while payments are closed.
- Receipt, failed payment, cancellation: the studio's lines; the cancellation's "data from your Google profile is deleted after 7 days" reads "your data is kept for 30 days, then deleted" (billing.ts keeps it 30 days, as the plan-ended email says); failed payment says "Kabsi keeps working until [date]" when the grace end is known, and a reminder's subject is "Reminder: your payment for Kabsi did not go through"; cancellation without a known end says "the last day you paid for".
- Auth emails: "Kabsi never asks anyone for this code. Never share it." added to the sign-in and sign-up codes; "Confirm it is you" (was "Confirm it's you").
- Onboarding (section 25): "Kabsi also sent it to your email." is back under "Your setup link", shown only once a setup email with the link really went to that person.

## 27. Audit 1: lines changed by the page-by-page audit (27 Oct 2026)

Section 24, 25 and 26 still win. Audit 1 (P0.7-06) changed only these lines, to match them:

- "Published" is said only after Kabsi sees it on Google (30.15 3.1): the post state labels read "Prepared", "Waiting", "Sent to Google", "Skipped", "Did not go through", "Being removed", "Removed from Google"; the Home backlog line reads "[n] of [m] sent to Google" and "All [m] sent to Google"; the Results Report's Content block reads "[n] updates and [m] photos sent to Google."; the notification category "Results Report every Monday" reads "What Kabsi watched, prepared and sent to Google, once a week."
- "Listing" is never said to an owner (30.15): the hero line reads "every change to your Google profile caught"; the FAQ answers, the trial line ("Your trial starts when Kabsi's access to your Google profile works.") and Nora's lines ("Kabsi looks after your business on Google from WhatsApp", "your Google profile kept right", "The free trial starts once Kabsi can reach your Google profile.", "Kabsi will post this on your Google profile after your yes.") say "Google profile". The Creem product description (section 23) still reads "Your Google listing and reviews, managed from WhatsApp." because it is registered at Creem; a LATER row changes it with the product.
- "Free scan" is "free check" everywhere an owner or a partner reads it (Partners: "Share your page or check a business for them", "Free checks to send to businesses you know"; Nora's help line "your business name for a free check").
- Log in: the link under the sheet is "New here? Check my business free" (was "See your map", retired in section 24).
- Home, "A person helps": "Stuck on a step? Write to hello@kabsi.co, and a person answers." while Kabsi's WhatsApp number is empty (K-122); with the number set it reads "Stuck on a step? Reply Help on WhatsApp, or write to hello@kabsi.co, and a person answers."
- No Arabic anywhere public (R-61): the reply guide shows English, Spanish and French examples and says so ("short examples in English, Spanish and French"); the FAQ answer on languages reads "English, Spanish, French and many others." and the chat-spelling answer no longer names a language.
- Signed in, when the business cannot be loaded at all: the business switcher reads "Your business" and the page shows the error state of section 15: "Something went wrong on our side." "Nothing you did. Try again in a minute." Button "Try again".

## 28. Eval 1: the report dates, the star rating and the risk line (27 Oct 2026)

Sections 24 to 27 still win. Eval 1 changed only these lines, for lane R to approve:

- Results Report dates, in the subject ("[Business]: your Results Report for 19 to 25 October"), the title ("Your Results Report, 19 to 25 October"), the line under it and the preheader: "19 to 25 October" within a month, "28 October to 3 November" across months (was "19 October to 25 October" in the email and "Oct 19 to Oct 26" from the live report). The report covers Monday to Sunday before the Monday it is sent.
- The preheader starts with the dates: "19 to 25 October: Kabsi did [n] things. [n] waiting for your yes." and "19 to 25 October: a quiet week. Nothing waits for your yes." (the rest as section 26).
- The WhatsApp report line starts with the dates: "[Business], 19 to 25 October. Kabsi did: replies sent to Google 3, ..." and "[Business], 19 to 25 October: a quiet week. Kabsi kept watching your Google profile." (was "[Business], this week Kabsi did: ...").
- The review email: the rating is five star characters, filled ★ and empty ☆ ("★★★★☆"), read out as "4 of 5 stars"; "Rating 5 of 5" is gone. The plain text reads "[Reviewer]: 4 of 5 stars".
- New risk line for a complaint that names someone on the team (high, no draft): "They name someone on your team in a complaint." The medium line "They complain about someone on your team. The reply names no one." stays for a complaint that names no one.
- Nora (website rules, no number set): "Kabsi has a WhatsApp number, but it is not given out yet, so never give a number." (was "Kabsi has no WhatsApp number at the moment, so never give one.").
## 29. Sec 2: lines added by the security session (27 Oct 2026, for lane R's next copy review)

- Email action page (/a/TOKEN), when the reply changed after the page was opened: "This reply changed since you opened this page. Here is the new one. Read it, then approve." The page then shows the newest draft. A second approval while one is already on its way reuses the approved line "It is already on its way to Google."
- Card activation, after 10 refused codes in an hour: the approved line "Too many tries. Wait a few minutes and try again."
- Staff page, Operations panel (staff only, not owner copy): H2 "Operations"; lead "What needs a person now. Each row says what to do."; groups "Approved, not sent after 15 minutes", "Google access stopped", "Failed publications, last 7 days", "Jobs failing or waiting too long", "Webhooks refused, last 24 hours"; empty lines "Nothing is stuck.", "Every business's access works.", "No failed publications.", "Every job is running on time.", "No webhook was refused."; error "The operations view did not load. Try Refresh."; the what-to-do lines are written in `public.staff_operations()` (migration `sec2_retention_operations`).

## 30. WhatsApp 2: every template wording (28 Oct 2026)

The words Meta approves and Kabsi sends outside the 24-hour window. All are submitted as Utility. A name ending in _v2 (billing: _v3) replaces the name without it once Meta shows it Approved and filed under Utility; until then the first name is the fallback (supabase/functions/_shared/whatsapp/templates.ts, which is the source of these lines). Each opens with "Kabsi here.", names the owner's own setup, account or Google profile as the reason, and has no offer, no promotion and no "free". The button on every one reads "Show me". The full message with its buttons follows inside the window once the owner replies.

- `kabsi_review_waiting`: "Kabsi here. A new {{stars}}-star review for {{business}} is waiting for your reply. Reply here to see the draft."
- `kabsi_post_ready`: "Kabsi here. A post for {{business}} is ready for your approval. Reply here to see it."
- `kabsi_listing_change`: "Kabsi here. The {{field}} of {{business}} changed on Google. Reply here to see the change and choose what to do."
- `kabsi_listing_change_v2`: "Kabsi here. You asked Kabsi to watch the Business Profile of {{business}}, and its {{field}} changed on Google. Reply here to see the change and choose what to do."
- `kabsi_google_action`: "Kabsi here. Google is asking for action on the Business Profile of {{business}}. Reply here for the steps."
- `kabsi_google_action_v2`: "Kabsi here. Google is asking for action on the Business Profile of {{business}}, which you connected to Kabsi. Reply here for the steps."
- `kabsi_updates_waiting`: "Kabsi here. You have {{count}} updates waiting for {{business}}. Reply here to see them."
- `kabsi_updates_waiting_v2`: "Kabsi here. Kabsi has prepared {{count}} items for {{business}}, and each one needs your approval before anything changes on Google. Reply here to review them."
- `kabsi_holiday_question`: "Kabsi here. {{holiday}} is on {{date}}. Reply here to tell Kabsi the hours of {{business}} for that day."
- `kabsi_holiday_question_v2`: "Kabsi here. {{holiday}} is on {{date}}, and Kabsi needs the opening hours of {{business}} for that day to keep its Business Profile right. Reply here with the hours."
- `kabsi_access_lost`: "Kabsi here. Kabsi can no longer reach the Business Profile of {{business}}. Reply here for the steps to fix it."
- `kabsi_access_lost_v2`: "Kabsi here. The access you gave Kabsi to the Business Profile of {{business}} has been lost, so Kabsi cannot work on it. Reply here for the steps to fix it."
- `kabsi_map_ready`: "Kabsi here. The Visibility Map of {{business}} is ready. Reply here to see it."
- `kabsi_map_ready_v2`: "Kabsi here. The Visibility Map of {{business}} from your Kabsi account is ready. Reply here to see it."
- `kabsi_access_change`: "Kabsi here. Access to the Business Profile of {{business}} has changed. Reply here to see what changed."
- `kabsi_access_change_v2`: "Kabsi here. Access for Kabsi to the Business Profile of {{business}} has changed. Reply here to see what changed."
- `kabsi_billing_notice`: "Kabsi here. There is an update about the Kabsi plan of {{business}}. Reply here to read it."
- `kabsi_billing_notice_v3`: "Kabsi here. Your Kabsi account for {{business}} has a billing update: a payment, receipt, trial date or plan change. Reply here to read the details." (`kabsi_billing_notice_v2` was submitted first and Meta filed it under Marketing, so it is not used.)
- `kabsi_photo_ready`: "Kabsi here. A photo for {{business}} is ready for your approval, and nothing goes on Google until you say yes. Reply here to see it."
- `kabsi_business_update`: "Kabsi here. Once a month Kabsi asks what is new at {{business}}, so its Business Profile stays right: any new services, prices or opening times? Reply here to answer."
- `kabsi_business_update_v2`: "Kabsi here. This is the monthly check on {{business}} that you set up with Kabsi: has anything changed, like opening times, services or contact details? Reply here to answer." (the first name was filed under Marketing by Meta)
- `kabsi_setup_step`: "Kabsi here. You started setting up Kabsi for {{business}}, and the next step is ready. Reply here to see it."
- `kabsi_work_update` (retired in code on 9 Nov 2026, R-142 item 6: it said "it is on Google", and v2 is approved and sent; the name stays on Meta's side, unused): "Kabsi here. There is news about a change you approved for {{business}}: it is on Google, still on its way, or needs another try. Reply here to read it."
- `kabsi_work_update_v2` (the only work update template the code sends): "Kabsi here. The status of a change you approved for {{business}} has been updated: it is live on Google, in progress, or did not go through. Reply here to read the details." (the first name was filed under Marketing by Meta)
- `kabsi_staff_alert`: "Kabsi staff alert: {{summary}}. Reply here for the details."
- `kabsi_staff_alert_v3`: "Kabsi here. This is a service alert for your Kabsi staff account: {{summary}}. Reply here for the details." (`kabsi_staff_alert_v2` was filed under Marketing by Meta, so it is not used.)

Reasons for the changes: Meta put nine of the first eleven in Marketing, which it does not deliver to US numbers. kabsi_review_waiting and kabsi_post_ready were already Utility and are unchanged. kabsi_map_ready_v2 is Utility because the map is a result of the owner's own Kabsi account, named as such; if Meta files it under Marketing it is reported, not forced.

## 31. Scope 1: list error states, the honest limits line, the refused photo (30 Oct 2026, for lane R's next copy review)

Sections 24 to 30 still win. Scope 1 added only these lines.

- A signed-in list that fails to load shows the error state of DESIGN.md section 15 with the button "Try again" and the second line "Nothing you did, and nothing changed on Google. Try again in a minute." The titles: "This page did not load." (Posts, Reviews, Photos, Reports, Google profile, Review cards, Hours; already approved, section 27), "Where your posts are on Google did not load." (Posts, when the states of the posts do not load), "Your holidays did not load." (Hours), "Your team did not load." (Team, replaces "We couldn't load your team. Refresh the page."), "Your AI questions did not load." and "Your searches did not load." (Settings), "The checklist did not load." with "Please try again in a moment." (Profile Coach, unchanged).
- The honest limits line, said by Nora on the website and on WhatsApp for any question about another platform, and in the FAQ: "Today, Kabsi works only with your Google Business Profile. It does not connect to booking systems, Tripadvisor, Booking.com, Airbnb, Facebook reviews, a till or a CRM, and it does not message your customers." Nora starts with "not available today" (never "never"), gives no future date and offers the free check at kabsi.co/scan.
- Privacy page, retention list: "WhatsApp messages with the Kabsi number: Kabsi deletes its own record of each one 12 months after it was sent. The text Kabsi queues to send to you is cleared a day after it is sent, and its queue record is deleted after 30 days. The chat stays in the Kapso inbox until you ask us to delete it (section 14)." and "Applications to Founding 25 and Kabsi Partners: if we decline an application, we delete it 90 days after we decided. If we put a Founding 25 application on the waiting list, we delete it 180 days after we decided. An accepted place is kept while you are in the program. A declined partner application that has a referral, commission or payout record is kept only as long as that record needs it, and as tax and accounting law requires." Section 3 adds "If you apply for a Founding 25 place:" with the fields.
- The note for a refused photo outside the 24-hour window has no template: it is held and goes out as written ("[Business]: Kabsi could not use that photo. [Reason]. Please send another one.") when the owner next writes.

## 32. Scope 1 part 2: the staff validation and evidence screens (30 Oct 2026, staff only, for lane R's next copy review)

Sections 24 to 31 still win. These are on /staff, which only the Kabsi team sees.

- Panel titles and jump links: "Validation figures" (link "Validation") and "Evidence log". A figure that cannot be reconciled reads "No data". Cohorts: "Founding 25 (free)" with "Proves use, not willingness to pay." and "Paying (trial, then a plan)" with "Tested from launch day."
- Validation lead: "A is hours from sign-up, B and C hours from Google access. A free check finished before sign-up is counted apart and never ends A. Money comes from the Creem events Kabsi stored; what cannot be reconciled reads No data."
- Money lead: "MRR is each active paid subscription at its price per month (yearly divided by 12), not cash. Cash is shown apart. Margin is before tax and Creem's fees, which the events do not carry."
- Evidence log lead: "One row for each thing an owner asks for that Kabsi does not do, a repeated problem, time saved, a missed enquiry or sale, or support given. Write the owner's own words when there are some. Kept 24 months." Types: "Asked for something Kabsi does not do", "Repeated problem", "Time saved", "Missed enquiry or sale", "Support given". Sources: Call, WhatsApp, Email, Nora, Meeting, Other. Buttons: "Add the row", "Export CSV", "Delete". Empty: "Nothing written yet." Errors: "The evidence log did not load." and "The figures did not load." each with "Try again".
- The slow start staff alert, through the approved template kabsi_staff_alert_v3 (its text is unchanged): "[Business] has had Google access for 48 hours and no first result yet. Kabsi is waiting on [the owner's yes on a reply]." Sent once for a business, only to the staff phones.
- Privacy page: "Notes our team keeps about what owners ask for, repeated problems, time saved, missed enquiries and the help we gave, with your own words when you say them to us or to Nora when she passes you to a person: deleted 24 months after the note is written. Only the Kabsi team can read them." and, in section 3, "If you ask Nora for a person, or tell us what you need:" with "our team may write a short note of it (the business, the date, where it came from, and your own words) to learn what owners need. The note is not shared outside Kabsi."

## 33. Price 1 part A: the live site says only what is true (30 Oct 2026, Design 6 audit section 4, lane R review)

Each line replaces the one in brackets. Lines marked "switch" read the one WhatsApp setting (`WHATSAPP_ON`): the first wording while Kabsi's WhatsApp number is not set, the second once it is.
- The launch line (switch, new constant `WHATSAPP_LAUNCH_LINE`): "WhatsApp opens at launch. Until then you approve on kabsi.co." It follows Home's lead "Kabsi prepares your review replies, posts and updates to your business details. You approve each one on WhatsApp before it goes live." while the number is not set; Home's meta description drops "on WhatsApp".
- Home, details kept right (switch): "If anyone changes your Google profile, you hear about it by email, and on WhatsApp once it opens." / "...by email and on WhatsApp." (was "you hear about it on WhatsApp.")
- Home closing band and the free check page: "The full check from 49 places around you opens at launch." (was "arrives on WhatsApp within minutes")
- How it works, day 1: "At launch: where you come up nearby, from 49 places." (was "Your first full map arrives on WhatsApp.")
- How it works H2: "Set up in a few steps, no passwords" (was "Set up in 10 minutes, no passwords")
- Access steps, Pending: "It shows as Pending until a person at Kabsi accepts it, within one working day." /manager-steps after Invite: "Invite sent. A person at Kabsi accepts it within one working day." (was "usually within minutes")
- FAQ 4: "Can Kabsi promise where I come up on Google Maps?"; FAQ 8: "Yes, any time. Your plan runs to the end of the period you paid for."; the terms summary: "You can cancel any time. Your plan runs to the end of the period you paid for."
- Partners: "Kabsi Partners opens at launch." after the lead and under "Earn 25% of every payment." in the apply band; the lead's "Everything runs on WhatsApp." shows only once the number is set (switch).
- Security: "Kabsi's database is in Frankfurt. The privacy policy lists every provider. Data is encrypted in transit." (was "Your data is stored in the EU, in Frankfurt")
- Hair salons: "keeps your hours and details right" (was "keeps your services and booking link right"); "A common complaint in a busy salon." (was "The most common complaint")
- Founding 25 form: "Two minutes. Rashid answers within 2 working days." (was "Rashid answers on WhatsApp."); banner and lead: "Kabsi does the Google work; you tell Rashid what to make better."
- 404: "The link may be old. Nothing on your Google profile changed."

## 34. Price 1 part B: prices, the founding price and the help lines (30 Oct 2026, master plan 30.20 section 6 and 30.21 section 2, Rashid's "yes 29/59")

- List prices: Essentials $29 a month or $290 a year; Pro $59 a month or $590 a year; an extra location $15 a month or $150 a year. These replace the prices in sections 3 and 19.
- On each plan card while founding places remain (never a crossed-out price): "Founding price for the first 30 paying businesses: 19 US dollars a month, kept while you stay subscribed. Then 29." Pro: "...: 39 US dollars a month, ... Then 59." Yearly: "190 US dollars a year ... Then 290." and "390 ... Then 590."
- The count: "Founding price for the first 30 paying businesses, kept while you stay subscribed. [n] of 30 founding places left." (Pricing); "[n] of 30 founding places left." (Home's preview). Hidden at 0 and while the count loads.
- One sentence (Plan page, terms, FAQ, emails, facts): "The first 30 paying businesses pay the founding price and keep it while they stay subscribed: Essentials $19 a month or $190 a year, Pro $39 a month or $390 a year."
- Under the plan cards: "Nothing to pay today. Card payments in US dollars are coming." / "Prices are in US dollars, plus tax where it applies." / "Monthly plans can be cancelled at any time. Yearly plans are refundable within 14 days."
- Pricing and Home lead: "Each plan does the Google work for one business, and you approve every change. Prices in US dollars, plus tax where it applies." (Design 6; was "runs from WhatsApp").
- Essentials card: "A reply ready for every new review" / "Holiday hours, 2 posts a month and your photos" / "Profile Coach suggestions, and a next step in every weekly report". Pro card ("For a business that wants weekly posts and a team that approves.", badge "Weekly posts"): "Everything in Essentials, with a post every week" / "Review graphics to share, and the words people searched to find you" / "The guide to report a review that breaks Google's rules" / "Team roles and approval rules".
- Comparison rows (built only): replies, posts and photos, Google Protection, Review Growth, Profile Coach suggestions, Results Report with a next step, review graphics, "The words people searched to find you", "The guide to report a review that breaks Google's rules", team roles, "A person on WhatsApp": "The same working day" / "Within 4 working hours, and a call". Under the table: "More checks come later." Removed: the nearby check, the AI answers, Competitor Watch, the category check, voice notes, the monthly PDF.
- Help lines (plan cards, Plan page, terms section 14), exactly as 30.21: Essentials "A person answers on WhatsApp the same working day." Pro "Priority help: a person answers on WhatsApp within 4 working hours, and a call when you need one." Beside them: "Working hours: Monday to Friday, 9:00 to 18:00, UAE time." Approved as they are, lane R, 9 Nov 2026 (R-143 item 7): a business on its free trial, which has the whole of Pro, is told "within 4 working hours" (it reads Pro because its plan features are Pro).
- Plan page: the button "Choose Pro, $39 a month, founding price" while places remain (else "Choose Pro, $59 a month"); a founding plan shows its price and "Founding price, kept while you stay subscribed."
- Terms section 8: the founding sentence, Founding 25 at the founding price, and "Cancelling on the Plan page or by asking Kabsi ends your plan at the end of the period you paid for, and everything keeps working until then. Cancelling in Creem's own billing page ends the plan at once."
- Trial-ending email: "Pro is $59 a month: a post every week, team roles, review graphics and the words people searched to find you. Essentials is $29 a month: every reply and 2 posts a month." then the founding sentence.
- Creem product names (section 23 changes): list "Kabsi Essentials, monthly" / "yearly", "Kabsi Pro, monthly" / "yearly"; founding "Kabsi Essentials, monthly, founding price" and the same for the other three; "Extra location". Description: "Your Google profile and reviews, managed from WhatsApp."
- Review fixes (Price 1 part B2): the /faq answer "What does Kabsi cost?" is the prices sentence and the founding sentence, then "Both plans are free for 14 days, with no card."; /partners "Pro is $59 a month. You earn 25% of every payment..."; the WhatsApp "prices" reply "Then Essentials is 29 US dollars a month and Pro is 59 US dollars a month, with an extra location at 15. The first 30 paying businesses pay 19 or 39 and keep that price while they stay subscribed."; the Plan page under the plan buttons "Creem's page shows the exact price before you pay."; the pricing share image "$29" and "$59" with "You approve every change."

## 35. Web 3: Design 6 on kabsi.co, and the 16 rule-book fixes (30 Oct 2026, lane R's approval of Design 6 and round 2)

Every NEW line of "Design 6" and "Design 6 round 2" in kabsi-design-studio docs/DESIGN-PROPOSAL.md is approved and is now on kabsi.co word for word (Home in `src/components/kabsi/d6-home.tsx` and `d6-demo.tsx`; the plan lines in `src/components/kabsi/plans.ts`; the free check preview in `d4-free-check.tsx`; the Manager step's "What Manager access means" in `src/components/onboarding/stages.tsx`; the signed-in Home's sections in `src/components/home/action-center.tsx`). Lines that Design 6 hides on phones stay hidden there.

The 16 conflicts of the Design 6 audit (section 5), as lane R decided them. Where an older section of this file says otherwise, this section wins.
1. kabsi-copy skill, approved lines: the H1 and subline about AI answers, ChatGPT and Gemini are replaced by 30.20's H1 ("Your business on Google. Taken care of.") and supporting line. Done in the skill.
2. The tagline "Your reviews and listing. Taken care of." is retired everywhere: the brand line is "Your business on Google. Taken care of." Done in the skill.
3. The main button is "Check my business free"; the line under it, apart from the free check, is "Free for 14 days once Kabsi is connected. No card." Never "See your map", "Try it on WhatsApp" or "Cancel in WhatsApp". Done in the skill.
4. The pillars "More reviews, the right way" and "Your listing kept right" and "local visibility and reviews manager" are dropped; the four jobs of Design 6 replace them ("Reply to every review", "Keep your details right", "Post when something changes", "See the work, every Monday"). Done in the skill and on Home.
5. DESIGN.md: light-led per 30.20 section 3; yellow only for the main action; the headline phrase uses the `--phrase` role (ink on ivory, yellow on dark). Done in DESIGN.md and src/styles.css.
6. One word for the state Kabsi has seen on Google: "Live on Google" (was "On Google"), in the task states, the track, the review filter, the WhatsApp closing line ("Your reply is live on Google."), the first-reply email ("Your first reply is live on Google") and section 25 above. The approved Meta Utility templates are not resubmitted (docs/LATER.md lists the one whose wording differs).
7. Founding 25 banner: "Kabsi does the Google work; you tell Rashid what to make better." (never "We do the Google work; you tell us"). Done on every page.
8. Section 1 (Home) is replaced by Design 6's Home lines; its note says so.
9. Section 3 (Pricing): list 29 and 59, founding 19 and 39 (Price 1, section 34), and the Design 6 plan lines (section 3's note).
10. FAQ 8 "Can I cancel?": "Yes, any time. Your plan runs to the end of the period you paid for." (src/components/kabsi/faq-data.ts).
11. FAQ 4: "Can Kabsi promise where I come up on Google Maps?" (never "top of Google Maps").
12. Section 2 (scan result): "Free Visibility Scan", "rank" and "Get this on WhatsApp" are replaced by the Design 4 free check lines and, before a search, Design 6's preview: "See your public Google profile and what to do first. Kabsi asks for nothing before you see the result.", "Opens at launch" on the nearby card, and the Example result ("What to do first", "Add your booking link.", "A booking link lets customers book straight from your Google profile.", "Shown live from Google. Kabsi does not store it.").
13. No handwritten note on any page (a third font breaks the type budget). If one is ever wanted, one drawn SVG, with lane R's yes.
14. AI-generated people: 30.21 section 2 wins over 30.20 section 3. Illustrative scenes only, never presented as a customer (no name, quote, rating or "trusted by" row), no Arabic in frame.
15. Working hours for the help lines: "Working hours: Monday to Friday, 9:00 to 18:00, UAE time." wherever a help line appears, unless Rashid sends others.
16. "Visibility Map" and "AI Visibility" are names inside the account only; public pages say "Where you come up nearby". Done in the skill.

Other lines of this pass: header links "How it works", "Pricing", "Businesses", "Founding 25", "About", "Log in"; footer column "Free tools" ("Free check", "Google profile check", "Review link and QR code"); signed-in Home "Home", "Needs your yes", "Needs attention", "Done by Kabsi", "Your business on Google", "See your Google profile"; its lead "[n] things need you." with "Each one is on WhatsApp too: answer wherever you are." only once WhatsApp is on.

## 36. App 2: the signed-in app, simplified (1 Nov 2026, lane R's decision of 1 Nov, master plan 30.22 item 5)

Where an older section of this file says otherwise, this section wins for the signed-in website.

- Shell: five places, the same on a computer and in the phone's bottom bar: "Home", "Reviews", "Posts and photos" (short "Posts"), "Google profile" (short "Profile"), "Settings". "More" is retired. Tabs: Reviews "Waiting", "On Google", "Get reviews"; Posts and photos "Posts", "Photos"; Google profile "Profile watch", "Hours", "Profile Coach", "Where you show up"; Settings "General", "Business knowledge", "Team", "Plan", "Reports". The phone's account menu: "Your account and help" (its label for screen readers), "Need a hand?", "Ask Nora" (opens Nora; there is no floating Nora button on signed-in screens), "WhatsApp", "hello@kabsi.co", "Guides", "Log out".
- Reviews: the filter chips are replaced by the tabs; "See all reviews" opens the full list, under the On Google tab. Empty On Google: "Nothing on Google yet." with "Replies show here once Kabsi sees them on Google."; a search with no result: "No reviews match your search."
- Home, in this order: "Needs attention" (each line one problem and one button: "Kabsi can't reach your Google profile any more." with "See how to fix it"; "Setup is waiting for one step: add Kabsi as a Manager." with "Continue setup"; a plan to choose with "See your plan"; a task's own title with its button), "Needs your yes" with "Nothing goes on Google until you approve it." once under the title, each item: its one line (a reply: "New review, 5 stars, from Maya"; otherwise the task's title), the draft clipped to two lines, "Approve", "Edit", "Details" (inside: the review, what Kabsi noticed, the draft in full, "History", "Nothing yet."); then "Done by Kabsi this week" with "See all"; then "Your business on Google" with "New reviews this month" and "Review link opens this month". Empty Home: "Nothing needs you right now." with "Kabsi checks your Google profile every day and tells you on WhatsApp when something needs your yes. Your next report comes on [Monday 2 November]." ("by email" while WhatsApp is off). Setup: "Your trial starts only when access is checked. Nothing has been published." Retired from Home: the bell and "Notifications", the lead "[n] things need you.", the connection strip, "Waiting for your yes" and "Needs you" chips on Home, "Kabsi suggests:", "Reply ready" and "Post ready" on Home, "Later", "Your next report" panel, the trial banner.
- Settings and onboarding: "Until then everything comes by email." (was "...by email and in the bell on Home."); the switch "Show in the bell on Home" is retired.
- Every other screen (App 2 part 3): inside a place with tabs the H1 is the place ("Reviews", "Posts and photos", "Google profile", "Settings") and the tab names the page; staff keep "Photos" and "Get reviews". Reviews: "Nothing goes on Google until you approve it." once under the title on Waiting (was on every card as "Nothing is published until you approve it."); the "Waiting for your yes" chip on each waiting card and the "Review Growth" panel are retired (the numbers are on Get reviews and Home). Posts: the per-post "Nothing is published until you approve it." is retired. Profile watch: the line under the title is the Google Protection line ("Google Protection: On. ...") when Kabsi is connected. Profile Coach lead: "What a complete Google profile has, and what yours is missing." Get reviews lead: "A ready message to send after a real visit." Settings, General: "Your voice" moved out (tone is set in Business knowledge). Task lists everywhere: the state pill and track stay; "Kabsi saw it on Google. Done." and "Your yes is saved. Kabsi has not seen it on Google yet..." are no longer repeated under every item ("See it on Google" stays; what failed and what happens next stays; the long sent line still shows once, right after an approval).


## 37. AI Answers 1: an AI answer that gets a fact wrong (1 Nov 2026, lane R's decision of 1 Nov, master plan 30.22 item 4)

Kabsi reads only what an assistant said and what the owner told Kabsi. It never says Kabsi can change what an assistant says and never promises a correction. A missing fact and anything unsure are never shown.

- Home, Needs attention, one line per fact: "[ChatGPT or Perplexity]'s answer gives a different [closing time, opening time, opening days, opening hours, phone number, address, website, services, price level] for your business", with the button "Check your hours" (hours, opens Hours), "Check your Google profile" (phone, address, website, opens Profile watch) or "Check your business details" (services, price level, opens Business knowledge). Its detail: "[ChatGPT] was asked "[question]" on [2 November]. It said: "[the assistant's exact sentence]" Kabsi has: [the owner's fact, for example Monday 09:00 to 18:00]." then "Make sure your Google profile and website say this. AI assistants read them." then the label "Answers we get from ChatGPT and Perplexity directly, which can differ from what their apps show."
- Results Report (email, page and WhatsApp), every week it happens: heading "An AI answer to check", then the same detail, the same "Make sure..." line and the same label.
- The free check, under "An answer customers might see", only when the answer names the business and a fact clearly differs: "ChatGPT's answer gives your [closing time] as [18:00]. Your Google profile says otherwise." (a day when it says one: "...your closing time on Monday as 8 pm..."; days: "ChatGPT's answer says you are closed on Sunday. Your Google profile says otherwise." or "...says you are open on Sunday..."), then ChatGPT's sentence in quotes. Otherwise nothing is added. The value shown is ChatGPT's own, never one read from Google.


## 38. Web 4: Design 7 and Design 8 on kabsi.co (1 Nov 2026, lane R's approval of Design 7 and Design 8)

Where an older section of this file says otherwise, this section wins for the public website. Every line below was approved by lane R on 1 Nov 2026 (DESIGN-PROPOSAL "Design 7" and "Design 8" in kabsi-design-studio), checked against knowledge/kabsi-facts.md.

**Shell (part 1):**
- Founding 25 line above the header: "Founding 25: three months of Kabsi Pro, free. [n] places left. Apply" ("1 place left." for one). The number is the real count (GET programs/founding); while it is unknown nothing shows in its place, and once no place is left the line goes. Close button (screen readers): "Hide the Founding 25 line". Not shown on /founding.
- Header: "How it works", "Pricing", "Businesses" (a menu: "Hair salons", "Barbershops", "Nail salons", "Restaurants", then "Every kind of business"), "Log in", "Check my business free". Founding 25 and About leave the header. Phone menu: the same rows, Businesses opens in place, then "Ask Nora" (opens Nora, so she is one tap away on a phone even while the phone bar waits) and "Log in"; "Open menu", "Close menu".
- Phone bar: "Check my business free", and Nora's button "Ask Nora, Kabsi's assistant" (the WhatsApp button joins once WhatsApp is on).
- Footer groups. Kabsi: How it works, Pricing, Free check, Review link and QR code, Security, FAQ. Businesses: Every kind of business, Hair salons, Barbershops, Nail salons, Restaurants. Company: About, Founding 25, Partners, Guides. Quiet row: Privacy, Terms, Partner terms, Your privacy choices, Facebook, Instagram (SOCIAL_LINKS), then the independence line with "Google's guidance on working with a third party", and "Kabsi is operated by Rashid Abou Hamzy. Contact: hello@kabsi.co. Card payments will be processed by Creem, our merchant of record. © 2026 Kabsi". Retired from the footer: the "Free tools", "Learn" and "Follow" titles, "Google profile check" (the page stays and is linked from the free check), "Dental clinics" (in Every kind of business).

**Home (part 2):**
- H1 "Your business on Google. Taken care of." Line: "Kabsi checks your Google profile every day, prepares the replies, posts and fixes it needs, and asks for your yes on WhatsApp." (Design 7 line 1), then "WhatsApp opens at launch. Until then you approve on kabsi.co." while WhatsApp is off. The free check box, "See how it works".
- The hero phone (Example, Hollis Hair, Bristol): "Hours" with "Google shows you closed on bank holiday Monday. You told me 10:00 to 16:00." and "Use my hours", "Keep Google's"; "Review" with "New 5-star review from Chloe B. Reply ready:" and 'Thank you, Chloe. We will tell Amber. See you in six weeks.'; "Post" with "Post ready with your photo:" and 'Late appointments every Thursday until 8 pm this month.'; "Monday receipt" with "Last week: 6 replies live on Google, 1 post, details checked every day. One next step: add 3 photos of the team at work."
- "What your free check shows": "The one thing to fix first" / "In plain words, with why it matters to your business."; "What customers see today" / "Your hours, phone, website, photos and reviews, read live from Google."; "What Kabsi would do from day one" / "The work, listed. Nothing happens unless you start."; on phones "The one thing to fix first, what customers see today, and what Kabsi would do from day one."; the card "Free check result", "Hollis Hair", "14 Gloucester Road, Bristol", "Most important", "No website is shown on Google." / "Kabsi asks you to confirm the address and prepares the change for you to approve.", rows "Opening hours" Shown, "Phone" Shown, "Photos" 23, "An answer customers might see" (At launch) "ChatGPT's answer gives your closing time on Saturday as 17:00. Your Google profile says otherwise."
- "The work your Google profile needs, every week." / "What a business should do on Google, done for you and brought to you for a yes." and the seven jobs (d8-data.ts JOBS), two with "At launch".
- "Kabsi prepares." / "Each reply, post and fix comes to you ready, word for word."; "You approve." / "Read the exact words, then say Yes, Edit or Skip."; "Kabsi follows through." / "It sends your yes to Google, checks it is live, and tells you if anything did not go through."
- "You stay in control." with "See how to remove Kabsi on Security" and the five lines (d8-data.ts CONTROL).
- "Pick your business", "Every kind of business", four photo cards: Hair salons, Barbershops, Nail salons, Restaurants.
- "Two plans. The work comes first.", the trial line, "Compare the plans", each plan's price and line, "Founding price $[19 or 39] for the first 30 paying businesses." only while founding places remain, "Prices in US dollars, plus tax where it applies. Nothing to pay today."
- Founder band: "[n] of 25 places left." (real count; nothing while unknown; "All 25 places are taken." at 0), "Founding 25: three months of Kabsi Pro, free.", "Rashid Abou Hamzy, founder of Kabsi, reads every application himself. Kabsi does the Google work; you tell Rashid what to make better.", "By application. No card. After 90 days, choose a plan or stop, nothing is charged by itself.", "Apply for a place".
- "Questions owners ask": FAQ 11, 1, 4 and 8 ("Can I cancel?"), word for word from section 16.
- "Start with a free check." with the box, the free check line and the trial line.
- How it works gets the demonstration from Home: "What happens after your yes." / "Tap Yes, Edit or Skip on the phone. Each state shows as it happens: Approved, Sent to Google, Live on Google, or Did not go through." (the rest of How it works is part 4).

**Lines changed to the facts (lane R decision 1), Home:**
1. Job "Your details, watched every day": Design 7 "If Google shows something different, you hear first and choose." became "If Google shows something different, Kabsi tells you and you choose." (facts: Kabsi tells the owner after Google shows a change; nothing promises "first").
2. "What customers see today": Design 8 "Your hours, replies, posts, photos and links, read live from Google." became "Your hours, phone, website, photos and reviews, read live from Google." (the free check reads Google's public data, which has no review replies or posts; K-82, profile-snapshot.ts).
3. The Example result card: Design 8 led with "Bank holiday hours are not set." and listed "Reviews with no reply 4 of the last 10", "Last post on Google 5 months ago", "Booking link Missing". The free check cannot read replies, holiday hours or post dates, so the Example leads with "No website is shown on Google." (the free check's own wording) and lists Opening hours, Phone and Photos.
Checked and kept: the cancel answer "Yes, any time. Your plan runs to the end of the period you paid for." (facts, the FAQ and the terms summary say it); "Five days before a bank holiday Kabsi asks" (facts, holiday hours); "Nothing goes live without your yes / Not a reply, not a post, not an hours change." (facts: no automatic put-back on any plan); the founding price line (facts: shown only while places remain); "After 90 days" (facts, Founding 25).

**The free check (part 3):**
- Start page (/scan and /google-profile-check): H1 "Check your business on Google, free.", line "See what customers see on your Google profile and what to do first. About 30 seconds, and no access needed.", the search box (Check 2, unchanged). Beside it "What the check looks at" / "About 30 seconds. No access needed." with five rows: "Your hours" / "The opening hours Google shows customers."; "Your reviews" / "How many there are, and your rating."; "Photos and links" / "Photos, your website and your phone."; "Your category" / "What Google calls your business."; "What ChatGPT says" (At launch) / "Whether its answer about you matches your Google profile.". Then "What you get back" / "The most important thing to fix, in plain words and why it matters. Then what customers see today, and what Kabsi would do from day one." with ticks "About 30 seconds.", "No Google access needed, no password, no card.", "Kabsi asks for nothing before you see the result.", then "What Google shows about the business is shown to you and not kept.", the trial line, and Home's Example result card.
- Result: the first finding on the dark band under "The most important thing" (was "What to do first"); "Google Maps" (Google's required attribution, exactly) under the address and under "Your public Google profile, in full".
- Lines changed to the facts: Design 8's "What the check looks at" rows ("Normal hours, and special hours for the next bank holiday.", "How many of the latest have a reply from you.", "When the last one went up.", "...and booking link") said the check reads special hours, replies and posts; Google's public data has none of them (K-82), so each row names only what the check reads, and the ChatGPT row carries "At launch" (the AI answer is mock until ai_visibility_mode is live).

**The free check's states and result (Web 4b part 1, 2 Nov 2026):**
- Every state sits in the hero where the search box was, beside "What the check looks at", with "What you get back" under it. Searching: "Free check", "Searching for [name]". Checking: "Checking", the business's name, the three real steps "Finding your business on Google", "Checking where you come up near your address", "Asking an AI assistant about you", then "About 30 seconds. Nothing changes on Google." One match: "Is this your business?"; several: "Pick your business"; each with "This is my business", "Google Maps", "Not here? Search again" and the free check line. None: "We could not find that business.", "Check the name and city, or type the name exactly as it shows on Google.", "You searched: '[q]'." and the search box. Search again: "Find your business again", "Add the city, or type the name exactly as it shows on Google.". Error: "The check did not run", "Something went wrong on our side.", the function's own message, "Try again", "Still not working? Write to hello@kabsi.co and a person answers."
- Result: "Free check, [date]", the business name, "[address]. Searched as '[term]'." and "Not your business? Change it", "Google Maps"; "The most important thing" (the check's first finding); "What Kabsi found" with "[n] to fix, [n] already right" and six rows, each with why it matters: "Opening hours" Shown or Missing / "Customers see when you are open." or "Customers cannot see when you are open."; "Reviews" "[n], rated [r]" / "People read your reviews before they choose." (fewer than 10 is to fix, as the check's own finding); "Photos" [n], or "10 or more" (Google returns at most 10) / "Photos show customers what to expect."; "Website" / "Customers can open your site from your profile." or "Customers cannot open your site from your profile."; "Phone" / "Customers can call you from your profile." or "Customers cannot call you from your profile."; "Category" / "What Google calls your business."; then "Shown live from Google. Kabsi does not store it." and "Google Maps". "An answer customers might see" (At launch while the nearby check is closed: "Whether its answer about you matches your Google profile."; once live, the AI answer with "Make sure your Google profile and website say this. AI assistants read them."). "Where you come up nearby" (At launch while the nearby check answers with the waiting list: "Kabsi will search Google Maps from places around you, like a customer standing there." and the waiting list; when the nearby check did not run for another reason, no At launch and the free check line, as on main). Beside it "What Kabsi would do from day one": the check's own actions (its findings first, then what Kabsi checks once connected, at most four), "Nothing goes live without your yes.", "Start free" (or "Get this on WhatsApp" and "Start free on the web" once WhatsApp is on), the trial line, "See how it works", "See the plans". Then the folds as before ("Who shows up around you", "What Kabsi sees once connected", "When you start: add Kabsi on Google") and "Send me this report". "Your public Google profile, in full" is retired (its facts are the rows of "What Kabsi found").
- /scan/CODE (the saved check): the same head with "Searched as '[term]'.", the nearby check, the AI answer when there is one, "Who shows up around you", and beside it "Start with a free check." with the search box. Loading: "Free check"; gone: "This report has expired.".
- Lines changed to the facts (lane R decisions 1 and 10): Design 8's result rows "Bank holiday hours Not set", "Reviews with no reply 4 of the last 10", "Last post on Google 5 months ago", "Booking link Missing" and its checking steps "Reading your hours and special hours", "Reading your latest reviews and replies", "Looking at your posts, photos and links" name things Google's public data does not hold (K-82). The rows are only what the check reads (hours, reviews, photos, website, phone, category); replies, holiday hours and posts appear only as what Kabsi does once connected, in the check's own words; the steps are the three the check runs. Design 8's day-one lines ("Have a reply ready for the 4 reviews without one.", "Tell you when your booking link is missing") became the check's own action lines. Design 8's "Kabsi asks you five days before each bank holiday" line under the first finding is left out (it fits only a holiday finding the check cannot make).

**Pricing and How it works (Web 4b part 2, 2 Nov 2026):**
- Pricing: title "Kabsi: Two plans. Free for 14 days.", H1 "Two plans. Free for 14 days." with its approved line, "Check my business free" and the trial line. Beside it "Your 14 days of Pro", "No card", the days 1 to 14, "Day 1" / "Starts when Kabsi's access works.", "Day 14" / "Choose a plan, or stop. Nothing is charged by itself.", "Essentials $29 a month", "Pro $59 a month". "Who each plan is for" with "Monthly" and "Yearly, 2 months free", each plan's name, badge, line, price, the founding line only while founding places remain (COPY 34 wording), its help line and working hours, "Start free"; then the three lines under the cards and the extra location line. "Compare the plans" (the Price 1 rows, unchanged) and "Only what Kabsi does today. More checks come later.". "The trial, what happens after it, and cancelling": "Today" / "Free check, then add Kabsi as a Manager" / "No card. Waiting for Google access costs you nothing."; "Day 1" / "Your 14 days of Pro start when access works" / "Replies, details watched, posts, the Monday receipt. Everything waits for your yes."; "Day 14" / "Choose a plan, or stop" / "Nothing is charged by itself. For 7 more days Kabsi keeps watching and drafting, and publishes nothing."; "Any time" / "Cancel any time" / "Your plan runs to the end of the period you paid for. Yearly plans are refundable within 14 days.". "The founding price" / "The first 30 paying businesses pay less." / "The first 30 paying businesses pay the founding price and keep it while they stay subscribed: Essentials $19 a month or $190 a year, Pro $39 a month or $390 a year." / "[n] of 30 founding places left." (the whole card only while places remain). "Founding 25" / "Three months of Kabsi Pro, free, for 25 businesses." / "By application. Kabsi does the Google work; you tell Rashid what to make better. After 90 days, choose a plan at the founding price or stop, nothing is charged by itself." / "[n] of 25 places left." (the real count; nothing while unknown) / "Apply for a place" ("All 25 places are taken." at 0). "Billing questions": "Do I need a card for the trial?", "What happens after the trial?", "Can I cancel?" (section 16, word for word), "Which cancel is which?" ("Cancelling on the Plan page ends your plan at the end of the period you paid for, and everything keeps working until then. Cancelling in Creem's own billing page ends the plan at once."; Design 8 said "on the Plan page or by asking Kabsi", and owner WhatsApp is not open), "Can I get a refund?", "Can I pay today?" (answers in faq-data.ts BILLING_FAQ). The closing free check. Retired from Pricing: the plan cards' work lists (the comparison holds them), the founding count bar, the Founding 25 banner and the photo beside the questions.
- How it works: title "Kabsi: Kabsi prepares. You approve. Kabsi follows through.", H1 the same headline, line "One week at an Example salon in Bristol: the daily watch, a new review, holiday hours asked in time, and the Monday receipt.", "Check my business free", the trial line. Beside it "This week at Hollis Hair" (Example): "Every day" "Details checked" "Done"; "Monday" "The receipt for last week" "Sent"; "Tuesday" "Reply ready for Chloe's review" "You said Yes"; "Friday" "Bank holiday hours asked" "You chose Closed". "A week with Kabsi" (Example), "Hollis Hair, an invented salon in Bristol. Each message is what Kabsi sends; each answer is the owner's.", the six stops (d8-how.tsx WEEK) with "Use my hours" and "Keep Google's", then WhatsApp's launch line while WhatsApp is off. "Getting started": "Run the free check" / "Your public Google profile and what to do first. About 30 seconds, no access needed." / "Check my business free"; "Add Kabsi as a Manager" / "In your Google profile: Menu, Business Profile settings, People and access, Add. Paste [the group ID], keep Manager, then Add (on some screens, Invite). No password, and you stay the owner." / "What Manager access means"; "Your first task" / "Kabsi reads your reviews and brings the older ones with no reply as one item, the drafts ready for your yes. Your 14 days start when access works."; "What you tap, on a real profile" with the recording (its lines as in access-video.ts). Then "What happens after your yes." (part 2 of Web 4), "You stay in control." and the closing. Retired from How it works: "Kabsi does the work. You reply Yes.", the try-it prompts, topics and the two-week timeline, "Set up in a few steps, no passwords" and "What Kabsi never does" (Control holds the same promises).
- Lines changed to the facts (decision 1): "Cancel in one step" became "Cancel any time" (Kabsi's cancel asks first, then ends the plan at the end of the period: facts, which cancel is which); "The first 30 paying businesses pay less, and keep it." became "The first 30 paying businesses pay less." (they keep it only while they stay subscribed, which the next sentence says); the Manager step adds "then Add (on some screens, Invite)" (facts, the access steps) and names the group ID from the one constant. Checked and kept: "Your plan runs to the end of the period you paid for", "Yearly plans are refundable within 14 days" and "refundable in full within 14 days of the plan starting" (facts 4.5), "For 7 more days Kabsi keeps watching and drafting, and publishes nothing" (facts, after a free trial), "one per business" (facts, one trial per Google business), the Creem cancel at once (facts), "Payments are processed by Creem, our merchant of record", "Waiting for Google access costs you nothing", five days before a bank holiday.

**FAQ, About, Security, Founding 25 and Partners (Web 4c part 1, 2 Nov 2026):**
- Titles "Kabsi: " and the hero headline; descriptions the hero line (docs/SEO-PLAN.md). BreadcrumbList on each; FAQPage on /faq (all five groups, word for word), /founding ("Questions about Founding 25") and /partners ("Questions partners ask").
- FAQ: H1 "Questions owners ask", line "Short answers, in five groups. If yours is not here, write to hello@kabsi.co and a person answers.", "Check my business free". Beside it the five groups with "[n] answers". Groups: "Getting started", "Google and control", "Plans and billing", "WhatsApp", "Privacy and data", the 26 answers in faq-data.ts FAQ_GROUPS. "Talk to a person" / "Write to hello@kabsi.co. A person reads it." and WhatsApp's launch line (with WhatsApp on: "Ask on WhatsApp, or write to hello@kabsi.co. A person reads it." and "Chat on WhatsApp"). The closing check.
- About: H1 "Kabsi is built for the owner at the counter.", line "One founder, one job: the Google work a local business never has time for, done and brought to the owner for a yes.", Rashid's photo with "Rashid Abou Hamzy, founder of Kabsi". The founder's note (unchanged) with WhatsApp's launch line while WhatsApp is off. "How Kabsi works with owners": "The owner decides" / "Nothing goes on Google until the owner says yes: not a reply, not a post, not an hours change."; "Manager access, never ownership" / "Kabsi works as a Manager the owner adds, and never asks for a Google password or a code."; "Honest proof only" / "Every example on this site is marked Example. No invented customers, stars or counts.". "Plain facts" adds "Kabsi is operated by Rashid Abou Hamzy.". "Follow Kabsi" unchanged.
- Security: H1 "Your Google profile stays yours.", line "Kabsi works as a Manager you add, never sees your password, publishes nothing without your yes, and is gone the moment you remove it.". Beside it "As your Manager, Kabsi can": "Prepare replies, posts and fixes", "Send to Google what you approved", "Check it is live on Google"; "Kabsi never can": "See your Google password", "Take ownership of your profile", "Publish anything without your yes", "Stay after you remove it"; "You stay the owner. Kabsi is independent and not affiliated with Google.". "In plain words": "Kabsi never sees your Google password.", "You can remove Kabsi as a Manager any time.", "Nothing goes live without your yes.", "Kabsi's database is in Frankfurt. Data is encrypted in transit.", "Data from your Google profile is deleted 7 days after you leave.", "Report a problem: hello@kabsi.co.". "Manager access, and how to remove it" with "What a Manager can do" and "Disconnect Kabsi" (main's text) and the removal recording. "Your data, your sign-in, and who to ask": "Notice of any change", "How you sign in, and what we never ask", "How your data is handled" (main's text), "Payments, and who to ask" / "Card payments will be processed by Creem, our merchant of record." / "If you think something is wrong, write to hello@kabsi.co. A person replies.". "What Kabsi never does": "Posts without your yes.", "Asks for your Google password.", "Writes fake reviews or rewards reviews.", "Asks only happy customers.", "Messages your customers.". The closing check.
- Founding 25: H1 and line approved; "Apply for a place" (goes to the form); the founding under line; "[n] of 25 places left." from the real count, nothing while unknown, "All 25 places are taken." at 0 (then the hero's action is the free check). Beside it Rashid's photo with "Rashid Abou Hamzy, founder of Kabsi, reads every application himself.", the four groups "Beauty and hair", "Food and drink", "Health", "Other trades" (was "Auto, fitness, home services and hotels") with "[n] of [cap] left" from the real count or "[cap] places" while it is unknown, and "A place still open after 30 days goes to the next good applicant of any trade.". WhatsApp number hint "With the country code, for example [number]." (+971 50 123 4567, +44 7700 900123, +1 202 555 0143 by the visitor's country; +44 7700 900123 when it is not one of the three). "Rashid is reading your application." (was "We are reading your application."); the sent and waitlist lines drop "on WhatsApp" ("answers within 2 working days", "Rashid writes to you if one opens"); "Any time. Remove Kabsi from your Google profile and tell Rashid." (was "tell us on WhatsApp"; owner WhatsApp is not open).
- Partners: H1 and line approved, "Apply by email" (to the form at the foot), under it "Pro is $59 a month. You earn 25% of every payment, while the referred subscription stays paid.". Beside it the Example "Your partner page", "Recommended by Sam, Kabsi Partner", "kabsi.co/p/sam", the QR code, "Sam is a Kabsi Partner and earns a share if you subscribe.", "For each Pro business" / "$14.75 a month". "How it works" with "Step [n]", the four gets, "Who it suits" with the earnings example, "The rules" on the dark band with the Founding Partners line and "Read the partner terms", "Questions partners ask" with "Owners, start with the plans.", then "Earn 25% of every payment.", "Kabsi Partners opens at launch.", "Run a free check for a business you know" and the form. Retired: "What you could earn" (its line is the hero's under line) and the photo.
- Lines changed to the facts (lane R decision 1): FAQ "What does the free check show?" named special hours, replies under the latest reviews, the last post and the ChatGPT answer; the check reads Google's public data only (K-82) and the AI answer is not live, so it reads "What customers see on your Google profile today and what to do first: your opening hours, how many reviews you have and your rating, your photos, your website and phone, and your category. It takes about 30 seconds and needs no access."; "Does Kabsi use my reviews to train AI?" said review text goes to Anthropic "only to draft and check replies"; facts 9.4: "No. Review text and business facts go to Anthropic's API for drafts and checks, and Anthropic does not train on them. Kabsi never uses Google data to train AI models."; "What does the free check keep?" said Kabsi keeps an address and Place ID "only if you ask for the result by email"; facts 9.7 keep the Place ID always and the address for the waiting list too: "What Google shows about the business is shown to you and not kept; Kabsi keeps only the business's Google Place ID. If you ask for the result by email or join the waiting list, Kabsi keeps your email address too."; Security's summary "Data from your Google profile is deleted after you leave." gains "7 days" (facts 9.7). The WhatsApp answers follow the WhatsApp switch (decision 6); with WhatsApp on they read "Yes. Message Kabsi on WhatsApp, or write to hello@kabsi.co.", "Yes. Every reply, post and change waits for your yes on WhatsApp." and "Only after your yes, and you can reply STOP at any time.". Checked and kept: "Your plan runs to the end of the period you paid for. Monthly plans can be cancelled at any time. Yearly plans are refundable within 14 days." (facts 4.1 word for word), the trial start, "one per business", the 7 more days after the trial, the extra location price, "Can I pay today?", "Kabsi stops at once" and "Cancelling a plan never removes Kabsi's access by itself" (facts 4.5), deletion 7 days after a request, no selling or renting, the Founding 25 groups, 90 days and the founding price, the partner payouts, $14.75 (25% of $59).

**The Businesses hub and the industry pages (Web 4c part 2, 2 Nov 2026):**
- /for: title "Kabsi: The Google work your kind of business has.", H1 the same, line "A barbershop's week on Google is not a restaurant's. Pick your trade to see the jobs that come back, the searches people use, and what the free check shows.", "Check my business free". Beside it the four trades as photo cards ("Hair salons", "Barbershops", "Nail salons", "Restaurants"). "Four trades, four different weeks": each trade's lead, its first three jobs and "The Google work for [trades]". "More kinds of business" / "Kabsi works for any business with a verified Google profile that customers visit, or that travels to them." (Design 8's "These pages are on the current site." is left out: they are on this site's template now), the other finished pages as photo cards, then "By kind of business" and the indexed groups. The closing check.
- /for/<group>: H1 "[group]." with the group's lead, the breadcrumb, its finished pages as photo cards, "Pages on the way" as before.
- Each industry page: the breadcrumb "Home / Businesses / [trades]"; H1 "Your [trade] on Google. Taken care of." (no yellow phrase); the trade's lead; the free check box with the trade's search; the trade's photo with one Example message "Kabsi, for [business]", its label and "Example". "The Google jobs that come back for a [trade]." and the five jobs. "What people search for" with the trade's searches and "Searches like these. Kabsi checks the ones your customers use in your area."; "What the free check shows for a [trade]" with, on the four Design 8 trades, the trade's line and four Example rows of only what the check reads, and on the others "Your opening hours", "Your reviews and your rating", "Your photos, website and phone", "Your Google category"; then "Replies, holiday hours and posts are what Kabsi checks once connected." and "Check my business free". "Your Google profile, as a [trade] owner" (the two guide sections, or on the older pages "What customers write about", "Google categories that fit", "Holidays and busy dates", "Photos and posts" with "Post ideas"), "See how it works", "See the plans" and the page's guides. "You stay in control.", "Questions from [trade] owners", "Related trades" with "Every kind of business", the closing check. The older pages keep their story (title, lead, the WhatsApp card with "A sample conversation. Every business here is an example.").
- The four Design 8 trades: every line in src/content/industries (hair-salon.ts, barbershop.ts, nail-salon.ts, restaurant.ts), each with its row in docs/claims. Titles and descriptions per docs/SEO-PLAN.md, changed where they named what Kabsi does not do.
- Lines changed to the facts (lane R decisions 1 and 10): Kabsi does not edit services, menu items or the booking link on Google yet (facts 04; the order and booking button is [COMING]), so Design 8's "A booking link that works" jobs, "Kabsi prepares the line; you check the price", "Kabsi changes a price once you say yes", the restaurant's "3 changes ready for Google ... the lamb shank at 19.50" and the hair salon's "Add her colour services to your Google profile" became what Kabsi does: the Profile Coach lists missing services; a checked menu photo and a post wait for the owner's yes; "Kabsi does not edit menu items on Google today."; "Not yet. Kabsi's Profile Coach lists the services your profile is missing; adding them on Google for you comes later."; the booking link is Google's own feature with advice to check it. "flags one where a face fills the frame" became "tells you when one is dark, blurry or too small" (the facts' photo checks). The restaurant's "Special days, asked in time" (Christmas Eve, New Year's Eve, a private event) became "Bank holidays, asked in time" (Kabsi asks before public holidays only); the other days stay as Google's special hours. "Each gets a reply that mentions the dish or the table" became "drafted from what the guest wrote, never an invented dish or offer" (facts 7.1). "promises a free redo only if you have said so" became "never offers anything in return for changing the review". "Most people look at a restaurant's menu before they book" left out (no source). The free check example rows (bank holiday hours, reviews with no reply, last post, booking link, Christmas hours, menu photos) became only what the check reads: opening hours, reviews and rating, photos, website, phone. Each change is listed in its claim sheet.
- Independent review fixes (Web 4c part 2): no post is made by adding a team name ("A post that says who joined can go up once you approve it."); "never thanked by mistake" became "never thanked once you take their name off the list"; "Google can reject replies that do" cut (no Google source for replies); "most people", "as often as" and "often name" left out (no source); the nail salon's health review answer drops "a way to reach a person" (that button is WhatsApp's, not open); the restaurant's promise answer drops "where you show up" (the nearby check is At launch); "Kabsi checks the ones your customers use in your area." became "On Pro, Kabsi shows the words people searched on Google to find you." (the search terms report, Pro).

## 39. Fix 1: website fixes from QA 2 (2 Nov 2026, lane R's decisions of 2 Nov, items 5 to 8)

- The shared FAQ answer (16, FAQ 4; Home and /faq): "Can Kabsi promise where I come up on Google Maps?" now answers "No one can promise that. Kabsi shows what changed on your profile and what you can do next. Where you come up nearby opens at launch." (was "No one can promise that. Kabsi shows where you show up, what changed, and what you can do next."; the nearby check is At launch).
- Photo tips on four industry pages say only what the photo check does (it does not check faces; facts 13, "What photos can I post?", is the one statement):
  - /for/physiotherapy, "The treatment room and the exercise area": "Couches made up, equipment tidy, no patient in the frame. Kabsi checks light, focus and size, not faces, so keep patients out of it." (was "... Kabsi flags any photo where a face is the main subject.")
  - /for/gym-and-fitness, "The floor and the racks, with no member in the frame": "Wide, level and well lit. Kabsi checks light, focus and size, not faces, so ask before anyone is shown." (was "Wide, level and well lit. Kabsi flags a photo where a member's face is the main subject, so ask before anyone is shown.")
  - /for/medical-and-aesthetic-clinic, "The waiting area, tidy and bright": "Where a first visit starts. Google asks for photos in focus and well lit, and Kabsi flags one that is dark, blurry or too small. It does not check faces, so keep patients out of it." (was "... and Kabsi flags any photo where a face is the main subject.")
  - /for/spa-and-massage, "The treatment room, empty and lit": "Table made up, towels folded, lights low but enough for the camera. Never a client on the table: Kabsi checks light, focus and size, not faces." (was "... Never a client on the table: Kabsi flags a photo where a face is the main subject.")
- /for/dental-clinic: no line changes; the page is noindex and out of the sitemap (and out of llms.txt) until docs/claims has its sheet.
- The bot check on /google-review-link, /partners and /founding loads on the form's first touch: no new line. A submit that comes before the check is ready waits for it; if the check fails, the existing line "We could not check your browser. Try again" shows and nothing is sent.
- Signed-in screens and the review and post cards: no new line. The error state ("Something went wrong on our side." / "Nothing you did. Try again in a minute.") now shows within 5 seconds; after Approve, keyboard focus moves to Undo, then to the line that says where it is.

## 40. Polish 2: the last marketing polish before ads (3 Nov 2026, lane R's decisions of 3 Nov, from an outside review)

Rule for every Example finding (decision 1): each problem leads to a next step Kabsi can do today, or one marked At launch, and nothing else.

### Pull request A: copy and accuracy (decisions 1, 2 and 4)

- Home's supporting line (decision 2): "Your details kept right, every review answered and your profile kept fresh, without doing it yourself. Kabsi prepares the work and asks for your yes before anything goes live." (was "Kabsi checks your Google profile every day, prepares the replies, posts and fixes it needs, and asks for your yes on WhatsApp."). It is also Home's description for search. "WhatsApp opens at launch. Until then you approve on kabsi.co." still follows it while WHATSAPP_ON is off (the hero phone is WhatsApp-style).
- Home, "The work your Google profile needs, every week." (benefit first, then how): "Your details kept right" / "Kabsi checks your hours, phone, website and address every day. If Google shows something different, Kabsi tells you and you choose." (was "Your details, watched every day" / "Hours, phone, website and address. If Google ..."); "Every review answered" / "A reply in your voice, using only what the review says. You read it, then say Yes, Edit or Skip." (was "A reply for every review" / "In your voice, ..."); "Your profile kept fresh" (was "Posts and photos, made ready"); "The right hours on every holiday" (was "Holiday hours, asked in time"); "Your weekly report" / "Every Monday: what Kabsi did, what waits for your yes, and one next step." (was "The Monday receipt" / "What Kabsi did, ..."); "See where you show up nearby" (At launch; was "Where you show up nearby"); "Know what AI assistants say" (At launch; was "What AI assistants say"). The texts are otherwise unchanged.
- The weekly report (decision 4): introduced as "Your weekly report" with "Every Monday: what Kabsi did, what waits for your yes, and one next step." The phrase "Monday receipt" leaves the website: the hero phone's label "Weekly report" (was "Monday receipt"); How it works' hero line "... holiday hours asked in time, and your weekly report." (was "... and the Monday receipt."); its week "Monday: Your weekly report" (was "The receipt for last week") and the stop "Your weekly report" (was "The Monday receipt"); Pricing's Day 1 "Replies, details watched, posts, your weekly report. Everything waits for your yes." (was "... the Monday receipt. ..."). The product's own name stays Results Report where the product names it (plan cards, comparison table, the signed-in screens).
- The Example free check result (Home and the free check page; decision 1): "Most important" "No opening hours are shown on Google." / "Kabsi asks you for your hours and sends them to Google once you say yes." (was "No website is shown on Google." / "Kabsi asks you to confirm the address and prepares the change for you to approve."); rows "Website" Shown, "Phone" Shown, "Photos" 23 (was "Opening hours" Shown, ...).
- The free check's own findings (profile-snapshot, the live result and its "What Kabsi would do from day one"):
  - "No opening hours are shown on Google." / "Kabsi asks you for your hours and sends them to Google once you say yes." (was "... and prepares them for you to approve.")
  - "No phone number is shown on Google." / "Add your phone number on your Google profile. Once you connect, Kabsi checks it every day with your other details." (was "Kabsi asks you to confirm it and prepares the change for you to approve."; Kabsi cannot add a phone number for the owner)
  - "No website is shown on Google." / "Add your website on your Google profile. Once you connect, Kabsi checks it every day with your other details." (was "Kabsi asks you to confirm the address and prepares the change for you to approve.")
  - "No category is shown on Google." / "Choose your main category on your Google profile. Once you connect, Kabsi's Profile Coach lists what else your profile is missing." (was "Kabsi suggests the closest category for you to approve."; Kabsi never changes the main category)
  - "Google shows this business as temporarily closed." / "If you are open again, change it on your Google profile. Once you connect, Kabsi checks it every day and tells you if Google shows something different." (was "If you are open, Kabsi prepares the update for you to approve."; Kabsi never changes the open status)
  - Unchanged and checked: permanently closed (the steps to ask Google), no photos (photos from your phone, for your approval), fewer than 10 reviews (the review link and QR code), and the three "Once you connect" lines.
- The industry pages' Example free check (each warn row now carries its next step):
  - /for/hair-salon: "Opening hours" Missing, "Kabsi asks you for your hours and sends them to Google once you say yes."; "Reviews" 38, rated 4.8; "Photos" 10 or more; "Website" Shown. Line: "For a hair salon the free check starts with your hours, because a client checks you are open before booking, then your reviews, photos and website. Example result for an invented salon in Bristol." (was "Website" Missing with no next step, "... starts with the link a client looks for before booking, ...")
  - /for/barbershop: "Opening hours" Shown; "Reviews" 7, rated 4.6, "Kabsi gives you a review link and a QR card to hand to every customer."; "Photos" 10 or more; "Phone" Shown. Line: "... relies on: your hours, your reviews and your photos. ..." (was "Website" Missing, "... and a way to find out more.")
  - /for/nail-salon: "Photos" 4, "Kabsi asks for photos of your work from your phone, checks each one and sends it to Google once you say yes." (rows otherwise unchanged)
  - /for/restaurant: "Photos" 3, "Kabsi asks for photos of your dishes and your room from your phone, checks each one and sends it to Google once you say yes." (was "Website" Missing); line "... your hours, your phone and your photos, then your reviews." (was "... and your website, ...")
- Checked and kept (decision 1): Home's hero phone (hours with "Use my hours" and "Keep Google's", a reply, a post), How it works' week (each stop is Google Protection, a reply, a post, holiday hours or the weekly report), Pricing (no Example findings), the industry pages' hero messages and jobs (Web 4c's review).

### Pull request B: Home (decisions 3, 7 and 8)

- The hero phone (decision 3) shows three Example messages: hours ("Use my hours", "Keep Google's"), a reply ready, a post ready with a photo (the fourth, the weekly report, left the phone). Its buttons are pictures only: not focusable, no pointer cursor, hidden from screen readers; the phone keeps "Example". Screen reader caption: "Example messages from Kabsi to an invented salon: different opening hours on Google, a reply ready for a review, and a post ready with a photo."
- The weekly report card beside the phone (Example): "Every Monday", "Your weekly report", "6 replies live on Google", "1 post", "Details checked every day", "One next step: Add 3 photos of the team at work."; on a phone one line: "Every Monday: 6 replies live on Google, 1 post. One next step: add 3 photos of the team at work."
- The Founding 25 line above the header (decision 7) shows only on Home, Pricing, How it works, /for and the industry pages; not on About, Security, FAQ, the free check, Founding 25, Partners, the legal pages or sign-in. Its words are unchanged.
- "From the founder" (decision 8; Rashid's real photo): "A Google profile needs work every week: replies, hours, posts. A busy owner rarely has time for it. I built Kabsi to do that work for you. If you have a question, write to me." Signed "Rashid Abou Hamzy, founder of Kabsi." with hello@kabsi.co as a mail link. Beside it the Founding 25 card: the real count line (unchanged), "Founding 25: three months of Kabsi Pro, free.", "By application. Kabsi does the Google work; you tell Rashid what to make better. No card. After 90 days, choose a plan or stop, nothing is charged by itself.", "Apply for a place". Removed: "Rashid Abou Hamzy, founder of Kabsi, reads every application himself." (Founding 25's page keeps its own lines).
- Control and security said once on Home (decision 8): Home's four questions no longer include "Does Kabsi need my Google password?" ("You stay in control." says "No password"); "What if I already reply to reviews myself?" takes its place. No testimonials, logos, counts or results anywhere.
- docs/VIDEO-PLAN.md section 9 (decision 9, plan only; sections 1 to 8 unchanged): the product video's seven shots and captions, "Your business on Google.", "Kabsi checks your details every day.", "A reply or a post, ready for you.", "Nothing goes live without your yes.", "Kabsi checks it is live on Google.", "Every Monday, your weekly report.", "Free check at kabsi.co. Free for 14 days once connected. No card." Not on the site until a real video exists.
### Pull request C: Pricing and the free check's next step (decisions 5 and 6)

- Pricing's hero visual (decision 5): the 14-day calendar became one strip, "Your 14 days of Pro", Day 1 to Day 14, then "Day 1 is the day Kabsi's access to your Google profile works.", "No card.", "On day 14 choose a plan or stop. Nothing is charged by itself.", with the two monthly prices as before, at every width (was the calendar with "Day 1" / "Starts when Kabsi's access works." and "Day 14" / "Choose a plan, or stop. Nothing is charged by itself.").
- Each plan card says who it is for (its line, unchanged) and its four most valuable built things, checked against plan_limits() in the database and the search terms report:
  - Essentials: "A reply ready for every new review"; "Your details checked every day, with an alert when something changes"; "Holiday hours and 2 posts a month, made ready"; "Your weekly report every Monday, with one next step".
  - Pro, under "Everything in Essentials, and:": "A post every week, not 2 a month" (weekly_posts); "Team roles and approval rules: choose who can say yes" (team_roles); "Profile Coach actions: the change made for you after your yes" (coach_actions; lane R's decision of 3 Nov puts them on the card, replacing the 30 Oct rule "in the table only"); "The words people searched on Google to find you, every month" (the search terms report, monthly).
  - Not on the cards: the nearby check's weekly (Pro) and monthly (Essentials) runs, because the nearby check is not open (At launch).
  - Help is a small line under the list: the plan's help line and "Working hours: Monday to Friday, 9:00 to 18:00, UAE time." (was a boxed block).
  - Every price, the founding price, Founding 25, yearly and extra location are unchanged.
- The free check result, under "Start free" (decision 6), a short list: "Free" / "This check, and your first 14 days of Pro. No card."; "To start" / "Add Kabsi as a Manager on your Google profile. It takes about two minutes, and you stay the owner."; "Your first days" / "Kabsi checks your details on Google and prepares a reply for each new review. Each one waits for your yes."; "When the 14 days start" / "Only once Kabsi's access works, so waiting for Google costs you nothing. Nothing is charged by itself." Then the secondary link "Or apply for Founding 25: three months of Pro, free" (to /founding), only while Founding 25 places remain (the real count). The trial line under the button gave way to this list. The buttons, "Get this on WhatsApp", "Start free on the web" and every analytics and Meta event are unchanged.

## 41. Polish 3: the free check result's order and one switch for the At launch labels (3 Nov 2026, lane R's decisions of 3 Nov, review of Polish 2)

No line was reworded. What moved and what now follows a switch:

### The free check result (decision 1)

Order at every width: "The most important thing"; "What Kabsi found"; "What Kabsi would do from day one" with "Start free" and the next steps (Free, To start, Your first days, When the 14 days start, and "Or apply for Founding 25: three months of Pro, free" while places remain); the two At launch cards ("An answer customers might see", "Where you come up nearby" with its email form); "See how it works" and "See the plans"; "What Kabsi sees once connected" and "When you start: add Kabsi on Google"; "Send me this report". Every analytics and Meta event is unchanged.

### One switch for the nearby check and the AI answer (decision 2)

`NEARBY_ON` in `src/lib/site.ts`, false today, beside `WHATSAPP_ON`. While it is false:

- Home's jobs "See where you show up nearby" and "Know what AI assistants say" carry the pill "At launch" (d8-data.ts).
- The Example result's "An answer customers might see" carries it (result-preview.tsx), and the free check page's "What ChatGPT says" row (d4-free-check.tsx).
- The FAQ answer to "Can Kabsi promise where I come up on Google Maps?" reads "No one can promise that. Kabsi shows what changed on your profile and what you can do next. Where you come up nearby opens at launch."

With `NEARBY_ON` true the pills and the last sentence disappear and nothing else changes; the FAQ answer then ends "... and what you can do next." The live free check keeps its own waiting-list logic and its pills; Kabsi Partners keeps its own "opens at launch" lines.

### The WhatsApp approval answer (decision 3)

FAQ, "Can I approve a reply or a post on WhatsApp?", follows `WHATSAPP_ON`:

- `WHATSAPP_ON` false (today): "Not yet. WhatsApp opens at launch. Until then you approve on kabsi.co."
- `WHATSAPP_ON` true (written from the facts: the yes comes on WhatsApp, nothing goes live before it, and the changes that are confirmed on kabsi.co say so): "Yes. Kabsi sends each reply or post to you on WhatsApp, and nothing goes live on Google until you say yes. A change to your address, phone or business name is confirmed on kabsi.co instead." (was "Yes. Every reply, post and change waits for your yes on WhatsApp.")


## 42. Photo Post 1: a photo with words becomes a Google post (4 Nov 2026, master plan 30.23 item 2, for lane R's next copy review)

WhatsApp lines (supabase/functions/_shared/whatsapp/say.ts). Each answer starts with the head line ("Business (role)") as every WhatsApp answer does. [Business] is the business's name.

- The post shown to the person who may approve it: "[Business]: Kabsi will post this on your Google profile with the photo you just sent, after your yes." then the exact post text in quotes. Buttons: "Approve", "Edit on kabsi.co", "Skip".
- The post sent to the owner and managers when staff sent the photo: "[Business]: your team sent a photo with a note. Kabsi will post this on your Google profile with that photo, after your yes." then the exact post text in quotes. Same three buttons.
- To staff after they sent a photo with words: "Thank you. Kabsi made a post with your photo and words, and the owner is asked to approve it. Nothing goes on Google until they say yes."
- No posts left on the plan this month: "[Business]: your plan has no posts left this month, so Kabsi cannot make this a post. You can add the photo to your Google profile on its own, or skip it." Buttons: "Add as a photo", "Skip".
- Words that fail the post checks: the existing postProblem line ("[Business]: Kabsi cannot post that as it is, because it [problems]. Please send it again without that.") followed by "Or add the photo to your Google profile on its own, or skip it." Buttons: "Add as a photo", "Skip". The new problem endings: "has an offer you did not give Kabsi", "says it is the best, which Google does not allow", "makes a health, safety or results promise", "repeats the same words too often", "is too close to a post from the last 90 days", "promises a medical result", "promotes alcohol, which posts here cannot do", "is not 10 to 1,500 characters long", "does not fit a post", and for anything else "breaks one of Google's rules for posts".
- The same two cases when staff sent the photo (staff get Skip only; "Add as a photo" is the owner's or a manager's choice): the postProblem line followed by "Or send the photo again without words to add it on its own, or skip it.", and "[Business]: the plan has no posts left this month, so Kabsi cannot make this a post. Send the photo again without words to add it on its own, or skip it."
- To staff when no owner or manager who may approve has WhatsApp on: "Thank you. Kabsi made a post with your photo and words. It waits for the owner's yes on kabsi.co. Nothing goes on Google until they say yes."
- After "Add as a photo": "Okay. Kabsi is getting the photo ready on its own and will ask you here: Yes, Edit or Skip. Nothing goes on Google until you say yes."
- After Skip (on the post, or on a held photo): "Okay, skipped. Nothing was put on Google."
- Approve pressed while the photo is still being checked: "Kabsi is still checking the photo. Press Approve again in a minute."
- Unchanged and reused: the Approved line with Undo ("Approved for [Business]. It goes to Google in 10 seconds. Press Undo to stop it."), "Undone. Nothing was sent. The draft is waiting for you in Kabsi.", and the outcome lines of task-close.ts for Sent to Google and Live on Google.

Website (Home, the work Kabsi does, src/components/kabsi/d8-data.ts): the job "Your profile kept fresh" now reads "Send a photo with a line about it. Kabsi turns it into a Google post and asks for your yes." (was "A new service, late opening, a quiet week. Kabsi writes the post and readies your photo."). Nothing else on the website changes (Design 9 and Web 5 do that).

## 43. Web 5: Design 9 on kabsi.co (4 Nov 2026, master plan 30.24, lane R's approval of Design 9)

Design 9's new lines are approved by lane R with the changes in 30.24. Each part of Web 5 adds the lines it ships here, checked against knowledge/kabsi-facts.md. Everywhere else the pages keep kabsi-canvas's current wording, not the studio's older Design 8 lines.

### Part A: the shell (header, phone menu, phone bar, footer, Founding 25 line)

- Header links: "How it works", "Businesses" (one link to /for, no menu; was a Businesses menu with the four trades and "Every kind of business"), "Pricing", "Log in". The header's button: "Free check" (was "Check my business free"), filled charcoal with ivory text (30.24 item 2). Screen reader: "Open menu", "Close menu" (unchanged).
- Phone menu: the rows "How it works", "Businesses", "Pricing", "Log in"; the button "Check my business free" and the trial line (unchanged); one quiet row: "Ask Nora", and "WhatsApp" only while WHATSAPP_ON. The menu's dialog label: "Menu"; its links: "Menu links".
- Phone bar: "Check my business free" and Nora's round button ("Ask Nora, Kabsi's assistant" for screen readers, unchanged). No WhatsApp button in the bar.
- Footer: the brand line "Your business on Google. Taken care of." (BRAND_LINE); Facebook and Instagram as icons from SOCIAL_LINKS, read as "Kabsi on Facebook" and "Kabsi on Instagram", the list as "Kabsi on social media". Groups "Product" (How it works, Pricing, Free check, Review link and QR code, Security), "Explore" (Businesses, Guides, FAQ, Partners), "Company" (About, Founding 25, Contact, and WhatsApp only while WHATSAPP_ON). No industry links. The quiet row is unchanged: Privacy, Terms, Partner terms, Your privacy choices, the independence line with "Google's guidance on working with a third party", the operator, contact and Creem line, "© 2026 Kabsi". The footer's "Chat on WhatsApp" button is gone; WhatsApp is the Company link while the number is set.
- Founding 25 line: words, the real count and the hide button unchanged; it shows on Home, Pricing, /for and /for/* only (no longer on How it works, 30.24 item 2).
- The WhatsApp glyph is now Meta's own file (WhatsApp Brand Resource Center, Digital_Glyph_Green_RGB_2026.svg), beside the word only.
- Facts: 02 (Calls to action: the header's Free check) and 01 (the website's frame from 4 Nov 2026).

### Part B: Home

Source: src/components/kabsi/d9-data.ts, d9-hero.tsx, d9-home.tsx. Approved Design 9 lines used as they are, except where marked "changed to the facts".

- Hero: H1 unchanged, "Taken care of." on the yellow bar (treatment B). Visible line: "Kabsi checks your Google profile every day, prepares the fixes, posts, photos and replies it needs, and brings each one to you on WhatsApp for a yes." (was Polish 2's line, which stays the meta description). "WhatsApp opens at launch. Until then you approve on kabsi.co." follows while WHATSAPP_ON is false. The scan box, "See how it works" unchanged. The hero phone: "Your details" (hours, Use my hours, Keep Google's), "Post" ("Post ready with your photo:" 'New balayage colours this month. Saturdays are open.', Approve, Edit, Skip), "Review" (Chloe B., Yes, Edit, Skip); two messages on a phone.
- Steps line: "Kabsi checks, prepares, asks you on WhatsApp, follows through, reports." with "Your Google profile, every day." / "Replies, posts and fixes, ready for you to read." / "You say yes, edit it or skip it." / "Sent to Google, then checked until it is live." / "Your weekly report, every Monday."
- Profile watch: "When Google shows something different, you choose." Line, changed to the facts: "Kabsi checks your Google profile every day: hours, phone, website, address, category, open status and more. When Google shows something different, you hear about it by email, and on WhatsApp once it opens." (with WHATSAPP_ON: "... Kabsi tells you on WhatsApp."). Rules, changed to the facts (Design 9's "Hours, website or description" and "Phone, categories or open status: you change them on Google yourself" said more than the facts, which give Keep my information for every watched detail): "Keep my information" / "Kabsi puts your version back on Google once you say yes, then checks it shows."; "Google is right" / "Google's version becomes yours, and nothing is sent to Google."; "Never by itself" / "Kabsi never puts anything back without your yes." The chips, changed to the facts' watched list: Name, Hours, Phone, Website, Address, Category, Open status, Map pin (Design 9 had Special hours and Description). "What Google shows" / "What you told Kabsi", "Bank holiday Monday", "Closed", "10:00 to 16:00".
- Photo to post: "Send a photo. Get a Google post."; "Take a photo at work and send it to Kabsi on WhatsApp with a line about it. Kabsi turns it into a Google post with that photo and asks for your yes."; the WhatsApp launch line while WHATSAPP_ON is false; "A photo with no words becomes a photo on your Google profile, also after your yes." (30.24 item 2); "Kabsi also prepares posts for you: 2 a month on Essentials, every week on Pro."; Approve, Edit, Skip; Approved, Sent to Google, Live on Google.
- Supporting row: "A reply for every new review" / "Ready in the review's language. You say Yes, Edit or Skip."; "Holiday hours, asked in time" / "Five days before a bank holiday Kabsi asks what you will do."; the weekly report card with "What Kabsi did, what waits for your yes, and one next step." (from 640 px).
- Where you show up (At launch until NEARBY_ON): "Two checks Kabsi runs from launch, shown as they are. No score."; "Near you on Google Maps", "Searched: hair salon, 2 Nov 2026", "You came up in the first 3 at 3 of 8 places Kabsi checked.", the map line, "Sample Google Maps results, not customer counts."; "An answer customers might see", Question, Assistant, Asked on, Sources it cited, the Example question and answer, and the API label.
- Kept word for word from kabsi-canvas: "You stay in control." and its five lines (d8-data CONTROL; the explanations show from 640 px), "Pick your business", "Two plans. The work comes first." with the founding price line only while places remain, "From the founder" with the real Founding 25 count, the four questions (HOME_FAQ, their current WhatsApp-off wording), "Start with a free check.".
- Removed from Home: "What your free check shows" with its Example result, the seven jobs list and the three beats (the steps line and the stories replace them; the free check page keeps its own result).

### Part C: How it works

Source: src/components/kabsi/d9-how.tsx, how-page.tsx (was d8-how.tsx), d9-data.ts.

- Hero: H1 unchanged ("Kabsi prepares. You approve. Kabsi follows through.", the last sentence on the yellow bar: a title of more than two sentences marks only its last, so the bar never covers more than one). Visible line: "Three Example cases at an invented salon in Bristol: hours changed on Google, a photo turned into a post, and a new review. Tap through each one." (Design 9; the meta description stays "One week at an Example salon in Bristol..."). The hero card: "Three cases, one path" with each case's summary ("Google showed different hours. The owner chose their own.", "A photo and a line on WhatsApp became a Google post.", "A new review got a reply in the owner's voice.") and Approved, Sent to Google, Live on Google.
- The steps line (part B) under the hero.
- "What happens after your yes." / "Pick a case, then tap the main button on the phone. Each state shows as it happens: Approved, Sent to Google, Live on Google, or Did not go through." Tabs "Hours changed", "Photo to post", "New review". Buttons as the product sends them: Use my hours and Keep Google's; Approve, Edit, Skip; Yes, Edit, Skip.
- Chat lines: "Approved. You can undo it for 10 seconds.", "Undo (n s)", "Sent to Google. I will tell you when it is live.", "Live on Google: bank holiday Monday, 10:00 to 16:00." / "Live on Google: your post with your photo." / "Live on Google: your reply to Chloe B.", "Google did not accept it. Nothing was changed. Kabsi will tell you what to do."; "Kept. Google's hours stay, and nothing is sent.", "Skipped. Nothing is sent.", "Edit opens the words for you to change, then you approve.", "Try again".
- The state track: "Approved" / "You said yes. Nothing has reached Google yet."; "Sent to Google" / "Kabsi sent it and has not seen it on Google yet."; "Live on Google" / "Kabsi checked it shows, then told you."; "Did not go through" / "Google said no. Kabsi tells you and nothing changes." Under it: "Nothing has happened yet. Nothing goes to Google before your yes.", the switch "Show what happens when Google says no", "Start again", and the WhatsApp launch line while WHATSAPP_ON is false.
- Kept from kabsi-canvas word for word: Getting started (Run the free check, Add Kabsi as a Manager with the group ID, Your first task, the Manager recording), "You stay in control.", "Start with a free check.".
- Removed: Design 8's "A week with Kabsi" timeline and the after-your-yes section (the demonstration shows the same states).

### Part D: Pricing, the industry pages and every other public page

No new words. Every public page keeps its own current wording and takes on the shell (part A) and Design 9's H1 treatment B through PageHero: a title of two or more sentences has its last sentence on the yellow bar; a one-sentence title stays plain. Per page:
- /pricing: "Two plans. Free for 14 days." with "Free for 14 days." on the bar; the steps line (part B) under the hero; the Founding 25 line.
- /for/hair-salon: "Your hair salon on Google. Taken care of." with "Taken care of." on the bar; the photo story band "Send a photo. Get a Google post." (part B lines) under the hero; the Founding 25 line.
- /for/<trade> (every indexed trade page, the same template): "Your <trade> on Google. Taken care of." with the bar; the Founding 25 line.
- /for and the hub pages: one-sentence titles, plain; the Founding 25 line.
- /scan, /faq, /about, /security, /founding, /partners: one-sentence titles, plain; the shell; no Founding 25 line.
- /privacy, /terms, /partners/terms, /guides, /guides/*, /login, /setup-call, /manager-steps, /google-review-link, /google-profile-check: their own layouts inside the shell, unchanged; no Founding 25 line.
- Changed on the hair salon, barbershop and nail salon pages (and d8-data's old hero stream): the Example post card's buttons read "Approve", "Edit", "Skip" (were "Yes", "Edit", "Skip"), as the product sends posts (30.24 item 2). Review cards keep "Yes", "Edit", "Skip"; the older trade stories that offer several drafts at once keep "Reply Yes for both".

## 44. Photos 2: remove a photo from Google, the screenshot note, and a clearer Photos screen (4 Nov 2026, for lane R's next copy review)

Website, Photos (`src/routes/_authenticated/app/photos.tsx`, `src/lib/photos.ts`, `src/components/kabsi/d3-account.tsx`). Owners and managers who may approve photos only; staff see none of the removal lines.

- On a photo's card in "Sent to Google", once it is live on Google: the button "Remove from Google". It opens the confirm step: "Remove this photo from your Google profile? You have 10 seconds to undo." with "Remove from Google" and "Keep it". Then the existing Approved line with Undo ("Approved. It goes to Google in [n] seconds.").
- The removal's three states, as a pill with one line under it:
  - "Removing": "Kabsi asked Google to remove it and checks until it is gone."
  - "Removed from Google": "Google no longer shows this photo." (also when the owner had already deleted it on Google)
  - "Did not go through": the existing failed line of task-state.ts with the noun "photo removal", for example "Google did not accept this photo removal. Nothing changed on Google." The photo stays on Google and keeps its Remove from Google button.
- Refused because Kabsi did not put the photo on Google: "Kabsi did not put this photo on Google, so it cannot remove it. Remove it on Google itself."
- Undo too late: "Too late to undo: Kabsi already asked Google to remove it."
- The screenshot note (the photo check, a note, never a block; Approve all leaves the photo out and "Approve anyway" still works): "This looks like a screenshot. Google asks for photos of your business itself: the outside, inside, your team, your work."
- "What it shows" is now a set of tappable choices, nothing chosen for the owner, each with one line of help:
  - Outside: "Your front, as customers see it."
  - Inside: "The room your customers see."
  - Team: "You and the people you work with."
  - At work: "Your team doing the work."
  - Product: "Something you make or sell."
  - Food and drink: "A dish or a drink you serve."
  - Menu: "Your menu, easy to read."
  - Other: "Anything else about your place."
  - Then, below a line: Preferred cover photo: "A wide photo works best." and Logo: "A square one works best." (the existing advice; the size advice of roleIssue still shows once chosen).
- Approve pressed before a kind is chosen: "Choose what the photo shows first."
- A photo still being checked has its own card: "Checking your photo. About a minute." (was one line for all, "Kabsi is checking [n] photos. This takes a minute.").
- The state track on a narrow card shows "Approved", "Sent" and "Live"; screen readers hear "Approved", "Sent to Google" and "Live on Google". Wider cards show the full names as before.
- Tapping a photo opens it full size: the title is the kind ("At work photo", or "Your photo"), with "The photo as Kabsi sends it to Google."

## 45. Polish 4: shorter Home and How it works, with yellow used well (4 Nov 2026, master plan 30.25 item 3)

The rule for every marketing section: a headline of at most 8 words, one line of at most 20 words, then a picture or at most three short points. WHATSAPP_LAUNCH_LINE shows once under the hero (Home and How it works) while WHATSAPP_ON is false. Yellow goes to the main action, the hero bar, the second sentence of a headline on a charcoal band and numbered markers (charcoal on yellow); never yellow text on ivory or white. Every line below is checked against knowledge/kabsi-facts.md (facts 04, "Home and How it works shorter").

### Home

- Steps line: unchanged words; the numbers 1 to 5 are yellow markers.
- Profile watch: headline unchanged. Line (was 27 words, named the channel): "Kabsi checks your Google profile every day. When something differs, you choose, and nothing changes without your yes." The Example card stays (What Google shows, What you told Kabsi, the question with Use my hours and Keep Google's). Removed: the step rail and the three rules (Keep my information, Google is right, Never by itself); the card and the line carry them.
- Photo to post (charcoal band): label "On WhatsApp" (charcoal on yellow); headline "Send a photo." with "Get a Google post." in yellow; line "Send it with a line about it. Kabsi writes the post and asks for your yes."; points 1 "Send a photo and a line", 2 "Read the post", 3 "Say yes. It goes on Google." (yellow markers). The phone stays. Removed: the step rail, "A photo with no words becomes a photo on your Google profile, also after your yes." (still true, in the facts), the posts-per-plan line (Pricing has it), the launch line. The same band on /for/hair-salon follows.
- Supporting row: visible headline "Replies, holidays and a weekly report." (was screen reader only); "A reply for every new review" / "In the review's language. Yes, Edit or Skip."; "Holiday hours, asked in time" / "Five days before a bank holiday."; the weekly report card (Example) without its line.
- Where you show up: unchanged headline, line and At launch label; removed the map's explanation line (the legend says what each mark means); the AI answer's sources show from 640 px.
- You stay in control: three points (was five): "Manager access, no password" / "You add Kabsi as a Manager and stay the owner."; "Nothing goes live without your yes" / "Not a reply, not a post, not an hours change."; "Remove Kabsi any time" / "One step in your Google profile." (explanations from 640 px). The independence line stays in the footer.
- Pricing preview: one line under the cards, "Founding price $19 and $39 for the first 30 paying businesses." (was one per card), only while places remain; the rest unchanged.
- Founder band: quote "A Google profile needs work every week. I built Kabsi to do that work for you." (was 30 words); "Founding 25." with "Three months of Kabsi Pro, free." in yellow; "By application, no card. After 90 days you choose a plan or stop. Nothing is charged by itself."
- Hero, Pick your business, the four questions and "Start with a free check." unchanged.

### How it works

- Hero: visible line "Three Example cases at an invented salon: different hours, a photo to a post, and a new review." (was 25 words); the launch line under the hero while WHATSAPP_ON is false (moved from the demonstration). Meta description (LATER row): "Three Example cases at an invented salon in Bristol: hours changed on Google, a photo turned into a post and a new review, from your yes to live on Google."
- Demonstration: "Pick a case and tap the main button. Each state shows as it happens." (the state names show in the track).
- Getting started: yellow number markers; "About 30 seconds, no access needed."; "In your Google profile: Business Profile settings, People and access, Add. Paste <group ID>, keep Manager, then Add. No password, and you stay the owner."; "Replies for your older reviews, ready for your yes. Your 14 days start when access works."
- "You stay in control.": the three points above.

### Nora on phones (Polish 4 part B, master plan 30.25 item 4)

- Her lone round button below 640 px: "Ask Nora, Kabsi's assistant" for screen readers (the same words as her button in the phone bar). From 640 px the launcher is unchanged: "Chat with Nora".
- The phone sheet's header: "Nora, Kabsi's assistant" (was "Nora from Kabsi", which stays on a computer), the line under it and "Close the chat" unchanged.

## 46. App 3: the signed-in website on the Design 9 system (4 Nov 2026, master plan 30.26 item 5)

No wording changes on the signed-in screens except the lines below; every other line keeps its current words. The visual system (type, colour, chips, the shared state track) is in DESIGN.md, section "The signed-in website on Design 9". Each part of App 3 adds the lines it ships here, checked against knowledge/kabsi-facts.md.

### Part A: Posts and photos, and the shell

- Photos, a ready photo's card: the heading is "1 photo is ready" when one photo waits, and "Photo [n] of [total]" on each card when several wait ("[n] photos are ready" with Approve all stays above them, as before). The line under the heading on a photo with no note: "Kabsi checked it and removed the location data." (the several-photo line "Kabsi checked them and removed the location data." is unchanged).
- "What it shows" (Outside, Inside, Team, At work, Product, Food and drink, Menu, Other) as chips, then on its own line "Use as" (new label) with "Preferred cover photo" and "Logo". The one help line under them is the chosen chip's line from section 44; before one is chosen it reads "Choose what the photo shows first." (section 44's line, now shown as the prompt). Approve photo waits until a kind is chosen.
- The state track (every task, every photo tile, and How it works): "Approved", "Sent to Google", "Live on Google", or "Did not go through" in place of "Live on Google" when Google says no. Replaces section 44's narrow-card names ("Approved", "Sent" and "Live"): on a narrow card the three states now stack, one line each, with their full names.
- Posts: "Kind of post" (screen readers only), "Button" and "Posts a month" are the chip groups' labels (were the radio group's label, the dropdown's label and "Posts a month:").
- The business sheet, opened from the business at the top of the menu (or the business name in the phone top bar): title "Your businesses"; line "Tap a business to open it."; each business with its status (the existing words: "Active", "Setup not finished", "Waiting for Google access" and the rest, "Example" on the demo business); the open one carries a tick with "Open now" for screen readers; then "Continue setup" (while setup is not finished) and "Add another business" (unchanged). Retired: the dropdown's "Switch business" label.

### Part B: Home and Reviews

No new words. Home: on a computer, Needs attention and Needs your yes on the left, Done by Kabsi this week and Your business on Google on the right (only when either has something to show; otherwise the left side takes the full width, part C); the section counts are charcoal-on-yellow markers; each Done row shows its words on up to two lines with its pill under them when space is short (was cut on one line). Reviews: each card's heading at the card heading size, the review at the lead size; "Report this review"'s labels in sentence case (were capitals).


### Part C: Google profile, Settings, onboarding and log in

No new words. Settings, Team: each person's role (Owner, Manager, Staff) and the invitation's Role (Manager, Staff) are chips (were dropdowns; "Role of [email]" stays the screen reader label). Settings, notices: each kind's "Email" timing is chips (was a dropdown). The daily email time (24 hours) and the time zone stay dropdowns (more than eight options). Small labels on Where you show up, Reports, Get reviews, Business knowledge and onboarding are 15 px and in sentence case (one was in capitals). Log in already uses the Design 9 shell (Web 5) and is unchanged.

## 47. Fix 2: trust fixes, the photo approval binding and the AI answer made clear (4 Nov 2026, master plan 30.27 item 2, R-107)

Every line is checked against knowledge/kabsi-facts.md. Each part adds the lines it ships here.

### Part A: trust fixes

- The Example free check result (src/components/kabsi/d8-data.ts EXAMPLE_RESULT, drawn by result-preview.tsx on the free check's start page): "Most important" now reads "Google shows no photos for this business." with "Kabsi asks for photos from your phone and prepares them for you to approve." (the free check's own line; was "No opening hours are shown on Google.", which contradicted the AI answer's Saturday closing time). The rows: "Saturday" "09:00 to 18:00", "Website" "Shown", "Phone" "Shown", "Reviews" "38" (was "Photos" "23": the check counts photos only up to 10). The AI line is unchanged: "ChatGPT's answer gives your closing time on Saturday as 17:00. Your Google profile says otherwise." Screen readers: "An Example free check result for an invented salon: no photos on Google, Saturday 09:00 to 18:00, website and phone shown, 38 reviews, and an AI answer that gives 17:00 for Saturday."
- Every other Example checked for the same kind of contradiction, none found: the hero phone (hours, post, review), the weekly report card ("Add 3 photos of the team at work." for a connected business), Where you show up (the map sample and the late-appointments answer), How it works' three cases, the hair salon page, the review link tool's sample card, and the Example free check rows on the hair salon, barbershop, nail salon and restaurant pages (they show no AI answer, so their own first findings stand).
- The review link and QR code page (src/components/kabsi/d2-tools.tsx): the closing section reads "See what Google shows about you." then "The free check reads your Google profile and names the one thing to do first." above the scan box (was "Want to see where you rank too?"; the free check does not rank).
- /setup-call (src/routes/setup-call.tsx), no booking calendar: H1 "Get help setting up."; line "Rashid, who runs Kabsi, helps you set up by email. You add Kabsi as a Manager yourself, with each step explained."; three numbered points "Write to hello@kabsi.co" / "Your business name and city, and the step where you are stuck.", "Rashid replies with your steps" / "By email. If a free 20-minute call helps, he sends you times for one.", "You click, he explains" / "No password and no codes. You stay the owner of your Google profile."; the button "Email hello@kabsi.co" (subject "Help with Kabsi: [topic]"); the side note "We never ask for your Google password, and we never sign in to your Google account: you send the Manager invitation yourself." and the existing "Calls run Monday to Friday, 8am to 6pm Beirut time. The call is about: ..." line; the WhatsApp line only while WHATSAPP_ON. Removed: "Book a setup call.", "Pick a time by email", "The booking calendar is on its way. Until then, write to hello@kabsi.co and a person replies with times." Page title "Help setting up Kabsi | Kabsi". The address stays, because emails, the FAQ and onboarding link to it.
- FAQ "Can I book a setup call?" (src/lib/faq.ts): "Yes. Email hello@kabsi.co (kabsi.co/setup-call says how). Rashid, who runs Kabsi, replies with your steps, and with times for a free 20-minute call, Monday to Friday, 8am to 6pm Beirut time, when a call helps. We guide you, you click, and we never ask for your Google password."

### Part C: the AI answer, made clear

- FAQ (src/components/kabsi/faq-data.ts, group "Google and control"; facts 13): "Can Kabsi make my business appear in ChatGPT?" / "No one can promise that. Kabsi checks selected questions on ChatGPT and Perplexity directly, which can differ from what their apps show. It shows whether your business was named and which sources were cited. When an answer states a fact differently from what you confirmed, such as your hours, phone or address, Kabsi opens a task: to fix it on your Google profile, where Kabsi can, or to tell you what to check on your website or another site that lists you, where it cannot." then, while NEARBY_ON is false, "The AI answer opens at launch."
- FAQ: "How is the nearby check different from the AI answer?" / "The nearby check searches Google Maps from places around your business, like a customer standing there, and shows where you came up. The AI answer asks ChatGPT and Perplexity questions a customer might ask, and shows whether they name you and what they say about you."
- Pricing, each card (src/components/kabsi/plans.ts PLAN_CHECKS, equal to plan_limits() in the database): a small heading "Where you show up" with the At launch pill while NEARBY_ON is false, then "The nearby check on Google Maps: 1 search, every month" and "The AI answer on ChatGPT and Perplexity: 3 questions, every month" (Essentials), "5 searches, every week" and "10 questions, every 2 weeks" (Pro).
- Pricing, the comparison: two rows, "The nearby check on Google Maps" and "The AI answer on ChatGPT and Perplexity", each with the At launch pill while NEARBY_ON is false, with the same allowances. Under the table, while NEARBY_ON is false: "Only what Kabsi does today, and the two checks marked At launch. More checks come later." (with it true, unchanged: "Only what Kabsi does today. More checks come later.").
- Home: Where you show up now comes straight after "Send a photo. Get a Google post.", before "Replies, holidays and a weekly report.". Its AI half's heading is "What AI says about you." with "An answer customers might see" under it (was the heading); the Example badge, the question, the assistant, the date, the answer, the sources and the API label are unchanged.
- Signed in: no new words. The AI answer finding on Home (Needs attention) and in the report shows its next step as a button to the screen of the task it opened, with the same words on both (Check your hours, Check your Google profile, Check your business details: section 37); a test holds the report's button, Home's button and the database's task path together.

### Part D: two guides (src/lib/guides.tsx, in the guides list and the sitemap, indexed)

- "Why ChatGPT might describe your business wrongly, and what to check" (/guides/why-chatgpt-describes-your-business-wrongly, 4 Nov 2026, 4 minutes). Summary: "ChatGPT and Perplexity answer from web pages they find, and cite some of them." / "An old page or another site that lists you can carry an old closing time or phone number." / "Check the sources the answer cites, then your Google profile, your website and the other sites." / "No one can make an assistant say something. You can make sure what it reads is right." Sections: "Where the answers come from", "Why a detail can be wrong" (An old page, Another site that lists you, Two versions), "What to check, in order" (five steps), "What no one can promise", "Using Kabsi?" (with "The AI answer opens at launch." while NEARBY_ON is false). Sources: OpenAI, Searching the web with ChatGPT; OpenAI, Web search (API guide); Perplexity, API overview; Google, Guidelines for representing your business on Google.
- "Keep your hours and details the same everywhere" (/guides/keep-your-hours-and-details-the-same-everywhere, 4 Nov 2026, 4 minutes). Summary: "Customers read your details in many places: your Google profile, your website and other sites." / "Write your name, address, phone and hours the same way everywhere." / "When something changes, change your Google profile first, then your website, then the rest." / "For a holiday, set special hours instead of changing your normal week." Sections: "The details to keep the same" (Your name, Address and phone, Opening hours, Your website), "When something changes" (four steps), "Holidays and short closures", "Using Kabsi?". Sources: Google, Guidelines for representing your business on Google; Edit your Business Profile; Edit your business hours; How to set special hours.
- The guides list's meta description adds "keeping your details the same everywhere, and why ChatGPT might describe your business wrongly".

## 48. Go live 1: lines removed or changed (5 Nov 2026, master plan 30.28)

WhatsApp for owners, the nearby check and the AI answer are switched on (R-108), so every At launch label and every "opens at launch" or "from launch" line goes. "Card payments are coming" and every payment line stay exactly as they were. Each line below is old, then new, then the file.

### Removed

- "WhatsApp opens at launch. Until then you approve on kabsi.co." (WHATSAPP_LAUNCH_LINE): removed with the constant, from the Home hero (d9-hero.tsx), How it works (how-page.tsx), About (d8-about.tsx, after the founder's name), the FAQ's Talk to a person box (d8-faq.tsx) and the old Design 6 Home (d6-home.tsx, used by no route). Nothing replaces it.
- The "At launch" pill: removed from Home's Where you show up heading (d9-home-lower.tsx, d9-data.ts), the two Home jobs "See where you show up nearby" and "Know what AI assistants say" (d8-data.ts), each Pricing card's "Where you show up" heading and the comparison's two check rows (d8-pricing.tsx), the free check page's "What ChatGPT says" row (d4-free-check.tsx), and the Example result's "An answer customers might see" (result-preview.tsx). The NEARBY_ON switch is gone (src/lib/site.ts).
- "Where you come up nearby opens at launch." at the end of the FAQ answer "Can Kabsi promise where I come up on Google Maps?" (faq-data.ts): removed; the answer ends "what you can do next."
- "The AI answer opens at launch." at the end of the FAQ answer "Can Kabsi make my business appear in ChatGPT?" (faq-data.ts) and of the guide's "Using Kabsi?" box (guides.tsx): removed.
- "Opens at launch" (the old Design 6 nearby section, d6-home.tsx, used by no route): removed.
- The free check result's two At launch cards (scan-live.tsx, A2): no pill; when the check is not available today both parts are left out, with no line.

### Changed

- Pricing, under the comparison (d8-pricing.tsx): "Only what Kabsi does today, and the two checks marked At launch. More checks come later." becomes "Only what Kabsi does today. More checks come later."
- Home, Where you show up (d9-data.ts): "Two checks Kabsi runs from launch, shown as they are. No score." becomes "Two checks Kabsi runs, shown as they are. No score."
- FAQ, "Can I approve a reply or a post on WhatsApp?" while the number is not set (faq-data.ts): "Not yet. WhatsApp opens at launch. Until then you approve on kabsi.co." becomes "You approve on kabsi.co or from the email." With the number set (today) the answer is unchanged: "Yes. Kabsi sends each reply or post to you on WhatsApp, and nothing goes live on Google until you say yes. A change to your address, phone or business name is confirmed on kabsi.co instead."
- FAQ, "Does Kabsi have a WhatsApp number?" while the number is not set (faq-data.ts): "Yes. It is being tested and opens to owners at launch. Until then write to hello@kabsi.co, and a person answers, not a bot." becomes "Write to hello@kabsi.co, and a person answers, not a bot." With the number set (today) the on answer gives the number.
- Kabsi Partners (d2-partners.tsx, hero-lines.ts): "Kabsi Partners opens at launch." becomes "Kabsi Partners opens when card payments open."
- Partner terms (partners_.terms.tsx): "Kabsi Partners opens at launch; until then nothing here is paid." becomes "Kabsi Partners opens when card payments open; until then nothing here is paid."
- The old Design 6 nearby section (d6-home.tsx, no route): "It is part of the free check once it opens. No access needed." becomes "It is part of the free check. No access needed."
- /terms (terms.tsx, what Kabsi does): "From launch, shows where your business appears on Google Maps around it and in AI answers, next to the competitors you pick, using data from other companies (section 6)." becomes "Shows where your business appears ..." (rest unchanged).
- /privacy (privacy.tsx): "From launch, if Kabsi checks where your business shows:" becomes "If Kabsi checks where your business shows:"; "From launch, if you apply to Kabsi Partners:" becomes "If you apply to Kabsi Partners:"; "From launch, to see what AI assistants say about your business, ..." becomes "To see what AI assistants say about your business, ..."; "Nora's answers and, from launch, checking the facts ..." becomes "Nora's answers and checking the facts ..."; "From launch, DataForSEO: ..." becomes "DataForSEO: ..."; "From launch, Geoapify: ..." becomes "Geoapify: ..."; "From launch, Meta, for the Meta Pixel and the Conversions API: ..." becomes "When switched on, Meta, for the Meta Pixel and the Conversions API: ..."; "From launch, a speech to text provider ..." becomes "When switched on, a speech to text provider ..."; "From launch, the Meta Pixel runs on our public pages only, ..." becomes "When it is switched on, the Meta Pixel runs on our public pages only, ..."; "Visibility Map and AI Visibility results, and the competitors you pick (from launch):" loses "(from launch)"; "WhatsApp voice notes (from launch):" becomes "WhatsApp voice notes (when switched on):"; "Voice notes. You can send Kabsi a voice note instead of typing. From launch, the audio goes ..." becomes "Voice notes. When voice notes are switched on, you can send Kabsi a voice note instead of typing. The audio goes ..."; the marker note '"From launch" marks a company that starts handling data when the feature that uses it is switched on. We list it now so this page is complete before that day.' becomes '"When switched on" marks a company that starts handling data only when the feature that uses it is switched on. We list it now so this page is complete before that day.'

### Changed earlier in Go live 1 (parts A1 and A2)

- Every WhatsApp button, link and line follows the one setting, now "+1 205 745 6874": the email footers and the four auth emails gain "Questions? Message us on WhatsApp +1 205 745 6874." (plain text: "Questions? WhatsApp +1 205 745 6874.").
- Onboarding's "Get your reviews on WhatsApp" card: "WhatsApp: coming soon" becomes the Connect WhatsApp button (it follows the setting).
- Signed in, Where you show up, a failed check (insights.tsx): the title "Your first check did not finish." becomes "The check runs again later."; the line "Kabsi tries again on its own. Nothing changed on Google." stays.
- The facts and Nora: "Kabsi has a WhatsApp number ... in testing ... so do not give the number yet" becomes "Kabsi's WhatsApp number is +1 205 745 6874."; approvals and alerts on WhatsApp are live for owners who connect it; the Visibility Map, AI Visibility and Nearby places are live; when DataForSEO refuses, the free check leaves the nearby and AI parts out, with no error and no promise.

### Changed in Go live 1 part B (audit fixes, branch claude/golive1-b1)

- FAQ, "What does Kabsi cost?" (faq-data.ts, B-022): "Both plans are free for 14 days, with no card." becomes "The trial is 14 days of Pro, one per business, with no card."
- FAQ, "Does Kabsi have a WhatsApp number?" with the number set (faq-data.ts, B-024): "Yes. Message Kabsi on WhatsApp, or write to hello@kabsi.co." becomes "Yes, [WHATSAPP_NUMBER]. Message Kabsi on WhatsApp, or write to hello@kabsi.co." (today "Yes, +1 205 745 6874. ...").
- /privacy, the Meta Pixel (answers question 2 below; VITE_META_PIXEL_ID is set in production): the processor line loses "When switched on"; "Advertising: we use no advertising cookies today and don't track you on other sites. When it is switched on, the Meta Pixel runs on our public pages only, never inside the app, ..." becomes "Advertising: the Meta Pixel runs on our public pages only, as your choice below allows, and stores Meta's own cookie in your browser. It never runs inside your Kabsi account, ...". The consent sentences are unchanged. Voice notes keep "when switched on".
- /privacy, "app" (B-027): "the website, the Kabsi app," becomes "the website, your Kabsi account on kabsi.co,"; "from the app or an email link" becomes "from your Kabsi account or an email link"; "When you visit the website or app:" becomes "When you visit the website:"; "hosting the website and app" becomes "hosting the website and your Kabsi account"; "Preferences: the app remembers" becomes "Preferences: the website remembers"; "never inside the app" (statistics and advertising) becomes "never inside your Kabsi account"; "You can do most of this in the app." becomes "You can do most of this in your Kabsi account." Google's Limited Use sentence ("any other app") stays word for word.
- /setup-call (B-033): "The call is about: Setting up my Google profile, Partner or agency, Something else." becomes "In your email, say what the call is about."
- The free check, a 4xx from profile-snapshot (scan-live.tsx, B-018): "The check did not run" and the server's own message, without "Something went wrong on our side." A 5xx keeps it.
- Nora, a failure with no message from the server (assistant-widget.tsx, B-036): "Something went wrong." becomes "Nora could not answer. Try again, or write to hello@kabsi.co."
- /partners (d2-partners.tsx, B-028): "Share your page or check a business for them" / "Send your own page, ..." become "Share your link or check a business for them" / "Send your own link, ..."; "Your own page and QR code" becomes "Your own link and QR code"; the Example card "Your partner page" / "kabsi.co/p/sam" becomes "Your partner link" / "kabsi.co/?via=SAM". There is no /p page (section 11 is not built).

### Changed in Go live 1 part B (audit fixes, branch claude/golive1-b2)

- /for/hair-salon and the /for hair salon card, job 1 (hair-salon.ts, B-015): "New services, with a price and a line each" / "... and Kabsi's Profile Coach lists what your profile is missing, services included." becomes "Services missing from your profile, listed" / "... Kabsi's Profile Coach lists the services your profile is missing, so you know what to add on Google." The FAQ's "Not yet" answer is unchanged.
- Page titles (B-017): /for/hair-salon "Kabsi for hair salons: Google posts, hours and review replies"; /for/nail-salon "Kabsi for nail salons: Google posts, photos and review replies"; /for/restaurant "Kabsi for restaurants: Google photos, hours and review replies"; /for/barbershop "Kabsi for barbershops: Google posts, hours and review replies"; the ChatGPT guide "Why ChatGPT describes your business wrongly | Kabsi" (its H1 is unchanged). The restaurant description says "your details checked daily" instead of "every day".
- /for and the group hubs, related links and the guides' business links (B-013): the dental clinic page is not linked while it is noindex and out of the sitemap.

### Questions for lane R

1. Kabsi Partners: is "Kabsi Partners opens when card payments open." the right wording (the partners page, the hero line, the partner terms and the facts)? Partner links earn nothing until payments open, so "at launch" was no longer true.
2. /privacy, the Meta Pixel: written "When switched on" because the session cannot see whether VITE_META_PIXEL_ID is set in Vercel. If the Pixel already loads on kabsi.co, the words go.
3. /privacy section 14 says the WhatsApp number is "answered by a person and not an automatic bot", while Nora answers visitors on WhatsApp from the facts (agent.ts). Which is the public line?

## 49. Scan 2: the free check made accurate and convincing (5 Nov 2026, master plan 30.29, R-109)

Every new or changed line of Scan 2, for lane R. Each line names its file.

### The AI answer card (scan-live.tsx; the lines come from the server, free-check.ts, so the page, the email and WhatsApp say the same)

- The question asked: "best [term] in [town], [country]" (for 3954W376 "best fast food restaurant in Boqaata, Lebanon"). The country is its English name.
- New, above the line: "We asked ChatGPT: '[question]'"
- Changed: "ChatGPT did not name you. It named A, B and C." becomes, by case:
  - "ChatGPT named you." (unchanged)
  - "ChatGPT did not name you. It named A, B and C, which Google Maps shows near you." (at most 3, in the answer's order, only businesses Google Maps shows near the business)
  - "ChatGPT did not name you. The businesses it named are not near you on Google Maps, so this answer does not reflect your area."
  - "ChatGPT did not name you." (no names)
- New: "Sources cited" with up to 3 lines "[domain], [title]", or "No sources cited."
- Changed: the label "One sample. AI answers change from run to run." becomes "Asked ChatGPT on [date], with web search. The ChatGPT app can answer differently, and answers change from run to run." A check from before Scan 2 keeps its label and has no question line.

### Names (free-check.ts, nearby.ts, nearby-image.ts)

- A nearby card whose first business has a name not in Latin letters: "[place], another business came first. You were [position]." (WhatsApp words) and "First: another business" (the WhatsApp image).
- A Geoapify name that is a shop or another business is not used: "Near Contessa Fashion" becomes "About [distance] [direction] of your [business type]".

### Send me this report (profile-snapshot.ts, scan-live.tsx; Scan 2 part B)

- The email, after the Google part, when the check finished: the heading "Where you come up nearby", the count line ("In the first 3 at [n] of 49 places Kabsi checked.") and the three cards in words ("Near your [business type] you came up [position] for '[term]'.", "[place], [business] came first. You were [position].", "[place], you came first."); the heading "An answer customers might see", "We asked ChatGPT: '[question]'", the AI line and "Asked ChatGPT on [date], with web search. ..."; then the link "kabsi.co/scan/[code]".
- New, when there is no finished check: "The nearby search and the AI answer were not part of this check."
- The WhatsApp report (the approved template, its second parameter): the profile line as today, then the count line, the AI line and "kabsi.co/scan/[code]", within 900 characters.
- New error for a report asked with another business's code: "That report is for another business. Reload the page and try again."

### The result page (scan-live.tsx; Scan 2 part C)

- What Kabsi found, the count: "[n] to fix, [m] already right" becomes "[n] to look at, [m] shown on Google"; with nothing missing, "Nothing to look at, [m] shown on Google". No "already right" anywhere.
- The hours row when hours are shown: "Customers see when you are open." becomes "Customers see your hours. Once connected, Kabsi checks they are right." Every other row keeps its words.
- Who comes up at the address: the fold "Who shows up around you" goes; the nearby section opens with "At your address on Google Maps", the line "At your address you rank [n] for '[term]'." and the three businesses with rating and review count, before the cards, at every width (and on the saved /scan/[code] page).
- The nearby section: the card first, "How to read it" under it at every width (no column beside the card). Its words are unchanged.
- A card whose first business is not shown: "Another business came first."

### Meta events (docs/EVENTS.md, no words a reader sees)

- A finished free check sends Meta the custom event FreeScanCompleted instead of Lead. Lead fires once when "Send me this report" is sent, and once when a Founding 25 application is sent.


## 50. Copy 3: the Go live 1 audit's copy decisions (5 Nov 2026, master plan 30.29 item 2, R-109)

Each line is old, then new, then the files, found by grep first. Where a line appears in the facts, Nora's rules, an email or the llms files, the same change was made there (facts: knowledge/facts/ 01, 02, 04, 06, 08, 09, 11, 13, then `node scripts/build-kb.mjs`). Part A of Copy 3 (branch claude/copy3-a).

- **B-001, Home hero line** (d9-data.ts D9_HERO_LINE, used by d9-hero.tsx only; facts 04): "Kabsi checks your Google profile every day, prepares the fixes, posts, photos and replies it needs, and brings each one to you on WhatsApp for a yes." (27 words) becomes "Kabsi checks your Google profile every day, prepares fixes, posts, photos and replies, and asks for your yes on WhatsApp." (20 words). No other page reuses it; the page description for search (HOME_LINE) is unchanged.
- **B-002, the steps strip** (d9-home.tsx, how-page.tsx, Pricing): no word change. It is a caption under the hero, with its five steps, exempt from the section rule of section 45 (8-word headline, 20-word line, at most 3 points). Section 45's rule applies to every other section.
- **B-003, Nora's icon circle** (assistant-widget.tsx: the launcher and the sheet header; site-chrome.tsx: the phone's round button and the wide button): the yellow circle behind her icon becomes ivory (`bg-kb-sand`, text `text-kb-black`, contrast 17:1 on both, AA). The phone bar's own Nora button has no circle and is unchanged. The sheet's Send button stays yellow (its main action).
- **B-004, the Example map** (d9-data.ts D9_SHOW_UP.map; d9-home-lower.tsx): "You came up in the first 3 at 3 of 8 places Kabsi checked." becomes "In the first 3 at 18 of 49 places Kabsi checked." and a caption "The map shows 8 of them." is added before "Sample Google Maps results, not customer counts."
- **B-007, Pricing's hero line** (hero-lines.ts PRICING_HERO; also the unused d4-home.tsx): "Each plan does the Google work for one business, and you approve every change. Prices in US dollars, plus tax where it applies." becomes "Each plan does the Google work for one business, and you approve every change." The tax line "Prices are in US dollars, plus tax where it applies." stays under the cards.
- **B-008, "Your weekly report"** replaces "Results Report" everywhere a reader sees it: plans.ts (the Essentials card "Your weekly report every Monday, with one next step" and the PLAN_ROWS row, now the same words), d6-home.tsx, whatsapp-channel.tsx ("Your weekly report on WhatsApp"), notification-choices.tsx, notification-categories.ts and notify-categories.ts (label "Your weekly report", noun "weekly report"), faq.ts, plan-choice.ts, retention.ts, terms.tsx, the signed-in Reports page title ("Your weekly report, 19 to 25 October", report.tsx and work-receipt.tsx), the email subject "<Business>: your weekly report for 19 to 25 October" and title (email/copy.ts), the renewal emails (copy.ts), the in-app title "Your weekly report is ready" (report.ts), Nora's rules (nora-rules.ts), the agent job line (ai/agents.ts), the facts (00, 01, 02, 03, 04, 05, 06, 13 and llms.txt), the Nora evaluation question (scripts/nora-eval/questions.ts), the kabsi-copy skill. Code identifiers keep their names (weekly_report, results-report). docs/email-previews rebuilt with Deno from npm.
- **B-009, the cancel answer** (faq-data.ts, Pricing's billing questions and /faq): "Yes, any time. Your plan runs to the end of the period you paid for." becomes "Yes, any time. Cancel on the Plan page or on WhatsApp, and your plan runs to the end of the period you paid for." (/faq adds "Yearly plans are refundable within 14 days."). The answer "Which cancel is which?" (with "Cancelling in Creem's own billing page ends the plan at once.") is removed from Pricing; the Creem portal line stays on the Plan page and in the facts only. /terms section 8 still names Creem's billing page (legal page, left as it was; a LATER row).
- **B-010, Pricing's buttons** (d8-pricing.tsx): Pro's "Start free" stays yellow (the trial is Pro); Essentials' "Start free" changes from the outlined button to the charcoal button (variant dark, ivory text).
- **B-011, the slim Founding 25 line** (founding-line.tsx): "[n] places left." becomes "[n] of 25 places left." with the real count (the total from the same call, 25 while it is unknown, no number while it loads).
- **B-014, the /for pages** (src/content/industries/*.ts, d8-industry.tsx): the hero line is at most 20 words on all 12 pages; the jobs headline is "Google jobs that come back." on every page (was "The Google jobs that come back for a [trade].", 4 pages and the fallback). "What people search for" and "Your Google profile, as a [trade] owner" stay long and are exempt (reading content for search). New hero lines:
  - auto repair: "Your jobs listed, your phone number and hours exact on Google, and calm replies drafted. You approve each one."
  - bakery: "Early opening hours right on Google, your cakes listed with a starting price, replies drafted. You approve each one."
  - barbershop: "Walk-in times, bank holiday hours, posts about new cuts and a reply for every review. You approve each one."
  - cafe: "Opening time exact on Google, the menu shown, your laptop rule in a post. You approve every draft."
  - dental clinic (noindex, unlinked): "Clinic hours, emergency line and appointment link right on Google, and careful replies you approve. No draft for treatment reviews."
  - gym and fitness: "Classes and trial offers as Google posts with real dates, holiday hours and replies drafted. You approve each one."
  - hair salon: "New stylists announced, colour work as posts, holiday hours asked in time and replies ready. You approve each one."
  - medical and aesthetic clinic: "Treatments, doctors' days and consultation link right on Google, and replies that never confirm a patient. You approve everything."
  - nail salon: "Seasonal designs as posts, your work photos checked, holiday hours asked in time and replies ready. You approve each one."
  - physiotherapy: "Physios, treatments and the assessment link right on Google, and replies that never name an injury. You approve each one."
  - restaurant: "Menu photos, dish photos, bank holiday hours and a reply for every review. You approve each one."
  - spa and massage: "Each treatment on Google with length and price, calm replies, holiday hours ready. You approve each one."
- **B-016, the industry pages' scan box** (scan-box.tsx, the hero and the closing box): "Kabsi searches for '[term]', like a customer." becomes "Kabsi searches '[term]' on Google Maps around you, like a customer."
- **B-023, the FAQ's free check answer** (faq-data.ts, "What does the free check keep?"): "If you ask for the result by email or join the waiting list, Kabsi keeps your email address too." becomes "If you ask for the result by email, Kabsi keeps your email address too." (The Save my place waiting list in mock mode is unchanged.)
- **B-025, the About quote** (d8-about.tsx): "I built Kabsi because local owners lose customers to a Google profile nobody has time to look after. ..." becomes "I built Kabsi because local owners have a Google profile nobody has time to look after. ..."
- **B-026, who answers on WhatsApp** (d8-about.tsx, d8-faq.tsx Talk to a person, setup-call.tsx, privacy.tsx section 14, terms.tsx sections 14 and 19, partners_.terms.tsx section 9, nora-rules.ts, facts 02 and 11): "A person answers." and "A person replies." about WhatsApp become "Nora, Kabsi's assistant, answers at once. Ask for a person and Rashid replies in working hours." (terms section 19 and the partner terms: "Rashid replies in working hours."). Lines about email ("write to hello@kabsi.co, and a person answers") are unchanged, and so are the plan cards' help lines for owners ("A person answers on WhatsApp the same working day." and the Pro line). tests/whatsapp-privacy.test.ts follows the new facts.
- **B-029, /partners** (d2-partners.tsx, hero visual and the calculator): the rate only. The line under the hero "Pro is $59 a month. You earn 25% of every payment, while the referred subscription stays paid." becomes "You earn 25 percent of what each referred business pays, for as long as it pays."; the Example card's badge "$14.75 a month / For each Pro business" becomes "25 percent / For each business that pays"; the earnings slider ("If 10 businesses you refer pay for Pro, you earn about $147.50 a month.") becomes a card "What you earn / 25 percent / Of what each referred business pays, for as long as it pays." The screen reader caption follows. No dollar earnings remain on the page. The title "Earn 25% of every payment." is unchanged.
- **B-030, /partners step 1** (d2-partners.tsx): "Apply on WhatsApp" becomes "Apply on WhatsApp or by email" (while WhatsApp is not set it stays "Apply by email").
- **B-032, one schedule** (setup-call.tsx, faq.ts, facts 02 and 13): "Calls run Monday to Friday, 8am to 6pm Beirut time." becomes "Working hours: Monday to Friday, 9:00 to 18:00, UAE time. Calls run in those hours." (WORKING_HOURS, src/lib/site.ts); the FAQ's "Can I book a setup call?" loses "Monday to Friday, 8am to 6pm Beirut time" and gains the same WORKING_HOURS sentence. No Beirut time remains on a public page.

### Not changed in this part (Known limits)

- /terms (cancel section) still names Creem's own billing page; B-009 asked for Pricing and the FAQ.
- dental-clinic.ts (noindex, unlinked) keeps "A person at Kabsi answers on WhatsApp the same working day." inside its Example chat.
- The old unused d4-home.tsx keeps "A person helps". No route uses it.

### Part B: the Scan 2 follow-ups (branch claude/copy3-b, master plan 30.30)

- **Where you usually come up** (supabase/functions/_shared/visibility/usual.ts, one function for the page, the email, WhatsApp's "The check:" fact and the image): the count line gains a second sentence from the 49 points, the middle position among the points where the business is in the first 20: "In the first 3 at 40 of 49 places Kabsi checked. Most places put you 3rd." (3954W376) and "In the first 3 at 5 of 49 places Kabsi checked. Most places put you 4th." (CFE4RMDN). When fewer than half the points have the business in the first 20: "In the first 3 at 12 of 49 places Kabsi checked. Most places did not put you in the first 20." A check stored before gets the sentence too, read from its points. The Home Example map does not carry it (it is an Example).
- **The Latin rule for the visitor's own text** (area.ts ownName and shownTerm; scan-live.tsx; profile-snapshot.ts; visibility/index.ts): the business's own name reads "Your business" on the result page, the saved page, the email (subject "Your business: your Google Profile Check", body and text), the WhatsApp text and the image when it is not in Latin letters; the name still goes to the provider as typed. A term the visitor typed that is not in Latin letters is replaced by the Google category in lower case; if that is not in Latin letters either, the AI part is left out and the nearby part uses the industry page's term; with neither the check shows the existing unavailable state (no line). The result page's "Searched as '[term]'" follows the same rule.
- **addressComponents** (google/places/live.ts SNAPSHOT_FIELD_MASK): no words. The town is the locality, else the postal town, else the first administrative area below the country; the formatted address stays the fallback.
- **The speed gate** (scripts/lighthouse-gate.mjs, ci.yml, lighthouse-live.yml): no words a reader sees. Budgets: CI Home 205, Pricing 215, /scan 235 KB; live Home 215, Pricing 225, /scan 245 KB.


## 51. App 4: the website and the dashboard, how long a sign-in lasts, the log in page (5 Nov 2026, master plan 30.31, R-111)

### Part A: moving between the website and the dashboard (branch claude/app4-a)

- **The website header and phone menu** (site-header.tsx): "Log in" while this browser holds no session; "Dashboard" while it does (to /app, or /staff for Kabsi staff). The server render shows neither word, in the space both take.
- **The dashboard logo** (app-layout.tsx, the desktop sidebar and the phone header): a link to Home with the label "Kabsi website". The menu's "Home" stays the dashboard's Home.
- **After Log out** (site-chrome.tsx, under the header on Home): "You are signed out."
- **Start free while signed in**: the free check result's "Start free" opens /start and Pricing's "Start free" opens /app, without the log in page. No word change.

### Part B: how long a sign-in lasts (branch claude/app4-b)

- **The log in page after time away** (login.tsx, above the sheet): "You were signed out after 30 days away. Log in again." and, on a staff page, "You were signed out after 12 hours away. Log in again."
- **Settings, Your account** (settings.tsx): the line "You stay signed in on this device for 30 days after your last visit." after the code line; the button "Sign out of all devices" becomes "Sign out on every device"; the confirm reads "Sign out on every device?" / "This signs you out on every phone and computer, this one too. You can log in again with a code." with "Stay signed in" and "Sign out on every device" ("Signing out" while it works). After it, Home says "You are signed out." The card now shows before a business is added too.
- **/privacy section 7** (privacy.tsx): the Sign-in item adds "You stay signed in on a device for 30 days after your last visit, and each visit starts the 30 days again; Kabsi staff pages sign staff out after 12 hours without use. To know when you last visited, your browser keeps the time of your last visit, on this device only. Settings has Sign out on every device."
- **Facts 11**: the same rule, the lines, Sign out on every device, and that the times are enforced in the app until Supabase Pro.

### Part C: the log in page (branch claude/app4-c)

- **Lines above the sheet** (login.tsx): "Google sign-in did not finish. Use the email code below, or try Google again." (Google cancelled or refused, with the email field ready); "Your session ended. Log in again." (after the session-ended screen); the two time-away lines of part B.
- **While a signed-in person is sent on**: "Opening your dashboard."
- **The quiet panel** (from 1024 px, beside the sheet): "You stay the owner of your Google profile." "Kabsi never asks for your Google password." "Nothing is published without your yes." Then "An approval on WhatsApp" over the Example phone with the review message (Yes, Edit, Skip). The panel's heading for screen readers: "Why owners trust Kabsi".
- **In-app browsers** (sign-in-panel.tsx): the email form first; under it "Continue with Google" (not available) with "Google sign-in does not work inside this app. Open kabsi.co in your browser to use it." and "Copy the link" ("Link copied").
- **The countdown**: "You can ask for a new code in 42 seconds." (was "in 42s").
- **Errors** (src/lib/sign-in-errors.ts): "That code did not work. Check it, or send a new one." (wrong); "That code has expired. Send a new one." (sent more than 10 minutes ago); "Wait 42 seconds, then try again." or "Wait 5 minutes, then try again." (Supabase's 429 with a time) else "Too many tries for now. Wait a few minutes, then try again."; "You are offline. Check your connection, then try again."; "Kabsi can't be reached right now. Try again in a minute." (also for the code request, replacing "We couldn't reach Kabsi. Check your connection and try again."). The code request's own limits keep their words from the auth-code function.
- **/staff for a session that is not staff**: the not-found page ("This page is not here."), replacing "This page is for the Kabsi team only."

### Part E: the audit's word fixes (branch claude/app4-e, docs/app4/audit.md)

- **E-01, Plan** (plan.tsx): "When the trial ends without a plan, reply drafts, Google Protection and the Results Report pause." becomes "... and your weekly report pause."; "Reply drafts, Google Protection and the Results Report are paused until you choose a plan." becomes "... and your weekly report are paused until you choose a plan." (B-008).
- **E-04**: a page still loading is titled "Kabsi" until it sets its own title.
- **E-05, /staff when the staff check does not answer**: "This page did not load." with "Nothing you did. Try again in a minute." and Try again.
- **E-02, /staff validation figures with nothing to show**: "No data".
- **E-07, the setup header**: the wordmark reads "Kabsi" (was "kabsi").

## 52. Industries 2: every industry page on Design 9, one list of industries, nine new industries (5 Nov 2026, master plan 30.32)

Every line is checked against knowledge/kabsi-facts.md and the never-say lists (COPY 0.1, master plan 30.15 section 1, K-144); every business, person and number on these pages is an invented Example. Part B (branch claude/industries2-b): the template, /for and the twelve existing pages. Part C adds the eight new pages.

### The template (d9-industry.tsx)

- Label pills (charcoal on yellow): "Profile watch", "On WhatsApp" (Home's), "For [plural, lower case]", "Businesses" (/for).
- Headlines on a light background, each with one phrase on the yellow bar: "What Kabsi watches for a [trade]" (bar: "watches"), "Google jobs that come back." (bar: "come back."), "Where you show up" (bar: "show up") with "Two checks Kabsi runs, shown as they are. No score.", "What people search for" (bar: "search for"), "Your Google profile, as a [trade] owner" (bar: "Your Google profile"), "Two plans. The work comes first." (bar: "The work comes first.", industry pages only), "Questions [trade] owners ask" (bar: "Questions"), "Read next." (bar: "next.") with "Businesses like yours", "Start with a free check." (bar: "free check", industry pages and /for).
- The watch Example: "What Google shows", "What you told Kabsi", the buttons "Keep my information" and "Google is right" (the product's own words, facts 04, Google Protection). Screen reader caption: "Example: for an invented [trade], Google shows [detail] as [value], the owner told Kabsi [value], and Kabsi asks on WhatsApp with Keep my information and Google is right. Nothing changes without the owner's yes."
- The photo band keeps Home's lines (section 45) with the trade's own Example post; caption "Example: the owner sends a photo with the line '[line]' on WhatsApp, Kabsi prepares the Google post '[post]' with that photo, the owner approves it, and it goes from Approved to Sent to Google to Live on Google."
- The nearby Example: "Searched: [term], 2 Nov 2026", "Near your [kind] you came up 2nd for '[term]'.", then Home's "In the first 3 at 18 of 49 places Kabsi checked." and "The map shows 8 of them. Sample Google Maps results, not customer counts."
- Removed from the industry pages: the Design 8 hero message card, the five-task list (kept as reading text where Content 1 wrote it, "The Google work of a [trade]"), "What the free check shows for a [trade]", "You stay in control" and "Related trades" with "Every kind of business".

### /for

- Title "Google Business Profile help for local businesses | Kabsi"; description "Kabsi does the Google Business Profile work for local businesses: replies, posts, photos, hours and details kept right. Find yours, or check it free."
- H1 "Your kind of business, taken care of." (bar: "taken care of."); line "Each kind of local business has its own Google work. Find yours, or start with the free check."; the scan box.
- "Pick your business" (bar: "your business") with the label "Businesses"; the filter: label "Find your kind of business", placeholder "For example, florist"; for screen readers "[n] of [m] kinds of business shown."; with no match "No match for '[text]'. Kabsi works for any local business with a Google profile."
- "Not on the list?" (bar: "the list?") with "Kabsi works for any local business with a Google profile." and the scan box.
- Removed: "The Google work your kind of business has." and its line, "Four trades, four different weeks", "More kinds of business", "By kind of business", and the nine group pages with their names and leads.

### Each page (part B)

**/for/hair-salon** (query: "hair salon Google Business Profile")
- Title "Hair salon Google Business Profile help | Kabsi"; description "Kabsi looks after your hair salon Google Business Profile: a reply for every review, new stylists announced, colour work posted, holiday hours asked in time."
- H1 "Your salon on Google, taken care of." (on the bar: "taken care of."); line "Kabsi looks after your hair salon Google Business Profile: replies, colour posts, holiday hours and stylists, each for your yes."; /for card "Stylists thanked by name, colour work as posts."
- Answer paragraph: "Kabsi does the weekly work of a hair salon Google Business Profile for you. It drafts a reply to every new review and passes the thanks to the stylist the client named, turns a photo of your colour work into a post, asks about bank holiday hours five days ahead, and checks your details every day. Nothing goes on Google until you say yes."
- Watch (Example, Hollis Hair, Bristol): "Clients check your hours and booking link before they come. Kabsi compares them with what you told it, every day." Details: Opening hours, Special hours, Website, Phone, Main category, Description. Website: Google "Old booking page", you "New booking page". Message "Google shows your old booking page as your website. You told me the new one."
- Post (Example): the owner sends "Amber joins us for colour and balayage. Booking from Tuesday."; Kabsi prepares "New to the team: Amber, colour and balayage. Book with her from Tuesday."
- Jobs: "A reply for every review" / "A review that names Amber gets a reply that thanks Amber, using only the names on your team list."; "Colour work, as posts" / "Send the photo with a line. Kabsi writes the post and checks the photo first."; "Bank holiday hours" / "Five days before each bank holiday, Kabsi asks what you will do and sets it once you say yes."
- Nearby (Example): "Near your salon you came up 2nd for 'hair salon'."; AI (Example): "Which hair salon in Clifton, Bristol does balayage on Saturdays?" / "Hollis Hair on Gloucester Road does balayage and is open on Saturdays from 9 am."
- Fifth question: "How does Kabsi know what my salon is like?" / "You tell it once, in About your business: services, team, hours and anything it should never say. Every draft uses those facts."

**/for/barbershop** (query: "barber shop Google Business Profile")
- Title "Barber shop Google Business Profile help | Kabsi"; description "Kabsi looks after your barber shop Google Business Profile: walk-in hours right, bank holidays asked in time, new cuts posted and a reply to every review."
- H1 "Your barber shop on Google, kept sharp." (on the bar: "kept sharp."); line "Kabsi looks after your barber shop Google Business Profile: walk-in hours, fresh cuts as posts, a reply to every review."; /for card "Walk-in hours right, fresh cuts as posts."
- Answer paragraph: "For a barber shop Google Business Profile, the work is small and constant: hours that match the door, a reply to every review, and photos of fresh cuts. Kabsi drafts each reply and names the barber only when the review does, turns your photos into posts, asks about bank holidays in time and checks your hours every day. You approve each one."
- Watch (Example, Fade and Co, Leeds): "Walk-in customers trust the hours Google shows. Kabsi compares them with yours every day and asks before anything changes." Details: Opening hours, Special hours, Phone, Address, Open status. Saturday: Google "Closed", you "08:00 to 18:00". Message "Google shows you closed on Saturday. You told me 08:00 to 18:00."
- Post (Example): the owner sends "Skin fade and beard trim from this morning. Walk-ins until 6 today."; Kabsi prepares "Fresh skin fade and a sharp beard trim. Walk in until 6 today."
- Jobs: "Replies that name the right barber" / "Only when the review names him, and only names on your team list."; "Fresh cuts, as posts" / "A photo from the chair becomes a post. Kabsi checks the photo first."; "Walk-in hours that match the door" / "Kabsi checks your hours daily and asks before each bank holiday."
- Nearby (Example): "Near your shop you came up 2nd for 'barber'."; AI (Example): "Which barber near Leeds city centre takes walk-ins on Saturday?" / "Fade and Co on Call Lane takes walk-ins on Saturdays from 8 am to 6 pm."
- Fifth question: "Can Kabsi post our prices?" / "Only prices you give it, in a post you approve. Kabsi never invents a price or an offer."

**/for/nail-salon** (query: "nail salon Google Business Profile")
- Title "Nail salon Google Business Profile help | Kabsi"; description "Kabsi looks after your nail salon Google Business Profile: new designs posted, work photos checked, holiday hours asked and a reply for every review."
- H1 "Your nail salon on Google, looking polished." (on the bar: "looking polished."); line "Kabsi keeps your nail salon Google Business Profile fresh: new designs as posts, photos checked, replies for your yes."; /for card "Seasonal designs as posts, photos checked."
- Answer paragraph: "A nail salon Google Business Profile is mostly photos and reviews. Kabsi turns a photo of a new design into a post, checks each photo before it goes to Google, drafts a reply to every review, and asks about holiday hours five days ahead. It also checks your main category every day and tells you when Google shows a different one. You approve every change."
- Watch (Example, Polish Room, Brighton): "Clients looking for nails expect a nail salon. Kabsi checks your main category against yours every day." Details: Main category, Opening hours, Special hours, Website, Phone. Main category: Google "Beauty salon", you "Nail salon". Message "Google shows Beauty salon as your main category. You told me Nail salon."
- Post (Example): the owner sends "Autumn chrome set, done today."; Kabsi prepares "Our autumn chrome sets are here. Ask for them at your next appointment."
- Jobs: "Seasonal designs, as posts" / "A photo of the new set and one line become a post for your yes."; "Work photos, checked" / "Kabsi tells you when a photo is dark, blurry or too small before it reaches Google."; "Careful replies" / "A review about a reaction gets a short checklist and no draft, so you decide."
- Nearby (Example): "Near your salon you came up 2nd for 'nail salon'."; AI (Example): "Which nail salon in Brighton does gel extensions on a Sunday?" / "Polish Room on Kensington Gardens does gel extensions and opens on Sundays from 11 am."
- Fifth question: "Will Kabsi post a client's hands?" / "Only photos you send it, and only after you approve the post. Send photos of the work, and ask the client first if you like."

**/for/spa-and-massage** (query: "spa Google Business Profile")
- Title "Spa Google Business Profile help | Kabsi"; description "Kabsi looks after your spa Google Business Profile: treatments clear, calm replies to every review, Eid and holiday hours asked in time, posts for your yes."
- H1 "Your spa on Google, calm and current." (on the bar: "calm and current."); line "Kabsi keeps your spa Google Business Profile current: treatments clear, holiday hours set, calm replies ready for your yes."; /for card "Treatments clear, holiday hours set in time."
- Answer paragraph: "A spa is judged on its photos, its treatments and how it answers reviews. Kabsi keeps your spa Google Business Profile current: it drafts a calm reply to every review, asks about Eid and public holiday hours before they come, turns your photos into posts, and checks your details every day. Nothing reaches Google without your yes."
- Watch (Example, Stillwater Spa, Dubai): "Holiday hours differ from your week. Kabsi asks before each one and checks Google shows what you chose." Details: Opening hours, Special hours, Phone, Website, Description. Eid al-Fitr, day 1: Google "Normal hours", you "14:00 to 23:00". Message "Google shows normal hours on the first day of Eid. You told me 14:00 to 23:00."
- Post (Example): the owner sends "New hot stone ritual, 90 minutes."; Kabsi prepares "New this month: our 90 minute hot stone ritual. Ask at reception or book online."
- Jobs: "Holiday hours, asked ahead" / "Before Eid and public holidays, Kabsi asks and sets your answer once you say yes."; "Calm replies" / "Replies never describe what a treatment does for the body."; "Treatments, as posts" / "A photo of the room and a line become a post for your yes."
- Nearby (Example): "Near your spa you came up 2nd for 'spa'."; AI (Example): "Which spa in Jumeirah, Dubai is open late during Ramadan?" / "Stillwater Spa in Jumeirah is open until 1 am during Ramadan, with treatments from 60 minutes."
- Fifth question: "Can Kabsi reply to a review that complains about a therapist?" / "A complaint that names a therapist comes to you marked as needing a little more care, with a short checklist and no draft. Kabsi writes a short, neutral holding reply only if you ask."

**/for/dental-clinic** (query: "dental clinic Google Business Profile")
- Title "Dental clinic Google Business Profile help | Kabsi"; description "Kabsi looks after your dental clinic Google Business Profile: hours and phone right, careful replies that never confirm a patient, and posts for your yes."
- H1 "Your dental clinic on Google, handled with care." (on the bar: "handled with care."); line "Kabsi looks after your dental clinic Google Business Profile: exact hours, the right phone, and careful replies you approve."; /for card "Exact hours, careful replies that name no patient."
- Answer paragraph: "A dental clinic Google Business Profile has to be exact and careful. Kabsi checks your hours, phone and website every day, drafts careful replies that never confirm someone is a patient or mention treatment, gives a review about an injury no draft so you decide, and asks about holiday hours in time. You approve every word before it reaches Google."
- Watch (Example, Parkside Dental, Dubai): "A patient with toothache calls the number and trusts the hours. Kabsi checks both every day." Details: Opening hours, Special hours, Phone, Website, Address, Main category. Sunday: Google "Closed", you "09:00 to 17:00". Message "Google shows you closed on Sunday. You told me 09:00 to 17:00."
- Post (Example): the owner sends "Our new hygienist starts in March."; Kabsi prepares "A warm welcome to our new hygienist, who joins Parkside Dental in March."
- Jobs: "Replies that name no patient" / "Every draft stays general: no treatment, no details, an invitation to get in touch."; "Hours and phone, checked daily" / "When Google shows something different, you choose which one stays."; "Holiday hours, asked ahead" / "Before each public holiday, Kabsi asks and sets your answer once you say yes."
- Nearby (Example): "Near your clinic you came up 2nd for 'dentist'."; AI (Example): "Which dentist in Al Barsha, Dubai is open on Sundays?" / "Parkside Dental in Al Barsha is open on Sundays from 9 am to 5 pm."
- Fifth question: "Can my practice manager approve instead of me?" / "On Pro, yes. You choose who can approve replies and posts, and you still see everything."

**/for/medical-and-aesthetic-clinic** (query: "aesthetic clinic Google Business Profile")
- Title "Aesthetic clinic Google Business Profile help | Kabsi"; description "Kabsi looks after your aesthetic clinic Google Business Profile: hours and consultation link right, replies that never confirm a patient, posts for your yes."
- H1 "Your clinic on Google, discreet and exact." (on the bar: "discreet and exact."); line "Kabsi looks after your aesthetic clinic Google Business Profile: doctors' days, the consultation link, and discreet replies you approve."; /for card "Doctors' days exact, replies that confirm no patient."
- Answer paragraph: "An aesthetic clinic is judged on its reviews, its hours and how it answers. Kabsi looks after your aesthetic clinic Google Business Profile: replies that never confirm someone is a patient or name a treatment, your hours and consultation link checked every day, and clinic news as posts ready for your yes. You approve every one."
- Watch (Example, Clearview Skin Clinic, London): "Late evening clinics are easy to miss on Google. Kabsi checks your hours against yours every day." Details: Opening hours, Website, Phone, Main category, Description. Wednesday: Google "09:00 to 17:00", you "11:00 to 20:00". Message "Google shows Wednesday 09:00 to 17:00. You told me 11:00 to 20:00."
- Post (Example): the owner sends "Dr Shah adds Thursday evening consultations, until 8 pm."; Kabsi prepares "Dr Shah now sees consultations on Thursday evenings until 8 pm. Book on our website."
- Jobs: "Replies that confirm no patient" / "No name, no treatment, no result. An invitation to get in touch instead."; "Doctors' days, as posts" / "A new clinic day becomes a post, ready for your yes."; "Hours and links, checked daily" / "When Google shows something else, you choose which stays."
- Nearby (Example): "Near your clinic you came up 2nd for 'skin clinic'."; AI (Example): "Which skin clinic in Marylebone, London has evening consultations?" / "Clearview Skin Clinic in Marylebone offers consultations until 8 pm on Wednesdays and Thursdays."
- Fifth question: "Can Kabsi post before and after photos?" / "Kabsi posts only photos you send and approve, and it never writes about results. Check your own country's rules on medical advertising before you send one."

**/for/physiotherapy** (query: "physiotherapist Google Business Profile")
- Title "Physiotherapist Google Business Profile help | Kabsi"; description "Kabsi looks after your physiotherapist Google Business Profile: open status and hours right, replies that never name an injury, and posts for your yes."
- H1 "Your physio clinic on Google, in good shape." (on the bar: "in good shape."); line "Kabsi looks after your physiotherapist Google Business Profile: hours, the assessment link, and replies that never name an injury."; /for card "Assessment link right, replies that name no injury."
- Answer paragraph: "A physiotherapist Google Business Profile needs exact hours and replies that protect patients. Kabsi checks your open status, hours and website every day, drafts replies that never name an injury or a treatment, turns news like a new physio into a post, and asks about holiday hours in time. You approve each one before it reaches Google."
- Watch (Example, Motion Works Physio, Manchester): "A clinic shown as closed loses the patients who check first. Kabsi checks your open status every day." Details: Open status, Opening hours, Website, Phone, Address. Open status: Google "Temporarily closed", you "Open". Message "Google shows you as temporarily closed. You told me you are open."
- Post (Example): the owner sends "Sports massage now on Saturday mornings."; Kabsi prepares "Sports massage is now available on Saturday mornings. Book on our website."
- Jobs: "Replies that name no injury" / "Thanks, an invitation to get in touch, and nothing about the patient's care."; "Open status and hours, checked daily" / "When Google shows something else, you choose which stays."; "Clinic news, as posts" / "A new physio or a new session time becomes a post for your yes."
- Nearby (Example): "Near your clinic you came up 2nd for 'physio'."; AI (Example): "Which physio in Didsbury, Manchester has Saturday appointments?" / "Motion Works Physio in Didsbury has appointments on Saturday mornings, with sports massage."
- Fifth question: "Can Kabsi reply to a review that names a treatment?" / "A review that names a treatment gets a careful draft that does not repeat it; a review about an injury gets no draft and a short checklist. You approve or write every reply."

**/for/restaurant** (query: "restaurant Google Business Profile")
- Title "Restaurant Google Business Profile help | Kabsi"; description "Kabsi looks after your restaurant Google Business Profile: hours right for every service, dish photos as posts, and a reply to every review for your yes."
- H1 "Your restaurant on Google, ready for service." (on the bar: "ready for service."); line "Kabsi looks after your restaurant Google Business Profile: closing times, dish photos as posts, and a reply to every review."; /for card "Closing times right, dish photos as posts."
- Answer paragraph: "A restaurant Google Business Profile shows diners your closing time, your menu and your reviews. Kabsi checks your hours every day, drafts a reply to every review in the guest's language, turns a dish photo into a post, and asks about bank holiday hours five days ahead. A review about illness comes to you with a checklist and no draft. You approve every change."
- Watch (Example, Cedar Lane Kitchen, Manchester): "A guest who reads the wrong closing time does not come. Kabsi checks your hours every day." Details: Opening hours, Special hours, Phone, Website, Address. Sunday: Google "Closes 21:00", you "Closes 22:30". Message "Google shows you closing at 21:00 on Sunday. You told me 22:30."
- Post (Example): the owner sends "Lamb shoulder is back on Sundays, tables from 12."; Kabsi prepares "Slow roast lamb shoulder is back on the Sunday menu. Tables from 12."
- Jobs: "A reply for every review" / "In the guest's language. A review about illness gets a checklist and no draft, so you decide."; "Dish photos, as posts" / "A photo from the pass and one line become a post for your yes."; "Bank holiday hours" / "Five days ahead, Kabsi asks what you will do and sets it once you say yes."
- Nearby (Example): "Near your restaurant you came up 2nd for 'restaurant'."; AI (Example): "Which restaurant in the Northern Quarter, Manchester serves a Sunday roast?" / "Cedar Lane Kitchen in the Northern Quarter serves slow roast lamb on Sundays from 12."
- Fifth question: "Can Kabsi set our Christmas hours?" / "Yes. Five days before each bank holiday, Christmas included, Kabsi asks what you will do and sets special hours once you say yes."

**/for/cafe** (query: "cafe Google Business Profile")
- Title "Cafe Google Business Profile help | Kabsi"; description "Kabsi looks after your cafe Google Business Profile: the opening time exact, what is fresh as posts, and a reply to every review, each for your yes."
- H1 "Your cafe on Google, open on time." (on the bar: "open on time."); line "Kabsi looks after your cafe Google Business Profile: an exact opening time, fresh bakes as posts, replies after the rush."; /for card "Opening time exact, fresh bakes as posts."
- Answer paragraph: "On a cafe Google Business Profile, the opening time comes first. Kabsi checks your opening time every day, turns a photo of what is fresh into a post, writes the posts once the morning rush is over, drafts a reply to every review, and asks about holiday hours in time. You approve each one."
- Watch (Example, Brew Lane Cafe, London): "The first customer of the day reads your opening time on Google. Kabsi checks it every day." Details: Opening hours, Special hours, Website, Phone, Attributes. Monday opening: Google "08:00", you "07:00". Message "Google shows you opening at 08:00 on Monday. You told me 07:00."
- Post (Example): the owner sends "Pumpkin loaf is back from today."; Kabsi prepares "Pumpkin loaf is back on the counter from today, while it lasts."
- Jobs: "An exact opening time" / "Checked every day, so the first customer finds you open."; "What is fresh, as posts" / "A photo of today's bake becomes a post, written after the rush."; "A reply for every review" / "In the language of the review, ready for your yes."
- Nearby (Example): "Near your cafe you came up 2nd for 'cafe'."; AI (Example): "Which cafe near Brick Lane, London opens before 8 am?" / "Brew Lane Cafe near Brick Lane opens at 7 am on weekdays, with pastries baked that morning."
- Fifth question: "Can Kabsi reply to reviews in other languages?" / "Yes. Each draft is written in the language of the review, and you approve it like any other."

**/for/bakery** (query: "bakery Google Business Profile")
- Title "Bakery Google Business Profile help | Kabsi"; description "Kabsi looks after your bakery Google Business Profile: early hours and holiday hours right, the day's bakes as posts, and a reply to every review."
- H1 "Your bakery on Google, fresh every morning." (on the bar: "fresh every morning."); line "Kabsi looks after your bakery Google Business Profile: early hours, holiday baking hours, and the day's bakes as posts."; /for card "Early hours exact, holiday hours set ahead."
- Answer paragraph: "A bakery Google Business Profile lives on early hours and holiday hours. Kabsi checks your opening time every day, asks about every bank holiday five days ahead, sets the Christmas Eve hours you give it, turns a photo of the day's bake into a post, and drafts a reply to every review. You approve each one before it reaches Google."
- Watch (Example, Corner Bakery, London): "Holiday baking days have their own hours. Kabsi checks Google shows the hours you chose." Details: Opening hours, Special hours, Phone, Website, Address. Christmas Eve: Google "Normal hours", you "06:00 to 14:00". Message "Google shows normal hours on Christmas Eve. You told me 06:00 to 14:00."
- Post (Example): the owner sends "Sourdough with seeds, every Saturday from now."; Kabsi prepares "Seeded sourdough is now baked every Saturday."
- Jobs: "Holiday hours, asked ahead" / "Bank holidays asked five days ahead; Christmas Eve hours set once you give them."; "The day's bake, as a post" / "A photo of the counter becomes a post for your yes."; "A reply for every review" / "Short and warm, using only what you told Kabsi."
- Nearby (Example): "Near your bakery you came up 2nd for 'bakery'."; AI (Example): "Which bakery in Hackney, London sells sourdough on Saturdays?" / "Corner Bakery in Hackney bakes seeded sourdough every Saturday and opens at 6 am."
- Fifth question: "Will Kabsi post prices for cakes?" / "Only prices you give it, in a post you approve. Kabsi never invents a price or an offer."

**/for/auto-repair** (query: "auto repair shop Google Business Profile")
- Title "Auto repair shop Google Business Profile help | Kabsi"; description "Kabsi looks after your auto repair shop Google Business Profile: the phone and hours right, calm replies to price complaints, and work photos as posts."
- H1 "Your garage on Google, running right." (on the bar: "running right."); line "Kabsi looks after your auto repair shop Google Business Profile: the right phone, exact hours, and calm replies you approve."; /for card "The right phone number, calm replies."
- Answer paragraph: "Drivers call a garage from its auto repair shop Google Business Profile, so the phone number has to be right. Kabsi checks your phone and hours every day, drafts calm replies to reviews about price that never argue or promise refunds, turns a photo from the workshop into a post, and asks about bank holiday hours in time. You approve every change."
- Watch (Example, Westgate Auto Repair, Manchester): "Drivers call the number Google shows. Kabsi compares it with yours every day." Details: Phone, Opening hours, Address, Website, Main category. Phone: Google "An old number", you "Your workshop line". Message "Google shows a phone number that is not the one you gave me."
- Post (Example): the owner sends "Air con check before summer."; Kabsi prepares "Air con not cold any more? Book an air con check before the summer."
- Jobs: "The right phone number" / "Checked every day. When it differs, you choose which stays."; "Calm replies about price" / "Drafts never argue, admit fault or promise a refund, and wait for you."; "Workshop photos, as posts" / "A photo and a line become a post. Kabsi never writes a price you did not give."
- Nearby (Example): "Near your garage you came up 2nd for 'car repair'."; AI (Example): "Which garage in Salford, Manchester does same day MOTs?" / "Westgate Auto Repair in Salford offers same day MOTs when you book before 10 am."
- Fifth question: "Does Kabsi see my customers' records?" / "No. Kabsi works with your Google profile and the reviews on it. It does not connect to your customer records."

**/for/gym-and-fitness** (query: "gym Google Business Profile")
- Title "Gym Google Business Profile help | Kabsi"; description "Kabsi looks after your gym Google Business Profile: classes and trial weeks as posts, holiday hours asked in time, and a reply to every review for your yes."
- H1 "Your gym on Google, in top form." (on the bar: "in top form."); line "Kabsi looks after your gym Google Business Profile: classes as posts, holiday hours asked, and replies ready for your yes."; /for card "Classes as posts, holiday hours asked ahead."
- Answer paragraph: "A gym Google Business Profile is where people check your hours, photos, classes and reviews. Kabsi turns a new class or trial week into a post with real dates, asks about public holiday hours in time, drafts a reply to every review, and checks your category and hours every day. You approve every change before it reaches Google."
- Watch (Example, Harbour Strength Studio, Dubai): "Your main category tells people what you are. Kabsi checks it, and your hours, every day." Details: Main category, Opening hours, Special hours, Website, Phone. Main category: Google "Sports club", you "Gym". Message "Google shows Sports club as your main category. You told me Gym."
- Post (Example): the owner sends "New 6 am strength class from Sunday. First class free."; Kabsi prepares "New: a 6 am strength class from Sunday. Your first class is free."
- Jobs: "Classes, as posts" / "A new class with its real dates, ready for your yes."; "Holiday hours, asked ahead" / "Before each public holiday, Kabsi asks and sets your answer."; "A reply for every review" / "Coaches thanked by name only when the review names them."
- Nearby (Example): "Near your gym you came up 2nd for 'gym'."; AI (Example): "Which gym in Dubai Marina has a 6 am strength class?" / "Harbour Strength Studio in Dubai Marina runs a 6 am strength class every weekday."
- Fifth question: "Can my head coach approve posts?" / "On Pro, yes. You choose who can approve replies and posts, and you still see everything."


### Part C: the eight new pages and the dental clinic indexed (branch claude/industries2-c)

- The dental clinic page is indexed (its claim sheet, docs/claims/dental-clinic.md, is written); its Example chat line "A person at Kabsi answers on WhatsApp the same working day." becomes "Rashid at Kabsi replies in working hours." (B-026; the chat is no longer shown on the page).
- The related trades now point to the new pages where they fit (barbershop to tattoo studios, nail salons to lash and brow studios, spas and physiotherapy and gyms to yoga and pilates, bakeries to florists, auto repair to car washes). kabsi.co/for/florists forwards to /for/florist.
- The new pages' reading blocks: "What people search for" with the page's own search text, and "Your Google profile, as a [trade] owner" with two sections and "Google categories that fit" ("First category:", "Also:", the note).

### The main query of each page (30.32 item 4)

Chosen by Google's own category name in owners' words, because the DataForSEO balance could not be read from the session (a docs/LATER.md row rechecks with volumes after the top-up): hair salon Google Business Profile; barber shop Google Business Profile; nail salon Google Business Profile; spa Google Business Profile; dental clinic Google Business Profile; aesthetic clinic Google Business Profile; physiotherapist Google Business Profile; restaurant Google Business Profile; cafe Google Business Profile; bakery Google Business Profile; auto repair shop Google Business Profile; gym Google Business Profile; eyelash salon Google Business Profile; tattoo shop Google Business Profile; pet groomer Google Business Profile; veterinarian Google Business Profile; car wash Google Business Profile; florist Google Business Profile; optician Google Business Profile; yoga studio Google Business Profile.

### The eight new pages (part C)

Lead "New sets as posts, your hours right, holiday hours asked in time and a reply for every review. You approve each one."; keyword "eyelash salon"; searches: eyelash extensions near me, lash lift, brow lamination, eyebrow threading, lash salon, brow tint near me.
**/for/lash-and-brow-studio** (query: "eyelash salon Google Business Profile")
- Title "Eyelash salon Google Business Profile help | Kabsi"; description "Kabsi looks after your eyelash salon Google Business Profile: new sets as posts, hours checked daily, holiday hours asked, a reply to every review."
- H1 "Your lash and brow studio, looking its best." (on the bar: "looking its best."); line "Kabsi looks after your eyelash salon Google Business Profile: new sets as posts, exact hours, replies for your yes."; /for card "Fresh sets as posts, hours kept exact."
- Answer paragraph: "A lash and brow studio is judged on close photos and reviews. Kabsi looks after your eyelash salon Google Business Profile: it turns a photo of a fresh set into a post, checks your hours every day, asks about holiday hours five days ahead and drafts a reply to every review, thanking the artist the client named. Nothing goes on Google until you say yes."
- Watch (Example, Flutter Lash Studio, London): "Late hours matter to clients who work. Kabsi checks the hours Google shows against yours every day." Details: Opening hours, Special hours, Website, Phone, Main category. Saturday: Google "10:00 to 16:00", you "09:00 to 19:00". Message "Google shows Saturday 10:00 to 16:00. You told me 09:00 to 19:00."
- Post (Example): the owner sends "Wispy hybrid set from this morning. Mia has Thursday slots."; Kabsi prepares "A wispy hybrid set by Mia. She has slots this Thursday, book online."
- Jobs: "Fresh sets, as posts" / "A close photo and a line become a post. Kabsi checks the photo is sharp first."; "Replies that thank the artist" / "Only when the review names her, and only names on your team list."; "Holiday hours, asked ahead" / "Five days before each bank holiday, Kabsi asks and sets your answer."
- Nearby (Example): "Near your studio you came up 2nd for 'eyelash salon'."; AI (Example): "Which lash studio in Islington, London does a lash lift on Saturdays?" / "Flutter Lash Studio on Upper Street does lash lifts and is open on Saturdays until 7 pm."
- Questions: "Will Kabsi post photos of my clients' faces?" / "Only photos you send it, and only after you approve the post. A close crop of the lashes is enough."; "What does Kabsi do with a review about irritation?" / "A reaction is a safety matter, so it comes to you marked as needing a little more care, with a short checklist and no draft. Kabsi writes a short, neutral holding reply only if you ask."; "Can Kabsi thank the artist by name?" / "Yes, when the review names her and her name is on your team list. Kabsi never guesses a name."; "Does Kabsi work with my booking app?" / "No. Kabsi works only with your Google profile. Your booking link stays the one you set."; "Can my senior artist approve instead of me?" / "On Pro, yes. You choose who can approve replies and posts, and you still see everything."

Lead "Healed work as posts, your house rules right on Google and a calm reply for every review. You approve each one."; keyword "tattoo shop"; searches: tattoo shop near me, tattoo artist, fine line tattoo, cover up tattoo, walk in tattoo, tattoo studio.
**/for/tattoo-studio** (query: "tattoo shop Google Business Profile")
- Title "Tattoo shop Google Business Profile help | Kabsi"; description "Kabsi looks after your tattoo shop Google Business Profile: house rules right, healed work as posts, and a calm reply to every review for your yes."
- H1 "Your tattoo studio on Google, inked right." (on the bar: "inked right."); line "Kabsi looks after your tattoo shop Google Business Profile: house rules right, healed work as posts, calm replies."; /for card "House rules right, healed work as posts."
- Answer paragraph: "A tattoo shop Google Business Profile should show the work and say how to book. Kabsi turns a photo of healed work into a post that names the artist, checks your description and hours every day, drafts a reply to every review, and asks about holiday hours in time. You approve each one."
- Watch (Example, Black Lantern Tattoo, Manchester): "Walk-in or by appointment: your description says which. Kabsi watches it, and your hours, every day." Details: Description, Opening hours, Website, Phone, Main category. Description: Google "Walk-ins every day", you "Appointments only". Message "Google's description says walk-ins every day. You told me appointments only."
- Post (Example): the owner sends "Healed fine line botanical by Leo, 3 weeks on. His books open on the 1st."; Kabsi prepares "Healed fine line botanical by Leo, three weeks on. Leo's books open on the 1st."
- Jobs: "Healed work, as posts" / "A photo and a line become a post that names the artist."; "House rules in your description, kept right" / "Kabsi checks your description and hours every day, and asks before anything changes."; "Care with hard reviews" / "A review about an infection gets no draft and a short checklist, so you decide."
- Nearby (Example): "Near your studio you came up 2nd for 'tattoo shop'."; AI (Example): "Which tattoo studio in the Northern Quarter, Manchester does fine line work?" / "Black Lantern Tattoo in the Northern Quarter does fine line work, by appointment only."
- Questions: "Can Kabsi say we only work by appointment?" / "Yes. Write it in your description on Google and in your posts; Kabsi checks the description every day and tells you when Google shows something else."; "What happens with a review about an infection?" / "An infection is a safety matter, so it comes to you marked as needing a little more care, with a short checklist and no draft. Kabsi writes a short, neutral holding reply only if you ask."; "Will a reply name the right artist?" / "Only when the review names them and the name is on your team list. Kabsi never guesses."; "Can Kabsi post photos of fresh tattoos?" / "Yes, photos you send and approve. Kabsi checks each one is sharp and well lit first."; "Does Kabsi post on Instagram too?" / "No. Kabsi works only with your Google profile."

Lead "Fresh trims as posts, the areas you cover right on Google and a warm reply for every review. You approve each one."; keyword "pet groomer"; searches: dog grooming near me, pet groomer, mobile dog grooming, cat grooming, puppy first groom, dog bath and trim.
**/for/pet-grooming** (query: "pet groomer Google Business Profile")
- Title "Pet groomer Google Business Profile help | Kabsi"; description "Kabsi looks after your pet groomer Google Business Profile: service area and hours right, fresh trims as posts, and a warm reply to every review."
- H1 "Your grooming salon on Google, freshly trimmed." (on the bar: "freshly trimmed."); line "Kabsi looks after your pet groomer Google Business Profile: the areas you cover, fresh trims as posts, warm replies."; /for card "Areas you cover right, fresh trims as posts."
- Answer paragraph: "A groomer is judged on photos and reviews. Kabsi looks after your pet groomer Google Business Profile: it turns a photo of a fresh trim into a post, checks your hours and the areas you cover every day, drafts a warm reply to every review, marks a hard one for more care, and asks about holiday hours in time. You approve each one."
- Watch (Example, Muddy Paws Grooming, Dubai): "A mobile groomer lives by the areas it covers. Kabsi checks your service area and hours every day." Details: Service area, Opening hours, Phone, Website, Special hours. Service area: Google "No area shown", you "Arabian Ranches, Al Barsha". Message "Google shows no service area for you. You told me Arabian Ranches and Al Barsha."
- Post (Example): the owner sends "Teddy bear trim on Biscuit today. Weekend slots are open."; Kabsi prepares "Biscuit's teddy bear trim, fresh this morning. Weekend slots are open."
- Jobs: "Fresh trims, as posts" / "A happy photo and one line become a post for your yes."; "The areas you cover" / "Kabsi checks your service area and hours every day, and asks when they differ."; "Care with hard reviews" / "A review about a nick or an injury gets no draft and a short checklist."
- Nearby (Example): "Near your salon you came up 2nd for 'pet groomer'."; AI (Example): "Which dog groomer in Al Barsha, Dubai comes to your home?" / "Muddy Paws Grooming covers Al Barsha and Arabian Ranches with a mobile van, seven days a week."
- Questions: "I come to the customer's home. What does my profile show?" / "Google lets a business that travels to customers set a service area and hide its address. Kabsi checks the area Google shows every day."; "What does Kabsi say to a review about a nick?" / "An injury is a safety matter, so it comes to you marked as needing a little more care, with a short checklist and no draft. Kabsi writes a short, neutral holding reply only if you ask."; "Can Kabsi post photos of the pets I groom?" / "Yes, photos you send and approve. Ask the owner first if you like."; "Can Kabsi set our Eid hours?" / "Yes. Before each public holiday, Kabsi asks what you will do and sets special hours once you say yes."; "Does Kabsi take bookings?" / "No. Kabsi works only with your Google profile. Your booking link and phone stay yours."

Lead "Clinic hours and phone right on Google, careful replies that share no pet's care, and posts for your yes."; keyword "veterinarian"; searches: vet near me, emergency vet, vet open saturday, cat vet, puppy vaccinations, veterinary clinic.
**/for/veterinary-clinic** (query: "veterinarian Google Business Profile")
- Title "Veterinarian Google Business Profile help | Kabsi"; description "Kabsi looks after your veterinarian Google Business Profile: hours and phone checked daily, careful replies that share no pet's care, posts for your yes."
- H1 "Your vet clinic on Google, in safe hands." (on the bar: "in safe hands."); line "Kabsi looks after your veterinarian Google Business Profile: hours and phone checked daily, and careful replies you approve."; /for card "Hours and phone checked daily, careful replies."
- Answer paragraph: "A worried pet owner checks a veterinarian Google Business Profile for the phone number and whether you are open now. Kabsi checks your hours and phone every day, drafts careful replies that share nothing about a pet's care, shows you a hard review as one that needs more care, and asks about holiday hours in time. You approve every word."
- Watch (Example, Greenway Vets, Bristol): "A worried owner trusts the hours Google shows. Kabsi checks them against yours every day." Details: Opening hours, Special hours, Phone, Address, Website, Main category. Saturday: Google "Closed", you "09:00 to 13:00". Message "Google shows you closed on Saturday. You told me 09:00 to 13:00."
- Post (Example): the owner sends "Puppy clinic every Thursday at 4 from next week."; Kabsi prepares "New puppy clinic every Thursday at 4 pm, from next week. Ask at reception."
- Jobs: "Hours and phone, checked daily" / "When Google shows something else, you choose which stays."; "Replies that share no care details" / "Thanks and an invitation to get in touch, nothing about the pet's treatment."; "Clinic news, as posts" / "A new clinic day or a new vet becomes a post for your yes."
- Nearby (Example): "Near your clinic you came up 2nd for 'veterinarian'."; AI (Example): "Which vet in Bishopston, Bristol is open on Saturday mornings?" / "Greenway Vets in Bishopston is open on Saturdays from 9 am to 1 pm."
- Questions: "Will a reply mention a pet's treatment?" / "No. Drafts thank the owner and invite them to get in touch, and say nothing about the pet's care."; "Can Kabsi set our bank holiday hours?" / "Yes. Five days before each one, Kabsi asks what you will do and sets special hours once you say yes."; "Does Kabsi see our clinic records?" / "No. Kabsi works with your Google profile and its reviews. It does not connect to your clinic system."; "What happens with a very hard review?" / "It comes to you marked as needing a little more care, with a short checklist and no draft. You write the reply, ask Kabsi for a short, neutral holding reply, or skip it."; "Can our practice manager approve replies?" / "On Pro, yes. You choose who can approve replies and posts, and you still see everything."

Lead "Your open status and hours right, before and after shots as posts and calm replies to every review. You approve each one."; keyword "car wash"; searches: car wash near me, car detailing, hand car wash, ceramic coating, interior car cleaning, mobile car wash.
**/for/car-wash** (query: "car wash Google Business Profile")
- Title "Car wash Google Business Profile help | Kabsi"; description "Kabsi looks after your car wash Google Business Profile: open status and hours checked daily, detailing work as posts, and calm replies for your yes."
- H1 "Your car wash on Google, spotless." (on the bar: "spotless."); line "Kabsi looks after your car wash Google Business Profile: open status and hours right, detailing work as posts."; /for card "Open status right, detailing work as posts."
- Answer paragraph: "A car wash Google Business Profile has to show the right hours and that you are open. Kabsi checks your open status and hours every day, turns a photo of a finished car into a post, drafts a calm reply to every review, including one about a scratch, and asks about holiday hours in time. You approve each one."
- Watch (Example, Shine Bay Car Wash, Dubai): "Your open status and hours tell drivers you are there. Kabsi checks them every day." Details: Open status, Opening hours, Special hours, Address, Phone. Open status: Google "Permanently closed", you "Open". Message "Google shows you as permanently closed. You told me you are open."
- Post (Example): the owner sends "Full interior detail on a family SUV, sand gone."; Kabsi prepares "Full interior detail on a family SUV: seats, mats and every grain of sand. Book a slot today."
- Jobs: "Open status and hours" / "Checked every day. When Google shows something else, you choose."; "Your best work, as posts" / "A photo of a finished car and one line become a post for your yes."; "Calm replies about damage" / "A review about a scratch gets a calm draft with no argument, for your yes."
- Nearby (Example): "Near your car wash you came up 2nd for 'car wash'."; AI (Example): "Which car wash in Dubai Marina does interior detailing on Fridays?" / "Shine Bay Car Wash near Dubai Marina Mall does full interior detailing and is open on Fridays from 8 am."
- Questions: "What does Kabsi say to a review about a scratch?" / "It drafts a calm reply that asks the customer to get in touch. It never argues, admits fault or promises a refund, and it waits for you."; "Will Kabsi post our prices?" / "Only prices you give it, in a post you approve. Kabsi never invents a price or an offer."; "Google says we are closed. What can I do?" / "When your open status on Google differs from what you confirmed, Kabsi asks you which is right. Nothing changes without your yes."; "We also wash cars at customers' homes. Can Google show that?" / "Google lets a business that travels to customers set a service area. Kabsi checks the area Google shows every day."; "Can my shift manager approve replies?" / "On Pro, yes. You choose who can approve replies and posts, and you still see everything."

Lead "Seasonal flowers as posts, the phone and busy season hours right, and replies for every review. You approve each one."; keyword "florist"; searches: florist near me, flower delivery, same day flowers, wedding flowers, funeral flowers, flower shop.
**/for/florist** (query: "florist Google Business Profile")
- Title "Florist Google Business Profile help | Kabsi"; description "Kabsi looks after your florist Google Business Profile: the phone and busy season hours right, arrangements as posts, and warm replies for your yes."
- H1 "Your flower shop on Google, in full bloom." (on the bar: "in full bloom."); line "Kabsi looks after your florist Google Business Profile: the right phone, holiday hours, arrangements as posts."; /for card "The right phone, arrangements as posts."
- Answer paragraph: "Orders come by phone, so a florist Google Business Profile has to show the right number. Kabsi checks your phone and hours every day, asks about public holiday hours in time, sets busy day hours you give it, turns a photo of an arrangement into a post, and drafts a warm reply for a celebration and a gentle one for a sympathy order. You approve each one."
- Watch (Example, Bloom and Twine, Bristol): "Flower orders often start with a call. Kabsi checks the phone Google shows against yours every day." Details: Phone, Opening hours, Special hours, Website, Address. Phone: Google "An old number", you "Your shop's number". Message "Google shows a phone number that is not the one you gave me."
- Post (Example): the owner sends "First ranunculus of spring, in the window today."; Kabsi prepares "The first ranunculus of spring are in the window today. Call to order a bunch."
- Jobs: "The right phone number" / "Checked every day, because orders start with a call."; "Busy day hours" / "Kabsi asks before public holidays, and sets the hours you give it for Valentine's Day."; "Gentle replies" / "Warm for a wedding, gentle for a funeral, never adding what the customer did not say."
- Nearby (Example): "Near your shop you came up 2nd for 'florist'."; AI (Example): "Which florist in Clifton, Bristol does same day bouquets?" / "Bloom and Twine in Clifton makes same day bouquets when you order by 1 pm."
- Questions: "Can Kabsi set our Valentine's Day hours?" / "Yes. Tell Kabsi the hours, and it sets them as special hours once you say yes. Before public holidays, Kabsi asks you first."; "How does Kabsi reply to a review after a funeral?" / "Gently and briefly. The draft thanks the customer, adds nothing they did not share, and waits for your yes."; "Will Kabsi post our arrangements?" / "Yes, photos you send and approve. Kabsi checks each photo is sharp and well lit first."; "Does Kabsi take flower orders?" / "No. Kabsi works only with your Google profile. Orders stay with you."; "Can my shop manager approve posts?" / "On Pro, yes. You choose who can approve replies and posts, and you still see everything."

Lead "Your eye test page and hours right on Google, new frames as posts, and careful replies. You approve each one."; keyword "optician"; searches: optician near me, eye test, contact lenses, glasses frames, kids eye test, opticians open saturday.
**/for/optician** (query: "optician Google Business Profile")
- Title "Optician Google Business Profile help | Kabsi"; description "Kabsi looks after your optician Google Business Profile: the eye test page and hours checked daily, new frames as posts, careful replies for your yes."
- H1 "Your optician on Google, in clear focus." (on the bar: "in clear focus."); line "Kabsi looks after your optician Google Business Profile: the eye test link and hours right, new frames as posts."; /for card "Eye test link right, new frames as posts."
- Answer paragraph: "An optician Google Business Profile is where people find the link to book an eye test and your hours. Kabsi checks your website, phone and hours every day, turns a photo of new frames into a post, drafts careful replies that never mention an eye test result, and asks about holiday hours in time. You approve every change."
- Watch (Example, Clearsight Opticians, Leeds): "Your website link is where patients go to book. Kabsi checks it, and your hours, every day." Details: Website, Opening hours, Phone, Main category, Special hours. Website: Google "Your old website", you "Your eye test page". Message "Google shows your old website. You told me your eye test page."
- Post (Example): the owner sends "New acetate frames in tortoiseshell and clear, in today."; Kabsi prepares "New acetate frames are in today, in tortoiseshell and clear. Come and try them on."
- Jobs: "The eye test link and hours" / "Checked every day. When Google shows something else, you choose."; "New frames, as posts" / "A photo of the shelf and a line become a post for your yes."; "Replies that keep eyes private" / "No result, no prescription, just thanks and an invitation to get in touch."
- Nearby (Example): "Near your practice you came up 2nd for 'optician'."; AI (Example): "Which optician in Leeds city centre does children's eye tests on Saturday?" / "Clearsight Opticians in the Victoria Quarter does children's eye tests on Saturdays."
- Questions: "Will a reply mention someone's prescription?" / "No. Drafts thank the patient and invite them to get in touch, and say nothing about their eyes."; "Our booking page moved. What happens?" / "Tell Kabsi the new page. When Google shows the old one, Kabsi asks you and puts yours back once you say yes."; "Can Kabsi post our new frames?" / "Yes, photos you send and approve. Kabsi never writes a price you did not give."; "Does Kabsi see patient records?" / "No. Kabsi works with your Google profile and its reviews. It does not connect to your practice system."; "Can our practice manager approve replies?" / "On Pro, yes. You choose who can approve replies and posts, and you still see everything."

Lead "New classes as posts, your address and hours right on Google and a reply for every review. You approve each one."; keyword "yoga studio"; searches: yoga studio near me, pilates classes, reformer pilates, hot yoga, beginner yoga, prenatal yoga.
**/for/yoga-and-pilates-studio** (query: "yoga studio Google Business Profile")
- Title "Yoga studio Google Business Profile help | Kabsi"; description "Kabsi looks after your yoga studio Google Business Profile: address and hours checked daily, new classes as posts, and a reply to every review for your yes."
- H1 "Your yoga and pilates studio, in balance." (on the bar: "in balance."); line "Kabsi looks after your yoga studio Google Business Profile: new classes as posts, address and hours right, replies ready."; /for card "New classes as posts, address and hours right."
- Answer paragraph: "A yoga studio Google Business Profile shows your address, your hours and what is new this week. Kabsi checks your address and hours every day, turns a photo and a line about a new class into a post, drafts a reply to every review that thanks the teacher the student named, and asks about holiday hours in time. You approve each one."
- Watch (Example, Still Point Studio, Abu Dhabi): "After a move, the old address can stay on Google. Kabsi checks your address and hours every day." Details: Address, Opening hours, Special hours, Website, Main category. Address: Google "Your old studio", you "Your new studio". Message "Google still shows your old studio's address. You told me the new one."
- Post (Example): the owner sends "Reformer pilates for beginners, Tuesdays at 7 pm from next week."; Kabsi prepares "Reformer pilates for beginners, every Tuesday at 7 pm from next week. Book your place."
- Jobs: "New classes, as posts" / "A photo and the class time become a post for your yes."; "Address and hours, checked daily" / "When Google shows something else, you choose which stays."; "Replies that thank the teacher" / "Only when the review names her, and only names on your team list."
- Nearby (Example): "Near your studio you came up 2nd for 'yoga studio'."; AI (Example): "Which studio in Al Reem Island, Abu Dhabi has beginner reformer pilates in the evening?" / "Still Point Studio on Al Reem Island runs beginner reformer pilates on Tuesdays at 7 pm."
- Questions: "We moved studio. What does Kabsi do?" / "Tell Kabsi the new address. When Google still shows the old one, Kabsi tells you, and nothing changes without your yes."; "Can Kabsi post our timetable?" / "Kabsi can post a new class with its day and time, from what you send. Your full timetable stays on your website."; "What happens with a review about an injury?" / "An injury is a safety matter, so it comes to you marked as needing a little more care, with a short checklist and no draft. Kabsi writes a short, neutral holding reply only if you ask."; "Will a reply thank the right teacher?" / "Only when the review names them and the name is on your team list. Kabsi never guesses."; "Does Kabsi work with my booking app?" / "No. Kabsi works only with your Google profile."


## 53. Guides 3: twenty new guides, one every 2 days, each a way into the free check (5 Nov 2026)

Every guide's words are in its own content file, src/content/guides/<slug>.tsx; each claim about Google is checked against the Google help page it cites, read on the date shown. The template's lines (src/components/marketing/guide-article.tsx), checked against knowledge/kabsi-facts.md:

- Byline: "By Kabsi. Published [date]. Updated [date]." with "[n] min read", then "Checked against Google's help pages on [date]." (when a guide also cites a government or other official page: "Checked against Google's help pages and the other sources below on [date]."). Replaces section 6's "Kabsi team, reviewed by Rashid Abou Hamzy" byline on the guides.
- The box after the answer: "See what Google shows about you" / "Type your business and Kabsi reads your Google profile and searches around it, like a customer." with the scan box (MAIN_CTA, SCAN_LINE).
- "In short" (the summary box, was "The short answer"), "In this guide" (the contents list, on guides with five or more sections), "What Kabsi does here" (or "What Kabsi does and does not do here"), "Questions owners ask", "Sources" with "Read on [date]" under each, then NOT_AFFILIATED.
- "Read next" (related guides, each "Read the guide"), "For your kind of business" with "Kabsi for [trade]", "All guides".
- The closing band: "Let Kabsi look after this." / "Start with the free check. It shows what Google shows about your business today." with the scan box, then "Start free" (to /get-started) and TRIAL_LINE.
- The cover and the share image: "Kabsi guide", the guide's topic, the question; the share image adds "kabsi.co/guides" and "Checked against Google's help pages".
- The guides list: lead "Short answers, then the steps. Each one is checked against Google's own help pages, and dated." (adds "and dated"); meta description "Plain guides for owners: your business on Google Maps, verification, hours and holidays, categories, photos, posts and Google reviews, each checked against Google's help."; each card shows the publishing date and the reading time.
- Part A (branch claude/guides3-a) publishes guide 1, "Why is my business not showing on Google Maps?", on the merge day; the other guides are added by parts B to D and appear on their day. A guide link inside a guide is plain text until the linked guide is public.
- Part B (branch claude/guides3-b) adds guides 3 to 20, each public on its day at 06:00 UTC (the schedule in the session report and in docs/progress/archive/2026-11-05-guides3.md). Each guide's words are in its own content file; the independent check's unmatched claims were fixed before merge. Titles are the owners' questions, 60 characters or fewer: guide 15 drops "hair" ("Google Business Profile checklist for salons and barbers"), and guide 20 reads "How does Google choose which businesses to show nearby?". No guide uses the word "prominence" (K-144): they quote Google's "relevance, distance, and popularity" and "how well-known a business is".
- Part C (branch claude/guides3-c): the 7 earlier guides are rewritten on the same template, every source read again on 5 Nov 2026. Two titles change to owners' questions: "Why does ChatGPT describe my business wrongly?" (was "Why ChatGPT might describe your business wrongly, and what to check") and "How do I keep my hours and details the same everywhere?" (was "Keep your hours and details the same everywhere"); GUIDE_TITLES and the facts follow. Example replies no longer write a phone number: they point the customer to the details on the profile (facts 8.3). Facts 8.2 and 13: Google checks a reply "usually within 10 minutes, and sometimes up to 30 days" (Google's help, read 5 Nov 2026).

## 54. Guides 4: every guide public, Nora knows the pages, search housekeeping (5 Nov 2026, master plan 30.32, R-112)

### Part A: every guide public (branch claude/guides4-a)

- No new line. The 20 guides of section 53 are all public from 5 Nov 2026 (one value, PUBLISH_ALL_AT in src/content/guides/schedule.ts). The guides list shows them in the Guides 3 order, guide 1 first. Each guide's byline reads "Published 5 Nov 2026" (guide 1: 5 Nov 2026, the earlier ones their own dates). New guides from 16 Nov 2026, one a week, are listed first, newest first.

### Part B: Nora knows the guides and industry pages (branch claude/guides4-b)

- Nora answers first. Then, only when one page in her list answers the visitor's question, she may add one short line with one Markdown link to it, in her own words, for example "There is a plain guide on this: [Someone changed my hours on Google. How do I fix it?](/guides/someone-changed-my-hours-on-google)." The link's words are the page's own title. At most one link, never instead of an answer, never a page that is not public, and none when she hands the visitor to a person. No other line changes; the guides and industry pages are named in the facts.

### Part C: search housekeeping (branch claude/guides4-c)

- **404 and error screens**: one <title> each, "Kabsi: This page is not here." and "Kabsi: Something went wrong on our side." (the root's default "Kabsi" no longer sits beside them). No other wording changes.
- **Facts (02, 07, 13)**: "The printable counter card from the free review link tool is free for everyone. The branded counter card and table tent PDFs (made for a business by Get reviews) come with the plans." The FAQ's "Is there a free part?" answer names the printable counter card, not the table card. No screen's wording changes: the Get reviews buttons "Print a counter card" and "Print a table card" stay.
- **Guides**: a guide may quote Google's help page on how local results are chosen, word for word in quotation marks, when it cites that page with its link and the date read (tests/claims-k144.test.ts). Promises of rankings and the word "prominence" outside such a quote stay banned.


## 55. Style 1: the 30.32 look on every public page, guides with photos (5 Nov 2026, master plan 30.33, R-113)

### Part A: guides with photos (branch claude/style1-a)

- **Guides list**: the H1 "Plain guides for your Google profile." with "your Google profile." on the highlight bar. The newest guide is a large card with its photo. The others are photo cards: the group pill, the title, the description and the read time. Topic chips above the grid: All guides, Reviews, Hours and details, Photos and posts, Setting up, Problems and fixes, Checklists, AI answers (only groups with a public guide show). The headline over the grid reads "More guides" ("guides" on the bar), or "Guides on <group>" while a chip is on.
- **Guide page**: the group pill, then the title with one phrase on the bar, then the answer, the byline and the photo at 3:2 beside it (under it on a phone). "Read next" ("next" on the bar) shows three photo cards.
- **Social image**: each guide's 1200 by 630 image is its photo under a charcoal overlay, the Kabsi mark, "Kabsi guide", the group pill, the title, "kabsi.co/guides" and "Checked against Google's help pages". A JPEG at public/og/guides/<slug>.jpg.
- **Photos** (docs/PHOTOS.md, alt text as listed there; no photo for more than two guides; src/content/guides/look.ts):

| Guide | Photo | Group | Phrase on the bar |
|---|---|---|---|
| why-is-my-business-not-on-google-maps | bakery-window | Problems and fixes | Google Maps |
| how-to-verify-google-business-profile | salon-tablet | Setting up | verify |
| google-business-profile-suspended | phone-shop | Problems and fixes | What do I do? |
| someone-changed-my-hours-on-google | cafe-counter | Hours and details | How do I fix it? |
| how-to-set-holiday-hours-on-google | bakery-counter | Hours and details | holiday hours |
| choose-google-business-profile-categories | florist-wide | Hours and details | categories |
| google-business-description-examples | spa-facial | Hours and details | business description |
| google-posts-for-local-businesses | restaurant-cooks | Photos and posts | what and how often? |
| photos-for-google-business-profile | restaurant-dining | Photos and posts | Which photos |
| how-to-ask-for-google-reviews | cafe-barista | Reviews | the right way? |
| report-fake-google-reviews | phone-reading | Reviews | fake or spam reviews |
| review-gating-google | phone-typing | Reviews | review gating |
| should-you-reply-to-every-google-review | phone-reading | Reviews | every Google review? |
| add-services-and-prices-to-google | barber-shave | Hours and details | services and prices |
| google-profile-checklist-hair-salons-barbers | barber-cut | Checklists | salons and barbers |
| google-profile-checklist-restaurants-cafes | restaurant-kitchen | Checklists | restaurants and cafes |
| transfer-google-business-profile-ownership | auto-garage | Setting up | transfer ownership |
| remove-old-employee-or-agency-from-google-profile | salon-wash | Setting up | old employee or agency |
| duplicate-google-listings | pet-grooming-wide | Problems and fixes | find and fix them |
| how-google-chooses-local-results | restaurant-dining | Problems and fixes | show nearby? |
| how-to-reply-to-google-reviews | phone-typing | Reviews | reply to Google reviews |
| how-to-respond-to-negative-google-reviews | phone-shop | Reviews | negative Google review |
| can-you-remove-a-google-review | dental-clinic-wide | Reviews | remove a Google review? |
| add-manager-google-business-profile | salon-tablet | Setting up | add a manager |
| google-review-link-and-qr-code | cafe-counter | Reviews | review link and QR code |
| why-chatgpt-describes-your-business-wrongly | florist-wide | AI answers | wrongly? |
| keep-your-hours-and-details-the-same-everywhere | bakery-counter | Hours and details | the same everywhere? |
| uae-national-day-and-eid-hours-on-google | salon-studio | Hours and details | National Day and Eid |
| christmas-and-bank-holiday-hours-on-google-uk | nail-desk | Hours and details | Christmas and bank holiday hours |
| reply-to-bad-google-review-salon | salon-wash | Reviews | bad Google review |
| what-to-post-on-google-as-a-barber | barber-cut | Photos and posts | post on Google? |
| reply-to-review-that-names-your-stylist | beauty-salon-wide | Reviews | names my stylist? |
| reply-to-reviews-about-no-shows-and-cancellation-fees | nail-technician | Reviews | cancellation fee? |
| where-to-put-your-google-review-link-salon | barber-shave | Reviews | review link? |
| why-google-shows-wrong-details-for-your-salon | spa-facial | Problems and fixes | wrong details |

## 56. Industries 3: the industry pages short and scannable (5 Nov 2026, master plan 30.33 item 2)

*Changes section 52 for /for and the twenty industry pages. No reading block: each section is a headline, at most one line of up to 25 words, then a picture, chips or cards (a short title and one line of at most 15 words). Every trade's lines are in its own content file (src/content/industries/<slug>.ts) and each has its row in the "Industries 3" section of its claim sheet (docs/claims/<slug>.md). Every business, person and number on these pages is an invented Example.*

### The template (d9-industry.tsx)

- "What people search for" (bar: "search for"): the trade's answer line (at most 25 words, the page's main query once), the searches as chips, "Searches like these. On Pro, Kabsi shows the words people searched on Google to find you." and the free check link. The trade's second reading paragraph is gone.
- "Your Google profile, as a [trade] owner" (bar: "Your Google profile"): two to four cards. Then, on the pages that have them, in this order: "What customers write about" (two or three cards; the illness, injury or safety card says the review gets no draft), "Google categories that fit" (the names as chips, the first marked "First category" for screen readers, then one line), "Holidays and busy dates" (two or three cards) and "Photos and posts" (two or three cards). "See how it works" and "See the plans" stay.
- "Read next." (bar: "next."): "Guides for you", three guides as photo cards (the guide's photo of section 55, its group as a pill, its title); "Businesses like yours" with "See every business" (to /for), six related businesses as photo cards (photo, name, one line).
- Removed: "The Google work of a [trade]" with its five long tasks, the review themes' long paragraphs, "Post ideas" as a bullet list, the holidays' long paragraphs, the two long guide sections of the Design 8 and Industries 2 pages, and the second paragraph under "What people search for".
- The share image of each industry page (public/og/industries/<slug>.jpg): "Kabsi", the page's H1 with its marked phrase in yellow, "kabsi.co/for/[slug]". Its alt text: "Kabsi. [H1]".

### /for

- No line changes. The cards are 2 to a row below 1024 px and 4 from 1024 px; a filtered list that does not fill its last row centres it.

### Each page's answer line (the first answer, with its query)

- **/for/auto-repair** (query: "auto repair shop Google Business Profile"): "On an auto repair shop Google Business Profile, the phone comes first. Kabsi checks phone and hours daily, drafts calm replies, and you approve."
- **/for/bakery** (query: "bakery Google Business Profile"): "On a bakery Google Business Profile, early and holiday hours come first. Kabsi checks them, drafts posts and replies, and you approve each."
- **/for/barbershop** (query: "barber shop Google Business Profile"): "For a barber shop Google Business Profile, Kabsi prepares review replies, turns fresh cuts into posts and checks your hours daily, all for your yes."
- **/for/cafe** (query: "cafe Google Business Profile"): "On a cafe Google Business Profile, the opening time comes first. Kabsi checks it daily, turns fresh bakes into posts and prepares review replies."
- **/for/car-wash** (query: "car wash Google Business Profile"): "A car wash Google Business Profile must show you are open. Kabsi checks that daily, and drafts posts and calm replies for your yes."
- **/for/dental-clinic** (query: "dental clinic Google Business Profile"): "Kabsi keeps your dental clinic Google Business Profile exact: hours and phone checked daily, careful replies that never confirm a patient, holiday hours asked ahead."
- **/for/florist** (query: "florist Google Business Profile"): "Orders come by phone, so a florist Google Business Profile needs the right number. Kabsi checks it daily and drafts posts and replies you approve."
- **/for/gym-and-fitness** (query: "gym Google Business Profile"): "On a gym Google Business Profile, people check hours and classes. Kabsi drafts dated class posts and review replies, and asks about holiday hours ahead."
- **/for/hair-salon** (query: "hair salon Google Business Profile"): "For a hair salon Google Business Profile, Kabsi prepares review replies, turns colour work into posts and asks about holiday hours, all for your yes."
- **/for/lash-and-brow-studio** (query: "eyelash salon Google Business Profile"): "For an eyelash salon Google Business Profile, Kabsi turns fresh sets into posts, checks your hours daily and prepares review replies, all for your yes."
- **/for/medical-and-aesthetic-clinic** (query: "aesthetic clinic Google Business Profile"): "Kabsi looks after your aesthetic clinic Google Business Profile: replies that confirm no patient, hours checked daily, doctors' days as posts for your yes."
- **/for/nail-salon** (query: "nail salon Google Business Profile"): "For a nail salon Google Business Profile, Kabsi turns new designs into posts, checks each photo and prepares review replies, all for your yes."
- **/for/optician** (query: "optician Google Business Profile"): "Kabsi looks after your optician Google Business Profile: the eye test link and hours checked daily, new frames as posts, careful replies for your yes."
- **/for/pet-grooming** (query: "pet groomer Google Business Profile"): "On a pet groomer Google Business Profile, photos and reviews come first. Kabsi turns fresh trims into posts and drafts warm replies for your yes."
- **/for/physiotherapy** (query: "physiotherapist Google Business Profile"): "Kabsi looks after your physiotherapist Google Business Profile: open status checked daily, replies that name no injury, clinic news as posts for your yes."
- **/for/restaurant** (query: "restaurant Google Business Profile"): "For a restaurant Google Business Profile, Kabsi checks your hours daily, prepares review replies and turns dish photos into posts, all for your yes."
- **/for/spa-and-massage** (query: "spa Google Business Profile"): "Kabsi keeps your spa Google Business Profile current: a calm reply to every review, holiday hours asked ahead, photos as posts, all for your yes."
- **/for/tattoo-studio** (query: "tattoo shop Google Business Profile"): "A tattoo shop Google Business Profile should say how to book. Kabsi checks your description daily and prepares healed work posts and replies."
- **/for/veterinary-clinic** (query: "veterinarian Google Business Profile"): "A worried owner checks a veterinarian Google Business Profile for your phone and hours. Kabsi checks both daily and drafts careful replies for your yes."
- **/for/yoga-and-pilates-studio** (query: "yoga studio Google Business Profile"): "A yoga studio Google Business Profile shows where and when you teach. Kabsi checks address and hours daily, and prepares posts and replies."

### Part B: the look on every other public page (branch claude/style1-b)

- **The bar** (30.32 item 3): one phrase in every H1 and light section headline. Heroes: "free." (free check), "owners ask" (FAQ), "the owner at the counter." (About), "stays yours." (Security), "three months of Kabsi Pro, free." (Founding 25), "25% of every payment." (Partners), "review link and QR code." (review link tool), "as a Manager" (manager steps), "help" (setup help), "Log in" (log in), "not here." and "on our side." (404 and error), the last word of each legal title; the last sentence on Pricing and How it works as before. Sections: "you choose.", "show up", "a weekly report.", "in control.", "your business", "owners ask", "The work comes first.", "free check" (the closing check, now on every page), "your yes.", "started", "each plan", "the plans", "The trial", "Billing", "control", "billing", "WhatsApp", "data", "a person", "with owners", "facts", "Kabsi", "plain words", "how to remove it", "who to ask", "works", "suits", "partners ask", "can apply", "you get", "Kabsi asks", "a place", "Founding 25", "get back", "Google shows", "short".
- **Label pills**: the trial steps' "Today", "Day 1", "Day 14", "Any time", "The founding price", "Founding 25" (Pricing) and "Step 1" to "Step 3" (Partners) are charcoal on yellow.
- **Photos** (docs/PHOTOS.md alt text): Pricing, the trial: cafe-counter. About, how Kabsi works with owners: bakery-counter. Founding 25, who can apply: barber-cut. Partners, who it suits: salon-tablet.
- **Security, shorter lines, every fact kept**: "Kabsi reads new reviews and prepares reply drafts." "Every reply, post, photo and change shows you the exact text first." "Kabsi posts only what you approved. It cannot post on its own." "Every Google action happens inside Kabsi, for the business that asked." "No one else, partners included, gets a way to read or write your Google data." Disconnect: "In Kabsi, open Settings and choose Disconnect Kabsi from Google." "Only the signed-in owner can do it." "Kabsi stops at once and cancels what was waiting for your approval." "Then it removes its own Manager access, and an email confirms it." "If Google blocks that, our team does it within 7 business days, with the date." "You can also do it on Google, without asking us." "Open Business Profile settings, choose People and access, then remove Kabsi Clients (group ID ...). Kabsi loses access at once." Notice: "When Kabsi accepts your Manager invitation, or its access changes, we email you within 48 hours." "The email says what changed and how to remove Kabsi. Google's own notices are separate." Sign in: "You sign in with a one-time code sent to your email. No passwords." "Kabsi never asks for your Google password or a Google verification code." "Kabsi stores no Google token of yours." "Kabsi's own Google access stays on our servers, never in anyone's browser." "Links in Kabsi emails work once and expire after 72 hours." "A link belongs to its recipient. Opening one does nothing by itself." "Profile changes and reviews that need care also need that person signed in." Data: "Kabsi's database is in Frankfurt. Data is encrypted in transit." "Each business's data is separated at the database level." "Only its members, and Kabsi staff when helping you, can read it." "Review text and reviewer names from Google go 30 days after Google last returned them." "Kabsi's own Google account uses Google's Advanced Protection Program." "We never sell Google data, advertise with it or train AI models on it." "Staff read it only with your consent, for security, or when the law requires." "The privacy policy lists every provider and what we keep."
- **Pricing**: the founding price card reads "They pay the founding price and keep it while they stay subscribed." then the four prices; the Founding 25 card's last line is two sentences: "After 90 days, choose a plan at the founding price or stop. Nothing is charged by itself." Prices unchanged.
- **Free check**: "The most important thing to fix, and why it matters. Then what customers see today, and what Kabsi would do from day one."
- **Setup help**: the WhatsApp paragraph is three: "Prefer to type? Message us on WhatsApp [number]." "Nora, Kabsi's assistant, answers at once. Ask for a person and Rashid replies in working hours." "We never ask for your Google password or codes there either."
- **Grids**: Security's "What Kabsi never does" (five cards) centres its last card.

## 57. App 5: a clear staff workspace, and the 30.32 look on the signed-in site (5 Nov 2026, master plan 30.33)

Staff pages are for the Kabsi team only and are never public. Owners never see them.

### Part A: the staff workspace (branch claude/app5-a)

- **Menu** (side bar, under "Staff"): Today, Businesses, Conversations, Programs, System, Costs, then Settings apart. Phone bar: Today, Businesses, Chats, Programs, System. Phone menu ("Staff menu"): Costs, Settings, Business account, Guides, Log out. Phone top bar: "Staff · <page>".
- **Headings and purpose lines** (the phrase on the highlight bar in brackets):
  - Today: "What needs [a person] today" · "Everything waiting for the team now, with a button to the page that handles it."
  - Businesses: "[Every business] on Kabsi" · "Newest first, with concierge, the Pro trial and diagnostics for each one."
  - Conversations: "People [waiting] for an answer" · "Chats with Nora, follow-ups done by hand and the concierge queue."
  - Programs: "[Founding 25] and Kabsi Partners" · "Applications to decide, the start checklist, partners and their payouts."
  - System: "How the system is [running]" · "Operations, system and job health, the validation figures and the evidence log."
  - Costs: "What Kabsi [spends]" · "Paid data providers and AI answers. Mock mode costs nothing and is not counted."
  - Settings: "Staff [settings]" · "The WhatsApp staff phone: make a code and send it from that phone."
- **Panel chips** (one row under the heading, "All" first): Conversations: Chats with Nora, Follow-ups, Concierge. Programs: Founding 25, Kabsi Partners. System: Operations, System health, Jobs, Validation, Evidence log. Businesses: All, Setting up, Active, Concierge. Chats with Nora: Show (Every chat, Needs a person), Lead (All, hot, warm, cold), Period (7, 30, 90, 365 days).
- **Today**: "Needs a person now" with "[n] to look at" or "Nothing waiting". Rows, each with its count and a button: "[n] approval(s) not sent after 15 minutes" (Open operations), "[n] job run(s) failed in the last 24 hours" (Open job health), "[n] stopped job(s) to retry or cancel" (Open system health), "[n] business has / businesses have lost Google access" (Open operations), "[n] refusal(s) or provider error(s) in the last 24 hours" (Open system health; the refusals themselves are listed on Today under the spend), "[n] chat is / chats are waiting for a person" (Open the chats), "[n] follow-up is / follow-ups are due" (Open follow-ups), "[n] concierge task is / tasks are waiting" (Open concierge), "[n] Founding 25 application(s) to decide" (Open Founding 25), "[n] partner application(s) to decide" (Open Partners), "[n] new business is / businesses are still setting up" (Open businesses).
- **Today, empty**: "All clear." · "Nothing is waiting for a person. Today checks again each time you open it." Loading: "Checking every page". A read that fails: "Some figures did not load: [names]. The rows below leave them out. Try again".
- **Today, other sections**: "New this week" · "Businesses still setting up, newest first." with "Step: [step]". "Spend against the caps" with "All costs": "DataForSEO, this month", "AI Visibility, this month" ("$x of $cap"), "AI answers, last 24 hours" ("$x for [n] answers"), "Google Places, today" ("[n] of [cap] calls"), then "Provider refusals, last 24 hours" with each alert's own line.
- **Businesses**: "[shown] of [all]", "No business matches.", "The businesses did not load. Try again".
- **Chats with Nora**: "Loading chats", "Nobody is waiting for a person."

### Part B: the 30.32 look on the signed-in site (branch claude/app5-b)

- **Headings**: every signed-in H1 puts one phrase on the highlight bar. A place's H1 marks its last word: Home, Reviews, Posts and [photos], Google [profile], Settings; Welcome to [Kabsi]; Business [Knowledge]; Get [reviews]; Your [businesses] (the business picker). Setup steps mark their last word too, except "Your [free check] for [business]" and "Add Kabsi as a [Manager] on Google.". No heading's words change.
- **Paragraphs of at most 25 words**: long lines on Plan, Photos, Settings, Get reviews, Business knowledge hints, Profile Coach, Profile watch, Home's task lines, setup and the staff pages are shown as two short paragraphs, cut between sentences, with the same words. Two lines are reworded because one sentence alone ran past 25 words:
  - Get reviews: "A link opens your Google review page, or a short page with the Google button first and a line to message the manager." (was "A link goes straight to your Google review page, or opens a short page with ..."), then "Everyone sees the same thing, and nobody is asked how their visit went." as its own paragraph.
  - Staff, Evidence log: "One row for each request Kabsi does not cover, a repeated problem, time saved, a missed enquiry or sale, or support given." (was "One row for each thing an owner asks for that Kabsi does not do, ...").
- **Kept as they are, over the rule**: the WhatsApp consent text (stored word for word as the proof of the opt-in, K-113; a LATER row for lane R), an AI assistant's own answer, and the access steps shared with the public /manager-steps page.

## 60. App 6: the delivery choice that answers at once (5 Nov 2026, master plan 30.34 item 5)

Settings, "Where your routine messages go", the four switches and "Choose how each one reaches you". A change shows at once; if the save fails the page goes back and says so. The control is always shown; WhatsApp reads as unavailable with one line that says why and what fixes it.

- Not open (Kabsi has no WhatsApp number yet): "WhatsApp is not open yet. Your reports and reminders come by email."
- No opt-in (none or pending): "WhatsApp is not connected yet. Connect it below, then choose it here." (a link to the WhatsApp panel)
- Stopped: "WhatsApp is stopped. Connect it again below, then choose it here." (the same link)
- The opt-in could not be read: "We could not check your WhatsApp. Refresh the page and try again."
- The choice could not be read: "We couldn't load your choice. Refresh and try again."
- The save failed on the WhatsApp or Email choice: "Couldn't save that. Your messages still go by [WhatsApp or email]. Try again."
- The save failed on a switch or an email timing: "Couldn't save that. It is back as it was. Try again."

## 58. Scan 3: the free check made simple, fast and in the Kabsi look (5 Nov 2026, master plan 30.34 items 2 and 3, R-114)

Every new or changed line of Scan 3. The result's lines are in src/lib/scan-words.ts (tests/scan3.test.ts holds them) and src/components/kabsi/scan-live.tsx.

### Part A: the result (branch claude/scan3-a)

- **The business**: "Free check, [date]", the name as the H1 on the highlight bar, "[town], [category]. Searched as '[term]'." and "Not your business? Change it".
- **The main finding**: "The main thing we found" ("main thing" on the bar), the first red flag, else the first amber one, else "Google shows the basics of your profile."; then one line on why it matters: "Customers cannot see when you are open." (hours), "Customers cannot call you from your profile." (phone), "Customers cannot open your site from your profile." (website), "Your category tells Google and customers what you do." (category), "Photos show customers what to expect before they come." (photos), "People read your reviews before they choose." (reviews), "Customers who search for you see this before anything else." (closed), "Customers can see your hours, your phone and your photos." (nothing missing); then "Next step: " and the flag's own action (nothing missing: "Once connected, Kabsi checks them every day and prepares a reply to every new review.").
- **What Kabsi would do** ("would do" on the bar), three numbered lines, each with who does what above it:
  1. "Kabsi prepares, you approve" / "Kabsi prepares a reply to every new review. You approve each one."
  2. By the main finding: photos "You send, Kabsi prepares" / "You send photos from your phone. Kabsi prepares them and asks for your yes."; hours "You tell, Kabsi sends" / "You tell Kabsi your hours. Kabsi sends them to Google once you say yes."; reviews "Kabsi prepares, you share" / "Kabsi gives you a review link and QR code. You share them with every customer."; phone, website or category "You, on Google" / "You add your [phone number | website | category] on Google. Kabsi then checks it every day."; closed "You, on Google" / "You correct the open status on Google with the steps Kabsi shows. Kabsi then checks it every day."; nothing missing "Kabsi checks" / "Kabsi checks your hours, phone and website on Google every day and tells you when something changes."
  3. "Kabsi prepares, you approve" / "Kabsi prepares a post when something changes. Nothing goes live without your yes."
  Under them: "Kabsi cannot promise more reviews or a higher place on Google Maps."
- **The details**: "The details, when you want them" ("details" on the bar). Each opens on request ("Show" / "Hide") and shows its one-line answer while closed: "What Google shows about you" ("[n] to look at, [m] shown on Google"; a missing value reads "Missing"), "Where you come up nearby" (the lead line), "Did ChatGPT name your business?" (the verdict).
- **Nearby, in plain words**: "When someone searches for '[term]' near you, you appear [2nd] in this Google Maps check." (or "you are not in the first 20 in this Google Maps check."); "You appeared in the first three at [n] of 49 points around you." then Scan 2's "Most places put you [4th]." or "Most places did not put you in the first 20."; "Sample Google Maps results, not customer counts."; "Who came first at your address" (1st, 2nd, 3rd with rating and reviews); "Who came up most around you" ("In the results at [n] of 49 points"); over the drawing "Diagram, not a map. A, B and C are three of the places Kabsi searched from."; last "Google Maps shows different results depending on where someone searches, so your position changes across your area." The card's own count line is not repeated under it.
- **Did ChatGPT name your business?**: "Yes. ChatGPT named your business." / "No. It named [A, B and C], which Google Maps shows near you." / "No. ChatGPT did not name your business in this answer." / when the names cannot be matched to the area: "Not clear from this answer. ChatGPT named businesses Kabsi could not match to your area on Google Maps, so it does not show whether ChatGPT would name you here." Under it: "Question: '[question]'", "Model: ChatGPT ([model])", "Asked ChatGPT on [date]", "Sources cited" or "No sources cited.", then "One sample answer. The ChatGPT app can answer differently, and answers change from run to run."
- **Your next step** ("next step" on the bar): the one yellow button "Start your 14-day free trial", then "The 14 days start when Kabsi's access to your Google profile works." and "No card. Cancel any time."; "Get this on WhatsApp" (a link with the WhatsApp mark, when the hand-off exists); "The full trial terms" opens Polish 2's four lines unchanged; "Or apply for Founding 25: three months of Pro, free" while places remain.
- **Why Kabsi asks for Manager access**: "Kabsi needs Manager access to prepare replies, posts and fixes on your profile." "You stay the owner of your Google profile." "Nothing is published without your yes." and the link "See the setup steps" (the guide /guides/add-manager-google-business-profile). The fold "When you start: add Kabsi on Google" with the full steps is gone from the result; the steps stay in setup, unchanged. The fold "What Kabsi sees once connected" is gone too.
- **Send me this report**: "You get the summary of what Google shows, the nearby check and the ChatGPT answer, and the link to this result." (the parts named only when present); "Send it by" with Email and WhatsApp (WhatsApp only while Kabsi has a number), then only that field. Errors: "Type your email address.", "Type your WhatsApp number with its country code.", "Tick the box to get the report on WhatsApp." The consent words are unchanged.
- **The saved result** (/scan/[code]): the same order; its main finding is the nearby lead and count; its action "Start with a free check." ("free check." on the bar) with the free check box, then the Manager access lines. Expired: "This report has expired." ("expired." on the bar).
- **The empty /scan page**: the side list is "What Kabsi checks" with the pill "About 30 seconds", "On your public Google profile. No access needed." and five yellow numbers (the five rows unchanged). Under "What you get back", the photo salon-tablet ("A salon owner looking at a tablet in her salon").

### Part B: the review link tool (branch claude/scan3-b)

- **Hero**: "Get your Google review link and QR code." ("review link and QR code." on the bar), "One link that opens the review box on your Google profile. Free, no sign-up." and the photo cafe-counter ("A cafe owner at the counter").
- **Search**: the free check's box ("Find your business on Google", "Business name and city", suggestions as you type) with the button "Get my link"; under it "Free, no sign-up." A typed search lists "Pick your business" with "This one" for every match, even one.
- **Steps** (yellow numbers): "Type your business name and city, then choose it." "Check it is your business, or change it." "Put the card by the till, and send the link to every customer."
- **Confirm card**: "Your business on Google", the name, the address, Google Maps, and "Change business".
- **The card** (A6): the business name, "Scan to review us on Google", the code in a yellow frame, "kabsi.co". Under it on the page: "A6 card, 105 by 148 mm. Print it for your counter." Buttons: "Download the card (PNG)", "Download to print (A6 PDF)" and, where the phone can share, "Share the link" (shares "Leave a review for [business] on Google" and the link). "Download QR code" and "Print a counter card" are replaced by these.
- Unchanged: "Your review link", "A message to send after a visit" with its message, the rules banner, the closing free check.

## 59. Site 2: header, footer, WhatsApp marks, photos, an honest About page, Beauty salon (5 Nov 2026, master plan 30.34 item 4)

*Section 58 is Scan 3's, built beside this one.*

### Part A: header and footer (branch claude/site2-a)

- **Header**: "How it works", "Businesses", "Pricing", "Guides", "About", then "Log in" (or "Dashboard" while this browser holds a session, App 4), then "Free check". No dropdowns; the page you are on is underlined (and aria-current). The phone menu shows the same five rows, then "Log in" or "Dashboard", "Check my business free" with the trial line, then "Ask Nora" and "WhatsApp".
- **Footer**: the logo, "Your business on Google. Taken care of." and the Facebook and Instagram icons. Product: "How it works", "Pricing", "Free check", "Review link and QR code". Explore: "Businesses", "Guides", "FAQ", "Partners". Company: "About", "Security", "Founding 25", "Contact", "WhatsApp" (with its glyph). The legal row: "Privacy", "Terms", "Partner terms", "Your privacy choices". One line: "Kabsi is independent and not affiliated with Google. © 2026 Kabsi."
- **Moved out of the footer**: "Kabsi is operated by Rashid Abou Hamzy. Contact: hello@kabsi.co. Card payments will be processed by Creem, our merchant of record." now opens /terms and /privacy. On /privacy, "Who is responsible" reads "The operator, Rashid Abou Hamzy, is also the data controller for the personal data described here." (was the operator line again). "Google's guidance on working with a third party" is a link under the FAQ answer "How do I add Kabsi to my Google profile?". Removed: "Google Business Profile is free from Google. Kabsi is an independent paid service." (the FAQ answer "Can't I do this myself for free?" and /manager-steps still say it).

### Part B: the WhatsApp marks (branch claude/site2-b)

- No words change. The WhatsApp glyph (the one in the repo, `WhatsAppGlyph`) now sits beside every button or link that opens Kabsi's WhatsApp on the public site: "Chat on WhatsApp" (FAQ, "Talk to a person"), "Apply on WhatsApp" (Partners, both buttons), "WhatsApp +1 205 745 6874" (setup help), "WhatsApp +1 205 745 6874" in Nora's hand-over note, and, as before, the footer, the phone menu and every `WhatsAppLink` button.
- And right after the word WhatsApp in each short line that names the WhatsApp approval: Home's hero line ("... and asks for your yes on WhatsApp."), the five steps strip and its rail ("asks you on WhatsApp", Home, How it works, Pricing and the industry pages), and "An approval on WhatsApp" on /login.
- Not on /scan or the review link tool (Scan 3's), not on /app or /staff (App 6's), and never on its own as decoration. Nora's button is still the one floating button.

### Part C: photos and shorter lines (branch claude/site2-c)

- **/for hero**: beside the H1 (its "taken care of." on the bar, unchanged) a collage of four kinds of business from their own wide photos, each a link to its page with its name as a pill: "Hair salons", "Restaurants", "Dental clinics", "Auto repair shops" (each industry's own plural). The photos' alt text is their own (docs/PHOTOS.md).
- **Security**: a hero photo (phone-shop, "A phone in a shop owner's hand") above "As your Manager, Kabsi can" and "Kabsi never can"; a phone approval (phone-reading, "A woman reading a message on her phone") beside "In plain words"; an owner at work (cafe-counter, "A cafe owner at the counter") beside "What Kabsi never does". No words change.
- **Partners hero line** (25 words with the WhatsApp sentence): "Recommend Kabsi to owners you know. You earn while the referred subscription stays paid. Kabsi Partners opens when card payments open. Everything runs on WhatsApp." (was "... to local business owners you know ...").
- **Pricing, Pro's help line**: the help line and "Working hours: Monday to Friday, 9:00 to 18:00, UAE time." are two lines (they were one paragraph of 28 words). No words change.
- **The access steps line** (24 words, the same everywhere: the access steps, the FAQ, the "send these steps" message): "On Google, open your profile, then Menu, Business Profile settings, People and access, Add. Paste 5481006796, choose Manager, then Add (on some screens, Invite)." (was "... open your profile (search your business name while signed in), then ..."). The numbered steps keep "On Google, open your profile: search your business name while signed in."

### Part D: About, true facts only (branch claude/site2-d)

*Replaces the About lines of sections 38 and 55. Every line was checked against the facts and the repo by an independent agent (the session archive lists its findings).*

- **Hero**: H1 "Built for owners who have no time for Google." ("no time for Google." on the bar). Line: "Kabsi does the Google work a local business never gets to, and asks the owner for a yes first." Photo: bakery-counter.
- **Why Kabsi exists** ("exists" on the bar): 1 "Owners run the business all day. The Google profile waits." 2 "Reviews go unanswered and details on Google go out of date." 3 "Kabsi does that work and brings each piece to the owner for a yes."
- **The founder** (charcoal band): Rashid's photo (photos-2026-11-06/rashid-portrait.jpeg, now founder-rashid-800 and -400), "Rashid Abou Hamzy", "Founder" (yellow on charcoal), "Spent years running ads and online presence for local businesses." and "Saw the same gap every time: unanswered reviews and Google details out of date." (from his founder note of 22 Oct 2026). Meta advertising and a real estate partnership were not found in the repo or the facts, so they are left out.
- **We run Kabsi on our own business first** ("our own business"): "Yawmiyati is the founder's own business on Google. What Kabsi did for it:" then "Added to Kabsi on 25 September 2026.", "A reply to a review went live on Google on 22 October 2026, after the owner's yes.", "2 posts and 1 photo went live on Google, each after the owner's yes. Both posts were later taken down.", "Kabsi's checks found 3 differences on Google: address, hours and website. The owner decided each.", "2 weekly reports, for the weeks of 26 October and 2 November." and "From Kabsi's own records, 5 November 2026."
- **How Kabsi is built** ("built"): "Kabsi connects to your Google Business Profile with your permission." (Sync 2a, R-142 item 5: no "API" in an owner line), "Meta's WhatsApp Business Platform, through Kapso.", "Card payments will be processed by Creem, our merchant of record." (Sync 2a, R-142 item 3, until Creem is live), "Kabsi's database in Frankfurt, Germany." then "Kabsi is independent and not affiliated with Google." Changed after the independent check: the Yawmiyati lines say only what the records show (the approvals and the owner's decisions were read back), "our own business" became "the founder's own business", and facts 02 and 04 no longer say Kabsi is in test mode.
- **What you keep** ("you keep"): "Your Google profile": "You stay the owner. Remove Kabsi any time." "Your yes": "Nothing is published on Google before you say yes." "Your choice": "Cancel any time. Your plan runs to the end of the period paid."
- **Talk to the founder** ("the founder"): "On WhatsApp, Nora, Kabsi's assistant, answers at once. Ask for a person and Rashid replies in working hours." "Or email Rashid. A person reads every message." Buttons "Chat on WhatsApp" (with the glyph) and "hello@kabsi.co". "Founding 25 businesses talk to Rashid directly and tell him what to make better."
- **Removed**: the founder quote, "How Kabsi works with owners" and its three principles, "Plain facts" (the operator and Creem lines are on /terms and /privacy) and "Follow Kabsi" (the footer has Facebook and Instagram).

### Part E: Beauty salon, the 21st industry (branch claude/site2-e)

*Every line is in src/content/industries/beauty-salon.ts with its row in docs/claims/beauty-salon.md. Amber Glow Beauty, Dubai, Noor and the nearby names are invented Examples.*

- **Card on /for**: "Beauty salons" · "Makeup, facials and waxing as posts." /for now has 21 kinds of business and a 22nd card on charcoal, "Any other local business" · "Kabsi works for any business with a Google profile. Check yours free." (to /scan, hidden while filtering), so no card sits alone in a last row: 11 rows of 2 below 1024 px, 5 rows of 4 and a centred row of 2 from 1024 px.
- **Query**: "beauty salon Google Business Profile". Title "Beauty salon Google Business Profile help | Kabsi". Description "Kabsi looks after your beauty salon Google Business Profile: treatments as posts, hours checked daily, review replies prepared, all for your yes."
- **Hero**: H1 "Your beauty salon, ready for its close up." ("ready for its close up." on the bar). Line "Your beauty salon Google Business Profile, cared for: treatment posts, true opening times, and review answers you sign off."
- **Answer**: "For a beauty salon Google Business Profile, Kabsi turns treatments into posts, checks your hours daily and prepares review replies, all for your yes."
- **Searches**: beauty salon near me, makeup artist near me, facial near me, waxing near me, eyebrow threading near me, bridal makeup.
- **Your Google profile**: "One menu, many treatments" · "Facials, waxing, makeup and brows: list what you do, so searches find it." "Hours checked every day" · "Kabsi compares the hours Google shows with yours, daily." "Photos of the work" · "In focus and well lit. Kabsi checks each photo before it goes up."
- **What customers write about**: "Praise for the therapist" · "The reply passes the thanks on, using only names on your team list." "A wait or a late start" · "One apology, no promise it cannot keep, and a way to reach you." "A reaction after a treatment" · "No draft: a short checklist, and a neutral holding reply only if you ask."
- **Categories**: Beauty salon (first), Eyelash salon, Nail salon, Day spa · "Category names can differ by country, so check the list in your own profile. Add one only for work you do."
- **Holidays and busy dates**: "Wedding season" · "Bridal slots fill early. A dated post says when you have room." "Eid and National Day" · "Busy days for makeup. Kabsi asks your special hours before each one."
- **Photos and posts**: "Before a big day" · "Bridal or party makeup as a post, with the client's yes first." "The room, ready" · "Chair, mirror and lights, no client. Kabsi checks focus and light."
- **Watch**: "Clients book around work. Kabsi checks the hours Google shows against yours every day." Example: "Google shows Friday 10:00 to 18:00. You told me 10:00 to 22:00."
- **Post Example**: owner "Soft glam for a bride this morning. Noor has Saturday slots." post "Soft glam makeup by Noor. She has slots this Saturday, book online."
- **Jobs**: "Treatments, as posts" · "A photo and a line become a post. Kabsi checks the photo first." "Replies that thank the team" · "Only when the review names someone on your team list." "Holiday hours, asked ahead" · "Before each public holiday, Kabsi asks your hours and sets your answer."
- **FAQ**: "Will Kabsi post photos of my clients?" · "Only photos you send, and only after you approve the post. Ask the client first." "What happens with a review about a skin reaction?" · "It comes to you with no draft and a short checklist. Kabsi writes a neutral holding reply only if you ask." "A client praised our makeup artist. Will the reply mention her?" · "If the client named her and she is on your team list, the draft passes the thanks to her." "Can Kabsi take bookings for my treatments?" · "No. Clients still book the way they do today; Kabsi only looks after your Google profile." "We also do nails and lashes. Which category comes first?" · "The one that describes most of your work, usually Beauty salon. Add the others only if you offer them."
- **Related**: nail salons, lash and brow studios, hair salons, spas and massage, medical and aesthetic clinics, barbershops. Guides: photos, replying to reviews, categories.
- **Share image**: public/og/industries/beauty-salon.jpg, alt "Kabsi. Your beauty salon, ready for its close up."
- **Free check search**: "beauty salon" for the UK and the UAE (migration 20261105200756, source lane_r_approved).

## 61. Launch 1: the last fixes before paid ads (6 Nov 2026, master plan 30.35, R-115)

*Section 60 is App 6's. Every line here was checked against the facts; About's by an independent agent.*

### Part A: About (branch claude/launch1-a, 30.35 items 2 and 3)

- **The founder** (charcoal band): the two lines are now "Works in Meta advertising, e-commerce and digital marketing, and runs the online presence and paid campaigns of a real estate partnership." (Rashid's own stated background, 30.35 item 3; was "Spent years running ads and online presence for local businesses.") and, unchanged, "Saw the same gap every time: unanswered reviews and Google details out of date."
- **Every feature runs on a real Google profile first** ("real Google profile" on the bar; was "We run Kabsi on our own business first"): "Before an owner sees a feature, Kabsi runs it on a real Google profile. What Kabsi did there:" then the same five lines and "From Kabsi's own records, 5 November 2026." The business is not named anywhere public (K-85 item 6, 30.35 item 2): not on About, in the facts, the llms files, Nora's rules or the social images.
- **Facts, FAQ**: the example of a web address Google removes from a name is now "Rosa Bakery.com" to "Rosa Bakery" (an invented example).

### Part B: the report follows the page (branch claude/launch1-b, 30.35 item 4)

*The words are the page's own, from supabase/functions/_shared/visibility/scan-words.ts (src/lib/scan-words.ts re-exports it). tests/launch1-report.test.ts holds them.*

- **Email, after the Google part**: "Where you come up nearby" then "When someone searches for '[term]' near you, you appear [4th] in this Google Maps check." and "You appeared in the first three at [n] of 49 points around you. Most places put you [4th]."; then the heading "Did ChatGPT name your business?" with the answer line ("Yes. ChatGPT named your business.", "No. It named [A and B], which Google Maps shows near you.", "No. ChatGPT did not name your business in this answer." or the "Not clear from this answer ..." line), "Question: '[question]'", "Model: ChatGPT ([model])", "Asked ChatGPT on [date]"; then the link kabsi.co/scan/[code]. Replaced: the count line "In the first 3 at ...", the three nearby places and the heading "An answer customers might see".
- **WhatsApp** (the approved template, its two parameters unchanged in shape, one line, at most 900 characters): the profile line, then the same lines in the same order joined by spaces, each ending with a full stop, then the link. When too long, the profile line is cut first, then the question line.
- A part the check does not hold is left out. A check that never finished: "The nearby search and the AI answer were not part of this check." (unchanged).
### Part C: Settings, finished (branch claude/launch1-c)

- **Where your routine messages go**, when WhatsApp is switched off for owners (whatsapp_owners_on false): "WhatsApp messages from Kabsi are paused for now. Your reports and reminders come by email." Email reads as chosen. The other lines of section 60 are unchanged.
- **The WhatsApp panel**: "Review alerts with Approve" and "Your weekly report on WhatsApp" move at once; a failed save puts the switch back with "Couldn't save that. It is back as it was. Try again." (section 60's line; was "Couldn't save. Please try again.").
- No other words change. The field "Also send review alerts to (optional, up to 3)" gets its own id (it shared one with the "Review emails" heading).

## 62. Launch 2: the last fixes from Launch 1 and the audit of 6 Nov (6 Nov 2026, master plan 30.36, R-116)

### Part A: Launch 1 leftovers (branch claude/launch2-a, 30.36 items 3 to 5)

- **Nora** (her rules, 30.36 item 3): "When the visitor asks for help, or asks for a guide or page that is not in the list, say so plainly and, in that same reply, give both ways to reach a person, copied from the knowledge base: the free 20-minute setup call at kabsi.co/setup-call and hello@kabsi.co, where a person answers." A kabsi.co link that is not a public page is taken out by code: a Markdown link keeps its words, a bare address becomes "kabsi.co".
- **Settings, Team** (30.36 item 5): invite, role change, remove, cancel invitation and the approval choices show at once. A failed save: "Couldn't save that. It is back as it was. Try again.", after the plain reason when there is one ("This person is already on your team."). A removal that saved: "[email] was removed." The invitation line "Invitation sent to [email]." is unchanged.
- No visible line changes for the Conversions API (30.36 item 4).

### Part B: the review link tool tells the truth (branch claude/launch2-b, 30.36 item 7)

- **Copy (every page that uses the shared copy field: the review link tool, onboarding's setup link, the team photo link)**: "Copied" only after the copy worked. When it fails the button stays, the link is selected, and the line (announced) is "Press and hold the link to copy it." on a phone, "Press Ctrl+C or Cmd+C to copy it." on a computer.
- **Test the link** (a secondary action beside Copy link), and under the result: "Check it opens your business. Google may ask customers to sign in before they write a review."
- **Name on the card** (only when the card cannot print Google's name in full): the field "Name on the card", filled with what the card can print, and "Type the business name in English letters as you want it printed." The confirm card shows that name (or "Your business" while the field is empty); the message reads "Thank you for visiting [name]." or "Thank you for visiting us." while it is empty. No Arabic is shown (R-61).
- **A card the device cannot draw**: "The card could not be made on this device. Try the PDF, or another browser."
- **Busy** (this tool only; the free check keeps its own line): "The review link tool is busy right now." then "Try again in a few minutes.", with "Start your free trial" kept. Was "Today's free checks are used up." and the shared line.
- **The guide google-review-link-and-qr-code**: "get Google's own review link" becomes "get a review link for your Google profile".

### Part C: one door to sign-up (branch claude/launch2-c, 30.36 item 8)

- **Pricing's plan buttons** and **the guides' "Start free"** keep their words; they now go to Log in and then to setup (/start). A signed-in owner without a business goes to /start, one with a business to the dashboard.
- **/get-started** is gone: its two screens ("Which business is yours?" and "Here's what customers see", with "Save your snapshot and continue") are removed, and the address answers with a 301 to /scan.
- **Nora on WhatsApp**: her example address is kabsi.co/scan (was kabsi.co/get-started).

### Part E: "A reply ready for every review" (branch claude/launch2-e, 30.36 item 10)

*A reply goes live only after the owner's yes, so "answered" said more than Kabsi does.*

- **Home's supporting line and meta description** (hero-lines.ts HOME_LINE): was "Your details kept right, every review answered and your profile kept fresh, without doing it yourself. Kabsi prepares the work and asks for your yes before anything goes live." (175 characters); now "Your details kept right, a reply ready for every review and your profile kept fresh, without doing it yourself. Kabsi prepares the work, and nothing goes live without your yes." (176 characters).
- **Home, "The work your Google profile needs, every week."** (d8-data.ts): the card title "Every review answered" is now "A reply ready for every review"; its text is unchanged.
- **The line under the homepage headline** (site.ts heroSub): "Every review answered, every change to your Google profile caught, a fresh post every week." is now "A reply ready for every review, every change to your Google profile caught, a fresh post every week."; the WhatsApp sentence after it is unchanged.
- Facts 04 carries the new line; Nora's rules did not use the old words.

### Part D: holidays by UK nation (branch claude/launch2-d, 30.36 item 9)

- No new line. The holiday question keeps its words ("Your hours for [holiday]", "[holiday] is on [day]. Customers check Google for your hours first, so tell Kabsi what you will do."); a Scottish or Northern Ireland business now gets its own nation's holidays, with GOV.UK's names (for example "St Andrew's Day", "2nd January (substitute day)", "Battle of the Boyne (Orangemen's Day)").

## 63. Launch 3: links in Kabsi's own messages (6 Nov 2026, master plan 30.36 item 8, R-116)

### Part A: the /get-started links (branch claude/launch3-a)

- **No words changed.** Only the address in each line. Starting or signing up links https://kabsi.co/login?next=/start: the trial line ("Start free here, no card, about 10 minutes:" then the link, and "The free trial starts once Kabsi can reach your Google profile." on its own line), the partner code line (Sync 2a: now "Thanks, your partner code is noted." with no link, section 69), the needs-an-account line ("Start free, no card:") and the free check email's button "Start your free trial" (and the same line in its plain text).
- **A reply about a check** links the saved result. When a scan code arrives: "Thanks, I have your scan [code]. Your full map comes here as soon as it is ready. Kabsi is free for 14 days, no card. Your saved result: https://kabsi.co/scan/[code]". When only a business name arrives: "You can check your business free at https://kabsi.co/scan and send me the code from the page." (Sync 2a, R-142 item 7: the promise "I will run the scan for [name] here as soon as maps are switched on for WhatsApp" is gone; see section 69.)
- Approved WhatsApp templates: none holds a link, so none changes.

### Part B: the contact list notice on /privacy (branch claude/launch3-b, 30.37 item 6, R-117)

- **/privacy** has a new section 15, "Businesses on Kabsi's contact list" ("Changes" is now 16; the date at the top is 6 November 2026). Three short paragraphs, under 200 words, in the page's own voice: who keeps the list and what it holds (name, kind of business, address, phone number, website and an email address the business publishes itself, from OpenStreetMap and the business's own website, no names of owners or staff); the lawful basis (legitimate interests: telling businesses about a service that may help them), that no message has been sent and none is sent without a further check of the law in the country where the business is, the six-month check and the closed mark, and that the list is held privately and never sold or shared; and how a business asks to be removed or never contacted (hello@kabsi.co, Kabsi acts within 30 days) with the right to ask what Kabsi holds, to object and to complain to the data protection authority.
- Never in it: the name of the collection tool, the number of countries, any number of businesses.
- Facts 11 (9.2, 9.3, 9.7) say the same; Nora's rules did not say Kabsi holds no such data and are unchanged.

## 64. Launch 4: the contact list's retention (6 Nov 2026, master plan 30.38 item 2, R-118)

- **/privacy section 15**, second paragraph, after "marks one that has closed.": "We delete an entry 24 months after we add it, or 90 days after the business closes, whichever is sooner."
- Third paragraph now opens: "If you ask us to remove your business or never contact it, we do so within 30 days and keep only a coded form of the address, so we never write to it. Write to hello@kabsi.co." It replaces "Any business can ask to be removed or never to be contacted. Write to hello@kabsi.co and Kabsi acts within 30 days. A business that asks never to be contacted goes on a list that stops it being added again.", which the new sentence covers, so the section stays under 220 words (209). The rights line after it is unchanged.
- Facts 11 says the same (the contact list bullet and the retention table row).


## 65. Outbound emails (6 Nov 2026, master plan 30.39, R-119)

Plain text only, sent as Rashid Abou Hamzy <rashid@getkabsi.com>. Filled from these templates by outbound-prepare with no AI call (`supabase/functions/_shared/outbound/rules.ts`, tested word for word). Email 1 and the follow-up carry no Facebook or Instagram address and no "Drafted with Nora" (30.39 item 6); R-59 holds everywhere else. Paragraphs are separated by one blank line.

**The possessive of the business name** (lane R, 7 Nov 2026), in every Outbound subject and body (Email 1, the follow-up and the reply to a yes): a name ending in s takes only an apostrophe ("Harbor Barbers' Google profile", "Maple Nails' Google profile", "Moss' Google profile"); a name already ending in an apostrophe is left as it is; any other name takes 's ("Rose Lane Salon's Google profile"). Below, "<business>'s" means this rule. Clean 2 (7 Nov 2026) moved it to one shared helper, `possessive()` in `supabase/functions/_shared/possessive.ts`, used by every product message that writes "<name>'s": Outbound, the access works and Kabsi is disconnected emails, the staff line for an ended plan and the AI answer finding. A new message that needs it imports the helper and never writes `'s` after a name by hand.

**Email 1.** Subject: "<business>'s Google profile"

"Hi <business> team,
I came across <business> looking at <kind> in <city>. <detail sentence>
I run Kabsi. It prepares your Google review replies, posts and opening hours, and you approve each one on WhatsApp before anything goes live.
Want me to run a free check of <business>'s Google profile and send you what I find?
Rashid Abou Hamzy, founder of Kabsi
kabsi.co"

Footer: "Why you got this: your business email is on your website. Reply 'no thanks' and I will not write again. How Kabsi handles data: kabsi.co/privacy"

**Detail sentences**, the first that is true on the page read at draft time; none true means no draft:
- A booking system named: "I saw you take bookings through <system>, so customers find you online already."
- Hours on the site: "Your site lists your opening hours, and keeping Google's hours the same saves wasted trips."
- Instagram linked: "Your Instagram shows the work, and the same photos could do well on your Google profile."
- The site updated this year or last: "Your site looks recently updated, so your Google profile is the next place customers check."

**<kind>**, from Harvey's industry. The six salon industries come first, in this order (lane R, 9 Nov 2026, R-142 decision 4c): hair salons (hair salon), barbers (barbershop), beauty salons (beauty salon), nail salons (nail salon), lash and brow studios (lash and brow studio), spas and massage studios (spa and massage). Then: clinics, dentists, physiotherapists, cafes, restaurants, car repair garages, gyms, vets.

**Changed by Sync 2b (9 Nov 2026, R-142 decision 4a, master plan 30.45 item 5).** Email 1 offers only the free Google check: the line "We're taking 25 founding businesses, with three months of Pro free." is removed. The reply to a yes gives the check and the founding price sentence of section 34 (the first 30 paying businesses), never Founding 25 and never "25 founding businesses". Outbound writes only to UK registered companies active on Companies House; the UAE and every other country stay off.

**Follow-up**, day 4 or 5, same thread. Subject: "Re: <business>'s Google profile"

"Hi again. Happy to run that free check of <business>'s Google profile if useful. A yes is enough, and if not, no worries."
then the same signature and footer.

**Rashid's reply to a clear yes** (drafted for him by outbound-inbox from this template, never sent without his Send; lane R, 6 Nov 2026, word for word; no "Drafted with Nora", because a template wrote it):

"Hi <business> team,

Thanks. Here is the free check of <business>'s Google profile: kabsi.co/scan/<code>

The first 30 paying businesses pay the founding price and keep it while they stay subscribed: Essentials $19 a month or $190 a year, Pro $39 a month or $390 a year.

Rashid Abou Hamzy, founder of Kabsi
kabsi.co
Facebook: <R-59 address>
Instagram: <R-59 address>"

**The staff page kabsi.co/staff/outbound** (Harvey 4A part C): H1 "Emails waiting for your yes" (highlight on "your yes"); line "The day's drafts with their sources, the replies that need you, and whether sending is locked." Panels: "Sending" (one of: "Sending is locked. Test mode: only the test addresses receive mail." / "Sending is locked. Nothing is prepared or sent." / "Sending is open since <date>. Only what you approve is sent." / "Stopped on <date>: <reason>. Only lane R reopens it.", then "Approved and waiting to send: <n>."), "Today's drafts" (each with Source page, Read on, Detail, Company number with its status and "Companies House file of <date>"; buttons Approve, Edit, Edit follow-up, Skip; at the end "Read every draft above first. This approves the <n> shown and their follow-ups." and "Approve all <n>"), "Replies" (each reply with "Your answer, ready to send" and Send, Edit, Skip, or "No answer is prepared. Kabsi drafts one only for a clear yes. Answer from rashid@getkabsi.com, then tap Done." with a Done button). There is no control that opens sending.

## 66. Fixes A: the lines of the ChatGPT pre-launch audit (8 Nov 2026, master plan 30.41, R-126)

- **Home hero (COPY-01):** under the lead, one line built from the plan price and TRIAL_LINE: "Plans from 29 US dollars a month. Free for 14 days once Kabsi is connected. No card." (HERO_PRICE_LINE in src/lib/site.ts.)
- **Free check (COPY-02):** SCAN_LINE is "Free check. No account and no Google access needed." Under the search box on Home, /scan and the /for pages: "The 14-day free trial is separate. It starts once Kabsi is a Manager on your profile." "Takes about 10 seconds" is gone: the database holds no timing for the quick check, and the full check's median is 353 seconds. Changed by R-131 (8 Nov 2026): the quick check says "About 30 seconds" wherever it says a time (9 real runs took 5.6 to 33.5 seconds, median 21.6). The 10 seconds of Undo after an approval are a different thing and stay.
- **Plan lines (COPY-03):** Essentials "For an owner who wants every review answered, the profile kept right and 2 posts a month made ready." Pro "For a busier business: a post every week and a team that approves." Both match plan_limits() (posts_per_month 2; weekly_posts, team_roles) and the plan table.
- **Setup call (CONV-01):** while BOOKING_READY is false every booking button reads "Email us to arrange a call" with the helper "Tell us your business name and a good time. We reply by email." When BOOKING_READY is true the earlier words come back ("Book a free 20-minute setup call", "Book a short call", "Book the call").
- **Delete this business (DSH-04):** "After 7 days we delete its reviews, drafts, posts, photos, reports and settings. Your review link and QR code stop working, including on any NFC card or sticker that carries them." The next line, "Payment records are kept where the law requires.", matches the deletion job.
- **Weekly report email (EMAIL-01):** subject "Your Kabsi week: 3 replies, 1 post, 2 profile changes", a part with a count of zero left out. A week with nothing sent: "Your Kabsi week: your profile was checked, nothing needed you"; if something waits for a yes: "Your Kabsi week: your profile was checked, 2 things are waiting for your yes". First line of the body: "After your yes, Kabsi sent 3 replies, 1 post and 2 profile changes to Google. 2 things are waiting for your yes." or "Kabsi sent nothing to Google this week. Nothing is waiting for your yes."

## 67. Fixes B: examples that fit the business, honest Prepared and Done, Home counts (8 Nov 2026, R-126, from the ChatGPT pre-launch audit)

- Reports lead follows the owner's channel (DSH-02). WhatsApp: "Every Monday on WhatsApp. The last 12 weeks are here." Email: "Every Monday by email. The last 12 weeks are here. You can switch to WhatsApp in Settings." While the choice is being read, or when the read fails, the page shows no lead.
- Profile Coach while Google's details read "Not checked yet" (DSH-03): an item the business filled in shows the pill "Prepared" (neutral, not green), and the counter reads "<n> of 8 prepared. Google check pending." "Done" and "<n> of 8 done" return only after Kabsi has read the live Google profile. Items that are not filled in keep "To do", "Not checked yet" and "Later".
- Home (DSH-05, DSH-08), at the top three small counts: "Needs your yes <n>", "Urgent <n>", "Done this week <n>" (the last opens the latest report). Then "Needs your yes" shows the first 3 waiting items, urgent ones first and never behind the fold, then "See all <n>" shows the rest in place and becomes "Show fewer". Each item keeps its own Approve, Edit and Details; nothing is approved in bulk.
- Insights, An answer customers might see, on an Example business (DSH-07): the outlined "Example" badge and "Example answer. Example sources, not live citations." under the "Asked on" line. The example sources fit the trade (a hair guide under a salon, a food guide under a cafe).
- Insights, Search terms on an Example business (DSH-01): seven example terms that fit the trade, in the same shape (five with a count, two "fewer than 15"): hair salon, barber, beauty and nails, spa, clinic, restaurant, cafe, gym, and a general list for anything else. A hair salon never shows a cafe term.

## 68. F-1: a forwarded Yes (8 Nov 2026, WhatsApp)

- A message the owner forwards to Kabsi never counts as their own yes. When a forwarded "Yes" meets something waiting for a yes, nothing is approved and the owner reads: "That looks forwarded, so I did not count it as your yes. Tap Yes, or type it yourself." (SAY.forwardedYes in supabase/functions/_shared/whatsapp/say.ts.)

## 69. Sync 2a: lane R's answers to Sync 1 (9 Nov 2026, master plan 30.46, R-142)

### Part 1: early access, booking words, API, WhatsApp lines

- **Early access is over (item 1).** No line says early access, test mode, 20 businesses, a person posting by hand or Google Protection off. The two holiday guides lose their early access sentences: "Nothing goes to Google until you approve it." (holiday hours) and "Google Protection works once Kabsi is connected to Google." (someone changed my hours). The status line while the invitation is not yet seen reads "A person on the Kabsi team accepts the invitation within one working day. You can close this page." The invitation accepted by a person within one working day stays.
- **Booking words (item 2).** Tattoo studio job "Booking rules, kept right" is "House rules in your description, kept right"; its lead, description, line and /for card say "house rules" in place of "booking rules" ("House rules right, healed work as posts."). The no-shows guide ends its Kabsi section "Kabsi works only with your Google profile." and publishes on 21 Dec 2026. Guides that describe Google's own booking features, "Is Kabsi a booking system? No" and the example post calls to action stay.
- **No "API" in an owner line (item 5).** The AI answer label is "Answers we get from ChatGPT and Perplexity directly, which can differ from what their apps show." (Home, the weekly report and the account); the FAQ answer says "directly" in place of "through their API"; About reads "Kabsi connects to your Google Business Profile with your permission." Pro line: "For a busier business: a post every week and a team that approves." and the Pro work and table rows read "A post every week".
- **WhatsApp (item 7).** Hand-off by role: "Thanks. A person from Kabsi will answer you here the same working day." (an Essentials owner), "... within 4 working hours." (a Pro owner), "... within one working day." (anyone else), each followed by "Working hours: Monday to Friday, 9:00 to 18:00, UAE time." Scan reply: "You can check your business free at https://kabsi.co/scan and send me the code from the page." Partner code reply: "Thanks, your partner code is noted."

### Part 2: card payments closed, templates, Nora

- **Card payments are closed (item 3).** The renewal reminder emails (`renew_r5`, `renew_r1`, "Your plan is ending", button "Renew your plan") are retired with their job: no prepaid plan exists and Creem renews. The paused email and its WhatsApp message read "Your Kabsi plan for [Business] is paused. Approvals have stopped and nothing is lost. Your account and its history stay. Ask us any time to delete them. Nothing to pay today. Card payments in US dollars are coming." (button "Open Kabsi"). The ended email and message: "Your Kabsi plan for [Business] has ended. Thank you for trusting Kabsi with your Google profile. Your account and its history stay. Ask us any time to delete them. Nothing to pay today. Card payments in US dollars are coming." The cancelled email's second card reads "Kabsi stops publishing. Your account and its history stay. Ask us any time to delete them. You keep your review link and QR code. To remove Kabsi as a Manager, open People and access on Google." The Plan page banner for a paused or ended plan ends with "Your account and its history stay. Ask us any time to delete them." No line says data is kept for 30 days or deleted after a plan ends.
- **WhatsApp billing replies (WA-07).** No paid plan: "[Business] has no paid plan right now. Nothing to pay today. Card payments in US dollars are coming. Your plan page: [link]". A refused approval on an ended plan: "Your plan has ended, so nothing can be published. Nothing to pay today. Card payments in US dollars are coming."
- **Creem lines (PUB-07).** Pricing, "Can I pay today?": "Nothing to pay today. Card payments in US dollars are coming. Card payments will be processed by Creem, our merchant of record." About, "How Kabsi is built": "Card payments will be processed by Creem, our merchant of record." The security page, the Plan page and the footer keep the present tense line (LATER row).
- **Templates (item 6).** `kabsi_work_update` is retired in code; `kabsi_work_update_v2` is the one name. `kabsi_map_ready` keeps "Visibility Map" (section 0.1 names the exception). No template is submitted.
- **Nora (item 8).** She may answer in the visitor's language, Arabic script included, in the chat only. For bookings, customers' requests or a booking assistant: "Kabsi looks after your Google Business Profile. It is not a booking system and does not keep your customers' bookings or requests." (facts 04, section 2.1b, and nora-rules.ts; evaluation questions sc04 in English and sc05 in Spanish).

### Part 3: the plain fixes of Sync 1

- **EML-07.** The team invitation footer reads "Why you got this: Someone at [Business] invited you to Kabsi." (it said "You asked for this email").
- **EML-08.** The plain text holiday hours email names the Hours link once: "Your hours in Kabsi: [link]", then the note "You can also answer in Kabsi, under Hours."
- **EML-12.** The email previews show the billing paused, ended and payment reminder emails and the Founding 25 day 60, 85 and 90 emails (50 previews).
- **GA-11.** Facts 12 gives the Maps steps for a duplicate profile: Suggest an edit, Place closed or not here, Duplicate of another place, Submit.
- **IND-03.** The medical and aesthetic clinic free check term is "aesthetic clinic" (the page keyword and the UAE word) and "skin clinic" in the UK (facts 01 and 09 agree); the London Example reads "skin clinic".
- **KB-39.** Beauty salons card on /for and in llms.txt: "Makeup, facials and waxing as posts."

## 70. Sync 2b: the legal lines and the contact list notice (9 Nov 2026, lane R R-142 decisions 4d and 9)

Lane R's words, word for word. This is not legal advice: every line is listed for the Gate 3 legal review in `docs/progress/archive/2026-11-09-sync2b.md`.

- **/privacy, date:** "9 November 2026". **/terms, date:** "9 November 2026". /security has no date line.
- **/privacy section 2 (LEG-17):** "If you sign in with Google: Kabsi receives your name, email address and profile photo from Google."
- **/privacy section 3 (decision 4d):** "We don't sell or rent personal data, we don't use it for advertising, and we don't send marketing emails to Kabsi users or visitors without asking first. Kabsi may send one plain email, and one follow-up, to a UK registered company at the address it publishes, as section 15 explains."
- **/privacy section 6 (LEG-14):** "When switched on, Creem: card payments. Creem is our merchant of record and receives what it needs to take a payment." GitHub "also holds the contact list of section 15 in a private repository"; Zoho is also "the mailbox that sends and receives the emails of section 15".
- **/privacy section 7 (LEG-15, LEG-16):** after the Conversions API sentence, "A finished free check and a contact you give (the check's report sent to you, or a Founding 25 application) also go from Kabsi's servers, only where your privacy choice allows ad measurement, with the same event id as your browser's so Meta counts each once. They carry only a hashed random visitor id and Meta's own browser cookies, never your email, phone, name or business."; the bar: "In the EU, the EEA, the UK, Switzerland, the United Arab Emirates and Saudi Arabia, and where the country is not known, a small bar at the bottom asks once".
- **/privacy section 9 (LEG-07):** "A free check's results: the business's public Google Maps results, the findings of one AI answer about it and the nearby places are kept 30 days, or 90 days once the business signs up. Nothing from Google's Places service is kept but the Place ID."
- **/privacy section 14 and /terms section 16 (LEG-21):** "map location" for "map pin".
- **/privacy section 15 (decision 4d, the article 14 notice):** four paragraphs: what the list holds (with the company number and status for a UK company), the sources (OpenStreetMap, the business's own website and Companies House), where it is held (Kabsi's database and a private GitHub repository); UK registered companies active on Companies House only, one plain email and one follow-up, the UAE and every other country off, nothing sent before Rashid decides to start; the six-month check, the 24-month and 90-day deletions, the 90-day deletion after the last email with only a coded form of the domain kept; removal within 30 days, a request from the business's own domain covers the whole business, the rights.
- **/terms section 9 (LEG-09):** "Card payments are not open yet, so nothing is charged today. The rules below apply from the day card payments open." then a Creem subscription that renews every month or year from the day you paid until you cancel; the paid period starts the day you pay (retired by Tidy 1, R-143 item 3: "and if you pay before Kabsi's access works the plan starts the day it works"); Pro at once, Essentials from the next renewal; an extra location renews on its own date; cancelling on the Plan page stops the next renewal; a failed renewal gives 7 days, then the plan is paused. Retired: "Paying again before a plan ends adds the new period after the current one. Plans don't renew automatically." and "If you pay during your trial, your paid plan starts the day the trial ends."
- **/security (LEG-18):** "You sign in with Google or a one time code sent to your email. No passwords."

## 71. Tidy 1: the leftovers of Sync 2a, Sync 2b and Kapso 1 (9 Nov 2026, master plan 30.47, R-143)

- **Creem lines are future tense (item 1).** Wherever the line stood in the present, it reads "Card payments will be processed by Creem, our merchant of record.": /security, the Plan page (`PLAN_COPY.creem`), the line that opens /terms and /privacy (`MERCHANT_LINE`), /terms section 8 and the facts. Retired: "Payments are processed by Creem, our merchant of record." The receipt email keeps the present tense, because it is only sent after a payment. The line goes back to the present tense when Creem is live.
- **The asked line (item 2).** The free check: "Asked ChatGPT on [date], with web search. The ChatGPT app can answer differently, and answers change from run to run." (its Perplexity twin: "Asked Perplexity on [date]. The Perplexity app can answer differently, and answers change from run to run."). The scan words and the emailed and WhatsApp report: "Asked ChatGPT on [date]". The page note under the answer: "One sample answer. The ChatGPT app can answer differently, and answers change from run to run." Retired: "Asked on [date] through OpenAI's API, with web search." and "One sample answer, asked through OpenAI's API."
- **Map location (item 5).** "map pin" is "map location" everywhere an owner reads it: the watched list on Home, the change card, the Google Profile field names, the Google Protection screen, the alerts, the guide on wrong details and facts 13, and the WhatsApp consent text ("Changes to your business name, address, categories, map location, phone or opening status are never approved on WhatsApp."). The consent text is not Kapso template text (no template holds it): owners who connect from now on store the new wording, and a consent stored before keeps the wording it was given with.
- **Renewals (item 5).** Facts 06 and 13: a plan is a Creem subscription that renews every month or year from the day it was paid until the owner cancels, applying once card payments open; nothing is charged and nothing renews today.
- **Approved as they are (item 7).** The Founding 25 day 60 email has no button (section 26); a trial owner is told "within 4 working hours" (the help lines, section 34).
- **Checkout only once access works (item 3).** /terms section 9 no longer says: "If you pay before Kabsi's access to your Google profile works, your plan starts the day it works, so you don't lose any days while you wait." Card checkout is offered only to a business whose Google access works. The Plan page, before access has started: the choose buttons are off and the line under the plans reads "You can choose a plan once Kabsi's access works."; the checkout answers "You can choose a plan once Kabsi's access to your Google profile works. Nothing is charged before then." (both lines are new, for lane R to read). No 14-day notice email is sent for the terms change now (terms section 18 stays as it is).

## 72. Industry 1: each industry page mostly its own text (9 Nov 2026, lane R R-144)

*Changes sections 52 and 56 for the twenty-one industry pages. SEO 1's measure (the text of the page's main part, in sentences) found 104 template sentences on every page; this section cuts the shared blocks to a line and a link each and adds each trade's own groups. Every trade line has its row in the "Industry 1" section of its claim sheet (docs/claims/<slug>.md). Every business, person and number is an invented Example. [trade] is the page's name ("hair salon"), [a trade] with its article, [plural] its plural in lower case, [business] its Example business.*

### The template (d9-industry.tsx), in page order

- **How Kabsi works** (replaces the five steps on the industry pages; the five steps stay on Home, Pricing and How it works): three numbered lines, "Kabsi checks your [trade]'s Google profile every day.", "It prepares the replies, posts and fixes [a trade] needs, and asks you on WhatsApp.", "Nothing reaches your [trade]'s Google profile until you say yes.", then the link "See how it works" (to /how-it-works). For screen readers the heading is "How Kabsi works for [a trade]".
- **Profile watch:** the headline's bar is "watches for [a trade]". The two boxes are labelled "On Google: [detail]" and "You told Kabsi: [detail]" (were "What Google shows" and "What you told Kabsi" with the detail under them). The message label is "[business]'s Google profile, on kabsi.co". The screen reader caption ends "..., so nothing changes without the owner's yes."
- **The photo band** (charcoal): label "For [plural]"; headline "Photos" with "that work for [a trade]." in yellow; the trade's own photo cards, numbered, each a title and one line; the Example chat beside it as before but without the times and the state list. Caption: "Example: the owner sends a photo with the line '[line]' on WhatsApp and Kabsi prepares the Google post '[post]' with that photo, for the owner's yes." Home keeps "Send a photo. Get a Google post." with its three points.
- **Jobs:** "Google jobs that come back for [a trade]." with "come back for [a trade]." on the bar; label "For [plural]" as before.
- **How people find [a trade]** (replaces "Where you show up" and "What people search for" on the industry pages; bar: "find [a trade]"): the trade's answer line, the searches as chips, "Searches like these for [a trade]: on Pro, Kabsi shows the words people searched on Google to find you.", the free check link, and beside them the AI answer Example titled "What AI says about [business]." with the question and "Asked ChatGPT on 2 Nov 2026, about [business]." (the line "An answer customers might see" and the Question, Assistant and Asked on rows stay on Home). The nearby map and "Two checks Kabsi runs, shown as they are. No score." stay on Home.
- **Your Google profile, as [a trade] owner** (bar: "Your Google profile"), then in one section: "Google categories for [a trade]" (the first category marked for screen readers in the list's name, "Google categories, [category] first"), "What [a trade] can list" (the services as chips, new), "What customers write about [a trade]", "Posts [a trade] can make" (new), "Hours and holidays at [a trade]" (was "Holidays and busy dates"). "See how it works" and "See the plans" under the groups are gone (each has its own place now).
- **The plans in one line** (replaces "Two plans. The work comes first." and the two plan cards on the industry pages): "Two plans for your [trade], Essentials and Pro. Free for 14 days once Kabsi is connected. No card." and the link "See the plans" (to /pricing). No price on the industry pages; Pricing and Home are unchanged.
- **Questions [trade] owners ask:** only the trade's own questions (five on every page); questions about approvals by a manager, removing Kabsi and what Kabsi can see of customer records left the industry pages (they are on /faq). Under the answers: "More questions" (to /faq). The FAQPage data lists the questions on the page. An answer that began "No." or "Yes." now reads "No, ..." or "Yes, ...".
- **More for [plural]** (was "Read next."; bar: "More"): "Guides for [plural]" (three guide cards as before) and "Businesses like [plural]" with "See every business" (six related businesses as photo cards with the name only; the card line stays on /for).
- The closing free check is unchanged.

### Each page: the new and changed lines

**/for/auto-repair**
- What it can list: MOT, Full service, Brake repair, Clutch replacement, Diagnostics, Tyres, Air conditioning recharge.
- Cards and questions, new or reworded (title / line; Q question / answer): "A safety problem with the car" / "A safety matter: no draft, and a checklist goes to you."; "Ramadan, UAE" / "UAE private sector days are two hours shorter. Check key collection times against them."; "The bays at opening time" / "A clear floor and tools on the wall, shot before the first job."; "Brake checks, with your price" / "Only the price you send, in a post you approve."; "MOT slots this week" / "A dated update for the free slots in your diary."; "Air con before summer" / "A seasonal check, written from what you really offer."; Q "What if a review names a mechanic?" / "The reply thanks that mechanic only if the name is on your team list. Kabsi never guesses one.".

**/for/bakery**
- What it can list: Sourdough loaves, Celebration cakes, Wedding cakes, Morning pastries, Wholesale bread, Cupcakes.
- Cards and questions, new or reworded (title / line; Q question / answer): "An allergy or a reaction" / "No draft for an allergy: a checklist reaches you first."; "The window from the street" / "Google says an outside photo helps people recognise the shop."; "The first loaf out" / "A photo at opening and one line about what is warm."; "Weekend cake orders" / "The order deadline for Saturday cakes, with its date."; "A seasonal bake" / "Hot cross buns or mince pies, the week they come back."; Q "Can Kabsi write the allergens for a cake?" / "No, Kabsi writes only facts you give it; allergen information comes from your recipes and local rules. A review about a reaction gets no draft."; Q "Can Kabsi take cake orders on WhatsApp?" / "No, the Kabsi chat is between Kabsi and you. It prepares your hours, posts and replies, and does not talk to your customers."; Q "Will Kabsi post prices for cakes?" / "Yes, the prices on your cake list, exactly, once you approve. Nothing is made up.".

**/for/barbershop**
- Categories (new or changed): "Barber shop".
- What it can list: Skin fade, Scissor cut, Beard trim, Hot towel shave, Line up, Kids' cut, Head shave.
- Cards and questions, new or reworded (title / line; Q question / answer): "Walk-ins or bookings, said once" / "Write in your description which days take walk-ins and which need booking."; "Your phone, for walk-in questions" / "Kabsi checks the number Google shows against yours every day."; "A long Saturday wait" / "One apology, no excuse, and no promise of a shorter queue."; "A nick from the razor" / "That is an injury: no draft, just a checklist sent to you."; "The rush before a bank holiday" / "Kabsi asks five days ahead, so extra chairs and hours are set in time."; "The fade from behind" / "Clean neckline, plain wall, good light. The cut is the subject."; "The shop from the street" / "Google says an outside photo helps people recognise you as they arrive."; "Chairs at opening time" / "Empty chairs and a tidy counter show a walk-in what to expect."; "Walk-in hours this week" / "A late Thursday or an early Saturday start, said plainly."; "A new barber joins" / "Their name and the cuts they do best, drafted for your yes."; "Your price list" / "A photo of the board, posted only as you wrote it."; Q "Is Kabsi a booking system?" / "No, Kabsi looks after your Google profile: hours, replies, posts and photos. It does not take bookings."; Q "Does Kabsi message my customers?" / "No, Kabsi messages the shop owner, never the customer in the chair. You hand out the review card after a cut."; Q "Can Kabsi post our prices?" / "Yes, the prices on your board, word for word, once you approve the post. It never makes up a deal."; line "Barber shop has its own place in Google's list, apart from hair salons. Read the name in your own category box.".

**/for/beauty-salon**
- What it can list: Facials, Full leg wax, Bridal makeup, Party makeup, Eyebrow shaping, Henna, Manicure and pedicure.
- Cards and questions, new or reworded (title / line; Q question / answer): "Bridal packages as offers" / "An offer post carries a View Offer button. Give each one an end date."; "Hours on Google, read daily" / "Kabsi reads your hours every day and asks when Google shows others."; "Visits to brides at home" / "If you travel to them, set a service area beside your address."; "A reaction after a treatment" / "A skin reaction is a health matter: no draft, a checklist instead."; "Later nights in Ramadan" / "Evening hours go on Google as special hours, after your yes."; "Threading and brows, close" / "One brow, sharp and well lit, with no filter over the skin."; "A new facial on the menu" / "What it is and how long it takes, in your words."; "Makeup for Eid" / "A dated post for the days you take Eid bookings."; "Bridal slots still open" / "Which Fridays have room, posted with the dates."; "Eid and holiday hours in time" / "Before each public holiday, Kabsi asks your hours and sets your answer."; Q "What happens with a review about a skin reaction?" / "It waits for you with a short checklist and no draft. You choose to reply, ask for a holding reply, or leave it."; Q "Can Kabsi take bookings for my treatments?" / "No, clients still book the way they do today; Kabsi only looks after your Google profile."; line "Clients book around work, so Kabsi reads the hours on Google each day and compares them with yours.".

**/for/cafe**
- What it can list: Breakfast, Brunch, Takeaway coffee, Cakes and pastries, Oat and soy milk, Afternoon tea.
- Cards and questions, new or reworded (title / line; Q question / answer): "Feeling unwell after a meal" / "Illness after food gets no draft; a checklist comes to you."; "Ramadan, UAE" / "UAE private sector days run two hours shorter; your hours follow your yes."; "The room at a quiet hour" / "Tables, light and the counter, with no customers in the frame."; "A seasonal drink" / "Iced, spiced or new, with the dates it is on."; "A new blend" / "Where the beans come from, if you tell Kabsi."; "Laptop hours" / "When the room is quiet enough to work, in your words."; Q "Will Kabsi change my menu prices on Google?" / "No, menu prices on Google are yours to edit; Kabsi only posts prices you send."; Q "Does Kabsi post to Instagram or my delivery platforms?" / "No, Kabsi works with your Google profile only. It does not post anywhere else and it does not manage your delivery platforms."; Q "A customer says they were ill after eating here; how is that handled?" / "No draft. A short checklist reaches you, and a holding reply is written only when you ask for one."; Q "Can Kabsi reply to reviews in other languages?" / "Yes, each draft is written in the language of the review, and you approve it like any other.".

**/for/car-wash**
- What it can list: Hand wash, Valet, Interior clean, Full detail, Ceramic coating, Engine bay clean.
- Cards and questions, new or reworded (title / line; Q question / answer): "Each wash with a price" / "Google can show a service with a price. Keep prices out of custom names."; "How drivers can pay" / "Card, cash or an app: say it plainly in your description."; "A scratch after the wash" / "A calm draft: no argument, no fault admitted, no refund promised."; "A long queue" / "One apology for the wait, and nothing it cannot keep."; "A claim or a legal threat" / "No draft: a legal threat comes to you with a checklist."; "National Day weekend" / "Kabsi asks five days before 2 and 3 December what your hours are."; "Eid al-Fitr" / "1 to 3 Shawwal, by the moon. Say which days you open."; "Washing after iftar" / "Later Ramadan hours become special hours once you say yes."; "The bay from the road" / "Show the entrance and the queue lane, so drivers know where to turn."; "Interior detail, close" / "Seats and dashboard after a valet, in good light."; "Wash prices this month" / "Your price list, posted exactly as you send it."; "Open late in summer" / "The evening hours you keep, as a post."; "A detailing package" / "An offer post with what it includes and an end date."; "Open status and hours" / "Read daily. If Google differs, you pick which stays."; Q "Will Kabsi post our prices?" / "Yes, the prices you send, exactly as written, in a post you approve."; Q "Where does the review card go at a car wash?" / "Where customers pay or collect their keys, offered to everyone the same way.".

**/for/dental-clinic**
- What it can list: Check-up and clean, Hygienist visit, Fillings, Teeth whitening, Root canal treatment, Emergency appointment, Children's dentistry.
- Cards and questions, new or reworded (title / line; Q question / answer): "An injury or a safety problem" / "No draft for an injury or safety problem; a checklist goes to you."; "The waiting room" / "Chairs, light and the front desk, empty and calm."; "Saturday check-ups" / "The days and times, when your clinic offers them."; "What to do in an emergency" / "Your urgent line and hours, in one plain post."; "A new dentist joining" / "Their name, the day they start and the treatments they do."; "Holiday closures, asked first" / "Before each public holiday, Kabsi asks and sets your answer once you say yes."; Q "Where does the review card go in a dental clinic?" / "At reception, on appointment cards or aftercare sheets, or in a follow-up email."; Q "Will a reply say which dentist a patient saw?" / "No, a reply never confirms someone is a patient, so it never says who treated them.".

**/for/florist**
- What it can list: Bouquets, Wedding flowers, Funeral flowers, Event flowers, Plants, Flower subscriptions.
- Cards and questions, new or reworded (title / line; Q question / answer): "Bouquets with a price" / "Google can show each bouquet as a service with a price."; "If you deliver, say where" / "Name the areas in your description so callers know before they ring."; "Same day orders, said clearly" / "If you take them, give the cut off time in your description."; "A funeral order" / "Brief and gentle, with nothing the customer did not share."; "A threat to take it further" / "No draft for a legal threat; the checklist reaches you first."; "Valentine's week" / "Opening early that week is special hours, set from what you say."; "Christmas Eve" / "Short hours that day go on Google as special hours."; "The bench at work" / "Stems, ribbon and tools on the table, in daylight."; "The shopfront in bloom" / "Buckets by the door help people recognise the shop."; "Valentine's Day orders" / "The last day to order, with its date in the post."; "Mother's Day" / "What you have ready and when orders close."; "Sympathy flowers" / "A quiet post that you make them, with no sales words."; Q "Can Kabsi set our Valentine's Day hours?" / "Yes, tell Kabsi the hours, and it sets them as special hours once you say yes. Before public holidays, Kabsi asks you first."; Q "Will Kabsi post our arrangements?" / "Yes, send the photo; Kabsi checks it is sharp and bright, then drafts the post."; Q "Does Kabsi take flower orders?" / "No, orders stay with you by phone or online; Kabsi looks after the Google profile."; Q "Where does the review card go for a florist?" / "Tucked into each bouquet or delivery, or at the counter.".

**/for/gym-and-fitness**
- What it can list: Personal training, Group classes, Strength coaching, Day pass, Boxing classes, Open gym, Small group training.
- Cards and questions, new or reworded (title / line; Q question / answer): "An injury in the gym" / "An injury gets no draft: a checklist reaches you first."; "Ramadan, UAE" / "UAE private sector days shrink by two hours, so settle class times early."; "The changing rooms, clean" / "Empty, bright and tidy, never with anyone in them."; "A new class and coach" / "Day, time and the coach's name, as one post."; "A free first session" / "An offer post with an end date, never in return for a review."; "The holiday timetable" / "Which classes run over a long weekend, once you confirm."; "Holiday opening, asked early" / "Before each public holiday, Kabsi asks and sets your answer."; Q "A member says she hurt herself here; how does Kabsi handle it?" / "No draft: a short checklist comes to you. Kabsi writes a neutral holding reply only if you ask. Nothing is published until you approve."; Q "Will a reply mention someone's weight or results?" / "No, replies thank members and pass on praise, and say nothing about bodies or results."; Q "Where does the review card go in a gym?" / "At reception, offered the same way to everyone after a class.".

**/for/hair-salon**
- Categories (new or changed): "Hairdresser", "Beauty salon".
- What it can list: Cut and blow dry, Full head colour, Balayage, Highlights, Root touch up, Toner and gloss, Wedding hair, Children's cuts.
- Cards and questions, new or reworded (title / line; Q question / answer): "Photos true to the chair" / "Sharp, bright photos of real work. Kabsi looks at every one before Google does."; "A stylist named in the review" / "The reply thanks that stylist, when the name is on your team list."; "Colour that came out wrong" / "A calm draft asking the client to get in touch through your profile."; "A scalp reaction to dye" / "A health matter: no draft, only a short checklist for you."; "Bank holidays, asked ahead" / "Five days before, Kabsi asks: normal, closed or your own hours."; "Christmas week 2026" / "Christmas Day is Friday 25 December; the Boxing Day holiday is Monday 28."; "A training day, closed" / "One day is special hours. Seven days or more is temporarily closed."; "Colour by the window" / "Shoot the finished colour in daylight. Kabsi flags a dark or blurry one."; "The lengths, not the face" / "The back of the head or the ends. Kabsi does not look for faces."; "The chair and the basin" / "A photo with no words goes on as a profile photo, after your yes."; "A stylist's first day" / "Their name, what they love doing and when bookings with them open."; "Colour of the month" / "One photo of the shade and one line from you."; "Late nights before Christmas" / "Which evenings you stay open, once they are set as special hours."; Q "Does Kabsi work with my salon booking system?" / "No, Kabsi looks after the salon's Google profile; appointments stay in your own system."; Q "Where does the review QR card go in a salon?" / "At each station by the mirror and at reception. Hand it over the same way after every visit."; line "Hairdresser is the name in Google's own example; the label can change by country, so open your category box first.".

**/for/lash-and-brow-studio**
- What it can list: Classic lash extensions, Hybrid lashes, Volume lashes, Lash lift, Brow lamination, Brow tint, Brow threading, Lash removal.
- Cards and questions, new or reworded (title / line; Q question / answer): "Brows as their own services" / "Lamination, tint and threading each get a line and a price."; "Every set and lift listed" / "Classic, hybrid, volume, lifts and lamination, each as its own service."; "A price on each service" / "Keep the price out of a custom service name; Google rejects that."; "The booking link, checked" / "Clients book from your profile, so test the link after any change."; "The artist, by name" / "Thanks reach her when the review names her and she is on your list."; "A set that shed fast" / "A calm draft inviting the client back in touch, with no blame."; "Irritation or swelling" / "No draft for a health complaint; Kabsi sends a checklist instead."; "Before weddings and parties" / "Saturdays fill early, so a dated post names the free slots."; "England's bank holidays" / "Asked five days ahead; your answer goes on Google after your yes."; "Christmas party season" / "December Saturdays book up, so post the dates still free."; "Close photos clients trust" / "Sharp lashes in soft daylight. Kabsi flags a dark or blurry close up."; "Brows in two photos" / "The same angle and light before and after, with the client's yes."; "A new lift or tint" / "What it is, how long it takes and how to book."; "Gaps in this week's diary" / "A dated update for the free slots, in your own words."; "Your patch test rule" / "When clients need one, said the way your studio says it."; "Bank holiday hours, set early" / "Five days before each bank holiday, Kabsi asks and sets your answer."; Q "Will Kabsi post photos of my clients' faces?" / "Only the photos you choose to send, once you approve the post; a close crop of the lashes is enough."; Q "What does Kabsi do with a review about irritation?" / "You see it before anyone else, with a checklist and no draft. A short holding reply is written only on request."; Q "Can Kabsi connect to my lash booking app?" / "No, Kabsi looks after the studio's Google profile, and your booking link stays the one you set."; Q "Can a post say how long lashes last?" / "Only what you tell Kabsi, in your words. It adds no promise of its own."; line "Eyelash salon first when lashes are most of the work. Labels vary by country, so check your own box."; line "Late hours matter to clients who work, and Kabsi compares your hours with Google's every day.".

**/for/medical-and-aesthetic-clinic**
- What it can list: Skin consultation, Chemical peel, Laser hair removal, Microneedling, Mole check, Acne consultation.
- Cards and questions, new or reworded (title / line; Q question / answer): "How a treatment turned out" / "A careful draft without the treatment's name; a reaction or injury gets no draft."; "Ramadan, UAE" / "Private sector days are two hours shorter in the UAE; match doctors' hours to them."; "The waiting area" / "Calm and bright, with no patient in view."; "A new consultation day" / "The doctor and the day, as a dated post."; "A doctor joins the clinic" / "Their name and what they see patients for."; "Closed for Eid" / "The days closed and how to reach you for urgent problems."; Q "Will Kabsi ever put a patient's name or treatment in a reply?" / "No, drafts stay calm and general: no medical claims, no personal details and no admission of fault. Kabsi never sends patient details on WhatsApp.".

**/for/nail-salon**
- Categories (new or changed): "Nail salon", "Beauty salon".
- What it can list: Gel manicure, Acrylic full set, Infills, Gel removal, Pedicure, Nail art, Builder gel, Paraffin hand treatment.
- Cards and questions, new or reworded (title / line; Q question / answer): "Photos true to the nail" / "Google asks for no heavy filters. Kabsi flags a dark or blurry shot."; "A price on each service" / "Gel, acrylic, infills: price each one, and keep prices out of custom names."; "Walk-ins or appointments" / "Say which in your description, and on which days."; "A set that lifted early" / "A calm draft that asks the client to get in touch with the salon."; "Redness or an infection" / "A health matter: no draft, and Kabsi waits for you to decide."; "Saturdays before Christmas" / "Party nails fill the diary. Extra hours go on Google as special hours."; "Bank holidays in England" / "Kabsi asks five days before each one: open, closed or other hours."; "Valentine's and Mother's Day" / "Busy Saturdays; extra hours become special hours once you approve."; "Hands on a plain surface" / "Daylight, no clutter, the set in sharp focus."; "Close on the nail art" / "Fill the frame with the design. Kabsi flags a photo under 720 pixels."; "The colour wall" / "Your polish shelf shows clients what they can choose."; "Seasonal sets" / "Autumn shades, Christmas glitter, summer brights: one photo and one line each."; "A new technician starts" / "Who they are and the work they love, for your yes."; "Removals and infills" / "Say which you offer and how long each takes, in your words."; Q "Will Kabsi change my prices on Google without asking?" / "No, Kabsi does not edit prices on Google today, and nothing reaches Google until you approve it."; Q "Does Kabsi message my clients?" / "No, Kabsi writes to you, the salon owner. You give clients the review link or QR card when their nails are done."; Q "Can I create a category called 'nail bar'?" / "No, Google does not let a business create its own category. Pick the most specific one from Google's list."; line "Google's own example picks Nail salon over Salon. Add Beauty salon only if you also do lashes or facials.".

**/for/optician**
- What it can list: Eye test, Contact lens fitting, Children's eye test, Glasses repairs, Sunglasses, Varifocals, Frame adjustments, Lens replacement.
- Cards and questions, new or reworded (title / line; Q question / answer): "Eye tests as a service" / "Google can show each service with a description, an eye test included."; "Home visits, if you do them" / "A service area shows where you travel; the shop keeps its address."; "Glasses not ready on time" / "One apology and an invitation to contact the practice."; "A complaint about a result" / "No draft; a checklist comes to you, and you decide."; "Bank holidays in Leeds" / "Kabsi asks five days before each and sets your hours after your yes."; "A Saturday clinic" / "A Saturday unlike the rest of the week is special hours for that date."; "Between Christmas and New Year" / "Closed days that week go on Google as special hours."; "The testing room" / "Equipment tidy and the room empty, in good light."; "The front of the shop" / "Your sign from the pavement, so a first visit finds you."; "New frames in" / "The brand or style, from the photo you send."; "Eye test slots" / "Days with free test times, as a dated update."; "Contact lens checks" / "When you offer them, in your own words."; "The eye test link and hours" / "Read every day; when Google differs, you choose."; Q "Will a reply mention someone's prescription?" / "No, drafts thank the patient and invite them to get in touch, and say nothing about their eyes."; Q "Can Kabsi post our new frames?" / "Yes, send a photo of the frames; prices appear only if you give them."; Q "Where does the review card go at an optician?" / "At the desk when glasses are collected, the same for every patient."; Q "Will a reply say someone had an eye test?" / "No, a public reply never confirms that someone is a patient.".

**/for/pet-grooming**
- What it can list: Full groom, Bath and brush, Nail clipping, Puppy groom, De-shedding, Hand stripping, Mobile grooming.
- Cards and questions, new or reworded (title / line; Q question / answer): "Each groom with a price" / "Bath, full groom, nail trim: each can show a price on Google."; "Shop days and van days" / "Shop hours on Google; say your visit days in the description."; "The breeds you groom" / "Big dogs, cats or hand stripped coats: say what you take in your description."; "A nick or an injury" / "Safety first: no draft, a checklist, and you decide what happens."; "Thanks for a calm groom" / "The reply thanks them and names the groomer if listed."; "Eid al-Adha" / "10 to 12 Dhu al-Hijjah, set by the moon. Kabsi asks five days ahead."; "National Day in Dubai" / "On 2 and 3 December your grooming hours go on Google after your yes."; "Before and after the groom" / "Two photos in the same light show the work."; "The grooming table" / "Clean and ready, with no pet waiting."; "Summer trims" / "Short cuts for hot months, in your words."; "Free slots this week" / "A dated update for the gaps in the diary."; "Nail trims without booking" / "If you take them, say which days."; "Hard reviews, handled with care" / "A review about a nick or an injury gets no draft and a short checklist."; Q "What does Kabsi say to a review about a nick?" / "A nick is a safety matter, so it gets no draft and a checklist. A holding reply comes only on request."; Q "Can Kabsi post photos of the pets I groom?" / "Yes, the photos you send, after your yes. Ask the owner first if you like."; Q "Can Kabsi set our Eid hours?" / "Yes, Kabsi asks five days before Eid and sets the special hours you choose."; Q "Does Kabsi take bookings?" / "No, bookings stay on your phone or link; Kabsi looks after the Google profile.".

**/for/physiotherapy**
- What it can list: Initial assessment, Sports massage, Back and neck pain, Knee rehabilitation, Rehab after surgery, Home visits, Acupuncture.
- Cards and questions, new or reworded (title / line; Q question / answer): "Pain that did not improve" / "No treatment named in the draft, and an injury gets no draft at all."; "The door from the street" / "Your sign and entrance, so a first visit finds you."; "An evening clinic" / "The day and hours of a new late session."; "A new physio joins" / "Their name and what they treat, from your words."; "Home visit areas" / "Which parts of town you cover, said plainly."; Q "Can Kabsi say how many sessions a patient needs?" / "No, Kabsi writes only the facts you give it, like what you treat and when you open. It promises nothing about results."; Q "Can I give a free assessment to anyone who leaves a review?" / "No, Google does not allow free or discounted services in return for a review. Ask every patient the same way."; Q "Can a reply mention the exercises I gave?" / "No, a reply stays general and never mentions a patient's care.".

**/for/restaurant**
- What it can list: Dine in, Takeaway, Private dining, Set lunch, Group bookings, Children's menu.
- Cards and questions, new or reworded (title / line; Q question / answer): "Dietary options, said plainly" / "Vegetarian or halal? Say it in your description, in your words."; "Praise for a dish" / "The reply names the dish back and adds nothing else."; "Slow service on a busy night" / "One apology, no excuse, no promise about next time."; "Feeling ill after eating" / "A hygiene matter: no draft and a short checklist."; "Christmas Eve and New Year's Eve" / "Different hours on those nights are special hours, set on your yes."; "Bank holiday Mondays" / "Kabsi asks five days before each: open, closed or other hours."; "A private hire night" / "Closed to the public for one evening is special hours."; "A dish from the pass" / "Plated, in daylight, one dish to a photo."; "The menu, readable" / "A straight photo of the printed menu, every page in focus."; "The dining room" / "Set tables before service show what an evening looks like."; "A new dish" / "Its name and one line from you, with no invented price."; "Sunday lunch" / "What is on and the hours it is served."; "Christmas bookings open" / "The dates you take parties, as a dated post."; Q "We get reviews on booking and delivery sites too. Does Kabsi reply there?" / "No, Kabsi replies on Google only, where every review gets a draft."; Q "Can Kabsi set our Christmas hours?" / "Yes, five days before each bank holiday, Christmas included, Kabsi asks what you will do and sets special hours once you say yes."; Q "Where does the review QR code go in a restaurant?" / "On tables, at the host stand or till, on the bill folder or the takeaway bag.".

**/for/spa-and-massage**
- What it can list: Swedish massage, Deep tissue massage, Hot stone massage, Couples massage, Moroccan bath, Body scrub, Aromatherapy massage.
- Cards and questions, new or reworded (title / line; Q question / answer): "Pain or injury after treatment" / "No draft. You get a checklist and decide whether anyone replies."; "The relaxation room" / "Low light is fine if the photo stays sharp; Kabsi says when it is not."; "A couples package" / "Price, minutes and an end date, as an offer post."; "A new treatment" / "Its name, its length and the price you set."; "Long weekend hours" / "Hours for Eid or National Day, posted once they are set."; "Eid and National Day hours" / "Before Eid and public holidays, Kabsi asks and sets your answer once you say yes."; Q "Can Kabsi say what a treatment does for the body?" / "No, Kabsi writes only the facts you give it: the treatment, how long it takes and the price. It does not invent a benefit."; Q "Does Kabsi connect to my booking system?" / "No, Kabsi is a Manager on the spa's Google profile and nothing more. Check the booking link on Google when your page moves."; Q "Can Kabsi reply to a review that complains about a therapist?" / "When it names a therapist, it reaches you with a checklist and no draft. A holding reply is written only when you ask."; Q "Where does the review card go in a spa?" / "At reception, handed over as guests leave. Never offer a treatment or a discount for a review.".

**/for/tattoo-studio**
- What it can list: Custom design, Flash tattoos, Cover ups, Fine line, Blackwork, Touch ups, Tattoo consultation.
- Cards and questions, new or reworded (title / line; Q question / answer): "Styles as services" / "Fine line, blackwork, cover ups: each can be a service on Google."; "Your age rule, written down" / "Put your minimum age policy in the description, in your words."; "Deposits, stated once" / "If you take a deposit, say how it works in your description."; "A review about an infection" / "An infection is a safety matter: no draft, a checklist for you."; "A wait past the booked time" / "One apology and nothing promised that it cannot keep."; "Bank holiday weekends" / "Kabsi asks five days before each and sets the hours you choose."; "A convention weekend away" / "A few days shut is special hours; seven or more, temporarily closed."; "Healed, a month on" / "A healed photo shows how the lines settled."; "The studio, clean" / "Stations wiped down and ready, in bright light."; "Flash day" / "The date, the designs and whether it is walk in."; "A guest artist" / "Their name and the dates they are in."; "Books open" / "Which month an artist takes new bookings."; Q "Can Kabsi say we only work by appointment?" / "Yes, write it in your description and posts. Kabsi checks the description every day and tells you when Google shows something else."; Q "What happens with a review about an infection?" / "That is a safety matter: no draft, a checklist, and a holding reply only when you ask."; Q "Will a reply name the right artist?" / "Only if the review names them and they are on your team list; no guessing."; Q "Can Kabsi post photos of fresh tattoos?" / "Yes, once you send them. Blurry or dark shots are flagged before anything is drafted."; Q "Does Kabsi post on Instagram too?" / "No, Kabsi posts on Google only; your Instagram stays yours.".

**/for/veterinary-clinic**
- What it can list: Vaccinations, Neutering, Pet dental care, Microchipping, Health checks, Flea and worm treatment, Nurse clinics.
- Cards and questions, new or reworded (title / line; Q question / answer): "Services, plainly listed" / "Vaccinations, neutering, dental care: each can be a service with a description."; "Which animals you see" / "Cats and dogs only, or exotics too: say so in your description."; "A pet hurt, or a death" / "No draft for grief or injury; a checklist reaches you instead."; "A long wait in reception" / "One apology, and an invitation to get in touch with the clinic."; "Christmas 2026" / "25 December and the Boxing Day holiday on Monday 28. Post your cover."; "Bank holidays, five days ahead" / "Kabsi asks, then sets special hours after your yes."; "The reception desk" / "Bright and welcoming, with no pet or owner in view."; "The consulting room" / "Clean table, tidy shelves, good light."; "The car park and door" / "Where to stop with a pet carrier, seen from the street."; "Vaccination clinic dates" / "The days you run them, as a dated post."; "A new vet joins" / "Their name and the animals they see."; "Bank holiday cover" / "Who answers urgent calls while you are closed."; "The phone and hours, read daily" / "If Google differs, you decide which version stays."; Q "Will a reply mention a pet's treatment?" / "No, drafts thank the owner and invite them to get in touch, and say nothing about the pet's care."; Q "Can Kabsi set our bank holiday hours?" / "Yes, five days before each one, Kabsi asks what you will do and sets special hours once you say yes."; Q "Where does the review card go at a vet clinic?" / "At reception, on appointment cards or in a follow-up email."; Q "Can a reply mention a pet's name?" / "No, a reply says nothing about the pet or its care, only thanks and how to reach you.".

**/for/yoga-and-pilates-studio**
- What it can list: Hatha yoga, Vinyasa flow, Reformer pilates, Mat pilates, Beginners' course, Private sessions, Prenatal yoga.
- Cards and questions, new or reworded (title / line; Q question / answer): "Classes as services" / "Hot yoga, reformer, beginners: each can be a service with a description."; "Teachers by name" / "Add each teacher to your team list so replies thank the right one."; "Mats and kit" / "Say in the description whether mats are provided, so beginners know."; "An injury in class" / "A safety matter: no draft, just a checklist and your decision."; "A class that felt too full" / "One apology and an invitation to get in touch."; "National Day classes" / "Over 2 and 3 December, say which classes still run."; "Studio hours in Ramadan" / "Changed hours become special hours, after your yes."; "Eid al-Fitr" / "Set by the moon; Kabsi asks five days before the expected date."; "The studio, empty and lit" / "Mats laid out and the room in daylight, no students."; "The way in" / "Upstairs or in a tower? Show the door and the lift lobby."; "A beginners' course" / "The start date, how many weeks and the time."; "A workshop weekend" / "The date and the teacher, as an event post."; "Classes over the holiday" / "Which classes run, once you confirm them."; "Address and hours, checked daily" / "Where Google differs, you say which is right."; Q "We moved studio, so what happens on Google?" / "Tell Kabsi the new address. When Google still shows the old one, Kabsi tells you, and nothing changes without your yes."; Q "What happens with a review about an injury?" / "Injuries are safety matters, so there is no draft, only a checklist; a holding reply is written if you ask."; Q "Will a reply thank the right teacher?" / "Only if the review names the teacher and the name is on your team list."; Q "Does Kabsi link to my class booking app?" / "No, class bookings stay in your own app; Kabsi looks after the Google profile.".
