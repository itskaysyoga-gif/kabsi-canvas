// Questions shown on /faq (all) and the homepage (the first five). Every answer must stay true of the
// system as built (§3). Used for the FAQPage JSON-LD too, so answers are plain text.
import { LEGAL_SELLER, PRICES, SETUP_CALL_MINUTES } from "@/lib/site";

export const FAQ: { q: string; a: string }[] = [
  {
    q: "What does Kabsi do for my Google Business Profile?",
    a: "Kabsi looks after your business on Google: a reply is drafted for every new review in the reviewer's language, your hours and details are kept right, and fresh posts are prepared. It also shows what needs attention on your profile, each with a ready draft, and watches your listing for changes you did not make. You approve every change.",
  },
  {
    q: "Does Kabsi post or change anything by itself?",
    a: "No. Kabsi drafts and you approve. Nothing goes on your Google profile until you tap Approve, and you see the exact text before it goes.",
  },
  {
    q: "Which businesses can use Kabsi?",
    a: "Kabsi works with a verified Google Business Profile that you own or manage, for a business that meets customers in person during stated hours, or that travels to them in a service area, such as a plumber or a cleaner. It does not work for online-only businesses, rental or for-sale properties, PO boxes or virtual offices used as an address, or other cases Google lists as not eligible in its Business Profile guidelines. If your profile is not verified yet, verify it on Google first (it is free and done at business.google.com), then come back and set up Kabsi.",
  },
  {
    q: "What does Kabsi need from me?",
    a: "Add the Kabsi group ID 5481006796 as a Manager on your Google Business Profile, then tell Kabsi a few facts about your business: your services, how you sign off, your phone number, anything you want mentioned or avoided. Drafts only use the facts you give.",
  },
  {
    q: "Can I book a setup call?",
    a: `Yes. The team offers a free ${SETUP_CALL_MINUTES}-minute setup call at /setup-call, Monday to Friday, 8am to 6pm Beirut time. We guide you, you click, and we never ask for your Google password.`,
  },
  {
    q: "Will Kabsi get me more reviews, a better rating or a higher ranking?",
    a: "We don't promise that, and nobody honest can. Google decides local results by relevance, distance and prominence. Kabsi does the parts you control: every review gets a reply, your details stay accurate and complete, your profile stays up to date, and leaving a review is easy for every customer. Google doesn't say that replies or posts raise your ranking.",
  },
  {
    q: "Which languages does it reply in?",
    a: "The reviewer's language: English, Spanish, Arabic, French and many others. Arabic written in Latin letters (Franco-Arabic) gets a simple English reply, because it reads badly in public.",
  },
  {
    q: "Can Kabsi remove bad reviews?",
    a: "No. Nobody outside Google can remove a review. Kabsi helps you answer every review calmly, including the hard ones. For 1 and 2 star reviews it emails you a careful draft and no quick Approve button, so you read it first.",
  },
  {
    q: "How do I make it easy for customers to leave a review?",
    a: "Every business gets a review link and a printable QR code in the dashboard, free in every country. Share the same link with every customer. If you already own an NFC tag, you can write the same link on it with a free phone app. Ask every customer the same way, as they visit. Never offer a reward.",
  },
  {
    q: "Does Kabsi sell NFC cards?",
    a: "Not on this site. Kabsi's team in Lebanon offers a card and setup bundle, described on the Lebanon page. Everywhere else, the review link and QR code do the same job, and any NFC tag you own can carry the link.",
  },
  {
    q: "Is Kabsi part of Google?",
    a: "No. Kabsi is an independent company and is not affiliated with Google. It works through Google's official Business Profile access, the same way a staff member you add as a Manager would.",
  },
  {
    q: "Can I remove Kabsi's access?",
    a: "Yes, at any time, from your Google profile under People and access: remove the Kabsi Clients group. You don't need to ask us.",
  },
  {
    q: "What are Kabsi's posts?",
    a: "Kabsi drafts short Google posts from your business facts, with a button like Call or Book, and emails you the draft. Nothing is posted until you approve it, and you can switch drafts off.",
  },
  {
    q: "Is my Google data sold or used to train AI?",
    a: "No. Your Google data is never sold or rented, and it is never used to train AI models. Kabsi uses it only to draft your replies and posts, watch your listing and send your reports.",
  },
  {
    q: "What is Google Protection?",
    a: "Kabsi watches your listing's name, phone, address, hours, website and categories. If something changes that you didn't approve, you get one email with the before and after and two buttons: Keep my information and Google is right. Nothing changes unless you say so. It can't lock your listing or stop people from suggesting edits to Google.",
  },
  {
    q: "How do I pay?",
    a: `Kabsi Pro is $${PRICES.proMonthly} a month or $${PRICES.proYearly} a year, and you can start with a 14-day free trial, no card. You pay in USDT (TRC20 or Binance Pay) from anywhere. In Lebanon you can also pay with Whish, OMT or cash, and our team there sells a $${PRICES.lebanonBundle} a year bundle with an NFC card and setup.`,
  },
  {
    q: "What happens when my plan ends?",
    a: "Reviews, Google Profile, Google Protection and the Weekly Care Report stop. Get Reviews keeps working. Your review link and any card still open your Google review page.",
  },
  {
    q: "Can I get a refund?",
    a: "Kabsi Pro is refundable in full within 14 days of the plan starting. Cards aren't refunded.",
  },
  {
    q: "Will replying help me show up on Google?",
    a: "Google's own guidance lists complete and accurate details, up-to-date opening hours, replying to reviews and adding photos among the ways to improve local ranking. Kabsi helps with those jobs. Nobody can promise a ranking, and we don't.",
  },
  {
    q: "How is this different from Gemini in Business Profile?",
    a: "Gemini is Google's free assistant for one verified profile that you open and ask. Kabsi comes to you with a reply already prepared, tells you when Google changes your listing, writes only from facts you confirmed, and has a person behind it. Source: support.google.com/business/answer/17142585",
  },
  {
    q: "What can Kabsi do on my profile as a Manager?",
    a: "Kabsi uses Manager access to read your reviews, post the replies and posts you approve, and watch your listing for unwanted changes. It writes nothing you have not approved. You can remove Kabsi in People and access at any time.",
  },
  {
    q: "Who is behind Kabsi?",
    a: `Kabsi is operated by ${LEGAL_SELLER}. It is independent and not affiliated with Google. You can write to hello@kabsi.co.`,
  },
];

export const faqJsonLd = (items = FAQ) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: items.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
});
