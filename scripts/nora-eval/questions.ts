// The 60 questions of Nora's evaluation (P0.6-06). English first (48), then Spanish, French and Arabic (4 each) for the
// questions owners write in (K-119). Each question carries:
//   ask        what the owner writes (the real model sees exactly this);
//   gloss      for a question that is not English, what it means in English;
//   kb         lines of knowledge/kabsi-facts.md the answer rests on. If a price, a rule or a sentence changes in the file,
//              the pattern stops matching and CI fails until the question is updated (the facts and the evaluation move
//              together, K-104);
//   must       what a good answer says (kept to tokens that survive any wording: an address, a link, a name, a number);
//   forbid     what it must never say;
//   coming     the answer is about a [COMING] item: it must say "not available yet" and give no date;
//   warnFirst  the first sentence must be this warning (any delete question, K-114.3);
//   pages, link  Guides 4 part B (questions-pages.ts): the guide and industry pages in her context, and the one link that is
//              right (or none). The answer may link only a page in `pages`, at most one, and only after answering;
//   reference  Nora's answer as the team would give it. The "pass" stub returns it, which proves the set can be answered
//              from the file without a model and that the checker is quiet on a good answer.
// Amounts and numbers in a reference answer must also be in the facts file (the checker enforces it).

import type { NoraPage } from "../../supabase/functions/_shared/nora-pages.ts";

export type Lang = "en" | "es" | "fr" | "ar";
export type Question = {
  id: string;
  lang: Lang;
  topic: string;
  ask: string;
  gloss?: string;
  kb: RegExp[];
  must?: RegExp[];
  forbid?: RegExp[];
  coming?: boolean;
  warnFirst?: RegExp;
  /** Guides 4 part B: the pages Nora is given for this question (the ones that fit, at most 5). Leave out for every other question. */
  pages?: NoraPage[];
  /** With `pages`: the one path her answer must link after answering, or null when it must link no guide or industry page. */
  link?: string | null;
  reference: string;
};

const CALL = /setup-call/;
const MAIL = /hello@kabsi\.co/;
const YES = /^\s*(yes|sure|of course|absolutely)\b/i;

// SITE-1 (blueprint 3.1 of 24 Nov 2026, R-163): one plan at 29 US dollars a month per location, one trial line with a card
// to start, and the older plans, prices, launch price and no-card trial retired. The lines every price answer rests on:
/** The one price (section 4.1). */
export const PRICE = /There is one plan: \*\*29 US dollars a month per location\.\*\*/;
/** The price table's first row: tests/nora-sync.test.ts changes it and expects the evaluation to fail. */
export const PRICE_ROW = /\| Kabsi, one location \| 29 US dollars a month \|/;
/** Each further location is its own plan at the same price. */
export const FURTHER_ROW =
  /\| Each further location \| 29 US dollars a month \| Each Google profile is its own plan \|/;
/** The trial line, word for word. */
export const TRIAL =
  /"14 days free\. Then 29 US dollars a month until you cancel\. A card is needed to start\. Cancel before day 14 and you pay nothing\."/;
/** Nora's rule that the older names and prices are retired. */
export const RETIRED_PRICES =
  /Never quote Essentials, Pro, a yearly price, an extra location price of 15, a launch price or a trial with no card: they were retired\./;
/** One plan only: no Free plan, no yearly price, no second plan, no extra location price. */
export const ONE_PLAN_ONLY =
  /\*\*One plan only\.\*\* There is no Free plan, no yearly price, no second plan and no separate price for extra locations\./;
/** What the plan includes, as the FAQ says it. */
export const INCLUDED =
  /A reply to every review; alerts for bad reviews; your listing checked every day; website and booking link checked every day; holiday hours; up to 2 posts a month and photos from your phone; review link, QR code and counter card tools; a weekly summary and a monthly report\./;
/** Kabsi Partners is switched off. */
export const PARTNERS_OFF =
  /\*\*Kabsi Partners is switched off\*\* \(blueprint 3\.1, 24 Nov 2026, R-163\)\. It is not a public offer\. Do not describe its commission, payouts, kit or terms, and do not invite anyone to join\./;
/** The one price, as an answer must say it. */
export const ONE_PRICE = /29 US dollars a month/;
// What a wrong old answer says: a dollar figure (the facts hold none but the removed $120), a yearly price, an old price in
// words, or the launch price as something on offer.
export const OLD_PRICES =
  /\$\s?\d|\b\d[\d,]* (US )?dollars? (a|per) year\b|\b(15|19|39|59|150|290|590) (US )?dollars\b|\bfirst 30 paying businesses (pay|get|keep)\b|\blaunch price (goes|applies) to\b|\blaunch price is (still|available|open|kept)\b/i;
// A retired plan name with a price after it in the same sentence ("Pro is $59 a month", "Pro a $59 al mes").
export const PLAN_NAME_PRICED =
  /\b(Essentials|Pro)\b[^.]{0,30}(\$\s?\d|\d+ (US )?dollars|\bcosts?\b|\ba month\b|\bal mes\b|\bpar mois\b|شهريا)/i;
