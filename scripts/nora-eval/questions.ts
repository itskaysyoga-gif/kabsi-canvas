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
//   reference  Nora's answer as the team would give it. The "pass" stub returns it, which proves the set can be answered
//              from the file without a model and that the checker is quiet on a good answer.
// Amounts and numbers in a reference answer must also be in the facts file (the checker enforces it).

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
  reference: string;
};

const CALL = /setup-call/;
const MAIL = /hello@kabsi\.co/;
const YES = /^\s*(yes|sure|of course|absolutely)\b/i;

export const QUESTIONS: Question[] = [
  // ── prices, plans, trial, paying ─────────────────────────────────────────────────────────────────────────────────
  {
    id: "en01",
    lang: "en",
    topic: "price of Pro",
    ask: "How much is Pro?",
    kb: [
      /\$19 a month/,
      /\$190 a year/,
      /Pro \| \$39 \| \$390/,
      /Do not quote Essentials or Pro prices as available/,
    ],
    must: [/\$39/, /\$390/],
    coming: true,
    reference:
      "Today the pricing page shows Pro at $19 a month or $190 a year. That is changing: Essentials will be $19 a month or $190 a year and Pro $39 a month or $390 a year, but those plans are not available yet. Card payments are not open yet either, so there is nothing to pay today.",
  },
  {
    id: "en02",
    lang: "en",
    topic: "Essentials against Pro",
    ask: "What is the difference between Essentials and Pro?",
    kb: [/\*\*Essentials will include:\*\*/, /\*\*Pro will add:\*\*/],
    must: [/Essentials/, /Pro/],
    coming: true,
    reference:
      "Essentials will cover the core: review alerts with ready replies, Google Protection with a one tap Put it back, the review link and QR code, holiday hours reminders, the Weekly Care Report, About your business, Nora and the Profile Coach checklist. Pro will add things like review graphics, the Profile Coach actions, a search terms report and the Report a fake review helper. Neither plan is available yet, and card payments are not open yet.",
  },
  {
    id: "en03",
    lang: "en",
    topic: "the trial",
    ask: "Is there a free trial?",
    kb: [
      /Free trial: 14 days, no card/,
      /3 of your choice/,
      /up to \*\*10\*\* older unanswered reviews/,
    ],
    must: [/14 days/, /no card/i],
    reference:
      "Yes, 14 days with no card. It starts when Kabsi's access to your verified Google profile works, so waiting for access costs you nothing. You get the full product with three limits: 3 profile fixes of your choice, replies for up to 10 older unanswered reviews, and after 100 drafts you choose a plan or book a free setup call.",
  },
  {
    id: "en04",
    lang: "en",
    topic: "a free plan",
    ask: "Is there a free plan?",
    kb: [/There will be no Free plan/, /keeps its review link and QR code/],
    must: [/review link/i],
    coming: true,
    reference:
      "Today you can start with the 14 day trial, and every business keeps its review link and QR code for free. Once Essentials and Pro open there will be no Free plan, but they are not available yet.",
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
    kb: [
      /Yearly plans are refundable in full within 14 days/,
      /Monthly plans can be cancelled at any time/,
    ],
    must: [MAIL, /14 days/],
    reference:
      "Monthly plans cancel any time, and a monthly plan is not refunded for the month already paid. Yearly plans are refundable in full within 14 days of the plan starting. I can explain the policy but a person approves any refund, so write to hello@kabsi.co.",
  },
  {
    id: "en07",
    lang: "en",
    topic: "a second location",
    ask: "How much is a second location?",
    kb: [/Extra location \| \$15 a month or \$150 a year/],
    must: [/\$15/, /\$150/],
    reference:
      "An extra location is $15 a month or $150 a year for each extra Google profile, on top of the plan.",
  },
  // ── WhatsApp (no number yet) ─────────────────────────────────────────────────────────────────────────────────────
  {
    id: "en08",
    lang: "en",
    topic: "WhatsApp number",
    ask: "What is your WhatsApp number?",
    kb: [/Kabsi has no WhatsApp number at the moment/, /Never give one/],
    must: [MAIL, /no WhatsApp number|not have a WhatsApp number/i],
    reference:
      "Kabsi has no WhatsApp number at the moment, so I can't give you one. Write to hello@kabsi.co and a person answers, it is not an automatic bot.",
  },
  {
    id: "en09",
    lang: "en",
    topic: "approving on WhatsApp",
    ask: "Can I approve my review replies on WhatsApp?",
    kb: [
      /Approval on WhatsApp will work only for low and medium risk replies/,
      /Not yet; approve on kabsi\.co/,
    ],
    must: [/kabsi\.co/],
    coming: true,
    reference:
      "Not yet. Approving on WhatsApp is not available yet because Kabsi has no WhatsApp number at the moment. Today you approve on kabsi.co, in the app or from the email. When it opens it will work for low and medium risk replies and weekly posts, never for high-risk reviews or your business name, address, categories, map pin, phone or open or closed status.",
  },
  {
    id: "en10",
    lang: "en",
    topic: "WhatsApp alerts and STOP",
    ask: "Will Kabsi send me alerts on WhatsApp, and can I stop them?",
    kb: [
      /Reply STOP at any time and nothing more is sent/,
      /email is the only alert channel today/,
    ],
    must: [/STOP/, /email/i],
    coming: true,
    reference:
      "Not yet, so email is the only alert channel today. When WhatsApp alerts open they will need your opt in, and you can reply STOP at any time and Kabsi stops at once.",
  },
  {
    id: "en11",
    lang: "en",
    topic: "photos on WhatsApp",
    ask: "Can I send my photos to Kabsi on WhatsApp?",
    kb: [
      /Sending photos to the Kabsi number puts them in Photos for you to approve \(Pro\)/,
      /Pro's WhatsApp photo drop comes with the WhatsApp owner channel/,
    ],
    must: [/Photos/],
    coming: true,
    reference:
      "Not yet. The WhatsApp photo drop is a Pro feature that comes with WhatsApp, and it is not available yet. Today you add photos on the Photos page, or through a staff upload link, and you approve each one before it goes to Google.",
  },
  // ── what is coming (no date) ─────────────────────────────────────────────────────────────────────────────────────
  {
    id: "en12",
    lang: "en",
    topic: "Kabsi Partners",
    ask: "How do I join Kabsi Partners?",
    kb: [/\*\*Kabsi Partners:\*\* an affiliate program/, /Not open yet/],
    must: [MAIL],
    coming: true,
    reference:
      "Kabsi Partners, the affiliate program, is not open yet, and I can't give a date. When it opens anyone can apply and the team approves each person. For anything about it, write to hello@kabsi.co.",
  },
  {
    id: "en13",
    lang: "en",
    topic: "partner commission",
    ask: "What commission do partners earn?",
    kb: [/earns 30% of every payment for the first 12 months/, /\$50 minimum/],
    must: [/30%/],
    coming: true,
    reference:
      "When Kabsi Partners opens, a partner earns 30% of every payment for the first 12 months of each business they refer, paid monthly with a $50 minimum. It is not open yet, so nothing can be earned today.",
  },
  {
    id: "en14",
    lang: "en",
    topic: "What customers say",
    ask: "Does Kabsi summarise what my customers say about me?",
    kb: [/\*\*What customers say \(Pro\):\*\*/, /only when AI credit is on/],
    must: [/What customers say/],
    coming: true,
    reference:
      "A monthly What customers say summary for Pro is not available yet, and it needs Kabsi's AI credit to be on. Today the Weekly Care Report shows your new reviews and your average rating.",
  },
  {
    id: "en15",
    lang: "en",
    topic: "order and booking button",
    ask: "Can Kabsi add my own order or booking button on Google?",
    kb: [
      /\*\*Order and booking button \(Pro\):\*\*/,
      /Kabsi cannot remove links from delivery or booking marketplaces/,
    ],
    must: [/marketplace/i],
    coming: true,
    reference:
      "An order and booking button of your own on Google, for Pro, is not available yet. It will add your own link and alert you if it goes missing or changes. Kabsi cannot remove links from delivery or booking marketplaces.",
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
      /no automatic|not automatic|never automatic|can't automatically|cannot automatically|may not/i,
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
    must: [/Google review button|review button/i, /no rating screen|no question/i],
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
    forbid: [YES],
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
    forbid: [YES],
    reference:
      "No. Only Google can remove a review, and only when it breaks Google's policies. On Pro, Report this review guides you through Google's own report and keeps your notes, but Google decides and Kabsi can't promise a review will be removed.",
  },
  {
    id: "en23",
    lang: "en",
    topic: "review graphics",
    ask: "Can I turn a 5 star review into a picture for my page?",
    kb: [/\*\*Make a graphic\*\*/, /Kabsi posts nothing and keeps nothing/],
    must: [/Pro/, /Make a graphic/],
    reference:
      "Yes, on Pro. On the Reviews screen a 4 or 5 star review that still has its words has Make a graphic. You choose a square or a story, then download it or share it from your phone. Kabsi posts nothing and keeps nothing, the image is made when you ask.",
  },
  {
    id: "en24",
    lang: "en",
    topic: "holiday hours",
    ask: "Will Kabsi set my opening hours for public holidays?",
    kb: [
      /Five days before a public holiday Kabsi asks the owner/,
      /\*\*Australia and Ireland are not covered yet\*\*/,
    ],
    must: [/five days|5 days/i, /confirm/i],
    reference:
      "Kabsi asks you five days before a public holiday: normal hours, closed or custom hours. It never assumes. Closed and custom hours go to Google only after you confirm, with a 10 second undo. Kabsi uses the official holiday lists of England and Wales, the United States, Canada, New Zealand, Singapore and the United Arab Emirates. Australia and Ireland are not covered yet, so Kabsi asks nothing there.",
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
    topic: "the Weekly Care Report",
    ask: "What is in the Weekly Care Report and when does it come?",
    kb: [/an email every Monday at 08:00 local time, also kept under Insights/],
    must: [/Monday/, /Insights/],
    reference:
      "It arrives every Monday at 08:00 local time and is kept under Insights. It starts with how many things Kabsi took care of that week, then your reviews, your Google profile checks, the content published and customer activity against the week before.",
  },
  {
    id: "en27",
    lang: "en",
    topic: "search terms",
    ask: "Can I see what people search to find my business?",
    kb: [
      /\*\*Search terms report \(Pro\):\*\*/,
      /fewer than 15/,
      /real figures start when Kabsi's Google connection is live/,
    ],
    must: [/example/i],
    coming: true,
    reference:
      "A search terms report for Pro shows the words people searched to find you each month, as Google reports them, with fewer than 15 where Google gives only a threshold. The screen is built and shows labelled examples, and real figures are not available yet: they start when Kabsi's Google connection is live.",
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
    reference:
      "Under Google Profile, the Profile Coach lists what a complete Google profile has and what yours is missing, with a plain reason for each. Essentials and Pro both see the checklist. On Pro there are five actions, like a website tag and extra categories, and you approve each change before anything reaches Google.",
  },
  {
    id: "en29",
    lang: "en",
    topic: "cookies and consent",
    ask: "Do you use cookies, and can I say no?",
    kb: [/A small Kabsi privacy banner \(no outside consent tool\)/],
    must: [/banner/i, /opt.out|yes/i],
    reference:
      "Kabsi shows a small privacy banner once, by country. In the EU and EEA statistics and advertising both wait for your yes. In the UK, the UAE and Saudi Arabia statistics run in totals only with an opt out and advertising waits for a yes. Everywhere else both are on with notice and an opt out.",
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
      "Of course. You can book a free 20-minute call at kabsi.co/setup-call, or write to hello@kabsi.co, where a real person answers. I'm Kabsi's AI assistant, and the team is one message away.",
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
    must: [/Write to hello@kabsi\.co and we'll reply today/, CALL],
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
    must: [MAIL, /isn't|don't|do not|won't|not in/i],
    forbid: [YES],
    reference:
      "That isn't in what I know, so I won't guess. I'll pass it to the team: write to hello@kabsi.co and a person will answer, or book the free call at kabsi.co/setup-call.",
  },
  // ── never delete (K-114.3): the warning comes first ─────────────────────────────────────────────────────────────
  {
    id: "en42",
    lang: "en",
    topic: "a duplicate listing",
    ask: "I have a duplicate listing on Google. Should I delete it?",
    kb: [
      /Do not delete a profile you think is a duplicate/,
      /ask Google to mark the duplicate or merge/,
    ],
    must: [/duplicate/i, /merge|mark/i],
    warnFirst: /do not delete|don't delete|never delete/i,
    forbid: [YES],
    reference:
      "Do not delete it, because deleting a profile can lose its reviews. Ask Google to mark the duplicate or merge the listings from your Business Profile. Kabsi is a Manager, so it can't delete a profile anyway. For help, book the free call at kabsi.co/setup-call or write to hello@kabsi.co.",
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
    kb: [/Never promise more reviews, a higher rating/, /Google decides its own results/],
    must: [/Google decides|can't promise|cannot promise/i],
    forbid: [YES],
    reference:
      "I can't promise that. Google decides its own results. Kabsi does the parts you control: a reply ready for each review, details kept right, and photos and posts that you approve.",
  },
  {
    id: "en48",
    lang: "en",
    topic: "Google go-live date",
    ask: "When will Kabsi be connected to Google for real?",
    kb: [/We're waiting on Google's review and can't give a date/],
    must: [/can't give a date|cannot give a date|no date/i],
    reference:
      "We're waiting on Google's review and can't give a date. Your trial or plan starts when access works.",
  },
  // ── Spanish, French and Arabic ───────────────────────────────────────────────────────────────────────────────────
  {
    id: "es49",
    lang: "es",
    topic: "price and crypto",
    ask: "¿Cuánto cuesta Pro y puedo pagar con criptomonedas?",
    gloss: "How much is Pro and can I pay with crypto?",
    kb: [/\$39/, /By card, in US dollars, and nothing else/],
    must: [/\$39/],
    coming: true,
    forbid: [/^\s*(sí|claro)\b/i],
    reference:
      "Hoy la página de precios muestra Pro a $19 al mes o $190 al año. Eso va a cambiar: Essentials y Pro, este último a $39 al mes, todavía no están disponibles. Los pagos con tarjeta en dólares son la única forma de pagar y todavía no están abiertos, así que hoy no hay nada que pagar. Kabsi no acepta criptomonedas.",
  },
  {
    id: "es50",
    lang: "es",
    topic: "the password",
    ask: "¿Necesitan mi contraseña de Google para configurarlo?",
    gloss: "Do you need my Google password to set it up?",
    kb: [/Never ask for a Google password, a login code/, /Kabsi group ID 5481006796/],
    must: [/5481006796/, /Manager/],
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
    kb: [/Kabsi has no WhatsApp number at the moment/],
    must: [MAIL],
    coming: true,
    reference:
      "Kabsi no tiene un número de WhatsApp por el momento, así que no puedo darte uno. Escribe a hello@kabsi.co y te responde una persona. Aprobar respuestas por WhatsApp todavía no está disponible.",
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
    kb: [/Free trial: 14 days, no card/],
    must: [/14/],
    reference:
      "Oui, l'essai dure 14 jours et il ne demande aucune carte. Il commence quand l'accès de Kabsi à votre fiche Google vérifiée fonctionne, donc attendre l'accès ne vous coûte rien.",
  },
  {
    id: "fr56",
    lang: "fr",
    topic: "Kabsi Partners",
    ask: "Comment devenir partenaire Kabsi ?",
    gloss: "How do I become a Kabsi partner?",
    kb: [/\*\*Kabsi Partners:\*\* an affiliate program/, /Not open yet/],
    must: [MAIL],
    coming: true,
    reference:
      "Kabsi Partners, le programme d'affiliation, n'est pas encore ouvert et je ne peux pas donner de date. Écrivez à hello@kabsi.co et une personne vous répondra.",
  },
  {
    id: "ar57",
    lang: "ar",
    topic: "price",
    ask: "كم سعر Pro؟",
    gloss: "How much is Pro?",
    kb: [/\$39/, /Pro \| \$39 \| \$390/],
    must: [/\$39/],
    coming: true,
    reference:
      "اليوم تعرض صفحة الأسعار Pro بسعر $19 شهريا أو $190 سنويا. هذا سيتغير: خطتا Essentials وPro، وسعر Pro فيها $39 شهريا، غير متاحتين بعد. الدفع بالبطاقة بالدولار الأمريكي هو الطريقة الوحيدة وهو غير مفتوح بعد، فلا يوجد ما تدفعه اليوم.",
  },
  {
    id: "ar58",
    lang: "ar",
    topic: "the password",
    ask: "هل تحتاجون كلمة مرور جوجل لإعداد الخدمة؟",
    gloss: "Do you need my Google password to set up the service?",
    kb: [/Never ask for a Google password, a login code/, /Kabsi group ID 5481006796/],
    must: [/5481006796/, /Manager/],
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
    kb: [/Kabsi has no WhatsApp number at the moment/],
    must: [MAIL],
    coming: true,
    reference:
      "ليس لدى كابسي رقم واتساب في الوقت الحالي، لذلك لا أستطيع إعطاءك رقما. اكتب إلى hello@kabsi.co ويرد عليك شخص. الموافقة على الردود عبر واتساب غير متاحة بعد.",
  },
];

/**
 * Every dollar amount the facts file may hold, and what it is. A price added or changed in the file fails
 * tests/nora-sync.test.ts until it is listed here, and the questions that quote it (en01, en02, en07, en13, es49, ar57)
 * are updated in the same change (K-104).
 */
export const AMOUNTS: Record<string, string> = {
  $0: "Free plan (today)",
  $19: "Pro monthly today; Essentials monthly when plans open",
  $190: "Pro yearly today; Essentials yearly when plans open",
  $39: "Pro monthly when plans open",
  $390: "Pro yearly when plans open",
  $15: "extra location monthly",
  $150: "extra location yearly",
  $50: "partner payout minimum",
  $120: "the removed Lebanon bundle",
};
