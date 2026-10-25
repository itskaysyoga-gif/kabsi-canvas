---
name: "kabsi-copy"
description: "Use whenever you write or edit a line a reader will see: website, app screens, emails, WhatsApp messages, Nora's answers, ads, guides, Outbound. Plain English for owners, the approved lines, no Arabic shown, no em dashes, en dashes or exclamation marks, Google's name only as plain words (K-112)."
---

# Kabsi copy

Kabsi's readers are busy local business owners. Write the way a calm, capable person would explain it across a counter. Sources: docs/KABSI-MASTERPLAN.md section 1, plan section 2.2, K-02, K-53, K-112 and the claims rule (plan 2.11).

## Plain English for owners
- Short sentences. Everyday words. Say what Kabsi does and what happens next.
- One idea per sentence, one ask per message. Name the button the reader will tap.
- Say "your reviews", "your listing", "your hours". Never say API, sync, pipeline, SEO score, listing integrity or webhook to an owner.
- Numbers as digits. Ranges with "to" (2 to 4), never a dash.
- Tell the truth about limits. If Kabsi cannot do something, say so and say what the owner can do.
- Nothing goes live without the owner's yes. Say so wherever a change is described.

## Approved lines (master plan 27.2, 24.5 and 28.8; every page's copy is in docs/COPY.md)
- Hero H1: "See where you show up on Google and in AI answers."
- Subline: "Kabsi checks your Google Maps ranking and what ChatGPT and Gemini say about you, helps you get more reviews the right way, keeps your listing right and posts for you. You reply Yes on WhatsApp."
- Tagline, footer and emails: "Your reviews and listing. Taken care of."
- Pillars: See where you show up / More reviews, the right way / Your listing kept right / All from WhatsApp.
- Main button everywhere: "See your map". Second: "Try it on WhatsApp". Under every main button: "Free for 14 days. No card. Cancel in WhatsApp."
- Other approved lines: "Set up in 10 minutes, no passwords", "Nothing goes live without your yes", "Cancel from WhatsApp any time", "Know the moment anyone changes your listing on Google, competitors included".
- The weekly report is the Results Report (27.3); "Weekly Care Report" is retired. Replies stay in every plan and are never the headline.
- Kabsi is the local visibility and reviews manager, run from WhatsApp. Never promoted as a review reply generator. Google's name never appears in a headline graphic or OG image.
- Use these lines as they stand. Do not reword them or invent a near copy. A new line needs the lane R chat's yes.
- Operator line: "Kabsi is operated by Rashid Abou Hamzy. Contact: hello@kabsi.co." Payments: "Payments are processed by Creem, our merchant of record."

## Hard rules
- No em dashes, no en dashes, no exclamation marks. Not in copy, emails, WhatsApp, Nora, commit messages or docs. Use a full stop, a comma, a colon or the word "to".
- No Arabic shown anywhere public (R-61): website, marketing, ads, public facts, llms files, guides, industry pages, screenshots, Outbound. Lebanese or Arabic examples become US examples. Spanish is fine where it helps US businesses. The product may still answer in Arabic silently where the owner or reviewer writes it.
- Google's name never appears in a slogan, product name, handle or headline graphic (K-112). It appears only as plain descriptive words ("your Google listing"), with the non-affiliation notice in view: Kabsi is independent and not affiliated with Google.
- Never claim: rankings or the 3-pack, guaranteed reviews or ratings, "automatically fixes", "prevents suspension", "Google partner", "approved by Google", revenue promises, "beat your competitors", or that a post or reply improves ranking (K-53).
- No industry statistics, quoted as fact, anywhere (plan 2.11). Say what Kabsi does, not what Google's algorithm rewards.
- No invented proof: no fake logos, quotes, customers, headcounts or "trusted by" lines. An example is labelled Example.
- Review rules: never ask for, gate or reward reviews. Never write or suggest fake reviews. Do not promise that a review will be removed.
- Facebook and Instagram links come from the SOCIAL_LINKS constant, never typed by hand (R-59).

## Names (K-02)
Use exactly: Reviews, Google Profile, Google Protection, Get Reviews, Results Report, Visibility Map, AI Visibility, Competitor Watch, Review Growth, Ask Kabsi, Business Knowledge (screen title "About your business" where the design says so), Insights, Content, Settings, Essentials, Pro, Kabsi Partners, Profile Coach, What customers say, Report a fake review.
Never: Profile Score, Do now, Listing Shield, Profile Care, Replies as a module, Monday Report, Put mine back. There is no Free plan, Partner plan or Lebanon bundle in any copy.

## Voice by place
- Website: confident and calm, one primary button per screen, one yellow button per email.
- WhatsApp: a short message, the business name first when the owner has several, one clear action (Yes, Edit, Skip). Review alerts say the star rating and the first line, then the reply ready.
- Emails: the review email subject is exactly "<Business>: new <n>-star review, reply ready" (R-30).
- Review replies written for owners follow the owner's voice rules, not Kabsi's house voice, and still carry no dashes or exclamation marks unless the owner's rules allow them.
- Error and empty states: say what happened, what Kabsi did, and what to do next.

## Check before you hand it back
1. Search the text for em dashes, en dashes and exclamation marks.
2. Search for Arabic script and for Lebanon-only examples.
3. Search for banned names and banned claims above.
4. Read it aloud once. If an owner would stumble, rewrite it.
5. If the change alters wording, price or behaviour, update the facts in knowledge/facts/ and run node scripts/build-kb.mjs, which rebuilds knowledge/kabsi-facts.md and the llms files (K-104).
