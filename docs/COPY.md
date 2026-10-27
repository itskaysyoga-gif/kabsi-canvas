# Kabsi copy deck (docs/COPY.md), lane R chat, 25 Oct 2026

Every line a mockup or Web 2 page carries, so no screen has placeholder text. Written to the kabsi-copy rules and master plan 24, 27, 28, 29 and 30. Web 2 builds from it and updates the facts to match (section 27 makes several facts lines out of date: the Weekly Care Report is now the Results Report, the pillars and H1 changed).

Rules used throughout: sentence case; numbers as digits; ranges with "to"; no dashes, no exclamation marks; Google only as plain words, never in a headline graphic; never promise rankings, reviews, calls or customers (K-144); every example labelled Example; one main button per screen.

Decisions taken while writing (lane R, R-41):
- The main button is "See your map" (28.8); the second is "Try it on WhatsApp". "Start free" appears only on pricing and plan screens.
- The line under every main button: "Free for 14 days. No card. Cancel in WhatsApp."
- About shows no street address or city (R-55 holds over 24.6's address line until Kabsi has a registered entity).
- The Weekly Care Report is called the Results Report everywhere (27.3).
- While free_scan_daily_cap is 0, the scan box shows the waitlist state (below) instead of running.

## Shared pieces

**Header (Web 2, Design 5):** Kabsi mark and name. Links: How it works, Pricing, Businesses, Free tools, Founding 25, Partners. Right: Log in, and the button "Check my business free". Phone menu: "Open menu", "Close menu"; "Skip to content".
**Phone bottom bar (after the first scroll):** "Check my business free" and a WhatsApp icon button labelled "Chat on WhatsApp".
**Footer:**
- Line: "Your business on Google. Taken care of."
- Columns (Web 2). Product: How it works, Pricing, Free check, Review link and QR code, Security. Learn: Every kind of business, Hair salons, Barbershops, Restaurants, Dental clinics, Guides, FAQ. Company: About, Founding 25, Partners, Partner terms, Privacy, Terms. Follow: Facebook, Instagram (SOCIAL_LINKS in src/lib/site.ts). Bottom: "Your privacy choices", "© 2026 Kabsi". "Kabsi or Google's free tools" waits for its sourced page (docs/LATER.md).
- Small print: "Kabsi is independent and not affiliated with Google. Google Business Profile is free from Google. Kabsi is an independent paid service." with the link "Google's guidance on working with a third party". "Kabsi is operated by Rashid Abou Hamzy. Contact: hello@kabsi.co. Payments are processed by Creem, our merchant of record."
**Cookie bar:** "Kabsi uses cookies to measure visits and improve ads. You choose." Buttons: "Accept", "Only necessary". Link: "Details".
**Scan box (one component, used on many pages):**
- Label: "Find your business on Google"
- Placeholder: "Business name and city"
- Button: "Check my business free"
- Under it: "Free check. No Google access needed. Takes about 10 seconds."
- Waitlist state (cap 0): "The free check opens soon. Leave your email or WhatsApp number and Kabsi sends your result the day it opens." Button: "Save my place". Done: "Saved. You are on the list." On kabsi.co the waiting list is built (UX 1, section 25); "free scan" and "map" are not owner words, so the lines say "free check" and "result" (UX 1 round 2).

## 0.1 Words owners understand (lane R, 25 Oct 2026; 30.15 lines added 26 Oct)

- Never "spot", "grid", "grid point", "geo" or "pin" in a line an owner reads. Say "places around you" and "searched like a customer". The number on a dot is "where you came up", 1 is first.
- Never "the app" or "app". Kabsi has no app. Say "the Kabsi website", "your Kabsi account" or "on kabsi.co". Nav item: "How it works", never "The app". WhatsApp is WhatsApp.

- Never "listing" or "visibility" in a line an owner reads (30.15): say "your business on Google" or "your Google profile".
- The map leads with three nearby places, then one count: "Near your salon you came up 2nd for 'hair salon'. Near the metro station, Juniper Hair Studio came first. You were in the first 3 at 18 of 49 places Kabsi checked." Place names come only from the real checked point. Under it: "Sample Google Maps results, not customer counts."
- AI answers: "An answer customers might see", never a score. Label: "Answers from ChatGPT and Perplexity through their API, which can differ from their apps."
- Never: top of Google, more customers, fully automatic, set and forget, we manage everything, Google-approved, Google partner, we remove bad reviews, no work needed, AI recommends you.

**Founding 25 (30.17):** Banner: "Founding 25: three months of Kabsi Pro, free, for 25 businesses. We do the Google work; you tell us what to make better." Then "[n] of 25 places left." (the real count from GET programs/founding; no number while it loads or if it fails; "All 25 places are taken." at 0) and the button "Apply for a place". Under it: "By application. No card. After 90 days, choose a plan or stop, nothing is charged by itself."
**Access steps (30.17, the same everywhere):** "On Google, open your profile (search your business name while signed in), then Menu, Business Profile settings, People and access, Add. Paste 5481006796, choose Manager, then Add (on some screens, Invite)." Under it: "5481006796 is Kabsi Clients, Kabsi's business group on Google. Never send us a password or a code." Button: "Copy the ID".

## 1. Home (/)

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

**How it works** (H2: "Set up in 10 minutes, no passwords")
1. "See your map": "Run the free scan. It takes about 10 seconds."
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
**Closing band** (black): H2 "See where you show up in 10 seconds." Scan box. "Free for 14 days. No card. Cancel in WhatsApp."

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
- Rule for the ranking guides: explain what Google says it uses (relevance, distance, prominence) and what an owner controls. No promise that any step raises a rank.

## 7. Industry template (/for/TRADE)

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
- Steps: 1 "Apply on WhatsApp" 2 "Share your page or scan a business for them" 3 "Get paid on the 5th of each month".
- What partners get: "Your own page and QR code" / "Free scans to send to businesses you know" / "A kit of ready posts and a short video" / "A WhatsApp summary every Monday".
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
- Expired: "This report has expired. Run a fresh one in 10 seconds." Scan box.

## 13. About (/about)

- H1: "Kabsi is built for the owner at the counter."
- Founder note: "I built Kabsi because local owners lose customers to a listing nobody has time to look after. Kabsi measures where you show up, does the work, and asks for your yes on WhatsApp before anything goes live. Rashid Abou Hamzy, founder"
- Facts: "Kabsi is independent and not affiliated with Google." "Contact: hello@kabsi.co." Social links.

## 14. Legal pages (/privacy, /terms, /partners/terms, /security)

- H1s: "Privacy" / "Terms" / "Partner terms" / "Security".
- Lead on each: "Plain words first. The full text follows." Then a 5-line summary box, then the full text from Ops 1 part B (lawyer to read).
- Security summary: "Kabsi never sees your Google password." / "You can remove Kabsi as a Manager any time." / "Your data is encrypted in transit and at rest." / "Data from your Google listing is deleted after you leave." / "Report a problem: hello@kabsi.co."

## 15. 404 and error

- 404 H1: "This page is not here." Line: "The link may be old. Your Google profile is fine." Buttons: "Go home", tertiary "Check my business free".
- Error H1: "Something went wrong on our side." Line: "Nothing you did. Try again in a minute." Button: "Try again".

## 16. Shared FAQ (answers from the facts)

1. "Does Kabsi need my Google password?" "No. You add Kabsi as a Manager on your listing. You stay the owner and can remove Kabsi any time."
2. "Is anything posted without me?" "No. Every reply, post and change waits for your yes on WhatsApp."
3. "What if I already reply to reviews myself?" "Keep going. Kabsi drafts a reply for each new review, and you can edit or skip any of them."
4. "Can Kabsi get me to the top of Google Maps?" "No one can promise that. Kabsi shows where you show up, what changed, and what you can do next."
5. "Can I edit replies?" "Yes. Tap Edit on WhatsApp or on the Kabsi website."
6. "Is this safe with Google?" "Kabsi uses Google's tools for managers and only acts after your yes. Kabsi is independent and not affiliated with Google."
7. "What happens after the trial?" "Choose a plan to keep going. If you do not, Kabsi stops publishing and you keep your review link and QR code."
8. "Can I cancel?" "Yes, from WhatsApp, any time."
9. "Where does the ranking data come from?" "Kabsi runs its own checks of public Google Maps and AI answers. They are separate from the numbers in your Google Business Profile."
10. "Is my data safe?" "Yes. Read how Kabsi handles it on the Privacy page."

## 17. Log in (/login)

- H1: "Log in to Kabsi"
- Field: "Email". Button: "Send me a code". Then: "Enter the 6-digit code we sent to [email]." Button: "Log in". Link: "Send a new code".
- Error: "That code did not work. Check it, or send a new one."
- Under: "New here?" link "See your map".

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
- Plan, H1 "Your plan". "Pro trial, ends [date]." Buttons: "Choose Essentials", "Choose Pro". Line: "Payments are processed by Creem, our merchant of record."
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

## 24. Web 2: the approved design lines on kabsi.co (27 Oct 2026)

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
  shows in about 10 seconds. The full check from 49 places around you arrives on WhatsApp within minutes."
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

- Task states: "Waiting for your yes", "Needs you", "Approved", "Sent to Google", "On Google", "Did not go through", "Skipped", "A person should answer"; the track "Approved", "Sent to Google", "On Google"; "Approved. It goes to Google in [n] seconds.", "Your yes is saved. Kabsi has not seen it on Google yet. Nothing else is needed from you. Kabsi tells you on WhatsApp when it shows.", "Kabsi saw it on Google. Done.", "See it on Google", "Skipped. Nothing was published.", "Bring it back", "Reply ready", "Post ready", "Hours ready", "Photo ready", "Approve reply", "Approve", "Send my answer", "Not now", "Your answer, in your own words", "Kabsi writes the post from your answer, then asks for your yes."
- Failures: reply "Google did not take the reply: Kabsi's access to your Google profile stopped working." with "Nothing was published. Check that Kabsi is still a Manager. Kabsi sends the reply as soon as access works."; post "Google did not take the post: it turned down one of the words." with "Nothing was published. Kabsi rewrites it and asks for your yes again."; hours "Google did not take the new hours." with "Nothing was changed. Kabsi tries again in an hour and tells you if it still does not work."; photo "Google did not take the photo: it is smaller than Google allows." with "Nothing was published. Send the photo again as a file on WhatsApp, or send a new one. Kabsi tries again as soon as it arrives."; buttons "Check Kabsi's access", "Send it on WhatsApp", "Try again".
- Sensitive review: "A 1-star review needs you", "Kabsi did not write a reply.", "This review talks about an injury and a lawyer. A reply here should come from you, in your own words. Nothing has been posted.", "Write my reply", "Talk to Rashid".
- Shell: "Google profile", "Posts and photos", "Where you show up", "Reports", "Get reviews", short "Profile", "Posts", "More", "Log out", "Ends [date]", sub tabs "Waiting", "All reviews", "Profile watch", "Hours", "Posts", "Photos", "Settings", "Team", "Plan".
- Home: "3 things need you. Each one is on WhatsApp too: answer wherever you are.", "Done lately", "Your next report", "Monday 2 November on WhatsApp: what Kabsi did, what waits for your yes, and one next step.", "See last week's report", "Setup is waiting for one step: add Kabsi as a Manager." with "Your trial has not started and nothing has been published." and "Continue setup"; page errors "This page did not load." with "Nothing you did, and nothing changed on Google. Try again in a minute."
- Reviews: filters "Waiting", "On Google", "All" (changed from "Published"); "No reviews waiting." with "When a review comes in, Kabsi drafts a reply and sends it to you on WhatsApp."; "Review Growth"; "New reviews this month", "Times the link was opened. An open is not a review.", labels "From your Google Business Profile" and "From your Kabsi review link"; buttons "Send your review link" (changed from "Ask a customer"), "Get your QR card".
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
