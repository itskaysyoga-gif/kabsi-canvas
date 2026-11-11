# Home 2: the final copy of the new Home, with its sources (11 Nov 2026, lane R R-158 item 4)

Written before the build, as the task asks. Every line a reader sees on Home is here, with the fact file line it rests on. `02:14` means `knowledge/facts/02-facts-that-change.md` line 14, and so on for 01, 04, 05, 11 and 13 (line numbers on main at ff1ad5d). Code sources are named where a line rests on how the product behaves and the facts did not yet say it; this task adds those to facts 04.

Every business and person on the page is an Example and labelled Example (the salon Hollis Hair, Bristol, already used across the site). No statistic, no logo of Google, ChatGPT or Perplexity, no ranking, revenue or recommendation promise, no request book word, no Arabic, no em or en dash, no exclamation mark.

Owner words, as the brief says: "your Google listing", "Google Maps", "reviews". "AI agent" appears twice only: the hero line and section 5.

## 1. Hero

- H1 (lane R, kept as the brief gives it; the bar on the last sentence): "Your business on Google. Taken care of through WhatsApp."
  - Source: the brand line (04:7); "through WhatsApp" because every approval reaches the owner on WhatsApp (02:25, 04:5).
- Line (33 words; WhatsApp is in the H1 right above it): "Kabsi is an AI agent for your Google listing. It answers your reviews, keeps your hours, photos and posts fresh, and checks what ChatGPT says about you. Nothing goes live until you tap yes."
  - "answers your reviews": a reply drafted for every new review, posted after the owner's yes (04:32). "Answers" is the job; the yes comes in the last sentence.
  - "keeps your hours, photos and posts fresh": holiday hours asked five days before (04:7), photos checked and made ready, posts 2 a month on Essentials and every week on Pro (02:10).
  - "checks what ChatGPT says about you": AI Visibility, live from 5 Nov 2026 (01:67), and the free check's AI answer (01:119).
  - "Nothing goes live until you tap yes": nothing is written to Google without the owner's approval (04:5); there is no automatic put-back (01:57); WhatsApp approvals live from 5 Nov 2026 (02:25).