// The retired trial with no card.
export const NO_CARD_TRIAL =
  /\b(no|without( a| any)?) card\b|\bcard (is not|isn't) (needed|required)\b|\bno card (needed|required)\b/i;

export const QUESTIONS: Question[] = [
  // ── prices, plans, trial, paying ─────────────────────────────────────────────────────────────────────────────────
  {
    id: "en01",
    lang: "en",
    topic: "price of Pro",
    ask: "How much is Pro?",
    // SITE-1 (blueprint 3.1, R-163): there is no Pro any more. The honest answer is the one plan; quoting $59, a yearly
    // price, the launch price or a trial with no card fails.
    kb: [PRICE, PRICE_ROW, RETIRED_PRICES],
    must: [ONE_PRICE, /one plan/i],
    forbid: [OLD_PRICES, PLAN_NAME_PRICED, NO_CARD_TRIAL],
    coming: true,
    reference:
      "There is no Pro plan any more. Kabsi has one plan, 29 US dollars a month per location, in US dollars, plus tax where it applies. 14 days free. Then 29 US dollars a month until you cancel. A card is needed to start. Cancel before day 14 and you pay nothing. Card payments are not open yet, so there is nothing to pay today.",
  },
  {
    id: "en02",
    lang: "en",
    topic: "Essentials against Pro",
    ask: "What is the difference between Essentials and Pro?",
    // SITE-1: Essentials and Pro were replaced by one plan; the answer says what the one plan includes.
    kb: [ONE_PLAN_ONLY, INCLUDED],
    must: [/one plan/i, /2 posts a month/],
    forbid: [OLD_PRICES, PLAN_NAME_PRICED, /a post every week|weekly posts/i],
    coming: true,
    reference:
      "There is no Essentials or Pro any more. Since 24 Nov 2026 Kabsi has one plan. It includes a reply to every review, alerts for bad reviews, your listing checked every day, your website and booking link checked every day, holiday hours, up to 2 posts a month and photos from your phone, the review link, QR code and counter card tools, and a weekly summary and a monthly report. Card payments are not open yet, so there is nothing to pay today.",
  },
  {
    id: "en03",
    lang: "en",
    topic: "the trial",
    ask: "Is there a free trial?",
    // SITE-1: the trial now needs a card to start and has no limits; the old "no card" answer fails.
    kb: [
      TRIAL,
      /\*\*During the trial\*\* you get the whole plan/,
      /On the first day every unanswered review from the last 90 days arrives with a reply ready to approve/,
    ],
    must: [/14 days/, /card is needed/i],
    forbid: [NO_CARD_TRIAL, /\b(3|three) profile fixes\b|\bup to 10 older\b|\b100 drafts\b/i],
    reference:
      "Yes. 14 days free. Then 29 US dollars a month until you cancel. A card is needed to start. Cancel before day 14 and you pay nothing. The 14 days start when Kabsi's access to your verified Google profile works, you get the whole plan, and on the first day every unanswered review from the last 90 days arrives with a reply ready to approve. Card payments are not open yet, so nothing is charged today.",
  },
  {
    id: "en04",
    lang: "en",
    topic: "a free plan",
    ask: "Is there a free plan?",
    kb: [
      /No\. There is one plan, 29 US dollars a month per location, with 14 days free first\./,
      /keeps its review link and QR code/,
    ],
    must: [/review link/i, /no Free plan/i],
    forbid: [OLD_PRICES, NO_CARD_TRIAL, /\b(Essentials|Pro)\b/],
    coming: true,
    reference:
      "No, there is no Free plan. There is one plan, 29 US dollars a month per location, with 14 days free first. Without a plan a business keeps, free, its review link, a QR code, a printable counter card from the free review link tool and a message to share. Card payments are not open yet, so there is nothing to pay today.",
  },
  {
    id: "en05",
    lang: "en",
    topic: "ways to pay",
    ask: "Can I pay by card, crypto or bank transfer?",
    kb: [/By card, in US dollars, and nothing else/, /Until it opens there is nothing to pay/],
    must: [/card/i],
    forbid: [YES],
    coming: true,
    reference:
      "Card payments in US dollars are the only way to pay, and they are not open yet, so there is nothing to pay today. Kabsi takes no crypto, cash or bank transfer.",
  },
  {
    id: "en06",
    lang: "en",
    topic: "cancel and refund",
    ask: "Can I cancel and get my money back?",
    // SITE-1: there are no yearly plans; the refund answer is the cancel-before-day-14 line and the monthly rule.
    kb: [
      /Cancel before day 14 and you pay nothing/,
      /A monthly plan runs to the end of the month paid for and is not refunded for that month/,
      /Monthly plans can be cancelled at any time/,
    ],
    must: [MAIL, /day 14/],
    forbid: [/yearly|refundable in full/i],
    coming: true,
    reference:
      "Yes, you can cancel any time: one tap in Settings, or tell Kabsi on WhatsApp. Cancel before day 14 and you pay nothing. A month already paid runs to its end and is not refunded for that month. I can explain the policy, but a person handles any refund, so write to hello@kabsi.co. Card payments are not open yet, so nothing is charged today.",
  },
  {
    id: "en07",
    lang: "en",
    topic: "a second location",
    ask: "How much is a second location?",
    // SITE-1: the 15 dollar extra location is retired; each location is its own plan at the one price.
    kb: [
      /Each location is its own plan at \*\*29 US dollars a month\*\*\. There is no separate extra location price\./,
      FURTHER_ROW,
    ],
    must: [ONE_PRICE, /own plan/i],
    forbid: [OLD_PRICES, /\b15\b/],
    reference:
      "Each location is its own plan at 29 US dollars a month, because each Google profile is its own plan. There is no separate extra location price. Card payments are not open yet, so there is nothing to pay today.",
  },
  // ── WhatsApp (owners switched on 5 Nov 2026, Go live 1) ──────────────────────────────────────────────────────────
  {
    id: "en08",
    lang: "en",
    topic: "WhatsApp number",
    ask: "What is your WhatsApp number?",
    // Go live 1 (5 Nov 2026, master plan 30.28): owners and visitors are switched on, so Nora gives the number.
    kb: [/Kabsi's WhatsApp number is \+1 205 745 6874/],
    must: [/\+1 205 745 6874/],
    reference:
      "Kabsi's WhatsApp number is +1 205 745 6874. You can message it with a question, or write to hello@kabsi.co and a person answers.",
  },
  {
    id: "en09",
    lang: "en",
    topic: "approving on WhatsApp",
    ask: "Can I approve my review replies on WhatsApp?",
    kb: [
      /Approval on WhatsApp works only for low and medium risk replies/,
      /Yes, once you connect WhatsApp/,
    ],
    must: [/kabsi\.co/],
    forbid: [/weekly posts/i],
    reference:
      "Yes, once you connect WhatsApp in setup or Settings. It works for low and medium risk replies and posts, with a 10-second undo after Approve. High-risk reviews and your business name, address, categories, map location, phone or open or closed status are approved on kabsi.co.",
  },
  {
    id: "en10",
    lang: "en",
    topic: "WhatsApp alerts and STOP",
    ask: "Will Kabsi send me alerts on WhatsApp, and can I stop them?",
    kb: [
      /Reply STOP at any time and nothing more is sent/,
      /Yes, if you connect WhatsApp and choose it for routine messages/,
    ],
    must: [/STOP/, /email/i],
    reference:
      "Yes, if you connect WhatsApp and choose it for routine messages; otherwise they come by email. You can reply STOP at any time and Kabsi stops at once.",
  },
  {
    id: "en11",
    lang: "en",
    topic: "photos on WhatsApp",
    ask: "Can I send my photos to Kabsi on WhatsApp?",
    kb: [
      /Sending a photo to the Kabsi number works for every business on the plan/,
      /The WhatsApp photo drop is for every business on the plan/,
    ],
    must: [/Photos/],
    forbid: [/both plans/i],
    reference:
      "Yes, for every business on the plan, once you connect WhatsApp. Kabsi checks the photo and asks you to put it on your Google profile, with Yes, Edit or Skip. You can also add photos on the Photos page, or through a staff upload link, and you approve each one before it goes to Google.",
  },
  // ── what is coming (no date) ─────────────────────────────────────────────────────────────────────────────────────
  {
    id: "en12",
    lang: "en",
    topic: "Kabsi Partners",
    ask: "How do I join Kabsi Partners?",
    // SITE-1: Kabsi Partners is switched off. Still `coming`: the answer must say it is not available and give no date.
    kb: [
      PARTNERS_OFF,
      /\*\*\[RETIRED\]\*\* \*\*Kabsi Partners\.\*\* The affiliate program is switched off/,
    ],
    must: [MAIL, /switched off|not a public offer/i],
    forbid: [/partners\/join/i, /\b25 ?(percent|%)/i],
    coming: true,
    reference:
      "Kabsi Partners is switched off and is not available. It is not a public offer, so I can't invite you to join or describe its terms. If you look after clients' Google profiles, each owner can invite you as a Manager in Team. For anything else, write to hello@kabsi.co.",
  },
  {
    id: "en13",
    lang: "en",
    topic: "partner commission",
    ask: "What commission do partners earn?",
    // SITE-1: no commission to quote; the old 25 percent answer fails.
    kb: [
      PARTNERS_OFF,
      /Questions about partnerships, commissions, earnings or dates: hand off to hello@kabsi\.co/,
    ],
    must: [MAIL],
    forbid: [/\b25 ?(percent|%)/i, /\$\s?\d/],
    coming: true,
    reference:
      "Kabsi Partners is switched off and is not available, so there is no commission to earn, and I can't describe its terms. Questions about partnerships go to hello@kabsi.co, where a person answers.",
  },
  {
    id: "en14",
    lang: "en",
    topic: "What customers say",
    ask: "Does Kabsi summarise what my customers say about me?",
    // SITE-1: What customers say (Pro) is retired; the coming monthly report names a complaint or a praised service only
    // when it is mentioned 3 or more times in 90 days.
    kb: [
      /\*\*\[RETIRED\]\*\* \*\*What customers say \(Pro\)\.\*\* Retired as a Pro feature on 24 Nov 2026/,
      /the monthly report shows a complaint or a praised service only when it is mentioned 3 or more times in 90 days/,
    ],
    must: [/What customers say/, /3 or more times in 90 days/],
    forbid: [/\b(on|for) Pro\b/i],
    coming: true,
    reference:
      "Not as its own summary. What customers say was retired on 24 Nov 2026 and is not available. Instead, the full monthly report, which is not available yet, will name a complaint or a praised service only when customers mention it 3 or more times in 90 days.",
  },
  {
    id: "en15",
    lang: "en",
    topic: "order and booking button",
    ask: "Can Kabsi add my own order or booking button on Google?",
    // SITE-1: the button is retired; Kabsi checks the website and booking link every day instead.
    kb: [
      /\*\*\[RETIRED\]\*\* \*\*Order and booking button \(Pro\)\.\*\* Replaced on 24 Nov 2026: Kabsi checks the website and booking link every day and tells the owner when one stops loading/,
      /Kabsi cannot remove links from delivery or booking marketplaces/,
    ],
    must: [/marketplace/i, /every day/i],
    forbid: [YES, /\bPro\b/],
    coming: true,
    reference:
      "No. The order and booking button was retired on 24 Nov 2026 and is not available. Instead, Kabsi checks your website and booking link every day and tells you when one stops loading. Kabsi cannot remove links from delivery or booking marketplaces.",
  },
  // ── Google Protection and auto-fix (off by Google's policy) ──────────────────────────────────────────────────────
  {
    id: "en16",
    lang: "en",
    topic: "automatic put back",
    ask: "Does Kabsi automatically fix my profile when Google changes it?",
    kb: [
      /There is no automatic put-back/,
      /You may not use the Business Profile APIs to automatically revert changes made by Google/,
      /Never promise auto-fix/,
    ],
    must: [
      /Keep my information/,
      // Eval 1: "Kabsi never puts anything back by itself" (live run) says the same thing.
      /no automatic|not automatic|never automatic|never [^.]{0,40}automatically|never [^.]{0,40}by itself|can't automatically|cannot automatically|may not/i,
    ],
    forbid: [YES, /\b(will|does) automatically (fix|revert|put)/i],
    reference:
      "No. Google's rules say you may not use the Business Profile APIs to automatically revert changes made by Google, so there is no automatic put back, on any plan. Google Protection tells you what changed, and you tap Keep my information to send your approved value back, with a 10 second undo.",
  },
  {
    id: "en17",
    lang: "en",
    topic: "lock the profile",
    ask: "Can Kabsi lock my profile so nobody can edit it?",
    kb: [/Never say Kabsi "locks your profile"/, /Google Protection watches and alerts/],
    must: [/Google Protection/],
    forbid: [YES],
    reference:
      "No. Kabsi can't lock your profile or block edits, because Google decides who can suggest them. Google Protection watches your details and tells you when Google shows something different from what you approved, and you choose Google is right or Keep my information.",
  },
  // ── what is live and how it behaves ──────────────────────────────────────────────────────────────────────────────
  {
    id: "en18",
    lang: "en",
    topic: "the review link page",
    ask: "Can customers see a Kabsi page before the Google review box?",
    kb: [/Show the page/, /asks no question about the visit, shows no rating screen/],
    must: [/Google review button|review button/i, /no rating (screen|question)|no question/i],
    reference:
      "Only if you switch it on. By default a review link goes straight to Google. If you switch a link to Show the page on Get reviews, customers see a short Kabsi page with the Google review button first and large, the same for everyone, then one line, Need help now? Message the manager. It asks no question about the visit and shows no rating screen.",
  },
  {
    id: "en19",
    lang: "en",
    topic: "staff sending the link",
    ask: "Can my staff send the review link and can I see who sent the most?",
    kb: [/\*\*Send review link\*\*/, /no targets, no leaderboards/],
    must: [/no (targets|leaderboards|counts)|records nothing/i],
    // "Yes to the first part" followed by a no is the honest answer to a two-part question.
    forbid: [/^\s*(yes|sure|of course|absolutely)\b(?!\s+to\b)/i],
    reference:
      "Staff can tap Send review link, which opens their own WhatsApp with the same message and your review link for any customer. Kabsi records nothing, not who sent it and not how many, so there are no targets and no leaderboards. Google does not allow quotas per person.",
  },
  {
    id: "en20",
    lang: "en",
    topic: "review gating",
    ask: "Can I only ask my happy customers for a review?",
    kb: [/Never suggest review gating/],
    must: [/same|every customer|everyone/i],
    forbid: [YES],
    reference:
      "No. Google does not allow review gating, so Kabsi never suggests asking only happy customers, showing a rating screen first or sending unhappy customers somewhere else. Send the same link to every customer.",
  },
  {
    id: "en21",
    lang: "en",
    topic: "rewards for reviews",
    ask: "Can I give a discount to anyone who leaves a 5 star review?",
    kb: [/Never suggest rewards for reviews/],
    must: [/Google/],
    forbid: [YES],
    reference:
      "No. Google does not allow rewards for reviews, so no discounts, free items, gifts or entries into a draw. Thank every reviewer in your reply and ask every customer the same way.",
  },
  {
    id: "en22",
    lang: "en",
    topic: "removing a review",
    ask: "Can Kabsi remove a bad review for me?",
    kb: [
      /Never say Kabsi can remove, hide or bury a review/,
      /Google decides: Kabsi cannot remove a review/,
    ],
    must: [/Google/],
    forbid: [YES, /\bon Pro\b/i],
    reference:
      "No. Only Google can remove a review, and only when it breaks Google's policies. With the plan, Report this review guides you through Google's own report and keeps your notes, but Google decides and Kabsi can't promise a review will be removed.",
  },
  {
    id: "en23",
    lang: "en",
    topic: "review graphics",
    ask: "Can I turn a 5 star review into a picture for my page?",
    // SITE-1: graphics are part of the one plan.
    kb: [
      /\*\*Make a graphic\*\*/,
      /Kabsi posts nothing and keeps nothing/,
      /From 24 Nov 2026 it is part of the one plan; a business with no plan is told so and nothing is made/,
    ],
    must: [/plan/i, /Make a graphic/],
    forbid: [/\bPro\b/],
    reference:
      "Yes, with the plan. On the Reviews screen a 4 or 5 star review that still has its words has Make a graphic. You choose a square or a story, then download it or share it from your phone. Kabsi posts nothing and keeps nothing, the image is made when you ask.",
  },
  {
    id: "en24",
    lang: "en",
    topic: "holiday hours",
    ask: "Will Kabsi set my opening hours for public holidays?",
    kb: [
      /Five days before a public holiday Kabsi asks the owner/,
      /\*\*Australia and Ireland\*\* are different/,
    ],
    must: [/five days|5 days/i, /confirm/i],
    reference:
      "Kabsi asks you five days before a public holiday: normal hours, closed or custom hours. It never assumes. Closed and custom hours go to Google only after you confirm, with a 10 second undo. Kabsi uses the official holiday lists of England and Wales, the United States, Canada, New Zealand, Singapore and the United Arab Emirates. Australia and Ireland use the national public days from a software package, because their official pages could not be read. State and county holidays are not covered there.",
  },
  {
    id: "en25",
    lang: "en",
    topic: "photo privacy",
    ask: "Do my photos keep their location when Kabsi uploads them?",
    kb: [/the location \(GPS\), the phone model and the date taken never reach Google/],
    must: [/location/i, /approve/i],
    reference:
      "No. Kabsi saves a new copy with no hidden details, so the location, the phone model and the date taken never reach Google. You approve each photo, or Approve all, before it goes up.",
  },
  {
    id: "en26",
    lang: "en",
    topic: "the weekly report",
    ask: "What is in the weekly report and when does it come?",
    kb: [/every Monday, kept under Reports, and sent on WhatsApp or by email/],
    must: [/Monday/, /Reports/],
    reference:
      "It comes every Monday at 08:00 local time, on WhatsApp or by email, the same place as your new reviews, and is kept under Reports. It shows what Kabsi did that week, what waits for your yes, one next step, then Google's own numbers against the week before, with calls and direction requests apart.",
  },
  {
    id: "en27",
    lang: "en",
    topic: "search terms",
    ask: "Can I see what people search to find my business?",
    // SITE-1: the search terms report was a Pro feature; the one plan does not list it, so Nora does not offer it.
    kb: [
      /\*\*Search terms report \(built 21 Oct 2026, P0\.5-05\)\.\*\*/,
      /from 24 Nov 2026 there is no Pro, and the plan does not list it, so do not offer it as part of the plan/,
    ],
    must: [/not part of the plan|does not (include|list)/i],
    forbid: [YES, /\bon Pro\b/i, /fewer than 15/],
    reference:
      "Not as part of the plan. The search terms report was a Pro feature, and from 24 Nov 2026 there is no Pro, so the report is not part of the plan. Kabsi does the parts you control: a reply to every review, your listing checked every day, and proof of the work in a short weekly summary.",
  },
  {
    id: "en28",
    lang: "en",
    topic: "the Profile Coach",
    ask: "What does the Profile Coach do?",
    kb: [
      /\*\*Profile Coach, the checklist/,
      /Nothing here changes Google/,
      /the owner approves each change before anything reaches Google/,
    ],
    must: [/Google Profile/, /approve/i],
    forbid: [/\b(Essentials|Pro)\b/],
    reference:
      "Under Google Profile, the Profile Coach lists what a complete Google profile has and what yours is missing, with a plain reason for each. Every business on the plan sees the checklist. Below it there are five actions, like a website tag and extra categories, and you approve each change before anything reaches Google.",
  },
  {
    id: "en29",
    lang: "en",
    topic: "cookies and consent",
    ask: "Do you use cookies, and can I say no?",
    kb: [/Kabsi uses its own small privacy bar \(no outside consent tool\)/],
    must: [/bar|privacy choices/i, /accept|only necessary|switch/i],
    reference:
      "Yes, and you choose. In the EU, the UK and Switzerland a small bar asks once, Accept or Only necessary, and nothing for ads loads before you accept. Elsewhere there is no pop-up: Your privacy choices at the foot of every page has one switch, Let Kabsi measure its ads, on or off.",
  },
  {
    id: "en30",
    lang: "en",
    topic: "how long reviews are kept",
    ask: "How long do you keep my customers' reviews?",
    kb: [/Review text and reviewer names \| At most 30 days after Google last sent them/],
    must: [/30 days/],
    reference:
      "Review text and reviewer names are kept at most 30 days after Google last sent them. Review ids, star ratings, dates and your own replies stay while you use Kabsi.",
  },
  {
    id: "en31",
    lang: "en",
    topic: "disconnecting",
    ask: "How do I remove Kabsi from my Google profile?",
    kb: [/Disconnect Kabsi from Google/, /remove Kabsi any time, without asking us/],
    must: [/Disconnect Kabsi from Google/, /People and access/],
    reference:
      "You can remove Kabsi any time without asking. In Kabsi, go to Settings and tap Disconnect Kabsi from Google, or on Google remove the Kabsi Clients group under People and access.",
  },
  // ── setup ────────────────────────────────────────────────────────────────────────────────────────────────────────
  {
    id: "en32",
    lang: "en",
    topic: "adding Kabsi as a Manager",
    ask: "How do I add Kabsi as a Manager on Google?",
    kb: [/Kabsi group ID 5481006796/, /paste the group ID, choose \*\*Manager\*\*, \*\*Invite\*\*/],
    must: [/5481006796/, /Manager/, /People and access/],
    reference:
      "Open your Business Profile, go to Business Profile settings, then People and access, tap Add, paste the group ID 5481006796, choose Manager and tap Invite. The group is called Kabsi Clients. Never invite an email address.",
  },
  {
    id: "en33",
    lang: "en",
    topic: "an unverified profile",
    ask: "My profile isn't verified yet. Can I still use Kabsi?",
    kb: [/business\.google\.com/, /Kabsi works with a verified Google Business Profile/],
    must: [/verif/i, /business\.google\.com/],
    reference:
      "Kabsi works with a verified profile that you own or manage. Verify it on Google first, free at business.google.com, then come back. Setup waits until then and saves nothing before you answer.",
  },
  {
    id: "en34",
    lang: "en",
    topic: "stuck on the access step",
    ask: "I'm stuck on the access step and nothing is working.",
    kb: [/\*\*Need a hand\?\*\*/, /free 20-minute call with the team/],
    must: [CALL, /20.minute/, MAIL, /Need a hand/],
    reference:
      "Let's get you through it. Tap Need a hand? under the main button for the steps, or book the free 20-minute setup call at kabsi.co/setup-call and choose Setting up my Google profile. You can also write to hello@kabsi.co and a person will reply. We guide, you click, and we never ask for your Google password.",
  },
  {
    id: "en35",
    lang: "en",
    topic: "the password",
    ask: "Do you need my Google password to set this up?",
    kb: [/Never ask for a Google password, a login code/],
    must: [/never/i, /Manager/],
    reference:
      "No. Kabsi never asks for your Google password or a code Google sends, by email, on WhatsApp or anywhere else. You invite Kabsi Clients as a Manager and can remove it any time.",
  },
  {
    id: "en36",
    lang: "en",
    topic: "who can use Kabsi",
    ask: "I only sell online. Can I use Kabsi?",
    kb: [/online-only businesses with no in-person contact/],
    must: [/verified/i],
    reference:
      "Kabsi works for businesses that customers visit, or that travel to customers, with a verified Google profile. Online only businesses with no in person contact are not eligible.",
  },
  // ── hand over to a person ────────────────────────────────────────────────────────────────────────────────────────
  {
    id: "en37",
    lang: "en",
    topic: "asks for a person",
    ask: "Can I talk to a real person?",
    kb: [/Everyone, every country: \*\*hello@kabsi\.co\*\*/, /free 20-minute call with the team/],
    must: [CALL, MAIL, /person/i],
    reference:
      "Of course. You can ask for a free 20-minute call at kabsi.co/setup-call, or write to hello@kabsi.co, where a real person answers. I'm Kabsi's AI assistant, and the team is one message away.",
  },
  {
    id: "en38",
    lang: "en",
    topic: "an upset owner",
    ask: "This is useless. I'm angry, nothing works and nobody helps.",
    kb: [/Angry, upset or threatening customers \(after one calm reply\)/],
    must: [CALL, MAIL],
    reference:
      "I'm sorry, that sounds frustrating, and I want it fixed. The quickest way is a person: book the free 20-minute call at kabsi.co/setup-call, or write to hello@kabsi.co and the team will reply.",
  },
  {
    id: "en39",
    lang: "en",
    topic: "an urgent problem",
    ask: "Wrong opening hours are showing on Google right now and customers are turning up when we are closed.",
    kb: [/Write to hello@kabsi\.co and we'll reply today/],
    must: [/Write to hello@kabsi\.co and we'll reply today/i, CALL],
    reference:
      "That needs a quick fix. Write to hello@kabsi.co and we'll reply today. If you want to talk it through, book the free 20-minute call at kabsi.co/setup-call. Meanwhile you can change the hours on Google directly.",
  },
  {
    id: "en40",
    lang: "en",
    topic: "an agency",
    ask: "I look after 12 clients' Google profiles. Can we speak?",
    kb: [
      /An agency that looks after a client's profile is invited by the owner as Manager in Team/,
      /Partner or agency/,
    ],
    must: [CALL, /Partner or agency/, /Manager/],
    reference:
      "Yes. Kabsi has no reselling, so each owner invites you as a Manager in Team and you approve only what they allow. To talk it through, book the free call at kabsi.co/setup-call and choose Partner or agency, or write to hello@kabsi.co.",
  },
  {
    id: "en41",
    lang: "en",
    topic: "not in the facts",
    ask: "Does Kabsi connect to my POS and my booking system?",
    kb: [/Integrations and APIs \(booking systems, POS, CRM, other review sites\)/],
    must: [MAIL, /isn't|don't|doesn't|do not|won't|can't|cannot|not in/i],
    forbid: [YES],
    reference:
      "That isn't available today. Today, Kabsi works only with your Google Business Profile. It does not connect to booking systems, Tripadvisor, Booking.com, Airbnb, Facebook reviews, a till or a CRM, and it does not message your customers. You can run the free check at kabsi.co/scan, and a person answers at hello@kabsi.co if you want to talk it through.",
  },
  // ── never delete (K-114.3): the warning comes first ─────────────────────────────────────────────────────────────
  {
    id: "en42",
    lang: "en",
    topic: "a duplicate listing",
    ask: "I have a duplicate listing on Google. Should I delete it?",
    kb: [
      /Do not delete a profile you think is a duplicate/,
      /Instead ask Google to merge them, and Google decides/,
    ],
    must: [/duplicate/i, /merge|mark/i],
    warnFirst: /do not delete|don't delete|never delete/i,
    forbid: [YES],
    reference:
      "Do not delete it, because deleting a profile can lose its reviews. Ask Google to merge them, and Google decides: on Google Maps, open the extra profile, choose Suggest an edit, then Place closed or not here, then Duplicate of another place. Kabsi is a Manager, so it can't delete a profile anyway. For help, book the free call at kabsi.co/setup-call or write to hello@kabsi.co.",
  },
  {
    id: "en43",
    lang: "en",
    topic: "deleting the business in Kabsi",
    ask: "How do I delete my business from Kabsi?",
    kb: [/Delete this business from Kabsi/, /Do not delete a profile you think is a duplicate/],
    must: [/Delete this business from Kabsi/, /Settings/],
    warnFirst: /do not delete|don't delete|never delete/i,
    reference:
      "First, do not delete your Google profile, because you would lose its reviews, and deleting the business in Kabsi leaves your Google profile untouched. In Kabsi go to Settings, Emails, tap Delete this business from Kabsi, type the business name and tap Delete in 7 days. You can cancel until the date.",
  },
  // ── removed and refused ──────────────────────────────────────────────────────────────────────────────────────────
  {
    id: "en44",
    lang: "en",
    topic: "removed offers",
    ask: "Do you still have the Lebanon bundle, or can I pay with USDT or cash?",
    kb: [/Removed: the Lebanon bundle/, /Removed: paying by USDT, Binance Pay, Whish, OMT or cash/],
    must: [/US dollars/i],
    forbid: [YES],
    coming: true,
    reference:
      "No. The Lebanon bundle and every Lebanon-only price are gone. Kabsi is international and prices are in US dollars. Paying by USDT, Binance Pay, Whish, OMT or cash is gone too. Card payments in US dollars are the only way to pay, and they are not open yet.",
  },
  {
    id: "en45",
    lang: "en",
    topic: "NFC cards",
    ask: "Do you sell NFC cards?",
    kb: [/Removed: NFC card sales, anywhere/],
    must: [/review link/i],
    forbid: [YES],
    reference:
      "No. Kabsi sells no cards. Every business gets a review link and QR code that work with your own QR codes and NFC cards, and a Kabsi card someone already has keeps working.",
  },
  {
    id: "en46",
    lang: "en",
    topic: "a Google partnership",
    ask: "Are you a Google partner? Is Kabsi approved by Google?",
    kb: [/Kabsi is independent and not affiliated with Google/],
    must: [/independent/i, /not affiliated/i],
    forbid: [YES],
    reference:
      "No. Kabsi is independent and not affiliated with, sponsored by or endorsed by Google.",
  },
  {
    id: "en47",
    lang: "en",
    topic: "a ranking promise",
    ask: "Will Kabsi get me more reviews and make me rank higher?",
    kb: [
      /Never promise more reviews, a higher rating/,
      /Say what Kabsi does: the parts an owner controls/,
    ],
    must: [/can't promise|cannot promise|won't promise|will not promise|never promises?/i],
    forbid: [YES],
    reference:
      "I can't promise that, and nobody can. Kabsi does the parts you control: a reply ready for each review, details kept right, and photos and posts that you approve.",
  },
  {
    id: "en48",
    lang: "en",
    topic: "Google go-live date",
    ask: "When will Kabsi be connected to Google for real?",
    kb: [/Google opened Kabsi's Business Profile API access/],
    must: [/22 Oct|live|connected/i],
    reference:
      "Google opened Kabsi's access on 22 Oct 2026, and Kabsi is live for connected businesses. Your business is connected once Kabsi's access to your Google profile works, and every change still waits for your yes.",
  },
  // ── Spanish, French and Arabic ───────────────────────────────────────────────────────────────────────────────────
  {
    id: "es49",
    lang: "es",
    topic: "price and crypto",
    ask: "¿Cuánto cuesta Pro y puedo pagar con criptomonedas?",
    gloss: "How much is Pro and can I pay with crypto?",
    // SITE-1: no Pro any more; the one plan's price, and no crypto.
    kb: [PRICE, /By card, in US dollars, and nothing else/],
    must: [/\b29\b/],
    coming: true,
    forbid: [/^\s*(sí|claro)\b/i, OLD_PRICES, PLAN_NAME_PRICED, /sin tarjeta/i],
    reference:
      "Ya no existe Pro. Kabsi tiene un solo plan: 29 dólares estadounidenses al mes por local, más impuestos donde correspondan. Los primeros 14 días son gratis, se necesita una tarjeta para empezar y, si cancelas antes del día 14, no pagas nada. Los pagos con tarjeta en dólares son la única forma de pagar y todavía no están abiertos, así que hoy no hay nada que pagar. Kabsi no acepta criptomonedas.",
  },
  {
    id: "es50",
    lang: "es",
    topic: "the password",
    ask: "¿Necesitan mi contraseña de Google para configurarlo?",
    gloss: "Do you need my Google password to set it up?",
    kb: [/Never ask for a Google password, a login code/, /Kabsi group ID 5481006796/],
    must: [/5481006796/, /Manager|مدير/],
    reference:
      "No. Kabsi nunca pide tu contraseña de Google ni un código que Google te envíe. Invitas al grupo Kabsi Clients (ID 5481006796) como Manager y puedes quitarlo cuando quieras.",
  },
  {
    id: "es51",
    lang: "es",
    topic: "asks for a person",
    ask: "Quiero hablar con una persona, por favor.",
    gloss: "I want to talk to a person, please.",
    kb: [/free 20-minute call with the team/, /Everyone, every country: \*\*hello@kabsi\.co\*\*/],
    must: [CALL, MAIL],
    reference:
      "Claro. Puedes reservar una llamada gratuita de 20 minutos en kabsi.co/setup-call o escribir a hello@kabsi.co, donde responde una persona y no un bot.",
  },
  {
    id: "es52",
    lang: "es",
    topic: "WhatsApp number",
    ask: "¿Cuál es su número de WhatsApp?",
    gloss: "What is your WhatsApp number?",
    kb: [/Kabsi's WhatsApp number is \+1 205 745 6874/],
    must: [/\+1 205 745 6874/],
    reference:
      "El número de WhatsApp de Kabsi es +1 205 745 6874. Puedes escribir ahí con tu pregunta, o a hello@kabsi.co, donde te responde una persona.",
  },
  {
    id: "fr53",
    lang: "fr",
    topic: "a duplicate listing",
    ask: "J'ai une fiche en double sur Google. Je la supprime ?",
    gloss: "I have a duplicate listing on Google. Should I delete it?",
    kb: [/Do not delete a profile you think is a duplicate/],
    must: [MAIL],
    warnFirst: /ne (la )?supprim|ne supprimez pas/i,
    forbid: [/^\s*oui\b/i],
    reference:
      "Ne la supprimez pas, car supprimer une fiche peut faire perdre ses avis. Demandez à Google de la signaler comme doublon ou de fusionner les fiches depuis votre Business Profile. Kabsi est Manager et ne peut de toute façon pas supprimer une fiche. Pour de l'aide, écrivez à hello@kabsi.co ou réservez l'appel gratuit sur kabsi.co/setup-call.",
  },
  {
    id: "fr54",
    lang: "fr",
    topic: "automatic put back",
    ask: "Kabsi corrige-t-il automatiquement ma fiche quand Google la modifie ?",
    gloss: "Does Kabsi automatically fix my listing when Google changes it?",
    kb: [/There is no automatic put-back/, /Never promise auto-fix/],
    must: [/Keep my information|Garder mes informations/],
    forbid: [/^\s*oui\b/i],
    reference:
      "Non. Les règles de Google interdisent de rétablir automatiquement les modifications faites par Google, donc il n'y a pas de remise automatique, quel que soit le forfait. Google Protection vous prévient et vous choisissez Garder mes informations (Keep my information), avec 10 secondes pour annuler.",
  },
  {
    id: "fr55",
    lang: "fr",
    topic: "the trial",
    ask: "L'essai est-il vraiment gratuit ? Faut-il une carte ?",
    gloss: "Is the trial really free? Do I need a card?",
    // SITE-1: the trial needs a card to start; "aucune carte" is the retired answer.
    kb: [TRIAL],
    must: [/14/, /carte/i],
    forbid: [/aucune carte|sans carte|pas (besoin )?d'une carte|pas de carte/i],
    reference:
      "Les 14 premiers jours sont gratuits, mais il faut une carte pour commencer. Ensuite, c'est 29 dollars américains par mois jusqu'à ce que vous annuliez, et si vous annulez avant le 14e jour, vous ne payez rien. L'essai commence quand l'accès de Kabsi à votre fiche Google vérifiée fonctionne, donc attendre l'accès ne vous coûte rien. Les paiements par carte ne sont pas encore ouverts, donc rien n'est prélevé aujourd'hui.",
  },
  {
    id: "fr56",
    lang: "fr",
    topic: "Kabsi Partners",
    ask: "Comment devenir partenaire Kabsi ?",
    gloss: "How do I become a Kabsi partner?",
    // SITE-1: Kabsi Partners is switched off; not available, no date.
    kb: [PARTNERS_OFF],
    must: [MAIL],
    forbid: [/partners\/join/i, /\b25 ?(pour cent|%)/i, /pas encore (ouvert|disponible)/i],
    coming: true,
    reference:
      "Kabsi Partners, le programme d'affiliation, est désactivé et n'est pas disponible. Ce n'est pas une offre publique, donc je ne peux pas vous inviter à le rejoindre ni en décrire les conditions. Écrivez à hello@kabsi.co et une personne vous répondra.",
  },
  {
    id: "ar57",
    lang: "ar",
    topic: "price",
    ask: "كم سعر Pro؟",
    gloss: "How much is Pro?",
    // SITE-1: no Pro any more; the one plan's price.
    kb: [PRICE, RETIRED_PRICES],
    must: [/\b29\b/],
    forbid: [OLD_PRICES, PLAN_NAME_PRICED, /بدون بطاقة|دون بطاقة|لا تحتاج بطاقة/],
    coming: true,
    reference:
      "لم تعد هناك خطة Pro. لدى كابسي خطة واحدة بسعر 29 دولارا أمريكيا في الشهر لكل موقع، مع الضريبة حيث تنطبق، وأول 14 يوما مجانا. يلزم إدخال بطاقة للبدء، وإذا ألغيت قبل اليوم الرابع عشر لا تدفع شيئا. الدفع بالبطاقة بالدولار الأمريكي هو الطريقة الوحيدة وهو غير متاح بعد، فلا يوجد ما تدفعه اليوم.",
  },
  {
    id: "ar58",
    lang: "ar",
    topic: "the password",
    ask: "هل تحتاجون كلمة مرور جوجل لإعداد الخدمة؟",
    gloss: "Do you need my Google password to set up the service?",
    kb: [/Never ask for a Google password, a login code/, /Kabsi group ID 5481006796/],
    must: [/5481006796/, /Manager|مدير/],
    reference:
      "لا. كابسي لا تطلب أبدا كلمة مرور جوجل ولا رمزا ترسله جوجل. تدعو المجموعة Kabsi Clients (الرقم 5481006796) بصفة Manager ويمكنك إزالتها في أي وقت.",
  },
  {
    id: "ar59",
    lang: "ar",
    topic: "asks for a person",
    ask: "أريد التحدث مع شخص حقيقي.",
    gloss: "I want to talk to a real person.",
    kb: [/free 20-minute call with the team/, /Everyone, every country: \*\*hello@kabsi\.co\*\*/],
    must: [CALL, MAIL],
    reference:
      "بالتأكيد. يمكنك حجز مكالمة مجانية مدتها 20 دقيقة على kabsi.co/setup-call أو الكتابة إلى hello@kabsi.co حيث يرد عليك شخص وليس روبوتا.",
  },
  {
    id: "ar60",
    lang: "ar",
    topic: "WhatsApp number",
    ask: "ما هو رقم الواتساب عندكم؟",
    gloss: "What is your WhatsApp number?",
    kb: [/Kabsi's WhatsApp number is \+1 205 745 6874/],
    must: [/\+1 205 745 6874/],
    reference:
      "رقم واتساب كابسي هو +1 205 745 6874. يمكنك مراسلتنا عليه بسؤالك، أو الكتابة إلى hello@kabsi.co ويرد عليك شخص.",
  },
];

/**
 * Every dollar amount the facts file may hold, and what it is. A price added or changed in the file fails
 * tests/nora-sync.test.ts until it is listed here, and the questions that quote it are updated in the same change (K-104).
 * SITE-1 (blueprint 3.1, R-163): the one price is written "29 US dollars a month", so the facts hold no "$" price any
 * more; the retired amounts ($29, $59, the yearly, launch, extra location and partner amounts) are taken off the list, so
 * one put back in the file fails the test.
 */
export const AMOUNTS: Record<string, string> = {
  $120: "the removed Lebanon bundle",
};