- The one primary action: the free check's business search (02:8), with the note "Free for 14 days once Kabsi is connected. No card." (`TRIAL_LINE`, 02:14).
- Second link: "See how it works" (02:8).
- Visual: one WhatsApp thread labelled Example, in the Look 2 style (COPY.md 77, the real reply words of `supabase/functions/_shared/whatsapp/say.ts`, `agent.ts` and `deliver.ts`), one day at the Example salon:
  1. 08:12, star marker: "New 5-star review · Hollis Hair" / "From Chloe B." / quote "Amber did a lovely colour. Booked again." / "Kabsi's reply:" / quote "Thank you, Chloe. We will tell Amber. See you in six weeks." / "Post this reply on Google?" Buttons: Approve, Edit on kabsi.co.
  2. 11:40, the owner: "Closed Monday"
  3. 11:40, clock marker: "New hours for Google · Hollis Hair" / "Monday 23 November: closed all day." / "Kabsi sets them on Google after your yes." Buttons: Approve, Edit on kabsi.co. (A typed hours change becomes dated hours for a yes: `agent.ts` hoursShown; 01:73 "We are closed Friday becomes an hours change to approve".)
  4. 15:05, the owner: a photo with "New balayage colours this month."
  5. 15:06, picture marker: "Post ready for Google · Hollis Hair" / quote "New balayage colours this month. Saturdays are open." / "Post it on your Google profile?" Buttons: Approve, Edit on kabsi.co. (A photo with words becomes a post with that photo for the owner's yes, 04:7.)
  - Screen reader caption: "Example: one day of Kabsi messages to an invented salon on WhatsApp: a new 5-star review with a reply to approve, the owner's "Closed Monday" turned into hours for Google, and a photo turned into a Google post. Each waits for the owner's Approve."

## 2. The four jobs (a strip under the hero)

Icon and a few words each:
- "Reviews answered" (04:32)
- "Listing kept right" (04:35, Google Protection)
- "Posts from your photos" (04:7)
- "Found in AI answers" (01:67; the words are lane R's; section 4's block says what this means and that no one can promise it)

Screen reader heading: "What Kabsi does for you".

## 3. The problem, in owner words

- Headline: "Customers decide in seconds." (bar on "in seconds.")
- Line: "They pick a business on Google Maps and, more and more, by asking an AI assistant. They go by what they see. Most owners have no time to keep up."
  - No number, no statistic (plan 2.11). The four things are what Kabsi works on: reviews and replies (04:32), hours (04:35), photos (02:10), and the AI answer (01:67).
- Four small cards, "What they see":
  - "Stars and replies" / "Is every review answered?"
  - "Hours" / "Are you open when they come?"
  - "Photos" / "Does it look like you today?"
  - "The AI answer" / "Are you named, and is it right?"

## 4. What Kabsi does (four blocks)

Headline: "What Kabsi does, and what you do." (bar on "what you do."). Each block: the job as its title, "Kabsi" and what it does, "You" and the one tap, and a small Example.

1. Reviews answered
   - Kabsi: "Kabsi drafts a reply to every new review, in your tone and in the review's language." (04:32; tone and the last five approved replies, 13:115; the reviewer's language, 13:135)
   - You: "Read it and tap Approve." (04:5, Approve on WhatsApp, 02:25)
   - Rule line: "Kabsi never offers anything for a review and never hides one." (13:171 "never filters or rewards reviewers"; Google's review rules)
   - Example: a 4-star review "Good cut, a short wait." with the reply "Thank you, Sam. Sorry for the wait. See you next time."
2. Listing kept right
   - Kabsi: "Kabsi checks your hours, holiday hours, photos and details every day. When Google shows something different from what you told Kabsi, it asks you." (04:35 Google Protection; holiday hours five days before a bank holiday, 04:7; photos checked, 13:241)
   - You: "Tap Keep my information or Google is right." (04:35)
   - Example: "What Google shows: Monday, Closed" beside "What you told Kabsi: Monday, 10:00 to 16:00".
   - Note for lane R: the brief's "changes others suggest on Google" is written as "when Google shows something different", because the facts say Kabsi compares the listing with what the owner confirmed (04:35); they do not say Kabsi reads Google's suggested edits.
3. Posts from your photos
   - Kabsi: "Send a photo with a few words on WhatsApp. Kabsi writes a Google post with that photo." (04:7)
   - You: "Read it and tap Approve." (04:7)
   - Plan line: "2 posts a month on Essentials, every week on Pro." (02:10)
   - Example: the owner's photo with "New balayage colours this month." and the post ready.
4. Found in AI answers
   - Kabsi: "Kabsi asks ChatGPT and Perplexity the questions your customers ask. It shows whether you are named, what is said, and what to fix on your listing." (01:67; a fact stated differently opens a task to fix it on the listing, 13:158)
   - You: "Approve the fix it suggests." (13:158: the fix on the Google profile goes through the owner's yes, 04:5)
   - Plan line: "3 questions a month on Essentials, 10 every 2 weeks on Pro." (01:67, 01:97, 02:10)
   - Honest line: "No one can promise an AI assistant will recommend you." (13:158)
   - Example: the question "Which hair salon near Gloucester Road in Bristol takes late appointments?", "Asked ChatGPT on 2 Nov 2026.", the Example answer, and "Answers we get from ChatGPT and Perplexity directly, which can differ from what their apps show." (the existing Example, 04:15, 13:158)

## 5. You stay in control

- Headline: "You stay in control." (bar on "in control.")
- Line: "The AI agent does the work. You decide."
- Three points:
  - "No password shared" / "Kabsi uses Google's own Manager access." (13:24, 13:171, 02:20)
  - "Nothing goes live without your yes" / "Every reply, post and change waits for your tap." (approved line; 04:5)
  - "Remove Kabsi any time" / "On Google, in People and access. Kabsi stops at once." (13:197, 13:200)
- Example weekly report (the existing sample): "Every Monday", "Your weekly report", "6 replies live on Google", "1 post", "Details checked every day", "One next step: Add 3 photos of the team at work.", "What Kabsi did, what waits for your yes, and one next step." (04:5)
- Link: "See how to remove Kabsi on Security".

## 6. How it starts (three steps)

- Headline: "How it starts." (bar on "starts.")
  1. "Run the free check" / "About 30 seconds. No access needed." (04: the free check; `CHECK_HERO` "About 30 seconds, and no access needed.")
  2. "Add Kabsi as a Manager on Google" / "About 2 minutes, with each step shown." (the free check result's "It takes about two minutes", COPY.md section on Start free; 05: the guided Manager step with the recording)
  3. "Say yes on WhatsApp" / "Kabsi starts the work and asks before anything goes live." (02:25, 04:5; the trial starts when access works, 02:14)

## 7. For your kind of business

- Headline: "For your kind of business." (bar on "your kind")
- Line: "Kabsi works wherever your customers use Google. You can write to Kabsi on WhatsApp in your own language. The website is in English."
  - Any country (13:9, 13:27, 13:378). Own language on WhatsApp: Kabsi's assistant answers in the language the person writes in (`supabase/functions/_shared/nora-rules.ts` line 59) and a post is written in the language of the owner's note (`supabase/functions/_shared/posts.ts` line 72); added to facts 04 by this task. The website is in English (13:141).
  - Voice notes: not in the line while voice notes are not switched on (01:73). When Voice 2 is merged and the facts say voice notes are on, the line becomes "You can write to Kabsi, or send a voice note, on WhatsApp in your own language." (a docs/LATER.md row if Voice 2 is not merged before this task).
- Chips to the industry pages: Barbershop, Hair salon, Nail salon, Restaurant, Cafe, Bakery, Gym, Clinic, Garage, Florist, and "Every kind of business" (to /for).

## 8. Plans preview

- Headline: "Two plans. The work comes first." (unchanged)
- `TRIAL_LINE`; the two plans with their monthly list price from `PLANS` (02:9); the launch price line "Launch price $19 and $39 for the first 30 paying businesses." and the real count from the launch places reader, `foundingPlacesLine` ("[n] of 30 launch places left."), only while places remain (02:9, 30.51 item 3); "Prices in US dollars, plus tax where it applies. Nothing to pay today."

## 9. Five questions

- "Do I need to be good with technology?" / "No. If you can use WhatsApp, you can use Kabsi. Adding Kabsi on Google is one guided step, and after that you answer with a tap." (02:25, 05: the guided steps)
- "Will Kabsi post anything without asking me?" / "No. Every reply, post and change waits for your yes. After you tap Approve you have 10 seconds to undo it." (04:5, 01:57; the 10 second undo, COPY.md 77)
- "What is a Manager on Google, and can I remove Kabsi?" / "A Manager is Google's own way to let a service help with your listing. You add Kabsi as a Manager and never share your password. You stay the owner, and you can remove Kabsi on Google any time. Kabsi stops at once." (13:24, 13:194, 13:197, 13:200)
- "Does it work in my country?" / "Yes. Kabsi works for a verified Google listing in any country, at the same prices. Replies follow each reviewer's language. The website is in English." (13:9, 13:378, 13:135, 13:141)
- "Will Kabsi make ChatGPT recommend me?" / "No one can promise that. Kabsi checks what ChatGPT and Perplexity say about you, and helps you fix your listing where an answer gets a fact wrong." (13:158)

## 10. The free check again

The shared closing check (`closing.tsx`), unchanged: "Check my business free" with `TRIAL_LINE` under it.

## Meta

- Title: "Kabsi: your Google listing, taken care of on WhatsApp"
- Description (157 characters): "Kabsi answers your reviews, keeps your hours, photos and posts fresh, and checks what ChatGPT says about you. Nothing goes live until you tap yes on WhatsApp."

## How it works, aligned

The four groups at the top of How it works (`HandlesGroups`, "What Kabsi does") take the same four jobs and the same first lines as section 4: Reviews answered, Listing kept right, Posts from your photos, Found in AI answers.
